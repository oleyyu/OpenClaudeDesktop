// Local services for the original 2.42304.0 Code Routines page scripts/extract-code-routines.mjs emits
// (src/generated/code-routines: cbd6c85c8 zl with the list Pl and the local detail data layer Jc, cfc18e0f4 local detail,
// c0243d234 create page / edit dialog, c0fd2fda3 form fields; R4g-routines RT4, tasks-code-routines WI-4, D32). Each
// export replaces one original declaration, which the extractor feature-checks (see the `adapters` table there; the
// manifest's `hostDifferences` lists every boundary with its reason). The adapters the routines-shared graph already
// answers (intl, router, errors, analytics, account, GrowthBook, SSH configs, the shared-4 dh bridge) stay in
// src/source-routines-shared-adapters.jsx and are imported from there by the generated modules.
//
// Host facts behind these answers: no claude.ai account or organization, no GrowthBook client, no cloud routines (remote
// triggers, templates, one-form), no SSH / WSL places (D31/D37), no tiered chunk loader, no telemetry (D17). The local
// CCD scheduled tasks gate is on (D32) over the host scheduler (electron/local-routines.mjs).
//
// This module must not import src/generated/code-routines (the generated modules import it; a cycle would read an
// adapter before it is initialised). It may import other graphs.
import { createContext, createElement, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { sessionsPageBand } from './generated/code-current/sessions-page-band.mjs';
import { Gp as REMOTE_DELETE_MESSAGES } from './generated/routines-shared/shared-4-CJsHhp5n.mjs';

// ---- the page's host ----
// CodeRoutinesHost (WI-5 provides it around the generated page, inside RoutinesSharedHost):
//   bridge          the scheduled task bridge over local-routines: getAllScheduledTasks() -> Promise<task[]> (the official
//                   bv shape, code tasks only), createScheduledTask(input), updateScheduledTask(input),
//                   updateScheduledTaskStatus(id, 'enabled' | 'disabled' | 'deleted', removeFiles) -> boolean,
//                   onOnScheduledTaskEvent(handler) -> unsubscribe; removeApprovedPermission / getScheduledTaskFileContent
//                   only when the host has them (hostGaps 5, 7).
//   localSessions   the LocalSessions methods the host has:
//                     start(options) -> Promise<{ sessionId }>   Run now (startLocalSession options with scheduledTaskId);
//                       rejects with the main process's message (a `[ccdErrorCategory:<cat>]` suffix names the cause, cov11-01)
//                     getLocalBranches(cwd) -> Promise<branch[]>  the branch picker (workspace-git-branches)
//                     getAll() / getDetectedProjects() / onOnEvent(handler)  the folder field's recent folders
//   browseFolder    (prompt) -> Promise<string | undefined>: the host folder picker.
//   isGitRepo       (cwd) -> boolean | undefined: from workspace-info (undefined while unknown).
//   bypassAvailable whether the host's bypass permission mode is available.
const NO_HOST = Object.freeze({});
export const CodeRoutinesHost = createContext(NO_HOST);
// The module-level bridges (window["claude.web"].CCDScheduledTasks / LocalSessions / FileSystem in the original) read the
// host the mounted page registered. The provider registers during render, so the page's own first effects see it.
let registeredHost = null;
export function CodeRoutinesHostProvider({ value, children }) {
  registeredHost = value ?? null;
  return createElement(CodeRoutinesHost.Provider, { value: value ?? NO_HOST }, children);
}
const hostBridge = () => registeredHost?.bridge;
const bridgeMethod = (name) => {
  const bridge = hostBridge();
  return typeof bridge?.[name] === 'function' ? (...args) => bridge[name](...args) : undefined;
};

// shared-0 Wx (window["claude.web"].CCDScheduledTasks): each method exists only when the mounted page's bridge has it,
// so the original `!!z?.createScheduledTask` / `if (!z?.removeApprovedPermission) return` checks read the host's facts.
export const CCDScheduledTasks = Object.freeze({
  get getAllScheduledTasks() { return bridgeMethod('getAllScheduledTasks'); },
  get createScheduledTask() { return bridgeMethod('createScheduledTask'); },
  get updateScheduledTask() { return bridgeMethod('updateScheduledTask'); },
  get updateScheduledTaskStatus() { return bridgeMethod('updateScheduledTaskStatus'); },
  get onOnScheduledTaskEvent() { return bridgeMethod('onOnScheduledTaskEvent'); },
  get removeApprovedPermission() { return bridgeMethod('removeApprovedPermission'); },
  get getScheduledTaskFileContent() { return bridgeMethod('getScheduledTaskFileContent'); },
});
// shared-0 Ix (window["claude.web"].LocalSessions): the methods the mounted page's host has; the SSH / WSL / trust /
// start-target methods (getSSHLocalBranches, listWslDistros, checkTrust, onStartTargetsRequest, …) are absent.
const localSessionsMethod = (name) => {
  const sessions = registeredHost?.localSessions;
  return typeof sessions?.[name] === 'function' ? (...args) => sessions[name](...args) : undefined;
};
export const LocalSessions = Object.freeze({
  get start() { return localSessionsMethod('start'); },
  get getLocalBranches() { return localSessionsMethod('getLocalBranches'); },
  get getAll() { return localSessionsMethod('getAll'); },
  get getDetectedProjects() { return localSessionsMethod('getDetectedProjects'); },
  get onOnEvent() { return localSessionsMethod('onOnEvent'); },
});
// shared-0 Ax (window["claude.web"].FileSystem): only browseFolder (the host folder picker).
export const FileSystem = Object.freeze({
  get browseFolder() {
    const browse = registeredHost?.browseFolder;
    return typeof browse === 'function' ? (prompt) => browse(prompt) : undefined;
  },
});
// ce2cf86ad V (startLocalSession): Run now through the host scheduler. Like the original, nothing happens without a start.
export function useStartLocalSession() {
  const start = useContext(CodeRoutinesHost).localSessions?.start;
  return useCallback(async (options) => (typeof start === 'function' ? start(options) : undefined), [start]);
}
// ce2cf86ad P (ensureWorkspaceTrust): no trust dialog here; the folder was approved when the routine was saved.
const TRUSTED = async () => true;
export function useEnsureWorkspaceTrust() {
  return TRUSTED;
}
// shared-11 Ud (isGitRepo for a folder on a place): local folders only (no places here).
export function useIsGitRepo(cwd, remote) {
  const { isGitRepo } = useContext(CodeRoutinesHost);
  if (remote !== null && remote !== undefined && remote !== 'local') return undefined;
  return cwd && typeof isGitRepo === 'function' ? isGitRepo(cwd) : undefined;
}
// cf50036ec O (bypass permissions availability) over the host's bypass mode.
export function useBypassPermissionsAvailability() {
  const { bypassAvailable } = useContext(CodeRoutinesHost);
  return useMemo(() => ({
    available: bypassAvailable === true, unverifiedYes: false, showDisabled: false, blockedReason: undefined,
    settingsResolveFailed: false, settingsUnverified: false, rereadSettings() {},
  }), [bypassAvailable]);
}

// shared-8 Q (the CCD sessions store, read as `_i(selector)`): a host store the page fills from its sessions
// ({ sessionId, scheduledTaskId, isRunning, isArchived, title, createdAt, error }). Not initialised until the page sets it.
function hostStore(initial) {
  let state = initial;
  const listeners = new Set();
  const getState = () => state;
  const setState = (next) => {
    const value = typeof next === 'function' ? next(state) : next;
    if (Object.is(value, state)) return;
    state = { ...state, ...value };
    for (const listener of listeners) listener();
  };
  const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
  const useStore = (selector = (s) => s) => useSyncExternalStore(subscribe, () => selector(state), () => selector(initial));
  return Object.assign(useStore, { getState, setState, subscribe, getInitialState: () => initial });
}
export const ccdSessionsStore = hostStore({
  sessions: [], isInitialized: false, initialLoadTimedOut: false, loadFailed: false, archivedRowsPending: false, selectedProjects: [],
});
// c06cf64bb H_ (the live session runtime store): Run now only marks the started session spawned-fresh; no-op here.
const SPAWNED_FRESH = Object.freeze({ markSpawnedFresh() {} });
export const spawnedFreshStore = Object.freeze({ getState: () => SPAWNED_FRESH });

// ---- lazy surfaces ----
// shared-104 Fo (the tiered lazy loader): React.lazy over the same entry.load / pick, with options.loading as the
// Suspense fallback. The handle answers preload (the intent handlers of shared-104 Dz) and its load state.
export function lazySurface(spec) {
  let loaded, promise;
  const load = () => (promise ??= Promise.resolve().then(() => spec.entry.load()).then((module) => {
    loaded = spec.pick === undefined ? (module?.default ?? module) : spec.pick(module);
    return loaded;
  }));
  const Lazy = lazy(() => load().then((Component) => ({ default: Component })));
  const loading = spec.options?.suspense === true ? undefined : spec.options?.loading;
  function LazySurface(props) {
    return createElement(Suspense, { fallback: typeof loading === 'function' ? createElement(loading) : null }, createElement(Lazy, props));
  }
  LazySurface.displayName = `LazySurface(${spec.entry.id})`;
  const handle = {
    id: spec.entry.id,
    get state() { return loaded !== undefined ? 'loaded' : promise ? 'loading' : 'idle'; },
    preload() { load().catch(() => {}); },
  };
  return { Component: LazySurface, handle };
}
// shared-6 ST (pending while a lazy chunk loads): the surfaces load from the host bundle.
export const useLazySurfacePending = () => false;
// cbd6c85c8 / cae55dd08 __vite__mapDeps (the lazy chunks' stylesheets): the host bundles the official styles (D2).
export function viteChunkStylesheets() {
  return [];
}
// Unreachable lazy surfaces: a null component with an inert handle.
function NullSurface() {
  return null;
}
const nullSurface = (id) => Object.freeze({ Component: NullSurface, handle: Object.freeze({ id, state: 'idle', preload() {} }) });
export const CloudRoutineCreateSurface = nullSurface('epitaxy_routine_create_form');
export const CloudRoutineDetailSurface = nullSurface('epitaxy_routine_detail');
export const CloudRoutineCreateFormSurface = nullSurface('code_routine_create_form');
export const UpsertScheduledTaskModalSurface = nullSurface('scheduled_task_upsert_modal');
export const SshFolderBrowserSurface = nullSurface('epitaxy_ssh_folder_browser');
// cbd6c85c8 Nc / Ml / pl: the cloud routine detail, the template grid and the Yours / Templates tabs (St() off).
export function CloudRoutineDetail() {
  return null;
}
export function RoutineTemplatesGrid() {
  return null;
}
export function RoutineScopeTabs() {
  return null;
}
// shared-7 sx (the lazily loaded effort slider): not migrated.
export function EffortControlSlot() {
  return null;
}
// shared-7 RT (MCP connector favicons for approved tools): no per-routine approvals here (hostGap 7).
export function ConnectorFavicon() {
  return null;
}
// shared-13 N / shared-5 EM: slash command chips over the skill / plugin / MCP catalog; no catalog here.
export function SlashCommandChip() {
  return null;
}
const NO_COMMANDS = new Map();
export const useSlashCommandCatalog = () => NO_COMMANDS;

// ---- gates (D32: the local CCD path on; cloud, one-form, source filter, SSH / WSL off) ----
const GATE_ON = Object.freeze({ loading: false, enabled: true });
export const useCodeScheduledTasksGate = () => GATE_ON;
const COWORK_GATE_OFF = Object.freeze({ loading: false, enabled: false, statusUnknown: false });
export const useCoworkScheduledTasksGate = () => COWORK_GATE_OFF;
export const useLocalRoutinesAvailable = () => true;
export const useOneRoutineForm = () => false;
export const useOneFormCreate = () => false;
export const useLocalOneFormCreate = () => false;
export const useRoutineSourceFilter = () => false;
export const useRoutinesDisabledByPolicy = () => false;
export const useSshRoutinesSupported = () => false;
export const useWslRoutinesSupported = () => false;
const SSH_ALLOWLIST_OFF = Object.freeze({ disabled: true, known: true });
export const useSshHostAllowlist = () => SSH_ALLOWLIST_OFF;
const NOT_WITHHELD = Object.freeze({ served: false, localWithheld: false });
export const useCoworkLocalWithheld = () => NOT_WITHHELD;
export const useCreateWithClaudeSurface = () => 'cowork';
const NO_DRAFT = () => {};
export const useStartDraftConversation = () => NO_DRAFT;
export const createWithClaudePrompt = () => '';
const NO_DRAFT_GENERATOR = Object.freeze({ generateRoutineDraft: () => Promise.reject(new Error('Routine drafting is not available in this app.')) });
export const useGenerateRoutineDraft = () => NO_DRAFT_GENERATOR;
export const useIsFocusedExtraPane = () => false;

// ---- cloud data (no cloud routines here) ----
const noRefetch = async () => undefined;
const NO_REMOTE_TRIGGERS = Object.freeze({ data: undefined, isLoading: false, isError: false, refetch: noRefetch });
export const useRemoteTriggers = () => NO_REMOTE_TRIGGERS;
const NO_WEBHOOK_TRIGGERS = Object.freeze({ data: undefined, isSuccess: false });
export const useWebhookTriggers = () => NO_WEBHOOK_TRIGGERS;
const NO_PROJECTS = Object.freeze([]);
export const useRoutineProjects = () => NO_PROJECTS;
const NO_ROLLUP = Object.freeze({
  runCountByTriggerId: new Map(), latestRunStatusByTriggerId: new Map(), latestRunByTriggerId: new Map(), pageFull: false, isLoading: false,
});
export const useRemoteTriggerRunRollup = () => NO_ROLLUP;
const canManage = () => true;
export const useCanManageRemoteTrigger = () => canManage;
// shared-4 qp: with no account bootstrap config, `delete_removes_runs` is unset; the plain remote delete body.
export function remoteRoutineDeleteBody() {
  return REMOTE_DELETE_MESSAGES.deleteBody;
}
// shared-52 zP (the account bootstrap config): no account, so every optional flag is unset.
const EMPTY_BOOTSTRAP = Object.freeze({ permission_modes: Object.freeze({}), routines: Object.freeze({}) });
export function accountBootstrapConfig() {
  return EMPTY_BOOTSTRAP;
}
// vendor-query tt (react-query useQuery): the branch list (cc233fde2), Runs on's WSL distributions (disabled here) and the
// folder browser (c6a930826) over a small module-level cache keyed by the JSON queryKey. A disabled query answers like
// react-query's (pending, not fetching); no QueryClient here, so no retries, focus refetch or garbage collection.
const queryCache = new Map();
function queryEntry(key) {
  let entry = queryCache.get(key);
  if (!entry) {
    entry = { status: 'pending', data: undefined, error: null, updatedAt: 0, fetchCount: 0, promise: undefined, version: 0, listeners: new Set() };
    queryCache.set(key, entry);
  }
  return entry;
}
function notifyQuery(entry) {
  entry.version++;
  for (const listener of entry.listeners) listener();
}
function runQuery(entry, queryFn, queryKey, meta) {
  if (entry.promise) return entry.promise;
  entry.promise = Promise.resolve()
    .then(() => queryFn({ queryKey, meta, signal: undefined }))
    .then((data) => { Object.assign(entry, { status: 'success', data, error: null, updatedAt: Date.now() }); },
      (error) => { Object.assign(entry, { status: entry.data === undefined ? 'error' : entry.status, error }); })
    .finally(() => { entry.fetchCount++; entry.promise = undefined; notifyQuery(entry); });
  notifyQuery(entry);
  return entry.promise;
}
export function useHostQuery(options) {
  const { queryKey, enabled = true, staleTime = 0, select } = options;
  const key = JSON.stringify(queryKey ?? []);
  const entry = queryEntry(key);
  const latest = useRef(options);
  latest.current = options;
  const subscribe = useCallback((listener) => { entry.listeners.add(listener); return () => entry.listeners.delete(listener); }, [entry]);
  useSyncExternalStore(subscribe, () => entry.version, () => entry.version);
  useEffect(() => {
    if (!enabled || entry.promise) return;
    if (entry.updatedAt && Date.now() - entry.updatedAt < staleTime) return;
    void runQuery(entry, latest.current.queryFn, latest.current.queryKey, latest.current.meta);
  }, [entry, enabled, staleTime]);
  const refetch = useCallback(async () => {
    await runQuery(entry, latest.current.queryFn, latest.current.queryKey, latest.current.meta);
    return { data: entry.data, error: entry.error, isError: entry.status === 'error' };
  }, [entry]);
  const fetching = enabled && entry.promise !== undefined;
  const data = entry.data === undefined || !select ? entry.data : select(entry.data);
  return {
    data, error: entry.error, status: entry.status, fetchStatus: fetching ? 'fetching' : 'idle',
    isPending: entry.status === 'pending', isLoading: entry.status === 'pending' && fetching, isFetching: fetching,
    isSuccess: entry.status === 'success', isError: entry.status === 'error', isFetched: entry.fetchCount > 0, refetch,
  };
}

// ---- session start services the host core owns (hostGap 11) ----
export const useBillingNotSelfManageable = () => false;
const NO_CLI_FLOOR = () => undefined;
export const useCliFloorForModel = () => NO_CLI_FLOOR;
const NO_MCP_SELECTION = Object.freeze({ enabledMcpTools: undefined, enabledExtensionIds: undefined });
export const useEnabledMcpTools = () => NO_MCP_SELECTION;
export async function resolveRunMcpServers({ enabledMcpTools } = {}) {
  return { mcpServers: undefined, remoteMcpServers: [], enabledMcpTools };
}
export const useEnsureToolsReady = () => undefined;
// shared-25 bc (GrowthBook dynamic config) and the zod schema handed to it: the caller's default.
export function useDynamicConfig(name, fallback) {
  return fallback;
}
const INERT_SCHEMA = Object.freeze({ catch: () => INERT_SCHEMA, parse: (value) => value, safeParse: (value) => ({ success: true, data: value }) });
export function zodNumber() {
  return INERT_SCHEMA;
}
// shared-2 MH (load telemetry): nothing is sent (D17).
export function useLoadTelemetry() {}
// shared-6 Xj (auto mode availability): a host permission mode that is always offered.
const AUTO_AVAILABLE = Object.freeze({ kind: 'available' });
export const useAutoModeAvailability = () => AUTO_AVAILABLE;
// shared-6 Ij (managed settings for a folder): none here, settled.
const NO_MANAGED_SETTINGS = Object.freeze({
  capabilities: Object.freeze({ fastMode: undefined, bypassPermissions: undefined, autoPermissions: undefined, workflows: undefined }),
  config: null, configSettled: true, configErrored: false, rereadConfig() {}, desktopResolvesDisableModes: false,
});
export const useManagedPermissionSettings = () => NO_MANAGED_SETTINGS;
// shared-156 Pb / $b (the MCP tool catalog for approved tools): none (hostGap 7).
export const useToolCatalogState = () => undefined;
export const lookupCatalogTool = () => undefined;

// ---- page frame ----
// shared-18 ty (the page band): the band the host Sessions page uses (no frame shell, a desktop top bar).
const PAGE_BAND = sessionsPageBand({ hasFrameShell: false, hasDesktopTopBar: true, isClaudeApp: true });
export const useRoutinesPageBand = () => PAGE_BAND;
