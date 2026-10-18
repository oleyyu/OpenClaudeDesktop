import { t } from "../electron/i18n/index.mjs";

// Transcript find (⌘F) model: the pure half of the renderer find provider.
// Claude 2.2553.1 sidebar-main.js:17787-18130 ZB is the bar; ion-dist
// shared-18-CzkFx3Pc.js holds the provider registry it drives: vo (text walk
// and case-folded matching), q (length-preserving case fold), vs (active-index
// navigation), Vo (the centring offset) and the 'find-in-page' highlight pair.
// Everything here works on plain DOM-like nodes (nodeType / firstChild /
// nextSibling / tagName / hasAttribute / getAttribute / data) so it runs under
// node --test; source-find-bar.jsx turns the matches into Ranges.

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export const FIND_OMITTED = "data-find-omitted"; // shared-18 co
export const FIND_INCLUDED = "data-find-included"; // shared-18 lo
export const FIND_GUTTER = "data-gutter"; // shared-18 uo
// shared-18 yo/bo are 'find-in-page' / 'find-in-page-active'; the transcript
// provider's pair is named after it (spec F10).
export const FIND_HIGHLIGHT = "transcript-find";
export const FIND_ACTIVE_HIGHLIGHT = "transcript-find-active";
export const FIND_INPUT_DEBOUNCE_MS = 120; // sidebar-main.js:17776 qB
export const FIND_MUTATION_DEBOUNCE_MS = 60; // shared-18 Es repaint timer
// sidebar-main.js:18040-18110 strings.
export const FIND_LABELS = Object.freeze({
  input: t("Find"),
  placeholder: t("Find…"),
  previous: t("Go to previous match"),
  next: t("Go to next match"),
  close: t("Close find bar"),
});

// shared-18 po: block-level tags end a run of text, so a match never spans two
// blocks (vo inserts a NUL between them).
const BLOCK_TAGS = new Set(
  "ADDRESS ARTICLE ASIDE BLOCKQUOTE BR DD DETAILS DIV DL DT FIGCAPTION FIGURE FOOTER H1 H2 H3 H4 H5 H6 HEADER HR LI MAIN NAV OL P PRE SECTION SUMMARY TABLE TBODY TD TFOOT TH THEAD TR UL".split(" "),
);
// Spec F10: aria-hidden subtrees and visually hidden (sr-only) text are not
// searchable; neither is a [hidden] subtree (vo's later visibility filter).
const SR_ONLY_CLASSES = ["sr-only", "source-sr-only", "sp-sr-only"];

// shared-18 q: a lower-casing that keeps every UTF-16 index in place (U+0130
// and U+03A3 fold one unit at a time; surrogate pairs are left as they are).
const SPECIAL = /[İΣ\ud800-\udfff]/;
const PLAIN = /[^İΣ\ud800-\udfff]+/y;
function foldUnit(unit) {
  const lower = unit.toLowerCase();
  return lower.length === 1 ? lower : unit;
}
function foldEach(text) {
  let out = "";
  for (let index = 0; index < text.length; index += 1) out += foldUnit(text[index]);
  return out;
}
export function foldCase(text) {
  let out = "", from = 0, index = text.search(SPECIAL);
  while (index !== -1 && index < text.length) {
    const code = text.charCodeAt(index);
    let end = index + 1;
    if (code === 304 || code === 931) out += text.slice(from, index).toLowerCase() + foldUnit(text[index]);
    else {
      while (end < text.length && (text.charCodeAt(end) & 63488) === 55296) end += 1;
      out += text.slice(from, index).toLowerCase() + text.slice(index, end);
    }
    from = end;
    PLAIN.lastIndex = end;
    index = PLAIN.test(text) ? PLAIN.lastIndex : end;
  }
  const folded = from === 0 ? text.toLowerCase() : out + text.slice(from).toLowerCase();
  return folded.length === text.length ? folded : foldEach(text);
}

function hasClass(element, name) {
  if (element.classList?.contains) return element.classList.contains(name);
  return ` ${element.getAttribute?.("class") ?? ""} `.includes(` ${name} `);
}
function hiddenFromFind(element) {
  return element.getAttribute?.("aria-hidden") === "true"
    || element.hasAttribute?.("hidden")
    || SR_ONLY_CLASSES.some((name) => hasClass(element, name));
}
// 2.42304.0 shared-15 Ca: `if(Ye(i)||i.matches(ha))return;` with Ye = shared-6 yV
// (the Icon selector, `:not(svg)`) and ha (the Avatar selector). An icon glyph or an
// avatar is skipped without a run break, so the text on both sides stays one run
// (a forge chip's "See <icon>acme/widgets#42" finds "See acme").
function skippedWithoutBreak(element) {
  const kind = element.getAttribute?.("data-cds");
  return (kind === "Icon" && String(element.tagName).toLowerCase() !== "svg") || kind === "Avatar";
}
function hasIncludedDescendant(element) {
  for (let child = element.firstChild; child; child = child.nextSibling)
    if (child.nodeType === ELEMENT_NODE && (child.hasAttribute(FIND_INCLUDED) || hasIncludedDescendant(child))) return true;
  return false;
}

// shared-18 vo (text half): walk the tree in document order, keeping the text
// nodes that are searchable and a NUL wherever a block, an omitted subtree or
// an inclusion change separates two runs.
export function collectFindText(root, { exclude } = {}) {
  const segments = [];
  let text = "", gap = false;
  const children = (node, included) => {
    for (let child = node.firstChild; child; child = child.nextSibling) visit(child, included);
  };
  const visit = (node, included) => {
    if (node.nodeType === TEXT_NODE) {
      if (!included) return;
      if (gap) { text += "\0"; gap = false; }
      segments.push({ node, start: text.length });
      text += node.data;
      return;
    }
    let next = included;
    if (node.nodeType === ELEMENT_NODE) {
      if (exclude?.has(node) || node.hasAttribute(FIND_GUTTER)) { gap = true; return; }
      if (node.hasAttribute(FIND_INCLUDED)) next = true;
      else if (node.hasAttribute(FIND_OMITTED)) {
        if (!hasIncludedDescendant(node)) { gap = true; return; }
        next = false;
      }
      if (skippedWithoutBreak(node)) return;
      // Spec F10 (local): other hidden subtrees still end the run.
      if (hiddenFromFind(node)) { gap = true; return; }
      if (next !== included) gap = true;
      if (BLOCK_TAGS.has(String(node.tagName).toUpperCase())) {
        gap = true;
        children(node, next);
        gap = true;
        return;
      }
    }
    children(node, next);
    if (next !== included) gap = true;
  };
  visit(root, true);
  return { text, segments };
}

// shared-18 vo (match half): case-insensitive, non-overlapping, in document
// order. A match is {startNode, startOffset, endNode, endOffset}.
export function findMatches(root, query, options) {
  if (!root || typeof query !== "string" || query.length === 0) return [];
  const needle = foldCase(query);
  const { text, segments } = collectFindText(root, options);
  const haystack = foldCase(text);
  const matches = [];
  let from = 0, segment = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    while (segment < segments.length && segments[segment].start + segments[segment].node.data.length <= at) segment += 1;
    if (segment >= segments.length) break;
    const match = { startNode: segments[segment].node, startOffset: at - segments[segment].start };
    for (let index = segment; index < segments.length; index += 1) {
      const end = segments[index].start + segments[index].node.data.length;
      if (at + needle.length <= end) {
        match.endNode = segments[index].node;
        match.endOffset = at + needle.length - segments[index].start;
        break;
      }
    }
    if (match.endNode) matches.push(match);
    from = at + needle.length;
  }
  return matches;
}

// shared-18 vs: the active match index (0-based, -1 for none).
//   new  — a new query (or the bar's first search): the first match.
//   keep — the content changed under the same query: clamp the old index.
//   step — Enter / ⌘G / F3 / the buttons: wrap around in either direction;
//          from no active match, forward starts at the first, back at the last.
//   reset — clear the active match.
export function nextActiveIndex({ index = -1, total = 0, forward = true, mode = "step" } = {}) {
  if (mode === "reset") return -1;
  if (mode === "keep") return total === 0 ? -1 : Math.min(Math.max(index, 0), total - 1);
  if (mode === "new") return total > 0 ? 0 : -1;
  if (total === 0) return -1;
  if (index < 0) return forward ? 0 : total - 1;
  return (Math.min(index, total - 1) + (forward ? 1 : -1) + total) % total;
}

function sameMatch(a, b) {
  return !!a && !!b && a.startNode === b.startNode && a.startOffset === b.startOffset
    && a.endNode === b.endNode && a.endOffset === b.endOffset;
}
// shared-18 Po/No: after a content update the active highlight stays on the
// same text when that text is still matched; otherwise the index is clamped.
export function keepActiveIndex(previous, matches, index) {
  const same = previous ? matches.findIndex((match) => sameMatch(match, previous)) : -1;
  return same >= 0 ? same : nextActiveIndex({ index, total: matches.length, mode: "keep" });
}

// vs result: activeIndex is 1-based (0 with no active match); an empty query
// is {activeIndex:0,total:0}.
export function findResult(query, index, total) {
  if (!query) return { activeIndex: 0, total: 0 };
  return { activeIndex: index >= 0 ? index + 1 : 0, total };
}
// sidebar-main.js:18063-18075: nothing for an empty query, '{current}/{total}'
// with matches, otherwise '0/0'.
export function findStatusText(query, { activeIndex, total }) {
  if (!query) return "";
  return total > 0 ? `${activeIndex}/${total}` : "0/0";
}

// ZB's window keydown handlers (:17838-17860 open/Escape, :17968-17985 step):
// 'open' for ⌘F (re-selects an open bar's query), 'close' for Escape and
// 'next' / 'prev' for ⌘G / ⇧⌘G / F3 / ⇧F3 while the bar is open. A prevented
// event (a pane-owned or dialog-owned find) is never taken.
export function findShortcut(event, { open = false, mac = true } = {}) {
  const command = mac ? event.metaKey : event.ctrlKey;
  if ((event.key === "f" || event.key === "F") && command && !event.altKey && !event.shiftKey)
    return event.defaultPrevented ? null : "open";
  if (!open) return null;
  if (event.key === "Escape") return !event.defaultPrevented && !event.isComposing ? "close" : null;
  if (event.defaultPrevented || event.isComposing || event.altKey) return null;
  const step = ((event.key === "g" || event.key === "G") && command)
    || (event.key === "F3" && !event.metaKey && !event.ctrlKey);
  return step ? (event.shiftKey ? "prev" : "next") : null;
}
// ZB L: Enter / Shift+Enter in the input, never mid-composition.
export function findInputKey(event) {
  if (event.isComposing || event.nativeEvent?.isComposing || event.key !== "Enter") return null;
  return event.shiftKey ? "prev" : "next";
}

// ZB I/ee and the T (composing) flag: typing schedules a search after qB ms,
// except while an IME composition is in progress; compositionend searches the
// committed text. The step buttons are ignored mid-composition.
export function createFindInput({ search, schedule = setTimeout, cancel = clearTimeout, delay = FIND_INPUT_DEBOUNCE_MS }) {
  let composing = false, timer;
  const clear = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  const queue = (value) => {
    clear();
    timer = schedule(() => { timer = undefined; search(value); }, delay);
  };
  return {
    get composing() { return composing; },
    input(value) { clear(); if (!composing) queue(value); },
    compositionStart() { composing = true; },
    compositionEnd(value) { composing = false; queue(value); },
    canStep() { return !composing; },
    cancel: clear,
  };
}

// shared-18 Vo: no scroll while the match intersects the visible band (the
// scroller's box, cut at `bottom` when given); otherwise the offset that puts
// the match's centre at the band's centre.
export function centerScrollOffset(rect, bounds, bottom) {
  const limit = bottom === undefined ? bounds.bottom : Math.min(bounds.bottom, bottom);
  if (rect.bottom > bounds.top && rect.top < limit) return null;
  return rect.top + rect.height / 2 - (bounds.top + limit) / 2;
}
