// ACP bridge, round 9 fixes:
//  - OpenClaude Desktop's tools server instructions (the preview verification workflow) reach agents that never show the
//    model an MCP server's initialize instructions (adapter.appToolsInstructions: Kimi, MiniMax), only while the
//    session gets that server;
//  - Kimi background sub-agents (their log appears after the launch, even after the turn) bind to their launch by the
//    'agent_id' its result names, and their approvals belong to the child thread, not the parent's turn;
//  - Gemini: a key only exported as GEMINI_API_KEY is named in the thread's settings (session/load needs it), MCP tool
//    errors read as what the tool said, failed turns carry the agent's name once;
//  - a workflow runner's turn/completed goes out after the turn's thread/tokenUsage/updated for every adapter;
//  - MiniMax sessions begun in the mcode terminal say that OpenClaude Desktop's tools time out after 2 minutes there.
// Runs against testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { appToolsServer, SESSION_CONFIG_KEY } from '../packages/acp-bridge/src/app-tools.js'
import { geminiEnvAuthType, geminiMcpErrorText } from '../packages/acp-bridge/src/agents/gemini.js'
import { kimiLaunchAgentId } from '../packages/acp-bridge/src/agents/kimi.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r9-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const INSTRUCTIONS = 'Tools provided by OpenClaude Desktop, the app this session runs in. They act on this session only.\n\nVerifying changes in the preview: …'
const TOOLS = {
  CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' }, instructions: `  ${INSTRUCTIONS}\n` }),
  CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-r9/s',
  CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok',
}

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), onRequest = async () => ({ decision: 'accept' }) } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
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
  const client = new LineTransport(toClient, toServer, { onRequest: async (method, params) => { requests.push({ method, params }); return onRequest(method, params) }, onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
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
  const turn = async (threadId, text, extra = {}) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], ...extra })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return { home, notes, requests, call, turn, waitFor, agentLog, close: () => server.shutdown() }
}
const mode = (permissionMode) => ({ codeDesktop: { permissionMode } })

/** Every file named `name` under `dir`. */
function findFiles(dir, name, out = []) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) findFiles(full, name, out)
    else if (entry.name === name) out.push(full)
  }
  return out
}

// ------------------------------------------------------------ code_desktop instructions

test('app-tools.js keeps the server\'s instructions (trimmed), null without them', () => {
  assert.equal(appToolsServer(TOOLS).instructions, INSTRUCTIONS)
  const bare = { ...TOOLS, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/x', instructions: 42 }) }
  assert.equal(appToolsServer(bare).instructions, null)
  assert.equal(adapterById('kimi').appToolsInstructions, true)
  assert.equal(adapterById('minimax').appToolsInstructions, true)
  assert.notEqual(adapterById('gemini').appToolsInstructions, true, 'Gemini shows MCP server instructions itself')
})

test('Kimi: OpenClaude Desktop\'s tools instructions join the session\'s SYSTEM.md while it gets that server, never once switched off', async () => {
  const b = bridge({ env: TOOLS })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-r9' }, ...mode('auto') })
    await b.turn(thread.id, 'hello')
    const prompts = findFiles(path.join(b.home, 'state'), 'SYSTEM.md').map((file) => fs.readFileSync(file, 'utf8'))
    assert.ok(prompts.some((text) => text.includes('Tools provided by OpenClaude Desktop') && text.includes('${base_prompt}')), 'appended after Kimi\'s own prompt')
    const session = b.agentLog().find((entry) => entry.method === 'session/new')
    assert.ok(session.params.mcpServers.some((server) => server.name === 'code_desktop'), 'the session has the server the text describes')
  } finally { await b.close() }
  const off = bridge({ env: TOOLS })
  try {
    await off.call('initialize', {})
    const { thread } = await off.call('thread/start', { cwd: off.home, config: { [SESSION_CONFIG_KEY]: 'start-r9b' }, codeDesktop: { permissionMode: 'auto', tools: { disabledServers: ['code_desktop'] } } })
    await off.turn(thread.id, 'hello')
    const prompts = findFiles(path.join(off.home, 'state'), 'SYSTEM.md').map((file) => fs.readFileSync(file, 'utf8'))
    assert.ok(!prompts.some((text) => text.includes('Tools provided by OpenClaude Desktop')), 'switched off: no instructions for tools it lacks')
  } finally { await off.close() }
})

test('MiniMax: OpenClaude Desktop\'s tools instructions join the thread\'s AGENTS.md next to its code_desktop server', async () => {
  // The bridge's own copy of mcode's SQLite module (as the smoke test uses): without one, thread/start would npm-install it.
  const b = bridge({ adapter: adapterById('minimax'), env: { ...TOOLS, MAVIS_SQLITE3_MODULE_PATH: path.resolve(import.meta.dirname, '../../work/agents/acp-bridge/minimax-native') } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-mm' }, ...mode('auto') })
    await b.turn(thread.id, 'hello')
    const prompts = findFiles(path.join(b.home, 'state'), 'AGENTS.md').map((file) => fs.readFileSync(file, 'utf8'))
    assert.ok(prompts.some((text) => text.includes('Tools provided by OpenClaude Desktop')))
    const servers = findFiles(path.join(b.home, 'state'), 'mcp.json').map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    assert.ok(servers.some((config) => config.mcpServers?.code_desktop), 'the server the text describes is in the thread\'s mcp.json')
    assert.equal(fs.existsSync(path.join(b.home, '.minimax', 'AGENTS.md')), false, 'the user\'s own AGENTS.md is not written')
  } finally { await b.close() }
})

// ------------------------------------------------------------ Kimi background sub-agents

test('kimiLaunchAgentId reads the agent a launch result names', () => {
  assert.equal(kimiLaunchAgentId({ content: [{ type: 'content', content: { type: 'text', text: 'task_id: t\nstatus: running\nagent_id: agent-3\n' } }] }), 'agent-3')
  assert.equal(kimiLaunchAgentId({ rawOutput: { output: 'agent_id: agent-1\nx' } }), 'agent-1')
  assert.equal(kimiLaunchAgentId({ content: [] }), null)
})

test('Kimi: a background sub-agent whose log starts after the turn gets its child thread; its approval card is the child\'s', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('ask') })
    const done = await b.turn(thread.id, 'kimi-bg-agent', mode('ask'))
    assert.equal(done.status, 'completed')
    const started = await b.waitFor((method, params) => method === 'thread/started' && params.thread?.id?.startsWith(`${thread.id}~`))
    const childId = started.thread.id
    const card = await (async () => {
      const end = Date.now() + 15000
      for (;;) {
        const found = b.requests.find((request) => /requestApproval$/.test(request.method))
        if (found) return found
        if (Date.now() > end) throw new Error('no approval card')
        await sleep(20)
      }
    })()
    assert.equal(card.params.threadId, childId, 'the card belongs to the sub-agent\'s child thread')
    // The parent's launch row names its child, though its turn had ended.
    const named = await b.waitFor((method, params) => method === 'item/completed' && params.threadId === thread.id && params.item.type === 'collabAgentToolCall' && params.item.receiverThreadIds?.includes(childId))
    assert.equal(named.item.id, '0:call-bg')
    await b.waitFor((method, params) => method === 'turn/completed' && params.threadId === childId)
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    const items = read.thread.turns.flatMap((entry) => entry.items)
    assert.ok(!items.some((item) => String(item.id).endsWith('call_bg1')), 'no stray row for the sub-agent\'s call in the parent')
    assert.ok(items.find((item) => item.id === '0:call-bg')?.receiverThreadIds?.includes(childId), 'saved with its child')
    const child = await b.call('thread/read', { threadId: childId, includeTurns: true })
    const childItems = child.thread.turns.flatMap((entry) => entry.items)
    assert.ok(childItems.some((item) => item.type === 'commandExecution'), 'the sub-agent\'s command is in its own thread')
    assert.equal(b.agentLog().find((entry) => entry.method === 'bg-agent-approval')?.params?.outcome?.optionId, 'approve_once')
  } finally { await b.close() }
})

// ------------------------------------------------------------ Gemini

test('Gemini: a key exported only as GEMINI_API_KEY is named in the thread\'s settings, so a reopened session signs in', () => {
  const home = tmp()
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  const env = { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json'), GEMINI_API_KEY: 'k' }
  assert.equal(geminiEnvAuthType(env), 'gemini-api-key')
  assert.equal(geminiEnvAuthType({ ...env, GOOGLE_GEMINI_BASE_URL: 'http://127.0.0.1:1' }), null, 'a gateway: Gemini picks it from its environment')
  const launch = adapterById('gemini').launch({ env, log: () => {} }, { threadDir: path.join(home, 't'), cwd: home, disabledTools: [], disabledServers: [] })
  const settings = JSON.parse(fs.readFileSync(path.join(launch.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8'))
  assert.equal(settings.security.auth.selectedType, 'gemini-api-key')
  assert.equal(fs.existsSync(path.join(home, '.gemini', 'settings.json')), false, 'the user\'s own settings are not written')
})

test('Gemini: an MCP tool error reads as what the tool said, not Gemini\'s JSON wrapping', async () => {
  const wrapped = `MCP tool 'Workflow' reported tool error for function call: {"name":"Workflow","args":{"x":" with response: "}} with response: [{"functionResponse":{"name":"Workflow","response":{"content":[{"type":"text","text":"Dynamic workflows are disabled."}],"isError":true}}}]`
  assert.equal(geminiMcpErrorText(wrapped), 'Dynamic workflows are disabled.')
  assert.equal(geminiMcpErrorText('Some other failure'), null)
  assert.equal(geminiMcpErrorText(`MCP tool 'x' reported tool error for function call: {} with response: not json`), null)
  const b = bridge({ adapter: adapterById('gemini') })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    await b.turn(thread.id, 'gemini-mcp-error')
    const failed = b.notes.find((note) => note.method === 'item/completed' && note.params.threadId === thread.id && note.params.item.status === 'failed')
    assert.ok(failed, 'the call failed')
    const shown = JSON.stringify(failed.params.item)
    assert.match(shown, /You declined running this command in the terminal\./)
    assert.doesNotMatch(shown, /reported tool error|functionResponse/)
  } finally { await b.close() }
})

test('a failed reopen names the agent once ("Gemini CLI: Authentication required…", not twice)', async () => {
  const home = tmp()
  const first = bridge({ adapter: adapterById('gemini'), home })
  let threadId
  try {
    await first.call('initialize', {})
    const { thread } = await first.call('thread/start', { cwd: home, ...mode('auto') })
    threadId = thread.id
    await first.turn(threadId, 'hello')
  } finally { await first.close() }
  const second = bridge({ adapter: adapterById('gemini'), home, env: { FAKE_ACP_REOPEN_AUTH: '1' } })
  try {
    await second.call('initialize', {})
    let message = null
    try {
      await second.call('thread/resume', { threadId, ...mode('auto') })
      const done = await second.turn(threadId, 'again')
      message = done.error?.message ?? null
    } catch (error) { message = String(error?.message ?? error) }
    assert.ok(message, 'the reopen failed')
    assert.match(message, /Authentication required/)
    assert.doesNotMatch(message, /Gemini CLI: Gemini CLI:/)
  } finally { await second.close() }
})

// ------------------------------------------------------------ workflow runner usage order

test('workflow runner: turn/completed follows the turn\'s thread/tokenUsage/updated for an agent that reports usage with its answer', async () => {
  const b = bridge({ adapter: adapterById('gemini'), env: { CODE_DESKTOP_WORKFLOW_RUNNER: '1' } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    const done = await b.turn(thread.id, 'quota-usage')
    const order = b.notes.filter((note) => note.params?.threadId === thread.id && (note.method === 'turn/completed' || note.method === 'thread/tokenUsage/updated'))
    const completedAt = order.findIndex((note) => note.method === 'turn/completed' && note.params.turn.id === done.id)
    const usageAt = order.findIndex((note) => note.method === 'thread/tokenUsage/updated' && note.params.turnId === done.id)
    assert.ok(usageAt >= 0 && usageAt < completedAt, `usage first: ${order.map((note) => note.method).join(', ')}`)
    assert.equal(order[usageAt].params.tokenUsage.total.totalTokens, 110)
  } finally { await b.close() }
})

// ------------------------------------------------------------ MiniMax sessions from the mcode terminal

test('MiniMax: a session begun in the mcode terminal says OpenClaude Desktop\'s tools stop waiting after 2 minutes', () => {
  const minimax = adapterById('minimax')
  assert.match(minimax.permissionWarning('auto', { agentHome: 'real', appTools: true }), /after 2 minutes/)
  assert.equal(minimax.permissionWarning('auto', { agentHome: 'real', appTools: false }), null)
  assert.equal(minimax.permissionWarning('auto', { agentHome: null, appTools: true }), null, 'a thread home gives the server 10 minutes')
  const both = minimax.permissionWarning('ask', { agentHome: 'real', appTools: true })
  assert.ok(Array.isArray(both) && both.length === 2)
  assert.match(both[0], /Ask cannot stop edits/)
})
