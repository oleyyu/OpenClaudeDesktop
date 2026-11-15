// Host of the sidebar nav body on Claude Desktop 4.16336.0 (surfaces-prod-3 sidebar lane; plan
// analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/nav-plan/plan.json bStage step 2).
//
// The official nav body is sliced, not written here: generated/frame-sidebar-nav SidebarNavBody (shared-22 PI, mounted by
// src/frame-sidebar-nav-body.jsx after this table is installed) with the New
// row, the Search row, the destination list and the session lists. Every declaration the slice stops at is a named boundary
// of scripts/extract-frame-sidebar-nav.mjs, dispatched through the generated src/frame-sidebar-nav-adapter.mjs to the table
// below (installFrameSidebarNavHost). The frame-sidebar boundaries the nav reaches too (`reuse`) are answered once, by
// frame-sidebar-host.jsx; this module answers the rest from main.jsx's state (FrameSidebarNavHost `value`).
//
// Kinds of answers (HOST_ANSWERS):
//   host    OpenClaude state or actions under the official shape (LocalSessions over the local Code sessions in the official
//           LocalSessionManager.getSessionList record shape, asar/.vite/build/index.chunk-CqaSnEfn.js formatSessionForEvent;
//           the scheduler; preferences; the route; the palette; toasts; dialogs);
//   gate    the fixed answer of an official gate on this desktop (host-growthbook.mjs: a flag the table does not list is
//           not in the payload);
//   gap     an official service the host does not have (telemetry, RUM, the claude.ai API: un-stubbed paths answer the
//           official custom-3p 503, asar/.vite/build/index.chunk-Du-Wqi0E.js), or a lazily loaded official chunk this
//           pass does not ship (the slot draws nothing: the official no-ui / fail-open state; a loader rejects).
import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { installFrameSidebarNavHost } from "./frame-sidebar-nav-adapter.mjs";
import { QueryClient, QueryClientProvider } from "./generated/files-changes-v4/file-browser-query.mjs";
import { HOST_GROWTHBOOK, growthBookFlagKey } from "./host-growthbook.mjs";
import { useStartIntl } from "./source-code-start-adapters.jsx";
import { useSourceToasts } from "./source-toast.jsx";
// cds-core wave 8 (W8-M6): shared-25 tu, the official frame pathname store (store_shared25_tu), is held by cds-core; the host
// projects main.jsx's route into it through its own setState (no shadow store). shared-62 Qk: the one host answer.
import { store_shared25_tu as officialPathnameStore, store_shared8_Y_ as officialUnreadStore } from "./cds-core.mjs";
import { ownerThreadId } from "./state.js";
import { routineUnreadState } from "./sidebar-routines-model.mjs";
import { useServedDeploymentConfig } from "./source-routine-cowork-adapters.jsx";
// shared-7 zg (useEffectiveErrorCategory): the one host answer the home and the Code sidebar status glyph (code-current-v4
// sidebar-status-glyph.mjs W_) already use — the official no-billing result `{effectiveCategory: e, billingNotSelfManageable}`.
import { useHomeEffectiveErrorCategory } from "./source-home-v4-adapters.jsx";
import { sessionName, timestampMs } from "./sidebar-model.js";
import { sidebarRoutinesStore } from "./source-sidebar-routines-adapters.jsx";
// shared-1 C6 (useShortcut) for the two ids the nav asks (shared-21 rj / gj: command_palette, search_palette): the host's own
// binding table for the chords main.jsx's window keydown really handles (shortcuts-dialog-model.mjs GENERAL rows "search"
// cmd+k and "search-palette" cmd+shift+k, matched by globalShortcutCommand), and the host's GV matcher.
import { isMacPlatform, shortcutsDialogSections } from "./shortcuts-dialog-model.mjs";
import { shortcutMatches } from "./chat-side-chat-model.mjs";

export const FrameSidebarNavHostContext = createContext(null);
function useHost() {
  const host = useContext(FrameSidebarNavHostContext);
  if (!host) throw Error("frame-sidebar-nav: FrameSidebarNavHost is not mounted above the official nav body");
  return host;
}
let live = null;
// U-NAV-MENU: the official session row's right-click / ⋯ menu (frame-sidebar-nav-session-actions.jsx, the host answer for the
// not-shipped c39a247c4) opens the host's own session menu through main.jsx's value.
// The menu opens with the official pin state (the user may have pinned the row by dragging it to Pinned), which main.jsx
// copies into the session's metadata so the menu offers Pin or Unpin to match.
export function openNavSessionMenu(id, at) { return live?.openSessionMenu?.(id, { ...at, starred: navPins ? !!navPins.get(id) : undefined }) ?? false; }
// The official Code pins ({ get, set }: shared-39 Kf / Jf), provided by frame-sidebar-nav-body.jsx once the nav graph is loaded.
let navPins = null;
export function provideNavPins(pins) { navPins = pins; }
// Host → official: a record whose isStarred (metadata `pinned`) changed is written to the official pins; on the first list,
// only the host's pinned rows are (a row pinned in the official store alone stays pinned).
function syncNavPins(previous, next) {
  if (!navPins) return;
  for (const [sessionId, record] of next) {
    const before = previous?.get(sessionId);
    const changed = previous ? !!before && !!before.isStarred !== !!record.isStarred : !!record.isStarred;
    if (changed && !!navPins.get(sessionId) !== !!record.isStarred) navPins.set(sessionId, !!record.isStarred);
  }
}

const renderNothing = () => null;
const noEffect = () => undefined;
const notShipped = (what) => () => Promise.reject(Object.assign(Error(`frame-sidebar-nav: the official lazy chunk ${what} is not shipped in OpenClaude Desktop`), { name: "ChunkLoadError" }));

// ---- the official 3P stub answer (asar/.vite/build/index.chunk-Du-Wqi0E.js: "503 for un-stubbed API path") ---------------
const custom3pUnavailable = () => new Response(JSON.stringify({ type: "error", error: { type: "custom_3p_not_available", message: "Not available in OpenClaude Desktop" } }),
  { status: 503, headers: { "Content-Type": "application/json" } });
const apiFetcher = async () => custom3pUnavailable();

// ---- shortcuts: shared-1 C6 over the host's binding table ------------------------------------------------------------
// wave 8d sidebar lane. The answer stood at `useHost().shortcut?.(id) ?? { shortcutString: undefined, … }`, and no host value
// carries `shortcut`, so the official Search row (shared-21 rj: `{shortcutString: s} = An(i ? "search_palette" :
// "command_palette")`, passed as the nav row's `shortcut`, drawn by shared-18 iP `opacity-0 group-hover:opacity-100`) never
// had keys to show on hover. Official C6 returns `{description, shortcutString: T6(m[0]), matchShortcut, bindings}` over its
// table h6 (shared-1 yE `command_palette: {key: "k"}, search_palette: {key: "k", shift: !0}`, bE: cmd on a Mac, ctrl off it;
// T6 = `[...modifiers, key].join("+")`). The host binds exactly these chords itself (globalShortcutCommand: ⌘K / Ctrl+K
// "search", ⇧⌘K Meta only "search-palette"), so the bindings are read from that table: a Mac takes the row's keys, off a Mac
// cmd becomes ctrl only where the host also accepts Ctrl (search). Any other id keeps the earlier answer. C6's v6 (the
// shortcut analytics) is not sent.
const NAV_SHORTCUT_COMMANDS = Object.freeze({ command_palette: { command: "search", ctrlOffMac: true }, search_palette: { command: "search-palette", ctrlOffMac: false } });
const NO_SHORTCUT = Object.freeze({ description: undefined, shortcutString: undefined, matchShortcut: () => null, bindings: Object.freeze([]) });
function hostShortcutAnswer(id, mac) {
  const spec = NAV_SHORTCUT_COMMANDS[id];
  if (!spec) return null;
  const row = shortcutsDialogSections({ surface: "code", mac }).flatMap((section) => section.rows).find((r) => r.command === spec.command);
  if (!row) return NO_SHORTCUT;
  const bindings = row.keys.map((keys) => keys.split("+")).map((parts) => ({ key: parts.at(-1), modifiers: parts.slice(0, -1) }))
    .flatMap((b) => (mac ? [b] : spec.ctrlOffMac ? [{ ...b, modifiers: b.modifiers.map((m) => (m === "cmd" ? "ctrl" : m)) }] : []));
  const matchShortcut = (event) => {
    for (const binding of bindings) if (shortcutMatches(event, binding)) return event.repeat ? (event.preventDefault(), null) : binding;
    return null;
  };
  return { description: row.label, shortcutString: bindings[0] ? [...bindings[0].modifiers, bindings[0].key].join("+") : undefined, matchShortcut, bindings };
}
function useNavShortcut(id) {
  const host = useHost();
  const mac = isMacPlatform();
  const answer = useMemo(() => hostShortcutAnswer(id, mac), [id, mac]);
  return answer ?? host.shortcut?.(id) ?? NO_SHORTCUT;
}

// ---- route: the official pathname of main.jsx's route ---------------------------------------------------------------
// Desktop routes of 4.16336.0 (generated nav: "/epitaxy" Code home, `/epitaxy/${id}` a Code session, "/new" a new chat,
// `/chat/${id}` a chat, "/code/routines", "/customize", "/projects", "/artifacts").
export function officialPathname({ mode, section = null, current = null, routineId = null } = {}) {
  if (mode === "code") {
    if (section === "routines") return routineId ? `/code/routines/${encodeURIComponent(routineId)}` : "/code/routines";
    return current ? `/epitaxy/${encodeURIComponent(current)}` : "/epitaxy";
  }
  if (section === "customize") return "/customize";
  if (section === "projects") return "/projects";
  if (section === "artifacts") return "/artifacts";
  return current ? `/chat/${encodeURIComponent(current)}` : "/new";
}
// The inverse of officialPathname: an official pathname the sliced nav navigates to (destination rows, New, session rows,
// View all) as the host route. Paths of 4.16336.0: shared-21 IM / zM (chats /chats /recents; projects /projects; scheduled
// /scheduled-task; routines /claude-code-desktop/scheduled /epitaxy/scheduled /code/scheduled /code/routines; customize
// /customize /plugins /settings), shared-21 HN (epitaxy-apps /code/artifacts, artifacts /artifacts), the New row (/new, /epitaxy)
// and the session rows (/epitaxy/:id, /chat/:id). `actions` are main.jsx's: openSurface(mode, id | null), openRoutines(id | null),
// openSection(section), openSettings(tab), showSessionsPage(mode). Returns false for a pathname the host has no route for.
const ROUTINE_PATHS = ["/claude-code-desktop/scheduled", "/epitaxy/scheduled", "/code/scheduled", "/code/routines", "/scheduled-task"];
const EPITAXY_PAGES = new Set(["scheduled", "projects", "flask"]);
export function officialPathToHostRoute(to, actions, { mode } = {}) {
  const pathname = String(to ?? "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const id = (match) => decodeURIComponent(match[1]);
  let match;
  if (pathname === "/epitaxy" || pathname === "/code") return actions.openSurface("code", null), true;
  if ((match = /^\/epitaxy\/([^/]+)$/.exec(pathname)) && !EPITAXY_PAGES.has(match[1])) return actions.openSurface("code", id(match)), true;
  if (pathname === "/new") return actions.openSurface("chat", null), true;
  if ((match = /^\/chat\/([^/]+)$/.exec(pathname))) return actions.openSurface("chat", id(match)), true;
  for (const base of ROUTINE_PATHS) {
    if (pathname === base) return actions.openRoutines(null), true;
    if (pathname.startsWith(base + "/")) return actions.openRoutines(decodeURIComponent(pathname.slice(base.length + 1))), true;
  }
  if (pathname === "/customize" || pathname.startsWith("/customize/") || pathname === "/plugins" || pathname.startsWith("/plugins/")) return actions.openSettings("customize-skills"), true;
  if (pathname === "/projects" || pathname === "/cowork/projects") return actions.openSection("projects"), true;
  if (pathname === "/artifacts" || pathname === "/code/artifacts") return actions.openSection("artifacts"), true;
  if (pathname === "/chats" || pathname === "/recents") return actions.showSessionsPage(mode === "code" ? "code" : mode ?? "chat"), true;
  return false;
}
// shared-25 tu (the frame pathname store): the official store cds-core holds (wave 8); main.jsx's route is written through its
// setState with the same fields the host wrote before (pathname, pendingPathname cleared, arrival "navigation").
function publishPath(pathname) {
  if (officialPathnameStore.getState().pathname === pathname) return;
  officialPathnameStore.setState({ pathname, pendingPathname: null, arrival: "navigation" });
}
// tu is a vanilla zustand store (cds-core shared-25 `tu = bi()(…)`, read officially through useStore: shared-25 ru = vi(nu, e));
// the host reads it the same way, through React's useSyncExternalStore over its subscribe / getState.
function usePathnameSelect(selector) {
  const read = () => selector(officialPathnameStore.getState());
  return useSyncExternalStore(officialPathnameStore.subscribe, read, read);
}
function routerLocation(pathname) {
  const location = Object.freeze({ pathname, search: Object.freeze({}), searchStr: "", hash: "", href: pathname, state: Object.freeze({}) });
  return Object.freeze({ location, resolvedLocation: location, matches: Object.freeze([]), status: "idle", isLoading: false });
}
function useRouterState(options) {
  const pathname = usePathnameSelect((state) => state.pathname);
  const state = useMemo(() => routerLocation(pathname), [pathname]);
  return typeof options?.select === "function" ? options.select(state) : state;
}
const navigateTo = (to) => live?.navigateOfficial?.(typeof to === "string" ? to : to?.to ?? to?.href);
// The frame's router boundary (frame-sidebar-host.jsx routeTo) hands the nav body's pushes here: true when main.jsx took the
// pathname as one of its routes (officialPathToHostRoute), false for a pathname the host has no route for.
export const navigateOfficialPathname = (pathname) => live?.navigateOfficial?.(pathname) === true;
const tanStackRouter = Object.freeze({
  navigate: (options) => navigateTo(options), history: Object.freeze({ back: () => live?.travel?.(-1), forward: () => live?.travel?.(1) }),
  preloadRoute: () => Promise.resolve(), buildLocation: (options) => routerLocation(String(options?.to ?? officialPathnameStore.getState().pathname)).location,
  get state() { return routerLocation(officialPathnameStore.getState().pathname); },
});

// ---- desktop bridges ---------------------------------------------------------------------------------------------------
// LocalSessions (shared-0 qO = globalThis["claude.web"].LocalSessions): the local Code sessions as the official main
// process formats them (formatSessionForEvent: sessionId, cwd, originCwd, isRunning, turnRunning, createdAt,
// lastActivityAt, title, model, isArchived, isStarred, branch, worktreePath, worktreeName). getSessionList also carries
// loadGeneration / archivedPending (archived rows are listed with the rest: nothing deferred). main.jsx passes the Code
// sessions in every mode (the manager's list does not follow the shown surface) and their load state (localSessionsState).
// The local session is a Codex thread (name, createdAt / updatedAt in seconds); the official record's times are epoch
// milliseconds (Date.now(); sidebar-model.js timestampMs) and its title is the shown name (sessionName: the thread name, else its preview).
//   isRunning / pendingToolPermissions are the row's status inputs (shared-39 dp: `mp(e) ? "requires_action" : e.isRunning ||
//     … ? "running" : "idle"`, mp = pendingToolPermissions with an entry that is not a `confirm_` CLI tool use; shared-39 GT →
//     liveStatus → shared-57 lC → shared-20 hN: the 6px status dot, muted while running, warning while awaiting input, none
//     when idle). The host's facts come from main.jsx's engine state (officialSessionLive below), not from the session record.
export function officialLocalSession(session, meta = {}, live = {}) {
  return {
    sessionId: session.id, cwd: session.cwd, originCwd: session.originCwd ?? session.cwd,
    isRunning: !!live.running, turnRunning: !!live.running,
    pendingToolPermissions: live.pendingToolPermissions,
    createdAt: timestampMs(session.createdAt ?? session.updatedAt), lastActivityAt: timestampMs(session.updatedAt ?? session.createdAt),
    title: meta.title ?? session.title ?? (sessionName(session) || undefined), model: session.model, branch: session.branch,
    worktreePath: session.worktreePath, worktreeName: session.worktreeName,
    isArchived: !!(meta.archived ?? session.archived), isStarred: !!meta.pinned,
  };
}
// The engine facts of one Code session for officialLocalSession, as the classic sidebar reads them
// (sidebar-session-current-model.mjs currentSidebarSession): a turn is active, and the approvals waiting on the session (a
// sub-agent's count for the session that owns it). The list keeps its identity while the same requests wait, so the bridge's
// record comparison (sameSessionRecord) does not report an unchanged session.
const pendingLists = new Map(); // sessionId -> { key, list }
export function officialSessionLive(session, state = {}) {
  const running = !!state.active?.[session.id] || session.status?.type === "active";
  const waiting = (state.approvals ?? []).filter((approval) => approval.params?.threadId && ownerThreadId(state, approval.params.threadId) === session.id);
  if (!waiting.length) { pendingLists.delete(session.id); return { running, pendingToolPermissions: undefined }; }
  const key = waiting.map((approval, index) => String(approval.id ?? index)).join("\n");
  let held = pendingLists.get(session.id);
  if (held?.key !== key) pendingLists.set(session.id, held = { key, list: Object.freeze(waiting.map((approval, index) => Object.freeze({ requestId: String(approval.id ?? index) }))) });
  return { running, pendingToolPermissions: held.list };
}
// Unread (shared-8 Z_ / $_ / ev over cds-core shared-8 Y_, the official renderer unread store; shared-39 GT `s = e.isUnread ||
// o.has(e.id)` → "ready", the accent dot): the host's truth is sessionMetadata[id].unread / explicitUnread (main.cjs
// sidebar-state "metadata"), mirrored into the official store after each commit. A change the official code makes in the
// store itself (markRead / markUnread / markUnreadExplicit) is written back to the host's metadata.
let mirroring = false;
const sameIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
export function syncUnread(metadata) {
  const next = routineUnreadState(metadata), held = officialUnreadStore.getState();
  // (the official store is persisted, "epitaxy-unread-v1": what it hydrated with is replaced by the host's metadata too)
  if (sameIds(next.unreadIds, held.unreadIds) && sameIds(next.explicitUnreadIds, held.explicitUnreadIds)) return;
  mirroring = true;
  try { officialUnreadStore.setState({ unreadIds: next.unreadIds, explicitUnreadIds: next.explicitUnreadIds }); } finally { mirroring = false; }
}
officialUnreadStore.subscribe((state, previous) => {
  if (mirroring) return;
  // electron/sidebar-read-state.cjs: explicitUnread = unread && !automatic.
  const write = (id, patch, options) => { try { void Promise.resolve(live?.updateSessionMetadata?.(id, patch, options)).catch(() => {}); } catch {} };
  const now = new Set(state.unreadIds), explicit = new Set(state.explicitUnreadIds), before = new Set(previous.unreadIds), wasExplicit = new Set(previous.explicitUnreadIds);
  for (const id of before) if (!now.has(id)) write(id, { unread: false });
  for (const id of now) if (!before.has(id) || explicit.has(id) !== wasExplicit.has(id)) write(id, { unread: true }, { automatic: !explicit.has(id) });
});
// The bridge follows the official LocalSessionManager (asar/.vite/build/index.chunk-CqaSnEfn.js), whose renderer side is the
// sliced shared-8 ccdSessionsStore (ky boots once, from shared-22 bB: wy reads getSessionList, then ut.onOnEvent applies the
// manager's events):
//   getSessionList `async getSessionList(){await this.waitForInitialization();let e=this.getLoadGeneration(),
//     t=this.hasDeferredArchivedSessions(),n=Array.from(this.sessions.values())…;return{sessions:…formatSessionForEvent…,
//     loadGeneration:e,archivedPending:t}}` — it waits until the manager has loaded its sessions (here: main.jsx's
//     loadSessions, localSessionsState "loaded"; a settled init without a list is the IPC failure the store's catch takes:
//     "ipc_failed", loadFailed, the official Try again), and loadGeneration is the manager's, not one per call;
//   getAllSessions `return (await this.getSessionList()).sessions`;
//   the manager's events (`this.emit("event", {type: "initialized", sessionId: ""})` once a load phase settles; the per-
//     session session_updated / archived / unarchived with the formatted record) — the host emits them when main.jsx's
//     list changes after commit (syncLocalSessions): a new or changed record is session_updated, an isArchived flip
//     archived / unarchived, and a record gone from the list (a delete, or a core switch hiding the other core's
//     sessions: the host cannot tell them apart) is a reload — "initialized", on which the store re-reads the list (shared-8
//     Sy → wy(!0)) instead of tombstoning the id (shared-8 sy, "deleted").
let loadGeneration = 0;
let publishedSessions = null; // Map sessionId -> record of the last list the bridge answered from (null: not loaded yet)
const sessionListeners = new Set();
let initWaiters = [];
const sessionListError = () => Object.assign(Error("frame-sidebar-nav: the local session list did not load"), { name: "LocalSessionsLoadError" });
function waitForInitialization() {
  const state = live?.localSessionsState;
  if (state === "loaded" && publishedSessions !== null) return Promise.resolve();
  if (state === "failed") return Promise.reject(sessionListError());
  return new Promise((resolve, reject) => initWaiters.push({ resolve, reject }));
}
function emitSessionEvent(event) {
  for (const listener of [...sessionListeners]) {
    try { listener(event); } catch (error) { console.warn(`frame-sidebar-nav: LocalSessions '${event.type}' listener threw:`, error); }
  }
}
const sameSessionRecord = (a, b) => Object.keys({ ...a, ...b }).every((key) => Object.is(a[key], b[key]));
// FrameSidebarNavHost's effect, after each commit of main.jsx's value (exported for the node test of the bridge).
export function syncLocalSessions(value) {
  const state = value?.localSessionsState;
  if (state === "failed" && publishedSessions === null) { for (const waiter of initWaiters.splice(0)) waiter.reject(sessionListError()); return; }
  if (state !== "loaded") return;
  const next = new Map((value.localSessions ?? []).map((record) => [record.sessionId, record]));
  const previous = publishedSessions;
  publishedSessions = next;
  syncNavPins(previous, next);
  if (previous === null) {
    loadGeneration++;
    for (const waiter of initWaiters.splice(0)) waiter.resolve();
    emitSessionEvent({ type: "initialized", sessionId: "", loadGeneration });
    return;
  }
  if ([...previous.keys()].some((id) => !next.has(id))) {
    loadGeneration++;
    emitSessionEvent({ type: "initialized", sessionId: "", loadGeneration });
    return;
  }
  for (const [sessionId, record] of next) {
    const before = previous.get(sessionId);
    if (before && (before === record || sameSessionRecord(before, record))) continue;
    if (before && before.isArchived !== record.isArchived)
      emitSessionEvent(record.isArchived ? { type: "archived", sessionId } : { type: "unarchived", sessionId, session: record });
    else emitSessionEvent({ type: "session_updated", sessionId, session: record });
  }
}
const sessionList = async () => {
  await waitForInitialization();
  return { sessions: [...publishedSessions.values()], loadGeneration, archivedPending: false };
};
const localSessions = Object.freeze({
  getAll: async () => (await sessionList()).sessions,
  getSessionList: sessionList,
  getSession: async (sessionId) => publishedSessions?.get(sessionId) ?? null,
  onOnEvent: (callback) => (sessionListeners.add(callback), () => sessionListeners.delete(callback)),
  reportSessionListLoad: async () => undefined,
  forkSession: (...args) => live?.sessionAction?.("fork", ...args),
  detachFromParent: (...args) => live?.sessionAction?.("detach", ...args),
  // tear-off halos, SSH / WSL / remote git, CLI session import, share, loadArchivedSessions (archived rows are listed with
  // the rest: archivedPending false): no such host services (absent members read undefined).
});
// CCDScheduledTasks (shared-0 tk = globalThis["claude.web"].CCDScheduledTasks): the host's local scheduler, the one app-level
// bridge main.jsx's SidebarRoutinesHost connects around this nav body (source-sidebar-routines.jsx connectSidebarRoutines:
// code-routine-model.mjs createCodeRoutinesBridge over local-routines, kind "code"). A member is present only when that
// bridge has it, so the official `!!t?.getAllScheduledTasks` (cds-core shared-31 Qf canList) and `if (!bridge?.x)` checks read
// the host's facts; the dispatch handshake (ackEvent, releaseDispatchClaim) and getScheduledTask / getScheduledTaskFileContent
// have no host service (absent). (wave 8c sidebar lane; was: members over live.scheduler / live.onScheduledTaskEvent, which
// main.jsx never provided, and no getAllScheduledTasks: the nav never saw a task, so Scheduled was never pinned.)
const schedulerMethod = (name) => {
  const bridge = sidebarRoutinesStore.getState().bridge;
  return typeof bridge?.[name] === "function" ? (...args) => bridge[name](...args) : undefined;
};
const scheduledTasks = Object.freeze({
  get getAllScheduledTasks() { return schedulerMethod("getAllScheduledTasks"); },
  get createScheduledTask() { return schedulerMethod("createScheduledTask"); },
  get updateScheduledTask() { return schedulerMethod("updateScheduledTask"); },
  get updateScheduledTaskStatus() { return schedulerMethod("updateScheduledTaskStatus"); },
  get onOnScheduledTaskEvent() { return schedulerMethod("onOnScheduledTaskEvent"); },
});
const appPreferences = Object.freeze({
  getPreferences: async () => live?.preferences ?? {},
  onPreferencesChanged: (callback) => live?.onPreferencesChanged?.(callback) ?? noEffect,
  setPreference: async (key, value) => live?.setPreference?.(key, value),
});
// AppFeatures (shared-25 Vi = globalThis["claude.settings"].AppFeatures): main.jsx's 4.16336.0 supported-features answer
// (host-app-features.mjs hostSupportedFeaturesV4 for the connected core). The official app-root resolver (shared-92 Uv, mounted
// as the sliced root AppFeaturesBootstrap, shared-23 KA) reads it into the official app store and subscribes
// onSupportedFeaturesChanged (`Wr.onSupportedFeaturesChanged?.(Jv)`, re-read on change): the official main process emits it
// when its answer changes; here FrameSidebarNavHost emits it after a commit whose answer differs (the core connecting:
// btwChildSessions), see syncSupportedFeatures.
const featureListeners = new Set();
let publishedFeatures;
const appFeatures = Object.freeze({
  getSupportedFeatures: async () => live?.supportedFeatures ?? {},
  onSupportedFeaturesChanged: (callback) => (featureListeners.add(callback), () => featureListeners.delete(callback)),
});
export function syncSupportedFeatures(features) { // FrameSidebarNavHost's effect (exported for the node test)
  const next = JSON.stringify(features ?? {});
  if (publishedFeatures === undefined) { publishedFeatures = next; return; }
  if (next === publishedFeatures) return;
  publishedFeatures = next;
  for (const listener of [...featureListeners]) {
    try { listener(); } catch (error) { console.warn("frame-sidebar-nav: AppFeatures onSupportedFeaturesChanged listener threw:", error); }
  }
}
// A lazy handle (shared-92 Qy / shared-2 zd / shared-20 Fo) whose chunk is not shipped: warming settles, nothing renders.
const lazyHandle = (what) => Object.freeze({ warm: async () => undefined, preload: noEffect, moduleForRender: () => null, lastOutcome: `${what} not shipped` });

// ---- GrowthBook (host-growthbook.mjs: one answer table; no client) -----------------------------------------------------
const feature = (key) => {
  const flag = growthBookFlagKey(key);
  if (!Object.hasOwn(HOST_GROWTHBOOK, flag)) return { value: null, on: false, off: true, source: "unknownFeature" };
  const value = HOST_GROWTHBOOK[flag];
  return { value, on: value === true, off: value !== true, source: "force" };
};

// ---- app-root providers ------------------------------------------------------------------------------------------------
const CONFIGURATION = Object.freeze({ applicationType: "claude-dot", bootstrapApiPrefix: "/api" });
const NO_MANAGED_CONFIG = Object.freeze({});
const NO_NUX = Object.freeze({ shouldShow: false, dismiss: noEffect });
function useErrors() {
  const toasts = useSourceToasts();
  const intl = useStartIntl();
  return useMemo(() => {
    const text = (message) => (typeof message === "string" ? message : message && intl.formatMessage(message));
    const show = (variant) => (message, options) => { if (options?.messageForLogging) console.warn(options.messageForLogging); return toasts?.add?.(text(message), { variant }); };
    return { addError: show("danger"), addApiError: show("danger"), addDanger: show("danger"), addWarning: show("warning"), addSuccess: show("neutral"), addInfo: show("neutral"), clearToast: (id) => toasts?.close?.(id) };
  }, [toasts, intl]);
}
// shared-18 WH (the CDS useToast: add / close over Base UI's toast manager): the host toast store takes the same
// add({ title, description, action, variant }) and close(id); the nav reads only add and close.
function useToast() {
  const toasts = useSourceToasts();
  return useMemo(() => ({ add: (options) => toasts?.add?.(options), close: (id) => toasts?.close?.(id) }), [toasts]);
}
function useCommandPaletteToggle() {
  const host = useHost();
  return useMemo(() => ({ isOpen: !!host.searchOpen, open: () => host.setSearchOpen?.(true), close: () => host.setSearchOpen?.(false), toggle: () => host.setSearchOpen?.(!host.searchOpen) }), [host]);
}
// The official account record carries memberships (shared-25 wV: account.memberships.find); the local account has none.
const NO_MEMBERSHIPS = Object.freeze([]);
const hostAccount = () => {
  const { account } = useHost();
  return useMemo(() => ({ account: account ? { memberships: NO_MEMBERSHIPS, ...account } : undefined, activeOrganization: undefined }), [account]);
};
function HostDialog(key) { return function NavHostDialog(props) { const render = useHost()[key]; return render ? render(props) : null; }; }

// The capability table. Keys are the boundary names of scripts/extract-frame-sidebar-nav.mjs (non-reuse kinds).
export const HOST_ANSWERS = {
  useManagedConfig: ["gate", () => NO_MANAGED_CONFIG],
  useConfiguration: ["host", () => CONFIGURATION],
  useServedDeploymentConfig: ["gate", useServedDeploymentConfig], // shared-62 Qk: the official no-organization branch (wave 8)
  useOptionalCurrentAccount: ["host", hostAccount],
  useErrors: ["host", useErrors],
  useToast: ["host", useToast],
  // (usePerformanceMetrics, shared-4 tA, is sliced since round-4 addendum C: it reads the official PerformanceMetricsProvider
  //  value, mounted by frame-sidebar-nav-body.jsx. The answer that stood here was shared-25 hf.performanceMetrics, another
  //  official object without markCodeSessionOpenStart.)
  useCommandPaletteToggleContext: ["host", useCommandPaletteToggle],
  useNux: ["gate", () => NO_NUX],
  useShortcut: ["host", useNavShortcut], // shared-1 C6 over the host binding table (above)
  useIncognitoMode: ["host", () => { const host = useHost(); return { incognitoModeEnabled: !!host.incognito, setIncognitoModeEnabled: (value) => host.setIncognito?.(!!value) }; }],
  // wave 8d sidebar lane: was ["gap", () => null], unreachable until the presets latch opened (the official session-list rows,
  // shared-20 _N `{effectiveCategory: u} = Np(n ?? void 0)`, destructure it). Official zg returns
  // `{effectiveCategory: i, billingNotSelfManageable: r}` (i = e unless auth_error with a past-due subscription; r = Rg());
  // the host has no subscription / billing service, so the answer is the shared home adapter's: category as given, false.
  useHomeEffectiveErrorCategory: ["host", useHomeEffectiveErrorCategory],
  markHomeSessionUnread: ["host", (sessionId) => live?.markUnread?.(sessionId)],
  // defineLazyEntry (shared-123 W$) is sliced now (the official lazy-entry runtime: {Component, handle, annotateOpen} over
  // shared-92 cg); the lazy entries' load (below, LAZY.load / the generator's lazyEntry kinds) rejects with ChunkLoadError,
  // so W$ takes each entry's official failure branch (loading "no-ui" + onChunkError "fail-open": nothing drawn).
  useDialogPreloadProps: ["gap", () => Object.freeze({})],
  EmojiShortcodeField: ["host", HostDialog("textField")],
  dynamicImport: ["gap", (spec) => notShipped(String(spec))],
  ExperiencePlacement: ["gate", renderNothing],
  NewProjectDialog: ["host", HostDialog("newProjectDialog")],
  DeleteConversationsDialog: ["host", HostDialog("deleteDialog")],
  // shared-25 io(e, t) is called as io(client, id) by ho (`K2($,3,e,t,io(e,t))`), with t the payload key shared-0 yu made
  // (is / as / fs: `ho(r, H(e))`); wave 8d sidebar lane: answer by that id (table key `__gb__<id>`), not by the client argument.
  growthBookEval: ["gate", (client, id) => feature(String(id ?? "").startsWith("__gb__") ? id : `__gb__${id}`)],
  useGrowthBookClient: ["gate", () => null],
  useFeatureIsOn: ["gate", (key) => feature(key).on],
  useGrowthBookFeatureOn: ["gate", (key) => feature(key).on],
  useGrowthBookFeatureValue: ["gate", (key, fallback) => { const flag = growthBookFlagKey(key); return Object.hasOwn(HOST_GROWTHBOOK, flag) ? HOST_GROWTHBOOK[flag] : fallback; }],
  useGrowthBook: ["gate", () => undefined],
  useApiFetcher: ["gap", () => apiFetcher],
  fetchAsDocumentAccount: ["gap", apiFetcher],
  readEventStream: ["gap", async function* () {}],
  recordApiEndpointSeen: ["gap", noEffect],
  LocalSessions: ["host", localSessions],
  CCDScheduledTasks: ["host", scheduledTasks],
  AppPreferences: ["host", appPreferences],
  AppFeatures: ["host", appFeatures],
  useRouterState: ["host", useRouterState],
  useTanStackRouter: ["host", () => tanStackRouter],
  useRoutePathnameSelector: ["host", (selector) => usePathnameSelect((state) => selector(state.pathname))],
  postConversationMessage: ["gap", apiFetcher],
  apiRequest: ["gap", apiFetcher],
  signedTriggerEdit: ["gap", notShipped("cc6b8c296 (trigger signing)")],
  listServedRoutineRuns: ["gap", async () => ({ unavailable: "unreachable" })], // the official chunk-missing answer of lm
};
// Lazily loaded official chunks (scripts/extract-frame-sidebar-nav.mjs "lazily loaded official chunks"): components draw
// nothing, entries' load and loader functions reject, handles never load. (round-4 navfix: the lazy overlays — W$ results
// read as .Component / .handle — and the code_sidebar_actions entry are sliced now, with their chunks shipped or emitted
// as not-shipped modules by the generator (lazyChunks / absentChunks); they have no host answer here.)
const LAZY = {
  component: ["LazyEpitaxyProjectConfigDialog", "LazyEpitaxyProjectMembersDialog", "LazySessionSummaryTooltipBody", "LazyConnectorOnboardingTryRow",
    "LazySidebarRow", "LazyProjectLimitUpsellModal", "LazyCustomizeMergedPageCoachmark", "LazyProjectsNavNuxCoachmark", "LazySidebarBulkSelectTip",
    "LazySidebarPopover", "LazyEpitaxyCreateProjectDialog"],
  load: ["LazyArtifactMenuEntry", "LazyCodeSidebarLiveEntry", "LazyEpitaxyApprovalFileChangeEntry", "LazyCodeSessionViewEntry", "LazySidebarEditEntry",
    "LazySidebarNewMenuRowsEntry", "LazyMajesticStarlightBody", "LazyRememberedDesktopLists", "LazyChunkC8ac3d4f", "loadCommandPaletteChunk",
    "LazyCodeSidebarEnvironmentDialog", "LazyCodeSidebarFolderPreset", "loadTriggerSigningChunk", "loadEnvironmentDialogChunk", "LazyProjectTags"],
  handle: ["LazyCoworkSessionMachinery", "LazyServedCoworkRecents", "LazyProjectRcSessionJoin"],
};
for (const name of LAZY.component) HOST_ANSWERS[name] = ["gap", renderNothing];
for (const name of LAZY.load) HOST_ANSWERS[name] = ["gap", notShipped(name)];
for (const name of LAZY.handle) HOST_ANSWERS[name] = ["gap", lazyHandle(name)];
installFrameSidebarNavHost(Object.fromEntries(Object.entries(HOST_ANSWERS).map(([name, [, answer]]) => [name, answer])));

// One 4.16336.0 QueryClient for the nav (TanStack Query of generated/files-changes-v4, the one instance the slice links).
export const navQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

// FrameSidebarNavHost: main.jsx's value for this region (localSessions in the official record shape, the route, actions).
export function FrameSidebarNavHost({ value, children }) {
  live = value;
  publishPath(officialPathname(value));
  // The LocalSessions bridge's load / events follow main.jsx's list after commit (syncLocalSessions above).
  useEffect(() => { syncLocalSessions(value); }, [value.localSessionsState, value.localSessions]);
  useEffect(() => { syncSupportedFeatures(value.supportedFeatures); }, [value.supportedFeatures]);
  useEffect(() => { syncUnread(value.sessionMetadata); }, [value.sessionMetadata]);
  return (
    <FrameSidebarNavHostContext.Provider value={value}>
      <QueryClientProvider client={navQueryClient}>{children}</QueryClientProvider>
    </FrameSidebarNavHostContext.Provider>
  );
}
// The frame-sidebar SidebarNavBody slot (the official nav body under this host) is src/frame-sidebar-nav-body.jsx: it imports
// this module first, so HOST_ANSWERS is installed before generated nav-body.mjs evaluates (shared-140 calls defineLazyEntry
// at module load; task SB-1 host order). This module does not import the nav body.
