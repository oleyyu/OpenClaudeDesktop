import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { addToPrompt, planCommentsStore, serializePlanComments } from "./inline-comments.mjs";
import { PLAN_COMMENT_ID, PLAN_COMMENT_SKIP, PLAN_SCROLL, domPlanOffsets, planCommentOverlaps, planPopoverPlacement, rehypePlanComments } from "./plan-comments-model.mjs";
import { Icon } from "./icons";
import { SourceTooltip } from "./source-tooltip";
import { createClipboardFeedback } from "./clipboard-feedback.mjs";
import { SourcePlanChecklist } from "./source-plan-checklist.jsx";
import { suppressEscapeRepeat } from "./generated/code-editor-current/keyboard-repeat.mjs";
import { ownerWindow } from "./generated/files-changes/owner-window.mjs";
import "./source-plan-pane.css";
import { t } from "../electron/i18n/index.mjs";

// Xh (2.31226.0 cccc2cf0a :1411-1448) over plan {content, todos}. The plan document is the latest proposed plan
// (state.planDocs: the Codex `plan` item, which the DeepSeek bridge projects from exit_plan_mode); the todos are
// turn/plan/updated. Every branch is Kh, the h-full select-text scroller (data-epitaxy-plan-scroll) around the
// mx-auto 68ch column. Content: Gh, the zh comment hint, then the Markdown in the CDS Prose (Oi font sans, size sm)
// under the Rh comment layer, then qh when todos exist. Todos only: qh, section.mt-pad-lg with the caption heading
// "Tasks" above the ZO list. Neither: SourcePlanEmpty (Jh). Not ported: $h's "Open in" menu, which needs a plan file
// path that no local core reports (the plan document is the plan item's text).
// renderMarkdown(text, extension) is the pane's response renderer (SourceMarkdown with the comment marks extension).
const SCROLLER = "h-full select-text overflow-y-auto [contain:strict] [scrollbar-gutter:stable_both-edges] p-lg";
function SourcePlanTasks({ plan }) {
  return (
    <section className="mt-pad-lg source-plan-tasks">
      <h2 className="text-caption-medium uppercase tracking-wide text-muted mb-1.25">{t("Tasks")}</h2>
      <SourcePlanChecklist plan={plan} />
    </section>
  );
}

// zh (:1229-1244): ChatSimple xs and the hint; with comments off, where they can be left (Xh o).
export const PLAN_COMMENT_HINTS = Object.freeze({
  enabled: t("Select any text to leave a comment for DeepSeek"),
  disabled: t("You can comment on the plan in plan mode, or when DeepSeek asks you to approve it."),
});
function SourcePlanCommentHint({ enabled }) {
  return <div className="mb-[var(--chat-item-gap)] flex items-center gap-1 text-caption text-muted spp-comment-hint" data-comments-enabled={enabled ? "" : undefined}>
    <Icon name="ChatSimple" size={12} />
    <span>{enabled ? PLAN_COMMENT_HINTS.enabled : PLAN_COMMENT_HINTS.disabled}</span>
  </div>;
}

// Lh (:1081-1117): a comment's text is mark[data-plan-comment-id] (accent underline, 10% accent fill, 20% while any
// mark of that comment is hovered; px-0 in the Prose) around a role=button span: hover highlights the comment, click
// or Enter/Space opens it in the editor.
const MARK_CLASS = "rounded-[2px] text-inherit underline decoration-[var(--cds-fill-accent)] decoration-2 underline-offset-2";
const MARK_HOVERED = "bg-[hsl(from_var(--cds-fill-accent)_h_s_l/20%)]", MARK_REST = "bg-[hsl(from_var(--cds-fill-accent)_h_s_l/10%)]";
const PlanCommentContext = createContext(null);
const PlanCommentMark = React.memo(function PlanCommentMark({ node, children, ...props }) {
  const layer = useContext(PlanCommentContext);
  const id = props[PLAN_COMMENT_ID];
  if (!layer || !id) return <mark>{children}</mark>;
  const open = (event) => { event.stopPropagation(); layer.onMarkClick(id, event.currentTarget); };
  return <mark {...{ [PLAN_COMMENT_ID]: id }} className={`${MARK_CLASS} ${layer.hoveredId === id ? MARK_HOVERED : MARK_REST} px-0`}>
    <span role="button" tabIndex={0} className="text-inherit rounded-[2px] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"
      onMouseEnter={() => layer.onMarkHover(id)} onMouseLeave={() => layer.onMarkHover(null)} onClick={open}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(event); } }}>{children}</span>
  </mark>;
});
const MARK_COMPONENTS = Object.freeze({ mark: PlanCommentMark });
const SKIP_ATTRIBUTES = Object.freeze({ [PLAN_COMMENT_SKIP]: "" });

// Na → c82eca2bd H/U, variant floating (cd5a31703 wot :95550-95900): a fixed 320px popover dialog "Comment on
// selection" (the popover surface: rounded-card bg-surface-3 shadow-panel) under the commented range, its textarea
// labelled "Plan comment" (field-sizing content, up to 8 lines) with the ChatAdd "Save comment" button and, for a
// saved comment, the Trash "Delete comment" button. Enter saves, Shift+Enter breaks the line, Escape and an outside
// press with nothing typed (or nothing changed) close it, Tab cycles inside it. While a new selection is being
// commented the range keeps its selection colour through the CSS Highlight API (epitaxy-plan-selection).
const ICON_BUTTON = "rounded-sm p-0.75 text-muted hover:bg-fill-ghost-hover hover:text-primary disabled:opacity-40";
const FIELD = "hide-focus-ring focus-visible:outline-hidden flex-1 min-w-0 resize-none border-none bg-transparent text-body";
const HIGHLIGHT = "epitaxy-plan-selection";
const rectsOf = (range) => {
  if (!range.startContainer.isConnected || range.collapsed) return null;
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 || rect.height > 0);
  return rects.length ? { first: rects[0], last: rects.at(-1) } : null;
};
// R3b-tasks (tasks-12). The popover's document capture keydown (2.42304.0 c96d752d0 Cat `t`; 2.37337.1 cd5a31703 Wlt):
// for a key inside the card, a composing key only keeps an Escape from leaking out, Tab cycles the textarea and the
// enabled buttons, and Escape (preventDefault + stopPropagation) closes the popover. It runs in the capture phase on the
// document, before React dispatches the key to the field, so the field's Escape branch below never sees a key typed in
// the card — and, as in 2.42304.0, the auto-repeats of a held Escape are not swallowed after it closes.
export function planPopoverDocumentKeyDown(event, { card, dismiss }) {
  if (!card?.contains(event.target)) return;
  if (event.isComposing || event.keyCode === 229) { if (event.key === "Escape") event.stopPropagation(); return; }
  if (event.key === "Tab") {
    const stops = [...card.querySelectorAll("textarea, button:not([disabled])")];
    if (!stops.length) return;
    event.preventDefault();
    const at = stops.indexOf(event.target);
    stops[event.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at + 1) % stops.length].focus();
    return;
  }
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); }
}
// The field's keydown (c82eca2bd Se `me`, the comment editor the popover renders with variant "floating"): Enter saves (a
// held Enter saves once), Shift+Enter and Alt+Enter break the line. Escape: preventDefault, stopPropagation inside a
// dialog, then, for an editable field, pZ(up(field)) — the owner window swallows the held Escape's auto-repeats until
// keyup or another key — and cancel. Unreachable in the Plan popover while its document listener claims Escape first
// (the same holds for Cat around Se in 2.42304.0); kept as the official field branch.
export function planCommentFieldKeyDown(event, { save, cancel, readOnly = false }) {
  if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
  if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) save();
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (event.currentTarget.closest('[role="dialog"], [role="alertdialog"]')) event.stopPropagation();
    if (!readOnly) { const view = ownerWindow(event.currentTarget); if (view) suppressEscapeRepeat(view); }
    cancel();
  }
}
export function PlanCommentPopover({ range, selectedText, initialValue, isEditing, onSubmit, onChange, onDelete, onDismiss, boundaryRef }) {
  const card = useRef(null), field = useRef(null), side = useRef(null);
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(value);
  valueRef.current = value;
  const doc = range.startContainer.ownerDocument ?? document;
  const view = doc.defaultView ?? window;
  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.setSelectionRange(node.value.length, node.value.length);
    node.scrollTop = node.scrollHeight;
  }, []);
  // The new selection's colour while the field has the focus.
  useLayoutEffect(() => {
    const highlights = view.CSS?.highlights;
    if (isEditing || !highlights || typeof view.Highlight !== "function") return undefined;
    highlights.set(HIGHLIGHT, new view.Highlight(range));
    return () => { highlights.delete(HIGHLIGHT); };
  }, [range, isEditing, view]);
  useLayoutEffect(() => {
    const node = card.current;
    if (!node) return undefined;
    let frame = null;
    const place = () => {
      const box = node.getBoundingClientRect(), rects = rectsOf(range);
      if (!rects && node.style.transform) return;
      const at = planPopoverPlacement({ ...(rects ?? {}), card: { width: box.width, height: box.height },
        boundary: boundaryRef?.current?.getBoundingClientRect() ?? null, viewport: { width: view.innerWidth, height: view.innerHeight }, chosen: side.current });
      if (rects) side.current = at.side;
      node.style.transform = `translate(${at.x}px, ${at.y}px) translateX(-50%)`;
    };
    const schedule = () => { if (frame === null) frame = view.requestAnimationFrame(() => { frame = null; place(); }); };
    place();
    doc.addEventListener("scroll", schedule, { capture: true, passive: true });
    view.addEventListener("resize", schedule);
    const observer = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(place) : null;
    observer?.observe(node);
    if (boundaryRef?.current) observer?.observe(boundaryRef.current);
    return () => {
      doc.removeEventListener("scroll", schedule, { capture: true });
      view.removeEventListener("resize", schedule);
      observer?.disconnect();
      if (frame !== null) view.cancelAnimationFrame(frame);
    };
  }, [range, boundaryRef, doc, view]);
  useEffect(() => {
    const press = (event) => {
      const current = valueRef.current;
      if (event.button === 0 && card.current && !card.current.contains(event.target) && (current.trim() === "" || current === initialValue)) onDismiss();
    };
    const keys = (event) => planPopoverDocumentKeyDown(event, { card: card.current, dismiss: onDismiss });
    doc.addEventListener("pointerdown", press, true);
    doc.addEventListener("keydown", keys, true);
    return () => { doc.removeEventListener("pointerdown", press, true); doc.removeEventListener("keydown", keys, true); };
  }, [doc, initialValue, onDismiss]);
  const change = (next) => { setValue(next); onChange?.(next); };
  const save = () => { const text = value.trim(); if (text) onSubmit(text); };
  const keyDown = (event) => planCommentFieldKeyDown(event, { save, cancel: onDismiss });
  // Ce: copying or cutting with nothing selected in the field copies the commented text.
  const copyQuote = (event) => {
    const input = event.currentTarget;
    if (input.selectionStart !== input.selectionEnd) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", selectedText);
  };
  const saveLabel = t("Save comment"), deleteLabel = t("Delete comment");
  return createPortal(<div ref={card} role="dialog" tabIndex={-1} aria-label={t("Comment on selection")} data-plan-comment-popover=""
    className="epitaxy-root cds-root text-body text-primary break-words draggable-none fixed left-0 top-0 isolate w-[320px] outline-none rounded-card bg-surface-3 shadow-panel spp-comment-popover"
    style={{ zIndex: 490, willChange: "transform", "--cds-layer-base": "490" }}>
    <div className="group/card relative isolate flex flex-col transition-colors gap-xs px-lg py-2.5 font-sans rounded-[inherit]">
      <div className="flex items-center gap-1">
        <textarea ref={field} value={value} rows={1} aria-label={t("Plan comment")} placeholder={t("Add a comment")}
          className={`${FIELD} text-primary placeholder:text-muted`} style={{ fieldSizing: "content", maxHeight: "8lh" }}
          onChange={(event) => change(event.target.value)} onKeyDown={keyDown} onCopy={copyQuote} onCut={copyQuote} />
        <div className={`shrink-0 h-[24px] flex items-center ${isEditing ? "gap-0.75" : "w-[24px] justify-center"} self-end`}>
          {isEditing && <SourceTooltip content={deleteLabel}>
            <button type="button" className={`${ICON_BUTTON} hover:text-danger`} aria-label={deleteLabel} onClick={onDelete}><Icon name="Trash" size={14} /></button>
          </SourceTooltip>}
          <SourceTooltip content={saveLabel}>
            <span className="inline-flex">
              <button type="button" className={ICON_BUTTON} aria-label={saveLabel} disabled={!value.trim()} onClick={save}><Icon name="ChatAdd" size={16} /></button>
            </span>
          </SourceTooltip>
        </div>
      </div>
    </div>
  </div>, doc.body);
}

// Rh (:1118-1228): the comment layer over the plan Prose. A mouse selection inside the plan scroller (after a
// double-click, once 250ms pass without a third click) opens the editor for that text unless it is blank or overlaps
// a comment; while a draft has been typed into, a new selection does not replace it. A mark opens its comment. When
// the editor closes, focus goes back to the mark it came from.
const IDLE = Object.freeze({ mode: "idle" });
function usePlanCommentLayer({ sessionId, canAdd, containerRef }) {
  const [state, setState] = useState(IDLE);
  const [hoveredId, setHoveredId] = useState(null);
  const modeRef = useRef("idle");
  modeRef.current = state.mode;
  const draft = useRef({ opened: "", current: "" });
  const returnFocus = useRef(null), boundary = useRef(null);
  useLayoutEffect(() => { boundary.current = containerRef.current?.closest(`[${PLAN_SCROLL}]`) ?? containerRef.current; });
  // The docked pane stays mounted across sessions: an open editor belongs to the session it was opened in.
  useEffect(() => { returnFocus.current = null; setState(IDLE); }, [sessionId]);
  useEffect(() => {
    const value = state.mode === "editing" ? state.comment.text : "";
    draft.current = { opened: value, current: value };
  }, [state]);
  const dismiss = useCallback(() => {
    setState(IDLE);
    containerRef.current?.ownerDocument.getSelection()?.removeAllRanges();
  }, [containerRef]);
  useEffect(() => {
    if (state.mode !== "idle") return;
    const target = returnFocus.current;
    returnFocus.current = null;
    const doc = containerRef.current?.ownerDocument;
    if (doc && target?.isConnected && doc.activeElement === doc.body) target.focus();
  }, [state.mode, containerRef]);
  const capture = useCallback(() => {
    const root = containerRef.current;
    if (!root || !canAdd || !sessionId || (modeRef.current !== "idle" && draft.current.current !== draft.current.opened)) return;
    const selection = root.ownerDocument.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    let range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      if (!root.contains(selection.anchorNode)) return;
      const clipped = range.cloneRange();
      if (!root.contains(clipped.startContainer)) clipped.setStart(root, 0);
      if (!root.contains(clipped.endContainer)) clipped.setEnd(root, root.childNodes.length);
      range = clipped;
    }
    const offsets = domPlanOffsets(root, range);
    if (!offsets || !offsets.selectedText.trim() || planCommentOverlaps(planCommentsStore.get(sessionId), offsets.start, offsets.end)) return;
    setState({ mode: "selection", range: range.cloneRange(), text: offsets.selectedText, start: offsets.start, end: offsets.end });
  }, [canAdd, sessionId, containerRef]);
  useEffect(() => {
    if (!sessionId) return undefined;
    const doc = containerRef.current?.ownerDocument ?? (typeof document === "undefined" ? null : document), view = doc?.defaultView;
    if (!doc || !view) return undefined;
    let timer = null, pressedInside = false, selectionChanged = false;
    const cancel = () => { if (timer !== null) { view.clearTimeout(timer); timer = null; } };
    const down = (event) => {
      cancel();
      const scroller = containerRef.current?.closest(`[${PLAN_SCROLL}]`) ?? containerRef.current;
      pressedInside = !!scroller?.contains(event.target);
      selectionChanged = false;
    };
    const changed = () => { selectionChanged = true; };
    const up = (event) => {
      cancel();
      if (!pressedInside || !selectionChanged) return;
      if (event.detail >= 2) timer = view.setTimeout(() => { timer = null; capture(); }, 250);
      else capture();
    };
    doc.addEventListener("mousedown", down);
    doc.addEventListener("selectionchange", changed);
    doc.addEventListener("mouseup", up);
    return () => {
      doc.removeEventListener("mousedown", down);
      doc.removeEventListener("selectionchange", changed);
      doc.removeEventListener("mouseup", up);
      cancel();
    };
  }, [capture, containerRef, sessionId]);
  const onMarkClick = useCallback((id, element) => {
    const comment = planCommentsStore.get(sessionId).find((entry) => entry.id === id);
    if (!comment) return;
    const doc = element.ownerDocument;
    doc.getSelection()?.removeAllRanges();
    returnFocus.current = element;
    const range = doc.createRange();
    range.selectNodeContents(element);
    setState({ mode: "editing", range, comment });
  }, [sessionId]);
  const submit = useCallback((text) => {
    if (state.mode === "selection") planCommentsStore.add(sessionId, { quote: state.text, text, startOffset: state.start, endOffset: state.end });
    else if (state.mode === "editing") planCommentsStore.edit(sessionId, state.comment.id, text);
    dismiss();
  }, [state, sessionId, dismiss]);
  const remove = useCallback(() => {
    if (state.mode === "editing") planCommentsStore.remove(sessionId, state.comment.id);
    dismiss();
  }, [state, sessionId, dismiss]);
  const trackDraft = useCallback((value) => { draft.current.current = value; }, []);
  const context = useMemo(() => ({ hoveredId, onMarkHover: setHoveredId, onMarkClick }), [hoveredId, onMarkClick]);
  const popover = state.mode === "idle" ? null : <PlanCommentPopover key={state.mode === "editing" ? state.comment.id : `selection:${state.start}:${state.end}`}
    range={state.range} selectedText={state.mode === "editing" ? state.comment.quote : state.text}
    initialValue={state.mode === "editing" ? state.comment.text : ""} isEditing={state.mode === "editing"}
    onSubmit={submit} onChange={trackDraft} onDelete={remove} onDismiss={dismiss} boundaryRef={boundary} />;
  return { context, popover };
}

// sessionId: plan comments (Gh/Rh). commentsEnabled (Xh o): a plan review is pending or the session is in Plan; the
// hint says so, and existing marks still open their comments. The comments ride the plan review's Revise
// (source-plan-card.jsx); 'Add to prompt' (a local extra) sends them to the composer instead.
export function SourcePlanPane({ plan, document = null, renderMarkdown = null, sessionId = null, commentsEnabled = false }) {
  const todos = Array.isArray(plan) && plan.length > 0 ? plan : null;
  const content = typeof document === "string" && document ? document : null;
  const commentable = !!content && !!sessionId;
  const prose = useRef(null);
  useSyncExternalStore(planCommentsStore.subscribe, planCommentsStore.version, planCommentsStore.version);
  const comments = commentable ? planCommentsStore.get(sessionId) : EMPTY;
  const { context, popover } = usePlanCommentLayer({ sessionId: commentable ? sessionId : null, canAdd: commentable && commentsEnabled, containerRef: prose });
  // Wh: the marks plugin only while there are comments; pre and math are skipped by both sides.
  const extension = useMemo(() => (commentable ? {
    rehypePlugins: comments.length ? [rehypePlanComments(comments)] : [],
    components: MARK_COMPONENTS, skipAttributes: SKIP_ATTRIBUTES,
  } : null), [commentable, comments]);
  return (
    <div className={`${SCROLLER} source-plan`} data-plan-document={content ? "" : undefined} {...(content ? { [PLAN_SCROLL]: "" } : {})}>
      <div className="mx-auto max-w-[68ch]">
        {commentable && <SourcePlanCommentHint enabled={commentsEnabled} />}
        {content && (
          <PlanCommentContext.Provider value={commentable ? context : null}>
            <div ref={prose} data-cds="Prose" data-prose-font="sans" data-size="sm" className="prose source-plan-document">
              {renderMarkdown ? renderMarkdown(content, extension) : <p className="whitespace-pre-wrap">{content}</p>}
            </div>
            {popover}
          </PlanCommentContext.Provider>
        )}
        {comments.length > 0 && <div className="spp-comments-footer" data-plan-comments-footer="">
          <span className="text-muted">{t("Sent with Revise on the plan card, or add them to your next message.")}</span>
          <SourceSettingsButton size="sm" variant="secondary" onClick={() => { if (addToPrompt(serializePlanComments(comments))) planCommentsStore.clear(sessionId); }}>{t("Add to prompt")}</SourceSettingsButton>
        </div>}
        {todos && <SourcePlanTasks plan={todos} />}
      </div>
    </div>
  );
}
const EMPTY = Object.freeze([]);

// Mp (:1830-1866): with plan content, a ghost icon-only base Button, Copy →
// Check, labelled "Copy plan" → "Copied" while the copy is fresh (the
// aria-label is its CDS tooltip); onMouseDown keeps the focus where it was.
export const PLAN_COPY_LABELS = Object.freeze({ copy: t("Copy plan"), copied: t("Copied") });
export function SourcePlanCopyButton({ document }) {
  const [state, setState] = useState("idle");
  const controller = useRef(null);
  useLayoutEffect(() => {
    const feedback = createClipboardFeedback({
      writeText: (value) => typeof navigator !== "undefined" && navigator.clipboard?.writeText
        ? navigator.clipboard.writeText(value) : Promise.reject(new Error("Clipboard unavailable")),
      onState: setState,
    });
    controller.current = feedback;
    return () => { controller.current = null; feedback.dispose(); };
  }, []);
  useLayoutEffect(() => { controller.current?.setText(document ?? ""); }, [document]);
  const copied = state === "copied";
  const label = copied ? PLAN_COPY_LABELS.copied : PLAN_COPY_LABELS.copy;
  return (
    <SourceTooltip content={label} side="bottom" hoverable={false}>
      <button type="button" className="source-icon-button spc-ghost" aria-label={label} data-plan-copy=""
        onMouseDown={(event) => event.preventDefault()} onClick={() => { void controller.current?.copy(); }}>
        <Icon name={copied ? "Check" : "Copy"} size={16} />
      </button>
    </SourceTooltip>
  );
}
