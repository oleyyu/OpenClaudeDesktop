// Host of the titlebar controls sliced from Claude Desktop 4.16336.0 (scripts/extract-titlebar-v4.mjs, generated/titlebar):
// SidebarHistoryNav (shared-21 _O), HistoryNavButtons (shared-20 hv / mv / uv), TitlebarPaneToggle (cc43287c9 SY), the
// View options glyph (cc43287c9 UJ) and the pane icon table (cc44b66a7 M). Every declaration the slice stops at is a named
// boundary of the generator, dispatched through the generated src/titlebar-adapter.mjs to the table below
// (installTitlebarHost). A capability left out of the table throws where the official code reaches it.
//
// The official history store is the desktop bridge globalThis["claude.web"].BrowserNavigation: shared-1 jm (Zn / In) reads
// `navigationStateStore.getState()` (a promise of { canGoBack, canGoForward, listsPages? }) and subscribes with
// `onStateChange(cb)` (returns the unsubscribe); shared-20 dv / fv call `goBack()` / `goForward()`, pv `historyPages()` /
// `goToHistoryPage(page)` (the press-and-hold page list). The host has no claude.web global: ONE module-level object here
// answers both module-level reads (shared-1 Am and shared-0 gO), fed by main.jsx's own history (history / historyAt /
// travel) through useHostNavigation, so there is a single navigation state per window. The host keeps no page list:
// listsPages is never set and historyPages / goToHistoryPage are absent (the official no-list path; HistoryPagesMenu and its
// lazy entry are deliberately not provided: unreachable).
import { useLayoutEffect } from "react";
import { installTitlebarHost } from "./titlebar-adapter.mjs";
import { useStartIntl } from "./source-code-start-adapters.jsx";
// surfaces wave 3 (titlebar frame): shared-120 qe is the titlebar-frame slice's (generated/titlebar-frame panels-scope.mjs, the
// official qe over cds-core Ke that the frame's OS provides), not the 3.6556.2 Context no host ever provided.
import { useTitlebarPanelsScope } from "./generated/titlebar-frame/panels-scope.mjs";
export { SidebarHistoryNav } from "./generated/titlebar/sidebar-history-nav.mjs";
export { HistoryNavButtons } from "./generated/titlebar/history-nav.mjs";
export { TitlebarPaneToggle, titlebarOverflowIcon } from "./generated/titlebar/pane-toggle.mjs";
export { PANE_ICONS } from "./generated/titlebar/pane-icons.mjs";

// ---- BrowserNavigation (the official history store) ---------------------------------------------------------------------
let navigationState = Object.freeze({ canGoBack: false, canGoForward: false });
let travelTo = null;
const stateListeners = new Set();
const navigationStateStore = Object.freeze({
  getState: () => Promise.resolve(navigationState),
  onStateChange: (callback) => (stateListeners.add(callback), () => { stateListeners.delete(callback); }),
});
export const hostBrowserNavigation = Object.freeze({
  navigationStateStore,
  goBack: () => travelTo?.(-1),
  goForward: () => travelTo?.(1),
});
// The state main.jsx's history gives (travel() bounds: back while historyAt > 0, forward while historyAt < length - 1).
export function hostNavigationState(historyAt = 0, historyLength = 1) {
  return { canGoBack: historyAt > 0, canGoForward: historyAt < historyLength - 1 };
}
// Publishes a new state to the subscribers (jm's setState) when it changed; the travel function is the latest render's.
export function publishHostNavigation({ historyAt = 0, historyLength = 1, travel = null } = {}) {
  travelTo = travel;
  const next = hostNavigationState(historyAt, historyLength);
  if (next.canGoBack === navigationState.canGoBack && next.canGoForward === navigationState.canGoForward) return;
  navigationState = Object.freeze(next);
  for (const listener of [...stateListeners]) listener(navigationState);
}
// main.jsx: `useHostNavigation(historyAt, history.length, travel, side === 0)` in every App, every render. Only the window's
// primary side publishes (it owns the frame whose sidebar / collapsed chrome draw the buttons; a split view's secondary App
// keeps its own history, which the official window-level store has no counterpart for).
export function useHostNavigation(historyAt, historyLength, travel, primary = true) {
  useLayoutEffect(() => { if (primary) publishHostNavigation({ historyAt, historyLength, travel }); });
}

// ---- the capability table (keys: the boundary names of scripts/extract-titlebar-v4.mjs) -----------------------------------
const noEffect = () => undefined;
export const HOST_ANSWERS = {
  BrowserNavigationState: ["host", hostBrowserNavigation], // shared-1 Am: navigationStateStore
  BrowserNavigation: ["host", hostBrowserNavigation], // shared-0 gO: goBack / goForward (historyPages / goToHistoryPage absent)
  notePaneToggleClick: ["gap", noEffect], // c73f45bc3 ry: writes the 4.16336.0 fold's ny store; the host fold is not that fold
  useTitlebarPanelsScope: ["host", useTitlebarPanelsScope], // shared-120 qe: the sliced qe (titlebar-frame), true inside the frame
  useIntl: ["host", () => useStartIntl()],
};
installTitlebarHost(Object.fromEntries(Object.entries(HOST_ANSWERS).map(([name, [, answer]]) => [name, answer])));
