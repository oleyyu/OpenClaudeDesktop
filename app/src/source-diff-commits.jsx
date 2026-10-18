import React, { useCallback, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { SourceMenu } from "./source-menu.jsx";
import { SourceTooltip, SourceTooltipGroup, textOverflows } from "./source-tooltip.jsx";
import { useSourceToasts } from "./source-toast.jsx";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import { relativeClock } from "./relative-time-model.mjs";
import { narrowRelativeTime } from "./home-model.mjs";
import { getLocale } from "../electron/i18n/index.mjs";
import {
  COMMITS_HEADER_ROW, COMMITS_TOOLBAR_CLASS, COMMIT_ROW_ACTIVE, COMMIT_ROW_CLASS, COMMIT_ROW_IDLE, COMMIT_ROW_SELECTOR,
  DIFF_COMMITS_LABELS, SCOPE_ROW_CLASS, commitMeta, commitRowTarget, commitsSectionRows, isDragSelectClick, olderCommitsLabel,
} from "./diff-commits-model.mjs";

// The Changed files column's "Commits" section, 2.31226.0 c44d00c7f Wr/Gr/Kr/qr/Zr
// (readable :808-1057, helpers Fr/Lr/Rr/zr/Ur :689-807); see diff-commits-model.mjs.

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
  return <>
    <button ref={ref} type="button" data-commit-row="commit" data-commit-sha={commit.sha} tabIndex={-1} aria-pressed={selected}
      data-pressed={menu ? "" : undefined} onMouseDown={click.onMouseDown} onClick={click.onClick}
      onContextMenu={(event) => {
        // qt nativeMenuWhen Vr: selected row text keeps the native (Copy) menu.
        if (selectionInside(event.currentTarget)) return;
        event.preventDefault(); event.stopPropagation();
        openMenu({ x: event.clientX, y: event.clientY });
      }}
      onKeyDown={(event) => {
        // ce9ca5630 t (Et): the ContextMenu key or ⇧F10 opens the row menu at its bottom-left content edge.
        if (!(event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey))) return;
        event.preventDefault(); event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const view = event.currentTarget.ownerDocument.defaultView;
        const padding = parseFloat(view?.getComputedStyle(event.currentTarget).paddingLeft) || 0;
        openMenu({ x: rect.left + padding, y: rect.bottom });
      }}
      className={`sdiff-commit-row ${COMMIT_ROW_CLASS} ${selected ? COMMIT_ROW_ACTIVE : COMMIT_ROW_IDLE}`}>
      <CommitSubject subject={commit.subject || DIFF_COMMITS_LABELS.noMessage} />
      <span className="flex w-full items-center gap-1 text-footnote text-muted">
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

// zr: roving focus over the rows; ⌘/Ctrl+A is swallowed so it does not select the whole page.
function commitsKeyDown(event) {
  const toolbar = event.currentTarget;
  if (!toolbar.contains(event.target) || event.altKey) return;
  if (event.metaKey || event.ctrlKey) {
    if (!event.shiftKey && (event.key === "a" || event.key === "A")) event.preventDefault();
    return;
  }
  const rows = [...toolbar.querySelectorAll(COMMIT_ROW_SELECTOR)];
  const focused = toolbar.ownerDocument.activeElement;
  const index = rows.findIndex((row) => row === focused || row.contains(focused));
  if (event.key === "Tab") { if (event.shiftKey && index >= 0) toolbar.focus({ preventScroll: true }); return; }
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

// Br: a right-click on the toolbar outside any row has no menu.
function suppressEmptyMenu(event) {
  if (!event.target.closest?.(COMMIT_ROW_SELECTOR)) event.preventDefault();
}

// qr: role=toolbar (vertical) "Commits".
function CommitsList({ commits, total, selectedSha, uncommittedSelected, onSelect, onSelectUncommitted, underHeader }) {
  const { rows, hidden } = commitsSectionRows(commits, selectedSha, total);
  const allSelected = selectedSha === null && !uncommittedSelected;
  return <div role="toolbar" aria-orientation="vertical" aria-label={DIFF_COMMITS_LABELS.commits} tabIndex={0}
    onKeyDown={commitsKeyDown} onFocus={commitsFocus} onContextMenu={suppressEmptyMenu}
    className={`sdiff-commits-list ${COMMITS_TOOLBAR_CLASS} ${underHeader ? "pt-0.5" : "pt-md"}`}>
    <ScopeRow selected={allSelected} onClick={() => onSelect(null)}>{DIFF_COMMITS_LABELS.allChanges}</ScopeRow>
    {onSelectUncommitted && <ScopeRow selected={uncommittedSelected} onClick={onSelectUncommitted}>{DIFF_COMMITS_LABELS.uncommitted}</ScopeRow>}
    {/* qr P (delay 700): the subjects' overflow tooltips share one group, so moving down the list keeps them open. */}
    <SourceTooltipGroup delay={700}>
      {rows.map((commit) => <CommitRow key={commit.sha} commit={commit} selected={selectedSha === commit.sha} onClick={() => onSelect(commit.sha)} />)}
    </SourceTooltipGroup>
    {hidden > 0 && <span className="px-xs py-[6px] text-footnote text-muted select-none">{olderCommitsLabel(hidden)}</span>}
  </div>;
}

/** Zr: the collapsible "Commits {n}" section. Props: commits [{sha, shortSha, subject, authorName,
 * date}], total (base..HEAD count), selectedSha (a commit scope) or null, uncommittedSelected,
 * onSelect(sha | null), onSelectUncommitted (only while uncommitted changes exist), collapsed,
 * onCollapsedChange(collapsed). */
export function SourceDiffCommits({ commits, total, selectedSha = null, uncommittedSelected = false, onSelect, onSelectUncommitted, collapsed = false, onCollapsedChange }) {
  const trigger = useRef(null);
  const panelId = useId();
  const list = <CommitsList commits={commits} total={total} selectedSha={selectedSha} uncommittedSelected={uncommittedSelected}
    onSelect={onSelect} onSelectUncommitted={onSelectUncommitted} underHeader={!!onCollapsedChange} />;
  if (!onCollapsedChange) return <div className="min-h-0 overflow-y-auto px-xs">{list}</div>;
  const count = Number.isSafeInteger(total) && total >= commits.length ? total : commits.length;
  return <div className="sdiff-commits flex min-h-0 flex-col" data-collapsed={collapsed || undefined}>
    <div className="shrink-0 px-xs py-1.25" onContextMenu={(event) => event.preventDefault()}>
      <div className="rounded hover:bg-fill-ghost-hover">
        <button ref={trigger} type="button" aria-expanded={!collapsed} aria-controls={panelId} style={{ paddingLeft: 8 }}
          className={`sdiff-commits-trigger ${COMMITS_HEADER_ROW} text-secondary`}
          onClick={() => {
            // Zr a: collapsing keeps focus on the trigger (the focused row is about to unmount).
            if (!collapsed) trigger.current?.focus({ preventScroll: true });
            onCollapsedChange(!collapsed);
          }}>
          <Icon name="CaretRight" size={12} className={`sdiff-tree-caret shrink-0 text-muted transition-transform duration-fast motion-reduce:transition-none${collapsed ? "" : " rotate-90"}`} />
          <span className="min-w-0 flex-1 truncate">{DIFF_COMMITS_LABELS.commits}</span>
          <span className="shrink-0 text-footnote tabular-nums text-muted">{count}</span>
        </button>
      </div>
    </div>
    {!collapsed && <div id={panelId} className="min-h-0 overflow-y-auto h-auto">
      <div className="px-xs">{list}</div>
    </div>}
  </div>;
}
