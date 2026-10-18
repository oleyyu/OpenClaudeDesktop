// The window's terminal registry (2.42304.0 cf718f694 oe, filled by c6bf19e8f Ee), which the tab menu's Clear terminal
// (cccc2cf0a Zy → Md = has, jd = clearSelection + clear) reads. Here:
//   has(id)  — this window keeps a live xterm view for the terminal (terminal-store views) and it did not fail to
//              start (c6bf19e8f Rr sets startFailed; locally a Restart shell that failed, until the tab runs again);
//   clear(id) — the pane that shows the terminal clears its view and the output terminal-service kept for it.
// Only has/clear/clearSelection are registered: nothing local reads the registry's getSelection/paste/selectAll.
import { registerTerminalRegistry } from "./generated/code-current/terminal-registry.mjs";
import { terminalStore } from "./terminal-store.mjs";

export const startFailedTerminals = new Set();
/** Mounted panes: { owns(id), clear(id) }. */
export const terminalPanes = new Set();

registerTerminalRegistry({
  has: (id) => terminalStore().hasView(id) && !startFailedTerminals.has(id),
  clearSelection: () => {}, // the pane's clear() clears the selection with the screen (view.clear)
  clear: (id) => { for (const pane of terminalPanes) if (pane.owns(id)) { pane.clear(id); return; } },
});
