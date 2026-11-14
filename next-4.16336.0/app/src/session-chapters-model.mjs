// Session chapters: the per-session chapter store and the table of contents it feeds.
//
// Ported from the installed 2.31226.0 frontend:
// - cd5a31703 Twe/Ewe/zw/Bw/Vw/Hw (readable 3128-3192): one persisted store ("epitaxy-chapters-v2") keyed by session
//   with {renames, hidden, userChapters}. A rename of a pinned (user) chapter rewrites its title; a rename of a
//   Claude chapter (mark_chapter) is kept in `renames`; Delete hides a Claude chapter and removes a pinned one.
//   addUserChapter refuses a second pin after the same anchor and returns the new id (uch-<uuid>) or null.
// - cd5a31703 jwe (3216-3226): a pinned chapter's seed title is the seed text's first non-empty line, 40 characters
//   plus an ellipsis. The claude.ai title generation call that may replace it (Mwe) is cloud-only and not ported.
// - cd5a31703 Iwe/Kw/Fwe/Lwe (3260-3354): the chapter list in transcript order — a "Session start" entry, then per
//   assistant row the pinned chapters anchored to any of its item ids (k_) and the row's own mark_chapter heading
//   unless hidden (renamed title first). The rail shows only when a chapter other than Session start exists.
// - cf74bc599 Wy/Yy/Xy/Zy/$y (3187-3232): the active chapter is the last one whose heading sits at or above the
//   viewport top + 64px, the last chapter at the bottom of the scroller, and scroll samples near the bottom are
//   throttled to one per 50ms.
//
// Local adaptation: the transcript is one flat list of display rows (main.jsx shownRows), so an "entry" is a row:
// entryId is the row id and entryIndex its index. Pinned chapters render as the same h2 before their anchor row
// (cd5a31703 $2e/e4e/Q0 render the pinned headings ahead of the anchored item).

export const CHAPTERS_STORAGE_KEY = "epitaxy-chapters-v2";
export const SESSION_START_ID = "session-start";
export const SEED_TITLE_LIMIT = 40;
/** zw: the DOM id of a chapter heading (the TOC scrolls to it). */
export const chapterAnchorId = (id) => `epitaxy-ch-${id}`;

const EMPTY_SESSION = Object.freeze({ renames: Object.freeze({}), hidden: Object.freeze([]), userChapters: Object.freeze([]) });
const EMPTY_LIST = Object.freeze([]);
export const EMPTY_CHAPTER_STATE = Object.freeze({ bySession: Object.freeze({}) });

/** The chapter state of one session (Bw when it has none). */
export function sessionChapterState(state, sessionId) {
  return (sessionId && state?.bySession?.[sessionId]) || EMPTY_SESSION;
}

// Vw: apply `update` to one session's state; the same object back means nothing changed.
function updateSession(state, sessionId, update) {
  const current = sessionChapterState(state, sessionId), next = update(current);
  return next === current ? state : { bySession: { ...(state?.bySession ?? {}), [sessionId]: next } };
}

/** rename: a pinned chapter's title, or a Claude chapter's rename. */
export function renameChapter(state, sessionId, id, title) {
  if (!sessionId || !id || typeof title !== "string") return state;
  return updateSession(state, sessionId, (session) => session.userChapters.some((chapter) => chapter.id === id)
    ? { ...session, userChapters: session.userChapters.map((chapter) => chapter.id === id ? { ...chapter, title } : chapter) }
    : { ...session, renames: { ...session.renames, [id]: title } });
}

/** setHidden: hide (Delete in the rail) or show a Claude chapter. */
export function setChapterHidden(state, sessionId, id, hidden) {
  if (!sessionId || !id) return state;
  return updateSession(state, sessionId, (session) => {
    const list = session.hidden.filter((entry) => entry !== id);
    if (hidden) list.push(id);
    return { ...session, hidden: list };
  });
}

/** addUserChapter: pin a chapter at `afterId`; {state, id} with id null when that anchor already has one. */
export function addUserChapter(state, sessionId, afterId, title, makeId = randomChapterId) {
  if (!sessionId) return { state, id: null };
  let id = null;
  const next = updateSession(state, sessionId, (session) => {
    if (session.userChapters.some((chapter) => chapter.afterId === afterId)) return session;
    id = makeId();
    return { ...session, userChapters: [...session.userChapters, { id, afterId, title: String(title ?? "") }] };
  });
  return { state: next, id };
}

/** removeUserChapter: unpin. */
export function removeUserChapter(state, sessionId, id) {
  if (!sessionId || !id) return state;
  return updateSession(state, sessionId, (session) => session.userChapters.some((chapter) => chapter.id === id)
    ? { ...session, userChapters: session.userChapters.filter((chapter) => chapter.id !== id) } : session);
}

export function randomChapterId() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `uch-${uuid}`;
}

/** Dwe: a Claude chapter's hidden flag and renamed title. */
export function chapterView(state, sessionId, id) {
  const session = sessionChapterState(state, sessionId);
  return { hidden: !!sessionId && session.hidden.includes(id), renamedTitle: sessionId ? session.renames[id] : undefined };
}


/** Kw: pinned chapters grouped by anchor (undefined when there are none). */
export function chaptersByAnchor(userChapters) {
  if (!userChapters?.length) return undefined;
  const map = new Map();
  for (const chapter of userChapters) {
    const list = map.get(chapter.afterId);
    if (list) list.push(chapter); else map.set(chapter.afterId, [chapter]);
  }
  return map;
}

/** jwe: a pinned chapter's seed title — the first non-empty line, 40 characters and an ellipsis. */
export function seedChapterTitle(text) {
  const value = typeof text === "string" ? text : "";
  const line = value.split("\n").find((entry) => entry.trim().length > 0) ?? value.trim();
  const head = line.trim().slice(0, SEED_TITLE_LIMIT);
  return line.trim().length > SEED_TITLE_LIMIT ? `${head}…` : head;
}

/** k_: every item id a display row stands for (a grouped tool row holds several; a coalesced file run too). */
export function rowItemIds(row) {
  if (!row || typeof row.id !== "string") return EMPTY_LIST;
  const ids = [row.id];
  for (const list of [row.toolGroup, row.fileRun]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry && typeof entry.id === "string" && !ids.includes(entry.id)) ids.push(entry.id);
      if (Array.isArray(entry?.fileRun)) for (const inner of entry.fileRun) if (inner && typeof inner.id === "string" && !ids.includes(inner.id)) ids.push(inner.id);
    }
  }
  return ids;
}

const isUserRow = (row) => row?.type === "userMessage";

/**
 * H6e pinAnchorItemId (qL): the turn footer pins at the turn's first assistant row — the first row of `turnId` that
 * is not the user's message and that `isHidden` does not hide. Undefined when the turn shows no such row.
 */
export function turnPinAnchor(rows, turnId, isHidden = () => false) {
  if (!turnId || !Array.isArray(rows)) return undefined;
  return rows.find((row) => row?.turnId === turnId && !isUserRow(row) && !row.localCommand && !isHidden(row))?.id;
}

/**
 * A row's seed text for a pin: an assistant message's text (Q0 seedText e.text), otherwise GL — the first tool's
 * description, command, file_path, pattern or prompt argument, else its name.
 */
export function rowSeedText(row) {
  if (!row) return "";
  if (row.type === "agentMessage" || row.type === "plan") return typeof row.text === "string" ? row.text : "";
  const first = Array.isArray(row.toolGroup) && row.toolGroup.length ? row.toolGroup[0] : row;
  const args = first.arguments && typeof first.arguments === "object" ? first.arguments : first.input && typeof first.input === "object" ? first.input : {};
  const pick = (value) => typeof value === "string" && value.trim() ? value : undefined;
  return pick(args.description) ?? pick(first.description) ?? pick(args.command) ?? pick(first.command)
    ?? pick(args.file_path) ?? pick(first.changes?.[0]?.path) ?? pick(args.pattern) ?? pick(args.prompt)
    ?? pick(first.tool) ?? pick(first.name) ?? "";
}

/** The pinned chapters a display row anchors (any of its item ids), in pin order. */
export function pinnedChaptersForRow(session, row) {
  const userChapters = session?.userChapters;
  if (!userChapters?.length || !row) return EMPTY_LIST;
  const ids = rowItemIds(row);
  const list = userChapters.filter((chapter) => chapter.afterId !== null && ids.includes(chapter.afterId));
  return list.length ? list : EMPTY_LIST;
}

const sameChapter = (a, b) => a.id === b.id && a.title === b.title && a.summary === b.summary && a.source === b.source
  && a.entryId === b.entryId && a.entryIndex === b.entryIndex && a.itemIndex === b.itemIndex;

/** Fwe: keep the previous list (and its unchanged entries) when nothing moved, so the rail does not re-measure. */
export function reuseChapters(previous, next) {
  if (!Array.isArray(previous)) return next;
  let same = previous.length === next.length;
  const out = next.slice();
  for (let index = 0; index < Math.min(previous.length, next.length); index += 1)
    if (sameChapter(previous[index], next[index])) out[index] = previous[index]; else same = false;
  return same ? previous : out;
}

/**
 * Iwe: the session's chapters in transcript order. rows are the displayed rows; chapterOf(row) is a mark_chapter
 * row's {id, title, summary?}; sessionStartTitle is the localized "Session start" label (omitted with no rows).
 */
export function sessionChapters(rows, session, { sessionStartTitle = null, chapterOf = () => null } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const renames = session?.renames ?? EMPTY_SESSION.renames;
  const hidden = new Set(session?.hidden ?? EMPTY_LIST);
  const byAnchor = chaptersByAnchor(session?.userChapters);
  const out = [];
  const firstId = list[0]?.id ?? "";
  const pushPinned = (afterId, entryId, entryIndex) => {
    for (const chapter of byAnchor?.get(afterId) ?? EMPTY_LIST)
      out.push({ id: chapter.id, title: chapter.title, source: "user", entryId, entryIndex });
  };
  pushPinned(null, firstId, 0);
  list.forEach((row, index) => {
    if (!row || isUserRow(row)) return;
    if (byAnchor) for (const id of rowItemIds(row)) pushPinned(id, row.id, index);
    const chapter = chapterOf(row);
    if (chapter && !hidden.has(chapter.id))
      out.push({ id: chapter.id, title: renames[chapter.id] ?? chapter.title, ...(chapter.summary ? { summary: chapter.summary } : {}),
        source: "claude", entryId: row.id, entryIndex: index });
  });
  if (sessionStartTitle && list.length > 0)
    out.unshift({ id: SESSION_START_ID, title: sessionStartTitle, source: "session", entryId: firstId, entryIndex: 0 });
  return out;
}

/** Lwe: the rail shows once there is a chapter beyond Session start. */
export const hasChapters = (chapters) => Array.isArray(chapters) && chapters.some((chapter) => chapter.source !== "session");

// cf74bc599 Wy/Yy/Xy: the reading line sits 64px below the scroller top; within 8px of the bottom the last chapter
// is current and samples are throttled to one per 50ms.
export const CHAPTER_READING_OFFSET = 64;
export const CHAPTER_BOTTOM_SLOP = 8;
export const CHAPTER_SAMPLE_THROTTLE_MS = 50;

/** Zy: whether a scroll sample near the bottom should wait for the throttle. */
export const deferChapterSample = (now, lastSampleAt, distanceToBottomPx) =>
  distanceToBottomPx <= CHAPTER_BOTTOM_SLOP && now - lastSampleAt < CHAPTER_SAMPLE_THROTTLE_MS;

/**
 * $y: the active chapter id. getAnchorTop(chapter) is the heading's viewport top or null when it is not in the DOM;
 * then the first visible row's index (firstEntryIndex) decides whether the chapter is above the reading line.
 */
export function activeChapterId(chapters, { canScroll, distanceToBottomPx, viewportTopPx, firstEntryIndex = -1, firstItemIndex = -1, getAnchorTop }) {
  if (!Array.isArray(chapters)) return null;
  if (canScroll && distanceToBottomPx <= CHAPTER_BOTTOM_SLOP) return chapters.at(-1)?.id ?? null;
  let active = null;
  for (const chapter of chapters) {
    if (chapter.source === "session") { active = chapter.id; continue; }
    const top = getAnchorTop(chapter);
    if (top === null || top === undefined) {
      const itemIndex = chapter.itemIndex ?? 0;
      if (firstEntryIndex >= 0 && (chapter.entryIndex < firstEntryIndex
        || (chapter.entryIndex === firstEntryIndex && firstItemIndex >= 0 && (chapter.source === "user" ? itemIndex <= firstItemIndex : itemIndex < firstItemIndex))))
        active = chapter.id;
      continue;
    }
    if (top <= viewportTopPx) active = chapter.id;
    else break;
  }
  return active;
}

// ---- The persisted store (Hw: zustand persist over localStorage, {state, version}) ----

function validSession(value) {
  if (!value || typeof value !== "object") return null;
  const renames = {};
  if (value.renames && typeof value.renames === "object")
    for (const [id, title] of Object.entries(value.renames)) if (typeof title === "string") renames[id] = title;
  const hidden = Array.isArray(value.hidden) ? value.hidden.filter((id) => typeof id === "string") : [];
  const userChapters = Array.isArray(value.userChapters) ? value.userChapters
    .filter((chapter) => chapter && typeof chapter.id === "string" && (chapter.afterId === null || typeof chapter.afterId === "string") && typeof chapter.title === "string")
    .map(({ id, afterId, title }) => ({ id, afterId, title })) : [];
  return { renames, hidden, userChapters };
}

/** Parses the persisted value; anything unreadable is an empty store. */
export function parseChapterState(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const bySession = value?.state?.bySession ?? value?.bySession;
    if (!bySession || typeof bySession !== "object") return EMPTY_CHAPTER_STATE;
    const out = {};
    for (const [sessionId, session] of Object.entries(bySession)) {
      const parsed = validSession(session);
      if (parsed) out[sessionId] = parsed;
    }
    return { bySession: out };
  } catch {
    return EMPTY_CHAPTER_STATE;
  }
}

export const serializeChapterState = (state) => JSON.stringify({ state: { bySession: state?.bySession ?? {} }, version: 0 });

export function createChapterStore({ storage = null, subscribeStorage = () => () => {}, makeId = randomChapterId } = {}) {
  const listeners = new Set();
  const read = () => { try { return parseChapterState(storage?.getItem(CHAPTERS_STORAGE_KEY) ?? null); } catch { return EMPTY_CHAPTER_STATE; } };
  let state = read();
  const emit = () => { for (const listener of listeners) listener(); };
  const commit = (next) => {
    if (next === state) return;
    state = next;
    try { storage?.setItem(CHAPTERS_STORAGE_KEY, serializeChapterState(state)); } catch { /* storage unavailable: kept for this window */ }
    emit();
  };
  const off = subscribeStorage((event) => {
    if (event?.key !== CHAPTERS_STORAGE_KEY && event?.key !== null) return;
    state = read();
    emit();
  });
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    rename: (sessionId, id, title) => commit(renameChapter(state, sessionId, id, title)),
    setHidden: (sessionId, id, hidden) => commit(setChapterHidden(state, sessionId, id, hidden)),
    addUserChapter(sessionId, afterId, title) {
      const result = addUserChapter(state, sessionId, afterId, title, makeId);
      commit(result.state);
      return result.id;
    },
    removeUserChapter: (sessionId, id) => commit(removeUserChapter(state, sessionId, id)),
    /** H6e unpin: every pinned chapter at an anchor. */
    unpinAt(sessionId, afterId) {
      let next = state;
      for (const chapter of sessionChapterState(state, sessionId).userChapters)
        if (chapter.afterId === afterId) next = removeUserChapter(next, sessionId, chapter.id);
      commit(next);
    },
    dispose() { off(); listeners.clear(); },
  };
}

let shared = null;
/** The window's chapter store over localStorage, kept in step with other windows through the storage event. */
export function chapterStore() {
  if (!shared) {
    let storage = null;
    try { storage = globalThis.localStorage ?? null; } catch { storage = null; }
    shared = createChapterStore({ storage, subscribeStorage: (listener) => {
      globalThis.addEventListener?.("storage", listener);
      return () => globalThis.removeEventListener?.("storage", listener);
    } });
  }
  return shared;
}
