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
//
// Two source contracts, two outputs (region batch 2b of the 4.16336.0 migration, region-plan G6 / cutover):
//   3.6556.2   src/generated/routines-shared: the production graph. 34 generated areas that are still 3.6556.2
//              (region-plan cutover.oldConsumersAtGeneration, `legacyConsumers` below) import its chunk modules by
//              original identity, so it stays on 3.6556.2, byte for byte, until they move (not before batch 11).
//   4.16336.0  src/generated/routines-shared-v4: the same semantic roots cut from the frozen 4.16336.0 snapshot, linking
//              the shared CDS graph cds-core (sharedGraph 'cds-core') instead of view-tabs. Nothing imports it until the
//              cutover. Each root is the only top-level declaration of its chunk carrying its features (uniqueRoots) and
//              pins its export alias. A binding cds-core publishes is linked (its raw declaration must hash as
//              cds-core's, recorded as linkedSha256); one cds-core holds without a publicName is cut again only when it
//              is pure and hashes the same (heldByCdsCore per module); module state it holds that way (a Map / Set /
//              WeakMap / WeakSet or a React context) stops generation and is reported with its text and the chain that
//              reached it (error.stateConflicts, D46). D1: `linkedGraphs` imports a binding another 4.16336.0 production
//              area holds and exports (its manifest, module bytes and declaration hash checked) instead of cutting another
//              copy; survey reports the remaining overlaps with other 4.16336.0 graphs. manifest.sharedGraphModules /
//              linkedGraphModules pin the bytes of the modules linked, so a regeneration there must be followed by a rerun
//              here and --check.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// region-plan routines-shared cutover.oldConsumersAtGeneration: the 3.6556.2 areas that link the production graph.
export const legacyConsumers = Object.freeze(['approval-elicitation', 'approval-titles', 'artifact-library', 'chat-home', 'chat-knowledge', 'chat-projects',
  'chat-renderer', 'chat-side-chat', 'code-current:base', 'code-current:upper', 'code-editor', 'code-routines', 'code-transcript', 'cowork-approval',
  'cowork-context', 'cowork-home', 'cowork-live', 'cowork-progress', 'cowork-runs', 'cowork-scheduled', 'cowork-session-states', 'cowork-settings',
  'files-changes', 'mcp-app-card', 'pierre-changes', 'proposal-group', 'question-card', 'session-rail', 'session-rail-context', 'sessions-page',
  'sidebar-routines', 'transcript-rows', 'turn-box', 'turn-plan']);

// ── 3.6556.2: the production graph (unchanged contract, byte-identical output) ──────────────────────────────────────
const legacy = (() => {
  const official = official3;
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
  return { official, output: path.join(root, 'src/generated/routines-shared'), sharedGraph: 'view-tabs', roots, vendorCopies, adapters, rawCallSites, allowedGlobals };
})();

// ── 4.16336.0: the isolated graph (region-plan G6 / cutover), linking cds-core ─────────────────────────────────────
const target4 = (() => {
  const official = official4;
  // The same roots under the same semantic names, each located in the 4.16336.0 chunk as the only top-level declaration
  // carrying its features (uniqueRoots) and pinned to its export alias there (`export: null`: a private root, which must
  // not be exported). New in 4.16336.0: c43d31dd8 grew a 16th export (O, the waiting detail kind) and cdbc75b4b's Qt
  // (export z, the ?edit=true opener the Code Routines routes and the local detail import); shared-62 kv reads a third
  // category Set yv (export Wm), rooted next to the other two.
  const roots = {
    'cdbc75b4b-TExYNEy0.js': {
      Rn: { name: 'remoteRoutineSource', export: 'N', features: ['.includes("cowork-scheduled")) return "chat";', 't === "project" ? "claude" : t;'] },
      Hn: { name: 'defaultRoutineFilters', export: 'O', features: ['function Hn({ hideNonCode: e }) {', 'return e ? { ...Vn, source: "code" } : Vn;'] },
      Fn: { name: 'localRoutineStatus', export: 'k', features: ['return e.enabled ? "active" : Dn(e) ? "completed" : "paused";'] },
      In: { name: 'remoteRoutineStatus', export: 'A', features: ['return Re(e.enabled, e.ended_reason, e.suspension_reason);'] },
      Qn: { name: 'RoutineFilterRadioGroup', export: 'T', features: ['checkedRole: "radio",', 'keepOpen: !0,', 'r(f.GroupLabel, { children: n })'] },
      Vn: { name: 'ROUTINE_FILTER_DEFAULTS', export: 'E', features: ['Vn = { runsOn: "all", schedule: "all", status: "all", source: "all" }'] },
      Un: { name: 'activeRoutineFilterCount', export: 'D', features: ['return Object.keys(e).filter((n) => e[n] !== t[n]).length;'] },
      Wn: { name: 'availableRoutineFilters', export: 'j', features: ['e.runsOn === "ssh" && t.sshRunsOn !== !0', 'e.source === "chat" && t.chatSource === !1'] },
      er: { name: 'sortRoutines', export: 'w', features: ['t === "name" ? H(e).localeCompare(H(n)) : Kn(e) - Kn(n)'] },
      rn: { name: 'RoutineDetailLoadingFrame', export: 'F', features: ['defaultMessage: "Loading scheduled task",', 'defaultMessage: "Loading routine",', 'frameTitleRow: c,'] },
      Ln: { name: 'routineOnHoldMessages', export: 'P', features: ['onHold: { defaultMessage: "On hold", id: "0Hhe6f5cpH" }'] },
      Nn: { name: 'RoutineFormLoadingFrame', export: 'I', features: ['defaultMessage: "Loading form",', 'K0($, 0, { none: "route" })', 'n === "cloud" ? wn : Tn'] },
      sr: { name: 'useRoutineScopeTab', export: 'S', features: ['r.get(Qn) === "templates" ? "templates" : "yours"', 't.replace(`${n}${o ? `?${o}` : ""}`, { scroll: !1 });'] },
      dr: { name: 'RoutineHiddenFilterChips', export: 'v', features: ['"data-testid": "routines-filter-chips",', 'o === "routines" ? "1r8rakf" : "36cvir"'] },
      Jr: { name: 'ScheduledTaskCard', export: 'a', features: ['D = o.surface === "code",', 'P = c ?? `/scheduled-task/${encodeURIComponent(o.id)}`,'] },
      Sr: { name: 'ScheduledTaskStatusLine', export: 'd', features: ['if (c === "held")', 'id: or.rowRunsIn,'] },
      $r: { name: 'RoutineTemplateCard', export: 'n', features: ['"aria-busy": m,', '"group relative hit-row hit-row-main flex w-full gap-md rounded-lg p-2 text-start outline-none hover:bg-alpha-1 focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",'] },
      Xr: { name: 'ScheduledTaskDivider', export: 'i', features: ['viewBox: "0 0 1600 6",', 'stroke: "var(--cds-border)",'] },
      li: { name: 'useCodeRoutineActions', export: 't', features: ['tags: { source: "code_routine_run" }', 'tags: { source: "code_routine_toggle" }', 'source: "code_routine_delete",', 'W.runStarted'] },
      cr: { name: 'RoutineTabsStatus', export: 'b', features: ['"data-cds-part": "tabs-status",', 'inert: a,'] },
      ir: { name: 'remoteRoutineRunDot', export: 'C', features: ['e.latestRunByTriggerId.get(t)', 'r === "server"'] },
      lr: { name: 'routineRowKey', export: 'x', features: ['return `${e}-${t}`;'] },
      Zn: { name: 'filterRoutines', export: 'M', features: ['sourceHidden: o.length - c.length + s.length - l.length'] },
      on: { name: 'RoutineSkeletonRows', export: 'L', features: ['className: "flex flex-col gap-1",', 'children: Array.from({ length: t }, en),'] },
      // Qt and $t (export R, ?create=true) have the same shape; Qt is the one over shared-62 gu ("edit").
      Qt: { name: 'useEditFromSearchParam', export: 'z', features: ['en(re, e, t === void 0 ? "open" : t);'], reads: ['shared-62-DoCqVpIq.js#gu'] },
    },
    'c1984a75c-CZgeZ21y.js': {
      _e: { name: 'routineWillRun', export: 't', features: ['return ee(e, t) === "completed"', '!(n !== void 0 && n <= r)'] },
    },
    'c43d31dd8-BRyXMvOp.js': {
      A: { name: 'placeWaitingMessage', export: 'a', features: ['return (t && x[e]) || b[e];'] },
      O: { name: 'placeWaitingDetail', export: 'c', features: ['D(e)?.cause === "notAvailable" && e.waiting?.detail;', 'return t === "run_due" ? "due" : t === "too_late" ? "tooLate" : void 0;'] },
      D: { name: 'placeWaitingState', export: 'l', features: ['wantsPerson: i || E(r) !== void 0'] },
      P: { name: 'placeHostLabel', export: 'f', features: ['if (n.kind === "wsl") return n.distro;', 'return r ? l(r).labelText : A(k(e));'] },
      N: { name: 'placeKey', export: 'p', features: ['return h(e.remoteTarget);'] },
      _: { name: 'useAntOnly', export: 'g', features: ['e = n()?.account;', 'K1($, 0, e, i(e))'] },
      w: { name: 'placeWaitingCause', export: 'i', features: ['case r.HostNotAllowed:', '"hostInvalid"', '"folderNotTrusted";'] },
      I: { name: 'placeWaitingSince', export: 'u', features: ['(e.jitterSeconds ?? 0) * 1e3'] },
      v: { name: 'AntOnlyBadge', export: 'h', features: ['defaultMessage: "Ant only", id: "7QT7WO8Wtz"'] },
      M: { name: 'coderWorkspaceName', export: 'n', features: ['\\.coder$/.exec(e)?.[1] ?? e'] },
      E: { name: 'placeCauseAction', export: 'o', features: ['return w[e];'] },
      F: { name: 'usePlaceHostName', export: 'm', features: ['K0($, 0, { poll: !1 })', '{ sshConfigs: t } = c(e);', '(e) => M(e, t)'] },
      x: { name: 'placeRunStateMessages', export: 'r', features: ['needsInput: { defaultMessage: "Needs input", id: "CD9YaN3oTh" },'] },
      L: { name: 'isMissedPlaceRun', export: 's', features: ['!!e.missedRuns?.some((e) => C(e.reason, e.detail))'] },
      k: { name: 'withPlaceEnabled', export: 't', features: ['D(e)?.cause === "notAvailable";', 'waiting: n && e.waiting ? { ...e.waiting, detail: void 0 } : void 0,'] },
      j: { name: 'placeTargetName', export: 'd', features: ['t.sshPort !== void 0 && t.sshPort !== 22'] },
    },
    // 3.6556.2 shared-52 vF / uF / hF / cF / oF / pF moved to shared-62 (kv / xv / Ev / vv / gv / wv), which also reads yv.
    'shared-62-DoCqVpIq.js': {
      kv: { name: 'scheduledTaskErrorCategory', export: 'zm', features: ['if (Ev(t) === wv) return "session_stale_relogin";', 'let n = xv.exec(t)?.[1];', 'n !== "untrusted_device"',
        '!(n !== void 0 && vv.has(n))', 'n !== "org_policy_denied"', 'n !== "github_auth"', 'n !== "staff_controls_unapproved"', '!(n !== void 0 && yv.has(n))',
        'n !== "cloud_storage_mount_denied"', '!(n !== void 0 && gv.has(n))'] },
      xv: { name: 'CCD_ERROR_CATEGORY_SUFFIX', export: null, features: ['xv = /\\[ccdErrorCategory:([a-z_]+)\\]$/'] },
      Ev: { name: 'stripStartErrorMessage', export: 'Hm', features: ['.replace(/^Error invoking remote method \'[^\']+\': (?:\\w*Error: )?/, "")', '.replace(xv, "")'] },
      vv: { name: 'UNREPORTED_START_CATEGORIES', export: 'Km', features: ['"org_credential_not_allowed",', '"worktree_unverified",', '"cli_version_too_old",', '"org_config_refused",'] },
      yv: { name: 'UNREPORTED_HOST_CATEGORIES', export: 'Wm', features: ['"session_host_refused",', '"session_host_waiting",', '"user_facing_refusal",', '"session_host_said_wait",'] },
      gv: { name: 'UNREPORTED_POLICY_CATEGORIES', export: 'qm', features: ['"sandbox_required_unavailable",', '"managed_settings_refused",', '"gateway_access_denied",'] },
      wv: { name: 'STALE_RELOGIN_MESSAGE', export: null, features: ['wv = "Unable to start session. Sign in again to continue: session_stale_relogin"'] },
    },
    // 3.6556.2 shared-14 Ft / J moved to shared-60 (On / Q). On (exported o) is cds-core describeStartFailure since
    // cds-core wave 5, so it is no longer a root here (host code imports it from cds-core; the routes chunk's reads of
    // On link cds-core); Q stays a root.
    'shared-60-DmOyT7JJ.js': {
      Q: { name: 'normalizeStartFailureCategory', export: 'a', features: ['return e?.startsWith("spawn_error_")', '? "spawn_failed"', 'e === "api_error_529"', '/^api_error_5\\d\\d$/.test(e)'] },
    },
    // The "look backed" flag hook moved from shared-78 lp to shared-123 ad (the context Xu, falling back to Qu, which nd
    // stores from `lookBacked`; pinned in rawCallSites). Since cds-core wave 5 ad is cds-core useHubLookBacked (with the
    // context it reads), so it is no longer a root here: host code imports it from cds-core, the routes link it.
  };
  // Pure vendor declarations this graph may copy (chunk#local -> features): react-intl defineMessages.
  const vendorCopies = { [`${official.vendorIntl}#tn`]: ['return e;'] };
  // The same host services as 3.6556.2 under the same adapter names (src/source-routines-shared-adapters.jsx), each
  // pinned to the 4.16336.0 original it replaces.
  const adapters = {
    [official.vendorIntl]: {
      q: { name: 'useIntl', features: ['return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
      Gt: { name: 'FormattedMessage', features: ['var Gt = a(Wt, Ut);'], also: { Wt: ['let { formatMessage: i, textComponent: a = r } = q(),'] } },
    },
    'vendor-router-Cs51FAGQ.js': { Y: { name: 'useTanStackRouter', features: ['return g(gn);'] } },
    'vendor-query-Bl2Kfzgk.js': { J: { name: 'useQueryClient', features: ['"No QueryClient set, use QueryClientProvider to set one"'] } },
    'shared-1-D1bGaTaN.js': {
      R1: { name: 'useSurfaceModels', features: ['t.claudeCodeVersion === void 0', 't.coworkRoute', 't.extraLongContextIds'] },
      OH: { name: 'useUpdateRemoteTrigger', features: ['mutationKey: rD.update,', 'return kr(bO, "POST", h);'] },
      NH: { name: 'useDeleteRemoteTrigger', features: ['mutationKey: rD.delete,', 'return kr(DO, "DELETE", f);'] },
      HH: { name: 'useRunRemoteTrigger', features: ['mutationKey: rD.run,'] },
      xV: { name: 'usePendingRemoteTriggerIds', features: ['filters: { mutationKey: t, status: "pending" },'] },
      HV: { name: 'apiErrorBodyMessage', features: ['bodySentences;', 'e.serverMessage !== void 0'] },
      bV: { name: 'isRemoteTriggerMutating', features: ['.isMutating('] },
    },
    'shared-4-C_EiQb9h.js': {
      Th: { name: 'useCloudRoutinesEnabled', features: ['"claude_code_routines"', '"chilling_sloth_clocks"'] },
      Ph: { name: 'useRoutineAluminaDrift', features: ['"alumina_drift", "variant", "control"', '=== "treatment"'] },
      kh: { name: 'useRoutinePushNotifyReminder', features: ['"ccr_routine_push_notify_reminder"'] },
    },
    // 3.6556.2 shared-52 cB / wT: the ErrorsProvider reader (4.16336.0 has two, nP over KN and rP over qN; the routines
    // code reads rP) and the analytics hook (OT over ZS).
    'shared-62-DoCqVpIq.js': {
      rP: { name: 'useErrors', features: ['let e = k(qN);', 'Error("Must be called within ErrorsProvider"),'] },
      OT: { name: 'useAnalytics', features: ['return ZS;'], also: { ZS: ['track: (...e) => YS((t) => t.track(...e)),'] } },
    },
    'shared-25-D-aF0gt9.js': {
      Z: { name: 'useCurrentAccount', features: ['Error("Must call inside CurrentAccountProvider"),'] },
      ro: { name: 'useGrowthBookClient', features: ['t = _(e === void 0 ? Jr : no);'] },
      $u: { name: 'useRouter', features: ['resetScroll: r?.scroll ?? !0', '{ warn: !1 }'] },
      ko: { name: 'useFeatureIsOn', features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
      sd: { name: 'useSearchParams', features: ['t = e === null ? null : e.searchParamsString,'] },
      nd: { name: 'usePathname', features: ['e === null ? (t.resolvedLocation ?? t.location).pathname : e.pathname,'] },
    },
    'shared-2-CsjIBQD8.js': {
      // The hook over the dictation store (k1) with its selector z1.
      R1: { name: 'useVoiceRecordingActive', features: ['return k1(z1);'], also: { z1: ['e.status === "recording" || e.status === "connecting"'] } },
      LE: { name: 'useRoutineMoveToCloudGate', features: ['i = e !== !1,'] },
    },
    'shared-8-BqfCbkJd.js': { VN: { name: 'useCoworkRemoteControlAvailable', features: ['Ui("cowork_remote_control");', 'return e === void 0'] } },
    'shared-20-DUEo90UF.js': { GA: { name: 'useSshConfigs', features: ['getState().hidden'] } },
    'shared-36-fqRFYwOb.js': { yM: { name: 'useVoiceModeAvailable', features: ['"ccr_basalt_harrier_main"', '"claude_ai_voice_mode"'] } },
    'shared-92-BOgyxePb.js': { uk: { name: 'useGate2142364912', features: ['"__gb__2142364912"', '=== "another"'] } },
    // 3.6556.2 shared-4 n_ (the scheduled-tasks bridge) is shared-31 zp; the page header's strip-line claim reader
    // (3.6556.2 shared-4 Ap over jp) is shared-31 eu over tu.
    'shared-31-C9BqSSuD.js': {
      zp: { name: 'useScheduledTasksBridge', features: ['Y("yukon_silver_dramatic_shrimp_clocks")', '!!Lt?.createScheduledTask'] },
      // 3.6556.2 shared-4 Np: claims the title strip line while the header is shown (rendered as an element).
      ru: { name: 'TitleStripLineClaim', features: ['let { claimStripLine: n, releaseStripLine: r } = ji.getState();', 'return (n(), r);'] },
      eu: { name: 'useTitleStripLineClaimed', features: ['return ji(tu);'], also: { tu: ['return e.stripLineClaims > 0 && e.discoveryPreviewFeature === null;'] } },
    },
    // 3.6556.2 shared-78 lv (hub availability) is shared-123 _h.
    'shared-123-1Hc1RTKl.js': { _h: { name: 'useHubAvailable', features: ['hubCapable: e,', 'hubAllowed: n,', 'hubEngineAllowed: r,', 'hubDefault: i,', '(e) => G_(o, e)'] } },
    // 3.6556.2 shared-16 tm (the emoji shortcode field) is shared-140 pd over the lazily loaded fd.
    'shared-140-DfG6VwpK.js': { pd: { name: 'EmojiShortcodeField', features: ['{ inputRef: t, onValueChange: n } = e,', 'i = fd.Component;'] } },
    'c9e1458cd-huITyQpS.js': { We: { name: 'RoutineLeaveGuard', features: ['(e.action === "PUSH" || e.action === "BACK") &&', 'enableBeforeUnload: !1', 'withResolver: !0'] } },
  };
  const rawCallSites = [
    { source: 'cbd6c85c8-CxDdK_2w.js', role: 'Code Routines routes import 25 cdbc75b4b exports (now also z), c1984a75c routineWillRun, nine c43d31dd8 exports, shared-60 On / Q and shared-62 kv',
      features: ['import{A as js,C as Ms,D as Ns,E as Ps,F as Fs,I as Is,M as Ls,N as Rs,O as zs,P as Bs,S as Vs,T as Hs,a as Us,b as Ws,d as Gs,i as Ks,j as qs,k as Js,n as Ys,r as Xs,t as Zs,v as Qs,w as $s,x as ec,z as tc}from"./cdbc75b4b-TExYNEy0.js"',
        'import{d as ks,t as As}from"./c1984a75c-CZgeZ21y.js"',
        'import{a as rc,c as ic,g as ac,h as oc,l as sc,m as cc,r as lc,s as uc,t as dc}from"./c43d31dd8-BRyXMvOp.js"',
        'import{N as xo,a as So,o as Co}from"./shared-60-DmOyT7JJ.js"', 'zm as $t'] },
    { source: 'cbd6c85c8-CxDdK_2w.js', role: 'Run now toast: auth / relogin / billing / disk / worktree / policy categories return their own toast (Cs); an ssh error names the host; otherwise a failed Run now names the cause (On title) unless the category is unknown, a confirm prompt, ends with "?" or is in yu; retryHelps (and not rate_limit) adds "Try again"',
      features: [{ loose: 'let s=$t(a),c=s==="rate_limit",l=a instanceof Error?a.message:String(a),u=kt(o),d=Co(e,s,u===void 0?void 0:{host:qi(e,u)},{billingNotSelfManageable:r,remoteKind:o?.kind,errorMessage:c||s==="remote_worktree_failed"?void 0:l});' },
        { loose: 'if(s==="auth_error"||s==="session_stale_relogin"||s==="subscription_past_due"||s==="disk_full"||s==="worktree_store_symlinked"||s==="remote_dir_linked_into_session"||i&&(s==="ssh_policy_denied"||s==="local_policy_denied"))return Cs(d,s);' },
        { loose: 'd.isKnownCategory&&!d.isConfirmPrompt&&!d.title.endsWith("?")&&!yu.has(So(s))?{message:e.formatMessage(d.retryHelps&&!c?t.startFailedCauseRetry:t.startFailedCause,{name:n,cause:d.title})}:{message:e.formatMessage(t.startFailed,{name:n})}' },
        'yu=new Set(["spawn_failed","sdk_binary_arch_mismatch","sdk_binary_corrupt","disclaimer_binary_missing","spawn_args_too_long","settings_write_denied","scratch_cwd_unreachable","sdk_binary_missing","remote_spawn_failed","remote_host_exhausted","remote_spawn_refused"])'] },
    { source: 'cfc18e0f4-C_rkZ1o0.js', role: 'Local routine detail imports cdbc75b4b L / k / z (on, Fn, Qt) and eleven c43d31dd8 exports',
      features: ['import{L,k as Ae,z as je}from"./cdbc75b4b-TExYNEy0.js"', 'import{a as Me,c as Ne,d as Pe,h as Fe,i as Ie,l as Le,n as Re,o as ze,r as Be,s as Ve,u as He}from"./c43d31dd8-BRyXMvOp.js"'] },
    { source: 'c0fd2fda3-CulNgT2Q.js', role: 'Form fields import six c43d31dd8 exports (Runs on, Ant only)',
      features: ['import{a as xt,f as St,g as Ct,h as wt,l as Tt,p as Et}from"./c43d31dd8-BRyXMvOp.js"'] },
    { source: 'shared-123-1Hc1RTKl.js', role: 'ad (useLookBacked) reads the context Xu and falls back to Qu, the lookBacked flag nd stores',
      features: ['function ad(){return j(Xu)??Qu}', 'Zu=e.look,Qu=e.lookBacked'] },
  ];
  const allowedGlobals = new Set([...legacy.allowedGlobals]);
  return { official, output: path.join(root, 'src/generated/routines-shared-v4'), sharedGraph: 'cds-core', uniqueRoots: true,
    isolatedGraph: { productionOutput: 'src/generated/routines-shared', productionSwitchNotBeforeBatch: 11, heldBy: legacyConsumers },
    roots, vendorCopies, adapters, rawCallSites, allowedGlobals,
    // D1: shared-0 Tl (lazyValue, which shared-62 jF reads) was linked from r3b-tasks' lazy-value.mjs. Since cds-core
    // wave 5 cds-core holds Tl (pure, no publicName), so the cds-core rule applies (a held pure binding is cut again only
    // as the very declaration cds-core holds) and the r3b-tasks link is refused ("link cds-core"): no linkedGraphs.
    linkedGraphs: {} };
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
// A feature looseFeature() cannot tokenise (a regex literal holding a quote) is matched as text only.
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
// sharedGraph 'cds-core' (4.16336.0): the manifest is on this version and snapshot, every module's bytes equal its
// recorded sha256 and its sourceSha256 equals the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName (the runSlicer sharedGraph contract, as extract-btw-pane.mjs and
// extract-review-findings.mjs read it).
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
// D1 (4.16336.0): what the other 4.16336.0 graphs under src/generated already cut (file#local -> [area]); cds-core and
// this region's own outputs are not counted (cds-core is linked or re-cut by hash above).
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
// The names src/** and tests/** import (or re-export) from one of this generator's outputs, per output file (parsed,
// not run).
async function consumerImports(output) {
  const out = new Map();
  const marker = `${path.basename(output)}/`;
  const walk = async dir => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (file !== output && entry.name !== 'node_modules') await walk(file); continue; }
      if (!/\.(?:m?js|jsx)$/.test(entry.name)) continue;
      const code = await fs.readFile(file, 'utf8');
      if (!code.includes(marker)) continue;
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
// The vendor-frame export alias of `local` that official-<version>.mjs knows as a React export, or undefined.
const reactAlias = (official, src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];
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

// `version` picks the source contract (default 3.6556.2, the production graph). `contract` (tests only): a variant of a
// source contract, run check-only so it can never write an output folder.
export async function extractRoutinesShared({ check = false, survey = false, version = official3.referenceVersion, contract: variant } = {}) {
  if (variant && !check && !survey) throw Error('extract-routines-shared: a contract variant runs with check: true only');
  const contract = variant ?? contracts[version];
  if (!contract) throw Error(`extract-routines-shared has no ${version} source contract`);
  const { official, output, roots, vendorCopies, adapters, rawCallSites, allowedGlobals } = contract;
  const { referenceVersion, referenceSnapshot } = official;
  const source = official.ionSource;
  const cds = contract.sharedGraph === 'cds-core';
  const cache = new Map();
  const { published, held, pending } = cds ? { pending: new Map() } : await viewTabsGraph(official);
  const graph = cds ? await cdsCoreGraph(official, contract.sharedGraph) : null;
  const linked = cds ? await linkedGraphsFor(official, contract.linkedGraphs) : new Map();
  // key "file#local" -> classification
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map(); // generated key -> Set(keys it reads)
  const used = { adapters: new Set(), react: new Set(), viewTabs: new Set() };
  const stateConflicts = [];
  const heldByCdsCore = new Map(); // file -> Set(local) cut again because cds-core holds them without a publicName (pure, same hash)
  const classify = async (key, reachedBy) => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(source, file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(official, `adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(official, `adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (graph) {
      // 4.16336.0: one copy of each CDS binding. A cds-core publicName is linked (its declaration must hash as
      // cds-core's); a binding cds-core holds without one is cut again only when it is pure and hashes the same, and
      // module state stops generation (D46, every conflict reported with its text and the chain that reached it).
      const shared = graph.published.get(key), owned = graph.held.get(key), link = linked.get(key);
      if (link) {
        if (shared || owned) throw Error(`${key} is linked from ${link.area} but cds-core ${shared ? `publishes it as ${shared.name}` : 'holds it'}; link cds-core`);
        if (!entry || entry.kind === 'import' || sha(declarationText(src, entry)) !== link.sha256) throw Error(`${key} differs from the declaration ${link.area}/${link.target} holds`);
        result = { kind: 'linked-graph', file, area: link.area, target: link.target, name: link.exportName, linkedSha256: link.sha256 };
      } else if (file === official.vendorFrame && !shared && reactAlias(official, src, local)) {
        const alias = reactAlias(official, src, local);
        const { module, member } = official.assertVendorAlias(src.code, alias);
        result = { kind: 'react', module, name: member };
      } else if (shared) {
        if (isRoot) throw Error(`root ${key} is cds-core ${shared.name}; import it from cds-core instead of rooting it here`);
        if (!entry || entry.kind === 'import') throw Error(`${key} (cds-core ${shared.name}) is not a declaration`);
        if (!owned?.sha256 || owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core publishes as ${shared.name}`);
        result = { kind: 'shared-graph', file, target: shared.target, name: shared.exportName, publicName: shared.name, linkedSha256: owned.sha256 };
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
          result = { kind: 'generated', file, local };
        }
      } else if (file.startsWith('vendor-frame-')) {
        throw Error(`vendor-frame ${local} (${entry ? declarationText(src, entry).slice(0, 60) : '?'}) is neither a React export nor a cds-core binding`);
      } else if (file.startsWith('vendor-') && !vendorCopies[key]) {
        throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
      }
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(official, src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const alias = reactAlias(official, src, local);
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
    }
    if (!result) {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'pattern' || entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
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
    try { cls = await classify(key, trail(key)); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[cls.kind.startsWith('view-tabs') || cls.kind === 'shared-graph' || cls.kind === 'linked-graph' ? 'viewTabs' : cls.kind === 'react' ? 'react' : 'adapters'].add(key); return; }
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
    if (!used.viewTabs.has(key)) { if (!survey) throw Error(`linked ${key} is not reached; remove it`); problems.push(`unreached link ${key}`); }
  // E3 (4.16336.0): every React Compiler helper cut again here is the one official.assertCompilerHelpers proves.
  if (graph && official.compilerHelpers) {
    const helperLocals = new Set(Object.values(official.compilerHelpers).map(h => h.local));
    if ([...(chunks.get(official.sharedFrame) ?? [])].some(local => helperLocals.has(local)))
      official.assertCompilerHelpers((await readSource(source, official.sharedFrame, cache)).code);
  }
  // D1 (4.16336.0): the bindings this graph cuts that another 4.16336.0 graph under src/generated also cuts. Reported
  // (survey, tests, the region report), not written into the output: those graphs are other areas' staging outputs.
  const d1 = [];
  if (graph) {
    const others = await otherTargetGraphs(official, new Set([path.basename(output), ...Object.values(contracts).map(c => path.basename(c.output))]));
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
    for (const c of d1) console.log('D1', JSON.stringify(c));
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    if (process.env.SURVEY_CALLS) for (const [file, locals] of chunks) { const s = await readSource(source, file, cache); for (const l of locals) { const e = s.top.get(l); const init = e.kind === 'var' ? e.node.init : null; if (init && /Call|New/.test(init.type)) console.log('CALL', file.slice(0, 12), declarationText(s, e).slice(0, 110)); if (/Must (?:be called|call) (?:with)?in/.test(declarationText(s, e))) console.log('PROVIDER', file.slice(0, 12), declarationText(s, e).slice(0, 140)); } }
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    if (graph) console.log('shared-graph links', [...used.viewTabs].length, 'heldByCdsCore', [...heldByCdsCore.values()].reduce((n, s) => n + s.size, 0));
    // heaviest cross-chunk edges: subtree within the selection
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return { problems, stateConflicts, d1 };
  }
  // D46: module state cds-core holds without a publicName stops generation; nothing is written or checked.
  if (stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    throw error;
  }
  // Emit one module per source chunk: its bindings in source order, imports from the other modules, adapters, React and
  // the shared graph (view-tabs / cds-core), and every binding exported under its original local name.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-routines-shared.mjs', adapterModule: 'src/source-routines-shared-adapters.jsx',
    ...(graph ? { sharedGraph: graph.area, isolatedGraph: contract.isolatedGraph } : {}),
    publicNames: {}, modules: [], contexts: [], callSites: [], importPins: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const sharedTargets = new Set();
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(source, file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map(); // local in this chunk -> { from, name, kind, via }
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
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
    // A copied context is this graph's own object: the WI-4 / CW-1 generators must import it from here.
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(source, calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (!graph && held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context view-tabs holds; it must be imported, not copied`);
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
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via, ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      ...(graph ? { heldByCdsCore: [...(heldByCdsCore.get(file) ?? [])].sort() } : {}),
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
    const bytes = (await readSource(source, site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  if (graph) {
    // The cds-core modules this graph links, by bytes (a cds-core regeneration must be followed by a rerun here), and the
    // D1 cuts it shares with another 4.16336.0 graph by name.
    manifest.sharedGraphModules = Object.fromEntries([...sharedTargets].sort().map(target => [target, graph.modules.get(target).sha256]));
    manifest.linkedGraphModules = Object.fromEntries([...linked.values()].map(l => [`${l.area}/${l.target}`, l.moduleSha256]).sort());
  }
  // What src/** and tests/** import from this graph must be here: an import of a file this run does not write, or of a
  // name its module does not export (index.mjs: a semantic root name; a chunk module: one of its bindings), stops
  // generation instead of breaking the consumer at link time. A binding a consumer needs that no root reaches becomes a
  // root (as shared-78 lp did when the E34 legacy roots went away).
  const exportedBy = new Map([['index.mjs', new Set(Object.keys(manifest.publicNames))],
    ...manifest.modules.map(m => [m.target, new Set(m.bindings.map(b => b.name))])]);
  for (const [target, names] of await consumerImports(output)) {
    if (!exportedBy.has(target)) throw Error(`a consumer imports ${target}, which this graph no longer writes`);
    for (const name of names)
      if (name !== '*' && !exportedBy.get(target).has(name)) throw Error(`a consumer imports ${target}:${name}, which it does not export; make the binding a root`);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Routines shared ${graph ? `${referenceVersion} ` : ''}output set changed: ${present.join(',')}. Run scripts/extract-routines-shared.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Routines shared ${graph ? `${referenceVersion} ` : ''}source mismatch: ${name}. Run scripts/extract-routines-shared.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} routines shared modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.callSites.length} pinned call sites${graph ? `, ${graph.area} ${graph.manifestSha256.slice(0, 8)}` : ''}).`);
  return manifest;
}

// `node scripts/extract-routines-shared.mjs [--check] [--survey] [--version <v>]`: without --version, the 3.6556.2
// production contract and then the 4.16336.0 isolated contract.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : contractVersions;
  for (const version of versions)
    await extractRoutinesShared({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey'), version });
}
