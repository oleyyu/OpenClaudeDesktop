"use strict";
// R4f-popout F3 (layout-04): what a main window's renderer asks about its own window when a popped-out pane's
// 'Add to prompt' lands in its composer (src/popout-r4f-relay.mjs).
//
// 2.42304.0 renderer v1/c03935b01-CyJKQj4N.js zo, the tile store's composer relay `r`: with a draft in the way it first
// asks `te?.getOnScreen?.()` (te = shared-0 Wm = globalThis["claude.web"]?.WindowState), and off screen it calls
// `Le()` (shared-6 Ha = Jk: `wt?.show?.(),wt?.focus?.()`, wt = shared-0 Hm = WindowControl). The main process
// implements both for the main window's webContents (asar .vite/build/index.chunk-muI2IV6k.js):
//   WindowState  `getOnScreen:()=>!t.isDestroyed()&&t.isVisible()&&!t.isMinimized()`
//   WindowControl (bQi) `show(){!e||e.isDestroyed()||(GW(e),e.isMinimized()&&e.restore(),e.show())}`
//                       `focus(){!e||e.isDestroyed()||(GW(e),e.focus())}`
// GW only counts the window being presented (a timestamp and a counter for the app's own bookkeeping); it changes
// nothing on screen, so it is not carried over (D17).
// main.cjs window-on-screen / window-raise answer for the asking main window (windowRegistry.windowForSender).

const live = (window) => !!window && !(typeof window.isDestroyed === "function" && window.isDestroyed());

// WindowState.getOnScreen: visible and not minimized. A window that is gone is not on screen.
function windowOnScreen(window) {
  return live(window) && window.isVisible() === true && window.isMinimized() !== true;
}

// WindowControl.show() then WindowControl.focus() (Jk), as the official renderer calls them back to back.
function raiseWindow(window) {
  if (!live(window)) return false;
  if (window.isMinimized()) window.restore();
  window.show();
  if (!live(window)) return false;
  window.focus();
  return true;
}

module.exports = { windowOnScreen, raiseWindow };
