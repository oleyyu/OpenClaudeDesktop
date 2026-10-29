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
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/cowork-scheduled');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const routinesShared = path.join(root, 'src/generated/routines-shared');
const adapterModule = '../../source-routine-cowork-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

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
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
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
async function viewTabsGraph() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
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
async function routinesSharedGraph() {
  const manifest = await routinesSharedManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`routines-shared is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { held, adapters: shared, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

export async function extractCoworkScheduled({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  const rs = await routinesSharedGraph();
  const resolved = new Map();
  const chunks = new Map();
  // chunk -> Map(#init@start -> initializer statement entry) of the selected bindings (readSource `initializers`).
  const statements = new Map();
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
      // A binding routines-shared holds is imported, not replaced, unless the adapter says why this graph answers it
      // itself (`overridesShared`, a plain value, never a context): routines-shared keeps its own copy for its readers.
      if (rs.held.has(key) && !adapter.overridesShared) throw Error(`adapter ${key}: routines-shared holds this binding; import it, do not replace it`);
      if (rs.held.has(key) && rs.contexts.has(key)) throw Error(`adapter ${key}: a context routines-shared holds cannot be replaced`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: rs.adapters.get(key) };
    } else if (namespaceImports[key]) {
      result = { kind: 'react', module: namespaceImports[key], name: '*' };
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
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
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'routines-shared': 'routinesShared' })[kind];
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[bucket(cls.kind)].add(key); return; }
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
    // The statements that initialise this binding come with it, and so does everything they read.
    for (const init of src.initializers.get(local) ?? []) {
      if (!statements.has(file)) statements.set(file, new Map());
      if (statements.get(file).has(init.id)) continue;
      statements.get(file).set(init.id, init);
      for (const dep of init.deps) {
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${key} ${init.id}`) : { file, local: dep };
        const depKey = `${target.file}#${target.local}`;
        reads.add(depKey);
        await visit(depKey, key);
      }
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    if (process.env.SURVEY_CALLS) for (const [file, locals] of chunks) { const s = await readSource(file, cache); for (const l of locals) { const e = s.top.get(l); const init = e.kind === 'var' ? e.node.init : null; if (init && /Call|New/.test(init.type)) console.log('CALL', file.slice(0, 12), l, declarationText(s, e).slice(0, 110)); if (/Must (?:be called|call) (?:with)?in/.test(declarationText(s, e))) console.log('PROVIDER', file.slice(0, 12), l, declarationText(s, e).slice(0, 140)); } }
    console.log('total', total, 'shared', used.routinesShared.size, 'sharedAdapters', [...used.sharedAdapters].join(' '));
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
      for (const [b, k] of saved.slice(0, +process.env.SURVEY_CUT)) { const [f, l] = k.split('#'); const s = await readSource(f, cache); console.log('  cut', b, k, '<-', [...cross.get(k) ?? []].slice(0, 3).join(' '), '|', declarationText(s, s.top.get(l)).slice(0, 110).replace(/\s+/g, ' ')); }
    }
    // SURVEY_DIRECT=file#local,…: each direct dependency with its classification, subtree bytes and declaration head.
    for (const k of (process.env.SURVEY_DIRECT ?? '').split(',').filter(Boolean)) {
      console.log('DIRECT', k);
      const rows = [];
      for (const d of edges.get(k) ?? []) {
        const cls = resolved.get(d);
        let b = 0; if (cls?.kind === 'generated') for (const x of subtree(d)) b += await size(x);
        const [f, l] = d.split('#'); const s = await readSource(f, cache); const e = s.top.get(l);
        rows.push([b, `${d} [${cls?.kind}${cls?.name ? ' ' + cls.name : ''}]`, e ? declarationText(s, e).slice(0, +(process.env.SURVEY_HEAD ?? 90)).replace(/\s+/g, ' ') : '']);
      }
      rows.sort((a, b) => b[0] - a[0]);
      for (const r of rows) console.log('   ', r[0], r[1], '|', r[2]);
    }
    return null;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-scheduled.mjs', adapterModule: 'src/source-routine-cowork-adapters.jsx',
    sharedAdapterModule: 'src/source-routines-shared-adapters.jsx', publicNames: {}, literals: {}, modules: [], contexts: [], callSites: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
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
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'routines-shared') spec = { from: `../routines-shared/${cls.target}`, name: cls.name, kind: 'routines-shared' };
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
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`) || rs.held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
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
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via })),
      ...(inits.length && { statements: inits.map(init => ({ start: init.node.start, targets: init.targets, sha256: sha(declarationText(src, init)) })) }),
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
    // A root routines-shared holds (the card menu, the scheduled copy) is re-exported from there under its semantic name;
    // so is a root view-tabs publishes (D1, w11-pictogram-d1: the CDS Pictogram KG and TextArea nk), under this graph's
    // name for it, so the index keeps its names (R4) while the binding stays one copy.
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../routines-shared/${cls.target}`
        : cls?.kind === 'view-tabs' ? `../view-tabs/${cls.file}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }), ...(cls.kind === 'view-tabs' && { viewTabs: cls.name }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${cls.kind === 'view-tabs' ? cls.name : local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  // Literal class strings: the exact source text of a string literal inside its official owner declaration.
  for (const [name, spec] of Object.entries(literals)) {
    const src = await readSource(spec.file, cache);
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
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork scheduled output set changed: ${present.join(',')}. Run scripts/extract-cowork-scheduled.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork scheduled source mismatch: ${name}. Run scripts/extract-cowork-scheduled.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork scheduled modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCoworkScheduled({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
