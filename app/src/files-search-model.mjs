import { tn } from "../electron/i18n/index.mjs";

// Source adapter for the async filename branch of Qh, panes-tile-current.js.
// The official ready FileIndex branch is immediate; this backend has no index.
export const FILE_SEARCH_DELAY = 120;
export const FILE_SEARCH_LIMIT = 50;
export const CONTENT_SEARCH_DELAY = 250;
let nextController = 0;

export function emptySearchState(query = "") {
  return { query, phase: "idle", matches: [], matchedQuery: "", error: null,
    truncated: false, complete: false, truncationReasons: [], warnings: [] };
}

export function isPlainSearchKey(event) {
  return !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey &&
    !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229;
}

export function isRelativeFilePath(path) {
  return typeof path === "string" && path.length > 0 && !path.startsWith("/") &&
    !path.includes("\0") && path.split("/").every(part => part && part !== "." && part !== "..");
}

// B32 (cd2efac6e ko): "Reveal in file tree" on a breadcrumb folder asks for `${dir}/` (revealInFilesTree with a
// trailing slash): that folder's row is the target and only the folders above it expand.
const revealFolder = (revealPath) => (typeof revealPath === "string" && revealPath.endsWith("/") ? revealPath.slice(0, -1) : null);
export function revealRelation(entry, revealPath) {
  const folder = revealFolder(revealPath);
  if (folder !== null) {
    if (!isRelativeFilePath(entry?.path) || !isRelativeFilePath(folder) || !entry.directory) return null;
    return entry.path === folder ? "target" : folder.startsWith(`${entry.path}/`) ? "ancestor" : null;
  }
  if (!isRelativeFilePath(entry?.path) || !isRelativeFilePath(revealPath)) return null;
  if (!entry.directory && entry.path === revealPath) return "target";
  return entry.directory && revealPath.startsWith(`${entry.path}/`) ? "ancestor" : null;
}

// One direct child hint per existing directory request. Never synthesize rows,
// normalize traversal, or treat a sibling with a shared prefix as an ancestor.
export function revealChild(relative, revealPath) {
  revealPath = revealFolder(revealPath) ?? revealPath;
  if (!isRelativeFilePath(revealPath) || (relative !== "" && !isRelativeFilePath(relative))) return undefined;
  if (relative === "") return revealPath.split("/")[0];
  const prefix = `${relative}/`;
  return revealPath.startsWith(prefix) ? revealPath.slice(prefix.length).split("/")[0] : undefined;
}

// 3.6556.2 cccc2cf0a _T: a cut local filename search has the one cap note, F8ftTrFYrH with the shown count, whatever
// cut it ("Some entries may not be listed…", vxwIaQClXr, is the remote `partial` branch only).
export function searchLimitMessage({ matches = [] }) {
  return tn(matches.length, "Only the first {count} result is shown. Keep typing to narrow.", "Only the first {count} results are shown. Keep typing to narrow.");
}

// W14-code r8 gen-final-8: pathSegments (the host LitPath's [data-lit] runs) lost its last reader when r8 panes
// (r8pa-01) moved the result rows to cccc2cf0a zT/BT, whose hits are drawn by the generated SessionsHighlight (c1ea8a271 r).


export function resultNavigation(key, index, count, plain = true) {
  if (!count) return null;
  if (key === "ArrowUp" && index === 0 && plain) return "input";
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "ArrowRight" && index >= 0) return Math.min(count - 1, index + 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

function validateResponse(response, request, workspaceRoot) {
  if (!response || response.requestId !== request.requestId ||
      response.query !== request.query || response.requestedRoot !== workspaceRoot)
    throw new Error("Filename search returned a result for a different request or workspace.");
  if (response.error) return response;
  if (typeof response.root !== "string" || !response.root.startsWith("/") ||
      !Array.isArray(response.matches)) throw new Error("Filename search returned an invalid response.");
  const seen = new Set(),content=request.mode==='content';
  // B33 (cccc2cf0a Fv): folder rows only answer a filename query that ends in '/'.
  const folders=!content&&request.folders===true&&request.query.endsWith('/');
  for (const match of response.matches) {
    const identity=content?`${match.path}:${match.line}:${match.column}`:match.path;
    if (!isRelativeFilePath(match.path) || !(match.directory === false || (folders && match.directory === true)) ||
        typeof match.name !== "string" || match.name !== match.path.split("/").at(-1) || seen.has(identity) ||
        (content&&(!Number.isInteger(match.line)||match.line<1||!Number.isInteger(match.column)||match.column<1||typeof match.preview!=='string'||!Array.isArray(match.ranges))))
      throw new Error("Filename search returned an invalid file path.");
    seen.add(identity);
  }
  return response;
}

/** All root selection belongs to the main-process adapter. Renderer requests
 * carry a session identity, or a home folder selection that main must match to
 * its own known roots. workspaceRoot also validates the echoed cwd.
 * A controller is scoped to one session+workspace and must be disposed on change.
 */
export function createFileSearchController({ sessionId, pane = "main", workspaceRoot, search, cancel,
  onState = () => {}, onActivate = () => {}, enabled = true, options = {matchCase:false,wholeWord:false,regexp:false},
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  if (pane !== "main" && pane !== "artifacts") throw new TypeError("Unsupported filename search pane.");
  const prefix = `files-${Date.now().toString(36)}-${++nextController}`;
  let state = emptySearchState(), generation = 0, sequence = 0;
  let disposed = false, timer = null, active = null, pendingEnter = null;
  function publish(next) {
    if (disposed) return;
    state = next;
    onState(state);
  }
  function invalidate() {
    generation++;
    if (timer !== null) clearTimer(timer);
    timer = null;
    const previous = active;
    active = null;
    if (previous) {
      try { Promise.resolve(cancel?.({ sessionId, pane, requestId: previous.requestId })).catch(() => {}); }
      catch { /* Cancellation is best effort; generation checks remain final. */ }
    }
  }
  function fail(message, code = "SEARCH_FAILED") {
    pendingEnter = null;
    publish({ ...state, ...(code==='INVALID_PATTERN'?{matches:[]}:{}), phase: "error", error: { code, message } });
  }
  function schedule() {
    invalidate();
    const query = state.query.trim();
    const content=query.startsWith('?');
    if (!query || (content&&!query.slice(1).trim())) { publish(emptySearchState(state.query)); return; }
    if (!enabled) { publish({ ...state, phase: "paused", error: null }); return; }
    const ticket = generation;
    publish({ ...state, phase: "debouncing", error: null });
    timer = setTimer(() => {
      timer = null;
      if (disposed || ticket !== generation || !enabled) return;
      const request = { sessionId, pane, requestId: `${prefix}-${++sequence}`, query,
        ...(content?{mode:'content',options:{...options}}:query.endsWith('/')?{folders:true}:{}),
        ...(sessionId == null ? { homeWorkspace: workspaceRoot } : {}) };
      active = request;
      publish({ ...state, phase: "loading", error: null });
      Promise.resolve().then(() => {
        // Dispose can occur between the timer and this microtask. Do not start
        // work after sending an early cancellation for a request not yet sent.
        if (disposed || ticket !== generation || !enabled) return null;
        return search(request);
      }).then(response => {
        if (disposed || ticket !== generation || !enabled || state.query.trim() !== query) return;
        active = null;
        const data = validateResponse(response, request, workspaceRoot);
        if (data.error) {
          pendingEnter = null;
          if (["CANCELLED", "SUPERSEDED"].includes(data.error.code)) {
            publish({ ...state, phase: "cancelled", error: null });
            return;
          }
          fail(data.error.message || "Couldn’t search filenames.", data.error.code);
          return;
        }
        const limit=content?241:FILE_SEARCH_LIMIT,capped = data.matches.length > limit;
        const matches = data.matches.slice(0, limit).map(match => ({ ...match,
          ...(content?{findQuery:query.slice(1).trimStart(),findOptions:request.options}:{}),
          positions: (Array.isArray(match.positions) ? match.positions : [])
            .filter(position => Number.isInteger(position) && position >= 0 && position < match.path.length),
        }));
        publish({ ...state, phase: "success", matchedQuery: query, matches, error: null,
          complete: data.complete === true && !capped, truncated: data.truncated === true || capped,
          truncationReasons: [...new Set([...(data.truncationReasons || []), ...(capped ? ["result-limit"] : [])])],
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
        });
        if (pendingEnter === query) {
          pendingEnter = null;
          if (matches[0]) onActivate(matches[0]);
        }
      }).catch(error => {
        if (!disposed && ticket === generation && enabled) {
          active = null;
          fail(error?.message || String(error));
        }
      });
    }, content?CONTENT_SEARCH_DELAY:FILE_SEARCH_DELAY);
  }
  return {
    getState: () => state,
    setQuery(query) {
      if (disposed) return;
      pendingEnter = null;
      const trimmed = String(query).trim();
      const unchanged = trimmed === state.query.trim();
      publish(trimmed.startsWith('?')!==state.query.trim().startsWith('?')?emptySearchState(String(query)):{ ...state, query: String(query) });
      if (!unchanged || state.phase === "idle") schedule();
    },
    requestEnter() {
      if (disposed || !enabled || !state.query.trim() || state.phase === "error") return false;
      const query = state.query.trim();
      if (state.phase === "success" && state.matchedQuery === query) {
        if (state.matches[0]) onActivate(state.matches[0]);
      } else {
        pendingEnter = query;
        if (state.phase === "cancelled") schedule();
      }
      return true;
    },
    cancelEnter() { pendingEnter = null; },
    setOptions(value) { options={...value}; pendingEnter=null; if(state.query.trim().startsWith('?'))schedule(); },
    refresh() { if (!disposed) { pendingEnter = null; schedule(); } },
    setEnabled(value) {
      if (disposed || enabled === Boolean(value)) return;
      enabled = Boolean(value);
      pendingEnter = null;
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pendingEnter = null;
      invalidate();
    },
  };
}
