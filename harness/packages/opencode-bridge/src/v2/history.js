/**
 * OpenCode 2.x session history → the 1.x shapes projection.js reads, and the turn grouping by position that replaces
 * 1.x's parentID links (pure; no I/O but readMessages).
 *
 *   messages   GET /api/session/:id/message, oldest first (order asc, 200 a page; a later page sends only its cursor),
 *              eleven types: user | synthetic | system | skill | shell | agent-switched | model-switched |
 *              location-switched | assistant | compaction | idle
 *   entries    {info, parts} as 1.x listed them. info.type keeps the v2 type; info.role is 'user' (user, and synthetic
 *              with its text part synthetic), 'assistant' (one step: content[] → text / reasoning / tool parts), else
 *              the v2 type (compaction with one compaction part, shell with one shell tool part, idle, skill, system,
 *              *-switched with none)
 *   part ids   v2 content has none: `${messageID}:text:${n}` / `${messageID}:reasoning:${n}` (the n-th of its kind in
 *              the step: the ordinal the live session.text.* / session.reasoning.* events carry), `${messageID}:tool:
 *              ${id}` (callID = the tool's id, unique in its step), `${messageID}:compaction`, `${messageID}:shell`.
 *              The live path builds the same ids, so a reload never doubles an item; a user message's id is its inbox
 *              id (the bridge names its own prompts), a compaction's its inputID (else msg_ + its event id)
 *   tools      state streaming → pending; output = the text content joined; attachments = the file content; error =
 *              its message, errorType = its type (the fixed vocabulary of to-session-error.ts); time {start: ran ??
 *              created, end: completed}
 *
 * Turns (attributeTurns), in list order — the server orders by seq: a user message's time.created is when it was
 * delivered, and bridge-made ids don't sort, so neither is compared:
 *   - a user message starts a turn, unless it is a recorded steer (threads.json steers) while one is open: it joins it;
 *   - an idle message ends the open turn and gives its outcome; a shutdown records none (the resumed run continues it);
 *   - a step or compaction with no open turn starts one: after a synthetic or skill message (a background sub-agent
 *     or shell finished, a skill was activated) that message's id is the turn's, else its own;
 *   - the user's own command (a shell message) runs outside any execution (Session.shell): no idle ever follows it, so
 *     with no open turn it is a turn of its own (its own id) that ends with it, a waiting wake left for the next step;
 *     with one open it belongs to it. Its completion (a synthetic with metadata {source: 'shell', shellID}) joins the
 *     command's turn, whenever it comes;
 *   - a synthetic or skill message joins an open turn (no item); with none open it starts nothing by itself (Plan
 *     mode's reminders are synthetic and wake nothing);
 *   - system and *-switched messages belong to no turn.
 */

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

export const textPartId = (messageID, ordinal) => `${messageID}:text:${ordinal}`
export const reasoningPartId = (messageID, ordinal) => `${messageID}:reasoning:${ordinal}`
export const toolPartId = (messageID, id) => `${messageID}:tool:${id}`
export const compactionPartId = (messageID) => `${messageID}:compaction`
export const shellPartId = (messageID) => `${messageID}:shell`
/** A compaction message's id (message-updater.ts): the inbox id it was asked with, else msg_ + its started event's id. */
export const compactionMessageId = (inputID, eventID) => (typeof inputID === 'string' && inputID ? inputID : `msg_${String(eventID ?? '').replace(/^evt_/, '')}`)

const PAGE = 200

/** Every message of a session, oldest first. */
export function readMessages(api, sessionID, { signal } = {}) {
  return api.all(`/api/session/${encodeURIComponent(sessionID)}/message`, { query: { order: 'asc' }, limit: PAGE, signal })
}

/** A v2 Session.Info with 1.x's `directory` (location.directory) for the code that reads it. */
export function toV1Session(info) {
  if (!isRecord(info) || typeof info.id !== 'string') return null
  return { ...info, directory: typeof info.location?.directory === 'string' ? info.location.directory : info.directory }
}

const textOf = (content) => (Array.isArray(content) ? content : []).filter((item) => item?.type === 'text' && typeof item.text === 'string').map((item) => item.text).join('\n')
const filesOf = (content) => (Array.isArray(content) ? content : []).filter((item) => item?.type === 'file' && typeof item.uri === 'string')
  .map((item) => ({ mime: item.mime, url: item.uri, ...(item.name ? { filename: item.name } : {}) }))

/** One assistant tool content → a 1.x tool part. */
export function toolPart(messageID, sessionID, tool) {
  const state = isRecord(tool?.state) ? tool.state : {}
  const status = state.status === 'streaming' ? 'pending' : state.status
  const error = isRecord(state.error) ? state.error : null
  const time = isRecord(tool?.time) ? tool.time : {}
  return {
    id: toolPartId(messageID, tool.id), type: 'tool', tool: tool.name, callID: tool.id, sessionID, messageID,
    state: {
      status,
      // A streaming call's input is the raw JSON so far: nothing to show yet.
      input: isRecord(state.input) ? state.input : {},
      ...(state.content !== undefined ? { output: textOf(state.content), attachments: filesOf(state.content) } : {}),
      ...(isRecord(state.metadata) ? { metadata: state.metadata } : {}),
      ...(error ? { error: error.message, errorType: error.type, errorInfo: error } : {}),
      time: { start: time.ran ?? time.created, ...(Number.isFinite(time.completed) ? { end: time.completed } : {}) },
    },
  }
}

/** A user message's prompt → 1.x user parts (text, files as data: or their own uri, agents not already in the text). */
function userParts(message) {
  const parts = []
  if (typeof message.text === 'string' && message.text) parts.push({ id: textPartId(message.id, 0), type: 'text', text: message.text })
  for (const file of Array.isArray(message.files) ? message.files : []) {
    if (!isRecord(file)) continue
    const url = file.source?.type === 'uri' && typeof file.source.uri === 'string' ? file.source.uri
      : typeof file.uri === 'string' ? file.uri : typeof file.data === 'string' ? `data:${file.mime};base64,${file.data}` : null
    if (url) parts.push({ type: 'file', mime: file.mime, url, ...(file.name ? { filename: file.name } : {}) })
  }
  // A mention is already part of the text (its start/end point into it).
  for (const agent of Array.isArray(message.agents) ? message.agents : []) if (isRecord(agent) && agent.name && !agent.mention) parts.push({ type: 'agent', name: agent.name })
  return parts
}

/** One v2 message → a 1.x {info, parts}, or null for a message with no id. */
export function toV1Message(message, { sessionID = null } = {}) {
  if (!isRecord(message) || typeof message.id !== 'string') return null
  const id = message.id
  const base = { id, sessionID, type: message.type, time: { ...(isRecord(message.time) ? message.time : {}) }, ...(isRecord(message.metadata) ? { metadata: message.metadata } : {}) }
  switch (message.type) {
    case 'user': return { info: { ...base, role: 'user' }, parts: userParts(message) }
    case 'synthetic': return { info: { ...base, role: 'user', synthetic: true, ...(message.description ? { description: message.description } : {}) }, parts: [{ id: textPartId(id, 0), type: 'text', text: message.text ?? '', synthetic: true }] }
    case 'assistant': {
      const parts = []
      let texts = 0, reasonings = 0
      for (const item of Array.isArray(message.content) ? message.content : []) {
        if (item?.type === 'text') parts.push({ id: textPartId(id, texts++), type: 'text', text: item.text ?? '', sessionID, messageID: id })
        else if (item?.type === 'reasoning') parts.push({ id: reasoningPartId(id, reasonings++), type: 'reasoning', text: item.text ?? '', sessionID, messageID: id, time: { start: item.time?.created, end: item.time?.completed } })
        else if (item?.type === 'tool' && typeof item.id === 'string') parts.push(toolPart(id, sessionID, item))
      }
      const model = isRecord(message.model) ? message.model : {}
      return {
        info: {
          ...base, role: 'assistant', agent: message.agent, providerID: model.providerID, modelID: model.id, variant: model.variant,
          ...(Number.isFinite(message.cost) ? { cost: message.cost } : {}), ...(isRecord(message.tokens) ? { tokens: message.tokens } : {}),
          ...(isRecord(message.error) ? { error: message.error } : {}), ...(message.finish ? { finish: message.finish } : {}),
          ...(isRecord(message.retry) ? { retry: message.retry } : {}),
        },
        parts,
      }
    }
    case 'compaction': return {
      info: { ...base, role: 'compaction', status: message.status, reason: message.reason, ...(isRecord(message.error) ? { error: message.error } : {}) },
      parts: [{ id: compactionPartId(id), type: 'compaction', status: message.status, auto: message.reason === 'auto', summary: typeof message.summary === 'string' ? message.summary : '' }],
    }
    // The user's own command (POST /api/session/:id/shell): a shell call of its own.
    case 'shell': {
      const failed = message.status === 'timeout' || message.status === 'killed'
      const state = {
        status: message.status === 'running' ? 'running' : failed ? 'error' : 'completed', input: { command: message.command ?? '' },
        ...(typeof message.output?.output === 'string' ? { output: message.output.output } : {}),
        metadata: { ...(Number.isFinite(message.exit) ? { exit: message.exit } : {}), status: message.status },
        ...(failed ? { error: message.status === 'timeout' ? 'The command timed out.' : 'The command was stopped.' } : {}),
        time: { start: message.time?.created, ...(Number.isFinite(message.time?.completed) ? { end: message.time.completed } : {}) },
      }
      return { info: { ...base, role: 'shell', ...(typeof message.shellID === 'string' ? { shellID: message.shellID } : {}) }, parts: [{ id: shellPartId(id), type: 'tool', tool: 'shell', callID: message.shellID ?? id, sessionID, messageID: id, state }] }
    }
    case 'idle': return { info: { ...base, role: 'idle', outcome: message.outcome, ...(isRecord(message.error) ? { error: message.error } : {}) }, parts: [] }
    default: return { info: { ...base, role: message.type ?? 'unknown' }, parts: [] }
  }
}

export function toV1Messages(list, options) {
  return (Array.isArray(list) ? list : []).map((message) => toV1Message(message, options)).filter(Boolean)
}

/**
 * Entries (in list order, a staged revert already cut off) → turns: [{id, kind, members: [{entry, role}], idle}].
 * kind is what started it ('user' | 'synthetic' | 'skill' | 'assistant' | 'compaction' | 'shell'); a member's role is
 * 'prompt' (the starting user message), 'steer', 'step' (assistant), 'compaction', 'shell' or 'context' (a synthetic
 * or skill message that waked it or joined it: no item). idle is the entry that ended it, or null; closed is true for
 * a turn the user's own command started (it ended with that command: no idle comes).
 */
export function attributeTurns(entries, { steers = [] } = {}) {
  const steered = new Set(steers)
  const turns = []
  let current = null
  let waking = null
  // shellID → the turn its command is in (its completion synthetic joins that turn).
  const shells = new Map()
  const open = (id, kind) => { current = { id, kind, members: [], idle: null, closed: false }; turns.push(current); return current }
  for (const entry of entries ?? []) {
    const info = entry?.info
    if (!info?.id) continue
    switch (info.type) {
      case 'user':
        if (current && steered.has(info.id)) { current.members.push({ entry, role: 'steer' }); break }
        open(info.id, 'user').members.push({ entry, role: 'prompt' })
        waking = null
        break
      case 'synthetic':
      case 'skill': {
        const shell = info.metadata?.source === 'shell' ? shells.get(info.metadata.shellID) : null
        if (shell) shell.members.push({ entry, role: 'context' })
        else if (current) current.members.push({ entry, role: 'context' })
        else waking = entry
        break
      }
      case 'shell': {
        const starts = !current
        const turn = current ?? open(info.id, 'shell')
        turn.members.push({ entry, role: 'shell' })
        if (typeof info.shellID === 'string') shells.set(info.shellID, turn)
        // The user's command runs in no execution: a turn it started ends with it, and what comes next (a wake waiting
        // before it, the next prompt) is a turn of its own.
        if (starts) { turn.closed = true; current = null }
        break
      }
      case 'assistant':
      case 'compaction': {
        if (!current) {
          open(waking?.info.id ?? info.id, waking ? waking.info.type : info.type)
          if (waking) current.members.push({ entry: waking, role: 'context' })
        }
        waking = null
        current.members.push({ entry, role: info.type === 'assistant' ? 'step' : info.type })
        break
      }
      case 'idle':
        if (current) current.idle = entry
        current = null
        waking = null
        break
      default: break
    }
  }
  return turns
}

/** Entries before a staged revert's message (by position: the boundary and everything after it are hidden). */
export function beforeRevert(entries, revert) {
  const boundary = typeof revert?.messageID === 'string' ? entries.findIndex((entry) => entry.info.id === revert.messageID) : -1
  return boundary >= 0 ? entries.slice(0, boundary) : entries
}
