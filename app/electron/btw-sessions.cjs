// Claude Desktop 2.37337.1: BU5PdZBi lt/ut/ft and BolytlRP forkSession.
// This is the host adapter for *persistent* /btw children. It deliberately
// does not use the ordinary fork operation's parent-idle lock, nor the legacy
// read-only, ephemeral sideQuestion transport. Renderer activation is separate.
// 2.42304.0 additions: archive predicates and cascade (CFJssAFf SD/wD, archiveCascadeOf) and detachFromParent (detach).
const { connectionMatches } = require('./session-operations.cjs');
const { coreForEngine } = require('./core-registry.mjs');
const { PERMISSION_MODES, threadPermissionParams, validateBypassRequest } = require('./permission-policy.mjs');
const { btwTitle } = require('./generated/btw-title.mjs');
const { sideSessionPrompt } = require('./generated/side-session-prompt.mjs');
const { readBtwPlanState } = require('./btw-plan-state.cjs');
// 2.42304.0 index.chunk-CFJssAFf.js SD/wD (+ muI2IV6k nwa through DzrvTkKz), scripts/extract-btw-archive.mjs.
const { hasOpenOwnPullRequest, sharesParentCheckout } = require('./generated/btw-archive.mjs');

// Host adapter for SD's `e.prs[]` ({state, inherited}). The only PR record a local main process sees is the core's
// binding for the session itself (codeDesktop.pr {number,url}: the PR this session opened, e.g. the bridge's
// codeDesktop/thread/pr; no state means open, as the renderer reads it). create() never copies the parent's record,
// and a child binding equal to its parent's is what official forkSession stores as an `inherited: true` copy, which SD
// never counts. A parent's PR therefore neither retains nor releases a child. Branch PRs the renderer's GitHub CLI
// lookup observes are not visible here; official marks those inherited on a shared checkout (bindsCheckoutPrsInherited).
const boundPr = pr => !!pr && typeof pr === 'object' && ((Number.isSafeInteger(pr.number) && pr.number > 0) || (typeof pr.url === 'string' && pr.url !== ''));
const samePr = (a, b) => typeof a.url === 'string' && a.url && typeof b.url === 'string' && b.url
  ? a.url.toLowerCase() === b.url.toLowerCase() : Number.isSafeInteger(a.number) && a.number === b.number;
function sessionPrs(config, id, thread) {
  const own = [thread?.codeDesktop?.pr, config.threadMetadata?.[id]?.codeDesktop?.pr].find(boundPr);
  if (!own) return [];
  const parentId = config.sessionMetadata?.[id]?.spawnedFrom?.sessionId;
  const parent = typeof parentId === 'string' ? config.threadMetadata?.[parentId]?.codeDesktop?.pr : undefined;
  return [{ state: typeof own.state === 'string' ? own.state : undefined, inherited: boundPr(parent) && samePr(own, parent) }];
}
// B5tintml Jb (liveSideSessionsOf): unarchived side sessions spawned from `id`. A detached child no longer
// references its parent (F_ returns no lineage once lineageDetached), so it is not one of them.
function liveSideSessionsOf(config, id) {
  const archived = new Set(config.archivedThreadIds ?? []);
  return (config.threadIds ?? []).filter(child => {
    const meta = config.sessionMetadata?.[child];
    return child !== id && !archived.has(child) && meta?.spawnedFrom?.sideSession === true && meta.spawnedFrom.sessionId === id && !meta.lineageDetached;
  });
}

function isBtwChild(meta) {
  const from = meta?.spawnedFrom;
  return from?.btw === true && from.sideSession === true && from.userFork === true &&
    typeof from.sessionId === 'string' && !meta.lineageDetached;
}
// A /btw child, attached or detached to top level (2.42304.0 detachFromParent keeps spawnedFrom; only lineageDetached
// changes). Its own turns stay its pane's rows (zT ownRowsSince = btwSince), so their ids keep being recorded after a
// detach; everything that follows the lineage (archive, cascade, the side-session note) still uses isBtwChild.
function ownsBtwTurns(meta) {
  const from = meta?.spawnedFrom;
  return from?.btw === true && from.sideSession === true && from.userFork === true && typeof from.sessionId === 'string' && !!meta.btw;
}

// The fork/archive contract: Codex, or a core that reports capabilities.btwChildSessions (the DeepSeek Harness).
// Do not infer it from a bridge having the legacy sideQuestion extension.
function supportsBtwChildren(owner) {
  const info = owner?.serverInfo;
  return !!info && (coreForEngine(info.engine).id === 'codex' || info.capabilities?.btwChildSessions === true);
}

function parentRefusal(thread, meta, config) {
  if (config.archivedThreadIds?.includes(thread.id) || thread.archived) return 'archived_parent';
  if (meta?.surface && meta.surface !== 'code') return 'other_surface';
  if (thread.source?.subAgent || (meta?.spawnedFrom?.sideSession && !meta.lineageDetached)) return 'parent_is_side_session';
  if (thread.remoteTarget || thread.sshConfig || thread.wslConfig || meta?.remoteTarget) return 'remote_parent';
  if (meta?.scheduledTaskId || meta?.agentDispatched) return 'unattended_parent';
  if (['cwd_not_found', 'cwd_too_long', 'remote_cwd_missing'].includes(thread.errorCategory)) return 'parent_folder_gone';
  if (thread.harnessCwd) return 'claude_entered_worktree';
  // A normal prepared worktree is shared by the /btw child, just as in Uw/Gw.
  const worktree = thread.worktreePath || config.worktreeOrigins?.[thread.cwd];
  if (!worktree && meta?.originCwd && meta.originCwd !== thread.cwd) return 'origin_folder_differs';
  return null;
}

function pendingApproval(owner, id) {
  const snapshot = owner.approvalSnapshot();
  const requests = snapshot.pending ?? [];
  return requests.some(request => request?.params?.threadId === id || request?.threadId === id);
}
const openedBy = value => ['question', 'selection', 'bare'].includes(value) ? value : 'unknown';
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 512 && !/[\u0000-\u001f]/.test(id);

function createBtwSessions({ getClient, getConfig, save, decorateThread = (_method, params) => params,
  onThreadCreated = () => {}, onChanged = () => {},
  busy = () => false, reserve = () => () => {}, hasParentLoop = () => false,
  hasBackgroundWork = async () => false, hasQueuedInput = async () => false, defaultTitle = () => 'Side chat', now = Date.now }) {
  // A retry of one UI opening is idempotent; different openings may fork the
  // same *running* parent concurrently. A transport timeout retains its ticket.
  const owners = new WeakMap();
  const revisions = new Map();
  // CFJssAFf sideSessionStartsFor(parent): side-session openings of a parent still in flight.
  const startsInFlight = new Map();
  const reviewStamp = id => JSON.stringify([getConfig().sessionMetadata?.[id], revisions.get(id) ?? 0]);
  const isPinned = (id, thread) => {
    const config = getConfig(), meta = config.sessionMetadata?.[id];
    return meta?.pinned === true || (meta?.pinned === undefined && !!config.codexPinnedSectionId && thread?.sectionId === config.codexPinnedSectionId);
  };
  function boundRpc(owner, expected) {
    const connection = owner.connection;
    return async (method, params) => {
      checkOwner(owner, expected);
      const result = await owner.request(method, params, undefined, connection);
      checkOwner(owner, expected);
      return result;
    };
  }
  function tickets(owner, expected) {
    let entry = owners.get(owner);
    if (!entry || entry.epoch !== expected.connectionEpoch || entry.id !== expected.connectionId) {
      entry = { epoch: expected.connectionEpoch, id: expected.connectionId, starts: new Map(), closes: new Map() };
      owners.set(owner, entry);
    }
    return entry;
  }
  function checkOwner(owner, expected) {
    if (owner !== getClient() || !connectionMatches(owner, expected)) throw new Error('The core connection changed. Reopen the session before retrying.');
  }
  function activeParent(id) {
    const config = getConfig();
    if (!validId(id) || !config.threadIds?.includes(id) || config.archivedThreadIds?.includes(id))
      throw new Error('Open an active session first.');
    return config;
  }
  function publish(op, thread, meta, owner, expected) {
    // Preserve a confirmed fork even if the connection was replaced during the
    // call, but do not deliver it as an active session on the replacement core.
    if (owner === getClient() && connectionMatches(owner, expected)) onChanged(op, thread, meta);
  }
  async function create(payload, owner) {
    const { parentId, expected, permission } = payload;
    let config = activeParent(parentId);
    checkOwner(owner, expected);
    const { thread: parent } = await owner.request('thread/read', { threadId: parentId, includeTurns: false });
    checkOwner(owner, expected); config = activeParent(parentId);
    if (parent?.id !== parentId) throw new Error('This session has no saved conversation yet. Send a message first.');
    const refusal = parentRefusal(parent, config.sessionMetadata?.[parentId], config);
    if (refusal) return { status: 'disabled', reason: refusal };
    if (hasParentLoop(parentId)) return { status: 'disabled', reason: 'live_loop' };
    const overrides = threadPermissionParams({ permission, mode: 'code',
      autoReview: owner.connection?.enabledFeatures?.has('guardian_approval') === true });
    await validateBypassRequest(overrides, getConfig, () => owner.request('configRequirements/read', {}));
    checkOwner(owner, expected); config = activeParent(parentId);
    const metadata = config.sessionMetadata?.[parentId] ?? {};
    const refusedNow = parentRefusal(parent, metadata, config);
    if (refusedNow) return { status: 'disabled', reason: refusedNow };
    if (hasParentLoop(parentId)) return { status: 'disabled', reason: 'live_loop' };
    // No lastTurnId: fork the current saved transcript, including a running
    // parent's context, without stopping/resuming/subscribing that parent.
    const params = decorateThread('thread/fork', { threadId: parentId, ...overrides,
      ...(parent.historyMode === 'legacy' ? {} : { excludeTurns: true }) }, owner);
    const result = await owner.request('thread/fork', params);
    const child = result?.thread;
    if (!validId(child?.id) || child.id === parentId) throw new Error('The core did not return a new side session.');
    config = getConfig();
    if (config.threadIds?.includes(child.id) || config.archivedThreadIds?.includes(child.id)) {
      // Never overwrite a pre-existing session's lineage or permissions.
      throw new Error('The core returned an existing session instead of a new side session.');
    }
    const { turns, ...record } = child;
    const name = btwTitle(typeof payload.titleWords === 'string' ? payload.titleWords : '', defaultTitle());
    record.name = name;
    const inherited = {};
    for (const key of ['surface', 'projectId', 'environmentId', 'model', 'effort', 'serviceTier', 'originCwd', 'baseBranch'])
      if (Object.hasOwn(metadata, key)) inherited[key] = metadata[key];
    // Native fork reports the effective inherited model even when the parent
    // never stored an explicit picker override in local metadata.
    if (!inherited.model && typeof result.model === 'string') inherited.model = result.model;
    if (!Object.hasOwn(inherited, 'effort') && Object.hasOwn(result, 'reasoningEffort')) inherited.effort = result.reasoningEffort;
    if (!Object.hasOwn(inherited, 'serviceTier') && Object.hasOwn(result, 'serviceTier')) inherited.serviceTier = result.serviceTier;
    const meta = { ...inherited, additionalFolders: Array.isArray(metadata.additionalFolders) ? [...metadata.additionalFolders] : [], forkedFrom: parentId,
      spawnedFrom: { sessionId: parentId, sideSession: true, userFork: true, btw: true,
        ...((parent.worktreePath || config.worktreeOrigins?.[parent.cwd]) ? { sharedCheckout: true } : {}) },
      btw: { createdAt: now(), openedBy: openedBy(payload.openedBy), permission, ownTurnIds: [], boundaryPending: true } };
    if (metadata.workflowReminders && typeof metadata.workflowReminders === 'object') meta.workflowReminders = { ...metadata.workflowReminders };
    config.threadIds = [child.id, ...config.threadIds];
    config.threadMetadata ??= {}; config.threadMetadata[child.id] = record;
    config.sessionMetadata ??= {}; config.sessionMetadata[child.id] = meta;
    if (config.threadTools?.[parentId]) config.threadTools[child.id] = structuredClone(config.threadTools[parentId]);
    // Persistence precedes any optional naming/presentation work. A real fork
    // must remain discoverable when a window closes or a rename fails.
    save();
    let warning;
    try { onThreadCreated(params, child); }
    catch { warning = 'The side session was saved, but its app tools could not be attached.'; }
    try {
      checkOwner(owner, expected);
      await owner.request('thread/name/set', { threadId: child.id, name });
    } catch { warning ??= 'The side session was saved, but its title could not be updated in the core.'; }
    child.name = name;
    publish('added', child, meta, owner, expected);
    return { status: 'started', sessionId: child.id, thread: child, sessionMetadata: meta,
      ...(warning ? { warning } : {}), connectionChanged: owner !== getClient() || !connectionMatches(owner, expected) };
  }
  async function start(payload = {}) {
    const owner = getClient();
    checkOwner(owner, payload.expected);
    activeParent(payload.parentId);
    if (!supportsBtwChildren(owner)) return { status: 'disabled', reason: 'unsupported_core' };
    if (typeof payload.requestId !== 'string' || !/^[A-Za-z0-9-]{8,128}$/.test(payload.requestId)) throw new Error('A side session opening needs a request id.');
    // Validate the mode even on a duplicate: the request id never authorizes a
    // different permission or parent than the original opening.
    if (!PERMISSION_MODES.includes(payload.permission)) throw new Error('Choose a valid permission mode.');
    const records = tickets(owner, payload.expected).starts;
    const identity = JSON.stringify([payload.parentId, payload.permission, openedBy(payload.openedBy), payload.titleWords ?? '']);
    const previous = records.get(payload.requestId);
    if (previous) {
      if (previous.identity !== identity) throw new Error('This side session request id is already in use.');
      return previous.promise;
    }
    // Never evict an unresolved mutation to make room for another one.
    for (const [key, value] of records) if (records.size >= 128 && value.settled) records.delete(key);
    if (records.size >= 128) throw new Error('Too many side sessions are still opening. Wait for them to finish.');
    const entry = { identity, settled: false };
    records.set(payload.requestId, entry);
    startsInFlight.set(payload.parentId, (startsInFlight.get(payload.parentId) ?? 0) + 1);
    const landed = () => {
      const left = (startsInFlight.get(payload.parentId) ?? 1) - 1;
      if (left > 0) startsInFlight.set(payload.parentId, left); else startsInFlight.delete(payload.parentId);
    };
    entry.promise = Promise.resolve().then(() => create(payload, owner)).then(result => { entry.settled = true; landed(); return result; }, error => {
      // A timeout is an uncertain mutation: retain its rejected ticket rather
      // than allowing eviction to turn a retry into a second fork.
      entry.settled = !/timed? out|timeout/i.test(error?.message ?? '');
      landed();
      throw error;
    });
    return entry.promise;
  }
  // CFJssAFf sideSessionBusy for a descendant: running/stopping, starting, pending permission or dialog, losable work.
  // Locally that is the child lock's busy probe, its approvals, the core's live status, background terminals, queued
  // input and an unanswered Plan decision (the native Plan turn ends before its review, unlike ExitPlanMode). An
  // unreadable state is never evidence that a descendant is settled.
  async function sideSessionBusy(owner, expected, rpc, id) {
    if (busy(id) || pendingApproval(owner, id)) return true;
    const { thread } = await rpc('thread/read', { threadId: id, includeTurns: false });
    if (thread?.id !== id || thread.status?.type === 'active' || busy(id) || pendingApproval(owner, id)) return true;
    const plan = await readBtwPlanState(rpc, id, thread, getConfig().sessionMetadata?.[id]?.btw);
    if (plan.state !== 'settled') return true;
    if (await hasBackgroundWork(owner, id)) return true;
    checkOwner(owner, expected);
    const queued = await hasQueuedInput(owner, id);
    checkOwner(owner, expected);
    return queued;
  }
  // CFJssAFf archiveCascadeSettled: every live side session sharing this session's checkout (wD) is unpinned, idle and
  // itself cascade-settled. Side sessions with their own place do not hold the archive.
  async function cascadeSettled(owner, expected, rpc, id, seen = new Set()) {
    if (seen.has(id)) return true;
    seen.add(id);
    for (const child of liveSideSessionsOf(getConfig(), id)) {
      const config = getConfig(), meta = config.sessionMetadata?.[child];
      if (!meta || !sharesParentCheckout({ spawnedFrom: meta.spawnedFrom }, id)) continue;
      if (isPinned(child, config.threadMetadata?.[child]) || await sideSessionBusy(owner, expected, rpc, child) || !await cascadeSettled(owner, expected, rpc, child, seen)) return false;
    }
    return true;
  }
  // The synchronous part of the same walk, repeated just before the archive request.
  function cascadeStillSettled(owner, id, seen = new Set()) {
    if (seen.has(id)) return true;
    seen.add(id);
    const config = getConfig();
    return liveSideSessionsOf(config, id).every(child => !sharesParentCheckout({ spawnedFrom: config.sessionMetadata[child].spawnedFrom }, id) ||
      (!isPinned(child, config.threadMetadata?.[child]) && !busy(child) && !pendingApproval(owner, child) && cascadeStillSettled(owner, child, seen)));
  }
  async function close(payload = {}) {
    const { sessionId, expected } = payload, owner = getClient();
    checkOwner(owner, expected);
    if (!supportsBtwChildren(owner)) return { status: 'disabled', reason: 'unsupported_core' };
    if (!validId(sessionId)) throw new Error('Invalid side session.');
    const config = getConfig(), meta = config.sessionMetadata?.[sessionId];
    if (!isBtwChild(meta) || ![...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])].includes(sessionId)) return { status: 'ignored' };
    if (config.archivedThreadIds.includes(sessionId)) return { status: 'archived' };
    if (isPinned(sessionId, config.threadMetadata?.[sessionId])) return { status: 'retained', reason: 'pinned' };
    if (hasOpenOwnPullRequest({ prs: sessionPrs(config, sessionId) })) return { status: 'retained', reason: 'open_pr' };
    const closes = tickets(owner, expected).closes;
    if (closes.has(sessionId)) return closes.get(sessionId);
    const operation = archiveIfSettled(sessionId, owner, expected).then(async result => {
      // archiveSession(child) → archiveCascadeOf: the child's own settled side sessions go with it.
      if (result.status === 'archived') await cascadeArchive(sessionId, owner, expected);
      return result;
    });
    closes.set(sessionId, operation);
    try { return await operation; } finally { if (closes.get(sessionId) === operation) closes.delete(sessionId); }
  }
  // index.chunk-1iyMx3P_.js $e → isSettledSideSession → archiveSession: !isStarred && !sideSessionBusy && !SD &&
  // archiveCascadeSettled, checked under the child's own lock.
  async function archiveIfSettled(sessionId, owner, expected) {
    // reserve is shared with app turn/start, preventing a send between the
    // idle check and archive. This is the child's lock, never the parent's.
    if (busy(sessionId) || pendingApproval(owner, sessionId)) return { status: 'running' };
    const release = reserve(sessionId);
    if (typeof release !== 'function') return { status: 'running' };
    try {
      const rpc = boundRpc(owner, expected), stamp = reviewStamp(sessionId);
      const { thread } = await rpc('thread/read', { threadId: sessionId, includeTurns: false });
      checkOwner(owner, expected);
      const current = getConfig();
      if (!isBtwChild(current.sessionMetadata?.[sessionId])) return { status: 'ignored' };
      if (thread?.id !== sessionId) throw new Error('The side session could not be read.');
      if (thread.status?.type === 'active' || busy(sessionId) || pendingApproval(owner, sessionId)) return { status: 'running' };
      if (isPinned(sessionId, thread)) return { status: 'retained', reason: 'pinned' };
      if (hasOpenOwnPullRequest({ prs: sessionPrs(current, sessionId, thread) })) return { status: 'retained', reason: 'open_pr' };
      const plan = await readBtwPlanState(rpc, sessionId, thread, current.sessionMetadata[sessionId].btw);
      if (plan.state !== 'settled') return { status: 'retained', reason: plan.state === 'waiting' ? 'plan_review' : 'plan_history_' + plan.state };
      if (await hasBackgroundWork(owner, sessionId)) return { status: 'running' };
      checkOwner(owner, expected);
      if (await hasQueuedInput(owner, sessionId)) return { status: 'running' };
      checkOwner(owner, expected);
      if (!await cascadeSettled(owner, expected, rpc, sessionId)) return { status: 'retained', reason: 'side_sessions' };
      if (busy(sessionId) || pendingApproval(owner, sessionId)) return { status: 'running' };
      if (!isBtwChild(getConfig().sessionMetadata?.[sessionId])) return { status: 'ignored' };
      if (getConfig().archivedThreadIds.includes(sessionId)) return { status: 'archived' };
      if (isPinned(sessionId, thread)) return { status: 'retained', reason: 'pinned' };
      if (hasOpenOwnPullRequest({ prs: sessionPrs(getConfig(), sessionId) })) return { status: 'retained', reason: 'open_pr' };
      if (!cascadeStillSettled(owner, sessionId)) return { status: 'retained', reason: 'side_sessions' };
      if (reviewStamp(sessionId) !== stamp) return { status: 'retained', reason: 'state_changed' };
      await owner.request('thread/archive', { threadId: sessionId }, undefined, owner.connection);
      // The archive was confirmed. Keep that fact even after a reconnect.
      const latest = getConfig();
      latest.threadIds = latest.threadIds.filter(id => id !== sessionId);
      latest.archivedThreadIds = [...new Set([sessionId, ...latest.archivedThreadIds])];
      save(); publish('archived', { id: sessionId }, latest.sessionMetadata[sessionId], owner, expected);
      return { status: 'archived' };
    } finally { release(); }
  }
  // CFJssAFf archiveSession → archiveCascadeOf(parent) + cascadeArchiveSideSessions: after a confirmed archive of
  // `parentId` (by a person, the inactivity rule, or a /btw close), each of its live /btw children goes with it only
  // when it is settled by the same test as an automatic close; the others stay where they are. Host differences: a
  // child sharing the parent's checkout (wD) is not torn down while busy, pinned or holding an open PR — local
  // worktree removal already waits while a live session works there — and keepUntracked has no local worktree to keep.
  // One child at a time, as the official loop awaits each teardown; a changed connection stops the walk.
  async function cascadeArchive(parentId, owner, expected) {
    const results = [];
    for (const child of liveSideSessionsOf(getConfig(), parentId)) {
      if (!isBtwChild(getConfig().sessionMetadata?.[child])) continue;
      try { results.push({ sessionId: child, ...await close({ sessionId: child, expected }) }); }
      catch (error) {
        results.push({ sessionId: child, status: 'failed', error: error?.message ?? String(error) });
        if (owner !== getClient() || !connectionMatches(owner, expected)) break;
      }
    }
    return results;
  }
  async function cascadeParentArchive({ parentId, owner = getClient() } = {}) {
    const connection = owner?.connection;
    if (!validId(parentId) || !connection || !supportsBtwChildren(owner) || !getConfig().archivedThreadIds?.includes(parentId)) return [];
    const expected = { connectionId: connection.approvalConnectionId, connectionEpoch: connection.approvalConnectionEpoch };
    if (owner !== getClient() || !connectionMatches(owner, expected)) return [];
    return cascadeArchive(parentId, owner, expected);
  }
  // CFJssAFf teardownSession, after the parent's "archived" event: `this.liveSideSessionsOf(e).length > 0 ||
  // (this.sideSessionStartsFor(e) ?? 0) > 0 ? await this.cascadeArchiveSideSessions(…) : this.cascadeArchiveSideSessions(…)
  // .catch(…)`. The archive answers only after the cascade while the parent has live side sessions or openings in flight;
  // otherwise the cascade runs on without holding the answer. Read before the cascade starts, as the original does.
  function cascadeHoldsArchive(parentId) {
    return validId(parentId) && (liveSideSessionsOf(getConfig(), parentId).length > 0 || (startsInFlight.get(parentId) ?? 0) > 0);
  }
  // 2.42304.0 index.chunk-CFJssAFf.js detachFromParent(e, r = "user"), called from the /btw tab menu's "Detach to top
  // level" (cccc2cf0a LO → shared-11 pf): no session is "Session not found."; no lineage (`n.Co(i)`, so also an already
  // detached child) is a no-op; a side session sharing its parent's checkout is refused with the original message;
  // otherwise lineageDetached is set, saved and announced (saveSession + emitSessionUpdated). Host adapter: the lineage is
  // the session metadata record (sessionMetadata[id].lineageDetached, read by btwChildren / isBtwChild / su / F_ stand-ins)
  // and the announcement is the sidebar metadata snapshot. An archived child is refused, as the menu (shared-11 lf) never
  // offers it. Not ported: thinkingSummariesWanted (no local field), the parent wake after side sessions
  // (maybeWakeParentAfterSideSessions: the local parent never waits on its /btw children) and the
  // desktop_ccd_session_detached event.
  function detach(payload = {}) {
    const { sessionId, expected } = payload, owner = getClient();
    checkOwner(owner, expected);
    if (!supportsBtwChildren(owner)) return { status: 'disabled', reason: 'unsupported_core' };
    if (!validId(sessionId)) throw new Error('Invalid side session.');
    const config = getConfig(), meta = config.sessionMetadata?.[sessionId];
    if (![...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])].includes(sessionId)) throw new Error('Session not found.');
    if (!isBtwChild(meta)) return { status: 'ignored' };
    if (meta.spawnedFrom.sideSession === true && meta.spawnedFrom.sharedCheckout === true)
      throw new Error("A session that shares its parent's checkout can't be moved to top level.");
    if (config.archivedThreadIds?.includes(sessionId)) throw new Error('Open an active session first.');
    const next = { ...meta, lineageDetached: true };
    config.sessionMetadata[sessionId] = next;
    try { save(); } catch (error) { config.sessionMetadata[sessionId] = meta; throw error; }
    publish('metadata', { id: sessionId }, next, owner, expected);
    return { status: 'detached', sessionId, sessionMetadata: next };
  }
  async function stayPlan({ sessionId, turnId, expected } = {}) {
    const owner = getClient(); checkOwner(owner, expected);
    const config = getConfig(), meta = config.sessionMetadata?.[sessionId];
    if (!supportsBtwChildren(owner) || !validId(sessionId) || !validId(turnId) || !isBtwChild(meta) ||
      !config.threadIds?.includes(sessionId) || config.archivedThreadIds?.includes(sessionId) || meta.btw?.permission !== 'plan')
      throw new Error('Open an active session first.');
    // Visible in another window is not a reason to refuse an explicit answer.
    // The same child mutation lock still excludes close and turn/start.
    const release = reserve(sessionId);
    if (typeof release !== 'function') throw new Error('Wait for the current task to finish or stop it');
    try {
      const rpc = boundRpc(owner, expected), stamp = reviewStamp(sessionId);
      const { thread } = await rpc('thread/read', { threadId: sessionId, includeTurns: false });
      if (thread?.id !== sessionId || thread.status?.type === 'active' || pendingApproval(owner, sessionId))
        throw new Error('Open an active session first.');
      const plan = await readBtwPlanState(rpc, sessionId, thread, meta.btw);
      const duplicate = plan.state === 'settled' && meta.btw.planAnsweredTurnId === turnId && meta.btw.ownTurnIds.at(-1) === turnId;
      if (!duplicate && (plan.state !== 'waiting' || plan.handoff.turnId !== turnId)) throw new Error('Open an active session first.');
      if (await hasQueuedInput(owner, sessionId)) throw new Error('Wait for the current task to finish or stop it');
      checkOwner(owner, expected);
      const current = getConfig(), latest = current.sessionMetadata?.[sessionId];
      if (reviewStamp(sessionId) !== stamp || !current.threadIds.includes(sessionId) || current.archivedThreadIds.includes(sessionId) || pendingApproval(owner, sessionId))
        throw new Error('Open an active session first.');
      if (!duplicate) {
        const previous = latest.btw;
        latest.btw = { ...previous, planAnsweredTurnId: turnId };
        try { save(); } catch (error) { latest.btw = previous; throw error; }
      }
      // A repeated answer also repairs a missed cross-window notification.
      publish('metadata', { id: sessionId }, latest, owner, expected);
      return { status: 'answered', sessionId, turnId };
    } finally { release(); }
  }
  function observe(event) {
    const id = event?.params?.threadId;
    if (isBtwChild(getConfig().sessionMetadata?.[id]) &&
      (['turn/started', 'turn/completed'].includes(event.method) || (event.method === 'item/completed' && event.params.item?.type === 'plan')))
      revisions.set(id, (revisions.get(id) ?? 0) + 1);
    if (event?.method !== 'turn/started' || !validId(event.params?.turn?.id)) return;
    const config = getConfig(), meta = config.sessionMetadata?.[id];
    if (!ownsBtwTurns(meta)) return;
    const own = meta.btw.ownTurnIds ?? [];
    if (own.includes(event.params.turn.id)) return;
    // Parent transcript rows are reference context. The pane renders only
    // turns started in this child; the marker survives restart and pagination.
    meta.btw = { ...meta.btw, ownTurnIds: [...own, event.params.turn.id] };
    save();
    onChanged('metadata', { id }, meta);
  }
  // The official desktop queues Sy (2.42304.0 asar index.chunk-B5tintml.js; 2.37337.1 Py) as a system reminder in the child. Native
  // Codex gets the same note as a hidden input part on its first accepted turn;
  // inherited developer instructions and the user's custom prompt stay intact.
  function prepareTurn(params, { customPrompt = false, permission } = {}) {
    const id = params?.threadId, meta = getConfig().sessionMetadata?.[id];
    if (!supportsBtwChildren(getClient()) || !ownsBtwTurns(meta) || !Array.isArray(params.input) || !params.input.length) return () => {};
    // A child detached to top level no longer gets the side-session note; its turns are still its pane's own rows.
    const boundary = isBtwChild(meta) && meta.btw.boundaryPending === true;
    if (boundary && !customPrompt) {
      const note = sideSessionPrompt(meta.spawnedFrom.sessionId, { userFork: true, btw: true, sharesCheckout: meta.spawnedFrom.sharedCheckout === true }).trim();
      params.input = [{ type: 'text', text: `<system-reminder>\n${note}\n</system-reminder>`, text_elements: [] }, ...params.input];
    }
    return result => {
      if (!validId(result?.turn?.id)) return;
      const current = getConfig().sessionMetadata?.[id];
      if (!ownsBtwTurns(current)) return;
      current.btw = { ...current.btw, ...(boundary ? { boundaryPending: false } : {}),
        ...(PERMISSION_MODES.includes(permission) ? { permission } : {}),
        ownTurnIds: [...new Set([...(current.btw.ownTurnIds ?? []), result.turn.id])] };
      save(); onChanged('metadata', { id }, current);
    };
  }
  return { start, close, cascadeParentArchive, cascadeHoldsArchive, detach, stayPlan, observe, prepareTurn };
}
module.exports = { createBtwSessions, isBtwChild, ownsBtwTurns, supportsBtwChildren, parentRefusal, sessionPrs, liveSideSessionsOf };
