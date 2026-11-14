// ACP bridge (harness/packages/acp-bridge), overnight round 2 fixes: Kimi sub-agent approvals carry the sub-agent's own
// call (command, path; the guard and the mode judge it; the card on the child thread), Kimi background questions outlive
// their turn, Kimi's model-only MCP result text is dropped (its <mcp-result-extras> back as structuredContent), Qwen
// workflow runs settle with their agents done, named from their script, without stray rows for their agents' asks,
// Gemini MCP calls get their arguments from its session file, a MiniMax fork gets a home of its own, and a runner-role
// bridge reports a turn's settled usage before the turn completes. Server flows run against testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { kimiApprovalCall, kimiActionInput, kimiAgentTurnEvents } from '../packages/acp-bridge/src/agents/kimi.js'
import { qwenWorkflowRun, workflowFromCall, applyWorkflowTask, workflowSummary } from '../packages/acp-bridge/src/agents/qwen-workflow.js'
import { withoutModelNotes, completeToolItem } from '../packages/acp-bridge/src/projection.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r2f-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
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
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), ...env,
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
  const replies = (threadId) => notes.filter((note) => note.method === 'item/completed' && note.params.threadId === threadId && note.params.item.type === 'agentMessage').map((note) => note.params.item.text)
  return { home, notes, requests, call, turn, waitFor, agentLog, replies, close: () => server.shutdown() }
}
const mode = (permissionMode) => ({ codeDesktop: { permissionMode } })

// ------------------------------------------------------------ Kimi sub-agent approvals

test('Kimi sub-agent approval records become the call kimi-acp never streamed (command, file write, wording fallback)', () => {
  const bash = kimiApprovalCall({ toolCallId: 'call_1', toolName: 'Bash', action: 'Running: rm -rf ./x', display: { kind: 'command', command: 'rm -rf ./x' } }, 'agent-0')
  assert.deepEqual([bash.toolCallId, bash.title, bash.kind, bash.rawInput.command], ['agent-0:call_1', 'Bash', 'execute', 'rm -rf ./x'])
  const write = kimiApprovalCall({ toolCallId: 'call_2', toolName: 'Write', action: 'Writing /w/a.txt', display: { kind: 'file_io', operation: 'write', path: '/w/a.txt', content: 'hi' } }, 'agent-1')
  assert.deepEqual([write.kind, write.rawInput.path, write.rawInput.content, write.locations[0].path], ['edit', '/w/a.txt', 'hi', '/w/a.txt'])
  const edit = kimiApprovalCall({ toolCallId: 'call_3', toolName: 'Edit', display: { kind: 'diff', path: '/w/b.txt', before: 'a', after: 'b' } }, 'agent-1')
  assert.deepEqual(edit.content, [{ type: 'diff', path: '/w/b.txt', oldText: 'a', newText: 'b' }])
  assert.deepEqual(kimiActionInput('Bash', 'Requesting approval to Running: sudo ls'), { command: 'sudo ls' })
  assert.deepEqual(kimiActionInput('Write', 'Writing notes.md'), { path: 'notes.md' })
  assert.equal(kimiActionInput('screenshot', 'Requesting approval to take a screenshot'), null)
})

test('Kimi in a session: a sub-agent\'s command is judged by its own command (guard in Auto), the card on the child thread', async () => {
  const b = bridge({ onRequest: async () => ({ decision: 'accept' }) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    const done = await b.turn(thread.id, 'kimi-sub-bash rm -rf ./build', mode('auto'))
    assert.equal(done.status, 'completed')
    const card = b.requests.find((request) => request.method === 'item/commandExecution/requestApproval')
    assert.ok(card, 'Auto asks: Kimi Code\'s dangerous-command guard')
    assert.equal(card.params.command, 'rm -rf ./build')
    assert.match(card.params.reason, /dangerous-command guard/)
    assert.equal(card.params.sessionGrantable, false)
    assert.notEqual(card.params.threadId, thread.id, 'the card belongs to the sub-agent\'s child thread')
    assert.equal(card.params.itemId, 'agent-0:call_sub1')
    assert.ok(b.replies(thread.id).includes('sub:approve_once'))
    // No argument-less 'Bash' row in the parent.
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    assert.ok(!read.thread.turns.flatMap((turn) => turn.items).some((item) => String(item.id).endsWith('call_sub1')))
  } finally { await b.close() }
})

test('Kimi in a session: a sub-agent\'s write inside the project runs in Accept edits; Ask shows its command', async () => {
  const b = bridge({ onRequest: async () => ({ decision: 'accept' }) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('acceptEdits') })
    await b.turn(thread.id, `kimi-sub-write ${path.join(b.home, 'notes.txt')}`, mode('acceptEdits'))
    assert.equal(b.requests.filter((request) => /requestApproval$/.test(request.method)).length, 0, 'an edit inside the project needs no card')
    assert.ok(b.replies(thread.id).includes('sub:approve_once'))
    const { thread: asking } = await b.call('thread/start', { cwd: b.home, ...mode('ask') })
    await b.turn(asking.id, 'kimi-sub-bash echo hi', mode('ask'))
    const card = b.requests.find((request) => request.method === 'item/commandExecution/requestApproval')
    assert.equal(card?.params.command, 'echo hi')
  } finally { await b.close() }
})

// ------------------------------------------------------------ Kimi background questions

test('Kimi in a session: a background question stays answerable after its turn ends, under no turn, and the answer reaches Kimi', async () => {
  let answer = null
  const b = bridge({ onRequest: async (method) => (method === 'item/tool/requestUserInput' ? new Promise((resolve) => { answer = resolve }) : {}) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    const done = await b.turn(thread.id, 'kimi-bg-ask', mode('auto'))
    assert.equal(done.status, 'completed')
    await sleep(100)
    const asked = b.requests.filter((request) => request.method === 'item/tool/requestUserInput')
    assert.equal(asked.length, 2, 'asked in its turn, then again under no turn when the turn ended')
    assert.equal(asked[0].params.turnId, done.id)
    assert.equal(asked[1].params.turnId, '')
    assert.equal(asked[1].params.itemId, '0:call-ask')
    assert.ok(!b.agentLog().some((entry) => entry.method === 'background-answer'), 'not dismissed with the turn')
    // Once the turn has settled (its usage read), the detached question leaves the session idle.
    const settledBy = Date.now() + 6000
    const lastStatus = () => b.notes.filter((note) => note.method === 'thread/status/changed' && note.params.threadId === thread.id).at(-1)?.params.status.type
    while (lastStatus() !== 'idle' && Date.now() < settledBy) await sleep(50)
    assert.equal(lastStatus(), 'idle', 'a detached question leaves the session idle')
    answer({ answers: { q0: { answers: ['Blue'] } } })
    const end = Date.now() + 5000
    while (!b.agentLog().some((entry) => entry.method === 'background-answer') && Date.now() < end) await sleep(30)
    const logged = b.agentLog().find((entry) => entry.method === 'background-answer')
    assert.deepEqual(logged?.params, { action: 'accept', content: { q0: 'Blue' } })
  } finally { await b.close() }
})

test('Kimi background questions: the adapter tells them apart and lists them; their task\'s end closes the card', () => {
  const kimi = adapterById('kimi')
  assert.equal(kimi.backgroundQuestion({ rawInput: { questions: [{}], background: true } }), true)
  assert.equal(kimi.backgroundQuestion({ title: 'Starting background question: Which color?' }), true)
  assert.equal(kimi.backgroundQuestion({ content: [{ type: 'content', content: { type: 'text', text: 'task_id: question-x1\nstatus: running' } }] }), true)
  assert.equal(kimi.backgroundQuestion({ rawInput: { questions: [{}] }, title: 'AskUserQuestion' }), false)
  const dir = tmp()
  const file = path.join(dir, 'wire.jsonl')
  const info = { taskId: 'question-x1', description: 'Which color?', status: 'running', kind: 'question', toolCallId: 'call_9' }
  fs.writeFileSync(file, `${JSON.stringify({ type: 'task.started', agentId: 'main', info })}\n`)
  const state = {}
  kimiAgentTurnEvents(file, state)
  assert.equal(state.questions.size, 1)
  const thread = { kimiSelfLog: state, host: { exited: false }, cwd: dir, projector: { calls: new Map([['3:call_9', {}]]) }, kimiChildren: null, pending: new Map() }
  assert.deepEqual(kimi.backgroundProcesses(thread).map((row) => [row.itemId, row.command, row.stoppable]), [['3:call_9', 'Question: Which color?', false]])
  assert.equal(kimi.keepLoaded(thread), true)
  assert.equal(kimi.backgroundQuestionOpen(thread, '3:call_9'), true)
  fs.appendFileSync(file, `${JSON.stringify({ type: 'task.terminated', agentId: 'main', info: { ...info, status: 'killed' } })}\n`)
  kimiAgentTurnEvents(file, state)
  assert.equal(kimi.backgroundQuestionOpen(thread, '3:call_9'), false)
  assert.equal(kimi.backgroundProcesses(thread).length, 0)
})

// ------------------------------------------------------------ Kimi MCP result text

test('Kimi MCP results: the media wrapper and attachment notes are dropped, <mcp-result-extras> becomes structuredContent', () => {
  const content = [
    { type: 'content', content: { type: 'text', text: '<mcp_tool_result name="mcp__code_desktop__screenshot">' } },
    { type: 'content', content: { type: 'image', mimeType: 'image/png', data: 'AAAA' } },
    { type: 'content', content: { type: 'text', text: '</mcp_tool_result>' } },
    { type: 'content', content: { type: 'text', text: 'Original attachment saved at: "/s/media/f.png"\nAttachment reference: "kimi-file://f"\nSession-relative attachment: "media/f.png"\nMIME: "image/png"; size: 68 bytes. Pass the attachment reference to Read or ReadMediaFile in the current session. For other binary formats, Read reports the resolved local path for a converter.' } },
  ]
  assert.deepEqual(withoutModelNotes(content).content, [content[1]])
  const item = { type: 'mcpToolCall', id: 'c', server: 'code_desktop', tool: 'SendUserFile', status: 'inProgress', arguments: {}, result: null, error: null, durationMs: null }
  const sent = completeToolItem(item, { toolCallId: 'c', content: [{ type: 'content', content: { type: 'text', text: 'Sent 1 file to the user\n<mcp-result-extras>\n{"structuredContent":{"deliverables":[{"path":"/w/\\u003creport.md"}]},"_meta":{"x":1}}\n</mcp-result-extras>' } }] }, { failed: false, declined: false, durationMs: 5 })
  assert.deepEqual(sent.result.content, [{ type: 'text', text: 'Sent 1 file to the user' }])
  assert.deepEqual(sent.result.structuredContent, { deliverables: [{ path: '/w/<report.md' }] })
  assert.deepEqual(sent.result._meta, { x: 1 })
  // Text an agent did not wrap is left alone.
  const plain = [{ type: 'content', content: { type: 'text', text: 'MIME types are listed below.' } }]
  assert.equal(withoutModelNotes(plain).content, plain)
})

// ------------------------------------------------------------ Qwen workflows

test('Qwen workflow runs: named from the call title or script meta, its agents done when it completes, tokens from the summary', () => {
  const script = "export const meta = { name: 'probe-wf', description: 'Probe workflow', phases: [{ title: 'Scan' }] }\nphase('Scan')"
  const call = { toolCallId: 'c1', _meta: { toolName: 'workflow' }, title: 'Run workflow: probe-wf', rawInput: { script } }
  let run = qwenWorkflowRun(call, 1000)
  assert.deepEqual([run.name, run.description], ['probe-wf', 'Probe workflow'])
  // Arguments that arrive after the first update still name the run.
  const bare = qwenWorkflowRun({ toolCallId: 'c2', _meta: { toolName: 'workflow' }, title: 'Workflow' }, 1000)
  assert.equal(bare.name, 'workflow')
  assert.equal(workflowFromCall(bare, { ...call, toolCallId: 'c2' }, { time: 1100 }).name, 'probe-wf')
  // The registry labels an inline run by its id: never its name or description.
  run = applyWorkflowTask(run, { kind: 'workflow', id: 'wf_f4bba821f31cb627', label: 'wf_f4bba821f31cb627', description: 'wf_f4bba821f31cb627', status: 'running', phaseVisits: [{ id: 'v', title: 'Scan' }], dispatches: [{ id: 'd1', phaseVisitId: 'v', label: 'hi-agent', status: 'running', startedAt: 1 }], tokensSpent: 0 }, 2000)
  assert.deepEqual([run.name, run.description], ['probe-wf', 'Probe workflow'])
  const output = 'hi there\n--- workflow run ---\nrunId: wf_f4bba821f31cb627\nagents: 1 dispatched · 1 completed · 0 cached · 0 failed\ntokens: 30 spent'
  assert.deepEqual(workflowSummary(output), { runId: 'wf_f4bba821f31cb627', dispatched: 1, completed: 1, cached: 0, failed: 0, tokens: 30 })
  const settled = workflowFromCall(run, call, { time: 3000, done: true, output })
  assert.equal(settled.status, 'completed')
  assert.deepEqual(settled.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((entry) => [entry.label, entry.state, entry.error]), [['hi-agent', 'done', undefined]])
  assert.equal(settled.usage.totalTokens, 30)
  // A failure that doesn't start with 'Workflow failed:' keeps its reason.
  const refused = workflowFromCall(qwenWorkflowRun(call, 1), call, { time: 2, done: true, failed: true, output: 'WorkflowTool: `run_in_background` is available only in the interactive TUI.' })
  assert.deepEqual([refused.status, refused.summary], ['failed', 'WorkflowTool: `run_in_background` is available only in the interactive TUI.'])
})

test('Qwen in a session: a workflow agent\'s ask raises the card but leaves no row in the parent turn', async () => {
  const b = bridge({ adapter: adapterById('qwen'), onRequest: async () => ({ decision: 'accept' }) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('ask') })
    await b.turn(thread.id, 'qwen-wf-ask', mode('ask'))
    const card = b.requests.find((request) => request.method === 'item/commandExecution/requestApproval')
    assert.equal(card?.params.command, 'echo inner')
    assert.equal(card.params.reason, 'An agent in a running workflow asks to run this.')
    assert.ok(b.replies(thread.id).includes('wf-shell:proceed_once'))
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    assert.ok(!read.thread.turns.flatMap((turn) => turn.items).some((item) => String(item.id).startsWith('workflow:')))
    assert.ok(!b.notes.some((note) => /^item\//.test(note.method) && String(note.params?.item?.id ?? '').startsWith('workflow:')))
  } finally { await b.close() }
})

// ------------------------------------------------------------ Gemini call arguments

test('Gemini: a call\'s arguments come from its session file (its ACP sends none)', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const sessionId = '1a2b3c4d-0000-4000-8000-000000000000'
  const dir = path.join(home, '.gemini', 'tmp', 'proj', 'chats')
  fs.mkdirSync(dir, { recursive: true })
  const callId = 'mcp_code_desktop_ReportFindings__mcp_code_desktop_ReportFindings_1_0'
  const lines = [
    { sessionId, projectHash: 'h', startTime: '2026-10-08T00:00:00Z', lastUpdated: '2026-10-08T00:00:01Z' },
    { id: 'u1', type: 'user', content: [{ text: 'review' }] },
    { id: 'g1', type: 'gemini', content: '', toolCalls: [{ id: callId, name: 'mcp_code_desktop_ReportFindings', args: { findings: [{ file: 'a.md', line: 1, summary: 'Wrong' }] } }] },
  ]
  fs.writeFileSync(path.join(dir, `session-2026-10-08T00-00-${sessionId.slice(0, 8)}.jsonl`), lines.map((line) => JSON.stringify(line)).join('\n') + '\n')
  const ctx = { env: { HOME: home } }
  assert.deepEqual(gemini.toolArguments(ctx, sessionId, { toolCallId: callId }), { findings: [{ file: 'a.md', line: 1, summary: 'Wrong' }] })
  assert.equal(gemini.toolArguments(ctx, sessionId, { toolCallId: 'mcp_x_y__z' }), null, 'not recorded yet')
  assert.equal(gemini.toolArguments(ctx, sessionId, { toolCallId: callId, rawInput: { a: 1 } }), undefined, 'a call with its arguments is left alone')
})

// ------------------------------------------------------------ usage in runner role

test('Runner role: a turn whose usage settles after the prompt (Kimi, MiniMax) reports it before turn/completed', async () => {
  const b = bridge({ env: { CODE_DESKTOP_WORKFLOW_RUNNER: '1' } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const done = await b.turn(thread.id, 'usage')
    assert.equal(done.status, 'completed')
    const completedAt = b.notes.findIndex((note) => note.method === 'turn/completed' && note.params.turn.id === done.id)
    const usageAt = b.notes.findIndex((note) => note.method === 'thread/tokenUsage/updated' && note.params.threadId === thread.id && note.params.tokenUsage?.total?.totalTokens > 0)
    assert.ok(usageAt >= 0 && usageAt < completedAt, 'usage first, then the turn\'s end')
    const inbox = path.join(b.home, 'state', 'usage-inbox')
    assert.ok(fs.readdirSync(inbox).some((name) => fs.readFileSync(path.join(inbox, name), 'utf8').includes(thread.id)), 'the turn is in the outbox by then')
  } finally { await b.close() }
})

// ------------------------------------------------------------ MiniMax fork home, untitled throwaway sessions

const NATIVE = path.resolve(import.meta.dirname, '../../work/agents/acp-bridge/minimax-native')
const sqlite = (() => { try { return createRequire(path.join(NATIVE, 'package.json'))('better-sqlite3') } catch { return null } })()

test('MiniMax: a fork gets a home of its own (its source\'s sessions copied, not its leases or logs); a throwaway session is titled', { skip: !sqlite && 'needs the MiniMax native SQLite module (work/agents/acp-bridge/minimax-native)' }, () => {
  const minimax = adapterById('minimax')
  const root = tmp()
  const source = path.join(root, 'threads', 'a', 'minimax-home')
  const db = path.join(source, 'v2', 'sqlite', 'runtime-state.sqlite')
  fs.mkdirSync(path.dirname(db), { recursive: true })
  const handle = new sqlite(db)
  handle.pragma('journal_mode = WAL')
  handle.exec("create table local_runtime_sessions (session_id text primary key, record_json text not null, updated_at_ms integer not null, title text); insert into local_runtime_sessions values ('mvs_a', '{}', 1, null), ('mvs_fork', '{}', 2, null)")
  for (const [file, text] of [['v2/sessions/2026/s_a/messages.jsonl', '{"m":1}\n'], ['v2/runtime-owner-leases/lease.json', '{}'], ['v2/observability/mcode/log.jsonl', '{}']]) {
    fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true })
    fs.writeFileSync(path.join(source, file), text)
  }
  const ctx = { env: { MAVIS_SQLITE3_MODULE_PATH: NATIVE }, program: { node: process.execPath, binary: path.join(root, 'none') }, log: () => {} }
  try {
    const threadDir = path.join(root, 'threads', 'fork')
    const home = minimax.forkHome(ctx, { source: { agentHome: source }, threadDir })
    assert.equal(home, path.join(threadDir, 'minimax-home'))
    assert.notEqual(home, source)
    const copy = new sqlite(path.join(home, 'v2', 'sqlite', 'runtime-state.sqlite'), { readonly: true })
    try { assert.deepEqual(copy.prepare('select session_id from local_runtime_sessions order by session_id').all().map((row) => row.session_id), ['mvs_a', 'mvs_fork']) } finally { copy.close() }
    assert.equal(fs.readFileSync(path.join(home, 'v2', 'sessions', '2026', 's_a', 'messages.jsonl'), 'utf8'), '{"m":1}\n')
    assert.ok(!fs.existsSync(path.join(home, 'v2', 'runtime-owner-leases')) && !fs.existsSync(path.join(home, 'v2', 'observability')))
    // A session begun in the mcode terminal stays in the user's own home; no database, nothing to copy.
    assert.equal(minimax.forkHome(ctx, { source: { agentHome: 'real' }, threadDir }), null)
    assert.equal(minimax.forkHome(ctx, { source: { agentHome: path.join(root, 'empty') }, threadDir }), null)
    // A side question's session is titled before its prompt, so mcode's title model skips it (an existing title stays).
    minimax.hiddenSession(ctx, { launch: { stateHome: { home: source } }, sessionId: 'mvs_a' })
    assert.equal(handle.prepare("select title from local_runtime_sessions where session_id = 'mvs_a'").get().title, 'Side question')
    handle.prepare("update local_runtime_sessions set title = 'Mine' where session_id = 'mvs_fork'").run()
    minimax.hiddenSession(ctx, { launch: { stateHome: { home: source } }, sessionId: 'mvs_fork' })
    assert.equal(handle.prepare("select title from local_runtime_sessions where session_id = 'mvs_fork'").get().title, 'Mine')
  } finally { handle.close() }
})
