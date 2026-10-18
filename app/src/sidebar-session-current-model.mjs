import { resolveSessionDisplayState } from './generated/code-current/sidebar-session-state.mjs';
import { hasPendingApproval, latestTurnError } from './state.js';
import { describeTurnError } from './turn-error-model.mjs';
import { sessionArchived } from './sidebar-model.js';
import { currentSidebarPullRequest } from './sidebar-pr-current-model.mjs';

// shared-18 oD's inputs come from Anthropic stores. Project the local engine
// records into those inputs before running the original shared-8 ah function.
export function currentSidebarSession(session, state = {}, metadata = {}, { paneSelected = false, showPrStatus = true } = {}) {
  const archived = sessionArchived(session);
  const responding = !!state.active?.[session.id] || session.status?.type === 'active';
  const awaiting = hasPendingApproval(state, session.id) || session.liveStatus === 'awaiting' || session.pendingPermissions > 0;
  const error = latestTurnError(state, session.id);
  const errorView = error ? describeTurnError(error) : undefined;
  const hasError = !!(error || state.errors?.[session.id] || session.hasError);
  const unread = !!metadata.unread || (!!session.isUnread && !paneSelected);
  const pr = showPrStatus && !archived ? currentSidebarPullRequest(session) : undefined;
  const prState = pr?.state ?? 'none';
  const displayState = archived ? 'idle' : resolveSessionDisplayState({
    kind: 'code', hasError: hasError && !responding,
    liveStatus: awaiting ? 'awaiting' : responding || session.liveStatus === 'running' ? 'running' : 'idle',
    hasCompleted: unread, isUnread: unread, prState, explicitUnread: !!metadata.explicitUnread,
  });
  // shared-21 cq: PR state and unread are independent; a PR with unread gets
  // the unread mark, while its separate PR decoration remains available.
  const mark = displayState === 'pr' ? unread ? 'ready' : null : displayState === 'idle' ? null : displayState;
  return { archived, displayState, mark, prState, pr, unread,
    errorLabel: errorView?.headline,
    errorCategory: errorView?.category === 'network' ? 'network_error' : errorView?.category ?? session.errorCategory,
  };
}
