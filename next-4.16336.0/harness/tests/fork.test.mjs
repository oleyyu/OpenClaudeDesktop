import test from 'node:test'
import assert from 'node:assert/strict'
import { forkBoundary, withEmptyInbox } from '../packages/codex-app-server/src/fork.js'
import { buildForkSeed } from '@deepseek-ai/dsh-session/fork'
import { ThreadProjector } from '../packages/codex-app-server/src/projection.js'

/** A log with contiguous seqs from 0, projected as the bridge does. */
function session(types) {
  const events = types.map(([type, data = {}, extra = {}], seq) => ({ type, data, seq, time: 1000 + seq, ...extra }))
  const projector = new ThreadProjector({ threadId: 's', cwd: '/w' })
  for (const event of events) projector.apply(event)
  return { events, turns: projector.turns }
}

const prompt = (id) => ['user/message', { id, content: [{ type: 'text', text: id }], source: { kind: 'user' } }, { surfaceOp: 'append' }]
const reply = (turn) => ['assistant/message', { turn, step: 1, message: { content: [{ type: 'text', text: 'ok' }] } }]

const LOG = [
  ['session/start'], // 0
  ['turn/start', { turn: 1 }], prompt('u1'), reply(1), ['turn/end', { turn: 1, reason: { kind: 'completed' } }], // 1-4
  ['session/title', { title: 'Hi' }], // 5: still the first turn's
  prompt('u2'), ['turn/start', { turn: 2 }], reply(2), ['turn/end', { turn: 2, reason: { kind: 'completed' } }], // 6-9
  ['compaction/start', { compactionId: 'k', turn: null }], ['compaction/end', { compactionId: 'k' }], // 10-11
  ['turn/start', { turn: 3 }], prompt('u3'), reply(3), // 12-14: still running
]

test('lastTurnId forks through that turn and the events that still belong to it', () => {
  const { events, turns } = session(LOG)
  assert.deepEqual(turns.map((turn) => turn.id), ['turn-u1', 'turn-u2', 'turn-ck', 'turn-u3'])
  assert.equal(forkBoundary({ turns, events, lastTurnId: 'turn-u1' }), 5)
  // A manual compaction after the turn is its own turn, not carried into the fork.
  assert.equal(forkBoundary({ turns, events, lastTurnId: 'turn-u2' }), 9)
  assert.equal(forkBoundary({ turns, events, lastTurnId: 'turn-ck' }), 11)
})

test('no turn named: the latest completed turn; beforeTurnId: the turn before it', () => {
  const { events, turns } = session(LOG)
  assert.equal(forkBoundary({ turns, events }), 11)
  assert.equal(forkBoundary({ turns, events, beforeTurnId: 'turn-u2' }), 5)
})

test('a fork is refused when it cannot be cut exactly', () => {
  const { events, turns } = session(LOG)
  const code = (fn) => { try { fn(); return null } catch (error) { return [error.code, error.message] } }
  assert.match(code(() => forkBoundary({ turns, events, lastTurnId: 'turn-u3' }))[1], /still running/)
  assert.match(code(() => forkBoundary({ turns, events, lastTurnId: 'turn-zz' }))[1], /Unknown turn/)
  assert.match(code(() => forkBoundary({ turns, events, lastTurnId: 'turn-u1', beforeTurnId: 'turn-u2' }))[1], /cannot be combined/)
  assert.match(code(() => forkBoundary({ turns, events, beforeTurnId: 'turn-u1' }))[1], /before the first turn/)
  assert.equal(code(() => forkBoundary({ turns, events, lastTurnId: 'turn-u3' }))[0], -32602)
  const blank = session([['session/start'], ['turn/start', { turn: 1 }], prompt('u1')])
  assert.match(code(() => forkBoundary(blank))[1], /no completed turn/)
})

test('a compaction turn the next turn cut off ends before that turn starts', () => {
  const { events, turns } = session([
    ['session/start'], ['turn/start', { turn: 1 }], prompt('u1'), reply(1), ['turn/end', { turn: 1, reason: { kind: 'completed' } }], // 0-4
    ['compaction/start', { compactionId: 'k', turn: null }], // 5: its end was never logged
    ['turn/start', { turn: 2 }], prompt('u2'), // 6-7
  ])
  assert.deepEqual(turns.map((turn) => [turn.id, turn.status]), [['turn-u1', 'completed'], ['turn-ck', 'interrupted'], ['turn-u2', 'inProgress']])
  assert.equal(forkBoundary({ turns, events, lastTurnId: 'turn-ck' }), 5)
})

test('a prompt queued while the forked turn ran stays with the source: the fork starts with an empty inbox', () => {
  const queued = (id) => ({ id, content: [{ type: 'text', text: id }] })
  const splice = (data) => ['agent/inbox/spliced', data]
  // Turn 1 runs; P_NEXT is sent meanwhile (spliced into the next-turn inbox before turn/end); turn 2 claims it.
  const { events, turns } = session([
    ['session/start'], // 0
    ['turn/start', { turn: 1 }], prompt('u1'), splice({ target: 'next-turn', start: 0, inserted: [queued('next')] }), reply(1), ['turn/end', { turn: 1, reason: { kind: 'completed' } }], // 1-5
    splice({ target: 'next-turn', start: 0, removedCount: 1, inserted: [] }), ['turn/start', { turn: 2 }], prompt('next'), reply(2), ['turn/end', { turn: 2, reason: { kind: 'completed' } }], // 6-10
  ])
  const boundary = forkBoundary({ turns, events, lastTurnId: turns[0].id })
  assert.equal(boundary, 5, 'the claim (seq 6) starts the next unit')
  const seed = withEmptyInbox(buildForkSeed(events, boundary))
  // The copied prefix and its end-seed are untouched; the fork's own events discard what the prefix left pending.
  assert.deepEqual(seed.slice(0, boundary + 2).map((event) => event.type), [...events.slice(0, boundary + 1).map((event) => event.type), 'session/end-seed'])
  const last = seed.at(-1)
  assert.deepEqual([last.type, last.seq, last.time, last.data], ['agent/inbox/spliced', boundary + 2, seed.at(-2).time, { target: 'next-turn', start: 0, removedCount: 1, inserted: [], outcome: 'canceled' }])
  seed.forEach((event, index) => assert.equal(event.seq, index))
  // Nothing pending (forked after the claim, or no splice at all): the seed is left as it is.
  const later = buildForkSeed(events, forkBoundary({ turns, events, lastTurnId: turns[1].id }))
  assert.deepEqual(withEmptyInbox(later), later)
  const plain = session(LOG)
  const noInbox = buildForkSeed(plain.events, forkBoundary({ turns: plain.turns, events: plain.events, lastTurnId: plain.turns[0].id }))
  assert.deepEqual(withEmptyInbox(noInbox), noInbox)
})
