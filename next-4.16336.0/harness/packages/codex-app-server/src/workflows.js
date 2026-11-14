/**
 * Model-initiated dynamic workflows: the Harness `workflow` tool
 * (dsh-tool-workflow over dsh-workflow-ptc) → OpenClaude Desktop workflow runs.
 *
 * The tool call stays a Codex dynamicToolCall item; the bridge adds
 * `workflowRun` (a bridge field) in the app's own run shape
 * (app/src/workflow-progress-model.mjs: workflow_phase / workflow_agent
 * progress entries), so the transcript row and the Tasks card render it like
 * a run the user started with /workflow.
 *
 *   tool/call workflow              run 'running', declared meta.phases listed
 *   tool-workflow/run-start         the engine's run id (durable record)
 *   tool-workflow/phase             durable phase identity and child grouping
 *   tool-workflow/agent-start|end   one agent() member (durable records)
 *   tool-workflow/run-end           completed / stopped / failed (durable)
 *   tool/result                     foreground errors; a background run's job id
 *
 * Durable records replay with the session log, so a resumed session shows the
 * same run with execution-assigned phase and agent identities.
 */

import { parseClaudeCodeScript, parseClaudeWorkflowScript } from '@deepseek-ai/dsh-tool-workflow'

/** The model-facing tool name (dsh-tool-workflow `toolName`, default config). */
export const WORKFLOW_TOOL = 'Workflow'
/** Canonical tool, callable native alias, and older logged Harness calls. */
export const isWorkflowTool = name => ['Workflow', 'RunWorkflow', 'workflow'].includes(name)

const RECORD_TYPES = new Set(['tool-workflow/run-start', 'tool-workflow/phase', 'tool-workflow/agent-admission', 'tool-workflow/agent-start', 'tool-workflow/agent-progress', 'tool-workflow/agent-end', 'tool-workflow/run-end'])
export const isWorkflowRecord = (type) => RECORD_TYPES.has(type)

// dsh-tool-workflow's background acceptance text (README "Tool-call history and result").
const BACKGROUND_JOB = /(?:started in the background as job (\S+?)\.(?:\s|$)|Workflow launched in background\. Task ID: (\S+))/u
const STOP_STATUS = { completed: 'completed', cancelled: 'stopped', error: 'failed' }
// A member the user skipped ends 'failed' with the 'skipped by user' diagnostic;
// members still live when the run settles end 'cancelled' (dsh-workflow-ptc's
// own output marks both 'skipped'). The app shows them as Skipped, not failed.
const AGENT_STATE = { completed: 'done', failed: 'error', cancelled: 'skipped' }
const AGENT_ERROR = { failed: 'Agent failed' }
const SKIPPED = 'skipped by user'

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

function clone(run) {
  return { ...run, sequence: (run.sequence ?? 0) + 1, workflowProgress: (run.workflowProgress ?? []).map((entry) => ({ ...entry })) }
}

// Legacy title-only records get fallback indices; current records retain execution identity.
function phaseOf(progress, title, details = {}) {
  let found = progress.findLast((entry) => entry.type === 'workflow_phase' && entry.title === title)
  if (!found) {
    found = { type: 'workflow_phase', index: details.index ?? (Math.max(0, ...progress.filter((entry) => entry.type === 'workflow_phase').map(entry => entry.index)) + 1), title, ...(details.kind ? { kind: details.kind } : {}) }
    progress.push(found)
  }
  if (Number.isInteger(details.index) && found.index !== details.index) {
    for (const agent of progress) if (agent.type === 'workflow_agent' && agent.phaseIndex === found.index && agent.phaseTitle === title) agent.phaseIndex = details.index
    found.index = details.index
  }
  if (details.kind) found.kind = details.kind
  return found
}

function withUsage(run) {
  run.usage = { totalTokens: run.workflowProgress.reduce((sum, entry) => sum + (entry.tokens || 0), 0) }
  return run
}

/**
 * The run a `workflow` tool call starts. Until the engine names it
 * (run-start) its id is the call's, so the app can address it at once.
 * @param {any} args - the tool call's parsed arguments ({meta, script, args?, run_in_background?})
 */
export function workflowRunOf(args, callId, time) {
  let meta = args?.meta && typeof args.meta === 'object' ? args.meta : {}
  if (typeof args?.script === 'string' && !args?.scriptPath && !args?.name) {
    try { meta = (args?.meta ? parseClaudeCodeScript(args.script) : parseClaudeWorkflowScript(args.script)).meta ?? meta }
    catch { /* Invalid model input is reported by the tool, not the transcript projection. */ }
  }
  const name = text(meta.name) ?? text(args?.name) ?? 'workflow'
  const run = {
    id: `call-${callId}`,
    source: 'model',
    callId,
    runId: null,
    name,
    ...(typeof meta.title === 'string' && meta.title.length ? { title: meta.title } : {}),
    description: text(meta.description) ?? name,
    status: 'running',
    startedAt: time,
    background: args?.run_in_background === true || (args?.run_in_background !== false && !args?.meta),
    // codeDesktop/workflow/member skips/retries this run's agents (engine controlMember).
    memberControls: true,
    sequence: 1,
    workflowProgress: [],
  }
  for (const phase of Array.isArray(meta.phases) ? meta.phases : []) {
    if (typeof phase?.title === 'string') phaseOf(run.workflowProgress, phase.title)
  }
  return withUsage(run)
}

/**
 * The one card a model workflow asks for outside Bypass (index.js tools/pre-execute): OpenClaude Desktop's "Run a dynamic
 * workflow?" (Claude Code 2.1.280 WorkflowPermissionDialog). Every mode but Bypass asks, Auto and Accept edits
 * included, since a run fans out many paid agents; declining it starts nothing.
 */
export const WORKFLOW_APPROVAL_REASON = 'Run a dynamic workflow? It runs many agents in parallel, which can use a lot of tokens quickly.'

/** The card's command text: the workflow's name, description, phases and arguments (from the call's script or name). */
export function workflowApprovalCommand(args) {
  const run = workflowRunOf(args, 'approval', 0)
  const phases = run.workflowProgress.filter((entry) => entry.type === 'workflow_phase').map((entry) => entry.title)
  const lines = [`Workflow: ${run.name}`]
  if (run.description && run.description !== run.name) lines.push(run.description)
  if (phases.length) lines.push(`Phases: ${phases.join(' → ')}`)
  if (args && typeof args === 'object' && args.args !== undefined) {
    let value
    try { value = JSON.stringify(args.args) } catch { value = String(args.args) }
    if (typeof value === 'string') lines.push(`Arguments: ${value.length > 400 ? `${value.slice(0, 400)}…` : value}`)
  }
  const command = lines.join('\n')
  return command.length > 2000 ? `${command.slice(0, 2000)}…` : command
}

/** A phase() call. */
export function workflowPhase(run, title, time) {
  if (typeof title !== 'string' || run.status !== 'running') return run
  const next = clone(run)
  const phase = phaseOf(next.workflowProgress, title)
  next.currentPhase = phase.index
  return withUsage(next)
}

/** One durable `tool-workflow/*` record. */
export function workflowRecord(run, type, data, time) {
  const next = clone(run)
  const progress = next.workflowProgress
  const agents = progress.filter((entry) => entry.type === 'workflow_agent')
  switch (type) {
    case 'tool-workflow/run-start':
      if (typeof data?.runId === 'string' && data.runId) {
        next.runId = data.runId
        next.attemptId = text(data.attemptId) ?? null
        next.id = next.attemptId ?? data.runId
      }
      if (text(data?.name)) next.name = text(data.name)
      if (typeof data?.title === 'string') next.title = data.title
      if (text(data?.description)) next.description = text(data.description)
      if (text(data?.scriptPath)) next.scriptPath = text(data.scriptPath)
      for (const title of Array.isArray(data?.phases) ? data.phases : []) if (typeof title === 'string') phaseOf(progress, title)
      break
    case 'tool-workflow/phase':
      if (typeof data?.title === 'string') next.currentPhase = phaseOf(progress, data.title, data).index
      break
    case 'tool-workflow/agent-admission':
    case 'tool-workflow/agent-start': {
      const id = String(data?.seq ?? agents.length + 1)
      const existing = agents.find((agent) => agent.id === id)
      if (existing && existing.state !== 'start') break
      const admission = type === 'tool-workflow/agent-admission'
      const group = typeof data?.phase === 'string' ? phaseOf(progress, data.phase, { index: data.phaseIndex }) : undefined
      const fields = {
        type: 'workflow_agent', index: data?.seq ?? agents.length + 1, id, label: typeof data?.label === 'string' ? data.label : 'Agent', state: admission ? (data.state === 'failed' ? 'error' : 'start') : 'progress',
        ...(group ? { phaseIndex: group.index, phaseTitle: group.title } : {}),
        ...(typeof data?.childId === 'string' ? { childId: data.childId } : {}),
        ...(admission ? {queuedAt:data.queuedAt,lastProgressAt:data.lastProgressAt,...data.error===undefined?{}:{error:data.error},...data.promptPreview===undefined?{}:{promptPreview:data.promptPreview}} : data?.cached === true ? { cached: true } : { startedAt: time, lastProgressAt: time }),
        ...(text(data?.model) ? { model: text(data.model) } : {}),
        ...(typeof data?.progressSupported === 'boolean' ? { progressSupported: data.progressSupported } : {}),
      }
      if (existing) Object.assign(existing, fields)
      else progress.push(fields)
      break
    }
    case 'tool-workflow/agent-progress': {
      const agent = agents.find((candidate) => candidate.id === String(data?.seq))
      if (!agent || agent.state !== 'progress') return run
      for (const key of ['lastProgressAt', 'tokens', 'outputTokens', 'toolCalls', 'activeTools', 'attempt', 'retryAt']) {
        if (Number.isFinite(data?.[key]) && data[key] >= 0) agent[key] = data[key]
      }
      for (const key of ['lastToolName', 'lastToolSummary', 'model', 'childId']) if (text(data?.[key])) agent[key] = text(data[key])
      if (text(data?.lastToolName) && !text(data?.lastToolSummary)) delete agent.lastToolSummary
      break
    }
    case 'tool-workflow/agent-end': {
      const agent = agents.find((candidate) => candidate.id === String(data?.seq))
      if (!agent || agent.state !== 'progress') break
      agent.state = data?.error === SKIPPED ? 'skipped' : AGENT_STATE[data?.outcome] ?? 'error'
      if (agent.state === 'error') agent.error = text(data?.error) ?? AGENT_ERROR[data?.outcome] ?? 'Agent failed'
      if (Number.isFinite(data?.tokens) && data.tokens >= 0) agent.tokens = data.tokens
      if (Number.isFinite(data?.outputTokens) && data.outputTokens >= 0) agent.outputTokens = data.outputTokens
      if (Number.isFinite(data?.durationMs) && data.durationMs >= 0) agent.durationMs = data.durationMs
      else if (!agent.cached && Number.isFinite(agent.startedAt)) agent.durationMs = Math.max(0, time - agent.startedAt)
      break
    }
    case 'tool-workflow/run-end':
      return settle(next, STOP_STATUS[data?.stopReason] ?? 'failed', time, text(data?.error) ?? run.summary)
    default:
      return run
  }
  return withUsage(next)
}

/**
 * The tool's own result. Foreground: a failure settles the run with the
 * tool's error text (run-end may never come when the run could not start).
 * Background: the acceptance names the job the Stop control kills.
 */
export function workflowToolResult(run, { isError, text: output }, time) {
  if (!isError) {
    const job = BACKGROUND_JOB.exec(output ?? '')
    if (!job) return run
    const next = clone(run)
    next.background = true
    next.jobId = job[1] ?? job[2]
    return withUsage(next)
  }
  const message = text(output)?.replace(/^Error:\s*/u, '') ?? 'Workflow failed'
  if (run.status !== 'running') return run.summary ? run : { ...run, summary: message }
  const stopped = /\bcancelled\b/u.test(message)
  return settle(clone(run), stopped ? 'stopped' : 'failed', time, message)
}

/** The tool call ended without a result (turn interrupted, session restarted). */
export function workflowInterrupted(run, time) {
  if (run.status !== 'running' || run.background) return run
  return settle(clone(run), 'stopped', time, 'Stopped')
}

function settle(run, status, time, summary) {
  run.status = status
  run.completedAt = time
  run.durationMs = Number.isFinite(run.startedAt) ? Math.max(0, time - run.startedAt) : undefined
  if (status !== 'completed') run.summary = summary ?? (status === 'stopped' ? 'Stopped' : 'Workflow failed')
  // A stopped or failed model run with a saved script goes on from the engine's cache (Workflow resumeFromRunId:
  // completed agent calls return their cached results): the card's Resume (codeDesktop/workflow/resume, index.js).
  if (status !== 'completed' && run.source === 'model' && /^wf_[a-z0-9-]{6,}$/u.test(run.runId ?? '') && text(run.scriptPath)) run.resumable = true
  for (const entry of run.workflowProgress) {
    if (entry.type !== 'workflow_agent' || entry.state !== 'progress') continue
    entry.state = 'error'
    entry.error = status === 'stopped' ? 'Stopped before completion' : 'Workflow ended before completion'
  }
  return withUsage(run)
}
