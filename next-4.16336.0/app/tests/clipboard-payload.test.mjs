import test from 'node:test';
import assert from 'node:assert/strict';
import { clipboardEnvironment, writeClipboardPayload } from '../src/clipboard-payload.mjs';

class FakeBlob { constructor(parts, options) { this.parts = parts; this.type = options?.type; } }
class FakeItem { constructor(entries) { this.entries = entries; } }
function environment({ write, writeText } = {}) {
  const calls = [];
  const clipboard = {};
  if (write) clipboard.write = async items => { calls.push(['write', items]); return write(items); };
  if (writeText) clipboard.writeText = async text => { calls.push(['writeText', text]); return writeText(text); };
  return { env: { clipboard, ClipboardItem: FakeItem, Blob: FakeBlob }, calls };
}

test('html present: one ClipboardItem with text/plain and text/html is written and writeText is not touched', async () => {
  const { env, calls } = environment({ write: () => {}, writeText: () => {} });
  assert.equal(await writeClipboardPayload(env, { text: 'plain', html: '<p>plain</p>\n' }), true);
  assert.equal(calls.length, 1);
  const [kind, items] = calls[0];
  assert.equal(kind, 'write'); assert.equal(items.length, 1);
  assert.deepEqual(Object.keys(items[0].entries), ['text/plain', 'text/html']);
  assert.deepEqual(items[0].entries['text/plain'].parts, ['plain']); assert.equal(items[0].entries['text/plain'].type, 'text/plain');
  assert.deepEqual(items[0].entries['text/html'].parts, ['<p>plain</p>\n']); assert.equal(items[0].entries['text/html'].type, 'text/html');
});

test('a failing rich write silently falls back to writeText and still reports success', async () => {
  const { env, calls } = environment({ write: () => { throw new DOMException('denied', 'NotAllowedError'); }, writeText: () => {} });
  assert.equal(await writeClipboardPayload(env, { text: 'plain', html: '<p>x</p>' }), true);
  assert.deepEqual(calls.map(([kind]) => kind), ['write', 'writeText']);
  assert.equal(calls[1][1], 'plain');
});

test('both writes failing reports false; a missing clipboard reports false without throwing', async () => {
  const { env, calls } = environment({ write: () => { throw new Error('a'); }, writeText: () => { throw new Error('b'); } });
  assert.equal(await writeClipboardPayload(env, { text: 'plain', html: '<p>x</p>' }), false);
  assert.deepEqual(calls.map(([kind]) => kind), ['write', 'writeText']);
  assert.equal(await writeClipboardPayload({}, { text: 'plain', html: '<p>x</p>' }), false);
  assert.equal(await writeClipboardPayload(undefined, { text: 'plain' }), false);
  assert.equal(await writeClipboardPayload({ clipboard: {} }, { text: 'plain' }), false, 'no writeText method is a plain failure');
});

test('empty html, or a missing write/ClipboardItem/Blob, skips the rich attempt entirely', async () => {
  for (const html of ['', undefined, null]) {
    const { env, calls } = environment({ write: () => {}, writeText: () => {} });
    assert.equal(await writeClipboardPayload(env, { text: 'plain', html }), true);
    assert.deepEqual(calls.map(([kind]) => kind), ['writeText']);
  }
  const noWrite = environment({ writeText: () => {} });
  assert.equal(await writeClipboardPayload(noWrite.env, { text: 'p', html: '<p>p</p>' }), true);
  assert.deepEqual(noWrite.calls.map(([kind]) => kind), ['writeText']);
  const noItem = environment({ write: () => {}, writeText: () => {} });
  assert.equal(await writeClipboardPayload({ ...noItem.env, ClipboardItem: undefined }, { text: 'p', html: '<p>p</p>' }), true);
  assert.deepEqual(noItem.calls.map(([kind]) => kind), ['writeText']);
  const noBlob = environment({ write: () => {}, writeText: () => {} });
  assert.equal(await writeClipboardPayload({ ...noBlob.env, Blob: undefined }, { text: 'p', html: '<p>p</p>' }), true);
  assert.deepEqual(noBlob.calls.map(([kind]) => kind), ['writeText']);
});

test('non-string text is written as an empty string and never coerced to "undefined"', async () => {
  const { env, calls } = environment({ writeText: () => {} });
  assert.equal(await writeClipboardPayload(env, { text: undefined }), true);
  assert.equal(calls[0][1], '');
});

test('clipboardEnvironment reads the owning window of a node and falls back to the global scope', () => {
  const view = { navigator: { clipboard: { id: 'window' } }, ClipboardItem: function Item() {}, Blob: function B() {} };
  const node = { ownerDocument: { defaultView: view } };
  const resolved = clipboardEnvironment(node);
  assert.equal(resolved.clipboard, view.navigator.clipboard); assert.equal(resolved.ClipboardItem, view.ClipboardItem); assert.equal(resolved.Blob, view.Blob);
  const detached = clipboardEnvironment({ ownerDocument: { defaultView: null } });
  assert.equal(detached.clipboard, globalThis.navigator?.clipboard); assert.equal(detached.Blob, globalThis.Blob);
  assert.equal(clipboardEnvironment(null).Blob, globalThis.Blob);
});
