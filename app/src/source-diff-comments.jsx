// Changes-pane line comments (B14 D4/D5): inline annotation cards and the diff body's selection chip / context menu.
// Ported from 2.31226.0 c44d00c7f: ha/ga (readable 2732-2810) the saved/draft cards with the 'Tell Claude what to
// change' placeholder, Ca (2925-2943) the gutter "+", Ho (4071-4145) openDraft/hoverAdd/selectionEnd, yo (3564-3860)
// the selection chip (onMouseUp), its dismissal (selectionchange/Escape/wheel/scroll) and the body context menu
// (onContextMenuCapture: Attach as context, Add comment, Copy). The card is the Files pane's c82eca2bd port
// (FileCommentCard); a saved comment goes out with the next message as a keyed composer snippet, exactly as Files
// comments do (main.jsx onSaveComment), or through the add-to-prompt relay in a popped-out pane window.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FileCommentCard } from "./source-file-comments.jsx";
import { SourceMenu } from "./source-menu.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import { addToPrompt, serializeLineComment } from "./inline-comments.mjs";
import { SELECTION_CHIP, addCommentLabel, anchorDiffSpan, diffCommentAttachmentKey, diffCommentOutdated, diffFileCommentsStore, diffLineIndex,
  diffSelectionSpan, diffSpanText, placeDiffComment, selectionChipPosition } from "./diff-comments-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import { suppressEscapeRepeat } from "./generated/code-editor-current/keyboard-repeat.mjs";
import { preventContextMenu } from "./generated/files-changes/diff-context-guard.mjs";

const ROW = ".sdiff-row[data-comment-line]";
const EMPTY = Object.freeze({ entries: [], active: null });
const noStore = { subscribe: () => () => {}, getSnapshot: () => EMPTY };

const rowInfo = (element) => ({ side: element.dataset.commentSide, line: Number(element.dataset.commentLine), column: element.dataset.column || "unified" });

// Za over the local rows: the rendered rows the document selection touches, each with its selected text. null when
// the selection is not in this body; [] when it is, but on no code row (a card, a separator).
function selectedRows(body) {
  const doc = body.ownerDocument, selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!range.intersectsNode(body)) return null;
  // Ja/so: a selection belongs to this file only when it starts or ends in it; one passing over it covers no row.
  if (!body.contains(range.startContainer) && !body.contains(range.endContainer)) return [];
  const view = doc.defaultView, rows = [];
  for (const element of body.querySelectorAll(ROW)) {
    const content = element.querySelector(".sdiff-line-content");
    if (!content || !range.intersectsNode(content)) continue;
    const part = doc.createRange();
    part.selectNodeContents(content);
    const clip = range.cloneRange();
    if (clip.compareBoundaryPoints(view.Range.START_TO_START, part) < 0) clip.setStart(part.startContainer, part.startOffset);
    if (clip.compareBoundaryPoints(view.Range.END_TO_END, part) > 0) clip.setEnd(part.endContainer, part.endOffset);
    const text = clip.toString();
    const covers = range.compareBoundaryPoints(view.Range.START_TO_START, part) <= 0 && range.compareBoundaryPoints(view.Range.END_TO_END, part) >= 0;
    if (!text && !covers) continue;
    rows.push({ ...rowInfo(element), text });
  }
  return rows;
}
// vo: the top of the nearest vertical scroller (the chip flips below the pointer near it).
function scrollerTop(node) {
  const view = node.ownerDocument.defaultView;
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = view.getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent.getBoundingClientRect().top;
  }
  return 0;
}
const editable = (node) => !!node?.closest?.("textarea, input, [contenteditable=''], [contenteditable='true']");

/** yo's document keydown while the selection chip shows (c44d00c7f): Escape outside a text field and an open menu hides
 * the chip. 2.42304.0 first swallows Escape's auto-repeat in the owner window (`ae(t)`, shared-19 pZ) until the key is
 * released, so holding it does not go on to close what is behind the chip. */
export function selectionChipEscape(doc, hide) {
  return (event) => {
    if (event.key !== "Escape" || event.isComposing || editable(doc.activeElement) || doc.querySelector("[data-cds='Menu'], [data-cds='ContextMenu']")) return;
    event.preventDefault(); event.stopPropagation();
    if (doc.defaultView) suppressEscapeRepeat(doc.defaultView);
    hide();
  };
}

/** The comment layer of one Changes file: store, cards, gutter add, line-number drag, selection chip, body menu. */
export function useDiffComments({ file, scope, menu: menuHost = false, shownHunks, complete = false, path, fileActions, bodyRef }) {
  const enabled = !!scope && !!file.path && !file.fallbackReason;
  // yo menuEnabled (p = !epitaxy_body_context_menu_disabled) does not depend on comments: without a session the
  // Changes body still offers Attach as context and Copy.
  const menuEnabled = enabled || (!!menuHost && !file.fallbackReason);
  const store = useMemo(() => (enabled ? diffFileCommentsStore(scope, file.path) : null), [enabled, scope, file.path]);
  const source = store ?? noStore;
  const state = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  useEffect(() => () => store?.release(), [store]);
  const index = useMemo(() => diffLineIndex(shownHunks), [shownHunks]);
  const actions = useRef(fileActions);
  actions.current = fileActions;

  // Ho openDraft over anchorSpan; the snippet is the commented lines as shown (kr), or unknown.
  const openDraft = useCallback((start, end, side) => {
    if (!store) return;
    const span = anchorDiffSpan(file.hunks, start, end, side, { partial: !complete });
    store.create(span.side, span.start, span.end, diffSpanText(index, span.side, span.start, span.end) ?? null);
  }, [store, file.hunks, index, complete]);
  // Ho hoverAdd: the "+" click right after a line-number drag ending on that line is the drag's own click.
  const lastDrag = useRef(null);
  const onGutterAdd = useCallback(({ line, side }) => {
    const last = lastDrag.current;
    lastDrag.current = null;
    if (last && last.line === line && last.side === side) return;
    openDraft(line, line, side);
  }, [openDraft]);

  // Cards: ha/ga per placed entry (pa), outdated per la; an entry whose line the diff does not show sits on top.
  const placed = useMemo(() => {
    const byAnchor = new Map(), unplaced = [];
    for (const entry of state.entries) {
      const place = placeDiffComment(index, entry, { complete, status: file.status });
      const outdated = place.lineGone || (!place.displaced && diffCommentOutdated(index, entry));
      const item = { entry, outdated };
      if (!index[place.side]?.has(place.line)) { unplaced.push(item); continue; }
      const key = `${place.side}:${place.line}`;
      byAnchor.set(key, [...(byAnchor.get(key) ?? []), item]);
    }
    return { byAnchor, unplaced };
  }, [state.entries, index, complete, file.status]);
  const card = ({ entry, outdated }) => <div key={entry.id} className="sdiff-comment-row" data-line-annotation="" data-comment-key={entry.id}>
    <FileCommentCard entry={entry} active={state.active === entry.id} store={store} placeholder={t("Tell Claude what to change")} outdated={outdated}
      onSave={(saved, options) => {
        const key = diffCommentAttachmentKey(scope, file.path, saved.id);
        if (actions.current?.onSaveComment) actions.current.onSaveComment({ ...saved, path, key }, options);
        else addToPrompt(serializeLineComment({ path, start: saved.start, end: saved.end, side: saved.side, code: saved.code ?? "", text: saved.body }));
      }}
      onDelete={(removed) => actions.current?.onDeleteComment?.({ ...removed, path, key: diffCommentAttachmentKey(scope, file.path, removed.id) })} />
  </div>;
  const renderCards = (anchors) => {
    if (!enabled || !state.entries.length) return null;
    const items = anchors.flatMap((anchor) => (anchor ? placed.byAnchor.get(`${anchor.side}:${anchor.line}`) ?? [] : []));
    return items.length ? items.map(card) : null;
  };
  const unplacedCards = enabled && placed.unplaced.length ? placed.unplaced.map(card) : null;

  // Line-number drag (Ho selectionEnd): rows from the pressed one to the one under the pointer, in one column.
  const [drag, setDrag] = useState(null);
  const onPointerDown = (event) => {
    if (!enabled || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    lastDrag.current = null; // Ho selectionStart
    const handle = event.target.closest?.(".sdiff-line-number, .sdiff-gutter-add");
    const row = handle?.closest(ROW);
    if (!row || !bodyRef.current?.contains(row)) return;
    if (handle.classList.contains("sdiff-line-number")) event.preventDefault();
    setDrag({ start: row, end: row, column: row.dataset.column || "unified" });
  };
  useEffect(() => {
    if (!drag) return undefined;
    const body = bodyRef.current, doc = body?.ownerDocument;
    if (!body) return undefined;
    const between = (end) => {
      const rows = [...body.querySelectorAll(ROW)].filter((row) => (row.dataset.column || "unified") === drag.column);
      const a = rows.indexOf(drag.start), b = rows.indexOf(end);
      return a < 0 || b < 0 ? [] : rows.slice(Math.min(a, b), Math.max(a, b) + 1);
    };
    let marked = [];
    const mark = (rows) => { for (const row of marked) row.removeAttribute("data-line-selected"); marked = rows; for (const row of rows) row.setAttribute("data-line-selected", ""); };
    let end = drag.end;
    const move = (event) => {
      const row = doc.elementFromPoint(event.clientX, event.clientY)?.closest?.(ROW);
      if (!row || !body.contains(row) || (row.dataset.column || "unified") !== drag.column) return;
      end = row;
      mark(between(end));
    };
    const up = () => {
      const rows = between(end);
      mark([]);
      setDrag(null);
      if (rows.length < 2) return;
      const span = diffSelectionSpan(rows.map((row) => ({ ...rowInfo(row), text: "" })));
      if (!span) return;
      const info = rowInfo(end);
      lastDrag.current = { line: info.line, side: info.side };
      openDraft(span.startLine, span.endLine, span.side);
    };
    const cancel = () => { mark([]); setDrag(null); };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up, { once: true });
    doc.addEventListener("pointercancel", cancel, { once: true });
    return () => { mark([]); doc.removeEventListener("pointermove", move); doc.removeEventListener("pointerup", up); doc.removeEventListener("pointercancel", cancel); };
  }, [drag, bodyRef, openDraft]);

  // vt/yt: the active card's lines stay picked (tinted) while it is open, unless a drag is picking others; a
  // one-line card tints nothing. In split view the card's side is its column.
  const ranged = useRef([]);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const entry = enabled && !drag && state.active ? state.entries.find((item) => item.id === state.active) : null;
    let rows = [];
    if (body && entry && entry.start !== entry.end) {
      const all = [...body.querySelectorAll(ROW)];
      const column = all.some((row) => row.dataset.column === "unified") ? "unified" : entry.side === "deletions" ? "before" : "after";
      const list = all.filter((row) => (row.dataset.column || "unified") === column);
      const at = (line) => (row) => row.dataset.commentSide === entry.side && Number(row.dataset.commentLine) === line;
      const first = list.findIndex(at(entry.start)), last = list.findLastIndex(at(entry.end));
      if (first >= 0 && last >= first) rows = list.slice(first, last + 1);
    }
    const previous = ranged.current;
    if (previous.length === rows.length && previous.every((row, index) => row === rows[index] && row.hasAttribute("data-comment-range"))) return;
    for (const row of previous) row.removeAttribute("data-comment-range");
    for (const row of rows) row.setAttribute("data-comment-range", "");
    ranged.current = rows;
  });

  // yo: the selection chip.
  const [chip, setChip] = useState(null);
  const chipTimer = useRef(null), chipTimerStop = useRef(null);
  // O: the pending multi-click chip and its wheel/scroll cancel listeners go together.
  const clearTimer = () => {
    if (chipTimer.current !== null) { clearTimeout(chipTimer.current); chipTimer.current = null; }
    chipTimerStop.current?.(); chipTimerStop.current = null;
  };
  useEffect(() => () => clearTimer(), []);
  const showChip = useCallback((clientX, clientY) => {
    const body = bodyRef.current;
    if (!body) return;
    const rows = selectedRows(body);
    const span = rows ? diffSelectionSpan(rows) : null;
    if (!span) { setChip(null); return; }
    const rect = body.getBoundingClientRect();
    setChip({ ...selectionChipPosition({ clientX, clientY, left: rect.left, width: rect.width, scrollerTop: scrollerTop(body) }), span,
      lines: anchorDiffSpan(file.hunks, span.startLine, span.endLine, span.side, { partial: !complete }) });
  }, [bodyRef, file.hunks, complete]);
  const onMouseUp = (event) => {
    clearTimer();
    if (!enabled || event.button !== 0 || event.target.closest?.("[data-file-comment-card], [data-diff-file-header]")) return;
    const { clientX, clientY, detail } = event;
    // A double or triple click settles its selection first (po); a wheel or scroll meanwhile drops it (M).
    if (detail >= 2) {
      const doc = bodyRef.current?.ownerDocument, view = doc?.defaultView, stop = () => clearTimer();
      doc?.addEventListener("wheel", stop, { capture: true, passive: true });
      view?.addEventListener("scroll", stop, { capture: true, passive: true });
      chipTimerStop.current = () => { doc?.removeEventListener("wheel", stop, { capture: true }); view?.removeEventListener("scroll", stop, { capture: true }); };
      chipTimer.current = setTimeout(() => { chipTimer.current = null; chipTimerStop.current?.(); chipTimerStop.current = null; showChip(clientX, clientY); }, SELECTION_CHIP.multiClickDelay);
    } else showChip(clientX, clientY);
  };
  useEffect(() => {
    if (!chip) return undefined;
    const body = bodyRef.current, doc = body?.ownerDocument, view = doc?.defaultView;
    if (!body || !view) return undefined;
    const hide = () => setChip(null);
    const changed = () => {
      const rows = selectedRows(body), span = rows ? diffSelectionSpan(rows) : null;
      if (!span || span.startLine !== chip.span.startLine || span.endLine !== chip.span.endLine || span.side !== chip.span.side) hide();
    };
    const key = selectionChipEscape(doc, hide);
    doc.addEventListener("selectionchange", changed);
    doc.addEventListener("keydown", key, { capture: true });
    doc.addEventListener("wheel", hide, { capture: true, passive: true });
    view.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => {
      doc.removeEventListener("selectionchange", changed);
      doc.removeEventListener("keydown", key, { capture: true });
      doc.removeEventListener("wheel", hide, { capture: true });
      view.removeEventListener("scroll", hide, { capture: true });
    };
  }, [chip, bodyRef]);
  const commentSelection = (span) => {
    openDraft(span.startLine, span.endLine, span.side);
    bodyRef.current?.ownerDocument.defaultView.getSelection()?.removeAllRanges();
    setChip(null);
  };

  // yo onContextMenuCapture: the body menu over the selection, else the row under the pointer.
  const [menu, setMenu] = useState(null);
  const deleted = file.status === "deleted";
  const onAttachFile = !deleted && file.path && fileActions?.onAttachFile ? fileActions.onAttachFile : null;
  const onContextMenu = (event) => {
    const body = bodyRef.current;
    if (!body || event.target.closest?.("[data-file-comment-card], [data-diff-file-header]")) return;
    const rows = selectedRows(body);
    const span = rows ? diffSelectionSpan(rows) : null;
    const element = span ? null : event.target.closest?.(ROW);
    const row = element && body.contains(element)
      ? { ...rowInfo(element), text: element.querySelector(".sdiff-line-content")?.textContent ?? "" } : null;
    // A selection here that covers no code row, or nothing to offer: no menu.
    if ((rows && rows.length && !span) || (rows && !rows.length) || (!span && !row && !onAttachFile)) { event.stopPropagation(); return; }
    event.preventDefault();
    event.stopPropagation();
    clearTimer();
    setChip(null);
    const commentSpan = span ? { startLine: span.startLine, endLine: span.endLine, side: span.side } : row ? { startLine: row.line, endLine: row.line, side: row.side } : null;
    setMenu({ x: event.clientX, y: event.clientY, span, row,
      comment: enabled && commentSpan ? { span: commentSpan, lines: anchorDiffSpan(file.hunks, commentSpan.startLine, commentSpan.endLine, commentSpan.side, { partial: !complete }) } : null });
  };
  const copy = (text) => {
    if (actions.current?.onCopy) actions.current.onCopy(text);
    else void globalThis.navigator?.clipboard?.writeText(text)?.catch(() => {});
  };
  const overlays = <>
    {chip && bodyRef.current && createPortal(<div className="source-selection-toolbar cds-root sdiff-selection-chip" role="toolbar" aria-label={t("Selection actions")} data-pane-editor=""
      style={{ transform: `translate(${Math.round(chip.x)}px, ${Math.round(chip.y)}px) ${chip.flipBelow ? `translate(-50%, ${SELECTION_CHIP.gap}px)` : `translate(-50%, calc(-100% - ${SELECTION_CHIP.gap}px))`}` }}>
      <SourceSettingsButton variant="ghost" aria-label={addCommentLabel(chip.lines)} onMouseDown={(event) => event.preventDefault()} onClick={() => commentSelection(chip.span)}>{t("Add comment")}</SourceSettingsButton>
    </div>, bodyRef.current.ownerDocument.body)}
    {menu && <SourceMenu.Popup anchor={bodyRef.current} trigger={null} point={{ x: menu.x, y: menu.y }} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu"
      // c44d00c7f En (c82eca2bd Be): a right-click on the Changes context menu never opens the native menu over it.
      onContextMenu={preventContextMenu}
      label={t("{path} actions", { path })} onClose={() => setMenu(null)}>
      {onAttachFile && <SourceMenu.Item onClick={() => onAttachFile(file.path)}>{t("Attach as context")}</SourceMenu.Item>}
      {menu.comment && <SourceMenu.Item aria-label={addCommentLabel(menu.comment.lines)}
        onClick={() => (menu.span ? commentSelection(menu.span) : openDraft(menu.comment.span.startLine, menu.comment.span.endLine, menu.comment.span.side))}>{t("Add comment")}</SourceMenu.Item>}
      {(onAttachFile || menu.comment) && <SourceMenu.Separator />}
      {/* c82eca2bd ft with readOnly: only Copy, no Select all. */}
      <SourceMenu.Item shortcut="cmd+c" disabled={!menu.span && !menu.row}
        onClick={() => { if (menu.span) copy(menu.span.lineTexts.join("\n")); else if (menu.row) copy(menu.row.text); }}>{t("Copy")}</SourceMenu.Item>
    </SourceMenu.Popup>}
  </>;

  return {
    enabled,
    onGutterAdd: enabled ? onGutterAdd : null,
    rowTargets: menuEnabled,
    renderCards,
    unplacedCards,
    bodyProps: enabled ? { onPointerDown, onMouseUp, onContextMenu, "data-diff-body-menu-trigger": "" }
      : menuEnabled ? { onContextMenu, "data-diff-body-menu-trigger": "" } : {},
    overlays: menuEnabled ? overlays : null,
  };
}
