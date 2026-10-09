import { t, tn } from "../electron/i18n/index.mjs";
// Queued / steered messages (2.2553.1 cc43287c9 :28296-28345, :28980-29000;
// cf74bc599 :3889-4240) over the real Codex 0.155.1 app-server queue:
// thread/queue/add|list|update|delete|reorder|start, thread/queue/changed and
// turn/steer. Lanes: Enter while a turn runs = "next" (turn/steer),
// Cmd+Enter = "later" (thread/queue/add). Entries are QueuedSubmission
// {id,input,clientUserMessageId}; the bar only renders what the server lists.
export const QUEUE_LANES = Object.freeze({ next: "steer", later: "queued" });

export function emptyQueue(threadId = null) {
  return { threadId, entries: [], lockedIds: [], revision: 0 };
}

// Official wG: an explicit "later" (or stayOnDraft) forces the queue; without
// a running turn everything is a plain send. Enter while running steers.
export function submitLane({ running, priority, stayOnDraft = false }) {
  if (!running) return "send";
  if (priority === "later" || stayOnDraft) return "later";
  return priority === "next" || priority === undefined ? "next" : "later";
}

// thread/queue/list → {data:[QueuedSubmission], nextCursor}. Any other shape is
// treated as empty rather than invented.
export function queueFromList(response, threadId = null, previous = emptyQueue(threadId)) {
  const data = Array.isArray(response?.data) ? response.data : Array.isArray(response?.entries) ? response.entries : [];
  const entries = data
    .filter((entry) => entry && typeof entry.id === "string" && Array.isArray(entry.input))
    .map((entry) => ({ id: entry.id, input: entry.input, clientUserMessageId: entry.clientUserMessageId ?? null, preview: previewText(entry.input) }));
  const ids = new Set(entries.map((entry) => entry.id));
  return { threadId, entries, lockedIds: previous.lockedIds.filter((id) => ids.has(id)), revision: previous.revision + 1 };
}

// A steer's own words, whitespace-collapsed (its text parts without hidden reminders): what a core that doesn't echo
// clientUserMessageId shows in its userMessage item. "" when the steer has no text.
export function steerInputText(input = []) {
  return (Array.isArray(input) ? input : []).filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text.replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g, "")).join(" ").replace(/\s+/g, " ").trim();
}
/** How many userMessage items without a clientId carry `text` (steerInputText of their content). */
export function steerTextCount(items, text) {
  if (!text || !Array.isArray(items)) return 0;
  let count = 0;
  for (const item of items) if (item?.type === "userMessage" && !item.clientId && steerInputText(item.content) === text) count++;
  return count;
}

// Official ep: text parts joined by a space, images become "[Image]", empty → "…".
export function previewText(input = []) {
  const parts = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    // A hidden workflow reminder (the "ultracode" keyword's, electron/workflow-reminders.mjs) is not the user's words.
    if (item.type === "text" && typeof item.text === "string") parts.push(item.text.replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g, ""));
    else if (item.type === "mention" || item.type === "skill") parts.push(`@${item.name ?? item.path ?? ""}`);
    else if (item.type === "image" || item.type === "localImage") parts.push(t("[Image]"));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim() || "…";
}

export function queuedCountLabel(count) {
  return tn(count, "{count} message queued", "{count} messages queued");
}

export function lockEntry(queue, id) {
  if (!queue.entries.some((entry) => entry.id === id) || queue.lockedIds.includes(id)) return queue;
  return { ...queue, lockedIds: [...queue.lockedIds, id] };
}

export function unlockEntry(queue, id) {
  return queue.lockedIds.includes(id) ? { ...queue, lockedIds: queue.lockedIds.filter((entry) => entry !== id) } : queue;
}

// Optimistic removal with a rollback that restores the entry at its index.
export function optimisticRemove(queue, id) {
  const index = queue.entries.findIndex((entry) => entry.id === id);
  if (index < 0) return { queue, rollback: () => queue };
  const entry = queue.entries[index];
  const next = { ...queue, entries: queue.entries.filter((item) => item.id !== id), lockedIds: queue.lockedIds.filter((item) => item !== id), revision: queue.revision + 1 };
  return {
    queue: next,
    rollback: (current = next) => {
      if (current.entries.some((item) => item.id === id)) return current;
      const entries = current.entries.slice();
      entries.splice(Math.min(index, entries.length), 0, entry);
      return { ...current, entries, revision: current.revision + 1 };
    },
  };
}

// Move `fromId` to the slot of `toId` (dnd-kit arrayMove semantics).
export function reorderEntries(entries, fromId, toId) {
  const from = entries.findIndex((entry) => entry.id === fromId);
  const to = entries.findIndex((entry) => entry.id === toId);
  if (from < 0 || to < 0 || from === to) return entries;
  const next = entries.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function optimisticReorder(queue, fromId, toId) {
  const entries = reorderEntries(queue.entries, fromId, toId);
  if (entries === queue.entries) return { queue, rollback: () => queue, ids: queue.entries.map((entry) => entry.id) };
  const next = { ...queue, entries, revision: queue.revision + 1 };
  // The rollback undoes the move only: the entries still queued go back to their earlier order (their current
  // objects), and one that arrived meanwhile stays after them; one that left meanwhile is not brought back.
  const rollback = (current = next) => {
    const live = new Map(current.entries.map((entry) => [entry.id, entry]));
    const before = new Set(queue.entries.map((entry) => entry.id));
    const restored = queue.entries.filter((entry) => live.has(entry.id)).map((entry) => live.get(entry.id));
    return { ...current, entries: [...restored, ...current.entries.filter((entry) => !before.has(entry.id))], revision: current.revision + 1 };
  };
  return { queue: next, rollback, ids: entries.map((entry) => entry.id) };
}

// ↑ in an empty editor takes back the newest entry that can still be cancelled (cc43287c9-BMbiZYzF.js
// :31152-31156 _o: findLast of the non-seeded deferred/queued entries); locked (in-flight) entries are
// skipped. null when nothing can be dequeued, so ↑ falls through to prompt history.
export function lastDequeueable(queue) {
  const entries = Array.isArray(queue?.entries) ? queue.entries : [];
  const locked = new Set(queue?.lockedIds || []);
  for (let index = entries.length - 1; index >= 0; index--) if (!locked.has(entries[index].id)) return entries[index];
  return null;
}

// Text restored into the composer for "Edit in composer": the joined text
// parts, plus the file/image items that the composer can re-stage. A skill
// item comes back as its leading '/name' (the skill chip's text form, which
// the next submit turns into the skill item again).
export function editableDraft(entry) {
  const input = entry?.input || [];
  const skill = input.find((item) => item?.type === "skill" && typeof item.name === "string" && item.name);
  // The keyword's hidden reminder stays out of the editable text (the keyword in the text brings it back on send).
  const body = input.filter((item) => item?.type === "text" && !(typeof item.text === "string" && item.text.startsWith("<system-reminder>"))).map((item) => item.text).join("\n");
  const text = skill ? `/${skill.name}${body ? ` ${body}` : " "}` : body;
  const attachments = input.filter((item) => item?.type === "localImage" || item?.type === "mention");
  return { text, attachments };
}

// 'Send now' (cf74bc599 nS/oS onSteer, cc43287c9 :38930-38946 queueBarSendNow): while a turn runs, a queued entry
// can be promoted into a steer of that turn. Offered for an unlocked entry of the open session's running turn, one
// promotion at a time (the steerBusy lock). Idle sessions have no turn to steer: the queue starts the next turn itself.
export function canSendNow(queue, id, { turnId = null, connected = true, archived = false, steeringId = null } = {}) {
  if (!turnId || !connected || archived || steeringId) return false;
  if (!queue?.entries?.some((entry) => entry.id === id)) return false;
  return !(queue.lockedIds || []).includes(id);
}

// After a refused promotion the entry is re-added (thread/queue/add appends it under a new id): the ids to pass to
// thread/queue/reorder so it sits at its old slot again; null when it is already there or unknown.
export function restoredOrder(ids, id, index) {
  const list = Array.isArray(ids) ? ids.slice() : [];
  const from = list.indexOf(id);
  if (from < 0 || !Number.isInteger(index) || index < 0) return null;
  const to = Math.min(index, list.length - 1);
  if (from === to) return null;
  list.splice(from, 1);
  list.splice(to, 0, id);
  return list;
}

// turn/steer failure that must fall back to the queue: Codex reports
// activeTurnNotSteerable for review/compact turns (CodexErrorInfo).
export function isNotSteerable(error) {
  const data = error?.data ?? error?.codexErrorInfo;
  const text = `${error?.message || ""} ${data ? JSON.stringify(data) : ""}`;
  return /activeTurnNotSteerable|not steerable/i.test(text);
}
