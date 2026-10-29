const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { coreSupports } = require('./core-registry.mjs');
const { coreError } = require('./codex.cjs');
const git = promisify(execFile);

function connectionMatches(owner, expected) {
  const c = owner?.connection;
  return !!c && !c.closed && c.approvalConnectionId === expected?.connectionId &&
    c.approvalConnectionEpoch === expected?.connectionEpoch && !owner.approvalSnapshot().closed;
}
// Codex 0.155.1 preconditions for compact/fork/review without deprecated
// full-history hydration. thread/turns/list answers both history modes (probed
// live: a legacy sub-agent thread returns its turns, a paginated thread returns
// the same turn set as thread/read includeTurns:true), so only the fallback
// for a server that cannot page uses the legacy full read.
const RECENT_TURNS_LIMIT = 50;
const fs = require('node:fs');
const path = require('node:path');
const { coreForEngine } = require('./core-registry.mjs');
const coreLabelOf = (owner) => coreForEngine(owner?.serverInfo?.engine).name;

/**
 * The folder a /cd fork continues in: the path as typed (~ for home, relative to the session's folder), an existing
 * directory that is not the filesystem root, and only while no background terminal of the session still runs.
 */
async function forkFolder(owner, thread, threadId, value) {
  const typed = typeof value === 'string' ? value.trim() : '';
  if (!typed) throw new Error('Name a folder: /cd <path>.');
  const home = require('node:os').homedir();
  const expanded = typed === '~' ? home : typed.startsWith('~/') ? path.join(home, typed.slice(2)) : typed;
  const base = typeof thread.cwd === 'string' && path.isAbsolute(thread.cwd) ? thread.cwd : home;
  let target = path.resolve(base, expanded);
  try { target = fs.realpathSync.native(target); } catch { throw new Error(`There is no folder at ${target}.`); }
  if (!fs.statSync(target).isDirectory()) throw new Error(`${target} isn’t a folder.`);
  if (path.dirname(target) === target) throw new Error('Choose a directory, not the filesystem root.');
  if (target === base) throw new Error('This session is already in that folder.');
  try {
    const terminals = await owner.request('thread/backgroundTerminals/list', { threadId, limit: 100 });
    const running = (Array.isArray(terminals?.data) ? terminals.data : []).filter((entry) => entry && entry.status !== 'exited' && entry.status !== 'completed');
    if (running.length) throw new Error('Stop this session’s background terminals before changing its folder.');
  } catch (error) { if (/background terminals/.test(error?.message ?? '')) throw error; }
  return target;
}
async function listRecentTurns(owner, threadId, thread) {
  try {
    const page = await owner.request('thread/turns/list', { threadId, limit: RECENT_TURNS_LIMIT, sortDirection: 'desc', itemsView: 'summary' });
    return page?.data || [];
  } catch (error) {
    // -32601 covers "list_turns is not supported yet"; a legacy thread can
    // still be read in full without emitting a deprecationNotice.
    if (Number(error?.code) !== -32601 && !/not supported yet/i.test(error?.message || '')) throw error;
    if (thread?.historyMode && thread.historyMode !== 'legacy') return [];
    const full = await owner.request('thread/read', { threadId, includeTurns: true });
    return [...(full?.thread?.turns || [])].reverse();
  }
}
// A pull request (number, '#42' or its URL) is a target only a core that lists it in capabilities.reviewTargets takes
// (OpenCode's and MiMo's review command runs `gh pr view|diff`); Codex's ReviewTarget has none.
const PULL_REQUEST = /^(?:#?\d{1,9}|https:\/\/[^\s/]+\/[^\s]+)$/;
function reviewTarget(input, capabilities = {}) {
  const type = input?.type;
  if (type === 'uncommittedChanges') return { type };
  if (type === 'pullRequest') {
    const value = typeof input.pullRequest === 'string' ? input.pullRequest.trim() : '';
    if (!Array.isArray(capabilities?.reviewTargets) || !capabilities.reviewTargets.includes('pullRequest')) throw new Error('Choose a valid review target.');
    if (!value || value.length > 512 || !PULL_REQUEST.test(value)) throw new Error('Enter a pull request number or URL.');
    return { type, pullRequest: value.replace(/^#/, '') };
  }
  const field = { baseBranch: 'branch', commit: 'sha', custom: 'instructions' }[type];
  const value = field && input[field];
  if (typeof value !== 'string' || !value.trim() || value.length > (type === 'custom' ? 12000 : 512) || value.includes('\0'))
    throw new Error('Choose a valid review target.');
  if (type !== 'custom' && (value.trim().startsWith('-') || /[\r\n]/.test(value))) throw new Error('Invalid Git reference.');
  return { type, [field]: value.trim() };
}

// Operations are owned by a single live app-server connection. Compact's empty
// response only acknowledges submission; its lock survives until real terminal events.
function createSessionOperations({ getClient, getConfig, save, emit, verifyGit = async (cwd, target) => {
  await git('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { timeout: 10000 });
  if (target.type === 'baseBranch' || target.type === 'commit') {
    const ref = target.branch || target.sha;
    const result = await git('git', ['-C', cwd, 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], { timeout: 10000 });
    if (!/^[a-f0-9]{40,64}\s*$/.test(result.stdout)) throw new Error('Cannot resolve the review reference.');
    if (target.type === 'commit') return { ...target, sha: result.stdout.trim() };
  }
  return target;
}, decorateThread = (method, params) => params, onThreadCreated = () => {} }) {
  // decorateThread(method, params, owner): Settings › Models' Codex provider (model-settings.cjs), so a session
  // recorded under the other provider still forks and resumes; other cores' params pass unchanged.
  const pending = new Map(), active = new Map();
  // Threads in Codex's review mode (enteredReviewMode … exitedReviewMode, or a review/start of ours in flight): the
  // review delegate gets the session's MCP servers too, and OpenClaude Desktop's own may serve it only read-only tools.
  const reviewing = new Set();
  const publish = entry => emit({ kind: 'session-operation', threadId: entry.threadId, operation: entry.operation,
    phase: entry.phase, turnId: entry.turnId || null, activeTurnId: entry.activeTurnId || null, error: entry.error || null,
    connectionId: entry.expected?.connectionId, connectionEpoch: entry.expected?.connectionEpoch });
  const finish = (entry, phase, error) => {
    if (pending.get(entry.threadId) !== entry) return;
    pending.delete(entry.threadId); entry.phase = phase; entry.error = error;
    if (entry.operation !== 'message') publish(entry);
  };
  function assertAvailable(id) {
    if (pending.has(id) || active.has(id)) throw new Error('Wait for the current task to finish or stop it first.');
  }
  function reserveMessage(id) {
    assertAvailable(id);
    const entry = { threadId: id, operation: 'message', owner: getClient(), dispatched: true };
    pending.set(id, entry);
    return () => finish(entry, 'completed');
  }
  function observe(event) {
    const p = event.params || {}, id = p.threadId;
    if (event.kind === 'connection' && !event.connected) {
      active.clear(); reviewing.clear();
      for (const entry of [...pending.values()]) finish(entry, 'failed', 'Connection lost. Reopen the session to check its final state.');
      return;
    }
    if (event.method === 'turn/started') {
      active.set(id, p.turn.id);
      const entry = pending.get(id);
      if (entry?.dispatched && entry.operation !== 'fork') {
        entry.activeTurnId = p.turn.id;
        if (entry.operation !== 'review') entry.turnId = p.turn.id;
        entry.phase = 'running'; if (entry.operation !== 'message') publish(entry);
      }
    }
    if (event.method === 'item/started' && p.item?.type === 'enteredReviewMode' && typeof id === 'string') reviewing.add(id);
    if (event.method === 'item/completed' && p.item?.type === 'exitedReviewMode') reviewing.delete(id);
    // A review is the thread's one running turn (inline delivery): any turn of the thread ending ends it, however it ended.
    if (event.method === 'turn/completed') reviewing.delete(id);
    if (event.method === 'item/started' && p.item?.type === 'enteredReviewMode') {
      const entry = pending.get(id);
      if (entry?.dispatched && entry.operation === 'review' && p.turnId) {
        entry.turnId = p.turnId; entry.phase = 'running'; publish(entry);
      }
    }
    if (event.method === 'turn/completed') {
      if (active.get(id) === p.turn.id) active.delete(id);
      const entry = pending.get(id);
      if (entry?.dispatched && entry.operation !== 'fork') {
        if (entry.turnId === p.turn.id) completeTurn(entry, p.turn);
        else if (entry.operation === 'review' && !entry.turnId) entry.earlyTerminal = p.turn;
      }
    }
  }
  function completeTurn(entry, turn) {
    // 0.153.4 inline review emits a nested turn/started ID but its outer
    // submission ID on item/turn completion. Keep Stop's active ID intact;
    // only this confirmed review completion releases its associated task.
    if (active.get(entry.threadId) === entry.activeTurnId) active.delete(entry.threadId);
    finish(entry, turn.status === 'completed' && !turn.error ? 'completed' : 'failed', turn.error?.message || (turn.status === 'interrupted' ? 'Task stopped.' : null));
  }
  // The summary instructions of /compact <text>, for a core that reports capabilities.compactInstructions.
  function compactInstructions(payload, owner) {
    const text = typeof payload?.instructions === 'string' ? payload.instructions.trim().slice(0, 4000) : '';
    return text && owner?.serverInfo?.capabilities?.compactInstructions === true ? text : '';
  }
  async function run(payload) {
    const { operation, threadId, expected } = payload || {};
    if (!['compact', 'fork', 'review'].includes(operation)) throw new Error('Unknown session action.');
    const config = getConfig(), owner = getClient();
    if (typeof threadId !== 'string' || !config.threadIds.includes(threadId) || config.archivedThreadIds.includes(threadId))
      throw new Error('Open an active session first. Restore archived sessions before continuing.');
    const check = () => {
      if (owner !== getClient() || !connectionMatches(owner, expected)) throw coreError(owner, 'The {core} connection changed. Reopen the session before retrying.');
      if (!config.threadIds.includes(threadId) || config.archivedThreadIds.includes(threadId)) throw new Error('This session is no longer active.');
    };
    check(); assertAvailable(threadId);
    const entry = { threadId, operation, owner, expected, phase: 'starting' };
    pending.set(threadId, entry); publish(entry);
    let dispatched = false;
    try {
      const { thread } = await owner.request('thread/read', { threadId, includeTurns: false });
      check();
      if (!thread || thread.id !== threadId) throw new Error('This session has no saved conversation yet. Send a message first.');
      // Newest first; only the most recent turns can still be inProgress.
      const recentTurns = await listRecentTurns(owner, threadId, thread);
      check();
      if (!recentTurns.length) throw new Error('This session has no saved conversation yet. Send a message first.');
      if (active.has(threadId) || thread.status?.type === 'active' || recentTurns.some(turn => turn.status === 'inProgress'))
        throw new Error('This session is still running. Wait or stop it first.');
      const { PERMISSION_MODES, threadPermissionParams, validateBypassRequest } = await import('./permission-policy.mjs');
      if (!PERMISSION_MODES.includes(payload.permission) || !['chat', 'code', 'cowork'].includes(payload.mode)) throw new Error('Choose a valid permission mode.');
      // The mode hint goes only to a core with capabilities.permissionHints (the DeepSeek core); Codex never sees it.
      const overrides = threadPermissionParams({permission: payload.permission, mode: payload.mode, review: operation === 'review',
        hints: !!owner.serverInfo && coreSupports(owner.serverInfo, 'permissionHints'), afterPlan: payload.afterPlan});
      await validateBypassRequest(overrides, getConfig, () => owner.request('configRequirements/read', {}));
      check();
      if (operation === 'fork') {
        // 'Fork from here' (the transcript message menu) names a completed turn of this thread; otherwise the latest.
        const chosen = typeof payload?.lastTurnId === 'string' && payload.lastTurnId ? payload.lastTurnId : null;
        const lastTurnId = chosen ?? recentTurns[0].id;
        // /cd <path>: the fork continues in another folder (Codex tui app/working_directory.rs: refused while background
        // terminals run, then fork_thread_at with the new cwd), relative paths from the session's folder.
        const cwd = payload?.cwd !== undefined ? await forkFolder(owner, thread, threadId, payload.cwd) : null;
        check();
        dispatched = true; entry.dispatched = true;
        // excludeTurns keeps a paginated fork out of the deprecated path
        // (thread_processor.rs:4908); the new thread is hydrated on open.
        const forkParams = decorateThread('thread/fork', { threadId, lastTurnId, ...overrides, ...(cwd ? { cwd } : {}),
          ...(thread.historyMode === 'legacy' ? {} : { excludeTurns: true }) }, owner);
        const result = await owner.request('thread/fork', forkParams);
        // onThreadCreated(params, thread): the agent tools bind the fork's start identity to the new thread (main.cjs).
        if (result.thread?.id && result.thread.id !== threadId) { try { onThreadCreated(forkParams, result.thread); } catch {} }
        if (cwd && result.thread?.cwd && path.resolve(result.thread.cwd) !== cwd && fs.realpathSync.native(result.thread.cwd) !== cwd)
          result.warning = `The session continues in ${result.thread.cwd}: ${coreLabelOf(owner)} kept its folder.`;
        if (!result.thread?.id || result.thread.id === threadId) throw coreError(owner, '{core} did not return a new fork.');
        // Persist immediately so a later name failure cannot orphan a real fork.
        const fork = result.thread;
        config.threadIds = [...new Set([fork.id, ...config.threadIds])];
        const { turns, ...metadata } = fork;
        config.threadMetadata[fork.id] = metadata;
        // forkedAtTurn: the turn 'Fork from here' named, so the parent's "Forked here" marker survives a restart (the
        // renderer reads it, src/fork-marker-model.mjs); a plain fork of the whole conversation has none.
        // workflowReminders: the fork's history carries the parent's ultracode reminders, so it starts from the parent's
        // reminder state (workflow-tool-service.cjs reminderStore): turning ultracode off there still says so.
        const reminders = config.sessionMetadata[threadId]?.workflowReminders;
        config.sessionMetadata[fork.id] = { ...(config.sessionMetadata[threadId]?.surface ? { surface: config.sessionMetadata[threadId].surface } : {}), additionalFolders: [...(config.sessionMetadata[threadId]?.additionalFolders || [])], forkedFrom: threadId, ...(chosen ? { forkedAtTurn: chosen } : {}),
          ...(reminders && typeof reminders === 'object' ? { workflowReminders: { ...reminders } } : {}) };
        save();
        const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 120)
          : cwd ? `${thread.name || 'Session'} (${path.basename(cwd)})`.slice(0, 120) : `Fork of ${thread.name || 'session'}`.slice(0, 120);
        try {
          check();
          await owner.request('thread/name/set', { threadId: fork.id, name }); check();
          fork.name = name; config.threadMetadata[fork.id].name = name; save();
        } catch { result.warning = 'The fork was created, but its title could not be updated.'; }
        finish(entry, 'completed');
        return { ...result, sessionMetadata: config.sessionMetadata[fork.id] };
      }
      let target;
      if (operation === 'review') {
        target = reviewTarget(payload.target, owner.serverInfo?.capabilities);
        if (target.type !== 'custom') target = await verifyGit(thread.cwd, target);
        check();
      }
      // Resume only re-applies the overrides; the transcript is already local,
      // so a paginated thread never asks for full history here either.
      await owner.request('thread/resume', decorateThread('thread/resume', { threadId, ...overrides,
        ...(thread.historyMode === 'legacy' ? {} : { excludeTurns: true }) }, owner)); check();
      // Notifications can race ahead of responses; observe() owns completion.
      dispatched = true; entry.dispatched = true;
      const result = await owner.request(operation === 'compact' ? 'thread/compact/start' : 'review/start',
        // review/start delivery "detached" is deprecated in 0.155.1
        // (turn_processor.rs:343-352) and rejected outright for paginated
        // threads; inline is the only delivery this app uses.
        // /compact [instructions]: only a core that declares compactInstructions (the ZCode bridge) gets them.
        operation === 'compact' ? { threadId, ...(compactInstructions(payload, owner) ? { codeDesktop: { instructions: compactInstructions(payload, owner) } } : {}) } : { threadId, target, delivery: 'inline' });
      check();
      if (pending.get(threadId) === entry && result.turn?.id) {
        entry.turnId = result.turn.id;
        if (entry.earlyTerminal?.id === entry.turnId) completeTurn(entry, entry.earlyTerminal);
        else { entry.phase = 'running'; publish(entry); }
      }
      return result;
    } catch (error) {
      // A timed-out submitted mutation has unknown status. Retain its lock until
      // terminal events or disconnect rather than silently enabling a duplicate.
      if (dispatched && /timed out/i.test(error.message) && pending.get(threadId) === entry) {
        entry.phase = 'unknown'; entry.error = coreError(owner, '{core} has not confirmed this task. Reconnect to check its state.').message; publish(entry);
      } else finish(entry, 'failed', error.message);
      throw error;
    }
  }
  // activeTurn (w13-close-main-process): the thread's running turn, for a Cowork rewind that stops it first (main.cjs cowork-rewind).
  return { run, observe, assertAvailable, reserveMessage, isActive: id => active.has(id), activeTurn: id => active.get(id) ?? null,
    isReviewing: id => typeof id === 'string' && (reviewing.has(id) || (pending.get(id)?.operation === 'review' && pending.get(id)?.dispatched === true)), snapshot: () => [...pending.values()].filter(e => e.operation !== 'message').map(e => ({ threadId:e.threadId, operation:e.operation, phase:e.phase, turnId:e.turnId || null, activeTurnId:e.activeTurnId || null, error:e.error || null })) };
}
module.exports = { createSessionOperations, connectionMatches, reviewTarget };
