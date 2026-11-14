// ZCode's dynamic workflows: what the app knows before it connects (cores/zcode.mjs implies) must be what the bridge
// reports in initialize (zcode-bridge BASE_CAPABILITIES), since a reported capability overrides the implied one
// (core-registry coreCapabilities). Otherwise /workflow and Settings' Dynamic workflows flip between "agent" and
// "Not available with ZCode yet" on connect, while GLM can run CreateWorkflow. ZCode's engine runs a workflow's agents
// without approvals, so outside Bypass its bridge asks once per run; no Bypass-only gate is left (workflowsNeedBypass).
import test from "node:test";
import assert from "node:assert/strict";
import { coreById, coreCapabilities, coreSupports } from "../electron/core-registry.mjs";
import { commandUnavailable, workflowEngine, workflowsSupported } from "../src/session-command-model.mjs";
import { BASE_CAPABILITIES } from "../../harness/packages/zcode-bridge/src/server.js";
import session from "../electron/i18n/zh-CN/session.mjs";
import settings from "../electron/i18n/zh-CN/settings.mjs";

const connected = { engine: "zcode", capabilities: BASE_CAPABILITIES };

test("ZCode's descriptor implies exactly what its bridge reports for every capability both name", () => {
  const implied = coreById("zcode").implies;
  for (const [key, value] of Object.entries(implied)) {
    if (key in BASE_CAPABILITIES) assert.deepEqual(value, BASE_CAPABILITIES[key], `zcode.${key}`);
  }
  for (const key of ["modelWorkflows", "structuredOutput"]) assert.ok(key in implied && key in BASE_CAPABILITIES, key);
  assert.equal(coreCapabilities(connected).modelWorkflows, true);
  assert.equal(coreSupports(connected, "workflowsNeedBypass"), false, "any permission mode: one approval per run");
  assert.equal(coreSupports("zcode", "workflowsNeedBypass"), false);
});

test("/workflow and Settings' Dynamic workflows are the same before and after ZCode connects: ZCode's own engine", () => {
  for (const core of ["zcode", connected]) {
    assert.equal(workflowsSupported(core), true, "Settings shows the row, not 'Not available with ZCode yet'");
    assert.equal(workflowEngine(core), "agent", "GLM starts the run with its workflow tool");
  }
});

test("/workflow on ZCode runs in any permission mode (one approval per run in the bridge)", () => {
  const workflow = { id: "workflow", session: true };
  const context = { current: "sess_1", connected: true, dynamicWorkflows: true, workflowsNeedBypass: true, coreName: "ZCode" };
  assert.equal(commandUnavailable(workflow, { ...context, permissionMode: "auto" }), "");
  assert.equal(commandUnavailable(workflow, { ...context, permissionMode: "bypass" }), "");
  // The setting still comes first.
  assert.equal(commandUnavailable(workflow, { ...context, dynamicWorkflows: false, permissionMode: "auto" }), "Enable Dynamic workflows in Code settings first");
  assert.equal(coreSupports("opencode", "workflowsNeedBypass"), false);
});
