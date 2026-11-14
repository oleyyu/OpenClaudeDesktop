/**
 * ZCode tool calls as Codex thread items. One mapping serves the live stream (tool.updated events) and history
 * (session/messages tool parts), so a call has the same item id (its toolCallId) and shape in both.
 *
 *   Bash                      commandExecution (output, exit code; run_in_background → processId = task id)
 *   Read                      commandExecution with a `read` action; an image file → imageView (the picture)
 *   Edit / Write              fileChange (unified diffs from ZCode's file_diff display, else from the input)
 *   WebSearch / WebFetch      webSearch (search / openPage)
 *   mcp__<server>__<tool>     mcpToolCall
 *   Agent / SendMessage       collabAgentToolCall (spawnAgent / sendInput) — the child is a spawned thread
 *   ExitPlanMode              plan item `plan-<callId>` (the plan card's document) + dynamicToolCall
 *   TodoWrite                 turn/plan/updated (no item)
 *   anything else             dynamicToolCall
 */

import path from 'node:path'

export const MCP_TOOL = /^mcp__(.+?)__(.+)$/

// The image files ZCode's Read hands the model as pictures (read-image.ts).
const IMAGE_FILE = /\.(png|jpe?g|gif|webp)$/i

export const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

const text = (value) => (typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value))

/** The child session id ZCode gives a sub-agent (sess_subagent_<agentId>). */
export const childSessionIdOf = (agentId) => (agentId ? `sess_subagent_${agentId}` : null)

/** Unified-diff hunks from ZCode's structuredPatch ({oldStart, oldLines, newStart, newLines, lines}). */
export function diffFromStructuredPatch(patch) {
  if (!Array.isArray(patch)) return null
  return patch.map((hunk) => `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${(hunk.lines ?? []).join('\n')}\n`).join('')
}

const lines = (value) => (value === '' ? [] : String(value ?? '').replace(/\n$/, '').split('\n'))

/** A best-effort diff before ZCode reports the real one (Edit's old/new strings). */
export function diffFromEdit(input) {
  const before = lines(input?.old_string)
  const after = lines(input?.new_string)
  return `@@ -1,${before.length} +1,${after.length} @@\n${[...before.map((line) => `-${line}`), ...after.map((line) => `+${line}`)].join('\n')}\n`
}

export function todoPlan(input) {
  const todos = Array.isArray(input?.todos) ? input.todos : []
  return todos.filter((todo) => typeof todo?.content === 'string').map((todo) => ({
    step: todo.content,
    status: todo.status === 'completed' ? 'completed' : todo.status === 'in_progress' ? 'inProgress' : 'pending',
  }))
}

/** The exit code a Bash result reports (perf.detail.command.exitCode), else 0 / 1. */
function exitCodeOf(result) {
  const code = result?.perf?.detail?.command?.exitCode
  if (Number.isInteger(code)) return code
  return result?.success === false ? 1 : 0
}

/** The background task id a `run_in_background` launch acknowledges. */
export function backgroundTaskIdOf(content) {
  const match = /background with ID: (\S+?)\.?\s/.exec(String(content ?? '') + ' ')
  return match ? match[1] : null
}

/**
 * The Codex item for one tool call.
 * @param {{ callId: string, tool: string, input: object, status: 'inProgress'|'completed'|'failed'|'declined'|'interrupted',
 *   result?: { success?: boolean, content?: string, display?: object, perf?: object }|null, error?: string|null,
 *   durationMs?: number|null, cwd: string, threadId: string, childThreadId?: string|null, agentState?: object|null }} call
 */
export function toolItem(call) {
  const { callId: id, tool, status, cwd, threadId } = call
  const input = isRecord(call.input) ? call.input : {}
  const result = call.result ?? null
  const done = status !== 'inProgress'
  const output = result ? text(result.content) : call.error ? String(call.error) : null
  const durationMs = Number.isFinite(call.durationMs) ? call.durationMs : null

  if (tool === 'Bash') {
    const background = input.run_in_background === true
    const processId = background ? backgroundTaskIdOf(result?.content) : null
    return {
      type: 'commandExecution', id, pluginId: null, scriptPath: null, command: text(input.command), cwd, processId, source: 'agent',
      status, commandActions: [{ type: 'unknown', command: text(input.command) }],
      aggregatedOutput: done ? output : null, exitCode: done && status !== 'declined' && status !== 'interrupted' ? (status === 'failed' && !result ? 1 : exitCodeOf(result)) : null,
      durationMs, ...(input.description ? { description: String(input.description) } : {}), shell: 'bash',
    }
  }
  if (tool === 'Read') {
    const file = text(input.file_path)
    // ZCode's Read opens images too (read-image.ts: the model gets the picture, the result only a placeholder): the
    // transcript shows the image GLM looked at. A failed or declined read keeps the read row with its reason.
    const image = IMAGE_FILE.test(file) || /^\[Attached image\//.test(String(result?.content ?? ''))
    if (image && file && status !== 'failed' && status !== 'declined') return { type: 'imageView', id, path: path.resolve(cwd || '/', file), status }
    return {
      type: 'commandExecution', id, pluginId: null, scriptPath: null, command: `Read ${file}`, cwd, processId: null, source: 'agent', status,
      commandActions: [{ type: 'read', command: `Read ${file}`, name: path.basename(file), path: file }],
      aggregatedOutput: done ? output : null, exitCode: done ? (status === 'completed' ? 0 : status === 'failed' ? 1 : null) : null, durationMs,
    }
  }
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') {
    const file = text(input.file_path)
    const display = result?.display?.kind === 'file_diff' ? result.display : null
    const patchDiff = display ? diffFromStructuredPatch(display.structuredPatch) : null
    const isNew = tool === 'Write' && (display ? display.deletions === 0 && /^@@ -0,0 /.test(patchDiff ?? '@@ -0,0 ') : !call.existed)
    const change = tool === 'Write' && isNew
      ? { path: display?.filePath ?? file, kind: { type: 'add' }, diff: text(input.content) }
      : { path: display?.filePath ?? file, kind: { type: 'update', move_path: null }, diff: patchDiff ?? (tool === 'Write' ? text(input.content) : diffFromEdit(input)) }
    return { type: 'fileChange', id, status, changes: [change], ...(status === 'failed' && output ? { error: output } : {}) }
  }
  if (tool === 'WebSearch') {
    const query = text(input.query)
    return { type: 'webSearch', id, query, action: { type: 'search', query, queries: [query] }, results: done ? output : null, status, ...(status === 'failed' ? { error: { message: output ?? 'Search failed.' } } : {}) }
  }
  if (tool === 'WebFetch') {
    const url = text(input.url)
    return { type: 'webSearch', id, query: url, action: { type: 'openPage', url }, results: done ? output : null, status, ...(status === 'failed' ? { error: { message: output ?? 'Fetch failed.' } } : {}) }
  }
  const mcp = MCP_TOOL.exec(tool)
  if (mcp) {
    return {
      type: 'mcpToolCall', id, server: mcp[1], tool: mcp[2], status: status === 'declined' ? 'failed' : status, arguments: input, appContext: null, pluginId: null, readOnlyHint: null,
      result: done && status === 'completed' ? { content: [{ type: 'text', text: output ?? '' }], structuredContent: null } : null,
      error: done && status !== 'completed' ? { message: output ?? (status === 'declined' ? 'Declined.' : 'Failed.') } : null, durationMs,
    }
  }
  if (tool === 'Agent' || tool === 'Task' || tool === 'SendMessage') {
    const spawn = tool !== 'SendMessage'
    const receiver = spawn ? call.childThreadId : (typeof input.to === 'string' ? childSessionIdOf(input.to) : null)
    const states = {}
    if (receiver) states[receiver] = call.agentState ?? { status: done ? (status === 'completed' ? 'completed' : status === 'interrupted' ? 'interrupted' : 'errored') : 'running', message: done ? output : null }
    return {
      type: 'collabAgentToolCall', id, tool: spawn ? 'spawnAgent' : 'sendInput', status: status === 'declined' ? 'failed' : status,
      senderThreadId: threadId, receiverThreadIds: receiver ? [receiver] : [], prompt: text(spawn ? input.prompt : input.message) || null,
      model: null, reasoningEffort: null, agentsStates: states, ...(spawn && input.description ? { description: String(input.description) } : {}),
    }
  }
  return {
    type: 'dynamicToolCall', id, namespace: null, tool, arguments: input, status: status === 'declined' ? 'failed' : status,
    contentItems: done && output ? [{ type: 'inputText', text: output }] : null,
    success: done ? status === 'completed' : null, durationMs,
  }
}

/** The plan item the plan card opens (ExitPlanMode's plan). */
export const planItem = (callId, input) => ({ type: 'plan', id: `plan-${callId}`, text: text(input?.plan) })
