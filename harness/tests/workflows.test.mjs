import test from 'node:test'
import assert from 'node:assert/strict'
import { ThreadProjector } from '../packages/codex-app-server/src/projection.js'
import { workflowRunOf, workflowRecord, workflowToolResult, workflowInterrupted, workflowApprovalCommand, WORKFLOW_APPROVAL_REASON } from '../packages/codex-app-server/src/workflows.js'
import { workflowsAllowedBy } from '../packages/codex-app-server/src/structured.js'

let seq = 0
const ev = (type, data) => ({ type, data, seq: ++seq, time: 2_000_000 + seq * 10 })
const meta = { name: 'audit', description: 'Audit files', phases: [{ title: 'Scan' }, { title: 'Fix' }] }

function startWorkflow(p, callId = 'w1', args = { meta, script: 'return 1' }) {
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'u1', content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
  return p.apply(ev('tool/call', { turn: 1, step: 1, callId, name: 'workflow', arguments: JSON.stringify(args) }))
}
const runOf = (p, callId = 'w1') => p.turns[0].items.find((item) => item.id === callId).workflowRun
const agents = (run) => run.workflowProgress.filter((entry) => entry.type === 'workflow_agent')

test('CLI display titles and empty phase identities survive durable projection', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p, 'w1', { script: 'export const meta={name:`audit`,description:`Inspect`,title:`Readable title`,phases:[null,{title:""}]};return 1' })
  assert.equal(runOf(p).name, 'audit')
  assert.equal(runOf(p).title, 'Readable title')
  p.apply(ev('tool-workflow/run-start', { runId: 'r-title', name: 'audit', title: 'Durable title', phases: [''] }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'r-title', seq: 1, label: 'child', phase: '', childId: 'child-title' }))
  assert.equal(runOf(p).title, 'Durable title')
  assert.equal(runOf(p).name, 'audit')
  assert.equal(agents(runOf(p))[0].phaseTitle, '')
})

for (const name of ['Workflow', 'RunWorkflow']) test(`${name} projects the native task acknowledgment and retained resume identity`, () => {
  const p = new ThreadProjector({ threadId: 'native' })
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'native-call', name, arguments: JSON.stringify({ script: 'export const meta={name:"native",description:"Native fixture"}; return 1' }) }))
  p.apply(ev('tool-workflow/run-start', { runId: 'wf_native', attemptId: 'attempt-native', name: 'native' }))
  const run = runOf(p, 'native-call')
  const accepted = workflowToolResult(run, { isError: false, text: 'Workflow launched in background. Task ID: workflow-4\nRun ID: wf_native' }, 10)
  assert.equal(accepted.jobId, 'workflow-4')
  assert.equal(accepted.background, true)
  assert.equal(accepted.id, 'attempt-native')
  assert.equal(accepted.runId, 'wf_native')
  assert.equal(accepted.status, 'running')
})

test('durable child activity updates live usage and survives replay without output-only totals', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  p.apply(ev('tool-workflow/run-start', { runId: 'progress', name: 'audit' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'progress', seq: 1, label: 'scan', childId: 'c', progressSupported: true }))
  const notes = p.apply(ev('tool-workflow/agent-progress', { runId: 'progress', seq: 1, lastProgressAt: 2000042, tokens: 120, outputTokens: 20, activeTools: 1, toolCalls: 2, lastToolName: 'read', lastToolSummary: 'src/main.js' }))
  assert.equal(notes.length, 1)
  assert.equal(runOf(p).usage.totalTokens, 120)
  assert.equal(agents(runOf(p))[0].activeTools, 1)
  assert.equal(agents(runOf(p))[0].progressSupported, true)
  assert.equal(agents(runOf(p))[0].lastProgressAt, 2000042)
  p.apply(ev('tool-workflow/agent-progress', { runId: 'progress', seq: 1, lastProgressAt: 2000050, activeTools: 0, lastToolName: 'custom_tool' }))
  assert.equal(agents(runOf(p))[0].lastToolSummary, undefined)
  p.apply(ev('tool-workflow/agent-end', { runId: 'progress', seq: 1, outcome: 'failed', tokens: 150, outputTokens: 30, error: 'Provider disconnected' }))
  assert.equal(agents(runOf(p))[0].error, 'Provider disconnected')
  assert.equal(runOf(p).usage.totalTokens, 150)
})

test('a workflow call is a dynamic tool item with its running run and declared phases', () => {
  const p = new ThreadProjector({ threadId: 't' })
  const notes = startWorkflow(p)
  const item = notes.find((note) => note.method === 'item/started').params.item
  assert.equal(item.type, 'dynamicToolCall')
  assert.equal(item.tool, 'workflow')
  assert.equal(item.workflowRun.id, 'call-w1')
  assert.equal(item.workflowRun.source, 'model')
  assert.equal(item.workflowRun.status, 'running')
  assert.equal(item.workflowRun.name, 'audit')
  assert.equal(item.workflowRun.description, 'Audit files')
  assert.deepEqual(item.workflowRun.workflowProgress, [{ type: 'workflow_phase', index: 1, title: 'Scan' }, { type: 'workflow_phase', index: 2, title: 'Fix' }])
})

test('records name the run, add agents in their phases and settle it', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  let notes = p.apply(ev('tool-workflow/run-start', { runId: 'r1', name: 'audit' }))
  assert.equal(notes[0].method, 'item/started')
  assert.equal(notes[0].params.startedAtMs, undefined, 'an update carries no lifecycle time')
  assert.equal(runOf(p).id, 'r1')
  assert.ok(p.hasWorkflowRun('r1'))
  // Unphased records stay unassigned; the UI applies Claude's chronological fallback.
  notes = p.workflowPhase('r1', 'Report', 2_000_500)
  assert.equal(notes.length, 1)
  p.apply(ev('tool-workflow/agent-start', { runId: 'r1', seq: 1, label: 'scan a', phase: 'Scan', childId: 'c1' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'r1', seq: 2, label: 'report', childId: 'c2' }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'r1', seq: 1, outcome: 'completed' }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'r1', seq: 2, outcome: 'failed' }))
  const run = runOf(p)
  assert.deepEqual(agents(run).map((agent) => [agent.label, agent.state, agent.phaseTitle, agent.childId]), [['scan a', 'done', 'Scan', 'c1'], ['report', 'error', undefined, 'c2']])
  assert.equal(agents(run)[1].error, 'Agent failed')
  assert.ok(Number.isFinite(agents(run)[0].durationMs))
  notes = p.apply(ev('tool-workflow/run-end', { runId: 'r1', stopReason: 'completed' }))
  assert.equal(runOf(p).status, 'completed')
  assert.ok(Number.isFinite(runOf(p).durationMs))
  // The tool result completes the item; the run stays completed.
  notes = p.apply(ev('tool/result', { message: { toolCallId: 'w1', content: [{ type: 'text', text: 'workflow "audit" completed (2 agents).' }], isError: false } }))
  const done = notes.find((note) => note.method === 'item/completed').params.item
  assert.equal(done.status, 'completed')
  assert.equal(done.workflowRun.status, 'completed')
})

test('history replays the same run without live phase events', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  p.apply(ev('tool-workflow/run-start', { runId: 'r2', name: 'audit' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'r2', seq: 1, label: 'a', phase: 'Fix', childId: 'c' }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'r2', seq: 1, outcome: 'cancelled' }))
  p.apply(ev('tool-workflow/run-end', { runId: 'r2', stopReason: 'cancelled' }))
  const run = runOf(p)
  assert.equal(run.status, 'stopped')
  assert.equal(agents(run)[0].phaseTitle, 'Fix')
  // A member still live when the run settles ends 'cancelled': Skipped, not an error.
  assert.equal(agents(run)[0].state, 'skipped')
  assert.equal(agents(run)[0].error, undefined)
})

test('a member the user skipped is skipped, not failed; model runs declare member controls', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  assert.equal(runOf(p).memberControls, true)
  p.apply(ev('tool-workflow/run-start', { runId: 'r5', name: 'audit' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'r5', seq: 1, label: 'a', childId: 'c1' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'r5', seq: 2, label: 'b', childId: 'c2' }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'r5', seq: 1, outcome: 'failed', error: 'skipped by user' }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'r5', seq: 2, outcome: 'failed', error: 'boom' }))
  assert.deepEqual(agents(runOf(p)).map(agent => [agent.state, agent.error]), [['skipped', undefined], ['error', 'boom']])
})

test('a stopped turn stops a foreground run and its running agents', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  p.apply(ev('tool-workflow/run-start', { runId: 'r3', name: 'audit' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'r3', seq: 1, label: 'a', childId: 'c' }))
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'aborted', reason: { kind: 'user' } } }))
  const run = runOf(p)
  assert.equal(run.status, 'stopped')
  assert.equal(agents(run)[0].state, 'error')
  assert.equal(agents(run)[0].error, 'Stopped before completion')
})

test('a background run keeps running past its tool call and names its job', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p, 'w1', { meta, script: 'x', run_in_background: true })
  p.apply(ev('tool-workflow/run-start', { runId: 'r4', name: 'audit' }))
  p.apply(ev('tool/result', { message: { toolCallId: 'w1', content: [{ type: 'text', text: 'workflow "audit" started in the background as job workflow-7. Its return value arrives with the completion notice; check on it with job_output, stop it with job_kill.' }], isError: false } }))
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  assert.equal(runOf(p).status, 'running')
  assert.equal(runOf(p).jobId, 'workflow-7')
  // Its records keep arriving after the turn.
  const notes = p.apply(ev('tool-workflow/run-end', { runId: 'r4', stopReason: 'completed' }))
  assert.equal(notes[0].method, 'item/completed')
  assert.equal(runOf(p).status, 'completed')
})

test('a workflow that cannot start fails with the tool error', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  p.apply(ev('tool/result', { message: { toolCallId: 'w1', content: [{ type: 'text', text: 'Error: workflow run failed: SyntaxError: Unexpected token' }], isError: true } }))
  assert.equal(runOf(p).status, 'failed')
  assert.equal(runOf(p).summary, 'workflow run failed: SyntaxError: Unexpected token')
})

test('run-start pairs with the waiting call of the same name', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p, 'w1', { meta: { name: 'first', description: 'd' }, script: 'x' })
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'w2', name: 'workflow', arguments: JSON.stringify({ meta: { name: 'second', description: 'd' }, script: 'x' }) }))
  p.apply(ev('tool-workflow/run-start', { runId: 'r-second', name: 'second' }))
  assert.equal(runOf(p, 'w2').id, 'r-second')
  assert.equal(runOf(p, 'w1').id, 'call-w1')
  // Unknown runs are ignored.
  assert.deepEqual(p.workflowPhase('nope', 'x'), [])
})

test('the structured_output capture is the turn answer, never a tool row', () => {
  const p = new ThreadProjector({ threadId: 't' })
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'u1', content: [{ type: 'text', text: 'q' }], source: { kind: 'user' } }))
  const call = p.apply(ev('tool/call', { turn: 1, step: 1, callId: 's1', name: 'structured_output', arguments: JSON.stringify({ answer: 'x', n: 1 }) }))
  assert.deepEqual(call, [])
  // A rejected capture (schema violation) shows nothing; the model tries again.
  assert.deepEqual(p.apply(ev('tool/result', { message: { toolCallId: 's1', content: [{ type: 'text', text: 'bad' }], isError: true } })), [])
  p.apply(ev('tool/call', { turn: 1, step: 2, callId: 's2', name: 'structured_output', arguments: JSON.stringify({ answer: 'y', n: 2 }) }))
  const notes = p.apply(ev('tool/result', { message: { toolCallId: 's2', content: [{ type: 'text', text: 'Structured output recorded.' }], isError: false } }))
  const message = notes.find((note) => note.method === 'item/completed').params.item
  assert.equal(message.type, 'agentMessage')
  assert.deepEqual(JSON.parse(message.text), { answer: 'y', n: 2 })
  assert.ok(!p.turns[0].items.some((item) => item.type === 'dynamicToolCall'))
})

test('reducers are pure and settle only running runs', () => {
  const run = workflowRunOf({ meta }, 'c', 1)
  const named = workflowRecord(run, 'tool-workflow/run-start', { runId: 'r', name: 'audit' }, 2)
  assert.equal(run.id, 'call-c')
  assert.equal(named.id, 'r')
  const done = workflowRecord(named, 'tool-workflow/run-end', { stopReason: 'error' }, 3)
  assert.equal(done.status, 'failed')
  assert.equal(workflowInterrupted(done, 4), done)
  assert.equal(workflowToolResult(named, { isError: false, text: 'workflow "audit" completed (0 agents).' }, 4), named)
})

test('the Dynamic workflows hint is read only when the request carries it', () => {
  assert.equal(workflowsAllowedBy({ codeDesktop: { dynamicWorkflows: true } }), true)
  assert.equal(workflowsAllowedBy({ codeDesktop: { dynamicWorkflows: false } }), false)
  assert.equal(workflowsAllowedBy({ codeDesktop: { permissionMode: 'default' } }), null)
  assert.equal(workflowsAllowedBy({}), null)
})

test('durable phases and cached usage replay without inventing live timing', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p, 'w1', { script: 'export const meta = { name: "literal" }; return 1' })
  p.apply(ev('tool-workflow/run-start', { runId: 'resumed', name: 'literal', description: 'Saved run', scriptPath: '/private/run/literal.js', phases: ['Scan'] }))
  p.apply(ev('tool-workflow/phase', { runId: 'resumed', title: 'Nested / Report', index: 3, kind: 'child' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'resumed', seq: 1, childId: 'original', label: 'cached', cached: true, model: 'fixture', phase: 'Nested / Report', phaseIndex: 3 }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'resumed', seq: 1, outcome: 'completed', tokens: 0, durationMs: 0 }))
  p.apply(ev('tool-workflow/run-end', { runId: 'resumed', stopReason: 'error', error: 'BUDGET_EXCEEDED' }))
  const run = runOf(p)
  assert.equal(run.scriptPath, '/private/run/literal.js')
  assert.equal(run.summary, 'BUDGET_EXCEEDED')
  const [agent] = agents(run)
  assert.equal(agent.cached, true)
  assert.equal(agent.model, 'fixture')
  assert.equal(agent.phaseTitle, 'Nested / Report')
  assert.equal(agent.phaseIndex, 3)
  assert.equal(run.workflowProgress.find(p => p.index === 3 && p.type === 'workflow_phase').kind, 'child')
  assert.equal(agent.startedAt, undefined)
  assert.equal(agent.tokens, 0)
  assert.equal(agent.durationMs, 0)
})

test('self-contained CLI scripts show literal metadata and background ownership before engine publication', () => {
  const script = 'export const meta={name:"cli",description:"CLI description",phases:[{title:"Scan"}]}; return 1'
  const run = workflowRunOf({ script, description: 'ignored', title: 'ignored' }, 'cli-call', 1)
  assert.equal(run.name, 'cli')
  assert.equal(run.description, 'CLI description')
  assert.equal(run.background, true)
  assert.equal(run.workflowProgress[0].title, 'Scan')
  assert.equal(workflowRunOf({ script, name: 'registered' }, 'named', 1).name, 'registered')
  assert.equal(workflowRunOf({ script, scriptPath: 'saved.js' }, 'path', 1).name, 'workflow')
  assert.equal(workflowRunOf({ script: 'invalid (' }, 'invalid', 1).name, 'workflow')
})


test('resuming one run creates a separate card and routes late events to their original attempt', () => {
  const p = new ThreadProjector({ threadId: 't' })
  startWorkflow(p)
  p.apply(ev('tool-workflow/run-start', { runId: 'wf_same-run', attemptId: 'first-attempt', name: 'audit' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'wf_same-run', attemptId: 'first-attempt', seq: 1, label: 'first', childId: 'first-child' }))
  p.apply(ev('tool-workflow/agent-end', { runId: 'wf_same-run', attemptId: 'first-attempt', seq: 1, outcome: 'completed' }))
  p.apply(ev('tool/call', { turn: 1, step: 2, callId: 'w2', name: 'workflow', arguments: JSON.stringify({ meta, script: 'return 2', resumeFromRunId: 'wf_same-run' }) }))
  p.apply(ev('tool-workflow/run-start', { runId: 'wf_same-run', attemptId: 'second-attempt', name: 'audit' }))
  p.apply(ev('tool-workflow/run-end', { runId: 'wf_same-run', attemptId: 'first-attempt', stopReason: 'completed' }))
  p.apply(ev('tool-workflow/agent-start', { runId: 'wf_same-run', attemptId: 'second-attempt', seq: 1, label: 'cached', childId: 'first-child', cached: true }))
  assert.equal(runOf(p).id, 'first-attempt')
  assert.equal(runOf(p).status, 'completed')
  assert.equal(runOf(p, 'w2').id, 'second-attempt')
  assert.equal(runOf(p, 'w2').runId, 'wf_same-run')
  assert.equal(runOf(p, 'w2').status, 'running')
  assert.deepEqual(agents(runOf(p)).map(agent => agent.label), ['first'])
  assert.equal(agents(runOf(p, 'w2'))[0].cached, true)
  assert.equal(p.workflowItem('wf_same-run').id, 'w2')
  assert.equal(p.workflowItem('first-attempt').id, 'w1')
})

test('queued and pre-start failed members keep row order and real child identity through projection replay', () => {
  const p = new ThreadProjector({ threadId: 'queued' }), history = []
  startWorkflow({ apply: event => { history.push(event); return p.apply(event) } }, 'w1', { script: 'export const meta={name:"queue",description:"Queue"};return 1' })
  const records = [
    ['tool-workflow/run-start', { runId: 'queue', name: 'queue' }],
    ['tool-workflow/agent-admission', { runId: 'queue', seq: 1, label: '', state: 'queued', queuedAt: 1, lastProgressAt: 1 }],
    ['tool-workflow/agent-admission', { runId: 'queue', seq: 2, label: 'failure', state: 'queued', queuedAt: 2, lastProgressAt: 2 }],
    ['tool-workflow/phase', { runId: 'queue', title: 'After', index: 1 }],
    ['tool-workflow/agent-start', { runId: 'queue', seq: 1, label: '', childId: 'real-child' }],
    ['tool-workflow/agent-admission', { runId: 'queue', seq: 2, label: 'failure', state: 'failed', queuedAt: 2, lastProgressAt: 4, error: 'startup failed' }],
    ['tool-workflow/agent-end', { runId: 'queue', seq: 1, outcome: 'completed' }],
    ['tool-workflow/run-end', { runId: 'queue', stopReason: 'completed' }],
  ].map(([type,data]) => ev(type,data))
  for (const row of records) p.apply(row)
  const run = runOf(p), members = agents(run)
  assert.deepEqual(run.workflowProgress.map(row => row.type), ['workflow_agent','workflow_agent','workflow_phase'])
  assert.deepEqual(members.map(row => [row.label,row.state,row.queuedAt,row.childId]), [['','done',1,'real-child'],['failure','error',2,undefined]])
  const replay = new ThreadProjector({ threadId: 'queued' })
  for (const row of [...history, ...records]) replay.apply(row)
  assert.deepEqual(runOf(replay).workflowProgress,run.workflowProgress)
})

test('the "Run a dynamic workflow?" card names the script: name, description, phases and arguments', () => {
  assert.match(WORKFLOW_APPROVAL_REASON, /^Run a dynamic workflow\?/)
  assert.equal(workflowApprovalCommand({ meta, script: 'return 1', args: { files: 2 } }), 'Workflow: audit\nAudit files\nPhases: Scan → Fix\nArguments: {"files":2}')
  assert.equal(workflowApprovalCommand({ script: 'export const meta={name:`scan`,description:`Look around`};return 1' }), 'Workflow: scan\nLook around')
  assert.equal(workflowApprovalCommand({ name: 'review-changes' }), 'Workflow: review-changes')
})

// dsh-workflow-ptc ends only started members when a run settles: a member still queued for a concurrency slot gets
// no agent-end and no failed admission, so the settled card must not keep showing it as queued.
for (const stopReason of ['cancelled', 'error']) test(`members still queued when the run ends (${stopReason}) settle as skipped, live and in replay`, () => {
  const history = [], p = new ThreadProjector({ threadId: 'queued-stop' })
  const apply = event => { history.push(event); return p.apply(event) }
  startWorkflow({ apply }, 'w1', { script: 'export const meta={name:"queue",description:"Queue"};return 1' })
  for (const [type, data] of [
    ['tool-workflow/run-start', { runId: 'wf_queued-stop', attemptId: 'a1', name: 'queue' }],
    ['tool-workflow/agent-admission', { runId: 'wf_queued-stop', attemptId: 'a1', seq: 1, label: 'running', state: 'queued', queuedAt: 1, lastProgressAt: 1 }],
    ['tool-workflow/agent-admission', { runId: 'wf_queued-stop', attemptId: 'a1', seq: 2, label: 'waiting', state: 'queued', queuedAt: 2, lastProgressAt: 2 }],
    ['tool-workflow/agent-start', { runId: 'wf_queued-stop', attemptId: 'a1', seq: 1, label: 'running', childId: 'c1' }],
    ['tool-workflow/agent-end', { runId: 'wf_queued-stop', attemptId: 'a1', seq: 1, outcome: 'cancelled' }],
    ['tool-workflow/run-end', { runId: 'wf_queued-stop', attemptId: 'a1', stopReason }],
  ]) apply(ev(type, data))
  const run = runOf(p)
  assert.equal(run.status, stopReason === 'cancelled' ? 'stopped' : 'failed')
  assert.deepEqual(agents(run).map(agent => [agent.label, agent.state]), [['running', 'skipped'], ['waiting', 'skipped']])
  const replay = new ThreadProjector({ threadId: 'queued-stop' })
  for (const event of history) replay.apply(event)
  assert.deepEqual(agents(runOf(replay)).map(agent => agent.state), ['skipped', 'skipped'])
})

test('a resumed run’s new attempt retires the Resume of the card it continues, live and in replay', () => {
  const history = [], p = new ThreadProjector({ threadId: 'resumed' })
  const apply = event => { history.push(event); return p.apply(event) }
  startWorkflow({ apply }, 'w1', { script: 'export const meta={name:"audit",description:"Audit"};return 1' })
  apply(ev('tool-workflow/run-start', { runId: 'wf_resume-me', attemptId: 'attempt-1', name: 'audit', scriptPath: '/saved/audit.js' }))
  apply(ev('tool-workflow/run-end', { runId: 'wf_resume-me', attemptId: 'attempt-1', stopReason: 'cancelled', error: 'workflow run cancelled' }))
  assert.equal(runOf(p).resumable, true)
  apply(ev('tool/call', { turn: 1, step: 2, callId: 'w2', name: 'Workflow', arguments: JSON.stringify({ scriptPath: '/saved/audit.js', resumeFromRunId: 'wf_resume-me' }) }))
  const notes = apply(ev('tool-workflow/run-start', { runId: 'wf_resume-me', attemptId: 'attempt-2', name: 'audit', scriptPath: '/saved/audit.js' }))
  assert.equal(runOf(p, 'w2').id, 'attempt-2')
  assert.equal(runOf(p).resumable, false)
  assert.ok(notes.some(note => note.params.item?.id === 'w1' && note.params.item.workflowRun.resumable === false), 'the earlier card is re-announced without Resume')
  const replay = new ThreadProjector({ threadId: 'resumed' })
  for (const event of history) replay.apply(event)
  assert.equal(runOf(replay).resumable, false)
})

// Claude Code inputs always launch in the background, so the call's run is "background" before anything starts. A call
// stopped before its tool result (the turn interrupted on its "Run a dynamic workflow?" card) never started a run.
test('a background-input call stopped before any run started settles as stopped, live and in replay', () => {
  const history = [], p = new ThreadProjector({ threadId: 'never-started' })
  const apply = event => { history.push(event); return p.apply(event) }
  startWorkflow({ apply }, 'w1', { script: 'export const meta={name:"intr",description:"Interrupted"};return 1' })
  assert.equal(runOf(p).background, true)
  apply(ev('turn/end', { turn: 1, reason: { kind: 'aborted', reason: { kind: 'user' } } }))
  assert.equal(runOf(p).status, 'stopped')
  const replay = new ThreadProjector({ threadId: 'never-started' })
  for (const event of history) replay.apply(event)
  assert.equal(runOf(replay).status, 'stopped')
  // A launched background run (the engine named it) keeps running past its call.
  const launched = new ThreadProjector({ threadId: 'launched' })
  startWorkflow(launched, 'w1', { script: 'export const meta={name:"bg",description:"Background"};return 1' })
  launched.apply(ev('tool-workflow/run-start', { runId: 'wf_launched', attemptId: 'a1', name: 'bg' }))
  launched.apply(ev('turn/end', { turn: 1, reason: { kind: 'aborted', reason: { kind: 'user' } } }))
  assert.equal(runOf(launched).status, 'running')
})
