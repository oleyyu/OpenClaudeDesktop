// R4f-proposal P3 (tasks-proposal-group-card WI-3, tasks-11): the host's proposal spawner — the object the inline
// proposal group card reads through its spawner context (c96d752d0-BOCqU7c2.js qQ / h1e), in the shape of the
// 2.42304.0 spawner F1e (c96d752d0 `function F1e(`, 20,707 B), for a local parent session.
//
// F1e is not extracted (research r4-proposal-group-card.md §4/§5: it is bound to the desktop bridge, cloud, CCR and the
// MCP configuration). This module keeps its local-parent behaviour, in its order:
//   - one start at a time: `We` (busy) is set for the preconditions and released (`Xe`: busy off, busyEpoch + 1, the
//     whenIdle waiters resolved) before the start itself runs; requestSpawn is refused while busy, requestSpawnAll runs
//     its list in order, each one waiting for the previous (`dt`: `for(;We.current;)await Ze()`);
//   - a start marks the task spawning (c227f4d5e tG), pops it from the queue as launched before starting (`rt(!0,v)`),
//     starts it (the bridge's start, proposal-launch.mjs on the host) and finally records start_failed on a failure and
//     clears the spawning mark (nG);
//   - "Do it here" sends w1e's text into this session, records sent_here, then pops it; lastSentHere drives q1e's
//     "Sent to this session";
//   - dismiss records dismissed and pops it as not launched (N1e), undoing the record when the pop fails;
//   - a mode the session didn't have (bypassPermissions / auto, c227f4d5e AI) in another repository or picked in
//     Options asks for consent first (`lt`/`ut`); here the host's own confirmation answers (confirmMode).
// Host differences (recorded in the R4f-proposal P3 report): no cloud (cloudTargets [], cloud starts refused like
// F1e's `!Ce`), no SSH/WSL place variants, no workspace-trust check, no spawnTaskPendingPop / InFlight, no side-session
// offers (D29: acceptOffer answers as a bridge without acceptSideSessionOffer does), reorderQueue a no-op (the host
// queue is derived from the transcript), and telemetry left out (D17).
//
// Dependency injection only; nothing here navigates. The official pure helpers and stores come from the generated
// proposal-group module (R4f-proposal P1), passed in by the caller:
//   official.proposalKey (t$), official.isOffer (n$), official.crossRepoCwdOf (f$), official.keepSessionMode (p$),
//   official.resolvePermissionMode (c227f4d5e zG, imported as ff), official.needsModeConsent (c227f4d5e AI, as Jf),
//   official.hereText (w1e bound to the intl adapter);
//   spawning.visible(queue, parentId) (YW over JW), spawning.mark (tG), spawning.clear (nG);
//   results.record (MQ), results.clear (NQ) — withPersistedOutcomes() in proposal-launch.mjs adds the host persistence.
import { t } from '../electron/i18n/index.mjs';

// The official defaultMessages (c96d752d0), the i18n keys.
export const PROPOSAL_SPAWNER_MESSAGES = Object.freeze({
  failed: 'Couldn’t start the suggested task.', // $Q.failed 1AkXZSA+5K
  local: 'Local', // MpsZ34EpZH
  noCloudEnvironment: 'No cloud environment configured', // 8/nYCRMZAy
  offerAnswered: 'That card was already answered, or its turn ended. Send the task again to start it.', // 43I3kLHBjT
  cloudOnly: 'This suggested task can only start in the cloud, on {repo}.', // ZQ.cloudOnly 57wGsCl3MG
  startLocally: 'Start locally', // P1e HlsEbl3CKu
  startWithWorktree: 'Start with worktree', // P1e i/rNItpPCW
  sendToCloud: 'Send to cloud', // P1e VfdzzfbVPP
  fixHere: 'Do it here', // P1e qNy7sbs812
});

const IDLE = Promise.resolve(); // O1e
const SKIP = Object.freeze({ kind: 'skip' }), RUN = Object.freeze({ kind: 'run' });
const EMPTY_HOST = Object.freeze({ sessionId: undefined, available: false, session: undefined, queue: undefined, hereDisabled: false });
const noop = () => {};

// deps:
//   official, spawning, results            see above
//   bridge: {popById(parentId, taskId, launched, record) → Promise<boolean>, sendMessage(parentId, text), start(request)
//            → Promise<{sessionId}>}       createProposalBridge() in proposal-launch.mjs
//   notify(message, {variant, error?})      a toast (danger = addError)
//   confirmMode?({mode, workspace, key})    → 'agreed' | 'declined'; without it a start that needs consent is declined
//   captureGuardedSnapToBottom?()           → a function run just before "Do it here" sends (F1e's n())
//   onStarted?(childId, {parentId, taskId}) the new session exists (official markSpawnedFresh)
//   translate?(text, values)                the host i18n t
// The host snapshot (setHost), read at call time as F1e reads its stores:
//   {sessionId, available (connected, not archived, a Code session), hereDisabled?, queue (the parent's
//    backgroundTaskSuggestions, R4f-proposal P2), session: {originCwd, cwd, model, effort, permissionMode (official
//    name), sourceBranch?}}
// Returns {setHost(host), getSnapshot() → the F1e-shaped spawner, subscribe(listener) → unsubscribe}. One controller per
// parent session; the snapshot is rebuilt when the host object or the spawner's own state (busyEpoch, lastSentHere)
// changes, so it can back useSyncExternalStore.
export function createProposalSpawner(deps) {
  const { official, spawning, results, bridge, notify, confirmMode, captureGuardedSnapToBottom, onStarted } = deps;
  const translate = deps.translate ?? t;
  let host = EMPTY_HOST;
  let busy = false, busyEpoch = 0, waiters = [], lastSentHere;
  let version = 0, built = null, builtHost = null, builtVersion = -1;
  const listeners = new Set();
  const changed = () => { version += 1; for (const listener of [...listeners]) listener(); };

  // Xe: busy off, the epoch the card re-renders on, then every whenIdle waiter.
  const release = () => {
    busy = false;
    busyEpoch += 1;
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve();
    changed();
  };
  const whenIdle = () => busy ? new Promise((resolve) => { waiters.push(resolve); }) : IDLE; // Ze
  const isBusy = () => busy; // mt
  const setLastSentHere = (value) => { lastSentHere = value; changed(); }; // Je

  const readQueue = () => host.sessionId ? (Array.isArray(host.queue) ? host.queue : []) : []; // Qe
  const reorderQueue = noop; // et: the host queue is derived from the transcript, not stored
  // tt = cde(Qe(), l ? lle(l) : new Set): without a session the queue is empty anyway.
  const readVisibleQueue = () => host.sessionId ? spawning.visible(readQueue(), host.sessionId) : [];
  const crossRepoCwdOf = (cwd) => official.crossRepoCwdOf(cwd, host.session?.originCwd, host.session?.cwd); // nt
  const findVisible = (key) => readVisibleQueue().find((record) => official.proposalKey(record) === key);

  // rt: pop the task off the parent's queue (launched = started or sent here). The host bridge has no head pop
  // (popBackgroundTaskSuggestion), so a task without an id can't be popped.
  async function pop(parentId, launched, record) {
    if (!parentId || !record?.id) return false;
    return Promise.resolve().then(() => bridge.popById(parentId, record.id, launched, record)).then((value) => value ?? false, () => false);
  }

  // N1e
  async function dismissRecord(parentId, record, done) {
    try {
      if (record.id) results.record(parentId, record.id, official.isOffer(record) ? 'kept_here' : 'dismissed');
      if (!(await pop(parentId, false, record)) && record.id) results.clear(parentId, record.id);
    } finally { done(); }
  }
  // it
  function dismiss({ key }) {
    const parentId = host.sessionId;
    if (busy || !parentId) return IDLE;
    const record = findVisible(key);
    if (!record) return IDLE;
    // An accepted offer is only marked answered (vle); offers don't reach the host (D29).
    if (official.isOffer(record) && record.accepted === true) return IDLE;
    busy = true;
    return dismissRecord(parentId, record, release);
  }
  // at: dismiss, then $e.muteSideSessionOffers (the host has no offers).
  const muteOffers = async (ref) => { await dismiss(ref); };
  // ot: the host bridge has no acceptSideSessionOffer, so the answer is never `true` and F1e's refusal toast shows.
  async function acceptOffer(ref) {
    if (!host.sessionId) return;
    const record = findVisible(ref?.key);
    if (record?.id) notify(translate(PROPOSAL_SPAWNER_MESSAGES.offerAnswered), { variant: 'danger' });
  }

  // ct: one start.
  async function spawn(target, clicked, options) {
    const parentId = host.sessionId;
    if (busy || !parentId || !host.available) return;
    const offered = findVisible(clicked.key);
    if (offered !== undefined && official.isOffer(offered)) {
      if (offered.accepted === true) return;
      if (target === 'here') { await dismiss(clicked); return; }
      busy = true;
      try { await acceptOffer(clicked); }
      catch (error) { notify(translate(PROPOSAL_SPAWNER_MESSAGES.failed), { variant: 'danger', error }); }
      finally { release(); }
      return;
    }
    const parent = host.session, record = findVisible(clicked.key);
    if (!record || !parent?.originCwd || record.cwd !== clicked.cwd) return;
    // No cloud on the host: the card lists no cloud target (places.cloudTargets []), and F1e's precondition refuses a
    // cloud start without an environment (`if(!Ce)return!1`).
    if (target === 'cloud') return;
    if (record.cloudRepository !== undefined) {
      notify(translate(PROPOSAL_SPAWNER_MESSAGES.cloudOnly, { repo: record.cloudRepository }), { variant: 'danger' });
      return;
    }
    const spawnedFrom = record.id ? { sessionId: parentId, taskId: record.id, title: record.title } : undefined; // x
    const crossRepo = official.crossRepoCwdOf(record.cwd, parent.originCwd, parent.cwd); // C
    const isCrossRepo = crossRepo !== undefined; // w
    const cwd = crossRepo ?? parent.originCwd ?? ''; // E
    const overrides = options?.overrides; // O
    const picked = { permissionMode: parent.permissionMode, model: overrides?.model ?? parent.model, effort: overrides?.effort ?? parent.effort, sourceBranch: parent.sourceBranch }; // k
    const permissionMode = official.resolvePermissionMode({ ...options, overrides }, official.keepSessionMode(picked.permissionMode, isCrossRepo)); // N = ff(…, p$(…))
    const here = target === 'here', worktree = target === 'worktree';
    busy = true;
    // ie: a local start needs the bridge's start (the host has no workspace-trust check); "here" needs its send.
    const ready = here ? !!bridge.sendMessage : !!bridge.start;
    release();
    if (!ready) return;
    const snapToBottom = here ? captureGuardedSnapToBottom?.() : null; // ae
    const taskId = record.id; // Y (no spawnTaskPendingPop on the host: q is never set)
    if (taskId !== undefined) spawning.mark(parentId, taskId);
    const popAfterSend = here && !!taskId && !!bridge.popById; // se
    if (!popAfterSend && !(await pop(parentId, true, record).catch(() => false))) {
      if (taskId !== undefined) spawning.clear(parentId, taskId);
      return;
    }
    let outcome = 'failed', backHere = false; // ge, _e
    try {
      if (here) {
        const text = official.hereText(record);
        snapToBottom?.();
        await bridge.sendMessage(parentId, text);
        if (taskId) results.record(parentId, taskId, 'sent_here');
        setLastSentHere({ title: record.title });
        backHere = popAfterSend && !(await pop(parentId, true, record)) && readQueue().some((entry) => entry.id === taskId);
      } else {
        const started = await bridge.start({ parentId, cwd, title: record.title, prompt: record.prompt, spawnedFrom,
          useWorktree: worktree, sourceBranch: worktree && !isCrossRepo ? picked.sourceBranch : undefined,
          model: picked.model, effort: picked.effort, permissionMode });
        // A1e
        if (!started?.sessionId) throw new Error('LocalSessions.start returned no sessionId');
        try { onStarted?.(started.sessionId, { parentId, taskId }); } catch {}
      }
      outcome = 'started';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('[spawn-cancelled]')) { outcome = 'cancelled'; return; }
      notify(translate(PROPOSAL_SPAWNER_MESSAGES.failed), { variant: 'danger', error });
    } finally {
      if (taskId !== undefined) {
        if (outcome === 'failed' && !popAfterSend) results.record(parentId, taskId, 'start_failed');
        // ge!=="started"&&t!=="here" → $e.notifySpawnedTaskUnstarted only answers a side-session offer (none on the host).
        if (backHere) { results.clear(parentId, taskId); setLastSentHere({ title: record.title, back: true }); }
        spawning.clear(parentId, taskId);
      }
    }
  }

  // lt: whether this start needs consent for its mode first.
  function consentCheck(target, clicked, options) {
    if (!host.sessionId || !host.available) return SKIP;
    const parent = host.session, record = findVisible(clicked.key);
    if (!record || record.cwd !== clicked.cwd) return SKIP;
    if (record.cloudRepository !== undefined) return RUN;
    const crossRepo = official.crossRepoCwdOf(record.cwd, parent?.originCwd, parent?.cwd);
    const isCrossRepo = crossRepo !== undefined;
    const asked = options?.overrides?.permissionMode ?? options?.cloudShown?.mode; // s
    const mode = options?.proposalPicks?.permissionMode ?? official.resolvePermissionMode(options ?? {}, official.keepSessionMode(parent?.permissionMode, isCrossRepo)); // c
    // u: ccd_auto_default_mode / ccr_auto_default_mode, GrowthBook — off on the host.
    const changedMode = asked !== undefined && mode !== parent?.permissionMode; // d (p: no cloud parent)
    return target !== 'here' && (isCrossRepo || changedMode) && mode !== undefined && official.needsModeConsent(mode, { autoIsDefault: false })
      ? { kind: 'ask', mode, workspace: crossRepo ?? parent?.originCwd ?? '' } : RUN;
  }
  // ut: the host's confirmation stands in for F1e's consent dialog (jue); with none, nothing starts in that mode.
  async function askConsent(check, key) {
    if (!confirmMode) return 'declined';
    try { return (await confirmMode({ mode: check.mode, workspace: check.workspace, key })) === 'agreed' ? 'agreed' : 'declined'; }
    catch { return 'declined'; }
  }
  // dt
  async function spawnWithConsent(target, clicked, options, agreed) {
    for (;;) {
      while (busy) await whenIdle();
      const check = consentCheck(target, clicked, options);
      if (check.kind === 'skip') return agreed;
      if (check.kind === 'run' || (agreed?.mode === check.mode && agreed.workspace === check.workspace)) {
        await spawn(target, clicked, options);
        return agreed;
      }
      if ((await askConsent(check, clicked.key)) === 'declined') return 'declined';
      agreed = { mode: check.mode, workspace: check.workspace };
    }
  }
  // ft: refused while another start holds the spawner.
  const requestSpawn = async (target, clicked, options) => !busy && (await spawnWithConsent(target, clicked, options), true);
  // pt: in order; a declined consent stops the rest.
  async function requestSpawnAll(list) {
    let agreed;
    for (const { target, clicked, options } of list) {
      const answer = await spawnWithConsent(target, clicked, options, agreed);
      if (answer === 'declined') return;
      agreed = answer;
    }
  }

  // Ot: the local parent's menu (the worktree row is only listed when the primary target is cloud).
  function menuItemsFor(onPick) {
    const labels = labelsOf();
    return [
      { label: labels.startLocally, disabled: false, hint: undefined, description: undefined, onSelect: () => onPick('local') },
      { label: labels.fixHere, disabled: !!host.hereDisabled, onSelect: () => onPick('here') },
    ];
  }
  // Tt = {...P1e(a, ht, gt), primary}: no SSH host (ht) and no cloud parent (gt) on the host.
  function labelsOf() {
    const startWithWorktree = translate(PROPOSAL_SPAWNER_MESSAGES.startWithWorktree);
    return { startLocally: translate(PROPOSAL_SPAWNER_MESSAGES.startLocally), startWithWorktree,
      sendToCloud: translate(PROPOSAL_SPAWNER_MESSAGES.sendToCloud), fixHere: translate(PROPOSAL_SPAWNER_MESSAGES.fixHere), primary: startWithWorktree };
  }
  const consent = Object.freeze({ confirming: null, copy: undefined, workspace: '', targetKey: undefined, confirm: noop, cancel: noop }); // jt

  function build() {
    const session = host.session;
    return {
      sessionId: host.sessionId,
      isCloudParent: false,
      canRender: !!host.sessionId && !!host.available, // At
      cloudSpawnDisabled: true,
      parentOriginCwd: session?.originCwd,
      parentCwd: session?.cwd,
      parentPermissionMode: session?.permissionMode,
      cloudParent: undefined,
      localClone: undefined,
      envListLoading: false,
      hasCloudEnv: false,
      cloudBlockedByPolicy: false,
      readQueue,
      readVisibleQueue,
      reorderQueue,
      crossRepoCwdOf,
      requestSpawn,
      requestSpawnAll,
      dismiss,
      muteOffers,
      acceptOffer,
      isBusy,
      whenIdle,
      busyEpoch,
      labels: labelsOf(),
      primaryTarget: 'worktree', // wt: a local parent's primary start is "with worktree"
      primaryDisabled: false, // Et = yt (no pending local place on the host)
      menuItemsFor,
      places: { // kt
        localLabel: translate(PROPOSAL_SPAWNER_MESSAGES.local),
        localIsRemoteHost: false,
        placeVariant: undefined,
        localInVariant: false,
        localDisabledReason: undefined,
        localPending: false,
        cloudTargets: [],
        cloudDisabledReason: translate(PROPOSAL_SPAWNER_MESSAGES.noCloudEnvironment),
        cloudPending: false,
        hereDisabled: !!host.hereDisabled,
      },
      lastSentHere,
      consent,
    };
  }

  return {
    setHost(next) { host = next && typeof next === 'object' ? next : EMPTY_HOST; },
    getSnapshot() {
      if (built && builtHost === host && builtVersion === version) return built;
      built = build(); builtHost = host; builtVersion = version;
      return built;
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
