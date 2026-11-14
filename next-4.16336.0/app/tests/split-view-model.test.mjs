import test from 'node:test';
import assert from 'node:assert/strict';
import * as split from '../src/split-view-model.mjs';
import { createSplitViewStore } from '../src/split-view-store.mjs';

// The pane grid (2.31226.0 shared-16 pane store Q; shared-23 a1 / B$ / J$ / R$ / q$; shared-21 $7; shared-22 BM / UM).
const { emptySplit, reportSide, openSplit, closeSide, focusSide, focusNext, focusDirection, movePane, openInFocusedSide, splitCommand, splitLayout,
  restoreSplit, savedSplit, splitMenuState, sessionSplitItem, setConstrained, setMaxColumns, paneEntries, moveTargets, normalizeEntries, nextSlot,
  defaultTarget, maxColumnsFor, columnWeights, resizeColumns, resizeColumnsAround, rowBounds, clampRowSplit, dropZone, paneDrop, paneDropLabel,
  sessionDropCell, sessionDropBadge, dropBadgeBox, openLeftOfPrimary, splitShortcut, SPLIT_COMMANDS, LEFT_OF_PRIMARY } = split;
const withPrimary = (id, columns = 2) => setMaxColumns(reportSide(emptySplit, 0, { current: id, title: 'Primary' }), columns);
const cells = (state) => paneEntries(state).map((entry) => `${entry.id ?? 'new'}@${entry.pos.col}:${entry.pos.row}`);
const run = (state, ...steps) => steps.reduce((value, step) => step(value).state, state);

test('default store clock preserves the browser timer receiver during startup and reporting', (t) => {
  const calls = [], reports = [];
  t.mock.method(globalThis, 'setTimeout', function (callback, delay) {
    assert.equal(this, globalThis);
    calls.push(['set', delay]);
    return 17;
  });
  t.mock.method(globalThis, 'clearTimeout', function (id) {
    assert.equal(this, globalThis);
    calls.push(['clear', id]);
  });
  const store = createSplitViewStore({ report: (changed) => reports.push(changed) });
  store.reportNow();
  // A change of the sessions shown is reported at once (main.cjs routes unread marks and notifications by it) ...
  store.reportSide(0, { current: 'a', title: 'A' });
  assert.equal(reports.length, 2);
  // ... anything else (a title, the weights, the focus) waits for the debounce.
  store.reportSide(0, { current: 'a', title: 'A, renamed' });
  store.flushReport();
  assert.deepEqual(calls, [['clear', null], ['clear', null], ['clear', null], ['set', 250], ['clear', 17]]);
  assert.equal(reports.length, 2, 'the same layout is not reported twice');
});

test('grid primitives: columns per width, normalization, the next free cell and the default target', () => {
  assert.deepEqual([0, 359, 360, 720, 1079, 1800, 4000].map(maxColumnsFor), [1, 1, 1, 2, 2, 5, 5]);
  const entry = (id, col, row, key = id) => ({ key, id, pos: { col, row } });
  // Z: a pane at 0:0 drops under the primary, empty columns close up, a lone bottom pane moves to its column's top.
  assert.deepEqual(normalizeEntries([entry('b', 0, 0), entry('c', 3, 1)]).map((e) => e.pos), [{ col: 0, row: 1 }, { col: 1, row: 0 }]);
  assert.deepEqual(nextSlot([entry('b', 1, 0)], 3), { col: 2, row: 0 });
  assert.deepEqual(nextSlot([entry('b', 1, 0)], 2), { col: 0, row: 1 });
  assert.equal(nextSlot([entry('b', 1, 0), entry('c', 0, 1), entry('d', 1, 1)], 2), null);
  assert.deepEqual(defaultTarget([entry('b', 1, 0), entry('c', 0, 1), entry('d', 1, 1), entry(null, 2, 0, 'x')], 3), { col: 2, row: 1 }, 'a free bottom cell first');
  assert.deepEqual(defaultTarget([entry('b', 1, 0), entry('c', 0, 1), entry('d', 1, 1), entry('e', 2, 0), entry(null, 2, 1, 'x')], 3), { col: 2, row: 0 }, 'full: the last session pane in reading order');
  assert.deepEqual(columnWeights([2, 1], 2), [2, 1]);
  assert.deepEqual(columnWeights([2, 1], 3), [1, 1, 1], 'weights for another column count read as equal columns');
  assert.deepEqual(columnWeights([9, 1], 2, 1000), [1, 1], 'a column under 320px reads as equal columns');
});

test('open in split view: a new column while there is room, then the bottom cells; a shown session only takes the focus; a full grid replaces the last session pane', () => {
  let state = withPrimary('a');
  let result = openSplit(state, 'b');
  assert.deepEqual(cells(result.state), ['b@1:0']);
  assert.equal(result.state.open, true);
  assert.equal(result.state.active, 1);
  assert.deepEqual(result.effects, [{ focus: 1 }]);
  assert.equal(result.state.panes[0].initial, 'b', 'the new pane mounts its App on the session');
  state = result.state;
  assert.deepEqual(openSplit(state, 'a').effects, [{ focus: 0 }], 'the primary session takes the focus');
  assert.deepEqual(openSplit(focusSide(state, 0).state, 'b').effects, [{ focus: 1 }]);
  // Two columns fit: the next session opens under the primary, then under b.
  state = run(state, (s) => openSplit(s, 'c'), (s) => openSplit(s, 'd'));
  assert.deepEqual(cells(state), ['b@1:0', 'c@0:1', 'd@1:1']);
  // Full: the last session pane (d) shows the new session; its App navigates.
  result = openSplit(state, 'e');
  assert.deepEqual(cells(result.state), ['b@1:0', 'c@0:1', 'e@1:1']);
  assert.deepEqual(result.effects, [{ navigate: [3, 'e'] }, { focus: 3 }]);
  assert.equal(result.state.panes[2].key, state.panes[2].key, 'the pane keeps its App');
  // Wider (five columns): new columns first.
  const wide = run(withPrimary('a', 5), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'), (s) => openSplit(s, null));
  assert.deepEqual(cells(wide), ['b@1:0', 'c@2:0', 'new@3:0']);
  assert.deepEqual(sessionSplitItem(wide, 'c'), { kind: 'close', side: 2 });
  assert.deepEqual(sessionSplitItem(wide, 'z'), { kind: 'open' });
  assert.equal(sessionSplitItem(withPrimary('a'), 'a'), null);
});

test('close: an extra pane closes (columns close up, the focus follows); closing the primary promotes the first session pane', () => {
  const state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'), (s) => focusSide(s, 1));
  let result = closeSide(state, 1);
  assert.deepEqual(cells(result.state), ['c@1:0']);
  assert.equal(result.state.active, 1);
  assert.deepEqual(result.effects, [{ focus: 1 }]);
  result = closeSide(focusSide(state, 2).state, 1);
  assert.equal(result.state.active, 1, 'a pane before the focused one closing shifts the focus index');
  result = closeSide(state, 0);
  assert.deepEqual(cells(result.state), ['c@1:0']);
  assert.equal(result.state.sides[0].current, 'b');
  assert.deepEqual(result.effects, [{ navigate: [0, 'b'] }, { focus: 0 }]);
  // Only new-session panes: the primary goes to the new-session page; a new-session primary closes the last pane.
  const drafts = openSplit(withPrimary('a'), null).state;
  assert.deepEqual(closeSide(drafts, 0).effects, [{ navigate: [0, null] }, { focus: 0 }]);
  assert.deepEqual(cells(closeSide(reportSide(drafts, 0, { current: null }), 0).state), []);
  assert.deepEqual(closeSide(withPrimary('a'), 0).effects, [], 'nothing to close without a split');
});

test('move targets ($7): the panes trade cells; the primary trades sessions with the pane it lands on', () => {
  let state = openSplit(withPrimary('a'), 'b').state;
  // From the extra pane at 1:0: left (into the primary's cell) and down (under the primary).
  assert.deepEqual(moveTargets(paneEntries(state), 1, 2, true), [{ dir: 'left', target: { col: 0, row: 0 } }, { dir: 'down', target: { col: 0, row: 1 } }]);
  assert.deepEqual(moveTargets(paneEntries(state), 0, 2, true).map((item) => item.dir), ['right', 'down']);
  assert.deepEqual(moveTargets(paneEntries(state), 0, 2, false), [], 'a new-session primary does not move');
  assert.deepEqual(splitMenuState(state), { newRight: false, newBelow: true, split: true, moveLeft: true, moveRight: false, moveUp: false, moveDown: true });
  // Move Split View Left from b: b becomes the primary's session, a goes to b's pane (both Apps navigate).
  let result = splitCommand(state, 'move-left');
  assert.deepEqual(cells(result.state), ['a@1:0']);
  assert.equal(result.state.sides[0].current, 'b');
  assert.deepEqual(result.effects, [{ navigate: [0, 'b'] }, { navigate: [1, 'a'] }, { focus: 0 }]);
  // Move Split View Down from b: b moves under the primary (same App, no navigation).
  result = splitCommand(state, 'move-down');
  assert.deepEqual(cells(result.state), ['b@0:1']);
  assert.deepEqual(result.effects, [{ focus: 1 }]);
  assert.equal(result.state.panes[0].key, state.panes[0].key);
  assert.deepEqual(splitMenuState(result.state), { newRight: true, newBelow: false, split: true, moveLeft: false, moveRight: true, moveUp: true, moveDown: false });
  // Move Split View Right from the primary: a goes to b's cell, b becomes the primary's.
  result = splitCommand(focusSide(state, 0).state, 'move-right');
  assert.equal(result.state.sides[0].current, 'b');
  assert.deepEqual(cells(result.state), ['a@1:0']);
  assert.equal(result.state.active, 1, 'the focus follows the moved session');
  assert.deepEqual(splitCommand(state, 'move-up').effects, [], 'no target, no change');
  // A pane dropped left of the primary: it becomes the primary's session, the primary's moves to column 1.
  state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'));
  result = movePane(state, 2, LEFT_OF_PRIMARY);
  assert.equal(result.state.sides[0].current, 'c');
  assert.deepEqual(cells(result.state), ['b@2:0', 'a@1:0']);
  assert.deepEqual(openLeftOfPrimary(state, 'z').effects, [], 'no room for another column: unchanged');
  assert.equal(openLeftOfPrimary(state, 'z').state, state);
});

test('pane items of the session header ⋮ menu (shared-21 Qse / J7, kept in cf74bc599 ZT): this pane\'s moves, then Close split view', () => {
  const { paneMenuItems } = split;
  assert.deepEqual(paneMenuItems(withPrimary('a'), 0), [], 'unsplit: none');
  const state = openSplit(withPrimary('a'), 'b').state;
  assert.deepEqual(paneMenuItems(state, 1), [
    { kind: 'move', label: 'Move split view left', target: { col: 0, row: 0 } },
    { kind: 'move', label: 'Move split view down', target: { col: 0, row: 1 } },
    { kind: 'close', label: 'Close split view' },
  ]);
  assert.deepEqual(paneMenuItems(state, 0).map((item) => item.label), ['Move split view right', 'Move split view down', 'Close split view']);
  assert.deepEqual(paneMenuItems(state, 2), [], 'no such pane');
  const three = run(withPrimary('a', 3), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'));
  assert.ok(paneMenuItems(three, 2).some((item) => item.label === 'Move split view to top left'));
});

test('new session on the right / below, focus next / previous and ⌃⌘Arrow', () => {
  let state = withPrimary('a', 3);
  assert.deepEqual(splitCommand(state, 'focus-next').effects, [], 'nothing to focus without panes');
  state = splitCommand(state, 'new-right').state;
  assert.deepEqual(cells(state), ['new@1:0']);
  state = splitCommand(state, 'new-below').state;
  assert.deepEqual(cells(state), ['new@1:0', 'new@1:1'], 'below the focused pane');
  state = splitCommand(focusSide(state, 0).state, 'new-below').state;
  assert.deepEqual(cells(state), ['new@1:0', 'new@1:1', 'new@0:1']);
  assert.equal(state.active, 3);
  assert.deepEqual(splitCommand(state, 'new-below').effects, [], 'the focused column has a bottom pane');
  // Reading order: primary, 0:1, 1:0, 1:1.
  const order = [];
  let walk = focusSide(state, 0).state;
  for (let step = 0; step < 4; step++) { walk = focusNext(walk).state; order.push(walk.active); }
  assert.deepEqual(order, [3, 1, 2, 0]);
  assert.equal(focusNext(walk, -1).state.active, 2);
  assert.equal(focusDirection(focusSide(state, 0).state, 'right').state.active, 1);
  assert.equal(focusDirection(focusSide(state, 0).state, 'down').state.active, 3);
  assert.equal(focusDirection(focusSide(state, 3).state, 'right').state.active, 2);
  assert.deepEqual(focusDirection(focusSide(state, 0).state, 'left').effects, []);
});

test('the sidebar opens sessions into the focused pane; a session another pane shows takes focus there', () => {
  const state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'));
  assert.deepEqual(openInFocusedSide(state, 'b'), { state: { ...state, active: 1 }, effects: [{ focus: 1 }] });
  assert.deepEqual(openInFocusedSide(state, 'z').effects, [{ navigate: [2, 'z'] }]);
  assert.deepEqual(openInFocusedSide(withPrimary('a'), 'z').effects, [{ navigate: [0, 'z'] }]);
});

test('a window ≤ 700px parks the extra panes and brings them back (minus the primary session) when it widens', () => {
  const state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'));
  const parked = setConstrained(state, true).state;
  assert.equal(parked.open, false);
  assert.deepEqual(cells(parked), []);
  assert.equal(parked.active, 0);
  assert.deepEqual(splitLayout(parked).split.panes.map((pane) => pane.sessionId), ['b', 'c'], 'parked panes stay in the saved layout');
  // Meanwhile the primary opened b: it is not restored as a pane.
  const back = setConstrained(reportSide(parked, 0, { current: 'b' }), false);
  assert.deepEqual(cells(back.state), ['c@1:0']);
  assert.equal(back.state.parked, null);
  assert.deepEqual(back.effects, []);
  assert.deepEqual(cells(setConstrained(parked, false).state), ['b@1:0', 'c@2:0']);
});

test('layout persistence: session panes as cells (new-session panes dropped), weights, row split and focus; restore reads the earlier two-sided shape', () => {
  let state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'), (s) => openSplit(s, null), (s) => openSplit(s, 'c'));
  state = split.setRowSplit(split.setColWeights(state, [2, 1, 1]), 0.7);
  assert.deepEqual(splitLayout(state), { current: 'a', split: { panes: [{ sessionId: 'b', col: 1, row: 0 }, { sessionId: 'c', col: 0, row: 1 }], colWeights: null, rowSplit: 0.7, active: 2 } });
  assert.deepEqual(splitLayout(withPrimary('a')), { current: 'a', split: null });
  const restored = restoreSplit(withPrimary('a', 3), { panes: [{ sessionId: 'b', col: 1, row: 0 }, { sessionId: 'gone', col: 2, row: 0 }, { sessionId: 'c', col: 1, row: 1 }], colWeights: [1, 3], rowSplit: 0.3, active: 2 },
    { known: (id) => id !== 'gone' }).state;
  assert.deepEqual(cells(restored), ['b@1:0', 'c@1:1']);
  assert.deepEqual(restored.colWeights, [1, 3]);
  assert.equal(restored.rowSplit, 0.3);
  assert.equal(restored.active, 2);
  const old = restoreSplit(withPrimary('a'), { sessionId: 'b', ratio: 0.6, active: 1 }).state;
  assert.deepEqual(cells(old), ['b@1:0']);
  assert.deepEqual(old.colWeights, [0.6, 0.4]);
  assert.equal(savedSplit({ sessionId: 'a' }, { primary: 'a' }), null, 'the primary session is never a pane');
  assert.deepEqual(restoreSplit(old, { sessionId: 'c' }).effects, [], 'an open split is kept');
  assert.equal(restoreSplit(setConstrained(withPrimary('a'), true).state, { sessionId: 'b' }).state.parked.length, 1, 'restored while narrow: parked');
});

test('pane drag (BM / UM): onto the primary swaps, onto an empty cell moves; badge text Swap / Move here', () => {
  const state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'));
  const columns = [{ left: 0, right: 500, width: 500, top: 0, height: 800 }, { left: 500, right: 1000, width: 500, top: 0, height: 800 }];
  const context = (dragIndex) => ({ entries: paneEntries(state), dragIndex, max: 3, primary: 'a', stackZones: true, leftOpen: () => true });
  const middleOfPrimary = dropZone(columns, 0.5, 250, 350);
  assert.deepEqual(middleOfPrimary, { pos: { col: 0, row: 0 }, zone: 'swap', band: null, edge: false, sideFirst: true });
  const swap = paneDrop(context(1), middleOfPrimary);
  assert.deepEqual(swap, { target: { col: 0, row: 0 }, above: false });
  assert.equal(paneDropLabel(state, swap), 'Swap');
  const below = paneDrop(context(1), dropZone(columns, 0.5, 250, 780));
  assert.deepEqual(below, { target: { col: 0, row: 1 }, above: false });
  assert.equal(paneDropLabel(state, below), 'Move here');
  assert.equal(paneDrop(context(1), dropZone(columns, 0.5, 750, 350)), null, 'its own cell changes nothing');
  assert.equal(paneDrop(context(1), dropZone(columns, 0.5, 990, 350)), null, 'a lone last pane moved to a new column is the same layout');
  const stacked = run(withPrimary('a', 2), (s) => openSplit(s, 'b'), (s) => openSplit(s, 'c'));
  assert.deepEqual(cells(stacked), ['b@1:0', 'c@0:1']);
  const fromBottom = { entries: paneEntries(stacked), dragIndex: 2, max: 3, primary: 'a', stackZones: true, leftOpen: () => true };
  assert.deepEqual(paneDrop(fromBottom, dropZone(columns, 0.5, 990, 350)), { target: { col: 2, row: 0 }, above: false }, 'the right edge band opens a new column');
  assert.deepEqual(cells(split.dropPane(state, 1, below).state), ['b@0:1']);
});

test('session drop (xJ / SJ / qQ): cells under the pointer, a new column past the last midpoint, left of the primary, the dimmed default', () => {
  const state = run(withPrimary('a', 3), (s) => openSplit(s, 'b'));
  const columns = [{ left: 300, right: 800, width: 500, top: 0, height: 800 }, { left: 800, right: 1300, width: 500, top: 0, height: 800 }];
  assert.deepEqual(sessionDropCell(state, columns, 1200, 100), { col: 2, row: 0 });
  assert.deepEqual(sessionDropCell(state, columns, 900, 100), { col: 1, row: 0 });
  assert.deepEqual(sessionDropCell(state, columns, 900, 700), { col: 1, row: 1 });
  assert.deepEqual(sessionDropCell(state, columns, 400, 100, { canOpenLeft: true }), LEFT_OF_PRIMARY);
  assert.equal(sessionDropCell(state, columns, 600, 100, { canOpenLeft: true }), null, 'the primary cell itself is no target');
  assert.deepEqual(sessionDropBadge(state, { col: 1, row: 0 }), { pos: { col: 1, row: 0 }, hint: false, label: 'Open here' });
  assert.deepEqual(sessionDropBadge(state, null), { pos: { col: 2, row: 0 }, hint: true, label: 'Split view' });
  assert.deepEqual(dropBadgeBox({ col: 1, row: 1 }, [1, 1], false), { left: 'calc(50% + 8px)', width: 'calc(50% - 16px)', top: 'calc(var(--df-pane-row, 0.5) * 100% + 8px)', height: 'calc((1 - var(--df-pane-row, 0.5)) * 100% - 16px)' });
  // A new-session pane's cell is no target while a free cell exists (SJ), unless the drop moves a shown session.
  const draft = openSplit(withPrimary('a', 3), null).state;
  const at = [{ left: 0, right: 500, width: 500, top: 0, height: 800 }, { left: 500, right: 1000, width: 500, top: 0, height: 800 }];
  assert.equal(sessionDropCell(draft, at, 600, 100, { drag: { id: 'z', draft: false } }), null);
  assert.deepEqual(sessionDropCell(draft, at, 600, 100, { drag: { id: 'a', draft: false } }), { col: 1, row: 0 });
});

test('resize math: column boundaries keep the 320px minimum, ⌥ resizes symmetrically; the row split keeps both rows ≥ 320px', () => {
  assert.deepEqual(resizeColumns([1, 1], 0, 0.5, 0.2), [1.5, 0.5]);
  const close = (actual, expected) => assert.ok(actual.every((value, at) => Math.abs(value - expected[at]) < 1e-9), `${actual} ≈ ${expected}`);
  close(resizeColumns([1, 1], 0, 5, 0.2), [1.8, 0.2]);
  close(resizeColumns([1, 1, 1], 1, -0.2, 0.2), [1, 0.8, 1.2]);
  const around = resizeColumnsAround([1, 1, 1], 0, 0.2, 0.2);
  assert.ok(Math.abs(around[0] - 1.2) < 1e-9 && Math.abs(around[1] - 0.6) < 1e-9 && Math.abs(around[2] - 1.2) < 1e-9);
  assert.ok(Math.abs(rowBounds(1000).min - 0.32) < 1e-9 && Math.abs(rowBounds(1000).max - 0.68) < 1e-9);
  assert.deepEqual(rowBounds(600), { min: 0.5, max: 0.5 });
  assert.ok(Math.abs(clampRowSplit(0.9, 1000) - 0.68) < 1e-9);
});

test('chords (B$): ⌃] ⌃[ focus, ⌃⌘\\ and ⌃⌘- new pane, ⌃⌘W close, ⌃⌘Arrow focus a neighbour', () => {
  const key = (code, mods = {}) => splitShortcut({ code, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, repeat: false, defaultPrevented: false, ...mods });
  assert.equal(key('BracketRight'), 'focus-next');
  assert.equal(key('BracketLeft'), 'focus-previous');
  assert.equal(key('Backslash', { metaKey: true }), 'new-right');
  assert.equal(key('Minus', { metaKey: true }), 'new-below');
  assert.equal(key('KeyW', { metaKey: true }), 'close');
  assert.equal(key('ArrowLeft', { metaKey: true }), 'focus-left');
  assert.equal(key('ArrowDown', { metaKey: true }), 'focus-down');
  assert.equal(key('ArrowDown'), null);
  assert.equal(key('KeyW'), null, '⌃W alone stays a text binding');
  assert.equal(key('BracketRight', { shiftKey: true }), null);
  assert.deepEqual(SPLIT_COMMANDS, ['new-right', 'new-below', 'focus-next', 'focus-previous', 'move-left', 'move-right', 'move-up', 'move-down', 'close']);
});

test('store: Apps register by pane key, so closing a pane before them keeps their handlers; effects wait for a new pane to register', () => {
  const store = createSplitViewStore({ timers: { setTimeout: () => 0, clearTimeout: () => {} } });
  const calls = [];
  const app = (name) => ({ navigate: (id) => calls.push([name, 'navigate', id]), focus: () => calls.push([name, 'focus']) });
  store.register(0, app('primary'));
  store.reportSide(0, { current: 'a' });
  store.setMaxColumns(3);
  store.open('b');
  assert.deepEqual(calls, [], 'the new pane has not registered yet');
  store.register(1, app('b'));
  assert.deepEqual(calls, [['b', 'focus']]);
  store.open('c');
  store.register(2, app('c'));
  calls.length = 0;
  store.close(1);
  assert.equal(store.getState().panes.length, 1);
  store.openInFocusedSide('z');
  assert.deepEqual(calls.at(-1), ['c', 'navigate', 'z'], 'the pane formerly at index 2 is reached at index 1');
  assert.equal(store.command('move-up'), false, 'a command that changes nothing reports false');
  assert.equal(store.command('focus-next'), true);
});
