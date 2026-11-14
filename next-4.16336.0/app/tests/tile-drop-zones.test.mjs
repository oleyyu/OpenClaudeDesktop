import test from "node:test";
import assert from "node:assert/strict";
import { DEAD_RADIUS_PX, EDGE_STRIP_PX, contains, createDragSnapshot, edgeStrips, hitTest, indicatorOutset, pairStrip, pairStrips, rect } from "../src/tile-drop-zones.mjs";
import { TILE_CONFIG, fromSpec, layoutKey } from "../src/tile-layout-model.mjs";

// Fixture: container 8px padding, three tiles in a row [chat 2, files 3, plan 1]
// laid out at 1152 x 800 with 12px gaps: chat 0..449, files 461..1140, plan 1152..
const GAP = 12;
const CONTAINER = { left: 300, top: 40, width: 1168, height: 816 };
function rowFixture() {
  const layout = fromSpec({ direction: "row", children: [["chat", 2], ["files", 3], ["plan", 1]] });
  const widths = { chat: 376, files: 566, plan: 190 };
  const rects = {};
  let x = CONTAINER.left + 8;
  for (const id of ["chat", "files", "plan"]) {
    rects[id] = rect(x, CONTAINER.top + 8, widths[id], 800);
    x += widths[id] + GAP;
  }
  rects[layout.root.id] = rect(CONTAINER.left + 8, CONTAINER.top + 8, 1152, 800);
  return { layout, rects, measure: (key) => rects[key] ?? null };
}
const client = (box, dx = 0, dy = 0) => ({ x: box.left + dx, y: box.top + dy });

test("zone constants and strip helpers follow the 24px / third-of-size rules", () => {
  assert.equal(EDGE_STRIP_PX, 24);
  assert.equal(DEAD_RADIUS_PX, 16);
  assert.equal(pairStrip(60), 24);
  assert.equal(pairStrip(300), 100);
  const box = rect(0, 0, 300, 120);
  assert.deepEqual(edgeStrips(box, "row").map((strip) => [strip.left, strip.width]), [[0, 24], [276, 24]]);
  assert.deepEqual(edgeStrips(box, "column").map((strip) => [strip.top, strip.height]), [[0, 24], [96, 24]]);
  assert.deepEqual(pairStrips(box, "row").map((strip) => [strip.left, strip.width]), [[0, 100], [200, 100]]);
  assert.deepEqual(pairStrips(box, "column").map((strip) => [strip.top, strip.height]), [[0, 24], [80, 40]]);
  assert.equal(contains({ x: 5, y: 5 }, box), true);
  assert.equal(contains({ x: 301, y: 5 }, box), false);
  assert.equal(indicatorOutset(TILE_CONFIG, { left: { stackId: "s", boundaryIndex: 0 } }, "left"), 6);
  assert.equal(indicatorOutset(TILE_CONFIG, { left: null }, "left"), 6);
  assert.equal(indicatorOutset({ gap: 12, padding: 4 }, {}, "top"), 4);
});

test("snapshot records container-relative rects, the source parent and deduplicated drop zones", () => {
  const { layout, measure } = rowFixture();
  const snapshot = createDragSnapshot({ layout, containerRect: CONTAINER, measure, sourceTileId: "plan", gap: GAP, startPointer: { x: 1400, y: 300 } });
  assert.ok(snapshot);
  assert.equal(snapshot.sourceParentId, layout.root.id);
  assert.deepEqual([snapshot.nodeRects.chat.left, snapshot.nodeRects.chat.top], [8, 8]);
  assert.deepEqual(snapshot.startPointer, { x: 1100, y: 260 });
  const kinds = snapshot.dropRects.map((zone) => zone.kind);
  assert.ok(kinds.includes("rearrange"), "the own stack has a live-reorder zone");
  const targets = snapshot.dropRects.filter((zone) => zone.kind === "target").map((zone) => zone.target);
  assert.ok(targets.some((target) => target.kind === "split" && target.stackId === layout.root.id && target.direction === "column" && target.index === 0), "top container band");
  assert.ok(targets.some((target) => target.kind === "wrap" && target.tileId === "files" && target.direction === "column"), "per-tile wrap strips");
  assert.equal(targets.filter((target) => target.kind === "insert" && target.stackId === layout.root.id).length, 0, "in-stack inserts are covered by the rearrange zone");
  const keys = new Set();
  for (const zone of snapshot.dropRects) {
    if (zone.kind !== "target" || zone.ownStrip || (zone.target.kind === "split" && zone.target.stackId === layout.root.id)) continue;
    const key = JSON.stringify(zone.target);
    assert.equal(keys.has(key), false, `duplicate zone ${key}`);
    keys.add(key);
  }
  assert.equal(createDragSnapshot({ layout, containerRect: CONTAINER, measure: () => null, sourceTileId: "plan", gap: GAP }), null, "unmeasurable source aborts");
});

test("hit test: dead radius, wrap strip on the files left edge, live reorder past a sibling midpoint", () => {
  const { layout, rects, measure } = rowFixture();
  const start = client(rects.plan, 60, 20);
  const snapshot = createDragSnapshot({ layout, containerRect: CONTAINER, measure, sourceTileId: "plan", gap: GAP, startPointer: start });
  const still = hitTest(layout, snapshot, "plan", { x: start.x + 10, y: start.y + 8 });
  assert.deepEqual(still, { liveLayout: null, pendingLayout: null, feedback: { target: null } });
  // A tile inside a row wraps on its TOP/BOTTOM 24px strips (perpendicular
  // axis); its left/right halves are row inserts covered by live reorder.
  const strip = hitTest(layout, snapshot, "plan", client(rects.files, 200, 10));
  assert.deepEqual(strip.feedback.target, { kind: "wrap", tileId: "files", direction: "column", index: 0 });
  assert.equal(layoutKey(strip.pendingLayout), "S[row](T:chat,S[column](T:plan,T:files))");
  assert.equal(strip.liveLayout, null);
  const reorder = hitTest(layout, snapshot, "plan", client(rects.files, 200, 300));
  assert.ok(reorder.liveLayout, "crossing the files midpoint reorders live");
  assert.equal(layoutKey(reorder.liveLayout), "S[row](T:chat,T:plan,T:files)");
  assert.equal(reorder.pendingLayout, null);
  assert.equal(reorder.feedback.target, null);
  const own = hitTest(layout, snapshot, "plan", client(rects.plan, 100, 400));
  assert.deepEqual(own.feedback, { target: null }, "hovering the own rect shows nothing");
  const top = hitTest(layout, snapshot, "plan", { x: rects.chat.left + 100, y: CONTAINER.top + 2 });
  assert.deepEqual(top.feedback.target, { kind: "split", stackId: layout.root.id, direction: "column", index: 0 });
  assert.equal(layoutKey(top.pendingLayout), "S[column](T:plan,S[row](T:chat,T:files))");
});

test("the container band widens to the edge while the pointer starts within max(gap, 24) of it", () => {
  const { layout, rects, measure } = rowFixture();
  const nearEdge = { x: rects.files.left + 100, y: CONTAINER.top + 8 + 4 };
  const snapshot = createDragSnapshot({ layout, containerRect: CONTAINER, measure, sourceTileId: "files", gap: GAP, startPointer: nearEdge });
  const top = snapshot.dropRects.find((zone) => zone.kind === "target" && zone.target.kind === "split" && zone.target.direction === "column" && zone.target.index === 0);
  assert.ok(top);
  assert.equal(top.rect.bottom, 8, "band ends at the container edge itself");
  const farStart = createDragSnapshot({ layout, containerRect: CONTAINER, measure, sourceTileId: "files", gap: GAP, startPointer: client(rects.files, 200, 200) });
  const normal = farStart.dropRects.find((zone) => zone.kind === "target" && zone.target.kind === "split" && zone.target.direction === "column" && zone.target.index === 0);
  assert.equal(normal.rect.bottom, 8 + GAP, "otherwise the band is gap-wide");
  // Along the row axis every container band would reproduce an in-stack
  // reorder, so those keys are dropped (the rearrange zone covers them).
  assert.equal(snapshot.dropRects.some((zone) => zone.kind === "target" && zone.target.kind === "split" && zone.target.direction === "row"), false);
});

test("a two-child parent turns sibling strips into splits of that parent and excludes the own strip under the pointer", () => {
  const layout = fromSpec({ direction: "row", children: [["chat", 2], { direction: "column", flex: 3, children: ["files", "plan"] }] });
  const column = layout.root.children[1];
  const rects = {
    [layout.root.id]: rect(0, 0, 1000, 600),
    chat: rect(0, 0, 400, 600),
    [column.id]: rect(412, 0, 588, 600),
    files: rect(412, 0, 588, 294),
    plan: rect(412, 306, 588, 294),
  };
  const container = { left: 0, top: 0, width: 1000, height: 600 };
  const snapshot = createDragSnapshot({ layout, containerRect: container, measure: (key) => rects[key] ?? null, sourceTileId: "plan", gap: GAP, startPointer: { x: 450, y: 400 } });
  const targets = snapshot.dropRects.filter((zone) => zone.kind === "target").map((zone) => zone.target);
  assert.equal(targets.some((target) => target.kind === "wrap" && target.tileId === "files"), false, "a two-child parent never wraps its sibling");
  // The sibling split strips resolve to the same layouts as the root insert
  // zones, which are larger, so dedupe keeps the insert zones.
  assert.equal(snapshot.dropRects.some((zone) => zone.kind === "target" && !zone.ownStrip && zone.target.kind === "split" && zone.target.stackId === column.id), false);
  // Inside the own column the rearrange zone wins: above the files midpoint
  // the tile reorders live; left of the column the root insert zone applies.
  const live = hitTest(layout, snapshot, "plan", { x: 420, y: 100 });
  assert.equal(layoutKey(live.liveLayout), "S[row](T:chat,S[column](T:plan,T:files))");
  assert.equal(live.feedback.target, null);
  const hit = hitTest(layout, snapshot, "plan", { x: 300, y: 100 });
  assert.deepEqual(hit.feedback.target, { kind: "insert", stackId: layout.root.id, index: 1 });
  assert.equal(layoutKey(hit.pendingLayout), "S[row](T:chat,T:plan,T:files)");
  const own = snapshot.dropRects.filter((zone) => zone.ownStrip);
  assert.equal(own.length, 1, "the own strip under the start pointer (left third) is excluded");
  assert.deepEqual(own[0].target, { kind: "split", stackId: column.id, direction: "row", index: 1 });
});
