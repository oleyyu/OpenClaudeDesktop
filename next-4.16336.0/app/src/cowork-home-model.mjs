import { sessionSurface } from '../electron/surface-policy.mjs';
import { sessionArchived, sessionName } from './sidebar-model.js';
import { sessionTimestampMs } from './home-model.mjs';
import { isSubAgentThread, latestTurnError, ownerThreadId } from './state.js';

// Adapt local records to the original Cowork session/read-state contracts. The
// extracted GF/LF/zF functions retain responsibility for visibility and ordering.
export function coworkHomeState(sessions, metadata, state) {
  const permissions = new Map();
  for (const approval of state.approvals ?? []) {
    const id = ownerThreadId(state, approval.params?.threadId);
    if (!id) continue;
    if (!permissions.has(id)) permissions.set(id, []);
    permissions.get(id).push(approval);
  }
  const rows = sessions.filter(session => sessionSurface(session.id, metadata) === 'cowork'
    && !sessionArchived(session) && !isSubAgentThread(session) && !state.threadParents?.[session.id])
    .map(session => {
      const pending = permissions.get(session.id) ?? [];
      const isRunning = !!state.active?.[session.id] || session.status?.type === 'active' || session.liveStatus === 'running';
      return { sessionId: session.id, title: sessionName(session), isStarred: !!metadata[session.id]?.pinned,
        isRunning, liveStatus: pending.length ? 'awaiting' : isRunning ? 'running' : 'idle',
        lastActivityAt: sessionTimestampMs(session), error: latestTurnError(state, session.id) ?? state.errors?.[session.id] ?? session.hasError,
        pendingToolPermissions: pending };
    }).sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  const readState = { initializedAt: 0, sessions: {} };
  for (const row of rows) readState.sessions[row.sessionId] = metadata[row.sessionId]?.unread ? 0 : row.lastActivityAt;
  return { rows, readState, permissions, attentionIds: new Set(permissions.keys()) };
}
