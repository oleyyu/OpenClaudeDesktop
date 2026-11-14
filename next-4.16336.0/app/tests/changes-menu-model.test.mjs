import test from 'node:test';
import assert from 'node:assert/strict';
import { changesMenuSections, CHANGES_MENU_LABELS, EXPAND_ALL_TOO_LARGE } from '../src/changes-menu-model.mjs';

// fh (2.2553.1 readable/panes-tile-current.js:3692-3868): [diff-file-list] | [diff-fold] |
// [diff-display] | [diff-refresh] with a rendered patch (the first only with the R10
// file list wired); only [diff-refresh] when the body is empty.
const shape = sections => sections.map(section => [section.key, section.items.map(item => item.label)]);

test('with a patch: fold, display, refresh in source order with exact labels', () => {
  assert.deepEqual(shape(changesMenuSections({ hasPatch: true })), [
    ['diff-fold', ['Collapse all files', 'Expand all files']],
    ['diff-display', ['Side by side', 'Word wrap', 'Highlight changed words', 'Hide whitespace changes']],
    ['diff-refresh', ['Refresh']],
  ]);
  const [fold, display, refresh] = changesMenuSections({ hasPatch: true, layoutSplit: true, canFitSplit: false, wordWrap: false, wordDiff: false, hideWhitespace: true });
  assert.deepEqual(fold.items.map(item => item.value), ['diff-collapse-all', 'diff-expand-all']);
  // diffIsLarge false (:3791-3804 disabled: w): Expand all is enabled and carries no tooltip.
  assert.equal(fold.items[1].disabled, false);
  assert.equal(fold.items[1].tooltip, undefined);
  assert.equal(fold.items[1].disabledReason, undefined);
  assert.deepEqual(display.items.map(({ value, checked, checkedRole, keepOpen, hint }) => ({ value, checked, checkedRole, keepOpen, hint })), [
    { value: 'diff-side-by-side', checked: true, checkedRole: 'checkbox', keepOpen: true, hint: 'Needs a wider pane' },
    { value: 'diff-word-wrap', checked: false, checkedRole: 'checkbox', keepOpen: true, hint: undefined },
    // panes-tile-current.js:3805-3835: the two F12 keepOpen checkboxes after Word wrap.
    { value: 'diff-word-diff', checked: false, checkedRole: 'checkbox', keepOpen: true, hint: undefined },
    { value: 'diff-hide-whitespace', checked: true, checkedRole: 'checkbox', keepOpen: true, hint: undefined },
  ]);
  const defaults = changesMenuSections({ hasPatch: true }).at(1).items;
  assert.deepEqual(defaults.map(item => item.checked), [false, true, true, false], 'defaults: unified, wrap on, words on, whitespace shown');
  assert.equal(refresh.items[0].value, 'diff-refresh');
  assert.equal(refresh.items[0].keepOpen, undefined);
  assert.equal(changesMenuSections({ hasPatch: true, layoutSplit: true, canFitSplit: true }).at(1).items[0].hint, undefined);
  assert.deepEqual(CHANGES_MENU_LABELS, { showFiles: 'Show files', groupByFolder: 'Group files by folder', groupByKind: 'Separate test, build, and generated files', collapseAll: 'Collapse all files', expandAll: 'Expand all files', sideBySide: 'Side by side', wordWrap: 'Word wrap',
    wordDiff: 'Highlight changed words', hideWhitespace: 'Hide whitespace changes', refresh: 'Refresh' });
});

test('without a patch (empty, loading or failed) only the Refresh section remains', () => {
  for (const input of [{}, { hasPatch: false, layoutSplit: true, wordWrap: false }])
    assert.deepEqual(shape(changesMenuSections(input)), [['diff-refresh', ['Refresh']]]);
});

test('onSelect callbacks route to fold, layout, word wrap and refresh', () => {
  const calls = [];
  const sections = changesMenuSections({ hasPatch: true, layoutSplit: false, wordWrap: true,
    onFoldAll: collapsed => calls.push(['fold', collapsed]), onLayoutChange: layout => calls.push(['layout', layout]),
    onWordWrapChange: value => calls.push(['wrap', value]), onWordDiffChange: value => calls.push(['words', value]),
    onHideWhitespaceChange: value => calls.push(['whitespace', value]), onRefresh: (...args) => calls.push(['refresh', args.length]) });
  for (const section of sections) for (const item of section.items) item.onSelect();
  assert.deepEqual(calls, [['fold', true], ['fold', false], ['layout', 'split'], ['wrap', false], ['words', false], ['whitespace', true], ['refresh', 0]]);
  const split = changesMenuSections({ hasPatch: true, layoutSplit: true, onLayoutChange: layout => calls.push(['layout', layout]) });
  split[1].items[0].onSelect();
  assert.deepEqual(calls.at(-1), ['layout', 'unified']);
});

// R10 fh :3740-3779: with the file list wired, [diff-file-list] leads the menu (a
// separator follows each section in SourcePaneControls); "Show files" only while the
// column can fit (uh), the grouping checkboxes always.
test('diff-file-list group comes first: Show files (⇧⌘Y), Group files by folder, Separate test, build, and generated files', () => {
  const calls = [];
  const fileList = { canFit: true, shown: false, tree: true, groupByKind: false, shortcut: 'cmd+shift+y',
    onToggle: (...args) => calls.push(['toggle', args.length]), onTreeChange: value => calls.push(['tree', value]), onGroupByKindChange: value => calls.push(['kind', value]) };
  const sections = changesMenuSections({ hasPatch: true, fileList });
  assert.deepEqual(shape(sections), [
    ['diff-file-list', ['Show files', 'Group files by folder', 'Separate test, build, and generated files']],
    ['diff-fold', ['Collapse all files', 'Expand all files']],
    ['diff-display', ['Side by side', 'Word wrap', 'Highlight changed words', 'Hide whitespace changes']],
    ['diff-refresh', ['Refresh']],
  ]);
  assert.deepEqual(sections[0].items.map(({ value, checked, checkedRole, keepOpen, shortcut }) => ({ value, checked, checkedRole, keepOpen, shortcut })), [
    { value: 'diff-file-list', checked: false, checkedRole: 'checkbox', keepOpen: true, shortcut: 'cmd+shift+y' },
    { value: 'diff-file-tree', checked: true, checkedRole: 'checkbox', keepOpen: true, shortcut: undefined },
    { value: 'diff-group-by-kind', checked: false, checkedRole: 'checkbox', keepOpen: true, shortcut: undefined },
  ]);
  for (const item of sections[0].items) item.onSelect();
  assert.deepEqual(calls, [['toggle', 0], ['tree', false], ['kind', true]]);
  const flipped = changesMenuSections({ hasPatch: true, fileList: { ...fileList, shown: true, tree: false, groupByKind: true } })[0];
  assert.deepEqual(flipped.items.map(item => item.checked), [true, false, true]);
  flipped.items[1].onSelect(); flipped.items[2].onSelect();
  assert.deepEqual(calls.slice(-2), [['tree', true], ['kind', false]]);
  // The column cannot fit: no Show files, the grouping preferences stay.
  assert.deepEqual(shape(changesMenuSections({ hasPatch: true, fileList: { ...fileList, canFit: false } }))[0],
    ['diff-file-list', ['Group files by folder', 'Separate test, build, and generated files']]);
  // An empty body keeps only Refresh, file list or not.
  assert.deepEqual(shape(changesMenuSections({ hasPatch: false, fileList })), [['diff-refresh', ['Refresh']]]);
});

// R10 :3791-3804: a large diff disables Expand all files with the original tooltip.
test('isLarge disables Expand all files with the "too large" tooltip; Collapse all stays', () => {
  const [fold] = changesMenuSections({ hasPatch: true, isLarge: true });
  assert.equal(fold.key, 'diff-fold');
  assert.equal(fold.items[0].disabled, undefined);
  assert.deepEqual({ disabled: fold.items[1].disabled, tooltip: fold.items[1].tooltip, disabledReason: fold.items[1].disabledReason },
    { disabled: true, tooltip: 'This diff is too large to expand at once. Select a file to expand it.', disabledReason: EXPAND_ALL_TOO_LARGE });
  assert.equal(EXPAND_ALL_TOO_LARGE, 'This diff is too large to expand at once. Select a file to expand it.');
});
