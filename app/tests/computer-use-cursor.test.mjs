// electron/computer-use/cursor.cjs: the pointer at the last click — a click-through panel moved to the click's screen
// point, shown without focus and faded out 2 s later; hidden before every click so no hit test lands on it. And the
// service's pointer hooks: before every click, after one that took effect, in global screen points.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createCursor, FADE_AFTER_MS, FADE_MS, SIZE, TIP, POINTER_PAGE } = require("../electron/computer-use/cursor.cjs");
const { createComputerUse } = require("../electron/computer-use/service.cjs");
const { fit } = require("../electron/computer-use/budget.cjs");

function setUp() {
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
  const cursor = createCursor({ BrowserWindow, platform: "darwin", log: {},
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

test("service: the pointer hides before every click and moves to the screen point of a click that took effect", async () => {
  const events = [];
  let answer = { outcome: "ok" };
  const elements = [{ index: 0, role: "AXButton", title: "Back", frame: { x: 100, y: 40, width: 40, height: 20 } }];
  const native = { async call(method, params) {
    if (method === "probe") return { screenLocked: false, secureInput: false };
    if (method === "captureWindow") {
      const [width, height] = fit(1600, 1000);
      return { dataUrl: "data:image/jpeg;base64,QUJD", width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7, bundleId: params.bundleId,
        bounds: { x: 300, y: 200, width: 800, height: 500 }, jpegQuality: 0.75, elements };
    }
    if (method === "axClick") { events.push(["axClick"]); return answer; }
    throw new Error(method);
  } };
  const cu = createComputerUse({ native, log: { warn() {}, info() {} }, wait: async () => {},
    pointer: { beforeClick: () => events.push(["hide"]), clicked: (point) => events.push(["show", point]) } });
  cu.grantsFor("s").grant(["com.apple.finder"]);
  await cu.appScreenshot("s", { bundleId: "com.apple.finder" });
  await cu.appClick("s", { bundleId: "com.apple.finder", coordinate: [200, 100] });
  // frame px ÷ 2 + the window's origin.
  assert.deepEqual(events, [["hide"], ["axClick"], ["show", { sessionId: "s", bundleId: "com.apple.finder", windowId: 7, x: 400, y: 250 }]]);
  events.length = 0;
  await cu.appClick("s", { bundleId: "com.apple.finder", element_index: 0 });
  assert.deepEqual(events.at(-1), ["show", { sessionId: "s", bundleId: "com.apple.finder", windowId: 7, x: 360, y: 225 }], "the element's centre");
  events.length = 0;
  answer = { outcome: "unsupported", reasonCode: "canvas" };
  await cu.appClick("s", { bundleId: "com.apple.finder", coordinate: [200, 100] });
  assert.deepEqual(events, [["hide"], ["axClick"]], "a refused click shows no pointer");
  events.length = 0;
  answer = { outcome: "ok" };
  await cu.appClick("s", { bundleId: "com.apple.finder", target: "focused" });
  assert.deepEqual(events, [["hide"], ["axClick"]], "a focused-element press has no point to show");
});
