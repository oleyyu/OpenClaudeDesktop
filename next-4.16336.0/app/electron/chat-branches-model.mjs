// w13-chatfn-branches (research/w13-chatfn.md chatfn-06/07/08): the local stand-in for claude.ai's message tree.
// Official 3.6556.2: a reply's Retry (shared-156 pz RETRY_MESSAGE_WITH_COMPLETION "retry_completion") and an edited
// prompt add a sibling under the same parent message; the conversation keeps every branch and shows one path
// (`current_leaf_message_uuid`). cc1aae219 lI draws `{selectedOption} / {totalOptions}` from the message's
// `selectedOption` (0-based) and `nOptions`, Previous disabled at the first, Next at the last; tO shows it only when
// `!isStreaming && optionCount > 1 && !isAgentMode`.
//
// Locally a conversation is a linear core thread, so a branch is a variant thread: thread/fork before the retried turn
// (lastTurnId = the turn before it; for the first turn a fork of it with the turn reverted), then the same prompt (Retry)
// or the new text (edit) sent there. A group lives in config.chatBranches[rootId]:
//   { root, members: [{ id, parent, anchor }], shown }
// members in creation order, the root first ({ id: root, parent: null, anchor: 0 }); a variant shares its parent's turns
// before `anchor` and owns the turn at `anchor` and after. `shown` is the version the sidebar row stands for. Pure: the
// main-process service (electron/chat-branches.mjs) and the renderer (source-chat-message-actions.jsx) share it.
// w13-close-chat-messages (chatfn-branches-03): a variant made by editing the prompt carries `kind: "edit"` — a new
// sibling of the human message (cc1aae219 lI with `sender === "human"`, the user-message-*-version testids); a Retry
// (no kind) is a new sibling of the reply under the same human message (the action-bar-*-version testids).

export const CHAT_BRANCH_LIMIT = 50; // variants per conversation, so a stuck retry loop cannot grow the config forever
const ID = /^[\w.:-]{1,200}$/;
const validId = (value) => typeof value === 'string' && ID.test(value);

/** A group read from disk, or null when it is not one. Unknown parents and repeated ids are dropped. */
export function normalizeGroup(value, rootId = value?.root) {
  if (!value || typeof value !== 'object' || !validId(rootId) || value.root !== rootId) return null;
  const members = [{ id: rootId, parent: null, anchor: 0 }];
  const seen = new Set([rootId]);
  for (const entry of Array.isArray(value.members) ? value.members : []) {
    if (!entry || !validId(entry.id) || seen.has(entry.id) || !seen.has(entry.parent)) continue;
    if (!Number.isInteger(entry.anchor) || entry.anchor < 0) continue;
    members.push({ id: entry.id, parent: entry.parent, anchor: entry.anchor, ...(entry.kind === 'edit' ? { kind: 'edit' } : {}) });
    seen.add(entry.id);
    if (members.length > CHAT_BRANCH_LIMIT + 1) break;
  }
  if (members.length < 2) return null;
  const shown = seen.has(value.shown) ? value.shown : rootId;
  return { root: rootId, members, shown };
}

/** config.chatBranches, normalized: { [rootId]: group }. A thread belongs to at most one group. */
export function normalizeGroups(value) {
  const groups = {};
  const owned = new Set();
  for (const [root, group] of Object.entries(value && typeof value === 'object' ? value : {})) {
    const normal = normalizeGroup(group, root);
    if (!normal || normal.members.some((member) => owned.has(member.id))) continue;
    for (const member of normal.members) owned.add(member.id);
    groups[root] = normal;
  }
  return groups;
}

/** The group a thread is in (as root or variant), or null. */
export function groupOf(groups, threadId) {
  if (!validId(threadId)) return null;
  for (const group of Object.values(groups || {})) if (group?.members?.some((member) => member.id === threadId)) return group;
  return null;
}

const memberOf = (group, id) => group?.members?.find((member) => member.id === id) ?? null;

/** The thread whose own turn is at `index` in thread `id`'s conversation (the message node), or null. */
export function ownerAt(group, id, index) {
  let member = memberOf(group, id);
  for (let hops = 0; member && hops <= group.members.length; hops += 1) {
    if (index >= member.anchor) return member.id;
    member = memberOf(group, member.parent);
  }
  return null;
}

/**
 * The thread that holds the human message of the turn at `index` as thread `id` shows it: the turn's owner, or — while
 * that owner is a Retry made at this turn (a new reply under the same prompt) — the owner its parent shows there.
 */
export function humanNodeAt(group, id, index) {
  let owner = ownerAt(group, id, index);
  for (let hops = 0; owner && hops <= group.members.length; hops += 1) {
    const member = memberOf(group, owner);
    if (!member || member.parent === null || member.anchor !== index || member.kind === 'edit') return owner;
    owner = ownerAt(group, member.parent, index);
  }
  return owner;
}

/**
 * The versions of the turn at `index` in thread `threadId`: lI's message fields and where Previous / Next go.
 *   sender "assistant" (default): the replies under the prompt `threadId` shows there — that prompt's own reply plus
 *     every Retry made under it, in creation order;
 *   sender "human": the prompts — the one the edits replaced plus every edit made at that turn under the same earlier
 *     path, in creation order (selecting one shows that edit's thread).
 * null when the message has one version.
 * @returns {{ selectedOption: number, nOptions: number, previous: string|null, next: string|null }|null}
 */
export function versionsAt(groups, threadId, index, { sender = 'assistant' } = {}) {
  const group = groupOf(groups, threadId);
  if (!group || !Number.isInteger(index) || index < 0) return null;
  const path = index === 0 ? null : ownerAt(group, threadId, index - 1);
  const human = sender === 'human';
  const prompt = humanNodeAt(group, threadId, index);
  const options = new Set(human ? [] : [prompt]);
  for (const member of group.members) {
    if (member.parent === null || member.anchor !== index) continue;
    if (index > 0 && ownerAt(group, member.parent, index - 1) !== path) continue;
    if (human) {
      if (member.kind !== 'edit') continue;
      const replaced = humanNodeAt(group, member.parent, index);
      if (replaced) options.add(replaced);
      options.add(member.id);
    } else if (member.kind !== 'edit' && humanNodeAt(group, member.parent, index) === prompt) options.add(member.id);
  }
  if (options.size < 2) return null;
  const order = group.members.map((member) => member.id).filter((id) => options.has(id));
  const current = human ? prompt : ownerAt(group, threadId, index);
  const selected = order.indexOf(current);
  if (selected < 0) return null;
  return { selectedOption: selected, nOptions: order.length, previous: order[selected - 1] ?? null, next: order[selected + 1] ?? null };
}

/** cc1aae219 lI's numbers: `r=(selectedOption??0)+1, i=nOptions??0, a=r<=1, o=r>=i`. */
export function versionNavState(message) {
  const option = (message?.selectedOption ?? 0) + 1, total = message?.nOptions ?? 0;
  return { option, total, previousDisabled: option <= 1, nextDisabled: option >= total };
}

/** tO: the switcher shows for a settled reply with more than one version. */
export const showVersionNav = ({ isStreaming = false, optionCount = 0 } = {}) => !isStreaming && optionCount > 1;

/**
 * How a variant of the turn at `index` is made from the thread's turn ids (oldest first): fork after the turn before it,
 * or, for the first turn, fork it and revert it in the copy (needs thread/revert). null when it cannot be made.
 */
export function variantPlan(turnIds, index, { revertServed = false } = {}) {
  if (!Array.isArray(turnIds) || !Number.isInteger(index) || index < 0 || index >= turnIds.length) return null;
  if (index > 0) return validId(turnIds[index - 1]) ? { lastTurnId: turnIds[index - 1], revert: false } : null;
  return revertServed && validId(turnIds[0]) ? { lastTurnId: turnIds[0], revert: true } : null;
}

/**
 * w13-close-chat-messages (chatfn-branches-04): the turn's index in the whole conversation. `turnIds` is the core's own
 * order (thread/read, from the "chat-branches" list); a turn the list predates (sent since) counts on from the last
 * listed turn the transcript has loaded before it. Without the list, the loaded transcript's order (turnIndexOf).
 */
export function turnIndexIn(turnIds, items, turnId) {
  const loaded = turnIndexOf(items, turnId);
  if (!Array.isArray(turnIds) || !turnIds.length || !turnId) return loaded;
  const listed = turnIds.indexOf(turnId);
  if (listed >= 0) return listed;
  if (loaded < 0) return -1;
  const order = [];
  for (const item of Array.isArray(items) ? items : []) if (typeof item?.turnId === 'string' && item.turnId && !order.includes(item.turnId)) order.push(item.turnId);
  for (let at = loaded - 1; at >= 0; at -= 1) {
    const known = turnIds.indexOf(order[at]);
    if (known >= 0) return known + (loaded - at);
  }
  return -1;
}

/** The turn's index among the transcript's turns (distinct turn ids in order), or -1. */
export function turnIndexOf(items, turnId) {
  if (!turnId) return -1;
  const order = [];
  for (const item of Array.isArray(items) ? items : []) if (typeof item?.turnId === 'string' && item.turnId && order.at(-1) !== item.turnId && !order.includes(item.turnId)) order.push(item.turnId);
  return order.indexOf(turnId);
}

/** groups with variant `id` of `parent` at `anchor` added (a new group when the parent has none); it becomes shown. */
export function addVariant(groups, { parent, id, anchor, kind }) {
  if (!validId(parent) || !validId(id) || parent === id || !Number.isInteger(anchor) || anchor < 0) throw new Error('Invalid chat branch.');
  const current = normalizeGroups(groups);
  if (groupOf(current, id)) throw new Error('This chat is already a version of another chat.');
  const group = groupOf(current, parent) ?? { root: parent, members: [{ id: parent, parent: null, anchor: 0 }], shown: parent };
  if (group.members.length > CHAT_BRANCH_LIMIT) throw new Error('This chat has too many versions.');
  return { ...current, [group.root]: { root: group.root, members: [...group.members, { id, parent, anchor, ...(kind === 'edit' ? { kind: 'edit' } : {}) }], shown: id } };
}

/** groups with `id` shown for its conversation. */
export function selectVariant(groups, id) {
  const current = normalizeGroups(groups);
  const group = groupOf(current, id);
  if (!group) throw new Error('This chat has no other versions.');
  return { ...current, [group.root]: { ...group, shown: id } };
}

/**
 * groups without thread `id`. Its own branches go with it (they continue its turns); a removed shown version falls back
 * to its parent. Removing the root removes the whole group. Returns { groups, removed: ids, shown: id|null }.
 */
export function removeVariant(groups, id) {
  const current = normalizeGroups(groups);
  const group = groupOf(current, id);
  if (!group) return { groups: current, removed: [], shown: null };
  const removed = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const member of group.members) if (!removed.has(member.id) && removed.has(member.parent)) { removed.add(member.id); grew = true; }
  }
  const next = { ...current };
  delete next[group.root];
  const members = group.members.filter((member) => !removed.has(member.id));
  if (removed.has(group.root) || members.length < 2) {
    const kept = removed.has(group.root) ? [] : members.map((member) => member.id);
    return { groups: next, removed: [...removed], shown: kept[0] ?? null };
  }
  let shown = group.shown;
  if (removed.has(shown)) { let member = memberOf(group, shown); while (member && removed.has(member.id)) member = memberOf(group, member.parent); shown = member?.id ?? group.root; }
  next[group.root] = { root: group.root, members, shown };
  return { groups: next, removed: [...removed], shown };
}

/**
 * The session list hides every version of a branched conversation but the one it shows. Read from sessionMetadata
 * alone: a variant carries `chatBranchOf: rootId`, the root `chatBranchShown: id`. A group whose shown version is gone
 * stays hidden until the service prunes it.
 */
export function hiddenChatVersion(id, metadata = {}) {
  const own = metadata?.[id];
  const variant = typeof own?.chatBranchOf === 'string' && own.chatBranchOf;
  const shown = (variant ? metadata?.[own.chatBranchOf] : own)?.chatBranchShown;
  if (variant) return shown !== id;
  return typeof shown === 'string' && shown !== id;
}

/** sessionMetadata with the service's patch applied ({ id: metadata } replaces, { id: null } removes). */
export function applyMetadataPatch(metadata, patch) {
  if (!patch || typeof patch !== 'object' || !Object.keys(patch).length) return metadata;
  const next = { ...(metadata || {}) };
  for (const [id, value] of Object.entries(patch)) { if (value && typeof value === 'object') next[id] = value; else delete next[id]; }
  return next;
}
