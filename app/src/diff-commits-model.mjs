import { t, tn } from "../electron/i18n/index.mjs";
import { fileTreeCompactRow, fileTreeRowCurrent, fileTreeRowIdle } from "./generated/files-changes/file-tree-row-classes.mjs";

// "Commits" section of the Changed files column, 2.31226.0 c44d00c7f (readable
// analysis/code-ui-sync-20261013/readable/c44d00c7f-Buwpp1mI.js.readable.js):
// Wr commit row (808-881), Gr "Copy commit SHA" (882-910), Kr "All changes" /
// "Uncommitted changes" rows (911-931), qr the vertical toolbar (932-1002), Zr the
// collapsible header (1003-1057), zr roving keys (727-774), Ur click-after-drag
// guard (787-807); mounted under the file tree at ~7210 ("flex shrink-0 flex-col
// border-t", maxHeight 40%) only when there are commits and a commit picker.
// Collapsed state: ca80fca8d Rw, localStorage "epitaxy-diff-commits-collapsed"
// (default false), kept here in the tile store as diffCommitsCollapsed.

export const COMMITS_SECTION_LIMIT = 100;
export const COMMIT_ROW_SELECTOR = "[data-commit-row]";
// Ur Hr: a click that ends ≥4px from its mousedown over selected row text was a drag-select.
export const COMMIT_ROW_DRAG_PX = 4;

export const DIFF_COMMITS_LABELS = Object.freeze({
  commits: t("Commits"),
  allChanges: t("All changes"),
  uncommitted: t("Uncommitted changes"),
  noMessage: t("(no message)"),
  copySha: t("Copy commit SHA"),
  copied: t("Commit SHA copied to clipboard."),
  copyFailed: t("Couldn’t copy to the clipboard."),
});

// 3.6556.2 c44d00c7f imports the file-tree row base, selected and idle fills from c621b1e2d (`xt` r = f, `_t` i = m,
// `St` s = p; generated/files-changes/file-tree-row-classes.mjs): Ni/Fi pick `a ? _t : St`, Bi's header Trigger is
// `${xt} text-secondary-control`.
export const COMMIT_ROW_ACTIVE = fileTreeRowCurrent;
export const COMMIT_ROW_IDLE = fileTreeRowIdle;
export const COMMITS_HEADER_ROW = `${fileTreeCompactRow} text-secondary-control`;
// Ni / Fi (3.6556.2, as 2.42304.0): text-start, not text-left.
export const COMMIT_ROW_CLASS = "group flex w-full flex-col items-start gap-[2px] rounded px-xs py-[6px] text-start text-body focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus";
export const SCOPE_ROW_CLASS = "scroll-mt-(--cds-pad-md) rounded px-xs py-[6px] text-start text-body focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus";
// Ni meta line and Ii "{n} older commits not shown": footnote text-muted-as-secondary.
export const COMMIT_META_CLASS = "flex w-full items-center gap-1 text-footnote text-muted-as-secondary";
export const OLDER_COMMITS_CLASS = "px-xs py-[6px] text-footnote text-muted-as-secondary";
// Bi: Li / Ri, the section body under the header (CdsCollapsible.Panel, no height animation).
export const COMMITS_PANEL_CLASS = "min-h-0 overflow-y-auto h-auto transition-none duration-0 data-[starting-style]:h-auto data-[starting-style]:overflow-y-auto data-[ending-style]:h-auto data-[ending-style]:overflow-y-auto data-[animating]:overflow-y-auto";
export const COMMITS_TOOLBAR_CLASS = "flex flex-col gap-0.5 pb-md outline-none hide-focus-ring";

/** qr: the newest 100 commits; a selected commit past them is appended; `hidden` counts the
 * rest of base..HEAD (`total` = rev-list --count when known, else the rows given). */
export function commitsSectionRows(commits, selectedSha = null, total) {
  const list = Array.isArray(commits) ? commits : [];
  const shown = list.length > COMMITS_SECTION_LIMIT ? list.slice(0, COMMITS_SECTION_LIMIT) : list;
  const extra = selectedSha !== null && !shown.some((commit) => commit.sha === selectedSha)
    ? list.find((commit) => commit.sha === selectedSha) : undefined;
  const rows = extra ? [...shown, extra] : shown;
  const all = Number.isSafeInteger(total) && total >= list.length ? total : list.length;
  return { rows, hidden: Math.max(0, all - rows.length) };
}

// shared-1 XG / ZG (c44d00c7f ki = `ZG(e, e.currentTarget) && e.preventDefault()`, mounted while shared-25 vh — the
// desktop app — holds): the native context menu is suppressed unless the event was already handled, it passes over a
// field, link, media or menu on its way to the target, or a non-empty selection intersects the target.
export const NATIVE_MENU_TARGETS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), a[href], img, video, audio, [role="menu"]';
export function suppressNativeMenu(event, target) {
  if (event.defaultPrevented) return false;
  const path = event.nativeEvent?.composedPath?.() ?? event.composedPath?.() ?? [];
  const index = path.indexOf(target);
  if (index === -1 || path.slice(0, index + 1).some((node) => node?.nodeType === 1 && node.matches?.(NATIVE_MENU_TARGETS))) return false;
  const selection = target.ownerDocument?.getSelection?.() ?? null;
  return !(selection !== null && selection.rangeCount > 0 && selection.toString().trim() !== "" && selection.getRangeAt(0).intersectsNode(target));
}
export function preventNativeMenu(event) {
  if (suppressNativeMenu(event, event.currentTarget)) event.preventDefault();
}

// c44d00c7f Rn = c82eca2bd Se `function Se(){return te(z)??!0}` with `z="__gb__2263689058"`: shared-0 Zo (te) answers
// null when there is no GrowthBook client (qo `t ? … : null`), so the Enter pick is on. The host has no GrowthBook client.
export const ENTER_PICK_GATE = "__gb__2263689058";
export const ENTER_PICK_ENABLED = true;

// c82eca2bd B (c44d00c7f er): once the Enter that picked a row comes back up (keyup Enter, capture, on the window), pick
// runs if focus is on nothing / the body or still inside the list; a window blur first drops the wait.
export function pickOnEnterKeyUp(list, pick) {
  const doc = list.ownerDocument, view = doc?.defaultView;
  if (!view) return;
  const controller = new AbortController();
  view.addEventListener("keyup", (event) => {
    if (event.key !== "Enter") return;
    controller.abort();
    const active = doc.activeElement;
    if (!active || active === doc.body || list.contains(active)) pick();
  }, { capture: true, signal: controller.signal });
  view.addEventListener("blur", () => controller.abort(), { signal: controller.signal });
}

// c44d00c7f Ci: a plain Enter (no repeat, no modifier) on a row clicks it and, on its keyup, runs onEnterPick (the
// Changes tile's requestDiffFocus). Nothing happens without a row or an onEnterPick, or with the Rn gate off.
export function enterPick(event, row, pick, enabled = ENTER_PICK_ENABLED) {
  if (!row || !pick || event.key !== "Enter" || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || !enabled) return false;
  event.preventDefault();
  row.click();
  pickOnEnterKeyUp(event.currentTarget, pick);
  return true;
}

// c44d00c7f Oi `e.altKey && !(e.key === "Tab" && Ie())` (Ie = shared-78 Eo, the macOS user agent): an Alt chord is left
// alone, except Alt+Tab on macOS, which moves focus like Tab.
export function commitsAltIgnored(event, isMac) {
  return !!event.altKey && !(event.key === "Tab" && isMac);
}

export function olderCommitsLabel(hidden) {
  return tn(hidden, "{count} older commit not shown", "{count} older commits not shown");
}

/** zr ArrowDown/ArrowUp/Home/End: from no focused row, the pressed (else first) row. */
export function commitRowTarget(key, { index, count, pressedIndex = -1 }) {
  if (count <= 0) return null;
  const start = pressedIndex >= 0 ? pressedIndex : 0;
  switch (key) {
    case "ArrowDown": return index < 0 ? start : Math.min(index + 1, count - 1);
    case "ArrowUp": return index < 0 ? start : Math.max(index - 1, 0);
    case "Home": return 0;
    case "End": return count - 1;
    default: return null;
  }
}

/** Ur: a real (detail > 0) click is dropped when the pointer travelled ≥4px since mousedown and
 * a non-empty selection intersects the row (Vr), so drag-selecting a subject does not pick it. */
export function isDragSelectClick({ detail, start, end, hasSelection }) {
  return detail > 0 && start !== null && start !== undefined
    && Math.hypot(end.x - start.x, end.y - start.y) >= COMMIT_ROW_DRAG_PX && !!hasSelection;
}

/** Wr meta line: shortSha · authorName [· narrow relative date when date > 0 (Unix seconds)]. */
export function commitMeta(commit) {
  return {
    shortSha: commit?.shortSha ?? String(commit?.sha ?? "").slice(0, 7),
    author: commit?.authorName ?? "",
    dateMs: Number.isFinite(commit?.date) && commit.date > 0 ? commit.date * 1000 : null,
  };
}
