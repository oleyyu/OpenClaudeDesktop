// Transcript proposal group card, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 5, region
// proposal-group): the same semantic roots extract-proposal-group.mjs cuts from 3.6556.2 into src/generated/proposal-group,
// cut from the frozen 4.16336.0 snapshot into the isolated graph src/generated/proposal-group-v4. The 3.6556.2 output is
// untouched (staged double output; no production switch: src/source-proposal-host.jsx and the transcript keep reading
// src/generated/proposal-group).
//
//   c96d752d0-D9VB6ArX  VV  TurnProposalGroup      (3.6556.2 mQ; the feed's `turnSuggestions` row)
//                       HV  UnplacedProposalGroup  (3.6556.2 hQ; export xi; the feed's `unplacedSuggestions` row)
//                       sV  ProposalSpawnerContext (3.6556.2 IZ; export ji)   EYe useProposalSpawner (3.6556.2 BZe)
//                       DYe inlineSpawnerGate      (3.6556.2 VZe; export Mi)  oXe SentHereNotice (3.6556.2 hQe; export Si)
//                       lV / uV  proposalKey / isOfferProposal (3.6556.2 RZ / zZ)
//                       $Ue / aL / oL / rL / iL  proposingTools / isProposingTool / isPlacedProposal / proposalTaskId /
//                                proposalToolFailed (3.6556.2 XM / IM / LM / NM / PM)
//                       RN / wBe / TBe  the per-parent outcome store and its writes (3.6556.2 ZX / PXe / FXe)
//                       AN / kN / FN / jN / MN  the spawning set (3.6556.2 UX / HX / JX / WX / GX)
//   c227f4d5e-DGDdGBTz  XR keepSessionMode (3.6556.2 PQ)   ZR resolveStartPermissionMode (3.6556.2 FQ)
//   cf74bc599-BytvntCE  yw crossRepoCwdOf (3.6556.2 WS)  ew proposalHereText (3.6556.2 TS)  Ew proposalStartLabels
//                       (3.6556.2 XS; 4.16336.0 adds the `shown` labels and the bdi-wrapped host for RTL locales)
//   c8479260c-D5Ma9EoG  the session tool names / task-id patterns (byte-identical chunk to 3.6556.2: same locals)
//   cb27dab29-Cw2yQaFh  W isSpawnTaskTool  K isOwnStartSessionProposal (4.16336.0 also takes initiation "offer")
//                       Ze isCloudStartSessionHandOff (3.6556.2 Ye)
//   cf059c6df-B32mQ24C  p startModeNeedsConsent (3.6556.2 c227f4d5e cR; export r): moved to the permission-mode
//                       chunk; the 4.16336.0 spawner (cf74bc599 Dw) also tests the start mode inline. No 3.6556.2 root is
//                       removed upstream (REMOVED_ROOTS is empty; the check stays for the next bump).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames — CdsSwitch, CdsInfoTooltip, ownerWindow, useDirection,
//     asElementNode, the compiler helpers, the spawning store c96d752d0 EN / TN, …; cds-core module state without a
//     publicName stops generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2/plan.json proposal-group `linked`): approval-landing-v4, files-changes-v4,
//     routines-shared-v4, session-rail-kit-v4 — every binding one of them already holds and exports is imported from it,
//     never cut again (the account context shared-25 VB / Dz is routines-shared-v4's; 3.6556.2 adapted it as useAccount);
//     the three pure shared-frame bindings files-changes-v4 cuts without exporting are cut again here (linkedCopies);
//     code-start-v4's c5b9e310e.mjs (the plain-text helper k and the case-folding tables behind it) is linked, see
//     CODE_START_LINK;
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts, now at their
//     4.16336.0 chunks/locals. src/source-proposal-group-v4-adapters.jsx only re-exports the existing host adapters of
//     src/source-proposal-group-adapters.jsx; each original is pinned by features and by its raw declaration sha256
//     (ADAPTER_PINS). 3.6556.2's c856385e2 $t adapter (useSideSessionOpener) is no longer reached: 4.16336.0 reads the
//     split-view context through c856385e2 On (export st) over cds-core's En, sliced here as an original.
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
export const PROPOSAL_GROUP_V4_OUTPUT = 'src/generated/proposal-group-v4';
const ADAPTER_FILE = 'src/source-proposal-group-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as cowork-progress-v4 / composer-env-v4).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const FEED = 'c96d752d0-D9VB6ArX.js';
export const OPTIONS = 'c227f4d5e-DGDdGBTz.js';
export const PANE = 'cf74bc599-BytvntCE.js';
export const TOOLS = 'c8479260c-D5Ma9EoG.js';
export const CALLS = 'cb27dab29-Cw2yQaFh.js';
export const MODES = 'cf059c6df-B32mQ24C.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [FEED]: {
    VV: { name: 'TurnProposalGroup', export: null, probe: 'cardKey:`${n.id}:${t[0]?.id??""}`',
      features: ['{ tools: t, sessionRef: n } = e,', 'n.state === "unavailable" && n.tool !== void 0', '((i = { items: BV(e), failedCalls: t }), K1($, 0, r, i));',
        'cardKey: `${n.id}:${t[0]?.id ?? ""}`,', 'statusRegionRef: s,'] },
    HV: { name: 'UnplacedProposalGroup', export: 'xi', probe: ':unplaced:',
      features: ['{ tasks: t, sessionRef: n } = e,', 'r = TV(t, n.id),', 'cardKey: `${n.id}:unplaced:${t[0]?.id ?? ""}`,', 'statusRegionRef: a,'] },
    sV: { name: 'ProposalSpawnerContext', export: 'ji', probe: 'sV=k(null)', features: ['var sV = k(null);'] },
    EYe: { name: 'useProposalSpawner', export: null, probe: 'return j(sV)', features: ['return j(sV);'] },
    DYe: { name: 'inlineSpawnerGate', export: 'Mi', probe: 'popBackgroundTaskSuggestionById',
      features: ['e && t?.type === "local" && Et?.popBackgroundTaskSuggestionById !== void 0'] },
    oXe: { name: 'SentHereNotice', export: 'Si', probe: 'DV.stillSuggested',
      features: ['{ task: t } = e,', 'e.back ? DV.stillSuggested : DV.sentHere,', 'title: e.title ?? n.formatMessage(DV.untitled),', 'f(kV, { regionRef: r })'] },
    lV: { name: 'proposalKey', export: 'Oi', probe: 'return e.id??e.prompt', features: ['return e.id ?? e.prompt;'] },
    uV: { name: 'isOfferProposal', export: 'Di', probe: 'e.autoStart!=="cloud"', features: ['return e.offer === !0 && e.autoStart !== "cloud";'] },
    $Ue: { name: 'proposingTools', export: null, probe: 'firstProposingCallId:n',
      features: ['aL(e) && ((n ??= e.id), oL(e) && ((t ??= []), t.push(e)));', 'return n === void 0 ? QUe : { tools: t ?? fL, firstProposingCallId: n };'] },
    aL: { name: 'isProposingTool', export: null, probe: 'e.input.initiation==="own_initiative"',
      features: ['if (Km(e.name)) return !0;', 'let t = e.input.proposal_id;', 'e.name === Im &&', 'e.input.initiation === "own_initiative" &&'] },
    oL: { name: 'isPlacedProposal', export: null, probe: 'return aL(e)&&rL(e)!==void 0', features: ['return aL(e) && rL(e) !== void 0;'] },
    rL: { name: 'proposalTaskId', export: null, probe: 'Km(e.name)?Tfe(e.output)',
      features: ['if (!(e.status !== "completed" || e.isError))', 'return Km(e.name) ? Tfe(e.output) : Um(e) || Qm(e) ? Pm(e.output) : void 0;'] },
    iL: { name: 'proposalToolFailed', export: null, probe: 'e.rejected===!0',
      features: ['e.status === "error" ||', 'e.isError === !0 ||', 'e.rejected === !0 ||', 'e.interrupted === !0'] },
    RN: { name: 'proposalOutcomeStore', export: null, probe: 'RN=dl(', features: ['var RN = dl(() => ({ byParent: {} }));'] },
    wBe: { name: 'recordProposalOutcome', export: 'Ta', probe: 'n==="sent_here"?HN(',
      features: ['RN.setState((r) => {', 'n === "sent_here" ? HN(e, (e) => ({ ...e, [t]: n })) : UN(e, t));'] },
    TBe: { name: 'clearProposalOutcome', export: 'wa', probe: 'if(r?.[t]===void 0)return n',
      features: ['RN.setState((n) => {', 'if (r?.[t] === void 0) return n;', 'UN(e, t));'] },
    AN: { name: 'visibleProposalQueue', export: 'za', probe: 't.size===0?n:n.filter(',
      features: ['return t.size === 0 ? n : n.filter((e) => e.id === void 0 || !t.has(e.id));'] },
    kN: { name: 'spawningTaskIds', export: 'ka', probe: 'EN.getState().byParent[e]', features: ['let t = EN.getState().byParent[e];', 'return t && t.length > 0 ? new Set(t) : TN;'] },
    FN: { name: 'useSpawningTaskIds', export: 'Ra', probe: 'n=EN(qc(t))',
      features: ['(t) => (e ? (t.byParent[e] ?? wN) : wN)', 'n = EN(qc(t));', 'return J1($, 2, n) ? K1($, 2, n, n.length === 0 ? TN : new Set(n)) : $[3];'] },
    jN: { name: 'markProposalSpawning', export: 'Ma', probe: 'e.includes(t)?e:[...e,t]', features: ['DN(e, (e) => (e.includes(t) ? e : [...e, t]));'] },
    MN: { name: 'clearProposalSpawning', export: 'Fa', probe: 'backgroundTaskSuggestions:[...n.slice(0,r)',
      features: ['backgroundTaskSuggestions: [...n.slice(0, r), ...n.slice(r + 1), n[r]],', 'DN(e, (e) => (e.includes(t) ? e.filter((e) => e !== t) : e)));'] },
  },
  [OPTIONS]: {
    XR: { name: 'keepSessionMode', export: 'na', probe: 'if(!(t&&!YR.has(e??"")))return e', features: ['if (!(t && !YR.has(e ?? ""))) return e;'] },
    ZR: { name: 'resolveStartPermissionMode', export: 'da', probe: 'modeFollowsSession:t,cloudShown:n',
      features: ['function ZR({ overrides: e, modeFollowsSession: t, cloudShown: n }, r) {', 'let i = e?.permissionMode,', 'if (i === void 0 || !t) return i ?? r;'] },
  },
  [MODES]: {
    p: { name: 'startModeNeedsConsent', export: 'r', probe: 'return e==="bypassPermissions"||e==="auto"&&!0',
      features: ['return e === "bypassPermissions" || (e === "auto" && !0);'] },
  },
  [PANE]: {
    yw: { name: 'crossRepoCwdOf', export: null, probe: 'i!==""&&i!==r(t)&&i!==r(n??"")',
      features: ['i !== "" && i !== r(t) && i !== r(n ?? "")', '? e.replace(/[/\\\\]+$/, "")'] },
    ew: { name: 'proposalHereText', export: null, probe: 'e.formatMessage(QC.turn',
      features: ['return n(e.formatMessage(QC.turn, { title: n(r) }));', '$C(t.title) ||', '$C(t.tldr) ||'] },
    Ew: { name: 'proposalStartLabels', export: null, probe: 'fixHere:e.formatMessage(',
      features: ['defaultMessage: "Start with worktree",', 'id: "i/rNItpPCW",', 'defaultMessage: "Start locally",', 'id: "DQH39XCk9m",',
        'defaultMessage: "Send to cloud",', 'id: "VfdzzfbVPP",', 'defaultMessage: "Do it here",', 'id: "qNy7sbs812",', 'shown: {'] },
  },
  [TOOLS]: {
    e: { name: 'PROPOSAL_SESSION_SERVER', export: 't', probe: 'e="ccd_session"', features: ['e = "ccd_session"'] },
    r: { name: 'SPAWN_TASK_TOOL', export: 'l', probe: 'r=`mcp__${e}__${t}`', features: ['r = `mcp__${e}__${t}`'] },
    i: { name: 'DISMISS_TASK_TOOL', export: 'r', probe: 'i=`mcp__${e}__${n}`', features: ['i = `mcp__${e}__${n}`'] },
    s: { name: 'START_SESSION_TOOL', export: 'u', probe: 's=`mcp__${e}__${a}`', features: ['s = `mcp__${e}__${a}`'] },
    _: { name: 'TASK_ID_PATTERN', export: 's', probe: '_=/^task_[0-9a-f]{8}$/', features: ['_ = /^task_[0-9a-f]{8}$/'] },
    T: { name: 'taskIdFromResult', export: 'h', probe: 'e?.match(w)?.[1]', features: ['return e?.match(w)?.[1];'] },
    d: { name: 'lastTaskIdFromResult', export: 'm', probe: 'e.matchAll(u)', features: ['for (let n of e.matchAll(u)) t = n[1];'] },
    C: { name: 'taskIdLine', export: '_', probe: 'return`task_id: ${e}`', features: ['return `task_id: ${e}`;'] },
    S: { name: 'quotedTaskTitle', export: 'g', probe: '.replace(/task_id/gi,"task id")', features: ['.replace(/task_id/gi, "task id")', '.slice(0, 120);'] },
  },
  [CALLS]: {
    W: { name: 'isSpawnTaskTool', export: 'T', probe: 'return e===Je', features: ['return e === Je;'] },
    K: { name: 'isOwnStartSessionProposal', export: 'O', probe: 'e.input.initiation==="offer")&&',
      features: ['(e.input.initiation === "own_initiative" ||', 'e.input.initiation === "offer") &&', 'u(e.output) === void 0'] },
    Ze: { name: 'isCloudStartSessionHandOff', export: 'd', probe: 'e.input.target==="cloud"',
      features: ['e.input.target === "cloud" &&', 'ie(e.output) !== void 0 &&'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'cf059c6df-B32mQ24C.js#p': '5aab87797537d9d470f2a931392b583e640cfa99f63e643809ddb309ea310528',
  'c96d752d0-D9VB6ArX.js#VV': '1d457d56ff5c7de30841ef241c5ce52b8dc77b3357cc33a3ee5353409b5b5ed0',
  'c96d752d0-D9VB6ArX.js#HV': '1742c1c9480ee72efc61fb8ac76184b633f4cdf16d017ed6e63d6e4f7549ab75',
  'c96d752d0-D9VB6ArX.js#sV': '73b4ddd45d7b85b49d7d004853ab9a3040d690ec07e9f13c0a9faffcc6c359be',
  'c96d752d0-D9VB6ArX.js#EYe': '1db5ead07d2af1675eca4f760c9a1dca571b7064b1782df9ccaa073e653c8004',
  'c96d752d0-D9VB6ArX.js#DYe': 'b36f0ac2599f3f9105b5d3189a8024aa5c2a9b871d71e7feaa6f1d92b5674cc5',
  'c96d752d0-D9VB6ArX.js#oXe': 'fc567e12519675701af2ac45e0b072eda7f17029af88fae716a1590ce8fb6544',
  'c96d752d0-D9VB6ArX.js#lV': 'b1e85ad528433284eabca20d32b6d09548f6707649675cdf6e177ee971fc96a7',
  'c96d752d0-D9VB6ArX.js#uV': '87ca3a399700198e99310fae3d437a680ba2aba6a199190cb52facfd2c71aaf9',
  'c96d752d0-D9VB6ArX.js#$Ue': '57e37f796900890ce4473db40f7062c5f174a9c0ebc29c55984fa3dc2e1e4a77',
  'c96d752d0-D9VB6ArX.js#aL': '9072819c370811035788ba6bba86167791e6cf0d53813151ce3ca61d2bdbb2a3',
  'c96d752d0-D9VB6ArX.js#oL': 'ec99ac1298b7b721c0e648b641595b92dde1f9d734262affcf1b5985e27825dc',
  'c96d752d0-D9VB6ArX.js#rL': '6a3d3158d4bccd73656361730524ca703871e6e955dc2ab75e2963a15da3f41d',
  'c96d752d0-D9VB6ArX.js#iL': '267abc09a56c0ff6f9b12eb66a9733dceafc651d2fa5c5df3ab077fb572c10e5',
  'c96d752d0-D9VB6ArX.js#RN': '41ffe956e1c4fc2e644581d7f09b1b26665cfb4ff666cb0b6c9d7716966e4971',
  'c96d752d0-D9VB6ArX.js#wBe': '88b87f1e8f52499f8f9ab994138eb6a53ab22b3321d499587a96a50910c3f139',
  'c96d752d0-D9VB6ArX.js#TBe': '08d29fe56c5e0e9e3cedb11ac40a2105755efdfecbdcf2b48aee92f0b588a612',
  'c96d752d0-D9VB6ArX.js#AN': 'c2fced6d348f87633496ce8a906b95e71ac9580b38321622f321e3ba2fcb9a4e',
  'c96d752d0-D9VB6ArX.js#kN': '06c13555274c205b568f6c5186a2e8787793bd4afc2a7827ab87c3250c0d89a0',
  'c96d752d0-D9VB6ArX.js#FN': 'b8156b963371e268f39f0d4d7a64c5a99e859ba80de6185bba97af6b8699155d',
  'c96d752d0-D9VB6ArX.js#jN': '96e63ebb762da29c4cde9a6b94d579680071c2f238e672d178c787159739ac3f',
  'c96d752d0-D9VB6ArX.js#MN': 'c8e52580b66ede5ec09a2d5780205801ae2b5129c294bebdc5d8991047821f71',
  'c227f4d5e-DGDdGBTz.js#XR': '96936406903ae6d910c52b6765d03dbba29ed657bcc0447158804fa7ef546d46',
  'c227f4d5e-DGDdGBTz.js#ZR': '710ff544ea35b1d6bcb8a070c08850cad31cf06c2d9050fa741530743f7ef36d',
  'cf74bc599-BytvntCE.js#yw': 'ccd73b7442d2381988091b7c2b8178964b8dd30a51bba74bd84f859036071ce7',
  'cf74bc599-BytvntCE.js#ew': '8fb24ca25764725aa7f99db42c99271a0437837d3150326b1bbe5c3820d6d9ef',
  'cf74bc599-BytvntCE.js#Ew': 'd8eb9aa14c8305b13d0773501ebcb7929ae36a4accac73440d74c2c3462e5605',
  'c8479260c-D5Ma9EoG.js#e': '7b1e1a4dd034892db83539f22b61967756fc37af9468c0d70e6a76d851d4461f',
  'c8479260c-D5Ma9EoG.js#r': '896a7d7a638348c3f1da461f742c35ad37cacd295665ba1ecd6fdac7e95b8226',
  'c8479260c-D5Ma9EoG.js#i': 'c2f8bd4bd4073b392c4319148a9ae4f23d4779e65d78cc7fca9274bf3e49d945',
  'c8479260c-D5Ma9EoG.js#s': '75eb98825ebd93f45a306004bc24881968a546cc08d93b3e6e83557a9f9a8412',
  'c8479260c-D5Ma9EoG.js#_': 'eec32cc6abb70c6b8001b18aaa75dc8fe7928a81e0b4e9355fbf5cf597ce22a3',
  'c8479260c-D5Ma9EoG.js#T': 'e144c5645e2c52361d627262836892ce260d2dbfd1aafc95b0239a8a57114c5f',
  'c8479260c-D5Ma9EoG.js#d': '2c3e2de5eda1041e832bc4ff8708e79111d76a921fa5cee77ef4d34767eedc9d',
  'c8479260c-D5Ma9EoG.js#C': 'e6b9bf40a950686a314adcc08217271565a189794f13afb650c2a4ed2a3036c3',
  'c8479260c-D5Ma9EoG.js#S': '757f5270f4ffc69bb8e0e8aa5d95d01a3888efa9ea4efdf210e0914c95803973',
  'cb27dab29-Cw2yQaFh.js#W': '8ddff5847cf20a495bf268010d1659a76b2236ad3d9bdc6f24bee91831a9bbfa',
  'cb27dab29-Cw2yQaFh.js#K': 'ed6da8fea036c351ce6c6336937120155a436271df0a9af82fb47c9d26f67b7f',
  'cb27dab29-Cw2yQaFh.js#Ze': 'd0d4a3e97c917230adb0d6119da3dc8a347c133502d1417567a27528d8e8850d',
};
// 3.6556.2 roots with no 4.16336.0 counterpart: { name, previous, absentBody (regex over a declaration's raw text), why }.
export const REMOVED_ROOTS = [];

// ── Host boundaries: file#local -> { name (export of the adapter module), features, why } ───────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there; the
// 3.6556.2 original each replaced is named in the comment).
const PG = 'src/source-proposal-group-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl useIntl / FormattedMessage over the local catalog.
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: PG, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: PG, features: ['var Gt = a(Wt, Ut);'] },
  // The session store (3.6556.2 shared-8 og, persisted as "ccd-sessions-filter"; 4.16336.0 splits the persisted filter
  // off: bv) and its session patch (3.6556.2 mg). Host: ProposalHost.sessions; no stored queue order to patch.
  'shared-8-BqfCbkJd.js#bv': { name: 'useSessionsStore', from: PG, features: ['sessions: [],', 'isInitialized: !1,', 'initialLoadTimedOut: !1,', 'archivedRowsPending: !1,'] },
  'shared-8-BqfCbkJd.js#Ov': { name: 'updateSession', from: PG,
    features: ['let n = bv.getState().sessions.findIndex((t) => t.sessionId === e);', 'let r = { ...e.sessions[n], ...t };'] },
  // The sessions waiting on the user (3.6556.2 shared-11 V_). Host: ProposalHost.needsInput.
  'shared-39-ZCs0lAwB.js#gb': { name: 'useSessionsNeedingInput', from: PG, features: ['for (let e in t.requestsBySession) {', 'a.status === "pending" &&'] },
  // The ErrorsProvider (3.6556.2 shared-52 cB): "start-all-left-out" info. Host: source-toast.jsx.
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: PG, features: ['let e = k(qN);', 'Error("Must be called within ErrorsProvider"),'] },
  // The guarded localStorage the sent_here outcomes persist in (3.6556.2 shared-52 Qh). Host: window-lifetime storage.
  'shared-92-BOgyxePb.js#vx': { name: 'sentHereStorage', from: PG, features: ['var vx = _x(() => Qe("localStorage"), "local_storage", gx);'] },
  // appFeatures sideSessionProposalPicks / WorktreePick / OfferCloudStart (3.6556.2 shared-78 Pw / Fw / Iw).
  'shared-123-1Hc1RTKl.js#Y_': { name: 'useProposalPicks', from: PG, features: ['?.sideSessionProposalPicks?.status === "supported";'] },
  'shared-123-1Hc1RTKl.js#X_': { name: 'useProposalWorktreePick', from: PG, features: ['?.sideSessionProposalWorktreePick?.status === "supported";'] },
  'shared-123-1Hc1RTKl.js#Z_': { name: 'useOfferCloudStart', from: PG, features: ['?.sideSessionOfferCloudStart?.status === "supported";'] },
  // Open a session from the started task's row (3.6556.2 c26fb8b6b xn). Host: ProposalHost.openSession.
  'c26fb8b6b-DXUqD5LQ.js#K': { name: 'useOpenSession', from: PG,
    features: ['entryPoint: "cmd_click",', '"useOpenLinkedSession: the route built for a linked session does not parse as a session route",'] },
  // The epitaxy Markdown of the prompt preview popover (3.6556.2 c19e90103 Ux). Host: ProposalHost.renderMarkdown.
  'c19e90103-BKPMSRL2.js#qC': { name: 'TaskPromptMarkdown', from: PG, features: ['paceReveal: a,', 'hangingQuotes: h,', 'bareFences: g,'] },
  // The Options form's model / effort / mode sources (3.6556.2 shared-1 ER, shared-8 vK / Ov, c74045701 o, shared-7 Nw).
  // useModelCatalog is defined in the v4 adapter file itself: the 4.16336.0 catalog adds autoModeCompatible /
  // autoModeUnavailableNote (shared-212's factory), wrapped over the host catalog there.
  'shared-1-D1bGaTaN.js#R1': { name: 'useModelCatalog', from: ADAPTER_FILE, features: ['storedModel: d,', 'resolvedModel: f,', 'setStoredModel: u.setModel,'] },
  'shared-8-BqfCbkJd.js#Lq': { name: 'useAutoModeAvailability', from: PG, features: ['a = Lo().permission_modes.available,', '{ kind: "disabled", reason: "model", tooltip: e, ...t }'] },
  'shared-8-BqfCbkJd.js#Lb': { name: 'supportedEffortOptions', from: PG, features: ['let t = Mb.safeParse(e.id);', '(t.data === "xhigh" && !Ob())'] },
  'c74045701-CwBa3jUy.js#l': { name: 'effortMessages', from: PG, features: ['low: { defaultMessage: "Low", id: "477I0ggSYe" },',
    'medium: { defaultMessage: "Medium", id: "ovJ26CKo4Q" },', 'high: { defaultMessage: "High", id: "AxMhQrcUDC" },',
    'xhigh: { defaultMessage: "Extra high", id: "kDEj60CmLq" },', 'max: { defaultMessage: "Max", id: "kkjl2vQekD" },'] },
  'shared-7-D2e77H6v.js#sL': { name: 'ModelSelectorParts', from: PG, features: ['Root: tL,', 'Trigger: nL,', 'Popup: iL,', 'Effort: aL,'] },
  // The desktop config (3.6556.2 shared-52 qO / JO). Host: none narrowed.
  'shared-62-DoCqVpIq.js#jA': { name: 'useDesktopConfig', from: PG, features: ['return kA(DA(yt(), e), !Ze(), bA());'] },
  'shared-62-DoCqVpIq.js#MA': { name: 'getDesktopConfig', from: PG, features: ['return AA(DA(Ce(), e), !tt(), e ? eA() : void 0);'] },
  // A GrowthBook feature (3.6556.2 shared-25 fs). Host: the one host table, every other flag off (D29 / D31).
  'shared-25-D-aF0gt9.js#ko': { name: 'useGrowthBookFlag', from: PG, features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  // The Claude desktop client test (3.6556.2 shared-25 cc). Host: yes.
  'shared-0-CnnWnVrT.js#FH': { name: 'isDesktopClient', from: PG, features: ['wI(window.navigator.userAgent, { version: t, platform: n })'] },
  // Star a cloud environment (3.6556.2 shared-46 aS). No cloud environments.
  'shared-55-BRv2XBP7.js#uw': { name: 'toggleStarredEnvironment', from: PG, features: ['let { starredIds: n, toggleStarred: r } = ZC.getState();'] },
  // globalThis["claude.web"]?.LocalSessions (3.6556.2 shared-0 pC), which DYe asks for popBackgroundTaskSuggestionById.
  'shared-0-CnnWnVrT.js#qO': { name: 'desktopBridge', from: PG, features: ['var qO = globalThis["claude.web"]?.LocalSessions;'] },
  // The started session's chip, PR state, PR / environment chips, error copy (3.6556.2 cb8c5a88f or, shared-18 nj,
  // shared-20 eD / bD, shared-14 Ft). The host has none of these for a session row.
  'cb8c5a88f-Cxti0pWl.js#br': { name: 'useSessionChip', from: PG,
    features: ['r = t?.signals.working === !0 && t.signals.machine !== "disconnected",', 'explicitUnread: E,'] },
  'shared-18-Cfqwgjc5.js#JF': { name: 'useSessionPrState', from: PG, features: ['prState: m,', 'aggregated: p,'] },
  'shared-20-DUEo90UF.js#GM': { name: 'SessionPrChip', from: PG, features: ['i(lN, { pr: t, place: "word" })'] },
  'shared-20-DUEo90UF.js#pN': { name: 'SessionEnvChip', from: PG, features: ['children: i(uN, { env: e, named: !0 }),'] },
  'shared-60-DmOyT7JJ.js#On': { name: 'errorCopy', from: PG, features: ['startWithoutWorktreeHelps: P !== void 0,', 'r?.retryWouldSend === "heldMessage"'] },
  // The session's route href and its hover preload handlers (3.6556.2 shared-78 cD / shared-25 up). No routes here.
  'shared-123-1Hc1RTKl.js#YS': { name: 'useSessionHref', from: PG, features: ['`${e}/${encodeURIComponent(t)}`'] },
  'shared-25-D-aF0gt9.js#vf': { name: 'routePreloadProps', from: PG, features: ['if (e === null && t === void 0) return _f;'] },
  // Whether the CDS layer is in another window (3.6556.2 shared-frame co). No.
  'shared-frame-CJdE5Ria.js#ho': { name: 'useLayerInOtherWindow', from: PG, features: ['return e !== void 0 && e !== globalThis.window;'] },
  // start_session offers only (D29: off here): AppPreferences, the router, the settings page store (3.6556.2 shared-25
  // Wi / Jd, shared-156 Qm), the offer card's chords and their own-composer test (ccbc7e432 j, c2f6611a3 $t).
  'shared-25-D-aF0gt9.js#Bi': { name: 'appPreferences', from: PG, features: ['var Bi = globalThis["claude.settings"]?.AppPreferences;'] },
  'shared-25-D-aF0gt9.js#$u': { name: 'useAppRouter', from: PG, features: ['push: a,', 'replace: o,', 'back: s,', 'prefetch: ed,'] },
  'shared-183-B2N6Zy4J.js#yg': { name: 'settingsPageStore', from: PG, features: ['highlightLabel: void 0,', 'headerPendingSearch: "",'] },
  'ccbc7e432-DK6QVgWB.js#S': { name: 'useOfferChords', from: PG, features: ['enabled: C,', 'cardRootRef: w,', 'escapeOnly: T,', 'armKey: E,'] },
  'c2f6611a3-Dcq4MBgv.js#er': { name: 'isOwnComposer', from: PG, features: ['return !e || e.closest(".epitaxy-prompt") === null ? !1 : Qn(e) === Qn(t);'] },
  // Telemetry (D17: nothing is sent; 3.6556.2 c68c4283d Tf / wf / Ef, shared-1 DE).
  'c68c4283d-FxwfdZSA.js#rp': { name: 'logProposalStart', from: PG, features: ['"claudeai.code.side_session.proposal_card_started",'] },
  'c68c4283d-FxwfdZSA.js#np': { name: 'logProposalImpression', from: PG, features: ['"claudeai.code.side_session.proposal_card_shown",'] },
  'c68c4283d-FxwfdZSA.js#ip': { name: 'logProposalDismiss', from: PG, features: ['"claudeai.code.side_session.proposal_card_dismissed",'] },
  'shared-1-D1bGaTaN.js#CB': { name: 'useExposureOnce', from: PG, features: ['i.current || ((i.current = !0), t());'] },
  // Same-chunk declarations the host answers (3.6556.2 c96d752d0 iL, c227f4d5e R$): the proposing call's tool row
  // fallback and the CDS model selector of the Options form.
  'c96d752d0-D9VB6ArX.js#wz': { name: 'ProposalToolFallback', from: PG, features: ['(e) => e.epitaxyEngineToolRow,'] },
  'c227f4d5e-DGDdGBTz.js#rB': { name: 'ProposalModelSelector', from: PG, features: ['"data-testid": "epitaxy-cds-model-selector",', 'triggerVariant: "pill",'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-8-BqfCbkJd.js#bv': 'b0e8d90c58b158430a7faac4998bb97f5cd43b26388c9e07c07cd9dbd08c8bab',
  'shared-8-BqfCbkJd.js#Ov': '64035bedebd36da4ffc7ce73ac14ae2c8648109f919bed34439a70cb3fb03811',
  'shared-39-ZCs0lAwB.js#gb': '953b48c55861f323375baf7f5840912ef5526a42464b03bd31750ddc6f5f169a',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-92-BOgyxePb.js#vx': 'a1caed520ea58e2b2c31b08e046ff30021c643511b919593db1afe3638ea9c15',
  'shared-123-1Hc1RTKl.js#Y_': '2c6788b1b6ac9c2f134912a2bbb71303305d412cc72b0c9b1c1f4e27f5eec661',
  'shared-123-1Hc1RTKl.js#X_': 'cf3f0d542518591817d8e876721530dee787ddc904b4a43c70657caf0afbeb21',
  'shared-123-1Hc1RTKl.js#Z_': '148377a3fd7639b3aa1105ea17fbb3c2077a66e536e281c39fee1a21925c2689',
  'c26fb8b6b-DXUqD5LQ.js#K': 'b3788537c791d0880034fa659fd972ca25c313737e8ac42fb1baf9e1a7a53f10',
  'c19e90103-BKPMSRL2.js#qC': '7e7c3280b8bac1a6fda4999c44fa0ea1aaa62e5f282ba4a8fd4d7221ec74b552',
  'shared-1-D1bGaTaN.js#R1': '3386870a27147484407c35b9859277d134f1bbfde975bb9f1f40fa70bfff3173',
  'shared-8-BqfCbkJd.js#Lq': '474b6f69df2f4316b0a7adc07a26f3f4ac03dcea5ca50654cdc9d70fcb0643f7',
  'shared-8-BqfCbkJd.js#Lb': '4cb179c16b18bfe63619909b642fa572e8ee5762161f77a4d5ddc357dd94905a',
  'c74045701-CwBa3jUy.js#l': '44f47e21e1b2e7d8f2f294b5cf4db6adde2cb87100a91c321d1c478852670aaf',
  'shared-7-D2e77H6v.js#sL': '008b5e3e918661c3305d6a4c06bf18280bc63b2a646d756b6cf3f757500d7316',
  'shared-62-DoCqVpIq.js#jA': '61ec5c4f5b177efb60c6d47be96d83d27ad7965a091f700eb32ad53a5333350f',
  'shared-62-DoCqVpIq.js#MA': '0121a511d3474d6b0bcb8cddac99573205084fb237317cd2cba915fd725f52bf',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'shared-0-CnnWnVrT.js#FH': '48c5ac390eae53e7b9a93536657c342305c74ce97cafa85a7f0f17dd88cbec31',
  'shared-55-BRv2XBP7.js#uw': '5885d2641c1dcf25914dbaaee658ece0da289564aecb167b9364701205a6013d',
  'shared-0-CnnWnVrT.js#qO': '24415039aa52abfabec181ea0f35aadf437d9d41f2997f3869545a972e7afc92',
  'cb8c5a88f-Cxti0pWl.js#br': '7e3be3a90bf51ca01cba75f1a4b22b299d8d4482dbb20d8efcb53cd44565ac6a',
  'shared-18-Cfqwgjc5.js#JF': '88e8869dbe1a94c0b0d4ff2e6da4687d9100a73cb02913c09a77800fcccc8bd1',
  'shared-20-DUEo90UF.js#GM': '45edbd04171e84bc2eb17c72768bf7695d997878f65890e11daa387f1401f661',
  'shared-20-DUEo90UF.js#pN': 'e38734ec38f325efdd2d2c031c79f5fb6c2f2993fadb4eebe91886b57a345e01',
  'shared-60-DmOyT7JJ.js#On': 'e81ba51c5f818b3d5a391864ba2b97b83608772300d6429b7a2d63f01d0cf928',
  'shared-123-1Hc1RTKl.js#YS': '85b70120aab4a119562f96c9e876777c8ea692b41092d83af47e5bf63e9356d5',
  'shared-25-D-aF0gt9.js#vf': '54c24822acfa3683c8d3b332fbc4fe27cbe304ea7990cfbffaf8de7c0d6cca92',
  'shared-frame-CJdE5Ria.js#ho': '2751ee43626bc51fd3224748275c9f9ad4cd888c1085e5b4153ca6ab6933e3f7',
  'shared-25-D-aF0gt9.js#Bi': '3383b48d9b1bd92c0a2024ed43dd902c7e05ec87d743f8d1e84ddeda0dfdb9f5',
  'shared-25-D-aF0gt9.js#$u': 'bca1b5a89e27f3817348b46b7fa0b6a3c14e1c60511c35cab275c6c0bfd2d2f7',
  'shared-183-B2N6Zy4J.js#yg': '349bfa0d940614af0481bd2f1f162af59f52cd8020f1e09aeb2e148a9348127c',
  'ccbc7e432-DK6QVgWB.js#S': '9c1a8973a4377627103a34905675b5fd69c2097bbee0a3337360df5b28807d62',
  'c2f6611a3-Dcq4MBgv.js#er': 'f0b238ad0bf0a4916a8945f63c603cc98737f4a2cb06c0aec179df53d28a077e',
  'c68c4283d-FxwfdZSA.js#rp': '203f29874182a352b08a727567278162d0b5342afb78db99442232c0284306fe',
  'c68c4283d-FxwfdZSA.js#np': '1c7ea3c5797a97b7f1b2493834374288ce648bc3ee3552207d89f5aa5dec2c19',
  'c68c4283d-FxwfdZSA.js#ip': '6e7def9cce0e1a16b3a7f3abfba767f95cf6583f6e948b9c2442a35f9570f816',
  'shared-1-D1bGaTaN.js#CB': '29f0dc11b05937a903bd09080eeb711674c1174d3b06f01bd4b1f05c4e2be163',
  'c96d752d0-D9VB6ArX.js#wz': 'c57474ba68135f823e7b55429873f6b92e0815f9ccf38a5c75c219d0c9d4ad91',
  'c227f4d5e-DGDdGBTz.js#rB': '6a60d9e6396ef7b000863e723620afa08378a26a28f013d1093c5489e3ada07f',
};
if (!process.argv.includes('--locate')) for (const key of Object.keys(HOST_ADAPTERS)) if (!Object.hasOwn(ADAPTER_PINS, key)) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings files-changes-v4 (cds-parts.mjs) cuts without exporting; cut again here, each hashing as the official
// declaration (no module state).
const linkedCopies = {
  'shared-frame-CJdE5Ria.js#Hm': 'strip the bidi/format marks of a label (string replace over the Bm pattern), pure',
  'shared-frame-CJdE5Ria.js#Vm': 'the "$1" replacement string Hm uses, a constant',
  'shared-frame-CJdE5Ria.js#Km': 'a label safe to render as LTR (Hm, then RTL/surrogate tests), pure',
};

// code-start-v4 slices the suggested-task plain-text helpers (c5b9e310e k over ca0294fab's lazily built case-folding
// tables, module state: d1-gate state-writer / reassigned on ca0294fab A / M / j / k) for H8 / U8 / W8; this graph reads
// the same k (c96d752d0 Rx, cf74bc599 Qg, the proposal title / "Do this task here" text), so it links that one module
// (code-start-v4 c5b9e310e.mjs linkExports ['k']) instead of cutting a second copy of the tables (D1).
const CODE_START_LINK = { area: 'code-start-v4', modules: ['c5b9e310e.mjs'] };
// Wave 8 (cds-integrate/wave8 W8-RT, round3 integrate-gates notFixed r3b-tasks-subtask:98): the r3b-tasks bindings this
// closure reaches (shared-92 mk, shared-212 j_ / M_ / yv / Cv / Dv / kv) are linked from r3b-tasks, their one 4.16336.0
// owner (D1 survey: converge on r3b-tasks; r3b-tasks exports them, roots under their semantic names, the rest as linkExports),
// never cut again here.
const LINKED_AREAS = ['approval-landing-v4', 'files-changes-v4', 'routines-shared-v4', 'session-rail-kit-v4', CODE_START_LINK, 'r3b-tasks'];
const linkedAreaName = a => (typeof a === 'string' ? a : a.area);
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  ...[
    'c1014d784-DGf2d-nB.js', 'c25d7186f-CHE_J2eY.js', 'c261da744-AaziztkA.js', 'c2b4a8f0b-CVPYkfnV.js', 'c30607cef-DbSe2rPb.js', 'c3141db16-DRvTQYlo.js',
    'c425fb3cf-Gc8R9PSy.js', 'c5da7eb42-aEqbSKbC.js', 'c63c52947-BNlftA6t.js', 'c856385e2-Cqx37C-b.js', 'cce2a382f-Du_ygTZq.js', 'cd4fb5ac7-DCVeUpE6.js', 'ce2d07062-BL1UmkhK.js', 'cf0aa9840-CDDFNxgg.js',
    'shared-0-CnnWnVrT.js', 'shared-123-1Hc1RTKl.js', 'shared-18-Cfqwgjc5.js', 'shared-183-B2N6Zy4J.js', 'shared-20-DUEo90UF.js',
    'shared-212-BHMAi0oa.js', 'shared-25-D-aF0gt9.js', 'shared-26-B-POtn5S.js', 'shared-3-IQTrO7Gx.js', 'shared-33-DtdykY0y.js', 'shared-39-ZCs0lAwB.js',
    'shared-5-u8kha2eH.js', 'shared-55-BRv2XBP7.js', 'shared-62-DoCqVpIq.js', 'shared-7-D2e77H6v.js', 'shared-8-BqfCbkJd.js', 'shared-92-BOgyxePb.js',
    official.sharedFrame,
  ].map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): where the feed puts the two rows and how the session pane mounts them.
const rawCallSites = [
  { source: FEED, role: 'Feed rows: a turn\'s proposing calls become one turnSuggestions row (none when the only call was sent here); the queue leftovers one unplacedSuggestions row; with turnSuggestions on the proposing calls leave their tool rows',
    features: ['let i=$Ue(n.items);le??=i.firstProposingCallId,ce.push(...i.tools)', 't.sentHereSuggestionIds?.includes(rL(ce[0])??"")!==!0)&&s.push({kind:"turnSuggestions",id:`turnSuggestions:${le}`,tools:ce})',
      'k!==void 0&&k.length>0&&s.push({kind:"unplacedSuggestions",id:`unplacedSuggestions:${k[0].id}`,tasks:k})',
      'case"tools":return!(a.turnSuggestions===!0&&pL(e,a.hideThinkingItems!==!0))', 'if(t.hostDrawsTurnSuggestions===!0&&oL(e))return!0',
      'p?f(VV,{tools:m,sessionRef:n}):f(YBe,{tool:t,sessionRef:n})', 'pe.length===0?null:f(VV,{tools:pe,sessionRef:s})',
      'HV as xi', 'sV as ji', 'DYe as Mi', 'oXe as Si', 'aV as Ai'] },
  { source: PANE, role: 'Session pane: ui = DYe(presets, session) (Ks); NT provides the pane context (Ai), the spawner context (ji) and SentHereNotice (Si) and mounts MT (the spawner Dw with inlineCards on); the floating suggested-task card eT only when !ui; HV (Bl) for the unplaced tasks',
    features: ['ui=J2($,179,Ur,n)?K2($,179,Ur,n,Ks(Ur,n)):$[181]', 'c(NT,{active:ui,host:Mo,sessionRef:n,children:', 'Mi&&n&&fi&&!ui&&o(eT,{sessionRef:n,scrollRef:i,captureGuardedSnapToBottom:x},`chip-${t}`)',
      'n&&Co.length>0?o(Bl,{sessionRef:n,tasks:Co}):null', 'c(Qc.Provider,{value:u,children:[i,f,p]})', 'o(ls.Provider,{value:n,children:m})', 'o(oc,{task:d})',
      'inlineCards:!0', 'Ai as ls', 'Mi as Ks', 'Si as oc', 'ji as Qc', 'xi as Bl'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
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
      if (pin === undefined && !process.argv.includes('--locate')) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: !!pin });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== declarationSha256 && !(pin === undefined && process.argv.includes('--locate')))
      throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin === declarationSha256 });
  }
  return out;
}

// The removed roots stay removed: no top-level declaration of any 4.16336.0 renderer chunk has the old body.
async function assertRemoved(cache) {
  const names = (await fs.readdir(official.ionSource)).filter(n => n.endsWith('.js'));
  const out = [];
  for (const removed of REMOVED_ROOTS) {
    for (const name of names) {
      const src = await readSource(name, cache, official.ionSource);
      for (const entry of declarations(src)) if (removed.absentBody.test(rawText(src, entry))) throw Error(`${removed.name}: ${name} declares it again; the root is no longer removed upstream`);
    }
    out.push({ name: removed.name, previous: removed.previous, absentBody: String(removed.absentBody), why: removed.why, checkedChunks: names.length });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  // Adapters this file defines itself (an official interface that grew in 4.16336.0).
  for (const m of text.matchAll(/^export (?:const|function|async function) ([\w$]+)\b/gm)) exported.set(m[1], ADAPTER_FILE);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name.replace('$', '\\$')}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the proposal-group-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function proposalGroupV4Config() {
  return {
    name: 'proposal group (4.16336.0)', generator: 'extract-proposal-group-v4.mjs', output: path.join(root, PROPOSAL_GROUP_V4_OUTPUT),
    adapterModule: '../../source-proposal-group-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/proposal-group/prestage/tools/probe.mjs) explores the same configuration.
export const probeConfig = proposalGroupV4Config;

// Every host adapter must still be reached (an adapter the closure no longer enters is dropped, not kept).
function assertAdaptersReached(m) {
  const used = new Set(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  const unused = Object.values(HOST_ADAPTERS).map(a => a.name).filter(n => !used.has(n));
  if (unused.length) throw Error(`host adapters no longer reached (drop them): ${unused.join(', ')}`);
}

export async function extractProposalGroupV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const removedRoots = await assertRemoved(cache);
  const linked = {};
  for (const a of LINKED_AREAS) {
    const area = linkedAreaName(a);
    linked[area] = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'))), ...(typeof a === 'string' ? {} : { modules: a.modules }) };
  }
  const cfg = {
    ...proposalGroupV4Config(),
    async artifacts(m) {
      assertAdaptersReached(m);
      return {
        'index.mjs': `// Semantic names for the proposal group roots (${official.referenceVersion}); generated by extract-proposal-group-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-proposal-group-v4.mjs',
          previous: { generator: 'scripts/extract-proposal-group.mjs', output: 'src/generated/proposal-group', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, removedRoots, adapters, linkedCopies,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractProposalGroupV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
