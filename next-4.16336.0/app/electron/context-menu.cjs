// Native context menu, kept pure so it is unit-testable. Ported from the
// Electron builder _W (reference/current-2.2553.1/readable/electron-context-menu-excerpt.js:1),
// which the original attaches to every webContents "context-menu" event.
// Groups in _W order: dictionary suggestions; Learn Spelling; Look Up for a
// selection; Open Link in Default Browser (http/https without credentials)
// and Copy Link Address; Copy Image (+ Copy Image Address with a srcURL);
// Undo/Redo in an editable field that can undo or redo; Cut/Copy/Paste in an
// editable field, otherwise Copy; Select All; Inspect Element only when dev
// tools are allowed. `s()` puts a separator before a group only when the
// previous groups added items. Items that need the webContents carry an
// `action` (and `value`) that main.cjs binds; edit items keep _W's roles.
// Renderer widgets that preventDefault the DOM contextmenu event keep their
// own menus: Chromium never emits "context-menu" for a cancelled event.
// LABELS are the English sources; contextMenuTemplate translates them per menu.
const { t } = require("./i18n/index.mjs");
const LABELS = Object.freeze({
  learn: "Learn Spelling", lookUp: "Look Up", openLink: "Open Link in Default Browser", copyLink: "Copy Link Address",
  copyImage: "Copy Image", copyImageAddress: "Copy Image Address", undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy",
  paste: "Paste", selectAll: "Select All", inspect: "Inspect Element",
});
// _W's link check: a parsable http(s) URL with no username or password.
function externalLink(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.username === "" && parsed.password === "";
}
function contextMenuTemplate(params, { allowDevTools = false } = {}) {
  // Electron always reports editFlags; without them there is no context to build from.
  if (!params || typeof params !== "object" || !params.editFlags || typeof params.editFlags !== "object") return [];
  const items = [], flags = params.editFlags;
  let pending = false;
  const separate = () => { if (pending) { items.push({ type: "separator" }); pending = false; } };
  for (const word of Array.isArray(params.dictionarySuggestions) ? params.dictionarySuggestions : []) {
    if (typeof word !== "string" || !word) continue;
    items.push({ label: word, action: "replace", value: word });
    pending = true;
  }
  if (params.misspelledWord) {
    separate();
    items.push({ label: t(LABELS.learn), action: "learn-spelling", value: params.misspelledWord });
    pending = true;
  }
  if (params.selectionText) {
    separate();
    items.push({ label: t(LABELS.lookUp), action: "look-up" });
    pending = true;
  }
  if (params.linkURL) {
    separate();
    if (externalLink(params.linkURL)) items.push({ label: t(LABELS.openLink), action: "open-link", value: params.linkURL });
    items.push({ label: t(LABELS.copyLink), action: "copy-text", value: params.linkURL });
    pending = true;
  }
  if (params.hasImageContents) {
    separate();
    items.push({ label: t(LABELS.copyImage), action: "copy-image" });
    if (params.srcURL) items.push({ label: t(LABELS.copyImageAddress), action: "copy-text", value: params.srcURL });
    pending = true;
  }
  if (params.isEditable && (flags.canUndo || flags.canRedo)) {
    separate();
    items.push({ label: t(LABELS.undo), accelerator: "CmdOrCtrl+Z", role: "undo", enabled: !!flags.canUndo });
    items.push({ label: t(LABELS.redo), accelerator: "CmdOrCtrl+Shift+Z", role: "redo", enabled: !!flags.canRedo });
    pending = true;
  }
  separate();
  if (params.isEditable) {
    items.push({ label: t(LABELS.cut), accelerator: "CmdOrCtrl+X", role: "cut", enabled: !!flags.canCut });
    items.push({ label: t(LABELS.copy), accelerator: "CmdOrCtrl+C", role: "copy", enabled: !!flags.canCopy });
    items.push({ label: t(LABELS.paste), accelerator: "CmdOrCtrl+V", role: "paste", enabled: !!flags.canPaste });
  } else items.push({ label: t(LABELS.copy), accelerator: "CmdOrCtrl+C", role: "copy", enabled: !!flags.canCopy });
  pending = true;
  if (flags.canSelectAll) {
    separate();
    items.push({ label: t(LABELS.selectAll), accelerator: "CmdOrCtrl+A", role: "selectAll" });
    pending = true;
  }
  if (allowDevTools) {
    separate();
    items.push({ label: t(LABELS.inspect), action: "inspect" });
  }
  return items;
}
module.exports = { contextMenuTemplate, externalLink, CONTEXT_MENU_LABELS: LABELS };
