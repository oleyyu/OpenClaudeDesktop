import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { once } from "node:events";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const { CodexClient, stopAllCodexClients } = require("../electron/codex.cjs");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fixture(t, extra = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codex-client-test-"));
  const binary = path.join(directory, "protocol-server.cjs");
  const log = path.join(directory, "starts.jsonl");
  await fs.writeFile(binary, `#!${process.execPath}
const fs = require('node:fs');
const readline = require('node:readline');
const send = message => process.stdout.write(JSON.stringify(message) + '\\n');
fs.appendFileSync(process.env.FIXTURE_LOG, JSON.stringify({ pid: process.pid, cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');
if (['ignore', 'ignore-ready'].includes(process.env.FIXTURE_MODE)) process.on('SIGTERM', () => {});
if (process.env.FIXTURE_MODE === 'ignore-ready') setInterval(() => {}, 1000);
if (process.env.FIXTURE_MODE === 'delayed-stop') process.on('SIGTERM', () => {
  setTimeout(() => send({ method: 'fixture/late', params: { pid: process.pid } }), 25);
  setTimeout(() => send({ id: 'old-approval', method: 'fixture/approval', params: {} }), 30);
  setTimeout(() => process.exit(0), 180);
});
readline.createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (!message.method || message.id === undefined) return;
  if (message.method === 'initialize') {
    if (process.env.FIXTURE_MODE === 'ignore') return;
    if (process.env.FIXTURE_MODE === 'error') {
      send({ id: message.id, error: { message: 'Fixture initialize failed' } }); return;
    }
    setTimeout(() => send({ id: message.id, result: { pid: process.pid, cwd: process.cwd() } }), Number(process.env.FIXTURE_INITIALIZE_DELAY || 0));
    return;
  }
  if (message.method === 'hang') return;
  if (message.method === 'crash') { process.exit(23); return; }
  if (message.method === 'approval') send({ id: 'test-approval', method: 'fixture/approval', params: {} });
  const reply = () => send({ id: message.id, result: { pid: process.pid, serverCwd: process.cwd(), params: message.params } });
  if (message.method === 'delayed') setTimeout(reply, 350); else reply();
});
`, { mode: 0o755 });
  const client = new CodexClient({ binary, initializeTimeout: 2000, shutdownTimeout: 80,
    ...extra, env: { FIXTURE_LOG: log, ...extra.env } });
  const children = new Set();
  const originalStart = client.start.bind(client);
  const start = () => {
    const promise = originalStart();
    queueMicrotask(() => { if (client.child) children.add(client.child); });
    return promise;
  };
  t.after(async () => {
    client.stop();
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit").catch(() => {});
        child.kill("SIGKILL");
        await exited;
      }
    }
    await fs.rm(directory, { recursive: true, force: true });
  });
  return { client, directory, binary, log, start };
}

test("app-server uses stable home cwd; concurrent starts share one process and RPC cwd remains explicit", { timeout: 10000 }, async (t) => {
  const { client, start, log } = await fixture(t, { cwd: "/nonexistent/Documents/selected-workspace" });
  const first = start(), second = start(), third = start();
  assert.equal(first, second);
  assert.equal(first, third);
  const [result] = await Promise.all([first, second, third]);
  assert.equal(await fs.realpath(result.cwd), await fs.realpath(os.homedir()));
  const records = (await fs.readFile(log, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].args, ["app-server", "--stdio"]);
  for (const method of ["thread/start", "thread/resume", "turn/start"]) {
    const params = { cwd: "/selected/workspace", threadId: "task" };
    const response = await client.request(method, params);
    assert.deepEqual(response.params, params);
    assert.equal(response.pid, result.pid);
  }
});

test("explicit serverCwd controls only the app-server base directory", { timeout: 10000 }, async (t) => {
  const { client, start, directory } = await fixture(t);
  client.options.serverCwd = directory;
  const result = await start();
  assert.equal(await fs.realpath(result.cwd), await fs.realpath(directory));
});

test("initialize rejection clears process, pending requests and ready state before retry", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { env: { FIXTURE_MODE: "error" } });
  const statuses = [];
  client.on("status", (status) => statuses.push(status));
  const initializing = start();
  const rejected = assert.rejects(initializing, /Fixture initialize failed/);
  await Promise.resolve();
  const child = client.child, exited = once(child, "exit");
  await rejected;
  assert.equal(client.child, null);
  assert.equal(client.ready, null);
  assert.equal(client.pending.size, 0);
  await exited;
  client.options.env.FIXTURE_MODE = "normal";
  const replacement = await start();
  assert.notEqual(replacement.pid, child.pid);
  assert.deepEqual(statuses.map((status) => status.connected), [false, true]);
});

test("initialize timeout terminates even a child that ignores SIGTERM", { timeout: 10000 }, async (t) => {
  const { client, start, log } = await fixture(t, { initializeTimeout: 1500, shutdownTimeout: 50, env: { FIXTURE_MODE: "ignore" } });
  const initializing = start();
  const rejected = assert.rejects(initializing, /initialize timed out/);
  await Promise.resolve();
  const child = client.child, exited = once(child, "exit");
  await rejected;
  assert.equal(client.child, null);
  assert.equal(client.ready, null);
  assert.equal(client.pending.size, 0);
  const [, signal] = await exited;
  assert.equal(signal, "SIGKILL");
  assert.ok((await fs.readFile(log, "utf8")).includes(String(child.pid)));
});

test("spawn failure rejects and allows a later successful start", { timeout: 10000 }, async (t) => {
  const { client, start, binary, directory } = await fixture(t);
  client.options.binary = path.join(directory, "missing-server");
  await assert.rejects(start(), /ENOENT/);
  assert.equal(client.child, null);
  assert.equal(client.pending.size, 0);
  client.options.binary = binary;
  assert.ok((await start()).pid);
});

test("stop/start ignores old exit and output, preserving replacement pending RPCs", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { shutdownTimeout: 1000, env: { FIXTURE_MODE: "delayed-stop" } });
  await start();
  await client.request("approval");
  assert.equal(client.approvals.size, 1);
  const pending = assert.rejects(client.request("hang"), /DeepSeek stopped/);
  const oldChild = client.child, oldExited = once(oldChild, "exit");
  const events = [], statuses = [];
  client.on("event", (event) => events.push(event));
  client.on("status", (status) => statuses.push(status));
  client.stop();
  const replacementPromise = start();
  const replacement = await replacementPromise;
  const delayed = client.request("delayed", { marker: "replacement" });
  await pending;
  await oldExited;
  assert.equal(client.child.pid, replacement.pid);
  assert.equal(client.ready, replacementPromise);
  assert.equal(client.approvals.size, 0);
  assert.equal((await delayed).params.marker, "replacement");
  assert.deepEqual(events.filter(event => !["approval-connection", "approval-invalidated"].includes(event.kind)), []);
  assert.deepEqual(statuses.map((status) => status.connected), [true]);
});

test("stop while initializing cannot let the old rejection clear a replacement start", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { env: { FIXTURE_INITIALIZE_DELAY: "500" } });
  const initializing = start();
  const rejected = assert.rejects(initializing, /DeepSeek stopped/);
  await Promise.resolve();
  const oldChild = client.child;
  client.stop();
  client.options.env.FIXTURE_INITIALIZE_DELAY = "0";
  const replacementPromise = start();
  await rejected;
  const result = await replacementPromise;
  assert.notEqual(result.pid, oldChild.pid);
  assert.equal(client.ready, replacementPromise);
  assert.equal((await client.request("echo")).pid, result.pid);
});

test("unexpected exit rejects pending RPCs and emits one disconnect before restart", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t);
  await start();
  const statuses = [];
  client.on("status", (status) => statuses.push(status));
  const pending = assert.rejects(client.request("hang"), /disconnected/);
  await assert.rejects(client.request("crash"), /disconnected/);
  await pending;
  assert.equal(client.pending.size, 0);
  assert.equal(client.child, null);
  assert.equal(client.ready, null);
  assert.deepEqual(statuses.map((status) => status.connected), [false]);
  await start();
  await pause(20);
  assert.deepEqual(statuses.map((status) => status.connected), [false, true]);
});

test("stopAndWait is shared and waits for SIGKILL of an initialized SIGTERM-resistant child", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { env: { FIXTURE_MODE: "ignore-ready" } });
  const { pid } = await start();
  const pending = assert.rejects(client.request("hang"), /DeepSeek stopped/);
  const first = client.stopAndWait(), second = client.stopAndWait();
  assert.equal(first, second);
  assert.equal(client.connection, null);
  const result = await first;
  await pending;
  assert.equal(result.exited, true);
  assert.deepEqual(result.children.map((child) => [child.pid, child.forced, child.signal, child.timedOut]), [[pid, true, "SIGKILL", false]]);
  assert.equal(client.connections.size, 0);
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

test("stopAndWait includes older detached connections without delaying a replacement start", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { shutdownTimeout: 300, env: { FIXTURE_MODE: "ignore-ready" } });
  const first = await start();
  client.stop();
  const second = await start();
  assert.notEqual(first.pid, second.pid);
  const result = await client.stopAndWait();
  assert.equal(result.exited, true);
  assert.deepEqual(result.children.map((child) => child.pid).sort(), [first.pid, second.pid].sort());
  for (const pid of [first.pid, second.pid]) assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

test("an awaited stop snapshot cannot kill or clear a process started during cleanup", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { shutdownTimeout: 300, env: { FIXTURE_MODE: "ignore-ready" } });
  const old = await start();
  const stopping = client.stopAndWait();
  client.options.env.FIXTURE_MODE = "normal";
  const replacementPromise = start();
  const replacement = await replacementPromise;
  const result = await stopping;
  assert.deepEqual(result.children.map((child) => child.pid), [old.pid]);
  assert.equal(client.ready, replacementPromise);
  assert.equal(client.child.pid, replacement.pid);
  assert.equal((await client.request("echo")).pid, replacement.pid);
  assert.equal(client.connections.size, 1);
});

test("cleanup has a hard deadline and reports a process it could not terminate", { timeout: 10000 }, async (t) => {
  const { client, start } = await fixture(t, { shutdownTimeout: 20, shutdownHardTimeout: 80, env: { FIXTURE_MODE: "ignore-ready" } });
  await start();
  const child = client.child, originalKill = child.kill.bind(child), signals = [];
  child.kill = (signal) => { signals.push(signal); return false; };
  try {
    const result = await client.stopAndWait();
    assert.equal(result.exited, false);
    assert.equal(result.children[0].timedOut, true);
    assert.equal(result.children[0].pid, child.pid);
    assert.deepEqual(signals, ["SIGTERM", "SIGKILL", "SIGKILL"]);
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, null);
  } finally {
    child.kill = originalKill;
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
  }
  assert.equal(client.connections.size, 0);
});

// Settings › Models on Codex (model-settings.cjs → setCodexLaunch): `-c` overrides after `app-server --stdio`
// and an environment for the Codex child only; an explicit binary bypasses both.
async function codexCore(t, launch, script = "") {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codex-launch-test-"));
  const binary = path.join(directory, "codex");
  const log = path.join(directory, "argv.jsonl");
  await fs.writeFile(binary, `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args: process.argv.slice(2), K: process.env.K ?? null, DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? null }) + '\\n');
${script}
require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
});
`, { mode: 0o755 });
  const { setCoreChoice, setCodexLaunch } = require("../electron/codex.cjs");
  const saved = { core: process.env.CODE_DESKTOP_CORE, override: process.env.CODEX_BINARY, system: process.env.CODE_DESKTOP_CORE_SYSTEM_PATHS, deepseek: process.env.DEEPSEEK_API_KEY };
  Object.assign(process.env, { CODE_DESKTOP_CORE: "codex", CODE_DESKTOP_CORE_SYSTEM_PATHS: "", DEEPSEEK_API_KEY: "leak" });
  delete process.env.CODEX_BINARY;
  setCoreChoice({ core: "codex", agents: { codex: { path: binary } } });
  setCodexLaunch(launch);
  const restore = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
  t.after(async () => {
    setCodexLaunch(null); setCoreChoice({});
    restore("CODE_DESKTOP_CORE", saved.core); restore("CODEX_BINARY", saved.override); restore("CODE_DESKTOP_CORE_SYSTEM_PATHS", saved.system); restore("DEEPSEEK_API_KEY", saved.deepseek);
    await fs.rm(directory, { recursive: true, force: true });
  });
  const lines = async () => (await fs.readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
  return { binary, lines };
}

test("the Codex core gets the launch's -c overrides after app-server --stdio and its env, without the DeepSeek key", { timeout: 10000 }, async (t) => {
  const { resolveCore } = require("../electron/codex.cjs");
  let calls = 0;
  const { binary, lines } = await codexCore(t, () => { calls++; return { args: ["-c", "x=1"], env: { K: "v", DEEPSEEK_API_KEY: undefined } }; });
  assert.deepEqual({ ...resolveCore(), env: undefined }, { command: binary, prefix: [], kind: "codex", args: ["-c", "x=1"], env: undefined });
  const client = new CodexClient({ initializeTimeout: 3000, shutdownTimeout: 80 });
  t.after(() => client.stopAndWait());
  await client.start();
  assert.deepEqual(await lines(), [{ args: ["app-server", "--stdio", "-c", "x=1"], K: "v", DEEPSEEK_API_KEY: null }]);
  assert.ok(calls >= 2, "read at each resolve, so a saved change applies on the next spawn");
  // An explicit binary (options.binary, CODEX_BINARY) is a fixture or override: no launch options.
  const direct = new CodexClient({ binary, initializeTimeout: 3000, shutdownTimeout: 80 });
  t.after(() => direct.stopAndWait());
  await direct.start();
  assert.deepEqual((await lines()).at(-1), { args: ["app-server", "--stdio"], K: null, DEEPSEEK_API_KEY: "leak" });
  process.env.CODEX_BINARY = binary;
  assert.deepEqual(resolveCore(), { command: binary, prefix: [], kind: "override" });
});

test("a bridge core's agent never inherits the saved keys; only the OpenCode-based ones keep the provider keys", (t) => {
  const { resolveCore, setCoreChoice, setCodexLaunch } = require("../electron/codex.cjs");
  const names = ["CODE_DESKTOP_CORE", "CODEX_BINARY", "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "CODE_DESKTOP_PROVIDER_KEY_GW"];
  const saved = Object.fromEntries(names.map((key) => [key, process.env[key]]));
  t.after(() => { setCodexLaunch(null); setCoreChoice({}); for (const key of names) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  delete process.env.CODE_DESKTOP_CORE; delete process.env.CODEX_BINARY;
  Object.assign(process.env, { DEEPSEEK_API_KEY: "sk-ds", DEEPSEEK_BASE_URL: "http://127.0.0.1:1", CODE_DESKTOP_PROVIDER_KEY_GW: "sk-gw" });
  // The Codex launch blanks every Harness-managed variable, the provider keys and the search key among them.
  setCodexLaunch(() => ({ args: [], env: { CODE_DESKTOP_PROVIDER_KEY_GW: undefined, CODE_DESKTOP_DEEPSEEK_SEARCH_KEY: undefined } }));
  const blanked = (id) => {
    setCoreChoice({ core: id, agents: {} });
    const env = resolveCore().env;
    return ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "CODE_DESKTOP_DEEPSEEK_SEARCH_KEY", "CODE_DESKTOP_PROVIDER_KEY_GW"].filter((key) => key in env && env[key] === undefined);
  };
  for (const id of ["kimi", "gemini", "qwen", "minimax", "zcode"])
    assert.deepEqual(blanked(id), ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "CODE_DESKTOP_DEEPSEEK_SEARCH_KEY", "CODE_DESKTOP_PROVIDER_KEY_GW"], id);
  for (const id of ["opencode", "mimo"]) assert.deepEqual(blanked(id), ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "CODE_DESKTOP_DEEPSEEK_SEARCH_KEY"], id);
});

test("an exit before initialize names stderr's last line, sanitized", { timeout: 10000 }, async (t) => {
  const { stderrReason } = require("../electron/codex.cjs");
  await codexCore(t, { args: [], env: {} }, `process.stderr.write('starting\\nError: invalid model_providers.codedesktop at https://relay.test/v1?token=abc: Bearer sk-abcdefghijkl\\n'); process.exit(1);`);
  const client = new CodexClient({ initializeTimeout: 3000, shutdownTimeout: 80 });
  const error = await client.start().then(() => null, (failure) => failure);
  assert.match(error?.message ?? "", /^Codex disconnected \(1\)\. Error: invalid model_providers\.codedesktop at https:\/\/relay\.test\/v1 Bearer \[redacted\] Reconnect to continue\.$/);
  assert.equal(stderrReason(""), "");
  assert.equal(stderrReason(`x\n${"y".repeat(400)}\n`).length, 300);
  assert.equal(stderrReason("api_key=sk-secretvalue123 failed"), "api_key=[redacted] failed");
});

test("app-wide shutdown also waits for a replaced client's old child and blocks late starts", { timeout: 10000 }, async (t) => {
  const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  t.after(async () => {
    if (unrelated.exitCode === null && unrelated.signalCode === null) {
      const exited = once(unrelated, "exit");
      unrelated.kill("SIGKILL");
      await exited;
    }
  });
  const first = await fixture(t, { shutdownTimeout: 300, env: { FIXTURE_MODE: "ignore-ready" } });
  const second = await fixture(t, { shutdownTimeout: 300, env: { FIXTURE_MODE: "ignore-ready" } });
  const old = await first.start();
  const current = await second.start();
  // Initialize both processes before detaching the old client. Awaiting the
  // replacement's startup after stop() lets the old child's 300 ms grace expire
  // on a busy host, correctly removing it before the app-wide shutdown snapshot.
  // Keep detach, liveness checks and shutdown in one turn so this test always
  // exercises an old pending cleanup as well as the current live connection.
  first.client.stop();
  assert.equal(first.client.connection, null);
  assert.equal(first.client.connections.size, 1);
  for (const pid of [old.pid, current.pid]) assert.doesNotThrow(() => process.kill(pid, 0));
  const stopping = stopAllCodexClients();
  assert.equal(stopping, stopAllCodexClients());
  await assert.rejects(second.start(), /shutting down/);
  await assert.rejects(new CodexClient().start(), /shutting down/);
  const result = await stopping;
  assert.equal(result.exited, true);
  assert.deepEqual(result.children.map((child) => child.pid).sort(), [old.pid, current.pid].sort());
  for (const child of result.children) {
    assert.equal(child.forced, true);
    assert.equal(child.signal, "SIGKILL");
    assert.equal(child.timedOut, false);
  }
  for (const pid of [old.pid, current.pid]) assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  assert.equal(unrelated.exitCode, null);
  assert.equal(unrelated.signalCode, null);
  assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
});
