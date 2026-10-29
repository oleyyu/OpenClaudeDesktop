import React, { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
// Hand-written host file: view-tabs through the facade (R6; this graph is not imported by chat/composer/menu, E41).
import { CdsCollapsible, CdsIcon, isMacUserAgent } from "./generated/view-tabs/index.js";
// shared-18 ok / sk (c44d00c7f `$e` / `Z`): the keyboard context menu (⇧F10 / ContextMenu on macOS, ^Enter on a commit
// row) and the menu-item Enter-repeat guard.
import { openContextMenuFromKey, preventMenuItemEnterRepeat } from "./generated/files-changes/tree-context-menu-keys.mjs";
import { fileTreeIconSize, treeIndent } from "./generated/code-current/file-tree-style.mjs";
import { SourceMenu } from "./source-menu.jsx";
import { SourceTooltip, SourceTooltipGroup, textOverflows } from "./source-tooltip.jsx";
import { useSourceToasts } from "./source-toast.jsx";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import { relativeClock } from "./relative-time-model.mjs";
import { narrowRelativeTime } from "./home-model.mjs";
import { getLocale } from "../electron/i18n/index.mjs";
import {
  COMMITS_HEADER_ROW, COMMITS_PANEL_CLASS, COMMITS_TOOLBAR_CLASS, COMMIT_META_CLASS, COMMIT_ROW_ACTIVE, COMMIT_ROW_CLASS, COMMIT_ROW_IDLE,
  COMMIT_ROW_SELECTOR, DIFF_COMMITS_LABELS, OLDER_COMMITS_CLASS, SCOPE_ROW_CLASS, commitMeta, commitRowTarget, commitsAltIgnored, commitsSectionRows,
  enterPick, isDragSelectClick, olderCommitsLabel, preventNativeMenu,
} from "./diff-commits-model.mjs";

// The Changed files column's "Commits" section. 3.6556.2 c44d00c7f-Cr1FDL2F (readable 3.6556.2 :680-1180):
// Ni commit row (2.31226.0 Wr), Pi "Copy commit SHA" (Gr), Fi "All changes" / "Uncommitted changes" (Kr), Ii the
// vertical toolbar (qr), Bi the collapsible header (Zr); helpers wi/Ei (Fr/Lr), Di (Rr), Oi (zr), Mi (Ur), ki/Ai (Br/Vr).
// See diff-commits-model.mjs.

// Vr: a non-empty selection that intersects the row.
function selectionInside(node) {
  const selection = node?.ownerDocument.getSelection?.();
  return !!selection && selection.rangeCount > 0 && selection.toString().trim() !== "" && selection.getRangeAt(0).intersectsNode(node);
}

// Fr: the pressed row scrolls into view (block nearest) when it becomes selected.
// Lr: a focused (or menu-open) row that unmounts hands focus to its toolbar.
function useCommitRowRef(selected) {
  const ref = useRef(null);
  useLayoutEffect(() => { if (selected) ref.current?.scrollIntoView?.({ block: "nearest" }); }, [selected]);
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      if (!node || !(node.contains(node.ownerDocument.activeElement) || node.hasAttribute("data-pressed"))) return;
      node.closest('[role="toolbar"]')?.focus({ preventScroll: true });
    };
  }, []);
  return ref;
}

// Ur: mousedown position, then drop a click that was really a drag-select over the row text.
function useDragGuardedClick(onClick) {
  const start = useRef(null);
  return {
    onMouseDown: (event) => { start.current = event.button === 0 ? { x: event.clientX, y: event.clientY } : null; },
    onClick: (event) => {
      const from = start.current;
      start.current = null;
      if (isDragSelectClick({ detail: event.detail, start: from, end: { x: event.clientX, y: event.clientY }, hasSelection: selectionInside(event.currentTarget) })) return;
      onClick();
    },
  };
}

// Ce with relativeFormat "narrow", numeric "always", absoluteAfterHours Infinity: always relative.
function CommitDate({ dateMs }) {
  const now = useSyncExternalStore(relativeClock.subscribe, relativeClock.getSnapshot, relativeClock.getServerSnapshot);
  const date = new Date(dateMs);
  return <time data-cds="RelativeTime" dateTime={date.toISOString()} className="shrink-0">{narrowRelativeTime(dateMs, now ?? dateMs, getLocale())}</time>;
}

function CommitSubject({ subject }) {
  const ref = useRef(null);
  // he (OverflowTooltip): the full subject below, after 700ms, only while it is truncated.
  return <SourceTooltip content={() => (textOverflows(ref.current, { subpixel: true }) ? subject : undefined)} side="bottom" align="start" delay={700} hoverable={false}>
    <span ref={ref} className="w-full truncate" data-cds="OverflowTooltip">{subject}</span>
  </SourceTooltip>;
}

// Wr: two-line commit row (subject; shortSha · author · date) with the Gr context menu.
function CommitRow({ commit, selected, onClick }) {
  const ref = useCommitRowRef(selected);
  const [menu, setMenu] = useState(null);
  const toasts = useSourceToasts();
  const click = useDragGuardedClick(onClick);
  const meta = commitMeta(commit);
  const copySha = useCallback(() => {
    const clipboard = ref.current?.ownerDocument.defaultView?.navigator.clipboard ?? globalThis.navigator?.clipboard;
    Promise.resolve().then(() => clipboard.writeText(commit.sha)).then(
      () => toasts?.add(DIFF_COMMITS_LABELS.copied),
      () => toasts?.add(DIFF_COMMITS_LABELS.copyFailed, { variant: "danger" }));
  }, [commit.sha, toasts]);
  const openMenu = (point) => setMenu(point);
  // Ni: no key handler of its own; the toolbar's Oi opens this menu from the keyboard (shared-18 ok dispatches a
  // contextmenu at the row's bottom-left content edge, which lands in onContextMenu below).
  return <>
    <button ref={ref} type="button" data-commit-row="commit" tabIndex={-1} aria-pressed={selected}
      data-pressed={menu ? "" : undefined} onMouseDown={click.onMouseDown} onClick={click.onClick}
      onContextMenu={(event) => {
        // qt nativeMenuWhen Vr: selected row text keeps the native (Copy) menu.
        if (selectionInside(event.currentTarget)) return;
        event.preventDefault(); event.stopPropagation();
        openMenu({ x: event.clientX, y: event.clientY });
      }}
      className={`sdiff-commit-row ${COMMIT_ROW_CLASS} ${selected ? COMMIT_ROW_ACTIVE : COMMIT_ROW_IDLE}`}>
      <CommitSubject subject={commit.subject || DIFF_COMMITS_LABELS.noMessage} />
      {/* Ni: the shortSha takes dir="ltr" only under an RTL direction (Base UI useDirection; the host has no
          DirectionProvider, so it is always "ltr" and the attribute is omitted, as in the official build here). */}
      <span className={COMMIT_META_CLASS}>
        <span className="text-code">{meta.shortSha}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{meta.author}</span>
        {meta.dateMs !== null && <><span aria-hidden="true">·</span><CommitDate dateMs={meta.dateMs} /></>}
      </span>
    </button>
    {menu && <SourceMenu.Popup anchor={ref.current} trigger={ref.current} point={menu} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard="always"
      label={commit.subject || DIFF_COMMITS_LABELS.noMessage} onClose={() => setMenu(null)}>
      <SourceMenu.Item onClick={copySha}>{DIFF_COMMITS_LABELS.copySha}</SourceMenu.Item>
    </SourceMenu.Popup>}
  </>;
}

// Kr: the "All changes" / "Uncommitted changes" rows.
function ScopeRow({ selected, onClick, children }) {
  const ref = useCommitRowRef(selected);
  return <button ref={ref} type="button" data-commit-row="" tabIndex={-1} onClick={onClick} aria-pressed={selected}
    className={`sdiff-commit-scope ${SCOPE_ROW_CLASS} select-none ${selected ? COMMIT_ROW_ACTIVE : COMMIT_ROW_IDLE}`}>{children}</button>;
}

// Oi (3.6556.2): roving focus over the rows. An Alt chord is ignored except Alt+Tab on macOS; the keyboard context menu
// (shared-18 ok) goes to a focused commit row only; ⌘/Ctrl+A is swallowed so it does not select the whole page; a plain
// Enter picks the focused row and, on its keyup, hands focus to the diff (Ci, onEnterPick).
function commitsKeyDown(event, onEnterPick) {
  const toolbar = event.currentTarget;
  if (!toolbar.contains(event.target) || commitsAltIgnored(event, isMacUserAgent())) return;
  const rows = [...toolbar.querySelectorAll(COMMIT_ROW_SELECTOR)];
  const focused = toolbar.ownerDocument.activeElement;
  const index = rows.findIndex((row) => row === focused || row.contains(focused));
  const current = rows[index];
  if (openContextMenuFromKey(event, current?.dataset.commitRow === "commit" ? current : null)) return;
  if (event.metaKey || event.ctrlKey) {
    if (!event.shiftKey && (event.key === "a" || event.key === "A")) event.preventDefault();
    return;
  }
  if (event.key === "Tab") { if (event.shiftKey && index >= 0) toolbar.focus({ preventScroll: true }); return; }
  if (event.key === "Enter") { enterPick(event, current ?? null, onEnterPick); return; }
  const target = commitRowTarget(event.key, { index, count: rows.length, pressedIndex: rows.findIndex((row) => row.getAttribute("aria-pressed") === "true") });
  if (target === null) return;
  const row = rows[target];
  if (!row) return;
  event.preventDefault();
  row.focus();
  if (target === rows.length - 1) toolbar.lastElementChild?.scrollIntoView?.({ block: "nearest" });
  row.scrollIntoView?.({ block: "nearest" });
}

// Rr: keyboard focus landing on the toolbar moves to the pressed (else first) row.
function commitsFocus(event) {
  const toolbar = event.currentTarget;
  if (event.target !== toolbar || toolbar.contains(event.relatedTarget)) return;
  let visible = false;
  try { visible = toolbar.matches(":focus-visible"); } catch { visible = false; }
  if (!visible) return;
  const row = toolbar.querySelector(`${COMMIT_ROW_SELECTOR}[aria-pressed="true"]`) ?? toolbar.querySelector(COMMIT_ROW_SELECTOR);
  row?.focus();
  row?.scrollIntoView?.({ block: "nearest" });
}

// qr: role=toolbar (vertical) "Commits".
function CommitsList({ commits, total, selectedSha, uncommittedSelected, onSelect, onSelectUncommitted, onEnterPick, underHeader }) {
  const { rows, hidden } = commitsSectionRows(commits, selectedSha, total);
  const allSelected = selectedSha === null && !uncommittedSelected;
  return <div role="toolbar" aria-orientation="vertical" aria-label={DIFF_COMMITS_LABELS.commits} tabIndex={0}
    onKeyDown={(event) => commitsKeyDown(event, onEnterPick)} onKeyDownCapture={preventMenuItemEnterRepeat} onFocus={commitsFocus} onContextMenu={preventNativeMenu}
    className={`sdiff-commits-list ${COMMITS_TOOLBAR_CLASS} ${underHeader ? "pt-0.5" : "pt-md"}`}>
    <ScopeRow selected={allSelected} onClick={() => onSelect(null)}>{DIFF_COMMITS_LABELS.allChanges}</ScopeRow>
    {onSelectUncommitted && <ScopeRow selected={uncommittedSelected} onClick={onSelectUncommitted}>{DIFF_COMMITS_LABELS.uncommitted}</ScopeRow>}
    {/* qr P (delay 700): the subjects' overflow tooltips share one group, so moving down the list keeps them open. */}
    <SourceTooltipGroup delay={700}>
      {rows.map((commit) => <CommitRow key={commit.sha} commit={commit} selected={selectedSha === commit.sha} onClick={() => onSelect(commit.sha)} />)}
    </SourceTooltipGroup>
    {hidden > 0 && <span className={`${OLDER_COMMITS_CLASS} select-none`}>{olderCommitsLabel(hidden)}</span>}
  </div>;
}

/** Bi (2.31226.0 Zr): the collapsible "Commits {n}" section. Props: commits [{sha, shortSha, subject, authorName,
 * date}], total (base..HEAD count), selectedSha (a commit scope) or null, uncommittedSelected,
 * onSelect(sha | null), onSelectUncommitted (only while uncommitted changes exist), onEnterPick (Jd ee), collapsed,
 * onCollapsedChange(collapsed).
 * 3.6556.2: CdsCollapsible Root (open = !collapsed, "flex min-h-0 flex-col") > the header (shrink-0 px-xs py-1.25, ki on
 * its context menu) > "rounded hover:bg-fill-ghost-hover" > Trigger (hideCaret, ht(0), `${xt} text-secondary-control`)
 * with CdsIcon CaretRight (size Q(), rotate collapsed ? 0 : 90, no rotate-90 class), the name and the count; the Panel
 * (Ri) holds the list. Host difference: the count is `total` (the host reads 101 commits and rev-list --count; the
 * official list is the whole base..HEAD, so its commits.length is the same number). */
export function SourceDiffCommits({ commits, total, selectedSha = null, uncommittedSelected = false, onSelect, onSelectUncommitted, onEnterPick, collapsed = false, onCollapsedChange }) {
  const trigger = useRef(null);
  const list = <CommitsList commits={commits} total={total} selectedSha={selectedSha} uncommittedSelected={uncommittedSelected}
    onSelect={onSelect} onSelectUncommitted={onSelectUncommitted} onEnterPick={onEnterPick} underHeader={!!onCollapsedChange} />;
  if (!onCollapsedChange) return <div className="min-h-0 overflow-y-auto px-xs">{list}</div>;
  const count = Number.isSafeInteger(total) && total >= commits.length ? total : commits.length;
  return <CdsCollapsible.Root open={!collapsed} className="flex min-h-0 flex-col"
    onOpenChange={(open) => {
      // Bi u: collapsing keeps focus on the trigger (the focused row is about to unmount).
      if (!open) trigger.current?.focus({ preventScroll: true });
      onCollapsedChange(!open);
    }}>
    <div className="shrink-0 px-xs py-1.25" onContextMenu={preventNativeMenu}>
      <div className="rounded hover:bg-fill-ghost-hover">
        <CdsCollapsible.Trigger ref={trigger} hideCaret style={treeIndent(0)} className={COMMITS_HEADER_ROW}>
          <CdsIcon name="CaretRight" size={fileTreeIconSize()} rotate={collapsed ? 0 : 90} className="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" />
          <span className="min-w-0 flex-1 truncate">{DIFF_COMMITS_LABELS.commits}</span>
          <span className="shrink-0 text-footnote tabular-nums text-muted">{count}</span>
        </CdsCollapsible.Trigger>
      </div>
    </div>
    <CdsCollapsible.Panel className={COMMITS_PANEL_CLASS}>
      <div className="px-xs">{list}</div>
    </CdsCollapsible.Panel>
  </CdsCollapsible.Root>;
}
