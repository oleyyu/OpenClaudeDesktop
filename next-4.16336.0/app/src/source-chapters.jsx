// Session chapters: the chapter heading (cd5a31703 CX/wX/SX, readable 60429-60494), the title reveal it animates
// with (shared-21 M9, readable 30502-30560) and the Session chapters rail (cf74bc599 tb/nb/eb, readable 3187-3520),
// over the per-session chapter store in session-chapters-model.mjs.
import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  CHAPTER_READING_OFFSET, CHAPTER_SAMPLE_THROTTLE_MS, EMPTY_CHAPTER_STATE, activeChapterId, chapterAnchorId,
  chapterStore, chapterView, deferChapterSample, hasChapters,
} from "./session-chapters-model.mjs";
import { RAIL_BAND_START_CLASS } from "./generated/session-rail-kit/rail-layout.mjs";
import { CdsContextMenu, CdsOverflowTooltip, CdsTooltip, cdsSurfaceClass } from "./generated/view-tabs/index.js";
import "./source-chapters.css";
import { t } from "../electron/i18n/index.mjs";

const serverSnapshot = () => EMPTY_CHAPTER_STATE;
/** The whole chapter store (Hw). */
export function useChapterStoreState() {
  const store = chapterStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot);
}

// M9 (shared-21 :30502): jce 30ms per grapheme, Mce 4 graphemes of tail, A9 200ms blur-out.
const GRAPHEME_STEP_MS = 30, GRAPHEME_TAIL = 4, BLUR_MS = 200;
const BLUR_TRANSITION = `opacity ${BLUR_MS}ms ease-out, filter ${BLUR_MS}ms ease-out`;
const BLUR_OUT = { opacity: 0, filter: "blur(6px)", transition: BLUR_TRANSITION };
const BLUR_IN = { transition: BLUR_TRANSITION };
let segmenter;
/** qg: a title's graphemes. */
export function titleGraphemes(text) {
  const value = String(text ?? "");
  try {
    segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (part) => part.segment);
  } catch {
    return Array.from(value);
  }
}

/** M9: a title that blurs out and reveals its new text grapheme by grapheme when it changes. */
export function SourceTitleReveal({ text, skipInitialReveal = false }) {
  const [shown, setShown] = useState(text);
  const [phase, setPhase] = useState("initial");
  const [revealed, setRevealed] = useState(null);
  const graphemes = useMemo(() => titleGraphemes(shown), [shown]);
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(shown), (graphemes.length + GRAPHEME_TAIL) * GRAPHEME_STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, graphemes.length]);
  const done = revealed === shown;
  if (text !== shown && phase !== "out" && (phase === "initial" || done)) setPhase("out");
  const latest = useRef(text);
  latest.current = text;
  useEffect(() => {
    if (phase !== "out") return undefined;
    const timer = setTimeout(() => {
      if (latest.current === shown) { setPhase("recover"); return; }
      setShown(latest.current);
      setPhase("idle");
    }, BLUR_MS);
    return () => clearTimeout(timer);
  }, [phase, shown]);
  if (skipInitialReveal && phase === "initial") return text;
  return <>
    <span className="sr-only">{text}</span>
    <span key={shown} aria-hidden="true" data-revealing={done ? undefined : ""} className="sch-reveal"
      style={phase === "initial" || phase === "idle" ? undefined : phase === "out" && text !== shown ? BLUR_OUT : BLUR_IN}>
      {graphemes.map((grapheme, index) => <span key={index} className="sch-grapheme" style={{ "--i": `${index}` }}>{grapheme === " " ? " " : grapheme}</span>)}
    </span>
  </>;
}

/** SX: the heading's title — a change reveals, and 1.5s later the heading settles back to plain text. */
function ChapterHeadingText({ text }) {
  const last = useRef(text);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (text === last.current) return undefined;
    last.current = text;
    const timer = setTimeout(() => setGeneration((value) => value + 1), 1500);
    return () => clearTimeout(timer);
  }, [text]);
  return <SourceTitleReveal key={generation} text={text} skipInitialReveal />;
}

/**
 * 3.6556.2 c96d752d0 GY: the chapter h2 (text-body-semibold text-primary select-text scroll-mt-[56px]). A double-click
 * renames it in place: a field-sized input with the outline-fill-accent ring; Enter or blur saves a changed, non-empty
 * title, Escape cancels. itemId keeps a mark_chapter heading addressable as its transcript row.
 * W14-code r8 css8-chapter-heading-handcopy: the h2 and the input carry GY's own class strings (source-message stays as
 * the transcript row hook); the hand-copied .source-chapter / .source-chapter-input rules are gone.
 */
const CHAPTER_HEADING_CLASS = "text-body-semibold text-primary select-text scroll-mt-[56px]";
const CHAPTER_INPUT_CLASS = "min-w-0 max-w-full rounded-[3px] border-0 bg-transparent p-0 outline outline-[1.5px] outline-fill-accent outline-offset-[1px] [field-sizing:content]";
export const SourceChapterHeading = memo(function SourceChapterHeading({ id, title, sessionId = null, itemId = undefined, source = "claude" }) {
  const [editing, setEditing] = useState(false);
  const input = useRef(null), settled = useRef(false);
  useEffect(() => {
    if (!editing) return;
    settled.current = false;
    input.current?.select();
  }, [editing]);
  const commit = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    const value = input.current?.value.trim();
    if (sessionId && value && value !== title) chapterStore().rename(sessionId, id, value);
    setEditing(false);
  }, [sessionId, id, title]);
  const shared = { id: chapterAnchorId(id), className: `source-message ${CHAPTER_HEADING_CLASS}`, "data-chapter": "", "data-chapter-source": source,
    "data-transcript-item-id": itemId };
  if (editing) return <h2 {...shared} data-editing="">
    <input ref={input} className={CHAPTER_INPUT_CLASS} defaultValue={title} aria-label={t("Chapter title")}
      size={Math.min(Math.max(title.length, 10), 40)} onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        else if (event.key === "Escape") { event.preventDefault(); settled.current = true; setEditing(false); }
      }} />
  </h2>;
  return <h2 {...shared} aria-hidden={title === "" || undefined}
    onDoubleClick={sessionId && title !== "" ? () => setEditing(true) : undefined}>
    <ChapterHeadingText text={title} />
  </h2>;
});

/** wX: a mark_chapter heading, unless the rail deleted (hid) it; a rename wins over the tool's title. */
export const SourceClaudeChapter = memo(function SourceClaudeChapter({ sessionId, id, title, itemId }) {
  const state = useChapterStoreState();
  const { hidden, renamedTitle } = chapterView(state, sessionId, id);
  return hidden ? null : <SourceChapterHeading id={id} title={renamedTitle ?? title} sessionId={sessionId} itemId={itemId} />;
});

/** eb: the chapter at the reading line, sampled on scroll (one frame per sample; near the bottom at most every 50ms). */
export function useActiveChapter(chapters, viewportRef, scrollKey) {
  const [active, setActive] = useState(null);
  const visible = hasChapters(chapters);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !visible) return undefined;
    const view = viewport.ownerDocument.defaultView ?? globalThis;
    let frame = 0, timer = 0, retried = false, lastSampleAt = -Infinity, lastDistance = 0;
    const sample = () => {
      frame = 0;
      if (timer) { view.clearTimeout(timer); timer = 0; }
      const first = viewport.querySelector("[data-transcript-item-id]");
      if (!first) {
        if (!retried) { retried = true; frame = view.requestAnimationFrame(sample); }
        return;
      }
      lastSampleAt = view.performance.now();
      const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      lastDistance = distance;
      const top = viewport.getBoundingClientRect().top + CHAPTER_READING_OFFSET;
      const next = activeChapterId(chapters, {
        canScroll: viewport.scrollHeight > viewport.clientHeight,
        distanceToBottomPx: distance,
        viewportTopPx: top,
        // Every displayed row (and so every heading) is in the DOM here: the transcript is not virtualized, so the
        // first-visible-entry fallback for an unmounted heading is not needed.
        firstEntryIndex: -1,
        getAnchorTop: (chapter) => viewport.querySelector(`#${CSS.escape(chapterAnchorId(chapter.id))}`)?.getBoundingClientRect().top ?? null,
      });
      setActive((value) => value === next ? value : next);
    };
    const onScroll = () => {
      if (frame) return;
      if (deferChapterSample(view.performance.now(), lastSampleAt, lastDistance)) {
        timer ||= view.setTimeout(() => { timer = 0; frame ||= view.requestAnimationFrame(sample); }, CHAPTER_SAMPLE_THROTTLE_MS);
        return;
      }
      frame = view.requestAnimationFrame(sample);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    sample();
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (frame) view.cancelAnimationFrame(frame);
      if (timer) view.clearTimeout(timer);
    };
  }, [viewportRef, scrollKey, chapters, visible]);
  return active;
}

/** nb: one chapter in the open rail — jump on click, rename on double-click or Rename, Delete in its context menu. */
const ChapterEntry = memo(function ChapterEntry({ chapter, sessionId, isActive, isEditing, isListExpanded, onJump, onStartRename, onContextMenuOpenChange }) {
  const input = useRef(null), settled = useRef(false), summaryId = useId();
  useEffect(() => {
    if (!isEditing) return;
    settled.current = false;
    input.current?.select();
  }, [isEditing]);
  const commit = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    const value = input.current?.value.trim();
    if (sessionId && value && value !== chapter.title) chapterStore().rename(sessionId, chapter.id, value);
    onStartRename(null);
  }, [sessionId, chapter.id, chapter.title, onStartRename]);
  // W14-code r6 review (css6-toc-position-gutter, E84): FC's own class strings (3.6556.2 cf74bc599 readable 5541-5590) —
  // the editing row and its mark, the field-sizing input, the row button `j`, the mark `N`, and the title in E
  // (shared-frame hh, CdsOverflowTooltip lazy / non-hoverable / inline-end, className flex-1). The host's .sch-toc-entry /
  // -button / -mark / -mark-edit / -title / -input restatements are gone (its text-align:left was wrong under RTL).
  if (isEditing) return <li className="flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px]">
    <span aria-hidden="true" className="block h-[2px] w-[10px] rounded-full bg-alpha-8 shrink-0" />
    <input ref={input} defaultValue={chapter.title} size={Math.max(chapter.title.length, 1)} aria-label={t("Chapter title")} onBlur={commit}
      className="flex-1 min-w-0 [field-sizing:content] bg-transparent text-body text-primary focus-visible:outline-hidden focus-visible:shadow-focus"
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        else if (event.key === "Escape") { event.preventDefault(); settled.current = true; onStartRename(null); }
      }} />
  </li>;
  // W14-code r7 css7-toc-entry-tooltip-menu: FC (cf74bc599 readable 5609-5679) — the summary is a hidden span the row
  // button names with aria-describedby (no native title), the row sits in the CDS Tooltip (shared-frame Xm = Kl: lazy,
  // non-hoverable, inline-end; `content: a && t.summary ? t.title : void 0, detail: t.summary`, a the open list), and a
  // Claude or user chapter's right-click menu is the CDS ContextMenu (kA = qi): Rename, a separator, danger Delete.
  const session = chapter.source === "session";
  const row = <button type="button" onClick={() => onJump(chapter)} onDoubleClick={session ? undefined : () => onStartRename(chapter.id)}
    aria-current={isActive ? "true" : undefined} aria-describedby={chapter.summary ? summaryId : undefined}
    className={`group/ch hit-row-main w-full flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px] text-start text-body hover:bg-fill-ghost-hover ${isActive ? "text-primary" : "text-secondary hover:text-primary"}`}>
    <span aria-hidden="true" className={`block h-[2px] rounded-full shrink-0 transition-[background-color] duration-150 ${isActive ? "w-[14px] bg-alpha-8" : "w-[9px] bg-alpha-3 group-hover/ch:bg-alpha-5"}`} />
    <CdsOverflowTooltip lazy hoverable={false} side="inline-end" className="flex-1"><SourceTitleReveal text={chapter.title} /></CdsOverflowTooltip>
    {chapter.summary && <span id={summaryId} hidden>{chapter.summary}</span>}
  </button>;
  const tooltip = (trigger) => <CdsTooltip lazy hoverable={false} side="inline-end"
    content={isListExpanded && chapter.summary ? chapter.title : undefined} detail={chapter.summary}>{trigger}</CdsTooltip>;
  if (session) return <li className="hit-row">{tooltip(row)}</li>;
  return <li className="hit-row"><CdsContextMenu.Root onOpenChange={(open) => onContextMenuOpenChange(open)}>
    {tooltip(<CdsContextMenu.Trigger render={row} />)}
    <CdsContextMenu.Popup>
      <CdsContextMenu.Item onClick={() => onStartRename(chapter.id)}>{t("Rename")}</CdsContextMenu.Item>
      <CdsContextMenu.Separator />
      <CdsContextMenu.Item variant="danger" onClick={() => {
        if (!sessionId) return;
        if (chapter.source === "user") chapterStore().removeUserChapter(sessionId, chapter.id);
        else chapterStore().setHidden(sessionId, chapter.id, true);
      }}>{t("Delete")}</CdsContextMenu.Item>
    </CdsContextMenu.Popup>
  </CdsContextMenu.Root></li>;
});

/**
 * tb: the Session chapters rail at the transcript's left gutter — one short line per chapter (the current one longer
 * and darker); hovering or focusing it opens the chapter list over the gutter. onJump(chapter) scrolls to a heading
 * (Session start scrolls to the top).
 */
// cf74bc599 jC / MC: a tick's line, at 9/14 scale in alpha-3, or full width in alpha-8 for the current chapter.
const TOC_LINE = "w-[calc(var(--chat-gutter)*3/8+2px)] origin-left [&:where(:root[dir=rtl]_:dir(rtl))]:origin-right scale-x-[calc(9/14)] bg-alpha-3";
const TOC_LINE_ACTIVE = "w-[calc(var(--chat-gutter)*3/8+2px)] origin-left [&:where(:root[dir=rtl]_:dir(rtl))]:origin-right bg-alpha-8";
export const SourceChapterToc = memo(function SourceChapterToc({ sessionId, chapters, viewportRef, scrollKey, onJump }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditingState] = useState(null);
  const editingRef = useRef(false), menuOpen = useRef(false), nav = useRef(null);
  const setEditing = useCallback((id) => { editingRef.current = id !== null; setEditingState(id); }, []);
  const active = useActiveChapter(chapters, viewportRef, scrollKey);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => {
    if (menuOpen.current || editingRef.current) return;
    setOpen(false);
    setEditing(null);
  }, [setEditing]);
  const onMenuOpenChange = useCallback((value) => {
    menuOpen.current = value;
    if (!value) requestAnimationFrame(() => { if (nav.current && !nav.current.matches(":hover")) hide(); });
  }, [hide]);
  const jump = useCallback((chapter) => onJump?.(chapter), [onJump]);
  if (!hasChapters(chapters)) return null;
  // W14-code r6 css6-toc-position-gutter (E84): 3.6556.2 cf74bc599 NC in its own class strings. The root is
  // `epitaxy-toc absolute top-[20px] bottom-[32px] ${yi} z-[11] pointer-events-none ${w===null?"invisible":"epitaxy-toc-fade-in"}`
  // with yi = shared-18 Hx (RAIL_BAND_START_CLASS), so the rail follows the session rail band; --chat-gutter is the
  // .epitaxy-root default (32px), narrowed by the nav's tile-slot rule (source-chapters.css). kC / AC / PC / R / B below.
  return <div className={`epitaxy-toc sch-toc absolute top-[20px] bottom-[32px] ${RAIL_BAND_START_CLASS} z-[11] pointer-events-none ${active === null ? "invisible" : "epitaxy-toc-fade-in"}`}>
    <nav ref={nav} aria-label={t("Session chapters")} tabIndex={0} className="sch-toc-nav relative h-full w-[var(--chat-gutter)] focus-visible:outline-hidden focus-visible:shadow-focus" onMouseLeave={hide} onFocus={show}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) hide(); }}>
      <ol aria-hidden="true" data-dash-rail="" className="max-h-full flex flex-col py-1.25 ps-[calc(var(--chat-gutter)*3/16)] overflow-hidden pointer-events-auto" onMouseEnter={show}>
        {chapters.map((chapter) => <li key={chapter.id} className="h-[8px] flex items-center">
          <span className={`block h-[2px] rounded-full transition-[scale,background-color] duration-200 ${chapter.id === active ? TOC_LINE_ACTIVE : TOC_LINE}`} />
        </li>)}
      </ol>
      <div className={`absolute start-0 top-0 isolate ${cdsSurfaceClass("popover")} rounded-lg w-max min-w-[232px] max-w-[320px] max-h-full flex flex-col py-sm transition-[opacity,transform,visibility] motion-reduce:transition-none duration-150 ease-out ${open ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 -translate-x-1 [&:where(:root[dir=rtl]_:dir(rtl))]:translate-x-1"}`}>
        <ol role="list" className="flex-1 min-h-0 flex flex-col hit-gap-y-0.75 overflow-y-auto px-xs">
          {chapters.map((chapter) => <ChapterEntry key={chapter.id} chapter={chapter} sessionId={sessionId}
            isActive={chapter.id === active} isEditing={chapter.id === editing} isListExpanded={open} onJump={jump} onStartRename={setEditing}
            onContextMenuOpenChange={onMenuOpenChange} />)}
        </ol>
      </div>
    </nav>
  </div>;
});
