// Session rail (the Code session's "Session details" aside, its derivations and the bands the rail module owns), 4.16336.0
// source contract (claude-4.16336.0-migrate-20261104, account2 batch 6, region session-rail): the semantic roots
// scripts/extract-session-rail.mjs cuts from 3.6556.2 into src/generated/session-rail and the host reads, re-located in
// the frozen 4.16336.0 snapshot and cut into the isolated graph src/generated/session-rail-v4. The 3.6556.2 output is
// untouched (staged double output; no production switch: src/source-session-rail.jsx, src/source-sleep-notice.jsx, the
// band hosts and the 3.6556.2 graphs that link session-rail keep reading src/generated/session-rail).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2 plan.json session-rail `linked`): every binding one of them already holds and exports is
//     imported from it, never cut again;
//   - host boundaries as localAdapters (file#local), each an existing host adapter re-exported by
//     src/source-session-rail-v4-adapters.jsx; each original is pinned by features and by its raw declaration sha256
//     (ADAPTER_PINS).
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
export const SESSION_RAIL_V4_OUTPUT = 'src/generated/session-rail-v4';
const ADAPTER_FILE = 'src/source-session-rail-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const RAIL = 'cf74bc599-BytvntCE.js';
export const DERIVE = 'c8b5c2821-DrjqITWr.js';
export const KIT = 'c73f45bc3-C7dtUSq8.js';
export const BAND = 'c0b46114c-hEcQAWZ3.js';
export const NOTICES = 'c227f4d5e-DGDdGBTz.js';
export const ROWS = 'c96d752d0-D9VB6ArX.js';
export const SIDEBAR = 'shared-22-BACJUrcb.js';
export const STABLE = 'shared-25-D-aF0gt9.js';

// ── Roots: file -> local -> { name, old (3.6556.2 root), export (chunk alias, null: chunk-internal), probe (raw), features } ─
export const ROOTS = {
  [RAIL]: {
    sN: { name: 'SessionRail', old: 'cf74bc599-CRYqipWN.js#Zj', export: null, probe: "sN=p(function(e){let $=J9(8),t,n;J1($,0,",
      features: ["({ sessionKey: n, ...t } = e)", "let r = n === void 0 ? vh : n,", "o(tN, { ...t })", "o(wp.Provider, { value: r, children: i })"] },
    eN: { name: 'NO_PLUGIN_SECTIONS', old: 'cf74bc599-CRYqipWN.js#Wj', export: null, probe: "eN=[]",
      features: ["var eN = [];"] },
    TM: { name: 'connectorLabel', old: 'cf74bc599-CRYqipWN.js#HA', export: null, probe: "function TM(e){let t=rn(e);return t?{lab",
      features: ["label: wM(t.connectorName),"] },
    FP: { name: 'useRailPendingHold', old: 'cf74bc599-CRYqipWN.js#SN', export: null, probe: "function FP(e,t){let $=J9(5),[n,r]=l(!1)",
      features: ["let i = setTimeout(() => r(!0), t);", "e && !n"] },
    PP: { name: 'useCheckoutInfo', old: 'cf74bc599-CRYqipWN.js#xN', export: null, probe: "function PP(e,t){let $=J9(8),n=t??\"local",
      features: ["{ ...r, select: NP }", "o = Ho(n === \"local\" ? e : null),", "o && o !== s.branch ? { ...s, branch: o } : s"] },
    DP: { name: 'useComposerMenuOpensRailSection', old: 'cf74bc599-CRYqipWN.js#mN', export: null, probe: "function DP(e,t){let $=J9(6),n=Ar(e,OP),",
      features: ["let i = n ? EP[n.menu] : void 0;", "if (i === \"settings\" && r) {", "(i !== \"environment\" && e.setHidden(i, !1), e.setOpen(t, i, !0));"] },
    uC: { name: 'useSaveEnvironmentSetup', old: 'cf74bc599-CRYqipWN.js#Vx', export: null, probe: "\"ukQpDs7M+0\"",
      features: ["besideNamed: c,", "defaultMessage: \"Folder\", id: \"ukQpDs7M+0\""] },
    xC: { name: 'RailSaveEnvironmentLink', old: 'cf74bc599-CRYqipWN.js#Qx', export: null, probe: "\"rail-save-environment-link\"",
      features: ["\"data-testid\": \"rail-save-environment-link\",", "defaultMessage: \"Save as environment\",", "defaultMessage: \"Save\", id: \"fs11ci1KNs\"", "() => yC(t, r, n)", "\"shrink-0 text-footnote text-muted-control\""] },
    SC: { name: 'RailSaveEnvironmentRow', old: 'cf74bc599-CRYqipWN.js#$x', export: null, probe: "\"Saved as environment \\u201C{name}\\u201D\"",
      features: ["\"data-testid\": \"rail-save-environment\",", "defaultMessage: \"Saved as environment \\u201C{name}\\u201D\",", "o(Th, { name: \"Bookmark\" })", "o(nC, {})"] },
    tC: { name: 'SessionStartLine', old: 'cf74bc599-CRYqipWN.js#Mx', export: null, probe: "\"Started on {place} \\u00B7 saved as environment \\u201C{name}\\u201D\"",
      features: ["\"data-testid\": \"epitaxy-save-start-line\",", "className: \"text-footnote text-muted-as-secondary\",", "(ly.getState().quietStartedPlace(t.target), r());", "defaultMessage: \"Started on {place} \\u00B7 saved as environment \\u201C{name}\\u201D\",", "o(D, { inheritColor: !0, onClick: n, children: o(nC, {}) }),"] },
    yC: { name: 'requestSaveEnvironment', old: 'cf74bc599-CRYqipWN.js#Xx', export: null, probe: "function yC(e,t,n){let r=r=>{let i=n??e.",
      features: ["saveEnvironmentRequest: { setup: t, checkout: vC(e, t, n), onSaved: r },", "_C(e, t, { savedAs: r.name })"] },
    _C: { name: 'recordSaveEnvironmentOutcome', old: 'cf74bc599-CRYqipWN.js#Jx', export: null, probe: "function _C(e,t,n){let{startedSetup:r}=e",
      features: ["\"updated\"", "moveLineOutcome:"] },
    dA: { name: 'SleepBand', old: 'cf74bc599-CRYqipWN.js#wO', export: null, probe: "\"sleepNotice\"",
      features: ["Fm(r, \"sleepNotice\", Le)", "version: \"rework\",", "version: \"legacy\","] },
    Qk: { name: 'KeptAwakeBand', old: 'cf74bc599-CRYqipWN.js#dO', export: null, probe: "\"keepAwakeNotice\"",
      features: ["{ sessionRef: t, inTranscript: n, scopeStore: r, focusComposer: i } = e,", "v = _?.keptAwake ?? (d ? p : void 0),", "if ((Fm(r, \"keepAwakeNotice\", Ae), !m)) return null;", "slot: \"keptAwake\",", "id: \"kept-awake\","] },
  },
  [DERIVE]: {
    Pe: { name: 'railFolder', old: 'cf74bc599-CRYqipWN.js#Cj', export: 'd', probe: "function Pe({isLocal:e,originCwd:t,worki",
      features: ["if (r) return o ? { name: o, path: l, hidePath: !0 } : null;", "name: U(i) || a || J(u),", "...(u !== l && { basePath: u }),", "...(m && { repoSlug: m }),", "clonesRepos: s = !1,", "repoSlugs: c = [],"] },
    Ae: { name: 'railExtraFolders', old: 'cf74bc599-CRYqipWN.js#_j', export: 'u', probe: "function Ae({directories:e,trees:t=Ne,re",
      features: ["trees: t = Ne,", "worktreeRemoved: !0,", "worktree: { name: e.worktreeName, path: e.worktreePath },", "(t.repoLinks ??= e.repoLinks)", "repoSlugs: r,"] },
    Oe: { name: 'otherRepos', old: 'cf74bc599-CRYqipWN.js#gj', export: 'E', probe: "function Oe(e,t,n){return n===null?e:e.f",
      features: ["return n === null ? e : e.filter((e) => e !== t);"] },
    Le: { name: 'knownBranch', old: 'cf74bc599-CRYqipWN.js#Ej', export: '_', probe: "function Le({liveWorktree:e,recorded:t,c",
      features: ["return (e ? void 0 : t) || n || t || r || void 0;"] },
    Re: { name: 'railBranch', old: 'cf74bc599-CRYqipWN.js#Dj', export: 'c', probe: "function Re({discovered:e,known:t,inChec",
      features: ["? { name: i }", "? { name: null }"] },
    Ke: { name: 'railWorktree', old: 'cf74bc599-CRYqipWN.js#Lj', export: 'f', probe: "function Ke({isLocal:e,originCwd:t,worki",
      features: ["return !e || !n || n === t || (!r && !Ge.test(n))", ": { name: J(n), path: n };"] },
    qe: { name: 'lazyWorktreePending', old: 'cf74bc599-CRYqipWN.js#Rj', export: 'p', probe: "function qe({isLocal:e,cwd:t,originCwd:n",
      features: ["return e && o === !0 && s !== !0 && !r && !i && !a && !!n && t === n;"] },
    q: { name: 'lazyWorktreeState', old: 'cf74bc599-CRYqipWN.js#zj', export: 'j', probe: "\"notEntered\"",
      features: ["? { kind: \"notEntered\" }", "? { kind: \"ready\", branch: i }", ": { kind: \"preparing\" };"] },
    Ue: { name: 'railEnvironment', old: 'cf74bc599-CRYqipWN.js#Mj', export: 'l', probe: "function Ue({named:e,...t}){if(!e)return",
      features: ["labels: { local: null, cloud: null, bridge: null },", "...(n !== null && n !== e.name && { details: [{ value: n }] }),"] },
    ze: { name: 'environmentKind', old: 'cf74bc599-CRYqipWN.js#Oj', export: 'w', probe: "function ze({remoteHost:e,isBridge:t,isL",
      features: ["?.type === \"pool\"", "? \"selfHosted\""] },
    De: { name: 'environmentConnection', old: 'cf74bc599-CRYqipWN.js#hj', export: 'S', probe: "\"notConnected\"",
      features: ["case \"idle\":", "return \"notConnected\";"] },
    Fe: { name: 'remoteControlState', old: 'cf74bc599-CRYqipWN.js#wj', export: 'k', probe: "function Fe({metaFetched:e,metaPending:t",
      features: ["prefsPending: i,", "return n && (e || !t) ? n : i || (r && t) ? \"pending\" : void 0;"] },
    Me: { name: 'connectorRows', old: 'cf74bc599-CRYqipWN.js#yj', export: 'C', probe: "\"unavailable\"",
      features: ["labelOf: a = je,", "targets: i,", "n === \"failed\" || n === \"needs-auth\" || n === \"unavailable\""] },
    Ye: { name: 'isSideSessionNotesFolder', old: 'cf74bc599-CRYqipWN.js#Hj', export: null, probe: "function Ye(e){return Je.test(e)}",
      features: ["return Je.test(e);"] },
    Ie: { name: 'RAIL_PENDING_GIVE_UP_MS', old: 'cf74bc599-CRYqipWN.js#Tj', export: 's', probe: "Ie=6e3",
      features: ["var Ie = 6e3;"] },
  },
  [KIT]: {
    ub: { name: 'NAME_PENDING_GIVE_UP_MS', old: 'c73f45bc3-B7hbL7H9.js#_v', export: 'R', probe: "ub=2e3",
      features: ["var ub = 2e3;"] },
    _C: { name: 'RailEditEnvironmentButton', old: 'c73f45bc3-B7hbL7H9.js#Zx', export: 'o', probe: "\"Edit environment\"",
      features: ["i = t === void 0 ? \"cloud\" : t,", "o = lt(i === \"local\" ? _d : nu),", "defaultMessage: \"Edit environment\", id: \"cfNkVEwvig\"", "defaultMessage: \"Edit cloud environment\", id: \"B2B5sIxbna\"", "variant: \"ghost\",", "size: \"xs\",", "iconOnly: !0,", "flush: \"end\",", "icon: \"Settings\",", "\"aria-label\": s,", "onClick: n,"] },
    Cd: { name: 'isRailEditableEnvironment', old: 'c73f45bc3-B7hbL7H9.js#fu', export: 'fr', probe: "function Cd(e){return e?.target.kind===\"",
      features: ["return e?.target.kind === \"local\" && !e.target.wslDistro && !e.target.variant;"] },
  },
  [BAND]: {
    v: { name: 'BandFrame', old: 'c0b46114c-Tzv34BiL.js#_', export: 'r', probe: "\"flex min-w-0 flex-1 flex-wrap gap-x-sm gap-y-sm\"",
      features: ["standsInForComposer: y,", "\"flex min-w-0 flex-1 flex-wrap gap-x-sm gap-y-sm\"", "a(u(r), l, \"text-body\", p, c)"] },
    b: { name: 'BandActionCell', old: 'c0b46114c-Tzv34BiL.js#y', export: 'i', probe: "function b(t){let $=J9(2),{children:n}=t",
      features: ["className: \"flex h-[1lh] shrink-0 items-center\""] },
  },
  [NOTICES]: {
    g$: { name: 'InlineBand', old: 'c227f4d5e-B-FYKrwT.js#oL', export: 'En', probe: "function g$(e){let $=J9(57),{kind:t,mess",
      features: ["standsInForComposer: E,", "R = k || A ? \"note\" : \"status\",", "t === \"approaching\" ? \"UsageGaugeMiddle\" : \"UsageGaugeHigh\",", "className: \"flex flex-wrap items-baseline gap-x-2.5 gap-y-0.75\","] },
  },
  // round4 relink-w8: RepoNameChip (c96d752d0 OE, 3.6556.2 c96d752d0-CWv_7-n9.js#dL) is no longer a root here:
  // session-rail-changes-v4's PrBarRow closure already slices it, so it moved there as a root (same probe, features and
  // pin) and SessionRail links it from there (D1: never cut twice).
  [SIDEBAR]: {
    sP: { name: 'pinnedSectionMessages', old: 'shared-22-Bwn3sJTG.js#rM', export: null, probe: "\"Pinned\"",
      features: ["pinned: { defaultMessage: \"Pinned\", id: \"A8GDlh2QW4\" },", "\"Tip: you can drag {kind, select, code {sessions} cowork {tasks} other {chats}} here to pin them\"", "dragToPin: { defaultMessage: \"Drag to pin\", id: \"a6msxIE91i\" },", "dropHere: { defaultMessage: \"Drop here\", id: \"Au4AP9NTeL\" },", "letGo: { defaultMessage: \"Let go\", id: \"9Z0I31VbJD\" },"] },
  },
  [STABLE]: {
    tJ: { name: 'useStableArray', old: 'shared-25-DOWZRSlq.js#UH', export: 'Kt', probe: "function tJ(e){return IW(e,eJ)}",
      features: ["return IW(e, eJ);"] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'cf74bc599-BytvntCE.js#sN': 'd00b1100f81dc31f59bf0e4e22d9fb2db75088b9155af9d1df242b242625cc6a',
  'cf74bc599-BytvntCE.js#eN': 'af6eb18b033f41813ee2289c7d36f6fd032c446145ae30f8144ac701ec204b1f',
  'cf74bc599-BytvntCE.js#TM': 'f386ad25a166fa51dfb6895d159e4cc9b21cccc7fd2ae0a314bc8c8f47120dcf',
  'cf74bc599-BytvntCE.js#FP': 'adbb8715731be935a5f9a027aff853fef8ac78d5d02fd6d4e4f40396effa8d68',
  'cf74bc599-BytvntCE.js#PP': '9a5653738eaf141597472aa84337305265783a911372f0f6e1195c8d33170556',
  'cf74bc599-BytvntCE.js#DP': 'a09e80c39c9c06675a670f22a6843a5604a23b847e0d021d586f69441f5f7844',
  'cf74bc599-BytvntCE.js#uC': 'b1a26913c71ed25189b3f72552bd753fa3c1f9e02340d30099fab82b65a1de5a',
  'cf74bc599-BytvntCE.js#xC': '6893b6bc094db3a8a62ebc19b2e6a038cfc163f9c66bfa4080f9c2d4d7afd6ae',
  'cf74bc599-BytvntCE.js#SC': '9df4bac25e13b40045a781b9033638f3fb02806dbaf89a007e3971849e5f2292',
  'cf74bc599-BytvntCE.js#tC': '9fcaff301c10f349ef581c2ecad772ac4fe9c7283bb63f93cd310bd77781e02c',
  'cf74bc599-BytvntCE.js#yC': 'e25c662e4ad4487414af5ff2ae5d1dd4fc3667bf2a5dffa039384663ad9bb4fe',
  'cf74bc599-BytvntCE.js#_C': 'aabff7546f16bb9a5e84a29830ac3666e5562b1c84a3a0eeafea31985a113dd9',
  'cf74bc599-BytvntCE.js#dA': '7ec1e170736deeb5a29aa8f5517196ff6c52728278323451580ac6387f4bbb39',
  'cf74bc599-BytvntCE.js#Qk': 'c17f674d99c84388572801af6dd79c0e800049a6b3c014bf00f9d1e151abf074',
  'c8b5c2821-DrjqITWr.js#Pe': 'e7ae9e4353a95e93dcfa15100ec7c570c0e77ac514938a70922bdab38b0aa584',
  'c8b5c2821-DrjqITWr.js#Ae': 'd2dfcafc6e4a820efcb8b61975ee2e1f2ac095868244564723a7286b33ad6c48',
  'c8b5c2821-DrjqITWr.js#Oe': '35eae3b0ee01344e2229290f024b5c0eb0a1b0a01fe97e9e0fb2e58a4c3fb17f',
  'c8b5c2821-DrjqITWr.js#Le': '97f78b87b93e4303b2416ee28245e8954ce3ccbc69f9282fc6691c3fdfbbfb09',
  'c8b5c2821-DrjqITWr.js#Re': 'd0c5e768fe54c5ebcfe609e1bbd8c55839fa58298f3433b112ab1d3167aece71',
  'c8b5c2821-DrjqITWr.js#Ke': 'b36ebe04987c65cad8e2d573001487644b4eefab1d533cfc1567fd18dcd0be7f',
  'c8b5c2821-DrjqITWr.js#qe': '48fcf9747770b594288c3fb07172c335795ef0a93c983693d022327ea25ae3b0',
  'c8b5c2821-DrjqITWr.js#q': '6cbb487692234e48907d528bc31a5e53c74c91419f64f941dc3a052bd6478cf5',
  'c8b5c2821-DrjqITWr.js#Ue': 'dd5e1e9dc7465e54fb5ccbcd378cbabb73f06c73bf53c5ff161105bc5fc1416d',
  'c8b5c2821-DrjqITWr.js#ze': '21eb775ae358144d341dcd2dc6a7b28ed3026a27a43d053d7123ee5478554aef',
  'c8b5c2821-DrjqITWr.js#De': '517abb531c72389a2c071b11348666ca55b66ba8cf1f00595d0672267be48d09',
  'c8b5c2821-DrjqITWr.js#Fe': '0d521d795f910ddd9a614d6d6a59c6d0a390b1cc3359030a707968f9c8bfa648',
  'c8b5c2821-DrjqITWr.js#Me': '04961cd07fdf6555717b668e831dc9c026ed0d79ca591bed9717c377927e2d3b',
  'c8b5c2821-DrjqITWr.js#Ye': '7f2a49ce4380bc5c63149eb33c1fc54c518bcb07d095eab11afd7eca3377df90',
  'c8b5c2821-DrjqITWr.js#Ie': '89d977f4560c5c03791a550e5cfaf1971926bc4454d6ee23def009df826e60c7',
  'c73f45bc3-C7dtUSq8.js#ub': 'd051a0c7e54aee44376a0c8497b83c3ee8adfe3fec1537df82ba393c62887ee9',
  'c73f45bc3-C7dtUSq8.js#_C': '575ff7dd07cb5033de28ae075243ffbd68bc0fb1c749666bd2a241ad8ab878cd',
  'c73f45bc3-C7dtUSq8.js#Cd': '98e228d413e5dd0df1f55f81c517c206dde166a3c1427b897779dc63bd8f3b47',
  'c0b46114c-hEcQAWZ3.js#v': 'ea2f4849b80bcbc8e309d15e80a3a8e6b89a3c0b4ec493e9c976a0ab797cdc91',
  'c0b46114c-hEcQAWZ3.js#b': '1bcb4bb54dcdccb56edf8f8084ed6a2b3925c11e943e7ff9cca01ed3d4c18683',
  'c227f4d5e-DGDdGBTz.js#g$': '1cf705779d26324c4145b715754d874bb76d4787f82366eee68781b228eb7d83',
  'shared-22-BACJUrcb.js#sP': '0944bfaa7c9227a52a7d762e5446a3b5c0e52f3b021f182bf80acc296366a6fa',
  'shared-25-D-aF0gt9.js#tJ': '9c3b1ca2f015db366375e20e0e5c7530ed674dfaaf9d613a3e0f1307d52a9c9c',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (the host module it re-exports), old,
// features } ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const SR = 'src/source-session-rail-adapters.jsx', SRK = 'src/source-session-rail-kit-adapters.jsx';
export const HOST_ADAPTERS = {
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: SRK, old: 'vendor-intl-DYfox5Co.js#q',
    features: ["return (Mt(e), e);"] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: SRK, old: 'vendor-intl-DYfox5Co.js#Gt',
    features: ["var Gt = a(Wt, Ut);"] },
  'c68c4283d-FxwfdZSA.js#Xf': { name: 'logRailSectionEvent', from: SRK, old: 'c68c4283d-CWbOoVxS.js#_f',
    features: ["u(\"claudeai.epitaxy.session_rail.section_moved\", { section: t });"] },
  'c856385e2-Cqx37C-b.js#Pr': { name: 'SessionFileRef', from: SR, old: 'c856385e2-aEyDzrcK.js#rr',
    features: ["fileRef: t,", "blockedClassName: u,", "preferDiff: c,", "isTranscriptMarkdown: l,"] },
  'c73f45bc3-C7dtUSq8.js#RS': { name: 'useScratchCopyOf', from: SR, old: 'c73f45bc3-B7hbL7H9.js#Vb',
    features: ["if (!t?.scratchCarried) {", "carried: e,"] },
  'shared-39-ZCs0lAwB.js#Rg': { name: 'useLiveCheckoutBranch', from: SR, old: 'shared-11-_AVGLHEz.js#_m',
    features: ["t.rows[e]?.branch"], closureFeatures: ["G?.getGitStateSnapshot"] },
  [`${RAIL}#IM`]: { name: 'useSessionOutputPaths', from: SR, old: 'cf74bc599-CRYqipWN.js#ZA',
    features: ["{ sessionRef: t, checkouts: n, copyOf: r, folders: i } = e,", "return Pe(u);"] },
  'c0a74d72b-BELp4TMv.js#di': { name: 'useGoneOutputPaths', from: SR, old: 'cf74bc599-CRYqipWN.js#zA',
    features: ["o = R?.resolveSessionFile !== void 0,", "l.length === 0"] },
  [`${RAIL}#MN`]: { name: 'RemoteControlRow', from: SR, old: 'cf74bc599-CRYqipWN.js#SM',
    features: ["{ remoteControl: t, icon: n } = e,", "t.lockedByRemoteClient", "defaultMessage: \"Remote Control options\","] },
  [`${RAIL}#_N`]: { name: 'ProgressCardBody', from: SR, old: 'cf74bc599-CRYqipWN.js#sM',
    features: ["disableCommentAttachment: !0,"] },
  [`${RAIL}#kM`]: { name: 'ArtifactOutputRow', from: SR, old: 'cf74bc599-CRYqipWN.js#KA',
    features: ["{ artifact: t, onOpen: n } = e,", "defaultMessage: \"Updated {when}\",", "defaultMessage: \"Artifact\", id: \"PpIQsaWAR2\""] },
  'cd0cf5b5e-DJvJrkr3.js#B': { name: 'useEnvironmentStore', from: SR, old: 'cd0cf5b5e-BCzJmEwZ.js#z',
    features: ["environments: [],", "markStartedFrom: (t) =>", "startedPlaces"] },
  'shared-55-BRv2XBP7.js#DV': { name: 'recordSessionEnvironment', from: SR, old: 'shared-46-BIbZBGFq.js#IL',
    features: ["CV.getState().record(e, t)"] },
  'c73f45bc3-C7dtUSq8.js#Sd': { name: 'addRemoteEnvironment', from: SR, old: 'c73f45bc3-B7hbL7H9.js#du',
    features: ["r.addEnvironment({ ...e, name: e.name.trim() })", "r.markStartedFrom(i.id),"] },
  'c73f45bc3-C7dtUSq8.js#_d': { name: 'localEnvironmentDialogHandle', from: SR, old: 'c73f45bc3-B7hbL7H9.js#ou',
    features: ["var _d = hd.handle;"], closureFeatures: ["hd=rt({entry:{id:\"epitaxy_new_preset_dialog\"", "pick:e=>e.EpitaxyEnvironmentDialog"] },
  'cc5b397c6-DU_V7iXM.js#l': { name: 'cloudEnvironmentDialogHandle', from: SR, old: 'cc5b397c6-BgWEcD7A.js#l',
    features: ["var l = a.handle;"], closureFeatures: ["id:\"epitaxy_environment_dialogs\"", "pick:e=>e.EpitaxyEditEnvironmentDialog"] },
  'shared-62-DoCqVpIq.js#rP': { name: 'useBandErrors', from: SR, old: 'shared-52-uHFNjl7C.js#cB',
    features: ["Must be called within ErrorsProvider"] },
  'c227f4d5e-DGDdGBTz.js#X0': { name: 'previewStateHook', from: SR, old: 'c227f4d5e-B-FYKrwT.js#Q0',
    features: ["return vn(() => !1, !1);"] },
  'c5da7eb42-aEqbSKbC.js#LL': { name: 'useSessionBandFields', from: SR, old: 'c5da7eb42-XijZdwf1.js#QI',
    features: ["{ select: t, passive: r, enabled: i }"] },
  'c5da7eb42-aEqbSKbC.js#WL': { name: 'useSessionBandRunning', from: SR, old: 'c5da7eb42-XijZdwf1.js#aL',
    features: ["select: UL,", "return i ?? !1;"] },
  'c06cf64bb-CoZso5N4.js#YD': { name: 'subscribeSessionSendBegun', from: SR, old: 'c06cf64bb-CdJdJuVd.js#IE',
    features: ["JD.set(e, n)", "n.add(t),"] },
  'c6b8adeaf-qnfs920E.js#ss': { name: 'useStopSessionMutation', from: SR, old: 'c6b8adeaf-bLEQVSWL.js#So',
    features: ["\"Couldn\\u2019t stop the response \\u2014 check your connection and try again.\"", "mutationFn: u,"] },
  'c6b8adeaf-qnfs920E.js#Io': { name: 'useBandSend', from: SR, old: 'c6b8adeaf-bLEQVSWL.js#Xa',
    features: ["sendWithOutcome: y,"] },
  [`${RAIL}#Kk`]: { name: 'useCanContinueInCloud', from: SR, old: 'cf74bc599-CRYqipWN.js#aO',
    features: ["canContinueInCloud: d, settled: f"] },
  'caec4a2d4-BQDPvHyW.js#Gr': { name: 'useCloudEnvironments', from: SR, old: 'caec4a2d4-6hekX2da.js#Ir',
    features: ["e?.environments?.filter(Kr)"] },
  'shared-62-DoCqVpIq.js#JP': { name: 'useCloudEnvironmentList', from: SR, old: 'shared-104-CTONUSaz.js#du',
    features: ["env_list_stale_ms"] },
  'cc53cbea3-CY_z2ua4.js#b': { name: 'useCloudResumeOn', from: SR, old: 'cc53cbea3-rBkNppou.js#b',
    features: ["return s(y) !== \"off\";"] },
  'cc53cbea3-CY_z2ua4.js#C': { name: 'clearTeleportMarker', from: SR, old: 'cc53cbea3-rBkNppou.js#C',
    features: ["delete n[e]"] },
  'cc53cbea3-CY_z2ua4.js#M': { name: 'CloudResumeBanner', from: SR, old: 'cc53cbea3-rBkNppou.js#M',
    features: ["{ sessionRef: n, source: i, paused: a, onResume: s } = e,"] },
  'caec4a2d4-BQDPvHyW.js#bo': { name: 'TeleportToCloudDialog', from: SR, old: 'caec4a2d4-6hekX2da.js#fo',
    features: ["var bo = l(yo);"] },
  'shared-25-D-aF0gt9.js#Ao': { name: 'useBandFeatureState', from: SR, old: 'shared-25-DOWZRSlq.js#ps',
    features: ["K1($, 2, t, co(t))"] },
  'c1e585df0-CzOusXJc.js#o': { name: 'useKeepAwakeSettingLoaded', from: SR, old: 'c1e585df0-xuGOMujX.js#o',
    features: ["var o = n.useHasKey;"], closureFeatures: ["n=e(\"ccKeepAwakeWhileWorking\",!0)"] },
  'c1e585df0-CzOusXJc.js#i': { name: 'useKeepAwakeWhileWorking', from: SR, old: 'c1e585df0-xuGOMujX.js#i',
    features: ["var i = n.useEnabled;"], closureFeatures: ["n=e(\"ccKeepAwakeWhileWorking\",!0)"] },
  'c1e585df0-CzOusXJc.js#a': { name: 'useKeepAwakeOnBattery', from: SR, old: 'c1e585df0-xuGOMujX.js#a',
    features: ["var a = r.useEnabled;"], closureFeatures: ["r=e(\"ccKeepAwakeOnBattery\",!0)"] },
  'c1e585df0-CzOusXJc.js#c': { name: 'useWriteKeepAwakeSetting', from: SR, old: 'c1e585df0-xuGOMujX.js#c',
    features: ["c.write(n)"] },
  'shared-5-u8kha2eH.js#Y_': { name: 'useBandPersistedPreference', from: SR, old: 'shared-28-DNYlf4wu.js#Kp',
    features: ["a = n?.scope === \"account\","] },
  'shared-5-u8kha2eH.js#P_': { name: 'useAccountPreferencesReady', from: SR, old: 'shared-28-DNYlf4wu.js#Mp',
    features: ["return e && t?.uuid !== void 0;"] },
  'shared-1-D1bGaTaN.js#xB': { name: 'useOnSessionScopeHiddenChange', from: SR, old: 'shared-1-BJhqMmkf.js#TE',
    features: ["vB(t, (e) => {"] },
  'c06cf64bb-CoZso5N4.js#xk': { name: 'useSessionBandInputWaiting', from: SR, old: 'c06cf64bb-CdJdJuVd.js#aO',
    features: ["return X(e, Sk);"] },
  'shared-31-C9BqSSuD.js#MT': { name: 'useHubToolApprovalBodyShown', from: SR, old: 'shared-4-DUB1Oi0O.js#bk',
    features: ["return AT(NT);"] },
  'shared-8-BqfCbkJd.js#bv': { name: 'useLocalSessionsStore', from: SR, old: 'shared-8-Db1QN4mf.js#og',
    features: ["sessions: [],", "isInitialized: !1,", "initialLoadTimedOut: !1,"] },
  'c4e18af0a-BixluxS2.js#c': { name: 'canonicalModelId', from: SR, old: 'cecbf1aa5-BT0v8IlE.js#l',
    features: ["let i = r(t),", "return `${e(i)}${a}`;"] },
  'shared-62-DoCqVpIq.js#OT': { name: 'useAnalytics', from: 'src/source-routines-shared-adapters.jsx', old: null,
    features: ["return ZS;"] },
  // round4 relink-w8 (SessionRail sN): shared-62 Ha (export CS) loads the public suffix list chunk cd668e25e once (Pa ??= Va(),
  // a dynamic import of a chunk this graph does not emit), for the site name of a favicon (shared-123 Ai / PD). The host
  // does not serve that chunk: the existing answer of cowork-live-v4 / cowork-approval-v4 (src/source-code-transcript-adapters.jsx
  // loadPublicSuffixList, Promise.resolve()) is re-exported unchanged, so the site name falls back to the bare host, as the
  // original does until the list arrives.
  'shared-62-DoCqVpIq.js#Ha': { name: 'loadPublicSuffixList', from: 'src/source-code-transcript-adapters.jsx', old: null,
    features: ['return typeof window > "u" ? Promise.resolve() : ((Pa ??= Va()), Pa);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'c68c4283d-FxwfdZSA.js#Xf': 'f7511bdf4ef4f99dd3b6817d15ef6ee428608e91f91fe8d0a14ac31eb1aa5f06',
  'c856385e2-Cqx37C-b.js#Pr': 'fe808623835c8776d7b5ba421afbed55a83d8b1cf898e6809be04aefb8cd9d03',
  'c73f45bc3-C7dtUSq8.js#RS': 'fe36c95a7f239fa8ed23d3c85c1277422977a167d9d9bfa419da0ae161c964dd',
  'shared-39-ZCs0lAwB.js#Rg': 'b29f96e6fc3435c957fbc3d6e90c616ca42e5ee304b0a3e62b371ae75087c81b',
  'cf74bc599-BytvntCE.js#IM': '58d268d06dbd7bfb8d8739e7e3ee806b89260300ecdfee541289be17e18936d3',
  'c0a74d72b-BELp4TMv.js#di': '89d0049b7b7b8cb5786f4fc9af41aaf93b0e738fb2da8fc7037dce227255ac69',
  'cf74bc599-BytvntCE.js#MN': '40f6fcb23967fc854d5832d97c6a3094aad8e039f5ffc546a177947946435f05',
  'cf74bc599-BytvntCE.js#_N': '561d80d3ca7bf4220199d72b302cbe97a3d55bea38852293f4ded3a67af535a7',
  'cf74bc599-BytvntCE.js#kM': '6f9445b1c062318d12959a98c214018344d7826fad7e90a2c0cd6a54fa9f456a',
  'cd0cf5b5e-DJvJrkr3.js#B': 'dab134751d8be09df226bd9515aa7affd2122beb58a24380f972494fc22e3de9',
  'shared-55-BRv2XBP7.js#DV': '081bacd29563dbd1eb8a63de5374c5d1bf61fcaa84299923b1d198cd3adf74b5',
  'c73f45bc3-C7dtUSq8.js#Sd': 'abd276ece4ced6b4ea0d12b5a489309d7906913a3c1f84236056644e2ffc977d',
  'c73f45bc3-C7dtUSq8.js#_d': '139c8b87f935b75a9ba49a3c83c442506f71cbc479df5c943055a3f1108c0993',
  'cc5b397c6-DU_V7iXM.js#l': '45173b129ebbc58b27099ba7341e9b6deaad66910567d9c8cc6e147f0067188f',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'c227f4d5e-DGDdGBTz.js#X0': '3b486aaf96b8f007bb6adee6758245d5bca8065feea71ca44b3da213b793d63e',
  'c5da7eb42-aEqbSKbC.js#LL': '6b7105ae24f3ae257f8320347117a0f95159a2f96952da4134221c3550c95cca',
  'c5da7eb42-aEqbSKbC.js#WL': '9a0656109f4f77c806b618914cb01e2eee101cc8debe4e9bd41a53d97fdb7c40',
  'c06cf64bb-CoZso5N4.js#YD': 'a3c3172e907f4a3f849d14bca482c044e54d3e845d295421c5992855a1d9c208',
  'c6b8adeaf-qnfs920E.js#ss': '568f32c71940ae8ced6bd9e44692299c3fbf937f237adcd4ad04b6ef17181850',
  'c6b8adeaf-qnfs920E.js#Io': '7fbee97bc9490a0971f183322a7ea9357311a74212d8c8cc2fb6a68f242ebf6a',
  'cf74bc599-BytvntCE.js#Kk': 'aa2a8ddeb47ea4dbd1273a895ea7b88c9ae280ed1945caf6e561b59c217d0880',
  'caec4a2d4-BQDPvHyW.js#Gr': 'ed3598fd241bc19475f1348719daabb2d12f12c59054ca23b69c68783ab6d386',
  'shared-62-DoCqVpIq.js#JP': 'd22269c7e74e94c129bef80cfee91509a2ba377bb34e89d2311ba04d2d0cf1ba',
  'cc53cbea3-CY_z2ua4.js#b': 'b8be6cce08b932a5b281a025f73c18b8880599c0c052893c599cce2c44972fa6',
  'cc53cbea3-CY_z2ua4.js#C': 'feb2543bf57061d9d9449d9c92272b5101611b073de1ade7b85e324c6549bb49',
  'cc53cbea3-CY_z2ua4.js#M': 'c65c06d7a81b957c64eebde778bb682e170e00094d5cacd1ce8e5b7c4b89ae6d',
  'caec4a2d4-BQDPvHyW.js#bo': '6bef55d205be8d1fab2ed2af8bb7ea53b61d6c8c488269585b795f5640656917',
  'shared-25-D-aF0gt9.js#Ao': 'e18592a61c3048d0f8e4c7a0893d486b81ebc569cffdf650040bd9a508938559',
  'c1e585df0-CzOusXJc.js#o': '8075d0ef33e70cf1d26a578636776ae391aa3edb63d56feb945792639130d686',
  'c1e585df0-CzOusXJc.js#i': 'ae8a309c8159ea80de8faa8a7fe6b2c623b890c8e821076d1b51acab6ef64ee8',
  'c1e585df0-CzOusXJc.js#a': '37cb9afef50ba4d999369f7edd4da45297bc419318fa24b568c7061b59b34798',
  'c1e585df0-CzOusXJc.js#c': 'e3dba7da201d7346b34e5c7cc2b80c1f67632f0e390684808885639ec12309f2',
  'shared-5-u8kha2eH.js#Y_': '27a264f6a7ab041dbf339a1d6133a8a085e8f5924f863db30b2eddf246ab2faf',
  'shared-5-u8kha2eH.js#P_': 'ff89bb87cf3bddfeb1f70b0fe6dbe7f9c5b59c88bec6bf3b8b30e26838caf72c',
  'shared-1-D1bGaTaN.js#xB': '4933f5f252a8cc6bfae143893070ca5b17dbce83b5882092fe806a16d6a12c1f',
  'c06cf64bb-CoZso5N4.js#xk': '304401650c381c849eb1adf92f86745977740bf5c7de0e7feb030f8b2cc28c8e',
  'shared-31-C9BqSSuD.js#MT': '8244840b32a0d5aae94e39b70bb5f56bb7e6dfbb5d86c65ccff1a6fd7ad7dc38',
  'shared-8-BqfCbkJd.js#bv': 'b0e8d90c58b158430a7faac4998bb97f5cd43b26388c9e07c07cd9dbd08c8bab',
  'c4e18af0a-BixluxS2.js#c': 'a2ada579c3d8a29d858bb0102d5afc8fcfbd7421f9621c343287781799881988',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'shared-62-DoCqVpIq.js#Ha': 'acb67cbb0d761657c236cc3960f84cf8f5e20d8576fbbd9786b8ad98f1e3f00e',
};

// Pure bindings a linked area cuts without exporting, cut again here (each with its reason).
const linkedCopies = {
  // shared-18 rJ (exported Mn): a path without its trailing slashes (a drive root kept). code-current-v4
  // chunk-electron-shared-18.mjs slices it without exporting it; aJ (same folder) reads it here. A pure function.
  'shared-18-Cfqwgjc5.js#rJ': 'pure function (no state)',
  // round4 relink-w8 (SessionRail sN): c280f9bbb L (`function L() { return i(m); }`, use of the file-type icon set context):
  // a pure reader; files-changes-v4 file-type-icon.mjs slices it without exporting it. Its one piece of state, the context m
  // (c17ed8826 t), is linked from files-changes-v4 file-type-icon-context.mjs (FileTypeIconSetContext), never cut again.
  'c280f9bbb-BOcpax9X.js#L': 'pure function (reads FileTypeIconSetContext, linked from files-changes-v4)',
};

// D1 (plan.json session-rail linked.linkedAreas + linked.linkedGraphs): code-current-v4's manifest is not a runSlicer
// manifest (five semantic modules have no official source): it is linked through the modules that name their chunk.
export const LINKED_AREA_NAMES = ['composer-notices-v4', 'cowork-progress-v4', 'cowork-scheduled-v4', 'cowork-session-states-v4', 'files-changes-v4',
  'retry-decision-v4', 'routines-shared-v4', 'session-rail-changes-v4', 'session-rail-kit-v4', 'session-rail-sections-v4', 'sessions-page-v4',
  'code-current-v4', 'frame-sidebar', 'settings-nav',
  // round4 relink-w8 (SessionRail sN): r3b-transcript-v4 (cd8a7d7c0 usePathHoverOptions / the label options context m),
  // session-panels-v4 (c4db265df PaneReadingOrderContext) and queued-bar-v4 (dnd-kit c09f6b4e5, its first and only holder,
  // linkExports Bn / Ct / Jt / Xt / Yt / ce / qt / rn / sn, and the pure helpers N / y / _ / v / Dn) hold what the rail's closure reads.
  'r3b-transcript-v4', 'session-panels-v4', 'queued-bar-v4'];
async function linkedAreas() {
  const out = [];
  for (const area of LINKED_AREA_NAMES) {
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    out.push(m.modules.some(x => !x.source) ? { area, modules: m.modules.filter(x => x.source).map(x => x.target) } : area);
  }
  return out;
}

// Roots held back until cds-core publishes what they need (D1: never cut twice).
// SessionRail (sN: tN's folder rows render the repo-name chip) and RepoNameChip (OE = memo(_je), whose repo menu body
// goes through shared-frame _D, renderMenuItems; 3.6556.2 shared-frame yT, which the 3.6556.2 graph read over view-tabs'
// CdsDropdown members): cds-core holds _D and its menu parts (fD / dD / lD / rD / cD, the members of the published
// CdsDropdown UD = Object.assign(xD, {..., Popup: rD, Item: cD, Separator: fD, Submenu: dD, SubmenuTrigger: lD, ...}))
// without a publicName, and runSlicer has no member reads of a published compound. Cutting _D here would copy the Base UI
// menu out of vendor-frame (react-dom internals). The generator checks the hold every run: once cds-core publishes _D the
// run stops, so the roots move back into ROOTS (session-rail-changes-v4 waits for the same name, its PrBarRow qE).
// Wave 7 (cds-integrate/wave7): cds-core publishes _D (renderMenuItems), so `needs` is met. With _D linked the closure of
// both roots goes on (cds-integrate/wave7 dry-run: eleven more chunks, shared-62 Va's lazily loaded public-suffix chunk
// cd668e25e, which lazyVerbatim would copy) to c280f9bbb L (the file-type icon set reader), which files-changes-v4 slices
// in file-type-icon.mjs without exporting it: a D1 owner this graph cannot link until files-changes-v4 exports it.
// `blockedBy` records that hold; the generator checks it every run (once files-changes-v4 exports L, or stops slicing it,
// the run stops and the roots move back into ROOTS).
// round4 relink-w8: nothing is pending. SessionRail (sN) is emitted: renderMenuItems (_D) is a cds-core publicName since
// wave 7; RepoNameChip (OE) and its child context (DE) are linked from session-rail-changes-v4, which holds them; c280f9bbb L
// is a declared linked copy (pure) whose context comes from files-changes-v4; dnd-kit from queued-bar-v4; the reading-order
// context from session-panels-v4; the public-suffix loader is the existing host answer (Ha above).
export const PENDING_ROOTS = {};
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+(?:-\d+)?|preload-helper|rolldown-runtime|c[0-9a-f]+)-[\w-]+\.js$/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CLOSURE_CHUNKS = ['cd0cf5b5e-DJvJrkr3.js', 'cead7e0c5-D7JCwl9-.js', 'cecbf1aa5-y2hXKjgC.js', 'ccdfebff6-DlYOkYbl.js',
  'cef1e6037-Dm5Rlsox.js', 'shared-3-IQTrO7Gx.js', 'shared-5-u8kha2eH.js', 'shared-18-Cfqwgjc5.js', 'shared-20-DUEo90UF.js', 'shared-33-DtdykY0y.js',
  'shared-38-DyF0_Fim.js', 'shared-39-ZCs0lAwB.js', 'shared-62-DoCqVpIq.js', 'shared-92-BOgyxePb.js', 'shared-123-1Hc1RTKl.js',
  // round4 relink-w8: the chunks SessionRail's closure enters (runSlicer --dry-run, round4/relink-w8/logs/probe-sr-3.json;
  // dnd-kit c09f6b4e5 is linked whole from queued-bar-v4, so it is not one of them).
  'c280f9bbb-BOcpax9X.js', 'c5304ebdb-BmR_E4_5.js', 'c8104f35e-D6niv4qy.js', 'caf3f05b8-BOg6Up7H.js',
  'cd8a7d7c0-DuH0T8rm.js', 'shared-153-DMw2VzSq.js', 'shared-36-fqRFYwOb.js'];
const emitted = (file, roots) => Object.fromEntries(Object.entries(roots).filter(([local]) => !PENDING_ROOTS[`${file}#${local}`]));
const modules = () => [
  ...Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).filter(([file, roots]) => Object.keys(roots).length || CLOSURE_CHUNKS.includes(file)).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source] || !Object.keys(emitted(source, ROOTS[source])).length).filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

const rawCallSites = [];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
// Same-chunk closure of a declaration (imports excluded): its raw text (closureFeatures are checked on it).
function sameChunkClosure(src, local) {
  const seen = new Set(), parts = [];
  const ids = text => new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []);
  const visit = name => {
    if (seen.has(name)) return;
    seen.add(name);
    const entry = src.top.get(name);
    if (!entry || entry.kind === 'import') return;
    const text = rawText(src, entry);
    parts.push(text);
    for (const id of ids(text)) if (id !== name && src.top.has(id)) visit(id);
  };
  visit(local);
  return parts.join('\n');
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
      found.push({ file, local, name: spec.name, previous: spec.old, export: alias, declarationSha256, pinned: pin !== undefined });
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
    if (spec.closureFeatures) assertFeatures(`adapter ${key} (closure)`, sameChunkClosure(src, local), spec.closureFeatures);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin === undefined && requirePins) throw Error(`adapter ${key}: no reviewed pin`);
    if (pin !== undefined && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: pin !== undefined });
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
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the session-rail-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function sessionRailV4Config() {
  return {
    name: 'session rail (4.16336.0)', generator: 'extract-session-rail-v4.mjs', output: path.join(root, SESSION_RAIL_V4_OUTPUT),
    adapterModule: '../../source-session-rail-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: [...LINKED_AREA_NAMES],
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/session-rail/prestage/tools/probe.mjs) explores the same configuration.
export async function probeConfig() { return { ...sessionRailV4Config(), linkedAreas: await linkedAreas() }; }

// Every pending root still waits: cds-core holds what it needs without publishing it.
async function assertPending() {
  const m = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(m.publicNames).map(v => `${v.file}#${v.local}`));
  const held = new Set(m.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`)));
  const out = [];
  for (const [key, p] of Object.entries(PENDING_ROOTS)) {
    for (const need of p.needs) {
      if (published.has(need) && !p.blockedBy?.length) throw Error(`${key} (${p.name}): cds-core now publishes ${need}; move the root back into ROOTS`);
      if (!held.has(need)) throw Error(`${key} (${p.name}): cds-core no longer holds ${need}; review the pending root`);
    }
    // wave 7: a root whose cds-core needs are published may still wait on a D1 owner of its closure (blockedBy)
    for (const b of p.blockedBy ?? []) {
      if (b.kind !== 'unexported-link') throw Error(`${key}: unknown blocker ${b.kind}`);
      const [file, local] = b.binding.split('#');
      const owner = JSON.parse(await fs.readFile(path.join(generatedRoot, b.area, 'manifest.json'), 'utf8'));
      const mod = owner.modules.find(x => x.target === b.target && path.basename(x.source) === file);
      const sliced = mod?.bindings?.some(x => (typeof x === 'string' ? x : x.name) === local);
      const exported = mod && (Object.keys(mod.exports ?? {}).includes(local) || (mod.linkExports ?? []).includes(local) || (mod.sharedExports ?? []).includes(local));
      if (!sliced) throw Error(`${key} (${p.name}): ${b.area}/${b.target} no longer slices ${b.binding}; review the pending root`);
      if (exported) throw Error(`${key} (${p.name}): ${b.area} now exports ${b.binding}; move the root back into ROOTS`);
    }
    out.push({ root: key, ...p, needsPublished: p.needs.filter(n => published.has(n)) });
  }
  return out;
}

export async function extractSessionRailV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const pendingRoots = await assertPending();
  const linked = {};
  for (const area of LINKED_AREA_NAMES) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...sessionRailV4Config(), linkedAreas: await linkedAreas(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the session-rail roots (${official.referenceVersion}); generated by extract-session-rail-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).filter(([, rs]) => Object.keys(rs).length)
            .map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-session-rail-v4.mjs',
          previous: { generator: 'scripts/extract-session-rail.mjs', output: 'src/generated/session-rail', referenceVersion: official.previousVersion },
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
  } else await extractSessionRailV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
