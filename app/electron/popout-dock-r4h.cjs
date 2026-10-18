"use strict";
// R4h-topbar K1 (Y1-R3-topbar-1, TT-13 layout-03): main.cjs `case "popout-dock"` extracted with injectable
// popout lookup, windowRegistry and showWindow so behavioral tests can verify handback, close/dock flags,
// popout window close, and main window restore/show/focus (2.42304.0 c5638815a Et onReattach + shared-6 Jk).
const { sideChatReattachWindow } = require("./side-chat-dock.cjs");
const { showWindow: defaultShowWindow } = require("./menu-bar.cjs");

function dockPopoutWindow({
  sender,
  senderKind,
  params = {},
  popoutForSender,
  popouts,
  popoutKey = (sessionId, pane) => `${sessionId}:${pane}`,
  windowRegistry,
  showWindow = defaultShowWindow,
} = {}) {
  const own = typeof popoutForSender === "function" ? popoutForSender(sender) : null;
  const entry = own ?? (senderKind === "primary" && popouts ? popouts.get(popoutKey(params?.sessionId, params?.pane)) : null);
  if (!entry) throw new Error("Unknown pane window.");
  // The side chat window hands its conversation back, and its X closes the side chat rather than docking it.
  if (own && params?.data && typeof params.data === "object" && JSON.stringify(params.data).length <= 2_000_000) {
    entry.handback = params.data;
  }
  if (own && params?.close === true) entry.closed = true;
  else entry.docked = true;
  entry.window.close();
  // R3-topbar TT-13 (c5638815a Et onReattach `a(re(e)),D()`, shared-6 Jk show + focus): the side chat window's
  // own Open in main window also brings the window it docks into forward, restoring it when minimized.
  const target = sideChatReattachWindow({
    entry,
    own: !!own,
    close: entry.closed === true,
    windows: windowRegistry?.mainWindows?.() ?? [],
    fallback: windowRegistry?.lastFocusedFull ?? null,
  });
  showWindow?.(target);
  return true;
}

module.exports = { dockPopoutWindow };
