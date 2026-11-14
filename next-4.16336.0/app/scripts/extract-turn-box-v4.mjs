// Turn box (the Code session's turn card: the todo card, the next-actions row and the chip rule memory the host reads),
// 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 7, region turn-box): the semantic roots
// scripts/extract-turn-box.mjs cuts from 3.6556.2 into src/generated/turn-box and the host reads (src/source-turn-box.jsx,
// src/source-turn-box-adapters.jsx, src/source-recap-card.jsx, src/source-settled-turn-box.jsx, src/turn-plan-bridge.mjs),
// re-located in the frozen 4.16336.0 snapshot and cut into the isolated graph src/generated/turn-box-v4. The 3.6556.2
// output is untouched (staged double output; no production switch: every host module keeps reading
// src/generated/turn-box).
//
// 3.6556.2 -> 4.16336.0: the turn box moved family (cccc2cf0a pj / cj -> c9bd7af9c RP / kP); the presets / turnBox
// gate D1 moved out of c227f4d5e into its own chunk (c585d217d _); shared-46 sL (archiveHeldBack) is shared-55 EF; the
// recap text shared-11 qE is shared-39 Sk; the turn tail Er / Y (c4ea84cb3 Er / Kr) is cut by turn-plan-v4 and only
// re-exported here (D1, never a second copy).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2 plan.json turn-box `linked` + dagAdjustments turn-box -> transcript-rows, and the graphs
//     that already own state of the closure): every binding one of them already holds and exports is imported from it,
//     never cut again;
//   - host boundaries as localAdapters (file#local), each an existing host adapter re-exported by
//     src/source-turn-box-v4-adapters.jsx; each original is pinned by features and by its raw declaration sha256
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
export const TURN_BOX_V4_OUTPUT = 'src/generated/turn-box-v4';
const ADAPTER_FILE = 'src/source-turn-box-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

// ── Roots: file -> local -> { name, old (3.6556.2 root), export (chunk alias, null: chunk-internal), probe (raw), features } ─
export const ROOTS = {
  'c9bd7af9c-Bvb7EG4D.js': {
    RP: { name: 'TurnBox', old: 'cccc2cf0a-DhZC33Gc.js#pj', export: "m", probe: "RP=b(function(e){let $=J9(25),{sessionRe",
      features: ["nextStepOnly: o,", "spacedByHost: s,", "\"data-turn-next\": \"\",", "p-4 [&:not(:has(button:not([hidden]_button):not([data-turn-dismiss]_button),p:not([hidden]_p)))]:hidden", "\"motion-safe:animate-step-in\"", "agentsRunning: d?.working === !1 ? b : 0,"] },
    kP: { name: 'TurnNextActionsRow', old: 'cccc2cf0a-DhZC33Gc.js#cj', export: "h", probe: "function kP(e){let $=J9(16),t,n;J1($,0,e",
      features: ["({ turnHasPendingSuggestion: n, ...t } = e)", "} = mx(t.sessionRef, t.latestPromptId),", "d = OP(t.sessionRef.id, l),", "f = J2($, 3, n, r) ? K2($, 3, n, r, Nl(r, n)) : $[5],", "p = s > 0;", "proposalsPending: d,", "agentRunning: p,", "wrapUpCallId: i,"] },
  },
  'cd4f82e77-Cuw99s6A.js': {
    Ut: { name: 'evaluateNextActionRules', old: 'cd4f82e77-CAMIsQ30.js#gt', export: "F", probe: "function Ut(e){if(e.isResponding)return ",
      features: ["if (e.isResponding) return W;", "let r = It(n, e.commands);"] },
    Ht: { name: 'firingNextActionRules', old: 'cd4f82e77-CAMIsQ30.js#ht', export: "I", probe: "function Ht(e){return _t.filter(t=>H[t].",
      features: [".filter((t) => H[t].fires(e))"] },
    Jt: { name: 'keepShownChips', old: 'cd4f82e77-CAMIsQ30.js#xt', export: "X", probe: "function Jt(e,t,n){let r=e.id===t,i=r&&e",
      features: ["memory: d ? e : { id: t, chips: l, onScreen: c, pendingAfterRetirement: s },"] },
    Yt: { name: 'retireShownChips', old: 'cd4f82e77-CAMIsQ30.js#St', export: "J", probe: "function Yt(e){return e.pendingAfterReti",
      features: ["chips: e.pendingAfterRetirement,"] },
    Kt: { name: 'chipStateKey', old: 'cd4f82e77-CAMIsQ30.js#yt', export: "q", probe: "function Kt(e){return e.map(e=>e.key).so",
      features: [".sort()"] },
    Ft: { name: 'namedRuleChip', old: 'cd4f82e77-CAMIsQ30.js#ct', export: "B", probe: "function Ft(e,t){if(!t.isResponding)retu",
      features: ["if (!t.isResponding)", "? (It(\"create_pr\", t.commands) ?? void 0)"] },
    zt: { name: 'pullRequestRuleState', old: 'cd4f82e77-CAMIsQ30.js#ft', export: "G", probe: "function zt(e){return e===void 0?\"unknow",
      features: ["? \"unknown\"", ": (ee(e.state) ?? \"none\");"] },
  },
  'c73f45bc3-C7dtUSq8.js': {
    J_: { name: 'useIdleOnReturn', old: 'c73f45bc3-B7hbL7H9.js#xg', export: null, probe: "function J_(e,t,n){let $=J9(11),r=e===nu",
      features: ["`${e}:${t}`", "!f.getState().hidden && Date.now() - i >= K_ * 6e4 && o(r);"] },
    $h: { name: 'emptyRuleMemory', old: 'c73f45bc3-B7hbL7H9.js#Yp', export: null, probe: "function $h(e){return{id:e,turnKey:void ",
      features: ["streaks: { commit: Qh, create_pr: Qh, verify: Qh },"] },
    eg: { name: 'advanceRuleMemory', old: 'c73f45bc3-B7hbL7H9.js#Xp', export: null, probe: "function eg(e,t){if(e.id!==t.id)return{.",
      features: ["commitIgnoredIfWrote: t.wroteUncommitted"] },
    rg: { name: 'markRulePainted', old: 'c73f45bc3-B7hbL7H9.js#$p', export: null, probe: "function rg(e,t){let n=e.streaks[t];retu",
      features: ["return !n.shown && (n.usedAt === void 0 || n.usedAt !== e.turnKey)"] },
    ig: { name: 'markRuleUsed', old: 'c73f45bc3-B7hbL7H9.js#em', export: null, probe: "function ig(e,t,n=e.turnKey){let r=ag(e,",
      features: ["{ ...i, usedAt: n }"] },
    og: { name: 'markVerifySent', old: 'c73f45bc3-B7hbL7H9.js#nm', export: null, probe: "function og(e,t,n=e.turnKey){if(t===null",
      features: ["let r = { ...e, verifySentAt: t, verifySentTurn: n };"] },
    sg: { name: 'markSlashCorrectionUsed', old: 'c73f45bc3-B7hbL7H9.js#rm', export: null, probe: "function sg(e,t){return t===null||e.slas",
      features: ["{ ...e, slashCorrectionUsedAt: t };"] },
    Zh: { name: 'STREAK_RULES', old: 'c73f45bc3-B7hbL7H9.js#qp', export: null, probe: "Zh=[\"commit\",\"create_pr\",\"verify\"]",
      features: ["[\"commit\", \"create_pr\", \"verify\"]"] },
    ev: { name: 'NO_CHIPS', old: 'c73f45bc3-B7hbL7H9.js#Dg', export: null, probe: "ev=Object.freeze([])",
      features: ["Object.freeze([])"] },
  },
  'shared-18-Cfqwgjc5.js': {
    Ij: { name: 'isPullRequestUrl', old: 'shared-18-D3y8YMFN.js#QE', export: "zc", probe: "function Ij(e){return e?/^\\/[^/]+\\/[^/]+",
      features: ["URL.parse(e)?.pathname ?? \"\"", "\\/pull\\/\\d+(?:\\/|$)/.test("] },
  },
  'c227f4d5e-DGDdGBTz.js': {
    PG: { name: 'useOffersBackgroundTask', old: 'c227f4d5e-B-FYKrwT.js#Tk', export: "sr", probe: "function PG(e){let $=J9(2),t=J1($,0,e)?K",
      features: ["?.backgroundTaskSuggestions?.some(FG) === !0,", "return Cc(t);"] },
  },
  'c585d217d-C-1Lrrpr.js': {
    _: { name: 'canHostTurnBox', old: 'c227f4d5e-B-FYKrwT.js#D1', export: "i", probe: "function _(e){let t=m(e),n=o();return t|",
      features: ["let t = m(e),", "return t || (n && e != null);"] },
  },
  'shared-55-BRv2XBP7.js': {
    EF: { name: 'archiveHeldBack', old: 'shared-46-BIbZBGFq.js#sL', export: "Jn", probe: "function EF(e,t){let n=e.find(e=>e.sessi",
      features: ["let n = e.find((e) => e.sessionId === t);", "return n === void 0 || !gF(n) || n.autoArchiveHold !== void 0 || DF(e, t);"] },
  },
  'c4ea84cb3-RflkeHS4.js': {
    q: { name: 'useDismissedWrapUpCalls', old: 'c4ea84cb3-rXGDAnKH.js#wr', export: "o", probe: "function q(t){let $=J9(2),n=J1($,0,t)?K1",
      features: ["t === null ? hr : (br().get(t) ?? hr)", "return e(vr.subscribe, n, Tr);"] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c9bd7af9c-Bvb7EG4D.js#RP': '9d09ae0fce32e293ee7b4b3553afc0934bd4d3432203d4d6591993031c075393',
  'c9bd7af9c-Bvb7EG4D.js#kP': '639518f90d175fbf518f49d913fbb973d1fafa1b279fa01d7da5a378e07dd3fe',
  'cd4f82e77-Cuw99s6A.js#Ut': 'c2d04099d15a38fb667619fd80011402347d945c6ce4f9b65dca1e8b5c466d97',
  'cd4f82e77-Cuw99s6A.js#Ht': '2d71365458dea274f58651ed1a3129837e95a623e0cc66ad445cf149ec9544d5',
  'cd4f82e77-Cuw99s6A.js#Jt': 'd2491345ccc8d79b201a91dc06da4d369d1830c2b95610d788252e59f1ff00d9',
  'cd4f82e77-Cuw99s6A.js#Yt': '2e5bacb62461dbee4efd7b6a090a419cff73a4ac8535a3b794d918179794c13b',
  'cd4f82e77-Cuw99s6A.js#Kt': '10ae5a9946aa08bb877816d8b57e8b8d0b9d9388f3a2542e00f32ae9a97e2bdb',
  'cd4f82e77-Cuw99s6A.js#Ft': '7cee2c16e33502342fb40d2b444476c77f45e38612529d6687827322aa3bbfbc',
  'cd4f82e77-Cuw99s6A.js#zt': '23913ab6f51284336f0cac5e2e8c779439e5e2e514e92a9754e5c8807f381087',
  'c73f45bc3-C7dtUSq8.js#J_': '2e59c1a86e439d30b2235317f4ee9e489815560ac883f834fa105f281f7aa8f9',
  'c73f45bc3-C7dtUSq8.js#$h': '1dc3a905aefd4e03e29969ab24080e031471d9ff1dbe97abf7957c4aea4b3dcb',
  'c73f45bc3-C7dtUSq8.js#eg': '2e80f01f76548cdac86cc4e89262a986c481a5229a076ed299cd50dd66708ce9',
  'c73f45bc3-C7dtUSq8.js#rg': '09ecd9f7dcfdf1db42b492e936e648fc4c6a967e8b119bcb9c6d368772d7af92',
  'c73f45bc3-C7dtUSq8.js#ig': 'a316d60492eb3ce57875acc241c091f7329182f402d9ffe4c785fea74b32dfe6',
  'c73f45bc3-C7dtUSq8.js#og': '2a6793600b0c09a6f48dea8414257abe542534700bc57a2f0f98c98a84dc3f15',
  'c73f45bc3-C7dtUSq8.js#sg': 'e31e17f7def442d50b6c0226f6b5274b9dc23252f8fe1223f0eb4b71e18d63e0',
  'c73f45bc3-C7dtUSq8.js#Zh': '1d74e1ae733cff8a0b0f0afca530219db989cda7fc7c472200f16b24c9601338',
  'c73f45bc3-C7dtUSq8.js#ev': '8794147af1e994597bc9aaa55e87b9f67a20bfb14b9734198472562ba95a0ba2',
  'shared-18-Cfqwgjc5.js#Ij': 'a7dd5efc359ef19e228014ae4a9a5700107504836ae82cd6b8e0f4f015df3272',
  'c227f4d5e-DGDdGBTz.js#PG': '216c2e5f7e5c1efb85c68566a1fcfa7b7eb0bdc5be126e82f395fd5bdc43f687',
  'c585d217d-C-1Lrrpr.js#_': '688cb94b8df1e12612376cb184d27c5fc86bb04b38c665ab75e6bdbb741602c4',
  'shared-55-BRv2XBP7.js#EF': '886a8d87286d0504652493ecde5f966380c3bb09c8c2cabbe64ae98c449345c7',
  'c4ea84cb3-RflkeHS4.js#q': '7d2accecb5c894d939709782c2e023a4f4d079021e9cd00332d2b79313b35658',
};

// Roots another graph already cuts (D1): re-exported from it under the semantic name, after checking that its manifest
// holds exactly this official binding and exports it under that name.
export const LINKED_ROOTS = {
  'c4ea84cb3-RflkeHS4.js#Er': { name: 'EMPTY_TURN_TAIL', old: 'c4ea84cb3-rXGDAnKH.js#Er', area: 'turn-plan-v4', target: 'turn-tail.mjs' },
  'c4ea84cb3-RflkeHS4.js#Kr': { name: 'turnTailEqual', old: 'c4ea84cb3-rXGDAnKH.js#Y', area: 'turn-plan-v4', target: 'turn-tail.mjs' },
  // shared-39 Sk (exported n; 3.6556.2 shared-11 qE, source-recap-card.jsx recapPlainText): turn-plan-v4 shared-39.mjs
  // cuts it and exports it under its own name (sharedExports).
  'shared-39-ZCs0lAwB.js#Sk': { name: 'recapPlainText', old: 'shared-11-_AVGLHEz.js#qE', area: 'turn-plan-v4', target: 'shared-39.mjs', exportedAs: 'Sk' },
  // cd4f82e77 V (exported W; 3.6556.2 F): turn-plan-v4 cd4f82e77.mjs cuts it for its wrap-up chip and exports it under its
  // own name once it lists it in linkExports (account2/turn-box/prestage/patches/turn-plan-v4-linkExports.patch, which
  // also exports the chip rule predicates and cb27dab29 B this closure reads).
  'cd4f82e77-Cuw99s6A.js#V': { name: 'prStateEndsSession', old: 'cd4f82e77-CAMIsQ30.js#F', area: 'turn-plan-v4', target: 'cd4f82e77.mjs', exportedAs: 'V' },
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (the host module it re-exports), old,
// features } ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const TB = 'src/source-turn-box-adapters.jsx';
export const HOST_ADAPTERS = {
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: TB, old: 'vendor-intl-DYfox5Co.js#q',
    features: ["return (Mt(e), e);"] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: TB, old: 'vendor-intl-DYfox5Co.js#Gt',
    features: ["var Gt = a(Wt, Ut);"] },
  'c06cf64bb-CoZso5N4.js#X': { name: 'useSessionBucket', from: TB, old: 'c06cf64bb-CdJdJuVd.js#X',
    features: ["() => t(e === null ? void 0 : J(e))", "() => t(void 0)"] },
  'c227f4d5e-DGDdGBTz.js#BB': { name: 'useOpenTasksPane', from: TB, old: 'c227f4d5e-B-FYKrwT.js#mQ',
    features: ["openTasksPaneAtTask: r,", "\"task_chip\""] },
  'c227f4d5e-DGDdGBTz.js#g5': { name: 'logNextRowDismissed', from: TB, old: 'c227f4d5e-B-FYKrwT.js#O5',
    features: ["let { turnOrdinal: n, msSinceTurnEnd: r } = h5(e, t.session_id);", "ms_since_turn_end: r"] },
  'c227f4d5e-DGDdGBTz.js#hU': { name: 'useCreatePrRunner', from: TB, old: 'c227f4d5e-B-FYKrwT.js#qZ',
    features: ["{ sessionRef: t, sessionRepo: n, branchNotPushed: r } = e,", "{ fireCreateMode: i, busy: a } = BT("] },
  'c227f4d5e-DGDdGBTz.js#mU': { name: 'useArchiveRunner', from: TB, old: 'c227f4d5e-B-FYKrwT.js#KZ',
    features: ["{ sessionRef: t, sessionType: n, afterRemoval: r } = e,", "{ archiveSession: a, isArchiving: o } = tS(i),"] },
  'c26fb8b6b-DXUqD5LQ.js#K': { name: 'useOpenSession', from: TB, old: 'c26fb8b6b-B7Friu61.js#xn',
    features: ["entryPoint: \"cmd_click\",", "useOpenLinkedSession: the route built for a linked session does not parse as a session route"] },
  'c4ea84cb3-RflkeHS4.js#Yr': { name: 'useTurnTail', from: TB, old: 'c4ea84cb3-rXGDAnKH.js#Wr',
    features: ["n = Gt(e?.id ?? null),", "{ todos: a } = Cn(i ? null : e),", "return w(c, Kr);", "n.length === 0 ? Er : Jr(n, t, i ? void 0 : a, o, s, r),"] },
  'c5da7eb42-aEqbSKbC.js#LL': { name: 'useSessionQuery', from: TB, old: 'c5da7eb42-XijZdwf1.js#QI',
    features: ["n?.passive ?? !1,", "n?.enabled ?? !0"] },
  'c5da7eb42-aEqbSKbC.js#f_': { name: 'useSessionTurnBoxFlag', from: TB, old: 'c5da7eb42-XijZdwf1.js#mv',
    features: ["t.sessions.some((t) => t.sessionId === e && t.turnBox === !0),", "typeof e == \"string\" &&"] },
  'c5da7eb42-aEqbSKbC.js#O_': { name: 'useSessionTurnBoxDrawn', from: TB, old: 'c5da7eb42-XijZdwf1.js#Cv',
    features: ["i = f_(r ? e : null),", "return i || o;"] },
  'shared-39-ZCs0lAwB.js#Ol': { name: 'usePresetsGate', from: TB, old: 'shared-11-_AVGLHEz.js#gc',
    features: ["return Ke(Dl);"] },
  'c6b8adeaf-qnfs920E.js#Io': { name: 'useSendWithOutcome', from: TB, old: 'c6b8adeaf-bLEQVSWL.js#Xa',
    features: ["\"epitaxy: send stopped, the page switched organizations\"", "tags: { source: \"send_with_outcome\", send_surface: t },"] },
  'c73f45bc3-C7dtUSq8.js#Gu': { name: 'useAfterSessionRemoved', from: TB, old: 'c73f45bc3-B7hbL7H9.js#jl',
    features: ["{ sessionId: t, onSessionRemoved: n } = e,"] },
  'c73f45bc3-C7dtUSq8.js#Y_': { name: 'useNextActionRules', from: TB, old: 'c73f45bc3-B7hbL7H9.js#Sg',
    features: ["firingKnown:", "namedFallback:"] },
  'c96d752d0-D9VB6ArX.js#E2': { name: 'useTurnBoxAtReplies', from: TB, old: 'c96d752d0-CWv_7-n9.js#QV',
    features: ["return Bne(plt);"] },
  'shared-20-DUEo90UF.js#EA': { name: 'useStartNewSession', from: TB, old: 'c6d21d103-JCKleZiK.js#d',
    features: ["t = e?.runnerPool,", "gd({ plainLanding: t === void 0 }),", "\"page_control\""] },
  'shared-25-D-aF0gt9.js#Z': { name: 'useCurrentAccount', from: TB, old: 'shared-25-DOWZRSlq.js#Z',
    features: ["Error(\"Must call inside CurrentAccountProvider\"),"] },
  'shared-39-ZCs0lAwB.js#gb': { name: 'useAttentionSessionIds', from: TB, old: 'shared-11-_AVGLHEz.js#V_',
    features: ["for (let e in t.requestsBySession) {", "a.status === \"pending\" &&"] },
  'shared-39-ZCs0lAwB.js#lb': { name: 'useSessionAwaitsRequest', from: TB, old: 'shared-11-_AVGLHEz.js#P_',
    features: ["let n = e === void 0 ? void 0 : t.requestsBySession[e];", "return n ? Object.values(n).some(nb) : !1;"] },
  'shared-39-ZCs0lAwB.js#fb': { name: 'useSessionHasPendingRequest', from: TB, old: 'shared-11-_AVGLHEz.js#L_',
    features: ["return n ? Object.values(n).some(pb) : !1;"] },
  'shared-39-ZCs0lAwB.js#ub': { name: 'useSessionRequestInTurn', from: TB, old: 'shared-11-_AVGLHEz.js#F_',
    features: ["let n = e === null ? void 0 : t.requestsBySession[e];", "return n ? Object.values(n).some(db) : !1;"] },
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: TB, old: 'shared-52-uHFNjl7C.js#cB',
    features: ["Error(\"Must be called within ErrorsProvider\")"] },
  'shared-8-BqfCbkJd.js#bv': { name: 'useSessionsStore', from: TB, old: 'shared-8-Db1QN4mf.js#og',
    features: ["sessions: [],", "isInitialized: !1,"] },
  'c19e90103-BKPMSRL2.js#qC': { name: 'TodoMarkdown', from: TB, old: 'c19e90103-BQFzF8EA.js#Ux',
    features: ["O = c === void 0 ? \"epitaxy\" : c,", "isStreaming: n,"] },
  'ccbc7e432-DK6QVgWB.js#S': { name: 'useChipChords', from: TB, old: 'ccbc7e432-DXuvQ274.js#j',
    features: ["k = S.yieldWhenOffScreen === !0,", "enabled: C,", "cardRootRef: w,", "escapeOnly: T,", "armKey: E,", "decisionRowRef: D,"] },
  'c68c4283d-FxwfdZSA.js#Kp': { name: 'logChipsShown', from: TB, old: 'c68c4283d-CWbOoVxS.js#mp',
    features: ["(\"claudeai.desktop.code.flint.shown\", e);"] },
  'c68c4283d-FxwfdZSA.js#qp': { name: 'logChipClicked', from: TB, old: 'c68c4283d-CWbOoVxS.js#hp',
    features: ["Z(\"claudeai.desktop.code.flint.clicked\", e);"] },
  'c68c4283d-FxwfdZSA.js#Jp': { name: 'logRulesEvaluated', from: TB, old: 'c68c4283d-CWbOoVxS.js#gp',
    features: ["Z(\"claudeai.desktop.code.flint.evaluated\", e);"] },
  'c68c4283d-FxwfdZSA.js#Yp': { name: 'logChipOutcome', from: TB, old: 'c68c4283d-CWbOoVxS.js#_p',
    features: ["Z(\"claudeai.desktop.code.flint.outcome\", e);"] },
  'c68c4283d-FxwfdZSA.js#yt': { name: 'messageTurnOrdinal', from: TB, old: 'c68c4283d-CWbOoVxS.js#ft',
    features: ["return S.get(e);"] },
  'c68c4283d-FxwfdZSA.js#vt': { name: 'sessionTurnOrdinal', from: TB, old: 'c68c4283d-CWbOoVxS.js#dt',
    features: ["return x.get(e);"] },
  'shared-1-D1bGaTaN.js#_B': { name: 'usePaneHiddenStore', from: TB, old: 'shared-1-BJhqMmkf.js#xE',
    features: ["return E(hB);"] },
  'shared-1-D1bGaTaN.js#vB': { name: 'onPaneHiddenChange', from: TB, old: 'shared-1-BJhqMmkf.js#SE',
    features: ["e.hidden !== n.hidden && t(e.hidden);"] },
  'shared-19-UalAfDtn.js#gL': { name: 'useAccountFlag', from: TB, old: 'c2c1ed18b-BGGmHSxk.js#n',
    features: ["e = Mn()?.account;"] },
  // c5da7eb42 A_ (exported Hi; new in 4.16336.0, no 3.6556.2 host adapter): the session bucket's wrapUpLeftOut, derived by E_ from
  // the bucket's SDK messages (e.messages.getSnapshot()). The host bucket carries no messages (source-turn-box.jsx answers
  // {compactionStatus}), so the adapter module asks TurnBoxHost.wrapUpLeftOut and otherwise answers what E_ answers
  // without a bucket (p_ = { box: !1, updatePlan: !1 }: no wrapUpLeftOut, false).
  'c5da7eb42-aEqbSKbC.js#A_': { name: 'useWrapUpLeftOut', from: ADAPTER_FILE, old: null,
    features: ["return ld(typeof e == \"string\" ? e : null, E_).wrapUpLeftOut === !0;"] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'c06cf64bb-CoZso5N4.js#X': '4bf21a66caf07069a81f3c0abaa8f788dfecdaa9e7748158c94ee21f0c850b3f',
  'c227f4d5e-DGDdGBTz.js#BB': '019f0b864f9dc18d9b97c08315e35bbb223c7cee523932d7dd8dbf82c82675e8',
  'c227f4d5e-DGDdGBTz.js#g5': 'b8369a3c4f2e0859b8c9090795f31a2c845b3d374b70ba969b54ce57e26c4df0',
  'c227f4d5e-DGDdGBTz.js#hU': '07b5d56e4ef072818079d1729f1a65a1d06d43af964ebf15a2c4761093bf684b',
  'c227f4d5e-DGDdGBTz.js#mU': '55327a629202bd1caa660759712716814266b59ab2a657161e5954eb7b1469f3',
  'c26fb8b6b-DXUqD5LQ.js#K': 'b3788537c791d0880034fa659fd972ca25c313737e8ac42fb1baf9e1a7a53f10',
  'c4ea84cb3-RflkeHS4.js#Yr': 'ce183029189f5b22a135ab7ab873dd7c46b57fd4f085c9c194ad7d2850278960',
  'c5da7eb42-aEqbSKbC.js#LL': '6b7105ae24f3ae257f8320347117a0f95159a2f96952da4134221c3550c95cca',
  'c5da7eb42-aEqbSKbC.js#f_': '8e84dc792dd66cde9815d586c13effc2bd7ae62872bf0fa1227292c321ec9828',
  'c5da7eb42-aEqbSKbC.js#O_': '4c6afcd14eefdf7266a756afc63fe026563160b7d5617938899c25360cd68f6a',
  'shared-39-ZCs0lAwB.js#Ol': '2258f4834d37f44d232f32366340df2fdcbe0f00d13776290409b018ba8afffc',
  'c6b8adeaf-qnfs920E.js#Io': '7fbee97bc9490a0971f183322a7ea9357311a74212d8c8cc2fb6a68f242ebf6a',
  'c73f45bc3-C7dtUSq8.js#Gu': '9f64ee41be942120323a39cd012107d59b443a1bd568e8186aad2f2845a509b6',
  'c73f45bc3-C7dtUSq8.js#Y_': '0ab7757fa0b4afa9a778355a5e29fc298cdf94f856b257a7b0989d3fd17de1da',
  'c96d752d0-D9VB6ArX.js#E2': '942030132f8f32b1ce08258074c6b7cf2e4806f89963686bdbf68661094ddaa8',
  'shared-20-DUEo90UF.js#EA': 'd4fc3bebb156001dda6db4146529fc4e1cb8fb42eecc3da484cf43ef30b2598f',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'shared-39-ZCs0lAwB.js#gb': '953b48c55861f323375baf7f5840912ef5526a42464b03bd31750ddc6f5f169a',
  'shared-39-ZCs0lAwB.js#lb': '325f37e5decd118ac66fea1e160732e98c63e3b5d3075d27fb57cf143beadf7a',
  'shared-39-ZCs0lAwB.js#fb': '7fbf76aa62e487794438cbbfa4c5c8a857794e551a48bc349a98fbdb49762279',
  'shared-39-ZCs0lAwB.js#ub': 'ffe423efd8723990eb4ffcab9052eb05931aedb96ea8da8c3ce1a3ae2af83cbb',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-8-BqfCbkJd.js#bv': 'b0e8d90c58b158430a7faac4998bb97f5cd43b26388c9e07c07cd9dbd08c8bab',
  'c19e90103-BKPMSRL2.js#qC': '7e7c3280b8bac1a6fda4999c44fa0ea1aaa62e5f282ba4a8fd4d7221ec74b552',
  'ccbc7e432-DK6QVgWB.js#S': '9c1a8973a4377627103a34905675b5fd69c2097bbee0a3337360df5b28807d62',
  'c68c4283d-FxwfdZSA.js#Kp': '9f54c860dd0002fba30707a94809897713101d6dc052eaa5e9ea6f8e54dcd4ca',
  'c68c4283d-FxwfdZSA.js#qp': 'f8877c23c88e48610461da1d4a444ba91bf77a8737570018ba4d172227bcd8fa',
  'c68c4283d-FxwfdZSA.js#Jp': 'f39f08351de3a4ff823ddd0989d8f82957bb7d8f8ecf0c48056fa74e63321983',
  'c68c4283d-FxwfdZSA.js#Yp': '313f822e7dc3db0f1b65cc9ca493edbf2695d8438a25fb213ee1233b513cea87',
  'c68c4283d-FxwfdZSA.js#yt': '9836f66895a798473dffecf5f55b977f6892083bfad92edb86005926d7ae5ade',
  'c68c4283d-FxwfdZSA.js#vt': '709f2fa46cec918c3024fc324d4f02b2827bf17c35a75ada007784cd5c004f18',
  'shared-1-D1bGaTaN.js#_B': '64c15cedd845f0b3ae5f886a3eb123973745a2cf435283b9f31c5e02fbbbd3e5',
  'shared-1-D1bGaTaN.js#vB': 'dbfcf3dbb81fbf5b6230b5e5eb5f3f4f9e66cfdb6ebcdecb9377e384ab28ac3d',
  'shared-19-UalAfDtn.js#gL': 'cabbe9cf7878b1f7f54cc065d57012723529b032e1908c22ed4f6774e547e1fe',
  'c5da7eb42-aEqbSKbC.js#A_': 'aff6c5e3572833821d5a875ae1bf9ce559ece8995d244051c6ca73e99c83abd5',
};

// Pure bindings a linked area cuts without exporting, cut again here (each with its reason).
const linkedCopies = {
};

// D1: the graphs that already hold state of this closure. code-current-v4's manifest is not a runSlicer manifest (some
// semantic modules have no official source): it is linked through the modules that name their chunk.
export const LINKED_AREA_NAMES = ['approval-landing-v4', 'chat-markdown-v4', 'code-editor-current-v4', 'code-routines-v4', 'code-start-v4', 'composer-notices-v4', 'cowork-progress-v4', 'cowork-scheduled-v4', 'cowork-session-states-v4', 'files-changes-v4', 'proposal-group-v4', 'r3b-transcript-v4', 'retry-decision-v4', 'routines-shared-v4', 'session-rail-changes-v4', 'session-rail-kit-v4', 'session-rail-sections-v4', 'session-rail-v4', 'sessions-page-v4', 'transcript-rows-v4', 'turn-plan-v4', 'working-line-v4', 'code-composer-v4', 'session-rail-context-v4', 'code-current-v4', 'frame-sidebar', 'session-load-error', 'settings-nav'];
async function linkedAreas() {
  const out = [];
  for (const area of LINKED_AREA_NAMES) {
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    out.push(m.modules.some(x => !x.source) ? { area, modules: m.modules.filter(x => x.source).map(x => x.target) } : area);
  }
  return out;
}

// Roots held back until cds-core publishes what they need (D1: never cut twice).
export const PENDING_ROOTS = {
};
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+(?:-\d+)?|preload-helper|rolldown-runtime|c[0-9a-f]+)-[\w-]+\.js$/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CLOSURE_CHUNKS = ['c1607bc8b-y6O11Lba.js', 'c26f8455e-Xdxzjvn_.js', 'c96d752d0-D9VB6ArX.js', 'cb27dab29-Cw2yQaFh.js', 'cb6930dae-DPu57U90.js', 'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js', 'shared-140-DfG6VwpK.js', 'shared-183-B2N6Zy4J.js', 'shared-26-B-POtn5S.js', 'shared-39-ZCs0lAwB.js', 'shared-92-BOgyxePb.js'];
const emitted = (file, roots) => Object.fromEntries(Object.entries(roots).filter(([local]) => !PENDING_ROOTS[`${file}#${local}`]));
const modules = () => [
  ...Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).filter(([file, roots]) => Object.keys(roots).length || CLOSURE_CHUNKS.includes(file)).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each must occur exactly once): the session view's wiring the host follows but cannot
// import. The 3.6556.2 main-process pins (turnBoxEnabled behind GrowthBook 2371478310) are not repeated here: runSlicer
// reads renderer chunks only; the 4.16336.0 main process keeps `turnBoxEnabled:b.Mt()&&this.sessions.get(e)?.turnBoxMounted
// ===!0` (asar index.chunk-wiGqt7B_.js), which electron/turn-plan-adapters.mjs answers (turn-plan-v4 owns that side).
const SCOPE = 'cc43287c9-dzfX-J5i.js';
const rawCallSites = [
  { source: SCOPE, role: 'RCe / HCe: the lazily loaded EpitaxyTurnBox and EpitaxyTurnNextActionsRow of the session view entry (3.6556.2 npe / ope)',
    features: ['{Component:RCe}=Da({entry:Tm,pick:e=>e.EpitaxyTurnBox,options:{loading:Ea("usually-renders-nothing")},overlayHost:"EpitaxySessionScopeBody.EpitaxyTurnBox"})',
      '{Component:HCe}=Da({entry:Tm,pick:e=>e.EpitaxyTurnNextActionsRow,options:{loading:Ea("usually-renders-nothing")},overlayHost:"EpitaxySessionScopeBody.EpitaxyNextActionsRow"})'] },
  { source: SCOPE, role: 'Mount condition: ts (Noe = c585d217d _, canHostTurnBox) && vo (composer shown) && !isPlanApproval && !isReadOnly; the box mounts once the slot is placeable (qs), the next row also needs fi (presets); the card reports turnCardShown',
    features: ['ts=Noe(qn)', '{slotEl:Us,placeable:Ws,probeRef:Gs}=uSe(Un,Hs),Ks=ts&&vo&&!Jt&&!or,qs=Ks&&Ws,Js=Ks&&qn!==null&&fi', 'e=>Un.setState({turnCardShown:e})',
      'import{i as Noe,o as GR}from"./c585d217d-C-1Lrrpr.js"'] },
  { source: SCOPE, role: 'The session view mounts the turn box with the next row as its child (3.6556.2: the same props; now only when placeable, no inline probe fallback in the call)',
    features: ['qs&&qn?p(RCe,{sessionRef:qn,isResponding:Oi||ua,latestPromptId:ss,onCardShownChange:os,children:Js?p(HCe,{sessionRef:qn,isSsh:cn?.remote?.kind==="ssh",composerRef:ae,eligible:vo,hidden:pi,overlayBusy:ea,onSessionRemoved:an,openSessionMcpDialog:pr,turnHasPendingSuggestion:ds,latestPromptId:ss,hasComposerDraft:bt,ownsShortcuts:pn,hasComposerPopup:xt,composerHasText:cs,composerHasAttachments:ls,onQuestionWithheld:fs},`${qn.id}:next-actions`):null},`${qn.id}:turn-box`)'] },
  { source: 'cf74bc599-BytvntCE.js', role: 'The transcript does not mount the box: it re-exports RP / kP (c9bd7af9c m / h) and hands the transcript tail element to the scope store (turnBoxSlotEl)',
    features: ['hx as EpitaxyTurnBox', 'fx as EpitaxyTurnNextActionsRow', 'm as hx', 'h as fx', 'e=>r.setState({turnBoxSlotEl:e})'] },
  { source: 'c9bd7af9c-Bvb7EG4D.js', role: 'RP / kP are exported as m / h', features: ['RP as m', 'kP as h'] },
  { source: 'c585d217d-C-1Lrrpr.js', role: 'canHostTurnBox (_ = i): the per-session drawn flag (m over c5da7eb42 zi / Ri) || presets (shared-39 zs) && a session',
    features: ['function _(e){let t=m(e),n=o();return t||n&&e!=null}', '_ as i', 'import{Bi as s,Hi as c,Ri as l,zi as u}from"./c5da7eb42-aEqbSKbC.js"', 'import{zs as o}from"./shared-39-ZCs0lAwB.js"'] },
  { source: 'shared-39-ZCs0lAwB.js', role: 'zs = Ol: the claudeai_cc_epitaxy_session_presets_main gate (D10: on; host adapter usePresetsGate)',
    features: ['var Dl="claudeai_cc_epitaxy_session_presets_main";function Ol(){return Ke(Dl)}', 'Ol as zs'] },
];


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
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin === undefined && requirePins) throw Error(`adapter ${key}: no reviewed pin`);
    if (pin !== undefined && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: pin !== undefined });
  }
  return out;
}

// Linked roots: the linked manifest holds the official binding (same chunk, same local) and exports it under the name.
async function linkedRoots() {
  const out = [];
  for (const [key, spec] of Object.entries(LINKED_ROOTS)) {
    const [file, local] = key.split('#');
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, spec.area, 'manifest.json'), 'utf8'));
    const mod = m.modules.find(x => x.target === spec.target);
    if (!mod || path.basename(mod.source) !== file) throw Error(`linked root ${key}: ${spec.area}/${spec.target} is not cut from ${file}`);
    if (!(mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local)) throw Error(`linked root ${key}: ${spec.area}/${spec.target} does not hold ${local}`);
    const as = mod.exports?.[local] ?? ((mod.linkExports ?? []).includes(local) || (mod.sharedExports ?? []).includes(local) ? local : undefined);
    if (as !== (spec.exportedAs ?? spec.name)) throw Error(`linked root ${key}: ${spec.area}/${spec.target} exports ${local} as ${as}, not ${spec.exportedAs ?? spec.name}`);
    out.push({ root: key, ...spec });
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
  // An adapter with `from: ADAPTER_FILE` has no 3.6556.2 host adapter (new in 4.16336.0): the adapter module defines it.
  for (const m of text.matchAll(/^export function ([\w$]+)\(/gm)) exported.set(m[1], { from: ADAPTER_FILE, orig: m[1], own: true });
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a]));
  for (const [name, a] of wanted) if (exported.get(name)?.from !== a.from) throw Error(`${ADAPTER_FILE}: ${name} is not ${a.from === ADAPTER_FILE ? 'defined in it' : `re-exported from ${a.from}`}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, { from, orig, own }] of exported) {
    if (own) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${orig.replace('$', '\\$')}\\b|export \\{[^}]*\\b${orig.replace('$', '\\$')}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${orig} (${name})`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the turn-box-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function turnBoxV4Config() {
  return {
    name: 'turn box (4.16336.0)', generator: 'extract-turn-box-v4.mjs', output: path.join(root, TURN_BOX_V4_OUTPUT),
    adapterModule: '../../source-turn-box-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: [...LINKED_AREA_NAMES],
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/turn-box/prestage/tools/probe.mjs) explores the same configuration.
export async function probeConfig() { return { ...turnBoxV4Config(), linkedAreas: await linkedAreas() }; }

// Every pending root still waits: cds-core holds what it needs without publishing it.
async function assertPending() {
  const m = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(m.publicNames).map(v => `${v.file}#${v.local}`));
  const held = new Set(m.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`)));
  const out = [];
  for (const [key, p] of Object.entries(PENDING_ROOTS)) {
    if (p.linkExport) {
      const lm = JSON.parse(await fs.readFile(path.join(generatedRoot, p.linkExport.area, 'manifest.json'), 'utf8'));
      const mod = lm.modules.find(x => x.target === p.linkExport.target);
      const local = key.split('#')[1];
      if (!mod || !(mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local)) throw Error(`${key} (${p.name}): ${p.linkExport.area}/${p.linkExport.target} no longer holds ${local}; review the pending root`);
      if (mod.exports?.[local] || (mod.linkExports ?? []).includes(local) || (mod.sharedExports ?? []).includes(local))
        throw Error(`${key} (${p.name}): ${p.linkExport.area}/${p.linkExport.target} now exports ${local}; move the root into LINKED_ROOTS`);
    }
    for (const need of p.needs ?? []) {
      if (published.has(need)) throw Error(`${key} (${p.name}): cds-core now publishes ${need}; move the root back into ROOTS`);
      if (!held.has(need)) throw Error(`${key} (${p.name}): cds-core no longer holds ${need}; review the pending root`);
    }
    out.push({ root: key, ...p });
  }
  return out;
}

export async function extractTurnBoxV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const pendingRoots = await assertPending();
  const linkedRootList = await linkedRoots();
  const linked = {};
  for (const area of LINKED_AREA_NAMES) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...turnBoxV4Config(), linkedAreas: await linkedAreas(),
    async artifacts(m) {
      const own = Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).filter(([, rs]) => Object.keys(rs).length)
        .map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`);
      const fromLinked = [...new Map(Object.values(LINKED_ROOTS).map(r => [`${r.area}/${r.target}`, r]))].map(([where]) =>
        `export { ${Object.values(LINKED_ROOTS).filter(r => `${r.area}/${r.target}` === where).map(r => (r.exportedAs && r.exportedAs !== r.name ? `${r.exportedAs} as ${r.name}` : r.name)).join(', ')} } from "../${where}";`);
      return {
        'index.mjs': `// Semantic names for the turn-box roots (${official.referenceVersion}); generated by extract-turn-box-v4.mjs.\n`
          + [...own, ...fromLinked].join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-turn-box-v4.mjs',
          previous: { generator: 'scripts/extract-turn-box.mjs', output: 'src/generated/turn-box', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, linkedRoots: linkedRootList, pendingRoots, adapters, linkedCopies,
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
  } else await extractTurnBoxV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
