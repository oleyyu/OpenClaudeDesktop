// OpenCode 2.x bridge, phase 1: which API generation a binary speaks (flavor.js detectApi), and AgentServerV2
// (src/v2/server.js) — `serve --stdio`, the {url} ready line, Basic auth as `opencode`, /api/info, the /api/event
// stream (server.connected opens it, heartbeats, the idle watchdog, reconnects) and the stop order. Runs without
// listen() or child processes: a fake child process and the in-process v2 fake (fixtures/v2-fake.mjs).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, detectApi, parseVersion, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { AgentServerV2, SERVE_ARGS, encodeQuery, parseSse, readyUrl, serverEnvV2 } from '../packages/opencode-bridge/src/v2/server.js'
import { createV2Fake } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-server-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const until = async (check, ms = 2000) => { const end = Date.now() + ms; while (Date.now() < end) { if (check()) return true; await new Promise((resolve) => setTimeout(resolve, 5)) } return check() }
const OC2 = withApi(FLAVORS.opencode, 'v2')

/** A child process stand-in: prints the ready line, exits on stdin EOF (serve's lease) unless told otherwise. */
function fakeChild({ url = 'http://127.0.0.1:4096', ready = true, exitOnEof = true, dieOn = ['SIGTERM', 'SIGKILL'] } = {}) {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.pid = 4321
  child.exitCode = null
  child.trail = []
  child.exit = (code, signal) => { if (child.exitCode !== null) return; child.exitCode = code ?? -1; child.emit('exit', code, signal) }
  child.kill = (signal) => { child.trail.push(signal); if (dieOn.includes(signal)) setImmediate(() => child.exit(null, signal)); return true }
  child.stdin.on('finish', () => { child.trail.push('stdin.end'); if (exitOnEof) setImmediate(() => child.exit(0, null)) })
  if (ready) setImmediate(() => { child.stdout.write('not json\n'); child.stdout.write(JSON.stringify({ url }) + '\n') })
  return child
}

function serverWith({ child = fakeChild(), fake = createV2Fake(), timing = {}, env = {} } = {}) {
  const calls = []
  const lines = []
  const server = new AgentServerV2({
    flavor: OC2, binary: '/opt/opencode', env, db: '/state/opencode-v2/opencode.db', log: (line) => lines.push(line), fetch: fake.fetch, timing,
    spawn: (command, args, options) => { calls.push({ command, args, options }); return child },
  })
  fake.state.password = server.password
  return { server, child, fake, calls, lines }
}

// ---------------------------------------------------------------- detectApi

test('detectApi: MiMo is v1 without running anything, even with the override', async () => {
  let ran = 0
  const exec = () => { ran++ }
  assert.deepEqual(await detectApi(FLAVORS.mimo, '/bin/mimo', { env: { CODE_DESKTOP_OPENCODE_API: 'v2' }, exec }), { api: 'v1', version: null, source: 'mimo' })
  assert.equal(ran, 0)
  assert.equal(withApi(FLAVORS.mimo, 'v2'), FLAVORS.mimo, 'MiMo never gets the v2 API')
})

test('detectApi: CODE_DESKTOP_OPENCODE_API forces the generation without running the binary', async () => {
  let ran = 0
  const exec = () => { ran++ }
  assert.equal((await detectApi(FLAVORS.opencode, '/bin/opencode', { env: { CODE_DESKTOP_OPENCODE_API: 'v2' }, exec })).api, 'v2')
  assert.equal((await detectApi(FLAVORS.opencode, '/bin/opencode', { env: { CODE_DESKTOP_OPENCODE_API: 'v1' }, exec })).api, 'v1')
  assert.equal(ran, 0)
  // Anything else is not an override.
  assert.equal((await detectApi(FLAVORS.opencode, '', { env: { CODE_DESKTOP_OPENCODE_API: 'v3' }, exec })).api, 'v1')
})

test('detectApi: `--version` major ≥ 2 is v2, 1.x is v1, no version is v1 (logged), cached per path and mtime', async () => {
  const dir = tmp()
  const binary = path.join(dir, 'opencode')
  fs.writeFileSync(binary, '')
  const runs = []
  let answer = 'opencode v2.2.5\n'
  const exec = (command, args, options, done) => { runs.push({ command, args, timeout: options.timeout }); setImmediate(() => done(null, answer, '')) }
  const lines = []
  const log = (line) => lines.push(line)
  assert.deepEqual(await detectApi(FLAVORS.opencode, binary, { env: {}, exec, log }), { api: 'v2', version: '2.2.5', source: 'version' })
  assert.deepEqual(runs, [{ command: binary, args: ['--version'], timeout: 15000 }])
  assert.equal((await detectApi(FLAVORS.opencode, binary, { env: {}, exec, log })).source, 'cache')
  assert.equal(runs.length, 1, 'the same file is asked once')
  // A replaced binary (new mtime) is asked again.
  answer = '1.18.34\n'
  const later = new Date(Date.now() + 5000)
  fs.utimesSync(binary, later, later)
  assert.deepEqual(await detectApi(FLAVORS.opencode, binary, { env: {}, exec, log }), { api: 'v1', version: '1.18.34', source: 'version' })
  // A node-run entry is asked through node.
  const script = path.join(dir, 'opencode.mjs')
  fs.writeFileSync(script, '')
  answer = 'opencode 2.3.0'
  assert.equal((await detectApi(FLAVORS.opencode, script, { env: {}, exec, runner: 'node', nodeBinary: '/usr/bin/node' })).api, 'v2')
  assert.deepEqual(runs.at(-1).args, [script, '--version'])
  assert.equal(runs.at(-1).command, '/usr/bin/node')
  // No version in the answer (or a failed run): the 1.x API, and why.
  const broken = path.join(dir, 'broken')
  fs.writeFileSync(broken, '')
  const failing = (command, args, options, done) => setImmediate(() => done(Object.assign(new Error('spawn EPERM'), { code: 'EPERM' }), '', ''))
  assert.deepEqual(await detectApi(FLAVORS.opencode, broken, { env: {}, exec: failing, log }), { api: 'v1', version: null, source: 'default' })
  assert.match(lines.at(-1), /gave no version \(spawn EPERM\): using the 1\.x API/)
  assert.deepEqual(parseVersion('opencode v2.10.1'), { major: 2, minor: 10, patch: 1, text: '2.10.1' })
  assert.equal(parseVersion('nothing'), null)
})

test('the frozen flavors default to v1, and withApi copies one with its generation', () => {
  assert.equal(FLAVORS.opencode.api, 'v1')
  assert.equal(FLAVORS.mimo.api, 'v1')
  const v2 = withApi(FLAVORS.opencode, 'v2')
  assert.equal(v2.api, 'v2')
  assert.equal(v2.id, 'opencode')
  assert.ok(Object.isFrozen(v2))
  assert.equal(withApi(FLAVORS.opencode, 'v1'), FLAVORS.opencode)
})

// ---------------------------------------------------------------- pure parts

test('serverEnvV2: both password names, auto-update off, OPENCODE_CLIENT stays cli, OPENCODE_DB, no username or sandbox markers', () => {
  const env = serverEnvV2({
    base: { PATH: '/bin', OPENCODE_PASSWORD: 'users-own', OPENCODE_SERVER_USERNAME: 'code-desktop', CODE_DESKTOP_SANDBOX: '1', CODE_DESKTOP_SANDBOX_PROFILE: '/p.sb', OPENCODE_CLIENT: 'x' },
    extra: { CODE_DESKTOP_OPENCODE_STATE: '/state' }, password: 'pw', db: '/state/opencode-v2/opencode.db',
  })
  assert.equal(env.OPENCODE_PASSWORD, 'pw')
  assert.equal(env.OPENCODE_SERVER_PASSWORD, 'pw')
  assert.equal(env.OPENCODE_DISABLE_AUTOUPDATE, '1')
  assert.equal(env.OPENCODE_CLIENT, 'cli')
  assert.equal(env.OPENCODE_DB, '/state/opencode-v2/opencode.db')
  assert.equal(env.CODE_DESKTOP_OPENCODE_STATE, '/state')
  assert.equal(env.PATH, '/bin')
  for (const key of ['OPENCODE_SERVER_USERNAME', 'CODE_DESKTOP_SANDBOX', 'CODE_DESKTOP_SANDBOX_PROFILE', 'OPENCODE_CONFIG_DIR']) assert.equal(key in env, false, key)
})

test('readyUrl takes only the {"url"} line', () => {
  assert.equal(readyUrl('{"url":"http://127.0.0.1:51234"}'), 'http://127.0.0.1:51234')
  assert.equal(readyUrl('{"url":"http://127.0.0.1:51234/"}'), 'http://127.0.0.1:51234')
  assert.equal(readyUrl('server listening on http://127.0.0.1:4096'), null)
  assert.equal(readyUrl('{"url":5}'), null)
  assert.equal(readyUrl('{"other":"http://x"}'), null)
})

test('parseSse: data-only frames, heartbeat comments, frames split across chunks, CRLF', () => {
  const first = parseSse('data: {"type":"server.connected","data":{}}\n\n: heartbeat\n\ndata: {"type":"a"')
  assert.deepEqual(first.events.map((event) => event.type), ['server.connected'])
  assert.equal(first.comments, 1)
  const second = parseSse(first.rest + ',"data":{}}\r\n\r\ndata: not json\n\ndata: {"type":"b","data":{}}\n\n')
  assert.deepEqual(second.events.map((event) => event.type), ['a', 'b'])
  assert.equal(second.rest, '')
})

test('encodeQuery: deepObject locations, null as the literal, arrays repeated, undefined left out', () => {
  assert.equal(encodeQuery({ parentID: null, limit: 200, location: { directory: '/a b' }, skip: undefined, tag: ['x', 'y'] }).toString(), 'parentID=null&limit=200&location%5Bdirectory%5D=%2Fa+b&tag=x&tag=y')
})

// ---------------------------------------------------------------- AgentServerV2

test('start: serve --stdio --port 0 on loopback (never --service), stdin kept open, the url line, Basic opencode:, /api/info', async () => {
  const { server, child, fake, calls, lines } = serverWith({ env: { HOME: '/Users/me', CODE_DESKTOP_OPENCODE_STATE: '/state' } })
  await server.start()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].command, '/opt/opencode')
  assert.deepEqual(calls[0].args, ['serve', '--stdio', '--port', '0', '--hostname', '127.0.0.1'])
  assert.deepEqual(calls[0].args, [...SERVE_ARGS])
  assert.equal(calls[0].args.includes('--service'), false)
  assert.deepEqual(calls[0].options.stdio, ['pipe', 'pipe', 'pipe'])
  assert.equal(calls[0].options.cwd, '/Users/me')
  const env = calls[0].options.env
  assert.equal(env.OPENCODE_PASSWORD, server.password)
  assert.equal(env.OPENCODE_SERVER_PASSWORD, server.password)
  assert.equal(env.OPENCODE_DB, '/state/opencode-v2/opencode.db')
  assert.equal(env.OPENCODE_DISABLE_AUTOUPDATE, '1')
  assert.equal('OPENCODE_SERVER_USERNAME' in env, false)
  assert.equal(server.url, 'http://127.0.0.1:4096')
  assert.equal(server.version, '2.2.5')
  assert.equal(server.auth, 'Basic ' + Buffer.from(`opencode:${server.password}`).toString('base64'))
  assert.equal(fake.state.requests[0].path, '/api/info')
  assert.equal(fake.state.requests[0].headers.authorization, server.auth)
  assert.equal(child.trail.includes('stdin.end'), false, 'the lease stays open')
  assert.ok(lines.some((line) => line.includes('not json')), 'other stdout lines go to the log')
  // stdout keeps being drained after the ready line.
  child.stdout.write('late line\n')
  assert.ok(await until(() => lines.some((line) => line.includes('late line'))))
  await server.stop()
})

test('start fails with the stderr when serve exits before its ready line, or when /api/info is refused', async () => {
  const child = fakeChild({ ready: false })
  setImmediate(() => { child.stderr.write('Error: config is broken\n'); setImmediate(() => child.exit(1, null)) })
  const exits = []
  const { server } = serverWith({ child })
  server.onExit = (info) => exits.push(info)
  await assert.rejects(server.start(), /OpenCode did not start: .*config is broken/)
  assert.equal(server.child, null)
  assert.deepEqual(exits, [{ code: 1, signal: null }])

  const wrong = serverWith({ child: fakeChild({ exitOnEof: false }) })
  wrong.fake.state.password = 'something else'
  await assert.rejects(wrong.server.start(), /did not start: GET \/api\/info: OpenCode: Authentication required/)
  assert.ok(wrong.child.trail.includes('SIGKILL'))
  assert.equal(wrong.server.url, null)
})

test('a request error carries v2’s _tag; the location header is encodeURIComponent’d', async () => {
  const { server, fake } = serverWith()
  await server.start()
  const error = await server.request('GET', '/api/session/ses_missing').catch((failure) => failure)
  assert.equal(error.status, 404)
  assert.equal(error._tag, 'SessionNotFoundError')
  assert.match(error.message, /^OpenCode: Session not found: ses_missing/)
  await server.request('GET', '/api/agent', { directory: '/Users/me/my project' })
  assert.equal(fake.state.requests.at(-1).headers['x-opencode-directory'], encodeURIComponent('/Users/me/my project'))
  await server.stop()
})

test('events: open on server.connected (not on the HTTP answer), identity encoding, heartbeats keep it, no replay', async () => {
  const { server, fake } = serverWith({ timing: { eventIdle: 200, reconnect: 10 } })
  await server.start()
  const seen = []
  let opens = 0
  const stop = server.events((event) => seen.push(event.type), { onOpen: () => opens++ })
  assert.ok(await until(() => opens === 1))
  const request = fake.state.requests.find((entry) => entry.path === '/api/event')
  assert.equal(request.headers['accept-encoding'], 'identity')
  assert.equal(request.headers.accept, 'text/event-stream')
  assert.equal(request.headers.authorization, server.auth)
  fake.emit('session.execution.started', { sessionID: 'ses_1' }, { durable: { aggregateID: 'ses_1', seq: 3, version: 1 } })
  fake.raw('data: {"type":"session.text.delta","data":{"sessionID":"ses_1","delta":"he')
  fake.raw('llo"}}\n\n')
  for (let index = 0; index < 4; index++) { fake.heartbeat(); await new Promise((resolve) => setTimeout(resolve, 80)) }
  assert.deepEqual(seen, ['session.execution.started', 'session.text.delta'])
  assert.equal(opens, 1, 'heartbeats keep the stream (no idle reconnect)')
  stop()
  await server.stop()
})

test('events: a stream whose first frame is not server.connected never opens; a dropped stream reconnects and opens again', async () => {
  const fake = createV2Fake({ connectedFirst: false })
  const { server } = serverWith({ fake, timing: { eventIdle: 5000, reconnect: 10 } })
  await server.start()
  const seen = []
  let opens = 0
  let drops = 0
  const stop = server.events((event) => seen.push(event.type), { onOpen: () => opens++, onDrop: () => drops++ })
  assert.ok(await until(() => fake.openStreams === 1))
  fake.emit('session.execution.started', { sessionID: 'ses_1' })
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(opens, 0)
  assert.deepEqual(seen, [])
  fake.emit('server.connected', {})
  fake.emit('session.execution.succeeded', { sessionID: 'ses_1' })
  assert.ok(await until(() => opens === 1 && seen.length === 1))
  fake.drop()
  assert.ok(await until(() => drops === 1 && fake.openStreams === 1))
  fake.emit('server.connected', {})
  assert.ok(await until(() => opens === 2), 'onOpen again: the caller resyncs')
  stop()
  await server.stop()
})

test('events: 45 s (here 60 ms) without a byte counts as a dead stream', async () => {
  const { server, fake, lines } = serverWith({ timing: { eventIdle: 60, reconnect: 10 } })
  await server.start()
  let opens = 0
  const stop = server.events(() => {}, { onOpen: () => opens++ })
  assert.ok(await until(() => opens >= 2, 3000), 'reconnected after the silence')
  assert.ok(lines.some((line) => /nothing for \d+ s, reconnecting/.test(line)))
  stop()
  await server.stop()
  assert.ok(await until(() => fake.openStreams === 0))
})

test('stop: interrupt the active sessions, close stdin, then SIGTERM, then SIGKILL', async () => {
  const child = fakeChild({ exitOnEof: false, dieOn: ['SIGKILL'] })
  const { server, fake } = serverWith({ child, timing: { stopGrace: 30, killAfter: 30 } })
  await server.start()
  fake.makeSession({ id: 'ses_busy' })
  fake.makeSession({ id: 'ses_idle' })
  fake.state.active.add('ses_busy')
  await server.stop()
  const after = fake.state.requests.slice(1).map((entry) => `${entry.method} ${entry.path}${new URL(entry.url).search}`)
  assert.deepEqual(after, ['GET /api/session/active', 'POST /api/session/ses_busy/interrupt?resume=false'])
  assert.deepEqual(child.trail, ['stdin.end', 'SIGTERM', 'SIGKILL'])
  assert.equal(fake.state.violations.length, 0)
})

test('stop: a server that honours the lease exits on stdin EOF, with no signal', async () => {
  const { server, child } = serverWith({ timing: { stopGrace: 2000, killAfter: 2000 } })
  await server.start()
  const started = Date.now()
  await server.stop()
  assert.deepEqual(child.trail, ['stdin.end'])
  assert.ok(Date.now() - started < 1000)
  await assert.rejects(server.start(), /OpenCode stopped/)
})

test('ready() restarts a server that exited, a bounded number of times', async () => {
  const children = []
  const fake = createV2Fake()
  const server = new AgentServerV2({ flavor: OC2, binary: '/opt/opencode', fetch: fake.fetch, spawn: () => { const child = fakeChild(); children.push(child); return child } })
  fake.state.password = server.password
  await server.ready()
  children[0].exit(1, null)
  assert.ok(await until(() => server.child === null))
  await server.ready()
  assert.equal(children.length, 2)
  assert.equal(server.restarts, 1)
  await server.stop()
})
