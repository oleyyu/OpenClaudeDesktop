// W14-code r4 sidebar-new fr4-06: the host data behind the Code sidebar's Routines section (generated/sidebar-routines,
// shared-21 Q4 / JK). Pure functions; src/source-sidebar-routines.jsx mounts them.
//
//   routineRunEntries(rows, ctx)   shared-21 NG's entries (the session list's CCD sessions) for the host's routine runs:
//                                  { scheduledTaskId, isArchived, item }, where item is the list item shared-11 xC builds
//                                  for a CCD session — { ref {kind:"code", id}, title, updatedAtMs, createdAtMs,
//                                  liveStatus, isRunning, isResponding, hasPendingApproval, hasError, pendingPermissions,
//                                  hasCompleted, isUnread, isStarred, source {kind:"code", data} }. The runs are
//                                  code-routine-model codeRoutineSessions (every run the scheduler recorded with a
//                                  session, plus sessions whose metadata names a task). liveStatus follows xC's order: a
//                                  pending approval is "awaiting" (pendingPermissions 1), a running turn "running", else
//                                  "idle"; xC's hasCompleted is its isUnread.
//   routineUnreadState(metadata)   shared-11 Xb's { unreadIds, explicitUnreadIds } over sessionMetadata: unread is the
//                                  stored flag, explicit the stored explicitUnread (electron/sidebar-read-state.cjs: an unread
//                                  mark that was not automatic).
//   routinesPathname(view)         the desktop route the window shows, for the rows' selection (y3's $e / it over
//                                  h3 `/code/routines/<id>` and l3 `/code/<sessionId>`).
import { codeRoutineSessions } from './code-routine-model.mjs';

export function routineRunEntries(rows, { sessions = [], metadata = {}, state = {} } = {}) {
  return codeRoutineSessions(rows, { sessions, metadata, state }).map((run) => {
    const pending = Array.isArray(run.pendingToolPermissions) ? run.pendingToolPermissions.length : 0;
    const liveStatus = pending > 0 ? 'awaiting' : run.isRunning ? 'running' : 'idle';
    const isUnread = metadata?.[run.sessionId]?.unread === true;
    const updatedAtMs = Number.isFinite(run.lastActivityAt) ? run.lastActivityAt : Number.isFinite(run.createdAt) ? run.createdAt : 0;
    const createdAtMs = Number.isFinite(run.createdAt) ? run.createdAt : updatedAtMs;
    return {
      scheduledTaskId: run.scheduledTaskId,
      isArchived: run.isArchived === true,
      item: {
        ref: { kind: 'code', id: run.sessionId },
        title: run.title || null,
        updatedAtMs,
        createdAtMs,
        liveStatus,
        isRunning: liveStatus !== 'idle',
        isResponding: run.isRunning === true,
        hasPendingApproval: pending > 0,
        hasError: !!run.error,
        pendingPermissions: +(liveStatus === 'awaiting'),
        hasCompleted: isUnread,
        isUnread,
        isStarred: false,
        source: { kind: 'code', data: { id: run.sessionId, title: run.title, scheduledTaskId: run.scheduledTaskId, ...(run.error && { error: run.error }) } },
      },
    };
  });
}

export function routineRunFacts(entries) {
  return new Map((entries ?? []).map((entry) => [entry.item.ref.id, entry.item]));
}

export function routineUnreadState(metadata) {
  const unreadIds = [], explicitUnreadIds = [];
  for (const [id, meta] of Object.entries(metadata ?? {})) {
    if (meta?.unread !== true) continue;
    unreadIds.push(id);
    if (meta.explicitUnread === true) explicitUnreadIds.push(id);
  }
  return { unreadIds, explicitUnreadIds };
}

export function routinesPathname({ mode = 'code', section = null, routineId = null, sessionId = null } = {}) {
  if (mode !== 'code') return `/${mode}`;
  if (section === 'routines') return routineId ? `/code/routines/${encodeURIComponent(routineId)}` : '/code/routines';
  return sessionId ? `/code/${encodeURIComponent(sessionId)}` : '/code';
}
