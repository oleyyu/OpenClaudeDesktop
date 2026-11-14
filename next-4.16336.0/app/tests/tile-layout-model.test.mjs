import test from "node:test";
import assert from "node:assert/strict";
import {
  TILE_CONFIG, adjustFlexes, appendTile, chatOnlyLayout, distributeFlex, edgeTarget, fromSpec, initialLayout, insertTile, isAtEdge,
  layoutKey, layoutsEqual, minSize, moveTile, moveTileToEdge, normalize, openPane, orderedTileIds, rememberPaneFlex, removeTile,
  resolveLayout, sanitizeLayout, stackNode, stackUnder, tileIds, tileNode,
} from "../src/tile-layout-model.mjs";

const tiles = (id) => (id === "chat" ? { id, overflowMin: { width: 320, anchor: "left" } } : { id });
const rootOf = (layout) => layout.root;

test("initial layout is chat 2 : side 3 for files/changes, 2 : 1 for plan, and the remembered ratio wins", () => {
  for (const kind of ["files", "changes"]) {
    const layout = initialLayout(kind);
    assert.equal(layoutKey(layout), `S[row](T:chat,T:${kind})`);
    assert.deepEqual(rootOf(layout).children.map((child) => child.flex), [2, 3]);
  }
  assert.deepEqual(rootOf(initialLayout("plan")).children.map((child) => child.flex), [2, 1]);
  assert.deepEqual(rootOf(initialLayout("plan", { plan: 2.5 })).children.map((child) => child.flex), [2, 2.5]);
  assert.deepEqual(rootOf(initialLayout("files", { files: -1 })).children.map((child) => child.flex), [2, 3], "invalid memory ignored");
});

test("a third pane stacks under a trailing non-chat tile, or appends when chat is last", () => {
  const files = openPane(chatOnlyLayout(), "files");
  assert.equal(layoutKey(files), "S[row](T:chat,T:files)");
  const plan = openPane(files, "plan");
  assert.equal(layoutKey(plan), "S[row](T:chat,S[column](T:files,T:plan))");
  const column = rootOf(plan).children[1];
  assert.equal(column.flex, 3, "the column inherits the files flex");
  assert.deepEqual(column.children.map((child) => child.flex), [1, 1]);
  const chatLast = fromSpec({ direction: "row", children: [["files", 3], ["chat", 2]] });
  assert.equal(layoutKey(openPane(chatLast, "plan")), "S[row](T:files,T:chat,T:plan)");
  assert.equal(openPane(plan, "plan"), plan, "already open is a no-op");
  const changes = openPane(plan, "changes");
  assert.equal(layoutKey(changes), "S[row](T:chat,S[column](T:files,T:plan),T:changes)", "a trailing stack (not a tile) appends to the row");
  const stacked = openPane(fromSpec({ direction: "row", children: [["chat", 2], ["files", 3]] }), "changes");
  assert.equal(layoutKey(stacked), "S[row](T:chat,S[column](T:files,T:changes))");
});

test("append wraps a non-row root and remove/normalize collapse single-child stacks", () => {
  const column = { root: stackNode("column", [tileNode("chat"), tileNode("files")]) };
  assert.equal(layoutKey(appendTile(column, "plan")), "S[row](S[column](T:chat,T:files),T:plan)");
  const layout = fromSpec({ direction: "row", children: [["chat", 2], { direction: "column", flex: 3, children: ["files", "plan"] }] });
  const removed = removeTile(layout, "plan");
  assert.equal(layoutKey(removed), "S[row](T:chat,T:files)");
  assert.equal(rootOf(removed).children[1].flex, 3, "the survivor inherits the column flex");
  const nested = normalize(stackNode("row", [tileNode("a"), stackNode("row", [tileNode("b"), tileNode("c")])]));
  assert.equal(layoutKey({ root: nested }), "S[row](T:a,T:b,T:c)", "same-direction nesting merges");
  assert.equal(removeTile(layout, "missing"), layout);
  assert.equal(layoutKey(removeTile(removeTile(layout, "files"), "plan")), "S[row](T:chat)");
});

test("moveTile handles insert (same and other stack), split and wrap targets", () => {
  const layout = fromSpec({ direction: "row", children: [["chat", 2], ["files", 3], ["plan", 1]] });
  const stackId = rootOf(layout).id;
  assert.equal(layoutKey(moveTile(layout, "plan", { kind: "insert", stackId, index: 1 })), "S[row](T:chat,T:plan,T:files)");
  assert.equal(layoutKey(moveTile(layout, "chat", { kind: "insert", stackId, index: 3 })), "S[row](T:files,T:plan,T:chat)");
  const split = moveTile(layout, "plan", { kind: "split", stackId, direction: "column", index: 0 });
  assert.equal(layoutKey(split), "S[column](T:plan,S[row](T:chat,T:files))");
  const wrapped = moveTile(layout, "plan", { kind: "wrap", tileId: "files", direction: "column", index: 1 });
  assert.equal(layoutKey(wrapped), "S[row](T:chat,S[column](T:files,T:plan))");
  assert.equal(rootOf(wrapped).children[1].flex, 3, "wrap keeps the anchor flex on the new stack");
  const columnLayout = fromSpec({ direction: "row", children: [["chat", 2], { direction: "column", flex: 3, children: ["files", "plan"] }] });
  const columnId = rootOf(columnLayout).children[1].id;
  const moved = moveTile(columnLayout, "chat", { kind: "insert", stackId: columnId, index: 1 });
  assert.equal(layoutKey(moved), "S[column](T:files,T:chat,T:plan)");
  assert.equal(moveTile(layout, "missing", { kind: "insert", stackId, index: 0 }), layout);
});

test("insertTile adds a new tile at insert/split/wrap targets and ignores duplicates", () => {
  const layout = fromSpec({ direction: "row", children: [["chat", 2], ["files", 3]] });
  const stackId = rootOf(layout).id;
  assert.equal(layoutKey(insertTile(layout, "plan", { kind: "insert", stackId, index: 0 })), "S[row](T:plan,T:chat,T:files)");
  assert.equal(layoutKey(insertTile(layout, "plan", { kind: "split", stackId, direction: "column", index: 1 })), "S[column](S[row](T:chat,T:files),T:plan)");
  assert.equal(layoutKey(insertTile(layout, "plan", { kind: "wrap", tileId: "chat", direction: "column", index: 0 })), "S[row](S[column](T:plan,T:chat),T:files)");
  assert.equal(insertTile(layout, "files", { kind: "insert", stackId, index: 0 }), layout);
});

test("edge targets: at-edge detection, insert at the outermost ancestor, or a perpendicular root split", () => {
  const row = fromSpec({ direction: "row", children: [["chat", 2], ["files", 3], ["plan", 1]] });
  assert.equal(edgeTarget(row.root, "chat", "left"), "at-edge");
  assert.equal(isAtEdge(row, "plan", "right"), true);
  assert.deepEqual(edgeTarget(row.root, "files", "right"), { kind: "insert", stackId: row.root.id, index: 2 }, "index counts the tile's own slot");
  assert.deepEqual(edgeTarget(row.root, "files", "top"), { kind: "split", stackId: row.root.id, direction: "column", index: 0 });
  assert.equal(layoutKey(moveTileToEdge(row, "chat", "right")), "S[row](T:files,T:plan,T:chat)");
  assert.equal(layoutKey(moveTileToEdge(row, "files", "bottom")), "S[column](S[row](T:chat,T:plan),T:files)");
  assert.equal(moveTileToEdge(row, "chat", "left"), row, "already at the edge is a no-op");
  const nested = fromSpec({ direction: "row", children: [["chat", 2], { direction: "column", flex: 3, children: ["files", "plan"] }] });
  assert.deepEqual(edgeTarget(nested.root, "plan", "left"), { kind: "insert", stackId: nested.root.id, index: 0 });
  const left = moveTileToEdge(nested, "plan", "left");
  assert.equal(layoutKey(left), "S[row](T:plan,T:chat,T:files)");
  assert.equal(left.root.children[0].flex, 1, "joining another stack takes an even share");
  assert.equal(edgeTarget(nested.root, "plan", "bottom"), "at-edge");
  assert.equal(layoutKey(moveTileToEdge(nested, "plan", "top")), "S[row](T:chat,S[column](T:plan,T:files))");
  assert.equal(layoutKey(moveTileToEdge(nested, "files", "right")), "S[row](T:chat,T:plan,T:files)");
  const single = chatOnlyLayout();
  assert.equal(edgeTarget(single.root, "chat", "top"), "at-edge");
});

test("minima: row tiles 280, base 100, chat overflow 320 unless reachable; stacks sum along their axis", () => {
  assert.equal(minSize(tileNode("files"), "row", tiles), 280);
  assert.equal(minSize(tileNode("files"), "column", tiles), 100);
  assert.equal(minSize(tileNode("chat"), "row", tiles), 320);
  assert.equal(minSize(tileNode("chat"), "row", tiles, TILE_CONFIG, { overflowMinReachable: true }), 100);
  const column = stackNode("column", [tileNode("files"), tileNode("plan")]);
  assert.equal(minSize(column, "row", tiles), 280);
  assert.equal(minSize(column, "column", tiles), 212);
  const row = stackNode("row", [tileNode("chat"), column]);
  assert.equal(minSize(row, "row", tiles), 320 + 12 + 280);
});

test("resolveLayout gives files 3/5 of the usable width at 1468 - sidebar and honours minima when narrow", () => {
  const layout = initialLayout("files");
  const visits = [];
  resolveLayout(layout.root, { width: 1152, height: 800 }, tiles, TILE_CONFIG, (stack, child, index, flex, box, rowMin) =>
    visits.push({ id: child.tileId, flex, width: box.width, rowMin }));
  const usable = 1152 - 12;
  assert.equal(visits[1].width, Math.round(usable * 3 / 5));
  assert.equal(visits[0].width + visits[1].width, usable);
  assert.equal(visits[0].rowMin, 100, "chat wrap minimum uses the reachable base");
  assert.equal(visits[1].rowMin, 280);
  const narrow = [];
  resolveLayout(layout.root, { width: 400, height: 800 }, tiles, TILE_CONFIG, (stack, child, index, flex, box) => narrow.push(box.width));
  assert.equal(narrow[1], 280, "the side tile holds its 280 minimum");
  assert.equal(narrow[0], 400 - 12 - 280);
});

test("distributeFlex lifts children to their minima and adjustFlexes clamps a boundary move", () => {
  assert.deepEqual(distributeFlex([2, 3], [100, 280], 1000).map((value) => Math.round(value * 100) / 100), [0.8, 1.2]);
  const lifted = distributeFlex([2, 3], [100, 280], 400);
  assert.ok(Math.abs(lifted[1] / 2 * 400 - 280) < 0.5, "the second child holds 280px");
  assert.deepEqual(distributeFlex([], [], 100), []);
  const moved = adjustFlexes([1, 1], 0, 100, 250, { before: 100, after: 100 });
  assert.deepEqual(moved.map((v) => Math.round(v * 100) / 100), [1.4, 0.6]);
  assert.deepEqual(adjustFlexes([1, 1], 0, 1000, 250, { before: 100, after: 100 }).map((v) => Math.round(v * 100) / 100), [1.6, 0.4], "clamped at the neighbour minimum");
  assert.deepEqual(adjustFlexes([1, 1], 0, 100, 250, { before: 400, after: 400 }), [1, 1], "impossible minima leave flexes alone");
  assert.deepEqual(adjustFlexes([1, 1], 1, 100, 250, 100), [1, 1], "no boundary after the last child");
});

test("rememberPaneFlex records 2*side/chat for changed root-row flanks only", () => {
  const layout = fromSpec({ direction: "row", children: [["chat", 2], ["files", 1.5], ["plan", 1]] });
  assert.deepEqual(rememberPaneFlex(layout, ["chat", "files"], {}), { files: 1.5 });
  assert.deepEqual(rememberPaneFlex(layout, ["plan"], { files: 3 }), { files: 3, plan: 1 });
  const nested = fromSpec({ direction: "row", children: [["chat", 2], { direction: "column", children: ["files", "plan"] }] });
  assert.deepEqual(rememberPaneFlex(nested, ["files"], {}), {}, "tiles inside a column are not flanks of chat");
  const memo = { files: 3 };
  assert.equal(rememberPaneFlex(layout, null, memo), memo, "no changed keys returns the same object");
  assert.equal(rememberPaneFlex(layout, ["files"], { files: 1.5 }).files, 1.5);
});

test("layoutKey/layoutsEqual/orderedTileIds and sanitizeLayout reject malformed input", () => {
  const a = fromSpec({ direction: "row", children: [["chat", 2], ["files", 3]] });
  const b = fromSpec({ direction: "row", children: [["chat", 2], ["files", 3]] });
  assert.equal(layoutsEqual(a, b), true);
  assert.equal(layoutsEqual(a, fromSpec({ direction: "row", children: [["chat", 1], ["files", 3]] })), false);
  assert.equal(layoutsEqual(a, fromSpec({ direction: "row", children: [["chat", 1], ["files", 3]] }), { flex: false }), true);
  assert.deepEqual(orderedTileIds(fromSpec({ direction: "row", children: ["chat", { direction: "column", children: ["files", "plan"] }] })), ["chat", "files", "plan"]);
  assert.deepEqual([...tileIds(a)], ["chat", "files"]);
  assert.equal(sanitizeLayout(null), null);
  assert.equal(sanitizeLayout({ root: { kind: "tile", tileId: 7 } }), null);
  const clean = sanitizeLayout({ root: { kind: "stack", direction: "row", flex: "x", children: [{ kind: "tile", tileId: "chat", flex: 2 }, { kind: "tile", tileId: "chat" }, { kind: "tile", tileId: "bogus" }] } }, new Set(["chat", "files"]));
  assert.equal(layoutKey(clean), "S[row](T:chat)", "duplicate and unknown tiles are dropped");
  assert.equal(clean.root.flex, 1);
  assert.equal(sanitizeLayout(JSON.parse(JSON.stringify(a))).root.id, a.root.id, "stack ids survive a round trip");
});
