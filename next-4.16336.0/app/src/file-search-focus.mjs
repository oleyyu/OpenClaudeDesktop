// 2.31226.0 cccc2cf0a pendingBrowserFilterFocus: preserve filename text;
// content mode trims it, adds ? once, and selects only the query after ?.
export function fileSearchFocus(query, mode = 'filter') {
  const value = mode === 'content' ? (query.trim().startsWith('?') ? query.trim() : `?${query.trim()}`) : query;
  return { value, start: mode === 'content' ? 1 : 0, end: value.length };
}
