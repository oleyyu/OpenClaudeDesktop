// Drag-to-dock geometry for the tile tree. Independent implementation of the
// zone rules traced from 2.2553.1 panes-tile-math-current.js (:83-323 zone
// construction, :422-493 hit test). Pure: rects in, targets out.
//
// Zone families, each produced by its own generator in priority order:
//   1. container edge bands (split of the root across / along its axis),
//   2. per-tile edge strips (wrap a sibling; a two-child parent splits itself),
//   3. the dragged tile's own strips (split of its parent, exempt from dedupe),
//   4. the source stack's live-reorder zone,
//   5. insert zones of every other stack cut at its children's midpoints,
//   6. half-tile insert zones of tiles outside the source stack.
// Zones whose resulting layout equals the current one (or a plain reorder of
// the source stack) are dropped; the remaining equal outcomes keep only the
// zone with the largest visible area, at its original priority position.
import { findStack, hasTile, insertTile, layoutKey, moveTile, nodeKey, parentOfTile, findTilePath, parentAtPath } from "./tile-layout-model.mjs";

export const EDGE_STRIP_PX = 24;
export const DEAD_RADIUS_PX = 16;
const FAR = 1e4;

export function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}
export function contains(point, box) {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}
const midpoint = (box, isRow) => (isRow ? box.left + box.width / 2 : box.top + box.height / 2);
// Slice `box` along its main axis: [from, to) in that axis, full extent across.
const slice = (box, isRow, from, to) => (isRow ? rect(from, box.top, to - from, box.height) : rect(box.left, from, box.width, to - from));

// Perpendicular strip depth: 24px, or a third of the extent when the parent
// stack has exactly two children.
export function pairStrip(size) {
  return Math.max(EDGE_STRIP_PX, Math.floor(size / 3));
}
// The two strips hugging the start/end edge of `box` along `direction`.
function strips(box, direction, startDepth, endDepth) {
  const isRow = direction === "row";
  const extent = isRow ? box.width : box.height;
  const origin = isRow ? box.left : box.top;
  return [slice(box, isRow, origin, origin + startDepth), slice(box, isRow, origin + extent - endDepth, origin + extent)];
}
export function edgeStrips(box, direction) {
  return strips(box, direction, EDGE_STRIP_PX, EDGE_STRIP_PX);
}
export function pairStrips(box, direction) {
  const depth = pairStrip(direction === "row" ? box.width : box.height);
  return strips(box, direction, direction === "row" ? depth : EDGE_STRIP_PX, depth);
}

// Snapshot every stack/tile rect relative to the container. `measure(key)`
// returns a DOMRect-like box in the same coordinate space as containerRect.
export function createDragSnapshot({ layout, containerRect, measure, sourceTileId, hiddenFullHeightIds = new Set(), startPointer = null, offset = { x: 0, y: 0 }, gap }) {
  const toLocal = (box) => rect(box.left - containerRect.left, box.top - containerRect.top, box.width, box.height);
  const nodeRects = {};
  const stacks = [];
  const tiles = [];
  // Returns false when the node could not be measured; its subtree is skipped.
  const record = (node, parent, index) => {
    const key = nodeKey(node);
    const measured = measure(key);
    if (!measured) return false;
    let box = toLocal(measured);
    if (key === sourceTileId && (offset.x !== 0 || offset.y !== 0)) box = rect(box.left - offset.x, box.top - offset.y, box.width, box.height);
    nodeRects[key] = box;
    if (node.kind === "tile") {
      if (parent) tiles.push({ tileId: node.tileId, rect: box, parentId: parent.id, parentDirection: parent.direction, indexInParent: index });
      return true;
    }
    const childRects = [];
    node.children.forEach((child, childIndex) => {
      if (record(child, node, childIndex)) childRects.push(nodeRects[nodeKey(child)]);
    });
    stacks.push({ stack: node, rect: box, childRects });
    return true;
  };
  record(layout.root, null, 0);
  const sourceParent = parentOfTile(layout, sourceTileId);
  if (hasTile(layout, sourceTileId) && (!sourceParent || !nodeRects[sourceTileId])) return null;
  const pointer = startPointer ? { x: startPointer.x - containerRect.left, y: startPointer.y - containerRect.top } : null;
  const dropRects = buildDropRects({ layout, gap, sourceTileId, hiddenFullHeightIds, sourceParent, nodeRects, stacks, tiles, pointer });
  return { containerRect, nodeRects, sourceParentId: sourceParent?.id ?? null, startPointer: pointer, dropRects };
}

const targetZone = (box, target, extra) => ({ kind: "target", rect: box, target, ...extra });

// 1. Bands along the four container edges. Normally gap-deep and extended far
// outside the container; when the drag started within max(gap, 24) of an edge
// the band collapses to the edge line so the pointer can still reach it.
function containerEdgeZones({ root, rootRect, gap, pointer }) {
  const isRow = root.direction === "row";
  const band = (edge, depth) => {
    switch (edge) {
      case "top": return rect(rootRect.left, rootRect.top - FAR, rootRect.width, depth + FAR);
      case "bottom": return rect(rootRect.left, rootRect.bottom - depth, rootRect.width, depth + FAR);
      case "left": return rect(rootRect.left - FAR, rootRect.top - FAR, depth + FAR, rootRect.height + FAR * 2);
      default: return rect(rootRect.right - depth, rootRect.top - FAR, depth + FAR, rootRect.height + FAR * 2);
    }
  };
  const edges = [
    ["top", "column", 0],
    ["bottom", "column", isRow ? 1 : root.children.length],
    ["left", "row", 0],
    ["right", "row", isRow ? root.children.length : 1],
  ];
  return edges.map(([edge, direction, index]) => {
    const nearStart = pointer && contains(pointer, band(edge, Math.max(gap, EDGE_STRIP_PX)));
    return targetZone(band(edge, nearStart ? 0 : gap), { kind: "split", stackId: root.id, index, direction });
  });
}

// 2. Strips across each other tile's perpendicular edges. Siblings inside a
// two-child source parent turn their strips into a split of that parent.
function tileStripZones({ tiles, sourceTileId, sourceParent }) {
  const pair = sourceParent && sourceParent.children.length === 2 ? sourceParent : null;
  const zones = [];
  for (const tile of tiles) {
    if (tile.tileId === sourceTileId) continue;
    const direction = tile.parentDirection === "row" ? "column" : "row";
    const siblingOfPair = pair !== null && tile.parentId === pair.id;
    const target = (index) =>
      siblingOfPair ? { kind: "split", stackId: pair.id, direction, index } : { kind: "wrap", tileId: tile.tileId, direction, index };
    (siblingOfPair ? pairStrips(tile.rect, direction) : edgeStrips(tile.rect, direction)).forEach((strip, index) => zones.push(targetZone(strip, target(index))));
  }
  return zones;
}

// 3. The dragged tile's own perpendicular strips split its parent; the strip
// the drag started in is left out.
function ownStripZones({ sourceParent, sourceTileId, nodeRects, pointer }) {
  const own = sourceParent ? nodeRects[sourceTileId] : null;
  if (!sourceParent || !own) return [];
  const direction = sourceParent.direction === "row" ? "column" : "row";
  return pairStrips(own, direction)
    .map((strip, index) => (pointer && contains(pointer, strip) ? null : targetZone(strip, { kind: "split", stackId: sourceParent.id, direction, index }, { ownStrip: true })))
    .filter(Boolean);
}

// 4. Live reorder inside the source stack.
function rearrangeZones({ sourceParent, nodeRects }) {
  const box = sourceParent ? nodeRects[sourceParent.id] : null;
  if (!sourceParent || !box || sourceParent.children.length < 2) return [];
  return [{ kind: "rearrange", rect: box, stackId: sourceParent.id, direction: sourceParent.direction }];
}

// 5. Every other stack: insert slots cut at the children's midpoints.
function foreignInsertZones({ stacks, sourceParent }) {
  const zones = [];
  for (const { stack, rect: box, childRects } of stacks) {
    if ((sourceParent && stack.id === sourceParent.id) || childRects.length === 0) continue;
    const isRow = stack.direction === "row";
    const cuts = childRects.map((child) => midpoint(child, isRow));
    const bounds = [isRow ? box.left : box.top, ...cuts, isRow ? box.right : box.bottom];
    for (let index = 0; index < bounds.length - 1; index++)
      zones.push(targetZone(slice(box, isRow, bounds[index], bounds[index + 1]), { kind: "insert", stackId: stack.id, index }));
  }
  return zones;
}

// 6. Tiles outside the source stack: their two halves insert before/after.
function halfTileZones({ tiles, sourceTileId, sourceParent }) {
  const zones = [];
  for (const tile of tiles) {
    if (tile.tileId === sourceTileId || (sourceParent && tile.parentId === sourceParent.id)) continue;
    const isRow = tile.parentDirection === "row";
    const box = tile.rect;
    const [start, middle, end] = isRow ? [box.left, midpoint(box, true), box.right] : [box.top, midpoint(box, false), box.bottom];
    zones.push(targetZone(slice(box, isRow, start, middle), { kind: "insert", stackId: tile.parentId, index: tile.indexInParent }));
    zones.push(targetZone(slice(box, isRow, middle, end), { kind: "insert", stackId: tile.parentId, index: tile.indexInParent + 1 }));
  }
  return zones;
}

function visibleArea(box, within) {
  const width = Math.min(box.right, within.right) - Math.max(box.left, within.left);
  const height = Math.min(box.bottom, within.bottom) - Math.max(box.top, within.top);
  return Math.max(0, width) * Math.max(0, height);
}

// Keep one zone per resulting layout (largest visible area wins, emitted at
// its own priority position). Root edge splits and own strips are exempt.
// Outcomes equal to the current layout or to a reorder of the source stack
// are never emitted: the rearrange zone already covers them.
function dedupeByOutcome(zones, { layout, root, rootRect, sourceParent, apply }) {
  const ignored = new Set([layoutKey(layout)]);
  if (sourceParent && sourceParent.children.length > 1)
    sourceParent.children.forEach((_, index) => ignored.add(layoutKey(apply({ kind: "insert", stackId: sourceParent.id, index }))));
  const exempt = (zone) => zone.ownStrip === true || (zone.target.kind === "split" && zone.target.stackId === root.id);
  const keyed = zones.map((zone) => (zone.kind === "rearrange" ? { zone, key: null } : { zone, key: layoutKey(apply(zone.target)) }));
  const winners = new Map();
  for (const { zone, key } of keyed) {
    if (key === null || ignored.has(key) || exempt(zone)) continue;
    const current = winners.get(key);
    if (!current || visibleArea(zone.rect, rootRect) > visibleArea(current.rect, rootRect)) winners.set(key, zone);
  }
  return keyed
    .filter(({ zone, key }) => key === null || (!ignored.has(key) && (exempt(zone) || winners.get(key) === zone)))
    .map(({ zone }) => zone);
}

// A full-height tile becomes hidden when any ancestor is a multi-child column.
function wouldHide(root, tileId) {
  const path = findTilePath(root, tileId);
  if (!path) return false;
  return path.some((_, depth) => {
    const ancestor = parentAtPath(root, path.slice(0, depth + 1));
    return !!ancestor && ancestor.direction === "column" && ancestor.children.length > 1;
  });
}

export function buildDropRects({ layout, gap, sourceTileId, hiddenFullHeightIds = new Set(), sourceParent, nodeRects, stacks, tiles, pointer = null }) {
  const root = layout.root;
  const rootRect = root.kind === "stack" ? nodeRects[root.id] : null;
  if (!rootRect) return [];
  const apply = (target) => (sourceParent ? moveTile(layout, sourceTileId, target) : insertTile(layout, sourceTileId, target));
  const context = { layout, root, rootRect, gap, sourceTileId, sourceParent, nodeRects, stacks, tiles, pointer, apply };
  const candidates = [
    ...containerEdgeZones(context),
    ...tileStripZones(context),
    ...ownStripZones(context),
    ...rearrangeZones(context),
    ...foreignInsertZones(context),
    ...halfTileZones(context),
  ];
  const zones = dedupeByOutcome(candidates, context);
  if (hiddenFullHeightIds.size === 0) return zones;
  return zones.filter((zone) => {
    if (zone.kind === "rearrange") return true;
    const next = apply(zone.target).root;
    return ![...hiddenFullHeightIds].some((id) => wouldHide(next, id));
  });
}

const firstZoneAt = (zones, point) => zones.find((zone) => contains(point, zone.rect)) ?? null;

// Live reorder: the slot the dragged tile would take once the pointer has
// crossed a sibling's midpoint (never past a sibling it has not crossed).
function reorderSlot(stack, from, nodeRects, coordinate, isRow) {
  let to = from;
  stack.children.forEach((child, index) => {
    if (index === from) return;
    const box = nodeRects[nodeKey(child)];
    if (!box) return;
    const middle = midpoint(box, isRow);
    if (index < from && coordinate < middle) to = Math.min(to, index);
    else if (index > from && coordinate > middle) to = Math.max(to, index);
  });
  return to;
}

// Pointer (client coords) -> { liveLayout, pendingLayout, feedback }.
export function hitTest(layout, snapshot, tileId, clientPointer) {
  const idle = () => ({ liveLayout: null, pendingLayout: null, feedback: { target: null } });
  const apply = (target) => (hasTile(layout, tileId) ? moveTile(layout, tileId, target) : insertTile(layout, tileId, target));
  const settle = (target) => ({ liveLayout: null, pendingLayout: apply(target), feedback: { target } });
  const point = { x: clientPointer.x - snapshot.containerRect.left, y: clientPointer.y - snapshot.containerRect.top };
  const origin = snapshot.startPointer;
  if (origin && Math.hypot(point.x - origin.x, point.y - origin.y) < DEAD_RADIUS_PX) return idle();
  const zone = firstZoneAt(snapshot.dropRects, point);
  if (!zone) return idle();
  if (zone.kind !== "rearrange") return settle(zone.target);
  const stack = findStack(layout.root, zone.stackId);
  const from = stack ? stack.children.findIndex((child) => child.kind === "tile" && child.tileId === tileId) : -1;
  if (from < 0) return idle();
  const isRow = zone.direction === "row";
  const to = reorderSlot(stack, from, snapshot.nodeRects, isRow ? point.x : point.y, isRow);
  if (to !== from) return { liveLayout: moveTile(layout, tileId, { kind: "insert", stackId: zone.stackId, index: to }), pendingLayout: null, feedback: { target: null } };
  const own = snapshot.nodeRects[tileId];
  if (own && contains(point, own)) return idle();
  const beneath = firstZoneAt(snapshot.dropRects.filter((candidate) => candidate.kind !== "rearrange"), point);
  return beneath ? settle(beneath.target) : idle();
}

// Indicator offset: half the gap between tiles, min(6, padding) at the edge.
export function indicatorOutset(config, edgeHandles, edge) {
  const boundary = edgeHandles?.[edge];
  return boundary ? config.gap / 2 : Math.min(config.gap / 2, config.padding);
}
