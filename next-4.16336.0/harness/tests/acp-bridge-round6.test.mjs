// ACP bridge (harness/packages/acp-bridge), round 6: turns Kimi starts on its own (background-task notices, cron runs)
// followed through its main log, Kimi's cron rows and schedule; model lists merged across sessions and a model a session
// doesn't know refused; Kimi's rename / archive state; Qwen's background tasks, file restore on rewind and per-folder
// extension rules; Gemini's MCP prompts as slash commands; MiniMax's own asks and feedback channel. Server flows run
// against packages/acp-bridge/testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { kimiAgentTurnEvents, kimiCronSchedule, kimiCronTitle, kimiSelfTurnText } from '../packages/acp-bridge/src/agents/kimi.js'
import { qwenExtensionEnabledAt, qwenBackgroundTasks, qwenBackgroundRow } from '../packages/acp-bridge/src/agents/qwen.js'
import { minimaxMustAsk, minimaxCommandAsk, minimaxSensitivePath, minimaxFeedbackUrl } from '../packages/acp-bridge/src/agents/minimax.js'
import { parsePromptArgs, promptText, probeMcpServer, getMcpPrompt } from '../packages/acp-bridge/src/mcp-probe.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const FAKE_MCP = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-mcp.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r6-')))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), onRequest = async () => ({}) } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, QWEN_HOME: path.join(home, '.qwen'), CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
      QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'no-qwen-system.json'),
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), ...env,
    },
  })
  const notes = []
  const requests = []
  const client = new LineTransport(toClient, toServer, { onRequest: async (method, params) => { requests.push({ method, params }); return onRequest(method, params) }, onNotification: (method, params) => notes.push({ method, params, at: Date.now() }), log: () => {} })
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
  return { home, kimiHome, call, turn, notes, requests, waitFor, agentLog, close: () => server.shutdown() }
}

const promptTexts = (b) => b.agentLog().filter((entry) => entry.method === 'session/prompt').map((entry) => entry.params.prompt.map((block) => block.text ?? '').join(''))

// ------------------------------------------------------------ Kimi: turns it starts on its own

test('Kimi main log: its own turns (task notice, cron run) become agent-turn events; prompted turns are passed over', () => {
  const dir = tmp()
  const file = path.join(dir, 'wire.jsonl')
  const write = (...records) => fs.appendFileSync(file, records.map((record) => `${JSON.stringify(record)}\n`).join(''))
  write({ type: 'metadata' }, { type: 'turn.prompt', agentId: 'main', origin: { kind: 'user' }, turnId: 0, input: [{ type: 'text', text: 'old' }] }, { type: 'cron.add', task: { id: 'job-1', cron: '*/10 * * * *', prompt: 'check', recurring: true } }, { type: 'turn.ended', agentId: 'main', turnId: 0, reason: 'completed' })
  const state = {}
  // A process that just opened the session: its jobs come from the whole log, its turns start after it.
  assert.deepEqual(kimiAgentTurnEvents(file, state, { reset: true }), [])
  assert.deepEqual([...state.jobs.keys()], ['job-1'])
  write({ type: 'turn.prompt', agentId: 'main', origin: { kind: 'user' }, turnId: 1, input: [{ type: 'text', text: 'prompted' }] },
    { type: 'context.append_loop_event', agentId: 'main', event: { type: 'content.part', turnId: '1', part: { type: 'text', text: 'streamed over ACP' } } },
    { type: 'task.started', agentId: 'main', info: { taskId: 'bash-1', kind: 'process', status: 'running', command: 'npm test' } },
    { type: 'turn.ended', agentId: 'main', turnId: 1, reason: 'completed' })
  assert.deepEqual(kimiAgentTurnEvents(file, state), [])
  assert.deepEqual([...state.tasks.keys()], ['bash-1'])
  write({ type: 'task.terminated', agentId: 'main', info: { taskId: 'bash-1' } },
    { type: 'turn.prompt', agentId: 'main', origin: { kind: 'task', taskId: 'bash-1', status: 'completed' }, turnId: 2, input: [{ type: 'text', text: '<notification id="x" type="task.completed">\nTitle: Background process completed\nSeverity: info\nWall time: 3 seconds\nnpm test completed.\n<output-file path="/x">\n</output-file>\n</notification>' }] },
    { type: 'context.append_loop_event', agentId: 'main', event: { type: 'tool.call', turnId: '2', toolCallId: 'c9', name: 'Read', args: { path: '/x' } } },
    { type: 'usage.record', agentId: 'main', usage: { inputOther: 10, output: 2, inputCacheRead: 5, inputCacheCreation: 0 } },
    { type: 'context.append_loop_event', agentId: 'agent-0', event: { type: 'content.part', part: { type: 'text', text: 'a sub-agent line' } } },
    { type: 'context.append_loop_event', agentId: 'main', event: { type: 'content.part', turnId: '2', part: { type: 'text', text: 'All tests passed.' } } },
    { type: 'turn.ended', agentId: 'main', turnId: 2, reason: 'completed' },
    { type: 'turn.prompt', agentId: 'main', origin: { kind: 'cron_job', jobId: 'job-1', cron: '*/10 * * * *', recurring: true }, turnId: 3, input: [{ type: 'text', text: '<cron-fire jobId="job-1">\n<prompt>\ncheck the deploy\n</prompt>\n</cron-fire>' }] },
    { type: 'turn.ended', agentId: 'main', turnId: 3, reason: 'failed', error: { name: 'APIProviderRateLimitError', message: '429 slow down' } })
  const events = kimiAgentTurnEvents(file, state)
  assert.equal(state.tasks.size, 0)
  assert.deepEqual(events[0], { start: { text: 'Background process completed: npm test completed.', origin: 'task' } })
  // Tool call ids as Kimi's ACP names them (<turn>:<call>), so an approval lands on the same row.
  assert.equal(events[1].update.sessionUpdate, 'tool_call')
  assert.equal(events[1].update.toolCallId, '2:c9')
  assert.deepEqual(events[2], { usage: { inputTokens: 15, cachedInputTokens: 5, outputTokens: 2 } })
  assert.deepEqual(events[3].update.content, { type: 'text', text: 'All tests passed.' })
  assert.deepEqual(events[4], { end: { status: 'completed', error: null } })
  assert.deepEqual(events[5], { start: { text: 'Scheduled task (every 10 minutes): check the deploy', origin: 'cron_job' } })
  assert.equal(events[6].end.status, 'failed')
  assert.equal(events[6].end.error.codexErrorInfo, 'rateLimitExceeded')
  assert.equal(events.length, 7)
  // A recurring job stays; a one-shot job is gone once it fired; cron.delete removes one.
  assert.equal(state.jobs.has('job-1'), true)
  write({ type: 'cron.delete', ids: ['job-1'] })
  kimiAgentTurnEvents(file, state)
  assert.equal(state.jobs.size, 0)
})

test('Kimi schedules read as words; cron rows get a title of their own', () => {
  assert.equal(kimiCronSchedule('* * * * *'), 'every minute')
  assert.equal(kimiCronSchedule('*/5 * * * *'), 'every 5 minutes')
  assert.equal(kimiCronSchedule('0 * * * *'), 'every hour')
  assert.equal(kimiCronSchedule('30 9 * * *'), 'every day at 09:30')
  assert.equal(kimiCronSchedule('0 9 * * 1-5'), 'weekdays at 09:00')
  assert.equal(kimiCronSchedule('0 9 1 * *'), 'cron 0 9 1 * *')
  assert.equal(kimiCronSchedule('15 14 * * *', false), 'once, every day at 14:15')
  assert.equal(kimiCronTitle('CronCreate', { cron: '*/10 * * * *', prompt: 'check the deploy' }), 'Schedule “check the deploy” every 10 minutes')
  assert.equal(kimiCronTitle('CronDelete', { id: 'job-1' }), 'Cancel scheduled task job-1')
  assert.equal(kimiCronTitle('CronList', {}), 'List scheduled tasks')
  assert.equal(kimiCronTitle('Bash', {}), null)
  assert.equal(kimiSelfTurnText({ origin: { kind: 'system_trigger', name: 'goal_continuation' }, input: [] }), null)
  const kimi = adapterById('kimi')
  const filtered = kimi.filterUpdate({ sessionUpdate: 'tool_call', toolCallId: '2:c1', title: 'CronCreate', kind: 'other', status: 'in_progress', rawInput: { cron: '0 * * * *', prompt: 'ping' } })
  assert.equal(filtered.update.title, 'Schedule “ping” every hour')
  assert.deepEqual(kimi.classify(filtered.update), { type: 'other', tool: 'CronCreate' })
})

test('Kimi in a session: a background task\'s turn shows; a message sent during it waits and runs after it', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const first = await b.turn(thread.id, 'kimi-self 1200')
    assert.equal(first.status, 'completed')
    // The task's turn opens by itself (the thread is busy), with its notice as the message.
    const started = await b.waitFor((method, params) => method === 'turn/started' && params.threadId === thread.id && params.turn.id !== first.id)
    const agentTurnId = started.turn.id
    await b.waitFor((method, params) => method === 'item/completed' && params.turnId === agentTurnId && params.item.type === 'userMessage')
    // Sent while that turn runs: queued, not sent to the busy agent.
    const { turn: second } = await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'any news?', text_elements: [] }] })
    assert.ok(b.notes.some((note) => note.method === 'thread/queue/changed'))
    const agentDone = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === agentTurnId)
    assert.equal(agentDone.turn.status, 'completed')
    const done = (await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === second.id)).turn
    assert.equal(done.status, 'completed')
    assert.ok(promptTexts(b).includes('any news?'))
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    assert.equal(read.thread.turns.length, 3)
    const own = read.thread.turns[1]
    assert.equal(own.items[0].type, 'userMessage')
    assert.equal(own.items[0].content[0].text, 'Background process completed: slow job completed.')
    assert.ok(own.items.some((item) => item.type === 'agentMessage' && item.text === 'The job finished.'))
    assert.ok(own.items.some((item) => item.type === 'commandExecution' && item.id.endsWith(':c2') && item.status === 'completed'))
    // Its tokens count like a prompt's.
    assert.ok(b.notes.some((note) => note.method === 'thread/tokenUsage/updated' && note.params.turnId === agentTurnId))
  } finally { await b.close() }
})

// ------------------------------------------------------------ models

test('Kimi models: a model added to config.toml shows while older sessions are open; a model the session lacks fails the turn', async () => {
  const b = bridge()
  try {
    const config = path.join(b.kimiHome, 'config.toml')
    fs.writeFileSync(config, '[models.k1]\nprovider = "p"\nmodel = "k1"\n')
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'hello')
    const before = await b.call('model/list', {})
    assert.ok(before.data.some((model) => model.id === 'm-plain'))
    assert.equal(before.data.some((model) => model.id === 'newm'), false)
    fs.appendFileSync(config, '\n[models.newm]\nprovider = "p"\nmodel = "newm"\n')
    const later = new Date(Date.now() + 5000)
    fs.utimesSync(config, later, later)
    const after = await b.call('model/list', {})
    assert.ok(after.data.some((model) => model.id === 'newm'))
    // The fake agent doesn't know it (as an older Kimi process wouldn't): one fresh process, then a clear failure.
    const failed = await b.turn(thread.id, 'use it', { model: 'newm' })
    assert.equal(failed.status, 'failed')
    assert.match(failed.error.message, /doesn’t offer the model “newm”/)
    assert.equal(promptTexts(b).includes('use it'), false)
  } finally { await b.close() }
})

// ------------------------------------------------------------ Kimi rename / archive

test('Kimi archive state: an archive made in Kimi is taken over; one made here is not undone by Kimi\'s old flag', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'hello')
    await b.call('thread/unsubscribe', { threadId: thread.id })
    const stateFile = path.join(b.kimiHome, 'sessions', 'wd_test', thread.id, 'state.json')
    fs.mkdirSync(path.dirname(stateFile), { recursive: true })
    fs.writeFileSync(stateFile, JSON.stringify({ id: thread.id, archived: false, updatedAt: Date.now() }))
    // First sight, not archived there: nothing changes.
    let list = await b.call('thread/list', {})
    assert.ok(list.data.some((row) => row.id === thread.id))
    // Archived in Kimi's web UI: archived here too.
    fs.writeFileSync(stateFile, JSON.stringify({ id: thread.id, archived: true, archivedAt: Date.now(), updatedAt: Date.now() }))
    list = await b.call('thread/list', {})
    assert.equal(list.data.some((row) => row.id === thread.id), false)
    assert.ok(b.notes.some((note) => note.method === 'thread/archived' && note.params.threadId === thread.id))
    const archived = await b.call('thread/list', { archived: true })
    assert.ok(archived.data.some((row) => row.id === thread.id))
    // Restored here: Kimi's unchanged flag (its server can't be reached in this test) doesn't archive it again.
    await b.call('thread/unarchive', { threadId: thread.id })
    await sleep(300)
    list = await b.call('thread/list', {})
    assert.ok(list.data.some((row) => row.id === thread.id))
  } finally { await b.close() }
})

test('Kimi rename and archive go through Kimi\'s local server while no process holds the session', () => {
  const kimi = adapterById('kimi')
  assert.equal(typeof kimi.renameSession, 'function')
  assert.equal(typeof kimi.archiveSession, 'function')
  assert.equal(kimi.sessionFeatures.profileOffline, true)
  const home = tmp()
  const sessions = path.join(home, 'sessions', 'wd_x')
  fs.mkdirSync(path.join(sessions, 'session_a'), { recursive: true })
  fs.writeFileSync(path.join(sessions, 'session_a', 'state.json'), JSON.stringify({ id: 'session_a', archived: true, archivedAt: 5, updatedAt: 6, title: 'Checkout refactor', isCustomTitle: true }))
  const states = kimi.sessionStates({ env: { KIMI_CODE_HOME: home } })
  assert.deepEqual(states.get('session_a'), { archived: true, archivedAt: 5, updatedAt: 6, title: 'Checkout refactor', customTitle: true })
})

// ------------------------------------------------------------ Qwen

test('Qwen extensions: each override rule decides for its folder, the last match wins', () => {
  const home = tmp()
  const proj = path.join(home, 'proj')
  fs.mkdirSync(proj)
  // A workspace disable (no trailing *): off there only.
  assert.equal(qwenExtensionEnabledAt([`!${proj}/`], proj), false)
  assert.equal(qwenExtensionEnabledAt([`!${proj}/`], path.join(proj, 'sub')), true)
  // Global disable, enabled for one project.
  assert.equal(qwenExtensionEnabledAt(['!/*', `${proj}/`], proj), true)
  assert.equal(qwenExtensionEnabledAt(['!/*', `${proj}/`], home), false)
  // A user-scope disable covers the home folder only.
  assert.equal(qwenExtensionEnabledAt([`!${home}/*`], path.join(home, 'x')), false)
  assert.equal(qwenExtensionEnabledAt([`!${home}/*`], '/Volumes/other/p'), true)
  assert.equal(qwenExtensionEnabledAt(undefined, proj), true)
  // In the adapter: the connector and the switch follow the folder.
  const qwenHome = path.join(home, '.qwen')
  const ext = path.join(qwenHome, 'extensions', 'figma')
  fs.mkdirSync(ext, { recursive: true })
  fs.writeFileSync(path.join(ext, 'qwen-extension.json'), JSON.stringify({ name: 'figma', version: '1.0.0', mcpServers: { figma: { command: 'figma-mcp' } } }))
  fs.writeFileSync(path.join(qwenHome, 'extensions', 'extension-enablement.json'), JSON.stringify({ figma: { overrides: [`!${proj}/`] } }))
  const qwen = adapterById('qwen')
  const ctx = { env: { HOME: home, QWEN_HOME: qwenHome } }
  assert.equal(qwen.mcpServers(ctx, proj).some((server) => server.name === 'figma'), false)
  assert.equal(qwen.mcpServers(ctx, home).some((server) => server.name === 'figma'), true)
  assert.equal(qwen.plugins(ctx, proj)[0].enabled, false)
  assert.equal(qwen.plugins(ctx)[0].enabled, true)
  assert.equal(qwen.mentionTargets(ctx, proj).some((entry) => entry.text === '@ext:figma'), false)
})

test('Qwen background tasks: running shells, monitors and background agents only', () => {
  const tasks = qwenBackgroundTasks([
    { kind: 'shell', id: 's1', status: 'running', command: 'npm run dev', cwd: '/p', pid: 9 },
    { kind: 'shell', id: 's2', status: 'completed', command: 'ls' },
    { kind: 'monitor', id: 'm1', status: 'running', command: 'tail -f log', label: 'log' },
    { kind: 'agent', id: 'a1', status: 'paused', isBackgrounded: true, label: 'explore', subagentType: 'Explore', toolUseId: 't1' },
    { kind: 'agent', id: 'a2', status: 'running', isBackgrounded: false },
    { kind: 'workflow', id: 'w1', status: 'running' },
  ])
  assert.deepEqual(tasks.map((task) => task.id), ['s1', 'm1', 'a1'])
  assert.deepEqual(qwenBackgroundRow(tasks[0], '/cwd'), { itemId: 's1', processId: 'qwen-task:shell:s1', command: 'npm run dev', cwd: '/p', osPid: 9 })
  assert.equal(qwenBackgroundRow(tasks[1], '/cwd').command, 'Monitor: tail -f log')
  assert.deepEqual(qwenBackgroundRow(tasks[2], '/cwd'), { itemId: 't1', processId: 'qwen-task:agent:a1', command: 'Explore agent: explore', cwd: '/cwd', osPid: null })
})

test('Qwen in a session: background work is listed and stoppable, keeps the session loaded, and a settings change waits for it', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    const init = await b.call('initialize', {})
    assert.equal(init.capabilities.backgroundTerminals, true)
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'qwen-bg')
    const list = await b.call('thread/backgroundTerminals/list', { threadId: thread.id })
    assert.deepEqual(list.data.map((row) => row.processId).sort(), ['qwen-task:agent:bg-agent-1', 'qwen-task:shell:bg-shell-1'])
    assert.equal(list.data.find((row) => row.processId === 'qwen-task:shell:bg-shell-1').command, 'npm run dev')
    // Leaving the session doesn't close it while that runs.
    await b.call('thread/unsubscribe', { threadId: thread.id })
    const status = await b.call('thread/read', { threadId: thread.id })
    assert.notEqual(status.thread.status.type, 'notLoaded')
    // A connector switch (launch key change) keeps the process: told once, the change waits.
    const starts = () => b.agentLog().filter((entry) => entry.method === 'initialize').length
    const before = starts()
    await b.turn(thread.id, 'hello', { codeDesktop: { tools: { disabled: ['web_fetch'] } } })
    assert.equal(starts(), before)
    assert.ok(b.notes.some((note) => note.method === 'warning' && /keeps its current settings while its background work runs/.test(note.params.message)))
    const stopped = await b.call('thread/backgroundTerminals/terminate', { threadId: thread.id, processId: 'qwen-task:shell:bg-shell-1' })
    assert.equal(stopped.terminated, true)
    const cancel = b.agentLog().find((entry) => entry.method === 'qwen/control/session/task/cancel')
    assert.deepEqual({ taskId: cancel.params.taskId, taskKind: cancel.params.taskKind }, { taskId: 'bg-shell-1', taskKind: 'shell' })
  } finally { await b.close() }
})

test('Qwen rewind: Restore files rewinds to the kept turn\'s checkpoint; a plain rewind and a fork never touch files', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    const init = await b.call('initialize', {})
    assert.equal(init.capabilities.rewindFiles, true)
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'one')
    await b.turn(thread.id, 'two')
    await b.turn(thread.id, 'three')
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    const result = await b.call('thread/rollback', { threadId: thread.id, beforeTurnId: read.thread.turns[1].id, codeDesktop: { restoreFiles: true } })
    const rewind = b.agentLog().filter((entry) => entry.method === 'qwen/control/session/rewind').at(-1)
    assert.equal(rewind.params.targetTurnIndex, 1)
    assert.equal(rewind.params.rewindFiles, true)
    assert.match(rewind.params.promptId, /########2$/)
    assert.deepEqual(result.codeDesktop, { filesRestored: ['/tmp/proj/a.txt'], filesFailed: [] })
    const after = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    await b.call('thread/rollback', { threadId: thread.id, beforeTurnId: after.thread.turns[0].id })
    const plain = b.agentLog().filter((entry) => entry.method === 'qwen/control/session/rewind').at(-1)
    assert.equal(plain.params.rewindFiles, false)
    assert.equal(plain.params.promptId, undefined)
  } finally { await b.close() }
})

// ------------------------------------------------------------ Gemini: MCP prompts

test('MCP prompts: listed by the probe, expanded by the server; Gemini CLI\'s argument rules', async () => {
  assert.deepEqual(parsePromptArgs('42 --focus="the tests"', [{ name: 'pr', required: true }, { name: 'focus' }]), { pr: '42', focus: 'the tests' })
  assert.deepEqual(parsePromptArgs('fix the login bug', [{ name: 'issue', required: true }]), { issue: 'fix the login bug' })
  assert.deepEqual(parsePromptArgs('a "b c"', [{ name: 'x', required: true }, { name: 'y', required: true }]), { x: 'a', y: 'b c' })
  assert.match(parsePromptArgs('', [{ name: 'x', required: true }, { name: 'y', required: true }]).message, /Missing required argument\(s\): --x, --y/)
  assert.equal(promptText({ messages: [{ content: { type: 'text', text: 'A' } }, { content: [{ type: 'text', text: 'B' }] }] }), 'A\n\nB')
  const server = { name: 'docs', command: process.execPath, args: [FAKE_MCP] }
  const probe = await probeMcpServer(server, { prompts: true, fresh: true })
  assert.equal(probe.runtimeStatus, 'connected')
  assert.deepEqual(probe.tools.map((tool) => tool.name), ['echo'])
  assert.deepEqual(probe.prompts.map((prompt) => prompt.name), ['pr-review'])
  const answer = await getMcpPrompt(server, 'pr-review', { pr: '7' })
  assert.equal(promptText(answer), 'Review PR 7.')
})

test('Gemini in a session: an MCP prompt is a slash command whose expansion by its server is the prompt', async () => {
  const home = tmp()
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  fs.writeFileSync(path.join(home, '.gemini', 'settings.json'), JSON.stringify({ mcpServers: { docs: { command: process.execPath, args: [FAKE_MCP] } } }))
  // A trusted folder: Gemini starts no connector (prompts included) in one it doesn't trust (mcp-client-manager.ts).
  const b = bridge({ adapter: adapterById('gemini'), home, env: { GEMINI_API_KEY: 'test-key', GEMINI_CLI_TRUST_WORKSPACE: 'true' } })
  try {
    await b.call('initialize', {})
    await b.call('skills/list', { cwds: [home] })
    await b.waitFor((method) => method === 'skills/changed')
    const skills = await b.call('skills/list', { cwds: [home] })
    const row = skills.data[0].skills.find((skill) => skill.name === 'pr-review')
    assert.ok(row, 'pr-review is listed')
    assert.match(row.description, /\(docs\)$/)
    assert.equal(row.argumentHint, '--pr=… --focus=…')
    const { thread } = await b.call('thread/start', { cwd: home })
    const turn = await b.turn(thread.id, '/pr-review 42 --focus=tests')
    assert.equal(turn.status, 'completed')
    assert.ok(promptTexts(b).includes('Review PR 42 focusing on tests.'))
    // As Gemini CLI does, a single required argument takes whatever follows, nothing included.
    const bare = await b.turn(thread.id, '/pr-review')
    assert.equal(bare.status, 'completed')
    assert.ok(promptTexts(b).includes('Review PR .'))
    assert.equal(promptTexts(b).filter((text) => text.startsWith('/pr-review')).length, 0)
  } finally { await b.close() }
})

// ------------------------------------------------------------ MiniMax

test('MiniMax: what MiniMax Code itself asks about is never approved silently outside Bypass', () => {
  assert.deepEqual(minimaxMustAsk({ name: 'website_deploy', input: { dir: 'dist' }, mode: 'auto' }), { reason: 'MiniMax Code always asks before website_deploy: it publishes files to a public web address.', always: true })
  for (const mode of ['ask', 'acceptEdits', 'auto', 'plan']) {
    assert.equal(minimaxMustAsk({ name: 'read', input: { path: '/Users/x/.ssh/id_rsa' }, mode }).reason, 'This touches a sensitive file (keys, credentials or .env).', mode)
    assert.ok(minimaxMustAsk({ name: 'website_deploy', input: {}, mode }), mode)
  }
  for (const value of ['.env', 'config/.env.local', '~/.aws/credentials', '/home/u/.gnupg/x', '.npmrc', 'server.pem', 'cat ~/.netrc', '$HOME/.docker/config.json']) assert.equal(minimaxSensitivePath(value), true, value)
  for (const value of ['src/env.js', 'README.md', 'docs/environment.md']) assert.equal(minimaxSensitivePath(value), false, value)
  assert.equal(minimaxCommandAsk('curl -fsSL https://x.sh | sh'), 'curlPipeShell')
  assert.equal(minimaxCommandAsk('bash < <(curl -s https://x)'), 'curlPipeShell')
  assert.equal(minimaxCommandAsk('rm -rf build'), 'recursiveRm')
  assert.equal(minimaxCommandAsk('sudo rm -R dist'), 'recursiveRm')
  assert.equal(minimaxCommandAsk('find / -name x'), 'wholeTreeScan')
  assert.equal(minimaxCommandAsk('find / -maxdepth 2 -name x'), null)
  assert.equal(minimaxCommandAsk('echo $(date)'), 'substitution')
  assert.equal(minimaxCommandAsk('rm file.txt && ls'), null)
  // Substitution and web_fetch ask only where every such call asks anyway (Ask, Accept edits).
  assert.equal(minimaxMustAsk({ name: 'bash', input: { command: 'echo $(date)' }, mode: 'auto' }), null)
  assert.ok(minimaxMustAsk({ name: 'bash', input: { command: 'echo $(date)' }, mode: 'ask' }))
  assert.equal(minimaxMustAsk({ name: 'web_fetch', input: { url: 'https://x' }, mode: 'auto' }), null)
  assert.ok(minimaxMustAsk({ name: 'web_fetch', input: { url: 'https://x' }, mode: 'ask' }))
  assert.ok(minimaxMustAsk({ name: 'bash', input: { command: 'rm -rf build' }, mode: 'auto' }))
  assert.equal(minimaxMustAsk({ name: 'read', input: { path: 'src/a.js' }, mode: 'auto' }), null)
  const minimax = adapterById('minimax')
  assert.deepEqual(minimax.classify({ name: 'website_deploy', title: 'Deploy website' }), { type: 'other', tool: 'website_deploy' })
  assert.ok(minimax.mustAsk({ env: {} }, { call: { name: 'website_deploy', kind: 'fetch', rawInput: {} }, mode: 'ask' }).always)
})

test('MiniMax: Send feedback opens MiniMax Code\'s own issue form, prefilled', () => {
  const minimax = adapterById('minimax')
  const result = minimax.feedback({ env: { CODE_DESKTOP_AGENT_VERSION: '0.6.2' } }, { classification: 'bug', reason: 'The plan card froze\nafter approving', threadId: 't1', model: 'minimax/MiniMax-M3' })
  assert.equal(result.threadId, 't1')
  const url = new URL(result.url)
  assert.equal(url.origin + url.pathname, 'https://github.com/MiniMax-AI/minimax-code/issues/new')
  assert.equal(url.searchParams.get('template'), '01-bug-report.yml')
  assert.equal(url.searchParams.get('title'), '[Bug]: The plan card froze')
  assert.equal(url.searchParams.get('product'), 'CLI - ACP')
  assert.equal(url.searchParams.get('version'), 'mcode 0.6.2')
  assert.match(url.searchParams.get('steps'), /after approving[\s\S]*Model: minimax\/MiniMax-M3/)
  const other = new URL(minimaxFeedbackUrl({ classification: 'good_result', reason: 'Nice' }))
  assert.equal(other.searchParams.get('template'), '03-question.yml')
  assert.equal(other.searchParams.get('question').startsWith('Nice'), true)
})

test('Qwen Try again: codeDesktop/turn/continue resumes through qwen/control/session/continue and an empty prompt with the continue meta', async () => {
  for (const decision of ['accept', 'reject']) {
    const b = bridge({ adapter: adapterById('qwen'), env: { FAKE_ACP_CONTINUE: decision } })
    try {
      const init = await b.call('initialize', {})
      assert.equal(init.capabilities.continueTurn, true)
      const { thread } = await b.call('thread/start', { cwd: b.home })
      await b.turn(thread.id, 'hello')
      const result = await b.call('codeDesktop/turn/continue', { threadId: thread.id })
      assert.equal(result.accepted, decision === 'accept')
      if (decision === 'accept') {
        const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === result.turn.id)
        assert.equal(done.turn.status, 'completed')
        const prompts = b.agentLog().filter((entry) => entry.method === 'session/prompt')
        assert.deepEqual({ prompt: prompts.at(-1).params.prompt, meta: prompts.at(-1).params._meta }, { prompt: [], meta: { 'qwen.daemon.continueLastTurn': true } })
        const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
        const last = read.thread.turns.at(-1)
        assert.ok(!last.items.some((item) => item.type === 'userMessage'), 'no second copy of the message')
        assert.ok(last.items.some((item) => item.type === 'agentMessage' && /continued/.test(item.text)))
      } else {
        assert.equal(b.agentLog().filter((entry) => entry.method === 'session/prompt').length, 1, 'nothing resumed: no prompt sent')
      }
      assert.ok(b.agentLog().some((entry) => entry.method === 'qwen/control/session/continue'))
    } finally { await b.close() }
  }
})
