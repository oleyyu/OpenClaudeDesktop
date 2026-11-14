import test from "node:test";
import assert from "node:assert/strict";
import { defaultProfile, isToolOff, newProfileId, normalizeProfiles, normalizeSelection, offCount, sameSelection, toggleInSelection, toolProfilesPatch } from "../electron/prefs/tool-profiles.mjs";

test("a selection is clean, unique and null when nothing is off", () => {
  assert.deepEqual(normalizeSelection({ disabled: ["bash", " bash", "run_code", 1], disabledServers: ["git", "git"] }), { disabled: ["bash"], disabledServers: ["git"] });
  assert.equal(normalizeSelection({ disabled: [] }), null);
  assert.equal(normalizeSelection("bash"), null);
});

test("toggling switches one tool or server and collapses to null when all are back on", () => {
  let selection = toggleInSelection(null, "write");
  assert.deepEqual(selection, { disabled: ["write"], disabledServers: [] });
  selection = toggleInSelection(selection, "git", { server: true });
  assert.equal(isToolOff("mcp__git__log", selection), true);
  assert.equal(isToolOff("mcp__github__log", selection), false);
  assert.equal(offCount(selection), 2);
  selection = toggleInSelection(toggleInSelection(selection, "write"), "git", { server: true });
  assert.equal(selection, null);
});

test("selections compare by content, not order", () => {
  assert.equal(sameSelection({ disabled: ["a", "b"] }, { disabled: ["b", "a"], disabledServers: [] }), true);
  assert.equal(sameSelection(null, { disabled: [] }), true);
  assert.equal(sameSelection({ disabled: ["a"] }, null), false);
});

test("profiles keep valid entries with unique ids; unknown permissions are dropped", () => {
  const profiles = normalizeProfiles([
    { id: "a", name: " Review ", tools: { disabled: ["write"] }, model: "deepseek-flash", permission: "plan" },
    { id: "a", name: "Duplicate" },
    { id: "b", name: "" },
    { id: "c", name: "Web", permission: "root" },
    "junk",
  ]);
  assert.deepEqual(profiles, [
    { id: "a", name: "Review", tools: { disabled: ["write"], disabledServers: [] }, model: "deepseek-flash", permission: "plan" },
    { id: "c", name: "Web", tools: null },
  ]);
});

test("the settings patch normalizes profiles and clears a default whose profile is gone", () => {
  const config = { toolProfiles: [{ id: "a", name: "A" }], defaultToolProfile: "a" };
  assert.deepEqual(toolProfilesPatch({ toolProfiles: [] }, config), { toolProfiles: [], defaultToolProfile: null });
  assert.deepEqual(toolProfilesPatch({ defaultToolProfile: "missing" }, config), { defaultToolProfile: null });
  assert.deepEqual(toolProfilesPatch({ defaultToolProfile: "a" }, config), { defaultToolProfile: "a" });
  assert.deepEqual(toolProfilesPatch({ theme: "dark" }, config), {}, "unrelated saves leave profiles alone");
  assert.equal(defaultProfile(config).id, "a");
  assert.equal(defaultProfile({ ...config, defaultToolProfile: null }), null);
});

test("new profile ids do not collide", () => {
  const id = newProfileId([], 1000);
  assert.notEqual(newProfileId([{ id }], 1000), id);
});

test('requiredToolOff: a tool the agent stops with another reports that tool while it is off', async () => {
  const { requiredToolOff } = await import('../electron/prefs/tool-profiles.mjs');
  const write = { name: 'write', requires: ['edit'] };
  assert.equal(requiredToolOff(write, null), null);
  assert.equal(requiredToolOff(write, { disabled: [], disabledServers: [] }), null);
  assert.equal(requiredToolOff(write, { disabled: ['edit'], disabledServers: [] }), 'edit');
  assert.equal(requiredToolOff({ name: 'read' }, { disabled: ['edit'], disabledServers: [] }), null, 'no requires');
  assert.equal(requiredToolOff({ name: 'edit', requires: ['edit'] }, { disabled: ['edit'], disabledServers: [] }), null, 'never itself');
});
