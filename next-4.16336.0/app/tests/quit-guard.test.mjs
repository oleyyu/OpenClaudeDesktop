import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createLiveWork, backgroundSessions, workCounts, workSplit, createQuitGuard } = require("../electron/quit-guard.cjs");
const { installShutdownHandler } = require("../electron/shutdown.cjs");
const { t, tn, setLocale, setAssistantName } = await import("../electron/i18n/index.mjs");

class App extends EventEmitter {
  exits = 0;
  quit() {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    this.emit("before-quit", event);
    if (!event.prevented) this.exits++;
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
// A wait quits on a later poll: wait until the shutdown has started, then for it to finish.
async function settled(shutdown) {
  for (let i = 0; i < 200 && !shutdown.completion; i++) await new Promise((resolve) => setTimeout(resolve, 5));
  await shutdown.completion;
}

// count: the older one-number wiring (sessions with live work plus idle sessions with background commands), or, with
// split: true, W8t's { working, withShells } where a working session with background commands counts in both.
function setup({ responses = [], config = { threadIds: ["s1", "s2", "s3"] }, background = [], skip = () => false, split = false } = {}) {
  const app = new App(), work = createLiveWork({ getConfig: () => config }), prompts = [];
  const dialog = { showMessageBox: async (...args) => { const options = args.at(-1); prompts.push(options); const response = responses.shift(); if (response instanceof Error) throw response; return { response }; } };
  const guard = createQuitGuard({ app, dialog, t, countNow: () => work.sessions().size, mayFindMore: () => background.length > 0,
    count: async () => split ? { working: work.sessions().size, withShells: new Set(background).size } : new Set([...work.sessions(), ...background]).size,
    onChange: (fn) => work.onChange(fn), skip, pollMs: 20 });
  let stopped = 0;
  const shutdown = installShutdownHandler(app, { guard: (event) => guard.handle(event), stop: () => { stopped++; } });
  return { app, work, guard, prompts, shutdown, stopped: () => stopped, background };
}

test("live work: a turn counts for its session, a sub-agent for the session that spawned it, a workflow while running", () => {
  const config = { threadIds: ["s1", "s2"] }, work = createLiveWork({ getConfig: () => config });
  work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  work.observe({ method: "thread/started", params: { thread: { id: "child", source: { subAgent: { thread_spawn: { parent_thread_id: "s2" } } } } } });
  work.observe({ method: "turn/started", params: { threadId: "child", turn: { id: "c1" } } });
  work.observe({ method: "turn/started", params: { threadId: "unknown", turn: { id: "u1" } } });
  assert.deepEqual([...work.sessions()].sort(), ["s1", "s2"]);
  work.observe({ method: "turn/completed", params: { threadId: "child", turn: { id: "other-id" } } });
  assert.deepEqual([...work.sessions()], ["s1"], "any completion ends the thread's turn");
  work.observe({ kind: "workflow", run: { id: "w1", threadId: "s2", status: "running" } });
  assert.equal(work.sessions().size, 2);
  work.observe({ kind: "workflow", run: { id: "w1", threadId: "s2", status: "completed" } });
  work.observe({ kind: "connection", connected: false });
  assert.equal(work.sessions().size, 0);
  assert.deepEqual(work.touchedSessions().sort(), ["s1", "s2"]);
});

test("nothing running: quit goes straight to shutdown without a prompt", async () => {
  const { app, prompts, shutdown } = setup();
  app.quit();
  assert.equal(shutdown.state, "waiting");
  await shutdown.completion;
  assert.equal(prompts.length, 0);
  assert.equal(app.exits, 1);
});

test("a running turn asks first; Cancel keeps the app and its work running", async () => {
  setLocale("en-US"); setAssistantName("Codex");
  const { app, work, prompts, shutdown, stopped } = setup({ responses: [2] });
  work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  app.quit(); app.quit();
  await tick();
  assert.equal(prompts.length, 1, "a second quit while the box is open does not open another");
  assert.equal(prompts[0].message, "Codex is still working");
  assert.equal(prompts[0].detail, "Codex is working in 1 session. Quitting now will interrupt that work.");
  assert.deepEqual(prompts[0].buttons, ["Quit anyway", "Wait for Codex", "Cancel"]);
  assert.equal(prompts[0].defaultId, 1); assert.equal(prompts[0].cancelId, 2);
  assert.equal(shutdown.state, "idle"); assert.equal(stopped(), 0); assert.equal(app.exits, 0);
  setAssistantName("DeepSeek");
});

test("Quit anyway quits at once and does not ask again", async () => {
  const { app, work, prompts, shutdown } = setup({ responses: [0] });
  work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  work.observe({ method: "turn/started", params: { threadId: "s2", turn: { id: "t2" } } });
  app.quit();
  await tick();
  assert.match(prompts[0].detail, /working in 2 sessions/);
  await shutdown.completion;
  assert.equal(prompts.length, 1);
  assert.equal(app.exits, 1);
});

test("Wait quits by itself once every turn ends", async () => {
  const { app, work, guard, shutdown } = setup({ responses: [1] });
  work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  app.quit();
  await tick();
  assert.equal(guard.waiting, true);
  assert.equal(shutdown.state, "idle");
  work.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1", status: "completed" } } });
  await tick(); await tick();
  await shutdown.completion;
  assert.equal(app.exits, 1);
});

// 3.6556.2 index.chunk-jPKPzV-P.js c5t: `message:c?"Claude is still working":"Background commands are still running"`,
// `buttons:[…"Quit anyway",...c?["Wait for Claude"]:[],"Cancel"],defaultId:1,cancelId:c?2:1`, detail paragraphs joined
// with "\n\n", and Wait = `J8t(e,m,{skipShells:i>0,shellsAtOpen:o})`.
test("background commands alone: the box says so, with Quit anyway and Cancel only; Cancel keeps the app", async () => {
  setLocale("en-US");
  const { app, prompts, guard, shutdown, stopped } = setup({ responses: [1], background: ["s2"] });
  app.quit();
  await tick(); await tick();
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].message, "Background commands are still running");
  assert.equal(prompts[0].detail, "Background commands are running in 1 session. Quitting will stop them.");
  assert.deepEqual(prompts[0].buttons, ["Quit anyway", "Cancel"]);
  assert.equal(prompts[0].defaultId, 1); assert.equal(prompts[0].cancelId, 1);
  assert.equal(guard.waiting, false, "Cancel (response 1) is not Wait");
  assert.equal(shutdown.state, "idle"); assert.equal(stopped(), 0); assert.equal(app.exits, 0);
  const quit = setup({ responses: [0], background: ["s2", "s3"] });
  quit.app.quit();
  await tick(); await tick();
  assert.equal(quit.prompts[0].detail, "Background commands are running in 2 sessions. Quitting will stop them.");
  await quit.shutdown.completion;
  assert.equal(quit.app.exits, 1);
});

test("agent work and background commands: two paragraphs; Wait waits for the turns, not the commands already running", async () => {
  setLocale("en-US"); setAssistantName("Codex");
  try {
    const { app, work, prompts, guard, shutdown, background } = setup({ responses: [1], background: ["s2"] });
    work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
    app.quit();
    await tick(); await tick();
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].message, "Codex is still working");
    assert.equal(prompts[0].detail, "Codex is working in 1 session. Quitting now will interrupt that work.\n\n"
      + "Background commands are running in 1 session. Quitting will stop them, even if you wait for Codex.");
    assert.deepEqual(prompts[0].buttons, ["Quit anyway", "Wait for Codex", "Cancel"]);
    assert.equal(prompts[0].defaultId, 1); assert.equal(prompts[0].cancelId, 2);
    assert.equal(guard.waiting, true);
    work.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1" } } });
    await settled(shutdown);
    assert.equal(app.exits, 1);
    assert.deepEqual(background, ["s2"], "the quit went on with the background command still running");
  } finally { setAssistantName("DeepSeek"); }
});

test("Wait: background commands started meanwhile hold the quit until they end", async () => {
  setLocale("en-US");
  // No background commands when the box opened: Wait waits for every kind (skipShells false).
  const fresh = setup({ responses: [1] });
  fresh.work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  fresh.app.quit();
  await tick();
  assert.equal(fresh.guard.waiting, true);
  fresh.background.push("s1");
  fresh.work.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1" } } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(fresh.app.exits, 0, "the session's new background command holds the quit");
  fresh.background.length = 0;
  await settled(fresh.shutdown);
  assert.equal(fresh.app.exits, 1);
  // Background commands at open are skipped, but another session starting some holds the quit (shellsAtOpen).
  const skipped = setup({ responses: [1], background: ["s2"] });
  skipped.work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  skipped.app.quit();
  await tick(); await tick();
  assert.equal(skipped.guard.waiting, true);
  skipped.background.push("s3");
  skipped.work.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1" } } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(skipped.app.exits, 0);
  skipped.background.splice(skipped.background.indexOf("s3"), 1);
  await settled(skipped.shutdown);
  assert.equal(skipped.app.exits, 1);
});

test("W8t counts: a working session with background commands counts in both; the older one-number count splits", async () => {
  setLocale("en-US");
  const { app, work, prompts } = setup({ responses: [2], background: ["s1"], split: true });
  work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  app.quit();
  await tick(); await tick();
  assert.equal(prompts[0].message, "DeepSeek is still working");
  assert.match(prompts[0].detail, /\n\nBackground commands are running in 1 session\. Quitting will stop them, even if you wait for DeepSeek\.$/);
  assert.deepEqual(workSplit({ working: 2, withShells: 1 }, 0), { working: 2, withShells: 1 });
  assert.deepEqual(workSplit(3, 1), { working: 1, withShells: 2 });
  assert.deepEqual(workSplit(1, 4), { working: 1, withShells: 0 });
  assert.deepEqual(workSplit(undefined, 0), { working: 0, withShells: 0 });
});

test("workCounts asks the core about every session that ran a turn, working or not", async () => {
  const config = { threadIds: ["s1", "s2", "s3"] }, liveWork = createLiveWork({ getConfig: () => config });
  for (const id of ["s1", "s2"]) liveWork.observe({ method: "turn/started", params: { threadId: id, turn: { id } } });
  liveWork.observe({ method: "turn/completed", params: { threadId: "s2", turn: { id: "s2" } } });
  const asked = [];
  const client = { connection: {}, serverInfo: {}, request: async (method, params) => { asked.push(params.threadId); return { data: [{ processId: "p" }] }; } };
  assert.deepEqual(await workCounts({ liveWork, client }), { working: 1, withShells: 2 });
  assert.deepEqual(asked.sort(), ["s1", "s2"]);
  assert.deepEqual(await workCounts({ liveWork, client: null }), { working: 1, withShells: 0 });
});

// The wiring main.cjs takes at the W1 gate (count: () => workCounts({ liveWork, client })), with its own countNow and
// mayFindMore: a session running a turn that has background commands of its own names both kinds, and Wait quits once
// the turn ends (J8t skipShells), not once those commands end.
function wired({ responses = [], shells = new Set() } = {}) {
  const app = new App(), liveWork = createLiveWork({ getConfig: () => ({ threadIds: ["s1", "s2"] }) }), prompts = [];
  const dialog = { showMessageBox: async (...args) => { prompts.push(args.at(-1)); return { response: responses.shift() }; } };
  const client = { connection: {}, serverInfo: {}, request: async (method, params) => ({ data: shells.has(params.threadId) ? [{ processId: "p" }] : [] }) };
  const guard = createQuitGuard({ app, dialog, t, countNow: () => liveWork.sessions().size,
    mayFindMore: () => Boolean(client?.connection && liveWork.touchedSessions().length),
    count: () => workCounts({ liveWork, client }), onChange: (listener) => liveWork.onChange(listener), pollMs: 20 });
  const shutdown = installShutdownHandler(app, { guard: (event) => guard.handle(event), stop: () => {} });
  return { app, liveWork, guard, prompts, shutdown, shells };
}

test("main.cjs wiring (workCounts): a working session's own background commands get the second paragraph; Wait ends with the turn", async () => {
  setLocale("en-US");
  const own = wired({ responses: [1], shells: new Set(["s1"]) });
  own.liveWork.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  own.app.quit();
  await tick(); await tick(); await tick();
  assert.equal(own.prompts.length, 1);
  assert.equal(own.prompts[0].message, "DeepSeek is still working");
  assert.equal(own.prompts[0].detail, "DeepSeek is working in 1 session. Quitting now will interrupt that work.\n\n"
    + "Background commands are running in 1 session. Quitting will stop them, even if you wait for DeepSeek.");
  assert.deepEqual(own.prompts[0].buttons, ["Quit anyway", "Wait for DeepSeek", "Cancel"]);
  assert.equal(own.guard.waiting, true);
  own.liveWork.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1" } } });
  await settled(own.shutdown);
  assert.equal(own.app.exits, 1);
  assert.ok(own.shells.has("s1"), "the turn ended and the app quit with that session's background command still running");
  // An idle session with background commands beside a working one (the case the one-number wiring already got right).
  const idle = wired({ responses: [1], shells: new Set(["s2"]) });
  idle.liveWork.observe({ method: "turn/started", params: { threadId: "s2", turn: { id: "t0" } } });
  idle.liveWork.observe({ method: "turn/completed", params: { threadId: "s2", turn: { id: "t0" } } });
  idle.liveWork.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  idle.app.quit();
  await tick(); await tick(); await tick();
  assert.match(idle.prompts[0].detail, /1 session\. Quitting now will interrupt that work\.\n\nBackground commands are running in 1 session\. Quitting will stop them, even if you wait for DeepSeek\.$/);
  idle.liveWork.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1" } } });
  await settled(idle.shutdown);
  assert.equal(idle.app.exits, 1);
  // Background commands alone: no Wait.
  const alone = wired({ responses: [1], shells: new Set(["s1"]) });
  alone.liveWork.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  alone.liveWork.observe({ method: "turn/completed", params: { threadId: "s1", turn: { id: "t1" } } });
  alone.app.quit();
  await tick(); await tick(); await tick();
  assert.equal(alone.prompts[0].message, "Background commands are still running");
  assert.deepEqual(alone.prompts[0].buttons, ["Quit anyway", "Cancel"]);
  assert.equal(alone.app.exits, 0);
});

test("a failed background lookup still asks about a running turn", async () => {
  setLocale("en-US");
  const app = new App(), work = createLiveWork({ getConfig: () => ({ threadIds: ["s1"] }) }), prompts = [], errors = [];
  const dialog = { showMessageBox: async (options) => { prompts.push(options); return { response: 2 }; } };
  const guard = createQuitGuard({ app, dialog, t, countNow: () => work.sessions().size, mayFindMore: () => true,
    count: async () => { throw new Error("core gone"); }, onChange: (fn) => work.onChange(fn), onError: (error) => errors.push(error), pollMs: 20 });
  installShutdownHandler(app, { guard: (event) => guard.handle(event), stop: () => {} });
  work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  app.quit();
  await tick(); await tick();
  assert.equal(errors.length, 1);
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].message, "DeepSeek is still working");
  assert.equal(app.exits, 0);
});

test("a prompt that cannot open and automated launches never block the quit", async () => {
  const failing = setup({ responses: [new Error("Native action forbidden")] });
  failing.work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  failing.app.quit();
  await tick();
  await failing.shutdown.completion;
  assert.equal(failing.app.exits, 1);
  const automated = setup({ skip: () => true });
  automated.work.observe({ method: "turn/started", params: { threadId: "s1", turn: { id: "t1" } } });
  automated.app.quit();
  await automated.shutdown.completion;
  assert.equal(automated.prompts.length, 0);
});

test("backgroundSessions asks only a connected core and treats failures as none", async () => {
  assert.deepEqual(await backgroundSessions({ client: null, ids: ["s1"] }), []);
  const client = { connection: {}, serverInfo: {}, request: async (method, params) => {
    assert.equal(method, "thread/backgroundTerminals/list");
    if (params.threadId === "bad") throw new Error("unsupported");
    return { data: params.threadId === "s1" ? [{ processId: "p" }] : [] };
  } };
  assert.deepEqual(await backgroundSessions({ client, ids: ["s1", "s2", "bad"] }), ["s1"]);
});

test("quit warning copy has zh-CN entries", () => {
  setLocale("zh-CN");
  try {
    for (const key of ["DeepSeek is still working", "Quit anyway", "Wait for DeepSeek",
      "DeepSeek is working in {count} session. Quitting now will interrupt that work.", "DeepSeek is working in {count} sessions. Quitting now will interrupt that work.",
      "Background commands are still running",
      "Background commands are running in {count} session. Quitting will stop them.", "Background commands are running in {count} sessions. Quitting will stop them.",
      "Background commands are running in {count} session. Quitting will stop them, even if you wait for DeepSeek.",
      "Background commands are running in {count} sessions. Quitting will stop them, even if you wait for DeepSeek."])
      assert.notEqual(t(key), key, key);
    assert.match(tn(3, "DeepSeek is working in {count} session. Quitting now will interrupt that work.", "DeepSeek is working in {count} sessions. Quitting now will interrupt that work."), /3/);
    setAssistantName("Codex");
    assert.equal(t("Background commands are running in {count} sessions. Quitting will stop them, even if you wait for DeepSeek.", { count: 2 }),
      "2 个会话中有后台命令正在运行。即使等待 Codex，退出时也会停止这些命令。");
  } finally { setAssistantName("DeepSeek"); setLocale("en-US"); }
});

test("zh-CN: the shell-only box in Chinese", async () => {
  setLocale("zh-CN");
  try {
    const { app, prompts } = setup({ responses: [1], background: ["s2"] });
    app.quit();
    await tick(); await tick();
    assert.equal(prompts[0].message, "后台命令仍在运行");
    assert.equal(prompts[0].detail, "1 个会话中有后台命令正在运行。退出会停止这些命令。");
    assert.deepEqual(prompts[0].buttons, ["仍要退出", "取消"]);
  } finally { setLocale("en-US"); }
});

test("3.6556.2 pins: the official quit box this follows (index.chunk-jPKPzV-P.js c5t / W8t / J8t), read only", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js", import.meta.url), "utf8");
  const count = (needle) => source.split(needle).length - 1;
  for (const pin of [
    'function W8t(e){return{working:iw(e,{skipShells:!0}),withShells:U8t(e)}}',
    '{working:r,withShells:i}=W8t(e),o=G8t(e),s=r===0&&i===0?t:r,c=s>0',
    'message:c?u.formatMessage({defaultMessage:"Claude is still working",id:"kdoUubpNNW"}):u.formatMessage({defaultMessage:"Background commands are still running",id:"7mmL6SAXUn"})',
    'Quitting will stop them, even if you wait for Claude.",id:"1iM5Q6x+Ie"',
    'Quitting will stop them.",id:"h0Q1qYPJq/"',
    '].filter(Boolean).join(`\\n\\n`)',
    '...c?[u.formatMessage({defaultMessage:"Wait for Claude",id:"71dtHvbhEs"})]:[]',
    'defaultId:1,cancelId:c?2:1,noLink:!0',
    'J8t(e,m,{skipShells:i>0,shellsAtOpen:o})',
  ]) assert.equal(count(pin), 1, pin);
});
