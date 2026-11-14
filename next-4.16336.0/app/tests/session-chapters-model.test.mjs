// Session chapters store and table of contents (session-chapters-model.mjs): cd5a31703 Hw/jwe/Iwe/Lwe/Fwe and
// cf74bc599 $y/Zy, over a local flat list of display rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTERS_STORAGE_KEY, EMPTY_CHAPTER_STATE, SESSION_START_ID, activeChapterId, addUserChapter, chapterAnchorId, chapterView,
  chaptersByAnchor, createChapterStore, deferChapterSample, hasChapters, parseChapterState, pinnedChaptersForRow, removeUserChapter,
  renameChapter, reuseChapters, rowItemIds, rowSeedText, seedChapterTitle, serializeChapterState, sessionChapterState, sessionChapters,
  setChapterHidden, turnPinAnchor,
} from '../src/session-chapters-model.mjs';

const ids = (() => { let n = 0; return () => `uch-${++n}`; })();

test('zw anchors and jwe seed titles: first non-empty line, 40 characters and an ellipsis', () => {
  assert.equal(chapterAnchorId('abc'), 'epitaxy-ch-abc');
  assert.equal(seedChapterTitle('\n  \n  Fix the parser  \nsecond line'), 'Fix the parser');
  assert.equal(seedChapterTitle('x'.repeat(40)), 'x'.repeat(40));
  assert.equal(seedChapterTitle('y'.repeat(41)), `${'y'.repeat(40)}…`);
  assert.equal(seedChapterTitle(''), '');
  assert.equal(seedChapterTitle(undefined), '');
});

test('Hw reducers: a pin per anchor, rename rewrites a pin or records a Claude rename, hide toggles, unpin removes', () => {
  let state = EMPTY_CHAPTER_STATE;
  const first = addUserChapter(state, 's1', 'a1', 'Pinned', () => 'uch-x');
  assert.equal(first.id, 'uch-x');
  state = first.state;
  assert.deepEqual(sessionChapterState(state, 's1').userChapters, [{ id: 'uch-x', afterId: 'a1', title: 'Pinned' }]);
  const again = addUserChapter(state, 's1', 'a1', 'Other', () => 'uch-y');
  assert.equal(again.id, null, 'a second pin after the same anchor is refused');
  assert.equal(again.state, state, 'and leaves the state untouched');
  state = renameChapter(state, 's1', 'uch-x', 'Renamed pin');
  assert.equal(sessionChapterState(state, 's1').userChapters[0].title, 'Renamed pin');
  assert.deepEqual(sessionChapterState(state, 's1').renames, {}, 'a pin rename is not a Claude rename');
  state = renameChapter(state, 's1', 'claude-1', 'Better title');
  assert.deepEqual(chapterView(state, 's1', 'claude-1'), { hidden: false, renamedTitle: 'Better title' });
  state = setChapterHidden(state, 's1', 'claude-1', true);
  state = setChapterHidden(state, 's1', 'claude-1', true);
  assert.deepEqual(sessionChapterState(state, 's1').hidden, ['claude-1'], 'hiding twice keeps one entry');
  assert.equal(chapterView(state, 's1', 'claude-1').hidden, true);
  state = setChapterHidden(state, 's1', 'claude-1', false);
  assert.equal(chapterView(state, 's1', 'claude-1').hidden, false);
  state = removeUserChapter(state, 's1', 'uch-x');
  assert.deepEqual(sessionChapterState(state, 's1').userChapters, []);
  assert.equal(removeUserChapter(state, 's1', 'missing'), state);
  assert.equal(chapterView(state, null, 'x').hidden, false, 'no session: nothing hidden');
});

test('k_ row ids and the rows a pin heads: a grouped row stands for every tool it holds', () => {
  const group = { id: 't1', type: 'fileToolGroup', toolGroup: [{ id: 't1' }, { id: 't2', fileRun: [{ id: 't2' }, { id: 't3' }] }] };
  assert.deepEqual(rowItemIds(group), ['t1', 't2', 't3']);
  assert.deepEqual(rowItemIds({ id: 'm' }), ['m']);
  assert.deepEqual(rowItemIds(null), []);
  const session = { renames: {}, hidden: [], userChapters: [{ id: 'u1', afterId: 't3', title: 'Inside' }, { id: 'u2', afterId: null, title: 'Top' }] };
  assert.deepEqual(pinnedChaptersForRow(session, group).map((chapter) => chapter.id), ['u1']);
  assert.deepEqual(pinnedChaptersForRow(session, { id: 'other' }), []);
  assert.equal(chaptersByAnchor([]), undefined);
  assert.deepEqual([...chaptersByAnchor(session.userChapters).keys()], ['t3', null]);
});

test('H6e anchor: the turn footer pins the first shown assistant row of its turn', () => {
  const rows = [
    { id: 'u', turnId: 't1', type: 'userMessage' },
    { id: 'r', turnId: 't1', type: 'reasoning' },
    { id: 'c', turnId: 't1', type: 'commandExecution', command: 'npm test' },
    { id: 'a', turnId: 't1', type: 'agentMessage', text: 'Done' },
    { id: 'u2', turnId: 't2', type: 'userMessage' },
  ];
  assert.equal(turnPinAnchor(rows, 't1', (row) => row.type === 'reasoning'), 'c');
  assert.equal(turnPinAnchor(rows, 't1'), 'r');
  assert.equal(turnPinAnchor(rows, 't2'), undefined, 'a turn with only the prompt has nothing to pin');
  assert.equal(turnPinAnchor(rows, null), undefined);
});

test('GL/Q0 seed text: a message is its text, a tool row its description, command, path, pattern or prompt', () => {
  assert.equal(rowSeedText({ type: 'agentMessage', text: 'Answer' }), 'Answer');
  assert.equal(rowSeedText({ type: 'commandExecution', command: 'npm test' }), 'npm test');
  assert.equal(rowSeedText({ type: 'commandExecution', command: 'npm test', description: 'Run tests' }), 'Run tests');
  assert.equal(rowSeedText({ type: 'fileChange', changes: [{ path: 'src/a.js' }] }), 'src/a.js');
  assert.equal(rowSeedText({ type: 'mcpToolCall', tool: 'Grep', arguments: { pattern: 'TODO' } }), 'TODO');
  assert.equal(rowSeedText({ type: 'fileToolGroup', toolGroup: [{ type: 'mcpToolCall', tool: 'Read', arguments: { file_path: '/a/b.txt' } }] }), '/a/b.txt');
  assert.equal(rowSeedText({ type: 'mcpToolCall', tool: 'screenshot', arguments: {} }), 'screenshot');
  assert.equal(rowSeedText(null), '');
});

const chapterOf = (row) => row.chapter ? { id: row.id, title: row.chapter, ...(row.summary ? { summary: row.summary } : {}) } : null;

test('Iwe: Session start, then per assistant row its pins and its own chapter (renamed, unless hidden)', () => {
  const rows = [
    { id: 'u1', type: 'userMessage' },
    { id: 'm1', type: 'agentMessage', text: 'Plan' },
    { id: 'ch1', type: 'mcpToolCall', chapter: 'Implementation', summary: 'Write it' },
    { id: 'g1', type: 'fileToolGroup', toolGroup: [{ id: 'g1' }, { id: 'g2' }] },
    { id: 'ch2', type: 'mcpToolCall', chapter: 'Verification' },
  ];
  const session = { renames: { ch1: 'Build' }, hidden: ['ch2'], userChapters: [
    { id: 'p1', afterId: 'g2', title: 'Tools' }, { id: 'p0', afterId: 'm1', title: 'Pinned plan' }, { id: 'pu', afterId: 'u1', title: 'Never' }] };
  const list = sessionChapters(rows, session, { sessionStartTitle: 'Session start', chapterOf });
  assert.deepEqual(list, [
    { id: SESSION_START_ID, title: 'Session start', source: 'session', entryId: 'u1', entryIndex: 0 },
    { id: 'p0', title: 'Pinned plan', source: 'user', entryId: 'm1', entryIndex: 1 },
    { id: 'ch1', title: 'Build', summary: 'Write it', source: 'claude', entryId: 'ch1', entryIndex: 2 },
    { id: 'p1', title: 'Tools', source: 'user', entryId: 'g1', entryIndex: 3 },
  ], 'a pin on a user row is not listed (Iwe walks assistant entries only)');
  assert.equal(hasChapters(list), true);
  const bare = sessionChapters(rows.slice(0, 2), sessionChapterState(EMPTY_CHAPTER_STATE, 's'), { sessionStartTitle: 'Session start', chapterOf });
  assert.deepEqual(bare.map((chapter) => chapter.id), [SESSION_START_ID]);
  assert.equal(hasChapters(bare), false, 'Session start alone keeps the rail hidden');
  assert.deepEqual(sessionChapters([], session, { sessionStartTitle: 'Session start', chapterOf }), [], 'no rows, no Session start');
  const top = sessionChapters(rows.slice(0, 2), { renames: {}, hidden: [], userChapters: [{ id: 'n', afterId: null, title: 'Top' }] }, { sessionStartTitle: 'S', chapterOf });
  assert.deepEqual(top.map((chapter) => [chapter.id, chapter.entryId]), [[SESSION_START_ID, 'u1'], ['n', 'u1']]);
});

test('Fwe: an unchanged list keeps its identity, a changed one keeps the unchanged entries', () => {
  const a = [{ id: 'x', title: 'X', source: 'claude', entryId: 'x', entryIndex: 1 }, { id: 'y', title: 'Y', source: 'user', entryId: 'y', entryIndex: 2 }];
  const same = a.map((chapter) => ({ ...chapter }));
  assert.equal(reuseChapters(a, same), a);
  const changed = [{ ...a[0] }, { ...a[1], title: 'Y2' }];
  const out = reuseChapters(a, changed);
  assert.notEqual(out, a);
  assert.equal(out[0], a[0]);
  assert.equal(out[1].title, 'Y2');
  assert.equal(reuseChapters(null, changed), changed);
});

test('$y: the last heading at or above the reading line; the last chapter at the bottom; unmounted headings use the entry index', () => {
  const chapters = [
    { id: SESSION_START_ID, source: 'session', entryIndex: 0 },
    { id: 'a', source: 'claude', entryIndex: 2 },
    { id: 'b', source: 'user', entryIndex: 5 },
    { id: 'c', source: 'claude', entryIndex: 9 },
  ];
  const tops = { a: 40, b: 120, c: 600 };
  const base = { canScroll: true, distanceToBottomPx: 500, viewportTopPx: 164, getAnchorTop: (chapter) => tops[chapter.id] ?? null };
  assert.equal(activeChapterId(chapters, base), 'b');
  assert.equal(activeChapterId(chapters, { ...base, viewportTopPx: 10 }), SESSION_START_ID);
  assert.equal(activeChapterId(chapters, { ...base, distanceToBottomPx: 8 }), 'c', 'within 8px of the bottom: the last chapter');
  assert.equal(activeChapterId(chapters, { ...base, canScroll: false, distanceToBottomPx: 0, viewportTopPx: 10 }), SESSION_START_ID,
    'a transcript that cannot scroll does not jump to the last chapter');
  const unmounted = { ...base, getAnchorTop: () => null, firstEntryIndex: 5, firstItemIndex: 0 };
  assert.equal(activeChapterId(chapters, unmounted), 'b', 'a pin at the first visible entry counts (<=)');
  assert.equal(activeChapterId(chapters, { ...unmounted, firstEntryIndex: -1 }), SESSION_START_ID);
  assert.equal(activeChapterId([], base), null);
});

test('Zy: near the bottom a sample waits for the 50ms throttle', () => {
  assert.equal(deferChapterSample(100, 60, 4), true);
  assert.equal(deferChapterSample(100, 50, 4), false);
  assert.equal(deferChapterSample(100, 99, 9), false, 'away from the bottom every frame samples');
});

test('persisted shape: zustand {state, version}; junk is dropped, unreadable values are empty', () => {
  const state = { bySession: { s1: { renames: { c: 'R' }, hidden: ['h'], userChapters: [{ id: 'u', afterId: 'a', title: 'T' }] } } };
  const raw = serializeChapterState(state);
  assert.deepEqual(JSON.parse(raw), { state, version: 0 });
  assert.deepEqual(parseChapterState(raw), state);
  assert.deepEqual(parseChapterState(JSON.stringify({ state: { bySession: { s1: { renames: { a: 1 }, hidden: [2, 'x'], userChapters: [{ id: 'u' }, { id: 'v', afterId: null, title: 't', extra: 1 }] } } } })),
    { bySession: { s1: { renames: {}, hidden: ['x'], userChapters: [{ id: 'v', afterId: null, title: 't' }] } } });
  assert.equal(parseChapterState('not json'), EMPTY_CHAPTER_STATE);
  assert.equal(parseChapterState(null), EMPTY_CHAPTER_STATE);
});

test('the store persists every change under epitaxy-chapters-v2 and follows other windows through the storage event', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  let storageListener = null;
  const store = createChapterStore({ storage, makeId: ids, subscribeStorage: (listener) => { storageListener = listener; return () => { storageListener = null; }; } });
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  const id = store.addUserChapter('s1', 'a1', 'Pinned');
  assert.match(id, /^uch-/);
  assert.equal(store.addUserChapter('s1', 'a1', 'Again'), null);
  store.rename('s1', id, 'Renamed');
  store.setHidden('s1', 'claude', true);
  assert.equal(notified, 3, 'a refused pin publishes nothing');
  assert.deepEqual(parseChapterState(data.get(CHAPTERS_STORAGE_KEY)), store.getSnapshot());
  store.addUserChapter('s1', 'a2', 'Second');
  store.unpinAt('s1', 'a1');
  assert.deepEqual(store.getSnapshot().bySession.s1.userChapters.map((chapter) => chapter.afterId), ['a2']);
  const reopened = createChapterStore({ storage });
  assert.deepEqual(reopened.getSnapshot(), store.getSnapshot(), 'a new window reads the persisted chapters');
  data.set(CHAPTERS_STORAGE_KEY, serializeChapterState({ bySession: { s9: { renames: {}, hidden: [], userChapters: [] } } }));
  storageListener({ key: 'other' });
  assert.ok(store.getSnapshot().bySession.s1, 'another key is ignored');
  storageListener({ key: CHAPTERS_STORAGE_KEY });
  assert.deepEqual(Object.keys(store.getSnapshot().bySession), ['s9']);
  store.dispose();
  assert.equal(storageListener, null);
  const broken = createChapterStore({ storage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } });
  assert.equal(broken.getSnapshot(), EMPTY_CHAPTER_STATE);
  assert.match(broken.addUserChapter('s', 'a', 't'), /^uch-/, 'unavailable storage keeps chapters for this window');
});
