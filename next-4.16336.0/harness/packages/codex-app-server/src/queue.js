/**
 * Codex thread/queue/* over a Harness agent's durable inbox.
 *
 *   queued submission   one `next-turn` inbox message (`agent.followup`)
 *   id                  the Harness message id
 *   input               the Codex parts as submitted (remembered per message;
 *                       after a restart, rebuilt from the message content by
 *                       input.js toCodexInputs: bracket forms, image blocks)
 *   thread/queue/changed  coalesced from agent/inbox/* events and mutations
 *
 * Steering (`next-step`) is not part of the Codex queue.
 */

import { RpcError, invalidParams } from './transport.js'
import { toCodexInputs } from './input.js'

/**
 * One queued inbox message → Codex QueuedSubmission.
 * @param {(ref: object) => string | undefined} [imagePath] - an image block's host path.
 */
export function toQueuedSubmission(message, remembered, imagePath) {
  return {
    id: message.id,
    input: remembered?.input ?? toCodexInputs(message.content, { imagePath }),
    clientUserMessageId: remembered?.clientUserMessageId ?? null,
  }
}

/** The queued messages in the order of `ids`, which must name each of them once. */
export function reorderedMessages(nextTurn, ids) {
  const byId = new Map(nextTurn.map((message) => [message.id, message]))
  const valid = Array.isArray(ids) && ids.length === byId.size && new Set(ids).size === ids.length && ids.every((id) => byId.has(id))
  if (!valid) throw invalidParams('queuedSubmissionIds must list every queued message exactly once.')
  return ids.map((id) => byId.get(id))
}

export class ThreadQueue {
  /**
   * @param {{ agent: any, threadId: string, notify: (method: string, params: object) => void, inputMessage: (input: unknown) => any, imagePath?: (ref: object) => string | undefined }} options
   *   `inputMessage` builds the Harness user message for Codex input (may be
   *   async); `imagePath` resolves a queued image block for the rebuilt input.
   */
  constructor({ agent, threadId, notify, inputMessage, imagePath }) {
    this.agent = agent
    this.threadId = threadId
    this.notify = notify
    this.inputMessage = inputMessage
    this.imagePath = imagePath
    /** @type {Map<string, {input: unknown[], clientUserMessageId: string | null}>} */
    this.remembered = new Map()
    this.scheduled = false
    this.closed = false
  }

  /** One thread/queue/changed per tick, however many inbox events a mutation fired. */
  changed() {
    if (this.scheduled || this.closed) return
    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      if (!this.closed) this.notify('thread/queue/changed', { threadId: this.threadId })
    })
  }

  /** A claimed message left the queue for its turn. */
  claimed(message) {
    if (message?.id !== undefined) this.remembered.delete(message.id)
    this.changed()
  }

  async add({ input, clientUserMessageId }) {
    const message = await this.inputMessage(input)
    const remembered = { input, clientUserMessageId: typeof clientUserMessageId === 'string' ? clientUserMessageId : null }
    this.remembered.set(message.id, remembered)
    // While a turn runs this lands in next-turn; an idle agent starts it now.
    this.agent.followup(message)
    this.changed()
    return { queuedSubmission: toQueuedSubmission(message, remembered, this.imagePath) }
  }

  list() {
    const nextTurn = this.agent.inbox.nextTurn
    const pending = new Set(nextTurn.map((message) => message.id))
    for (const id of this.remembered.keys()) if (!pending.has(id)) this.remembered.delete(id)
    return { data: nextTurn.map((message) => toQueuedSubmission(message, this.remembered.get(message.id), this.imagePath)), nextCursor: null }
  }

  delete(id) {
    if (!this.agent.inbox.nextTurn.some((message) => message.id === id) || !this.agent.inbox.remove(id)) throw invalidParams('That queued message already started.')
    this.remembered.delete(id)
    this.changed()
    return {}
  }

  async update(id, input) {
    const replacement = await this.inputMessage(input)
    if (!this.agent.inbox.nextTurn.some((message) => message.id === id) || !this.agent.inbox.replace(id, replacement)) throw invalidParams('That queued message already started.')
    const remembered = { input, clientUserMessageId: this.remembered.get(id)?.clientUserMessageId ?? null }
    this.remembered.delete(id)
    this.remembered.set(replacement.id, remembered)
    this.changed()
    return { queuedSubmission: toQueuedSubmission(replacement, remembered, this.imagePath) }
  }

  reorder(ids) {
    const inbox = this.agent.inbox
    const nextTurn = inbox.nextTurn
    const ordered = reorderedMessages(nextTurn, ids)
    if (ordered.some((message, index) => message !== nextTurn[index])) inbox.splice('next-turn', 0, nextTurn.length, ordered)
    this.changed()
    return {}
  }

  /**
   * Send a queued message now: steer it into the running turn, or wake an
   * idle driver that holds parked queue items.
   */
  start(id) {
    const nextTurn = this.agent.inbox.nextTurn
    const message = id === undefined || id === null ? nextTurn[0] : nextTurn.find((candidate) => candidate.id === id)
    if (!message) throw new RpcError(-32600, nextTurn.length ? 'That queued message already started.' : 'The queue is empty.')
    if (this.agent.status === 'running') {
      this.agent.inbox.remove(message.id)
      this.agent.steer(message)
    } else this.resume()
    this.changed()
    return {}
  }

  /**
   * Stop the running turn. Queued turns survive (keepInbox) and run next, as
   * Codex runs its queue after a stopped turn; stopped steering is dropped so
   * it cannot ride along with that next turn.
   * @returns {boolean} whether queued work was kept.
   */
  interrupt() {
    const inbox = this.agent.inbox
    const keep = inbox.nextTurn.length > 0
    this.agent.cancel({ kind: 'user' }, { keepInbox: keep })
    if (!keep) return false
    if (inbox.nextStep.length > 0) inbox.splice('next-step', 0, inbox.nextStep.length, [])
    // A cancelled driver parks what it kept; restart it once it is idle.
    Promise.resolve(this.agent.whenIdle()).then(() => this.resume(), () => undefined)
    return true
  }

  /** Re-submit parked next-turn messages in order so an idle driver claims them. */
  resume() {
    if (this.closed || this.agent.status === 'running') return
    const inbox = this.agent.inbox
    if (inbox.nextTurn.length === 0) return
    const parked = inbox.splice('next-turn', 0, inbox.nextTurn.length, [])
    for (const message of parked) this.agent.followup(message)
  }

  close() {
    this.closed = true
  }
}
