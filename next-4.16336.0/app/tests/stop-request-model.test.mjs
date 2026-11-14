import test from 'node:test';
import assert from 'node:assert/strict';
import { createStopRequestTracker, stopRequestMatches } from '../src/stop-request-model.mjs';

const identity = { threadId: 'a', turnId: 'turn-a', connectionId: 'conn', connectionEpoch: 1 };
const live = { connected: true, connectionId: 'conn', connectionEpoch: 1, active: { a: 'turn-a', b: 'turn-b' } };

test('repeated Stop is deduplicated; acknowledgement cannot imply completed turn', () => {
  let changes = 0; const tracker = createStopRequestTracker(() => changes++);
  const request = tracker.begin(identity);
  assert.ok(request); assert.equal(tracker.begin(identity), null);
  tracker.reconcile(live); assert.equal(tracker.has('a', live), true);
  assert.equal(tracker.has('b', live), false); assert.equal(changes, 1);
  tracker.reconcile({ ...live, active: { ...live.active, a: null } });
  assert.equal(tracker.has('a', live), false); assert.equal(changes, 2);
});
test('late failure from an earlier turn cannot clear a newer stop request', () => {
  const tracker = createStopRequestTracker(), first = tracker.begin(identity);
  const second = tracker.begin({ ...identity, turnId: 'turn-new' });
  assert.equal(tracker.fail(first), false);
  assert.equal(tracker.has('a', { ...live, active: { a: 'turn-new' } }), true);
  assert.equal(tracker.fail(second), true); assert.equal(tracker.begin({ ...identity, turnId: 'turn-new' }) != null, true);
});
test('disconnect or replacement connection invalidates even reused thread and turn IDs', () => {
  const tracker = createStopRequestTracker(), first = tracker.begin(identity);
  assert.equal(stopRequestMatches(first, { ...live, connected: false }), false);
  tracker.reconcile({ ...live, connected: false });
  const second = tracker.begin({ ...identity, connectionId: 'new', connectionEpoch: 2 });
  assert.equal(tracker.fail(first), false); assert.ok(second);
  assert.equal(tracker.has('a', live), false);
  assert.equal(tracker.has('a', { ...live, connectionId: 'new', connectionEpoch: 2 }), true);
});
test('two active sessions retain independent interrupt states', () => {
  const tracker = createStopRequestTracker(), first = tracker.begin(identity);
  tracker.begin({ ...identity, threadId: 'b', turnId: 'turn-b' });
  assert.equal(tracker.has('b', live), true); tracker.fail(first);
  assert.equal(tracker.has('a', live), false); assert.equal(tracker.has('b', live), true);
});
test('unknown request or connection identity never creates a stopping state', () => {
  const tracker = createStopRequestTracker();
  assert.equal(tracker.fail(null), false); assert.equal(tracker.fail(undefined), false);
  for (const bad of [null, {}, { ...identity, turnId: null }, { ...identity, connectionId: null }, { ...identity, connectionEpoch: 0 }])
    assert.equal(tracker.begin(bad), null);
  assert.equal(tracker.has('a', live), false);
});
