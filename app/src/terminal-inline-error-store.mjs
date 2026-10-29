// The inline-run error a terminal tab hands the code block "Run in terminal" card (w10-trans-terminal-inline-error,
// L126). 3.6556.2 c6bf19e8f Ei: when a tab's shell PTY fails to start it calls
//   `R.getState().setInlineError(k, li(r))` (and `li(ai)` when startShellPty throws)
// before covering the pane (`t || P(r)`). R is ca41b3815 X, the inline-run store, whose
//   `setInlineError: (e, t) => { (Kt(e), Ct(e, t)); }`
// only touches the tracked run typed into that terminal (`n.ptyKey !== e || n.settled` is a no-op): a run that already
// printed something keeps its output and is marked `shellExited`, any other one settles with `error: t` and
// `endedBy: dispatched ? "shell-exit" : "cancel"`. Its readers are the code block cards (c19e90103 Bh, c368fdb57 Pp:
// `t.inlineRun?.id === e ? t.inlineRun.error : null`), never the terminal tab or pane.
//
// Here X is terminal-store.mjs: the tracked run is its inlineRun() and Ct is its setInlineError, so the error lands in
// the same run the code block card reads (source-code-block.jsx useBlockRun: `mine.error`). This module is the pane's
// handle on it (one store, as in the official build); the text is li, generated/code-current/terminal-errors.mjs
// terminalErrorText. Local only.
import { terminalStore } from "./terminal-store.mjs";

export function createTerminalInlineErrorStore(store) {
  return {
    /** ca41b3815 setInlineError(ptyKey, text): the tracked run after the change, or null when there was none. */
    setInlineError: (ptyKey, text) => store.setInlineError(ptyKey, text),
    /** c19e90103 Bh / c368fdb57 Pp: the error of run `id` while it is the tracked one, else null. */
    inlineError(id) {
      const run = store.inlineRun();
      return run?.id === id ? run.error ?? null : null;
    },
    subscribe: (listener) => store.subscribeInline(listener),
  };
}

// One per window, over the window's terminal store; tests build their own.
let shared = null;
export function terminalInlineErrors() {
  if (!shared) shared = createTerminalInlineErrorStore(terminalStore());
  return shared;
}
