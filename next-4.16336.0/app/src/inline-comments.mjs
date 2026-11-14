// Inline comments on a proposed plan and on changed lines (official 2.2553.1: panes-tile-current.js:1600-1700 'Plan
// comment' over a text selection, approval-current.js:9422-9440 Fse prefixing them to the plan feedback, and
// panes-diff-options-current.js:470-500 'Comment on line {line}' / 'Add to prompt'). Plain text, so every core reads
// them: plan comments ride the plan review's Revise feedback, or go to the composer; line comments go to the composer.
import { t } from "../electron/i18n/index.mjs";

const quote = (text) => String(text ?? "").replace(/\r\n?/g, "\n").trim().split("\n").map((line) => `> ${line}`).join("\n");

/** Fse / vTe: each comment as "On selected text:\n> quote\n<comment>", blank-line separated, in plan order (startOffset). */
const planOrder = (entry) => (Number.isInteger(entry?.startOffset) ? entry.startOffset : Infinity);
export function serializePlanComments(comments = []) {
  return comments.filter((entry) => entry && String(entry.text ?? "").trim())
    .map((entry, index) => ({ entry, index })).sort((a, b) => planOrder(a.entry) - planOrder(b.entry) || a.index - b.index).map(({ entry }) => entry)
    .map((entry) => `On selected text:\n${quote(entry.quote)}\n${String(entry.text).trim()}`).join("\n\n");
}

/** The plan feedback a Revise sends: the comments first, then the typed feedback. */
export function planFeedbackWithComments(feedback = "", comments = []) {
  return [serializePlanComments(comments), String(feedback ?? "").trim()].filter(Boolean).join("\n\n");
}

/** A changed-line comment for the composer: where, the quoted code, then the comment. side "deletions" (a Changes
 * comment on removed lines) numbers the lines of the file before the change. */
export function serializeLineComment({ path, start, end = start, code = "", text = "", side }) {
  const range = end && end !== start;
  const where = side === "deletions"
    ? (range ? t("In {path}, removed lines {start}–{end}:", { path, start, end }) : t("In {path}, removed line {line}:", { path, line: start }))
    : range ? t("In {path}, lines {start}–{end}:", { path, start, end }) : t("In {path}, line {line}:", { path, line: start });
  return [where, code ? quote(code) : null, String(text).trim()].filter(Boolean).join("\n");
}

// Plan comments live per session until a Revise sends them or the user removes them (memory only, like a draft).
const plans = new Map(), listeners = new Set();
let version = 0;
const emit = () => { version++; for (const listener of listeners) listener(); };
export const planCommentsStore = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  version: () => version,
  get: (threadId) => plans.get(threadId) ?? EMPTY,
  // mT.add: startOffset/endOffset place the comment in the plan's flat text (plan-comments-model), where the Plan pane
  // marks it inline. Returns the new comment's id.
  add(threadId, { quote: selected, text, startOffset, endOffset }) {
    if (!threadId || !String(text ?? "").trim()) return null;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const offsets = Number.isInteger(startOffset) && Number.isInteger(endOffset) && endOffset > startOffset ? { startOffset, endOffset } : {};
    plans.set(threadId, [...(plans.get(threadId) ?? []), { id, quote: String(selected ?? ""), text: String(text).trim(), ...offsets }]);
    emit();
    return id;
  },
  edit(threadId, id, text) {
    const list = plans.get(threadId);
    if (!list) return;
    plans.set(threadId, list.map((entry) => (entry.id === id ? { ...entry, text: String(text ?? "").trim() } : entry)).filter((entry) => entry.text));
    emit();
  },
  remove(threadId, id) {
    const list = plans.get(threadId);
    if (!list) return;
    const next = list.filter((entry) => entry.id !== id);
    if (next.length) plans.set(threadId, next); else plans.delete(threadId);
    emit();
  },
  clear(threadId) { if (plans.delete(threadId)) emit(); },
};
const EMPTY = Object.freeze([]);

// The composer takes text from panes through one window event (main.jsx listens and appends it to the draft).
// The event is cancelable: the listener that takes the text cancels it, so a pane learns whether anything did. A
// popped-out pane window has no composer; its PopoutApp listener relays the text to the main window (main.cjs
// popout-add-to-prompt). With nobody listening, addToPrompt reports false and the pane keeps the comment open.
export const ADD_TO_PROMPT_EVENT = "code-desktop:add-to-prompt";
export function addToPrompt(text, target = typeof window === "undefined" ? null : window) {
  const value = String(text ?? "").trim();
  if (!value || !target) return false;
  return !target.dispatchEvent(new CustomEvent(ADD_TO_PROMPT_EVENT, { detail: { text: value }, cancelable: true }));
}

// Text relayed from a pane window for one session (main.cjs → the main window's "add-to-prompt" event): queued until
// the split side showing that session takes it, which is at once when it is open, else once the session opens.
const pendingAdditions = new Map(), additionListeners = new Set();
export const promptAdditions = {
  subscribe(listener) { additionListeners.add(listener); return () => additionListeners.delete(listener); },
  // meta (B27: a selection from a popped-out Terminal pane): the snippet's label and terminal tab (makeSnippet).
  queue(sessionId, text, meta = null) {
    const value = String(text ?? "").trim();
    if (typeof sessionId !== "string" || !sessionId || !value) return false;
    const entry = { text: value, ...(meta && typeof meta === "object" ? { meta: { ...(typeof meta.label === "string" ? { label: meta.label } : {}), ...(typeof meta.terminalTabId === "string" ? { terminalTabId: meta.terminalTabId } : {}) } } : {}) };
    pendingAdditions.set(sessionId, [...(pendingAdditions.get(sessionId) ?? []), entry]);
    for (const listener of [...additionListeners]) listener(sessionId);
    return true;
  },
  has: (sessionId) => pendingAdditions.has(sessionId),
  /** Every queued text for the session, oldest first; the queue empties. */
  take(sessionId) { return promptAdditions.takeEntries(sessionId).map((entry) => entry.text); },
  /** The queued entries ({ text, meta? }), oldest first; the queue empties. */
  takeEntries(sessionId) {
    const list = pendingAdditions.get(sessionId) ?? [];
    pendingAdditions.delete(sessionId);
    return list;
  },
};
