/**
 * codeDesktop/thread/import: a conversation from another coding agent (OpenClaude Desktop's Import Chat History,
 * app/electron/chat-import) as a native Harness session the user continues here.
 *
 * The messages arrive already flattened to text (chat-import convert.mjs toDshSeed: tool calls and results folded into
 * the assistant's text, injected context and opaque reasoning dropped). They become the seed of a new session, the
 * way thread/fork seeds one (fork.js, dsh-session buildForkSeed): an exact, closed event prefix followed by the
 * `session/end-seed {inherited: true}` marker, with `inheritedEventCount` naming the cut. The header is seeded but
 * names no `parentSession`, so the thread is no fork (subagents.js threadLineage) and nothing hides the history
 * (index.js inheritedHistoryFor: only sub-agents hide it).
 *
 * Every turn has the shape the agent loop logs (dsh-agent-loop turn()/step()): `turn/start`, `step/start`, the human
 * `user/message` (source.kind 'user': a prompt bubble and the Codex turn id `turn-<message id>`, projection.js),
 * one settled `assistant/message` (`stream: []`, dsh-session assertAssistantSettlementShape), `step/end` and
 * `turn/end {reason: completed}`. That satisfies dsh-session's invariant checker (types/invariant.js validateEvent):
 * contiguous seqs from 0, one open turn and step at a time numbered 1.., step-scoped messages inside their step, and no
 * tool/call or tool/result at all, so no orphan pair. The first step also reserves surface node 0 with an empty
 * `system/message`, as the loop's first prompt does (SystemPromptProjection: "the first prompt, even empty, reserves
 * surface node 0"), so the system prompt the next live step renders replaces that node instead of landing after the
 * imported history.
 *
 * @module @code-desktop/dsh-codex-app-server/thread-import
 */

import { createAssistantMessage, createSystemMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { invalidParams } from './transport.js'

// Hard bounds on one request (the app trims long conversations first: chat-import targets.mjs).
export const IMPORT_MAX_MESSAGES = 5000
export const IMPORT_MAX_CHARS = 4_000_000
// The prompt that opens a conversation whose first recorded message is the assistant's.
export const IMPORT_OPENING = '(Continuing a conversation imported from another coding agent.)'
const FIELD_MAX = 1000

/**
 * The request's messages as alternating turns: roles user / assistant only, blank texts dropped, consecutive messages
 * of one role joined (one prompt, one reply per turn), and a conversation that starts with a reply opened by
 * IMPORT_OPENING. A trailing prompt keeps no reply.
 * @param {unknown} raw params.messages
 * @returns {Array<{role: 'user' | 'assistant', text: string, ts?: number}>}
 * @throws INVALID_PARAMS for a missing, oversized or empty conversation
 */
export function importMessages(raw) {
  if (!Array.isArray(raw)) throw invalidParams('messages must be an array of {role, text}.')
  if (raw.length > IMPORT_MAX_MESSAGES) throw invalidParams(`An imported conversation can have at most ${IMPORT_MAX_MESSAGES} messages.`)
  let chars = 0
  const out = []
  for (const message of raw) {
    const role = message?.role
    if (role !== 'user' && role !== 'assistant') continue
    // parts (the app's toDshSeed): the message block by block, tool calls marked; the message's text is then their
    // join, so the model reads exactly what the blocks hold. A tool block's call (importedCall) is how its row shows.
    const given = role === 'assistant' && Array.isArray(message.parts) ? message.parts.filter((part) => typeof part?.text === 'string' && part.text.trim()).map((part) => {
      const call = part.tool === true ? importedCall(part.call) : null
      return { text: part.text.trim(), ...(part.tool === true ? { tool: true, ...(call ? { call } : {}) } : {}) }
    }) : []
    const parts = given.length ? given : [{ text: typeof message.text === 'string' ? message.text.trim() : '' }]
    const text = parts.map((part) => part.text).join('\n\n')
    if (!text) continue
    chars += text.length
    if (chars > IMPORT_MAX_CHARS) throw invalidParams('The imported conversation is too long.')
    const ts = Number.isSafeInteger(message.ts) && message.ts > 0 ? message.ts : undefined
    const last = out.at(-1)
    if (last?.role === role) { last.text += `\n\n${text}`; last.parts.push(...parts) }
    else out.push({ role, text, parts, ...(ts ? { ts } : {}) })
  }
  if (!out.length) throw invalidParams('The imported conversation has no messages.')
  for (const message of out) if (message.role !== 'assistant' || !message.parts.some((part) => part.tool)) delete message.parts
  if (out[0].role === 'assistant') out.unshift({ role: 'user', text: IMPORT_OPENING, ...(out[0].ts ? { ts: out[0].ts } : {}) })
  return out
}

/**
 * The seed events of an imported session.
 * @param {Array<{role: 'user' | 'assistant', text: string, ts?: number}>} messages importMessages' output
 * @param {{ provider: string, model: string, now?: number }} route the assistant messages' source (the new thread's route)
 * @returns {{ seed: object[], inheritedEventCount: number }} the events plus the inherited marker; the count excludes the marker
 */
export function importSeed(messages, { provider, model, now = Date.now() }) {
  if (typeof provider !== 'string' || !provider || typeof model !== 'string' || !model) throw new Error('importSeed needs the thread route (provider and model).')
  const events = []
  // Event times never go backwards and never pass now (a source clock ahead of this one).
  let clock = 0
  const timeOf = (ts) => {
    clock = Math.max(clock, Math.min(Number.isSafeInteger(ts) && ts > 0 ? ts : now, now))
    return clock
  }
  const push = (type, data, time, surface = false) => {
    events.push({ type, seq: events.length, time, data, ...(surface ? { surfaceOp: 'append' } : {}) })
  }
  let turn = 0
  for (let index = 0; index < messages.length; index++) {
    const prompt = messages[index]
    if (prompt.role !== 'user') continue
    const reply = messages[index + 1]?.role === 'assistant' ? messages[index + 1] : null
    turn += 1
    const started = timeOf(prompt.ts)
    push('turn/start', { turn }, started)
    push('step/start', { turn, step: 1 }, started)
    if (turn === 1) push('system/message', { turn, step: 1, message: createSystemMessage('') }, started, true)
    push('user/message', createUserMessage({ content: [{ type: 'text', text: prompt.text }], source: { kind: 'user' } }), started, true)
    const ended = reply ? timeOf(reply.ts) : started
    if (reply) {
      // One text block per part: the model reads the same text, and projection.js shows a `[Tool: …]` block of a
      // seeded reply as a collapsed tool row instead of prose (importedToolItem). The blocks' calls ride on the event,
      // beside the message (importedCalls, by content index): the model is never handed them.
      const parts = reply.parts ?? [{ text: reply.text }]
      const content = parts.map((part) => ({ type: 'text', text: part.text }))
      const message = createAssistantMessage({ content, source: { provider, model } })
      const calls = parts.map((part) => part.call ?? null)
      push('assistant/message', { turn, step: 1, message, stream: [], ...(calls.some(Boolean) ? { importedCalls: calls } : {}) }, ended, true)
    }
    push('step/end', { turn, step: 1 }, ended)
    push('turn/end', { turn, reason: { kind: 'completed' } }, ended)
  }
  const inheritedEventCount = events.length
  push('session/end-seed', { inherited: true }, clock || now)
  return { seed: events, inheritedEventCount }
}

/**
 * The provenance the bridge keeps with the thread (store.js threads.json `importedFrom`): plain short strings and an
 * import time, nothing else from the request.
 * @param {unknown} value params.importedFrom
 * @param {number} [now]
 * @returns {{ source: string, sourceId?: string, title?: string, sourcePath?: string, importedAt: number } | null}
 */
export function importedFromOf(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const text = (field) => (typeof value[field] === 'string' && value[field].trim() ? value[field].trim().slice(0, FIELD_MAX) : undefined)
  const source = text('source')
  if (!source) return null
  const out = { source }
  for (const field of ['sourceId', 'title', 'sourcePath']) {
    const entry = text(field)
    if (entry) out[field] = entry
  }
  out.importedAt = Number.isSafeInteger(value.importedAt) && value.importedAt > 0 ? value.importedAt : now
  return out
}

// The app's text form of an imported tool call (chat-import convert.mjs toolBlock): name, arguments, result.
const IMPORTED_TOOL = /^\[Tool: ([^\n]{1,300})\]\n(?:([\s\S]*?)\n)?\[Result(?: \((error|exit -?\d+)\))?\](?:\n([\s\S]*))?$/
// A second `[Tool: …]` opener inside the result: the block holds more than this one call, so it is the whole reply of
// a sender that gave no parts, not a tool row — its trailing `([\s\S]*)$` would otherwise swallow the later calls and
// the reply's own prose into this one row's output.
const IMPORTED_TOOL_NEXT = /^\[Tool: [^\n]{1,300}\]$/m

// A tool block's `call` (the app's chat-import convert.mjs toolCallDisplay, redacted like the text): the item the
// transcript shows for the call, without its id, status or result — a command row, a file change with its diff, a
// read / search / listing, a web call, an MCP or other tool with its arguments. Only these types and fields are taken
// (the same check as the other bridges' import-display.js).
const CALL_TYPES = new Set(['commandExecution', 'fileChange', 'webSearch', 'mcpToolCall', 'dynamicToolCall'])
const ACTION_TYPES = new Set(['unknown', 'read', 'search', 'listFiles'])
const CHANGE_KINDS = new Set(['add', 'update', 'delete'])
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const strings = (value, fields) => Object.fromEntries(fields.filter((field) => typeof value[field] === 'string').map((field) => [field, value[field]]))

/**
 * A part's call, checked: {type, command?, cwd?, commandActions?, exitCode?, changes?, query?, action?, server?, tool?,
 * arguments?, output?}, or null (no call, an unknown type, a file change without a file).
 * @param {unknown} value
 */
export function importedCall(value) {
  if (!isRecord(value) || !CALL_TYPES.has(value.type)) return null
  const out = { type: value.type, ...strings(value, ['command', 'cwd', 'query', 'server', 'tool', 'output']) }
  if (Number.isSafeInteger(value.exitCode)) out.exitCode = value.exitCode
  if (isRecord(value.arguments)) out.arguments = value.arguments
  const actions = Array.isArray(value.commandActions) ? value.commandActions.filter((action) => isRecord(action) && ACTION_TYPES.has(action.type)).slice(0, 4)
    .map((action) => ({ ...strings(action, ['type', 'command', 'name', 'path', 'query', 'tool']), ...(action.path === null ? { path: null } : {}), ...(isRecord(action.arguments) ? { arguments: action.arguments } : {}) })) : []
  if (actions.length) out.commandActions = actions
  if (isRecord(value.action) && ['search', 'openPage', 'findInPage'].includes(value.action.type)) {
    out.action = { ...strings(value.action, ['type', 'url', 'query', 'pattern']), ...(Array.isArray(value.action.queries) ? { queries: value.action.queries.filter((query) => typeof query === 'string') } : value.action.type === 'search' ? { queries: null } : {}) }
  }
  const changes = Array.isArray(value.changes) ? value.changes.filter((change) => isRecord(change) && typeof change.path === 'string' && change.path && CHANGE_KINDS.has(change.kind?.type)).slice(0, 100)
    .map((change) => ({ path: change.path, kind: change.kind.type === 'update' ? { type: 'update', move_path: typeof change.kind.move_path === 'string' ? change.kind.move_path : null } : { type: change.kind.type }, diff: typeof change.diff === 'string' ? change.diff : '' })) : []
  if (changes.length) out.changes = changes
  return out.type === 'fileChange' && !out.changes ? null : out
}

/** A tool block's arguments line as an arguments object: its JSON object, else {input}. */
function argumentsOf(input) {
  if (!input) return {}
  try { const value = JSON.parse(input); if (isRecord(value)) return value } catch {}
  return { input }
}

/**
 * The display item of an imported tool call for a text block that is exactly one `[Tool: …]` block, else null.
 * Display only; the session keeps the text for the model. With the block's call (importedCall, the event's
 * importedCalls): the item it names — commandExecution, fileChange, webSearch, mcpToolCall or dynamicToolCall —, settled
 * from the block's result (its output, `(error)` or `(exit N)`), whatever the call leaves out read from the block.
 * Without one (a sender that gave no call, a session imported before calls were sent): a settled dynamicToolCall (the
 * app's collapsed tool row) holding the text's arguments line.
 * @param {string} id item id
 * @param {string} text the block's text
 * @param {unknown} [call] the block's call
 */
export function importedToolItem(id, text, call) {
  const match = typeof text === 'string' ? IMPORTED_TOOL.exec(text) : null
  if (!match) return null
  const shown = importedCall(call)
  if (!shown) {
    if (match[4] && IMPORTED_TOOL_NEXT.test(match[4])) return null
    const failed = match[3] !== undefined
    return { type: 'dynamicToolCall', id, namespace: null, tool: match[1], arguments: match[2] ? { input: match[2] } : {}, status: failed ? 'failed' : 'completed',
      contentItems: match[4] ? [{ type: 'inputText', text: match[4] }] : [], success: !failed, durationMs: null }
  }
  const input = match[2] ?? ''
  const output = shown.output ?? match[4] ?? ''
  const exit = /^exit (-?\d+)$/.exec(match[3] ?? '')
  const exitCode = shown.exitCode ?? (exit ? Number(exit[1]) : match[3] ? 1 : 0)
  const failed = match[3] !== undefined || (shown.type === 'commandExecution' && exitCode !== 0)
  const status = failed ? 'failed' : 'completed'
  switch (shown.type) {
    case 'commandExecution': {
      const command = shown.command ?? input
      return { type: 'commandExecution', id, command, cwd: shown.cwd ?? '', processId: null, source: 'agent', status, commandActions: shown.commandActions ?? [{ type: 'unknown', command }],
        aggregatedOutput: output, exitCode, durationMs: null }
    }
    case 'fileChange': return { type: 'fileChange', id, changes: shown.changes, status }
    case 'webSearch': {
      const query = shown.query ?? input
      const action = shown.action ?? (/^https?:\/\/\S+$/.test(query) ? { type: 'openPage', url: query } : { type: 'search', query, queries: null })
      return { type: 'webSearch', id, query, action, results: failed || !output ? null : output, ...(failed ? { error: { message: output } } : {}), status }
    }
    case 'mcpToolCall':
      return { type: 'mcpToolCall', id, server: shown.server ?? '', tool: shown.tool ?? match[1], status, arguments: shown.arguments ?? argumentsOf(input), appContext: null, pluginId: null, readOnlyHint: null,
        result: failed ? null : { content: output ? [{ type: 'text', text: output }] : [], structuredContent: null }, error: failed ? { message: output } : null, durationMs: null }
    default:
      return { type: 'dynamicToolCall', id, namespace: null, tool: shown.tool ?? match[1], arguments: shown.arguments ?? argumentsOf(input), status,
        contentItems: output ? [{ type: 'inputText', text: output }] : [], success: !failed, durationMs: null }
  }
}
