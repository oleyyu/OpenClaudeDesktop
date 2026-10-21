// The target window highlight (electron/computer-use/window-highlight.cjs, native WindowHighlight.swift): the native
// controller, the driver that picks the windows (in use, not the display lock's holder, the current app_* window), the
// service's hooks, and main.cjs's split between the window highlight (background) and the screen glow (full control).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { createWindowHighlight, createHighlightDriver } = require("../electron/computer-use/window-highlight.cjs");
const { createComputerUse } = require("../electron/computer-use/service.cjs");
const { fit } = require("../electron/computer-use/budget.cjs");
const quiet = { info() {}, warn() {} };

function fakeNative({ fail = null } = {}) {
  const calls = [];
  let number = 900;
  const numbers = new Map();
  return {
    calls,
    available: () => true,
    async call(method, params) {
      calls.push([method, params]);
      if (fail) { const error = new Error(fail); error.code = fail; throw error; }
      if (method === "showWindowHighlight") {
        if (!numbers.has(params.windowId)) numbers.set(params.windowId, (number += 1));
        return { windowId: params.windowId, windowNumber: numbers.get(params.windowId), visible: true, wanted: true, placement: "above_target" };
      }
      if (method === "hideWindowHighlight") return { hidden: params.windowId ? [params.windowId] : [...numbers.keys()] };
      if (method === "windowHighlightState") return { highlights: [] };
      throw new Error(method);
    },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("native: show and hide a window's highlight in order, with the app's Reduce motion; the panels' numbers for the hit test", async () => {
  const native = fakeNative();
  let reduce = false;
  const highlight = createWindowHighlight({ native, reduceMotion: () => reduce, platform: "darwin", log: quiet });
  assert.equal(highlight.mode(), "native");
  await highlight.show(7);
  await highlight.show(9);
  assert.deepEqual(native.calls, [["showWindowHighlight", { windowId: 7, reduceMotion: false }], ["showWindowHighlight", { windowId: 9, reduceMotion: false }]]);
  assert.deepEqual(highlight.windows(), [7, 9]);
  assert.deepEqual(highlight.windowNumbers(), [901, 902]);
  // A hide sent right after a show lands after it (one chain).
  native.calls.length = 0;
  void highlight.show(11);
  await highlight.hide(11);
  assert.deepEqual(native.calls.map(([method]) => method), ["showWindowHighlight", "hideWindowHighlight"]);
  assert.deepEqual(highlight.windows(), [7, 9]);
  // Reduce motion turned on: the highlights up now are shown again with it.
  native.calls.length = 0;
  reduce = true;
  highlight.refreshMotion();
  await settle(); await settle();
  assert.deepEqual(native.calls, [["showWindowHighlight", { windowId: 7, reduceMotion: true }], ["showWindowHighlight", { windowId: 9, reduceMotion: true }]]);
  // No window id: all of them.
  native.calls.length = 0;
  await highlight.hide();
  assert.deepEqual(native.calls, [["hideWindowHighlight", {}]]);
  assert.deepEqual(highlight.windows(), []);
  assert.deepEqual(highlight.windowNumbers(), []);
  // Not a window id: nothing is asked.
  native.calls.length = 0;
  await highlight.show(0); await highlight.show(-3); await highlight.show(1.5); await highlight.hide("7");
  assert.deepEqual(native.calls, []);
});

test("native: no panels in this process (unavailable module, no main run loop, an older module) → no highlight, never asked again", async () => {
  for (const code of ["native_unavailable", "main_thread_unavailable", "unknown_method"]) {
    const native = fakeNative({ fail: code });
    const highlight = createWindowHighlight({ native, platform: "darwin", log: quiet });
    assert.equal(await highlight.show(7), null);
    assert.equal(highlight.mode(), "off", code);
    assert.deepEqual(highlight.windows(), []);
    native.calls.length = 0;
    await highlight.show(8); await highlight.hide(8);
    assert.deepEqual(native.calls, [], "not asked again");
  }
  // Another error is logged; the highlight stays native.
  const flaky = fakeNative({ fail: "internal" });
  const highlight = createWindowHighlight({ native: flaky, platform: "darwin", log: quiet });
  await highlight.show(7);
  assert.equal(highlight.mode(), "native");
  // A module that says it is unavailable, another platform: off from the start.
  assert.equal(createWindowHighlight({ native: { available: () => false, call: async () => { throw new Error("no"); } }, platform: "darwin" }).mode(), "off");
  assert.equal(createWindowHighlight({ native: fakeNative(), platform: "linux" }).mode(), "off");
});

/** A driver over a recording highlight and a settable in-use / lock holder. */
function driverSetUp() {
  const log = [];
  const shown = new Set();
  const highlight = {
    show: (windowId) => { shown.add(windowId); log.push(["show", windowId]); return Promise.resolve(); },
    hide: (windowId) => { shown.delete(windowId); log.push(["hide", windowId]); return Promise.resolve(); },
    windows: () => [...shown],
  };
  let sessions = [], lock = null;
  const listeners = new Set();
  const inUse = { sessions: () => sessions, onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  const driver = createHighlightDriver({ highlight, inUse, holder: () => lock });
  return {
    driver, log, shown,
    use(list) { sessions = list; for (const fn of listeners) fn(list); },
    lock(id) { lock = id; driver.lockChanged(); },
  };
}

test("driver: the window of a session's current operation, while it uses the computer", () => {
  const t = driverSetUp();
  // A target before the turn's first computer-use step is remembered, not shown.
  t.driver.target({ sessionId: "s", bundleId: "com.apple.TextEdit", windowId: 7 });
  assert.deepEqual(t.log, []);
  t.use(["s"]);
  assert.deepEqual(t.log, [["show", 7]]);
  // The same window again: nothing new.
  t.driver.target({ sessionId: "s", windowId: 7 });
  assert.deepEqual(t.log, [["show", 7]]);
  // Work moves to another window: the highlight moves with it.
  t.log.length = 0;
  t.driver.target({ sessionId: "s", windowId: 9 });
  assert.deepEqual(t.log, [["hide", 7], ["show", 9]]);
  // The turn ends: gone; the next turn brings it back on the same window.
  t.log.length = 0;
  t.use([]);
  assert.deepEqual(t.log, [["hide", 9]]);
  t.use(["s"]);
  assert.deepEqual(t.log, [["hide", 9], ["show", 9]]);
});

test("driver: a lock that goes takes the highlight; another session on the same window keeps it; the display lock's holder gets the glow instead", () => {
  const t = driverSetUp();
  t.use(["a", "b"]);
  t.driver.target({ sessionId: "a", windowId: 7 });
  t.driver.target({ sessionId: "b", windowId: 7 });
  assert.deepEqual(t.log, [["show", 7]], "one highlight per window");
  // a releases it (app_release): b still works on it.
  t.driver.released({ sessionId: "a", windowId: 7 });
  assert.deepEqual([...t.shown], [7]);
  t.driver.released({ sessionId: "b", windowId: 7 });
  assert.deepEqual([...t.shown], []);
  // Full-screen control: the holder's window highlight gives way (the screen glow shows), and comes back after.
  t.log.length = 0;
  t.driver.target({ sessionId: "a", windowId: 5 });
  t.driver.target({ sessionId: "b", windowId: 6 });
  t.lock("a");
  assert.deepEqual([...t.shown].sort(), [6], "only the other session's window");
  t.lock(null);
  assert.deepEqual([...t.shown].sort(), [5, 6]);
  // A forgotten session, and a release with no session (every session's).
  t.driver.forget("a");
  assert.deepEqual([...t.shown], [6]);
  t.driver.released({ windowId: 6 });
  assert.deepEqual([...t.shown], []);
  // Not a target: ignored.
  t.driver.target({ sessionId: "", windowId: 3 }); t.driver.target({ sessionId: "c", windowId: 0 });
  assert.deepEqual(t.driver.targets(), new Map());
});

/** The service with fake native answers and a recording highlight hook. */
function serviceSetUp({ answer = () => ({ outcome: "ok" }) } = {}) {
  const events = [];
  const native = { async call(method, params) {
    if (method === "probe") return { screenLocked: false, secureInput: false };
    if (method === "captureWindow") {
      const [width, height] = fit(1600, 1000);
      return { dataUrl: "data:image/jpeg;base64,QUJD", width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: params.windowId ?? 7, bundleId: params.bundleId,
        bounds: { x: 300, y: 200, width: 800, height: 500 }, jpegQuality: 0.75, elements: [] };
    }
    if (["axClick", "axType", "axKey", "axScroll"].includes(method)) return answer(method);
    throw new Error(method);
  } };
  const highlight = {
    target: (info) => events.push(["target", info]),
    released: (info) => events.push(["released", info]),
  };
  const cu = createComputerUse({ native, log: quiet, wait: async () => {}, highlight });
  return { cu, events };
}

test("service: an app_screenshot and every app_* action on a held window name the session's current window; releases name the session", async () => {
  const { cu, events } = serviceSetUp();
  const app = "com.apple.TextEdit";
  cu.grantsFor("s").grant([app]);
  // A mid-batch picture does not take the window.
  await cu.appScreenshot("s", { bundleId: app, keepReference: true });
  assert.deepEqual(events, []);
  await cu.appScreenshot("s", { bundleId: app });
  assert.deepEqual(events, [["target", { sessionId: "s", bundleId: app, windowId: 7 }]]);
  events.length = 0;
  await cu.appClick("s", { bundleId: app, coordinate: [200, 100] });
  await cu.appType("s", { bundleId: app, text: "hi", target: "focused" });
  assert.deepEqual(events, [["target", { sessionId: "s", bundleId: app, windowId: 7 }], ["target", { sessionId: "s", bundleId: app, windowId: 7 }]],
    "a click and a focused-element action alike (the driver drops repeats)");
  // A refused action on a held window still names it: the session is working there.
  events.length = 0;
  const refused = serviceSetUp({ answer: () => ({ outcome: "unsupported", reasonCode: "canvas" }) });
  refused.cu.grantsFor("s").grant([app]);
  await refused.cu.appScreenshot("s", { bundleId: app, windowId: 12 });
  await refused.cu.appClick("s", { bundleId: app, windowId: 12, coordinate: [10, 10] });
  assert.deepEqual(refused.events.map(([kind, info]) => [kind, info.windowId]), [["target", 12], ["target", 12]]);
  // app_release and a forgotten session name the session and the window.
  await cu.appScreenshot("s", { bundleId: app, windowId: 8 });
  events.length = 0;
  cu.release("s", { bundleId: app, windowId: 8 });
  assert.deepEqual(events, [["released", { sessionId: "s", windowId: 8 }]]);
  events.length = 0;
  cu.forgetSession("s");
  assert.deepEqual(events, [["released", { sessionId: "s", windowId: 7 }]]);
});

test("main.cjs: the screen glow follows the display lock's holder; the window highlight is not wired (official 2.42304.0 has none, spec §2.6.3)", () => {
  const main = fs.readFileSync(path.join(import.meta.dirname, "../electron/main.cjs"), "utf8");
  const sync = /function computerUseSyncGlow\(sessions = computerUseInUse\.sessions\(\)\) \{([\s\S]*?)\n\}/.exec(main)?.[1];
  assert.ok(sync, "computerUseSyncGlow");
  assert.match(sync, /if \(!computerUseLockHolder \|\| !sessions\.includes\(computerUseLockHolder\)\) \{ computerUseGlow\.hide\(\); return; \}/);
  assert.match(main, /computerUseInUse\.onChange\(\(sessions\) => \{\n  emit\(\{ kind: "computer-use-in-use", sessions \}\);\n  computerUseSyncGlow\(sessions\);\n\}\);/);
  // The lock change re-syncs the glow (in-use may not change when a session already using it takes the lock).
  assert.match(main, /computerUseInUse\?\.setHolder\(holder\);\n[\s\S]{0,200}computerUseSyncGlow\(\);/);
  // Background app_* work shows only the phantom cursor: no highlight module, driver or service hook in main.cjs.
  assert.doesNotMatch(main, /window-highlight\.cjs|computerUseHighlightDriver|computerUseWindowHighlight|highlight: \{/);
});

test("WindowHighlight.swift: the rim is the glow page's, the panel the phantom cursor's", () => {
  const swift = fs.readFileSync(path.join(import.meta.dirname, "../native/computer-use/Sources/ComputerUseCore/WindowHighlight.swift"), "utf8");
  const { GLOW_PAGE } = require("../electron/computer-use/glow-page.cjs");
  // The page's #glow shadows and the pulse's peak, as the Swift constants.
  assert.match(GLOW_PAGE, /inset 0 0 50px rgba\(217, 119, 87, 0\.5\),\n\s+inset 0 0 100px rgba\(217, 119, 87, 0\.3\),\n\s+inset 0 0 150px rgba\(217, 119, 87, 0\.1\)/);
  assert.match(GLOW_PAGE, /inset 0 0 65px rgba\(217, 119, 87, 0\.7\),\n\s+inset 0 0 115px rgba\(217, 119, 87, 0\.5\),\n\s+inset 0 0 165px rgba\(217, 119, 87, 0\.2\)/);
  assert.match(GLOW_PAGE, /animation: glow-pulse 2s ease-in-out infinite/);
  assert.match(GLOW_PAGE, /transition: opacity 0\.3s ease-in-out/);
  assert.ok(swift.includes("public static let rest: [(blur: Double, alpha: Double)] = [(50, 0.5), (100, 0.3), (150, 0.1)]"));
  assert.ok(swift.includes("public static let peak: [(blur: Double, alpha: Double)] = [(65, 0.7), (115, 0.5), (165, 0.2)]"));
  assert.ok(swift.includes("public static let pulsePeriod: Double = 2"));
  assert.ok(swift.includes("public static let fade: Double = 0.3"));
  for (const line of ["styleMask: [.nonactivatingPanel]", "panel.ignoresMouseEvents = true", "panel.hasShadow = false", "panel.isOpaque = false",
    "panel.order(.above, relativeTo: Int(windowId))", "panel.level = NSWindow.Level(rawValue: layer)"]) assert.ok(swift.includes(line), line);
});
