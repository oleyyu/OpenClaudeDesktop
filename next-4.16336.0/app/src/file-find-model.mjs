// Files find: original 2.31226.0 cc3bc2027 engine, options and time/line limits.
// Local adapter provides line/column spans for editor and read-only highlights.
// Breadcrumb contracts remain traced to 2.2553.1 cd2efac6e.

import { defaultSearchOptions, searchLimit, compileSearch, scanSearch } from './generated/code-editor/search.mjs';

export const FIND_LIMIT = searchLimit;
export const DEFAULT_SEARCH_OPTIONS = Object.freeze({ ...defaultSearchOptions });
// Original viewer Ya: shared for this renderer lifetime, restored when a bar opens.
let rememberedOptions = DEFAULT_SEARCH_OPTIONS;
export const getSearchOptions = () => rememberedOptions;
export function rememberSearchOptions(options) { rememberedOptions = { ...options }; return rememberedOptions; }

/** Original bounded scan, with local line offsets for the editor's decorations. */
export function searchInText(text, query, options = DEFAULT_SEARCH_OPTIONS, { previous, now } = {}) {
  if (typeof text !== 'string' || typeof query !== 'string' || !query) return { matches: [], invalid: false, partial: false, hasLongLines: false };
  const matcher = compileSearch(query, options);
  if (!matcher) return { matches: [], invalid: !!(options.matchCase || options.wholeWord || options.regexp), partial: false, hasLongLines: false };
  const normalized = text.replace(/\r\n?/g, '\n');
  const found = scanSearch(normalized, matcher, previous?.found, now);
  const rows = normalized.split('\n'), matches = [], byLine = new Map();
  for (const line of found.lines) {
    let row = byLine.get(line);
    if (!row) { row = { ranges: matcher(rows[line - 1]), cursor: 0 }; byLine.set(line, row); }
    const range = row.ranges[row.cursor++];
    if (range) matches.push({ line, start: range[0], end: range[1] });
  }
  return { matches, invalid: false, partial: found.resume !== undefined, hasLongLines: found.hasLongLines, found };
}


/** The next active index after a step of delta (±1), wrapping; -1 when there are no matches. */
export function stepFindIndex(index, delta, total) {
  if (!total) return -1;
  if (index < 0) return delta > 0 ? 0 : total - 1;
  return (((index + delta) % total) + total) % total;
}

/** The first match on or after line (the find bar opened at the viewer's position), else 0. */
export function firstMatchFrom(matches, line) {
  if (!matches.length) return -1;
  if (!Number.isInteger(line)) return 0;
  const index = matches.findIndex((match) => match.line >= line);
  return index < 0 ? 0 : index;
}

/** {current, total, capped} for the "{current} of {total}" status (total shown as "1,000,000+" when capped). */
export function findStatus(matches, index, limit = FIND_LIMIT) {
  return { current: index >= 0 ? index + 1 : 0, total: matches.length, capped: matches.length >= limit };
}

// ⌘F opens, ⌘G / ⇧⌘G step (Ctrl off macOS); null for any other key.
export function fileFindShortcut(event, { mac = true } = {}) {
  const mod = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!mod || event.altKey) return null;
  const key = String(event.key || "").toLowerCase();
  if (key === "f" && !event.shiftKey) return "open";
  if (key === "g") return event.shiftKey ? "prev" : "next";
  return null;
}


