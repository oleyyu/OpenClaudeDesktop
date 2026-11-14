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
//
// Two source contracts, two outputs (region batch 3 of the 4.16336.0 migration, region-plan cutover):
//   3.6556.2   src/generated/code-routines: the production graph, over view-tabs and routines-shared. 12 generated areas
//              that are still 3.6556.2 (region-plan cutover.oldConsumersAtGeneration, `legacyConsumers` below) import its
//              chunk modules by original identity, so it stays on 3.6556.2, byte for byte, until they move (not before
//              batch 11).
//   4.16336.0  src/generated/code-routines-v4: the same semantic roots cut from the frozen 4.16336.0 snapshot, linking the
//              shared CDS graph cds-core (sharedGraph 'cds-core') instead of view-tabs and the dependency region's isolated
//              graph routines-shared-v4 (linkedArea) instead of routines-shared. Nothing imports it until the cutover.
//              Each root is the only top-level declaration of its chunk carrying its features (uniqueRoots) and pins its
//              export alias (`export: null`: private). A cds-core publicName is linked (raw declaration hash recorded as
//              linkedSha256); a binding routines-shared-v4 holds is imported from its chunk module under its original
//              local (hash checked, D1: never cut twice) and one it answers with a host adapter gets the same adapter; a
//              binding cds-core holds without a publicName is cut again only when it is pure and hashes the same
//              (heldByCdsCore); module state held that way stops generation (D46, error.stateConflicts; the whole closure is
//              walked first, other failures in error.problems). Raw call sites are proven before that stop. manifest
//              sharedGraphModules / linkedAreaModules / linkedGraphModules pin the bytes of the modules linked, so a
//              regeneration there must be followed by a rerun here and --check.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
// The host adapter module each contract's generated modules import (relative to src/generated/<area>/<chunk>.mjs).
const adapterModuleFor = file => `../../${path.basename(file)}`;
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// region-plan code-routines cutover.oldConsumersAtGeneration: the 3.6556.2 areas that link the production graph.
export const legacyConsumers = Object.freeze(['approval-titles', 'artifact-library', 'chat-knowledge', 'chat-projects', 'code-editor', 'code-transcript',
  'cowork-approval', 'cowork-home', 'sessions-page', 'sidebar-routines', 'transcript-rows', 'turn-plan']);

// ── 3.6556.2: the production graph (unchanged contract, byte-identical output) ──────────────────────────────────────
const legacy = (() => {
  const official = official3;
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
    // W14-code global (shared-08): c165c93f1 ie, the Code workspace trust dialog ("Trust this workspace?" CFLhTeXdtP, "Trust
    // workspace" 0L2liwSugy; the session trust gate c516e93ca T mounts it), which the host's folder-trust notice opens.
    'c165c93f1-DO0V7qMe.js': {
      // ie is `memo(ne)`; ne carries the dialog (data-testid "trust-dialog-rows", initialFocus "cancel", confirmLabel V).
      ie: { name: 'WorkspaceTrustDialog', export: 'n', features: ['ie = i(ne)'] },
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
    // W14-code r7 css7-branch-picker-bl: cd2687f9f `export{k as i,we as n,…}` — the searchable pill select cc43287c9 imports
    // as bL (`import{i as yL,n as bL}from"./cd2687f9f-BuSCKovQ.js"`) and renders for Dle's "Branch to start from" chip; the
    // composer's classic context row renders it (source-composer.jsx, the branch / worktree pill inlined in its context row). c0fd2fda3 already reaches both.
    'cd2687f9f-BuSCKovQ.js': {
      we: { name: 'SearchablePillSelect', export: 'n', features: ['disabledWrapperClassName: De,', 'triggerChildren: M,', '"group/pill-popup flex flex-col max-h-[min(360px,var(--available-height))]",'] },
      k: { name: 'identityItemLabel', export: 'i', features: ['return e;'] },
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

  return { official, output: path.join(root, 'src/generated/code-routines'), adapterFile: 'src/source-code-routines-adapters.jsx', sharedGraph: 'view-tabs', linkedArea: 'routines-shared',
    roots, lazyImports, vendorCopies, memberStatements, adapterTable, rawCallSites, allowedGlobals };
})();

// ── 4.16336.0: the isolated graph (region-plan cutover), linking cds-core and routines-shared-v4 ──────────────────────
const target4 = (() => {
  const official = official4;
  const roots = {
    'cbd6c85c8-CxDdK_2w.js': {
      Fd: { name: 'CodeRoutinesPage', export: null, features: ['{ scheduledTaskId: t, onNavigate: n, onOpenSession: r, embedded: o } = e,', 'tasksReadFailed: m,', 'onRefetchTasks: h,', 'entryPoint: "code_routines_page",', 'collideWithCodeRoutines: !0,'] },
    },
    'cfc18e0f4-C_rkZ1o0.js': {
      W: { name: 'LocalRoutineDetail', export: 'EpitaxyLocalRoutineDetail', features: ['"data-testid": "host-wait",', '"data-testid": "runs-on",'] },
      Qe: { name: 'LocalStatusChip', export: 'LocalStatusChip', features: ['name: "CheckCircle",', 'className: "text-success",', ': n === "needsInput"'] },
      nt: { name: 'SessionRunRow', export: 'SessionRunRow', features: ['{ session: i, isCompletedUnread: a, onClick: o } = t,', '() => o(i.sessionId)'] },
    },
    'c0243d234-B8DSow5L.js': {
      H: { name: 'LocalRoutineCreatePage', export: 'EpitaxyLocalRoutineCreatePage', features: ['K0($, 0, { kind: "create" })', 'kind: "local",'] },
      U: { name: 'LocalRoutineFormDialog', export: 'EpitaxyLocalRoutineFormDialog', features: ['K1($, 0, i, { kind: "edit", task: i })'] },
      // K renders the form q (which carries the same props) and wraps it in the epitaxy root unless "unified".
      K: { name: 'LocalRoutineCreateFormEmbed', export: 'EpitaxyLocalRoutineCreateFormEmbed', features: ['h = u === void 0 ? "epitaxy" : u,', 'nameCollisionError: m,', 'return h === "unified"'] },
    },
    // L is `memo(F)`; F carries the dialog (its copy is pinned in rawCallSites).
    'c165c93f1-i318VRjY.js': {
      L: { name: 'WorkspaceTrustDialog', export: 't', features: ['var L = i(F);'], reads: ['c165c93f1-i318VRjY.js#F'] },
    },
    'c0fd2fda3-CulNgT2Q.js': {
      Tn: { name: 'useLocalRoutineForm', export: 'n', features: ['surface: "code_local",', 'id: "Cox9P9F9a5",'] },
      Rt: { name: 'RoutineBranchField', export: 'c', features: ['? s.formatMessage(Y.noBranches)', ': s.formatMessage(Y.noBranchesMatch),'] },
      zt: { name: 'RoutineWorktreeToggle', export: 'd', features: ['K0($, 0, n(F, { ...X.worktree }))'] },
      Pt: { name: 'RoutineRunsOnField', export: 'p', features: ['defaultMessage: "{label} (Ant only)",', 'l.formatMessage(X.noMachines)'] },
      cn: { name: 'RoutineBasicsFields', export: 'r', features: ['c.formatMessage(Q.namePlaceholder)', 'n(F, { ...Q.description })'] },
      $t: { name: 'RoutineScheduleField', export: 's', features: ['"aria-label": g.formatMessage(X.atTime),', '"aria-label": g.formatMessage(X.cronExpression),'] },
      Vt: { name: 'RoutinePermissionModeSelect', export: 'u', features: ['s.formatMessage(X.noPermissionModes)'] },
      ln: { name: 'RoutinePermissionField', export: 'a', features: ['n(u.Header, { children: n(A, { id: "1ty157t" }) })'] },
      Ut: { name: 'RoutineModelSelect', export: 'l', features: ['o.formatMessage(X.noModels)'] },
      // un and Ut have the same shape; un reads this chunk's Q messages (Ut reads X).
      un: { name: 'RoutineModelField', export: 'i', features: ['K1($, 2, s, { model: "", name: s })', 'Q.defaultModel'], reads: ['c0fd2fda3-CulNgT2Q.js#Q'] },
      Lt: { name: 'RoutineFolderField', export: 'f', features: ['{ cwd: o, handleSelectCwd: c, handleBrowseCwd: l, machine: u } = t,'] },
      rn: { name: 'ROUTINE_FORM_MESSAGES', export: 'o', features: ['clearsApprovals: {', 'id: "Ohdw+y7C3b",'] },
      vn: { name: 'clampRoutinePermissionChoice', export: 't', features: [': e === "auto" || e === "bypassPermissions"', '? H(e, t)'] },
    },
    'cd2687f9f-C1jtsRvF.js': {
      Me: { name: 'SearchablePillSelect', export: 'n', features: ['disabledWrapperClassName: De,', 'triggerChildren: M,', '"group/pill-popup flex flex-col max-h-[min(360px,var(--available-height))]",'] },
      A: { name: 'identityItemLabel', export: 'i', features: ['function A(e) {\n  return e;\n}'] },
    },
  };
  // Lazy declarations kept with a rewritten specifier: key -> { target chunk: original export alias `pick` reads }.
  const lazyImports = {
    'cae55dd08-DePgBnl2.js#f': { 'c0243d234-B8DSow5L.js': 'EpitaxyLocalRoutineCreateFormEmbed' },
    'cbd6c85c8-CxDdK_2w.js#iu': { 'c0243d234-B8DSow5L.js': 'EpitaxyLocalRoutineCreatePage' },
    'cbd6c85c8-CxDdK_2w.js#ou': { 'cfc18e0f4-C_rkZ1o0.js': 'EpitaxyLocalRoutineDetail' },
  };
  // Pure vendor declarations this graph may copy (chunk#local -> features).
  const vendorCopies = {
    'vendor-all-0-uUCo-eCX.js#v': ['v = (e) => (e ? _(e) : _)'],
    'vendor-all-0-uUCo-eCX.js#_': ['n = (e) => g(t, e);'],
    'vendor-all-0-uUCo-eCX.js#m': ['m = (e) => (e ? p(e) : p)'],
    'vendor-all-0-uUCo-eCX.js#p': ['n = new Set(),', 'for (let r of n) r(t, e);'],
    'vendor-all-0-uUCo-eCX.js#g': ['useSyncExternalStore(', 'e.getInitialState'],
    'vendor-all-0-uUCo-eCX.js#h': ['h = (e) => e'],
    'vendor-all-0-uUCo-eCX.js#fe': ['storage: ue(() => window.localStorage),'],
    'vendor-all-0-uUCo-eCX.js#ue': ['getItem: (e) =>'],
    'vendor-all-0-uUCo-eCX.js#de': ['return n instanceof Promise'],
    'vendor-query-Bl2Kfzgk.js#nt': ['function nt(e) {\n  return e;\n}'],
    'vendor-query-Bl2Kfzgk.js#ne': ['return Object.prototype.toString.call(e) === "[object Object]";'],
    'vendor-query-Bl2Kfzgk.js#E': ['if (n > 500) return t;'],
    'vendor-query-Bl2Kfzgk.js#te': ['return Array.isArray(e) && e.length === Object.keys(e).length;'],
    'vendor-query-Bl2Kfzgk.js#O': ['let t = e.constructor;'],
    'vendor-query-Bl2Kfzgk.js#ee': ['ee = Object.prototype.hasOwnProperty'],
    'vendor-all-0-uUCo-eCX.js#De': ['window.clearTimeout(c.current)'],
  };
  // Fuse 7.4.0's statics (c145fa5ca Q; 4.16336.0 also assigns Q.match).
  const memberStatements = {
    'c145fa5ca-_OVos244.js#Q': ['Q.version = "7.4.0"', 'Q.createIndex = A', 'Q.parseIndex = j', 'Q.config = D', 'Q.parseQuery = ie', 'Q.use = function'],
  };
  // The same host services and unreachable boundaries as 3.6556.2 under the same adapter names, each pinned to the
  // 4.16336.0 original it replaces; `boundary` as there. The 4.16336.0 modules import them from
  // src/source-code-routines-v4-adapters.jsx: that module re-exports src/source-code-routines-adapters.jsx and adds the
  // three answers new in 4.16336.0 (useRouterSearchParam, removeSearchParams, useSidebarSectionsStore). A separate module
  // because useSidebarSectionsStore comes from src/source-sidebar-sections-adapters.jsx, which reaches the 3.6556.2
  // code-routines output through sidebar-routines: imported from the 3.6556.2 adapter module it would close an import
  // cycle (that output would evaluate before its adapters are initialised).
  const B = (file, local) => legacy.adapterTable[file][local].boundary;
  const adapterTable = {
    'cbd6c85c8-CxDdK_2w.js': {
      ru: { name: 'CloudRoutineCreateSurface', features: ['id: "epitaxy_routine_create_form",', 'import("./c1c5fa449-CX2iJ-yl.js")'], boundary: B('cbd6c85c8-D1xuycDy.js', 'el') },
      au: { name: 'CloudRoutineDetailSurface', features: ['id: "epitaxy_routine_detail",', 'import("./cd3378dac-U5PU3tsK.js")'], boundary: B('cbd6c85c8-D1xuycDy.js', 'nl') },
      uu: { name: 'CloudRoutineDetail', features: ['a(su, { triggerId: e.triggerId })', 'a(au.Component, { ...e, openEditRequest: t })'], boundary: B('cbd6c85c8-D1xuycDy.js', 'sl') },
      _d: { name: 'RoutineTemplatesGrid', features: ['{ createFormIntent: t, scheduledBasePath: n } = e,', 'i.push(`${n}/new?template=${encodeURIComponent(e.id)}`),'], boundary: B('cbd6c85c8-D1xuycDy.js', 'du') },
      Qu: { name: 'RoutineScopeTabs', features: ['activateOnFocus: !1,', 'o ? Ju.scheduledTasksView : Ju.routinesView'], boundary: B('cbd6c85c8-D1xuycDy.js', 'Kl') },
      __vite__mapDeps: { name: 'viteChunkStylesheets', features: ['"assets/v1/shared-frame-BRemtw6F.css",'], boundary: B('cbd6c85c8-D1xuycDy.js', '__vite__mapDeps') },
    },
    'cae55dd08-DePgBnl2.js': {
      l: { name: 'CloudRoutineCreateFormSurface', features: ['id: "code_routine_create_form",', 'import("./c1c5fa449-CX2iJ-yl.js")'], boundary: B('cae55dd08-CqJTQ965.js', 'l') },
      __vite__mapDeps: { name: 'viteChunkStylesheets', features: ['"assets/v1/shared-frame-BRemtw6F.css",'], boundary: B('cae55dd08-CqJTQ965.js', '__vite__mapDeps') },
    },
    'cd1ced056-C3u39bl_.js': {
      r: { name: 'UpsertScheduledTaskModalSurface', features: ['id: "scheduled_task_upsert_modal",', 'pick: (e) => e.UpsertScheduledTaskModal,'], boundary: B('cd1ced056-BUYB9IOz.js', 'r') },
    },
    'shared-60-DmOyT7JJ.js': {
      De: { name: 'SlashCommandChip', features: ['if (o.unresolved) {', 'onChipClick: u,'], boundary: B('shared-13-DBkfWBVo.js', 'P') },
    },
    'shared-33-DtdykY0y.js': {
      Tq: { name: 'useSlashCommandCatalog', features: ['source: "mcp",'], boundary: B('shared-5-Bg6ZMqvt.js', 'Dz') },
    },
    'shared-123-1Hc1RTKl.js': {
      W$: { name: 'lazySurface', features: ['let t = Wo(e.entry),', 'i = e.options.suspense === !0 ? void 0 : e.options.loading,'], boundary: B('shared-104-CTONUSaz.js', 'ss') },
      fR: { name: 'useCodeScheduledTasksGate', features: ['t = V("chilling_sloth_clocks"),', 'hE("ccdScheduledTasksEnabled", i);'], boundary: B('shared-78-D5Fw2h0a.js', 'WK') },
      Rv: { name: 'useWslRoutinesSupported', features: ['return K()?.wslRoutines?.status === "supported";'], boundary: B('shared-78-D5Fw2h0a.js', 'wT') },
      xC: { name: 'useAccountSettingsSettled', features: ['let e = bC(),', 't = St().data !== void 0;'], boundary: B('shared-78-D5Fw2h0a.js', 'xD') },
      By: { name: 'useCoworkScheduledTasksGate', features: ['hE("coworkScheduledTasksEnabled", t);', 'K0($, 5, { loading: !1, enabled: !0, statusUnknown: !1 })'], boundary: B('shared-78-D5Fw2h0a.js', 'yE') },
    },
    'shared-92-BOgyxePb.js': {
      G$: { name: 'useRemoteTriggerRunRollup', features: ['"/v1/code/sessions?only_trigger_sessions=true&limit=200&exclude_tags=-"', 'latestRunByTriggerId: _,'], boundary: B('shared-104-CTONUSaz.js', '_A') },
      // New in 4.16336.0: the page's Show in sidebar toggle (shared-20 Mj -> jj -> shared-39 _m / gm: `[X(vm), gm]`, the
      // Routines section's shown flag and its setSectionView writer) reads Y (exported qg), the persisted sidebar store.
      // cds-core wave 8 (W8-M4 / W8-M7, cds-wave8/design/plan.json frameStoreY): cds-core owns Y (store_shared92_Y, persisted as
      // the official "dframe-store"); this graph links it (D1: one instance) instead of answering it with the host sections store.
    },
    'shared-6-2QYRw_Wv.js': {
      zy: { name: 'useLazySurfacePending', features: ['t && e.state !== "loaded" ? Ly(e, n) : Iy', 'return t && !i;'], boundary: B('shared-6-sd9jbJqs.js', 'sD') },
    },
    'shared-18-Cfqwgjc5.js': {
      // New in 4.16336.0: dA (the unified routines rollout: false, true, or undefined while unknown) is read by fA (the
      // one-form flow) and, through pA (`dA() !== void 0`), by the page itself. Its first statement returns false when uA
      // (the 3.6556.2 OT gate, the host's useUnifiedRoutinesGate) is false, which it always is here, so dA is answered by
      // the same adapter. uA itself is still read through nA (`uA() === !0`), so it maps to the same adapter by name.
      uA: { name: 'useUnifiedRoutinesGate', features: ['let e = so(Dh),', 'return n ? !r && void 0 : t && e === !0;'], boundary: B('shared-18-D3y8YMFN.js', 'OT') },
      dA: { name: 'useUnifiedRoutinesGate', features: ['let e = uA(),', 'if (e === !1) return !1;', 'if (i) return a && s === !0 ? e : !1;'],
        boundary: `${B('shared-18-D3y8YMFN.js', 'OT')} 4.16336.0 dA (the rollout over that gate, Claude Code web and the cloud routines flag) returns false as soon as the gate is false, so it is the same answer.` },
      vA: { name: 'useLocalRoutinesAvailable', features: ['return n.enabled === !0 && (!r || a);'], boundary: B('shared-18-D3y8YMFN.js', 'IT') },
      fA: { name: 'useOneRoutineForm', features: ['let e = dA(),', 'return e === !0 && t && n === !0;'], boundary: B('shared-18-D3y8YMFN.js', 'AT') },
      QZ: { name: 'useOneFormCreate', features: ['return e && n?.createScheduledTask && r', 't.enabled === !0'], boundary: B('shared-18-D3y8YMFN.js', 'IK') },
      yA: { name: 'useLocalOneFormCreate', features: ['return e && t && !n && !!Gt?.createScheduledTask;'], boundary: B('shared-18-D3y8YMFN.js', 'LT') },
      tA: { name: 'useSshHostAllowlist', features: ['e.sshHostAllowlist?.value.length === 0'], boundary: B('shared-18-D3y8YMFN.js', 'yT') },
      $k: { name: 'useSshRoutinesSupported', features: ['e.appFeatures?.humbleSky?.status === "supported"'], boundary: B('shared-18-D3y8YMFN.js', '_T') },
      KZ: { name: 'useCreateWithClaudeSurface', features: ['((r = () => GZ(e, t, n, Ta)),'], boundary: B('shared-18-D3y8YMFN.js', 'AK') },
      JZ: { name: 'useStartDraftConversation', features: ['typeof t == "string"'], boundary: B('shared-18-D3y8YMFN.js', 'MK') },
      DS: { name: 'useRoutinesPageBand', features: ['hasFrameShell: e,', 'frameHeader: t,', 'hasDesktopTopBar: n,'], boundary: B('shared-18-D3y8YMFN.js', 'hb') },
      MZ: { name: 'createWithClaudePrompt', features: ['return jZ(e, OZ.create, { kind: t });'], boundary: B('shared-18-D3y8YMFN.js', 'gK') },
    },
    'shared-39-ZCs0lAwB.js': {
      Gc: { name: 'useRoutinesDisabledByPolicy', features: ['return Wc().disabledByPolicy;'], boundary: B('shared-11-_AVGLHEz.js', 'Fs') },
      Xg: { name: 'useIsGitRepo', features: ['return Zg(e, t).isGitRepo;'], boundary: B('shared-11-_AVGLHEz.js', 'km') },
    },
    'shared-31-C9BqSSuD.js': {
      eS: { name: 'useEnsureToolsReady', features: ['() => (oi() ? Promise.resolve() : '], boundary: B('shared-4-DUB1Oi0O.js', 'UD') },
      ip: { name: 'useCoworkLocalWithheld', features: ['{ orgAvailable: e, localDisabledByPolicy: t } = Zr(),'], boundary: B('shared-4-DUB1Oi0O.js', 'jg') },
    },
    'shared-4-C_EiQb9h.js': {
      Yh: { name: 'remoteRoutineDeleteBody', features: ['return lc().routines.delete_removes_runs'], boundary: B('shared-4-DUB1Oi0O.js', 'Bh') },
    },
    'shared-1-D1bGaTaN.js': {
      MV: { name: 'useCanManageRemoteTrigger', features: ['.viaCoworkShim;'], boundary: B('shared-1-BJhqMmkf.js', 'bD') },
      fH: { name: 'useRemoteTriggers', features: ['persistentSessionId: n,', 'includeSessionBoundOneShots: a,'], boundary: B('shared-1-BJhqMmkf.js', 'eO') },
    },
    'c2bdcaf28-D-igkpjp.js': { m: { name: 'useWebhookTriggers', features: ['r = n.enabled && (t?.enabled ?? !0),'], boundary: B('c2bdcaf28-CnUOdpb8.js', 'm') } },
    'c735530ca-NgeoG27x.js': { o: { name: 'useRoutineProjects', features: ['c = s === void 0 || s,'], boundary: B('c735530ca-Fi6j0fzb.js', 'o') } },
    'cf50036ec-CBXm08ls.js': { A: { name: 'useBypassPermissionsAvailability', features: ['(n.settingsResolveFailed || n.settingsUnverified)'], boundary: B('cf50036ec-ziWdNZkB.js', 'A') } },
    'c201cd217-RrXbt_bj.js': { r: { name: 'SshFolderBrowserSurface', features: ['id: "epitaxy_ssh_folder_browser",', 'pick: (e) => e.FolderBrowserModal,'], boundary: B('c201cd217-kSkSzp_R.js', 'r') } },
    'c0efc2620-BV-JpwmG.js': { p: { name: 'useGenerateRoutineDraft', features: ['/dust/generate_routine_draft'], boundary: B('c0efc2620-BbVUZz1E.js', 'p') } },
    'shared-0-CnnWnVrT.js': {
      BO: { name: 'FileSystem', features: ['BO = globalThis["claude.web"]?.FileSystem'], boundary: B('shared-0-DDOOdL6P.js', 'oC') },
      tk: { name: 'CCDScheduledTasks', features: ['tk = globalThis["claude.web"]?.CCDScheduledTasks'], boundary: B('shared-0-DDOOdL6P.js', 'xC') },
      qO: { name: 'LocalSessions', features: ['qO = globalThis["claude.web"]?.LocalSessions'], boundary: B('shared-0-DDOOdL6P.js', 'pC') },
    },
    'shared-2-CsjIBQD8.js': { Fq: { name: 'useLoadTelemetry', features: ['treePrefetchObservedAtEpochMs'], boundary: B('shared-2-TF8v67kg.js', 'OX') } },
    'shared-8-BqfCbkJd.js': {
      Pq: { name: 'useAutoModeAvailability', features: ['("claude_code_desktop_auto_permissions"),', 'u = s?.disableAutoMode?.value === "disable",'], boundary: B('shared-8-Db1QN4mf.js', 'hK') },
      BO: { name: 'remoteConnectorToolWords', features: ['if (n?.server.type !== "remote") return;', 't.startsWith("mcp__") ? [t.slice(5), "__"] : [t, ":"],'], boundary: B('shared-8-Db1QN4mf.js', 'mT') },
      // (wave 8b: shared-8 bv, the CCD sessions store, is cds-core's store_shared8_bv (official `bv=fd()(()=>({sessions:[],…`),
      // single holder; the local detail's History reads it from ../cds-core/shared-8.mjs, not the host's ccdSessionsStore.
      // Was: bv: { name: 'ccdSessionsStore', features: ['initialLoadTimedOut: !1,', 'archivedRowsPending: !1,'], boundary: B('shared-8-Db1QN4mf.js', 'og') },)
      px: { name: 'useManagedPermissionSettings', features: ['{ workspacePath: e, sshConfig: t }'], boundary: B('shared-8-Db1QN4mf.js', 'iy') },
    },
    'c06cf64bb-CoZso5N4.js': { vO: { name: 'spawnedFreshStore', features: ['.getState().clearSession(t),'], boundary: B('c06cf64bb-CdJdJuVd.js', 'iD') } },
    'shared-183-B2N6Zy4J.js': {
      GT: { name: 'useToolCatalogState', features: ['return X(WT);'], boundary: B('shared-156-BLTosN8U.js', 'iw') },
      pj: { name: 'removeSearchParams', features: ['t.searchParams.has(r) && (t.searchParams.delete(r), (n = !0));', 'window.history.replaceState(i, "", t.pathname + t.search + t.hash),'],
        boundary: 'New in 4.16336.0 (cbd6c85c8 zu): stripping the handled ?create-routine parameter (shared-183 pj over window.location / history.state and the TanStack search serialisers) acts on the page\'s notional location (the host page\'s replace navigation); true when it was present, as in the original.' },
      dE: { name: 'lookupCatalogTool', features: ['return r?.toolsEnumerated === !1 && n !== "forLabel" ? void 0 : r;'], boundary: B('shared-156-BLTosN8U.js', 'Cw') },
    },
    'shared-7-D2e77H6v.js': {
      Rg: { name: 'useBillingNotSelfManageable', features: ['let e = nn(),', 'return e && !t;'], boundary: B('shared-7-DBAgAi5H.js', 'Nv') },
      ib: { name: 'useEnabledMcpTools', features: ['let i = t?.settings?.enabled_mcp_tools;'], boundary: B('shared-6-sd9jbJqs.js', 'AF') },
      eb: { name: 'resolveRunMcpServers', features: ['filterFilesystem: !0', 'return { mcpServers: a, remoteMcpServers: o, enabledMcpTools: s };'], boundary: B('shared-6-sd9jbJqs.js', 'EF') },
      FI: { name: 'EffortControlSlot', features: ['import("./c8e04f916-DxnnNQyG.js")', 'default: e?.EffortControl ?? II'], boundary: B('shared-7-DBAgAi5H.js', 'lw') },
    },
    'shared-36-fqRFYwOb.js': { Db: { name: 'ConnectorFavicon', features: ['"data-testid": "connector-icon-globe-fallback",'], boundary: B('shared-7-DBAgAi5H.js', 'Hk') } },
    'ce2cf86ad-BYMiwAYw.js': {
      R: { name: 'useEnsureWorkspaceTrust', features: ['async (t, n, r) => (await e(t, n, r)) === "accepted"'], boundary: B('ce2cf86ad-DV2C6-s-.js', 'I') },
      G: { name: 'useStartLocalSession', features: ['let { remote: r, attachments: a, ...o } = t,'], boundary: B('ce2cf86ad-DV2C6-s-.js', 'U') },
    },
    'c30c42d34-CjFge6Ol.js': { l: { name: 'refetchWhenOnline', features: ['let t = e().then((e) => e.isError);', 'return o.isOnline() ? t : Promise.resolve(!0);'], boundary: B('c30c42d34-B0SRB643.js', 'f') } },
    // 4.16336.0 counterparts found by comparing each 3.6556.2 reader with its 4.16336.0 reader (survey SURVEY_DEPS).
    'shared-212-BHMAi0oa.js': { JJ: { name: 'useCliFloorForModel', features: ['(n) => jJ(t ?? PJ, n, e)'], boundary: B('shared-182-BI1KJccu.js', 'PV') } },
    'shared-25-D-aF0gt9.js': {
      is: { name: 'useDynamicConfig', features: ['{ type: "dynamic_config", name: e }'], boundary: B('shared-25-DOWZRSlq.js', 'Rs') },
      // New in 4.16336.0: the Code Routines page opens the create form for `?create-routine=true` (cbd6c85c8 zu): dd reads
      // one search parameter through the TanStack router's parsed search. No TanStack router here: the page's notional
      // search (RoutinesSharedHost, as useSearchParams).
      dd: { name: 'useRouterSearchParam', features: ['{ stringifySearch: t } = ui().options,', '{ select: (n) => Il(ld(n, t)).get(e) ?? void 0 }'],
        boundary: 'New in 4.16336.0 (cbd6c85c8 zu, the ?create-routine=true intent): the TanStack router search parameter (shared-25 dd) is read from the page\'s notional search (RoutinesSharedHost), the host having no TanStack router.' },
    },
    // ...and pj strips those parameters from window.location / history.state (its history-state helper reads the router's
    // search serialisers, vendor-router). Here the page's location is the host's: the parameter is stripped there.
    // cds-core wave 8 (W8-M7): vendor-zod Ks is published by cds-core (zod_vendorzod_Ks, the official schema): linked, no adapter.
    'shared-62-DoCqVpIq.js': { MA: { name: 'accountBootstrapConfig', features: ['return AA(DA(Ce(), e), !tt(), e ? eA() : void 0);'], boundary: B('shared-52-uHFNjl7C.js', 'JO') } },
    'vendor-query-Bl2Kfzgk.js': { tt: { name: 'useHostQuery', features: ['return et(e, U, t);'], boundary: B('vendor-query-DVJ0goAF.js', 'tt') } },
  };
  // The legacy call sites, re-pinned on the 4.16336.0 bytes (each must occur exactly once). Changed in 4.16336.0: the
  // local create intent is Md, the detail's Run now message id is +ZAG46kixX (was tnnK1JFUSw), the create page and the
  // create form embed each carry their own trust gate symbol (W, J), and the workspace trust dialog (c165c93f1 L, a
  // root here) is pinned by its two message ids.
  const rawCallSites = [
    { source: 'cbd6c85c8-CxDdK_2w.js', role: 'Fd dispatches the local create page on "new-local"; the detail data layer opens a local routine; Run now refuses without LocalSessions.start and starts the session as a manual scheduled task start',
      features: ['Md="new-local"', 'code_routine_open', 'CCD scheduled task Run now skipped: LocalSessions.start bridge unavailable', 'scheduledTaskManualStart:!0'] },
    { source: 'cbd6c85c8-CxDdK_2w.js', role: 'The two reachable lazy surfaces (local create page, local detail)',
      features: ['id:"epitaxy_local_routine_create_form"', 'id:"epitaxy_local_routine_detail"'] },
    { source: 'cfc18e0f4-C_rkZ1o0.js', role: 'Local routine detail: the empty Always allowed line and Run now',
      features: ['Q8Ygr2drci', 'runNow:{defaultMessage:"Run now",id:"+ZAG46kixX"}'] },
    { source: 'c0243d234-B8DSow5L.js', role: 'The create page and the create form embed gate trust with their own ids',
      features: ['function W(){return Symbol("routine-dialog-trust-gate")}', 'function J(){return Symbol("routine-dialog-trust-gate")}'] },
    { source: 'c0fd2fda3-CulNgT2Q.js', role: 'The branch picker empty states (cov1-03), Runs on "(Ant only)" and its filter, the reserved name check',
      features: ['ndHh/LVykO', 'filterRunsOn', 'Cox9P9F9a5'] },
    { source: 'c165c93f1-i318VRjY.js', role: 'The workspace trust dialog (L) title and its Trust workspace button', features: ['CFLhTeXdtP', '0L2liwSugy'] },
  ];
  // 4.16336.0 adds the Web Crypto global: caf74d8e3 x (the kept-by-the-desktop-app skill path) reads
  // crypto.randomUUID() in its official declaration (first reached once wave 5b lifted D46 for this graph).
  const allowedGlobals = new Set([...legacy.allowedGlobals, 'crypto']);
  // D1 (cds-integrate wave5b fix): r3b-tasks (4.16336.0 production) holds the shared-212 invisible/hidden character
  // predicates (invisible-character.mjs: j_ M_ yv Cv Dv kv) and exports kv as isHiddenCharacter. The mention escaper this
  // graph cuts (shared-212 Pv / Fv / Iv) reaches only kv, so kv is linked from r3b-tasks (one copy) instead of cutting
  // kv and the five bindings behind it again (r3b-tasks-subtask tasks-05).
  const linkedGraphs = {
    'shared-212-BHMAi0oa.js#kv': { area: 'r3b-tasks', target: 'invisible-character.mjs', exportName: 'isHiddenCharacter' },
  };
  return { official, output: path.join(root, 'src/generated/code-routines-v4'), adapterFile: 'src/source-code-routines-v4-adapters.jsx', sharedGraph: 'cds-core', linkedArea: 'routines-shared-v4', uniqueRoots: true,
    isolatedGraph: { productionOutput: 'src/generated/code-routines', productionSwitchNotBeforeBatch: 11, heldBy: legacyConsumers },
    roots, lazyImports, vendorCopies, memberStatements, adapterTable, rawCallSites, allowedGlobals, linkedGraphs };
})();

export const contracts = Object.freeze({ [official3.referenceVersion]: legacy, [official4.referenceVersion]: target4 });
export const contractVersions = Object.freeze(Object.keys(contracts));

async function readSource(source, name, cache) {
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
// R2/E5: a feature is the declaration's text (whitespace-insensitive) or, failing that, its looseFeature() pattern. A
// feature looseFeature() cannot tokenise (a regex literal holding a quote) is matched as text only.
const looseCache = new Map();
const loose = (official, f) => {
  const key = `${official.referenceVersion}\0${f}`;
  if (!looseCache.has(key)) { let pattern = null; try { pattern = official.looseFeature(f); } catch { /* text only */ } looseCache.set(key, pattern); }
  return looseCache.get(key);
};
const featureHit = (official, text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || !!loose(official, f)?.test(text);
function assertFeatures(official, label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(official, text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// Follow an import (and re-export chains) to the declaring chunk.
async function resolveImport(source, entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(source, file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
// 4.16336.0 root location: the prettier form of every top-level function / identifier declaration of the chunk (the
// whole chunk formatted once), so a root can be proved to be the only declaration carrying its features.
async function chunkDeclarations(src) {
  if (src.declarations) return src.declarations;
  const code = await format(src.code, { parser: 'babel' });
  const out = new Map();
  for (const node of parsers.babel.parse(code, {}).program.body) {
    if (node.type === 'FunctionDeclaration') out.set(node.id.name, code.slice(node.start, node.end));
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) if (d.id.type === 'Identifier') out.set(d.id.name, `var ${code.slice(d.start, d.end)};`);
  }
  src.declarations = out;
  return out;
}
// The resolved bindings ("file#local") a top-level declaration reads directly.
async function readsOf(source, src, name, cache) {
  const out = new Set();
  for (const dep of declarationDeps(src, name)) {
    const entry = src.top.get(dep);
    const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${src.name}#${name}`) : { file: src.name, local: dep };
    out.add(`${target.file}#${target.local}`);
  }
  return out;
}
// 4.16336.0: the root is the only top-level declaration of its chunk that carries every feature and reads every binding
// in `reads` (resolved "file#local"; it tells apart declarations of the same shape over different imports).
async function assertUniqueRoot(official, label, src, name, features = [], { reads = [], source, cache } = {}) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = [];
  for (const [other, text] of await chunkDeclarations(src)) {
    const flat = normalised(text);
    if (!features.every(f => featureHit(official, text, flat, f))) continue;
    if (reads.length) {
      const read = await readsOf(source, src, other, cache);
      if (!reads.every(key => read.has(key))) continue;
    }
    hits.push(other);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration of ${src.name} with its features (${hits.join(', ') || 'none'})`);
}
// 3.6556.2: view-tabs / routines-shared manifests through their compat views (the production contract, unchanged).
async function heldGraph(official, dir, label) {
  const referenceVersion = official.referenceVersion;
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
// sharedGraph 'cds-core' (4.16336.0): the manifest is on this version and snapshot, every module's bytes equal its
// recorded sha256 and its sourceSha256 equals the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName (as extract-routines-shared.mjs / extract-btw-pane.mjs read it).
async function cdsCoreGraph(official, area) {
  const dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const modules = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    modules.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = modules.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, modules, held, published, manifestSha256: sha(manifestBytes) };
}
// linkedArea (4.16336.0): the dependency region's isolated 4.16336.0 graph (routines-shared-v4). Its manifest must be on
// this version and snapshot and itself link the same cds-core manifest; every module's bytes equal its recorded sha256 and
// were cut from the official chunk this generator reads. Its chunk modules export every binding under its original
// local name, so a binding it holds is imported from there (its declaration hash must equal ours) instead of being cut
// a second time (D1), and a binding it answers with a host adapter is answered with the same adapter.
async function linkedAreaGraph(official, area, graph) {
  const dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
  if (manifest.sharedGraph !== graph.area) throw Error(`${area} links ${manifest.sharedGraph}, expected ${graph.area}`);
  for (const [target, digest] of Object.entries(manifest.sharedGraphModules ?? {}))
    if (graph.modules.get(target)?.sha256 !== digest) throw Error(`${area} was generated over another ${graph.area}/${target}; rerun its generator first`);
  const held = new Map(), modules = new Map();
  for (const m of manifest.modules) {
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    if (sha(await fs.readFile(path.join(official.ionSource, m.source))) !== m.sourceSha256) throw Error(`${area}/${m.target} was cut from another ${m.source}`);
    modules.set(m.target, m);
    for (const b of m.bindings) held.set(`${m.source}#${b.name}`, { target: m.target, sha256: b.sha256 });
  }
  const adapted = new Map();
  for (const a of manifest.adapters ?? []) adapted.set(a.original, a.name);
  return { area, held, adapted, modules, contexts: new Set(manifest.contexts ?? []), manifestSha256: sha(manifestBytes) };
}
// D1 (4.16336.0): bindings imported from another 4.16336.0 area by the name it exports (contract.linkedGraphs). Its
// manifest must be on this version and snapshot, the module bytes must equal its recorded sha256, the module must be cut
// from the official chunk this generator reads, and it must hold the binding (hash recorded) and export it by that name.
async function linkedGraphsFor(official, linkedGraphs = {}) {
  const out = new Map();
  for (const [key, link] of Object.entries(linkedGraphs)) {
    const [file, local] = key.split('#');
    const dir = path.join(generatedRoot, link.area);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
      throw Error(`linked ${link.area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
    const m = manifest.modules.find(entry => entry.target === link.target);
    if (!m || path.basename(m.source) !== file) throw Error(`linked ${link.area}/${link.target} is not cut from ${file}`);
    const moduleSha256 = sha(await fs.readFile(path.join(dir, m.target)));
    if (moduleSha256 !== m.sha256) throw Error(`linked ${link.area}/${m.target} differs from its manifest`);
    if (sha(await fs.readFile(path.join(official.ionSource, file))) !== m.sourceSha256) throw Error(`linked ${link.area}/${m.target} was cut from another ${file}`);
    const binding = m.bindings.find(b => (typeof b === 'string' ? b : b.name) === local);
    if (!binding?.sha256) throw Error(`linked ${link.area}/${m.target} does not hold ${key}`);
    if (m.exports?.[local] !== link.exportName) throw Error(`linked ${link.area}/${m.target} does not export ${local} as ${link.exportName}`);
    out.set(key, { ...link, sha256: binding.sha256, moduleSha256 });
  }
  return out;
}
// D1 (4.16336.0): what the other 4.16336.0 graphs under src/generated already cut (file#local -> [area]); cds-core, the
// linked area and this region's own outputs are not counted.
async function otherTargetGraphs(official, own) {
  const out = new Map();
  for (const entry of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || own.has(entry.name)) continue;
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, entry.name, 'manifest.json'), 'utf8')); } catch { continue; }
    if (!Array.isArray(manifest.modules)) continue;
    for (const m of manifest.modules) {
      if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(entry.name);
      }
    }
  }
  return out;
}
// The top-level bindings of a chunk that some code assigns after their declaration (Babel constantViolations).
function writtenBindings(src) {
  if (src.written) return src.written;
  const ast = babel.babelParse(src.code, src.name, false);
  let written;
  babel.traverse(ast, { Program(p) { written = new Set(Object.entries(p.scope.bindings).filter(([, b]) => b.constantViolations.length).map(([n]) => n)); p.stop(); } });
  src.written = written;
  return written;
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-<version>.mjs knows as a React export, or undefined.
const reactAlias = (official, src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];
// Module state a second copy would split (D46 / D1): a module-level WeakMap / Map / Set / WeakSet, a React context, or a
// module-level binding the chunk assigns after its declaration.
async function moduleStateKind(official, source, src, entry, cache) {
  if (entry.kind !== 'var') return null;
  if (writtenBindings(src).has(entry.node.id.name)) return 'module-level binding written after its declaration';
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `module ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    const target = callee?.kind === 'import' ? await resolveImport(source, callee, cache, `${src.name}#${init.callee.name}`) : { file: src.name, local: init.callee.name };
    if (target.file === official.vendorFrame) {
      const vendor = await readSource(source, target.file, cache);
      const alias = reactAlias(official, vendor, target.local);
      if (alias && official.reactAliases[alias]?.[1] === 'createContext') return 'context (createContext)';
    }
  }
  return null;
}

// `version` picks the source contract (default 3.6556.2, the production graph). `contract` (tests only): a variant of a
// source contract, run check-only so it can never write an output folder. `extraAdapters` (tests only, with check):
// merged into the contract's adapter table, so an adapter the closure never reaches stops generation.
// `assumePublished` (survey only, never writes): { "file#local": semanticName } for bindings cds-core holds but has not
// published yet; the survey links them as if they were publicNames, to show what the rest
// of the closure needs once cds-core publishes them (regions/batch3/code-routines cds-core-publication-request.json).
export async function extractCodeRoutines({ check = false, survey = false, extraAdapters = {}, version = official3.referenceVersion, contract: variant, assumePublished = {} } = {}) {
  if (variant && !check && !survey) throw Error('extract-code-routines: a contract variant runs with check: true only');
  if (Object.keys(assumePublished).length && !survey) throw Error('extract-code-routines: assumePublished is a survey option');
  const contract = variant ?? contracts[version];
  if (!contract) throw Error(`extract-code-routines has no ${version} source contract`);
  const { official, output, roots, lazyImports, vendorCopies, memberStatements, adapterTable, rawCallSites, allowedGlobals, adapterFile } = contract;
  const adapterModule = adapterModuleFor(adapterFile);
  const { referenceVersion, referenceSnapshot } = official;
  const source = official.ionSource;
  const cds = contract.sharedGraph === 'cds-core';
  const cache = new Map();
  const adapters = Object.fromEntries([...new Set([...Object.keys(adapterTable), ...Object.keys(extraAdapters)])]
    .map(file => [file, { ...adapterTable[file], ...extraAdapters[file] }]));
  const vt = cds ? null : await heldGraph(official, path.join(generatedRoot, 'view-tabs'), 'view-tabs');
  const graph = cds ? await cdsCoreGraph(official, contract.sharedGraph) : null;
  const rs = cds ? await linkedAreaGraph(official, contract.linkedArea, graph) : await heldGraph(official, path.join(generatedRoot, 'routines-shared'), 'routines-shared');
  const linked = cds ? await linkedGraphsFor(official, contract.linkedGraphs) : new Map();
  const routinesSharedDir = `../${contract.linkedArea}`;
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set() };
  const stateConflicts = [];
  const heldByCdsCore = new Map(); // file -> Set(local) cut again because cds-core holds them without a publicName (pure, same hash)
  const classify = async (key, reachedBy = []) => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(source, file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      if (rs.held.has(key) || vt?.held.has(key)) throw Error(`adapter ${key} replaces a binding another graph holds; import it instead`);
      if (graph && (graph.published.has(key) || graph.held.has(key))) throw Error(`adapter ${key} replaces a binding cds-core holds; import it instead`);
      assertFeatures(official, `adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(official, `adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapted.has(key)) {
      result = { kind: 'shared-adapter', name: rs.adapted.get(key) };
    } else if (graph) {
      // 4.16336.0: one copy of each binding. A cds-core publicName is linked (its declaration must hash as cds-core's); a
      // binding routines-shared-v4 holds is imported from there (same hash); a binding cds-core holds without a
      // publicName is cut again only when it is pure and hashes the same, and module state stops generation (D46).
      const assumed = assumePublished[key] && graph.held.get(key) ? { name: assumePublished[key], target: graph.held.get(key).target, exportName: local } : undefined;
      const shared = graph.published.get(key) ?? assumed, owned = graph.held.get(key), link = linked.get(key), held = rs.held.get(key);
      if (link) {
        if (shared || owned || held) throw Error(`${key} is linked from ${link.area} but ${shared || owned ? 'cds-core' : rs.area} holds it; link that graph`);
        if (!entry || entry.kind === 'import' || sha(declarationText(src, entry)) !== link.sha256) throw Error(`${key} differs from the declaration ${link.area}/${link.target} holds`);
        result = { kind: 'linked-graph', file, area: link.area, target: link.target, name: link.exportName, linkedSha256: link.sha256 };
      } else if (file === official.vendorFrame && !shared && reactAlias(official, src, local)) {
        const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
        result = { kind: 'react', module, name: member };
      } else if (shared) {
        if (isRoot) throw Error(`root ${key} is cds-core ${shared.name}; import it from cds-core instead of rooting it here`);
        if (!entry || entry.kind === 'import') throw Error(`${key} (cds-core ${shared.name}) is not a declaration`);
        if (!owned?.sha256 || owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core publishes as ${shared.name}`);
        result = { kind: 'shared-graph', file, target: shared.target, name: shared.exportName, publicName: shared.name, linkedSha256: owned.sha256 };
      } else if (held) {
        if (isRoot) throw Error(`root ${key} is held by ${rs.area}; import it instead of rooting it here`);
        if (!entry || entry.kind === 'import' || held.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration ${rs.area}/${held.target} holds`);
        result = { kind: 'routines-shared', name: local, from: `${routinesSharedDir}/${held.target}`, linkedSha256: held.sha256 };
      } else if (owned) {
        if (!entry || entry.kind === 'import') throw Error(`${key} (held by cds-core) is not a declaration`);
        const state = await moduleStateKind(official, source, src, entry, cache);
        if (state) {
          stateConflicts.push({ binding: key, heldBy: `${graph.area}/${owned.target}`, kind: state, text: declarationText(src, entry).slice(0, 400), reachedBy: reachedBy.map(k => k.replace(/-[\w-]{8}\.js#/, '#')).join(' <- ') });
          result = { kind: 'problem' };
        } else {
          if (owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core/${owned.target} holds`);
          if (!heldByCdsCore.has(file)) heldByCdsCore.set(file, new Set());
          heldByCdsCore.get(file).add(local);
        }
      } else if (file.startsWith('vendor-frame-')) {
        throw Error(`vendor-frame ${local} (${entry ? declarationText(src, entry).slice(0, 60) : '?'}) is neither a React export nor a cds-core binding`);
      } else if (file.startsWith('vendor-') && !vendorCopies[key]) {
        throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
      }
    } else if (file === official.vendorFrame && !vt.published.has(key) && reactAlias(official, src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
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
    }
    if (!result) {
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
      if (vendorCopies[key]) assertFeatures(official, `vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const trail = key => { const out = []; for (let k = key; k && out.length < 24; k = parent.get(k)) out.push(k); return out.slice(1); };
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key, trail(key)); } catch (error) { if (!survey && !graph) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') {
      const bucket = { adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'shared-graph': 'viewTabs', 'linked-graph': 'viewTabs', 'routines-shared': 'routinesShared' }[cls.kind];
      used[bucket].add(key);
      return;
    }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(source, file, cache);
    const reads = new Set();
    edges.set(key, reads);
    const statements = src.members.get(local) ?? [];
    if (statements.length) {
      const pins = memberStatements[key];
      if (!pins) throw Error(`${key} has top-level member statements (${declarationText(src, statements[0]).slice(0, 80)}); pin them in memberStatements`);
      const text = (await Promise.all(statements.map(s => format(declarationText(src, s), { parser: 'babel' })))).join('\n');
      assertFeatures(official, `member statements of ${key}`, text, pins);
    }
    for (const dep of [...declarationDeps(src, local), ...statements.flatMap(s => statementDeps(src, s))]) {
      if (dep === local) continue;
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, key) : { file, local: dep };
      const depKey = `${target.file}#${target.local}`;
      reads.add(depKey);
      await visit(depKey, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(source, file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && spec.export !== null && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      // 4.16336.0: a root pinned with `export: null` must not be exported (a private root).
      if (spec.export === null && [...src.exported.values()].includes(local)) throw Error(`root ${file}#${local} (${spec.name}) is exported; pin its alias`);
      try {
        assertFeatures(official, `root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
        if (contract.uniqueRoots) await assertUniqueRoot(official, `root ${spec.name}`, src, local, spec.features, { reads: spec.reads, source, cache });
        else if (spec.reads) throw Error(`root ${spec.name}: reads is a uniqueRoots pin`);
      } catch (error) { if (!survey) throw error; problems.push(error.message); }
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
      const src = await readSource(source, target, cache);
      const local = src.exported.get(alias);
      if (!local || !chunks.get(target)?.has(local)) { if (!survey) throw Error(`lazy ${key}: ${target} ${alias} is not in this graph`); problems.push(`lazy ${key}: ${target} ${alias} missing`); }
    }
  }
  for (const key of linked.keys())
    if (!used.viewTabs.has(key)) { if (!survey) throw Error(`linked ${key} is not reached; remove it`); problems.push(`unreached link ${key}`); }
  // E3 (4.16336.0): every React Compiler helper cut again here is the one official.assertCompilerHelpers proves.
  if (graph && official.compilerHelpers) {
    const helperLocals = new Set(Object.values(official.compilerHelpers).map(h => h.local));
    if ([...(chunks.get(official.sharedFrame) ?? [])].some(local => helperLocals.has(local)))
      official.assertCompilerHelpers((await readSource(source, official.sharedFrame, cache)).code);
  }
  // D1 (4.16336.0): the bindings this graph cuts that another 4.16336.0 graph under src/generated also cuts (module
  // state marked). Reported (survey, tests, the region report), not written into the output: those graphs are other
  // areas' staging outputs, and cds-core's fifth wave will take the shared state over.
  const d1 = [];
  if (graph) {
    const others = await otherTargetGraphs(official, new Set([graph.area, rs.area, ...Object.values(contracts).map(c => path.basename(c.output))]));
    for (const [file, locals] of chunks) for (const local of locals) {
      const key = `${file}#${local}`;
      if (heldByCdsCore.get(file)?.has(local) || !others.has(key)) continue;
      const src = await readSource(source, file, cache);
      const state = await moduleStateKind(official, source, src, src.top.get(local), cache);
      d1.push({ binding: key, areas: [...new Set(others.get(key))].sort(), ...(state ? { state } : {}) });
    }
  }

  // Raw call-site pins are checked before the survey returns and before D46 stops generation, so a staging contract
  // whose output cannot be written yet still proves its pins on the official bytes (the emit step below re-reads them).
  for (const site of rawCallSites) {
    const text = (await readSource(source, site.source, cache)).bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count === 1) continue;
      const message = `call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`;
      if (!survey) throw Error(message);
      problems.push(message);
    }
  }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(source, f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const c of stateConflicts) console.log('STATE', JSON.stringify(c));
    if (process.env.SURVEY_D1) for (const c of d1) console.log('D1', JSON.stringify(c));
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    for (const k of (process.env.SURVEY_SHOW ?? '').split(',').filter(Boolean)) { const [f, l] = k.split('#'); const s = await readSource(source, f, cache); console.log('SHOW', k, '\n' + (await featureText(s, s.top.get(l))).split('\n').slice(0, +(process.env.SURVEY_LINES ?? 1e9)).join('\n')); }
    for (const k of (process.env.SURVEY_DEPS ?? '').split(',').filter(Boolean)) {
      const [f, l] = k.split('#'); const s = await readSource(source, f, cache);
      const rows = [];
      for (const dep of declarationDeps(s, l)) {
        const e = s.top.get(dep);
        const t = e.kind === 'import' ? await resolveImport(source, e, cache, k) : { file: f, local: dep };
        const tk = `${t.file}#${t.local}`, c = resolved.get(tk);
        const ts = await readSource(source, t.file, cache), te = ts.top.get(t.local);
        rows.push(`${dep} -> ${tk} [${c?.kind ?? '?'}${c?.name ? ' ' + c.name : ''}] ${te ? declarationText(ts, te).slice(0, +(process.env.SURVEY_WIDTH ?? 140)).replace(/\s+/g, ' ') : ''}`);
      }
      console.log('DEPS', k, '\n  ' + rows.join('\n  '));
    }
    if (process.env.SURVEY_USED) for (const [k, v] of Object.entries(used)) console.log('USED', k, [...v].join(' '));
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    if (graph) console.log('shared-graph links', [...used.viewTabs].length, 'routines-shared links', used.routinesShared.size, 'heldByCdsCore', [...heldByCdsCore.values()].reduce((n, s) => n + s.size, 0), 'd1', d1.length, 'd1 state', d1.filter(d => d.state).length);
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return { problems, stateConflicts, d1, chunks, used, edges, resolved, heldByCdsCore };
  }
  // D46: module state cds-core holds without a semantic name stops generation; nothing is written or checked. A
  // 4.16336.0 contract walks its whole closure first (classification failures are collected, not thrown at the first
  // one), so the error carries every state conflict (error.stateConflicts) and every other failure (error.problems).
  if (stateConflicts.length || problems.length) {
    const parts = [];
    if (stateConflicts.length) parts.push(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`);
    if (problems.length) parts.push(`${problems.length} closure failure(s):\n  ${problems.join('\n  ')}`);
    const error = Error(parts.join('\n'));
    error.stateConflicts = stateConflicts;
    error.problems = problems;
    throw error;
  }
  // Emit one module per source chunk.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-code-routines.mjs', adapterModule: adapterFile,
    ...(graph ? { sharedGraph: graph.area, linkedArea: rs.area, isolatedGraph: contract.isolatedGraph } : {}),
    publicNames: {}, modules: [], contexts: [], lazyImports: [], callSites: [], adapters: [], sharedAdapters: [], hostDifferences: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const sharedTargets = new Set(), rsTargets = new Set();
  const lazyAliases = new Map(); // target chunk -> Map(alias -> local)
  for (const pins of Object.values(lazyImports)) for (const [target, alias] of Object.entries(pins)) {
    const src = await readSource(source, target, cache);
    if (!lazyAliases.has(target)) lazyAliases.set(target, new Map());
    lazyAliases.get(target).set(alias, src.exported.get(alias));
  }
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(source, file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    // The selected bindings' member statements, emitted in source order between the declarations.
    const statements = [...locals].flatMap(l => (src.members.get(l) ?? []).map(s => [l, s]));
    const blocksInOrder = [...order, ...statements].sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local, entry] of blocksInOrder) {
      for (const dep of entry.kind === 'statement' ? statementDeps(src, entry) : declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: cls.from, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'routines-shared') { spec = { from: cls.from, name: cls.name, kind: cls.kind, ...(cls.linkedSha256 ? { linkedSha256: cls.linkedSha256 } : {}) }; if (graph) rsTargets.add(cls.from.slice(routinesSharedDir.length + 1)); }
        else if (cls.kind === 'shared-graph') { spec = { from: `../${graph.area}/${cls.target}`, name: cls.name, kind: cls.kind, linkedSha256: cls.linkedSha256 }; sharedTargets.add(cls.target); }
        else if (cls.kind === 'linked-graph') spec = { from: `../${cls.area}/${cls.target}`, name: cls.name, kind: cls.kind, linkedSha256: cls.linkedSha256 };
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
      const target = calleeEntry.kind === 'import' ? await resolveImport(source, calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      const calleeKey = `${target.file}#${target.local}`;
      const calleeSrc = await readSource(source, target.file, cache), calleeDecl = calleeSrc.top.get(target.local);
      const isCreateContext = createContextKeys.has(calleeKey)
        || (target.file.startsWith('vendor-frame-') && calleeDecl?.kind === 'var' && /^[\w$]+=[\w$]+\.createContext$/.test(declarationText(calleeSrc, calleeDecl)));
      if (isCreateContext) {
        if (graph?.held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context cds-core holds; it must be imported, not copied`);
        manifest.contexts.push(`${file}#${local}`);
      }
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-code-routines.mjs.\n// Edit the extractor or ${adapterFile}, never this file.\n`;
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
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via, ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      ...(graph ? { heldByCdsCore: [...(heldByCdsCore.get(file) ?? [])].sort() } : {}),
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
    const bytes = (await readSource(source, site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  if (graph) {
    // The cds-core and routines-shared-v4 modules this graph links, by bytes (a regeneration there must be followed by a
    // rerun here and --check), and the D1 links to other 4.16336.0 areas.
    manifest.sharedGraphModules = Object.fromEntries([...sharedTargets].sort().map(target => [target, graph.modules.get(target).sha256]));
    manifest.linkedAreaModules = Object.fromEntries([...rsTargets].sort().map(target => [`${rs.area}/${target}`, rs.modules.get(target).sha256]));
    manifest.linkedGraphModules = Object.fromEntries([...linked.values()].map(l => [`${l.area}/${l.target}`, l.moduleSha256]).sort());
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  const label = graph ? `Code routines ${referenceVersion}` : 'Code routines';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-code-routines.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-code-routines.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} code routines modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${manifest.callSites.length} pinned call sites${graph ? `, ${graph.area} ${graph.manifestSha256.slice(0, 8)}, ${rs.area} ${rs.manifestSha256.slice(0, 8)}` : ''}).`);
  if (graph) Object.defineProperty(manifest, 'd1', { value: d1, enumerable: false });
  return manifest;
}

// `node scripts/extract-code-routines.mjs [--check] [--survey] [--version <v> | --all]`: without --version, the 3.6556.2
// production contract only (the default run and --check stay green while the 4.16336.0 staging contract is stopped
// by D46); --version 4.16336.0 runs the isolated contract (src/generated/code-routines-v4), --all runs both in turn.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : process.argv.includes('--all') ? contractVersions : [official3.referenceVersion];
  for (const version of versions)
    await extractCodeRoutines({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey'), version });
}
