// Markdown -> clipboard HTML for message Copy. Independent implementation of
// the audited 2.2553.1 converter (analysis/rich-copy-20260920/source-contract.md):
// trim, promote soft line breaks to hard breaks outside fenced code, then
// compile CommonMark + GFM table only. Raw HTML is always escaped and unsafe
// link protocols are dropped; no dangerous-HTML/protocol option ever exists.
import { micromark } from 'micromark';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';

// Opening fence: up to three spaces, then a run of three or more ` or ~.
const FENCE_OPEN = /^( {0,3})((`|~)\3{2,})/;
// Closing fence: any indentation, the run, and nothing but blanks after it.
const FENCE_CLOSE = /^( *)((`|~)\3{2,})[ \t]*$/;

function leadingSpaces(line) {
  let count = 0;
  while (count < line.length && line[count] === ' ') count++;
  return count;
}

function endsWithOddBackslashes(line) {
  let run = 0;
  for (let index = line.length - 1; index >= 0 && line[index] === '\\'; index--) run++;
  return run % 2 === 1;
}

/** Appends the two-space hard-break marker to a prose line unless the break
 * would be meaningless (blank line, last line, next line blank) or the line
 * already carries a hard break (two trailing spaces or an odd backslash run). */
function withHardBreak(line, next) {
  if (line.trim() === '' || next === undefined || next.trim() === '') return line;
  if (line.endsWith('  ') || endsWithOddBackslashes(line)) return line;
  return line + '  ';
}

/** Normalizes CRLF/CR to LF and promotes soft breaks outside fenced code.
 * Fence tracking: a backtick fence cannot carry a backtick in its info string;
 * a closer needs the same character, a run at least as long, and at most three
 * extra spaces of indentation; a non-blank line indented less than the opener
 * also ends the fence and is then treated as prose. */
export function promoteSoftBreaks(markdown) {
  if (typeof markdown !== 'string') return '';
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let fence = null;
  return lines.map((line, index) => {
    if (fence) {
      if (line.trim() !== '' && leadingSpaces(line) < fence.indent) fence = null;
      else {
        const close = FENCE_CLOSE.exec(line);
        if (close && close[3] === fence.char && close[2].length >= fence.len && close[1].length <= fence.indent + 3) fence = null;
        return line;
      }
    }
    const open = FENCE_OPEN.exec(line);
    if (open && (open[3] === '~' || !line.slice(open[1].length + open[2].length).includes('`'))) {
      fence = { char: open[3], len: open[2].length, indent: open[1].length };
      return line;
    }
    return withHardBreak(line, lines[index + 1]);
  }).join('\n');
}

/** Rich clipboard payload for a message. Returns '' for non-string, blank or
 * unconvertible input so callers fall back to a plain-text write. */
export function markdownToClipboardHtml(markdown, { breaks = true } = {}) {
  if (typeof markdown !== 'string') return '';
  try {
    const source = markdown.trim();
    if (!source) return '';
    return micromark(breaks ? promoteSoftBreaks(source) : source, {
      extensions: [gfmTable()],
      htmlExtensions: [gfmTableHtml()],
    });
  } catch {
    return '';
  }
}
