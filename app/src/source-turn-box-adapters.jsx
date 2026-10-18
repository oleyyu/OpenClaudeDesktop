// Local services for the original 2.42304.0 Code session turn box that scripts/extract-turn-box.mjs emits
// (generated/turn-box/turn-box.mjs = cccc2cf0a CT / DT / hT, generated/turn-box/turn-tail.mjs = c1ebb1aa4 Rt / Et,
// R4g-turnbox TB-1, transcript-turn-box / tasks-06a). Each export replaces one import of the original, feature-checked by
// the extractor against the declaration it stands for.
//
// The host side of the turn box is one context, TurnBoxHost, provided where the box is mounted (TB-3; none yet):
//   turnTail(sessionRef, latestPromptId)  the c1ebb1aa4 N_ shape (TB-2: from the Codex turn/plan/updated steps)
//   bucket(sessionId)                     the session bucket fields CT reads ({compactionStatus})
//   awaitsRequest(sessionId)              the session waits on an approval / question (DT's spinner parks)
//   hasPendingRequest(sessionId), requestInTurn(sessionId)   hT's request checks
//   sessions                              rows for the side-session lookups (iv / yT; Codex sessions have no spawnedFrom)
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
import { kt as createIntl } from "./generated/chat/vendor-intl-Cf4IuK3L.js";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { SourceInlineRuns } from "./source-user-text.jsx";
import { useSourceToasts } from "./source-toast.jsx";

export const TurnBoxHost = createContext(null);
const EMPTY = Object.freeze([]);
const EMPTY_SET = new Set();
const noop = () => {};

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog.
//
// R4i-transcript TR1 (TB-4): the rule chips' labels and prompts are gated messages. cd4f82e77 W gives each rule a short
// hash id (create_pr `xqesaj`, archive `10b9uxk`, …) and the chip row's group label is `hlf4y0`; shared-104 ru / nu
// look them up as `secret:<id>` (shared-78 Pv `${Nv}:${e}`, Nv="secret") and treat a missing one as unavailable
// (NW / Ct: the command is not offered; z$: `k=w!==void 0||sm(O)`, the row does not render). No shipped catalog carries
// them (ion-dist/i18n/en-US.json and dynamic/en-US.json: 0 of the 26 ids), so the host catalog has none either and the
// row takes that branch; nothing here supplies their text. TurnBoxCatalog is where a catalog that has them would come in
// (the desktop's IntlProvider messages); the host provides none.
export const TurnBoxCatalog = createContext(null);
export function useIntl() {
  const intl = useStartIntl();
  const catalog = useContext(TurnBoxCatalog);
  return useMemo(() => {
    if (!catalog) return intl;
    const own = createIntl({ locale: intl.locale, defaultLocale: intl.defaultLocale ?? intl.locale, messages: catalog });
    return { ...intl, messages: catalog,
      formatMessage: (message, values) => (message?.id && Object.hasOwn(catalog, message.id) ? own.formatMessage(message, values) : intl.formatMessage(message, values)) };
  }, [intl, catalog]);
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

// shared-8 Q (exported Wd): the sessions store, called with a selector over {sessions}.
export function useSessionsStore(selector) {
  const sessions = useContext(TurnBoxHost)?.sessions ?? EMPTY;
  return selector({ sessions });
}
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
// c5da7eb42 iM (exported Q): a session query; hT selects agentId / startedByAccountId / lastActivityAt / createdAt.
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
// c227f4d5e NR (exported la): start a new session.
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

// c73f45bc3 sm (exported Pt; Wm): the rule chip evaluation (R4i-transcript TR1, TB-4). The evaluation itself is the
// original: generated/turn-box/chip-text.mjs evaluateNextActionRules (cd4f82e77 lt over the rule table P),
// firingNextActionRules (V), keepShownChips / retireShownChips (pt / mt), chipStateKey (dt), namedRuleChip (rt),
// pullRequestRuleState (ot); generated/turn-box/next-action-memory.mjs useIdleOnReturn (om) and the streak memory
// (Id / Ld / Bd / Vd / Ud / Wd). This adapter is sm's own body over what the host knows of the session, line for line
// where the host has the input, with the original's "nothing known" value where it does not:
//   N (responding)   `(A&&!j)||t.isResponding===!0||M`: a turn runs (TurnBoxHost.responding), or the caller says so;
//                    M (an offered background task, IO) has no host source (D29).
//   c / m (PR)       va over the session's repo query; here the PR the host recorded on the session row
//                    (TurnBoxHost.pullRequest), else none known (`ot(void 0)` = "unknown").
//   H                om(n, t.lastActivityAt, N), the original.
//   te               a local session reads Q5 over the desktop's sessions store (`Te(t.sessions,e.id)`); the host store has
//                    no rows (useSessionsStore, D29) and Q5's first clause (`n===void 0`) holds back a session it cannot
//                    find, so archive / new_session stay held back.
//   U                rm(n, s): the last-turn summary of the desktop transcript bucket (lastTurnWroteFiles / Committed /
//                    Verified, lastTypedSlashPrompt, lastTurnFailedMcpTools, …). The host bucket has none: undefined, as the
//                    original returns for a session without a bucket. So commit / verify / correct_slash_command lack input.
//   ne / he / ge     the connectors to reconnect (Cd): asked only when reconnect_connector is an enabled command, which
//                    hT makes it only with an MCP dialog to open (`reconnect_connector:s!==null`); the host opens none from
//                    here and the kernel reports no reconnect state (followUp), so no names, 0 touched, no target.
//   s / D / I / w    the repo, diff stat, worktree status and PR details queries (xa / Li / Kr / Wi): no host query here, so
//                    hasChanges / changesConfirmed / treeDirty / reviewDecision / conflicting stay undefined, hasRemote /
//                    onBaseBranch / branchNotPushed / shipsElsewhere false (`!!s?.repo`, `s!==null&&…`).
// Under presets (D10) hT keeps only the rule chips that are not app actions (correct_slash_command, reconnect_connector,
// abundant_waffle) and NW offers a command only when the catalog has its gated label (see useIntl); with the inputs
// above none of them fires, so the row stays empty, which is the original's answer for this host.
export function useNextActionRules(sessionRef, options = {}) {
  const host = useContext(TurnBoxHost);
  const n = sessionRef?.id ?? null;
  const local = sessionRef?.type === "local";
  const N = (n !== null && host?.responding?.(n) === true) || options.isResponding === true;
  const c = n === null ? undefined : host?.pullRequest?.(n);
  const m = pullRequestRuleState(c);
  const H = useIdleOnReturn(n, options.lastActivityAt, N);
  const ee = local && H === true && prStateEndsSession(m) ? true : undefined;
  const te = local ? ee : m !== "merged";
  const U = undefined;
  const [_e, ve] = useState(() => emptyRuleMemory(n));
  const W = advanceRuleMemory(_e, { id: n, turnKey: U?.lastTurnKey, wroteUncommitted: false, treeClean: false, committed: false,
    verified: false, noChanges: false, promptKey: U?.lastPromptKey });
  const { streaks: G } = W;
  const ye = U?.lastWriteKey ?? null;
  const we = U?.lastPromptKey ?? null;
  const commands = options.commands;
  const Ee = useMemo(() => ({
    isResponding: N,
    prState: m,
    reviewDecision: undefined,
    conflicting: undefined,
    // `n.total>0?n.failed>0:c?.ciState==="failed"` and Va(w&&n, c?.ciState) without PR details (w).
    ciFailed: c?.ciState === "failed",
    autoFixWatching: false,
    ciGreen: c?.ciState === "passed",
    hasChanges: undefined,
    changesConfirmed: undefined,
    treeDirty: undefined,
    hasRemote: false,
    onBaseBranch: false,
    branchNotPushed: false,
    shipsElsewhere: false,
    connectorsToReconnect: undefined,
    connectorsTouchedLastTurn: 0,
    slashCorrection: undefined,
    lastTurnWroteFiles: U?.lastTurnWroteFiles,
    lastTurnWaffled: U?.lastTurnWaffled,
    // Nd: abundant_waffle is offered only when the catalog has its two gated messages (dbw0q8 / qxk14n).
    waffleOffered: false,
    lastTurnCommitted: U?.lastTurnCommitted,
    lastTurnVerified: U?.lastTurnVerified,
    lastTurnCheckFailed: U?.lastTurnCheckFailed,
    lastTurnFollowedVerify: false,
    localSession: local,
    verifiedSinceLastWrite: undefined,
    commitIgnoredTurns: G.commit.ignored,
    createPrIgnoredTurns: G.create_pr.ignored,
    verifyIgnoredTurns: G.verify.ignored,
    commands,
    prOnGithub: undefined,
    autoMergeArmed: undefined,
    idleOnReturn: H,
    archiveHeldBack: te,
  }), [commands, c, N, m, local, H, te, G.commit.ignored, G.create_pr.ignored, G.verify.ignored]);
  const De = useMemo(() => evaluateNextActionRules(Ee), [Ee]);
  // ke = za({...Ee, createPrIgnoredTurns:0, verifyIgnoredTurns:0, …Oe}); Oe (the open turn's summary) needs U.
  const ke = useMemo(() => firingNextActionRules({ ...Ee, createPrIgnoredTurns: 0, verifyIgnoredTurns: 0 }), [Ee]);
  const [Ae, je] = useState(() => ({ id: n, chips: NO_CHIPS, onScreen: false }));
  const Me = keepShownChips(Ae, n, options.hidden === true ? NO_CHIPS : De);
  if (Me.memory !== Ae) je(Me.memory);
  const Ne = Me.chips;
  if (W !== _e) ve(W);
  const Pe = options.offscreen === true;
  const Fe = useCallback((e) => {
    if (Pe) return;
    const t = STREAK_RULES.filter((t) => e.some((e) => e.ruleId === t) && De.some((e) => e.ruleId === t));
    if (t.length !== 0) ve((e) => (e.id === n ? t.reduce((e, t) => markRulePainted(e, t), e) : e));
  }, [n, Pe, De]);
  const Ie = W.turnKey;
  const Le = useCallback((e) => {
    if (e.ruleId === "verify") ve((e) => (e.id === n ? markRuleUsed(markVerifySent(e, ye, Ie), "verify", Ie) : e));
    if (e.ruleId === "create_pr") ve((e) => (e.id === n ? markRuleUsed(e, "create_pr", Ie) : e));
    if (e.command === "correct_slash_command") ve((e) => (e.id === n ? markSlashCorrectionUsed(e, we) : e));
  }, [n, ye, we, Ie]);
  const Re = Me.memory.pendingAfterRetirement !== undefined;
  useEffect(() => {
    if (!Re) return;
    const frame = requestAnimationFrame(() => {
      startTransition(() => {
        je((e) => retireShownChips(e));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [Re]);
  const Ve = useMemo(() => ({ isResponding: N, derived: De }), [N, De]);
  const He = useCallback((e) => namedRuleChip(e, Ee), [Ee]);
  return {
    chips: Ne,
    stateKey: chipStateKey(De.filter((e) => e.ruleId !== "archive" && e.ruleId !== "new_session")),
    sessionRepo: null,
    branchNotPushed: false,
    reconnectTarget: undefined,
    conflictPr: undefined,
    slashCorrection: undefined,
    noteSent: Le,
    notePainted: Fe,
    evaluation: Ve,
    firing: ke,
    // `ia(i)!==void 0&&m!=="unknown"`: the repo query has no host data.
    firingKnown: false,
    namedFallback: He,
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
// shared-frame Ya (exported mu): the CDS layer's owner window. The host mounts no layer in another window: the current
// window (as the proposal group's adapter answers).
export function useLayerOwnerWindow() {
  return globalThis.window;
}

// c19e90103 Ix (exported t): the epitaxy Markdown of a todo's content (cb6930dae Lu). Here the host's inline runs, as the
// plan checklist renders a step (source-plan-checklist.jsx).
export function TodoMarkdown({ children }) {
  return <SourceInlineRuns text={String(children ?? "")} />;
}
