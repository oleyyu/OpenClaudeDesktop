// Files viewer Markdown preview plan (2.2553.1 ion-dist/assets/v1/
// cd2efac6e-CAi4fxTN.js, prettier-formatted :232-937). Ai renders a file
// through Ti: Ur splits off a YAML frontmatter block (shown as the ki <dl>
// grid), a body above Si = 49152 chars is cut into ~16 KiB chunks at block
// boundaries (Ar over shared-16 Bx), and when any chunk trips Ci the whole
// source is shown as plain text (ji) instead. This module is the pure part;
// source-file-viewer.jsx mounts it.

// --- Size gate (Lr :372-397, Ci :889-897, Vr :398-405) ---------------------

export const MARKDOWN_PROGRESSIVE_CHARS = 49152; // Si
export const MARKDOWN_CHUNK_CHARS = 16384; // pr
export const MARKDOWN_FIRST_CHUNK_CHARS = 24576; // pr * 1.5, Ei's progressive cap
export const MARKDOWN_PLAIN_LIMITS = Object.freeze({ chars: 524288, pipes: 5000, longestRun: 262144, longestLine: 32768 });

const BLANK = /^[ \t\r]*$/; // vr
const DEFINITION_LINE = /^ {0,3}\[[^\]]{1,999}\]:/; // Fr
// Ir: data-URL images and reference definitions are not counted as prose.
const uncounted = (line) => line.includes('](data:') || DEFINITION_LINE.test(line);

// Lr: the pipe count, the counted characters, the longest run of non-blank
// lines and the longest counted line.
export function markdownFileStats(text) {
  let pipes = 0;
  for (let at = text.indexOf('|'); at !== -1; at = text.indexOf('|', at + 1)) pipes += 1;
  let chars = 0, longestRun = 0, longestLine = 0, run = 0, at = 0;
  while (at < text.length) {
    const newline = text.indexOf('\n', at), end = newline === -1 ? text.length : newline, line = text.slice(at, end);
    at = end + 1;
    if (BLANK.test(line)) {
      chars += line.length + 1;
      longestRun = Math.max(longestRun, run);
      run = 0;
    } else if (!uncounted(line)) {
      chars += line.length + 1;
      run += line.length + 1;
      longestLine = Math.max(longestLine, line.length);
    }
  }
  return { chars, pipes, longestRun: Math.max(longestRun, run), longestLine };
}
// Ci: formatting this text would be too slow.
export function markdownTooSlow(text) {
  const stats = markdownFileStats(text);
  return stats.chars > MARKDOWN_PLAIN_LIMITS.chars || stats.pipes > MARKDOWN_PLAIN_LIMITS.pipes
    || stats.longestRun > MARKDOWN_PLAIN_LIMITS.longestRun || stats.longestLine > MARKDOWN_PLAIN_LIMITS.longestLine;
}
// Vr: the contain-intrinsic-size estimate of an unmounted chunk.
export function markdownChunkHeight(text) {
  return Math.round(text.split('\n').length * 24 + (text.length / 90) * 14);
}

// --- Block boundaries (shared-16-Cg1UfeMy.js Lx/Rx/zx/Bx) -------------------

// Bx: the offsets of the lines that start a new top-level block, scanned
// line by line with the open fence, math, list, table, quote and indented
// code state (a complete text, so zx's streaming tail state is not kept).
export function markdownBlockBoundaries(text) {
  const lines = text.split('\n'), last = lines.length - 1, boundaries = [];
  let fence = null, inMath = false, inList = false, listPendingBlank = false, inTable = false, inQuote = false;
  let inIndented = false, indentedPendingBlank = false, hadBlank = false, hadContent = false, offset = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index], trimmed = line.trim(), blank = BLANK.test(line), indented = /^( {4}| {0,3}\t)/.test(line);
    const fenced = fence !== null, nested = fenced || inMath || inList || inTable || inQuote || inIndented;
    let leftIndented = false, leftList = false;
    if (inIndented) {
      if (blank) indentedPendingBlank = true;
      else if (indented) indentedPendingBlank = false;
      else { inIndented = false; leftIndented = indentedPendingBlank; indentedPendingBlank = false; }
    } else if (indented && !blank && !nested && (hadBlank || !hadContent)) {
      inIndented = true;
      indentedPendingBlank = false;
    }
    const fenceMatch = indented || inMath || inIndented ? null : trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const char = fenceMatch[1][0], length = fenceMatch[1].length;
      if (fence === null) fence = { char, length };
      else if (char === fence.char && length >= fence.length && trimmed.length === length) fence = null;
    }
    const wasMath = inMath;
    if (!fenced && !inIndented) {
      if (trimmed === '$$') inMath = !inMath;
      if (!wasMath) {
        const rule = /^([-*_])(?:[ \t]*\1){2,}$/.test(trimmed);
        if (!indented && !rule && /^[-*+]\s|^\d+[.)]\s/.test(trimmed)) { inList = true; listPendingBlank = false; }
        else if (inList && blank) listPendingBlank = true;
        else if (inList && listPendingBlank) {
          if (/^[ \t]/.test(line)) listPendingBlank = false;
          else { inList = false; listPendingBlank = false; leftList = true; }
        }
        if (trimmed.includes('|')) inTable = true;
        else if (inTable && blank) inTable = false;
        if (!indented && trimmed.startsWith('>')) inQuote = true;
        else if (inQuote && blank) inQuote = false;
      }
    }
    if (blank) {
      if ((!nested && hadContent) || (nested && !(fence !== null || inMath || inList || inTable || inQuote || inIndented))) hadBlank = true;
    } else if (leftIndented || (leftList && !(index === last && /^([-*+]|\d+[.)]?)$/.test(trimmed))) || (hadBlank && !nested)) {
      boundaries.push(offset);
      hadBlank = false;
    }
    if (!blank) hadContent = true;
    offset += line.length + 1;
  }
  return boundaries;
}

// --- Chunking (Ar :253-260 and its Nr guard :261-371) -----------------------

const LINK_DEFINITION = /^\[?(?:[^[\]\\]|\\.)*\]:[ \t]*(?:\r?$|(?:<(?:[^<>\\\r]|\\.)*>|[^\s<]\S*)(?:[ \t]*\r?$|[ \t]+["'(]))/; // mr
const FOOTNOTE_DEFINITION = /^\[\^(?:[^\s[\]\\]|\\.)+\]:/; // hr
const FENCE = /^(`{3,}|~{3,})(.*)$/; // gr
const INDENTED_FENCE = /^\s+(?:`{3,}|~{3,})/; // _r
const INDENTED_CODE = /^(?: {4}| {0,3}\t)/; // yr
const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/; // br
const QUOTE = /^ {0,3}>/; // xr
const SETEXT_OR_RULE = /^ {0,3}(?:=+|(?:-[ \t]*)+|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*$/; // Sr
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d+[.)])[ \t]+\S/; // Cr
const EMPTY_MARKER = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]*$/; // wr
const ORDERED_NOT_ONE = /^ {0,3}(?!1[.)])\d{1,9}[.)](?:[ \t]|$)/; // Tr
const HTML_TAG = /^<\/?[a-z][a-z0-9-]*(?:[\s/>]|$)/i; // Er
const MATH_OPEN = /^\${2,}[^$]*$/; // Dr
const CONTAINER_PREFIX = /^[ \t]*(?:>|(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$))/; // V
const HTML_BLOCK = /^<(?:(pre|script|style|textarea)(?=[\s>]|$)|(!--)|(\?)|(!\[CDATA\[)|![a-z])/i; // H
const HTML_RAW_CLOSE = /<\/(?:pre|script|style|textarea)>/i; // Or
const RULE_LINE = /^---[ \t\r]*(?:\n|$)/; // kr

// jr: the line inside its quote / list markers, or null without any.
function stripContainers(line) {
  let rest = line, stripped = false;
  for (let match = CONTAINER_PREFIX.exec(rest); match; match = CONTAINER_PREFIX.exec(rest)) {
    rest = rest.slice(match[0].length);
    stripped = true;
  }
  return stripped ? rest.trimStart() : null;
}
// Mr: an HTML block opener that does not close on its own line.
function opensHtmlBlock(line) {
  const match = HTML_BLOCK.exec(line);
  if (match === null) return false;
  const rest = line.slice(match[0].length);
  if (match[1]) return !HTML_RAW_CLOSE.test(rest);
  return !rest.includes(match[2] ? '-->' : match[3] ? '?>' : match[4] ? ']]>' : '>');
}
// Pr: a fence line as the parser sees it (column-anchored, info string rules)
// and as a trimmed scan sees it; Nr refuses to split when they disagree.
function fenceLine(line, open) {
  const trimmed = line.trim(), loose = FENCE.exec(trimmed), strict = FENCE.exec(line);
  if (open === null) return {
    parser: strict && !(strict[1][0] === '`' && strict[2].includes('`')) ? { char: strict[1][0], length: strict[1].length } : null,
    splitter: loose !== null,
  };
  return {
    parser: strict && strict[1][0] === open.char && strict[1].length >= open.length && BLANK.test(strict[2]) ? open : null,
    splitter: loose !== null && loose[1][0] === open.char && loose[1].length >= open.length && trimmed.length === loose[1].length,
  };
}
// U: the kind of a non-blank, non-indented line.
function lineKind(line, content, pipes) {
  if (EMPTY_MARKER.test(line)) return 'marker';
  if (SETEXT_OR_RULE.test(line)) return 'block';
  if (LIST_ITEM.test(line)) return 'item';
  return pipes || ATX_HEADING.test(line) || QUOTE.test(line) || HTML_BLOCK.test(content) ? 'block' : 'text';
}
// Nr: constructs whose meaning can depend on text in another chunk
// (definitions, ambiguous fences, open HTML or math blocks, lazy lists and
// indented code after a paragraph) keep the body in one piece.
function markdownUnsplittable(text) {
  if (RULE_LINE.test(text)) return true;
  let fence = null, html = false, pipes = false, quote = false, inItem = false, previous = 'blank';
  let afterIndented = false, indentedState = 0, at = 0;
  while (at <= text.length) {
    const newline = text.indexOf('\n', at), end = newline === -1 ? text.length : newline, raw = text.slice(at, end);
    at = end + 1;
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const inner = stripContainers(line), content = inner ?? line.trimStart();
    if (LINK_DEFINITION.test(content) || FOOTNOTE_DEFINITION.test(content) || INDENTED_FENCE.test(line)) return true;
    const { parser, splitter } = fenceLine(line, fence);
    if ((parser !== null) !== splitter) return true;
    if (fence !== null) {
      if (parser) { fence = null; previous = 'block'; }
      continue;
    }
    if (BLANK.test(line)) {
      html = false; pipes = false; quote = false;
      if (indentedState === 1) indentedState = 2;
      previous = 'blank';
      continue;
    }
    if (parser) {
      if (html) return true;
      fence = parser; indentedState = 0; afterIndented = false;
      inItem &&= previous !== 'blank';
      continue;
    }
    if (MATH_OPEN.test(content) || opensHtmlBlock(content) || (inner !== null && !INDENTED_CODE.test(line) && FENCE.test(inner))) return true;
    html ||= HTML_TAG.test(content);
    pipes ||= line.includes('|');
    if (INDENTED_CODE.test(line)) {
      if (indentedState === 2 || previous === 'marker') return true;
      if (previous === 'block' && !inItem) indentedState = 1;
      previous = 'text';
      afterIndented = !inItem;
      continue;
    }
    const leadingSpace = /^[ \t]/.test(line);
    if (previous === 'marker' ? leadingSpace : previous === 'blank' && afterIndented && ORDERED_NOT_ONE.test(line)) return true;
    indentedState = 0; afterIndented = false;
    const kind = lineKind(line, content, pipes);
    if (kind === 'marker' && (previous !== 'text' || quote)) return true;
    if (kind === 'item') inItem = true;
    else if (previous === 'blank' && !leadingSpace) inItem = false;
    quote ||= QUOTE.test(line);
    previous = kind === 'item' ? 'text' : kind;
  }
  return false;
}
// Ar: chunks of at least `limit` chars, cut only at a block boundary that does
// not start with a `---` line (which could turn the previous chunk's last
// paragraph into a setext heading).
export function markdownChunks(text, limit = MARKDOWN_CHUNK_CHARS) {
  if (text.length <= limit || markdownUnsplittable(text)) return [text];
  const chunks = [];
  let start = 0;
  for (const at of markdownBlockBoundaries(text)) {
    if (at - start < limit || RULE_LINE.test(text.slice(at, at + 8))) continue;
    chunks.push(text.slice(start, at));
    start = at;
  }
  chunks.push(text.slice(start));
  return chunks;
}

// --- Frontmatter (R3-files FT-18, cov9-01) ------------------------------------
// 2.42304.0 c3fde7009 ki (split, including an empty `---\n---` block that keeps the Markdown below it) with its YAML
// subset reader Li and the label Ti, generated from the original (generated/files-changes/file-frontmatter*.mjs); the
// hand copy of the 2.2553.1 / 2.37337.1 reader that lived here is gone. Li also returns `items` for a list value (read
// by the gated document variant); the pane variant shows key and value only.
export { splitFrontmatter } from './generated/files-changes/file-frontmatter.mjs';
export { frontmatterLabel } from './generated/files-changes/file-frontmatter-view.mjs';
import { splitFrontmatter } from './generated/files-changes/file-frontmatter.mjs';

// --- The plan (Ti :898-907) --------------------------------------------------

// Ti, with its one-entry cache (wi) so the deferral hook and the renderer
// share one computation: the frontmatter, the body, whether the source is
// shown as plain text, and the chunks (one chunk at or below Si).
let cachedPlan = null;
export function markdownFilePlan(text) {
  const source = String(text ?? '');
  if (cachedPlan?.source === source) return cachedPlan.plan;
  const frontmatter = splitFrontmatter(source), body = frontmatter?.body ?? source;
  const chunks = source.length > MARKDOWN_PROGRESSIVE_CHARS ? markdownChunks(body) : [body];
  const plain = chunks.some(markdownTooSlow);
  const plan = { frontmatter, body, plain, chunks: plain ? [body] : chunks };
  cachedPlan = { source, plan };
  return plan;
}
// Ei's unmount cleanup: drop the cache when it still holds this source.
export function releaseMarkdownFilePlan(text) {
  if (cachedPlan?.source === text) cachedPlan = null;
}
