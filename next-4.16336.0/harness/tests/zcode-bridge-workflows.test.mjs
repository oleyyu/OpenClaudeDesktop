// ZCode's own dynamic workflows in the ZCode bridge (packages/zcode-bridge/src/workflows.js): a CreateWorkflow /
// AmendWorkflow / ResumeWorkflowRun call carries its run as item.workflowRun in the app's run shape, live (LiveProjector
// + the run's journal) and on resume (history.js + the same journal), stopped one run at a time, and offered in every
// permission mode with one approval per run outside Bypass. The bridge-level checks drive bin/app-server.mjs over
// test-support/fake-zcode.mjs (a temp HOME).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { LiveProjector } from '../packages/zcode-bridge/src/live.js'
import { turnsFromMessages } from '../packages/zcode-bridge/src/history.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import {
  WORKFLOW_RUN_APPROVAL_REASON, WORKFLOW_RUN_TOOLS, applyWorkflowEvents, applyWorkflowSummary, applyWorkflowToolResult, bindWorkflowRun, isWorkflowRunTool,
  workflowApprovalSummary, workflowNoticeItems, workflowNotices, workflowRunIdOf, workflowRunOf, workflowState,
} from '../packages/zcode-bridge/src/workflows.js'

const root = path.resolve(import.meta.dirname, '..')
const BIN = path.join(root, 'packages/zcode-bridge/bin/app-server.mjs')
const FAKE = path.join(root, 'packages/zcode-bridge/test-support/fake-zcode.mjs')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ask = (n) => ({ siteId: `ask#${n}`, ordinal: 0 })
const actor = (n) => ({ siteId: `actor#${n}`, ordinal: 0 })
// A run's journal as ZCode's engine writes it (engine/types.ts RunEvent; v4/conversation/workflowRunEvents shape).
const JOURNAL = [
  ['run-started', { runId: 'dwfrun-1', caps: { maxConcurrency: 4 } }],
  ['run-launched', { inputId: 'in_1', phaseNames: ['Scan', 'Fix'], subagentModel: 'zai/glm-5' }],
  ['phase-entered', { name: 'Scan', ordinal: 1 }],
  ['actor-created', { actor: actor(1), name: 'scanner', phaseName: 'Scan' }],
  ['node-queued', { instance: ask(1), kind: 'ask', actor: actor(1), phaseName: 'Scan', instructionsHead: 'Scan the repo for TODOs\nand list them' }],
  ['node-dispatched', { instance: ask(1), kind: 'ask', actor: actor(1), actorName: 'scanner' }],
  ['node-executing', { instance: ask(1) }],
  ['node-progress', { instance: ask(1), turn: 1, toolCalls: 3, lastTool: { name: 'Grep', target: 'TODO' } }],
  ['node-settled', { instance: ask(1), outcome: 'ok' }],
  ['node-queued', { instance: { siteId: 'world-read#1', ordinal: 0 }, kind: 'world-read', phaseName: 'Scan' }],
  ['node-settled', { instance: { siteId: 'world-read#1', ordinal: 0 }, outcome: 'ok' }],
  ['phase-entered', { name: 'Fix', ordinal: 1 }],
  ['actor-created', { actor: actor(2), name: 'fixer', phaseName: 'Fix' }],
  ['node-queued', { instance: ask(2), kind: 'ask', actor: actor(2), phaseName: 'Fix', instructionsHead: 'Fix TODO 1' }],
  ['node-executing', { instance: ask(2) }],
  ['node-settled', { instance: ask(2), outcome: 'failed', error: { message: 'Edit refused' } }],
  ['actor-created', { actor: actor(3), name: 'fixer-2', phaseName: 'Fix' }],
  ['node-queued', { instance: ask(3), kind: 'ask', actor: actor(3), phaseName: 'Fix' }],
  ['node-settled', { instance: ask(3), outcome: 'cancelled' }],
  ['usage-updated', { spentTokens: 4321 }],
  ['run-settled', { status: 'completed' }],
].map(([type, payload], index) => ({ sequence: index + 1, type, payload }))

// What must agree between a live run and its replay (journal events carry no times, so times may differ).
const shape = (run) => ({
  id: run.id, runId: run.runId, callId: run.callId, source: run.source, name: run.name, status: run.status, summary: run.summary, background: run.background,
  usage: run.usage, memberControls: run.memberControls, stopScope: run.stopScope,
  progress: run.workflowProgress.map(({ startedAt, lastProgressAt, durationMs, ...entry }) => entry),
})

function projector() {
  const out = []
  const p = new LiveProjector({ threadId: 'sess_1', cwd: () => '/w', emit: (method, params) => out.push({ method, params }), onChild: () => {}, takeInput: () => null })
  return { p, out }
}
const env = { turnId: 'turn_1' }
const RESPONSE = 'The workflow script compiled cleanly and the run started in the background with ID: dwfrun-1. It is still running — you will be notified with the final output when it completes.'

test('the run tools and the run id each response names', () => {
  assert.deepEqual(WORKFLOW_RUN_TOOLS, ['CreateWorkflow', 'AmendWorkflow', 'ResumeWorkflowRun'])
  assert.equal(isWorkflowRunTool('ListWorkflowRuns'), false)
  assert.equal(workflowRunIdOf(RESPONSE), 'dwfrun-1')
  assert.equal(workflowRunIdOf('Run dwfrun-0 was still running: it has been stopped and superseded. The revised script started in the background as run dwfrun-2. It is still running'), 'dwfrun-2')
  assert.equal(workflowRunIdOf('The workflow run dwfrun-3 has been resumed and is running in the background.'), 'dwfrun-3')
  assert.equal(workflowRunIdOf('The workflow script has errors:\n1:2 x\nNOTE: The workflow was NOT executed'), null)
})

test('live: a CreateWorkflow call carries its run; the journal fills phases and agents; a re-read changes nothing', () => {
  const { p, out } = projector()
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_wf', toolName: 'CreateWorkflow', input: { name: 'todo-audit', script: 'phase("Scan")' } }, env)
  const started = out.find((entry) => entry.method === 'item/started' && entry.params.item.id === 'toolu_wf').params.item
  assert.equal(started.type, 'dynamicToolCall')
  assert.deepEqual({ ...started.workflowRun, startedAt: 0 }, { id: 'call-toolu_wf', source: 'model', callId: 'toolu_wf', runId: null, name: 'todo-audit', description: 'todo-audit', status: 'running', startedAt: 0, background: true, sequence: 1, workflowProgress: [], usage: { totalTokens: 0 }, stopScope: 'turn' })
  assert.equal(started.workflowRun.memberControls, undefined, 'ZCode has no per-agent skip or retry')
  assert.deepEqual(p.liveWorkflows(), [], 'nothing to poll before ZCode names the run')
  // The result names the run: it is ZCode's run from now on, and Stop no longer needs the turn.
  p.event('tool.updated', { kind: 'result', toolCallId: 'toolu_wf', result: { success: true, content: RESPONSE } }, env)
  const completed = out.findLast((entry) => entry.method === 'item/completed' && entry.params.item.id === 'toolu_wf').params.item
  assert.equal(completed.status, 'completed')
  assert.equal(completed.workflowRun.id, 'dwfrun-1')
  assert.equal(completed.workflowRun.runId, 'dwfrun-1')
  assert.equal(completed.workflowRun.status, 'running', 'the run goes on in the background after the call')
  assert.equal(completed.workflowRun.stopScope, undefined)
  // The background task (taskKind 'workflow', taskId ≡ runId) is the workflow's, not a terminal's.
  p.event('session.updated', { taskId: 'dwfrun-1', toolCallId: 'toolu_wf', taskKind: 'workflow', status: 'running' }, env)
  assert.deepEqual(p.backgroundTerminals(), [])
  assert.deepEqual(p.liveWorkflows(), [{ callId: 'toolu_wf', runId: 'dwfrun-1', cursor: 0, taskEnded: null }])
  p.event('turn.completed', { resultType: 'success' }, env)
  assert.equal(p.liveWorkflows().length, 1, 'the turn ending does not end the run')

  // Half the journal, then the rest (the poller's two reads).
  assert.equal(p.workflowEvents('toolu_wf', JOURNAL.slice(0, 8), 10_000), true)
  let run = p.workflowEntry('toolu_wf').state.run
  assert.equal(run.currentPhase, 0)
  const scanner = run.workflowProgress.find((entry) => entry.id === 'ask#1@0')
  assert.equal(scanner.state, 'progress')
  assert.equal(scanner.label, 'scanner')
  assert.equal(scanner.phaseTitle, 'Scan')
  assert.equal(scanner.toolCalls, 3)
  assert.equal(scanner.lastToolName, 'Grep')
  assert.equal(scanner.model, 'zai/glm-5')
  assert.equal(scanner.promptPreview, 'Scan the repo for TODOs\nand list them')
  assert.equal(scanner.startedAt, 10_000, 'the bridge clock times a live agent')
  assert.equal(p.liveWorkflows()[0].cursor, 8)
  p.workflowEvents('toolu_wf', JOURNAL, 12_500)
  run = p.workflowEntry('toolu_wf').state.run
  assert.equal(run.status, 'completed')
  assert.equal(run.summary, undefined)
  assert.equal(run.currentPhase, undefined)
  assert.deepEqual(run.usage, { totalTokens: 4321 })
  assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_phase').map(({ index, title }) => [index, title]), [[0, 'Scan'], [1, 'Fix']])
  const agents = run.workflowProgress.filter((entry) => entry.type === 'workflow_agent')
  assert.deepEqual(agents.map(({ index, id, label, state, phaseIndex, error }) => ({ index, id, label, state, phaseIndex, error })), [
    { index: 1, id: 'ask#1@0', label: 'scanner', state: 'done', phaseIndex: 0, error: undefined },
    { index: 2, id: 'ask#2@0', label: 'fixer', state: 'error', phaseIndex: 1, error: 'Edit refused' },
    // A cancelled agent is Skipped, not failed.
    { index: 3, id: 'ask#3@0', label: 'fixer-2', state: 'skipped', phaseIndex: 1, error: undefined },
  ], 'one agent per ask instance; the world-read is not an agent')
  assert.equal(agents[0].durationMs, 2500)
  assert.deepEqual(p.liveWorkflows(), [], 'a settled run is not polled')
  const update = out.findLast((entry) => entry.method === 'item/completed' && entry.params.item.id === 'toolu_wf')
  assert.equal(update.params.turnId, 'turn_1', 'the update replaces the item in the turn it belongs to')
  assert.equal(update.params.item.workflowRun, run)
  assert.ok(run.sequence > completed.workflowRun.sequence, 'sequence grows with each change')
  const emitted = out.length
  assert.equal(p.workflowEvents('toolu_wf', JOURNAL, 20_000), false, 'events already folded change nothing')
  assert.equal(out.length, emitted)
})

test('replay: the same journal rebuilds the same run on resume (history.js + the run’s journal)', () => {
  const { p } = projector()
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_wf', toolName: 'CreateWorkflow', input: { name: 'todo-audit', script: 's' } }, env)
  p.event('tool.updated', { kind: 'result', toolCallId: 'toolu_wf', result: { success: true, content: RESPONSE } }, env)
  p.workflowEvents('toolu_wf', JOURNAL.slice(0, 5), 1)
  p.workflowEvents('toolu_wf', JOURNAL.slice(5, 14), 2)
  p.workflowEvents('toolu_wf', JOURNAL.slice(14), 3)
  const live = p.workflowEntry('toolu_wf').state.run

  const messages = [
    { info: { role: 'user', id: 'msg_u', time: { created: 1 }, anchor: { turnId: 'turn_1' }, semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible' } }, parts: [{ type: 'text', text: 'audit' }] },
    { info: { role: 'assistant', id: 'msg_a', time: { created: 2, completed: 3 }, anchor: { turnId: 'turn_1' } }, parts: [
      { type: 'tool', tool: 'CreateWorkflow', callID: 'toolu_wf', state: { status: 'completed', input: { name: 'todo-audit', script: 's' }, output: RESPONSE, time: { start: 2, end: 3 } } },
    ] },
  ]
  const item = turnsFromMessages(messages, { threadId: 'sess_1', cwd: '/w' }).turns[0].items.find((entry) => entry.id === 'toolu_wf')
  assert.equal(item.type, 'dynamicToolCall')
  assert.equal(item.workflowRun.runId, 'dwfrun-1', 'the tool part alone names the run')
  assert.equal(item.workflowRun.status, 'running')
  const state = workflowState(item.workflowRun)
  applyWorkflowEvents(state, JOURNAL, { time: 4 })
  assert.deepEqual(shape(state.run), shape(live))
  assert.equal(state.run.workflowProgress.find((entry) => entry.id === 'ask#1@0').startedAt, undefined, 'a replayed agent has no start time')
  // A sub-agent's own tool part (call id prefix) carries no run.
  assert.equal(turnsFromMessages(messages, { threadId: 'sess_sub', cwd: '/w', callIdPrefix: 'tool_subagent_x_' }).turns[0].items[1].workflowRun, undefined)
})

test('a run that never started: diagnostics, a declined approval, a turn stopped before the result', () => {
  const failed = workflowState(workflowRunOf({ callId: 'c1', tool: 'CreateWorkflow', input: { script: 'x' }, time: 0 }))
  applyWorkflowToolResult(failed, { status: 'completed', content: 'The workflow script has errors:\nline 1: x\n\nNOTE: The workflow was NOT executed — fix the errors above and resubmit.' }, 50)
  assert.equal(failed.run.status, 'failed')
  assert.equal(failed.run.summary, 'The workflow script has errors:')
  assert.equal(failed.run.durationMs, 50)
  assert.equal(failed.run.stopScope, undefined)
  const declined = workflowState(workflowRunOf({ callId: 'c2', tool: 'CreateWorkflow', input: {}, time: 0 }))
  applyWorkflowToolResult(declined, { status: 'declined', error: 'The user declined.' }, 1)
  assert.deepEqual([declined.run.status, declined.run.summary], ['stopped', 'Declined'])

  const { p, out } = projector()
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_x', toolName: 'CreateWorkflow', input: { path: '/w/.zcode/workflows/audit.ts' } }, env)
  p.event('turn.completed', { resultType: 'cancelled' }, env)
  const item = out.findLast((entry) => entry.method === 'item/completed' && entry.params.item.id === 'toolu_x').params.item
  assert.equal(item.workflowRun.name, 'audit', 'a script file names the run')
  assert.deepEqual([item.workflowRun.status, item.workflowRun.summary], ['stopped', 'Stopped'])
  // A run ZCode already named outlives its call (background task): an interrupted call leaves it running.
  const resumed = workflowState(workflowRunOf({ callId: 'c3', tool: 'ResumeWorkflowRun', input: { run_id: 'dwfrun-9' }, time: 0 }))
  assert.equal(resumed.run.id, 'dwfrun-9')
  applyWorkflowToolResult(resumed, { status: 'interrupted' })
  assert.equal(resumed.run.status, 'running')
})

test('the task end and the run summary settle a run whose journal never did (ZCode exited, reconciled)', () => {
  const { p } = projector()
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_wf', toolName: 'CreateWorkflow', input: { script: 's' } }, env)
  // The task names the run before the result (and its end arrives later).
  p.event('session.updated', { taskId: 'dwfrun-1', toolCallId: 'toolu_wf', taskKind: 'workflow', status: 'running' }, env)
  assert.equal(p.workflowEntry('toolu_wf').state.run.runId, 'dwfrun-1')
  p.workflowEvents('toolu_wf', JOURNAL.slice(0, 7), 1)
  p.event('session.updated', { taskId: 'dwfrun-1', toolCallId: 'toolu_wf', taskKind: 'workflow', status: 'failed' }, env)
  assert.equal(p.liveWorkflows()[0].taskEnded, 'failed')
  p.workflowSettle('toolu_wf', { runId: 'dwfrun-1', toolCallId: 'toolu_wf', label: 'audit', status: 'errored', failureMessage: 'Provider unavailable', updatedAt: 9, resumable: true })
  const run = p.workflowEntry('toolu_wf').state.run
  assert.deepEqual([run.status, run.summary, run.name, run.completedAt], ['failed', 'Provider unavailable', 'audit', 9])
  assert.equal(run.workflowProgress.find((entry) => entry.id === 'ask#1@0').state, 'error', 'an agent cut off by the failure')
  // ZCode itself stopping: a live run ends with it.
  const other = projector()
  other.p.event('turn.started', {}, env)
  other.p.event('model.streaming', { kind: 'tool_call', toolCallId: 't2', toolName: 'CreateWorkflow', input: {} }, env)
  other.p.event('tool.updated', { kind: 'result', toolCallId: 't2', result: { success: true, content: RESPONSE } }, env)
  other.p.workflowsInterrupted(5)
  assert.equal(other.p.workflowEntry('t2').state.run.status, 'failed')
  assert.equal(other.p.hasLiveWorkflows(), false)
})

test('a run resumed by a later call: the earlier item shows it up to that resume, the later one goes on', () => {
  const journal = [...JOURNAL.slice(0, 7), { sequence: 8, type: 'run-settled', payload: { status: 'stopped', stopReason: 'user' } },
    { sequence: 9, type: 'run-started', payload: { runId: 'dwfrun-1' } }, { sequence: 10, type: 'node-settled', payload: { instance: ask(1), outcome: 'ok', cached: true } }]
  const first = workflowState(workflowRunOf({ callId: 'a', tool: 'CreateWorkflow', input: {}, time: 0 }))
  bindWorkflowRun(first, 'dwfrun-1')
  applyWorkflowEvents(first, journal, { time: 1, stopAtStart: 2 })
  assert.deepEqual([first.run.status, first.run.summary], ['stopped', 'Stopped'])
  assert.equal(first.run.workflowProgress.find((entry) => entry.id === 'ask#1@0').state, 'skipped')
  const second = workflowState(workflowRunOf({ callId: 'b', tool: 'ResumeWorkflowRun', input: { run_id: 'dwfrun-1' }, time: 0 }))
  applyWorkflowEvents(second, journal, { time: 2 })
  assert.equal(second.run.status, 'running', 'run-started reopens it')
  const agent = second.run.workflowProgress.find((entry) => entry.id === 'ask#1@0')
  assert.deepEqual([agent.state, agent.cached], ['done', true])
  // A summary of a superseded run (AmendWorkflow) explains the stop.
  const amended = workflowState(workflowRunOf({ callId: 'c', tool: 'CreateWorkflow', input: {}, time: 0 }))
  applyWorkflowSummary(amended, { runId: 'dwfrun-5', status: 'stopped', stopReason: 'superseded', updatedAt: 3 })
  assert.deepEqual([amended.run.runId, amended.run.status, amended.run.summary], ['dwfrun-5', 'stopped', 'Replaced by a revised run'])
})

// ------------------------------------------------------------------ the bridge over a fake ZCode

function bridge(extraEnv = {}, options = {}) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-zc-wf-')))
  return bridgeAt(home, extraEnv, options)
}
function bridgeAt(home, extraEnv = {}, { decision = 'accept' } = {}) {
  const logFile = path.join(home, 'zcode.log')
  const child = spawn(process.execPath, [BIN, 'app-server', '--stdio'], {
    cwd: home,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), CODE_DESKTOP_AGENT_BINARY: FAKE, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), FAKE_ZCODE_LOG: logFile, FAKE_ZCODE_WORKFLOW: path.join(home, 'workflow.json'), ...extraEnv },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const stderr = []
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)))
  const notes = []
  const requests = []
  const client = new LineTransport(child.stdout, child.stdin, { onRequest: async (method, params) => { requests.push({ method, params }); return { decision } }, onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const log = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return {
    home, notes, requests, log, stderr,
    call: (method, params) => client.call(method, params, 30000),
    close: async () => { child.kill('SIGTERM'); await sleep(200) },
  }
}
const workflowItem = (turns) => turns.flatMap((turn) => turn.items).find((item) => item.id === 'toolu_wf')

test('bridge: a resumed session shows its run from the journal, Stop cancels only that run, a new bridge replays it', { timeout: 60000 }, async () => {
  const b = bridge()
  try {
    const init = await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    assert.equal(init.capabilities.modelWorkflows, true)
    assert.equal(Object.hasOwn(init.capabilities, 'workflowsNeedBypass'), false, 'runs are offered in every mode')
    const response = await b.call('thread/resume', { threadId: 'sess_wf_1', codeDesktop: { dynamicWorkflows: true } })
    // The gate is the session's own (session/resume dynamicWorkflowEnabled), never the whole process's policy.
    const resumed = b.log().find((entry) => entry.method === 'session/resume' && entry.params.sessionId === 'sess_wf_1')
    assert.equal(resumed.params.dynamicWorkflowEnabled, true)
    assert.ok(!resumed.params.toolDenylist.includes('CreateWorkflow'), 'the session registers the run tools')
    assert.equal(b.log().some((entry) => entry.method === 'workspace/updateDynamicWorkflowPolicy'), false)
    const run = workflowItem(response.thread.turns).workflowRun
    assert.equal(run.runId, 'dwfrun-a')
    assert.equal(run.status, 'running')
    assert.equal(run.name, 'todo-audit')
    assert.deepEqual(run.usage, { totalTokens: 1234 })
    assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((entry) => [entry.label, entry.state, entry.phaseTitle]), [['scanner', 'done', 'Scan'], ['fixer', 'progress', 'Fix']])
    // Stop: the run's background task only (taskId ≡ runId); no turn is stopped.
    assert.deepEqual(await b.call('codeDesktop/workflow/stop', { threadId: 'sess_wf_1', runId: 'dwfrun-a' }), { status: 'stopping' })
    assert.ok(b.log().some((entry) => entry.method === 'session/cancelBackgroundTask' && entry.params.taskId === 'dwfrun-a'))
    assert.equal(b.log().some((entry) => entry.method === 'session/stop'), false)
    const end = Date.now() + 10000
    let stopped = null
    while (!stopped && Date.now() < end) {
      stopped = b.notes.find((note) => note.method === 'item/completed' && note.params.item.id === 'toolu_wf' && note.params.item.workflowRun?.status === 'stopped')?.params.item.workflowRun ?? null
      if (!stopped) await sleep(50)
    }
    assert.ok(stopped, 'the stopped run reaches the client')
    assert.equal(stopped.summary, 'Stopped')
    assert.deepEqual(stopped.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((entry) => entry.state), ['done', 'skipped'])
    assert.deepEqual(await b.call('codeDesktop/workflow/stop', { threadId: 'sess_wf_1', runId: 'dwfrun-a' }), { status: 'alreadyFinished' })
    await assert.rejects(b.call('codeDesktop/workflow/member', { threadId: 'sess_wf_1', runId: 'dwfrun-a', seq: 1, action: 'skip' }), /not supported/)
    assert.equal(stopped.resumable, true, 'ZCode marks a stopped run resumable (run-settled payload)')
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
  // A restarted bridge (and ZCode) rebuilds the same run from the same journal.
  const again = bridgeAt(b.home)
  try {
    await again.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const response = await again.call('thread/resume', { threadId: 'sess_wf_1', codeDesktop: { dynamicWorkflows: true } })
    const run = workflowItem(response.thread.turns).workflowRun
    assert.deepEqual([run.runId, run.status, run.summary], ['dwfrun-a', 'stopped', 'Stopped'])
    assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((entry) => [entry.id, entry.label, entry.state]), [['ask#1@0', 'scanner', 'done'], ['ask#2@0', 'fixer', 'skipped']])
    assert.equal(run.resumable, true, 'the run summary says it can resume')
    // Resume: v4/command resumeWorkflowRun, and the run is
    // live again under its id, polled from its journal; a second resume while it runs changes nothing.
    assert.deepEqual(await again.call('codeDesktop/workflow/resume', { threadId: 'sess_wf_1', runId: 'dwfrun-a' }), { status: 'resuming' })
    const command = again.log().find((entry) => entry.method === 'v4/command' && entry.params.type === 'resumeWorkflowRun')
    assert.deepEqual(command.params.payload, { workId: 'dwfrun-a', name: 'todo-audit' })
    const resumedEnd = Date.now() + 10000
    let resumed = null
    while (!resumed && Date.now() < resumedEnd) {
      resumed = again.notes.findLast((note) => note.params?.item?.id === 'toolu_wf' && note.params.item.workflowRun?.status === 'running')?.params.item.workflowRun ?? null
      if (!resumed) await sleep(50)
    }
    assert.ok(resumed, 'the resumed run reaches the client as running')
    assert.equal(resumed.resumable, undefined)
    assert.deepEqual(await again.call('codeDesktop/workflow/resume', { threadId: 'sess_wf_1', runId: 'dwfrun-a' }), { status: 'alreadyRunning' })
    await assert.rejects(again.call('codeDesktop/workflow/resume', { threadId: 'sess_wf_1', runId: 'dwfrun-nope' }), /Unknown workflow run/)
  } finally { await again.close() }
})

const SCRIPT = 'export const meta = {\n  name: "todo-audit",\n  description: "Find and fix the TODOs",\n  phases: [{ title: "Scan" }, { title: "Fix" }],\n}\nphase("Scan")\nawait agent("scanner").ask("scan")\n'
const ASK_SCRIPT = { FAKE_ZCODE_ASK_TOOLS: 'CreateWorkflow', FAKE_ZCODE_ASK_INPUT: JSON.stringify({ CreateWorkflow: { script: SCRIPT } }) }
const modeParams = (mode, dynamicWorkflows = true) => mode === 'bypass'
  ? { approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { permissionMode: 'bypass', dynamicWorkflows } }
  : { approvalPolicy: 'on-request', sandbox: mode === 'plan' ? 'read-only' : 'workspace-write', codeDesktop: { permissionMode: mode, dynamicWorkflows } }
async function answerOf(b) {
  const end = Date.now() + 10000
  while (!b.log().some((entry) => entry.method === 'answer') && Date.now() < end) await sleep(50)
  return b.log().find((entry) => entry.method === 'answer')?.params.result
}

test('the run approval card names the script: meta name, description and phases, else phase() calls, else the input', () => {
  assert.equal(WORKFLOW_RUN_APPROVAL_REASON, 'Run this workflow? Its agents will run without asking for approval.')
  assert.equal(workflowApprovalSummary('CreateWorkflow', { script: SCRIPT }), 'CreateWorkflow: todo-audit\nFind and fix the TODOs\nPhases: Scan → Fix')
  // Strings, comments and nested literals in the meta never confuse the parse; the script is never evaluated.
  const tricky = "export const meta = {\n  // phases: ['no'],\n  name: 'a \\'quoted\\' }',\n  phases: ['One', { name: `Two` }, \"Three\"],\n  limits: { x: [1, 2] },\n}\n"
  assert.equal(workflowApprovalSummary('CreateWorkflow', { script: tricky }), "CreateWorkflow: a 'quoted' }\nPhases: One → Two → Three")
  assert.equal(workflowApprovalSummary('CreateWorkflow', { name: 'smoke-wf', script: 'phase("Greet");\nawait agent("g").ask("x")\nphase(\'Slow\')' }), 'CreateWorkflow: smoke-wf\nPhases: Greet → Slow')
  assert.equal(workflowApprovalSummary('CreateWorkflow', { saved: { name: 'nightly' } }), 'CreateWorkflow: nightly')
  assert.equal(workflowApprovalSummary('ResumeWorkflowRun', { run_id: 'dwfrun-1' }), 'ResumeWorkflowRun\nRun: dwfrun-1')
  assert.equal(workflowApprovalSummary('CreateWorkflow', { script: 'return 1' }), 'CreateWorkflow {"script":"return 1"}')
  const long = workflowApprovalSummary('CreateWorkflow', { script: 'x'.repeat(5000) })
  assert.ok(long.length <= 2016 && long.endsWith('…'))
})

test('bridge: Dynamic workflows off keeps the run tools from the session; a stray run request starts nothing', { timeout: 60000 }, async () => {
  const b = bridge(ASK_SCRIPT)
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await b.call('thread/start', { cwd: b.home, ...modeParams('auto', false) })
    const created = b.log().find((entry) => entry.method === 'session/create' && entry.params.toolDenylist)
    assert.equal(created.params.dynamicWorkflowEnabled, false)
    assert.ok(created.params.toolDenylist.includes('CreateWorkflow'))
    const answer = await answerOf(b)
    assert.equal(answer.decision, 'deny')
    assert.equal(b.requests.some((request) => /requestApproval/.test(request.method)), false, 'no card for a run that may not start')
  } finally { await b.close() }
})

test('bridge: a read-only mode (Plan) never runs a workflow: refused with a reason, no card', { timeout: 60000 }, async () => {
  const b = bridge(ASK_SCRIPT)
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await b.call('thread/start', { cwd: b.home, ...modeParams('plan') })
    const answer = await answerOf(b)
    assert.equal(answer.decision, 'deny')
    assert.match(answer.reason ?? '', /read-only mode/)
    assert.equal(b.requests.some((request) => /requestApproval/.test(request.method)), false, 'no card that would let the agents escape Plan')
  } finally { await b.close() }
})

test('bridge: outside Bypass a run asks once, on the workflow card; Allow lets ZCode start it', { timeout: 60000 }, async () => {
  for (const mode of ['auto', 'acceptEdits', 'ask']) {
    const b = bridge(ASK_SCRIPT)
    try {
      await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
      await b.call('thread/start', { cwd: b.home, ...modeParams(mode) })
      const created = b.log().find((entry) => entry.method === 'session/create' && entry.params.toolDenylist)
      for (const name of WORKFLOW_RUN_TOOLS) assert.ok(!created.params.toolDenylist.includes(name), `${mode}: ${name} offered`)
      const answer = await answerOf(b)
      assert.equal(answer.decision, 'allow', mode)
      const cards = b.requests.filter((request) => /requestApproval/.test(request.method))
      assert.equal(cards.length, 1, `${mode}: one card`)
      const [card] = cards
      assert.equal(card.method, 'item/commandExecution/requestApproval')
      assert.equal(card.params.reason, WORKFLOW_RUN_APPROVAL_REASON)
      assert.equal(card.params.command, 'CreateWorkflow: todo-audit\nFind and fix the TODOs\nPhases: Scan → Fix')
      assert.equal(card.params.sessionGrantable, true, 'CreateWorkflow offers ZCode\'s "Allow for this session"')
      assert.equal(card.params.availableDecisions, undefined, 'no project rule')
    } catch (error) {
      error.message += `\n${b.stderr.join('').slice(-3000)}`
      throw error
    } finally { await b.close() }
  }
})

test('bridge: a declined run card starts nothing; Bypass asks nothing; approvals off outside Bypass refuses', { timeout: 60000 }, async () => {
  const declined = bridge(ASK_SCRIPT, { decision: 'decline' })
  try {
    await declined.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await declined.call('thread/start', { cwd: declined.home, ...modeParams('auto') })
    assert.equal((await answerOf(declined)).decision, 'deny')
    assert.equal(declined.requests.filter((request) => /requestApproval/.test(request.method)).length, 1)
    assert.equal(declined.log().some((entry) => entry.method === 'session/stop'), false, 'Deny refuses the run, the turn goes on')
  } finally { await declined.close() }
  const bypass = bridge(ASK_SCRIPT)
  try {
    await bypass.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await bypass.call('thread/start', { cwd: bypass.home, ...modeParams('bypass') })
    assert.equal((await answerOf(bypass)).decision, 'allow')
    assert.equal(bypass.requests.some((request) => /requestApproval/.test(request.method)), false, 'Bypass: no card')
  } finally { await bypass.close() }
  const never = bridge(ASK_SCRIPT)
  try {
    await never.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await never.call('thread/start', { cwd: never.home, approvalPolicy: 'never', sandbox: 'workspace-write', codeDesktop: { permissionMode: 'auto', dynamicWorkflows: true } })
    const answer = await answerOf(never)
    assert.equal(answer.decision, 'deny')
    assert.match(answer.reason, /approvals are off/)
    assert.equal(never.requests.some((request) => /requestApproval/.test(request.method)), false)
  } finally { await never.close() }
})

test('bridge: turning Dynamic workflows on reopens the session with the tools; every mode\'s turn offers the run tools', { timeout: 60000 }, async () => {
  const b = bridge()
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const { thread } = await b.call('thread/start', { cwd: b.home, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { permissionMode: 'auto', dynamicWorkflows: false } })
    const input = [{ type: 'text', text: 'hi', text_elements: [] }]
    // On (Auto): ZCode builds the session again with its workflow tools; the turn offers the run tools too.
    await b.call('turn/start', { threadId: thread.id, input, approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { permissionMode: 'auto', dynamicWorkflows: true } })
    let log = b.log()
    const closed = log.findIndex((entry) => entry.method === 'session/close' && entry.params.sessionId === thread.id)
    const reopened = log.findIndex((entry, index) => index > closed && entry.method === 'session/resume' && entry.params.sessionId === thread.id)
    assert.ok(closed >= 0 && reopened > closed, 'closed, then resumed')
    assert.equal(log[reopened].params.dynamicWorkflowEnabled, true)
    assert.ok(!log[reopened].params.toolDenylist.includes('CreateWorkflow'))
    let send = log.findLast((entry) => entry.method === 'session/send')
    for (const name of ['CreateWorkflow', 'AmendWorkflow', 'ResumeWorkflowRun']) assert.ok(!send.params.toolDenylist.includes(name), `${name} offered outside Bypass`)
    assert.ok(!send.params.toolDenylist.includes('ListWorkflowRuns'), 'the read-only workflow tools stay')
    // Bypass: the run tools are offered; no second reopen.
    await b.call('turn/start', { threadId: thread.id, input, approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { permissionMode: 'bypass', dynamicWorkflows: true } })
    log = b.log()
    send = log.findLast((entry) => entry.method === 'session/send')
    assert.ok(!send.params.toolDenylist.includes('CreateWorkflow'))
    assert.equal(log.filter((entry) => entry.method === 'session/close' && entry.params.sessionId === thread.id).length, 1)
    // Off: withheld at once, without reopening.
    await b.call('turn/start', { threadId: thread.id, input, approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { permissionMode: 'bypass', dynamicWorkflows: false } })
    log = b.log()
    send = log.findLast((entry) => entry.method === 'session/send')
    assert.ok(send.params.toolDenylist.includes('CreateWorkflow') && send.params.toolDenylist.includes('ListWorkflowRuns'))
    assert.equal(log.filter((entry) => entry.method === 'session/close' && entry.params.sessionId === thread.id).length, 1)
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
})

test('bridge: the workflow runner\'s own bridge creates its agents\' sessions without ZCode\'s title model call', { timeout: 30000 }, async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zcode-runner-')))
  const runner = bridgeAt(home, { CODE_DESKTOP_WORKFLOW_RUNNER: '1' })
  try {
    await runner.call('initialize', { clientInfo: { name: 'code-desktop-workflows', version: '0' } })
    await runner.call('thread/start', { cwd: home, approvalPolicy: 'never', sandbox: 'workspace-write' })
    const created = runner.log().find((entry) => entry.method === 'session/create')
    assert.equal(created.params.titleGenerationEnabled, false)
  } finally { await runner.close() }
  const app = bridgeAt(home)
  try {
    await app.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await app.call('thread/start', { cwd: home, approvalPolicy: 'on-request', sandbox: 'workspace-write' })
    const created = app.log().filter((entry) => entry.method === 'session/create').at(-1)
    assert.equal(Object.hasOwn(created.params, 'titleGenerationEnabled'), false, 'the user\'s own sessions are titled')
  } finally { await app.close(); fs.rmSync(home, { recursive: true, force: true }) }
})

test('bridge: "Allow for this session" on a CreateWorkflow card covers that tool\'s later runs; AmendWorkflow and ResumeWorkflowRun ask', { timeout: 60000 }, async () => {
  const b = bridge({ FAKE_ZCODE_ASK_TOOLS: 'CreateWorkflow,CreateWorkflow,AmendWorkflow,ResumeWorkflowRun', FAKE_ZCODE_ASK_SERIAL: '1', FAKE_ZCODE_ASK_INPUT: JSON.stringify({ CreateWorkflow: { script: SCRIPT } }) }, { decision: 'acceptForSession' })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await b.call('thread/start', { cwd: b.home, ...modeParams('auto') })
    const end = Date.now() + 10000
    while (b.log().filter((entry) => entry.method === 'answer').length < 4 && Date.now() < end) await sleep(50)
    const answers = b.log().filter((entry) => entry.method === 'answer').map((entry) => [entry.params.toolName, entry.params.result?.decision])
    assert.deepEqual(answers, [['CreateWorkflow', 'allow'], ['CreateWorkflow', 'allow'], ['AmendWorkflow', 'allow'], ['ResumeWorkflowRun', 'allow']])
    const cards = b.requests.filter((request) => /requestApproval/.test(request.method))
    assert.deepEqual(cards.map((card) => [card.params.command.split(/[:\s]/)[0], card.params.sessionGrantable]), [['CreateWorkflow', true], ['AmendWorkflow', true], ['ResumeWorkflowRun', false]],
      'the second CreateWorkflow runs on the grant; each tool has its own; a resume always asks')
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
  // A grant answered in one mode never reaches another: Plan refuses the run before any grant applies.
  const plan = bridge({ FAKE_ZCODE_ASK_TOOLS: 'CreateWorkflow', FAKE_ZCODE_ASK_INPUT: JSON.stringify({ CreateWorkflow: { script: SCRIPT } }) }, { decision: 'acceptForSession' })
  try {
    await plan.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await plan.call('thread/start', { cwd: plan.home, ...modeParams('plan') })
    assert.equal((await answerOf(plan)).decision, 'deny')
  } finally { await plan.close() }
})

// The turn ZCode 3.14.3 starts by itself once a run ends (recorded from the real agent: turn.started payload and the
// stored background-task message), and what the app makes of the bridge's notice.
const ZCODE_NOTIFICATION = '<task-notification>\n<task-id>dwfrun-5886</task-id>\n<tool-use-id>toolu_3_0</tool-use-id>\n<status>completed</status>\n<description>smoke-wf</description>\n<summary>Workflow &quot;smoke-wf&quot; completed.</summary>\n<result>{\n  &quot;hello&quot;: &quot;hi&quot;\n}</result>\n</task-notification>\n\nThe workflow completed. Present its outcome to the user as a deliverable.'
const ORIGIN = { backgroundSource: 'workflow', title: 'smoke-wf', workId: 'dwfrun-5886', workflowNotification: { kind: 'terminal', status: 'completed', summary: 'smoke-wf', result: '{"hello":"hi"}', resultForm: 'json', durationMs: 117 } }
const appNotice = async (text) => {
  const { workflowNotificationSummary } = await import(path.resolve(root, '../app/electron/prefs/workflow-keyword.mjs'))
  return workflowNotificationSummary(text)
}

test('a finished run\'s notification turn: one notice per run in OpenClaude Desktop\'s form, which the app reads as its own', async () => {
  const [notice] = workflowNotices(ZCODE_NOTIFICATION, ORIGIN)
  assert.deepEqual(await appNotice(notice), { status: 'completed', summary: 'Dynamic workflow "smoke-wf" completed', taskId: 'dwfrun-5886', durationMs: 117 })
  // Failed (errored) and stopped runs; a batch (no originMeta) still names each run from its own block.
  const failed = workflowNotices(ZCODE_NOTIFICATION.replace('completed</status>', 'failed</status>').replace('completed.</summary>', 'errored: the script failed.</summary>'), { ...ORIGIN, workflowNotification: { kind: 'terminal', status: 'errored', summary: 'smoke-wf', error: 'boom <x>' } })
  assert.deepEqual(await appNotice(failed[0]), { status: 'failed', summary: 'Dynamic workflow "smoke-wf" failed: boom <x>', taskId: 'dwfrun-5886' })
  const batch = workflowNotices(`${ZCODE_NOTIFICATION}\n\n${ZCODE_NOTIFICATION.replaceAll('5886', '7777').replaceAll('smoke-wf', 'other').replace('completed</status>', 'killed</status>').replace('completed.</summary>', 'was stopped by the user.</summary>')}`)
  assert.deepEqual(await Promise.all(batch.map(appNotice)), [
    { status: 'completed', summary: 'Dynamic workflow "smoke-wf" completed', taskId: 'dwfrun-5886' },
    { status: 'stopped', summary: 'Dynamic workflow "other" was stopped', taskId: 'dwfrun-7777' },
  ])
  // Not a workflow's end: a background command's result, a stall notice.
  assert.deepEqual(workflowNotices('<task-notification>\n<task-id>bash_1</task-id>\n<status>completed</status>\n<summary>Background command &quot;npm test&quot; completed (exit code 0)</summary>\n</task-notification>', { backgroundSource: 'bash', title: 'npm test', workId: 'bash_1' }), [])
  // A stall and an agent's question are notices of their own kinds (their own rows in the app).
  const [stall] = workflowNotices('[SYSTEM NOTIFICATION - NOT USER INPUT]\n<workflow-stall>\n  <run-id>dwfrun-1</run-id>\n  <run>review</run>\n  <since-ms>1260000</since-ms>\n  <dominant-reason>rate_limit</dominant-reason>\n</workflow-stall>', { backgroundSource: 'workflow', title: 'x', workId: 'dwfrun-1', workflowNotification: { kind: 'stall', sinceMs: 1 } })
  assert.deepEqual(await appNotice(stall), { status: 'stalled', summary: null, taskId: 'dwfrun-1', kind: 'stall', workflow: 'review', reason: 'rate_limit', stalledMs: 1260000 })
  const [question] = workflowNotices('[SYSTEM NOTIFICATION - NOT USER INPUT]\n<workflow-escalation>\n  <run-id>dwfrun-1</run-id>\n  <run>review</run>\n  <question-id>q1</question-id>\n  <subagent>checker</subagent>\n  <question>Should the threshold be 94 rather than 96?</question>\n  <context>Two tests &lt;fail&gt; at 96.</context>\n</workflow-escalation>\n\nSubagent checker …', { backgroundSource: 'workflow', workflowNotification: { kind: 'escalation' } })
  assert.deepEqual(await appNotice(question), { status: 'question', summary: null, taskId: 'dwfrun-1', kind: 'escalation', workflow: 'review', agent: 'checker', question: 'Should the threshold be 94 rather than 96?', context: 'Two tests <fail> at 96.' })
  assert.deepEqual(workflowNoticeItems('msg_1', `${ZCODE_NOTIFICATION}\n\n${ZCODE_NOTIFICATION}`).map((item) => item.id), ['msg_1', 'msg_1#n1'])
})

test('live and replay: the notification turn opens with the notice, then GLM\'s reply', () => {
  const { p, out } = projector()
  p.event('turn.started', { input: ZCODE_NOTIFICATION, messageId: 'msg_n', inputSource: 'background_task', inputVisibility: 'model-only', originMeta: ORIGIN }, { turnId: 'turn_2', timestamp: 1000 })
  const users = out.filter((entry) => entry.method === 'item/completed' && entry.params.item.type === 'userMessage')
  assert.equal(users.length, 1)
  assert.equal(users[0].params.turnId, 'turn_2')
  assert.match(users[0].params.item.content[0].text, /^<system-reminder>\n\[SYSTEM NOTIFICATION - NOT USER INPUT\][\s\S]*<summary>Dynamic workflow "smoke-wf" completed<\/summary>/)
  // A background command's result turn: still nothing above the reply.
  const other = projector()
  other.p.event('turn.started', { input: 'done', messageId: 'msg_b', inputSource: 'background_task', inputVisibility: 'model-only', originMeta: { backgroundSource: 'bash', title: 't', workId: 'b' } }, { turnId: 'turn_3' })
  assert.equal(other.out.some((entry) => entry.params?.item?.type === 'userMessage'), false)
  // Replay: ZCode anchors the notification to the turn that started the run; it shows in the turn GLM answers it in.
  const messages = [
    { info: { role: 'user', id: 'msg_u', anchor: { turnId: 'turn_1' }, semantics: { origin: 'real_user', kind: 'user_prompt' }, time: { created: 1 } }, parts: [{ type: 'text', text: 'RUN_WF' }] },
    { info: { role: 'assistant', id: 'msg_a1', anchor: { turnId: 'turn_1' }, time: { created: 2, completed: 3 } }, parts: [{ type: 'text', text: 'Started.' }] },
    { info: { role: 'user', id: 'msg_n', anchor: { turnId: 'turn_1', origin: 'backgroundResult' }, semantics: { origin: 'agent_runtime', kind: 'background_notification', uiVisibility: 'hidden' }, metadata: { source: 'background_task', originMeta: ORIGIN }, synthetic: true, time: { created: 4 } }, parts: [{ type: 'text', text: ZCODE_NOTIFICATION, synthetic: true }] },
    { info: { role: 'assistant', id: 'msg_a2', anchor: { turnId: 'turn_2' }, time: { created: 5, completed: 6 } }, parts: [{ type: 'text', text: 'It said hi.' }] },
  ]
  const { turns } = turnsFromMessages(messages, { threadId: 'sess_1', cwd: '/w' })
  assert.deepEqual(turns.map((turn) => [turn.id, turn.items.map((item) => `${item.type}:${item.id}`)]), [
    ['turn_1', ['userMessage:msg_u', 'agentMessage:msg_a1#t0']],
    ['turn_2', ['userMessage:msg_n', 'agentMessage:msg_a2#t0']],
  ])
  assert.equal(turns[1].items[0].content[0].text, users[0].params.item.content[0].text, 'live and replay agree')
})

test('the journal\'s deliverables, an agent\'s open question and a stall fold into the run', () => {
  const state = workflowState(workflowRunOf({ callId: 'c1', tool: 'CreateWorkflow', input: { name: 'review' }, time: 1000 }))
  const events = [
    ['run-started', { runId: 'dwfrun-9' }],
    ['actor-created', { actor: actor(1), name: 'checker', phaseName: 'Check' }],
    ['node-queued', { instance: ask(1), kind: 'ask', actor: actor(1), phaseName: 'Check' }],
    ['node-executing', { instance: ask(1) }],
    ['artifact-published', { instance: { siteId: 'artifact#1', ordinal: 0 }, artifact: { id: 'perf', kind: 'table', version: 1, title: 'Timings', spec: { columns: [{ field: 'name' }, { field: 'ms', unit: 'ms' }], key: 'name' }, publishedAt: 5 } }],
    ['report', { instance: { siteId: 'report#1', ordinal: 0 }, item: { name: 'a', ms: 3 }, artifactId: 'perf' }],
    ['report', { instance: { siteId: 'report#1', ordinal: 1 }, item: { name: 'b', ms: 4 }, artifactId: 'perf' }],
    ['artifact-published', { instance: { siteId: 'artifact#2', ordinal: 0 }, artifact: { id: 'report', kind: 'markdown', version: 1, title: 'Review', contentType: 'text/markdown', bytes: 120, uri: 'zcode-artifact://x', primary: true, publishedAt: 6 } }],
    ['escalation-raised', { qid: 'q1', actor: actor(1), actorName: 'checker', question: 'Should the threshold be 94?', context: 'Two tests fail at 96.', askedAt: 7000 }],
    ['run-stalled', { sinceMs: 1260000, reason: 'rate_limit' }],
  ].map(([type, payload], index) => ({ sequence: index + 1, type, payload }))
  assert.equal(applyWorkflowEvents(state, events, { time: 8000, live: true }), true)
  const run = state.run
  assert.deepEqual(run.artifacts.map((entry) => [entry.id, entry.kind, entry.primary === true, entry.itemCount]), [['report', 'markdown', true, 0], ['perf', 'table', false, 2]])
  assert.equal(JSON.stringify(run.artifacts).includes('zcode-artifact://'), false, 'the store uri stays in ZCode')
  assert.deepEqual(run.pendingQuestions, [{ qid: 'q1', question: 'Should the threshold be 94?', context: 'Two tests fail at 96.', agent: 'checker', askedAt: 7000 }])
  assert.equal(run.workflowProgress.find((entry) => entry.type === 'workflow_agent').question, 'Should the threshold be 94?')
  assert.deepEqual(run.stall, { sinceMs: 1260000, reason: 'rate_limit', at: 8000 })
  // Answered, the provider recovered, the run ended: nothing stays open; the deliverables stay.
  applyWorkflowEvents(state, [
    { sequence: 11, type: 'escalation-resolved', payload: { qid: 'q1', answer: '94' } },
    { sequence: 12, type: 'usage-updated', payload: { spentTokens: 10 } },
  ], { time: 9000, live: true })
  assert.equal(state.run.pendingQuestions, undefined)
  assert.equal(state.run.stall, undefined)
  assert.equal(state.run.workflowProgress.find((entry) => entry.type === 'workflow_agent').question, undefined)
  applyWorkflowEvents(state, [{ sequence: 13, type: 'run-settled', payload: { status: 'completed' } }], { time: 9500 })
  assert.equal(state.run.artifacts.length, 2)
})

test('bridge: a run\'s deliverables are listed on the run and read from ZCode\'s store', { timeout: 60000 }, async () => {
  const b = bridge({ FAKE_ZCODE_ARTIFACTS: '1' })
  try {
    const init = await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    assert.equal(init.capabilities.workflowArtifacts, true)
    const response = await b.call('thread/resume', { threadId: 'sess_wf_1', codeDesktop: { dynamicWorkflows: true } })
    const run = workflowItem(response.thread.turns).workflowRun
    assert.deepEqual(run.artifacts.map((entry) => [entry.id, entry.kind, entry.primary === true, entry.itemCount]), [['report', 'markdown', true, 0], ['todos', 'table', false, 2]])
    const report = await b.call('codeDesktop/workflow/artifact', { threadId: 'sess_wf_1', runId: 'dwfrun-a', artifactId: 'report' })
    assert.equal(report.text, '# Review\n\nAll TODOs are fixed.\n', 'read in chunks until ZCode says it ended')
    assert.equal(report.truncated, false)
    assert.equal(report.primary, true)
    const table = await b.call('codeDesktop/workflow/artifact', { threadId: 'sess_wf_1', runId: 'dwfrun-a', artifactId: 'todos' })
    assert.deepEqual(table.items, [{ file: 'a.js', line: 3 }, { file: 'b.js', line: 9 }], 'every page of items')
    assert.deepEqual(table.spec, { columns: [{ field: 'file' }, { field: 'line' }] })
    await assert.rejects(b.call('codeDesktop/workflow/artifact', { threadId: 'sess_wf_1', runId: 'dwfrun-a', artifactId: 'nope' }), /no longer has this deliverable/)
    await assert.rejects(b.call('codeDesktop/workflow/artifact', { threadId: 'sess_wf_1', runId: 'dwfrun-x', artifactId: 'report' }), /Unknown workflow run/)
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
})

test('bridge: Configure changes a running run\'s agent limit in place, or follows the revised run a new model starts', { timeout: 60000 }, async () => {
  const b = bridge()
  try {
    const init = await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    assert.equal(init.capabilities.workflowRunSettings, true)
    await b.call('thread/resume', { threadId: 'sess_wf_1', codeDesktop: { dynamicWorkflows: true } })
    assert.deepEqual(await b.call('codeDesktop/workflow/settings', { threadId: 'sess_wf_1', runId: 'dwfrun-a', maxConcurrency: 2 }), { status: 'accepted', runId: 'dwfrun-a', replaced: false })
    const sent = b.log().find((entry) => entry.method === 'v4/command' && entry.params.type === 'amendWorkflowRunSettings')
    assert.deepEqual(sent.params.payload, { workId: 'dwfrun-a', maxConcurrency: 2 })
    await assert.rejects(b.call('codeDesktop/workflow/settings', { threadId: 'sess_wf_1', runId: 'dwfrun-a' }), /Nothing to change/)
    assert.deepEqual(await b.call('codeDesktop/workflow/settings', { threadId: 'sess_wf_1', runId: 'dwfrun-a', subagentModel: 'zai/glm-4.7' }), { status: 'accepted', runId: 'dwfrun-b', replaced: true })
    const end = Date.now() + 10000
    let revised = null
    while (!revised && Date.now() < end) {
      revised = b.notes.findLast((note) => note.params?.item?.id === 'toolu_wf' && note.params.item.workflowRun?.runId === 'dwfrun-b' && note.params.item.workflowRun.subagentModel)?.params.item.workflowRun ?? null
      if (!revised) await sleep(50)
    }
    assert.ok(revised, 'the same card follows the revised run')
    assert.equal(revised.subagentModel, 'zai/glm-4.7')
    assert.equal(revised.status, 'running')
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
  // Reopened, the card shows the revised run again (its settings turn has no tool call of its own).
  const again = bridgeAt(b.home)
  try {
    await again.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const response = await again.call('thread/resume', { threadId: 'sess_wf_1', codeDesktop: { dynamicWorkflows: true } })
    const run = workflowItem(response.thread.turns).workflowRun
    assert.deepEqual([run.runId, run.status, run.subagentModel, run.maxConcurrency], ['dwfrun-b', 'running', 'zai/glm-4.7', 2])
  } finally { await again.close() }
})

test('a settings turn reads as a notice, live and on replay', () => {
  const text = 'Changed the settings of workflow run dwfrun-a ("todo-audit") from the GUI: subagents now run on zai/glm-4.7. The same script continues as run dwfrun-b, which supersedes run dwfrun-a and imports everything run dwfrun-a finished as cache. Progress and results arrive as background notifications; do not amend, resume or restart it.'
  const [item] = workflowNoticeItems('msg_s', text)
  assert.match(item.content[0].text, /<kind>settings<\/kind>[\s\S]*<task-id>dwfrun-a<\/task-id>[\s\S]*<workflow>todo-audit<\/workflow>/)
  const { p, out } = projector()
  p.event('turn.started', { input: text, messageId: 'msg_s', inputSource: 'user', originMeta: null }, { turnId: 'turn_s', timestamp: 1000 })
  const users = out.filter((entry) => entry.method === 'item/completed' && entry.params.item.type === 'userMessage')
  assert.equal(users.length, 1)
  assert.match(users[0].params.item.content[0].text, /<kind>settings<\/kind>/)
})

test('bridge: ZCode\'s saved workflows: both scopes listed (the project\'s wins a name), read, deleted, their run history', { timeout: 60000 }, async () => {
  const b = bridge()
  try {
    const init = await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    assert.equal(init.capabilities.savedWorkflows, true)
    const listed = await b.call('codeDesktop/workflows/list', { cwd: b.home })
    assert.deepEqual(listed.workflows.map((entry) => [entry.name, entry.scope, entry.description]), [['pr-review', 'project', 'Review a PR'], ['nightly', 'global', 'Nightly checks']])
    assert.deepEqual(listed.workflows[0].args, { pr: { type: 'string', required: true, description: 'PR number' } })
    assert.equal(listed.invalid.length, 1)
    const scopes = b.log().filter((entry) => entry.method === 'workflows/list').map((entry) => [entry.params.scope, entry.params.workspace.workspacePath])
    assert.deepEqual(scopes.sort(), [['global', b.home], ['project', b.home]])
    const got = await b.call('codeDesktop/workflows/get', { cwd: b.home, name: 'pr-review', scope: 'project' })
    assert.equal(got.script, 'phase("Review")')
    await assert.rejects(b.call('codeDesktop/workflows/get', { cwd: b.home, name: 'nope' }), /can’t find this saved workflow/)
    assert.deepEqual(await b.call('codeDesktop/workflows/delete', { cwd: b.home, name: 'pr-review', scope: 'project' }), { ok: true, path: '/p/.zcode/workflows/pr-review.dwf.ts' })
    const runs = await b.call('codeDesktop/workflows/runs', { cwd: b.home, name: 'pr-review', scope: 'project' })
    assert.deepEqual(runs.runs.map((run) => [run.runId, run.status]), [['dwfrun-old', 'completed']])
    await assert.rejects(b.call('codeDesktop/workflows/list', { cwd: 'relative/dir' }), /absolute/)
    await assert.rejects(b.call('codeDesktop/workflows/delete', { cwd: b.home, name: 'x', scope: 'elsewhere' }), /scope/)
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
})
