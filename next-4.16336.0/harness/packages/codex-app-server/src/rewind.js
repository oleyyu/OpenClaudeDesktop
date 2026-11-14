/**
 * thread/revert (Rewind, Edit message, the error card's Rewind) on a Harness
 * session. The session log is append-only and its events are never rewritten,
 * so a rewind does what the Harness's own compaction does to the model's view:
 * it replaces surface nodes. Every node that came after the cut is shadowed by
 * a short `user/message` notice (source kind `code-desktop-rewind`), each
 * replacement priced by an adjacent `compaction/prune` (the token meter's
 * shadow-price protocol). The model's next request then sees the conversation
 * as it was before that turn, and the projection (projection.js) drops the
 * turns after the cut when it meets the notice, live and on every replay.
 *
 *   cut          the turn before `beforeTurnId` ends where a fork through it
 *                would (fork.js forkBoundary); before the first turn, at the
 *                log's first prompt or turn
 *   kept nodes   the system prompt and the agent's tool-registry changes stay
 *                in place (node 0 may only be rewritten by a system/message,
 *                and the loop keeps its own record of both), so the shadowed
 *                runs are the dialogue between them
 *   compaction   a replacement after the cut that covers both sides (a
 *                compaction that summarized kept and later turns together)
 *                cannot be undone: the rewind is refused. One that covers only
 *                kept content (a tool-result prune) stays kept
 *
 * Files the dropped turns changed are left as they are (no rewindFiles).
 *
 * @module @code-desktop/dsh-codex-app-server/rewind
 */

import { RpcError, invalidParams } from './transport.js'
import { forkBoundary, startsNext } from './fork.js'

/** The notice's message source kind (a Harness MessageSourceMap kind of OpenClaude Desktop's own). */
export const REWIND_SOURCE = 'code-desktop-rewind'
/** What the model reads where the dropped turns were. */
export const REWIND_NOTICE = '[OpenClaude Desktop] The user rewound the conversation to this point. The messages that followed were removed; files they changed were not restored.'
/** A later run of dropped messages, after a kept system or tool-registry node. */
export const REWIND_GAP_NOTICE = '[OpenClaude Desktop] Removed by the rewind above.'

const SURFACE_TYPES = new Set(['system/message', 'developer/message', 'user/message', 'assistant/message', 'tool/result'])
// Surface nodes a rewind leaves in place even after the cut.
const STAYING_TYPES = new Set(['system/message', 'developer/message'])

const unreadable = () => new RpcError(-32000, 'The session history could not be read.')

/**
 * The last event seq a rewind to before `beforeTurnId` keeps (-1: none).
 * @param {{ turns: Array<{id: string|null, status: string, endSeq?: number|null}>, events: ReadonlyArray<{seq: number, type: string}>, beforeTurnId?: string|null }} input
 * @returns {number}
 * @throws INVALID_PARAMS with the reason the rewind cannot be made
 */
export function rewindBoundary({ turns, events, beforeTurnId }) {
  const before = typeof beforeTurnId === 'string' && beforeTurnId ? beforeTurnId : null
  if (!before) throw invalidParams('beforeTurnId is required.')
  const listed = turns.filter((turn) => typeof turn.id === 'string' && turn.id)
  const index = listed.findIndex((turn) => turn.id === before)
  if (index < 0) throw invalidParams(`Unknown turn: ${before}`)
  if (listed.slice(index).some((turn) => turn.status === 'inProgress')) throw invalidParams('That turn is still running. Wait for it to finish or stop it first.')
  if (index > 0) {
    try {
      return forkBoundary({ turns, events, beforeTurnId: before })
    } catch (error) {
      if (/fork/i.test(error?.message ?? '')) throw invalidParams('The session log cannot be rewound at that turn.')
      throw error
    }
  }
  for (let seq = 0; seq < events.length; seq++) {
    const event = events[seq]
    if (event?.seq !== seq) break
    if (startsNext(event)) return seq - 1
  }
  throw invalidParams('The session log cannot be rewound at that turn.')
}

/**
 * The surface runs a rewind to `boundary` shadows, in surface order: each run
 * is the seqs of adjacent dropped dialogue nodes. `nodes` (the live surface,
 * session.surface.nodes) is checked against the log's own fold when given.
 * @param {{ events: ReadonlyArray<{seq: number, type: string, surfaceOp?: unknown}>, boundary: number, nodes?: ReadonlyArray<number> }} input
 * @returns {number[][]}
 * @throws INVALID_PARAMS when a compaction after the cut covered kept content
 */
export function rewindRuns({ events, boundary, nodes }) {
  /** @type {Array<{seq: number, type: string, side: 'kept' | 'dropped' | 'mixed'}>} */
  const surface = []
  for (const event of events) {
    if (!SURFACE_TYPES.has(event?.type) || event.surfaceOp === undefined) continue
    const op = event.surfaceOp
    if (op === 'append') {
      surface.push({ seq: event.seq, type: event.type, side: event.seq <= boundary ? 'kept' : 'dropped' })
      continue
    }
    if (op === null || typeof op !== 'object' || op.op !== 'replace') throw unreadable()
    const start = surface.findIndex((node) => node.seq === op.startSeq)
    const end = surface.findIndex((node) => node.seq === op.endSeq)
    if (start < 0 || end < start) throw unreadable()
    const sides = new Set(surface.slice(start, end + 1).map((node) => node.side))
    const side = sides.size === 1 ? [...sides][0] : 'mixed'
    surface.splice(start, end - start + 1, { seq: event.seq, type: event.type, side })
  }
  if (nodes && (nodes.length !== surface.length || surface.some((node, index) => node.seq !== nodes[index]))) throw unreadable()
  if (surface.some((node) => node.side === 'mixed'))
    throw invalidParams('The conversation was compacted after that message, so it can no longer be rewound there. Fork from an earlier message instead, or rewind to a later one.')
  const runs = []
  let run = []
  let dropping = false
  for (const node of surface) {
    if (node.side === 'kept') {
      if (dropping) throw unreadable()
      continue
    }
    dropping = true
    if (STAYING_TYPES.has(node.type)) {
      if (run.length) runs.push(run)
      run = []
    } else run.push(node.seq)
  }
  if (run.length) runs.push(run)
  return runs
}

/** The notice's source: the cut and the first dropped turn, read back by the projection. */
export function rewindSource(boundary, beforeTurnId) {
  return { kind: REWIND_SOURCE, form: 'notice', summary: 'Conversation rewound', boundarySeq: boundary, beforeTurnId }
}

/**
 * The events a rewind appends, in order: per run, its shadow price (when
 * `estimate` prices it) and the notice that replaces it.
 * @param {number[][]} runs rewindRuns
 * @param {{ boundary: number, beforeTurnId: string, newMessage: (fields: {content: object[], source: object}) => object, estimate?: (seqs: number[]) => number | undefined }} options
 * @returns {Array<[string, object, object?]>} session.append arguments
 */
export function rewindAppends(runs, { boundary, beforeTurnId, newMessage, estimate }) {
  const appends = []
  runs.forEach((run, index) => {
    const start = run[0]
    const end = run.at(-1)
    let tokens
    try { tokens = estimate?.(run) } catch { tokens = undefined }
    if (Number.isSafeInteger(tokens) && tokens >= 0) appends.push(['compaction/prune', { shadowedRange: { start, end }, shadowedSeqs: [...run], shadowedTokenCount: tokens }])
    const text = index === 0 ? REWIND_NOTICE : REWIND_GAP_NOTICE
    appends.push(['user/message', newMessage({ content: [{ type: 'text', text }], source: rewindSource(boundary, beforeTurnId) }), { surfaceOp: { op: 'replace', startSeq: start, endSeq: end }, sourceEventSeqs: [...run] }])
  })
  return appends
}
