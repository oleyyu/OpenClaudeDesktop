import test from "node:test";
import assert from "node:assert/strict";
import { sessionWork, shouldUnload } from "../src/session-unload-model.mjs";

const base = { previous: "a", next: "b", engine: "deepseek", resumed: new Set(["a", "b"]) };

test("unload only an idle, resumed DeepSeek session the user left, with no card or queue", () => {
  assert.equal(shouldUnload(base), true);
  // Going home releases it too.
  assert.equal(shouldUnload({ ...base, next: null }), true);
  for (const [why, input] of [
    ["codex core", { ...base, engine: "codex" }],
    ["no engine", { ...base, engine: undefined }],
    ["current session", { ...base, next: "a" }],
    ["nothing left", { ...base, previous: null }],
    ["turn running", { ...base, active: true }],
    ["pending approval", { ...base, pendingApproval: true }],
    ["queued messages", { ...base, queued: true }],
    ["never resumed (archived read)", { ...base, resumed: new Set(["b"]) }],
    ["no resumed set", { ...base, resumed: undefined }],
  ]) assert.equal(shouldUnload(input), false, why);
});

test("sessionWork counts a sub-agent's turn and card for the session that owns it", () => {
  const parents = { child: "a", grandchild: "child" };
  const ownerOf = (id) => { let at = id; while (parents[at]) at = parents[at]; return at; };
  assert.deepEqual(sessionWork({ id: "a", active: { a: null, b: "turn-b" }, approvals: [{ params: { threadId: "b" } }], ownerOf }), { active: false, pendingApproval: false });
  assert.deepEqual(sessionWork({ id: "a", active: { grandchild: "turn-g" }, ownerOf }), { active: true, pendingApproval: false });
  assert.deepEqual(sessionWork({ id: "a", approvals: [{ params: { threadId: "child" } }], ownerOf }), { active: false, pendingApproval: true });
  assert.equal(sessionWork({ id: "a", active: { a: "turn-1" } }).active, true);
  // A card without a thread id could be anyone's: keep the session loaded.
  assert.equal(sessionWork({ id: "a", approvals: [{ params: {} }] }).pendingApproval, true);
  assert.deepEqual(sessionWork({ id: "a" }), { active: false, pendingApproval: false });
});
