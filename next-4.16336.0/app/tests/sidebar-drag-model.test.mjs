import test from "node:test";
import assert from "node:assert/strict";
import {
  DRAG_THRESHOLD, IDLE_INTENT, SCROLL_EDGE, SCROLL_MAX_SPEED, autoScrollSpeed, dragLabel, dragRowStyle, dropOutcome,
  intentChanged, intentShifts, keepsOrder, nextIntent, pinShifts, pinnedOrderAfterDrop, rangeShifts, reorderKeys,
  tearOffPosition, zoneAt,
} from "../src/sidebar-drag-model.mjs";

const STEP = 27;
// A list of 3 pinned rows (tops 100/127/154) above a date bucket with 3 rows (heading at 200, rows 227/254/281).
const snapshot = (overrides = {}) => ({
  pinnedKeys: ["p1", "p2", "p3"], pinnedTops: [100, 127, 154], midpoints: [113.5, 140.5, 167.5],
  belowKeys: ["label:today", "r1", "r2", "r3"], belowTops: [200, 227, 254, 281],
  groupZones: [], srcY: 254, groupSrcY: 254, srcPinnedIdx: -1, srcGroupZone: null, srcGroupIdx: -1,
  pinnedBottomAtCross: 181, pinnedBottomFloor: 181, pinnedEmptyAtStart: false, nextSectionTop: 200,
  sidebarRight: 300, scrollTopAtCross: 0, scrollViewTop: 80, scrollViewBottom: 600, rowStep: STEP, familyStep: STEP,
  startY: 267, srcPinned: false, keys: ["r2"], multi: false, canTearOff: true, alreadyOpenSession: false,
  canSplit: true, acceptsGroupDrop: true, pinSlots: true, allowUnpin: true, ...overrides,
});
const pointer = (x, y, extra = {}) => ({ x, y, scrollTop: 0, innerWidth: 1200, innerHeight: 800, liveBottom: null, paneSlot: null, ...extra });

test("oJ auto-scroll: full speed at the edge, linear to zero across the 36px band", () => {
  assert.equal(autoScrollSpeed(0, 500), -SCROLL_MAX_SPEED);
  assert.equal(autoScrollSpeed(SCROLL_EDGE / 2, 500), -SCROLL_MAX_SPEED / 2);
  assert.equal(autoScrollSpeed(500, 0), SCROLL_MAX_SPEED);
  assert.equal(autoScrollSpeed(100, 100), 0);
  assert.equal(autoScrollSpeed(-1, -1), 0, "outside the list");
});

test("KJ/qJ reorder: slots count over the original list", () => {
  assert.deepEqual(reorderKeys(["a", "b", "c", "d"], 0, ["c"]), ["c", "a", "b", "d"]);
  assert.deepEqual(reorderKeys(["a", "b", "c", "d"], 4, ["a"]), ["b", "c", "d", "a"]);
  assert.deepEqual(reorderKeys(["a", "b", "c", "d"], 3, ["a", "b"]), ["c", "a", "b", "d"]);
  assert.equal(keepsOrder(["a", "b", "c"], 1, ["a"]), true);
  assert.equal(keepsOrder(["a", "b", "c"], 2, ["a"]), false);
});

test("zJ pin shifts: an outside row opens a gap at the slot and pulls the rows above it down", () => {
  const shifts = pinShifts({ slot: 1, srcPinned: false, srcY: 254, pinnedKeys: ["p1", "p2", "p3"], pinnedTops: [100, 127, 154],
    belowKeys: ["label:today", "r1", "r2", "r3"], belowTops: [200, 227, 254, 281] });
  assert.deepEqual([...shifts], [["p2", 1], ["p3", 1], ["label:today", 1], ["r1", 1]]);
  assert.equal(pinShifts({ slot: 0, srcPinned: false, srcY: 254, pinnedKeys: [], pinnedTops: [], belowKeys: ["r1"], belowTops: [227] }).size, 0, "an empty Pinned list shifts nothing");
});

test("zJ reorder shifts: a pinned row moving up pushes the rows between down, moving down pulls them up", () => {
  const base = { srcPinned: true, pinnedKeys: ["p1", "p2", "p3"], pinnedTops: [100, 127, 154] };
  assert.deepEqual([...pinShifts({ ...base, slot: 0, srcY: 154 })], [["p1", 1], ["p2", 1]]);
  // The source (p1) is in the range too; it is hidden while dragged, so its shift never shows.
  assert.deepEqual([...pinShifts({ ...base, slot: 3, srcY: 100 })], [["p1", -1], ["p2", -1], ["p3", -1]], "slot at the end: the rows after the source move up");
  assert.deepEqual([...rangeShifts(10, 50, ["a", "b", "c"], [5, 20, 60])], [["b", 1]]);
});

test("HJ zones: the section under the pointer, its slot, and no ungrouped target for a pinned source", () => {
  const zones = [
    { id: "g1", label: "Research", top: 300, bottom: 400, keys: ["a", "b"], mids: [340, 367], accepts: true, ordered: false, shiftsWithPinned: true, slotEdgePx: 0 },
    { id: null, label: "Ungrouped", top: 400, bottom: 480, keys: ["c"], mids: [440], accepts: true, ordered: false, shiftsWithPinned: true, slotEdgePx: 0 },
  ];
  assert.deepEqual(zoneAt(zones, 350), { zone: zones[0], slotIdx: 1 });
  assert.equal(zoneAt(zones, 420).zone.id, null);
  assert.equal(zoneAt(zones, 420, 0, true), null);
  assert.equal(zoneAt(zones, 410, 20).zone.id, "g1", "zones below the Pinned list follow its growth");
  assert.equal(zoneAt(zones, 250), null);
});

test("QJ: a row from below dragged over the Pinned list targets the slot under the pointer", () => {
  const intent = nextIntent(snapshot(), pointer(100, 130));
  assert.equal(intent.slot, 1);
  assert.equal(intent.unpin, false);
  assert.equal(intent.group, null);
  assert.equal(intent.topArmed, true, "moved up past the threshold");
  const below = nextIntent(snapshot(), pointer(100, 260));
  assert.equal(below.slot, null, "below the Pinned list (plus its slack) is no pin target");
});

test("QJ: a pinned row dragged below the list asks to unpin; back over its own slot is no-op", () => {
  const pinned = snapshot({ srcPinned: true, srcPinnedIdx: 1, srcY: 127, keys: ["p2"], startY: 140 });
  const unpin = nextIntent(pinned, pointer(100, 240));
  assert.equal(unpin.unpin, true);
  assert.equal(unpin.slot, null);
  assert.equal(nextIntent(pinned, pointer(100, 135)).slot, null, "own slot");
  assert.equal(nextIntent(pinned, pointer(100, 105)).slot, 0);
  assert.equal(nextIntent({ ...pinned, allowUnpin: false }, pointer(100, 240)).unpin, false);
});

test("QJ: group sections (custom grouping) win over pin slots; the source's own unordered section is no target", () => {
  const research = { id: "g1", label: "Research", top: 300, bottom: 400, keys: ["a"], mids: [340], accepts: true, ordered: false, shiftsWithPinned: true, slotEdgePx: 0 };
  const own = { id: null, label: "Ungrouped", top: 400, bottom: 480, keys: ["r2"], mids: [440], accepts: true, ordered: false, shiftsWithPinned: true, slotEdgePx: 0 };
  const s = snapshot({ groupZones: [research, own], srcGroupZone: own, srcGroupIdx: 0, srcY: 427, groupSrcY: 427, startY: 440 });
  const move = nextIntent(s, pointer(100, 350));
  assert.equal(move.group.groupId, "g1");
  assert.equal(move.group.label, "Research");
  assert.equal(nextIntent(s, pointer(100, 450)).group, null);
  const multi = nextIntent({ ...s, multi: true, keys: ["r2", "r3"] }, pointer(100, 130));
  assert.equal(multi.slot, null, "a multi-row drag never pins");
});

test("QJ: outside the window tears off; over the content of an open session asks for a new window", () => {
  const torn = nextIntent(snapshot(), pointer(-20, 300));
  assert.equal(torn.tearOff, true);
  assert.equal(nextIntent({ ...snapshot(), canTearOff: false }, pointer(-20, 300)).tearOff, false);
  const shown = nextIntent(snapshot({ alreadyOpenSession: true, canSplit: false }), pointer(700, 300));
  assert.equal(shown.newWindow, true);
  const pane = nextIntent(snapshot(), pointer(700, 300, { paneSlot: { side: 1, mode: "open" } }));
  assert.deepEqual(pane.pane, { side: 1, mode: "open" });
  assert.equal(pane.slot, null);
});

test("QJ auto-scroll arms only after moving toward the edge", () => {
  const s = snapshot({ startY: 90 });
  assert.equal(nextIntent(s, pointer(100, 88)).scrollSpeed, 0, "within the threshold of the start: not armed");
  const armed = nextIntent(s, pointer(100, 90 - DRAG_THRESHOLD - 1));
  assert.ok(armed.scrollSpeed < 0);
  assert.equal(nextIntent(s, pointer(100, 300, { scrollTop: null })).inScrollRegion, false);
});

test("$J and eY: only target changes re-render; shifts follow the slot", () => {
  const s = snapshot();
  const a = nextIntent(s, pointer(100, 130)), b = nextIntent(s, pointer(100, 131));
  assert.equal(intentChanged(a, b), false);
  assert.equal(intentChanged(a, nextIntent(s, pointer(100, 105))), true);
  assert.deepEqual([...intentShifts(s, a)].map(([key]) => key), ["p2", "p3", "label:today", "r1"]);
  assert.equal(intentShifts(s, IDLE_INTENT).size, 0);
});

test("aY row styles: the source hides, gap rows move a step, companions dim", () => {
  const drag = { key: "r2", companions: new Set(["r3"]), shifts: new Map([["p2", 1], ["p1", -1], ["r3", 1]]), rowStep: 27, familyStep: 40, blockShift: false, groupIntent: null };
  assert.deepEqual(dragRowStyle(drag, "r2"), { visibility: "hidden" });
  assert.deepEqual(dragRowStyle(drag, "p2"), { transform: "translateY(27px)" });
  assert.deepEqual(dragRowStyle(drag, "p1"), { transform: "translateY(-27px)" });
  assert.deepEqual(dragRowStyle(drag, "r3"), { opacity: 0.4, transform: "translateY(27px)" });
  assert.equal(dragRowStyle(drag, "zz"), undefined);
  assert.deepEqual(dragRowStyle({ ...drag, blockShift: true }, "p2"), { transform: "translateY(40px)" }, "a pinned family moves its height");
  assert.equal(dragRowStyle(null, "r2"), undefined);
});

test("LY labels: split, new window, unpin, group moves and the ungrouped target", () => {
  const base = { keys: ["a"], paneIntent: null, newWindowIntent: false, groupIntent: null, unpinIntent: false, srcGroupLabel: "Research" };
  assert.equal(dragLabel(base), null);
  assert.deepEqual(dragLabel({ ...base, paneIntent: { side: 1, mode: "open" } }), { message: "Open in split view" });
  assert.deepEqual(dragLabel({ ...base, newWindowIntent: true }), { message: "Open in new window" });
  assert.deepEqual(dragLabel({ ...base, unpinIntent: true }), { message: "Release to unpin" });
  assert.deepEqual(dragLabel({ ...base, groupIntent: { groupId: "g2", label: "Ideas" } }), { message: "Move to {label}", values: { label: "Ideas" } });
  assert.deepEqual(dragLabel({ ...base, groupIntent: { groupId: null, label: "Ungrouped" } }), { message: "Ungroup" });
  assert.deepEqual(dragLabel({ ...base, keys: ["a", "b"], groupIntent: { groupId: null } }), { message: "Ungroup" });
  assert.deepEqual(dragLabel({ ...base, srcGroupLabel: "", groupIntent: { groupId: null } }), { message: "Ungroup" });
});

test("H drop outcomes: window, pane, group, unpin, pin and reorder", () => {
  const s = snapshot({ srcPinnedIdx: 1 });
  const base = { key: "r2", keys: ["r2"], canTearOff: true, canSplit: true, paneIntent: null, groupIntent: null, unpinIntent: false, slotIdx: null, srcPinned: false, tearOffIntent: false, newWindowIntent: false };
  assert.deepEqual(dropOutcome({ ...base, tearOffIntent: true }, s, { screen: { x: 500.4, y: 300 } }), { type: "window", entryPoint: "drag_tear_off", position: { x: 380, y: 286 } });
  assert.equal(dropOutcome({ ...base, tearOffIntent: true, canTearOff: false }, s), null);
  assert.deepEqual(dropOutcome({ ...base, paneIntent: { side: 1, mode: "open" } }, s), { type: "pane", pane: { side: 1, mode: "open" }, draft: false });
  assert.deepEqual(dropOutcome({ ...base, groupIntent: { groupId: "g1" } }, s), { type: "group", groupId: "g1", keys: ["r2"] });
  assert.deepEqual(dropOutcome({ ...base, unpinIntent: true }, s), { type: "unpin", key: "r2" });
  assert.deepEqual(dropOutcome({ ...base, slotIdx: 1 }, s), { type: "pin", key: "r2", at: 1, before: "p2" });
  assert.deepEqual(dropOutcome({ ...base, key: "p2", srcPinned: true, slotIdx: 3 }, s), { type: "reorder", key: "p2", from: 1, to: 2, before: null });
  assert.equal(dropOutcome(base, s), null);
});

test("tear-off position and the persisted Pinned order after a drop", () => {
  assert.deepEqual(tearOffPosition({ x: 120, y: 14 }), { x: 0, y: 0 });
  assert.deepEqual(pinnedOrderAfterDrop(["a", "b", "c"], "x", "b"), ["a", "x", "b", "c"]);
  assert.deepEqual(pinnedOrderAfterDrop(["a", "b", "c"], "x", null), ["a", "b", "c", "x"]);
  assert.deepEqual(pinnedOrderAfterDrop(["a", "b", "c"], "a", null), ["b", "c", "a"]);
  assert.deepEqual(pinnedOrderAfterDrop(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
});

test("split drop targets are grid cells: the intent changes with the cell key (split-view-model.mjs sessionDropCell)", () => {
  const base = { ...IDLE_INTENT, pane: { key: "1:0", pos: { col: 1, row: 0 } } };
  assert.equal(intentChanged(base, { ...base, pane: { key: "1:0", pos: { col: 1, row: 0 } } }), false);
  assert.equal(intentChanged(base, { ...base, pane: { key: "1:1", pos: { col: 1, row: 1 } } }), true);
  assert.equal(intentChanged(base, { ...base, pane: null }), true);
});
