// Plan comments as inline marks (B22 A3). Ported from 2.31226.0 cccc2cf0a (readable 1056-1448):
// Th/Eh/Dh/Oh/kh/Ah (the rehype plugin that wraps each comment's flat-text span in <mark data-plan-comment-id>),
// jh (flat offsets of a DOM selection over the same text), Mh (nearest occurrence when the offsets drifted) and
// cd5a31703 _Te (a selection overlapping a comment opens nothing). The flat text is every text node in document
// order, skipping <pre> (its wrapper carries data-plan-comment-skip in the DOM) and whitespace between table
// structure elements (react-markdown drops those nodes). Locally a math node (response-math, rendered by KaTeX)
// is skipped the same way, since its DOM text is not its source text.
export const PLAN_COMMENT_SKIP = "data-plan-comment-skip";
export const PLAN_COMMENT_ID = "data-plan-comment-id";
export const PLAN_SCROLL = "data-epitaxy-plan-scroll";
const TABLE_STRUCTURE = new Set(["table", "thead", "tbody", "tfoot", "tr"]);
const SKIPPED_ELEMENTS = new Set(["pre", "response-math"]);

/** kh: whitespace runs as one space, trimmed. */
export const normalizePlanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Mh: the occurrence of text in flat nearest to near, or -1. */
export function nearestOccurrence(flat, text, near) {
  if (!text) return -1;
  let best = -1;
  for (let index = flat.indexOf(text); index !== -1; index = flat.indexOf(text, index + 1))
    if (best === -1 || Math.abs(index - near) < Math.abs(best - near)) best = index;
  return best;
}

/** The hast text runs Ah walks: [{node, parent, index, flatStart}] and their concatenation. */
export function collectPlanText(tree) {
  const runs = [];
  let flat = "";
  const walk = (node) => {
    const children = node?.children;
    if (!Array.isArray(children)) return;
    children.forEach((child, index) => {
      if (child?.type === "element") {
        if (SKIPPED_ELEMENTS.has(child.tagName)) return;
        walk(child);
        return;
      }
      if (child?.type !== "text") return;
      if (node.type === "element" && TABLE_STRUCTURE.has(node.tagName) && /^\s*$/.test(child.value)) return;
      runs.push({ node: child, parent: node, index, flatStart: flat.length });
      flat += child.value;
    });
  };
  walk(tree);
  return { runs, flat };
}

const quoteOf = (entry) => String(entry?.quote ?? entry?.selectedText ?? "");

/** Each comment's [start, end) in flat: its own offsets while they still cover its text (whitespace-normalized),
 * else the nearest occurrence of its text; a comment whose text is gone is left out. */
export function resolvePlanCommentSpans(flat, comments = []) {
  const spans = [];
  for (const entry of comments) {
    if (!entry?.id) continue;
    const quote = quoteOf(entry);
    let start = Number.isInteger(entry.startOffset) ? entry.startOffset : 0;
    let end = Number.isInteger(entry.endOffset) ? entry.endOffset : start;
    if (normalizePlanText(flat.slice(start, end)) !== normalizePlanText(quote)) {
      const found = nearestOccurrence(flat, quote, start);
      if (found === -1) continue;
      start = found; end = found + quote.length;
    }
    spans.push({ id: entry.id, start, end });
  }
  return spans;
}

const markNode = (id, value) => ({ type: "element", tagName: "mark", properties: { [PLAN_COMMENT_ID]: id }, children: [{ type: "text", value }] });

/** Ah(comments): a rehype plugin that splits the text runs a comment covers into <mark data-plan-comment-id>. */
export function rehypePlanComments(comments = []) {
  return () => (tree) => {
    if (!comments.length) return;
    const { runs, flat } = collectPlanText(tree);
    if (!runs.length) return;
    const spans = resolvePlanCommentSpans(flat, comments);
    if (!spans.length) return;
    for (let at = runs.length - 1; at >= 0; at--) {
      const run = runs[at];
      if (run.parent.type === "element" && run.parent.tagName === "mark" && PLAN_COMMENT_ID in (run.parent.properties ?? {})) continue;
      const value = run.node.value, from = run.flatStart, to = from + value.length;
      const covering = spans.filter((span) => span.start < to && span.end > from).sort((a, b) => a.start - b.start);
      if (!covering.length) continue;
      const parts = [];
      let cursor = 0;
      for (const span of covering) {
        const start = Math.max(0, span.start - from), end = Math.min(value.length, span.end - from);
        if (start < cursor || end <= start) continue;
        if (start > cursor) parts.push({ type: "text", value: value.slice(cursor, start) });
        parts.push(markNode(span.id, value.slice(start, end)));
        cursor = end;
      }
      if (cursor === 0) continue;
      if (cursor < value.length) parts.push({ type: "text", value: value.slice(cursor) });
      run.parent.children.splice(run.index, 1, ...parts);
    }
  };
}

/** _Te: does [start, end) overlap a comment's span? */
export function planCommentOverlaps(comments = [], start, end) {
  return comments.some((entry) => Number.isInteger(entry?.startOffset) && Number.isInteger(entry?.endOffset)
    && start < entry.endOffset && entry.startOffset < end);
}

/** Xh o: comments can be added while the plan waits for approval or the session is in plan mode. */
export function planCommentsEnabled({ pendingReview = false, permission = null } = {}) {
  return pendingReview === true || permission === "plan";
}

// jh's TreeWalker filter: text under a data-plan-comment-skip wrapper or inside an icon glyph (dn: the local icons are
// font glyphs, span[data-cds=Icon]) is not plan text.
const rejectText = (node) => !!node.parentElement?.closest(`[${PLAN_COMMENT_SKIP}], [data-cds="Icon"]:not(svg)`);

/** jh(root, range): the range's flat [start, end) over root's plan text and the text it covers, or null. */
export function domPlanOffsets(root, range) {
  const doc = root.ownerDocument, view = doc.defaultView;
  const filter = view?.NodeFilter ?? globalThis.NodeFilter;
  const walker = doc.createTreeWalker(root, filter.SHOW_TEXT, {
    acceptNode: (node) => (rejectText(node) ? filter.FILTER_REJECT : filter.FILTER_ACCEPT),
  });
  const runs = [];
  let total = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) { runs.push({ node, flatStart: total }); total += node.data.length; }
  const offsetOf = (container, offset) => {
    for (const run of runs) if (run.node === container) return run.flatStart + offset;
    const point = doc.createRange();
    point.setEnd(container, offset);
    point.collapse(false);
    for (const run of runs) if (point.comparePoint(run.node, 0) >= 0) return run.flatStart;
    return total;
  };
  const start = offsetOf(range.startContainer, range.startOffset), end = offsetOf(range.endContainer, range.endOffset);
  if (end <= start) return null;
  let selectedText = "";
  for (const run of runs) {
    const from = Math.max(0, start - run.flatStart), to = Math.min(run.node.data.length, end - run.flatStart);
    if (to > from) selectedText += run.node.data.slice(from, to);
  }
  return { start, end, selectedText };
}

// Na (cd5a31703 wot :95550-95900) placement: below the range's last line (above its first when below does not
// fit), centred on it, kept K9/q9 = 8px inside the boundary (the plan scroller) and the window.
export const PLAN_POPOVER_GAP = 8, PLAN_POPOVER_MARGIN = 8;
export function planPopoverPlacement({ first = null, last = null, card, boundary, viewport, side = "below", chosen = null }) {
  const area = {
    top: Math.max(0, boundary?.top ?? 0), left: Math.max(0, boundary?.left ?? 0),
    right: Math.min(viewport.width, boundary?.right ?? Infinity), bottom: Math.min(viewport.height, boundary?.bottom ?? Infinity),
  };
  const minTop = area.top + PLAN_POPOVER_MARGIN, maxTop = area.bottom - card.height - PLAN_POPOVER_MARGIN, half = card.width / 2 + PLAN_POPOVER_MARGIN;
  const clampX = (x) => {
    const inArea = area.right - area.left >= 2 * half ? Math.min(Math.max(x, area.left + half), area.right - half) : (area.left + area.right) / 2;
    return Math.round(Math.min(Math.max(inArea, half), viewport.width - half));
  };
  const clampY = (y) => {
    const inArea = maxTop >= minTop ? Math.min(Math.max(y, minTop), maxTop) : y;
    const windowMax = viewport.height - card.height - PLAN_POPOVER_MARGIN;
    return Math.round(Math.min(Math.max(inArea, PLAN_POPOVER_MARGIN), Math.max(PLAN_POPOVER_MARGIN, windowMax)));
  };
  // The range has no box (gone from the document, collapsed): the bottom centre of the boundary.
  const initial = (chosen ?? side) === "above" ? first : last;
  if (!initial) return { x: clampX((area.left + area.right) / 2), y: clampY(maxTop), side: chosen };
  let placed = chosen;
  if (placed === null) {
    const above = initial.top - PLAN_POPOVER_GAP - card.height >= minTop, below = initial.bottom + PLAN_POPOVER_GAP + card.height <= area.bottom;
    placed = side === "above" ? (above || !below ? "above" : "below") : (below || !above ? "below" : "above");
  }
  const anchor = (placed === "above" ? first : last) ?? initial;
  const y = clampY(placed === "above" ? anchor.top - PLAN_POPOVER_GAP - card.height : anchor.bottom + PLAN_POPOVER_GAP);
  return { x: clampX(anchor.left + anchor.width / 2), y, side: placed };
}
