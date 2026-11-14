// W14-code r4 ct-feed R4T-09 (plan-w14-code.md E95: E90's whole-block replacement done, needs the user's GUI acceptance):
// the Code transcript's rows through the desktop's feed list.
//
// The desktop's Code feed is the shared list: cf74bc599 uw `D = Cl(E)` (c96d752d0 bRe: offered with the renderer and the
// live text held, unless localStorage turned code_shared_list off) → bat `sharedList` → `f(Fat, {...r, entries, shell})`,
// Fat = M(Aat). Aat draws its rows through c4a9ee384 ba (c96d752d0's `loe`; generated useTranscriptList):
//
//   qt = loe({items: Z, getKey: l7, renderRow: It, holdPlaceOnWidthChange: Gt (= rf(), Zp), coverRemovals: Kt,
//     rowKindOf: uP, trailsLatestExchange: kat, isStreaming: Rt, turnInProgress: i, getScrollElement: Ne, docKey: l,
//     sizeHint: be, keepMountedIndexes: Ot, navigation: zt.keymap, navigationPolicy: zt.policy, onFindScroll:
//     zt.releaseFollow, afterRows, onEscape: o, scrollerApi: Je.api, settleTelemetry: "off", persistence: "none",
//     initialSizes, initialViewport, initialViewportEstimate: Nat, windowing: H ? Pat : c9, …, resnapAfterEngine: !0,
//     articles: jt, labels: Nt, feedAttrs: Pt, rowsContainer: Vt, leading: Mat})
//
// with zt = Cat({enabled: a === !0, feed: P === !0, tabLandsInView, articleOf: At, rendererFragments: re, rowsRef: Re,
// scrollElRef: Me, pinRef: ze, coveredEntry: s, onUncoverRows: c}) (generated useFeedKeyboard), jt = {of: At, count: kt}
// and Nt Aat's labels ("Chat messages", "Message {position}", "Currently streaming message", the arrow-key instructions).
// That list is the virtualized one (Ar: rows windowed with c9's 600px overscan, measured, anchored), the hold place
// (transcript_hold_place 4175257006: Qp loads cb264bc23 createHoldPlace and the list keeps the reading position across
// a width change), the feed's roving article (role feed / article, aria-posinset / -setsize, "Message {position}") and
// its keyboard rows (Cat's keymap: arrows, Home / End, the sr-only "Load earlier messages" / "Load later messages" /
// "Load the rest of this message" buttons).
//
// The entry rows are Aat's row model (W14-code r5 R5T-04 / gates-r5-04, E95: E90's whole-block replacement, GUI
// acceptance): R7 → d7 → lP (generated buildFeedRows) over the renderer's entries, with d7's renderer options
// (`rendererFragmentsOf: M.get`, `rendererFragmentsVersion: w4e(M)`, `rendererPending: M?.pending`, `rendererEntryCount`,
// `shouldSplitEntry: hit`; bat's Code feed: no splitAssistantItems, no whole turns). A long reply (hit: 16 items or
// 2000px) whose renderer fragments are in becomes one rendererItem row per renderer item (GN), each drawn as i9 draws
// it (e7e, generated RendererItemRow); one not in yet is the whole turn (`rendererFoldPending`). Aat's articles follow:
// `At` names a split reply's parts first / middle / last (pN) under the turn's key and one position (N7: entries, less
// VN's articleless rows), so Cat's "Load the rest of this message" has the rows to name.
//
// What is the host's (not Aat's), and why:
//   - the rest of the rows: d7's other rows (loader, truncated, forkedFrom, lead, timed rows, tail chrome) are not taken
//     from lP: the host draws its own (SourceCodeTranscript: a host row, the lead rows, the tail notices) as opaque rows
//     `{id, kind: "other", article: false, render}` in place between the entry rows; an entry row is
//     `{id, kind ("user" | "assistant"), article, entryIndex, itemIds, render, renderPart(part)}` (see feedEntryRows);
//   - the scroller (W14-code r6 review fix R6T-01 = gates-r6-01, E95: E90's whole-block replacement, GUI acceptance):
//     the Code transcript scrolls in Aat's ooe (c4a9ee384 Hp, generated useFeedScroller; useOfficialFeedScroll below):
//     its follow engine (c7f8992b4 `x`: pinning, wheel / touch / key intent, resnap, holdProps) and Fe.Provider, with the
//     list given `scrollerApi: Je.api` and Cat `pinRef` = its follow, as Aat does. Aat's restore and paging hooks over R7
//     (z7 / Tat / B7 / V7 / W7 / k5) are not: the host keeps its reading-position anchors (use-transcript-scroll's LRU),
//     the jump chip's range, the find reveal and the pane's keyed scrolls, written through the follow engine's
//     jumpTo / scrollToBottom / setPinned. Rollback (local_feed_ooe_scroller off, or Chat / Cowork): the host's
//     scroller (source-transcript.jsx / use-transcript-scroll.js), handed in through TranscriptFeedHostContext
//     (getScrollElement its viewport, Cat's pinRef its follow: feedFollow, no scrollerApi).
//   - keepMountedIndexes: Aat keeps the rows a selection or a held focus spans; here every row stays mounted once the
//     find bar searched the transcript (the host's find reads the DOM, as ba's print hold `ji` keeps them all).
import React, { useContext, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFeedScroller, useHoldPlaceOnWidthChange, useResnapBeforeInput, useTranscriptList } from "./generated/code-transcript/c4a9ee384-RLCjceOL.mjs";
import { classifyFeedKeyScroll } from "./generated/code-transcript/c227f4d5e-B-FYKrwT.mjs";
import { FEED_WINDOWING, buildFeedRows, feedPressKeepsFollow, feedRepinAfterClick, feedViewportEstimate, isArticlelessRow, isEntryPartRow,
  splitsRendererEntry, useFeedKeyboard, useRendererFragmentsVersion } from "./generated/code-transcript/code-transcript.mjs";
import { attachTabFocusRelease } from "./generated/code-current/tab-focus-release.mjs";
import { TranscriptFeedHostContext, feedFollow } from "./source-code-feed-adapters.jsx";
import { identityMatches, isUpwardWheel, jumpBehavior, measureTranscriptScroll, openTranscriptScroll, prefersReducedMotion,
  saveTranscriptScroll, transcriptScrollVisible } from "./use-transcript-scroll.js";
import { easeScrollStep, keyScrollDelta, nextScrollTarget, scrollPaddingBottom } from "./pane-keys-model.mjs";
import { centerScrollOffset } from "./transcript-find-model.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";

const NO_STORE = { get: () => false, subscribe: () => () => {} };
const rowKey = (row) => row.id;
// c96d752d0 uP (rowKindOf): "human" for a user row, "assistant" for a reply, else the row's own (here "other").
const rowKindOf = (row) => (row.kind === "user" ? "human" : row.kind === "assistant" ? "assistant" : "other");
// c96d752d0 kat (trailsLatestExchange): `!o9(e)`, a row that is not an entry's (an articleless entry row is still one).
const trailsLatestExchange = (row) => !(row.entry ?? row.article);
// Aat `initialViewport: () => it ?? null` (B7's seed: the list opens at its tail, following): the host scroller opens
// the session at its tail too (use-transcript-scroll: a session with no saved position follows), then restores a saved one.
const initialViewport = () => ({ ...feedViewportEstimate(), following: true });

// W14-code r8 R7T-01 (E95: GUI acceptance): Bx, the list's snapshot per session. Aat saves ba's state when it leaves a
// session (c4a9ee384 `re`: `{isPinned: r?.isPinned() ?? !0, anchorKey, anchorOffsetPx, viewport: n.getViewport() ??
// void 0}` with `sizes: new Map(n.getSizes())`, Bx.save) and opens it again through z7 (`{handle: e, snapshot: i} =
// Bx.open(t)`), so the list starts where it was: B7 `if (y?.viewport !== void 0) return y.viewport` is ba's
// initialViewport (`initialViewport: () => it ?? null`) and `initialSizes: ke?.sizes`. A session left following opens
// at its tail (z7's openAtLatest: `isPinned: !0`). The host's anchor restore (useOfficialFeedScroll) stays as the
// fallback: it places the saved row at its offset once mounted.
const FEED_SNAPSHOT_LIMIT = 50;
const feedSnapshots = new Map();
/** Bx.save: the list's snapshot of a session (kept for the window's life, the 50 latest). */
export function saveFeedSnapshot(key, snapshot) {
  if (typeof key !== "string" || !key || !snapshot) return;
  feedSnapshots.delete(key);
  feedSnapshots.set(key, snapshot);
  while (feedSnapshots.size > FEED_SNAPSHOT_LIMIT) feedSnapshots.delete(feedSnapshots.keys().next().value);
}
/** Bx.open: the session's saved snapshot, or undefined. */
export function openFeedSnapshot(key) {
  return typeof key === "string" && key ? feedSnapshots.get(key) : undefined;
}
/**
 * The list's initial viewport for a saved snapshot (B7's seed): a snapshot left off its tail opens at its viewport, not
 * following; none, or one left following, opens at the tail as before.
 */
export function feedInitialViewport(snapshot) {
  const viewport = snapshot && snapshot.isPinned === false ? snapshot.viewport : undefined;
  if (viewport && Number.isFinite(viewport.scrollTop) && Number.isFinite(viewport.height) && viewport.height > 0)
    return { scrollTop: viewport.scrollTop, height: viewport.height, following: false };
  return initialViewport();
}
const rowsContainer = { ref: undefined, props: { "data-testid": "transcript-rows" } };

/** Aat's labels (`Nt`): the feed, a row ("Message {position}", I6ViGOLib6), the streaming row, the instructions. */
export function feedLabels(intl) {
  const rows = new Map();
  return {
    feed: intl.formatMessage({ defaultMessage: "Chat messages", id: "SCYmnElliz" }),
    row: (position) => {
      let label = rows.get(position);
      if (label === undefined) {
        label = intl.formatMessage({ defaultMessage: "Message {position}", id: "I6ViGOLib6" }, { position });
        rows.set(position, label);
      }
      return label;
    },
    streamingRow: intl.formatMessage({ defaultMessage: "Currently streaming message", id: "QU+nmAt+Zt" }),
    instructions: intl.formatMessage({ defaultMessage: "Use the up and down arrow keys to move between messages.", id: "ps3R1JlOBy" }),
  };
}

/**
 * Aat's articles (`At`, `kt`): an entry's row is an article `{key, part, posInSet}` — a split reply's parts share the
 * turn's key (`pN(e) ? e.turnKey : e.id`) and its place (N7: the entry's, 1-based, among the articles), `part` first /
 * middle / last (`e.isFirst ? (e.isLast ? "only" : "first") : e.isLast ? "last" : "middle"`), else "only"; any other row
 * none. `count` is how many messages (P7).
 */
export function feedArticles(rows) {
  const position = new Map();
  for (const row of rows) {
    const key = row.article ? row.articleKey ?? row.id : null;
    if (key !== null && !position.has(key)) position.set(key, position.size + 1);
  }
  const of = (row) => {
    if (!row?.article) return null;
    const key = row.articleKey ?? row.id;
    return { key, part: row.part ?? "only", posInSet: position.get(key) };
  };
  return { of, count: position.size };
}

const NO_ENTRIES = Object.freeze([]);
const partOf = (row) => (isEntryPartRow(row) ? (row.isFirst ? (row.isLast ? "only" : "first") : row.isLast ? "last" : "middle") : "only");

/**
 * W14-code r5 R5T-04 / gates-r5-04: the list's rows with Aat's row model. `rows`: the host's rows (an entry's row names
 * its renderer entry, `entryIndex`, and draws a row of lP's for it, `renderPart(row)`); `built`: lP's result over the
 * renderer's entries. An entry lP drew as one row (user, assistant, a reply whose fragments are not in) keeps the host's
 * row, an article unless VN (`drawnElsewhere`, `rendererDrawsNothing`); one lP split (GN's rendererItem rows) becomes a
 * row per part — the turn's key and parts for Aat's articles; a later part takes the host rows it draws (`partItemIds`),
 * the first part the rest (a chapter's reveal lands on its own part). An entry lP drew no row for is left as the host's row (the host has no drawn-in entries).
 */
export function feedEntryRows(rows, built) {
  const parts = new Map();
  for (const row of built?.rows ?? NO_ENTRIES) {
    if (!("builtEntryIdx" in row)) continue;
    const list = parts.get(row.builtEntryIdx);
    if (list) list.push(row);
    else parts.set(row.builtEntryIdx, [row]);
  }
  const out = [];
  for (const row of rows) {
    const own = row.entryIndex === undefined ? undefined : parts.get(row.entryIndex);
    if (!own?.length) {
      out.push(row);
      continue;
    }
    if ((own.length === 1 && !isEntryPartRow(own[0])) || typeof row.renderPart !== "function") {
      const article = row.article && !isArticlelessRow(own[0]);
      // W14-code r6 review fix R6T-01: Aat's It holds a fold-pending reply at its measured height (see CodeTranscriptFeed).
      const foldPending = own.length === 1 && own[0].kind === "assistant" && own[0].rendererFoldPending === true;
      out.push(article === row.article && !foldPending ? row
        : { ...row, article, entry: true, ...(foldPending ? { foldPending, rendererTurnKey: own[0].rendererTurnKey } : null) });
      continue;
    }
    // W14-code r6 review fix (R6T-REG-01's remainder): a later part takes the host rows it draws (`partItemIds`, the
    // host's partRowIds), the first part the rest — a chapter pinned to a later part's row reveals that part, not the
    // reply's start and stays there.
    const ids = own.map((part) => (part.isFirst === true || typeof row.partItemIds !== "function" ? null : row.partItemIds(part) ?? []));
    const claimed = new Set(ids.flatMap((list) => list ?? []));
    own.forEach((part, at) => {
      const first = part.isFirst === true;
      out.push({ id: part.id, kind: "assistant", article: row.article && !isArticlelessRow(part), entry: true,
        articleKey: isEntryPartRow(part) ? part.turnKey : part.id, part: partOf(part),
        itemIds: first ? (claimed.size ? (row.itemIds ?? []).filter((id) => !claimed.has(id)) : row.itemIds) : ids[at] ?? [],
        render: () => row.renderPart(part) });
    });
  }
  return out;
}

/**
 * d7's `Ie = lP(z, {…}, Oe.current)` with the Code feed's renderer options; the previous result is kept (d7's `Oe`,
 * updated after commit) so lP extends it (tP checks the entries' prefix and the options before reusing any of it).
 */
function useFeedRowModel(entries, fragments, rendererEntryCount, responding) {
  const version = useRendererFragmentsVersion(fragments);
  const fragmentsOf = useMemo(() => (fragments === undefined ? undefined : fragments.get.bind(fragments)), [fragments]);
  const previous = useRef(null);
  const built = useMemo(() => (entries === null ? null : buildFeedRows(entries, { isResponding: responding, hideLoader: true,
    rendererFragmentsOf: fragmentsOf, rendererFragmentsVersion: version, rendererPending: fragments?.pending,
    rendererEntryCount, rendererWholeTurns: false, shouldSplitEntry: splitsRendererEntry }, previous.current)),
  [entries, responding, fragmentsOf, version, fragments, rendererEntryCount]);
  useLayoutEffect(() => { previous.current = built; }, [built]);
  return built;
}

/**
 * The host's rows through the desktop's Code feed list. `rows`: `{id, kind, article, itemIds, render()}` (see the
 * header; an entry's row also `entryIndex`, `renderPart(part)`); `entries`: the renderer's entries (Aat's row model runs
 * over them; null: the host's rows as given); `rendererEntryCount`: how many the renderer draws (bat's baseEntries);
 * `responding`: the session's turn is running (Aat's `i`); `fragments`: the renderer's fragments (bat's E4e, Cat's
 * rendererFragments); `intl`: the formatter for Aat's labels.
 */
export function CodeTranscriptFeed({ rows: hostRows, entries = null, rendererEntryCount = undefined, sessionId = null, responding = false,
  fragments = undefined, intl, messagesRef = undefined }) {
  const host = useContext(TranscriptFeedHostContext);
  // W14-code r5 R5T-04 / gates-r5-04: Aat's row model over the renderer's entries (`entries`; none given: the host's rows).
  const built = useFeedRowModel(entries, fragments, rendererEntryCount, responding);
  const rows = useMemo(() => (built === null ? hostRows : feedEntryRows(hostRows, built)), [hostRows, built]);
  const wrapRef = useRef(null);
  // Aat's `Me` (scrollElRef): the scroll element. The host's viewport ref is attached after this list's layout effects on
  // the commit that mounts both, so the element is also found from the list's own wrapper.
  const scrollElRef = useMemo(() => ({ get current() {
    return host?.viewportRef?.current ?? wrapRef.current?.closest?.('[data-focus-region="conversation"]') ?? null;
  } }), [host]);
  const getScrollElement = React.useCallback(() => scrollElRef.current, [scrollElRef]);
  // W14-code r6 review fix R6T-01: in Aat's scroller, Cat's pinRef is its follow (`ze.current = Ye`, Ye = Je.api.follow)
  // and the list is handed `scrollerApi: Je.api`; in the host's, feedFollow over the host scroller's handle.
  const scrollerApi = host?.scrollerApi ?? undefined;
  const pinRef = useMemo(() => ({ current: scrollerApi ? scrollerApi.follow : feedFollow(host?.api ?? null) }), [host, scrollerApi]);
  const isPinned = React.useCallback(() => pinRef.current.isPinned(), [pinRef]);
  // W14-code r8 gates-r8-01: Aat's messagesRef (cf74bc599 dw `b`), read by the stream's visibility (`b.current?.isPinned()`).
  useLayoutEffect(() => {
    if (!messagesRef) return undefined;
    const handle = { isPinned };
    messagesRef.current = handle;
    return () => { if (messagesRef.current === handle) messagesRef.current = null; };
  }, [messagesRef, isPinned]);
  // W14-code r8 R7T-01: z7's `Bx.open(t)` once per mount (the transcript is keyed by its session).
  const [restored] = useState(() => openFeedSnapshot(sessionId ?? undefined));
  const openViewport = React.useCallback(() => feedInitialViewport(restored), [restored]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // The list owns the feed's keyboard rows while it is mounted (the host's feed navigation stands down).
  useLayoutEffect(() => host?.claim?.(), [host]);
  const holdAll = useSyncExternalStore((host?.holdAll ?? NO_STORE).subscribe, (host?.holdAll ?? NO_STORE).get, () => false);
  const keepMountedIndexes = useMemo(() => (holdAll ? rows.map((_, index) => index) : undefined), [holdAll, rows]);
  const articles = useMemo(() => feedArticles(rows), [rows]);
  const articleOf = articles.of;
  const labels = useMemo(() => feedLabels(intl), [intl]);
  const feedAttrs = useMemo(() => ({ "aria-busy": responding }), [responding]);
  // Aat's It: a reply whose renderer fragments are not in (`e.kind === "assistant" && e.rendererFoldPending`) is drawn in
  // `div.flow-root` at `height: r ?? be(e, t)` — r the list's measured size of the row once its turn's fragments were
  // released (`re?.released(e.rendererTurnKey) === !0 ? Ft.current(e.id) : void 0`, Ft = Jt.getSizes().get). be is R7's
  // estimateSize, which the host's row model (lP without R7) has not: a row never measured is drawn as before.
  const sizesRef = useRef(() => undefined);
  const renderRow = React.useCallback((row) => {
    if (!row.foldPending) return row.render();
    const height = row.rendererTurnKey !== undefined && fragments?.released?.(row.rendererTurnKey) === true ? sizesRef.current(row.id) : undefined;
    return height === undefined ? row.render() : <div className="flow-root" style={{ height }}>{row.render()}</div>;
  }, [fragments]);
  // Aat `Rt`: the turn runs and the last entry row is the reply.
  const lastArticle = rows.findLast((row) => row.article);
  const isStreaming = responding && lastArticle !== undefined && lastArticle.kind === "assistant";
  const holdPlace = useHoldPlaceOnWidthChange();
  const keyboard = useFeedKeyboard({ enabled: true, feed: false, tabLandsInView: false, articleOf, rendererFragments: fragments, rowsRef,
    scrollElRef, pinRef, coveredEntry: undefined, onUncoverRows: undefined });
  const list = useTranscriptList({ items: rows, getKey: rowKey, renderRow, holdPlaceOnWidthChange: holdPlace, rowKindOf, trailsLatestExchange,
    isStreaming, turnInProgress: responding, getScrollElement, docKey: sessionId ?? undefined, keepMountedIndexes,
    navigation: keyboard.keymap, navigationPolicy: keyboard.policy, onFindScroll: keyboard.releaseFollow, isPinned,
    onEscape: host?.onEscape /* W14-code r5 R5T-REG-01: Aat `onEscape: o` */, settleTelemetry: "off", persistence: "none",
    // W14-code r8 R7T-01: Aat `initialSizes: ke?.sizes, initialViewport: () => it ?? null` over Bx's snapshot.
    ...(restored?.sizes instanceof Map ? { initialSizes: restored.sizes } : null), initialViewport: openViewport,
    initialViewportEstimate: feedViewportEstimate,
    windowing: FEED_WINDOWING, resnapAfterEngine: true, articles, labels, feedAttrs, rowsContainer, ...(scrollerApi ? { scrollerApi } : null) });
  useLayoutEffect(() => { sizesRef.current = (id) => list.engine?.getSizes?.().get(id); }, [list.engine]);
  // W14-code r8 R7T-01: Bx.save when the list leaves its session (c4a9ee384 `re` → `{...ie(), sizes: new Map(n.getSizes())}`).
  const engineRef = useRef(list.engine);
  engineRef.current = list.engine;
  useLayoutEffect(() => () => {
    const engine = engineRef.current;
    if (!sessionId || !engine) return;
    const viewport = engine.getViewport?.() ?? undefined;
    const sizes = engine.getSizes?.();
    saveFeedSnapshot(sessionId, { isPinned: isPinned() ?? true, viewport, ...(sizes instanceof Map ? { sizes: new Map(sizes) } : null) });
  }, [sessionId, isPinned]);
  // A chapter whose heading is not mounted: the host's chapter jump reveals its row through the list (Aat's W7 keyed
  // scroll to a row, here ba's jumpToRow to the row's start).
  const jumpRef = useRef(list.jumpToRow);
  jumpRef.current = list.jumpToRow;
  useLayoutEffect(() => {
    if (!host?.reveal) return undefined;
    const reveal = (itemId) => {
      const index = rowsRef.current.findIndex((row) => row.id === itemId || row.itemIds?.includes(itemId));
      if (index < 0) return false;
      jumpRef.current?.(index, "start");
      return true;
    };
    host.reveal.set(reveal);
    return () => { if (host.reveal.get() === reveal) host.reveal.set(null); };
  }, [host]);
  const prompts = rows.reduce((count, row) => count + (row.kind === "user" && row.article ? 1 : 0), 0);
  return <div ref={wrapRef} className="contents" data-code-feed="" data-code-feed-prompts={prompts || undefined}>{list.element}</div>;
}

// c96d752d0 Aat's scroller ooe: `ooe({className: \`h-full overflow-y-auto overflow-x-hidden [contain:strict]
// [scrollbar-gutter:stable_both-edges] ${J ? iC : ""} ${g ?? ""}\`, innerClassName: "flex min-h-full flex-col", attrs:
// {"data-testid": Bv, …}, …})` with J the Code feed's edge fades (cf74bc599 `edgeFades: !0`), iC c4a70913c `_` and Bv
// c0fbbe82d `pi` ("epitaxy-virtual-transcript"); its render style D7 (`{overflowAnchor: "none"}`).
export const FEED_SCROLLER_CLASS = "h-full overflow-y-auto overflow-x-hidden [contain:strict] [scrollbar-gutter:stable_both-edges] supports-[animation-timeline:scroll()]:[--epitaxy-top-fade-height:32px]";
export const FEED_SCROLLER_INNER_CLASS = "flex min-h-full flex-col";
const FEED_SCROLLER_STYLE = Object.freeze({ overflowAnchor: "none" });
const NO_VIEW = Object.freeze({ following: true, showJump: false, showFade: false });

/** Whether a Code session's transcript scrolls in Aat's ooe (transcript_hold_place's feed list and its rollback switch). */
export function officialFeedScrollerOn() {
  return hostGrowthBookFlag("__gb__4175257006") && hostGrowthBookFlag("local_feed_ooe_scroller");
}

/**
 * W14-code r6 review fix R6T-01 = gates-r6-01 (E95: E90's whole-block replacement, needs the user's GUI acceptance): the
 * Code transcript's scroller is Aat's ooe (c4a9ee384 Hp, generated useFeedScroller) called as Aat calls it —
 * `initialPinned: ke?.isPinned ?? !0`, `docKey: l`, `classifyKeyScroll: yv` (c227f4d5e S2), `keepsFollow: qe` (`(e) =>
 * i7(e, x) ? !0 : (a7(e, ze.current, Me.current), !1)`, no bottom overlay here), `resnapBeforeInput: Jd()` (c4a9ee384 Wp),
 * `hidden` false (shared-1 bE's default; the host has no hidden tab of the transcript) — and returns what
 * use-transcript-scroll returns (viewportRef, contentRef, endRef, api, following, showJump, showFade) over its follow:
 *   - following: the engine's pinned state (follow.subscribe);
 *   - the reading position: the host's (`initialPinned` from the session's saved snapshot; a saved row anchor is
 *     restored once the transcript is ready, through follow.jumpTo; saved on scroll and on leaving), as
 *     use-transcript-scroll keeps it (Aat's z7 / k5 restore reads R7's rows, which the host's row model has not);
 *   - jumpToLatest: follow.scrollToBottom (smooth for the chip, instant for Send), release: setPinned(false), reveal (the
 *     find bar): release, then centre through jumpTo; keyScroll: the pane's eased key scroll (cc43287c9 kn / jn / An);
 *   - showJump / showFade: the end sentinel's 200px / 8px ranges, as the host chip reads them.
 * `render(children, attrs)`: ooe's render (Fe.Provider, `div[data-autoscroll-container]`, the inner column).
 * `enabled` false: inert (no container is rendered, so the engine never attaches).
 */
export function useOfficialFeedScroll({ sessionKey, ready = true, enabled = true, attrs = undefined, revealRow = undefined }) {
  const active = enabled && !!sessionKey;
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const endRef = useRef(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  // The session's saved reading position (use-transcript-scroll's LRU and row anchors); this transcript is keyed by
  // its session, so one visit per mount.
  const [visit] = useState(() => (active ? { key: sessionKey, entry: openTranscriptScroll(sessionKey) } : null));
  const saved = visit?.entry.snapshot;
  const initialPinned = saved?.following ?? true;
  const identity = useMemo(() => (visit ? Object.freeze({ sessionKey: visit.key, generation: visit.entry.generation }) : null), [visit]);
  const followRef = useRef(null);
  const keepsFollow = React.useCallback((event) => (feedPressKeepsFollow(event, undefined) ? true
    : (feedRepinAfterClick(event, followRef.current, viewportRef.current), false)), []);
  const scrollerAttrs = useMemo(() => ({ "data-testid": "epitaxy-virtual-transcript", ...attrs }), [attrs]);
  const attachViewport = React.useCallback((element) => { viewportRef.current = element; }, []);
  const resnapBeforeInput = useResnapBeforeInput();
  const scroller = useFeedScroller({ className: `transcript ${FEED_SCROLLER_CLASS}`, innerClassName: FEED_SCROLLER_INNER_CLASS,
    attrs: scrollerAttrs, containerRef: attachViewport, docKey: active ? sessionKey : undefined, initialPinned,
    classifyKeyScroll: classifyFeedKeyScroll, keepsFollow, resnapBeforeInput, hidden: false });
  const follow = scroller.api.follow;
  followRef.current = follow;
  const [view, setView] = useState(NO_VIEW);
  const state = useRef(null);
  if (state.current === null) state.current = { pendingRestore: !initialPinned && !!saved?.anchor, snapshot: saved, jumpInRange: true, fadeInRange: true,
    keyTarget: null, keyLast: null, keyFrame: 0, saveFrame: 0, publish: () => {} };
  const live = () => active && viewportRef.current !== null && transcriptScrollVisible(viewportRef.current);
  const save = () => {
    const local = state.current, viewport = viewportRef.current, content = contentRef.current;
    if (!active || !viewport || !content || local.pendingRestore || !transcriptScrollVisible(viewport)) return local.snapshot;
    const next = measureTranscriptScroll(viewport, content, follow.isPinned());
    if (!next.anchor && local.snapshot?.anchor && !readyRef.current) return local.snapshot;
    local.snapshot = next;
    saveTranscriptScroll(visit.key, visit.entry.generation, next);
    return next;
  };
  const release = () => {
    if (!live()) return;
    state.current.pendingRestore = false;
    follow.setPinned(false);
    save();
  };
  const stopKeyScroll = () => {
    const local = state.current;
    if (local.keyFrame) cancelAnimationFrame(local.keyFrame);
    local.keyFrame = 0; local.keyTarget = null; local.keyLast = null;
  };
  const handle = {
    capture: save,
    getIdentity: () => identity,
    jumpToLatest: (expected = {}) => {
      if (!live() || !identity || !identityMatches(identity, expected)) return false;
      state.current.pendingRestore = false;
      const view = viewportRef.current.ownerDocument.defaultView;
      follow.scrollToBottom(jumpBehavior(expected.behavior, prefersReducedMotion(view)) === "smooth" ? "smooth" : undefined);
      state.current.publish();
      save();
      return true;
    },
    forwardWheel: (event) => {
      const viewport = viewportRef.current;
      if (!live()) return;
      if (isUpwardWheel(event) && viewport.scrollTop > 0) release();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      viewport.scrollBy({ top: event.deltaY * unit, left: 0 });
    },
    release,
    isPinned: () => follow.isPinned(),
    reveal: (rect) => {
      const viewport = viewportRef.current;
      if (!live() || !rect) return false;
      release();
      const padding = Number.parseFloat(viewport.ownerDocument.defaultView?.getComputedStyle(viewport).scrollPaddingBottom ?? "");
      const bounds = viewport.getBoundingClientRect();
      const offset = centerScrollOffset(rect, bounds, padding > 0 ? bounds.bottom - padding : undefined);
      if (offset !== null) { follow.jumpTo(viewport.scrollTop + offset); save(); }
      return true;
    },
    getContent: () => contentRef.current,
    getViewport: () => viewportRef.current,
    keyScroll: (name) => {
      const viewport = viewportRef.current, local = state.current;
      if (!live() || viewport.scrollHeight <= viewport.clientHeight) return false;
      const delta = keyScrollDelta(name, { clientHeight: viewport.clientHeight, scrollPaddingBottom: scrollPaddingBottom(viewport) });
      if (!delta) return false;
      if (delta < 0) release();
      local.keyTarget = nextScrollTarget({ pending: local.keyTarget, scrollTop: viewport.scrollTop, scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight, delta });
      const step = () => {
        local.keyFrame = 0;
        if (!live() || local.keyTarget === null) return stopKeyScroll();
        const top = viewport.scrollTop;
        if (local.keyLast !== null && Math.abs(top - local.keyLast) > 1) return stopKeyScroll();
        local.keyTarget = nextScrollTarget({ pending: local.keyTarget, scrollHeight: viewport.scrollHeight, clientHeight: viewport.clientHeight });
        const next = easeScrollStep(top, local.keyTarget);
        viewport.scrollTop = next.top;
        local.keyLast = viewport.scrollTop;
        if (next.done) return stopKeyScroll();
        local.keyFrame = requestAnimationFrame(step);
      };
      if (!local.keyFrame) { local.keyLast = viewport.scrollTop; local.keyFrame = requestAnimationFrame(step); }
      return true;
    },
    cancelKeyScroll: stopKeyScroll,
  };
  // One stable handle (the host's consumers keep it), its methods reading this render's closure.
  const handleRef = useRef(null);
  const latest = useRef(handle);
  latest.current = handle;
  if (handleRef.current === null) handleRef.current = Object.fromEntries(Object.keys(handle).map((name) => [name, (...args) => latest.current[name](...args)]));

  useLayoutEffect(() => {
    const viewport = viewportRef.current, end = endRef.current, local = state.current;
    if (!active || !viewport || !end) { setView(NO_VIEW); return undefined; }
    let disposed = false;
    const publish = () => {
      if (disposed) return;
      const measurable = transcriptScrollVisible(viewport);
      const pinned = follow.isPinned();
      const next = { following: pinned, showJump: measurable && !local.pendingRestore && !pinned && !local.jumpInRange,
        showFade: measurable && !local.pendingRestore && !local.fadeInRange };
      setView((old) => (old.following === next.following && old.showJump === next.showJump && old.showFade === next.showFade ? old : next));
    };
    local.publish = publish;
    const unsubscribe = follow.subscribe(() => { publish(); save(); });
    const observers = [200, 8].map((margin, index) => {
      const observer = new IntersectionObserver(([record]) => {
        if (disposed || !record) return;
        if (index === 0) local.jumpInRange = record.isIntersecting; else local.fadeInRange = record.isIntersecting;
        publish();
      }, { root: viewport, rootMargin: `0px 0px ${margin}px 0px`, threshold: 0 });
      observer.observe(end);
      return observer;
    });
    const onScroll = () => {
      if (disposed || local.saveFrame) return;
      local.saveFrame = requestAnimationFrame(() => { local.saveFrame = 0; if (!disposed) { save(); publish(); } });
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    const detachTabFocusRelease = attachTabFocusRelease(viewport, { isPinned: () => follow.isPinned(), setPinned: (value) => { if (!value) latest.current.release(); } });
    publish();
    return () => {
      save();
      disposed = true;
      local.publish = () => {};
      if (local.saveFrame) cancelAnimationFrame(local.saveFrame);
      local.saveFrame = 0;
      stopKeyScroll();
      unsubscribe();
      observers.forEach((observer) => observer.disconnect());
      viewport.removeEventListener("scroll", onScroll);
      detachTabFocusRelease();
    };
  }, [active, follow]);

  // The saved row anchor, once the transcript is ready: the row's saved offset from the top (the list may mount it a
  // frame later); a row no longer there parks at the tail, as use-transcript-scroll's missing-anchor fallback does.
  // W14-code r7 R7T-01 (first step): the list windows its rows from the tail (Aat's initialViewport seed), so in a long
  // session the anchored row may not be mounted at all; it is brought in through the list first (`revealRow(itemId)`:
  // the host's feed reveal, ba's jumpToRow to the row's start), then placed at its saved offset. Aat itself restores
  // through z7 / B7 (Bx's saved viewport as the list's initialViewport), which read R7's row model (not the host's).
  const revealRef = useRef(revealRow);
  revealRef.current = revealRow;
  useLayoutEffect(() => {
    const local = state.current;
    if (!active || !ready || !local.pendingRestore) return undefined;
    let frame = 0, tries = 0, revealed = false;
    const attempt = () => {
      frame = 0;
      const viewport = viewportRef.current, content = contentRef.current;
      if (!viewport || !content || !local.pendingRestore) return;
      const anchor = local.snapshot?.anchor;
      const row = anchor ? [...content.querySelectorAll("[data-transcript-item-id]")].find((node) => node.dataset.transcriptItemId === anchor.itemId) : null;
      if (row) {
        follow.setPinned(false);
        follow.jumpTo(viewport.scrollTop + row.getBoundingClientRect().top - viewport.getBoundingClientRect().top - anchor.offset);
      } else if (anchor && !revealed && revealRef.current?.(anchor.itemId) === true) {
        // Restoring a saved anchor starts unpinned (`initialPinned` is the snapshot's following: false), so the list's jump
        // is not pulled back to the tail; the row's offset is applied once it is mounted.
        revealed = true;
        tries = 0;
        frame = requestAnimationFrame(attempt);
        return;
      } else if (tries++ < 3) { frame = requestAnimationFrame(attempt); return; }
      else follow.scrollToBottom();
      local.pendingRestore = false;
      local.publish();
    };
    attempt();
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [active, ready, follow]);

  const render = (children, style = FEED_SCROLLER_STYLE) => scroller.render(children, style);
  return { viewportRef, contentRef, endRef, api: handleRef.current, scrollerApi: scroller.api, render, ...(active ? view : NO_VIEW) };
}
