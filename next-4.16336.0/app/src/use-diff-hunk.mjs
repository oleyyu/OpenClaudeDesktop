import { useSettledHighlight } from './use-settled-highlight.mjs';
import { useWordDiff } from './use-word-diff.mjs';
import { tokenLines, fileHighlightLanguage } from './file-preview-model.mjs';

// wordDiff (panes-tile-current.js:3597 / panes-diff-view-current.js lineDiffType): false skips the word ranges.
export function useDiffHunk({ hunk, beforePath, afterPath, scopeKey, isFrontier = false, wordDiff = true }, ref) {
  const before = useSettledHighlight({ text: hunk.before, language: fileHighlightLanguage(beforePath), isFrontier, languageSettled: true, scopeKey: JSON.stringify([scopeKey, beforePath, 'before']) }, ref);
  const after = useSettledHighlight({ text: hunk.after, language: fileHighlightLanguage(afterPath), isFrontier, languageSettled: true, scopeKey: JSON.stringify([scopeKey, afterPath, 'after']) }, ref);
  return {
    lines: { before: tokenLines(before, hunk.before), after: tokenLines(after, hunk.after) },
    wordRanges: useWordDiff(hunk.rows, scopeKey, isFrontier, ref, wordDiff),
    highlighted: !!(before && after),
  };
}
