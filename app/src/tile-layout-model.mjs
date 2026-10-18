// Recursive tile tree for the session workspace. Independent implementation of
// the behavior traced from the 2.2553.1 pane tile engine (c360a9e1c Vh config,
// panes-tile-math-current.js layout operators, panes-state-current.js oi/ai
// opening and ratio rules). Pure data: no DOM, no React.
//
// Node shapes:
//   { kind: "tile", tileId, flex }
//   { kind: "stack", id, direction: "row" | "column", flex, children }
// A layout is { root } where root is always a stack.
//
// Design: the tree is never mutated in place. Every operator locates a node
// through an ancestor trail ([{ stack, index }] from the root down to the
// node's parent), derives a replacement for the deepest slot and rebuilds the
// spine of the tree above it with structural sharing. Placement of a tile at a
// drop target (insert / split / wrap) is one shared routine used by both the
// move and the add operators.

export const TILE_CONFIG = Object.freeze({
  gap: 12,
  padding: 8,
  minTileBasePx: 100,
  minTileWidthPx: 280,
  dragLift: 24,
});
export const CHAT_TILE_ID = "chat";
export const CHAT_OVERFLOW_MIN = Object.freeze({ width: 320, anchor: "left" });
// Local pane kinds with real data. Official ids differ (file/diff/plan); the
// side ratio rule keys them by kind name (panes-state-current.js:1552 ii).
export const PANE_KINDS = Object.freeze(["files", "changes", "plan", "tasks", "terminal", "preview", "session"]);
// "preview" is one of the official wide panes (panes-state-current.js:1554 ii): side 3 against chat 2.
const WIDE_SIDE_KINDS = new Set(["files", "changes", "preview"]);

let stackCounter = 0;
const stackPrefix = Math.floor(Math.random() * 0x7fffffff).toString(36);
export function nextStackId() {
  stackCounter += 1;
  return `stack-${stackPrefix}-${stackCounter.toString(36)}`;
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isStack = (node) => node.kind === "stack";
const isTile = (node) => node.kind === "tile";
const withFlex = (node, flex) => ({ ...node, flex });
const withChildren = (stack, children) => ({ ...stack, children });
const sum = (values) => values.reduce((total, value) => total + value, 0);

export function tileNode(tileId, flex = 1) {
  return { kind: "tile", tileId, flex };
}
export function stackNode(direction, children, flex = 1, id = nextStackId()) {
  return { kind: "stack", id, direction, flex, children };
}
export function nodeKey(node) {
  return isTile(node) ? node.tileId : node.id;
}
export function cloneNode(node) {
  return isTile(node) ? { ...node } : withChildren(node, node.children.map(cloneNode));
}
export function cloneLayout(layout) {
  return { root: cloneNode(layout.root) };
}

// ---------------------------------------------------------------------------
// Traversal: ancestor trails and immutable rebuilds.

// Depth-first search for the first node matching `match`; returns the node
// and its trail of { stack, index } entries from the root to its parent.
function locate(root, match) {
  const trail = [];
  const search = (node) => {
    if (match(node)) return node;
    if (!isStack(node)) return null;
    for (let index = 0; index < node.children.length; index++) {
      trail.push({ stack: node, index });
      const found = search(node.children[index]);
      if (found) return found;
      trail.pop();
    }
    return null;
  };
  const node = search(root);
  return node ? { node, trail } : null;
}
const locateTile = (root, tileId) => locate(root, (node) => isTile(node) && node.tileId === tileId);
const locateStack = (root, stackId) => locate(root, (node) => isStack(node) && node.id === stackId);
const parentEntry = (trail) => (trail.length ? trail[trail.length - 1] : null);

// Replace the slot addressed by `trail` (null removes it) and rebuild every
// ancestor above it; untouched branches are shared with the input tree.
function rebuild(root, trail, replacement) {
  let next = replacement;
  for (let depth = trail.length - 1; depth >= 0; depth--) {
    const { stack, index } = trail[depth];
    const children = [...stack.children];
    if (next === null) children.splice(index, 1);
    else children[index] = next;
    next = withChildren(stack, children);
  }
  return trail.length === 0 ? replacement : next;
}

// Index path from the root to the tile, or null.
export function findTilePath(root, tileId) {
  const hit = locateTile(root, tileId);
  return hit ? hit.trail.map((entry) => entry.index) : null;
}
export function nodeAtPath(root, path) {
  let node = root;
  for (const index of path) {
    if (!isStack(node) || index >= node.children.length) return null;
    node = node.children[index];
  }
  return node;
}
export function parentAtPath(root, path) {
  if (!path || path.length === 0) return null;
  const owner = nodeAtPath(root, path.slice(0, -1));
  return owner && isStack(owner) ? owner : null;
}
export function findStack(root, stackId) {
  return locateStack(root, stackId)?.node ?? null;
}
export function parentOfStack(root, stackId) {
  const hit = locateStack(root, stackId);
  return hit ? (parentEntry(hit.trail)?.stack ?? null) : null;
}
export function parentOfTile(layout, tileId) {
  const hit = locateTile(layout.root, tileId);
  return hit ? (parentEntry(hit.trail)?.stack ?? null) : null;
}

// ---------------------------------------------------------------------------
// Normalization and identity.

// Bottom-up cleanup: empty stacks vanish, a child stack running in the same
// direction dissolves into its parent, and a stack left with one child hands
// its flex to that child and disappears.
export function normalize(node) {
  if (!isStack(node)) return node;
  const merged = [];
  for (const child of node.children) {
    const clean = normalize(child);
    if (isStack(clean)) {
      if (clean.children.length === 0) continue;
      if (clean.direction === node.direction) {
        merged.push(...clean.children);
        continue;
      }
    }
    merged.push(clean);
  }
  return merged.length === 1 ? withFlex(merged[0], node.flex) : withChildren(node, merged);
}
export function asRoot(node) {
  return isStack(node) ? node : stackNode("row", [node], 1);
}
export function normalizeLayout(layout) {
  return { root: asRoot(normalize(layout.root)) };
}
const finish = (root) => normalizeLayout({ root });

// Build from a compact spec: "chat" | ["chat", 2] | {direction, flex?, children}.
export function fromSpec(spec) {
  const build = (value) =>
    typeof value === "string"
      ? tileNode(value)
      : Array.isArray(value)
        ? tileNode(value[0], value[1])
        : stackNode(value.direction, value.children.map(build), value.flex ?? 1);
  return finish(build(spec));
}

function collectTiles(node, into) {
  if (isTile(node)) into.push(node.tileId);
  else for (const child of node.children) collectTiles(child, into);
  return into;
}
export function orderedTileIds(layout) {
  return collectTiles(layout.root, []);
}
export function tileIds(layout) {
  return new Set(orderedTileIds(layout));
}
export function hasTile(layout, tileId) {
  return locateTile(layout.root, tileId) !== null;
}

// Structural identity independent of stack ids and flexes.
export function layoutKey(layout) {
  const key = (node) =>
    isTile(node) ? `T:${node.tileId}` : `S[${node.direction}](${node.children.map(key).join(",")})`;
  return key(layout.root);
}
export function layoutsEqual(a, b, { flex = true } = {}) {
  const same = (x, y) => {
    if (x.kind !== y.kind || (flex && x.flex !== y.flex)) return false;
    if (isTile(x)) return x.tileId === y.tileId;
    return x.direction === y.direction && x.children.length === y.children.length && x.children.every((child, index) => same(child, y.children[index]));
  };
  return same(a.root, b.root);
}
export function stripIds(layout) {
  const strip = (node) =>
    isTile(node)
      ? { kind: "tile", tileId: node.tileId, flex: node.flex }
      : { kind: "stack", direction: node.direction, flex: node.flex, children: node.children.map(strip) };
  return strip(layout.root);
}

// ---------------------------------------------------------------------------
// Structural operators.

// Append to the root row, or wrap a non-row root into a new row first.
export function appendTile(layout, tileId) {
  const root = layout.root;
  const row = isStack(root) && root.direction === "row" ? root : stackNode("row", [withFlex(root, 1)]);
  return finish(withChildren(row, [...row.children, tileNode(tileId)]));
}
// Stack the new tile under an existing one: a column parent grows by one
// child; inside a row the anchor is boxed into a column that keeps its flex.
export function stackUnder(layout, anchorTileId, tileId) {
  const hit = locateTile(layout.root, anchorTileId);
  const owner = hit && parentEntry(hit.trail);
  if (!owner) return appendTile(layout, tileId);
  const tile = tileNode(tileId);
  const { stack: parent, index } = owner;
  const replacement =
    parent.direction === "column"
      ? withChildren(parent, [...parent.children, tile])
      : withChildren(parent, parent.children.map((child, at) => (at === index ? stackNode("column", [withFlex(child, 1), tile], child.flex) : child)));
  return finish(rebuild(layout.root, hit.trail.slice(0, -1), replacement));
}
export function removeTile(layout, tileId) {
  const hit = locateTile(layout.root, tileId);
  if (!hit || hit.trail.length === 0) return layout;
  return finish(rebuild(layout.root, hit.trail, null));
}

// Put `tile` at a drop target inside an (un-normalized) tree. Returns the new
// root, or null when the target no longer exists. `from` describes the stack
// the tile was just detached from so a same-stack index still counts the
// vacated slot.
function placeTile(root, tile, target, from = null) {
  if (target.kind === "wrap") {
    const hit = locateTile(root, target.tileId);
    if (!hit || hit.trail.length === 0) return null;
    const anchor = hit.node;
    const pair = target.index === 0 ? [tile, withFlex(anchor, 1)] : [withFlex(anchor, 1), tile];
    return rebuild(root, hit.trail, stackNode(target.direction, pair, anchor.flex));
  }
  const hit = locateStack(root, target.stackId);
  if (!hit) return null;
  const stack = hit.node;
  if (target.kind === "split" && target.direction !== stack.direction) {
    const pair = target.index === 0 ? [tile, withFlex(stack, 1)] : [withFlex(stack, 1), tile];
    return rebuild(root, hit.trail, stackNode(target.direction, pair, stack.flex));
  }
  let index = target.index;
  if (from && from.stackId === stack.id && index > from.index) index -= 1;
  const children = [...stack.children];
  children.splice(clamp(index, 0, children.length), 0, tile);
  return rebuild(root, hit.trail, withChildren(stack, children));
}

// Move an existing tile to a drop target { kind: insert|split|wrap, ... }.
export function moveTile(layout, tileId, target) {
  const hit = locateTile(layout.root, tileId);
  const owner = hit && parentEntry(hit.trail);
  if (!owner) return layout;
  const { stack: parent, index: sourceIndex } = owner;
  const moving = hit.node;
  if (target.kind === "insert" && target.stackId === parent.id) {
    // Reorder among siblings: the index addresses the list without the tile.
    const siblings = parent.children.filter((_, at) => at !== sourceIndex);
    siblings.splice(clamp(target.index, 0, siblings.length), 0, moving);
    return finish(rebuild(layout.root, hit.trail.slice(0, -1), withChildren(parent, siblings)));
  }
  const detached = rebuild(layout.root, hit.trail, null);
  const carried = tileNode(tileId, target.kind === "insert" ? moving.flex : 1);
  const placed = placeTile(detached, carried, target, { stackId: parent.id, index: sourceIndex });
  return placed ? finish(placed) : layout;
}

// Insert a tile that is not in the layout yet at a drop target.
export function insertTile(layout, tileId, target) {
  if (hasTile(layout, tileId)) return layout;
  const placed = placeTile(layout.root, tileNode(tileId), target);
  return placed ? finish(placed) : layout;
}

// Where "Move to {edge}" would put the tile. Ancestors whose direction runs
// along the edge's axis are the candidates: the outermost one where the
// tile's branch is not already at that edge receives an insert at the edge.
// When every candidate is at the edge the answer is "at-edge" if the parent
// itself runs along the axis, otherwise the innermost candidate still takes
// the insert; with no candidate at all the parent is split across the axis.
export function edgeTarget(root, tileId, edge) {
  const hit = locateTile(root, tileId);
  const owner = hit && parentEntry(hit.trail);
  if (!owner) return null;
  if (hit.trail.length === 1 && owner.stack.children.length === 1) return "at-edge";
  const axis = edge === "left" || edge === "right" ? "row" : "column";
  const toStart = edge === "left" || edge === "top";
  const edgeIndex = (stack) => (toStart ? 0 : stack.children.length - 1);
  const candidates = hit.trail.filter(({ stack }) => stack.direction === axis);
  if (candidates.length === 0) return { kind: "split", stackId: owner.stack.id, direction: axis, index: toStart ? 0 : 1 };
  const movable = candidates.filter(({ stack, index }) => index !== edgeIndex(stack));
  if (movable.length === 0 && owner.stack.direction === axis) return "at-edge";
  const { stack } = movable[0] ?? candidates[candidates.length - 1];
  const tail = stack === owner.stack ? stack.children.length - 1 : stack.children.length;
  return { kind: "insert", stackId: stack.id, index: toStart ? 0 : tail };
}
export function isAtEdge(layout, tileId, edge) {
  return edgeTarget(layout.root, tileId, edge) === "at-edge";
}
export function moveTileToEdge(layout, tileId, edge) {
  const target = edgeTarget(layout.root, tileId, edge);
  if (target === null || target === "at-edge") return layout;
  const moved = moveTile(layout, tileId, target);
  if (target.kind !== "insert" || target.stackId === parentOfTile(layout, tileId)?.id) return moved;
  // Joining a different stack: the tile takes an even share there.
  const hit = locateTile(moved.root, tileId);
  return hit ? { root: rebuild(moved.root, hit.trail, withFlex(hit.node, 1)) } : moved;
}

// ---------------------------------------------------------------------------
// Sizing.

/** How much of an overflowMin shell its neighbour covers: the shell is at least `minimum` wide, the wrap gives it
 * `wrapWidth` plus the gap before the next tile (source-tile-layout.jsx insets the shell's content by it). */
export function coveredWidth(minimum, wrapWidth, gap = 0) {
  if (!(minimum > 0) || !Number.isFinite(wrapWidth)) return 0;
  return Math.max(0, Math.round(minimum - wrapWidth - (gap || 0)));
}

/** How the covered part is split: the chat's transcript and composer are inset only while they keep `contentMin`
 * (the narrowest a pane may be), so a chat dragged to its 100 px floor keeps a usable composer under the pane, as
 * 2.2553.1's 320 px shell does; the titlebar takes the rest (`extra`) so its title and actions stay in view. */
export function chatContentInset(covered, minimum, contentMin = TILE_CONFIG.minTileWidthPx) {
  const total = Math.max(0, Number.isFinite(covered) ? covered : 0);
  const content = Math.min(total, Math.max(0, (minimum || 0) - contentMin));
  return { content, extra: total - content };
}

// Minimum main-axis size of a node along `direction`.
export function minSize(node, direction, tileById, config = TILE_CONFIG, options = {}) {
  const axisBase = direction === "row" ? (config.minTileWidthPx ?? config.minTileBasePx) : config.minTileBasePx;
  if (isTile(node)) {
    const overflowMin = direction === "row" ? tileById?.(node.tileId)?.overflowMin : null;
    if (!overflowMin) return axisBase;
    return options.overflowMinReachable ? config.minTileBasePx : Math.max(overflowMin.width, config.minTileBasePx);
  }
  const parts = node.children.map((child) => minSize(child, direction, tileById, config, options));
  if (node.direction !== direction) return Math.max(axisBase, ...parts);
  return sum(parts) + config.gap * Math.max(0, node.children.length - 1);
}

const scaleTo = (values, total) => {
  const current = sum(values) || 1;
  return values.map((value) => (value / current) * total);
};

// Distribute `total` pixels by flex weight, lifting children to their minima
// one at a time (the first child below its minimum is pinned and the rest
// share what remains). When the minima cannot all be met, sizes fall back to
// the minima's own proportions. Returns flexes normalized to sum to the count.
export function distributeFlex(flexes, mins, total) {
  const count = flexes.length;
  if (count === 0 || total <= 0) return [...flexes];
  const pinned = new Set();
  let sizes = scaleTo(flexes, total);
  for (;;) {
    const short = sizes.findIndex((size, index) => !pinned.has(index) && size < mins[index] - 0.5);
    if (short === -1) break;
    pinned.add(short);
    const reserved = sum([...pinned].map((index) => mins[index]));
    const freeWeight = sum(flexes.filter((_, index) => !pinned.has(index)));
    const budget = total - reserved;
    if (freeWeight <= 0 || budget <= 0) {
      sizes = scaleTo(mins, total);
      break;
    }
    sizes = flexes.map((flex, index) => (pinned.has(index) ? mins[index] : (flex / freeWeight) * budget));
  }
  return scaleTo(sizes, count);
}

// Integer pixel sizes whose running edges are the rounded cumulative shares.
function splitPixels(weights, usable) {
  const total = sum(weights) || 1;
  let running = 0, previousEdge = 0;
  return weights.map((weight) => {
    running += weight;
    const edge = Math.round((running / total) * usable);
    const size = edge - previousEdge;
    previousEdge = edge;
    return size;
  });
}

// Resolve every stack: visit(stack, child, index, resolvedFlex, childBox, rowMin).
export function resolveLayout(root, size, tileById, config = TILE_CONFIG, visit) {
  const reachable = { overflowMinReachable: true };
  const minimum = (node, direction) => minSize(node, direction, tileById, config, reachable);
  const descend = (stack, box) => {
    if (!isStack(stack)) return;
    const isRow = stack.direction === "row";
    const extent = box ? (isRow ? box.width : box.height) : 0;
    const usable = Math.max(0, extent - config.gap * Math.max(0, stack.children.length - 1));
    const mins = stack.children.map((child) => minimum(child, stack.direction));
    const declared = stack.children.map((child) => child.flex);
    const weights = box ? distributeFlex(declared, mins, usable) : declared;
    const pixels = box ? splitPixels(weights, usable) : null;
    const filled = pixels ? sum(pixels) : 0;
    const resolved = filled > 0 ? pixels.map((px) => (px / filled) * weights.length) : weights;
    stack.children.forEach((child, index) => {
      const childBox = !box ? null : isRow ? { width: pixels[index], height: box.height } : { width: box.width, height: pixels[index] };
      const rowMin = isRow ? mins[index] : minimum(child, "row");
      visit(stack, child, index, resolved[index], childBox, Math.min(rowMin, childBox?.width ?? Infinity));
      descend(child, childBox);
    });
  };
  descend(root, size);
}

/** A restored layout (a session reopened, the app relaunched) with the chat tile dragged below its overflowMin
 * width: its row is redistributed so the chat gets that width back where the row has room, the neighbours keeping
 * their own minimum. A live drag may still take the chat down to its floor; only reopening restores it. */
export function withChatMinimum(layout, size, tileById, config = TILE_CONFIG) {
  if (!layout?.root || !size || !(size.width > 0)) return layout;
  const overflowMin = tileById?.(CHAT_TILE_ID)?.overflowMin;
  const hit = locateTile(layout.root, CHAT_TILE_ID);
  const owner = hit ? parentEntry(hit.trail)?.stack : null;
  if (!overflowMin || !owner || owner.direction !== "row" || owner.children.length < 2) return layout;
  const boxes = new Map([[nodeKey(layout.root), size]]);
  resolveLayout(layout.root, size, tileById, config, (stack, child, index, flex, box) => boxes.set(nodeKey(child), box));
  const chatBox = boxes.get(CHAT_TILE_ID), ownerBox = boxes.get(nodeKey(owner));
  if (!chatBox || !ownerBox || chatBox.width >= overflowMin.width - 0.5) return layout;
  const usable = ownerBox.width - config.gap * (owner.children.length - 1);
  const chatIndex = hit.trail[hit.trail.length - 1].index;
  const mins = owner.children.map((child) => minSize(child, "row", tileById, config));
  // A row too narrow for both: the chat gets what the neighbours' minimums leave.
  mins[chatIndex] = Math.min(mins[chatIndex], usable - (sum(mins) - mins[chatIndex]));
  if (mins[chatIndex] <= chatBox.width + 0.5) return layout;
  const weights = distributeFlex(owner.children.map((child) => child.flex), mins, usable);
  const scale = sum(owner.children.map((child) => child.flex)) / weights.length;
  const children = owner.children.map((child, index) => withFlex(child, weights[index] * scale));
  return { root: rebuild(layout.root, hit.trail.slice(0, -1), withChildren(owner, children)) };
}

// Shift `deltaPx` between neighbours `index` and `index + 1`, respecting minima.
export function adjustFlexes(flexes, index, deltaPx, pxPerFlex, minPx) {
  const next = [...flexes];
  const before = index, after = index + 1;
  if (before < 0 || after >= next.length) return next;
  const toFlex = (px) => px / pxPerFlex;
  const floorBefore = toFlex(typeof minPx === "number" ? minPx : minPx.before);
  const floorAfter = toFlex(typeof minPx === "number" ? minPx : minPx.after);
  const shared = next[before] + next[after];
  if (floorBefore + floorAfter > shared) return next;
  next[before] = clamp(next[before] + toFlex(deltaPx), floorBefore, shared - floorAfter);
  next[after] = shared - next[before];
  return next;
}

// ---------------------------------------------------------------------------
// Opening rules and persistence helpers (panes-state-current.js ii/ai/oi).

// First pane: chat 2 : side 3 (files/changes) or 2 : 1 (plan), or the
// remembered ratio for the kind. Additional panes append to the root row
// unless its last child is a non-chat tile, which gets stacked vertically.
export function defaultSideFlex(kind) {
  return WIDE_SIDE_KINDS.has(kind) ? 3 : 1;
}
export function initialLayout(kind, lastPaneFlexByKind = {}) {
  const remembered = lastPaneFlexByKind[kind];
  const side = Number.isFinite(remembered) && remembered > 0 ? remembered : defaultSideFlex(kind);
  return fromSpec({ direction: "row", children: [[CHAT_TILE_ID, 2], [kind, side]] });
}
export function openPane(layout, kind, lastPaneFlexByKind = {}) {
  if (!layout || !orderedTileIds(layout).some((id) => id !== CHAT_TILE_ID)) return initialLayout(kind, lastPaneFlexByKind);
  if (hasTile(layout, kind)) return layout;
  const root = layout.root;
  const last = isStack(root) && root.direction === "row" ? root.children[root.children.length - 1] : root;
  return isTile(last) && last.tileId !== CHAT_TILE_ID ? stackUnder(layout, last.tileId, kind) : appendTile(layout, kind);
}
export function chatOnlyLayout() {
  return fromSpec({ direction: "row", children: [[CHAT_TILE_ID, 1]] });
}
// Remember 2 * side.flex / chat.flex for changed root-row flanks (ai).
export function rememberPaneFlex(layout, changedKeys, lastPaneFlexByKind = {}) {
  const root = layout.root;
  if (!changedKeys || !isStack(root) || root.direction !== "row") return lastPaneFlexByKind;
  const chat = root.children.find((child) => isTile(child) && child.tileId === CHAT_TILE_ID);
  if (!chat || chat.flex <= 0) return lastPaneFlexByKind;
  let out = lastPaneFlexByKind;
  for (const child of root.children) {
    if (!isTile(child) || child.tileId === CHAT_TILE_ID || !changedKeys.includes(child.tileId)) continue;
    const ratio = (2 * child.flex) / chat.flex;
    if (out[child.tileId] !== ratio) out = { ...out, [child.tileId]: ratio };
  }
  return out;
}

// Validate a persisted/unknown value into a layout, or null.
export function sanitizeLayout(value, allowedTileIds) {
  const seen = new Set();
  const positive = (flex) => (Number.isFinite(Number(flex)) && Number(flex) > 0 ? Number(flex) : 1);
  const walk = (node) => {
    if (!node || typeof node !== "object") return null;
    if (node.kind === "tile") {
      if (typeof node.tileId !== "string" || seen.has(node.tileId)) return null;
      if (allowedTileIds && !allowedTileIds.has(node.tileId)) return null;
      seen.add(node.tileId);
      return tileNode(node.tileId, positive(node.flex));
    }
    if (node.kind !== "stack" || !["row", "column"].includes(node.direction) || !Array.isArray(node.children)) return null;
    const id = typeof node.id === "string" && node.id ? node.id : nextStackId();
    return stackNode(node.direction, node.children.map(walk).filter(Boolean), positive(node.flex), id);
  };
  const root = value && typeof value === "object" ? walk(value.root) : null;
  if (!root) return null;
  const layout = finish(root);
  return orderedTileIds(layout).length > 0 ? layout : null;
}
