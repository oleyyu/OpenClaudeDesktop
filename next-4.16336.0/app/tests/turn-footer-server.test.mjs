import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";

test("fixture persists the exact multi-item turn while emitting real lifecycle and delta events", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "turn-footer-protocol-"));
  let child;
  try {
    await fs.writeFile(path.join(profile, "turn-footer-fixture.marker"), "isolated-turn-footer-test\n");
    await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 0, threads: {
      "footer-control": { id: "footer-control", turns: [] },
      A: { id: "A", turns: [] },
    } }));
    child = spawn(process.execPath, [path.join(import.meta.dirname, "fixtures/turn-footer-server.cjs")], {
      env: { ...process.env, CODE_DESKTOP_DATA: profile }, stdio: ["pipe", "pipe", "pipe"],
    });
    const awaiting = new Map(), events = [], errors = [];
    let next = 0;
    child.stderr.on("data", data => errors.push(String(data)));
    readline.createInterface({ input: child.stdout }).on("line", line => {
      const message = JSON.parse(line);
      if (Object.hasOwn(message, "id")) {
        const request = awaiting.get(message.id);
        if (!request) return;
        awaiting.delete(message.id); clearTimeout(request.timeout);
        message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
      } else events.push(message);
    });
    // initialize also waits for the fixture process to start (cold module load), which can pass 1.5s on a busy machine.
    function rpc(method, params = {}, ms = method === "initialize" ? 10000 : 1500) {
      const id = ++next;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Fixture timeout: ${method}`)), ms);
        awaiting.set(id, { resolve, reject, timeout });
        child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
      });
    }
    const control = command => rpc("turn/start", { threadId: "footer-control", input: [{ type: "text", text: "FOOTER_TEST:" + JSON.stringify({ threadId: "A", turnId: "turn-A", ...command }) }] });
    await rpc("initialize");
    await rpc("thread/resume", { threadId: "footer-control" });
    await control({ op: "start" });
    await control({ op: "item", completed: false, item: { id: "text", type: "agentMessage", text: "First" } });
    await control({ op: "delta", itemId: "text", delta: "\n\n```js\ntrue;\n```" });
    await control({ op: "item", item: { id: "last", type: "commandExecution", status: "completed", command: "synthetic-only", aggregatedOutput: "NOT_EXECUTED" } });
    const running = (await rpc("thread/read", { threadId: "A" })).thread;
    assert.equal(running.turns[0].status, "inProgress");
    assert.equal(running.turns[0].items[0].text, "First\n\n```js\ntrue;\n```");
    await control({ op: "complete" });
    const completed = (await rpc("thread/read", { threadId: "A" })).thread;
    assert.equal(completed.turns[0].status, "completed");
    assert.deepEqual(events.map(event => event.method), ["turn/started", "item/started", "item/agentMessage/delta", "item/completed", "turn/completed"]);
    assert.equal(events.at(-1).params.turn.items.at(-1).id, "last");
    assert.equal(JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8")).threads.A.turns[0].status, "completed");
    await assert.rejects(rpc("turn/start", { threadId: "A", input: [{ type: "text", text: "Do not execute" }] }), /only its control thread/);
    assert.deepEqual(errors, []);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve));
      child.stdin.end();
      const timeout = setTimeout(() => child.kill("SIGKILL"), 1000);
      await exited; clearTimeout(timeout);
    }
    await fs.rm(profile, { recursive: true, force: true });
  }
});
