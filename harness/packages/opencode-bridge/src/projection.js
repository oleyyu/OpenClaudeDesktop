/**
 * OpenCode session history → Codex turns and items, and live SSE events →
 * Codex notifications.
 *
 *   thread           OpenCode session (ses_…)
 *   turn             one user message (its id) and every assistant message whose
 *                    parentID is it; a steered message (turn/steer) and OpenCode's
 *                    synthetic user messages (plan_exit's "Execute the plan") join the
 *                    turn that was running
 *   userMessage      the user message's parts (or the Codex input the bridge remembered)
 *   agentMessage     text part              reasoning   reasoning part
 *   commandExecution bash, and read/glob/grep/list as file-tool rows (commandActions)
 *   imageView        view_image (MiMo), or a read that returned an image, once it completed
 *   fileChange       edit / write / apply_patch / multiedit / notebook_edit (unified diffs)
 *   mcpToolCall      <server>_<tool> of a configured MCP server
 *   webSearch        webfetch / websearch / codesearch
 *   collabAgentToolCall  task (OpenCode) / actor spawn|run (MiMo): the child session
 *                    is a spawned thread (parentThreadId)
 *   dynamicToolCall  everything else (todowrite as todo_write, question as
 *                    ask_user_question, plan_exit as exit_plan_mode, skill …)
 *   exec (MiMo)      on GPT models MiMo offers only `exec` (a script calling tools): the
 *                    script is a dynamicToolCall `exec`, and each tool it called (its
 *                    metadata.sub_parts) is an item of its own, id `<part id>:<seq>`
 *   contextCompaction  a compaction part (thread/compact/start, auto-compaction)
 *   enteredReviewMode / exitedReviewMode  a review/start turn (the bridge marks it)
 */
import path from 'node:path'
import { SESSION_ARG } from './app-tools.js'

const seconds = (ms) => (Number.isFinite(ms) ? Math.floor(ms / 1000) : null)
const EDIT_TOOLS = new Set(['edit', 'write', 'apply_patch', 'patch', 'multiedit', 'notebook_edit'])
const SEARCH_TOOLS = new Set(['grep', 'glob', 'codesearch_local'])
const WEB_TOOLS = new Set(['webfetch', 'websearch', 'codesearch'])
const RENAMED = { todowrite: 'todo_write', question: 'ask_user_question', plan_exit: 'exit_plan_mode' }
const DEFAULT_TITLES = [/^New session - \d{4}-\d\d-\d\dT/, /^Untitled$/, /^Child session - /]

export const isDefaultTitle = (title) => typeof title !== 'string' || !title.trim() || DEFAULT_TITLES.some((pattern) => pattern.test(title))
const str = (value) => (typeof value === 'string' ? value : null)

/** A tool input field under its camelCase (OpenCode) or snake_case (MiMo) name. */
const field = (input, ...names) => {
  for (const name of names) if (input && input[name] !== undefined && input[name] !== null) return input[name]
  return undefined
}

/**
 * OpenCode token counts → Codex TokenUsageBreakdown. OpenCode counts reasoning apart from output; Codex's outputTokens
 * includes it (reasoningOutputTokens is the thinking part), as the other cores report it and Usage (usage.js) counts it.
 */
export function tokenBreakdown(tokens) {
  const input = tokens?.input ?? 0
  const read = tokens?.cache?.read ?? 0
  const write = tokens?.cache?.write ?? 0
  const output = tokens?.output ?? 0
  const reasoning = tokens?.reasoning ?? 0
  const inputTokens = input + read + write
  return { totalTokens: tokens?.total ?? inputTokens + output + reasoning, inputTokens, cachedInputTokens: read, cacheWriteInputTokens: write, outputTokens: output + reasoning, reasoningOutputTokens: reasoning }
}

export function addBreakdown(total, add) {
  for (const key of Object.keys(add)) total[key] = (total[key] ?? 0) + add[key]
  return total
}

export const emptyBreakdown = () => ({ totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 })

/** A unified diff for content written to a new file. */
export function addedFileDiff(file, content) {
  const lines = String(content ?? '').split('\n')
  if (lines.at(-1) === '') lines.pop()
  return `--- /dev/null\n+++ ${file}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => `+${line}`).join('\n')}\n`
}

function errorText(state) {
  const text = typeof state?.error === 'string' ? state.error : state?.error?.message ?? null
  // OpenCode's DeniedError appends the whole matching ruleset as JSON (permission/index.ts): the sentence alone is shown.
  return typeof text === 'string' ? text.replace(/\s*Here are some of the relevant rules\s*[[{][\s\S]*$/, '') : text
}
const declined = (state) => /reject|denied|permission|dismissed|declin/i.test(errorText(state) ?? '') && /user|permission|rule/i.test(errorText(state) ?? '')

function statusOf(state, { failed = 'failed' } = {}) {
  if (state?.status === 'completed') return 'completed'
  if (state?.status === 'error') return declined(state) ? (failed === 'failed' ? 'failed' : 'declined') : 'failed'
  return 'inProgress'
}

function durationOf(state) {
  const start = state?.time?.start
  const end = state?.time?.end
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null
}

function changesOf(tool, input, metadata, cwd, askDiff) {
  const abs = (file) => (typeof file === 'string' && file && !path.isAbsolute(file) && cwd ? path.resolve(cwd, file) : file)
  if (Array.isArray(metadata?.files) && metadata.files.length) {
    return metadata.files.map((file) => ({
      path: abs(file.movePath ?? file.filePath ?? file.relativePath),
      kind: file.type === 'add' ? { type: 'add' } : file.type === 'delete' ? { type: 'delete' } : { type: 'update', move_path: file.movePath ? abs(file.movePath) : null },
      diff: typeof file.patch === 'string' ? file.patch : file.diff ?? '',
    }))
  }
  const file = abs(field(input, 'filePath', 'file_path', 'path', 'notebook_path'))
  if (tool === 'write') {
    const exists = metadata?.exists === true
    const diff = str(metadata?.diff) ?? askDiff ?? (exists ? '' : addedFileDiff(file, field(input, 'content')))
    return file ? [{ path: file, kind: exists ? { type: 'update', move_path: null } : { type: 'add' }, diff }] : []
  }
  const diff = str(metadata?.diff) ?? str(metadata?.filediff?.patch) ?? askDiff
  if (!file) return []
  if (diff === null || diff === undefined) {
    const before = field(input, 'oldString', 'old_string')
    const after = field(input, 'newString', 'new_string')
    const synthetic = typeof after === 'string' ? `--- ${file}\n+++ ${file}\n@@ @@\n${String(before ?? '').split('\n').map((line) => `-${line}`).join('\n')}\n${after.split('\n').map((line) => `+${line}`).join('\n')}\n` : ''
    return [{ path: file, kind: { type: 'update', move_path: null }, diff: synthetic }]
  }
  return [{ path: file, kind: { type: 'update', move_path: null }, diff }]
}

// exec's script-only aliases (tool-script-ref.ts TOOL_SCRIPT_ALIASES).
const EXEC_ALIASES = { exec_command: 'bash' }

/** MiMo's `exec` script tool (tool/tool-script.ts): its nested calls live in state.metadata.sub_parts. */
export const isExecScript = (part) => part?.type === 'tool' && part.tool === 'exec' && (typeof part.state?.input?.code === 'string' || part.state?.metadata?.exec_schema !== undefined)

/**
 * An exec part's nested tool calls as tool parts of their own (id `<exec part id>:<seq>`, the nested
 * callID kept), in call order. MiMo republishes them while the script runs.
 */
export function execSubParts(part) {
  const subs = part?.state?.metadata?.sub_parts
  if (!Array.isArray(subs)) return []
  const seen = new Set()
  const out = []
  for (const sub of subs) {
    if (!sub || typeof sub !== 'object' || !Number.isInteger(sub.seq) || typeof sub.tool !== 'string' || !sub.tool || seen.has(sub.seq)) continue
    seen.add(sub.seq)
    out.push({
      id: `${part.id}:${sub.seq}`, type: 'tool', tool: EXEC_ALIASES[sub.tool] ?? sub.tool, callID: typeof sub.callID === 'string' ? sub.callID : `${part.callID}:${sub.seq}`,
      sessionID: part.sessionID, messageID: part.messageID, state: sub.state && typeof sub.state === 'object' ? sub.state : {}, execPartId: part.id, seq: sub.seq,
    })
  }
  return out.sort((a, b) => a.seq - b.seq)
}

/** The exec script itself: a tool row whose outcome is the script's (a code error fails it). */
function execItem(part) {
  const state = part.state ?? {}
  const metadata = state.metadata ?? {}
  const done = state.status === 'completed' || state.status === 'error'
  const outcome = typeof metadata.status === 'string' ? metadata.status : null
  const failed = state.status === 'error' || (state.status === 'completed' && outcome !== null && outcome !== 'completed')
  const output = typeof state.output === 'string' ? state.output : errorText(state)
  return {
    type: 'dynamicToolCall', id: part.id, namespace: null, tool: 'exec', arguments: { code: state.input?.code ?? '' },
    status: done ? (failed ? 'failed' : 'completed') : 'inProgress',
    contentItems: done ? [{ type: 'inputText', text: output ?? '' }] : null, success: done ? !failed : null, durationMs: durationOf(state),
    ...(typeof state.title === 'string' && state.title ? { title: state.title } : {}),
  }
}

/**
 * One OpenCode tool part → a Codex item.
 * @param {object} part
 * @param {{ threadId: string, cwd: string, mcpServers?: string[], askDiffs?: Map<string, string>, children?: Map<string, string> }} context
 */
export function toolItem(part, context) {
  const { threadId, cwd } = context
  const tool = part.tool
  const state = part.state ?? {}
  const input = state.input ?? {}
  const metadata = state.metadata ?? {}
  const id = part.id
  const output = typeof state.output === 'string' ? state.output : null
  const absolute = (file) => (typeof file === 'string' && file && !path.isAbsolute(file) && cwd ? path.resolve(cwd, file) : file)
  const base = { pluginId: null, scriptPath: null, processId: null, source: 'agent', exitCode: null, durationMs: durationOf(state) }

  if (isExecScript(part)) return execItem(part)
  if (tool === 'bash' || tool === 'shell' || tool === 'exec') {
    const command = String(field(input, 'command', 'cmd', 'script') ?? state.title ?? '')
    const aggregated = output ?? str(metadata.output)
    const exit = Number.isInteger(metadata.exit) ? metadata.exit : null
    return {
      type: 'commandExecution', id, ...base, command, cwd: absolute(field(input, 'workdir', 'cwd')) ?? cwd ?? '',
      status: state.status === 'completed' ? (exit !== null && exit !== 0 ? 'failed' : 'completed') : statusOf(state, { failed: 'declined' }),
      commandActions: [{ type: 'unknown', command }], aggregatedOutput: aggregated ?? (state.status === 'error' ? errorText(state) : null), exitCode: exit,
      ...(typeof input.description === 'string' ? { description: input.description } : {}),
      shell: 'bash',
    }
  }
  if (tool === 'read' || tool === 'view_image') {
    const file = absolute(field(input, 'filePath', 'file_path', 'path'))
    // An image the agent looked at (MiMo view_image, or OpenCode's read returning an image attachment) ends as
    // Codex's imageView, the app's "Viewed image" card. It runs as a read row (an approval may point at it), and
    // status 'completed' replaces the row's inProgress when the same item completes as the card.
    if (state.status === 'completed' && file && path.isAbsolute(file) && viewedImage(tool, file, state, output)) return { type: 'imageView', id, path: file, status: 'completed' }
    const command = `Read ${file ?? ''}`.trim()
    return {
      type: 'commandExecution', id, ...base, command, cwd: cwd ?? '', status: statusOf(state),
      commandActions: [{ type: 'read', command, name: file ? path.basename(file) : '', path: file ?? '' }],
      aggregatedOutput: output ?? (state.status === 'error' ? errorText(state) : null),
    }
  }
  if (tool === 'list' || tool === 'ls') {
    const dir = absolute(field(input, 'path', 'dir')) ?? cwd
    const command = `List ${dir ?? ''}`.trim()
    return { type: 'commandExecution', id, ...base, command, cwd: cwd ?? '', status: statusOf(state), commandActions: [{ type: 'listFiles', command, path: dir ?? null }], aggregatedOutput: output }
  }
  if (SEARCH_TOOLS.has(tool)) {
    const query = field(input, 'pattern', 'query') ?? null
    const command = `${tool} ${query ?? ''}`.trim()
    return {
      type: 'commandExecution', id, ...base, command, cwd: cwd ?? '', status: statusOf(state),
      commandActions: [{ type: 'search', command, query, path: absolute(field(input, 'path')) ?? null, tool, arguments: input }],
      aggregatedOutput: output,
    }
  }
  if (EDIT_TOOLS.has(tool)) {
    const diagnostics = diagnosticsOf(metadata)
    return { type: 'fileChange', id, changes: changesOf(tool, input, metadata, cwd, context.askDiffs?.get(part.callID)), status: statusOf(state, { failed: 'declined' }),
      ...(diagnostics.length ? { codeDesktop: { diagnostics } } : {}) }
  }
  if (WEB_TOOLS.has(tool)) {
    const url = str(field(input, 'url'))
    const query = str(field(input, 'query'))
    return {
      type: 'webSearch', id, query: url ?? query ?? tool,
      action: url ? { type: 'openPage', url } : { type: 'search', query, queries: query ? [query] : null },
      ...(state.status === 'completed' || state.status === 'error' ? { status: statusOf(state) } : { status: 'inProgress' }),
    }
  }
  const actorOp = tool === 'actor' ? (input.operation ?? input) : null
  if (tool === 'task' && (input.subagent_type || input.prompt) || actorOp && ['spawn', 'run'].includes(actorOp.action)) {
    const args = actorOp ?? input
    // MiMo actors run inside the parent session: the child thread is <session>~<actor id>.
    const child = typeof metadata.actorId === 'string' && metadata.actorId ? actorThreadId(part.sessionID ?? threadId, metadata.actorId)
      : str(metadata.sessionId) ?? str(metadata.sessionID) ?? context.children?.get(part.id) ?? null
    let agentState = child ? { status: state.status === 'completed' ? 'completed' : state.status === 'error' ? 'errored' : 'running', message: state.status === 'completed' ? output : state.status === 'error' ? errorText(state) : null } : null
    // MiMo's `actor spawn` (its default) starts the sub-agent in the background and completes with an acknowledgement
    // ('Background sub-session started. actor_id: …'): the sub-agent's own state is how the actor ended (GET
    // /session/:id/actors, live actor.status, or its slice's last message), and running until something says it ended.
    if (child && actorOp?.action === 'spawn' && state.status === 'completed' && typeof metadata.actorId === 'string') {
      agentState = context.actorOutcome?.(metadata.actorId) ?? { status: 'running', message: null }
    }
    return {
      type: 'collabAgentToolCall', id, tool: 'spawnAgent', status: state.status === 'completed' ? 'completed' : state.status === 'error' ? 'failed' : 'inProgress',
      senderThreadId: threadId, receiverThreadIds: child ? [child] : [], prompt: str(args.prompt), model: metadata.model ? `${metadata.model.providerID}/${metadata.model.modelID}` : null,
      reasoningEffort: null, agentsStates: child ? { [child]: agentState } : {},
      ...(typeof args.description === 'string' ? { description: args.description } : {}),
      ...(typeof args.subagent_type === 'string' ? { agentRole: args.subagent_type } : {}),
    }
  }
  // MiMo's other actor operations (tool/actor.ts): wait / status on an actor, a message sent to one, a cancel. As Codex's
  // agent operations (wait, sendMessage, interruptAgent), tied to the actor's thread, so the app's translated rows and
  // the sub-agent's card link apply; `models` stays a plain tool row.
  if (actorOp && ACTOR_OPERATIONS[actorOp.action]) {
    const target = str(actorOp.action === 'send' ? actorOp.to_actor_id : actorOp.actor_id)
    const child = target && target !== 'main' ? actorThreadId(part.sessionID ?? threadId, target) : null
    const settled = state.status === 'completed' || state.status === 'error'
    const agentState = child ? (actorOp.action === 'send' ? null : state.status === 'completed' ? actorSnapshotState(output, metadata) : null) ?? context.actorOutcome?.(target) ?? null : null
    return {
      type: 'collabAgentToolCall', id, tool: ACTOR_OPERATIONS[actorOp.action], status: state.status === 'completed' ? 'completed' : state.status === 'error' ? 'failed' : 'inProgress',
      senderThreadId: threadId, receiverThreadIds: child ? [child] : [], prompt: actorOp.action === 'send' ? str(actorOp.content) : null, model: null,
      reasoningEffort: null, agentsStates: child && agentState ? { [child]: agentState } : {},
      ...(settled && state.status === 'error' ? { error: { message: errorText(state) ?? 'Tool failed.' } } : {}),
    }
  }
  // OpenCode's `invalid` tool (tool/invalid.ts): a call to a tool that doesn't exist, or with arguments that don't fit
  // its schema, rerouted there and "completed" with the reason. It is a failed call of the tool the model attempted
  // (input.tool), so OpenClaude Desktop's own tools keep their titles and every row reads as failed.
  if (tool === 'invalid') {
    const attempted = typeof input.tool === 'string' && input.tool.trim() ? input.tool.trim() : null
    const reason = (typeof input.error === 'string' && input.error.trim() ? input.error.trim() : null) ?? output ?? errorText(state) ?? 'The tool call was invalid.'
    const settled = state.status === 'completed' || state.status === 'error'
    const target = attempted ? mcpServerOf(attempted, context.mcpServers) : null
    if (target) {
      return {
        type: 'mcpToolCall', id, server: target.server, tool: target.tool, status: settled ? 'failed' : 'inProgress', arguments: {}, appContext: null, pluginId: null, readOnlyHint: null,
        result: null, error: settled ? { message: reason } : null, durationMs: durationOf(state),
      }
    }
    return {
      type: 'dynamicToolCall', id, namespace: null, tool: attempted ?? 'invalid', arguments: {}, status: settled ? 'failed' : 'inProgress',
      contentItems: settled ? [{ type: 'inputText', text: reason }] : null, success: settled ? false : null, durationMs: durationOf(state),
      codeDesktop: { invalidTool: true },
    }
  }
  const mcp = mcpServerOf(tool, context.mcpServers)
  if (mcp) {
    return {
      type: 'mcpToolCall', id, server: mcp.server, tool: mcp.tool, status: state.status === 'completed' ? 'completed' : state.status === 'error' ? 'failed' : 'inProgress',
      arguments: withoutSessionArg(input), appContext: null, pluginId: null, readOnlyHint: null,
      result: state.status === 'completed' ? { content: [{ type: 'text', text: output ?? '' }, ...attachmentContent(state.attachments)], structuredContent: null, _meta: null } : null,
      error: state.status === 'error' ? { message: errorText(state) ?? 'Tool failed.' } : null, durationMs: durationOf(state),
    }
  }
  const workflowRun = tool === 'workflow' ? mimoWorkflowRun(part, input, metadata, state, context) : null
  const name = RENAMED[tool] ?? tool
  const args = tool === 'todowrite' ? { todos: (input.todos ?? []).map((todo) => ({ content: todo.content, status: todo.status, priority: todo.priority })) } : withoutSessionArg(input)
  return {
    type: 'dynamicToolCall', id, namespace: null, tool: name, arguments: args, status: state.status === 'completed' ? 'completed' : state.status === 'error' ? 'failed' : 'inProgress',
    // The images a tool returned (OpenCode keeps them as the part's attachments) as Codex inputImage items.
    contentItems: state.status === 'completed' ? [{ type: 'inputText', text: output ?? '' }, ...attachmentContent(state.attachments).map((image) => ({ type: 'inputImage', imageUrl: `data:${image.mimeType};base64,${image.data}` }))]
      : state.status === 'error' ? [{ type: 'inputText', text: errorText(state) ?? '' }] : null,
    success: state.status === 'completed' ? true : state.status === 'error' ? false : null, durationMs: durationOf(state),
    ...(typeof state.title === 'string' && state.title ? { title: state.title } : {}),
    ...(workflowRun ? { workflowRun } : {}),
  }
}

/** MiMo actor operations shown as Codex agent operations (collabAgentToolCall tool). */
const ACTOR_OPERATIONS = { wait: 'wait', status: 'wait', send: 'sendMessage', cancel: 'interruptAgent' }
/** An actor wait/status/cancel result (its JSON snapshot, else the call's metadata) as an agentsStates entry, or null. */
function actorSnapshotState(output, metadata) {
  let snap = null
  try { snap = JSON.parse(output ?? '') } catch { snap = null }
  if (!snap || typeof snap !== 'object') snap = {}
  const state = snap.executionState ?? (metadata?.status === 'cancelled' ? 'cancelled' : null)
  const message = str(snap.result) ?? str(snap.error) ?? null
  switch (state) {
    case 'running': return { status: 'running', message: null }
    case 'completed': return { status: 'completed', message }
    case 'failed': return { status: 'errored', message }
    case 'cancelled': case 'stopped': return { status: 'interrupted', message }
  }
  if (snap.status === 'unknown' || metadata?.status === 'unknown') return { status: 'notFound', message: null }
  if (snap.status === 'pending') return { status: 'pendingInit', message: null }
  if (snap.status === 'running') return { status: 'running', message: null }
  return null
}

/** MiMo structure-node status (workflow/runtime.ts WorkflowNode) → the app's agent state. */
const NODE_STATE = { running: 'progress', succeeded: 'done', completed: 'done', failed: 'error', cancelled: 'skipped' }

/** A top-level MiMo run id (Identifier: 'wf_' + 26), the only runs MiMo resumes (POST /workflows/:runID/resume). */
export const MIMO_TOP_RUN = /^wf_[0-9A-Za-z-]{26}$/
/** MiMo's run-list status (workflow/persistence.ts RunSummary) → the app's run status. */
const RUN_STATUS = { running: 'running', completed: 'completed', failed: 'failed', cancelled: 'stopped' }
/** A call's end and the row's update this far apart: MiMo ran the run again after the call that started it ended. */
const RESUME_GAP_MS = 5000

/**
 * A MiMo `workflow` run (tool/workflow.ts, operation 'run') in the app's workflow run shape (app
 * workflow-progress-model.mjs; the DeepSeek core's workflows.js). Phases and agents come from the run's structure tree
 * (GET /workflows/:runID/structure, which the thread fetches while the run is live: one phase per phase() call, each
 * agent under the phase current when agent() was called, its model and duration) with each agent's tokens from its
 * actor's own messages; without it (MiMo restarted, the runtime no longer holds the run) from the part's transcript and
 * counters, phase-less since nothing says where they started. Status is the tool's own metadata.status (completed /
 * failed / cancelled), startedAt the part's time.start. The last log line is the summary while it runs.
 *
 * A run that goes on after its call ended follows MiMo's own run list (GET /workflows?sessionID=, context.workflowRuns:
 * status, counters, phase; its transcript from GET /workflows/:runID/transcript): a background start (async: true,
 * whose call returns the run id at once), a resume call no earlier call of the thread started (MiMo took it:
 * {"resumed":true}), and a settled run MiMo ran again (OpenClaude Desktop's Resume, the model's resume call, another client:
 * context.workflowResumed, or a row updated well after the call ended). Such a run is background, and stops through
 * MiMo's own tool (stopScope 'run': the bridge asks the model to cancel it). A run MiMo's list still has running but
 * no longer runs (it quit: context.workflowLive false) ended failed. A failed or stopped top-level run is resumable
 * (MiMo replays its journal). Other operations (status / wait / cancel) stay tool rows.
 * @param {{ workflowStructures?: Map<string, any[]>, workflowRuns?: Map<string, any>, workflowTranscripts?: Map<string, any[]>, workflowResumed?: Set<string>, workflowLive?: (runID: string) => boolean | undefined, workflowStarter?: (runID: string) => string | null, actorTokens?: (actorID: string) => number, firstSeen?: (key: string) => number, workflowSequence?: (key: string, run: object, floor: number) => number }} [context]
 */
export function mimoWorkflowRun(part, input, metadata, state, context = {}) {
  const operation = input?.operation ?? 'run'
  if (operation !== 'run' && operation !== 'resume') return null
  const resumeCall = operation === 'resume'
  const output = typeof state?.output === 'string' ? state.output : ''
  const runID = str(metadata?.runID) || (resumeCall ? str(input?.run_id) : null) || null
  if (resumeCall) {
    // The card of the call that started the run follows it again; a resume MiMo refused is a tool row.
    if (!runID || state?.status === 'error' || (state?.status === 'completed' && !/"resumed"\s*:\s*true/.test(output))) return null
    const starter = context.workflowStarter?.(runID)
    if (starter && starter !== part.id) return null
  }
  const background = resumeCall || input?.async === true
  // A background start that failed before MiMo named its run: a tool row.
  if (background && !runID) return null
  const key = runID ?? `call-${part.callID ?? part.id}`
  const meta = metadata?.status
  let status = meta === 'failed' ? 'failed' : meta === 'cancelled' ? 'stopped' : meta === 'completed' ? 'completed'
    : state?.status === 'error' ? (/abort|cancel|interrupt/i.test(String(state?.error ?? '')) ? 'stopped' : 'failed')
      // A finished call without a terminal status in its metadata: its output says how the run ended.
      : state?.status === 'completed' ? (/(?:^|\n)Error: [^\n]*\nrun_id: /.test(output) ? 'failed' : /(?:^|\n)Cancelled\.\nrun_id: /.test(output) ? 'stopped' : 'completed')
        : 'running'
  const row = runID ? context.workflowRuns?.get(runID) ?? null : null
  const callEnd = Number.isFinite(state?.time?.end) ? state.time.end : null
  const resumed = !background && status !== 'running' && Boolean(runID) && (context.workflowResumed?.has(runID) === true
    || (row !== null && callEnd !== null && Number.isFinite(row.updatedAt) && row.updatedAt > callEnd + RESUME_GAP_MS))
  const follow = background || resumed
  let interrupted = false
  if (follow) {
    if (row && RUN_STATUS[row.status]) status = RUN_STATUS[row.status]
    else if (background) status = state?.status === 'error' ? 'failed' : 'running'
    // MiMo's list keeps a run it quit with as running (persistence's row); this MiMo no longer runs it.
    if (status === 'running' && context.workflowLive?.(runID) === false) { status = 'failed'; interrupted = true }
  }
  const liveTranscript = follow && runID ? context.workflowTranscripts?.get(runID) : null
  const transcript = (Array.isArray(liveTranscript) ? liveTranscript : Array.isArray(metadata?.transcript) ? metadata.transcript : []).filter((entry) => entry && typeof entry.text === 'string')
  const progress = []
  const nodes = runID ? context.workflowStructures?.get(runID) : null
  let current = null
  let settledAgents = 0
  if (Array.isArray(nodes) && nodes.length) {
    const phases = new Map()
    for (const node of nodes) {
      if (node?.type !== 'phase') continue
      const entry = { type: 'workflow_phase', index: phases.size, title: String(node.title ?? '') }
      phases.set(node.id, entry)
      progress.push(entry)
    }
    let index = 0
    for (const node of nodes) {
      if (node?.type !== 'agent' && node?.type !== 'workflow') continue
      const phase = phases.get(node.phaseId)
      let agentState = NODE_STATE[node.status] ?? 'progress'
      // The run ended with the agent still going: cancelled with a stopped run, cut short with a failed one.
      if (agentState === 'progress' && status !== 'running') agentState = status === 'stopped' ? 'skipped' : 'error'
      const tokens = node.type === 'agent' && typeof node.actorID === 'string' ? context.actorTokens?.(node.actorID) ?? 0 : 0
      if (agentState !== 'progress') settledAgents++
      progress.push({
        type: 'workflow_agent', index: index++, id: String(node.id), label: str(node.type === 'workflow' ? node.name : node.label) || str(node.agentType) || 'Agent', state: agentState,
        ...(phase ? { phaseIndex: phase.index, phaseTitle: phase.title } : {}),
        ...(str(node.model) ? { model: node.model } : {}),
        ...(Number.isFinite(node.durationMs) ? { durationMs: node.durationMs } : {}),
        ...(tokens > 0 ? { tokens } : {}),
        ...(typeof node.actorID === 'string' ? { actorId: node.actorID } : {}),
        ...(agentState === 'error' ? { error: node.status === 'failed' ? 'Agent failed' : 'Workflow ended before completion' } : {}),
        ...(agentState === 'progress' ? { progressSupported: false } : {}),
      })
    }
    const title = str(follow && row ? row.currentPhase : metadata?.currentPhase)
    const visited = progress.filter((entry) => entry.type === 'workflow_phase')
    current = (title ? visited.findLast((entry) => entry.title === title)?.index : undefined) ?? (visited.length ? visited.length - 1 : null)
  } else {
    const phaseIndex = new Map()
    for (const entry of transcript) if (entry.kind === 'phase' && !phaseIndex.has(entry.text)) { phaseIndex.set(entry.text, phaseIndex.size); progress.push({ type: 'workflow_phase', index: phaseIndex.size - 1, title: entry.text }) }
    const phaseTitle = follow && row ? row.currentPhase : metadata?.currentPhase
    current = typeof phaseTitle === 'string' && phaseIndex.has(phaseTitle) ? phaseIndex.get(phaseTitle) : phaseIndex.size ? phaseIndex.size - 1 : null
    const counts = follow && row ? { running: row.running, succeeded: row.succeeded, failed: row.failed } : metadata?.counters && typeof metadata.counters === 'object' ? metadata.counters : {}
    const count = (value) => (Number.isInteger(value) && value > 0 ? value : 0)
    const running = status === 'running' ? 'progress' : status === 'stopped' ? 'skipped' : 'error'
    for (const [agentState, total] of [['done', count(counts.succeeded)], ['error', count(counts.failed)], [running, count(counts.running)]]) {
      for (let i = 0; i < total; i++) progress.push({ type: 'workflow_agent', index: progress.filter((entry) => entry.type === 'workflow_agent').length, id: `${agentState}-${i}`, label: 'Agent', state: agentState, ...(agentState === 'error' ? { error: 'Agent failed' } : {}) })
      if (agentState !== 'progress') settledAgents += total
    }
  }
  const startedAt = Number.isFinite(state?.time?.start) ? state.time.start : context.firstSeen?.(key)
  // A followed run ends when MiMo's row last changed, not when its call did.
  const endedAt = !follow ? callEnd : status === 'running' ? null : row && Number.isFinite(row.updatedAt) ? row.updatedAt : callEnd
  const name = str(input?.name) || (follow ? str(row?.name) : null) || 'workflow'
  const lastLog = [...transcript].reverse().find((entry) => entry.kind === 'log')?.text ?? null
  const failure = interrupted ? 'MiMo stopped before this workflow finished.'
    : follow && str(row?.error) ? row.error.split('\n')[0] : typeof state?.error === 'string' ? state.error : (status === 'failed' ? /(?:^|\n)Error: ([^\n]*)(?:\n[^\n]*)*?\nrun_id: /.exec(output)?.[1] : null) ?? null
  const totalTokens = progress.reduce((sum, entry) => sum + (entry.tokens || 0), 0)
  const run = {
    id: key, source: 'model', callId: part.callID ?? part.id, runId: runID,
    name, description: name, status, ...(Number.isFinite(startedAt) ? { startedAt } : {}), background: follow,
    ...(status !== 'running' ? { completedAt: endedAt ?? startedAt, durationMs: endedAt && Number.isFinite(startedAt) ? Math.max(0, endedAt - startedAt) : undefined } : {}),
    ...(status === 'running' && lastLog ? { summary: lastLog } : status === 'failed' ? { summary: failure ? failure.slice(0, 400) : 'Workflow failed' } : status === 'stopped' ? { summary: 'Stopped' } : {}),
    ...(current !== null && current !== undefined ? { currentPhase: current } : {}),
    // MiMo cancels a run only from its own workflow tool (operation 'cancel'; no route): a run in its turn stops with the
    // turn; one that goes on after its call (background, resumed) through a cancel the bridge asks the model for.
    stopScope: follow ? 'run' : 'turn',
    // MiMo replays a failed or stopped top-level run from its journal (codeDesktop/workflow/resume).
    ...(runID && MIMO_TOP_RUN.test(runID) && (status === 'failed' || status === 'stopped') ? { resumable: true } : {}),
    workflowProgress: progress,
    usage: { totalTokens },
  }
  // Monotonic, as the app keeps the run with the higher sequence: everything counted here only grows (transcript lines,
  // the ones a capped transcript omits included, agents seen and settled, the end); the thread's projector also bumps it
  // on any other change (tokens, durations).
  const omitted = transcript.reduce((sum, entry) => sum + (Number(/^…\((\d+) lines omitted\)$/.exec(entry.text)?.[1]) || 0), 0)
  const floor = transcript.length + omitted + progress.length + settledAgents + (status === 'running' ? 0 : 1)
  run.sequence = context.workflowSequence ? context.workflowSequence(key, run, floor) : floor
  return run
}

const IMAGE_FILE = /\.(png|jpe?g|gif|webp)$/i
/** A completed read / view_image call that showed the model an image (not a PDF or text). */
function viewedImage(tool, file, state, output) {
  const attachments = Array.isArray(state.attachments) ? state.attachments : []
  if (attachments.some((attachment) => String(attachment?.mime ?? '').startsWith('image/'))) return true
  if (attachments.length) return false
  // Attachments are left out of some histories: the tools' own success line, on an image file.
  return IMAGE_FILE.test(file) && (tool === 'view_image' ? /^Image viewed successfully/.test(output ?? '') : /^Image read successfully/.test(output ?? ''))
}

/**
 * A tool input without the session argument the plugin adds to OpenClaude Desktop's own tools (app-tools.js): older calls
 * still have it in their stored input (the plugin's tool.execute.after drops it from new ones).
 */
function withoutSessionArg(input) {
  return input && typeof input === 'object' && !Array.isArray(input) && SESSION_ARG in input ? Object.fromEntries(Object.entries(input).filter(([key]) => key !== SESSION_ARG)) : input
}

function attachmentContent(attachments) {
  const out = []
  for (const file of Array.isArray(attachments) ? attachments : []) {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(file?.url ?? '')
    if (match && match[1].startsWith('image/')) out.push({ type: 'image', data: match[2], mimeType: match[1] })
  }
  return out
}

/** {server, tool} when a tool name is <sanitized server>_<tool> of a known server. */
export function mcpServerOf(name, servers = []) {
  if (typeof name !== 'string') return null
  let best = null
  for (const server of servers ?? []) {
    const prefix = `${String(server).replace(/[^a-zA-Z0-9_-]/g, '_')}_`
    if (name.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) best = { server, tool: name.slice(prefix.length), prefix }
  }
  return best ? { server: best.server, tool: best.tool } : null
}

/** A MiMo actor's thread id, and back. */
export const actorThreadId = (sessionID, actorID) => `${sessionID}~${actorID}`

/**
 * GET /session/:id/message's slice query: MiMo lists only the main agent's slice unless `agent_id` names an actor (its
 * own slice) or is `*` (every slice); OpenCode has no slices (null: no query).
 */
/** An actor's lastError (MiMo records the whole stack) as one line, or null. */
export const actorErrorLine = (value) => (typeof value === 'string' && value.trim() ? value.trim().split('\n')[0].replace(/^Error:\s*/, '').slice(0, 500) || null : null)

export const messageSliceQuery = (flavor, actor = null) => (flavor?.id === 'mimo' ? { agent_id: actor || '*' } : null)
export function parseActorThreadId(id) {
  const index = typeof id === 'string' ? id.indexOf('~') : -1
  return index > 0 ? { sessionID: id.slice(0, index), actorID: id.slice(index + 1) } : null
}

const fileUrlPath = (url) => {
  try { return url.startsWith('file://') ? decodeURIComponent(new URL(url).pathname) : null } catch { return null }
}

/** A user message's parts → Codex UserInput[]. */
export function userContent(parts) {
  const content = []
  for (const part of parts ?? []) {
    if (part.type === 'text' && !part.synthetic && !part.ignored && part.text) content.push({ type: 'text', text: part.text, text_elements: [] })
    else if (part.type === 'file') {
      const file = fileUrlPath(part.url ?? '')
      if (String(part.mime ?? '').startsWith('image/')) content.push(file ? { type: 'localImage', path: file } : { type: 'image', url: part.url })
      else content.push({ type: 'mention', name: part.filename ?? (file ? path.basename(file) : 'file'), path: file ?? part.url ?? '' })
    } else if (part.type === 'agent' && part.name) content.push({ type: 'text', text: `@${part.name}`, text_elements: [] })
    else if (part.type === 'subtask' && part.prompt) content.push({ type: 'text', text: part.description ? `${part.description}` : part.prompt, text_elements: [] })
  }
  return content
}

/**
 * The language-server errors OpenCode reported after an edit or write (tool/edit.ts, write.ts: metadata.diagnostics
 * {file: LSP Diagnostic[]}; the model reads the same errors as 'LSP errors detected'): [{path, line, column, message}],
 * errors only (severity 1), at most 20, as the edit card's Diagnostics list.
 */
export function diagnosticsOf(metadata) {
  const out = []
  const all = metadata?.diagnostics && typeof metadata.diagnostics === 'object' ? metadata.diagnostics : {}
  for (const [file, issues] of Object.entries(all)) {
    for (const issue of Array.isArray(issues) ? issues : []) {
      if (issue?.severity !== 1 || typeof issue.message !== 'string') continue
      out.push({ path: file, line: Number.isInteger(issue.range?.start?.line) ? issue.range.start.line + 1 : null, column: Number.isInteger(issue.range?.start?.character) ? issue.range.start.character + 1 : null, message: issue.message.slice(0, 500) })
      if (out.length >= 20) return out
    }
  }
  return out
}

const isSyntheticUser = (message) => message.parts.length > 0 && message.parts.every((part) => part.synthetic || part.type === 'compaction' || part.ignored)

/**
 * A prompt MiMo's scheduler fired (cron / loop: session/prompt.ts injectScheduledPrompt): its text part is synthetic
 * with metadata.origin {kind: 'cron', taskId, kindOfTask, firedAt}. {kind, taskId, kindOfTask, firedAt} or null.
 */
export function scheduledOrigin(message) {
  for (const part of message?.parts ?? []) {
    const origin = part?.metadata?.origin
    if (part?.type === 'text' && origin && typeof origin === 'object' && origin.kind === 'cron') {
      return { kind: 'cron', taskId: typeof origin.taskId === 'string' ? origin.taskId : null, kindOfTask: typeof origin.kindOfTask === 'string' ? origin.kindOfTask : null,
        firedAt: Number.isFinite(origin.firedAt) ? origin.firedAt : message.info?.time?.created ?? null }
    }
  }
  return null
}
const hasCompaction = (message) => message.parts.some((part) => part.type === 'compaction')

// A transport failure (no HTTP answer at all), as the AI SDK and Node report it.
const TRANSPORT_FAILURE = /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|socket hang up|fetch failed|network error|Unable to connect/i

/**
 * An OpenCode message error → Codex TurnError. Only a failure that never got an HTTP answer is a
 * connection problem; a provider's 4xx answer says what was wrong with the request or account.
 */
export function errorInfoOf(error) {
  if (!error) return null
  const name = error.name ?? ''
  const data = error.data ?? {}
  const message = data.message ?? error.message ?? name ?? 'The turn failed.'
  const status = Number.isInteger(data.statusCode) ? data.statusCode : null
  let codexErrorInfo = 'other'
  if (name === 'ContextOverflowError' || /context|too long|maximum context/i.test(message)) codexErrorInfo = 'contextWindowExceeded'
  // MiMo's ended free API ('MiMo free API service has ended. Sign in or configure a third-party API.'): a sign-in fixes it.
  else if (name === 'ProviderAuthError' || status === 401 || status === 403 || /free API service has ended/i.test(message)) codexErrorInfo = 'unauthorized'
  // A 429 for a used-up plan quota (MiMo's 'quota of Token Plan has been exhausted') is a usage limit, not throttling.
  else if (status === 429 && /token plan|quota/i.test(message)) codexErrorInfo = 'usageLimitExceeded'
  else if (status === 429) codexErrorInfo = 'rateLimitExceeded'
  // Payment required: out of balance (MiMo 402 'Insufficient account balance'). additionalDetails BILLING tells the
  // app it is a balance to top up, not a limit that resets.
  else if (status === 402) return { message: String(message).slice(0, 4000), codexErrorInfo: 'usageLimitExceeded', additionalDetails: 'BILLING', misalignment: null }
  else if (status === 529 || (status === 503 && /overload/i.test(message))) codexErrorInfo = 'serverOverloaded'
  else if (status !== null && status >= 500) codexErrorInfo = 'internalServerError'
  // A request timeout is the one 4xx a retry can fix.
  else if (status === 408) codexErrorInfo = { httpConnectionFailed: { httpStatusCode: 408 } }
  // 400 / 404 (unknown model) / 413 / 422 …: the provider rejected the request.
  else if (status !== null && status >= 400) codexErrorInfo = 'badRequest'
  else if (name === 'APIError' || TRANSPORT_FAILURE.test(message)) codexErrorInfo = { httpConnectionFailed: { httpStatusCode: status } }
  return { message: String(message).slice(0, 4000), codexErrorInfo, additionalDetails: name || null, misalignment: null }
}

/**
 * The thread's message store and its Codex view. `meta` carries the bridge's
 * own facts: steer message ids, remembered inputs, review turns.
 */
export class Projector {
  /**
   * @param {{ threadId: string, cwd: string, meta?: object, mcpServers?: () => string[], askDiffs?: Map<string, string> }} options
   */
  constructor({ threadId, cwd, meta = {}, mcpServers = () => [], askDiffs = new Map(), actor = null }) {
    this.threadId = threadId
    // MiMo: the actor whose messages this view shows (null: the main agent's).
    this.actor = actor
    this.cwd = cwd
    this.meta = meta
    this.mcpServers = mcpServers
    this.askDiffs = askDiffs
    /** @type {Map<string, {info: any, parts: any[]}>} */
    this.messages = new Map()
    // MiMo: the other agents' slices of the same session (id → {info, parts}): their tokens (workflow agents) and how
    // each actor ended (actorStates), never this view's transcript.
    this.slices = new Map()
    // MiMo: actor id → {state, error} from GET /session/:id/actors and live actor.status (the thread sets it).
    this.actorStates = new Map()
    this.revert = null
    // task/actor part id → child session id (learned from session.created).
    this.children = new Map()
    // MiMo workflow runs: runID → structure nodes (the thread fetches them while a run is live), and per run its
    // first-seen time (a part with no time.start yet) and last projection with its sequence.
    this.workflowStructures = new Map()
    this.workflowSeen = new Map()
    this.workflowSeq = new Map()
    // MiMo's run list rows (runID → RunSummary) and full transcripts of the runs that go on after their call, the runs
    // it ran again since their call ended, and whether a run still runs in this MiMo (set by the thread; null: unknown).
    this.workflowRuns = new Map()
    this.workflowTranscripts = new Map()
    this.workflowResumed = new Set()
    this.workflowLive = null
  }

  /** runID → the id of the part whose card shows it: the first call that started it, else the first resume call. */
  workflowStarters() {
    const started = new Map()
    const resumed = new Map()
    for (const { parts } of this.ordered()) {
      for (const part of parts) {
        if (part?.type !== 'tool' || part.tool !== 'workflow') continue
        const input = part.state?.input ?? {}
        const operation = input.operation ?? 'run'
        if (operation === 'run' && typeof part.state?.metadata?.runID === 'string' && !started.has(part.state.metadata.runID)) started.set(part.state.metadata.runID, part.id)
        else if (operation === 'resume' && typeof input.run_id === 'string' && !resumed.has(input.run_id)) resumed.set(input.run_id, part.id)
      }
    }
    for (const [runID, id] of resumed) if (!started.has(runID)) started.set(runID, id)
    return started
  }

  load(list) {
    this.messages.clear()
    this.slices.clear()
    for (const entry of list ?? []) {
      if (!entry?.info?.id) continue
      // Another agent's slice of a MiMo session (its actors): kept for their tokens and outcome, never projected here.
      if (this.owns(entry.info)) this.messages.set(entry.info.id, { info: entry.info, parts: [...(entry.parts ?? [])] })
      else this.slices.set(entry.info.id, { info: entry.info, parts: [...(entry.parts ?? [])] })
    }
  }

  /** A message of another agent's slice that arrived live (MiMo routes it to the actor's own thread). */
  noteSlice(info, part = null) {
    if (!info?.id && !part?.messageID) return
    const id = info?.id ?? part.messageID
    const entry = this.slices.get(id) ?? { info: info ?? { id }, parts: [] }
    if (info) entry.info = info
    if (part?.id) {
      const index = entry.parts.findIndex((candidate) => candidate.id === part.id)
      if (index >= 0) entry.parts[index] = part
      else entry.parts.push(part)
    }
    this.slices.set(id, entry)
  }

  upsertMessage(info) {
    const entry = this.messages.get(info.id)
    if (entry) entry.info = info
    else this.messages.set(info.id, { info, parts: [] })
    return this.messages.get(info.id)
  }

  upsertPart(part) {
    const entry = this.messages.get(part.messageID) ?? this.upsertMessage({ id: part.messageID, sessionID: part.sessionID, role: 'assistant', time: { created: Date.now() } })
    const index = entry.parts.findIndex((candidate) => candidate.id === part.id)
    if (index >= 0) entry.parts[index] = part
    else entry.parts.push(part)
    return entry
  }

  appendDelta(messageID, partID, fieldName, delta) {
    const entry = this.messages.get(messageID)
    const part = entry?.parts.find((candidate) => candidate.id === partID)
    if (!part) return null
    part[fieldName] = (part[fieldName] ?? '') + delta
    return part
  }

  removeMessage(id) { this.messages.delete(id) }

  /** Whether a message belongs to this view (MiMo keeps sub-agent actors in the same session). */
  owns(info) {
    const agent = info?.agentID
    return this.actor ? agent === this.actor : !agent || agent === 'main'
  }

  ordered() {
    const list = [...this.messages.values()].filter((entry) => this.owns(entry.info))
    list.sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0) || (a.info.id < b.info.id ? -1 : a.info.id > b.info.id ? 1 : 0))
    if (this.revert?.messageID) return list.filter((entry) => entry.info.id < this.revert.messageID)
    return list
  }

  context() {
    let tokens = null
    let starters = null
    return {
      threadId: this.threadId, cwd: this.cwd, mcpServers: this.mcpServers(), askDiffs: this.askDiffs, children: this.children,
      workflowStructures: this.workflowStructures,
      workflowRuns: this.workflowRuns, workflowTranscripts: this.workflowTranscripts, workflowResumed: this.workflowResumed,
      workflowLive: (runID) => (this.workflowLive ? this.workflowLive(runID) : undefined),
      workflowStarter: (runID) => { starters ??= this.workflowStarters(); return starters.get(runID) ?? null },
      // A workflow agent's tokens: its actor's own assistant messages (MiMo keeps actors in the parent session).
      actorTokens: (actorID) => {
        if (!tokens) {
          tokens = new Map()
          for (const { info } of [...this.messages.values(), ...this.slices.values()]) {
            if (info?.role !== 'assistant' || !info.tokens || typeof info.agentID !== 'string') continue
            tokens.set(info.agentID, (tokens.get(info.agentID) ?? 0) + tokenBreakdown(info.tokens).totalTokens)
          }
        }
        return tokens.get(actorID) ?? 0
      },
      actorOutcome: (actorID) => this.actorOutcome(actorID),
      firstSeen: (key) => { if (!this.workflowSeen.has(key)) this.workflowSeen.set(key, Date.now()); return this.workflowSeen.get(key) },
      workflowSequence: (key, run, floor) => {
        const body = JSON.stringify({ ...run, sequence: 0 })
        const last = this.workflowSeq.get(key)
        const sequence = !last ? floor : last.body === body ? Math.max(last.sequence, floor) : Math.max(last.sequence + 1, floor)
        this.workflowSeq.set(key, { body, sequence })
        return sequence
      },
    }
  }

  /**
   * How a MiMo actor (background sub-agent) stands, as a collabAgentToolCall agentsStates entry ({status, message}), or
   * null when nothing says: MiMo's own record (actorStates: executionState running | completed | failed | cancelled |
   * stopped, lastError) first, else its slice's last assistant message once it finished.
   */
  actorOutcome(actorID) {
    if (typeof actorID !== 'string' || !actorID) return null
    const own = [...this.slices.values(), ...this.messages.values()]
      .filter((entry) => entry.info?.agentID === actorID && entry.info.role === 'assistant')
      .sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0) || (a.info.id < b.info.id ? -1 : a.info.id > b.info.id ? 1 : 0))
    const last = own.at(-1)
    const text = last ? (last.parts ?? []).filter((part) => part?.type === 'text' && !part.synthetic && typeof part.text === 'string').map((part) => part.text).join('').trim() || null : null
    const failure = last?.info?.error ? errorInfoOf(last.info.error)?.message ?? null : null
    const known = this.actorStates.get(actorID)
    switch (known?.state) {
      case 'running': return { status: 'running', message: null }
      case 'completed': return { status: 'completed', message: text }
      // The slice's own error reads better than the record's ('Error: Actor assistant failed: APIError' and a stack).
      case 'failed': return { status: 'errored', message: failure ?? known.error ?? null }
      case 'cancelled': case 'stopped': return { status: 'interrupted', message: known.error ?? null }
    }
    if (!last || !Number.isFinite(last.info.time?.completed)) return null
    if (last.info.error) return { status: 'errored', message: failure }
    return last.info.finish && last.info.finish !== 'tool-calls' && last.info.finish !== 'unknown' ? { status: 'completed', message: text } : null
  }

  /** One part → its Codex item (null for parts with no item). */
  itemOf(part, message) {
    if (part.type === 'text') {
      if (part.synthetic || part.ignored || message.info.role !== 'assistant' || message.info.summary) return null
      return { type: 'agentMessage', id: part.id, text: part.text ?? '', phase: null, memoryCitation: null, delivery: null, questions: null }
    }
    if (part.type === 'reasoning') return { type: 'reasoning', id: part.id, summary: part.text ? [part.text] : [], content: [] }
    if (part.type === 'tool') return toolItem(part, this.context())
    if (part.type === 'compaction') return { type: 'contextCompaction', id: part.id }
    return null
  }

  /** One part → its Codex items: MiMo's exec script, then each tool it called. */
  itemsOf(part, message) {
    const item = this.itemOf(part, message)
    if (!item) return []
    if (!isExecScript(part)) return [item]
    const context = this.context()
    return [item, ...execSubParts(part).map((sub) => toolItem(sub, context))]
  }

  /**
   * Codex turns. `active` is the open turn's id when the session is busy here.
   * @returns {Array<{id, items, status, error, startedAt, completedAt, durationMs, assistant: any[]}>}
   */
  turns({ busy = false } = {}) {
    const turns = []
    const byUser = new Map()
    const steer = new Set(this.meta.steers ?? [])
    const reviews = this.meta.reviews ?? {}
    let current = null
    for (const message of this.ordered()) {
      const info = message.info
      if (info.role === 'user') {
        // A scheduled prompt (MiMo cron / loop) is a turn of its own, though its text is synthetic.
        if (current && (steer.has(info.id) || (isSyntheticUser(message) && !hasCompaction(message) && !scheduledOrigin(message)))) {
          byUser.set(info.id, current)
          if (steer.has(info.id)) current.items.push(this.userItem(message))
          continue
        }
        current = { id: info.id, items: [], status: 'completed', error: null, startedAt: seconds(info.time?.created), completedAt: null, durationMs: null, startedMs: info.time?.created ?? null, assistant: [], review: reviews[info.id] ?? null }
        if (hasCompaction(message)) {
          current.compaction = true
          for (const part of message.parts) if (part.type === 'compaction') current.items.push({ type: 'contextCompaction', id: part.id })
        } else current.items.push(this.userItem(message))
        if (current.review) current.items.push({ type: 'enteredReviewMode', id: `${info.id}-review`, review: current.review.label ?? 'Review' })
        turns.push(current)
        byUser.set(info.id, current)
        continue
      }
      const turn = byUser.get(info.parentID) ?? current
      if (!turn) continue
      turn.assistant.push(message)
      for (const part of message.parts) turn.items.push(...this.itemsOf(part, message))
      // The summary OpenCode wrote when it compacted (an assistant message with info.summary): what it now remembers,
      // shown under the compaction marker (codeDesktop.summary, as the DeepSeek bridge reports it).
      if (info.summary) {
        const text = message.parts.filter((part) => part.type === 'text' && !part.synthetic && !part.ignored && part.text).map((part) => part.text).join('\n\n').trim()
        const marker = turn.items.find((item) => item.type === 'contextCompaction')
        if (text && marker) marker.codeDesktop = { ...marker.codeDesktop, summary: [marker.codeDesktop?.summary, text].filter(Boolean).join('\n\n') }
      }
      if (info.time?.completed) turn.completedMs = Math.max(turn.completedMs ?? 0, info.time.completed)
      else if (!info.error) turn.incomplete = true
      if (info.error) {
        turn.status = info.error.name === 'MessageAbortedError' ? 'interrupted' : 'failed'
        turn.error = turn.status === 'failed' ? errorInfoOf(info.error) : null
      }
    }
    const last = turns.at(-1)
    for (const turn of turns) {
      if (turn === last && busy) { turn.status = 'inProgress'; turn.error = null }
      // A reply the agent never finished (the core stopped mid-turn), or a prompt that never got one.
      else if (turn.status === 'completed' && (turn.incomplete || (!turn.assistant.length && !turn.compaction))) turn.status = 'interrupted'
      turn.completedAt = turn.status === 'inProgress' ? null : seconds(turn.completedMs ?? turn.startedMs)
      turn.durationMs = turn.status === 'inProgress' || !turn.startedMs ? null : Math.max(0, (turn.completedMs ?? turn.startedMs) - turn.startedMs)
      if (turn.review && turn.status !== 'inProgress') {
        const text = [...turn.items].reverse().find((item) => item.type === 'agentMessage')?.text ?? ''
        turn.items.push({ type: 'exitedReviewMode', id: `${turn.id}-review-done`, review: text })
      }
      // An item still open in a finished turn (interrupted mid-call) closes with it.
      if (turn.status !== 'inProgress') for (const item of turn.items) if (item.status === 'inProgress') item.status = turn.status === 'completed' ? 'completed' : item.type === 'fileChange' || item.type === 'commandExecution' ? 'failed' : 'failed'
    }
    return turns
  }

  userItem(message) {
    const remembered = this.meta.inputs?.[message.info.id]
    // A scheduled prompt shows its text (synthetic) and says where it came from (codeDesktop.origin, read by the app).
    const origin = scheduledOrigin(message)
    if (origin) return { type: 'userMessage', id: `${message.info.id}-user`, clientId: null,
      content: message.parts.filter((part) => part.type === 'text' && part.text).map((part) => ({ type: 'text', text: part.text, text_elements: [] })), codeDesktop: { origin } }
    return { type: 'userMessage', id: `${message.info.id}-user`, clientId: null, content: Array.isArray(remembered) ? remembered : userContent(message.parts) }
  }

  /** The Codex Turn object. */
  snapshot(turn, itemsView = 'full') {
    return {
      id: turn.id, items: itemsView === 'notLoaded' ? [] : turn.items, itemsView, status: turn.status, error: turn.error,
      startedAt: turn.startedAt, completedAt: turn.completedAt, durationMs: turn.durationMs,
    }
  }

  /** The last completed assistant step's usage and the running total. */
  usage() {
    const total = emptyBreakdown()
    let last = null
    let lastTurnId = null
    let model = null
    for (const message of this.ordered()) {
      if (message.info.role !== 'assistant' || !message.info.tokens) continue
      const breakdown = tokenBreakdown(message.info.tokens)
      if (!breakdown.totalTokens) continue
      addBreakdown(total, breakdown)
      last = breakdown
      lastTurnId = message.info.parentID ?? null
      model = message.info.providerID && message.info.modelID ? `${message.info.providerID}/${message.info.modelID}` : model
    }
    return { total, last, lastTurnId, model }
  }

  /** The latest todo list (todowrite) as a Codex plan. */
  plan() {
    let todos = null
    for (const message of this.ordered()) {
      for (const part of message.parts) {
        for (const tool of isExecScript(part) ? execSubParts(part) : [part]) if (tool.type === 'tool' && tool.tool === 'todowrite' && Array.isArray(tool.state?.input?.todos)) todos = tool.state.input.todos
      }
    }
    return todos ? planOf(todos) : null
  }

  /** Text preview: the first user text. */
  preview() {
    for (const message of this.ordered()) {
      if (message.info.role !== 'user') continue
      const text = userContent(message.parts).find((part) => part.type === 'text')?.text
      if (text) return text.slice(0, 200)
    }
    return ''
  }

  lastActivityMs() {
    let latest = null
    for (const message of this.messages.values()) {
      if (!this.owns(message.info)) continue
      const value = message.info.time?.completed ?? message.info.time?.created
      if (Number.isFinite(value) && (latest === null || value > latest)) latest = value
    }
    return latest
  }
}

/**
 * OpenCode todos (todowrite statuses pending | in_progress | completed | cancelled) → Codex plan steps. Codex plan
 * steps are only pending / inProgress / completed: a cancelled todo is struck through like a finished one but marked
 * abandoned (codeDesktop.state, as taskPlanOf below), so it never reads as done.
 */
export function planOf(todos) {
  return (todos ?? []).filter((todo) => todo && typeof todo.content === 'string').map((todo) => {
    if (todo.status === 'cancelled') return { step: todo.content, status: 'completed', codeDesktop: { state: 'abandoned' } }
    return { step: todo.content, status: todo.status === 'completed' ? 'completed' : todo.status === 'in_progress' ? 'inProgress' : 'pending' }
  })
}

/**
 * MiMo's task list (GET /session/:id/task; task/schema.ts statuses open | in_progress | blocked | done |
 * abandoned) as a Codex plan. Codex plan steps are only pending / inProgress / completed: an abandoned task is
 * struck through like a finished one but says it was abandoned, and a blocked one stays pending, marked blocked.
 */
export function taskPlanOf(tasks) {
  return (Array.isArray(tasks) ? tasks : []).filter((task) => task && (task.summary || task.title)).map((task) => {
    const text = `${task.id ? `${task.id} ` : ''}${task.summary ?? task.title}`
    // codeDesktop.state: the app marks the step Abandoned / Blocked in the reader's language (source-plan-checklist).
    if (task.status === 'abandoned') return { step: text, status: 'completed', codeDesktop: { state: 'abandoned' } }
    if (task.status === 'blocked') return { step: text, status: 'pending', codeDesktop: { state: 'blocked' } }
    return { step: text, status: task.status === 'done' ? 'completed' : task.status === 'in_progress' ? 'inProgress' : 'pending' }
  })
}

/** All fileChange diffs of a turn, one unified diff. */
export function turnDiff(turn) {
  return turn.items.filter((item) => item.type === 'fileChange' && item.status !== 'declined').flatMap((item) => item.changes.map((change) => change.diff)).filter(Boolean).join('\n')
}
