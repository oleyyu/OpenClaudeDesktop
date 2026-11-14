// Pure scrollbar-mode gate shared by the transcript-fade, ui029 and
// scrollbar-mode GUI suites, and unit-tested against the frozen reports.
// Source contract: analysis/scrollbar-mode-20260920/source-contract.md.
//   feed        scroll-messages-current.js:63963  [scrollbar-gutter:stable_both-edges]
//   thin        design-system.css:1260-1265       * { scrollbar-width: thin }
//   column      titlebar-shared-12.js:972-977     min(768, clientWidth - 2*32), centered
//   probe       c360a9e1c-GPs-MV9u.js:8593-8606   offsetWidth - clientWidth of the feed,
//                                                  else a hidden both-edges 100x50 probe
//   paint       design-system.css:1266-1268       html,[data-theme] { scrollbar-color:
//                                                  hsla(var(--border-300)/35%) transparent }
// Nothing here touches the DOM except probeScrollbarMode/probeScrollbarPaint,
// which the suites pass to page.evaluate; they only append invisible probes
// they remove.

export const COLUMN_MAX = 768;
export const WIDE_GUTTER = 32;
export const NARROW_WINDOW = 780;
export const NARROW_GUTTER = 20;
export const USER_ROW_DELTA = 32; // 0.2.14: gap-sm 8 + h-control 24 per ordinary user row
export const TOP_DELTA = 24;      // 0.2.9: ordinary top reserve 24 -> 48
export const TAIL_DELTA = 73;     // 0.2.9: status gap 15 + row 20 + bottom 48 - old margin 10
export const COMPARISONS = Object.freeze(["same-mode-full", "cross-mode-width-invariant", "cross-mode-gutter-algebra"]);

export const classifyMode = reserved => (Number(reserved) > .5 ? "classic" : "overlay");

// Sizer inner width on the clientWidth basis. The <=780 window rule is the
// retained local narrow rule (20px); wide layouts follow the official 32px
// gutters and 768 measure. Mode-independent because clientWidth already
// excludes the reserved gutters.
export function expectedColumnInner({ windowWidth, clientWidth }) {
  return windowWidth <= NARROW_WINDOW ? clientWidth - 2 * NARROW_GUTTER : Math.min(COLUMN_MAX, clientWidth - 2 * WIDE_GUTTER);
}

// The column is provably gutter-invariant when both the baseline and the
// observed scrollport still fit the full 768 measure (wide-1468, default-1324).
export function widthInvariant({ windowWidth, baselineClientWidth, observedClientWidth }) {
  return expectedColumnInner({ windowWidth, clientWidth: baselineClientWidth }) === COLUMN_MAX
    && expectedColumnInner({ windowWidth, clientWidth: observedClientWidth }) === COLUMN_MAX;
}

export function comparisonKind({ baselineMode, observedMode, windowWidth, baselineClientWidth, observedClientWidth }) {
  if (baselineMode === observedMode) return "same-mode-full";
  return widthInvariant({ windowWidth, baselineClientWidth, observedClientWidth }) ? "cross-mode-width-invariant" : "cross-mode-gutter-algebra";
}

const close = (a, b, tolerance) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;

// Consistency of the in-page probe with the official Gm() semantics.
export function probeIssues(probe) {
  const issues = [];
  if (!probe || typeof probe !== "object") return ["missing probe"];
  const { feedReserved, probeBothEdges, laneThin, laneAuto, feedScrollbarGutter, feedScrollbarWidth } = probe;
  for (const [key, value] of Object.entries({ feedReserved, probeBothEdges, laneThin, laneAuto }))
    if (!Number.isFinite(value) || value < 0) issues.push(`${key} is not a finite non-negative width: ${value}`);
  if (issues.length) return issues;
  if (!close(feedReserved, probeBothEdges, .5)) issues.push(`feed reserved ${feedReserved} != both-edges probe ${probeBothEdges}`);
  if (feedScrollbarGutter !== "stable both-edges") issues.push(`feed scrollbar-gutter ${feedScrollbarGutter}`);
  if (feedScrollbarWidth !== "thin") issues.push(`feed scrollbar-width ${feedScrollbarWidth}`);
  const mode = classifyMode(feedReserved);
  if (mode === "classic") {
    if (!close(probeBothEdges, 2 * laneThin, .5)) issues.push(`both-edges ${probeBothEdges} != 2 x thin lane ${laneThin}`);
    if (!(laneThin > 0)) issues.push(`thin lane must be positive in classic mode: ${laneThin}`);
    if (!(laneThin < laneAuto)) issues.push(`thin lane ${laneThin} must be narrower than auto lane ${laneAuto}`);
  } else {
    if (laneThin > .5 || laneAuto > .5) issues.push(`overlay mode reserves no lane: thin ${laneThin}, auto ${laneAuto}`);
  }
  return issues;
}

// Baseline mode of a ui029 report. Reports since this batch store
// metrics.scrollbarMode; the frozen 0.2.8 report only has row widths, so the
// mode is derived from window-780: frame = window - 288 sidebar; the retained
// narrow rule gives row width = frame - G - 40, hence G = frame - 40 - width.
export function deriveUi029BaselineMode(previous, { sidebarWidth = 288 } = {}) {
  const stored = previous?.metrics?.scrollbarMode;
  if (stored && Number.isFinite(stored.feedReserved))
    return { mode: classifyMode(stored.feedReserved), reserved: stored.feedReserved, derivation: "metrics.scrollbarMode.feedReserved" };
  const layout = previous?.metrics?.layouts?.["window-780"];
  if (!layout?.rows?.length || !Number.isFinite(layout.width)) throw new Error("Baseline lacks window-780 row geometry");
  const reserved = layout.width - sidebarWidth - 2 * NARROW_GUTTER - layout.rows[0].width;
  return { mode: classifyMode(reserved), reserved,
    derivation: `window-780: (${layout.width} - ${sidebarWidth} sidebar - ${2 * NARROW_GUTTER}) - rows[0].width ${layout.rows[0].width} = ${reserved}` };
}

export function fadeLayoutMode(layout) {
  const reserved = layout?.viewport?.reservedInlineGutters;
  if (!Number.isFinite(reserved)) throw new Error("Layout lacks viewport.reservedInlineGutters");
  return classifyMode(reserved);
}

// ui029 row comparison. `before` is a frozen baseline layout (0.2.8 shape:
// rows top/bottom/height/width, contentHeight, scrollHeight); `after` is the
// current layout. Returns { failures, record } without throwing.
// columnDelta: a documented change of the content column width that is not a
// scrollbar gutter. 0.2.14 pane tiles render the chat tile as an anchored
// shell with min-width 320 (2.2553.1 Sh overflowMin), so the frozen
// "pane-280" layouts (chat wrap 280) now measure a 320px column: +40. A
// non-zero columnDelta forces the width-algebra comparison (heights recorded).
export function compareUi029Layout(name, before, after, { kind, gutterDelta = 0, columnDelta = 0, userRowDelta = USER_ROW_DELTA, topDelta = TOP_DELTA, tailDelta = TAIL_DELTA } = {}) {
  const failures = [], fail = message => failures.push(`${name}: ${message}`);
  const expect = (actual, expected, label, tolerance = .5) => { if (!close(actual, expected, tolerance)) fail(`${label}: expected ${expected}, got ${actual}`); };
  if (!COMPARISONS.includes(kind)) return { failures: [`${name}: unknown comparison ${kind}`], record: null };
  if (!before) return { failures: [`${name}: missing baseline layout`], record: null };
  if (after.width !== before.width) fail(`window width ${after.width} != baseline ${before.width}`);
  if (after.height !== before.height) fail(`window height ${after.height} != baseline ${before.height}`);
  if (after.rows.length !== before.rows.length) fail(`row count ${after.rows.length} != baseline ${before.rows.length}`);
  const userRows = after.rows.filter(row => row.user).length;
  if (!(userRows > 0)) fail("fixture contains user rows");
  const heightDeltas = [];
  let usersBefore = 0;
  const algebra = kind === "cross-mode-gutter-algebra" || columnDelta !== 0;
  for (let i = 0; i < Math.min(after.rows.length, before.rows.length); i++) {
    const a = after.rows[i], b = before.rows[i];
    if (a.id !== b.id) { fail(`row ${i} id ${a.id} != baseline ${b.id}`); break; }
    if (algebra) {
      expect(a.width, b.width - gutterDelta + columnDelta, `row ${a.id} width == baseline - reserved gutters + column delta`);
      if (i > 0) expect(a.top - after.rows[i - 1].bottom, b.top - before.rows[i - 1].bottom, `row ${a.id} gap to previous row (wrap-independent)`);
      heightDeltas.push({ id: a.id, user: a.user, heightDelta: a.height - b.height });
    } else {
      expect(a.width, b.width, "row width");
      expect(a.height, b.height + (a.user ? userRowDelta : 0), `row height${a.user ? " (+user actions row)" : ""}`);
      expect(a.top - b.top, topDelta + userRowDelta * usersBefore, "source top-reserve correction plus preceding user action rows");
    }
    if (a.user) usersBefore++;
  }
  const contentDelta = after.contentHeight - before.contentHeight, scrollDelta = after.scrollHeight - before.scrollHeight;
  if (!algebra) {
    expect(contentDelta, topDelta + tailDelta + userRowDelta * userRows, "full content extent change", 1);
    expect(scrollDelta, topDelta + tailDelta + userRowDelta * userRows, "overflowing scroll extent change", 1);
  }
  const record = { name, comparison: kind, gutterDelta, columnDelta, rows: after.rows.length, userRows, userRowDelta, topShift: after.rows[0].top - before.rows[0].top,
    contentDelta, scrollDelta, ...(algebra ? { heightDeltas, extentAsserted: false } : { extentAsserted: true }) };
  return { failures, record };
}

// transcript-fade comparison. `before` is a frozen 0.2.7 layout (viewport
// padding form), `after` the current sizer-padding form.
export function compareFadeLayout(name, before, after, { kind, gutterDelta = 0, columnDelta = 0, userRowDelta = USER_ROW_DELTA, topDelta = TOP_DELTA, tailDelta = TAIL_DELTA } = {}) {
  const failures = [], fail = message => failures.push(`${name}: ${message}`);
  const expect = (actual, expected, label, tolerance = 1) => { if (!close(actual, expected, tolerance)) fail(`${label}: expected ${expected}, got ${actual}`); };
  if (!COMPARISONS.includes(kind)) return { failures: [`${name}: unknown comparison ${kind}`], record: null };
  if (!before) return { failures: [`${name}: missing baseline layout`], record: null };
  if (JSON.stringify(after.window) !== JSON.stringify(before.window)) fail(`window ${JSON.stringify(after.window)} != baseline ${JSON.stringify(before.window)}`);
  if (!(after.userItemCount > 0)) fail("fixture contains user items");
  const oldPad = before.viewport.padding.left, newPad = after.sizer.padding.left;
  const equivalent = Math.abs(oldPad - newPad) < .1;
  const userDelta = userRowDelta * after.userItemCount;
  const algebra = kind === "cross-mode-gutter-algebra" || columnDelta !== 0;
  const record = { name, comparison: kind, gutterDelta, columnDelta, equivalent, oldPadding: oldPad, newPadding: newPad,
    baselineGutter: before.viewport.reservedInlineGutters, gutter: after.viewport.reservedInlineGutters,
    oldInnerWidth: before.sizer.innerWidth, newInnerWidth: after.sizer.innerWidth,
    expectedTopDelta: topDelta, expectedTailDelta: tailDelta, userItems: after.userItemCount, expectedUserDelta: userDelta, expectedExtentDelta: topDelta + tailDelta + userDelta };
  const full = () => {
    expect(after.viewport.scrollHeight, before.viewport.scrollHeight + topDelta + tailDelta + userDelta, "only documented top/tail/user-row extent delta");
    expect(after.sizer.rect.height, before.sizer.rect.height + topDelta + tailDelta + userDelta, "sizer height delta");
    expect(after.sizer.sentinel.contentTop, before.sizer.sentinel.contentTop + topDelta + tailDelta + userDelta, "end sentinel offset delta");
    for (const [group, currentItems, previousItems] of [["head", after.items, before.items], ["tail", after.tailItems, before.tailItems]]) {
      if (currentItems.length !== previousItems.length) { fail(`${group} item count ${currentItems.length} != ${previousItems.length}`); continue; }
      for (let i = 0; i < currentItems.length; i++) {
        const a = currentItems[i], b = previousItems[i];
        if (a.id !== b.id || a.footerTurn !== b.footerTurn) { fail(`${group} item ${i} identity ${a.id}/${a.footerTurn} != ${b.id}/${b.footerTurn}`); continue; }
        expect(a.rect.x, b.rect.x, `${group} item ${a.id ?? a.footerTurn} x`);
        expect(a.rect.width, b.rect.width, `${group} item ${a.id ?? a.footerTurn} width`);
        expect(a.rect.height, b.rect.height + (a.user ? userRowDelta : 0), `${group} item ${a.id ?? a.footerTurn} height${a.user ? " (+user actions row)" : ""}`);
        expect(a.rect.contentTop, b.rect.contentTop + topDelta + userRowDelta * a.usersBefore, `${group} item ${a.id ?? a.footerTurn} flow offset changes only with top reserve and preceding user rows`);
      }
    }
  };
  if (kind === "same-mode-full" && !algebra) {
    // Byte-for-byte the pre-gate comparison: same observed mode, and the
    // sizer padding must equal the old viewport padding to compare boxes.
    if (!close(after.viewport.reservedInlineGutters, before.viewport.reservedInlineGutters, 1)) fail("same observed scrollbar mode");
    if (equivalent) full();
  } else if (kind === "cross-mode-width-invariant" && !algebra) {
    // Both scrollports fit the full 768 measure; the column stays centered in
    // the scrollport, and both-edges gutters keep that center unchanged, so
    // every box (x, width, height, flow offset) must match the baseline.
    if (!close(after.sizer.innerWidth, COLUMN_MAX, .25)) fail(`inner width ${after.sizer.innerWidth} is not the full measure`);
    if (!close(before.sizer.innerWidth, COLUMN_MAX, .25)) fail(`baseline inner width ${before.sizer.innerWidth} is not the full measure`);
    full();
  } else {
    // Narrow column: width shrinks by the reserved gutters and the column
    // start moves by half of them; wrap-dependent heights are recorded only.
    expect(after.sizer.padding.left, before.viewport.padding.left, "sizer start padding equals old viewport padding", .05);
    expect(after.sizer.padding.right, before.viewport.padding.right, "sizer end padding equals old viewport padding", .05);
    const heightDeltas = [];
    for (const [group, currentItems, previousItems] of [["head", after.items, before.items], ["tail", after.tailItems, before.tailItems]]) {
      if (currentItems.length !== previousItems.length) { fail(`${group} item count ${currentItems.length} != ${previousItems.length}`); continue; }
      for (let i = 0; i < currentItems.length; i++) {
        const a = currentItems[i], b = previousItems[i], label = a.id ?? a.footerTurn;
        if (a.id !== b.id || a.footerTurn !== b.footerTurn) { fail(`${group} item ${i} identity ${a.id}/${a.footerTurn} != ${b.id}/${b.footerTurn}`); continue; }
        expect(a.rect.width, b.rect.width - gutterDelta + columnDelta, `${group} item ${label} width == baseline - reserved gutters + column delta`, .5);
        expect(a.rect.x, b.rect.x + gutterDelta / 2, `${group} item ${label} x == baseline + half the reserved gutters`, .5);
        if (group === "head") {
          if (i === 0) expect(a.rect.contentTop, b.rect.contentTop + topDelta, "first item top reserve", 1);
          else expect(a.previousGap, b.previousGap, `item ${label} gap to previous item (wrap-independent)`, .5);
        }
        heightDeltas.push({ group, id: label, user: !!a.user, heightDelta: a.rect.height - b.rect.height });
      }
    }
    Object.assign(record, { heightDeltas, extentAsserted: false, scrollHeightDelta: after.viewport.scrollHeight - before.viewport.scrollHeight,
      sizerHeightDelta: after.sizer.rect.height - before.sizer.rect.height, sentinelDelta: after.sizer.sentinel.contentTop - before.sizer.sentinel.contentTop });
  }
  if (kind !== "cross-mode-gutter-algebra") record.extentAsserted = kind === "cross-mode-width-invariant" || equivalent;
  return { failures, record };
}

// Scrollbar paint (design-system.css:1266-1268): `html, [data-theme]` sets
// `scrollbar-color: hsla(var(--border-300) / 35%) transparent` once and every
// official scroller inherits it (feed scroll-messages-current.js:63963, nav
// sidebar-rows.js:7975-7982 with mv=[scrollbar-gutter:stable], panes
// panes-tile-current.js:15450/15944/1728/14010 set no scrollbar-color). The
// probe resolves the same declaration in the live document and returns the
// computed scrollbar-color of html and of each named scroller.
export function paintIssues(paint, { scrollers = [], hovered = {} } = {}) {
  const issues = [];
  if (!paint || typeof paint !== "object") return ["missing paint probe"];
  const auto = value => !value || value === "auto";
  if (!paint.theme) issues.push("document root has no data-theme (design-system html,[data-theme] rule would not match)");
  if (!paint.borderToken) issues.push("--border-300 is not defined on the document root");
  if (auto(paint.expected)) issues.push(`hsla(var(--border-300) / 35%) transparent did not resolve: ${paint.expected}`);
  if (auto(paint.html)) issues.push(`html scrollbar-color is ${paint.html} (native paint)`);
  if (issues.length) return issues;
  if (paint.html !== paint.expected) issues.push(`html scrollbar-color ${paint.html} != design-system ${paint.expected}`);
  if (!/(rgba\(0, 0, 0, 0\)|transparent)$/.test(paint.expected)) issues.push(`track is not transparent: ${paint.expected}`);
  for (const name of scrollers) {
    const value = paint.scrollers?.[name];
    if (value === null || value === undefined) issues.push(`${name}: scroller not found`);
    else if (value !== paint.html) issues.push(`${name}: scrollbar-color ${value} != inherited html ${paint.html}`);
  }
  for (const [name, value] of Object.entries(hovered))
    if (value !== paint.html) issues.push(`${name} (hovered): scrollbar-color ${value} != inherited html ${paint.html} (official has no hover override)`);
  return issues;
}

export function probeScrollbarPaint(selectors) {
  const root = document.documentElement, rootStyle = getComputedStyle(root);
  const node = document.createElement("div");
  node.setAttribute("aria-hidden", "true");
  node.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none;scrollbar-color:hsla(var(--border-300) / 35%) transparent";
  document.body.appendChild(node);
  let expected;
  try { expected = getComputedStyle(node).scrollbarColor; } finally { node.remove(); }
  const scrollers = Object.fromEntries((selectors ?? []).map(selector => {
    const target = document.querySelector(selector);
    return [selector, target ? getComputedStyle(target).scrollbarColor : null];
  }));
  return { theme: root.dataset.theme ?? null, mode: root.dataset.mode ?? null, borderToken: rootStyle.getPropertyValue("--border-300").trim(),
    html: rootStyle.scrollbarColor, expected, scrollers };
}

// In-page probe (page.evaluate). Mirrors the official Gm() order: the feed's
// own reserved width first, then a hidden both-edges probe; the thin/auto
// lanes are extra evidence for the design-system global. Every probe node is
// removed before returning.
export function probeScrollbarMode() {
  const number = value => Number.parseFloat(value) || 0;
  const feed = document.querySelector(".transcript");
  const feedStyle = feed ? getComputedStyle(feed) : null;
  const feedReserved = feed ? feed.offsetWidth - feed.clientWidth - number(feedStyle.borderLeftWidth) - number(feedStyle.borderRightWidth) : null;
  const probe = extra => {
    const node = document.createElement("div");
    node.setAttribute("aria-hidden", "true");
    node.style.cssText = "position:absolute;top:0;left:0;width:100px;height:50px;overflow-y:auto;visibility:hidden;pointer-events:none;" + extra;
    document.body.appendChild(node);
    try { return node.offsetWidth - node.clientWidth; } finally { node.remove(); }
  };
  return {
    feedReserved, probeBothEdges: probe("scrollbar-gutter:stable both-edges"),
    laneThin: probe("scrollbar-gutter:stable;scrollbar-width:thin"), laneAuto: probe("scrollbar-gutter:stable;scrollbar-width:auto"),
    feedScrollbarGutter: feedStyle?.scrollbarGutter ?? null, feedScrollbarWidth: feedStyle?.scrollbarWidth ?? null,
    globalScrollbarWidth: (() => { const node = document.createElement("div"); document.body.appendChild(node); try { return getComputedStyle(node).scrollbarWidth; } finally { node.remove(); } })(),
    probesRemaining: document.querySelectorAll('body > div[aria-hidden="true"][style*="visibility:hidden"]').length,
  };
}
