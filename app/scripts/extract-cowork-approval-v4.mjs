// Cowork tool approval card, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round2 unit cowork-approval):
// the same two semantic roots extract-cowork-approval.mjs cuts from 3.6556.2 into src/generated/cowork-approval, cut from
// the frozen 4.16336.0 snapshot into the isolated graph src/generated/cowork-approval-v4. The 3.6556.2 generator, its
// output, its adapters and its tests are untouched (staged double output; no production switch:
// src/source-cowork-approval.jsx keeps reading src/generated/cowork-approval until productionSwitchNotBeforeBatch 10).
//
// 4.16336.0 moved the roots (3.6556.2 chunk#local -> 4.16336.0 chunk#local, same export alias):
//   c96142a4d-BISHCy1R#Je -> c96142a4d-DqOQjECe#gt  ToolApprovalCard (export i). React Compiler slots 198 -> 193; new
//                                                  props consentBody / consentInputs / requestSummary / sentence /
//                                                  connectorId / toolDetails / toolUseId …, the Gmail file-ask rows
//                                                  (lazy c237667f6), the MCP tool details pane (cfbacea79 k).
//   c14f706e5-BnmRTX8N#wt -> c14f706e5-Bqtc_XFV#Zt  ToolApprovalActions (export t). Same rungs ("Allow for this task",
//                                                  "Allow for all scheduled runs", "Allow once", "Deny", "More allow
//                                                  options"); slots 272 -> see ROOTS features.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (pinned manifest sha256, wave 6);
//   - linkedAreas (D1): every binding a linked 4.16336.0 graph already holds and exports is imported from it;
//   - host boundaries as localAdapters (file#local): the 4.16336.0 locals of the services the 3.6556.2 graph adapts
//     (telemetry, the notify opt-in, the chat composer, the MCP app view resource, the connector lookup, the claude.ai
//     file opener, the approval place check chunk), plus the account / GrowthBook / analytics / intl hooks the sibling
//     Cowork -v4 graphs adapt for the same bindings. src/source-cowork-approval-v4-adapters.jsx re-exports existing host
//     adapters where the 4.16336.0 contract is unchanged and defines the answers whose official shape changed. Each
//     original is pinned by features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local and export alias, with its raw
// declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COWORK_APPROVAL_V4_OUTPUT = 'src/generated/cowork-approval-v4';
const ADAPTER_FILE = 'src/source-cowork-approval-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const CARD = 'c96142a4d-DqOQjECe.js';
export const ACTIONS = 'c14f706e5-Bqtc_XFV.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias), probe (raw), features (prettier form) } ───────────
export const ROOTS = {
  [CARD]: {
    gt: { name: 'ToolApprovalCard', export: 'i', probe: 'consentInputsScrollThemselves:',
      features: ['let $ = J9(193),', 'approvalData: g,', 'defaultMessage: "Claude wants to use {toolName}",', 'id: "ZNLjFNb5bD",',
        'defaultMessage: "Claude wants to use {toolName} from {integrationName}",', 'if (g.promptSuppressed) return null;'] },
  },
  [ACTIONS]: {
    Zt: { name: 'ToolApprovalActions', export: 't', probe: 'onAllowForAllScheduledRuns:',
      features: ['submitToolApproval:', 'onAllowForThisTask:', 'onAllowForAllScheduledRuns:',
        'defaultMessage: "Allow for this task",', 'defaultMessage: "More allow options",'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  [`${CARD}#gt`]: '6c1d887cde11f5d60b56ea32ecc8116148aee62386b6a309d4aa5d42a0173083',
  [`${ACTIONS}#Zt`]: '4e15dd4819a23d86ca482efea49716561a7b816750c718d91c32ddc60ac5e115',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ─────────────────────────
const RS = 'src/source-routines-shared-adapters.jsx', RC = 'src/source-routine-cowork-adapters.jsx', V3 = 'src/source-cowork-progress-v3-adapters.jsx';
const OLD = 'src/source-cowork-approval-adapters.jsx', HERE = ADAPTER_FILE, CT = 'src/source-code-transcript-adapters.jsx';
export const HOST_ADAPTERS = {
  // Intl / GrowthBook / account / analytics (routines-shared-v4, cowork-progress-v4 and cowork-scheduled-v4 adapt the
  // same bindings with the same host adapters).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  'shared-25-D-aF0gt9.js#ko': { name: 'useFeatureIsOn', from: RS, features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  // A second GrowthBook flag read (`Ho(e).on`): c9d6d9802 t, the MCP app frame-domain gate. GrowthBook is off (D29 / D31).
  'shared-25-D-aF0gt9.js#Vo': { name: 'useFeatureIsOn', from: RS, features: ['return Ho(e).on;'] },
  'shared-62-DoCqVpIq.js#OT': { name: 'useAnalytics', from: RS, features: ['return ZS;'] },
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: RS, features: ['let e = k(qN);', 'Error("Must be called within ErrorsProvider"),'] },
  'shared-0-CnnWnVrT.js#H': { name: 'trackEvent', from: RC, features: ['var H = P(Zw, N.O11Y_INTERNALS);'] },
  'shared-0-CnnWnVrT.js#qB': { name: 'reportError', from: RC, features: ['var qB = P(JB, N.O11Y_INTERNALS);'] },
  // 3.6556.2 shared-156 iw: the connector lookup over the claude.ai MCP store (cowork-progress-v4 adapts the same GT).
  'shared-183-B2N6Zy4J.js#GT': { name: 'useConnectorLookup', from: RC, features: ['return X(WT);'] },
  'shared-36-fqRFYwOb.js#Db': { name: 'ConnectorServerIcon', from: RC, features: ['"connector-icon-globe-fallback"'] },
  // 3.6556.2 shared-6 lb: opening a claude.ai file a tool request carries (cowork-progress-v4 adapts the same Sf).
  'shared-6-2QYRw_Wv.js#Sf': { name: 'useDownloadOutput', from: V3, features: ['bf(e, i, "files_api"),', 's = a.replace("computer://", "");'] },
  // 3.6556.2 cc2d75ce6 l: the composer the card's keys share (same contract: getComposerDom / isOwnComposer /
  // hasComposerPopup / hasComposerDraft / isDictationLive / dictationOwnsEscape).
  'cc2d75ce6-7rduZGF6.js#u': { name: 'useToolApprovalComposer', from: OLD, features: ['{ promptInputRef: e, hasAttachments: n, queuedMessages: r } = t(),',
    '{ isDictationLive: l, dictationOwnsEscape: u } = a(),', 'hasComposerDraft: f,'] },
  // 3.6556.2 c14f706e5 mt: the "Get notified when you're needed" opt-in. 4.16336.0 Vt returns null on the desktop client
  // (`s = x()`, shared-0 FH isDesktopApp: `if (s || !c || u || !d) return null`), as the 3.6556.2 local Cowork card.
  [`${ACTIONS}#Vt`]: { name: 'ToolApprovalNotifyOptIn', from: OLD, features: ['{ telemetry: n, coworkHost: i, placement: a, stacked: o } = e,',
    's = x(),', 'if (s || !c || u || !d) return null;', 'let f = d.surface === "external" ? Ut : Ht;'] },
  // 3.6556.2 shared-10 rS: the lazily loaded approval place check (cd69aaa10 createPlaceCheck). Its consumers read
  // `kw.pending` / `kw.lastOutcome` as before; this host never loads it.
  'shared-26-B-POtn5S.js#kw': { name: 'approvalPlaceCheckChunk', from: OLD, features: ['id: "approval_place_check",', 'import("./cd69aaa10-Bskx99dL.js")',
    '((Dw = t.createPlaceCheck), (Mw = !1), (Nw = void 0));'] },
  // W7-D5 (cds-wave7/survey/round3-decisions.json, W7-D1 write integrity): shared-26 Fw / Hw and shared-62 Ha assign
  // cds-core module state this graph imports read-only (Fw: Nw; Hw: Mw; Ha: Pa, and through Va also Na / Ma / za), so their
  // original bodies would throw TypeError when they run. cds-core cannot take them in wave 7 (Fw / Hw reach kw, whose
  // cd69aaa10 chunk imports four shared chunks and is not a verbatim lazy chunk; Ha is already a host boundary of
  // cowork-live-v4 and mcp-app-card-v4), so they are host boundaries here, answered with the outcome the originals have
  // under this graph's other host answers: kw is approvalPlaceCheckChunk (never loaded: `pending` false, no outcome,
  // warm() does nothing), so Fw only stamps Nw (read by Hw behind `kw.pending`) and calls warm("open"); Hw neither sets Mw
  // (no "failed" / "declined" outcome) nor reaches its listener loop. Ha is the same loadPublicSuffixList cowork-live-v4
  // answers it with (the public-suffix chunk is not served: no favicon URL, Ja returns undefined); Va and the verbatim
  // cd668e25e chunk are no longer reached.
  'shared-26-B-POtn5S.js#Fw': { name: 'warmApprovalPlaceCheck', from: HERE, features: ['(kw.pending || (Nw = performance.now()), kw.warm("open"));'] },
  'shared-26-B-POtn5S.js#Hw': { name: 'settleApprovalPlaceCheck', from: HERE, features: ['((e === "failed" || e === "declined") && (Mw = !0), Fw());',
    'let t = kw.pending && Nw !== void 0 && performance.now() - Nw >= Pw;', 'if (Mw || t) for (let e of Iw) e();'] },
  'shared-62-DoCqVpIq.js#Ha': { name: 'loadPublicSuffixList', from: CT, features: ['return typeof window > "u" ? Promise.resolve() : ((Pa ??= Va()), Pa);'] },
  // 3.6556.2 shared-1 fR: the tool's MCP app view resource. 4.16336.0 cb3e475a7 H answers its constant `ie` (now with
  // readFailed) unless the claudeai_mcp_tool_details gate is on (`p = c && !!o && !!a && !u`, c = N() = useFeatureIsOn(M)).
  'cb3e475a7-DVRcQh8O.js#H': { name: 'useToolAppResource', from: HERE, features: ['{ serverUuid: a, resourceUri: o, tool: s } = h(v(i)),', 'p = c && !!o && !!a && !u,',
    'readFailed: W,', ': ie,'] },
  // shared-153 ZU / $U: whether the conversation restricts an action, and why (`D(LU)`, LU = createContext(kU), kU an
  // empty Set). Zt asks for "respondToElicitation". No host renders LU's provider, so both read the default: nothing
  // restricted (ZU false; $U = tW(undefined), undefined). LU is module state frame-sidebar-nav slices without exporting
  // it (D1: not cut again here); round2 cds-core-requests.json asks for it as a publicName so the readers can be cut.
  'shared-153-DMw2VzSq.js#ZU': { name: 'useConversationRestricts', from: HERE, features: ['t = D(LU);', 'QU(t, e)', ') !== void 0;'] },
  'shared-153-DMw2VzSq.js#$U': { name: 'useConversationRestrictionReason', from: HERE, features: ['t = D(LU);', 'return tW('] },
  // The Gmail file-ask rows (lazy c237667f6), shown only for a remote Gmail connector tool (`it`: server.type "remote"
  // and a gmail url); no remote connector exists here (useConnectorLookup is empty), so P stays undefined.
  [`${CARD}#at`]: { name: 'GmailFileAskRows', from: HERE, features: ['id: "unnamed_gmail_file_ask_rows",', 'pick: (e) => e.GmailFileAskRows,'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original (the ones sibling graphs also adapt carry the same pin).
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'shared-25-D-aF0gt9.js#Vo': 'c93fc13ae9ab4c65c395e8ab7df041fe5572bc6e2005f75fd584c2d35f69fded',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-0-CnnWnVrT.js#H': 'e13bfb51ca0c80f098c73bedd739282ad7ea49e70db956178d06103fc7ca872b',
  'shared-0-CnnWnVrT.js#qB': '9786ddc2b863b95c734f9b0cf48201ae2302e49d990a43e9c6ffba102914843f',
  'shared-183-B2N6Zy4J.js#GT': '60aac22a6b69a7f2ba3f06ce5889debcdd70f931cb83eb4fd43b39b6ba952e4e',
  'shared-36-fqRFYwOb.js#Db': '9c394533d20e4a6fbbe28762552bb5868d66398c282cbea4f004122870745482',
  'shared-6-2QYRw_Wv.js#Sf': 'bdf3c0f65f134b4306627f70d3e4a68fc399570596e4fc37e7bb892c8ab557f4',
  'cc2d75ce6-7rduZGF6.js#u': 'b6b47f4a68eb2027ea85b7aaafbfd929cb9c5ab6e57ed002f7831831709d6dd3',
  [`${ACTIONS}#Vt`]: 'eb66da74ddc849bb9996401a330517e9be7ad4e544ecd74ceffe0646d00b4d65',
  'shared-26-B-POtn5S.js#kw': '19eda88b184c28f279bfa6278776acd3b7e7e39201ca0062f94cae3298750ccd',
  'shared-26-B-POtn5S.js#Fw': 'dcee8ba1939bae05829bae46c76b0c97352205135de036b9f65ebd9f59b1c6e6',
  'shared-26-B-POtn5S.js#Hw': 'fd12cc9168befa2275ee87f9b192bc93c7993a4d68b59484a44d2ad007fc91ad',
  'shared-62-DoCqVpIq.js#Ha': 'acb67cbb0d761657c236cc3960f84cf8f5e20d8576fbbd9786b8ad98f1e3f00e',
  'cb3e475a7-DVRcQh8O.js#H': '01a9597bc68692258eb009bf08fc559f0c7b1401dbe20fa836499eeba16f496c',
  'shared-153-DMw2VzSq.js#ZU': '2c70227a9cb2a8e7cdbd5c2e9735d19b0b319bf76f920b2a1bbae610a812b6f0',
  'shared-153-DMw2VzSq.js#$U': '16b145ac6475e135494bf5b4208c88cf29e9433124af531f4e8f1a6d3f9ba84c',
  [`${CARD}#at`]: '269b4ab0ccac7fd55ed037139ccf82ef32fdcadfbfd86127722eab8fe0d5896e',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings a linked area slices without exporting, cut again here (d1-lib classifies none of them as module state).
const linkedCopies = {
  // frame-sidebar-nav shared-1.mjs / shared-183.mjs: the MCP URL-key check fU reads and the URL host parser of the
  // connector lookups (functions and constant regexes / numbers no declaration writes).
  'shared-1-D1bGaTaN.js#cU': 'whether a remote connector tool name is URL-keyed (mcp__<segment>__<tool>), pure',
  'shared-183-B2N6Zy4J.js#Hb': 'http(s) URL -> host, pure', 'shared-183-B2N6Zy4J.js#Bb': 'trim ASCII control / space, pure',
  'shared-183-B2N6Zy4J.js#Tb': 'constant regex /[\\t\\r\\n]/g (lastIndex only within replace)', 'shared-183-B2N6Zy4J.js#Eb': 'constant regex /[/?#]/',
  'shared-183-B2N6Zy4J.js#Vb': 'host[:port] / [ipv6] split, pure', 'shared-183-B2N6Zy4J.js#zb': 'IPv6 literal test, pure',
  'shared-183-B2N6Zy4J.js#Rb': 'IPv6 group count, pure', 'shared-183-B2N6Zy4J.js#Pb': 'constant IPv4 regex', 'shared-183-B2N6Zy4J.js#Nb': 'constant hex group regex',
  'shared-183-B2N6Zy4J.js#Ob': 'constant digits regex', 'shared-183-B2N6Zy4J.js#Db': 'constant host characters regex',
  'shared-183-B2N6Zy4J.js#qU': 'focus hops predicate, pure', 'shared-183-B2N6Zy4J.js#GU': 'active element hops through shadow roots, pure DOM read',
  'shared-183-B2N6Zy4J.js#UU': 'constant hop limit 32',
  // question-card-v4 shared-183.mjs / shared-26.mjs: the focus-trap / modal readers of the card's keys.
  'shared-183-B2N6Zy4J.js#fG': 'which inert / modal element blocks an element, pure DOM read', 'shared-183-B2N6Zy4J.js#SG': 'open modal dialogs of a document, pure DOM read',
  'shared-183-B2N6Zy4J.js#FW': 'whether a focus hop matches, pure', 'shared-183-B2N6Zy4J.js#_G': 'outermost approval card root of an element, pure DOM read',
  'shared-183-B2N6Zy4J.js#rG': 'constant attribute selector string',
  'shared-26-B-POtn5S.js#JC': 'whether a fullscreen / app cover is up: reads qC.getState() (the store itself is linked, not cut)',
  // approval-titles-v4 shared-123: a membership test over a constant Set no declaration writes.
  'shared-123-1Hc1RTKl.js#eD': 'membership in the constant $E set, pure',
};
export const LINKED_AREAS = ['approval-landing-v4', 'approval-titles-v4', 'code-composer-v4', 'code-routines-v4', 'cowork-scheduled-v4', 'files-changes-v4',
  'proposal-group-v4', 'question-card-v4', 'routines-shared-v4', 'session-rail-kit-v4',
  // D1 owners of module state this closure reaches: the claude.ai connector stores (shared-183 X / Z) and their readers
  // (shared-1 fU, shared-183 dE), the grapheme limiter (shared-2 eB over qz) — frame-sidebar-nav; the render error
  // boundary (shared-26 Ds) — r3b-transcript-v4; the motion config context (vendor-motion C) — working-line-v4.
  { area: 'frame-sidebar-nav', modules: ['shared-183.mjs', 'shared-1.mjs', 'shared-2.mjs'] },
  { area: 'r3b-transcript-v4', modules: ['render-error-boundary.mjs'] },
  { area: 'working-line-v4', modules: ['vendor-motion.mjs'] },
];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
// The originals the roots read that no linked area, adapter or cds-core publicName answers, one module per chunk (listing
// a chunk the closure never enters, or entering one not listed, stops generation).
export const MODULE_CHUNKS = [
  'c115330e7-DYN6DBtZ.js', 'c18ec48ef-f4vXxMAu.js', 'c1c09f50f-BJqjgbXX.js', 'c3b2e82df-BjgqsML2.js', 'c504dd339-C5HYPVOD.js', 'c57108ec0-vtCtw5E5.js',
  'c7f8992b4-B-8WHHV9.js', 'c7ff9ff39-Dm_ZbIVX.js', 'c83a467b7-ClpLdZFf.js', 'c872a4b94-fvKGQcFW.js', 'c9d6d9802-DYBH81aC.js', 'ca28d617b-CPfKF8E0.js',
  'ca55c5368-hP8eX3td.js', 'cb3e475a7-DVRcQh8O.js', 'cb50b3202-wMiGsFCo.js', 'cc2d75ce6-7rduZGF6.js', 'ccbc7e432-DK6QVgWB.js', 'ceb33a220-DKpZ8l1W.js',
  'cef5c410f-CltsPYHI.js', 'cfbacea79-D3vYxuG4.js',
  'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js', 'shared-123-1Hc1RTKl.js', 'shared-153-DMw2VzSq.js', 'shared-183-B2N6Zy4J.js', 'shared-212-BHMAi0oa.js',
  'shared-26-B-POtn5S.js', 'shared-31-C9BqSSuD.js', 'shared-33-DtdykY0y.js', 'shared-36-fqRFYwOb.js', 'shared-38-DyF0_Fim.js', 'shared-4-C_EiQb9h.js',
  'shared-6-2QYRw_Wv.js', 'shared-62-DoCqVpIq.js', 'shared-92-BOgyxePb.js', official.sharedFrame,
];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...MODULE_CHUNKS.map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): how the transcript and Cowork's permission card mount the roots.
const rawCallSites = [
  { source: 'cc1aae219-BbSf__8R.js', role: 'The transcript tool block imports gt (export i as $E) and renders it for a pending permission with the approvalData',
    features: ['import{a as ZE,c as QE,i as $E,n as eD,r as tD,t as nD}from"./c96142a4d-DqOQjECe.js"', 'm($E,{toolName:b||n.name,rawToolName:n.name,integrationName:T,iconUrl:x,input:'] },
  { source: 'ca44d5dae-BRuZQyqX.js', role: 'Cowork permission card: Allow for this task off a scheduled task / main offer, Allow for all scheduled runs in a run, and the notify opt-in host only for an external ask or a remote session',
    features: ['onAllowForThisTask:_n||vn||Si?Bi:void 0', 'onAllowForAllScheduledRuns:Di?zi:void 0',
      'surface:"external",toolUseId:t,chatId:o}:si?{surface:"cowork_remote",toolUseId:t,chatId:o}:void 0'] },
  { source: CARD, role: 'gt words Deny (decline only on the chromeless notice surface)', features: ['gn=O?"decline":"deny"'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

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
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

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
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module exports exactly the adapted names: each re-exported from the host adapter that documents it, or
// (from: HERE) defined in the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:const|function) ([\w$]+)/gm)) exported.set(m[1], HERE);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not ${from === HERE ? 'defined here' : `re-exported from ${from}`}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  if (/from "\.\/generated\//.test(text)) throw Error(`${ADAPTER_FILE}: must not import generated code`);
  for (const [name, from] of wanted) {
    if (from === HERE) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the cowork-approval-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

// What this graph links: a whole area by its manifest sha256; a module-restricted link by the linked modules' sha256.
async function linkedPins() {
  const out = {};
  for (const link of LINKED_AREAS) {
    const area = typeof link === 'string' ? link : link.area;
    const bytes = await fs.readFile(path.join(generatedRoot, area, 'manifest.json'));
    if (typeof link === 'string') { out[area] = sha(bytes); continue; }
    const manifest = JSON.parse(bytes.toString());
    out[area] = Object.fromEntries(link.modules.map(t => [t, manifest.modules.find(m => m.target === t)?.sha256 ?? null]));
  }
  return out;
}

export function coworkApprovalV4Config() {
  return {
    name: 'cowork approval (4.16336.0)', generator: 'extract-cowork-approval-v4.mjs', output: path.join(root, COWORK_APPROVAL_V4_OUTPUT),
    adapterModule: '../../source-cowork-approval-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
    // wave 7 (W7-D5): shared-62 Ha is a host boundary (loadPublicSuffixList), so Va and its lazily loaded public-suffix
    // chunk (cd668e25e, copied verbatim before) are no longer reached; no lazyVerbatim.
  };
}

export async function extractCoworkApprovalV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  if (!dryRun) {
    for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
    for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  }
  await assertAdapterModule();
  const linked = await linkedPins();
  const cfg = {
    ...coworkApprovalV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the cowork-approval roots (${official.referenceVersion}); generated by extract-cowork-approval-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => rs[l].name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-cowork-approval-v4.mjs',
          previous: { generator: 'scripts/extract-cowork-approval.mjs', output: 'src/generated/cowork-approval', referenceVersion: official.previousVersion,
            roots: { ToolApprovalCard: 'c96142a4d-BISHCy1R.js#Je', ToolApprovalActions: 'c14f706e5-BnmRTX8N.js#wt' } },
          isolatedGraph: { productionOutput: 'src/generated/cowork-approval', productionSwitchNotBeforeBatch: 10, consumers: ['src/source-cowork-approval.jsx'] },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, removedRoots: [], adapters, linkedCopies,
          imports: m.modules.flatMap(mod => (mod.imports ?? []).filter(i => i.kind && i.kind !== 'generated' && i.kind !== 'verbatim').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
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
  } else await extractCoworkApprovalV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
