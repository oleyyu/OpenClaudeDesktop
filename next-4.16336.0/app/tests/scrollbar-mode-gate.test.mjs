import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { COLUMN_MAX, TAIL_DELTA, TOP_DELTA, USER_ROW_DELTA, classifyMode, compareFadeLayout, compareUi029Layout, comparisonKind,
  deriveUi029BaselineMode, expectedColumnInner, fadeLayoutMode, paintIssues, probeIssues, widthInvariant } from "../scripts/scrollbar-mode-gate.mjs";

const evidence = path.resolve(import.meta.dirname, "../../analysis/batch-20260920");
// The frozen 0.2.8 / 0.2.7 baselines are local evidence (analysis/ is not in the repository): the comparisons against
// them run where it exists and are skipped, with the reason, where it does not (a fresh clone).
const readJson = async name => { try { return JSON.parse(await fs.readFile(path.join(evidence, name), "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } };
const ui029Baseline = await readJson("ui029-baseline-report.json");
const fadeBaseline = await readJson("transcript-fade-baseline-report.json");
const needsBaselines = { skip: ui029Baseline && fadeBaseline ? false : "frozen baseline reports in analysis/batch-20260920 are not present" };
const classicProbe = { feedReserved: 22, probeBothEdges: 22, laneThin: 11, laneAuto: 15, feedScrollbarGutter: "stable both-edges", feedScrollbarWidth: "thin" };
const overlayProbe = { feedReserved: 0, probeBothEdges: 0, laneThin: 0, laneAuto: 0, feedScrollbarGutter: "stable both-edges", feedScrollbarWidth: "thin" };

test("mode classification and the clientWidth-based column are mode independent", () => {
  assert.equal(classifyMode(0), "overlay"); assert.equal(classifyMode(.25), "overlay"); assert.equal(classifyMode(22), "classic");
  assert.equal(expectedColumnInner({ windowWidth: 1468, clientWidth: 1180 }), COLUMN_MAX);
  assert.equal(expectedColumnInner({ windowWidth: 1468, clientWidth: 1158 }), COLUMN_MAX, "classic wide still fits the measure");
  assert.equal(expectedColumnInner({ windowWidth: 781, clientWidth: 493 }), 429);
  assert.equal(expectedColumnInner({ windowWidth: 781, clientWidth: 471 }), 407);
  assert.equal(expectedColumnInner({ windowWidth: 780, clientWidth: 492 }), 452);
  assert.equal(expectedColumnInner({ windowWidth: 780, clientWidth: 470 }), 430);
  assert.equal(widthInvariant({ windowWidth: 1324, baselineClientWidth: 1036, observedClientWidth: 1014 }), true);
  assert.equal(widthInvariant({ windowWidth: 1468, baselineClientWidth: 560, observedClientWidth: 538 }), false, "pane-560 is not invariant");
  assert.equal(widthInvariant({ windowWidth: 860, baselineClientWidth: 832, observedClientWidth: 810 }), false, "observed side drops below the measure");
});

test("comparison kind gates on mode equality first, then column invariance", () => {
  assert.equal(comparisonKind({ baselineMode: "overlay", observedMode: "overlay", windowWidth: 780, baselineClientWidth: 492, observedClientWidth: 492 }), "same-mode-full");
  assert.equal(comparisonKind({ baselineMode: "classic", observedMode: "classic", windowWidth: 1468, baselineClientWidth: 1158, observedClientWidth: 1158 }), "same-mode-full");
  assert.equal(comparisonKind({ baselineMode: "overlay", observedMode: "classic", windowWidth: 1468, baselineClientWidth: 1180, observedClientWidth: 1158 }), "cross-mode-width-invariant");
  assert.equal(comparisonKind({ baselineMode: "overlay", observedMode: "classic", windowWidth: 780, baselineClientWidth: 492, observedClientWidth: 470 }), "cross-mode-gutter-algebra");
  assert.equal(comparisonKind({ baselineMode: "classic", observedMode: "overlay", windowWidth: 1468, baselineClientWidth: 280, observedClientWidth: 302 }), "cross-mode-gutter-algebra");
});

test("probe consistency follows the official feed-first probe and the thin global", () => {
  assert.deepEqual(probeIssues(classicProbe), []);
  assert.deepEqual(probeIssues(overlayProbe), []);
  assert.match(probeIssues({ ...classicProbe, probeBothEdges: 30 }).join(), /feed reserved 22 != both-edges probe 30/);
  assert.match(probeIssues({ ...classicProbe, laneThin: 15 }).join(), /both-edges 22 != 2 x thin lane 15/);
  assert.match(probeIssues({ ...classicProbe, laneAuto: 11 }).join(), /narrower than auto lane/);
  assert.match(probeIssues({ ...classicProbe, feedScrollbarGutter: "auto" }).join(), /scrollbar-gutter auto/);
  assert.match(probeIssues({ ...overlayProbe, laneThin: 11 }).join(), /overlay mode reserves no lane/);
  assert.match(probeIssues({ ...classicProbe, feedReserved: NaN }).join(), /feedReserved/);
  assert.deepEqual(probeIssues(null), ["missing probe"]);
});

test("scrollbar paint is the single design-system html,[data-theme] color inherited by every scroller", () => {
  // Chromium serialization of hsla(30 3.3% 11.8% / 35%) transparent (light --border-300).
  const inherited = "rgba(31, 30, 29, 0.35) rgba(0, 0, 0, 0)";
  const paint = { theme: "claude", mode: "light", borderToken: "30 3.3% 11.8%", html: inherited, expected: inherited,
    scrollers: { ".transcript": inherited, "nav.source-session-list": inherited } };
  const scrollers = [".transcript", "nav.source-session-list"];
  assert.deepEqual(paintIssues(paint, { scrollers, hovered: { "nav.source-session-list": inherited } }), []);
  assert.deepEqual(paintIssues(null), ["missing paint probe"]);
  assert.match(paintIssues({ ...paint, html: "auto" }).join(), /html scrollbar-color is auto \(native paint\)/);
  assert.match(paintIssues({ ...paint, expected: "auto" }).join(), /did not resolve/);
  assert.match(paintIssues({ ...paint, theme: null }).join(), /no data-theme/);
  assert.match(paintIssues({ ...paint, borderToken: "" }).join(), /--border-300 is not defined/);
  assert.match(paintIssues({ ...paint, html: "rgba(0, 0, 0, 0.5) rgba(0, 0, 0, 0)" }).join(), /html scrollbar-color .* != design-system/);
  assert.match(paintIssues({ ...paint, html: "rgba(31, 30, 29, 0.35) rgb(255, 255, 255)", expected: "rgba(31, 30, 29, 0.35) rgb(255, 255, 255)" }).join(), /track is not transparent/);
  assert.match(paintIssues({ ...paint, scrollers: { ...paint.scrollers, "nav.source-session-list": "rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)" } }, { scrollers }).join(),
    /nav\.source-session-list: scrollbar-color rgba\(0, 0, 0, 0\) rgba\(0, 0, 0, 0\) != inherited/);
  assert.match(paintIssues({ ...paint, scrollers: { ".transcript": inherited } }, { scrollers }).join(), /nav\.source-session-list: scroller not found/);
  assert.match(paintIssues(paint, { hovered: { "nav.source-session-list": "rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0)" } }).join(), /\(hovered\): .* no hover override/);
});

test("the frozen 0.2.8 ui029 baseline derives overlay mode from its window-780 row width", needsBaselines, () => {
  const derived = deriveUi029BaselineMode(ui029Baseline);
  assert.equal(derived.mode, "overlay"); assert.equal(derived.reserved, 0);
  assert.match(derived.derivation, /window-780: \(780 - 288 sidebar - 40\) - rows\[0\]\.width 452 = 0/);
  const stored = deriveUi029BaselineMode({ metrics: { scrollbarMode: { feedReserved: 22 } } });
  assert.deepEqual(stored, { mode: "classic", reserved: 22, derivation: "metrics.scrollbarMode.feedReserved" });
  assert.throws(() => deriveUi029BaselineMode({ metrics: { layouts: {} } }), /window-780/);
  for (const layout of Object.values(fadeBaseline.metrics.layouts)) assert.equal(fadeLayoutMode(layout), "overlay");
  assert.throws(() => fadeLayoutMode({ viewport: {} }), /reservedInlineGutters/);
});

// Synthetic current-form layouts built from the frozen baselines: the
// documented 0.2.9/0.2.14 deltas plus an optional classic gutter G. Wrap-
// dependent heights at narrow widths are marked with an arbitrary growth so a
// gutter-algebra comparison must record rather than assert them.
function ui029Current(before, { gutter = 0, narrowGrowth = 0 } = {}) {
  const rows = []; let shift = TOP_DELTA, usersBefore = 0;
  for (const row of before.rows) {
    const user = /-user-/.test(row.id) || /^history-user/.test(row.id);
    const height = row.height + (user ? USER_ROW_DELTA : 0) + (gutter ? narrowGrowth : 0);
    const top = row.top + shift + USER_ROW_DELTA * usersBefore;
    rows.push({ id: row.id, user, top, bottom: top + height, height, width: row.width - gutter, x: 288 + gutter / 2 + (before.width <= 780 ? 20 : 32) });
    if (gutter) shift += narrowGrowth;
    if (user) usersBefore++;
  }
  const users = rows.filter(row => row.user).length;
  const grow = TOP_DELTA + TAIL_DELTA + USER_ROW_DELTA * users + (gutter ? narrowGrowth * rows.length : 0);
  return { width: before.width, height: before.height, rows, contentHeight: before.contentHeight + grow, scrollHeight: before.scrollHeight + grow };
}

test("ui029 same-mode comparison reproduces the pre-gate full checks against the 0.2.8 baseline", needsBaselines, () => {
  for (const [name, before] of Object.entries(ui029Baseline.metrics.layouts)) {
    const after = ui029Current(before);
    const { failures, record } = compareUi029Layout(name, before, after, { kind: "same-mode-full" });
    assert.deepEqual(failures, [], name);
    assert.equal(record.comparison, "same-mode-full"); assert.equal(record.topShift, TOP_DELTA); assert.equal(record.extentAsserted, true);
    assert.equal(record.contentDelta, TOP_DELTA + TAIL_DELTA + USER_ROW_DELTA * record.userRows);
  }
  const before = ui029Baseline.metrics.layouts["wide-1468"], after = ui029Current(before);
  after.rows[3].width -= 1;
  assert.match(compareUi029Layout("wide-1468", before, after, { kind: "same-mode-full" }).failures.join("\n"), /row width: expected 768, got 767/);
  after.rows[3].width += 1; after.rows[5].top += 2;
  assert.match(compareUi029Layout("wide-1468", before, after, { kind: "same-mode-full" }).failures.join("\n"), /top-reserve correction/);
});

test("ui029 cross-mode: wide layouts keep the full comparison, narrow layouts assert width algebra and gaps only", needsBaselines, () => {
  const G = 22;
  for (const name of ["wide-1468", "default-1324"]) {
    const before = ui029Baseline.metrics.layouts[name];
    const { failures, record } = compareUi029Layout(name, before, ui029Current(before), { kind: "cross-mode-width-invariant", gutterDelta: G });
    assert.deepEqual(failures, [], name); assert.equal(record.comparison, "cross-mode-width-invariant");
  }
  for (const name of ["window-780", "window-781", "pane-280", "pane-419", "pane-560"]) {
    const before = ui029Baseline.metrics.layouts[name];
    const after = ui029Current(before, { gutter: G, narrowGrowth: 17 });
    const { failures, record } = compareUi029Layout(name, before, after, { kind: "cross-mode-gutter-algebra", gutterDelta: G });
    assert.deepEqual(failures, [], name);
    assert.equal(record.comparison, "cross-mode-gutter-algebra"); assert.equal(record.extentAsserted, false);
    assert.equal(record.heightDeltas.length, before.rows.length);
    assert.ok(record.heightDeltas.every(entry => entry.heightDelta === 17 + (entry.user ? USER_ROW_DELTA : 0)));
    assert.equal(after.rows[0].width, before.rows[0].width - G);
    const wrong = ui029Current(before, { gutter: G - 1, narrowGrowth: 17 });
    assert.match(compareUi029Layout(name, before, wrong, { kind: "cross-mode-gutter-algebra", gutterDelta: G }).failures.join("\n"), /width == baseline - reserved gutters/);
    const gap = ui029Current(before, { gutter: G, narrowGrowth: 17 }); gap.rows[2].top += 3;
    assert.match(compareUi029Layout(name, before, gap, { kind: "cross-mode-gutter-algebra", gutterDelta: G }).failures.join("\n"), /gap to previous row/);
  }
  assert.deepEqual(compareUi029Layout("x", undefined, {}, { kind: "same-mode-full" }).failures, ["x: missing baseline layout"]);
  assert.deepEqual(compareUi029Layout("x", {}, {}, { kind: "sideways" }).failures, ["x: unknown comparison sideways"]);
});

function fadeCurrent(before, { gutter = 0, narrowGrowth = 0 } = {}) {
  const isUser = item => /-user$/.test(item.id ?? "");
  const users = before.items.filter(isUser).length + before.tailItems.filter(isUser).length;
  const total = before.itemCount ?? before.items.length;
  const userTotal = Math.round(users * total / (before.items.length + before.tailItems.length));
  const project = (items, base) => { let usersBefore = 0, growth = 0; return items.map((item, index) => {
    const user = isUser(item);
    const rect = { ...item.rect, x: item.rect.x + gutter / 2, width: item.rect.width - gutter, height: item.rect.height + (user ? USER_ROW_DELTA : 0) + (gutter ? narrowGrowth : 0),
      contentTop: item.rect.contentTop + TOP_DELTA + USER_ROW_DELTA * usersBefore + growth };
    const out = { ...item, user, usersBefore, rect, previousGap: index > 0 || base ? item.previousGap : null };
    if (user) usersBefore++; if (gutter) growth += narrowGrowth;
    return out; }); };
  const extent = TOP_DELTA + TAIL_DELTA + USER_ROW_DELTA * userTotal;
  return { window: before.window, userItemCount: userTotal,
    viewport: { ...before.viewport, padding: { top: 0, right: 0, bottom: 0, left: 0 }, clientWidth: before.viewport.clientWidth - gutter,
      reservedInlineGutters: gutter, scrollHeight: before.viewport.scrollHeight + extent },
    sizer: { ...before.sizer, padding: { top: 48, bottom: 48, left: before.viewport.padding.left, right: before.viewport.padding.right },
      innerWidth: before.sizer.innerWidth - gutter, rect: { ...before.sizer.rect, x: before.sizer.rect.x - before.viewport.padding.left + gutter / 2, height: before.sizer.rect.height + extent },
      sentinel: { ...before.sizer.sentinel, contentTop: before.sizer.sentinel.contentTop + extent } },
    items: project(before.items, false), tailItems: project(before.tailItems, true) };
}

test("fade same-mode comparison equals the pre-gate 0.2.7 comparison, including the padding-equivalence guard", needsBaselines, () => {
  for (const [name, before] of Object.entries(fadeBaseline.metrics.layouts)) {
    const after = fadeCurrent(before);
    const { failures, record } = compareFadeLayout(name, before, after, { kind: "same-mode-full" });
    assert.deepEqual(failures, [], name);
    assert.equal(record.comparison, "same-mode-full"); assert.equal(record.equivalent, true); assert.equal(record.extentAsserted, true);
    assert.equal(record.expectedExtentDelta, TOP_DELTA + TAIL_DELTA + USER_ROW_DELTA * after.userItemCount);
  }
  const before = fadeBaseline.metrics.layouts["wide-1468"], after = fadeCurrent(before);
  after.viewport.reservedInlineGutters = 22;
  assert.match(compareFadeLayout("wide-1468", before, after, { kind: "same-mode-full" }).failures.join("\n"), /same observed scrollbar mode/);
  const moved = fadeCurrent(before); moved.items[2].rect.height += 3;
  assert.match(compareFadeLayout("wide-1468", before, moved, { kind: "same-mode-full" }).failures.join("\n"), /fade-0-b height/);
});

test("fade cross-mode: width-invariant layouts keep every box; narrow layouts assert width/x algebra and gaps", needsBaselines, () => {
  const G = 22;
  for (const name of ["wide-1468", "default-1324"]) {
    const before = fadeBaseline.metrics.layouts[name];
    const after = fadeCurrent(before, { gutter: G });
    // Centered 768 column: gutters move the sizer, not the column.
    for (const item of [...after.items, ...after.tailItems]) item.rect.x -= G / 2;
    for (const item of [...after.items, ...after.tailItems]) item.rect.width += G;
    after.sizer.innerWidth = COLUMN_MAX;
    after.sizer.padding.left = before.viewport.padding.left - G / 2; after.sizer.padding.right = before.viewport.padding.right - G / 2;
    const { failures, record } = compareFadeLayout(name, before, after, { kind: "cross-mode-width-invariant", gutterDelta: G });
    assert.deepEqual(failures, [], name); assert.equal(record.comparison, "cross-mode-width-invariant"); assert.equal(record.equivalent, false);
    after.items[1].rect.x += 11;
    assert.match(compareFadeLayout(name, before, after, { kind: "cross-mode-width-invariant", gutterDelta: G }).failures.join("\n"), /fade-0-a x/);
  }
  for (const name of ["window-780", "window-781", "pane-280", "pane-419", "pane-560"]) {
    const before = fadeBaseline.metrics.layouts[name];
    const after = fadeCurrent(before, { gutter: G, narrowGrowth: 9 });
    const { failures, record } = compareFadeLayout(name, before, after, { kind: "cross-mode-gutter-algebra", gutterDelta: G });
    assert.deepEqual(failures, [], name);
    assert.equal(record.comparison, "cross-mode-gutter-algebra"); assert.equal(record.extentAsserted, false);
    assert.ok(record.heightDeltas.length === before.items.length + before.tailItems.length);
    assert.equal(after.items[0].rect.width, before.items[0].rect.width - G);
    const wrongX = fadeCurrent(before, { gutter: G, narrowGrowth: 9 }); wrongX.items[0].rect.x += 1;
    assert.match(compareFadeLayout(name, before, wrongX, { kind: "cross-mode-gutter-algebra", gutterDelta: G }).failures.join("\n"), /x == baseline \+ half the reserved gutters/);
    const wrongGap = fadeCurrent(before, { gutter: G, narrowGrowth: 9 }); wrongGap.items[3].previousGap += 1;
    assert.match(compareFadeLayout(name, before, wrongGap, { kind: "cross-mode-gutter-algebra", gutterDelta: G }).failures.join("\n"), /gap to previous item/);
    const wrongPad = fadeCurrent(before, { gutter: G, narrowGrowth: 9 }); wrongPad.sizer.padding.left += 12;
    assert.match(compareFadeLayout(name, before, wrongPad, { kind: "cross-mode-gutter-algebra", gutterDelta: G }).failures.join("\n"), /sizer start padding/);
  }
});

test("columnDelta shifts the width algebra without touching x, and forces the algebra path in same mode", needsBaselines, () => {
  const before = ui029Baseline.metrics.layouts["pane-280"];
  // The frozen 0.2.8 rows predate the user flag; mark the first row as the current suite would.
  const widened = { ...before, rows: before.rows.map((row, index) => ({ ...row, user: index === 0, width: row.width + 40 })) };
  const same = compareUi029Layout("pane-280", before, widened, { kind: "same-mode-full", gutterDelta: 0, columnDelta: 40 });
  assert.deepEqual(same.failures, []);
  assert.equal(same.record.columnDelta, 40);
  assert.equal(same.record.extentAsserted, false, "a column delta records heights instead of asserting the full extent");
  const plain = compareUi029Layout("pane-280", before, widened, { kind: "same-mode-full", gutterDelta: 0 });
  assert.ok(plain.failures.some(message => /row width/.test(message)), "without columnDelta the +40 widths fail");
  const fadeBefore = fadeBaseline.metrics.layouts["pane-280"];
  const grow = items => items.map(item => ({ ...item, rect: { ...item.rect, width: item.rect.width + 40 } }));
  const fadeAfter = { ...fadeBefore, sizer: { ...fadeBefore.sizer, padding: fadeBefore.viewport.padding }, items: grow(fadeBefore.items), tailItems: grow(fadeBefore.tailItems) };
  const fade = compareFadeLayout("pane-280", fadeBefore, fadeAfter, { kind: "same-mode-full", gutterDelta: 0, columnDelta: 40 });
  assert.deepEqual(fade.failures.filter(message => /width|x ==/.test(message)), [], "widths +40 and unchanged x pass");
});
