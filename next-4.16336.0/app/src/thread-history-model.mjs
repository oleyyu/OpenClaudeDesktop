// Codex 0.155.1 paginated thread history.
//
// Thread.historyMode is "legacy" | "paginated" (ts/v2/ThreadHistoryMode.ts).
// For a paginated thread the app-server answers full-history hydration with a
// deprecationNotice: thread_processor.rs:36 PAGINATED_FULL_HISTORY_DEPRECATION_SUMMARY
// is sent from :3771 (thread/resume before the thread is loaded), :4383
// (thread/resume for a loaded thread) and :4910 (thread/fork), and
// :37 PAGINATED_THREAD_READ_DEPRECATION_SUMMARY from :892 (thread/read
// includeTurns:true). The supported route is `excludeTurns: true` plus
// `initialTurnsPage` / `thread/turns/list` / `thread/items/list`
// (ts/v2/ThreadResumeParams.ts:33-40 for excludeTurns, ts-experimental/v2/
// ThreadResumeParams.ts:73 for initialTurnsPage, ts/v2/ThreadReadParams.ts:5-12).
//
// Verified live against /Users/oleyyu/.local/bin/codex 0.155.1 (read-only for
// the user's real threads, isolated CODEX_HOME for the writes). Evidence in
// analysis/protocol-0155-20260921/probes/:
//   * read-only.json: paginated thread/read includeTurns:true -> deprecationNotice
//     (PAGINATED_THREAD_READ summary); includeTurns:false -> 0 turns, no notice
//   * resume-isolated.json: thread/resume excludeTurns:true + initialTurnsPage ->
//     no notice, response carries initialTurnsPage {data,nextCursor,backwardsCursor};
//     the same resume without excludeTurns -> PAGINATED_FULL_HISTORY notice
//   * parity.json: on a real 70-turn thread, thread/read includeTurns:true,
//     thread/turns/list itemsView:"full" (25+25+20 turns) and thread/items/list
//     (100+92) all report the same 192 items
//   * legacy.json: a LEGACY thread answers thread/read includeTurns:true with no
//     notice and rejects thread/items/list with -32601 "thread/items/list is not
//     supported yet" -> the legacy full-history path must be kept for that mode

// Codex defaults thread/turns/list to descending; the first page is therefore
// the newest turns. 25 keeps the first paint small without many round trips.
export const TURNS_PAGE_LIMIT = 25;
// thread/items/list backfill for a turn the server did not return in full.
export const ITEMS_PAGE_LIMIT = 200;
// Hard stop so a corrupted cursor loop can never hang the session open.
export const MAX_HISTORY_PAGES = 400;
// JSON-RPC "Method not found": the app-server also uses it for a request it
// cannot serve for this thread (observed: "list_turns is not supported yet"
// for a thread with no rollout, "thread/items/list is not supported yet" for a
// legacy thread). Those are absent history, not a failure to open the session.
const METHOD_NOT_FOUND = -32601;

export function isLegacyHistory(thread) {
  return thread?.historyMode === "legacy";
}

// The route is decided ONCE, from the Thread the caller knows when it builds
// the request, and the same value must drive hydration. Re-deriving the branch
// from the Thread the server returns is a live bug: a session whose local
// metadata was persisted by 0.153.4 has no historyMode, so the request goes out
// on the paginated route (includeTurns:false / excludeTurns:true) while the
// response says historyMode "legacy" — the legacy branch would then hand back
// `thread.turns`, which that request deliberately emptied, and the transcript
// would render blank with no error.
export const LEGACY_ROUTE = "legacy";
export const PAGINATED_ROUTE = "paginated";
export function historyRoute(thread) {
  return isLegacyHistory(thread) ? LEGACY_ROUTE : PAGINATED_ROUTE;
}

// Only historyMode "legacy" keeps the deprecated full-history route. An unknown
// history mode takes the paginated route, which is also correct for a legacy
// thread's turns (thread/turns/list works there) and never emits a notice.
export function resumeParams(base, thread, { pageLimit = TURNS_PAGE_LIMIT } = {}) {
  if (isLegacyHistory(thread)) return { ...base };
  return { ...base, excludeTurns: true, initialTurnsPage: { limit: pageLimit, sortDirection: "desc", itemsView: "full" } };
}

export function readParams(threadId, thread) {
  return { threadId, includeTurns: isLegacyHistory(thread) };
}

export function forkParams(base, thread) {
  if (isLegacyHistory(thread)) return { ...base };
  return { ...base, excludeTurns: true };
}

export function turnsListParams(threadId, cursor, { pageLimit = TURNS_PAGE_LIMIT, itemsView = "full" } = {}) {
  return { threadId, limit: pageLimit, sortDirection: "desc", itemsView, ...(cursor ? { cursor } : {}) };
}

export function itemsListParams(threadId, turnId, cursor, { pageLimit = ITEMS_PAGE_LIMIT } = {}) {
  return { threadId, ...(turnId ? { turnId } : {}), limit: pageLimit, sortDirection: "asc", ...(cursor ? { cursor } : {}) };
}

// Descending pages -> one ascending transcript order, first occurrence wins.
// A turn can repeat across pages when the anchor turn is included again.
export function mergeTurnPages(pages) {
  const byId = new Map();
  for (const page of pages || [])
    for (const turn of page?.data || [])
      if (turn?.id && !byId.has(turn.id)) byId.set(turn.id, turn);
  return [...byId.values()].reverse();
}

// thread/items/list returns {turnId, item} entries; fold them onto their turns
// without dropping an item whose turn is not in the loaded window.
export function applyItemEntries(turns, entries) {
  const byTurn = new Map();
  for (const entry of entries || []) {
    if (!entry?.turnId || !entry.item?.id) continue;
    if (!byTurn.has(entry.turnId)) byTurn.set(entry.turnId, []);
    byTurn.get(entry.turnId).push(entry.item);
  }
  return (turns || []).map((turn) => {
    const items = byTurn.get(turn.id);
    return items ? { ...turn, items, itemsView: "full" } : turn;
  });
}

function unsupported(error) {
  return Number(error?.code) === METHOD_NOT_FOUND || /not supported yet/i.test(error?.message || "");
}

async function pageAll(rpc, method, first, nextParams, maxPages) {
  const pages = [];
  let page = first;
  let guard = 0;
  while (page) {
    pages.push(page);
    if (!page.nextCursor || ++guard >= maxPages) break;
    page = await rpc(method, nextParams(page.nextCursor));
  }
  return { pages, truncated: !!pages.at(-1)?.nextCursor };
}

// Hydration for one thread. `initialPage` is the ThreadResumeResponse's
// initialTurnsPage when the caller already asked for it, so a freshly resumed
// session costs no extra request unless it has more than one page of turns.
// `route` is the decision that shaped the request (historyRoute of the Thread
// the caller knew then). It is required from app call sites; the fallback to
// the response Thread exists only for a caller that built no request at all.
export async function loadThreadHistory(rpc, {
  threadId, thread, route = null, initialPage = null,
  pageLimit = TURNS_PAGE_LIMIT, itemPageLimit = ITEMS_PAGE_LIMIT, maxPages = MAX_HISTORY_PAGES,
} = {}) {
  if ((route || historyRoute(thread)) === LEGACY_ROUTE)
    return { turns: thread?.turns || [], mode: "legacy", turnPages: 0, itemPages: 0, truncated: false };
  let first = initialPage;
  try {
    if (!first) first = await rpc("thread/turns/list", turnsListParams(threadId, null, { pageLimit }));
  } catch (error) {
    if (!unsupported(error)) throw error;
    return { turns: [], mode: "paginated", turnPages: 0, itemPages: 0, truncated: false, unavailable: error.message };
  }
  let result;
  try {
    result = await pageAll(rpc, "thread/turns/list", first, (cursor) => turnsListParams(threadId, cursor, { pageLimit }), maxPages);
  } catch (error) {
    if (!unsupported(error)) throw error;
    result = { pages: [first], truncated: true };
  }
  let turns = mergeTurnPages(result.pages);
  // A turn the server could not return in full is completed through
  // thread/items/list rather than by falling back to deprecated hydration.
  let itemPages = 0;
  for (const turn of turns.filter((candidate) => candidate.itemsView !== "full")) {
    try {
      const firstItems = await rpc("thread/items/list", itemsListParams(threadId, turn.id, null, { pageLimit: itemPageLimit }));
      const paged = await pageAll(rpc, "thread/items/list", firstItems,
        (cursor) => itemsListParams(threadId, turn.id, cursor, { pageLimit: itemPageLimit }), maxPages);
      itemPages += paged.pages.length;
      turns = applyItemEntries(turns, paged.pages.flatMap((page) => page.data || []));
    } catch (error) {
      if (!unsupported(error)) throw error;
    }
  }
  return { turns, mode: "paginated", turnPages: result.pages.length, itemPages, truncated: result.truncated };
}

// cov2-05 host adapter for the official transcriptUnavailable (cf74bc599 Xx →
// Wv "Session not found on disk"). The core answers "not supported yet" both for
// a thread whose rollout is gone and for one that has none because nothing was
// sent yet, so only a thread the core has recorded a first message for (a
// non-empty preview on any of the given Thread records) counts as missing; a
// fresh session stays on "No messages yet".
export function historyMissing(history, ...threads) {
  return !!history?.unavailable && threads.some((thread) => typeof thread?.preview === "string" && thread.preview.trim() !== "");
}
