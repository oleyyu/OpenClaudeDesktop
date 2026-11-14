import test from 'node:test';
import assert from 'node:assert/strict';
import { splitDiffRows, createDiffPreferencesStore, DIFF_PREFERENCE_KEYS as keys, observeDiffSplitFit } from '../src/diff-view-model.mjs';

test('split pairs change runs, retains real coordinates, and advances context independently on each side', () => {
  const rows = [
    { type: 'context', text: 'keep', oldLine: 4, newLine: 4 },
    { type: 'removed', text: 'old', oldLine: 5 },
    { type: 'added', text: 'new', newLine: 5 },
    { type: 'added', text: 'extra', newLine: 6 },
    { type: 'context', text: 'tail', oldLine: 6, newLine: 7 },
  ];
  const result = splitDiffRows(rows);
  assert.equal(result.length, 4);
  assert.equal(result[1].before.text, 'old'); assert.equal(result[1].after.text, 'new');
  assert.equal(result[2].before, null); assert.equal(result[2].after.newLine, 6);
  assert.equal(result[3].before.line, 2); assert.equal(result[3].after.line, 3);
  assert.equal(result[3].before.oldLine, 6); assert.equal(result[3].after.newLine, 7);
  assert.equal(result[3].before.rowIndex, 4); assert.equal(result[3].after.rowIndex, 4);
  assert.equal(result[3].before.side, 'before'); assert.equal(result[3].after.side, 'after');
  assert.deepEqual(rows[0], { type: 'context', text: 'keep', oldLine: 4, newLine: 4 });
});
test('split no-newline notes stay on the actual side and consume no lexical lines', () => {
  const note = { type: 'note', text: '\\ No newline at end of file' };
  const pairs = splitDiffRows([{ type: 'removed', text: 'a', oldLine: 1 }, note,
    { type: 'added', text: 'b', newLine: 1 }, note,
    { type: 'context', text: 'c', oldLine: 2, newLine: 2 }, note]);
  for (const side of ['before', 'after']) {
    assert.deepEqual(pairs[0][side].notes, [note.text]);
    assert.deepEqual(pairs[1][side].notes, [note.text]);
    assert.equal(pairs[1][side].line, 1);
  }
  assert.deepEqual(splitDiffRows([]), []);
  assert.equal(splitDiffRows([{ type: 'removed', text: 'a' }, { type: 'separator' }, { type: 'added', text: 'b' }]).length, 2);
});
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, writes: [], getItem: key => data.get(key) ?? null,
    setItem(key, value) { this.writes.push([key, value]); data.set(key, value); } };
}
test('diff preferences restore source defaults and legacy auto without writes, then persist independent app keys', () => {
  const storage = memoryStorage({ [keys.layout]: '"auto"', [keys.wordWrap]: 'false' });
  const store = createDiffPreferencesStore({ storage });
  assert.deepEqual(store.getSnapshot(), { layout: 'split', wordWrap: false, wordDiff: true, hideWhitespace: false });
  assert.equal(storage.writes.length, 0);
  let notifications = 0; const off = store.subscribe(() => notifications++);
  const snapshot = store.getSnapshot(); store.set('layout', 'split');
  assert.equal(snapshot, store.getSnapshot()); assert.equal(notifications, 0);
  store.set('wordWrap', true); assert.equal(notifications, 1);
  assert.deepEqual(createDiffPreferencesStore({ storage }).getSnapshot(), { layout: 'split', wordWrap: true, wordDiff: true, hideWhitespace: false });
  off(); store.set('layout', 'unified'); assert.equal(notifications, 1);
  // F12: Highlight changed words (default on) and Hide whitespace changes (default off) persist like the others.
  store.set('wordDiff', false); store.set('hideWhitespace', true);
  assert.deepEqual(createDiffPreferencesStore({ storage }).getSnapshot(), { layout: 'unified', wordWrap: true, wordDiff: false, hideWhitespace: true });
  assert.equal(storage.data.get(keys.hideWhitespace), 'true'); assert.equal(storage.data.get(keys.wordDiff), 'false');
  assert.ok(storage.writes.every(([key]) => key.startsWith('code-desktop-')));
  store.dispose();
});
test('diff preferences synchronize storage changes and clearing without echo writes or unrelated events', () => {
  const storage = memoryStorage(); let receive, disconnected = false;
  const store = createDiffPreferencesStore({ storage, subscribeStorage: fn => { receive = fn; return () => { disconnected = true; }; } });
  storage.data.set(keys.layout, '"split"');
  receive({ key: 'unrelated', storageArea: storage }); assert.equal(store.getSnapshot().layout, 'unified');
  receive({ key: keys.layout, storageArea: {} }); assert.equal(store.getSnapshot().layout, 'unified');
  receive({ key: keys.layout, storageArea: storage }); assert.equal(store.getSnapshot().layout, 'split');
  storage.data.clear(); receive({ key: null, storageArea: storage });
  assert.deepEqual(store.getSnapshot(), { layout: 'unified', wordWrap: true, wordDiff: true, hideWhitespace: false });
  assert.equal(storage.writes.length, 0); store.dispose(); assert.equal(disconnected, true);
});
test('invalid or unavailable preference storage leaves controls usable', () => {
  const invalid = createDiffPreferencesStore({ storage: memoryStorage({ [keys.layout]: '{', [keys.wordWrap]: 'null' }) });
  assert.deepEqual(invalid.getSnapshot(), { layout: 'unified', wordWrap: true, wordDiff: true, hideWhitespace: false });
  const store = createDiffPreferencesStore({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  store.set('layout', 'split'); store.set('wordWrap', false); store.set('unknown', 'value');
  assert.deepEqual(store.getSnapshot(), { layout: 'split', wordWrap: false, wordDiff: true, hideWhitespace: false });
  store.set('hideWhitespace', 'yes'); assert.equal(store.getSnapshot().hideWhitespace, false, 'only true turns whitespace hiding on');
});
test('split fit uses 560px border-box, ignores zero width, and rejects observer callbacks after cleanup', () => {
  const element = { getBoundingClientRect: () => ({ width: 559.9 }) }; let receive, observed, disconnected = false;
  class Observer { constructor(fn) { receive = fn; } observe(target, options) { observed = { target, options }; } disconnect() { disconnected = true; } }
  const fits = []; const stop = observeDiffSplitFit(element, fit => fits.push(fit), Observer);
  assert.deepEqual(observed, { target: element, options: { box: 'border-box' } });
  const resize = width => receive([{ target: element, borderBoxSize: [{ inlineSize: width }], contentRect: { width: width - 2 } }]);
  resize(560); resize(0); resize(561); resize(NaN); resize(559);
  assert.deepEqual(fits, [false, true, false]);
  stop(); resize(900); assert.deepEqual(fits, [false, true, false]); assert.equal(disconnected, true);
});
