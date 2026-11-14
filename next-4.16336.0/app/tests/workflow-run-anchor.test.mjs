// A model-started workflow's card sits right after the Workflow tool row that started it, also on cores that don't
// name their call (only Codex sends _meta.itemId): the row whose launch text names the run's id.
import test from "node:test";
import assert from "node:assert/strict";
import { workflowRunAnchor, withWorkflowToolRuns } from "../src/agent-tool-titles.mjs";

const launch = (id) => ({ content: [{ type: "text", text: `Workflow launched in background. Task ID: t1\nRun ID: ${id}\nTo resume…` }] });

test("workflowRunAnchor finds the Workflow call that launched the run", () => {
  const items = [
    { id: "u1", type: "userMessage" },
    { id: "call-a", type: "mcpToolCall", server: "code_desktop", tool: "Workflow", arguments: {}, result: launch("wf_aaaaaaaaaaaa") },
    { id: "call-b", type: "dynamicToolCall", tool: "code_desktop_Workflow", arguments: {}, contentItems: [{ type: "inputText", text: "Run ID: wf_bbbbbbbbbbbb" }] },
    { id: "a1", type: "agentMessage" },
  ];
  assert.equal(workflowRunAnchor(items, { id: "wf_aaaaaaaaaaaa", origin: "tool" }), "call-a");
  assert.equal(workflowRunAnchor(items, { id: "wf_bbbbbbbbbbbb", origin: "tool" }), "call-b");
  // A known anchor wins; a user-started run or an unknown one keeps its own (the end of the transcript).
  assert.equal(workflowRunAnchor(items, { id: "wf_aaaaaaaaaaaa", origin: "tool", after: "a1" }), "a1");
  assert.equal(workflowRunAnchor(items, { id: "wf_aaaaaaaaaaaa", origin: "user" }), undefined);
  assert.equal(workflowRunAnchor(items, { id: "wf_cccccccccccc", origin: "tool", after: "gone" }), "gone");
  // A shell command that merely printed the text is no anchor.
  assert.equal(workflowRunAnchor([{ id: "cmd", type: "commandExecution", aggregatedOutput: "Run ID: wf_dddddddddddd" }], { id: "wf_dddddddddddd", origin: "tool" }), undefined);
});

test("a run the Workflow tool launched takes its call's row; other runs follow their anchor", () => {
  const items = [
    { id: "u1", type: "userMessage", turnId: "t1" },
    { id: "call-a", type: "mcpToolCall", server: "code_desktop", tool: "Workflow", arguments: {}, result: launch("wf_aaaaaaaaaaaa"), turnId: "t1" },
    { id: "a1", type: "agentMessage", turnId: "t1" },
  ];
  const tool = { id: "wf_aaaaaaaaaaaa", origin: "tool" }, user = { id: "wf_uuuuuuuuuuuu", origin: "user", after: "a1" };
  const placed = withWorkflowToolRuns(items, [tool, user]);
  // 2.2553.1: the Workflow tool row is the run's card, so there is one "Ran workflow" line, in the call's turn.
  assert.deepEqual(placed.items.map((item) => item.id), ["u1", "call-a", "a1"]);
  assert.deepEqual(placed.items[1], { id: "call-a", turnId: "t1", workflowRun: tool });
  assert.deepEqual(placed.rows, [{ id: "local-workflow:wf_uuuuuuuuuuuu", after: "a1", workflowRun: user }]);
  // Codex names its call (run.after): the same; an anchor that is not a Workflow call keeps the row after it.
  assert.equal(withWorkflowToolRuns(items, [{ id: "wf_x", origin: "tool", after: "call-a" }]).items[1].workflowRun.id, "wf_x");
  const other = withWorkflowToolRuns(items, [{ id: "wf_y", origin: "tool", after: "a1" }]);
  assert.equal(other.items, items);
  assert.deepEqual(other.rows.map((row) => row.after), ["a1"]);
  // Two runs naming one call: the first takes it, the second follows it.
  const two = withWorkflowToolRuns(items, [{ id: "wf_1", origin: "tool", after: "call-a" }, { id: "wf_2", origin: "tool", after: "call-a" }]);
  assert.equal(two.items[1].workflowRun.id, "wf_1");
  assert.deepEqual(two.rows.map((row) => row.id), ["local-workflow:wf_2"]);
  assert.deepEqual(withWorkflowToolRuns(items, []), { items, rows: [] });
});
