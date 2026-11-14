// Kimi Code: importSession (harness/packages/acp-bridge/src/agents/kimi.js kimiImportSession), the native session that
// Import Chat History writes for session/load to open. Checked against Kimi Code's own loading logic, restated here from
// its source (github.com/MoonshotAI/kimi-code HEAD 2.4.1, read only, nothing of it run):
//   - finding the session: FileSessionIndex.getLegacy (agent-core-v2 app/sessionIndex/sessionIndexService.ts:669-681)
//     — the session_index.jsonl hint (app/workspace/workspaceAlias.ts parseSessionIndexLine :209-229), else every
//     workspace folder's <id>/state.json (sessionIndexSource.ts readSessionSummary :234-261, recoverCwd :140-151);
//   - the bucket name: encodeWorkDirKey (_base/utils/workdir-slug.ts:7-23);
//   - reading the journal: WireService.readEntries (wire/wireService.ts:342-420: metadata first, never newer than 1.5,
//     migrations from its version, migration/v1.1.ts mapping each message's toolCalls);
//   - the context: contextMemory's context.append_message fold (agent/contextMemory/contextOps.ts:100) and the turn
//     clock (one turn.prompt per turn, turn.ended turnIds from 0, migration-legacy turn-structure.ts:52-82);
//   - the session/load replay: acp-server replay.ts projectHistoryToSessionUpdates (:37-77).
// Plus a round trip through Import Chat History's own Kimi parser (app/electron/chat-import/sources/kimi.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import kimi, { KIMI_IMPORT_DEFAULT_TITLE, kimiEstimateTokens, kimiImportBudget, kimiImportSession, kimiImportTurns, kimiWorkDirKey } from '../packages/acp-bridge/src/agents/kimi.js'
import * as kimiSource from '../../app/electron/chat-import/sources/kimi.mjs'

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kimi-import-')))
const NOW = 1_800_000_000_000

// ---- Kimi Code's loading logic, restated ----------------------------------------------------------------------------
function encodeWorkDirKey(workDir) {
  const normalized = workDir.replaceAll('\\', '/').replace(/\/+$/, '')
  const base = normalized.split('/').pop() ?? normalized
  let slug = base.toLowerCase().replaceAll(/[^a-z0-9._-]+/g, '-').replaceAll(/^-+|-+$/g, '').slice(0, 40).replaceAll(/^-+|-+$/g, '')
  if (slug === '' || slug === '.' || slug === '..') slug = 'workspace'
  return `wd_${slug}_${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`
}
const WIRE_PROTOCOL_VERSION = '1.5'
const compareVersions = (a, b) => { const x = a.split('.'), y = b.split('.'); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = Number(x[i] ?? 0) - Number(y[i] ?? 0); if (d) return d } return 0 }

/** getLegacy: the hinted workspace from session_index.jsonl, then every workspace folder. */
function findSession(kimiHome, sessionId) {
  const sessions = path.join(kimiHome, 'sessions')
  const read = (workspaceId) => {
    for (const file of [path.join(sessions, workspaceId, sessionId, 'state.json'), path.join(sessions, workspaceId, sessionId, 'session-meta', 'state.json')]) {
      try { return { workspaceId, meta: JSON.parse(fs.readFileSync(file, 'utf8')) } } catch {}
    }
    return null
  }
  let hinted
  for (const line of fs.readFileSync(path.join(kimiHome, 'session_index.jsonl'), 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    const entry = JSON.parse(line)
    assert.equal(typeof entry.sessionId, 'string'); assert.equal(typeof entry.sessionDir, 'string'); assert.equal(typeof entry.workDir, 'string')
    const prefix = `${sessions}/`
    if (entry.sessionId === sessionId && entry.sessionDir.startsWith(prefix)) hinted = entry.sessionDir.slice(prefix.length).split('/')[0]
  }
  const found = (hinted && read(hinted)) ?? fs.readdirSync(sessions).filter((name) => name !== '.index-dirty' && name !== '.index-cache').map(read).find(Boolean)
  if (!found) return null
  const meta = found.meta
  return { id: sessionId, workspaceId: found.workspaceId, cwd: typeof meta.cwd === 'string' && meta.cwd ? meta.cwd : meta.workDir ?? meta.custom?.cwd, title: meta.title, lastPrompt: meta.lastPrompt,
    createdAt: meta.createdAt, updatedAt: meta.updatedAt, archived: meta.archived === true, custom: meta.custom, lastTurnReason: meta.lastTurnReason, hinted: hinted === found.workspaceId, meta }
}

/** readEntries + contextMemory + turn clock + session/load replay of the main agent's journal. */
function loadMain(sessionDir) {
  const lines = fs.readFileSync(path.join(sessionDir, 'agents', 'main', 'wire.jsonl'), 'utf8').split('\n')
  assert.equal(lines.pop(), '', 'the journal ends with a newline')
  const records = lines.map((line) => JSON.parse(line))
  const [metadata, ...rest] = records
  assert.equal(metadata.type, 'metadata')
  assert.equal(typeof metadata.protocol_version, 'string'); assert.equal(typeof metadata.created_at, 'number')
  assert.ok(compareVersions(metadata.protocol_version, WIRE_PROTOCOL_VERSION) <= 0, 'never newer than the reader')
  const migrate10 = compareVersions(metadata.protocol_version, '1.1') < 0
  const context = []
  let nextTurnId = 0
  const ended = []
  for (const record of rest) {
    assert.equal(typeof record.type, 'string')
    if (record.type === 'context.append_message') {
      const message = migrate10 ? { ...record.message, toolCalls: record.message.toolCalls.map(({ function: fn, ...call }) => ({ ...call, name: fn.name, arguments: fn.arguments })) } : record.message
      assert.ok(['user', 'assistant'].includes(message.role)); assert.ok(Array.isArray(message.content)); assert.ok(Array.isArray(message.toolCalls))
      context.push(message)
    } else if (record.type === 'turn.prompt') {
      assert.equal(record.agentId, 'main'); assert.ok(Array.isArray(record.input)); assert.equal(typeof record.origin?.kind, 'string')
      nextTurnId++
    } else if (record.type === 'turn.ended') {
      assert.equal(record.reason, 'completed'); ended.push(record.turnId)
    } else assert.fail(`unexpected record ${record.type}`)
  }
  const updates = []
  for (const message of context) {
    for (const part of message.content) if (part.type === 'text' && part.text) updates.push({ sessionUpdate: message.role === 'user' ? 'user_message_chunk' : 'agent_message_chunk', text: part.text })
  }
  return { metadata, records: rest, context, nextTurnId, ended, updates }
}

// ---- tests ------------------------------------------------------------------------------------------------------------
test('kimi importSession: a new native session Kimi Code finds, loads and replays; nothing else is touched', async () => {
  const root = tmp()
  try {
    const home = path.join(root, 'home'), cwd = path.join(root, 'Work Dir', 'My Project')
    fs.mkdirSync(cwd, { recursive: true })
    const kimiHome = path.join(home, '.kimi-code')
    // An existing session in the same workspace, and an index line of its own.
    const existingDir = path.join(kimiHome, 'sessions', encodeWorkDirKey(cwd), 'session_existing')
    fs.mkdirSync(path.join(existingDir, 'agents', 'main'), { recursive: true })
    fs.writeFileSync(path.join(existingDir, 'state.json'), '{"id":"session_existing"}')
    fs.writeFileSync(path.join(existingDir, 'agents', 'main', 'wire.jsonl'), '{"type":"metadata","protocol_version":"1.5","created_at":1}\n')
    fs.writeFileSync(path.join(kimiHome, 'session_index.jsonl'), JSON.stringify({ sessionId: 'session_existing', sessionDir: existingDir, workDir: cwd }) + '\n')
    const before = fs.readFileSync(path.join(existingDir, 'agents', 'main', 'wire.jsonl'), 'utf8')

    const messages = [
      { role: 'assistant', text: 'Context recovered after a compaction.' },
      { role: 'user', text: 'First question' },
      { role: 'assistant', text: 'First answer' },
      { role: 'assistant', text: '[tool call: Bash {"command":"ls"}]\n[tool result: a b]' },
      { role: 'user', text: 'Second question' },
      { role: 'user', text: '  ' },
      { role: 'user', text: '[image]' },
      { role: 'system', text: 'dropped' },
      { role: 'assistant', text: 'Second answer' },
      { role: 'user', text: 'Unanswered follow-up' },
    ]
    const result = await kimi.importSession({ cwd, title: '  Imported\nfrom   Codex ', messages, home, env: { HOME: '/nonexistent' }, importedFrom: { source: 'codex', sourceId: 'abc' } })
    assert.match(result.sessionId, /^session_[0-9a-f-]{36}$/)
    assert.deepEqual([result.turns, result.keptTurns], [4, 4])

    const summary = findSession(kimiHome, result.sessionId)
    assert.ok(summary, 'session/load finds the session')
    assert.ok(summary.hinted, 'through the session_index.jsonl hint')
    assert.equal(summary.workspaceId, encodeWorkDirKey(cwd))
    assert.equal(kimiWorkDirKey(cwd), encodeWorkDirKey(cwd))
    assert.equal(summary.cwd, cwd)
    assert.equal(summary.title, 'Imported from Codex')
    assert.equal(summary.lastPrompt, 'Unanswered follow-up')
    assert.equal(summary.lastTurnReason, 'completed')
    assert.equal(summary.archived, false)
    assert.deepEqual([summary.meta.version, summary.meta.titleKind, summary.meta.isCustomTitle, summary.meta.id], [2, 'generated', false, result.sessionId])
    assert.equal(summary.custom.imported_from, 'codex'); assert.equal(summary.custom.imported_source_id, 'abc'); assert.ok(Date.parse(summary.custom.imported_at))
    const sessionDir = path.join(kimiHome, 'sessions', summary.workspaceId, result.sessionId)
    assert.deepEqual(summary.meta.agents, { main: { homedir: path.join(sessionDir, 'agents', 'main'), type: 'main', parentAgentId: null } })

    const loaded = loadMain(sessionDir)
    assert.equal(loaded.metadata.protocol_version, '1.0', 'what Kimi Code\'s own importer writes')
    assert.deepEqual(loaded.context.map((message) => `${message.role}:${message.content[0].text}`), [
      'assistant:Context recovered after a compaction.',
      'user:First question',
      'assistant:First answer\n\n[tool call: Bash {"command":"ls"}]\n[tool result: a b]',
      'user:Second question\n\n[image]',
      'assistant:Second answer',
      'user:Unanswered follow-up',
    ], 'consecutive messages of a role are joined; empty and other roles dropped')
    assert.equal(loaded.nextTurnId, 4, 'the turn clock starts past the imported turns')
    assert.deepEqual(loaded.ended, [0, 1, 2], 'a turn without an answer has no turn.ended')
    assert.deepEqual(loaded.records[0], { type: 'turn.prompt', agentId: 'main', input: [], origin: { kind: 'system_trigger', name: 'imported_orphan' }, time: loaded.metadata.created_at })
    assert.deepEqual(loaded.records.find((record) => record.type === 'turn.prompt' && record.origin.kind === 'user').input, [{ type: 'text', text: 'First question' }])
    assert.deepEqual(loaded.updates.slice(0, 2), [{ sessionUpdate: 'agent_message_chunk', text: 'Context recovered after a compaction.' }, { sessionUpdate: 'user_message_chunk', text: 'First question' }])

    // The other session and the index's earlier line are as they were.
    assert.equal(fs.readFileSync(path.join(existingDir, 'agents', 'main', 'wire.jsonl'), 'utf8'), before)
    assert.equal(fs.readFileSync(path.join(existingDir, 'state.json'), 'utf8'), '{"id":"session_existing"}')
    const index = fs.readFileSync(path.join(kimiHome, 'session_index.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
    assert.deepEqual(index.map((entry) => entry.sessionId), ['session_existing', result.sessionId])
    assert.deepEqual(index[1], { sessionId: result.sessionId, sessionDir, workDir: cwd })

    // Import Chat History's own Kimi parser reads it back as the same conversation.
    const listed = await kimiSource.list({ home, env: {}, cache: new Map() })
    const mine = listed.find((entry) => entry.sourceId === result.sessionId)
    assert.ok(mine)
    assert.deepEqual([mine.title, mine.cwd, mine.experimental], ['Imported from Codex', cwd, false])
    const read = await kimiSource.read(mine, { home, env: {} })
    assert.deepEqual(read.items.map((item) => item.kind), ['assistant', 'user', 'assistant', 'user', 'assistant', 'user'])
    assert.equal(read.items[1].parts[0].text, 'First question')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('kimi importSession: KIMI_CODE_HOME, the default title, nothing to import, a failed write leaves nothing behind', async () => {
  const root = tmp()
  try {
    const kimiHome = path.join(root, 'kimi-home'), cwd = path.join(root, 'proj')
    fs.mkdirSync(cwd)
    const { sessionId } = await kimiImportSession({ cwd, title: '', messages: [{ role: 'user', text: 'Hi' }], env: { KIMI_CODE_HOME: kimiHome, HOME: path.join(root, 'unused') }, now: NOW })
    const summary = findSession(kimiHome, sessionId)
    assert.equal(summary.title, KIMI_IMPORT_DEFAULT_TITLE)
    assert.equal(summary.createdAt, NOW); assert.equal(summary.updatedAt, NOW)
    assert.equal(summary.custom.imported_from, 'openclaude-desktop')
    assert.ok(!fs.existsSync(path.join(root, 'unused')))
    const loaded = loadMain(path.join(kimiHome, 'sessions', summary.workspaceId, sessionId))
    assert.deepEqual([loaded.nextTurnId, loaded.ended], [1, []])

    await assert.rejects(kimiImportSession({ cwd, messages: [{ role: 'user', text: ' ' }], env: { KIMI_CODE_HOME: kimiHome } }), /nothing to import/)
    await assert.rejects(kimiImportSession({ cwd: 'relative', messages: [{ role: 'user', text: 'x' }], env: { KIMI_CODE_HOME: kimiHome } }), /absolute folder/)

    // session_index.jsonl unwritable (a folder): the half-written session goes, and the bucket it alone used.
    const other = path.join(root, 'other')
    fs.mkdirSync(other)
    const brokenHome = path.join(root, 'broken')
    fs.mkdirSync(path.join(brokenHome, 'session_index.jsonl'), { recursive: true })
    await assert.rejects(kimiImportSession({ cwd: other, messages: [{ role: 'user', text: 'x' }], env: { KIMI_CODE_HOME: brokenHome } }))
    assert.ok(!fs.existsSync(path.join(brokenHome, 'sessions', encodeWorkDirKey(other))))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('kimi import budget: config.toml default model window, whole turns from the newest back', () => {
  // run-import.ts importBudget: 131072 fallback → min(104857, (81072 - 30000) / 1.25 = 40857).
  assert.equal(kimiImportBudget({}), 40857)
  // 262144 window: min(209715, (min(222822.4, 212144) - 30000) / 1.25 = 145715).
  assert.equal(kimiImportBudget({ defaultModel: 'k', models: { k: { max_context_size: 262144 } } }), 145715)
  assert.equal(kimiImportBudget({ defaultModel: 'k', models: { k: { max_context_size: 262144, overrides: { max_input_size: 32768 } } } }), 16384, 'overrides apply; never below 16384')
  assert.equal(kimiEstimateTokens('abcd'), 1); assert.equal(kimiEstimateTokens('你好'), 2)

  const long = 'x'.repeat(4000) // 1000 tokens
  const messages = []
  for (let index = 0; index < 5; index++) messages.push({ role: 'user', text: `q${index} ${long}` }, { role: 'assistant', text: `a${index} ${long}` })
  const { turns, total, kept } = kimiImportTurns(messages, { tokenBudget: 4500 })
  assert.deepEqual([total, kept], [5, 2])
  assert.match(turns[0].messages[0].text, /^\[Earlier turns of this imported conversation were left out to fit the context window: 2 of 5 turns kept\.\]\n\nq3 /)
  assert.match(turns[1].messages[1].text, /^a4 /)
  const alone = kimiImportTurns([{ role: 'user', text: long }], { tokenBudget: 300 })
  assert.equal(alone.kept, 1)
  assert.ok(kimiEstimateTokens(alone.turns[0].messages[0].text) <= 300 && alone.turns[0].messages[0].text.startsWith('[…]\n'), 'the newest turn alone keeps its ending')
})
