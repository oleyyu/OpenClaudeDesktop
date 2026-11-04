// OpenCode 2.x bridge, phase 1: the bridge's own v2 database (src/v2/db.js) — OPENCODE_DB under the state folder, the
// O_EXCL first-start lock shared with a workflow runner's bridge, the one-time import of auth.json's API keys — the
// threads.json engine marker (src/v2/threads.js), and the Bridge's v2 seam (this.v2, startServerV2, onEventV2), with a
// fake child process and the in-process v2 fake.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { ThreadStore } from '../packages/opencode-bridge/src/store.js'
import { V2Api } from '../packages/opencode-bridge/src/v2/api.js'
import { AgentServerV2 } from '../packages/opencode-bridge/src/v2/server.js'
import { acquireFirstStart, importAuthKeys, legacyApiKeys, markReady, v2Paths } from '../packages/opencode-bridge/src/v2/db.js'
import { ENGINE_V2, hiddenUnder, isV2Thread, markV2Writes, threadOwnedBy, updateV2 } from '../packages/opencode-bridge/src/v2/threads.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-db-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const until = async (check, ms = 2000) => { const end = Date.now() + ms; while (Date.now() < end) { if (check()) return true; await new Promise((resolve) => setTimeout(resolve, 5)) } return check() }
const OC2 = withApi(FLAVORS.opencode, 'v2')

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.pid = 4321
  child.exitCode = null
  child.kill = (signal) => { setImmediate(() => { if (child.exitCode === null) { child.exitCode = -1; child.emit('exit', null, signal) } }); return true }
  child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
  setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
  return child
}

function apiWith(fake = createV2Fake()) {
  const server = new AgentServerV2({ flavor: OC2, binary: '/opt/opencode', fetch: fake.fetch })
  server.url = 'http://127.0.0.1:4096'
  server.child = { exitCode: null }
  fake.state.password = server.password
  return { api: new V2Api(server), fake }
}

/** A v2 Bridge whose server is a fake child process + the in-process fake (the password is read from the spawn env). */
function v2Bridge(home, { fake = createV2Fake(), env = {} } = {}) {
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), ...env }, input: new PassThrough(), output: new PassThrough() })
  const spawns = []
  bridge.v2.fetch = fake.fetch
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { spawns.push({ command, args, options }); fake.serve(options.env); return fakeChild() }
  return { bridge, fake, spawns }
}

const writeAuth = (home, value) => {
  fs.mkdirSync(path.join(home, 'data', 'opencode'), { recursive: true })
  fs.writeFileSync(path.join(home, 'data', 'opencode', 'auth.json'), JSON.stringify(value))
}

// ---------------------------------------------------------------- first-start lock

test('the first start is serialized: a second bridge waits for the lock, and none is needed once ready.json and the import record exist', async () => {
  const state = tmp()
  const paths = v2Paths(state)
  const releaseA = await acquireFirstStart(state)
  assert.ok(fs.existsSync(paths.lock))
  assert.equal(JSON.parse(fs.readFileSync(paths.lock, 'utf8')).pid, process.pid)
  const order = []
  const second = acquireFirstStart(state, { pollMs: 5 }).then((release) => { order.push('B locked'); return release })
  await new Promise((resolve) => setTimeout(resolve, 40))
  order.push('A done')
  releaseA()
  const releaseB = await second
  assert.deepEqual(order, ['A done', 'B locked'])
  assert.ok(fs.existsSync(paths.lock), 'B holds it now')
  markReady(state, { version: '2.2.5' })
  // ready.json alone is not enough: the API key import (two bridges would both create the credentials) waits too.
  const lines = []
  const unlocked = await acquireFirstStart(state, { pollMs: 5, waitMs: 30, log: (line) => lines.push(line) })
  assert.match(lines.join('\n'), /starting anyway/)
  unlocked()
  fs.writeFileSync(paths.importRecord, JSON.stringify({ importedAt: 'now' }))
  // With both, even a held lock is no obstacle.
  const releaseC = await acquireFirstStart(state, { pollMs: 5, waitMs: 50 })
  releaseC()
  releaseB()
  assert.equal(fs.existsSync(paths.lock), false)
  assert.equal(JSON.parse(fs.readFileSync(paths.ready, 'utf8')).version, '2.2.5')
})

test('a stale lock (its process gone) is taken over; a live one is waited on only so long', async () => {
  const state = tmp()
  const paths = v2Paths(state)
  fs.mkdirSync(paths.dir, { recursive: true })
  fs.writeFileSync(paths.lock, JSON.stringify({ pid: 999999, stamp: 'old' }))
  const lines = []
  const release = await acquireFirstStart(state, { alive: () => false, log: (line) => lines.push(line) })
  assert.match(lines.join('\n'), /lock of 999999 is stale: taking it over/)
  assert.equal(JSON.parse(fs.readFileSync(paths.lock, 'utf8')).pid, process.pid)
  release()
  fs.writeFileSync(paths.lock, JSON.stringify({ pid: 12345, stamp: 'theirs' }))
  const started = Date.now()
  const none = await acquireFirstStart(state, { alive: () => true, waitMs: 60, pollMs: 5, log: (line) => lines.push(line) })
  assert.ok(Date.now() - started >= 50)
  assert.match(lines.at(-1), /still locked by 12345 .* starting anyway/)
  none()
  assert.equal(JSON.parse(fs.readFileSync(paths.lock, 'utf8')).stamp, 'theirs', 'someone else’s lock is never removed by the no-op release')
})

test('a stale lock is taken over atomically: a waiter that read it stale never removes the lock another waiter took meanwhile', async () => {
  const state = tmp()
  const paths = v2Paths(state)
  fs.mkdirSync(paths.dir, { recursive: true })
  fs.writeFileSync(paths.lock, JSON.stringify({ pid: 999999, stamp: 'dead' }))
  // Between this waiter's read and its takeover, another waiter takes the stale lock over and writes its own.
  let checks = 0
  const alive = (pid) => {
    if (++checks === 1) { fs.rmSync(paths.lock); fs.writeFileSync(paths.lock, JSON.stringify({ pid: 4242, stamp: 'fresh' })); return pid !== 999999 }
    return pid === 4242
  }
  const none = await acquireFirstStart(state, { alive, waitMs: 40, pollMs: 5 })
  none()
  assert.equal(JSON.parse(fs.readFileSync(paths.lock, 'utf8')).stamp, 'fresh', 'the other waiter’s lock is put back')
  assert.deepEqual(fs.readdirSync(paths.dir).filter((name) => name.includes('.stale.')), [], 'nothing left aside')
})

test('a stopped bridge stops waiting for the lock', async () => {
  const state = tmp()
  const paths = v2Paths(state)
  fs.mkdirSync(paths.dir, { recursive: true })
  fs.writeFileSync(paths.lock, JSON.stringify({ pid: 4242, stamp: 'theirs' }))
  let closed = false
  setTimeout(() => { closed = true }, 20)
  const started = Date.now()
  const none = await acquireFirstStart(state, { alive: () => true, pollMs: 5, cancelled: () => closed })
  assert.ok(Date.now() - started < 1000)
  none()
  assert.equal(JSON.parse(fs.readFileSync(paths.lock, 'utf8')).stamp, 'theirs')
})

// ---------------------------------------------------------------- auth.json import

test('legacyApiKeys: only `api` entries, under the provider id without trailing slashes', () => {
  const home = tmp()
  writeAuth(home, {
    anthropic: { type: 'api', key: 'sk-ant' },
    'groq/': { type: 'api', key: 'gsk', metadata: { region: 'us', n: 1 } },
    openai: { type: 'oauth', refresh: 'r', access: 'a', expires: 1 },
    'https://example.com/': { type: 'wellknown', key: 'K', token: 't' },
    empty: { type: 'api', key: '' },
  })
  assert.deepEqual(legacyApiKeys(path.join(home, 'data', 'opencode', 'auth.json')), [
    { integrationID: 'anthropic', key: 'sk-ant' },
    { integrationID: 'groq', key: 'gsk', metadata: { region: 'us' } },
  ])
  assert.deepEqual(legacyApiKeys(path.join(home, 'missing.json')), [])
})

test('importAuthKeys: once, recorded without secrets; an existing v2 credential is kept; a refusal is recorded, a failure records nothing', async () => {
  const home = tmp()
  const state = path.join(home, 'state')
  writeAuth(home, { anthropic: { type: 'api', key: 'sk-ant' }, groq: { type: 'api', key: 'gsk' }, openai: { type: 'oauth', refresh: 'r', access: 'a', expires: 1 } })
  const authFile = path.join(home, 'data', 'opencode', 'auth.json')
  const { api, fake } = apiWith()
  fake.state.credentials.push({ id: 'crd_mine', integrationID: 'groq', label: 'API key', active: true, value: { type: 'key', key: 'already' } })
  assert.deepEqual(await importAuthKeys({ api, stateDir: state, authFile }), { imported: ['anthropic'], kept: ['groq'], rejected: [], failed: [] })
  assert.deepEqual(fake.state.credentials.map((entry) => [entry.integrationID, entry.value.key, entry.active]), [['groq', 'already', true], ['anthropic', 'sk-ant', true]])
  assert.deepEqual(fake.state.requests.find((entry) => entry.method === 'POST').body, { integrationID: 'anthropic', label: 'API key', value: { type: 'key', key: 'sk-ant' } })
  const record = fs.readFileSync(path.join(state, 'v2-import.json'), 'utf8')
  assert.equal(record.includes('sk-ant'), false, 'no secret in the record')
  assert.deepEqual(JSON.parse(record).imported, ['anthropic'])
  // Once only.
  const before = fake.state.requests.length
  assert.deepEqual(await importAuthKeys({ api, stateDir: state, authFile }), { skipped: true })
  assert.equal(fake.state.requests.length, before)
  assert.deepEqual(fake.state.violations, [])

  // A key that fails leaves no record: the next start tries again (and skips what made it).
  const other = path.join(tmp(), 'state')
  let calls = 0
  const flaky = { credentials: async () => [], createCredential: async ({ integrationID }) => { calls++; if (integrationID === 'groq') throw Object.assign(new Error('boom'), { status: 500 }) } }
  const lines = []
  assert.deepEqual(await importAuthKeys({ api: flaky, stateDir: other, authFile, log: (line) => lines.push(line) }), { imported: ['anthropic'], kept: [], rejected: [], failed: ['groq'] })
  assert.equal(fs.existsSync(path.join(other, 'v2-import.json')), false)
  assert.match(lines.join('\n'), /groq API key failed \(500\)/)
  assert.equal(lines.join('\n').includes('gsk'), false)
  // Nothing to import is recorded too (no auth.json: a fresh install).
  const fresh = path.join(tmp(), 'state')
  assert.deepEqual(await importAuthKeys({ api: flaky, stateDir: fresh, authFile: path.join(fresh, 'none.json') }), { imported: [], kept: [], rejected: [], failed: [] })
  assert.ok(fs.existsSync(path.join(fresh, 'v2-import.json')))
  assert.equal(calls, 2)

  // A key v2 refuses (400 integration_policy: managed policy denies the provider) is recorded and not tried again.
  const denied = path.join(tmp(), 'state')
  const policy = { credentials: async () => [], createCredential: async ({ integrationID }) => {
    if (integrationID === 'groq') throw Object.assign(new Error('OpenCode: groq is not allowed (gsk-echo)'), { status: 400, _tag: 'InvalidRequestError', body: { _tag: 'InvalidRequestError', kind: 'integration_policy' } })
  } }
  const deniedLines = []
  assert.deepEqual(await importAuthKeys({ api: policy, stateDir: denied, authFile, log: (line) => deniedLines.push(line) }), { imported: ['anthropic'], kept: [], rejected: [{ integrationID: 'groq', status: 400, error: 'InvalidRequestError', kind: 'integration_policy' }], failed: [] })
  assert.match(deniedLines.join('\n'), /groq API key failed \(400 InvalidRequestError\)/)
  assert.equal(deniedLines.join('\n').includes('gsk'), false, 'nor logged (bridge.log is a plain file)')
  const deniedRecord = fs.readFileSync(path.join(denied, 'v2-import.json'), 'utf8')
  assert.deepEqual(JSON.parse(deniedRecord).rejected, [{ integrationID: 'groq', status: 400, error: 'InvalidRequestError', kind: 'integration_policy' }])
  assert.equal(deniedRecord.includes('gsk'), false, 'the error message (it may quote the request) is not recorded')
  assert.deepEqual(await importAuthKeys({ api: policy, stateDir: denied, authFile }), { skipped: true })
})

// ---------------------------------------------------------------- threads.json engine marker

test('threads.json: v2 entries carry engine:"v2"; each engine owns its own and keeps the other’s', () => {
  const state = tmp()
  const store = new ThreadStore(state)
  store.update('ses_old', { cwd: '/p' })
  updateV2(store, 'ses_new', { cwd: '/q' })
  assert.equal(store.get('ses_new').engine, ENGINE_V2)
  assert.equal(isV2Thread(store.get('ses_new')), true)
  assert.equal(threadOwnedBy('v2', store.get('ses_old')), false)
  assert.equal(threadOwnedBy('v1', store.get('ses_old')), true)
  assert.equal(threadOwnedBy('v1', store.get('ses_new')), false)
  // Hidden: under v2 an existing unmarked entry, under 1.x a marked one; an id with no entry is nobody's.
  assert.equal(hiddenUnder('v2', store.get('ses_old')), true)
  assert.equal(hiddenUnder('v2', store.get('ses_new')), false)
  assert.equal(hiddenUnder('v2', store.get('ses_unknown')), false)
  assert.equal(hiddenUnder('v1', store.get('ses_new')), true)
  assert.equal(hiddenUnder('v1', store.get('ses_old')), false)
  // Under v2 every write marks its entry, except a 1.x entry's (written as it is).
  markV2Writes(store)
  store.update('ses_child', { parent: 'ses_new' })
  store.update('ses_new', { preview: 'hi' })
  store.update('ses_old', { name: 'kept 1.x' })
  store.rememberInput('ses_child', 'msg_1', [])
  assert.equal(store.get('ses_child').engine, ENGINE_V2)
  assert.equal(store.get('ses_new').engine, ENGINE_V2)
  assert.equal(store.get('ses_old').engine, undefined)
  assert.equal(store.get('ses_old').name, 'kept 1.x')
  store.flush()
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(state, 'threads.json'), 'utf8'))).sort(), ['ses_child', 'ses_new', 'ses_old'])
})

test('the 1.x sweep of dead runners’ workflow sessions leaves v2 threads alone (their sessions are in the other database)', async () => {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS.opencode, binary: '', stateDir: path.join(home, 'state'), env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
  assert.equal(bridge.v2, null)
  const calls = []
  bridge.api = async (method, route) => { calls.push(`${method} ${route}`); return null }
  bridge.store.update('ses_v1', { workflowAgent: true, runnerPid: 0, cwd: '/p' })
  updateV2(bridge.store, 'ses_v2', { workflowAgent: true, runnerPid: 0, cwd: '/p' })
  await bridge.removeWorkflowSessions({})
  assert.deepEqual(calls, ['DELETE /session/ses_v1'])
  assert.deepEqual(bridge.store.ids(), ['ses_v2'])
})

test('each engine hides the other’s threads: not listed, not read or resumed (its server is never asked), not deleted', async () => {
  const home = tmp()
  const state = path.join(home, 'state')
  const seed = new ThreadStore(state)
  seed.update('ses_old', { cwd: '/p', lastActivity: 1, preview: 'from 1.x' })
  updateV2(seed, 'ses_new', { cwd: '/p', lastActivity: 2, preview: 'from 2.x' })
  seed.flush()
  const session = (id) => ({ id, title: `title ${id}`, directory: '/p', time: { created: 1, updated: 2 } })
  for (const [api, mine, theirs] of [['v2', 'ses_new', 'ses_old'], ['v1', 'ses_old', 'ses_new']]) {
    const v2 = api === 'v2' ? v2Bridge(home) : null
    const bridge = v2 ? v2.bridge : new Bridge({ flavor: FLAVORS.opencode, binary: '/opt/opencode', stateDir: state, env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
    const calls = []
    // Both ids listed (a stand-in for the server's page: each engine's real list only has its own). 2.x lists from
    // GET /api/session (the fake), 1.x from /experimental/session.
    if (v2) for (const id of ['ses_old', 'ses_new']) v2.fake.makeSession({ id, title: `title ${id}`, location: { directory: '/p' } })
    bridge.api = async (method, route) => { calls.push(`${method} ${route}`); return route.includes('/experimental/session') ? [session('ses_old'), session('ses_new')] : null }
    const listed = await bridge.handle('thread/list', {})
    assert.deepEqual(listed.data.map((thread) => thread.id), [mine], api)
    calls.length = 0
    for (const method of ['thread/read', 'thread/resume', 'thread/delete', 'thread/archive', 'thread/name/set', 'codeDesktop/thread/move']) {
      await assert.rejects(bridge.handle(method, { threadId: theirs, name: 'x' }), (error) => error.data?.codexErrorInfo === 'threadNotFound', `${api} ${method}`)
    }
    assert.deepEqual(calls, [], `${api}: nothing asked about the other engine’s session`)
    if (v2) assert.ok(!v2.fake.state.requests.some((request) => request.path.includes(theirs)), 'v2: nothing asked about the other engine’s session')
    bridge.store.flush()
    const after = new ThreadStore(state).get(theirs)
    assert.equal(after.deleted, undefined, api)
    assert.equal(after.archived, undefined, api)
    assert.equal(after.name, undefined, api)
    if (v2) await bridge.stop()
  }
})

test('a v2 bridge marks what it writes to threads.json; a 1.x bridge does not', () => {
  const home = tmp()
  const { bridge } = v2Bridge(home)
  bridge.store.update('ses_made', { cwd: '/p', createdBy: 'code-desktop' })
  assert.equal(bridge.store.get('ses_made').engine, ENGINE_V2)
  const v1 = new Bridge({ flavor: FLAVORS.opencode, binary: '', stateDir: path.join(home, 'v1'), env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
  v1.store.update('ses_made', { cwd: '/p' })
  assert.equal(v1.store.get('ses_made').engine, undefined)
})

// ---------------------------------------------------------------- the Bridge's v2 seam

test('this.v2 exists only for the v2 API: MiMo and OpenCode 1.x keep the 1.x path', () => {
  const home = tmp()
  for (const flavor of [FLAVORS.mimo, FLAVORS.opencode]) {
    const bridge = new Bridge({ flavor, binary: '', stateDir: path.join(home, flavor.id), env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
    assert.equal(bridge.v2, null, flavor.id)
  }
  const { bridge } = v2Bridge(home)
  assert.ok(bridge.v2)
})

test('a v2 bridge starts serve on its own database, imports the API keys once, and refuses 1.x routes', async () => {
  const home = tmp()
  writeAuth(home, { anthropic: { type: 'api', key: 'sk-ant' }, openai: { type: 'oauth', refresh: 'r', access: 'a', expires: 1 } })
  const { bridge, fake, spawns } = v2Bridge(home, { env: { CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/s.sock', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok' } })
  bridge.store.update('ses_v1_thread', { cwd: '/p', preview: 'from 1.x' })
  bridge.store.flush()
  // A 1.x route is refused before anything starts.
  await assert.rejects(bridge.api('GET', '/session/ses_1'), (error) => error.code === -32601 && /does not support this yet \(GET \/session\/ses_1\)/.test(error.message))
  assert.equal(spawns.length, 0)
  const server = await bridge.ensureServer()
  assert.equal(server.version, '2.2.5')
  const paths = v2Paths(path.join(home, 'state'))
  assert.equal(spawns.length, 1)
  assert.deepEqual(spawns[0].args, ['serve', '--stdio', '--port', '0', '--hostname', '127.0.0.1'])
  const env = spawns[0].options.env
  assert.equal(env.OPENCODE_DB, paths.db)
  assert.ok(fs.statSync(paths.dir).isDirectory())
  assert.equal(env.CODE_DESKTOP_OPENCODE_STATE, path.join(home, 'state'))
  assert.equal(env.CODE_DESKTOP_AGENT_TOOLS_SOCKET, '/tmp/s.sock')
  assert.equal(env.OPENCODE_CLIENT, 'cli')
  for (const key of ['OPENCODE_CONFIG_DIR', 'OPENCODE_SERVER_USERNAME', 'OPENCODE_ENABLE_QUESTION_TOOL', 'OPENCODE_EXPERIMENTAL_PLAN_MODE']) assert.equal(key in env, false, key)
  assert.ok(fs.existsSync(paths.ready))
  assert.equal(fs.existsSync(paths.lock), false, 'the lock is released')
  assert.deepEqual(fake.state.credentials.map((entry) => [entry.integrationID, entry.value]), [['anthropic', { type: 'key', key: 'sk-ant' }]])
  assert.ok(bridge.v2.api instanceof V2Api)
  // The event stream is subscribed.
  assert.ok(await until(() => fake.openStreams === 1))
  // A 1.x route is still refused with the server running.
  await assert.rejects(bridge.api('GET', '/config/providers'), /OpenCode 2\.2\.5 does not support this yet/)
  // /api routes go through.
  assert.equal((await bridge.api('GET', '/api/info')).version, '2.2.5')
  await bridge.stop()
  assert.deepEqual(fake.state.violations, [])
  // Unmarked (1.x) threads are kept, never deleted.
  assert.equal(new ThreadStore(path.join(home, 'state')).get('ses_v1_thread').preview, 'from 1.x')

  // The next start: no lock, no second import.
  const again = v2Bridge(home)
  await again.bridge.ensureServer()
  assert.equal(again.fake.state.requests.some((entry) => entry.path === '/api/credential'), false)
  await again.bridge.stop()
})

test('concurrent first requests share one v2 start (the lock wait comes before the server exists)', async () => {
  const home = tmp()
  const { bridge, spawns } = v2Bridge(home)
  const [a, b] = await Promise.all([bridge.ensureServer(), bridge.ensureServer()])
  assert.equal(a, b)
  assert.equal(spawns.length, 1)
  assert.equal(bridge.v2.starting, null)
  assert.equal(await bridge.ensureServer(), a)
  await bridge.stop()
})

test('v2 events reach the session’s live thread by data.sessionID; replayed durable events are dropped; a reconnection resyncs once', async () => {
  const home = tmp()
  const { bridge, fake } = v2Bridge(home)
  const got = []
  bridge.threads.set('ses_1', { onEventV2: (event) => got.push(`${event.type}#${event.durable?.seq ?? '-'}`), close: () => {} })
  let resyncs = 0
  bridge.resync = () => { resyncs++ }
  await bridge.ensureServer()
  assert.ok(await until(() => fake.openStreams === 1))
  assert.ok(await until(() => resyncs === 1, 1000), 'the first server.connected resyncs')
  fake.emit('session.execution.started', { sessionID: 'ses_1' }, { durable: { aggregateID: 'ses_1', seq: 1, version: 1 } })
  fake.emit('session.execution.started', { sessionID: 'ses_1' }, { durable: { aggregateID: 'ses_1', seq: 1, version: 1 } })
  fake.emit('session.text.delta', { sessionID: 'ses_1', assistantMessageID: 'msg_1', ordinal: 0, delta: 'x' })
  fake.emit('session.text.delta', { sessionID: 'ses_other', delta: 'y' })
  fake.emit('tui.toast.show', { message: 'hi' })
  assert.ok(await until(() => got.length === 2))
  assert.deepEqual(got, ['session.execution.started#1', 'session.text.delta#-'])
  fake.drop()
  assert.ok(await until(() => resyncs === 2, 3000), 'the reconnection resyncs')
  await bridge.stop()
})

test('the bridge sees every v2 session event first, live thread or not, and may take it', async () => {
  const home = tmp()
  const { bridge, fake } = v2Bridge(home)
  const live = []
  const seen = []
  bridge.threads.set('ses_1', { onEventV2: (event) => live.push(event.type), close: () => {} })
  bridge.resync = () => {}
  // A sub-agent's session.created names the child (not loaded anywhere) and its parent: the bridge takes it.
  bridge.onSessionEventV2 = (event, thread) => { seen.push(`${event.type}:${event.sessionID}:${thread ? 'live' : 'none'}`); return event.type === 'session.created' }
  await bridge.ensureServer()
  assert.ok(await until(() => fake.openStreams === 1))
  fake.emit('session.created', { sessionID: 'ses_child', parentID: 'ses_1' })
  fake.emit('session.deleted', { sessionID: 'ses_listed' })
  fake.emit('session.text.delta', { sessionID: 'ses_1', delta: 'x' })
  assert.ok(await until(() => seen.length === 3))
  assert.deepEqual(seen, ['session.created:ses_child:none', 'session.deleted:ses_listed:none', 'session.text.delta:ses_1:live'])
  assert.deepEqual(live, ['session.text.delta'])
  await bridge.stop()
})

test('a v2 bridge stopped while it waits for the first-start lock starts nothing afterwards', async () => {
  const home = tmp()
  const { bridge, spawns } = v2Bridge(home)
  const paths = v2Paths(path.join(home, 'state'))
  fs.mkdirSync(paths.dir, { recursive: true })
  // Held by a live process (this one, under another stamp).
  fs.writeFileSync(paths.lock, JSON.stringify({ pid: process.pid, stamp: 'theirs' }))
  const starting = bridge.ensureServer()
  await new Promise((resolve) => setTimeout(resolve, 30))
  await bridge.shutdown()
  await assert.rejects(starting, /core stopped/)
  assert.equal(spawns.length, 0)
  assert.equal(bridge.server, null)
  assert.equal(JSON.parse(fs.readFileSync(paths.lock, 'utf8')).stamp, 'theirs')
})

test('a ready marker that can’t be written leaves the v2 server running with its event stream', async () => {
  const home = tmp()
  const { bridge, fake } = v2Bridge(home)
  const lines = []
  bridge.log = (line) => lines.push(line)
  const paths = v2Paths(path.join(home, 'state'))
  // A folder where ready.json goes: writing it fails.
  fs.mkdirSync(path.join(paths.ready, 'x'), { recursive: true })
  const server = await bridge.ensureServer()
  assert.equal(server.version, '2.2.5')
  assert.ok(await until(() => fake.openStreams === 1), 'subscribed anyway')
  assert.match(lines.join('\n'), /v2 ready marker:/)
  assert.equal(fs.existsSync(paths.lock), false)
  await bridge.stop()
})
