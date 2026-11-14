// Parity tests for the ACP bridge (harness/packages/acp-bridge): what each agent supports reaches OpenClaude Desktop.
// Server flows run against a scripted ACP agent (packages/acp-bridge/testing/fake-acp-agent.mjs); adapter
// details against files laid out as each agent writes them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { commandSkills, normalizeMcpServer } from '../packages/acp-bridge/src/catalog.js'
import { probeMcpServer, clearMcpCache } from '../packages/acp-bridge/src/mcp-probe.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { readKimiConfig, kimiModelInfo, compactionNotice, readUsageSince } from '../packages/acp-bridge/src/agents/kimi.js'
import { skillFrontmatterEnabled } from '../packages/acp-bridge/src/agents/qwen.js'
import { tomlStrings } from '../packages/acp-bridge/src/agents/gemini.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-parity-')))
const kimi = adapterById('kimi')

/** A bridge on the scripted agent, driven like OpenClaude Desktop's client. */
function bridge({ adapter = kimi, env = {}, answer, home = tmp() } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const fullEnv = {
    PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
    CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
    FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), ...env,
  }
  const server = serve({ input: toServer, output: toClient, env: fullEnv, adapter, log: () => {} })
  const notes = []
  const waiters = []
  const client = new LineTransport(toClient, toServer, {
    onRequest: async (method, params) => (answer ? answer(method, params) : {}),
    onNotification: (method, params) => {
      notes.push({ method, params })
      for (const waiter of [...waiters]) if (waiter.test(method, params)) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(params) }
    },
    log: () => {},
  })
  client.start()
  const waitFor = (test, timeoutMs = 15000) => {
    const found = notes.find((note) => test(note.method, note.params))
    if (found) return Promise.resolve(found.params)
    return new Promise((resolve, reject) => {
      const waiter = { test, resolve }
      waiters.push(waiter)
      setTimeout(() => { if (waiters.includes(waiter)) { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('timed out waiting for a notification')) } }, timeoutMs).unref?.()
    })
  }
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text, extra = {}) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], ...extra })
    const done = await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)
    return done.turn
  }
  const replyText = (turnId) => notes.filter((note) => note.method === 'item/completed' && note.params.turnId === turnId && note.params.item.type === 'agentMessage').map((note) => note.params.item.text).join('')
  return { home, kimiHome, call, turn, notes, waitFor, agentLog, replyText, close: () => server.shutdown() }
}

test('model/list gives each model its own efforts, read from the agent at discovery', async () => {
  const b = bridge()
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { data } = await b.call('model/list', {})
    const efforts = Object.fromEntries(data.map((model) => [model.id, model.supportedReasoningEfforts.map((effort) => effort.reasoningEffort)]))
    assert.deepEqual(efforts, { 'm-plain': [], 'm-toggle': ['off', 'on'], 'm-effort': ['off', 'low', 'medium', 'high'] })
    assert.equal(data.find((model) => model.id === 'm-effort').defaultReasoningEffort, 'medium')
    assert.equal(data.find((model) => model.id === 'm-plain').defaultReasoningEffort, null)
    // Discovery never touches the agent's persisted default model.
    assert.equal(b.agentLog().filter((entry) => entry.method === 'session/set_model').length, 0)
  } finally { await b.close() }
})

test('a model or effort picked in an open session applies at the next turn, through the session\'s model option', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const started = await b.call('thread/start', { cwd: b.home, model: 'm-effort', effort: 'high' })
    assert.equal(started.reasoningEffort, 'high')
    const id = started.thread.id
    const first = await b.turn(id, 'hello')
    assert.equal(b.replyText(first.id), 'ok:m-effort:high')
    const second = await b.turn(id, 'again', { model: 'm-toggle', effort: 'on' })
    assert.equal(b.replyText(second.id), 'ok:m-toggle:on')
    // An effort the new model lacks is not sent (the model's own default stays).
    const third = await b.turn(id, 'plain now', { model: 'm-plain', effort: 'high' })
    assert.equal(b.replyText(third.id), 'ok:m-plain:null')
    const log = b.agentLog()
    assert.equal(log.filter((entry) => entry.method === 'session/set_model').length, 0)
    assert.ok(log.some((entry) => entry.method === 'session/set_config_option' && entry.params.configId === 'model' && entry.params.value === 'm-toggle'))
    assert.ok(!log.some((entry) => entry.method === 'session/set_config_option' && entry.params.configId === 'thinking' && entry.params.value === 'high' && log.indexOf(entry) > log.findIndex((other) => other.params?.value === 'm-plain')))
  } finally { await b.close() }
})

test('a questionnaire arrives whole: every question, multi-select, option descriptions', async () => {
  let asked = null
  const b = bridge({ answer: (method, params) => {
    if (method !== 'item/tool/requestUserInput') return {}
    asked = params
    return { answers: { q0: { answers: ['Red', 'Blue'] }, q1: { answers: ['L'] } } }
  } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const done = await b.turn(thread.id, 'ask')
    assert.equal(asked.questions.length, 2)
    assert.deepEqual(asked.questions.map((question) => [question.header, question.question, question.multiSelect, question.isOther]), [['Color', 'Pick a color?', true, false], ['Size', 'Pick a size?', false, false]])
    assert.deepEqual(asked.questions[0].options, [{ label: 'Red', description: 'warm' }, { label: 'Blue', description: 'cool' }])
    assert.equal(b.replyText(done.id), `answer:${JSON.stringify({ action: 'accept', content: { q0: ['Red', 'Blue'], q1: 'L' } })}`)
  } finally { await b.close() }
})

test('a background compaction keeps its turn open until the agent reports the result', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'hello')
    const before = Date.now()
    await b.call('thread/compact/start', { threadId: thread.id })
    const started = await b.waitFor((method, params) => method === 'item/started' && params.item.type === 'contextCompaction')
    const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.turnId)
    assert.equal(done.turn.status, 'completed')
    assert.ok(Date.now() - before >= 250, 'the turn waited for the compaction result')
    const usage = b.notes.filter((note) => note.method === 'thread/tokenUsage/updated').at(-1).params.tokenUsage
    assert.equal(usage.last.totalTokens, 200)
    // The acknowledgement and the result are not reply text.
    assert.equal(b.replyText(started.turnId), '')
  } finally { await b.close() }
})

test('Kimi turn tokens come from the session\'s usage records', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    // Kimi persists the records with the turn's end, a moment after the prompt returns: the totals follow it.
    const done = await b.turn(thread.id, 'usage')
    const { tokenUsage: usage } = await b.waitFor((method, params) => method === 'thread/tokenUsage/updated' && params.turnId === done.id && params.tokenUsage.total.inputTokens > 0)
    assert.deepEqual([usage.total.inputTokens, usage.total.cachedInputTokens, usage.total.outputTokens], [175, 20, 40])
    const account = await b.call('account/usage/read', {})
    assert.equal(account.summary.lifetimeTokens, 215)
    // The next turn counts only what it added.
    const next = await b.turn(thread.id, 'usage')
    const { tokenUsage: after } = await b.waitFor((method, params) => method === 'thread/tokenUsage/updated' && params.turnId === next.id && params.tokenUsage.total.inputTokens > 175)
    assert.equal(after.total.inputTokens, 350)
  } finally { await b.close() }
})

test('MiniMax delegations become child threads that can be opened and stopped', async () => {
  const adapter = {
    ...kimi,
    classify: (call) => (call.title === 'task' ? { type: 'subagent', label: call.rawInput?.description, prompt: call.rawInput?.prompt } : kimi.classify(call)),
    stopDelegation: async (ctx, host, sessionId) => host.call('mcode/session/delegation/stop', { sessionId }, 5000),
  }
  const b = bridge({ adapter })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const done = await b.turn(thread.id, 'delegate')
    const child = await b.waitFor((method, params) => method === 'thread/started' && params.thread.id === 'child-1')
    assert.equal(child.thread.parentThreadId, thread.id)
    assert.equal(child.thread.agentNickname, 'worker')
    const call = done.items?.find?.((item) => item.type === 'collabAgentToolCall') ?? b.notes.filter((note) => note.params.item?.type === 'collabAgentToolCall').at(-1).params.item
    assert.deepEqual(call.receiverThreadIds, ['child-1'])
    assert.equal(call.agentsStates['child-1'].status, 'completed')
    assert.equal(call.agentsStates['child-1'].message, 'hi from child')
    const turns = await b.call('thread/turns/list', { threadId: 'child-1', sortDirection: 'asc' })
    const text = turns.data.flatMap((entry) => entry.items).filter((item) => item.type === 'agentMessage').map((item) => item.text).join('')
    assert.equal(text, 'hi from child')
    await b.call('turn/interrupt', { threadId: 'child-1', turnId: '' })
    assert.ok(b.agentLog().some((entry) => entry.method === 'mcode/session/delegation/stop' && entry.params.sessionId === thread.id))
  } finally { await b.close() }
})

test('a delegate the agent keeps internal (MiniMax) shows its task and answer', async () => {
  const minimax = adapterById('minimax')
  assert.equal(minimax.delegateText('<task_result task_id="t">\nrun_status: succeeded\nfinal_text:\nchild says hi\nerror_message: \n</task_result>'), 'child says hi')
  const adapter = {
    ...kimi,
    classify: (call) => (call.title === 'task' ? { type: 'subagent', label: call.rawInput?.description, prompt: call.rawInput?.prompt } : kimi.classify(call)),
    loadDelegates: false,
    delegateText: minimax.delegateText,
  }
  const b = bridge({ adapter })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'delegate')
    await b.waitFor((method, params) => method === 'thread/status/changed' && params.threadId === 'child-1' && params.status.type === 'idle')
    const turns = await b.call('thread/turns/list', { threadId: 'child-1', sortDirection: 'asc' })
    const items = turns.data.flatMap((entry) => entry.items)
    assert.deepEqual(items.map((item) => item.type), ['userMessage', 'agentMessage'])
    assert.equal(items[1].text, 'hi from child')
    assert.ok(!b.agentLog().some((entry) => entry.method === 'session/load' && entry.params.sessionId === 'child-1'))
  } finally { await b.close() }
})

test('Kimi config: per-model thinking efforts, context size, image input and [[hooks]]', () => {
  const dir = tmp()
  const file = path.join(dir, 'config.toml')
  fs.writeFileSync(file, [
    'default_model = "effortful"',
    '[models.local]', 'provider = "p"', 'model = "fake"', 'capabilities = ["tool_use", "thinking", "image_in"]', 'max_context_size = 131072',
    '[models.effortful]', 'provider = "p"', 'model = "fake2"', 'support_efforts = ["low", "medium", "high"]', 'capabilities = [', '  "thinking",', ']', 'default_effort = "high"',
    '[models.plain]', 'provider = "p"', 'model = "fake3"',
    '[models.always]', 'model = "x"', 'capabilities = ["always_thinking"]',
    '[[hooks]]', 'event = "PreToolUse"', 'matcher = "Bash"', 'command = "echo hi"', 'timeout = 5',
    '[[hooks]]', 'event = "Notification"', 'command = "say done"', '',
  ].join('\n'))
  const config = readKimiConfig(file)
  const info = Object.fromEntries(Object.entries(config.models).map(([alias, model]) => [alias, kimiModelInfo(alias, model)]))
  assert.deepEqual(info.local.efforts.map((effort) => effort.id), ['off', 'on'])
  assert.equal(info.local.contextWindow, 131072)
  assert.deepEqual(info.local.inputModalities, ['text', 'image'])
  assert.deepEqual(info.effortful.efforts.map((effort) => effort.id), ['off', 'low', 'medium', 'high'])
  assert.equal(info.effortful.defaultEffort, 'high')
  assert.deepEqual(info.plain.efforts, [])
  assert.deepEqual(info.always.efforts.map((effort) => effort.id), ['on'])
  assert.equal(config.hooks.length, 2)
  const env = { HOME: dir, KIMI_CODE_HOME: dir }
  fs.renameSync(file, path.join(dir, 'config.toml'))
  const hooks = kimi.hooks({ env })
  assert.deepEqual(hooks.map((hook) => [hook.eventName, hook.matcher, hook.command, hook.timeoutSec, hook.source]), [['preToolUse', 'Bash', 'echo hi', 5, 'user'], ['notification', null, 'say done', 30, 'user']])
  assert.equal(kimi.modelCatalog({ env }).length, 4)
})

test('Kimi compaction notices and usage records', () => {
  assert.equal(compactionNotice('Context compaction started — it runs in the background and the compacted context applies once it finishes.').phase, 'started')
  assert.deepEqual(compactionNotice('Compaction completed.\n- Messages compacted: 3\n- Tokens before: 12,000\n- Tokens after: 1,234'), { phase: 'completed', message: 'Compaction completed.\n- Messages compacted: 3\n- Tokens before: 12,000\n- Tokens after: 1,234', tokensAfter: 1234 })
  assert.equal(compactionNotice('/compact failed: nothing to compact').phase, 'failed')
  assert.equal(compactionNotice('Compacting conversation context…').phase, 'autoStarted')
  assert.equal(compactionNotice('The compaction completed fine'), null)
  const dir = tmp()
  const file = path.join(dir, 'wire.jsonl')
  fs.writeFileSync(file, `${JSON.stringify({ type: 'usage.record', model: 'local', usage: { inputOther: 10, output: 2, inputCacheRead: 5, inputCacheCreation: 1 } })}\n{"type":"usage.rec`)
  const cursor = {}
  assert.deepEqual(readUsageSince([file], cursor), { usage: { inputTokens: 16, cachedInputTokens: 5, outputTokens: 2 }, model: 'local' })
  // The half-written record is read once it is complete.
  fs.appendFileSync(file, `ord","model":"local","usage":{"inputOther":1,"output":1,"inputCacheRead":0,"inputCacheCreation":0}}\n`)
  assert.equal(readUsageSince([file], cursor).usage.inputTokens, 1)
  assert.equal(readUsageSince([file], cursor), null)
})

test('Kimi plugins: named by their manifest, switched and removed in installed.json', async () => {
  const dir = tmp()
  const root = path.join(dir, 'plugins', 'managed', 'demo')
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'kimi.plugin.json'), JSON.stringify({ name: 'demo', version: '1.2.0', description: 'A demo', mcpServers: { srv: { command: 'x' } }, hooks: [{ event: 'Stop', command: 'echo stop' }] }))
  fs.writeFileSync(path.join(dir, 'plugins', 'installed.json'), JSON.stringify({ version: 1, plugins: [{ id: 'demo@local', root, source: 'local', enabled: true, installedAt: '2026-01-01T00:00:00Z' }] }))
  const ctx = { env: { HOME: dir, KIMI_CODE_HOME: dir } }
  const [plugin] = kimi.plugins(ctx)
  assert.deepEqual([plugin.id, plugin.name, plugin.version, plugin.interface.shortDescription, plugin.source.path, plugin.codeDesktop.readOnlyReason], ['demo@local', 'demo', '1.2.0', 'A demo', root, null])
  assert.deepEqual(kimi.pluginDetail(ctx, plugin), { hooks: [{ key: 'demo@local:0', eventName: 'stop' }], mcpServers: ['srv'],
    mcpServerStates: [{ name: 'srv', runtimeName: 'plugin-demo@local:srv', enabled: true }], skills: [] })
  assert.equal(kimi.hooks(ctx).at(-1).pluginId, 'demo@local')
  await kimi.pluginCommand(ctx, 'disable', 'demo@local')
  assert.equal(kimi.plugins(ctx)[0].enabled, false)
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'plugins', 'installed.json'), 'utf8'))
  assert.equal(saved.version, 1)
  assert.equal(saved.plugins[0].root, root)
  // Installing goes through Kimi's own plugin service (its local server): acp-bridge-round8.test.mjs drives it.
  await kimi.pluginCommand(ctx, 'remove', 'demo@local')
  assert.equal(kimi.plugins(ctx).length, 0)
})

test('Qwen: the skill switch edits only SKILL.md\'s disable-model-invocation line; a discontinued OAuth login is not signed in', () => {
  const text = '---\nname: demo\ndescription: d\nhooks:\n  - x\n---\nBody\n'
  const off = skillFrontmatterEnabled(text, false)
  assert.equal(off, '---\nname: demo\ndescription: d\nhooks:\n  - x\ndisable-model-invocation: true\n---\nBody\n')
  assert.equal(skillFrontmatterEnabled(off, true), text)
  const qwen = adapterById('qwen')
  const dir = tmp()
  fs.mkdirSync(path.join(dir, '.qwen'))
  fs.writeFileSync(path.join(dir, '.qwen', 'settings.json'), JSON.stringify({ security: { auth: { selectedType: 'qwen-oauth' } } }))
  fs.writeFileSync(path.join(dir, '.qwen', 'oauth_creds.json'), '{}')
  const account = qwen.account({ env: { HOME: dir } })
  assert.equal(account.kind, null)
  assert.match(account.hint, /free tier has ended/)
  const skillDir = path.join(dir, '.qwen', 'skills', 'demo')
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), text)
  const [skill] = qwen.skills({ env: { HOME: dir } }, null)
  qwen.setSkillEnabled({ env: { HOME: dir } }, skill.name, false, skill)
  assert.equal(qwen.skills({ env: { HOME: dir } }, null)[0].enabled, false)
  // Follow-up suggestions stay off unless the user turned them on.
  const launch = qwen.launch({ env: { HOME: dir, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(dir, 'none.json') } }, { threadDir: path.join(dir, 't') })
  assert.equal(JSON.parse(fs.readFileSync(launch.env.QWEN_CODE_SYSTEM_SETTINGS_PATH, 'utf8')).ui.enableFollowupSuggestions, false)
})

test('Gemini: custom TOML commands are listed and expanded as Gemini\'s TUI does', async () => {
  assert.deepEqual(tomlStrings('description = "Review a PR"\nprompt = """\nReview {{args}}.\nUse "care".\n"""\n'), { description: 'Review a PR', prompt: 'Review {{args}}.\nUse "care".\n' })
  assert.deepEqual(tomlStrings("prompt = 'literal \\\\n'"), { prompt: 'literal \\\\n' })
  const gemini = adapterById('gemini')
  const home = tmp()
  const workspace = path.join(home, 'ws')
  fs.mkdirSync(path.join(home, '.gemini', 'commands', 'git'), { recursive: true })
  fs.mkdirSync(path.join(workspace, '.gemini', 'commands'), { recursive: true })
  fs.writeFileSync(path.join(home, '.gemini', 'commands', 'review-pr.toml'), 'description = "Review a pull request"\nprompt = "Review PR {{args}} carefully. Files: !{echo {{args}}}"\n')
  fs.writeFileSync(path.join(home, '.gemini', 'commands', 'git', 'summary.toml'), 'prompt = "Summarize @{notes.md}"\n')
  fs.writeFileSync(path.join(workspace, '.gemini', 'commands', 'local.toml'), 'prompt = "Project command"\n')
  fs.writeFileSync(path.join(workspace, 'notes.md'), 'NOTES')
  const ctx = { env: { HOME: home } }
  // An untrusted project's commands stay out (Gemini's folder trust is on by default).
  // init: the bridge's own /init (run as Gemini's TUI runs it, not ACP's), always listed.
  assert.deepEqual(gemini.commands(ctx, workspace).map((command) => command.name).sort(), ['git:summary', 'init', 'review-pr'])
  const trusted = { env: { HOME: home, GEMINI_CLI_TRUST_WORKSPACE: 'true' } }
  const commands = gemini.commands(trusted, workspace)
  assert.deepEqual(commands.map((command) => command.name).sort(), ['git:summary', 'init', 'local', 'review-pr'])
  const shells = []
  const review = commands.find((command) => command.name === 'review-pr')
  const text = await gemini.expandCommand(trusted, review, { args: "12 it's", cwd: workspace, runShell: async (line) => { shells.push(line); return { output: 'a.js', exitCode: 0 } } })
  assert.equal(text, "Review PR 12 it's carefully. Files: a.js")
  assert.deepEqual(shells, ["echo '12 it'\\''s'"])
  const summary = commands.find((command) => command.name === 'git:summary')
  assert.equal(await gemini.expandCommand(trusted, summary, { args: 'short', cwd: workspace, runShell: async () => ({ output: '', exitCode: 0 }) }), 'Summarize NOTES\n\n/git:summary short')
})

test('Gemini: todo lists fill the plan, topics name the thread, overlays keep ~/.agents and ~/.env', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const chats = path.join(home, '.gemini', 'tmp', 'proj', 'chats')
  fs.mkdirSync(chats, { recursive: true })
  const sessionId = '12345678-aaaa-bbbb-cccc-1234567890ab'
  fs.writeFileSync(path.join(chats, 'session-2026-01-01T00-00-12345678.jsonl'), [
    { sessionId, projectHash: 'h', startTime: '2026-01-01T00:00:00Z', lastUpdated: '2026-01-01T00:00:00Z' },
    { id: 'u1', type: 'user', content: [{ text: 'do it' }] },
    { id: 'g1', type: 'gemini', content: '', toolCalls: [{ id: 'write_todos-1-1', name: 'write_todos', args: { todos: [{ description: 'One', status: 'completed' }, { description: 'Two', status: 'in_progress' }, { description: 'Three', status: 'pending' }] } }] },
  ].map((line) => JSON.stringify(line)).join('\n') + '\n')
  assert.deepEqual(gemini.toolPlan({ env: { HOME: home } }, sessionId, { toolCallId: 'write_todos-1-1', title: 'Set 3 todo(s)' }).map((entry) => entry.status), ['completed', 'in_progress', 'pending'])
  assert.equal(gemini.toolPlan({ env: { HOME: home } }, sessionId, { toolCallId: 'read_file-1', title: 'Read x' }), undefined)
  const thread = {}
  const hidden = gemini.filterUpdate({ sessionUpdate: 'tool_call', toolCallId: 'update_topic-9', title: 'Update topic to: "Fixing the parser"', kind: 'think' }, thread)
  assert.deepEqual(hidden, { drop: true, title: 'Fixing the parser' })
  assert.equal(gemini.filterUpdate({ sessionUpdate: 'tool_call_update', toolCallId: 'update_topic-9', status: 'completed' }, thread).drop, true)
  fs.mkdirSync(path.join(home, '.agents', 'skills', 'demo'), { recursive: true })
  fs.writeFileSync(path.join(home, '.env'), 'GEMINI_API_KEY=x\n')
  const launch = gemini.launch({ env: { HOME: home } }, { threadDir: path.join(home, 'thread'), disabledTools: ['web_fetch'], writable: [], cwd: home })
  assert.equal(fs.realpathSync(path.join(launch.env.GEMINI_CLI_HOME, '.agents')), fs.realpathSync(path.join(home, '.agents')))
  assert.equal(fs.readFileSync(path.join(launch.env.GEMINI_CLI_HOME, '.env'), 'utf8'), 'GEMINI_API_KEY=x\n')
})

test('slash-menu subcommands fold into their parent; MCP servers keep their transport', () => {
  const rows = commandSkills([{ name: 'memory', description: 'Memory' }, { name: 'memory show', description: 'Show' }, { name: 'memory refresh', description: 'Refresh' }, { name: 'restore list', description: 'List checkpoints' }])
  assert.deepEqual(rows.map((row) => [row.name, row.argumentHint]), [['memory', 'show | refresh'], ['restore', 'list']])
  assert.match(rows[0].description, /refresh — Refresh/)
  assert.equal(normalizeMcpServer('a', { url: 'https://x/sse' }, 'user', {}, { urlTransport: 'auto' }).transport, 'auto')
  assert.equal(normalizeMcpServer('a', { url: 'https://x', type: 'sse' }, 'user').transport, 'sse')
  assert.equal(normalizeMcpServer('a', { httpUrl: 'https://x' }, 'user', {}, { urlTransport: 'sse' }).transport, 'http')
  assert.equal(normalizeMcpServer('a', { command: 'node' }, 'user').transport, 'stdio')
})

test('an SSE MCP server is probed over its event stream (auto: after streamable HTTP is refused)', async () => {
  const streams = new Set()
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/sse') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      res.write('event: endpoint\ndata: /messages?session=1\n\n')
      streams.add(res)
      req.on('close', () => streams.delete(res))
      return
    }
    if (req.method === 'POST' && req.url.startsWith('/messages')) {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        const message = JSON.parse(body)
        res.writeHead(202).end()
        const reply = (result) => { for (const stream of streams) stream.write(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n\n`) }
        if (message.method === 'initialize') reply({ protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'sse-demo', version: '1' } })
        if (message.method === 'tools/list') reply({ tools: [{ name: 'echo', description: 'Echo' }] })
      })
      return
    }
    res.writeHead(405).end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    clearMcpCache()
    const url = `http://127.0.0.1:${server.address().port}/sse`
    const sse = await probeMcpServer({ name: 's', url, transport: 'sse' }, { fresh: true })
    assert.equal(sse.runtimeStatus, 'connected')
    assert.deepEqual(sse.tools.map((tool) => tool.name), ['echo'])
    const auto = await probeMcpServer({ name: 's', url, transport: 'auto' }, { fresh: true })
    assert.equal(auto.serverInfo.name, 'sse-demo')
  } finally {
    for (const stream of streams) stream.end()
    server.close()
  }
})

test('Kimi project connectors: untrusted folders are marked trustRequired (never probed), trusting writes Kimi’s record', async () => {
  const kimi = (await import('../packages/acp-bridge/src/agents/kimi.js')).default
  const { kimiWorkDirKey, kimiWorkspaceTrusted } = await import('../packages/acp-bridge/src/agents/kimi.js')
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi-trust-'))
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kimi-proj-')))
  fs.mkdirSync(path.join(project, '.kimi-code'), { recursive: true })
  fs.writeFileSync(path.join(project, '.kimi-code', 'mcp.json'), JSON.stringify({ mcpServers: { projsrv: { command: 'node', args: ['evil.js'] } } }))
  fs.mkdirSync(home, { recursive: true })
  fs.writeFileSync(path.join(home, 'mcp.json'), JSON.stringify({ mcpServers: { usersrv: { command: 'node', args: ['ok.js'] } } }))
  const ctx = { env: { KIMI_CODE_HOME: home, HOME: home } }
  let servers = kimi.mcpServers(ctx, project)
  assert.equal(servers.find((s) => s.name === 'projsrv').trustRequired, true)
  assert.equal(servers.find((s) => s.name === 'projsrv').cwd, project, 'a project server runs in the project folder')
  assert.equal(servers.find((s) => s.name === 'usersrv').trustRequired, undefined)
  kimi.trustWorkspace(ctx, project)
  assert.ok(kimiWorkspaceTrusted(ctx.env, project))
  const record = JSON.parse(fs.readFileSync(path.join(home, 'workspace-trust', kimiWorkDirKey(project)), 'utf8'))
  assert.equal(record.root, project)
  servers = kimi.mcpServers(ctx, project)
  assert.equal(servers.find((s) => s.name === 'projsrv').trustRequired, undefined)
  // Kimi's own key shape (workdir-slug.ts encodeWorkDirKey).
  assert.match(kimiWorkDirKey('/Users/x/My Repo/'), /^wd_my-repo_[0-9a-f]{12}$/)
})

test('Kimi /init: the bridge serves it (Kimi’s ACP mode doesn’t) as a turn that writes AGENTS.md', async () => {
  const kimi = (await import('../packages/acp-bridge/src/agents/kimi.js')).default
  const [init] = kimi.commands()
  assert.equal(init.name, 'init')
  const prompt = await kimi.expandCommand({}, init, { args: 'mention the CLI', cwd: '/x' })
  assert.match(prompt, /AGENTS\.md/)
  assert.match(prompt, /mention the CLI$/)
})

test('a stop while the agent is still starting: the turn ends at once and the agent never gets the prompt', async () => {
  // Reopening the app: the session's agent process starts again (initialize is slow here) on the first message.
  const first = bridge()
  let threadId
  try {
    await first.call('initialize', {})
    threadId = (await first.call('thread/start', { cwd: first.home })).thread.id
    await first.turn(threadId, 'hello')
  } finally { await first.close() }
  const b = bridge({ home: first.home, env: { FAKE_ACP_INIT_DELAY: '1500' } })
  try {
    await b.call('initialize', {})
    await b.call('thread/resume', { threadId })
    const before = b.agentLog().length
    const { turn: started } = await b.call('turn/start', { threadId, input: [{ type: 'text', text: 'do it', text_elements: [] }] })
    await new Promise((resolve) => setTimeout(resolve, 200))
    const stoppedAt = Date.now()
    await b.call('turn/interrupt', { threadId, turnId: started.id })
    const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)
    assert.equal(done.turn.status, 'interrupted')
    assert.ok(Date.now() - stoppedAt < 1000, 'ends at once, not when the start (or the cancel grace) runs out')
    // The next message reuses the process that was starting and is the only prompt the agent gets.
    const next = await b.turn(threadId, 'again')
    assert.equal(next.status, 'completed')
    const prompts = b.agentLog().slice(before).filter((entry) => entry.method === 'session/prompt')
    assert.equal(prompts.length, 1, JSON.stringify(prompts.map((entry) => entry.params?.prompt)))
    assert.match(JSON.stringify(prompts[0].params.prompt), /again/)
  } finally { await b.close() }
})
