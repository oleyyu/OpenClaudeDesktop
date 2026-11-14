// ACP bridge, round 10 fixes:
//  - Kimi's home overlay settles what Kimi writes at its top level (its workspaces.json catalog, rewritten atomically;
//    a first run's logs/) into the real home when the process stops, and a deleted thread's launch folder goes too;
//  - /export's ZIP on Kimi (`kimi export`): capabilities.sessionLogExport and codeDesktop/sessionLog/export;
//  - Qwen: OpenClaude Desktop's tools instructions reach the model (appToolsInstructions, with where the deferred tools are);
//    a reopened session's first prompt waits for its code_desktop server (awaitSessionTools); an extension's skill runs
//    as '/<extension>:<skill>' and is listed once;
//  - Gemini: the history replay that goes on after session/load answers stays out of the next turn (replaysAfterLoad);
//    replayed history drops the hidden <session_context> and the '[Function Call: …]' / '[Function Response: …]'
//    stand-ins; workflow agents run without invoke_agent and enter_plan_mode;
//  - MiniMax: turns mcode starts on its own (a finished background task's delivery) are projected from its database
//    (minimaxTurnEvents); an approval outside any turn opens an agent turn that always ends; background sub-agents are
//    listed without a dead Stop button.
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
import { SESSION_CONFIG_KEY } from '../packages/acp-bridge/src/app-tools.js'
import { createOverlay, settleOverlay, settleOverlaysIn } from '../packages/acp-bridge/src/overlay.js'
import { qwenAppToolsInstructions, qwenSkillCommand, qwenAwaitSessionTools, QWEN_VISIBLE_APP_TOOLS } from '../packages/acp-bridge/src/agents/qwen.js'
import { geminiReplayText } from '../packages/acp-bridge/src/agents/gemini.js'
import { minimaxRowUpdates, minimaxTurnEvents, minimaxToolKind } from '../packages/acp-bridge/src/agents/minimax.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r10-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const TOOLS = {
  CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' }, instructions: 'Tools provided by OpenClaude Desktop.' }),
  CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-r10/s',
  CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok',
}

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), onRequest = async () => ({ decision: 'accept' }) } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_ACP_NO_SANDBOX: '1',
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

// ------------------------------------------------------------ Kimi home overlay

test('settleOverlay: a new top-level entry moves into the real home, an atomic rewrite merges back, replaced files stay', () => {
  const real = tmp()
  const dir = path.join(tmp(), 'kimi-home')
  fs.writeFileSync(path.join(real, 'SYSTEM.md'), 'mine')
  fs.writeFileSync(path.join(real, 'workspaces.json'), JSON.stringify({ version: 1, workspaces: { other: { root: '/other' } } }))
  createOverlay(real, dir, { files: { 'SYSTEM.md': 'thread prompt' }, ensureDirs: ['logs'], settle: true })
  assert.ok(fs.lstatSync(path.join(dir, 'logs')).isSymbolicLink(), 'logs/ is linked from the start')
  // Kimi's atomic write replaces the link with a file of its own; a first run creates cache/.
  fs.rmSync(path.join(dir, 'workspaces.json'))
  fs.writeFileSync(path.join(dir, 'workspaces.json'), JSON.stringify({ version: 1, workspaces: { here: { root: '/here' } } }))
  fs.mkdirSync(path.join(dir, 'cache'))
  fs.writeFileSync(path.join(dir, 'cache', 'x'), '1')
  settleOverlay(real, dir)
  const merged = JSON.parse(fs.readFileSync(path.join(real, 'workspaces.json'), 'utf8'))
  assert.deepEqual(Object.keys(merged.workspaces).sort(), ['here', 'other'], 'another session\'s entries stay')
  assert.equal(fs.readFileSync(path.join(real, 'cache', 'x'), 'utf8'), '1')
  assert.equal(fs.readFileSync(path.join(real, 'SYSTEM.md'), 'utf8'), 'mine', 'the bridge\'s own replaced file never reaches the real home')
  assert.ok(fs.lstatSync(path.join(dir, 'workspaces.json')).isSymbolicLink() && fs.lstatSync(path.join(dir, 'cache')).isSymbolicLink(), 'linked again')
  // Idempotent, and an overlay built without `settle` (or for another home) is left alone.
  settleOverlay(real, dir)
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(real, 'workspaces.json'), 'utf8')).workspaces).sort(), ['here', 'other'])
  const plain = path.join(tmp(), 'plain')
  createOverlay(real, plain, { files: { 'SYSTEM.md': 'x' } })
  fs.writeFileSync(path.join(plain, 'new.txt'), 'n')
  settleOverlay(real, plain)
  assert.equal(fs.existsSync(path.join(real, 'new.txt')), false)
  settleOverlay(tmp(), dir)
})

test('createOverlay with settle settles the previous overlay before rebuilding it (a process that died)', () => {
  const real = tmp()
  const dir = path.join(tmp(), 'kimi-home')
  createOverlay(real, dir, { files: { 'SYSTEM.md': 'a' }, settle: true })
  fs.writeFileSync(path.join(dir, 'kimi.json'), '{"a":1}')
  createOverlay(real, dir, { files: { 'SYSTEM.md': 'b' }, settle: true })
  assert.equal(fs.readFileSync(path.join(real, 'kimi.json'), 'utf8'), '{"a":1}')
  assert.ok(fs.lstatSync(path.join(dir, 'kimi.json')).isSymbolicLink())
  const parent = path.dirname(dir)
  fs.rmSync(path.join(dir, 'kimi.json'))
  fs.writeFileSync(path.join(dir, 'kimi.json'), '{"b":2}')
  settleOverlaysIn(parent)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(real, 'kimi.json'), 'utf8')), { a: 1, b: 2 })
})

test('Kimi launch: the overlay settles on exit for a session, never for the utility or a side question', () => {
  const kimi = adapterById('kimi')
  const home = tmp()
  const ctx = { env: { HOME: home, KIMI_CODE_HOME: path.join(home, '.kimi-code') }, log: () => {} }
  const session = kimi.launch(ctx, { threadDir: path.join(home, 't1'), appendPrompt: 'extra', disabledTools: [], disabledServers: [] })
  assert.equal(typeof session.onExit, 'function')
  assert.ok(fs.existsSync(path.join(home, '.kimi-code', 'logs')) && fs.existsSync(path.join(home, '.kimi-code', 'cache')), 'logs/ and cache/ live in the real home')
  const side = kimi.launch(ctx, { threadDir: path.join(home, 't2'), appendPrompt: 'extra', disabledTools: [], disabledServers: [], sideQuestion: true, ephemeral: true })
  assert.equal(side.onExit, undefined)
})

test('Kimi: deleting a thread removes the folder its first process launched from (pending-<uuid>), after settling it', async () => {
  const b = bridge({ env: TOOLS })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-r10' }, ...mode('auto') })
    await b.turn(thread.id, 'hello')
    const threadsDir = path.join(b.home, 'state', 'threads')
    const pending = fs.readdirSync(threadsDir).filter((name) => name.startsWith('pending-'))
    assert.equal(pending.length, 1, 'the session runs from its launch folder (the overlay of Kimi\'s home)')
    // Kimi wrote a catalog entry in place of its link.
    const overlay = path.join(threadsDir, pending[0], 'kimi-home')
    fs.writeFileSync(path.join(overlay, 'workspaces.json'), '{"workspaces":{"w":{}}}')
    await b.call('thread/delete', { threadId: thread.id })
    assert.equal(fs.existsSync(path.join(threadsDir, pending[0])), false)
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(b.home, '.kimi-code', 'workspaces.json'), 'utf8')), { workspaces: { w: {} } })
  } finally { await b.close() }
})

test('Kimi: /export offers its own session ZIP (sessionLogExport) and codeDesktop/sessionLog/export checks the path', async () => {
  assert.equal(typeof adapterById('kimi').sessionLogExport, 'function')
  const b = bridge()
  try {
    const init = await b.call('initialize', {})
    assert.equal(init.capabilities.sessionLogExport, true)
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    await assert.rejects(b.call('codeDesktop/sessionLog/export', { threadId: thread.id, path: 'relative.zip' }), /Choose where to save/)
    await assert.rejects(b.call('codeDesktop/sessionLog/export', { threadId: thread.id, path: path.join(b.home, 'out.md') }), /Choose where to save/)
    await assert.rejects(b.call('codeDesktop/sessionLog/export', { threadId: 'nope', path: path.join(b.home, 'out.zip') }), /not available/)
  } finally { await b.close() }
  const gemini = bridge({ adapter: adapterById('gemini') })
  try { assert.notEqual((await gemini.call('initialize', {})).capabilities.sessionLogExport, true) } finally { await gemini.close() }
})

// ------------------------------------------------------------ Qwen

test('Qwen: OpenClaude Desktop\'s tools instructions are its prompt\'s, with the up-front and deferred tool names', () => {
  const qwen = adapterById('qwen')
  assert.equal(typeof qwen.appToolsInstructions, 'function')
  const text = qwenAppToolsInstructions('Tools provided by OpenClaude Desktop.', 'code_desktop')
  assert.ok(text.startsWith('Tools provided by OpenClaude Desktop.'))
  for (const tool of QWEN_VISIBLE_APP_TOOLS) assert.ok(text.includes(`mcp__code_desktop__${tool}`))
  assert.ok(text.includes('mcp__code_desktop__read_console_messages') && /tool_search/.test(text) && /tool_call/.test(text))
})

test('qwenAwaitSessionTools waits for the server to connect and nothing to be connecting, bounded', async () => {
  const replies = [
    { mcp: { servers: [{ name: 'code_desktop', mcpStatus: 'connecting' }, { name: 'slow', mcpStatus: 'connecting' }] } },
    { mcp: { servers: [{ name: 'code_desktop', mcpStatus: 'connected' }, { name: 'slow', mcpStatus: 'connecting' }] } },
    { mcp: { servers: [{ name: 'code_desktop', mcpStatus: 'connected' }, { name: 'slow', mcpStatus: 'disconnected' }] } },
  ]
  const calls = []
  const host = { exited: false, call: async (method, params) => { calls.push([method, params]); return replies[Math.min(calls.length - 1, replies.length - 1)] } }
  assert.equal(await qwenAwaitSessionTools(host, 's1', 'code_desktop', { interval: 5, settle: 1 }), true)
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0], ['qwen/status/session/resources', { sessionId: 's1' }])
  // No status (an older Qwen), no such server (switched off), never connecting in time.
  assert.equal(await qwenAwaitSessionTools({ call: async () => { throw new Error('unknown method') } }, 's1', 'code_desktop', { interval: 5 }), false)
  assert.equal(await qwenAwaitSessionTools({ call: async () => ({ mcp: { servers: [] } }) }, 's1', 'code_desktop', { interval: 5 }), false)
  const t0 = Date.now()
  assert.equal(await qwenAwaitSessionTools({ call: async () => replies[0] }, 's1', 'code_desktop', { timeout: 120, interval: 10 }), false)
  assert.ok(Date.now() - t0 < 1000)
})

test('Qwen: an extension\'s skill runs as /<extension>:<skill>, and its command row is not listed twice', () => {
  const home = tmp()
  const ext = path.join(home, '.qwen', 'extensions', 'my-ext-dir')
  fs.mkdirSync(path.join(ext, 'skills', 'pdf'), { recursive: true })
  fs.writeFileSync(path.join(ext, 'qwen-extension.json'), JSON.stringify({ name: 'myext', version: '1.0.0' }))
  const file = path.join(ext, 'skills', 'pdf', 'SKILL.md')
  fs.writeFileSync(file, '---\nname: pdf\ndescription: PDF files\n---\nbody')
  const qwen = adapterById('qwen')
  assert.equal(qwenSkillCommand({ name: 'pdf', path: file }), 'myext:pdf', 'named by the manifest, not the folder')
  assert.equal(qwen.skillPrompt({ type: 'skill', name: 'pdf', path: file }), '/myext:pdf')
  assert.equal(qwen.skillPrompt({ type: 'skill', name: 'review', path: path.join(home, '.qwen', 'skills', 'review', 'SKILL.md') }), '/review')
  assert.equal(qwen.skillCommandName({ name: 'pdf', pluginId: 'myext', path: file }), 'myext:pdf')
})

// ------------------------------------------------------------ Gemini

test('Gemini: replayed history drops the hidden session context and the tool-part stand-ins', () => {
  assert.equal(geminiReplayText('<session_context>\nThis is the Gemini CLI.\n</session_context>', 'user'), null)
  assert.equal(geminiReplayText('<session_context>\nx\n</session_context>\n\nfix the bug', 'user'), 'fix the bug')
  assert.equal(geminiReplayText('[Function Response: mcp_code_desktop_run_in_terminal][Function Response: read_file]', 'user'), null)
  assert.equal(geminiReplayText('[Function Call: mcp_code_desktop_run_in_terminal]', 'agent'), null)
  assert.equal(geminiReplayText('Running it.[Function Call: run_shell_command]', 'agent'), 'Running it.')
  assert.equal(geminiReplayText('plain', 'agent'), 'plain')
  const gemini = adapterById('gemini')
  assert.equal(gemini.filterUpdate({ sessionUpdate: 'user_message_chunk', content: { type: 'text', text: '<session_context>\nx\n</session_context>' } }, undefined, { replay: true }).drop, true)
  assert.equal(gemini.filterUpdate({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '[Function Call: x]' } }, undefined, { replay: true }).drop, true)
  assert.equal(gemini.filterUpdate({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '[Function Call: x]' } }, undefined).drop, undefined, 'a live reply is never rewritten')
})

test('Gemini: workflow agents run without invoke_agent and enter_plan_mode; session/load replays are awaited', () => {
  const gemini = adapterById('gemini')
  assert.deepEqual(gemini.workflowAgentDisabledTools, ['invoke_agent', 'enter_plan_mode'])
  assert.equal(gemini.replaysAfterLoad, true)
})

test('a replay that goes on after session/load answered (replaysAfterLoad) stays out of the next turn', async () => {
  const kimi = adapterById('kimi')
  // A test adapter on the fake agent: a reopen goes through session/load (no resume), and an effort change relaunches.
  const adapter = { ...kimi, id: 'kimi', replaysAfterLoad: true, effortInLaunch: true }
  const b = bridge({ adapter, env: { FAKE_ACP_NO_RESUME: '1', FAKE_ACP_LATE_REPLAY: '1', FAKE_ACP_MODEL: 'm-effort' } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    await b.turn(thread.id, 'hello', { effort: 'low' })
    const from = b.notes.length
    const done = await b.turn(thread.id, 'again', { effort: 'high' })
    assert.ok(b.agentLog().some((entry) => entry.method === 'session/load'), 'the effort change reopened the session')
    const items = b.notes.slice(from).filter((note) => note.method === 'item/completed' && note.params.turnId === done.id).map((note) => note.params.item)
    assert.ok(!items.some((item) => item.id === 'old-call-1'), 'no replayed tool row')
    assert.ok(!items.some((item) => item.type === 'agentMessage' && /OLD-REPLY/.test(item.text)), 'no replayed reply text')
    assert.ok(items.some((item) => item.type === 'agentMessage'))
  } finally { await b.close() }
})

// ------------------------------------------------------------ MiniMax

test('minimaxRowUpdates: a stored message row as the updates mcode streams live', () => {
  const row = { id: 5, role: 'assistant', data: { role: 'assistant', msg_type: 2, msg_content: '', thinking_content: 'hmm', tool_calls: [{ tool_name: 'write', tool_call_id: 'call_0', tool_call_status: 2, tool_call_args: '{"path":"/w/a.txt","content":"x"}', tool_call_result_data: '{"content":[{"type":"text","text":"ok"}]}' }] } }
  const updates = minimaxRowUpdates(row)
  assert.deepEqual(updates.map((update) => update.sessionUpdate), ['agent_thought_chunk', 'tool_call'])
  assert.deepEqual(updates[1], { sessionUpdate: 'tool_call', toolCallId: 'call_0', title: 'write', name: 'write', kind: 'edit', status: 'completed', rawInput: { path: '/w/a.txt', content: 'x' }, rawOutput: { content: [{ type: 'text', text: 'ok' }] }, locations: [{ path: '/w/a.txt' }] })
  assert.deepEqual(minimaxRowUpdates({ id: 6, role: 'assistant', data: { msg_type: 1, msg_content: 'done' } }), [{ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'done' } }])
  assert.deepEqual(minimaxRowUpdates({ id: 7, role: 'user', data: { msg_content: '<background-task-finished>' } }), [])
  assert.equal(minimaxToolKind('bash'), 'execute')
})

test('minimaxTurnEvents: a turn mcode ran on its own opens, projects its rows, counts its usage once and ends; client turns are passed over', () => {
  const state = {}
  const turns = [
    { turnId: 't-client', status: 'completed', foreground: true, acceptedAt: 1 },
    { turnId: 't-bg', status: 'accepted', foreground: false, acceptedAt: 2 },
  ]
  const rows = [{ id: 3, turnId: 't-bg', role: 'assistant', data: { msg_type: 2, tool_calls: [{ tool_name: 'bash', tool_call_id: 'c1', tool_call_status: 2, tool_call_args: '{"command":"ls"}' }] } }]
  let events = minimaxTurnEvents(state, { turns, rows })
  assert.deepEqual(events.map((event) => Object.keys(event)[0]), ['start', 'update'])
  assert.equal(state.open, 't-bg')
  // The same rows again (a later read): nothing new until the turn ends.
  assert.deepEqual(minimaxTurnEvents(state, { turns, rows }), [])
  const finished = [turns[0], { ...turns[1], status: 'completed' }]
  const more = [...rows, { id: 4, turnId: 't-bg', role: 'assistant', data: { msg_type: 1, msg_content: 'FINAL' } }]
  events = minimaxTurnEvents(state, { turns: finished, rows: more, usage: { calls: 2, inputTokens: 10, outputTokens: 5, reasoningTokens: 0, cacheReadTokens: 4, cacheWriteTokens: 0, lastId: 9 } })
  assert.deepEqual(events.map((event) => Object.keys(event)[0]), ['update', 'usage', 'end'])
  assert.equal(events[0].update.content.text, 'FINAL')
  assert.deepEqual(events[1].usage, { inputTokens: 14, cachedInputTokens: 4, outputTokens: 5, reasoningOutputTokens: 0 })
  assert.equal(state.usageLastId, 9)
  assert.equal(events[2].end.status, 'completed')
  assert.equal(state.open, null)
  assert.deepEqual(minimaxTurnEvents(state, { turns: finished, rows: more }), [], 'never twice')
  const failed = minimaxTurnEvents({}, { turns: [{ turnId: 'x', status: 'failed', foreground: false, acceptedAt: 1 }], rows: [] })
  assert.equal(failed.at(-1).end.status, 'failed')
})

test('MiniMax: a background sub-agent is listed without a Stop button; a background command keeps its Stop', () => {
  const minimax = adapterById('minimax')
  const thread = { cwd: '/w', host: { exited: false, child: { pid: 1 } }, minimaxStatus: { at: Date.now(), rows: [
    { taskId: 'bg_1', kind: 'subagent', status: 'running', toolCallId: 'call_1', command: null, description: 'sub probe' },
    { taskId: 'bg_2', kind: 'bash', status: 'running', toolCallId: 'call_2', command: 'npm run dev', description: 'dev' },
  ] } }
  const rows = minimax.backgroundProcesses(thread)
  assert.deepEqual(rows.map((row) => [row.processId, row.command, row.stoppable]), [['bg_1', 'sub probe', false], ['bg_2', 'npm run dev', undefined]])
  assert.equal(minimax.stopBackground(thread, 'bg_1'), false)
})

test('an approval the agent asks outside any turn opens an agent turn that ends, so the queue drains', async () => {
  const qwen = adapterById('qwen')
  const b = bridge({ adapter: qwen, env: { QWEN_HOME: path.join(tmp(), '.qwen'), QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(tmp(), 'none.json') }, onRequest: async () => ({ decision: 'accept' }) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('ask') })
    const first = await b.turn(thread.id, 'stray-permission', mode('ask'))
    const request = await (async () => { for (let i = 0; i < 200; i++) { const found = b.requests.find((entry) => /requestApproval/.test(entry.method)); if (found) return found; await sleep(20) } return null })()
    assert.ok(request, 'the card was shown')
    assert.notEqual(request.params.turnId, first.id, 'on a turn of its own, not the ended one')
    const started = await b.waitFor((method, params) => method === 'turn/started' && params.turn.id === request.params.turnId)
    assert.ok(started)
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    const agentTurn = read.thread.turns.find((entry) => entry.id === request.params.turnId)
    assert.ok(agentTurn, 'the agent turn is part of the thread')
  } finally { await b.close() }
})

test('Kimi: workflow agents run without its sub-agent, question, plan, cron and goal tools; disallowedTools can turn web and Agent off', async () => {
  const kimi = adapterById('kimi')
  for (const name of ['Agent', 'AgentSwarm', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', 'CronCreate', 'CronList', 'CronDelete', 'CreateGoal', 'UpdateGoal', 'SetGoalBudget'])
    assert.ok(kimi.workflowAgentDisabledTools.includes(name), name)
  assert.deepEqual(kimi.workflowToolSwitches, { WebFetch: ['FetchURL'], WebSearch: ['WebSearch'], Agent: ['Agent', 'AgentSwarm'], Task: ['Agent', 'AgentSwarm'] })
  const fsp = await import('node:fs/promises')
  const osm = await import('node:os')
  const pathm = await import('node:path')
  const home = await fsp.mkdtemp(pathm.join(osm.tmpdir(), 'kimi-wf-'))
  try {
    const kimiHome = pathm.join(home, 'kimi'); await fsp.mkdir(kimiHome, { recursive: true })
    await fsp.writeFile(pathm.join(kimiHome, 'config.toml'), 'default_model = "k"\n')
    const launched = kimi.launch({ env: { HOME: home, KIMI_CODE_HOME: kimiHome } }, { threadDir: pathm.join(home, 'thread'), disabledTools: ['Agent', 'AgentSwarm', 'FetchURL'] })
    const text = await fsp.readFile(pathm.join(launched.env.KIMI_CODE_HOME, 'config.toml'), 'utf8')
    for (const name of ['Agent', 'AgentSwarm', 'FetchURL']) assert.match(text, new RegExp(`"${name}"`))
    assert.match(text, /default_model = "k"/)
  } finally { await fsp.rm(home, { recursive: true, force: true }) }
})
