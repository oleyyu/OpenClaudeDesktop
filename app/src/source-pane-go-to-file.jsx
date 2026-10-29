import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { CdsCombobox, CdsIcon, CdsTooltip, ariaKeyShortcuts, useIsMacPlatform } from "./generated/view-tabs/index.js";
import { FileTypeIcon } from "./generated/files-changes/file-type-icon.mjs";
import { PathSegments } from "./generated/files-changes/path-segments.mjs";
import { fileTreeRowGap } from "./generated/files-changes/file-tree-row-classes.mjs";
import { diffPaneFocusRoot } from "./generated/files-changes/diff-pane-body.mjs";
import { fileTreeIconSize } from "./file-tree-row-model.mjs";
import { parseUnifiedDiff } from "./diff-model";
import { diffFileEntries } from "./diff-file-list-model.mjs";
import { requestDiffReveal } from "./diff-reveal.mjs";
import { GO_TO_FILE_FLIP_PX, GO_TO_FILE_LIMIT, GO_TO_FILE_SHORTCUT, goToFileItems, isGoToFileShortcut } from "./diff-go-to-file-model.mjs";
import { t, tn } from "../electron/i18n/index.mjs";

// The Changes header's "Go to file" — 3.6556.2 cccc2cf0a CC (W12b cf-04), on shared-frame Ci (view-tabs CdsCombobox):
//   P.Root {items, filteredItems (the first SC = 100 matches), open, onOpenChange, value: null, onValueChange, inputValue,
//     onInputValueChange, onItemHighlighted, autoHighlight: true}
//   > ee (CdsTooltip) {content: "Go to file", shortcut: X("goToDiffFile")} > P.Trigger {variant: "ghost", aria-label,
//     aria-keyshortcuts: re(shortcut, isMac), className: "aspect-square w-control justify-center px-0 rounded"} > the sm
//     Search icon (fe; the fizzy-lake "panels" aC glyph never applies here)
//   > P.Popup {side (xC, chosen on open), align: "end", collisionPadding: oi, collisionAvoidance: {side: "none"},
//     positionerClassName: "w-[22rem] max-w-[calc(100vw-16px)]", maxVisibleItems: 12, finalFocus: I, style: hC}
//     > P.PopupSearch "Search changed files", P.Empty "No matching files", P.List of P.Item rows (span
//       `flex w-full min-w-0 items-center ${Qc}`: ul FileTypeIcon "shrink-0 text-muted-control", jf PathSegments posix
//       with the match positions — titled "{previousPath} → {path}" when only the old path matched — and Hp's counts),
//       the "{count} more files. Keep typing to narrow." line (px-md py-1.5 text-body text-muted-as-secondary
//       select-none, the search's aria-describedby), P.Status (loading while the items are null; the host's are not).
// Choosing a row is Y_.scrollToAnnotation (here the Changes diff's reveal request, diff-reveal.mjs); the popup then hands
// focus to the pane body (I: shared-1 iC). Filtering: the host ranker (diff-go-to-file-model.mjs) stands in for FileIndex
// (oC/vC), a native index; gC's previous paths join the search the way vC has them. ⌘P (I_ goToDiffFile) opens it
// while focus is anywhere inside the pane.

// shared-18 Sn (oi), the popup's collision padding; xC flips the popup up with less than yC = 200px below and more above.
const COLLISION_PADDING = { top: 48, right: 8, bottom: 8, left: 8 };
const COLLISION_AVOIDANCE = { side: "none" };
// hC: `{ backgroundColor: vp }`, vp = c6e73333a C.
const POPUP_STYLE = { backgroundColor: "var(--diff-widget-bg, var(--cds-surface-3))" };

/** xC: the side the popup opens on, from the trigger. */
export function goToFilePopupSide(trigger) {
  if (!trigger) return "bottom";
  const rect = trigger.getBoundingClientRect();
  const below = trigger.ownerDocument.documentElement.clientHeight - rect.bottom - COLLISION_PADDING.bottom;
  const above = rect.top - COLLISION_PADDING.top;
  return below < GO_TO_FILE_FLIP_PX && above > below ? "top" : "bottom";
}

/** The rows CC lists (C): each file's {value, name, additions, deletions, previousPath?}. */
export function goToFileRows(patch) {
  const sections = parseUnifiedDiff(patch ?? "").sections;
  const renamed = new Map(sections.filter((section) => section?.type === "file" && section.path && section.renamedFrom)
    .map((section) => [section.path, section.renamedFrom]));
  return diffFileEntries(sections).map((entry) => {
    const cut = entry.filePath.lastIndexOf("/");
    return { value: entry.filePath, name: entry.filePath.slice(cut + 1), additions: entry.additions, deletions: entry.deletions,
      ...(renamed.has(entry.filePath) ? { previousPath: renamed.get(entry.filePath) } : {}) };
  });
}

/**
 * vC over the rows: {filtered, positions (value → match positions), byPreviousPath (values only their previous path
 * matched)}. gC indexes each previous path that is not itself a row; a hit on it lists its row unless the row's own path
 * matched too.
 */
export function goToFileMatches(rows, query) {
  if (!String(query ?? "").trim()) return { filtered: rows, positions: new Map(), byPreviousPath: new Set() };
  const byPath = new Map(rows.map((row) => [row.value, row]));
  for (const row of rows) if (row.previousPath !== undefined && !byPath.has(row.previousPath)) byPath.set(row.previousPath, row);
  const { items } = goToFileItems([...byPath.keys()].map((filePath) => ({ filePath })), query, Infinity);
  const hits = new Set(items.map((item) => item.value));
  const filtered = [], positions = new Map(), byPreviousPath = new Set(), listed = new Set();
  for (const item of items) {
    const row = byPath.get(item.value);
    if (!row || listed.has(row.value)) continue;
    if (item.value === row.value) { filtered.push(row); listed.add(row.value); positions.set(row.value, item.positions); }
    else if (!hits.has(row.value)) { filtered.push(row); listed.add(row.value); byPreviousPath.add(row.value); }
  }
  return { filtered, positions, byPreviousPath };
}

// Hp (c44d00c7f hs): the footnote +N / −N; a parser fallback (unknown counts) has none.
function Counts({ additions, deletions }) {
  if (!Number.isFinite(additions) || !Number.isFinite(deletions)) return null;
  return <span className="flex shrink-0 items-center gap-0.5 text-footnote tabular-nums">
    <span className="text-git-added">{`+${additions}`}</span><span className="text-git-removed">{`−${deletions}`}</span>
  </span>;
}

/**
 * patch: the Changes pane's unified diff (its files are listed); onPick(path): show that file's section (by default
 * the Changes diff's reveal request, diff-reveal.mjs).
 */
export function SourceDiffGoToFile({ patch, onPick = requestDiffReveal }) {
  const isMac = useIsMacPlatform();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState("bottom");
  const [query, setQuery] = useState("");
  const trigger = useRef(null), via = useRef("button"), highlighted = useRef(undefined), picked = useRef(false);
  const moreId = useId();
  const rows = useMemo(() => goToFileRows(patch), [patch]);
  const { filtered, positions, byPreviousPath } = useMemo(() => goToFileMatches(rows, query), [rows, query]);
  const shown = filtered.length > GO_TO_FILE_LIMIT ? filtered.slice(0, GO_TO_FILE_LIMIT) : filtered;
  const more = filtered.length - shown.length;
  const label = t("Go to file"), searchLabel = t("Search changed files");
  // M: opening picks the side (xC); closing clears the query and the shortcut flag.
  const openChange = (next) => {
    setOpen(next);
    if (next) setSide(goToFilePopupSide(trigger.current));
    else { setQuery(""); via.current = "button"; }
  };
  const latestOpenChange = useRef(openChange);
  latestOpenChange.current = openChange;
  // N: a chosen row shows its section (Y_.scrollToAnnotation).
  const pick = (item) => {
    if (!item) return;
    picked.current = true;
    onPick?.(item.value);
  };
  // I: after a pick the focus goes to the pane body (shared-1 iC), otherwise back to the trigger.
  const finalFocus = () => {
    if (!picked.current) return true;
    picked.current = false;
    diffPaneFocusRoot(trigger.current)?.focus({ preventScroll: true });
    return false;
  };
  // I_ {target: the pane root, command: "goToDiffFile", onMatch: via "shortcut", open}.
  useEffect(() => {
    const root = trigger.current?.closest(".source-file-panel");
    if (!root) return undefined;
    const keyDown = (event) => {
      if (!isGoToFileShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      via.current = "shortcut";
      latestOpenChange.current(true);
    };
    root.addEventListener("keydown", keyDown);
    return () => root.removeEventListener("keydown", keyDown);
  }, []);
  // L: ⌘P inside the search is swallowed; while composing Base UI's handler is skipped; Enter with nothing highlighted
  // picks the first match and closes.
  const searchKeyDown = (event) => {
    if (isGoToFileShortcut(event.nativeEvent ?? event)) { event.preventDefault(); return; }
    if (event.nativeEvent?.isComposing || event.keyCode === 229) { event.preventBaseUIHandler?.(); return; }
    const first = filtered[0];
    if (event.key === "Enter" && !highlighted.current && first) { event.preventDefault(); pick(first); openChange(false); }
  };
  return <CdsCombobox.Root items={rows} filteredItems={shown} open={open} onOpenChange={openChange} value={null}
    onValueChange={pick} inputValue={query} onInputValueChange={setQuery} onItemHighlighted={(item) => { highlighted.current = item; }} autoHighlight>
    <CdsTooltip content={label} shortcut={GO_TO_FILE_SHORTCUT}>
      <CdsCombobox.Trigger ref={trigger} variant="ghost" aria-label={label} aria-keyshortcuts={ariaKeyShortcuts(GO_TO_FILE_SHORTCUT, isMac)}
        data-go-to-file="" className="aspect-square w-control justify-center px-0 rounded">
        <CdsIcon name="Search" size="sm" />
      </CdsCombobox.Trigger>
    </CdsTooltip>
    <CdsCombobox.Popup side={side} align="end" collisionPadding={COLLISION_PADDING} collisionAvoidance={COLLISION_AVOIDANCE}
      positionerClassName="w-[22rem] max-w-[calc(100vw-16px)]" maxVisibleItems={12} finalFocus={finalFocus} style={POPUP_STYLE}>
      <CdsCombobox.PopupSearch aria-label={searchLabel} aria-describedby={more > 0 ? moreId : undefined} placeholder={searchLabel} onKeyDown={searchKeyDown} />
      <CdsCombobox.Empty>{t("No matching files")}</CdsCombobox.Empty>
      <CdsCombobox.List>
        {(item) => <CdsCombobox.Item key={item.value} value={item}>
          <span className={`flex w-full min-w-0 items-center ${fileTreeRowGap}`}>
            <FileTypeIcon fileName={item.name} size={fileTreeIconSize()} className="shrink-0 text-muted-control" />
            <span className="flex min-w-0 flex-1">
              <PathSegments path={item.value} posix positions={positions.get(item.value)}
                title={item.previousPath === undefined || !byPreviousPath.has(item.value) ? undefined
                  : t("{previousPath} → {path}", { previousPath: item.previousPath, path: item.value })} />
            </span>
            <Counts additions={item.additions} deletions={item.deletions} />
          </span>
        </CdsCombobox.Item>}
      </CdsCombobox.List>
      {more > 0 && <div id={moreId} className="px-md py-1.5 text-body text-muted-as-secondary select-none">
        {tn(more, "{count} more file. Keep typing to narrow.", "{count} more files. Keep typing to narrow.")}
      </div>}
      <CdsCombobox.Status loading={false} />
    </CdsCombobox.Popup>
  </CdsCombobox.Root>;
}
