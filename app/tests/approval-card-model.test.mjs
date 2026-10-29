import test, { after } from "node:test";
import assert from "node:assert/strict";
import { approvalAnnouncement, approvalCardModel, approvalActionIndex, approvalHasVisibleIntersection, approvalKeyIntent, createApprovalHotkeyArming, detailsOverflow, PREVIEW_TOO_LARGE, scrollRegionProps } from "../src/approval-card-model.mjs";
const command = params => ({ id: 7, method: "item/commandExecution/requestApproval", params });
const permissions = params => ({ id: "7", method: "item/permissions/requestApproval", params });
const file = params => ({ id: 8, method: "item/fileChange/requestApproval", params });
const enter = extra => ({ key: "Enter", ...extra });

test("command details retain exact text; the reason has its own slot beside cwd and network context", () => {
  const raw = "printf '%s\\n' '<script>&\\\"'\n# trailing\n";
  const request = command({ command: raw, reason: "Needs a real API response", cwd: "/tmp/project with spaces",
    networkApprovalContext: { protocol: "https", host: "example.test:8443" } });
  const model = approvalCardModel(request);
  assert.equal(model.detail.text, raw);
  // approval-current.js:15275-15284: the decision reason is its own block, never context.
  assert.equal(model.reason, "Needs a real API response");
  assert.deepEqual(model.context, [
    { key: "cwd", text: "Working directory: /tmp/project with spaces" },
    { key: "network", text: "Network access: https://example.test:8443" },
  ]);
  assert.equal(request.params.command, raw);
});

test("reason slot: file and permission reasons move too; blank or absent reasons are null", () => {
  const fileModel = approvalCardModel(file({ reason: "Needs danger-full-access: write /x", grantRoot: "/tmp/allowed" }));
  assert.equal(fileModel.reason, "Needs danger-full-access: write /x");
  assert.deepEqual(fileModel.context.map(part => part.key), ["grant-root", "missing-detail"]);
  assert.equal(approvalCardModel(permissions({ reason: "Write report", permissions: {} })).reason, "Write report");
  assert.equal(approvalCardModel(command({ command: "true", reason: "  " })).reason, null);
  assert.equal(approvalCardModel(command({ command: "true" })).reason, null);
  assert(!approvalCardModel(command({ command: "true", reason: "Why" })).context.some(part => part.key === "reason"));
});

test("sessionGrantable:false leaves only Deny and Allow once; the shifted chord then does nothing", () => {
  for (const request of [command({ command: "touch /x", sessionGrantable: false }), file({ sessionGrantable: false })]) {
    const model = approvalCardModel(request, { changes: [{ path: "/x", kind: { type: "add" } }] });
    assert.equal(model.deny.key, "decline");
    assert.deepEqual(model.allows.map(action => action.key), ["accept"]);
    assert.equal(model.allows[0].primary, true);
    // approval-hotkeys-current.js:100 allowPersistent?.(): swallowed, never upgraded or downgraded.
    assert.deepEqual(approvalKeyIntent(enter({ metaKey: true, shiftKey: true }), { target: "card", model }), { type: "suppress" });
    assert.deepEqual(approvalKeyIntent(enter({ metaKey: true }), { target: "card", model }), { type: "action", action: "accept" });
  }
  // Codex servers never send the field; true behaves the same.
  for (const sessionGrantable of [undefined, true])
    assert.deepEqual(approvalCardModel(command({ command: "true", sessionGrantable })).allows.map(action => action.key), ["acceptForSession", "accept"]);
});

test("item headings follow the source per-tool copy (approval-current.js:14508-14595)", () => {
  const json = value => JSON.stringify(value, null, 2);
  // Bash with a description: "run" + description, the command as clamped detail.
  const bash = approvalCardModel(command({ command: "npm test -- --watch=false", cwd: "/w" }),
    { type: "commandExecution", command: "npm test -- --watch=false", description: "Run the  unit\ntests" });
  assert.equal(bash.title, "Allow DeepSeek to run Run the unit tests?");
  assert.deepEqual(bash.heading, { action: "run", meta: "Run the unit tests" });
  assert.equal(bash.clampTitle, true);
  assert.deepEqual(bash.detail, { kind: "command", text: "npm test -- --watch=false", value: "npm test -- --watch=false" });
  // EM has no working-directory row (approval-current.js:14507-14515, :15561-15591).
  assert.deepEqual(bash.context, []);
  // The item-less fallback keeps its local Working directory line.
  assert.deepEqual(approvalCardModel(command({ command: "ls", cwd: "/w" })).context.map(part => part.key), ["cwd"]);
  // Without a description the generic title stays.
  const plain = approvalCardModel(command({ command: "ls" }), { type: "commandExecution", command: "ls" });
  assert.equal(plain.title, "Allow DeepSeek to run this command?");
  assert.equal(plain.heading, undefined);

  // DeepSeek subagent: "run an agent" + description and no detail at all (Task/Agent,
  // approval-current.js:14570-14579); the bridge's "<tool> <json>" command loses to the item.
  const args = { description: "Audit the parser", prompt: "Read src/parse.js\nand list bugs" };
  const agent = approvalCardModel(command({ command: `subagent ${JSON.stringify(args)}`, cwd: "/w" }),
    { type: "dynamicToolCall", tool: "subagent", arguments: args });
  assert.equal(agent.title, "Allow DeepSeek to run an agent Audit the parser?");
  assert.deepEqual(agent.heading, { action: "run an agent", meta: "Audit the parser" });
  assert.equal(agent.detail, null);
  assert.equal(agent.clampTitle, undefined);
  assert.deepEqual(agent.context, []);
  assert.equal(approvalCardModel(command({}), { type: "dynamicToolCall", tool: "subagent", arguments: { description: "Say hello", prompt: "Greet" } }).title,
    "Allow DeepSeek to run an agent Say hello?");
  // Without a description the prompt's first line stays the meta.
  const fork = approvalCardModel(command({}), { type: "dynamicToolCall", tool: "subagent_fork", arguments: { prompt: "Try the other approach\nthen report" } });
  assert.deepEqual(fork.heading, { action: "run an agent", meta: "Try the other approach" });
  assert.equal(fork.detail, null);
  const spawn = approvalCardModel(command({}), { type: "collabAgentToolCall", tool: "spawnAgent", prompt: "Index the repo\nquickly" });
  assert.deepEqual(spawn.heading, { action: "run an agent", meta: "Index the repo" });
  assert.equal(spawn.detail, null);
  // The DeepSeek core's spawn row keeps the delegation description: it names the agent.
  const described = approvalCardModel(command({}), { type: "collabAgentToolCall", tool: "spawnAgent", prompt: "Index the repo\nquickly", description: "Index repo" });
  assert.equal(described.title, "Allow DeepSeek to run an agent Index repo?");
  assert.equal(described.clampTitle, undefined);
  assert.equal(described.detail, null);

  assert.deepEqual(approvalCardModel(command({}), { type: "dynamicToolCall", tool: "skill", arguments: { name: "pdf" } }).heading, { action: "run skill", meta: "/pdf" });
  assert.equal(approvalCardModel(command({}), { type: "dynamicToolCall", tool: "skill", arguments: { name: "pdf" } }).detail, null);
  assert.equal(approvalCardModel(command({}), { type: "dynamicToolCall", tool: "web_fetch", arguments: { url: "https://a.test/x" } }).title, "Allow DeepSeek to fetch https://a.test/x?");
  assert.equal(approvalCardModel(command({}), { type: "webSearch", action: { type: "openPage", url: "https://b.test" } }).title, "Allow DeepSeek to fetch https://b.test?");
  assert.equal(approvalCardModel(command({}), { type: "dynamicToolCall", tool: "web_search", arguments: { queries: ["a", "b"] } }).title, "Allow DeepSeek to search the web a, b?");
  assert.equal(approvalCardModel(command({}), { type: "webSearch", query: "q", action: { type: "search", query: "q" } }).title, "Allow DeepSeek to search the web q?");

  // MCP: "use tool (server)" + pretty JSON; any other tool: "use tool".
  const mcp = approvalCardModel(command({ command: "mcp__github__create_issue {}" }),
    { type: "mcpToolCall", server: "github", tool: "create_issue", arguments: { title: "Bug" } });
  assert.equal(mcp.title, "Allow DeepSeek to use create_issue (github)?");
  assert.deepEqual(mcp.heading, { action: "use create_issue (github)", meta: null });
  assert.equal(mcp.detail.text, json({ title: "Bug" }));
  const other = approvalCardModel(command({ command: "send_message {}" }), { type: "dynamicToolCall", tool: "send_message", arguments: { to: "a1", text: "hi" } });
  assert.equal(other.title, "Allow DeepSeek to use send_message?");
  assert.equal(other.detail.text, json({ to: "a1", text: "hi" }));
  const bare = approvalCardModel(command({ command: "job_list {}" }), { type: "dynamicToolCall", tool: "job_list", arguments: {} });
  assert.equal(bare.title, "Allow DeepSeek to use job_list?");
  assert.equal(bare.detail, null);
  assert(!bare.context.some(part => part.key === "missing-detail"));

  // No item: unchanged generic copy; stdin approvals keep theirs.
  assert.equal(approvalCardModel(command({ command: "subagent {}" })).title, "Allow DeepSeek to run this command?");
  assert.equal(approvalCardModel(command({ command: "subagent {}" })).detail.text, "subagent {}");
  assert.match(approvalCardModel(command({ kind: "writeStdin" }), { type: "commandExecution", command: "cat", description: "Read input" }).title, /send input/);
});

test("a clamped region is focusable and labelled only while it overflows (cf6ae6197 bv)", () => {
  assert.deepEqual(scrollRegionProps("Reason", false), {});
  assert.deepEqual(scrollRegionProps("Reason", true), { tabIndex: 0, role: "group", "aria-label": "Reason" });
});

test("missing command has no fake disclosure; real item fallback preserves argv boundaries", () => {
  assert.equal(approvalCardModel(command({ reason: "Inspect first" })).detail, null);
  assert.equal(approvalCardModel(command({})).context[0].key, "missing-detail");
  const argv = ["printf", "%s", "argument with spaces", ""];
  assert.deepEqual(JSON.parse(approvalCardModel(command({ kind: "writeStdin" }), { command: argv }).detail.text), argv);
  assert.match(approvalCardModel(command({ kind: "writeStdin" })).title, /send input/);
});

test("file grant root remains context even when a real diff exists; empty changes do not create details", () => {
  const changes = [{ path: "/w/a.js", kind: "update", diff: "@@ -1 +1 @@\n-old\n+new\n" }];
  const model = approvalCardModel(file({ grantRoot: "/tmp/allowed" }), { changes });
  assert.deepEqual(model.detail, { kind: "path", text: "/w/a.js", value: changes });
  assert.equal(model.context[0].text, "Requested write root: /tmp/allowed");
  assert.equal(approvalCardModel(file({ changes: [] })).detail, null);
  // EM y (approval-current.js:15254): a bare file name equals the meta, so there is no
  // detail (no path box, preview or toggle); the heading and context stay.
  const bare = approvalCardModel(file({ grantRoot: "/tmp/allowed" }), { changes: [{ path: "a.js", kind: "update", diff: "+x\n" }] });
  assert.equal(bare.detail, null);
  assert.deepEqual(bare.heading, { action: "edit", meta: "a.js" });
  assert.equal(bare.context[0].key, "grant-root");
});

test("file detail is the full path (SM, approval-current.js:15201-15205); several changes list every path", () => {
  const one = approvalCardModel(file({}), { changes: [{ path: "/w/src/a/b.ts", kind: { type: "add" }, diff: "+x\n" }] });
  assert.equal(one.detail.kind, "path");
  assert.equal(one.detail.text, "/w/src/a/b.ts");
  assert.equal(one.heading.meta, "b.ts");
  assert.equal(one.clampTitle, true);
  assert.equal(one.detail.value[0].diff, "+x\n", "the changes stay the preview source");
  const many = approvalCardModel(file({}), { changes: [{ path: "/w/a.ts", kind: "update", diff: "" }, { path: "/w/b.ts", kind: "update", diff: "" }] });
  assert.equal(many.detail.text, "/w/a.ts\n/w/b.ts");
  assert.equal(many.title, "Allow DeepSeek to edit files?");
  // KS singleLine: control characters are escaped, spaces kept.
  assert.equal(approvalCardModel(file({}), { changes: [{ path: "/w/a  b\nc.ts", kind: "add" }] }).detail.text, "/w/a  b[U+000A]c.ts");
  // params.changes (a sub-agent card) wins over the item and names the same path.
  assert.equal(approvalCardModel(file({ changes: [{ path: "/w/child.ts", kind: { type: "add" }, diff: "" }] })).detail.text, "/w/child.ts");
  // Opaque (non-list) changes keep the raw block.
  assert.equal(approvalCardModel(file({ changes: { odd: true } })).detail.kind, "changes");
});

test("a change over 200,000 characters gets the fM sentence (approval-current.js:14792-14798) and no preview", () => {
  const big = approvalCardModel(file({}), { changes: [{ path: "/w/big.txt", kind: { type: "add" }, diff: "x".repeat(200001) }] });
  assert.deepEqual(big.context, [{ key: "too-large", text: PREVIEW_TOO_LARGE }]);
  assert.match(PREVIEW_TOO_LARGE, /^Preview unavailable \u2014 this change is too large to show here \(over 200,000 characters\)\. The full change appears in the conversation after it runs\.$/);
  assert.deepEqual(approvalCardModel(file({}), { changes: [{ path: "/w/ok.txt", kind: { type: "add" }, diff: "x".repeat(200000) }] }).context, []);
});

test("approvalAnnouncement follows pM (approval-current.js:14799-14905)", () => {
  const bash = approvalCardModel(command({ command: "npm  test\n--watch=false" }),
    { type: "commandExecution", command: "npm test", description: "Run the unit tests" });
  assert.equal(approvalAnnouncement(bash), "Permission requested: run. npm test --watch=false, Run the unit tests");
  const write = approvalCardModel(file({}), { changes: [{ path: "/w/created.ts", kind: { type: "add" }, diff: "+x\n" }] });
  assert.equal(approvalAnnouncement(write), "Permission requested: write. /w/created.ts, created.ts");
  const agent = approvalCardModel(command({}), { type: "dynamicToolCall", tool: "subagent", arguments: { description: "Say hello", prompt: "Greet" } });
  assert.equal(approvalAnnouncement(agent), "Permission requested: run an agent, Say hello");
  // A headingless card announces its own phrase; a long detail is capped at 150 with ", truncated".
  const long = approvalCardModel(command({ command: "x".repeat(200) }));
  assert.equal(approvalAnnouncement(long), `Permission requested: run this command. ${"x".repeat(150)}, truncated`);
  // The decision reason and the too-large sentence follow as extra blocks.
  const reasoned = approvalCardModel(file({ reason: "Needs workspace-write" }), { changes: [{ path: "/w/big.txt", kind: "add", diff: "x".repeat(200001) }] });
  assert.equal(approvalAnnouncement(reasoned), `Permission requested: write. /w/big.txt, big.txt. Needs workspace-write. ${PREVIEW_TOO_LARGE}`);
  assert.equal(approvalAnnouncement(approvalCardModel(permissions({}))), "Permission requested: use these permissions");
});

test("single-file change names the file: EM/SM 'Allow DeepSeek to {write|edit} {basename}?' (approval-current.js:14521-14534, :15201-15205)", () => {
  const one = kind => approvalCardModel(file({}), { changes: [{ path: "src/a/b.ts", kind, diff: "+x\n" }] });
  for (const [kind, action] of [[{ type: "update", move_path: null }, "edit"], [{ type: "add" }, "write"], ["update", "edit"], ["add", "write"], [{ type: "delete" }, "edit"]]) {
    const model = one(kind);
    assert.equal(model.title, `Allow DeepSeek to ${action} b.ts?`);
    assert.deepEqual(model.heading, { action, meta: "b.ts" });
    assert.equal(model.clampTitle, true);
  }
  assert.equal(approvalCardModel(file({}), { changes: [{ path: "C:\\repo\\dir\\ x .ts", kind: { type: "add" } }] }).title, "Allow DeepSeek to write  x .ts?");
  for (const changes of [[], [{ path: "a.ts", kind: "update" }, { path: "b.ts", kind: "update" }], [{ kind: { type: "add" } }], [{ path: " ", kind: "add" }]]) {
    const model = approvalCardModel(file({}), { changes });
    assert.equal(model.title, "Allow DeepSeek to edit files?");
    assert.equal(model.heading, undefined);
    assert.equal(model.clampTitle, undefined);
  }
  assert.equal(approvalCardModel(file({ grantRoot: "/tmp" })).title, "Allow DeepSeek to edit files?");
  assert.equal(approvalCardModel(command({ command: "true" })).title, "Allow DeepSeek to run this command?");
  assert.equal(approvalCardModel(command({ command: "true" })).heading, undefined);
  assert.equal(approvalCardModel(permissions({ permissions: {} })).title, "Allow DeepSeek to use these permissions?");
});

test("permissions preserve every unknown field and expose only turn-scoped allow/deny", () => {
  const raw = { network: { enabled: true }, fileSystem: { read: ["/tmp/a"], write: ["/tmp/b"] }, futureCapability: ["real-value"] };
  const model = approvalCardModel(permissions({ cwd: "/tmp/b", reason: "Write report", permissions: raw }));
  assert.deepEqual(JSON.parse(model.detail.text), raw);
  assert.equal(model.deny.key, "deny");
  assert.deepEqual(model.allows.map(action => action.key), ["allow"]);
  assert(model.context.some(part => part.key === "scope" && part.text === "Applies to this turn only."));
  assert.equal(approvalCardModel(permissions({ permissions: {} })).detail.text, "{}");
  assert.equal(approvalCardModel(permissions({})).detail, null);
});

test("unknown and question methods never gain ordinary approval actions", () => {
  for (const method of ["unsupported/tool", "item/tool/requestUserInput", undefined]) {
    const model = approvalCardModel({ method, params: {} });
    assert.equal(model.supported, false);
    assert.equal(model.deny, null);
    assert.deepEqual(model.allows, []);
    assert.equal(approvalKeyIntent(enter({ metaKey: true }), { target: "card", model }), null);
  }
});

test("card Enter focuses primary; four arrows wrap actions without submitting", () => {
  const model = approvalCardModel(command({ command: "true" }));
  assert.deepEqual(approvalKeyIntent(enter(), { target: "card", model }), { type: "focus-primary" });
  assert.equal(approvalKeyIntent(enter(), { target: "content", model }), null);
  assert.equal(approvalActionIndex("ArrowLeft", 0, 3), 2);
  assert.equal(approvalActionIndex("ArrowDown", 2, 3), 0);
  assert.equal(approvalActionIndex("ArrowUp", -1, 3), 2);
  assert.equal(approvalActionIndex("ArrowRight", -1, 3), 0);
  assert.equal(approvalActionIndex("ArrowDown", 0, 0), null);
});

test("local shortcuts preserve command session versus permission turn semantics", () => {
  const model = approvalCardModel(command({ command: "true" }));
  assert.deepEqual(approvalKeyIntent(enter({ metaKey: true }), { target: "card", model }), { type: "action", action: "accept" });
  assert.deepEqual(approvalKeyIntent(enter({ ctrlKey: true, shiftKey: true }), { target: "actions", model }), { type: "action", action: "acceptForSession" });
  assert.deepEqual(approvalKeyIntent(enter({ metaKey: true, shiftKey: true }), {
    target: "card", model: approvalCardModel(permissions({ permissions: {} })),
  }), { type: "action", action: "allow" });
  assert.deepEqual(approvalKeyIntent({ key: "Escape" }, { target: "card", model, armed: false }), { type: "action", action: "decline" });
});

test("busy/background/menu/editor/IME/alt inputs never become grants; unarmed and repeated activation suppress", () => {
  const base = { target: "card", model: approvalCardModel(command({ command: "true" })) };
  for (const options of [{ busy: true }, { active: false }, { menuOpen: true }, { target: "editor" }])
    assert.equal(approvalKeyIntent(enter({ metaKey: true }), { ...base, ...options }), null);
  for (const properties of [{ isComposing: true }, { nativeEvent: { isComposing: true } }, { keyCode: 229 }, { nativeEvent: { keyCode: 229 } }, { altKey: true }])
    assert.equal(approvalKeyIntent(enter({ metaKey: true, ...properties }), base), null);
  assert.deepEqual(approvalKeyIntent(enter({ metaKey: true }), { ...base, armed: false }), { type: "suppress" });
  assert.deepEqual(approvalKeyIntent(enter({ metaKey: true, repeat: true }), base), { type: "suppress" });
  assert.equal(approvalKeyIntent({ key: "ArrowDown" }, { ...base, target: "content" }), null);
});

test("overflow focus is enabled only when actual scroll height exceeds the viewport", () => {
  assert.equal(detailsOverflow({ scrollHeight: 100, clientHeight: 100 }), false);
  assert.equal(detailsOverflow({ scrollHeight: 100, clientHeight: 99 }), true);
  assert.equal(detailsOverflow({ scrollHeight: 0, clientHeight: 0 }), false);
});

test("keyboard visibility allows partial cards but rejects empty viewport or clipping intersections", () => {
  const viewport = { width: 800, height: 600 };
  const rect = { top: 50, bottom: 250, left: 50, right: 450 };
  const base = { rect, viewport };
  assert.equal(approvalHasVisibleIntersection(base), true);
  assert.equal(approvalHasVisibleIntersection({ ...base, rect: { ...rect, top: 590, bottom: 790 } }), true);
  assert.equal(approvalHasVisibleIntersection({ ...base, rect: { ...rect, top: 600, bottom: 800 } }), false);
  assert.equal(approvalHasVisibleIntersection({ ...base, rect: { ...rect, right: 0, left: -400 } }), false);
  assert.equal(approvalHasVisibleIntersection({ ...base, visible: false }), false);
  assert.equal(approvalHasVisibleIntersection({ ...base, rect: { ...rect, bottom: 50 } }), false);
  const clips = [{ rect: { top: 100, bottom: 200, left: 0, right: 800 }, overflowX: "visible", overflowY: "auto" }];
  assert.equal(approvalHasVisibleIntersection({ ...base, clips }), true);
  assert.equal(approvalHasVisibleIntersection({ ...base, clips: [{ ...clips[0], rect: { top: 250, bottom: 500, left: 0, right: 800 } }] }), false);
  assert.equal(approvalHasVisibleIntersection({ ...base, clips: [...clips,
    { rect: { top: 0, bottom: 600, left: 450, right: 800 }, overflowX: "hidden", overflowY: "visible" }] }), false);
});

test("vertical pixel scroll padding participates in the source intersection, percent/auto values do not", () => {
  const base = { rect: { top: 0, bottom: 20, left: 0, right: 100 }, viewport: { width: 800, height: 600 } };
  const clip = { rect: { top: 0, bottom: 200, left: 0, right: 800 }, overflowX: "visible", overflowY: "scroll" };
  assert.equal(approvalHasVisibleIntersection({ ...base, clips: [{ ...clip, scrollPaddingTop: "20px" }] }), false);
  assert.equal(approvalHasVisibleIntersection({ ...base, clips: [{ ...clip, scrollPaddingTop: "19px" }] }), true);
  assert.equal(approvalHasVisibleIntersection({ ...base, clips: [{ ...clip, scrollPaddingTop: "50%" }] }), true);
  assert.equal(approvalHasVisibleIntersection({ ...base, clips: [{ ...clip, scrollPaddingTop: "auto" }] }), true);
});

test("initial visible observation does not restart the 400ms hotkey clock; real hidden-to-visible does once", () => {
  let now = 0;
  const clock = createApprovalHotkeyArming({ now: () => now });
  now = 300;
  assert.equal(clock.observeVisibility({ intersecting: true, visible: true }), false);
  now = 399; assert.equal(clock.isArmed(), false);
  now = 400; assert.equal(clock.isArmed(), true);
  now = 500; clock.observeVisibility({ intersecting: false, visible: true });
  now = 600; assert.equal(clock.observeVisibility({ intersecting: true, visible: true }), true);
  now = 750; assert.equal(clock.observeVisibility({ intersecting: true, visible: true }), false);
  now = 999; assert.equal(clock.isArmed(), false);
  now = 1000; assert.equal(clock.isArmed(), true);
});

test("clipped geometry independently observes hidden state and pane reactivation has its own grace", () => {
  let now = 0;
  const clock = createApprovalHotkeyArming({ now: () => now, active: true });
  now = 500; clock.observeVisibility({ intersecting: true, visible: false });
  now = 600; assert.equal(clock.observeVisibility({ intersecting: false, visible: true }), false);
  now = 700; assert.equal(clock.observeVisibility({ intersecting: true, visible: true }), true);
  now = 1100; assert.equal(clock.isArmed(), true);
  clock.setActive(false);
  now = 1200; clock.setActive(true);
  now = 1500; clock.setActive(true);
  now = 1599; assert.equal(clock.isArmed(), false);
  now = 1600; assert.equal(clock.isArmed(), true);
});

test("reentry grace suppresses only grant chords, never Escape or ordinary focus navigation", () => {
  let now = 0;
  const clock = createApprovalHotkeyArming({ now: () => now });
  now = 500; clock.observeVisibility({ intersecting: false, visible: false });
  now = 600; clock.observeVisibility({ intersecting: true, visible: true });
  const context = { target: "card", model: approvalCardModel(command({ command: "true" })), armed: clock.isArmed() };
  assert.deepEqual(approvalKeyIntent(enter({ metaKey: true }), context), { type: "suppress" });
  assert.deepEqual(approvalKeyIntent({ key: "Escape" }, context), { type: "action", action: "decline" });
  assert.deepEqual(approvalKeyIntent(enter(), context), { type: "focus-primary" });
});

test("Codex availableDecisions build the buttons: a prefix rule is 'Always allow', an unlisted session grant and decline are not offered", async () => {
  const offered = ["accept", { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["npm", "test"] } }, "cancel"];
  const model = approvalCardModel(command({ command: "npm test", availableDecisions: offered }));
  assert.deepEqual(model.allows.map(allow => allow.key), ["decision:1", "accept"]);
  assert.equal(model.allows[0].label, "Always allow commands that start with “npm test”");
  assert.match(model.allows[0].title, /every session and project/);
  assert.equal(model.allows[0].persistent, true);
  assert.deepEqual(model.deny, { key: "cancel", label: "Deny", primary: false }, "decline isn't offered: Deny is cancel");
  // ⇧⌘↵ picks the persistent allow.
  assert.deepEqual(approvalKeyIntent(enter({ metaKey: true, shiftKey: true }), { target: "card", model }), { type: "action", action: "decision:1" });
  const host = approvalCardModel(command({ command: "curl x", availableDecisions: ["accept", "acceptForSession",
    { applyNetworkPolicyAmendment: { network_policy_amendment: { host: "registry.npmjs.org", action: "allow" } } }, "decline", "cancel"] }));
  assert.deepEqual(host.allows.map(allow => [allow.key, allow.label]), [["decision:2", "Always allow registry.npmjs.org"], ["acceptForSession", "Allow for this session"], ["accept", "Allow once"]]);
  assert.equal(host.deny.key, "decline");
  // No list (the bridges): the fixed set.
  assert.deepEqual(approvalCardModel(command({ command: "ls" })).allows.map(allow => allow.key), ["acceptForSession", "accept"]);
  const { createRequire } = await import("node:module");
  const { approvalResponse } = createRequire(import.meta.url)("../electron/respond-approval.cjs");
  const request = command({ command: "npm test", availableDecisions: offered });
  assert.deepEqual(approvalResponse(request, { decisionIndex: 1 }), { decision: { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["npm", "test"] } } });
  for (const bad of [{ decisionIndex: 0 }, { decisionIndex: 9 }, { decisionIndex: "1" }, { decisionIndex: 1, decision: "accept" }])
    assert.throws(() => approvalResponse(request, bad), /Invalid decision/);
  assert.deepEqual(approvalResponse(request, { decision: "cancel" }), { decision: "cancel" });
});

test("ZCode's dynamic workflow run: one card with the bridge's script summary and its reason", () => {
  const summary = "Workflow: review-changes — Review changed files\nPhases: 1. Find  2. Verify";
  const model = approvalCardModel(command({ command: summary, reason: "Run this workflow? Its agents will run without asking for approval." }),
    { type: "dynamicToolCall", tool: "CreateWorkflow", arguments: { script: "export const meta={name:'review-changes'}" } });
  assert.equal(model.heading.action, "run a dynamic workflow");
  assert.equal(model.detail.text, summary);
  assert.equal(model.reason, "Run this workflow? Its agents will run without asking for approval.");
  // Other tools keep the generic copy.
  assert.equal(approvalCardModel(command({ command: "x" }), { type: "dynamicToolCall", tool: "Other", arguments: {} }).heading.action, "use Other");
});

test("preview site and dev server cards say the approval lasts for the session, and quote the server's name", () => {
  const request = (agentTool, extra = {}) => ({ method: "item/commandExecution/requestApproval", params: { threadId: "t", turnId: "", itemId: "i", cwd: "/w", codeDesktop: { agentTool }, ...extra } });
  const site = approvalCardModel(request({ kind: "preview-site", host: "example.org", url: "https://example.org/" }));
  assert.deepEqual(site.allows.map((allow) => [allow.key, allow.label]), [["accept", "Allow for this session"]]);
  const server = approvalCardModel(request({ kind: "preview-server", name: "site" }, { command: "npm run dev" }));
  assert.deepEqual(server.allows.map((allow) => [allow.key, allow.label]), [["accept", "Allow for this session"]]);
  // 2.42304.0 c96d752d0 Kk preview_start: action "start" (zTylMMruGq) + meta name, clampTitle.
  assert.equal(server.title, "Allow DeepSeek to start site?");
  assert.deepEqual([server.heading, server.clampTitle], [{ action: "start", meta: "site" }, true]);
  const unnamed = approvalCardModel(request({ kind: "preview-server" }, { command: "npm run dev" }));
  assert.equal(unnamed.title, "Allow DeepSeek to start a dev server?");
  assert.deepEqual([unnamed.heading, unnamed.clampTitle], [{ action: "start a dev server", meta: null }, true]);
});

test("dev server card: the original wA description line names the folder and the launch.json port", () => {
  const request = (agentTool, extra = {}) => ({ method: "item/commandExecution/requestApproval", params: { threadId: "t", turnId: "", itemId: "i", cwd: "/w", command: "npm run dev", codeDesktop: { agentTool }, ...extra } });
  const description = model => model.context.filter(part => part.key === "description").map(part => part.text);
  assert.deepEqual(description(approvalCardModel(request({ kind: "preview-server", name: "web", port: 5173, portMayReassign: false }))), ["Runs in /w on port 5173"]);
  // The suffix only when the port may move to the next free one (preview-service never claims it before preview-01).
  assert.deepEqual(description(approvalCardModel(request({ kind: "preview-server", name: "web", port: 5173, portMayReassign: true }))), ["Runs in /w on port 5173 (or the next free port)"]);
  assert.deepEqual(description(approvalCardModel(request({ kind: "preview-server", name: "web" }))), ["Runs in /w"]);
  assert.deepEqual(description(approvalCardModel(request({ kind: "preview-server", name: "web", port: 3000 }, { cwd: undefined }))), ["Runs on port 3000"]);
  assert.deepEqual(description(approvalCardModel(request({ kind: "preview-server", name: "web", port: "3000" }, { cwd: undefined }))), [], "a non-number port is not a port");
  // The old "In {folder}" line is gone; the env lines and the warning (local launch.json additions) stay after it.
  const model = approvalCardModel(request({ kind: "preview-server", name: "web", port: 3000, env: ["PATH=/x"], envRisky: ["PATH"] }));
  assert.deepEqual(model.context.map(part => part.key), ["description", "env", "env-warning"]);
  assert.equal(model.context.some(part => /^In \//.test(part.text)), false);
  assert.equal(model.detail.text, "npm run dev");
});

test("zh-CN: the dev server line and title read from the session dictionary", async (context) => {
  const i18n = await import("../electron/i18n/index.mjs");
  const previous = i18n.getLocale();
  context.after(() => i18n.setLocale(previous));
  i18n.setLocale("zh-CN");
  const model = approvalCardModel({ method: "item/commandExecution/requestApproval", params: { threadId: "t", cwd: "/w", command: "npm run dev",
    codeDesktop: { agentTool: { kind: "preview-server", name: "web", port: 3000 } } } });
  assert.equal(model.heading.action, "启动");
  assert.deepEqual(model.context.filter(part => part.key === "description").map(part => part.text), ["在 /w 中运行，端口 3000"]);
  assert.equal(model.title, "允许 DeepSeek 启动 web？");
});

test("read gate: an MCP tool call's arguments carry the loose rowsReadGate; other tools and argument-less calls don't", () => {
  const gate = { hint: "Scroll through what Claude sent to allow it.", loose: true };
  const mcp = approvalCardModel(command({ command: "mcp__github__create_issue {}" }),
    { type: "mcpToolCall", server: "github", tool: "create_issue", arguments: { title: "Bug" } });
  assert.deepEqual(mcp.rowsReadGate, gate);
  assert.equal(approvalCardModel(command({ command: "mcp__github__list {}" }), { type: "mcpToolCall", server: "github", tool: "list", arguments: {} }).rowsReadGate, undefined);
  assert.equal(approvalCardModel(command({ command: "send_message {}" }), { type: "dynamicToolCall", tool: "send_message", arguments: { to: "a1" } }).rowsReadGate, undefined);
  assert.equal(approvalCardModel(command({ command: "ls" }), { type: "commandExecution", description: "List", command: "ls" }).rowsReadGate, undefined);
  assert.equal(approvalCardModel(command({ command: "ls" })).rowsReadGate, undefined);
  // Computer use is an MCP server too, but its card has no arguments block.
  assert.equal(approvalCardModel(command({}), { type: "mcpToolCall", server: "computer-use", tool: "type", arguments: { text: "hello" } }).rowsReadGate, undefined);
});

// R4g-btw BT4 (X7-16): the approval slot's 3.6556.2 originals (c9ed5627b k / E / nt / rt, c6dc54e94 I, shared-10 Yt / Gt;
// 2.42304.0 c96d752d0 Gj / Hj, c227f4d5e Zw, shared-10 rx / lx), generated by scripts/extract-approval-landing.mjs, driven
// with controlled window events. card-landing.mjs is React Compiler output importing its cache helpers from the view-tabs
// graph (E3), whose host adapters are .jsx: it loads through Vite SSR.
const { fakeWindow } = await import("./fixtures/approval-landing-dom.mjs");
let landingServer = null;
after(() => landingServer?.close());
const landing = async () => {
  if (!landingServer) {
    const [{ createServer }, { default: react }] = await Promise.all([import("vite"), import("@vitejs/plugin-react")]);
    landingServer = await createServer({ configFile: false, root: new URL("..", import.meta.url).pathname, plugins: [react()],
      server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  }
  return landingServer.ssrLoadModule("/src/generated/approval-landing/card-landing.mjs");
};

test("X7-16 Gj: on a landed card plain Enter and ⌘⇧⏎ are swallowed, a letter goes to the composer, digits and space stay", async () => {
  const { guardWindowAfterCard, afterCardState } = await landing();
  const { win, doc, element, dispatch } = fakeWindow();
  guardWindowAfterCard(win); guardWindowAfterCard(win);
  assert.deepEqual(win.listeners.filter(l => l.target === "window").map(l => [l.type, l.capture]),
    [["keydown", true], ["pointerdown", true], ["focusout", true]], "installed once per window (Wj), all capture");
  const scope = element("div"), card = element("section"), moved = [];
  let chord = false;
  const drawn = { get chordActsAnywhere() { return chord; }, toComposer: from => moved.push(from) };
  const land = () => { card.focus(); afterCardState.set(win, { at: card, onCard: true, from: scope, drawn: () => drawn }); };
  land();
  const swallowed = init => { const e = dispatch("keydown", init); return e.prevented && e.stopped; };
  assert.equal(swallowed({ key: "Enter" }), true, "the decision Enter does not act on the landed card");
  assert.equal(swallowed({ key: "Shift" }), false, "a modifier is ignored (cae42d46f m)");
  assert.equal(swallowed({ key: "Enter", metaKey: true }), false, "⌘⏎ is the card's own primary chord");
  assert.equal(swallowed({ key: "Enter", metaKey: true, shiftKey: true }), true, "⌘⇧⏎ is held back");
  chord = true;
  assert.equal(swallowed({ key: "Enter", ctrlKey: true, shiftKey: true }), false, "unless the drawn card's chord acts anywhere (plan)");
  for (const key of ["1", " ", "ArrowDown"]) dispatch("keydown", { key });
  dispatch("keydown", { key: "k", metaKey: true });
  assert.deepEqual(moved, [], "digits, space, named keys and shortcuts stay on the card");
  dispatch("keydown", { key: "h" });
  assert.deepEqual(moved, [scope], "a printable key hands focus to the composer with the slot's parent");
  assert.ok(afterCardState.has(win), "the state stays until focus leaves the landing");
  const other = element("button"); other.focus();
  dispatch("keydown", { key: "Enter" });
  assert.equal(afterCardState.has(win), false, "focus elsewhere than the landing clears it on the next key");
});

test("HS-11 k / nt / rt: after a deliberate pick on the landed card, a deliberate Enter passes", async () => {
  const { guardWindowAfterCard, afterCardState, deliberateCardKey, markCardPick } = await landing();
  const { win, element, dispatch } = fakeWindow();
  guardWindowAfterCard(win);
  const scope = element("div"), card = element("section"), drawn = () => ({ chordActsAnywhere: false });
  const land = (extra = {}) => { card.focus(); afterCardState.set(win, { at: card, onCard: true, from: scope, drawn, since: performance.now() - 1000, ...extra }); };
  const swallowed = init => { const e = dispatch("keydown", init); return e.prevented && e.stopped; };
  land();
  assert.equal(swallowed({ key: "Enter" }), true, "no pick yet: the decision Enter is still held back");
  const key = init => ({ type: "keydown", target: card, repeat: false, metaKey: false, ctrlKey: false, altKey: false, isTrusted: true, ...init });
  assert.equal(deliberateCardKey(key({ key: "1" })), true, "trusted, unmodified, 400ms after landing");
  assert.equal(deliberateCardKey(key({ key: "1", repeat: true })), false, "a repeat is not deliberate");
  assert.equal(deliberateCardKey(key({ key: "1", altKey: true })), false, "nor a modified key");
  assert.equal(deliberateCardKey(key({ key: "1", isTrusted: false })), false, "nor a synthetic one");
  assert.equal(markCardPick(key({ key: "1" }), false), true, "deliberate, digit shortcuts off: handled, not marked");
  assert.equal(afterCardState.get(win).picked, undefined);
  assert.equal(markCardPick(key({ key: "1" }), true), true);
  assert.equal(afterCardState.get(win).picked, true, "a deliberate digit pick is marked");
  assert.equal(swallowed({ key: "Enter" }), false, "after the pick a deliberate Enter passes");
  assert.equal(swallowed({ key: "Enter", repeat: true }), true, "a held Enter is still swallowed");
  land({ since: performance.now(), picked: true });
  assert.equal(markCardPick(key({ key: "2" }), true), false, "right after landing a key is not taken as a pick");
  assert.equal(swallowed({ key: "Enter" }), true, "nor an Enter within 400ms of landing");
  afterCardState.delete(win);
  assert.equal(markCardPick(key({ key: "1" }), true), true, "off a landed card the card handles its keys as usual");
});

test("X7-16 Gj: after a hand-back the composer keeps Enter, ⌘⇧⏎ is still held, other keys / pointer / focusout clear", async () => {
  const { guardWindowAfterCard, afterCardState } = await landing();
  const { win, element, dispatch } = fakeWindow();
  guardWindowAfterCard(win);
  const scope = element("div"), composer = element("div"), drawn = () => ({ chordActsAnywhere: false });
  const handBack = () => { composer.focus(); afterCardState.set(win, { at: composer, onCard: false, from: scope, drawn }); };
  handBack();
  assert.equal(dispatch("keydown", { key: "Enter" }).prevented, false, "plain Enter is the composer's (its own rP guard applies)");
  assert.equal(dispatch("keydown", { key: "Enter", metaKey: true, shiftKey: true }).prevented, true);
  dispatch("keydown", { key: "x", repeat: true });
  assert.ok(afterCardState.has(win), "a repeat keeps it");
  dispatch("keydown", { key: "x" });
  assert.equal(afterCardState.has(win), false, "typing clears it");
  handBack();
  dispatch("pointerdown", {}, element("div"));
  assert.ok(afterCardState.has(win), "a pointer outside the landing keeps it");
  dispatch("pointerdown", {}, composer);
  assert.equal(afterCardState.has(win), false, "a pointer on the landing clears it");
  handBack();
  composer.blur(); dispatch("focusout", {}, composer);
  assert.equal(afterCardState.has(win), false, "leaving the landing clears it");
  afterCardState.set(win, { at: null, onCard: false, from: scope, drawn });
  dispatch("pointerdown", {}, element("div"));
  assert.equal(afterCardState.has(win), false, "with no landing any pointer clears it");
});

test("X7-16 Hj / Zw: the next card's root takes focus with the transient focus-visible ring", async () => {
  const { approvalCardRoot } = await landing();
  const { focusWithRing, ringClasses, ringClassesPositioned } = await import("../src/generated/approval-landing/focus-ring.mjs");
  const { doc, element } = fakeWindow();
  const hidden = element("section", { attributes: { "data-approval-card-root": "" }, style: { display: "contents" } });
  const root = element("section", { attributes: { "data-approval-card-root": "" } });
  const slot = element("div", { style: { display: "contents" }, children: [hidden, root] });
  assert.equal(approvalCardRoot(slot), root, "the first displayed [data-approval-card-root]");
  const inner = element("section"), wrapper = element("div", { style: { display: "contents" }, children: [inner] });
  assert.equal(approvalCardRoot(element("div", { style: { display: "contents" }, children: [wrapper] })), inner,
    "else the first displayed element down the first children");
  assert.equal(approvalCardRoot(element("div")), null);
  assert.equal(ringClasses, "focus-visible:outline-hidden focus-visible:shadow-focus");
  assert.match(ringClassesPositioned, /focus-visible:after:shadow-focus/);
  const card = element("section", { style: { position: "relative" } });
  focusWithRing(card, ringClassesPositioned);
  assert.equal(doc.activeElement, card);
  assert.deepEqual(card.focused, [{ focusVisible: true }]);
  assert.ok(ringClassesPositioned.split(" ").every(c => card.classList.contains(c)));
  assert.equal(card.getAttribute("tabindex"), "-1", "a temporary tabindex");
  assert.equal(card.getAttribute("role"), "group");
  card.blur();
  assert.equal(card.classList.length, 0, "the ring goes on blur");
  assert.equal(card.hasAttribute("tabindex") || card.hasAttribute("aria-labelledby") || card.hasAttribute("role"), false);
  const own = element("section", { attributes: { tabindex: "0" } });
  focusWithRing(own, ringClasses); own.blur();
  assert.equal(own.getAttribute("tabindex"), "0", "an own tabindex is kept");
  const dead = element("section"); dead.focusable = false;
  focusWithRing(dead, ringClasses);
  assert.equal(dead.classList.length, 0, "a card that does not take focus is left as it was");
});

test("X7-16 rx / lx: the window counts as attended until focus moves into an embedded frame", async () => {
  const { watchWindowAttention, windowAttended } = await import("../src/generated/approval-landing/window-attention.mjs");
  const { win, doc, element } = fakeWindow();
  watchWindowAttention(win); const count = win.listeners.length; watchWindowAttention(win);
  assert.equal(win.listeners.length, count, "installed once per window");
  assert.equal(windowAttended(win), true);
  const frame = element("iframe");
  for (const l of win.listeners.filter(l => l.target === "document" && l.type === "focusin")) l.fn({ target: frame });
  assert.equal(windowAttended(win), false, "focus inside a frame: qj does not land on the next card");
  assert.ok(doc);
});

test("X7-16: the slot originals are generated from 3.6556.2 c9ed5627b / c6dc54e94 / shared-10, gated as the original is", async () => {
  const { extractApprovalLanding } = await import("../scripts/extract-approval-landing.mjs");
  const manifest = await extractApprovalLanding({ check: true });
  assert.equal(manifest.referenceVersion, "3.6556.2");
  assert.equal(manifest.referenceSnapshot, "snapshots/claude-3.6556.2-20261025-192807");
  const card = manifest.modules.find(m => m.target === "card-landing.mjs");
  assert.equal(card.source, "c9ed5627b-BSPWYeYQ.js");
  assert.deepEqual(card.bindings.map(b => b.name), ["E", "D", "O", "k", "nt", "rt", "it", "A"]);
  assert.deepEqual(card.exports, { A: "useApprovalCardLanding", E: "approvalCardRoot", k: "guardWindowAfterCard", D: "afterCardState",
    it: "ApprovalCardWatch", nt: "deliberateCardKey", rt: "markCardPick" });
  assert.deepEqual(Object.fromEntries(card.imports.filter(i => i.kind !== "react" && i.kind !== "view-tabs").map(i => [i.local, `${i.from}:${i.name}`])), {
    m: "../btw-pane/owner-window.mjs:ownerWindowOrGlobal", d: "../btw-pane/focus-guard.mjs:guardStrayEnter",
    l: "../btw-pane/focus-guard.mjs:elementOf", C: "../btw-pane/focus-lost.mjs:focusIsLost",
    v: "../btw-pane/modifier-keys.mjs:modifierKeys", _: "../btw-pane/focus-hand-back.mjs:useFocusHandBack",
    b: "./window-attention.mjs:watchWindowAttention", Se: "./window-attention.mjs:windowAttended",
    Ce: "./window-attention.mjs:isTrustedEvent", x: "./window-attention.mjs:eventDelay", S: "./window-attention.mjs:justGainedFocus",
    He: "./focus-ring.mjs:focusWithRing", Ue: "./focus-ring.mjs:ringClasses", Ve: "./focus-ring.mjs:ringClassesPositioned" });
  // R3/E3: the React Compiler cache helpers come from view-tabs by semantic name, never sliced again.
  assert.deepEqual(card.imports.filter(i => i.kind === "view-tabs").map(i => `${i.local}=${i.name}`).sort(),
    ["J0=memoIsEmpty", "J1=memoChanged1", "J2=memoChanged2", "J5=memoChanged5", "J9=reactMemoCache", "K0=memoStore0", "K1=memoStore1", "K2=memoStore2", "K5=memoStore5"]);
  assert.ok(card.imports.filter(i => i.kind === "view-tabs").every(i => i.from === "../view-tabs/shared-frame-6jtSkIit.js"));
  assert.deepEqual(manifest.modules.find(m => m.target === "focus-ring.mjs").exports, { _: "focusWithRing", m: "ringClasses", h: "ringClassesPositioned" });
  // c9ed5627b A runs only when et() = GrowthBook __gb__1616707004 is on; the host's answer is in source-approval-card.jsx.
  const fs = await import("node:fs/promises");
  const chunk = await fs.readFile(new URL("../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c9ed5627b-BSPWYeYQ.js", import.meta.url), "utf8");
  const count = text => chunk.split(text).length - 1;
  assert.equal(count('function et(){return p("__gb__1616707004")}'), 1);
  assert.equal(count("export{A as n,et as r,dt as t}"), 1);
  // The approval area (cc32965c2, 2.42304.0 c96d752d0 $j) mounts A behind et() and an onFocusHandBack.
  const area = await fs.readFile(new URL("../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/cc32965c2-BQu1bA_w.js", import.meta.url), "utf8");
  const inArea = text => area.split(text).length - 1;
  assert.equal(inArea('import{n as yo,r as bo,t as xo}from"./c9ed5627b-BSPWYeYQ.js"'), 1);
  assert.equal(inArea("wt=bo()&&ne!==void 0"), 1);
  assert.equal(inArea('Cn=Dt==="plan"||Dt==="computer_use_app_list"'), 1);
  const host = await fs.readFile(new URL("../src/source-approval-card.jsx", import.meta.url), "utf8");
  assert.match(host, /export const APPROVAL_LANDING_FLAG = "__gb__1616707004";\nexport const APPROVAL_LANDING_ON = true;/);
});

// ---- V3-w10-trans-approval-titles-host ------------------------------------------------------------------------------
// The app's own run_in_terminal and reveal_path / open_in_editor cards take their heading from the generated 3.6556.2
// title builders (src/generated/approval-titles, cc32965c2 cd → nd / _u) and the card renders it as the original L does.
const agentTool = (tool, extra = {}) => command({ threadId: "t", cwd: "/w", ...extra, codeDesktop: { agentTool: tool } });
const officialChunk = async name => (await import("node:fs/promises")).readFile(new URL(`../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/${name}`, import.meta.url), "utf8");

test("titles-host: cc32965c2 L renders a heading with one rich message per shape; j / ie / le place its description", async () => {
  const card = await officialChunk("cc32965c2-BQu1bA_w.js");
  const count = text => card.split(text).length - 1;
  for (const [message, id] of [["Allow Claude to <b>{action}</b> <meta>{metaText}</meta> <b>{tail}</b>?", "7px6ACmQ5k"],
    ["Allow Claude to <b>{action}</b> <meta>{metaText}</meta>?", "EFOijHTneN"], ["Allow Claude to <b>{action} {tail}</b>?", "a2973u92KO"],
    ["Allow Claude to <b>{action}</b>?", "wF6CuCZpBR"]])
    assert.equal(count(`defaultMessage:"${message}",id:"${id}"`), 1, id);
  // ev…av (and ml, the session line's <b>): each tag a span.text-primary [unicode-bidi:plaintext]; hl the <glued> run.
  assert.equal(card.match(/function [a-z]{2}\(e\)\{return n\("span",\{className:"text-primary \[unicode-bidi:plaintext\]",children:e\}\)\}/g).length, 7);
  assert.equal(count('function hl(e){return n("span",{className:"inline-flex max-w-full items-end leading-tight",children:p.map(e,e=>typeof e=="string"?n("span",{className:"shrink-0 whitespace-pre",children:e}):n("span",{className:"min-w-0",children:e}))})}'), 1);
  // The description: so labelled "Description" (C_ clamped, w_ for ownProse), or an sr-only sentence and a tooltip (le).
  assert.equal(count('re=i.descriptionAsTooltip?e:void 0,j=e&&re===void 0?n(so,{label:T.formatMessage({defaultMessage:"Description",id:"Q8Qw5BZ1VA"}'), 1);
  assert.equal(count('className:i.ownProse?w_:C_'), 1);
  assert.equal(count('C_="text-body text-secondary select-text break-words max-h-[calc(3*var(--cds-leading-body))] overflow-y-auto [unicode-bidi:plaintext]"'), 1);
  assert.equal(count('"data-testid":"approval-hidden-sentence",className:"sr-only select-none"'), 1);
  assert.equal(count('le=re===void 0?void 0:M?"detail":P.decisionReason?"reason":"title"'), 1);
  // Ge: detailFirst moves the detail (Ie) ahead of the body; the description (j, ie) comes before the reason (ze).
  assert.equal(count("Ie=i.detailFirst?z:null"), 1);
  assert.equal(count("children:[V,Ie,se,k,Le,N,oe,ae,ge,Re,j,ie,ze,Be,Ve,He,I,Ee,ke,H,Ue,We]"), 1);
  const clamp = await officialChunk("c2d1aeb56-BwMYdDs2.js");
  assert.equal(clamp.split('"epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus"').length - 1, 1);
});

test("titles-host: run_in_terminal is nd's card — the action, the folder and tab as a tooltip description, the detail first", () => {
  const model = approvalCardModel(agentTool({ kind: "terminal-command", tabTitle: "dev" }, { command: "npm run dev" }));
  assert.deepEqual(model.heading, { action: "run a command in your terminal", meta: null, official: true,
    overrideDescription: "In “/w”, in a tab named “dev”", descriptionAsTooltip: true, ownProse: true });
  assert.equal(model.title, "Allow DeepSeek to run a command in your terminal?");
  assert.deepEqual([model.detail.text, model.clampTitle, model.detailFirst, model.context], ["npm run dev", true, true, []]);
  assert.match(model.reason, /^It runs in your own shell, outside the sandbox/);
  assert.deepEqual(model.allows.map(allow => allow.key), ["accept"]);
  // Only the folder: Rl.inFolder; neither: no description.
  assert.equal(approvalCardModel(agentTool({ kind: "terminal-command" }, { command: "ls" })).heading.overrideDescription, "In “/w”");
  assert.equal(approvalCardModel(agentTool({ kind: "terminal-command" }, { command: "ls", cwd: undefined })).heading.overrideDescription, undefined);
  // nd declines (null → Ul's rows card) for a command over several lines: the host's own card stays (terminal.mjs
  // refuses such a command before it asks, so only a malformed request gets here).
  const lines = approvalCardModel(agentTool({ kind: "terminal-command", tabTitle: "dev" }, { command: "ls\npwd" }));
  assert.equal(lines.heading.official, undefined);
  assert.deepEqual(lines.context.map(part => part.text), ["In /w, in a tab named dev"]);
  // The announcement adds the description (ownProse: in full) before the reason.
  assert.match(approvalAnnouncement(model), /^Permission requested: run a command in your terminal\. npm run dev\. In “\/w”, in a tab named “dev”\. It runs in your own shell/);
});

test("titles-host: reveal_path / open_in_editor are _u's cards — the file name as meta, the path as detail, the editor's line", () => {
  const reveal = approvalCardModel(agentTool({ kind: "open-path", action: "reveal", path: "/w/src/a.txt" }));
  assert.deepEqual([reveal.heading.action, reveal.heading.meta, reveal.heading.official, reveal.detail.text, reveal.clampTitle],
    ["open the folder containing", "a.txt", true, "/w/src/a.txt", true]);
  assert.equal(reveal.title, "Allow DeepSeek to open the folder containing a.txt?");
  const editor = approvalCardModel(agentTool({ kind: "open-path", action: "editor", path: "/w/src/app.js", editor: "Zed", line: 4 }));
  assert.deepEqual([editor.heading.action, editor.heading.meta, editor.heading.overrideDescription, editor.heading.ownProse, editor.heading.descriptionAsTooltip],
    ["open", "app.js", "Opens in Zed at line 4.", true, undefined]);
  assert.deepEqual(editor.context, []);
  // An editor outside _u's four is "other" (cu.openIn's select): the generic name, the card still the builder's.
  assert.equal(approvalCardModel(agentTool({ kind: "open-path", action: "editor", path: "/w/b.js", editor: "Sublime Text" })).heading.overrideDescription, "Opens in your code editor.");
  assert.equal(approvalCardModel(agentTool({ kind: "open-path", action: "editor", path: "/w/b.js", editor: "VS Code" })).heading.overrideDescription, "Opens in VS Code.");
  // The host's private tools keep their own wording (no official server).
  assert.equal(approvalCardModel(agentTool({ kind: "schedule", cron: "*/5 * * * *", prompt: "check" })).heading.official, undefined);
  assert.equal(approvalCardModel(agentTool({ kind: "monitor", description: "tail" }, { command: "tail -f x" })).heading.official, undefined);
});

test("titles-host: the builders' intl fills ICU select and plural once, never re-reading a value as a pattern", async () => {
  const { icuFormat } = await import("../src/approval-card-model.mjs");
  const openIn = "Opens in {editor, select, vscode {VS Code} cursor {Cursor} windsurf {Windsurf} zed {Zed} other {your code editor}} at line {line}.";
  assert.equal(icuFormat(openIn, { editor: "cursor", line: "9" }), "Opens in Cursor at line 9.");
  assert.equal(icuFormat(openIn, { editor: "other", line: "1" }), "Opens in your code editor at line 1.");
  assert.equal(icuFormat("{n, plural, =0 {none} one {# file} other {# files}} in {where}", { n: 3, where: "{n}" }), "3 files in {n}");
  assert.equal(icuFormat("{n, plural, =0 {none} one {# file} other {# files}}", { n: 1 }), "1 file");
  assert.equal(icuFormat("In {folder}", {}), "In {folder}");
});

test("titles-host zh-CN: the builders' messages read from the dictionary, ICU select included", async (context) => {
  const i18n = await import("../electron/i18n/index.mjs");
  const previous = i18n.getLocale();
  context.after(() => i18n.setLocale(previous));
  i18n.setLocale("zh-CN");
  const terminal = approvalCardModel(agentTool({ kind: "terminal-command", tabTitle: "dev" }, { command: "npm run dev" }));
  assert.equal(terminal.heading.action, "在你的终端中运行命令");
  const editor = approvalCardModel(agentTool({ kind: "open-path", action: "editor", path: "/w/src/app.js", editor: "Zed", line: 4 }));
  assert.equal(editor.heading.overrideDescription, "在Zed中打开并定位到第 4 行。");
});

test("titles-host SSR: the run_in_terminal card's title, tooltip and order; open_in_editor's description; zh title", async (context) => {
  await landing();
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const card = await landingServer.ssrLoadModule("/src/source-approval-card.jsx");
  const render = request => renderToStaticMarkup(React.createElement(card.SourceApprovalCardView, { request, armKey: "k", onAction: () => {} }));
  const terminal = render(agentTool({ kind: "terminal-command", tabTitle: "dev" }, { command: "npm run dev" }));
  // EFOijHTneN's no-meta shape wF6CuCZpBR: "Allow {name} to <b>{action}</b>?" with the <b> part span.text-primary.
  assert.match(terminal, /<span data-clamp="">Allow DeepSeek to <span class="text-primary \[unicode-bidi:plaintext\]">run a command in your terminal<\/span>\?<\/span>/);
  assert.equal(terminal.includes("sac-em"), false);
  // Ie leads, then ie (the sr-only description), then the reason; the detail carries the description as its tooltip (le).
  assert.match(terminal, /<div class="sac-content"><div id="[^"]+" class="sac-details" title="In “\/w”, in a tab named “dev”"><pre class="sac-code">npm run dev<\/pre><\/div><span data-testid="approval-hidden-sentence" class="sr-only select-none">In “\/w”, in a tab named “dev”<\/span><div class="sac-reason/);
  const editor = render(agentTool({ kind: "open-path", action: "editor", path: "/w/src/app.js", editor: "Zed", line: 4 }));
  assert.match(editor, /Allow DeepSeek to <span class="text-primary \[unicode-bidi:plaintext\]">open<\/span> <span class="text-primary \[unicode-bidi:plaintext\]">app\.js<\/span>\?/);
  // j: so with w_ (ownProse), before the detail (We).
  assert.match(editor, /<div class="sac-content"><div class="epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus text-body text-secondary select-text break-words \[unicode-bidi:plaintext\]">Opens in Zed at line 4\.<\/div><div id="[^"]+" class="sac-details"><pre class="sac-code">\/w\/src\/app\.js<\/pre><\/div><\/div>/);
  // A value is text, never markup.
  const odd = render(agentTool({ kind: "open-path", action: "reveal", path: "/w/a<b>{action}.txt" }));
  assert.match(odd, /<span class="text-primary \[unicode-bidi:plaintext\]">a&lt;b&gt;\{action\}\.txt<\/span>\?/);
  // Other headings keep their markup (core command cards: source-shortcut / approval-read-gate tests).
  assert.match(render(agentTool({ kind: "preview-server", name: "web" }, { command: "npm run dev" })), /Allow DeepSeek to <span class="sac-em">start<\/span> <span class="sac-em">web<\/span>\?/);
  const i18n = await import("../electron/i18n/index.mjs");
  const previous = i18n.getLocale();
  context.after(() => i18n.setLocale(previous));
  i18n.setLocale("zh-CN");
  // The card's own i18n module instance (Vite SSR) reads the same dictionary through its own setLocale.
  const ssrI18n = await landingServer.ssrLoadModule("/electron/i18n/index.mjs");
  const ssrPrevious = ssrI18n.getLocale();
  context.after(() => ssrI18n.setLocale(ssrPrevious));
  ssrI18n.setLocale("zh-CN");
  assert.match(render(agentTool({ kind: "open-path", action: "editor", path: "/w/src/app.js", editor: "Zed", line: 4 })),
    /<span data-clamp="">允许 DeepSeek <span class="text-primary \[unicode-bidi:plaintext\]">打开<\/span> <span class="text-primary \[unicode-bidi:plaintext\]">app\.js<\/span>？<\/span>/);
});
