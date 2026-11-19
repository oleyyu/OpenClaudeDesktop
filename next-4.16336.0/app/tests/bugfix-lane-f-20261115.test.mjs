// bugcheck-20261115 lane F: regression tests for §55 (Codex mcp keyPath), §50 (Browser tools off closes live CDP),
// §63 (editing another core's task) and §64 (a scheduled fire counts only when its turn started).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { captureRoutineOptions } from "../electron/routine-runner.mjs";
const require = createRequire(import.meta.url);
const { createCustomizeOperations } = require("../electron/customize-operations.cjs");
const { createCdpProxy } = require("../electron/devtools-mcp/cdp-proxy.cjs");
const { createScheduleService } = require("../electron/schedule-service.cjs");
const { createWorkflowToolService } = require("../electron/workflow-tool-service.cjs");

function mcpOps(engine) {
  const requests = [];
  const client = { start: async () => {}, serverInfo: engine ? { engine } : undefined, request: async (method, params) => { requests.push({ method, params }); return {}; } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [], archivedThreadIds: [] }), knownCwd: (cwd) => cwd });
  return { ops, requests };
}

test("§55 Codex: a connector name with a dot is one quoted TOML key for mcp-add and mcp-remove", async () => {
  const { ops, requests } = mcpOps(undefined);
  await ops.run({ operation: "mcp-remove", name: "my.server" });
  assert.equal(requests.at(-2).params.edits[0].keyPath, 'mcp_servers."my.server"');
  await ops.run({ operation: "mcp-remove", name: "github.env" });
  assert.equal(requests.at(-2).params.edits[0].keyPath, 'mcp_servers."github.env"', "never the github server's env subtable");
  await ops.run({ operation: "mcp-add", name: "a.b", command: "node" });
  assert.deepEqual(requests.at(-2).params.edits, [{ keyPath: 'mcp_servers."a.b"', value: { command: "node" }, mergeStrategy: "upsert" }]);
  await ops.run({ operation: "mcp-remove", name: "plain_name-1" });
  assert.equal(requests.at(-2).params.edits[0].keyPath, "mcp_servers.plain_name-1", "a bare key stays as it was");
});

test("§55 a bridge core still gets the raw name (it reads everything after mcp_servers.)", async () => {
  const { ops, requests } = mcpOps("opencode");
  await ops.run({ operation: "mcp-remove", name: "my.server" });
  assert.equal(requests.at(-2).params.edits[0].keyPath, "mcp_servers.my.server");
});

test("§50 turning Browser tools off closes a CDP connection already open through the proxy", async () => {
  let enabled = true; const calls = [];
  const contents = { id: 1, once() {}, isDestroyed: () => false, getURL: () => "http://localhost:5173/", getTitle: () => "dev", getUserAgent: () => "UA",
    debugger: { isAttached: () => true, async sendCommand(method) { calls.push(method);
      if (method === "Target.getTargetInfo") return { targetInfo: { targetId: "REALPAGE" } };
      if (method === "Target.attachToTarget") return { sessionId: "PAGESESS" };
      return {}; } } };
  const host = { targets: () => [{ key: "tab1", sessionId: "s1", contents, active: true }], onChange: () => () => {}, onMessage: () => () => {},
    checkNavigation() {}, activate() {}, close() {}, async create() { return "tab1"; }, enabled: () => enabled };
  const proxy = createCdpProxy({ host, logger: { warn() {} } });
  const { wsEndpoint } = await proxy.start();
  try {
    const ws = new WebSocket(wsEndpoint); let n = 0; const pending = new Map();
    ws.onmessage = (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
    const closed = new Promise((resolve) => { ws.onclose = (event) => resolve(event.code); });
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const send = (method, params = {}, sessionId) => new Promise((resolve) => { const id = ++n; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    await send("Target.getTargets");
    const attached = await send("Target.attachToTarget", { targetId: "REALPAGE", flatten: true });
    assert.equal(attached.result.sessionId, "PAGESESS");
    enabled = false;
    ws.send(JSON.stringify({ id: 99, method: "Runtime.evaluate", params: { expression: "1" }, sessionId: "PAGESESS" }));
    assert.equal(await closed, 1008);
    assert.ok(!calls.includes("Runtime.evaluate"), "the command never reached the page");
    assert.ok(calls.includes("Target.detachFromTarget"), "the page session was released");
    assert.equal(proxy.clientCount, 0);
  } finally { proxy.stop(); }
});

test("§50 an idle connection is closed too once the tools are off", async () => {
  let enabled = true;
  const host = { targets: () => [], onChange: () => () => {}, onMessage: () => () => {}, checkNavigation() {}, activate() {}, close() {}, async create() { return "x"; }, enabled: () => enabled };
  const proxy = createCdpProxy({ host, logger: { warn() {} } });
  const { wsEndpoint } = await proxy.start();
  try {
    const ws = new WebSocket(wsEndpoint);
    const closed = new Promise((resolve) => { ws.onclose = (event) => resolve(event.code); });
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    enabled = false;
    assert.equal(await closed, 1008);
  } finally { proxy.stop(); }
});

test("§63 a task saved for another core keeps its options when the edit sends them back unchanged", () => {
  const previous = { coreId: "deepseek", model: "deepseek-chat", effort: null, permission: "auto", networkAccess: false };
  const args = { config: { model: "kimi-k2" }, coreId: "kimi", models: [{ model: "kimi-k2" }], previous };
  assert.equal(captureRoutineOptions({ ...args, execution: { model: "deepseek-chat", permission: "auto" } }), previous);
  assert.equal(captureRoutineOptions({ ...args, execution: undefined }), previous);
  assert.throws(() => captureRoutineOptions({ ...args, execution: { model: "kimi-k2", permission: "auto" } }), /Switch to deepseek/);
  assert.throws(() => captureRoutineOptions({ ...args, execution: { model: "deepseek-chat", permission: "plan" } }), /Switch to deepseek/);
});

test("§64 a CronCreate fire counts only when its turn started, and its prompt is never queued in copies", async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lane-f-cron-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const config = { threadIds: ["DS-THREAD"] };
  let connected = "deepseek"; const turns = []; const events = [];
  const service = createWorkflowToolService({ workflowService: { list: async () => [] }, getConfig: () => config, updateConfig: () => {}, settings: () => ({}), dataRoot: tmp, home: tmp,
    requestApproval: async () => false,
    startTurn: async (threadId, params) => { if (connected !== "deepseek") throw new Error(`thread not found: ${threadId}`); turns.push(params.input.map((item) => item.text)); } });
  const warn = console.warn; console.warn = () => {};
  t.after(() => { console.warn = warn; });
  await service.turnStart({ threadId: "DS-THREAD", input: [{ type: "text", text: "set up the loop" }], model: "deepseek-chat" });
  service.observe?.({ method: "turn/completed", params: { threadId: "DS-THREAD", turn: { id: "t1", status: "completed" } } });
  let clock = Date.now();
  const schedules = createScheduleService({
    deliver: (threadId, prompt) => !config.threadIds.includes(threadId) ? "gone" : service.notice(threadId, { prompt }),
    isIdle: (threadId) => service.idle(threadId), emit: (event) => events.push(event), now: () => clock, setTimer: () => ({}), clearTimer: () => {} });
  const job = schedules.create("DS-THREAD", { cron: "*/10 * * * *", prompt: "check CI" });
  connected = "codex";
  for (let i = 0; i < 6; i += 1) { clock += 10 * 60e3; await schedules.tick(job.id); }
  assert.equal(turns.length, 0);
  assert.equal(schedules.list("DS-THREAD")[0].fired, 0, "no fire is counted while no turn starts");
  assert.equal(service.pendingFor("DS-THREAD").length, 0, "the prompt is not queued in copies");
  connected = "deepseek";
  clock += 10 * 60e3; await schedules.tick(job.id);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].length, 1, "one copy of the prompt in that turn");
  assert.equal(schedules.list("DS-THREAD")[0].fired, 1);
});

test("§64 a Monitor notification still waits for the session's next turn (true, kept in the queue)", async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lane-f-notice-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const service = createWorkflowToolService({ workflowService: { list: async () => [] }, getConfig: () => ({ threadIds: ["T"] }), updateConfig: () => {}, settings: () => ({}), dataRoot: tmp, home: tmp,
    requestApproval: async () => false, startTurn: async () => {} });
  assert.equal(await service.notice("T", { prompt: "no turn yet" }), false, "a prompt with no turn to ride on is not delivered");
  assert.equal(service.pendingFor("T").length, 0);
  assert.equal(await service.notice("T", { notification: "<task-notification>x</task-notification>" }), true);
  assert.equal(service.pendingFor("T").length, 1);
});
