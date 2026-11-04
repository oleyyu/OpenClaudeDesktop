// The session a sub-agent's card belongs to, when this window never saw the sub-agent start.
//
// A card names the thread that asks: a Codex sub-agent's (or its own sub-agent's) thread. The session that owns it is
// found through the parent links thread/started taught this window (state.js ownerThreadId). A window that mounted after
// the spawn (a reload, a new window, the other split side) never saw that event, and the background inventory reads
// only the open session: the card then showed in no transcript and flagged no sidebar row while the core waited on it.
// The thread's own record (thread/read) names its parent, so the chain is read up to a session this window knows.
import { isSubAgentThread, ownerThreadId } from "./state.js";

/** A thread's parent: Thread.parentThreadId, or the thread_spawn source's parent_thread_id. */
export const parentThreadOf = (thread) => thread?.parentThreadId || thread?.source?.subAgent?.thread_spawn?.parent_thread_id || null;

/** The owners (as far as this window can tell) of the pending cards that are no session it knows, each once. */
export function unknownCardOwners(state, knownIds) {
  const owners = new Set();
  for (const approval of state?.approvals || []) {
    const threadId = approval?.params?.threadId;
    if (typeof threadId !== "string" || !threadId) continue;
    const owner = ownerThreadId(state, threadId);
    if (owner && !knownIds.has(owner)) owners.add(owner);
  }
  return [...owners];
}

/**
 * Reads `threadId` and then each parent it names, until a thread `isKnown` (a session), one that is no sub-agent, or
 * `maxDepth` reads; `onThread` gets every sub-agent thread read (its parent link). Resolves true when the chain was
 * read to its end, false when a read failed (worth trying again later).
 */
export async function linkThreadOwner(threadId, { read, onThread, isKnown, maxDepth = 8 }) {
  let id = threadId;
  for (let depth = 0; id && !isKnown(id) && depth < maxDepth; depth++) {
    let thread;
    try { thread = await read(id); } catch { return false; }
    if (!thread?.id || !isSubAgentThread(thread)) return true;
    onThread(thread);
    id = parentThreadOf(thread);
  }
  return true;
}
