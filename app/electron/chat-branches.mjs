// w13-chatfn-branches: Chat versions (Retry a reply, resend an edited prompt, switch versions) on the local core.
// Official 3.6556.2 keeps them as siblings in the claude.ai message tree (shared-156 pz "retry_completion",
// `current_leaf_message_uuid`); here each version is a core thread forked before the retried turn
// (electron/chat-branches-model.mjs). The groups live in config.chatBranches; a variant's sessionMetadata carries
// `chatBranchOf` (and the root's `chatBranchShown`) so the session list shows one row per conversation
// (surface-policy.mjs surfaceSessions). Nothing leaves this computer.
//
// Operations ("chat-branches" host call):
//   list           { threadId }                      → { group, turnIds }  (turnIds: the core's turn order of a
//                  branched chat, so the renderer places a version by turn id, not by how much history it loaded)
//   create-variant { threadId, turnId, kind?, permission, expected?, afterPlan? }  (kind "edit": an edited prompt,
//                  w13-close-chat-messages chatfn-branches-03; otherwise a Retry of the reply)
//                  → { thread, sessionMetadata, group, metadata }   (the renderer then sends the prompt there)
//   select         { threadId }                       → { group, metadata }
//   remove         { threadId, deleteThreads? }       → { group, removed, metadata }
//   prune          {}                                 → { removed }  (groups whose shown version was deleted)
//
// w13-chatfn-history (closeout chatfn-branches-06, "Pin follows the version"): the sidebar row of a branched
// conversation is its shown version, so when another version is shown (Retry, an edit, Previous / Next, a removed shown
// version) a Pin moves with it: sessionMetadata `pinned` and its place in config.pinnedOrder go to the version now shown,
// and `pinMoved(from, to)` lets main mirror the sections and refresh every window's sidebar.
import { addVariant, groupOf, normalizeGroups, removeVariant, selectVariant, variantPlan } from './chat-branches-model.mjs';
import { sessionSurface } from './surface-policy.mjs';

const OPERATIONS = new Set(['list', 'create-variant', 'select', 'remove', 'prune']);

/**
 * @param {object} deps
 * @param {() => object} deps.getConfig   the app config (threadIds, threadMetadata, sessionMetadata, chatBranches)
 * @param {() => void} deps.save
 * @param {(payload: object) => Promise<{thread: object, sessionMetadata: object}>} deps.fork  session-operations fork
 * @param {(method: string, params: object) => Promise<any>} deps.request  the core the chat runs on
 * @param {() => boolean} [deps.revertServed]  whether that core serves thread/revert
 * @param {(threadId: string) => Promise<unknown>} [deps.deleteThread]  thread/delete with the app's own bookkeeping
 */
export function createChatBranches({ getConfig, save, fork, request, revertServed = () => true, deleteThread = null, pinMoved = null }) {
  let queue = Promise.resolve();
  const groups = () => normalizeGroups(getConfig().chatBranches);
  const metadataPatch = (config, ids) => Object.fromEntries([...new Set(ids)].filter(Boolean).map((id) => [id, config.sessionMetadata?.[id] ?? null]));

  // A Pin follows the shown version: `pinned` and the pinnedOrder place move from `from` to `to`.
  function followPin(config, from, to) {
    const meta = config.sessionMetadata;
    if (!from || !to || from === to || meta?.[from]?.pinned !== true || !(config.threadIds?.includes(to) || config.archivedThreadIds?.includes(to))) return false;
    const { pinned, ...rest } = meta[from];
    void pinned;
    meta[from] = rest;
    meta[to] = { ...meta[to], pinned: true };
    const order = Array.isArray(config.pinnedOrder) ? config.pinnedOrder : [];
    config.pinnedOrder = order.includes(to) ? order.filter((id) => id !== from) : order.map((id) => (id === from ? to : id));
    return true;
  }

  // Mirror the group into sessionMetadata: every variant names its root, the root names the shown version.
  function store(config, next, touched = []) {
    const before = normalizeGroups(config.chatBranches);
    config.chatBranches = next;
    config.sessionMetadata ??= {};
    const ids = new Set(touched);
    const moved = [];
    for (const [root, group] of Object.entries(next)) {
      const was = before[root]?.shown;
      if (was && was !== group.shown && followPin(config, was, group.shown)) { moved.push([was, group.shown]); ids.add(was); ids.add(group.shown); }
    }
    for (const group of [...Object.values(before), ...Object.values(next)]) for (const member of group.members) ids.add(member.id);
    for (const id of ids) {
      const group = groupOf(next, id), meta = config.sessionMetadata[id];
      if (!meta && !group) continue;
      const { chatBranchOf, chatBranchShown, ...rest } = meta ?? {};
      void chatBranchOf; void chatBranchShown;
      if (!config.threadIds?.includes(id) && !config.archivedThreadIds?.includes(id)) continue;
      config.sessionMetadata[id] = !group ? rest
        : group.root === id ? { ...rest, chatBranchShown: group.shown } : { ...rest, chatBranchOf: group.root };
    }
    save();
    for (const [from, to] of moved) { try { pinMoved?.(from, to); } catch { /* the sidebar catches up on its next refresh */ } }
    return metadataPatch(config, ids);
  }

  function chatThread(config, threadId) {
    if (typeof threadId !== 'string' || !config.threadIds?.includes(threadId)) throw new Error('Open an active chat first.');
    if (sessionSurface(threadId, config.sessionMetadata) !== 'chat') throw new Error('Versions are only available in Chat.');
  }

  async function turnIdsOf(threadId) {
    const result = await request('thread/read', { threadId, includeTurns: true });
    return (Array.isArray(result?.thread?.turns) ? result.thread.turns : []).map((turn) => turn?.id).filter((id) => typeof id === 'string' && id);
  }

  async function createVariant(p) {
    const config = getConfig();
    chatThread(config, p.threadId);
    if (typeof p.turnId !== 'string' || !p.turnId) throw new Error('Choose a reply to retry.');
    const turnIds = await turnIdsOf(p.threadId);
    const anchor = turnIds.indexOf(p.turnId);
    if (anchor < 0) throw new Error('This reply is no longer in the chat.');
    const plan = variantPlan(turnIds, anchor, { revertServed: revertServed() });
    if (!plan) throw new Error('This reply can’t be retried with the current model.');
    const existing = groupOf(groups(), p.threadId);
    const root = existing?.root ?? p.threadId;
    const name = config.threadMetadata?.[root]?.name || config.threadMetadata?.[p.threadId]?.name || undefined;
    const result = await fork({ operation: 'fork', threadId: p.threadId, lastTurnId: plan.lastTurnId, permission: p.permission, mode: 'chat',
      expected: p.expected, afterPlan: p.afterPlan, ...(name ? { name } : {}) });
    const thread = result?.thread;
    if (!thread?.id || thread.id === p.threadId) throw new Error('The chat could not be branched.');
    try {
      if (plan.revert) {
        // The first turn has no turn before it to fork after: the copy keeps it, then drops it (thread/revert).
        const copied = await turnIdsOf(thread.id);
        if (copied.length) await request('thread/revert', { threadId: thread.id, beforeTurnId: copied.at(-1) });
      }
    } catch (error) {
      if (deleteThread) await deleteThread(thread.id).catch(() => {});
      throw error;
    }
    const latest = getConfig();
    // A version is not a fork the user made: no "Forked here" marker in its parent.
    const { forkedFrom, forkedAtTurn, ...meta } = latest.sessionMetadata?.[thread.id] ?? {};
    void forkedFrom; void forkedAtTurn;
    latest.sessionMetadata ??= {};
    latest.sessionMetadata[thread.id] = { ...meta, surface: 'chat' };
    const next = addVariant(groups(), { parent: p.threadId, id: thread.id, anchor, kind: p.kind === 'edit' ? 'edit' : undefined });
    const metadata = store(latest, next, [thread.id, p.threadId]);
    return { thread, sessionMetadata: latest.sessionMetadata[thread.id], group: next[root], metadata };
  }

  async function remove(p) {
    const config = getConfig();
    const { groups: next, removed, shown } = removeVariant(groups(), p.threadId);
    if (!removed.length) return { group: null, removed: [], metadata: {} };
    const metadata = store(config, next, [...removed, ...(shown ? [shown] : [])]);
    if (p.deleteThreads === true && deleteThread)
      for (const id of removed) if (id !== p.threadId && (config.threadIds?.includes(id) || config.archivedThreadIds?.includes(id))) await deleteThread(id).catch(() => {});
    return { group: shown ? groupOf(next, shown) : null, removed, metadata };
  }

  // A conversation is deleted from its sidebar row, which is its shown version: once that thread is gone the other
  // versions go too (cascade), so nothing hidden is left behind in the core's storage.
  async function prune() {
    const config = getConfig(), current = groups();
    const removed = [];
    const known = (id) => config.threadIds?.includes(id) || config.archivedThreadIds?.includes(id);
    let next = current;
    for (const group of Object.values(current)) {
      if (known(group.shown)) continue;
      next = { ...next };
      delete next[group.root];
      for (const member of group.members) if (known(member.id)) {
        removed.push(member.id);
        if (deleteThread) await deleteThread(member.id).catch(() => {});
      }
    }
    if (next !== current) store(getConfig(), next, removed);
    return { removed };
  }

  async function handle(p) {
    if (!p || !OPERATIONS.has(p.operation)) throw new Error('Unknown chat version operation.');
    if (p.operation === 'prune') return prune();
    if (p.operation === 'list') {
      const group = groupOf(groups(), p.threadId);
      // w13-close-chat-messages (chatfn-branches-04): a branched chat's turn order from the core.
      const turnIds = group ? await turnIdsOf(p.threadId).catch(() => null) : null;
      return { group, turnIds };
    }
    if (p.operation === 'create-variant') return createVariant(p);
    if (p.operation === 'select') {
      const config = getConfig();
      chatThread(config, p.threadId);
      const next = selectVariant(groups(), p.threadId);
      const group = groupOf(next, p.threadId);
      return { group, metadata: store(config, next, [p.threadId]) };
    }
    return remove(p);
  }

  // One operation at a time: a retry's fork and a version switch never interleave their config writes.
  function run(p) {
    const job = queue.then(() => handle(p));
    queue = job.catch(() => {});
    return job;
  }
  return { run };
}
