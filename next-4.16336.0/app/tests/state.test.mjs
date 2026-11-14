import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, reduce } from "../src/state.js";
const event = (method, params) => ({ event: { method, params } });
test("interleaved streams stay in their own sessions, completed item replaces partial text", () => {
  let s = reduce(
    emptyState,
    event("item/agentMessage/delta", {
      threadId: "a",
      itemId: "one",
      delta: "Hel",
    }),
  );
  s = reduce(
    s,
    event("item/agentMessage/delta", {
      threadId: "b",
      itemId: "two",
      delta: "Other",
    }),
  );
  s = reduce(
    s,
    event("item/agentMessage/delta", {
      threadId: "a",
      itemId: "one",
      delta: "lo",
    }),
  );
  s = reduce(
    s,
    event("item/completed", {
      threadId: "a",
      item: { id: "one", type: "agentMessage", text: "Hello!" },
    }),
  );
  assert.equal(s.items.a.length, 1);
  assert.equal(s.items.a[0].text, "Hello!");
  assert.equal(s.items.b[0].text, "Other");
});
test("turn state and connection status do not bypass identity-qualified approval lifecycle", () => {
  let s = reduce(emptyState, event("turn/started", { threadId: "a", turn: { id: "turn1" } }));
  const request = (id, threadId, revision) => ({
    kind: "request", id, method: "item/commandExecution/requestApproval", params: { threadId, turnId: "turn1" },
    bridgeApproval: { connectionId: "c", instanceId: `request-${id}` },
    approvalConnectionEpoch: 1, approvalRevision: revision,
  });
  const first = request(2, "a", 1), second = request(3, "b", 2);
  s = reduce(s, { event: first });
  s = reduce(s, { event: second });
  s = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "turn1", status: "completed" } }));
  assert.equal(s.active.a, null);
  assert.deepEqual(s.approvals, [first, second], "Only the bridge can identify which approval expired");
  s = reduce(s, { event: { kind: "resolved", id: first.id, bridgeApproval: first.bridgeApproval,
    approvalConnectionEpoch: 1, approvalRevision: 3 } });
  assert.deepEqual(s.approvals, [second]);
  s = reduce(s, { event: { kind: "connection", connected: false } });
  assert.deepEqual(s.approvals, [second], "A generic late status cannot clear another approval connection");
  s = reduce(s, { event: { kind: "approval-invalidated", connectionId: "c", connectionEpoch: 1, revision: 4 } });
  assert.deepEqual(s.approvals, []);
});
test("resuming hydrates history and disconnect resets hanging work", () => {
  let s = reduce(emptyState, {
    type: "hydrate",
    id: "a",
    thread: {
      turns: [
        {
          id: "t",
          status: "inProgress",
          items: [{ id: "i", type: "agentMessage", text: "Saved" }],
        },
      ],
    },
  });
  assert.equal(s.active.a, "t");
  assert.equal(s.items.a[0].text, "Saved");
  s = reduce(s, { event: { kind: "connection", connected: false } });
  assert.deepEqual(s.active, {});
  assert.equal(s.items.a[0].text, "Saved");
});
test("interrupt and disconnect stop pending tool rows without rewriting completed tools", () => {
  let s = { ...emptyState, active: { a: "turn-a", b: "turn-b" }, items: {
    a: [{ id: "done", type: "commandExecution", status: "completed", exitCode: 0, turnId: "old" }, { id: "running", type: "commandExecution", status: "inProgress", turnId: "turn-a" }],
    b: [{ id: "other", type: "commandExecution", status: "inProgress", turnId: "turn-b" }],
  } };
  s = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "turn-a", status: "interrupted" } }));
  assert.equal(s.items.a[0].status, "completed");
  assert.equal(s.items.a[1].status, "interrupted");
  assert.equal(s.items.b[0].status, "inProgress");
  s = reduce(s, { event: { kind: "connection", connected: false } });
  assert.equal(s.items.b[0].status, "interrupted");
});

const savedThread = (items, status = "inProgress", turnId = "turn-a") => ({
  turns: [{ id: turnId, status, items }],
});
const resumeBaseline = (state, id = "a") => ({
  baselineItems: state.items[id],
  baselineActive: state.active[id],
  baselineActiveVersion: state.activeVersions?.[id],
});

test("resume fills unchanged history while preserving output and completed state received during the request", () => {
  let s = reduce(emptyState, { type: "hydrate", id: "a", thread: savedThread([
    { id: "history", type: "agentMessage", text: "Partial saved history" },
    { id: "tool", type: "commandExecution", status: "inProgress", aggregatedOutput: "before" },
  ]) });
  const baseline = resumeBaseline(s);
  s = reduce(s, event("item/commandExecution/outputDelta", { threadId: "a", turnId: "turn-a", itemId: "tool", delta: " after" }));
  s = reduce(s, event("item/completed", { threadId: "a", turnId: "turn-a", item: { id: "tool", type: "commandExecution", status: "completed", aggregatedOutput: "before after", exitCode: 0 } }));
  s = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "turn-a", status: "completed" } }));
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([
    { id: "history", type: "agentMessage", text: "Complete saved history" },
    { id: "tool", type: "commandExecution", status: "inProgress", aggregatedOutput: "before", command: "echo example" },
    { id: "restored", type: "agentMessage", text: "History absent from local memory" },
  ]) });
  assert.equal(s.items.a[0].text, "Complete saved history");
  assert.equal(s.items.a[1].aggregatedOutput, "before after");
  assert.equal(s.items.a[1].status, "completed");
  assert.equal(s.items.a[1].exitCode, 0);
  assert.equal(s.items.a[1].command, "echo example");
  assert.equal(s.items.a[2].text, "History absent from local memory");
  assert.equal(s.active.a, null, "An old running snapshot cannot resurrect a completed turn");
});

test("resume deduplicates live text already present in the snapshot and retains new stream-only rows", () => {
  let s = reduce(emptyState, { type: "hydrate", id: "a", thread: savedThread([{ id: "message", type: "agentMessage", text: "Hello" }]) });
  const baseline = resumeBaseline(s);
  s = reduce(s, event("item/agentMessage/delta", { threadId: "a", turnId: "turn-a", itemId: "message", delta: " world" }));
  s = reduce(s, event("item/started", { threadId: "a", turnId: "turn-a", item: { id: "new-tool", type: "commandExecution", command: "pwd", status: "inProgress" } }));
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([{ id: "message", type: "agentMessage", text: "Hello world!" }]) });
  assert.equal(s.items.a[0].text, "Hello world!");
  assert.equal(s.items.a.filter(item => item.id === "message").length, 1);
  assert.equal(s.items.a[1].id, "new-tool");
  assert.equal(s.items.a[1].status, "inProgress");
});

test("resume with an initially missing item accepts a snapshot containing its delta and clears partial metadata on completion", () => {
  const baseline = resumeBaseline(emptyState);
  let s = reduce(emptyState, event("item/agentMessage/delta", { threadId: "a", turnId: "turn-a", itemId: "late", delta: "world" }));
  assert.equal(Object.getOwnPropertySymbols(s.items.a[0]).length, 1);
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([{ id: "late", type: "agentMessage", text: "Hello world!" }]) });
  assert.equal(s.items.a[0].text, "Hello world!");
  s = reduce(s, event("item/completed", { threadId: "a", turnId: "turn-a", item: { id: "late", type: "agentMessage", text: "Hello world! Finished." } }));
  assert.equal(s.items.a[0].text, "Hello world! Finished.");
  assert.equal(Object.getOwnPropertySymbols(s.items.a[0]).length, 0);
});

test("resume never guesses concatenation for a delta-only item with an unknown snapshot base", () => {
  const baseline = resumeBaseline(emptyState);
  let s = reduce(emptyState, event("item/agentMessage/delta", { threadId: "a", turnId: "turn-a", itemId: "late", delta: "Live fragment" }));
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([{ id: "late", type: "agentMessage", text: "Unordered saved prefix", phase: "commentary" }]) });
  assert.equal(s.items.a[0].text, "Live fragment");
  assert.equal(s.items.a[0].phase, "commentary", "Snapshot may still fill non-stream metadata");
});

test("resume active version protects a completed null → running → null ABA transition", () => {
  let s = reduce(emptyState, { type: "hydrate", id: "a", thread: savedThread([], "completed") });
  const baseline = resumeBaseline(s);
  assert.equal(baseline.baselineActive, null);
  s = reduce(s, event("turn/started", { threadId: "a", turn: { id: "new-turn" } }));
  s = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "new-turn", status: "completed" } }));
  assert.equal(s.active.a, baseline.baselineActive);
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([], "inProgress", "new-turn") });
  assert.equal(s.active.a, null);
  assert.equal(s.activeVersions.a, 2);
});

test("resume does not undo a disconnect or a newly started different turn", () => {
  let s = reduce(emptyState, { type: "hydrate", id: "a", thread: savedThread([]) });
  let baseline = resumeBaseline(s);
  s = reduce(s, { event: { kind: "connection", connected: false } });
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([]) });
  assert.equal(s.active.a, undefined);
  baseline = resumeBaseline(s);
  s = reduce(s, event("turn/started", { threadId: "a", turn: { id: "new-turn" } }));
  s = reduce(s, { type: "hydrate", id: "a", ...baseline, thread: savedThread([], "completed") });
  assert.equal(s.active.a, "new-turn");
});

test("per-item completion settles code while a later item in the same turn keeps running", async () => {
  const { isItemStreaming } = await import("../src/state.js");
  let s = reduce(emptyState, event("turn/started", {threadId:"a", turn:{id:"t"}}));
  s = reduce(s, event("item/started", {threadId:"a", turnId:"t", item:{id:"m", type:"agentMessage", text:"```js\nx"}}));
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),true);
  s = reduce(s, event("item/completed", {threadId:"a", turnId:"t", item:{id:"m", type:"agentMessage", text:"```js\nx"}}));
  assert.equal(s.active.a,"t");
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false,"An unclosed fence belongs to a completed item");
  s = reduce(s, event("item/agentMessage/delta", {threadId:"a", turnId:"t", itemId:"next", delta:"Next item"}));
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false);
  assert.equal(isItemStreaming(s,"a",s.items.a[1]),true);
  const baseline=resumeBaseline(s);
  s=reduce(s,{type:"hydrate",id:"a",...baseline,thread:savedThread([{id:"m",type:"agentMessage",text:"```js\nx"},{id:"next",type:"agentMessage",text:"Next item"}],"inProgress","t")});
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false,"Resume cannot erase an observed completed item");
  assert.equal(isItemStreaming(s,"a",s.items.a[1]),true);
  s=reduce(s,event("turn/completed",{threadId:"a",turn:{id:"t",status:"completed"}}));
  assert.equal(isItemStreaming(s,"a",s.items.a[1]),false);
});

test("restored active text may grow only at the turn tail; finished history and disconnection settle it", async () => {
  const {isItemStreaming}=await import("../src/state.js");
  let s=reduce(emptyState,{type:"hydrate",id:"a",thread:savedThread([{id:"prior",type:"agentMessage",text:"Done"},{id:"tail",type:"agentMessage",text:"Partial"}])});
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false);
  assert.equal(isItemStreaming(s,"a",s.items.a[1]),true);
  assert.equal(isItemStreaming(s,"b",s.items.a[1]),false);
  s=reduce(s,{event:{kind:"connection",connected:false}});
  assert.equal(isItemStreaming(s,"a",s.items.a[1]),false);
  s=reduce(s,{type:"hydrate",id:"a",thread:savedThread([{id:"tail",type:"agentMessage",text:"Done"}],"completed")});
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false);
});

test("reconnection preserves observed item completion without reviving stale streaming observations", async () => {
  const {isItemStreaming}=await import("../src/state.js");
  let s=reduce(emptyState,event("turn/started",{threadId:"a",turn:{id:"t"}}));
  s=reduce(s,event("item/completed",{threadId:"a",turnId:"t",item:{id:"finished",type:"agentMessage",text:"```js\nx"}}));
  s=reduce(s,{event:{kind:"connection",connected:false}});
  const baseline=resumeBaseline(s);
  s=reduce(s,{type:"hydrate",id:"a",...baseline,thread:savedThread([{id:"finished",type:"agentMessage",text:"```js\nx"}],"inProgress","t")});
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false);
  s=reduce(s,event("item/agentMessage/delta",{threadId:"a",turnId:"t",itemId:"growing",delta:"partial"}));
  s=reduce(s,{event:{kind:"connection",connected:false}});
  assert.equal(s.itemPhases.a.finished,"completed");
  assert.equal(s.itemPhases.a.growing,undefined);
  s=reduce(s,{type:"hydrate",id:"a",...resumeBaseline(s),thread:savedThread([{id:"growing",type:"agentMessage",text:"complete"},{id:"tool",type:"commandExecution",status:"inProgress"}],"inProgress","t")});
  assert.equal(isItemStreaming(s,"a",s.items.a.find(item=>item.id==='growing')),false);
});

test("fresh deltas before initial resume grow immediately, but known idle or another turn stays settled", async () => {
  const {isItemStreaming}=await import("../src/state.js");
  const baseline=resumeBaseline(emptyState);
  let s=reduce(emptyState,event("item/agentMessage/delta",{threadId:"a",turnId:"t",itemId:"early",delta:"```js\nx"}));
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),true);
  s=reduce(s,{type:"hydrate",id:"a",...baseline,thread:savedThread([{id:"early",type:"agentMessage",text:"```js\nx"}],"inProgress","t")});
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),true);
  s=reduce(s,event("turn/completed",{threadId:"a",turn:{id:"t",status:"completed"}}));
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false);
  s=reduce(s,event("turn/started",{threadId:"a",turn:{id:"other"}}));
  assert.equal(isItemStreaming(s,"a",s.items.a[0]),false);
});

test("R08: an output-limit turn stores its TurnError; a thread-wide error keeps the TurnError shape", () => {
  let s = reduce(emptyState, event("turn/started", { threadId: "a", turn: { id: "t" } }));
  s = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "t", status: "completed",
    error: { message: "Response exceeded the output limit", codexErrorInfo: null, additionalDetails: "MAX_TOKENS", misalignment: null } } }));
  assert.deepEqual(s.turnErrors.a.t, { message: "Response exceeded the output limit", codexErrorInfo: null, additionalDetails: "MAX_TOKENS" });
  assert.equal(s.errors.a, null);
  s = reduce(s, event("error", { threadId: "a", turnId: "", willRetry: false, error: { message: "Outside a turn", codexErrorInfo: "contextWindowExceeded" } }));
  assert.deepEqual(s.errors.a, { message: "Outside a turn", codexErrorInfo: "contextWindowExceeded", additionalDetails: null });
  assert.equal(s.turnErrors.a.t.additionalDetails, "MAX_TOKENS");
  // A message-less thread error still has the card's fallback message.
  assert.equal(reduce(emptyState, event("error", { threadId: "b", willRetry: false })).errors.b.message, "DeepSeek reported an error.");
});

// R09: the Plan pane's document is the newest Codex `plan` item (projection.js exit_plan_mode → {type:'plan', text}).
test("a completed plan item sets planDocs; history replay sets it too and an older history keeps it", () => {
  assert.deepEqual(emptyState.planDocs, {});
  const plan = (id, text) => ({ id, type: "plan", text });
  let s = reduce(emptyState, event("item/started", { threadId: "a", turnId: "t", item: plan("plan-1", "# Draft") }));
  assert.equal(s.planDocs.a, undefined, "item/started alone does not set the document");
  s = reduce(s, event("item/completed", { threadId: "a", turnId: "t", item: plan("plan-1", "# Plan\n\nStep one.") }));
  assert.equal(s.planDocs.a, "# Plan\n\nStep one.");
  s = reduce(s, event("item/completed", { threadId: "a", turnId: "t", item: plan("plan-2", "# Revised") }));
  assert.equal(s.planDocs.a, "# Revised", "the latest proposed plan wins");
  const unchanged = reduce(s, event("item/completed", { threadId: "a", turnId: "t", item: { id: "m", type: "agentMessage", text: "# not a plan" } }));
  assert.equal(unchanged.planDocs, s.planDocs, "other items leave planDocs untouched");
  s = reduce(s, event("item/completed", { threadId: "b", turnId: "u", item: plan("plan-3", "") }));
  assert.equal(s.planDocs.b, undefined, "an empty plan text is no document");
  let h = reduce(emptyState, { type: "hydrate", id: "c", thread: { turns: [
    { id: "t1", status: "completed", items: [plan("p1", "# First"), { id: "m1", type: "agentMessage", text: "ok" }] },
    { id: "t2", status: "completed", items: [plan("p2", "# Second")] },
  ] } });
  assert.equal(h.planDocs.c, "# Second", "history replay keeps the newest plan item");
  h = reduce(h, { type: "hydrate", id: "c", thread: { turns: [{ id: "t3", status: "completed", items: [{ id: "m3", type: "agentMessage", text: "x" }] }] } });
  assert.equal(h.planDocs.c, "# Second", "a page without a plan item keeps the document");
});
