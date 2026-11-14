"use strict";
// R3-topbar TT-13 (layout-03): the side chat window's "Open in main window" brings the main window forward.
// 2.42304.0 c5638815a-D1NXo6h5.js Et (PopoutSideChatContent): `onReattach: c = s(()=>{a(re(e)),D()},[a,e])`, i.e.
// closePopout(side chat key) and then D = shared-6 Jk `function Jk(){wt?.show?.(),wt?.focus?.()}`, where wt is
// shared-0 Hm = Ub = globalThis["claude.web"]?.WindowControl. The main process implements WindowControl for the main
// window's webContents (asar index.chunk-muI2IV6k.js bQi): `show(){…GW(e),e.isMinimized()&&e.restore(),e.show()}`
// and `focus(){…GW(e),e.focus()}`; the official popout is rendered by that window's renderer, so it is always the
// window that popped the side chat out. Only the side chat window's own button calls it: its X (onClose), the window's
// close button and a main window docking the pane by key do not.
// Locally the side chat window runs its own App (B27 pane window), so main.cjs popout-dock does it: the owner is the
// main window that popped it out (entry.ownerId), where popout-docked hands the conversation back; if that window has
// closed since, the full window focused last (where a session no window shows would open). menu-bar.cjs showWindow
// restores a minimized window and focuses it, shows a hidden one, and focuses a visible one.

const live = (window) => !!window && !(typeof window.isDestroyed === "function" && window.isDestroyed());

// entry: the popouts map entry ({window, pane, ownerId}); own: the request came from that pane window itself;
// windows: the live registered windows (windowRegistry.mainWindows()); fallback: () => the full window focused last.
function sideChatReattachWindow({ entry, own = false, close = false, windows = [], fallback = null } = {}) {
  if (!own || close || entry?.pane !== "side-chat") return null;
  const usable = (window) => live(window) && window !== entry.window;
  const owner = entry.ownerId == null ? null : windows.find((window) => usable(window) && window.id === entry.ownerId) ?? null;
  if (owner) return owner;
  const other = typeof fallback === "function" ? fallback() : null;
  return usable(other) ? other : null;
}

module.exports = { sideChatReattachWindow };
