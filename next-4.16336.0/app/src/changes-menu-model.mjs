import { t } from "../electron/i18n/index.mjs";

// "Changes settings" sections, fh (2.2553.1 readable/panes-tile-current.js:3692-3868).
// Source order, divider-separated: [diff-file-list] | [diff-fold] | [diff-display] |
// [diff-refresh]; with an empty diff body (diffBodyEmpty) only [diff-refresh] is
// returned. Refresh is gated by Am (:2799, kill switch __gb__2702814782, default on)
// and re-fetches the diff (sl). R10 diff-file-list (:3740-3779): "Show files" (the
// diffShowTree checkbox with the ⇧⌘Y keycap, only while the column can fit, uh),
// "Group files by folder" (epitaxy-diff-file-tree) and "Separate test, build, and
// generated files" (epitaxy-diff-group-by-kind), all keepOpen checkboxes. The fold
// group needs diffIsLarge to be known (y && w !== void 0); locally a rendered patch
// always reports it (SourceDiff onIsLargeChange: additions + deletions > 5000,
// panes-diff-view-current.js:5221-5232), and a large diff disables "Expand all files"
// with the original tooltip (:3791-3804). diff-model.js's "Large patch" fallback
// (MAX_PATCH_CHARS/MAX_PATCH_LINES) is a different state: raw text without folds.
// F12: after Word wrap, the keepOpen checkboxes "Highlight changed words"
// (diff-word-diff, default on) and "Hide whitespace changes" (diff-hide-whitespace,
// default off, the client-side gn port in diff-whitespace-model.mjs),
// panes-tile-current.js:3805-3835.
export const CHANGES_MENU_LABELS = Object.freeze({
  showFiles: t("Show files"),
  groupByFolder: t("Group files by folder"),
  groupByKind: t("Separate test, build, and generated files"),
  collapseAll: t("Collapse all files"),
  expandAll: t("Expand all files"),
  sideBySide: t("Side by side"),
  wordWrap: t("Word wrap"),
  wordDiff: t("Highlight changed words"),
  hideWhitespace: t("Hide whitespace changes"),
  refresh: t("Refresh"),
});
export const EXPAND_ALL_TOO_LARGE = t("This diff is too large to expand at once. Select a file to expand it.");
const noop = () => {};
export function changesMenuSections({ hasPatch = false, layoutSplit = false, canFitSplit = true, wordWrap = true, wordDiff = true, hideWhitespace = false,
  isLarge = false, fileList = null,
  onFoldAll = noop, onLayoutChange = noop, onWordWrapChange = noop, onWordDiffChange = noop, onHideWhitespaceChange = noop, onRefresh = noop } = {}) {
  const refresh = { key: "diff-refresh", items: [{ value: "diff-refresh", label: CHANGES_MENU_LABELS.refresh, onSelect: () => onRefresh() }] };
  if (!hasPatch) return [refresh];
  // fileList: {canFit, shown, tree, groupByKind, shortcut, onToggle, onTreeChange, onGroupByKindChange}.
  const list = fileList ? [
    ...(fileList.canFit !== false ? [{ value: "diff-file-list", label: CHANGES_MENU_LABELS.showFiles, checked: !!fileList.shown, checkedRole: "checkbox", keepOpen: true,
      shortcut: fileList.shortcut, onSelect: () => fileList.onToggle?.() }] : []),
    { value: "diff-file-tree", label: CHANGES_MENU_LABELS.groupByFolder, checked: fileList.tree !== false, checkedRole: "checkbox", keepOpen: true,
      onSelect: () => fileList.onTreeChange?.(fileList.tree === false) },
    { value: "diff-group-by-kind", label: CHANGES_MENU_LABELS.groupByKind, checked: !!fileList.groupByKind, checkedRole: "checkbox", keepOpen: true,
      onSelect: () => fileList.onGroupByKindChange?.(!fileList.groupByKind) },
  ] : [];
  return [
    ...(list.length ? [{ key: "diff-file-list", items: list }] : []),
    { key: "diff-fold", items: [
      { value: "diff-collapse-all", label: CHANGES_MENU_LABELS.collapseAll, onSelect: () => onFoldAll(true) },
      // :3791-3804 disabled: w, tooltip only while large; disabledReason is the
      // local SourceMenu.Item name for that tooltip.
      { value: "diff-expand-all", label: CHANGES_MENU_LABELS.expandAll, disabled: !!isLarge,
        tooltip: isLarge ? EXPAND_ALL_TOO_LARGE : undefined, disabledReason: isLarge ? EXPAND_ALL_TOO_LARGE : undefined, onSelect: () => onFoldAll(false) },
    ] },
    { key: "diff-display", items: [
      { value: "diff-side-by-side", label: CHANGES_MENU_LABELS.sideBySide, checked: layoutSplit, checkedRole: "checkbox", keepOpen: true,
        hint: layoutSplit && !canFitSplit ? t("Needs a wider pane") : undefined,
        onSelect: () => onLayoutChange(layoutSplit ? "unified" : "split") },
      { value: "diff-word-wrap", label: CHANGES_MENU_LABELS.wordWrap, checked: wordWrap, checkedRole: "checkbox", keepOpen: true,
        onSelect: () => onWordWrapChange(!wordWrap) },
      { value: "diff-word-diff", label: CHANGES_MENU_LABELS.wordDiff, checked: wordDiff, checkedRole: "checkbox", keepOpen: true,
        onSelect: () => onWordDiffChange(!wordDiff) },
      { value: "diff-hide-whitespace", label: CHANGES_MENU_LABELS.hideWhitespace, checked: hideWhitespace, checkedRole: "checkbox", keepOpen: true,
        onSelect: () => onHideWhitespaceChange(!hideWhitespace) },
    ] },
    refresh,
  ];
}
