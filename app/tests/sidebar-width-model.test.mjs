import test from "node:test";
import assert from "node:assert/strict";
import {
  SIDEBAR_WIDTH, clampSidebarWidth,
  effectiveSidebarWidth, sidebarFloorWidth, storedSidebarWidth,
  NARROW_VIEWPORT_MIN_WIDTH, narrowViewportMaxWidth, narrowViewportQuery,
} from "../src/sidebar-width-model.mjs";

// shared-2-C6aD8DvJ.js Km/qm/Xm/$m, shared-22-Cz3C_T8d.js TL/HL, shared-19 Os ws/Ts/Es.
test("Km bounds and qm clamp", () => {
  assert.deepEqual({ ...SIDEBAR_WIDTH }, { MIN: 200, MAX: 420, DEFAULT: 288 });
  assert.ok(Object.isFrozen(SIDEBAR_WIDTH));
  assert.equal(clampSidebarWidth(120), 200);
  assert.equal(clampSidebarWidth(200), 200);
  assert.equal(clampSidebarWidth(250.5), 250.5);
  assert.equal(clampSidebarWidth(420), 420);
  assert.equal(clampSidebarWidth(900), 420);
});

// W14-code r4 gen-final-4: the test-only dragHidesSidebar (TL) is deleted; r5 cleanup R5DC-05 deletes the test-only
// HL threshold DRAG_THRESHOLD as well.

test("wL floor: qm(ceil(chrome width)) and Qg max(sidebarWidth, floor)", () => {
  assert.equal(sidebarFloorWidth(229.2), 230);
  assert.equal(sidebarFloorWidth(150), 200);
  assert.equal(sidebarFloorWidth(500), 420);
  assert.equal(sidebarFloorWidth(Number.NaN), 200);
  assert.equal(effectiveSidebarWidth(200, 230), 230);
  assert.equal(effectiveSidebarWidth(288, 230), 288);
  assert.equal(effectiveSidebarWidth(250), 250);
});

test("$m restores a stored width through qm, anything else is DEFAULT", () => {
  assert.equal(storedSidebarWidth(250), 250);
  assert.equal(storedSidebarWidth(150), 200);
  assert.equal(storedSidebarWidth(999), 420);
  for (const value of [undefined, null, "300", Number.NaN, Infinity]) assert.equal(storedSidebarWidth(value), 288);
});

test("traffic-light spacer follows titlebar-shared-21 _v: round(74 / min(zoom, 1))", async () => {
  const { trafficLightSpacerWidth, TRAFFIC_LIGHT_SPACER } = await import("../src/sidebar-width-model.mjs");
  assert.equal(TRAFFIC_LIGHT_SPACER, 74);
  assert.equal(trafficLightSpacerWidth(), 74);
  assert.equal(trafficLightSpacerWidth(1), 74);
  // Zoomed in the spacer stays 74 CSS px (it scales with the content).
  assert.equal(trafficLightSpacerWidth(1.25), 74);
  // Zoomed out it grows so the device width stays 74.
  assert.equal(trafficLightSpacerWidth(0.8), 93);
  assert.equal(trafficLightSpacerWidth(0.5), 148);
  for (const value of [0, -1, Number.NaN, undefined, "x"]) assert.equal(trafficLightSpacerWidth(value), 74);
});

// shared-2-C6aD8DvJ.js Jm / Ym (sidebar-main.js vl / sl).
test("narrow viewport bound: max(700, ceil(width) + 329) and its max-width query", () => {
  assert.equal(NARROW_VIEWPORT_MIN_WIDTH, 700);
  assert.equal(narrowViewportMaxWidth(288), 700);
  assert.equal(narrowViewportMaxWidth(200), 700);
  assert.equal(narrowViewportMaxWidth(371), 700);
  assert.equal(narrowViewportMaxWidth(372), 701);
  assert.equal(narrowViewportMaxWidth(400), 729);
  assert.equal(narrowViewportMaxWidth(420), 749);
  assert.equal(narrowViewportMaxWidth(399.2), 729, "ceil, like Jm");
  assert.equal(narrowViewportMaxWidth(Number.NaN), 700, "a missing width reads as the 288 default");
  assert.equal(narrowViewportQuery(288), "(max-width: 700px)");
  assert.equal(narrowViewportQuery(420), "(max-width: 749px)");
});
