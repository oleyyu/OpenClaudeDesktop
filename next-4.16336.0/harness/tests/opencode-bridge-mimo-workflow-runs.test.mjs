// MiMo workflow runs that outlive their call (work/agents/sources/mimo/packages/opencode/src/tool/workflow.ts async: true,
// operation 'resume'; workflow/runtime.ts resume; server/routes/instance/workflows.ts list / resume / transcript): their
// card follows MiMo's own run list, a failed or stopped run resumes from OpenClaude Desktop (codeDesktop/workflow/resume), a
// background run stops through MiMo's own cancel, and /deep-research runs MiMo's command, not its same-named skill.
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
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-wfr-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const RUN = 'wf_0123456789abcdefghijklmnop'
const tool = (id, input, state) => ({ id, messageID: 'msg_a', sessionID: 'ses_w', type: 'tool', callID: `call_${id}`, tool: 'workflow', state: { input, ...state } })
const asyncStart = (extra = {}) => tool('prt_async', { operation: 'run', name: 'deep-research', async: true }, { status: 'completed', time: { start: 1000, end: 1100 }, output: `Workflow started in background. run_id: ${RUN}`, metadata: { runID: RUN, status: 'running' }, ...extra })
const row = (status, extra = {}) => ({ runID: RUN, sessionID: 'ses_w', name: 'deep-research', status, running: 1, succeeded: 2, failed: 0, createdAt: 1000, updatedAt: 9000, ...extra })
const agentsOf = (run) => run.workflowProgress.filter((entry) => entry.type === 'workflow_agent')

test('a background run (async: true) is a workflow card that follows MiMo\'s run list, stops through MiMo, and ends with the list', () => {
  const projector = new Projector({ threadId: 'ses_w', cwd: '/w' })
  // No row yet: the call says it runs.
  let run = toolItem(asyncStart(), projector.context()).workflowRun
  assert.deepEqual([run.id, run.runId, run.status, run.background, run.stopScope, run.name], [RUN, RUN, 'running', true, 'run', 'deep-research'])
  assert.equal(run.resumable, undefined)
  projector.workflowRuns.set(RUN, row('running', { currentPhase: 'Search' }))
  projector.workflowTranscripts.set(RUN, [{ kind: 'phase', text: 'Plan' }, { kind: 'phase', text: 'Search' }, { kind: 'log', text: 'fetching 4 sources' }])
  run = toolItem(asyncStart(), projector.context()).workflowRun
  assert.equal(run.status, 'running')
  assert.equal(run.summary, 'fetching 4 sources')
  assert.equal(run.currentPhase, 1)
  assert.deepEqual(agentsOf(run).map((agent) => agent.state), ['done', 'done', 'progress'], 'the list\'s counters, not the call\'s')
  // The list says it ended: so does the card (with the row's time), and a failed or stopped run can resume.
  projector.workflowRuns.set(RUN, row('failed', { running: 0, error: 'budget exceeded', updatedAt: 61000 }))
  run = toolItem(asyncStart(), projector.context()).workflowRun
  assert.deepEqual([run.status, run.summary, run.completedAt, run.durationMs, run.resumable], ['failed', 'budget exceeded', 61000, 60000, true])
  projector.workflowRuns.set(RUN, row('cancelled', { running: 0 }))
  assert.deepEqual([toolItem(asyncStart(), projector.context()).workflowRun.status, toolItem(asyncStart(), projector.context()).workflowRun.resumable], ['stopped', true])
  projector.workflowRuns.set(RUN, row('completed', { running: 0 }))
  assert.equal(toolItem(asyncStart(), projector.context()).workflowRun.resumable, undefined)
  // A start that failed before MiMo named the run stays a tool row.
  assert.equal(toolItem(tool('prt_bad', { operation: 'run', name: 'x', async: true }, { status: 'error', error: 'bad script' }), projector.context()).workflowRun, undefined)
})

test('a run MiMo\'s list still has running that this MiMo no longer runs ended failed, and can resume', () => {
  const projector = new Projector({ threadId: 'ses_w', cwd: '/w' })
  projector.workflowRuns.set(RUN, row('running'))
  projector.workflowLive = () => false
  const run = toolItem(asyncStart(), projector.context()).workflowRun
  assert.deepEqual([run.status, run.summary, run.resumable], ['failed', 'MiMo stopped before this workflow finished.', true])
  projector.workflowLive = () => true
  assert.equal(toolItem(asyncStart(), projector.context()).workflowRun.status, 'running')
})

test('a stopped foreground run is resumable; once MiMo runs it again its card follows the list; a later resume call is a tool row', () => {
  const projector = new Projector({ threadId: 'ses_w', cwd: '/w' })
  const stopped = tool('prt_run', { operation: 'run', name: 'deep-research' }, { status: 'completed', time: { start: 1000, end: 5000 }, output: `Cancelled.\nrun_id: ${RUN}`, metadata: { runID: RUN, status: 'cancelled', transcript: [] } })
  const resume = tool('prt_resume', { operation: 'resume', run_id: RUN }, { status: 'completed', time: { start: 7000, end: 7010 }, output: JSON.stringify({ runID: RUN, resumed: true }), metadata: { runID: RUN } })
  projector.load([{ info: { id: 'msg_a', role: 'assistant', time: { created: 2 } }, parts: [stopped, resume] }])
  let run = toolItem(stopped, projector.context()).workflowRun
  assert.deepEqual([run.status, run.resumable, run.stopScope, run.background], ['stopped', true, 'turn', false])
  // The list row changed long after the call ended (a resume): the card follows it.
  projector.workflowRuns.set(RUN, row('running', { updatedAt: 20000 }))
  run = toolItem(stopped, projector.context()).workflowRun
  assert.deepEqual([run.status, run.background, run.stopScope, run.resumable], ['running', true, 'run', undefined])
  // A row from the run's own end (the cancel settling a moment after the call) is not a resume.
  projector.workflowRuns.set(RUN, row('running', { updatedAt: 5200 }))
  assert.equal(toolItem(stopped, projector.context()).workflowRun.status, 'stopped')
  projector.workflowResumed.add(RUN)
  assert.equal(toolItem(stopped, projector.context()).workflowRun.status, 'running', 'a resume the thread saw')
  // One card per run: the resume call is a tool row while the call that started the run is in the thread.
  assert.equal(toolItem(resume, projector.context()).workflowRun, undefined)
  // Without it the resume call is the card; a resume MiMo refused never is.
  const alone = new Projector({ threadId: 'ses_w', cwd: '/w' })
  alone.load([{ info: { id: 'msg_a', role: 'assistant', time: { created: 2 } }, parts: [resume] }])
  assert.deepEqual([toolItem(resume, alone.context()).workflowRun.id, toolItem(resume, alone.context()).workflowRun.status], [RUN, 'running'])
  const refused = tool('prt_refused', { operation: 'resume', run_id: RUN }, { status: 'completed', output: JSON.stringify({ runID: RUN, resumed: false }), metadata: { runID: RUN } })
  assert.equal(toolItem(refused, alone.context()).workflowRun, undefined)
  // status / wait / cancel stay tool rows.
  assert.equal(toolItem(tool('prt_s', { operation: 'status', run_id: RUN }, { status: 'completed', output: '{}', metadata: { runID: RUN, status: 'running' } }), alone.context()).workflowRun, undefined)
})

function mimoBridge(api) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS.mimo, binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const calls = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options = {}) => { calls.push({ method, route, options }); return api(method, route, options) }
  return { bridge, calls, home }
}

function threadWith(bridge, parts) {
  const thread = new LiveThread(bridge, { info: { id: 'ses_w', directory: '/w' } })
  const events = []
  thread.emit = (method, params) => events.push({ method, params })
  bridge.threads.set(thread.id, thread)
  thread.projector.load([{ info: { id: 'msg_u', role: 'user', time: { created: 1 } }, parts: [] }, { info: { id: 'msg_a', role: 'assistant', parentID: 'msg_u', time: { created: 2 } }, parts }])
  thread.turnOf.set('msg_a', 'msg_u')
  thread.turnOf.set('msg_u', 'msg_u')
  return { thread, events, runs: () => events.filter((event) => event.params?.item?.workflowRun).map((event) => event.params.item.workflowRun) }
}

test('codeDesktop/workflow/resume: MiMo replays a stopped run (POST /workflows/:runID/resume); the card follows it to its new end', async () => {
  let status = 'cancelled'
  const stopped = tool('prt_run', { operation: 'run', name: 'deep-research' }, { status: 'completed', time: { start: 1000, end: 5000 }, output: `Cancelled.\nrun_id: ${RUN}`, metadata: { runID: RUN, status: 'cancelled', transcript: [] } })
  let resumed = true
  const { bridge, calls } = mimoBridge(async (method, route) => {
    if (route === '/workflows') return [row(status, { updatedAt: status === 'cancelled' ? 5001 : Date.now() }), { ...row('running'), runID: `wf_${'a'.repeat(64)}` }]
    if (route === `/workflows/${RUN}/resume`) return { runID: RUN, resumed }
    if (route === `/workflows/${RUN}/structure`) return { runID: RUN, nodes: [{ type: 'phase', id: 'p0', title: 'Plan' }, { type: 'agent', id: 'a1', phaseId: 'p0', label: 'planner', status: status === 'running' ? 'running' : 'succeeded' }] }
    if (route === `/workflows/${RUN}/transcript`) return { runID: RUN, transcript: [{ kind: 'phase', text: 'Plan' }, { kind: 'log', text: 'replaying' }] }
    throw new Error(`unexpected ${method} ${route}`)
  })
  const { thread, runs } = threadWith(bridge, [stopped])
  try {
    // Only with MiMo's workflow tool offered, and never in a read-only mode.
    await assert.rejects(bridge.handle('codeDesktop/workflow/resume', { threadId: thread.id, runId: RUN }), /Turn on Dynamic workflows/)
    thread.dynamicWorkflows = true
    thread.permission = { ...thread.permission, mode: 'plan' }
    await assert.rejects(bridge.handle('codeDesktop/workflow/resume', { threadId: thread.id, runId: RUN }), /read-only mode \(plan\)/)
    thread.permission = { ...thread.permission, mode: 'acceptEdits' }
    await assert.rejects(bridge.handle('codeDesktop/workflow/resume', { threadId: thread.id, runId: 'wf_other' }), /Unknown workflow run/)
    resumed = false
    await assert.rejects(bridge.handle('codeDesktop/workflow/resume', { threadId: thread.id, runId: RUN }), /MiMo couldn’t resume this workflow/)
    resumed = true
    status = 'running'
    assert.deepEqual(await bridge.handle('codeDesktop/workflow/resume', { threadId: thread.id, runId: RUN }), { status: 'resuming' })
    assert.ok(calls.some((call) => call.method === 'POST' && call.route === `/workflows/${RUN}/resume` && call.options.directory === '/w'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    let live = runs().at(-1)
    assert.deepEqual([live.id, live.status, live.background, live.stopScope, live.summary], [RUN, 'running', true, 'run', 'replaying'])
    assert.ok(calls.some((call) => call.route === '/workflows' && call.options.query?.sessionID === 'ses_w'), 'MiMo\'s run list for the session')
    assert.ok(!thread.projector.workflowRuns.has(`wf_${'a'.repeat(64)}`), 'a nested run is not a card')
    assert.deepEqual(await bridge.handle('codeDesktop/workflow/resume', { threadId: thread.id, runId: RUN }), { status: 'alreadyRunning' })
    // The list says it ended: the card settles and the poll stops.
    status = 'completed'
    await new Promise((resolve) => setTimeout(resolve, 1200))
    live = runs().at(-1)
    assert.equal(live.status, 'completed')
    await new Promise((resolve) => setTimeout(resolve, 1100))
    assert.equal(thread.workflowTimer, null)
  } finally { thread.close('done') }
})

test('Stop on a background run asks the model to cancel it with MiMo\'s own tool (no route can); a turn-scoped run still stops its turn', async () => {
  const { bridge } = mimoBridge(async (method, route) => {
    if (route === '/workflows') return [row('running')]
    if (route.startsWith('/workflows/')) return { runID: RUN, nodes: [], transcript: [] }
    throw new Error(`unexpected ${method} ${route}`)
  })
  const { thread } = threadWith(bridge, [asyncStart()])
  // MiMo said it started (workflow.started): it runs, though its structure is still empty.
  bridge.onEvent({ type: 'workflow.started', properties: { sessionID: 'ses_w', runID: RUN, name: 'deep-research' } })
  const started = []
  thread.startTurn = async (params) => { started.push(params); return { turn: { id: 't2' } } }
  try {
    await assert.rejects(bridge.handle('codeDesktop/workflow/stop', { threadId: thread.id, runId: RUN }), /Turn on Dynamic workflows/)
    thread.dynamicWorkflows = true
    assert.deepEqual(await bridge.handle('codeDesktop/workflow/stop', { threadId: thread.id, runId: RUN }), { status: 'stopping', scope: 'run' })
    assert.equal(started.length, 1)
    assert.match(started[0].input[0].text, new RegExp(`"operation": "cancel", "run_id": "${RUN}"`))
    // A run that ended needs nothing.
    thread.projector.workflowRuns.set(RUN, row('completed'))
    assert.deepEqual(await bridge.handle('codeDesktop/workflow/stop', { threadId: thread.id, runId: RUN }), { status: 'alreadyFinished' })
    // MiMo's list has it running, but this MiMo holds no such run (it quit with it): it ended, and can resume.
    thread.projector.workflowRuns.set(RUN, row('running'))
    bridge.liveWorkflows.clear()
    thread.workflowParts.set(RUN, { messageID: 'msg_a', partID: 'prt_async', done: false, follow: true })
    await thread.fetchWorkflows([RUN])
    assert.ok(thread.workflowGone.has(RUN))
    assert.deepEqual([thread.workflowRunOf(RUN).status, thread.workflowRunOf(RUN).resumable], ['failed', true])
  } finally { thread.close('done') }
})

test('MiMo\'s events: a settled run that starts again was resumed (its card follows it); bridge-wide liveness per run', async () => {
  const stopped = tool('prt_run', { operation: 'run', name: 'deep-research' }, { status: 'error', time: { start: 1000, end: 5000 }, error: 'Tool execution aborted', metadata: { runID: RUN, status: 'running', transcript: [] } })
  const { bridge } = mimoBridge(async (method, route) => {
    if (route === '/workflows') return [row('running', { updatedAt: 5001 })]
    if (route === `/workflows/${RUN}/structure`) return { runID: RUN, nodes: [] }
    if (route === `/workflows/${RUN}/transcript`) return { runID: RUN, transcript: [] }
    throw new Error(`unexpected ${method} ${route}`)
  })
  const { thread, runs } = threadWith(bridge, [stopped])
  try {
    assert.equal(thread.workflowRunOf(RUN).status, 'stopped')
    bridge.onEvent({ type: 'workflow.started', properties: { sessionID: 'ses_w', runID: RUN, name: 'deep-research' } })
    assert.ok(bridge.liveWorkflows.has(RUN))
    assert.ok(thread.projector.workflowResumed.has(RUN))
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(runs().at(-1).status, 'running')
    bridge.onEvent({ type: 'workflow.finished', properties: { sessionID: 'ses_w', runID: RUN, status: 'completed' } })
    assert.ok(!bridge.liveWorkflows.has(RUN))
    // MiMo quit: nothing it ran is live any more.
    bridge.liveWorkflows.add('wf_x')
    thread.workflowHeld.add(RUN)
    bridge.serverExited({ code: 1 })
    assert.equal(bridge.liveWorkflows.size, 0)
    assert.equal(thread.workflowHeld.size, 0)
  } finally { thread.close('done') }
})

test('/deep-research runs MiMo\'s command, not its same-named skill; the command needs the workflow tool', async () => {
  const deepResearch = { name: 'deep-research', source: 'command', description: 'deep multi-source, fact-checked research report (runs the deep-research workflow)', template: 'Research request:\n$ARGUMENTS\n  workflow({ operation: "run", name: "deep-research", args: "<q>" })', hints: ['$ARGUMENTS'] }
  const { bridge, home } = mimoBridge(async (method, route) => {
    if (route === '/skill') return [
      { name: 'deep-research', description: 'Ad-hoc research', location: path.join(home, 'builtin_skills', 'deep-research', 'SKILL.md') },
      { name: 'mine', description: 'Mine', location: path.join(home, '.config', 'mimocode', 'skills', 'mine', 'SKILL.md') },
    ]
    if (route === '/command') return [
      { name: 'init', source: 'command', description: 'guided AGENTS.md setup', template: 'x' },
      deepResearch,
      // A skill's own command row (MiMo lists every skill no command took as a command).
      { name: 'mine', source: 'skill', description: 'Mine', template: 'y' },
    ]
    throw new Error(`unexpected ${method} ${route}`)
  })
  const cwd = tmp()
  const rows = (await bridge.skillsList({ cwds: [cwd] })).data[0].skills
  const byPath = Object.fromEntries(rows.map((row) => [row.path, row]))
  assert.deepEqual(rows.map((row) => row.path).filter((file) => file.startsWith('command:')), ['command:init', 'command:deep-research'])
  const command = byPath['command:deep-research']
  assert.deepEqual([command.scope, command.localizationKey, command.requiresWorkflowTool, command.userInvocable], ['system', 'mimo.slash.deep-research', true, true])
  assert.equal(byPath['command:init'].requiresWorkflowTool, undefined)
  const skill = rows.find((row) => row.name === 'deep-research' && !row.path.startsWith('command:'))
  assert.deepEqual([skill.userInvocable, skill.modelInvocable], [false, true], 'the skill stays in Customize, for the model only')
  assert.equal(rows.find((row) => row.name === 'mine').userInvocable, undefined, 'a skill no command shadows is as before')

  // Run with the workflow tool withheld: refused before the model starts.
  const thread = new LiveThread(bridge, { info: { id: 'ses_w', directory: cwd } })
  bridge.threads.set(thread.id, thread)
  thread.applyRules = async () => {}
  bridge.catalog.load = async () => {}
  bridge.loadCompaction = async () => {}
  try {
    await assert.rejects(thread.startTurn({ threadId: thread.id, input: [{ type: 'text', text: '/deep-research quantum batteries' }, { type: 'skill', name: 'deep-research', path: 'command:deep-research' }] }), /\/deep-research runs a MiMo workflow\. Turn on Dynamic workflows/)
    assert.equal(thread.held, false)
  } finally { thread.close('done') }
})

test('a failed run\'s reason is its error line, not the script\'s stack (real MiMo 0.1.15 output)', () => {
  const output = `▸ Plan\n  about to fail\n\nError: workflow script rejected: boom\n    at <anonymous> (eval.js:5:16)\n    at <eval> (eval.js:6:3)\nrun_id: ${RUN}`
  const failed = toolItem(tool('prt_f', { operation: 'run', script: 'x' }, { status: 'completed', time: { start: 1, end: 2 }, output, metadata: { runID: RUN, status: 'failed', transcript: [] } }), {}).workflowRun
  assert.deepEqual([failed.status, failed.summary, failed.resumable], ['failed', 'workflow script rejected: boom', true])
  const projector = new Projector({ threadId: 'ses_w', cwd: '/w' })
  projector.workflowRuns.set(RUN, row('failed', { error: 'workflow script rejected: boom\n    at <anonymous> (eval.js:5:16)' }))
  assert.equal(toolItem(asyncStart(), projector.context()).workflowRun.summary, 'workflow script rejected: boom')
})
