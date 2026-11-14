#!/usr/bin/env node
// Isolated raw protocol fixture. It never runs commands, opens credentials,
// or invokes a real model. All control operations emit ordinary Codex events.
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const profile = process.env.CODE_DESKTOP_DATA;
if (!profile || fs.readFileSync(path.join(profile, "turn-footer-fixture.marker"), "utf8") !== "isolated-turn-footer-test\n")
  throw new Error("Turn footer fixture requires its isolated marked profile.");
const file = path.join(profile, "fixture-threads.json");
const db = JSON.parse(fs.readFileSync(file, "utf8"));
const loaded = new Set();
const send = message => process.stdout.write(JSON.stringify(message) + "\n");
const notify = (method, params) => {
  fs.appendFileSync(path.join(profile, "turn-footer-events.jsonl"), JSON.stringify({ method, params }) + "\n");
  send({ method, params });
};
// Atomic write: pollers must never read a truncated store (see codex-server.cjs).
const writeAtomic = (target, text) => { const temporary = `${target}.${process.pid}.tmp`; fs.writeFileSync(temporary, text); fs.renameSync(temporary, target); };
const persist = () => writeAtomic(file, JSON.stringify(db));
function control(input) {
  const thread = db.threads[input.threadId];
  if (!thread || input.threadId === "footer-control") throw new Error("Unknown target thread.");
  let turn = thread.turns.find(turn => turn.id === input.turnId);
  if (input.op === "start") {
    if (turn || thread.turns.some(turn => turn.status === "inProgress")) throw new Error("Fixture turn already active.");
    turn = { id: input.turnId, status: "inProgress", items: [] };
    thread.turns.push(turn); persist();
    notify("turn/started", { threadId: thread.id, turn });
    return;
  }
  if (!turn) throw new Error("Unknown fixture turn.");
  if (input.op === "item") {
    if (!input.item || typeof input.item.id !== "string") throw new Error("An item ID is required.");
    const index = turn.items.findIndex(item => item.id === input.item.id);
    if (index < 0) turn.items.push(input.item); else turn.items[index] = input.item;
    persist();
    notify(input.completed === false ? "item/started" : "item/completed", {
      threadId: thread.id, turnId: turn.id, item: input.item,
    });
    return;
  }
  if (input.op === "delta") {
    const item = turn.items.find(item => item.id === input.itemId);
    if (!item || item.type !== "agentMessage" || typeof input.delta !== "string") throw new Error("Invalid text delta.");
    item.text += input.delta; persist();
    notify("item/agentMessage/delta", { threadId: thread.id, turnId: turn.id, itemId: item.id, delta: input.delta });
    return;
  }
  if (input.op === "complete") {
    turn.status = input.status === "interrupted" ? "interrupted" : "completed";
    persist(); notify("turn/completed", { threadId: thread.id, turn }); return;
  }
  throw new Error("Unknown fixture control.");
}
// Codex 0.155.1 Thread.historyMode: this double serves whole threads from
// thread/read and thread/resume (the legacy contract), so it reports
// historyMode "legacy" and the client keeps the unpaged route. The real server
// answers thread/turns/list for both modes, so it is served here too.
const withMode = thread => thread ? { ...thread, historyMode: thread.historyMode || "legacy" } : thread;
const turnsPage = (thread, params) => {
  const ordered = params.sortDirection === "asc" ? [...thread.turns] : [...thread.turns].reverse();
  const from = params.cursor ? Number(String(params.cursor).replace("turns:", "")) : 0;
  const limit = Math.max(1, Math.min(200, Number(params.limit) || 25));
  const slice = ordered.slice(from, from + limit), view = params.itemsView === "full" ? "full" : "summary";
  return { data: slice.map(turn => ({ id: turn.id, status: turn.status, error: turn.error || null, itemsView: view,
      items: view === "full" ? structuredClone(turn.items || []) : [] })),
    nextCursor: from + slice.length < ordered.length ? `turns:${from + slice.length}` : null,
    backwardsCursor: slice.length ? `turns:${from}` : null };
};
readline.createInterface({ input: process.stdin }).on("line", line => {
  const message = JSON.parse(line);
  if (message.method === "initialized") return;
  const params = message.params || {};
  const thread = db.threads[params.threadId];
  try {
    let result;
    switch (message.method) {
      case "initialize": result = { userAgent: "turn-footer-fixture/1" }; break;
      case "account/read": result = { account: { type: "chatgpt" }, requiresOpenaiAuth: true }; break;
      case "model/list": result = { data: [{ id: "footer-fixture", model: "footer-fixture", displayName: "Footer fixture", isDefault: true, defaultReasoningEffort: "low", supportedReasoningEfforts: [{ reasoningEffort: "low" }] }], nextCursor: null }; break;
      case "thread/list": result = { data: Object.values(db.threads).map(withMode), nextCursor: null }; break;
      case "thread/read":
      case "thread/resume":
        if (!thread) throw new Error("Unknown fixture thread.");
        if (message.method === "thread/resume") loaded.add(thread.id);
        result = { thread: withMode(thread) }; break;
      case "thread/turns/list":
        if (!thread) throw new Error("Unknown fixture thread.");
        result = turnsPage(thread, params); break;
      case "thread/name/set": thread.name = params.name; persist(); result = {}; break;
      case "turn/start": {
        const text = params.input?.[0]?.text;
        if (!loaded.has("footer-control") || params.threadId !== "footer-control" || typeof text !== "string" || !text.startsWith("FOOTER_TEST:"))
          throw new Error("This fixture accepts only its control thread.");
        control(JSON.parse(text.slice("FOOTER_TEST:".length)));
        result = { turn: { id: `control-${++db.next}`, status: "completed", items: [] } };
        break;
      }
      case "turn/interrupt": control({ op: "complete", threadId: params.threadId, turnId: params.turnId, status: "interrupted" }); result = {}; break;
      default: throw new Error("Unsupported fixture RPC.");
    }
    send({ id: message.id, result });
  } catch (error) { send({ id: message.id, error: { code: -32600, message: error.message } }); }
});
