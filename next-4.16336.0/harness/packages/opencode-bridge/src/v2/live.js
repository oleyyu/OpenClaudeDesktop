/**
 * OpenCode 2.x's live session events → the same 1.x-shaped entries a reload reads (v2/history.js), in the thread's
 * Projector. LiveAdapterV2 keeps each message as v2 itself would project it (a port of core/src/session/message-updater
 * .ts and the inbox delivery of session/projector.ts) and writes it back through toV1Message after every change, so the
 * live path and a reload build the same entries, part ids and order by construction:
 *
 *   inbox.enqueued / delivered   the item is kept until delivered; then a user or synthetic message (id = inbox id,
 *                                time = delivery), as v2 inserts it
 *   session.synthetic, skill.activated, shell.started / ended, agent / model selected, moved, instructions updated
 *                                their messages (id = msg_ + the event's id)
 *   step.started / ended / failed  an assistant message (a retried step is reset); step.started completes the step before
 *   text / reasoning .started / .delta / .ended   the n-th text / reasoning content of the step (n = ordinal); deltas
 *                                are live-only, .ended carries the whole text
 *   tool .input.started / .called / .progress / .success / .failed   one tool content: streaming → running (input) →
 *                                metadata replaced → completed (content) or error
 *   retry.scheduled              assistant.retry; cleared when the execution ends
 *   compaction .started / .delta / .ended / .failed   a compaction message (id = its inputID, else msg_ + event id)
 *   execution .succeeded / .failed / .interrupted   an idle message (none for a shutdown: the resumed run continues)
 *   revert.committed             the boundary message and everything after it are gone (by position)
 *
 * apply(event) returns what changed: [{messageID, partID?, done?}] (partID: the 1.x part; done: a text or reasoning
 * that ended). The thread turns those into items (v2/turns.js). Also here: the bridge's own message and session ids,
 * a Codex input as v2's prompt body, and the retry notice.
 */
import crypto from 'node:crypto'
import path from 'node:path'
import { invalidParams } from '../transport.js'
import { errorInfoOfV2 } from '../projection.js'
import { compactionMessageId, compactionPartId, reasoningPartId, shellPartId, textPartId, toV1Message, toolPartId } from './history.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
let lastTimestamp = 0
let counter = 0

/** schema/src/identifier.ts create(): 12 hex of (ms · 4096 + counter), inverted for descending, then 14 base62. */
function identifier(descending) {
  const now = Date.now()
  if (now !== lastTimestamp) { lastTimestamp = now; counter = 0 }
  counter++
  let value = BigInt(now) * 0x1000n + BigInt(counter)
  if (descending) value = ~value & 0xffffffffffffn
  const time = value.toString(16).padStart(12, '0').slice(-12)
  const bytes = crypto.randomBytes(14)
  return time + Array.from(bytes, (byte) => BASE62[byte % 62]).join('')
}

/** A message id the bridge names its own inputs with (POST …/prompt {id}, …/compact {id}): msg_ + ascending. */
export const newMessageId = () => `msg_${identifier(false)}`
/** A session id for POST /api/session {id} (v2's own are ses_ + descending). */
export const newSessionId = () => `ses_${identifier(true)}`
/** The message id v2 gives what an event recorded (SessionMessage.ID.fromEvent). */
export const messageIdOfEvent = (eventID) => (typeof eventID === 'string' && eventID.startsWith('evt_') ? `msg_${eventID.slice(4)}` : newMessageId())

const pathUrl = (file) => 'file://' + encodeURI(file).replace(/#/g, '%23').replace(/\?/g, '%3F')

/**
 * Whether a standalone .md (not a SKILL.md) is a command file rather than a skill file. v2 takes a skill .md only right
 * in a skills root (config/plugin/skill-scan.ts: depth 0; skill-file.ts: id its file name), so a `skill`/`skills`
 * parent makes it a skill; otherwise the deepest `command(s)` or `skill(s)` folder decides, so the user's own folders
 * above the config directory (~/dev/commands/app/.opencode/skills/…) don't (config/plugin/command.ts scans
 * <config dir>/{command,commands}/**\/*.md, nested names included).
 */
export function commandFileV2(file) {
  const folders = String(file).split(/[\\/]/).slice(0, -1)
  if (/^skills?$/.test(folders.at(-1) ?? '')) return false
  const deepest = (pattern) => folders.findLastIndex((part) => pattern.test(part))
  return deepest(/^commands?$/) > deepest(/^skills?$/)
}

/**
 * A Codex UserInput[] → v2's prompt body {text, files?, skills?} and, for a slash command, its name: one text (the
 * parts joined), files as uris (v2 reads and sniffs them itself; a folder is listed), a skill by its id as v2 derives it
 * (config/plugin/skill-file.ts: a SKILL.md's folder name, a .md right in a skills root its file name). A command row is
 * command:<name> or a file under a {command,commands} folder (config/plugin/command.ts, nested names included). http(s)
 * images are refused: v2 takes only file: and data: attachments.
 */
export function promptInputV2(input) {
  const texts = []
  const files = []
  const skills = []
  let command = null
  for (const item of Array.isArray(input) ? input : []) {
    if (item?.type === 'text' && typeof item.text === 'string') texts.push(item.text)
    else if (item?.type === 'localImage' && typeof item.path === 'string') files.push({ uri: pathUrl(item.path), name: path.basename(item.path) })
    else if (item?.type === 'image' && typeof item.url === 'string') {
      if (!/^data:/i.test(item.url)) throw invalidParams('OpenCode 2.x takes images as files or data: URLs, not web addresses.')
      files.push({ uri: item.url, name: 'image' })
    } else if (item?.type === 'mention' && typeof item.path === 'string') files.push({ uri: pathUrl(item.path), name: item.name || path.basename(item.path) })
    else if (item?.type === 'skill' && typeof item.name === 'string') {
      const file = String(item.path ?? '')
      if (file.startsWith('command:')) command = file.slice(8)
      else if (file.endsWith('SKILL.md')) skills.push({ id: path.basename(path.dirname(file)) })
      else if (file.endsWith('.md') && commandFileV2(file)) command = item.name
      else if (file.endsWith('.md')) skills.push({ id: path.basename(file, '.md') })
      else texts.push(`Use the "${item.name}" skill for this request: load it with the skill tool first.`)
    }
  }
  if (!texts.length && !files.length && !skills.length && !command) throw invalidParams('The message is empty.')
  return { text: texts.join('\n\n'), files, skills, command }
}

/** The prompt body v2 takes from promptInputV2's result (keys it has, nothing empty). */
export const promptBodyV2 = ({ text, files = [], skills = [] }) => ({ text, ...(files.length ? { files } : {}), ...(skills.length ? { skills } : {}) })

/**
 * session.retry.scheduled {attempt, at, error} → the error notification the app shows as 'Retrying'. v2 retries up to
 * 10 times (model-retry.ts; claude-agent never), says when (at) and why by type; no remedy (action) any more.
 */
export function retryNoticeV2(data, { threadId, turnId }) {
  const error = isRecord(data?.error) ? data.error : {}
  const message = typeof error.message === 'string' && error.message ? error.message : 'Retrying…'
  const info = errorInfoOfV2({ ...error, message })?.codexErrorInfo
  const codexErrorInfo = info === 'usageLimitExceeded' || info === 'rateLimitExceeded' ? info : 'other'
  return {
    error: { message, codexErrorInfo, additionalDetails: typeof error.type === 'string' ? error.type : null, misalignment: null }, willRetry: true, threadId, turnId,
    retry: { attempt: Number.isInteger(data?.attempt) && data.attempt > 0 ? data.attempt : 1, maxRetries: 10 },
    codeDesktop: { nextAt: Number.isFinite(data?.at) ? data.at : null, action: null },
  }
}

const nth = (content, type, ordinal) => content.filter((item) => item?.type === type)[ordinal] ?? null

export class LiveAdapterV2 {
  /** @param {import('../projection.js').Projector} projector @param {{ sessionID: string }} options */
  constructor(projector, { sessionID }) {
    this.projector = projector
    this.sessionID = sessionID
    /** message id → the message as v2 projects it, in list order */
    this.raw = new Map()
    /** inbox id → its item ({type, payload, delivery}) until delivered */
    this.inbox = new Map()
  }

  /** After a reload: the messages it read (their projector entries are already loaded) and the inbox still pending. */
  reset(messages = [], inbox = []) {
    this.raw.clear()
    for (const message of messages) if (isRecord(message) && typeof message.id === 'string') this.raw.set(message.id, structuredClone(message))
    for (const item of inbox) if (isRecord(item) && typeof item.id === 'string' && !this.inbox.has(item.id)) this.inbox.set(item.id, { type: item.type, payload: item.payload ?? {}, delivery: item.delivery })
  }

  /** Write a message back to the projector (in place when it has one). */
  write(id) {
    const message = this.raw.get(id)
    if (!message) return
    const entry = toV1Message(message, { sessionID: this.sessionID })
    if (entry) this.projector.messages.set(id, entry)
  }

  append(message) {
    this.raw.set(message.id, message)
    this.write(message.id)
    return message
  }

  assistant(id) {
    const message = this.raw.get(id)
    return message?.type === 'assistant' ? message : null
  }

  last(test) {
    const list = [...this.raw.values()]
    for (let index = list.length - 1; index >= 0; index--) if (test(list[index])) return list[index]
    return null
  }

  /** One event → what changed ([{messageID, partID?, done?}]). */
  apply(event) {
    const data = isRecord(event?.data) ? event.data : {}
    const created = Number.isFinite(event?.created) ? event.created : Date.now()
    const metadata = isRecord(event?.metadata) ? { metadata: event.metadata } : {}
    const own = () => messageIdOfEvent(event?.id)
    const step = this.assistant(data.assistantMessageID)
    const touched = (message, partID, extra = {}) => { this.write(message.id); return [{ messageID: message.id, ...(partID ? { partID } : {}), ...extra }] }
    switch (event?.type) {
      case 'session.inbox.enqueued':
        if (typeof data.inboxID === 'string' && isRecord(data.item)) this.inbox.set(data.inboxID, data.item)
        return []
      case 'session.inbox.cancelled':
        this.inbox.delete(data.inboxID)
        return []
      case 'session.inbox.delivered': {
        const id = data.inboxID
        if (typeof id !== 'string') return []
        const item = this.inbox.get(id) ?? { type: 'user', payload: {} }
        this.inbox.delete(id)
        const payload = isRecord(item.payload) ? item.payload : {}
        const time = { created }
        if (item.type === 'user') {
          this.append({ id, type: 'user', time, text: payload.text ?? '', ...(payload.files ? { files: payload.files } : {}), ...(payload.agents ? { agents: payload.agents } : {}), ...(payload.skills ? { skills: payload.skills } : {}), ...(isRecord(payload.metadata) ? { metadata: payload.metadata } : {}) })
        } else if (item.type === 'synthetic') {
          this.append({ id, type: 'synthetic', time, text: payload.text ?? '', ...(payload.description ? { description: payload.description } : {}), ...(isRecord(payload.metadata) ? { metadata: payload.metadata } : {}) })
        } else return []
        return [{ messageID: id }]
      }
      case 'session.synthetic': {
        const message = this.append({ id: own(), type: 'synthetic', time: { created }, text: data.text ?? '', ...(data.description ? { description: data.description } : {}), ...(isRecord(data.metadata) ? { metadata: data.metadata } : {}) })
        return [{ messageID: message.id }]
      }
      case 'session.skill.activated': {
        const message = this.append({ id: own(), type: 'skill', time: { created }, skill: data.id, name: data.name, text: data.text ?? '', ...metadata })
        return [{ messageID: message.id }]
      }
      case 'session.agent.selected':
        this.append({ id: own(), type: 'agent-switched', time: { created }, agent: data.agent, ...(data.previous ? { previous: data.previous } : {}), ...metadata })
        return []
      case 'session.model.selected':
        this.append({ id: own(), type: 'model-switched', time: { created }, model: data.model, ...(data.previous ? { previous: data.previous } : {}), ...metadata })
        return []
      case 'session.moved':
        this.append({ id: own(), type: 'location-switched', time: { created }, location: data.location, projectID: data.projectID, ...(data.subpath ? { subpath: data.subpath } : {}), ...metadata })
        return []
      case 'session.instructions.updated':
        if (typeof data.text !== 'string') return []
        this.append({ id: own(), type: 'system', time: { created }, text: data.text, metadata: { ...(event.metadata ?? {}), notice: 'instructions' } })
        return []
      case 'session.shell.started': {
        const shell = isRecord(data.shell) ? data.shell : {}
        const message = this.append({ id: own(), type: 'shell', shellID: shell.id, command: shell.command ?? '', status: shell.status, time: { created }, ...(shell.metadata?.background === true ? { metadata: { ...(event.metadata ?? {}), background: true } } : metadata) })
        return [{ messageID: message.id, partID: shellPartId(message.id) }]
      }
      case 'session.shell.ended': {
        const shell = isRecord(data.shell) ? data.shell : {}
        const message = this.last((candidate) => candidate.type === 'shell' && candidate.shellID === shell.id)
        if (!message) return []
        Object.assign(message, { status: shell.status, ...(shell.exit === undefined ? {} : { exit: shell.exit }), output: data.output, time: { ...message.time, completed: created } })
        return touched(message, shellPartId(message.id))
      }
      case 'session.step.started': {
        const id = data.assistantMessageID
        if (typeof id !== 'string') return []
        const existing = this.assistant(id)
        if (existing) {
          // A retried step starts over.
          for (const key of ['retry', 'error', 'finish', 'rawFinish', 'native']) delete existing[key]
          Object.assign(existing, { agent: data.agent, model: data.model, time: { created: data.started ?? created } })
          return touched(existing)
        }
        const current = this.last((candidate) => candidate.type === 'assistant')
        if (current && !Number.isFinite(current.time?.completed)) { delete current.retry; current.time = { ...current.time, completed: created }; this.write(current.id) }
        const message = this.append({ id, type: 'assistant', agent: data.agent, model: data.model, ...metadata, time: { created: data.started ?? created }, content: [] })
        return [...(current ? [{ messageID: current.id }] : []), { messageID: message.id }]
      }
      case 'session.step.ended':
        if (!step) return []
        Object.assign(step, { finish: data.finish, ...(data.rawFinish ? { rawFinish: data.rawFinish } : {}), cost: data.cost, tokens: data.tokens, time: { ...step.time, completed: created } })
        return touched(step)
      case 'session.step.failed':
        if (!step) return []
        delete step.retry
        Object.assign(step, { finish: data.finish ?? 'error', error: data.error, ...(data.cost !== undefined && data.tokens !== undefined ? { cost: data.cost, tokens: data.tokens } : {}), time: { ...step.time, completed: created } })
        return touched(step)
      // The .started events below push; one already in the content (a reload read it before its event was replayed:
      // v2/turns.js resyncV2) is left as it is, so a replay never makes a second item.
      case 'session.text.started':
        if (!step) return []
        if (!nth(step.content, 'text', data.ordinal)) step.content.push({ type: 'text', text: '' })
        return touched(step, textPartId(step.id, data.ordinal))
      case 'session.text.delta': {
        const item = step && nth(step.content, 'text', data.ordinal)
        if (!item) return []
        item.text += data.delta ?? ''
        return touched(step, textPartId(step.id, data.ordinal))
      }
      case 'session.text.ended': {
        const item = step && nth(step.content, 'text', data.ordinal)
        if (!item) return []
        item.text = data.text ?? item.text
        return touched(step, textPartId(step.id, data.ordinal), { done: true })
      }
      case 'session.reasoning.started':
        if (!step) return []
        if (!nth(step.content, 'reasoning', data.ordinal)) step.content.push({ type: 'reasoning', text: '', time: { created } })
        return touched(step, reasoningPartId(step.id, data.ordinal))
      case 'session.reasoning.delta': {
        const item = step && nth(step.content, 'reasoning', data.ordinal)
        if (!item) return []
        item.text += data.delta ?? ''
        return touched(step, reasoningPartId(step.id, data.ordinal))
      }
      case 'session.reasoning.ended': {
        const item = step && nth(step.content, 'reasoning', data.ordinal)
        if (!item) return []
        item.text = data.text ?? item.text
        item.time = { created: item.time?.created ?? created, completed: created }
        return touched(step, reasoningPartId(step.id, data.ordinal), { done: true })
      }
      case 'session.tool.input.started':
        if (!step || typeof data.id !== 'string') return []
        if (!step.content.some((item) => item?.type === 'tool' && item.id === data.id)) step.content.push({ type: 'tool', id: data.id, name: data.name, time: { created }, state: { status: 'streaming', input: '' } })
        return touched(step, toolPartId(step.id, data.id))
      case 'session.tool.input.ended': {
        const tool = step && step.content.findLast((item) => item?.type === 'tool' && item.id === data.id)
        if (tool?.state.status === 'streaming') tool.state.input = data.text ?? ''
        return []
      }
      case 'session.tool.called': {
        const tool = step && step.content.findLast((item) => item?.type === 'tool' && item.id === data.id)
        if (!tool) return []
        tool.time = { ...tool.time, ran: created }
        tool.state = { status: 'running', input: isRecord(data.input) ? data.input : {}, metadata: {} }
        return touched(step, toolPartId(step.id, data.id))
      }
      case 'session.tool.progress': {
        const tool = step && step.content.findLast((item) => item?.type === 'tool' && item.id === data.id)
        if (tool?.state.status !== 'running') return []
        tool.state = { ...tool.state, metadata: isRecord(data.metadata) ? data.metadata : {} }
        return touched(step, toolPartId(step.id, data.id))
      }
      case 'session.tool.success': {
        const tool = step && step.content.findLast((item) => item?.type === 'tool' && item.id === data.id)
        if (tool?.state.status !== 'running') return []
        tool.time = { ...tool.time, completed: created }
        tool.state = { status: 'completed', input: tool.state.input, content: data.content ?? [], ...(isRecord(data.metadata) ? { metadata: data.metadata } : {}) }
        return touched(step, toolPartId(step.id, data.id))
      }
      case 'session.tool.failed': {
        const tool = step && step.content.findLast((item) => item?.type === 'tool' && item.id === data.id)
        if (tool?.state.status !== 'streaming' && tool?.state.status !== 'running') return []
        tool.time = { ...tool.time, completed: created }
        tool.state = { status: 'error', error: data.error, input: isRecord(tool.state.input) ? tool.state.input : {}, ...(data.content ? { content: data.content } : {}), ...(isRecord(data.metadata) ? { metadata: data.metadata } : {}) }
        return touched(step, toolPartId(step.id, data.id))
      }
      case 'session.retry.scheduled':
        if (!step) return []
        step.retry = { attempt: data.attempt, at: data.at, error: data.error }
        return touched(step)
      case 'session.compaction.started': {
        const message = this.append({ id: compactionMessageId(data.inputID, event.id), type: 'compaction', status: 'running', reason: data.reason, summary: '', ...metadata, time: { created } })
        return [{ messageID: message.id, partID: compactionPartId(message.id) }]
      }
      case 'session.compaction.delta': {
        const message = this.last((candidate) => candidate.type === 'compaction' && candidate.status === 'running')
        if (!message) return []
        message.summary += data.text ?? ''
        return touched(message, compactionPartId(message.id))
      }
      case 'session.compaction.ended': {
        const running = this.last((candidate) => candidate.type === 'compaction' && candidate.status === 'running')
        const message = running ?? this.append({ id: own(), type: 'compaction', ...metadata, time: { created } })
        // The ended event's metadata (the compaction's outcome) merged over the started one's, as v2 does.
        if (running && isRecord(event.metadata)) message.metadata = { ...running.metadata, ...event.metadata }
        Object.assign(message, { status: 'completed', reason: data.reason, summary: data.text ?? '', ...(data.model ? { model: data.model } : {}), ...(data.cost !== undefined ? { cost: data.cost } : {}), ...(data.tokens ? { tokens: data.tokens } : {}) })
        return touched(message, compactionPartId(message.id))
      }
      case 'session.compaction.failed': {
        const running = this.last((candidate) => candidate.type === 'compaction' && candidate.status === 'running')
        const message = running ?? this.append({ id: compactionMessageId(data.inputID, event.id), type: 'compaction', ...metadata, time: { created } })
        Object.assign(message, { status: 'failed', reason: data.reason, error: data.error })
        delete message.summary
        return touched(message, compactionPartId(message.id))
      }
      case 'session.execution.succeeded':
      case 'session.execution.failed':
      case 'session.execution.interrupted': {
        const current = this.last((candidate) => candidate.type === 'assistant')
        if (current?.retry) { delete current.retry; this.write(current.id) }
        // A shutdown keeps the run's claim: the resumed run continues the turn, so nothing ends here.
        if (event.type === 'session.execution.interrupted' && data.reason === 'shutdown') return []
        const outcome = event.type === 'session.execution.succeeded' ? 'succeeded' : event.type === 'session.execution.failed' ? 'failed' : 'interrupted'
        const message = this.append({ id: own(), type: 'idle', outcome, ...(isRecord(data.error) && outcome === 'failed' ? { error: data.error } : {}), ...metadata, time: { created } })
        return [{ messageID: message.id }]
      }
      case 'session.revert.committed': {
        const ids = [...this.projector.messages.keys()]
        const boundary = ids.indexOf(data.to)
        if (boundary < 0) return []
        for (const id of ids.slice(boundary)) { this.projector.messages.delete(id); this.raw.delete(id) }
        return []
      }
      default: return []
    }
  }
}
