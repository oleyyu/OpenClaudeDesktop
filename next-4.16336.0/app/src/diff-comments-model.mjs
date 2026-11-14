// Changes-pane line comments (B14 D4/D5), ported from 2.31226.0:
// - c44d00c7f Ho (readable 4071-4145) openDraft / anchorSpan / hoverAdd / selectionEnd, Vo (4040-4069) the
//   deletions -> additions mapping of an unchanged span, Bo.
// - c44d00c7f ua/la (2635-2650) outdated check, da/fa/pa (2651-2683) displacement of a comment whose line is gone.
// - c44d00c7f Qa (3346-3372) the commented span of a text selection, yo (3564-3860) chip placement constants.
// - caec4a2d4 In (308-310) the card key side:endLine (c44d00c7f Je), one card per key.
// - cf56e4ee1 t: the 'Add comment on line(s)' aria-label.
// Comments are kept per session and file (caec4a2d4 keeps them per sessionId + filePath) in the official cc8941b7b store
// (createAnnotationCommentsStore below, W14-code r7 r7pa-03), so they survive a remount, a reload and a popped-out window.
import { t } from "../electron/i18n/index.mjs";

/** The host's own pre-r7 comment storage (one localStorage list per scope and file), read only by the import below. */
export const DIFF_COMMENTS_PREFIX = "epitaxy-diff-comments:";
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

// W14-code r7 (r7pa-03): one comment store for both Changes bodies. 3.6556.2 keeps every Changes line comment in
// cc8941b7b F (`h()(ee((e,t)=>({annotationsBySession:{},…}),{name:"diff-annotations",partialize:Oe}))`): the pierre body
// (c44d00c7f Ju) and the per-file list (Md) Jd draws in a pop-out window or with the switch off read and write the same
// store. The host per-file rows (FileDiff / useDiffComments) therefore read F too, through this adapter: saved comments
// are F's annotations (annotationsBySession[session][path], source unset; their open edit text is P.editBodiesBySession),
// drafts are F's draftsBySession[session][path][side:endLine] (their text P.bodiesBySession), the card in edit is
// F.activeBySession[session]. Writes go through F's own actions, as the official card (c82eca2bd) calls them: a new
// comment `addAnnotation(session, {...draft, body})` + `clearDraft`, an edit `updateAnnotation(session, path, id, body)` +
// `setActive(session, null)`, delete `removeAnnotation`. The host entry shape (id = the card key side:endLine, start,
// end, code, body, savedBody?) is kept for the cards; a saved entry also carries annotationId (the composer snippet key,
// shared with the pierre body). store / bodies are cc8941b7b F and P (injected: this model stays free of the generated
// layer, E42).
const isLineComment = (annotation) => !!annotation && annotation.source !== "pr" && annotation.source !== "file" && annotation.source !== "finding";
const validSpan = (item) => !!item && isSide(item.side) && Number.isInteger(item.startLine) && Number.isInteger(item.endLine) && item.startLine > 0 && item.endLine >= item.startLine;
/** The session a Changes comment scope belongs to: the scope is JSON [sessionId, cwd] (source-session.jsx); any other
 * string is its own session. F keys comments by session and file path. */
export function diffCommentSession(scope) {
  try { const value = JSON.parse(scope); if (Array.isArray(value) && typeof value[0] === "string" && value[0]) return value[0]; } catch {}
  return String(scope);
}
/** One file's diff comments over F / P. Entries: {id, annotationId?, side, start, end, code, body, savedBody?}; `active`
 * is the card in edit. */
export function createAnnotationCommentsStore({ sessionId, path, store, bodies }) {
  let inputs = null, snapshot = { entries: [], active: null };
  const read = () => {
    const state = store.getState(), texts = bodies.getState();
    const next = [state.annotationsBySession?.[sessionId]?.[path], state.draftsBySession?.[sessionId]?.[path], state.activeBySession?.[sessionId],
      texts.bodiesBySession?.[sessionId]?.[path], texts.editBodiesBySession?.[sessionId]];
    if (inputs && next.every((value, index) => value === inputs[index])) return snapshot;
    inputs = next;
    const [saved, drafts, active, draftBodies, editBodies] = next;
    const entries = [], keys = new Set();
    for (const annotation of saved ?? []) {
      if (!isLineComment(annotation) || !validSpan(annotation)) continue;
      const key = diffCommentKey(annotation.side, annotation.endLine), body = typeof annotation.body === "string" ? annotation.body : "";
      entries.push({ id: keys.has(key) ? annotation.id : key, annotationId: annotation.id, side: annotation.side, start: annotation.startLine, end: annotation.endLine,
        code: typeof annotation.snippet === "string" ? annotation.snippet : null, body: editBodies?.[annotation.id] ?? body, savedBody: body });
      keys.add(key);
    }
    for (const [key, draft] of Object.entries(drafts ?? {})) {
      if (!isLineComment(draft) || !validSpan(draft) || keys.has(key)) continue;
      keys.add(key);
      entries.push({ id: key, side: draft.side, start: draft.startLine, end: draft.endLine, code: typeof draft.snippet === "string" ? draft.snippet : null,
        body: typeof draftBodies?.[key] === "string" ? draftBodies[key] : "" });
    }
    entries.sort(order);
    const current = active && active.filePath === path && !active.highlightOnly ? entries.find((entry) => entry.id === active.key) : null;
    snapshot = { entries, active: current?.id ?? null };
    return snapshot;
  };
  const find = (id) => read().entries.find((entry) => entry.id === id);
  const keyOf = (entry) => diffCommentKey(entry.side, entry.end);
  const actions = () => store.getState();
  const unsetActive = (entry) => {
    const active = actions().activeBySession?.[sessionId];
    if (active && active.filePath === path && active.key === keyOf(entry)) actions().setActive(sessionId, null);
  };
  return {
    getSnapshot: read,
    subscribe(fn) {
      const offs = [store.subscribe(() => fn()), bodies.subscribe(() => fn())];
      return () => { for (const off of offs) off(); };
    },
    /** Ho openDraft (c44d00c7f): an open draft or a saved comment at the key is reopened (setActive); otherwise a new
     * draft (setDraft). code is the commented lines' text, null when they are not all shown (no snippet). */
    create(side, start, end, code = null) {
      if (!isSide(side) || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) return null;
      [start, end] = [Math.min(start, end), Math.max(start, end)];
      const id = diffCommentKey(side, end), existing = find(id);
      if (existing && (existing.savedBody !== undefined || existing.start === start || start === end)) {
        actions().setActive(sessionId, { filePath: path, key: id });
        return id;
      }
      // A draft at the same key over another range takes the new range; its text (P, by key) stays.
      actions().setDraft(sessionId, { filePath: path, side, startLine: start, endLine: end, ...(code == null ? {} : { snippet: normalizeCode(code) }) });
      return id;
    },
    activate(id) { const entry = find(id); if (entry) actions().setActive(sessionId, { filePath: path, key: keyOf(entry) }); },
    edit(id, body) {
      const entry = find(id);
      if (!entry) return;
      if (entry.savedBody !== undefined) bodies.getState().setEditBody(sessionId, entry.annotationId, String(body));
      else bodies.getState().setDraftBody(sessionId, path, entry.id, String(body));
    },
    save(id) {
      const entry = find(id), text = entry?.body.trim();
      if (!text) return null;
      if (entry.savedBody !== undefined) {
        actions().updateAnnotation(sessionId, path, entry.annotationId, text);
        actions().setActive(sessionId, null);
        return { ...entry, body: text, savedBody: text };
      }
      const draft = actions().draftsBySession?.[sessionId]?.[path]?.[entry.id];
      const created = actions().addAnnotation(sessionId, { ...draft, body: text });
      actions().clearDraft(sessionId, path, entry.id);
      return { ...entry, annotationId: created.id, body: text, savedBody: text };
    },
    cancel(id) {
      const entry = find(id);
      if (!entry) return;
      if (entry.savedBody === undefined) { actions().clearDraft(sessionId, path, entry.id); return; }
      bodies.getState().clearEditBody(sessionId, entry.annotationId);
      unsetActive(entry);
    },
    remove(id) {
      const entry = find(id);
      if (!entry) return;
      if (entry.savedBody !== undefined) actions().removeAnnotation(sessionId, path, entry.annotationId);
      else actions().clearDraft(sessionId, path, entry.id);
    },
    /** Unmount: abandoned empty drafts go; saved comments and drafts with text stay. */
    release() {
      for (const entry of read().entries) if (entry.savedBody === undefined && !entry.body.trim()) actions().clearDraft(sessionId, path, entry.id);
      const active = actions().activeBySession?.[sessionId];
      if (active && active.filePath === path) actions().setActive(sessionId, null);
    },
    dispose() {},
  };
}

/** The comments the host kept before r7pa-03 (localStorage `epitaxy-diff-comments:<scope>\0<path>`, one list per file),
 * imported once into F: saved ones become annotations, unsaved ones drafts (the active card is left as it was). The old
 * value is kept under DIFF_COMMENTS_IMPORTED_PREFIX, so nothing is lost and nothing is imported twice. Returns the count. */
export const DIFF_COMMENTS_IMPORTED_PREFIX = "epitaxy-diff-comments-imported:";
export function importLegacyDiffComments({ storage, store, bodies, key }) {
  if (!storage || !key?.startsWith(DIFF_COMMENTS_PREFIX)) return 0;
  let raw = null, entries = [];
  try { raw = storage.getItem(key); } catch { return 0; }
  if (raw == null) return 0;
  try { entries = validEntries(JSON.parse(raw)); } catch { entries = []; }
  const scoped = key.slice(DIFF_COMMENTS_PREFIX.length), split = scoped.indexOf("\0");
  if (split < 0) return 0;
  const sessionId = diffCommentSession(scoped.slice(0, split)), path = scoped.slice(split + 1);
  const state = () => store.getState(), before = state().activeBySession?.[sessionId] ?? null;
  let count = 0;
  for (const entry of entries) {
    const span = { filePath: path, side: entry.side, startLine: entry.start, endLine: entry.end, ...(entry.code == null ? {} : { snippet: entry.code }) };
    if (entry.savedBody !== undefined) {
      const same = (state().annotationsBySession?.[sessionId]?.[path] ?? []).some((annotation) => isLineComment(annotation)
        && diffCommentKey(annotation.side, annotation.endLine) === entry.id && annotation.body === entry.savedBody);
      if (!same) { state().addAnnotation(sessionId, { ...span, body: entry.savedBody }); count++; }
    } else if (!state().draftsBySession?.[sessionId]?.[path]?.[entry.id]) {
      state().setDraft(sessionId, span);
      if (entry.body) bodies.getState().setDraftBody(sessionId, path, entry.id, entry.body);
      count++;
    }
  }
  if (state().activeBySession?.[sessionId] !== before) state().setActive(sessionId, before);
  try { storage.setItem(DIFF_COMMENTS_IMPORTED_PREFIX + scoped, raw); storage.removeItem(key); } catch {}
  return count;
}
/** Every legacy key in a Storage (key(i) / length), for the import on load. */
export function legacyDiffCommentKeys(storage) {
  const keys = [];
  try { for (let index = 0; index < (storage?.length ?? 0); index++) { const key = storage.key(index); if (key?.startsWith(DIFF_COMMENTS_PREFIX)) keys.push(key); } } catch {}
  return keys;
}

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

// 3.6556.2 c44d00c7f Bl re (Pl 250 / Fl 72 / Il 8 / Ll 48): the chip sits at the pointer in the file wrapper's own
// coordinates (`x = min(max(clientX - left, Fl), max(width - Fl, Fl))`, `y = clientY - top`), kept 72px inside its
// edges, above the pointer unless that is within 48px of the scroller top (zl; then 8px below it); it shows 250ms
// after a double/triple click.
export const SELECTION_CHIP = Object.freeze({ edge: 72, gap: 8, flipWithin: 48, multiClickDelay: 250 });
export function selectionChipPosition({ clientX, clientY, left, top = 0, width, scrollerTop = 0 }) {
  const { edge, flipWithin } = SELECTION_CHIP;
  const x = Math.min(Math.max(clientX - left, edge), Math.max(width - edge, edge));
  return { x, y: clientY - top, flipBelow: clientY - scrollerTop < flipWithin };
}
