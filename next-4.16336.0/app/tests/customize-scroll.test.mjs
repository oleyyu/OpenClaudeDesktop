import test from 'node:test';
import assert from 'node:assert/strict';
import { bindCustomizeScroll } from '../src/customize-scroll.mjs';

function scroller() {
  const handlers = new Set();
  return { scrollTop: 0, handlers,
    addEventListener(type, fn, options) { assert.equal(type, 'scroll'); assert.deepEqual(options, { passive: true }); handlers.add(fn); },
    removeEventListener(type, fn) { assert.equal(type, 'scroll'); handlers.delete(fn); },
    scroll(top) { this.scrollTop = top; for (const fn of handlers) fn(); },
  };
}
test('Customize list restores actual scroll on drill-back and separates query/owner keys', () => {
  const memory = new Map(), list = scroller();
  let off = bindCustomizeScroll(list, memory, 'all'); list.scroll(420); off();
  off = bindCustomizeScroll(list, memory, 'personal'); assert.equal(list.scrollTop, 0); list.scroll(84); off();
  const returned = scroller(); off = bindCustomizeScroll(returned, memory, 'all');
  assert.equal(returned.scrollTop, 420); off();
  off = bindCustomizeScroll(returned, memory, 'personal'); assert.equal(returned.scrollTop, 84); off();
  off = bindCustomizeScroll(returned, memory, 'personal:search'); assert.equal(returned.scrollTop, 0); off();
  assert.equal(returned.handlers.size, 0);
});
test('content clamp during cleanup and stale scroll callback cannot overwrite prior list memory', () => {
  const memory = new Map(), list = scroller();
  const off = bindCustomizeScroll(list, memory, 'list'); list.scroll(300);
  const callback = [...list.handlers][0]; list.scrollTop = 0; off(); callback();
  assert.equal(memory.get('list'), 300);
  const next = bindCustomizeScroll(list, memory, 'list'); assert.equal(list.scrollTop, 300); next();
});
test('invalid positions do not become restoration targets or leak between page instances', () => {
  const memory = new Map([['list', NaN]]), list = scroller();
  const off = bindCustomizeScroll(list, memory, 'list'); assert.equal(list.scrollTop, 0);
  list.scroll(17); list.scroll(-1); list.scroll(Infinity); assert.equal(memory.get('list'), 17); off();
  const next = bindCustomizeScroll(list, new Map(), 'list'); assert.equal(list.scrollTop, 0); next();
});
