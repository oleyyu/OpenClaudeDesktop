// User bug #15: the floating side chat's Open in main window. main.cjs closes the side chat window and emits
// popout-docked before its popouts broadcast, so the main window opened the card while it still listed the window as
// popped out; the "popped out → bring that window forward" effect then opened a new, empty side chat window and put the
// card away, and docking that empty window wiped the conversation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { popoutsAfterDocked } from "../src/popout-docked.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("popoutsAfterDocked: the docked window leaves the list at once; other windows and events stay", () => {
  const list = [{ sessionId: "s1", pane: "side-chat" }, { sessionId: "s1", pane: "tasks" }, { sessionId: "s2", pane: "side-chat" }];
  const docked = { kind: "popout-docked", sessionId: "s1", pane: "side-chat", entryPoint: "dock" };
  const next = popoutsAfterDocked(list, docked);
  assert.deepEqual(next, [{ sessionId: "s1", pane: "tasks" }, { sessionId: "s2", pane: "side-chat" }]);
  // What main.jsx derives from it in the same render as the card opening: no longer popped out.
  assert.equal(new Set(next.map((entry) => `${entry.sessionId}:${entry.pane}`)).has("s1:side-chat"), false);
  assert.equal(popoutsAfterDocked(list, { kind: "popouts" }), list);
  assert.equal(popoutsAfterDocked(list, { ...docked, sessionId: "s3" }), list, "nothing to drop: same list");
  assert.deepEqual(popoutsAfterDocked(undefined, docked), []);
});

test("main.jsx drops the docked side chat from popouts in the same event that opens the card", () => {
  const source = read("src/main.jsx");
  const at = source.indexOf('e.kind === "popout-docked" && e.pane === "side-chat"');
  assert.ok(at > 0);
  const handler = source.slice(source.lastIndexOf("if (e.kind === \"popouts\")", at), at);
  assert.match(handler, /setPopouts\(\s*\(?list\)?\s*=>\s*popoutsAfterDocked\(list,\s*e\)\s*\)/);
});

test("main.cjs broadcasts the popouts list before it emits popout-docked", () => {
  const source = read("electron/main.cjs");
  const closed = source.slice(source.indexOf('window.on("closed", () => {\n    if (popouts.get(key) === entry)'));
  const block = closed.slice(0, closed.indexOf("\n  });"));
  const broadcast = block.indexOf("broadcastPopouts();"), docked = block.indexOf('kind: "popout-docked"');
  assert.ok(broadcast > 0 && docked > 0, block);
  assert.ok(broadcast < docked, "popouts first, then popout-docked");
});
