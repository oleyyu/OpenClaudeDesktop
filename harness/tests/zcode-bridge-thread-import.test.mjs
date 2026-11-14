// ZCode bridge: codeDesktop/thread/import (harness/packages/zcode-bridge/src/thread-import.js). The request becomes
// session/create's importedHistory; ZCode then writes the session itself. Checked here: the payload against the ZCode
// Protocol's strict schema (packages/shared/src/zcode-protocol/index.ts zcodeSessionImportHistorySchema :1127-1175,
// restated below, no upstream code run), and a round trip — the rows ZCode's persistImportedSessionHistory writes for
// it (apps/zcode-cli/packages/bootstrap/src/zcode-protocol/server-operations.ts :1150-1233, through the sqlite store's
// saveMessage / savePart, adapters/src/storage/session-store/repositories/messages.ts :38-191) read back by the bridge's
// own reader (usage.js storedMessages → history.js turnsFromMessages) as the turns the app shows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { IMPORT_DEFAULT_TITLE, IMPORT_MAX_MESSAGES, IMPORT_OPENING, importCreateParams, importMessages, importTitle, importedFromOf, importedHistoryOf, startParamsOf } from '../packages/zcode-bridge/src/thread-import.js'
import { loadSqlite, storedMessages } from '../packages/zcode-bridge/src/usage.js'
import { turnsFromMessages } from '../packages/zcode-bridge/src/history.js'

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zcb-import-')))
const NOW = 1_800_000_000_000

/** zcodeSessionImportHistorySchema's claudeCode member, as its zod `.strict()` objects check it. */
function assertProtocolImportHistory(value) {
  assert.deepEqual(Object.keys(value).filter((key) => !['source', 'title', 'createdAt', 'updatedAt', 'messages'].includes(key)), [], 'no keys beyond the strict schema')
  assert.equal(value.source, 'claudeCode')
  if (value.title !== undefined) assert.equal(typeof value.title, 'string')
  for (const key of ['createdAt', 'updatedAt']) if (value[key] !== undefined) assert.ok(Number.isInteger(value[key]) && value[key] >= 0, key)
  assert.ok(Array.isArray(value.messages) && value.messages.length >= 1, 'messages min(1)')
  for (const message of value.messages) {
    assert.deepEqual(Object.keys(message).filter((key) => !['role', 'content', 'timestamp'].includes(key)), [])
    assert.ok(message.role === 'user' || message.role === 'assistant')
    assert.equal(typeof message.content, 'string')
    if (message.timestamp !== undefined) assert.ok(Number.isInteger(message.timestamp) && message.timestamp >= 0)
  }
}

test('import messages: roles kept, blanks dropped, one role per turn, a reply first is opened, bounds enforced', () => {
  const out = importMessages([
    { role: 'assistant', text: 'Hi, I looked at the repo.', ts: NOW - 5000 },
    { role: 'system', text: 'ignored' },
    { role: 'user', text: '  fix the build  ' },
    { role: 'user', text: 'and the tests' },
    { role: 'assistant', text: '   ' },
    { role: 'assistant', text: 'Done.', ts: NOW + 60_000 },
  ], NOW)
  assert.deepEqual(out, [
    { role: 'user', text: IMPORT_OPENING, ts: NOW - 5000 },
    { role: 'assistant', text: 'Hi, I looked at the repo.', ts: NOW - 5000 },
    { role: 'user', text: 'fix the build\n\nand the tests' },
    { role: 'assistant', text: 'Done.' },
  ], 'a timestamp ahead of now is dropped')
  assert.throws(() => importMessages('x'), /array/)
  assert.throws(() => importMessages([{ role: 'user', text: ' ' }]), /no messages/)
  assert.throws(() => importMessages(Array.from({ length: IMPORT_MAX_MESSAGES + 1 }, () => ({ role: 'user', text: 'a' }))), /at most/)
  assert.throws(() => importMessages([{ role: 'user', text: 'x'.repeat(4_000_001) }]), /too long/)
})

test('importedHistory: the ZCode Protocol shape, dated now, titled by the request or the first prompt', () => {
  const history = importedHistoryOf({ title: '  Port the\nparser ', messages: [{ role: 'user', text: 'one', ts: NOW - 10 }, { role: 'assistant', text: 'two' }] }, NOW)
  assertProtocolImportHistory(history)
  assert.deepEqual(history, { source: 'claudeCode', title: 'Port the parser', createdAt: NOW, updatedAt: NOW, messages: [{ role: 'user', content: 'one', timestamp: NOW - 10 }, { role: 'assistant', content: 'two' }] })
  assert.equal(importTitle('', [{ role: 'user', text: IMPORT_OPENING }, { role: 'user', text: 'x'.repeat(100) }]).length, 80)
  assert.equal(importTitle(null, [{ role: 'assistant', text: 'a' }]), IMPORT_DEFAULT_TITLE)
  assert.throws(() => importedHistoryOf({ messages: [] }), /no messages/)
})

test('session/create params: thread/start’s, persisted at once with the history; the import fields never reach ZCode', () => {
  const history = importedHistoryOf({ messages: [{ role: 'user', text: 'q' }] }, NOW)
  const create = importCreateParams({ workspace: { workspacePath: '/w' }, mode: 'build', persistence: 'deferred', toolDenylist: ['CronCreate'] }, history)
  assert.equal(create.persistence, 'immediate', 'as the ZCode app imports (zcodeTaskServiceAdapter.ts importClaudeSessions)')
  assert.equal(create.importedHistory, history)
  assert.deepEqual(create.toolDenylist, ['CronCreate'])
  const start = startParamsOf({ cwd: '/w', title: 't', messages: [], importedFrom: { source: 'codex' }, turns: [], model: 'm', developerInstructions: 'd', excludeTurns: true })
  assert.deepEqual(start, { cwd: '/w', model: 'm', developerInstructions: 'd', excludeTurns: true })
})

test('importedFrom: short strings and an import time only', () => {
  assert.equal(importedFromOf(null), null)
  assert.equal(importedFromOf({ sourceId: 'x' }), null)
  assert.deepEqual(importedFromOf({ source: 'codex', sourceId: ' 019a ', title: '', sourcePath: '/p', extra: { a: 1 } }, NOW), { source: 'codex', sourceId: '019a', sourcePath: '/p', importedAt: NOW })
})

test('initialize advertises threadImport', async () => {
  const { BASE_CAPABILITIES } = await import('../packages/zcode-bridge/src/server.js')
  assert.equal(BASE_CAPABILITIES.threadImport, true)
})

// The tables ZCode's import writes (schema.baseline.sql :93-185), as its store creates them.
const SCHEMA = `
CREATE TABLE session (id text primary key, project_id text not null, workspace_id text, parent_id text, slug text not null,
  directory text not null, path text, title text not null, version text not null, share_url text, summary_additions integer,
  summary_deletions integer, summary_files integer, summary_diffs text, revert text, permission text, time_created integer not null,
  time_updated integer not null, time_compacting integer, time_archived integer, task_type text not null default 'interactive',
  title_source text not null default 'first_input', title_message_id text, time_title_updated integer, trace_id text, time_deleted integer, last_outcome text);
CREATE TABLE message (id text primary key, session_id text not null references session(id) on delete cascade, time_created integer not null,
  time_updated integer not null, data text not null, sequence integer);
CREATE TABLE part (id text primary key, message_id text not null references message(id) on delete cascade, session_id text not null,
  time_created integer not null, time_updated integer not null, data text not null, sequence integer);`

/** What persistImportedSessionHistory does with an importedHistory (server-operations.ts :1150-1233). */
function persistLikeZCode(db, sessionId, history, cwd) {
  db.prepare(`insert into session (id, project_id, slug, directory, path, title, title_source, version, permission, time_created, time_updated)
    values (?, 'proj', ?, ?, ?, ?, 'custom', '1.0.0', '{"mode":"build"}', ?, ?)`).run(sessionId, sessionId, cwd, cwd, history.title || 'Imported session', history.createdAt, Math.max(history.createdAt, history.updatedAt))
  let last = history.createdAt - 1
  let lastUser
  for (const [index, message] of history.messages.entries()) {
    const raw = message.timestamp ?? history.createdAt + index
    const timestamp = raw > last ? raw : last + 1
    last = timestamp
    const id = `msg_${sessionId}_import_${index}`
    const meta = { migrationSource: history.source }
    const data = message.role === 'user'
      ? (lastUser = id, { role: 'user', time: { created: timestamp }, agent: 'zcode-agent', metadata: meta, model: {} })
      : { role: 'assistant', time: { created: timestamp, completed: timestamp }, parentID: lastUser, mode: 'build', agent: 'zcode-agent', path: { cwd, root: cwd }, cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, finish: 'stop' }
    db.prepare(`insert into message (id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, (select coalesce(max(sequence), -1) + 1 from message where session_id = ?))`)
      .run(id, sessionId, timestamp, timestamp, JSON.stringify(data), sessionId)
    db.prepare(`insert into part (id, message_id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, ?, (select coalesce(max(sequence), -1) + 1 from part where message_id = ?))`)
      .run(`prt_${sessionId}_import_${index}_text`, id, sessionId, timestamp, timestamp, JSON.stringify({ type: 'text', text: message.content, time: { start: timestamp, end: timestamp }, metadata: meta }), id)
  }
}

test('round trip: the session ZCode writes for the request reads back as the imported turns, in order', async () => {
  await loadSqlite()
  const dir = tmp()
  const dbPath = path.join(dir, 'db.sqlite')
  const db = new DatabaseSync(dbPath)
  db.exec(SCHEMA)
  // Source timestamps out of order: ZCode orders by sequence and makes the times increase.
  const history = importedHistoryOf({ title: 'Imported', messages: [
    { role: 'assistant', text: 'Earlier reply', ts: NOW - 100 },
    { role: 'user', text: 'Next question', ts: NOW - 500 },
    { role: 'assistant', text: '[tool shell] ls\n→ a b', ts: NOW - 400 },
    { role: 'user', text: 'Thanks' },
  ] }, NOW)
  assertProtocolImportHistory(history)
  persistLikeZCode(db, 'sess_imp', history, dir)
  db.close()
  const messages = storedMessages(dbPath, 'sess_imp')
  assert.equal(messages.length, 5)
  const { turns } = turnsFromMessages(messages, { threadId: 'sess_imp', cwd: dir })
  const shown = turns.map((turn) => turn.items.map((item) => item.type === 'userMessage' ? `u:${item.content[0].text}` : `a:${item.text}`))
  assert.deepEqual(shown, [
    [`u:${IMPORT_OPENING}`, 'a:Earlier reply'],
    ['u:Next question', 'a:[tool shell] ls\n→ a b'],
    ['u:Thanks'],
  ])
  assert.ok(turns.every((turn) => turn.status === 'completed'), 'imported replies are finished, no turn reads as interrupted')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('after session/create: a failure from here on (history unreadable or empty, bookkeeping) deletes the new session', async () => {
  const { finishImport } = await import('../packages/zcode-bridge/src/thread-import.js')
  const fail = (message) => Object.assign(new Error(message), { code: -32000 })
  const turns = [{ id: 't1', items: [{ type: 'userMessage', id: 'u1', content: [{ type: 'text', text: 'hi' }] }, { type: 'agentMessage', id: 'a1', text: 'hello' }] }]
  const run = async (overrides) => {
    const log = []
    const deps = { thread: { id: 'ses_new' }, historyOf: async () => ({ turns }), excludeTurns: false, remember: () => log.push('remember'), discard: async () => { log.push('discard') }, fail, ...overrides(log) }
    const response = { thread: { id: 'ses_new', turns: [] } }
    try { return { log, result: await finishImport(response, deps) } } catch (error) { return { log, error } }
  }
  const ok = await run(() => ({}))
  assert.deepEqual(ok.log, ['remember'])
  assert.equal(ok.result.thread.turns, turns)
  const excluded = await run(() => ({ excludeTurns: true }))
  assert.deepEqual(excluded.result.thread.turns, [])
  const thrown = await run(() => ({ historyOf: async () => { throw new Error('SQLITE_BUSY') } }))
  assert.deepEqual(thrown.log, ['discard'])
  assert.match(thrown.error.message, /could not finish the import: SQLITE_BUSY/)
  assert.equal(thrown.error.code, -32000)
  const empty = await run(() => ({ historyOf: async () => ({ turns: [] }) }))
  assert.deepEqual(empty.log, ['discard'])
  assert.match(empty.error.message, /without the imported history/)
  const missing = await run(() => ({ thread: undefined }))
  assert.deepEqual(missing.log, ['discard'])
  const bookkeeping = await run((log) => ({ remember: () => { log.push('remember'); throw new Error('disk full') } }))
  assert.deepEqual(bookkeeping.log, ['remember', 'discard'])
})

test('server.js importThread: the session is deleted on any failure after session/create, startThread\'s own steps included', () => {
  const server = fs.readFileSync(path.resolve(import.meta.dirname, '../packages/zcode-bridge/src/server.js'), 'utf8')
  const body = server.slice(server.indexOf('  async function importThread(params) {'), server.indexOf('  /** Load a thread\'s session in ZCode (resume) if needed. */'))
  assert.match(body, /startThread\(startParamsOf\(params\), \{ importedHistory, created: \(value\) => \{ id = value \} \}\)/)
  assert.match(body, /catch \(error\) \{\n\s+await discard\(\)\n\s+throw error/)
  assert.match(body, /return finishImport\(response, \{/)
  assert.match(server, /if \(!id\) throw new RpcError\(-32000, 'ZCode did not create a session\.'\)\n\s+created\?\.\(id\)/)
})

// ---- how an imported reply shows (import-display.js): ZCode keeps the text, the history shows tool rows -------------
test('an imported reply shows its tool calls as tool rows; ZCode\'s message keeps the text', async () => {
  const { importDisplayIndex } = await import('../packages/zcode-bridge/src/import-display.js')
  await loadSqlite()
  const dir = tmp()
  const dbPath = path.join(dir, 'db.sqlite')
  const db = new DatabaseSync(dbPath)
  db.exec(SCHEMA)
  // As chat-import convert.mjs toolBlock writes them; the first one's output ends with a line break.
  const shell = '[Tool: shell]\nls\n[Result (exit 2)]\nls: no such file\n'
  const read = '[Tool: Read]\n/w/a.txt\n[Result]\nhello'
  const parts = [{ text: 'Looking.' }, { text: shell, tool: true }, { text: read, tool: true }, { text: 'Found it.' }]
  const request = { title: 'Imported', messages: [
    { role: 'user', text: 'Where is it?', ts: NOW - 500 },
    { role: 'assistant', text: parts.map((part) => part.text).join('\n\n'), parts, ts: NOW - 400 },
    { role: 'user', text: 'Thanks' },
    { role: 'assistant', text: 'Any time.' },
  ] }
  const history = importedHistoryOf(request, NOW)
  assertProtocolImportHistory(history)
  assert.equal(history.messages[1].content, request.messages[1].text.trim(), 'ZCode is handed the reply as one text')
  // What server.js importThread keeps with the thread before the history is first built.
  const importBlocks = importDisplayIndex(request.messages, history.messages.filter((message) => message.role === 'assistant').map((message) => message.content))
  assert.equal(Object.keys(importBlocks).length, 1)
  assert.ok(!/Looking|hello|no such file/.test(JSON.stringify(importBlocks)), 'offsets only, no conversation text')
  persistLikeZCode(db, 'sess_rows', history, dir)
  db.close()
  const messages = storedMessages(dbPath, 'sess_rows')
  const shape = (turns) => turns.map((turn) => turn.items.map((item) => (item.type === 'dynamicToolCall' ? `${item.tool}:${item.status}` : item.type === 'agentMessage' ? item.text : item.type)))
  const { turns } = turnsFromMessages(messages, { threadId: 'sess_rows', cwd: dir, importBlocks })
  assert.deepEqual(shape(turns), [['userMessage', 'Looking.', 'shell:failed', 'Read:completed', 'Found it.'], ['userMessage', 'Any time.']])
  const ids = turns.flatMap((turn) => turn.items.map((item) => item.id))
  assert.equal(new Set(ids).size, ids.length, 'every item has an id of its own')
  assert.deepEqual(turnsFromMessages(messages, { threadId: 'sess_rows', cwd: dir, importBlocks }).turns.flatMap((turn) => turn.items.map((item) => item.id)), ids, 'the same ids on every read')
  const [, , row] = turns[0].items
  assert.deepEqual([row.arguments, row.success, row.contentItems], [{ input: 'ls' }, false, [{ type: 'inputText', text: 'ls: no such file' }]])
  assert.ok(turns.every((turn) => turn.status === 'completed'))
  // Without the index (a thread that is not an import) the reply shows as ZCode holds it.
  assert.deepEqual(shape(turnsFromMessages(messages, { threadId: 'sess_rows', cwd: dir }).turns)[0], ['userMessage', request.messages[1].text.trim()])
  fs.rmSync(dir, { recursive: true, force: true })
})

test('server.js: the display index is kept before the history is first built, read by the history view, and copied to a fork', () => {
  const server = fs.readFileSync(path.resolve(import.meta.dirname, '../packages/zcode-bridge/src/server.js'), 'utf8')
  const body = server.slice(server.indexOf('  async function importThread(params) {'), server.indexOf('  /** Load a thread\'s session in ZCode (resume) if needed. */'))
  assert.ok(body.indexOf('store.update(id, { importBlocks })') > 0 && body.indexOf('store.update(id, { importBlocks })') < body.indexOf('return finishImport(response, {'))
  assert.match(body, /made\.history = null/)
  assert.match(server, /turnsFromMessages\(messages, \{[^}]*importBlocks: meta\.importBlocks \}\)/)
  assert.match(server, /store\.update\(id, \{ forkedFromId: threadId, importBlocks: store\.get\(threadId\)\?\.importBlocks,/)
})
