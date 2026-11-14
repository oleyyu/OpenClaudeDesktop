/**
 * How an imported conversation shows (codeDesktop/thread/import, thread-import.js).
 *
 * The agent holds each imported reply as one text with its tool calls folded in (chat-import convert.mjs toolBlock:
 * `[Tool: name]`, the arguments, `[Result]`, the output), which would show every call as prose. The request also names
 * the reply's blocks (`parts`: the same text block by block, tool calls marked). The bridge keeps where they sit in
 * each reply (importDisplayIndex → the thread's `importBlocks` in threads.json: no text, only offsets under a digest
 * of the reply) and its history view cuts a stored reply back along them: prose stays prose, a tool call becomes a
 * settled tool row. Display only: what the agent stores and replays to the model is the text, as it was imported.
 *
 * A reply is found by its text (length and digest), not by a message id, so a fork of the session — the same texts
 * under new ids — shows the same rows once the index is copied to it; a text the agent changed matches nothing and
 * shows as it is.
 */
import { createHash } from 'node:crypto'

// The text form of an imported tool call (chat-import convert.mjs toolBlock): name, arguments, result. The same form
// the Harness bridge reads (codex-app-server thread-import.js importedToolItem).
const IMPORTED_TOOL = /^\[Tool: ([^\n]{1,300})\]\n(?:([\s\S]*?)\n)?\[Result(?: \((error|exit -?\d+)\))?\](?:\n([\s\S]*))?$/

/**
 * The display item of one imported tool call: a settled dynamicToolCall (the app's collapsed tool row), or null when
 * the text is not exactly one tool block.
 * @param {string} id item id
 * @param {string} text the block's text
 */
export function importedToolItem(id, text) {
  const match = typeof text === 'string' ? IMPORTED_TOOL.exec(text) : null
  if (!match) return null
  const failed = match[3] !== undefined
  return { type: 'dynamicToolCall', id, namespace: null, tool: match[1], arguments: match[2] ? { input: match[2] } : {}, status: failed ? 'failed' : 'completed',
    contentItems: match[4] ? [{ type: 'inputText', text: match[4] }] : [], success: !failed, durationMs: null }
}

/**
 * The request's replies that hold a tool call, each as its blocks in order: the assistant messages between two
 * prompts (importMessages joins them into one reply), a message's `parts` when they spell its text exactly, else the
 * message as one prose block. Blocks are trimmed; blank ones are dropped.
 * @param {unknown} messages params.messages ({role, text, parts?: [{text, tool?}]})
 * @returns {Array<Array<{text: string, tool: boolean}>>}
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
    const blocks = parts.map((part) => ({ text: part.text.trim(), tool: part.tool === true })).filter((block) => block.text)
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

/**
 * The display index of an import, kept with the thread: for every stored reply that holds a tool call, the spans of
 * its blocks under the reply's key (its length and a digest of it). null when no reply has a tool call to show.
 * @param {unknown} messages params.messages (with parts)
 * @param {string[]} replies the replies' texts as they were handed to the agent
 * @returns {Record<string, Array<[number, number, number]>> | null}
 */
export function importDisplayIndex(messages, replies) {
  const known = importReplyBlocks(messages)
  const index = {}
  for (const reply of Array.isArray(replies) ? replies : []) {
    const text = typeof reply === 'string' ? reply.trim() : ''
    if (!text) continue
    for (const blocks of known) {
      const spans = blockSpans(text, blocks)
      if (spans) { index[keyOf(text)] = spans; break }
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
 * @returns {Array<{text: string, tool: boolean}> | null}
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
    const [start, end, tool] = Array.isArray(span) ? span : []
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < position || end <= start || end > reply.length) return null
    blocks.push({ text: reply.slice(start, end), tool: tool === 1 })
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
    return (block.tool && importedToolItem(itemId, block.text)) || prose(itemId, block.text)
  })
}
