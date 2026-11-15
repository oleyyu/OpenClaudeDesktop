import test from 'node:test'
import assert from 'node:assert/strict'
import { buildForkSeed } from '@deepseek-ai/dsh-session/fork'
import { forkBoundary, forkSeed, pendingInbox } from '../packages/codex-app-server/src/fork.js'
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

test('a prompt queued while the cut turn ran is not carried into the fork as pending input', () => {
  const queued = { id: 'u2', content: [{ type: 'text', text: 'P_NEXT' }], source: { kind: 'user' } }
  const { events, turns } = session([
    ['session/start'], ['turn/start', { turn: 1 }], prompt('u1'), // 0-2
    ['agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [queued] }], // 3: sent/queued while turn 1 runs
    reply(1), ['turn/end', { turn: 1, reason: { kind: 'completed' } }], // 4-5
    ['turn/start', { turn: 2 }], ['agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [] }], // 6-7: claimed by turn 2
    ['user/message', queued, { surfaceOp: 'append' }], reply(2), ['turn/end', { turn: 2, reason: { kind: 'completed' } }], // 8-10
  ])
  const boundary = forkBoundary({ turns, events, lastTurnId: 'turn-u1' })
  assert.equal(boundary, 5)
  // The raw prefix still holds the queued prompt: the fork's next turn would claim it first (integration D1).
  assert.deepEqual(pendingInbox(buildForkSeed(events, boundary)), { 'next-turn': 1, 'next-step': 0 })
  const seed = forkSeed(events, boundary)
  assert.deepEqual(pendingInbox(seed), { 'next-turn': 0, 'next-step': 0 })
  // The inherited prefix is unchanged; the cancel follows the seed marker, with contiguous seqs.
  assert.deepEqual(seed.slice(0, boundary + 1), events.slice(0, boundary + 1))
  assert.equal(seed[boundary + 1].type, 'session/end-seed')
  assert.deepEqual(seed.map((event) => event.seq), seed.map((_, index) => index))
  assert.deepEqual(seed.at(-1).data, { target: 'next-turn', start: 0, removedCount: 1, inserted: [], outcome: 'canceled' })
  // Nothing pending (the latest turn): the seed is buildForkSeed's own.
  assert.deepEqual(forkSeed(events, 10), buildForkSeed(events, 10))
})
