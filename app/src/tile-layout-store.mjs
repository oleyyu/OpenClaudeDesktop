// Per-session tile layout + file view state (independent implementation of the
// 2.2553.1 panes store slices that survive session switches and relaunches:
// panes-state-current.js:1737 R (100-entry cap), :3736-3845 session switch
// save/restore, :3886-3960 persist partialize). Storage is localStorage-like.
import { CHAT_TILE_ID, PANE_KINDS, sanitizeLayout, tileIds } from "./tile-layout-model.mjs";

export const TILE_STORE_KEY = "code-desktop-tiles";
export const TILE_STORE_VERSION = 1;
export const LEGACY_RATIO_KEY = "code-desktop-pane-ratios";
export const MAX_SESSION_ENTRIES = 100;
const ALLOWED_TILES = new Set([CHAT_TILE_ID, ...PANE_KINDS]);

export function emptySessionEntry() {
  return {
    taskViews: [],
    finishedExpanded: false,
    tileLayout: null,
    baseLayout: null,
    expandedTile: null,
    btwSessionId: null,
    fileTabs: [],
    activePath: null,
    treeShown: false,
    treeHiddenWhileEmpty: false,
    expandedPaths: [],
    treeScrollTop: 0,
  };
}
function sanitizeTabs(tabs) {
  if (!Array.isArray(tabs)) return [];
  const seen = new Set();
  const out = [];
  for (const tab of tabs) {
    if (!tab || typeof tab.path !== "string" || !tab.path || seen.has(tab.path)) continue;
    seen.add(tab.path);
    // restored: read back from storage (Fu restored, cccc2cf0a :6574); a first read that finds the file gone drops the tab.
    out.push({ path: tab.path, preview: tab.preview === true, restored: true, ...(typeof tab.text === "string" ? { text: tab.text } : {}) });
  }
  return out.slice(0, 8);
}
export function sanitizeSessionEntry(value) {
  const entry = emptySessionEntry();
  if (!value || typeof value !== "object") return entry;
  entry.tileLayout = sanitizeLayout(value.tileLayout, ALLOWED_TILES);
  entry.baseLayout = sanitizeLayout(value.baseLayout, ALLOWED_TILES);
  entry.expandedTile = typeof value.expandedTile === "string" && PANE_KINDS.includes(value.expandedTile) ? value.expandedTile : null;
  if (entry.expandedTile && (!entry.baseLayout || !entry.tileLayout || !tileIds(entry.tileLayout).has(entry.expandedTile))) {
    entry.expandedTile = null;
    entry.tileLayout = entry.baseLayout ?? entry.tileLayout;
    entry.baseLayout = null;
  }
  if (!entry.expandedTile) entry.baseLayout = null;
  entry.finishedExpanded = value.finishedExpanded === true;
  entry.btwSessionId = typeof value.btwSessionId === 'string' && value.btwSessionId ? value.btwSessionId : null;
  entry.taskViews = Array.isArray(value.taskViews) ? value.taskViews.filter(view => view && view.kind === 'subagent' && typeof view.threadId === 'string' && typeof view.toolId === 'string').slice(-32).map(({kind,threadId,toolId,description,ownerId})=>({kind,threadId,toolId,description:typeof description==='string'?description:'Agent',ownerId:typeof ownerId==='string'?ownerId:null})) : [];
  entry.fileTabs = sanitizeTabs(value.fileTabs);
  entry.activePath = typeof value.activePath === "string" && entry.fileTabs.some((tab) => tab.path === value.activePath) ? value.activePath : null;
  entry.treeShown = value.treeShown === true;
  entry.treeHiddenWhileEmpty = value.treeHiddenWhileEmpty === true;
  entry.expandedPaths = Array.isArray(value.expandedPaths) ? [...new Set(value.expandedPaths.filter((path) => typeof path === "string"))].slice(0, 500) : [];
  entry.treeScrollTop = Number.isFinite(value.treeScrollTop) && value.treeScrollTop >= 0 ? value.treeScrollTop : 0;
  return entry;
}
function sanitizeFlexByKind(value) {
  const out = {};
  if (!value || typeof value !== "object") return out;
  for (const kind of PANE_KINDS) {
    const flex = Number(value[kind]);
    if (Number.isFinite(flex) && flex > 0 && flex < 100) out[kind] = flex;
  }
  return out;
}
// Legacy 0.2.x ratios stored chat/(chat+side); official remembers 2*side/chat.
export function migrateLegacyRatios(raw) {
  const out = {};
  let parsed;
  try { parsed = JSON.parse(raw || "{}"); } catch { return out; }
  if (!parsed || typeof parsed !== "object") return out;
  for (const [kind, ratio] of Object.entries(parsed)) {
    if (!PANE_KINDS.includes(kind) || typeof ratio !== "number" || !(ratio > 0 && ratio < 1)) continue;
    out[kind] = Math.round(((2 * (1 - ratio)) / ratio) * 10000) / 10000;
  }
  return out;
}
// Changes file list (R10): diffShowTree is the panes store flag (panes-state-current.js
// :646-647 default false, persisted with partialize :3954); diffTreeWidth is the
// "epitaxy-diff-tree-width" value (cf3dc7910 u/b: default 240, rounded, 160..640);
// diffFileTree / diffGroupByKind are "epitaxy-diff-file-tree" (Group files by folder,
// default on) and "epitaxy-diff-group-by-kind" (Separate test, build, and generated
// files, default off). All four are global, like the source keys. diffCommitsCollapsed (B15) is
// ca80fca8d Rw "epitaxy-diff-commits-collapsed" (the Commits section header, default expanded).
export function emptyStoreState() {
  return { version: TILE_STORE_VERSION, lastPaneFlexByKind: {}, filesTreeShown: false, diffShowTree: false, diffTreeWidth: 240, diffFileTree: true, diffGroupByKind: false, diffCommitsCollapsed: false, sessions: {}, order: [] };
}
export function sanitizeStoreState(value) {
  const state = emptyStoreState();
  if (!value || typeof value !== "object") return state;
  state.lastPaneFlexByKind = sanitizeFlexByKind(value.lastPaneFlexByKind);
  state.filesTreeShown = value.filesTreeShown === true;
  state.diffShowTree = value.diffShowTree === true;
  state.diffTreeWidth = Number.isFinite(value.diffTreeWidth) ? Math.min(640, Math.max(160, Math.round(value.diffTreeWidth))) : 240;
  state.diffFileTree = value.diffFileTree !== false;
  state.diffGroupByKind = value.diffGroupByKind === true;
  state.diffCommitsCollapsed = value.diffCommitsCollapsed === true;
  const order = Array.isArray(value.order) ? value.order.filter((id) => typeof id === "string") : [];
  const sessions = value.sessions && typeof value.sessions === "object" ? value.sessions : {};
  for (const id of [...new Set([...order, ...Object.keys(sessions)])]) {
    if (!Object.hasOwn(sessions, id)) continue;
    state.sessions[id] = sanitizeSessionEntry(sessions[id]);
    state.order.push(id);
  }
  return capSessions(state);
}
// Oldest entries drop first (order is least-recent first).
export function capSessions(state, limit = MAX_SESSION_ENTRIES) {
  if (state.order.length <= limit) return state;
  const order = state.order.slice(state.order.length - limit);
  const sessions = {};
  for (const id of order) sessions[id] = state.sessions[id];
  return { ...state, sessions, order };
}
// Persisted shape: file contents are never written, only paths and preview flags.
export function partialize(state) {
  const sessions = {};
  for (const id of state.order) {
    const entry = state.sessions[id];
    if (!entry) continue;
    sessions[id] = { ...entry, fileTabs: entry.fileTabs.map(({ path, preview }) => ({ path, preview })) };
  }
  return { version: TILE_STORE_VERSION, lastPaneFlexByKind: state.lastPaneFlexByKind, filesTreeShown: state.filesTreeShown, diffShowTree: state.diffShowTree,
    diffTreeWidth: state.diffTreeWidth, diffFileTree: state.diffFileTree, diffGroupByKind: state.diffGroupByKind,
    diffCommitsCollapsed: state.diffCommitsCollapsed, sessions, order: [...state.order] };
}

// shared-28 persisted values (2.42304.0 Gf read, qf write, Xf subscribed hook, Wf bucket loading; FT-08's
// c03935b01 "epitaxy-diff-uncommitted-sessions"). Officially each value is the JSON under localStorage `persisted.<key>`,
// mirrored into the desktop preferences bucket ("epitaxyPrefs"). Locally that localStorage key is the whole store (no
// bucket): reads are synchronous, so nothing is ever loading. Unlike the tile layouts above, popout and pane windows
// write here too: each value is its own key, so a window never replaces another's values with an older copy of a blob.
// `storage` is a localStorage-like object or a function returning one (read lazily); `subscribeStorage(listener)`
// delivers other windows' `storage` events. A write the storage refuses stays in memory for this window.
export const PERSISTED_VALUE_PREFIX = "persisted.";
export function createPersistedValues({ storage = null, subscribeStorage = null } = {}) {
  const backing = () => { try { return (typeof storage === "function" ? storage() : storage) ?? null; } catch { return null; } };
  const cache = new Map(), memory = new Map(), listeners = new Map();
  let unsubscribeStorage = null;
  const notify = (key) => { for (const listener of [...(listeners.get(key) ?? [])]) listener(); };
  // The same parsed value comes back while the stored text is unchanged (a stable useSyncExternalStore snapshot).
  const read = (key, fallback) => {
    if (memory.has(key)) return memory.get(key) ?? fallback;
    let raw = null;
    try { raw = backing()?.getItem(PERSISTED_VALUE_PREFIX + key) ?? null; } catch { raw = null; }
    if (raw === null) return fallback;
    const cached = cache.get(key);
    if (cached && cached.raw === raw) return cached.value ?? fallback;
    let value;
    try { value = JSON.parse(raw); } catch { return fallback; }
    cache.set(key, { raw, value });
    return value ?? fallback;
  };
  const write = (key, next, fallback) => {
    const value = typeof next === "function" ? next(read(key, fallback)) : next;
    try {
      const target = backing();
      if (!target) throw new Error("no storage");
      if (value === undefined) target.removeItem(PERSISTED_VALUE_PREFIX + key);
      else target.setItem(PERSISTED_VALUE_PREFIX + key, JSON.stringify(value));
      memory.delete(key);
    } catch { memory.set(key, value); }
    notify(key);
  };
  const onStorage = (event) => {
    const key = event?.key;
    if (key === null || key === undefined) { for (const name of listeners.keys()) { memory.delete(name); notify(name); } return; }
    if (typeof key !== "string" || !key.startsWith(PERSISTED_VALUE_PREFIX)) return;
    const name = key.slice(PERSISTED_VALUE_PREFIX.length);
    memory.delete(name);
    notify(name);
  };
  return {
    read,
    write,
    subscribe(key, listener) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(listener);
      if (!unsubscribeStorage && subscribeStorage) unsubscribeStorage = subscribeStorage(onStorage) ?? (() => {});
      return () => {
        const set = listeners.get(key);
        set?.delete(listener);
        if (set && set.size === 0) listeners.delete(key);
        if (listeners.size === 0 && unsubscribeStorage) { unsubscribeStorage(); unsubscribeStorage = null; }
      };
    },
  };
}

export function createTileLayoutStore({ storage = null, key = TILE_STORE_KEY, legacyKey = LEGACY_RATIO_KEY } = {}) {
  let state = emptyStoreState();
  const listeners = new Set();
  const read = (name) => { try { return storage?.getItem(name) ?? null; } catch { return null; } };
  const write = (name, value) => { try { storage?.setItem(name, value); } catch { /* optional preference */ } };
  const remove = (name) => { try { storage?.removeItem(name); } catch { /* optional preference */ } };
  {
    let parsed = null;
    try { parsed = JSON.parse(read(key) || "null"); } catch { parsed = null; }
    if (parsed && typeof parsed === "object" && Number.isInteger(parsed.version) && parsed.version <= TILE_STORE_VERSION) state = sanitizeStoreState(parsed);
    const legacy = read(legacyKey);
    if (legacy !== null) {
      state = { ...state, lastPaneFlexByKind: { ...migrateLegacyRatios(legacy), ...state.lastPaneFlexByKind } };
      remove(legacyKey);
      write(key, JSON.stringify(partialize(state)));
    }
  }
  const persist = () => write(key, JSON.stringify(partialize(state)));
  // 2.42304.0 c03935b01 tileHost / setTileHost (cc43287c9 registers `{ fitOpenedLayout }` while it is mounted) and Ei's
  // `i?.fitOpenedLayout(c, c === o) ?? c`. Officially each pane's store holds one host; here one store serves every split
  // pane of the window, so a host is kept per tile owner (the session id, or the home key) and is never persisted.
  const tileHosts = new Map();
  const commit = (next) => {
    if (next === state) return;
    state = next;
    persist();
    for (const listener of listeners) listener(state);
  };
  const store = {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSession(id) { return (id && state.sessions[id]) || null; },
    // Update (or create) a session entry and mark it most recent.
    setSession(id, update) {
      if (!id) return;
      const previous = state.sessions[id] ?? emptySessionEntry();
      const patch = typeof update === "function" ? update(previous) : update;
      if (!patch) return;
      const entry = { ...previous, ...patch };
      const order = [...state.order.filter((value) => value !== id), id];
      commit(capSessions({ ...state, sessions: { ...state.sessions, [id]: entry }, order }));
    },
    // c03935b01 keepAllFileTabs: also fix previews in inactive sessions.
    keepAllFileTabs() {
      let sessions = state.sessions;
      for (const [id, entry] of Object.entries(state.sessions)) {
        if (!entry.fileTabs?.some(tab => tab.preview === true)) continue;
        if (sessions === state.sessions) sessions = { ...sessions };
        sessions[id] = { ...entry, fileTabs: entry.fileTabs.map(tab => tab.preview === true ? { ...tab, preview: false } : tab) };
      }
      if (sessions !== state.sessions) commit({ ...state, sessions });
    },
    // The mounted tile layout showing `owner`'s layout offers fitOpenedLayout(layout, rootRowOnly); null removes it.
    setTileHost(owner, host) {
      if (host) tileHosts.set(owner, host);
      else tileHosts.delete(owner);
    },
    tileHost(owner) { return tileHosts.get(owner) ?? null; },
    // A layout that just gained a pane, re-flexed by `owner`'s host (room for the chat, nested stacks included); with no
    // host mounted for it (a session not on screen) it is kept as opened.
    fitOpenedLayout(owner, layout, rootRowOnly = false) {
      return tileHosts.get(owner)?.fitOpenedLayout(layout, rootRowOnly) ?? layout;
    },
    setGlobal(patch) {
      commit({ ...state, ...patch });
    },
    // Drop entries for sessions that no longer exist.
    prune(existingIds) {
      const keep = new Set(existingIds);
      const order = state.order.filter((id) => keep.has(id));
      if (order.length === state.order.length) return;
      const sessions = {};
      for (const id of order) sessions[id] = state.sessions[id];
      commit({ ...state, sessions, order });
    },
    persist,
  };
  return store;
}
