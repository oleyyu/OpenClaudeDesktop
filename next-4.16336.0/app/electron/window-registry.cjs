// Window registry: every main (session) window of this process, the layout each one shows (its primary
// session and, in split view, the sessions of its extra panes), where desktop events go, and which windows to
// restore on the next launch. Claude Desktop 2.31226.0 keeps one main window whose "dframe-pane-host" (shared-23 a1)
// shows a primary pane and up to nine extra session panes in a grid; OpenClaude Desktop allows several main windows
// (File › New Window, a session's "Open in new window"), each with its own grid.
// Pure apart from the injected fs / timers / BrowserWindow, so it is unit-testable (tests/window-registry.test.mjs).
//
// FOR OTHER MAIN-PROCESS SERVICES (terminal pane, preview pane, anything keyed per session):
// - Never assume "the" window. A renderer request arrives with its IPC event: resolve the window that asked with
//       const host = windowRegistry.hostWindow(event.sender);   // BrowserWindow (main window or pane popout) or null
//   and attach native views to that window, e.g. host.contentView.addChildView(view); view.setBounds(rect).
//   `windowRegistry.windowForSender(event.sender)` is the same lookup limited to main windows.
// - A session can be visible in several windows at once, and on either split side of one window (both sides of a
//   window are one renderer / one webContents). Key shared per-session resources (a pty, a dev server) by session
//   id, but per-window things (a WebContentsView positioned over a pane) by `${host.id}:${sessionId}`, or give one
//   view to one pane at a time (preview-service.cjs: the pane showing the page holds it until it hides it, as
//   2.2553.1's showPreview claimant). `windowRegistry.windowsShowing(sessionId)` lists the windows
//   whose reported layout shows the session; `windowRegistry.mainWindows()` lists every live main window.
// - Pane rects measured in a renderer (getBoundingClientRect) are CSS px of that window's content area; multiply by
//   host.webContents.getZoomFactor() for view bounds. A split side is just a region of the same content area.
// - Events: main.cjs emit() → windowRegistry.dispatch(event) sends session and app events to every main window
//   (each window's sidebar and reducer follow every session), "desktop-navigate" to the window showing the session,
//   and events stamped with `windowId` (kinds in WINDOW_SCOPED) to that window only. To answer only the window that
//   asked, use windowRegistry.send(host, event) (channel "desktop:event").
// - windowRegistry.onWindowClosed((window, key) => …) fires after a main window is gone, so views, terminals or
//   watchers bound to it can be released. Pane popouts are not main windows (main.cjs `popouts`).
const nodeFs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const MAIN_WINDOW_KEY = "main";
const OPEN_WINDOWS_FILE = "open-windows.json";
const MAX_WINDOWS = 8;
// B27 (cd377abb5 xi / shared-11 Zo "code-session" and "code-draft" popouts): a session in a window of its own is a
// sidebar-less session popout — one session, no split — registered here beside the full main windows so it gets the
// same IPC and event routing. Popouts are not written to open-windows.json (popout-restore.cjs brings them back) and
// do not count toward MAX_WINDOWS; they have their own cap.
// A pane window (B27: the Tasks, Terminal and Side chat panes popped out, cd377abb5 Ci/_i) runs the session's App with
// that one pane: registered as WINDOW_KINDS.PANE for the same IPC and events, it holds its session (the shared
// connection keeps it subscribed) but never counts as showing it for routing, unread marks or notifications.
const WINDOW_KINDS = Object.freeze({ MAIN: "main", SESSION: "session", PANE: "pane" });
const singleSession = (kind) => kind === WINDOW_KINDS.SESSION || kind === WINDOW_KINDS.PANE;
const MAX_SESSION_POPOUTS = 16;
const SAVE_DELAY_MS = 400;
const EVENT_CHANNEL = "desktop:event";
const WINDOW_KEY = /^[a-z0-9-]{1,40}$/;
// Kinds that, when they carry a windowId, belong to that window alone (a pane window docking back into the window
// that popped it out; the full-screen state of one window).
const WINDOW_SCOPED = new Set(["window", "popout-docked"]);
const RATIO_MIN = 0.15, RATIO_MAX = 0.85, RATIO_DEFAULT = 0.5;

const validSessionId = (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value) ? value : null;
const validWindowKey = (value) => typeof value === "string" && WINDOW_KEY.test(value) ? value : null;
const clampRatio = (value) => Number.isFinite(value) ? Math.min(RATIO_MAX, Math.max(RATIO_MIN, value)) : RATIO_DEFAULT;

// A renderer's "window-layout" report (src/split-view-model.mjs splitLayout): the primary pane's session and, while
// split, the extra panes as grid cells ({ sessionId, col 0..4, row 0|1 }, the reference pane store's extraPanes),
// the column weights, the row split and the focused pane (0 the primary). The earlier two-sided shape
// ({ sessionId, ratio, active }) still reads, as one pane in column 1 with [ratio, 1 - ratio] weights. Anything else
// drops out; one session never shows twice in a window and two panes never share a cell.
const MAX_COLUMNS = 5;
function sanitizePanes(value, current) {
  let panes = Array.isArray(value.panes) ? value.panes : null, weights = value.colWeights;
  if (panes === null && "sessionId" in value) {
    panes = [{ sessionId: value.sessionId, col: 1, row: 0 }];
    weights = Number.isFinite(value.ratio) ? [clampRatio(value.ratio), 1 - clampRatio(value.ratio)] : null;
  }
  const seen = new Set(current ? [current] : []), cells = new Set(["0:0"]), list = [];
  for (const pane of (panes ?? []).slice(0, MAX_COLUMNS * 2)) {
    const sessionId = validSessionId(pane?.sessionId), col = pane?.col, row = pane?.row;
    if (!sessionId || seen.has(sessionId) || !Number.isInteger(col) || col < 0 || col >= MAX_COLUMNS || (row !== 0 && row !== 1) || cells.has(`${col}:${row}`)) continue;
    seen.add(sessionId); cells.add(`${col}:${row}`);
    list.push({ sessionId, col, row });
  }
  const columns = list.reduce((max, pane) => Math.max(max, pane.col + 1), 1);
  const colWeights = Array.isArray(weights) && weights.length === columns && weights.every((entry) => Number.isFinite(entry) && entry > 0)
    ? weights.map((entry) => Math.max(0.01, entry)) : null;
  return { panes: list, colWeights };
}
function sanitizeLayout(raw) {
  if (!raw || typeof raw !== "object") return { current: null, split: null };
  const current = validSessionId(raw.current);
  const value = raw.split;
  if (!value || typeof value !== "object") return { current, split: null };
  const { panes, colWeights } = sanitizePanes(value, current);
  if (!panes.length) return { current, split: null };
  const active = Number.isInteger(value.active) && value.active >= 0 && value.active <= panes.length ? value.active : 0;
  return { current, split: { panes, colWeights, rowSplit: clampRatio(value.rowSplit), active } };
}
// R4g-btw BT3 (X7-14, btw-read-01): the /btw child sessions a window's session tiles show (its renderer's shown list,
// src/btw-read-state.mjs useReportShownSession). 2.42304.0 x_ (shared-11 `function x_(e){h_.has(e)||__.includes(e)||y_.getState().markUnread(e)}`)
// skips a child in the renderer's shown list __; the official popouts are window.open children of that one renderer
// (cd377abb5 `window.open("about:blank",j,"")`), so __ covers every window. Locally each window is its own renderer and
// main.cjs makes the automatic unread decision, so every window reports its list and the windows' layouts count them.
const MAX_SIDE_SESSIONS = 16;
function sanitizeSideSessions(value) {
  const list = [];
  for (const entry of Array.isArray(value) ? value : []) {
    const sessionId = validSessionId(entry);
    if (sessionId && !list.includes(sessionId)) list.push(sessionId);
    if (list.length >= MAX_SIDE_SESSIONS) break;
  }
  return list;
}
// The sessions a window's layout shows; with `sideSessions`, also the /btw children its session tiles show.
function layoutSessions(layout, sideSessions = []) {
  const { current, split } = sanitizeLayout(layout);
  const list = [current, ...(split?.panes ?? []).map((pane) => pane.sessionId)].filter(Boolean);
  for (const sessionId of sanitizeSideSessions(sideSessions)) if (!list.includes(sessionId)) list.push(sessionId);
  return list;
}
// 2.42304.0 shared-11 closeSidePanePopoutsForSession (called by c03935b01 evictEpitaxySession `lc` when a session is
// archived or deleted): the side-pane popouts of that session, and a session-tile popout whose view shows it.
// `popouts`: main.cjs's pane popout entries ({ sessionId, pane, sessionView? }).
function sidePanePopoutsForSession(popouts, sessionId) {
  const id = validSessionId(sessionId);
  if (!id) return [];
  return [...(popouts ?? [])].filter((entry) => entry && (entry.sessionId === id || (entry.pane === "session" && entry.sessionView?.sessionId === id)));
}
// Where one desktop event goes: "all" main windows, the window showing a session, or one window by id.
function routeEvent(event) {
  if (!event || typeof event !== "object") return { target: "none" };
  if (event.kind === "desktop-navigate") return { target: "session", sessionId: validSessionId(event.threadId) };
  // 'Add to prompt' from a pane window (a line comment in a popped-out Changes pane, plan comments in a popped-out
  // Plan pane): the window showing that session, else the window that popped the pane out, which then opens it.
  if (event.kind === "add-to-prompt") return { target: "session", sessionId: validSessionId(event.sessionId), windowId: Number.isInteger(event.windowId) ? event.windowId : null };
  // A file reference opened in a pane window (B27: the Tasks or Terminal pane popped out) opens in the window showing
  // that session, else the window that popped the pane out.
  if (event.kind === "open-file-ref") return { target: "session", sessionId: validSessionId(event.sessionId), windowId: Number.isInteger(event.windowId) ? event.windowId : null };
  if (WINDOW_SCOPED.has(event.kind) && Number.isInteger(event.windowId)) return { target: "window", windowId: event.windowId };
  return { target: "all" };
}
// userData/open-windows.json → the windows to open at launch, in their creation order, and the one focused last.
// A missing, corrupt or empty file opens the single main window (today's first launch).
function restorableWindows(raw) {
  const windows = [], seen = new Set();
  for (const entry of Array.isArray(raw?.windows) ? raw.windows : []) {
    const key = validWindowKey(entry?.key);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    windows.push({ key, layout: sanitizeLayout(entry.layout) });
    if (windows.length >= MAX_WINDOWS) break;
  }
  if (!windows.length) windows.push({ key: MAIN_WINDOW_KEY, layout: sanitizeLayout(null) });
  const focused = validWindowKey(raw?.focused) && windows.some((entry) => entry.key === raw.focused) ? raw.focused : windows[0].key;
  return { windows, focused };
}
// What a window's renderer restores when it loads (main.cjs init → windowLayout). The first main window keeps
// today's start on the new-session page unless it was split (then both sides come back); any other window — a
// relaunched one, or one just opened for a session — reopens what it showed.
function launchLayout(key, layout, kind = WINDOW_KINDS.MAIN) {
  const value = sanitizeLayout(layout);
  // A session popout shows its one session (none: a new-session draft) and is never split.
  if (singleSession(kind)) return { current: value.current, split: null };
  return key === MAIN_WINDOW_KEY && !value.split ? { current: null, split: null } : value;
}
function newWindowKey(random = randomUUID) {
  const tail = String(random()).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  return `w-${tail || Date.now().toString(36)}`;
}

function createWindowRegistry({ file = null, fs = nodeFs, timers = { setTimeout, clearTimeout }, delay = SAVE_DELAY_MS, BrowserWindow = null } = {}) {
  const entries = new Map(); // BrowserWindow → { window, key, layout, focusedAt, state }
  const closedListeners = new Set();
  let focusSeq = 0, timer = null, frozen = false;
  const live = (window) => !!window && !(window.isDestroyed?.()) && !(window.webContents?.isDestroyed?.());
  const target = () => (typeof file === "function" ? file() : file);
  const liveEntries = () => [...entries.values()].filter((entry) => live(entry.window));
  const fullEntries = () => liveEntries().filter((entry) => entry.kind === WINDOW_KINDS.MAIN);

  function snapshot() {
    // Session popouts come back through popout-restore.cjs, not as main windows.
    const list = fullEntries(), focused = lastFocusedEntry(fullEntries());
    return { version: 1, focused: focused?.key ?? null, windows: list.map((entry) => ({ key: entry.key, layout: entry.layout })) };
  }
  function write() {
    const destination = target();
    if (!destination || frozen) return false;
    try {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination + ".tmp", JSON.stringify(snapshot(), null, 2));
      fs.renameSync(destination + ".tmp", destination);
      return true;
    } catch { return false; }
  }
  function schedule() {
    if (frozen || !target()) return;
    timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { timer = null; write(); }, delay);
    timer?.unref?.();
  }
  function flush() { timers.clearTimeout(timer); timer = null; return write(); }
  // A quit closes every window one by one: the list written when the first close starts is the one restored, so the
  // closes that follow do not shrink it.
  function freeze() { if (frozen) return; flush(); frozen = true; }
  function read() {
    const source = target();
    if (!source) return restorableWindows(null);
    try { return restorableWindows(JSON.parse(fs.readFileSync(source, "utf8"))); }
    catch { return restorableWindows(null); }
  }

  function register(window, { key = MAIN_WINDOW_KEY, layout = null, kind = WINDOW_KINDS.MAIN } = {}) {
    const entryKind = kind === WINDOW_KINDS.SESSION || kind === WINDOW_KINDS.PANE ? kind : WINDOW_KINDS.MAIN;
    const entry = { window, key: validWindowKey(key) ?? newWindowKey(), kind: entryKind,
      layout: singleSession(entryKind) ? launchLayout(null, layout, entryKind) : sanitizeLayout(layout), focusedAt: ++focusSeq, state: new Map(), launch: null, sideSessions: [] };
    entry.launch = launchLayout(entry.key, entry.layout, entry.kind);
    entries.set(window, entry);
    schedule();
    return entry;
  }
  function unregister(window) {
    const entry = entries.get(window);
    if (!entry) return null;
    entries.delete(window);
    schedule();
    for (const listener of [...closedListeners]) { try { listener(window, entry.key); } catch {} }
    return entry;
  }
  function entryFor(value) {
    if (!value) return null;
    if (entries.has(value)) return entries.get(value);
    for (const entry of entries.values()) if (entry.window.webContents === value || entry.window.id === value) return entry;
    return null;
  }
  function lastFocusedEntry(list = liveEntries()) {
    let best = null;
    for (const entry of list) if (!best || entry.focusedAt > best.focusedAt) best = entry;
    return best;
  }
  // side: also count the /btw children a window reports (a pane window's own session still needs `panes`).
  function windowsShowing(sessionId, { panes = false, side = false } = {}) {
    const id = validSessionId(sessionId);
    if (!id) return [];
    return liveEntries().filter((entry) => layoutSessions(panes || entry.kind !== WINDOW_KINDS.PANE ? entry.layout : null, side ? entry.sideSessions : []).includes(id))
      .map((entry) => entry.window);
  }
  function send(window, event) {
    if (!live(window)) return false;
    window.webContents.send(EVENT_CHANNEL, event);
    return true;
  }
  function broadcast(event) {
    const sent = [];
    for (const entry of liveEntries()) if (send(entry.window, event)) sent.push(entry.window);
    return sent;
  }
  // Returns the windows the event went to.
  function dispatch(event) {
    const route = routeEvent(event);
    if (route.target === "none") return [];
    if (route.target === "all") return broadcast(event);
    if (route.target === "window") {
      const owner = liveEntries().find((entry) => entry.window.id === route.windowId)?.window ?? lastFocusedEntry()?.window;
      return owner && send(owner, event) ? [owner] : [];
    }
    // A session event for one window: the focused window when it shows the session, else the newest-focused window
    // showing it, else the newest-focused window (which then opens it).
    // A route that names a fallback window (add-to-prompt: the pane window's owner) uses it in place of the newest-focused.
    const showing = windowsShowing(route.sessionId);
    const focused = lastFocusedEntry()?.window ?? null;
    // A session popout shows its own session only (B27): a session no window shows opens in a full window.
    const fallback = (route.windowId != null && liveEntries().find((entry) => entry.window.id === route.windowId)?.window) || lastFocusedEntry(fullEntries())?.window || focused;
    const chosen = showing.includes(focused) ? focused
      : showing.sort((a, b) => entries.get(b).focusedAt - entries.get(a).focusedAt)[0] ?? fallback;
    return chosen && send(chosen, event) ? [chosen] : [];
  }

  return {
    register, unregister, read, flush, freeze, snapshot, send, broadcast, dispatch, windowsShowing,
    isMain: (window) => entries.has(window) && live(window),
    isMainSender: (event) => {
      const entry = entryFor(event?.sender);
      return !!entry && live(entry.window) && event.senderFrame === entry.window.webContents.mainFrame;
    },
    windowForSender: (sender) => { const entry = entryFor(sender); return entry && live(entry.window) && entry.window.webContents === sender ? entry.window : null; },
    // Any BrowserWindow hosting this webContents: a main window, else (with BrowserWindow injected) a pane popout.
    hostWindow: (contents) => {
      const entry = entryFor(contents);
      if (entry && live(entry.window)) return entry.window;
      const found = BrowserWindow?.fromWebContents?.(contents) ?? null;
      return found && !found.isDestroyed() ? found : null;
    },
    mainWindows: () => liveEntries().map((entry) => entry.window),
    // Full windows (sidebar, split view) apart from the session popouts.
    fullWindows: () => fullEntries().map((entry) => entry.window),
    lastFocused: () => lastFocusedEntry()?.window ?? null,
    lastFocusedFull: () => lastFocusedEntry(fullEntries())?.window ?? null,
    kindOf: (window) => entries.get(window)?.kind ?? null,
    isSessionPopout: (window) => entries.get(window)?.kind === WINDOW_KINDS.SESSION && live(window),
    isPaneWindow: (window) => entries.get(window)?.kind === WINDOW_KINDS.PANE && live(window),
    // Every window holding the session, pane windows included (the shared connection keeps it subscribed for them).
    windowsHolding: (sessionId) => windowsShowing(sessionId, { panes: true }),
    // shared-11 Xo: a code-session popout is keyed by its session — the popout showing it (a draft popout that started
    // it included), if any.
    sessionPopouts: () => liveEntries().filter((entry) => entry.kind === WINDOW_KINDS.SESSION).map((entry) => ({ window: entry.window, sessionId: entry.layout.current })),
    popoutFor: (sessionId) => {
      const id = validSessionId(sessionId);
      return id ? liveEntries().find((entry) => entry.kind === WINDOW_KINDS.SESSION && entry.layout.current === id)?.window ?? null : null;
    },
    byKey: (key) => liveEntries().find((entry) => entry.key === key)?.window ?? null,
    keyOf: (window) => entries.get(window)?.key ?? null,
    noteFocus: (window) => { const entry = entries.get(window); if (!entry) return; entry.focusedAt = ++focusSeq; schedule(); },
    layoutOf: (window) => entries.get(window)?.layout ?? sanitizeLayout(null),
    // The layout a (re)loading renderer restores, taken when its page starts loading (captureLaunch) so the new page's
    // own first reports cannot replace it before init reads it.
    // The window's first load opens as a launch does (the main window on Home unless it had a split); a later load is
    // a reload (⌘R, View › Reload, a Language change), which keeps the open session too.
    captureLaunch: (window) => {
      const entry = entries.get(window);
      if (!entry) return null;
      entry.launch = entry.loaded ? sanitizeLayout(entry.layout) : launchLayout(entry.key, entry.layout, entry.kind);
      entry.loaded = true;
      // A new page has not shown any /btw child yet; it reports its own once it does (X7-14).
      entry.sideSessions = [];
      return entry.launch;
    },
    launchLayoutOf: (window) => entries.get(window)?.launch ?? sanitizeLayout(null),
    setLayout: (window, layout) => {
      const entry = entries.get(window);
      if (!entry) return sanitizeLayout(null);
      const next = singleSession(entry.kind) ? launchLayout(null, layout, entry.kind) : sanitizeLayout(layout);
      if (JSON.stringify(next) !== JSON.stringify(entry.layout)) { entry.layout = next; if (entry.kind === WINDOW_KINDS.MAIN) schedule(); }
      return entry.layout;
    },
    // R4g-btw BT3 (X7-14): a window's report of the /btw children its session tiles show ("window-side-sessions").
    // Not written to open-windows.json: the children come back with their panes.
    setSideSessions: (window, list) => {
      const entry = entries.get(window);
      if (!entry) return [];
      entry.sideSessions = sanitizeSideSessions(list);
      return entry.sideSessions;
    },
    sideSessionsOf: (window) => entries.get(window)?.sideSessions ?? [],
    // Per-window slots main.cjs keeps beside the window (menu reports, the hidden-by-close flag).
    getState: (window, name) => entries.get(window)?.state.get(name),
    setState: (window, name, value) => { entries.get(window)?.state.set(name, value); return value; },
    onWindowClosed: (listener) => { closedListeners.add(listener); return () => closedListeners.delete(listener); },
    get frozen() { return frozen; },
  };
}

module.exports = { MAIN_WINDOW_KEY, OPEN_WINDOWS_FILE, MAX_WINDOWS, MAX_SESSION_POPOUTS, WINDOW_KINDS, SAVE_DELAY_MS, EVENT_CHANNEL, WINDOW_SCOPED,
  sanitizeLayout, layoutSessions, sanitizeSideSessions, sidePanePopoutsForSession, MAX_SIDE_SESSIONS, routeEvent, restorableWindows, launchLayout, newWindowKey, createWindowRegistry };
