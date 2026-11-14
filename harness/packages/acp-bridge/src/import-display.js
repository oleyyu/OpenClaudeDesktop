/**
 * How an imported conversation shows (codeDesktop/thread/import, server.js importThread).
 *
 * The agent holds each imported reply as one text with its tool calls folded in (chat-import convert.mjs toolBlock:
 * `[Tool: name]`, the arguments, `[Result]`, the output), and session/load replays it as one agent message — which
 * would show every call as prose. The request also names the reply's blocks (`parts`: the same text block by block,
 * tool calls marked), so the replayed text is cut back along them: prose stays prose, a tool call becomes a settled
 * tool row. Display only: the agent's session is not touched, and a turn keeps its id, its prompt and its place, so
 * rewind and fork still line up with what the agent holds.
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
 * prompts (every adapter joins them into one reply), a message's `parts` when they spell its text exactly, else the
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
        const tool = block.tool ? importedToolItem(items.length === before ? item.id : nextId('imported-tool'), block.text) : null
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
