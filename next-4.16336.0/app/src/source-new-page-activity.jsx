import { useSyncExternalStore } from "react";
import { ownerKeyOf, terminalStore } from "./terminal-store.mjs";
import { usePreviewSnapshot } from "./source-preview-pane.jsx";

// W12b-FTS-4: the host side of 3.6556.2 shared-21 l5's `K = av(f5)` (shared-20 gE `_s(e=>({active:!1,setActive}))`),
// which cf52a4cc1 I writes while the Code layout is mounted: `a = n || i` with n = D(t) (c4363b976 M,
// "epitaxyTerminalCommandRunning" on the New session page's landing shell) and i = P(t) (the landing browser's
// `tabs.some(F)`, F = !c155b6b71 b). OpenClaude's New session page is per folder: its terminal and preview owner is
// main.jsx's `ownerKeyOf(null, cwd)` (home:<folder>), the folder the sidebar already receives as fallbackCwd.

// c155b6b71 b: `!e.origin || e.origin === "about:blank" || e.origin.startsWith("data:")` - a blank tab.
export function blankBrowserTab(url) {
  return !url || url === "about:blank" || String(url).startsWith("data:");
}

// cf52a4cc1 I: `a = n || i`.
export function newPageActive({ terminalBusy = false, tabs } = {}) {
  return !!terminalBusy || (Array.isArray(tabs) && tabs.some((tab) => !blankBrowserTab(tab?.url)));
}

/** Whether the New session page of `cwd` has a busy terminal or a browser page open; read only while `watching`
 * (l5's q needs it only for the Code New row while another page is shown). */
export function useNewPageActivity(cwd, watching) {
  const owner = ownerKeyOf(null, cwd || null);
  const store = terminalStore();
  useSyncExternalStore(store.subscribe, store.version, () => 0);
  const snapshot = usePreviewSnapshot(watching && owner ? owner : null);
  return !!watching && !!owner && newPageActive({ terminalBusy: store.busy(owner), tabs: snapshot?.tabs });
}
