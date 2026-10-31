import test from "node:test";
import assert from "node:assert/strict";
import { activeComputerUse, computerUseAction, computerUseLabel, computerUseScreenshot, keyLabel, screenshotMarker } from "../src/computer-use-model.mjs";
import { fileGroupPresentation } from "../src/file-tool-model.mjs";
import { approvalCardModel } from "../src/approval-card-model.mjs";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("the Anthropic computer tool, OpenAI computer use, MCP servers and computerUse items normalize to one action", () => {
  assert.deepEqual(computerUseAction({ type: "dynamicToolCall", tool: "computer", arguments: { action: "left_click", coordinate: [512, 300] } }), { kind: "click", x: 512, y: 300 });
  assert.deepEqual(computerUseAction({ type: "dynamicToolCall", tool: "computer_use", arguments: { action: { type: "click", x: 10, y: 20, button: "left" } } }), { kind: "click", x: 10, y: 20 });
  assert.deepEqual(computerUseAction({ type: "mcpToolCall", server: "computer-use", tool: "type", arguments: { text: "hello" } }), { kind: "type", text: "hello" });
  assert.deepEqual(computerUseAction({ type: "dynamicToolCall", tool: "computer", arguments: { action: { type: "keypress", keys: ["CTRL", "C"] } } }), { kind: "key", keys: ["CTRL", "C"] });
  assert.deepEqual(computerUseAction({ type: "dynamicToolCall", tool: "computer", arguments: { action: "left_click_drag", start_coordinate: [1, 2], coordinate: [30, 40] } }), { kind: "drag", x: 1, y: 2, x2: 30, y2: 40 });
  assert.deepEqual(computerUseAction({ type: "dynamicToolCall", tool: "computer", arguments: { action: { type: "scroll", x: 5, y: 6, scroll_y: 300 } } }), { kind: "scroll", x: 5, y: 6, direction: "down", amount: 300 });
  assert.deepEqual(computerUseAction({ type: "computerUse", id: "c1", status: "completed", action: { kind: "screenshot" }, app: "Finder" }), { kind: "screenshot", app: "Finder" });
  assert.equal(computerUseAction({ type: "mcpToolCall", server: "github", tool: "type", arguments: {} }), null, "other servers' tools are not computer use");
  assert.equal(computerUseAction({ type: "commandExecution", command: "ls" }), null);
});

// The 2.42304.0 verbs (computer-use-model.mjs, ported with OpenClaude Desktop's own computer use): a click or a drag
// names no coordinates any more; typed text and keys keep theirs.
test("labels name the action and its target for each state", () => {
  assert.deepEqual(computerUseLabel({ kind: "click", x: 5, y: 6 }, "busy"), { label: "Clicking", meta: null });
  assert.deepEqual(computerUseLabel({ kind: "type", text: "x".repeat(60) }, "done"), { label: "Typed", meta: `“${"x".repeat(47)}…”` });
  assert.deepEqual(computerUseLabel({ kind: "key", keys: ["cmd+shift+4"] }, "failed"), { label: "Failed to press key", meta: "⌘⇧4" });
  assert.equal(keyLabel(["CTRL", "C"]), "⌃C");
  assert.deepEqual(computerUseLabel({ kind: "drag", x: 1, y: 2, x2: 3, y2: 4 }), { label: "Dragged", meta: null });
});

test("the screenshot comes from the item or the tool's image output; the marker is relative and only inside it", () => {
  const mcp = { type: "mcpToolCall", server: "computer-use", tool: "screenshot", arguments: {}, result: { content: [{ type: "image", mimeType: "image/png", data: PNG }] } };
  assert.equal(computerUseScreenshot(mcp), `data:image/png;base64,${PNG}`);
  assert.equal(computerUseScreenshot({ type: "computerUse", screenshot: `data:image/png;base64,${PNG}` }), `data:image/png;base64,${PNG}`);
  assert.deepEqual(screenshotMarker({ kind: "click", x: 50, y: 25 }, 100, 100), { kind: "click", x: 0.5, y: 0.25 });
  assert.deepEqual(screenshotMarker({ kind: "drag", x: 0, y: 0, x2: 100, y2: 50 }, 100, 100), { kind: "drag", x: 0, y: 0, x2: 1, y2: 0.5 });
  assert.equal(screenshotMarker({ kind: "click", x: 500, y: 25 }, 100, 100), null);
  assert.equal(screenshotMarker({ kind: "screenshot" }, 100, 100), null);
});

test("the banner follows the newest computer-use step: running → it and the last screenshot, settled → none", () => {
  const shot = { id: "a", type: "computerUse", status: "completed", action: { kind: "screenshot" }, screenshot: `data:image/png;base64,${PNG}` };
  const click = { id: "b", type: "computerUse", status: "inProgress", action: { kind: "click", x: 1, y: 2 } };
  const running = (item) => item.status === "inProgress";
  const active = activeComputerUse([shot, { id: "m", type: "agentMessage", text: "hi" }, click], running);
  assert.equal(active.item.id, "b");
  assert.equal(active.screenshot, shot.screenshot, "the previous step's screenshot stands in");
  assert.equal(activeComputerUse([shot, { ...click, status: "completed" }], running), null);
  assert.equal(activeComputerUse([{ id: "c", type: "commandExecution", status: "inProgress" }], running), null);
});

test("tool groups say 'used the computer (N steps)'; approvals ask to control the computer", () => {
  const steps = [1, 2, 3].map((n) => ({ id: `s${n}`, type: "computerUse", status: "completed", action: { kind: "click", x: n, y: n } }));
  const summary = fileGroupPresentation(steps);
  assert.deepEqual(summary.segments.map((segment) => [segment.verb, segment.meta]), [["Used", "the computer (3 steps)"]]);
  const card = approvalCardModel({ method: "item/commandExecution/requestApproval", params: { itemId: "s1", threadId: "t" } }, { ...steps[0], status: "inProgress" });
  assert.match(JSON.stringify(card), /control your computer/);
});
