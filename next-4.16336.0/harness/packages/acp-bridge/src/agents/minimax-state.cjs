// MiniMax Code's on/off state for skills and local plugins lives in its v2 SQLite database
// (<home>/v2/sqlite/runtime-state.sqlite): the 'standalone-skill-disabled-state' preference
// (local-runtime-v2 skill/enabled-state.ts) and the local_runtime_plugin_local_disabled table
// (plugin/runtime/repository.ts), and the official plugins' state (local_runtime_plugin_official_state). Every OpenClaude Desktop thread has a database of its own, so the bridge
// copies the user's state into it before the thread's process starts, and turns a skill on or off in
// the user's database (and every thread database) for Customize › Skills.
//
// Run with the Node that runs mcode (its better-sqlite3 build matches that Node):
//   node minimax-state.cjs <better-sqlite3 path> <json request>
//   {op: 'sync', from, to: [db...], realHome, homes: [home...]}
//   {op: 'setSkill', dbs: [db...], uri, enabled}
//   {op: 'read', db}
//   {op: 'status', db, sessions: [id...], afterUsageId}  a thread's token usage since a row (local_runtime_token_usage:
//                    one row per model call, what mcode's /usage adds up) and its running background tasks
//                    (local_runtime_background_tasks queued / running / stopping)
//   {op: 'seedTitle', db, session, title}  a title for a session nobody sees (a workflow agent's) before its first
//                    prompt, so mcode's session-title model call (DI.readEligibleSession: untitled sessions only) skips it
//   {op: 'turns', db, session, since, afterRowId, sessions, afterUsageId}  the turns mcode ran in a session since a time
//                    (local_runtime_turn_ingress: id, status, whether a client prompt began it) and the message rows of
//                    the others after a row (local_runtime_message_rows), with the thread's usage since a row ('status')
//   {op: 'copy', from, to}  a consistent copy of a live database (VACUUM INTO: a fork's own home starts from its
//                    source's sessions while the source's process may hold the database open)
'use strict'
const fs = require('node:fs')

const SKILL_KEY = 'standalone-skill-disabled-state'
const [modulePath, raw] = process.argv.slice(2)
const request = JSON.parse(raw)
const Database = require(modulePath)

const open = (file, readonly) => new Database(file, { readonly, fileMustExist: true, timeout: 3000 })
const hasTable = (db, name) => Boolean(db.prepare("select 1 from sqlite_master where type = 'table' and name = ?").get(name))

function readState(file) {
  const db = open(file, true)
  try {
    let skills = []
    if (hasTable(db, 'local_runtime_preferences')) {
      const row = db.prepare('select value_json from local_runtime_preferences where key = ?').get(SKILL_KEY)
      try { const value = row ? JSON.parse(row.value_json) : null; if (Array.isArray(value?.disabledLocationUris)) skills = value.disabledLocationUris.filter((uri) => typeof uri === 'string' && uri) } catch {}
    }
    const plugins = hasTable(db, 'local_runtime_plugin_local_disabled') ? db.prepare('select canonical_root as root from local_runtime_plugin_local_disabled').all().map((row) => row.root).filter((root) => typeof root === 'string' && root) : []
    // Official plugins: installed versions and their on/off state per account (state_json), copied whole.
    const official = hasTable(db, 'local_runtime_plugin_official_state') ? db.prepare('select principal_id, deployment, state_json, updated_at_ms from local_runtime_plugin_official_state order by principal_id, deployment').all() : []
    return { skills, plugins, official }
  } finally { db.close() }
}

function writeSkills(db, uris) {
  if (!hasTable(db, 'local_runtime_preferences')) return false
  const list = [...new Set(uris)].sort()
  if (list.length) db.prepare('insert into local_runtime_preferences (key, value_json) values (?, ?) on conflict(key) do update set value_json = excluded.value_json').run(SKILL_KEY, JSON.stringify({ version: 1, disabledLocationUris: list }))
  else db.prepare('delete from local_runtime_preferences where key = ?').run(SKILL_KEY)
  return true
}

function writePlugins(db, roots) {
  if (!hasTable(db, 'local_runtime_plugin_local_disabled')) return false
  const now = Date.now()
  db.transaction(() => {
    db.prepare('delete from local_runtime_plugin_local_disabled').run()
    const insert = db.prepare('insert or replace into local_runtime_plugin_local_disabled (canonical_root, updated_at_ms) values (?, ?)')
    for (const root of new Set(roots)) insert.run(root, now)
  })()
  return true
}

function writeOfficial(db, rows) {
  if (!hasTable(db, 'local_runtime_plugin_official_state')) return false
  db.transaction(() => {
    db.prepare('delete from local_runtime_plugin_official_state').run()
    const insert = db.prepare('insert or replace into local_runtime_plugin_official_state (principal_id, deployment, state_json, updated_at_ms) values (?, ?, ?, ?)')
    for (const row of rows) insert.run(row.principal_id, row.deployment, row.state_json, row.updated_at_ms)
  })()
  return true
}

function readStatus(file, sessions, afterUsageId) {
  const db = open(file, true)
  try {
    const ids = [...new Set((sessions ?? []).filter((id) => typeof id === 'string' && id))]
    const usage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0, calls: 0, lastId: Number(afterUsageId) || 0, model: null }
    const background = []
    if (!ids.length) return { usage, background }
    const marks = ids.map(() => '?').join(', ')
    if (hasTable(db, 'local_runtime_token_usage')) {
      const rows = db.prepare(`select id, model, input_tokens, output_tokens, reasoning_tokens, cache_read_tokens, cache_write_tokens, cost_usd from local_runtime_token_usage where id > ? and session_id in (${marks}) order by id`).all(Number(afterUsageId) || 0, ...ids)
      for (const row of rows) {
        usage.inputTokens += row.input_tokens || 0
        usage.outputTokens += row.output_tokens || 0
        usage.reasoningTokens += row.reasoning_tokens || 0
        usage.cacheReadTokens += row.cache_read_tokens || 0
        usage.cacheWriteTokens += row.cache_write_tokens || 0
        usage.costUsd += Number.isFinite(row.cost_usd) ? row.cost_usd : 0
        usage.calls += 1
        usage.lastId = Math.max(usage.lastId, row.id)
        if (typeof row.model === 'string' && row.model) usage.model = row.model
      }
    }
    if (hasTable(db, 'local_runtime_background_tasks')) {
      for (const row of db.prepare(`select task_id, kind, status, created_at_ms, record_json from local_runtime_background_tasks where owner_session_id in (${marks}) and status in ('queued', 'running', 'stopping') order by created_at_ms`).all(...ids)) {
        let record = {}
        try { record = JSON.parse(row.record_json) } catch {}
        const meta = record && typeof record.metadata === 'object' && record.metadata ? record.metadata : {}
        background.push({ taskId: row.task_id, kind: row.kind, status: row.status, toolCallId: typeof record.toolCallId === 'string' ? record.toolCallId : null, command: typeof meta.command === 'string' ? meta.command : null, description: typeof record.description === 'string' ? record.description : null, cwd: typeof meta.cwd === 'string' ? meta.cwd : null, createdAt: row.created_at_ms })
      }
    }
    return { usage, background }
  } finally { db.close() }
}

/**
 * The turns of `session` accepted at or after `since` (oldest first): {turnId, status, sequence, foreground (a client
 * prompt's), clientRequestId, acceptedAt, completedAt}; the message rows (id > afterRowId) of the turns that are not
 * foreground: {id, turnId, role, source, createdAt, data}; and the session's status.
 */
function readTurns(file, session, since, afterRowId) {
  const db = open(file, true)
  try {
    const turns = []
    const rows = []
    if (hasTable(db, 'local_runtime_turn_ingress')) {
      for (const row of db.prepare('select turn_id, source, client_request_id, status, accepted_at_ms, accepted_sequence, completed_at_ms, input_metadata_json from local_runtime_turn_ingress where session_id = ? and accepted_at_ms >= ? order by coalesce(accepted_sequence, 0), accepted_at_ms').all(String(session), Number(since) || 0)) {
        let meta = {}
        try { meta = JSON.parse(row.input_metadata_json || '{}') } catch {}
        turns.push({ turnId: row.turn_id, source: row.source, status: row.status, sequence: row.accepted_sequence, foreground: meta?.foreground === true, clientRequestId: row.client_request_id ?? null, acceptedAt: row.accepted_at_ms, completedAt: row.completed_at_ms ?? null })
      }
    }
    const others = turns.filter((turn) => !turn.foreground).map((turn) => turn.turnId)
    if (others.length && hasTable(db, 'local_runtime_message_rows')) {
      const marks = others.map(() => '?').join(', ')
      for (const row of db.prepare(`select id, turn_id, role, source, created_at_ms, data_json from local_runtime_message_rows where session_id = ? and id > ? and turn_id in (${marks}) order by id`).all(String(session), Number(afterRowId) || 0, ...others)) {
        let data = null
        try { data = JSON.parse(row.data_json) } catch {}
        rows.push({ id: row.id, turnId: row.turn_id, role: row.role, source: row.source ?? null, createdAt: row.created_at_ms, data })
      }
    }
    let status = null
    if (hasTable(db, 'local_runtime_sessions')) status = db.prepare('select status from local_runtime_sessions where session_id = ?').get(String(session))?.status ?? null
    return { turns, rows, sessionStatus: status }
  } finally { db.close() }
}

const out = { ok: true, changed: [] }
if (request.op === 'turns') {
  Object.assign(out, fs.existsSync(request.db) ? readTurns(request.db, request.session, request.since, request.afterRowId) : { turns: [], rows: [], sessionStatus: null })
  if (fs.existsSync(request.db) && Number.isFinite(Number(request.afterUsageId))) out.usage = readStatus(request.db, request.sessions, request.afterUsageId).usage
} else if (request.op === 'status') {
  Object.assign(out, fs.existsSync(request.db) ? readStatus(request.db, request.sessions, request.afterUsageId) : { usage: null, background: [] })
} else if (request.op === 'read') {
  Object.assign(out, fs.existsSync(request.db) ? readState(request.db) : { skills: [], plugins: [], official: [] })
} else if (request.op === 'sync') {
  const state = fs.existsSync(request.from) ? readState(request.from) : { skills: [], plugins: [], official: [] }
  for (const [index, file] of (request.to ?? []).entries()) {
    if (!fs.existsSync(file)) continue
    // A local plugin is named by its root as the home sees it: the user's root, and the same root under the thread home.
    const home = request.homes?.[index]
    const roots = state.plugins.flatMap((root) => (home && request.realHome && root.startsWith(`${request.realHome}/`) ? [root, `${home}${root.slice(request.realHome.length)}`] : [root]))
    const db = open(file, false)
    try {
      const before = readState(file)
      if (JSON.stringify([...before.skills].sort()) !== JSON.stringify([...new Set(state.skills)].sort())) { writeSkills(db, state.skills); out.changed.push(file) }
      if (JSON.stringify([...before.plugins].sort()) !== JSON.stringify([...new Set(roots)].sort())) { writePlugins(db, roots); if (!out.changed.includes(file)) out.changed.push(file) }
      if (JSON.stringify(before.official) !== JSON.stringify(state.official)) { writeOfficial(db, state.official); if (!out.changed.includes(file)) out.changed.push(file) }
    } finally { db.close() }
  }
} else if (request.op === 'seedTitle') {
  if (fs.existsSync(request.db)) {
    const db = open(request.db, false)
    try {
      if (hasTable(db, 'local_runtime_sessions')) {
        const changed = db.prepare("update local_runtime_sessions set title = ? where session_id = ? and coalesce(trim(title), '') = ''").run(String(request.title), String(request.session)).changes
        if (changed) out.changed.push(request.session)
      }
    } finally { db.close() }
  }
} else if (request.op === 'copy') {
  if (fs.existsSync(request.from) && !fs.existsSync(request.to)) {
    const db = open(request.from, true)
    try { db.prepare('vacuum into ?').run(request.to) } finally { db.close() }
    out.changed.push(request.to)
  }
} else if (request.op === 'setSkill') {
  for (const file of request.dbs ?? []) {
    if (!fs.existsSync(file)) continue
    const current = readState(file).skills
    const next = request.enabled ? current.filter((uri) => uri !== request.uri) : [...current, request.uri]
    const db = open(file, false)
    try { if (writeSkills(db, next)) out.changed.push(file) } finally { db.close() }
  }
}
process.stdout.write(JSON.stringify(out))
