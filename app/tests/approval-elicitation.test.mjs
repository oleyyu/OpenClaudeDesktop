// mcpServer/elicitation/request end to end: card model, draft runtime payload, main-process
// response mapping (codex-schema-0.155.1 McpServerElicitationRequest{Params,Response}).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { approvalAnnouncement, approvalCardModel, approvalKeyIntent, elicitationFields, elicitationFormContent, elicitationInitialValues } from "../src/approval-card-model.mjs";
import { approvalIdentity, createApprovalDraftRuntime, visibleApprovals } from "../src/approval-draft-model.mjs";
const require = createRequire(import.meta.url);
const { approvalResponse, respondToApproval } = require("../electron/respond-approval.cjs");
const { CodexClient } = require("../electron/codex.cjs");

const METHOD = "mcpServer/elicitation/request";
const bridge = () => ({ connectionId: "connection-a", instanceId: `instance-${Math.random()}` });
const elicitation = (params, id = 9) => ({ id, method: METHOD, bridgeApproval: bridge(),
  params: { threadId: "thread-a", turnId: "turn-a", serverName: "probe", ...params } });
// As Codex 0.155.1 sends an MCP tool approval (probe evidence in the audit, core
// mcp_tool_call.rs build_mcp_tool_approval_elicitation_request).
const toolApproval = (meta = {}) => elicitation({ mode: "form",
  message: 'Allow the probe MCP server to run tool "write_note"?', requestedSchema: { type: "object", properties: {} },
  _meta: { codex_approval_kind: "mcp_tool_call", persist: ["session", "always"], tool_params: { text: "hi" },
    tool_params_display: [{ name: "text", value: "hi", display_name: "Text" }], ...meta } });
const formSchema = { type: "object", required: ["title", "count"], properties: {
  title: { type: "string", title: "Title", minLength: 2 },
  count: { type: "integer", title: "Count", minimum: 1, maximum: 5 },
  notify: { type: "boolean", title: "Notify me", default: true },
  tier: { type: "string", title: "Tier", oneOf: [{ const: "basic", title: "Basic" }, { const: "pro", title: "Pro" }] },
  legacy: { type: "string", enum: ["a", "b"], enumNames: ["Alpha", "Beta"] },
  tags: { type: "array", title: "Tags", items: { type: "string", enum: ["unit", "ui"] }, maxItems: 1 },
  email: { type: "string", format: "email" },
} };
const form = () => elicitation({ mode: "form", message: "Tell the probe about this run.", requestedSchema: formSchema });
const url = (link = "https://probe.example.invalid/authorize") => elicitation({ mode: "url", elicitationId: "e-1", message: "Sign in to continue.", url: link });

test("an MCP tool-call approval is a tool card: Deny, Allow for this session (persist offered), Allow once", () => {
  const model = approvalCardModel(toolApproval());
  assert.equal(model.kind, "elicitation");
  assert.equal(model.supported, true);
  assert.equal(model.title, "Allow DeepSeek to use write_note (probe)?");
  assert.deepEqual(model.heading, { action: "use write_note (probe)", meta: null });
  // Codex's fallback wording is the heading already; it is not repeated as a message.
  assert.equal(model.message, null);
  assert.deepEqual(model.detail, { kind: "arguments", text: "Text: hi", value: [{ name: "text", value: "hi", display_name: "Text" }] });
  // 2.42304.0 c96d752d0 Kk mcp__: what Claude sent carries the loose read gate (no desktop terminal connector here).
  assert.deepEqual(model.rowsReadGate, { hint: "Scroll through what Claude sent to allow it.", loose: true });
  assert.deepEqual(model.elicitation.rowsReadGate, model.rowsReadGate);
  assert.deepEqual(model.deny, { key: "decline", label: "Deny", primary: false });
  // persist ['session','always']: Codex's 'Always allow' is Claude's persistent button, before the session one.
  assert.deepEqual(model.allows.map(allow => allow.key), ["acceptAlways", "acceptForSession", "accept"]);
  assert.equal(model.allows.find(allow => allow.persistent).label, "Always allow");
  assert.equal(model.allows.find(allow => allow.primary).label, "Allow once");
  assert.equal(approvalAnnouncement(model), "Permission requested: use write_note (probe). Text: hi");
  // No session persist offered → no session button; the ⌘⇧⏎ chord is suppressed.
  const once = approvalCardModel(toolApproval({ persist: undefined }));
  assert.deepEqual(once.allows.map(allow => allow.key), ["accept"]);
  assert.deepEqual(approvalKeyIntent({ key: "Enter", metaKey: true, shiftKey: true }, { target: "card", model: once }), { type: "suppress" });
  assert.deepEqual(approvalKeyIntent({ key: "Escape" }, { target: "card", model: once }), { type: "action", action: "decline" });
});

test("tool approval copy: the request's own tool and arguments, a correlated item only for what it leaves out", () => {
  const item = { type: "mcpToolCall", server: "probe", tool: "other_tool", arguments: { text: "from item" } };
  // The request's _meta describes the exact call being approved; an item never overrides it.
  const fromMeta = approvalCardModel(toolApproval(), item);
  assert.equal(fromMeta.title, "Allow DeepSeek to use write_note (probe)?");
  assert.equal(fromMeta.detail.text, "Text: hi");
  // A request without tool _meta or fallback wording borrows the correlated item's heading and arguments.
  const bare = toolApproval({ tool_params: undefined, tool_params_display: undefined });
  delete bare.params._meta.tool_params;
  delete bare.params._meta.tool_params_display;
  bare.params.message = "May I?";
  const fromItem = approvalCardModel(bare, item);
  assert.equal(fromItem.title, "Allow DeepSeek to use other_tool (probe)?");
  assert.equal(fromItem.detail.kind, "arguments");
  assert.match(fromItem.detail.text, /from item/);
  const titled = approvalCardModel(toolApproval({ tool_title: "Write a note", tool_description: "Saves a note." }));
  assert.equal(titled.title, "Allow DeepSeek to use Write a note (probe)?");
  assert.deepEqual(titled.context, [{ key: "tool-description", text: "Saves a note." }]);
  const template = toolApproval();
  template.params.message = "Allow Calendar to create an event?";
  const templated = approvalCardModel(template);
  assert.equal(templated.title, "Allow DeepSeek to use a tool from probe?");
  assert.equal(templated.message, "Allow Calendar to create an event?");
  // tool_params without display rows fall back to pretty JSON.
  const raw = approvalCardModel(toolApproval({ tool_params_display: undefined }));
  assert.equal(raw.detail.text, JSON.stringify({ text: "hi" }, null, 2));
  assert.equal(raw.rowsReadGate.loose, true);
  // The item's arguments are gated the same way; a call with nothing sent has no rows and no gate.
  assert.equal(fromItem.rowsReadGate.loose, true);
  const empty = approvalCardModel(toolApproval({ tool_params: {}, tool_params_display: [] }));
  assert.equal(empty.detail, null);
  assert.equal(empty.rowsReadGate, undefined);
});

test("a message-only server request asks for approval; url, form and unknown modes keep a way out", () => {
  const confirm = approvalCardModel(elicitation({ mode: "form", message: "Proceed?", requestedSchema: { type: "object", properties: {} } }));
  assert.equal(confirm.elicitation.mode, "confirm");
  assert.equal(confirm.title, "probe is asking for your approval");
  assert.equal(confirm.message, "Proceed?");
  assert.deepEqual(confirm.allows.map(allow => [allow.key, allow.label]), [["accept", "Allow"]]);
  assert.equal(confirm.rowsReadGate, undefined, "a server's own confirm sends no tool arguments");

  const link = approvalCardModel(url());
  assert.equal(link.elicitation.mode, "url");
  assert.equal(link.elicitation.openable, true);
  assert.deepEqual(link.detail, { kind: "url", text: "https://probe.example.invalid/authorize", value: "https://probe.example.invalid/authorize" });
  assert.deepEqual([link.deny.label, ...link.allows.map(allow => allow.label)], ["Decline", "Done"]);
  const script = approvalCardModel(url("javascript:alert(1)"));
  assert.equal(script.elicitation.openable, false);
  assert.deepEqual(script.context.map(part => part.key), ["url-unopenable"]);

  const fields = approvalCardModel(form());
  assert.equal(fields.elicitation.mode, "form");
  assert.equal(fields.title, "probe is asking for information");
  assert.deepEqual([fields.deny.key, ...fields.allows.map(allow => allow.label)], ["decline", "Submit"]);

  for (const params of [{ mode: "openai/form", message: "x", requestedSchema: {} },
    { mode: "form", message: "x", requestedSchema: { type: "object", properties: { nested: { type: "object" } } } },
    { mode: "mystery", message: "x" }]) {
    const model = approvalCardModel(elicitation(params));
    assert.equal(model.elicitation.mode, "unsupported");
    assert.equal(model.supported, true);
    assert.deepEqual(model.deny, { key: "decline", label: "Decline", primary: false });
    assert.deepEqual(model.allows, []);
  }
});

test("form fields: every primitive schema shape, defaults, and validation before submit", () => {
  const fields = elicitationFields(formSchema);
  assert.deepEqual(fields.map(field => [field.id, field.type, field.required]), [
    ["title", "text", true], ["count", "integer", true], ["notify", "boolean", false], ["tier", "select", false],
    ["legacy", "select", false], ["tags", "multiselect", false], ["email", "text", false]]);
  assert.deepEqual(fields.find(field => field.id === "legacy").options, [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]);
  const values = elicitationInitialValues(fields);
  assert.deepEqual(values, { title: "", count: "", notify: true, tier: "", legacy: "", tags: [], email: "" });
  assert.deepEqual(elicitationFormContent(fields, values), { error: "Title is required.", fieldId: "title" });
  assert.equal(elicitationFormContent(fields, { ...values, title: "x" }).error, "Title must be at least 2 characters.");
  assert.equal(elicitationFormContent(fields, { ...values, title: "ok", count: "1.5" }).error, "Count must be a whole number.");
  assert.equal(elicitationFormContent(fields, { ...values, title: "ok", count: "9" }).error, "Count must be at most 5.");
  assert.equal(elicitationFormContent(fields, { ...values, title: "ok", count: "2", tags: ["unit", "ui"] }).error, "Choose at most 1 option for Tags.");
  assert.equal(elicitationFormContent(fields, { ...values, title: "ok", count: "2", email: "nope" }).error, "email must be an email address.");
  assert.deepEqual(elicitationFormContent(fields, { ...values, title: "ok", count: "2", tier: "pro", tags: ["ui"] }),
    { content: { title: "ok", count: 2, notify: true, tier: "pro", tags: ["ui"] } });
  assert.equal(elicitationFields({ type: "object", properties: { n: { type: "number" }, bad: { type: "string", enum: [1] } } }), null);
});

test("the draft runtime accepts elicitation identities and maps each action to its payload", async () => {
  const request = toolApproval();
  assert.equal(approvalIdentity(request).method, METHOD);
  assert.equal(approvalIdentity(request).itemId, null);
  // An answerable request holds the one-card queue like any approval.
  const second = toolApproval();
  assert.deepEqual(visibleApprovals([request, second]), [request]);
  const sent = [];
  const respond = async payload => { sent.push(payload); return { ok: true, identity: request.bridgeApproval }; };
  for (const action of ["acceptForSession", "accept", "decline", "cancel"]) {
    const runtime = createApprovalDraftRuntime();
    runtime.reconcile([request]);
    const result = await runtime.submit(runtime.ticketFor(request), action, respond, { getVisibleThreadId: () => "thread-a" });
    assert.equal(result.status, "answered");
  }
  assert.deepEqual(sent.map(payload => payload.elicitation), [
    { action: "accept", persist: "session" }, { action: "accept" }, { action: "decline" }, { action: "cancel" }]);
  const runtime = createApprovalDraftRuntime(), formRequest = form();
  runtime.reconcile([formRequest]);
  await runtime.submit(runtime.ticketFor(formRequest), "accept", respond, { getVisibleThreadId: () => "thread-a", response: { content: { title: "ok", count: 2 } } });
  assert.deepEqual(sent.at(-1).elicitation, { action: "accept", content: { title: "ok", count: 2 } });
  const other = createApprovalDraftRuntime();
  other.reconcile([request]);
  await assert.rejects(other.submit(other.ticketFor(request), "allow", respond, { getVisibleThreadId: () => "thread-a" }), /Unsupported approval decision/);
});

test("main-process mapping: McpServerElicitationRequestResponse per mode, with persist and schema checks", () => {
  const approval = toolApproval();
  assert.deepEqual(approvalResponse(approval, { elicitation: { action: "accept" } }), { action: "accept", content: {} });
  assert.deepEqual(approvalResponse(approval, { elicitation: { action: "accept", persist: "session" } }),
    { action: "accept", content: {}, _meta: { persist: "session" } });
  assert.deepEqual(approvalResponse(approval, { elicitation: { action: "decline" } }), { action: "decline" });
  assert.deepEqual(approvalResponse(approval, { elicitation: { action: "cancel" } }), { action: "cancel" });
  // persist must be offered by the request; "always" (Codex saves the approval) only where it is offered.
  assert.throws(() => approvalResponse(toolApproval({ persist: undefined }), { elicitation: { action: "accept", persist: "session" } }), /cannot be remembered/);
  assert.deepEqual(approvalResponse(approval, { elicitation: { action: "accept", persist: "always" } }), { action: "accept", content: {}, _meta: { persist: "always" } });
  assert.throws(() => approvalResponse(toolApproval({ persist: ["session"] }), { elicitation: { action: "accept", persist: "always" } }), /cannot be remembered/);
  for (const bad of [undefined, null, { action: "allow" }, { action: "decline", persist: "session" }, { action: "accept", extra: 1 }, { action: "accept", content: { x: 1 } }])
    assert.throws(() => approvalResponse(approval, { elicitation: bad }), { code: "invalid_response" });

  assert.deepEqual(approvalResponse(url(), { elicitation: { action: "accept" } }), { action: "accept" });
  assert.throws(() => approvalResponse(url(), { elicitation: { action: "accept", content: {} } }), { code: "invalid_response" });
  const unsupported = elicitation({ mode: "openai/form", message: "x", requestedSchema: {} });
  assert.throws(() => approvalResponse(unsupported, { elicitation: { action: "accept" } }), /only be declined/);
  assert.deepEqual(approvalResponse(unsupported, { elicitation: { action: "decline" } }), { action: "decline" });

  const request = form();
  const fields = elicitationFields(formSchema);
  const { content } = elicitationFormContent(fields, { ...elicitationInitialValues(fields), title: "ok", count: "3", legacy: "b", tags: ["unit"] });
  // What the card builds is exactly what main accepts.
  assert.deepEqual(approvalResponse(request, { elicitation: { action: "accept", content } }), { action: "accept", content });
  for (const bad of [{ title: "ok" }, { title: "ok", count: 3.5 }, { title: "ok", count: 9 }, { title: "ok", count: 2, tier: "gold" },
    { title: "ok", count: 2, tags: ["unit", "ui"] }, { title: "ok", count: 2, unknown: true }, { title: "x", count: 2 }, { title: "ok", count: "2" }])
    assert.throws(() => approvalResponse(request, { elicitation: { action: "accept", content: bad } }), /Fill in the form/);
});

test("over the real client transport the response reaches the server without bridge fields", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "approval-elicitation-test-"));
  const binary = path.join(directory, "server.cjs");
  const source = await fs.readFile(new URL("./fixtures/approval-protocol-server.cjs", import.meta.url), "utf8");
  await fs.writeFile(binary, source.replace(/^#![^\n]*/, `#!${process.execPath}`), { mode: 0o755 });
  const client = new CodexClient({ binary, shutdownTimeout: 150, shutdownHardTimeout: 2000, env: { APPROVAL_TEST_LOG: path.join(directory, "responses.jsonl") } });
  const events = [];
  client.on("event", event => events.push(event));
  t.after(async () => { await client.stopAndWait(); await fs.rm(directory, { recursive: true, force: true }); });
  await client.start();
  const { bridgeApproval: _ignored, ...wire } = toolApproval();
  await client.request("fixture/request", { ...wire, id: 41 });
  const request = events.filter(event => event.kind === "request").at(-1);
  assert.equal(request.method, METHOD);
  assert.equal(respondToApproval(client, { id: 41, expected: request.bridgeApproval, elicitation: { action: "accept", persist: "session" } }).ok, true);
  assert.deepEqual(await client.request("fixture/responses"), [{ id: 41, result: { action: "accept", content: {}, _meta: { persist: "session" } } }]);
});
