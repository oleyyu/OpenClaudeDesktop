// Running command / shell title per terminal tab (2.42304.0 cf718f694 be/me/J/ge/G, read by cccc2cf0a Vy). The
// tracking itself is the original code (generated/code-current/terminal-titles.mjs, with the shared-78 title sanitizer
// in terminal-title-text.mjs); this module only gives the pane a way to read it. Keyed by terminal id (the reference's
// ptyKey): a tab's view installs it when it is created. The store (cf718f694 G) is one per window, as in the source.
import {
  installTerminalTitles, terminalTitleValue, forgetTerminalTitle, terminalTitlesEnabled, terminalTitleStore,
} from "./generated/code-current/terminal-titles.mjs";
import { terminalDescription } from "./generated/code-current/terminal-description.mjs";

export function createTerminalTitleTracker() {
  return {
    /** Start tracking an xterm's OSC 0/2 title and OSC 133 C/D command marks for terminal `id` (be). */
    install: (term, id) => installTerminalTitles(term, id),
    /** The terminal closed (or its view was dropped): no title, no pending timer (J). */
    forget: (id) => forgetTerminalTitle(id),
    subscribe: (listener) => terminalTitleStore.subscribe(listener),
    snapshot: () => terminalTitleStore.getState(),
    /** The running command, else the shell's reported title (me), for a tab without its own name (Vy: name === void 0). */
    value(state, tab) {
      if (!tab?.id || (typeof tab.title === "string" && tab.title) || !terminalTitlesEnabled()) return undefined;
      return terminalTitleValue(state ?? terminalTitleStore.getState(), tab.id);
    },
    /** Vy's tab description: the last path segment of a path-like title, else the text itself (he). */
    description: (value) => (value ? terminalDescription(value) : undefined),
  };
}

let shared = null;
export function terminalTitles() {
  if (!shared) shared = createTerminalTitleTracker();
  return shared;
}
