import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurnClipboardFeedback, preventRepeatedSelection, turnFooterKeyIndex } from '../src/turn-footer-behavior.mjs';

function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function fixture(writer = async () => {}) {
  let now = 0, next = 0;
  const timers = new Map(), states = [], payloads = [];
  const controller = createTurnClipboardFeedback({
    writeText: text => { payloads.push(text); return writer(text); }, onState: state => states.push(state),
    schedule: (fn, delay) => { timers.set(++next, { fn, at: now + delay }); return next; },
    cancel: id => timers.delete(id),
  });
  return { controller, states, payloads, timers,
    advance(ms) { now += ms; for (const [id, task] of timers) if (task.at <= now) { timers.delete(id); task.fn(); } },
  };
}

test('copies exact inner whitespace, waits for real write and keeps confirmed feedback for 2000ms', async () => {
  const write = deferred(), f = fixture(() => write.promise);
  f.controller.setContent('thread:turn', ' \nfirst  \n\n\n\n\t```js\na < b\n```\t ');
  const copying = f.controller.copy();
  assert.equal(f.states.at(-1), 'pending');
  assert.deepEqual(f.payloads, ['first  \n\n\n\n\t```js\na < b\n```']);
  assert.equal(f.timers.size, 0);
  write.resolve(); assert.equal(await copying, true);
  assert.equal(f.states.at(-1), 'copied');
  f.advance(1999); assert.equal(f.states.at(-1), 'copied');
  f.advance(1); assert.equal(f.states.at(-1), 'idle');
});

test('clipboard rejection never reports success; retry succeeds and repeated success restarts the deadline', async () => {
  let fail = true;
  const f = fixture(async () => { if (fail) throw new Error('denied'); });
  f.controller.setContent('a', 'payload');
  assert.equal(await f.controller.copy(), false); assert.equal(f.states.at(-1), 'error');
  assert.equal(f.states.includes('copied'), false); assert.equal(f.timers.size, 0);
  fail = false; await f.controller.copy(); f.advance(1500);
  await f.controller.copy(); assert.equal(f.timers.size, 1);
  f.advance(500); assert.equal(f.states.at(-1), 'copied');
  f.advance(1500); assert.equal(f.states.at(-1), 'idle');
});

test('overlapping writes cannot let an older completion overwrite a newer error or success', async () => {
  const writes = [deferred(), deferred(), deferred(), deferred()]; let index = 0;
  const f = fixture(() => writes[index++].promise); f.controller.setContent('a', 'x');
  const first = f.controller.copy(), second = f.controller.copy();
  writes[1].reject(new Error('denied')); await second;
  writes[0].resolve(); assert.equal(await first, false); assert.equal(f.states.at(-1), 'error');
  const third = f.controller.copy(), fourth = f.controller.copy();
  writes[3].resolve(); await fourth;
  writes[2].reject(new Error('old')); await third;
  assert.equal(f.states.at(-1), 'copied'); assert.equal(f.timers.size, 1);
});

test('identity and text replacement invalidate pending completion; an unchanged snapshot preserves feedback', async () => {
  const writes = [deferred(), deferred()]; let index = 0;
  const f = fixture(() => writes[index++].promise); f.controller.setContent('old', 'same');
  const old = f.controller.copy(); f.controller.setContent('new', 'same');
  writes[0].resolve(); assert.equal(await old, false); assert.equal(f.states.at(-1), 'idle');
  const current = f.controller.copy(); f.controller.setContent('new', 'updated');
  writes[1].resolve(); assert.equal(await current, false); assert.equal(f.states.at(-1), 'idle');
  const ready = fixture(); ready.controller.setContent('a', 'x'); await ready.controller.copy();
  ready.controller.setContent('a', 'x'); assert.equal(ready.states.at(-1), 'copied');
  assert.equal(ready.timers.size, 1);
});

test('unmount clears success timers and guards both delayed successful and rejected writes', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const write = deferred(), f = fixture(() => write.promise); f.controller.setContent('a', 'x');
    const copying = f.controller.copy(), count = f.states.length;
    f.controller.dispose(); write[outcome](new Error('late'));
    assert.equal(await copying, false); assert.equal(f.states.length, count); assert.equal(f.timers.size, 0);
    assert.equal(await f.controller.copy(), false); assert.equal(f.payloads.length, 1);
  }
  const f = fixture(); f.controller.setContent('a', 'x'); await f.controller.copy();
  f.controller.dispose(); assert.equal(f.timers.size, 0);
});

test('toolbar one-button navigation and RTL wrapping respect canceled and modified keys', () => {
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.equal(turnFooterKeyIndex({ key }, { count: 1, current: 0 }), 0);
  assert.equal(turnFooterKeyIndex({ key: 'ArrowRight' }, { count: 3, current: 0, rtl: true }), 2);
  assert.equal(turnFooterKeyIndex({ key: 'ArrowLeft' }, { count: 3, current: 2, rtl: true }), 0);
  assert.equal(turnFooterKeyIndex({ key: 'ArrowLeft' }, { count: 3 }), 0);
  assert.equal(turnFooterKeyIndex({ key: 'End' }, { count: 3 }), 2);
  for (const property of ['defaultPrevented', 'ctrlKey', 'altKey', 'metaKey'])
    assert.equal(turnFooterKeyIndex({ key: 'End', [property]: true }, { count: 1 }), null);
  assert.equal(turnFooterKeyIndex({ key: 'ArrowDown' }, { count: 1 }), null);
  assert.equal(turnFooterKeyIndex({ key: 'Enter' }, { count: 1 }), null);
  assert.equal(turnFooterKeyIndex({ key: 'Home' }, { count: 0 }), null);
});

test('pointer selection suppression applies only to repeated primary noneditable mousedown', () => {
  assert.equal(preventRepeatedSelection({ detail: 1, button: 0 }), false);
  assert.equal(preventRepeatedSelection({ detail: 2, button: 0 }), true);
  assert.equal(preventRepeatedSelection({ detail: 3, button: 1 }), false);
  assert.equal(preventRepeatedSelection({ detail: 2, button: 0, editable: true }), false);
});

test('trim:false writes the message payload byte-exact for user Copy', async () => {
  const payloads = [], states = [];
  const controller = createTurnClipboardFeedback({ trim: false, writeText: async text => { payloads.push(text); }, onState: s => states.push(s),
    schedule: () => 1, cancel: () => {} });
  controller.setContent('user:item', ' \n```js\nconst a = 1;\n```\n\n');
  assert.equal(await controller.copy(), true);
  assert.deepEqual(payloads, [' \n```js\nconst a = 1;\n```\n\n']);
  assert.equal(states.at(-1), 'copied');
  controller.dispose();
});

// Rich copy seam: write({ text, html }) with click-time getHtml.
function richFixture({ write, getHtml = text => `<p>${text.trim()}</p>\n`, trim } = {}) {
  let now = 0, next = 0;
  const timers = new Map(), states = [], payloads = [];
  const controller = createTurnClipboardFeedback({
    trim, getHtml, onState: state => states.push(state),
    write: payload => { payloads.push(payload); return write(payload); },
    schedule: (fn, delay) => { timers.set(++next, { fn, at: now + delay }); return next; },
    cancel: id => timers.delete(id),
  });
  return { controller, states, payloads, timers, advance(ms) { now += ms; for (const [id, task] of timers) if (task.at <= now) { timers.delete(id); task.fn(); } } };
}

test('rich write success passes trimmed text plus html derived at copy time and keeps Copied for 2000ms', async () => {
  const f = richFixture({ write: async () => true });
  f.controller.setContent('turn', '  line one\nline two  ');
  assert.equal(await f.controller.copy(), true);
  assert.deepEqual(f.payloads, [{ text: 'line one\nline two', html: '<p>line one\nline two</p>\n' }]);
  assert.equal(f.states.at(-1), 'copied');
  f.advance(1999); assert.equal(f.states.at(-1), 'copied');
  f.advance(1); assert.equal(f.states.at(-1), 'idle');
});

test('a writer that resolves false (both rich and plain writes failed) is an error with no false feedback', async () => {
  const f = richFixture({ write: async () => false });
  f.controller.setContent('turn', 'x');
  assert.equal(await f.controller.copy(), false);
  assert.equal(f.states.at(-1), 'error'); assert.equal(f.states.includes('copied'), false); assert.equal(f.timers.size, 0);
  const throwing = richFixture({ write: async () => { throw new Error('denied'); } });
  throwing.controller.setContent('turn', 'x');
  assert.equal(await throwing.controller.copy(), false); assert.equal(throwing.states.at(-1), 'error');
});

test('the seam composes with the real payload writer: rich rejection falls back to writeText and still reports Copied; both rejecting is an error', async () => {
  const { writeClipboardPayload } = await import('../src/clipboard-payload.mjs');
  const calls = [];
  const env = mode => ({ ClipboardItem: class { constructor(e) { this.e = e; } }, Blob: class { constructor(p) { this.p = p; } }, clipboard: {
    write: async items => { calls.push(['write', items]); throw new DOMException('rich denied', 'NotAllowedError'); },
    writeText: async text => { calls.push(['writeText', text]); if (mode === 'deny') throw new DOMException('plain denied', 'NotAllowedError'); },
  } });
  const ok = richFixture({ write: payload => writeClipboardPayload(env('allow'), payload) });
  ok.controller.setContent('turn', 'hello\nworld');
  assert.equal(await ok.controller.copy(), true); assert.equal(ok.states.at(-1), 'copied');
  assert.deepEqual(calls.map(([kind]) => kind), ['write', 'writeText']); assert.equal(calls[1][1], 'hello\nworld');
  calls.length = 0;
  const denied = richFixture({ write: payload => writeClipboardPayload(env('deny'), payload) });
  denied.controller.setContent('turn', 'hello');
  assert.equal(await denied.controller.copy(), false); assert.equal(denied.states.at(-1), 'error'); assert.equal(denied.states.includes('copied'), false);
  assert.deepEqual(calls.map(([kind]) => kind), ['write', 'writeText']);
});

test('empty, non-string or throwing getHtml yields html "" so the writer skips the ClipboardItem path', async () => {
  const { writeClipboardPayload } = await import('../src/clipboard-payload.mjs');
  for (const getHtml of [() => '', () => undefined, () => 42, () => { throw new Error('converter failed'); }, null]) {
    const calls = [];
    const env = { ClipboardItem: class {}, Blob: class {}, clipboard: { write: async () => { calls.push('write'); }, writeText: async () => { calls.push('writeText'); } } };
    const f = richFixture({ getHtml, write: payload => writeClipboardPayload(env, payload) });
    f.controller.setContent('turn', 'text');
    assert.equal(await f.controller.copy(), true);
    assert.equal(f.payloads[0].html, ''); assert.deepEqual(calls, ['writeText']);
  }
});

test('trim:false leaves the plain payload untouched while html is derived from the trimmed markdown', async () => {
  const { markdownToClipboardHtml } = await import('../src/rich-copy-html.mjs');
  const f = richFixture({ trim: false, getHtml: markdownToClipboardHtml, write: async () => true });
  f.controller.setContent('user', ' \nkeep\nedges\n\n');
  assert.equal(await f.controller.copy(), true);
  assert.deepEqual(f.payloads, [{ text: ' \nkeep\nedges\n\n', html: '<p>keep<br />\nedges</p>' }]);
  const trimmed = richFixture({ getHtml: markdownToClipboardHtml, write: async () => true });
  trimmed.controller.setContent('turn', ' \nkeep\nedges\n\n');
  await trimmed.controller.copy();
  assert.equal(trimmed.payloads[0].text, 'keep\nedges'); assert.equal(trimmed.payloads[0].html, f.payloads[0].html);
});

test('late rich completions after setContent or dispose cannot publish Copied or error', async () => {
  for (const outcome of [true, false, 'throw']) {
    const write = deferred(), f = richFixture({ write: () => write.promise });
    f.controller.setContent('a', 'x');
    const copying = f.controller.copy();
    f.controller.setContent('b', 'y');
    const count = f.states.length;
    outcome === 'throw' ? write.reject(new Error('late')) : write.resolve(outcome);
    assert.equal(await copying, false); assert.equal(f.states.length, count); assert.equal(f.states.at(-1), 'idle'); assert.equal(f.timers.size, 0);
    const late = deferred(), g = richFixture({ write: () => late.promise });
    g.controller.setContent('a', 'x');
    const pending = g.controller.copy(), before = g.states.length;
    g.controller.dispose();
    outcome === 'throw' ? late.reject(new Error('late')) : late.resolve(outcome);
    assert.equal(await pending, false); assert.equal(g.states.length, before);
  }
});

test('the legacy writeText seam still works unchanged when no payload writer is given', async () => {
  const payloads = [], states = [];
  const controller = createTurnClipboardFeedback({ writeText: async text => { payloads.push(text); }, getHtml: () => '<p>ignored</p>', onState: s => states.push(s), schedule: () => 1, cancel: () => {} });
  controller.setContent('a', ' x ');
  assert.equal(await controller.copy(), true); assert.deepEqual(payloads, ['x']); assert.equal(states.at(-1), 'copied');
});
