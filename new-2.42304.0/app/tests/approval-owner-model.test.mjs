import test from "node:test";
import assert from "node:assert/strict";
import { linkThreadOwner, parentThreadOf, unknownCardOwners } from "../src/approval-owner-model.mjs";
import { emptyState, reduce, ownerThreadId, hasPendingApproval } from "../src/state.js";

const spawned = (id, parent) => ({ id, parentThreadId: parent, source: { subAgent: { thread_spawn: { parent_thread_id: parent, depth: 1 } } }, status: { type: "active", activeFlags: [] } });
const card = (threadId) => ({ id: `req-${threadId}`, method: "item/commandExecution/requestApproval", params: { threadId, turnId: "t", itemId: "c" } });

test("a card whose thread this window never saw spawn names an unknown owner; a known session's card does not", () => {
  const known = new Set(["session"]);
  let state = { ...emptyState, approvals: [card("grandchild"), card("session"), card("grandchild")] };
  assert.deepEqual(unknownCardOwners(state, known), ["grandchild"]);
  // Once the chain is linked, the card belongs to the session.
  state = reduce(state, { event: { method: "thread/started", params: { thread: spawned("child", "session") } } });
  state = reduce(state, { event: { method: "thread/started", params: { thread: spawned("grandchild", "child") } } });
  assert.deepEqual(unknownCardOwners(state, known), []);
  assert.equal(ownerThreadId(state, "grandchild"), "session");
  assert.equal(hasPendingApproval(state, "session"), true);
});

test("linkThreadOwner reads up the parent chain to a known session, linking each sub-agent", async () => {
  const records = { grandchild: spawned("grandchild", "child"), child: { ...spawned("child", null), parentThreadId: null, source: { subAgent: { thread_spawn: { parent_thread_id: "session" } } } } };
  const reads = [], linked = [];
  const settled = await linkThreadOwner("grandchild", { read: async (id) => { reads.push(id); return records[id]; }, onThread: (thread) => linked.push(thread.id), isKnown: (id) => id === "session" });
  assert.equal(settled, true);
  assert.deepEqual(reads, ["grandchild", "child"], "the session itself is never read");
  assert.deepEqual(linked, ["grandchild", "child"]);
  assert.equal(parentThreadOf(records.child), "session", "the thread_spawn source names the parent too");
  let state = emptyState;
  for (const id of linked) state = reduce(state, { event: { method: "thread/started", params: { thread: records[id] } } });
  assert.equal(ownerThreadId(state, "grandchild"), "session");
});

test("linkThreadOwner stops at a thread that is no sub-agent, and reports a failed read so it is tried again", async () => {
  const linked = [];
  assert.equal(await linkThreadOwner("fork", { read: async () => ({ id: "fork", parentThreadId: null, source: "vscode" }), onThread: (thread) => linked.push(thread.id), isKnown: () => false }), true);
  assert.deepEqual(linked, []);
  assert.equal(await linkThreadOwner("child", { read: async () => { throw new Error("thread/read timed out."); }, onThread: () => assert.fail("linked"), isKnown: () => false }), false);
  let reads = 0;
  const loop = { id: "a", parentThreadId: "a", source: { subAgent: {} } };
  assert.equal(await linkThreadOwner("a", { read: async () => { reads += 1; return loop; }, onThread: () => {}, isKnown: () => false, maxDepth: 3 }), true);
  assert.equal(reads, 3, "a looping record is read at most maxDepth times");
});
