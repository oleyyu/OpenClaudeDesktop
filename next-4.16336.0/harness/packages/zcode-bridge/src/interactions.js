/**
 * One card per ZCode interaction.
 *
 * While it waits for an answer, ZCode re-sends `interaction/requestPermission` and `interaction/requestUserInput`
 * under a new wire id (after 1 s, 2 s, 4 s, 8 s, then every 10 s: interaction-broker.ts withInteractionRequestRecovery
 * and server.ts sendClientRequest in the ZCode source), so that a host which lost its in-memory registration can
 * register it again. The business `requestId` stays the same across re-sends, and the first answer to any of the
 * wire ids settles the interaction; later answers are ignored.
 *
 * The registry keys open interactions by that requestId: a re-sent request gets the promise of the card already
 * open (every wire id receives the same answer) instead of a second card. A settled interaction is remembered for a
 * while, because a re-send can already be on its way when the answer goes out.
 */

export const SETTLED_GRACE_MS = 60000

export class InteractionRegistry {
  /** @param {{ graceMs?: number }} [options] */
  constructor({ graceMs = SETTLED_GRACE_MS } = {}) {
    this.graceMs = graceMs
    this.entries = new Map()
  }

  /**
   * Run `open(entry)` for a new interaction, or join the one already open for the same requestId.
   * `open` receives the entry so it can record the client request it is waiting on (`entry.clientId`).
   * @template T
   * @param {object} params the agent's request params (requestId is ZCode's business id)
   * @param {(entry: {requestId: string|null, clientId: string|number|null, threadId: string|null}) => Promise<T>} open
   * @returns {Promise<T>}
   */
  run(params, open) {
    const requestId = typeof params?.requestId === 'string' && params.requestId ? params.requestId : null
    if (!requestId) return open({ requestId: null, clientId: null, threadId: null })
    const existing = this.entries.get(requestId)
    if (existing) return existing.promise
    const entry = { requestId, clientId: null, threadId: null, settled: false, promise: null, timer: null }
    this.entries.set(requestId, entry)
    entry.promise = Promise.resolve().then(() => open(entry)).finally(() => {
      entry.settled = true
      entry.clientId = null
      entry.timer = setTimeout(() => { if (this.entries.get(requestId) === entry) this.entries.delete(requestId) }, this.graceMs)
      entry.timer.unref?.()
    })
    return entry.promise
  }

  /** The open (unanswered) interaction for a requestId, or null. */
  open(requestId) {
    const entry = typeof requestId === 'string' ? this.entries.get(requestId) : null
    return entry && !entry.settled ? entry : null
  }

  /** Forget everything (the agent process went away: its request ids mean nothing any more). */
  clear() {
    for (const entry of this.entries.values()) clearTimeout(entry.timer)
    this.entries.clear()
  }

  get size() { return this.entries.size }
}
