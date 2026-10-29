// R4g-routines RT0 (tasks-code-routines WI-0, D32), moved to 3.6556.2 in wave 2 of the 3.6556.2 migration
// (w2-routines-shared, research/routines-cowork-chat.md §1.2 / §3.2): extract the routines pieces both the Code Routines
// page (WI-4 / WI-5) and the Cowork Scheduled upgrade (CW-1) share, without executing any desktop runtime (decision D0:
// own generator, own output folder src/generated/routines-shared, own scripts/verify-gen-routines-shared.mjs).
//
//   cdbc75b4b  the exports cbd6c85c8 (CodeRoutines routes) imports plus the two cfc18e0f4 (local routine detail) adds:
//              the routine / scheduled-task card Br with its status hr and divider Hr, filters (Pn / Fn / In / Ln / Wn /
//              Gn), sort qn, scope tab er, hidden-count chips ir, status helpers (On / kn / jn / Zn / An), the code
//              routine actions ti, the template card Gr, the skeletons $t and the form / detail loading frames En / Zt
//              (over c9e1458cd's page frame and breadcrumb title row). 3.6556.2 split cdbc75b4b (RC-18): the cloud
//              auto_disabled states moved to c1984a75c, and with them `ge` (routineWillRun, the old cdbc75b4b si).
//   c43d31dd8  all 15 exports: the Runs on place / waiting helpers, placeHostName (N), the "Ant only" check (g) and its
//              badge (_).
//   shared-52  vF (exported Ds): the start failure's category from the `[ccdErrorCategory:<cat>]` message suffix, with
//              uF, hF (exported As, the message without IPC prefix and suffixes), cF (exported Ns) / oF (exported Ps),
//              the categories vF never reports, and pF (the stale relogin message).
//   shared-14  Ft (exported H): a category's title / body / retryHelps / actions (the cause sentence of a failed Run
//              now), and J (exported V): the category normaliser.
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk. The bindings of each chunk
// are the reachable closure of the roots across chunks: a declaration's dependencies are its free variables (each
// declaration is parsed on its own and Babel's scope analysis names what it reads from outside), resolved through the
// chunk's import statements (and re-export chains) to the declaring chunk. Nothing is hand-picked, and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. A binding resolves, in this
// order, to: a named host adapter in src/source-routines-shared-adapters.jsx (its original declaration must carry
// `features`), a vendor-frame React export (official-3.6556.2.mjs reactAliases, checked with assertVendorAlias; R3), a
// semantic public name of the shared view-tabs graph (D1/D24/E3: the React Compiler helpers J9 / J1… / K1… come from
// there), or a copy in this graph's module for its chunk (`<chunk>.mjs`, which exports every binding under its original
// local name so the WI-4 and CW-1 generators can import from here instead of slicing a second copy). A vendor chunk
// binding, a destructuring or class declaration, a dynamic import, or a binding view-tabs holds without a semantic name
// (D46) stops generation. `index.mjs` re-exports the roots under semantic names; host code imports only those.
//
// Features (R2/E5) match the declaration's prettier form either as text or through looseFeature() (identifiers of at
// most three characters generalised); every root also pins its export alias in the chunk.
//
// Consumers (code-routines, cowork-scheduled, cowork-home, cowork-progress, artifact-library, sessions-page, turn-box,
// session-rail, session-rail-context) are 3.6556.2 too and import this graph's chunk modules by the current chunk file
// names and original local names. Every run checks those import statements (consumerImports, src/** and tests/**): a
// file this graph no longer writes, or a name its module does not export, stops generation. The E34 legacy layer (old
// chunk file shims, manifest.legacy["2.42304.0"], scripts/routines-shared-legacy-2.42304.0.json) is gone
// (w10-cleanup-routines-legacy).
//
// `callSites` pin the minified text the WI-4 / WI-5 wiring follows: where cbd6c85c8, cfc18e0f4 and c0fd2fda3 import
// these exports, and the Run now toast's choice over vF / Ft / hl.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
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
const output = path.join(root, 'src/generated/routines-shared');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature); `export` is the root's export alias in its chunk.
const roots = {
  'cdbc75b4b-BCUW8bqT.js': {
    jn: { name: 'remoteRoutineSource', export: 'N', features: ['.includes("cowork-scheduled")) return "chat";', 't === "project" ? "claude" : t;'] },
    Fn: { name: 'defaultRoutineFilters', export: 'O', features: ['function Fn({ hideNonCode: e }) {', 'return e ? { ...Pn, source: "code" } : Pn;'] },
    On: { name: 'localRoutineStatus', export: 'k', features: ['return e.enabled ? "active" : Dn(e) ? "completed" : "paused";'] },
    kn: { name: 'remoteRoutineStatus', export: 'A', features: ['return Re(e.enabled, e.ended_reason, e.suspension_reason);'] },
    Gn: { name: 'RoutineFilterRadioGroup', export: 'T', features: ['checkedRole: "radio",', 'keepOpen: !0,', 'r(f.GroupLabel, { children: n })'] },
    Pn: { name: 'ROUTINE_FILTER_DEFAULTS', export: 'E', features: ['Pn = { runsOn: "all", schedule: "all", status: "all", source: "all" }'] },
    In: { name: 'activeRoutineFilterCount', export: 'D', features: ['return Object.keys(e).filter((n) => e[n] !== t[n]).length;'] },
    Ln: { name: 'availableRoutineFilters', export: 'j', features: ['e.runsOn === "ssh" && t.sshRunsOn !== !0', 'e.source === "chat" && t.chatSource === !1'] },
    qn: { name: 'sortRoutines', export: 'w', features: ['t === "name" ? H(e).localeCompare(H(n)) : Kn(e) - Kn(n)'] },
    Zt: { name: 'RoutineDetailLoadingFrame', export: 'F', features: ['defaultMessage: "Loading scheduled task",', 'defaultMessage: "Loading routine",', 'frameTitleRow: c,'] },
    An: { name: 'routineOnHoldMessages', export: 'P', features: ['onHold: { defaultMessage: "On hold", id: "0Hhe6f5cpH" }'] },
    En: { name: 'RoutineFormLoadingFrame', export: 'I', features: ['defaultMessage: "Loading form",', 'K0($, 0, { none: "route" })', 'n === "cloud" ? wn : Tn'] },
    er: { name: 'useRoutineScopeTab', export: 'S', features: ['r.get(Qn) === "templates" ? "templates" : "yours"', 't.replace(`${n}${o ? `?${o}` : ""}`, { scroll: !1 });'] },
    ir: { name: 'RoutineHiddenFilterChips', export: 'v', features: ['"data-testid": "routines-filter-chips",', 'o === "routines" ? "1r8rakf" : "36cvir"'] },
    Br: { name: 'ScheduledTaskCard', export: 'a', features: ['D = n.surface === "code",', 'N = l ?? `/scheduled-task/${encodeURIComponent(n.id)}`,'] },
    hr: { name: 'ScheduledTaskStatusLine', export: 'd', features: ['if (c === "held")', 'id: or.rowRunsIn,'] },
    Gr: { name: 'RoutineTemplateCard', export: 'n', features: ['"aria-busy": m,', '"group relative hit-row hit-row-main flex w-full gap-md rounded-lg p-2 text-start outline-none hover:bg-alpha-1 focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",'] },
    Hr: { name: 'ScheduledTaskDivider', export: 'i', features: ['viewBox: "0 0 1600 6",', 'stroke: "var(--cds-border)",'] },
    ti: { name: 'useCodeRoutineActions', export: 't', features: ['source: "code_routine_', 'U.runStarted'] },
    tr: { name: 'RoutineTabsStatus', export: 'b', features: ['"data-cds-part": "tabs-status",', 'inert: a,'] },
    Zn: { name: 'remoteRoutineRunDot', export: 'C', features: ['e.latestRunByTriggerId.get(t)', 'r === "server"'] },
    nr: { name: 'routineRowKey', export: 'x', features: ['return `${e}-${t}`;'] },
    Wn: { name: 'filterRoutines', export: 'M', features: ['sourceHidden: o.length - c.length + s.length - l.length'] },
    $t: { name: 'RoutineSkeletonRows', export: 'L', features: ['className: "flex flex-col gap-1",', 'children: Array.from({ length: t }, en),'] },
  },
  // RC-18: 3.6556.2 moved the old cdbc75b4b si (routineWillRun) here, next to the cloud auto_disabled states.
  'c1984a75c-jYIGuWP6.js': {
    ge: { name: 'routineWillRun', export: 't', features: ['return s(e, t) === "completed"', '!(n !== void 0 && n <= r)'] },
  },
  'c43d31dd8-BrmgVA6Q.js': {
    O: { name: 'placeWaitingMessage', export: 'a', features: ['return (t && x[e]) || b[e];'] },
    E: { name: 'placeWaitingState', export: 'c', features: ['wantsPerson: i || T(r) !== void 0'] },
    M: { name: 'placeHostLabel', export: 'd', features: ['if (n.kind === "wsl") return n.distro;', 'return r ? l(r).labelText : A(k(e));'] },
    j: { name: 'placeKey', export: 'f', features: ['return h(e.remoteTarget);'] },
    g: { name: 'useAntOnly', export: 'h', features: ['e = n()?.account;', 'K1($, 0, e, i(e))'] },
    C: { name: 'placeWaitingCause', export: 'i', features: ['case r.HostNotAllowed:', '"hostInvalid"', '"folderNotTrusted";'] },
    P: { name: 'placeWaitingSince', export: 'l', features: ['(e.jitterSeconds ?? 0) * 1e3'] },
    _: { name: 'AntOnlyBadge', export: 'm', features: ['defaultMessage: "Ant only", id: "7QT7WO8Wtz"'] },
    A: { name: 'coderWorkspaceName', export: 'n', features: ['\\.coder$/.exec(e)?.[1] ?? e'] },
    T: { name: 'placeCauseAction', export: 'o', features: ['return w[e];'] },
    N: { name: 'usePlaceHostName', export: 'p', features: ['K0($, 0, { poll: !1 })', '{ sshConfigs: t } = c(e);', '(e) => M(e, t)'] },
    b: { name: 'placeRunStateMessages', export: 'r', features: ['needsInput: { defaultMessage: "Needs input", id: "CD9YaN3oTh" },'] },
    F: { name: 'isMissedPlaceRun', export: 's', features: ['!!e.missedRuns?.some((e) => C(e.reason, e.detail))'] },
    D: { name: 'withPlaceEnabled', export: 't', features: ['waiting: n ? e.waiting : void 0'] },
    k: { name: 'placeTargetName', export: 'u', features: ['t.sshPort !== void 0 && t.sshPort !== 22'] },
  },
  'shared-52-uHFNjl7C.js': {
    vF: { name: 'scheduledTaskErrorCategory', export: 'Ds', features: ['if (hF(t) === pF) return "session_stale_relogin";', 'let n = uF.exec(t)?.[1];', 'n !== "untrusted_device"',
      '!(n !== void 0 && cF.has(n))', 'n !== "org_policy_denied"', 'n !== "github_auth"', 'n !== "cloud_storage_mount_denied"', '!(n !== void 0 && oF.has(n))'] },
    uF: { name: 'CCD_ERROR_CATEGORY_SUFFIX', features: ['uF = /\\[ccdErrorCategory:([a-z_]+)\\]$/'] },
    hF: { name: 'stripStartErrorMessage', export: 'As', features: ['.replace(/^Error invoking remote method \'[^\']+\': (?:\\w*Error: )?/, "")', '.replace(uF, "")'] },
    cF: { name: 'UNREPORTED_START_CATEGORIES', export: 'Ns', features: ['"org_credential_not_allowed",', '"worktree_unverified",', '"cli_version_too_old",', '"org_config_refused",'] },
    oF: { name: 'UNREPORTED_POLICY_CATEGORIES', export: 'Ps', features: ['"sandbox_required_unavailable",', '"managed_settings_refused",', '"gateway_access_denied",'] },
    pF: { name: 'STALE_RELOGIN_MESSAGE', features: ['pF = "Unable to start session. Sign in again to continue: session_stale_relogin"'] },
  },
  'shared-14-BP8q-CX5.js': {
    Ft: { name: 'describeStartFailure', export: 'H', features: ['let i = Tt(J(t)),', 'title: e.formatMessage(B.generic),', 'isKnownCategory: !1,', 'retryHelps: s.retryHelps ?? i.retryHelps,'] },
    J: { name: 'normalizeStartFailureCategory', export: 'V', features: ['return e?.startsWith("spawn_error_")', '? "spawn_failed"', 'e === "api_error_529"', '/^api_error_5\\d\\d$/.test(e)'] },
  },
  // The "look backed" flag hook (the context ep, falling back to np, which op stores from `lookBacked`; pinned in
  // rawCallSites). Before w10-cleanup-routines-legacy only the E34 legacy name shared-78-D6VXYXaQ tf reached it; the
  // 3.6556.2 cowork-scheduled shared-18 and sessions-page graphs import it from this module, so ep stays one context.
  'shared-78-D5Fw2h0a.js': {
    lp: { name: 'useLookBacked', export: 'Ow', features: ['return C(ep) ?? np;'] },
  },
};
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = { 'vendor-intl-DYfox5Co.js#tn': ['return e;'] };
// Host services (checked first): chunk -> original local -> { name, features, also }. `also` pins further declarations
// of the same chunk the adapter answers for. Each entry is documented where it is implemented; the adapter names are
// kept from 2.42304.0 (src/source-routines-shared-adapters.jsx exports them under these names).
const adapters = {
  'vendor-intl-DYfox5Co.js': {
    q: { name: 'useIntl', features: ['let e = a(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    Gt: { name: 'FormattedMessage', features: ['var Gt = c(Wt, Ut);'], also: { Wt: ['let { formatMessage: i, textComponent: a = r } = q(),'] } },
  },
  'vendor-router-DBB8RO9T.js': { Y: { name: 'useTanStackRouter', features: ['return f(gn);'] } },
  'vendor-query-DVJ0goAF.js': { J: { name: 'useQueryClient', features: ['"No QueryClient set, use QueryClientProvider to set one"'] } },
  'shared-1-BJhqMmkf.js': {
    ER: { name: 'useSurfaceModels', features: ['t.claudeCodeVersion === void 0', 't.coworkRoute', 't.extraLongContextIds'] },
    gO: { name: 'useUpdateRemoteTrigger', features: ['mutationKey: rD.update,', 'return kr(bO, "POST", h);'] },
    xO: { name: 'useDeleteRemoteTrigger', features: ['mutationKey: rD.delete,', 'return kr(DO, "DELETE", f);'] },
    AO: { name: 'useRunRemoteTrigger', features: ['mutationKey: rD.run,'] },
    lD: { name: 'usePendingRemoteTriggerIds', features: ['filters: { mutationKey: t, status: "pending" },'] },
    AD: { name: 'apiErrorBodyMessage', features: ['bodySentences;', 'e.serverMessage !== void 0'] },
    cD: { name: 'isRemoteTriggerMutating', features: ['.isMutating('] },
  },
  'shared-4-DUB1Oi0O.js': {
    Ch: { name: 'useCloudRoutinesEnabled', features: ['"claude_code_routines"', '"chilling_sloth_clocks"'] },
    Mh: { name: 'useRoutineAluminaDrift', features: ['"alumina_drift", "variant", "control"', '=== "treatment"'] },
    Dh: { name: 'useRoutinePushNotifyReminder', features: ['"ccr_routine_push_notify_reminder"'] },
    n_: { name: 'useScheduledTasksBridge', features: ['Y("yukon_silver_dramatic_shrimp_clocks")', '!!Lt?.createScheduledTask'] },
    // New in 3.6556.2: the page header frame (Lm) reads whether the title strip line is claimed (the sidebar store's
    // stripLineClaims > 0 with no discovery preview) for its fizzy-lake panels branch, which is off here (E12).
    // and claims the strip line while it is shown (Np, rendered as an element; nothing reads the claim here).
    Np: { name: 'TitleStripLineClaim', features: ['let { claimStripLine: n, releaseStripLine: r } = cr.getState();', 'return (n(), r);'] },
    Ap: { name: 'useTitleStripLineClaimed', features: ['return cr(jp);'], also: { jp: ['return e.stripLineClaims > 0 && e.discoveryPreviewFeature === null;'] } },
  },
  'shared-52-uHFNjl7C.js': {
    cB: { name: 'useErrors', features: ['Error("Must be called within ErrorsProvider"),'] },
    wT: { name: 'useAnalytics', features: ['return Ly;'], also: { Ly: ['track: (...e) => Fy((t) => t.track(...e)),'] } },
  },
  'shared-25-DOWZRSlq.js': {
    Z: { name: 'useCurrentAccount', features: ['Error("Must call inside CurrentAccountProvider"),'] },
    Vo: { name: 'useGrowthBookClient', features: ['t = v(e === void 0 ? Er : Bo);'] },
    Jd: { name: 'useRouter', features: ['resetScroll: r?.scroll ?? !0', '{ warn: !1 }'] },
    fs: { name: 'useFeatureIsOn', features: ['return $o(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
    Cx: { name: 'RouterLink', features: ['href: t,', 'replace: a,', 'ownRouter: u,', 'r === !1 && { "data-no-intent-warm": "" }'] },
    nf: { name: 'useSearchParams', features: ['e === null ? (t.resolvedLocation ?? t.location).searchStr : "",', 'e.searchParamsString'] },
    Zd: { name: 'usePathname', features: ['e === null ? (t.resolvedLocation ?? t.location).pathname : e.pathname,'] },
  },
  'shared-2-TF8v67kg.js': {
    // The hook over the dictation store (w0) with its selector M0 (the old qK).
    j0: { name: 'useVoiceRecordingActive', features: ['return w0(M0);'], also: { M0: ['e.status === "recording" || e.status === "connecting"'] } },
    // The old Bw (__gb__672513276, move a local routine to the cloud); 3.6556.2 adds an `enabled` argument.
    ZA: { name: 'useRoutineMoveToCloudGate', features: ['return jn(YA, (t || (n && a)) && r && i);', 'i = e !== !1,'], also: { YA: ['YA = "__gb__672513276"'] } },
  },
  // New in 3.6556.2: the card menu reads whether Cowork remote control is available (cowork_remote_control over the
  // active organization's settings). No organization here: the official answer without one is false.
  'shared-8-Db1QN4mf.js': { GP: { name: 'useCoworkRemoteControlAvailable', features: ['{ activeOrganization: e } = Vt(),', 'Ui("cowork_remote_control");', 'return e === void 0'] } },
  'shared-16-ByfgAyLr.js': { tm: { name: 'EmojiShortcodeField', features: ['onValueChange: t'] } },
  'shared-20-mUr7IqZY.js': { fT: { name: 'useSshConfigs', features: ['getState().hidden'] } },
  'shared-7-DBAgAi5H.js': { NB: { name: 'useVoiceModeAvailable', features: ['"ccr_basalt_harrier_main"', '"claude_ai_voice_mode"'] } },
  'shared-78-D5Fw2h0a.js': {
    rC: { name: 'useGate2142364912', features: ['"__gb__2142364912"', '=== "another"'] },
    lv: { name: 'useHubAvailable', features: ['hubCapable: e,', 'hubAllowed: n,', 'hubEngineAllowed: r,', 'hubDefault: i,', '(e) => G_(o, e)'] },
  },
  'c9e1458cd-DmywUvrC.js': { Ge: { name: 'RoutineLeaveGuard', features: ['(e.action === "PUSH" || e.action === "BACK") &&', 'enableBeforeUnload: !1', 'withResolver: !0'] } },
};

// Pinned on the minified bytes (each must occur exactly once; a `{ loose }` statement through looseFeature): where the
// Code Routines route chunk, the local detail and the form fields import these exports, and how the Run now failure
// toast picks its message over vF / Ft / hl (WI-4 extracts it).
const rawCallSites = [
  { source: 'cbd6c85c8-D1xuycDy.js', role: 'Code Routines routes import 23 cdbc75b4b exports, c1984a75c routineWillRun, c43d31dd8 placeHostName / Ant only, shared-14 Ft / J and shared-52 vF',
    features: ['import{A as qo,C as Jo,D as Yo,E as Xo,F as Zo,I as Qo,M as $o,N as es,O as ts,P as ns,S as rs,T as is,a as as,b as os,d as ss,i as cs,j as ls,k as us,n as ds,r as fs,t as ps,v as ms,w as hs,x as gs}from"./cdbc75b4b-BCUW8bqT.js"',
      'import{d as Lo,t as Ro}from"./c1984a75c-jYIGuWP6.js"',
      'import{a as zo,c as Bo,h as Vo,m as Ho,p as Uo,r as Wo,s as Go,t as Ko}from"./c43d31dd8-BrmgVA6Q.js"',
      'import{H as Pa,V as Fa,st as Ia}from"./shared-14-BP8q-CX5.js"', 'Ds as We'] },
  { source: 'cbd6c85c8-D1xuycDy.js', role: 'Run now toast: a failed Run now names the cause (Ft title) unless the category is unknown, a confirm prompt, ends with "?" or is in hl; retryHelps (and not rate_limit) adds "Try again"',
    features: [{ loose: 'let s=We(a),c=s==="rate_limit",l=a instanceof Error?a.message:String(a),u=Ct(o),d=Pa(e,s,u===void 0?void 0:{host:Mr(e,u)},{billingNotSelfManageable:r,remoteKind:o?.kind,errorMessage:c?void 0:l});' },
      { loose: 'd.isKnownCategory&&!d.isConfirmPrompt&&!d.title.endsWith("?")&&!hl.has(Fa(s))?{message:e.formatMessage(d.retryHelps&&!c?t.startFailedCauseRetry:t.startFailedCause,{name:n,cause:d.title})}:{message:e.formatMessage(t.startFailed,{name:n})}' },
      'hl=new Set(["spawn_failed","sdk_binary_arch_mismatch","sdk_binary_corrupt","disclaimer_binary_missing","spawn_args_too_long","settings_write_denied","scratch_cwd_unreachable","sdk_binary_missing","remote_spawn_failed","remote_host_exhausted","remote_spawn_refused"])'] },
  { source: 'cfc18e0f4-CmiyhJoV.js', role: 'Local routine detail imports cdbc75b4b L / k ($t, On) and ten c43d31dd8 exports',
    features: ['import{L as ze,k as Be}from"./cdbc75b4b-BCUW8bqT.js"', 'import{a as ke,c as Ae,i as je,l as Me,m as Ne,n as Pe,o as Fe,r as F,s as Ie,u as Le}from"./c43d31dd8-BrmgVA6Q.js"'] },
  { source: 'c0fd2fda3-CntNPbFi.js', role: 'Form fields import six c43d31dd8 exports (Runs on, Ant only)',
    features: ['import{a as ut,c as dt,d as ft,f as pt,h as mt,m as ht}from"./c43d31dd8-BrmgVA6Q.js"'] },
  { source: 'shared-78-D5Fw2h0a.js', role: 'lp (useLookBacked) reads the context ep and falls back to np, the lookBacked flag op stores',
    features: ['function lp(){return C(ep)??np}', 'tp=e.look,np=e.lookBacked'] },
];
// Globals the emitted modules may read (browser and language built-ins the original declarations use).
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  // c0958e5bf is the UMD-wrapped cron description library (cronstrue): `arguments` inside its functions, `define` typeof-guarded.
  'arguments', 'define',
  // 3.6556.2 c2379df20 (the auto-growing field): `typeof CSS>"u"||typeof CSS.supports!="function"||CSS.supports("field-sizing","content")`.
  'CSS']);

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
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The names src/** and tests/** import (or re-export) from this graph's output, per output file (parsed, not run).
async function consumerImports() {
  const out = new Map();
  const walk = async dir => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (file !== output && entry.name !== 'node_modules') await walk(file); continue; }
      if (!/\.(?:m?js|jsx)$/.test(entry.name)) continue;
      const code = await fs.readFile(file, 'utf8');
      if (!code.includes('routines-shared/')) continue;
      for (const node of parsers.babel.parse(code, {}).program.body) {
        if (!['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) || !node.source) continue;
        const target = path.resolve(path.dirname(file), node.source.value);
        if (path.dirname(target) !== output) continue;
        const names = node.type === 'ExportAllDeclaration' ? ['*'] : node.specifiers.map(s =>
          s.type === 'ImportSpecifier' ? s.imported.name : s.type === 'ImportDefaultSpecifier' ? 'default' : s.type === 'ImportNamespaceSpecifier' ? '*' : s.local.name);
        const set = out.get(path.basename(target)) ?? new Set();
        for (const name of names) set.add(name);
        out.set(path.basename(target), set);
      }
    }
  };
  for (const dir of ['src', 'tests']) await walk(path.join(root, dir));
  return out;
}
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

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
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const alias = reactAlias(src, local);
      const { module, member } = official.assertVendorAlias(src.code, alias);
      result = { kind: 'react', module, name: member };
    } else if (file.startsWith('vendor-frame-') && !published.has(key) && !held.has(key)) {
      throw Error(`vendor-frame ${local} (${entry ? declarationText(src, entry).slice(0, 60) : '?'}) is neither a React export nor a view-tabs binding`);
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
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  // What src/** and tests/** import from this graph must be here: an import of a file this run does not write, or of a
  // name its module does not export (index.mjs: a semantic root name; a chunk module: one of its bindings), stops
  // generation instead of breaking the consumer at link time. A binding a consumer needs that no root reaches becomes a
  // root (as shared-78 lp did when the E34 legacy roots went away).
  const exportedBy = new Map([['index.mjs', new Set(Object.keys(manifest.publicNames))],
    ...manifest.modules.map(m => [m.target, new Set(m.bindings.map(b => b.name))])]);
  for (const [target, names] of await consumerImports()) {
    if (!exportedBy.has(target)) throw Error(`a consumer imports ${target}, which this graph no longer writes`);
    for (const name of names)
      if (name !== '*' && !exportedBy.get(target).has(name)) throw Error(`a consumer imports ${target}:${name}, which it does not export; make the binding a root`);
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
