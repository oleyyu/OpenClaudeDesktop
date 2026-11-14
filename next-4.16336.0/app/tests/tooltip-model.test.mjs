import test from "node:test";
import assert from "node:assert/strict";
import React from 'react';
import { tooltipContentKey } from '../src/generated/code-current/tooltip-structure.mjs';
import {
  computeTooltipPosition,
  createTooltipGroupState,
  createTooltipRegistry,
  cursorAnchorRect,
  emptyTooltipContent,
  hoverExitCorridor,
  insideHoverHull,
  intersectRect,
  isDismissalInput,
  isHandedBackFocus,
  safeHoverHull,
} from "../src/source-tooltip-model.js";

function clock() {
  let now = 0,
    next = 0;
  const timers = new Map();
  return {
    schedule(fn, ms) {
      const id = ++next;
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    cancel(id) {
      timers.delete(id);
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers])
        if (timer.at <= now) {
          timers.delete(id);
          timer.fn();
        }
    },
    get count() {
      return timers.size;
    },
  };
}

test('tooltip identity follows content structure, retaining text-only updates and replacing component changes', () => {
  const key = tooltipContentKey;
  for (const value of [null, undefined, '', true, false]) assert.equal(key(value), 'none');
  assert.equal(key('one'), key('two'));
  assert.notEqual(key('0'), key(0));
  const text = value => React.createElement('b', { key: 'label' }, value);
  assert.equal(key(text('one')), key(text('two')));
  assert.notEqual(key(text('one')), key(React.createElement('span', { key: 'label' }, 'one')));
  assert.notEqual(key(text('one')), key(React.createElement('b', { key: 'other' }, 'one')));
  assert.equal(key([text('one'), null]), key([text('two'), false]));
  assert.notEqual(key(React.createElement(React.Fragment, null, text('one'))), key(text('one')));
  const A = () => null, B = () => null;
  assert.equal(key(React.createElement(A, { value: 1 })), key(React.createElement(A, { value: 2 })));
  assert.notEqual(key(React.createElement(A)), key(React.createElement(B)));
  assert.notEqual(key(React.createElement(React.memo(A))), key(React.createElement(A)));
});

test("source-empty content does not create a tooltip, but zero remains useful content", () => {
  for (const value of [null, undefined, "", false, true, [false, [null, ""]]])
    assert.equal(emptyTooltipContent(value), true);
  for (const value of [0, "0", " ", [null, "label"]])
    assert.equal(emptyTooltipContent(value), false);
});

test("first group hover is 300ms, switching is immediate, and close retains warmth for 400ms", () => {
  const time = clock(),
    group = createTooltipGroupState(time);
  assert.equal(group.openingDelay(), 300);
  group.opened("A");
  assert.equal(group.openingDelay(), 0);
  group.closed("A");
  time.advance(399);
  assert.equal(group.openingDelay(), 0);
  time.advance(1);
  assert.equal(group.openingDelay(), 300);
  assert.equal(time.count, 0);
});

test("old group closes cannot cool the new owner's warm state and unmount clears a live owner", () => {
  const time = clock(),
    group = createTooltipGroupState(time);
  group.opened("A");
  group.closed("A");
  time.advance(200);
  group.opened("B");
  group.closed("A");
  time.advance(500);
  assert.equal(group.openingDelay(), 0);
  group.removed("A");
  assert.equal(group.openingDelay(), 0);
  group.removed("B");
  assert.equal(group.openingDelay(), 300);
  assert.equal(time.count, 0);
});

test("disposing a warm group releases the only pending timer", () => {
  const time = clock(),
    group = createTooltipGroupState(time);
  group.opened("A");
  group.closed("A");
  assert.equal(time.count, 1);
  group.dispose();
  assert.equal(time.count, 0);
  time.advance(1000);
  assert.equal(group.openingDelay(), 300);
});

test("single-owner replacement survives the old tooltip releasing during its instant close", () => {
  const registry = createTooltipRegistry();
  let closes = 0;
  const first = {
    closeInstant() {
      closes++;
      registry.release(first);
    },
  };
  const second = {
    closeInstant() {
      assert.fail("New owner must not close itself");
    },
  };
  registry.claim(first);
  registry.claim(second);
  assert.equal(closes, 1);
  assert.equal(registry.isCurrent(second), true);
  registry.release(first);
  assert.equal(registry.isCurrent(second), true);
  registry.release(second);
  assert.equal(registry.isCurrent(second), false);
});

test("centered top tooltip uses four-pixel offset and flips below titlebar exclusion", () => {
  const bounds = { left: 0, top: 0, right: 600, bottom: 400 };
  const popup = { width: 100, height: 24 };
  const anchor = { left: 200, right: 224, top: 100, bottom: 124 };
  const top = computeTooltipPosition(anchor, popup, bounds);
  assert.equal(top.x, 162);
  assert.equal(top.y, 72);
  assert.equal(top.side, "top");
  const flipped = computeTooltipPosition(
    { ...anchor, top: 40, bottom: 64 },
    popup,
    bounds,
    { collisionPadding: { top: 45 } },
  );
  assert.equal(flipped.side, "bottom");
  assert.equal(flipped.y, 68);
});

test("narrow clipping ancestors constrain cross-axis position and mark an offscreen anchor hidden", () => {
  const bounds = intersectRect(
    { left: 0, top: 0, right: 800, bottom: 600 },
    { left: 280, top: 30, right: 540, bottom: 550 },
  );
  const value = computeTooltipPosition(
    { left: 510, right: 534, top: 100, bottom: 124 },
    { width: 200, height: 24 },
    bounds,
  );
  assert.equal(value.x, 335);
  assert.equal(value.anchorHidden, false);
  assert.equal(
    computeTooltipPosition(
      { left: 200, right: 224, top: 100, bottom: 124 },
      { width: 200, height: 24 },
      bounds,
    ).anchorHidden,
    true,
  );
});

test("hoverable pointer bridge covers travel to the popup without retaining an unrelated direction", () => {
  const hull = safeHoverHull(
    { x: 50, y: 100 },
    { left: 10, right: 90, top: 50, bottom: 90 },
  );
  assert.equal(insideHoverHull({ x: 50, y: 97 }, hull), true);
  assert.equal(insideHoverHull({ x: 30, y: 75 }, hull), true);
  assert.equal(insideHoverHull({ x: 150, y: 97 }, hull), false);
  assert.equal(insideHoverHull({ x: 50, y: 130 }, hull), false);
});

test("one native movement far away from a popup closes instead of becoming its own safe origin", () => {
  const popup = { left: 1352, right: 1463, top: 41.5, bottom: 65.5 };
  const trigger = { left: 1432, right: 1456, top: 12, bottom: 36 };
  // Reproduces the first integrated GUI's popup→sidebar move with no later
  // mouse events. Both return and outward directions retain their semantics.
  assert.equal(hoverExitCorridor({ x: 120, y: 700 }, popup, trigger), null);
  assert.equal(hoverExitCorridor({ x: 120, y: 700 }, trigger, popup), null);
  assert.deepEqual(hoverExitCorridor({ x: 1444, y: 38 }, trigger, popup), {
    x: 1444,
    y: 36,
  });
  assert.deepEqual(hoverExitCorridor({ x: 1444, y: 38 }, popup, trigger), {
    x: 1444,
    y: 41.5,
  });
  assert.notEqual(hoverExitCorridor({ x: 1400, y: 53 }, trigger, popup), null);
});

test("body-portal placement escapes a narrow toolbar while reference visibility still uses its own ancestors", () => {
  const viewport = { left: 0, top: 0, right: 1000, bottom: 800 };
  const toolbar = { left: 280, top: 0, right: 1000, bottom: 40 };
  const anchor = { left: 850, right: 874, top: 12, bottom: 36 };
  const position = computeTooltipPosition(
    anchor,
    { width: 105, height: 24 },
    viewport,
    { side: "bottom", referenceBounds: toolbar },
  );
  assert.equal(position.y, 40);
  assert.equal(position.side, "bottom");
  assert.equal(position.anchorHidden, false);
  assert.equal(position.origin, "52.5px -4px");
  const clippedAnchor = computeTooltipPosition(
    { ...anchor, top: 60, bottom: 84 },
    { width: 105, height: 24 },
    viewport,
    { side: "bottom", referenceBounds: toolbar },
  );
  assert.equal(clippedAnchor.anchorHidden, true);
});

test("focus returned after a dismissing event is suppressed only when relatedTarget is absent", () => {
  const history = { observedInput: true, lastInputDismissing: true };
  assert.equal(isHandedBackFocus({ relatedTarget: null }, history), true);
  assert.equal(isHandedBackFocus({ relatedTarget: {} }, history), false);
  assert.equal(
    isHandedBackFocus(
      { relatedTarget: null },
      { ...history, observedInput: false },
    ),
    false,
  );
  assert.equal(
    isHandedBackFocus(
      { relatedTarget: null },
      { ...history, lastInputDismissing: false },
    ),
    false,
  );
});

test("Escape/Enter/Space and pointer down classify dismissal; Tab and composition do not", () => {
  for (const key of ["Escape", "Enter", " "])
    assert.equal(isDismissalInput({ type: "keydown", key }), true);
  assert.equal(
    isDismissalInput({ type: "keydown", key: "Enter", isComposing: true }),
    false,
  );
  assert.equal(isDismissalInput({ type: "keydown", key: "Tab" }), false);
  assert.equal(isDismissalInput({ type: "pointerdown" }), true);
});

// vendor-frame-BmPfNbgY.js js (useClientPoint) for Nu trackCursorAxis.
test("cursorAnchorRect tracks the pointer on the chosen axis only", () => {
  const rect = { left: 280, right: 292, top: 46, bottom: 800, width: 12, height: 754, x: 280, y: 46 };
  assert.deepEqual(cursorAnchorRect(rect, { x: 285, y: 300 }, "y"), { left: 280, right: 292, width: 12, top: 300, bottom: 300, height: 0, x: 280, y: 300 });
  assert.deepEqual(cursorAnchorRect(rect, { x: 285, y: 300 }, "x"), { left: 285, right: 285, width: 0, top: 46, bottom: 800, height: 754, x: 285, y: 46 });
  assert.deepEqual(cursorAnchorRect(rect, { x: 285, y: 300 }, "both"), { left: 285, right: 285, width: 0, top: 300, bottom: 300, height: 0, x: 285, y: 300 });
  assert.equal(cursorAnchorRect(rect, null, "y"), rect, "keyboard focus keeps the trigger rect");
  assert.equal(cursorAnchorRect(rect, { x: 1, y: 2 }, "none"), rect);
  const placed = computeTooltipPosition(cursorAnchorRect(rect, { x: 285, y: 300 }, "y"), { width: 120, height: 40 }, { left: 0, top: 0, right: 1200, bottom: 900 }, { side: "right", sideOffset: 4 });
  assert.deepEqual([placed.side, placed.x, placed.y], ["right", 296, 280], "side right, centered on the pointer y");
});

// Regression repair 1: Base UI useDismiss (vendor-frame-BmPfNbgY.js:16731-16745, :16960) hears Escape on the owner
// document in the bubble phase, so a focused modal or editor handles the key before an open hint consumes it.
test("tooltip Escape dismissal listens in the document bubble phase, like the menu and popover", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");
  const tooltip = read("source-tooltip.jsx");
  assert.match(tooltip, /document\.addEventListener\("keydown", key\);/);
  assert.match(tooltip, /document\.removeEventListener\("keydown", key\);/);
  assert.doesNotMatch(tooltip, /document\.(add|remove)EventListener\("keydown", key, true\)/);
  for (const name of ["source-menu.jsx", "source-popover.jsx"]) assert.match(read(name), /document\.addEventListener\("keydown", key\);/, name);
});
