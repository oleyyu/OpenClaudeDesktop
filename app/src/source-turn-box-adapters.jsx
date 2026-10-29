// Local services for the original Code session turn box that scripts/extract-turn-box.mjs emits
// (generated/turn-box/turn-box.mjs = cccc2cf0a pj / vj / ZA, generated/turn-box/turn-tail.mjs = c4ea84cb3 Br / Er,
// R4g-turnbox TB-1, transcript-turn-box / tasks-06a). 3.6556.2 migration (w2-tr-turn-cont): the generator reads 3.6556.2;
// the comments below name the 2.42304.0 declaration each adapter was first written against and, where it moved, the
// 3.6556.2 one (scripts/extract-turn-box.mjs `adapters` holds the feature pins). Each export replaces one import of the original, feature-checked by
// the extractor against the declaration it stands for.
//
// The host side of the turn box is one context, TurnBoxHost, provided where the box is mounted (TB-3; none yet):
//   turnTail(sessionRef, latestPromptId)  the c1ebb1aa4 N_ shape (TB-2: from the Codex turn/plan/updated steps)
//   bucket(sessionId)                     the session bucket fields CT reads ({compactionStatus})
//   awaitsRequest(sessionId)              the session waits on an approval / question (DT's spinner parks)
//   hasPendingRequest(sessionId), requestInTurn(sessionId)   hT's request checks
//   sessions                              the sessions store rows (shared-8 og): the side-session lookups (ub / lj),
//                                         cj's sj (the open session's backgroundTaskSuggestions queue) and Sg's sL
//                                         (the ZI fields of the open session and its side-session family, W12c #27)
//   archiveFactsKnown(sessionId)          the host has read the loops and monitors of the session's family
//   openSession(event, session), openTasksPane({taskId, finished}), startNewSession(event), archiveSession(sessionRef)
//   send({ref, text, uuid}) → Promise<boolean>   hT's "flint" send
// Without a host every service answers what the desktop answers for a session that has none of it: no tail (Et), no
// requests, no side sessions, nothing to open. Nothing here invents data.
//
// Gates (D10, D29 / D31): the presets gate is on (Na = Pq(e) || presets && e != null holds for any session); the
// per-session turnBox flag (main process `jt=n.Au()&&…`, GrowthBook 2371478310) is on (turn-plan: the ccd_turn tools);
// hT's GrowthBook flag (`__gb__1785002156`) is off.
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EMPTY_TURN_TAIL } from "./generated/turn-box/turn-tail.mjs";
import { evaluateNextActionRules, firingNextActionRules, keepShownChips, retireShownChips, chipStateKey, namedRuleChip,
  pullRequestRuleState, prStateEndsSession } from "./generated/turn-box/chip-text.mjs";
import { useIdleOnReturn, emptyRuleMemory, advanceRuleMemory, markRulePainted, markRuleUsed, markVerifySent, markSlashCorrectionUsed,
  STREAK_RULES, NO_CHIPS } from "./generated/turn-box/next-action-memory.mjs";
import { isPullRequestUrl } from "./generated/turn-box/shared-18.mjs";
import { useOffersBackgroundTask } from "./generated/turn-box/epitaxy-session.mjs";
import { archiveHeldBack } from "./generated/turn-box/session-status.mjs";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { SourceInlineRuns } from "./source-user-text.jsx";
import { useSourceToasts } from "./source-toast.jsx";

export const TurnBoxHost = createContext(null);
const EMPTY = Object.freeze([]);
const EMPTY_SET = new Set();
const noop = () => {};

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog.
//
// 3.6556.2 dropped the gating the 2.42304.0 row label went through: cd4f82e77 `U(e,t,n,r){return n()}` formats the
// defaultMessage and `W(e,t){return!0}` says every label is there, so the chip group label is Ft's "Suggested next
// actions" (sLHORPqF0i) and `Et="hlf4y0"` is only U's / W's unread argument; no generated turn-box module asks for
// `secret:hlf4y0` any more (w10-ccres-turnbox removed the host catalog that used to name it). The rule
// labels and prompts still go through shared-78 CG (`secret:<id>`, a missing one formats as " "), over the same catalog.
export function useIntl() {
  return useStartIntl();
}
export const FormattedMessage = StartMessage;

// c1ebb1aa4 Wt (exported n; N_ in cccc2cf0a): the turn tail from the session's SDK messages. The host's turns are Codex
// turns: TurnBoxHost.turnTail answers (TB-2); without it the original's empty tail (Et), as Wt returns for no messages.
export function useTurnTail(sessionRef, latestPromptId) {
  const host = useContext(TurnBoxHost);
  return (sessionRef && host?.turnTail?.(sessionRef, latestPromptId)) || EMPTY_TURN_TAIL;
}

// c06cf64bb Y (exported wt): a selector over the session's bucket; `t(void 0)` without one, as the original.
export function useSessionBucket(sessionId, selector) {
  const host = useContext(TurnBoxHost);
  return selector(sessionId === null || sessionId === undefined ? undefined : host?.bucket?.(sessionId));
}

// shared-11 Vm (exported Un): sessions with an unanswered request or an offered background task, read by iv for side
// sessions spawned from this one. The host spawns no side sessions (D29), so no id can match.
export function useAttentionSessionIds() {
  return useContext(TurnBoxHost)?.attentionSessionIds ?? EMPTY_SET;
}
// shared-11 Im (exported Jn): the session waits on a request (CT parks DT's spinner).
export function useSessionAwaitsRequest(sessionId) {
  const host = useContext(TurnBoxHost);
  return sessionId !== undefined && host?.awaitsRequest?.(sessionId) === true;
}
// shared-11 Rm / Lm (exported Bn / qn): hT's pending and in-turn request checks.
export function useSessionHasPendingRequest(sessionId) {
  const host = useContext(TurnBoxHost);
  return host?.hasPendingRequest?.(sessionId) === true;
}
export function useSessionRequestInTurn(sessionId) {
  const host = useContext(TurnBoxHost);
  return sessionId !== null && host?.requestInTurn?.(sessionId) === true;
}
// shared-11 Qo (exported do): claudeai_cc_epitaxy_session_presets_main. D10: the host takes the "on" branch.
export function usePresetsGate() {
  return true;
}

// shared-8 og (exported Df; 2.42304.0 Q / Wd): the sessions store, called with a selector over {sessions}. ub / lj look
// for side sessions spawned from this one; cj's sj reads the open session's backgroundTaskSuggestions.
export function useSessionsStore(selector) {
  const sessions = useContext(TurnBoxHost)?.sessions ?? EMPTY;
  return selector({ sessions });
}
// c96d752d0 JX (exported nn; ls in cccc2cf0a), the suggested tasks of a parent being started that sj skips, is no adapter
// (W12b, w11-sweep-ccres #31): the turn box imports generated/proposal-group's JX, the subscribing hook over the one zX
// store the host spawner marks (extract-turn-box.mjs `external`). The sessions above remain the proposal card's last
// committed list, read when the box renders; TurnBoxHost is rebuilt with the session list (useCodeTurnBoxHost deps).
// c26fb8b6b xn (exported o): open a session (event, {id, type, isSsh, title}).
export function useOpenSession() {
  return useContext(TurnBoxHost)?.openSession ?? noop;
}
// shared-19 L5 (exported xt): a session row and its status. bT asks only for a todo's side session, which a Codex plan
// step never names (TB-2 leaves `session` empty), so the row is undefined and bT shows the plain label.
export function useSessionStatus(sessionId) {
  const host = useContext(TurnBoxHost);
  const session = sessionId === undefined ? undefined : host?.sessionRow?.(sessionId);
  return { session, state: session === undefined ? "starting" : (host?.sessionState?.(sessionId) ?? "working") };
}
// shared-78 W (exported vb; ui in shared-46, W12c #27): the desktop's appFeatures store (zustand over
// window.desktopBootFeatures). The turn box reaches it only through shared-46 aL, which reads
// `ui.getState().appFeatures?.nestedArchiveKeepsFamily` for an "archive" family walk; sL's cL walks without one, so aL
// answers false before reading it. The host value is the 3.6556.2 main process's for that feature with GrowthBook off
// (index.chunk-jPKPzV-P `nestedArchiveKeepsFamily:{status:"unavailable"}`, D29 / D31).
const APP_FEATURES_STATE = Object.freeze({ appFeatures: Object.freeze({ nestedArchiveKeepsFamily: Object.freeze({ status: "unavailable" }) }) });
export function appFeaturesStore(selector) {
  return typeof selector === "function" ? selector(APP_FEATURES_STATE) : APP_FEATURES_STATE;
}
appFeaturesStore.getState = () => APP_FEATURES_STATE;
appFeaturesStore.subscribe = () => noop;
// shared-78 wJ (exported ur): a session's link props (href). The host has no session URLs.
export function useSessionLinkProps() {
  return EMPTY_PROPS;
}
const EMPTY_PROPS = Object.freeze({});

// c5da7eb42 Xh (exported Er): the main process marked the session turnBox (index.chunk-CFJssAFf `turnBoxEnabled:n.Au()&&…
// turnBoxMounted`). turn-plan: GrowthBook 2371478310 is on and every core is served the ccd_turn tools
// (electron/agent-tools/turn-plan.mjs), so every local session has it: Pq holds, hT publishes its app actions (rT) and
// reads the wrap-up.
export function useSessionTurnBoxFlag(sessionId) {
  return typeof sessionId === "string" && sessionId !== "";
}
// 3.6556.2 c5da7eb42 Cv (exported Ur; c227f4d5e w1's Em): the same flag, or for a session the desktop's store does not
// hold yet its row query (vd). The host has no such store: the flag above.
export function useSessionTurnBoxDrawn(sessionId) {
  return useSessionTurnBoxFlag(sessionId);
}
// 3.6556.2 c96d752d0 QV (exported ir): appFeatures.turnBoxAtReplies. The 3.6556.2 main process reports it supported
// (index.chunk-jPKPzV-P JU `turnBoxAtReplies:RU`, `RU={status:"supported"}`); ZA then filters reply chips with cd4f82e77 qe
// ("/", "!", invisible characters) instead of M (which also drops "@"), as the 3.6556.2 wrap_up description says.
export function useTurnBoxAtReplies() {
  return true;
}
// c5da7eb42 iM (exported Q; 3.6556.2 QI, exported et): a session query; hT selects agentId / startedByAccountId / lastActivityAt / createdAt.
export function useSessionQuery(sessionRef, select) {
  const host = useContext(TurnBoxHost);
  const row = sessionRef ? host?.sessionInfo?.(sessionRef) : undefined;
  return { data: row === undefined ? undefined : select(row) };
}

// c227f4d5e HW (exported nr): open the tasks pane at a task; null when the session has no side panes.
export function useOpenTasksPane() {
  return useContext(TurnBoxHost)?.openTasksPane ?? null;
}
// c227f4d5e LW (exported cr): the create-PR chip runner. create_pr is an app action (cb27dab29 we): with the presets
// gate on (`H=xs(e)`, D10) hT drops app-action rule chips from its row (`H?ae.filter(e=>!fT(e)):ae`), and the
// wrap-up actions that would carry it are off (D29), so it never runs.
const IDLE_RUNNER = Object.freeze({ busy: false, sendsMessage: false, run: () => false });
export function useCreatePrRunner() {
  return CREATE_PR;
}
const CREATE_PR = Object.freeze({ runner: IDLE_RUNNER, createMode: "create" });
// c227f4d5e IW (exported or): the archive chip runner over the host's archive.
export function useArchiveRunner({ sessionRef }) {
  const archive = useContext(TurnBoxHost)?.archiveSession;
  return useMemo(() => ({ busy: false, sendsMessage: false, run: () => (archive && sessionRef ? (archive(sessionRef), true) : false) }), [archive, sessionRef]);
}
// c227f4d5e NR (exported la; 3.6556.2 c6d21d103 d, exported t, called with {runnerPool}): start a new session.
export function useStartNewSession() {
  return useContext(TurnBoxHost)?.startNewSession ?? noop;
}
// c227f4d5e L$ (exported a): the next-row dismissal telemetry. Nothing is sent (D17).
export function logNextRowDismissed() {}

// shared-25 Zs (exported Th): a GrowthBook flag. D29 / D31: off in this host.
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function useGrowthBookFlag(flag) {
  if (hostGrowthBookFlag(flag)) return true;
  return false;
}
// shared-25 Z (exported lr): the signed-in account. The host has none (D17).
export function useCurrentAccount() {
  return NO_ACCOUNT;
}
const NO_ACCOUNT = Object.freeze({ account: null });

// 3.6556.2 c73f45bc3 Sg (exported Dt; Sh in cccc2cf0a ZA; 2.42304.0 sm / Pt): the rule chip evaluation (R4i-transcript
// TR1, TB-4). It is not sliced: Sg reads about twenty desktop services (the repo query Pi, the PR query Bi and its
// details zo, the diff stat ms, the worktree status ni, the reconnect state Ro, the turn summary _g, …) the host has
// none of. The evaluation itself is the original: generated/turn-box/chip-text.mjs evaluateNextActionRules (cd4f82e77
// gt, Sg's na), firingNextActionRules (ht / ra), keepShownChips / retireShownChips (xt / St), chipStateKey (yt / Qi),
// namedRuleChip (ct / ia), pullRequestRuleState (ft / aa), prStateEndsSession (F / $i); generated/turn-box/
// next-action-memory.mjs useIdleOnReturn (xg) and the streak memory (Yp / Xp / $p / em / nm / rm); generated/turn-box/
// shared-18.mjs isPullRequestUrl (QE, Sg's er). This adapter is Sg's own body (w10-ccres-turnbox compared it line for
// line) over what the host knows of the session, with the original's "nothing known" value where it does not:
//   s (repo)         Rn(e?.type, Yn(Pi(e).data) …): no host repo query, so null; l / u / f (a PR closed by the branch,
//                    Gi / tt) need it and stay off, so p = aa(c).
//   c (PR)           Bi(e, s); here the PR the host recorded on the session row (TurnBoxHost.pullRequest), else none
//                    known (`aa(void 0)` = "unknown"). g / b / ct read its url through er (QE) as the original does.
//   F (responding)   `(M&&!N)||n.isResponding===!0||P`: M = ko (a turn runs: TurnBoxHost.responding); N = Qs(r) (c06cf64bb
//                    BD over the session bucket's pendingTurn, which the host bucket has none of) && turnSettled, so
//                    false; P = Go (c227f4d5e Tk, generated epitaxy-session.mjs useOffersBackgroundTask, W12b): the local
//                    session's backgroundTaskSuggestions in the sessions store (TurnBoxHost.sessions, the proposal card's
//                    rows) hold an unanswered offer. The host queue holds spawn_task suggestions, never offers (D29), so
//                    it answers false, from the store the original reads.
//   U                xg(r, n.lastActivityAt, F), the original.
//   ne (held back)   a local session reads Jr(ee): `Jr(t=>local&&U===!0&&$i(p)?He(t.sessions,e.id):void 0)`, shared-46 sL
//                    (generated session-status.mjs archiveHeldBack, W12c #27) over the sessions store rows. The host
//                    rows (TurnBoxHost.sessions) carry the ZI fields the host keeps for the session and its side-session
//                    family (source-turn-box.jsx archiveHoldFields: a running turn, background tasks / monitors, pinned,
//                    keep awake, loops, pending requests). sL runs once the host has read every family member's loops
//                    and monitors (TurnBoxHost.archiveFactsKnown); before that it answers sL's "held back", as for a
//                    session it cannot find, so a looping or monitoring session is never called idle.
//   W (turn summary) _g(r, s): the last-turn summary of the desktop transcript bucket (lastTurnWroteFiles / Committed /
//                    Verified, lastTypedSlashPrompt, lastTurnFailedMcpTools, …). The host bucket has none: undefined, as
//                    the original returns for a session without a bucket. So commit / verify / correct_slash_command
//                    lack input, Ee is "" (no slash correction) and mt (the open turn's summary) is undefined.
//   re / J / de      Ro: the connectors to reconnect, asked only when reconnect_connector is an enabled command, which ZA
//                    makes it only with an MCP dialog to open (`reconnect_connector:c!==null`); the host opens none from
//                    here and the kernel reports no reconnect state, so no names, 0 touched, no target.
//   G (Kp)           abundant_waffle's two gated messages (dbw0q8 / qxk14n) with Ji: the host catalog has neither, false.
//   T / Ne / k / R   the PR details, check summary, diff stat and worktree status queries (zo / So / ms / ni): no host
//                    query, so hasChanges / changesConfirmed / treeDirty / reviewDecision / conflicting / autoMergeArmed
//                    stay undefined (dr / fr / ar / sa over no details), hasRemote / onBaseBranch / branchNotPushed /
//                    shipsElsewhere false, ciFailed / ciGreen from the row PR's ciState (Ne.total is 0).
//   Nt (firingKnown) `os(i)!==void 0&&p!=="unknown"`: the repo query has no host data, so false.
// With presets (D10) and the per-session turnBox flag on, ZA keeps every rule chip; with the inputs above none of them
// fires, so the row stays empty, which is the original's answer for this host.
export function useNextActionRules(sessionRef, options = {}) {
  const host = useContext(TurnBoxHost);
  const n = options;
  const r = sessionRef?.id ?? null;
  const local = sessionRef?.type === "local";
  const s = null;
  const c = r === null ? undefined : host?.pullRequest?.(r);
  const p = pullRequestRuleState(c);
  const g = !!c && isPullRequestUrl(c.url) && !s?.inheritedPr && !s?.stackParent;
  const _ = g ? c.number : undefined;
  const v = g ? c.url : undefined;
  const b = useMemo(() => (_ !== undefined && v !== undefined ? { number: _, url: v } : undefined), [_, v]);
  const M = r !== null && host?.responding?.(r) === true;
  const N = false;
  const P = useOffersBackgroundTask(local ? (r ?? undefined) : undefined);
  const F = (M && !N) || n.isResponding === true || P;
  const U = useIdleOnReturn(r, n.lastActivityAt, F);
  const te = useSessionsStore((t) => (local && U === true && prStateEndsSession(p)
    ? (host?.archiveFactsKnown?.(r) === true ? archiveHeldBack(t.sessions, r) : true) : undefined));
  const ne = local ? te : p !== "merged";
  const W = undefined;
  const [pe, me] = useState(() => emptyRuleMemory(r));
  const Se = advanceRuleMemory(pe, { id: r, turnKey: W?.lastTurnKey, wroteUncommitted: false, treeClean: false, committed: false,
    verified: false, noChanges: false, promptKey: W?.lastPromptKey });
  const { streaks: Ce } = Se;
  const we = W?.lastWriteKey ?? null;
  const Me = W?.lastPromptKey ?? null;
  const Ie = c?.ciState === "failed";
  const ze = c?.ciState === "passed";
  const ct = isPullRequestUrl(c?.url);
  const commands = n.commands;
  const dt = useMemo(() => ({
    isResponding: F,
    prState: p,
    reviewDecision: undefined,
    conflicting: undefined,
    ciFailed: Ie,
    autoFixWatching: false,
    ciGreen: ze,
    hasChanges: undefined,
    changesConfirmed: undefined,
    treeDirty: undefined,
    hasRemote: false,
    onBaseBranch: false,
    branchNotPushed: false,
    shipsElsewhere: false,
    connectorsTouchedLastTurn: 0,
    slashCorrection: undefined,
    lastTurnWroteFiles: W?.lastTurnWroteFiles,
    lastTurnWaffled: W?.lastTurnWaffled,
    waffleOffered: false,
    lastTurnCommitted: W?.lastTurnCommitted,
    lastTurnVerified: W?.lastTurnVerified,
    lastTurnCheckFailed: W?.lastTurnCheckFailed,
    lastTurnFollowedVerify: false,
    localSession: local,
    verifiedSinceLastWrite: undefined,
    commitIgnoredTurns: Ce.commit.ignored,
    createPrIgnoredTurns: Ce.create_pr.ignored,
    verifyIgnoredTurns: Ce.verify.ignored,
    commands,
    prOnGithub: ct,
    autoMergeArmed: undefined,
    idleOnReturn: U,
    archiveHeldBack: ne,
  }), [F, p, Ie, ze, local, Ce.commit.ignored, Ce.create_pr.ignored, Ce.verify.ignored, commands, ct, U, ne]);
  const pt = useMemo(() => evaluateNextActionRules(dt), [dt]);
  // ht = ra({...dt, createPrIgnoredTurns:0, verifyIgnoredTurns:0, …mt}); mt (the open turn's summary) needs W.
  const ht = useMemo(() => firingNextActionRules({ ...dt, createPrIgnoredTurns: 0, verifyIgnoredTurns: 0 }), [dt]);
  const [_t, vt] = useState(() => ({ id: r, chips: NO_CHIPS, onScreen: false }));
  const xt = keepShownChips(_t, r, n.hidden === true ? NO_CHIPS : pt);
  if (xt.memory !== _t) vt(xt.memory);
  const St = xt.chips;
  if (Se !== pe) me(Se);
  const Ct = n.offscreen === true;
  const wt = useCallback((e) => {
    if (Ct) return;
    const t = STREAK_RULES.filter((t) => e.some((e) => e.ruleId === t) && pt.some((e) => e.ruleId === t));
    if (t.length !== 0) me((e) => (e.id === r ? t.reduce((e, t) => markRulePainted(e, t), e) : e));
  }, [pt, r, Ct]);
  const Tt = Se.turnKey;
  const Et = useCallback((e) => {
    if (e.ruleId === "verify") me((e) => (e.id === r ? markRuleUsed(markVerifySent(e, we, Tt), "verify", Tt) : e));
    if (e.ruleId === "create_pr") me((e) => (e.id === r ? markRuleUsed(e, "create_pr", Tt) : e));
    if (e.command === "correct_slash_command") me((e) => (e.id === r ? markSlashCorrectionUsed(e, Me) : e));
  }, [Tt, r, Me, we]);
  const Dt = xt.memory.pendingAfterRetirement !== undefined;
  useEffect(() => {
    if (!Dt) return;
    const frame = requestAnimationFrame(() => {
      startTransition(() => {
        vt((e) => retireShownChips(e));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [Dt]);
  const At = useMemo(() => ({ isResponding: F, derived: pt }), [pt, F]);
  const jt = useCallback((e) => namedRuleChip(e, dt), [dt]);
  const Mt = useMemo(() => chipStateKey(pt.filter((e) => e.ruleId !== "archive" && e.ruleId !== "new_session")), [pt]);
  return {
    chips: St,
    stateKey: Mt,
    sessionRepo: s,
    branchNotPushed: false,
    reconnectTarget: undefined,
    conflictPr: b,
    slashCorrection: undefined,
    noteSent: Et,
    notePainted: wt,
    evaluation: At,
    firing: ht,
    firingKnown: false,
    namedFallback: jt,
  };
}
// c73f45bc3 Ec (exported tr): after the session is removed, the caller's onSessionRemoved.
export function useAfterSessionRemoved({ onSessionRemoved }) {
  return useCallback((kind) => { onSessionRemoved?.(kind); }, [onSessionRemoved]);
}

// c6b8adeaf ua (exported g): sendWithOutcome({ref, text, uuid}) for a send surface. A send the host refuses rejects as
// the original's SendStoppedByPromptError (shared-104 $_), which hT takes as handled (`Xt(e) ||` no error toast).
const notSent = () => Object.assign(new Error("The host did not send this message."), { name: "SendStoppedByPromptError" });
export function useSendWithOutcome() {
  const send = useContext(TurnBoxHost)?.send;
  const sendWithOutcome = useCallback(async (message) => {
    if (!send || (await send(message)) !== true) throw notSent();
  }, [send]);
  return { sendWithOutcome };
}

// shared-52 Sj (exported Ya): the ErrorsProvider's addError / addWarning / clearToast over the host toasts. Logging
// options are not kept (no telemetry, D17); uniqueKey is the toast key.
export function useErrors() {
  const toasts = useSourceToasts();
  const intl = useStartIntl();
  return useMemo(() => {
    const text = (message) => (typeof message === "string" ? message : intl.formatMessage(message));
    return {
      addError: (message) => toasts?.add?.(text(message), { variant: "danger" }) ?? null,
      addWarning: (message, options = {}) => toasts?.add?.(text(message), { variant: "warning", timeout: options.timeout, key: options.uniqueKey }) ?? null,
      clearToast: (id) => { if (id !== null && id !== undefined) toasts?.close?.(id); },
    };
  }, [toasts, intl]);
}

// ---- R4i-transcript TR1 (TB-4): what the generated chip row z$ (c227f4d5e, exported i; generated/turn-box/
// epitaxy-session.mjs NextActionChipRow) reaches outside the turn box.
// c68c4283d vf / yf / bf / xf: the flint telemetry (shown / clicked / evaluated / outcome). Nothing is sent (D17).
export function logChipsShown() {}
export function logChipClicked() {}
export function logRulesEvaluated() {}
export function logChipOutcome() {}
// c68c4283d at / it: the turn ordinal the desktop's message telemetry recorded for a message / session. None here (D17),
// as the desktop answers for a turn it has not recorded.
export function messageTurnOrdinal() {
  return undefined;
}
export function sessionTurnOrdinal() {
  return undefined;
}
// ccbc7e432 O: the card's ⌘↩ / Esc chords. z$ enables them only for a `source:"model"` send chip (`te=ee!==void 0&&
// h?.active===!0`), which only wrapUp's next.actions make (c227f4d5e xY); wrap_up is off here (GrowthBook 2371478310, D29).
export function useChipChords() {}
// c2c1ed18b i: an account check that lets abundant_waffle show its label override (t$). No account here (D17).
export function useAccountFlag() {
  return false;
}
// shared-1 yw / bw: the pane-hidden store and its change subscription. The desktop's default store is hw() = {hidden:false}
// (`gw=hw(),_w=b(gw)`); the host mounts no hidden-pane provider, so the box always reads that default.
const PANE_SHOWN = Object.freeze({ hidden: false });
const PANE_HIDDEN_STORE = Object.freeze({ getState: () => PANE_SHOWN, subscribe: () => noop });
export function usePaneHiddenStore() {
  return PANE_HIDDEN_STORE;
}
export function onPaneHiddenChange(store, listener) {
  return store.subscribe((next, previous) => {
    if (next.hidden !== previous.hidden) listener(next.hidden);
  });
}
// c19e90103 Ix (exported t): the epitaxy Markdown of a todo's content (cb6930dae Lu). Here the host's inline runs, as the
// plan checklist renders a step (source-plan-checklist.jsx).
export function TodoMarkdown({ children }) {
  return <SourceInlineRuns text={String(children ?? "")} />;
}
