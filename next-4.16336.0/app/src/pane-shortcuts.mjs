// shared-21-D098Wd--.js:14145-14187 aR (desktop isClaudeApp rows): toggleDiff
// "cmd+shift+d" code KeyD, toggleBrowser "cmd+shift+f" code KeyF (the Files pane,
// panes-toggle-current.js:3236-3253 F("toggleBrowser")). Matched by e.code like the
// local ⌘B / ⌘[ handlers; "cmd" is Meta on this macOS-only build. A repeat or an
// IME composition never toggles; the caller still preventDefaults a held repeat.
// toggleDiffFileList "cmd+shift+y" KeyY (sidebar-rows.js:14247-14253): main.jsx
// routes 'file-list' with fileListRoute below.
// togglePreview "cmd+shift+p" (shared-21-D098Wd--.js:14146-14207, the app's Preview mode).
const PANE_CODES = { KeyD: "changes", KeyF: "files", KeyY: "file-list", KeyP: "preview" };
export function paneShortcutKind(event) {
  if (!event || !event.metaKey || !event.shiftKey || event.ctrlKey || event.altKey || event.isComposing) return null;
  return PANE_CODES[event.code] ?? null;
}
export function paneShortcut(event) {
  const kind = paneShortcutKind(event);
  return kind && !event.repeat ? kind : null;
}
// Where ⇧⌘Y goes (c936fcd42 ei/ti/$r; code-workspace.js:2230-2241 z/de;
// panes-tile-current.js:3651-3660 dh uf and :6650-6655 the Files uf):
// - "files": the Files pane is open (with a tree to toggle) and focused, or the
//   Changes pane is closed; its tree toggles (ei, go "shortcut").
// - "changes": the Changes pane is open; its file list toggles, but only while
//   it can show one (Qr: the column fits and the body is not empty).
// - "open-changes": the Changes pane is closed and no Files tree takes the key;
//   the Changes pane opens with the list shown ($r: open, then set diffShowTree
//   unless it is already on).
// null: nothing to do (the caller still swallows the key, as before).
export function fileListRoute({ filesOpen = false, changesOpen = false, focused = null, changesCanShow = false } = {}) {
  if (filesOpen && (focused === "files" || !changesOpen)) return "files";
  if (!changesOpen) return "open-changes";
  return changesCanShow ? "changes" : null;
}
