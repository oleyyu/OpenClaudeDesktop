// Cross-area fixes, round 3, on the bridges: Qwen's todo list and opt-in tools, its output style and recording warning,
// ACP additionalDirectories (Kimi), and the DeepSeek review restoring the mode it replaced.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { qwenOptInReason, QWEN_RECORDING_DEGRADED } from '../packages/acp-bridge/src/agents/qwen.js'
import { additionalDirectoriesFor } from '../packages/acp-bridge/src/server.js'

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cd-r3x-'))

test('Qwen: the todo list is on unless the user turned it off; opt-in tools say which setting turns them on', () => {
  const qwen = adapterById('qwen')
  const home = tmp()
  try {
    const env = { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
    const overlay = (launch) => JSON.parse(fs.readFileSync(launch.env.QWEN_CODE_SYSTEM_SETTINGS_PATH, 'utf8'))
    assert.equal(overlay(qwen.launch({ env }, { threadDir: path.join(home, 't1') })).tools.todoWrite.enabled, true)
    fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
    fs.writeFileSync(path.join(home, '.qwen', 'settings.json'), JSON.stringify({ tools: { todoWrite: { enabled: false } } }))
    assert.equal(overlay(qwen.launch({ env }, { threadDir: path.join(home, 't2') })).tools.todoWrite, undefined, 'the user’s false stays in force')
    const tools = Object.fromEntries(qwen.builtinTools({ env }).map((tool) => [tool.name, tool.disabledReason ?? null]))
    assert.match(tools.todo_write, /tools\.todoWrite\.enabled/)
    assert.match(tools.lsp, /lsp\.enabled/)
    for (const name of ['team_create', 'task_create', 'request_shutdown']) assert.match(tools[name], /experimental\.agentTeam/, name)
    assert.equal(tools.read_file, null)
    assert.equal(qwenOptInReason('todo_write', {}), null)
    assert.equal(qwenOptInReason('team_create', {}, { QWEN_CODE_ENABLE_AGENT_TEAM: '1' }), null)
    assert.equal(qwenOptInReason('lsp', { lsp: { enabled: true } }), null)
    // Settings › Code offers the todo list and the output style.
    const defs = Object.fromEntries(qwen.coreSettings.defs.map((def) => [def.key, def]))
    assert.equal(defs['tools.todoWrite.enabled'].default, true)
    assert.deepEqual(defs['general.outputStyle'].options, ['default', 'Concise', 'Proactive', 'Explanatory', 'Learning'])
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('Qwen: a chat-recording write failure becomes one warning for the session', () => {
  const qwen = adapterById('qwen')
  const warnings = []
  const api = { warn: (message) => warnings.push(message) }
  assert.equal(qwen.onExtension('qwen/notify/session/recording-degraded', { sessionId: 's', reason: 'write_failed' }, api), null)
  assert.equal(qwen.onExtension('_qwen/notify/session/recording-degraded', { sessionId: 's' }, api), null)
  assert.deepEqual(warnings, [QWEN_RECORDING_DEGRADED, QWEN_RECORDING_DEGRADED])
  assert.match(QWEN_RECORDING_DEGRADED, /can’t save this session/)
})

test('ACP additionalDirectories: the session’s added folders, only for an agent that declares the capability', () => {
  const thread = { cwd: '/w', permission: { writableRoots: ['/w', '/shared/lib', '/shared/lib', 'relative', '/x\0y'] } }
  const kimi = { init: { agentCapabilities: { sessionCapabilities: { additionalDirectories: {} } } } }
  assert.deepEqual(additionalDirectoriesFor(kimi, thread), { additionalDirectories: ['/shared/lib'] })
  assert.deepEqual(additionalDirectoriesFor({ init: { agentCapabilities: {} } }, thread), {})
  assert.deepEqual(additionalDirectoriesFor(kimi, { cwd: '/w', permission: { writableRoots: [] } }), {})
  assert.deepEqual(additionalDirectoriesFor(kimi, { cwd: '/w' }), {})
})

test('DeepSeek review: a review resumed with the review settings first restores the mode the app had set', () => {
  const source = fs.readFileSync(new URL('../packages/codex-app-server/src/index.js', import.meta.url), 'utf8')
  assert.match(source, /const previous = thread\.permission\.mode === 'review' \? thread\.beforeReview \?\? null :/)
  assert.match(source, /if \(typeof params\?\.codeDesktop\?\.permissionMode === 'string'\) thread\.appMode = true/)
  // Goal rounds use the current tool selection and instructions.
  assert.match(source, /case 'thread\/goal\/set': \{[\s\S]{0,600}thread\.gateTools\(params\)\n\s+applyCustomization\(thread\.custom, params\)/)
})

test('OpenCode/MiMo: a call rerouted to the `invalid` tool is a failed call of the tool the model tried', async () => {
  const { toolItem } = await import('../packages/opencode-bridge/src/projection.js')
  const S = 'ses_x'
  const unknown = toolItem({ id: 'p1', sessionID: S, tool: 'invalid', callID: 'c', state: { status: 'completed', title: 'Invalid Tool', input: { tool: 'frobnicate', error: "Model tried to call unavailable tool 'frobnicate'." }, output: 'The arguments provided to the tool are invalid: …' } }, { threadId: S, cwd: '/w', mcpServers: [] })
  assert.equal(unknown.type, 'dynamicToolCall')
  assert.equal(unknown.tool, 'frobnicate')
  assert.equal(unknown.status, 'failed')
  assert.equal(unknown.success, false)
  assert.deepEqual(unknown.codeDesktop, { invalidTool: true })
  assert.match(unknown.contentItems[0].text, /unavailable tool 'frobnicate'/)
  const app = toolItem({ id: 'p2', sessionID: S, tool: 'invalid', callID: 'c', state: { status: 'completed', input: { tool: 'code_desktop_Workflow', error: 'not loaded' } } }, { threadId: S, cwd: '/w', mcpServers: ['code_desktop'] })
  assert.equal(app.type, 'mcpToolCall')
  assert.equal(app.server, 'code_desktop')
  assert.equal(app.tool, 'Workflow')
  assert.equal(app.status, 'failed')
  assert.deepEqual(app.error, { message: 'not loaded' })
})
