// OpenCode 2.x bridge, phase 7: sign-ins through the in-process v2 fake — account/read from integrations (needs_auth,
// checking, the free tier, keys from env and config), the credential fallback, API keys (create, then delete the old
// one), OAuth / device-code attempts (method ids, Copilot's answer, pending → complete / failed / expired / 404,
// cancel, a pasted code), the Claude Code sign-in (prechecks, then its 120 s watch on fake time), sign-out, the debounced
// account/updated; and v2/claude.js (finding claude, serve's env, its version and sign-in) with a fake exec.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { ClaudeCode, anthropicEnvIn, parseAuthStatus, parseLoginExpiry, versionAtLeast, knownClaudePaths } from '../packages/opencode-bridge/src/v2/claude.js'
import { CLAUDE_EXPIRED, CLAUDE_LOGOUT_NOTICE, CLAUDE_TIMEOUT, claudeReasonOfMessage, oauthAnswer, oauthMethodFor, watchLogin } from '../packages/opencode-bridge/src/v2/account.js'
import { createV2Fake } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-account-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const CLAUDE = '/opt/homebrew/bin/claude'
const SIGNED_IN = JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'me@example.com', orgName: 'Me', subscriptionType: 'max' })
const SIGNED_OUT = JSON.stringify({ loggedIn: false, authMethod: 'none', apiProvider: 'firstParty' })

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough()
  child.pid = 4321; child.exitCode = null
  child.kill = (signal) => { setImmediate(() => { if (child.exitCode === null) { child.exitCode = -1; child.emit('exit', null, signal) } }); return true }
  child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
  setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
  return child
}

const until = async (condition, what = 'condition', ms = 5000) => {
  const end = Date.now() + ms
  while (!condition()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

/**
 * A ClaudeCode on a fake machine: `files` are the executables there, `heads` their first lines, `answers` what each
 * command prints ({shell, version, status}); `calls` records every command.
 */
function fakeClaude({ files = [CLAUDE], heads = {}, answers = {}, env = {}, configured = null } = {}) {
  const calls = []
  const exec = (command, args, options, callback) => {
    calls.push({ command, args, env: options.env })
    const key = args[0] === '-lc' ? 'shell' : args[0] === '--version' ? 'version' : args.join(' ') === 'auth status --json' ? 'status' : 'other'
    const answer = typeof answers[key] === 'function' ? answers[key]() : answers[key]
    setImmediate(() => answer instanceof Error ? callback(answer, '', '') : callback(answer?.code ? Object.assign(new Error('exit'), { code: answer.code }) : null, answer?.stdout ?? answer ?? '', ''))
  }
  // `claude auth login`: a fake child printing the manual link (answers.login: {url, exitCode, onCode}), never a real process.
  const logins = []
  const spawn = (command, args, options) => {
    const child = new EventEmitter()
    child.exitCode = null; child.signalCode = null
    child.stdout = new PassThrough(); child.stderr = new PassThrough()
    const typed = []
    child.stdin = { write: (text) => { typed.push(text); answers.login?.onCode?.(child, text) } }
    child.kill = (signal) => { child.signalCode = signal; setImmediate(() => child.emit('exit', null, signal)); return true }
    child.finish = (code) => { child.exitCode = code; child.emit('exit', code, null) }
    logins.push({ command, args, env: options.env, child, typed })
    setImmediate(() => { if (answers.login?.url) child.stdout.write(`Opening browser to sign in…\nIf the browser didn't open, visit: ${answers.login.url}\nPaste code here if prompted > `); if (answers.login?.exitCode !== undefined) setImmediate(() => child.finish(answers.login.exitCode)) })
    return child
  }
  const claude = new ClaudeCode({
    env: { HOME: '/Users/me', SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...env }, exec, spawn, configured: () => configured,
    executable: (file) => files.includes(file), readHead: (file) => heads[file] ?? '\xcf\xfa\xed\xfe',
  })
  return { claude, calls, logins }
}

/** Fake time for watchLogin: each wait moves the clock (and runs onTick) at once. */
function fakeClock(onTick = () => {}) {
  const clock = { t: 0, waits: 0, now: () => clock.t, wait: async (ms) => { clock.t += ms; clock.waits++; onTick(clock.t); await new Promise((resolve) => setImmediate(resolve)) } }
  return clock
}

const CLAUDE_INTEGRATION = { id: 'claude-agent', name: 'Claude Agent', methods: [{ id: 'claude-login', type: 'external', label: 'Claude Code login (claude auth login)' }] }
const COPILOT_FORM = [
  { type: 'string', key: 'deploymentType', required: true, options: [{ label: 'GitHub.com', value: 'github.com' }, { label: 'GitHub Enterprise', value: 'enterprise' }] },
  { type: 'string', key: 'enterpriseUrl', required: true, when: [{ key: 'deploymentType', op: 'eq', value: 'enterprise' }] },
]
const INTEGRATIONS = () => [
  { id: 'openai', name: 'OpenAI', methods: [
    { type: 'oauth', id: 'chatgpt-token-sharing', label: 'Sign in with ChatGPT', attempt: { url: 'https://auth.openai.com/oauth/authorize?x=1' } },
    { type: 'oauth', id: 'chatgpt-browser', label: 'Codex browser (legacy)' },
    { type: 'oauth', id: 'chatgpt-headless', label: 'Codex device code (legacy)', attempt: { url: 'https://auth.openai.com/codex/device', instructions: 'Enter code: AAAA-BBBB' } },
    { type: 'key' }, { type: 'env', names: ['OPENAI_API_KEY'] }] },
  { id: 'github-copilot', name: 'GitHub Copilot', methods: [{ type: 'oauth', id: 'device', label: 'Login with GitHub Copilot', form: COPILOT_FORM, attempt: { url: 'https://github.com/login/device', instructions: 'Enter code: 1234-ABCD' } }, { type: 'env', names: ['GITHUB_TOKEN'] }] },
  { id: 'anthropic', name: 'Anthropic', methods: [{ type: 'key' }, { type: 'env', names: ['ANTHROPIC_API_KEY'] }] },
  { id: 'openrouter', name: 'OpenRouter', methods: [{ type: 'key' }, { type: 'env', names: ['OPENROUTER_API_KEY'] }] },
  { id: 'opencode', name: 'OpenCode Console', methods: [{ type: 'oauth', id: 'device', label: 'OpenCode Console account' }, { type: 'key' }] },
  { id: 'mcp_0123456789abcdef', name: 'Linear', metadata: { source: 'mcp' }, methods: [{ type: 'oauth', id: 'mcp_0123456789abcdef', label: 'Linear' }] },
  { ...CLAUDE_INTEGRATION },
]
const ZEN = { id: 'opencode', name: 'OpenCode Zen', activation: 'enabled', package: 'aisdk:@ai-sdk/openai-compatible', settings: { apiKey: 'public' } }
const CLAUDE_MODEL = { id: 'opus', providerID: 'claude-agent', name: 'Opus', capabilities: { tools: true, input: ['text', 'image', 'pdf'], output: ['text'] }, variants: [{ id: 'high' }], cost: [], limit: { context: 200000, output: 0 }, enabled: true }

/** A started v2 Bridge on the fake (its event stream open), with a fake Claude Code; notifications and log collected. */
async function v2Bridge({ claude = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.311 (Claude Code)\n', status: SIGNED_IN } }), env = {} } = {}) {
  const fake = createV2Fake({ cwd: '/home' })
  fake.state.integrations = INTEGRATIONS()
  fake.state.providers = [ZEN]
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...env }, input: new PassThrough(), output: new PassThrough() })
  const spawns = []
  bridge.v2.fetch = fake.fetch
  bridge.v2.spawn = (command, args, options) => { spawns.push(options.env); fake.serve(options.env); fake.restart(); return fakeChild() }
  bridge.v2.claude = claude.claude
  bridge.v2.accountTiming = { debounceMs: 5 }
  const clock = fakeClock()
  bridge.v2.clock = clock
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  return { bridge, fake, home, notes, logs, spawns, clock, calls: claude.calls }
}

const requests = (fake, method, pathname, from = 0) => fake.state.requests.slice(from).filter((request) => request.method === method && (pathname instanceof RegExp ? pathname.test(request.path) : request.path === pathname))
const completed = (notes) => notes.filter((note) => note.method === 'account/login/completed')

// ---------------------------------------------------------------- v2/claude.js

test('claude: versions, auth status JSON, ANTHROPIC_* and the installers\' places', () => {
  assert.equal(versionAtLeast('2.1.311'), true)
  assert.equal(versionAtLeast('2.1.248'), true)
  assert.equal(versionAtLeast('2.1.247'), false)
  assert.equal(versionAtLeast('2.1.248-beta.1'), true, 'a pre-release suffix is ignored, as claude/probe.ts does')
  assert.equal(versionAtLeast('1.9.999'), false)
  assert.equal(versionAtLeast('3.0.0'), true)
  assert.deepEqual(parseAuthStatus(SIGNED_IN), { loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'me@example.com', orgName: 'Me', subscriptionType: 'max', loginExpiresAt: null })
  assert.equal(parseAuthStatus(SIGNED_OUT).loggedIn, false)
  assert.deepEqual(parseAuthStatus('Not logged in'), { loggedIn: null })
  assert.deepEqual(anthropicEnvIn({ ANTHROPIC_API_KEY: 'sk-ant-x', ANTHROPIC_BASE_URL: ' ', OTHER: '1' }), ['ANTHROPIC_API_KEY'])
  assert.deepEqual(knownClaudePaths('/Users/me').slice(0, 3), ['/Users/me/.local/bin/claude', '/Users/me/.claude/local/claude', '/opt/homebrew/bin/claude'])
})

test('claude: the setting wins, then an exported OPENCODE_CLAUDE_PATH, then the login shell, then the known places', async () => {
  const setting = fakeClaude({ files: ['/custom/claude', CLAUDE], configured: '/custom/claude', answers: { shell: `${CLAUDE}\n` } })
  assert.deepEqual(await setting.claude.locate(), { path: '/custom/claude', source: 'setting', node: null })
  assert.equal(setting.calls.length, 0, 'a native claude chosen by the user needs no shell')

  const exported = fakeClaude({ files: ['/env/claude', CLAUDE], env: { OPENCODE_CLAUDE_PATH: '/env/claude' } })
  assert.equal((await exported.claude.locate()).source, 'env')

  // A shell function (`claude () {…}`) prints no path: the last absolute line that names claude counts.
  const shell = fakeClaude({ files: ['/Users/me/.local/bin/claude', '/opt/nvm/bin/claude', '/opt/nvm/bin/node'], heads: { '/opt/nvm/bin/claude': '#!/usr/bin/env node\n' }, answers: { shell: 'claude\nmotd text\n/opt/nvm/bin/claude\n/opt/nvm/bin/node\n' } })
  const found = await shell.claude.locate()
  assert.deepEqual(found, { path: '/opt/nvm/bin/claude', source: 'shell', node: '/opt/nvm/bin/node' })
  assert.deepEqual(shell.calls[0].args, ['-lc', 'command -v claude; command -v node'])
  assert.deepEqual(await shell.claude.locate(), found, 'cached')
  assert.equal(shell.calls.length, 1)

  const known = fakeClaude({ files: ['/Users/me/.local/bin/claude'], answers: { shell: new Error('EPERM') } })
  assert.equal((await known.claude.locate()).path, '/Users/me/.local/bin/claude')
  const none = fakeClaude({ files: [], answers: { shell: '' } })
  assert.equal(await none.claude.locate(), null)
  assert.deepEqual(none.claude.serveEnv(null), {}, 'nothing found: v2 reports "not installed" itself')
})

test('claude: serve gets OPENCODE_CLAUDE_PATH and claude\'s folder (and an npm install\'s node folder) first on PATH', async () => {
  const npm = fakeClaude({ files: ['/Users/me/.npm-global/bin/claude', '/opt/homebrew/bin/node'], heads: { '/Users/me/.npm-global/bin/claude': '#!/usr/bin/env node\n' }, answers: { shell: '' } })
  const found = await npm.claude.locate()
  assert.equal(found.node, '/opt/homebrew/bin/node')
  assert.deepEqual(npm.claude.serveEnv(found, '/usr/bin:/opt/homebrew/bin:/bin'), {
    OPENCODE_CLAUDE_PATH: '/Users/me/.npm-global/bin/claude',
    PATH: '/Users/me/.npm-global/bin:/opt/homebrew/bin:/usr/bin:/bin',
  })
})

test('claude: --version and auth status are run with serve\'s PATH and cached (version per file, status a minute)', async () => {
  let status = SIGNED_IN
  const { claude, calls } = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.200 (Claude Code)\n', status: () => status } })
  const found = await claude.locate()
  const fakeStat = fs.statSync
  // The cache keys on mtime: a file that isn't there (this fake path) is never cached, so stat a real one in its place.
  fs.statSync = (file, ...rest) => (file === CLAUDE ? { mtimeMs: 1 } : fakeStat(file, ...rest))
  try {
    assert.deepEqual(await claude.version(found), { version: '2.1.200', tooOld: true })
    await claude.version(found)
    assert.equal(calls.filter((call) => call.args[0] === '--version').length, 1)
  } finally { fs.statSync = fakeStat }
  assert.ok(calls.find((call) => call.args[0] === '--version').env.PATH.startsWith('/opt/homebrew/bin:'))
  assert.equal((await claude.authStatus()).loggedIn, true)
  status = SIGNED_OUT
  assert.equal((await claude.authStatus()).loggedIn, true, 'cached')
  assert.equal((await claude.authStatus({ fresh: true })).loggedIn, false)
})

// ---------------------------------------------------------------- pure helpers

test('OAuth methods by id: ChatGPT is token sharing only; Copilot\'s answer; another provider by its method names', () => {
  const [openai, copilot] = INTEGRATIONS()
  assert.equal(oauthMethodFor(openai, false).id, 'chatgpt-token-sharing')
  assert.equal(oauthMethodFor(openai, true), null, 'no legacy device-code ChatGPT sign-in')
  assert.equal(oauthMethodFor(copilot, true).id, 'device')
  assert.equal(oauthMethodFor(copilot, false), null)
  const other = { id: 'gitlab', methods: [{ type: 'oauth', id: 'browser', label: 'Login with GitLab (OAuth)' }, { type: 'oauth', id: 'pat-device', label: 'Device' }] }
  assert.equal(oauthMethodFor(other, false).id, 'browser')
  assert.equal(oauthMethodFor(other, true).id, 'pat-device')
  // Required choice without a default → its first option; inactive fields are never sent; unknown inputs are dropped.
  assert.deepEqual(oauthAnswer(COPILOT_FORM, {}), { deploymentType: 'github.com' })
  assert.deepEqual(oauthAnswer(COPILOT_FORM, { enterpriseUrl: 'x.ghe.com', bogus: '1' }), { deploymentType: 'github.com' })
  assert.deepEqual(oauthAnswer(COPILOT_FORM, { deploymentType: 'enterprise', enterpriseUrl: 'x.ghe.com' }), { deploymentType: 'enterprise', enterpriseUrl: 'x.ghe.com' })
  assert.deepEqual(oauthAnswer(undefined, { a: 'b' }), {})
})

test('watchLogin on fake time: a timeout, a wake, a cancel', async () => {
  const clock = fakeClock()
  const timedOut = await watchLogin({ check: async () => ({ done: false }), timeoutMs: 120000, pollMs: 1000, clock })
  assert.deepEqual(timedOut, { success: false, timedOut: true, error: null })
  assert.equal(clock.t, 120000)
  assert.equal(clock.waits, 120)
  let n = 0
  const done = await watchLogin({ check: async () => (++n === 3 ? { done: true, success: true } : { done: false }), timeoutMs: 120000, pollMs: 1000, clock: fakeClock() })
  assert.deepEqual(done, { success: true, error: null })
  const controller = new AbortController()
  const cancelled = watchLogin({ check: async () => ({ done: false }), timeoutMs: 120000, pollMs: 60000, signal: controller.signal })
  controller.abort()
  assert.deepEqual(await cancelled, { success: false, cancelled: true })
  // A wake ends a real wait at once.
  const wakes = new Set()
  let checks = 0
  const woken = watchLogin({ check: async () => (++checks === 2 ? { done: true, success: true } : { done: false }), timeoutMs: 120000, pollMs: 60000, wakes })
  await until(() => wakes.size === 1, 'the wait')
  for (const wake of [...wakes]) wake()
  assert.deepEqual(await woken, { success: true, error: null })
})

// ---------------------------------------------------------------- account/read

test('account/read: connections[0] per integration, needs_auth listed but not signed in, the free tier, config and env keys; no MCP', async () => {
  const { bridge, fake, calls } = await v2Bridge()
  try {
    const credential = (integrationID, value, active = true) => fake.state.credentials.push({ id: `crd_${fake.state.credentials.length + 1}`, integrationID, label: integrationID, active, value })
    credential('openai', { type: 'oauth', methodID: 'chatgpt-token-sharing', access: 'secret-a', refresh: 'secret-r', expires: 1 }, false)
    credential('openai', { type: 'oauth', methodID: 'chatgpt-token-sharing', access: 'secret-a2', refresh: 'secret-r2', expires: 1 })
    credential('mcp_0123456789abcdef', { type: 'oauth', methodID: 'mcp_0123456789abcdef', access: 'm', refresh: '', expires: 1 })
    credential('claude-agent', { type: 'external', methodID: 'claude-login' })
    fake.state.statuses.set('crd_4', { status: 'needs_auth', message: 'Claude Code is not logged in. Run `claude auth login` in a terminal.' })
    fake.state.integrations.find((entry) => entry.id === 'anthropic').env = ['ANTHROPIC_API_KEY']
    fake.state.providers.push({ id: 'my-gw', name: 'My gateway', activation: 'enabled', package: 'aisdk:@ai-sdk/openai-compatible', settings: { apiKey: 'sk-config' } }, { id: 'ollama', name: 'Ollama', activation: 'enabled', package: 'aisdk:x' })
    const read = await bridge.handle('account/read', {})
    const providers = read.opencode.providers
    assert.deepEqual(providers.map((entry) => [entry.id, entry.auth]), [['openai', 'oauth'], ['anthropic', 'env'], ['claude-agent', 'external'], ['my-gw', 'config'], ['ollama', 'none']])
    assert.equal(providers[0].accounts, 2)
    assert.equal(providers[0].removable, true)
    assert.equal(providers[1].removable, false)
    assert.equal(providers[2].needsAuth, true)
    assert.match(providers[2].statusMessage, /claude auth login/)
    assert.deepEqual(read.account, { type: 'chatgpt', email: null, planType: 'ChatGPT Pro/Plus' }, 'Claude, needing a sign-in, is not part of it')
    assert.equal(read.opencode.login.signedIn, true)
    // OpenCode Zen stays a free tier while integration `opencode` has no connection.
    assert.deepEqual(read.opencode.freeTier, { provider: 'opencode', name: 'OpenCode Zen' })
    assert.doesNotMatch(JSON.stringify(read), /secret-/)
    assert.equal(calls.filter((call) => call.args[0] === 'auth').length, 1, 'claude auth status asked once (cached)')
  } finally { await bridge.stop() }
})

test('account/read: OpenCode Zen\'s free tier when nothing is signed in, and no secret ever leaves the bridge', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    const read = await bridge.handle('account/read', {})
    assert.equal(read.account, null)
    assert.equal(read.requiresOpenaiAuth, false)
    assert.deepEqual(read.opencode.freeTier, { provider: 'opencode', name: 'OpenCode Zen' })
    assert.deepEqual(read.opencode.engine, { api: 'v2', binary: '/opt/opencode', version: '2.2.5' })
    fake.state.credentials.push({ id: 'crd_k', integrationID: 'openrouter', label: 'OpenRouter', active: true, value: { type: 'key', key: 'sk-or-secret' } })
    const keyed = await bridge.handle('account/read', {})
    assert.deepEqual(keyed.account, { type: 'apiKey' })
    assert.doesNotMatch(JSON.stringify(keyed), /sk-or-secret/)
    const integration = requests(fake, 'GET', '/api/integration').at(-1)
    assert.equal(new URL(integration.url).searchParams.get('location[directory]'), bridge.homeDir())
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('account/read for Claude: checking while there are no models, too old, signed out per claude, billed by ANTHROPIC_API_KEY; email and plan', async () => {
  const run = async ({ version = '2.1.311 (Claude Code)\n', status = SIGNED_IN, models = [], env = {} } = {}) => {
    const claude = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version, status }, env })
    const { bridge, fake } = await v2Bridge({ claude })
    fake.state.credentials.push({ id: 'crd_c', integrationID: 'claude-agent', label: 'Claude Agent', active: true, value: { type: 'external', methodID: 'claude-login' } })
    fake.state.models = models
    const fakeStat = fs.statSync
    fs.statSync = (file, ...rest) => (file === CLAUDE ? { mtimeMs: 1 } : fakeStat(file, ...rest))
    try { return await bridge.handle('account/read', {}) } finally { fs.statSync = fakeStat; await bridge.stop() }
  }
  const checking = await run()
  const entry = checking.opencode.providers.find((provider) => provider.id === 'claude-agent')
  assert.equal(entry.checking, true)
  assert.equal(entry.needsAuth, undefined)
  assert.deepEqual(checking.account, { type: 'chatgpt', email: 'me@example.com', planType: 'Claude (Claude Code login)' })
  assert.equal(entry.plan, 'max')
  assert.equal(entry.claudeVersion, '2.1.311')

  const ready = await run({ models: [CLAUDE_MODEL] })
  assert.equal(ready.opencode.providers.find((provider) => provider.id === 'claude-agent').checking, undefined)

  const old = await run({ version: '2.1.100 (Claude Code)\n', models: [CLAUDE_MODEL] })
  const oldEntry = old.opencode.providers.find((provider) => provider.id === 'claude-agent')
  assert.equal(oldEntry.needsAuth, true)
  assert.match(oldEntry.statusMessage, /2\.1\.100 is too old; 2\.1\.248 or later is required\. Run `claude update`/)
  assert.equal(old.account, null)

  const out = await run({ status: SIGNED_OUT, models: [CLAUDE_MODEL] })
  assert.equal(out.opencode.providers.find((provider) => provider.id === 'claude-agent').needsAuth, true, 'v2 says nothing while it checks; claude itself says signed out')

  const keyed = await run({ models: [CLAUDE_MODEL], env: { ANTHROPIC_API_KEY: 'sk-ant-x' } })
  const keyedEntry = keyed.opencode.providers.find((provider) => provider.id === 'claude-agent')
  assert.deepEqual(keyedEntry.anthropicEnv, ['ANTHROPIC_API_KEY'])
  assert.match(keyedEntry.statusMessage, /ANTHROPIC_API_KEY is set: Claude Code uses that key, billed per token/)
  assert.equal(keyedEntry.needsAuth, undefined)
})

test('account/read: a failed integration list reads the stored credentials (secrets dropped) as unknown, then account/updated', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    fake.state.credentials.push({ id: 'crd_o', integrationID: 'openai', label: 'OpenAI', active: true, value: { type: 'oauth', methodID: 'x', access: 'secret-access', refresh: 'secret-refresh', expires: 1 } },
      { id: 'crd_m', integrationID: 'mcp_0123456789abcdef', label: 'Linear', active: true, value: { type: 'oauth', methodID: 'x', access: 'a', refresh: '', expires: 1 } })
    fake.state.failIntegrationList = 2
    const cold = await bridge.handle('account/read', {})
    assert.equal(cold.opencode.unknown, true)
    assert.equal(cold.requiresOpenaiAuth, false)
    assert.deepEqual(cold.opencode.providers, [{ id: 'openai', name: 'ChatGPT Pro/Plus', auth: 'oauth', removable: true }])
    assert.deepEqual(cold.account, { type: 'chatgpt', email: null, planType: 'ChatGPT Pro/Plus' })
    assert.doesNotMatch(JSON.stringify(cold), /secret/)
    await until(() => notes.some((note) => note.method === 'account/updated'), 'account/updated after the list answers')
    assert.equal((await bridge.handle('account/read', {})).opencode.unknown, false)
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- API keys

test('API key: connect/key, then the integration\'s older key deleted; a refused key never shows its text', async () => {
  const { bridge, fake, notes, logs } = await v2Bridge()
  try {
    fake.state.credentials.push({ id: 'crd_old', integrationID: 'anthropic', label: 'Anthropic', active: true, value: { type: 'key', key: 'sk-ant-old' } })
    assert.deepEqual(await bridge.handle('account/login/start', { type: 'apiKey', apiKey: ' sk-ant-new ', codeDesktop: { template: 'anthropic' } }), { type: 'apiKey' })
    const [connect] = requests(fake, 'POST', '/api/integration/anthropic/connect/key')
    assert.deepEqual(connect.body, { key: 'sk-ant-new' })
    assert.deepEqual(fake.state.credentials.filter((entry) => entry.integrationID === 'anthropic').map((entry) => [entry.value.key, entry.active]), [['sk-ant-new', true]])
    assert.ok(notes.some((note) => note.method === 'account/updated'))
    await assert.rejects(bridge.handle('account/login/start', { type: 'apiKey', apiKey: 'k', codeDesktop: { template: 'github-copilot' } }), /no API key sign-in for github-copilot/)
    await assert.rejects(bridge.handle('account/login/start', { type: 'apiKey', apiKey: 'k', codeDesktop: { template: 'nope' } }), /no API key sign-in for nope/)
    // A key v2 refuses: neither the error nor the log quotes it.
    const realFetch = bridge.server.fetch
    bridge.server.fetch = async (url, init) => (String(url).includes('/connect/key') ? new Response(JSON.stringify({ _tag: 'InvalidRequestError', message: 'bad key sk-or-leak', kind: 'integration_policy' }), { status: 400 }) : realFetch(url, init))
    const error = await bridge.handle('account/login/start', { type: 'apiKey', apiKey: 'sk-or-leak', codeDesktop: { template: 'openrouter' } }).catch((failure) => failure)
    assert.match(error.message, /didn’t save the key \(400 InvalidRequestError\)/)
    assert.doesNotMatch(error.message, /sk-or-leak/)
    bridge.server.fetch = realFetch
    void logs
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- OAuth / device code

test('ChatGPT: token sharing, polled until complete; the older OAuth sign-in deleted; a device code is refused', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    fake.state.credentials.push({ id: 'crd_legacy', integrationID: 'openai', label: 'OpenAI', active: true, value: { type: 'oauth', methodID: 'chatgpt-browser', access: 'a', refresh: 'r', expires: 1 } })
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'openai' } })
    assert.equal(start.type, 'chatgpt')
    assert.equal(start.authUrl, 'https://auth.openai.com/oauth/authorize?x=1')
    const [connect] = requests(fake, 'POST', '/api/integration/openai/connect/oauth')
    assert.deepEqual(connect.body, { methodID: 'chatgpt-token-sharing' })
    const [attemptID] = [...fake.state.attempts.keys()]
    await until(() => requests(fake, 'GET', `/api/integration/openai/connect/oauth/${attemptID}`).length >= 2, 'polling')
    assert.equal(completed(notes).length, 0, 'pending')
    fake.settle(attemptID, 'complete')
    await until(() => completed(notes).length === 1, 'completed')
    assert.deepEqual(completed(notes)[0].params, { loginId: start.loginId, success: true, error: null })
    assert.deepEqual(fake.state.credentials.filter((entry) => entry.integrationID === 'openai').map((entry) => entry.value.methodID), ['chatgpt-token-sharing'])
    assert.ok(notes.some((note) => note.method === 'account/updated'))
    await assert.rejects(bridge.handle('account/login/start', { type: 'chatgptDeviceCode', codeDesktop: { provider: 'openai' } }), /no device-code sign-in .*\(2\.x signs in to ChatGPT in the browser only\); use the browser sign-in/)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('GitHub Copilot: the device code with deploymentType github.com; failed, expired and a vanished attempt', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const outcome = async (finish) => {
      const from = completed(notes).length
      const start = await bridge.handle('account/login/start', { type: 'chatgptDeviceCode', codeDesktop: { provider: 'github-copilot' } })
      const attemptID = [...fake.state.attempts.keys()].at(-1)
      finish(attemptID)
      await until(() => completed(notes).length > from, 'completed')
      return { start, done: completed(notes).at(-1).params }
    }
    const failed = await outcome((id) => fake.settle(id, 'failed', 'access_denied'))
    assert.deepEqual([failed.start.type, failed.start.verificationUrl, failed.start.userCode], ['chatgptDeviceCode', 'https://github.com/login/device', '1234-ABCD'])
    assert.deepEqual(requests(fake, 'POST', '/api/integration/github-copilot/connect/oauth')[0].body, { methodID: 'device', answer: { deploymentType: 'github.com' } })
    assert.deepEqual([failed.done.success, failed.done.error], [false, 'access_denied'])
    const expired = await outcome((id) => fake.settle(id, 'expired'))
    assert.deepEqual([expired.done.success, expired.done.error], [false, 'Sign-in timed out.'])
    // Gone (a minute after it ended) with a new credential: it succeeded.
    const vanished = await outcome((id) => { fake.settle(id, 'complete'); fake.forget(id) })
    assert.equal(vanished.done.success, true)
    const lost = await outcome((id) => fake.forget(id))
    assert.deepEqual([lost.done.success, lost.done.error], [false, 'The sign-in ended before it finished. Try again.'])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('a sign-in cancelled: the attempt is deleted and nothing completes; a code attempt takes the pasted code (the older OAuth sign-in deleted)', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'openai' } })
    const attemptID = [...fake.state.attempts.keys()].at(-1)
    assert.deepEqual(await bridge.handle('account/login/cancel', { loginId: start.loginId }), { status: 'canceled' })
    await until(() => (fake.state.cancelledAttempts ?? []).includes(attemptID), 'DELETE of the attempt')
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(completed(notes).length, 0)

    fake.state.integrations.push({ id: 'acme', name: 'Acme', methods: [{ type: 'oauth', id: 'browser', label: 'Acme login', attempt: { url: 'https://acme.example/login', mode: 'code' } }] })
    fake.state.onCode = (attempt, code) => code === 'GOOD'
    fake.state.credentials.push({ id: 'crd_acme_old', integrationID: 'acme', label: 'Acme', active: true, value: { type: 'oauth', methodID: 'browser', access: 'a', refresh: 'r', expires: 1 } })
    const coded = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'acme' } })
    assert.equal(coded.codeDesktop.acceptsCode, true)
    await assert.rejects(bridge.handle('codeDesktop/login/code', { loginId: coded.loginId, code: 'BAD' }), /That code didn’t work/)
    assert.deepEqual(await bridge.handle('codeDesktop/login/code', { loginId: coded.loginId, code: 'GOOD' }), { status: 'completed' })
    assert.deepEqual(completed(notes).at(-1).params, { loginId: coded.loginId, success: true, error: null })
    assert.equal(requests(fake, 'DELETE', '/api/credential/crd_acme_old').length, 1)
    assert.deepEqual(fake.state.credentials.filter((entry) => entry.integrationID === 'acme').map((entry) => entry.id === 'crd_acme_old'), [false])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- Claude Code

test('Claude: what is known at once is an error with the steps — not installed, too old, a sign-in that can\'t start — and nothing is connected', async () => {
  const cases = [
    [fakeClaude({ files: [], answers: { shell: '' } }), /Install Claude Code first \(https:\/\/code\.claude\.com\/docs\/en\/setup\), then run `claude auth login`/],
    [fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.100 (Claude Code)\n', status: SIGNED_IN } }), /Claude Code 2\.1\.100 is too old; 2\.1\.248 or later is required\. Run `claude update`\./],
    [fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.311 (Claude Code)\n', status: SIGNED_OUT, login: { exitCode: 1 } } }), /Claude Code couldn’t start its sign-in \(claude auth login exited \(1\) before printing a sign-in link\)\. Run `claude auth login` in a terminal/],
  ]
  for (const [claude, message] of cases) {
    const { bridge, fake } = await v2Bridge({ claude })
    try {
      await assert.rejects(bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }), message)
      assert.equal(requests(fake, 'POST', /connect\/external$/).length, 0)
    } finally { await bridge.stop() }
  }
})

test('Claude signed in: answered at once (connecting: nothing to open), then connect/external, old credentials deleted, success once models come with no status', async () => {
  const { bridge, fake, notes, clock, spawns } = await v2Bridge()
  try {
    assert.equal(spawns[0].OPENCODE_CLAUDE_PATH, CLAUDE)
    assert.ok(spawns[0].PATH.startsWith('/opt/homebrew/bin:'), 'claude\'s folder first on serve\'s PATH')
    fake.state.credentials.push({ id: 'crd_stale', integrationID: 'claude-agent', label: 'Claude Agent', active: true, value: { type: 'external', methodID: 'claude-login' } })
    fake.state.statuses.set('crd_stale', { status: 'needs_auth', message: 'Claude Code is not logged in.' })
    // v2's probe: models after ~20 s.
    fake.state.onExternal = () => { const started = clock.t; clock.onModels = () => { if (clock.t - started >= 20000 && !fake.state.models.length) fake.state.models.push(CLAUDE_MODEL) } }
    const tick = clock.wait
    clock.wait = async (ms) => { await tick(ms); clock.onModels?.() }
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.deepEqual(start.codeDesktop, { openedByAgent: true, connecting: true }, 'signed in: nothing to open, the app shows it connecting')
    await until(() => completed(notes).length === 1, 'completed')
    assert.deepEqual(completed(notes)[0].params, { loginId: start.loginId, success: true, error: null })
    assert.deepEqual(requests(fake, 'POST', '/api/integration/claude-agent/connect/external')[0].body, { methodID: 'claude-login' })
    assert.deepEqual(requests(fake, 'DELETE', '/api/credential/crd_stale').length, 1)
    assert.deepEqual(fake.state.credentials.map((entry) => entry.integrationID), ['claude-agent'])
    assert.ok(clock.t >= 20000 && clock.t < 25000, `about 20 s of fake time (${clock.t})`)
    assert.ok(notes.some((note) => note.method === 'account/updated'))
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('Claude signed out: `claude auth login` opens claude.ai, its manual link is the sign-in page, a pasted code goes to it, then OpenCode connects', async () => {
  const URL = 'https://claude.com/cai/oauth/authorize?code=true&client_id=x&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback'
  let status = SIGNED_OUT
  const claude = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.322 (Claude Code)\n', status: () => status, login: { url: URL, onCode: (child, text) => { if (text === 'the-code\n') { status = SIGNED_IN; setImmediate(() => child.finish(0)) } } } } })
  const { bridge, fake, notes } = await v2Bridge({ claude })
  try {
    bridge.v2.clock = undefined
    bridge.v2.accountTiming = { debounceMs: 5, pollMs: 5 }
    fake.state.models.push(CLAUDE_MODEL)
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.equal(start.authUrl, URL, 'the claude.ai sign-in page, not the setup docs')
    assert.deepEqual(start.codeDesktop, { openedByAgent: true, acceptsCode: true })
    assert.deepEqual(claude.logins[0].args, ['auth', 'login', '--claudeai'])
    assert.equal(claude.logins[0].env.OPENCODE_CLAUDE_PATH, CLAUDE, 'run with the PATH serve gets')
    assert.equal(requests(fake, 'POST', /connect\/external$/).length, 0, 'nothing connected before Claude Code is signed in')
    assert.deepEqual(await bridge.handle('codeDesktop/login/code', { loginId: start.loginId, code: 'the-code' }), { status: 'submitted' })
    assert.deepEqual(claude.logins[0].typed, ['the-code\n'])
    await until(() => completed(notes).length === 1, 'completed')
    assert.deepEqual(completed(notes)[0].params, { loginId: start.loginId, success: true, error: null })
    assert.equal(requests(fake, 'POST', '/api/integration/claude-agent/connect/external').length, 1)
  } finally { await bridge.stop() }
})

test('Claude signed out: claude exiting without a sign-in fails it; cancel stops `claude auth login`', async () => {
  const URL = 'https://claude.com/cai/oauth/authorize?x=1'
  const failing = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.322 (Claude Code)\n', status: SIGNED_OUT, login: { url: URL } } })
  const first = await v2Bridge({ claude: failing })
  try {
    const start = await first.bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    failing.logins[0].child.finish(1)
    await until(() => completed(first.notes).length === 1, 'failed')
    assert.equal(completed(first.notes)[0].params.success, false)
    assert.match(completed(first.notes)[0].params.error, /Claude Code’s sign-in didn’t finish/)
    assert.equal(requests(first.fake, 'POST', /connect\/external$/).length, 0)
    await assert.rejects(first.bridge.handle('codeDesktop/login/code', { loginId: start.loginId, code: 'late' }), /already finished/)
  } finally { await first.bridge.stop() }
  const cancelled = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.322 (Claude Code)\n', status: SIGNED_OUT, login: { url: URL } } })
  const second = await v2Bridge({ claude: cancelled })
  try {
    const start = await second.bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.deepEqual(await second.bridge.handle('account/login/cancel', { loginId: start.loginId }), { status: 'canceled' })
    assert.equal(cancelled.logins[0].child.signalCode, 'SIGTERM', 'claude auth login stopped')
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(completed(second.notes).length, 0)
  } finally { await second.bridge.stop() }
})

test('Claude: a needs_auth status fails it with v2\'s message; 120 s without an answer times out (fake time)', async () => {
  const { bridge, fake, notes, clock } = await v2Bridge()
  try {
    fake.state.onExternal = (id, entry) => setImmediate(() => fake.setStatus(entry.id, { status: 'needs_auth', message: 'Claude Code is not installed. Install it, then run `claude auth login`.', url: 'https://code.claude.com/docs/en/setup' }))
    await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    await until(() => completed(notes).length === 1, 'failed')
    assert.deepEqual([completed(notes)[0].params.success, completed(notes)[0].params.error], [false, 'Claude Code is not installed. Install it, then run `claude auth login`.'])
    assert.equal(fake.state.credentials.length, 1, 'the new connection stays (account/read shows why it needs a sign-in)')

    fake.state.onExternal = null
    const before = clock.t
    await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    await until(() => completed(notes).length === 2, 'timed out')
    assert.deepEqual([completed(notes)[1].params.success, completed(notes)[1].params.error], [false, CLAUDE_TIMEOUT])
    assert.equal(clock.t - before, 120000)
  } finally { await bridge.stop() }
})

test('Claude: models prove nothing until v2\'s own check had time (kept from before, or its saved list on connecting), unless claude said signed in', async () => {
  const unknown = fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.311 (Claude Code)\n', status: 'not json' } })
  const { bridge, fake, notes, clock } = await v2Bridge({ claude: unknown })
  try {
    fake.state.models = [CLAUDE_MODEL]
    // v2's probe finds the user signed out after 30 s.
    fake.state.onExternal = (id, entry) => { const started = clock.t; clock.onTick = () => { if (clock.t - started >= 30000 && !fake.state.statuses.has(entry.id)) fake.setStatus(entry.id, { status: 'needs_auth', message: 'Claude Code is not logged in. Run `claude auth login` in a terminal.' }) } }
    const tick = clock.wait
    clock.wait = async (ms) => { await tick(ms); clock.onTick?.() }
    await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    await until(() => completed(notes).length === 1, 'completed')
    assert.equal(completed(notes)[0].params.success, false)
    assert.match(completed(notes)[0].params.error, /not logged in/)
  } finally { await bridge.stop() }

  // No connection before (signed out here): v2 lists its saved Claude models as soon as one is made, its probe fails later.
  const fresh = await v2Bridge({ claude: fakeClaude({ answers: { shell: `${CLAUDE}\n`, version: '2.1.311 (Claude Code)\n', status: 'not json' } }) })
  try {
    const { fake: f, clock: c } = fresh
    f.state.onExternal = (id, entry) => {
      f.state.models = [CLAUDE_MODEL]
      const started = c.t
      c.onTick = () => { if (c.t - started >= 30000 && !f.state.statuses.has(entry.id)) f.setStatus(entry.id, { status: 'needs_auth', message: 'Claude did not start within 30 seconds.' }) }
    }
    const tick = c.wait
    c.wait = async (ms) => { await tick(ms); c.onTick?.() }
    await fresh.bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    await until(() => completed(fresh.notes).length === 1, 'completed')
    assert.deepEqual([completed(fresh.notes)[0].params.success, completed(fresh.notes)[0].params.error], [false, 'Claude did not start within 30 seconds.'])
  } finally { await fresh.bridge.stop() }

  const signed = await v2Bridge()
  try {
    signed.fake.state.models = [CLAUDE_MODEL]
    await signed.bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    await until(() => completed(signed.notes).length === 1, 'completed')
    assert.equal(completed(signed.notes)[0].params.success, true)
    assert.equal(signed.clock.t, 0, 'claude auth status said signed in: no wait')
  } finally { await signed.bridge.stop() }
})

test('Claude: cancel stops the watch with no completion; no claude-agent integration (turned off) is an error', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    bridge.v2.clock = undefined
    bridge.v2.accountTiming = { debounceMs: 5, pollMs: 20 }
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    await until(() => requests(fake, 'GET', '/api/model').length >= 2, 'watching')
    assert.deepEqual(await bridge.handle('account/login/cancel', { loginId: start.loginId }), { status: 'canceled' })
    const polled = requests(fake, 'GET', '/api/integration/claude-agent').length
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.ok(requests(fake, 'GET', '/api/integration/claude-agent').length <= polled + 1, 'the watch stopped')
    assert.equal(completed(notes).length, 0)
    fake.state.integrations = fake.state.integrations.filter((entry) => entry.id !== 'claude-agent')
    await assert.rejects(bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }), /claude-agent provider is missing or turned off/)
  } finally { await bridge.stop() }
})

test('Claude installed after serve started: the sign-in restarts the idle server with OPENCODE_CLAUDE_PATH', async () => {
  let installed = false
  const claude = fakeClaude({ answers: { shell: () => (installed ? `${CLAUDE}\n` : ''), version: '2.1.311 (Claude Code)\n', status: SIGNED_IN }, files: [] })
  const { bridge, spawns, notes } = await v2Bridge({ claude })
  try {
    assert.equal(spawns[0].OPENCODE_CLAUDE_PATH, undefined)
    installed = true
    claude.claude.executable = (file) => file === CLAUDE
    await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.equal(spawns.length, 2)
    assert.equal(spawns[1].OPENCODE_CLAUDE_PATH, CLAUDE)
    void notes
  } finally { await bridge.stop() }
})

test('Claude installed after serve started, a chat running (or only its asks pending): refused, serve restarts once nothing runs', async () => {
  for (const running of [{ busy: true, activeTurn: null, pending: new Map() }, { busy: false, activeTurn: null, pending: new Map([['ask', {}]]) }]) {
    let installed = false
    const claude = fakeClaude({ answers: { shell: () => (installed ? `${CLAUDE}\n` : ''), version: '2.1.311 (Claude Code)\n', status: SIGNED_IN }, files: [] })
    const { bridge, fake, spawns } = await v2Bridge({ claude })
    try {
      installed = true
      claude.claude.executable = (file) => file === CLAUDE
      bridge.threads.set('ses_running', running)
      await assert.rejects(bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }), /Claude Code was installed after OpenCode started.*Finish or stop the running chats, then choose Claude again\./)
      assert.equal(spawns.length, 1, 'not restarted under a running chat')
      assert.equal(requests(fake, 'POST', /connect\/external$/).length, 0, 'nothing connected that v2 would call not installed')
      assert.equal(bridge.pendingRestart, true)
      bridge.threads.delete('ses_running')
      bridge.maybePendingReload()
      await until(() => spawns.length === 2 && bridge.v2.claudeServed === CLAUDE, 'the restart')
      assert.equal(spawns[1].OPENCODE_CLAUDE_PATH, CLAUDE)
    } finally { bridge.threads.delete('ses_running'); await bridge.stop() }
  }
})

test('the 1.x API (and MiMo) refuse the Claude sign-in naming the program and its version', async () => {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS.opencode, binary: '/opt/homebrew/bin/opencode', detectedVersion: '1.18.34', stateDir: path.join(home, 'state'), env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
  bridge.api = async () => { throw new Error('no request expected') }
  await assert.rejects(bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }), /Claude login needs OpenCode 2\.2 or later\. This core runs OpenCode 1\.18\.34 \(\/opt\/homebrew\/bin\/opencode\)\./)
  const mimo = new Bridge({ flavor: FLAVORS.mimo, binary: '/x/mimo', version: '0.1.15', stateDir: path.join(home, 'mimo'), env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
  await assert.rejects(mimo.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }), /This core runs MiMo Code 0\.1\.15 \(\/x\/mimo\)/)
  assert.equal(bridge.v2, null)
  assert.equal((await bridge.handle('codeDesktop/diagnostics', {})).api, 'v1')
})

// ---------------------------------------------------------------- sign-out, account/updated

test('account/logout: every credential but connectors\', or one integration; Claude Code itself stays signed in; env keys say where', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    fake.state.credentials.push(
      { id: 'crd_1', integrationID: 'openai', label: 'OpenAI', active: true, value: { type: 'oauth', methodID: 'x', access: 'a', refresh: 'r', expires: 1 } },
      { id: 'crd_2', integrationID: 'claude-agent', label: 'Claude Agent', active: true, value: { type: 'external', methodID: 'claude-login' } },
      { id: 'crd_3', integrationID: 'mcp_0123456789abcdef', label: 'Linear', active: true, value: { type: 'oauth', methodID: 'x', access: 'a', refresh: '', expires: 1 } })
    assert.deepEqual(await bridge.handle('account/logout', { codeDesktop: { provider: 'claude-agent' } }), { codeDesktop: { notice: CLAUDE_LOGOUT_NOTICE } })
    assert.deepEqual(fake.state.credentials.map((entry) => entry.id), ['crd_1', 'crd_3'])
    assert.deepEqual(await bridge.handle('account/logout', {}), {})
    assert.deepEqual(fake.state.credentials.map((entry) => entry.id), ['crd_3'], 'a connector\'s sign-in is not an account')
    assert.ok(notes.some((note) => note.method === 'account/updated'))
    fake.state.integrations.find((entry) => entry.id === 'anthropic').env = ['ANTHROPIC_API_KEY']
    await assert.rejects(bridge.handle('account/logout', {}), /Anthropic reads its key from an environment variable/)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('account/updated: a burst of credential and integration events (a sign-in in the TUI) is one notification; another folder\'s is none', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const count = () => notes.filter((note) => note.method === 'account/updated').length
    fake.emit('credential.updated', {})
    fake.emit('credential.switched', { integrationID: 'openai', credentialID: 'crd_x' })
    fake.emit('integration.updated', {}, { location: { directory: bridge.homeDir() } })
    fake.emit('provider.updated', {})
    await until(() => count() === 1, 'account/updated')
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(count(), 1)
    fake.emit('integration.updated', {}, { location: { directory: '/elsewhere' } })
    fake.emit('model.updated', {})
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(count(), 1)
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- Claude Code's sign-in ending or failing

const CLAUDE_TIME_LIMIT = 'Failed to authenticate: this login reached its time limit and cannot be renewed. Run `claude auth login` to sign in again, or use `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN for unattended jobs'
const signedInUntil = (expires) => JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'me@example.com', orgName: 'Me', subscriptionType: 'max', loginExpiresAt: expires })
// What 2.1.322 printed once its credential was cleared.
const CLEARED = JSON.stringify({ loggedIn: false, authMethod: 'none', apiProvider: 'firstParty', loginExpiresAt: null })

/** A v2 Bridge whose claude-agent connection is in use, and models listed (not checking); `status` is a function. */
async function claudeBridge({ status, version = '2.1.322 (Claude Code)\n', files, login, credentialStatus = null } = {}) {
  const claude = fakeClaude({ files, answers: { shell: files?.length === 0 ? '' : `${CLAUDE}\n`, version, status, login } })
  const setup = await v2Bridge({ claude })
  setup.bridge.v2.accountTiming = { debounceMs: 5 }
  setup.fake.state.credentials.push({ id: 'crd_c', integrationID: 'claude-agent', label: 'Claude Agent', active: true, value: { type: 'external', methodID: 'claude-login' } })
  if (credentialStatus) setup.fake.state.statuses.set('crd_c', credentialStatus)
  setup.fake.state.models = [CLAUDE_MODEL]
  const entry = async () => {
    const fakeStat = fs.statSync
    fs.statSync = (file, ...rest) => (file === CLAUDE ? { mtimeMs: 1 } : fakeStat(file, ...rest))
    try { return (await setup.bridge.handle('account/read', {})).opencode.providers.find((provider) => provider.id === 'claude-agent') } finally { fs.statSync = fakeStat }
  }
  const statusCalls = () => claude.calls.filter((call) => call.args.join(' ') === 'auth status --json').length
  return { ...setup, claude, entry, statusCalls }
}

test('claude: loginExpiresAt as a date string or a number (ms or seconds), else null', () => {
  assert.equal(parseLoginExpiry('2026-12-01T10:00:00.000Z'), Date.UTC(2026, 11, 1, 10))
  assert.equal(parseLoginExpiry('2026-12-01'), Date.UTC(2026, 11, 1))
  assert.equal(parseLoginExpiry(Date.UTC(2026, 11, 1)), Date.UTC(2026, 11, 1))
  assert.equal(parseLoginExpiry(Date.UTC(2026, 11, 1) / 1000), Date.UTC(2026, 11, 1), 'seconds')
  assert.equal(parseLoginExpiry(String(Date.UTC(2026, 11, 1))), Date.UTC(2026, 11, 1))
  for (const value of [null, undefined, '', 'soon', -5, 0, Number.NaN, {}, true]) assert.equal(parseLoginExpiry(value), null, String(value))
  assert.equal(parseAuthStatus(signedInUntil('2026-12-01T10:00:00Z')).loginExpiresAt, Date.UTC(2026, 11, 1, 10))
  assert.equal(parseAuthStatus(CLEARED).loginExpiresAt, null)
  assert.equal(claudeReasonOfMessage('Claude Code is not installed. Install it, then run `claude auth login`.'), 'missing')
  assert.equal(claudeReasonOfMessage('Claude Code 2.1.100 is too old; 2.1.248 or later is required. Run `claude update`.'), 'tooOld')
  assert.equal(claudeReasonOfMessage('Claude Code is not logged in. Run `claude auth login` in a terminal.'), 'signedOut')
  assert.equal(claudeReasonOfMessage(CLAUDE_TIME_LIMIT), 'authFailed')
  assert.equal(claudeReasonOfMessage('spawn EACCES'), null)
})

test('account/read for Claude: loginExpiresAt, an ended sign-in (expired), signed out, too old, missing — each with its signInReason', async () => {
  const future = new Date(Date.now() + 9 * 86400000)
  const live = await claudeBridge({ status: () => signedInUntil(future.toISOString()) })
  try {
    const entry = await live.entry()
    assert.equal(entry.loginExpiresAt, future.toISOString())
    assert.equal(entry.needsAuth, undefined)
    assert.equal(entry.signInReason, undefined)
    assert.ok(live.bridge.v2.claudeExpiryTimer, 'its end is watched')
  } finally { await live.bridge.stop() }

  const past = '2026-11-20T08:00:00.000Z'
  const ended = await claudeBridge({ status: () => signedInUntil(past) })
  try {
    const entry = await ended.entry()
    assert.deepEqual({ needsAuth: entry.needsAuth, signInReason: entry.signInReason, statusMessage: entry.statusMessage, statusUrl: entry.statusUrl, loginExpiresAt: entry.loginExpiresAt },
      { needsAuth: true, signInReason: 'expired', statusMessage: CLAUDE_EXPIRED, statusUrl: null, loginExpiresAt: past })
    assert.equal(ended.bridge.v2.claudeExpiryTimer, null)
    const read = await ended.bridge.handle('account/read', {})
    assert.equal(read.account, null, 'no Claude account while its sign-in has ended')
  } finally { await ended.bridge.stop() }

  const out = await claudeBridge({ status: () => CLEARED })
  try {
    const entry = await out.entry()
    assert.deepEqual([entry.needsAuth, entry.signInReason, entry.loginExpiresAt], [true, 'signedOut', undefined])
    assert.match(entry.statusMessage, /not logged in/)
  } finally { await out.bridge.stop() }

  const old = await claudeBridge({ status: () => SIGNED_IN, version: '2.1.100 (Claude Code)\n' })
  try { assert.equal((await old.entry()).signInReason, 'tooOld') } finally { await old.bridge.stop() }

  // Not found here, and v2 says so: missing. v2's own needs_auth keeps its message.
  const missing = await claudeBridge({ files: [], status: () => SIGNED_IN, credentialStatus: { status: 'needs_auth', message: 'Claude Code is not installed. Install it, then run `claude auth login`.', url: 'https://code.claude.com/docs/en/setup' } })
  try {
    const entry = await missing.entry()
    assert.deepEqual([entry.needsAuth, entry.signInReason, entry.statusUrl], [true, 'missing', 'https://code.claude.com/docs/en/setup'])
    assert.match(entry.statusMessage, /not installed/)
  } finally { await missing.bridge.stop() }

  // Found, signed in per claude, but v2's probe failed with Claude Code's text: authFailed from v2's message.
  const probed = await claudeBridge({ status: () => SIGNED_IN, credentialStatus: { status: 'needs_auth', message: 'OAuth token revoked · Run `claude auth login` in a terminal' } })
  try { assert.equal((await probed.entry()).signInReason, 'authFailed') } finally { await probed.bridge.stop() }
})

test('account/read for Claude: one account/updated when the sign-in ends (the status read again then), the timer replaced on each read, none out of range', async () => {
  let status = signedInUntil(new Date(Date.now() + 60).toISOString())
  const { bridge, notes, entry, statusCalls } = await claudeBridge({ status: () => status })
  try {
    bridge.v2.accountTiming = { debounceMs: 5, claudeExpiryGraceMs: 20 }
    await entry()
    const first = bridge.v2.claudeExpiryTimer
    await entry()
    assert.notEqual(bridge.v2.claudeExpiryTimer, first, 'replaced')
    const before = notes.filter((note) => note.method === 'account/updated').length
    await until(() => notes.filter((note) => note.method === 'account/updated').length > before, 'account/updated at the end', 2000)
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(notes.filter((note) => note.method === 'account/updated').length, before + 1, 'once')
    const calls = statusCalls()
    const after = await entry()
    assert.equal(statusCalls(), calls + 1, 'claude auth status asked again (the cache dropped)')
    assert.equal(after.signInReason, 'expired')
    // Out of setTimeout's range (30 days): no timer.
    status = signedInUntil(new Date(Date.now() + 30 * 86400000).toISOString())
    bridge.v2.claude.forget()
    await entry()
    assert.equal(bridge.v2.claudeExpiryTimer, null)
  } finally { await bridge.stop() }
})

test('account/read for Claude: a chat\'s sign-in failure is authFailed while claude still lists the login (or can\'t tell); another login, a Claude chat that goes through or a sign-in clears it', async () => {
  const expires = new Date(Date.now() + 5 * 86400000).toISOString()
  let status = signedInUntil(expires)
  const { bridge, notes, entry, statusCalls } = await claudeBridge({ status: () => status })
  try {
    assert.equal((await entry()).needsAuth, undefined)
    const calls = statusCalls()
    let from = notes.length
    bridge.claudeSignInFailedV2(CLAUDE_TIME_LIMIT)
    await until(() => notes.slice(from).some((note) => note.method === 'account/updated'), 'account/updated')
    let claude = await entry()
    assert.equal(statusCalls(), calls + 1, 'the cached status was dropped')
    assert.deepEqual([claude.needsAuth, claude.signInReason, claude.statusMessage, claude.statusUrl], [true, 'authFailed', CLAUDE_TIME_LIMIT, null])
    assert.equal(claude.loginExpiresAt, expires)
    // A status that can't tell keeps it.
    status = 'not json'
    bridge.v2.claude.forget()
    assert.equal((await entry()).signInReason, 'authFailed')
    // The same login again: still failed.
    status = signedInUntil(expires)
    bridge.v2.claude.forget()
    assert.equal((await entry()).signInReason, 'authFailed')
    // A sign-in in a terminal (a new end date): over.
    status = signedInUntil(new Date(Date.now() + 20 * 86400000).toISOString())
    bridge.v2.claude.forget()
    claude = await entry()
    assert.deepEqual([claude.needsAuth, claude.signInReason], [undefined, undefined])
    assert.equal(bridge.v2.claudeFailure, null)

    // Claude Code cleared its credential (the user's case): signedOut, not authFailed.
    bridge.claudeSignInFailedV2(CLAUDE_TIME_LIMIT)
    status = CLEARED
    claude = await entry()
    assert.deepEqual([claude.needsAuth, claude.signInReason], [true, 'signedOut'])

    // A Claude chat that went through ends it (account/updated).
    status = signedInUntil(expires)
    bridge.claudeSignInFailedV2(CLAUDE_TIME_LIMIT)
    await entry()
    from = notes.length
    bridge.claudeTurnSucceededV2()
    assert.equal(bridge.v2.claudeFailure, null)
    await until(() => notes.slice(from).some((note) => note.method === 'account/updated'), 'account/updated after a good chat')
    assert.equal((await entry()).needsAuth, undefined)
    from = notes.length
    bridge.claudeTurnSucceededV2()
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(notes.slice(from).filter((note) => note.method === 'account/updated').length, 0, 'nothing to clear: no notification')
  } finally { await bridge.stop() }
})

test('Claude Sign in after a chat\'s sign-in failure or past loginExpiresAt runs `claude auth login` though claude still lists the login; its success clears the failure', async () => {
  const URL = 'https://claude.com/cai/oauth/authorize?code=true&client_id=x'
  const expires = new Date(Date.now() + 5 * 86400000).toISOString()
  const renewed = new Date(Date.now() + 30 * 86400000).toISOString()
  let status = signedInUntil(expires)
  const { bridge, fake, notes, claude, entry } = await claudeBridge({
    status: () => status,
    login: { url: URL, onCode: (child, text) => { if (text === 'the-code\n') { status = signedInUntil(renewed); setImmediate(() => child.finish(0)) } } },
  })
  try {
    bridge.v2.clock = undefined
    bridge.v2.accountTiming = { debounceMs: 5, pollMs: 5 }
    bridge.claudeSignInFailedV2(CLAUDE_TIME_LIMIT)
    assert.equal((await entry()).signInReason, 'authFailed')
    const start = await bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.deepEqual(start, { type: 'chatgpt', loginId: start.loginId, authUrl: URL, codeDesktop: { openedByAgent: true, acceptsCode: true } })
    assert.deepEqual(claude.logins[0].args, ['auth', 'login', '--claudeai'])
    assert.equal(requests(fake, 'POST', /connect\/external$/).length, 0, 'nothing connected before Claude Code is signed in again')
    assert.deepEqual(await bridge.handle('codeDesktop/login/code', { loginId: start.loginId, code: 'the-code' }), { status: 'submitted' })
    await until(() => completed(notes).length === 1, 'completed')
    assert.deepEqual(completed(notes)[0].params, { loginId: start.loginId, success: true, error: null })
    assert.equal(bridge.v2.claudeFailure, null)
    const after = await entry()
    assert.deepEqual([after.needsAuth, after.signInReason, after.loginExpiresAt], [undefined, undefined, renewed])
  } finally { await bridge.stop() }

  // Past loginExpiresAt: the same flow; a claude that still lists the ended login after exiting fails it.
  const ended = await claudeBridge({ status: () => signedInUntil('2026-11-20T08:00:00.000Z'), login: { url: URL } })
  try {
    const start = await ended.bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.deepEqual(start.codeDesktop, { openedByAgent: true, acceptsCode: true })
    assert.equal(ended.claude.logins.length, 1)
    ended.claude.logins[0].child.finish(0)
    await until(() => completed(ended.notes).length === 1, 'failed')
    assert.equal(completed(ended.notes)[0].params.success, false)
  } finally { await ended.bridge.stop() }

  // Signed in with a sign-in still good and nothing failed: connecting only, no `claude auth login`.
  const fine = await claudeBridge({ status: () => signedInUntil(expires) })
  try {
    const start = await fine.bridge.handle('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } })
    assert.deepEqual(start.codeDesktop, { openedByAgent: true, connecting: true })
    assert.equal(fine.claude.logins.length, 0)
  } finally { await fine.bridge.stop() }
})
