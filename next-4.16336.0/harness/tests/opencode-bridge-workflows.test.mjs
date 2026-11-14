// MiMo's own dynamic workflows (its `workflow` tool, packages/opencode/src/tool/workflow.ts) as item.workflowRun:
// phases and per-phase agents from the run's structure tree (GET /workflows/:runID/structure), agent tokens from their
// actors' messages, metadata.status honored, a stable startedAt, live re-announcement and a turn-scoped Stop.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Projector, toolItem } from '../packages/opencode-bridge/src/projection.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-wf-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const RUN = 'wf_0123456789abcdefghijklmnop'
const workflowPart = (state, extra = {}) => ({ id: 'prt_wf', messageID: 'msg_a', sessionID: 'ses_w', type: 'tool', callID: 'call_wf', tool: 'workflow', state: { input: { operation: 'run', name: 'deep-research' }, ...state }, ...extra })
const agentsOf = (run) => run.workflowProgress.filter((entry) => entry.type === 'workflow_agent')
const phasesOf = (run) => run.workflowProgress.filter((entry) => entry.type === 'workflow_phase')

// workflow/runtime.ts WorkflowNode: one phase node per phase() call, each agent with the phase current at agent().
const structure = [
  { type: 'phase', id: 'p0', title: 'Plan' },
  { type: 'agent', id: 'a1', phaseId: 'p0', label: 'planner', agentType: 'general', prompt: 'p', actorID: 'act_1', durationMs: 900, status: 'succeeded' },
  { type: 'phase', id: 'p2', title: 'Search' },
  { type: 'agent', id: 'a3', phaseId: 'p2', label: 'search a', agentType: 'general', prompt: 'p', actorID: 'act_2', model: 'mimo/fast', status: 'running' },
  { type: 'agent', id: 'a4', phaseId: 'p2', agentType: 'explore', prompt: 'p', status: 'failed', durationMs: 50 },
  { type: 'phase', id: 'p5', title: 'Plan' },
  { type: 'agent', id: 'a6', phaseId: 'p0', label: 'late planner', agentType: 'general', prompt: 'p', status: 'running' },
]

test('MiMo workflow structure: agents stay under the phase they started in, with real tokens; usage sums them', () => {
  const projector = new Projector({ threadId: 'ses_w', cwd: '/w' })
  projector.load([
    { info: { id: 'msg_a', role: 'assistant', time: { created: 2 }, tokens: { input: 5, output: 5 } }, parts: [] },
    { info: { id: 'msg_x1', role: 'assistant', agentID: 'act_1', time: { created: 3 }, tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 30, write: 0 } } }, parts: [] },
    { info: { id: 'msg_x2', role: 'assistant', agentID: 'act_1', time: { created: 4 }, tokens: { input: 10, output: 5 } }, parts: [] },
    { info: { id: 'msg_x3', role: 'assistant', agentID: 'act_2', time: { created: 5 }, tokens: { total: 77 } }, parts: [] },
  ])
  projector.workflowStructures.set(RUN, structure)
  const part = workflowPart({ status: 'running', time: { start: 1000 }, metadata: { runID: RUN, status: 'running', transcript: [{ kind: 'phase', text: 'Plan' }, { kind: 'phase', text: 'Search' }, { kind: 'phase', text: 'Plan' }], counters: { running: 2, succeeded: 1, failed: 1 }, currentPhase: 'Plan' } })
  const run = toolItem(part, projector.context()).workflowRun
  // Every phase() call is a phase (Plan revisited is its own group); the current one is the last visit.
  assert.deepEqual(phasesOf(run).map((phase) => [phase.index, phase.title]), [[0, 'Plan'], [1, 'Search'], [2, 'Plan']])
  assert.equal(run.currentPhase, 2)
  assert.deepEqual(agentsOf(run).map((agent) => [agent.id, agent.label, agent.state, agent.phaseTitle, agent.phaseIndex]), [
    ['a1', 'planner', 'done', 'Plan', 0], ['a3', 'search a', 'progress', 'Search', 1], ['a4', 'explore', 'error', 'Search', 1], ['a6', 'late planner', 'progress', 'Plan', 0],
  ])
  const [planner, search, failed] = agentsOf(run)
  assert.deepEqual([planner.tokens, planner.durationMs, search.tokens, search.model, failed.error], [165, 900, 77, 'mimo/fast', 'Agent failed'])
  assert.equal(run.usage.totalTokens, 242)
  assert.equal(run.stopScope, 'turn')
  assert.equal(run.memberControls, undefined)
})

test('MiMo workflow status follows metadata.status; a cancelled run is stopped, its running agents skipped', () => {
  const ctx = { threadId: 't', cwd: '/w' }
  const done = (metadata, output = '') => toolItem(workflowPart({ status: 'completed', time: { start: 1000, end: 4000 }, output, metadata: { runID: RUN, transcript: [], ...metadata } }), ctx).workflowRun
  const cancelled = done({ status: 'cancelled', counters: { running: 2, succeeded: 1, failed: 0 } }, 'Cancelled.\nrun_id: x')
  assert.deepEqual([cancelled.status, cancelled.summary, cancelled.durationMs], ['stopped', 'Stopped', 3000])
  assert.deepEqual(agentsOf(cancelled).map((agent) => agent.state), ['done', 'skipped', 'skipped'])
  const failed = done({ status: 'failed' }, '▸ Plan\n\nError: budget exceeded\nrun_id: x')
  assert.deepEqual([failed.status, failed.summary], ['failed', 'budget exceeded'])
  assert.equal(done({ status: 'completed' }, 'Result: 1\nrun_id: x').status, 'completed')
  // No terminal status in the metadata: the output says how it ended.
  assert.equal(done({}, 'Cancelled.\nrun_id: x').status, 'stopped')
  assert.equal(done({}, 'Error: boom\nrun_id: x').status, 'failed')
  assert.equal(done({}, 'Result: 1\nrun_id: x').status, 'completed')
  // With a structure, agents still running when the run was stopped / failed are skipped / cut short.
  const projector = new Projector({ threadId: 't', cwd: '/w' })
  projector.workflowStructures.set(RUN, structure)
  const stopped = toolItem(workflowPart({ status: 'completed', time: { start: 1000, end: 4000 }, output: 'Cancelled.\nrun_id: x', metadata: { runID: RUN, status: 'cancelled', transcript: [] } }), projector.context()).workflowRun
  assert.deepEqual(agentsOf(stopped).map((agent) => agent.state), ['done', 'skipped', 'error', 'skipped'])
})

test('MiMo workflow counters (no structure): no 64 cap, no phase guessed, startedAt stable across projections', async () => {
  const projector = new Projector({ threadId: 't', cwd: '/w' })
  const part = workflowPart({ status: 'pending', metadata: { runID: RUN, status: 'running', transcript: [{ kind: 'phase', text: 'Plan' }], counters: { running: 0, succeeded: 100, failed: 0 } } })
  const first = toolItem(part, projector.context()).workflowRun
  assert.equal(agentsOf(first).length, 100)
  assert.ok(agentsOf(first).every((agent) => agent.phaseIndex === undefined))
  await new Promise((resolve) => setTimeout(resolve, 15))
  const again = toolItem(part, projector.context()).workflowRun
  assert.equal(again.startedAt, first.startedAt, 'first-seen time, not Date.now() per projection')
  assert.equal(again.sequence, first.sequence, 'an unchanged run keeps its sequence')
  // time.start wins once the part has one.
  assert.equal(toolItem(workflowPart({ status: 'running', time: { start: 1234 }, metadata: { runID: RUN, status: 'running', transcript: [] } }), projector.context()).workflowRun.startedAt, 1234)
  // The capped transcript and counter-only changes still raise the sequence.
  const capped = (n, counters) => toolItem(workflowPart({ status: 'running', time: { start: 1 }, metadata: { runID: 'wf_cap', status: 'running', counters, transcript: [...Array.from({ length: 40 }, () => ({ kind: 'log', text: 'x' })), { kind: 'log', text: `…(${n} lines omitted)` }, ...Array.from({ length: 160 }, () => ({ kind: 'log', text: 'y' }))] } }), projector.context()).workflowRun.sequence
  const a = capped(10, { running: 1, succeeded: 0, failed: 0 })
  const b = capped(11, { running: 1, succeeded: 0, failed: 0 })
  const c = capped(11, { running: 0, succeeded: 1, failed: 0 })
  assert.ok(a < b && b < c, `${a} < ${b} < ${c}`)
})

function bridgeFor(api) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS.mimo, binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const calls = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options = {}) => { calls.push({ method, route }); return api(method, route, options) }
  return { bridge, calls }
}

test('MiMo workflow live: the structure is polled while the run runs, the item re-announced, a final fetch after it ends', async () => {
  let nodes = structure.slice(0, 2)
  const { bridge, calls } = bridgeFor(async (method, route) => {
    if (route === `/workflows/${RUN}/structure`) return { runID: RUN, nodes }
    if (route.endsWith('/abort')) return true
    throw new Error(`unexpected ${method} ${route}`)
  })
  const thread = new LiveThread(bridge, { info: { id: 'ses_w', directory: '/w' } })
  const events = []
  thread.emit = (method, params) => events.push({ method, params })
  bridge.threads.set(thread.id, thread)
  thread.projector.load([{ info: { id: 'msg_u', role: 'user', time: { created: 1 } }, parts: [] }, { info: { id: 'msg_a', role: 'assistant', parentID: 'msg_u', time: { created: 2 } }, parts: [] }])
  thread.turnOf.set('msg_a', 'msg_u')
  thread.activeTurn = { id: 'msg_u', startedMs: 1 }
  thread.busy = true
  try {
    thread.onPart(workflowPart({ status: 'running', time: { start: 1000 }, metadata: { runID: RUN, status: 'running', transcript: [{ kind: 'phase', text: 'Plan' }], counters: { running: 1, succeeded: 0, failed: 0 } } }))
    const runs = () => events.filter((event) => event.params?.item?.workflowRun).map((event) => [event.method, event.params.item.workflowRun])
    await new Promise((resolve) => setTimeout(resolve, 1300))
    assert.ok(calls.some((call) => call.route === `/workflows/${RUN}/structure`), 'polled')
    const live = runs().at(-1)
    assert.equal(live[0], 'item/started', 're-announced while running')
    assert.deepEqual(agentsOf(live[1]).map((agent) => [agent.label, agent.phaseTitle]), [['planner', 'Plan']])
    assert.ok(live[1].sequence > runs()[0][1].sequence)

    // Stop: MiMo cancels runs only from its own tool, so the turn stops (scope 'turn'); an unknown run is refused.
    assert.deepEqual(await bridge.handle('codeDesktop/workflow/stop', { threadId: thread.id, runId: RUN, attemptId: RUN }), { status: 'stopping', scope: 'turn' })
    assert.ok(calls.some((call) => call.route === '/session/ses_w/abort'))
    await assert.rejects(bridge.handle('codeDesktop/workflow/stop', { threadId: thread.id, runId: 'wf_other' }), /Unknown workflow run/)

    nodes = structure
    thread.onPart(workflowPart({ status: 'completed', time: { start: 1000, end: 5000 }, output: 'Cancelled.\nrun_id: x', metadata: { runID: RUN, status: 'cancelled', transcript: [{ kind: 'phase', text: 'Plan' }, { kind: 'phase', text: 'Search' }], counters: { running: 2, succeeded: 1, failed: 1 } } }))
    await new Promise((resolve) => setTimeout(resolve, 50))
    const final = runs().at(-1)
    assert.equal(final[0], 'item/completed')
    assert.equal(final[1].status, 'stopped')
    assert.equal(agentsOf(final[1]).length, 4, 'the final structure re-announced after completion')
    assert.equal((await bridge.handle('codeDesktop/workflow/stop', { threadId: thread.id, runId: RUN })).status, 'alreadyFinished')
    // Nothing live: the poll stops.
    await new Promise((resolve) => setTimeout(resolve, 1100))
    const polls = calls.filter((call) => call.route.startsWith('/workflows/')).length
    await new Promise((resolve) => setTimeout(resolve, 1100))
    assert.equal(calls.filter((call) => call.route.startsWith('/workflows/')).length, polls)
    assert.equal(thread.workflowTimer, null)
  } finally { thread.close('done') }
})
