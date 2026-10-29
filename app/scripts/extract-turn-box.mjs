// 3.6556.2 migration (w2-tr-turn / w2-tr-turn-cont, plan §3 W2): the generator reads 3.6556.2 (official-3.6556.2.mjs, R1).
// The names in the notes below are the 2.42304.0 ones the module was first written against; the 3.6556.2 roots, adapters
// and pins are in `modules` / `adapters` / `rawCallSites` (2.42304.0 -> 3.6556.2: CT -> pj, DT -> vj, ET -> gj, hT -> ZA,
// nv / rv / iv -> sb / lb / ub; turn tail c1ebb1aa4 Rt / Et / Bt -> c4ea84cb3 Br / Er / Y, which now also carries
// closingMessageFollows / planCutShort; c227f4d5e Iq / Pq -> D1 / T1, z$ -> A5; xY -> c96d752d0 eH; cc43287c9 Mte -> the
// npe / ope mount, the next row now cf74bc599 EpitaxyTurnNextActionsRow = cccc2cf0a cj over ZA).
// R4g-turnbox TB-1 (transcript-turn-box, tasks-06a): extract the 2.42304.0 Code session turn box without executing any
// desktop runtime (decision D0: own generator, own output folder src/generated/turn-box, own
// scripts/verify-gen-turn-box.mjs).
//
//   turn-box.mjs      cccc2cf0a CT (memo, exported g; cf74bc599 re-exports it as EpitaxyTurnBox, cc43287c9 `gte` mounts
//                     it): the turn box shell. ET is the card (epitaxy-root, fade-in, inset ring, hidden while it holds
//                     no visible li / button / p), TT finishes the entry animation of a session seen before (ST) when
//                     the card reappears without a response in between, wT reports through ResizeObserver whether the
//                     [data-turn-next] row is shown (onCardShownChange → scope store turnCardShown). DT is the todo card
//                     (window of xT = 12 around the open step via c26f8455e r, "Plan from before your last message",
//                     "# earlier steps", "# more to go", the running-tasks line OT, the side-session row bT / yT), hidden
//                     by `[&:has(+[data-turn-next]_p:not([hidden]_p))]:hidden` (and the visible-button variant) whenever
//                     the next row shows. nv / rv / iv: the plan snapshot (rv: null, stale "prompt" / "compaction",
//                     working false after the turn) over the turn tail. hT (memo, exported _; cf74bc599
//                     EpitaxyNextActionsRow, cc43287c9 `bte`): the next-actions row with its helpers gT / _T / vT / mT /
//                     fT / pT and rT / iT (setAvailableNextActions on the LocalSessions bridge).
//   turn-tail.mjs     c1ebb1aa4 Rt / Et / Bt (the pure derivation N_ = Wt runs over the session messages: wrapUp, plan,
//                     planBeforeWrapUp, planTouchedThisTurn, planTurnEnded, compactedSincePlan, turnSettled,
//                     agentsRunning, workedWithoutWrapUp, proposedTaskIds) and Ke / G / Ge (M_ / P_ / A_, the dismissed
//                     next-row memory hT reads and writes).
//   epitaxy-session.mjs  c227f4d5e Iq / Pq (whether a session hosts the turn box: Pq(e) || presets && e != null; cc43287c9
//                     `Na=db(tr)`), xY (a wrap-up send chip), tE / QO (composer ownership and draft signal), the chip
//                     command runners FW / PW / RW / zW and NW (the enabled commands).
//   …                 and the small originals those read (todo list cb6930dae Lu, spinner shared-frame Zs, owner window
//                     shared-25 pp / up, c26f8455e r, c96d752d0 QX / gat, cd4f82e77 chip text, cb27dab29 wrap-up parsing,
//                     c06cf64bb / c7d4a4512 / c8479260c / shared-104 / shared-52 message predicates, …), each chunk's
//                     slice in a module of its own.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. A module's bindings are the
// reachable closure of the roots: a declaration's dependencies are its free variables (each declaration is parsed on its
// own and Babel's scope analysis names what it reads from outside), which are the chunk's top-level bindings it uses.
// An import is followed into the chunk it names, so the closure crosses chunks; every chunk it may enter is listed in
// `modules` (one generated module per chunk: the roots it exports under semantic names, plus the bindings other
// generated modules import from it under their original names). An import resolves, in this order, to: a named host
// adapter in src/source-turn-box-adapters.jsx (its original declaration must carry `features`), a verified React export
// of vendor-frame, a semantic public name of the shared view-tabs graph (D1/D24: CdsButton, CdsIcon, cdsClassNames), or
// the declaration in a listed chunk. A declaration of a listed chunk that view-tabs already publishes is imported from
// view-tabs too. Anything else stops generation, so a renamed or re-pointed minified import fails instead of silently
// binding the wrong value. The generated modules must not import each other in a cycle.
//
// `callSites` pin the original text the host wiring follows but cannot import (prettier form of a named top-level
// declaration); `rawCallSites` pin minified bytes, each exactly once: where cc43287c9 mounts the turn box (3.6556.2: `fs=Mo&&
// Za&&!Wt&&!er,ps=fs&&cs,ms=fs&&Hn!==null&&si`, the slot Ade, turnCardShown), cf74bc599's transcript-tail slot
// (turnBoxSlotEl) and re-exports, the presets gate behind Na and Yr, and the main-process per-session turnBox and wrap_up
// gate (GrowthBook 2371478310: on in this host, electron/turn-plan-adapters.mjs). `importPins` check the minified names those pins use.
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
const { referenceVersion, referenceSnapshot, looseFeature } = official;
const source = official.ionSource;
const mainSource = official.asarSource;
const output = path.join(root, 'src/generated/turn-box');
const adapterModule = '../../source-turn-box-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// E34: no other generated area imports the turn box (session-rail / session-rail-context are 3.6556.2 and slice their own
// copies), so the manifest carries no legacy view and the generator writes no legacy names (w10-ccres-turnbox removed the
// dormant spec.legacy / legacyFeatures branch); scripts/turn-box-compat.mjs hands a 3.6556.2 consumer this manifest.
// R2/E5: a feature with minified names goes through looseFeature() ({loose}); {in, has} pins the root through a reader in
// the same chunk (`@@` stands for the root's own local), for declarations too short to tell apart on their own.
const loose = text => ({ loose: text });

// R3: vendor-frame re-exports React; an alias is accepted only as official.reactAliases names it (a top-level
// `local=<namespace>.<member>`, `Oo` the react/compiler-runtime `c` factory; official.assertVendorAlias).
const vendor = { [official.vendorFrame]: official.reactAliases };

// Host dependencies (checked first). `local` is the declaration the export alias must still name; `features` must appear
// in that declaration's prettier form, and `also` pins further declarations of the same chunk the adapter stands for.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  [official.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: [loose('return (Mt(e), e);')], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: [loose('var Gt = c(Wt, Ut);')], also: { Wt: ['p = i({ id: o, description: s, defaultMessage: c }, l, { ignoreTag: f });'] } },
  },
  // c4ea84cb3 Wr (exported n; xy in cccc2cf0a): the turn tail derived from the session's messages (c06cf64bb sD
  // snapshot), its TaskCreate todos (c1dad0703 Fe) and the running agents (cea7057eb le), with turnBoxAtReplies (QV). The
  // host's turns are Codex turns, not SDK messages: TurnBoxHost.turnTail (TB-2, turn/plan/updated) answers; no host →
  // the official empty Er.
  'c4ea84cb3-rXGDAnKH.js': {
    n: { name: 'useTurnTail', local: 'Wr', features: [loose('n = Ht(e?.id ?? null),'), loose('{ todos: i } = Sn(r ? null : e),'), loose('n.length === 0 ? Er : Ur(n, t, r ? void 0 : i, a, o),'), loose('return v(s, Y);')] },
  },
  // c06cf64bb X (exported wt): a selector over the session's bucket (pj reads compactionStatus). Here TurnBoxHost.bucket.
  'c06cf64bb-CdJdJuVd.js': {
    wt: { name: 'useSessionBucket', local: 'X', features: [loose('() => t(e === null ? void 0 : J(e))'), loose('() => t(void 0)')] },
  },
  // shared-11: the desktop's request store (V_: sessions with an unanswered request or an offered background task; P_:
  // this session waits on one; L_ / F_: ZA's pending / in-turn requests) and the presets gate (gc, D10: on).
  'shared-11-_AVGLHEz.js': {
    ar: { name: 'useAttentionSessionIds', local: 'V_', features: ['for (let e in t.requestsBySession) {', 'a.status === "pending" &&'] },
    ur: { name: 'useSessionAwaitsRequest', local: 'P_', features: [loose('let n = e === void 0 ? void 0 : t.requestsBySession[e];'), loose('return n ? Object.values(n).some(D_) : !1;')],
      also: { D_: ['e.status === "pending" &&', '!e.outOfTurn &&', '(!e.demoted || e.promiseResolvers !== void 0)'] } },
    nr: { name: 'useSessionHasPendingRequest', local: 'L_', features: [loose('return n ? Object.values(n).some(R_) : !1;')], also: { R_: ['return e.status === "pending";'] } },
    lr: { name: 'useSessionRequestInTurn', local: 'F_', features: [loose('let n = e === null ? void 0 : t.requestsBySession[e];'), loose('return n ? Object.values(n).some(I_) : !1;')],
      also: { I_: ['!e.outOfTurn &&', '(e.status === "resolving" || (e.status === "pending" && !e.answerFailed))'] } },
    us: { name: 'usePresetsGate', local: 'gc', features: [loose('return L(hc);')], also: { hc: ['hc = "claudeai_cc_epitaxy_session_presets_main"'] } },
  },
  // shared-8 og (exported Df): the desktop's sessions store (ub / lj look for side sessions spawned from this one).
  'shared-8-Db1QN4mf.js': {
    Df: { name: 'useSessionsStore', local: 'og', features: ['sessions: [],', 'name: "ccd-sessions-filter",'] },
  },
  // c26fb8b6b xn (exported o): open a session (cmd-click popout, alt-click pane, else navigate).
  'c26fb8b6b-B7Friu61.js': { o: { name: 'useOpenSession', local: 'xn', features: ['entryPoint: "cmd_click",', 'useOpenLinkedSession: the route built for a linked session does not parse as a session route'] } },
  // shared-46 YI (exported $; 2.42304.0 shared-19 L5): a session row and its status (starting / working / needs_you / …).
  'shared-46-BIbZBGFq.js': { $: { name: 'useSessionStatus', local: 'YI', features: [loose('let a = e !== void 0 && n.has(e);'), loose('{ session: r, state: i }')] } },
  // shared-78 lD (exported Y_): the link props of a session (href for middle-click / copy link).
  // W12c (#27): shared-78 W (exported vb; ui in shared-46): the desktop's appFeatures store (zustand, seeded from
  // window.desktopBootFeatures). shared-46 aL reads `ui.getState().appFeatures?.nestedArchiveKeepsFamily` only for an
  // "archive" family walk, which sL's cL never asks for. Only cowork-scheduled slices W, unexported; here the host's value.
  'shared-78-D5Fw2h0a.js': { Y_: { name: 'useSessionLinkProps', local: 'lD', features: [loose('t = cD();'), loose('ye(t(e))')] },
    vb: { name: 'appFeaturesStore', local: 'W', features: [loose('var W = U;')],
      also: { U: ['appFeatures: cC(),', 'resolution: "pending",'], cC: ['window.desktopBootFeatures ?? null'] } } },
  // c5da7eb42: mv (exported Hr) the main process marked the session turnBox (index.chunk-DNPOm2Zc `turnBoxEnabled:n.bd()&&…
  // turnBoxMounted`, GrowthBook 2371478310); Cv (exported Ur; w1's Em) the same flag, or for a session the store does not
  // hold yet its row query; QI (exported et): a session query (ZA reads lastActivityAt / createdAt).
  'c5da7eb42-XijZdwf1.js': {
    Hr: { name: 'useSessionTurnBoxFlag', local: 'mv', features: ['t.sessions.some((t) => t.sessionId === e && t.turnBox === !0),', 'typeof e == "string" &&'] },
    Ur: { name: 'useSessionTurnBoxDrawn', local: 'Cv', features: [loose('i = mv(r ? e : null),'), loose('return i || o;')] },
    et: { name: 'useSessionQuery', local: 'QI', features: ['n?.passive ?? !1,', 'n?.enabled ?? !0,'] },
  },
  // c227f4d5e: the desktop services ZA reaches — the tasks pane opener (mQ), the create-PR / archive runners (qZ / KZ) and
  // the dismiss telemetry (O5). The chip row A5 (exported r) and the turn observer T5 (exported a) are generated.
  'c227f4d5e-B-FYKrwT.js': {
    Kn: { name: 'useOpenTasksPane', local: 'mQ', features: ['openTasksPaneAtTask: r,', '"task_chip"'] },
    sr: { name: 'useCreatePrRunner', local: 'qZ', features: [loose('{ sessionRef: t, sessionRepo: n, branchNotPushed: r } = e,'), loose('{ fireCreateMode: i, busy: a } = iB(')] },
    ar: { name: 'useArchiveRunner', local: 'KZ', features: [loose('{ sessionRef: t, sessionType: n, afterRemoval: r } = e,'), loose('{ archiveSession: a, isArchiving: o } = wx(i),')] },
    i: { name: 'logNextRowDismissed', local: 'O5', features: [loose('let { turnOrdinal: n, msSinceTurnEnd: r } = D5(e, t.session_id);'), 'ms_since_turn_end: r'] },
  },
  // c6d21d103 d (exported t; 2.42304.0 c227f4d5e NR): start a new session (split pane: a new code pane, else the landing).
  'c6d21d103-JCKleZiK.js': { t: { name: 'useStartNewSession', local: 'd', features: ['f = d?.runnerPool,', loose('s({ plainLanding: f === void 0 }),'), '"page_control"'] } },
  // c68c4283d: the flint telemetry (mp shown / hp clicked / gp evaluated / _p outcome) and the per-message / per-session
  // turn ordinals it reads (ft / dt); nothing is sent (D17). ccbc7e432 j: the card's ⌘↩ / Esc chords. c2c1ed18b n: an
  // account check that shows the abundant_waffle label override (no account, D17). shared-1 xE / SE: the pane-hidden
  // store (the desktop's default is {hidden:false}; the host mounts no hidden-pane provider).
  'c68c4283d-CWbOoVxS.js': {
    C: { name: 'logChipsShown', local: 'mp', features: ['("claudeai.desktop.code.flint.shown", e);'] },
    b: { name: 'logChipClicked', local: 'hp', features: ['Z("claudeai.desktop.code.flint.clicked", e);'] },
    x: { name: 'logRulesEvaluated', local: 'gp', features: ['Z("claudeai.desktop.code.flint.evaluated", e);'] },
    S: { name: 'logChipOutcome', local: '_p', features: ['Z("claudeai.desktop.code.flint.outcome", e);'] },
    o: { name: 'messageTurnOrdinal', local: 'ft', features: [loose('return T.get(e);')] },
    s: { name: 'sessionTurnOrdinal', local: 'dt', features: [loose('return ut.get(e);')] },
  },
  'ccbc7e432-DXuvQ274.js': { t: { name: 'useChipChords', local: 'j', features: [loose('{ enabled: M, cardRootRef: N, escapeOnly: P, armKey: F } = j,'), loose('L = j.yieldWhenOffScreen === !0,')] } },
  'c2c1ed18b-BGGmHSxk.js': { t: { name: 'useAccountFlag', local: 'n', features: [loose('n = e()?.account;')] } },
  'shared-1-BJhqMmkf.js': {
    Tc: { name: 'usePaneHiddenStore', local: 'xE', features: [loose('return x(yE);')] },
    xc: { name: 'onPaneHiddenChange', local: 'SE', features: ['e.hidden !== n.hidden && t(e.hidden);'] },
  },
  // shared-25: fs (exported Yh) a GrowthBook flag (ZA: `__gb__1785002156`; D29/D31: off); Z (exported zr) the account.
  'shared-25-DOWZRSlq.js': {
    Yh: { name: 'useGrowthBookFlag', local: 'fs', features: [loose('.on;')] },
    zr: { name: 'useCurrentAccount', local: 'Z', features: ['Error("Must call inside CurrentAccountProvider"),'] },
  },
  // c73f45bc3: Sg (exported Dt; Sh in cccc2cf0a) the rule chip evaluation (create_pr / archive / new_session /
  // reconnect_connector / correct_slash_command over PR, git and connector state); jl (exported _r) what happens after
  // the session is removed.
  'c73f45bc3-B7hbL7H9.js': {
    Dt: { name: 'useNextActionRules', local: 'Sg', features: ['firingKnown:', 'namedFallback:'] },
    _r: { name: 'useAfterSessionRemoved', local: 'jl', features: [loose('{ sessionId: t, onSessionRemoved: n } = e,')] },
  },
  // c6b8adeaf Xa (exported g): sendWithOutcome for a send surface (ZA: "flint").
  'c6b8adeaf-bLEQVSWL.js': { g: { name: 'useSendWithOutcome', local: 'Xa', features: ['"epitaxy: send stopped, the page switched organizations"', 'tags: { source: "send_with_outcome", send_surface: t },'] } },
  // shared-52 cB (exported ha): the ErrorsProvider (addError / addWarning / clearToast). Here the host toasts.
  'shared-52-uHFNjl7C.js': { ha: { name: 'useErrors', local: 'cB', features: ['Error("Must be called within ErrorsProvider")'] } },
  // c19e90103 Ux (exported t): the epitaxy Markdown a todo's content is rendered with (cb6930dae Ld). Here the host's
  // inline runs (source-user-text.jsx), as the plan checklist renders a step.
  'c19e90103-BQFzF8EA.js': { t: { name: 'TodoMarkdown', local: 'Ux', features: ['T = l === void 0 ? "epitaxy" : l,', 'isStreaming: n,'] } },
  // c96d752d0 QV (exported ir; `as` in cccc2cf0a, N in c4ea84cb3): appFeatures.turnBoxAtReplies. The 3.6556.2 main
  // process reports it supported (index.chunk-jPKPzV-P JU `turnBoxAtReplies:RU`, `RU={status:"supported"}`).
  // c96d752d0 JX (exported nn; ls in cccc2cf0a) is not an adapter any more (W12b, w11-sweep-ccres #31): see `external`.
  'c96d752d0-CWv_7-n9.js': {
    ir: { name: 'useTurnBoxAtReplies', local: 'QV', features: [loose('return ma(mLe);')], also: { mLe: ['e.appFeatures?.turnBoxAtReplies?.status === "supported"'] } },
  },
};

// One generated module per chunk the closure may enter. `exports` maps original local binding -> exported name (the
// roots; `features` pins each to strings of its original prettier-formatted text). Bindings other generated modules
// import from a chunk are exported under their original names as well.
const modules = [
  { target: 'define-messages.mjs', source: official.vendorIntl },
  // owner-window.mjs / spinner.mjs: 3.6556.2 view-tabs publishes these roots (ownerWindow, getResizeObserverClass,
  // CdsSpinner), so they are re-exported from there (D1, never a second copy). R4: the files and names stay. No other
  // generated area imports the turn box any more (session-rail slices its own shared-25 UH / DG since W5; session-rail-
  // context its own Spinner), so no E34 legacy names are written (tests/turn-box-compat.test.mjs pins importers = []).
  { target: 'owner-window.mjs', source: 'shared-25-DOWZRSlq.js',
    exports: { gf: 'ownerResizeObserver', pf: 'ownerWindowOrNull' },
    features: { gf: ['?.ResizeObserver ?? globalThis.ResizeObserver'], pf: ['e.ownerDocument)?.defaultView ?? null'] }, },
  { target: 'visible-window.mjs', source: 'c26f8455e-YuRMuTDz.js',
    exports: { o: 'visibleTodoWindow' },
    features: { o: ['hiddenBefore: a,', 'openAfter: s.length - c(s),', 'hiddenCompleted: c(e) - c(o),', 'e.status === "completed"'] } },
  { target: 'spinner.mjs', source: official.sharedFrame,
    exports: { Ac: 'Spinner' },
    features: { Ac: ['"data-cds": "Spinner",'] } },
  { target: 'find-omitted.mjs', source: 'shared-15-BvlV43cI.js' },
  { target: 'todo-list.mjs', source: 'cb6930dae-Dw_4c1QI.js',
    exports: { Ld: 'TodoList' },
    features: { Ld: ['"epitaxy-markdown-inherit-color min-w-0 flex-1",', 'flex flex-col gap-xs text-body select-text'] } },
  { target: 'keyboard-event.mjs', source: 'shared-8-Db1QN4mf.js' },
  { target: 'transcript-parts.mjs', source: 'c96d752d0-CWv_7-n9.js',
    exports: { SY: 'TURN_BOX_SPINNER_CLASS', Lot: 'TurnDismissButton', eH: 'wrapUpSendChip' },
    features: {
      SY: ['"motion-safe:[&>span:last-child]:animate-[spin_1.6s_linear_infinite]"'],
      Lot: ['"data-turn-dismiss": "",', 'defaultMessage: "Dismiss",', 'text-muted-as-secondary hover:text-primary', 'Math.round(performance.now() -'],
      eH: ['source: "model",', 'kind: "send",', 'key: `wrap:'],
    } },
  { target: 'session-messages.mjs', source: 'shared-104-CTONUSaz.js' },
  { target: 'wrap-up.mjs', source: 'cb27dab29-B4WyL7_M.js',
    exports: { Ee: 'wrapUpWantsAction' },
    features: { Ee: ['let t = e.next?.actions.some((e) => e.kind !== "action" || e.action !== "new_session");', 'return e.blocked || t === !0;'] } },
  { target: 'session-status.mjs', source: 'shared-46-BIbZBGFq.js',
    exports: { UI: 'sessionStateMessages', HI: 'sessionStateDotClass', sL: 'archiveHeldBack' },
    // W12c (w12b-turnbox-ls #27): sL (exported L; He in c73f45bc3 Sg, `He(t.sessions,e.id)` → archiveHeldBack): the session
    // is not idle (ZI over the store row), holds an auto-archive hold, or its side-session family cannot go with it (cL).
    // source-turn-box-adapters.jsx useNextActionRules calls it over TurnBoxHost.sessions (the rows carry the ZI fields).
    features: { UI: ['needs_you: { defaultMessage: "Needs input", id: "CD9YaN3oTh" },'], HI: ['needs_you: "bg-fill-warning",'],
      sL: [loose('let n = e.find((e) => e.sessionId === t);'), loose('return n === void 0 || !ZI(n) || n.autoArchiveHold !== void 0 || cL(e, t);'),
        { in: 'ZI', has: '!e.loops?.length &&' }, { in: 'ZI', has: '!e.isStarred &&' }, { in: 'ZI', has: '!e.hasBackgroundActivity &&' },
        { in: 'ZI', has: '!e.pendingToolPermissions?.length &&' }] } },
  { target: 'session-title.mjs', source: 'shared-156-BLTosN8U.js' },
  { target: 'strip-markup.mjs', source: 'shared-2-TF8v67kg.js' },
  { target: 'shared-0.mjs', source: 'shared-0-DDOOdL6P.js' },
  { target: 'shared-1.mjs', source: 'shared-1-BJhqMmkf.js' },
  { target: 'shared-11.mjs', source: 'shared-11-_AVGLHEz.js' },
  { target: 'shared-16.mjs', source: 'shared-16-ByfgAyLr.js' },
  { target: 'shared-26.mjs', source: 'shared-26-CGuBxVt9.js' },
  { target: 'shared-52.mjs', source: 'shared-52-uHFNjl7C.js' },
  { target: 'shared-78.mjs', source: 'shared-78-D5Fw2h0a.js' },
  { target: 'session-type.mjs', source: 'c68c4283d-CWbOoVxS.js' },
  { target: 'send-failed-message.mjs', source: 'ccdfebff6-BKPtxzql.js' },
  { target: 'message-predicates.mjs', source: 'c06cf64bb-CdJdJuVd.js' },
  { target: 'mcp-tool-names.mjs', source: 'c8479260c-D5Ma9EoG.js' },
  // 3.6556.2: the chip row's fit-to-width helpers (c1607bc8b), the shared per-window width observer (ce574895a), the
  // sidechain message check (shared-18) and the context-marker stripping of a prompt (cb0636f7b).
  { target: 'chip-fit.mjs', source: 'c1607bc8b-DMU3EHDg.js' },
  { target: 'width-observer.mjs', source: 'ce574895a-sBAnWI9w.js' },
  // shared-18 QE (exported hc; er in c73f45bc3): a GitHub pull request URL. Sg reads it for prOnGithub and conflictPr;
  // source-turn-box-adapters.jsx useNextActionRules (Sg over the host) calls it.
  { target: 'shared-18.mjs', source: 'shared-18-D3y8YMFN.js',
    exports: { QE: 'isPullRequestUrl' },
    features: { QE: ['URL.parse(e)?.pathname ?? ""', '\\/pull\\/\\d+(?:\\/|$)/.test('] } },
  { target: 'context-markers.mjs', source: 'cb0636f7b-jouCT0V2.js' },
  { target: 'chip-text.mjs', source: 'cd4f82e77-CAMIsQ30.js',
    exports: { gt: 'evaluateNextActionRules', ht: 'firingNextActionRules', xt: 'keepShownChips', St: 'retireShownChips', yt: 'chipStateKey', ct: 'namedRuleChip',
      ft: 'pullRequestRuleState', F: 'prStateEndsSession', Pt: 'commandLabelAvailable', Rt: 'chipRowLabelAvailable', Ge: 'NEXT_ACTION_RULE_ORDER', I: 'NEXT_ACTION_RULES' },
    features: {
      gt: [loose('if (e.isResponding) return H;'), loose('let r = B(n, e.commands);')],
      ht: [loose('.filter((t) => P[t].fires(e))')],
      xt: ['memory: d ? e : { id: t, chips: l, onScreen: c, pendingAfterRetirement: s },'],
      St: ['chips: e.pendingAfterRetirement,'],
      yt: ['.sort()'],
      ct: ['if (!t.isResponding)', loose('? (B("create_pr", t.commands) ?? void 0)')],
      ft: ['? "unknown"', loose(': (ie(e.state) ?? "none");')],
      F: ['return e === "open" || e === "draft" || e === "queued" || e === "merged";'],
      Pt: ['if (t === "new_session") return !0;', 'countLabel: r'],
      Rt: [{ loose: 'return W(e, Et);', keep: ['Et'] }, { in: 'Et', has: '"hlf4y0"' }],
      Ge: ['"correct_slash_command",', '"abundant_waffle",', '"new_session",'],
      I: ['fires: (e) => (e.connectorsTouchedLastTurn ?? 0) >= 1,', 'e.idleOnReturn === !0 && e.archiveHeldBack !== !0'],
    } },
  { target: 'next-action-memory.mjs', source: 'c73f45bc3-B7hbL7H9.js',
    exports: { xg: 'useIdleOnReturn', Yp: 'emptyRuleMemory', Xp: 'advanceRuleMemory', $p: 'markRulePainted', em: 'markRuleUsed', nm: 'markVerifySent',
      rm: 'markSlashCorrectionUsed', qp: 'STREAK_RULES', Dg: 'NO_CHIPS' },
    features: {
      xg: ['`${e}:${t}`', '!d.getState().hidden && Date.now() - r >= yg * 6e4 && o(i);'],
      Yp: [loose('streaks: { commit: Fd, create_pr: Fd, verify: Fd },')],
      Xp: ['commitIgnoredIfWrote: t.wroteUncommitted'],
      $p: ['return !n.shown && (n.usedAt === void 0 || n.usedAt !== e.turnKey)'],
      em: [loose('{ ...i, usedAt: n }')],
      nm: ['let r = { ...e, verifySentAt: t, verifySentTurn: n };'],
      rm: ['{ ...e, slashCorrectionUsedAt: t };'],
      qp: ['["commit", "create_pr", "verify"]'],
      Dg: ['Object.freeze([])'],
    } },
  { target: 'epitaxy-session.mjs', source: 'c227f4d5e-B-FYKrwT.js',
    exports: { D1: 'canHostTurnBox', T1: 'sessionHasTurnBox', mE: 'useIsOwnComposer', Gk: 'useComposerSignal', GZ: 'chipCommandSendsMessage',
      WZ: 'runChipCommand', JZ: 'useDialogRunner', YZ: 'useSlashCorrectionRunner', UZ: 'useEnabledCommands', A5: 'NextActionChipRow',
      Tk: 'useOffersBackgroundTask' },
    // R4: wrapUpSendChip moved to c96d752d0 (eH); this target keeps exporting it.
    reexports: { wrapUpSendChip: 'transcript-parts.mjs' },
    features: {
      // W12b (w11-sweep-ccres #29): Tk (exported Oc; Go in c73f45bc3 Sg, `P=Go(e?.type==="local"?r??void 0:void 0)`): the
      // session's backgroundTaskSuggestions hold an unanswered offer (Ek). It reads the sessions store (shared-8 Df, the
      // TurnBoxHost.sessions adapter); source-turn-box-adapters.jsx useNextActionRules (Sg's body) calls it for P.
      Tk: [loose('(t) => e !== void 0 && t.sessions.find((t) => t.sessionId === e)?.backgroundTaskSuggestions?.some(Ek) === !0,'), loose('return of(t);')],
      D1: [loose('let t = w1(e),'), loose('return t || (n && e != null);')],
      T1: ['e?.type === "local"', loose('return dm(e?.id) && e?.type === "local";')],
      mE: ['let n = e.current?.getEditor()?.view.dom ?? null;'],
      Gk: ['e.readOutsideRender, e.readOutsideRender', 'return e.subscribe((e) => {'],
      GZ: ['return t.command !== void 0 && e[t.command]?.sendsMessage === !0;'],
      WZ: ['return n !== void 0 && !n.busy && n.run(t) ? "command" : "none";'],
      JZ: ['run: () => (e ? (e(), !0) : !1),'],
      YZ: ['(e.setText(`/${n} `), e.submit() ? !0 : (e.clear(), !1))', 'e.isBashMode() || e.hasDraft()'],
      UZ: [loose('.filter((n) => e[n] === !0 && Dh(t, n))'), loose('new Set(r)')],
      A5: ['"cmd+enter"', 'composerHoldsDraft'],
    } },
  { target: 'turn-tail.mjs', source: 'c4ea84cb3-rXGDAnKH.js',
    exports: { Br: 'deriveTurnTail', Er: 'EMPTY_TURN_TAIL', Y: 'turnTailEqual', Sr: 'useTurnNextDismissal', wr: 'useDismissedWrapUpCalls',
      xr: 'rememberTurnNextDismissal', Ar: 'TASK_TOOL_NAMES' },
    features: {
      Br: ['plan: n.length > 0 ? n : null,', 'closingMessageFollows', 'planCutShort'],
      Er: ['wrapUp: null,', 'closingMessageFollows: !1,', 'planCutShort: !1,', 'planBeforeWrapUp: null,', 'agentsRunning: 0,', 'proposedTaskIds: Object.freeze([]),'],
      Y: ['e.closingMessageFollows === t.closingMessageFollows', 'e.planCutShort === t.planCutShort &&'],
      Sr: [loose('() => K.get(e) ?? null'), loose('return i(vr.subscribe, t, Cr);')],
      wr: [loose('e === null ? gr : (br().get(e) ?? gr)'), loose('return i(vr.subscribe, t, Tr);')],
      xr: ['t.keepsQuestionOut && t.callId !== null', loose('(K.delete(e), K.set(e, t), K.size > mr)')],
      Ar: ['new Set(["TodoWrite", "TaskCreate", "TaskUpdate"])'],
    } },
  { target: 'turn-box.mjs', source: 'cccc2cf0a-DhZC33Gc.js',
    exports: { pj: 'TurnBox', vj: 'TurnBoxTodos', gj: 'TurnBoxCard', mj: 'useTurnNextShown', hj: 'finishEntryAnimation', dj: 'TODO_WINDOW',
      fj: 'shownTurnBoxSessions', xj: 'RunningTasksLine', uj: 'TodoSessionRow', lj: 'useSideSessionId', sb: 'turnBoxPlan', lb: 'planSnapshot',
      ub: 'usePlanSessionsParked', cj: 'TurnNextActionsRow', sj: 'useProposalsPending', ZA: 'NextActionsRow', QA: 'DismissibleLine', $A: 'ruleChipPrompt', ej: 'blockedPrompt', XA: 'wrapUpTelemetryKind',
      JA: 'isAppActionChip', YA: 'isPromptRule', zA: 'useAvailableNextActions', BA: 'publishAvailableNextActions' },
    features: {
      pj: ['nextStepOnly: o,', 'spacedByHost: s,', '"data-turn-next": "",',
        'p-4 [&:not(:has(button:not([hidden]_button):not([data-turn-dismiss]_button),p:not([hidden]_p)))]:hidden', '"motion-safe:animate-step-in"', loose('agentsRunning: f.working ? 0 : y,')],
      vj: ['"flex flex-col gap-1 p-4 [&:has(+[data-turn-next]_button:not([hidden]_button):not([data-turn-dismiss]_button))]:hidden [&:has(+[data-turn-next]_p:not([hidden]_p))]:hidden",',
        'defaultMessage: "Plan from before your last message",', 'id: "l1PWymZINI",', '"{count, plural, one {# earlier step} other {# earlier steps}}",',
        '"{count, plural, one {# more to go} other {# more to go}}",', 'mutedDone: !0,', 'unpadded: !0,'],
      gj: ['epitaxy-root motion-safe:animate-fade-in text-body text-primary break-words overflow-clip rounded-card shadow-[inset_0_0_0_1px_var(--cds-ring-color)]',
        'mt-[var(--chat-turn-gap,15px)]', '[&:not(:has(li:not([hidden]_li),'],
      mj: ['let e = n.offsetHeight > 0;', 'a.observe(n, { box: "border-box" }),', '(a.disconnect(), r && t(!1));'],
      hj: ['n instanceof t &&', 'n.finish();'],
      dj: [{ in: 'vj', loose: 'Bg(t, @@)' }, '= 12'],
      fj: [{ in: 'gj', loose: 'n = @@.has(t)' }, '= new Set()'],
      xj: ['"{count, plural, one {# running task} other {# running tasks}}",', 'turn_box'],
      uj: ['defaultMessage: "Open session {name} ({state})",', 'id: "gOjlODkpSi",', '"shrink-0 text-muted-as-secondary"', 'mt-0.5 block min-w-0 truncate text-caption text-secondary', 'kind === "ssh"'],
      lj: ['n.spawnedFrom?.sideSession === !0 &&'],
      sb: ['e?.type === "local" ? e.id : void 0, r.plan', { in: 'pj', loose: 'f = @@(t, n, r)' }],
      lb: ['stale: !1, working: !1', '"compaction"', '"prompt"', 'planCutShort'],
      ub: ['t.spawnedFrom?.sideSession === !0 &&', 't.starting === !0'],
      // cj (exported g; cf74bc599 EpitaxyTurnNextActionsRow, cc43287c9 ope): ZA over the turn tail it reads itself (xy), the
      // wrap-up _m shows and sj's count of the turn's proposals still pending.
      cj: [loose('({ turnHasPendingSuggestion: n, ...t } = e)'), loose('} = xy(t.sessionRef, t.latestPromptId),'), loose('d = sj(t.sessionRef.id, l),'),
        loose('f = J2($, 3, n, r) ? K2($, 3, n, r, _m(r, n)) : $[5],'), loose('p = s > 0;'), 'proposalsPending: d,', 'agentRunning: p,', 'wrapUpCallId: i,'],
      sj: ['if (e === null || t.length === 0) return 0;', '?.backgroundTaskSuggestions ?? [],', 'e.autoStart !== "cloud" &&', 'e.accepted !== !0 &&', loose('n = ls(e ?? void 0),')],
      ZA: ['correct_slash_command:', 'create_pr: !0,', 'new_session: !0,', 'uniqueKey: "flint-prefill-blocked"', '"flint"', 'turnHasPendingSuggestion', 'closingMessageFollows'],
      QA: ['"flex min-w-0 items-start gap-sm",'],
      $A: ['defaultMessage: "A connector this session uses needs to reconnect.",'],
      ej: ['defaultMessage: "Claude is waiting on you. Pick a reply or type your own.",'],
      XA: ['? "none_after_work"', '? "recap_only"'],
      JA: ['return e.ruleId !== void 0 &&', { loose: 'vm(e.ruleId)', keep: ['vm'] }],
      YA: [{ loose: 'return !vm(e);', keep: ['vm'] }],
      zA: ['a === "" ? [] : a.split(",")', loose('BA(i, void 0)')],
      BA: [loose('let n = ce?.setAvailableNextActions;')],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'cc43287c9-Me-M2ucD.js', binding: 'Ade', role: 'The turn box slot: slotEl = turnBoxSlotEl (cf74bc599 transcript tail), placeable once the slot exists or the inline probe mounted (host: TB-3 slot)',
    features: [loose('r = Qd(e, jde),'), loose('s = r !== null || (i === e && !n);'), '{ slotEl: r, placeable: s, probeRef: o }'] },
  { source: 'c4ea84cb3-rXGDAnKH.js', binding: 'Ur', role: 'Wr caches the derivation per message array before Br runs (host: TurnBoxHost.turnTail, TB-2)',
    features: [loose('let o = Br(e, t, n, r, i);')] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  { source: 'cc43287c9-Me-M2ucD.js', role: 'npe / ope: the lazily loaded EpitaxyTurnBox and EpitaxyTurnNextActionsRow (cf74bc599 cj, which reads the turn tail itself) of the session view entry',
    features: ['{Component:npe}=qc({entry:nc,pick:e=>e.EpitaxyTurnBox,options:{loading:Vc("usually-renders-nothing")},overlayHost:"EpitaxySessionScopeBody.EpitaxyTurnBox"})',
      '{Component:ope}=qc({entry:nc,pick:e=>e.EpitaxyTurnNextActionsRow,options:{loading:Vc("usually-renders-nothing")},overlayHost:"EpitaxySessionScopeBody.EpitaxyNextActionsRow"})'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Mount condition: Mo (Oee = D1: the session hosts the turn box) && Za (composer shown) && !isPlanApproval && !isReadOnly, placed once the slot is placeable; the next row also needs si (IP = presets)',
    features: ['Mo=Oee(Hn)', '{slotEl:ss,placeable:cs,probeRef:ds}=Ade(Rn,os),fs=Mo&&Za&&!Wt&&!er,ps=fs&&cs,ms=fs&&Hn!==null&&si', 'si=IP()', 'e=>Rn.setState({turnCardShown:e})'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'The session view mounts the turn box with the next row as its child, portalled into the slot when there is one, else inline (the hidden probe span ds)',
    features: ['p("span",{hidden:!0,ref:ds})', 'p(npe,{sessionRef:Hn,isResponding:Si||na,latestPromptId:Lo,onCardShownChange:Io,children:ms?p(ope,{sessionRef:Hn,isSsh:an?.remote?.kind==="ssh",composerRef:ie,eligible:Za,hidden:ci,overlayBusy:qi,onSessionRemoved:en,openSessionMcpDialog:ar,turnHasPendingSuggestion:Vo,latestPromptId:Lo,hasComposerDraft:bt,ownsShortcuts:ln,hasComposerPopup:xt,composerHasText:Ro,composerHasAttachments:zo,onQuestionWithheld:Ho},`${Hn.id}:next-actions`):null},`${Hn.id}:turn-box`);return p(Kf.Provider,{value:ir,children:ss?N(e,ss):e})'] },
  { source: 'cf74bc599-CRYqipWN.js', role: 'The transcript does not mount the box: it re-exports pj / cj and hands the transcript tail element to the scope store (Fv onElement → turnBoxSlotEl)',
    features: ['kr as EpitaxyTurnBox', 'Or as EpitaxyTurnNextActionsRow', 'e=>r.setState({turnBoxSlotEl:e})'] },
  { source: 'c227f4d5e-B-FYKrwT.js', role: 'Oee / D1: presets is on the OR side that opens the turn box (w1 || presets && session); T1 the per-session flag over a local session',
    features: ['function D1(e){let t=w1(e),n=Op();return t||n&&e!=null}', 'function T1(e){return dm(e?.id)&&e?.type==="local"}', 'D1 as in', 'T1 as rn', 'us as Op', 'Hr as dm'] },
  { source: 'shared-11-_AVGLHEz.js', role: 'Op / ui = gc: the claudeai_cc_epitaxy_session_presets_main gate (D10: on)',
    features: ['var hc="claudeai_cc_epitaxy_session_presets_main";function gc(){return L(hc)}', 'gc as us'] },
  { source: 'c73f45bc3-B7hbL7H9.js', role: 'IP = Pp: the next row mounts under the same presets gate', features: ['function Pp(){return ui()}', 'Pp as Pt', 'us as ui'] },
  // W12c (#27): Sg's archiveHeldBack (ne) for a local session is the sessions store (Jr = shared-8 Df) selecting shared-46
  // sL (He) over its rows once the session is idle on return with a PR state that ends it; source-turn-box-adapters.jsx
  // useNextActionRules follows it.
  { source: 'c73f45bc3-B7hbL7H9.js', role: 'Sg: archiveHeldBack = Jr(t => local && idle on return && $i(p) ? He(t.sessions, id) : undefined) for a local session (host: useNextActionRules te)',
    features: ['e?.type==="local"&&U===!0&&$i(p)?He(t.sessions,e.id):void 0', 'te=Jr(ee),ne=e?.type==="local"?te:p!=="merged"'] },
  { source: 'shared-46-BIbZBGFq.js', role: 'He = L = sL (generated session-status.mjs archiveHeldBack)', features: ['sL as L'] },
  { source: 'c5da7eb42-XijZdwf1.js', role: 'dm = mv: the per-session turnBox flag the main process sets', features: ['mv as Hr'] },
  { main: true, source: 'index.chunk-DNPOm2Zc.js', role: 'Main process: a session reports turnBoxEnabled only behind n.bd() (GrowthBook 2371478310) and once its box mounted',
    features: ['turnBoxEnabled:n.bd()&&this.sessions.get(e)?.turnBoxMounted===!0'] },
  { main: true, source: 'index.chunk-DBIg6EBr.js', role: 'Main process: bd = st, the GrowthBook gate of mcp__ccd_turn__wrap_up (turn-plan-adapters growthBookOn: on in this host)',
    features: ['function st(){return t.m0("2371478310")}', 'var qe="ccd_turn",Je="wrap_up"'] },
];
// The minified names the raw pins use, resolved through the importing chunk's import statement.
const importPins = [
  { source: 'cc43287c9-Me-M2ucD.js', from: './c227f4d5e-B-FYKrwT.js', names: { in: 'Oee' } },
  { source: 'cc43287c9-Me-M2ucD.js', from: './c73f45bc3-B7hbL7H9.js', names: { Pt: 'IP' } },
  { source: 'cf74bc599-CRYqipWN.js', from: './cccc2cf0a-DhZC33Gc.js', names: { h: 'kr', g: 'Or' } },
  { source: 'c73f45bc3-B7hbL7H9.js', from: './shared-46-BIbZBGFq.js', names: { L: 'He' } },
  { source: 'c73f45bc3-B7hbL7H9.js', from: './shared-8-Db1QN4mf.js', names: { Df: 'Jr' } },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
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
// Features are matched on the prettier form with all whitespace and trailing commas dropped, so a line break prettier
// puts in a long call does not matter.
const normalised = text => text.replace(/\s+/g, '').split(',)').join(')').split(',]').join(']').split(',}').join('}').replace(/,$/, '');
// A feature is a string (matched whitespace-normalised), {loose[, keep]} (official.looseFeature) or {in: X, has|loose}:
// the top-level declaration X of the same chunk carries it, `@@` standing for the root's own local (kept literal).
async function assertFeatures(label, text, features = [], { src = null, local = null } = {}) {
  const flat = normalised(text);
  const missing = [];
  for (const f of features) {
    if (typeof f === 'string') { if (!text.includes(f) && !flat.includes(normalised(f))) missing.push(f); continue; }
    let subject = text;
    const keep = [...(f.keep ?? [])];
    let pattern = f.loose ?? f.has;
    if (f.in !== undefined) {
      const entry = src?.top.get(f.in);
      if (!entry || entry.kind === 'import') { missing.push(f); continue; }
      subject = await featureText(src, entry);
      if (local) { pattern = pattern.split('@@').join(local); keep.push(local); }
    }
    const ok = f.loose !== undefined ? looseFeature(pattern, { keep }).test(subject) : subject.includes(pattern) || normalised(subject).includes(normalised(pattern));
    if (!ok) missing.push(f);
  }
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}${process.env.TURN_BOX_EXPLAIN ? `\n--- text ---\n${text}` : ''}`);
}
// R3: official.assertVendorAlias (top-level declaration of the React namespace; `Oo` the compiler-runtime factory).
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.code, alias, target);
  return target;
}
async function viewTabsPublic() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}
// One copy (3.6556.2, no ripple into the consumers): a declaration another generated 3.6556.2 area already slices, and
// that the session rail / rail context generators would otherwise start importing from the turn box instead of their
// current copy (their `slicedElsewhere` ranks the turn box first), is imported from that area's module. The module must hold
// the same original (same chunk, same binding, same declaration sha256) and export it; the import uses its export name.
const external = {
  'shared-25-DOWZRSlq.js#UH': { area: 'session-rail', target: 'stable-array.mjs' },
  'shared-25-DOWZRSlq.js#DG': { area: 'session-rail', target: 'stable-array.mjs' },
  'shared-78-D5Fw2h0a.js#w4': { area: 'session-rail', target: 'remote-target.mjs' },
  'shared-78-D5Fw2h0a.js#SG': { area: 'routines-shared', target: 'shared-78-D5Fw2h0a.mjs' },
  // W13 G11 (D1): shared-0 Pa (lazyInit) and AL (control/format character class) are routines-shared's shared-0 (no
  // imports, plain node); imported where used, so the turn box's shared-0 module neither cuts nor re-exports them.
  'shared-0-DDOOdL6P.js#Pa': { area: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs', direct: true },
  'shared-0-DDOOdL6P.js#AL': { area: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs', direct: true },
  // W12b (w11-sweep-ccres #31, D1): c96d752d0 JX (exported nn; cccc2cf0a `nn as ls`, read by cj's sj) subscribes to the zX
  // spawning store, which generated/proposal-group holds and the host spawner marks (WX / GX). That graph publishes JX as
  // useSpawningTaskIds (its manifest publicNames, a root of extract-proposal-group.mjs), so ls is imported from that copy:
  // one zX, and sj re-renders when a mark changes, as the original does. Imported where it is used (`direct`), so the turn
  // box's c96d752d0 module does not re-export it.
  'c96d752d0-CWv_7-n9.js#JX': { area: 'proposal-group', target: 'c96d752d0-CWv_7-n9.js', direct: true },
};
// An area module is named by `target` (turn-box style manifests) or, in a per-chunk area (proposal-group), by its source.
async function externalImport(file, name, src, entry, { area, target }) {
  const dir = path.join(root, 'src/generated', area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const module = manifest.modules.find(m => (m.target ?? path.basename(m.source)) === target);
  if (!module || path.basename(module.source) !== file || (module.referenceVersion ?? manifest.referenceVersion) !== referenceVersion)
    throw Error(`${area}/${target} is not the ${referenceVersion} slice of ${file}`);
  if (module.sourceSha256 !== undefined && module.sourceSha256 !== sha(src.bytes)) throw Error(`${area}/${target} was cut from other ${file} bytes`);
  const binding = module.bindings.find(b => (b.name ?? b) === name);
  if (!binding || binding.sha256 !== sha(declarationText(src, entry))) throw Error(`${area}/${target} does not hold the original ${file}#${name}`);
  const text = await fs.readFile(path.join(dir, target), 'utf8');
  if (module.sha256 !== undefined && module.sha256 !== sha(text)) throw Error(`${area}/${target} differs from its manifest; run its generator`);
  const names = [];
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) { const [local, as] = part.split(/\s+as\s+/); if (local === name) names.push(as ?? local); }
  if (names.length === 0) throw Error(`${area}/${target} does not export ${name}`);
  return { from: `../${area}/${target}`, name: names[0], kind: area };
}
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'NaN', 'undefined', 'Infinity', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'globalThis', 'crypto', 'performance', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'window', 'console',
  'navigator', 'queueMicrotask', 'Uint8Array', 'BigInt', 'URL']);

export async function extractTurnBox({ check = false, dryRun = false, explore = null } = {}) {
  const cache = new Map();
  const published = await viewTabsPublic();
  // R3: every React alias the closure may reach is checked when used; the compiler runtime up front.
  official.assertCompilerRuntime((await readSource(official.vendorFrame, cache)).code);
  const specs = new Map(modules.map(spec => [spec.source, { ...spec, exports: spec.exports ?? {} }]));
  // Per chunk: selected declarations, imports (local -> resolution) and the original names other modules import.
  const state = new Map([...specs.values()].map(spec => [spec.source, { spec, selected: new Map(), imports: new Map(), seen: new Set(), shared: new Set() }]));
  const add = async (file, name) => {
    const st = state.get(file);
    if (!st) throw Error(`the closure enters ${file}, which is not a listed chunk`);
    if (st.seen.has(name)) return;
    st.seen.add(name);
    const src = await readSource(file, cache);
    const entry = src.top.get(name);
    if (!entry) throw Error(`${st.spec.target}: unbound ${name}`);
    const target = st.spec.target;
    if (entry.kind === 'import') {
      const { file: depFile, alias } = entry, via = `${depFile}:${alias}`;
      const dep = await readSource(depFile, cache);
      const local = dep.exported.get(alias);
      if (!local) throw Error(`${target}: ${via} is not exported`);
      const adapter = adapters[depFile]?.[alias];
      if (adapter) {
        if (adapter.local !== local) throw Error(`${target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
        const original = dep.top.get(local);
        if (!original || original.kind === 'import') throw Error(`${target}: adapter ${via} (${local}) is not a declaration`);
        await assertFeatures(`${target}: adapter ${via} (${local})`, await featureText(dep, original), adapter.features, { src: dep, local });
        for (const [other, features] of Object.entries(adapter.also ?? {})) {
          const also = dep.top.get(other);
          if (!also || also.kind === 'import') throw Error(`${target}: adapter ${via} pins ${other}, which is not a declaration of ${depFile}`);
          await assertFeatures(`${target}: adapter ${via} (${other})`, await featureText(dep, also), features, { src: dep, local: other });
        }
        st.imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
        return;
      }
      const react = vendorImport(depFile, alias, dep);
      if (react) { st.imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
      const shared = published.get(`${depFile}#${local}`);
      if (shared) { st.imports.set(name, { from: `../view-tabs/${depFile}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
      const direct = external[`${depFile}#${local}`];
      if (direct?.direct) {
        const dentry = dep.top.get(local);
        if (!dentry || dentry.kind === 'import') throw Error(`${target}: ${via} (${local}) is not a declaration of ${depFile}`);
        st.imports.set(name, { ...(await externalImport(depFile, local, dep, dentry, direct)), via, original: local });
        return;
      }
      const owner = state.get(depFile);
      if (!owner && explore) {
        explore.push(`${target}: ${name} = ${via} (${local}) :: ${(await featureText(dep, dep.top.get(local))).slice(0, 400).replace(/\n\s*/g, ' ')}`);
        st.imports.set(name, { from: adapterModule, name: `EXPLORE_${local}`, via, kind: 'adapter', original: local });
        return;
      }
      if (!owner) throw Error(`${target}: unresolved import ${via} (${local}); ${depFile} is not a listed chunk`);
      const dentry = dep.top.get(local);
      if (dentry?.kind === 'import') throw Error(`${target}: ${via} (${local}) is a re-export; follow it in ${depFile}'s own import`);
      await add(depFile, local);
      st.imports.set(name, { from: `./${owner.spec.target}`, name: null, chunk: depFile, local, via, kind: 'generated' });
      return;
    }
    const shared = published.get(`${file}#${name}`);
    if (shared && !Object.hasOwn(st.spec.exports, name)) {
      st.imports.set(name, { from: `../view-tabs/${file}`, name: shared.name, via: `${file}#${name}`, kind: 'view-tabs', original: name });
      return;
    }
    const outside = external[`${file}#${name}`];
    if (outside && !Object.hasOwn(st.spec.exports, name)) {
      st.imports.set(name, { ...(await externalImport(file, name, src, entry, outside)), via: `${file}#${name}`, original: name });
      return;
    }
    if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${target}: unsupported declaration ${name}`);
    const text = declarationText(src, entry);
    if (/\bimport\s*\(/.test(text)) throw Error(`${target}: dynamic import inside ${name}`);
    st.selected.set(name, entry);
    for (const dep of declarationDeps(src, name)) await add(file, dep);
  };
  for (const st of state.values()) {
    const src = await readSource(st.spec.source, cache);
    for (const name of Object.keys(st.spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${st.spec.target}: root ${name} is not a declaration of ${st.spec.source}`);
      await assertFeatures(`${st.spec.target}: root ${name}`, await featureText(src, entry), st.spec.features?.[name], { src, local: name });
      // D1: a root the shared view-tabs graph publishes is re-exported from there (one CDS copy), not sliced again.
      const shared = published.get(`${st.spec.source}#${name}`);
      if (shared) { st.imports.set(name, { from: `../view-tabs/${st.spec.source}`, name: shared.name, via: `${st.spec.source}#${name}`, kind: 'view-tabs', original: name }); st.seen.add(name); continue; }
      await add(st.spec.source, name);
    }
  }
  // Name what each generated import binds: the root's semantic name, else the original local (exported as such).
  const exportName = (chunk, local) => {
    const owner = state.get(chunk);
    if (Object.hasOwn(owner.spec.exports, local)) return owner.spec.exports[local];
    owner.shared.add(local);
    return local;
  };
  for (const st of state.values()) for (const entry of st.imports.values()) if (entry.kind === 'generated') entry.name = exportName(entry.chunk, entry.local);
  const unused = [...state.values()].filter(st => st.selected.size === 0 && st.imports.size === 0).map(st => st.spec.source);
  if (unused.length) throw Error(`listed chunks the closure never enters: ${unused.join(', ')}`);
  // Module order: a generated module after the modules it imports; a cycle stops generation.
  const order = [], mark = new Map();
  const visit = (chunk, trail) => {
    if (mark.get(chunk) === 'done') return;
    if (mark.get(chunk) === 'open') throw Error(`generated modules import each other: ${[...trail, chunk].join(' -> ')}`);
    mark.set(chunk, 'open');
    for (const entry of state.get(chunk).imports.values()) if (entry.kind === 'generated' && entry.chunk !== chunk) visit(entry.chunk, [...trail, chunk]);
    mark.set(chunk, 'done');
    order.push(chunk);
  };
  for (const spec of modules) visit(spec.source, []);

  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-turn-box.mjs', adapterModule: 'src/source-turn-box-adapters.jsx',
    modules: [], callSites: [], importPins: [],
  };
  const files = {};
  for (const chunk of order) {
    const st = state.get(chunk), { spec } = st;
    const src = await readSource(chunk, cache);
    const decls = [...st.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = decls.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exported = [...Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)),
      ...[...st.shared].sort().filter(local => !Object.hasOwn(spec.exports, local))];
    const exportText = exported.length ? `export { ${exported.join(', ')} };` : '';
    const reexportText = Object.entries(spec.reexports ?? {}).map(([name, from]) => `export { ${name} } from "./${from}";`).join('\n');
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${chunk}; generated by extract-turn-box.mjs.\n// Edit the extractor or src/source-turn-box-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n${reexportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: chunk, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: decls.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports, sharedExports: [...st.shared].sort(),
      ...(spec.reexports ? { reexports: spec.reexports } : {}),
    });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    await assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features, { src, local: site.binding });
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  const raw = new Map();
  const rawBytes = async (dir, name) => {
    const key = `${dir}/${name}`;
    if (!raw.has(key)) raw.set(key, await fs.readFile(path.join(dir, name)));
    return raw.get(key);
  };
  for (const site of rawCallSites) {
    const bytes = await rawBytes(site.main ? mainSource : source, site.source);
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.main ? `main/${site.source}` : site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  for (const pin of importPins) {
    const text = (await rawBytes(source, pin.source)).toString();
    const statements = [...text.matchAll(/import\{([^}]*)\}from"([^"]+)"/g)].filter(m => m[2] === pin.from);
    if (statements.length !== 1) throw Error(`import pin ${pin.source}: ${statements.length} imports from ${pin.from}, expected 1`);
    const specifiers = new Map(statements[0][1].split(',').map(s => s.split(' as ')).map(([imported, local]) => [imported, local ?? imported]));
    for (const [imported, local] of Object.entries(pin.names))
      if (specifiers.get(imported) !== local) throw Error(`import pin ${pin.source}: ${pin.from} ${imported} is ${specifiers.get(imported)}, expected ${local}`);
    manifest.importPins.push({ source: pin.source, from: pin.from, names: pin.names });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (dryRun) {
    // Nothing written.
  } else if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Turn box output set changed: ${present.join(',')}. Run scripts/extract-turn-box.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Turn box source mismatch: ${name}. Run scripts/extract-turn-box.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} turn box modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites, ${manifest.importPins.length} import pins).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractTurnBox({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
