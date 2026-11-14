// Local filename-search adaptation. See analysis/batch-20260920/file-name-search-backend-024.md for scope.
function matchPath(pathname, query) {
  const sensitive = query !== query.toLowerCase();
  const text = sensitive ? pathname : pathname.toLowerCase();
  const needle = sensitive ? query : query.toLowerCase();
  if (!needle) return null;
  const rawPositions = [];
  let from = 0, gaps = 0, consecutive = 0;
  for (let index = 0; index < needle.length; index++) {
    const at = text.indexOf(needle[index], from);
    if (at < 0) return null;
    if (index) {
      const gap = at - rawPositions[index - 1] - 1;
      if (gap === 0) consecutive += 4;
      else gaps += 3 + gap;
    }
    rawPositions.push(at);
    from = at + 1;
  }
  // Lowercasing some Unicode characters changes their UTF-16 length. Return
  // highlight offsets in the original path, never offsets into its folded copy.
  let positions = rawPositions;
  if (!sensitive && text.length !== pathname.length) {
    const offsets = [];
    let offset = 0;
    for (const character of pathname) {
      for (let i = 0; i < character.toLowerCase().length; i++) offsets.push(offset);
      offset += character.length;
    }
    positions = rawPositions.map(at => offsets[at]);
  }
  let rankScore = needle.length * 16 + consecutive - gaps;
  for (let i = 0; i < positions.length; i++) {
    const at = positions[i];
    if (at === 0) rankScore += i === 0 ? 8 : 0;
    else if (/[\/\\\-_. ]/.test(pathname[at - 1])) rankScore += 8;
    else if (/[a-z]/.test(pathname[at - 1]) && /[A-Z]/.test(pathname[at])) rankScore += 6;
  }
  rankScore += Math.max(0, 32 - Math.floor(pathname.length / 4));
  return { rankScore, positions };
}

function compareMatches(a, b) {
  // Stable across Git/filesystem enumeration order and the host locale.
  return b.rankScore - a.rankScore || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

// B33 (shared-18 YB/XB, JB = Intl.Collator(undefined, {numeric: true})): a folder's direct children are listed
// folders first, then by name in numeric collation order, with code-unit order as the tiebreak.
let collator = null;
function compareNames(a, b) {
  if (a === b) return 0;
  collator ??= new Intl.Collator(undefined, { numeric: true });
  return collator.compare(a, b) || (a < b ? -1 : 1);
}
function compareTreeEntries(a, b) {
  return a.directory === b.directory ? compareNames(a.name, b.name) : a.directory ? -1 : 1;
}

// B33 (cccc2cf0a Fv :4151-4163): a filter ending in '/' names a folder. Entries whose path starts with it
// (case-insensitive) and have no further '/' (its direct children, files and folders) come first in tree order,
// then the deeper entries under it, then everything else, each keeping the ranked order it had.
function orderFolderQuery(matches, query) {
  const prefix = query.toLowerCase();
  const children = [], deeper = [], others = [];
  for (const match of matches) {
    if (!match.path.toLowerCase().startsWith(prefix)) others.push(match);
    else if (match.path.includes('/', query.length)) deeper.push(match);
    else children.push(match);
  }
  children.sort(compareTreeEntries);
  return [...children, ...deeper, ...others];
}

module.exports = { matchPath, compareMatches, compareTreeEntries, orderFolderQuery };
