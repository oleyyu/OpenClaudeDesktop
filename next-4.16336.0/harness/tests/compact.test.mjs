import test from 'node:test'
import assert from 'node:assert/strict'
import { runCompact } from '../packages/codex-app-server/src/compact.js'
import { ThreadProjector } from '../packages/codex-app-server/src/projection.js'

let seq = 0
const ev = (type, data) => ({ type, data, seq: ++seq, time: 2_000_000 + seq })

// The bridge wiring of thread/compact/start, against a real projector: the
// fake execute logs what Harness would and the projector notes go on the wire.
function harness(execute) {
  const projector = new ThreadProjector({ threadId: 't' })
  const wire = []
  const notify = (method, params) => wire.push({ method, params })
  const startedTurn = projector.lastSyntheticCompactionTurnId
  const controller = new AbortController()
  const log = (type, data) => { for (const note of projector.apply(ev(type, data))) notify(note.method, note.params) }
  const run = () => runCompact({
    execute: (signal) => execute(signal, log),
    signal: controller.signal,
    threadId: 't',
    notify,
    openedTurnId: () => (projector.lastSyntheticCompactionTurnId !== startedTurn ? projector.lastSyntheticCompactionTurnId : null),
    closeOpened: (turnId, status, error) => projector.closeSynthetic(turnId, status, error),
    newTurnId: () => 'turn-compact-x',
    now: () => 5_000,
  })
  return { projector, wire, controller, run }
}

test('execute gets an AbortSignal; a compaction that ran adds no notes of its own', async () => {
  const calls = []
  const h = harness(async (signal, log) => {
    calls.push(signal)
    log('compaction/start', { compactionId: 'k1', turn: null })
    log('compaction/end', { compactionId: 'k1', turn: null })
    return { commandId: 'cmd-1', result: { kind: 'success', text: 'Compacted 4 history items (~900 tokens).' } }
  })
  const outcome = await h.run()
  assert.equal(calls.length, 1)
  assert.ok(calls[0] instanceof AbortSignal)
  assert.deepEqual(outcome, { turnId: 'turn-ck1', opened: true, status: 'completed', error: null })
  assert.deepEqual(h.wire.map((n) => n.method), ['turn/started', 'item/started', 'item/completed', 'turn/completed'])
  assert.equal(h.wire.at(-1).params.turn.status, 'completed')
})

test('success without a compaction still gives the client a terminal turn', async () => {
  const h = harness(async () => ({ commandId: 'cmd-2', result: { kind: 'success', text: 'No compactable history yet.' } }))
  assert.equal((await h.run()).opened, false)
  assert.deepEqual(h.wire.map((n) => [n.method, n.params.turn.id, n.params.turn.status]), [
    ['turn/started', 'turn-compact-x', 'inProgress'],
    ['turn/completed', 'turn-compact-x', 'completed'],
  ])
  assert.equal(h.wire[0].params.threadId, 't')
  assert.deepEqual(h.wire[1].params.turn.items, [])
  assert.equal(h.wire[1].params.turn.error, null)
})

test('an error result fails the turn with the command text', async () => {
  const h = harness(async () => ({ commandId: 'cmd-3', result: { kind: 'error', text: 'No compactable history yet.' } }))
  const outcome = await h.run()
  assert.equal(outcome.status, 'failed')
  const done = h.wire.at(-1)
  assert.equal(done.method, 'turn/completed')
  assert.equal(done.params.turn.status, 'failed')
  assert.deepEqual(done.params.turn.error, { message: 'No compactable history yet.', codexErrorInfo: null, additionalDetails: null, misalignment: null })
})

test('a throw or an unknown command fails; an aborted signal interrupts', async () => {
  const thrown = harness(async () => { throw new Error('agent "s" already has active work') })
  await thrown.run()
  assert.equal(thrown.wire.at(-1).params.turn.error.message, 'agent "s" already has active work')

  const missing = harness(async () => undefined)
  await missing.run()
  assert.equal(missing.wire.at(-1).params.turn.status, 'failed')

  const stopped = harness((signal) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))))
  const running = stopped.run()
  stopped.controller.abort(new Error('Compaction interrupted.'))
  const outcome = await running
  assert.equal(outcome.status, 'interrupted')
  assert.deepEqual(stopped.wire.map((n) => [n.method, n.params.turn.status]), [['turn/started', 'inProgress'], ['turn/completed', 'interrupted']])
  assert.equal(stopped.wire.at(-1).params.turn.error, null)
})

test('a compaction whose end never reached the log is closed by the run outcome', async () => {
  const failed = harness(async (signal, log) => {
    log('compaction/start', { compactionId: 'k2', turn: null })
    return { commandId: 'cmd-4', result: { kind: 'error', text: 'Compaction did not finish cleanly.' } }
  })
  await failed.run()
  assert.deepEqual(failed.wire.map((n) => n.method), ['turn/started', 'item/started', 'turn/completed'])
  assert.equal(failed.wire.at(-1).params.turn.id, 'turn-ck2')
  assert.equal(failed.wire.at(-1).params.turn.error.message, 'Compaction did not finish cleanly.')
  assert.equal(failed.projector.activeTurn, null)

  const stopped = harness(async (signal, log) => {
    log('compaction/start', { compactionId: 'k3', turn: null })
    await new Promise((resolve) => signal.addEventListener('abort', resolve))
    log('compaction/end', { compactionId: 'k3', turn: null, error: 'Compaction interrupted.' })
    return { commandId: 'cmd-5', result: { kind: 'error', text: 'Compaction cancelled.' } }
  })
  const running = stopped.run()
  await new Promise((resolve) => setImmediate(resolve))
  stopped.controller.abort()
  await running
  // The projector settled it from the logged end; the run adds nothing.
  assert.deepEqual(stopped.wire.map((n) => n.method), ['turn/started', 'item/started', 'turn/completed'])
  assert.equal(stopped.wire.at(-1).params.turn.status, 'interrupted')
})
