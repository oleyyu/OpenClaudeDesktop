// Leaving a session on the DeepSeek core releases it (thread/unsubscribe):
// a loaded Harness session holds its log's write lock, so a session merely
// viewed here could not be continued in the DeepSeek app until OpenClaude Desktop
// quit. Only an idle session is released; turn/start, thread/resume and
// the session actions reopen it through the core when it is used again.
// Codex keeps every resumed thread subscribed (unchanged).
import { coreSupports } from "../electron/core-registry.mjs";

/**
 * What a session still has in flight, over the renderer state: an open turn
 * (its own or a sub-agent's) and approval/question cards. Threads map to
 * their session through `ownerOf` (state.js ownerThreadId); a card without a
 * threadId counts for every session, so it never releases one by mistake.
 * @param {{id: string, active?: Record<string, string|null>, approvals?: Array<{params?: {threadId?: string}}>, ownerOf?: (threadId: string) => string}} input
 * @returns {{active: boolean, pendingApproval: boolean}}
 */
export function sessionWork({ id, active = {}, approvals = [], ownerOf = (threadId) => threadId }) {
  const owned = (threadId) => typeof threadId === "string" && threadId !== "" && ownerOf(threadId) === id;
  return {
    active: Object.entries(active).some(([threadId, turnId]) => Boolean(turnId) && owned(threadId)),
    pendingApproval: approvals.some((approval) => !approval?.params?.threadId || owned(approval.params.threadId)),
  };
}

/**
 * Whether navigating from `previous` to `next` should unsubscribe `previous`.
 * @param {{previous?: string|null, next?: string|null, engine?: string, active?: boolean, pendingApproval?: boolean, queued?: boolean, resumed?: Set<string>}} input
 *   engine: coreEngine(boot.core); active: a turn, send or session action is
 *   running for it; resumed: the ids this window resumed (only those are loaded).
 */
export function shouldUnload({ previous, next, engine, active = false, pendingApproval = false, queued = false, resumed } = {}) {
  if (!coreSupports(engine, "unloadOnNavigate") || !previous || previous === next) return false;
  if (active || pendingApproval || queued) return false;
  return resumed instanceof Set && resumed.has(previous);
}
