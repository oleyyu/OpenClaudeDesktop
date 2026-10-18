import test from "node:test";
import assert from "node:assert/strict";
import {
  TURNS_PAGE_LIMIT, isLegacyHistory, historyRoute, resumeParams, readParams, forkParams,
  turnsListParams, itemsListParams, mergeTurnPages, applyItemEntries, loadThreadHistory, historyMissing,
} from "../src/thread-history-model.mjs";

const overrides = { threadId: "a", approvalPolicy: "on-request", sandbox: "workspace-write", approvalsReviewer: "user" };
const turn = (id, items, extra = {}) => ({ id, status: "completed", itemsView: "full", items, ...extra });
const item = (id, type = "agentMessage") => ({ id, type, text: id });

function recorder(handlers) {
  const calls = [];
  const rpc = async (method, params) => {
    calls.push({ method, params });
    const handler = handlers[method];
    if (!handler) throw Object.assign(new Error(`unexpected ${method}`), { code: -32601 });
    return handler(params, calls.filter(entry => entry.method === method).length - 1);
  };
  return { rpc, calls };
}

test("only historyMode legacy keeps the deprecated full-history request shape", () => {
  assert.equal(isLegacyHistory({ historyMode: "legacy" }), true);
  assert.equal(isLegacyHistory({ historyMode: "paginated" }), false);
  assert.equal(isLegacyHistory(undefined), false);
  assert.deepEqual(resumeParams(overrides, { historyMode: "legacy" }), overrides);
  assert.deepEqual(resumeParams(overrides, { historyMode: "paginated" }), {
    ...overrides, excludeTurns: true, initialTurnsPage: { limit: TURNS_PAGE_LIMIT, sortDirection: "desc", itemsView: "full" },
  });
  // An unknown history mode takes the paginated route: it never emits a notice
  // and thread/turns/list answers a legacy thread too.
  assert.equal(resumeParams(overrides, undefined).excludeTurns, true);
  assert.deepEqual(readParams("a", { historyMode: "legacy" }), { threadId: "a", includeTurns: true });
  assert.deepEqual(readParams("a", { historyMode: "paginated" }), { threadId: "a", includeTurns: false });
  assert.deepEqual(readParams("a", undefined), { threadId: "a", includeTurns: false });
  assert.deepEqual(forkParams({ threadId: "a", lastTurnId: "t" }, { historyMode: "legacy" }), { threadId: "a", lastTurnId: "t" });
  assert.deepEqual(forkParams({ threadId: "a", lastTurnId: "t" }, { historyMode: "paginated" }), { threadId: "a", lastTurnId: "t", excludeTurns: true });
});

test("page params match the Codex request shapes", () => {
  assert.deepEqual(turnsListParams("a", null), { threadId: "a", limit: TURNS_PAGE_LIMIT, sortDirection: "desc", itemsView: "full" });
  assert.deepEqual(turnsListParams("a", "c1", { pageLimit: 5, itemsView: "summary" }), { threadId: "a", limit: 5, sortDirection: "desc", itemsView: "summary", cursor: "c1" });
  assert.deepEqual(itemsListParams("a", "t1", null, { pageLimit: 7 }), { threadId: "a", turnId: "t1", limit: 7, sortDirection: "asc" });
  assert.deepEqual(itemsListParams("a", null, "c2", { pageLimit: 7 }), { threadId: "a", limit: 7, sortDirection: "asc", cursor: "c2" });
});

test("descending pages merge into one ascending transcript with repeats collapsed", () => {
  const merged = mergeTurnPages([
    { data: [turn("t5", []), turn("t4", [])] },
    { data: [turn("t4", []), turn("t3", [])] },
    { data: [] },
    null,
  ]);
  assert.deepEqual(merged.map(entry => entry.id), ["t3", "t4", "t5"]);
});

test("item entries fold onto their turn and mark it full", () => {
  const turns = [turn("t1", [], { itemsView: "summary" }), turn("t2", [item("b")])];
  const applied = applyItemEntries(turns, [
    { turnId: "t1", item: item("a1") },
    { turnId: "t1", item: item("a2") },
    { turnId: "missing", item: item("x") },
    { turnId: "t1" },
  ]);
  assert.deepEqual(applied[0].items.map(entry => entry.id), ["a1", "a2"]);
  assert.equal(applied[0].itemsView, "full");
  assert.equal(applied[1], turns[1], "an untouched turn keeps its identity");
});

test("the route the request was built from decides hydration, not the response thread", async () => {
  // A session whose stored metadata predates historyMode routes its request
  // down the paginated path (includeTurns:false / excludeTurns:true). If the
  // server then answers historyMode "legacy", re-deriving the branch from that
  // response would return thread.turns - which the request emptied - and the
  // transcript would silently render blank. The caller's route wins.
  assert.equal(historyRoute(undefined), "paginated");
  assert.equal(historyRoute({}), "paginated");
  assert.equal(historyRoute({ historyMode: "legacy" }), "legacy");
  assert.equal(historyRoute({ historyMode: "paginated" }), "paginated");
  assert.deepEqual(readParams("a", undefined), { threadId: "a", includeTurns: false });
  const { rpc, calls } = recorder({ "thread/turns/list": () => ({ data: [turn("t1", [item("a")])], nextCursor: null }) });
  const served = { historyMode: "legacy", turns: [] };
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: served, route: historyRoute(undefined) });
  assert.equal(result.mode, "paginated");
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1"]);
  assert.equal(calls.length, 1);
});

test("a legacy route hydrates from the response even if the server reports paginated", async () => {
  // The mirror image: the request was built for a legacy thread, so it carries
  // the turns and no pager must be called.
  const { rpc, calls } = recorder({});
  const result = await loadThreadHistory(rpc, { threadId: "a", route: "legacy",
    thread: { historyMode: "paginated", turns: [turn("t1", [item("x")])] } });
  assert.equal(result.mode, "legacy");
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1"]);
  assert.deepEqual(calls, []);
});

test("a legacy thread is hydrated from the response with no pager calls", async () => {
  const { rpc, calls } = recorder({});
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "legacy", turns: [turn("t1", [item("x")])] } });
  assert.equal(result.mode, "legacy");
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1"]);
  assert.deepEqual(calls, []);
});

test("a paginated thread uses the resume page and follows nextCursor to the oldest turn", async () => {
  const pages = [
    { data: [turn("t4", [item("d")]), turn("t3", [item("c")])], nextCursor: "c1", backwardsCursor: "b0" },
    { data: [turn("t2", [item("b")])], nextCursor: "c2", backwardsCursor: "b1" },
    { data: [turn("t1", [item("a")])], nextCursor: null, backwardsCursor: "b2" },
  ];
  const { rpc, calls } = recorder({ "thread/turns/list": (params, index) => { assert.equal(params.cursor, index === 0 ? "c1" : "c2"); return pages[index + 1]; } });
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" }, initialPage: pages[0] });
  assert.equal(result.mode, "paginated");
  assert.equal(result.turnPages, 3);
  assert.equal(result.truncated, false);
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1", "t2", "t3", "t4"]);
  assert.equal(calls.length, 2, "the resume page saves the first request");
});

test("without a resume page the first turns/list request is made", async () => {
  const { rpc, calls } = recorder({ "thread/turns/list": () => ({ data: [turn("t1", [item("a")])], nextCursor: null, backwardsCursor: null }) });
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" } });
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1"]);
  assert.deepEqual(calls[0], { method: "thread/turns/list", params: { threadId: "a", limit: TURNS_PAGE_LIMIT, sortDirection: "desc", itemsView: "full" } });
});

test("a turn the server did not return in full is completed through thread/items/list", async () => {
  const itemPages = [
    { data: [{ turnId: "t1", item: item("a1") }], nextCursor: "i1", backwardsCursor: null },
    { data: [{ turnId: "t1", item: item("a2") }], nextCursor: null, backwardsCursor: null },
  ];
  const { rpc, calls } = recorder({ "thread/items/list": (params, index) => { assert.equal(params.turnId, "t1"); return itemPages[index]; } });
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" },
    initialPage: { data: [turn("t2", [item("b")]), turn("t1", [], { itemsView: "summary" })], nextCursor: null } });
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1", "t2"]);
  assert.deepEqual(result.turns[0].items.map(entry => entry.id), ["a1", "a2"]);
  assert.equal(result.turns[0].itemsView, "full");
  assert.equal(result.itemPages, 2);
  assert.equal(calls.length, 2);
});

test("a server that cannot page reports empty history instead of failing the open", async () => {
  const notSupported = () => { throw Object.assign(new Error("list_turns is not supported yet"), { code: -32601 }); };
  const { rpc } = recorder({ "thread/turns/list": notSupported });
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" } });
  assert.deepEqual(result.turns, []);
  assert.equal(result.unavailable, "list_turns is not supported yet");
});

test("a legacy thread's -32601 on thread/items/list leaves the summary turn as it came", async () => {
  const { rpc } = recorder({ "thread/items/list": () => { throw Object.assign(new Error("thread/items/list is not supported yet"), { code: -32601 }); } });
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" },
    initialPage: { data: [turn("t1", [], { itemsView: "summary" })], nextCursor: null } });
  assert.deepEqual(result.turns.map(entry => entry.id), ["t1"]);
  assert.deepEqual(result.turns[0].items, []);
});

test("a real transport failure is not swallowed", async () => {
  const { rpc } = recorder({ "thread/turns/list": () => { throw Object.assign(new Error("DeepSeek stopped."), { code: -32000 }); } });
  await assert.rejects(() => loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" } }), /DeepSeek stopped\./);
});

test("a cursor that never terminates is stopped by the page cap", async () => {
  let served = 0;
  const { rpc } = recorder({ "thread/turns/list": () => { served += 1; return { data: [turn(`t${served}`, [])], nextCursor: "loop" }; } });
  const result = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" }, maxPages: 4 });
  assert.equal(result.turnPages, 4);
  assert.equal(result.truncated, true);
  assert.equal(served, 4);
});

test("cov2-05: a fresh session with no rollout stays empty; only a thread with a recorded first message counts as missing", async () => {
  const notSupported = () => { throw Object.assign(new Error("list_turns is not supported yet"), { code: -32601 }); };
  const { rpc } = recorder({ "thread/turns/list": notSupported });
  const history = await loadThreadHistory(rpc, { threadId: "a", thread: { historyMode: "paginated" } });
  // thread/start then navigate: nothing sent, preview empty → "No messages yet", never "Session not found on disk".
  assert.equal(historyMissing(history, { id: "a", preview: "" }, { id: "a", preview: "" }), false);
  assert.equal(historyMissing(history, undefined, { id: "a" }), false);
  assert.equal(historyMissing(history, { id: "a", preview: "   " }), false);
  // The core recorded a first message yet can list no turns: the transcript is gone.
  assert.equal(historyMissing(history, { id: "a", preview: "fix the build" }, { id: "a", preview: "" }), true);
  assert.equal(historyMissing(history, null, { id: "a", preview: "fix the build" }), true);
  // History that loaded is never missing, whatever the preview says.
  assert.equal(historyMissing({ turns: [], mode: "paginated" }, { id: "a", preview: "fix the build" }), false);
  assert.equal(historyMissing(null, { id: "a", preview: "x" }), false);
});
