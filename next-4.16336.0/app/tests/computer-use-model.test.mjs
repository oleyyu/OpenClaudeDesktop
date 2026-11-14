import test from "node:test";
import assert from "node:assert/strict";
import { computerUseAction, computerUseIcon, computerUseLabel, computerUseScreenshot, computerUseToolName, keyLabel } from "../src/computer-use-model.mjs";
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

test("labels are the official Code-tab verbs (running / done / failed), with no coordinates", () => {
  assert.deepEqual(computerUseLabel({ kind: "click", x: 5, y: 6 }, "busy"), { label: "Clicking", meta: null });
  assert.deepEqual(computerUseLabel({ kind: "double_click", x: 5, y: 6 }, "done"), { label: "Clicked", meta: null });
  assert.deepEqual(computerUseLabel({ kind: "type", text: "x".repeat(60) }, "done"), { label: "Typed", meta: `“${"x".repeat(47)}…”` });
  assert.deepEqual(computerUseLabel({ kind: "key", keys: ["cmd+shift+4"] }, "failed"), { label: "Failed to press key", meta: "⌘⇧4" });
  assert.equal(keyLabel(["CTRL", "C"]), "⌃C");
  assert.deepEqual(computerUseLabel({ kind: "drag", x: 1, y: 2, x2: 3, y2: 4 }), { label: "Dragged", meta: null });
  assert.deepEqual(computerUseLabel({ kind: "screenshot" }, "busy"), { label: "Capturing screen", meta: null });
  assert.deepEqual(computerUseLabel({ kind: "move", x: 1, y: 1 }, "done"), { label: "Hovered", meta: null });
  assert.deepEqual(computerUseLabel({ kind: "open_app", app: "Notes" }, "busy"), { label: "Opening app", meta: "Notes" });
  assert.deepEqual(computerUseLabel({ kind: "other" }, "failed"), { label: "Couldn’t use your computer", meta: null });
});

test("app_* tools map to the same actions on one app, with the official verbs and tool names", () => {
  const app = (tool, args) => computerUseAction({ type: "mcpToolCall", server: "computer-use", tool, arguments: args });
  assert.deepEqual(app("app_click", { app: "com.apple.TextEdit", coordinate: [10, 20] }), { kind: "click", x: 10, y: 20, scope: "app", app: "com.apple.TextEdit" });
  assert.deepEqual(app("app_key", { combo: "cmd+s" }).keys, ["cmd+s"]);
  assert.equal(app("app_scroll", { dy: -3 }).direction, "up");
  assert.deepEqual(app("app_drag", { coordinate: [1, 2], to_coordinate: [3, 4] }), { kind: "drag", x: 1, y: 2, x2: 3, y2: 4, scope: "app" });
  const verbs = { app_screenshot: "Capturing window", app_ax_find: "Finding in window", app_list_windows: "Listing windows", app_menu: "Using menu bar",
    app_type: "Typing", app_click: "Clicking", app_key: "Pressing key", app_scroll: "Scrolling", app_drag: "Dragging" };
  for (const [tool, verb] of Object.entries(verbs)) {
    const action = app(tool, {});
    assert.equal(computerUseLabel(action, "busy").label, verb, tool);
    assert.equal(computerUseToolName(action), tool, tool);
  }
  // The display-scope names the original tool group reads (transcript-sdk-tools.mjs).
  assert.equal(computerUseToolName({ kind: "click" }), "left_click");
  assert.equal(computerUseToolName({ kind: "drag" }), "left_click_drag");
  assert.equal(computerUseToolName({ kind: "move" }), "mouse_move");
  assert.equal(computerUseAction({ type: "dynamicToolCall", tool: "mcp__computer-use__app_click", arguments: {} }).scope, "app");
});

test("the screenshot comes from the item or the tool's image output", () => {
  const mcp = { type: "mcpToolCall", server: "computer-use", tool: "screenshot", arguments: {}, result: { content: [{ type: "image", mimeType: "image/png", data: PNG }] } };
  assert.equal(computerUseScreenshot(mcp), `data:image/png;base64,${PNG}`);
  assert.equal(computerUseScreenshot({ type: "computerUse", screenshot: `data:image/png;base64,${PNG}` }), `data:image/png;base64,${PNG}`);
});

test("tool groups say 'used the computer (N steps)'; approvals ask to control the computer", () => {
  const steps = [1, 2, 3].map((n) => ({ id: `s${n}`, type: "computerUse", status: "completed", action: { kind: "click", x: n, y: n } }));
  const summary = fileGroupPresentation(steps);
  assert.deepEqual(summary.segments.map((segment) => [segment.verb, segment.meta]), [["Used", "the computer (3 steps)"]]);
  const card = approvalCardModel({ method: "item/commandExecution/requestApproval", params: { itemId: "s1", threadId: "t" } }, { ...steps[0], status: "inProgress" });
  assert.match(JSON.stringify(card), /control your computer/);
});

test("each action's row icon follows the original computer-use icons (shared-130 keys, cc1aae219 RW names)", () => {
  const icon = (action) => computerUseIcon(action);
  assert.deepEqual(icon({ kind: "screenshot" }), { name: "Camera", dir: undefined });
  assert.deepEqual(icon({ kind: "window_screenshot", scope: "app" }), { name: "Camera", dir: undefined });
  for (const kind of ["click", "double_click", "triple_click", "right_click", "middle_click", "mouse_down", "mouse_up"]) assert.equal(icon({ kind }).name, "Cursor", kind);
  for (const kind of ["type", "key", "hold_key", "focus"]) assert.equal(icon({ kind }).name, "Keyboard", kind);
  assert.deepEqual(icon({ kind: "scroll", direction: "up" }), { name: "ArrowUp", dir: undefined });
  assert.deepEqual(icon({ kind: "scroll", direction: "left" }), { name: "ArrowLeft", dir: "ltr" });
  assert.deepEqual(icon({ kind: "scroll", direction: "right" }), { name: "ArrowRight", dir: "ltr" });
  assert.deepEqual(icon({ kind: "scroll" }), { name: "ArrowDown", dir: undefined });
  assert.equal(icon({ kind: "drag" }).name, "Reorder");
  assert.equal(icon({ kind: "zoom" }).name, "SearchCircle");
  assert.equal(icon({ kind: "wait" }).name, "Timer");
  assert.equal(icon({ kind: "menu" }).name, "Menu");
  assert.equal(icon({ kind: "find" }).name, "Search");
  assert.equal(icon({ kind: "list_windows" }).name, "Eye");
  for (const kind of ["move", "cursor", "open_app", "request_access", "other"]) assert.equal(icon({ kind }).name, "Computer", kind);
});
