// electron/computer-use/cursor.cjs: the phantom cursor (official §2.6). Native: computer_use.node setPhantomCursor /
// hidePhantomCursor, one panel per held window, calls kept in order (a hide lands before the hit test after it), the
// web pointer when the native cursor is unavailable (no module, no main run loop). Web: a click-through panel moved
// to the point, shown without focus and faded out 2 s later. And the service's hooks: the window's centre when a lock
// is taken, every app_* action's point (pulse only for a click), hidden before each hit-tested action, put back after
// one that did not land, gone with the lock; display-scope never shows it.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createCursor, FADE_AFTER_MS, FADE_MS, SIZE, TIP, POINTER_PAGE } = require("../electron/computer-use/cursor.cjs");
const { createComputerUse } = require("../electron/computer-use/service.cjs");
const { fit } = require("../electron/computer-use/budget.cjs");

function setUp(options = {}) {
  const windows = [], timers = [];
  class BrowserWindow {
    constructor(options) {
      Object.assign(this, { options, destroyed: false, visible: false, bounds: null, scripts: [], handlers: {}, ignores: false, level: null });
      this.webContents = { executeJavaScript: (code) => { this.scripts.push(code); return Promise.resolve(); } };
      windows.push(this);
    }
    setAlwaysOnTop(on, level) { this.level = level; }
    setIgnoreMouseEvents(value) { this.ignores = value; }
    setHiddenInMissionControl() {} setVisibleOnAllWorkspaces() {}
    on(name, handler) { this.handlers[name] = handler; }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; this.handlers.closed?.(); }
    setBounds(bounds) { this.bounds = bounds; }
    isVisible() { return this.visible; }
    showInactive() { this.visible = true; this.shownInactive = true; }
    show() { throw new Error("the pointer never takes focus"); }
    hide() { this.visible = false; }
  }
  const cursor = createCursor({ BrowserWindow, platform: "darwin", log: {}, native: options.native ?? null,
    setTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clearTimer: (timer) => { timer.cleared = true; } });
  const fire = () => { for (const timer of timers.splice(0)) if (!timer.cleared) timer.fn(); };
  return { cursor, windows, timers, fire };
}

test("pointAt: one click-through, unfocusable panel, the tip on the point, shown inactive, faded after 2 s and hidden", async () => {
  const { cursor, windows, timers, fire } = setUp();
  await cursor.pointAt({ x: 500, y: 300 });
  assert.equal(windows.length, 1);
  const [window] = windows;
  assert.deepEqual([window.options.transparent, window.options.focusable, window.options.type, window.ignores, window.level], [true, false, "panel", true, "screen-saver"]);
  assert.deepEqual(window.bounds, { x: 500 - TIP.x, y: 300 - TIP.y, width: SIZE, height: SIZE });
  assert.equal(window.shownInactive, true);
  assert.match(window.scripts.at(-1), /opacity = "1"/);
  assert.match(decodeURIComponent(window.url), /<svg/);
  assert.deepEqual(timers.map((timer) => timer.ms), [FADE_AFTER_MS]);
  fire();
  assert.match(window.scripts.at(-1), /opacity = "0"/);
  assert.deepEqual(timers.map((timer) => timer.ms), [FADE_MS]);
  assert.equal(window.visible, true, "still fading");
  fire();
  assert.equal(window.visible, false);
  assert.equal(cursor.owns(window), true);
  // The next click reuses the window.
  await cursor.pointAt({ x: 10, y: 20 });
  assert.equal(windows.length, 1);
  assert.deepEqual(window.bounds, { x: 10 - TIP.x, y: 20 - TIP.y, width: SIZE, height: SIZE });
});

test("hideNow: gone at once, and a pending fade from the earlier click does nothing", async () => {
  const { cursor, windows, timers, fire } = setUp();
  await cursor.pointAt({ x: 100, y: 100 });
  cursor.hideNow();
  assert.equal(windows[0].visible, false);
  assert.ok(timers.every((timer) => timer.cleared), "the fade is cancelled");
  fire();
  assert.equal(windows[0].visible, false);
  assert.equal(cursor.isShown(), false);
  await cursor.pointAt({ x: Number.NaN, y: 1 });
  assert.equal(windows[0].visible, false, "a point that isn't one shows nothing");
  assert.match(POINTER_PAGE, /prefers-reduced-motion/);
});

test("web pointer: only a click rings (pulse); a move shows the arrow without it", async () => {
  const { cursor, windows } = setUp();
  assert.equal(cursor.mode(), "web");
  await cursor.pointAt({ x: 5, y: 5, pulse: false });
  assert.doesNotMatch(windows[0].scripts.at(-1), /classList.add\("click"\)/);
  await cursor.pointAt({ x: 5, y: 5, windowId: 9, pulse: true });
  assert.match(windows[0].scripts.at(-1), /classList.add\("click"\)/);
  // Display-scope: the web pointer gets out of the way.
  await cursor.beforeClick({ scope: "display" });
  assert.equal(windows[0].visible, false);
});

/** A computer_use.node stand-in: records every call; the panels' state as setPhantomCursor would report it. */
function fakeNative({ fail = null, extra = {} } = {}) {
  const calls = [], panels = new Map();
  let number = 100;
  return {
    calls, panels,
    available: () => true,
    async call(method, params = {}) {
      calls.push([method, params]);
      if (fail && method.includes("PhantomCursor")) throw Object.assign(new Error(fail), { code: fail });
      if (method === "setPhantomCursor") {
        const id = params.windowId ?? 0;
        const panel = panels.get(id) ?? { windowId: id, windowNumber: ++number };
        Object.assign(panel, { visible: true, tip: { x: params.screenX, y: params.screenY }, pulsed: params.pulse });
        panels.set(id, panel);
        return { ...panel, placement: id ? "above_target" : "floating" };
      }
      if (method === "hidePhantomCursor") {
        const ids = params.windowId === undefined ? [...panels.keys()] : [params.windowId];
        for (const id of ids) if (panels.has(id)) panels.get(id).visible = false;
        return { hidden: ids.filter((id) => panels.has(id)) };
      }
      if (method === "phantomCursorState") return { cursors: [...panels.values()] };
      if (extra[method]) return extra[method](params);
      if (method === "savePanelProbe") throw Object.assign(new Error("Unknown method savePanelProbe."), { code: "unknown_method" });
      throw new Error(`unexpected ${method}`);
    },
  };
}

test("native: one panel per window via setPhantomCursor, pulse as asked, hidden per window or all, never the web pointer", async () => {
  const native = fakeNative();
  const { cursor, windows } = setUp({ native });
  assert.equal(cursor.mode(), "native");
  await cursor.pointAt({ x: 400, y: 300, windowId: 7, pulse: false });
  await cursor.pointAt({ x: -1200, y: -80, windowId: 8, pulse: true });   // a display left of / above the primary
  assert.deepEqual(native.calls, [
    ["setPhantomCursor", { screenX: 400, screenY: 300, windowId: 7, pulse: false }],
    ["setPhantomCursor", { screenX: -1200, screenY: -80, windowId: 8, pulse: true }],
  ]);
  assert.equal(windows.length, 0, "no web window");
  assert.deepEqual(cursor.windowNumbers().sort(), [101, 102]);
  assert.equal(cursor.isShown(), true);
  await cursor.hideNow(7);
  assert.deepEqual(native.calls.at(-1), ["hidePhantomCursor", { windowId: 7 }]);
  assert.deepEqual(cursor.windowNumbers(), [102]);
  // Display-scope leaves native cursors alone (click-through, out of the hit test by windowNumbers()).
  native.calls.length = 0;
  await cursor.beforeClick({ scope: "display" });
  assert.deepEqual(native.calls, []);
  // beforeClick of a window: that window's cursor only; without one: all.
  await cursor.beforeClick({ windowId: 8 });
  assert.deepEqual(native.calls, [["hidePhantomCursor", { windowId: 8 }]]);
  await cursor.hideNow();
  assert.deepEqual(native.calls.at(-1), ["hidePhantomCursor", {}]);
  assert.equal(cursor.isShown(), false);
  // restore: back at the last tip, no pulse; after release there is nothing to restore.
  native.calls.length = 0;
  await cursor.restore({ windowId: 8 });
  assert.deepEqual(native.calls, [["setPhantomCursor", { screenX: -1200, screenY: -80, windowId: 8, pulse: false }]]);
  await cursor.release({ windowId: 8 });
  assert.deepEqual(native.calls.at(-1), ["hidePhantomCursor", { windowId: 8 }]);
  native.calls.length = 0;
  await cursor.restore({ windowId: 8 });
  assert.deepEqual(native.calls, []);
  assert.deepEqual((await cursor.state()).cursors.map((c) => c.windowId).sort(), [7, 8]);
});

test("native: calls stay in order — a hide issued before a show lands before it", async () => {
  const order = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const native = { available: () => true, async call(method, params) {
    if (method === "hidePhantomCursor") { await gate; order.push("hide"); return { hidden: [params.windowId] }; }
    order.push("show");
    return { visible: true, windowNumber: 5 };
  } };
  const { cursor } = setUp({ native });
  const hidden = cursor.hideNow(3);
  const shown = cursor.pointAt({ x: 1, y: 1, windowId: 3 });
  release();
  await Promise.all([hidden, shown]);
  assert.deepEqual(order, ["hide", "show"]);
});

test("native unavailable (no main run loop / no module): the web pointer from then on", async () => {
  for (const code of ["main_thread_unavailable", "native_unavailable", "unknown_method"]) {
    const native = fakeNative({ fail: code });
    const { cursor, windows } = setUp({ native });
    await cursor.pointAt({ x: 50, y: 60, windowId: 4 });
    assert.equal(cursor.mode(), "web", code);
    assert.equal(windows.length, 1);
    assert.deepEqual(windows[0].bounds, { x: 50 - TIP.x, y: 60 - TIP.y, width: SIZE, height: SIZE });
    native.calls.length = 0;
    await cursor.pointAt({ x: 1, y: 2, windowId: 4 });
    assert.deepEqual(native.calls, [], "native is not asked again");
  }
  // A module that reports itself unavailable is never called.
  const native = { available: () => false, call: async () => { throw new Error("must not be called"); } };
  const { cursor } = setUp({ native });
  assert.equal(cursor.mode(), "web");
  // Any other native error is logged and does not switch.
  const flaky = fakeNative({ fail: "internal" });
  const second = setUp({ native: flaky });
  await second.cursor.pointAt({ x: 1, y: 1, windowId: 2 });
  assert.equal(second.cursor.mode(), "native");
  assert.equal(second.windows.length, 0);
});

/** The service with fake native answers and a recording pointer. */
function serviceSetUp({ answer = () => ({ outcome: "ok" }) } = {}) {
  const events = [];
  const elements = [{ index: 0, role: "AXTextField", title: "Name", frame: { x: 100, y: 40, width: 40, height: 20 } }];
  const native = { async call(method, params) {
    if (method === "probe") return { screenLocked: false, secureInput: false };
    if (method === "captureWindow") {
      const [width, height] = fit(1600, 1000);
      return { dataUrl: "data:image/jpeg;base64,QUJD", width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: params.windowId ?? 7, bundleId: params.bundleId,
        bounds: { x: 300, y: 200, width: 800, height: 500 }, jpegQuality: 0.75, elements };
    }
    if (["axClick", "axType", "axKey", "axScroll", "drag"].includes(method)) { events.push([method]); return answer(method); }
    if (method === "savePanelProbe") throw Object.assign(new Error("Unknown method savePanelProbe."), { code: "unknown_method" });
    throw new Error(method);
  } };
  const pointer = {
    beforeClick: async (target) => { events.push(["aside", target]); },
    clicked: (point) => events.push(["clicked", point]),
    moved: (point) => events.push(["moved", point]),
    restore: (target) => events.push(["restore", target]),
    released: (target) => events.push(["released", target]),
  };
  const cu = createComputerUse({ native, log: { warn() {}, info() {} }, wait: async () => {}, pointer });
  return { cu, events };
}

test("service: a newly held window shows the cursor at its centre; app_click hides it, then pulses at the landing point", async () => {
  let outcome = "ok";
  const { cu, events } = serviceSetUp({ answer: () => ({ outcome }) });
  cu.grantsFor("s").grant(["com.apple.finder"]);
  const app = "com.apple.finder", at = (x, y) => ({ sessionId: "s", bundleId: app, windowId: 7, x, y });
  await cu.appScreenshot("s", { bundleId: app });
  assert.deepEqual(events, [["moved", at(700, 450)]], "the window's centre, no pulse");
  events.length = 0;
  await cu.appScreenshot("s", { bundleId: app });
  assert.deepEqual(events, [], "a window already held does not move it");
  await cu.appClick("s", { bundleId: app, coordinate: [200, 100] });
  // frame px ÷ 2 + the window's origin.
  assert.deepEqual(events, [["aside", { windowId: 7 }], ["axClick"], ["clicked", at(400, 250)]]);
  events.length = 0;
  await cu.appClick("s", { bundleId: app, element_index: 0 });
  assert.deepEqual(events.at(-1), ["clicked", at(360, 225)], "the element's centre");
  events.length = 0;
  outcome = "unsupported";
  await cu.appClick("s", { bundleId: app, coordinate: [200, 100] });
  assert.deepEqual(events, [["aside", { windowId: 7 }], ["axClick"], ["restore", { sessionId: "s", bundleId: app, windowId: 7 }]], "a refused click puts it back");
  events.length = 0;
  outcome = "ok";
  await cu.appClick("s", { bundleId: app, target: "focused" });
  assert.deepEqual(events, [["axClick"]], "a focused-element press has no point: no hit test, the cursor stays");
});

test("service: type, key, scroll and drag move the cursor without the pulse", async () => {
  const { cu, events } = serviceSetUp({ answer: (method) => (method === "drag"
    ? { outcome: "ok", delivered: true, before: { AXValue: "a" }, after: { AXValue: "b" } } : { outcome: "ok" }) });
  const app = "com.apple.TextEdit", at = (x, y) => ({ sessionId: "s", bundleId: app, windowId: 7, x, y });
  cu.grantsFor("s").grant([app]);
  await cu.appScreenshot("s", { bundleId: app });
  events.length = 0;
  await cu.appType("s", { bundleId: app, text: "hi", coordinate: [400, 200] });
  assert.deepEqual(events, [["aside", { windowId: 7 }], ["axType"], ["moved", at(500, 300)]]);
  events.length = 0;
  await cu.appKey("s", { bundleId: app, combo: "return" });   // the last action's point
  assert.deepEqual(events, [["aside", { windowId: 7 }], ["axKey"], ["moved", at(500, 300)]]);
  events.length = 0;
  await cu.appScroll("s", { bundleId: app, dy: 2, coordinate: [600, 400] });
  assert.deepEqual(events, [["aside", { windowId: 7 }], ["axScroll"], ["moved", at(600, 400)]]);
  events.length = 0;
  await cu.appDrag("s", { bundleId: app, coordinate: [100, 100], to_coordinate: [300, 500] });
  assert.deepEqual(events, [["aside", { windowId: 7 }], ["drag"], ["moved", at(450, 450)]], "a drag ends at its end point");
  events.length = 0;
  await cu.appType("s", { bundleId: app, text: "x" });   // target focused (the default)
  assert.deepEqual(events, [["axType"]], "no point: the cursor stays");
});

test("service: the cursor goes with the lock — app_release, a revoked app, a forgotten session — unless another session holds that window", async () => {
  const { cu, events } = serviceSetUp();
  const app = "com.apple.finder";
  for (const id of ["a", "b"]) cu.grantsFor(id).grant([app]);
  await cu.appScreenshot("a", { bundleId: app, windowId: 7 });
  await cu.appScreenshot("a", { bundleId: app, windowId: 8 });
  await cu.appScreenshot("b", { bundleId: app, windowId: 8 });
  events.length = 0;
  cu.release("a", { bundleId: app, windowId: 7 });
  assert.deepEqual(events, [["released", { windowId: 7 }]]);
  events.length = 0;
  cu.release("a", { bundleId: app });
  assert.deepEqual(events, [], "window 8 is still held by session b");
  cu.forgetSession("b");
  assert.deepEqual(events, [["released", { windowId: 8 }]]);
  events.length = 0;
  // An action after the release does not bring it back (not held).
  await cu.appScreenshot("a", { bundleId: app, windowId: 9 });
  cu.release("a", {});
  events.length = 0;
  await assert.rejects(cu.appClick("a", { bundleId: app, windowId: 9, coordinate: [10, 10] }), { code: "screenshot_required" });
  assert.deepEqual(events, []);
});

test("service + cursor + one native: the hide lands before the AX hit test, the pulse after it", async () => {
  const native = fakeNative({ extra: {
    probe: () => ({ screenLocked: false, secureInput: false }),
    captureWindow: (params) => {
      const [width, height] = fit(1600, 1000);
      return { dataUrl: "data:image/jpeg;base64,QUJD", width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7, bundleId: params.bundleId,
        bounds: { x: -1500, y: 100, width: 800, height: 500 }, jpegQuality: 0.75, elements: [] };
    },
    axClick: () => ({ outcome: "ok" }),
  } });
  const { cursor } = setUp({ native });
  const pointer = {
    beforeClick: (target) => cursor.beforeClick(target),
    clicked: (point) => { cursor.pointAt({ ...point, pulse: true }); },
    moved: (point) => { cursor.pointAt({ ...point, pulse: false }); },
    restore: (target) => { cursor.restore(target); },
    released: (target) => { cursor.release(target); },
  };
  const cu = createComputerUse({ native, log: { warn() {}, info() {} }, wait: async () => {}, pointer });
  cu.grantsFor("s").grant(["com.apple.finder"]);
  await cu.appScreenshot("s", { bundleId: "com.apple.finder" });
  await cu.appClick("s", { bundleId: "com.apple.finder", coordinate: [200, 100] });
  await cursor.state();
  const seen = native.calls.map(([method, params]) => (method.includes("PhantomCursor") ? [method, params] : method)).filter((entry) => entry !== "probe" && entry !== "captureWindow" && entry !== "savePanelProbe");
  assert.deepEqual(seen, [
    ["setPhantomCursor", { screenX: -1100, screenY: 350, windowId: 7, pulse: false }],   // the lock: the window's centre (a display left of the primary)
    ["hidePhantomCursor", { windowId: 7 }],
    "axClick",
    ["setPhantomCursor", { screenX: -1400, screenY: 150, windowId: 7, pulse: true }],
    "phantomCursorState",
  ]);
  cu.release("s", {});
  await cursor.state();
  assert.equal(native.panels.get(7).visible, false, "gone with the lock");
});
