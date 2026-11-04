import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_LAYER_OFFSET, CONTEXT_MENU_SIDE_OFFSET, NESTED_SIDE_OFFSET, ROOT_SIDE_OFFSET,
  SAFE_POLYGON_LINGER, SAFE_POLYGON_MIN_SPEED, SUBMENU_HOVER_DELAY, TYPEAHEAD_TIMEOUT, collisionInsets,
  menuLayer, moveHighlight, nestedAnchor, normalizeShortcut, pendingRows, pointInPolygon,
  positionMenu, restoreDecision, safePolygonPoints, safePolygonStep, sheetBranch, skeletonPlan, typeaheadMatch, typeaheadState,
} from "../src/menu-model.mjs";

test("highlight moves with wrapping arrows and Home/End over the enabled list only", () => {
  assert.equal(moveHighlight({ count: 4, current: 3, key: "ArrowDown" }), 0, "ArrowDown from the last enabled row wraps to the first");
  assert.equal(moveHighlight({ count: 4, current: 0, key: "ArrowUp" }), 3);
  assert.equal(moveHighlight({ count: 4, current: -1, key: "ArrowDown" }), 0, "no highlight yet: ArrowDown enters at the first");
  assert.equal(moveHighlight({ count: 4, current: -1, key: "ArrowUp" }), 3, "no highlight yet: ArrowUp enters at the last");
  assert.equal(moveHighlight({ count: 4, current: 2, key: "Home" }), 0);
  assert.equal(moveHighlight({ count: 4, current: 1, key: "End" }), 3);
  assert.equal(moveHighlight({ count: 4, current: 1, key: "a" }), null);
  assert.equal(moveHighlight({ count: 0, current: -1, key: "ArrowDown" }), null);
});

test("type-ahead accumulates within 500ms and matches after the current row, wrapping", () => {
  let state = typeaheadState(null, "M", 1000);
  assert.deepEqual(state, { text: "m", at: 1000 });
  state = typeaheadState(state, "a", 1000 + TYPEAHEAD_TIMEOUT);
  assert.equal(state.text, "ma", "a key exactly at the timeout still extends the buffer");
  state = typeaheadState(state, "p", 1000 + TYPEAHEAD_TIMEOUT + 501);
  assert.equal(state.text, "p", "a later key starts a new buffer");
  const labels = ["Auto", "Manual", "Plan"];
  assert.equal(typeaheadMatch(labels, 0, "m"), 1);
  assert.equal(typeaheadMatch(labels, 1, "m"), 1, "wraps back to the current row when it is the only match");
  assert.equal(typeaheadMatch(labels, 2, "a"), 0, "wraps from the end");
  assert.equal(typeaheadMatch(labels, -1, "p"), 2);
  assert.equal(typeaheadMatch(labels, 0, "x"), null);
  assert.equal(typeaheadMatch([], 0, "a"), null);
});

test("close reason decides focus restoration (Id/Cg)", () => {
  assert.equal(restoreDecision({ reason: "escape-key" }), "trigger");
  assert.equal(restoreDecision({ reason: "focus-out", activeInsidePopup: true }), "none");
  assert.equal(restoreDecision({ reason: "outside-press", activeInsidePopup: true }), "trigger");
  assert.equal(restoreDecision({ reason: "outside-press", activeIsBody: true }), "trigger", "a non-focusable outside press leaves focus on body: restore");
  assert.equal(restoreDecision({ reason: "outside-press", activeInsidePopup: false, activeIsBody: false }), "none", "focus already moved to the editor: skipRestoreOnOutsideFocus");
  assert.equal(restoreDecision({ reason: "item-click" }), "trigger");
  assert.equal(restoreDecision({ reason: "item-click", finalFocus: () => null }), "final");
  assert.equal(restoreDecision({ reason: "item-click", finalFocus: false }), "none");
  assert.equal(restoreDecision({ reason: "cancel-open" }), "none");
  assert.equal(restoreDecision({ reason: "resize" }), "none");
});

test("positioner offsets: root 6, nested 2, Filter 4, with the gap measured to the anchor", () => {
  const viewport = { width: 1200, height: 800 };
  const anchor = { left: 500, right: 560, top: 700, bottom: 720, width: 60, height: 20 };
  const size = { width: 200, height: 120 };
  const top = positionMenu({ anchor, size, viewport, side: "top", align: "end" });
  assert.equal(anchor.top - (top.top + size.height), ROOT_SIDE_OFFSET);
  assert.equal(top.left, anchor.right - size.width);
  assert.equal(top.side, "top");
  assert.equal(top.availableHeight, anchor.top - ROOT_SIDE_OFFSET - 8);
  const filter = positionMenu({ anchor: { ...anchor, top: 40, bottom: 64 }, size, viewport, side: "bottom", align: "end", sideOffset: 4 });
  assert.equal(filter.top - 64, 4);
  assert.equal(filter.side, "bottom");
  const nested = positionMenu({ anchor: nestedAnchor({ left: 300, width: 200 }, { left: 304, width: 192, top: 400, bottom: 424, height: 24 }), size, viewport, side: "right", sideOffset: NESTED_SIDE_OFFSET });
  assert.equal(nested.left, 500 + NESTED_SIDE_OFFSET, "child left edge equals the parent popup right edge + 2");
  assert.equal(nested.top, 400, "align start puts the child at the trigger row top");
});

test("positioner flips only when the opposite side has more room and shifts inside the collision box", () => {
  const viewport = { width: 1000, height: 600 };
  const size = { width: 300, height: 200 };
  const low = positionMenu({ anchor: { left: 900, right: 960, top: 500, bottom: 520 }, size, viewport, side: "bottom", align: "start" });
  assert.equal(low.side, "top", "no room below, more room above");
  assert.equal(low.top, 500 - 6 - 200);
  assert.equal(low.left, 1000 - 8 - 300, "shifted left to keep the right collision padding");
  const high = positionMenu({ anchor: { left: 10, right: 70, top: 20, bottom: 40 }, size, viewport, side: "top", align: "start", collisionPadding: { top: 48, right: 8, bottom: 8, left: 8 } });
  assert.equal(high.side, "bottom", "no room above the 48px inset, flips below");
  assert.equal(high.top, 48, "40 + 6 would sit inside the 48px top inset, so the popup shifts down to it");
  assert.equal(high.left, 10);
  const tall = positionMenu({ anchor: { left: 10, right: 70, top: 300, bottom: 320 }, size: { width: 300, height: 900 }, viewport, side: "top", align: "start" });
  assert.equal(tall.side, "top", "neither side fits; the larger side (286px above vs 266px below) wins");
  assert.equal(tall.top, 8, "clamped to the top collision inset");
  assert.equal(tall.availableHeight, 300 - 6 - 8);
  const mirrored = positionMenu({ anchor: { left: 700, right: 900, top: 100, bottom: 124 }, size, viewport, side: "right", sideOffset: 2 });
  assert.equal(mirrored.side, "left", "a clipped submenu mirrors to the left of its parent");
  assert.equal(mirrored.left, 700 - 2 - 300);
  assert.deepEqual(collisionInsets(8), { top: 8, right: 8, bottom: 8, left: 8 });
  assert.deepEqual(collisionInsets({ top: 48 }), { top: 48, right: 8, bottom: 8, left: 8 });
  assert.equal(positionMenu({ anchor: { left: 0, right: 10, top: 0, bottom: 10 }, size, viewport }).availableWidth, 1000 - 16);
});

test("layers follow al(): base + 100 for the tree, + 20 for the menu popup, + 30 for a cursor-anchored context menu", () => {
  assert.deepEqual(menuLayer(0), { layerBase: 100, z: 120 });
  assert.deepEqual(menuLayer(100), { layerBase: 200, z: 220 }, "nested popups stack one band above their parent");
  assert.deepEqual(menuLayer(undefined), { layerBase: 100, z: 120 });
  assert.equal(CONTEXT_MENU_LAYER_OFFSET, 30, "tl.contextmenu");
  assert.deepEqual(menuLayer(0, CONTEXT_MENU_LAYER_OFFSET), { layerBase: 100, z: 130 });
  assert.deepEqual(menuLayer(0, undefined), { layerBase: 100, z: 120 });
});

test("cursor-anchored context menu: Base UI positioner defaults sideOffset -5 and alignOffset 2 from the pointer", () => {
  assert.equal(CONTEXT_MENU_SIDE_OFFSET, -5);
  assert.equal(CONTEXT_MENU_ALIGN_OFFSET, 2);
  const viewport = { width: 1200, height: 800 };
  const cursor = { left: 300, right: 300, top: 400, bottom: 400, width: 0, height: 0 };
  const result = positionMenu({ anchor: cursor, size: { width: 200, height: 120 }, viewport, side: "bottom", align: "start", sideOffset: CONTEXT_MENU_SIDE_OFFSET, alignOffset: CONTEXT_MENU_ALIGN_OFFSET });
  assert.deepEqual([result.left, result.top, result.side, result.align], [302, 395, "bottom", "start"], "popup lands 2px right of and 5px above the pointer");
  const end = positionMenu({ anchor: cursor, size: { width: 200, height: 120 }, viewport, side: "bottom", align: "end", sideOffset: 0, alignOffset: 2 });
  assert.equal(end.left, 300 - 200 - 2, "align end applies the alignment offset backwards");
  const vertical = positionMenu({ anchor: cursor, size: { width: 200, height: 120 }, viewport, side: "right", align: "start", sideOffset: 2, alignOffset: 4 });
  assert.deepEqual([vertical.left, vertical.top], [302, 404], "on a horizontal side the alignment axis is vertical");
  assert.equal(positionMenu({ anchor: cursor, size: { width: 200, height: 120 }, viewport }).left, 300, "no alignOffset by default");
});

test("submenu hover contract: 100ms open delay/rest, safe-polygon buffer, linger and resting speed", () => {
  assert.equal(SUBMENU_HOVER_DELAY, 100);
  assert.equal(SAFE_POLYGON_LINGER, 40);
  assert.equal(SAFE_POLYGON_MIN_SPEED, 0.1);
  assert.equal(pointInPolygon(5, 5, [[0, 0], [10, 0], [10, 10], [0, 10]]), true);
  assert.equal(pointInPolygon(15, 5, [[0, 0], [10, 0], [10, 10], [0, 10]]), false);
});

test("safe polygon keeps a diagonal path from the trigger row to the child popup open and closes elsewhere", () => {
  // Parent popup rows are 200px wide / 24px tall; the child opens 2px to the
  // right of the parent, aligned to the trigger row top, taller than the row.
  const reference = { left: 100, right: 300, top: 200, bottom: 224, width: 200, height: 24 };
  const floating = { left: 302, right: 480, top: 200, bottom: 300, width: 178, height: 100 };
  const origin = { x: 220, y: 224 }; // the pointer left through the row's bottom edge, heading down-right
  const polygon = safePolygonPoints({ side: "right", origin, reference, floating });
  assert.equal(polygon.length, 4);
  assert.deepEqual(polygon[2], [302.5, 200]); assert.deepEqual(polygon[3], [302.5, 300]);
  const state = { side: "right", origin, reference, floating, landed: false };
  let step = safePolygonStep(state, { x: 220, y: 224, leave: true, speed: Infinity });
  assert.equal(step.verdict, "linger", "the leave sample itself sits at the corridor apex: linger, not close");
  step = safePolygonStep(state, { x: 250, y: 245, speed: 1.5 });
  assert.equal(step.verdict, "linger", "a point on the straight line toward the child's lower edge stays inside the corridor");
  assert.equal(step.landed, false);
  step = safePolygonStep(state, { x: 301, y: 210, speed: 1.5 });
  assert.equal(step.verdict, "stay", "the gap between the row's right edge and the child, within the row's own height, is always safe");
  assert.equal(safePolygonStep(state, { x: 301, y: 260, speed: 1.5 }).verdict, "linger", "below the row the gap is only safe through the corridor");
  step = safePolygonStep(state, { x: 330, y: 280, insideFloating: true, speed: 1.5 });
  assert.deepEqual([step.verdict, step.landed], ["stay", true], "reaching the child lands the pointer");
  step = safePolygonStep({ ...state, landed: true }, { x: 200, y: 250, speed: 2 });
  assert.equal(step.verdict, "close", "leaving the child to a sibling row closes with closeDelay 0");
  step = safePolygonStep(state, { x: 220, y: 260, speed: 2 });
  assert.equal(step.verdict, "close", "moving straight down into the sibling row is outside the corridor");
  step = safePolygonStep(state, { x: 250, y: 245, speed: 0.05 });
  assert.equal(step.verdict, "close", "resting outside both rects (slower than 0.1px/ms) closes");
  step = safePolygonStep(state, { x: 250, y: 245, leave: true, speed: 0.05 });
  assert.equal(step.verdict, "linger", "the speed rule does not apply to the leave sample");
  let evaluated = 0;
  const lazy = () => { evaluated++; return 0; };
  assert.equal(safePolygonStep(state, { x: 250, y: 245, leave: true, speed: lazy }).verdict, "linger");
  assert.equal(safePolygonStep(state, { x: 301, y: 210, speed: lazy }).verdict, "stay", "gap: early return");
  assert.equal(evaluated, 0, "a lazy speed is not evaluated on the leave sample or before the resting rule is reached");
  assert.equal(safePolygonStep(state, { x: 250, y: 245, speed: lazy }).verdict, "close");
  assert.equal(evaluated, 1, "the lazy speed is evaluated exactly when the resting rule runs");
  step = safePolygonStep(state, { x: 150, y: 210, insideReference: true, speed: 2 });
  assert.deepEqual([step.verdict, step.landed], ["stay", true], "back on the trigger row: stay");
  step = safePolygonStep(state, { x: 90, y: 260, descendantOpen: true, speed: 2 });
  assert.equal(step.verdict, "stay", "an open grandchild popup keeps the tree open");
  step = safePolygonStep({ ...state, origin: { x: 100, y: 210 } }, { x: 80, y: 210, speed: 2 });
  assert.equal(step.verdict, "close", "leaving the row through the edge away from the child closes");
  const mirroredFloating = { left: -80, right: 98, top: 200, bottom: 300, width: 178, height: 100 };
  const mirrored = safePolygonStep({ side: "left", origin: { x: 150, y: 224 }, reference, floating: mirroredFloating }, { x: 125, y: 250, speed: 2 });
  assert.equal(mirrored.verdict, "linger", "a mirrored child uses the left-side corridor (down-left toward its right edge)");
  assert.equal(safePolygonStep({ side: "left", origin: { x: 150, y: 224 }, reference, floating: mirroredFloating }, { x: 175, y: 250, speed: 2 }).verdict, "close", "down-right is outside the mirrored corridor");
});

test("shortcuts normalize to aria-keyshortcuts and render platform caps", () => {
  assert.equal(normalizeShortcut("Meta+,"), "Meta+,");
  assert.equal(normalizeShortcut("⌘ N"), "Meta+N");
  assert.equal(normalizeShortcut("Shift+Enter"), "Shift+Enter");
  assert.equal(normalizeShortcut("p"), "p");
  assert.equal(normalizeShortcut(undefined), undefined);
  // Key specs (shared-frame Qa keys) keep their written order in aria-keyshortcuts.
  assert.equal(normalizeShortcut("cmd+shift+f"), "Meta+Shift+F");
  assert.equal(normalizeShortcut("cmd+,"), "Meta+,");
  assert.equal(normalizeShortcut("escape"), "Escape");
});

test("pending skeleton plan follows yc rows and R_ retained height", () => {
  const plain = skeletonPlan(3, false);
  assert.equal(plain.length, 3, "a numeric row count is one group without separators");
  assert.deepEqual(plain.map((row) => row.width), [120, 88, 104]);
  assert.equal(plain[0].first, true);
  const grouped = skeletonPlan([2, 1], true);
  assert.deepEqual(grouped.map((row) => row.separator ? "sep" : row.width), [160, 128, "sep", 144]);
  assert.equal(skeletonPlan(0).length, 3, "no positive group falls back to three rows");
  assert.equal(pendingRows({ retainedHeight: 0, placeholderRows: 3 }), 3);
  assert.equal(pendingRows({ retainedHeight: 90, placeholderRows: 3 }), 5, "ceil(90 / 20)");
});

test("sheet branch only when the coarse-pointer query matches or the tree already is a sheet", () => {
  assert.equal(sheetBranch(false, false), false);
  assert.equal(sheetBranch(true, false), true);
  assert.equal(sheetBranch(false, true), true);
});
