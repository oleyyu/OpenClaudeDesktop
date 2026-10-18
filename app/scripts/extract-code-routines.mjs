// R4g-routines RT4 (tasks-code-routines WI-4, D32): extract the 2.42304.0 Code Routines page — the local CCD scheduled
// task path — without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/code-routines, own scripts/verify-gen-code-routines.mjs).
//
//   cbd6c85c8  zl, the Code Routines layout (list Pl, the local cards jl / Al / Ol / xl, the local detail data layer Jc with
//              Run now Kc / Uc / Hc / Vc and the Routine / Scheduled copy zc / Bc, the runnable check Wc, the running-id
//              store Gc, the status write qc), and the two lazy local surfaces it mounts: Dc (c0243d234, the create page)
//              and kc (cfc18e0f4, the detail).
//   cfc18e0f4  J EpitaxyLocalRoutineDetail, ze LocalStatusChip, Y SessionRunRow.
//   c0243d234  J EpitaxyLocalRoutineCreatePage, Y EpitaxyLocalRoutineFormDialog, Z EpitaxyLocalRoutineCreateFormEmbed.
//   c0fd2fda3  all 13 exports: the form state hook sn, the branch picker Dt, the worktree switch Ot, Runs on wt, and the
//              schedule / permission / model / folder fields.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk; the bindings of each chunk
// are the reachable closure of the roots across chunks (free variables of each declaration, resolved through import and
// re-export chains to the declaring chunk). A binding resolves, in this order, to: a named host adapter in
// src/source-code-routines-adapters.jsx (its original declaration must carry `features`), an adapter the routines-shared
// graph already answers it with (src/source-routines-shared-adapters.jsx, the same host service), a verified React
// export of vendor-frame, a semantic public name of view-tabs (D1/D24), a binding the routines-shared graph holds
// (imported from src/generated/routines-shared/<chunk>.mjs under its original local name, so the 12 contexts that graph
// copied stay one object each), or a copy in this graph's module for its chunk. A vendor binding, a destructuring or
// class declaration, an unpinned dynamic import, a context another graph holds, or a binding view-tabs holds without a
// semantic name (D46: name it in extract-view-tabs.mjs; a name it lists in `pendingNames` is imported by its local
// until published) stops generation.
//
// Unreachable branches on this host are adapter boundaries (null components or constant hooks); each is listed in the
// manifest's `hostDifferences`. The two reachable lazy surfaces keep their original lazy declaration; only the import
// specifier is rewritten to the generated module (`import("./c0243d234-Bc7r1pNg.mjs")`), and that module also carries the
// original export alias the declaration's `pick` reads.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/code-routines');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const routinesShared = path.join(root, 'src/generated/routines-shared');
const adapterModule = '../../source-code-routines-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, features }. `features` must appear in the root's prettier form.
const roots = {
  'cbd6c85c8-PO73iD62.js': {
    zl: { name: 'CodeRoutinesPage', features: ['scheduledTaskId: e,', 'onOpenSession: n,', 'e === Ll && d', 'entryPoint: "code_routines_page",', 'collideWithCodeRoutines: !0,'] },
  },
  'cfc18e0f4-Cr7owzD3.js': {
    J: { name: 'LocalRoutineDetail', features: ['"data-testid": "host-wait",', '"data-testid": "runs-on",'] },
    ze: { name: 'LocalStatusChip', features: ['? r(v, { name: "CheckCircle", size: "xs", className: "text-success" })', 'e === "needsInput"'] },
    Y: { name: 'SessionRunRow', features: ['({ session: t, isCompletedUnread: i, onClick: a })', 'l = c(() => a(t.sessionId), [a, t.sessionId]),'] },
  },
  'c0243d234-Bc7r1pNg.js': {
    J: { name: 'LocalRoutineCreatePage', features: ['let o = i(() => ({ kind: "create" }), []),', 'kind: "local",'] },
    Y: { name: 'LocalRoutineFormDialog', features: ['let s = i(() => ({ kind: "edit", task: a }), [a]),'] },
    Z: { name: 'LocalRoutineCreateFormEmbed', features: ['[v] = t(() => Symbol("routine-dialog-trust-gate")),'] },
  },
  'c0fd2fda3-DzTjEtm3.js': {
    sn: { name: 'useLocalRoutineForm', features: ['surface: "code_local",', 'id: "Cox9P9F9a5",'] },
    Dt: { name: 'RoutineBranchField', features: ['? s.formatMessage(Y.noBranches)', ': s.formatMessage(Y.noBranchesMatch),'] },
    Ot: { name: 'RoutineWorktreeToggle', features: ['label: i(I, { ...Y.worktree }),'] },
    wt: { name: 'RoutineRunsOnField', features: ['{ defaultMessage: "{label} (Ant only)", id: "ndHh/LVykO" },', 'emptyMessage: l.formatMessage(Y.noMachines),'] },
    Ut: { name: 'RoutineBasicsFields', features: ['placeholder: s.formatMessage(Z.namePlaceholder),', 'label: i(I, { ...Z.description }),'] },
    Lt: { name: 'RoutineScheduleField', features: ['"aria-label": g.formatMessage(X.atTime),', '"aria-label": g.formatMessage(X.cronExpression),'] },
    At: { name: 'RoutinePermissionModeSelect', features: ['emptyMessage: s.formatMessage(Y.noPermissionModes),'] },
    Wt: { name: 'RoutinePermissionField', features: ['i(N.Header, { children: i(v, { id: "1ty157t" }) }),'] },
    Mt: { name: 'RoutineModelSelect', features: ['emptyMessage: o.formatMessage(Y.noModels),'] },
    Gt: { name: 'RoutineModelField', features: ['() => [{ model: "", name: o.formatMessage(Z.defaultModel) }, ...e],'] },
    Et: { name: 'RoutineFolderField', features: ['let { cwd: s, handleSelectCwd: l, handleBrowseCwd: u, machine: d } = r,'] },
    Bt: { name: 'ROUTINE_FORM_MESSAGES', features: ['clearsApprovals: {', 'id: "Ohdw+y7C3b",'] },
    $t: { name: 'clampRoutinePermissionChoice', features: [': e === "auto" || e === "bypassPermissions"', '? H(e, t)'] },
  },
};
// Lazy declarations kept with a rewritten specifier: key -> { target chunk: original export alias `pick` reads }.
const lazyImports = {
  'cae55dd08-oEwAOna-.js#f': { 'c0243d234-Bc7r1pNg.js': 'EpitaxyLocalRoutineCreateFormEmbed' },
  'cbd6c85c8-PO73iD62.js#Dc': { 'c0243d234-Bc7r1pNg.js': 'EpitaxyLocalRoutineCreatePage' },
  'cbd6c85c8-PO73iD62.js#kc': { 'cfc18e0f4-Cr7owzD3.js': 'EpitaxyLocalRoutineDetail' },
};
// vendor-frame re-exports React as `local=<namespace>.<member>`; the namespace is checked against its module.
const reactNamespaces = { fe: 'react/jsx-runtime', o: 'react', Ln: 'react-dom' };
const reactMembers = {
  'react/jsx-runtime': new Set(['jsx', 'jsxs', 'Fragment']),
  react: new Set(['default', 'useState', 'useRef', 'useCallback', 'useMemo', 'useEffect', 'useLayoutEffect', 'useContext', 'createContext', 'memo',
    'forwardRef', 'useSyncExternalStore', 'useId', 'useReducer', 'use', 'Children', 'Fragment', 'cloneElement', 'isValidElement',
    'useTransition', 'useDeferredValue', 'useEffectEvent', 'useInsertionEffect', 'useImperativeHandle', 'startTransition', 'createElement', 'Component', 'Suspense', 'lazy']),
  'react-dom': new Set(['flushSync', 'createPortal']),
};
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {
  // zustand's React create and its vanilla core (the running-id store Gc, the read-state and pending-read stores).
  'vendor-all-0-CTKbbUUg.js#ee': ['ee = (e) => (e ? x(e) : x)'],
  'vendor-all-0-CTKbbUUg.js#x': ['n = (e) => b(t, e);'],
  'vendor-all-0-CTKbbUUg.js#v': ['v = (e) => (e ? _(e) : _)'],
  'vendor-all-0-CTKbbUUg.js#b': ['useSyncExternalStore(', 'e.getInitialState'],
  'vendor-all-0-CTKbbUUg.js#_': ['n = new Set(),', 'for (let r of n) r(t, e);'],
  // zustand's persist middleware and JSON storage (the recent folders store of the folder field, c749529a1).
  'vendor-all-0-CTKbbUUg.js#me': ['storage: fe(() => window.localStorage),'],
  'vendor-all-0-CTKbbUUg.js#fe': ['getItem: (e) =>'],
  'vendor-all-0-CTKbbUUg.js#pe': ['return n instanceof Promise'],
  'vendor-all-0-CTKbbUUg.js#y': ['y = (e) => e'],
  'vendor-query-Dqcf4jOo.js#nt': ['function nt(e) {\n  return e;\n}'],
  'vendor-query-Dqcf4jOo.js#ne': ['return Object.prototype.toString.call(e) === "[object Object]";'],
  // react-query's replaceEqualDeep (the scheduled task list keeps unchanged rows by identity, shared-4 zm).
  'vendor-query-Dqcf4jOo.js#E': ['if (n > 500) return t;'],
  'vendor-query-Dqcf4jOo.js#te': ['return Array.isArray(e) && e.length === Object.keys(e).length;'],
  'vendor-query-Dqcf4jOo.js#O': ['let t = e.constructor;'],
  'vendor-query-Dqcf4jOo.js#ee': ['ee = Object.prototype.hasOwnProperty'],
  // the debounced value hook of the search result announcement (c365fd3fe r).
  'vendor-all-0-CTKbbUUg.js#_e': ['window.clearTimeout(l.current)'],
};
// Host services and unreachable boundaries (checked first): chunk -> original local -> { name, features, also, boundary }.
// `boundary` (a host difference) is written to the manifest. Each entry is documented where it is implemented.
const adapterTable = {
  'cbd6c85c8-PO73iD62.js': {
    // The cloud create page / detail (c1c5fa449 / cd3378dac) behind St() (cloud routines, off): null surfaces.
    Ec: { name: 'CloudRoutineCreateSurface', features: ['id: "epitaxy_routine_create_form",', 'import("./c1c5fa449-DLn1neKb.js")'],
      boundary: 'Cloud routine create page (c1c5fa449 EpitaxyRoutineCreatePage): cloud routines are off (D17/D32); a null surface with an inert handle.' },
    Oc: { name: 'CloudRoutineDetailSurface', features: ['id: "epitaxy_routine_detail",', 'import("./cd3378dac-qcFogG3w.js")'],
      boundary: 'Cloud routine detail (cd3378dac EpitaxyRoutineDetail): cloud routines are off; a null surface with an inert handle.' },
    Nc: { name: 'CloudRoutineDetail', features: ['s(Ac, { triggerId: e.triggerId }), s(Oc.Component, { ...e })'],
      boundary: 'zl renders Nc (remote trigger query Ac + the cloud detail) only for a remote trigger id with St() on; unreachable, null.' },
    Ml: { name: 'RoutineTemplatesGrid', features: ['className: "grid w-full grid-cols-1 gap-x-6 gap-y-md md:grid-cols-2",', 'children: ts.map((e) =>'],
      boundary: 'Template grid Ml (c8d777f38 templates, onSelect opens the cloud /new?template= page) is only shown with St() on; null (tasks-code-routines-templates, not-applicable-host).' },
    pl: { name: 'RoutineScopeTabs', features: ['activateOnFocus: !1,', 'i ? fl.scheduledTasksView : fl.routinesView,'],
      boundary: 'Yours / Templates scope tabs pl render only with St() on; null.' },
    __vite__mapDeps: { name: 'viteChunkStylesheets', features: ['"assets/v1/shared-frame-CegduNQ2.css",', '"assets/v1/shared-styles-Bl9zqrv-.css",'],
      boundary: 'The lazy chunks\' stylesheet preload list (shared-frame / shared-styles CSS) is empty: the host bundles the official styles in its own layer (D2), so the preload helper injects no <link>.' },
  },
  'cae55dd08-oEwAOna-.js': {
    l: { name: 'CloudRoutineCreateFormSurface', features: ['id: "code_routine_create_form",', 'import("./c1c5fa449-DLn1neKb.js")'],
      boundary: 'Cloud routine create form embed (c1c5fa449): cloud routines are off; a null surface with an inert handle (Pl only preloads it).' },
    __vite__mapDeps: { name: 'viteChunkStylesheets', features: ['"assets/v1/shared-frame-CegduNQ2.css",', '"assets/v1/shared-styles-Bl9zqrv-.css",'],
      boundary: 'The create form embed chunk\'s stylesheet preload list: empty, as for cbd6c85c8 (D2).' },
  },
  'cd1ced056-CT2SxE9T.js': {
    r: { name: 'UpsertScheduledTaskModalSurface', features: ['id: "scheduled_task_upsert_modal",', 'pick: (e) => e.UpsertScheduledTaskModal,'],
      boundary: 'The one-form upsert modal (c97b955f1 Ca, about 98 KB) opens only when sC() (one form) is on; off here, so a null surface with an inert handle and the local c0243d234 form is used (hostGap 17).' },
  },
  'shared-13-C8pTuOID.js': {
    N: { name: 'SlashCommandChip', features: ['a.unresolved', 'onChipClick: u,'],
      boundary: 'Slash command chips in the instructions (c32f7beb9 o over the shared-5 EM catalog): the host has no claude.ai skill / plugin / MCP command catalog, so no chip is ever resolved.' },
  },
  'shared-5-kdJVRUsT.js': {
    EM: { name: 'useSlashCommandCatalog', features: ['{ skills: t } = Cn(),', 'source: "mcp",'], boundary: 'The skill / plugin / MCP command catalog (EM) is empty here; instructions render as plain text.' },
  },
  'shared-104-Cqo2-vQh.js': {
    Fo: { name: 'lazySurface', features: ['let t = Aa(e.entry),', 'i = e.options.suspense === !0 ? void 0 : e.options.loading,'],
      boundary: 'The tiered lazy loader (shared-104 Fo: chunk recovery, load telemetry, overlay hosts) is a React.lazy surface over the same entry.load / pick / options.loading; no tier telemetry or chunk-error recovery (the chunks are in the host bundle).' },
    yO: { name: 'useRemoteTriggerRunRollup', features: ['"/v1/code/sessions?only_trigger_sessions=true&limit=200&exclude_tags=-"', 'latestRunByTriggerId: t.latestRunByTriggerId,'],
      boundary: 'Cloud trigger session rollup (claude.ai /v1/code/sessions): no cloud routines; empty maps, not loading.' },
  },
  'shared-6-Cby4X-ms.js': {
    ON: { name: 'useEnabledMcpTools', features: ['accountEnabledMcpTools: t?.settings?.enabled_mcp_tools,', 'pluginSuggestionsSupported: uN,'],
      boundary: 'The account / session MCP tool selection (ON) is the host core\'s own MCP configuration (hostGap 11): no account tool list here.' },
    wN: { name: 'resolveRunMcpServers', features: ['let a = await _N({ enabledExtensionIds: n, filterFilesystem: !0 }),', 'return { mcpServers: a, remoteMcpServers: o, enabledMcpTools: s };'],
      boundary: 'Run now does not hand MCP servers to the session: the host core loads its own (hostGap 11), so no servers, no remote servers.' },
    Xj: { name: 'useAutoModeAvailability', features: ['r = Ji("claude_code_desktop_auto_permissions"),', 'source: "custom-3p",'],
      boundary: 'Auto mode availability (Xj: GrowthBook rollout, Claude model list, device managed settings) is a host permission mode that is always offered: available.' },
    Ij: { name: 'useManagedPermissionSettings', features: ['return Rj({ workspacePath: e, sshConfig: t });'],
      boundary: 'Managed settings for a folder (Ij over the desktop resolveLocalSettings bridge): none here, settled, so no managed default permission mode.' },
    ST: { name: 'useLazySurfacePending', features: ['t && e.state !== "loaded" ? bT(e, n) : yT', 'return t && !i;'],
      boundary: 'Pending-while-the-chunk-loads (shared-6 ST) reads the tiered loader\'s handle; the host surfaces load from the local bundle, so never pending.' },
  },
  'shared-78-D6VXYXaQ.js': {
    VW: { name: 'useCodeScheduledTasksGate', features: ['t = O("chilling_sloth_clocks"),', 'r || IU("ccdScheduledTasksEnabled", i);'],
      boundary: 'D32: the local CCD scheduled tasks gate (Claude Code available + chilling_sloth_clocks + onThisDevice + the CCD bridge) is on, over the host scheduler.' },
    YH: { name: 'useWslRoutinesSupported', features: ['return Z()?.wslRoutines?.status === "supported";'], boundary: 'WSL routines are not supported here.' },
    BU: { name: 'useCoworkScheduledTasksGate', features: ['IU("coworkScheduledTasksEnabled", t);', '{ loading: !1, enabled: !0, statusUnknown: !1 }'],
      boundary: 'Cowork scheduled tasks on the Code page (the chat source rows behind the source filter, ZS off): off.' },
  },
  'shared-18-D4XxL6Tg.js': {
    ty: { name: 'useRoutinesPageBand', features: ['hasFrameShell: Zr(),', 'frameHeader: Dc(),'],
      boundary: 'The page band (ty over the frame shell / desktop top bar) is the band the host Sessions page uses (code-current sessionsPageBand with no frame shell and a desktop top bar).' },
    uC: { name: 'useLocalRoutinesAvailable', features: ['n = WS() === !0,', 'return t.enabled === !0 && (!n || i);'],
      boundary: 'Local routines available (shared-18 uC: the CCD gate and no routines policy): true with D32 (no managed policy here).' },
    sC: { name: 'useOneRoutineForm', features: ['let e = oC(),', 'return e === !0 && t && n === !0;'], boundary: 'The one-form flow (sC) is off (GrowthBook, hostGap 17).' },
    jV: { name: 'useOneFormCreate', features: ['n?.createScheduledTask && r', 't.enabled === !0'], boundary: 'One-form create (jV, needs ZS and sC) is off.' },
    dC: { name: 'useLocalOneFormCreate', features: ['return e && t && !n && !!bt?.createScheduledTask;'], boundary: 'Local one-form create (dC, needs ZS) is off.' },
    ZS: { name: 'useRoutineSourceFilter', features: ['return aC() === !0;'], boundary: 'The source filter / hideNonCode (ZS, aC) is off: no remote triggers or Cowork rows on the Code page.' },
    WS: { name: 'useRoutinesDisabledByPolicy', features: ['return US().disabledByPolicy;'], boundary: 'No managed routines policy here: not disabled.' },
    XS: { name: 'useSshHostAllowlist', features: ['disabled: e ? e.sshHostAllowlist?.value.length === 0 : YS,'],
      boundary: 'No SSH environments here (D31/D37): the SSH host allowlist reads disabled and known.' },
    JS: { name: 'useSshRoutinesSupported', features: ['e.appFeatures?.humbleSky?.status === "supported"'], boundary: 'SSH routines (humbleSky) are not supported here (D37).' },
    TV: { name: 'useCreateWithClaudeSurface', features: ['return ee(() => wV(e, t, n, Oo), wV(e, t, n, CV));'],
      boundary: 'Create with Claude (TV, which surface drafts the routine) is only offered with St() on; reads "cowork" (wV with no hub look).' },
    DV: { name: 'useStartDraftConversation', features: ['typeof t == "string" ? e(t, n) : e(t.text, n, { delivery: t.delivery });'],
      boundary: 'Starting a chat draft for Create with Claude (DV over oV) is unreachable (St() off); a no-op callback.' },
    dV: { name: 'createWithClaudePrompt', features: ['return uV(e, sV.create, { kind: t });'], boundary: 'The Create with Claude prompt (dV) is unreachable; an empty prompt.' },
  },
  'shared-4-CJsHhp5n.js': {
    bT: { name: 'useEnsureToolsReady', features: ['if (t) return () => (Hn() ? Promise.resolve() : Un(e));'],
      boundary: 'MCP bootstrap wait (bT): the host core manages its MCP servers; nothing to wait for.' },
    Wm: { name: 'useCoworkLocalWithheld', features: ['localWithheld: (n && o && (e ? s && !t && !i : !(i && s && !t))) || a,'],
      boundary: 'The Cowork-served / local-withheld check (Wm: org availability, Cowork verdict) only matters with the source filter on; not served, not withheld.' },
    qp: { name: 'remoteRoutineDeleteBody', features: ['return Jr().routines.delete_removes_runs'],
      boundary: 'The remote routine delete body (qp reads the account bootstrap routines config) is only used for remote rows; there are none, so it answers the plain body.' },
  },
  'shared-1-CAAiD7E3.js': {
    mT: { name: 'useCanManageRemoteTrigger', features: ['t = Rw().viaCoworkShim;', 'return E((n) => pT(n, e, t), [e, t]);'],
      boundary: 'Whether a remote trigger can be managed (mT, account + Cowork shim): there are no remote rows; without the shim the original pT answers yes.' },
    UT: { name: 'useRemoteTriggers', features: ['return mr("/v1/code/triggers", {'], boundary: 'Cloud triggers query (claude.ai /v1/code/triggers): no cloud routines; no data, not loading.' },
  },
  'c2bdcaf28-gKS3dLSx.js': {
    h: { name: 'useWebhookTriggers', features: ['return r(p, { ...t, enabled: t.enabled && (e?.enabled ?? !0) });'], also: { p: ['p = "/v1/code/webhook-triggers"'] },
      boundary: 'Cloud webhook triggers query (/v1/code/webhook-triggers): none.' },
  },
  'c735530ca-CFslx6dG.js': {
    s: { name: 'useRoutineProjects', features: ['{ projects: u } = r({ enabled: l }),'], boundary: 'Claude projects for chat routine rows (shared-16 bl, claude.ai projects): none.' },
  },
  'cf50036ec-CJx7gDeD.js': {
    O: { name: 'useBypassPermissionsAvailability', features: ['unverifiedYes: C(t, n),', 'blockedReason: D(t),'],
      boundary: 'Bypass permissions availability (cf50036ec O: account / org / managed settings signals) is the host\'s bypass mode availability; never unverified.' },
  },
  'shared-11-BuQ3CK5I.js': {
    Ud: { name: 'useIsGitRepo', features: ['return Wd(e, t).isGitRepo;'], boundary: 'Whether the folder is a Git repository comes from the host workspace-info service (real git); undefined while unknown.' },
  },
  'vendor-query-Dqcf4jOo.js': {
    tt: { name: 'useHostQuery', features: ['return et(e, U, t);'],
      boundary: 'react-query useQuery (the branch list cc233fde2, the WSL distributions of Runs on, the folder browser c6a930826) runs over a small host query cache (queryKey / queryFn / enabled / staleTime / select); the host has no QueryClient, so no retries, window-focus refetch or garbage collection.' },
  },
  'c201cd217-CpGLdevf.js': {
    r: { name: 'SshFolderBrowserSurface', features: ['id: "epitaxy_ssh_folder_browser",', 'pick: (e) => e.FolderBrowserModal,'],
      boundary: 'The SSH folder browser (ca720915e FolderBrowserModal) only opens for an SSH place: none here (D37); a null surface.' },
  },
  'c0efc2620-D6kh0Iid.js': {
    _e: { name: 'useGenerateRoutineDraft', features: ['/dust/generate_routine_'], boundary: 'Routine auto-drafting (claude.ai generate_routine_draft, GrowthBook __gb__2682097403) is off; no draft generator.' },
  },
  'shared-0-ByI5P0CP.js': {
    Ax: { name: 'FileSystem', features: ['Ax = globalThis["claude.web"]?.FileSystem'], boundary: 'window["claude.web"].FileSystem: only browseFolder (the host folder picker) is provided.' },
    Wx: { name: 'CCDScheduledTasks', features: ['Wx = globalThis["claude.web"]?.CCDScheduledTasks'],
      boundary: 'window["claude.web"].CCDScheduledTasks is the host bridge over the local-routines service (list / create / update / status), registered by the page; removeApprovedPermission and getScheduledTaskFileContent are absent (hostGaps 5, 7).' },
    Ix: { name: 'LocalSessions', features: ['Ix = globalThis["claude.web"]?.LocalSessions'],
      boundary: 'window["claude.web"].LocalSessions is the host\'s: start (Run now through the host scheduler, hostGap 6), getLocalBranches (real git) and the recent-folder reads (getAll / getDetectedProjects / onOnEvent) when the page provides them; the SSH / WSL / trust / start-target methods are absent.' },
  },
  'shared-2-Cb74JByF.js': {
    MH: { name: 'useLoadTelemetry', features: ['treePrefetchObservedAtEpochMs: D,'], boundary: 'Page load telemetry (MH): nothing is sent (D17).' },
  },
  'shared-8-B5lJ8U5C.js': {
    Q: { name: 'ccdSessionsStore', features: ['name: "ccd-sessions-filter",', 'archivedRowsPending: !1,'],
      boundary: 'The CCD sessions store (shared-8 Q) is a host store the page fills from its own sessions (scheduledTaskId from session metadata / runs); the persisted project filter is not used here.' },
  },
  'c06cf64bb-BE5q2vSr.js': {
    H_: { name: 'spawnedFreshStore', features: ['protocolHandlers: r', 'sr.getState().clearSession(t),'],
      boundary: 'The live session runtime store (c06cf64bb H_) is the host transcript engine; Run now only marks a started session spawned-fresh, a no-op here (hostGap 11).' },
  },
  'shared-25-DP8p7i1Z.js': {
    bc: { name: 'useDynamicConfig', features: ['() => Ws(r?.shared, i, a, n, t, { type: "dynamic_config", name: e }),'],
      boundary: 'GrowthBook dynamic configs (bc, e.g. claudeai_mcp_bootstrap_wait) are not served here: the caller\'s default value.' },
  },
  'vendor-zod-fszujTq6.js': {
    Ks: { name: 'zodNumber', features: ['return ta(Gs, e);'], boundary: 'The zod number schema Kc hands useDynamicConfig is never consulted (no dynamic configs): an inert schema.' },
  },
  'shared-156-Bikz018e.js': {
    Pb: { name: 'useToolCatalogState', features: ['return X(Nb);'], boundary: 'The MCP tool catalog store (Pb) names approved tools; no per-routine approvals here (hostGap 7): no catalog.' },
    $b: { name: 'lookupCatalogTool', features: ['return r?.toolsEnumerated === !1 && n !== "forLabel" ? void 0 : r;'], boundary: 'Catalog lookup for an approved tool: none (hostGap 7).' },
  },
  'shared-52-DGviI8xb.js': {
    zP: { name: 'accountBootstrapConfig', features: ['return LP(PP(Jt(), e), !ln(), e ? xP() : void 0);'],
      boundary: 'The account bootstrap config (zP: permission_modes, routines flags) is not served here (no account): an empty config. Only remote environments (OL) and remote deletes (qp) read it.' },
  },
  'shared-16-B0xHzPjj.js': {
    Do: { name: 'useIsFocusedExtraPane', features: ['Math.min(r.focusedIndex, r.extraPanesByMode[t]?.length ?? 0) === e,'],
      boundary: 'The detail is not hosted in an extra split pane here (the routines page is a main section): never the focused extra pane.' },
  },
  'shared-7-B8UIMGDr.js': {
    RT: { name: 'ConnectorFavicon', features: ['"data-testid": "connector-icon-globe-fallback",'],
      boundary: 'MCP connector favicons (RT, public suffix lookup chunk cd668e25e) for approved tools: no per-routine approvals here (hostGap 7), so none is drawn.' },
    sx: { name: 'EffortControlSlot', features: ['import("./c8e04f916-__6cSvtd.js")', 'default: e?.EffortControl ?? cx'],
      boundary: 'The lazily loaded effort slider (c8e04f916 EffortControl) is not migrated: the routine keeps the host core\'s effort option.' },
    Eg: { name: 'useBillingNotSelfManageable', features: ['let e = he(),', 'return e && !t;'], boundary: 'No billing here: not self-manageable is false.' },
  },
  'ce2cf86ad-IkqFS5zj.js': {
    P: { name: 'useEnsureWorkspaceTrust', features: ['return r(async (t, n, r) => (await e(t, n, r)) === "accepted", [e]);'],
      boundary: 'No workspace trust dialog here (hostGap 10): the folder was approved when the routine was saved; a folder missing at run time is the main process\'s cwd_not_found.' },
    V: { name: 'useStartLocalSession', features: ['let n = i?.start;', 'attachments: await u(a),'],
      boundary: 'startLocalSession runs the routine through the host scheduler (local-routines run): the <scheduled-task> message, MCP servers and permission mode are the scheduler\'s own (hostGaps 5, 6); a launch failure rejects with the category suffix.' },
  },
  'shared-182-eT1kXtya.js': {
    _R: { name: 'useCliFloorForModel', features: ['return w((n) => eR(t ?? rR, n, e), [t, e]);'], boundary: 'No Claude Code CLI version floor here (hostGap 11).' },
  },
};

// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  { source: 'cbd6c85c8-PO73iD62.js', role: 'zl dispatches the local create page on "new-local"; Jc opens a local routine; Kc refuses Run now without LocalSessions.start; Uc starts the session as a manual scheduled task start',
    features: ['Ll="new-local"', 'code_routine_open', 'CCD scheduled task Run now skipped: LocalSessions.start bridge unavailable', 'scheduledTaskManualStart:!0'] },
  { source: 'cbd6c85c8-PO73iD62.js', role: 'The two reachable lazy surfaces (local create page, local detail)',
    features: ['id:"epitaxy_local_routine_create_form"', 'id:"epitaxy_local_routine_detail"'] },
  { source: 'cfc18e0f4-Cr7owzD3.js', role: 'Local routine detail: the empty Always allowed line and Run now',
    features: ['Q8Ygr2drci', 'tnnK1JFUSw'] },
  { source: 'c0243d234-Bc7r1pNg.js', role: 'The create form embed gates trust with its own id', features: ['routine-dialog-trust-gate'] },
  { source: 'c0fd2fda3-DzTjEtm3.js', role: 'The branch picker empty states (cov1-03), Runs on "(Ant only)" and its filter, the reserved name check',
    features: ['emptyMessage:u?null:l.length===0', 'ndHh/LVykO', 'filterRunsOn', 'Cox9P9F9a5'] },
];
// Globals the emitted modules may read (browser and language built-ins the original declarations use).
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'NodeFilter', 'Event', 'BigInt', 'WeakRef', 'CSS', 'Float64Array']);

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk.
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// Follow an import (and re-export chains) to the declaring chunk.
async function resolveImport(entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
async function heldGraph(dir, label) {
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${label} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Map();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.set(`${mod.source}#${typeof b === 'string' ? b : b.name}`, mod.target ?? mod.source);
  const adapted = new Map();
  for (const a of manifest.adapters ?? []) adapted.set(a.original, a.name);
  // D46: names extract-view-tabs.mjs has settled but not published yet (other areas still slice those bindings).
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { published, held, adapted, pending, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');

export async function extractCodeRoutines({ check = false, survey = false, extraAdapters = {} } = {}) {
  const cache = new Map();
  // extraAdapters (tests only, with check): merged into the table, so an adapter the closure never reaches stops generation.
  const adapters = Object.fromEntries([...new Set([...Object.keys(adapterTable), ...Object.keys(extraAdapters)])]
    .map(file => [file, { ...adapterTable[file], ...extraAdapters[file] }]));
  const vt = await heldGraph(viewTabs, 'view-tabs');
  const rs = await heldGraph(routinesShared, 'routines-shared');
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      if (rs.held.has(key) || vt.held.has(key)) throw Error(`adapter ${key} replaces a binding another graph holds; import it instead`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapted.has(key)) {
      result = { kind: 'shared-adapter', name: rs.adapted.get(key) };
    } else if (file.startsWith('vendor-frame-') && !vt.published.has(key) && /^[\w$]+=(?:o|fe|Ln)\.[\w$]+$/.test(entry && entry.kind === 'var' ? declarationText(src, entry) : '')) {
      // vendor-frame re-exports React as `local=<namespace>.<member>`: imported from React itself, before the
      // view-tabs lookups (D46: view-tabs names only the non-React bindings, as routines-shared resolves them).
      const m = /^([\w$]+)=([\w$]+)\.([\w$]+)$/.exec(declarationText(src, entry));
      const module = reactNamespaces[m[2]];
      if (!module || !reactMembers[module].has(m[3])) throw Error(`vendor-frame ${local} (${m[0]}) is not a known React export`);
      result = { kind: 'react', module, name: m[3] };
    } else if (vt.published.has(key)) {
      result = { kind: 'view-tabs', name: vt.published.get(key), from: `../view-tabs/${file}` };
    } else if (rs.held.has(key)) {
      result = { kind: 'routines-shared', name: local, from: `../routines-shared/${rs.held.get(key)}` };
    } else if (vt.held.has(key)) {
      // D1/D46: host and generated code import view-tabs only by semantic public name; a name view-tabs still holds
      // back (`pendingNames`, other areas slice that binding) is imported by its local until it is published.
      if (!vt.pending.has(key)) throw Error(`${key} is held by view-tabs without a semantic name; name it in extract-view-tabs.mjs (D46)`);
      result = { kind: 'view-tabs-held', name: local, from: `../view-tabs/${file}`, pendingName: vt.pending.get(key) };
    } else if (file.startsWith('vendor-') && !file.startsWith('vendor-frame-') && !vendorCopies[key]) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'pattern' || entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) {
        const pins = lazyImports[key];
        if (!pins) throw Error(`${key} has a dynamic import (${text.slice(0, 160)}); give it an adapter`);
        let rest = text;
        for (const target of Object.keys(pins)) {
          const spec = `import("./${target}")`;
          if (rest.split(spec).length - 1 !== 1) throw Error(`${key}: expected one ${spec}`);
          rest = rest.split(spec).join('');
        }
        if (/\bimport\s*\(/.test(rest)) throw Error(`${key}: unpinned dynamic import`);
      }
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') {
      const bucket = { adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'routines-shared': 'routinesShared' }[cls.kind];
      used[bucket].add(key);
      return;
    }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    const reads = new Set();
    edges.set(key, reads);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      const depKey = `${target.file}#${target.local}`;
      reads.add(depKey);
      await visit(depKey, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      try { assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features); }
      catch (error) { if (!survey) throw error; problems.push(error.message); }
      if (survey && !spec.features.length) problems.push(`root ${file}#${local} has no features`);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  for (const [key, pins] of Object.entries(lazyImports)) {
    if (!edges.has(key)) { if (!survey) throw Error(`lazy declaration ${key} is not reached`); problems.push(`unreached lazy ${key}`); continue; }
    for (const [target, alias] of Object.entries(pins)) {
      const src = await readSource(target, cache);
      const local = src.exported.get(alias);
      if (!local || !chunks.get(target)?.has(local)) { if (!survey) throw Error(`lazy ${key}: ${target} ${alias} is not in this graph`); problems.push(`lazy ${key}: ${target} ${alias} missing`); }
    }
  }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    for (const k of (process.env.SURVEY_SHOW ?? '').split(',').filter(Boolean)) { const [f, l] = k.split('#'); const s = await readSource(f, cache); console.log('SHOW', k, '\n' + (await featureText(s, s.top.get(l))).split('\n').slice(0, +(process.env.SURVEY_LINES ?? 1e9)).join('\n')); }
    for (const k of (process.env.SURVEY_DEPS ?? '').split(',').filter(Boolean)) {
      const [f, l] = k.split('#'); const s = await readSource(f, cache);
      const rows = [];
      for (const dep of declarationDeps(s, l)) {
        const e = s.top.get(dep);
        const t = e.kind === 'import' ? await resolveImport(e, cache, k) : { file: f, local: dep };
        const tk = `${t.file}#${t.local}`, c = resolved.get(tk);
        const ts = await readSource(t.file, cache), te = ts.top.get(t.local);
        rows.push(`${dep} -> ${tk} [${c?.kind ?? '?'}${c?.name ? ' ' + c.name : ''}] ${te ? declarationText(ts, te).slice(0, +(process.env.SURVEY_WIDTH ?? 140)).replace(/\s+/g, ' ') : ''}`);
      }
      console.log('DEPS', k, '\n  ' + rows.join('\n  '));
    }
    if (process.env.SURVEY_USED) for (const [k, v] of Object.entries(used)) console.log('USED', k, [...v].join(' '));
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return null;
  }
  // Emit one module per source chunk.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-code-routines.mjs', adapterModule: 'src/source-code-routines-adapters.jsx',
    publicNames: {}, modules: [], contexts: [], lazyImports: [], callSites: [], adapters: [], sharedAdapters: [], hostDifferences: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const lazyAliases = new Map(); // target chunk -> Map(alias -> local)
  for (const pins of Object.values(lazyImports)) for (const [target, alias] of Object.entries(pins)) {
    const src = await readSource(target, cache);
    if (!lazyAliases.has(target)) lazyAliases.set(target, new Map());
    lazyAliases.get(target).set(alias, src.exported.get(alias));
  }
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held' || cls.kind === 'routines-shared') spec = { from: cls.from, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${dep} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(dep);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${dep} resolves two ways`);
        imports.set(dep, { ...spec, via: key });
      }
    }
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      const calleeKey = `${target.file}#${target.local}`;
      const calleeSrc = await readSource(target.file, cache), calleeDecl = calleeSrc.top.get(target.local);
      const isCreateContext = createContextKeys.has(calleeKey)
        || (target.file.startsWith('vendor-frame-') && calleeDecl?.kind === 'var' && /^[\w$]+=[\w$]+\.createContext$/.test(declarationText(calleeSrc, calleeDecl)));
      if (isCreateContext) manifest.contexts.push(`${file}#${local}`);
    }
    const groups = new Map();
    for (const [local, spec] of imports) {
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const blocks = order.map(([local, entry]) => {
      let text = emittedText(src, entry);
      const pins = lazyImports[`${file}#${local}`];
      if (pins) for (const target of Object.keys(pins)) text = text.split(`import("./${target}")`).join(`import("./${moduleName(target)}")`);
      return text;
    });
    let exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const aliases = lazyAliases.get(file);
    if (aliases) {
      for (const alias of aliases.keys()) if (locals.has(alias)) throw Error(`${file}: export alias ${alias} collides with a local`);
      exportText += `\nexport { ${[...aliases].map(([alias, local]) => `${local} as ${alias}`).join(', ')} };`;
    }
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-code-routines.mjs.\n// Edit the extractor or src/source-code-routines-adapters.jsx, never this file.\n`;
    const target = moduleName(file);
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) unboundGlobals.push(`${target}: ${unbound.join(', ')}`);
    files[target] = text;
    manifest.modules.push({
      target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via })),
    });
  }
  if (unboundGlobals.length) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
  const state = new Map();
  const walk = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    const specs = Object.entries(names).map(([local, spec]) => { manifest.publicNames[spec.name] = { file, local }; return `${local} as ${spec.name}`; });
    indexLines.push(`export { ${specs.join(', ')} } from "./${moduleName(file)}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the code-routines roots; generated by extract-code-routines.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals)) {
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
    if (spec.boundary) manifest.hostDifferences.push({ original: `${file}#${local}`, adapter: spec.name, difference: spec.boundary });
  }
  for (const key of [...used.sharedAdapters].sort()) manifest.sharedAdapters.push({ original: key, name: resolved.get(key).name });
  for (const [key, pins] of Object.entries(lazyImports)) for (const [target, alias] of Object.entries(pins))
    manifest.lazyImports.push({ declaration: key, target: moduleName(target), alias });
  for (const site of rawCallSites) {
    const bytes = (await readSource(site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Code routines output set changed: ${present.join(',')}. Run scripts/extract-code-routines.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Code routines source mismatch: ${name}. Run scripts/extract-code-routines.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} code routines modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCodeRoutines({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
