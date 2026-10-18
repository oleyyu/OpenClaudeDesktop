// R4f-proposal P3 (tasks-proposal-group-card WI-3): start a proposed task (spawn_task) as a new local session from
// inside the session that proposed it, without leaving that session — the host side of the 2.42304.0 spawner's
// local start (c96d752d0-BOCqU7c2.js F1e `ct`, the `$e.start` / `De` call).
//
// Official local branch (F1e ct, after its preconditions and the queue pop):
//   - the folder is `E = f$(v.cwd, g.originCwd, g.cwd) ?? g.originCwd` (the spawner works it out and passes `cwd`);
//   - X = $r(ai({id:`local_${uuid}`, title, cwd, type:"local", …}), {detached:!0, firstMessage}): the new row goes into the
//     sidebar detached, i.e. the window stays on the parent session (no navigation, no history entry);
//   - De({sessionId, cwd:E, message, title:v.title, spawnedFrom:x, useWorktree:ee&&!m, sourceBranch, model:k.model,
//     effort:k.effort, permissionMode:N, mcpServers…}) is LocalSessions.start: the session is created with its first
//     message, a worktree when asked (main's createWorktree; a folder that is not a Git repository is started in place:
//     "Skipping worktree creation - ${x} is not a git repository", asar index.chunk-BAdej_RQ.js), and the parent link
//     spawnedFrom {sessionId, taskId, title} recorded with it;
//   - a failed start removes the optimistic row (cse/Si) and rethrows to the spawner, which reports it.
//
// Host adapter: there is no LocalSessions.start, so the start is the host's own Code start steps in order —
// workspace-info / prepare-worktree, thread/start, the row (inserted, never selected), thread/name/set with the
// proposal's title, turn/start with the prompt, then the parent link through the "task-proposals" IPC (R4f-proposal P4,
// operation "started"). A thread whose first turn never started is discarded (send()'s discardFailedStart). The caller
// (main.jsx, R4f-proposal P5) passes rpc/call and the host's parameter builders, so this module only orders them; it
// never navigates and never touches the composer.
import { GIT_FAILURE_MESSAGES } from './git-dialog-model.mjs';

// The main-process channel of R4f-proposal P4 (app/electron/task-proposals.cjs): operation "started" records the child's
// spawnedFrom {sessionId: parent, taskId, proposal: true}; operation "outcome" records a proposal's dismissed / sent_here
// / start_failed result under the parent.
export const TASK_PROPOSALS_CHANNEL = 'task-proposals';
export const PROPOSAL_OUTCOMES = Object.freeze(['dismissed', 'sent_here', 'start_failed']);
// The outcomes the official renderer keeps in its results store (MQ) that the host persists through the IPC as they
// are recorded. "dismissed" is persisted by the pop instead (official popById(…, false) → main's resolved "dismissed").
const RECORDED_OUTCOMES = new Set(['sent_here', 'start_failed']);

export function proposalStartedRequest({ parentId, childId, taskId }) {
  return { operation: 'started', parentId, childId, taskId };
}
export function proposalOutcomeRequest({ parentId, taskId, outcome }) {
  return { operation: 'outcome', parentId, taskId, outcome };
}

const TASK_ID = /^task_[0-9a-f]{8}$/;
const errorOf = (message) => new Error(message);

// Starts one proposal. request (from the spawner, official De's fields):
//   {parentId, cwd, title, prompt, spawnedFrom?: {sessionId, taskId, title}, useWorktree, sourceBranch?, model, effort,
//    permissionMode}  (permissionMode in the official names: default / acceptEdits / plan / auto / bypassPermissions)
// deps:
//   call(name, payload)                                  main-process IPC (workspace-info, prepare-worktree, task-proposals)
//   rpc(method, params)                                  the core (thread/start, thread/name/set, turn/start)
//   toHostPermission(officialMode) → host permission     ask / acceptEdits / plan / auto / bypass (R4f-proposal P2 mapping)
//   threadStartParams({cwd, model, permission}) → params the Code thread/start params (main.jsx's startParams)
//   turnStartParams({cwd, prompt, model, effort, permission}) → {input, …turn options} (composerInput + turnOptions)
//   insertSession(thread, {name, cwd, parentId, spawnedFrom, model, effort, permission}) the row, never setCurrent
//   nameThread?(threadId, name)                          default thread/name/set (a core that names its own sessions skips it)
//   discardThread(threadId)                              discardFailedStart's background branch (row, metadata, thread/delete)
// Returns {sessionId, cwd, worktree, recorded}; throws when no session could be started (no thread is left behind).
export async function launchProposal(request, deps) {
  const { parentId, cwd, title, prompt, spawnedFrom, useWorktree = false, sourceBranch, model, effort, permissionMode } = request ?? {};
  const { call, rpc, toHostPermission, threadStartParams, turnStartParams, insertSession, discardThread } = deps;
  const nameThread = deps.nameThread ?? ((threadId, name) => rpc('thread/name/set', { threadId, name }));
  if (typeof cwd !== 'string' || !cwd) throw errorOf('This task has no folder to start in.');
  const text = typeof prompt === 'string' ? prompt : '';
  if (!text.trim()) throw errorOf('This task has no prompt to start with.');
  const permission = toHostPermission(permissionMode);
  // Worktree (main createWorktree): a Git repository gets its own worktree from the branch the session came from (the
  // folder's checked-out branch on the host, which records no sourceBranch); git that can't run inside a repository
  // fails the start with the host's Git message (gitFailureFromMessage turns it into the Git dialog); any other folder
  // starts in place, as main skips the worktree there.
  let turnCwd = cwd, worktree = false;
  if (useWorktree) {
    const workspace = await call('workspace-info', { cwd });
    if (workspace?.isRepo) {
      const prepared = await call('prepare-worktree', { cwd, branch: sourceBranch ?? workspace.branch ?? '' });
      if (typeof prepared !== 'string' || !prepared) throw errorOf('The worktree could not be created.');
      turnCwd = prepared;
      worktree = true;
    } else if (workspace?.gitUnavailable) throw errorOf(GIT_FAILURE_MESSAGES[workspace.gitUnavailable] ?? GIT_FAILURE_MESSAGES.missing);
  }
  const started = await rpc('thread/start', threadStartParams({ cwd: turnCwd, model, permission }));
  const thread = started?.thread;
  // A1e: "LocalSessions.start returned no sessionId".
  if (!thread?.id) throw errorOf('LocalSessions.start returned no sessionId');
  const name = String(title ?? '').trim();
  let turnStarted = false;
  try {
    insertSession(thread, { name, cwd: turnCwd, parentId, spawnedFrom, model, effort, permission });
    // The proposal's title names the session (official title: v.title). A refused rename keeps the core's default
    // title; the task still starts.
    if (name) { try { await nameThread(thread.id, name); } catch {} }
    await rpc('turn/start', { threadId: thread.id, ...turnStartParams({ cwd: turnCwd, prompt: text, model, effort, permission }) });
    turnStarted = true;
  } catch (error) {
    if (!turnStarted) { try { await discardThread(thread.id); } catch {} }
    throw error;
  }
  // spawnedFrom is written once the first turn is under way, so a discarded thread never leaves a parent link behind;
  // until then the card shows the row as starting (the spawner's spawning mark). The child runs whether or not the
  // link is saved; `recorded` says which.
  let recorded = false;
  const taskId = spawnedFrom?.taskId;
  if (typeof taskId === 'string' && TASK_ID.test(taskId) && spawnedFrom.sessionId) {
    try {
      await call(TASK_PROPOSALS_CHANNEL, proposalStartedRequest({ parentId: spawnedFrom.sessionId, childId: thread.id, taskId }));
      recorded = true;
    } catch {}
  }
  return { sessionId: thread.id, cwd: turnCwd, worktree, recorded };
}

// The host bridge the spawner calls where the official one calls $e (the desktop bridge):
//   popById(parentId, taskId, launched, record) — official popBackgroundTaskSuggestionById. The host keeps no proposal
//     queue in main (the queue is derived from the transcript), so a launched pop has nothing to remove; a dismissal
//     records "dismissed" in main and files the task for later (main's fileBackgroundTasksForLater(…, "dismissed"), the
//     host's task-backlog-file, best effort and only once the dismissal is saved);
//   sendMessage(parentId, text) — "Do it here": the caller's send into the parent session;
//   start(request) — launchProposal with deps.
export function createProposalBridge({ sendMessage, ...deps }) {
  const { call } = deps;
  return {
    async popById(parentId, taskId, launched, record) {
      if (launched) return true;
      await call(TASK_PROPOSALS_CHANNEL, proposalOutcomeRequest({ parentId, taskId, outcome: 'dismissed' }));
      if (record) {
        void Promise.resolve().then(() => call('task-backlog-file', { sessionId: parentId, source: 'dismissed', tasks: [{ taskId, title: record.title,
          tldr: record.tldr, prompt: record.prompt, cwd: record.cwd || undefined, suggestedAt: record.createdAt ?? record.suggestedAt }] })).catch(() => {});
      }
      return true;
    },
    sendMessage,
    start: (request) => launchProposal(request, deps),
  };
}

// The results store (official EQ: MQ record / NQ clear) with the host's persistence: sent_here and start_failed are
// saved in main as they are recorded (official keeps sent_here in its persisted kQ; the host also keeps start_failed,
// since its queue is re-derived from the transcript and would otherwise offer a failed start again after a restart).
export function withPersistedOutcomes(results, call) {
  return {
    record(parentId, taskId, outcome) {
      results.record(parentId, taskId, outcome);
      if (RECORDED_OUTCOMES.has(outcome) && typeof taskId === 'string' && TASK_ID.test(taskId))
        void Promise.resolve().then(() => call(TASK_PROPOSALS_CHANNEL, proposalOutcomeRequest({ parentId, taskId, outcome }))).catch(() => {});
    },
    clear(parentId, taskId) { results.clear(parentId, taskId); },
  };
}
