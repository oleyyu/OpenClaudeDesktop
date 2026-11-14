// The Changes pane "Go to file" combobox (2.2553.1 panes-tile-current.js nh :3189-3390): the changed paths ranked
// for a query (Zm over a FileIndex), at most 100 rows (th), the rest counted for the "Keep typing to narrow." footer.
// FileIndex is a native fuzzy matcher; this is a subsequence ranker with the same shape of result (the matched
// character positions in the full path), preferring matches inside the file name, contiguous runs and early starts.

export const GO_TO_FILE_LIMIT = 100;
export const GO_TO_FILE_SHORTCUT = "cmd+p";
/** eh (:3214-3221): the popup opens upward when there is less than 200px below the trigger and more above it. */
export const GO_TO_FILE_FLIP_PX = 200;

const baseStart = (path) => path.lastIndexOf("/") + 1;

// The positions of `query` (spaces ignored) as a subsequence of `text` from `from`, matching case-insensitively,
// each character as early as possible after the previous one. Null when it does not match.
function subsequence(text, query, from = 0) {
  const lower = text.toLowerCase();
  const positions = [];
  let at = from;
  for (const character of query) {
    const found = lower.indexOf(character, at);
    if (found < 0) return null;
    positions.push(found);
    at = found + 1;
  }
  return positions;
}

// Lower is better: a match inside the file name first, then fewer gaps, then an earlier start, then shorter paths.
function score(path, positions, base) {
  let gaps = 0;
  for (let index = 1; index < positions.length; index++) if (positions[index] !== positions[index - 1] + 1) gaps++;
  const inName = positions[0] >= base;
  const nameStart = inName && positions[0] === base;
  return (inName ? 0 : 10000) + (nameStart ? 0 : 500) + gaps * 50 + (positions[0] - (inName ? base : 0)) + path.length / 1000;
}

/** One ranked match of `query` in `path` ({positions, score}), or null. Pure. */
export function matchChangedPath(path, query) {
  const wanted = String(query ?? "").toLowerCase().replace(/\s+/g, "");
  if (!wanted) return { positions: [], score: 0 };
  const base = baseStart(path);
  // Within the file name first (when the query names no folder), else anywhere in the path.
  const inName = wanted.includes("/") ? null : subsequence(path, wanted, base);
  const positions = inName ?? subsequence(path, wanted, 0);
  return positions ? { positions, score: score(path, positions, base) } : null;
}

/**
 * entries: diffFileEntries rows ({filePath, additions, deletions}). Returns {items, more}: the rows to list (each
 * {value, name, additions, deletions, positions}) and how many matches the 100-row cap left out.
 */
export function goToFileItems(entries, query, limit = GO_TO_FILE_LIMIT) {
  const rows = (entries ?? []).filter((entry) => typeof entry?.filePath === "string" && entry.filePath)
    .map((entry) => ({ value: entry.filePath, name: entry.filePath.slice(baseStart(entry.filePath)), additions: entry.additions ?? null, deletions: entry.deletions ?? null }));
  const wanted = String(query ?? "").trim();
  let ranked;
  if (!wanted) ranked = rows.map((row) => ({ ...row, positions: null }));
  else {
    ranked = [];
    rows.forEach((row, index) => {
      const match = matchChangedPath(row.value, wanted);
      if (match) ranked.push({ ...row, positions: match.positions, score: match.score, index });
    });
    ranked.sort((a, b) => a.score - b.score || a.index - b.index);
    ranked = ranked.map(({ score: _score, index: _index, ...row }) => row);
  }
  return { items: ranked.length > limit ? ranked.slice(0, limit) : ranked, more: Math.max(0, ranked.length - limit) };
}

/** ⌘P (goToDiffFile, shared-21-D098Wd--.js:14268): Meta+P with no other modifier, not while composing. */
export function isGoToFileShortcut(event) {
  return !!event && event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.isComposing && (event.code === "KeyP" || event.key === "p");
}
