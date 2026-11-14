import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForModalExit } from '../src/modal-presence.mjs';

function fixture(duration = '0.2s') {
  let listener, timer, removed = 0, cleared = 0, delay;
  const node = {
    ownerDocument: { defaultView: {
      getComputedStyle: () => ({ transitionDuration: duration, transitionDelay: '0s' }),
      setTimeout(fn, ms) { timer = fn; delay = ms; return 10; },
      clearTimeout(id) { assert.equal(id, 10); cleared++; },
    } },
    addEventListener(name, fn) { assert.equal(name, 'transitionend'); listener = fn; },
    removeEventListener(name, fn) { assert.equal(name, 'transitionend'); assert.equal(fn, listener); removed++; },
  };
  return { node, event: (target = node, propertyName = 'opacity') => listener({ target, propertyName }),
    expire: () => timer(), stats: () => ({ removed, cleared, delay }) };
}

test('settings exit keeps content until its own opacity completes, ignoring child/control/scale transitions', () => {
  const f = fixture(); let completed = 0;
  waitForModalExit(f.node, () => completed++);
  f.event({}, 'opacity'); f.event(f.node, 'scale'); assert.equal(completed, 0);
  f.event(); assert.equal(completed, 1);
  f.expire(); f.event(); assert.equal(completed, 1);
  assert.deepEqual(f.stats(), { removed: 1, cleared: 1, delay: 200 });
});
test('reopening or unmount cancels both delayed and already-queued exit callbacks', () => {
  const f = fixture(); let completed = 0;
  const cancel = waitForModalExit(f.node, () => completed++);
  cancel(); f.expire(); f.event(); assert.equal(completed, 0);
  assert.deepEqual(f.stats(), { removed: 1, cleared: 1, delay: 200 });
});
test('occluded settings exits by computed duration, and reduced motion does not retain a fixed 200ms', () => {
  for (const [css, milliseconds] of [['200ms', 200], ['0s', 0], ['.35s', 350]]) {
    const f = fixture(css); let completed = 0;
    waitForModalExit(f.node, () => completed++);
    assert.equal(completed, 0); assert.equal(f.stats().delay, milliseconds);
    f.expire(); assert.equal(completed, 1); f.event(); assert.equal(completed, 1);
  }
});
