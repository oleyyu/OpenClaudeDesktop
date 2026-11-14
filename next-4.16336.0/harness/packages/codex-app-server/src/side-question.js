/**
 * codeDesktop/sideQuestion: the app's `/btw` side chat (original
 * ca2ef848d Bw/fv: question + btwHistory against a conversation, streamed, and
 * nothing added to it). One auxiliary LLM call on the session's route, like
 * dsh-session-title-llm: the main session's turns become a read-only
 * transcript in a single user message, earlier side questions follow, then the
 * question. No tools, no session log entry, no change to the thread.
 */

export const SIDE_QUESTION_MAX_CONTEXT = 200_000
export const SIDE_QUESTION_MAX_TOKENS = 4096
const ITEM_TEXT_MAX = 4_000
const OUTPUT_MAX = 1_500

export const SIDE_QUESTION_SYSTEM = [
  'You answer a quick side question about an ongoing coding session between a user and an AI agent.',
  'The session transcript is context only: it is read-only, you cannot run tools or change files, and nothing you say is added to the session.',
  'Answer the side question directly and concisely, in the language the user asks in. If the transcript does not contain what is needed, say so briefly.',
].join(' ')

const clip = (text, max) => {
  const value = String(text ?? '')
  return value.length > max ? `${value.slice(0, max)}… [${value.length - max} more characters]` : value
}

/** One projected item as transcript lines, or '' for items with nothing to say. */
export function itemLines(item) {
  switch (item?.type) {
    case 'userMessage': {
      const text = (item.content ?? []).map((part) => (part?.type === 'text' ? part.text : part?.type === 'image' || part?.type === 'localImage' ? '[image]' : '')).filter(Boolean).join('\n')
      return text ? `User: ${clip(text, ITEM_TEXT_MAX)}` : ''
    }
    case 'agentMessage':
      return item.text ? `Assistant: ${clip(item.text, ITEM_TEXT_MAX)}` : ''
    case 'commandExecution': {
      const output = item.aggregatedOutput ? `\n${clip(item.aggregatedOutput, OUTPUT_MAX)}` : ''
      return `[ran: ${clip(item.command, 300)}${item.exitCode != null ? ` (exit ${item.exitCode})` : ''}]${output}`
    }
    case 'fileChange':
      return `[edited: ${(item.changes ?? []).map((change) => change?.path).filter(Boolean).join(', ') || 'files'}]`
    case 'mcpToolCall':
      return `[tool ${item.server}/${item.tool}]`
    case 'dynamicToolCall':
      return `[tool ${item.title || item.tool}]`
    case 'webSearch':
      return `[web search${item.query ? `: ${clip(item.query, 200)}` : ''}]`
    case 'plan':
      return item.text ? `[plan]\n${clip(item.text, ITEM_TEXT_MAX)}` : ''
    case 'contextCompaction':
      return '[earlier context was compacted]'
    default:
      return ''
  }
}

/**
 * The main session as plain text, newest kept when it is too long.
 * @returns {{text: string, messages: number, truncated: boolean}}
 */
export function sessionTranscript(turns, max = SIDE_QUESTION_MAX_CONTEXT) {
  const lines = []
  let messages = 0
  for (const turn of turns ?? []) for (const item of turn?.items ?? []) {
    const line = itemLines(item)
    if (!line) continue
    if (item.type === 'userMessage' || item.type === 'agentMessage') messages++
    lines.push(line)
  }
  let text = lines.join('\n\n'), truncated = false
  if (text.length > max) { text = `[earlier part omitted]\n\n${text.slice(text.length - max)}`; truncated = true }
  return { text, messages, truncated }
}

/** The single user message: transcript, earlier side Q&A, then the question. */
export function sideQuestionPrompt({ transcript, history = [], question }) {
  const parts = [`<session_transcript>\n${transcript || '(the session has no messages yet)'}\n</session_transcript>`]
  const earlier = history.filter((entry) => entry && typeof entry.question === 'string' && typeof entry.answer === 'string')
  if (earlier.length) parts.push(`<earlier_side_questions>\n${earlier.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`).join('\n\n')}\n</earlier_side_questions>`)
  parts.push(`Side question: ${question}`)
  return parts.join('\n\n')
}

/**
 * Stream one side answer. `onDelta(text)` gets each text delta.
 * @returns {Promise<{text: string, finish: string | undefined}>}
 */
export async function runSideQuestion({ llm, route, prompt, createUserMessage, signal, onDelta, maxTokens = SIDE_QUESTION_MAX_TOKENS }) {
  const messages = [createUserMessage({ content: [{ type: 'text', text: prompt }], source: { kind: 'code-desktop-side-question' } })]
  let text = '', finish
  for await (const chunk of llm.stream({ provider: route.provider, model: route.model, messages, system: SIDE_QUESTION_SYSTEM, maxTokens, purpose: 'side-question', signal })) {
    signal?.throwIfAborted()
    if (chunk?.type === 'text-delta' && chunk.text) { text += chunk.text; onDelta?.(chunk.text) }
    else if (chunk?.type === 'finish') finish = typeof chunk.reason === 'object' ? chunk.reason?.kind : chunk.reason
  }
  return { text, finish }
}
