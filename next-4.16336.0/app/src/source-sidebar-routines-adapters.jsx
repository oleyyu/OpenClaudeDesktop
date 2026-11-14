// Local services for the original 3.6556.2 Code sidebar Routines section that scripts/extract-sidebar-routines.mjs emits
// (generated/sidebar-routines: shared-21 m4 / g4 / Q4 / s3 / y3 / JK / hJ). Each export replaces one original binding,
// feature-checked by the extractor; the manifest's `imports` lists every boundary.
//
//   useIntl / FormattedMessage   react-intl over the host catalog (t(), keyed by the English message).
//   useGrowthBookFlag            shared-25 fs: the host's GrowthBook answers (host-growthbook.mjs; Uon defaults, E81).
//   useCcdScheduledTasksGate     shared-78 WK: the CCD scheduled tasks gate — on (D32: the host scheduler).
//   useCodeScheduledTasks        shared-4 z_: the CCD task list — the host scheduler's Code tasks, kept current at app
//                                level (source-sidebar-routines.jsx sidebarRoutinesStore).
//   CCDScheduledTasks            shared-0 xC (window["claude.web"].CCDScheduledTasks): code-routine-model's bridge over
//                                local-routines, the app-level one.
//   RoutineSessionsContext       shared-21 NG (the session list's CCD sessions): the host's routine runs, each
//                                { scheduledTaskId, isArchived, item } (sidebar-routines-model.mjs).
//   routineSessionListItem       shared-11 xC (a CCD session as a list item): the run's item, built by the host model; its
//                                live facts (Db / V_ / qy / zb / $b) are in the item already.
//   useRoutineUnreadStore        shared-11 Xb (the renderer's unread store): the host's session metadata unread flag (an
//                                explicit mark is one main did not set automatically); marks write sessionMetadata.
//   useSessionEngineError / useSessionAwaitingVerdict
//                                shared-11 Fb / shared-3 w6: the run's error / pending approval from the host's facts.
//   useRouteSelect / useRouteLocationSelect / useCoworkTriggerRoute / useRouteLinkProps
//                                shared-25 hd / fd / md / _d / up: no router — the host's current route as a path
//                                (SidebarRoutinesHost pathname), no link props (the row's click opens it).
//   useLeaveDeletedRoutine       shared-21 X4: after a delete, the host leaves the deleted task's routines page.
//   confirmRoutineDelete         shared-46 dO: the confirmation (fO's routine / task copy) — the host's dialog.
//   useRoutineRunDisplayState / SidebarCodeErrorGlyph / useKindGlyphStatus
//                                shared-18 oj / WA, shared-78 zy: the group row icon's (shared-20 YT → shared-18 sj)
//                                display state over the run's facts, the host code error glyph, the kind glyph off.
//   useSidebarSectionsStore      shared-52 q: the sections store sidebar-sections already maps it to.
//   the rest                     services the host does not have (E59: no claude.ai account / cloud routines; no
//                                router; D17: no telemetry) or presentations the Code session list never mounts
//                                (recents-row, inline, pinned): the original's "nothing" branch.
// This module must not import src/generated/sidebar-routines (the generated modules import it).
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
import { useSourceToasts } from './source-toast.jsx';
import { useSidebarSelectionStore } from './source-sidebar-sections-adapters.jsx';
import { routineUnreadState } from './sidebar-routines-model.mjs';
import { resolveSessionDisplayState } from './generated/code-current/sidebar-session-state.mjs';
import { Rh as REMOTE_DELETE_MESSAGES } from './generated/routines-shared/shared-4-DUB1Oi0O.mjs';
export { useSidebarSectionsStore } from './source-sidebar-sections-adapters.jsx';

export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;
export function useGrowthBookFlag(flag) { return hostGrowthBookFlag(flag); }

// ---------------------------------------------------------------- the host (SidebarRoutinesHost provides it)
/**
 * SidebarRoutinesHostContext value:
 *   pathname            the host's current route as a desktop path (/code/routines/<id>, /code/<sessionId>, /code);
 *   facts               Map<sessionId, item> of the routine runs (the list items RoutineSessionsContext carries);
 *   onTaskDeleted(id)   the routines page leaves a deleted task;
 *   requestConfirm(req) → Promise<boolean>: the delete confirmation;
 *   addError(message)   a danger toast.
 */
export const SidebarRoutinesHostContext = createContext(null);
export const RoutineSessionsContext = createContext(Object.freeze([]));

// ---------------------------------------------------------------- the app-level task store
// source-sidebar-routines.jsx connects it (connectSidebarRoutines); the adapters read it.
const EMPTY_TASKS = Object.freeze({ rows: Object.freeze([]), scheduledTasks: Object.freeze([]), hasLastKnownList: false,
  didResolveCompletely: false, isLoading: true, bridge: null });
let taskState = EMPTY_TASKS;
const taskListeners = new Set();
export const sidebarRoutinesStore = Object.freeze({
  getState: () => taskState,
  setState(next) {
    const value = { ...taskState, ...(typeof next === 'function' ? next(taskState) : next) };
    taskState = value;
    for (const listener of [...taskListeners]) listener();
  },
  reset() { taskState = EMPTY_TASKS; for (const listener of [...taskListeners]) listener(); },
  subscribe(listener) { taskListeners.add(listener); return () => taskListeners.delete(listener); },
});
const tasksSnapshot = () => taskState;
/** shared-4 z_ (la): `{ scheduledTasks, hasLastKnownList, didResolveCompletely, isLoading }` for the gate `enabled`. */
export function useCodeScheduledTasks(enabled) {
  const state = useSyncExternalStore(sidebarRoutinesStore.subscribe, tasksSnapshot, tasksSnapshot);
  return enabled ? state : EMPTY_TASKS;
}
const GATE_ON = Object.freeze({ loading: false, enabled: true });
/** shared-78 WK (Yo): the CCD scheduled tasks gate. D32: the host scheduler runs Code routines. */
export function useCcdScheduledTasksGate() { return GATE_ON; }
/** shared-21 L2: the scheduler's event subscription — the app-level store holds it (connectSidebarRoutines). */
export function subscribeScheduledTaskEvents() {}
const bridgeMethod = (name) => {
  const bridge = taskState.bridge;
  return typeof bridge?.[name] === 'function' ? (...args) => bridge[name](...args) : undefined;
};
/** shared-0 xC: the app-level scheduler bridge (code-routine-model createCodeRoutinesBridge). */
export const CCDScheduledTasks = Object.freeze({
  get getAllScheduledTasks() { return bridgeMethod('getAllScheduledTasks'); },
  get updateScheduledTaskStatus() { return bridgeMethod('updateScheduledTaskStatus'); },
  get onOnScheduledTaskEvent() { return bridgeMethod('onOnScheduledTaskEvent'); },
});
/** shared-2 UM: `if (e === !1) throw new HM()` — the scheduler refused the change. */
export function assertScheduledTaskChanged(result) {
  if (result === false) throw new Error('The scheduled task was not changed.');
}

// ---------------------------------------------------------------- the routine runs (JK's inputs)
export function routineSessionListItem(entry) { return entry.item; }
// Db / V_ / qy / zb / $b: the item carries isResponding / hasPendingApproval / hasError / isUnread already.
export function useRespondingSessions() { return undefined; }
export function useLiveApprovalSessions() { return undefined; }
export function useAckedSessions() { return undefined; }
export function useLiveErrorSessions() { return undefined; }
export function useExplicitUnreadSessions() { return undefined; }
const NO_ERROR = Object.freeze({ responding: false, hasError: false, errorCategory: null });
/** shared-11 Fb (Mn): `{ responding, hasError, errorCategory }` of a session's engine (the original's keys; shared-18 sj
 * reads `responding`, y3 hasError / errorCategory). */
export function useSessionEngineError(sessionId) {
  const item = useContext(SidebarRoutinesHostContext)?.facts?.get(sessionId);
  return useMemo(() => (item ? { responding: item.isResponding === true, hasError: item.hasError === true, errorCategory: item.source?.data?.errorCategory ?? null } : NO_ERROR),
    [item]);
}

// ---------------------------------------------------------------- the group row's icon (shared-20 YT → shared-18 sj)
// W14-code r4 gen-final-4: renderGroup (shared-22 Oi) draws a disabled task with a live run; its icon is the newest
// run's code session status (sj). sj's error mark (WA) is the host's code error glyph, as code-current maps it.
export { SidebarCodeErrorGlyph } from './source-sidebar-error-adapters.jsx';
const NO_PRS = Object.freeze([]);
/**
 * shared-18 oj: a code session's `{ state, prState, prNumbers, allBranches, aggregated, isUnread }`. The original reads the
 * forge (PR) state and the unread store; routine runs carry no PRs (prState "none"), unread is the unread store's (Xb)
 * or the list's serverUnread, explicit unread the store's explicit marks. The state is the original priority shared-8 pb
 * over oj's own inputs: `D = respondingNow && liveStatus === "idle" && !isArchived ? "running" : liveStatus`,
 * `hasError: hasError && !respondingNow`, `hasCompleted = isUnread = unread`.
 */
export function useRoutineRunDisplayState({ sessionId, liveStatus = 'idle', hasError = false, isArchived = false, serverUnread = false,
  readyAfterPr = false, respondingNow = false } = {}) {
  const { unreadIds, explicitUnreadIds } = useRoutineUnreadStore();
  const unread = unreadIds.includes(sessionId) || !!serverUnread;
  const explicitUnread = explicitUnreadIds.includes(sessionId);
  const live = respondingNow && liveStatus === 'idle' && !isArchived ? 'running' : liveStatus;
  const state = resolveSessionDisplayState({ kind: 'code', hasError: !!hasError && !respondingNow, liveStatus: live, hasCompleted: unread,
    isUnread: unread, prState: 'none', explicitUnread }, { readyAfterPr: !!readyAfterPr });
  return { state, prState: 'none', prNumbers: NO_PRS, allBranches: NO_PRS, aggregated: false, isUnread: unread };
}
/** shared-78 zy (lS): the kind-glyph switch, `(Ty(), !1)` — always false. */
export function useKindGlyphStatus() { return false; }
/** shared-3 w6 (Ct): the session waits on a verdict (a pending approval). */
export function useSessionAwaitingVerdict(sessionId) {
  return useContext(SidebarRoutinesHostContext)?.facts?.get(sessionId)?.hasPendingApproval === true;
}

// ---------------------------------------------------------------- the unread store (shared-11 Xb)
let unreadHost = { metadata: {}, update: null };
let unreadState = makeUnreadState();
const unreadListeners = new Set();
function makeUnreadState() {
  const { unreadIds, explicitUnreadIds } = routineUnreadState(unreadHost.metadata);
  const write = (id, patch, options) => { try { void Promise.resolve(unreadHost.update?.(id, patch, options)).catch(() => {}); } catch {} };
  return {
    unreadIds, explicitUnreadIds,
    markRead: (id) => write(id, { unread: false }),
    markManyRead: (ids) => { for (const id of ids ?? []) if (unreadIds.includes(id)) write(id, { unread: false }); },
    markUnread: (id) => write(id, { unread: true }, { automatic: true }),
    markUnreadExplicit: (id) => write(id, { unread: true }),
  };
}
/** SidebarRoutinesHost: the window's session metadata and its writer (main.jsx updateSessionMetadata). */
export function setRoutineUnreadHost(metadata, update) {
  // A new writer alone (main.jsx's updateSessionMetadata is a new function each render) changes no state: kept quietly.
  if (unreadHost.metadata === (metadata ?? unreadHost.metadata)) { unreadHost.update = update; return; }
  unreadHost = { metadata: metadata ?? {}, update };
  unreadState = makeUnreadState();
  for (const listener of [...unreadListeners]) listener();
}
const unreadSnapshot = () => unreadState;
const subscribeUnread = (listener) => { unreadListeners.add(listener); return () => unreadListeners.delete(listener); };
export function useRoutineUnreadStore(selector = (state) => state) {
  return selector(useSyncExternalStore(subscribeUnread, unreadSnapshot, unreadSnapshot));
}
useRoutineUnreadStore.getState = () => unreadState;
useRoutineUnreadStore.subscribe = subscribeUnread;
/** shared-21 y2: mark runs read (the remote read state too, with an organization): the local store only (E59). */
export function useMarkRunsRead() {
  return markRunsRead;
}
function markRunsRead(ids) { unreadState.markManyRead(new Set(ids)); }
/** shared-2 iK (eo): the remote read state's explicit unread — no remote sessions. */
export function useRemoteExplicitUnread() { return false; }
/** shared-2 UG / JG: the cowork read state — the Code rows mark through the unread store. */
export function markCoworkRunsRead() {}
export function markCoworkRunUnread() {}

// ---------------------------------------------------------------- the route (no router)
const routePath = (host) => (typeof host?.pathname === 'string' ? host.pathname : '/code');
/** shared-25 hd / fd: a selector over the current pathname. */
export function useRouteSelect(select) { return select(routePath(useContext(SidebarRoutinesHostContext))); }
/** shared-25 md: a selector over (href, pathname). */
export function useRouteLocationSelect(select) { const path = routePath(useContext(SidebarRoutinesHostContext)); return select(path, path); }
/** shared-25 _d: the cowork trigger route — Code rows only. */
export function useCoworkTriggerRoute() { return false; }
const NO_LINK = Object.freeze({});
/** shared-25 up: a link's prefetch / navigation props — no router; the row's onClick opens it. */
export function useRouteLinkProps() { return NO_LINK; }
/** shared-21 X4: after a delete, leave the deleted task's page (the routines page's selection). */
export function useLeaveDeletedRoutine() {
  const host = useContext(SidebarRoutinesHostContext);
  return useMemo(() => (taskId) => { host?.onTaskDeleted?.(taskId); }, [host]);
}

// ---------------------------------------------------------------- dialogs, errors, analytics
/** shared-46 dO (vo): `(sessionTitle, kind, { title, description }) → Promise<boolean>`. */
let confirmHost = null;
export function setRoutineConfirmHost(request) { confirmHost = request; }
export function confirmRoutineDelete(sessionTitle, kind = 'routine', options) {
  if (typeof confirmHost !== 'function') return Promise.resolve(false);
  return Promise.resolve(confirmHost({ sessionTitle, kind, title: options?.title, description: options?.description }));
}
export function useErrors() {
  const toasts = useSourceToasts();
  return useMemo(() => ({ addError: (message) => toasts?.add?.(String(message ?? ''), { variant: 'danger' }) }), [toasts]);
}
const ANALYTICS = Object.freeze({ track() {} });
export function useAnalytics() { return ANALYTICS; }
export function trackGroupToggled() {}
export function trackScheduledRowClicked() {}
export function trackRunOutputOpened() {}
/** shared-17 va: the task's seen state (New / Updated badges) — Code rows never pass isNew / isEdited. */
export function markRoutineSeen() {}
/** shared-11 Nw: pin a row — the section placement offers no Pin. */
export function toggleSidebarPin() {}
/** shared-6 rA: a plain click clears the multi-selection (a modifier keeps it). */
export function clearSidebarSelection(event) {
  if (event && (event.metaKey || event.ctrlKey || event.shiftKey)) return;
  useSidebarSelectionStore.getState().clear();
}
/** shared-18 gk: the sidebar column (telemetry only). */
export function useSidebarColumn() { return undefined; }

// ---------------------------------------------------------------- the list's stores
// shared-4 db: the persisted expanded / starred ids of the list. The section's collapse is the sections store's (g4);
// nothing is starred here.
const LIST_STATE = Object.freeze({ expandedIds: Object.freeze([]), starredIds: Object.freeze([]), toggleExpanded() {}, expand() {}, toggleStarred() {} });
export function useSidebarListStore(selector = (state) => state) { return selector(LIST_STATE); }
useSidebarListStore.getState = () => LIST_STATE;
// shared-20 BS / ZS, shared-21 MG, shared-78 yQ: the environment filter. The host lists the local environment only and
// has no environment filter, so `local` is shown.
const NO_FILTER = Object.freeze({ selectedEnvironments: Object.freeze([]), defaultEnvironmentSelection: Object.freeze([]) });
export function useEnvironmentFilter() { return NO_FILTER; }
export function useEnvironmentFilterOverride() { return false; }
export function environmentSelection(filter) { return filter; }
export function environmentShown(selected, environment) {
  return environment === 'local' && (selected.length === 0 || selected.includes(environment));
}

// ---------------------------------------------------------------- cloud routines (E59) and unmounted presentations
const NO_TRIGGERS = Object.freeze({ data: undefined, isLoading: false });
export function useRemoteTriggers() { return NO_TRIGGERS; }
const NO_DELETE = Object.freeze({ mutateAsync: () => Promise.reject(new Error('No cloud routines here.')) });
export function useDeleteRemoteTrigger() { return NO_DELETE; }
export function useRemoteRoutinesAvailable() { return false; }
// shared-4 Bh's answer without a remote config (`ti.routineDeleteBody`'s sibling, the shared-4 Rh table routines-shared
// slices): the remote delete is never reached here (no remote rows).
export function remoteRoutineDeleteBody() { return REMOTE_DELETE_MESSAGES.deleteBody; }
export function remoteRoutinePersists() { return false; }
const NO_REMOTE_ROWS = Object.freeze({ listed: Object.freeze([]), claudeMinted: Object.freeze([]) });
export function remoteRoutineRows() { return NO_REMOTE_ROWS; }
export function listedRemoteRoutines() { return []; }
export function RemoteRoutineRow() { return null; }
export function RemoteRoutineRunsProbe() { return null; }
export function RemoteRoutineStatusProbe() { return null; }
export function RoutinesRecentsRow() { return null; }
export function routinesRollup() { return 'idle'; }
export function RoutineInlineRowCard({ children }) { return children ?? null; }
export function RoutineInlineRow() { return null; }
/** shared-18 tj: the status icon of a row outside the session list — the Code section is mounted inside it. */
export function ScheduledTaskStatusIcon() { return null; }

// ---------------------------------------------------------------- Show › Routines (mJ's inputs)
const CODE_NAV = Object.freeze({ codeEnabled: true, ccdGateSettled: true });
/** shared-4 cS (Gl): Code is on and its gate settled — this host is the Code app. */
export function useCodeNavState() { return CODE_NAV; }
const NO_ACCOUNT = Object.freeze({ account: null, activeOrganization: undefined });
/** shared-25 Z (Ut): the current account — none (E59). */
export function useCurrentAccount() { return NO_ACCOUNT; }
/** shared-52 yv (Ma): the organization's Code routines latch — no organization. */
export function useOrgHasCodeRoutines() { return false; }
