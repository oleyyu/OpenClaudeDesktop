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
// declaration); `rawCallSites` pin minified bytes, each exactly once: where cc43287c9 mounts the turn box (Mte: `lo=Na&&
// da&&!tn&&!on,uo=lo&&so,fo=lo&&tr!==null&&Yr`, the slot O5, turnCardShown), cf74bc599's transcript-tail slot
// (turnBoxSlotEl) and re-exports, the presets gate behind Na and Yr, and the main-process per-session turnBox and wrap_up
// gate (GrowthBook 2371478310, D29: off in this host). `importPins` check the minified names those pins use.
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
const mainSource = path.resolve(root, '../reference', referenceSnapshot, 'asar/.vite/build');
const output = path.join(root, 'src/generated/turn-box');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-turn-box-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    yo: ['react', 'useLayoutEffect'], oo: ['react', 'memo'], Ja: ['react', 'Fragment'], eo: ['react', 'createContext'], do: ['react', 'useContext'],
    wo: ['react', 'useSyncExternalStore'], go: ['react', 'useId'], xo: ['react', 'useReducer'], co: ['react', 'startTransition'],
    io: ['react', 'isValidElement'], $a: ['react', 'cloneElement'], ro: ['react', 'forwardRef'], po: ['react', 'useDeferredValue'],
    vo: ['react', 'useInsertionEffect'], _o: ['react', 'useImperativeHandle'], To: ['react', 'useTransition'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'], Ca: ['react-dom', 'flushSync'],
  },
};

// Host dependencies (checked first). `local` is the declaration the export alias must still name; `features` must appear
// in that declaration's prettier form, and `also` pins further declarations of the same chunk the adapter stands for.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['var Gt = u(Wt, Ut);'], also: { Wt: ['p = r({ id: o, description: s, defaultMessage: c }, l, { ignoreTag: f });'] } },
  },
  // c1ebb1aa4 Wt (exported n; N_ in cccc2cf0a, $L in cc43287c9): the turn tail derived from the session's messages
  // (c06cf64bb G_ snapshot), its TaskCreate todos (_t) and the running agents (cea7057eb). The host's turns are Codex
  // turns, not SDK messages: TurnBoxHost.turnTail (TB-2, turn/plan/updated) answers; no host → the official empty Et.
  'c1ebb1aa4-c89yWBMH.js': {
    n: { name: 'useTurnTail', local: 'Wt', features: ['let n = B(e?.id ?? null),', '{ todos: i } = _t(r ? null : e),', '() => (n.length === 0 ? Et : Ut(n, t, r ? void 0 : i, a)),', 'return d(o, Bt);'],
      also: { _t: ['r = s(() => (n.length === 0 ? X : gt(n)), [n]);'] } },
  },
  // c06cf64bb Y (exported wt): a selector over the session's bucket (CT reads compactionStatus). Here TurnBoxHost.bucket.
  'c06cf64bb-BE5q2vSr.js': {
    wt: { name: 'useSessionBucket', local: 'Y', features: ['let n = d((t) => (e === null ? () => void 0 : Pg(e, t)), [e]);', '() => t(e === null ? void 0 : q(e)),', '() => t(void 0),'] },
  },
  // shared-11: the desktop's request store (Vm: sessions with an unanswered request or an offered background task; Im:
  // this session waits on one; Rm / Lm: hT's pending / in-turn requests) and the presets gate (Qo, D10: on).
  'shared-11-BuQ3CK5I.js': {
    Un: { name: 'useAttentionSessionIds', local: 'Vm', features: ['.filter((e) => e.isRunning)', 'a.status === "pending" &&', 'e.offer === !0 && e.toolUseId !== void 0 && e.accepted !== !0,'] },
    Jn: { name: 'useSessionAwaitsRequest', local: 'Im', features: ['let n = e === void 0 ? void 0 : t.requestsBySession[e];', 'return n ? Object.values(n).some(Am) : !1;'] },
    Bn: { name: 'useSessionHasPendingRequest', local: 'Rm', features: ['return n ? Object.values(n).some((e) => e.status === "pending") : !1;'] },
    qn: { name: 'useSessionRequestInTurn', local: 'Lm', features: ['!e.outOfTurn &&', '(e.status === "pending" && !e.answerFailed)),'] },
    do: { name: 'usePresetsGate', local: 'Qo', features: ['return N(Zo);'], also: { Zo: ['Zo = "claudeai_cc_epitaxy_session_presets_main"'] } },
  },
  // shared-8 Q (exported Wd): the desktop's sessions store (iv / yT look for side sessions spawned from this one).
  'shared-8-B5lJ8U5C.js': {
    Wd: { name: 'useSessionsStore', local: 'Q', features: ['sessions: [],', 'name: "ccd-sessions-filter",'] },
  },
  // c26fb8b6b xn (exported o): open a session (cmd-click popout, alt-click pane, else navigate).
  'c26fb8b6b-DfPeiuGP.js': { o: { name: 'useOpenSession', local: 'xn', features: ['let u = { kind: "code", id: l.id };', 'entryPoint: "cmd_click",'] } },
  // shared-19 L5 (exported xt): a session row and its status (starting / working / needs_you / done / failed / …).
  'shared-19-CkPOiIKm.js': { xt: { name: 'useSessionStatus', local: 'L5', features: ['return { session: t, state: F5(t, e !== void 0 && n.has(e), e) };'] } },
  // shared-78 wJ (exported ur): the link props of a session (href for middle-click / copy link).
  'shared-78-D6VXYXaQ.js': { ur: { name: 'useSessionLinkProps', local: 'wJ', features: ['return _(() => Ee(t(e)), [t, e]);'] } },
  // c5da7eb42: Xh (exported Er): the main process marked the session turnBox (index.chunk-CFJssAFf `jt=n.Au()&&…`,
  // GrowthBook 2371478310: off here); iM (exported Q): a session query (hT reads lastActivityAt / createdAt).
  'c5da7eb42-B8cTG8SI.js': {
    Er: { name: 'useSessionTurnBoxFlag', local: 'Xh', features: ['t.sessions.some((t) => t.sessionId === e && t.turnBox === !0),'] },
    Q: { name: 'useSessionQuery', local: 'iM', features: ['passive: n?.passive ?? !1,', 'enabled: n?.enabled ?? !0,'] },
  },
  // c227f4d5e: the desktop services hT reaches — the tasks pane opener (HW), the create-PR / archive / new-session
  // runners (LW / IW / NR) and the dismiss telemetry (L$). R4i-transcript TR1 (TB-4): the chip row z$ (exported i) and the
  // turn observer id P$ (exported o) are no longer adapters; z$ is generated with its closure (P$ included).
  'c227f4d5e-Ba-r--Rl.js': {
    nr: { name: 'useOpenTasksPane', local: 'HW', features: ['openTasksPaneAtTask: n,', 'a = Ph((e) => e.hasSidePanes) && i !== null,', 'return a ? s : null;'] },
    cr: { name: 'useCreatePrRunner', local: 'LW', features: ['sendsMessage: o !== "compose",', 'run: () => (i || !t ? !1 : (r(o), !0)),', 'createMode: o,'] },
    or: { name: 'useArchiveRunner', local: 'IW', features: ['(bh({ action: "archive", via: "flint", session_type: t }), r(), !0),'] },
    la: { name: 'useStartNewSession', local: 'NR', features: ['Cf({ plainLanding: !0 }),', 'Ja(e, t, Df() ? void 0 : "page_control", i),'] },
    a: { name: 'logNextRowDismissed', local: 'L$', features: ['let { turnOrdinal: n, msSinceTurnEnd: r } = I$(e, t.session_id);'] },
  },
  // R4i-transcript TR1 (TB-4): what the generated chip row z$ reaches outside the turn box. c68c4283d: the flint
  // telemetry (vf shown / yf clicked / bf evaluated / xf outcome) and the per-session turn ordinals it reads (at / it);
  // nothing is sent (D17). ccbc7e432 O: the card's ⌘↩ / Esc chords, enabled only for a `source:"model"` send chip
  // (wrapUp's next.actions, GrowthBook 2371478310, D29: off). c2c1ed18b i: an account check that shows the
  // abundant_waffle label override (no account, D17). shared-1 bw / yw: the pane-hidden store (the desktop's default
  // store hw() is {hidden:false}; the host mounts no hidden-pane provider). shared-frame Ya: the CDS layer's owner window
  // (the host renders no layer in another window; the same adapter as the proposal group's).
  'c68c4283d-CPuRD0vx.js': {
    C: { name: 'logChipsShown', local: 'vf', features: ['u("claudeai.desktop.code.flint.shown", e);'] },
    b: { name: 'logChipClicked', local: 'yf', features: ['Z("claudeai.desktop.code.flint.clicked", e);'] },
    x: { name: 'logRulesEvaluated', local: 'bf', features: ['Z("claudeai.desktop.code.flint.evaluated", e);'] },
    S: { name: 'logChipOutcome', local: 'xf', features: ['Z("claudeai.desktop.code.flint.outcome", e);'] },
    o: { name: 'messageTurnOrdinal', local: 'at', features: ['return w.get(e);'] },
    s: { name: 'sessionTurnOrdinal', local: 'it', features: ['return C.get(e);'] },
  },
  'ccbc7e432-DL0JgV8Z.js': { t: { name: 'useChipChords', local: 'O', features: ['let { enabled: k, cardRootRef: A, escapeOnly: j, armKey: M } = O,', 'P = O.yieldWhenOffScreen === !0,'] } },
  'c2c1ed18b-B9x2Hzna.js': { n: { name: 'useAccountFlag', local: 'i', features: ['return n(e?.account);'] } },
  'shared-1-CAAiD7E3.js': {
    oc: { name: 'usePaneHiddenStore', local: 'yw', features: ['return y(_w);'], also: { hw: ['return Js(() => ({ hidden: e }));'] } },
    nc: { name: 'onPaneHiddenChange', local: 'bw', features: ['e.hidden !== n.hidden && t(e.hidden);'] },
  },
  'shared-frame-BfjMqbuN.js': { mu: { name: 'useLayerOwnerWindow', local: 'Ya', features: ['return Ji(W(Oa));'] } },
  // shared-25: Zs (exported Th) a GrowthBook flag (hT: `__gb__1785002156`; D29/D31: off); Z (exported lr) the account.
  'shared-25-DP8p7i1Z.js': {
    Th: { name: 'useGrowthBookFlag', local: 'Zs', features: ['return Rs(I(e)).on;'] },
    lr: { name: 'useCurrentAccount', local: 'Z', features: ['Error("Must call inside CurrentAccountProvider"),'] },
  },
  // c73f45bc3: sm (exported Pt; Wm in cccc2cf0a) the rule chip evaluation (create_pr / archive / new_session /
  // reconnect_connector / correct_slash_command over PR, git and connector state); Ec (exported tr) what happens after
  // the session is removed.
  'c73f45bc3-CFrHin0p.js': {
    Pt: { name: 'useNextActionRules', local: 'sm', features: ['firingKnown: ia(i) !== void 0 && m !== "unknown",', 'namedFallback: He,'] },
    tr: { name: 'useAfterSessionRemoved', local: 'Ec', features: ['function Ec({ sessionId: e, onSessionRemoved: t }) {'] },
  },
  // c6b8adeaf ua (exported g): sendWithOutcome for a send surface (hT: "flint").
  'c6b8adeaf-C5Aww7gq.js': { g: { name: 'useSendWithOutcome', local: 'ua', features: ['"epitaxy: send stopped, the page switched organizations"', 'tags: { source: "send_with_outcome", send_surface: t },'] } },
  // shared-52 Sj (exported Ya): the ErrorsProvider (addError / addWarning / clearToast). Here the host toasts.
  'shared-52-DGviI8xb.js': { Ya: { name: 'useErrors', local: 'Sj', features: ['Error("Must be called within ErrorsProvider")'] } },
  // c19e90103 Ix (exported t): the epitaxy Markdown a todo's content is rendered with (cb6930dae Lu). Here the host's
  // inline runs (source-user-text.jsx), as the plan checklist renders a step.
  'c19e90103-muBq-gyt.js': { t: { name: 'TodoMarkdown', local: 'Ix', features: ['typography: s = "epitaxy",', 'isStreaming: t = !1,'] } },
};

// One generated module per chunk the closure may enter. `exports` maps original local binding -> exported name (the
// roots; `features` pins each to strings of its original prettier-formatted text). Bindings other generated modules
// import from a chunk are exported under their original names as well.
const modules = [
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js' },
  { target: 'owner-window.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { pp: 'ownerResizeObserver', up: 'ownerWindowOrNull' },
    features: { pp: ['return up(e)?.ResizeObserver ?? globalThis.ResizeObserver;'], up: ['return e ? ((lp(e) ? e : e.ownerDocument)?.defaultView ?? null) : null;'] } },
  { target: 'visible-window.mjs', source: 'c26f8455e-6gcaB95s.js', exports: { r: 'visibleTodoWindow' },
    features: { r: ['let n = e.findIndex((e) => e.status === "in_progress"),'] } },
  { target: 'spinner.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Zs: 'Spinner' }, features: { Zs: ['"data-cds": "Spinner",'] } },
  { target: 'find-omitted.mjs', source: 'shared-15-Cc9xvKlF.js' },
  { target: 'todo-list.mjs', source: 'cb6930dae-BD0W5ZM9.js', exports: { Lu: 'TodoList' },
    features: { Lu: ['`flex flex-col gap-xs text-body select-text ${r ? "" : "py-xs"}`', '"epitaxy-markdown-inherit-color min-w-0 flex-1",', 'o?.(e)'] } },
  { target: 'keyboard-event.mjs', source: 'shared-8-B5lJ8U5C.js' },
  { target: 'transcript-parts.mjs', source: 'c96d752d0-BOCqU7c2.js', exports: { QX: 'TURN_BOX_SPINNER_CLASS', gat: 'TurnDismissButton' },
    features: { QX: ['QX = "motion-safe:[&>span:last-child]:animate-[spin_1.6s_linear_infinite]"'],
      gat: ['"data-turn-dismiss": "",', 'defaultMessage: "Dismiss",', 'msSinceDrawn: i === null ? null : Math.round(performance.now() - i),'] } },
  { target: 'session-messages.mjs', source: 'shared-104-Cqo2-vQh.js' },
  { target: 'wrap-up.mjs', source: 'cb27dab29-_H2_XKli.js', exports: { Te: 'wrapUpWantsAction' },
    features: { Te: ['let t = e.next?.actions.some((e) => e.kind !== "action" || e.action !== "new_session");', 'return e.blocked || t === !0;'] } },
  { target: 'session-status.mjs', source: 'shared-19-CkPOiIKm.js', exports: { A5: 'sessionStateMessages', k5: 'sessionStateDotClass' },
    features: { A5: ['needs_you: { defaultMessage: "Needs input", id: "CD9YaN3oTh" },'], k5: ['needs_you: "bg-fill-warning",'] } },
  { target: 'session-title.mjs', source: 'shared-156-Bikz018e.js' },
  { target: 'strip-markup.mjs', source: 'shared-2-Cb74JByF.js' },
  { target: 'shared-0.mjs', source: 'shared-0-ByI5P0CP.js' },
  { target: 'shared-1.mjs', source: 'shared-1-CAAiD7E3.js' },
  { target: 'shared-11.mjs', source: 'shared-11-BuQ3CK5I.js' },
  { target: 'shared-16.mjs', source: 'shared-16-B0xHzPjj.js' },
  { target: 'shared-26.mjs', source: 'shared-26-CgdP_nTj.js' },
  { target: 'shared-52.mjs', source: 'shared-52-DGviI8xb.js' },
  { target: 'shared-78.mjs', source: 'shared-78-D6VXYXaQ.js' },
  { target: 'session-type.mjs', source: 'c68c4283d-CPuRD0vx.js' },
  { target: 'send-failed-message.mjs', source: 'ccdfebff6-DVy1BLjU.js' },
  { target: 'message-predicates.mjs', source: 'c06cf64bb-BE5q2vSr.js' },
  { target: 'transcript-rows.mjs', source: 'c7d4a4512-B5-cT4Zn.js' },
  { target: 'mcp-tool-names.mjs', source: 'c8479260c-DaoJ9_2S.js' },
  // R4i-transcript TR1 (TB-4): the rule table P and the pure evaluation sm runs over it (lt / V), the chip memory (pt / mt),
  // the state key (dt), the named fallback (rt), the PR state (ot) and the catalog checks (Ct per command label, Dt the row
  // label). The labels are `secret:` gated messages (shared-78 Pv) no shipped catalog carries.
  { target: 'chip-text.mjs', source: 'cd4f82e77-BZMvPH7p.js',
    exports: { lt: 'evaluateNextActionRules', V: 'firingNextActionRules', pt: 'keepShownChips', mt: 'retireShownChips', dt: 'chipStateKey',
      rt: 'namedRuleChip', ot: 'pullRequestRuleState', M: 'prStateEndsSession', Ct: 'commandLabelAvailable', Dt: 'chipRowLabelAvailable',
      We: 'NEXT_ACTION_RULE_ORDER', P: 'NEXT_ACTION_RULES' },
    features: {
      lt: ['if (e.isResponding) return H;', 'let r = B(n, e.commands);'], V: ['return We.filter((t) => P[t].fires(e));'],
      pt: ['a = i ? U(e.chips, n) : ft(U(H, n), r ? e.chips : H),', 'memory: d ? e : { id: t, chips: l, onScreen: c, pendingAfterRetirement: s },'],
      mt: ['chips: e.pendingAfterRetirement,'], dt: ['.sort()'], rt: ['if (!t.isResponding)', '? (B("create_pr", t.commands) ?? void 0)'],
      ot: ['? "unknown"', ': (ie(e.state) ?? "none");'], M: ['return e === "open" || e === "draft" || e === "queued" || e === "merged";'],
      Ct: ['if (t === "new_session") return !0;', 'return g(e.messages, n) && (r === void 0 || g(e.messages, r));'], Dt: ['return g(e.messages, ht);'],
      We: ['"correct_slash_command",', '"abundant_waffle",', '"new_session",'],
      P: ['fires: (e) => (e.connectorsTouchedLastTurn ?? 0) >= 1,', 'fires: (e) =>\n        M(e.prState) && e.idleOnReturn === !0 && e.archiveHeldBack !== !0,'],
    } },
  { target: 'pane-root.mjs', source: 'cae42d46f-8Va5mKUX.js' },
  // R4i-transcript TR1 (TB-4): the parts of c73f45bc3 sm (Pt, the useNextActionRules adapter) the host evaluation runs as
  // originals: om (idle on return: 60 minutes since the last activity, rechecked on focus / visibility), Id / Ld (the
  // per-session streak memory), Bd / Vd / Ud / Wd (painted / used / verify sent / slash correction used), cm (no chips).
  { target: 'next-action-memory.mjs', source: 'c73f45bc3-CFrHin0p.js',
    exports: { om: 'useIdleOnReturn', Id: 'emptyRuleMemory', Ld: 'advanceRuleMemory', Bd: 'markRulePainted', Vd: 'markRuleUsed', Ud: 'markVerifySent',
      Wd: 'markSlashCorrectionUsed', Pd: 'STREAK_RULES', cm: 'NO_CHIPS' },
    features: {
      om: ['let i = e === null || t == null ? null : `${e}:${t}`,', '!u.getState().hidden && Date.now() - r >= im * 6e4 && o(i);', '(r === null || Date.now() - r >= am * 6e4) && n();'],
      Id: ['streaks: { commit: Fd, create_pr: Fd, verify: Fd },'], Ld: ['commitIgnoredIfWrote: t.wroteUncommitted'],
      Bd: ['return !n.shown && (n.usedAt === void 0 || n.usedAt !== e.turnKey)'], Vd: ['return i.usedAt === n ? r : zd(r, t, { ...i, usedAt: n });'],
      Ud: ['let r = { ...e, verifySentAt: t, verifySentTurn: n };'], Wd: ['{ ...e, slashCorrectionUsedAt: t };'],
      Pd: ['Pd = ["commit", "create_pr", "verify"]'], cm: ['cm = Object.freeze([])'],
    } },
  { target: 'epitaxy-session.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: { Iq: 'canHostTurnBox', Pq: 'sessionHasTurnBox', xY: 'wrapUpSendChip', tE: 'useIsOwnComposer', QO: 'useComposerSignal',
      FW: 'chipCommandSendsMessage', PW: 'runChipCommand', RW: 'useDialogRunner', zW: 'useSlashCorrectionRunner', NW: 'useEnabledCommands',
      z$: 'NextActionChipRow' },
    features: {
      Iq: ['let t = Pq(e),', 'n = yf();', 'return t || (n && e != null);'], Pq: ['return cp(e?.id) && e?.type === "local";'],
      xY: ['key: `wrap:${t}`,', 'source: "model",', 'kind: "send",'],
      tE: ['let n = e.current?.getEditor()?.view.dom ?? null;'], QO: ['let n = W(Pe, e.readOutsideRender, e.readOutsideRender),'],
      FW: ['return t.command !== void 0 && e[t.command]?.sendsMessage === !0;'],
      PW: ['return n !== void 0 && !n.busy && n.run(t) ? "command" : "none";'],
      RW: ['run: () => (e ? (e(), !0) : !1),'],
      zW: ['(r.setText(`/${t} `), r.submit() ? !0 : (r.clear(), !1));'],
      NW: ['n = ye(hm.filter((n) => e[n] === !0 && fm(t, n)));'],
      z$: ['evaluation: i = d$,', 'k = w !== void 0 || sm(O),', '"aria-label": w ?? om(O),', 'shortcut: h.composerHoldsDraft ? void 0 : "cmd+enter"',
        ': t === "composer" && i.isResponding && W'],
    } },
  { target: 'turn-tail.mjs', source: 'c1ebb1aa4-c89yWBMH.js',
    exports: { Rt: 'deriveTurnTail', Et: 'EMPTY_TURN_TAIL', Bt: 'turnTailEqual', Ke: 'useTurnNextDismissal', G: 'useDismissedWrapUpCalls', Ge: 'rememberTurnNextDismissal',
      kt: 'TASK_TOOL_NAMES' },
    features: {
      Rt: ['plan: n.length > 0 ? n : null,', 'planBeforeWrapUp: de,', 'workedWithoutWrapUp: C && w === !0 && V === null,'],
      Et: ['wrapUp: null,', 'planBeforeWrapUp: null,', 'agentsRunning: 0,', 'proposedTaskIds: Object.freeze([]),'],
      Bt: ['zt(e.planBeforeWrapUp, t.planBeforeWrapUp) &&'],
      Ke: ['return u(W.subscribe, () => U.get(e) ?? null, () => null);'],
      G: ['return u(W.subscribe, () => (e === null ? H : (Ue().get(e) ?? H)), () => H);'],
      Ge: ['if ((U.delete(e), U.set(e, t), U.size > ze)) {'],
      kt: ['kt = new Set(["TodoWrite", "TaskCreate", "TaskUpdate"])'],
    } },
  { target: 'turn-box.mjs', source: 'cccc2cf0a-B0D--VZp.js',
    exports: { CT: 'TurnBox', DT: 'TurnBoxTodos', ET: 'TurnBoxCard', wT: 'useTurnNextShown', TT: 'finishEntryAnimation', xT: 'TODO_WINDOW', ST: 'shownTurnBoxSessions',
      OT: 'RunningTasksLine', bT: 'TodoSessionRow', yT: 'useSideSessionId', nv: 'turnBoxPlan', rv: 'planSnapshot', iv: 'usePlanSessionsParked',
      hT: 'NextActionsRow', gT: 'DismissibleLine', _T: 'ruleChipPrompt', vT: 'blockedPrompt', mT: 'wrapUpTelemetryKind', fT: 'isAppActionChip', pT: 'isPromptRule',
      rT: 'useAvailableNextActions', iT: 'publishAvailableNextActions' },
    features: {
      CT: ['nextStepOnly: a = !1,', 'spacedByHost: o = !1,', 'let s = nv(e, t, n),', '_ = (m > 0 && !lp(f)) || (t && (s !== null || !p)),',
        's !== null && !a', '"data-turn-next": "",', 'hidden: _,', '`p-4 [&:not(:has(button:not([hidden]_button):not([data-turn-dismiss]_button),p:not([hidden]_p)))]:hidden ${_ ? "" : "motion-safe:animate-step-in"}`,',
        'agentsRunning: s.working ? 0 : m,'],
      DT: ['let o = jh(e, xT),', '"flex flex-col gap-1 p-4 [&:has(+[data-turn-next]_button:not([hidden]_button):not([data-turn-dismiss]_button))]:hidden [&:has(+[data-turn-next]_p:not([hidden]_p))]:hidden",',
        't === "prompt"', 'defaultMessage: "Plan from before your last message",', 'id: "l1PWymZINI",', '"{count, plural, one {# earlier step} other {# earlier steps}}",',
        '"{count, plural, one {# more to go} other {# more to go}}",', 'mutedDone: !0,', 'spin: !t && n && !r,', 'spinnerClassName: xo,', 'unpadded: !0,'],
      ET: ['epitaxy-root motion-safe:animate-fade-in text-body text-primary break-words overflow-clip rounded-card shadow-[inset_0_0_0_1px_var(--cds-ring-color)]',
        '${n ? "" : "mt-[var(--chat-turn-gap,15px)]"}', 'let n = ST.has(e),'],
      wT: ['let e = n.offsetHeight > 0;', 'a.observe(n, { box: "border-box" }),', '(a.disconnect(), r && t(!1));'],
      TT: ['n instanceof t &&', 'n.finish();'], xT: ['xT = 12'], ST: ['ST = new Set()'],
      OT: ['let t = Us("turn_box"),', '"{count, plural, one {# running task} other {# running tasks}}",', 'onClick: () => t({ finished: !1 }),'],
      bT: ['defaultMessage: "Open session {name} ({state})",', 'id: "gOjlODkpSi",', 'isSsh: xn(a)?.kind === "ssh",'],
      yT: ['n.spawnedFrom?.sideSession === !0 &&'],
      nv: ['let r = N_(e, n);', 'return rv(r, t, iv(e?.type === "local" ? e.id : void 0, r.plan));'],
      rv: ['let c = s && t !== null ? t : e;', 'if (c === null || c.length === 0) return null;', 'return (s || a > 0) && n ? { todos: c, stale: !1, working: !1 } : null;',
        'return !n && l ? null : { todos: c, stale: n ? (i ? "compaction" : !1) : "prompt", working: !0 };'],
      iv: ['t.spawnedFrom?.sideSession === !0 &&', '(t.isRunning || t.starting === !0 || r.has(t.sessionId)),'],
      hT: ['re = Hs({', 'correct_slash_command: r,', 'reconnect_connector: s !== null,', 'create_pr: !0,', 'archive: W,', 'new_session: !0,',
        '} = Wm(r ? e : null, ie);', 'uniqueKey: "flint-prefill-blocked"', 'Em("flint")', 'primaryChord: N ? void 0 : R,', 'onDismiss: st'],
      gT: ['"flex min-w-0 items-start gap-sm",'], _T: ['defaultMessage: "A connector this session uses needs to reconnect.",'],
      vT: ['defaultMessage: "Claude is waiting on you. Pick a reply or type your own.",'], mT: ['? "none_after_work"', '? "recap_only"'],
      fT: ['return e.ruleId !== void 0 && cp(e.ruleId);'], pT: ['return !cp(e);'],
      rT: ['let r = e?.type === "local" ? e.id : null,'], iT: ['let n = ce?.setAvailableNextActions;'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'cc43287c9-DAfOi8yP.js', binding: 'O5', role: 'The turn box slot: slotEl = turnBoxSlotEl (cf74bc599 transcript tail), placeable once the slot exists or the inline probe mounted (host: TB-3 slot)',
    features: ['let n = tp(e, (e) => e.turnBoxSlotEl),', 'return { slotEl: n, placeable: n !== null || (r === e && !t), probeRef: a };'] },
  { source: 'c1ebb1aa4-c89yWBMH.js', binding: 'Ut', role: 'N_ caches the derivation per message array (Vt WeakMap, Ht entries) before Rt runs (host: TurnBoxHost.turnTail, TB-2)',
    features: ['let o = Rt(e, t, n, r);'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  { source: 'cc43287c9-DAfOi8yP.js', role: 'gte: the lazily loaded EpitaxyTurnBox of the session view entry (usually renders nothing while loading)',
    features: ['{Component:gte}=mc({entry:cs,pick:e=>e.EpitaxyTurnBox,options:{loading:Dc("usually-renders-nothing")},overlayHost:"EpitaxySessionScopeBody.EpitaxyTurnBox"})'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Mte mount condition: Na (db = Iq: the session hosts the turn box) && da (composer shown) && !isPlanApproval && !isReadOnly, placed once the slot is placeable; the next row also needs Yr (iN = presets)',
    features: ['Na=db(tr),Pa=pb(tr),Fa=A(e=>Zn.setState({turnCardShown:e}),[Zn])', '{slotEl:oo,placeable:so,probeRef:co}=O5(Zn,ao),lo=Na&&da&&!tn&&!on,uo=lo&&so,fo=lo&&tr!==null&&Yr', 'Yr=iN()'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Mte mounts CT with the next row as its child, portalled into the slot when there is one, else inline (the hidden probe span co)',
    features: ['v("span",{hidden:!0,ref:co}),uo&&tr?(()=>{let e=v(gte,{sessionRef:tr,isResponding:ui||zi,latestPromptId:Ia,onCardShownChange:Fa,children:fo?v(bte,{sessionRef:tr,isSsh:gn?.remote?.kind==="ssh",composerRef:de,eligible:da,hidden:Xr,overlayBusy:Mi,onSessionRemoved:pn,openSessionMcpDialog:hr,wrapUp:BO(La,Ka),wrapUpCallId:Ra,turnSettled:za,workedWithoutWrapUp:Va,latestPromptId:Ia,agentRunning:Ba>0,proposalsPending:Ua,hasComposerDraft:Tt,ownsShortcuts:bn,hasComposerPopup:Et,composerHasText:Wa,composerHasAttachments:Ga,onQuestionWithheld:qa},`${tr.id}:next-actions`):null},`${tr.id}:turn-box`);return v(tm.Provider,{value:mr,children:oo?g(e,oo):e})})():null'] },
  { source: 'cf74bc599-D9NZWRyl.js', role: 'The transcript does not mount CT: it re-exports it and hands the transcript tail element to the scope store (Kg onElement → turnBoxSlotEl)',
    features: ['Qn as EpitaxyTurnBox', 'qi=b(e=>n.setState({turnBoxSlotEl:e}),[n]),Ji=f(()=>u(Kg,{onElement:qi}),[qi])'] },
  { source: 'c227f4d5e-Ba-r--Rl.js', role: 'db / pb are Iq / Pq: presets is on the OR side that opens the turn box (Pq || presets && session)',
    features: ['function Iq(e){let t=Pq(e),n=yf();return t||n&&e!=null}', 'function Pq(e){return cp(e?.id)&&e?.type==="local"}', 'Iq as Yt', 'Pq as Zt', 'do as yf', 'Er as cp'] },
  { source: 'shared-11-BuQ3CK5I.js', role: 'yf / Wr = Qo: the claudeai_cc_epitaxy_session_presets_main gate (D10: on)',
    features: ['var Zo="claudeai_cc_epitaxy_session_presets_main";function Qo(){return N(Zo)}', 'Qo as do'] },
  { source: 'c73f45bc3-CFrHin0p.js', role: 'iN = yd: the next row mounts under the same presets gate', features: ['function yd(){return Wr()}', 'yd as Ht', 'do as Wr'] },
  { source: 'c5da7eb42-B8cTG8SI.js', role: 'cp = Xh: the per-session turnBox flag the main process sets', features: ['Xh as Er'] },
  { main: true, source: 'index.chunk-CFJssAFf.js', role: 'Main process: a session gets the turn box tools only behind n.Au() (GrowthBook 2371478310, D29: off here)',
    features: ['i.turnBox===!0&&U?.turnBox!==!1'] },
  { main: true, source: 'index.chunk-B5tintml.js', role: 'Main process: Au = ht, the GrowthBook gate of mcp__ccd_turn__wrap_up (D29: off; wrapUp / planBeforeWrapUp stay null)',
    features: ['function ht(){return t.LZ("2371478310")}', 'mcp__ccd_turn__wrap_up'] },
];
// The minified names the raw pins use, resolved through the importing chunk's import statement.
const importPins = [
  { source: 'cc43287c9-DAfOi8yP.js', from: './c227f4d5e-Ba-r--Rl.js', names: { Yt: 'db', Zt: 'pb' } },
  { source: 'cc43287c9-DAfOi8yP.js', from: './c73f45bc3-CFrHin0p.js', names: { Ht: 'iN' } },
  { source: 'cc43287c9-DAfOi8yP.js', from: './c1ebb1aa4-c89yWBMH.js', names: { n: '$L' } },
  { source: 'cf74bc599-D9NZWRyl.js', from: './cccc2cf0a-B0D--VZp.js', names: { g: 'Qn' } },
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
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}${process.env.TURN_BOX_EXPLAIN ? `\n--- text ---\n${text}` : ''}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.code))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
async function viewTabsPublic() {
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'NaN', 'undefined', 'Infinity', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'globalThis', 'crypto', 'performance', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'window', 'console',
  'navigator', 'queueMicrotask', 'Uint8Array', 'BigInt']);

export async function extractTurnBox({ check = false, dryRun = false } = {}) {
  const cache = new Map();
  const published = await viewTabsPublic();
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
        assertFeatures(`${target}: adapter ${via} (${local})`, await featureText(dep, original), adapter.features);
        for (const [other, features] of Object.entries(adapter.also ?? {})) {
          const also = dep.top.get(other);
          if (!also || also.kind === 'import') throw Error(`${target}: adapter ${via} pins ${other}, which is not a declaration of ${depFile}`);
          assertFeatures(`${target}: adapter ${via} (${other})`, await featureText(dep, also), features);
        }
        st.imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
        return;
      }
      const react = vendorImport(depFile, alias, dep);
      if (react) { st.imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
      const shared = published.get(`${depFile}#${local}`);
      if (shared) { st.imports.set(name, { from: `../view-tabs/${depFile}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
      const owner = state.get(depFile);
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
      assertFeatures(`${st.spec.target}: root ${name}`, await featureText(src, entry), st.spec.features?.[name]);
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
  const unused = [...state.values()].filter(st => st.selected.size === 0).map(st => st.spec.source);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${chunk}; generated by extract-turn-box.mjs.\n// Edit the extractor or src/source-turn-box-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
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
    });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
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
