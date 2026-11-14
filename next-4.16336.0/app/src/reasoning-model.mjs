import { isHiddenTranscriptItem } from './transcript-item-visibility.mjs';

// scroll-messages-current.js:44440-44448 B2: the "Copy as quote" payload, a
// Markdown quote headed by a ~4-characters-per-token estimate.
export function thinkingQuote(text) {
  const value = typeof text === 'string' ? text : '';
  return `> **Thinking** (~${Math.round(value.length / 4)} tok)\n>\n${value.split('\n').map(line => line.length > 0 ? `> ${line}` : '>').join('\n')}`;
}

// Rows the source splits a tool run at (i8/u8 :53030-53060, :53187-53196):
// tool items and the local grouped tool card.
const TOOL_ROWS = new Set(['commandExecution', 'fileChange', 'webSearch', 'mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall', 'imageView', 'imageGeneration', 'sleep', 'fileToolGroup', 'computerUse']);

/** 'preceding-tools' when the thought belongs to the next tool call (the
 * source's precedingThinking, rendered as an open "Thought process" step),
 * otherwise 'standalone' (the classic U2 italic block). Hidden rows and
 * further thoughts in between are skipped, so consecutive thoughts before a
 * tool all precede it; another turn, prose or the end of the list do not. */
export function reasoningPlacement(items, index, view = 'thinking') {
  const turnId = items[index]?.turnId;
  for (let at = index + 1; at < items.length; at++) {
    const next = items[at];
    if (next.type === 'subAgentActivity' || isHiddenTranscriptItem(next, view) || next.type === 'reasoning') {
      if (next.turnId !== turnId && next.type !== 'subAgentActivity') return 'standalone';
      continue;
    }
    return next.turnId === turnId && TOOL_ROWS.has(next.type) ? 'preceding-tools' : 'standalone';
  }
  return 'standalone';
}

// Thinking is plain muted text (U2 / H2): Claude models put no Markdown there. Codex reasoning summaries open every
// part with a bold '**Title**' line and a blank line, and other cores' reasoning may use emphasis, so (as the Codex
// TUI does) a line that is only a bold title keeps its words without the markers and the blank line after it, and
// simple inline **bold**, *italic* and _italic_ lose their markers. snake_case, __init__ and a*b stay as written.
const TITLE_LINE = /^\s*\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*\s*$/;
function stripInlineEmphasis(line) {
  return line
    .replace(/\*\*(?=\S)([^*\n]*?\S)\*\*/g, '$1')
    .replace(/(?<![\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/g, '$1')
    .replace(/(?<![\w_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_])/g, '$1');
}
export function plainReasoningText(text) {
  const lines = (typeof text === 'string' ? text : '').split('\n'), shown = [];
  let afterTitle = false;
  for (const line of lines) {
    const title = TITLE_LINE.exec(line);
    if (title) { shown.push(stripInlineEmphasis(title[1].trim())); afterTitle = true; continue; }
    if (afterTitle && line.trim() === '') { afterTitle = false; continue; }
    afterTitle = false;
    shown.push(stripInlineEmphasis(line));
  }
  return shown.join('\n').trim();
}
