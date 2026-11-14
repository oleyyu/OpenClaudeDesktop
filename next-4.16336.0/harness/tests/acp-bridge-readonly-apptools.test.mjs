// ACP bridge (harness/packages/acp-bridge): read-only threads nobody answers (the /workflow runner's agents) stay out
// of the agent's own plan mode; OpenClaude Desktop's tools on Qwen (Plan mode, mcp.allowed, deferred tools) and Gemini (Plan
// Mode policy); MCP results an agent reports only in rawOutput (MiniMax Code).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { permissionOf, decide, isReadOnlyMode, usesAgentPlanMode, sandboxFor, sandboxPolicyOf } from '../packages/acp-bridge/src/permissions.js'
import { qwenAppToolsSettings, QWEN_VISIBLE_APP_TOOLS } from '../packages/acp-bridge/src/agents/qwen.js'
import { geminiAppToolsPolicy } from '../packages/acp-bridge/src/agents/gemini.js'
import { completeToolItem } from '../packages/acp-bridge/src/projection.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-ro-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)) }

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp() } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
      FAKE_ACP_LOG: logFile, FAKE_ACP_MODES: '1', ...env,
    },
  })
  const notes = []
  const requests = []
  const client = new LineTransport(toClient, toServer, { onRequest: async (method, params) => { requests.push({ method, params }); throw new Error('Nobody can answer here.') }, onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const waitFor = async (match, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs
    for (;;) {
      const found = notes.find((note) => match(note.method, note.params))
      if (found) return found.params
      if (Date.now() > end) throw new Error('timed out waiting for a notification')
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }] })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  // The reply text streamed for a turn (item/agentMessage/delta).
  const reply = (turnObject) => notes.filter((note) => note.method === 'item/agentMessage/delta' && note.params.turnId === turnObject.id).map((note) => note.params.delta).join('')
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return { home, call, turn, reply, notes, requests, agentLog, close: () => server.shutdown() }
}

test('permissions: read-only with approvalPolicy never and no mode hint is readOnly (refuses what would ask); a hint or on-request stays Plan', () => {
  assert.equal(permissionOf({ approvalPolicy: 'never', sandbox: 'read-only' }).mode, 'readOnly')
  assert.equal(permissionOf({ approvalPolicy: 'never', sandboxPolicy: { type: 'readOnly', networkAccess: false } }).mode, 'readOnly')
  assert.equal(permissionOf({ approvalPolicy: 'on-request', sandbox: 'read-only' }).mode, 'plan')
  assert.equal(permissionOf({ approvalPolicy: 'never', sandbox: 'read-only', codeDesktop: { permissionMode: 'plan' } }).mode, 'plan')
  assert.equal(permissionOf({ approvalPolicy: 'never', sandbox: 'workspace-write' }).mode, 'auto')
  assert.equal(isReadOnlyMode('readOnly'), true)
  assert.equal(usesAgentPlanMode('readOnly'), false)
  for (const mode of ['plan', 'chat', 'review']) assert.equal(usesAgentPlanMode(mode), true)
  assert.equal(sandboxFor('readOnly'), 'read-only')
  assert.equal(sandboxPolicyOf({ mode: 'readOnly' }, '/w').type, 'readOnly')
  const base = { mode: 'readOnly', paths: [], roots: ['/w'] }
  assert.equal(decide({ ...base, kind: 'edit', paths: ['/w/a'], sandboxed: true }), 'deny')
  assert.equal(decide({ ...base, kind: 'read', sandboxed: false }), 'allow')
  assert.equal(decide({ ...base, kind: 'execute', sandboxed: true }), 'allow')
  assert.equal(decide({ ...base, kind: 'execute', sandboxed: false }), 'deny')
  assert.equal(decide({ ...base, kind: 'other', sandboxed: true }), 'deny')
  // Plan itself still asks.
  assert.equal(decide({ ...base, mode: 'plan', kind: 'other', sandboxed: true }), 'ask')
})

test('Kimi: a read-only workflow agent runs in Kimi’s default mode; its MCP calls and EnterPlanMode are refused without a card', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread, sandbox } = await b.call('thread/start', { cwd: b.home, approvalPolicy: 'never', sandbox: 'read-only' })
    assert.equal(sandbox.type, 'readOnly')
    await b.turn(thread.id, 'hello')
    assert.deepEqual(b.agentLog().filter((entry) => entry.method === 'session/set_mode').map((entry) => entry.params.modeId), ['default'])
    assert.equal(b.reply(await b.turn(thread.id, 'mcp-call mcp__github__create_issue')), 'mcp:reject')
    assert.equal(b.reply(await b.turn(thread.id, 'enter-plan')), 'plan:reject')
    assert.equal(b.requests.length, 0, 'nothing reached the client')
    assert.ok(!b.notes.some((note) => note.method === 'codeDesktop/thread/mode'), 'the thread never followed the agent into Plan')
    // A user's Plan (with the app's hint) still puts Kimi into its plan mode.
    const plan = await b.call('thread/start', { cwd: b.home, approvalPolicy: 'on-request', sandbox: 'read-only', codeDesktop: { permissionMode: 'plan', afterPlan: 'auto' } })
    await b.turn(plan.thread.id, 'hello')
    const modes = b.agentLog().filter((entry) => entry.method === 'session/set_mode' && entry.params.sessionId === plan.thread.id).map((entry) => entry.params.modeId)
    assert.deepEqual(modes, ['plan'])
  } finally { await b.close() }
})

test('Gemini: a read-only workflow agent stays in Gemini’s default mode (its shell, no Plan Mode prompt)', async () => {
  const home = tmp()
  write(path.join(home, '.gemini', 'settings.json'), { security: { auth: { selectedType: 'gemini-api-key' } } })
  const b = bridge({ adapter: adapterById('gemini'), home, env: { GEMINI_API_KEY: 'k', GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: home, approvalPolicy: 'never', sandboxPolicy: { type: 'readOnly', networkAccess: false } })
    await b.turn(thread.id, 'hello')
    assert.ok(!b.agentLog().some((entry) => entry.method === 'session/set_mode' && entry.params.modeId === 'plan'), 'never sent to plan mode')
    // A user's Plan is Gemini's Plan Mode.
    const plan = await b.call('thread/start', { cwd: home, approvalPolicy: 'on-request', sandbox: 'read-only', codeDesktop: { permissionMode: 'plan', afterPlan: 'auto' } })
    await b.turn(plan.thread.id, 'hello')
    assert.ok(b.agentLog().some((entry) => entry.method === 'session/set_mode' && entry.params.sessionId === plan.thread.id && entry.params.modeId === 'plan'))
  } finally { await b.close() }
})

test('Qwen: OpenClaude Desktop’s tools are allowed in Plan, listed up front, and join an mcp.allowed list only where one exists', () => {
  const qwen = adapterById('qwen')
  const home = tmp(), project = tmp()
  const systemFile = path.join(home, 'admin', 'settings.json')
  write(systemFile, { permissions: { allow: ['read_file'] }, tools: { visible: ['web_fetch'] } })
  write(path.join(home, '.qwen', 'settings.json'), { mcp: { allowed: ['github'] } })
  const env = { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: systemFile }
  const read = (out) => JSON.parse(fs.readFileSync(out.env.QWEN_CODE_SYSTEM_SETTINGS_PATH, 'utf8'))
  const out = qwen.launch({ env }, { threadDir: path.join(home, 't1'), cwd: project, writable: [project], appTools: 'code_desktop' })
  const settings = read(out)
  assert.deepEqual(settings.permissions.allow, ['read_file', 'mcp__code_desktop'], 'the admin’s rules kept, the server allowed')
  assert.deepEqual(settings.tools.visible, ['web_fetch', ...QWEN_VISIBLE_APP_TOOLS.map((name) => `mcp__code_desktop__${name}`)])
  assert.deepEqual(settings.mcp.allowed, ['code_desktop'], 'concatenated with the user’s list by Qwen')
  assert.equal(out.env.QWEN_CODE_SYSTEM_DEFAULTS_PATH, path.join(home, 'admin', 'system-defaults.json'), 'the admin’s system defaults stay in force')
  // No allowed list anywhere: none added (it would block every other server).
  write(path.join(home, '.qwen', 'settings.json'), {})
  assert.equal(read(qwen.launch({ env }, { threadDir: path.join(home, 't2'), cwd: project, writable: [project], appTools: 'code_desktop' })).mcp, undefined)
  // A project list counts too; a list already naming the server is left as it is.
  write(path.join(project, '.qwen', 'settings.json'), { mcp: { allowed: ['local'] } })
  assert.deepEqual(read(qwen.launch({ env }, { threadDir: path.join(home, 't3'), cwd: project, writable: [project], appTools: 'code_desktop' })).mcp.allowed, ['code_desktop'])
  assert.equal(qwenAppToolsSettings({}, 'code_desktop', [{ mcp: { allowed: ['code_desktop'] } }]).mcp, undefined)
  // Without the server (or with it turned off for the thread): nothing.
  const off = read(qwen.launch({ env }, { threadDir: path.join(home, 't4'), cwd: project, writable: [project], appTools: 'code_desktop', disabledServers: ['code_desktop'] }))
  assert.deepEqual(off.permissions.allow, ['read_file'])
  const none = read(qwen.launch({ env }, { threadDir: path.join(home, 't5'), cwd: project, writable: [project] }))
  assert.deepEqual(none.permissions.allow, ['read_file'])
})

test('Gemini: a user-tier Plan Mode rule keeps OpenClaude Desktop’s tools listed; the user’s own policies keep loading', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const userFile = path.join(home, '.gemini', 'settings.json')
  write(userFile, { security: { auth: { selectedType: 'gemini-api-key' } } })
  const env = { HOME: home, PATH: process.env.PATH, GEMINI_API_KEY: 'k', GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  const ctx = { env, stateDir: path.join(home, 'state'), log: () => {}, program: {}, mcpServerNames: () => [] }
  const out = gemini.launch(ctx, { threadDir: path.join(home, 't'), cwd: home, writable: [home], appTools: 'code_desktop' })
  const policy = fs.readFileSync(path.join(home, 't', 'code-desktop-policy.toml'), 'utf8')
  assert.equal(policy, geminiAppToolsPolicy('code_desktop'))
  assert.match(policy, /mcpName = "code_desktop"\ntoolName = "\*"\ndecision = "ask_user"\npriority = 1\nmodes = \["plan"\]/)
  const overlay = JSON.parse(fs.readFileSync(path.join(out.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8'))
  assert.deepEqual(overlay.policyPaths, [path.join(home, 't', 'gemini-home', '.gemini', 'policies'), path.join(home, 't', 'code-desktop-policy.toml')])
  // The user's own policyPaths replace that folder in Gemini: they are kept instead.
  write(userFile, { security: { auth: { selectedType: 'gemini-api-key' } }, policyPaths: ['~/team-policies'] })
  const own = gemini.launch(ctx, { threadDir: path.join(home, 't2'), cwd: home, writable: [home], appTools: 'code_desktop' })
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(own.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8')).policyPaths, ['~/team-policies', path.join(home, 't2', 'code-desktop-policy.toml')])
  // Turned off for the thread: no rule.
  const off = gemini.launch(ctx, { threadDir: path.join(home, 't3'), cwd: home, writable: [home], appTools: 'code_desktop', disabledServers: ['code_desktop'] })
  assert.ok(!fs.existsSync(path.join(home, 't3', 'code-desktop-policy.toml')))
  if (off.env.GEMINI_CLI_HOME) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(off.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8')).policyPaths, ['~/team-policies'])
})

test('MCP results reported only in rawOutput (MiniMax Code): the server’s own content, images and errors', () => {
  const item = { type: 'mcpToolCall', id: 'c1', server: 'code_desktop', tool: 'list_terminal_tabs', status: 'inProgress' }
  const tabs = '{\n  "tabs": []\n}'
  const raw = { content: [{ type: 'text', text: tabs }, { type: 'text', text: '[MCP structured content]\n{"tabs":[]}' }], details: { mcp: { content: [{ type: 'text', text: tabs }], isError: false, structuredContent: { tabs: [] } } }, server: 'code_desktop', tool: 'list_terminal_tabs', is_error: false }
  const done = completeToolItem(item, { toolCallId: 'c1', content: [], rawOutput: raw }, { failed: false, durationMs: 5 })
  assert.deepEqual(done.result, { content: [{ type: 'text', text: tabs }], structuredContent: { tabs: [] } })
  // A screenshot: the image block, so the row draws its thumbnail.
  const shot = completeToolItem({ ...item, tool: 'screenshot' }, { toolCallId: 'c2', rawOutput: { content: [], details: { mcp: { content: [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }] } } } }, { failed: false })
  assert.deepEqual(shot.result.content, [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }])
  // Without details.mcp: the model-facing content, its structured-content echo dropped.
  const plain = completeToolItem(item, { toolCallId: 'c3', rawOutput: { content: raw.content } }, { failed: false })
  assert.deepEqual(plain.result.content, [{ type: 'text', text: tabs }])
  // A failure reads as the agent's own error.
  const failed = completeToolItem(item, { toolCallId: 'c4', rawOutput: { content: [{ type: 'text', text: 'MCP tool call failed: MCP error -32001: Request timed out' }], is_error: true } }, { failed: true })
  assert.deepEqual(failed.error, { message: 'MCP tool call failed: MCP error -32001: Request timed out' })
  assert.equal(completeToolItem(item, { toolCallId: 'c5', rawOutput: { error: { message: 'boom' } } }, { failed: true }).error.message, 'boom')
  assert.equal(completeToolItem(item, { toolCallId: 'c6' }, { failed: true }).error.message, 'The tool failed.')
  // Tool-call content still wins, and unknown raw output still shows as text.
  assert.deepEqual(completeToolItem(item, { toolCallId: 'c7', content: [{ type: 'content', content: { type: 'text', text: 'hi' } }], rawOutput: raw }, { failed: false }).result.content, [{ type: 'text', text: 'hi' }])
  assert.deepEqual(completeToolItem(item, { toolCallId: 'c8', rawOutput: { foo: 1 } }, { failed: false }).result.content, [{ type: 'text', text: '{"foo":1}' }])
})
