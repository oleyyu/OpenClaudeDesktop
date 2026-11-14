#!/usr/bin/env node
// Isolated Electron approval fixture. It emits raw Codex protocol requests and
// records responses; it never runs commands, tools, network or account actions.
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const profile = process.env.CODE_DESKTOP_DATA;
if (
  !profile ||
  fs.readFileSync(path.join(profile, "approval-fixture.marker"), "utf8") !==
    "isolated-approval-test\n"
)
  throw new Error(
    "Approval fixture requires its explicitly marked temporary profile.",
  );
const databaseFile = path.join(profile, "fixture-threads.json");
const responseFile = path.join(profile, "approval-responses.jsonl");
const db = JSON.parse(fs.readFileSync(databaseFile, "utf8"));
const pending = new Map(),
  loaded = new Set();
const methods = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "item/permissions/requestApproval",
  "item/tool/requestUserInput",
]);
const send = (message) => process.stdout.write(JSON.stringify(message) + "\n");
const notify = (method, params) => send({ method, params });
// Atomic: the suites poll this file, so a truncating in-place write can be
// observed half-finished (see codex-server.cjs).
const writeAtomic = (file, text) => { const temporary = `${file}.${process.pid}.tmp`; fs.writeFileSync(temporary, text); fs.renameSync(temporary, file); };
const persist = () => writeAtomic(databaseFile, JSON.stringify(db));
fs.appendFileSync(
  path.join(profile, "approval-processes.jsonl"),
  JSON.stringify({ pid: process.pid, ppid: process.ppid, at: Date.now() }) +
    "\n",
);

function emitRequest(request) {
  if (
    !methods.has(request.method) ||
    !["number", "string"].includes(typeof request.id)
  )
    throw new Error("Invalid fixture request.");
  const thread = db.threads[request.params?.threadId];
  if (!thread) throw new Error("Unknown fixture request thread.");
  if (pending.has(request.id))
    throw new Error("Fixture request ID is already pending.");
  let turn = thread.turns.find((turn) => turn.id === request.params.turnId);
  if (!turn) {
    turn = { id: request.params.turnId, status: "inProgress", items: [] };
    thread.turns.push(turn);
  }
  turn.status = "inProgress";
  thread.updatedAt = Math.floor(Date.now() / 1000);
  pending.set(request.id, request);
  persist();
  notify("turn/started", { threadId: thread.id, turn });
  // Only the bridge may add a request identity. Fixture params are raw Codex.
  send(request);
}

function resolveRequest(id) {
  const request = pending.get(id);
  if (!request) throw new Error("Unknown fixture pending request.");
  pending.delete(id);
  notify("serverRequest/resolved", {
    threadId: request.params.threadId,
    requestId: id,
  });
}

function control(input) {
  switch (input.op) {
    case "emit":
      emitRequest(input.request);
      return;
    case "resolve":
      resolveRequest(input.id);
      return;
    case "complete": {
      const thread = db.threads[input.threadId];
      const turn = thread?.turns.find((turn) => turn.id === input.turnId);
      if (!turn) throw new Error("Unknown fixture turn.");
      turn.status = input.status || "completed";
      for (const [id, request] of pending)
        if (
          request.params.threadId === thread.id &&
          request.params.turnId === turn.id
        )
          pending.delete(id);
      persist();
      notify("turn/completed", { threadId: thread.id, turn });
      return;
    }
    case "exit":
      setTimeout(() => process.exit(0), 25);
      return;
    case "break-stdin": {
      // Keep stdout and the process alive after closing its actual read pipe.
      // The client's next response write must see a real transport failure.
      setTimeout(() => {
        setInterval(() => {}, 1000);
        process.stdin.on("error", () => {});
        process.stdin.destroy();
        try {
          fs.closeSync(0);
        } catch {}
        notify("fixture/stdin-closed", { pid: process.pid });
      }, 25);
      return;
    }
    default:
      throw new Error("Unknown fixture control operation.");
  }
}

// Codex 0.155.1 Thread.historyMode: this double serves whole threads from
// thread/read and thread/resume (the legacy contract), so it reports
// historyMode "legacy" and the client keeps the unpaged route. The real server
// answers thread/turns/list for both modes, so it is served here too.
const withMode = (thread) => thread ? { ...thread, historyMode: thread.historyMode || "legacy" } : thread;
const turnsPage = (thread, params) => {
  const ordered = params.sortDirection === "asc" ? [...thread.turns] : [...thread.turns].reverse();
  const from = params.cursor ? Number(String(params.cursor).replace("turns:", "")) : 0;
  const limit = Math.max(1, Math.min(200, Number(params.limit) || 25));
  const slice = ordered.slice(from, from + limit), view = params.itemsView === "full" ? "full" : "summary";
  return { data: slice.map((turn) => ({ id: turn.id, status: turn.status, error: turn.error || null, itemsView: view,
      items: view === "full" ? structuredClone(turn.items || []) : [] })),
    nextCursor: from + slice.length < ordered.length ? `turns:${from + slice.length}` : null,
    backwardsCursor: slice.length ? `turns:${from}` : null };
};
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.method === "initialized") return;
  if (!message.method) {
    // Log even an unexpected ID, so a stale response cannot evade assertions.
    fs.appendFileSync(
      responseFile,
      JSON.stringify({ pid: process.pid, at: Date.now(), wire: message }) +
        "\n",
    );
    const request = pending.get(message.id);
    if (request) resolveRequest(message.id);
    return;
  }
  const params = message.params || {};
  const thread = db.threads[params.threadId];
  let result;
  try {
    switch (message.method) {
      case "initialize":
        result = { userAgent: "isolated-approval-fixture/1", pid: process.pid };
        break;
      case "account/read":
        result = { account: { type: "chatgpt" }, requiresOpenaiAuth: true };
        break;
      case "model/list":
        result = {
          data: [
            {
              id: "approval-fixture",
              model: "approval-fixture",
              displayName: "Approval fixture",
              isDefault: true,
              defaultReasoningEffort: "low",
              supportedReasoningEfforts: [{ reasoningEffort: "low" }],
            },
          ],
          nextCursor: null,
        };
        break;
      case "thread/read":
        if (!thread) throw new Error("Unknown fixture thread.");
        result = { thread: withMode(thread) };
        break;
      case "thread/resume":
        if (!thread) throw new Error("Unknown fixture thread.");
        loaded.add(thread.id);
        send({ id: message.id, result: { thread: withMode(thread) } });
        // A loaded thread's outstanding approvals are replayed on every
        // resume, even to the same connection (Codex app-server behavior).
        for (const request of pending.values())
          if (request.params.threadId === thread.id) send(request);
        return;
      case "thread/turns/list":
        if (!thread) throw new Error("Unknown fixture thread.");
        result = turnsPage(thread, params);
        break;
      case "thread/list":
        result = { data: Object.values(db.threads).map(withMode), nextCursor: null };
        break;
      case "thread/name/set":
        thread.name = params.name;
        persist();
        result = {};
        break;
      case "turn/start": {
        if (!thread || !loaded.has(thread.id))
          throw new Error("Fixture thread must be resumed before a turn.");
        const text = params.input?.[0]?.text;
        if (
          thread.id !== "approval-control" ||
          typeof text !== "string" ||
          !text.startsWith("APPROVAL_TEST:")
        )
          throw new Error(
            "This protocol fixture accepts its control thread only; it does not execute user tasks.",
          );
        control(JSON.parse(text.slice("APPROVAL_TEST:".length)));
        result = {
          turn: { id: `control-${++db.next}`, status: "completed", items: [] },
        };
        break;
      }
      case "turn/interrupt": {
        const turn = thread?.turns.find((turn) => turn.id === params.turnId);
        if (turn)
          control({
            op: "complete",
            threadId: thread.id,
            turnId: turn.id,
            status: "interrupted",
          });
        result = {};
        break;
      }
      default:
        throw new Error("Unsupported fixture RPC.");
    }
    send({ id: message.id, result });
  } catch (error) {
    send({ id: message.id, error: { code: -32600, message: error.message } });
  }
});
