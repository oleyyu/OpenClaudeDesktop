// w13-chatui-message-actions: the local stand-in for claude.ai chat message feedback and retry (plan-w13 E59).
// Official 3.6556.2: cc1aae219 UF (export si via WF) presses Good / Bad response from `message.chat_feedback.type`
// (shared-0 Ji: UPVOTE "upvote", FLAG "flag", FLAG_* "flag/…") and sends the rating ("up" | "down", MF) before the
// details form (OF) settles the type; frame-shell-chrome AZ toasts "Feedback sent". OpenClaude keeps the rating on this
// computer (userData/chat-feedback.json through electron/chat-feedback.mjs) and never uploads it.
// Pure: no React, no IPC; electron/chat-feedback.mjs and src/source-chat-message-actions.jsx share it.

export const CHAT_FEEDBACK_FILE = 'chat-feedback.json';
const MAX_ID = 512;
// w13-close-chat-messages (chatui-message-actions-02): the details the form (shared-6 iT "Please provide details:
// (optional)") collects, kept with the rating; longer text is cut, an empty one is not stored.
export const MAX_FEEDBACK_REASON = 10000;
const reasonOf = (value) => (typeof value === 'string' && value.trim() ? value.slice(0, MAX_FEEDBACK_REASON) : undefined);

// shared-0 Ji values the thumbs can settle on: UF's `e === "flag" ? … C(_t.FLAG) : … C(_t.UPVOTE)`.
export function isFeedbackType(type) {
  return type === 'upvote' || type === 'flag' || (typeof type === 'string' && /^flag\/[a-z-]{1,40}$/.test(type));
}
// cc1aae219 wF: `e === _t.UPVOTE ? "up" : e.startsWith("flag") ? "down" : null`.
export function feedbackRating(type) {
  return type === 'upvote' ? 'up' : typeof type === 'string' && type.startsWith('flag') ? 'down' : null;
}
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID && !id.includes('\0');

export function emptyFeedbackStore() { return { version: 1, threads: {} }; }
// Keeps only well-formed entries of a store read from disk (a damaged file reads as empty).
export function normalizeFeedbackStore(raw) {
  const store = emptyFeedbackStore();
  if (!raw || typeof raw !== 'object' || !raw.threads || typeof raw.threads !== 'object') return store;
  for (const [threadId, entries] of Object.entries(raw.threads)) {
    if (!validId(threadId) || !entries || typeof entries !== 'object') continue;
    for (const [itemId, entry] of Object.entries(entries)) {
      if (!validId(itemId) || !isFeedbackType(entry?.type)) continue;
      const reason = reasonOf(entry.reason);
      (store.threads[threadId] ??= {})[itemId] = { type: entry.type, at: Number.isFinite(entry.at) ? entry.at : 0, ...(reason ? { reason } : {}) };
    }
  }
  return store;
}
// A `chat-feedback` request ({ operation: "list", threadId } | { operation: "put", threadId, itemId, type, reason? }).
export function feedbackRequest(p) {
  if (!p || typeof p !== 'object') throw new Error('Invalid feedback request.');
  if (!validId(p.threadId)) throw new Error('Invalid conversation.');
  if (p.operation === 'list') return { operation: 'list', threadId: p.threadId };
  if (p.operation !== 'put') throw new Error('Unknown feedback operation.');
  if (!validId(p.itemId)) throw new Error('Invalid message.');
  if (!isFeedbackType(p.type)) throw new Error('Invalid feedback.');
  const reason = reasonOf(p.reason);
  return { operation: 'put', threadId: p.threadId, itemId: p.itemId, type: p.type, ...(reason ? { reason } : {}) };
}
export function putFeedback(store, { threadId, itemId, type, reason, at = Date.now() }) {
  const next = normalizeFeedbackStore(store);
  const kept = reasonOf(reason);
  next.threads[threadId] = { ...next.threads[threadId], [itemId]: { type, at, ...(kept ? { reason: kept } : {}) } };
  return next;
}
// itemId -> { type } for one conversation.
export function threadFeedback(store, threadId) {
  return Object.fromEntries(Object.entries(normalizeFeedbackStore(store).threads[threadId] ?? {}).map(([id, e]) => [id, { type: e.type }]));
}
// The message shape UF reads: `n.uuid`, `n.chat_feedback?.type` (a locally kept rating presses its thumb on reopen).
export function feedbackMessage(itemId, feedback) {
  const type = feedback?.[itemId]?.type;
  return isFeedbackType(type) ? { uuid: itemId, chat_feedback: { type } } : { uuid: itemId };
}
// Retry (r1 `Y.onRetry("assistant_message_footer", x.parent_message_uuid)`): the local core has no message tree, so
// a retry asks again with the same prompt — the turn's user message text, or null when there is nothing to resend.
// textOf(item) reads a user item's shown text (main.jsx passes messageItemText(shownUserItem(item))).
export function retryPrompt(items, turnId, textOf = defaultUserText) {
  if (!turnId || !Array.isArray(items)) return null;
  const user = items.find(item => item?.turnId === turnId && item.type === 'userMessage');
  const text = user ? textOf(user) : null;
  return typeof text === 'string' && text.trim() ? text : null;
}
function defaultUserText(item) {
  return typeof item?.text === 'string' ? item.text
    : Array.isArray(item?.content) ? item.content.filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text).join('') : '';
}
