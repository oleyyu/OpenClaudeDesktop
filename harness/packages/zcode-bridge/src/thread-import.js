/**
 * codeDesktop/thread/import: a conversation from another coding agent (OpenClaude Desktop's Import Chat History,
 * app/electron/chat-import) as a native ZCode session the user continues here.
 *
 * ZCode has its own, supported way to create a session that starts with prior history: `session/create` takes
 * `importedHistory` (ZCode Protocol, packages/shared/src/zcode-protocol/index.ts zcodeSessionCreateParamsSchema
 * :1979-2003, zcodeSessionImportHistorySchema :1136-1175). The ZCode app's own "import Claude Code sessions" uses it
 * (packages/services/src/zcode-agent/zcodeTaskServiceAdapter.ts importClaudeSessions :2762-2786: `persistence:
 * 'immediate'` plus `importedHistory: {source: 'claudeCode', title, createdAt, updatedAt, messages: [{role, content,
 * timestamp}]}`). The agent writes the session itself, inside session/create and before the session's runtime resumes
 * (apps/zcode-cli/packages/bootstrap/src/zcode-protocol/server-operations.ts persistImportedSessionHistory
 * :1033-1245, createSession :1375-1387): a new session row (title, titleSource 'custom'), then per message a user or
 * a finished assistant message (`${sessionId}_import_<n>` ids, timestamps made strictly increasing) with one text part,
 * all tagged metadata.migrationSource. So the bridge never writes ZCode's database: the session id is ZCode's own new
 * one (createSessionWithProjection :1279-1287 refuses an existing id), no existing session is touched, and the history
 * is what ZCode itself replays to the model on the next turn.
 *
 * `source` is a closed set (claudeCode | sharedContext); 'claudeCode' is the plain role/text form, so every import
 * uses it whatever the real origin (that only names ZCode's migrationSource tag; the real origin stays in the bridge's
 * threads.json `importedFrom`). The messages arrive already flattened to text (chat-import convert.mjs toDshSeed: tool
 * calls and results folded into the assistant's text, injected context and opaque reasoning dropped).
 *
 * @module zcode-bridge/thread-import
 */

import { invalidParams } from './transport.js'

// Hard bounds on one request, as the DeepSeek bridge's (codex-app-server thread-import.js) and main.cjs importCoreThread.
export const IMPORT_MAX_MESSAGES = 5000
export const IMPORT_MAX_CHARS = 4_000_000
// The prompt that opens a conversation whose first recorded message is the assistant's (one user/assistant pair per turn
// in the bridge's history view, history.js turnsFromMessages, and in the provider replay).
export const IMPORT_OPENING = '(Continuing a conversation imported from another coding agent.)'
// ZCode's own fallback title (server-operations.ts :1159) when neither a title nor a first prompt names the session.
export const IMPORT_DEFAULT_TITLE = 'Imported session'
// The one importedHistory form that carries plain role/text messages (zcodeSessionImportHistorySchema).
export const IMPORT_SOURCE = 'claudeCode'
const TITLE_MAX = 200
const FIELD_MAX = 1000

const validTs = (value) => Number.isSafeInteger(value) && value > 0

/**
 * The request's messages as alternating turns: roles user / assistant only, blank texts dropped, consecutive messages
 * of one role joined, and a conversation that starts with a reply opened by IMPORT_OPENING. A trailing prompt keeps no
 * reply (the user's next message answers after it). A timestamp ahead of `now` (a source clock ahead of this one) is
 * dropped, so ZCode never orders the next live message before the imported ones.
 * @param {unknown} raw params.messages
 * @param {number} [now]
 * @returns {Array<{role: 'user' | 'assistant', text: string, ts?: number}>}
 * @throws INVALID_PARAMS for a missing, oversized or empty conversation
 */
export function importMessages(raw, now = Date.now()) {
  if (!Array.isArray(raw)) throw invalidParams('messages must be an array of {role, text}.')
  if (raw.length > IMPORT_MAX_MESSAGES) throw invalidParams(`An imported conversation can have at most ${IMPORT_MAX_MESSAGES} messages.`)
  let chars = 0
  const out = []
  for (const message of raw) {
    const role = message?.role
    if (role !== 'user' && role !== 'assistant') continue
    const text = typeof message.text === 'string' ? message.text.trim() : ''
    if (!text) continue
    chars += text.length
    if (chars > IMPORT_MAX_CHARS) throw invalidParams('The imported conversation is too long.')
    const ts = validTs(message.ts) && message.ts <= now ? message.ts : undefined
    const last = out.at(-1)
    if (last?.role === role) last.text += `\n\n${text}`
    else out.push({ role, text, ...(ts ? { ts } : {}) })
  }
  if (!out.length) throw invalidParams('The imported conversation has no messages.')
  if (out[0].role === 'assistant') out.unshift({ role: 'user', text: IMPORT_OPENING, ...(out[0].ts ? { ts: out[0].ts } : {}) })
  return out
}

/** The session title: the request's (one line, 200 characters), else the first prompt's start, else ZCode's own. */
export function importTitle(title, messages = []) {
  const line = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')
  const own = line(title)
  if (own) return own.slice(0, TITLE_MAX)
  const first = messages.find((message) => message.role === 'user' && message.text !== IMPORT_OPENING)
  const prompt = line(first?.text)
  return prompt ? (prompt.length > 80 ? `${prompt.slice(0, 79)}…` : prompt) : IMPORT_DEFAULT_TITLE
}

/**
 * session/create's `importedHistory` for a conversation (zcodeSessionImportHistorySchema, `.strict()`: exactly these
 * keys; messages `{role, content, timestamp?}` with timestamps non-negative integers in ms). createdAt / updatedAt are
 * the import time, so the new session sorts as the newest in ZCode's list and in OpenClaude Desktop's sidebar (ZCode
 * would otherwise date the session by its first and last message: server-operations.ts :1046-1056).
 * @param {{ title?: unknown, messages: unknown }} params
 * @param {number} [now]
 */
export function importedHistoryOf(params, now = Date.now()) {
  const messages = importMessages(params?.messages, now)
  return {
    source: IMPORT_SOURCE,
    title: importTitle(params?.title, messages),
    createdAt: now,
    updatedAt: now,
    messages: messages.map((message) => ({ role: message.role, content: message.text, ...(message.ts ? { timestamp: message.ts } : {}) })),
  }
}

/**
 * session/create params for an import: the thread/start ones plus importedHistory, persisted at once (`immediate`,
 * as the ZCode app imports: an imported session is a real, listed session from the first moment, not a draft).
 */
export function importCreateParams(createParams, importedHistory) {
  return { ...createParams, persistence: 'immediate', importedHistory }
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
  out.importedAt = validTs(value.importedAt) ? value.importedAt : now
  return out
}

/**
 * After session/create made the session (server.js importThread): its history read back as the bridge shows it, which
 * must hold the imported messages, then the provenance kept. Any failure from here on — the history unreadable or
 * empty (an agent that took the request but not the field), the bookkeeping — deletes the new session (`discard`)
 * before the error goes back, so the app's fallback (the text handoff) never leaves a duplicate or empty ZCode session.
 * @param {{ thread: { id: string } }} response thread/start's answer for the new session
 * @param {{ thread: object | undefined, historyOf: (thread: object) => Promise<{turns: object[]}>, excludeTurns: boolean,
 *   remember: () => void, discard: () => Promise<unknown>, fail: (message: string) => Error }} deps
 */
export async function finishImport(response, { thread, historyOf, excludeTurns, remember, discard, fail }) {
  try {
    if (!thread) throw fail('ZCode created the session but it is not loaded.')
    const { turns } = await historyOf(thread)
    if (!turns.some((turn) => turn.items.some((item) => item.type === 'userMessage' || item.type === 'agentMessage'))) {
      throw fail('ZCode created the session without the imported history.')
    }
    remember()
    if (!excludeTurns) response.thread.turns = turns
    return response
  } catch (error) {
    await discard()
    throw error instanceof Error && Number.isInteger(error.code) ? error : fail(`ZCode could not finish the import: ${error?.message ?? error}`)
  }
}

/** The thread/start params of an import request: everything but the import's own fields. */
export function startParamsOf(params) {
  const { messages: _messages, importedFrom: _from, title: _title, turns: _turns, ...rest } = params ?? {}
  return rest
}
