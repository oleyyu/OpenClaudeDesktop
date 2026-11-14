// Session rail Changes card (PR bar rows), 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2
// batch 5, region session-rail-changes): the semantic roots scripts/extract-session-rail-changes.mjs cuts from 3.6556.2
// into src/generated/session-rail-changes, re-located in the frozen 4.16336.0 snapshot and cut into the isolated graph
// src/generated/session-rail-changes-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-session-rail-changes-adapters.jsx and the 3.6556.2 graphs keep reading src/generated/session-rail-changes).
//
// Roots (account2/plan.json session-rail-changes roots.probedRoots; 3.6556.2 counterpart in brackets):
//   c96d752d0-D9VB6ArX  qE  PrBarRow (memo, export Go)         [c96d752d0 EL]     vMe RailPrRows        [bAe]
//                       EE  PrBarLayoutContext ("band")        [lL]               fMe railRowsShape     [mAe]
//                       TE  RailPrCountContext (export ts)     [cL; session-rail pr-count-context.mjs in 3.6556.2]
//                       gMe useRailRowsControls                [vAe]              hje useReportRailPrCount [gke]
//                       _Pe prBarMode                          [hMe]              VD  repoRowId          [bR]
//                       BD  repoRowIdKey                       [yR]               rMe PrBarStaleRow      [aAe]
//                       wD  PR_BAR_ROWS_CLASS (export Vo)      [nR]               xNe PR_BAR_HOLD_CLASS  [vje]
//                       fNe RAIL_PR_BAR_NAV_CLASS              [lje]              uPe prBarRowShown      [cMe]
//   c03935b01-BylKMWqe  Vn  prBarRowSnapshot (export Vr)       [c03935b01 An]
//   c0cdf4a08-Ca7hJehs  g   RowContextMenu (export t)          [c0cdf4a08 g]
//   c0b46114c-hEcQAWZ3  h   useBandEnter (export s)            [c0b46114c m]      p   BAND_ENTER_CLASS (export t) [f]
//   shared-38-DyF0_Fim  Yr  bandAccentClassName (export Qr)    [shared-6 C_]
//   shared-55-BRv2XBP7  gy  BRANCH_ROW_GHOST_ATTR (export il)  [shared-46 A_]
//   shared-1-D1bGaTaN   G3  commandShortcut (export $n)        [shared-46 iR]
//   vendor-intl-BJgYK7RA sn FormattedList (export r)           [vendor-intl sn]
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, plan.json session-rail-changes `linked` + owners.alreadyOwnedByAppGraphs): every binding one of them
//     already holds and exports is imported from it, never cut again;
//   - host boundaries as localAdapters (file#local), each an existing host adapter re-exported by
//     src/source-session-rail-changes-v4-adapters.jsx; each original is pinned by features and by its raw declaration
//     sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const SESSION_RAIL_CHANGES_V4_OUTPUT = 'src/generated/session-rail-changes-v4';
const ADAPTER_FILE = 'src/source-session-rail-changes-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const ROWS = 'c96d752d0-D9VB6ArX.js';
export const SNAPSHOT = 'c03935b01-BylKMWqe.js';
export const MENU = 'c0cdf4a08-Ca7hJehs.js';
export const BAND = 'c0b46114c-hEcQAWZ3.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [ROWS]: {
    qE: { name: 'PrBarRow', export: 'Go', probe: 'prPanelPreloadHandle:u,prNumberLabel:d',
      features: ['onPrIconClick: o,', 'prLinkOpensInApp: c,', 'diffOpenHasChord: O,', 'railMenuControls: H,', 'prSettleHandsOffFocus: Y,', 'dismissReserved: te,',
        'oe = j(EE),', 'se = (t ?? oe) === "rail",', 'defaultMessage: "View pull request",', 'id: "LOl+FrY/8x",', 'defaultMessage: "More PR options",', 'id: "tRloa3+Odj",',
        'defaultMessage: "View changes",', 'id: "GjvELmv6Lt",', '"epitaxy-branch-trailing contents"'] },
    vMe: { name: 'RailPrRows', export: null, probe: '{shape:t,controls:n,announcement:r,renderRow:i,kept:a}',
      features: ['{ shape: t, controls: n, announcement: r, renderRow: i, kept: a } = e,', 'c = rye(t, s.length > 0),', 'role: "list",', 'className: "flex flex-col gap-1",',
        'f(Ore, { announcement: r })', 'f(g_e, { expanded: o.showAll, onToggle: n.onToggleShowAll })', 'merged: u.historyMerged,'] },
    EE: { name: 'PrBarLayoutContext', export: null, probe: 'EE=k("band")', features: ['var EE = k("band");'] },
    // The rail PR count context hje reports into (3.6556.2 c96d752d0 cL, whose one copy was session-rail
    // pr-count-context.mjs). This graph is its first 4.16336.0 holder: exported so session-rail-v4 links it (D1).
    TE: { name: 'RailPrCountContext', export: 'ts', probe: 'TE=k(null)', features: ['var TE = k(null);'] },
    fMe: { name: 'railRowsShape', export: null, probe: 'historyMerged:a.filter',
      features: ['if (e.length === 0) return fD;', '(t.sort(pD), n.sort(pD));', 'historyMerged: a.filter((e) => e.facts.prState === "merged").length,', 'prCount: r,'] },
    gMe: { name: 'useRailRowsControls', export: null, probe: 'onHistoryOpenChange:r,onToggleShowAll:i',
      features: ['[t, n] = v(pMe),', 'n((t) => (t.historyOpen === e ? t : { ...t, historyOpen: e }));', 'n(_Me);', 'resting: a,'] },
    hje: { name: 'useReportRailPrCount', export: null, probe: 't=j(TE)', features: ['t = j(TE),', 'if (t) return (t(e), () => t(null));'] },
    // round4 relink-w8 (session-rail sN, D1): PrBarRow's closure already slices the repo-name chip OE (memo of _je) and
    // the context _je provides around its children (DE = k(!1), `DE.Provider value: !0`, read by cf74bc599 yN as `es`);
    // session-rail-v4 SessionRail reaches both (cf74bc599 ss = $o, Hc = es). This graph is their one 4.16336.0 holder, so
    // it exports them under their semantic names (RepoNameChip moved here from session-rail-v4's held roots) and
    // session-rail-v4 links them instead of cutting a second copy.
    OE: { name: 'RepoNameChip', export: '$o', probe: 'OE=w(_je)', features: ['var OE = w(_je);'] },
    DE: { name: 'InRepoNameChipContext', export: 'es', probe: 'DE=k(!1)', features: ['var DE = k(!1);'] },
    _Pe: { name: 'prBarMode', export: null, probe: '"merged":e.state==="queued"?"queued":"view":n?"none":t',
      features: ['? "merged"', '? "queued"', ': "view"', '? "none"'] },
    VD: { name: 'repoRowId', export: null, probe: 'repo:(e.repo.split("/").pop()??"").toLowerCase()',
      features: ['cwd: e.cwd ?? "",', 'repo: (e.repo.split("/").pop() ?? "").toLowerCase(),', 'history: t,'] },
    BD: { name: 'repoRowIdKey', export: null, probe: 'JSON.stringify([e.cwd,e.repo,e.branch,e.history])',
      features: ['return JSON.stringify([e.cwd, e.repo, e.branch, e.history]);'] },
    rMe: { name: 'PrBarStaleRow', export: null, probe: '{row:t,order:n}=e',
      features: ['{ row: t, order: n } = e,', 'r = t.accent ? (t.pr?.state === "queued" ? "yellow" : "purple") : void 0,', 'a = r ? `${i} opacity-60` : "text-muted-as-secondary",',
        'K0($, 0, { [Qje]: "" })', 'f(Yne, {', 'className: "w-[12px] min-w-0 shrink"'] },
    wD: { name: 'PR_BAR_ROWS_CLASS', export: 'Vo', probe: 'wD="scroll-fade-y',
      features: ['"scroll-fade-y flex max-h-[50vh] flex-col overflow-y-auto overscroll-contain empty:hidden";'] },
    xNe: { name: 'PR_BAR_HOLD_CLASS', export: null, probe: 'xNe="flex shrink-0', features: ['var xNe = "flex shrink-0 flex-col overflow-hidden [&>*]:shrink-0";'] },
    fNe: { name: 'RAIL_PR_BAR_NAV_CLASS', export: null, probe: 'fNe="flex flex-col gap-1 empty:hidden"', features: ['var fNe = "flex flex-col gap-1 empty:hidden";'] },
    uPe: { name: 'prBarRowShown', export: null, probe: '!!t?.hasChanges', features: ['return e ? !0 : n === !1 && !r ? !1 : !!t?.hasChanges;'] },
  },
  [SNAPSHOT]: {
    Vn: { name: 'prBarRowSnapshot', export: 'Vr', probe: 'r=e.prMode==="merge"?"none":e.prMode',
      features: ['? { number: e.prNumber, state: e.prState }', 'r = e.prMode === "merge" ? "none" : e.prMode;', 'repoName: e.hideRepo ? null : e.repoName,',
        '!n && e.chooser && (r === "create" || r === "draft" || r === "compose"),', 'dismissable: e.dismissable,'] },
  },
  [MENU]: {
    g: { name: 'RowContextMenu', export: 't', probe: 'nativeMenuWhen:u,onContextMenu:p',
      features: ['nativeMenuWhen: u,', 'beforeOpen: g,', 'popupProps: _,', 'x: y.x + 2,', 'openEvent: y.event,', 'side: "bottom",', 'align: "start",'] },
  },
  [BAND]: {
    h: { name: 'useBandEnter', export: 's', probe: 'return m(e,_)', features: ['return m(e, _);'] },
    p: { name: 'BAND_ENTER_CLASS', export: 't', probe: 'p="epitaxy-band-enter"', features: ['var p = "epitaxy-band-enter";'] },
  },
  'shared-38-DyF0_Fim.js': {
    Yr: { name: 'bandAccentClassName', export: 'Qr', probe: 'function Yr(e="neutral")', features: ['function Yr(e = "neutral") {', 'return `${qr} ${Jr[e]}`;'] },
  },
  'shared-55-BRv2XBP7.js': {
    gy: { name: 'BRANCH_ROW_GHOST_ATTR', export: 'il', probe: 'gy="data-epitaxy-branch-row-ghost"', features: ['var gy = "data-epitaxy-branch-row-ghost";'] },
  },
  'shared-1-D1bGaTaN.js': {
    G3: { name: 'commandShortcut', export: '$n', probe: 'return q3(e,t,n)[0]', features: ['return q3(e, t, n)[0];'] },
  },
  'vendor-intl-BJgYK7RA.js': {
    sn: { name: 'FormattedList', export: 'r', probe: 'sn=J("formatList")', features: ['var sn = J("formatList");'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c96d752d0-D9VB6ArX.js#qE': 'b6cfa86f5952d80a1c306ac00a596c24a47d226e5c440cc57f3e7a25bc5070cd',
  'c96d752d0-D9VB6ArX.js#vMe': '4d8bfe9b331118bc42a62d14b1b06dcd5f04d9ce105fc798550ba474b24a25c6',
  'c96d752d0-D9VB6ArX.js#OE': 'db99bd66c5695e538ef0ae0db1053ac215de9500c828671759cf365e3c4a5a07',
  'c96d752d0-D9VB6ArX.js#DE': 'fc30dfe7392204d26a683cf7233902bfe511da8ed9b1046d7cc7e6188b5dd011',
  'c96d752d0-D9VB6ArX.js#EE': 'c8e19de5b147c9c2c022d267d17ca5eb262c10320376958ca93d3937a04ad8fa',
  'c96d752d0-D9VB6ArX.js#TE': '94d04ec9aced596e67814e284b3774b2530415380a8abd008d0d0182ac1f56aa',
  'c96d752d0-D9VB6ArX.js#fMe': 'e5d204a5edbf28001174184ff3e228c2c7f9721888c4abbc7dce183a89e435f2',
  'c96d752d0-D9VB6ArX.js#gMe': '330622ff3f9276178e87c9a8060341118e4f2497e14f179d18eb7462ef289770',
  'c96d752d0-D9VB6ArX.js#hje': '52ac55ffe0c94c46af2b47650d9706a24a61564ad133d4d8d242f54404f8e14c',
  'c96d752d0-D9VB6ArX.js#_Pe': '30fe052138ec2b4993eb92bf2c86f436f1630e7405c4d78eec2b18c92aa55059',
  'c96d752d0-D9VB6ArX.js#VD': '476cb4fc1255fda2e78d7450ae2367c11029b73e2a1ae1490b4c31a25627e720',
  'c96d752d0-D9VB6ArX.js#BD': 'e04ee490c1da6ba80e61759204b22cf9b96c53ef98311f3ccb96fdf642a7413e',
  'c96d752d0-D9VB6ArX.js#rMe': 'db3500ed8eb19bdb39a5737b5d45b302ec237bbbd2a04b3216eca6d3d44f4179',
  'c96d752d0-D9VB6ArX.js#wD': 'b821aab89f5d9ac3dc0c6f4210eaad3f4e3dccd931cfe8c6f632e191c54ac612',
  'c96d752d0-D9VB6ArX.js#xNe': '53c79f6b1e6773d091b2572b1801d647031dd31273c072bab4444258a8f24cca',
  'c96d752d0-D9VB6ArX.js#fNe': '7d8534d0753d3b1506825984086408fa04ebd64ce29ba547989eefc44105dd39',
  'c96d752d0-D9VB6ArX.js#uPe': '504e46bec8c8ed78521f3dc05bb24003cf37f6a012912d600af8f4f23155c1ce',
  'c03935b01-BylKMWqe.js#Vn': '00a6ca5a5427a01bc216e772ad1017a922a3dbd19222d006ff0319227863772e',
  'c0cdf4a08-Ca7hJehs.js#g': '80afcbd7fc65673457f39346da769b0c1c6f7051052f3ae4c69da1e43d379af1',
  'c0b46114c-hEcQAWZ3.js#h': '83ebf6813bd7e364588d317f438a0b6b4680c5f12e97ee1ac639ee4d9c63bdd0',
  'c0b46114c-hEcQAWZ3.js#p': '1d791560f0c1da4093e475327dfc31d7321136ad310c1181b55edd8e1f829be5',
  'shared-38-DyF0_Fim.js#Yr': '863804ff058e65da592a9bccdecfa2e4b8b7bc888909d90faef02cdb9d4c8b83',
  'shared-55-BRv2XBP7.js#gy': '1b5ee7ee004f2f007f64949da1880887b06dd918a5a95d38e44c8204bc965581',
  'shared-1-D1bGaTaN.js#G3': '6f517608e10e9aa4908b972a81247789bff5777c86905c06ed09cd978eb559b7',
  'vendor-intl-BJgYK7RA.js#sn': '7b2dde6a5f047d424988116e6a8070b6cc4c8105f3702896de12ea5cab9f60ab',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (existing host adapter), features } ─────
// While qE waits (PENDING_ROOTS) the emitted closure reads only useIntl / FormattedMessage / RailPrListItem; the others are
// the boundaries of qE's closure (probe: account2/session-rail-changes/prestage/tools/probe-3.json), pinned already so
// that moving qE back is a ROOTS-only change.
const OLD = 'src/source-session-rail-changes-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl useIntl / FormattedMessage over the local catalog (3.6556.2 vendor-intl q / Gt; the kit's adapters).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: OLD, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: OLD, features: ['var Gt = a(Wt, Ut);'] },
  // shared-62 rP (3.6556.2 shared-52 cB): the ErrorsProvider; the host toasts (cfb0234e3 h, the "Copy link" item).
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: OLD, features: ['let e = k(qN);', 'Error("Must be called within ErrorsProvider"),'] },
  // c227f4d5e mD (3.6556.2 c227f4d5e UT): qE's default prPanelPreloadHandle, the lazy EpitaxyPrPanel's handle. The host has
  // no in-app PR panel: onOpenPrPanel is never set, so qE's `wa(s ? re : null)` never reads it.
  'c227f4d5e-DGDdGBTz.js#mD': { name: 'prPanelPreloadHandle', from: OLD, features: ['var mD = pD.handle;'] },
  // cc6e65d4b b (3.6556.2 cc6e65d4b f): a PR link click opens in the app's preview pane when prLinkOpensInApp; the host
  // opens pull requests in the browser.
  'cc6e65d4b-CkNcfjau.js#b': { name: 'usePrLinkInAppClick', from: OLD, features: ['i.setPendingPreviewLinkUrl(e, { prPane: n, clickedIn: r })', 'i && e && s(e) ? o : void 0'] },
  // c2fd10b8d sc (3.6556.2 c2fd10b8d Al): the PR link's policy (live / refused / asks) from the link confirm context and the
  // policy override; neither has a provider in this host: "live".
  'c2fd10b8d-DEwP4IO5.js#sc': { name: 'usePrLinkPolicy', from: OLD, features: ['let t = ic(h(Aa), e, h(nt));', 'return h(ac) ? oc(t) : t;'] },
  // c60636ac6 mt / ht (3.6556.2 c60636ac6 mt / ht): the GitHub ref hover card needs the desktop's getGhRefSummary bridge.
  'c60636ac6-Qhz8qfr3.js#mt': { name: 'hasPrHoverCard', from: OLD, features: ['if (t?.kind === "github") return !!d?.getGhRefSummary || !1;'] },
  // c96d752d0 gD (memo; 3.6556.2 c96d752d0 YL, adapted the same way by the 3.6556.2 graph): the rail list item. It asks the
  // session pane (tile) store, c03935b01 Q `$e(u(vf) ?? yf, e)`, whether toggleDiff would open the primary row's diff
  // (`e.host`, `e.tileLayout`, the expanded tile); the store's fallback yf = du() is the pane layout store cds-core holds
  // without publishing (cds-core request c03935b01#C, not in wave 6), and the host has no pane layout state of that shape.
  // The host list item takes the chord from the Changes card stand-in (RailDiffOpenHasChordContext). Known difference: gD
  // wraps the item in shared-frame tu (the tooltip deferral scope); the host item does not (tooltips use the ambient scope).
  'c96d752d0-D9VB6ArX.js#gD': { name: 'RailPrListItem', from: OLD,
    features: ['{ rowKey: t, primary: n, hidden: r, children: i } = e,', 'if (!n || Che(e, "diff")) return !1;', 'className: "flex flex-col",', 'hidden: r,'] },
  // shared-62 OT (exported Xc; routines-shared-v4 / cowork-progress-v4 adapt the same binding): useAnalytics, read by the
  // safe link (shared-12 yt) the PR link renders through c2fd10b8d lc. Nothing is sent (D17).
  'shared-62-DoCqVpIq.js#OT': { name: 'useAnalytics', from: 'src/source-routines-shared-adapters.jsx', features: ['return ZS;'] },
  'c60636ac6-Qhz8qfr3.js#ht': { name: 'PrHoverCard', from: OLD, features: ['{ href: n, children: r, surface: i } = e,', 'return d?.getGhRefSummary'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'c227f4d5e-DGDdGBTz.js#mD': '413d2b8d8997f2cb46e5792125f541d10c163ffaa6b0dc7c55799946eed3a2ff',
  'cc6e65d4b-CkNcfjau.js#b': '7c935fa962748b30f16ddc7ee342b8063111a0b84f00a7baebbe87a0a0099b84',
  'c2fd10b8d-DEwP4IO5.js#sc': 'b3bdae8bb0ce3da45037fdfff631317f96301792c7fb90aaf62d5a45212c74b0',
  'c60636ac6-Qhz8qfr3.js#mt': '9c686182168b0a57c024102c74462f3adaebf2ef833478aad3f314cd4cd16b3c',
  'c96d752d0-D9VB6ArX.js#gD': '3cef25c36fac71a0afe8583b942631fd5f4092386abaf2b73b61d35412e049d8',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'c60636ac6-Qhz8qfr3.js#ht': '6527fcb536d4f0f53fdb7d289d2e956680fc57951e5bb7870d4540bbf155a88c',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings a linked area cuts without exporting, cut again here (each with its reason).
const linkedCopies = {
  // shared-18 MN (exported ic; 3.6556.2 shared-18 JO, the duplicate the 3.6556.2 graph lists too): the StatusDot wrapper
  // (CdsPulse without animation, the running dot's animation phase synced on start). code-current-v4
  // sidebar-status-glyph.mjs slices it without exporting it.
  'shared-18-Cfqwgjc5.js#MN': 'pure component (no state)',
};

// D1 (plan.json session-rail-changes linked.linkedAreas + owners.alreadyOwnedByAppGraphs): files-changes-v4 and
// session-rail-kit-v4 (the dependency regions), routines-shared-v4 (holds shared-frame tu, the tooltip deferral scope gD
// renders), cowork-scheduled-v4, code-editor-current-v4 and code-current-v4. code-current-v4's manifest is not a runSlicer
// manifest (five semantic modules have no official source): it is linked through the modules that name their chunk.
export const LINKED_AREA_NAMES = ['files-changes-v4', 'session-rail-kit-v4', 'routines-shared-v4', 'cowork-scheduled-v4', 'code-editor-current-v4', 'code-current-v4'];
async function linkedAreas() {
  const out = [];
  for (const area of LINKED_AREA_NAMES) {
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    out.push(m.modules.some(x => !x.source) ? { area, modules: m.modules.filter(x => x.source).map(x => x.target) } : area);
  }
  return out;
}

// Roots held back until cds-core publishes what they need (D1: never cut twice). qE (PrBarRow) renders the menu body Rje,
// whose extraMenuItems go through shared-frame _D (renderMenuItems, 3.6556.2 shared-frame yT). cds-core holds _D and its
// menu parts (fD / dD / lD / rD / cD, over vendor-frame's Base UI menu) without a publicName, and they cannot be cut
// here (the Base UI copies reach react-dom internals). The generator checks the hold every run: once cds-core publishes
// _D the run stops, so the root moves back into ROOTS.
// Wave 7 (cds-integrate/wave7): cds-core publishes _D as renderMenuItems, so qE (PrBarRow) is emitted again: its menu body
// links _D from cds-core, and the chunks its closure enters past _D are listed below; nothing is pending.
export const PENDING_ROOTS = {};
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+(?:-\d+)?|preload-helper|rolldown-runtime|c[0-9a-f]+)-[\w-]+\.js$/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CLOSURE_CHUNKS = ['c227f4d5e-DGDdGBTz.js', 'cd4f82e77-Cuw99s6A.js', 'cd59309dc-Bi2OcXJ2.js', 'shared-20-DUEo90UF.js',
  'shared-62-DoCqVpIq.js', 'cfb0234e3-9B0TiD-4.js', 'c2fd10b8d-DEwP4IO5.js', 'shared-12-DVKzjo12.js', 'shared-4-C_EiQb9h.js', 'shared-0-CnnWnVrT.js', 'vendor-all-0-uUCo-eCX.js', 'shared-25-D-aF0gt9.js', 'shared-92-BOgyxePb.js', 'shared-11-CNsu0Zu8.js', 'shared-33-DtdykY0y.js', 'c761aa8b9-CdRbeywV.js', 'shared-18-Cfqwgjc5.js', 'c60636ac6-Qhz8qfr3.js', 'c25d7186f-CHE_J2eY.js'];
const emitted = (file, roots) => Object.fromEntries(Object.entries(roots).filter(([local]) => !PENDING_ROOTS[`${file}#${local}`]));
const modules = () => [
  ...Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

const rawCallSites = [];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map(), { requirePins = true } = {}) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined && requirePins) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== undefined && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== undefined });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map(), { requirePins = true } = {}) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin === undefined && requirePins) throw Error(`adapter ${key}: no reviewed pin`);
    if (pin !== undefined && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== undefined });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const item of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [orig, as] = item.split(/\s+as\s+/);
      exported.set(as ?? orig, { from: `src/${m[2]}`, orig });
    }
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a]));
  for (const [name, a] of wanted) if (exported.get(name)?.from !== a.from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${a.from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, { from, orig }] of exported) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${orig.replace('$', '\\$')}\\b|export \\{[^}]*\\b${orig.replace('$', '\\$')}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${orig} (${name})`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the session-rail-changes-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function sessionRailChangesV4Config() {
  return {
    name: 'session rail changes (4.16336.0)', generator: 'extract-session-rail-changes-v4.mjs', output: path.join(root, SESSION_RAIL_CHANGES_V4_OUTPUT),
    adapterModule: '../../source-session-rail-changes-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: [...LINKED_AREA_NAMES],
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/session-rail-changes/prestage/tools/probe.mjs) explores the same configuration.
export async function probeConfig() { return { ...sessionRailChangesV4Config(), linkedAreas: await linkedAreas() }; }

// Every pending root still waits: cds-core holds what it needs without publishing it.
async function assertPending() {
  const m = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(m.publicNames).map(v => `${v.file}#${v.local}`));
  const held = new Set(m.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`)));
  const out = [];
  for (const [key, p] of Object.entries(PENDING_ROOTS)) {
    for (const need of p.needs) {
      if (published.has(need)) throw Error(`${key} (${p.name}): cds-core now publishes ${need}; move the root back into ROOTS`);
      if (!held.has(need)) throw Error(`${key} (${p.name}): cds-core no longer holds ${need}; review the pending root`);
    }
    out.push({ root: key, ...p });
  }
  return out;
}

export async function extractSessionRailChangesV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const pendingRoots = await assertPending();
  const linked = {};
  for (const area of LINKED_AREA_NAMES) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...sessionRailChangesV4Config(), linkedAreas: await linkedAreas(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the session-rail-changes roots (${official.referenceVersion}); generated by extract-session-rail-changes-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).filter(([, rs]) => Object.keys(rs).length)
            .map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-session-rail-changes-v4.mjs',
          previous: { generator: 'scripts/extract-session-rail-changes.mjs', output: 'src/generated/session-rail-changes', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, pendingRoots, adapters, linkedCopies,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots(new Map(), { requirePins: false })) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters(new Map(), { requirePins: false })) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractSessionRailChangesV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
