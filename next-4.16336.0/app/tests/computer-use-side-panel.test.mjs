// Full control docks the main window as a side panel (electron/computer-use/side-panel.cjs; official 2.42304.0
// [cu-side-panel] NFa/PFa/FFa/IFa/LFa/RFa, spec §2.5.2), its wiring in main.cjs and the renderer's narrow layout while
// docked (main.jsx, source-split-view.jsx).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createSidePanel, dockedBounds, PANEL_WIDTH, PANEL_HEIGHT, PANEL_MARGIN, ANIMATE_MS } = require("../electron/computer-use/side-panel.cjs");

const OFFICIAL = new URL("../../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js", import.meta.url);

function fakeWindow({ bounds = { x: 100, y: 80, width: 1200, height: 800 }, minSize = [600, 400], fullScreen = false, maximized = false,
  visible = true, alwaysOnTop = false } = {}) {
  const calls = [];
  const listeners = new Map();
  const state = { bounds: { ...bounds }, minSize: [...minSize], fullScreen, maximized, visible, alwaysOnTop, allSpaces: false, destroyed: false, minimized: false };
  const window = {
    calls, state,
    isDestroyed: () => state.destroyed,
    isMinimized: () => state.minimized,
    isVisible: () => state.visible,
    isFullScreen: () => state.fullScreen,
    isMaximized: () => state.maximized,
    isAlwaysOnTop: () => state.alwaysOnTop,
    getBounds: () => ({ ...state.bounds }),
    getMinimumSize: () => [...state.minSize],
    setMinimumSize(w, h) { calls.push(["setMinimumSize", w, h]); state.minSize = [w, h]; },
    setBounds(b, animate) { calls.push(animate === undefined ? ["setBounds", { ...b }] : ["setBounds", { ...b }, animate]); state.bounds = { ...b }; },
    showInactive() { calls.push(["showInactive"]); state.visible = true; },
    unmaximize() { calls.push(["unmaximize"]); state.maximized = false; state.bounds = { x: 0, y: 25, width: 1440, height: 875 }; },
    maximize() { calls.push(["maximize"]); state.maximized = true; },
    setFullScreen(on) {
      calls.push(["setFullScreen", on]);
      state.fullScreen = on;
      if (!on) queueMicrotask(() => { for (const fn of listeners.get("leave-full-screen") ?? []) fn(); listeners.delete("leave-full-screen"); });
    },
    once(name, fn) { listeners.set(name, [...(listeners.get(name) ?? []), fn]); },
    setAlwaysOnTop(on, level) { calls.push(level === undefined ? ["setAlwaysOnTop", on] : ["setAlwaysOnTop", on, level]); state.alwaysOnTop = on; },
    setVisibleOnAllWorkspaces(on, options) { calls.push(["setVisibleOnAllWorkspaces", on, options]); state.allSpaces = on; },
    focus() { calls.push(["focus"]); },
  };
  return window;
}
const screenWith = (areas) => ({
  getDisplayNearestPoint(point) {
    const hit = areas.find((a) => point.x >= a.x && point.x < a.x + a.width && point.y >= a.y && point.y < a.y + a.height) ?? areas[0];
    return { workArea: hit };
  },
});
const MAIN_AREA = { x: 0, y: 25, width: 1440, height: 875 };
function panel(options = {}) {
  const events = [], focused = [];
  const sidePanel = createSidePanel({ screen: screenWith(options.areas ?? [MAIN_AREA]), platform: options.platform ?? "darwin", log: { info() {}, warn() {} },
    dispatch: (window, docked, holder) => events.push({ window, docked, holder }), focus: (window) => focused.push(window), ...options.extra });
  return { sidePanel, events, focused };
}

test("the constants and the corner are the official ones (DFa 520, OFa 720, kFa 20, AFa 220; NFa)", () => {
  const chunk = fs.readFileSync(OFFICIAL, "utf8");
  assert.match(chunk, /var DFa=520,OFa=720,kFa=20,AFa=220,/);
  assert.deepEqual([PANEL_WIDTH, PANEL_HEIGHT, PANEL_MARGIN, ANIMATE_MS], [520, 720, 20, 220]);
  // Top-right corner of the work area of the display under the window's centre, 20 px in from the right and the top.
  assert.deepEqual(dockedBounds(fakeWindow(), screenWith([MAIN_AREA])), { width: 520, height: 720, x: 1440 - 520 - 20, y: 25 + 20 });
  // A small display: min(520, width - 20) × min(720, height - 20).
  assert.deepEqual(dockedBounds(fakeWindow({ bounds: { x: 0, y: 0, width: 400, height: 300 } }), screenWith([{ x: 0, y: 0, width: 500, height: 600 }])),
    { width: 480, height: 580, x: 0, y: 20 });
  // The display the window's centre is on, not the primary one.
  const second = { x: 1440, y: -200, width: 1920, height: 1055 };
  assert.deepEqual(dockedBounds(fakeWindow({ bounds: { x: 1500, y: 0, width: 1000, height: 700 } }), screenWith([MAIN_AREA, second])),
    { width: 520, height: 720, x: 1440 + 1920 - 520 - 20, y: -180 });
});

test("taking the lock docks the window: dock state first, minimum size, animated setBounds, then floating on every Space", async () => {
  const { sidePanel, events } = panel();
  const window = fakeWindow();
  await sidePanel.lockChanged("s1", { window });
  assert.deepEqual(events, [{ window, docked: true, holder: "s1" }]);
  assert.deepEqual(window.calls, [
    ["setMinimumSize", 520, 400],
    ["setBounds", { width: 520, height: 720, x: 900, y: 45 }, true],
    ["setAlwaysOnTop", true, "floating"],
    ["setVisibleOnAllWorkspaces", true, { skipTransformProcessType: true, visibleOnFullScreen: true }],
  ]);
  assert.equal(sidePanel.window(), window);
  assert.equal(sidePanel.dockedWindow(), window);
});

test("releasing the lock takes focus and puts everything back: bounds, minimum size, not floating, dock state off", async () => {
  const { sidePanel, events, focused } = panel();
  const window = fakeWindow();
  await sidePanel.lockChanged("s1", { window });
  window.calls.length = 0; events.length = 0;
  await sidePanel.lockChanged(null, { window });
  assert.deepEqual(focused, [window]);
  assert.deepEqual(window.calls, [
    ["setBounds", { x: 100, y: 80, width: 1200, height: 800 }, true],
    ["setMinimumSize", 600, 400],
    ["setAlwaysOnTop", false],
    ["setVisibleOnAllWorkspaces", false, { skipTransformProcessType: true }],
  ]);
  assert.deepEqual(events, [{ window, docked: false, holder: null }]);
  assert.equal(sidePanel.window(), null);
  assert.equal(sidePanel.dockedWindow(), null);
});

test("a maximized window is un-maximized before its bounds are saved, and maximized again after the restore", async () => {
  const { sidePanel } = panel();
  const window = fakeWindow({ maximized: true });
  await sidePanel.lockChanged("s1", { window });
  assert.deepEqual(window.calls[0], ["unmaximize"]);
  await sidePanel.lockChanged(null, { window });
  // Restored to the un-maximized bounds, then maximized (LFa: bounds, min size, float off, dock state, maximize).
  const tail = window.calls.slice(-5);
  assert.deepEqual(tail[0], ["setBounds", { x: 0, y: 25, width: 1440, height: 875 }, true]);
  assert.deepEqual(tail.at(-1), ["maximize"]);
  assert.equal(window.state.maximized, true);
});

test("a full-screen window leaves full screen first (waits for leave-full-screen) and goes back into it after", async () => {
  const { sidePanel } = panel();
  const window = fakeWindow({ fullScreen: true });
  await sidePanel.lockChanged("s1", { window });
  assert.deepEqual(window.calls[0], ["setFullScreen", false]);
  assert.equal(window.state.alwaysOnTop, true);
  await sidePanel.lockChanged(null, { window });
  assert.deepEqual(window.calls.at(-1), ["setFullScreen", true]);
  assert.equal(window.state.fullScreen, true);
});

test("a release while leaving full screen wins: the window goes back to full screen and is never docked", async () => {
  const { sidePanel, events } = panel();
  const window = fakeWindow({ fullScreen: true });
  const docking = sidePanel.lockChanged("s1", { window });
  const releasing = sidePanel.lockChanged(null, { window });
  await Promise.all([docking, releasing]);
  assert.deepEqual(window.calls, [["setFullScreen", false], ["setFullScreen", true]]);
  // Nothing was saved yet, so the release only told the renderer (official LFa `if(!n){tR(!1)}`).
  assert.deepEqual(events.map((e) => e.docked), [true, false]);
  assert.equal(window.state.alwaysOnTop, false);
  assert.equal(sidePanel.window(), null);
});

test("a new holder while docked keeps the saved state and the docked window (no second save, no other window)", async () => {
  const { sidePanel, events } = panel();
  const window = fakeWindow(), other = fakeWindow({ bounds: { x: 0, y: 0, width: 900, height: 700 } });
  await sidePanel.lockChanged("s1", { window });
  await sidePanel.lockChanged("s2", { window: other });
  assert.deepEqual(other.calls, []);
  assert.deepEqual(events.map((e) => [e.window === window, e.docked, e.holder]), [[true, true, "s1"], [true, true, "s2"]]);
  // IFa again with the saved minimum size.
  assert.deepEqual(window.calls.slice(4, 6), [["setMinimumSize", 520, 400], ["setBounds", { width: 520, height: 720, x: 900, y: 45 }, true]]);
  await sidePanel.lockChanged(null, { window: other });
  assert.deepEqual(window.state.bounds, { x: 100, y: 80, width: 1200, height: 800 });
  assert.deepEqual(window.state.minSize, [600, 400]);
  assert.deepEqual(other.calls, []);
});

test("a hidden window is shown inactive to dock — unless a teach step hid it (xFa)", async () => {
  const one = panel();
  const hidden = fakeWindow({ visible: false });
  await one.sidePanel.lockChanged("s1", { window: hidden });
  assert.deepEqual(hidden.calls[0], ["showInactive"]);
  const teach = panel({ extra: { hiddenByTeach: (window) => window === taught } });
  const taught = fakeWindow({ visible: false });
  await teach.sidePanel.lockChanged("s1", { window: taught });
  assert.equal(taught.calls.some(([name]) => name === "showInactive"), false);
  assert.equal(taught.state.visible, false);
});

test("off macOS the move is a 220 ms ease-in-out-cubic of its own, and the float level is screen-saver", async () => {
  let clock = 0;
  const timers = [];
  const { sidePanel } = panel({ platform: "win32", extra: { now: () => clock, setTimer: (fn) => timers.push(fn) } });
  const window = fakeWindow({ bounds: { x: 0, y: 0, width: 1000, height: 800 } });
  const done = sidePanel.lockChanged("s1", { window });
  const run = async (ms) => { clock += ms; await Promise.resolve(); timers.shift()?.(); await Promise.resolve(); };
  await run(0);           // the first frame, s = 0
  await run(ANIMATE_MS / 2); // half way: s = .5 → eased .5
  await run(ANIMATE_MS);  // the end
  await done;
  const moves = window.calls.filter(([name]) => name === "setBounds").map(([, b]) => b);
  assert.deepEqual(moves[0], { x: 0, y: 0, width: 1000, height: 800 });
  assert.deepEqual(moves[1], { x: 450, y: 23, width: 760, height: 760 });
  assert.deepEqual(moves.at(-1), { x: 900, y: 45, width: 520, height: 720 });
  assert.ok(window.calls.every(([name, , animate]) => name !== "setBounds" || animate === undefined), "no animate flag off macOS");
  assert.deepEqual(window.calls.at(-1), ["setAlwaysOnTop", true, "screen-saver"]);
});

test("a window closed while docked drops its saved state; the next lock docks the new window from scratch", async () => {
  const { sidePanel } = panel();
  const window = fakeWindow();
  await sidePanel.lockChanged("s1", { window });
  window.state.destroyed = true;
  assert.equal(sidePanel.window(), null);
  const next = fakeWindow({ bounds: { x: 10, y: 30, width: 800, height: 600 } });
  await sidePanel.lockChanged("s2", { window: next });
  assert.equal(sidePanel.window(), next);
  await sidePanel.lockChanged(null, { window: next });
  assert.deepEqual(next.state.bounds, { x: 10, y: 30, width: 800, height: 600 });
});

test("main.cjs: the lock change docks the holder's window, the docked window leaves the hit test, the teach hide is respected", () => {
  const main = fs.readFileSync(new URL("../electron/main.cjs", import.meta.url), "utf8");
  const lockChange = main.slice(main.indexOf("function onComputerUseLockChange("), main.indexOf("let computerUseEscRegistered"));
  assert.match(lockChange, /computerUseSidePanel\?\.lockChanged\(holder, \{ window: computerUseDockWindow\(holder\) \}\)/);
  assert.match(main, /overlayWindowIds: \(\) => BrowserWindow\.getAllWindows\(\)\s*\.filter\(\(window\) => !window\.isDestroyed\(\) && \(computerUseOwnOverlay\(window\) \|\| window === computerUseSidePanel\?\.window\(\)\)\)/);
  assert.match(main, /dispatch: \(window, docked, holder\) => windowRegistry\.send\(window, \{ kind: "computer-use-dock-state", docked, holder \}\)/);
  assert.match(main, /hiddenByTeach: \(window\) => !!computerUseTeach\?\.hidMain\?\.\(window\)/);
  // Not one of the app's click-through overlays: the docked window keeps its theme background and is handed back after
  // each action (click-through.cjs restores it; only the glow and the pointer stay through for good).
  const overlay = /const computerUseOwnOverlay = \(window\) => (.*);/.exec(main)[1];
  assert.doesNotMatch(overlay, /SidePanel/);
});

test("teach mode reports the window its step hid (hidMain)", () => {
  const { createTeachMode } = require("../electron/computer-use/teach.cjs");
  const window = { hidden: false, isDestroyed: () => false, isVisible() { return !this.hidden; }, hide() { this.hidden = true; }, show() { this.hidden = false; } };
  const overlay = { setDisplay() {}, show: async () => {}, hide() {}, step() {}, fadeTooltip() {}, working() {}, isVisible: () => false };
  const teach = createTeachMode({ overlay, mainWindow: () => window, log: { info() {}, warn() {}, debug() {} } });
  assert.equal(teach.hidMain(window), false);
  teach.activate("s1");
  void teach.showStep("s1", { explanation: "x", nextPreview: "y" });
  assert.equal(teach.hidMain(window), true);
  assert.equal(teach.hidMain({}), false);
  teach.exit();
  teach.end("s1", "idle");
  assert.equal(teach.hidMain(window), false);
});

test("renderer: while docked the frame is a narrow viewport and the split view is constrained (official Bm / P4)", () => {
  const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /const narrowViewport = narrowMedia \|\| cuDocked;/);
  assert.match(main, /if \(e\.kind === "computer-use-dock-state"\) setCuDocked\(e\.docked === true\);/);
  const split = fs.readFileSync(new URL("../src/source-split-view.jsx", import.meta.url), "utf8");
  assert.match(split, /store\.setConstrained\(!!query\?\.matches \|\| docked\)/);
  assert.match(split, /event\?\.kind === "computer-use-dock-state"\) \{ docked = event\.docked === true; constrain\(\); \}/);
});
