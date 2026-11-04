import React, { useId, useRef } from "react";
import { useSettledHighlight } from "./use-settled-highlight.mjs";
import { SourceHighlightedLine } from "./source-diff-code.jsx";
import { wordDiffRanges } from "./word-diff-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./highlight-tokens.css";
import "./source-diff.css";

// Settings › Code appearance preview (official c71860c77 hi/gi/_i): the fixed
// greet.ts unified diff rendered under one forced mode with classic +/-
// indicators, wrapping and no file header. _i leaves the @pierre/diffs default
// disableLineNumbers=false (ca7ba268c getOptionsWithDefaults), so every row
// carries the unified gutter: one number cell (the addition line's number,
// else the deletion's), padded 2ch+5px / 1ch around a ≥3ch right-aligned
// figure, then the line with its 2ch classic-indicator inset. Both documents
// are tokenized by the settled worker under the selected theme pair; the
// column's data-mode picks the light or dark variant regardless of the
// application mode.
export const GREET_BEFORE = 'function greet(name: string) {\n  return "Hello, " + name;\n}\n';
export const GREET_AFTER = "function greet(name: string) {\n  return `Hello, ${name}!`;\n}\n";
const ROWS = Object.freeze([
  { type: "context", source: "after", line: 0 },
  { type: "removed", source: "before", line: 1 },
  { type: "added", source: "after", line: 1 },
  { type: "context", source: "after", line: 2 },
]);
const MARKERS = { added: "+", removed: "-", context: " " };
// Unified gutter number: the line's 1-based index in the document it comes from.
export const previewRowNumber = (row) => row.line + 1;
// ca7ba268c getOptionsWithDefaults lineDiffType "word-alt" (Bt sets no override, c71860c77:2552-2600): the
// paired removed/added line emphasises its changed fragment on top of the line tint.
export const GREET_WORD_RANGES = Object.freeze(wordDiffRanges(GREET_BEFORE.split("\n")[1], GREET_AFTER.split("\n")[1]));
const rowRanges = (row) => row.type === "removed" ? GREET_WORD_RANGES.before : row.type === "added" ? GREET_WORD_RANGES.after : undefined;

export function splitTokenLines(tokens, text) {
  if (!tokens) return text.split("\n").map((line) => [{ text: line }]);
  const lines = [[]];
  for (const token of tokens) {
    if (token.text === "\n") { lines.push([]); continue; }
    lines[lines.length - 1].push(token);
  }
  return lines;
}

export function SourceCodeThemePreview({ mode, theme }) {
  const ref = useRef(null);
  const instance = useId();
  const scope = (name) => JSON.stringify(["code-theme-preview", instance, mode, name]);
  const before = useSettledHighlight({ text: GREET_BEFORE, language: "typescript", isFrontier: false, languageSettled: true, scopeKey: scope("before") }, ref);
  const after = useSettledHighlight({ text: GREET_AFTER, language: "typescript", isFrontier: false, languageSettled: true, scopeKey: scope("after") }, ref);
  const lines = { before: splitTokenLines(before, GREET_BEFORE), after: splitTokenLines(after, GREET_AFTER) };
  return <div ref={ref} className="ss-theme-preview cds-root" data-theme="claude" data-mode={mode} data-color-version="v2" data-code-theme={theme}
    data-highlighted={before && after ? "" : undefined}
    style={{ background: `var(--code-theme-${mode}-bg)`, color: `var(--code-theme-${mode}-fg)` }}>
    <div className="source-diff sdiff-view ss-theme-preview-diff" aria-label={mode === "light" ? t("Light code theme preview") : t("Dark code theme preview")}>
      {ROWS.map((row, index) => <div key={index} className={`sdiff-row ${row.type}`} data-diff-row={row.type} data-kind={row.type}>
        <div className="sdiff-line-number" data-column-number="" aria-hidden="true"><span className="ss-theme-preview-number">{previewRowNumber(row)}</span></div>
        <div className="ss-theme-preview-line">
          <div className="sdiff-marker" aria-hidden="true">{MARKERS[row.type]}</div>
          {/* source-diff-code SourceHighlightedLine: [data-diff-span] emphasis under the column's forced data-mode. */}
          <code className="sdiff-line-content scb-code source-diff-code"><SourceHighlightedLine tokens={lines[row.source][row.line]} ranges={rowRanges(row)}/></code>
        </div>
      </div>)}
    </div>
  </div>;
}
