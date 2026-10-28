// Split view: sessions side by side in one window, each pane its own App (transcript, composer, panes, model and
// permission state); see source-split-view.jsx. Claude Desktop 2.31226.0 keeps the window's extra panes in the
// pane store (shared-16 Q, "desktop-frame.paneStore.v1", lines 380-1135): the primary pane is fixed at column 0,
// row 0 and every extra pane has a grid position {col, row} — up to 5 columns (one per 360px of host width,
// _a), each with a top and a bottom row. This module ports that store as pure state transitions: each returns
// { state, effects } where an effect asks a pane's App to navigate ({ navigate: [index, sessionId|null] }) or to
// take keyboard focus ({ focus: index }). Pane index 0 is the primary pane; index i > 0 is state.panes[i - 1].
//
// Local mapping of the reference's pane refs: a pane shows a session (`id`) or the new-session page (id null: the
// reference's "code-draft" ref). Each extra pane keeps a stable `key`, so moving it only changes its grid cell and
// its App stays mounted; a pane's session changes by navigating its App.

// shared-16 ha / ga / va: at most 5 columns, one per 360px of host width; rows split 15..85%; panes ≥ 320px.
export const SPLIT_MAX_COLUMNS = 5;
export const SPLIT_COLUMN_PX = 360;
export const SPLIT_MIN_PANE_PX = 320;
export const SPLIT_ROW = Object.freeze({ MIN: 0.15, MAX: 0.85, DEFAULT: 0.5 });
// shared-50 Ca "(max-width: 700px)" (shared-23 u1 He(Ah)): a window this narrow parks the extra panes.
export const SPLIT_CONSTRAINED_QUERY = "(max-width: 700px)";
// Official Yt split-view commands (View › Split View, asar index.chunk Yxi), plus the ⌃⌘Arrow focus moves (B$).
export const SPLIT_COMMANDS = Object.freeze(["new-right", "new-below", "focus-next", "focus-previous", "move-left", "move-right", "move-up", "move-down", "close"]);
export const SPLIT_FOCUS_COMMANDS = Object.freeze(["focus-left", "focus-right", "focus-up", "focus-down"]);
// The sidebar row drag (source-sidebar.jsx) → drop on the session area opens the session in split view.
export const SESSION_DRAG_TYPE = "application/x-code-desktop-session";
// shared-16 ta: the drop target left of the primary pane (insertLeftOfPrimary).
export const LEFT_OF_PRIMARY = Object.freeze({ col: -1, row: 0 });
const PRIMARY_POS = Object.freeze({ col: 0, row: 0 });

const EMPTY_SIDE = Object.freeze({ current: null, title: "" });
export const emptySplit = Object.freeze({
  open: false, panes: Object.freeze([]), sides: Object.freeze([EMPTY_SIDE]), active: 0, colWeights: null, rowSplit: SPLIT_ROW.DEFAULT,
  maxColumns: 2, constrained: false, parked: null, nextKey: 1,
});

const sessionId = (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value) ? value : null;
const unchanged = (state) => ({ state, effects: [] });

// --- Grid primitives (shared-16 $i … Z) over entries { key, id, pos }; id null is a new-session (draft) pane.
const isDraft = (entry) => entry.id === null; // J
const refKey = (entry) => (entry.id === null ? `draft:${entry.key}` : `session:${entry.id}`); // Y
export const posKey = (pos) => `${pos.col}:${pos.row}`; // $i
export const samePos = (a, b) => a.col === b.col && a.row === b.row; // ea
export const isLeftTarget = (pos) => pos.col < 0; // na
/** X: the number of columns (the primary's column 0 counts). */
export function columnCount(entries) {
  let max = 0;
  for (const entry of entries) if (entry.pos.col > max) max = entry.pos.col;
  return max + 1;
}
/** wa: column `col` has a top pane (column 0 always: the primary). */
export const hasTop = (entries, col) => col === 0 || entries.some((entry) => entry.pos.col === col && entry.pos.row === 0);
/** Ta: column `col` has a bottom pane. */
export const hasBottom = (entries, col) => entries.some((entry) => entry.pos.col === col && entry.pos.row === 1);
const indexAt = (entries, pos) => entries.findIndex((entry) => samePos(entry.pos, pos)); // Ea
const indexOfRef = (entries, ref) => entries.findIndex((entry) => refKey(entry) === ref); // pa
function sameLayout(a, b) { // Da
  if (a.length !== b.length) return false;
  const at = new Map(a.map((entry) => [refKey(entry), posKey(entry.pos)]));
  return b.every((entry) => at.get(refKey(entry)) === posKey(entry.pos));
}
/** Oa: a layout's identity (the primary's session and every pane's cell). */
export function layoutKey(entries, primary) {
  return [primary === null ? "" : `session:${primary}`, ...entries.map((entry) => `${posKey(entry.pos)}=${refKey(entry)}`).sort()].join("|");
}
/** _a: the columns a host of `width` px holds (one per 360px, 1..5). */
export function maxColumnsFor(width) {
  const columns = Math.floor((Number.isFinite(width) ? width : 0) / SPLIT_COLUMN_PX);
  return Math.max(1, Math.min(SPLIT_MAX_COLUMNS, columns || 1));
}
// ka: whether a pane may take `pos` (an existing column, or a new one while there is room or `grow`).
function canPlace(entries, pos, max, grow = false) {
  const columns = columnCount(entries);
  return pos.col <= columns && (pos.col < columns || columns < max || grow) && (pos.row === 0 || hasTop(entries, pos.col));
}
/** Z: normalize a layout — a pane at 0:0 drops under the primary (or out, when that cell is taken), empty columns
 * close up, and a lone bottom pane of a column moves to its top. */
export function normalizeEntries(entries) {
  if (entries.length === 0) return [];
  let bottomTaken = entries.some((entry) => entry.pos.col === 0 && entry.pos.row === 1);
  const kept = [];
  for (const entry of entries) {
    if (entry.pos.col === 0 && entry.pos.row === 0) {
      if (bottomTaken) continue;
      bottomTaken = true;
      kept.push({ ...entry, pos: { col: 0, row: 1 } });
    } else kept.push(entry);
  }
  if (kept.length === 0) return [];
  const columns = Array.from(new Set([0, ...kept.map((entry) => entry.pos.col)])).sort((a, b) => a - b);
  const index = new Map(columns.map((col, at) => [col, at]));
  let next = kept.map((entry) => ({ ...entry, pos: { col: index.get(entry.pos.col) ?? entry.pos.col, row: entry.pos.row } }));
  next = next.map((entry) => entry.pos.col > 0 && entry.pos.row === 1 && !next.some((other) => other.pos.col === entry.pos.col && other.pos.row === 0)
    ? { ...entry, pos: { col: entry.pos.col, row: 0 } } : entry);
  return next;
}
/** Ya: the panes in reading order (column, then row), with their pane index. */
export function panesInOrder(entries) {
  return entries.map((entry, at) => ({ entry, paneIndex: at + 1 }))
    .sort((a, b) => a.entry.pos.col - b.entry.pos.col || a.entry.pos.row - b.entry.pos.row);
}
/** za: where a new pane goes — a new column while there is room, else the first column without a bottom pane. */
export function nextSlot(entries, max) {
  const columns = columnCount(entries);
  if (columns < max) return { col: columns, row: 0 };
  for (let col = 0; col < columns; col++) if (!hasBottom(entries, col)) return { col, row: 1 };
  return null;
}
/** Xa: the default target of "Open in split view": nextSlot, else the last session pane's cell (replaced). */
export function defaultTarget(entries, max) {
  const slot = nextSlot(entries, max);
  if (slot) return slot;
  const order = panesInOrder(entries);
  return order.findLast((item) => !isDraft(item.entry))?.entry.pos ?? order.at(-1)?.entry.pos ?? { col: 0, row: 1 };
}
// Aa: move pane `paneIndex` to `target` (swapping with a pane already there).
export function movePaneResult(entries, paneIndex, target, max) {
  const from = paneIndex - 1;
  if (from < 0 || from >= entries.length || samePos(entries[from].pos, target) || (target.col === 0 && target.row === 0) || target.col < 0) return null;
  const other = indexAt(entries, target);
  if (other !== -1) {
    const next = entries.slice(), pos = next[from].pos;
    next[from] = { ...next[from], pos: next[other].pos };
    next[other] = { ...next[other], pos };
    const normalized = normalizeEntries(next);
    return sameLayout(entries, normalized) ? null : { next: normalized, focusIndex: paneIndex, grew: false };
  }
  const pos = entries[from].pos;
  if (!canPlace(entries, target, max, pos.col > 0 && entries.every((entry, at) => at === from || entry.pos.col !== pos.col))) return null;
  const columns = columnCount(entries), next = entries.slice();
  next[from] = { ...next[from], pos: target };
  const normalized = normalizeEntries(next);
  if (sameLayout(entries, normalized)) return null;
  const ref = refKey(entries[from]);
  return { next: normalized, focusIndex: normalized.findIndex((entry) => refKey(entry) === ref) + 1, grew: columnCount(normalized) > columns };
}
// ja: the pane whose session the primary's takes over when the primary moves to `target`.
function promoteCandidate(entries, target, max) {
  if (target.col < 0 || (target.col === 0 && target.row === 0)) return null;
  const at = indexAt(entries, target);
  if (at !== -1) return isDraft(entries[at]) ? null : { index: at, entry: entries[at] };
  for (const { entry, paneIndex } of panesInOrder(entries)) {
    if (isDraft(entry)) continue;
    return canPlace(entries, target, max, entry.pos.row === 0 && (!hasBottom(entries, 0) || !hasBottom(entries, entry.pos.col)))
      ? { index: paneIndex - 1, entry } : null;
  }
  return null;
}
/** Ma: the primary's session can move to `target`. */
export const canMovePrimary = (entries, target, max) => promoteCandidate(entries, target, max) !== null;
// Na: the primary's session moves to `target`; the session there (or the first session pane) becomes the primary's.
export function movePrimaryResult(entries, primary, target, max) {
  const candidate = promoteCandidate(entries, target, max);
  if (candidate === null || primary === null) return null;
  const next = entries.slice(), from = entries[candidate.index].pos;
  const pos = target.row === 1 && from.row === 0 && from.col === target.col && !hasBottom(entries, 0) ? { col: 0, row: 1 } : target;
  next[candidate.index] = { ...next[candidate.index], id: primary, pos };
  const below = from.row === 0 ? indexAt(entries, { col: from.col, row: 1 }) : -1;
  if (below !== -1 && pos.col !== from.col && !hasBottom(next, 0)) next[below] = { ...next[below], pos: { col: 0, row: 1 } };
  const normalized = normalizeEntries(next), ref = `session:${primary}`;
  return { next: normalized, promoted: candidate.entry.id, movedIndex: normalized.findIndex((entry) => refKey(entry) === ref) + 1 };
}
// Pa: remove pane `at`; a top pane's bottom partner moves under the primary when that cell is free.
export function removePromoting(entries, at) {
  const { pos } = entries[at];
  const below = pos.row === 0 && !hasBottom(entries, 0) ? indexAt(entries, { col: pos.col, row: 1 }) : -1;
  return normalizeEntries(entries.map((entry, index) => (index === below ? { ...entry, pos: { col: 0, row: 1 } } : entry)).filter((_, index) => index !== at));
}
const shiftRight = (entries) => entries.map((entry) => ({ ...entry, pos: { col: entry.pos.col + 1, row: entry.pos.row } })); // Fa
/** Ia: a session dropped left of the primary becomes the primary; the primary's session moves to column 1. */
export function insertLeftResult(entries, id, primary, max) {
  const drop = new Set([`session:${id}`, `session:${primary}`]);
  const rest = normalizeEntries(entries.filter((entry) => !drop.has(refKey(entry))));
  if (columnCount(rest) >= max) return null;
  return normalizeEntries([...shiftRight(rest), { key: null, id: primary, pos: { col: 1, row: 0 } }]);
}
/** La: the primary leaves its column (its bottom partner keeps the column) — only with a pane under it. */
export function primaryToNewColumnResult(entries, max) {
  return !hasBottom(entries, 0) || columnCount(entries) >= max ? null : normalizeEntries(shiftRight(entries));
}
// Ra: drop pane `paneIndex` (0: the primary) above column `col`'s top pane, which moves to its bottom.
export function insertAboveResult(entries, paneIndex, col, primary) {
  const cells = [{ col: 0, row: 0 }, ...entries.map((entry) => entry.pos)];
  const top = cells.findIndex((pos) => pos.col === col && pos.row === 0);
  if (paneIndex < 0 || paneIndex >= cells.length || top === -1 || top === paneIndex || hasBottom(entries, col) || (paneIndex === 0 && primary === null)) return null;
  cells[top] = { col, row: 1 };
  cells[paneIndex] = { col, row: 0 };
  const topCols = new Set(cells.filter((pos) => pos.row === 0).map((pos) => pos.col));
  const cols = Array.from(new Set(cells.map((pos) => pos.col))).sort((a, b) => a - b);
  const next = cells.map((pos) => ({ col: cols.indexOf(pos.col), row: topCols.has(pos.col) ? pos.row : 0 }));
  let origin = next.findIndex((pos) => pos.col === 0 && pos.row === 0);
  if (origin > 0 && origin !== paneIndex && isDraft(entries[origin - 1])) {
    const moved = primary !== null && indexOfRef(entries, `session:${primary}`) === -1 ? movePrimaryResult(entries, primary, { col, row: 1 }, columnCount(entries)) : null;
    if (moved !== null && moved.movedIndex !== top) {
      const pos = moved.next[moved.movedIndex - 1].pos;
      return { next: moved.next.map((entry) => entry.pos.col === pos.col ? { ...entry, pos: { col: pos.col, row: entry.pos.row === 0 ? 1 : 0 } } : entry), promoted: moved.promoted, focusIndex: moved.movedIndex };
    }
    const swap = panesInOrder(entries).find((item) => !isDraft(item.entry) && next[item.paneIndex].col !== next[paneIndex].col);
    if (swap === undefined) return null;
    next[origin] = next[swap.paneIndex];
    next[swap.paneIndex] = { col: 0, row: 0 };
    origin = swap.paneIndex;
  }
  if (origin === 0) return { next: entries.map((entry, at) => ({ ...entry, pos: next[at + 1] })), promoted: null, focusIndex: paneIndex };
  const promotedEntry = entries[origin - 1];
  if (primary === null || isDraft(promotedEntry)) return null;
  return {
    next: entries.map((entry, at) => (at === origin - 1 ? { ...entry, id: primary, pos: next[0] } : { ...entry, pos: next[at + 1] })),
    promoted: promotedEntry.id,
    focusIndex: paneIndex === 0 ? origin : paneIndex === origin ? 0 : paneIndex,
  };
}
// qa: place a pane (a new session or a new-session page) at `target`: a free cell, a draft's cell (the draft moves
// on), or a session pane's cell (that pane shows the new session instead).
export function placeResult(entries, max, entry, target) {
  const columns = columnCount(entries);
  if (target.col < 0) return null;
  let pos = target.col === 0 && target.row === 0 ? { col: 0, row: 1 } : target;
  if (pos.col >= columns) {
    if (columns < max) pos = { col: columns, row: 0 };
    else { const last = columns - 1; pos = hasBottom(entries, last) ? { col: last, row: 0 } : { col: last, row: 1 }; }
  }
  if (pos.row === 1 && !hasTop(entries, pos.col)) pos = { col: pos.col, row: 0 };
  if (pos.col === 0 && pos.row === 0) pos = { col: 0, row: 1 };
  const at = indexAt(entries, pos);
  if (at !== -1) {
    if (isDraft(entries[at])) {
      const free = nextSlot(entries, max);
      if (free === null) return null;
      const moved = entries.slice();
      moved[at] = { ...moved[at], pos: free };
      const next = normalizeEntries([...moved, { ...entry, pos }]);
      return { next, focusIndex: indexOfRef(next, refKey(entry)) + 1, grew: free.col >= columns };
    }
    const next = entries.slice();
    next[at] = { ...next[at], id: entry.id };
    return { next, focusIndex: at + 1, grew: false };
  }
  const next = normalizeEntries([...entries, { ...entry, pos }]);
  return { next, focusIndex: indexOfRef(next, refKey(entry)) + 1, grew: pos.col >= columns };
}

// --- Move targets (shared-21 $7, Zse renames) for View › Split View › Move and the pane drag hint.
function renamedDirection(dir, from, target) {
  if (Math.abs(target.col - from.col) > 1) return null;
  switch (dir) {
    case "topLeft": return from.row === 0 ? "left" : from.col === 0 ? "up" : null;
    case "bottomLeft": return from.row === 0 ? "down" : "left";
    case "newColumn": return "right";
    default: return null;
  }
}
/** $7: where pane `paneIndex` (0: the primary) can move, as [{ dir, target }]; `primaryShown` is the primary showing a session. */
export function moveTargets(entries, paneIndex, max, primaryShown) {
  if (paneIndex === 0)
    return primaryShown ? [{ dir: "right", target: { col: 1, row: 0 } }, { dir: "down", target: { col: 0, row: 1 } }].filter((item) => canPlace(entries, item.target, max)) : [];
  const entry = entries[paneIndex - 1];
  if (entry === undefined) return [];
  const pos = entry.pos, columns = columnCount(entries), list = [];
  if (primaryShown && !isDraft(entry)) list.push({ dir: "topLeft", target: PRIMARY_POS });
  if (pos.col > 0) list.push({ dir: "left", target: { col: pos.col - 1, row: pos.row } });
  list.push({ dir: "right", target: { col: pos.col + 1, row: pos.row } });
  list.push(pos.row === 1 ? { dir: "up", target: { col: pos.col, row: 0 } } : { dir: "down", target: { col: pos.col, row: 1 } });
  list.push({ dir: "bottomLeft", target: { col: 0, row: 1 } });
  list.push({ dir: "newColumn", target: { col: columns, row: 0 } });
  const seen = new Set();
  const kept = list.filter((item) => {
    if (samePos(item.target, PRIMARY_POS)) return item.dir === "topLeft";
    const next = movePaneResult(entries, paneIndex, item.target, max)?.next;
    const key = next === undefined ? null : layoutKey(next, null);
    if (key === null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const dirs = new Set(kept.map((item) => item.dir));
  return kept.map((item) => {
    const renamed = renamedDirection(item.dir, pos, item.target);
    if (renamed === null || dirs.has(renamed)) return item;
    dirs.add(renamed);
    return { dir: renamed, target: item.target };
  });
}

// --- Pane drag drop zones (shared-22 BM/HM/UM): which cell a pane dragged over the host lands in.
const DROP_EDGE = 1 / 4, DROP_BAND = 1 / 3;
/** BM: the zone under (x, y) from the column rects and the row split. */
export function dropZone(columns, rowSplit, x, y) {
  if (columns.length === 0) return { pos: { col: 0, row: 0 }, zone: "swap", band: null, edge: false, sideFirst: true };
  let at = columns.findIndex((rect) => x >= rect.left && x < rect.right);
  if (at === -1) at = x < columns[0].left ? 0 : columns.length - 1;
  const rect = columns[at], rightHalf = x >= rect.left + rect.width / 2;
  let band = null, inset = 0;
  if (rightHalf && at === columns.length - 1) { band = "right"; inset = rect.right - x; }
  else if (!rightHalf && at === 0 && x >= rect.left) { band = "left"; inset = x - rect.left; }
  const edgeWidth = rect.width * DROP_EDGE, edge = band === "right" ? inset <= edgeWidth : band === "left" && inset < edgeWidth;
  const bandHeight = rect.height * DROP_BAND;
  const zone = y < rect.top + bandHeight ? "above" : y >= rect.top + rect.height - bandHeight ? "below" : "swap";
  const depth = zone === "above" ? y - rect.top : rect.top + rect.height - y;
  return { pos: { col: at, row: y < rect.top + rect.height * rowSplit ? 0 : 1 }, zone, band, edge, sideFirst: zone === "swap" || inset * bandHeight <= depth * edgeWidth };
}
// HM: the layout a drop would produce (its key), or null when it changes nothing.
function dropLayout(context, drop) {
  const { entries, dragIndex, max, primary } = context;
  const entry = dragIndex === 0 ? undefined : entries[dragIndex - 1];
  if (dragIndex !== 0 && entry === undefined) return null;
  let next = null, promoted = null;
  if (isLeftTarget(drop.target)) {
    if (primary === null || !context.leftOpen()) return null;
    if (entry === undefined) next = primaryToNewColumnResult(entries, max);
    else if (!isDraft(entry)) { next = insertLeftResult(entries, entry.id, primary, max); promoted = entry.id; }
  } else if (drop.above) {
    const result = insertAboveResult(entries, dragIndex, drop.target.col, primary);
    next = result?.next ?? null; promoted = result?.promoted ?? null;
  } else if (entry === undefined || samePos(drop.target, PRIMARY_POS)) {
    const result = primary === null ? null : movePrimaryResult(entries, primary, entry?.pos ?? drop.target, max);
    next = result?.next ?? null; promoted = result?.promoted ?? null;
  } else next = movePaneResult(entries, dragIndex, drop.target, max)?.next ?? null;
  return next === null ? null : layoutKey(next, promoted ?? primary);
}
/** UM: the drop ({ target, above }) for a zone while pane `dragIndex` is dragged, or null. */
export function paneDrop(context, zone) {
  const { entries, dragIndex } = context;
  const from = dragIndex === 0 ? PRIMARY_POS : entries[dragIndex - 1]?.pos;
  if (from === undefined) return null;
  const { col } = zone.pos;
  const candidates = [
    context.stackZones !== false && !hasBottom(entries, col) && from.col !== col
      ? (zone.zone === "below" ? { target: { col, row: 1 }, above: false } : { target: { col, row: 0 }, above: zone.zone === "above" }) : null,
    { target: zone.pos, above: false },
    zone.band === null ? null : { target: zone.band === "left" ? LEFT_OF_PRIMARY : { col: columnCount(entries), row: 0 }, above: false },
  ];
  const top = { target: { col, row: 0 }, above: false };
  const [stack, cell, band] = candidates.map((drop) => {
    const layout = drop === null ? null : dropLayout(context, drop);
    return drop === null || layout === null ? null : { drop: drop.target.row === 1 && dropLayout(context, top) === layout ? top : drop, layout };
  });
  const chosen = stack ?? cell;
  if (band === null || chosen === null) return (chosen ?? band)?.drop ?? null;
  return !zone.edge || (chosen === stack && !zone.sideFirst) || band.layout === chosen.layout ? chosen.drop : band.drop;
}

// --- Column weights and the row split (shared-23 ZQ/QQ/$Q, r$/i$/o$, e1/t1).
/** e1: the weights to draw: the stored ones when they fit the column count, else equal columns. */
export function columnWeights(weights, columns, width = 0) {
  if (!Array.isArray(weights) || weights.length !== columns || weights.some((value) => !(value > 0))) return Array.from({ length: columns }, () => 1);
  return width > 0 && weightsTooNarrow(weights, width) ? Array.from({ length: columns }, () => 1) : weights;
}
/** t1: some column would be narrower than the 320px minimum at this width. */
export function weightsTooNarrow(weights, width) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  return (Math.min(...weights) / total) * width < SPLIT_MIN_PANE_PX - 0.5;
}
/** JQ: weights as grid tracks. */
export const columnTracks = (weights) => weights.map((value) => `${value}fr`).join(" ");
/** o$: the 320px minimum in weight units for a host `width` wide with weights summing to `total`. */
export const minWeight = (width, total) => (SPLIT_MIN_PANE_PX / width) * total;
/** ZQ: move the boundary after column `col` by `delta` weight units, both neighbours keeping `min`. */
export function resizeColumns(weights, col, delta, min) {
  const pair = weights[col] + weights[col + 1], floor = Math.min(min, pair / 2);
  const value = Math.min(pair - floor, Math.max(floor, weights[col] + delta)), next = weights.slice();
  if ((value - weights[col]) * delta <= 0) return next;
  next[col] = value; next[col + 1] = pair - value;
  return next;
}
/** QQ (⌥ held): grow or shrink one column symmetrically against both neighbours. */
export function resizeColumnsAround(weights, col, delta, min) {
  if (weights.length < 3) return resizeColumns(weights, col, delta, min);
  const middle = col === weights.length - 2 ? col : col + 1, left = middle - 1, right = middle + 1;
  const signed = middle === col ? -delta : delta;
  const step = signed > 0 ? Math.min(signed, Math.max(0, (weights[middle] - min) / 2))
    : -Math.min(-signed, Math.max(0, weights[left] - min), Math.max(0, weights[right] - min));
  const next = weights.slice();
  next[left] += step; next[right] += step; next[middle] -= 2 * step;
  return next;
}
/** $Q / e$: one frame of a column drag (drag: { alt, baseWeights, baseDelta, lastDelta, live }). */
export function dragColumns(drag, col, deltaPx, scale, min) {
  drag.lastDelta = deltaPx;
  const delta = (deltaPx - drag.baseDelta) * scale;
  drag.live = drag.alt ? resizeColumnsAround(drag.baseWeights, col, delta, min) : resizeColumns(drag.baseWeights, col, delta, min);
  return drag.live;
}
export function dragAlt(drag, alt) {
  if (drag.alt === alt) return;
  drag.alt = alt; drag.baseWeights = drag.live.slice(); drag.baseDelta = drag.lastDelta;
}
/** r$: the row split's bounds for a host `height` tall (both rows ≥ 320px, within 15..85%). */
export function rowBounds(height) {
  const min = Math.max(SPLIT_ROW.MIN, SPLIT_MIN_PANE_PX / height);
  return min < 0.5 ? { min, max: 1 - min } : { min: 0.5, max: 0.5 };
}
export function clampRowSplit(value, height) {
  const { min, max } = rowBounds(height);
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : SPLIT_ROW.DEFAULT));
}
/** i$: the row divider can move at this height. */
export function rowMovable(height, value) {
  const { min, max } = rowBounds(height);
  return (value - min) * height >= 0.5 || (max - value) * height >= 0.5;
}

// --- Keyboard (shared-23 B$, shared-1 focus_next_pane / new_session_pane_right / _below).
// ⌃] / ⌃[ focus the next / previous pane; ⌃⌘\ and ⌃⌘- open a new session on the right / below; ⌃⌘W closes the focused
// pane; ⌃⌘Arrow moves the focus to the neighbouring pane. source-split-view.jsx matches them first (preventDefault),
// so the menu accelerators only fire for clicks (app-menu.cjs splitDispatch).
const ARROWS = { ArrowLeft: "focus-left", ArrowRight: "focus-right", ArrowUp: "focus-up", ArrowDown: "focus-down" };
export function splitShortcut(event) {
  if (!event || event.defaultPrevented || event.repeat || event.altKey || event.shiftKey || !event.ctrlKey) return null;
  if (!event.metaKey && event.code === "BracketRight") return "focus-next";
  if (!event.metaKey && event.code === "BracketLeft") return "focus-previous";
  if (!event.metaKey) return null;
  if (event.code === "Backslash") return "new-right";
  if (event.code === "Minus") return "new-below";
  if (event.code === "KeyW") return "close";
  return ARROWS[event.code] ?? null;
}

// --- State.
/** The extra panes as grid entries { key, id, pos }. */
export function paneEntries(state) {
  return state.panes.map((pane, at) => ({ key: pane.key, id: state.sides[at + 1]?.current ?? null, pos: pane.pos }));
}
const primaryOf = (state) => state.sides[0].current;
/** The pane showing a session, or null (a session shows once per window). */
export function sideShowing(state, id) {
  const value = sessionId(id);
  if (!value) return null;
  const at = state.sides.findIndex((side) => side.current === value);
  return at === -1 ? null : at;
}
/** A pane's App reports what it shows (its open session, or null on the new-session page, and the title). */
export function reportSide(state, side, { current = null, title = "" } = {}) {
  const next = { current: sessionId(current), title: typeof title === "string" ? title.slice(0, 200) : "" };
  const entry = state.sides[side];
  if (!entry || (entry.current === next.current && entry.title === next.title)) return state;
  return { ...state, sides: state.sides.map((value, at) => (at === side ? next : value)) };
}
const clampFocus = (state, index) => Math.max(0, Math.min(index, state.panes.length));
// Rebuild the state from a grid result: panes keep their key (and App), a new entry (key null) mounts a new App on
// its session, and a pane whose session changed navigates. `primary` (when given) is the primary's new session.
function commit(state, entries, { focus, primary, resetWeights = false, focusEffect = true } = {}) {
  let nextKey = state.nextKey;
  const previous = new Map(state.panes.map((pane, at) => [pane.key, { pane, side: state.sides[at + 1] }]));
  const effects = [];
  const panes = [], sides = [primary === undefined ? state.sides[0] : { current: primary, title: primary === state.sides[0].current ? state.sides[0].title : "" }];
  entries.forEach((entry, at) => {
    const old = entry.key === null ? undefined : previous.get(entry.key);
    if (old === undefined) {
      const key = nextKey++;
      panes.push({ key, pos: entry.pos, initial: entry.id });
      sides.push({ current: entry.id, title: "" });
      return;
    }
    panes.push(old.pane.pos === entry.pos ? old.pane : { ...old.pane, pos: entry.pos });
    if (old.side.current === entry.id) sides.push(old.side);
    else { sides.push({ current: entry.id, title: "" }); effects.push({ navigate: [at + 1, entry.id] }); }
  });
  if (primary !== undefined && primary !== state.sides[0].current) effects.unshift({ navigate: [0, primary] });
  const active = Math.max(0, Math.min(focus ?? state.active, panes.length));
  if (focusEffect && focus !== undefined) effects.push({ focus: active });
  const columnsChanged = columnCount(entries) !== columnCount(paneEntries(state));
  return {
    state: { ...state, open: panes.length > 0, panes, sides, active, nextKey, colWeights: resetWeights || columnsChanged ? null : state.colWeights },
    effects,
  };
}
const MAX = (state) => state.maxColumns;

/** addPane / "Open in split view": the primary's session or a shown session only takes the focus; else the session
 * opens at `target` (default: a new column, else the first free bottom cell, else the last session pane). */
export function openSplit(state, id = null, { target = null } = {}) {
  const value = sessionId(id);
  if (value === null) return addDraftPane(state, target);
  const shown = sideShowing(state, value);
  if (shown !== null) return { state: shown === state.active ? state : { ...state, active: shown }, effects: [{ focus: shown }] };
  const entries = paneEntries(state);
  const result = placeResult(entries, MAX(state), { key: null, id: value }, target ?? defaultTarget(entries, MAX(state)));
  if (result === null) return unchanged(state);
  return commit(state, result.next, { focus: result.focusIndex, resetWeights: result.grew });
}
/** addDraftPane: a new-session pane at `target` (default as openSplit). */
export function addDraftPane(state, target = null) {
  const entries = paneEntries(state);
  const result = placeResult(entries, MAX(state), { key: null, id: null }, target ?? defaultTarget(entries, MAX(state)));
  if (result === null) return unchanged(state);
  return commit(state, result.next, { focus: result.focusIndex, resetWeights: result.grew });
}
/** insertLeftOfPrimary (a row dropped left of the primary): the session becomes the primary's, the primary's moves right. */
export function openLeftOfPrimary(state, id) {
  const value = sessionId(id), primary = primaryOf(state);
  if (value === null || primary === null || value === primary) return unchanged(state);
  const next = insertLeftResult(paneEntries(state), value, primary, MAX(state));
  return next === null ? unchanged(state) : commit(state, next, { primary: value, focus: 0, resetWeights: true });
}
/** closePane (t9 for the primary): an extra pane closes; closing the primary promotes the first session pane into it
 * (or, with only new-session panes, shows the new-session page there, or closes the last of them). */
export function closeSide(state, side = state.active) {
  if (!state.open) return unchanged(state);
  const entries = paneEntries(state);
  if (side === 0) {
    const first = panesInOrder(entries).find((item) => !isDraft(item.entry));
    if (first) {
      const next = removePromoting(entries, first.paneIndex - 1);
      return commit(state, next, { primary: first.entry.id, focus: 0 });
    }
    if (primaryOf(state) !== null) return { state: { ...state, active: 0 }, effects: [{ navigate: [0, null] }, { focus: 0 }] };
    return closeSide(state, panesInOrder(entries).at(-1).paneIndex);
  }
  if (side < 1 || side > entries.length) return unchanged(state);
  const next = normalizeEntries(entries.filter((_, at) => at !== side - 1));
  const focus = side < state.active ? state.active - 1 : Math.min(state.active, next.length);
  return commit(state, next, { focus });
}
/** setFocusedIndex: a click or focus inside a pane makes it the focused pane; `move` also moves keyboard focus. */
export function focusSide(state, side, { move = false } = {}) {
  if (!state.open || !Number.isInteger(side) || side < 0 || side > state.panes.length) return unchanged(state);
  const next = state.active === side ? state : { ...state, active: side };
  return { state: next, effects: move ? [{ focus: side }] : [] };
}
/** F$: Focus Next / Previous Split View in reading order (the primary first), wrapping. */
export function focusNext(state, step = 1) {
  if (!state.open) return unchanged(state);
  const order = [0, ...panesInOrder(paneEntries(state)).map((item) => item.paneIndex)];
  const at = order.indexOf(clampFocus(state, state.active));
  return focusSide(state, order[(at + step + order.length) % order.length], { move: true });
}
const indexOfCell = (entries, pos) => (pos.col === 0 && pos.row === 0 ? 0 : (() => { const at = indexAt(entries, pos); return at === -1 ? null : at + 1; })()); // M$
/** N$: the pane next to pane `index` in an arrow's direction, or null. */
export function neighbourPane(entries, index, key) {
  const from = index === 0 ? PRIMARY_POS : entries[index - 1].pos, columns = columnCount(entries);
  let to = null;
  if (key === "ArrowLeft" && from.col > 0) to = { col: from.col - 1, row: from.row };
  else if (key === "ArrowRight" && from.col < columns - 1) to = { col: from.col + 1, row: from.row };
  else if (key === "ArrowUp" && from.row === 1) to = { col: from.col, row: 0 };
  else if (key === "ArrowDown" && from.row === 0) to = { col: from.col, row: 1 };
  if (to === null) return null;
  const found = indexOfCell(entries, to);
  return found === null ? (to.row === 1 ? indexOfCell(entries, { col: to.col, row: 0 }) : null) : found;
}
/** ⌃⌘Arrow: focus the neighbouring pane. */
export function focusDirection(state, direction) {
  if (!state.open) return unchanged(state);
  const key = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" }[direction];
  const from = clampFocus(state, state.active), to = key ? neighbourPane(paneEntries(state), from, key) : null;
  return to === null || to === from ? unchanged(state) : focusSide(state, to, { move: true });
}
/** e9: move pane `paneIndex` to `target` — a pane changes cell; the primary (or a move into the primary's cell)
 * trades sessions with the pane it lands on; a target left of the primary opens a new first column. */
export function movePane(state, paneIndex, target) {
  const entries = paneEntries(state), primary = primaryOf(state), max = MAX(state);
  if (isLeftTarget(target)) {
    if (paneIndex === 0) {
      if (primary === null) return unchanged(state);
      const next = primaryToNewColumnResult(entries, max);
      return next === null ? unchanged(state) : commit(state, next, { focus: 0, resetWeights: true });
    }
    const entry = entries[paneIndex - 1];
    return entry === undefined || isDraft(entry) ? unchanged(state) : openLeftOfPrimary(state, entry.id);
  }
  if (paneIndex !== 0 && !samePos(target, PRIMARY_POS)) {
    const result = movePaneResult(entries, paneIndex, target, max);
    return result === null ? unchanged(state) : commit(state, result.next, { focus: result.focusIndex, resetWeights: result.grew });
  }
  if (primary === null) return unchanged(state);
  const cell = paneIndex === 0 ? target : entries[paneIndex - 1]?.pos;
  if (cell === undefined) return unchanged(state);
  const result = movePrimaryResult(entries, primary, cell, max);
  if (result === null) return unchanged(state);
  return commit(state, result.next, { primary: result.promoted, focus: paneIndex === 0 ? result.movedIndex : 0 });
}
/** insertPaneAbove (a pane dropped on a column's top band). */
export function movePaneAbove(state, paneIndex, col) {
  const result = insertAboveResult(paneEntries(state), paneIndex, col, primaryOf(state));
  if (result === null) return unchanged(state);
  return commit(state, normalizeEntries(result.next), { primary: result.promoted ?? undefined, focus: result.focusIndex });
}
/** A sidebar row, a notification or a deep link opens a session in the focused pane (openInPane); a session another
 * pane already shows takes the focus there instead. */
export function openInFocusedSide(state, id) {
  const value = sessionId(id);
  const shown = sideShowing(state, value);
  if (shown !== null && state.open) return { state: { ...state, active: shown }, effects: [{ focus: shown }] };
  if (shown === 0) return { state, effects: [{ navigate: [0, value] }] };
  return { state, effects: [{ navigate: [state.open ? clampFocus(state, state.active) : 0, value] }] };
}
export function setMaxColumns(state, value) {
  const next = Math.max(1, Math.min(SPLIT_MAX_COLUMNS, Number.isFinite(value) ? Math.floor(value) : 2));
  return next === state.maxColumns ? state : { ...state, maxColumns: next };
}
/** setColWeights: a resize commits the column weights (each at least 0.01). */
export function setColWeights(state, weights) {
  if (!Array.isArray(weights) || weights.length !== columnCount(paneEntries(state))) return state;
  return { ...state, colWeights: weights.map((value) => (value > 0.01 ? value : 0.01)) };
}
export function setRowSplit(state, value) {
  const next = Math.min(SPLIT_ROW.MAX, Math.max(SPLIT_ROW.MIN, Number.isFinite(value) ? value : SPLIT_ROW.DEFAULT));
  return next === state.rowSplit ? state : { ...state, rowSplit: next };
}
// Ka: the parked panes come back (minus the primary's session), and any pane opened meanwhile is placed after them.
function unparkEntries(state, parked, primary) {
  let entries = parked;
  let resetWeights = false;
  const at = primary === null ? -1 : parked.findIndex((entry) => entry.id === primary);
  if (at !== -1) {
    entries = removePromoting(parked.filter((entry, index) => index <= at || entry.id !== primary), at);
    if (columnCount(entries) !== columnCount(parked)) resetWeights = true;
  }
  for (const pane of paneEntries(state)) {
    if (indexOfRef(entries, refKey(pane)) !== -1) continue;
    const columns = columnCount(entries);
    const placed = placeResult(entries, SPLIT_MAX_COLUMNS, pane, nextSlot(entries, state.maxColumns) ?? defaultTarget(entries, SPLIT_MAX_COLUMNS));
    entries = placed === null ? normalizeEntries([...entries, { ...pane, pos: { col: columns, row: 0 } }]) : placed.next;
    if (columnCount(entries) !== columns) resetWeights = true;
  }
  return { entries, resetWeights };
}
/** setConstrained (shared-23 u1, a window ≤ 700px): the extra panes are parked and only the primary shows; widening
 * the window brings them back. */
export function setConstrained(state, constrained) {
  const value = !!constrained;
  if (value === state.constrained) return unchanged(state);
  if (value) {
    if (!state.panes.length) return { state: { ...state, constrained: true, active: 0 }, effects: [] };
    const parked = paneEntries(state).map((entry) => ({ key: null, id: entry.id, pos: entry.pos }));
    return { state: { ...state, constrained: true, parked, open: false, panes: [], sides: [state.sides[0]], active: 0 }, effects: [] };
  }
  if (state.parked === null) return { state: { ...state, constrained: false }, effects: [] };
  const focusedRef = state.active > 0 ? refKey(paneEntries(state)[state.active - 1]) : null;
  const { entries, resetWeights } = unparkEntries(state, state.parked, primaryOf(state));
  const focus = focusedRef === null ? 0 : Math.max(0, indexOfRef(entries, focusedRef) + 1);
  const result = commit({ ...state, constrained: false, parked: null }, entries, { focus, resetWeights, focusEffect: false });
  return { state: result.state, effects: result.effects.filter((effect) => !effect.navigate) };
}
/** A View › Split View command or its shortcut (J$ / B$). */
export function splitCommand(state, command) {
  const entries = paneEntries(state), focused = clampFocus(state, state.active);
  switch (command) {
    case "new-right": case "new-below": {
      const menu = splitMenuState(state);
      if (command === "new-right" ? !menu.newRight : !menu.newBelow) return unchanged(state);
      const target = command === "new-right" ? { col: columnCount(entries), row: 0 } : { col: focused === 0 ? 0 : entries[focused - 1].pos.col, row: 1 };
      return addDraftPane(state, target);
    }
    case "focus-next": return focusNext(state, 1);
    case "focus-previous": return focusNext(state, -1);
    case "focus-left": case "focus-right": case "focus-up": case "focus-down": return focusDirection(state, command.slice(6));
    case "move-left": case "move-right": case "move-up": case "move-down": {
      const dir = command.slice(5), found = moveTargets(entries, focused, MAX(state), primaryOf(state) !== null).find((item) => item.dir === dir);
      return found === undefined ? unchanged(state) : movePane(state, focused, found.target);
    }
    case "close": return closeSide(state, focused);
    default: return unchanged(state);
  }
}
/** What main.cjs persists for this window (window-registry.cjs sanitizeLayout): the primary's session and, with
 * session panes, their cells, the column weights, the row split and the focused pane (index into `panes`, 0 the
 * primary). New-session panes are not kept (the reference's partialize drops drafts), parked panes are. */
export function splitLayout(state) {
  const source = state.parked === null ? paneEntries(state) : unparkEntries({ ...state, constrained: false }, state.parked, null).entries;
  const kept = normalizeEntries(source.filter((entry) => !isDraft(entry)));
  if (!kept.length) return { current: primaryOf(state), split: null };
  const focusedId = state.active > 0 ? state.sides[state.active]?.current ?? null : null;
  const active = focusedId === null ? 0 : Math.max(0, kept.findIndex((entry) => entry.id === focusedId) + 1);
  const weights = Array.isArray(state.colWeights) && state.colWeights.length === columnCount(kept) ? state.colWeights : null;
  return { current: primaryOf(state), split: { panes: kept.map((entry) => ({ sessionId: entry.id, col: entry.pos.col, row: entry.pos.row })), colWeights: weights, rowSplit: state.rowSplit, active } };
}
/** The panes of a saved layout ({ panes, colWeights, rowSplit, active }, or the earlier two-sided
 * { sessionId, ratio, active }), sanitized; `known` filters out sessions that no longer exist. */
export function savedSplit(split, { known = () => true, primary = null } = {}) {
  if (!split || typeof split !== "object") return null;
  let panes = Array.isArray(split.panes) ? split.panes : null, weights = split.colWeights;
  if (panes === null && "sessionId" in split) {
    panes = [{ sessionId: split.sessionId, col: 1, row: 0 }];
    weights = Number.isFinite(split.ratio) ? [split.ratio, 1 - split.ratio] : null;
  }
  if (panes === null) return null;
  const seen = new Set(primary === null ? [] : [primary]);
  const entries = [];
  for (const pane of panes.slice(0, SPLIT_MAX_COLUMNS * 2)) {
    const id = sessionId(pane?.sessionId), col = pane?.col, row = pane?.row;
    if (id === null || seen.has(id) || !known(id) || !Number.isInteger(col) || col < 0 || col >= SPLIT_MAX_COLUMNS || (row !== 0 && row !== 1)) continue;
    seen.add(id);
    entries.push({ key: null, id, pos: { col, row } });
  }
  const unique = [];
  for (const entry of normalizeEntries(entries)) if (!unique.some((other) => samePos(other.pos, entry.pos))) unique.push(entry);
  const next = normalizeEntries(unique);
  if (!next.length) return null;
  const colWeights = Array.isArray(weights) && weights.length === columnCount(next) && weights.every((value) => Number.isFinite(value) && value > 0) ? weights.map((value) => Math.max(0.01, value)) : null;
  const rowSplit = Number.isFinite(split.rowSplit) ? Math.min(SPLIT_ROW.MAX, Math.max(SPLIT_ROW.MIN, split.rowSplit)) : SPLIT_ROW.DEFAULT;
  // `active` indexes the saved panes, some of which may have been dropped: follow the focused session.
  const focusedId = Number.isInteger(split.active) && split.active > 0 ? sessionId(panes[split.active - 1]?.sessionId) : null;
  const active = focusedId === null ? 0 : Math.max(0, next.findIndex((entry) => entry.id === focusedId) + 1);
  return { entries: next, colWeights, rowSplit, active };
}
/** Relaunch: reopen the panes a window had (main.cjs init → windowLayout.split), unless it already has panes. */
export function restoreSplit(state, split, options = {}) {
  if (state.open || state.parked !== null) return unchanged(state);
  const saved = savedSplit(split, { ...options, primary: state.sides[0].current });
  if (saved === null) return unchanged(state);
  const base = { ...state, rowSplit: saved.rowSplit };
  const result = commit(base, saved.entries, { focus: saved.active, focusEffect: false });
  const next = { ...result.state, colWeights: saved.colWeights };
  if (next.constrained) return setConstrained({ ...next, constrained: false }, true);
  return { state: next, effects: [] };
}
/** View › Split View enabled states (R$ / q$, reportSplitViewMenuState). */
export function splitMenuState(state) {
  const entries = paneEntries(state), focused = clampFocus(state, state.active);
  const col = focused === 0 ? 0 : entries[focused - 1].pos.col;
  const dirs = new Set(moveTargets(entries, focused, MAX(state), primaryOf(state) !== null).map((item) => item.dir));
  return {
    newRight: columnCount(entries) < MAX(state), newBelow: !hasBottom(entries, col), split: entries.length > 0,
    moveLeft: dirs.has("left"), moveRight: dirs.has("right"), moveUp: dirs.has("up"), moveDown: dirs.has("down"),
  };
}
// shared-21 J7 / q7: the pane items' labels.
export const PANE_MOVE_LABELS = Object.freeze({
  topLeft: "Move split view to top left", left: "Move split view left", right: "Move split view right", up: "Move split view up",
  down: "Move split view down", bottomLeft: "Move split view to bottom left", newColumn: "Move split view to new column",
});
/** shared-21 Qse (the session header's ⋮ menu, cf74bc599 ZT paneItems): for pane `paneIndex` while split, its $7 move
 * targets ({ kind: "move", label, target }) and then Close split view ({ kind: "close", label }); none unsplit. */
export function paneMenuItems(state, paneIndex) {
  const entries = paneEntries(state);
  if (entries.length === 0 || !Number.isInteger(paneIndex) || paneIndex < 0 || paneIndex > entries.length) return [];
  return [
    ...moveTargets(entries, paneIndex, MAX(state), primaryOf(state) !== null).map(({ dir, target }) => ({ kind: "move", label: PANE_MOVE_LABELS[dir], target })),
    { kind: "close", label: "Close split view" },
  ];
}
/** The session row menu's split item (official lE/uE):Close split view for a session shown while split, Open in
 * split view for any other; nothing for the primary session of an unsplit window. */
export function sessionSplitItem(state, id) {
  const side = sideShowing(state, id);
  if (side !== null) return state.open ? { kind: "close", side } : null;
  return { kind: "open" };
}

// --- Session drop (a sidebar row dragged onto the session area; shared-19 xJ / SJ, shared-23 qQ).
/** xJ: the cell a session dropped at (x, y) opens in, from the host's column rects, or null (left of the primary
 * is LEFT_OF_PRIMARY when `canOpenLeft`). `drag` is { id, draft }. */
export function sessionDropCell(state, columns, x, y, { canOpenLeft = false, drag = null } = {}) {
  if (columns.length === 0) return null;
  const count = columns.length, max = MAX(state);
  let at = columns.findIndex((rect) => x >= rect.left && x < rect.right);
  if (at === -1) at = x < columns[0].left ? 0 : count - 1;
  const rect = columns[at];
  if (at === count - 1 && count < max && x >= rect.left + rect.width / 2) return { col: count, row: 0 };
  const row = y >= rect.top + rect.height * state.rowSplit ? 1 : 0;
  if (at !== 0 || row !== 0) {
    const pos = { col: at, row };
    return dropBlocked(state, pos, drag) ? null : pos;
  }
  return canOpenLeft && count < max && x >= rect.left + 16 && x < rect.left + rect.width / 3 ? LEFT_OF_PRIMARY : null;
}
// SJ: a new-session pane's cell is no target while a free cell exists, unless the drop moves a shown session.
function dropBlocked(state, pos, drag) {
  const entries = paneEntries(state), entry = entries.find((item) => samePos(item.pos, pos));
  if (entry === undefined || !isDraft(entry) || nextSlot(entries, MAX(state)) === null) return false;
  if (drag === null || drag.draft) return true;
  return drag.id !== primaryOf(state) && sideShowing(state, drag.id) === null;
}
/** HE / qQ: the cell the drop overlay outlines (the default target without a cell under the pointer) and its label. */
export function sessionDropBadge(state, cell) {
  const entries = paneEntries(state), hint = cell === null, pos = cell ?? defaultTarget(entries, MAX(state));
  const entry = entries.find((item) => samePos(item.pos, pos));
  return { pos, hint, label: !hint && entry !== undefined && !isDraft(entry) ? "Open here" : "Split view" };
}
/** GQ: the overlay badge's box for a cell (8px inset), from the column weights. */
export function dropBadgeBox(pos, weights, topOnly) {
  const count = weights.length;
  const box = (left, width, kind) => ({
    left: `calc(${left}% + 8px)`, width: `calc(${width}% - 16px)`,
    top: kind === "bottom" ? "calc(var(--df-pane-row, 0.5) * 100% + 8px)" : 8,
    height: kind === "full" ? "calc(100% - 16px)" : kind === "top" ? "calc(var(--df-pane-row, 0.5) * 100% - 16px)" : "calc((1 - var(--df-pane-row, 0.5)) * 100% - 16px)",
  });
  if (pos.col >= count) { const width = 100 / (count + 1); return box(100 - width, width, "full"); }
  if (pos.col < 0) return box(0, 100 / (count + 1), "full");
  let total = 0, before = 0;
  for (let col = 0; col < count; col++) { if (col < pos.col) before += weights[col]; total += weights[col]; }
  const sum = Math.max(1, total), left = (before / sum) * 100, width = (weights[pos.col] / sum) * 100;
  return pos.row === 1 ? box(left, width, "bottom") : box(left, width, topOnly ? "top" : "full");
}
/** The pane drop's badge text: Swap onto a pane (or the primary), Move here onto an empty cell. */
export function paneDropLabel(state, drop) {
  if (drop.above) return "Move here";
  return (drop.target.col === 0 && drop.target.row === 0) || paneEntries(state).some((entry) => samePos(entry.pos, drop.target)) ? "Swap" : "Move here";
}
/** aN: the hint shown while a dragged pane has no drop: its first move target. */
export function paneDragHint(state, dragIndex) {
  const first = moveTargets(paneEntries(state), dragIndex, MAX(state), primaryOf(state) !== null)[0];
  return first === undefined ? null : { target: first.target, above: false };
}
/** Apply a pane drop ({ target, above }) for pane `dragIndex`. */
export function dropPane(state, dragIndex, drop) {
  return drop.above ? movePaneAbove(state, dragIndex, drop.target.col) : movePane(state, dragIndex, drop.target);
}

// --- Split-view tip (2.31226.0 c11959232 yd store "epitaxy-split-suggestion", bd/vd/wd/xd/Sd/Td, Ed card): a user who
// keeps switching back and forth between two sessions (A, B, A, B within 30 s) is offered to see them side by side.
// Shown at most 3 times, at most once per run (window renderer), never again once accepted, and after a dismissal not
// before a day (then a week) has passed. It is retracted as soon as the user leaves the A/B pair, opens split view or
// the card's gate closes; going to the suggested session points the card at the one just left (repoint).
export const SPLIT_SUGGESTION_KEY = "epitaxy-split-suggestion";
export const SPLIT_SUGGESTION_WINDOW_MS = 30_000;
export const SPLIT_SUGGESTION_MAX_SHOWS = 3;
export const SPLIT_SUGGESTION_HISTORY = 8; // gd
const DAY_MS = 24 * 60 * 60 * 1000;
// hd: the wait after the nth dismissal (0-based dismissals so far): none, then a day, then a week.
export const SPLIT_SUGGESTION_BACKOFF_MS = Object.freeze([0, DAY_MS, 7 * DAY_MS]);
/** yd's initial state: the persisted counters and this run's card (partner, pairKeys, shownThisRun, impressionSpent). */
export const emptySplitSuggestion = Object.freeze({ shownCount: 0, accepted: false, dismissCount: 0, lastDismissedAt: 0,
  partner: null, pairKeys: null, shownThisRun: false, impressionSpent: false });

/** _d: the last session switches (at most 8), with the new one appended unless it repeats the latest. */
export function recordSessionSwitch(history, id, at) {
  const list = Array.isArray(history) ? history.filter((entry) => entry && typeof entry.id === "string" && Number.isFinite(entry.at)) : [];
  if (typeof id !== "string" || !id || list.at(-1)?.id === id) return list;
  return [...list, { id, at }].slice(-SPLIT_SUGGESTION_HISTORY);
}
/** vd: the session before the current one when the last four switches alternate between two sessions within 30 s. */
export function alternatingPartner(history, now = Date.now()) {
  if (!Array.isArray(history) || history.length < 4) return null;
  const [a, b, c, d] = history.slice(-4);
  if (now - a.at > SPLIT_SUGGESTION_WINDOW_MS) return null;
  if (a.id === b.id || b.id === c.id || c.id === d.id) return null;
  if (a.id !== c.id || b.id !== d.id) return null;
  return c.id;
}
/**
 * The saved counters (zustand persist {state, version}, partialize: shownCount, accepted, dismissCount,
 * lastDismissedAt), sanitized, with this run's card cleared. The earlier local shape ({shown, lastShownAt, accepted,
 * dismissed} as counts) reads as the same counters.
 */
export function splitSuggestionState(value) {
  const raw = value && typeof value === "object" ? (value.state && typeof value.state === "object" ? value.state : value) : {};
  const count = (...keys) => { for (const key of keys) if (Number.isInteger(raw[key]) && raw[key] >= 0) return raw[key]; return 0; };
  const time = (...keys) => { for (const key of keys) if (Number.isFinite(raw[key]) && raw[key] >= 0) return raw[key]; return 0; };
  return { ...emptySplitSuggestion, shownCount: count("shownCount", "shown"), accepted: raw.accepted === true || (Number.isInteger(raw.accepted) && raw.accepted > 0),
    dismissCount: count("dismissCount", "dismissed"), lastDismissedAt: time("lastDismissedAt", "lastShownAt") };
}
/** What yd persists. */
export function persistedSplitSuggestion(state) {
  const s = state ?? emptySplitSuggestion;
  return { state: { shownCount: s.shownCount, accepted: s.accepted === true, dismissCount: s.dismissCount, lastDismissedAt: s.lastDismissedAt }, version: 0 };
}
/** bd's gate: no card yet this run, not accepted, under 3 shows, past the dismiss backoff, and the window not split. */
export function maySuggestSplit(state, now = Date.now(), { splitOpen = false } = {}) {
  const s = state ?? emptySplitSuggestion;
  if (s.partner !== null || s.shownThisRun || s.accepted || s.shownCount >= SPLIT_SUGGESTION_MAX_SHOWS || splitOpen) return false;
  const wait = SPLIT_SUGGESTION_BACKOFF_MS[Math.min(s.dismissCount, SPLIT_SUGGESTION_BACKOFF_MS.length - 1)];
  // A dismissal stamped in the future (a clock change) counts from now.
  const last = Math.min(s.lastDismissedAt, now);
  return now - last >= wait;
}
/** Sd: the card goes away without counting as a dismissal (the user left the pair, split opened, its gate closed). */
export function retractSplitSuggestion(state) {
  return state.pairKeys === null && state.partner === null ? state : { ...state, partner: null, pairKeys: null };
}
/**
 * wd + bd: the window now shows session `id` (null: no session, e.g. the new-session page — xd retracts). Returns the
 * next state and switch history. Leaving the A/B pair retracts the card; going to the suggested session repoints it at
 * the session just left; otherwise the switch is recorded and, when the gate allows, a new alternation shows the card
 * (trigger: partner, pairKeys [current, partner], shownThisRun).
 */
export function splitSuggestionNavigate(state, history, id, now = Date.now(), { splitOpen = false } = {}) {
  let next = state ?? emptySplitSuggestion;
  const list = Array.isArray(history) ? history : [];
  if (typeof id !== "string" || !id) return { state: retractSplitSuggestion(next), history: list };
  const last = list.at(-1);
  if (next.pairKeys !== null) {
    if (next.pairKeys.includes(id)) {
      if (next.partner !== null && id === next.partner && last !== undefined && last.id !== id) next = { ...next, partner: last.id };
    } else next = retractSplitSuggestion(next);
  }
  if (last !== undefined && last.id === id) return { state: next, history: list };
  // A dismissal stamped in the future is moved to now (bd), so the backoff cannot stall forever.
  if (next.lastDismissedAt > now) next = { ...next, lastDismissedAt: now };
  const recorded = recordSessionSwitch(list, id, now);
  if (!maySuggestSplit(next, now, { splitOpen })) return { state: next, history: recorded };
  const partner = alternatingPartner(recorded, now);
  if (partner === null) return { state: next, history: recorded };
  return { state: { ...next, partner, pairKeys: [id, partner], shownThisRun: true, impressionSpent: false }, history: recorded };
}
/** Ed's impression: the first render of a card counts once toward the 3 shows. */
export function splitSuggestionShown(state) {
  return state.impressionSpent ? state : { ...state, shownCount: state.shownCount + 1, impressionSpent: true };
}
/** The card's X: gone, one more dismissal, and the backoff counts from now. */
export function dismissSplitSuggestion(state, now = Date.now()) {
  return { ...state, partner: null, pairKeys: null, dismissCount: state.dismissCount + 1, lastDismissedAt: now };
}
/** Open in split view: gone for good. */
export function acceptSplitSuggestion(state) {
  return { ...state, partner: null, pairKeys: null, accepted: true };
}
