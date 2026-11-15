/**
 * How an imported conversation shows (codeDesktop/thread/import, server.js importThread).
 *
 * The agent holds each imported reply as one text with its tool calls folded in (chat-import convert.mjs toolBlock:
 * `[Tool: name]`, the arguments, `[Result]`, the output), and session/load replays it as one agent message — which
 * would show every call as prose. The request also names the reply's blocks (`parts`: the same text block by block,
 * tool calls marked), so the replayed text is cut back along them: prose stays prose, a tool call becomes a settled
 * tool row — the row its block's `call` names (the command, the file and its diff, the search or the URL, as a native
 * call of the agent shows), else one holding the text's arguments line. Display only: the agent's session is not
 * touched, and a turn keeps its id, its prompt and its place, so rewind and fork still line up with what the agent holds.
 *
 * The text is matched from its end, block by block, because an adapter may put something before it (Kimi's note that
 * earlier turns were left out, or the cut end of a turn that alone is over the budget): what is left at the front
 * stays prose. A reply whose text matches no blocks is left as it was replayed.
 *
 * @module acp-bridge/import-display
 */

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

/**
 * The request's replies that hold a tool call, each as its blocks in order: the assistant messages between two
 * prompts (every adapter joins them into one reply), a message's `parts` when they spell its text exactly, else the
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
 * How much of `text`'s end the blocks spell, walking back from the last block: each block's text, then the line break
 * and white space that separate it from the next. A block has to start the text or a line of its own.
 * @param {string} text a replayed reply
 * @param {Array<{text: string}>} blocks one reply's blocks
 * @returns {{ matched: number, head: string }} how many of the last blocks matched, and the text before them
 */
export function matchReplyBlocks(text, blocks) {
  let position = text.length
  let matched = 0
  for (let index = blocks.length - 1; index >= 0; index--) {
    let end = position
    while (end > 0 && isSpace(text[end - 1])) end--
    const block = blocks[index].text
    const start = end - block.length
    if (!block || start < 0 || !text.startsWith(block, start)) break
    // Blocks are joined by a blank line: the next one begins after a line break, this one on a line of its own.
    if (matched && !text.slice(end, position).includes('\n')) break
    let lineStart = start
    while (lineStart > 0 && (text.charCodeAt(lineStart - 1) === 32 || text.charCodeAt(lineStart - 1) === 9)) lineStart--
    if (lineStart > 0 && text.charCodeAt(lineStart - 1) !== 10) break
    position = start
    matched++
  }
  return { matched, head: text.slice(0, position) }
}

/**
 * The replay's turns with every imported reply cut along its blocks, in place: an agentMessage whose text ends with a
 * reply's blocks becomes one item per block (prose → agentMessage, a tool call → dynamicToolCall), after an
 * agentMessage for whatever text came before them. All of a reply's blocks are preferred; the cut end of a reply
 * (fewer blocks, from its last one back) is taken only when it holds a tool call. The first new item keeps the
 * replaced item's id.
 * @param {Array<{items: object[]}>} turns the thread's turns (ThreadProjector.turns)
 * @param {Array<Array<{text: string, tool: boolean}>>} replies importReplyBlocks' answer
 * @param {(prefix: string) => string} nextId new item ids
 * @returns {number} how many tool rows were made
 */
export function splitImportedReplies(turns, replies, nextId) {
  if (!Array.isArray(turns) || !Array.isArray(replies) || !replies.length) return 0
  let rows = 0
  for (const turn of turns) {
    if (!Array.isArray(turn?.items)) continue
    const items = []
    for (const item of turn.items) {
      const cut = item?.type === 'agentMessage' && typeof item.text === 'string' ? cutOf(item.text, replies) : null
      if (!cut) { items.push(item); continue }
      const before = items.length
      const prose = (text) => items.push({ ...item, id: items.length === before ? item.id : nextId('imported-msg'), text })
      if (cut.head.trim()) prose(cut.head.trim())
      for (const block of cut.blocks) {
        const tool = block.tool ? importedToolItem(items.length === before ? item.id : nextId('imported-tool'), block.text, block.call) : null
        if (tool) { items.push(tool); rows++ } else prose(block.text)
      }
    }
    turn.items = items
  }
  return rows
}

/** The blocks that end `text` (and the text before them), or null when none of the replies' tool calls is in it. */
function cutOf(text, replies) {
  let best = null
  for (const reply of replies) {
    const { matched, head } = matchReplyBlocks(text, reply)
    if (!matched) continue
    const blocks = reply.slice(reply.length - matched)
    if (!blocks.some((block) => block.tool && IMPORTED_TOOL.test(block.text))) continue
    if (matched === reply.length) return { blocks, head }
    if (!best || matched > best.blocks.length) best = { blocks, head }
  }
  return best
}
