/**
 * Qwen Code's own dynamic workflows (its `workflow` tool, core/src/tools/workflow/workflow.ts, and the session's
 * workflow run registry) → OpenClaude Desktop's model-workflow runs (item.workflowRun, app/src/model-workflow-model.mjs), in
 * the app's run shape (app/src/workflow-progress-model.mjs: workflow_phase / workflow_agent progress entries), so the
 * transcript row and the Tasks card are the ones every workflow uses. Qwen runs the workflow; the bridge only projects:
 *
 *   tool_call workflow                  a run 'running' under the call's id (saved workflow name if any)
 *   tool_call_update (live)             the ```json phase tree buildLivePhaseTreeDisplay writes: run id, meta,
 *                                       status, current phase, phases, token spend
 *   qwen/status/session/tasks           (includeWorkflows, polled while a run is active) the run's phase visits,
 *                                       dispatches (one agent cell each: state, phase, time, error) and tokens
 *   tool result                         completed with its final display; 'Workflow failed: …' / 'Workflow cancelled.';
 *                                       a background start ('Workflow <id> started in the background') keeps running
 *   codeDesktop/workflow/stop           qwen/control/session/task/cancel {taskKind: 'workflow', taskId: <run id>}
 *   codeDesktop/workflow/pause          qwen/control/session/task/workflow-action {action: pause|resume}: Qwen's
 *                                       cooperative pause (no new agent starts); a paused run is run.paused, and a
 *                                       named live run offers it (run.pauseControls)
 */

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const STATUS = { running: 'running', pausing: 'running', paused: 'running', completed: 'completed', failed: 'failed', cancelled: 'stopped' }
const AGENT_STATE = { queued: 'pending', running: 'progress', completed: 'done', cached: 'done', failed: 'error', cancelled: 'error' }

/** The tool a Qwen call runs (_meta.toolName; a deferred tool through the tool_call meta-tool is that tool). */
export function qwenToolName(call) {
  const name = call?._meta?.toolName ?? ''
  return name === 'tool_call' && typeof call?.rawInput?.name === 'string' ? call.rawInput.name : name
}
export const isQwenWorkflowCall = (call) => qwenToolName(call) === 'workflow'

function clone(run) {
  return { ...run, sequence: (run.sequence ?? 0) + 1, workflowProgress: (run.workflowProgress ?? []).map((entry) => ({ ...entry })) }
}
function phaseOf(progress, title, fresh = false) {
  let found = !fresh && progress.findLast((entry) => entry.type === 'workflow_phase' && entry.title === title)
  if (!found) {
    found = { type: 'workflow_phase', index: progress.filter((entry) => entry.type === 'workflow_phase').length, title }
    progress.push(found)
  }
  return found
}
function withUsage(run, spent = null) {
  const agents = run.workflowProgress.reduce((sum, entry) => sum + (entry.tokens || 0), 0)
  run.usage = { totalTokens: agents || (Number.isFinite(spent) ? spent : run.usage?.totalTokens ?? 0) }
  return run
}
function settle(run, status, time, summary) {
  delete run.paused
  delete run.pauseControls
  run.status = status
  run.completedAt = time
  run.durationMs = Number.isFinite(run.startedAt) ? Math.max(0, time - run.startedAt) : undefined
  if (status !== 'completed') run.summary = summary ?? (status === 'stopped' ? 'Stopped' : 'Workflow failed')
  for (const entry of run.workflowProgress) {
    if (entry.type !== 'workflow_agent' || (entry.state !== 'progress' && entry.state !== 'pending')) continue
    // A run that completed finished its agents (the registry's last answer can trail the run's end by a poll): done.
    if (status === 'completed') { entry.state = 'done'; continue }
    entry.state = 'error'
    entry.error = status === 'stopped' ? 'Stopped before completion' : 'Workflow ended before completion'
  }
  return withUsage(run)
}

const isRunId = (value) => /^wf_[0-9a-f]{6,}$/i.test(String(value ?? ''))

/** A workflow call's own input (a deferred call through the tool_call meta-tool: its arguments). */
function callInput(call) {
  const raw = call?.rawInput && typeof call.rawInput === 'object' ? call.rawInput : {}
  return call?._meta?.toolName === 'tool_call' ? (raw.arguments && typeof raw.arguments === 'object' ? raw.arguments : {}) : raw
}

/** The script's `export const meta = { … }` literal, read leniently (string values only): {name, description, phases}. */
function scriptMeta(script) {
  const source = typeof script === 'string' ? script : ''
  const start = source.search(/export\s+const\s+meta\s*=\s*\{/)
  const metaText = start >= 0 ? source.slice(start, start + 20000) : ''
  const field = (key) => { const match = new RegExp(`(?:^|[{,\\s])["']?${key}["']?\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`).exec(metaText); return match ? text(match[2].replace(/\\(.)/g, '$1')) : null }
  const phasesAt = metaText.search(/["']?phases["']?\s*:\s*\[/)
  const phasesText = phasesAt >= 0 ? metaText.slice(phasesAt, metaText.indexOf(']', phasesAt) + 1 || undefined) : ''
  return { name: field('name'), description: field('description'), phases: phasesFromMeta(phasesText) }
}

/** The name Qwen's call title gives the run ('Run workflow: <name>', also behind a 'Workflow: ' prefix). */
const titledName = (call) => text(/Run workflow:\s*(.+)$/.exec(String(call?.title ?? ''))?.[1])

/**
 * The text summary Qwen's ACP ends a workflow call with (no live phase tree reaches ACP clients): '--- workflow run ---',
 * 'runId: wf_…', 'agents: N dispatched · N completed · N cached · N failed', 'tokens: N spent'. null when absent.
 */
export function workflowSummary(value) {
  const body = String(value ?? '')
  const runId = /^runId:\s*(\S+)/m.exec(body)?.[1] ?? null
  const agents = /^agents:\s*(\d+)\s*dispatched\b([^\n]*)/m.exec(body)
  const tokens = /^tokens:\s*([\d,]+)\s*spent/m.exec(body)?.[1]
  if (!runId && !agents && tokens === undefined) return null
  const count = (word) => { const hit = new RegExp(`(\\d+)\\s*${word}`).exec(agents?.[2] ?? ''); return hit ? Number(hit[1]) : null }
  return {
    runId,
    dispatched: agents ? Number(agents[1]) : null, completed: count('completed'), cached: count('cached'), failed: count('failed'),
    tokens: tokens !== undefined ? Number(tokens.replace(/,/g, '')) : null,
  }
}

/**
 * The run a workflow call starts (its id is the call's until Qwen names the run). Named by the call's input name, the
 * call's title, else its script's meta (an inline script, the usual model-written kind, has no input name).
 */
export function qwenWorkflowRun(call, time) {
  const input = callInput(call)
  const meta = scriptMeta(input?.script)
  const name = text(input?.name) ?? titledName(call) ?? meta.name ?? 'workflow'
  const description = meta.description ?? name
  return withUsage({
    id: `call-${call.toolCallId}`, source: 'model', callId: call.toolCallId, runId: null, name, description, status: 'running',
    startedAt: time, background: input?.run_in_background === true, sequence: 1, workflowProgress: [],
    // Until Qwen names the run there is no id to cancel it by: Stop interrupts the turn (dropped once named).
    stopScope: 'turn',
  })
}

/**
 * What a workflow call's approval card shows (OpenClaude Desktop's "Run a dynamic workflow?" card, approval-card-model
 * agentTool kind 'workflow'): {name, description, phases, args} from the call's input and its script's
 * `export const meta = { … }` literal (read leniently: string values only).
 */
export function workflowApprovalTool(call) {
  const input = callInput(call)
  const meta = scriptMeta(input?.script)
  const name = text(input?.name) ?? meta.name ?? titledName(call) ?? 'workflow'
  const description = meta.description
  return { kind: 'workflow', name, ...(description ? { description } : {}), phases: meta.phases ?? [], ...(input?.args !== undefined ? { args: (() => { try { return JSON.stringify(input.args).slice(0, 2000) } catch { return undefined } })() } : {}) }
}
// Phase titles from a `phases: [...]` literal: each `title: '…'` entry, or bare strings when no titles are given.
function phasesFromMeta(source) {
  if (!source) return null
  const titled = [...source.matchAll(/title\s*:\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((match) => text(match[2])).filter(Boolean)
  if (titled.length) return titled.slice(0, 50).map((title) => ({ title }))
  const bare = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((match) => text(match[2])).filter((value) => value && value !== 'phases')
  return bare.slice(0, 50).map((title) => ({ title }))
}

/** The JSON phase tree in a workflow display (live or final), or null. */
export function workflowDisplay(value) {
  const body = /```json\s*\n([\s\S]*?)\n```/.exec(String(value ?? ''))?.[1]
  if (!body) return null
  try { const parsed = JSON.parse(body); return parsed && typeof parsed === 'object' && typeof parsed.runId === 'string' ? parsed : null } catch { return null }
}

function named(run, runId) {
  if (typeof runId === 'string' && runId && run.runId !== runId) { run.runId = runId; run.id = runId }
  if (run.runId) delete run.stopScope
  // A named live run can be paused and resumed (Qwen's workflow-action), as Qwen's own Background tasks view does.
  if (run.runId && run.status === 'running') run.pauseControls = true
}
/** Qwen's 'pausing' / 'paused' (still a live run): run.paused. */
function pausedFrom(run, status) {
  if (status === 'paused' || status === 'pausing') run.paused = true
  else if (status === 'running') delete run.paused
}

/** A display snapshot ({runId, meta, status, currentPhase, phases, tokens}) folded into the run. */
export function applyWorkflowSnapshot(run, snapshot, time) {
  if (!snapshot) return run
  const next = clone(run)
  named(next, snapshot.runId)
  const meta = snapshot.meta && typeof snapshot.meta === 'object' ? snapshot.meta : null
  if (text(meta?.name)) next.name = text(meta.name)
  if (text(meta?.description)) next.description = text(meta.description)
  else if (text(meta?.name) && next.description === 'workflow') next.description = text(meta.name)
  for (const phase of Array.isArray(meta?.phases) ? meta.phases : []) { const title = text(typeof phase === 'string' ? phase : phase?.title); if (title) phaseOf(next.workflowProgress, title) }
  for (const phase of Array.isArray(snapshot.phases) ? snapshot.phases : []) { const title = text(phase); if (title) phaseOf(next.workflowProgress, title) }
  if (text(snapshot.currentPhase)) next.currentPhase = phaseOf(next.workflowProgress, text(snapshot.currentPhase)).index
  withUsage(next, Number(snapshot.tokens?.spent))
  pausedFrom(next, snapshot.status)
  const status = STATUS[snapshot.status]
  if (status && status !== 'running' && next.status === 'running') return settle(next, status, time, text(snapshot.error) ?? undefined)
  return JSON.stringify(next) === JSON.stringify({ ...run, sequence: next.sequence }) ? run : next
}

/** One registry entry (ServeSessionWorkflowTaskStatus) folded into the run: phases, agents, tokens, its end. */
export function applyWorkflowTask(run, task, time) {
  if (!task || task.kind !== 'workflow') return run
  const next = clone(run)
  named(next, task.id)
  // An inline script's run has no workflowName; Qwen's registry then labels and describes it by its run id, never a name.
  const own = (value) => { const found = text(value); return found && found !== task.id && !isRunId(found) ? found : null }
  const taskName = own(task.workflowName) ?? own(task.label)
  if (taskName && next.name === 'workflow') next.name = taskName
  if (own(task.description) && (next.description === 'workflow' || next.description === next.name)) next.description = own(task.description)
  if (next.description === 'workflow' && next.name !== 'workflow') next.description = next.name
  if (task.isBackgrounded === true) next.background = true
  if (Number.isFinite(task.startTime) && task.startTime < (next.startedAt ?? Infinity)) next.startedAt = task.startTime
  const progress = next.workflowProgress
  // Each phase visit is a phase (a revisit of a title is a new group, as phase() calls are).
  const visits = new Map()
  for (const visit of Array.isArray(task.phaseVisits) ? task.phaseVisits : []) {
    const title = text(visit?.title)
    if (!title) continue
    const existing = progress.find((entry) => entry.type === 'workflow_phase' && entry.visitId === visit.id)
    const phase = existing ?? (() => { const unvisited = progress.find((entry) => entry.type === 'workflow_phase' && entry.title === title && !entry.visitId); if (unvisited) { unvisited.visitId = visit.id; return unvisited } const made = phaseOf(progress, title, true); made.visitId = visit.id; return made })()
    visits.set(visit.id, phase)
  }
  if (text(task.currentPhase)) next.currentPhase = (progress.findLast((entry) => entry.type === 'workflow_phase' && entry.title === text(task.currentPhase)) ?? phaseOf(progress, text(task.currentPhase))).index
  for (const dispatch of Array.isArray(task.dispatches) ? task.dispatches : []) {
    if (typeof dispatch?.id !== 'string') continue
    let agent = progress.find((entry) => entry.type === 'workflow_agent' && entry.id === dispatch.id)
    if (!agent) {
      const phase = dispatch.phaseVisitId ? visits.get(dispatch.phaseVisitId) : undefined
      agent = { type: 'workflow_agent', index: progress.filter((entry) => entry.type === 'workflow_agent').length, id: dispatch.id, label: text(dispatch.label) ?? 'Agent', state: 'pending', ...(phase ? { phaseIndex: phase.index, phaseTitle: phase.title } : {}) }
      progress.push(agent)
    }
    agent.state = AGENT_STATE[dispatch.status] ?? agent.state
    if (dispatch.status === 'cached') agent.cached = true
    if (Number.isFinite(dispatch.startedAt)) { agent.startedAt = dispatch.startedAt; agent.lastProgressAt ??= dispatch.startedAt }
    if (agent.state === 'progress') agent.progressSupported = false
    if (Number.isFinite(dispatch.endedAt) && Number.isFinite(dispatch.startedAt)) agent.durationMs = Math.max(0, dispatch.endedAt - dispatch.startedAt)
    if (agent.state === 'error') agent.error = text(dispatch.error) ?? (dispatch.status === 'cancelled' ? 'Agent cancelled' : 'Agent failed')
  }
  withUsage(next, Number(task.tokensSpent))
  pausedFrom(next, task.status)
  const status = STATUS[task.status]
  if (status && status !== 'running' && next.status === 'running') return settle(next, status, Number.isFinite(task.endTime) ? task.endTime : time, text(task.error) ?? undefined)
  return JSON.stringify({ ...next, sequence: 0 }) === JSON.stringify({ ...run, sequence: 0 }) ? run : next
}

/**
 * The run after one update of its tool call: the live or final phase tree, a background start, or the tool's end.
 * `done` once the call settled (`failed` when it failed).
 */
export function workflowFromCall(run, call, { time, done = false, failed = false, output = '' } = {}) {
  // The call's arguments and title arrive after its first update: the run is named once they are known.
  let named0 = run
  if (run.name === 'workflow' || run.description === 'workflow') {
    const fresh = qwenWorkflowRun(call, time)
    if ((run.name === 'workflow' && fresh.name !== 'workflow') || (run.description === 'workflow' && fresh.description !== 'workflow')) {
      named0 = clone(run)
      if (run.name === 'workflow') named0.name = fresh.name
      if (run.description === 'workflow' || run.description === run.name) named0.description = fresh.description
    }
  }
  let next = applyWorkflowSnapshot(named0, workflowDisplay(output), time)
  const background = /Workflow (\S+) started in the background/.exec(output)
  if (background) {
    if (!next.background || next.runId !== background[1]) { next = clone(next); next.background = true; named(next, background[1]) }
    return next
  }
  if (!done || next.status !== 'running') return next
  const message = text(output)
  if (failed || /^Workflow (?:failed|cancelled)/.test(message ?? '')) {
    const cancelled = /^Workflow cancelled/.test(message ?? '')
    // The reason: 'Workflow failed: <reason>', else the output's first line (Qwen refusing a run: 'WorkflowTool: …').
    const reason = /^Workflow failed:\s*([^\n]+)/.exec(message ?? '')?.[1] ?? (/^Workflow failed\.?$/.test(message?.split('\n')[0] ?? '') ? null : message?.split('\n')[0])
    return settle(clone(next), cancelled ? 'stopped' : 'failed', time, cancelled ? 'Stopped' : text(reason) ?? 'Workflow failed')
  }
  if (next.background) return next
  // The final text summary (all ACP gets at the end): the run's id and the tokens Qwen spent on it.
  const summary = workflowSummary(output)
  const settled = clone(next)
  if (summary?.runId) named(settled, summary.runId)
  settle(settled, 'completed', time)
  if (Number.isFinite(summary?.tokens) && summary.tokens > (settled.usage?.totalTokens ?? 0)) settled.usage = { totalTokens: summary.tokens }
  return settled
}

/**
 * A run Qwen no longer reports (neither its registry, which keeps live runs and the latest finished ones, nor the
 * session's persisted run history, where a restart files an interrupted run as failed): it is over, its result unknown.
 */
export function workflowLost(run, time) {
  if (run.status !== 'running') return run
  return settle(clone(run), 'failed', time, 'Qwen no longer reports this run (it restarted or removed the run); its result is unknown')
}

/** A run whose tool call or process ended without its result (turn stopped, Qwen exited). */
export function workflowInterrupted(run, time) {
  if (run.status !== 'running') return run
  return settle(clone(run), 'stopped', time, 'Stopped')
}
