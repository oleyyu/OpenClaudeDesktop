// Failed non-composer actions (session menus, sidebar preferences, reveal, open link) report through the
// toast manager, as the original does: `addError(formatMessage({defaultMessage: "Couldn’t …"}), {error})`
// (Ro().addError, a danger toast in the bottom-right stack), with the raw error kept for logging only.
// Copy is the 2.2553.1 catalog (ion-dist/i18n/en-US.json), chosen per call site:
// - rename      7ck8ciIf0O  sidebar-groups.js:15393-15402 (session row rename)
// - archive     NAJOCQ+6Ax  c6b8adeaf Code session archive mutation onError ("Failed to archive")
// - unarchive   dqliJPGcDN  c6b8adeaf Code session unarchive onError ("Failed to restore session")
// - delete      x1taMCWebd  c6b8adeaf Code session delete onError
// - fork        nGtjMsYWZD  caec4a2d4 fork mutation onError
// - pin/unpin   L7j7nu8EU0 / v5/fMMduyr  shared-16 Qg pinFailed/unpinFailed
// - mark-unread kBqUwOwe7e  shared-16 Th; Oh("read") raises nothing for a failed read, so mark-read is silent
// - reveal      X0Ntx9olgx  c856385e2 revealRemotePath failed (folder in the file manager)
// - reveal-file 8Kiu8ZnCtS  c856385e2 showSessionFileInFolder refused (file in its folder)
// - open-link   XE6tFsxNtw  shared-5 openPage_failed (the catalog's only plain page-open failure)
// - save-preference / dismiss-recent  7a1I3aH5Fd "Couldn’t save that change. Try again." (cf400e6a4:6611);
//   the source keeps both (sidebar view prefs, ccd-dismissed-recent-folders-v1) in local storage, so no
//   original failure copy exists for them.
import { t } from "../electron/i18n/index.mjs";
export const ACTION_ERROR_COPY = Object.freeze({
  rename: "Couldn’t rename this task. Try again.",
  archive: "Couldn’t archive this session. Try again.",
  unarchive: "Couldn’t unarchive this session. Try again.",
  delete: "Couldn’t delete this session. Try again.",
  fork: "Couldn’t fork this session.",
  pin: "Couldn’t pin this task. Try again.",
  unpin: "Couldn’t unpin this task. Try again.",
  "mark-unread": "Couldn’t mark as unread. Try again.",
  "mark-read": null,
  reveal: "Couldn’t show this folder in the file manager.",
  "reveal-file": "Couldn’t show this file in its folder.",
  "open-link": "Couldn’t open the page",
  "save-preference": "Couldn’t save that change. Try again.",
  "dismiss-recent": "Couldn’t save that change. Try again.",
});
// Any other session action (move to group, pinned order, open in Terminal) falls back to the generic copy.
export const ACTION_ERROR_FALLBACK = ACTION_ERROR_COPY["save-preference"];

// SourceSidebarSessionMenu / titlebar ⋮ actions (main.jsx sessionAction) → copy kind.
const SESSION_ACTION_KINDS = { "reveal-folder": "reveal" };
export function sessionActionErrorKind(action) {
  return SESSION_ACTION_KINDS[action] ?? (Object.hasOwn(ACTION_ERROR_COPY, action) ? action : "other");
}

/** The catalog message for a failed action kind; null when the original stays silent. */
export function actionErrorMessage(kind) {
  return t(Object.hasOwn(ACTION_ERROR_COPY, kind) ? ACTION_ERROR_COPY[kind] : ACTION_ERROR_FALLBACK);
}

// Electron's ipcRenderer.invoke rejection prefix (the same transport wrapper source-usage.jsx omits).
const IPC_PREFIX = /^Error invoking remote method '[^']+': (?:Error: )?/gm;
/** The raw reason without the IPC transport wrapper; clean messages pass through unchanged. */
export function cleanErrorReason(reason) {
  const text = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : reason?.message ?? String(reason ?? "");
  return text.replace(IPC_PREFIX, "");
}

/**
 * addError: one danger toast per kind (a repeat failure replaces it in place through the store's key) and
 * the cleaned reason on the console. Returns the message shown, or null for a silent kind.
 */
export function reportActionError(toasts, kind, reason, { warn = console.warn } = {}) {
  const message = actionErrorMessage(kind);
  warn?.(`Action failed (${kind}):`, cleanErrorReason(reason));
  if (message) toasts?.add(message, { variant: "danger", key: `action-error:${kind}` });
  return message;
}
