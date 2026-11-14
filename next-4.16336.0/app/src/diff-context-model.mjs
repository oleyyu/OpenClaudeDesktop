// Only the workspace Git adapter can assert completeContext. Historical
// transcript patches remain partial, including patches beginning at line one.
// patchesWithheld: the main process's comparison.patches_withheld (2.42304.0 index.chunk-BAdej_RQ je, the
// diffgit-08 large-diff input), carried only when it is a boolean (index.chunk-muI2IV6k cv).
export function diffPayload(value) {
  return typeof value === 'string' ? { patch: value, completeContext: false }
    : { patch: typeof value?.patch === 'string' ? value.patch : '', completeContext: value?.completeContext === true,
      ...(typeof value?.patches_withheld === 'boolean' ? { patchesWithheld: value.patches_withheld } : {}) };
}

export function contextRegions(file, completeContext) {
  if (!completeContext || file.binary || file.fallbackReason || file.hunks.length !== 1) return null;
  const hunk = file.hunks[0];
  if (hunk.oldStart !== (hunk.oldCount ? 1 : 0) || hunk.newStart !== (hunk.newCount ? 1 : 0)) return null;
  const units = [];
  for (const row of hunk.rows) {
    if (row.type === 'note') {
      if (!units.length) return null;
      units.at(-1).rows.push(row);
    } else units.push({ type: row.type, rows: [row] });
  }
  if (!units.some(unit => unit.type === 'added' || unit.type === 'removed')) return null;
  const regions = [];
  let visible = [];
  const flush = () => {
    if (!visible.length) return;
    const first = visible[0];
    regions.push({ kind: 'rows', id: `rows:${first.oldLine}:${first.newLine}`, rows: visible });
    visible = [];
  };
  for (let at = 0; at < units.length;) {
    if (units[at].type !== 'context') { visible.push(...units[at++].rows); continue; }
    const start = at;
    while (at < units.length && units[at].type === 'context') at++;
    const first = start === 0, last = at === units.length;
    const keepStart = first ? 0 : 3, keepEnd = last ? 0 : 3;
    const count = at - start - keepStart - keepEnd;
    // Source collapsedContextThreshold=1: don't hide a single remaining line.
    if (count <= 1) { for (let i = start; i < at; i++) visible.push(...units[i].rows); continue; }
    for (let i = start; i < start + keepStart; i++) visible.push(...units[i].rows);
    flush();
    const hidden = units.slice(start + keepStart, at - keepEnd);
    const row = hidden[0].rows[0];
    regions.push({ kind: 'gap', id: `gap:${row.oldLine}:${row.newLine}`, units: hidden, count, first, last });
    for (let i = at - keepEnd; i < at; i++) visible.push(...units[i].rows);
  }
  flush();
  return regions;
}

export function expandContext(previous = {}, region, direction) {
  const old = previous[region.id] || { fromStart: 0, fromEnd: 0 };
  return { ...previous, [region.id]: {
    fromStart: Math.min(region.count, old.fromStart + (direction === 'up' || direction === 'both' ? 100 : 0)),
    fromEnd: Math.min(region.count, old.fromEnd + (direction === 'down' || direction === 'both' ? 100 : 0)),
  } };
}

export function visibleContext(regions, expanded = {}) {
  return regions.flatMap(region => {
    if (region.kind !== 'gap') return [region];
    const state = expanded[region.id] || { fromStart: 0, fromEnd: 0 };
    const start = Math.min(region.count, state.fromStart), end = Math.max(start, region.count - state.fromEnd);
    if (end - start <= 1) return [{ kind: 'rows', id: region.id, rows: region.units.flatMap(unit => unit.rows) }];
    const result = [];
    if (start) result.push({ kind: 'rows', id: region.id + ':start', rows: region.units.slice(0, start).flatMap(unit => unit.rows) });
    result.push({ ...region, remaining: end - start, chunked: region.count > 100 });
    if (end < region.count) result.push({ kind: 'rows', id: region.id + ':end', rows: region.units.slice(end).flatMap(unit => unit.rows) });
    return result;
  });
}
