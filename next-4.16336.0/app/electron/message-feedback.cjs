"use strict";
// Good / Bad response on replies: the DeepSeek bridge's codeDesktop/messageFeedback/list|put|delete
// (harness codex-app-server messageFeedback, dsh-message-feedback), reported as capabilities.messageFeedback.
// The renderer reaches them through the main process's rpc allowlist; the params are rebuilt here from the
// fields the bridge reads, for a session this app knows.
const MESSAGE_FEEDBACK_METHODS = ["codeDesktop/messageFeedback/list", "codeDesktop/messageFeedback/put", "codeDesktop/messageFeedback/delete"];

function unsupported() { return new Error("Unsupported operation."); }

/**
 * The params to send for one messageFeedback request, or a thrown error.
 * @param {string} method one of MESSAGE_FEEDBACK_METHODS
 * @param {Record<string, unknown>} params what the renderer sent
 * @param {{ capabilities?: Record<string, unknown> } | undefined} serverInfo the running core's initialize info
 * @param {string[]} knownThreadIds this app's sessions, open and archived
 */
function messageFeedbackParams(method, params, serverInfo, knownThreadIds) {
  if (!MESSAGE_FEEDBACK_METHODS.includes(method)) throw unsupported();
  // Only a core that reports it (an older bridge or another core would answer "method not found").
  if (serverInfo?.capabilities?.messageFeedback !== true) throw unsupported();
  const p = params && typeof params === "object" ? params : {};
  if (typeof p.threadId !== "string" || !knownThreadIds.includes(p.threadId)) throw new Error("Unknown session.");
  if (method === "codeDesktop/messageFeedback/list") return { threadId: p.threadId };
  if (typeof p.itemId !== "string" || !p.itemId.trim() || p.itemId.length > 512) throw unsupported();
  // The bridge's ifVersion is the version a rating was read at (a string from list/put), or null for none.
  const version = p.ifVersion;
  if (version != null && !((typeof version === "string" && version.length <= 256) || Number.isSafeInteger(version))) throw unsupported();
  const base = { threadId: p.threadId, itemId: p.itemId, ifVersion: version ?? null };
  if (method === "codeDesktop/messageFeedback/delete") return base;
  if (p.rating !== "positive" && p.rating !== "negative") throw unsupported();
  if (p.note != null && (typeof p.note !== "string" || p.note.length > 4000)) throw unsupported();
  if (p.category != null && (typeof p.category !== "string" || !/^[a-z0-9_-]{1,64}$/i.test(p.category))) throw unsupported();
  return { ...base, rating: p.rating, ...(typeof p.note === "string" && p.note.trim() ? { note: p.note } : {}), ...(typeof p.category === "string" ? { category: p.category } : {}) };
}

module.exports = { MESSAGE_FEEDBACK_METHODS, messageFeedbackParams };
