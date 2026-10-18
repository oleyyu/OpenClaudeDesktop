// Data adaptation for cc43287c9 P3/N3/M8 (2.42304.0). The generated model owns ranking, grouping and dismissals.
import { sessionTimestampMs } from './home-model.mjs';
import { checkedOutBranch, defaultBranch } from './branch-picker-model.mjs';

// M3: a session blocked on AskUserQuestion "asked a question"; one blocked only on tool permissions "needs permission".
// The local AskUserQuestion is the core's item/tool/requestUserInput request.
const QUESTION = 'item/tool/requestUserInput';
export function startAsk(methods = []) {
  return methods.length > 0 && !methods.includes(QUESTION) ? 'permission' : 'question';
}

/**
 * Home's sessions with what the start card needs. `approvals` are the pending requests ({sessionId, method}, sessionId
 * already the owning session of a sub-agent's request); a session with one awaits input and gets M3's ask. `awaiting`
 * (a Set of ids) still marks sessions awaiting input without a known request.
 */
export function startSessions(sessions, { metadata = {}, fields = {}, active = {}, errors = {}, awaiting = new Set(), approvals = [] } = {}) {
  const pending = new Map();
  for (const { sessionId, method } of approvals) {
    if (!sessionId) continue;
    if (!pending.has(sessionId)) pending.set(sessionId, []);
    pending.get(sessionId).push(method);
  }
  return sessions.filter(session => !session.archived && !session.isArchived && !metadata[session.id]?.archived).map(session => {
    const meta = metadata[session.id] || {};
    const recent = fields?.[session.id] || {};
    const at = sessionTimestampMs(session);
    const waiting = awaiting.has(session.id) || pending.has(session.id);
    return {
      id: session.id, type: 'local', title: String(session.title || session.name || '').replace(/\s+/g, ' ').trim(),
      cwd: session.cwd, originCwd: recent.originCwd ?? meta.originCwd ?? session.cwd,
      actualCwd: session.harnessCwd ?? session.worktreePath ?? session.cwd,
      running: !!active[session.id], awaiting: waiting, ask: waiting ? startAsk(pending.get(session.id)) : undefined,
      failed: !active[session.id] && !waiting && (!!errors[session.id] || Number.isFinite(meta.errorAt)),
      scheduled: !!(session.scheduledTaskId || meta.scheduledTaskId),
      stamp: String(at), failedAt: meta.errorAt ?? at, at,
    };
  });
}

/** P3 rows: awaiting sessions with a title ({id, type, isSsh, title, ask, stamp}); local sessions are never SSH. */
export function startWaitingSessions(sessions = []) {
  return sessions.filter(session => session.awaiting && session.title)
    .map(session => ({ id: session.id, type: 'local', isSsh: false, title: session.title, ask: session.ask ?? 'question', stamp: session.stamp }));
}

/** Host ranking of the recent folders (folder order, then the latest session started from each). */
export function environmentActivity(folders, sessions) {
  return new Map(folders.map((row, index) => [row.path, Math.max(folders.length - index,
    ...sessions.filter(session => session.originCwd === row.path).map(session => session.at))]));
}

/**
 * f6 items (T2.environmentItems): the named environments as `preset:<id>`. Host difference (D14): the local recent
 * folders follow as local items keyed by path; the official list has only named environments.
 */
export function startEnvironmentItems(savedEnvironments = [], folders = []) {
  return [
    ...savedEnvironments.map(row => ({ id: `preset:${row.id}`, icon: 'Laptop', name: row.name, target: row.target })),
    ...folders.map(row => ({ id: row.path, icon: 'Laptop', name: row.label, target: { kind: 'local', cwd: row.path } })),
  ];
}
/** d6 input (tn.environments): each named environment's target and last use under its item id. */
export function startEnvironmentRecords(savedEnvironments = []) {
  return savedEnvironments.map(row => ({ id: `preset:${row.id}`, target: row.target, lastUsedAt: row.lastUsedAt || row.createdAt || 0 }));
}

export function startSetupRows({ folder, sessions = [], workspace, worktree = false, starting = false, status } = {}) {
  const rows = [];
  if (starting) return rows;
  if (!folder) rows.push({ card: { id: 'choose-folder', blocksSend: true }, action: 'choose' });
  if (!folder || !workspace) return rows;
  const local = sessions.filter(session => session.cwd === folder || session.originCwd === folder);
  if (workspace.isRepo && local.some(session => session.running && session.actualCwd === folder)) {
    rows.push({ card: { id: 'worktree-apart', folder, taken: worktree }, action: 'worktree' });
  }
  const head = checkedOutBranch(workspace);
  const preferred = defaultBranch(workspace);
  if (!worktree && head && head === workspace.branch && preferred && head !== preferred && status?.workingTreeFiles > 0) {
    rows.push({ card: { id: 'continue-branch', folder, branch: head, files: status.workingTreeFiles }, action: 'continue' });
  }
  const failed = local.find(session => session.originCwd === folder && session.failed && session.title && !session.scheduled);
  // M8: the failed session's card carries on:"error" (R3 "Hit an error").
  if (failed) rows.push({ card: { id: 'resume-session', sessionId: failed.id, title: failed.title, on: 'error', stamp: String(failed.failedAt) }, action: 'resume' });
  return rows;
}
