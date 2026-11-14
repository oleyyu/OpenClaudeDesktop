// R4g-turnbox TB-3 (transcript-turn-box, tasks-06a): the Code session turn box mount — the original 2.42304.0 pieces
// that place generated/turn-box/turn-box.mjs CT (TurnBox, with hT NextActionsRow as its next-step row) under a Code
// session, over the host's Codex thread state.
// 3.6556.2 (w10-ccres-turnbox): the box is cccc2cf0a pj (TurnBox) and its next-step row cccc2cf0a cj (TurnNextActionsRow,
// cf74bc599 EpitaxyTurnNextActionsRow, cc43287c9 ope), which reads the turn tail itself (xy) and renders ZA; the mount is
// cc43287c9's `fs=Mo&&Za&&!Wt&&!er,ps=fs&&cs,ms=fs&&Hn!==null&&si` (the raw pins in scripts/extract-turn-box.mjs).
//
// Original placement, 2.42304.0 ion-dist/assets/v1:
//   cc43287c9 Mte  `{slotEl:oo,placeable:so,probeRef:co}=O5(Zn,ao),lo=Na&&da&&!tn&&!on,uo=lo&&so,fo=lo&&tr!==null&&Yr`
//                  `v("span",{hidden:!0,ref:co}),uo&&tr?(()=>{let e=v(gte,{sessionRef:tr,isResponding:ui||zi,
//                   latestPromptId:Ia,onCardShownChange:Fa,children:fo?v(bte,{…}):null});return …oo?g(e,oo):e})():null`
//                  with Na=db(tr) (c227f4d5e Iq), da=Ur({…}) (shared-19 MM), tn = the pending ExitPlanMode approval
//                  (`vl=hl?.tool.name==="ExitPlanMode"&&hl.inputWithheld!==!0`), Yr=iN() (presets),
//                  Fa=A(e=>Zn.setState({turnCardShown:e}),[Zn]).
//   cc43287c9 O5   the slot / probe placement (useTurnBoxPlacement below).
//   cf74bc599      `qi=b(e=>n.setState({turnBoxSlotEl:e}),[n]),Ji=f(()=>u(Kg,{onElement:qi}),[qi])`, handed to the
//                  transcript as `tailSlot:ii||Qi?Ji:void 0` with `ii=nu(t)` (c227f4d5e Iq again).
//   c12c146ad D    (Kg) `D=o(function({onElement:e}){return n("div",{ref:e,"data-inline-approval-slot":""})})`.
//   shared-19 MM   (Ur) `!e.isReadOnly&&!e.isReviewSession&&!e.showFolderRecoveryNotice&&e.slackReplyMode==="off"&&
//                  !e.orgSendBlocked&&!e.isPlanApproval&&!e.hideComposer`.
// These are a few lines each and live in chunks the turn-box generator does not take, so they are ported here line for
// line; everything the box renders is the generated original.
//
// Host (D10): the presets gate is on, so Na holds for any session and the next-step row mounts. turn-plan: the per-session
// turnBox flag (GrowthBook 2371478310, the ccd_turn tools) is on, so the tail is Rt's update_plan branch over the
// session's update_plan / wrap_up calls (turn-plan-model.mjs codeTurnTail), wrap-up included. The session scope store (Zn) is a small per-session store here
// (createTurnBoxScope); the transcript tail slot is SourceTurnBoxSlot, rendered by the host transcript's tail.
// turn-plan: the LocalSessions.setAvailableNextActions bridge, before the generated turn box reads it (shared-0 Ix).
import "./turn-plan-bridge.mjs";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TurnBox, TurnNextActionsRow } from "./generated/turn-box/turn-box.mjs";
import { canHostTurnBox } from "./generated/turn-box/epitaxy-session.mjs";
import { EMPTY_TURN_TAIL, turnTailEqual } from "./generated/turn-box/turn-tail.mjs";
import { TurnBoxHost, usePresetsGate } from "./source-turn-box-adapters.jsx";
import { latestPromptOf } from "./turn-box-plan-model.mjs";
// turn-plan: the tail is c4ea84cb3 Br's update_plan branch over the session's ccd_turn calls (the per-session turnBox flag,
// GrowthBook 2371478310, is on); cj hands it to ZA, the wrap-up through cb27dab29 De (`_m(r,n)`).
import { codeTurnTail } from "./turn-plan-model.mjs";
// cj's sj reads the proposal card's stores: its ls is generated/proposal-group's c96d752d0 JX over the zX marks the host
// spawner sets (proposal-spawner.mjs spawning.mark / clear; imported by the generated turn box itself, W12b), and the
// sessions store is the one the card reads (shared-8 og, committed by its ProposalHostProvider), whose open-session row
// carries the backgroundTaskSuggestions queue.
import { useSessionsStore as proposalSessionsStore } from "./source-proposal-group-adapters.jsx";
import { sessionPullRequest } from "./home-model.mjs";
// W12c (#27): the background work and scheduled prompts of a session, as the Background tasks pane lists them.
import { backgroundTasks, scheduledLoops } from "./background-tasks-model.mjs";
import "./source-turn-box.css";

// ---- the session scope store (cc43287c9 Zn: turnBoxSlotEl / turnCardShown / turnBoxRowExpected / turnQuestionWithheld)

export function createTurnBoxScope() {
  let state = { turnBoxSlotEl: null, turnCardShown: false, turnBoxRowExpected: undefined, turnQuestionWithheld: null };
  const listeners = new Set();
  return {
    getState: () => state,
    setState(patch) {
      if (Object.keys(patch).every((key) => Object.is(state[key], patch[key]))) return;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
// One store per session view (a new session gets a fresh scope, as the desktop's per-session scope body does).
export function useTurnBoxScope(sessionKey) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createTurnBoxScope(), [sessionKey]);
}
// tp(Zn, selector)
export function useTurnBoxScopeValue(scope, selector) {
  const read = () => selector(scope.getState());
  return useSyncExternalStore(scope.subscribe, read, read);
}

// ---- the transcript tail slot (cf74bc599 qi / Ji over c12c146ad D)

export const SourceTurnBoxSlot = memo(function SourceTurnBoxSlot({ scope }) {
  const onElement = useCallback((element) => scope.setState({ turnBoxSlotEl: element }), [scope]);
  return <div ref={onElement} data-inline-approval-slot="" />;
});

// ---- cc43287c9 O5: portal into the slot when the transcript has one; otherwise inline once the probe has mounted and
// the tail is not waiting on its inline approval list (`ao`; the host has no inline approval list, so false).
export function useTurnBoxPlacement(scope, awaitsList = false) {
  const slotEl = useTurnBoxScopeValue(scope, (state) => state.turnBoxSlotEl);
  const [probed, setProbed] = useState(null);
  const probeRef = useCallback((element) => { if (element !== null) setProbed(scope); }, [scope]);
  return { slotEl, placeable: slotEl !== null || (probed === scope && !awaitsList), probeRef };
}

// shared-19 MM (cc43287c9 Ur): the composer is shown for the session.
export function composerShown({ isReadOnly = false, isReviewSession = false, showFolderRecoveryNotice = false, slackReplyMode = "off",
  orgSendBlocked = false, isPlanApproval = false, hideComposer = false } = {}) {
  return !isReadOnly && !isReviewSession && !showFolderRecoveryNotice && slackReplyMode === "off" && !orgSendBlocked && !isPlanApproval && !hideComposer;
}

// shared-19 NM (exported Ed; cf74bc599 `G=it({isShared:ee,isSessionNotFound:M,isArchived:L,…})`): the session is read only.
// It reaches Mte as isReadOnly (`on`), which both MM (da) and lo test. R4i-transcript TR1: the host's read-only session
// is an archived one (as the session rail's readOnly, main.jsx `readOnly: !!session?.archived`); the other inputs (a
// shared or missing session, the projects gate, a CLI mirror, a failed init, a conversation workspace) have no host case.
export function sessionReadOnly({ isShared = false, isSessionNotFound = false, isArchived = false, isProjectsGateOffGrouped = false,
  isCliMirror = false, isFailedInit = false, isConversationWorkspace = false } = {}) {
  return isShared || isSessionNotFound || isArchived || isProjectsGateOffGrouped || isCliMirror || isFailedInit || isConversationWorkspace;
}

// Mte's lo / uo / fo: the box may show (lo), it mounts now (uo), and its next-step row mounts (fo).
export function turnBoxMountFlags({ canHost, composerVisible, isPlanApproval = false, isReadOnly = false, placeable, hasSession, nextRowGate }) {
  const eligible = !!canHost && !!composerVisible && !isPlanApproval && !isReadOnly;
  return { eligible, mounted: eligible && !!placeable, nextRow: eligible && !!hasSession && !!nextRowGate };
}

// `oo?g(e,oo):e`: into the slot through a portal, else where the composer region renders it.
export function placeTurnBox(element, slotEl, portal = createPortal) {
  return slotEl ? portal(element, slotEl) : element;
}

// ---- the composer handle hT reads (the desktop composer's ref): its own editor, bash mode, text and draft, focus.
// A rule chip or a wrap-up reply calls the writers; each stays inert unless the caller passes it.
export function useTurnBoxComposerHandle({ element, text, setText, submit, bashMode } = {}) {
  const ref = useRef(null);
  const latest = useRef(null);
  latest.current = { element, text, setText, submit, bashMode };
  if (ref.current === null) {
    const read = () => String(latest.current.text?.() ?? "");
    const node = () => latest.current.element?.() ?? null;
    ref.current = {
      getEditor: () => { const dom = node(); return dom ? { view: { dom } } : null; },
      isBashMode: () => latest.current.bashMode?.() === true,
      getText: read,
      hasDraft: () => read().trim() !== "",
      setText: (value) => latest.current.setText?.(value),
      clear: () => latest.current.setText?.(""),
      submit: () => latest.current.submit?.() === true,
      scheduleFocus: () => { const dom = node(); if (dom) requestAnimationFrame(() => dom.focus?.()); },
      focusPreservingSelection: () => node()?.focus?.({ preventScroll: true }),
      ignoreStrayEnter: () => {},
    };
  }
  return ref;
}

// ---- where each turn/plan/updated landed (TB-2 planMarkFromUpdate). R4i-transcript TR1: state.js records the mark in
// its turn/plan/updated branch (`planMarks[threadId] = planMarkFromUpdate(p.turnId, items)`), with the turn the
// notification names, as Rt finds the plan write's own position in the session messages. A plan without a mark (none
// recorded) is one Rt cannot place: planTurnEnded / planTouchedThisTurn stay false.
const NO_MARKS = Object.freeze({});
export function useTurnBoxPlanMarks(state) {
  return state?.planMarks ?? NO_MARKS;
}

const compacting = (items) => (items ?? []).some((item) => item?.type === "contextCompaction" && item.status === "inProgress");
const EMPTY_SET = new Set();
const EMPTY_SESSIONS = Object.freeze([]);
const EMPTY_METADATA = Object.freeze({});
const EMPTY_LIST = Object.freeze([]);

// ---- W12c (w12b-turnbox-ls #27): the ZI fields of the sessions store rows Sg's sL (generated session-status.mjs
// archiveHeldBack) reads. The 3.6556.2 main process fills them per session (index.chunk-DNPOm2Zc formatSessionForEvent):
//   isRunning `e.isRunning||a||n.un(e)`, turnRunning `e.isRunning||n.un(e)`   a turn runs (state.active)
//   hasBackgroundActivity `n.mn(e)` (index.chunk-DBIg6EBr cj `(e.activeBackgroundTasks?.size??0)>0`)   a background task
//                    runs (background-tasks-model.mjs: sub-agents, background terminals, workflows) or a monitor does
//                    (the monitor-state feed; the host runs Monitor outside the core)
//   isStarred `e.isStarred`               pinned (sessionMetadata, Codex's pinned section included: withCoreSections)
//   manualKeepAwake `e.manualKeepAwake`   the session menu's Keep awake (sessionMetadata keepAwake)
//   loops `this.collectSessionLoops(e)`   the session's cron jobs (activeCronJobs): the schedule-state feed
//   pendingToolPermissions `i`            (permissionBrokerGetPendingRequestsForSession) the requests the session owns
// starting, heldInput, lanyard, autoArchiveHold and the pending refusal / auto-mode / lanyard-consent / violin-bow prompts
// have no host counterpart and stay unset, as the main process leaves them for a session without them.
export function archiveHoldFields({ running = false, backgroundRunning = false, monitors = EMPTY_LIST, loops = EMPTY_LIST, meta = EMPTY_METADATA,
  requests = EMPTY_LIST } = {}) {
  return {
    isRunning: !!running,
    turnRunning: !!running,
    hasBackgroundActivity: !!backgroundRunning || (monitors ?? []).some((monitor) => monitor?.status === "running"),
    isStarred: !!meta?.pinned,
    manualKeepAwake: meta?.keepAwake === true,
    loops: scheduledLoops(loops),
    pendingToolPermissions: [...(requests ?? [])],
  };
}
// The sessions sL looks at for the open one: itself and its side sessions (shared-46 eL: `spawnedFrom.sideSession` children
// that are not archived; the host rows have no lineage, so ef / af add none), down the family.
export function archiveFamily(currentId, sessions = EMPTY_SESSIONS, metadata = EMPTY_METADATA) {
  if (!currentId) return EMPTY_LIST;
  const archived = new Set((sessions ?? []).filter((entry) => entry?.archived === true || entry?.isArchived === true).map((entry) => entry.id));
  const ids = [currentId];
  for (let index = 0; index < ids.length; index += 1)
    for (const [id, meta] of Object.entries(metadata ?? {}))
      if (meta?.spawnedFrom?.sideSession === true && meta.spawnedFrom.sessionId === ids[index] && !archived.has(id) && !ids.includes(id)) ids.push(id);
  return ids;
}
// Each family member's loops and monitors (desktop:call schedule-state / monitor-state and their {kind:"schedules"} /
// {kind:"monitors"} events, as the Background tasks pane reads them). A member is known once both lists arrived; a
// failed read is an empty list (as that pane's feed).
function useArchiveActivityFeeds(ids, desktop) {
  const key = ids.join("\0");
  const [feeds, setFeeds] = useState(() => ({ key: null, loops: {}, monitors: {} }));
  useEffect(() => {
    const list = key ? key.split("\0") : [];
    setFeeds({ key, loops: {}, monitors: {} });
    if (list.length === 0 || typeof desktop?.call !== "function") return undefined;
    let live = true;
    const put = (field, id, value) => { if (live) setFeeds((old) => (old.key === key ? { ...old, [field]: { ...old[field], [id]: Array.isArray(value) ? value : [] } } : old)); };
    for (const id of list) {
      Promise.resolve().then(() => desktop.call("schedule-state", { sessionId: id })).then((value) => put("loops", id, value), () => put("loops", id, []));
      Promise.resolve().then(() => desktop.call("monitor-state", { sessionId: id })).then((value) => put("monitors", id, value), () => put("monitors", id, []));
    }
    const off = desktop.onEvent?.((event) => {
      if (!list.includes(event?.sessionId)) return;
      if (event.kind === "schedules" && Array.isArray(event.jobs)) put("loops", event.sessionId, event.jobs);
      if (event.kind === "monitors" && Array.isArray(event.monitors)) put("monitors", event.sessionId, event.monitors);
    });
    return () => { live = false; if (typeof off === "function") off(); };
  }, [key, desktop]);
  const pending = useMemo(() => ({ key, loops: {}, monitors: {} }), [key]);
  return feeds.key === key ? feeds : pending;
}

// The TurnBoxHost value (source-turn-box-adapters.jsx) over the host's thread state.
//   state           the reducer state (plans, items, active, approvals, agentLifecycle)
//   planMarks       useTurnBoxPlanMarks(state)
//   requestOwner    approval → owning session id (main.jsx approvalOwner); a request without a thread is the open one's
//   currentId       the open session
//   sessions        the session rows (for hT's session query: lastActivityAt / createdAt)
//   metadata        sessionMetadata as the sidebar shows it (pinned, keepAwake, spawnedFrom: sL's ZI fields and family)
//   tasks           the open session's background tasks (main.jsx `tasks`, as the Background tasks pane lists them)
//   desktop         the bridge the family's schedule-state / monitor-state feeds are read from
//   onOpenSession(id), onNewSession(), onArchiveSession(id), onOpenTasksPane()
//   onSend(text) → Promise<boolean>   turn-plan: hT's "flint" send (a next-step reply's message, sent as the user's)
export function useCodeTurnBoxHost({ state, planMarks, requestOwner, currentId, sessions = EMPTY_SESSIONS, metadata = EMPTY_METADATA,
  tasks = EMPTY_LIST, desktop = globalThis.desktop, onOpenSession, onNewSession, onArchiveSession, onOpenTasksPane, onSend }) {
  const tails = useRef(new Map());
  // W12c (#27): the family sL walks, their loops / monitors, and whether the open session's background work runs.
  const family = useMemo(() => archiveFamily(currentId, sessions, metadata), [currentId, sessions, metadata]);
  const feeds = useArchiveActivityFeeds(family, desktop);
  const openWorkRunning = (tasks ?? []).some((task) => task?.status === "running");
  // The callbacks change identity every render in the caller; the value only follows the data and which ones exist.
  const calls = useRef(null);
  calls.current = { requestOwner, onOpenSession, onNewSession, onArchiveSession, onOpenTasksPane, onSend };
  const has = { open: !!onOpenSession, add: !!onNewSession, archive: !!onArchiveSession, tasks: !!onOpenTasksPane, send: !!onSend };
  return useMemo(() => {
    const { requestOwner, onOpenSession, onNewSession, onArchiveSession, onOpenTasksPane } = {
      requestOwner: (request) => calls.current.requestOwner?.(request),
      onOpenSession: has.open ? (id) => calls.current.onOpenSession?.(id) : undefined,
      onNewSession: has.add ? () => calls.current.onNewSession?.() : undefined,
      onArchiveSession: has.archive ? (id) => calls.current.onArchiveSession?.(id) : undefined,
      onOpenTasksPane: has.tasks ? () => calls.current.onOpenTasksPane?.() : undefined,
    };
    const ownerOf = (request) => (request?.params?.threadId ? requestOwner(request) : currentId);
    const waiting = (id) => (state?.approvals ?? []).some((request) => ownerOf(request) === id);
    const row = (id) => sessions.find((entry) => entry.id === id);
    const seconds = (value) => (Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : null);
    // W12c (#27): the store rows of the family carry their ZI fields (archiveHoldFields); other rows are the card's.
    const members = new Set(family);
    const holdFields = (id) => archiveHoldFields({ running: !!state?.active?.[id],
      backgroundRunning: id === currentId ? openWorkRunning : backgroundTasks(state ?? {}, id).some((task) => task.status === "running"),
      monitors: feeds.monitors[id], loops: feeds.loops[id], meta: metadata?.[id],
      requests: (state?.approvals ?? []).filter((request) => ownerOf(request) === id) });
    let withHold = null;
    const familyRows = (rows) => {
      if (withHold?.rows !== rows) withHold = { rows, value: !(rows ?? EMPTY_SESSIONS).some((entry) => members.has(entry?.sessionId)) ? rows
        : rows.map((entry) => (members.has(entry?.sessionId) ? { ...entry, ...holdFields(entry.sessionId) } : entry)) };
      return withHold.value;
    };
    const known = (id) => Object.hasOwn(feeds.loops, id) && Object.hasOwn(feeds.monitors, id);
    return {
      turnTail(sessionRef, latestPromptId) {
        const id = sessionRef?.id;
        if (!id) return EMPTY_TURN_TAIL;
        const items = state?.items?.[id] ?? [];
        const next = codeTurnTail({ items, latestPromptId: latestPromptId ?? undefined, activeTurnId: state?.active?.[id] ?? null,
          turnErrors: state?.turnErrors?.[id] ?? null, agentLifecycle: state?.agentLifecycle ?? {} });
        const previous = tails.current.get(id);
        // c1ebb1aa4 Wt keeps the previous tail while Bt holds.
        if (previous && turnTailEqual(previous, next)) return previous;
        tails.current.set(id, next);
        return next;
      },
      bucket: (id) => ({ compactionStatus: state?.active?.[id] && compacting(state?.items?.[id]) ? "compacting" : null }),
      // R4i-transcript TR1 (TB-4), sm's inputs: a turn runs (Ly), and the PR the host recorded on the session row (va has
      // no host query: none recorded is "not known", not "no PR").
      responding: (id) => !!state?.active?.[id],
      pullRequest: (id) => { const entry = row(id); return (entry && sessionPullRequest(entry)) || undefined; },
      awaitsRequest: waiting,
      hasPendingRequest: waiting,
      requestInTurn: (id) => !!state?.active?.[id] && waiting(id),
      // shared-8 og, the sessions store: the proposal card's rows (proposalSessions over the session list and metadata), read
      // when a consumer renders. ub / lj look for a side session named after a todo (spawnedFrom.name); no host row has one
      // (btw children carry no name, D29), so they find none. cj's sj reads the open session's backgroundTaskSuggestions.
      // W12c (#27): with the ZI fields of the open session's family (Sg's sL reads them).
      get sessions() { return familyRows(proposalSessionsStore.getState().sessions); },
      archiveFactsKnown: (id) => id === currentId && family.length > 0 && family.every(known),
      attentionSessionIds: EMPTY_SET,
      sessionInfo: (sessionRef) => {
        const entry = row(sessionRef.id);
        return entry ? { agentId: undefined, startedByAccountId: undefined, lastActivityAt: seconds(entry.updatedAt), createdAt: seconds(entry.createdAt) } : undefined;
      },
      openSession: onOpenSession ? (_event, session) => onOpenSession(session.id) : undefined,
      openTasksPane: onOpenTasksPane ? () => onOpenTasksPane() : null,
      startNewSession: onNewSession ? () => onNewSession() : undefined,
      archiveSession: onArchiveSession ? (sessionRef) => onArchiveSession(sessionRef.id) : undefined,
      // c6b8adeaf ua sendWithOutcome({ref, text, uuid}): only to the open session.
      send: has.send ? async ({ ref, text }) => (ref?.id === currentId && typeof text === "string" && text ? (await calls.current.onSend?.(text)) === true : false) : undefined,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, planMarks, currentId, sessions, metadata, family, feeds, openWorkRunning, has.open, has.add, has.archive, has.tasks, has.send]);
}

// The latest prompt id the transcript publishes (cf74bc599 `n.setState({latestPromptId:ai,…})`, ai = Kl(entries)).
export function turnBoxLatestPromptId(items) {
  return latestPromptOf(items)?.id ?? undefined;
}

// ---- main.jsx's wiring as data (R4g review fix): the App passes these to SourceTurnBoxRegion, and the App-level fixture
// test drives the region with the same calls over a real reducer state.
// The session the box is for: the open Code session only (Mte's tr; Cowork / Home have none).
export function codeTurnBoxSession(current, mode) {
  return current && mode === "code" ? { id: current, type: "local" } : null;
}
// Mte's `isResponding:ui||zi` (the host has no remote branch), `latestPromptId:Ia`, da (MM: only isPlanApproval can turn the
// host composer off) and tn (a pending plan review is the host's ExitPlanMode approval), over the requests the session
// shows (main.jsx shownApprovals).
// R4i-transcript TR1: isReadOnly (NM over the session's archived flag) goes into MM and into lo, as Mte's `on`.
export function codeTurnBoxRegionProps({ items, running, shownApprovals, isPlanReview, archived = false }) {
  const planApproval = (shownApprovals ?? []).some((request) => isPlanReview(request));
  const isReadOnly = sessionReadOnly({ isArchived: !!archived });
  return { isResponding: !!running, latestPromptId: turnBoxLatestPromptId(items),
    composerVisible: composerShown({ isReadOnly, isPlanApproval: planApproval }), isPlanApproval: planApproval, isReadOnly };
}

// The box and its next-step row for a placement (cc43287c9 `ps&&Hn?(()=>{…})():null`). Exported for SSR tests, which fix
// the placement because refs never run there.
export function SourceTurnBoxMount({ host, scope, placement, sessionRef, isResponding, latestPromptId, composerVisible = true,
  isPlanApproval = false, isReadOnly = false, composerRef, hasComposerDraft, composerHasAttachments = false, onSessionRemoved,
  portal }) {
  const canHost = canHostTurnBox(sessionRef);
  const presets = usePresetsGate();
  const flags = turnBoxMountFlags({ canHost, composerVisible, isPlanApproval, isReadOnly, placeable: placement.placeable,
    hasSession: sessionRef != null, nextRowGate: presets });
  // `po=fo||ya` → turnBoxRowExpected (`ya`, the desktop's other row source, has no host counterpart).
  useEffect(() => { if (scope.getState().turnBoxRowExpected !== flags.nextRow) scope.setState({ turnBoxRowExpected: flags.nextRow }); }, [scope, flags.nextRow]);
  useEffect(() => () => scope.setState({ turnBoxRowExpected: undefined }), [scope]);
  const onCardShownChange = useCallback((shown) => scope.setState({ turnCardShown: shown }), [scope]);
  const onQuestionWithheld = useCallback((value) => { if (scope.getState().turnQuestionWithheld !== value) scope.setState({ turnQuestionWithheld: value }); }, [scope]);
  if (!flags.mounted || !sessionRef) return null;
  // cc43287c9 `turnHasPendingSuggestion:Vo`: the host scope never sets it, so false. cj reads the tail itself
  // (`xy(t.sessionRef,t.latestPromptId)`) and hands ZA wrapUp `_m(r,n)`, wrapUpCallId, closingMessageFollows, turnSettled,
  // workedWithoutWrapUp, agentRunning and proposalsPending (sj: the turn's proposed tasks still in the session's queue, not
  // being started, not cloud, not accepted).
  const pendingSuggestion = scope.getState().turnHasPendingSuggestion === true;
  const element = (
    <TurnBox key={`${sessionRef.id}:turn-box`} sessionRef={sessionRef} isResponding={isResponding} latestPromptId={latestPromptId}
      onCardShownChange={onCardShownChange}>
      {flags.nextRow ? <TurnNextActionsRow key={`${sessionRef.id}:next-actions`} sessionRef={sessionRef} isSsh={false}
        composerRef={composerRef} eligible={composerVisible} hidden={false} overlayBusy={false} onSessionRemoved={onSessionRemoved}
        openSessionMcpDialog={null} turnHasPendingSuggestion={pendingSuggestion} latestPromptId={latestPromptId}
        hasComposerDraft={hasComposerDraft} ownsShortcuts={false} composerHasAttachments={composerHasAttachments}
        onQuestionWithheld={onQuestionWithheld} /> : null}
    </TurnBox>
  );
  return placeTurnBox(element, placement.slotEl, portal);
}

// The composer-region mount: the probe span, then the box (portalled into the transcript tail slot when there is one).
export function SourceTurnBoxRegion({ host, scope, ...props }) {
  const { slotEl, placeable, probeRef } = useTurnBoxPlacement(scope, false);
  return (
    <TurnBoxHost.Provider value={host}>
      <span hidden ref={probeRef} />
      <SourceTurnBoxMount host={host} scope={scope} placement={{ slotEl, placeable }} {...props} />
    </TurnBoxHost.Provider>
  );
}
