import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JUMP_COMMANDS, NOTIFICATIONS_STOP, compareOrderKeys, labelLandingGroup, nextRegionStop, orderStops, regionDirection, regionJumpStop, regionKeyAction, tileRegion } from "../src/focus-region-model.mjs";
import { paletteActions } from "../src/sidebar-palette-model.mjs";

const f6 = (extra = {}) => ({ key: "F6", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false, isComposing: false, ...extra });

test("bindings: F6 forward, Shift+F6 backward; Ctrl+F6 only off macOS; Option and ⌘ chords are not region keys", () => {
  assert.equal(regionDirection(f6(), { mac: true }), "forward");
  assert.equal(regionDirection(f6({ shiftKey: true }), { mac: true }), "backward");
  assert.equal(regionDirection(f6({ ctrlKey: true }), { mac: true }), null);
  assert.equal(regionDirection(f6({ ctrlKey: true }), { mac: false }), "forward");
  assert.equal(regionDirection(f6({ ctrlKey: true, shiftKey: true }), { mac: false }), "backward");
  assert.equal(regionDirection(f6({ metaKey: true }), { mac: true }), null);
  assert.equal(regionDirection(f6({ altKey: true }), { mac: true }), null);
  assert.equal(regionDirection({ ...f6(), key: "F7" }), null);
});

test("orderStops (D): one stop per region instance, the last landing wins, region order then document order", () => {
  const stops = orderStops([
    { region: "tile", instance: "files", index: 0 },
    { region: "composer", instance: "", index: 1 },
    { region: "main", instance: "", index: 2 },
    { region: "navigation", instance: "", index: 3 },
    { region: "tile", instance: "changes", index: 4 },
    { region: "terminal", instance: "terminal", index: 5 },
    { region: "main", instance: "", index: 6 },
    { region: "bogus", instance: "", index: 7 },
  ]);
  assert.deepEqual(stops.map((stop) => stop.id), ["navigation:", "main:", "composer:", "terminal:terminal", "tile:files", "tile:changes"]);
  assert.equal(stops[1].index, 6);
});

test("orderStops (D): pane-placed stops follow the unplaced ones by pane, then tile reading order, then region", () => {
  const stops = orderStops([
    { region: "navigation", instance: "", index: 0 },
    { region: "header", instance: "pane0:", index: 1, order: [240, 0, 0] },
    { region: "composer", instance: "pane0:", index: 2, order: [240, 0, 0] },
    { region: "preview", instance: "pane0:preview", index: 3, order: [240, 0, 1] },
    { region: "terminal", instance: "pane0:terminal", index: 4, order: [240, 0, 2] },
    { region: "header", instance: "pane1:", index: 5, order: [700, 0, 0] },
    { region: "tile", instance: "pane0:files", index: 6, order: [240, 0, -1] },
    { region: "main", instance: "", index: 7 },
  ]);
  assert.deepEqual(stops.map((stop) => stop.id), ["navigation:", "main:", "tile:pane0:files", "header:pane0:", "composer:pane0:",
    "preview:pane0:preview", "terminal:pane0:terminal", "header:pane1:"]);
  assert.equal(compareOrderKeys([0, 4], [1, 0, 0, 0, 2]), -1);
  assert.equal(compareOrderKeys([1, 5], [1, 5, 0]), -1);
});

test("orderStops (D / kt): main gives way to a conversation's header; a fallback landing only stands in", () => {
  const landings = [
    { region: "navigation", instance: "", index: 0, fallback: true },
    { region: "main", instance: "", index: 1 },
    { region: "header", instance: "pane0:", index: 2, order: [0, 0, 0] },
    { region: "composer", instance: "pane0:", index: 3, order: [0, 0, 0] },
  ];
  assert.deepEqual(orderStops(landings, { conversation: true }).map((stop) => stop.id), ["navigation:", "header:pane0:", "composer:pane0:"]);
  assert.deepEqual(orderStops(landings).map((stop) => stop.id), ["navigation:", "main:", "header:pane0:", "composer:pane0:"]);
  assert.deepEqual(orderStops(landings.filter((landing) => landing.region !== "header"), { conversation: true }).map((stop) => stop.id),
    ["navigation:", "main:", "composer:pane0:"]);
  const aside = orderStops([{ region: "navigation", instance: "", index: 4 }, ...landings]);
  assert.equal(aside[0].index, 4);
  assert.equal(aside[0].fallback, undefined);
});

test("nextRegionStop (He): wraps both ways, starts at an end with no current stop, passes through question cards", () => {
  const ids = ["navigation:", "main:", "question:", "composer:"];
  const pass = new Set(["question:"]);
  assert.equal(nextRegionStop("main:", "forward", ids, pass), "composer:");
  assert.equal(nextRegionStop("composer:", "forward", ids, pass), "navigation:");
  assert.equal(nextRegionStop("navigation:", "backward", ids, pass), "composer:");
  assert.equal(nextRegionStop(null, "forward", ids, pass), "navigation:");
  assert.equal(nextRegionStop(null, "backward", ids, pass), "composer:");
  assert.equal(nextRegionStop("question:", "forward", ids, pass), "composer:");
  assert.equal(nextRegionStop("question:", "backward", ids, pass), "main:");
  assert.equal(nextRegionStop(null, "forward", [], pass), null);
});

test("regionKeyAction (bn): repeats are swallowed, owned focus yields, the toast region takes its own turn", () => {
  const stops = [{ id: "navigation:" }, { id: "main:" }, { id: "composer:" }];
  assert.deepEqual(regionKeyAction(f6(), { stops, current: "main:" }), { type: "focus", id: "composer:" });
  assert.deepEqual(regionKeyAction(f6({ shiftKey: true }), { stops, current: "main:" }), { type: "focus", id: "navigation:" });
  assert.deepEqual(regionKeyAction(f6({ repeat: true }), { stops }), { type: "swallow" });
  assert.equal(regionKeyAction(f6(), { stops, ownedFocus: true }), null);
  assert.equal(regionKeyAction(f6({ isComposing: true }), { stops }), null);
  assert.equal(regionKeyAction(f6({ altKey: true }), { stops }), null);
  assert.deepEqual(regionKeyAction(f6(), { stops, current: "composer:", notifications: true }), { type: "notifications" });
  assert.deepEqual(regionKeyAction(f6(), { stops, current: NOTIFICATIONS_STOP, notifications: true }), { type: "focus", id: "navigation:" });
  assert.equal(regionKeyAction(f6(), { stops: [] }), null);
});

test("jump_to_* (gn Q / O): palette rows for the available jumps; a jump stays in the focused pane", () => {
  assert.deepEqual(JUMP_COMMANDS.map((command) => command.id), ["jump_to_navigation", "jump_to_main_content", "jump_to_last_message", "jump_to_input", "jump_to_artifact", "jump_to_preview", "jump_to_terminal", "jump_to_pane"]); // w13-chatui-artifact-inline: + jump_to_artifact; w13-close-chat-messages: + jump_to_last_message (ca1d33d05 Q order)
  assert.deepEqual(JUMP_COMMANDS.find((command) => command.id === "jump_to_main_content").regions, ["header", "main"]);
  const jumped = [];
  const rows = paletteActions({ jumps: JUMP_COMMANDS.filter((command) => command.id !== "jump_to_terminal"), onJump: (regions) => jumped.push(regions) });
  assert.deepEqual(rows.map((row) => row.label), ["Jump to navigation", "Jump to main content", "Jump to last message", "Jump to input", "Jump to artifact", "Jump to preview", "Jump to pane"]);
  rows[3].run();
  assert.deepEqual(jumped, [["composer"]]);
  assert.deepEqual(paletteActions({ jumps: JUMP_COMMANDS }), [], "no host jump, no rows");
  const stops = [{ id: "composer:pane0:", region: "composer", pane: 0 }, { id: "composer:pane1:", region: "composer", pane: 1 }];
  assert.equal(regionJumpStop(stops, "composer", (stop) => stop.pane === 1).id, "composer:pane1:");
  assert.equal(regionJumpStop(stops, "terminal"), null);
});

test("side panes map to the reference regions", () => {
  assert.equal(tileRegion("preview"), "preview");
  assert.equal(tileRegion("terminal"), "terminal");
  assert.equal(tileRegion("files"), "tile");
  assert.equal(tileRegion("changes"), "tile");
});

test("wiring: the landings carry region markers and the primary side mounts the F6 listener", () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  assert.match(read("source-sidebar.jsx"), /data-focus-region=\{collapsed \? undefined : "navigation"\}/);
  assert.match(read("source-sidebar.jsx"), /data-testid="sidebar"[^>]*data-focus-region=\{collapsed \? "navigation" : undefined\}/);
  assert.match(read("source-titlebar.jsx"), /aria-controls="frame-peek-popover"[\s\S]*?data-focus-region="navigation" data-focus-region-fallback="" data-focus-region-ring="none"/);
  assert.match(read("source-titlebar.jsx"), /data-focus-region=\{loading \|\| !onRename \? undefined : "header"\} data-focus-region-ring="none" data-focus-region-order="pane"/);
  assert.match(read("source-split-view.jsx"), /className="split-host dframe-pane-host" data-focus-region="main"/);
  assert.match(read("source-transcript.jsx"), /data-focus-region="conversation"/);
  // ca1d33d05 ut: the composer lands with the overlay ring on the composer card, cleared by typing.
  assert.match(read("source-composer.jsx"), /data-cds="ChatComposerEditor" data-focus-region=\{disabled \? undefined : "composer"\} data-focus-region-order="pane" data-focus-region-clear-on-input="" data-focus-region-holds="\.epitaxy-prompt" data-focus-region-ring-on=\{'\[data-cds="ChatComposer"\] > \*, \.epitaxy-prompt'\}/);
  assert.match(read("source-tile-layout.jsx"), /data-focus-region=\{node\.tileId === "chat" \? undefined : tileRegion\(node\.tileId\)\}/);
  assert.match(read("main.jsx"), /useFocusRegionNavigation\(side === 0\)/);
  assert.match(read("use-focus-regions.js"), /addEventListener\("keydown", onKey, \{ capture: true \}\)/);
});

// w13-chatui-artifact-inline: 3.6556.2 ca1d33d05-DdOyUCec.js en / tn / V prepare.
test("labelLandingGroup (en): role=group + aria-label while the jump ring is on, removed by the undo; landStop reads data-focus-region-label", () => {
  const attrs = new Map();
  const element = { setAttribute: (name, value) => attrs.set(name, value), removeAttribute: (name) => attrs.delete(name) };
  const undo = labelLandingGroup(element, "Quarterly report");
  assert.deepEqual([...attrs], [["role", "group"], ["aria-label", "Quarterly report"]]);
  undo();
  assert.equal(attrs.size, 0);
  const hook = readFileSync(new URL("../src/use-focus-regions.js", import.meta.url), "utf8");
  // V: prepare runs before the focus (`let a=i?.()`), its undo first in the clear (`m=()=>{a?.(),…`).
  assert.match(hook, /clearOnInput = false, prepare \} = \{\}\) \{\n  clearRing\?\.\(\);\n  const undoPrepare = prepare\?\.\(\);/);
  assert.match(hook, /function clear\(\) \{\n    undoPrepare\?\.\(\);/);
  assert.match(hook, /const label = element\.getAttribute\("data-focus-region-label"\);[\s\S]*?prepare: label \? \(\) => labelLandingGroup\(element, label\) : undefined/);
  const official = readFileSync(new URL("../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/ca1d33d05-DdOyUCec.js", import.meta.url), "utf8");
  assert.ok(official.includes('function en(e,t){return e.setAttribute("role","group"),e.setAttribute("aria-label",t),()=>{e.removeAttribute("role"),e.removeAttribute("aria-label")}}'));
  assert.ok(official.includes('t?.trim()||r.formatMessage({defaultMessage:"Artifact",id:"07/fBlW5U3"})'));
  assert.ok(official.includes('V(e,{ring:"overlay",prepare:()=>en(e,a)})'));
  assert.match(readFileSync(new URL("../src/source-chat-artifact-panel.jsx", import.meta.url), "utf8"), /data-focus-region="artifact" data-focus-region-label=\{shown\?\.title\?\.trim\(\) \|\| t\('Artifact'\)\}/);
});
