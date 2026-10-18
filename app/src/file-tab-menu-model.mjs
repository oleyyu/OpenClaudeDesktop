import { t } from "../electron/i18n/index.mjs";

// Files pane tab strip model (2.2553.1).
// Tab model: readable/panes-tile-current.js:6656-6668 ce — id=path, label=mn(path)
// (basename), detail = dn(path, workingDir) up to its last "/" ("/" when that is
// empty, undefined for a root-level file), closable:true, preview, NO icon.
// Labels: panes-tile-current.js:6669-6710 le.
// Menu: readable/panes-tabs-current.js:470-485 he popup — Se keep (preview only),
// I close, be/xe close-others/close-all (only when not solo, Me = je === 1 :785).
export const FILE_TAB_LABELS = Object.freeze({
  closeTab: t("Close file"),
  closeOtherTabs: t("Close other files"),
  closeTabsToRight: t("Close files to the right"),
  closeAllTabs: t("Close all files"),
  keepTab: t("Keep open"),
  previewTabHint: t("preview"),
  deletedTabHint: t("deleted"),
  closeTabDeleteHint: t("Press Delete or Backspace to close the file"),
  // le (panes-tile-current.js:6669-6710): the overflow trigger and its rows'
  // hint, and the Control+Shift+Arrow reorder hint every tab is described by.
  moreTabs: t("More files"),
  closeTabHint: t("press right arrow to close"),
  moveTabHint: t("Press Control+Shift+Left Arrow or Right Arrow to move the file"),
});

// F (readable/panes-state-current.js:1596-1616): a tab with the same path is
// replaced where it is; otherwise a preview file takes the first preview tab's
// slot; otherwise it is appended. Over 8 tabs, the lowest openSequence other
// than the new tab and keepPath (the file view) is evicted first.
export const MAX_FILE_TABS = 8;
export function insertFileTab(tabs, file, keepPath = null) {
  const list = Array.isArray(tabs) ? tabs : [];
  const same = list.findIndex((tab) => tab.path === file.path);
  const index = same >= 0 ? same : file.preview === true ? list.findIndex((tab) => tab.preview === true) : -1;
  if (index >= 0) {
    if (list[index] === file) return list;
    const next = list.slice();
    next[index] = file;
    return next;
  }
  const next = [...list, file];
  while (next.length > MAX_FILE_TABS) {
    let evict = -1;
    next.forEach((tab, at) => {
      if (tab === file || tab.path === keepPath) return;
      if (evict < 0 || (tab.openSequence ?? -1) < (next[evict].openSequence ?? -1)) evict = at;
    });
    if (evict < 0) break;
    next.splice(evict, 1);
  }
  return next;
}

// lt (panes-tabs-current.js:1089-1095): Control/Meta+Shift+Arrow moves a tab one
// slot; a move into a slot hidden behind "More files" is ignored.
export function moveFileTab(tabs, path, delta, hiddenPaths = []) {
  const from = tabs.findIndex((tab) => tab.path === path), to = from + delta;
  if (from < 0 || to < 0 || to >= tabs.length || hiddenPaths.includes(tabs[to].path)) return tabs;
  const next = tabs.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// dn(path, cwd): a path under the workspace becomes cwd-relative; anything else
// (already relative, or outside the workspace) is kept as given.
export function tabRelativePath(path, cwd) {
  let value = String(path ?? "");
  const root = typeof cwd === "string" ? cwd.replace(/\/+$/, "") : "";
  if (root && value.startsWith(root + "/")) value = value.slice(root.length + 1);
  while (value.startsWith("./")) value = value.slice(2);
  return value;
}

export function tabDetail(path, cwd) {
  const relative = tabRelativePath(path, cwd);
  const index = relative.lastIndexOf("/");
  return index < 0 ? undefined : relative.slice(0, index) || "/";
}

// he te: content is the label only while there is a detail or the label is
// clipped; the open tab menu / a pointer-down on the tab suppress both lines.
export function tabTooltip({ label, detail, clipped = false, suppressed = false }) {
  if (suppressed) return { content: null, detail: null };
  return { content: detail === undefined && !clipped ? null : label, detail };
}

export function tabMenuItems({ preview = false, solo = false, hasTabsToRight = false } = {}) {
  return [
    preview && { action: "keep", label: FILE_TAB_LABELS.keepTab },
    { action: "close", label: FILE_TAB_LABELS.closeTab },
    !solo && { action: "close-others", label: FILE_TAB_LABELS.closeOtherTabs },
    hasTabsToRight && { action: "close-right", label: FILE_TAB_LABELS.closeTabsToRight },
    !solo && { action: "close-all", label: FILE_TAB_LABELS.closeAllTabs },
  ].filter(Boolean);
}

// qa (cd2efac6e-CAi4fxTN.js): the Files pane ⋮ items for the active file, in this order — "Find in file" (with
// the ⌘F shortcut), "Copy file contents", "Download file", "Reload file" (disabled while it reloads). An action
// without a handler is left out.
export function fileViewerMenuItems({ onFind, onCopyContents, onDownload, onReload, downloading = false, reloading = false, findShortcut = "cmd+f" } = {}) {
  return [
    onFind && { value: "find-in-file", label: t("Find in file"), shortcut: findShortcut, onSelect: onFind },
    onCopyContents && { value: "copy-file-contents", label: t("Copy file contents"), onSelect: onCopyContents },
    onDownload && { value: "download-file", label: t("Download file"), onSelect: onDownload, ...(downloading ? { disabled: true, disabledReason: t('Downloading…') } : {}) },
    onReload && { value: "reload-file", label: t("Reload file"), disabled: !!reloading, onSelect: onReload },
  ].filter(Boolean);
}

// 2.31226.0 c03935b01 closeFileTabsToRight: missing/last tab is a no-op.
export function fileTabsToRight(tabs, path) {
  const index = tabs.findIndex(tab => tab.path === path);
  return index < 0 ? [] : tabs.slice(index + 1).map(tab => tab.path);
}
