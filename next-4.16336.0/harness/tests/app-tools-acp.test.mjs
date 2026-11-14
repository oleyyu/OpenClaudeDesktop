// OpenClaude Desktop's own tools server ("code_desktop") on the ACP bridge (packages/acp-bridge/src/app-tools.js): every
// app session's ACP session/new | resume | load carries the stdio mcpServers entry from CODE_DESKTOP_AGENT_TOOLS_*,
// its env naming the session (the app's start token on thread/start, the thread id once the thread exists, a fork's
// own id); throwaway sessions (model discovery, side questions) never get one; without the variables nothing changes.
// Gemini lets it past a user mcp.allowed list; its calls need no card. Runs against testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { appToolsServer, acpAppToolsServer, withRunAsNodeInCommand, sessionIdentityOf, sessionToken, SESSION_CONFIG_KEY } from '../packages/acp-bridge/src/app-tools.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-acp-')))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const TOOLS = {
  CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } }),
  CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-x/s',
  CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok',
}

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp() } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, QWEN_HOME: path.join(home, '.qwen'), CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_ACP_NO_SANDBOX: '1',
      QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'no-qwen-system.json'), GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'),
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), ...env,
    },
  })
  const notes = []
  const requests = []
  const client = new LineTransport(toClient, toServer, { onRequest: async (method, params) => { requests.push({ method, params }); return { decision: 'accept' } }, onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const waitFor = async (match, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs
    for (;;) {
      const found = notes.find((note) => match(note.method, note.params))
      if (found) return found.params
      if (Date.now() > end) throw new Error('timed out waiting for a notification')
      await sleep(20)
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }] })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  const sessions = (method) => agentLog().filter((entry) => entry.method === method)
  return { home, call, turn, notes, requests, agentLog, sessions, close: () => server.shutdown() }
}

/** The session a code_desktop entry names, or null when the list has none. */
const namedSession = (mcpServers) => {
  const entry = (mcpServers ?? []).find((server) => server.name === 'code_desktop')
  return entry ? entry.env.find((item) => item.name === 'CODE_DESKTOP_AGENT_SESSION')?.value ?? null : null
}

test('app-tools.js: the ACP entry carries the server env, the socket, the token and the session', () => {
  const server = appToolsServer(TOOLS)
  assert.deepEqual(acpAppToolsServer(server, 'thread-1'), {
    name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'],
    env: [{ name: 'ELECTRON_RUN_AS_NODE', value: '1' }, { name: 'CODE_DESKTOP_AGENT_TOOLS_SOCKET', value: '/tmp/cd-tools-x/s' }, { name: 'CODE_DESKTOP_AGENT_TOOLS_TOKEN', value: sessionToken('tok', 'thread-1') }, { name: 'CODE_DESKTOP_AGENT_SESSION', value: 'thread-1' }],
  })
  // Gemini CLI drops ELECTRON_RUN_AS_NODE from a server's env: it rides in the command instead (else a second app opens).
  assert.deepEqual(acpAppToolsServer(server, 'thread-1', { runAsNodeInCommand: true }), {
    name: 'code_desktop', command: '/usr/bin/env', args: ['ELECTRON_RUN_AS_NODE=1', '/Apps/OpenClaude Desktop', '/Apps/agent-tools-server.mjs'],
    env: [{ name: 'CODE_DESKTOP_AGENT_TOOLS_SOCKET', value: '/tmp/cd-tools-x/s' }, { name: 'CODE_DESKTOP_AGENT_TOOLS_TOKEN', value: sessionToken('tok', 'thread-1') }, { name: 'CODE_DESKTOP_AGENT_SESSION', value: 'thread-1' }],
  })
  const plain = { name: 'x', command: '/usr/bin/node', args: ['s.mjs'], env: { A: '1' } }
  assert.equal(withRunAsNodeInCommand(plain), plain)
  const app = { name: 'x', command: 'C:\\App.exe', args: ['s.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } }
  assert.equal(withRunAsNodeInCommand(app, 'win32'), app)
  assert.equal(adapterById('gemini').mcpDropsRunAsNode, true)
  assert.equal(acpAppToolsServer(server, null), null)
  assert.equal(acpAppToolsServer(null, 'thread-1'), null)
  assert.equal(appToolsServer({ ...TOOLS, CODE_DESKTOP_AGENT_TOOLS_SERVER: 'nope' }), null)
  assert.equal(appToolsServer({}), null)
  assert.equal(sessionIdentityOf({ config: { [SESSION_CONFIG_KEY]: 'start-1', model_reasoning_effort: 'high' } }), 'start-1')
  assert.equal(sessionIdentityOf({ config: {} }), null)
  assert.equal(sessionIdentityOf({}), null)
})

test('ACP: new threads use the app’s start token, reopened ones their id; discovery and side questions get none', async () => {
  const token = 'start-00000000-0000-4000-8000-000000000001'
  const b = bridge({ env: TOOLS })
  let id
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: token, model_reasoning_effort: 'high' } })
    id = thread.id
    const created = b.sessions('session/new')
    assert.equal(created.length, 1)
    const entry = created[0].params.mcpServers[0]
    assert.equal(entry.name, 'code_desktop')
    assert.equal(entry.command, '/Apps/OpenClaude Desktop')
    assert.deepEqual(entry.args, ['/Apps/agent-tools-server.mjs'])
    assert.deepEqual(Object.fromEntries(entry.env.map((item) => [item.name, item.value])), { ELECTRON_RUN_AS_NODE: '1', CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-x/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: sessionToken('tok', token), CODE_DESKTOP_AGENT_SESSION: token })
    // Without a start token a new thread's first process runs without it (the id comes with the agent's answer).
    await b.call('thread/start', { cwd: b.home })
    assert.deepEqual(b.sessions('session/new')[1].params.mcpServers, [])
    await b.turn(thread.id, 'hello')
    // Throwaway sessions: model discovery and a side question.
    await b.call('model/list', {})
    await b.call('codeDesktop/sideQuestion', { threadId: thread.id, question: 'what did I ask?' }).catch(() => {})
    const throwaway = b.sessions('session/new').slice(2)
    assert.ok(throwaway.length >= 1, 'model discovery or the side question started a session')
    for (const entry of throwaway) assert.deepEqual(entry.params.mcpServers, [])
  } finally { await b.close() }
  // A new bridge process reopens the thread: session/resume names the thread by its id.
  const again = bridge({ env: TOOLS, home: b.home })
  try {
    await again.call('initialize', {})
    await again.call('thread/resume', { threadId: id })
    await again.turn(id, 'again')
    const resumed = again.sessions('session/resume').filter((entry) => entry.params.sessionId === id)
    assert.ok(resumed.length >= 1)
    assert.equal(namedSession(resumed.at(-1).params.mcpServers), id)
  } finally { await again.close() }
})

test('ACP: a fork opens in its own process, its server named by the fork’s id', async () => {
  const b = bridge({ adapter: adapterById('qwen'), env: TOOLS })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'first question')
    const forked = await b.call('thread/fork', { threadId: thread.id })
    await b.turn(forked.thread.id, 'in the fork')
    const opened = [...b.sessions('session/resume'), ...b.sessions('session/load')].filter((entry) => entry.params.sessionId === forked.thread.id)
    assert.ok(opened.length >= 1, 'the fork opened in its own process')
    assert.equal(namedSession(opened.at(-1).params.mcpServers), forked.thread.id)
  } finally { await b.close() }
})

test('ACP: without the launch variables every session keeps an empty mcpServers', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-000000000002' } })
    await b.turn(thread.id, 'hello')
    for (const entry of [...b.sessions('session/new'), ...b.sessions('session/resume'), ...b.sessions('session/load')]) assert.deepEqual(entry.params.mcpServers, [])
  } finally { await b.close() }
})

test('ACP: a code_desktop call needs no card, even in Ask mode; another server’s still asks', async () => {
  const b = bridge({ env: TOOLS })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, approvalPolicy: 'untrusted', sandbox: 'workspace-write' })
    const replies = () => b.notes.filter((note) => note.method === 'item/agentMessage/delta').map((note) => note.params.delta).filter((text) => text.startsWith('mcp:'))
    await b.turn(thread.id, 'mcp-call mcp__code_desktop__ping')
    assert.deepEqual(replies(), ['mcp:approve_once'])
    assert.equal(b.requests.length, 0)
    await b.turn(thread.id, 'mcp-call mcp__github__create_issue')
    assert.ok(b.requests.some((request) => /requestApproval/.test(request.method)), 'another server’s call raised a card')
    assert.deepEqual(replies(), ['mcp:approve_once', 'mcp:approve_once'])
  } finally { await b.close() }
})

test('Gemini: OpenClaude Desktop’s server joins a user mcp.allowed list in the thread’s settings overlay (never the user’s file)', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  const userFile = path.join(home, '.gemini', 'settings.json')
  const user = { security: { auth: { selectedType: 'gemini-api-key' } }, mcp: { allowed: ['github'] } }
  fs.writeFileSync(userFile, JSON.stringify(user))
  const env = { HOME: home, PATH: process.env.PATH, GEMINI_API_KEY: 'k', GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  const ctx = { env, stateDir: path.join(home, 'state'), log: () => {}, program: {}, mcpServerNames: () => [] }
  const out = gemini.launch(ctx, { threadDir: path.join(home, 't'), cwd: home, writable: [home], appTools: 'code_desktop' })
  const overlay = JSON.parse(fs.readFileSync(path.join(out.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8'))
  assert.deepEqual(overlay.mcp.allowed, ['github', 'code_desktop'])
  assert.deepEqual(JSON.parse(fs.readFileSync(userFile, 'utf8')), user)
  // No allowed list: nothing to add (Gemini allows every server).
  fs.writeFileSync(userFile, JSON.stringify({ security: { auth: { selectedType: 'gemini-api-key' } } }))
  const plain = gemini.launch(ctx, { threadDir: path.join(home, 't2'), cwd: home, writable: [home], appTools: 'code_desktop' })
  const plainOverlay = JSON.parse(fs.readFileSync(path.join(plain.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8'))
  assert.equal(plainOverlay.mcp?.allowed, undefined)
  // The overlay home only carries the Plan Mode policy for OpenClaude Desktop's tools (see the Plan Mode test).
  assert.deepEqual(plainOverlay.policyPaths, [path.join(home, 't2', 'gemini-home', '.gemini', 'policies'), path.join(home, 't2', 'code-desktop-policy.toml')])
  // Its calls read as the code_desktop server's (an underscore in the server name).
  assert.deepEqual(gemini.classify({ toolCallId: 'mcp_code_desktop_preview_click__1' }, { mcpServerNames: () => ['code_desktop'] }), { type: 'mcp', server: 'code_desktop', tool: 'preview_click' })
})
