/**
 * thread/fork → a Harness fork: a new ordinary session seeded with an exact
 * inclusive event prefix of the source (dsh-session `buildForkSeed`), as the
 * DeepSeek app's own fork does (dsh-api-session-controller `fork`). The new
 * session's header names the source as `parentSession` (a fork, not a
 * sub-agent), so its Thread carries `forkedFromId` (subagents.js) and shows
 * the history it copied.
 *
 * The cut follows Codex ThreadForkParams: `lastTurnId` forks through that turn
 * (it cannot be in progress), `beforeTurnId` forks through the turn before it,
 * neither forks through the latest completed turn. A turn ends at its
 * `turn/end` (a manual compaction's at its `compaction/end`, projection.js
 * endSeq); the cut then takes the events that still belong to it, up to the
 * next turn, prompt, inbox splice or manual compaction (upstream's
 * latestCompletedPrefixBoundary, which also stops at a manual compaction so a
 * later compaction turn is not carried into the fork).
 *
 * @module @code-desktop/dsh-codex-app-server/fork
 */

import { invalidParams } from './transport.js'

/** Events after a turn's end that start the next unit of the log (not part of the turn). */
export function startsNext(event) {
  return event.type === 'turn/start'
    || (event.type === 'user/message' && event.surfaceOp === 'append')
    || event.type === 'agent/inbox/spliced'
    || (event.type === 'compaction/start' && (event.data?.turn === null || event.data?.turn === undefined))
}

/**
 * The inclusive source event seq a fork copies through.
 * @param {{ turns: Array<{id: string|null, status: string, endSeq?: number|null}>, events: ReadonlyArray<{seq: number, type: string}>, lastTurnId?: string|null, beforeTurnId?: string|null }} input
 * @returns {number}
 * @throws INVALID_PARAMS with the reason the fork cannot be made
 */
export function forkBoundary({ turns, events, lastTurnId, beforeTurnId }) {
  const last = typeof lastTurnId === 'string' && lastTurnId ? lastTurnId : null
  const before = typeof beforeTurnId === 'string' && beforeTurnId ? beforeTurnId : null
  if (last && before) throw invalidParams('lastTurnId and beforeTurnId cannot be combined.')
  const listed = turns.filter((turn) => typeof turn.id === 'string' && turn.id)
  let turn
  if (last) {
    turn = listed.find((candidate) => candidate.id === last)
    if (!turn) throw invalidParams(`Unknown turn: ${last}`)
  } else if (before) {
    const index = listed.findIndex((candidate) => candidate.id === before)
    if (index < 0) throw invalidParams(`Unknown turn: ${before}`)
    if (index === 0) throw invalidParams('There is no conversation before the first turn to fork.')
    turn = listed[index - 1]
  } else {
    turn = listed.findLast((candidate) => candidate.status !== 'inProgress' && Number.isInteger(candidate.endSeq))
    if (!turn) throw invalidParams('This session has no completed turn to fork from yet.')
  }
  if (turn.status === 'inProgress') throw invalidParams('That turn is still running. Wait for it to finish or stop it first.')
  if (!Number.isInteger(turn.endSeq)) throw invalidParams('That turn cannot be forked: its end is not in the session log.')
  let boundary = turn.endSeq
  for (let seq = boundary + 1; seq < events.length; seq++) {
    const event = events[seq]
    if (event?.seq !== seq || startsNext(event)) break
    boundary = seq
  }
  if (events[boundary]?.seq !== boundary) throw invalidParams('The session log cannot be forked at that turn.')
  return boundary
}

/**
 * A fork seed (dsh-session buildForkSeed) whose agent inbox starts empty. A prompt sent or queued while the forked turn
 * was still running (turn/start during a turn, thread/queue/add, a sub-agent notice) is spliced into the inbox inside
 * that turn, before its turn/end, so the cut carries it; the turn that claimed it came after the cut. Left pending, the
 * fork's first prompt would run that cut-off prompt first (its tools included). So the fork's own events (after its
 * session/end-seed) discard whatever the copied splices leave pending, the way the inbox discards a queued message
 * (dsh-agent-loop inbox mutate: removedCount, nothing inserted, outcome 'canceled').
 * @param {Array<{seq: number, time: number, type: string, data?: any}>} seed
 * @returns {Array<object>} the seed, with the discarding splices appended when something was pending
 */
export function withEmptyInbox(seed) {
  const pending = { 'next-turn': 0, 'next-step': 0 }
  for (const event of seed) {
    if (event.type !== 'agent/inbox/spliced') continue
    const splice = event.data ?? {}
    if (!(splice.target in pending)) continue
    pending[splice.target] += (Array.isArray(splice.inserted) ? splice.inserted.length : 0) - (splice.removedCount ?? 0)
  }
  const out = [...seed]
  for (const target of ['next-turn', 'next-step']) {
    if (pending[target] <= 0) continue
    const last = out.at(-1)
    out.push({ type: 'agent/inbox/spliced', seq: last.seq + 1, time: last.time, data: { target, start: 0, removedCount: pending[target], inserted: [], outcome: 'canceled' } })
  }
  return out
}
