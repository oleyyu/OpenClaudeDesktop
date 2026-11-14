// Files pane live refresh (B07). Pure helpers for the four ways an open file view or the tree follows the disk:
//  - edits the agent made (2.31226.0 c4e0cfada Te/K/Ee :319-382: a completed Edit/Write/MultiEdit/NotebookEdit result's
//    filePath / notebook_path refetches the file queries for that path; a query whose viewer has unsaved edits
//    (skipWriteRefetch with a hash, X :402-407) is only invalidated, never re-read under the editor),
//  - window focus and staleness (cd2efac6e El :3266-3386: refetchOnWindowFocus unless the editor is dirty, staleTime
//    xl = 5000 ms for a local file, so selecting a tab or remounting the pane re-reads a view older than that),
//  - folder changes (cccc2cf0a mv :4053-4086: the root and every expanded folder are watched and one folder's listing
//    is refetched per change),
//  - restored tabs whose file is gone (cd2efac6e Ic :2883-2916 + cccc2cf0a mb :6350-6353 dropRestoredFileTab: a tab
//    restored after relaunch whose first read is "missing" is dropped, and the pane closes when it was the last one).
// Local cores report edits as Codex fileChange items ({changes: [{path, kind}]}, kind.move_path for a rename) and
// NotebookEdit as an app tool call (agent-tool-titles.mjs appToolCall, arguments.notebook_path).
import { appToolCall } from "./agent-tool-titles.mjs";

/** El's staleTime for a local file read (cd2efac6e xl = 5e3, :3252). */
export const FILE_STALE_MS = 5000;

// Transcript items are immutable, so a streaming transcript re-derives only new or updated items.
const pathCache = new WeakMap();
const NONE = Object.freeze([]);
/** The paths one completed transcript item edited (absolute or as the core sent them), else []. */
export function editedPaths(item) {
  if (!item || typeof item !== "object" || item.status !== "completed") return NONE;
  if (!pathCache.has(item)) pathCache.set(item, deriveEditedPaths(item));
  return pathCache.get(item);
}
function deriveEditedPaths(item) {
  if (item.type === "fileChange") {
    const out = [];
    for (const change of item.changes || []) {
      if (!change || typeof change !== "object") continue;
      if (typeof change.path === "string" && change.path) out.push(change.path);
      const moved = change.kind && typeof change.kind === "object" ? change.kind.move_path : null;
      if (typeof moved === "string" && moved) out.push(moved);
    }
    return [...new Set(out)];
  }
  const call = appToolCall(item);
  if (call?.tool === "NotebookEdit" && typeof call.args.notebook_path === "string" && call.args.notebook_path) return [call.args.notebook_path];
  return NONE;
}

/**
 * Track which edit items of the shown session were already seen. The first look at a session (or at a session whose
 * transcript was still empty) only records what is there; later looks return the paths of edits completed since.
 * state: {sessionId, ids: Set, empty} | null. Returns {state, paths}.
 */
export function editInvalidation(state, sessionId, items) {
  const list = Array.isArray(items) ? items : [];
  const ids = new Set(), paths = [];
  const seed = !state || state.sessionId !== sessionId || state.empty;
  list.forEach((item, index) => {
    const edited = editedPaths(item);
    if (!edited.length) return;
    const id = typeof item.id === "string" && item.id ? item.id : `#${index}`;
    ids.add(id);
    if (!seed && !state.ids.has(id)) paths.push(...edited);
  });
  return { state: { sessionId, ids, empty: list.length === 0 }, paths: [...new Set(paths)] };
}

const trimRoot = (cwd) => String(cwd).replace(/[\\/]+$/, "");
const normalize = (value) => String(value).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/");
/** A tool path as the Files pane names it: relative to cwd when inside it; null when it is outside the workspace. */
export function tabPathForEdit(path, cwd) {
  if (typeof path !== "string" || !path) return null;
  const value = normalize(path);
  if (!value.startsWith("/")) return value.split("/").includes("..") ? null : value;
  if (typeof cwd !== "string" || !cwd) return null;
  const root = normalize(trimRoot(cwd));
  return value.startsWith(`${root}/`) ? value.slice(root.length + 1) : null;
}

/** Open tabs (paths) that an edit of `paths` touched. */
export function tabsForEdits(tabs, paths, cwd) {
  const wanted = new Set();
  for (const path of paths || []) { const tabPath = tabPathForEdit(path, cwd); if (tabPath) wanted.add(tabPath); }
  return (tabs || []).filter((tab) => wanted.has(normalize(tab.path))).map((tab) => tab.path);
}

/** Open tabs that sit in folder `dir` ("" = root) under one of the changed `names` (no names = any child). */
export function tabsForFolderChange(tabs, dir, names) {
  const folder = normalize(dir || "").replace(/\/+$/, "");
  const prefix = folder ? `${folder}/` : "";
  const named = Array.isArray(names) && names.length ? new Set(names.map((name) => normalize(name))) : null;
  return (tabs || []).filter((tab) => {
    const path = normalize(tab.path);
    if (prefix && !path.startsWith(prefix)) return false;
    const rest = path.slice(prefix.length);
    if (!rest || rest.includes("/")) return false;
    return !named || named.has(rest);
  }).map((tab) => tab.path);
}

/** A tab whose body can be re-read in place: it has a result (text or a card) and is not mid-read. */
export function tabLoaded(tab) {
  return !!tab && (typeof tab.text === "string" || typeof tab.unavailable === "string");
}
/** El's staleness: never read in this mount, or read more than FILE_STALE_MS ago. */
export function readIsStale(readAt, now = Date.now(), staleMs = FILE_STALE_MS) {
  return !Number.isFinite(readAt) || now - readAt >= staleMs;
}

/** The folders a shown tree watches (mv dirPaths [root, ...expanded]); "" is the root. */
export function watchedDirs(expandedPaths) {
  const out = [""];
  for (const path of expandedPaths || []) if (typeof path === "string" && path && !out.includes(path)) out.push(path);
  return out;
}

/**
 * Apply one read to the tab list. Returns {tabs, dropped}: the same array when nothing changed; a restored tab
 * (restored: true, from the persisted store) whose first read is "missing" is dropped instead of showing the card,
 * unless it is the tree-return path (mb passes no onRestoredFileGone for H === D.path). Any other result clears the
 * restored mark, so a file deleted later shows the deleted card.
 */
export function applyFileRead(tabs, path, result, { keepRestored = null } = {}) {
  const index = (tabs || []).findIndex((tab) => tab.path === path);
  if (index < 0) return { tabs, dropped: false };
  const tab = tabs[index];
  if (tab.restored === true && result?.unavailable === "missing" && keepRestored !== path)
    return { tabs: tabs.filter((_, at) => at !== index), dropped: true };
  // creatable (B32): the missing read's Create file answer belongs to that read only.
  const { text, unavailable, size, editHash, restored, creatable, ...rest } = tab;
  const next = { ...rest, ...result };
  const same = !Object.hasOwn(tab, "restored") && Object.keys(next).length === Object.keys(tab).length
    && Object.entries(next).every(([key, value]) => tab[key] === value);
  if (same) return { tabs, dropped: false };
  const out = tabs.slice();
  out[index] = next;
  return { tabs: out, dropped: false };
}
