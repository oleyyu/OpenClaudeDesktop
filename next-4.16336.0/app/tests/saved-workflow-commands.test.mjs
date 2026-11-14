// Saved workflows as '/' commands (Claude Code getWorkflowCommands): /<name> asks the model to run the workflow with the
// Workflow tool by name; custom commands of the same name win in the '/' menu.
import test from "node:test";
import assert from "node:assert/strict";
import { workflowCommandBody, workflowCommandRows } from "../src/saved-workflow-commands.mjs";
import { slashCustomCommands } from "../src/session-command-model.mjs";
import { expandCommand } from "../src/custom-commands-model.mjs";

test("saved workflows become /<name> rows with Claude's run prompt", () => {
  const rows = workflowCommandRows([
    { name: "release-check", description: "Check a release", whenToUse: "before tagging", phases: ["Scan", "Report"], source: "project" },
    { name: "Has Space", description: "skipped: not a command name" },
    { name: "release-check", description: "duplicate" },
  ]);
  assert.deepEqual(rows.map((row) => [row.name, row.scope, row.argumentHint]), [["release-check", "project", "[args]"]]);
  assert.equal(rows[0].body, workflowCommandBody({ name: "release-check", description: "Check a release", whenToUse: "before tagging", phases: ["Scan", "Report"] }));
  assert.match(rows[0].body, /^Run the "release-check" workflow\.\nCheck a release\nWhen to use: before tagging\nPhases: Scan → Report\nInvoke: Workflow\(\{ name: "release-check", args \}\)/);
  assert.match(expandCommand(rows[0].body, "v1.2"), /\n\nv1\.2$/);
  const merged = slashCustomCommands([{ name: "release-check", description: "my own", body: "x", scope: "global" }, ...rows]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].description, "my own");
});
