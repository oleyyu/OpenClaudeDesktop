import { t } from "../electron/i18n/index.mjs";
// Composer prompt-history recall (2.2553.1 shared-13-Bl2X1oob.js :14448-14600
// Vj, caretAfterRecall "end" from c099c328d :10686-10697 Zi call). Pure: the
// editor state is plain text (command chips serialize as "/id" like
// composerText), the caret edges come from the editor's Bj check, and the
// caller applies the returned text with addToHistory false.
//
// Actions:
//  - "none": not ours; the key keeps its default behaviour.
//  - "exit": typing/Backspace/Delete/Enter while navigating hides the strip and
//    ends the navigating flag; the key is NOT consumed and, like Vj (only
//    m(false) + f(null)), the index survives so an unchanged recalled text can
//    still continue with ArrowUp.
//  - "swallow": ArrowUp at the oldest entry (preventDefault, nothing changes).
//  - "recall": show prompts[index] with the caret at the end.
//  - "restore": ArrowDown past the newest entry puts the stashed draft back.
export const INITIAL_PROMPT_HISTORY = Object.freeze({ resetKey: undefined, index: null, draft: null, injected: null, length: -1, nav: null });

// Rj / tiptap isEmpty: a doc whose paragraphs are all empty. composerText joins
// paragraphs with "\n", so only newlines means an empty document.
export const isEmptyComposerText = text => !/[^\n]/.test(String(text ?? ""));

// cf6ae6197 OE (imported by cc43287c9 as L_, :30678 la): walk the session's
// messages oldest -> newest, keep human user messages (vE and not the Bo
// meta/synthetic check) and push their text when it is non-empty. The Codex
// equivalent is the thread's userMessage items; text parts are joined with
// "\n" like the user row (source-session.jsx SourceUserMessage).
export function humanPrompts(items) {
  const out = [];
  for (const item of items || []) {
    if (item?.type !== "userMessage" || !Array.isArray(item.content)) continue;
    const text = item.content.filter(part => part?.type === "text" && typeof part.text === "string").map(part => part.text).join("\n");
    if (text) out.push(text);
  }
  return out;
}

const PLAIN = new Set(["Backspace", "Delete", "Enter"]);

// input: {resetKey, key, shiftKey, metaKey, ctrlKey, altKey, composing,
// inEditor, atStart, atEnd, text, prompts}. atStart/atEnd are Bj(editor,
// "start"/"end"): collapsed caret on the first/last line of the document.
export function promptHistoryStep(previous = INITIAL_PROMPT_HISTORY, input = {}) {
  const { resetKey, key, composing = false, inEditor = true, atStart = false, atEnd = false, text = "", prompts = [] } = input;
  const done = (state, action = "none", value) => ({ state, action, text: value, nav: state.nav });
  let state = previous;
  // nf(resetKey, {onMount:"skip"}) + the [resetKey] effect: a new session/draft
  // key clears the strip and the navigation index.
  if (state.resetKey !== resetKey) state = { ...INITIAL_PROMPT_HISTORY, resetKey };
  if (!resetKey) return done(state);
  if (key !== "ArrowUp" && key !== "ArrowDown") {
    if (state.index !== null && !composing && !input.metaKey && !input.ctrlKey && !input.altKey && (String(key ?? "").length === 1 || PLAIN.has(key)))
      return done(state.nav === null ? state : { ...state, nav: null }, "exit");
    return done(state);
  }
  if (input.shiftKey || input.metaKey || input.ctrlKey || input.altKey || composing) return done(state);
  if (!inEditor) return done(state);
  const up = key === "ArrowUp";
  if (!(up ? atStart : atEnd)) return done(state);
  const list = Array.isArray(prompts) ? prompts : [];
  if (list.length === 0) return done(state);
  // The list grew/shrank (a turn was sent) since the last navigation.
  if (list.length !== state.length) state = { ...state, length: list.length, index: null, draft: null, nav: null };
  // The recalled text was edited after it was injected.
  if (state.index !== null && state.injected !== null && text !== state.injected) state = { ...state, index: null, draft: null, nav: null };
  let target, hasDraft;
  if (up) {
    if (state.index === null) {
      if (!isEmptyComposerText(text)) return done(state);
      state = { ...state, draft: text };
      hasDraft = !isEmptyComposerText(text);
      target = list.length - 1;
    } else {
      hasDraft = state.draft !== null && !isEmptyComposerText(state.draft);
      target = Math.max(0, state.index - 1);
    }
  } else {
    if (state.index === null) return done(state);
    hasDraft = state.draft !== null && !isEmptyComposerText(state.draft);
    target = state.index + 1;
  }
  if (target === state.index) return done(state, "swallow");
  if (target >= list.length) {
    const draft = state.draft ?? "";
    return done({ ...state, index: null, draft: null, injected: draft, nav: null }, "restore", draft);
  }
  const value = list[target];
  return done({ ...state, index: target, injected: value, nav: { index: target + 1, total: list.length, hasDraft } }, "recall", value);
}

// Screen-reader copy of the live status (c099c328d Em :8940-8965).
export function promptHistoryStatus(nav) {
  if (!nav) return "";
  // The same strings as the visible strip (source-composer.jsx), so a screen reader hears the UI language too.
  const count = t("History {index}/{total}", { index: nav.index, total: nav.total });
  return nav.hasDraft ? `${count} ↓ ${t("to restore your draft")}` : count;
}

// Ctrl+R reverse history search (c099c328d-CbkcmYSW.js:4516-4715 _d, header wm :8571-8608). Pure: the caller applies
// `text` (caret "start" for a match or the restored draft on cancel, "end" on accept) without an undo step.
// state: null while idle, else {query, prompts (newest first, deduplicated), index (-1 = none), draft, failed,
// matchIndex, total}. Keys while searching: Ctrl+R / ↑ the next older match, ↓ the next newer one, Esc cancels and
// restores the draft, Backspace drops a character (an empty query cancels), Enter / Tab / ←/→ / Home / End accept,
// a printable character extends the query; IME composition and ⌘/Ctrl+V/X accept and let the key through.
export const HISTORY_SEARCH_HINT_DELAY = 6000;
export const isHistorySearchKey = (event = {}) => {
  const key = String(event.key ?? "");
  const nonLatin = /^[^a-z]$/iu.test(key) || key === "Dead" || key === "Unidentified";
  return (key.toLowerCase() === "r" || (event.code === "KeyR" && nonLatin)) && !!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !event.composing;
};
function searchFrom(state, query, from, step) {
  const { prompts } = state, total = prompts.length;
  if (query === "") return { state: { ...state, query, index: -1, failed: false, matchIndex: 0 }, action: "update", text: state.draft, caret: "start" };
  const needle = query.toLowerCase();
  for (let at = from; at >= 0 && at < prompts.length; at += step)
    if (prompts[at].toLowerCase().includes(needle)) return { state: { ...state, query, index: at, failed: false, matchIndex: at + 1, total }, action: "update", text: prompts[at], caret: "start" };
  return { state: { ...state, query, failed: true, matchIndex: 0, total }, action: "update" };
}
export function historySearchStep(state, event = {}) {
  const key = String(event.key ?? "");
  if (!state) {
    if (!isHistorySearchKey(event) || event.inEditor === false) return { state: null, action: "none" };
    const seen = new Set();
    const prompts = (Array.isArray(event.prompts) ? event.prompts : []).slice().reverse().filter((text) => typeof text === "string" && !seen.has(text) && (seen.add(text), true));
    return { state: { query: "", prompts, index: -1, draft: typeof event.text === "string" ? event.text : "", failed: false, matchIndex: 0, total: prompts.length }, action: "start" };
  }
  const lower = key.toLowerCase();
  if (event.composing || key === "Dead" || key === "Process" || ((event.ctrlKey || event.metaKey) && !event.altKey && (lower === "v" || lower === "x")))
    return { state: null, action: "accept", pass: true, caret: "end" };
  const { query, index } = state;
  if (isHistorySearchKey(event) || key === "ArrowUp") return searchFrom(state, query, index + 1, 1);
  if (key === "ArrowDown") return searchFrom(state, query, index - 1, -1);
  if (key === "Escape") return { state: null, action: "cancel", text: state.draft, caret: "start" };
  if (key === "Backspace") return query === "" ? { state: null, action: "cancel", text: state.draft, caret: "start" } : searchFrom(state, query.slice(0, -1), Math.max(index, 0), 1);
  if (["Enter", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return { state: null, action: "accept", caret: "end" };
  if (key.length === 1 && !event.metaKey && !(event.ctrlKey && !event.altKey)) return searchFrom(state, query + key, Math.max(index, 0), 1);
  return { state, action: "swallow" };
}
// The sr-only live status (c099c328d :8940-8960): 'Search history: {query}', ' — match # of {total}' while a match is
// shown, ' — no match' when nothing matches.
export function historySearchStatus(search, translate = (text, values) => text.replace(/\{(\w+)\}/g, (_, name) => values?.[name] ?? "")) {
  if (!search) return "";
  return translate("Search history: {query}", { query: search.query })
    + (search.matchIndex > 0 ? translate(" — match {index} of {total}", { index: search.matchIndex, total: search.total }) : "")
    + (search.failed ? translate(" — no match") : "");
}
