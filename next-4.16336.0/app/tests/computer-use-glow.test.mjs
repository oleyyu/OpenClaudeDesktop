// Computer use's screen glow (electron/computer-use/glow.cjs, glow-page.cjs), the in-use signal behind it and the docked
// strip (in-use.cjs), and the app's own bundle id never being granted (grants.cjs). docs/computer-use-glow-design-20261020.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { computerUseAction } from "../electron/computer-use/actions.mjs";

const require = createRequire(import.meta.url);
const { GLOW_PAGE, DEFAULT_LABEL } = require("../electron/computer-use/glow-page.cjs");
const { createGlow, HIDE_MS } = require("../electron/computer-use/glow.cjs");
const { createInUse } = require("../electron/computer-use/in-use.cjs");
const { createGrants } = require("../electron/computer-use/grants.cjs");
const { createComputerUse } = require("../electron/computer-use/service.cjs");
const { createPreview, INTERVAL_MS } = require("../electron/computer-use/preview.cjs");

test("the glow page is the 2.42304.0 original, character for character", () => {
  const chunk = fs.readFileSync(new URL("../../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js", import.meta.url), "utf8");
  const start = chunk.indexOf("tIr=`") + 5;
  const original = chunk.slice(start, chunk.indexOf("`", start));
  const label = /eIr="([^"]+)"/.exec(chunk)[1];
  assert.equal(label, DEFAULT_LABEL);
  // The template's own escapes (\n, —) evaluated as the original's are.
  assert.equal(GLOW_PAGE, new Function("eIr", `return \`${original}\`;`)(label));
});

function fakes({ loadFails = false } = {}) {
  const windows = [], timers = [], displays = [{ id: 1, bounds: { x: 0, y: 0, width: 1440, height: 900 } }, { id: 2, bounds: { x: 1440, y: 0, width: 1920, height: 1080 } }];
  class BrowserWindow {
    constructor(options) {
      Object.assign(this, { options, destroyed: false, visible: false, bounds: { x: options.x, y: options.y, width: options.width, height: options.height }, calls: [], scripts: [], handlers: {} });
      this.webContents = { executeJavaScript: (code) => { this.scripts.push(code); return Promise.resolve(); } };
      windows.push(this);
    }
    setAlwaysOnTop(...args) { this.calls.push(["setAlwaysOnTop", ...args]); }
    setFullScreenable(...args) { this.calls.push(["setFullScreenable", ...args]); }
    setIgnoreMouseEvents(...args) { this.calls.push(["setIgnoreMouseEvents", ...args]); }
    setHiddenInMissionControl(...args) { this.calls.push(["setHiddenInMissionControl", ...args]); }
    on(name, handler) { this.handlers[name] = handler; }
    loadFile(file) { this.file = file; return loadFails ? Promise.reject(new Error("load failed")) : Promise.resolve(); }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; this.handlers.closed?.(); }
    getBounds() { return this.bounds; }
    setBounds(bounds) { this.bounds = bounds; }
    isVisible() { return this.visible; }
    showInactive() { this.visible = true; }
    hide() { this.visible = false; }
  }
  const written = new Map();
  const glow = createGlow({
    BrowserWindow, platform: "darwin", log: {},
    screen: { getAllDisplays: () => displays, getPrimaryDisplay: () => displays[0] },
    app: { dock: { visible: false, isVisible() { return this.visible; }, show() { this.visible = true; } } },
    fs: { writeFile: async (file, text) => { written.set(file, text); }, unlink: async (file) => { written.delete(file); } },
    tmpdir: () => "/tmp/x",
    setTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimer: (timer) => { timer.cleared = true; },
  });
  const fire = () => { for (const timer of timers.splice(0)) if (!timer.cleared) timer.fn(); };
  return { glow, windows, timers, written, fire };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
// A glow's options over fresh fakes, pushing its windows into `windows`.
function glowOptions(windows) {
  const displays = [{ id: 1, bounds: { x: 0, y: 0, width: 1440, height: 900 } }, { id: 2, bounds: { x: 1440, y: 0, width: 1920, height: 1080 } }];
  class BrowserWindow {
    constructor(options) {
      Object.assign(this, { options, destroyed: false, visible: false, bounds: { x: options.x, y: options.y, width: options.width, height: options.height }, scripts: [], handlers: {} });
      this.webContents = { executeJavaScript: (code) => { this.scripts.push(code); return Promise.resolve(); } };
      windows.push(this);
    }
    setAlwaysOnTop() {} setFullScreenable() {} setIgnoreMouseEvents() {} setHiddenInMissionControl() {}
    on(name, handler) { this.handlers[name] = handler; }
    loadFile() { return Promise.resolve(); }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; this.handlers.closed?.(); }
    getBounds() { return this.bounds; }
    setBounds(bounds) { this.bounds = bounds; }
    isVisible() { return this.visible; }
    showInactive() { this.visible = true; }
    hide() { this.visible = false; }
  }
  return { BrowserWindow, displays, platform: "darwin", log: {}, screen: { getAllDisplays: () => displays, getPrimaryDisplay: () => displays[0] },
    fs: { writeFile: async () => {}, unlink: async () => {} }, tmpdir: () => "/tmp/x", setTimer: () => ({}), clearTimer: () => {} };
}

test("show creates the original window once, on the chosen display, and flashes the badge with the label", async () => {
  const { glow, windows, written } = fakes();
  const changes = []; glow.onChange((value) => changes.push(value));
  glow.moveTo(2);
  glow.show({ label: "Codex is using your computer" });
  await settle();
  assert.equal(windows.length, 1);
  const [window] = windows;
  assert.deepEqual(window.options, { x: 1440, y: 0, width: 1920, height: 1080, transparent: true, frame: false, roundedCorners: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, movable: false, resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
    type: "panel", enableLargerThanScreen: true, show: false, backgroundColor: "#00000000", webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
  assert.deepEqual(window.calls, [["setAlwaysOnTop", true, "screen-saver"], ["setFullScreenable", false], ["setIgnoreMouseEvents", true], ["setHiddenInMissionControl", true]]);
  assert.equal(window.file, "/tmp/x/cu-glow.html");
  assert.equal(written.get("/tmp/x/cu-glow.html"), GLOW_PAGE);
  assert.equal(window.visible, true);
  assert.match(window.scripts.at(-1), /textContent = "Codex is using your computer"/);
  assert.match(window.scripts.at(-1), /badge\.classList\.add\("flash"\)/);
  assert.match(window.scripts.at(-1), /style\.opacity = "1"/);
  assert.deepEqual(changes, [true]);
  assert.equal(glow.owns(window), true);
  assert.equal(glow.owns({}), false);
  glow.show();
  await settle();
  assert.equal(windows.length, 1, "the window is reused");
});

test("hide fades out and hides the window 320ms later; a show in between cancels it", async () => {
  const { glow, windows, timers, fire } = fakes();
  const changes = []; glow.onChange((value) => changes.push(value));
  glow.show(); await settle();
  const [window] = windows;
  glow.hide();
  assert.match(window.scripts.at(-1), /style\.opacity = "0"/);
  assert.equal(timers.at(-1).ms, HIDE_MS);
  assert.equal(HIDE_MS, 320);
  glow.show(); await settle();
  fire();
  assert.equal(window.visible, true, "the show cancelled the pending hide");
  glow.hide(); fire();
  assert.equal(window.visible, false);
  assert.equal(window.destroyed, false, "the window is kept for the next show");
  assert.deepEqual(changes, [true, false]);
});

test("a hide while the window is still being created wins: the window never shows", async () => {
  const { glow, windows } = fakes();
  glow.show();
  glow.hide();
  await settle();
  assert.equal(windows.length, 1);
  assert.equal(windows[0].visible, false);
  assert.equal(glow.isShown(), false);
});

test("a page that fails to load destroys the window and the glow is down", async () => {
  const { glow, windows } = fakes({ loadFails: true });
  glow.show();
  await settle(); await settle();
  assert.equal(windows[0].destroyed, true);
  assert.equal(glow.isShown(), false);
  assert.equal(glow.owns(windows[0]), false);
});

test("moveTo puts a shown glow on the other display; an unknown display falls back to the primary", async () => {
  const { glow, windows } = fakes();
  glow.show(); await settle();
  glow.moveTo(2);
  assert.deepEqual(windows[0].bounds, { x: 1440, y: 0, width: 1920, height: 1080 });
  glow.moveTo(99);
  assert.deepEqual(windows[0].bounds, { x: 0, y: 0, width: 1440, height: 900 });
});

const isComputerUse = (item) => { const action = computerUseAction(item); return !!action && action.kind !== "request_access"; };
const started = (threadId, item) => ({ method: "item/started", params: { threadId, item } });

test("a session uses the computer from its first computer-use step until its turn completes", () => {
  const inUse = createInUse({ isComputerUse });
  const changes = []; inUse.onChange((sessions) => changes.push(sessions));
  inUse.observe(started("a", { type: "commandExecution", command: "ls" }));
  inUse.observe(started("a", { type: "mcpToolCall", server: "computer-use", tool: "request_access", arguments: {} }));
  assert.deepEqual(inUse.sessions(), [], "neither a command nor asking for access");
  inUse.observe(started("a", { type: "computerUse", action: { kind: "screenshot" } }));
  inUse.observe(started("a", { type: "mcpToolCall", server: "computer-use", tool: "left_click", arguments: { coordinate: [1, 2] } }));
  inUse.observe({ method: "item/completed", params: { threadId: "a", item: { type: "computerUse", action: { kind: "screenshot" } } } });
  inUse.observe(started("b", { type: "dynamicToolCall", tool: "computer", arguments: { action: "type", text: "x" } }));
  assert.deepEqual(inUse.sessions(), ["a", "b"]);
  inUse.observe({ method: "turn/completed", params: { threadId: "a", turn: { status: "interrupted" } } });
  assert.deepEqual(inUse.sessions(), ["b"]);
  inUse.observe({ method: "turn/completed", params: { threadId: "a" } });
  inUse.observe({ kind: "connection", connected: false });
  assert.deepEqual(inUse.sessions(), []);
  assert.deepEqual(changes, [["a"], ["a", "b"], ["b"], []], "one change per session joining or leaving, none between steps");
});

test("the app's own bundle id is never granted, so its windows stay out of every capture", async () => {
  const grants = createGrants({ refuse: ["com.github.Electron"] });
  assert.deepEqual(grants.grant(["com.github.Electron", "com.apple.Notes"]).map((g) => g.bundleId), ["com.apple.Notes"]);
  assert.equal(grants.has("com.github.Electron"), false);
  assert.deepEqual(createGrants().grant(["com.github.Electron"]).map((g) => g.bundleId), ["com.github.Electron"]);
  const service = createComputerUse({ native: {}, selfBundleIds: ["com.github.Electron"] });
  service.grantsFor("s").grant(["com.github.Electron", "com.apple.Notes"]);
  assert.deepEqual((await service.call("computer-use:grants", { sessionId: "s" })).result.apps.map((g) => g.bundleId), ["com.apple.Notes"]);
});

test("the app's Reduce motion setting turns the page's animations off at run time; the page stays the original", async () => {
  const windows = [];
  let reduce = true;
  const motion = createGlow({ ...glowOptions(windows), reduceMotion: () => reduce });
  motion.show(); await settle();
  const window = windows.at(-1);
  assert.match(window.scripts[0], /#glow, #badge-dot, #badge\.flash \{ animation: none; \}/);
  assert.match(window.scripts[0], /if \(true\)/);
  reduce = false; motion.refreshMotion();
  assert.match(window.scripts.at(-1), /if \(false\)/);
});

test("a display that goes away or changes size moves a shown glow; its own display gone → the primary", async () => {
  const handlers = {}, windows = [];
  const options = glowOptions(windows);
  options.screen.on = (name, fn) => { handlers[name] = fn; };
  options.screen.removeListener = (name) => { delete handlers[name]; };
  const glow = createGlow(options);
  glow.moveTo(2); glow.show(); await settle();
  assert.deepEqual(windows[0].bounds, { x: 1440, y: 0, width: 1920, height: 1080 });
  options.displays.splice(1, 1);
  handlers["display-removed"]();
  assert.deepEqual(windows[0].bounds, { x: 0, y: 0, width: 1440, height: 900 });
  options.displays[0].bounds = { x: 0, y: 0, width: 1280, height: 800 };
  handlers["display-metrics-changed"]();
  assert.deepEqual(windows[0].bounds, { x: 0, y: 0, width: 1280, height: 800 });
  glow.dispose();
  assert.deepEqual(Object.keys(handlers), []);
});

test("live preview: while a card subscribes and the session uses the computer, its last window is captured every second", async () => {
  const events = [], timers = [], captures = [];
  let target = { bundleId: "com.apple.Notes", windowId: 7, name: "Notes" }, fails = false;
  const listeners = [];
  let using = [];
  const inUse = { sessions: () => using, onChange: (fn) => listeners.push(fn) };
  const setUsing = (list) => { using = list; for (const fn of listeners) fn(list); };
  const service = { lastTarget: () => target, captureWindow: async (sessionId, params) => { captures.push([sessionId, params]); if (fails) throw new Error("no"); return { dataUrl: "data:image/jpeg;base64,AA==" }; } };
  const preview = createPreview({ service, inUse, emit: (event) => events.push(event),
    setTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clearTimer: (timer) => { timer.cleared = true; } });
  const fire = async () => { for (const timer of timers.splice(0)) if (!timer.cleared) await timer.fn(); await settle(); };
  assert.equal(preview.subscribe("s", true), true);
  await settle();
  assert.deepEqual(captures, [], "not in use yet");
  setUsing(["s"]); await settle();
  assert.deepEqual(captures, [["s", { bundleId: "com.apple.Notes", windowId: 7, scale: 0.5 }]]);
  assert.deepEqual(events.at(-1), { kind: "computer-use-preview", sessionId: "s", active: true, mode: "app", targetLabel: "Notes", frame: "data:image/jpeg;base64,AA==" });
  assert.equal(timers.at(-1).ms, INTERVAL_MS);
  assert.equal(INTERVAL_MS, 1000);
  fails = true; await fire();
  assert.deepEqual(events.at(-1), { kind: "computer-use-preview", sessionId: "s", active: false }, "a failed capture ends the live frame once");
  const count = events.length; await fire();
  assert.equal(events.length, count, "no repeat while it keeps failing");
  fails = false; await fire();
  assert.equal(events.at(-1).active, true);
  setUsing([]);
  assert.deepEqual(events.at(-1), { kind: "computer-use-preview", sessionId: "s", active: false }, "the session leaving stops it");
  setUsing(["s"]); await settle();
  preview.subscribe("s", false);
  assert.equal(events.at(-1).active, false, "the last card leaving stops it");
  const before = captures.length; await fire();
  assert.equal(captures.length, before);
  target = null;
  preview.subscribe("s", true); await settle();
  assert.equal(captures.length, before, "no target, no capture");
});

test("the service's live target is the window the session last looked at, in a granted app", async () => {
  const { fit, scaled } = require("../electron/computer-use/budget.cjs");
  const native = { call: async (method, params) => { const [width, height] = scaled(fit(1840, 872), params.scale ?? 1);
    return { bundleId: params.bundleId, windowId: 9, dataUrl: "x", width, height, frameWidth: 1840, frameHeight: 872, jpegQuality: 0.75, elements: [] }; } };
  const service = createComputerUse({ native });
  assert.equal(service.lastTarget("s"), null);
  service.grantsFor("s").grant([{ bundleId: "com.apple.Notes", displayName: "Notes" }]);
  await service.appScreenshot("s", { bundleId: "com.apple.Notes" });
  assert.deepEqual(service.lastTarget("s"), { bundleId: "com.apple.Notes", windowId: 9, name: "Notes" });
  service.grantsFor("s").revoke("com.apple.Notes");
  assert.equal(service.lastTarget("s"), null, "a revoked app is no target");
});
