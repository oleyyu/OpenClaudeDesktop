// R4g-routines RT0 (tasks-code-routines WI-0, D32): extract the 2.42304.0 routines pieces both the Code Routines page
// (WI-4 / WI-5) and the Cowork Scheduled upgrade (CW-1) share, without executing any desktop runtime (decision D0: own
// generator, own output folder src/generated/routines-shared, own scripts/verify-gen-routines-shared.mjs).
//
//   cdbc75b4b  the 24 exports cbd6c85c8 (CodeRoutines routes) imports plus the two cfc18e0f4 (local routine detail) adds:
//              the routine / scheduled-task card Ji with its status ji and divider Yi (the Cowork page's old Fi / yi / Ii),
//              filters (K / ir / ar / or / fr / pr), sort li, scope tab gi, hidden-count chips bi, status helpers
//              ($n / er / si / G / pi / tr), the code routine actions oa, the template card Zi, the skeletons Tn and the
//              form / detail loading frames Kn / Cn (over c9e1458cd's page frame and breadcrumb title row).
//   c43d31dd8  all 15 exports: the Runs on place / waiting helpers, placeHostName (P), the "Ant only" check (_) and its
//              badge (v).
//   shared-52  kx (exported ol): the start failure's category from the `[ccdErrorCategory:<cat>]` message suffix, with xx,
//              Ex (exported ll, the message without IPC prefix and suffixes), yx (exported fl) / _x (exported pl), the
//              categories kx never reports, and wx (the stale relogin message).
//   shared-14  Ft (exported M): a category's title / body / retryHelps / actions (the cause sentence of a failed Run now),
//              and W (exported j): the category normaliser.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. The bindings of each chunk
// are the reachable closure of the roots across chunks: a declaration's dependencies are its free variables (each
// declaration is parsed on its own and Babel's scope analysis names what it reads from outside), resolved through the
// chunk's import statements (and re-export chains) to the declaring chunk. Nothing is hand-picked, and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. A binding resolves, in this
// order, to: a named host adapter in src/source-routines-shared-adapters.jsx (its original declaration must carry
// `features`), a verified React export of vendor-frame, a semantic public name of the shared view-tabs graph (D1/D24),
// or a copy in this graph's module for its chunk (`<chunk>.mjs`, which exports every binding under its original local
// name so the WI-4 and CW-1 generators can import from here instead of slicing a second copy). A vendor chunk binding,
// a destructuring or class declaration, a dynamic import, or a binding view-tabs already holds without a semantic
// name (D46: name it in extract-view-tabs.mjs; a name it lists in `pendingNames` is imported by its local until
// published) stops generation. `index.mjs` re-exports the roots under semantic names; host code imports only those.
//
// `callSites` pin the minified text the WI-4 / WI-5 wiring follows: where cbd6c85c8 and cfc18e0f4 import these exports,
// and Hc's toast choice over kx / Ft / Vc.
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
const output = path.join(root, 'src/generated/routines-shared');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, features }. `features` must appear in the root's prettier form.
const roots = {
  'cdbc75b4b-DdrHYWQG.js': {
    G: { name: 'remoteRoutineSource', features: ['ee(e).includes("cowork-scheduled")', '? "slack"', 'e.created_via === "meta_mcp"'] },
    si: { name: 'routineWillRun', features: ['return Fe(e, t) === "completed"', '!(n !== void 0 && n <= r)'] },
    ir: { name: 'defaultRoutineFilters', features: ['return e ? { ...K, source: "code" } : K;'] },
    $n: { name: 'localRoutineStatus', features: ['return e.enabled ? "active" : Xn(e) ? "completed" : "paused";'] },
    er: { name: 'remoteRoutineStatus', features: ['return _t(e.enabled, e.ended_reason, e.suspension_reason);'] },
    pr: { name: 'RoutineFilterRadioGroup', features: ['checkedRole: "radio",', 'keepOpen: !0,'] },
    K: { name: 'ROUTINE_FILTER_DEFAULTS', features: ['K = { runsOn: "all", schedule: "all", status: "all", source: "all" }'] },
    ar: { name: 'activeRoutineFilterCount', features: ['return Object.keys(e).filter((n) => e[n] !== t[n]).length;'] },
    or: { name: 'availableRoutineFilters', features: ['e.runsOn === "ssh" && t.sshRunsOn !== !0', 'e.source === "chat" && t.chatSource === !1'] },
    li: { name: 'sortRoutines', features: ['t === "name" ? D(e).localeCompare(D(n)) : ci(e) - ci(n)'] },
    Cn: { name: 'RoutineDetailLoadingFrame', features: ['defaultMessage: "Loading scheduled task",', 'defaultMessage: "Loading routine",', 'frameTitleRow: s,'] },
    tr: { name: 'routineOnHoldMessages', features: ['onHold: { defaultMessage: "On hold", id: "0Hhe6f5cpH" }'] },
    Kn: { name: 'RoutineFormLoadingFrame', features: ['defaultMessage: "Loading form",', 'hold: { none: "route" },', 'e === "cloud" ? Wn : Gn'] },
    gi: { name: 'useRoutineScopeTab', features: ['r.get(mi) === "templates" ? "templates" : "yours"', 't.replace(`${n}${o ? `?${o}` : ""}`, { scroll: !1 });'] },
    bi: { name: 'RoutineHiddenFilterChips', features: ['"data-testid": "routines-filter-chips",', 'o === "routines" ? "1r8rakf" : "36cvir"'] },
    Ji: { name: 'ScheduledTaskCard', features: ['x = r.surface === "code",', 'href: s ?? `/scheduled-task/${encodeURIComponent(r.id)}`,'] },
    ji: { name: 'ScheduledTaskStatusLine', features: ['if (o === "held")', 'id: Si.rowRunsIn,'] },
    Zi: { name: 'RoutineTemplateCard', features: ['"aria-busy": c,', '"group relative flex w-full gap-md overflow-hidden rounded-lg p-2 text-start outline-none hover:bg-alpha-1 focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",'] },
    Yi: { name: 'ScheduledTaskDivider', features: ['viewBox: "0 0 1600 6",', 'stroke: "var(--cds-border)",'] },
    oa: { name: 'useCodeRoutineActions', features: ['source: "code_routine_', 'E.runStarted'] },
    _i: { name: 'RoutineTabsStatus', features: ['"data-cds-part": "tabs-status",', 'inert: e,'] },
    pi: { name: 'remoteRoutineRunDot', features: ['e.latestRunByTriggerId.get(t)', 'r === "server"'] },
    vi: { name: 'routineRowKey', features: ['return `${e}-${t}`;'] },
    fr: { name: 'filterRoutines', features: ['sourceHidden: o.length - c.length + s.length - l.length'] },
    Tn: { name: 'RoutineSkeletonRows', features: ['Array.from({ length: e }, (e, t) =>'] },
  },
  'c43d31dd8-EEJLxHyj.js': {
    k: { name: 'placeWaitingMessage', features: ['return (t && b[e]) || y[e];'] },
    D: { name: 'placeWaitingState', features: ['wantsPerson: i || E(r) !== void 0'] },
    N: { name: 'placeHostLabel', features: ['if (n.kind === "wsl") return n.distro;', 'return r ? l(r).labelText : j(A(e));'] },
    M: { name: 'placeKey', features: ['return g(e.remoteTarget);'] },
    _: { name: 'useAntOnly', features: ['return i(n()?.account);'] },
    w: { name: 'placeWaitingCause', features: ['case r.HostNotAllowed:', '"hostInvalid"', '"folderNotTrusted";'] },
    F: { name: 'placeWaitingSince', features: ['(e.jitterSeconds ?? 0) * 1e3'] },
    v: { name: 'AntOnlyBadge', features: ['defaultMessage: "Ant only", id: "7QT7WO8Wtz"'] },
    j: { name: 'coderWorkspaceName', features: ['\\.coder$/.exec(e)?.[1] ?? e'] },
    E: { name: 'placeCauseAction', features: ['return T[e];'] },
    P: { name: 'usePlaceHostName', features: ['let { sshConfigs: e } = c({ poll: !1 });'] },
    x: { name: 'placeRunStateMessages', features: ['needsInput: { defaultMessage: "Needs input", id: "CD9YaN3oTh" },'] },
    I: { name: 'isMissedPlaceRun', features: ['!!e.missedRuns?.some((e) => w(e.reason, e.detail))'] },
    O: { name: 'withPlaceEnabled', features: ['waiting: n ? e.waiting : void 0'] },
    A: { name: 'placeTargetName', features: ['t.sshPort !== void 0 && t.sshPort !== 22'] },
  },
  'shared-52-DGviI8xb.js': {
    kx: { name: 'scheduledTaskErrorCategory', features: ['if (Ex(t) === wx) return "session_stale_relogin";', 'let n = xx.exec(t)?.[1];', 'n !== "untrusted_device"',
      '!(n !== void 0 && yx.has(n))', 'n !== "org_policy_denied"', 'n !== "github_auth"', 'n !== "cloud_storage_mount_denied"', '!(n !== void 0 && _x.has(n))'] },
    xx: { name: 'CCD_ERROR_CATEGORY_SUFFIX', features: ['xx = /\\[ccdErrorCategory:([a-z_]+)\\]$/'] },
    Ex: { name: 'stripStartErrorMessage', features: ['.replace(/^Error invoking remote method \'[^\']+\': (?:\\w*Error: )?/, "")', '.replace(xx, "")', '.replace(Sx, "")', '.replace(Cx, "")'] },
    yx: { name: 'UNREPORTED_START_CATEGORIES', features: ['"org_credential_not_allowed",', '"worktree_unverified",', '"cli_version_too_old",', '"org_config_refused",'] },
    _x: { name: 'UNREPORTED_POLICY_CATEGORIES', features: ['"sandbox_required_unavailable",', '"managed_settings_refused",', '"gateway_access_denied",'] },
    wx: { name: 'STALE_RELOGIN_MESSAGE', features: ['wx = "Unable to start session. Sign in again to continue: session_stale_relogin"'] },
  },
  'shared-14-u0TSV9dR.js': {
    Ft: { name: 'describeStartFailure', features: ['let i = Tt(W(t)),', 'title: e.formatMessage(B.generic),', 'isKnownCategory: !1,', 'retryHelps: s.retryHelps ?? i.retryHelps,'] },
    W: { name: 'normalizeStartFailureCategory', features: ['return e?.startsWith("spawn_error_")', '? "spawn_failed"', 'e === "api_error_529"', '/^api_error_5\\d\\d$/.test(e)'] },
  },
};
// vendor-frame re-exports React as `local=<namespace>.<member>`; the namespace is checked against its module.
const reactNamespaces = { fe: 'react/jsx-runtime', o: 'react', Ln: 'react-dom' };
const reactMembers = {
  'react/jsx-runtime': new Set(['jsx', 'jsxs', 'Fragment']),
  react: new Set(['useState', 'useRef', 'useCallback', 'useMemo', 'useEffect', 'useLayoutEffect', 'useContext', 'createContext', 'memo',
    'forwardRef', 'useSyncExternalStore', 'useId', 'useReducer', 'use', 'Children', 'Fragment', 'cloneElement', 'isValidElement',
    'useTransition', 'useDeferredValue', 'useEffectEvent', 'useInsertionEffect', 'useImperativeHandle', 'startTransition', 'createElement', 'Component', 'Suspense', 'lazy']),
  'react-dom': new Set(['flushSync', 'createPortal']),
};
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = { 'vendor-intl-Db7hDWRO.js#tn': ['return e;'] };
// Host services (checked first): chunk -> original local -> { name, features, also }. `also` pins further declarations
// of the same chunk the adapter answers for. Each entry is documented where it is implemented.
const adapters = {
  'vendor-intl-Db7hDWRO.js': {
    q: { name: 'useIntl', features: ['let e = o(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    Gt: { name: 'FormattedMessage', features: ['var Gt = u(Wt, Ut);'], also: { Wt: ['let { formatMessage: r, textComponent: i = n } = q(),'] } },
  },
  'vendor-router-DOqjo6Uj.js': { Y: { name: 'useTanStackRouter', features: ['return d(gn);'] } },
  'vendor-query-Dqcf4jOo.js': { J: { name: 'useQueryClient', features: ['"No QueryClient set, use QueryClientProvider to set one"'] } },
  'shared-1-CAAiD7E3.js': {
    FP: { name: 'useSurfaceModels', features: ['n = xc(t.surface),', 'extraLongContextIds: t.extraLongContextIds,', 'a = yc({ surface: n }),'] },
    nE: { name: 'useUpdateRemoteTrigger', features: ['return xn((e) => `/v1/code/triggers/${e.triggerId}`, "POST", {', 'mutationKey: eT.update,'] },
    rE: { name: 'useDeleteRemoteTrigger', features: ['return xn((e) => `/v1/code/triggers/${e.triggerId}`, "DELETE", {', 'mutationKey: eT.delete,'] },
    aE: { name: 'useRunRemoteTrigger', features: ['(e) => `/v1/code/triggers/${encodeURIComponent(e.triggerId)}/run`,', 'mutationKey: eT.run,'] },
    aT: { name: 'usePendingRemoteTriggerIds', features: ['filters: { mutationKey: e ? eT[e] : $w, status: "pending" },'] },
    bT: { name: 'apiErrorBodyMessage', features: ['let t = os().bodySentences;', 'return e instanceof ys', 'e.serverMessage !== void 0', '? xT(e.serverMessage)'] },
    iT: { name: 'isRemoteTriggerMutating', features: ['return e.isMutating(nT(t, n)) > 0;'] },
  },
  'shared-4-CJsHhp5n.js': {
    Ap: { name: 'useCloudRoutinesEnabled', features: ['yr("claude_code_routines")', 't = Kr().routines.enabled,', 'n = ue("chilling_sloth_clocks", t);'] },
    Bp: { name: 'useRoutineAluminaDrift', features: ['ge("alumina_drift", "variant", "control", zp, e && (t || n)) === "treatment"'] },
    Fp: { name: 'useRoutinePushNotifyReminder', features: ['t = de("ccr_routine_push_notify_reminder");'] },
    jp: { name: 'useRoutinePluginConfig', features: ['t = G("marble_sparrow"),', 'n = G("ccr_triggers_plugin_config");'] },
    dh: { name: 'useScheduledTasksBridge', features: ['m = G("yukon_silver_dramatic_shrimp_clocks"),', 'h = r || (o && !!kt?.createScheduledTask),'] },
  },
  'shared-52-DGviI8xb.js': {
    Sj: { name: 'useErrors', features: ['Error("Must be called within ErrorsProvider"),'] },
    EO: { name: 'useAnalytics', features: ['return Qg;'], also: { Qg: ['track: (...e) => Xg((t) => t.track(...e)),'] } },
  },
  'shared-25-DP8p7i1Z.js': {
    Zs: { name: 'useFeatureIsOn', features: ['return Rs(I(e)).on;'] },
    Z: { name: 'useCurrentAccount', features: ['Error("Must call inside CurrentAccountProvider"),'] },
    ks: { name: 'useGrowthBookClient', features: ['let e = g(Ds),', 't = g(e === void 0 ? Vr : Os);'] },
    Jf: { name: 'useRouter', features: ['push: (n, i) => {', 'r.navigate(Gf(a), { resetScroll: i?.scroll ?? !0 });'] },
    Xf: { name: 'usePathname', features: ['e === null ? (t.resolvedLocation ?? t.location).pathname : e.pathname,'] },
    ep: { name: 'useSearchParams', features: ['e === null ? (t.resolvedLocation ?? t.location).searchStr : "",', 'n = e === null ? null : e.searchParamsString;'] },
    mS: { name: 'RouterLink', features: ['return m("a", {', 'ownRouter: l,', '...(r === !1 && { "data-no-intent-warm": "" }),'] },
  },
  'shared-7-B8UIMGDr.js': { WM: { name: 'useVoiceModeAvailable', features: ['t = ge("ccr_basalt_harrier_main"),', 'n = ge("claude_ai_voice_mode"),'] } },
  'shared-20-B7UqYfsi.js': { pT: { name: 'useSshConfigs', features: ['refetchInterval: () => (e.poll === !1 || n.getState().hidden ? !1 : sT),'] } },
  'shared-78-D6VXYXaQ.js': {
    Wg: { name: 'useHubAvailable', features: ['o = { hubCapable: e, hubAllowed: n, hubEngineAllowed: r, hubDefault: i },', 's = Rh((e) => Dg(o, e));'] },
    uV: { name: 'useGate2142364912', features: ['let e = Ri("__gb__2142364912"),', 'n = dV() === "another";'] },
  },
  'shared-6-Cby4X-ms.js': { mH: { name: 'ConnectorIcon', features: ['function mH({ type: e, size: t, className: n, variant: r, isError: i = !1 }) {', 'case Bs.SLACK:'] } },
  'shared-2-Cb74JByF.js': {
    Bw: { name: 'useRoutineMoveToCloudGate', features: ['return be(Rw, (e || (t && r)) && n);'] },
    qK: { name: 'useVoiceRecordingActive', features: ['return UK((e) => e.status === "recording" || e.status === "connecting");'] },
  },
  'shared-16-B0xHzPjj.js': { Dd: { name: 'EmojiShortcodeField', features: ['r = Ed.Component;', 'return n ? s(r, { inputRef: e, onValueChange: t }) : null;'] } },
  'c9e1458cd-BaNkEcxH.js': { ze: { name: 'RoutineLeaveGuard', features: ['(r.action === "PUSH" || r.action === "BACK") &&', 'o = M({ shouldBlockFn: a, enableBeforeUnload: !1, withResolver: !0 }),'] } },
};

// Pinned on the minified bytes (each must occur exactly once): where the Code Routines route chunk, the local detail and
// the form fields import these exports, and how Hc picks the Run now failure toast over kx / Ft / Vc (WI-4 extracts Hc).
const rawCallSites = [
  { source: 'cbd6c85c8-PO73iD62.js', role: 'Code Routines routes import the 24 cdbc75b4b exports, c43d31dd8 placeHostName / Ant only, shared-14 Ft / W and shared-52 kx',
    features: ['import{B as Oo,C as ko,F as Ao,I as jo,L as Mo,M as No,N as Po,P as Fo,R as Io,S as Lo,U as Ro,V as zo,W as Bo,b as Vo,g as Ho,i as Uo,l as Wo,n as Go,r as Ko,t as qo,v as Jo,x as Yo,y as Xo,z as Zo}from"./cdbc75b4b-DdrHYWQG.js"',
      'import{a as bo,c as xo,h as So,m as Co,p as wo,r as To,s as Eo,t as Do}from"./c43d31dd8-EEJLxHyj.js"',
      'import{M as ki,j as Ai}from"./shared-14-u0TSV9dR.js"', 'ol as gt'] },
  { source: 'cbd6c85c8-PO73iD62.js', role: 'Hc: a failed Run now toast names the cause (Ft title) unless the category is unknown, a confirm prompt, ends with "?" or is in Vc; retryHelps (and not rate_limit) adds "Try again"',
    features: ['let s=gt(a),c=s==="rate_limit",l=a instanceof Error?a.message:String(a),u=Nt(o),d=ki(e,s,u===void 0?void 0:{host:u},{billingNotSelfManageable:r,remoteKind:o?.kind,errorMessage:c?void 0:l});',
      'd.isKnownCategory&&!d.isConfirmPrompt&&!d.title.endsWith("?")&&!Vc.has(Ai(s))?{message:e.formatMessage(d.retryHelps&&!c?t.startFailedCauseRetry:t.startFailedCause,{name:n,cause:d.title})}:{message:e.formatMessage(t.startFailed,{name:n})}',
      'Vc=new Set(["spawn_failed","sdk_binary_arch_mismatch","sdk_binary_corrupt","disclaimer_binary_missing","spawn_args_too_long","settings_write_denied","scratch_cwd_unreachable","sdk_binary_missing","remote_spawn_failed","remote_host_exhausted","remote_spawn_refused"])'] },
  { source: 'cfc18e0f4-Cr7owzD3.js', role: 'Local routine detail imports cdbc75b4b G / I (Tn, $n) and ten c43d31dd8 exports',
    features: ['import{G as Ne,I as Pe}from"./cdbc75b4b-DdrHYWQG.js"', 'import{a as I,c as Ee,i as L,l as De,m as Oe,n as R,o as ke,r as z,s as Ae,u as je}from"./c43d31dd8-EEJLxHyj.js"'] },
  { source: 'c0fd2fda3-DzTjEtm3.js', role: 'Form fields import six c43d31dd8 exports (Runs on, Ant only)',
    features: ['import{a as Ze,c as Qe,d as $e,f as et,h as tt,m as nt}from"./c43d31dd8-EEJLxHyj.js"'] },
];
// Globals the emitted modules may read (browser and language built-ins the original declarations use).
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  // c0958e5bf is the UMD-wrapped cron description library (cronstrue): `arguments` inside its functions, `define` typeof-guarded.
  'arguments', 'define']);

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
const moduleName = file => file.replace(/\.js$/, '.mjs');

export async function extractRoutinesShared({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  // key "file#local" -> classification
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map(); // generated key -> Set(keys it reads)
  const used = { adapters: new Set(), react: new Set(), viewTabs: new Set() };
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
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (file.startsWith('vendor-frame-') && !published.has(key)) {
      const text = entry && entry.kind === 'var' ? declarationText(src, entry) : '';
      const m = /^([\w$]+)=([\w$]+)\.([\w$]+)$/.exec(text);
      const module = m && reactNamespaces[m[2]];
      if (!module || !reactMembers[module].has(m[3])) throw Error(`vendor-frame ${local} (${text.slice(0, 60)}) is not a known React export`);
      result = { kind: 'react', module, name: m[3] };
    } else if (published.has(key)) {
      result = { kind: 'view-tabs', name: published.get(key), file };
    } else if (held.has(key)) {
      // view-tabs already holds this original declaration (one copy of each binding, so a context stays one object);
      // D1/D46: it is imported only by its semantic public name; a name view-tabs still holds back (`pendingNames`,
      // other areas slice that binding) is imported by its local until it is published, anything else stops here.
      if (!pending.has(key)) throw Error(`${key} is held by view-tabs without a semantic name; name it in extract-view-tabs.mjs (D46)`);
      result = { kind: 'view-tabs-held', name: local, file, pendingName: pending.get(key) };
    } else if (file.startsWith('vendor-') && !vendorCopies[key]) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'pattern' || entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
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
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[cls.kind.startsWith('view-tabs') ? 'viewTabs' : cls.kind === 'react' ? 'react' : 'adapters'].add(key); return; }
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
    if (process.env.SURVEY_CALLS) for (const [file, locals] of chunks) { const s = await readSource(file, cache); for (const l of locals) { const e = s.top.get(l); const init = e.kind === 'var' ? e.node.init : null; if (init && /Call|New/.test(init.type)) console.log('CALL', file.slice(0, 12), declarationText(s, e).slice(0, 110)); if (/Must (?:be called|call) (?:with)?in/.test(declarationText(s, e))) console.log('PROVIDER', file.slice(0, 12), declarationText(s, e).slice(0, 140)); } }
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    // heaviest cross-chunk edges: subtree within the selection
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return null;
  }
  // Emit one module per source chunk: its bindings in source order, imports from the other modules, adapters, React and
  // view-tabs, and every binding exported under its original local name.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-routines-shared.mjs', adapterModule: 'src/source-routines-shared-adapters.jsx',
    publicNames: {}, modules: [], contexts: [], callSites: [], importPins: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map(); // local in this chunk -> { from, name, kind, via }
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${dep} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(dep);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${dep} resolves two ways`);
        imports.set(dep, { ...spec, via: key });
      }
    }
    // A copied context is this graph's own object: the WI-4 / CW-1 generators must import it from here.
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context view-tabs holds; it must be imported, not copied`);
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
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-routines-shared.mjs.\n// Edit the extractor or src/source-routines-shared-adapters.jsx, never this file.\n`;
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
  // The module graph must be acyclic: a cycle would evaluate one chunk's top-level initialisers before the other's.
  const state = new Map();
  const walk = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  // index.mjs: the roots under semantic names (the only names host code imports).
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    const specs = Object.entries(names).map(([local, spec]) => { manifest.publicNames[spec.name] = { file, local }; return `${local} as ${spec.name}`; });
    indexLines.push(`export { ${specs.join(', ')} } from "./${moduleName(file)}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the routines-shared roots; generated by extract-routines-shared.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters = [...(manifest.adapters ?? []), { original: `${file}#${local}`, name: spec.name }];
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Routines shared output set changed: ${present.join(',')}. Run scripts/extract-routines-shared.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Routines shared source mismatch: ${name}. Run scripts/extract-routines-shared.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} routines shared modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractRoutinesShared({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
