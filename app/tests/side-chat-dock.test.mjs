import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// R3-topbar TT-13 / R4h-topbar K1 (layout-03): the side chat window's Open in main window docks the side chat and brings
// the main window forward, restoring it when minimized (2.42304.0 c5638815a Et `onReattach: a(re(e)), D()`, shared-6 Jk
// `wt?.show?.(), wt?.focus?.()`). Its X, the window's own close button and a main window docking it by key do not.
const require = createRequire(import.meta.url);
const { sideChatReattachWindow } = require("../electron/side-chat-dock.cjs");
const { dockPopoutWindow } = require("../electron/popout-dock-r4h.cjs");
const { showWindow } = require("../electron/menu-bar.cjs");
const ROOT = path.resolve(import.meta.dirname, "..");
const reference = path.resolve(ROOT, "../reference/installed-2.42304.0-20261017");

function fakeWindow(id, { minimized = false, visible = true, destroyed = false } = {}) {
  const calls = [];
  return {
    id,
    calls,
    isDestroyed: () => destroyed,
    isMinimized: () => minimized,
    isVisible: () => visible,
    restore() { calls.push("restore"); minimized = false; },
    focus() { calls.push("focus"); },
    show() { calls.push("show"); visible = true; },
    close() { calls.push("close"); destroyed = true; },
  };
}

test("sideChatReattachWindow: the side chat's own dock targets its owner; close, other panes and other senders do not", () => {
  const owner = fakeWindow(1), other = fakeWindow(2), sideChat = fakeWindow(3);
  const entry = { window: sideChat, pane: "side-chat", ownerId: 1 };
  const windows = [other, owner, sideChat];
  const fallback = () => other;
  assert.equal(sideChatReattachWindow({ entry, own: true, close: false, windows, fallback }), owner);
  assert.equal(sideChatReattachWindow({ entry, own: true, close: true, windows, fallback }), null, "its X closes the side chat");
  assert.equal(sideChatReattachWindow({ entry, own: false, close: false, windows, fallback }), null, "a main window docking it by key");
  for (const pane of ["tasks", "terminal", "files", "changes", "plan"])
    assert.equal(sideChatReattachWindow({ entry: { ...entry, pane }, own: true, windows, fallback }), null, pane);
  assert.equal(sideChatReattachWindow(), null);
});

test("sideChatReattachWindow: an owner that has closed since falls back to the full window focused last, never the side chat itself", () => {
  const gone = fakeWindow(1, { destroyed: true }), other = fakeWindow(2), sideChat = fakeWindow(3);
  const entry = { window: sideChat, pane: "side-chat", ownerId: 1 };
  assert.equal(sideChatReattachWindow({ entry, own: true, windows: [gone, other, sideChat], fallback: () => other }), other);
  assert.equal(sideChatReattachWindow({ entry, own: true, windows: [other, sideChat], fallback: () => other }), other, "owner unregistered");
  assert.equal(sideChatReattachWindow({ entry: { ...entry, ownerId: null }, own: true, windows: [other], fallback: () => other }), other);
  assert.equal(sideChatReattachWindow({ entry, own: true, windows: [sideChat], fallback: () => sideChat }), null);
  assert.equal(sideChatReattachWindow({ entry, own: true, windows: [], fallback: () => null }), null);
  assert.equal(sideChatReattachWindow({ entry, own: true, windows: [], fallback: () => fakeWindow(9, { destroyed: true }) }), null);
});

test("showWindow (menu-bar.cjs) is bQi show + focus: a minimized window is restored and focused, a hidden one shown", () => {
  const minimized = fakeWindow(1, { minimized: true });
  showWindow(minimized); assert.deepEqual(minimized.calls, ["restore", "focus"]);
  const visible = fakeWindow(2);
  showWindow(visible); assert.deepEqual(visible.calls, ["focus"]);
  const hidden = fakeWindow(3, { visible: false });
  showWindow(hidden); assert.deepEqual(hidden.calls, ["show"]);
  showWindow(null); showWindow(fakeWindow(4, { destroyed: true }));
});

test("dockPopoutWindow: side-chat Open in main window stores handback, closes popout and restores/focuses owner window", () => {
  const owner = fakeWindow(1, { minimized: true }), other = fakeWindow(2), popWin = fakeWindow(3);
  const entry = { window: popWin, pane: "side-chat", ownerId: 1 };
  const popouts = new Map([["s1\u0000side-chat", entry]]);
  const res = dockPopoutWindow({
    sender: "popout-sender",
    senderKind: "popout",
    params: { sessionId: "s1", pane: "side-chat", data: { messages: [{ id: "m1" }] } },
    popoutForSender: (s) => (s === "popout-sender" ? entry : null),
    popouts,
    popoutKey: (sid, pane) => `${sid}\u0000${pane}`,
    windowRegistry: { mainWindows: () => [other, owner, popWin], lastFocusedFull: () => other },
    showWindow,
  });
  assert.equal(res, true);
  assert.equal(entry.docked, true);
  assert.equal(entry.closed, undefined);
  assert.deepEqual(entry.handback, { messages: [{ id: "m1" }] });
  assert.deepEqual(popWin.calls, ["close"], "popout window closed");
  assert.deepEqual(owner.calls, ["restore", "focus"], "minimized owner window restored and focused");
  assert.deepEqual(other.calls, []);
});

test("dockPopoutWindow: side-chat X (close: true) and main-window dock by key close the popout without raising a main window", () => {
  // 1. Side-chat X / ⌘W passes close: true -> sets entry.closed = true, does not raise owner.
  const owner = fakeWindow(1, { minimized: true }), popWin1 = fakeWindow(3);
  const entry1 = { window: popWin1, pane: "side-chat", ownerId: 1 };
  dockPopoutWindow({
    sender: "popout-1",
    senderKind: "popout",
    params: { sessionId: "s1", pane: "side-chat", data: { draft: "hi" }, close: true },
    popoutForSender: () => entry1,
    popouts: new Map(),
    popoutKey: (sid, pane) => `${sid}\u0000${pane}`,
    windowRegistry: { mainWindows: () => [owner, popWin1], lastFocusedFull: () => owner },
    showWindow,
  });
  assert.equal(entry1.closed, true);
  assert.equal(entry1.docked, undefined);
  assert.deepEqual(entry1.handback, { draft: "hi" });
  assert.deepEqual(popWin1.calls, ["close"]);
  assert.deepEqual(owner.calls, [], "X button does not restore or focus the main window");

  // 2. Primary window docking by key -> sets entry.docked = true, does not raise owner.
  const popWin2 = fakeWindow(4);
  const entry2 = { window: popWin2, pane: "side-chat", ownerId: 1 };
  const popouts = new Map([["s1\u0000side-chat", entry2]]);
  dockPopoutWindow({
    sender: "main-sender",
    senderKind: "primary",
    params: { sessionId: "s1", pane: "side-chat" },
    popoutForSender: () => null,
    popouts,
    popoutKey: (sid, pane) => `${sid}\u0000${pane}`,
    windowRegistry: { mainWindows: () => [owner, popWin2], lastFocusedFull: () => owner },
    showWindow,
  });
  assert.equal(entry2.docked, true);
  assert.deepEqual(popWin2.calls, ["close"]);
  assert.deepEqual(owner.calls, [], "main window docking by key does not call showWindow");

  // 3. Unknown pane window throws.
  assert.throws(
    () =>
      dockPopoutWindow({
        sender: "stranger",
        senderKind: "popout",
        params: { sessionId: "none", pane: "side-chat" },
        popoutForSender: () => null,
        popouts: new Map(),
        popoutKey: (sid, pane) => `${sid}\u0000${pane}`,
        windowRegistry: { mainWindows: () => [], lastFocusedFull: () => null },
        showWindow,
      }),
    /Unknown pane window\./,
  );
});

test("official: Et reattaches with closePopout then Jk, and WindowControl show restores a minimized main window", () => {
  const v1 = path.join(reference, "ion-dist/assets/v1");
  const et = fs.readFileSync(path.join(v1, "c5638815a-D1NXo6h5.js"), "utf8");
  assert.ok(et.includes("c=s(()=>{a(re(e)),D()},[a,e])"));
  assert.ok(et.includes("n(k,{sessionRef:l,onReattach:c})"));
  assert.ok(et.includes('import{Ha as D,Rf as O}from"./shared-6-Cby4X-ms.js"'));
  const shared6 = fs.readFileSync(path.join(v1, "shared-6-Cby4X-ms.js"), "utf8");
  assert.ok(shared6.includes("function Jk(){wt?.show?.(),wt?.focus?.()}"));
  assert.ok(shared6.includes("Jk as Ha,"));
  assert.ok(shared6.includes("Hm as wt,"));
  const shared0 = fs.readFileSync(path.join(v1, "shared-0-ByI5P0CP.js"), "utf8");
  assert.ok(shared0.includes('Ub=globalThis["claude.web"]?.WindowControl'));
  assert.ok(shared0.includes("Ub as Hm,"));
  const host = fs.readFileSync(path.join(reference, "asar/.vite/build/index.chunk-muI2IV6k.js"), "utf8");
  assert.ok(host.includes("show(){!e||e.isDestroyed()||(GW(e),e.isMinimized()&&e.restore(),e.show())},focus(){!e||e.isDestroyed()||(GW(e),e.focus())}"));
  // The official popout is a child window of the main view (its renderer draws it), so WindowControl is the main window's.
  assert.ok(host.includes("let n=e.webContents.opener;if(n!==y.webContents.mainFrame)"));
});
