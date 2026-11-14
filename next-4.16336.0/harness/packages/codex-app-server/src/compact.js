/**
 * thread/compact/start as a Codex compaction turn.
 *
 * Harness `/compact` is a command, not a turn: it runs as agent maintenance and
 * logs `compaction/start` … `compaction/end` with `turn: null`. The projector
 * opens a synthetic `turn-c<compactionId>` turn for that pair, so a compaction
 * that really ran already has its lifecycle on the wire. This module settles
 * everything else: a run that failed or was stopped while that turn was still
 * open, and a run that never reached `compaction/start` (nothing to compact,
 * busy agent, command missing), which gets a turnless `turn-compact-<uuid>`
 * so the client's compaction lock always sees a terminal turn.
 */

import { errorChain } from '@deepseek-ai/dsh-llm'

const seconds = (ms) => Math.floor(ms / 1000)
const turnError = (message) => ({ message, codexErrorInfo: null, additionalDetails: null, misalignment: null })

/**
 * Run one manual compaction and make sure it ends in a Codex turn/completed.
 * @param {object} options
 * @param {(signal: AbortSignal) => Promise<{commandId: string, result: {kind: 'success' | 'error', text?: string}} | undefined>} options.execute
 *   dsh-commands `execute(agent, '/compact', [], signal)`; the result is nested under `.result`.
 * @param {AbortSignal} options.signal - aborted by turn/interrupt.
 * @param {string} options.threadId
 * @param {(method: string, params: object) => void} options.notify
 * @param {() => string | null | undefined} options.openedTurnId - the synthetic turn this run opened, if any.
 * @param {(turnId: string, status: string, error: object | null) => Array<{method: string, params: object}>} options.closeOpened
 *   closes that turn when it is still open (ThreadProjector.closeSynthetic).
 * @param {() => string} options.newTurnId - id for a run that opened no turn.
 * @param {() => number} [options.now]
 * @returns {Promise<{turnId: string, opened: boolean, status: 'completed' | 'failed' | 'interrupted', error: object | null}>}
 *   `opened`: the turn is the projector's (a compaction really started).
 */
export async function runCompact({ execute, signal, threadId, notify, openedTurnId, closeOpened, newTurnId, now = Date.now }) {
  const startedMs = now()
  let status = 'completed'
  let message = null
  try {
    const execution = await execute(signal)
    const result = execution?.result
    if (signal.aborted) status = 'interrupted'
    else if (!result) {
      status = 'failed'
      message = 'The /compact command is not available in this Harness profile.'
    } else if (result.kind === 'error') {
      status = 'failed'
      message = result.text || 'Compaction failed.'
    }
  } catch (error) {
    if (signal.aborted) status = 'interrupted'
    else {
      status = 'failed'
      message = errorChain(error)
    }
  }
  const error = status === 'failed' ? turnError(message) : null
  const opened = openedTurnId()
  if (opened) {
    // A run that really compacted is settled by its compaction/end; closing is
    // a no-op then and only matters when that end never reached the log.
    for (const note of closeOpened(opened, status, error)) notify(note.method, note.params)
    return { turnId: opened, opened: true, status, error }
  }
  const turnId = newTurnId()
  const turn = { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(startedMs), completedAt: null, durationMs: null }
  notify('turn/started', { threadId, turn })
  const endedMs = now()
  notify('turn/completed', { threadId, turn: { ...turn, status, error, completedAt: seconds(endedMs), durationMs: Math.max(0, endedMs - startedMs) } })
  return { turnId, opened: false, status, error }
}
