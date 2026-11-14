// R3-files FT-05 (files-11 / files-v01): host glue for the 2.42304.0 right-click "path gone" check of the Files pane.
//
// Officially (cccc2cf0a NS — tree rows and filename results — and FS — content results) every row calls the gone hook
// c856385e2 V (`Kf(absPath, absPath)`) and opens its ContextMenu through c0cdf4a08 g (`Yf(beforeOpen)`): on the open
// request beforeOpen asks the desktop (LocalSessions isSessionPathGone, ≤150 ms) and the menu opens when that settles
// (c0cdf4a08 h), with "Open in" / "Show in Finder" / "Open in terminal" left out when the path is gone (c856385e2 xn).
// A tree row that is part of a multi-selection (c856385e2 it, `Ff(store, absPath, selectable)`) asks nothing. The
// session id comes from c9b8e0296's context, which the session pane provides (SourceFilePanel here).
//
// Everything below is the generated original (src/generated/files-changes, scripts/extract-files-changes.mjs) except
// openWhenChecked, which is the two-line branch of g/_ ("no promise: open now") for the local menus, whose open state
// is their own (SourceMenu.Popup) rather than a Base UI ContextMenu.Root.
import { openAfterCheck } from "./generated/files-changes/menu-open-gate.mjs";

export { CurrentSessionIdContext } from "./generated/files-changes/session-context.mjs";
export { useFileGone } from "./generated/files-changes/file-gone-check.mjs";
export { inMultiSelection } from "./generated/files-changes/file-selection.mjs";
export { openAfterCheck };

/** c0cdf4a08 g / _: open at once without a pending check, else when it settles (unless cancelled meanwhile). */
export function openWhenChecked(element, pending, open) {
  if (pending) openAfterCheck(element, pending, open);
  else open();
}
