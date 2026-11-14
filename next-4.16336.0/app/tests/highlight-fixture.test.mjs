import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("highlight fixture emits real start/delta/completed events and persists without model or shell execution", { timeout: 6000 }, async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "highlight-protocol-"));
  const controlId = "highlight-control";
  const threads = Object.fromEntries(["A", controlId].map((id) => [id, { id, cwd: profile, name: id, turns: [] }]));
  await fs.writeFile(path.join(profile, "highlight-fixture.marker"), "isolated-highlight-test\n");
  await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 1, threads }));
  const child = spawn(process.execPath, [path.join(import.meta.dirname, "fixtures/highlight-server.cjs")], { env: { ...process.env, CODE_DESKTOP_DATA: profile }, stdio: ["pipe", "pipe", "pipe"] });
  const requests = new Map(), events = []; let next = 0, stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const lines = readline.createInterface({ input: child.stdout });
  lines.on("line", (line) => { const message = JSON.parse(line); if (message.method) events.push(message); else { const pending = requests.get(message.id); if (pending) { requests.delete(message.id); pending(message); } } });
  const rpc = (method, params) => new Promise((resolve) => { const id = ++next; requests.set(id, resolve); child.stdin.write(JSON.stringify({ id, method, params }) + "\n"); });
  const control = (command) => rpc("turn/start", { threadId: controlId, input: [{ type: "text", text: "HIGHLIGHT_TEST:" + JSON.stringify({ threadId: "A", ...command }) }] });
  try {
    assert.equal((await rpc("initialize", {})).result.userAgent, "highlight-fixture/1");
    const denied = await control({ op: "start", turnId: "denied" }); assert.ok(denied.error);
    await rpc("thread/resume", { threadId: controlId });
    assert.ok((await control({ op: "start", turnId: "turn" })).result);
    await control({ op: "item", turnId: "turn", completed: false, item: { id: "item", type: "agentMessage", text: "```js\nconst x=" } });
    await control({ op: "delta", turnId: "turn", itemId: "item", delta: "42;\n```" });
    await control({ op: "item", turnId: "turn", item: { id: "item", type: "agentMessage", text: "```js\nconst x=42;\n```" } });
    await control({ op: "complete", turnId: "turn" });
    assert.deepEqual(events.map((event) => event.method), ["turn/started", "item/started", "item/agentMessage/delta", "item/completed", "turn/completed"]);
    assert.equal(events.at(-1).params.turn.status, "completed");
    const hydrated = await rpc("thread/read", { threadId: "A" });
    assert.equal(hydrated.result.thread.turns[0].items[0].text, "```js\nconst x=42;\n```");
    assert.equal(stderr, "");
  } finally {
    const exited = once(child, "exit"); child.stdin.end(); await exited;
    lines.close(); await fs.rm(profile, { recursive: true, force: true });
  }
});
