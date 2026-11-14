import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, reduce, ownerThreadId, isSubAgentThread, hasPendingApproval, hasLiveWork, isItemStreaming } from "../src/state.js";
import { reasoningText } from "../src/transcript-item-visibility.mjs";

const event = (method, params) => ({ event: { method, params } });
const thread = (id, extra = {}) => ({ id, sessionId: id, parentThreadId: null, historyMode: "paginated", model: "gpt-6-astra", agentNickname: null, agentRole: null, status: { type: "idle" }, turns: [], ...extra });

test("deprecationNotice without a threadId becomes a connection notice and repeats collapse", () => {
  const summary = "Full-history hydration is deprecated for paginated threads; use `excludeTurns: true`, then page with `thread/turns/list` and `thread/items/list`.";
  let s = reduce(emptyState, event("deprecationNotice", { summary, details: null }));
  assert.deepEqual(s.notices, [{ kind: "deprecation", summary, details: null }]);
  const again = reduce(s, event("deprecationNotice", { summary, details: null }));
  assert.equal(again, s, "an identical notice does not produce a new state");
  s = reduce(s, event("deprecationNotice", { summary: "review/start with delivery \"detached\" is deprecated and will be removed in a future release.", details: "Use thread/start followed by review/start with delivery \"inline\"." }));
  assert.equal(s.notices.length, 2);
  assert.equal(s.notices[1].details, "Use thread/start followed by review/start with delivery \"inline\".");
  assert.equal(reduce(s, event("deprecationNotice", { details: "no summary" })), s, "a notice without a summary is ignored");
});

test("warning routes by threadId: scoped to a thread, otherwise connection-wide", () => {
  let s = reduce(emptyState, event("warning", { threadId: "a", message: "Thread warning." }));
  assert.deepEqual(s.warnings, { a: ["Thread warning."] });
  assert.deepEqual(s.notices, []);
  assert.equal(reduce(s, event("warning", { threadId: "a", message: "Thread warning." })), s, "duplicate thread warning collapses");
  s = reduce(s, event("warning", { threadId: "a", message: "Second warning." }));
  assert.deepEqual(s.warnings.a, ["Thread warning.", "Second warning."]);
  s = reduce(s, event("warning", { threadId: null, message: "Connection warning." }));
  assert.deepEqual(s.notices, [{ kind: "warning", summary: "Connection warning.", details: null }]);
  assert.deepEqual(s.warnings.a, ["Thread warning.", "Second warning."], "a connection warning never lands in a thread");
});

test("thread/started records sub-agent identity and the parent-child map", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("parent") }));
  assert.deepEqual(s.threadParents, {});
  assert.equal(s.threads.parent.model, "gpt-6-astra");
  assert.equal(s.threads.parent.parentThreadId, null);
  s = reduce(s, event("thread/started", { thread: thread("child", { parentThreadId: "parent", agentNickname: "quiet-otter", agentRole: "explorer", model: "gpt-5.6-sol", canAcceptDirectInput: false }) }));
  assert.equal(s.threads.child.agentNickname, "quiet-otter");
  assert.equal(s.threads.child.agentRole, "explorer");
  assert.equal(s.threads.child.model, "gpt-5.6-sol");
  assert.equal(s.threads.child.canAcceptDirectInput, false);
  assert.deepEqual(s.threadParents, { child: "parent" });
  assert.deepEqual(s.childThreads, { parent: ["child"] });
  // A sub-agent can spawn its own sub-agent (SubAgentSource depth).
  s = reduce(s, event("thread/started", { thread: thread("grandchild", { parentThreadId: "child" }) }));
  assert.equal(ownerThreadId(s, "grandchild"), "parent");
  assert.equal(ownerThreadId(s, "parent"), "parent");
  // W14-code r4 fr4-16: the test-only helpers isChildThread / childThreadIds are gone (no caller); the maps they read stay.
  assert.deepEqual(s.threadParents, { child: "parent", grandchild: "child" });
  assert.deepEqual(s.childThreads, { parent: ["child"], child: ["grandchild"] });
  // Repeating thread/started must not duplicate the child entry.
  s = reduce(s, event("thread/started", { thread: thread("child", { parentThreadId: "parent" }) }));
  assert.deepEqual(s.childThreads.parent, ["child"]);
  assert.equal(reduce(s, event("thread/started", {})), s, "a notification without a thread is ignored");
});

test("child-thread items bucket under the child id and never touch the parent", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("child", { parentThreadId: "parent" }) }));
  s = reduce(s, event("turn/started", { threadId: "child", turn: { id: "t1" } }));
  s = reduce(s, event("item/started", { threadId: "child", turnId: "t1", item: { id: "i1", type: "commandExecution", command: "printf x", status: "inProgress" } }));
  assert.equal(s.items.parent, undefined, "the parent transcript never receives a sub-agent item");
  assert.equal(s.items.child.length, 1);
  assert.equal(s.active.child, "t1");
  assert.equal(s.active.parent, undefined);
  assert.equal(ownerThreadId(s, "child"), "parent", "the child bucket resolves to its parent session");
});

test("thread/status/changed records the runtime status per thread", () => {
  let s = reduce(emptyState, event("thread/status/changed", { threadId: "a", status: { type: "active", activeFlags: ["waitingOnApproval"] } }));
  assert.deepEqual(s.threadStatus.a, { type: "active", activeFlags: ["waitingOnApproval"] });
  assert.deepEqual(s.threads.a.status, { type: "active", activeFlags: ["waitingOnApproval"] });
  s = reduce(s, event("thread/status/changed", { threadId: "a", status: { type: "idle" } }));
  assert.deepEqual(s.threadStatus.a, { type: "idle" });
  assert.equal(reduce(s, event("thread/status/changed", { threadId: "a" })), s, "a status-less notification is ignored");
});

test("item/fileChange/patchUpdated replaces the whole change set", () => {
  const first = [{ path: "/w/one.txt", kind: "update", diff: "-one\n+ONE" }];
  const second = [...first, { path: "/w/two.txt", kind: "add", diff: "+two" }];
  let s = reduce(emptyState, event("item/started", { threadId: "a", turnId: "t1", item: { id: "f1", type: "fileChange", status: "inProgress", changes: first } }));
  s = reduce(s, event("item/fileChange/patchUpdated", { threadId: "a", turnId: "t1", itemId: "f1", changes: second }));
  assert.deepEqual(s.items.a[0].changes, second);
  assert.equal(s.items.a[0].status, "inProgress", "the patch does not settle the item");
  assert.equal(s.items.a.length, 1);
  // A patch can precede item/started. It must NOT synthesize a row: an item
  // with no lifecycle status is drawn as settled (source-session.jsx:100
  // outcome() -> "done"), so the transcript would show a finished "Edited /
  // N files" step for a patch the model is still revising. Nothing is lost -
  // item/started carries the authoritative FileChangeItem, changes included.
  // (Changed from the 0.2.15 expectation, which asserted the synthesized row.)
  const early = reduce(emptyState, event("item/fileChange/patchUpdated", { threadId: "b", turnId: "t9", itemId: "f9", changes: first }));
  assert.deepEqual(early.items.b ?? [], [], "an update for an unreported item invents no row");
  const late = reduce(early, event("item/started", { threadId: "b", turnId: "t9", item: { id: "f9", type: "fileChange", status: "inProgress", changes: second } }));
  assert.deepEqual(late.items.b.map(entry => entry.id), ["f9"]);
  assert.equal(late.items.b[0].status, "inProgress");
  assert.deepEqual(late.items.b[0].changes, second, "the server's own item is authoritative");
  assert.equal(reduce(s, event("item/fileChange/patchUpdated", { threadId: "a", itemId: "f1" })), s, "a patch without changes is ignored");
});

test("item/mcpToolCall/progress annotates the running call without settling it", () => {
  let s = reduce(emptyState, event("item/started", { threadId: "a", turnId: "t1", item: { id: "m1", type: "mcpToolCall", server: "files", tool: "read", status: "inProgress" } }));
  s = reduce(s, event("item/mcpToolCall/progress", { threadId: "a", turnId: "t1", itemId: "m1", message: "Indexing 2 of 9" }));
  assert.equal(s.items.a[0].progressMessage, "Indexing 2 of 9");
  assert.equal(s.items.a[0].status, "inProgress");
  s = reduce(s, event("item/mcpToolCall/progress", { threadId: "a", turnId: "t1", itemId: "m1", message: "Indexing 9 of 9" }));
  assert.equal(s.items.a[0].progressMessage, "Indexing 9 of 9");
  assert.equal(s.items.a.length, 1);
  assert.equal(reduce(s, event("item/mcpToolCall/progress", { threadId: "a", itemId: "m1" })), s, "a progress notification without a message is ignored");
  // Same rule as the patch above: progress for an item Codex has not reported
  // creates nothing. A synthesized mcpToolCall row carries no server/tool, so
  // source-session.jsx:441-445 would label it with the literal fallback
  // "Tool" and outcome() would draw it as already done.
  const earlyProgress = reduce(emptyState, event("item/mcpToolCall/progress", { threadId: "c", turnId: "t9", itemId: "m9", message: "Indexing 1 of 9" }));
  assert.deepEqual(earlyProgress.items.c ?? [], [], "progress for an unreported item invents no row");
});

test("unconsumed 0.155.1 notifications leave the state untouched instead of throwing", () => {
  const base = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  for (const [method, params] of [
    ["thread/attachment/updated", { threadId: "a", attachments: [] }],
    ["model/rerouted", { threadId: "a", from: "x", to: "y" }],
    ["skills/changed", {}],
    ["mcpServer/startupStatus/updated", { name: "files" }],
    ["hook/started", { threadId: "a", hook: {} }],
  ]) assert.equal(reduce(base, event(method, params)), base, `${method} must be inert`);
});

test("guardianWarning, strict review, cyber verification, reroutes and configWarning become notices; goals, names and auto-reviews are kept", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  s = reduce(s, event("guardianWarning", { threadId: "a", message: "Auto-review is unavailable." }));
  s = reduce(s, event("guardianWarning", { threadId: "a", message: "Auto-review is unavailable." }));
  s = reduce(s, event("autoApprovalReview/strictReviewRequired", { threadId: "a", turnId: "t", startedAtMs: 1 }));
  s = reduce(s, event("model/verification", { threadId: "a", turnId: "t", verifications: ["trustedAccessForCyber"] }));
  s = reduce(s, event("model/rerouted", { threadId: "a", turnId: "t", fromModel: "gpt-5.6", toModel: "gpt-5.6-mini", reason: "highRiskCyberActivity" }));
  assert.deepEqual(s.threadNotices.a.map(n => n.kind), ["guardian", "strictReview", "verification", "rerouted"]);
  assert.deepEqual(s.threadNotices.a[3].values, { from: "gpt-5.6", to: "gpt-5.6-mini" });
  s = reduce(s, event("configWarning", { summary: "Error parsing rules; custom rules not applied.", details: "bad token", path: "/x/default.rules", range: { start: { line: 2, column: 0 }, end: { line: 2, column: 3 } } }));
  assert.deepEqual(s.notices.at(-1), { kind: "config", summary: "Error parsing rules; custom rules not applied.", details: "bad token", path: "/x/default.rules", line: 3 });
  s = reduce(s, event("thread/goal/updated", { threadId: "a", turnId: null, goal: { threadId: "a", objective: "ship", status: "active", tokenBudget: null, tokensUsed: 5, timeUsedSeconds: 2, createdAt: 1, updatedAt: 2 } }));
  assert.equal(s.goals.a.status, "active");
  s = reduce(s, event("thread/goal/cleared", { threadId: "a" }));
  assert.equal(s.goals.a, undefined);
  s = reduce(s, event("thread/name/updated", { threadId: "a", threadName: " Fix login " }));
  assert.equal(s.threadNames.a, "Fix login");
  s = reduce(s, event("item/autoApprovalReview/started", { threadId: "a", turnId: "t", startedAtMs: 5, reviewId: "r1", targetItemId: "c1", review: { status: "inProgress", riskLevel: null, userAuthorization: null, rationale: null }, action: { type: "command", source: "shell", command: "rm x", cwd: "/w" } }));
  s = reduce(s, event("item/autoApprovalReview/completed", { threadId: "a", turnId: "t", startedAtMs: 5, completedAtMs: 9, reviewId: "r1", targetItemId: "c1", decisionSource: "agent", review: { status: "denied", riskLevel: "high", userAuthorization: null, rationale: "Deletes files." }, action: { type: "command", source: "shell", command: "rm x", cwd: "/w" } }));
  assert.deepEqual([s.autoReviews.a.r1.status, s.autoReviews.a.r1.riskLevel, s.autoReviews.a.r1.rationale, s.autoReviews.a.r1.targetItemId], ["denied", "high", "Deletes files.", "c1"]);
  s = reduce(s, event("item/autoApprovalReview/completed", { threadId: "a", turnId: "t", startedAtMs: 5, completedAtMs: 9, reviewId: "r2", targetItemId: null, decisionSource: "agent", review: { status: "denied", riskLevel: "medium", userAuthorization: null, rationale: "Unknown host." }, action: { type: "networkAccess", target: "https://x.test", host: "x.test", protocol: "https", port: 443 } }));
  // reviewId: the notice's 'Approve once' rebuilds Codex's denial event from that review (/auto-review).
  assert.deepEqual(s.threadNotices.a.at(-1), { kind: "autoReviewDenied", summary: "Auto-review denied network access to {host}.", details: "Unknown host.", values: { host: "x.test" }, reviewId: "r2" });
  // A new connection drops the old connection-wide notices.
  assert.deepEqual(reduce(s, { event: { kind: "connection", connected: false } }).notices, []);
});

test("raw reasoning (item/reasoning/textDelta) streams into the thought when there is no summary", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  s = reduce(s, event("item/reasoning/textDelta", { threadId: "a", turnId: "t", itemId: "r", delta: "thinking ", contentIndex: 0 }));
  s = reduce(s, event("item/reasoning/textDelta", { threadId: "a", turnId: "t", itemId: "r", delta: "hard", contentIndex: 0 }));
  assert.equal(s.items.a[0].type, "reasoning");
  assert.equal(s.items.a[0].rawReasoningText, "thinking hard");
});

test("a sub-agent is classified by Thread.source, not only by parentThreadId", () => {
  // The app-server's own list classification keys on Thread.source
  // (SessionSource = ... | {subAgent: SubAgentSource}, filters.rs:121-150),
  // while parentThreadId is set only for an AgentControl thread_spawn
  // (ts/v2/Thread.ts). work/protocol-0155-audit/probe.json threadListSub holds
  // three real review threads with source {subAgent:"review"} and
  // parentThreadId null, so a parentThreadId-only guard admits them.
  assert.equal(isSubAgentThread({ id: "r", source: { subAgent: "review" }, parentThreadId: null }), true);
  assert.equal(isSubAgentThread({ id: "c", source: { subAgent: "compact" }, parentThreadId: null }), true);
  assert.equal(isSubAgentThread({ id: "s", source: { subAgent: { thread_spawn: { parent_thread_id: "p", depth: 1 } } }, parentThreadId: "p" }), true);
  assert.equal(isSubAgentThread({ id: "d", source: "appServer", parentThreadId: "p" }), true);
  assert.equal(isSubAgentThread({ id: "n", source: "appServer", parentThreadId: null }), false);
  assert.equal(isSubAgentThread({ id: "u", source: { custom: "vscode-fork" }, parentThreadId: null }), false);
  assert.equal(isSubAgentThread({ id: "e" }), false);
  assert.equal(isSubAgentThread(null), false);
});

test("an approval raised on a sub-agent thread belongs to the session that owns it", () => {
  // A sub-agent thread is never a session and never navigable, so an approval
  // matched against its own threadId alone would have no surface at all.
  let s = reduce(emptyState, event("thread/started", { thread: thread("child", { parentThreadId: "root" }) }));
  s = reduce(s, event("thread/started", { thread: thread("grandchild", { parentThreadId: "child" }) }));
  s = { ...s, approvals: [{ id: "req-1", params: { threadId: "grandchild" } }] };
  assert.equal(hasPendingApproval(s, "root"), true);
  assert.equal(hasPendingApproval(s, "child"), false, "only the owning session claims it");
  assert.equal(hasPendingApproval(s, "grandchild"), false);
  assert.equal(hasPendingApproval(s, undefined), false);
  assert.equal(hasPendingApproval({ ...s, approvals: [{ id: "req-2", params: {} }] }, "root"), false,
    "a request with no threadId is not attributed to any session");
  assert.equal(hasPendingApproval({ approvals: [{ id: "req-3", params: { threadId: "root" } }] }, "root"), true,
    "an ordinary session approval still matches with no parent table at all");
});

test("item/plan/delta streams Codex's proposed plan into the plan item; item/completed's text is authoritative", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  s = reduce(s, event("turn/started", { threadId: "a", turn: { id: "t", status: "inProgress", items: [] } }));
  s = reduce(s, event("item/started", { threadId: "a", turnId: "t", item: { type: "plan", id: "p", text: "" } }));
  s = reduce(s, event("item/plan/delta", { threadId: "a", turnId: "t", itemId: "p", delta: "# Plan\n" }));
  s = reduce(s, event("item/plan/delta", { threadId: "a", turnId: "t", itemId: "p", delta: "1. Read" }));
  assert.deepEqual([s.items.a.length, s.items.a[0].type, s.items.a[0].text], [1, "plan", "# Plan\n1. Read"]);
  assert.equal(isItemStreaming(s, "a", s.items.a[0]), true);
  s = reduce(s, event("item/completed", { threadId: "a", turnId: "t", item: { type: "plan", id: "p", text: "# Plan\n1. Read the code" } }));
  assert.equal(s.items.a[0].text, "# Plan\n1. Read the code", "the completed PlanItem.text replaces the concatenated deltas");
  assert.equal(isItemStreaming(s, "a", s.items.a[0]), false);
  // A delta before item/started creates the row typed plan, never an answer.
  let early = reduce(emptyState, event("thread/started", { thread: thread("b") }));
  early = reduce(early, event("item/plan/delta", { threadId: "b", turnId: "t2", itemId: "p2", delta: "Step" }));
  assert.deepEqual([early.items.b[0].type, early.items.b[0].text], ["plan", "Step"]);
});

test("a plan cut off by an interrupted turn is settled as interrupted, not left as a finished plan", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  s = reduce(s, event("turn/started", { threadId: "a", turn: { id: "t", status: "inProgress", items: [] } }));
  s = reduce(s, event("item/started", { threadId: "a", turnId: "t", item: { type: "plan", id: "p", text: "" } }));
  s = reduce(s, event("item/plan/delta", { threadId: "a", turnId: "t", itemId: "p", delta: "1. Half" }));
  const done = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "t", status: "completed", items: [] } }));
  assert.equal(done.items.a[0].status, undefined, "a completed turn leaves the plan as Codex sent it");
  const cut = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "t", status: "interrupted", items: [] } }));
  assert.equal(cut.items.a[0].status, "interrupted");
});

test("reasoning summary sections stream as separate paragraphs (summaryPartAdded / summaryIndex)", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  const delta = (text, summaryIndex) => event("item/reasoning/summaryTextDelta", { threadId: "a", turnId: "t", itemId: "r", delta: text, summaryIndex });
  s = reduce(s, delta("**Reading**\n", 0));
  s = reduce(s, delta("checked the tests.", 0));
  s = reduce(s, event("item/reasoning/summaryPartAdded", { threadId: "a", turnId: "t", itemId: "r", summaryIndex: 1 }));
  s = reduce(s, delta("**Planning the fix**\n", 1));
  s = reduce(s, delta("I will update it.", 1));
  assert.equal(reasoningText(s.items.a[0]), "**Reading**\nchecked the tests.\n\n**Planning the fix**\nI will update it.");
  // Without summaryPartAdded, a new summaryIndex alone starts the paragraph; a repeated break adds nothing.
  s = reduce(s, delta("**Done**", 2));
  s = reduce(s, event("item/reasoning/summaryPartAdded", { threadId: "a", turnId: "t", itemId: "r", summaryIndex: 2 }));
  assert.equal(reasoningText(s.items.a[0]), "**Reading**\nchecked the tests.\n\n**Planning the fix**\nI will update it.\n\n**Done**");
  // A break for an unknown item, or before any text, changes nothing.
  assert.equal(reduce(s, event("item/reasoning/summaryPartAdded", { threadId: "a", turnId: "t", itemId: "nope", summaryIndex: 1 })), s);
  let fresh = reduce(emptyState, event("thread/started", { thread: thread("b") }));
  fresh = reduce(fresh, event("item/reasoning/summaryTextDelta", { threadId: "b", turnId: "t", itemId: "r", delta: "first", summaryIndex: 1 }));
  assert.equal(fresh.items.b[0].reasoningText, "first");
});

test("hasLiveWork: a finished turn's explicit null active entry is not a running response", () => {
  let s = reduce(emptyState, event("thread/started", { thread: thread("a") }));
  assert.equal(hasLiveWork(s), false);
  s = reduce(s, event("turn/started", { threadId: "a", turn: { id: "t", status: "inProgress", items: [] } }));
  assert.equal(hasLiveWork(s), true);
  s = reduce(s, event("turn/completed", { threadId: "a", turn: { id: "t", status: "completed", items: [] } }));
  assert.deepEqual(s.active, { a: null });
  assert.equal(hasLiveWork(s), false, "switching cores after a finished turn needs no 'a response is running' confirmation");
  assert.equal(hasLiveWork({ ...s, approvals: [{ id: 1, method: "item/commandExecution/requestApproval", params: { threadId: "a" } }] }), true);
});

