/**
 * codeDesktop/thread/import: a conversation from another coding agent (OpenClaude Desktop's Import Chat History,
 * app/electron/chat-import) as a new OpenCode / MiMo Code session the user continues here, its earlier turns real
 * history the agent replays to the model, with no model request made for them. Never written to the agent's database
 * by the bridge: each server's own API does the writing.
 *
 *   OpenCode 1.x / MiMo   (the `serve` API this bridge drives: OpenCode 1.18.34, MiMo 0.1.15; MiMo HEAD 0.1.16 read)
 *                         thread/start's own session (POST /session), then the history as the agent's own sync events
 *                         through POST /sync/replay {directory, events} (MiMo packages/cli/src/server/routes/instance/
 *                         sync.ts:50-144, "Validate and replay a complete sync event history", the route OpenCode's
 *                         workspace sync replays sessions with). Each message is a `message.updated.1` event and its
 *                         text a `message.part.updated.1` (session/message-v2.ts:667,685); the projectors insert them
 *                         as if the agent had (session/projectors.ts:130,170), user and assistant alike — no public
 *                         route creates an assistant message, prompt {noReply} only a user one. replayAll checks one
 *                         aggregate, contiguous seqs, and each event's seq against the session's last
 *                         (sync/index.ts:176-221): it skips seqs it has and refuses a gap with "expected N". A session
 *                         POST /session made has a sequence row only when the experimental workspaces flag logged its
 *                         events (sync/index.ts:104-140, :119), so one probe event at REPLAY_PROBE_SEQ asks the server where
 *                         the sequence stands before the history goes in, in one transaction. The probe is the history's
 *                         own first event, for the session thread/start just made (replayHistory refuses events of any
 *                         other aggregate, and index.js appendHistory replays only into a session that is still empty):
 *                         a server with the gap check refuses it without writing anything (sync/index.ts replay
 *                         :194-198: the seq check runs before process()); one without keeps it as the first message
 *                         and the rest follow it; should the rest then fail, appendHistory deletes what landed before
 *                         the transcript goes in (or the import fails and the session is deleted).
 *                         Inferred, not read: OpenCode 1.18.34's own /sync/replay. The OpenCode source at hand is 2.x
 *                         HEAD (no /sync/replay route); the route, the events and the replay rules above are MiMo's (a
 *                         fork of OpenCode 1.x), assumed the same in OpenCode 1.18.34. Anything it answers differently
 *                         (a 404, a 400, a 200 that stores nothing) ends in the transcript fallback below, never in a
 *                         half import.
 *                         Ids: the prompt loop compares message ids (session/prompt.ts:5173,5210,5548: lastUser.id <
 *                         lastAssistant.id), so the imported ones must sort before every id the agent writes later,
 *                         in both id schemes (id/id.ts: v1 12 hex of a 48-bit clock that wrapped on 2026-08-14,
 *                         v2 'g' + 16 hex): `msg_000000…` / `prt_000000…` with an ascending counter (lowId).
 *                         Times are the source's (monotonic, never past now), so the list order stays (time, id).
 *   fallback              a server without the route (404), or one that refuses the events: the transcript as one
 *                         synthetic text part of a noReply prompt (a user message the model reads, the transcript
 *                         hides; projection.js isSyntheticUser), answered as import.mode 'transcript' so the app keeps
 *                         its own display of the imported turns.
 *   OpenCode 2.x          not wired yet (TODO(v2 merge): this worktree has no 2.x bridge path; index.js importThread
 *                         refuses and initialize leaves threadImport out on a 2.x server). The ready half: POST
 *                         /api/experimental/session/import {info, messages, location} (protocol/src/groups/
 *                         session.ts:188-203; core/src/session/transfer.ts:67-200): a NEW session with the whole
 *                         transcript, refused (409) when the id exists; only settled messages are kept (transfer.ts
 *                         :202 isSettled: an assistant needs time.completed), seqs 1.. in order. The info carries what
 *                         thread/start's POST /api/session would (id, agent, model, permissions, metadata, title,
 *                         location): v2ImportPayload turns that body into the import's, importSessionV2 posts it — for
 *                         the 2.x createSessionV2 to call instead of POST /api/session once the v2 bridge is merged.
 *
 * Messages arrive already flattened to text (chat-import convert.mjs toDshSeed: tool calls folded into the assistant's
 * text, injected context and opaque reasoning dropped); importMessages normalizes them as the Harness bridge does
 * (codex-app-server thread-import.js).
 */
import { randomBytes } from 'node:crypto'
import { invalidParams } from './transport.js'

// Hard bounds on one request (the app trims long conversations first: chat-import targets.mjs).
export const IMPORT_MAX_MESSAGES = 5000
export const IMPORT_MAX_CHARS = 4_000_000
// The prompt that opens a conversation whose first recorded message is the assistant's.
export const IMPORT_OPENING = '(Continuing a conversation imported from another coding agent.)'
// The probe event's seq: far past any session's, so a server that checks gaps names the one it expects.
export const REPLAY_PROBE_SEQ = 2 ** 40
// One probe event is quick; the history (one transaction, up to IMPORT_MAX_MESSAGES messages) may take a while.
export const REPLAY_PROBE_TIMEOUT_MS = 60000
export const REPLAY_TIMEOUT_MS = 300000
const FIELD_MAX = 1000
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * The request's messages as alternating turns: roles user / assistant only, blank texts dropped, consecutive messages
 * of one role joined, and a conversation that starts with a reply opened by IMPORT_OPENING.
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
    const text = typeof message.text === 'string' ? message.text.trim() : ''
    if (!text) continue
    chars += text.length
    if (chars > IMPORT_MAX_CHARS) throw invalidParams('The imported conversation is too long.')
    const ts = Number.isSafeInteger(message.ts) && message.ts > 0 ? message.ts : undefined
    const last = out.at(-1)
    if (last?.role === role) last.text += `\n\n${text}`
    else out.push({ role, text, ...(ts ? { ts } : {}) })
  }
  if (!out.length) throw invalidParams('The imported conversation has no messages.')
  if (out[0].role === 'assistant') out.unshift({ role: 'user', text: IMPORT_OPENING, ...(out[0].ts ? { ts: out[0].ts } : {}) })
  return out
}

/** The provenance kept in threads.json (`importedFrom`): plain short strings and an import time. */
export function importedFromOf(value, now = Date.now()) {
  if (!isRecord(value)) return null
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

export const importTitle = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 200) : '')

/**
 * Message times that always move forward and never pass now (a source clock ahead of this one). Strictly: each message
 * at least 1 ms after the one before, so no two share a time.created — rewind (index.js revert) cuts a turn and what
 * follows by `time.created >= turn start`, and messages that came without a time (or with equal ones) would otherwise
 * all fall on the first turn's side and go together. `count` (the messages to place) keeps the last of them at now.
 */
export function clockOf(now = Date.now(), count = 0) {
  const ceiling = now - Math.max(0, count)
  let clock = -Infinity
  return (ts) => { clock = Math.max(clock + 1, Math.min(Number.isSafeInteger(ts) && ts > 0 ? ts : ceiling, ceiling)); return clock }
}

const random62 = (length) => Array.from(randomBytes(length), (byte) => BASE62[byte % 62]).join('')

/** An OpenCode 1.x / MiMo id that sorts before every id the agent writes from now on (see the header): 26 chars. */
export function lowId(prefix, counter) {
  return `${prefix}_000000${counter.toString(16).padStart(6, '0')}${random62(14)}`
}

/** OpenCode 2.x's identifier (schema/src/identifier.ts:16-32): 12 hex of time·4096+counter (inverted descending), 14 base62. */
export function v2Identifier(descending, timestamp = Date.now(), counter = 1) {
  const current = BigInt(timestamp) * 0x1000n + BigInt(counter)
  const value = descending ? ~current : current
  const time = Array.from({ length: 6 }, (_, index) => Number((value >> BigInt(40 - 8 * index)) & 0xffn).toString(16).padStart(2, '0')).join('')
  return time + random62(14)
}

// ------------------------------------------------------------------ OpenCode 1.x / MiMo

const ZERO_TOKENS = Object.freeze({ input: 0, output: 0, reasoning: 0, cache: Object.freeze({ read: 0, write: 0 }) })

/**
 * The sync events that put `messages` into session `sessionID` (seq left to replayHistory): per message a
 * message.updated.1 with the full Info (MessageV2 User / Assistant, message-v2.ts:550,601: the projector parses it)
 * and a message.part.updated.1 with its text part. Assistant messages are settled replies of the thread's own
 * agent and model (finish 'stop', time.completed), parented on the prompt they answer.
 * @param {{ sessionID: string, cwd: string, agent: string, model: {providerID: string, modelID: string}, messages: Array<{role, text, ts?}>, now?: number }} input
 */
export function replayEvents({ sessionID, cwd, agent, model, messages, now = Date.now() }) {
  const timeOf = clockOf(now, messages.length)
  const events = []
  let counter = 0, parts = 0, parent = null
  const event = (type, data) => events.push({ id: lowId('evt', events.length + 1), aggregateID: sessionID, type, data })
  for (const message of messages) {
    const created = timeOf(message.ts)
    const id = lowId('msg', ++counter)
    const info = message.role === 'user'
      ? { id, sessionID, role: 'user', time: { created }, agent, model: { providerID: model.providerID, modelID: model.modelID } }
      : { id, sessionID, role: 'assistant', time: { created, completed: created }, parentID: parent ?? id, modelID: model.modelID, providerID: model.providerID,
          mode: agent, agent, path: { cwd, root: cwd }, cost: 0, tokens: ZERO_TOKENS, finish: 'stop' }
    if (message.role === 'user') parent = id
    event('message.updated.1', { sessionID, info })
    event('message.part.updated.1', { sessionID, part: { id: lowId('prt', ++parts), sessionID, messageID: id, type: 'text', text: message.text, time: { start: created, end: created } }, time: created })
  }
  return events
}

/** The seq a refused replay names ("Sequence mismatch for aggregate …: expected N, got M", sync/index.ts:197), or null. */
export function expectedSeq(error) {
  const message = [error?.message, error?.body?.message, error?.body?.data?.message].filter((value) => typeof value === 'string').join(' ')
  const match = /expected (\d+), got \d+/.exec(message)
  return match ? Number(match[1]) : null
}

/**
 * Replay `events` (replayEvents) into the session `sessionID` (the one thread/start just made) through POST
 * /sync/replay: the probe finds where its sequence stands, then the history goes in as one request (one transaction on
 * the server). A server that takes the probe as is (no gap check) keeps it as the first event. Events of any other
 * aggregate are refused before anything is sent, so the probe can never land in an existing session. Throws what the
 * server answered when it refuses (no route, events it doesn't know); `error.probeLanded` tells whether the probe was
 * kept.
 * @param {(method: string, route: string, options: object) => Promise<any>} api the bridge's api()
 * @returns {Promise<{ start: number, events: number, probeLanded: boolean }>}
 */
export async function replayHistory(api, { cwd, sessionID, events }) {
  if (!events.length) return { start: 0, events: 0, probeLanded: false }
  if (typeof sessionID !== 'string' || !sessionID || !events.every((event) => event?.aggregateID === sessionID && event?.data?.sessionID === sessionID)) {
    throw new Error('Replay events must all belong to the new session.')
  }
  const post = (batch, timeout) => api('POST', '/sync/replay', { directory: cwd, body: { directory: cwd, events: batch }, timeout })
  let start, rest, probeLanded = false
  try {
    await post([{ ...events[0], seq: REPLAY_PROBE_SEQ }], REPLAY_PROBE_TIMEOUT_MS)
    start = REPLAY_PROBE_SEQ + 1
    rest = events.slice(1)
    probeLanded = true
  } catch (error) {
    const expected = expectedSeq(error)
    if (expected === null) throw error
    start = expected
    rest = events
  }
  try {
    if (rest.length) await post(rest.map((entry, index) => ({ ...entry, seq: start + index })), REPLAY_TIMEOUT_MS)
  } catch (error) {
    if (error && typeof error === 'object') error.probeLanded = probeLanded
    throw error
  }
  return { start, events: events.length, probeLanded }
}

/** The fallback: the conversation as one context text for a noReply prompt. */
export function transcriptText(messages, { source, title } = {}) {
  const from = [source ? `from ${source}` : 'from another coding agent', title ? `(“${title}”)` : ''].filter(Boolean).join(' ')
  const body = messages.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}:\n${message.text}`).join('\n\n')
  return `The conversation below was imported ${from} into this session. It is the earlier part of this conversation: continue from it when the user writes next, and don't answer it now.\n\n<imported_conversation>\n${body}\n</imported_conversation>`
}

// ------------------------------------------------------------------ OpenCode 2.x

/**
 * POST /api/session's body (as V2Api.createSession takes it: {id, directory, agent, model, permissions, metadata, title})
 * plus the messages → POST /api/experimental/session/import's {info, messages, location}. Info needs what Session.Info
 * requires (schema/src/session.ts:32-63: projectID — the import resolves the real project from the location — cost,
 * tokens, time); messages are SessionMessage User {text} and settled Assistant {agent, model, content: [text]}
 * (schema/src/session-message.ts).
 */
export function v2ImportPayload(body, messages, { now = Date.now() } = {}) {
  const directory = body?.directory ?? body?.location?.directory
  if (typeof body?.id !== 'string' || !body.id.startsWith('ses') || typeof directory !== 'string' || !directory) throw new Error('v2ImportPayload needs the session id and folder.')
  const timeOf = clockOf(now, messages.length)
  const agent = typeof body.agent === 'string' && body.agent ? body.agent : 'build'
  // The session's real model only (never a made-up one, which the next turn would try to use): none → the caller's
  // transcript fallback.
  if (!isRecord(body.model) || !body.model.id || !body.model.providerID) throw new Error('v2ImportPayload needs the session model.')
  const model = { id: body.model.id, providerID: body.model.providerID }
  let counter = 0
  const out = messages.map((message) => {
    const created = timeOf(message.ts)
    const id = `msg_${v2Identifier(false, now, ++counter)}`
    return message.role === 'user'
      ? { id, type: 'user', text: message.text, time: { created } }
      : { id, type: 'assistant', agent, model, content: [{ type: 'text', text: message.text }], finish: 'stop', time: { created, completed: created } }
  })
  const first = out[0]?.time.created ?? now
  const info = {
    id: body.id, projectID: 'global', cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: first, updated: now }, location: { directory },
    ...(typeof body.title === 'string' && body.title ? { title: body.title } : {}),
    ...(typeof body.agent === 'string' && body.agent ? { agent: body.agent } : {}),
    ...(isRecord(body.model) ? { model: body.model } : {}),
    ...(isRecord(body.metadata) ? { metadata: body.metadata } : {}),
    ...(Array.isArray(body.permissions) ? { permissions: body.permissions } : {}),
  }
  return { info, messages: out, location: { directory } }
}

/**
 * Create the 2.x session with its history (instead of POST /api/session): `api` is a V2Api (post unwraps {data}).
 * @returns {Promise<object>} the Session.Info v2 answers
 */
export function importSessionV2(api, body, messages, options) {
  return api.post('/api/experimental/session/import', v2ImportPayload(body, messages, options))
}
