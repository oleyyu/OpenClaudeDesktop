// R4g-routines RT4 (tasks-code-routines WI-4, D32), moved to 3.6556.2 in wave 3 of the 3.6556.2 migration
// (w3-code-routines, research/routines-cowork-chat.md §1.1 / §3.2 / §3.3): extract the Code Routines page (the local CCD
// scheduled task path) without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/code-routines, own scripts/verify-gen-code-routines.mjs).
//
//   cbd6c85c8  Ou, the Code Routines layout (the list hu with its read-failed Retry state (RC-01), the local cards uu / lu,
//              Run now bl / _l and the Routine / Scheduled copy pl / ml, the running-id store yl), and the two lazy local
//              surfaces it mounts: tl (c0243d234, the create page) and rl (cfc18e0f4, the detail).
//   cfc18e0f4  Je EpitaxyLocalRoutineDetail, Xe LocalStatusChip, et SessionRunRow.
//   c0243d234  U EpitaxyLocalRoutineCreatePage, W EpitaxyLocalRoutineFormDialog, K EpitaxyLocalRoutineCreateFormEmbed.
//   c0fd2fda3  all 13 exports: the form state hook hn, the branch picker Dt, the worktree switch Ot, Runs on Ct, and the
//              basics / schedule / permission / model / folder fields. 3.6556.2 moved the old c0efc2620 schedule and
//              model rows to c7b47b35d; c0efc2620 is now the cloud "generate a routine draft" hook (RC-17, an adapter
//              boundary, GrowthBook __gb__2682097403 off, E13).
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk; the bindings of each chunk
// are the reachable closure of the roots across chunks (free variables of each declaration, resolved through import and
// re-export chains to the declaring chunk). A binding resolves, in this order, to: a named host adapter in
// src/source-code-routines-adapters.jsx (its original declaration must carry `features`), an adapter the routines-shared
// graph already answers it with (src/source-routines-shared-adapters.jsx, the same host service), a vendor-frame React
// export (official-3.6556.2.mjs reactAliases, checked with assertVendorAlias; R3), a semantic public name of view-tabs
// (D1/D24/E3: the React Compiler helpers J9 / J1… / K1… come from there), a binding the routines-shared graph holds
// (imported from src/generated/routines-shared/<chunk>.mjs under its original local name, so the contexts that graph
// copied stay one object each), or a copy in this graph's module for its chunk. A vendor binding, a destructuring or
// class declaration, an unpinned dynamic import, or a binding view-tabs holds without a semantic name (D46: name it in
// extract-view-tabs.mjs) stops generation. Features (R2/E5) match the declaration's prettier form as text or through
// looseFeature(); every exported root also pins its export alias.
//
// Unreachable branches on this host are adapter boundaries (null components or constant hooks); each is listed in the
// manifest's `hostDifferences`. The two reachable lazy surfaces keep their original lazy declaration; only the import
// specifier is rewritten to the generated module (`import("./c0243d234-CVQfH8d_.mjs")`), and that module also carries the
// original export alias the declaration's `pick` reads.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/code-routines');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const routinesShared = path.join(root, 'src/generated/routines-shared');
const adapterModule = '../../source-code-routines-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk (cbd6c85c8's Ou is not exported: the
// route chunk exports only route objects, so its features carry the page's own literals).
const roots = {
  'cbd6c85c8-D1xuycDy.js': {
    Ou: { name: 'CodeRoutinesPage', features: ['{ scheduledTaskId: t, onNavigate: n, onOpenSession: r, embedded: o } = e,', 'u = kr(t === Eu),', 'tasksReadFailed: m,', 'onRefetchTasks: h,', 'entryPoint: "code_routines_page",', 'collideWithCodeRoutines: !0,'] },
  },
  'cfc18e0f4-CmiyhJoV.js': {
    Je: { name: 'LocalRoutineDetail', export: 'EpitaxyLocalRoutineDetail', features: ['"data-testid": "host-wait",', '"data-testid": "runs-on",'] },
    Xe: { name: 'LocalStatusChip', export: 'LocalStatusChip', features: ['name: "CheckCircle",', 'className: "text-success",', ': n === "needsInput"'] },
    et: { name: 'SessionRunRow', export: 'SessionRunRow', features: ['{ session: i, isCompletedUnread: a, onClick: o } = t,', '() => o(i.sessionId)'] },
  },
  'c0243d234-CVQfH8d_.js': {
    U: { name: 'LocalRoutineCreatePage', export: 'EpitaxyLocalRoutineCreatePage', features: ['K0($, 0, { kind: "create" })', 'kind: "local",'] },
    W: { name: 'LocalRoutineFormDialog', export: 'EpitaxyLocalRoutineFormDialog', features: ['K1($, 0, i, { kind: "edit", task: i })'] },
    K: { name: 'LocalRoutineCreateFormEmbed', export: 'EpitaxyLocalRoutineCreateFormEmbed', features: ['h = u === void 0 ? "epitaxy" : u,', 'nameCollisionError: m,'] },
  },
  'c0fd2fda3-CntNPbFi.js': {
    hn: { name: 'useLocalRoutineForm', export: 'n', features: ['surface: "code_local",', 'id: "Cox9P9F9a5",'] },
    Dt: { name: 'RoutineBranchField', export: 'c', features: ['? s.formatMessage(Y.noBranches)', ': s.formatMessage(Y.noBranchesMatch),'] },
    Ot: { name: 'RoutineWorktreeToggle', export: 'd', features: ['K0($, 0, n(F, { ...X.worktree }))'] },
    Ct: { name: 'RoutineRunsOnField', export: 'p', features: ['defaultMessage: "{label} (Ant only)",', 'l.formatMessage(X.noMachines)'] },
    Zt: { name: 'RoutineBasicsFields', export: 'r', features: ['c.formatMessage(Q.namePlaceholder)', 'n(F, { ...Q.description })'] },
    Ut: { name: 'RoutineScheduleField', export: 's', features: ['"aria-label": g.formatMessage(X.atTime),', '"aria-label": g.formatMessage(X.cronExpression),'] },
    At: { name: 'RoutinePermissionModeSelect', export: 'u', features: ['s.formatMessage(X.noPermissionModes)'] },
    Qt: { name: 'RoutinePermissionField', export: 'a', features: ['n(u.Header, { children: n(A, { id: "1ty157t" }) })'] },
    Mt: { name: 'RoutineModelSelect', export: 'l', features: ['o.formatMessage(X.noModels)'] },
    $t: { name: 'RoutineModelField', export: 'i', features: ['K1($, 2, s, { model: "", name: s })', 'Q.defaultModel'] },
    Et: { name: 'RoutineFolderField', export: 'f', features: ['{ cwd: o, handleSelectCwd: c, handleBrowseCwd: l, machine: u } = t,'] },
    qt: { name: 'ROUTINE_FORM_MESSAGES', export: 'o', features: ['clearsApprovals: {', 'id: "Ohdw+y7C3b",'] },
    cn: { name: 'clampRoutinePermissionChoice', export: 't', features: [': e === "auto" || e === "bypassPermissions"', '? H(e, t)'] },
  },
};
// Lazy declarations kept with a rewritten specifier: key -> { target chunk: original export alias `pick` reads }.
const lazyImports = {
  'cae55dd08-CqJTQ965.js#f': { 'c0243d234-CVQfH8d_.js': 'EpitaxyLocalRoutineCreateFormEmbed' },
  'cbd6c85c8-D1xuycDy.js#tl': { 'c0243d234-CVQfH8d_.js': 'EpitaxyLocalRoutineCreatePage' },
  'cbd6c85c8-D1xuycDy.js#rl': { 'cfc18e0f4-CmiyhJoV.js': 'EpitaxyLocalRoutineDetail' },
};
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {
  // zustand's React create and its vanilla core (the running-id store yl, the read-state and pending-read stores).
  'vendor-all-0-DXM0MGjZ.js#v': ['v = (e) => (e ? _(e) : _)'],
  'vendor-all-0-DXM0MGjZ.js#_': ['n = (e) => g(t, e);'],
  'vendor-all-0-DXM0MGjZ.js#m': ['m = (e) => (e ? p(e) : p)'],
  'vendor-all-0-DXM0MGjZ.js#p': ['n = new Set(),', 'for (let r of n) r(t, e);'],
  'vendor-all-0-DXM0MGjZ.js#g': ['useSyncExternalStore(', 'e.getInitialState'],
  'vendor-all-0-DXM0MGjZ.js#h': ['h = (e) => e'],
  // zustand's persist middleware and JSON storage (the recent folders store of the folder field, c749529a1).
  'vendor-all-0-DXM0MGjZ.js#ue': ['storage: le(() => window.localStorage),'],
  'vendor-all-0-DXM0MGjZ.js#le': ['getItem: (e) =>'],
  'vendor-all-0-DXM0MGjZ.js#C': ['return n instanceof Promise'],
  'vendor-query-DVJ0goAF.js#nt': ['function nt(e) {\n  return e;\n}'],
  'vendor-query-DVJ0goAF.js#ne': ['return Object.prototype.toString.call(e) === "[object Object]";'],
  // react-query's replaceEqualDeep (the scheduled task list keeps unchanged rows by identity, shared-4 Eg).
  'vendor-query-DVJ0goAF.js#E': ['if (n > 500) return t;'],
  'vendor-query-DVJ0goAF.js#te': ['return Array.isArray(e) && e.length === Object.keys(e).length;'],
  'vendor-query-DVJ0goAF.js#O': ['let t = e.constructor;'],
  'vendor-query-DVJ0goAF.js#ee': ['ee = Object.prototype.hasOwnProperty'],
  // the debounced value hook of the search result announcement (c365fd3fe n).
  'vendor-all-0-DXM0MGjZ.js#pe': ['window.clearTimeout(s.current)'],
};
// Top-level member statements kept with their owner binding (chunk#owner -> features of the statement). A selected
// binding with an unlisted member statement stops generation, so no module tail is dropped silently.
const memberStatements = {
  // Fuse 7.4.0's statics: c2b74c150 `a` reads `t.config.getFn` (search over the Chats page, cd2687f9f / c6a930826).
  'c145fa5ca-_OVos244.js#Q': ['Q.version = "7.4.0"', 'Q.createIndex = A', 'Q.parseIndex = j', 'Q.config = D', 'Q.parseQuery = ie', 'Q.use = function'],
};
// Host services and unreachable boundaries (checked first): chunk -> original local -> { name, features, also, boundary }.
// `boundary` (a host difference) is written to the manifest. Each entry is documented where it is implemented.
const adapterTable = {
  'cbd6c85c8-D1xuycDy.js': {
    // The cloud create page / detail (c1c5fa449 / cd3378dac) behind the cloud routines gate (off): null surfaces.
    el: { name: 'CloudRoutineCreateSurface', features: ['id: "epitaxy_routine_create_form",', 'import("./c1c5fa449-CZAPNWmp.js")'],
      boundary: 'Cloud routine create page (c1c5fa449 EpitaxyRoutineCreatePage): cloud routines are off (D17/D32); a null surface with an inert handle.' },
    nl: { name: 'CloudRoutineDetailSurface', features: ['id: "epitaxy_routine_detail",', 'import("./cd3378dac-BBwl0RB0.js")'],
      boundary: 'Cloud routine detail (cd3378dac EpitaxyRoutineDetail): cloud routines are off; a null surface with an inert handle.' },
    sl: { name: 'CloudRoutineDetail', features: ['a(il, { triggerId: e.triggerId })', 'a(nl.Component, { ...e })'],
      boundary: 'Ou renders sl (remote trigger query il + the cloud detail) only for a remote trigger id with cloud routines on; unreachable, null.' },
    du: { name: 'RoutineTemplatesGrid', features: ['{ createFormIntent: t, scheduledBasePath: n } = e,', 'i.push(`${n}/new?template=${encodeURIComponent(e.id)}`),'],
      boundary: 'Template grid du (c8d777f38 templates, onSelect opens the cloud /new?template= page) is only shown with cloud routines on; null (tasks-code-routines-templates, not-applicable-host).' },
    Kl: { name: 'RoutineScopeTabs', features: ['activateOnFocus: !1,', 'o ? Gl.scheduledTasksView : Gl.routinesView'],
      boundary: 'Yours / Templates scope tabs Kl render only with cloud routines on; null.' },
    __vite__mapDeps: { name: 'viteChunkStylesheets', features: ['"assets/v1/shared-frame-CegduNQ2.css",', '"assets/v1/shared-styles-D_GJawPO.css",'],
      boundary: 'The lazy chunks\' stylesheet preload list (shared-frame / shared-styles CSS) is empty: the host bundles the official styles in its own layer (D2), so the preload helper injects no <link>.' },
  },
  'cae55dd08-CqJTQ965.js': {
    l: { name: 'CloudRoutineCreateFormSurface', features: ['id: "code_routine_create_form",', 'import("./c1c5fa449-CZAPNWmp.js")'],
      boundary: 'Cloud routine create form embed (c1c5fa449): cloud routines are off; a null surface with an inert handle (the list only preloads it).' },
    __vite__mapDeps: { name: 'viteChunkStylesheets', features: ['"assets/v1/shared-frame-CegduNQ2.css",', '"assets/v1/shared-styles-D_GJawPO.css",'],
      boundary: 'The create form embed chunk\'s stylesheet preload list: empty, as for cbd6c85c8 (D2).' },
  },
  'cd1ced056-BUYB9IOz.js': {
    r: { name: 'UpsertScheduledTaskModalSurface', features: ['id: "scheduled_task_upsert_modal",', 'pick: (e) => e.UpsertScheduledTaskModal,'],
      boundary: 'The one-form upsert modal (c97b955f1 La, about 111 KB) opens only when the one-form flow (shared-18 AT) is on; off here, so a null surface with an inert handle and the local c0243d234 form is used (hostGap 17).' },
  },
  'shared-13-DBkfWBVo.js': {
    P: { name: 'SlashCommandChip', features: ['if (o.unresolved) {', 'onChipClick: u,'],
      boundary: 'Slash command chips in the instructions (c32f7beb9 o over the shared-5 Dz catalog): the host has no claude.ai skill / plugin / MCP command catalog, so no chip is ever resolved.' },
  },
  'shared-5-Bg6ZMqvt.js': {
    Dz: { name: 'useSlashCommandCatalog', features: ['{ skills: t } = jc(),', 'source: "mcp",'], boundary: 'The skill / plugin / MCP command catalog (Dz) is empty here; instructions render as plain text.' },
  },
  'shared-104-CTONUSaz.js': {
    ss: { name: 'lazySurface', features: ['let t = co(e.entry),', 'i = e.options.suspense === !0 ? void 0 : e.options.loading,'],
      boundary: 'The tiered lazy loader (shared-104 ss: chunk recovery, load telemetry, overlay hosts) is a React.lazy surface over the same entry.load / pick / options.loading; no tier telemetry or chunk-error recovery (the chunks are in the host bundle).' },
    _A: { name: 'useRemoteTriggerRunRollup', features: ['"/v1/code/sessions?only_trigger_sessions=true&limit=200&exclude_tags=-"', 'latestRunByTriggerId: _,'],
      boundary: 'Cloud trigger session rollup (claude.ai /v1/code/sessions): no cloud routines; empty maps, not loading.' },
  },
  'shared-6-sd9jbJqs.js': {
    AF: { name: 'useEnabledMcpTools', features: ['let i = t?.settings?.enabled_mcp_tools;'],
      boundary: 'The account / session MCP tool selection (AF) is the host core\'s own MCP configuration (hostGap 11): no account tool list here.' },
    EF: { name: 'resolveRunMcpServers', features: ['let a = await gF({ enabledExtensionIds: n, filterFilesystem: !0 }),', 'return { mcpServers: a, remoteMcpServers: o, enabledMcpTools: s };'],
      boundary: 'Run now does not hand MCP servers to the session: the host core loads its own (hostGap 11), so no servers, no remote servers.' },
    sD: { name: 'useLazySurfacePending', features: ['t && e.state !== "loaded" ? aD(e, n) : iD', 'return t && !i;'],
      boundary: 'Pending-while-the-chunk-loads (shared-6 sD) reads the tiered loader\'s handle; the host surfaces load from the local bundle, so never pending.' },
  },
  'shared-78-D5Fw2h0a.js': {
    xD: { name: 'useAccountSettingsSettled', features: ['let e = bD(),', 't = Ar().data !== void 0;'],
      boundary: 'New in 3.6556.2: the auto / bypass permission answers (caf74d8e3 v) read "loading" until the claude.ai account and organization settings have resolved (xD over bD). There is no account here and the permission answers are the host\'s own, so they are settled.' },
    WK: { name: 'useCodeScheduledTasksGate', features: ['t = O("chilling_sloth_clocks"),', 'hE("ccdScheduledTasksEnabled", i);'],
      boundary: 'D32: the local CCD scheduled tasks gate (Claude Code available + chilling_sloth_clocks + onThisDevice + the CCD bridge) is on, over the host scheduler.' },
    wT: { name: 'useWslRoutinesSupported', features: ['return K()?.wslRoutines?.status === "supported";'], boundary: 'WSL routines are not supported here.' },
    yE: { name: 'useCoworkScheduledTasksGate', features: ['hE("coworkScheduledTasksEnabled", t);', 'K0($, 5, { loading: !1, enabled: !0, statusUnknown: !1 })'],
      boundary: 'Cowork scheduled tasks on the Code page (the chat source rows behind the source filter, off): off.' },
  },
  'shared-18-D3y8YMFN.js': {
    OT: { name: 'useUnifiedRoutinesGate', features: ['let e = Ro(C_),', 'return n ? !r && void 0 : t && e === !0;'],
      boundary: 'The unified routines server gate (OT: claude_ai_unified_routines over the account\'s server gate names, behind the one-form flow and the Code / Cowork row merge) is a claude.ai GrowthBook gate; off here (no account, D29/D31).' },
    hb: { name: 'useRoutinesPageBand', features: ['hasFrameShell: e,', 'frameHeader: t,', 'hasDesktopTopBar: n,'],
      boundary: 'The page band (hb over the frame shell / desktop top bar) is the band the host Sessions page uses (code-current sessionsPageBand with no frame shell and a desktop top bar).' },
    IT: { name: 'useLocalRoutinesAvailable', features: ['r = Qg() === !0,', 'return n.enabled === !0 && (!r || a);'],
      boundary: 'Local routines available (shared-18 IT: the CCD gate and no routines policy): true with D32 (no managed policy here).' },
    AT: { name: 'useOneRoutineForm', features: ['let e = kT(),', 'return e === !0 && t && n === !0;'], boundary: 'The one-form flow (AT) is off (GrowthBook, hostGap 17).' },
    IK: { name: 'useOneFormCreate', features: ['return e && n?.createScheduledTask && r', 't.enabled === !0'], boundary: 'One-form create (IK, needs the source filter and AT) is off.' },
    LT: { name: 'useLocalOneFormCreate', features: ['return e && t && !n && !!sn?.createScheduledTask;'], boundary: 'Local one-form create (LT, needs the source filter) is off.' },
    yT: { name: 'useSshHostAllowlist', features: ['n = e ? e.sshHostAllowlist?.value.length === 0 : vT;'],
      boundary: 'No SSH environments here (D31/D37): the SSH host allowlist reads disabled and known.' },
    _T: { name: 'useSshRoutinesSupported', features: ['e.appFeatures?.humbleSky?.status === "supported"'], boundary: 'SSH routines (humbleSky) are not supported here (D37).' },
    AK: { name: 'useCreateWithClaudeSurface', features: ['((r = () => kK(e, t, n, Ra)),', '(i = kK(e, t, n, OK)),'],
      boundary: 'Create with Claude (AK, which surface drafts the routine) is only offered with cloud routines on; reads "cowork" (kK with no hub look).' },
    MK: { name: 'useStartDraftConversation', features: ['typeof t == "string" ? e(t, n) : e(t.text, n, { delivery: t.delivery });'],
      boundary: 'Starting a chat draft for Create with Claude (MK over dK) is unreachable (cloud routines off); a no-op callback.' },
    gK: { name: 'createWithClaudePrompt', features: ['return hK(e, fK.create, { kind: t });'], boundary: 'The Create with Claude prompt (gK) is unreachable; an empty prompt.' },
  },
  'shared-11-_AVGLHEz.js': {
    Fs: { name: 'useRoutinesDisabledByPolicy', features: ['return Ps().disabledByPolicy;'], boundary: 'No managed routines policy here: not disabled.' },
    km: { name: 'useIsGitRepo', features: ['return Am(e, t).isGitRepo;'], boundary: 'Whether the folder is a Git repository comes from the host workspace-info service (real git); undefined while unknown.' },
  },
  'shared-4-DUB1Oi0O.js': {
    UD: { name: 'useEnsureToolsReady', features: ['() => (zc() ? Promise.resolve() : Fc(e))'],
      boundary: 'MCP bootstrap wait (UD): the host core manages its MCP servers; nothing to wait for.' },
    jg: { name: 'useCoworkLocalWithheld', features: ['{ orgAvailable: e, localDisabledByPolicy: t } = _i(),', 'c = e ? s && !t && !i : !(i && s && !t),'],
      boundary: 'The Cowork-served / local-withheld check (jg: org availability, Cowork verdict) only matters with the source filter on; not served, not withheld.' },
    Bh: { name: 'remoteRoutineDeleteBody', features: ['return Jn().routines.delete_removes_runs'],
      boundary: 'The remote routine delete body (Bh reads the account bootstrap routines config) is only used for remote rows; there are none, so it answers the plain body.' },
  },
  'shared-1-BJhqMmkf.js': {
    bD: { name: 'useCanManageRemoteTrigger', features: ['t = VE().viaCoworkShim;', '(n) => yD(n, e, t)'],
      boundary: 'Whether a remote trigger can be managed (bD, account + Cowork shim): there are no remote rows; without the shim the original yD answers yes.' },
    eO: { name: 'useRemoteTriggers', features: ['persistentSessionId: n,', 'includeSessionBoundOneShots: a,'], boundary: 'Cloud triggers query (claude.ai /v1/code/triggers): no cloud routines; no data, not loading.' },
  },
  'c2bdcaf28-CnUOdpb8.js': {
    m: { name: 'useWebhookTriggers', features: ['r = n.enabled && (e?.enabled ?? !0),'], boundary: 'Cloud webhook triggers query (/v1/code/webhook-triggers): none.' },
  },
  'c735530ca-Fi6j0fzb.js': {
    o: { name: 'useRoutineProjects', features: ['{ projects: f } = n(d),'], boundary: 'Claude projects for chat routine rows (claude.ai projects): none.' },
  },
  'cf50036ec-ziWdNZkB.js': {
    A: { name: 'useBypassPermissionsAvailability', features: ['a = t && r === !0 && (n.settingsResolveFailed || n.settingsUnverified);'],
      boundary: 'Bypass permissions availability (cf50036ec A: account / org / managed settings signals) is the host\'s bypass mode availability; never unverified.' },
  },
  'c201cd217-kSkSzp_R.js': {
    r: { name: 'SshFolderBrowserSurface', features: ['id: "epitaxy_ssh_folder_browser",', 'pick: (e) => e.FolderBrowserModal,'],
      boundary: 'The SSH folder browser (FolderBrowserModal) only opens for an SSH place: none here (D37); a null surface.' },
  },
  'c0efc2620-BbVUZz1E.js': {
    p: { name: 'useGenerateRoutineDraft', features: ['/dust/generate_routine_draft'], boundary: 'RC-17: routine auto-drafting (claude.ai generate_routine_draft, GrowthBook __gb__2682097403, E13) is off; no draft generator.' },
  },
  'shared-0-DDOOdL6P.js': {
    oC: { name: 'FileSystem', features: ['oC = globalThis["claude.web"]?.FileSystem'], boundary: 'window["claude.web"].FileSystem: only browseFolder (the host folder picker) is provided.' },
    xC: { name: 'CCDScheduledTasks', features: ['xC = globalThis["claude.web"]?.CCDScheduledTasks'],
      boundary: 'window["claude.web"].CCDScheduledTasks is the host bridge over the local-routines service (list / create / update / status), registered by the page; removeApprovedPermission and getScheduledTaskFileContent are absent (hostGaps 5, 7).' },
    pC: { name: 'LocalSessions', features: ['pC = globalThis["claude.web"]?.LocalSessions'],
      boundary: 'window["claude.web"].LocalSessions is the host\'s: start (Run now through the host scheduler, hostGap 6), getLocalBranches (real git) and the recent-folder reads (getAll / getDetectedProjects / onOnEvent) when the page provides them; the SSH / WSL / trust / start-target methods are absent.' },
  },
  'shared-2-TF8v67kg.js': {
    OX: { name: 'useLoadTelemetry', features: ['treePrefetchObservedAtEpochMs'], boundary: 'Page load telemetry (OX): nothing is sent (D17).' },
  },
  'shared-8-Db1QN4mf.js': {
    mT: { name: 'remoteConnectorToolWords', features: ['if (n?.server.type !== "remote") return;', 't.startsWith("mcp__") ? [t.slice(5), "__"] : [t, ":"],'],
      boundary: 'RC-07: an approved MCP tool of a remote (claude.ai) connector is named after its connector (mT over the account\'s remote servers, hashed URL claims). There are no remote connectors and no per-routine approvals here (hostGap 7): no connector words, so the plain "Remove approval for {tool}" copy.' },
    og: { name: 'ccdSessionsStore', features: ['name: "ccd-sessions-filter",', 'archivedRowsPending: !1,'],
      boundary: 'The CCD sessions store (shared-8 og) is a host store the page fills from its own sessions (scheduledTaskId from session metadata / runs); the persisted project filter is not used here.' },
    hK: { name: 'useAutoModeAvailability', features: ['i = Ui("claude_code_desktop_auto_permissions"),', 'u = s?.disableAutoMode?.value === "disable",'],
      boundary: 'Auto mode availability (hK: GrowthBook rollout, Claude model list, device managed settings) is a host permission mode that is always offered: available.' },
    iy: { name: 'useManagedPermissionSettings', features: ['K2($, 0, t, e, { workspacePath: e, sshConfig: t })'],
      boundary: 'Managed settings for a folder (iy over the desktop resolveLocalSettings bridge): none here, settled, so no managed default permission mode.' },
  },
  'shared-16-ByfgAyLr.js': {
    qo: { name: 'useIsFocusedExtraPane', features: ['Math.min(r.focusedIndex, r.extraPanesByMode[t]?.length ?? 0) === e,'],
      boundary: 'The detail is not hosted in an extra split pane here (the routines page is a main section): never the focused extra pane.' },
  },
  'shared-25-DOWZRSlq.js': {
    Rs: { name: 'useDynamicConfig', features: ['as(r, i, a, n, t, { type: "dynamic_config", name: e })'],
      boundary: 'GrowthBook dynamic configs (Rs, e.g. claudeai_mcp_bootstrap_wait) are not served here: the caller\'s default value.' },
  },
  'vendor-zod-fszujTq6.js': {
    Ks: { name: 'zodNumber', features: ['return ta(Gs, e);'], boundary: 'The zod number schema Run now hands useDynamicConfig is never consulted (no dynamic configs): an inert schema.' },
  },
  'shared-182-BI1KJccu.js': {
    PV: { name: 'useCliFloorForModel', features: ['(n) => _V(t ?? bV, n, e)'], boundary: 'No Claude Code CLI version floor here (hostGap 11).' },
  },
  'c06cf64bb-CdJdJuVd.js': {
    iD: { name: 'spawnedFreshStore', features: ['protocolHandlers: r', '.getState().clearSession(t),'],
      boundary: 'The live session runtime store (c06cf64bb iD) is the host transcript engine; Run now only marks a started session spawned-fresh, a no-op here (hostGap 11).' },
  },
  'shared-156-BLTosN8U.js': {
    iw: { name: 'useToolCatalogState', features: ['return X(rw);'], boundary: 'The MCP tool catalog store (iw) names approved tools; no per-routine approvals here (hostGap 7): no catalog.' },
    Cw: { name: 'lookupCatalogTool', features: ['return r?.toolsEnumerated === !1 && n !== "forLabel" ? void 0 : r;'], boundary: 'Catalog lookup for an approved tool: none (hostGap 7).' },
  },
  'shared-7-DBAgAi5H.js': {
    Nv: { name: 'useBillingNotSelfManageable', features: ['let e = et(),', 'return e && !t;'], boundary: 'No billing here: not self-manageable is false.' },
    Hk: { name: 'ConnectorFavicon', features: ['"data-testid": "connector-icon-globe-fallback",'],
      boundary: 'MCP connector favicons (Hk, public suffix lookup chunk cd668e25e) for approved tools: no per-routine approvals here (hostGap 7), so none is drawn.' },
    lw: { name: 'EffortControlSlot', features: ['import("./c8e04f916-39YFkTtR.js")', 'default: e?.EffortControl ?? uw'],
      boundary: 'The lazily loaded effort slider (c8e04f916 EffortControl) is not migrated: the routine keeps the host core\'s effort option.' },
  },
  'ce2cf86ad-DV2C6-s-.js': {
    I: { name: 'useEnsureWorkspaceTrust', features: ['async (t, n, r) => (await e(t, n, r)) === "accepted"'],
      boundary: 'No workspace trust dialog here (hostGap 10): the folder was approved when the routine was saved; a folder missing at run time is the main process\'s cwd_not_found.' },
    U: { name: 'useStartLocalSession', features: ['let n = i?.start;', 'let { remote: r, attachments: a, ...o } = t,'],
      boundary: 'startLocalSession runs the routine through the host scheduler (local-routines run): the <scheduled-task> message, MCP servers and permission mode are the scheduler\'s own (hostGaps 5, 6); a launch failure rejects with the category suffix.' },
  },
  'c30c42d34-B0SRB643.js': {
    f: { name: 'refetchWhenOnline', features: ['let t = e().then((e) => e.isError);', 'return c.isOnline() ? t : Promise.resolve(!0);'],
      boundary: 'New in 3.6556.2: Retry after a failed task read (c30c42d34 f) refetches only while react-query\'s onlineManager is online. The host has no QueryClient or online manager and reads the local scheduler, so it always refetches.' },
  },
  'shared-52-uHFNjl7C.js': {
    JO: { name: 'accountBootstrapConfig', features: ['return KO(UO(dr(), e), !er(), e ? CO() : void 0);'],
      boundary: 'The account bootstrap config (JO: permission_modes, routines flags) is not served here (no account): an empty config.' },
  },
  'vendor-query-DVJ0goAF.js': {
    tt: { name: 'useHostQuery', features: ['return et(e, U, t);'],
      boundary: 'react-query useQuery (the branch list cc233fde2, the WSL distributions of Runs on, the folder browser c6a930826) runs over a small host query cache (queryKey / queryFn / enabled / staleTime / select); the host has no QueryClient, so no retries, window-focus refetch or garbage collection.' },
  },
};

// Pinned on the minified bytes (each must occur exactly once; `{ loose }` through looseFeature).
const rawCallSites = [
  { source: 'cbd6c85c8-D1xuycDy.js', role: 'Ou dispatches the local create page on "new-local"; the detail data layer opens a local routine; Run now refuses without LocalSessions.start and starts the session as a manual scheduled task start',
    features: ['Eu="new-local"', 'code_routine_open', 'CCD scheduled task Run now skipped: LocalSessions.start bridge unavailable', 'scheduledTaskManualStart:!0'] },
  { source: 'cbd6c85c8-D1xuycDy.js', role: 'The two reachable lazy surfaces (local create page, local detail)',
    features: ['id:"epitaxy_local_routine_create_form"', 'id:"epitaxy_local_routine_detail"'] },
  { source: 'cfc18e0f4-CmiyhJoV.js', role: 'Local routine detail: the empty Always allowed line and Run now',
    features: ['Q8Ygr2drci', 'tnnK1JFUSw'] },
  { source: 'c0243d234-CVQfH8d_.js', role: 'The create form embed gates trust with its own id', features: ['routine-dialog-trust-gate'] },
  { source: 'c0fd2fda3-CntNPbFi.js', role: 'The branch picker empty states (cov1-03), Runs on "(Ant only)" and its filter, the reserved name check',
    features: ['ndHh/LVykO', 'filterRunsOn', 'Cox9P9F9a5'] },
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
  // Top-level statements that only assign members of one binding (`Q.version="7.4.0",Q.config=D,…`): they belong to
  // that binding and are emitted with it (memberStatements pins each one).
  const members = new Map();
  for (const node of ast.program.body) {
    if (node.type !== 'ExpressionStatement') continue;
    const exprs = node.expression.type === 'SequenceExpression' ? node.expression.expressions : [node.expression];
    const owners = new Set(exprs.map(e => (e.type === 'AssignmentExpression' && e.left.type === 'MemberExpression' && e.left.object.type === 'Identifier' ? e.left.object.name : null)));
    const [owner] = owners;
    if (owners.size !== 1 || !owner || !top.has(owner)) continue;
    if (!members.has(owner)) members.set(owner, []);
    members.get(owner).push({ kind: 'statement', owner, node });
  }
  const record = { name, bytes, code, ast, exported, top, members, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
// A member statement's free variables that are top-level bindings of its chunk (the owner included).
function statementDeps(src, entry) {
  if (src.deps.has(entry)) return src.deps.get(entry);
  const ast = babel.babelParse(declarationText(src, entry), `${src.name}#${entry.owner}.members`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => src.top.has(n));
  src.deps.set(entry, deps);
  return deps;
}
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
// R2/E5: a feature is the declaration's text (whitespace-insensitive) or, failing that, its looseFeature() pattern.
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
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
  const manifest = label === 'view-tabs' ? await viewTabsManifestFor(referenceVersion) : label === 'routines-shared' ? await routinesSharedManifestFor(referenceVersion) : JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
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
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

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
    } else if (file === official.vendorFrame && !vt.published.has(key) && reactAlias(src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
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
    const statements = src.members.get(local) ?? [];
    if (statements.length) {
      const pins = memberStatements[key];
      if (!pins) throw Error(`${key} has top-level member statements (${declarationText(src, statements[0]).slice(0, 80)}); pin them in memberStatements`);
      const text = (await Promise.all(statements.map(s => format(declarationText(src, s), { parser: 'babel' })))).join('\n');
      assertFeatures(`member statements of ${key}`, text, pins);
    }
    for (const dep of [...declarationDeps(src, local), ...statements.flatMap(s => statementDeps(src, s))]) {
      if (dep === local) continue;
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
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      try { assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features); }
      catch (error) { if (!survey) throw error; problems.push(error.message); }
      if (survey && !spec.features.length) problems.push(`root ${file}#${local} has no features`);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  for (const key of Object.keys(memberStatements)) {
    const [file, local] = key.split('#');
    if (!chunks.get(file)?.has(local)) { if (!survey) throw Error(`member statements of ${key} are not reached; remove them`); problems.push(`unreached member statements ${key}`); }
  }
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
    // The selected bindings' member statements, emitted in source order between the declarations.
    const statements = [...locals].flatMap(l => (src.members.get(l) ?? []).map(s => [l, s]));
    const blocksInOrder = [...order, ...statements].sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local, entry] of blocksInOrder) {
      for (const dep of entry.kind === 'statement' ? statementDeps(src, entry) : declarationDeps(src, local)) {
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
    const blocks = blocksInOrder.map(([local, entry]) => {
      if (entry.kind === 'statement') return declarationText(src, entry);
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
      ...(statements.length ? { memberStatements: statements.map(([owner, entry]) => ({ owner, sha256: sha(declarationText(src, entry)) })) } : {}),
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
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
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
