// ACP bridge (harness/packages/acp-bridge), round 4: Kimi model failures and retries, Kimi's own asks in Auto,
// stringified tool images, nested and plugin skills; Qwen fork-from-here, /cd and its own workflows; Gemini plan files,
// blocked connectors, per-project extensions and built-in skills; MiniMax sandboxed rm, shell rc files, questionnaires,
// todos, project connectors and usage-limit errors. Server flows run against packages/acp-bridge/testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { scanSkills } from '../packages/acp-bridge/src/catalog.js'
import { expandToolParts, ThreadProjector, toolItem as acpToolItem, completeToolItem as acpCompleteToolItem, findingsReview } from '../packages/acp-bridge/src/projection.js'
import { seatbeltProfile, wrapLaunch, sandboxAvailable } from '../packages/acp-bridge/src/sandbox.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { kimiErrorInfo, kimiTurnError, kimiMustAsk, kimiDangerousCommand, kimiAskRule, kimiSensitiveFile, kimiGitPath, readKimiConfig, globRegExp } from '../packages/acp-bridge/src/agents/kimi.js'
import { extensionEnabledAt, geminiPlanDirectory, geminiBuiltinSkillsDir } from '../packages/acp-bridge/src/agents/gemini.js'
import { threadPermissionFile } from '../packages/acp-bridge/src/agents/minimax-config.js'
import { minimaxGlobalInstructions, MINIMAX_GLOBAL_MAX_BYTES } from '../packages/acp-bridge/src/agents/minimax.js'
import { qwenLanguage } from '../packages/acp-bridge/src/agents/qwen.js'
import { qwenWorkflowRun, workflowFromCall, applyWorkflowTask, workflowDisplay, workflowLost } from '../packages/acp-bridge/src/agents/qwen-workflow.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r4-')))

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), onRequest = async () => ({}) } = {}) {
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
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), ...env,
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
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text, extra = {}) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], ...extra })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return { home, kimiHome, call, turn, notes, requests, waitFor, agentLog, close: () => server.shutdown() }
}

// ------------------------------------------------------------ Kimi

test('Kimi: a model failure after a tool call fails the turn with its own error; retries show as Retrying', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const turn = await b.turn(thread.id, 'kimi-fail')
    assert.equal(turn.status, 'failed')
    assert.equal(turn.error.codexErrorInfo, 'usageLimitExceeded')
    assert.equal(turn.error.additionalDetails, 'BILLING')
    assert.match(turn.error.message, /^Kimi Code: 429 You exceeded your current token quota/)
    const retry = b.notes.find((note) => note.method === 'error' && note.params.willRetry === true)
    assert.ok(retry, 'a retry notice')
    assert.deepEqual(retry.params.retry, { attempt: 1, maxRetries: 3, delayMs: 10 })
    assert.equal(retry.params.error.codexErrorInfo, 'rateLimitExceeded')
  } finally { await b.close() }
})

test('Kimi background sub-agents are listed as not stoppable (ACP has no stop for them)', () => {
  const thread = { cwd: '/w', kimiChildren: { bound: new Map([['agent-0', { callId: 'call-1', label: 'coder', background: true, done: false }], ['agent-1', { callId: 'call-2', label: 'x', background: true, done: true }]]) } }
  assert.deepEqual(adapterById('kimi').backgroundProcesses(thread), [{ itemId: 'call-1', processId: 'kimi-agent:agent-0', command: 'coder agent (agent-0)', cwd: '/w', stoppable: false }])
})

test('Kimi error identities and turn errors', () => {
  assert.equal(kimiErrorInfo({ name: 'APIProviderQuotaExhaustedError' }), 'usageLimitExceeded')
  assert.equal(kimiErrorInfo({ code: 'provider.auth_error' }), 'unauthorized')
  assert.equal(kimiErrorInfo({ name: 'APIContextOverflowError' }), 'contextWindowExceeded')
  assert.equal(kimiErrorInfo({ code: 'provider.rate_limit' }), 'rateLimitExceeded')
  assert.equal(kimiErrorInfo({ code: 'provider.overloaded' }), 'serverOverloaded')
  assert.deepEqual(kimiErrorInfo({ code: 'provider.connection_error' }), { httpConnectionFailed: { httpStatusCode: null } })
  assert.equal(kimiErrorInfo({ code: 'provider.api_error', details: { statusCode: 502 } }), 'internalServerError')
  assert.equal(kimiErrorInfo({ code: 'provider.api_error' }), null)
  assert.deepEqual(kimiTurnError({ name: 'APIProviderQuotaExhaustedError', message: 'Plan limit reached' }), { message: 'Plan limit reached', codexErrorInfo: 'usageLimitExceeded', additionalDetails: null })
})

test('Kimi own asks: user ask rules, the dangerous-command guard, sensitive files and .git', () => {
  const home = tmp()
  fs.mkdirSync(path.join(home, '.kimi-code'))
  fs.writeFileSync(path.join(home, '.kimi-code', 'config.toml'), ['[permission]', 'dangerous_command_guard = true', '', '[[permission.rules]]', 'decision = "ask"', 'pattern = "Bash(git push*)"', '', '[[permission.rules]]', 'decision = "allow"', 'pattern = "Bash(echo*)"', ''].join('\n'))
  const env = { HOME: home, KIMI_CODE_HOME: path.join(home, '.kimi-code') }
  const config = readKimiConfig(path.join(home, '.kimi-code', 'config.toml'))
  assert.equal(config.permission.rules.length, 2)
  assert.equal(config.permission.dangerous_command_guard, true)
  assert.ok(kimiMustAsk({ tool: 'Bash', args: { command: 'git push --force' }, env }).reason.includes('permission rule'))
  assert.equal(kimiMustAsk({ tool: 'Bash', args: { command: 'echo hi' }, env }), null)
  const danger = kimiMustAsk({ tool: 'Bash', args: { command: 'rm -rf build' }, env })
  assert.equal(danger.always, true)
  for (const command of ['sudo rm -rf /', 'cd x && rm -fr src', 'bash -c "rm -rf src"', 'env A=1 shutdown -h now', 'dd if=x of=/dev/disk2', 'mkfs.ext4 /dev/sda', 'echo $(rm -rf ~)']) assert.ok(kimiDangerousCommand(command), command)
  for (const command of ['rm -rf /tmp/x', 'rm -r src', 'dd if=x of=/dev/null', 'echo rm -rf', 'ls -la']) assert.equal(kimiDangerousCommand(command), null, command)
  assert.equal(kimiMustAsk({ tool: 'Bash', args: { command: 'rm -rf build' }, env: { ...env, KIMI_CODE_DANGEROUS_COMMAND_GUARD: 'false' } }), null)
  assert.ok(kimiMustAsk({ tool: 'Write', args: { path: '/p/.git/hooks/pre-commit' }, paths: ['/p/.git/hooks/pre-commit'], cwd: '/p', env }))
  assert.ok(kimiMustAsk({ tool: 'Read', args: { path: '/p/.env' }, paths: ['/p/.env'], cwd: '/p', env }))
  assert.equal(kimiMustAsk({ tool: 'Read', args: { path: '/p/.env.example' }, paths: ['/p/.env.example'], cwd: '/p', env }), null)
  assert.equal(kimiSensitiveFile('/u/.aws/credentials'), true)
  assert.equal(kimiSensitiveFile('/u/.ssh/id_ed25519.pub'), false)
  assert.equal(kimiGitPath('/p/src/a.ts', '/p'), false)
  assert.ok(kimiAskRule([{ decision: 'ask', pattern: 'Read(src/**)' }], 'Read', { path: '/p/src/deep/a.ts' }, { cwd: '/p' }))
  assert.equal(kimiAskRule([{ decision: 'ask', pattern: 'Read(!src/**)' }], 'Read', { path: 'src/a.ts' }, { cwd: '/p' }), null)
  assert.equal(globRegExp('a{b,c}*').test('acx'), true)
})

test('Kimi in Auto: a dangerous command and a user ask rule reach the user; a routine command does not', async () => {
  const home = tmp()
  fs.mkdirSync(path.join(home, '.kimi-code'), { recursive: true })
  fs.writeFileSync(path.join(home, '.kimi-code', 'config.toml'), ['[[permission.rules]]', 'decision = "ask"', 'pattern = "Bash(echo RULE*)"', ''].join('\n'))
  const b = bridge({ home, onRequest: async () => ({ decision: 'decline' }) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const auto = { codeDesktop: { permissionMode: 'auto' } }
    await b.turn(thread.id, 'kimi-bash ls -la', auto)
    await b.turn(thread.id, 'kimi-bash rm -rf build', auto)
    await b.turn(thread.id, 'kimi-bash echo RULE_HIT > marker.txt', auto)
    const cards = b.requests.filter((request) => request.method === 'item/commandExecution/requestApproval')
    assert.equal(cards.length, 2)
    assert.match(cards[0].params.reason, /dangerous-command guard/)
    assert.equal(cards[0].params.sessionGrantable, false)
    assert.match(cards[1].params.reason, /permission rule/)
    const replies = b.notes.filter((note) => note.method === 'item/agentMessage/delta').map((note) => note.params.delta)
    assert.deepEqual(replies.filter((text) => text.startsWith('bash:')), ['bash:approve_once', 'bash:reject', 'bash:reject'])
  } finally { await b.close() }
})

test('stringified tool parts (Kimi ReadMediaFile, MCP images) become images, without the hidden reminder', () => {
  const parts = [{ type: 'text', text: '<image path="/p/pic.png">' }, { type: 'image_url', imageUrl: { url: 'data:image/png;base64,iVBORw0KGgo=' } }, { type: 'text', text: '</image>\n\n<system-reminder>\ninternal\n</system-reminder>' }]
  assert.deepEqual(expandToolParts([{ type: 'content', content: { type: 'text', text: JSON.stringify(parts) } }]), [{ type: 'content', content: { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo=' } }])
  const plain = [{ type: 'content', content: { type: 'text', text: '[{"a":1}]' } }]
  assert.equal(expandToolParts(plain), plain)
  const kimi = adapterById('kimi')
  assert.deepEqual(kimi.classify({ title: 'Reading media: /p/pic.png', kind: 'other', rawInput: { path: '/p/pic.png' } }), { type: 'read' })
  const projector = new ThreadProjector({ threadId: 't', cwd: '/p', classify: (call) => kimi.classify(call) })
  projector.startTurn({ input: [] })
  projector.apply({ sessionUpdate: 'tool_call', toolCallId: 'm1', title: 'Reading media: /p/pic.png', kind: 'other', status: 'in_progress', rawInput: { path: '/p/pic.png' } })
  const done = projector.apply({ sessionUpdate: 'tool_call_update', toolCallId: 'm1', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: JSON.stringify(parts) } }] })
  const item = done.find((note) => note.method === 'item/completed').params.item
  assert.equal(item.type, 'commandExecution')
  assert.deepEqual(item.outputImages, [{ type: 'inputImage', imageUrl: 'data:image/png;base64,iVBORw0KGgo=' }])
  assert.doesNotMatch(item.aggregatedOutput ?? '', /system-reminder|base64/)
  // An MCP result: image blocks.
  projector.apply({ sessionUpdate: 'tool_call', toolCallId: 'm2', title: 'mcp__browser__shot', kind: 'other', status: 'in_progress' })
  const mcp = projector.apply({ sessionUpdate: 'tool_call_update', toolCallId: 'm2', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: JSON.stringify(parts) } }] }).find((note) => note.method === 'item/completed').params.item
  assert.deepEqual(mcp.result.content, [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }])
})

test('Kimi skills: nested folders, sub-skill bundles and plugin skills are real skills', () => {
  const home = tmp()
  const kimiHome = path.join(home, '.kimi-code')
  const skill = (dir, name, extra = '') => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} skill\n${extra}---\nbody\n`) }
  skill(path.join(kimiHome, 'skills', 'top-one'), 'top-one')
  skill(path.join(kimiHome, 'skills', 'team', 'nested-two'), 'nested-two')
  skill(path.join(kimiHome, 'skills', 'bundle'), 'bundle', 'has-sub-skill: true\n')
  skill(path.join(kimiHome, 'skills', 'bundle', 'child'), 'child')
  skill(path.join(kimiHome, 'skills', 'plain'), 'plain')
  skill(path.join(kimiHome, 'skills', 'plain', 'hidden'), 'hidden')
  skill(path.join(kimiHome, 'skills', 'node_modules', 'dep'), 'dep')
  const root = path.join(kimiHome, 'plugins', 'managed', 'p1')
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'kimi.plugin.json'), JSON.stringify({ name: 'p1', skills: './skills/' }))
  skill(path.join(root, 'skills', 'plug-skill'), 'plug-skill')
  fs.writeFileSync(path.join(kimiHome, 'plugins', 'installed.json'), JSON.stringify({ version: 1, plugins: [{ id: 'p1@local', root, enabled: true }] }))
  const kimi = adapterById('kimi')
  const ctx = { env: { HOME: home, KIMI_CODE_HOME: kimiHome } }
  const skills = kimi.skills(ctx, null)
  assert.deepEqual(skills.map((entry) => entry.name).sort(), ['bundle', 'bundle.child', 'nested-two', 'plain', 'plug-skill', 'top-one'])
  assert.equal(skills.find((entry) => entry.name === 'plug-skill').pluginId, 'p1@local')
  const [plugin] = kimi.plugins(ctx)
  assert.deepEqual(kimi.pluginDetail(ctx, plugin).skills.map((entry) => entry.name), ['plug-skill'])
  // Flat roots stay as they were without `recursive`.
  assert.deepEqual(scanSkills([{ path: path.join(kimiHome, 'skills'), scope: 'user' }]).map((entry) => entry.name).sort(), ['bundle', 'plain', 'top-one'])
})

// ------------------------------------------------------------ Qwen

test('Qwen follows the UI language (QWEN_CODE_LANG) unless the user chose one', () => {
  assert.equal(qwenLanguage('zh-CN'), 'zh')
  assert.equal(qwenLanguage('en-US'), 'en')
  assert.equal(qwenLanguage('fr-FR'), null)
  const qwen = adapterById('qwen')
  const home = tmp()
  const launch = (env, user) => {
    fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
    fs.writeFileSync(path.join(home, '.qwen', 'settings.json'), JSON.stringify(user ?? {}))
    return qwen.launch({ env: { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json'), ...env } }, { threadDir: path.join(home, 't') }).env
  }
  assert.equal(launch({ CODE_DESKTOP_LOCALE: 'zh-CN' }).QWEN_CODE_LANG, 'zh')
  assert.equal(launch({ CODE_DESKTOP_LOCALE: 'zh-CN', QWEN_CODE_LANG: 'ja' }).QWEN_CODE_LANG, undefined)
  assert.equal(launch({ CODE_DESKTOP_LOCALE: 'zh-CN' }, { general: { language: 'en' } }).QWEN_CODE_LANG, undefined)
})

test('Qwen: Dynamic workflows turns on its own Workflow tool (system-scope tools.workflowsEnabled), part of the launch key', () => {
  const qwen = adapterById('qwen')
  assert.equal(qwen.workflowsInLaunch, true)
  const home = tmp()
  const overlay = (config, env = {}) => {
    const out = qwen.launch({ env: { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json'), ...env } }, { threadDir: path.join(home, 't'), ...config })
    return JSON.parse(fs.readFileSync(out.env.QWEN_CODE_SYSTEM_SETTINGS_PATH, 'utf8'))
  }
  assert.equal(overlay({ dynamicWorkflows: true }).tools.workflowsEnabled, true)
  // Off, missing (OpenClaude Desktop's engine chosen) or the user's QWEN_CODE_DISABLE_WORKFLOWS: forced off at system scope,
  // so a user's own settings.json (tools.workflowsEnabled: true) can't keep the native tool.
  fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
  fs.writeFileSync(path.join(home, '.qwen', 'settings.json'), JSON.stringify({ tools: { workflowsEnabled: true } }))
  assert.equal(overlay({ dynamicWorkflows: false }).tools.workflowsEnabled, false)
  assert.equal(overlay({}).tools.workflowsEnabled, false)
  assert.equal(overlay({ dynamicWorkflows: true }, { QWEN_CODE_DISABLE_WORKFLOWS: '1' }).tools.workflowsEnabled, false)
  // QWEN_CODE_ENABLE_WORKFLOWS=1 would win over settings (isWorkflowsEnabled): DISABLE wins over it.
  const launchEnv = (config, env) => qwen.launch({ env: { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json'), ...env } }, { threadDir: path.join(home, 't'), ...config }).env
  assert.equal(launchEnv({ dynamicWorkflows: false }, { QWEN_CODE_ENABLE_WORKFLOWS: '1' }).QWEN_CODE_DISABLE_WORKFLOWS, '1')
  assert.equal(launchEnv({ dynamicWorkflows: false }, {}).QWEN_CODE_DISABLE_WORKFLOWS, undefined)
  assert.equal(launchEnv({ dynamicWorkflows: true }, { QWEN_CODE_ENABLE_WORKFLOWS: '1' }).QWEN_CODE_DISABLE_WORKFLOWS, undefined)
  // An admin's own system settings keep their other tool settings.
  fs.writeFileSync(path.join(home, 'admin.json'), JSON.stringify({ tools: { useRipgrep: false } }))
  assert.deepEqual(overlay({ dynamicWorkflows: false }, { QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'admin.json') }).tools, { useRipgrep: false, sandbox: false, workflowsEnabled: false, todoWrite: { enabled: true } })
})

test('Qwen: Fork from here keeps the turns up to the chosen one (the fork is rewound); /cd moves the fork', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const first = await b.turn(thread.id, 'first question')
    await b.turn(thread.id, 'second question')
    await b.turn(thread.id, 'third question')
    const forked = await b.call('thread/fork', { threadId: thread.id, lastTurnId: first.id })
    const read = await b.call('thread/read', { threadId: forked.thread.id, includeTurns: true })
    assert.equal(read.thread.turns.length, 1)
    const rewind = b.agentLog().filter((entry) => entry.method === 'qwen/control/session/rewind')
    assert.deepEqual(rewind.map((entry) => [entry.params.sessionId, entry.params.targetTurnIndex]), [[forked.thread.id, 1]])
    const other = path.join(b.home, 'other')
    fs.mkdirSync(other)
    const moved = await b.call('thread/fork', { threadId: thread.id, cwd: other })
    assert.equal(moved.cwd, fs.realpathSync(other))
    assert.ok(b.agentLog().some((entry) => entry.method === 'qwen/control/session/cd' && entry.params.path === fs.realpathSync(other)))
  } finally { await b.close() }
})

test('Qwen workflows: the workflow tool call carries its run (phases, agents, tokens) and settles with the call', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    const init = await b.call('initialize', {})
    assert.equal(init.capabilities.modelWorkflows, true)
    assert.equal(init.capabilities.forkAtTurn, true)
    assert.equal(init.capabilities.forkCwd, true)
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'workflow')
    const runs = b.notes.filter((note) => note.params?.item?.workflowRun).map((note) => note.params.item.workflowRun)
    const withAgents = runs.find((run) => run.workflowProgress.some((entry) => entry.type === 'workflow_agent'))
    assert.ok(withAgents, 'the registry poll added agent cells')
    assert.deepEqual(withAgents.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((entry) => [entry.label, entry.state]), [['scan src', 'done'], ['scan docs', 'progress']])
    const last = runs.at(-1)
    assert.equal(last.id, 'wf_1234abcd')
    assert.equal(last.name, 'audit')
    assert.equal(last.status, 'completed')
    assert.deepEqual(last.workflowProgress.filter((entry) => entry.type === 'workflow_phase').map((entry) => entry.title), ['Scan', 'Report'])
    assert.equal((await b.call('codeDesktop/workflow/stop', { threadId: thread.id, runId: 'wf_1234abcd' })).status, 'alreadyFinished')
  } finally { await b.close() }
})

test('Qwen workflow runs: live display, registry entry, failure and background start', () => {
  const call = { toolCallId: 'c1', _meta: { toolName: 'workflow' }, rawInput: { name: 'saved' } }
  let run = qwenWorkflowRun(call, 1000)
  assert.deepEqual([run.id, run.name, run.status], ['call-c1', 'saved', 'running'])
  assert.equal(workflowDisplay('x ```json\n{"runId":"wf_1","phases":["A"]}\n```').runId, 'wf_1')
  run = workflowFromCall(run, call, { time: 2000, output: '```json\n{"runId":"wf_1","status":"running","currentPhase":"A","phases":["A"],"tokens":{"spent":50}}\n```' })
  assert.deepEqual([run.id, run.currentPhase, run.usage.totalTokens], ['wf_1', 0, 50])
  run = applyWorkflowTask(run, { kind: 'workflow', id: 'wf_1', status: 'running', phaseVisits: [{ id: 'v', index: 0, title: 'A' }], dispatches: [{ id: 'd', phaseVisitId: 'v', label: 'x', status: 'failed', error: 'boom', startedAt: 1, endedAt: 5 }], tokensSpent: 80 }, 3000)
  const agent = run.workflowProgress.find((entry) => entry.type === 'workflow_agent')
  assert.deepEqual([agent.state, agent.error, agent.durationMs, agent.phaseTitle], ['error', 'boom', 4, 'A'])
  const failed = workflowFromCall(run, call, { time: 4000, done: true, failed: true, output: 'Workflow failed: script threw' })
  assert.deepEqual([failed.status, failed.summary], ['failed', 'script threw'])
  const background = workflowFromCall(qwenWorkflowRun(call, 1), call, { time: 2, done: true, output: 'Workflow wf_9 started in the background (status: running).' })
  assert.deepEqual([background.status, background.background, background.id], ['running', true, 'wf_9'])
  const cancelled = applyWorkflowTask(background, { kind: 'workflow', id: 'wf_9', status: 'cancelled', endTime: 10 }, 11)
  assert.equal(cancelled.status, 'stopped')
})

test('Qwen workflow runs: Stop is turn-wide only until Qwen names the run; a run Qwen dropped settles as lost', () => {
  const call = { toolCallId: 'c2', _meta: { toolName: 'workflow' }, rawInput: { run_in_background: true } }
  const fresh = qwenWorkflowRun(call, 1)
  assert.equal(fresh.stopScope, 'turn')
  const named = workflowFromCall(fresh, call, { time: 2, done: true, output: 'Workflow wf_7 started in the background (status: running).' })
  assert.deepEqual([named.runId, named.stopScope], ['wf_7', undefined])
  const lost = workflowLost(named, 50)
  assert.deepEqual([lost.status, lost.completedAt, lost.durationMs], ['failed', 50, 49])
  assert.match(lost.summary, /no longer reports this run/)
  assert.equal(workflowLost(lost, 60), lost)
})

test('Qwen background workflows: a run Qwen\'s registry dropped stops being running and the poll ends; a retained finished one completes', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const settledRun = async (runId) => (await b.waitFor((method, params) => params?.item?.workflowRun?.runId === runId && params.item.workflowRun.status !== 'running', 10000)).item.workflowRun
    await b.turn(thread.id, 'workflow-bg-lost')
    const lost = await settledRun('wf_bb10')
    assert.equal(lost.status, 'failed')
    assert.equal(lost.background, true)
    assert.match(lost.summary, /no longer reports this run/)
    await b.turn(thread.id, 'workflow-bg-done')
    const done = await settledRun('wf_bb20')
    assert.equal(done.status, 'completed')
    assert.equal(done.usage.totalTokens, 30)
    // Nothing live: the 1.5 s registry poll has stopped.
    await new Promise((resolve) => setTimeout(resolve, 1700))
    const polls = () => b.agentLog().filter((entry) => entry.method === 'qwen/status/session/tasks' && entry.params?.includeWorkflows).length
    const before = polls()
    await new Promise((resolve) => setTimeout(resolve, 3200))
    assert.equal(polls(), before)
  } finally { await b.close() }
})

test('Qwen workflow runs: a named live run pauses and resumes through Qwen\'s workflow-action; a settled one has no pause', async () => {
  const call = { toolCallId: 'c3', _meta: { toolName: 'workflow' }, rawInput: { run_in_background: true } }
  const named = workflowFromCall(qwenWorkflowRun(call, 1), call, { time: 2, done: true, output: 'Workflow wf_8 started in the background (status: running).' })
  assert.equal(named.pauseControls, true)
  const paused = applyWorkflowTask(named, { kind: 'workflow', id: 'wf_8', status: 'paused' }, 3)
  assert.deepEqual([paused.status, paused.paused], ['running', true])
  const resumed = applyWorkflowTask(paused, { kind: 'workflow', id: 'wf_8', status: 'running' }, 4)
  assert.equal(resumed.paused, undefined)
  const ended = applyWorkflowTask(paused, { kind: 'workflow', id: 'wf_8', status: 'completed', endTime: 5 }, 5)
  assert.deepEqual([ended.status, ended.paused, ended.pauseControls], ['completed', undefined, undefined])

  const b = bridge({ adapter: adapterById('qwen') })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'workflow-bg-pause')
    const live = (await b.waitFor((method, params) => params?.item?.workflowRun?.runId === 'wf_bb30' && params.item.workflowRun.pauseControls === true, 10000)).item.workflowRun
    assert.equal(live.status, 'running')
    assert.deepEqual(await b.call('codeDesktop/workflow/pause', { threadId: thread.id, runId: 'wf_bb30', paused: true }), { paused: true })
    assert.ok(b.agentLog().some((entry) => entry.method === 'qwen/control/session/task/workflow-action' && entry.params.action === 'pause' && entry.params.taskId === 'wf_bb30'))
    await b.waitFor((method, params) => params?.item?.workflowRun?.runId === 'wf_bb30' && params.item.workflowRun.paused === true, 10000)
    assert.deepEqual(await b.call('codeDesktop/workflow/pause', { threadId: thread.id, runId: 'wf_bb30', paused: false }), { paused: false })
    assert.ok(b.agentLog().some((entry) => entry.method === 'qwen/control/session/task/workflow-action' && entry.params.action === 'resume'))
    await assert.rejects(b.call('codeDesktop/workflow/pause', { threadId: thread.id, runId: 'wf_nope', paused: true }), /Unknown workflow run/)
    assert.deepEqual(await b.call('codeDesktop/workflow/stop', { threadId: thread.id, runId: 'wf_bb30' }), { status: 'stopping' })
  } finally { await b.close() }
})

// ------------------------------------------------------------ Gemini

test('Gemini silent stops: no reply fails the turn with Gemini\'s explanation; a stop after tools gets a note', async () => {
  const b = bridge({ adapter: adapterById('gemini') })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const empty = await b.turn(thread.id, 'silent-empty')
    assert.equal(empty.status, 'failed')
    assert.match(empty.error.message, /^Gemini CLI ended the turn without a reply\. The response was likely blocked/)
    const afterTool = await b.turn(thread.id, 'silent-after-tool')
    assert.equal(afterTool.status, 'completed')
    const note = b.notes.find((entry) => entry.method === 'item/completed' && entry.params.turnId === afterTool.id && entry.params.item.type === 'agentMessage')
    assert.match(note?.params.item.text ?? '', /ended the turn without a final reply/)
    const normal = await b.turn(thread.id, 'hello')
    assert.equal(normal.status, 'completed')
  } finally { await b.close() }
})

test('Gemini plan review: the plan path may hold spaces; a custom plans folder is found and writable in Plan mode', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const state = path.join(home, 'Application Support', 'OpenClaude Desktop', 'state')
  const plans = path.join(state, 'threads', 't1', 'gemini-home', '.gemini', 'tmp', 'proj', 't1', 'plans')
  fs.mkdirSync(plans, { recursive: true })
  fs.writeFileSync(path.join(plans, 'feature.md'), '# The plan')
  const ctx = { env: { HOME: home }, stateDir: state }
  const params = (title) => ({ toolCall: { toolCallId: 'exit_plan_mode-1', title } })
  assert.equal(gemini.planExit(params(`Requesting plan approval for: ${path.join(plans, 'feature.md')}`), { ctx, thread: { id: 't1', cwd: home } }).plan, '# The plan')
  const project = path.join(home, 'My Project')
  fs.mkdirSync(path.join(project, 'docs', 'specs'), { recursive: true })
  fs.mkdirSync(path.join(project, '.gemini'))
  fs.writeFileSync(path.join(project, '.gemini', 'settings.json'), JSON.stringify({ general: { plan: { directory: 'docs/specs' } } }))
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  fs.writeFileSync(path.join(home, '.gemini', 'settings.json'), JSON.stringify({ security: { folderTrust: { enabled: false } } }))
  fs.writeFileSync(path.join(project, 'docs', 'specs', 'feature.md'), '# Spec plan')
  const env = { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  assert.equal(geminiPlanDirectory(env, project), path.join(project, 'docs', 'specs'))
  assert.equal(gemini.planExit(params(`Requesting plan approval for: ${path.join(project, 'docs', 'specs', 'feature.md')}`), { ctx: { env, stateDir: state }, thread: { id: 't2', cwd: project } }).plan, '# Spec plan')
  // Newest plan in the folder when the named file is gone.
  assert.equal(gemini.planExit(params('Requesting plan approval for: gone.md'), { ctx: { env, stateDir: state }, thread: { id: 't2', cwd: project } }).plan, '# Spec plan')
  assert.deepEqual(gemini.ownWritePaths({ env }, { cwd: project }), [path.join(project, 'docs', 'specs')])
})

test('Gemini connectors: mcp.allowed, excluded, enablement names in lower case, admin switches and required servers', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  const system = path.join(home, 'system.json')
  const env = { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: system }
  fs.writeFileSync(path.join(home, '.gemini', 'settings.json'), JSON.stringify({ mcp: { allowed: ['alpha', 'GitHub'] }, mcpServers: { alpha: { command: 'a' }, beta: { command: 'b' }, GitHub: { command: 'g' } } }))
  fs.writeFileSync(path.join(home, '.gemini', 'mcp-server-enablement.json'), JSON.stringify({ github: { enabled: false } }))
  let servers = Object.fromEntries(gemini.mcpServers({ env }, null).map((server) => [server.name, server]))
  assert.equal(servers.alpha.disabled, false)
  assert.equal(servers.beta.disabled, true)
  assert.match(servers.beta.disabledReason, /mcp\.allowed/)
  assert.equal(servers.GitHub.disabled, true)
  assert.equal(servers.GitHub.disabledReason, undefined)
  // Every layer's mcp.allowed counts (their intersection), required servers included.
  fs.writeFileSync(system, JSON.stringify({ admin: { mcp: { requiredConfig: { corp: { url: 'https://corp.example/mcp' } } } }, mcp: { allowed: ['alpha', 'corp', 'github'] } }))
  fs.writeFileSync(path.join(home, '.gemini', 'settings.json'), JSON.stringify({ mcp: { allowed: ['alpha', 'corp'] }, mcpServers: { alpha: { command: 'a' }, beta: { command: 'b' }, GitHub: { command: 'g' } } }))
  servers = Object.fromEntries(gemini.mcpServers({ env }, null).map((server) => [server.name, server]))
  assert.equal(servers.corp.url, 'https://corp.example/mcp')
  assert.equal(servers.corp.disabled, false)
  assert.equal(servers.GitHub.blocked, 'settings')
  fs.writeFileSync(system, JSON.stringify({ admin: { mcp: { enabled: false } } }))
  assert.ok(gemini.mcpServers({ env }, null).every((server) => server.disabled && server.blocked === 'organization'))
})

test('Gemini extensions: per-project rules (last match wins) and the scope of enable / disable', async () => {
  assert.equal(extensionEnabledAt(['!/Users/someone/projA/*'], '/Users/someone/projB'), true)
  assert.equal(extensionEnabledAt(['!/Users/someone/projA/*'], '/Users/someone/projA/sub'), false)
  assert.equal(extensionEnabledAt(['!/Users/someone/*', '/Users/someone/projA/*'], '/Users/someone/projA'), true)
  const gemini = adapterById('gemini')
  const home = tmp()
  const ext = path.join(home, '.gemini', 'extensions', 'ext1')
  fs.mkdirSync(ext, { recursive: true })
  fs.writeFileSync(path.join(ext, 'gemini-extension.json'), JSON.stringify({ name: 'ext1', mcpServers: { extsrv: { command: 'x' } } }))
  fs.writeFileSync(path.join(home, '.gemini', 'extensions', 'extension-enablement.json'), JSON.stringify({ ext1: { overrides: [`!${home}/projA/*`] } }))
  const env = { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  assert.equal(gemini.extensions({ env }, path.join(home, 'projB'))[0].enabled, true)
  assert.equal(gemini.extensions({ env }, path.join(home, 'projA'))[0].enabled, false)
  assert.ok(gemini.mcpServers({ env }, path.join(home, 'projB')).some((server) => server.name === 'extsrv'))
  const [summary] = gemini.plugins({ env }, path.join(home, 'projA'))
  assert.deepEqual([summary.enabled, summary.codeDesktop.enablement.everywhere, summary.codeDesktop.enablement.projectOverride], [false, true, true])
  let ran = null
  const ctx = { env, commandLine: (args) => { ran = args; return { command: process.execPath, args: ['-e', ''] } } }
  fs.mkdirSync(path.join(home, 'projA'))
  await gemini.pluginCommand(ctx, 'disable', 'ext1', { scope: 'workspace', cwd: path.join(home, 'projA') })
  assert.deepEqual(ran, ['extensions', 'disable', '--scope', 'workspace', 'ext1'])
  await gemini.pluginCommand(ctx, 'enable', 'ext1')
  assert.deepEqual(ran, ['extensions', 'enable', 'ext1'])
})

test('Gemini built-in skills: <bundle>/builtin next to the binary, listed as system skills', () => {
  const root = tmp()
  const bundle = path.join(root, 'bundle')
  fs.mkdirSync(path.join(bundle, 'builtin', 'skill-creator'), { recursive: true })
  fs.writeFileSync(path.join(bundle, 'gemini.js'), '')
  fs.writeFileSync(path.join(bundle, 'builtin', 'skill-creator', 'SKILL.md'), '---\nname: skill-creator\ndescription: makes skills\n---\n')
  assert.equal(geminiBuiltinSkillsDir({ binary: path.join(bundle, 'gemini.js') }), path.join(bundle, 'builtin'))
  const gemini = adapterById('gemini')
  const home = tmp()
  const skills = gemini.skills({ env: { HOME: home }, program: { binary: path.join(bundle, 'gemini.js') } }, null)
  const builtin = skills.find((entry) => entry.name === 'skill-creator')
  assert.equal(builtin.scope, 'system')
})

// ------------------------------------------------------------ MiniMax

test('MiniMax: rm stays in the sandbox, shell rc files are never written, todos fill the plan, usage-limit errors are named', () => {
  const minimax = adapterById('minimax')
  const home = tmp()
  const extras = minimax.sandboxExtras({ env: { HOME: home } })
  assert.deepEqual(extras.denyWrite, [path.join(home, '.zshrc'), path.join(home, '.bashrc')])
  assert.deepEqual(extras.extraWritable, [path.join(home, '.Trash')])
  const profile = seatbeltProfile({ profile: 'workspace-write', writable: ['/w'], agentPaths: [], home, ...extras })
  assert.match(profile, /\(deny file-write\*\n\s+\(literal "[^"]*\.bashrc"\)/)
  assert.ok(profile.indexOf('(deny file-write*\n') > profile.indexOf('(allow file-write*'), 'the rc deny comes last')
  assert.match(profile, /\.Trash/)
  assert.doesNotMatch(seatbeltProfile({ profile: 'read-only', writable: ['/w'], agentPaths: [], home, ...extras }), /\.Trash/)
  if (sandboxAvailable()) {
    const dir = tmp()
    const bypass = wrapLaunch({ command: '/bin/echo', args: ['x'] }, { profile: 'none', writable: [], agentPaths: [], profileFile: path.join(dir, 'b.sb'), denyWrite: extras.denyWrite })
    assert.equal(bypass.sandboxed, false)
    assert.equal(bypass.command, '/usr/bin/sandbox-exec')
    assert.match(fs.readFileSync(path.join(dir, 'b.sb'), 'utf8'), /\(allow default\)\n\(deny file-write\*/)
  }
  assert.deepEqual(minimax.classify({ title: 'todowrite', kind: 'edit' }), { type: 'other', tool: 'todo_write' })
  assert.deepEqual(minimax.toolPlan({}, 's', { title: 'todowrite', rawInput: { todos: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'cancelled' }, { content: 'c', status: 'in_progress' }] } }).map((entry) => [entry.content, entry.status]), [['a', 'completed'], ['~~b~~', 'completed'], ['c', 'in_progress']])
  assert.equal(minimax.toolPlan({}, 's', { title: 'bash' }), undefined)
  const limit = minimax.errorInfo('Internal error: MiniMax Code Runtime failed: BYOK provider custom_provider:local upstream error: 429 usage limit exceeded (2056)')
  assert.deepEqual(limit, { codexErrorInfo: 'usageLimitExceeded', message: '429 usage limit exceeded (2056)' })
  assert.equal(minimax.errorInfo('upstream error: insufficient balance (1008)').additionalDetails, 'BILLING')
  assert.equal(minimax.errorInfo('something else'), null)
})

test('MiniMax: a project connector switched off is denied in the thread permission.json, in every mode', () => {
  const file = threadPermissionFile({ version: 2, allow: [{ tool_name: 'read', matcher: { kind: 'tool' } }] }, null, ['userserver'], ['projsrv'])
  assert.deepEqual(file.deny, [{ tool_name: 'mcp__projsrv', matcher: { kind: 'tool' } }])
  assert.deepEqual(file.ask, [])
  assert.equal(file.allow.length, 1)
  const strict = threadPermissionFile({}, 'ask', ['userserver'], ['projsrv'])
  assert.ok(strict.ask.some((rule) => rule.tool_name === 'mcp__userserver'))
  assert.deepEqual(strict.allow, [])
  const minimax = adapterById('minimax')
  const home = tmp()
  const cwd = path.join(home, 'proj')
  fs.mkdirSync(cwd)
  fs.writeFileSync(path.join(cwd, '.mcp.json'), JSON.stringify({ mcpServers: { projsrv: { command: 'x' } } }))
  const launch = minimax.launch({ env: { HOME: home, MINIMAX_DATA_DIR: path.join(home, '.minimax') }, log: () => {} }, { threadDir: path.join(home, 'thread'), cwd, disabledServers: ['projsrv'], sandbox: 'workspace-write', disabledTools: [] })
  assert.equal(launch.env.MAVIS_TRASH_FORCE_MV, '1')
  const written = JSON.parse(fs.readFileSync(path.join(launch.env.MINIMAX_DATA_DIR, 'permission.json'), 'utf8'))
  assert.deepEqual(written.deny, [{ tool_name: 'mcp__projsrv', matcher: { kind: 'tool' } }])
  const bypass = minimax.launch({ env: { HOME: home, MINIMAX_DATA_DIR: path.join(home, '.minimax') }, log: () => {} }, { threadDir: path.join(home, 'thread2'), cwd, sandbox: 'none', disabledTools: [] })
  assert.equal(bypass.env.MAVIS_TRASH_FORCE_MV, undefined)
})

test('MiniMax: OpenClaude Desktop\'s tools server goes in the thread\'s own mcp.json with a 10-minute timeout, never the user\'s home', () => {
  const minimax = adapterById('minimax')
  assert.equal(minimax.appToolsInLaunch, true)
  const home = tmp()
  const real = path.join(home, '.minimax')
  fs.mkdirSync(real, { recursive: true })
  fs.writeFileSync(path.join(real, 'mcp.json'), JSON.stringify({ mcpServers: { mine: { command: 'mine' } } }))
  const ctx = { env: { HOME: home, MINIMAX_DATA_DIR: real }, log: () => {} }
  const entry = { name: 'code_desktop', command: '/bin/node', args: ['/x/server.mjs'], env: { CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'scoped', CODE_DESKTOP_AGENT_SESSION: 't1' } }
  const launch = minimax.launch(ctx, { threadDir: path.join(home, 'thread'), cwd: home, sandbox: 'workspace-write', disabledTools: [], disabledServers: [], appToolsEntry: entry })
  assert.equal(launch.appToolsInLaunch, true)
  const written = JSON.parse(fs.readFileSync(path.join(launch.env.MINIMAX_DATA_DIR, 'mcp.json'), 'utf8'))
  assert.deepEqual(written.mcpServers.code_desktop, { command: '/bin/node', args: ['/x/server.mjs'], env: entry.env, timeout: 600000 })
  assert.deepEqual(written.mcpServers.mine, { command: 'mine' }, 'the user\'s own servers stay')
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(real, 'mcp.json'), 'utf8')).mcpServers), ['mine'], 'the user\'s file is untouched')
  // A session of the user's own mcode (their real home) and a utility process get it as an ACP server instead.
  assert.equal(minimax.launch(ctx, { threadDir: path.join(home, 'thread2'), cwd: home, sandbox: 'workspace-write', disabledTools: [], disabledServers: [], agentHome: 'real', appToolsEntry: entry }).appToolsInLaunch, undefined)
  assert.equal(minimax.launch(ctx, { threadDir: path.join(home, 'thread3'), cwd: home, sandbox: 'workspace-write', disabledTools: [], disabledServers: [] }).appToolsInLaunch, undefined)
})

test('MiniMax questionnaires: the field title is the question (never cut), the message only the card header', async () => {
  const b = bridge({ onRequest: async (method, params) => (method === 'item/tool/requestUserInput' ? { answers: { [params.questions[0].id]: { answers: ['Deploy'] } } } : {}) })
  try {
    const init = await b.call('initialize', {})
    assert.equal(init.capabilities.modelWorkflows, false)
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'mm-ask')
    const card = b.requests.find((request) => request.method === 'item/tool/requestUserInput').params.questions
    assert.equal(card.length, 1)
    assert.match(card[0].question, /^Deploy the site in \.\/dist to the public URL https:\/\/foo\.minimax\.io as a new public release, replacing the current version\?\n\nThis replaces what visitors see now\.$/)
    assert.equal(card[0].header, 'Confirm deploy')
    assert.equal(card[0].isOther, true)
    const reply = b.notes.filter((note) => note.method === 'item/agentMessage/delta').map((note) => note.params.delta).join('')
    assert.match(reply, /"q1_deploy":"yes"/)
  } finally { await b.close() }
})

test('MiniMax global instructions stay within mcode\'s 32 KiB: the user\'s file whole, OpenClaude Desktop\'s part cut with a note', () => {
  const small = minimaxGlobalInstructions('mine', 'ours')
  assert.deepEqual(small, { text: 'mine\n\nours', truncated: false, ownDropped: false })
  const long = minimaxGlobalInstructions('MY RULES', '界'.repeat(20000))
  assert.equal(long.truncated, true)
  assert.ok(Buffer.byteLength(long.text) <= MINIMAX_GLOBAL_MAX_BYTES)
  assert.ok(long.text.startsWith('MY RULES\n\n界'))
  assert.match(long.text, /truncated to fit MiniMax Code’s 32 KiB limit/)
  assert.equal(long.text.includes('\uFFFD'), false)
  const ownTooBig = minimaxGlobalInstructions('x'.repeat(40000), 'ours')
  assert.deepEqual(ownTooBig, { text: 'ours', truncated: false, ownDropped: true })
})

test('Qwen sign-out removes only the keys OpenClaude Desktop saved, with the models that read them', () => {
  const home = tmp()
  const env = { HOME: home, CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state') }
  fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
  fs.mkdirSync(env.CODE_DESKTOP_BRIDGE_STATE, { recursive: true })
  const file = path.join(home, '.qwen', 'settings.json')
  fs.writeFileSync(file, JSON.stringify({ env: { DASHSCOPE_API_KEY: 'mine', OWN_KEY: 'keep' }, modelProviders: { openai: [{ id: 'qwen3.7-plus', envKey: 'DASHSCOPE_API_KEY' }, { id: 'own', envKey: 'OWN_KEY' }], anthropic: [{ id: 'x', envKey: 'DASHSCOPE_API_KEY' }] } }))
  const qwen = adapterById('qwen')
  assert.throws(() => qwen.logout({ env }), /saved no Qwen Code key/)
  fs.writeFileSync(path.join(env.CODE_DESKTOP_BRIDGE_STATE, 'qwen-provider-keys.json'), JSON.stringify({ envKeys: ['DASHSCOPE_API_KEY'] }))
  qwen.logout({ env })
  const after = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.deepEqual(after.env, { OWN_KEY: 'keep' })
  assert.deepEqual(after.modelProviders, { openai: [{ id: 'own', envKey: 'OWN_KEY' }] })
})

test('Kimi /feedback posts to its managed /feedback with the signed-in token; signed out it says so', async () => {
  const http = await import('node:http')
  const seen = []
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw || '{}') })
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"feedback_id": 42}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const home = tmp()
    const kimiHome = path.join(home, '.kimi-code')
    fs.mkdirSync(path.join(kimiHome, 'credentials'), { recursive: true })
    const env = { HOME: home, KIMI_CODE_HOME: kimiHome, KIMI_CODE_BASE_URL: `http://127.0.0.1:${server.address().port}/coding/v1` }
    const kimi = adapterById('kimi')
    await assert.rejects(kimi.feedback({ env }, { classification: 'bug', reason: 'x' }), /Sign in with Kimi Code/)
    fs.writeFileSync(path.join(kimiHome, 'credentials', 'kimi-code.json'), JSON.stringify({ access_token: 'tok' }))
    const result = await kimi.feedback({ env }, { classification: 'bad_result', reason: 'Wrong file edited', threadId: 's1', model: 'k3' })
    assert.deepEqual(result, { threadId: 's1', feedbackId: '42' })
    assert.equal(seen[0].url, '/coding/v1/feedback')
    assert.equal(seen[0].auth, 'Bearer tok')
    assert.equal(seen[0].body.content, '[bad_result] Wrong file edited')
    assert.equal(seen[0].body.session_id, 's1')
  } finally { server.close() }
})

test('Qwen report_findings is a review result (severity order, file:line), and tool _meta.artifacts ride the settled item', () => {
  const qwen = adapterById('qwen')
  const call = { toolCallId: 'f1', title: 'report_findings', kind: 'other', _meta: { toolName: 'report_findings' }, rawInput: { level: 'high', findings: [
    { severity: 'Suggestion', file: '/w/b.js', line: 3, summary: 'Rename x' },
    { severity: 'Critical', file: '/w/a.js', line: 12, summary: 'Null deref', failureScenario: 'Empty input crashes', outcome: 'fixed' }] } }
  const item = acpToolItem(call, { cwd: '/w', classify: (c) => qwen.classify(c) })
  assert.equal(item.type, 'exitedReviewMode')
  assert.ok(item.review.indexOf('**Critical**') < item.review.indexOf('**Suggestion**'))
  assert.match(item.review, /`a\.js:12` — Null deref _\(fixed\)_\n  Empty input crashes/)
  assert.equal(findingsReview({ findings: [] }), 'No findings.')
  const write = { toolCallId: 'w1', title: 'write_file', kind: 'other', rawInput: {}, _meta: { artifacts: [{ title: 'report.html', kind: 'html', storage: 'workspace', workspacePath: 'report.html' }, { title: 'PR', kind: 'link', storage: 'external_url', url: 'https://github.com/a/b/pull/1' }] } }
  const done = acpCompleteToolItem({ type: 'dynamicToolCall', id: 'w1', tool: 'write_file', status: 'inProgress' }, write, { failed: false, cwd: '/w' })
  assert.deepEqual(done.codeDesktop.artifacts, [{ title: 'report.html', kind: 'html', path: '/w/report.html' }, { title: 'PR', kind: 'link', url: 'https://github.com/a/b/pull/1' }])
})

test('Qwen managed skills, extension update, connector sign-in and sign-out go through its own ACP methods and CLI', async () => {
  const qwen = adapterById('qwen')
  const calls = []
  const host = { call: async (method, params) => { calls.push([method, params]); return method === 'qwen/control/workspace/mcp/manage' && params.action === 'authenticate' ? { ok: true, pending: true, authUrl: 'https://auth.example/authorize?x=1' } : method === 'qwen/status/workspace/mcp' ? { servers: [{ name: 'linear', authenticationState: 'succeeded' }] } : { ok: true } } }
  const ctx = { env: { HOME: tmp() }, utility: async () => host }
  await qwen.installSkill(ctx, { url: 'https://example.com/SKILL.md', slug: 'mine' })
  await qwen.deleteSkill(ctx, { slug: 'mine' })
  assert.deepEqual(calls.filter(([method]) => method.startsWith('qwen/skills/')), [
    ['qwen/skills/install', { skill: { slug: 'mine', sourceUrl: 'https://example.com/SKILL.md', scope: 'global' } }],
    ['qwen/skills/delete', { skill: { slug: 'mine', scope: 'global' } }]])
  assert.deepEqual(await qwen.mcpLogin(ctx, { name: 'linear' }), { authorizationUrl: 'https://auth.example/authorize?x=1' })
  assert.deepEqual(await qwen.mcpLoginStatus(ctx, { name: 'linear' }), { state: 'succeeded', error: null })
  await qwen.mcpLogout(ctx, { name: 'linear' })
  assert.deepEqual(calls.at(-1), ['qwen/control/workspace/mcp/manage', { serverName: 'linear', action: 'clear-auth' }])
  assert.equal(qwen.pluginUpdate, true)
})
