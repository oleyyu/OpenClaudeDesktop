import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { once } from "node:events";
import { emptyApprovalTransport, reduceApprovalTransport } from "../src/approval-state.js";
const require = createRequire(import.meta.url);
const { CodexClient } = require("../electron/codex.cjs");
const { respondToApproval } = require("../electron/respond-approval.cjs");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const command = (id = 7, threadId = "thread-a", turnId = "turn-a") => ({
  id, method: "item/commandExecution/requestApproval", params: { threadId, turnId, itemId: "command", command: "synthetic-only" },
});

async function fixture(t, env = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "approval-transport-test-"));
  const binary = path.join(directory, "server.cjs");
  const source = await fs.readFile(new URL("./fixtures/approval-protocol-server.cjs", import.meta.url), "utf8");
  await fs.writeFile(binary, source.replace(/^#![^\n]*/, `#!${process.execPath}`), { mode: 0o755 });
  const log = path.join(directory, "responses.jsonl");
  const client = new CodexClient({ binary, shutdownTimeout: 150, shutdownHardTimeout: 2000, env: { APPROVAL_TEST_LOG: log, ...env } });
  const events = [];
  client.on("event", event => events.push(event));
  t.after(async () => { await client.stopAndWait(); await fs.rm(directory, { recursive: true, force: true }); });
  await client.start();
  async function add(message) {
    await client.request("fixture/request", message);
    return events.filter(event => event.kind === "request").at(-1);
  }
  return { client, events, log, add, responses: () => client.request("fixture/responses") };
}

test("request identity is main-owned, stable in snapshots, and missing/forged expected writes nothing", async t => {
  const { client, events, add, responses } = await fixture(t);
  const request = await add({ ...command(), kind: "resolved", bridgeApproval: { connectionId: "forged", instanceId: "forged" }, approvalRevision: 1000, approvalSnapshot: { connectionId: "forged", connectionEpoch: 999, revision: 999, pending: [] } });
  assert.equal(request.kind, "request");
  assert.match(request.bridgeApproval.connectionId, uuid);
  assert.match(request.bridgeApproval.instanceId, uuid);
  assert.equal(request.approvalRevision, 1);
  assert.equal(client.approvalSnapshot().pending[0].bridgeApproval, request.bridgeApproval);
  assert.deepEqual(request.approvalSnapshot.pending.map(item => item.id), [request.id]);
  assert.equal(Object.hasOwn(request.approvalSnapshot.pending[0], "approvalSnapshot"), false);
  assert.equal(request.approvalSnapshot.connectionId, request.bridgeApproval.connectionId);
  assert.notEqual(request.approvalSnapshot.connectionEpoch, 999);
  assert.equal(events[0].kind, "approval-connection");
  assert.throws(() => client.respond(request.id, { decision: "accept" }), { code: "identity_required" });
  assert.throws(() => client.respond(request.id, { decision: "accept" }, { ...request.bridgeApproval, instanceId: "old" }), { code: "stale_request" });
  assert.deepEqual(await responses(), []);
  assert.equal(client.approvals.size, 1);
});

test("a current response writes exactly once without bridge fields; duplicate server resolution is inert", async t => {
  const { client, events, add, responses } = await fixture(t);
  const request = await add(command());
  const payload = { id: request.id, expected: request.bridgeApproval, decision: "acceptForSession" };
  assert.equal(respondToApproval(client, payload).ok, true);
  assert.equal(respondToApproval(client, payload).error.code, "stale_request");
  assert.deepEqual(await responses(), [{ id: 7, result: { decision: "acceptForSession" } }]);
  await client.request("fixture/notify", { method: "serverRequest/resolved", params: { threadId: "thread-a", requestId: 7 } });
  const resolved = events.filter(event => event.kind === "resolved");
  assert.equal(resolved.length, 1);
  assert.deepEqual(resolved[0].bridgeApproval, request.bridgeApproval);
  assert.equal(events.some(event => event.method === "serverRequest/resolved"), false);
});

test("numeric and string IDs coexist; wrong-thread notification cannot expire another request", async t => {
  const { client, add, responses } = await fixture(t);
  const numeric = await add(command(8));
  const string = await add(command("8", "thread-b"));
  await client.request("fixture/notify", { method: "serverRequest/resolved", params: { threadId: "wrong", requestId: 8 } });
  assert.equal(client.approvals.size, 2);
  client.respond(numeric.id, { decision: "decline" }, numeric.bridgeApproval);
  assert.equal(client.getApproval(string.id, string.bridgeApproval).bridgeApproval, string.bridgeApproval);
  client.respond(string.id, { decision: "accept" }, string.bridgeApproval);
  assert.deepEqual(await responses(), [{ id: 8, result: { decision: "decline" } }, { id: "8", result: { decision: "accept" } }]);
});

test("restart invalidates pending and rejects old identity when the wire ID repeats", async t => {
  const { client, events, add, responses } = await fixture(t, { APPROVAL_TEST_LATE_STOP: "1" });
  const old = await add(command());
  const oldConnection = client.connection;
  const oldExit = once(client.child, "exit");
  const pending = assert.rejects(client.request("fixture/hang"), /stopped/);
  client.invalidateApprovals("manual_reconnect");
  client.stop();
  await client.start();
  const current = await add(command());
  await pending;
  assert.notEqual(current.bridgeApproval.connectionId, old.bridgeApproval.connectionId);
  assert.ok(current.approvalConnectionEpoch > old.approvalConnectionEpoch);
  assert.throws(() => client.respond(old.id, { decision: "accept" }, old.bridgeApproval), { code: "stale_request" });
  client.receive({ method: "serverRequest/resolved", params: { threadId: "thread-a", requestId: 7 } }, oldConnection);
  await oldExit;
  assert.equal(client.approvals.size, 1);
  assert.equal(events.some(event => event.id === "late-old"), false);
  assert.ok(events.findIndex(event => event.kind === "approval-invalidated") < events.findIndex(event => event.kind === "approval-connection" && event.connectionId === current.bridgeApproval.connectionId));
  assert.deepEqual(await responses(), []);
  client.respond(current.id, { decision: "decline" }, current.bridgeApproval);
  assert.equal((await responses()).length, 1);
});

test("same connection replacement requires a new nonce and never accepts the prior card", async t => {
  const { client, add, responses } = await fixture(t);
  const old = await add(command());
  await client.request("fixture/notify", { method: "serverRequest/resolved", params: { threadId: "thread-a", requestId: 7 } });
  const current = await add(command());
  assert.equal(current.bridgeApproval.connectionId, old.bridgeApproval.connectionId);
  assert.notEqual(current.bridgeApproval.instanceId, old.bridgeApproval.instanceId);
  assert.throws(() => client.respond(old.id, { decision: "accept" }, old.bridgeApproval), { code: "stale_request" });
  assert.deepEqual(await responses(), []);
  client.respond(current.id, { decision: "decline" }, current.bridgeApproval);
  assert.deepEqual(await responses(), [{ id: 7, result: { decision: "decline" } }]);
});

test("reconnect to a different client object rejects the old card against the replacement owner's same ID", async t => {
  const oldOwner = await fixture(t);
  const oldRequest = await oldOwner.add(command());
  oldOwner.client.invalidateApprovals("manual_reconnect");
  const snapshot = oldOwner.client.approvalSnapshot();
  assert.equal(snapshot.closed, true);
  assert.deepEqual(snapshot.pending, []);
  oldOwner.client.removeAllListeners();
  oldOwner.client.stop();
  const replacement = await fixture(t);
  const current = await replacement.add(command());
  assert.ok(current.approvalConnectionEpoch > oldRequest.approvalConnectionEpoch);
  const stale = respondToApproval(replacement.client, { id: oldRequest.id, expected: oldRequest.bridgeApproval, decision: "accept" });
  assert.equal(stale.error.code, "stale_request");
  assert.deepEqual(await replacement.responses(), []);
  assert.equal(replacement.client.getApproval(current.id, current.bridgeApproval).bridgeApproval, current.bridgeApproval);
  assert.equal(respondToApproval(replacement.client, { id: current.id, expected: current.bridgeApproval, decision: "decline" }).ok, true);
  assert.deepEqual(await replacement.responses(), [{ id: 7, result: { decision: "decline" } }]);
});

test("ambiguous same-thread reused-ID server resolution closes the connection rather than guessing", async t => {
  const { client, events, add, log } = await fixture(t);
  await add(command());
  await client.request("fixture/notify", { method: "serverRequest/resolved", params: { threadId: "thread-a", requestId: 7 } });
  const current = await add(command());
  await assert.rejects(client.request("fixture/notify", { method: "serverRequest/resolved", params: { threadId: "thread-a", requestId: 7 } }), /without its generation/);
  assert.equal(client.connection, null);
  assert.equal(client.approvals.size, 0);
  assert.equal(events.some(event => event.kind === "resolved" && event.bridgeApproval?.instanceId === current.bridgeApproval.instanceId), false);
  assert.equal(await fs.readFile(log, "utf8").catch(() => ""), "");
});

test("duplicate outstanding wire ID is a protocol conflict, not a pending-map overwrite", async t => {
  const { client, events, add } = await fixture(t);
  const first = await add(command());
  await assert.rejects(client.request("fixture/request", command(7, "other-thread")), /outstanding request ID/);
  assert.equal(client.connection, null);
  assert.equal(events.filter(event => event.kind === "request").length, 1);
  assert.equal(events[1].bridgeApproval.instanceId, first.bridgeApproval.instanceId);
});

test("resuming a thread replays its pending requests without disconnecting or replacing approval drafts", async t => {
  const { client, events, add, responses } = await fixture(t);
  const methods = ["item/commandExecution/requestApproval", "item/fileChange/requestApproval",
    "item/permissions/requestApproval", "item/tool/requestUserInput"];
  const requests = [];
  for (const [index, method] of methods.entries())
    requests.push(await add({ ...command(index), method }));
  const connection = client.connection;
  const snapshot = client.approvalSnapshot();
  const eventCount = events.length;
  const renderer = reduceApprovalTransport({ ...emptyApprovalTransport, approvals: [] }, events.at(-1));
  for (let i = 0; i < 3; i++) {
    await client.request("thread/resume", { threadId: "thread-a" });
    // An RPC after resume is a stdio barrier for the trailing replay messages.
    assert.deepEqual(await responses(), []);
  }
  assert.equal(client.connection, connection);
  assert.equal(events.length, eventCount);
  assert.deepEqual(client.approvalSnapshot(), snapshot);
  for (const request of requests)
    assert.equal(client.getApproval(request.id, request.bridgeApproval), request.approvalSnapshot.pending.at(-1));
  const refreshed = reduceApprovalTransport(renderer, { ...client.approvalSnapshot(), kind: "approval-snapshot" });
  refreshed.approvals.forEach((request, index) => assert.equal(request, renderer.approvals[index]));
  // Replays must not increment the generation history: normal server
  // resolution still works instead of tripping the reused-ID guard.
  await client.request("fixture/notify", { method: "serverRequest/resolved", params: { threadId: "thread-a", requestId: 0 } });
  for (const request of requests.slice(1)) client.respond(request.id, {}, request.bridgeApproval);
  assert.equal((await responses()).length, 3);
  assert.equal(client.approvals.size, 0);
  assert.equal(client.connection, connection);
});

test("identical replay ignores object-key order and untrusted envelope metadata", async t => {
  const { client, events, add, responses } = await fixture(t);
  const first = await add(command());
  await add({ id: 7, jsonrpc: "2.0", method: first.method,
    params: { command: "synthetic-only", itemId: "command", turnId: "turn-a", threadId: "thread-a" },
    bridgeApproval: { connectionId: "forged", instanceId: "forged" }, approvalRevision: 999 });
  assert.equal(events.filter(event => event.kind === "request").length, 1);
  assert.equal(client.approvalSnapshot().revision, 1);
  client.respond(first.id, { decision: "decline" }, first.bridgeApproval);
  assert.deepEqual(await responses(), [{ id: 7, result: { decision: "decline" } }]);
});

test("a replay during a response write preserves the sending lock and sends once", async t => {
  const { client, events, add, responses } = await fixture(t);
  const request = await add(command());
  const input = { id: request.id, expected: request.bridgeApproval, decision: "accept" };
  const send = client.send;
  client.send = function (message, connection) {
    if (!message.method) {
      this.receive(command(), connection);
      assert.equal(respondToApproval(this, input).error.code, "already_sending");
    }
    return send.call(this, message, connection);
  };
  assert.equal(respondToApproval(client, input).ok, true);
  client.send = send;
  assert.equal(events.filter(event => event.kind === "request").length, 1);
  assert.equal(client.approvals.size, 0);
  assert.deepEqual(await responses(), [{ id: 7, result: { decision: "accept" } }]);
});

test("same-ID requests with changed method or any approval payload still conflict", async t => {
  const original = { ...command(), params: { ...command().params,
    permissions: { fileSystem: { write: ["/original"] } } } };
  const changed = [
    { ...original, method: "item/fileChange/requestApproval" },
    ...[{ turnId: "other-turn" }, { itemId: "other-item" }, { command: "different-command" },
      { permissions: { fileSystem: { write: ["/different"] } } }]
      .map(params => ({ ...original, params: { ...original.params, ...params } })),
  ];
  for (const message of changed) await t.test(JSON.stringify(message), async t => {
    const { client, events, add } = await fixture(t);
    await add(original);
    await assert.rejects(client.request("fixture/request", message), /outstanding request ID/);
    assert.equal(client.connection, null);
    assert.equal(events.filter(event => event.kind === "request").length, 1);
  });
});

test("invalid response and pre-write failure keep the same request available for an explicit retry", async t => {
  const { client, add, responses } = await fixture(t);
  const request = await add(command());
  const input = { id: request.id, expected: request.bridgeApproval, decision: "accept" };
  assert.equal(respondToApproval(client, { ...input, decision: "always" }).error.code, "invalid_response");
  assert.equal(client.getApproval(request.id, request.bridgeApproval).bridgeApproval, request.bridgeApproval);
  const send = client.send;
  client.send = () => { throw new Error("synthetic pre-write failure"); };
  assert.equal(respondToApproval(client, input).error.code, "transport_error");
  client.send = send;
  assert.equal(client.getApproval(request.id, request.bridgeApproval).bridgeApproval, request.bridgeApproval);
  assert.deepEqual(await responses(), []);
  assert.equal(respondToApproval(client, input).ok, true);
  assert.equal((await responses()).length, 1);
});

test("an in-progress write locks out a reentrant duplicate before the response is resolved", async t => {
  const { client, add, responses } = await fixture(t);
  const request = await add(command());
  const input = { id: request.id, expected: request.bridgeApproval, decision: "accept" };
  const send = client.send;
  let duplicate;
  client.send = function (message, connection) {
    if (!message.method) duplicate = respondToApproval(this, input);
    return send.call(this, message, connection);
  };
  assert.equal(respondToApproval(client, input).ok, true);
  client.send = send;
  assert.equal(duplicate.error.code, "already_sending");
  assert.equal((await responses()).length, 1);
});

test("response mapper preserves actual file/session, permission/turn, and question answer payloads", async t => {
  const { client, add, responses } = await fixture(t);
  for (const [index, method] of ["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].entries()) {
    for (const [choice, decision] of ["accept", "decline", "acceptForSession"].entries()) {
      const request = await add({ ...command(`${index}-${choice}`), method });
      assert.equal(respondToApproval(client, { id: request.id, expected: request.bridgeApproval, decision }).ok, true);
    }
  }
  const permission = await add({ ...command("permission"), method: "item/permissions/requestApproval", params: { threadId: "thread-a", turnId: "turn-a", permissions: { network: { enabled: true } } } });
  assert.equal(respondToApproval(client, { id: permission.id, expected: permission.bridgeApproval, allow: "session" }).error.code, "invalid_response");
  assert.equal(respondToApproval(client, { id: permission.id, expected: permission.bridgeApproval, allow: true }).ok, true);
  const question = await add({ ...command("question"), method: "item/tool/requestUserInput", params: { threadId: "thread-a", turnId: "turn-a", questions: [{ id: "choice", options: [{ label: "First" }], isOther: false }] } });
  assert.equal(respondToApproval(client, { id: question.id, expected: question.bridgeApproval, answers: { wrong: { answers: ["First"] } } }).error.code, "invalid_response");
  assert.equal(client.approvals.size, 1);
  assert.equal(respondToApproval(client, { id: question.id, expected: question.bridgeApproval, answers: { choice: { answers: ["First"] } } }).ok, true);
  const output = await responses();
  assert.deepEqual(output.slice(0, 6).map(message => message.result.decision), ["accept", "decline", "acceptForSession", "accept", "decline", "acceptForSession"]);
  assert.deepEqual(output[6].result, { permissions: { network: { enabled: true } }, scope: "turn" });
  assert.deepEqual(output[7].result, { answers: { choice: { answers: ["First"] } } });
});

test("turn completion expires only requests for its own turn", async t => {
  const { client, events, add } = await fixture(t);
  const old = await add(command("old", "thread-a", "old-turn"));
  const current = await add(command("new", "thread-a", "new-turn"));
  await client.request("fixture/notify", { method: "turn/completed", params: { threadId: "thread-a", turn: { id: "old-turn" } } });
  assert.equal(client.getApproval(current.id, current.bridgeApproval).bridgeApproval, current.bridgeApproval);
  assert.throws(() => client.getApproval(old.id, old.bridgeApproval), { code: "stale_request" });
  assert.equal(events.filter(event => event.kind === "resolved").at(-1).reason, "turn_completed");
});

test("question IPC enforces this client's single-answer contract without changing the protocol's list shape", async t => {
  const { client, add, responses } = await fixture(t);
  const request = await add({
    ...command("single-answer"), method: "item/tool/requestUserInput",
    params: { threadId: "thread-a", turnId: "turn-a", questions: [{ id: "choice", options: [{ label: "First" }, { label: "Second" }], isOther: true }] },
  });
  const payload = { id: request.id, expected: request.bridgeApproval };
  for (const answers of [[], ["First", "Second"], ["First", "custom"]]) {
    assert.equal(respondToApproval(client, { ...payload, answers: { choice: { answers } } }).error.code, "invalid_response");
    assert.equal(client.getApproval(request.id, request.bridgeApproval).bridgeApproval, request.bridgeApproval);
  }
  assert.deepEqual(await responses(), []);
  assert.equal(respondToApproval(client, { ...payload, answers: { choice: { answers: ["custom"] } } }).ok, true);
  assert.deepEqual((await responses())[0].result, { answers: { choice: { answers: ["custom"] } } });
});

test("real stdio mutation snapshots repair missed earlier events without reviving resolved requests", async t => {
  const { client, events, add } = await fixture(t);
  const a = await add(command("A"));
  const delayedInit = structuredClone(client.approvalSnapshot());
  const b = await add(command("B", "thread-b"));
  let renderer = { ...emptyApprovalTransport, approvals: [] };
  renderer = reduceApprovalTransport(renderer, structuredClone(b));
  assert.deepEqual(renderer.approvals.map(request => request.id), ["A", "B"]);
  const retainedA = renderer.approvals[0];
  renderer = reduceApprovalTransport(renderer, { ...delayedInit, kind: "approval-snapshot" });
  assert.deepEqual(renderer.approvals.map(request => request.id), ["A", "B"]);
  assert.equal(renderer.approvals[0], retainedA);
  const c = await add(command("C", "thread-c"));
  renderer = reduceApprovalTransport(renderer, structuredClone(c));
  assert.equal(renderer.approvals[0], retainedA);
  const beforeResolution = structuredClone(client.approvalSnapshot());
  client.respond(a.id, { decision: "decline" }, a.bridgeApproval);
  const resolvedA = events.filter(event => event.kind === "resolved").at(-1);
  const freshRenderer = reduceApprovalTransport({ ...emptyApprovalTransport, approvals: [] }, structuredClone(resolvedA));
  assert.deepEqual(freshRenderer.approvals.map(request => request.id), ["B", "C"]);
  assert.equal(reduceApprovalTransport(freshRenderer, { ...beforeResolution, kind: "approval-snapshot" }), freshRenderer);
  assert.doesNotThrow(() => JSON.stringify(resolvedA));
  assert.equal(resolvedA.approvalSnapshot.pending.every(request => !Object.hasOwn(request, "approvalSnapshot")), true);
});

test("a real closed response pipe invalidates its approval without retrying or retaining a pending nonce", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "approval-pipe-test-"));
  await fs.writeFile(path.join(directory, "approval-fixture.marker"), "isolated-approval-test\n");
  const threads = Object.fromEntries(["approval-control", "pipe-thread"].map(id => [id, { id, name: id, cwd: directory, turns: [] }]));
  await fs.writeFile(path.join(directory, "fixture-threads.json"), JSON.stringify({ next: 0, threads }));
  const client = new CodexClient({ binary: new URL("./fixtures/approval-server.cjs", import.meta.url).pathname, env: { CODE_DESKTOP_DATA: directory }, shutdownTimeout: 80 });
  const events = [];
  client.on("event", event => events.push(event));
  t.after(async () => { await client.stopAndWait(); await fs.rm(directory, { recursive: true, force: true }); });
  await client.start();
  await client.request("thread/resume", { threadId: "approval-control" });
  const control = params => client.request("turn/start", { threadId: "approval-control", input: [{ type: "text", text: "APPROVAL_TEST:" + JSON.stringify(params) }] });
  await control({ op: "emit", request: command("pipe-request", "pipe-thread", "pipe-turn") });
  const request = client.approvalSnapshot().pending[0];
  await control({ op: "break-stdin" });
  const wait = async predicate => {
    const deadline = Date.now() + 3000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(predicate());
  };
  await wait(() => events.some(event => event.method === "fixture/stdin-closed"));
  const result = respondToApproval(client, { id: request.id, expected: request.bridgeApproval, decision: "decline" });
  assert.ok(result.ok || result.error.code === "transport_error");
  await wait(() => client.connection === null);
  assert.equal(client.approvalSnapshot().closed, true);
  assert.deepEqual(client.approvalSnapshot().pending, []);
  assert.equal(events.filter(event => event.kind === "approval-invalidated" && event.connectionId === request.bridgeApproval.connectionId).length, 1);
  assert.equal(await fs.readFile(path.join(directory, "approval-responses.jsonl"), "utf8").catch(() => ""), "");
  assert.equal((await fs.readFile(path.join(directory, "approval-processes.jsonl"), "utf8")).trim().split("\n").length, 1);
  await client.start();
  assert.deepEqual(client.approvalSnapshot().pending, []);
});

test("question IPC accepts an omitted (skipped) question key but still validates every present key", async t => {
  // Skip (approval-current.js:7997-8008) omits the key; ToolRequestUserInputResponse keys are optional.
  const { client, add, responses } = await fixture(t);
  const params = { threadId: "thread-a", turnId: "turn-a", questions: [
    { id: "choice", options: [{ label: "First" }], isOther: false }, { id: "notes", options: [], isOther: false }] };
  const partial = await add({ ...command("skip-partial"), method: "item/tool/requestUserInput", params });
  const payload = { id: partial.id, expected: partial.bridgeApproval };
  for (const answers of [{ notes: { answers: [] } }, { notes: undefined }, { choice: { answers: ["Invented"] } }, { notes: { answers: ["x"] }, extra: { answers: ["x"] } }])
    assert.equal(respondToApproval(client, { ...payload, answers }).error.code, "invalid_response");
  assert.deepEqual(await responses(), []);
  assert.equal(respondToApproval(client, { ...payload, answers: { notes: { answers: ["Only notes"] } } }).ok, true);
  const all = await add({ ...command("skip-all"), method: "item/tool/requestUserInput", params });
  assert.equal(respondToApproval(client, { id: all.id, expected: all.bridgeApproval, answers: {} }).ok, true);
  assert.deepEqual((await responses()).map(message => message.result), [{ answers: { notes: { answers: ["Only notes"] } } }, { answers: {} }]);
});

test("R07 question IPC: the plan card's revise pair and codeDesktop.afterPlan, and the dismiss marker, reach the server unchanged", async t => {
  const { client, add, responses } = await fixture(t);
  const { planReviewResponse, dismissQuestionPayload, QUESTION_DISMISSED_ANSWER } = await import("../src/approval-draft-model.mjs");
  const review = { threadId: "thread-a", turnId: "turn-a", itemId: "call-plan", questions: [{ id: "plan-review", header: "Plan review",
    question: "Approve this plan and leave plan mode?", isOther: true, isSecret: false, options: [{ label: "Approve" }, { label: "Keep planning" }] }] };
  const revise = await add({ ...command("plan-revise"), method: "item/tool/requestUserInput", params: review });
  assert.equal(respondToApproval(client, { id: revise.id, expected: revise.bridgeApproval, ...planReviewResponse("revise", { feedback: "Split it" }) }).ok, true);
  const accept = await add({ ...command("plan-accept"), method: "item/tool/requestUserInput", params: review });
  assert.equal(respondToApproval(client, { id: accept.id, expected: accept.bridgeApproval, answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "plan" } }).error.code, "invalid_response");
  // Bypass is a valid plan target here; main.cjs's "respond" validates the opt-in and requirements before this runs.
  assert.match(await fs.readFile(new URL("../electron/main.cjs", import.meta.url), "utf8"), /afterPlan === "bypass"[\s\S]{0,200}validateBypassRequest/);
  assert.equal(respondToApproval(client, { id: accept.id, expected: accept.bridgeApproval, ...planReviewResponse("primary", { target: "acceptEdits" }) }).ok, true);
  const question = { threadId: "thread-a", turnId: "turn-a", questions: [{ id: "choice", question: "Pick", options: [{ label: "First" }], isOther: true },
    { id: "notes", question: "Why?", options: null, isOther: false }] };
  const asked = await add({ ...command("dismissed"), method: "item/tool/requestUserInput", params: question });
  assert.equal(respondToApproval(client, { id: asked.id, expected: asked.bridgeApproval, ...dismissQuestionPayload({ ...asked, params: question }) }).ok, true);
  const output = await responses();
  assert.deepEqual(output.map(message => message.result), [
    { answers: { "plan-review": { answers: ["Keep planning", "Split it"] } } },
    { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "acceptEdits" } },
    { answers: { choice: { answers: [QUESTION_DISMISSED_ANSWER] }, notes: { answers: [QUESTION_DISMISSED_ANSWER] } } },
  ]);
});

test("protocol-conflict refusals name the running core (coreName option), not a fixed DeepSeek", async () => {
  const { ApprovalLedger, ApprovalTransportError } = createRequire(import.meta.url)("../electron/approval-transport.cjs");
  const connection = { approvalConnectionId: "c1", approvalConnectionEpoch: 1, closed: false };
  const ledger = new ApprovalLedger(() => {}, { coreName: () => "Kimi" });
  ledger.activate(connection);
  ledger.register({ id: 7, method: "item/commandExecution/requestApproval", params: { threadId: "t", turnId: "u", command: "ls" } }, connection);
  assert.throws(() => ledger.register({ id: 7, method: "item/commandExecution/requestApproval", params: { threadId: "t", turnId: "u", command: "rm" } }, connection),
    (error) => error instanceof ApprovalTransportError && error.code === "approval_protocol_conflict" && error.message === "Kimi reused an outstanding request ID. Reconnect to continue.");
  // Without the option the chosen core names it (codex.cjs clientCoreName), still through t().
  const plain = new ApprovalLedger(() => {});
  plain.activate(connection);
  plain.register({ id: 1, method: "item/fileChange/requestApproval", params: { threadId: "t", turnId: "u" } }, connection);
  plain.register({ id: 1, method: "item/fileChange/requestApproval", params: { threadId: "t", turnId: "u" } }, connection);
  assert.throws(() => plain.register({ id: 1, method: "item/fileChange/requestApproval", params: { threadId: "t", turnId: "v" } }, connection), /^ApprovalTransportError: \S+ reused an outstanding request ID\. Reconnect to continue\.$/);
});
