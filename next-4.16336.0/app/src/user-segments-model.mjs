// Ordinary user text only. Source Uh/Y consumes shared-13's DM fence pattern:
// /^(`{3,})(\S*)\n([\s\S]*?)\n\1[ \t]*$/gm. This indexed scanner retains its
// boundaries without running a backtracking whole-message regular expression.
export const USER_SEGMENT_LIMITS = Object.freeze({ maxCodeUnits: 200_000, maxFences: 64 });

const lineBreak = (char) => char === "\n" || char === "\r" || char === "\u2028" || char === "\u2029";
const firstAtOrAfter = (values, offset) => {
  let lo = 0, hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[mid].start < offset) lo = mid + 1;
    else hi = mid;
  }
  return values[lo];
};

function fenceLines(source) {
  const openings = [], closings = new Map();
  for (let start = 0; start < source.length;) {
    let end = start;
    while (end < source.length && !lineBreak(source[end])) end++;
    let ticksEnd = start;
    while (ticksEnd < end && source[ticksEnd] === "`") ticksEnd++;
    const ticks = ticksEnd - start;
    if (ticks >= 3) {
      const tail = source.slice(ticksEnd, end);
      if (source[end] === "\n" && !/\s/u.test(tail))
        openings.push({ start, ticks, headerEnd: end });
      // DM's close is preceded by literal LF, though multiline $ also accepts
      // CR/U+2028/U+2029 after it. Do not normalize CRLF opening lines.
      if (source[start - 1] === "\n" && /^[ \t]*$/.test(tail)) {
        const bucket = closings.get(ticks) ?? [];
        bucket.push({ start, end });
        closings.set(ticks, bucket);
      }
    }
    start = end + 1;
  }
  return { openings, closings, lengths: [...closings.keys()].sort((a, b) => b - a) };
}

function plain(canonicalText, fallback) {
  return { canonicalText, fallback, segments: canonicalText ? [{
    kind: "text", start: 0, end: canonicalText.length, raw: canonicalText,
    text: fallback ? canonicalText : canonicalText.trim(),
  }] : [] };
}

export function parseOrdinaryUserSegments(value) {
  const canonicalText = typeof value === "string" ? value : "";
  if (canonicalText.length > USER_SEGMENT_LIMITS.maxCodeUnits)
    return plain(canonicalText, "input-limit");
  // The application has no official serialized snippet/review metadata adapter.
  // Keep such text exactly visible; never turn comments into fake attachments.
  if (/<!-- (?:attach|reply)\b/.test(canonicalText)
      || /^In `[^`\n]+` at lines? \d+/m.test(canonicalText))
    return plain(canonicalText, "context-metadata");
  const source = canonicalText.trim();
  if (!source.includes("```")) return plain(canonicalText, null);
  const base = canonicalText.length - canonicalText.trimStart().length;
  const { openings, closings, lengths } = fenceLines(source);
  const segments = [];
  let cursor = 0, sourceCursor = 0, count = 0;
  const addText = (end) => {
    if (end > cursor) {
      const raw = canonicalText.slice(cursor, end);
      segments.push({ kind: "text", start: cursor, end, raw, text: raw.trim() });
    }
  };
  for (const opening of openings) {
    if (opening.start < sourceCursor) continue;
    let closing, delimiterLength;
    let lo = 0, hi = lengths.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (lengths[mid] > opening.ticks) lo = mid + 1;
      else hi = mid;
    }
    // The source's first capture is greedy. If no full-width close exists it
    // can backtrack, leaving extra opening backticks in the language capture.
    for (let index = lo; index < lengths.length; index++) {
      const length = lengths[index];
      const match = firstAtOrAfter(closings.get(length), opening.headerEnd + 2);
      if (match) { closing = match; delimiterLength = length; break; }
    }
    if (!closing) continue; // Unclosed source stays ordinary literal text.
    if (++count > USER_SEGMENT_LIMITS.maxFences) return plain(canonicalText, "fence-limit");
    const start = base + opening.start, end = base + closing.end;
    const bodyStart = base + opening.headerEnd + 1, bodyEnd = base + closing.start - 1;
    addText(start);
    segments.push({ kind: "code", start, end, raw: canonicalText.slice(start, end),
      text: canonicalText.slice(bodyStart, bodyEnd), bodyStart, bodyEnd,
      language: source.slice(opening.start + delimiterLength, opening.headerEnd) || "text",
      delimiterLength });
    cursor = end;
    sourceCursor = closing.end;
  }
  addText(canonicalText.length);
  return { canonicalText, fallback: null, segments };
}

// o1 passes its untouched segment to t_/yn, which removes one terminal LF/CRLF
// then displays bare CR as U+240D. Keep this display-only transform separate
// from segment.text/raw and the original message. No Copy payload is derived.
export function userCodeDisplayText(text) {
  let end = text.length;
  if (text.charCodeAt(end - 1) === 10) {
    end--;
    if (text.charCodeAt(end - 1) === 13) end--;
  }
  return text.slice(0, end).replace(/\r(?!\n)/g, "\u240D");
}
