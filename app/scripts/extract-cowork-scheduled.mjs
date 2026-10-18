// R4g-routines RTC (CW-1, tasks-cowork-scheduled-2.42304; D0/D32): extract the 2.42304.0 Cowork Scheduled page pieces the
// host page src/source-routines.jsx composes, replacing the 2.31226.0 roots current-chat used to carry for it
// (cdbc75b4b Fi / yi / Ii, ccd3f68fe _o / gc / fc / dc, c97b955f1 ga, shared-18 GV, shared-16 Id, shared-150 dL,
// ca0c38004 n and the shared-frame field parts). Own generator, own output folder src/generated/cowork-scheduled, own
// scripts/verify-gen-cowork-scheduled.mjs (decision D0).
//
//   ccd3f68fe  qo (the scheduled task detail, old _o), el (the starter template card, old gc), Xc (the templates, old fc),
//              Yc (their copy, old dc); the task grid's class (ws) and the template grid's classes (Qc) as literals.
//   c97b955f1  Ca (UpsertScheduledTaskModal, old ga).
//   shared-156 sB (the pictogram, old shared-150 dL) and ca0c38004 n (its ObjectStopwatch asset, an unchanged file).
//   shared-frame xO / SO / CO / wO / RT (the CDS Field family the form renders), for the page's native field registry.
//
// The cards (cdbc75b4b Ji / ji / Yi) come from src/generated/routines-shared (R4g-routines RT0, WI-0). The card menu
// (shared-18 Az, old GV) and the scheduled copy (shared-16 gd, old Id) are routines-shared's too and are re-exported from
// there under semantic names. Every binding routines-shared holds is imported from it instead of sliced a second time, so
// a React context stays one object across the Code and Cowork pages.
//
// The engine is the RT0 one (scripts/extract-routines-shared.mjs): every emitted binding is an original top-level
// declaration sliced from the installed chunk, the bindings of each chunk are the reachable closure of the roots across
// chunks (free variables resolved through import statements and re-export chains), nothing is hand-picked, and a renamed
// or re-pointed minified import fails generation. A binding resolves, in this order, to: a host adapter of this graph
// (src/source-routine-cowork-adapters.jsx; its original declaration must carry `features`), a host adapter routines-shared
// already uses for it (src/source-routines-shared-adapters.jsx), a namespace / verified React export of vendor-frame, a
// semantic public name of view-tabs (D1/D24/D46), a binding routines-shared holds, or a copy in this
// graph's module for its chunk. Differences from the RT0 engine: a destructuring declarator is copied once (all its names);
// declarations of the UI library chunks view-tabs also copies (Base UI vendor-frame / vendor-base-ui, vendor-all-0,
// vendor-icons) are copied; an adapter may answer a plain value routines-shared also holds when it says why
// (`overridesShared`, never a context). A service vendor binding (react-query, zod, GrowthBook, Datadog, react-intl, the
// router), a class declaration, a dynamic import, a React context another graph holds, or a binding view-tabs holds
// without a semantic name (D46: name it in extract-view-tabs.mjs; a name it lists in `pendingNames` is imported by
// its local until published) stops generation. --survey prints
// the closure's size by chunk, the heaviest cross-chunk edges and (SURVEY_CUT / SURVEY_DIRECT) cut candidates, without
// writing anything.
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
const output = path.join(root, 'src/generated/cowork-scheduled');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const routinesShared = path.join(root, 'src/generated/routines-shared');
const adapterModule = '../../source-routine-cowork-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, features }. `features` must appear in the root's prettier form.
const roots = {
  'ccd3f68fe-DGWS8cEm.js': {
    qo: { name: 'ScheduledTaskDetail', features: ['routineRead: u = "unavailable",', 'onTakeComputerWayBack: _e,', 'readOnlyNotice: Ae,', '"Approvals you grant during a run appear here."'] },
    el: { name: 'ScheduledTaskTemplateCard', features: ['function el({ template: e, busy: t = !1, disabled: n = !1, onSelect: r }) {', 'title: i.formatMessage(Yc[e.title]),', 'preview: Jc[e.id],'] },
    Xc: { name: 'SCHEDULED_TASK_TEMPLATES', features: ['id: "daily_briefing",', 'cron: "0 8 * * 1-5",', 'id: "monitor_topic",', 'prompt: "monitorTopicPrompt",'] },
    Yc: { name: 'scheduledTaskTemplateMessages', features: ['heading: { defaultMessage: "Or start from a template", id: "UNcFp+is2w" },', 'dailyBriefingTitle: { defaultMessage: "Daily briefing", id: "ZQwJxzS4/G" },'] },
  },
  'c97b955f1-BlGH1qrk.js': {
    Ca: { name: 'UpsertScheduledTaskModal', features: ['collideWithCodeRoutines: ie = !1,', 'onSetUpWithClaude: je,', '"Scheduled task creation isn\'t available. Restart the desktop app to enable this feature."'] },
  },
  'shared-156-Bikz018e.js': {
    sB: { name: 'Pictogram', features: ['highlightFill: n = "default",', '"data-cds": "Pictogram",'] },
  },
  'ca0c38004-CEGIs7-p.js': {
    n: { name: 'STOPWATCH_PICTOGRAM', features: ['name: "ObjectStopwatch",'] },
  },
  // Held by routines-shared (re-exported): the card menu (old shared-18 GV) and the scheduled-task copy (old shared-16 Id).
  'shared-18-D4XxL6Tg.js': {
    Az: { name: 'ScheduledTaskMenu', features: ['{ defaultMessage: "More options for {label}", id: "rKQPgfPvWS" },', 'showPauseToggle: d = !0,'] },
  },
  'shared-16-B0xHzPjj.js': {
    gd: { name: 'SCHEDULED_TASK_COPY', features: ['var gd = { kind: "scheduled", ...md };'] },
  },
  // The form's field parts (CDS Field / Label / Description / Error / TextArea over Base UI Field), which the host's
  // native field registry recognises (source-field-adapters.jsx registerNativeFieldComponents).
  'shared-frame-BfjMqbuN.js': {
    xO: { name: 'CdsField', features: ['"data-cds": "Field",', 'className: X("flex flex-col gap-xs font-sans", e),'] },
    SO: { name: 'CdsFieldLabel', features: ['"text-body font-medium leading-none text-primary"'] },
    CO: { name: 'CdsFieldDescription', features: ['"text-footnote font-normal leading-snug",'] },
    wO: { name: 'CdsFieldError', features: ['"flex items-start gap-1 text-footnote font-normal leading-snug text-danger",', 'name: "WarningCircle",'] },
    RT: { name: 'CdsTextArea', features: ['resize: n = "none",', 'autosize: r = !1,'] },
  },
};
// Class strings the host page applies to its own list elements, pinned in their official owner (exact value, once).
const literals = {
  routineGridClass: { file: 'ccd3f68fe-DGWS8cEm.js', owner: 'ws', value: 'mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6',
    role: 'the scheduled task grid (also Bl, the list route, with the starting opacity)' },
  routineTemplateGridClass: { file: 'ccd3f68fe-DGWS8cEm.js', owner: 'Qc', value: 'grid w-full grid-cols-1 gap-x-6 gap-y-md', role: 'the starter template grid' },
  routineTemplateColumnsClass: { file: 'ccd3f68fe-DGWS8cEm.js', owner: 'Qc', value: 'md:grid-cols-2', role: 'its two columns (columns === 2)' },
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
const vendorCopies = {};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand): their declarations are copied like any
// other. Service / data vendors (react-query, zod, GrowthBook, Datadog, react-intl, the router) are never copied.
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
// vendor-frame's CommonJS interop bindings for React itself map to namespace imports, never to a copy.
const namespaceImports = { 'vendor-frame-DfPJ1QmD.js#o': 'react', 'vendor-frame-DfPJ1QmD.js#fe': 'react/jsx-runtime', 'vendor-frame-DfPJ1QmD.js#Ln': 'react-dom' };
// Host services of this graph: chunk -> original local -> { name, features, also, overridesShared }. Each one is
// documented where it is implemented (src/source-routine-cowork-adapters.jsx).
const adapters = {
  'shared-0-ByI5P0CP.js': {
    // The desktop bridge window["claude.web"].CoworkScheduledTasks. routines-shared keeps its own (undefined) copy for the
    // cloud-migration checks it reads (shared-2 oO / zw); the form, detail and menu here read the host bridge.
    Ux: { name: 'CoworkScheduledTasks', overridesShared: true, features: ['Ux = globalThis["claude.web"]?.CoworkScheduledTasks'] },
    // The ConfigurationProvider value (the web app's boot configuration); throws outside the provider.
    zJ: { name: 'useAppConfiguration', features: ['"useConfiguration must be called from within ConfigurationProvider"'] },
    // The Datadog RUM error reporter (o11y): no telemetry here (D17).
    LA: { name: 'reportError', features: ['var LA = L(RA, I.O11Y_INTERNALS);'] },
  },
  'shared-1-CAAiD7E3.js': {
    // The surface model catalog. routines-shared answers it with { models, hasModel, servesModel, cdsCatalog } for the
    // stale-model check; the form reads the whole official catalog object (selectableModels, nameFor, entryFor,
    // requiresAutoMode, isNonSelectable, disabledReasonFor …), so this graph answers it with that shape over the host's
    // model list.
    FP: { name: 'useCoworkModelCatalog', features: ['extraLongContextIds: t.extraLongContextIds,', 'setStoredModel: a.setModel,'] },
  },
  'shared-52-DGviI8xb.js': {
    bP: { name: 'useServedDeploymentConfig', features: ['let { asks: e, query: t } = rP(),', 'n = e ? t.data?.served : void 0;'] },
  },
  'shared-5-kdJVRUsT.js': {
    EM: { name: 'useSkillChipCatalog', features: ['{ skills: t } = Cn(),', 'source: "cowork",', 'source: "plugin",'] },
  },
  'shared-13-C8pTuOID.js': {
    N: { name: 'SkillChip', features: ['function N({ id: e, info: a }) {', 'return a.unresolved'] },
  },
  'shared-78-D6VXYXaQ.js': {
    // A server-assigned gate (the configuration's serverGateNames, else the gate store) and GrowthBook: none here.
    WK: { name: 'useServerGate', features: ['let t = GK(e);', 'return O(e) && t;'], also: { JK: ['let { serverGateNames: t } = pn(),'] } },
    pz: { name: 'useDeviceRegistryQuery', features: ['cr(`/api/organizations/${c}/cowork/devices`, {', 'refetchInterval: e ? t : !1,'] },
    V: { name: 'useClaudeAiFeature', features: ['return Wp[e].useAvailable();'],
      also: { B: ['return n ? (r.isAvailable ? yp : r) : bp;'], bp: ['status: "blocked_by_platform",', 'isAvailable: !1,', 'isPolicyBlocked: !0,', 'isUpsellEligible: !1,'] } },
  },
  'c3a5facd2-C8tl80Ln.js': {
    F: { name: 'SessionHostHoldAction', features: ['{ openConnectorLink: h, connectorLinkModal: g } = k(void 0),', '"session-host-connection-hold-pending"'] },
    I: { name: 'SessionHostHoldNote', features: ['"session host connection hold"', '"session-host-connection-hold-none"'] },
  },
  'shared-8-B5lJ8U5C.js': {
    _D: { name: 'useProjectsReady', features: ['t = _p({ enabled: !e, untilSettled: !0 });', 'return e || t;'] },
    rB: { name: 'FolderPicker', features: ['controlledSelection: r,', 'browsePrompt: d,', 'remoteWorkspaceTraffic: L = "cowork",', 'handleBrowse: le,'] },
  },
  'shared-4-CJsHhp5n.js': {
    xh: { name: 'useRemoteToolGrants', features: ['"[useCoworkScheduledTaskRemoteGrants] fetch failed"', 'removeGrant: j,', 'stillAllowed: A,', '? "unavailable"'] },
  },
  'c0efc2620-D6kh0Iid.js': {
    _e: { name: 'useRoutineDraftGenerator', features: ['/dust/generate_routine_draft`,', 'generateRoutineDraft: u('] },
  },
  'shared-18-D4XxL6Tg.js': {
    eB: { name: 'useTaskFileModelUnavailable', features: ['queryKey: ["cowork-scheduled-task-frontmatter-model", e.id],', 'Nt?.getScheduledTaskFileContent?.(e.id)'] },
    Uz: { name: 'useCodeRoutineNames', features: ['{ data: l, isLoading: u } = wn({ enabled: s, excludeTags: FS });', 'if (!s) return Hz;'] },
    sC: { name: 'useUnifiedRoutineForm', features: ['let e = oC(),', 'return e === !0 && t && n === !0;'] },
    dC: { name: 'useCodeRoutineCreateOffered', features: ['n = WS() === !0;', 'return e && t && !n && !!bt?.createScheduledTask;'] },
    pC: { name: 'useCloudEnvironmentsMissing', features: ['{ data: a, isError: o, isPaused: s } = BS({ enabled: e && i });', 'if (fC(t?.environments ?? [], a?.pools?.length ?? 0)) return !0;'] },
    o_: { name: 'unusedConfigSchema', features: ['autoDownloadInBackground: o().default(a_.autoDownloadInBackground),', 'showScheduledTaskExactTimeOption: o().optional(),'] },
    i_: { name: 'unusedConfigSchema', features: ['var i_ = e();'] },
  },
  'shared-156-Bikz018e.js': {
    Pb: { name: 'useConnectorLookup', features: ['return X(Nb);'], also: { jb: ['remoteServers: e.remoteServers,', 'internalToolsOnlyNames: e.internalToolsOnlyNames,'] } },
  },
  'shared-26-CgdP_nTj.js': {
    ob: { name: 'toolLabelInfo', features: ['return Ut(e, t, "forLabel");'] },
    AT: { name: 'useUnsupervisedPermissionModes', features: ['e.has("auto") && n && i && r.add("auto"),', 'e.has("bypassPermissions") && t && r.add("bypassPermissions"),'],
      also: { kT: ['L("cowork_auto_permission_mode")', 'L("cowork_bypass_permissions_mode");'] } },
  },
  'shared-25-DP8p7i1Z.js': {
    // A GrowthBook feature's evaluation (Ls over the GrowthBook context; routines-shared's As throws without a provider).
    Rs: { name: 'useGrowthBookFeature', features: ['return Ls(ks(), e);'] },
    bc: { name: 'useDynamicConfig', features: ['() => Ws(r?.shared, i, a, n, t, { type: "dynamic_config", name: e }),'] },
  },
  'cae55dd08-oEwAOna-.js': {
    h: { name: 'unavailableCodeRoutineChunk', features: ['id: "routine_code_state_engine",'] },
    v: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_local_create_engine",'] },
    l: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_routine_create_form",'] },
    f: { name: 'unavailableCodeRoutineChunk', features: ['id: "code_local_routine_create_form",'] },
  },
  'shared-182-eT1kXtya.js': {
    $P: { name: 'useDismissedBanners', features: ['dismissed_claudeai_banners ?? [],', 'dismissMany: a,', 'isDismissed: i,'] },
    Pk: { name: 'useComposerDraftState', features: ['return hk(e, t);'], also: { hk: ['let n = x(fk) || mk();'] } },
  },
  'shared-7-B8UIMGDr.js': {
    RT: { name: 'ConnectorServerIcon', features: ['fallbackToGlobe: i,', '"data-testid": "connector-icon-globe-fallback",'] },
    sx: { name: 'EffortControl', features: ['import("./c8e04f916-__6cSvtd.js").then(', 'default: e?.EffortControl ?? cx'] },
    lg: { name: 'useAppNavigate', features: ['(vn(n) || e.push(n), t && Ua());'] },
    uT: { name: 'useThisDeviceName', features: ['return lT(e ? t?.registryRowId : void 0)?.display_name || t?.displayName;'] },
    zk: { name: 'useRefusalFallback', features: ['n = Rl((e) => e.sessionContext?.rewindSession),', '"claudeai.cowork.refusal_fallback.edit_retry_clicked"'] },
    Tg: { name: 'useSubscriptionPastDue', features: ['o === "stripe_subscription_contracted" ||', '{ isRavenPastDue: f } = rm({ enabled: t && d, recheckWhilePastDue: r });'] },
  },
  'c97b955f1-BlGH1qrk.js': {
    _i: { name: 'SavedProjectCard', features: ['"data-testid": "routine-saved-project-link",', 'webBehavior: "new-tab",'] },
    hi: { name: 'RemoteApprovalsList', features: ['function hi({ approvals: e, bindings: t, revoked: n, onRevoke: r }) {'] },
    fi: { name: 'RemoteApprovalsEmpty', features: ['function fi({ approvalsBypassed: e }) {'] },
  },
};
// Raw minified text the host page and its adapters follow (each must occur exactly once).
const rawCallSites = [
  { source: 'ccd3f68fe-DGWS8cEm.js', role: 'The official list renders the cards in this grid, asks the form for the Code routine name collision, and marks a run "Only this computer" by its ranOn',
    features: ['className:y("mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6",B&&"opacity-50 transition-opacity")', 'collideWithCodeRoutines:!0', 'e.ranOn==="this_computer"&&'] },
  { source: 'c97b955f1-BlGH1qrk.js', role: 'The form offers local tasks when the CoworkScheduledTasks bridge can create them, saves through the page bridge (dh), and requires a description for a local task',
    features: ['qs=!!le?.createScheduledTask&&!w?.localTasksOff', 'Np=Rl&&W.trim().length===0', 'var Ki=e({UpsertScheduledTaskModal:()=>Ca})'] },
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'MessagePort', 'ClipboardItem', 'Blob', 'Float64Array', 'crypto', 'indexedDB', 'arguments',
  // react-aria (the calendar, cff2bf6cb) reads these behind typeof guards to detect a test environment.
  'IS_REACT_ACT_ENVIRONMENT', 'jest']);

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
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
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
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
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
  const manifest = JSON.parse(await fs.readFile(path.join(routinesShared, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`routines-shared is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { held, adapters: shared, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');

export async function extractCoworkScheduled({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  const rs = await routinesSharedGraph();
  const resolved = new Map();
  const chunks = new Map();
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
    } else if (file.startsWith('vendor-frame-') && !published.has(key) && /^[\w$]+=(?:o|fe|Ln)\.[\w$]+$/.test(entry?.kind === 'var' ? declarationText(src, entry) : '')) {
      const text = entry && entry.kind === 'var' ? declarationText(src, entry) : '';
      const m = /^([\w$]+)=([\w$]+)\.([\w$]+)$/.exec(text);
      const module = m && reactNamespaces[m[2]];
      if (module && reactMembers[module].has(m[3])) result = { kind: 'react', module, name: m[3] };
      else throw Error(`vendor-frame ${local} (${text.slice(0, 60)}) is not a known React export`);
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
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
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
    const blocks = order.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => emittedText(src, entry));
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
    // A root routines-shared holds (the card menu, the scheduled copy) is re-exported from there under its semantic name.
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../routines-shared/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${local} as ${spec.name}`);
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
      const count = text.split(feature).length - 1;
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
