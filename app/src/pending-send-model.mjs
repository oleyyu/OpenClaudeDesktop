// The optimistic user message (approval-current.js:39548, :39632-39668, :39779-39823): the bubble shows the moment
// Send is pressed, dimmed (opacity-60) with a role=status 'Sending…' footnote while turn/start is pending; the core's
// own userMessage replaces it; a rejected send stays with 'Not delivered · {time}' and Retry / Discard
// (data-testid epitaxy-failed-send). Pure, so the row shape and the hand-over to the echoed message are unit-tested.
//
// Wiring (the caller, main.jsx send()): on Send, clear the composer and keep
// pendingSend({ id, threadId, text, attachments }) with withKnownItems(entry, items); render pendingUserRow(entry,
// handlers) after the transcript rows while pendingStillShown(entry, items) is true; once turn/start answers, mark it
// acceptedSend(entry); on a turn/start rejection, replace the entry with failedSend(entry);
// Retry re-sends entry.text / entry.attachments, Discard drops the entry and puts them back in the composer.
import { t } from "../electron/i18n/index.mjs";

let sequence = 0;
/** A send the user just made: the composer text and attachments, before the core has the turn. */
export function pendingSend({ threadId = null, text = "", attachments = [], content = null, now = Date.now(), id = null } = {}) {
  return { id: id ?? `local-send:${now}:${++sequence}`, threadId, text: typeof text === "string" ? text : "",
    attachments: Array.isArray(attachments) ? attachments : [], ...(Array.isArray(content) ? { content } : {}), status: "sending", sentAt: now, knownItemIds: null };
}
/** The same send after turn/start was refused. */
export function failedSend(entry, error = null) {
  return entry ? { ...entry, status: "failed", accepted: false, error: typeof error?.message === "string" ? error.message : typeof error === "string" ? error : null } : entry;
}
/** Retry: the refused send goes out again, 'Sending…' from now, against the rows the transcript has now. */
export function retriedSend(entry, items = [], now = Date.now()) {
  return entry ? withKnownItems({ ...entry, status: "sending", accepted: false, error: null, sentAt: now }, items) : entry;
}
/** Remember which rows existed when the send began, so the core's echo is told apart from older messages. */
export function withKnownItems(entry, items = []) {
  if (!entry) return entry;
  return { ...entry, knownItemIds: (Array.isArray(items) ? items : []).filter((item) => item?.id != null).map((item) => item.id) };
}
/** The same send once turn/start answered: the core has it, so its first new row ends the local copy. */
export function acceptedSend(entry) {
  return entry && entry.status === "sending" ? { ...entry, accepted: true } : entry;
}
const userText = (item) => (item?.content || []).filter((part) => part?.type === "text" || part?.text).map((part) => part.text || "").join("\n");
/** False once the core echoed this send as its own userMessage (a new user row with the same text), so the local
 * row hands over without a duplicate; a failed send stays until Retry or Discard. After turn/start answered
 * (acceptedSend), any new row hands over too: a core may echo the text rewritten (quotes, mentions, a skill), or
 * answer without echoing it. */
export function pendingStillShown(entry, items = []) {
  if (!entry) return false;
  if (entry.status === "failed") return true;
  const known = new Set(entry.knownItemIds || []);
  const text = entry.text.trim();
  const fresh = (Array.isArray(items) ? items : []).filter((item) => item?.id != null && !known.has(item.id));
  if (entry.accepted && fresh.length) return false;
  return !fresh.some((item) => item.type === "userMessage" && (text === "" || userText(item).trim() === text));
}
/** 'Not delivered · 10:05' (the send's local time), or 'Not delivered' without one. */
export function notDeliveredLabel(sentAt, locale = undefined) {
  const date = Number.isFinite(sentAt) ? new Date(sentAt) : null;
  if (!date || !Number.isFinite(date.getTime())) return t("Not delivered");
  return t("Not delivered · {time}", { time: date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }) });
}
/** The transcript row for an entry: a userMessage-shaped item the user bubble renders, with its delivery state.
 * handlers {onRetry, onDiscard} are the failed send's buttons. */
export function pendingUserRow(entry, { onRetry = null, onDiscard = null } = {}) {
  if (!entry) return null;
  // A send made of ready turn input (a recorded demonstration, `content`) shows that input as it is.
  const content = Array.isArray(entry.content) ? entry.content : [...(entry.text ? [{ type: "text", text: entry.text, text_elements: [] }] : []),
    ...entry.attachments.filter((part) => part && (part.path || part.url || part.imageUrl)).map((part) => (part.kind === "image" || part.imageUrl
      ? { type: "localImage", path: part.path, ...(part.previewUrl ? { imageUrl: part.previewUrl } : {}) } : { type: "mention", name: part.name, path: part.path }))];
  return { id: entry.id, type: "userMessage", content, localDelivery: { status: entry.status, sentAt: entry.sentAt,
    onRetry: entry.status === "failed" ? onRetry : null, onDiscard: entry.status === "failed" ? onDiscard : null } };
}
