import { HIGHLIGHT_LIMITS, isPlainLanguage, normalizeLanguage, plainResult, validateTokens } from "./highlight-model.mjs";

// Pure protocol arithmetic for the incremental (stream) highlighter. No DOM,
// no worker, no timers. chunkUnits/replyDeadlineMs mirror the official stream
// client; the remaining values are local resource limits (see implementation.md).
export const STREAM_LIMITS = Object.freeze({
  chunkUnits: 16_384, replyDeadlineMs: 4_000, maxStreams: 4,
  maxCodeUnits: HIGHLIGHT_LIMITS.maxCodeUnits, maxLines: HIGHLIGHT_LIMITS.maxLines,
  maxLineUnits: HIGHLIGHT_LIMITS.maxLineUnits, maxTokens: HIGHLIGHT_LIMITS.maxTokens,
  idleMs: 30_000,
});

// Prefer cutting after the last '\n' that keeps the chunk within the limit.
export function splitChunk(buffer, limit = STREAM_LIMITS.chunkUnits) {
  if (typeof buffer !== "string") return { chunk: "", rest: "" };
  if (buffer.length <= limit) return { chunk: buffer, rest: "" };
  const cut = buffer.lastIndexOf("\n", limit - 1) + 1;
  const size = cut > 0 ? cut : limit;
  return { chunk: buffer.slice(0, size), rest: buffer.slice(size) };
}


// Language/eligibility gate for opening a stream. Text limits are enforced
// incrementally by createLimitTracker so growth never rescans the whole fence.
export function prepareStreamHighlight({ text, language, isFrontier = true, languageSettled = true } = {}) {
  if (!isFrontier) return plainResult("not-frontier");
  if (!languageSettled) return plainResult("unsettled-language");
  if (typeof text !== "string") return plainResult("invalid-text");
  const normalized = normalizeLanguage(language);
  if (!normalized) return plainResult("unknown-language");
  // code-block-current.js:1566 (Pe = a !== "ansi"): no stream for plain/ansi.
  if (isPlainLanguage(normalized)) return plainResult("plain-language");
  return { status: "eligible", language: normalized, text };
}

// Incremental limit check over appended suffixes only.
export function createLimitTracker(limits = STREAM_LIMITS) {
  let units = 0, lines = 1, lineUnits = 0;
  return {
    accept(suffix) {
      if (typeof suffix !== "string") return "invalid-text";
      units += suffix.length;
      if (units > limits.maxCodeUnits) return "code-limit";
      let from = 0;
      for (;;) {
        const index = suffix.indexOf("\n", from);
        const end = index === -1 ? suffix.length : index;
        lineUnits += end - from;
        if (lineUnits > limits.maxLineUnits) return "line-length-limit";
        if (index === -1) break;
        lines += 1; lineUnits = 0; from = index + 1;
        if (lines > limits.maxLines) return "line-count-limit";
      }
      return null;
    },
    inspect() { return { units, lines, lineUnits }; },
  };
}

export const isSeparator = (text) => text === "\n" || text === "\r\n";

// lines: array of token arrays; the last array is the open (unterminated) line.
// A batch first recalls that many tokens from the open line (the worker
// retokenized it), then appends tokens; a separator token closes a line.
export function reduceBatch(lines, { recall = 0, tokens = [] } = {}) {
  const previous = lines.length ? lines : [[]];
  const open = previous[previous.length - 1];
  if (!Number.isInteger(recall) || recall < 0 || recall > open.length || !Array.isArray(tokens)) return null;
  const result = previous.slice(0, -1);
  let current = recall > 0 ? open.slice(0, open.length - recall) : open.slice();
  for (const token of tokens) {
    if (!token || typeof token.text !== "string" || token.text === "") return null;
    current.push(token);
    if (isSeparator(token.text)) { result.push(current); current = []; }
  }
  result.push(current);
  return result;
}

export function flattenTokens(lines) {
  const flat = [];
  for (const line of lines) for (const token of line) flat.push(token);
  return flat;
}

export function coveredLength(lines) {
  let length = 0;
  for (const line of lines) for (const token of line) length += token.text.length;
  return length;
}

// Validate flattened stream tokens against the exact text they should cover.
export function validateStreamTokens(lines, coveredText, limits = STREAM_LIMITS) {
  const flat = flattenTokens(lines);
  if (flat.length > limits.maxTokens) return false;
  return validateTokens(flat, coveredText);
}

// Presentation state for one fence (official oi Oe/Ae/Me plus stream phase).
//  idle      no stream yet (not frontier, ineligible, or empty)
//  streaming frontier, a stream is open
//  retained  frontier ended after a successful first render; tokens are kept
//  ended     stream failed/ineligible; the settled path owns the block
export function createStreamPhase() {
  return { phase: "idle", firstRendered: false, highlighted: false };
}
export function nextStreamPhase(state, event) {
  switch (event) {
    case "open": return { ...state, phase: "streaming" };
    case "first-render": return { ...state, firstRendered: true, highlighted: true };
    case "frontier-ended":
      if (state.phase === "retained" || state.phase === "ended") return state;
      return state.phase === "streaming" && state.firstRendered && state.highlighted ? { ...state, phase: "retained" } : { ...state, phase: "ended" };
    case "restart": return { phase: "streaming", firstRendered: state.firstRendered, highlighted: false };
    case "fail": return { ...state, phase: "ended" };
    case "reset": return createStreamPhase();
    default: return state;
  }
}
