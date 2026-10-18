// Renderer hub wiring: the attachment note on cores that drop file mentions (sent, shown, titled, recalled, queued),
// the MCP elicitation's correlated tool-call row, and the Plan → implement handoff on cores without permission hints.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  attachmentInputs, coreTakesFileMentions, firstMessageName, shownPreview, shownQueueList, shownThread, shownTurns,
  shownUserItem, shownUserItems,
} from "../src/composer-attachments-model.mjs";
import { approvalCardModel, approvalItem, elicitationItem, pendingElicitationItemIds, planHandoff } from "../src/approval-card-model.mjs";
import { planImplementationTurn, PLAN_IMPLEMENTATION_MESSAGE, turnPermissionParams } from "../electron/permission-policy.mjs";
import { humanPrompts } from "../src/prompt-history-model.mjs";
import { messageItemText } from "../src/transcript-context-menu-model.mjs";
import { editableDraft, queueFromList } from "../src/queued-messages-model.mjs";
import { rewindChoices, transcriptMarkdown } from "../src/slash-actions-model.mjs";
import zhCN from "../electron/i18n/zh-CN/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const mainSource = await fs.readFile(path.join(root, "src/main.jsx"), "utf8");
let server, session, React, renderToStaticMarkup;
before(async () => {
  // D21: source-session.jsx reaches the view-tabs graph (R2-topbar TT-07 attachment name), whose preload-helper calls
  // document.createElement("link") when it is evaluated, so the stub has one.
  // The transcript rows' code themes (generated c5d464fa3, over shared-4 kf) read html[data-cds-*] when evaluated.
  globalThis.document ??= { body: { nodeType: 1, style: {} }, documentElement: { dataset: {}, style: {}, getAttribute: () => null }, createElement: () => ({}) };
  const { createServer } = await import("vite"), react = (await import("@vitejs/plugin-react")).default;
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  React = (await import("react")).default;
  ({ renderToStaticMarkup } = await import("react-dom/server"));
  session = await server.ssrLoadModule("/src/source-session.jsx");
});
after(() => server?.close());

const file = (filePath) => ({ id: filePath, kind: "file", status: "ready", name: filePath.split("/").pop(), path: filePath });
// What Codex echoes live for a message with a typed line and one attached file, and what its history keeps.
const sent = attachmentInputs([file("/w/notes.md")], { fileMentions: false });
const live = { id: "u1", type: "userMessage", turnId: "t1", content: [{ type: "text", text: "summarize", text_elements: [] }, ...sent] };
const history = { id: "u1", type: "userMessage", turnId: "t1", content: [{ type: "text", text: "summarize\n\n[Attached file: /w/notes.md]" }] };

test("main.jsx sends the attachment note exactly where the running core drops file mentions", () => {
  assert.match(mainSource, /attachmentInputs\(attachments, \{ fileMentions: coreTakesFileMentions\(boot\?\.core\) \}\)/);
  assert.equal(coreTakesFileMentions({ engine: "codex" }), false);
  assert.equal(sent[0].type, "text");
  assert.match(sent[0].text, /\[Attached file: \/w\/notes\.md\]/);
});

test("the user bubble hides the note and shows the file card, live and from Codex history", () => {
  for (const item of [live, history]) {
    const html = renderToStaticMarkup(React.createElement(session.SourceMessage, { item, sessionKey: "s" }));
    assert.doesNotMatch(html, /Attached file:/, item === live ? "live" : "history");
    assert.match(html, /summarize/);
    assert.match(html, /notes\.md/);
  }
});

test("thread previews, first-send names, recall, copy, rewind, export and the queue read without the note", () => {
  assert.equal(shownPreview("summarize\n\n[Attached file: /w/notes.md]"), "summarize");
  assert.equal(shownPreview("\n\n[Attached file: /w/notes.md]\n[Attached file: /w/b.pdf]"), "notes.md, b.pdf", "files only → names");
  assert.equal(shownPreview("summarize\n\n[Attached file: /w/no"), "summarize", "a cut note goes too");
  assert.equal(shownPreview("plain"), "plain");
  const thread = { id: "a", preview: "plain" };
  assert.equal(shownThread(thread), thread, "untouched threads keep their identity");
  assert.equal(shownThread({ id: "b", preview: "x\n\n[Attached file: /p/y.txt]" }).preview, "x");
  // Codex refuses an empty thread name, so a message that is only files is named after them.
  assert.equal(firstMessageName("", [file("/w/notes.md")]), "notes.md");
  assert.equal(firstMessageName("line one\nline two", [], { max: 80, firstLine: true }), "line one");
  assert.equal(firstMessageName("   ", []), "");
  // A core that titles its sessions (generatesTitles) keeps its own title; others get the first-message name.
  assert.match(mainSource, /if \(name\.trim\(\) && !coreSupports\(boot\?\.core, "generatesTitles"\)\) await rpc\("thread\/name\/set"/);
  assert.match(mainSource, /list(?:\.map\(\w+\))*\.map\(shownThread\)/, "every session row goes through shownThread");
  assert.deepEqual(humanPrompts(shownUserItems([history])), ["summarize"]);
  assert.equal(messageItemText(shownUserItem(live)), "summarize");
  assert.deepEqual(rewindChoices(shownTurns([{ id: "t1", items: [history] }])), [{ id: "t1", text: "summarize" }]);
  assert.doesNotMatch(transcriptMarkdown(shownThread({ id: "a", preview: history.content[0].text }), shownTurns([{ id: "t1", items: [history] }])), /Attached file/);
  const queue = queueFromList(shownQueueList({ data: [{ id: "q1", input: live.content }] }), "a");
  assert.doesNotMatch(queue.entries[0].preview, /Attached file/);
  const draft = editableDraft(queue.entries[0]);
  assert.equal(draft.text, "summarize");
  assert.deepEqual(draft.attachments.map((part) => part.path), ["/w/notes.md"]);
  for (const call of ["shownQueueList(result)", "rewindChoices(shownTurns(", "transcriptMarkdown(shownThread(", "messageItemText(shownUserItem(", "humanPrompts(shownUserItems("])
    assert.ok(mainSource.includes(call), call);
});

test("an MCP elicitation belongs to the newest in-progress tool call of its server in its turn", () => {
  const request = { method: "mcpServer/elicitation/request", params: { threadId: "a", turnId: "t1", serverName: "probe", mode: "form",
    message: "Allow the probe MCP server to run tool \"lookup\"?", requestedSchema: { type: "object", properties: {} }, _meta: { codex_approval_kind: "mcp_tool_call" } } };
  const items = [
    { id: "m0", type: "mcpToolCall", server: "probe", tool: "old", status: "completed", turnId: "t1" },
    { id: "m1", type: "mcpToolCall", server: "other", tool: "lookup", status: "inProgress", turnId: "t1" },
    { id: "m2", type: "mcpToolCall", server: "probe", tool: "lookup", status: "inProgress", turnId: "t1", arguments: { q: "x" } },
    { id: "m3", type: "mcpToolCall", server: "probe", tool: "lookup", status: "inProgress", turnId: "t0" },
  ];
  assert.equal(elicitationItem(request, items)?.id, "m2");
  assert.equal(approvalItem(request, items)?.id, "m2");
  assert.deepEqual([...pendingElicitationItemIds([request], items)], ["m2"]);
  assert.equal(elicitationItem({ ...request, params: { ...request.params, turnId: null } }, items), undefined, "no turn matches only an item without one");
  assert.equal(approvalItem({ method: "item/commandExecution/requestApproval", params: { itemId: "m0" } }, items)?.id, "m0");
  const model = approvalCardModel(request, approvalItem(request, items));
  assert.match(model.title, /lookup \(probe\)/);
  assert.match(mainSource, /item=\{approvalItem\(a, items\)\}/);
  assert.match(mainSource, /pendingElicitationItemIds\(approvals, items\)/);
});

test("parallel MCP calls: the approval card shows the request's own call, never a guessed sibling", () => {
  const ask = (meta, message = "Allow the git MCP server to run tool \"delete_branch\"?") => ({ method: "mcpServer/elicitation/request",
    params: { threadId: "a", turnId: "t1", serverName: "git", mode: "form", message, requestedSchema: { type: "object", properties: {} },
      _meta: { codex_approval_kind: "mcp_tool_call", ...meta } } });
  // Call A asks first; call B started later in the same turn on the same server.
  const items = [
    { id: "a1", type: "mcpToolCall", server: "git", tool: "delete_branch", status: "inProgress", turnId: "t1", arguments: { name: "main" } },
    { id: "b1", type: "mcpToolCall", server: "git", tool: "list_branches", status: "inProgress", turnId: "t1", arguments: {} },
  ];
  const request = ask({ tool_params: { name: "main" } });
  assert.equal(elicitationItem(request, items)?.id, "a1", "arguments equal to _meta.tool_params pick the call");
  assert.deepEqual([...pendingElicitationItemIds([request], items)], ["a1"]);
  const model = approvalCardModel(request, approvalItem(request, items));
  assert.match(model.title, /delete_branch \(git\)/);
  assert.doesNotMatch(model.title, /list_branches/);
  assert.deepEqual(model.detail?.value, { name: "main" });

  // Same tool twice with different arguments (templated params, no fallback wording): no item, the request's _meta wins.
  const twin = [items[0], { ...items[0], id: "a2", arguments: { name: "dev" } }];
  const templated = ask({ tool_title: "Delete branch", tool_params: { branch: "main" } }, "Delete the branch?");
  assert.equal(elicitationItem(templated, twin), undefined);
  assert.deepEqual([...pendingElicitationItemIds([templated], twin)], []);
  // Even when a caller hands over a wrong item, the card reads the request's own title and arguments.
  const guarded = approvalCardModel(templated, items[1]);
  assert.match(guarded.title, /Delete branch \(git\)/);
  assert.deepEqual(guarded.detail?.value, { branch: "main" });

  // Two running calls and no _meta to tell them apart: neither row is marked, the card falls back to the server.
  const bare = ask({}, "May I?");
  assert.equal(elicitationItem(bare, items), undefined);
  assert.match(approvalCardModel(bare, elicitationItem(bare, items)).title, /use a tool from git/);
  // Arguments arriving as a JSON string still match; one lone call with rewritten params is still its row.
  assert.equal(elicitationItem(request, [{ ...items[0], arguments: "{\"name\":\"main\"}" }, items[1]])?.id, "a1");
  assert.equal(elicitationItem(ask({ tool_params: { branch: "main" } }), [items[0]])?.id, "a1");
  // A core that sends no _meta still borrows the lone item's heading and arguments.
  const lone = approvalCardModel(bare, elicitationItem(bare, [items[1]]));
  assert.match(lone.title, /list_branches \(git\)/);
  assert.equal(lone.detail, null, "empty arguments show no detail");
});

test("Plan → implement handoff: offered after a finished Plan turn with a plan item, on cores without permission hints", () => {
  const items = [
    { id: "u1", type: "userMessage", turnId: "t1", content: [] },
    { id: "p1", type: "plan", turnId: "t1", text: "1. Do it" },
  ];
  const base = { items, hints: false, permission: "plan", mode: "code" };
  assert.deepEqual(planHandoff(base), { turnId: "t1", planItemId: "p1" });
  assert.equal(planHandoff({ ...base, hints: true }), null, "a core with permission hints has its own plan review");
  assert.equal(planHandoff({ ...base, permission: "auto" }), null);
  assert.equal(planHandoff({ ...base, mode: "chat" }), null);
  assert.equal(planHandoff({ ...base, running: true }), null);
  assert.equal(planHandoff({ ...base, waiting: true }), null);
  assert.equal(planHandoff({ ...base, answered: "t1" }), null, "Stay in Plan / Implement put it away for that turn");
  assert.equal(planHandoff({ ...base, turnErrors: { t1: { message: "x" } } }), null);
  assert.equal(planHandoff({ ...base, items: [...items, { id: "u2", type: "userMessage", turnId: "t2", content: [] }] }), null, "only the newest turn");
  assert.equal(planHandoff({ ...base, items: [items[0], { ...items[1], text: " " }] }), null, "an empty plan");
  // Implement: the mode an approved plan continues in, Codex's own message, and the default collaboration mode.
  assert.deepEqual(planImplementationTurn("acceptEdits"), { text: PLAN_IMPLEMENTATION_MESSAGE, permission: "acceptEdits" });
  assert.equal(planImplementationTurn("bypass").permission, "auto", "Bypass keeps its own confirmation");
  assert.equal(turnPermissionParams({ permission: "auto", cwd: "/w" }).collaborationMode.mode, "default");
  assert.match(mainSource, /turnOptions\(turnCwd, next\.permission\)/);
  assert.match(mainSource, /<SourcePlanHandoffCard /);
});

test("the handoff card wears the plan card: Stay in Plan, Implement in Manual, the target mode as primary", () => {
  assert.deepEqual(session.planHandoffActions("auto").right.map((action) => action.label), ["Implement", "Implement and auto mode"]);
  assert.deepEqual(session.planHandoffActions("ask").right.map((action) => action.key), ["primary"]);
  assert.equal(session.planHandoffActions("acceptEdits").left[0].label, "Stay in Plan");
  // xee 'More accept options': the other trust-forward modes, Bypass only while it is available.
  assert.deepEqual(session.planHandoffActions("auto").more.map((option) => option.mode), ["acceptEdits"]);
  assert.deepEqual(session.planHandoffActions("auto", { bypass: true }).more.map((option) => option.label), ["Implement and allow edits", "Implement and bypass permissions"]);
  assert.equal(session.planHandoffActions("bypass").right.at(-1).label, "Implement and auto mode");
  assert.equal(session.planHandoffActions("bypass", { bypass: true }).right.at(-1).label, "Implement and bypass permissions");
  const html = renderToStaticMarkup(React.createElement(session.SourcePlanHandoffCard, { handoffKey: "a:t1", target: "acceptEdits", onImplement() {}, onStay() {}, onOpenPlan() {} }));
  assert.match(html, /class="source-message sac-card spc-card"/);
  assert.match(html, /data-approval-kind="plan-handoff"/);
  assert.match(html, /Implement this plan\?/);
  assert.match(html, /Implement and allow edits/);
  assert.match(html, /Open plan/);
});

test("new copy has zh-CN entries", () => {
  for (const key of ["Implement this plan?", "Implement", "Implement and allow edits", "Implement and auto mode", "Stay in Plan",
    "/{command} can’t take attachments. Remove them, or send them in a message.", "Sign in in your browser to continue."])
    assert.ok(typeof zhCN[key] === "string" && zhCN[key], key);
});
