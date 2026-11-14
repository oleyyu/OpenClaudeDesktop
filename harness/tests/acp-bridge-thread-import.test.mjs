// ACP bridge codeDesktop/thread/import (server.js importThread): the generic handler over each adapter's importSession.
//  - capabilities.threadImport only where the adapter has the hook (Gemini, Kimi, Qwen; not MiniMax, not a workflow
//    runner's bridge); MiniMax's request is refused with METHOD_NOT_FOUND so the app falls back to its handoff;
//  - the hook gets the realpath cwd, the cleaned title, the messages, the agent's own home/env, importedFrom, the agent
//    version and model; the metadata (cwd, name, importedFrom, source 'bridge') is indexed before the thread opens;
//  - with params.turns the history is threads/<id>.json and nothing starts (the agent opens it on the first turn);
//  - the real Gemini / Kimi / Qwen writers, run through the handler in a temp HOME, leave their native files there;
//  - a session written but not opened is deleted again (discardThread → adapter.deleteSession).
// No agent process is started except in the last case, whose spawn of a missing binary fails either way (ENOENT, or
// EPERM in the netjail).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve, importedFromOf, importTurnsOf } from '../packages/acp-bridge/src/server.js'
import { LineTransport, METHOD_NOT_FOUND, INVALID_PARAMS } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-import-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

function bridge(adapter, { env = {}, home = tmp() } = {}) {
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const state = path.join(home, 'state')
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, CODE_DESKTOP_AGENT_BINARY: path.join(home, 'no-such-agent'), CODE_DESKTOP_AGENT_RUNNER: '',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '9.9.9', CODE_DESKTOP_BRIDGE_STATE: state, CODE_DESKTOP_ACP_NO_SANDBOX: '1', ...env,
    },
  })
  const notes = []
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({}), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const call = (method, params) => client.call(method, params, 30000)
  const index = () => JSON.parse(fs.readFileSync(path.join(state, 'index.json'), 'utf8')).threads
  return { home, state, notes, call, index, close: () => server.shutdown() }
}

const MESSAGES = [
  { role: 'user', text: 'Fix the parser' },
  { role: 'assistant', text: 'Done.\n\n[Tool: shell] npm test → ok' },
  { role: 'user', text: 'Thanks, now the docs' },
]
const TURNS = [
  { id: 'imported-1', status: 'completed', items: [{ type: 'userMessage', id: 'u1', content: [{ type: 'text', text: 'Fix the parser' }] }, { type: 'agentMessage', id: 'a1', text: 'Done.' }] },
  { id: 'imported-2', items: [{ type: 'userMessage', id: 'u2', content: [{ type: 'text', text: 'Thanks, now the docs' }] }] },
]
const FROM = { source: 'codex', sourceId: 'rollout-1', title: 'Parser fix', sourcePath: '/x/rollout-1.jsonl' }

/**
 * A real adapter with a recording importSession / deleteSession instead of its own. `writeIn`: a folder where each
 * import creates a file and answers it as `written` (what the handler removes again on failure).
 */
function recording(id, { sessionId = 'imported-session-1', fail = null, writeIn = null } = {}) {
  const calls = { import: [], delete: [], written: [] }
  const adapter = {
    ...adapterById(id),
    async importSession(args) {
      calls.import.push(args)
      if (fail) throw fail
      if (!writeIn) return { sessionId }
      const file = path.join(writeIn, `${sessionId ?? 'none'}-${calls.import.length}.jsonl`)
      fs.writeFileSync(file, '{}\n', { flag: 'wx' })
      calls.written.push(file)
      return { sessionId, written: [file] }
    },
    async deleteSession(ctx, sid, cwd) { calls.delete.push({ sid, cwd }); return true },
  }
  return { adapter, calls }
}

test('importedFromOf / importTurnsOf: provenance cleaned, turns bounded and completed', () => {
  assert.equal(importedFromOf(null), null)
  assert.equal(importedFromOf({ sourceId: 'x' }), null, 'no source, no provenance')
  assert.deepEqual(importedFromOf({ source: ' codex ', sourceId: 'a', extra: 1, title: '' }, 5), { source: 'codex', sourceId: 'a', importedAt: 5 })
  assert.equal(importTurnsOf(undefined), null)
  assert.equal(importTurnsOf([]), null)
  assert.equal(importTurnsOf(TURNS)[1].status, 'completed')
  assert.throws(() => importTurnsOf([{ id: 1, items: [] }]), /turns must be/)
  assert.throws(() => importTurnsOf('x'), /turns must be/)
})

test('capabilities.threadImport: Gemini, Kimi and Qwen have it; MiniMax and a workflow runner do not', async () => {
  for (const [id, expected, env] of [['gemini', true], ['kimi', true], ['qwen', true], ['minimax', false], ['qwen', false, { CODE_DESKTOP_WORKFLOW_RUNNER: '1' }]]) {
    const b = bridge(adapterById(id), { env })
    try {
      const init = await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
      assert.equal(init.capabilities.threadImport === true, expected, `${id}${env ? ' (runner)' : ''}`)
    } finally { b.close() }
  }
})

test('MiniMax (no importSession): codeDesktop/thread/import is refused with METHOD_NOT_FOUND, nothing indexed', async () => {
  const b = bridge(adapterById('minimax'))
  try {
    await b.call('initialize', {})
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, title: 't', messages: MESSAGES }), (error) => error.code === METHOD_NOT_FOUND)
    assert.equal(fs.existsSync(path.join(b.state, 'index.json')), false)
  } finally { b.close() }
})

test('the handler: hook arguments, metadata before opening, turns as history, thread/start-shaped answer', async () => {
  const writeIn = tmp()
  const { adapter, calls } = recording('qwen', { writeIn })
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    const folder = path.join(b.home, 'proj')
    fs.mkdirSync(folder)
    const link = path.join(b.home, 'link')
    fs.symlinkSync(folder, link)
    const answer = await b.call('codeDesktop/thread/import', {
      cwd: link, title: '  Parser\n fix  ', messages: MESSAGES, turns: TURNS, importedFrom: FROM, model: 'qwen-max',
      approvalPolicy: 'on-request', codeDesktop: { permissionMode: 'auto' },
    })
    assert.equal(calls.import.length, 1)
    const args = calls.import[0]
    assert.equal(args.cwd, folder, 'the realpath every later load names')
    assert.equal(args.title, 'Parser fix')
    assert.deepEqual(args.messages, MESSAGES)
    assert.equal(args.home, b.home)
    assert.equal(args.env.HOME, b.home)
    assert.ok(!Object.keys(args.env).some((key) => key.startsWith('CODE_DESKTOP_')), 'the agent\'s environment, not the bridge\'s')
    assert.equal(args.version, '9.9.9')
    assert.equal(args.model, 'qwen-max')
    assert.equal(args.importedFrom.source, 'codex')
    assert.equal(answer.thread.id, 'imported-session-1')
    assert.equal(answer.thread.cwd, folder)
    assert.equal(answer.thread.name, 'Parser fix')
    assert.equal(answer.cwd, folder)
    assert.deepEqual(answer.import, { mode: 'history', messages: 3 })
    assert.deepEqual(answer.thread.turns.map((turn) => turn.id), ['imported-1', 'imported-2'], 'the given turns are the history')
    await new Promise((resolve) => setTimeout(resolve, 80))
    const meta = b.index()['imported-session-1']
    assert.equal(meta.source, 'bridge')
    assert.equal(meta.name, 'Parser fix')
    assert.equal(meta.cwd, folder)
    assert.equal(meta.importedFrom.sourceId, 'rollout-1')
    assert.ok(!meta.agentHome, 'the real agent home')
    assert.equal(JSON.parse(fs.readFileSync(path.join(b.state, 'threads', 'imported-session-1.json'), 'utf8')).turns.length, 2)
    const started = b.notes.find((note) => note.method === 'thread/started')
    assert.equal(started.params.thread.id, 'imported-session-1')
    assert.deepEqual(started.params.thread.turns, [])
    // Read back like any thread; excludeTurns leaves the turns out of the answer.
    const read = await b.call('thread/read', { threadId: 'imported-session-1', includeTurns: true })
    assert.equal(read.thread.turns.length, 2)
    // The writer is told which ids are taken (it never picks one) ...
    assert.equal(calls.import[0].taken('imported-session-1'), true)
    assert.equal(calls.import[0].taken('some-other-id'), false)
    // ... and one answering an id the bridge already knows anyway is refused (never two threads on one session): what
    // it wrote is removed by path, the existing session (deleteSession by id) is never touched.
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: folder, messages: MESSAGES, turns: TURNS }), /already in use/)
    assert.equal(fs.existsSync(calls.written[0]), true, 'the first import\'s file stays')
    assert.equal(fs.existsSync(calls.written[1]), false, 'the colliding write is removed')
    assert.deepEqual(calls.delete, [])
    assert.equal(b.index()['imported-session-1'].name, 'Parser fix', 'the first thread is left as it was')
  } finally { b.close() }
})

test('excludeTurns: the answer leaves the history out (main.cjs importCoreThread asks so)', async () => {
  const { adapter } = recording('kimi', { sessionId: 'session_x' })
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    const answer = await b.call('codeDesktop/thread/import', { cwd: b.home, messages: MESSAGES, turns: TURNS, excludeTurns: true })
    assert.deepEqual(answer.thread.turns, [])
    assert.equal(answer.thread.name, null, 'no title, no name')
  } finally { b.close() }
})

test('the handler refuses bad requests before writing anything', async () => {
  const { adapter, calls } = recording('gemini')
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: [] }), (error) => error.code === INVALID_PARAMS)
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: 'relative/dir', messages: MESSAGES }), (error) => error.code === INVALID_PARAMS)
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: MESSAGES, turns: [{ nope: true }] }), (error) => error.code === INVALID_PARAMS)
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: Array.from({ length: 5001 }, () => ({ role: 'user', text: 'x' })) }), (error) => error.code === INVALID_PARAMS)
    assert.equal(calls.import.length, 0)
  } finally { b.close() }
})

test('a writer that fails: its error, nothing indexed', async () => {
  const { adapter } = recording('kimi', { fail: new Error('disk full') })
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: MESSAGES, turns: TURNS }), /disk full/)
    assert.equal(fs.existsSync(path.join(b.state, 'index.json')), false)
  } finally { b.close() }
})

test('a session written but not opened is deleted again (discardThread → deleteSession)', async () => {
  // No turns: openThread replays through session/load, whose agent (a missing binary) never starts.
  const { adapter, calls } = recording('gemini', { sessionId: 'never-opened' })
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: MESSAGES, importedFrom: FROM }))
    assert.deepEqual(calls.delete.map((entry) => entry.sid), ['never-opened'])
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(b.index()['never-opened'].deleted, true)
    assert.equal(b.notes.some((note) => note.method === 'thread/started'), false)
  } finally { b.close() }
})

test('any failure after the write (here the display turns can\'t be saved) deletes the new session and its files', async () => {
  const writeIn = tmp()
  const { adapter, calls } = recording('qwen', { sessionId: '0b7f6c1e-3c39-4d5a-9a43-2a1f3c0d9e11', writeIn })
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    // threads/<id>.json is a folder: store.writeHistory throws (EISDIR) after the session was written.
    fs.mkdirSync(path.join(b.state, 'threads', '0b7f6c1e-3c39-4d5a-9a43-2a1f3c0d9e11.json'), { recursive: true })
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: MESSAGES, turns: TURNS }))
    assert.deepEqual(calls.delete.map((entry) => entry.sid), ['0b7f6c1e-3c39-4d5a-9a43-2a1f3c0d9e11'])
    assert.equal(fs.existsSync(calls.written[0]), false, 'the written file is gone')
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(b.index()['0b7f6c1e-3c39-4d5a-9a43-2a1f3c0d9e11'].deleted, true)
    assert.equal(b.notes.some((note) => note.method === 'thread/started'), false)
  } finally { b.close() }
})

test('a writer that answers no session id: what it wrote is removed', async () => {
  const writeIn = tmp()
  const { adapter, calls } = recording('kimi', { sessionId: null, writeIn })
  const b = bridge(adapter)
  try {
    await b.call('initialize', {})
    await assert.rejects(b.call('codeDesktop/thread/import', { cwd: b.home, messages: MESSAGES, turns: TURNS }), /did not return/)
    assert.equal(fs.existsSync(calls.written[0]), false)
  } finally { b.close() }
})

test('the real writers never pick an id the bridge already knows (taken)', async () => {
  const home = tmp()
  const work = path.join(home, 'work')
  fs.mkdirSync(work)
  const env = { HOME: home, KIMI_CODE_HOME: path.join(home, '.kimi-code') }
  for (const id of ['gemini', 'kimi', 'qwen']) {
    await assert.rejects(adapterById(id).importSession({ cwd: work, title: 't', messages: MESSAGES, home, env, taken: () => true }), /No free/, id)
    const seen = []
    const written = await adapterById(id).importSession({ cwd: work, title: 't', messages: MESSAGES, home, env, taken: (candidate) => { seen.push(candidate); return seen.length < 3 } })
    assert.equal(written.sessionId, seen[2], `${id}: the third candidate, the first one free`)
    assert.ok(written.written.length === 1 && fs.existsSync(written.written[0]), `${id}: written names what it created`)
  }
})

test('the real writers through the handler: Gemini, Kimi and Qwen sessions land in the temp home', async () => {
  for (const id of ['gemini', 'kimi', 'qwen']) {
    const home = tmp()
    const work = path.join(home, 'work')
    fs.mkdirSync(work)
    const env = id === 'kimi' ? { KIMI_CODE_HOME: path.join(home, '.kimi-code') } : {}
    const b = bridge(adapterById(id), { home, env })
    try {
      await b.call('initialize', {})
      const answer = await b.call('codeDesktop/thread/import', { cwd: work, title: `${id} import`, messages: MESSAGES, turns: TURNS, importedFrom: FROM })
      const sessionId = answer.thread.id
      assert.ok(sessionId, id)
      const files = []
      const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else files.push(file) } }
      walk(home)
      const own = files.filter((file) => !file.startsWith(b.state) && file.includes(id === 'gemini' ? sessionId.slice(0, 8) : sessionId))
      assert.ok(own.length, `${id}: a native file named for ${sessionId}`)
      const text = own.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
      assert.ok(text.includes('Fix the parser') && text.includes('Thanks, now the docs'), `${id}: the conversation is in it`)
      assert.equal(answer.thread.name, `${id} import`)
    } finally { b.close() }
  }
})

test('MiniMax AGENTS.md: an imported conversation that still doesn\'t fit loses its OLDEST part; the user\'s file, the instructions after it and the closing tag stay', async () => {
  const { minimaxGlobalInstructions, trimImportedConversation, MINIMAX_GLOBAL_MAX_BYTES } = await import('../packages/acp-bridge/src/agents/minimax.js')
  const own = '# My rules\n' + 'r'.repeat(9000)
  const transcript = Array.from({ length: 300 }, (_, index) => `User: 问题 ${index}\nAssistant: answer ${index} ${'中'.repeat(30)}`).join('\n')
  const prompt = `Persona.\n\nThe conversation below was imported from Codex.\n\n<imported_conversation>\n${transcript}\n</imported_conversation>\n\nApp tools: act on this session only.`
  const result = minimaxGlobalInstructions(own, prompt)
  assert.equal(result.importTrimmed, true)
  assert.equal(result.truncated, false, 'nothing cut from the end')
  assert.ok(Buffer.byteLength(result.text) <= MINIMAX_GLOBAL_MAX_BYTES)
  assert.ok(result.text.startsWith('# My rules'), 'the user\'s file first, whole')
  assert.ok(result.text.endsWith(`answer 299 ${'中'.repeat(30)}\n</imported_conversation>\n\nApp tools: act on this session only.`), 'the newest message, the closing tag and what follows')
  assert.ok(result.text.includes('<imported_conversation>\n[… the earlier part of this conversation was left out to fit …]\n'))
  assert.ok(!result.text.includes('问题 0\n') && !result.text.includes('�'))
  // No transcript: as before (the end is cut with a note); a fitting file is untouched.
  const plain = minimaxGlobalInstructions(own, 'x'.repeat(40000))
  assert.equal(plain.truncated, true)
  assert.equal(plain.importTrimmed, undefined)
  assert.deepEqual(minimaxGlobalInstructions('mine', prompt.slice(0, 200)), { text: `mine\n\n${prompt.slice(0, 200)}`, truncated: false, ownDropped: false })
  assert.equal(trimImportedConversation('short', 10), 'short')
  assert.equal(trimImportedConversation('x'.repeat(100), 10), null, 'no block: nothing to shorten')
})
