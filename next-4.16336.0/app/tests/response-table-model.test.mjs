import test from 'node:test';
import assert from 'node:assert/strict';
import { tableOverflows, nearestTableHeading, observeTableOverflow, createResponseTableStore, transitionMilliseconds } from '../src/response-table-model.mjs';

test('table expansion uses the source one-pixel boundary and is absent during streaming', () => {
  assert.equal(tableOverflows(101, 100), false);
  assert.equal(tableOverflows(101.01, 100), true);
  assert.equal(tableOverflows(500, 100, true), false);
  assert.equal(tableOverflows(99, 100), false);
});
function element(kind, text = '', children = []) {
  const node = { textContent: text, children, parentElement: null, previousElementSibling: null,
    matches(selector) { return kind === 'scope' ? selector.includes('.source-markdown') : selector.split(',').includes(kind); },
    querySelectorAll(selector) { return node.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); },
  };
  children.forEach((child, index) => { child.parentElement = node; child.previousElementSibling = children[index - 1] || null; });
  return node;
}
test('table title selects the nearest preceding heading and never crosses the response boundary', () => {
  const prior = element('h1', 'Wrong prior response'), nested = element('div', '', [element('h2', 'Earlier'), element('h3', '  Current heading  ')]);
  const table = element('div'), paragraph = element('p', 'Not a heading');
  const scope = element('scope', '', [nested, paragraph, table, element('h4', 'Wrong following heading')]);
  element('main', '', [prior, scope]);
  assert.equal(nearestTableHeading(table), 'Current heading');
  nested.children = [];
  assert.equal(nearestTableHeading(table), null);
});
test('table title can walk up a wrapper but does not skip over a nearer nonempty heading', () => {
  const table = element('div'), wrapper = element('div', '', [element('p', ''), table]);
  element('scope', '', [element('h2', 'Section'), wrapper]);
  assert.equal(nearestTableHeading(table), 'Section');
});
test('overflow observations belong to this mount and observe the table as well as its viewport', () => {
  const observed = [], values = []; let callback, disconnected = false;
  class Observer { constructor(fn) { callback = fn; } observe(node) { observed.push(node); } disconnect() { disconnected = true; } }
  const child = {}, node = { scrollWidth: 900, clientWidth: 400, children: [child] };
  const dispose = observeTableOverflow(node, value => values.push(value), Observer);
  assert.deepEqual(observed, [node, child]); callback(); assert.deepEqual(values, [true]);
  node.clientWidth = 1000; callback(); assert.deepEqual(values, [true, false]);
  dispose(); node.clientWidth = 400; callback(); assert.equal(disconnected, true); assert.deepEqual(values, [true, false]);
});
test('expanded table keeps the actual clicked snapshot until exit and ignores stale releases', () => {
  const store = createResponseTableStore(), a = { owner: 'a', rows: ['A'] }, b = { owner: 'b', rows: ['B'] };
  let updates = 0; const off = store.subscribe(() => updates++);
  store.show(a); const first = store.getSnapshot();
  store.close(); assert.equal(store.getSnapshot().snapshot, a); assert.equal(store.getSnapshot().open, false);
  store.show(b); store.release(first.version); assert.equal(store.getSnapshot().snapshot, b);
  store.release(store.getSnapshot().version); assert.equal(store.getSnapshot().snapshot, b);
  store.close(); store.release(store.getSnapshot().version); assert.equal(store.getSnapshot().snapshot, null);
  const before = updates; off(); store.show(a); assert.equal(updates, before);
});
test('exit residency follows computed CSS timings, including reduced motion and delays', () => {
  assert.equal(transitionMilliseconds({ transitionDuration: '0.2s, 200ms', transitionDelay: '0s' }), 200);
  assert.equal(transitionMilliseconds({ transitionDuration: '0s', transitionDelay: '0s' }), 0);
  assert.equal(transitionMilliseconds({ transitionDuration: '60ms, .2s', transitionDelay: '.1s' }), 300);
});
