// Changes-pane line comments (B14 D4/D5), ported from 2.31226.0:
// - c44d00c7f Ho (readable 4071-4145) openDraft / anchorSpan / hoverAdd / selectionEnd, Vo (4040-4069) the
//   deletions -> additions mapping of an unchanged span, Bo.
// - c44d00c7f ua/la (2635-2650) outdated check, da/fa/pa (2651-2683) displacement of a comment whose line is gone.
// - c44d00c7f Qa (3346-3372) the commented span of a text selection, yo (3564-3860) chip placement constants.
// - caec4a2d4 In (308-310) the card key side:endLine (c44d00c7f Je), one card per key.
// - cf56e4ee1 t: the 'Add comment on line(s)' aria-label.
// Comments are kept per session and file (caec4a2d4 keeps them per sessionId + filePath) in the same storage shape
// as the Files pane comments (file-comments-store.mjs), so they survive a remount, a reload and a popped-out window.
import { t } from "../electron/i18n/index.mjs";

export const DIFF_COMMENTS_PREFIX = "epitaxy-diff-comments:";
export const DIFF_SIDES = Object.freeze(["additions", "deletions"]);
/** caec4a2d4 In / c44d00c7f Je: the card key. */
export const diffCommentKey = (side, endLine) => `${side}:${endLine}`;
/** The composer snippet a saved comment rides on (replaced on edit, removed on delete). */
export const diffCommentAttachmentKey = (scope, path, id) => `diff-comment:${scope}:${path}:${id}`;

const normalizeCode = (code) => String(code ?? "").replace(/\r\n?|[\u2028\u2029]/g, "\n").trimEnd();
const isSide = (side) => side === "additions" || side === "deletions";
function validEntries(value) {
  return Array.isArray(value) ? value.filter((e) => e && isSide(e.side) && Number.isInteger(e.start) && e.start > 0 && Number.isInteger(e.end) && e.end >= e.start
    && (e.code === null || typeof e.code === "string") && typeof e.body === "string" && (e.savedBody === undefined || typeof e.savedBody === "string"))
    .map((e) => ({ id: diffCommentKey(e.side, e.end), side: e.side, start: e.start, end: e.end, code: e.code, body: e.body, ...(e.savedBody !== undefined ? { savedBody: e.savedBody } : {}) })) : [];
}
const order = (a, b) => a.end - b.end || (a.side === b.side ? 0 : a.side === "deletions" ? -1 : 1);

/** One file's diff comments. Entries: {id, side, start, end, code, body, savedBody?}; `active` is the card in edit. */
export function createDiffCommentsStore({ scope, storage, subscribeStorage = () => () => {} }) {
  const key = DIFF_COMMENTS_PREFIX + scope, listeners = new Set();
  const read = () => { try { return validEntries(JSON.parse(storage?.getItem(key) ?? "[]")); } catch { return []; } };
  let snapshot = { entries: read(), active: null };
  const publish = (entries, active = snapshot.active) => {
    snapshot = { entries, active };
    try { entries.length ? storage?.setItem(key, JSON.stringify(entries)) : storage?.removeItem(key); } catch {}
    for (const listener of listeners) listener();
  };
  const off = subscribeStorage((event) => {
    if (event.key !== key && event.key !== null) return;
    snapshot = { entries: read(), active: null };
    for (const listener of listeners) listener();
  });
  return {
    getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Ho openDraft: an open draft or a saved comment at the key is reopened; otherwise a new draft. Returns the key.
     * code is the commented lines' text, null when they are not all shown (never outdated, like a snippet-less draft). */
    create(side, start, end, code = null) {
      if (!isSide(side) || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) return null;
      [start, end] = [Math.min(start, end), Math.max(start, end)];
      const id = diffCommentKey(side, end), existing = snapshot.entries.find((entry) => entry.id === id);
      // A single line reopens whatever card is at its key; a saved comment is reopened for editing (zo).
      if (existing && (existing.savedBody !== undefined || existing.start === start || start === end)) { publish(snapshot.entries, id); return id; }
      // A draft at the same key over another range takes the new range (Ro replaces the draft) and keeps its text.
      const next = existing
        ? snapshot.entries.map((entry) => (entry.id === id ? { ...entry, start, code: code == null ? null : normalizeCode(code) } : entry))
        : [...snapshot.entries, { id, side, start, end, code: code == null ? null : normalizeCode(code), body: "" }].sort(order);
      publish(next, id);
      return id;
    },
    activate(id) { if (snapshot.entries.some((entry) => entry.id === id)) publish(snapshot.entries, id); },
    edit(id, body) { publish(snapshot.entries.map((entry) => (entry.id === id ? { ...entry, body: String(body) } : entry))); },
    save(id) {
      const entry = snapshot.entries.find((item) => item.id === id);
      if (!entry?.body.trim()) return null;
      const saved = { ...entry, body: entry.body.trim(), savedBody: entry.body.trim() };
      publish(snapshot.entries.map((item) => (item.id === id ? saved : item)), null);
      return saved;
    },
    cancel(id) {
      publish(snapshot.entries.flatMap((entry) => (entry.id !== id ? [entry] : entry.savedBody === undefined ? [] : [{ ...entry, body: entry.savedBody }])),
        snapshot.active === id ? null : snapshot.active);
    },
    remove(id) { publish(snapshot.entries.filter((entry) => entry.id !== id), snapshot.active === id ? null : snapshot.active); },
    /** Unmount: abandoned empty drafts go; saved comments and drafts with text stay. */
    release() { publish(snapshot.entries.filter((entry) => entry.savedBody !== undefined || entry.body.trim()), null); },
    dispose() { off(); listeners.clear(); },
  };
}
const stores = new Map();
export function diffCommentsStore(scope) {
  if (!stores.has(scope)) {
    let storage;
    try { storage = globalThis.localStorage; } catch {}
    stores.set(scope, createDiffCommentsStore({ scope, storage, subscribeStorage: (fn) => {
      globalThis.addEventListener?.("storage", fn);
      return () => globalThis.removeEventListener?.("storage", fn);
    } }));
  }
  return stores.get(scope);
}
/** The comments of one file of a Changes comment scope (useDiffComments' store; R3-files FT-07 also reads it for the
 * per-file whitespace pause, c44d00c7f Ca). */
export const diffFileCommentsStore = (scope, path) => diffCommentsStore(`${scope}\0${path}`);

/** The side/line a rendered diff row comments on: removed rows (and the split view's left column) on the old file,
 * everything else on the new file. column is "unified", "before" or "after". */
export function rowCommentTarget(row, column = "unified") {
  if (!row || row.type === "note") return null;
  const deletions = column === "before" || (column === "unified" && row.type === "removed");
  const line = deletions ? row.oldLine : row.newLine;
  return Number.isInteger(line) && line > 0 ? { side: deletions ? "deletions" : "additions", line } : null;
}

/** Vo + Ho anchorSpan: an old-file span that touches no changed line is the same text on the new file, so it is
 * commented there (the card sits under the unified row). hunks are the file's patch hunks (rows in order). */
export function anchorDiffSpan(hunks, start, end, side, { partial = false } = {}) {
  const low = Math.min(start, end), high = Math.max(start, end);
  if (side !== "deletions") return { start: low, end: high, side };
  // Vo isPartial: with only the patch's hunks known, a span not inside one hunk's old-file range stays where it is.
  if (partial && !(hunks ?? []).some((hunk) => Number.isInteger(hunk.oldStart) && low >= hunk.oldStart && high < hunk.oldStart + (hunk.oldCount ?? 0))) return { start: low, end: high, side };
  let offset = 0, nextOld = 1;
  for (const hunk of hunks ?? []) {
    nextOld = Math.max(nextOld, Number.isInteger(hunk.oldStart) ? hunk.oldStart + (hunk.oldCount === 0 ? 1 : 0) : nextOld);
    for (const row of hunk.rows ?? []) {
      if (row.type === "context") { if (Number.isInteger(row.oldLine)) nextOld = row.oldLine + 1; continue; }
      if (row.type !== "removed" && row.type !== "added") continue;
      const at = row.type === "removed" && Number.isInteger(row.oldLine) ? row.oldLine : nextOld;
      if (high < at) return { start: low + offset, end: high + offset, side: "additions" };
      if (low < at + (row.type === "removed" ? 1 : 0)) return { start: low, end: high, side };
      if (row.type === "removed") { offset -= 1; nextOld = at + 1; } else offset += 1;
    }
  }
  return { start: low + offset, end: high + offset, side: "additions" };
}

/** Line text per side of the rows the diff shows (hunks, or the complete-context regions). */
export function diffLineIndex(hunks) {
  const index = { additions: new Map(), deletions: new Map(), last: null, max: { additions: 0, deletions: 0 } };
  for (const hunk of hunks ?? []) for (const row of hunk.rows ?? []) {
    if (row.type === "note") continue;
    const text = String(row.text ?? "");
    if (row.type !== "added" && Number.isInteger(row.oldLine)) { index.deletions.set(row.oldLine, text); index.max.deletions = Math.max(index.max.deletions, row.oldLine); }
    if (row.type !== "removed" && Number.isInteger(row.newLine)) { index.additions.set(row.newLine, text); index.max.additions = Math.max(index.max.additions, row.newLine); }
    index.last = row;
  }
  return index;
}
/** kr: the span's text, or undefined when a line of it is not shown. */
export function diffSpanText(index, side, start, end) {
  const lines = index?.[side];
  if (!lines) return undefined;
  const out = [];
  for (let line = Math.min(start, end); line <= Math.max(start, end); line++) {
    if (!lines.has(line)) return undefined;
    out.push(lines.get(line));
  }
  return out.join("\n");
}
const trimmedLines = (text) => String(text).split("\n").map((line) => line.trim()).join("\n");
/** la/ua: the commented lines changed since the comment was written (whitespace at either end ignored). */
export function diffCommentOutdated(index, entry) {
  if (!entry || typeof entry.code !== "string") return false;
  const now = diffSpanText(index, entry.side, entry.start, entry.end);
  return now !== undefined && trimmedLines(now) !== trimmedLines(entry.code);
}
/** pa/da: where a comment's card goes. A line past the end of the shown patch moves to the last row of the last
 * hunk (displaced); lineGone when the whole file is shown (or it is a new/deleted file), so the line no longer exists. */
export function placeDiffComment(index, entry, { complete = false, status = "" } = {}) {
  const base = { side: entry.side, line: entry.end, displaced: false, lineGone: false };
  if (entry.end <= (index?.max?.[entry.side] ?? 0)) return base;
  const last = index?.last;
  if (!last) return base;
  const side = last.type === "context" ? entry.side : last.type === "added" ? "additions" : "deletions";
  const line = side === "additions" ? last.newLine : last.oldLine;
  if (!Number.isInteger(line)) return base;
  return { side, line, displaced: true, lineGone: complete || status === "added" || status === "deleted" };
}

/** Qa: the span a selection covers. rows are the rendered rows it touches, in order: {side, line, text, column}.
 * A selection over both columns of the split view has none; new-file rows win over old-file rows. */
export function diffSelectionSpan(rows) {
  const additions = [], deletions = [], columns = new Set();
  for (const row of rows ?? []) {
    if (!row || !Number.isInteger(row.line) || !isSide(row.side)) continue;
    (row.side === "deletions" ? deletions : additions).push(row);
    if (row.column && row.column !== "unified") columns.add(row.column);
  }
  if (columns.size > 1) return null;
  const chosen = additions.length ? additions : deletions;
  if (!chosen.length) return null;
  let startLine = Infinity, endLine = -Infinity;
  for (const { line } of chosen) { startLine = Math.min(startLine, line); endLine = Math.max(endLine, line); }
  return { startLine, endLine, side: additions.length ? "additions" : "deletions",
    lineTexts: chosen.slice().sort((a, b) => a.line - b.line).map((row) => String(row.text ?? "").replace(/\n$/, "")) };
}

/** cf56e4ee1 t. */
export function addCommentLabel({ start, end }) {
  return start === end ? t("Add comment on line {line}", { line: start }) : t("Add comment on lines {start}–{end}", { start, end });
}

// yo: the chip sits at the pointer, kept 72px inside the diff's edges, above the pointer unless that is within
// 48px of the scroller top (then 8px below it); it shows 250ms after a double/triple click.
export const SELECTION_CHIP = Object.freeze({ edge: 72, gap: 8, flipWithin: 48, multiClickDelay: 250 });
export function selectionChipPosition({ clientX, clientY, left, width, scrollerTop = 0 }) {
  const { edge, flipWithin } = SELECTION_CHIP;
  const x = left + Math.min(Math.max(clientX - left, edge), Math.max(width - edge, edge));
  return { x, y: clientY, flipBelow: clientY - scrollerTop < flipWithin };
}
