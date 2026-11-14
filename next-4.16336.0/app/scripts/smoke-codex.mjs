import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { CodexClient } = require("../electron/codex.cjs");
const { respondToApproval } = require("../electron/respond-approval.cjs");
const workspace = path.resolve(import.meta.dirname, "../../workspace");
await fs.mkdir(workspace, { recursive: true });
await fs.writeFile(
  path.join(workspace, "ui-smoke.txt"),
  "CODE_DESKTOP_SMOKE_OK\n",
);
const c = new CodexClient({ cwd: workspace });
let threadId;
const events = [];
let finish;
const done = new Promise((resolve, reject) => {
  finish = { resolve, reject };
});
const timeout = setTimeout(
  () => finish.reject(new Error("Live turn exceeded 180 seconds")),
  180000,
);
c.on("event", (e) => {
  events.push(e);
  if (e.kind === "request") {
    let answer;
    if (
      [
        "item/commandExecution/requestApproval",
        "item/fileChange/requestApproval",
      ].includes(e.method)
    )
      answer = { decision: "decline" };
    else if (e.method === "item/permissions/requestApproval")
      answer = { allow: false };
    else {
      finish.reject(new Error("Unexpected request " + e.method));
      return;
    }
    // This live smoke is deny-only. The mapper preserves the actual method's
    // denial shape and the identity check never falls back to a reused wire ID.
    const result = respondToApproval(c, {
      id: e.id,
      expected: e.bridgeApproval,
      ...answer,
    });
    if (!result.ok) finish.reject(new Error(result.error.message));
  }
  if (e.method === "turn/completed") finish.resolve(e.params.turn);
});
try {
  await c.start();
  const models = await c.request("model/list", { limit: 100 });
  const model = models.data.find((m) => m.isDefault).model;
  const t = await c.request("thread/start", {
    cwd: workspace,
    model,
    sandbox: "read-only",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
  });
  threadId = t.thread.id;
  await c.request("thread/name/set", {
    threadId,
    name: "OpenClaude Desktop integration smoke test",
  });
  await c.request("turn/start", {
    threadId,
    input: [
      {
        type: "text",
        text: "Read ui-smoke.txt in the current working directory using a file-reading or shell tool. Reply with only its contents. Do not modify any files. Do not delegate.",
        text_elements: [],
      },
    ],
    effort: "low",
  });
  const turn = await done;
  const messages = events
    .filter(
      (e) =>
        e.method === "item/completed" && e.params.item.type === "agentMessage",
    )
    .map((e) => e.params.item.text);
  const tools = events
    .filter(
      (e) =>
        e.method === "item/completed" &&
        !["agentMessage", "userMessage", "reasoning"].includes(
          e.params.item.type,
        ),
    )
    .map((e) => e.params.item.type);
  const history = await c.request("thread/read", {
    threadId,
    includeTurns: true,
  });
  const result = {
    threadId,
    status: turn.status,
    messages,
    tools,
    streamed: events.some((e) => e.method === "item/agentMessage/delta"),
    historyItems: history.thread.turns.flatMap((t) => t.items).length,
    error: turn.error,
  };
  await fs.writeFile(
    path.resolve(import.meta.dirname, "../../analysis/live-codex-test.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (
    turn.status !== "completed" ||
    !messages.some((m) => m.includes("CODE_DESKTOP_SMOKE_OK")) ||
    !tools.length
  )
    throw new Error("Live integration checks failed");
} finally {
  clearTimeout(timeout);
  await c.stopAndWait();
}
