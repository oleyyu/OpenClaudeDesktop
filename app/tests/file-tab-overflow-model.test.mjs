import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { COMPACT_TAB_WIDTH, MIN_TAB_WIDTH, TIGHT_ACTIVE_WIDTH, stableIds, tabOverflowLayout } from '../src/file-tab-overflow-model.mjs';

// w10-trans-tab-overflow: the widths are the 3.6556.2 originals (cfe7c4b3b be/H, cccc2cf0a ViewTabBar minTabWidth).
test('3.6556.2: the compact, tight-active and minimum tab widths are the shipped ones', () => {
  const tabs = readFileSync(path.join(ionSource, 'cfe7c4b3b-BF79K6ux.js'), 'utf8');
  assert.equal(tabs.split('var be=64,H=50,xe="--vtb-room";').length - 1, 1);
  assert.deepEqual([COMPACT_TAB_WIDTH, TIGHT_ACTIVE_WIDTH], [64, 50]);
  const pane = readFileSync(path.join(ionSource, 'cccc2cf0a-DhZC33Gc.js'), 'utf8');
  assert.equal(pane.split('minTabWidth:104').length - 1, 1);
  assert.equal(MIN_TAB_WIDTH, 104);
});

// _e x (panes-tabs-current.js:503-600). Tabs are 104px wide with 4px gaps; start = offsetLeft - 4.
const strip = (count, width = 104, gap = 4) => Array.from({ length: count }, (_, index) => {
  const start = index * (width + gap);
  return { id: `t${index}`, start, end: start + width, compact: false, clipped: false };
});
const scrollWidthOf = (tabs) => tabs.at(-1).end + 8;

test('everything fits: nothing hidden and scrollLeft resets to 0', () => {
  const tabs = strip(3);
  const layout = tabOverflowLayout({ tabs, clientWidth: 400, scrollWidth: scrollWidthOf(tabs), scrollLeft: 37, activeId: 't2' });
  assert.deepEqual([layout.hiddenIds, layout.overflowing, layout.scrollLeft], [[], false, 0]);
  assert.equal(MIN_TAB_WIDTH, 104);
});

test('overflow hides off-screen tabs but never the active one', () => {
  const tabs = strip(8);
  const layout = tabOverflowLayout({ tabs, clientWidth: 480, scrollWidth: scrollWidthOf(tabs), scrollLeft: 0, activeId: 't0' });
  assert.equal(layout.overflowing, true);
  assert.equal(layout.scrollLeft, 0);
  // 472px of visible strip: t0..t3 end at 104, 212, 320, 428; t4 ends at 536 > 472.
  assert.deepEqual(layout.hiddenIds, ['t4', 't5', 't6', 't7']);
  assert.ok(!layout.hiddenIds.includes('t0'));
});

test('an active tab past the right edge scrolls so its end aligns, snapped to a tab start', () => {
  const tabs = strip(8);
  const layout = tabOverflowLayout({ tabs, clientWidth: 480, scrollWidth: scrollWidthOf(tabs), scrollLeft: 0, activeId: 't6' });
  // t6 = [648, 752]: the smallest start showing 752 is 752 - 472 = 280, snapped to the next tab start 324 (t3).
  assert.equal(layout.scrollLeft, 324);
  assert.ok(!layout.hiddenIds.includes('t6'), 'the active tab is visible');
  assert.ok(tabs.find((tab) => tab.id === 't6').end <= layout.scrollLeft + 472 + 1);
  assert.deepEqual(layout.hiddenIds, ['t0', 't1', 't2', 't7'], 'tabs ending at or before the scroll edge, and after the right edge');
  // An active tab before the left edge brings the strip back to it.
  const back = tabOverflowLayout({ tabs, clientWidth: 480, scrollWidth: scrollWidthOf(tabs), scrollLeft: 324, activeId: 't1' });
  assert.equal(back.scrollLeft, 108);
  // scrollLeft is clamped to the scrollable range.
  const end = tabOverflowLayout({ tabs, clientWidth: 480, scrollWidth: 600, scrollLeft: 0, activeId: 't7' });
  assert.equal(end.scrollLeft, 120);
});

test('the overflow button width keeps the strip overflowing until the tabs fit without it', () => {
  const tabs = strip(4); // content ends at 428
  assert.equal(tabOverflowLayout({ tabs, clientWidth: 420, scrollWidth: 436, activeId: 't0' }).overflowing, true);
  // With a 28px button + 4px gap already shown, the 412px strip (420 - 8 = 412 + 32 = 444 >= 428) counts as fitting.
  const withButton = tabOverflowLayout({ tabs, clientWidth: 420, scrollWidth: 436, overflowWidth: 32, activeId: 't0' });
  assert.deepEqual([withButton.overflowing, withButton.hiddenIds], [false, []]);
});

test('compact: a narrow clipped (or already compact) non-active tab, counting the free slack', () => {
  const tabs = [
    { id: 'a', start: 0, end: 60, compact: false, clipped: true },
    { id: 'b', start: 64, end: 124, compact: false, clipped: false },
    { id: 'c', start: 128, end: 170, compact: true, clipped: false },
    { id: 'd', start: 174, end: 230, compact: false, clipped: true },
  ];
  const layout = tabOverflowLayout({ tabs, clientWidth: 400, scrollWidth: 238, activeId: 'd' });
  assert.deepEqual(layout.compactIds, ['a', 'c'], 'b is not clipped, d is active');
  const slack = tabOverflowLayout({ tabs, clientWidth: 400, scrollWidth: 238, activeId: 'd', compactSlack: 30 });
  assert.deepEqual(slack.compactIds, ['a'], 'c regains its width with the slack (42 + 30 >= 64)');
  assert.equal(COMPACT_TAB_WIDTH, 64);
});

test('stableIds keeps the previous array when unchanged', () => {
  const previous = ['a', 'b'];
  assert.equal(stableIds(previous, ['a', 'b']), previous);
  assert.deepEqual(stableIds(previous, ['a']), ['a']);
  assert.deepEqual(tabOverflowLayout({ tabs: [] }), { hiddenIds: [], compactIds: [], clippedIds: [], overflowing: false, scrollLeft: 0, activeTight: false });
});
