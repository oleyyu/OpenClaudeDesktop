#!/usr/bin/env node
// Isolated test server only: no tools, commands, real sessions, or credentials.
const readline = require("node:readline");
const fs = require("node:fs");
if (!process.env.APPROVAL_TEST_LOG) throw new Error("An isolated response log is required.");
const send = message => process.stdout.write(JSON.stringify(message) + "\n");
const outstanding = new Map();
if (process.env.APPROVAL_TEST_LATE_STOP === "1") process.on("SIGTERM", () => {
  setTimeout(() => send({ id: "late-old", method: "item/commandExecution/requestApproval", params: { threadId: "old", turnId: "old" } }), 10);
  setTimeout(() => process.exit(0), 80);
});
readline.createInterface({ input: process.stdin }).on("line", line => {
  const message = JSON.parse(line);
  if (!message.method) {
    fs.appendFileSync(process.env.APPROVAL_TEST_LOG, JSON.stringify(message) + "\n");
    outstanding.delete(message.id);
    return;
  }
  if (message.method === "initialized") return;
  let result = {};
  if (message.method === "initialize") result = { userAgent: "isolated-approval-transport-test", pid: process.pid };
  else if (message.method === "fixture/request") {
    outstanding.set(message.params.id, message.params);
    send(message.params);
  }
  else if (message.method === "thread/resume") {
    // Match app-server's resume of a loaded thread: reply, then replay its
    // outstanding requests verbatim on the existing connection.
    send({ id: message.id, result: { thread: { id: message.params.threadId } } });
    for (const request of outstanding.values())
      if (request.params?.threadId === message.params.threadId) send(request);
    return;
  }
  else if (message.method === "fixture/notify") send({ method: message.params.method, params: message.params.params });
  else if (message.method === "fixture/responses") {
    let data = "";
    try { data = fs.readFileSync(process.env.APPROVAL_TEST_LOG, "utf8"); } catch {}
    result = data.trim() ? data.trim().split("\n").map(JSON.parse) : [];
  }
  else if (message.method === "fixture/hang") return;
  else { send({ id: message.id, error: { code: -32601, message: "Unknown isolated fixture method" } }); return; }
  send({ id: message.id, result });
});
