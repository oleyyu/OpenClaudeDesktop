// Lane D bug fixes (bugcheck-20261115): ACP bridge restale on settings and sign-in changes, Qwen's project connector
// sign-in and sign-out, Qwen's sign-out selection, project connector removal, Gemini's Google sign-in over a saved key,
// and config writes that never lose a hand-edited file. Fake agents and temp HOMEs only.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { writeJsonFile, readJsonFile, stripJsonComments } from '../packages/acp-bridge/src/catalog.js'

const FAKE = new URL('../packages/acp-bridge/testing/fake-acp-agent.mjs', import.meta.url).pathname
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const tempHome = (prefix) => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)))

/** A bridge over the fake ACP agent with `adapter` (a real one, or one with a few methods stubbed). */
function bridge(adapter, home, env = {}) {
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough(), toClient = new PassThrough()
  const server = serve({ input: toServer, output: toClient, adapter, log: () => {}, env: {
    PATH: process.env.PATH, HOME: home, CODE_DESKTOP_AGENT_BINARY: FAKE, CODE_DESKTOP_AGENT_RUNNER: 'node',
    CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
    CODE_DESKTOP_ACP_NO_SANDBOX: '1', FAKE_ACP_LOG: logFile, ...env } })
  const notes = []
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({ decision: 'accept' }), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const call = (method, params) => client.call(method, params, 30000)
  const done = async (id) => { for (let i = 0; i < 1500; i++) { if (notes.some((n) => n.method === 'turn/completed' && n.params.turn.id === id)) return; await sleep(20) } throw new Error('turn timeout') }
  const turn = async (threadId, text) => (await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], codeDesktop: { permissionMode: 'auto' } })).turn
  const starts = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((record) => record.method === 'initialize').length : 0)
  return { server, call, done, turn, starts, notes }
}

function kimiEnv(home) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  return { KIMI_CODE_HOME: kimiHome, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test') }
}

test('lane D: a session in a turn when settings change restarts once that turn has ended', async () => {
  const home = tempHome('laned-busy-')
  const b = bridge(adapterById('kimi'), home, kimiEnv(home))
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' }, capabilities: {} })
    const { thread } = await b.call('thread/start', { cwd: home, codeDesktop: { permissionMode: 'auto' } })
    await b.done((await b.turn(thread.id, 'hello')).id)
    const slow = await b.turn(thread.id, 'slow 1200')
    await sleep(300)
    await b.call('config/mcpServer/reload', {})
    await b.done(slow.id)
    const before = b.starts()
    await b.done((await b.turn(thread.id, 'after')).id)
    assert.equal(b.starts(), before + 1, 'the turn after the busy one runs in a new process')
    await b.done((await b.turn(thread.id, 'again')).id)
    assert.equal(b.starts(), before + 1, 'and only once')
  } finally { await b.server.shutdown(); fs.rmSync(home, { recursive: true, force: true }) }
})

test('lane D: sign-out restarts open sessions onto the new credentials', async () => {
  const home = tempHome('laned-auth-')
  const adapter = Object.assign(Object.create(adapterById('kimi')), { logout() {} })
  const b = bridge(adapter, home, kimiEnv(home))
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' }, capabilities: {} })
    const { thread } = await b.call('thread/start', { cwd: home, codeDesktop: { permissionMode: 'auto' } })
    await b.done((await b.turn(thread.id, 'hello')).id)
    const before = b.starts()
    await b.call('account/logout', {})
    await b.done((await b.turn(thread.id, 'after sign-out')).id)
    assert.equal(b.starts(), before + 1)
  } finally { await b.server.shutdown(); fs.rmSync(home, { recursive: true, force: true }) }
})

test('lane D: Qwen project connector Sign in / Sign out find it with the session folder and run on its session', async () => {
  const home = tempHome('laned-qwenmcp-')
  const project = path.join(home, 'project')
  fs.mkdirSync(path.join(project, '.qwen'), { recursive: true })
  fs.writeFileSync(path.join(project, '.qwen', 'settings.json'), JSON.stringify({ mcpServers: { corp: { httpUrl: 'https://corp.example/mcp' } } }))
  const calls = []
  const adapter = Object.assign(Object.create(adapterById('qwen')), {
    async mcpLogin(ctx, server, options) { calls.push(['login', server.name, Boolean(options?.host)]); return { authorizationUrl: 'https://auth.example/authorize' } },
    async mcpLoginStatus() { return { state: 'succeeded' } },
    async mcpLogout(ctx, server, options) { calls.push(['logout', server.name, Boolean(options?.host)]) },
  })
  const b = bridge(adapter, home)
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: project })
    assert.equal((await b.call('mcpServer/oauth/login', { name: 'corp', threadId: thread.id })).authorizationUrl, 'https://auth.example/authorize')
    await b.call('codeDesktop/mcpServer/logout', { name: 'corp', threadId: thread.id })
    assert.deepEqual(calls, [['login', 'corp', true], ['logout', 'corp', true]])
    // Without the session the project's connector isn't known: refused, as before.
    await assert.rejects(b.call('codeDesktop/mcpServer/logout', { name: 'corp' }), /no connector named corp/)
  } finally { await b.server.shutdown(); fs.rmSync(home, { recursive: true, force: true }) }
})

test('lane D: Qwen sign-out puts back the provider selection its connect made', () => {
  const home = tempHome('laned-qwenout-')
  const state = path.join(home, 'state')
  const env = { HOME: home, CODE_DESKTOP_BRIDGE_STATE: state }
  const settingsFile = path.join(home, '.qwen', 'settings.json')
  const qwen = adapterById('qwen')
  try {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true }); fs.mkdirSync(state, { recursive: true })
    const connected = { ui: { theme: 'Default' }, env: { DEEPSEEK_API_KEY: 'k' }, modelProviders: { openai: [{ id: 'deepseek-v4-pro', envKey: 'DEEPSEEK_API_KEY' }] }, security: { auth: { selectedType: 'openai' } }, model: { name: 'deepseek-v4-pro', baseUrl: '' } }
    fs.writeFileSync(settingsFile, JSON.stringify(connected))
    fs.writeFileSync(path.join(state, 'qwen-provider-keys.json'), JSON.stringify({ envKeys: ['DEEPSEEK_API_KEY'], restore: {
      'security.auth.selectedType': { before: null, after: 'openai' }, 'model.name': { before: 'my-model', after: 'deepseek-v4-pro' }, 'model.baseUrl': { before: null, after: '' } } }))
    assert.equal(qwen.account({ env }).kind, 'apiKey')
    qwen.logout({ env })
    const after = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
    assert.equal(after.security.auth.selectedType, undefined)
    assert.equal(after.model.name, 'my-model')
    assert.equal(Object.hasOwn(after.model, 'baseUrl'), false)
    assert.equal(after.ui.theme, 'Default')
    assert.equal(qwen.account({ env }).kind, null)

    // A key saved before the selection was recorded: the selection whose providers all went is cleared.
    fs.writeFileSync(settingsFile, JSON.stringify(connected))
    fs.writeFileSync(path.join(state, 'qwen-provider-keys.json'), JSON.stringify({ envKeys: ['DEEPSEEK_API_KEY'] }))
    qwen.logout({ env })
    assert.equal(JSON.parse(fs.readFileSync(settingsFile, 'utf8')).security.auth.selectedType, undefined)
    assert.equal(qwen.account({ env }).kind, null)
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('lane D: removing a project connector edits the project file it came from (Qwen, Kimi, MiniMax, Gemini)', () => {
  const cases = [
    ['qwen', (home) => path.join(home, '.qwen', 'settings.json'), (cwd) => path.join(cwd, '.qwen', 'settings.json'), (home) => ({ HOME: home })],
    ['kimi', (home) => path.join(home, '.kimi-code', 'mcp.json'), (cwd) => path.join(cwd, '.kimi-code', 'mcp.json'), (home) => ({ HOME: home, KIMI_CODE_HOME: path.join(home, '.kimi-code') })],
    ['minimax', (home) => path.join(home, '.minimax', 'mcp.json'), (cwd) => path.join(cwd, '.mcp.json'), (home) => ({ HOME: home })],
    ['gemini', (home) => path.join(home, '.gemini', 'settings.json'), (cwd) => path.join(cwd, '.gemini', 'settings.json'), (home) => ({ HOME: home })],
  ]
  for (const [id, userFile, projectFile, envOf] of cases) {
    const home = tempHome(`laned-rm-${id}-`)
    const cwd = path.join(home, 'project')
    const env = envOf(home)
    const adapter = adapterById(id)
    try {
      adapter.writeMcpServer({ env }, 'usersrv', { command: 'echo' })
      const written = userFile(home)
      assert.ok(fs.existsSync(written), `${id}: user file written`)
      fs.mkdirSync(path.dirname(projectFile(cwd)), { recursive: true })
      fs.writeFileSync(projectFile(cwd), JSON.stringify({ other: 1, mcpServers: { projsrv: { command: 'echo' }, keep: { command: 'true' } } }))
      assert.throws(() => adapter.writeMcpServer({ env }, 'projsrv', null), /remove it there/, `${id}: no folder named, refused`)
      adapter.writeMcpServer({ env }, 'projsrv', null, { cwd })
      const project = JSON.parse(fs.readFileSync(projectFile(cwd), 'utf8'))
      assert.deepEqual(project, { other: 1, mcpServers: { keep: { command: 'true' } } }, id)
      assert.throws(() => adapter.writeMcpServer({ env }, 'nowhere', null, { cwd }), /remove it there/, `${id}: an unknown name is refused`)
      adapter.writeMcpServer({ env }, 'usersrv', null, { cwd })
      assert.equal(Object.hasOwn(readJsonFile(written, {}).mcpServers ?? {}, 'usersrv'), false, `${id}: a user connector still goes from the user file`)
    } finally { fs.rmSync(home, { recursive: true, force: true }) }
  }
})

test('lane D: Gemini Sign in with Google drops the key saved in OpenClaude Desktop', async () => {
  const home = tempHome('laned-gemini-')
  const state = path.join(home, 'state')
  const bin = path.join(home, 'bin')
  fs.mkdirSync(state, { recursive: true }); fs.mkdirSync(bin, { recursive: true }); fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  fs.writeFileSync(path.join(state, 'gemini-api-key.json'), JSON.stringify({ apiKey: 'AIza-placeholder' }))
  // A stand-in Gemini ACP agent: authenticate opens the sign-in page (the bridge's `open` stand-in records it), then
  // writes Google credentials as Gemini does.
  const agent = path.join(bin, 'fake-gemini.mjs')
  fs.writeFileSync(agent, `import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'
import readline from 'node:readline'
const send = (m) => process.stdout.write(JSON.stringify(m) + '\\n')
readline.createInterface({ input: process.stdin }).on('line', (line) => { const m = JSON.parse(line)
  if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: 1, agentCapabilities: {}, authMethods: [{ id: 'oauth-personal', name: 'Google' }] } })
  else if (m.method === 'authenticate') { execFileSync(process.env.BROWSER, ['https://accounts.google.com/o/oauth2/v2/auth?fake=1']); setTimeout(() => {
    const home = path.join(process.env.HOME, '.gemini'); fs.writeFileSync(path.join(home, 'oauth_creds.json'), '{}'); fs.writeFileSync(path.join(home, 'google_accounts.json'), JSON.stringify({ active: 'user@example.com' }))
    send({ jsonrpc: '2.0', id: m.id, result: {} }) }, 300) }
  else if (m.id !== undefined) send({ jsonrpc: '2.0', id: m.id, result: {} }) })
`)
  const gemini = adapterById('gemini')
  const ctx = { env: { HOME: home, PATH: process.env.PATH }, stateDir: state, log: () => {}, commandLine: (args) => ({ command: process.execPath, args: [agent, ...args] }) }
  try {
    assert.equal(gemini.account(ctx).detail, 'Saved in OpenClaude Desktop')
    const outcome = new Promise((resolve) => { void gemini.startLogin(ctx, { onDone: (success, error) => resolve({ success, error }) }) })
    assert.deepEqual(await outcome, { success: true, error: undefined })
    assert.equal(fs.existsSync(path.join(state, 'gemini-api-key.json')), false)
    assert.equal(gemini.account(ctx).kind, 'oauth')
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('lane D: config writes refuse an unparseable file, keep comments, mode and symlinks', () => {
  const dir = tempHome('laned-write-')
  try {
    const file = path.join(dir, 'settings.json')
    // Not JSON at all: refused, the file and its settings stay.
    fs.writeFileSync(file, '{ "security": { "auth": { "selectedType": "gemini-api-key" } }, oops')
    assert.throws(() => writeJsonFile(file, { mcpServers: { a: { command: 'x' } } }), /isn’t valid JSON/)
    assert.equal(fs.readFileSync(file, 'utf8'), '{ "security": { "auth": { "selectedType": "gemini-api-key" } }, oops')

    // Comments and a trailing comma: kept, only the change is written; 0600 stays 0600; the .bak is the version before.
    const text = '{\n  // my auth, do not lose\n  "security": { "auth": { "selectedType": "gemini-api-key" } }, /* keep */\n  "mcpServers": {\n    "a": { "command": "x" }\n  },\n}\n'
    fs.writeFileSync(file, text, { mode: 0o600 })
    fs.chmodSync(file, 0o600)
    const value = JSON.parse(stripJsonComments(text))
    writeJsonFile(file, { ...value, mcpServers: { ...value.mcpServers, b: { command: 'echo', args: ['hi'] } }, model: { name: 'm' } })
    const out = fs.readFileSync(file, 'utf8')
    assert.match(out, /\/\/ my auth, do not lose/)
    assert.match(out, /\/\* keep \*\//)
    assert.deepEqual(JSON.parse(stripJsonComments(out)), { ...value, mcpServers: { ...value.mcpServers, b: { command: 'echo', args: ['hi'] } }, model: { name: 'm' } })
    assert.equal(fs.statSync(file).mode & 0o777, 0o600)
    assert.equal(fs.readFileSync(`${file}.code-desktop.bak`, 'utf8'), text)
    // Removing members keeps the comments too, and leaves no trailing comma the file didn't have.
    const plainText = '{\n  // note\n  "a": 1,\n  "b": 2\n}\n'
    fs.writeFileSync(file, plainText)
    writeJsonFile(file, { a: 1 })
    assert.equal(fs.readFileSync(file, 'utf8'), '{\n  // note\n  "a": 1\n}\n')

    // Plain JSON is written as before; a symlinked config keeps its link and the target gets the change.
    const real = path.join(dir, 'real.json')
    const link = path.join(dir, 'link.json')
    fs.writeFileSync(real, '{"a":1}', { mode: 0o600 })
    fs.chmodSync(real, 0o600)
    fs.symlinkSync(real, link)
    writeJsonFile(link, { a: 2 })
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true)
    assert.deepEqual(JSON.parse(fs.readFileSync(real, 'utf8')), { a: 2 })
    assert.equal(fs.statSync(real).mode & 0o777, 0o600)

    // A missing file is created; `replace` rebuilds an owned file whatever it holds.
    writeJsonFile(path.join(dir, 'new', 'x.json'), { a: 1 })
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'new', 'x.json'), 'utf8')), { a: 1 })
    fs.writeFileSync(path.join(dir, 'owned.json'), 'garbage')
    writeJsonFile(path.join(dir, 'owned.json'), { b: 1 }, { replace: true })
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'owned.json'), 'utf8')), { b: 1 })
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})
