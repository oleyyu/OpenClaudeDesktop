/**
 * ZCode's own dynamic workflows (CreateWorkflow / AmendWorkflow / ResumeWorkflowRun, run by its dynamic-workflow engine:
 * packages/dynamic-workflow and bootstrap/src/app/dynamic-workflow-run-*.ts) → OpenClaude Desktop's model-workflow runs:
 * `workflowRun` on the tool item, in the app's run shape (app/src/workflow-progress-model.mjs: workflow_phase /
 * workflow_agent progress entries), so the transcript row and the Tasks card are the ones every workflow uses. ZCode runs
 * the workflow; the bridge only projects it.
 *
 *   tool call                           a run 'running' under the call's id (input.name; ResumeWorkflowRun: its run_id)
 *   tool result                         "…in the background with ID: <runId>" (as run <runId>, run <runId> has been
 *                                       resumed) names the run; a script that didn't compile, a refused or failed
 *                                       submit and a declined approval settle it
 *   session.updated task (workflow)     BackgroundTask* with taskKind 'workflow': taskId ≡ runId, and the run's end
 *   v4/conversation/workflowRunEvents   the run's journal (cursor = journal sequence, durable across restarts): polled
 *                                       while the run is live, read in full on resume. run-launched (declared phases,
 *                                       sub-agent model), phase-entered, actor-created, node-* (one agent per ask
 *                                       instance), usage-updated, run-settled
 *   v4/conversation/workflowRuns        the session's run summaries (toolCallId → runId, label, status, failure): a
 *                                       replayed run's identity and its end when the journal has no run-settled
 *   codeDesktop/workflow/stop           session/cancelBackgroundTask {taskId: runId}: ZCode aborts that run only
 *   codeDesktop/workflow/resume         v4/command resumeWorkflowRun {workId: runId}: a stopped or interrupted run that
 *                                       ZCode marks resumable (run.resumable) goes on from its journal, as ZCode's Resume
 *
 * ZCode's session stream withholds the engine's progress events (session-mapper.ts shouldExposeSessionEventToProtocol
 * drops dynamic_workflow_run_progress), so the journal query is the only progress source. Journal events carry no
 * times: an agent's start and duration are the bridge's clock while it watches a run live, absent in a replay.
 * ZCode has no skip or retry of one agent, so a run never offers member controls (run.memberControls stays unset).
 */

/** The tools that start (or restart) a run: core/src/tool/executor/background-task-registry.ts isDynamicWorkflowRunDispatchToolName. */
export const WORKFLOW_RUN_TOOLS = Object.freeze(['CreateWorkflow', 'AmendWorkflow', 'ResumeWorkflowRun'])
const RUN_TOOLS = new Set(WORKFLOW_RUN_TOOLS)
export const isWorkflowRunTool = (name) => RUN_TOOLS.has(name)

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

// The tool responses that name the run (create-workflow.ts, amend-workflow.ts, resume-workflow-run.ts).
const RUN_ID_PATTERNS = [
  /in the background with ID:\s*(\S+?)\.?(?:\s|$)/,
  /in the background as run\s+(\S+?)\.?(?:\s|$)/,
  /The workflow run\s+(\S+)\s+has been resumed/,
]
/** The run id a dispatch tool's response names, or null. */
export function workflowRunIdOf(content) {
  const value = String(content ?? '')
  for (const pattern of RUN_ID_PATTERNS) {
    const match = pattern.exec(value)
    if (match) return match[1]
  }
  return null
}

// Engine node events (engine/types.ts RunEvent) and run-settled vocabulary (workflow-observation-display.ts).
const NODE_EVENTS = new Set(['node-queued', 'node-dispatched', 'node-executing', 'node-waiting', 'node-repairing', 'node-nudged', 'node-settled'])
const RUNNING_PHASES = new Set(['node-executing', 'node-repairing', 'node-nudged'])
const RUN_STATUS = { completed: 'completed', errored: 'failed', stopped: 'stopped', cancelled: 'stopped', failed: 'failed' }
// The members of a script's `artifact.*` (shared/src/zcode-protocol-v4/workflow-artifacts.ts workflowRunArtifactKindSchema).
const ARTIFACT_KINDS = new Set(['file', 'markdown', 'chart', 'table', 'metrics', 'board'])
const STOP_SUMMARY = {
  user: 'Stopped',
  model: 'Stopped by the agent',
  provider: 'The model provider stopped the workflow',
  interrupted: 'Interrupted (ZCode stopped before the workflow finished)',
  superseded: 'Replaced by a revised run',
}

/** An engine InstanceRef / ActorRef as its runtime key (engine/types.ts refToString), or null. */
function refKey(ref) {
  if (!isRecord(ref) || typeof ref.siteId !== 'string' || !ref.siteId || !Number.isInteger(ref.ordinal)) return null
  return `${ref.siteId}@${ref.ordinal}`
}

/** The run a dispatch tool call starts. Until ZCode names the run, its id is the call's. */
export function workflowRunOf({ callId, tool, input, time = Date.now() }) {
  const args = isRecord(input) ? input : {}
  const fromPath = text(args.path) ? text(args.path).split('/').pop().replace(/\.[^.]+$/, '') : null
  const name = text(args.name) ?? text(isRecord(args.saved) ? args.saved.name : args.saved) ?? fromPath ?? 'workflow'
  const runId = tool === 'ResumeWorkflowRun' ? text(args.run_id) : null
  return {
    id: runId ?? `call-${callId}`, source: 'model', callId, runId, name, description: name, status: 'running', startedAt: time,
    // ZCode always runs a workflow as a background task of the session (create-workflow.ts status "backgrounded").
    background: true, sequence: 1, workflowProgress: [], usage: { totalTokens: 0 },
    // Until ZCode names the run (its approval or compile is still part of the turn), only stopping the turn stops it.
    ...(runId ? {} : { stopScope: 'turn' }),
  }
}

/**
 * A run's projection state: the run itself plus what folding its journal needs (cursor, run-started count, the
 * actors' names and birth phases, the sub-agent model). `run` is replaced, never mutated, when it changes.
 */
export function workflowState(run) {
  return { run, cursor: 0, starts: 0, actors: new Map(), agentActors: new Map(), model: null, taskEnded: null }
}

function cloneRun(run) {
  return { ...run, sequence: (run.sequence ?? 0) + 1, workflowProgress: (run.workflowProgress ?? []).map((entry) => ({ ...entry })), usage: { ...(run.usage ?? { totalTokens: 0 }) } }
}
const sameRun = (a, b) => JSON.stringify({ ...a, sequence: 0 }) === JSON.stringify({ ...b, sequence: 0 })

/** Commit a changed copy of the run (sequence bumped), or keep the old one when nothing changed. */
function commit(state, next) {
  if (sameRun(state.run, next)) return false
  state.run = next
  return true
}

function phaseOf(run, title) {
  const progress = run.workflowProgress
  let found = progress.find((entry) => entry.type === 'workflow_phase' && entry.title === title)
  if (!found) {
    found = { type: 'workflow_phase', index: progress.filter((entry) => entry.type === 'workflow_phase').length, title }
    progress.push(found)
  }
  return found
}

function settle(run, status, time, summary) {
  // resumable: ZCode's own verdict (run-settled payload, run summary), never derived here; a new end clears it.
  delete run.resumable
  run.status = status
  run.completedAt = time
  run.durationMs = Number.isFinite(run.startedAt) && Number.isFinite(time) ? Math.max(0, time - run.startedAt) : undefined
  if (status === 'completed') delete run.summary
  else run.summary = summary ?? (status === 'stopped' ? 'Stopped' : 'Workflow failed')
  delete run.currentPhase
  delete run.stopScope
  delete run.stall
  delete run.pendingQuestions
  for (const entry of run.workflowProgress) if (entry.type === 'workflow_agent') delete entry.question
  for (const entry of run.workflowProgress) {
    if (entry.type !== 'workflow_agent' || (entry.state !== 'start' && entry.state !== 'progress')) continue
    // An agent still live when the run ended: stopped or never started → Skipped; cut off by a failure → failed.
    if (status === 'failed' && entry.state === 'progress') { entry.state = 'error'; entry.error = 'Workflow ended before completion' }
    else if (status === 'completed' && entry.state === 'progress') entry.state = 'done'
    else { entry.state = 'skipped'; delete entry.error }
  }
  return run
}

function reopen(run) {
  run.status = 'running'
  delete run.completedAt
  delete run.durationMs
  delete run.summary
  delete run.resumable
}

function agentLabel(state, actorKey, fallback) {
  return (actorKey && state.actors.get(actorKey)?.name) || fallback || 'Agent'
}

/** One ask instance as an agent cell (node events of world-read sites are file and git reads, not agents). */
function nodeEvent(state, run, type, payload, time, live) {
  const key = refKey(payload.instance)
  if (!key) return
  const progress = run.workflowProgress
  let agent = progress.find((entry) => entry.type === 'workflow_agent' && entry.id === key)
  const ask = payload.kind === 'ask' || /^ask#/.test(payload.instance.siteId) || refKey(payload.actor) !== null
  if (!agent && !ask) return
  const actorKey = refKey(payload.actor) ?? state.agentActors.get(key) ?? null
  const head = text(payload.instructionsHead)
  const summary = head ? head.split('\n')[0].slice(0, 80) : null
  if (!agent) {
    agent = { type: 'workflow_agent', index: progress.filter((entry) => entry.type === 'workflow_agent').length + 1, id: key, label: agentLabel(state, actorKey, text(payload.actorName) ?? summary), state: 'start', progressSupported: false }
    progress.push(agent)
  }
  if (actorKey) {
    state.agentActors.set(key, actorKey)
    if (text(payload.actorName) && !state.actors.get(actorKey)?.name) state.actors.set(actorKey, { ...state.actors.get(actorKey), name: text(payload.actorName) })
    const name = state.actors.get(actorKey)?.name
    if (name) agent.label = name
  }
  if (head) agent.promptPreview = head
  if (state.model && !agent.model) agent.model = state.model
  // The instance's birth phase (node-queued / a cached node-settled), else its sub-agent's.
  const phaseTitle = text(payload.phaseName) ?? text(payload.actorPhaseName) ?? (actorKey ? state.actors.get(actorKey)?.phaseName : null)
  if (phaseTitle && agent.phaseTitle === undefined) {
    const phase = phaseOf(run, phaseTitle)
    agent.phaseIndex = phase.index
    agent.phaseTitle = phase.title
  }
  if (type === 'node-queued') {
    // A new attempt (a resumed run queues the instance again): the last one's outcome no longer holds.
    agent.state = 'start'
    for (const field of ['error', 'cached', 'durationMs', 'startedAt', 'lastProgressAt', 'toolCalls', 'lastToolName']) delete agent[field]
  } else if (RUNNING_PHASES.has(type)) {
    if (agent.state !== 'progress' && live) { agent.startedAt ??= time; agent.lastProgressAt = time }
    agent.state = 'progress'
  } else if (type === 'node-dispatched' || type === 'node-waiting') {
    // Dispatched: its session is ready, no model request yet; waiting: for a seat or a backoff, between requests.
    if (agent.state !== 'progress') agent.state = 'start'
  } else if (type === 'node-settled') {
    const outcome = payload.outcome
    agent.state = outcome === 'ok' ? 'done' : outcome === 'cancelled' ? 'skipped' : 'error'
    if (payload.cached === true) agent.cached = true
    if (agent.state === 'error') agent.error = text(payload.error?.message) ?? 'Agent failed'
    else delete agent.error
    if (live && Number.isFinite(agent.startedAt)) agent.durationMs = Math.max(0, time - agent.startedAt)
  }
}

function applyEvent(state, run, type, payload, time, live) {
  switch (type) {
    case 'run-started':
      state.starts += 1
      if (run.status !== 'running') reopen(run)
      // The run's agent limit and this computer's ceiling: what the card's Configure starts from.
      if (Number.isInteger(payload.caps?.maxConcurrency) && payload.caps.maxConcurrency > 0) run.maxConcurrency = payload.caps.maxConcurrency
      if (Number.isInteger(payload.concurrencyCeiling) && payload.concurrencyCeiling > 0) run.concurrencyCeiling = payload.concurrencyCeiling
      return
    case 'run-launched':
      if (text(payload.subagentModel)) { state.model = text(payload.subagentModel); run.subagentModel = state.model }
      for (const name of Array.isArray(payload.phaseNames) ? payload.phaseNames : []) if (text(name)) phaseOf(run, text(name))
      return
    case 'phase-entered':
      if (text(payload.name) && run.status === 'running') run.currentPhase = phaseOf(run, text(payload.name)).index
      else if (text(payload.name)) phaseOf(run, text(payload.name))
      return
    case 'actor-created': {
      const key = refKey(payload.actor)
      if (!key) return
      const known = state.actors.get(key) ?? {}
      state.actors.set(key, { name: text(payload.name) ?? known.name ?? null, phaseName: text(payload.phaseName) ?? known.phaseName ?? null })
      return
    }
    case 'node-progress': {
      const key = refKey(payload.instance)
      const agent = key ? run.workflowProgress.find((entry) => entry.type === 'workflow_agent' && entry.id === key) : null
      if (!agent) return
      if (Number.isInteger(payload.toolCalls) && payload.toolCalls >= 0) agent.toolCalls = payload.toolCalls
      if (text(payload.lastTool?.name)) agent.lastToolName = text(payload.lastTool.name)
      if (live && agent.state === 'progress') agent.lastProgressAt = time
      return
    }
    case 'usage-updated':
      if (Number.isFinite(payload.spentTokens) && payload.spentTokens >= 0) run.usage = { totalTokens: payload.spentTokens }
      delete run.stall
      return
    // A deliverable the script published (artifact.markdown / file / chart / table / metrics / board): the run's
    // artifacts, its primary one first. Only metadata (a board's small spec too); the content is read on demand
    // (codeDesktop/workflow/artifact, server.js).
    case 'artifact-published': {
      const record = isRecord(payload.artifact) ? payload.artifact : null
      const id = text(record?.id)
      if (!id || !ARTIFACT_KINDS.has(record.kind)) return
      const list = (run.artifacts ?? []).filter((entry) => entry.id !== id)
      const before = (run.artifacts ?? []).find((entry) => entry.id === id)
      let spec
      try { spec = record.spec !== undefined && JSON.stringify(record.spec).length <= 8000 ? record.spec : undefined } catch { spec = undefined }
      const entry = { id, kind: record.kind, version: Number.isInteger(record.version) ? record.version : 1, itemCount: before?.itemCount ?? 0,
        ...(text(record.title) ? { title: text(record.title).slice(0, 120) } : before?.title ? { title: before.title } : {}),
        ...(text(record.description) ? { description: text(record.description).slice(0, 500) } : {}),
        ...(text(record.contentType) ? { contentType: text(record.contentType) } : {}),
        ...(Number.isInteger(record.bytes) ? { bytes: record.bytes } : {}),
        ...(text(record.sourcePath) ? { sourcePath: text(record.sourcePath) } : {}),
        ...(spec !== undefined ? { spec } : {}),
        ...(record.primary === true || before?.primary ? { primary: true } : {}) }
      run.artifacts = entry.primary ? [entry, ...list.map((other) => { const { primary, ...rest } = other; return rest })] : [...list, entry]
      return
    }
    case 'report': {
      const id = text(payload.artifactId)
      const entry = id ? (run.artifacts ?? []).find((candidate) => candidate.id === id) : null
      if (entry) run.artifacts = run.artifacts.map((candidate) => candidate === entry ? { ...entry, itemCount: (entry.itemCount ?? 0) + 1 } : candidate)
      return
    }
    // A workflow agent asked the main agent a blocking question and waits for the answer (escalation-raised), until it
    // is answered (escalation-resolved): the run's open questions, and the asking agent marked as waiting.
    case 'escalation-raised': {
      const qid = text(payload.qid), question = text(payload.question)
      if (!qid || !question) return
      const actorKey = refKey(payload.actor)
      const agentName = text(payload.actorName) ?? (actorKey ? state.actors.get(actorKey)?.name : null) ?? null
      run.pendingQuestions = [...(run.pendingQuestions ?? []).filter((entry) => entry.qid !== qid),
        { qid, question: question.slice(0, 4000), ...(text(payload.context) ? { context: text(payload.context).slice(0, 4000) } : {}), ...(agentName ? { agent: agentName } : {}), ...(Number.isFinite(payload.askedAt) ? { askedAt: payload.askedAt } : {}) }]
      for (const agent of run.workflowProgress) {
        if (agent.type === 'workflow_agent' && actorKey && state.agentActors.get(agent.id) === actorKey && (agent.state === 'progress' || agent.state === 'start')) agent.question = question.slice(0, 500)
      }
      return
    }
    case 'escalation-resolved': {
      const qid = text(payload.qid)
      const asked = (run.pendingQuestions ?? []).find((entry) => entry.qid === qid)
      if (!asked) return
      run.pendingQuestions = run.pendingQuestions.filter((entry) => entry.qid !== qid)
      if (!run.pendingQuestions.length) delete run.pendingQuestions
      for (const agent of run.workflowProgress) if (agent.type === 'workflow_agent' && agent.question === asked.question.slice(0, 500)) delete agent.question
      return
    }
    // No model request of the run has succeeded for a while (the provider keeps failing): until one does.
    case 'run-stalled':
      if (run.status === 'running' && Number.isFinite(payload.sinceMs) && payload.sinceMs >= 0) run.stall = { sinceMs: payload.sinceMs, ...(text(payload.reason) ? { reason: text(payload.reason) } : {}), at: time }
      return
    case 'run-settled': {
      // Superseded by a revised run (AmendWorkflow, or the card's Configure): which one carries on.
      if (text(payload.supersededBy)) state.supersededBy = text(payload.supersededBy)
      const status = RUN_STATUS[payload.status] ?? 'failed'
      const summary = text(payload.error?.message) ?? (status === 'stopped' ? STOP_SUMMARY[payload.stopReason] : null) ?? (RUN_STATUS[payload.status] ? undefined : `Workflow ended (${String(payload.status)})`)
      settle(run, status, time, summary ?? undefined)
      if (payload.resumable === true && run.runId && status !== 'completed') run.resumable = true
      return
    }
    default:
      if (NODE_EVENTS.has(type)) nodeEvent(state, run, type, payload, time, live)
  }
}

/**
 * Fold journal events (v4/conversation/workflowRunEvents, any order, repeats ignored by sequence) into the run.
 * live: the bridge watches the run now (its clock times agents). stopAtStart: stop before the run-started that would
 * be the stopAtStart-th (an earlier tool item of a run resumed later shows the run up to that resume).
 * @returns {boolean} whether the run changed
 */
export function applyWorkflowEvents(state, events, { time = Date.now(), live = false, stopAtStart = Infinity } = {}) {
  const list = (Array.isArray(events) ? events : []).filter((event) => Number.isInteger(event?.sequence) && event.sequence > state.cursor && typeof event.type === 'string').sort((a, b) => a.sequence - b.sequence)
  if (!list.length || state.frozen) return false
  const next = cloneRun(state.run)
  for (const event of list) {
    if (event.type === 'run-started' && state.starts + 1 >= stopAtStart) { state.frozen = true; break }
    state.cursor = event.sequence
    applyEvent(state, next, event.type, isRecord(event.payload) ? event.payload : {}, time, live)
  }
  return commit(state, next)
}

/**
 * The run a card follows was replaced by a revised one (the card's Configure: v4 amendWorkflowRunSettings, which goes
 * on as a new run that reuses the finished agents): a fresh state for the new run under the same card, folded from
 * its own journal from here on. The card keeps its name; the sequence keeps rising.
 */
export function workflowReplacement(state, runId, time = Date.now()) {
  const old = state.run
  const run = { ...workflowRunOf({ callId: old.callId, tool: 'CreateWorkflow', input: { name: old.name }, time }), name: old.name, description: old.description, sequence: (old.sequence ?? 0) + 1 }
  const next = workflowState(run)
  bindWorkflowRun(next, runId)
  return next
}

/** The sentence ZCode's settings turn gives GLM (core dynamic-workflow-run-settings-turn.ts buildSettingsMessageText). */
const SETTINGS_TURN = /^Changed the settings of workflow run (\S+?)(?: \("([\s\S]*?)"\))? from the GUI: /
/**
 * A settings turn (the run card's Configure, here or in the ZCode app) as a notice in the app's form (<kind>settings</kind>
 * with the run), not as the user's message; null for any other input.
 */
export function workflowSettingsNotice(input) {
  const match = SETTINGS_TURN.exec(String(input ?? ''))
  if (!match) return null
  let notice = `<task-notification>\n<kind>settings</kind>\n<status>changed</status>\n<task-id>${escapeXml(match[1])}</task-id>`
  if (match[2]) notice += `\n<workflow>${escapeXml(match[2])}</workflow>`
  return `<system-reminder>\n${NOTICE_PREFACE}${notice}\n</task-notification>\n</system-reminder>`
}

/** Name the run (its id from then on is ZCode's run id). */
export function bindWorkflowRun(state, runId) {
  if (typeof runId !== 'string' || !runId || state.run.runId === runId) return false
  const next = cloneRun(state.run)
  next.runId = runId
  next.id = runId
  delete next.stopScope
  return commit(state, next)
}

/**
 * The dispatch tool's own result. A response naming the run binds it (the run keeps going in the background); any
 * other end of the call means no run started (diagnostics, a refused resume, a declined approval, a failed submit).
 * @param {{status: 'completed'|'failed'|'declined'|'interrupted', content?: string|null, error?: string|null}} result
 */
export function applyWorkflowToolResult(state, { status, content = null, error = null }, time = Date.now()) {
  const runId = status === 'completed' ? workflowRunIdOf(content) : null
  if (runId) return bindWorkflowRun(state, runId)
  if (state.run.status !== 'running') return false
  // A run ZCode already named (ResumeWorkflowRun's run_id, a task update) is a background task: it outlives the call.
  if ((status === 'interrupted' || status === 'completed') && state.run.runId) return false
  const firstLine = (value) => text(String(value ?? '').split('\n').map((line) => line.trim()).find(Boolean) ?? null)
  const next = cloneRun(state.run)
  if (status === 'declined') settle(next, 'stopped', time, 'Declined')
  else if (status === 'interrupted') settle(next, 'stopped', time, 'Stopped')
  else settle(next, 'failed', time, (firstLine(error) ?? firstLine(content) ?? 'The workflow didn’t start.').slice(0, 300))
  return commit(state, next)
}

/**
 * A run summary (v4/conversation/workflowRuns: {runId, toolCallId, label, status, stopReason, failureMessage,
 * updatedAt}): the run's label, and its end when the journal has not settled it (a run reconciled after ZCode exited).
 */
export function applyWorkflowSummary(state, summary, time = Date.now()) {
  if (!isRecord(summary)) return false
  const next = cloneRun(state.run)
  if (text(summary.runId) && !next.runId) { next.runId = text(summary.runId); next.id = next.runId; delete next.stopScope }
  const label = text(summary.label)
  if (label && label !== next.runId && next.name === 'workflow') { next.name = label; next.description = label }
  const status = RUN_STATUS[summary.status]
  if (status && next.status === 'running') {
    const at = Number.isFinite(summary.updatedAt) ? summary.updatedAt : time
    settle(next, status, at, text(summary.failureMessage) ?? (status === 'stopped' ? STOP_SUMMARY[summary.stopReason] : undefined))
  }
  // ZCode's resume gate (cancelled, or failed as interrupted): the summary says whether this settled run can resume.
  if (next.status !== 'running' && next.status !== 'completed' && typeof summary.resumable === 'boolean' && next.runId) {
    if (summary.resumable) next.resumable = true
    else delete next.resumable
  }
  return commit(state, next)
}

/**
 * codeDesktop/workflow/resume accepted (v4/command resumeWorkflowRun): the settled run is live again under the same run
 * id (ZCode resumes it from its journal), so it is polled until its new end. False when it is already running.
 */
export function applyWorkflowResumed(state) {
  if (state.run.status === 'running') return false
  const next = cloneRun(state.run)
  reopen(next)
  state.taskEnded = null
  return commit(state, next)
}

/** The run's background task ended (BackgroundTask completed / cancelled / failed …) and its journal never settled it. */
export function applyWorkflowTaskEnd(state, taskStatus, time = Date.now()) {
  if (state.run.status !== 'running') return false
  const status = taskStatus === 'completed' ? 'completed' : taskStatus === 'cancelled' ? 'stopped' : 'failed'
  return commit(state, settle(cloneRun(state.run), status, time, status === 'failed' ? `The workflow ${String(taskStatus ?? 'ended')}` : undefined))
}

/** ZCode stopped while the run was live: the run ended with it (ZCode reconciles it as interrupted). */
export function applyWorkflowInterrupted(state, time = Date.now(), summary = STOP_SUMMARY.interrupted) {
  if (state.run.status !== 'running') return false
  return commit(state, settle(cloneRun(state.run), 'failed', time, summary))
}

/**
 * The one card a run asks for outside Bypass permissions (server.js askPermission). ZCode asks before every run
 * (CreateWorkflow's permission is alwaysAsk) and then runs the workflow's agents without asking, so this consent
 * covers the whole run; declining it starts nothing.
 */
export const WORKFLOW_RUN_APPROVAL_REASON = 'Run this workflow? Its agents will run without asking for approval.'

const MAX_SUMMARY = 2000

/** The end index of the bracketed literal opening at `start` (`{` or `[`), skipping strings and comments; -1 if unclosed. */
function literalEnd(source, start) {
  const open = source[start]
  const close = open === '{' ? '}' : ']'
  const stack = [close]
  for (let index = start + 1; index < source.length; index++) {
    const char = source[index]
    if (char === '"' || char === "'" || char === '`') {
      for (index++; index < source.length && source[index] !== char; index++) if (source[index] === '\\') index++
      continue
    }
    if (char === '/' && source[index + 1] === '/') { const end = source.indexOf('\n', index); if (end < 0) return -1; index = end; continue }
    if (char === '/' && source[index + 1] === '*') { const end = source.indexOf('*/', index + 2); if (end < 0) return -1; index = end + 1; continue }
    if (char === '{') stack.push('}')
    else if (char === '[') stack.push(']')
    else if (char === stack.at(-1)) { stack.pop(); if (!stack.length) return index }
  }
  return -1
}

const QUOTES = new Set(['"', "'", '`'])
/** The index just past the string literal opening at `start`. */
function stringEnd(source, start) {
  let index = start + 1
  for (; index < source.length && source[index] !== source[start]; index++) if (source[index] === '\\') index++
  return index + 1
}
/** The index just past a comment starting at `index`, or `index` when none starts there. */
function commentEnd(source, index, end) {
  if (source[index] !== '/') return index
  if (source[index + 1] === '/') { const next = source.indexOf('\n', index); return next < 0 ? end : next + 1 }
  if (source[index + 1] === '*') { const next = source.indexOf('*/', index + 2); return next < 0 ? end : next + 2 }
  return index
}
/** Where the value starting at `index` ends: the next top-level comma (strings, comments and brackets skipped). */
function valueEnd(source, index, end) {
  let depth = 0
  while (index < end) {
    const char = source[index]
    if (QUOTES.has(char)) { index = stringEnd(source, index); continue }
    const after = commentEnd(source, index, end)
    if (after !== index) { index = after; continue }
    if ('{[('.includes(char)) depth++
    else if ('}])'.includes(char)) depth--
    else if (char === ',' && depth === 0) break
    index++
  }
  return index
}
/** An object or array literal's own entries as [{key, value}] (key null in an array; value its source text). */
function entriesOf(literal) {
  const entries = []
  const end = literal.length - 1
  const object = literal[0] === '{'
  let index = 1
  while (index < end) {
    const skipped = commentEnd(literal, index, end)
    if (skipped !== index) { index = skipped; continue }
    if (/[\s,]/.test(literal[index])) { index++; continue }
    let key = null
    if (object) {
      if (QUOTES.has(literal[index])) { const close = stringEnd(literal, index); key = literal.slice(index + 1, close - 1); index = close }
      else { const word = /^[A-Za-z_$][\w$]*/.exec(literal.slice(index)); if (!word) return entries; key = word[0]; index += key.length }
      while (index < end && /\s/.test(literal[index])) index++
      // A shorthand property, a method or a spread: no literal value to read.
      if (literal[index] !== ':') { index = valueEnd(literal, index, end); continue }
      index++
      while (index < end && (/\s/.test(literal[index]) || commentEnd(literal, index, end) !== index)) index = /\s/.test(literal[index]) ? index + 1 : commentEnd(literal, index, end)
    }
    const from = index
    index = valueEnd(literal, index, end)
    entries.push({ key, value: literal.slice(from, index).trim() })
  }
  return entries
}
/** A value's string literal (trimmed), or null when it is not one. */
function stringOf(value) {
  if (!value || !QUOTES.has(value[0])) return null
  const close = stringEnd(value, 0)
  return value.slice(1, close - 1).replace(/\\(.)/g, '$1').trim() || null
}
const fieldOf = (entries, key) => entries.find((entry) => entry.key === key)?.value ?? null
/** The phase names of a meta `phases` array: its strings, or its objects' title / name. */
function phaseNames(value) {
  if (!value?.startsWith('[') || literalEnd(value, 0) < 0) return []
  return entriesOf(value.slice(0, literalEnd(value, 0) + 1)).map(({ value: entry }) => {
    if (!entry.startsWith('{')) return stringOf(entry)
    const close = literalEnd(entry, 0)
    if (close < 0) return null
    const fields = entriesOf(entry.slice(0, close + 1))
    return stringOf(fieldOf(fields, 'title')) ?? stringOf(fieldOf(fields, 'name'))
  }).filter(Boolean)
}
const PHASE_CALL = /\bphase\s*\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\$])*)`)/g

/**
 * What a run's approval card shows (best effort; the script is never evaluated): the script's `export const meta`
 * name, description and phases (else its phase("…") calls), or the tool and its input, truncated.
 */
export function workflowApprovalSummary(toolName, input) {
  const args = isRecord(input) ? input : {}
  const script = typeof args.script === 'string' ? args.script : ''
  let name = text(args.name)
  let description = null
  let phases = []
  const meta = /export\s+const\s+meta\s*(?::[^=]*)?=\s*/.exec(script)
  if (meta) {
    const start = meta.index + meta[0].length
    const end = script[start] === '{' ? literalEnd(script, start) : -1
    if (end > start) {
      const fields = entriesOf(script.slice(start, end + 1))
      name = stringOf(fieldOf(fields, 'name')) ?? name
      description = stringOf(fieldOf(fields, 'description'))
      phases = phaseNames(fieldOf(fields, 'phases'))
    }
  }
  if (!phases.length && script) {
    for (const match of script.matchAll(PHASE_CALL)) {
      const phase = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\\(.)/g, '$1').trim()
      if (phase && !phases.includes(phase)) phases.push(phase)
    }
  }
  const saved = text(isRecord(args.saved) ? args.saved.name : args.saved) ?? text(args.path)
  const runId = text(args.run_id)
  if (!name && !saved && !description && !phases.length && !runId) {
    const raw = JSON.stringify(args)
    return `${toolName} ${raw.length > MAX_SUMMARY ? `${raw.slice(0, MAX_SUMMARY)}…` : raw}`
  }
  const lines = [name || saved ? `${toolName}: ${name ?? saved}` : toolName]
  if (description) lines.push(description)
  if (phases.length) lines.push(`Phases: ${phases.join(' → ')}`)
  if (runId) lines.push(`Run: ${runId}`)
  const summary = lines.join('\n')
  return summary.length > MAX_SUMMARY ? `${summary.slice(0, MAX_SUMMARY)}…` : summary
}

/**
 * The run tools whose card offers 'Allow for this session' (ZCode's askOptions allowAlways 'session':
 * create-workflow.ts, amend-workflow.ts): after the user has read and allowed one script, later calls of the same
 * tool in the session run without a card. ResumeWorkflowRun declares no such option, so each resume still asks.
 */
export const WORKFLOW_SESSION_GRANT_TOOLS = Object.freeze(['CreateWorkflow', 'AmendWorkflow'])

// ------------------------------------------------------------------ the finished run's notification turn

// OpenClaude Desktop's system-notification preface (app/electron/workflow-reminders.mjs): the app shows a user message that
// starts with it and holds a <task-notification> as the transcript's 'Background workflow …' row, not as user text
// (app/electron/prefs/workflow-keyword.mjs workflowNotificationSummary).
const NOTICE_PREFACE = '[SYSTEM NOTIFICATION - NOT USER INPUT]\nThis is an automated background-task event, NOT a message from the user.\n\n'
const NOTICE_STATUS = { completed: 'completed', failed: 'failed', errored: 'failed', killed: 'stopped', stopped: 'stopped', cancelled: 'stopped' }
const ENTITIES = { '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' }
const unescapeXml = (value) => value.replace(/&(?:quot|#39|apos|lt|gt|amp);/g, (entity) => ENTITIES[entity])
const escapeXml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tagOf = (block, name) => {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block)
  return match ? unescapeXml(match[1]).trim() || null : null
}

/**
 * The notices of a turn ZCode starts by itself to hand GLM a finished run's result (input source 'background_task',
 * inputPresentation task_notification; the turn has no prompt of the user's), each as the text of a userMessage in
 * OpenClaude Desktop's own notification form (app/electron/workflow-tool-model.mjs workflowTaskNotification), so the app shows
 * the 'Background workflow completed · {name} · took {elapsed}' row its own engine shows there.
 *
 *   input       the turn's input: one <task-notification> per finished task (ZCode batches several into one turn);
 *               a workflow's summary reads `Workflow "<name>" completed.` with ZCode's XML escaping (&quot;)
 *   originMeta  ZCode's structured notification (backgroundSource 'workflow', title, workId, workflowNotification
 *               {kind 'terminal', status completed|errored|stopped, error, durationMs}); a batch carries none
 *
 * A workflow agent's blocking question (<workflow-escalation>, runtime-task/workflow-notification-copy.ts) and a run's
 * stall (<workflow-stall>: no model request succeeded for a while) are notices of their own kinds (<kind>escalation</kind>
 * with the agent, run, question and context; <kind>stall</kind> with how long), shown as their own rows.
 * A background command's or sub-agent's result gives none.
 * @returns {string[]}
 */
export function workflowNotices(input, originMeta = null) {
  const value = String(input ?? '')
  const blocks = [...value.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/g)].map((match) => match[1])
  const special = []
  for (const [, block] of value.matchAll(/<workflow-escalation>([\s\S]*?)<\/workflow-escalation>/g)) {
    const question = tagOf(block, 'question')
    if (!question) continue
    let notice = `<task-notification>\n<kind>escalation</kind>\n<status>question</status>`
    for (const [tag, name] of [['run-id', 'task-id'], ['run', 'workflow'], ['question-id', 'question-id'], ['subagent', 'agent']]) {
      const found = tagOf(block, tag)
      if (found) notice += `\n<${name}>${escapeXml(found)}</${name}>`
    }
    notice += `\n<question>${escapeXml(question)}</question>`
    const context = tagOf(block, 'context')
    if (context) notice += `\n<context>${escapeXml(context)}</context>`
    special.push(`<system-reminder>\n${NOTICE_PREFACE}${notice}\n</task-notification>\n</system-reminder>`)
  }
  for (const [, block] of value.matchAll(/<workflow-stall>([\s\S]*?)<\/workflow-stall>/g)) {
    const since = Number(tagOf(block, 'since-ms'))
    let notice = `<task-notification>\n<kind>stall</kind>\n<status>stalled</status>`
    for (const [tag, name] of [['run-id', 'task-id'], ['run', 'workflow'], ['dominant-reason', 'reason']]) {
      const found = tagOf(block, tag)
      if (found) notice += `\n<${name}>${escapeXml(found)}</${name}>`
    }
    if (Number.isFinite(since) && since >= 0) notice += `\n<stalled_ms>${Math.round(since)}</stalled_ms>`
    special.push(`<system-reminder>\n${NOTICE_PREFACE}${notice}\n</task-notification>\n</system-reminder>`)
  }
  const meta = isRecord(originMeta) && originMeta.backgroundSource === 'workflow' ? originMeta : null
  const notices = []
  for (const block of blocks) {
    const summary = tagOf(block, 'summary') ?? ''
    const named = /^Workflow "([\s\S]*?)" /.exec(summary)
    const single = blocks.length === 1 && !!meta
    if (!named && !single) continue
    const terminal = single && isRecord(meta.workflowNotification) && meta.workflowNotification.kind === 'terminal' ? meta.workflowNotification : null
    const status = NOTICE_STATUS[terminal?.status] ?? NOTICE_STATUS[tagOf(block, 'status')]
    if (!status) continue
    const name = tagOf(block, 'description') ?? named?.[1] ?? (single ? text(meta.title) : null) ?? 'Dynamic workflow'
    const error = text(terminal?.error) ?? (summary.replace(/^Workflow "[\s\S]*?" /, '').replace(/\.$/, '').trim() || 'Unknown error')
    const said = status === 'completed' ? `Dynamic workflow "${name}" completed` : status === 'failed' ? `Dynamic workflow "${name}" failed: ${error}` : `Dynamic workflow "${name}" was stopped`
    const taskId = tagOf(block, 'task-id') ?? (single ? text(meta.workId) : null)
    const durationMs = Number(terminal?.durationMs)
    let notice = '<task-notification>'
    if (taskId) notice += `\n<task-id>${escapeXml(taskId)}</task-id>`
    notice += `\n<status>${status}</status>\n<summary>${escapeXml(said)}</summary>`
    if (terminal && Number.isFinite(durationMs) && durationMs >= 0) notice += `\n<usage><duration_ms>${Math.round(durationMs)}</duration_ms></usage>`
    notices.push(`<system-reminder>\n${NOTICE_PREFACE}${notice}\n</task-notification>\n</system-reminder>`)
  }
  return [...notices, ...special]
}

/** workflowNotices as userMessage items: the turn's input message id, then `<id>#n<i>` for each further run it names. */
export function workflowNoticeItems(messageId, input, originMeta = null) {
  if (!messageId) return []
  const settings = workflowSettingsNotice(input)
  return (settings ? [settings] : workflowNotices(input, originMeta)).map((notice, index) => ({
    type: 'userMessage', id: index ? `${messageId}#n${index}` : messageId, clientId: null, content: [{ type: 'text', text: notice, text_elements: [] }],
  }))
}
