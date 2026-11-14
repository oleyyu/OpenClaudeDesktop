// R4g-routines RTC (CW-1, D0/D32), moved to 3.6556.2 by w3-cowork-scheduled (research/routines-cowork-chat.md §1.3 / §3.2,
// plan.md "w3-cowork-scheduled"): extract the 3.6556.2 Cowork Scheduled page pieces the host page src/source-routines.jsx
// composes. Own generator, own output folder src/generated/cowork-scheduled, own scripts/verify-gen-cowork-scheduled.mjs.
//
//   ccd3f68fe  ps (the scheduled task detail, old qo), su (the starter template card, old el), eu (the templates, old Xc),
//              $l (their copy, old Yc); the task grid's class (hc) as a literal.
//   c97b955f1  La (UpsertScheduledTaskModal, old Ca; export t).
//   shared-156 KG (the pictogram, export Hr) and ca0c38004 n (its ObjectStopwatch asset, an unchanged file).
//   shared-frame Jj / Yj / Xj / Zj / nk (the CDS Field family the form renders), for the page's native field registry.
//   KG and nk are view-tabs' (CdsPictogram / CdsTextArea since w11-pictogram-d1, D1): index.mjs re-exports them from
//   there as Pictogram / CdsTextArea and this graph imports them by those semantic names instead of copying them.
//   cdbc75b4b  Wr (RC-05): the starter template grid classes, one and two columns (ccd3f68fe wraps it as `w-full ${Wr(u)}`).
//
// The cards come from src/generated/routines-shared (3.6556.2 since w2-routines-shared). The card menu (shared-18 vW) and
// the scheduled copy (shared-16 Wp) are routines-shared's too and are re-exported from there under semantic names; every
// binding routines-shared holds is imported from it instead of sliced a second time, so a React context stays one object.
//
// The engine is the RT0 one with the 3.6556.2 rules (R1 constants from official-3.6556.2.mjs; R2/E5 features as text or
// looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias, `Oo` being
// react/compiler-runtime's c; E3 the React Compiler helpers come from view-tabs by semantic name). A binding resolves, in
// this order, to: a host adapter of this graph (src/source-routine-cowork-adapters.jsx; its original declaration must carry
// `features`), a host adapter routines-shared already uses for it, a React namespace / alias of vendor-frame, a semantic
// public name of view-tabs (D1/D24/D46), a binding routines-shared holds, or a copy in this graph's module for its chunk.
// A service vendor binding, a class declaration, a dynamic import, a React context another graph holds, or a binding
// view-tabs holds without a semantic name stops generation. --survey prints the closure without writing anything.
//
// Two source contracts, two outputs (region batch 3 of the 4.16336.0 migration, region-plan G6 / cutover):
//   3.6556.2   src/generated/cowork-scheduled: the production graph. 15 generated areas that are still 3.6556.2
//              (region-plan cutover.oldConsumersAtGeneration, `legacyConsumers` below) and the host page import it, so it
//              stays on 3.6556.2, byte for byte, until they move (not before batch 11). Its contract below is unchanged.
//   4.16336.0  src/generated/cowork-scheduled-v4: the same semantic roots cut from the frozen 4.16336.0 snapshot. It links
//              the shared CDS graph cds-core (sharedGraph 'cds-core') instead of view-tabs, and routines-shared-v4 (the
//              4.16336.0 staging graph of its dependency) instead of routines-shared. Each root is the only top-level
//              declaration of its chunk carrying its features (uniqueRoots) and pins its export alias (`export: null`: a
//              private root). A binding cds-core publishes is linked (its raw declaration must hash as cds-core's,
//              linkedSha256); module state cds-core holds without a publicName stops generation and is reported with its
//              text and the chain that reached it (error.stateConflicts, D46); a pure binding it holds that way is cut
//              again only when it hashes the same (heldByCdsCore). A binding routines-shared-v4 holds is imported from it
//              (its manifest, module bytes, source chunk and declaration hash checked), so a context or a store stays one
//              object across the two graphs (D1); `linkedGraphs` does the same for a 4.16336.0 production area.
//              manifest.sharedGraphModules / linkedGraphModules pin the bytes of every module linked: a regeneration there
//              must be followed by a rerun here and --check. Nothing imports this graph until the cutover.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-routine-cowork-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// region-plan cowork-scheduled cutover.oldConsumersAtGeneration: the 3.6556.2 areas that link the production graph.
export const legacyConsumers = Object.freeze(['approval-elicitation', 'artifact-library', 'chat-artifact-card', 'chat-home', 'chat-projects',
  'composer-notices', 'cowork-approval', 'cowork-home', 'cowork-live', 'cowork-progress', 'cowork-runs', 'cowork-settings', 'session-rail',
  'sessions-page', 'sidebar-routines']);

// ── 3.6556.2: the production graph (unchanged contract, byte-identical output) ──────────────────────────────────────
const legacy = (() => {
  const official = official3;
// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk when it has one.
const roots = {
  'ccd3f68fe-C8Xiv_qI.js': {
    ps: { name: 'ScheduledTaskDetail', features: ['routineRead: f,', 'onTakeComputerWayBack:', '"Approvals you grant during a run appear here."', 'runQueued: x,'] },
    su: { name: 'ScheduledTaskTemplateCard', features: ['{ template: t, busy: n, disabled: r, onSelect: a } = e,', 'c.formatMessage($l[t.title])', 'm = Ql[t.id];'] },
    eu: { name: 'SCHEDULED_TASK_TEMPLATES', features: ['id: "daily_briefing",', 'cron: "0 8 * * 1-5",', 'id: "monitor_topic",', 'prompt: "monitorTopicPrompt",'] },
    $l: { name: 'scheduledTaskTemplateMessages', features: ['heading: { defaultMessage: "Or start from a template", id: "UNcFp+is2w" },', 'dailyBriefingTitle: { defaultMessage: "Daily briefing", id: "ZQwJxzS4/G" },'] },
  },
  'c97b955f1-Dd4YYfBl.js': {
    La: { name: 'UpsertScheduledTaskModal', export: 't', features: ['collideWithCodeRoutines:', 'onSetUpWithClaude:', '"Scheduled task creation isn\'t available. Restart the desktop app to enable this feature."'] },
  },
  'shared-156-BLTosN8U.js': {
    KG: { name: 'Pictogram', export: 'Hr', features: ['highlightFill:', '"data-cds": "Pictogram",'] },
  },
  'ca0c38004-CEGIs7-p.js': {
    n: { name: 'STOPWATCH_PICTOGRAM', features: ['name: "ObjectStopwatch",'] },
  },
  // w13-close-cowork-ui (coworkui-scheduled-02): the list banner's "Keep awake" switch (ccd3f68fe Na
  // `action:Qe?i("div",{className:"flex items-center pe-md",children:i(go,{size:"md",context:"scheduled-task"})}):void 0`,
  // go = c6ad19bb9 m); its desktop preference store (c1e3f823e) and wake scheduler status (c0fe64a00 _) are host adapters.
  'c6ad19bb9-C-Rlvdl1.js': {
    m: { name: 'KeepAwakeSwitch', export: 't', features: ['context: ee,', 'controlOnly: _,', 'defaultMessage: "Keep awake", id: "LyhK7RvVf3"',
      'name: "Sun", size: "md"', 'multiline: !0,', 'side: "bottom",'] },
  },
  // Held by routines-shared (re-exported): the card menu (shared-18 vW, old Az) and the scheduled-task copy (shared-16 Wp, old gd).
  'shared-18-D3y8YMFN.js': {
    vW: { name: 'ScheduledTaskMenu', export: 'Vt', features: ['{ defaultMessage: "More options for {label}", id: "rKQPgfPvWS" },', 'showPauseToggle:'] },
  },
  'shared-16-ByfgAyLr.js': {
    Wp: { name: 'SCHEDULED_TASK_COPY', export: 'wn', features: ['kind: "scheduled",'] },
  },
  // The form's field parts (CDS Field / Label / Description / Error / TextArea over Base UI Field), which the host's
  // native field registry recognises (source-field-adapters.jsx registerNativeFieldComponents).
  'shared-frame-6jtSkIit.js': {
    Jj: { name: 'CdsField', export: 'Mi', features: ['"data-cds": "Field",', '"flex flex-col gap-xs font-sans"'] },
    Yj: { name: 'CdsFieldLabel', export: 'ji', features: ['"text-body font-medium leading-none text-primary"'] },
    Xj: { name: 'CdsFieldDescription', export: 'ki', features: ['"text-footnote font-normal leading-snug"'] },
    Zj: { name: 'CdsFieldError', export: 'Ai', features: ['"flex items-start gap-1 text-footnote font-normal leading-snug text-danger"', 'name: "WarningCircle",'] },
    nk: { name: 'CdsTextArea', export: 'da', features: ['resize:', 'autosize:'] },
  },
};
// Class strings the host page applies to its own list elements, pinned in their official owner (exact value, once).
// RC-05: 3.6556.2 dropped ccd3f68fe's template grid (old Qc, "grid w-full grid-cols-1 gap-x-6 gap-y-md" + "md:grid-cols-2");
// the starter templates lay out through cdbc75b4b Wr (columns === 2 ? two-column hit grid : one column).
const literals = {
  routineGridClass: { file: 'ccd3f68fe-C8Xiv_qI.js', owner: 'hc', value: 'mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6',
    role: 'the scheduled task grid (also the list route, with the starting opacity)' },
  routineTemplateGridClass: { file: 'cdbc75b4b-BCUW8bqT.js', owner: 'Wr', value: 'grid grid-cols-1 hit-grid-gap-y-md', role: 'the starter template grid (one column)' },
  routineTemplateTwoColumnGridClass: { file: 'cdbc75b4b-BCUW8bqT.js', owner: 'Wr', value: 'grid grid-cols-1 hit-grid-gap-y-md md:grid-cols-2 md:hit-grid-gap-x-6', role: 'the starter template grid (columns === 2)' },
};
// vendor-frame's CommonJS interop namespaces for React itself map to namespace imports, never to a copy.
const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#me`]: 'react/jsx-runtime', [`${official.vendorFrame}#Hn`]: 'react-dom' };
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand): their declarations are copied like any
// other. Service / data vendors (react-query, zod, GrowthBook, Datadog, react-intl, the router) are never copied.
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
// Host services of this graph: chunk -> original local -> { name, features, also, overridesShared }. Each one is
// documented where it is implemented (src/source-routine-cowork-adapters.jsx).
const adapters = {
  // c6ad19bb9 m's store: the desktop preference keepAwakeEnabled (shared-78 MC _b("keepAwakeEnabled", !1)) — o (n): the key
  // is known and the desktop's keep-awake is supported (shared-78 Sw), a (r): its value, l (a): its writer.
  'c1e3f823e-Dck_crfE.js': {
    o: { name: 'useKeepAwakeAvailable', features: ['let e = i.useHasKey(),', 'return e && t;'] },
    a: { name: 'useKeepAwakeEnabled', features: ['a = i.useEnabled'] },
    l: { name: 'useKeepAwakeWriter', features: ['event_key: "claudeai.desktop.keep_awake_toggled",'] },
    // c (export t): the switch's tooltip message, a react-intl defineMessage (vendor-intl nn, which working-line holds and
    // this graph cannot link): the host keeps the same descriptor (pinned by its id and text).
    c: { name: 'keepAwakeTooltipMessage', features: ['"When enabled, Claude will prevent your computer from going to sleep."', 'id: "pkPdf3LvZO",'] },
  },
  // The wake scheduler's status (index c0fe64a00 n, the desktop's WakeScheduler bridge); m only destructures it.
  'c0fe64a00-CJQlkZcs.js': {
    _: { name: 'useWakeScheduler', features: ['"wakeSchedulerEnabled"', 'handleOpenLoginItems:'] },
  },
  'shared-0-DDOOdL6P.js': {
    bC: { name: 'CoworkScheduledTasks', overridesShared: true, features: ['globalThis["claude.web"]?.CoworkScheduledTasks'] },
    B: { name: 'trackEvent', features: ['var B = I(Nv, F.O11Y_INTERNALS);'] },
    bN: { name: 'reportError', features: ['var bN = I(xN, F.O11Y_INTERNALS);'] },
    AQ: { name: 'useAppConfiguration', features: ['"useConfiguration must be called from within ConfigurationProvider"'] },
  },
  'shared-1-BJhqMmkf.js': {
    ER: { name: 'useCoworkModelCatalog', features: ['extraLongContextIds:', 'setStoredModel:'] },
  },
  'shared-52-uHFNjl7C.js': {
    SO: { name: 'useServedDeploymentConfig', features: ['{ asks: e, query: t } = GD(),', 'n = e ? t.data?.served : void 0,'] },
  },
  'shared-13-DBkfWBVo.js': {
    P: { name: 'SkillChip', features: ['{ id: i, info: o } = e,', 'if (o.unresolved) {'] },
  },
  'shared-182-BI1KJccu.js': {
    Jb: { name: 'useComposerDraftState', features: ['return Cb(e, t);'], also: { Cb: ['r = J1($, 0, n) ? K1($, 0, n, n || Sb()) : $[1];', 'return Fo(r, ni(e));'] } },
    jL: { name: 'useDismissedBanners', features: ['r.settings?.dismissed_claudeai_banners ?? [],', 'dismissMany: a,', 'isDismissed: i,'] },
  },
  'shared-5-Bg6ZMqvt.js': {
    Dz: { name: 'useSkillChipCatalog', features: ['source: "cowork",'] },
  },
  'shared-78-D5Fw2h0a.js': {
    // The registry's useAvailable (B) answers Om (blocked_by_platform) when the client-side gate is off, else the account
    // feature (shared-0 vZ: blocked_by_platform for dramatic_shrimp with no account data); both pinned for the host value.
    V: { name: 'useClaudeAiFeature', features: ['.useAvailable()'],
      also: { B: ['return n ? (r.isAvailable ? Dm : r) : Om;'], Om: ['status: "blocked_by_platform",', 'isAvailable: !1,', 'isPolicyBlocked: !0,', 'isUpsellEligible: !1'] } },
    kS: { name: 'useOrgComputeSettings', features: ['c = !!i?.claude_code_disable_anthropic_compute,', 'disableAnthropicCompute: c,', 'isColdError: r && n === void 0,'] },
    Zb: { name: 'useDeviceRegistryQuery', features: ['/cowork/devices', 'refetchIntervalInBackground:'] },
  },
  'c3a5facd2-CzkMZ0h5.js': {
    P: { name: 'SessionHostHoldAction', features: ['"session-host-connection-hold-pending"'] },
    F: { name: 'SessionHostHoldNote', features: ['"session host connection hold"', '"session-host-connection-hold-none"'] },
  },
  'shared-8-Db1QN4mf.js': {
    bM: { name: 'useProjectsReady', features: ['untilSettled: !0'] },
    _J: { name: 'FolderPicker', features: ['controlledSelection:', 'browsePrompt:', 'remoteWorkspaceTraffic:', 'handleBrowse:'] },
  },
  'shared-4-DUB1Oi0O.js': {
    __: { name: 'useRemoteToolGrants', features: ['"[useCoworkScheduledTaskRemoteGrants] fetch failed"'] },
  },
  // 3.6556.2: c0efc2620 `_` (old _e's caller) is now the whole draft assistant (setName / onNameBlur / setInstructions /
  // stop / reset / isDrafting …, GrowthBook __gb__2682097403); it is copied, and its org API hook `p` is the service.
  'c0efc2620-BbVUZz1E.js': {
    p: { name: 'useRoutineDraftGenerator', features: ['/dust/generate_routine_draft', 'generateRoutineDraft:'] },
  },
  'shared-18-D3y8YMFN.js': {
    YW: { name: 'useTaskFileModelUnavailable', features: ['"cowork-scheduled-task-frontmatter-model"'] },
    AT: { name: 'useUnifiedRoutineForm', features: ['let e = kT(),', 'return e === !0 && t && n === !0;'] },
    LT: { name: 'useCodeRoutineCreateOffered', features: ['return e && t && !n && !!sn?.createScheduledTask;'] },
    zT: { name: 'useCloudEnvironmentsMissing', features: ['if (RT(t?.environments ?? [], o?.pools?.length ?? 0)) return !0;'] },
    RW: { name: 'useCodeRoutineNames', features: ['excludeTags: aT', 'p = LW;'] },
    rv: { name: 'unusedConfigSchema', features: ['var rv = e();'] },
    av: { name: 'unusedConfigSchema', features: ['autoDownloadInBackground: o().default(iv.autoDownloadInBackground),'] },
  },
  'shared-156-BLTosN8U.js': {
    iw: { name: 'useConnectorLookup', features: ['return X(rw);'],
      also: { tw: ['remoteServers: e.remoteServers,', 'remoteLiveRunToolTest: e.remoteLiveRunToolTest,', 'mcpUrlKeyNamesOn: e.mcpUrlKeyNamesOn,', 'internalToolsOnlyNames: e.internalToolsOnlyNames,'] } },
  },
  'shared-26-CGuBxVt9.js': {
    Ux: { name: 'toolLabelInfo', features: ['"forLabel"'] },
    vD: { name: 'useUnsupervisedPermissionModes', features: ['e.has("auto") && n && i && r.add("auto"),', 'e.has("bypassPermissions") && t && r.add("bypassPermissions"),'],
      also: { _D: ['W("cowork_auto_permission_mode")', 'W("cowork_bypass_permissions_mode")'] } },
  },
  'shared-25-DOWZRSlq.js': {
    Rs: { name: 'useDynamicConfig', features: ['type: "dynamic_config"'] },
    // A GrowthBook feature's evaluation (useFeature; old Rs). c2d1766e9's device poll interval reads it through ds; the
    // copied Qo asks routines-shared Ho, which throws without a GrowthBookProvider.
    $o: { name: 'useGrowthBookFeature', features: ['return Qo(Vo(), e);'], also: { Qo: ['n !== null && n.hashedKeys.has(t) ? n : null'] } },
  },
  'cae55dd08-CqJTQ965.js': {
    h: { name: 'unavailableCodeRoutineChunk', features: ['id: "routine_code_state_engine",'] },
    v: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_local_create_engine",'] },
    l: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_routine_create_form",'] },
    f: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_local_routine_create_form",'] },
  },
  'shared-7-DBAgAi5H.js': {
    Hk: { name: 'ConnectorServerIcon', features: ['"connector-icon-globe-fallback"'] },
    Mv: { name: 'useSubscriptionPastDue', features: ['s === "stripe_subscription_contracted" ||', 'return d ? f && h : a?.status === "past_due" && !c;'] },
    hv: { name: 'useAppNavigate', features: ['(kf(n) || e.push(n), t && ws());'] },
    hk: { name: 'useThisDeviceName', features: ['registryRowId'] },
    lw: { name: 'EffortControl', features: ['import("./c8e04f916-39YFkTtR.js")', 'e?.EffortControl ??'] },
    YF: { name: 'useRefusalFallback', features: ['"claudeai.cowork.refusal_fallback.edit_retry_clicked"'] },
  },
  'c97b955f1-Dd4YYfBl.js': {
    Ri: { name: 'useFormCloudEnvironmentsMissing', features: ['e && Li(t?.environments ?? [], n ? (a?.pools?.length ?? 0) : 0),'] },
    bi: { name: 'RemoteApprovalsList', features: ['{ approvals: t, bindings: n, revoked: a, onRevoke: o } = e,'] },
    hi: { name: 'RemoteApprovalsEmpty', features: ['{ approvalsBypassed: t } = e,'] },
    Ti: { name: 'SavedProjectCard', features: ['"routine-saved-project-link"', 'webBehavior: "new-tab",'] },
  },
};
// Raw minified text the host page and its adapters follow (each must occur exactly once; `{ loose }` through looseFeature).
const rawCallSites = [
  { source: 'ccd3f68fe-C8Xiv_qI.js', role: 'The official list renders the cards in this grid, asks the form for the Code routine name collision, and marks a run "Only this computer" by its ranOn',
    features: ['o("div",{className:`w-full ${eo(u)}`,children:[a,I.map((e,t)=>i(su,{template:e,', 'collideWithCodeRoutines:!0', 't.ranOn==="this_computer"&&', { loose: 'className:n("mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6",q&&"opacity-50 transition-opacity")' }] },
  { source: 'c97b955f1-Dd4YYfBl.js', role: 'The form offers local tasks when the CoworkScheduledTasks bridge can create them and requires a description for a local task',
    features: [{ loose: 'qs=!!we?.createScheduledTask&&!He?.localTasksOff' }, { loose: '$p=Kl&&yu.trim().length===0' }, { loose: 'var aa=e({UpsertScheduledTaskModal:()=>La})' }] },
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'MessagePort', 'ClipboardItem', 'Blob', 'Float64Array', 'crypto', 'indexedDB', 'arguments',
  // react-aria (the calendar, cff2bf6cb) reads these behind typeof guards to detect a test environment.
  'IS_REACT_ACT_ENVIRONMENT', 'jest',
  // react-aria's id registry (cff2bf6cb `kr`) is created behind `typeof FinalizationRegistry < "u"`.
  'FinalizationRegistry']);
  return { official, output: path.join(root, 'src/generated/cowork-scheduled'), sharedGraph: 'view-tabs', routinesShared: 'routines-shared',
    roots, literals, namespaceImports, vendorCopies, copyableVendors, adapters, rawCallSites, allowedGlobals };
})();

// ── 4.16336.0: the isolated graph (region-plan G6 / cutover), linking cds-core and routines-shared-v4 ────────────────
const target4 = (() => {
  const official = official4;
  // The same roots under the same semantic names, each the only top-level declaration of its 4.16336.0 chunk carrying its
  // features (uniqueRoots) and pinned to its export alias there (`export: null`: a private root, which must not be
  // exported). Located by region-plan survey-1 (7/7 unique) and checked here: ccd3f68fe ps -> os, su -> Wl, eu -> zl,
  // $l -> Rl; c97b955f1 La -> Xa (export t); ca0c38004 n (the same file in both releases); c6ad19bb9 m (export t).
  const roots = {
    'ccd3f68fe-D3_oyEUp.js': {
      os: { name: 'ScheduledTaskDetail', export: null, features: ['routineRead: f,', 'onTakeComputerWayBack:', '"Approvals you grant during a run appear here."', 'runQueued: x,'] },
      Wl: { name: 'ScheduledTaskTemplateCard', export: null, features: ['{ template: t, busy: n, disabled: r, onSelect: a } = e,', 'c.formatMessage($l[t.title])', 'm = Ql[t.id];'] },
      zl: { name: 'SCHEDULED_TASK_TEMPLATES', export: null, features: ['id: "daily_briefing",', 'cron: "0 8 * * 1-5",', 'id: "monitor_topic",', 'prompt: "monitorTopicPrompt",'] },
      Rl: { name: 'scheduledTaskTemplateMessages', export: null, features: ['heading: { defaultMessage: "Or start from a template", id: "UNcFp+is2w" },', 'dailyBriefingTitle: { defaultMessage: "Daily briefing", id: "ZQwJxzS4/G" },'] },
    },
    'c97b955f1-7qm6xzAi.js': {
      Xa: { name: 'UpsertScheduledTaskModal', export: 't', features: ['collideWithCodeRoutines:', 'onSetUpWithClaude:', '"Scheduled task creation isn\'t available. Restart the desktop app to enable this feature."'] },
    },
    'shared-183-B2N6Zy4J.js': {
      Zq: { name: 'Pictogram', export: 'Dr', features: ['highlightFill:', '"data-cds": "Pictogram",'] },
    },
    'ca0c38004-CEGIs7-p.js': {
      n: { name: 'STOPWATCH_PICTOGRAM', export: 't', features: ['name: "ObjectStopwatch",'] },
    },
    'c6ad19bb9-BHM84I90.js': {
      m: { name: 'KeepAwakeSwitch', export: 't', features: ['_storybook:', 'controlOnly:', 'defaultMessage: "Keep awake", id: "LyhK7RvVf3"', 'name: "Sun", size: "md"', 'multiline: !0,', 'side: "bottom",'] },
    },
    // Held by routines-shared-v4 (re-exported): the card menu (3.6556.2 shared-18 vW) and the scheduled-task copy
    // (3.6556.2 shared-16 Wp, now shared-140 td).
    'shared-18-Cfqwgjc5.js': {
      SY: { name: 'ScheduledTaskMenu', export: 'Ht', features: ['{ defaultMessage: "More options for {label}", id: "rKQPgfPvWS" },', 'showPauseToggle:'] },
    },
    'shared-140-DfG6VwpK.js': {
      td: { name: 'SCHEDULED_TASK_COPY', export: 'Wn', features: ['kind: "scheduled",'] },
    },
    // The form's field parts, published by cds-core (re-exported under this graph's names).
    'shared-frame-CJdE5Ria.js': {
      OI: { name: 'CdsField', export: 'ta', features: ['"data-cds": "Field",', '"flex flex-col gap-xs font-sans"'] },
      kI: { name: 'CdsFieldLabel', export: 'ea', features: ['"text-body font-medium leading-none text-primary"'] },
      AI: { name: 'CdsFieldDescription', export: 'Qi', features: ['"text-footnote font-normal leading-snug"'] },
      NI: { name: 'CdsFieldError', export: '$i', features: ['"text-danger wrap-break-word"'] },
      oN: { name: 'CdsTextArea', export: 'Va', features: ['resize:', 'autosize:'] },
    },
  };
  // The same host class strings, pinned in their 4.16336.0 owners (3.6556.2 ccd3f68fe hc is uc; cdbc75b4b Wr is Qr).
  const literals = {
    routineGridClass: { file: 'ccd3f68fe-D3_oyEUp.js', owner: 'uc', value: 'mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6',
      role: 'the scheduled task grid (also the list route, with the starting opacity)' },
    routineTemplateGridClass: { file: 'cdbc75b4b-TExYNEy0.js', owner: 'Qr', value: 'grid grid-cols-1 hit-grid-gap-y-md', role: 'the starter template grid (one column)' },
    routineTemplateTwoColumnGridClass: { file: 'cdbc75b4b-TExYNEy0.js', owner: 'Qr', value: 'grid grid-cols-1 hit-grid-gap-y-md md:grid-cols-2 md:hit-grid-gap-x-6', role: 'the starter template grid (columns === 2)' },
  };
  const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#ce`]: 'react/jsx-runtime', [`${official.vendorFrame}#be`]: 'react-dom' };
  // react-intl defineMessage (the identity function), as routines-shared copies defineMessages.
  const vendorCopies = { [`${official.vendorIntl}#nn`]: ['return e;'] };
  const copyableVendors = ['vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
  const adapters = {
    'c1e3f823e-Dly84_dq.js': {
      o: { name: 'useKeepAwakeAvailable', features: ['let e = i.useHasKey(),', 'return e && t;'] },
      a: { name: 'useKeepAwakeEnabled', features: ['a = i.useEnabled'] },
      l: { name: 'useKeepAwakeWriter', features: ['event_key: "claudeai.desktop.keep_awake_toggled",'] },
      c: { name: 'keepAwakeTooltipMessage', features: ['"When enabled, Claude will prevent your computer from going to sleep."', 'id: "pkPdf3LvZO",'] },
    },
    'c0fe64a00-Bijs8_8F.js': {
      g: { name: 'useWakeScheduler', features: ['"wakeSchedulerEnabled"', 'handleOpenLoginItems:'] },
    },
    'shared-0-CnnWnVrT.js': {
      // The desktop's CoworkScheduledTasks bridge: this graph answers it itself (the page activates the host's local
      // scheduled-task bridge); routines-shared-v4 keeps its own plain read for its readers, as in 3.6556.2.
      ek: { name: 'CoworkScheduledTasks', overridesShared: true, features: ['globalThis["claude.web"]?.CoworkScheduledTasks'] },
      // D1 (cds-integrate wave 8, W8-M1 / decision (a)): the event track H and the error report qB (3.6556.2 shared-0
      // bN = I(xN, …); r3b-transcript knows it by its export zd) are official runtime cds-core now holds and publishes
      // (o11y_shared0_H / o11y_shared0_qB: consent-closed observability). They are linked from cds-core, not answered here;
      // were H: { name: 'trackEvent', … 'var H = P(Zw, N.O11Y_INTERNALS);' } and qB: { name: 'reportError', … }.
      y4: { name: 'useAppConfiguration', features: ['"useConfiguration must be called from within ConfigurationProvider"'] },
    },
    // The Cowork model catalog (3.6556.2 shared-1 ER): the host's own answer, not routines-shared's useSurfaceModels.
    'shared-1-D1bGaTaN.js': {
      R1: { name: 'useCoworkModelCatalog', features: ['extraLongContextIds', 'setStoredModel'] },
    },
    'shared-62-DoCqVpIq.js': {
      Qk: { name: 'useServedDeploymentConfig', features: ['{ asks: e, query: t } = LO(),', 'n = e ? t.data?.served : void 0,'] },
    },
    'shared-92-BOgyxePb.js': {
      GE: { name: 'useDeviceRegistryQuery', features: ['refetchIntervalInBackground: r,'], also: { oD: ['/cowork/devices'] } },
      // The claude.ai feature registry's availability (3.6556.2 shared-78 V): P_[feature].useAvailable().
      F_: { name: 'useClaudeAiFeature', features: ['return P_[e].useAvailable();'] },
      kO: { name: 'useOrgComputeSettings', features: ['c = !!i?.claude_code_disable_anthropic_compute,', 'disableAnthropicCompute: c,'] },
    },
    'shared-25-D-aF0gt9.js': {
      Ky: { name: 'RouterLink', shared: true, features: ['href: t,', 'replace: a,', 'prefetch: r,'] },
      // A dynamic config's evaluation (3.6556.2 shared-25 Rs).
      // A GrowthBook feature's evaluation (3.6556.2 shared-25 $o over Qo): ho asks useGrowthBookClient, which throws
      // without a GrowthBookProvider.
      go: { name: 'useGrowthBookFeature', features: ['return ho(ro(), e);'], also: { ho: ['n !== null && n.hashedKeys.has(t) ? n : null'] } },
      is: { name: 'useDynamicConfig', features: ['So(r, i, a, n, t, { type: "dynamic_config", name: e }),'] },
    },
    'c3a5facd2-fKxKlZHz.js': {
      H: { name: 'SessionHostHoldAction', features: ['"session-host-connection-hold-pending"'] },
      U: { name: 'SessionHostHoldNote', features: ['"session host connection hold"', '"session-host-connection-hold-none"'] },
    },
    'shared-36-fqRFYwOb.js': {
      Db: { name: 'ConnectorServerIcon', features: ['"connector-icon-globe-fallback"'] },
      // This device's name (3.6556.2 shared-7 hk) over the device registry row.
      eb: { name: 'useThisDeviceName', features: ['n?.registryRowId', 'n?.displayName'] },
      AD: { name: 'useRefusalFallback', features: ['"claudeai.cowork.refusal_fallback.edit_retry_clicked"'] },
    },
    // The quiet hours schema caa9df187 V passes to the dynamic config (shared-25 is): a zod schema the host does not parse.
    'c66c1ce91-BnQgRaSi.js': {
      o: { name: 'unusedConfigSchema', features: ['start_hour: t().int().min(0)', 'end_hour: t().int().max(24)'] },
    },
    // 4.16336.0: a report with options (3.6556.2 shared-0 bN); the needs-review heading (c3a5facd2 Z) reports its save failure.
    'shared-60-DmOyT7JJ.js': {
      De: { name: 'SkillChip', features: ['{ id: a, info: o } = e,', 'if (o.unresolved) {'] },
    },
    'shared-18-Cfqwgjc5.js': {
      // The two zod schemas py hands GrowthBook's config reader (3.6556.2 shared-18 av / rv).
      fy: { name: 'unusedConfigSchema', features: ['autoDownloadInBackground: o().default(dy.autoDownloadInBackground),'] },
      uy: { name: 'unusedConfigSchema', features: ['var uy = e();'] },
      KY: { name: 'useCodeRoutineNames', features: ['excludeTags:'] },
      xA: { name: 'useCloudEnvironmentsMissing', features: ['if (bA(t?.environments ?? [], o?.pools?.length ?? 0)) return !0;'] },
      rX: { name: 'useTaskFileModelUnavailable', features: ['"cowork-scheduled-task-frontmatter-model"'] },
      fA: { name: 'useUnifiedRoutineForm', features: ['let e = dA(),', 'return e === !0 && t && n === !0;'] },
      yA: { name: 'useCodeRoutineCreateOffered', features: ['return e && t && !n && !!Gt?.createScheduledTask;'] },
    },
    'shared-183-B2N6Zy4J.js': {
      GT: { name: 'useConnectorLookup', features: ['return X(WT);'], also: { HT: ['remoteServers: e.remoteServers,', 'remoteLiveRunToolTest: e.remoteLiveRunToolTest,'] } },
    },
    'shared-26-B-POtn5S.js': {
      Uk: { name: 'toolLabelInfo', features: ['"forLabel"'] },
      sF: { name: 'useUnsupervisedPermissionModes', features: ['e.has("auto") && n && i && r.add("auto"),', 'e.has("bypassPermissions")'] },
    },
    'shared-33-DtdykY0y.js': {
      Tq: { name: 'useSkillChipCatalog', features: ['source: "cowork",'] },
      // The app navigation (3.6556.2 shared-7 hv).
      _K: { name: 'useAppNavigate', features: ['(qs(n, r) || e.push(n), t && gK());'] },
    },
    'shared-212-BHMAi0oa.js': {
      bU: { name: 'useDismissedBanners', features: ['r.settings?.dismissed_claudeai_banners ?? [],', 'dismissMany: a,'] },
      // The composer draft store reader (3.6556.2 shared-182 Jb over Cb).
      fw: { name: 'useComposerDraftState', features: ['return RC(e, t);'], also: { RC: ['r = J1($, 0, n) ? K1($, 0, n, n || LC()) : $[1];', 'return Kl(r, Dl(e));'] } },
    },
    'c97b955f1-7qm6xzAi.js': {
      Ji: { name: 'useFormCloudEnvironmentsMissing', features: ['e && qi(t?.environments ?? [], n ? (a?.pools?.length ?? 0) : 0),'] },
      Pi: { name: 'RemoteApprovalsList', features: ['{ approvals: t, bindings: n, revoked: a, onRevoke: o } = e,'] },
      ki: { name: 'RemoteApprovalsEmpty', features: ['{ approvalsBypassed: t } = e,'] },
      zi: { name: 'SavedProjectCard', features: ['"routine-saved-project-link"', 'webBehavior: "new-tab",'] },
    },
    'shared-31-C9BqSSuD.js': {
      rm: { name: 'useRemoteToolGrants', features: ['"[useCoworkScheduledTaskRemoteGrants] fetch failed"'] },
    },
    'shared-8-BqfCbkJd.js': {
      FA: { name: 'useProjectsReady', features: ['untilSettled: !0'] },
      // 4.16336.0: the form renders tX, which passes the create-project modal (eX) to the folder picker UY.
      tX: { name: 'FolderPicker', features: ['createProject: eX'], also: { UY: ['controlledSelection:', 'browsePrompt:', 'remoteWorkspaceTraffic:', 'handleBrowse:'] } },
    },
    'c0efc2620-BV-JpwmG.js': {
      p: { name: 'useRoutineDraftGenerator', features: ['/dust/generate_routine_draft', 'generateRoutineDraft:'] },
    },
    'cae55dd08-DePgBnl2.js': {
      h: { name: 'unavailableCodeRoutineChunk', features: ['id: "routine_code_state_engine",'] },
      v: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_local_create_engine",'] },
      l: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_routine_create_form",'] },
      f: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_local_routine_create_form",'] },
    },
    'shared-7-D2e77H6v.js': {
      FI: { name: 'EffortControl', features: ['e?.EffortControl ??'] },
      // The refusal fallback (3.6556.2 shared-7 YF) moved to shared-36 AD.
      Lg: { name: 'useSubscriptionPastDue', features: ['s === "stripe_subscription_contracted" ||', '{ isRavenPastDue: h } = wr(m);'] },
    },
  };
  const rawCallSites = [
    { source: 'ccd3f68fe-D3_oyEUp.js', role: 'The official list renders the template cards in the cdbc75b4b Qr grid (`w-full ${Qr(columns)}`), asks the form for the Code routine name collision, marks a run "Only this computer" by its ranOn, and dims the task grid while pending',
      features: ['ne=`w-full ${J1($,35,f)?K1($,35,f,Wa(f)):$[36]}`', '(e,t)=>r(Wl,{template:e,', 'collideWithCodeRoutines:!0', 't.ranOn==="this_computer"&&',
        { loose: 'className:n("mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6",q&&"opacity-50 transition-opacity")' }] },
    { source: 'c97b955f1-7qm6xzAi.js', role: 'The form offers local tasks when the CoworkScheduledTasks bridge can create them and requires a description for a local task',
      features: [{ loose: 'qc=!!ve?.createScheduledTask&&!mt?.localTasksOff' }, 'ld&&Ld.trim().length===0', { loose: 'var ga=e({UpsertScheduledTaskModal:()=>Xa})' }] },
  ];
  // 4.16336.0 adds browser built-ins the newly reached official code reads: base64 decoding in shared-0 Vf (atob,
  // Uint8Array, TextDecoder), typeof-guarded PerformanceObserver probes (shared-0 WM, shared-25 Dm), location (shared-0
  // lW, shared-25 Tm) and Base UI's typeof-guarded ShadowRoot (vendor-frame zr).
  const allowedGlobals = new Set([...legacy.allowedGlobals, 'atob', 'Uint8Array', 'TextDecoder', 'PerformanceObserver', 'location', 'ShadowRoot']);
  return { official, output: path.join(root, 'src/generated/cowork-scheduled-v4'), sharedGraph: 'cds-core', routinesShared: 'routines-shared-v4', uniqueRoots: true,
    isolatedGraph: { productionOutput: 'src/generated/cowork-scheduled', productionSwitchNotBeforeBatch: 11, heldBy: legacyConsumers },
    roots, literals, namespaceImports, vendorCopies, copyableVendors, adapters, rawCallSites, allowedGlobals,
    // D1 (cds-integrate wave 5b): once D46 was lifted, code-routines-v4 and this graph both cut seven module states of the
    // routine form / model picker chunks (d1-gate: three shared-7 contexts and its read-only Set, the cae55dd08 context,
    // the shared-2 zustand store, the cd8a7d7c0 closure store). One copy: code-routines-v4 (generated first) holds them and
    // this graph imports them from there (an isolated region graph exports every binding under its original local name).
    // D1 (cds-integrate wave 8, W8-M4): the shared-2 zustand store wH is now held by cds-core and published as
    // store_shared2_wH (pins.merge.wave8), so it is linked from cds-core like every other binding cds-core publishes and
    // no longer from code-routines-v4 (which links it from cds-core too); was ['shared-2-CsjIBQD8.js', ['wH']] here.
    // D1 (cds-integrate wave 8s, W8S-M4): the three shared-7 contexts and its read-only Set (iI, nI, rI, TI) are now held by
    // cds-core and published as settings_shared7_<local> (pins.merge.wave8s), so they are linked from cds-core like the
    // wave-8 wH and no longer from code-routines-v4; was ['shared-7-D2e77H6v.js', ['iI', 'nI', 'rI', 'TI']] first here.
    linkedGraphs: Object.fromEntries([
      ['cae55dd08-DePgBnl2.js', ['s']], ['cd8a7d7c0-DuH0T8rm.js', ['u']],
    ].flatMap(([file, locals]) => locals.map(local => [`${file}#${local}`, { area: 'code-routines-v4', target: file.replace(/\.js$/, '.mjs'), exportName: local }]))),
    // D46 (region batch 3): the form's code/local toggle (c97b955f1 Ui) renders the CDS coachmark shared-frame WP (export
    // da); its Base UI popup closure reaches two module-level bindings the chunk reassigns after their declaration
    // (vendor-frame Xl `Xl=null`, Kr `Kr`). Generation stopped there until cds-core published them: since cds-core wave 5b
    // they are publicNames (CdsCoachMark, microtaskBatchQueue / enqueueMicrotaskBatch, backdropFilterSupport /
    // supportsWebkitBackdropFilter) and are linked, so the list is empty and the CLI default writes
    // src/generated/cowork-scheduled-v4 (isolated graph; productionSwitchNotBeforeBatch unchanged). A non-empty list is
    // what the generator is expected to report; tests/cowork-scheduled-v4.test.mjs fails as soon as the report changes.
    blockedByD46: [] };
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
  // Top-level statements that initialise a binding after its declaration, run when the chunk loads: the bundler's
  // `var tr = {}; tr = { "ar-AE": xn, … }` (react-aria's locale dictionaries in cff2bf6cb), a static member
  // (`Co.Range = xo`, `ba.displayName = …`), a mutation (`oi.push(…)`) or a feature probe (`try { Cc = … } catch {}`).
  // Each belongs to the declared bindings it writes outside any function (an assignment to a top-level name or to a
  // member of one, or a member call on one) and is emitted with them, at its original position. A statement that
  // writes no declared binding (a listener, a bare probe) belongs to nothing, as in extract-session-rail.mjs.
  const initializers = new Map();
  for (const node of ast.program.body) {
    if (node.type !== 'ExpressionStatement' && node.type !== 'TryStatement') continue;
    const text = code.slice(node.start, node.end);
    const parsed = babel.babelParse(text, `${name}@${node.start}`, true);
    const targets = new Set(), reads = new Set();
    const declared = id => id?.type === 'Identifier' && top.has(id.name) && top.get(id.name).kind !== 'import';
    const root = expr => { let e = expr; while (e?.type === 'MemberExpression') e = e.object; return e; };
    babel.traverse(parsed, {
      Program(p) { for (const g of Object.keys(p.scope.globals)) if (top.has(g)) reads.add(g); },
      AssignmentExpression(p) {
        const id = root(p.node.left);
        if (!p.getFunctionParent() && declared(id) && !p.scope.hasBinding(id.name)) targets.add(id.name);
      },
      CallExpression(p) {
        if (p.node.callee.type !== 'MemberExpression') return;
        const id = root(p.node.callee);
        if (!p.getFunctionParent() && declared(id) && !p.scope.hasBinding(id.name)) targets.add(id.name);
      },
    });
    const entry = { kind: 'statement', node, id: `#init@${node.start}`, deps: [...reads], targets: [...targets] };
    for (const target of targets) {
      if (!initializers.has(target)) initializers.set(target, []);
      initializers.get(target).push(entry);
    }
  }
  const record = { name, bytes, code, ast, exported, top, initializers, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
// A destructuring declarator (kind 'pattern') is emitted once, as the original `var {…}=…;`, and defines all its names.
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
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
// 4.16336.0: a feature looseFeature() cannot tokenise (a regex literal holding a quote) is matched as text only; the
// 3.6556.2 contract keeps the old behaviour (such a feature throws).
const looseCache = new Map();
const loose = (official, f) => {
  const key = `${official.referenceVersion}\0${f}`;
  if (!looseCache.has(key)) {
    let pattern = null;
    if (official === official3) pattern = official.looseFeature(f);
    else try { pattern = official.looseFeature(f); } catch { /* text only */ }
    looseCache.set(key, pattern);
  }
  return looseCache.get(key);
};
const featureHit = (official, text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || !!loose(official, f)?.test(text);
function assertFeatures(official, label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(official, text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
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
async function viewTabsGraph(official) {
  const manifest = await viewTabsManifestFor(official.referenceVersion);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Set();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.add(`${mod.source}#${typeof b === 'string' ? b : b.name}`);
  // D46: names extract-view-tabs.mjs has settled but not published yet (other areas still slice those bindings).
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { published, held, pending };
}
// routines-shared: the bindings it holds (imported from its chunk modules) and the host adapters it answers with.
// 3.6556.2 reads the production graph through routines-shared-compat.mjs; 4.16336.0 reads routines-shared-v4 strictly:
// its manifest is on this version and snapshot, each module's bytes equal its recorded sha256, and each module was cut
// from the official chunk this generator reads (sourceSha256), so a held binding imported from it is this very slice.
async function routinesSharedGraph(official, dirName) {
  let manifest, modules = null;
  const { referenceVersion } = official;
  if (official === official3) manifest = await routinesSharedManifestFor(referenceVersion);
  else {
    const dir = path.join(generatedRoot, dirName);
    const bytes = await fs.readFile(path.join(dir, 'manifest.json'));
    manifest = JSON.parse(bytes);
    if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${dirName} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
    modules = new Map();
    for (const m of manifest.modules) {
      if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${dirName}/${m.target} differs from its manifest; rerun its generator`);
      const bytes = await fs.readFile(path.join(official.ionSource, m.source)).catch(() => null);
      if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${dirName}/${m.target} was cut from another ${m.source}`);
      modules.set(m.target, m.sha256);
    }
    modules.manifestSha256 = sha(bytes);
  }
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${dirName} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { dir: dirName, held, adapters: shared, contexts: new Set(manifest.contexts ?? []), modules };
}
// sharedGraph 'cds-core' (4.16336.0): the manifest is on this version and snapshot, every module's bytes equal its
// recorded sha256 and its sourceSha256 equals the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName (the runSlicer sharedGraph contract, as extract-btw-pane.mjs,
// extract-review-findings.mjs and extract-routines-shared.mjs read it).
async function cdsCoreGraph(official, area) {
  const dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const modules = new Map(), held = new Map(), published = new Map(), adapters = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    modules.set(m.target, m);
    // The host adapters cds-core answers a vendor binding with (vendor-frame i: the host React loader, …): a binding of
    // this graph that reads the same original is answered by the same adapter, so React stays the host's one copy.
    for (const i of m.imports ?? []) if (i.kind === 'adapter' && i.via?.includes('#'))
      adapters.set(i.via, { name: i.name, module: path.relative(generatedRoot, path.resolve(dir, i.from)) });
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = modules.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, modules, held, published, adapters, manifestSha256: sha(manifestBytes) };
}
// The `export { local, local as name }` lists of a generated module: local -> exported name.
function moduleExports(text) {
  const out = new Map();
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}\s*;?\s*$/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) { const [local, name = local] = spec.split(/\s+as\s+/); out.set(local, name); }
  return out;
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
    // A production area records its exports in the manifest; an isolated region graph (code-routines-v4) exports every
    // binding under its original local name, read from the module's own export list (its bytes are checked above).
    const exported = m.exports ? m.exports[local] : moduleExports(await fs.readFile(path.join(dir, m.target), 'utf8')).get(local);
    if (exported !== link.exportName) throw Error(`linked ${link.area}/${m.target} does not export ${local} as ${link.exportName}`);
    out.set(key, { ...link, sha256: binding.sha256, moduleSha256 });
  }
  return out;
}
// D1 (4.16336.0): what the other 4.16336.0 graphs under src/generated already cut (file#local -> [area]); cds-core,
// routines-shared-v4 (linked above) and this region's own outputs are not counted.
async function otherTargetGraphs(official, own) {
  const out = new Map();
  for (const entry of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || own.has(entry.name) || entry.name === 'cds-core') continue;
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
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-<version>.mjs knows as a React export, or undefined.
const reactAlias = (official, src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];
// 4.16336.0 (R3): vendor-frame's CommonJS interop namespace for a React module is the one object a top-level
// `local = <namespace>.<anchor>` reads that module's anchor member from (react: __COMPILER_RUNTIME, react/jsx-runtime:
// jsxs, react-dom: flushSync); contract.namespaceImports must name exactly that namespace.
const namespaceAnchors = { react: '__COMPILER_RUNTIME', 'react/jsx-runtime': 'jsxs', 'react-dom': 'flushSync' };
function assertNamespace(src, local, module) {
  const anchor = namespaceAnchors[module];
  const owners = new Set();
  for (const entry of src.top.values()) {
    const init = entry.kind === 'var' ? entry.node.init : null;
    if (init?.type === 'MemberExpression' && !init.computed && init.object.type === 'Identifier' && init.property.name === anchor) owners.add(init.object.name);
  }
  if (owners.size !== 1 || !owners.has(local)) throw Error(`vendor-frame ${local} is not the ${module} namespace (anchor ${anchor}: ${[...owners].join(', ') || 'none'})`);
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
// Module state a second copy would split (D46): a module-level WeakMap / Map / Set / WeakSet, a React context, or a
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

// The names a host adapter module exports (relative to src/generated/<area>/), parsed with Babel, never run.
async function hostExports(modules) {
  const out = new Map();
  for (const rel of modules) {
    const file = path.resolve(generatedRoot, 'x', rel);
    const code = await fs.readFile(file, 'utf8');
    const ast = babel.babelParse(code, file, true);
    const names = new Set();
    for (const node of ast.program.body) {
      if (node.type !== 'ExportNamedDeclaration') continue;
      for (const s of node.specifiers ?? []) names.add(s.exported.name ?? s.exported.value);
      const d = node.declaration;
      if (d?.id?.name) names.add(d.id.name);
      for (const v of d?.declarations ?? []) if (v.id.type === 'Identifier') names.add(v.id.name);
    }
    out.set(rel, names);
  }
  return out;
}
// `version` picks the source contract (default 3.6556.2, the production graph). `contract` (tests only): a variant of a
// source contract, run check-only so it can never write an output folder.
// `rehearse` (4.16336.0, analysis only): run the whole emission in memory even when D46 stops generation (each module
// state conflict is cut again like a pure held binding), never write or compare, and return { files, manifest,
// stateConflicts } so the rest of the contract (closure, globals, cycles, host adapter names) is proved ready.
export async function extractCoworkScheduled({ check = false, survey = false, rehearse = false, version = official3.referenceVersion, contract: variant } = {}) {
  if (variant && !check && !survey && !rehearse) throw Error('extract-cowork-scheduled: a contract variant runs with check: true only');
  const contract = variant ?? contracts[version];
  if (!contract) throw Error(`extract-cowork-scheduled has no ${version} source contract`);
  const { official, output, roots, literals, namespaceImports, vendorCopies, copyableVendors, adapters, rawCallSites, allowedGlobals } = contract;
  const { referenceVersion, referenceSnapshot } = official;
  const source = official.ionSource;
  const graph = contract.sharedGraph === 'cds-core' ? await cdsCoreGraph(official, contract.sharedGraph) : null;
  const cache = new Map();
  const { published, held, pending } = graph ? { published: new Map(), held: new Set(), pending: new Map() } : await viewTabsGraph(official);
  const rs = await routinesSharedGraph(official, contract.routinesShared);
  const linked = graph ? await linkedGraphsFor(official, contract.linkedGraphs) : new Map();
  const resolved = new Map();
  const chunks = new Map();
  // chunk -> Map(#init@start -> initializer statement entry) of the selected bindings (readSource `initializers`).
  const statements = new Map();
  const edges = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set(), linked: new Set() };
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
      // A binding routines-shared holds is imported, not replaced, unless the adapter says why this graph answers it
      // itself (`overridesShared`, a plain value, never a context): routines-shared keeps its own copy for its readers.
      if (rs.held.has(key) && !adapter.overridesShared) throw Error(`adapter ${key}: routines-shared holds this binding; import it, do not replace it`);
      if (rs.held.has(key) && rs.contexts.has(key)) throw Error(`adapter ${key}: a context routines-shared holds cannot be replaced`);
      if (graph?.published.has(key)) throw Error(`adapter ${key}: cds-core publishes this binding as ${graph.published.get(key).name}; link it, do not replace it`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(official, `adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(official, `adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name, ...(adapter.shared && { shared: true }) };
    } else if (rs.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: rs.adapters.get(key) };
    } else if (graph) {
      // 4.16336.0: one copy of each CDS binding (cds-core), of each routines binding (routines-shared-v4) and of each
      // binding a linked 4.16336.0 area holds.
      const shared = graph.published.get(key), owned = graph.held.get(key), link = linked.get(key);
      if (link) {
        if (shared || owned) throw Error(`${key} is linked from ${link.area} but cds-core ${shared ? `publishes it as ${shared.name}` : 'holds it'}; link cds-core`);
        if (!entry || entry.kind === 'import' || sha(declarationText(src, entry)) !== link.sha256) throw Error(`${key} differs from the declaration ${link.area}/${link.target} holds`);
        result = { kind: 'linked-graph', file, area: link.area, target: link.target, name: link.exportName, linkedSha256: link.sha256 };
      } else if (graph.adapters.has(key) && !shared && !owned) {
        const a = graph.adapters.get(key);
        result = { kind: 'cds-core-adapter', name: a.name, from: `../${a.module}` };
      } else if (namespaceImports[key]) {
        assertNamespace(src, local, namespaceImports[key]);
        result = { kind: 'react', module: namespaceImports[key], name: '*' };
      } else if (file === official.vendorFrame && !shared && reactAlias(official, src, local)) {
        const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
        result = { kind: 'react', module, name: member };
      } else if (shared) {
        // A root cds-core publishes (the CDS Field family, TextArea, Pictogram) is re-exported from cds-core by index.mjs.
        if (!entry || entry.kind === 'import') throw Error(`${key} (cds-core ${shared.name}) is not a declaration`);
        if (!owned?.sha256 || owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core publishes as ${shared.name}`);
        result = { kind: 'shared-graph', file, target: shared.target, name: shared.exportName, publicName: shared.name, linkedSha256: owned.sha256 };
      } else if (owned && entry && entry.kind !== 'import' && await moduleStateKind(official, source, src, entry, cache)) {
        stateConflicts.push({ binding: key, heldBy: `${graph.area}/${owned.target}`, kind: await moduleStateKind(official, source, src, entry, cache),
          text: declarationText(src, entry).slice(0, 400), reachedBy: reachedBy.map(k => k.replace(/-[\w-]{8}\.js#/, '#')).join(' <- ') });
        if (rehearse) {
          if (!heldByCdsCore.has(file)) heldByCdsCore.set(file, new Set());
          heldByCdsCore.get(file).add(local);
          result = { kind: 'generated', file, local };
        } else result = { kind: 'problem' };
      } else if (rs.held.has(key)) {
        const h = rs.held.get(key);
        if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: ${rs.dir} holds a different declaration; rerun its generator`);
        result = { kind: 'routines-shared', name: local, target: h.target, linkedSha256: h.sha256 };
      } else if (owned) {
        if (!entry || entry.kind === 'import') throw Error(`${key} (held by cds-core) is not a declaration`);
        if (owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core/${owned.target} holds`);
        if (!heldByCdsCore.has(file)) heldByCdsCore.set(file, new Set());
        heldByCdsCore.get(file).add(local);
        result = { kind: 'generated', file, local };
      } else if (file.startsWith('vendor-frame-')) {
        throw Error(`vendor-frame ${local} (${entry ? declarationText(src, entry).slice(0, 60) : '?'}) is neither a React export nor a cds-core binding`);
      } else if (file.startsWith('vendor-') && !vendorCopies[key] && !copyableVendors.some(prefix => file.startsWith(prefix))) {
        throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
      }
    } else if (namespaceImports[key]) {
      result = { kind: 'react', module: namespaceImports[key], name: '*' };
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(official, src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
      result = { kind: 'react', module, name: member };
    } else if (published.has(key)) {
      result = { kind: 'view-tabs', name: published.get(key), file };
    } else if (held.has(key)) {
      // view-tabs already holds this original declaration (one copy of each binding, so a context stays one object);
      // D1/D46: it is imported only by its semantic public name; a name view-tabs still holds back (`pendingNames`,
      // other areas slice that binding) is imported by its local until it is published, anything else stops here.
      if (!pending.has(key)) throw Error(`${key} is held by view-tabs without a semantic name; name it in extract-view-tabs.mjs (D46)`);
      result = { kind: 'view-tabs-held', name: local, file, pendingName: pending.get(key) };
    } else if (rs.held.has(key)) {
      const h = rs.held.get(key);
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: routines-shared holds a different declaration; rerun its generator`);
      result = { kind: 'routines-shared', name: local, target: h.target };
    } else if (file.startsWith('vendor-') && !vendorCopies[key] && !copyableVendors.some(prefix => file.startsWith(prefix))) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    }
    if (!result) {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (vendorCopies[key]) assertFeatures(official, `vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < +(process.env.SURVEY_DEPTH ?? 12); k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const trail = key => { const out = []; for (let k = key; k && out.length < 24; k = parent.get(k)) out.push(k); return out.slice(1); };
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'shared-graph': 'viewTabs', 'routines-shared': 'routinesShared', 'linked-graph': 'linked', 'cds-core-adapter': 'viewTabs' })[kind];
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key, trail(key)); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[bucket(cls.kind)].add(key); return; }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(source, file, cache);
    const reads = new Set();
    edges.set(key, reads);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, key) : { file, local: dep };
      const depKey = `${target.file}#${target.local}`;
      reads.add(depKey);
      await visit(depKey, key);
    }
    // The statements that initialise this binding come with it, and so does everything they read.
    for (const init of src.initializers.get(local) ?? []) {
      if (!statements.has(file)) statements.set(file, new Map());
      if (statements.get(file).has(init.id)) continue;
      statements.get(file).set(init.id, init);
      for (const dep of init.deps) {
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${key} ${init.id}`) : { file, local: dep };
        const depKey = `${target.file}#${target.local}`;
        reads.add(depKey);
        await visit(depKey, key);
      }
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(source, file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && spec.export !== null && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      // 4.16336.0: a root without an export alias must not be exported (a private root).
      if (spec.export === null && [...src.exported.values()].includes(local)) throw Error(`root ${file}#${local} (${spec.name}) is exported; pin its alias`);
      assertFeatures(official, `root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      if (contract.uniqueRoots) await assertUniqueRoot(official, `root ${spec.name}`, src, local, spec.features, { reads: spec.reads, source, cache });
      else if (spec.reads) throw Error(`root ${spec.name}: reads is a uniqueRoots pin`);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  for (const key of linked.keys())
    if (!used.linked.has(key)) { if (!survey) throw Error(`linked ${key} is not reached; remove it`); problems.push(`unreached link ${key}`); }
  // E3 (4.16336.0): every React Compiler helper cut again here is the one official.assertCompilerHelpers proves.
  if (graph && official.compilerHelpers) {
    const helperLocals = new Set(Object.values(official.compilerHelpers).map(h => h.local));
    if ([...(chunks.get(official.sharedFrame) ?? [])].some(local => helperLocals.has(local)))
      official.assertCompilerHelpers((await readSource(source, official.sharedFrame, cache)).code);
  }
  // D1 (4.16336.0): the bindings this graph cuts that another 4.16336.0 graph under src/generated also cuts. Reported
  // (survey, tests, the region report), not written into the output: those graphs are other areas' outputs.
  const d1 = [];
  if (graph) {
    const others = await otherTargetGraphs(official, new Set([path.basename(output), rs.dir, ...Object.values(contracts).map(c => path.basename(c.output))]));
    for (const [file, locals] of chunks) for (const local of locals) {
      const key = `${file}#${local}`;
      if (heldByCdsCore.get(file)?.has(local) || !others.has(key)) continue;
      d1.push({ binding: key, areas: [...new Set(others.get(key))].sort() });
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
    if (process.env.SURVEY_CALLS) for (const [file, locals] of chunks) { const s = await readSource(source, file, cache); for (const l of locals) { const e = s.top.get(l); const init = e.kind === 'var' ? e.node.init : null; if (init && /Call|New/.test(init.type)) console.log('CALL', file.slice(0, 12), l, declarationText(s, e).slice(0, 110)); if (/Must (?:be called|call) (?:with)?in/.test(declarationText(s, e))) console.log('PROVIDER', file.slice(0, 12), l, declarationText(s, e).slice(0, 140)); } }
    console.log('total', total, 'shared', used.routinesShared.size, 'sharedAdapters', [...used.sharedAdapters].join(' '));
    if (graph) console.log('cds-core links', used.viewTabs.size, 'heldByCdsCore', [...heldByCdsCore.values()].reduce((n, s) => n + s.size, 0), 'd1', d1.length);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    // SURVEY_CUT=n: the n bindings whose replacement by an adapter would drop the most bytes (dominated subtree).
    if (process.env.SURVEY_CUT) {
      const sizes = new Map();
      for (const k of edges.keys()) sizes.set(k, await size(k));
      const rootKeys = Object.entries(roots).flatMap(([f, names]) => Object.keys(names).map(l => `${f}#${l}`));
      const reach = cut => { const seen = new Set(), st = [...rootKeys]; let b = 0; while (st.length) { const k = st.pop(); if (k === cut || seen.has(k) || !edges.has(k)) continue; seen.add(k); b += sizes.get(k); for (const d of edges.get(k)) st.push(d); } return b; };
      const all = reach(null);
      const candidates = [...edges.keys()].filter(k => !rootKeys.includes(k)).map(k => [k, subtree(k)]).sort((a, b) => b[1].size - a[1].size).slice(0, 400);
      const saved = [];
      for (const [k] of candidates) saved.push([all - reach(k), k]);
      saved.sort((a, b) => b[0] - a[0]);
      for (const [b, k] of saved.slice(0, +process.env.SURVEY_CUT)) { const [f, l] = k.split('#'); const s = await readSource(source, f, cache); console.log('  cut', b, k, '<-', [...cross.get(k) ?? []].slice(0, 3).join(' '), '|', declarationText(s, s.top.get(l)).slice(0, 110).replace(/\s+/g, ' ')); }
    }
    // SURVEY_DIRECT=file#local,…: each direct dependency with its classification, subtree bytes and declaration head.
    for (const k of (process.env.SURVEY_DIRECT ?? '').split(',').filter(Boolean)) {
      console.log('DIRECT', k);
      const rows = [];
      for (const d of edges.get(k) ?? []) {
        const cls = resolved.get(d);
        let b = 0; if (cls?.kind === 'generated') for (const x of subtree(d)) b += await size(x);
        const [f, l] = d.split('#'); const s = await readSource(source, f, cache); const e = s.top.get(l);
        rows.push([b, `${d} [${cls?.kind}${cls?.name ? ' ' + cls.name : ''}]`, e ? declarationText(s, e).slice(0, +(process.env.SURVEY_HEAD ?? 90)).replace(/\s+/g, ' ') : '']);
      }
      rows.sort((a, b) => b[0] - a[0]);
      for (const r of rows) console.log('   ', r[0], r[1], '|', r[2]);
    }
    return { problems, stateConflicts, d1, chunks, resolved, used, heldByCdsCore };
  }
  // D46: module state cds-core holds without a publicName stops generation; nothing is written or checked.
  if (stateConflicts.length && !rehearse) {
    const error = Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    throw error;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-scheduled.mjs', adapterModule: 'src/source-routine-cowork-adapters.jsx',
    sharedAdapterModule: 'src/source-routines-shared-adapters.jsx',
    ...(graph ? { sharedGraph: graph.area, routinesShared: rs.dir, isolatedGraph: contract.isolatedGraph } : {}),
    publicNames: {}, literals: {}, modules: [], contexts: [], callSites: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const sharedTargets = new Set(), rsTargets = new Set();
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(source, file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const inits = [...(statements.get(file)?.values() ?? [])].sort((a, b) => a.node.start - b.node.start);
    // A statement writes only bindings this module declares (never one it imports from another graph).
    for (const init of inits) for (const t of init.targets)
      if (!locals.has(t)) throw Error(`${file} ${init.id} writes ${t}, which this graph does not copy (${resolved.get(`${file}#${t}`)?.kind ?? 'unselected'})`);
    const imports = new Map();
    for (const [local, deps] of [...order.map(([local]) => [local, declarationDeps(src, local)]), ...inits.map(init => [init.id, init.deps])]) {
      for (const dep of deps) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: cls.shared ? sharedAdapterModule : adapterModule, name: cls.name, kind: cls.shared ? 'shared-adapter' : 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'shared-graph') { spec = { from: `../${graph.area}/${cls.target}`, name: cls.name, kind: cls.kind, linkedSha256: cls.linkedSha256 }; sharedTargets.add(cls.target); }
        else if (cls.kind === 'linked-graph') spec = { from: `../${cls.area}/${cls.target}`, name: cls.name, kind: cls.kind, linkedSha256: cls.linkedSha256 };
        else if (cls.kind === 'cds-core-adapter') spec = { from: cls.from, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'routines-shared') {
          spec = { from: `../${rs.dir}/${cls.target}`, name: cls.name, kind: 'routines-shared', ...(graph && { linkedSha256: cls.linkedSha256 }) };
          rsTargets.add(cls.target);
        } else if (cls.kind === 'generated') {
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
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`) || rs.held.has(`${file}#${local}`) || graph?.held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
        manifest.contexts.push(`${file}#${local}`);
      }
    }
    const groups = new Map();
    const namespaceLines = [];
    for (const [local, spec] of imports) {
      if (spec.name === '*') { namespaceLines.push(`import * as ${local} from ${JSON.stringify(spec.from)};`); continue; }
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).concat(namespaceLines.sort()).join('\n');
    const emittedNodes = new Set();
    const statementText = init => { const text = declarationText(src, init); return init.node.type === 'ExpressionStatement' && !text.endsWith(';') ? `${text};` : text; };
    const blocks = [...order.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => [entry.node.start, emittedText(src, entry)]),
      ...inits.map(init => [init.node.start, statementText(init)])].sort((a, b) => a[0] - b[0]).map(([, text]) => text);
    const exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-scheduled.mjs.\n// Edit the extractor or src/source-routine-cowork-adapters.jsx, never this file.\n`;
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
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via, ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      ...(inits.length && { statements: inits.map(init => ({ start: init.node.start, targets: init.targets, sha256: sha(declarationText(src, init)) })) }),
      ...(graph ? { heldByCdsCore: [...(heldByCdsCore.get(file) ?? [])].sort() } : {}),
    });
  }
  if (unboundGlobals.length && !rehearse) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
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
    // A root routines-shared holds (the card menu, the scheduled copy) is re-exported from there under its semantic name;
    // so is a root view-tabs publishes (D1, w11-pictogram-d1: the CDS Pictogram KG and TextArea nk) or, in 4.16336.0,
    // one cds-core publishes, under this graph's name for it, so the index keeps its names (R4) while the binding stays
    // one copy.
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../${rs.dir}/${cls.target}`
        : cls?.kind === 'view-tabs' ? `../view-tabs/${cls.file}` : cls?.kind === 'shared-graph' ? `../${graph.area}/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      if (cls.kind === 'shared-graph') sharedTargets.add(cls.target);
      if (cls.kind === 'routines-shared') rsTargets.add(cls.target);
      manifest.publicNames[spec.name] = { file, local, ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }), ...(cls.kind === 'view-tabs' && { viewTabs: cls.name }),
        ...(cls.kind === 'shared-graph' && { cdsCore: cls.publicName }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${cls.kind === 'view-tabs' || cls.kind === 'shared-graph' ? cls.name : local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  // Literal class strings: the exact source text of a string literal inside its official owner declaration.
  for (const [name, spec] of Object.entries(literals)) {
    const src = await readSource(source, spec.file, cache);
    const entry = src.top.get(spec.owner);
    if (!entry || entry.kind === 'import') throw Error(`literal ${name}: ${spec.file}#${spec.owner} is not a declaration`);
    const ast = babel.babelParse(emittedText(src, entry), `${spec.file}#${spec.owner}`, true);
    const hits = [];
    babel.traverse(ast, { StringLiteral(p) { if (p.node.value === spec.value) hits.push(p.node.value); } });
    if (hits.length !== (spec.count ?? 1)) throw Error(`literal ${name}: ${JSON.stringify(spec.value)} occurs ${hits.length} times in ${spec.owner}, expected ${spec.count ?? 1}`);
    manifest.literals[name] = { file: spec.file, owner: spec.owner, value: spec.value };
    indexLines.push(`// ${spec.file} ${spec.owner}: ${spec.role}\nexport var ${name} = ${JSON.stringify(spec.value)};`);
  }
  files['index.mjs'] = await format(`// Semantic names for the cowork-scheduled roots; generated by extract-cowork-scheduled.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name, ...(spec.shared && { module: 'src/source-routines-shared-adapters.jsx' }) });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
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
    // The modules this graph links, by bytes: cds-core, routines-shared-v4 and any linked area (a regeneration there must
    // be followed by a rerun here and --check).
    manifest.sharedGraphModules = Object.fromEntries([...sharedTargets].sort().map(target => [target, graph.modules.get(target).sha256]));
    manifest.linkedGraphModules = Object.fromEntries([...[...rsTargets].map(t => [`${rs.dir}/${t}`, rs.modules.get(t)]),
      ...[...linked.values()].map(l => [`${l.area}/${l.target}`, l.moduleSha256])].sort((a, b) => a[0].localeCompare(b[0])));
    manifest.linkedAreas = [rs.dir, ...new Set([...linked.values()].map(l => l.area))];
  }
  // 4.16336.0: every host adapter name this graph imports is exported by its module today (parsed, not run), so the staged
  // graph never links a name the host does not have; a missing one is a host patch, not a generated stub.
  if (graph) {
    const hostImports = manifest.modules.flatMap(m => m.imports).filter(i => ['adapter', 'shared-adapter', 'cds-core-adapter'].includes(i.kind));
    const exportsOf = await hostExports([...new Set(hostImports.map(i => i.from))]);
    const missing = hostImports.filter(i => !exportsOf.get(i.from).has(i.name)).map(i => `${i.from}:${i.name}`);
    if (missing.length) throw Error(`host adapters not exported: ${[...new Set(missing)].join(', ')}`);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (rehearse) return { files, manifest, stateConflicts, d1, unboundGlobals };
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork scheduled ${graph ? `${referenceVersion} ` : ''}output set changed: ${present.join(',')}. Run scripts/extract-cowork-scheduled.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork scheduled ${graph ? `${referenceVersion} ` : ''}source mismatch: ${name}. Run scripts/extract-cowork-scheduled.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork scheduled modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports${graph ? `, ${graph.area} ${graph.manifestSha256.slice(0, 8)}, ${d1.length} D1 overlaps` : ''}).`);
  if (graph) Object.defineProperty(manifest, 'd1', { value: d1, enumerable: false });
  return manifest;
}
// The contracts run without --version: every contract D46 does not block (today the 3.6556.2 production contract only).
export const defaultVersions = Object.freeze(contractVersions.filter(v => !contracts[v].blockedByD46?.length));
// `node scripts/extract-cowork-scheduled.mjs [--check] [--survey] [--version <v>]`: without --version, defaultVersions;
// `--version 4.16336.0` runs the isolated contract (it stops with the D46 report while blockedByD46 is non-empty).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : defaultVersions;
  for (const version of versions)
    await extractCoworkScheduled({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey'), version });
}
