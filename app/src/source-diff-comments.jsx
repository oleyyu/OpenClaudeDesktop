// Changes-pane line comments (B14 D4/D5): inline annotation cards and the diff body's selection chip / context menu.
// Ported from 2.31226.0 c44d00c7f: ha/ga (readable 2732-2810) the saved/draft cards with the 'Tell Claude what to
// change' placeholder, Ca (2925-2943) the gutter "+", Ho (4071-4145) openDraft/hoverAdd/selectionEnd, yo (3564-3860)
// the selection chip (onMouseUp), its dismissal (selectionchange/Escape/wheel/scroll) and the body context menu
// (onContextMenuCapture: Attach as context, Add comment, Copy). W14-code r8 (r8pa-02): the card is the official one, c44d00c7f
// Fc (c82eca2bd st with the "Tell Claude what to change" placeholder), as Jd's per-file list (Md → Pc) draws it in a
// pop-out window or with the pierre switch off; it reads and writes the cc8941b7b store itself. A comment the store saves
// goes out with the next message as a keyed composer snippet, exactly as Files comments do (main.jsx onSaveComment), or
// through the add-to-prompt relay in a popped-out pane window (useFileLineCommentBridge below).
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PierreChangesCommentCard } from "./generated/pierre-changes/pierre-changes.mjs";
import { SourceMenu } from "./source-menu.jsx";
// The selection chip (W12 diff-main): ceb49ada3 Tt over the view-tabs layer provider / layer-aware z-index.
import { CdsLayerProvider, useCdsLayerAwareZIndex } from "./generated/view-tabs/index.js";
import { SelectionActionBar } from "./generated/code-current/terminal-action-bar.mjs";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import { addToPrompt, serializeLineComment } from "./inline-comments.mjs";
import { SELECTION_CHIP, addCommentLabel, anchorDiffSpan, createAnnotationCommentsStore, diffCommentAttachmentKey, diffCommentKey, diffCommentOutdated, diffCommentSession,
  diffLineIndex, diffSelectionSpan, diffSpanText, importLegacyDiffComments, legacyDiffCommentKeys, placeDiffComment, selectionChipPosition, DIFF_COMMENTS_PREFIX } from "./diff-comments-model.mjs";
// W14-code r7 (r7pa-03): the official comment store (cc8941b7b F, its body texts P), shared with the pierre body.
import { useDiffAnnotationStore, P as diffAnnotationBodies } from "./generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs";
import { t } from "../electron/i18n/index.mjs";
import { suppressEscapeRepeat } from "./generated/code-editor-current/keyboard-repeat.mjs";
import { preventContextMenu } from "./generated/files-changes/diff-context-guard.mjs";
import { NO_PR_COMMENT_STOPS, prCommentComposing, prCommentMatch, prCommentShortcutsEnabled, prCommentStepIndex } from "./diff-pr-comment-nav-model.mjs";

// W14-code r7 (r7pa-03): one file's comments over the official store (diff-comments-model createAnnotationCommentsStore),
// whichever Changes body draws them; its comments imported once from the host's pre-r7 storage first.
const commentStores = new Map();
const hostStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
export function diffFileCommentsStore(scope, path) {
  const key = `${scope}\0${path}`;
  if (!commentStores.has(key)) {
    importLegacyDiffComments({ storage: hostStorage(), store: useDiffAnnotationStore, bodies: diffAnnotationBodies, key: DIFF_COMMENTS_PREFIX + key });
    commentStores.set(key, createAnnotationCommentsStore({ sessionId: diffCommentSession(scope), path, store: useDiffAnnotationStore, bodies: diffAnnotationBodies }));
  }
  return commentStores.get(key);
}
// F persists under "diff-annotations" (zustand persist, read once when the window loads). Two host adjustments in a
// window (browser only; the server render has no persist):
// - the host review store (review-findings-model.mjs) owns the review fields of the same key, so F writes back only its
//   comment fields (annotationsBySession, sentPrIdsBySession) over what is stored, and a re-read takes only those;
// - a write from another window (the pop-out Changes pane, or the main window) is read again here (the storage event),
//   so both windows show the same comments, as the host store did. annotationStoreSyncing() is true during that read:
//   comments arriving from another window are not this window's saves (the pierre bridge does not send them on).
export const ANNOTATION_STORE_KEY = "diff-annotations";
const COMMENT_FIELDS = ["annotationsBySession", "sentPrIdsBySession"];
let syncing = 0;
export const annotationStoreSyncing = () => syncing > 0;
export function annotationCommentStorage(storage) {
  const parse = (raw) => { try { const value = raw == null ? null : JSON.parse(raw); return value && typeof value === "object" ? value : null; } catch { return null; } };
  return {
    getItem: (name) => parse(storage.getItem(name)),
    setItem: (name, value) => {
      const stored = parse(storage.getItem(name))?.state;
      const kept = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
      const own = Object.fromEntries(COMMENT_FIELDS.filter((field) => value?.state?.[field] !== undefined).map((field) => [field, value.state[field]]));
      storage.setItem(name, JSON.stringify({ ...value, state: { ...kept, ...own } }));
    },
    removeItem: (name) => storage.removeItem(name),
  };
}
export const mergeAnnotationComments = (persisted, current) => ({ ...current,
  ...Object.fromEntries(COMMENT_FIELDS.filter((field) => persisted?.[field] && typeof persisted[field] === "object").map((field) => [field, persisted[field]])) });
if (typeof window !== "undefined" && useDiffAnnotationStore.persist) {
  const storage = hostStorage();
  if (storage) {
    useDiffAnnotationStore.persist.setOptions({ storage: annotationCommentStorage(storage), merge: mergeAnnotationComments });
    for (const key of legacyDiffCommentKeys(storage)) importLegacyDiffComments({ storage, store: useDiffAnnotationStore, bodies: diffAnnotationBodies, key });
    window.addEventListener("storage", (event) => {
      if (event.key !== ANNOTATION_STORE_KEY || (event.storageArea && event.storageArea !== storage)) return;
      syncing++;
      try { useDiffAnnotationStore.persist.rehydrate(); } finally { syncing--; }
    });
  }
}

// W14-code r8 (r8pa-02): the composer side of the official card on the host rows, per file. The card saves into F
// (addAnnotation / updateAnnotation / removeAnnotation) and calls onSaved only after a keyboard save (`t.viaKeyboard &&
// v?.({submit})`); as source-diff.jsx usePierreCommentBridge does for the pierre body, each line comment F saves, edits or
// removes for this file is written to or taken out of the composer, and the keyboard save focuses / submits it.
const isFileLineComment = (annotation) => !!annotation && annotation.source !== "pr" && annotation.source !== "file" && annotation.source !== "finding";
export function fileLineComments(state, sessionId, filePath) {
  const out = new Map();
  for (const annotation of state.annotationsBySession?.[sessionId]?.[filePath] ?? []) if (isFileLineComment(annotation)) out.set(annotation.id, annotation);
  return out;
}
export function lineCommentSnippet(annotation, { scope, filePath, path }) {
  return { id: diffCommentKey(annotation.side, annotation.endLine), annotationId: annotation.id, side: annotation.side, start: annotation.startLine,
    end: annotation.endLine, code: annotation.snippet ?? "", body: annotation.body, savedBody: annotation.body, path,
    key: diffCommentAttachmentKey(scope, filePath, annotation.id) };
}
/** Calls onSaved(annotation) for each comment select(state) gains or changes (not while another window's write is read
 * in), onRemoved(annotation) for each it loses; returns the unsubscribe. select returns a Map id → annotation. */
export function subscribeCommentChanges(store, select, { onSaved, onRemoved, syncing = annotationStoreSyncing }) {
  let known = select(store.getState());
  return store.subscribe((state) => {
    const next = select(state), saved = [], removed = [];
    for (const [id, annotation] of next) if (known.get(id) !== annotation) saved.push(annotation);
    for (const [id, annotation] of known) if (!next.has(id)) removed.push(annotation);
    known = next;
    for (const annotation of syncing() ? [] : saved) onSaved(annotation);
    for (const annotation of removed) onRemoved(annotation);
  });
}
function useFileLineCommentBridge({ enabled, scope, sessionId, filePath, path, fileActions }) {
  const actions = useRef(fileActions);
  actions.current = fileActions;
  const lastSaved = useRef(null);
  const where = useRef(null);
  where.current = { scope, filePath, path };
  const send = useCallback((annotation, options) => {
    const entry = lineCommentSnippet(annotation, where.current);
    if (actions.current?.onSaveComment) actions.current.onSaveComment(entry, options);
    else if (!options.viaKeyboard) addToPrompt(serializeLineComment({ path: entry.path, start: entry.start, end: entry.end, side: entry.side, code: entry.code, text: entry.body }));
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    // Comments read in from another window's write are that window's saves; a comment deleted there still leaves here.
    return subscribeCommentChanges(useDiffAnnotationStore, (state) => fileLineComments(state, sessionId, filePath), {
      onSaved: (annotation) => { lastSaved.current = annotation; send(annotation, { viaKeyboard: false, submit: false }); },
      onRemoved: (annotation) => {
        if (lastSaved.current?.id === annotation.id) lastSaved.current = null;
        actions.current?.onDeleteComment?.(lineCommentSnippet(annotation, where.current));
      },
    });
  }, [enabled, sessionId, filePath, send]);
  return useCallback((options) => {
    const annotation = lastSaved.current;
    if (annotation && actions.current?.onSaveComment) send(annotation, { viaKeyboard: true, submit: options?.submit === true });
  }, [send]);
}

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

/** panes:C2-7, c44d00c7f Jd (3.6556.2) `Fn({command:"nextPrComment",...Qn(1)})` / prevPrComment Qn(-1): ⌥F9 / ⇧⌥F9
 * (not on Linux) on the Changes pane's [data-pane-root] or dialog (else the diff root) step to the next / previous open
 * PR review comment, wrapping (cc8941b7b rt). `prComments` is the session's {all, open} ids in file order (cc8941b7b $e);
 * `onStep(id)` brings that comment's card into view (Jd It → js, control "card"). Enabled as Qn: the keyboard gate, files
 * listed, and at least one open comment — OpenClaude has no PR review comments, so the binding is mounted but off. */
export function usePrCommentShortcuts({ rootRef, files = 0, prComments = NO_PR_COMMENT_STOPS, onStep, linux }) {
  const enabled = prCommentShortcutsEnabled({ files, open: prComments.open.length });
  const latest = useRef({ prComments, onStep });
  latest.current = { prComments, onStep };
  const lastStop = useRef(null);
  useEffect(() => {
    const view = rootRef.current;
    if (!enabled || !view) return undefined;
    const target = view.closest('[data-pane-root], [role="dialog"]') ?? view;
    const onKeyDown = (event) => {
      // ca6e98a55: n (match, not while the window is hidden), then r `e.preventDefault(), e.repeat || v(e)`; Qn onMatch
      // holds back an IME composition after the preventDefault.
      const delta = prCommentMatch(event, { hidden: !!target.ownerDocument?.hidden, ...(linux === undefined ? {} : { linux }) });
      if (!delta) return;
      event.preventDefault();
      if (event.repeat || prCommentComposing(event)) return;
      const { prComments: stops, onStep: step } = latest.current;
      if (stops.open.length === 0) return;
      const id = stops.open[prCommentStepIndex(stops, lastStop.current, delta, true)];
      if (id === undefined) return;
      lastStop.current = id;
      step?.(id);
    };
    target.addEventListener("keydown", onKeyDown);
    return () => target.removeEventListener("keydown", onKeyDown);
  }, [enabled, rootRef, linux]);
  return enabled;
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
  // r8pa-02: Pc's saved / draft branches of Fc (c44d00c7f): cardKey side:endLine, the F annotation or draft itself, isOutdated
  // per la, onSaved the composer's keyboard path; instanceId is this list's (activation origin, Le registration).
  const sessionId = enabled ? diffCommentSession(scope) : null;
  const instanceId = useId();
  const onSaved = useFileLineCommentBridge({ enabled, scope, sessionId, filePath: file.path, path, fileActions });
  const card = ({ entry, outdated }) => {
    const data = useDiffAnnotationStore.getState();
    const annotation = entry.savedBody !== undefined ? data.annotationsBySession?.[sessionId]?.[file.path]?.find((item) => item.id === entry.annotationId) : undefined;
    const draft = annotation ? undefined : data.draftsBySession?.[sessionId]?.[file.path]?.[entry.id];
    if (!annotation && !draft) return null;
    return <div key={annotation?.id ?? entry.id} className="sdiff-comment-row" data-line-annotation="" data-comment-key={entry.id} data-file-comment-card="">
      <PierreChangesCommentCard sessionId={sessionId} filePath={file.path} cardKey={diffCommentKey(entry.side, entry.end)} instanceId={instanceId}
        annotation={annotation} draft={draft} isOutdated={outdated} onSaved={onSaved} />
    </div>;
  };
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
  const chipZIndex = useCdsLayerAwareZIndex(4);
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
    // Bl: positioned in the file wrapper (the .sdiff-file section, `relative`), where the chip renders.
    const rect = (body.closest(".sdiff-file") ?? body).getBoundingClientRect();
    setChip({ ...selectionChipPosition({ clientX, clientY, left: rect.left, top: rect.top, width: rect.width, scrollerTop: scrollerTop(body) }), span,
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
    {/* c44d00c7f Bl `_e`: `div.absolute.isolate[data-pane-editor]` in the file wrapper at the pointer (zIndex R(4), the
        layer-aware view-tabs useCdsLayerAwareZIndex) around shared-frame ou (view-tabs CdsLayerProvider) and ceb49ada3 Tt,
        the selection action bar the terminal also renders (generated code-current/terminal-action-bar.mjs), with one
        action: Add comment (aria-label Nn = cf56e4ee1 t, the line range). */}
    {chip && <div className="absolute isolate" data-pane-editor=""
      style={{ left: chip.x, top: chip.y, transform: chip.flipBelow ? `translate(-50%, ${SELECTION_CHIP.gap}px)` : `translate(-50%, calc(-100% - ${SELECTION_CHIP.gap}px))`, zIndex: chipZIndex }}>
      <CdsLayerProvider>
        <SelectionActionBar actions={[{ key: "add-comment", label: t("Add comment"), ariaLabel: addCommentLabel(chip.lines), onSelect: () => commentSelection(chip.span) }]} />
      </CdsLayerProvider>
    </div>}
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
