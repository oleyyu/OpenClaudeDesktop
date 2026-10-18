// Local services for the original 2.42304.0 session rail sections that scripts/extract-session-rail-sections.mjs emits
// (src/generated/session-rail-sections, R4f-rail SR-3): the Servers section (cf74bc599 QD) and the Background tasks
// section (cf74bc599 BD). Each export replaces one import of the original, and the extractor checks the declaration it
// stands for (file:local, with feature strings) before it accepts the import. react-intl comes from the kit's adapters.
//
// The data plane of those sections is the official app's own — the session meta query, claude.web Launch's active
// servers store, the session tasks context, the session scope store (side panes, stopping ids) and the stop mutations.
// Here the rail's mount (SR-7, the host stand-in for cf74bc599 fO) provides it through SessionRailSectionsHostContext:
//
//   meta          { workingDir, originCwd, loops, tags, isArchived, createdAt } of the session (railLoopRows for loops)
//   servers       the session's active dev servers in the official row shape (railServerRows); absent: "missing"
//   tasks         the session's background tasks in the official row shape (railTaskRows)
//   sidePanes     { hasSidePanes, previewViews, previewServerId, openSidePanes, requestServerLogs(previewId, serverId),
//                   setSidePane(pane), setPendingRemotePreviewOpen(request) } — the chat tile's side panes
//   stopServer(server) / stopLoop(loop) / stopTask(taskId)   promises of the host's real stop calls
//   openTasksPane({ taskId, finished })                      the Tasks pane, at a task or with Finished expanded
//   rememberPreviewServer(folder, name)                      optional: the folder's preferred preview server
//   rowsStore / dismissedStore                               the host's taskRowsStore / dismissedTasksStore
//                                                            (source-background-tasks.jsx), the Background tasks
//                                                            pane's own per-session stops and dismissed tasks; without
//                                                            them nothing is stopping and nothing is dismissed
//
// Without a provider the sections render nothing: QD needs side panes, BD needs the Tasks pane opener (as the originals
// do without their scope store). Nothing is invented: no remote servers, no GrowthBook, no claude.web Launch.
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useErrors, useIntl } from "./source-session-rail-kit-adapters.jsx";
import { localizeBridgeText } from "./bridge-text-model.mjs";

export const SessionRailSectionsHostContext = createContext(null);
const useHost = () => useContext(SessionRailSectionsHostContext);
const NONE = Object.freeze([]);
const NO_FOLDERS = Object.freeze({});
const NO_SIDE_PANES = Object.freeze({ hasSidePanes: false, previewViews: false, previewServerId: undefined, openSidePanes: NONE });
const NO_IDS = Object.freeze(new Set());
const unsubscribed = () => () => {};
// The Background tasks pane's stores are the mount's to pass (importing that pane here would load its whole renderer);
// without them, no id is ever stopping or dismissed.
const NO_ROWS_STORE = Object.freeze({ subscribe: unsubscribed, stopping: () => NO_IDS, markStopping: () => false, releaseStopping() {} });
const NO_DISMISSED_STORE = Object.freeze({ subscribe: unsubscribed, dismissed: () => NONE });
const rowsStoreOf = host => host?.rowsStore ?? NO_ROWS_STORE;
const dismissedStoreOf = host => host?.dismissedStore ?? NO_DISMISSED_STORE;

// c5da7eb42 Q (local iM): `Q(e, { select: t, passive, enabled })`, the session meta query. QD selects workingDir /
// originCwd (WD), BD loops / tags / isArchived / createdAt (AD), both with shared-104 pz (the kit's pickFields).
export function useSessionRailMeta(sessionRef, select) {
  const meta = useHost()?.meta;
  return useMemo(() => ({ data: meta ? select(meta) : undefined }), [meta, select]);
}

// c5da7eb42 B (local LM): a remote session's bridge state. QD asks only for a remote session under GrowthBook
// sink_planter_vase, which is off here; no remote sessions either.
export function useRemoteSessionBridgeUp() {
  return false;
}

// c227f4d5e Ki (local Mz): a remote session's servers; `null` (always the case here) gives the shared empty list.
export function useRemoteSessionServers() {
  return NONE;
}

// c227f4d5e oa (local WR): `[preferred, remember]` over localStorage "preferredPreviewServers" (folder -> server name),
// written when a Servers row opens its server. This host's Preview pane does not read that key; the mount may pass
// rememberPreviewServer to keep its own preference, otherwise nothing is written.
export function usePreferredPreviewServers() {
  const remember = useHost()?.rememberPreviewServer;
  const write = useCallback((folder, name) => { remember?.(folder, name); }, [remember]);
  return [NO_FOLDERS, write];
}

// c227f4d5e nr (local HW): `({ taskId, finished }) => …` (finished: expand the Finished section; a taskId: open the
// Tasks pane at it; else open the pane), or null while the session has no side panes. BD renders nothing without it.
export function useOpenTasksPane() {
  return useHost()?.openTasksPane ?? null;
}

// cccc2cf0a p (local nE): `{ ids, has, mark, release }` of the session's stopping ids of one kind ("server", "loop",
// "task"), the scope store's stoppingIdsBySession keyed by c03935b01 _o (`e?.id ?? "__no-session__"`). Here the host's
// taskRowsStore (which keys a missing session the same way), the store the Background tasks pane keeps the same
// per-session stops in, so a stop pressed in either place is busy in both.
export function useRailStoppingIds(sessionRef, kind) {
  const store = rowsStoreOf(useHost());
  const key = sessionRef?.id;
  const read = () => store.stopping(key, kind);
  const ids = useSyncExternalStore(store.subscribe, read, read);
  const has = useCallback(id => store.stopping(key, kind).has(id), [store, key, kind]);
  const mark = useCallback(id => { store.markStopping(key, kind, id); }, [store, key, kind]);
  const release = useCallback(id => { store.releaseStopping(key, kind, id); }, [store, key, kind]);
  return useMemo(() => ({ ids, has, mark, release }), [ids, has, mark, release]);
}

// cccc2cf0a h (local tE): the session's dismissed task ids (localStorage "epitaxy.dismissedTasksMap"), which BD leaves
// out of "{count} finished". Here dismissedTasksStore (localStorage "codeDesktop.dismissedTasks"): the ids the Tasks
// pane's Clear finished tasks dismissed, the same ES / wS / TS store.
export function useDismissedTaskIds(sessionId) {
  const store = dismissedStoreOf(useHost());
  const read = () => store.dismissed(sessionId);
  const list = useSyncExternalStore(store.subscribe, read, read);
  return useMemo(() => new Set(list), [list]);
}

// cccc2cf0a d (local iE): `{ stoppingServerIds, handleStopServer }`. The original stops through claude.web
// `Launch.stopServer(serverId)` (false when it is already stopping or Launch has no stopServer), marks the id, and on a
// failure releases it with "Couldn’t stop the preview server."; on success it also destroys the server's preview, closes
// its tab and forgets it as the folder's preferred server (none of which exists here). Here the mount's stopServer; a
// stop settles when the server leaves the active list or fails, as the Background tasks pane settles it.
export function useServerStop(sessionRef) {
  const host = useHost();
  const intl = useIntl();
  const { addError } = useErrors();
  const { ids, has, mark, release } = useRailStoppingIds(sessionRef, "server");
  const servers = host?.servers, stop = host?.stopServer;
  useEffect(() => {
    if (!servers) return;
    for (const id of ids) if (!servers.some(server => server.serverId === id && server.status !== "error" && server.status !== "stopped")) release(id);
  }, [servers, ids, release]);
  const handleStopServer = useCallback(server => {
    const { serverId } = server;
    if (has(serverId) || typeof stop !== "function") return false;
    mark(serverId);
    Promise.resolve().then(() => stop(server)).catch(() => {
      release(serverId);
      addError(intl.formatMessage({ defaultMessage: "Couldn’t stop the preview server.", id: "O/PquiXXR2" }));
    });
    return true;
  }, [has, stop, mark, release, addError, intl]);
  return { stoppingServerIds: ids, handleStopServer };
}

// cccc2cf0a f (local rE): `{ stoppingLoopIds, handleStopLoop }`. The original sends Claude "Cancel the recurring loop
// with job ID `…` by calling CronDelete, then confirm." ("Message couldn’t be sent. Try again." when that fails). This
// host's scheduler runs the loops itself, so the mount's stopLoop stops the job directly; the id stays stopping until
// the loop leaves the session's loops (BD releases it there and announces "Loop stopped"). A failure releases it and
// shows the host's own error text.
export function useLoopStop(sessionRef) {
  const host = useHost();
  const intl = useIntl();
  const { addError } = useErrors();
  const { ids, has, mark, release } = useRailStoppingIds(sessionRef, "loop");
  const stop = host?.stopLoop;
  const handleStopLoop = useCallback(loop => {
    if (has(loop.id) || typeof stop !== "function") return false;
    mark(loop.id);
    Promise.resolve().then(() => stop(loop)).catch(error => {
      release(loop.id);
      addError(localizeBridgeText(error?.message || "") || intl.formatMessage({ defaultMessage: "Message couldn’t be sent. Try again.", id: "Z/j4hcuCOj" }));
    });
    return true;
  }, [has, stop, mark, release, addError, intl]);
  return { stoppingLoopIds: ids, handleStopLoop };
}

// cccc2cf0a l (local oE): `{ handleStop, stoppingTaskIds, confirmDialog }`. The original runs c6b8adeaf's
// stopBackgroundTask mutation ("Couldn’t stop the task — check your connection and try again." on failure) and asks
// "Stop review?" first for an ultrareview run. This host has no review runs: no dialog. The mount's stopTask stops the
// task the host's way; the id stays stopping until its task is no longer running (as in the Background tasks pane).
export function useTaskStop({ sessionRef, tasks }) {
  const host = useHost();
  const intl = useIntl();
  const { addError } = useErrors();
  const { ids, has, mark, release } = useRailStoppingIds(sessionRef, "task");
  const stop = host?.stopTask;
  useEffect(() => {
    for (const id of ids) if (tasks.find(task => task.taskId === id)?.status !== "running") release(id);
  }, [tasks, ids, release]);
  const handleStop = useCallback(taskId => {
    if (has(taskId) || typeof stop !== "function") return;
    mark(taskId);
    Promise.resolve().then(() => stop(taskId)).catch(() => {
      release(taskId);
      addError(intl.formatMessage({ defaultMessage: "Couldn’t stop the task — check your connection and try again.", id: "TFDx1BtHLl" }));
    });
  }, [has, stop, mark, release, addError, intl]);
  return { handleStop, stoppingTaskIds: ids, confirmDialog: null };
}

// shared-25 Th (local Zs): `Rs(I(e)).on`, a GrowthBook feature. No GrowthBook here (D29 / D31): every gate is off.
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function useGrowthBookFeature(flag) {
  if (hostGrowthBookFlag(flag)) return true;
  return false;
}

// shared-78 ss (local SU): a local session's previews open in the browser when claude.web Launch exists and
// frontend_preview_external_domains is on. Neither here: the Preview pane ("Open {name} in Preview").
export function usePreviewOpensInBrowser() {
  return false;
}

// shared-1 ym (local cu): `{ state: "loading" | "ready" | "error" | "missing", result }` from claude.web
// `Launch.activeServersStore`. Here the mount's servers; without them "missing" (HD then lists none).
export function useActiveServers() {
  const servers = useHost()?.servers;
  return useMemo(() => (servers ? { state: "ready", result: servers } : { state: "missing" }), [servers]);
}

// shared-0 Cm (local Fx): `globalThis["claude.web"]?.Launch`, the desktop launch bridge (focusOrOpenPreviewTab,
// getPreviewTabs …). This host has none.
export const claudeWebLaunch = undefined;

// c03935b01 mt (local _c): the session scope store from its context, null outside a session view. Here `getState()`
// is the mount's sidePanes (requestServerLogs, setSidePane, setPendingRemotePreviewOpen).
export function useRailScopeStoreApi() {
  const panes = useHost()?.sidePanes;
  return useMemo(() => (panes ? { getState: () => panes } : null), [panes]);
}

// c03935b01 pt (local Q): a selector over the scope store (hasSidePanes, previewServerId, the open side panes).
export function useRailScopeState(selector) {
  return selector(useHost()?.sidePanes ?? NO_SIDE_PANES);
}

// c03935b01 ct (local wc): `Q((e) => oa(e.host))`, whether this window hosts native preview views (the main window
// does). Here sidePanes.previewViews.
export function useRailPreviewViews() {
  return useHost()?.sidePanes?.previewViews === true;
}

// c03935b01 M (local To): whether a side pane is open in the session's tile layout. Here sidePanes.openSidePanes.
export function railSidePaneOpen(state, sessionId, pane) {
  return Array.isArray(state.openSidePanes) && state.openSidePanes.includes(pane);
}

// c155b6b71 c (local f): the session's own preview id, only with claude.web Launch preview tabs. None here: a Servers
// row opens its server by id (`requestServerLogs(serverId, serverId)`).
export function useSessionPreviewId() {
  return undefined;
}

// c68c4283d yd / id (locals _u / Cd): side pane opened / rail stop pressed telemetry. Nothing is sent (D17).
export function logSidePaneOpened() {}
export function logRailStopPressed() {}

// cea7057eb g (local ve): the session's background tasks (a context, [] by default). Here the mount's tasks.
export function useSessionTasks() {
  return useHost()?.tasks ?? NONE;
}

// ---- host shapes -> the official rows (for the mount) ------------------------------------------------------------
// The Preview pane's servers (electron/preview-service.cjs serverView: { name, port, url, status, startedAt } of the
// session's folder, `cwd`) as claude.web active server rows. The id is the Background tasks pane's ("preview:" + name),
// so both share one stopping id. A stopping server is still up (the stopping id, not the status, makes the row busy);
// failed is the official Error status.
const SERVER_STATUS = Object.freeze({ starting: "starting", running: "running", stopping: "running", failed: "error", stopped: "stopped" });
export function railServerRows(previewState) {
  const cwd = previewState?.cwd;
  if (typeof cwd !== "string" || !Array.isArray(previewState.servers)) return NONE;
  return previewState.servers.filter(server => typeof server?.name === "string" && server.name).map(server => ({
    serverId: `preview:${server.name}`, name: server.name, port: Number.isFinite(server.port) && server.port > 0 ? server.port : 0,
    status: SERVER_STATUS[server.status] ?? "starting", cwd,
    ...(Number.isFinite(server.startedAt) ? { startedAt: new Date(server.startedAt).toISOString() } : {}),
  }));
}
// The host's background tasks (background-tasks-model.mjs backgroundTasks / monitorTasks, model-workflow-model.mjs
// workflowTask: { id, kind, taskType?, status, description, startedAt, completedAt }) as session task rows. A host kind
// without a Claude taskType gets the one the Background tasks pane labels it with (local_bash / local_agent /
// local_workflow).
const TASK_TYPES = Object.freeze({ bash: "local_bash", agent: "local_agent", workflow: "local_workflow" });
const time = value => (Number.isFinite(value) ? value : undefined);
export function railTaskRows(tasks) {
  if (!Array.isArray(tasks)) return NONE;
  return tasks.filter(task => typeof task?.id === "string").map(task => ({
    taskId: task.id, status: task.status, description: typeof task.description === "string" ? task.description : "",
    taskType: typeof task.taskType === "string" ? task.taskType : TASK_TYPES[task.kind], startedAt: time(task.startedAt), completedAt: time(task.completedAt),
  }));
}
// The session's scheduled prompts (electron/schedule-service.cjs view: { id, prompt, recurring, cron, humanSchedule,
// createdAt, nextFireAt }) as session meta loops ({ id, prompt, recurring, cron, humanSchedule, createdAt, nextRunAt }).
export function railLoopRows(jobs) {
  if (!Array.isArray(jobs)) return NONE;
  return jobs.filter(job => typeof job?.id === "string").map(job => ({
    id: job.id, prompt: typeof job.prompt === "string" && job.prompt ? job.prompt : undefined, recurring: job.recurring !== false,
    cron: typeof job.cron === "string" ? job.cron : undefined, humanSchedule: typeof job.humanSchedule === "string" ? job.humanSchedule : undefined,
    createdAt: time(job.createdAt), nextRunAt: time(job.nextFireAt),
  }));
}
