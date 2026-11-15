/**
 * How an imported conversation shows (codeDesktop/thread/import, thread-import.js).
 *
 * The agent holds each imported reply as one text with its tool calls folded in (chat-import convert.mjs toolBlock:
 * `[Tool: name]`, the arguments, `[Result]`, the output), which would show every call as prose. The request also names
 * the reply's blocks (`parts`: the same text block by block, tool calls marked, each with its `call`: how its row
 * shows). The bridge keeps where they sit in each reply (importDisplayIndex → the thread's `importBlocks` in
 * threads.json: offsets under a digest of the reply, no prose or results; a tool block's call only for what its text
 * does not already say — a diff, a file action, a cwd —, bounded) and its history view cuts a stored reply back along
 * them: prose stays prose, a tool call becomes a settled tool row, the row its call names. Display only: what the agent
 * stores and replays to the model is the text, as it was imported.
 *
 * A reply is found by its text (length and digest), not by a message id, so a fork of the session — the same texts
 * under new ids — shows the same rows once the index is copied to it; a text the agent changed matches nothing and
 * shows as it is.
 */
import { createHash } from 'node:crypto'

// The text form of an imported tool call (chat-import convert.mjs toolBlock): name, arguments, result. The same form
// the Harness bridge reads (codex-app-server thread-import.js importedToolItem).
const IMPORTED_TOOL = /^\[Tool: ([^\n]{1,300})\]\n(?:([\s\S]*?)\n)?\[Result(?: \((error|exit -?\d+)\))?\](?:\n([\s\S]*))?$/

// A tool block's `call` (chat-import convert.mjs toolCallDisplay, redacted like the text): the item the transcript shows
// for the call, without its id, status or result — a command row, a file change with its diff, a read / search /
// listing, a web call, an MCP or other tool with its arguments. Only these types and fields are taken.
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
 * The display item of one imported tool call, or null when the text is not exactly one tool block. With the block's
 * call (importedCall): the item it names — commandExecution, fileChange, webSearch, mcpToolCall or dynamicToolCall —,
 * settled from the block's result (its output, `(error)` or `(exit N)`), and whatever field the call leaves out read
 * from the block (the command, query or arguments its text spells, the tool it names). Without one (a sender that gave
 * no call, a history imported before calls were sent): a settled dynamicToolCall holding the text's arguments line.
 * @param {string} id item id
 * @param {string} text the block's text
 * @param {unknown} [call] the block's call
 */
export function importedToolItem(id, text, call) {
  const match = typeof text === 'string' ? IMPORTED_TOOL.exec(text) : null
  if (!match) return null
  const shown = importedCall(call)
  if (!shown) {
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

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)
/**
 * A call without what its block's text already says (importedToolItem reads that from the text): the command or query
 * its arguments line spells, the arguments that line parses to, the tool it names, the output it holds, a command's
 * one plain action. What is left is what the index keeps — often only the type. null when the text is no tool block.
 * @param {unknown} call
 * @param {string} text the block's text
 */
export function slimCall(call, text) {
  const shown = importedCall(call)
  const match = typeof text === 'string' ? IMPORTED_TOOL.exec(text) : null
  if (!shown || !match) return null
  const input = match[2] ?? ''
  const out = { ...shown }
  if (out.command === input) delete out.command
  if (out.query === input) delete out.query
  if (out.tool === match[1]) delete out.tool
  if (out.output === (match[4] ?? '')) delete out.output
  if (out.cwd === '') delete out.cwd
  if (out.arguments && sameJson(out.arguments, argumentsOf(input))) delete out.arguments
  const command = out.command ?? input
  if (out.commandActions?.length === 1 && sameJson(out.commandActions[0], { type: 'unknown', command })) delete out.commandActions
  const query = out.query ?? input
  if (out.action && sameJson(out.action, /^https?:\/\/\S+$/.test(query) ? { type: 'openPage', url: query } : { type: 'search', query, queries: null })) delete out.action
  return out
}

/**
 * The request's replies that hold a tool call, each as its blocks in order: the assistant messages between two
 * prompts (importMessages joins them into one reply), a message's `parts` when they spell its text exactly, else the
 * message as one prose block. Blocks are trimmed; blank ones are dropped; a tool block keeps its call (importedCall).
 * @param {unknown} messages params.messages ({role, text, parts?: [{text, tool?, call?}]})
 * @returns {Array<Array<{text: string, tool: boolean, call?: object}>>}
 */
export function importReplyBlocks(messages) {
  const replies = []
  let current = null
  for (const message of Array.isArray(messages) ? messages : []) {
    const role = message?.role
    if (role !== 'user' && role !== 'assistant') continue
    const text = typeof message.text === 'string' ? message.text : ''
    if (!text.trim()) continue
    if (role === 'user') { current = null; continue }
    const parts = Array.isArray(message.parts) && message.parts.length && message.parts.every((part) => typeof part?.text === 'string')
      && message.parts.map((part) => part.text).join('\n\n') === text ? message.parts : [{ text }]
    const blocks = parts.map((part) => {
      const call = part.tool === true ? importedCall(part.call) : null
      return { text: part.text.trim(), tool: part.tool === true, ...(call ? { call } : {}) }
    }).filter((block) => block.text)
    if (!blocks.length) continue
    if (!current) { current = []; replies.push(current) }
    current.push(...blocks)
  }
  return replies.filter((reply) => reply.some((block) => block.tool))
}

// White space as String.prototype.trim sees it (the blocks are trimmed with it).
const isSpace = (char) => char.trim() === ''

/**
 * Where a reply's blocks sit in its text: [start, end, tool (1 | 0)] per block, when the text is exactly the blocks in
 * order with nothing but white space (a line break at least) between them; else null.
 * @param {string} text a reply as the agent stores it
 * @param {Array<{text: string, tool: boolean}>} blocks
 * @returns {Array<[number, number, number]> | null}
 */
export function blockSpans(text, blocks) {
  const spans = []
  let position = text.length
  for (let index = blocks.length - 1; index >= 0; index--) {
    let end = position
    while (end > 0 && isSpace(text[end - 1])) end--
    const block = blocks[index].text
    const start = end - block.length
    if (!block || start < 0 || !text.startsWith(block, start)) return null
    if (spans.length && !text.slice(end, position).includes('\n')) return null
    spans.unshift([start, end, blocks[index].tool ? 1 : 0])
    position = start
  }
  return spans.length && !text.slice(0, position).trim() ? spans : null
}

const keyOf = (text) => `${text.length}:${createHash('sha256').update(text).digest('base64url').slice(0, 22)}`

// What the index keeps of the calls (threads.json holds every thread's facts): each at most CALL_INDEX_CHARS (as
// JSON), all of them at most INDEX_CALLS_CHARS, the newest replies' first; a call past either shows from its text.
export const CALL_INDEX_CHARS = 16000
export const INDEX_CALLS_CHARS = 256000

/**
 * The display index of an import, kept with the thread: for every stored reply that holds a tool call, the spans of
 * its blocks under the reply's key (its length and a digest of it), a tool block's span with its call's rest (slimCall)
 * when that says more than the text and fits. null when no reply has a tool call to show.
 * @param {unknown} messages params.messages (with parts)
 * @param {string[]} replies the replies' texts as they were handed to the agent
 * @returns {Record<string, Array<[number, number, number] | [number, number, number, object]>> | null}
 */
export function importDisplayIndex(messages, replies) {
  const known = importReplyBlocks(messages)
  const index = {}
  let room = INDEX_CALLS_CHARS
  for (const reply of (Array.isArray(replies) ? replies : []).slice().reverse()) {
    const text = typeof reply === 'string' ? reply.trim() : ''
    if (!text) continue
    for (const blocks of known) {
      const spans = blockSpans(text, blocks)
      if (!spans) continue
      spans.forEach((span, n) => {
        const call = blocks[n].tool ? slimCall(blocks[n].call, blocks[n].text) : null
        const size = call ? JSON.stringify(call).length : 0
        if (call && size <= CALL_INDEX_CHARS && size <= room) { room -= size; span.push(call) }
      })
      index[keyOf(text)] = spans
      break
    }
  }
  return Object.keys(index).length ? index : null
}

const LENGTHS = new WeakMap()
/** The text lengths an index knows (most replies of a thread are not imported ones: no digest is taken for them). */
function lengthsOf(index) {
  let lengths = LENGTHS.get(index)
  if (!lengths) { lengths = new Set(Object.keys(index).map((key) => Number(key.slice(0, key.indexOf(':'))))); LENGTHS.set(index, lengths) }
  return lengths
}

/**
 * A stored reply cut along the index: its blocks, or null when the index does not know this text.
 * @param {unknown} text
 * @param {unknown} index importDisplayIndex's answer (the thread's importBlocks)
 * @returns {Array<{text: string, tool: boolean, call?: object}> | null}
 */
export function importedBlocks(text, index) {
  if (typeof text !== 'string' || !index || typeof index !== 'object' || Array.isArray(index)) return null
  const reply = text.trim()
  if (!reply || !lengthsOf(index).has(reply.length)) return null
  const spans = index[keyOf(reply)]
  if (!Array.isArray(spans) || !spans.length) return null
  const blocks = []
  let position = 0
  for (const span of spans) {
    const [start, end, tool, call] = Array.isArray(span) ? span : []
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < position || end <= start || end > reply.length) return null
    blocks.push({ text: reply.slice(start, end), tool: tool === 1, ...(tool === 1 && isRecord(call) ? { call } : {}) })
    position = end
  }
  return blocks
}

/**
 * The display items of an imported reply: one per block — a tool call's row (importedToolItem), else `prose(id, text)`.
 * The first keeps `id`, the others get `${id}-import-<n>` (the same on every read). null when the text is not an
 * imported reply the index knows.
 * @param {string} id the id the reply's one item would have
 * @param {unknown} text
 * @param {unknown} index
 * @param {(id: string, text: string) => object} prose the bridge's agentMessage item
 * @returns {object[] | null}
 */
export function importedItems(id, text, index, prose) {
  const blocks = importedBlocks(text, index)
  if (!blocks) return null
  return blocks.map((block, n) => {
    const itemId = n ? `${id}-import-${n}` : id
    return (block.tool && importedToolItem(itemId, block.text, block.call)) || prose(itemId, block.text)
  })
}
