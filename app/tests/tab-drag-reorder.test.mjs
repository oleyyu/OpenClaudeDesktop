import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TAB_DRAG_THRESHOLD_PX, dragTargetIndex, moveToIndex } from '../src/use-tab-drag-reorder.mjs';

const read = (file) => readFileSync(path.join(import.meta.dirname, '..', file), 'utf8');

test('a dragged tab lands after every other tab whose centre it passed', () => {
  assert.equal(dragTargetIndex([50, 150, 250], 10), 0, 'dragged to the front');
  assert.equal(dragTargetIndex([50, 150, 250], 200), 2);
  assert.equal(dragTargetIndex([50, 150, 250], 400), 3, 'dragged to the end');
  assert.ok(TAB_DRAG_THRESHOLD_PX > 0);
});

test('moveToIndex moves one item and keeps the rest in order', () => {
  const tabs = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
  assert.deepEqual(moveToIndex(tabs, 't3', 0, (tab) => tab.id).map((tab) => tab.id), ['t3', 't1', 't2']);
  assert.deepEqual(moveToIndex(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a']);
  assert.deepEqual(moveToIndex(['a', 'b', 'c'], 'a', 9), ['b', 'c', 'a'], 'clamped to the end');
  const same = ['a', 'b'];
  assert.equal(moveToIndex(same, 'a', 0), same);
  assert.equal(moveToIndex(same, 'z', 1), same);
});

// 3.6556.2 cccc2cf0a Zx: the terminal strip is the official ViewTabBar (`u(ey,{className:"min-w-0 flex-1",…`), which
// drags its own tabs and reports the new index through onReorder (`onReorder:Pe,renderTabMenuItems:ye`, with
// `Pe=E?ve:void 0` and ve = reorderTab(owner, id, toIndex)); w10-ccres-e31-terminal moved the host strip onto it, so
// the terminal no longer goes through the shared hook. The Files strip still does.
const OFFICIAL_V3 = path.join(import.meta.dirname, '..', '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
test('the Terminal and Files strips reorder through the official ViewTabBar', () => {
  const zx = readFileSync(path.join(OFFICIAL_V3, 'cccc2cf0a-DhZC33Gc.js'), 'utf8');
  assert.equal(zx.split(',onRename:_e,onCloseOthers:ie,onReorder:Pe,renderTabMenuItems:ye,labels:je}').length, 2);
  assert.equal(zx.split('Pe=E?ve:void 0').length, 2);
  // The generated ViewTabBar takes onReorder as the official one does (cfe7c4b3b Re).
  assert.match(read('src/generated/view-tabs/cfe7c4b3b-BF79K6ux.js'), /onReorder:R,/);
  const terminal = read('src/source-terminal-pane.jsx');
  assert.match(terminal, /<SourceViewTabBar className="min-w-0 flex-1" aria-label=\{t\("Terminal tabs"\)\}/);
  assert.match(terminal, /createOnDoubleClick onRename=\{rename\} onCloseOthers=\{closeOthers\} onReorder=\{reorder\}/);
  assert.match(terminal, /const reorder = \(id, toIndex\) => \{\n\s+const fromIndex = tabs\.findIndex\(\(tab\) => tab\.id === id\);\n\s+if \(fromIndex >= 0 && toIndex !== fromIndex\) terminals\.move\(owner, id, toIndex - fromIndex\);/);
  assert.doesNotMatch(terminal, /useTabDragReorder|<TerminalTab\b|data-terminal-id/);
  // W12c files-tabbar: cccc2cf0a ND `onReorder:N?M:void 0` (M = c03935b01 reorderFileTab) on the same ViewTabBar.
  assert.equal(zx.split('onReorder:N?M:void 0,onCloseAll:F,renderTabMenuItems:pe,labels:Ge,minTabWidth:104}').length, 2);
  const files = read('src/source-session.jsx');
  assert.match(files, /onReorder=\{\(path, toIndex\) => setFileTabs\(\(files\) => reorderFileTab\(files, path, toIndex\)\)\}/);
  assert.doesNotMatch(files, /useTabDragReorder|fileTabDrag|tabOverflowLayout/);
  assert.match(read('src/source-file-tabs.jsx'), /onCloseAll=\{onCloseAll\}\n\s+renderTabMenuItems=\{renderTabMenuItems\} labels=\{FILE_TAB_LABELS\} minTabWidth=\{104\} \/>/);
  assert.doesNotMatch(read('src/source-session.css'), /\.source-file-tab\b/);
});
