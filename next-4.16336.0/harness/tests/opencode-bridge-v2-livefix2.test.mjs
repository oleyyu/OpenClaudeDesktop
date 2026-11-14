// OpenCode 2.x bridge, live round 2 (the user's probe against the real 2.2.5 with a signed-in Claude Code 2.1.311): item
// 11's first call, POST /api/integration/claude-agent/connect/external, answered 404 "Integration not found:
// claude-agent". Reproduced on the in-process v2 fake with the semantics read from the 2.2.5 source:
//   * integrations are what a location's plugins register (plugin/provider/claude-agent/index.ts → integration.ts
//     `ctx.integration.transform`; on a local serve only a config "plugins" remove op such as "-*" turns it off:
//     plugin/supervisor.ts resolve, internal.ts guarded), and the activation runs in its own fiber once the
//     location is loaded (plugin/supervisor.ts)
//   * GET /api/integration is the one integration route that waits for it (server/src/handlers/integration.ts: only
//     integration.list runs Plugin.awaitActivation); GET …/:id and connect/key / external answer 404
//     IntegrationNotFoundError before it, connect/oauth a 500 (core/src/integration.ts connectOAuth: "OAuth method not
//     found"); a new serve and DELETE /api/debug/location start the location over
// so every sign-in starts from the list (account.js listedIntegrationV2), also right after the restart a Claude
// sign-in may make.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { ClaudeCode } from '../packages/opencode-bridge/src/v2/claude.js'
import { createV2Fake } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-livefix2-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const CLAUDE = '/opt/homebrew/bin/claude'
const SIGNED_IN = JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'me@example.com', orgName: 'Me', subscriptionType: 'max' })
const until = async (check, what, ms = 3000) => {
  const end = Date.now() + ms
  while (!check()) { if (Date.now() > end) throw new Error(`timed out waiting for ${what}`); await new Promise((resolve) => setTimeout(resolve, 2)) }
}

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough()
  child.pid = 4321; child.exitCode = null
  child.kill = (signal) => { setImmediate(() => { if (child.exitCode === null) { child.exitCode = -1; child.emit('exit', null, signal) } }); return true }
  child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
  setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
  return child
}

/** A ClaudeCode on a fake machine (claude at CLAUDE once `installed()`), signed in, 2.1.311. */
function fakeClaude({ installed = () => true } = {}) {
  const exec = (command, args, options, callback) => {
    const out = args[0] === '-lc' ? (installed() ? `${CLAUDE}\n` : '') : args[0] === '--version' ? '2.1.311 (Claude Code)\n' : args.join(' ') === 'auth status --json' ? SIGNED_IN : ''
    setImmediate(() => callback(null, out, ''))
  }
  return new ClaudeCode({ env: { HOME: '/Users/me', SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, exec, executable: (file) => file === CLAUDE && installed(), readHead: () => '\xcf\xfa\xed\xfe' })
}

const CLAUDE_INTEGRATION = { id: 'claude-agent', name: 'Claude Agent', methods: [{ id: 'claude-login', type: 'external', label: 'Claude Code login (claude auth login)' }] }
const CLAUDE_MODEL = { id: 'opus', providerID: 'claude-agent', name: 'Opus', capabilities: { tools: true, input: ['text'], output: ['text'] }, variants: [{ id: 'high' }], cost: [], limit: { context: 200000, output: 0 }, enabled: true }
const INTEGRATIONS = () => [
  { id: 'openai', name: 'OpenAI', methods: [{ type: 'oauth', id: 'chatgpt-token-sharing', label: 'Sign in with ChatGPT', attempt: { url: 'https://auth.openai.com/oauth/authorize?x=1' } }, { type: 'key' }] },
  { id: 'anthropic', name: 'Anthropic', methods: [{ type: 'key' }, { type: 'env', names: ['ANTHROPIC_API_KEY'] }] },
  { ...CLAUDE_INTEGRATION },
]

/** A started v2 Bridge on the fake; every spawn is a new serve (fake.serve: its password and OPENCODE_CONFIG_CONTENT; fake.restart: no location has run its plugins yet). */
async function v2Bridge({ claude = fakeClaude() } = {}) {
  const fake = createV2Fake({ cwd: '/home' })
  fake.state.integrations = INTEGRATIONS()
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  const spawns = []
  bridge.v2.fetch = fake.fetch
  bridge.v2.spawn = (command, args, options) => { spawns.push(options.env); fake.serve(options.env); fake.restart(); return fakeChild() }
  bridge.v2.claude = claude
  bridge.v2.accountTiming = { debounceMs: 5 }
  bridge.v2.clock = { t: 0, now() { return this.t }, async wait(ms) { this.t += ms; await new Promise((resolve) => setImmediate(resolve)) } }
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  return { bridge, fake, home, notes, logs, spawns }
}
const requestIndex = (fake, method, pathname, from = 0) => fake.state.requests.findIndex((request, index) => index >= from && request.method === method && request.path === pathname)
const completed = (notes) => notes.filter((note) => note.method === 'account/login/completed')

// ---------------------------------------------------------------- the fake models the registration

test('fake: a location\'s integrations are there for …/:id and connect/* only once GET /api/integration (or another awaitPlugins route) ran there; a new serve or a location reload starts over', async () => {
  const { bridge, fake, home } = await v2Bridge()
  try {
    const api = await bridge.v2Api()
    const at = { location: home, locationIn: 'query' }
    // What the live probe saw: the very first connect/external of a fresh serve.
    await assert.rejects(api.post('/api/integration/claude-agent/connect/external', { methodID: 'claude-login' }, at), (error) => error.status === 404 && error._tag === 'IntegrationNotFoundError' && /Integration not found: claude-agent/.test(error.message))
    await assert.rejects(api.get('/api/integration/claude-agent', at), (error) => error.status === 404)
    await assert.rejects(api.post('/api/integration/openai/connect/oauth', { methodID: 'chatgpt-token-sharing' }, at), (error) => error.status === 500 && /OAuth method not found/.test(error.message))
    assert.equal(fake.state.credentials.length, 0)
    // Another folder's activation is not this one's.
    await api.get('/api/agent', { location: '/elsewhere' })
    await assert.rejects(api.get('/api/integration/claude-agent', at), (error) => error.status === 404)
    const list = await api.get('/api/integration', at)
    assert.ok(list.some((entry) => entry.id === 'claude-agent' && entry.methods.some((method) => method.id === 'claude-login' && method.type === 'external')))
    assert.equal((await api.get('/api/integration/claude-agent', at)).id, 'claude-agent')
    await api.delete('/api/debug/location', { location: home })
    await assert.rejects(api.get('/api/integration/claude-agent', at), (error) => error.status === 404)
    await api.get('/api/model', at)
    assert.equal((await api.get('/api/integration/claude-agent', at)).id, 'claude-agent')
    fake.restart()
    await assert.rejects(api.get('/api/integration/claude-agent', at), (error) => error.status === 404)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('fake: a config "plugins" remove op selecting opencode.provider.claude-agent drops the integration even once the folder\'s plugins ran; the bridge\'s own CONTENT entry does not bring it back', async () => {
  const { bridge, fake, home } = await v2Bridge()
  try {
    const api = await bridge.v2Api()
    const at = { location: home, locationIn: 'query' }
    const userConfig = (plugins) => { fake.state.configEntries = [{ type: 'document', path: path.join(home, 'xdg', 'opencode', 'opencode.json'), info: { plugins } }] }
    const listed = async () => (await api.get('/api/integration', at)).map((entry) => entry.id)
    // The serve's OPENCODE_CONFIG_CONTENT (the bridge's plugin folder) is there, after the user's document.
    assert.ok(Array.isArray(fake.state.content?.plugins) && fake.state.content.plugins.length > 0)
    for (const op of ['-*', '-opencode.*', '-opencode.provider.claude-agent']) {
      userConfig([op])
      assert.deepEqual(await listed(), ['openai', 'anthropic'], op)
      await assert.rejects(api.get('/api/integration/claude-agent', at), (error) => error.status === 404, op)
      await assert.rejects(api.post('/api/integration/claude-agent/connect/external', { methodID: 'claude-login' }, at), (error) => error.status === 404, op)
    }
    // Another plugin's removal, or an add of the id after "-*" (supervisor.ts: an "opencode." target re-enables it).
    for (const plugins of [['-code-desktop'], ['-*', 'opencode.provider.claude-agent'], []]) {
      userConfig(plugins)
      assert.deepEqual(await listed(), ['openai', 'anthropic', 'claude-agent'], JSON.stringify(plugins))
      assert.equal((await api.get('/api/integration/claude-agent', at)).id, 'claude-agent')
    }
    assert.equal(fake.state.credentials.length, 0)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- the bridge's sign-ins

test('Claude sign-in as the first request of a fresh serve: the integration list first (it waits for the plugins), then connect/external, and it succeeds', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    fake.state.onExternal = () => { fake.state.models = [CLAUDE_MODEL] }
    const from = fake.state.requests.length
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.equal(start.codeDesktop.openedByAgent, true)
    await until(() => completed(notes).length === 1, 'completed')
    assert.deepEqual(completed(notes)[0].params, { loginId: start.loginId, success: true, error: null })
    const list = requestIndex(fake, 'GET', '/api/integration', from)
    const connect = requestIndex(fake, 'POST', '/api/integration/claude-agent/connect/external', from)
    const single = requestIndex(fake, 'GET', '/api/integration/claude-agent', from)
    assert.ok(list >= 0 && connect > list, 'the list before connect/external')
    assert.ok(single === -1 || single > list, 'no …/:id before the list')
    assert.equal(new URL(fake.state.requests[list].url).searchParams.get('location[directory]'), bridge.homeDir())
    assert.deepEqual(fake.state.credentials.map((entry) => [entry.integrationID, entry.value.type, entry.value.methodID]), [['claude-agent', 'external', 'claude-login']])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('Claude installed after serve started: after the restart the sign-in makes, the new serve\'s list comes before connect/external', async () => {
  let installed = false
  const { bridge, fake, spawns, notes } = await v2Bridge({ claude: fakeClaude({ installed: () => installed }) })
  try {
    // An account/read before: the first serve's home folder ran its plugins, the restarted one's has not.
    await bridge.handle('account/read', { refreshToken: false })
    installed = true
    fake.state.onExternal = () => { fake.state.models = [CLAUDE_MODEL] }
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.equal(spawns.length, 2)
    assert.equal(spawns[1].OPENCODE_CLAUDE_PATH, CLAUDE)
    await until(() => completed(notes).length === 1, 'completed')
    assert.deepEqual(completed(notes)[0].params, { loginId: start.loginId, success: true, error: null })
    const restarted = fake.state.requests.findLastIndex((request) => request.path === '/api/info')
    const list = requestIndex(fake, 'GET', '/api/integration', restarted)
    assert.ok(list >= 0 && requestIndex(fake, 'POST', '/api/integration/claude-agent/connect/external', restarted) > list)
  } finally { await bridge.stop() }
})

test('API key and browser sign-ins on a fresh serve: listed first, so connect/key and connect/oauth find their integration', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    assert.deepEqual(await bridge.handle('account/login/start', { type: 'apiKey', apiKey: 'sk-ant-1', codeDesktop: { template: 'anthropic' } }), { type: 'apiKey' })
    assert.deepEqual(fake.state.credentials.map((entry) => [entry.integrationID, entry.value.type]), [['anthropic', 'key']])
    fake.restart()
    const started = await bridge.handle('account/login/start', { type: 'chatgpt' })
    assert.equal(started.authUrl, 'https://auth.openai.com/oauth/authorize?x=1')
    await bridge.handle('account/login/cancel', { loginId: started.loginId })
    assert.equal(completed(notes).length, 0)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('Claude: an integration the list does not have (plugin removed by a config "plugins" op, or hidden by an integration.connect deny) is refused before anything is connected, naming both causes', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    fake.state.integrations = fake.state.integrations.filter((entry) => entry.id !== 'claude-agent')
    const refused = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }).then(() => null, (error) => error)
    assert.match(String(refused?.message), /claude-agent provider is missing or turned off/)
    assert.match(String(refused?.message), /removed by a "plugins" entry such as "-\*" or "-opencode\.provider\.claude-agent" in an OpenCode config/)
    assert.match(String(refused?.message), /or denied by an integration\.connect policy/)
    assert.equal(requestIndex(fake, 'POST', '/api/integration/claude-agent/connect/external'), -1)
  } finally { await bridge.stop() }
})

test('Claude: a user\'s global "plugins": ["-*"] (claude-agent\'s plugin is not guarded) is refused before anything is connected, naming the plugins entry', async () => {
  const { bridge, fake, home } = await v2Bridge()
  try {
    fake.state.configEntries = [{ type: 'document', path: path.join(home, 'xdg', 'opencode', 'opencode.json'), info: { plugins: ['-*'] } }]
    await assert.rejects(bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }), /missing or turned off \(removed by a "plugins" entry such as "-\*"/)
    assert.equal(requestIndex(fake, 'POST', '/api/integration/claude-agent/connect/external'), -1)
    assert.equal(fake.state.credentials.length, 0)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})
