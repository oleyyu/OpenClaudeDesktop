// The source's word-with-space alphabet. The u flag keeps non-Latin symbols
// as code points; offsets below remain UTF-16 for intersection with Shiki.
const words = /\r?\n|[a-zA-Z0-9_\u00ad\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c6\u02c8-\u02d7\u02de-\u02ff\u1e00-\u1eff]+|[^\S\n\r]+|[^a-zA-Z0-9_\u00ad\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c6\u02c8-\u02d7\u02de-\u02ff\u1e00-\u1eff]/gu;

// Independent Myers shortest-edit-path implementation. No compiled reference
// module is imported, and no historic file content is inferred from disk.
function editBlocks(before, after) {
  const a = before.match(words) || [], b = after.match(words) || [];
  const origin = a.length + b.length + 1, trace = [];
  const frontier = new Int16Array(2 * origin + 1).fill(-1);
  frontier[origin + 1] = 0;
  let distance = 0;
  search: for (; distance <= a.length + b.length; distance++) {
    trace.push(frontier.slice());
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const down = diagonal === -distance || diagonal !== distance && frontier[origin + diagonal - 1] < frontier[origin + diagonal + 1];
      let x = down ? frontier[origin + diagonal + 1] : frontier[origin + diagonal - 1] + 1;
      let y = x - diagonal;
      while (x < a.length && y < b.length && a[x] === b[y]) { x++; y++; }
      frontier[origin + diagonal] = x;
      if (x === a.length && y === b.length) break search;
    }
  }
  let x = a.length, y = b.length;
  const reversed = [];
  for (let d = distance; d >= 0; d--) {
    const v = trace[d], k = x - y;
    const down = k === -d || k !== d && v[origin + k - 1] < v[origin + k + 1];
    const previous = down ? k + 1 : k - 1, px = v[origin + previous], py = px - previous;
    while (x > px && y > py) { reversed.push({ kind: 'same', text: a[--x] }); y--; }
    if (d) reversed.push(down ? { kind: 'added', text: b[--y] } : { kind: 'removed', text: a[--x] });
  }
  const blocks = [];
  for (const part of reversed.reverse()) {
    if (blocks.at(-1)?.kind === part.kind) blocks.at(-1).text += part.text;
    else blocks.push({ ...part });
  }
  return blocks;
}

export function wordDiffRanges(before, after) {
  if (before.length > 1000 || after.length > 1000 || before === after) return { before: [], after: [] };
  const blocks = editBlocks(before, after), result = {};
  for (const side of ['before', 'after']) {
    const parts = [];
    blocks.forEach((block, index) => {
      if (block.kind === (side === 'before' ? 'added' : 'removed')) return;
      const changed = block.kind !== 'same', previous = parts.at(-1);
      // word-alt absorbs a one-character internal neutral block into the
      // previous change; a final block always retains its own boundary.
      if (previous && index !== blocks.length - 1 && (previous.changed === changed || previous.changed && !changed && block.text.length === 1)) previous.text += block.text;
      else parts.push({ changed, text: block.text });
    });
    let offset = 0;
    result[side] = parts.flatMap(part => {
      const start = offset; offset += part.text.length;
      return part.changed ? [[start, offset]] : [];
    });
  }
  return result;
}

export function hunkWordRanges(rows) {
  const ranges = rows.map(() => []);
  let old = [], next = [];
  const flush = () => {
    for (let i = 0; i < Math.min(old.length, next.length); i++) {
      const diff = wordDiffRanges(rows[old[i]].text, rows[next[i]].text);
      ranges[old[i]] = diff.before; ranges[next[i]] = diff.after;
    }
    old = []; next = [];
  };
  rows.forEach((row, index) => {
    if (row.type === 'removed') old.push(index);
    else if (row.type === 'added') next.push(index);
    else if (row.type !== 'note') flush();
  });
  flush();
  return ranges;
}

// Intersect decorations with syntax tokens without dropping or normalizing
// any characters. Token metadata survives each split, including blank/CR text.
export function decorateTokens(tokens, ranges = []) {
  const result = [];
  let offset = 0, rangeIndex = 0;
  for (const token of tokens) {
    let local = 0;
    while (local < token.text.length) {
      while (rangeIndex < ranges.length && ranges[rangeIndex][1] <= offset + local) rangeIndex++;
      const range = ranges[rangeIndex], changed = !!range && range[0] <= offset + local;
      const boundary = range ? (changed ? range[1] : range[0]) - offset : token.text.length;
      const end = Math.min(token.text.length, boundary);
      result.push({ ...token, text: token.text.slice(local, end), diff: changed }); local = end;
    }
    offset += token.text.length;
  }
  return result;
}
