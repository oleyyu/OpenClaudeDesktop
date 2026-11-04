// OpenCode 2.x bridge, phase 1, with real child processes: skipped unless CODE_DESKTOP_LIVE_TESTS=1 (the sandbox the
// other tests run in forbids spawn and listen). Run in a normal terminal:
//
//   CODE_DESKTOP_LIVE_TESTS=1 node --test tests/opencode-bridge-v2-live.test.mjs
//   CODE_DESKTOP_LIVE_TESTS=1 CODE_DESKTOP_OPENCODE_V2_BINARY=/path/to/opencode node --test tests/opencode-bridge-v2-live.test.mjs
//
// The first group runs fixtures/fake-opencode-v2.mjs (a stdio stand-in) with the in-process v2 fake as fetch; the last
// one a real `opencode serve --stdio` 2.x on throwaway XDG folders and database.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FLAVORS, detectApi, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { AgentServerV2 } from '../packages/opencode-bridge/src/v2/server.js'
import { V2Api } from '../packages/opencode-bridge/src/v2/api.js'
import { createV2Fake } from './fixtures/v2-fake.mjs'

const live = process.env.CODE_DESKTOP_LIVE_TESTS === '1'
const skip = live ? false : 'set CODE_DESKTOP_LIVE_TESTS=1 (spawns processes)'
const realBinary = process.env.CODE_DESKTOP_OPENCODE_V2_BINARY
const fakeBinary = fileURLToPath(new URL('./fixtures/fake-opencode-v2.mjs', import.meta.url))
const OC2 = withApi(FLAVORS.opencode, 'v2')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-live-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
const until = async (check, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await check()) return true; await new Promise((resolve) => setTimeout(resolve, 20)) } return check() }

function fakeServer(env = {}) {
  const fake = createV2Fake()
  const server = new AgentServerV2({ flavor: OC2, binary: fakeBinary, runner: 'node', env: { HOME: tmp(), ...env }, db: '/state/opencode-v2/opencode.db', fetch: fake.fetch, timing: { stopGrace: 2000, killAfter: 1000 } })
  fake.state.password = server.password
  return { server, fake }
}

test('detectApi asks the binary itself: `opencode v2.2.5` → v2', { skip }, async () => {
  assert.equal((await detectApi(FLAVORS.opencode, fakeBinary, { env: {}, runner: 'node' })).api, 'v2')
})

test('serve --stdio: the args and env reach the process, never --service; stdin EOF ends it with no signal', { skip }, async () => {
  const record = path.join(tmp(), 'record.json')
  const { server } = fakeServer({ FAKE_OPENCODE_V2_RECORD: record })
  await server.start()
  const pid = server.child.pid
  const seen = JSON.parse(fs.readFileSync(record, 'utf8'))
  assert.deepEqual(seen.args, ['serve', '--stdio', '--port', '0', '--hostname', '127.0.0.1'])
  assert.equal(seen.env.OPENCODE_PASSWORD, server.password)
  assert.equal(seen.env.OPENCODE_SERVER_PASSWORD, server.password)
  assert.equal(seen.env.OPENCODE_DB, '/state/opencode-v2/opencode.db')
  assert.equal(seen.env.OPENCODE_DISABLE_AUTOUPDATE, '1')
  assert.equal('OPENCODE_SERVER_USERNAME' in seen.env, false)
  assert.equal(server.version, '2.2.5')
  assert.equal(alive(pid), true)
  const kills = []
  const kill = server.child.kill.bind(server.child)
  server.child.kill = (signal) => { kills.push(signal); return kill(signal) }
  await server.stop()
  assert.deepEqual(kills, [], 'the lease alone stopped it')
  assert.ok(await until(() => !alive(pid)))
})

test('a serve that dies before its ready line fails the start with its stderr; a missing binary at once', { skip }, async () => {
  const { server } = fakeServer({ FAKE_OPENCODE_V2_FAIL: '1' })
  await assert.rejects(server.start(), /did not start: .*fake serve failed to boot/)
  const missing = new AgentServerV2({ flavor: OC2, binary: '/nonexistent/opencode-v2', fetch: createV2Fake().fetch })
  const started = Date.now()
  await assert.rejects(missing.start(), /did not start: .*ENOENT/)
  assert.ok(Date.now() - started < 5000)
})

test('a real OpenCode 2.x serve: ready line, /api/info, server.connected first, an empty database, stop', { skip: skip || (!realBinary && 'set CODE_DESKTOP_OPENCODE_V2_BINARY') }, async () => {
  const home = tmp()
  const xdg = { XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'config'), XDG_STATE_HOME: path.join(home, 'xstate'), XDG_CACHE_HOME: path.join(home, 'cache') }
  assert.equal((await detectApi(FLAVORS.opencode, realBinary, { env: {} })).api, 'v2')
  const lines = []
  const server = new AgentServerV2({ flavor: OC2, binary: realBinary, env: { ...xdg }, db: path.join(home, 'state', 'opencode-v2', 'opencode.db'), log: (line) => lines.push(line) })
  fs.mkdirSync(path.join(home, 'state', 'opencode-v2'), { recursive: true })
  const started = Date.now()
  try {
    await server.start()
    process.stdout.write(`# ready in ${Date.now() - started} ms, version ${server.version}\n`)
    assert.match(server.version, /^2\./)
    const api = new V2Api(server)
    assert.equal((await api.info()).version, server.version)
    let opened = 0
    const stop = server.events(() => {}, { onOpen: () => opened++ })
    assert.ok(await until(() => opened === 1, 10000), 'server.connected arrives first')
    stop()
    assert.deepEqual(await api.sessions({ parentID: null }), [])
    assert.ok(fs.existsSync(path.join(home, 'state', 'opencode-v2', 'opencode.db')), 'OPENCODE_DB is where the bridge put it')
    const pid = server.child.pid
    await server.stop()
    assert.ok(await until(() => !alive(pid), 15000))
  } finally {
    await server.stop().catch(() => {})
    if (lines.length) process.stdout.write(`# serve log:\n# ${lines.slice(-20).join('\n# ')}\n`)
  }
})
