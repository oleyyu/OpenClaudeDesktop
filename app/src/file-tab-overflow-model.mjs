// Files pane tab strip geometry: a pure port of the view tab bar's _e measure
// pass (2.2553.1 readable/panes-tabs-current.js:503-600 x). The caller measures
// the DOM; this module only decides which tabs are hidden behind "More files",
// which ones collapse to their compact form and where the strip scrolls.
//
// Inputs, all in CSS pixels of the tablist (z, panes-tabs-current.js:1138-1141,
// a p-[4px] scroller):
//   tabs           [{id, start, end, compact, clipped}] in strip order, where
//                  start = offsetLeft - 4 and end = start + offsetWidth (x :551-556)
//   clientWidth    tablist.clientWidth (the 8px of padding is taken off, :549)
//   scrollWidth    tablist.scrollWidth
//   scrollLeft     tablist.scrollLeft before this pass
//   overflowWidth  the [data-vtb-overflow] span's width plus the root's column
//                  gap while it is shown (:559-564); 0 otherwise
//   activeId       the selected tab (never hidden, never compact)
//   compactSlack   the free width per compact tab at the end of the root (:589-601)
// The three widths are unchanged in 3.6556.2 (w10-trans-tab-overflow; tests/file-tab-overflow-model.test.mjs reads them
// from the shipped chunks): cccc2cf0a's ViewTabBar `minTabWidth:104`, cfe7c4b3b `var be=64,H=50`.
export const MIN_TAB_WIDTH = 104; // Files pane minTabWidth (panes-tile-current.js:6786; 3.6556.2 cccc2cf0a)
export const COMPACT_TAB_WIDTH = 64; // Y (panes-tabs-current.js:493; 3.6556.2 cfe7c4b3b be)
export const TIGHT_ACTIVE_WIDTH = 50; // ge (:494; 3.6556.2 cfe7c4b3b H): the active tab hides its icon below this

const same = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
// Z (:500-502): keep the previous array when the ids are unchanged.
export function stableIds(previous, next) {
  return Array.isArray(previous) && same(previous, next) ? previous : next;
}

export function tabOverflowLayout({ tabs = [], clientWidth = 0, scrollWidth = 0, scrollLeft = 0, overflowWidth = 0, activeId = null, compactSlack = 0 } = {}) {
  if (tabs.length === 0) return { hiddenIds: [], compactIds: [], clippedIds: [], overflowing: false, scrollLeft: 0, activeTight: false };
  const width = clientWidth - 8;
  const last = tabs[tabs.length - 1];
  const contentEnd = last ? last.end : 0;
  // h: the strip overflows when its content is wider than the strip plus the
  // overflow button it already gave up (no flicker when the button appears).
  const overflowing = contentEnd > width + overflowWidth + 1;
  const active = tabs.find((tab) => tab.id === activeId);
  let left = scrollLeft;
  if (!overflowing) left = 0;
  else if (active) {
    // t(e, t): the smallest tab start that shows the end e, snapped to a tab
    // start between that and t when there is one.
    const startFor = (end, limit) => {
      const minimum = Math.max(0, Math.ceil(end - width));
      const tab = tabs.find((candidate) => candidate.start >= minimum && candidate.start <= limit);
      return tab ? Math.round(tab.start) : minimum;
    };
    let next = 0;
    for (const tab of tabs) if (tab.start <= scrollLeft + 1) next = Math.round(tab.start);
    next = Math.min(next, startFor(contentEnd, contentEnd));
    if (active.end > next + width + 1) next = startFor(active.end, active.start);
    else if (active.start < next - 1) next = Math.max(Math.round(active.start), Math.ceil(active.end - width));
    next = Math.min(next, Math.max(0, scrollWidth - clientWidth));
    left = next;
  }
  const right = left + width;
  const hiddenIds = [], compactIds = [], clippedIds = [];
  for (const tab of tabs) {
    if (overflowing && tab.id !== activeId && (tab.end <= left + 1 || tab.end > right + 1)) hiddenIds.push(tab.id);
    if (tab.clipped) clippedIds.push(tab.id);
    if (tab.id !== activeId && tab.end - tab.start + (tab.compact ? compactSlack : 0) < COMPACT_TAB_WIDTH && (tab.compact || tab.clipped)) compactIds.push(tab.id);
  }
  return { hiddenIds, compactIds, clippedIds, overflowing, scrollLeft: left,
    activeTight: active !== undefined && active.end - active.start < TIGHT_ACTIVE_WIDTH };
}
