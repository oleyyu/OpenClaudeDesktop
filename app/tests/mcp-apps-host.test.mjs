import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const host = require("../electron/mcp-apps-host.cjs");
const { ACTIONS, UNAVAILABLE, CORE_UNSUPPORTED, VISUALIZE_SERVER_UUID, MAX_CONTENTS_CHARS, filterUiMeta, appResourceUri, appToolsOf, parseReadReply, createMcpAppsHost } = host;
const visualize = require("../electron/visualize-adapters.cjs");

// R4g-mcp MA-4 (research-ext/X1 §6 MA-4, §3): the main-process MCP App bridge. Official 2.42304.0 main
// index.chunk-CFJssAFf.js mcpReadResource / mcpListResources / mcpCallTool / readFromCliMcpAppServer / UA / zA and
// index.chunk-B5tintml.js Un (n.lu) / In / Ln (n.pu) / Fn (n.uu) / Bn. The core is a fake owner: no process, no network.

const here = path.dirname(fileURLToPath(import.meta.url));
const SESSION = "019a0000-0000-7000-8000-000000000001";
const session = (id) => (id === SESSION ? { id, cwd: "/tmp/project" } : null);
const APP_URI = "ui://weather/forecast.html";

function fakeOwner({ statuses = [], read = null, statusError = null, readError = null, engine } = {}) {
  const calls = [];
  const owner = {
    serverInfo: { engine, capabilities: {} },
    connection: { closed: false },
    calls,
    async request(method, params, timeout) {
      calls.push({ method, params, timeout });
      if (method === "mcpServerStatus/list") {
        if (statusError) throw statusError;
        return { data: statuses, nextCursor: null };
      }
      if (method === "mcpServer/resource/read") {
        if (readError) throw readError;
        return typeof read === "function" ? read(params) : read;
      }
      throw Object.assign(new Error(`${method} unexpected`), { code: -32601 });
    },
  };
  return owner;
}
const weatherStatus = (meta = { ui: { resourceUri: APP_URI, csp: { connectDomains: ["https://api.weather.test"] }, permissions: { camera: {} }, domain: "x" } }) => ({
  name: "weather", runtimeStatus: "connected", pluginId: null, serverInfo: null, toolsError: null, resources: [], resourceTemplates: [], authStatus: "unsupported",
  tools: { forecast: { name: "forecast", description: "Forecast", inputSchema: { type: "object", properties: { city: { type: "string" } } }, _meta: meta }, plain: { name: "plain", inputSchema: { type: "object" } } },
});
const codexOnly = (info) => info?.engine === undefined;
const make = (owner, extra = {}) => createMcpAppsHost({ client: () => owner, session, coreSupportsMcpApps: codexOnly, ...extra });

test("MA-4 official constants re-checked in 2.42304.0 main chunks (counts with split)", () => {
  const build = path.join(here, "../../reference/installed-2.42304.0-20261017/asar/.vite/build");
  if (!fs.existsSync(build)) return; // reference tree is optional in packaged checkouts
  const count = (file, needle) => fs.readFileSync(path.join(build, file), "utf8").split(needle).length - 1;
  assert.equal(count("index.chunk-CFJssAFf.js", "async readFromCliMcpAppServer("), 1);
  assert.equal(count("index.chunk-CFJssAFf.js", "var VA=3e4"), 1);
  assert.equal(count("index.chunk-CFJssAFf.js", "RA=10485760"), 1);
  assert.equal(count("index.chunk-CFJssAFf.js", "var LA=1048576"), 1);
  assert.equal(count("index.chunk-CFJssAFf.js", "if(!i.startsWith(\"ui://\"))return BA()"), 1);
  assert.equal(count("index.chunk-CFJssAFf.js", "`Tool '${r}' is not permitted`"), 1);
  assert.equal(count("index.chunk-CFJssAFf.js", "\"Session not found\""), 1);
  assert.equal(count("index.chunk-B5tintml.js", "var Vn=new Set([\"resourceUri\",\"visibility\",\"prefersBorder\"])"), 1);
  assert.equal(count("index.chunk-B5tintml.js", ",Pe=1024,Fe=/^[\\x21-\\x7e]+(?: [\\x21-\\x7e]+)*$/"), 1);
  assert.equal(count("index.chunk-muI2IV6k.js", "e.NotConnected=\"not_connected\",e.ReadFailed=\"read_failed\""), 1);
  assert.deepEqual(UNAVAILABLE, { BlockedByPolicy: "blocked_by_policy", NeedsSignIn: "needs_sign_in", NotConnected: "not_connected", ReadFailed: "read_failed" });
  assert.equal(MAX_CONTENTS_CHARS, 10485760);
  assert.deepEqual(ACTIONS, ["mcp-app:servers", "mcp-app:read-resource", "mcp-app:list-resources", "mcp-app:call-tool", "mcp-app:sandbox-origin", "mcp-app:tool-states"]);
});

test("MA-4 Un / In / Fn / Bn ports", () => {
  assert.deepEqual(filterUiMeta({ ui: { resourceUri: APP_URI, csp: { a: 1 }, permissions: {}, domain: "d", visibility: ["app"] }, "ui/resourceUri": APP_URI, other: 1 }, false),
    { ui: { resourceUri: APP_URI, visibility: ["app"] }, "ui/resourceUri": APP_URI });
  assert.deepEqual(filterUiMeta({ ui: { csp: { a: 1 }, prefersBorder: true } }, true), { ui: { csp: { a: 1 }, prefersBorder: true } });
  assert.deepEqual(filterUiMeta(null, true), {});
  assert.equal(appResourceUri({ ui: { resourceUri: APP_URI } }), APP_URI);
  assert.equal(appResourceUri({ "ui/resourceUri": APP_URI }), APP_URI);
  assert.equal(appResourceUri({ ui: { resourceUri: "https://x" } }), undefined);
  assert.equal(appResourceUri({ ui: {} }), undefined);
  assert.equal(appResourceUri({ ui: "x", "ui/resourceUri": APP_URI }), undefined);
  assert.equal(appResourceUri([]), undefined);
  const tools = appToolsOf({ a: { name: "a", description: "d".repeat(2000), _meta: { ui: { resourceUri: APP_URI } } }, b: { name: "bad name ", _meta: { ui: { resourceUri: APP_URI } } }, c: { name: "c", _meta: { ui: { resourceUri: `ui://${"x".repeat(2050)}` } } }, d: { name: "d" } });
  assert.deepEqual(tools.map((tool) => tool.name), ["a"]);
  assert.equal(tools[0].description.length, 1024);
  assert.deepEqual(tools[0].inputSchema, { type: "object" });
  assert.equal(appToolsOf(Array.from({ length: 200 }, (_, i) => ({ name: `t${i}`, _meta: { ui: { resourceUri: APP_URI } } }))).length, 128);
  assert.deepEqual(parseReadReply({ contents: [{ uri: APP_URI, mimeType: "text/html;profile=mcp-app", text: "<p>", extra: 1 }], originCallId: null }), { contents: [{ uri: APP_URI, mimeType: "text/html;profile=mcp-app", text: "<p>" }] });
  assert.equal(parseReadReply({ contents: [{ uri: APP_URI, mimeType: null }] }), null);
  assert.equal(parseReadReply({ contents: [{ text: "x" }] }), null);
  assert.equal(parseReadReply({ contents: [{ uri: APP_URI, _meta: [] }] }), null);
  assert.equal(parseReadReply({}), null);
});

test("MA-4 visualize: resource read straight from the generated server, never through the core", async () => {
  const owner = fakeOwner();
  const bridge = make(owner);
  const expected = visualize.readImagineResource(visualize.WIDGET_RESOURCE_URI);
  for (const server of ["visualize", VISUALIZE_SERVER_UUID, "code_desktop"]) {
    const reply = await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server, uri: "ui://imagine/show-widget.html" });
    assert.deepEqual(reply, expected, server);
    assert.equal(reply.contents[0].mimeType, "text/html;profile=mcp-app");
    assert.ok(reply.contents[0].text.includes("<title>Visualize Widget</title>"));
    assert.deepEqual(reply.contents[0]._meta.ui.permissions, { clipboardWrite: {} });
  }
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "visualize", uri: "ui://imagine/other.html" }), { contents: [], unavailable: "read_failed" });
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "code_desktop", uri: "ui://terminal/x.html" }), { contents: [], unavailable: "read_failed" });
  assert.deepEqual(await bridge.call("mcp-app:list-resources", { sessionId: SESSION, server: "visualize" }), visualize.listImagineResources());
  assert.equal(owner.calls.length, 0);
  const off = make(owner, { visualizeEnabled: () => false });
  assert.deepEqual(await off.call("mcp-app:read-resource", { sessionId: SESSION, server: "visualize", uri: visualize.WIDGET_RESOURCE_URI }), { contents: [], unavailable: "not_connected" });
  assert.deepEqual(await off.call("mcp-app:list-resources", { sessionId: SESSION, server: "visualize" }), []);
});

test("MA-4 visualize tool calls: the official handler; anything else not permitted", async () => {
  const owner = fakeOwner({ statuses: [weatherStatus()] });
  const bridge = make(owner);
  const shown = await bridge.call("mcp-app:call-tool", { sessionId: SESSION, server: "visualize", name: "show_widget", arguments: { title: "t", widget_code: "<p>", loading_messages: ["a"] } });
  assert.match(shown.content[0].text, /^Content rendered and shown to the user\./);
  const readMe = await bridge.call("mcp-app:call-tool", { sessionId: SESSION, server: VISUALIZE_SERVER_UUID, name: "read_me", arguments: { modules: ["chart"], platform: "desktop" } });
  assert.deepEqual(readMe, visualize.handleImagineToolCall("read_me", { modules: ["chart"], platform: "desktop" }));
  for (const [server, tool] of [["weather", "forecast"], ["code_desktop", "terminal"], ["visualize", "nope"]])
    assert.deepEqual(await bridge.call("mcp-app:call-tool", { sessionId: SESSION, server, name: tool, arguments: {} }), { content: [{ type: "text", text: `Tool '${tool}' is not permitted` }], isError: true });
  assert.deepEqual(await bridge.call("mcp-app:call-tool", { sessionId: SESSION, server: "visualize", name: "read_me", arguments: [1] }), { content: [{ type: "text", text: "Tool 'read_me' is not permitted" }], isError: true });
  assert.deepEqual(await bridge.call("mcp-app:call-tool", { sessionId: "other", server: "visualize", name: "read_me" }), { content: [{ type: "text", text: "Session not found" }], isError: true });
  assert.deepEqual(await make(owner, { visualizeEnabled: () => false }).call("mcp-app:call-tool", { sessionId: SESSION, server: "visualize", name: "show_widget" }), { content: [{ type: "text", text: "Tool 'show_widget' is not permitted" }], isError: true });
  assert.equal(owner.calls.length, 0, "App-initiated tools/call never reaches the core");
});

test("MA-4 servers: built-in visualize plus the core's App servers (mcpServerStatus/list {threadId})", async () => {
  const owner = fakeOwner({ statuses: [weatherStatus(), { name: "code_desktop", tools: { show_widget: { name: "show_widget", _meta: { ui: { resourceUri: "ui://imagine/show-widget.html" } } } } }, { name: "plain", tools: { a: { name: "a" } } }, { name: "visualize", tools: { x: { name: "x", _meta: { ui: { resourceUri: APP_URI } } } } }] });
  const result = await make(owner).call("mcp-app:servers", { sessionId: SESSION });
  assert.deepEqual(owner.calls, [{ method: "mcpServerStatus/list", params: { limit: 100, threadId: SESSION }, timeout: 30000 }]);
  assert.deepEqual(result.core, { supported: true });
  assert.deepEqual(result.servers.map((server) => [server.name, server.isBuiltIn]), [["visualize", true], ["weather", false]]);
  assert.equal(result.servers[0].uuid, VISUALIZE_SERVER_UUID);
  assert.deepEqual(result.servers[0].tools.map((tool) => [tool.name, tool._meta]), visualize.IMAGINE_TOOLS.map((tool) => [tool.name, tool._meta]));
  assert.deepEqual(result.servers[1].tools, [{ name: "forecast", description: "Forecast", inputSchema: { type: "object" }, _meta: { ui: { resourceUri: APP_URI, csp: { connectDomains: ["https://api.weather.test"] } } } }]);
  await assert.rejects(make(owner).call("mcp-app:servers", { sessionId: "nope" }), /Unknown session/);
  // zA: a list whose JSON is over 1 MB is dropped.
  const big = fakeOwner({ statuses: Array.from({ length: 9 }, (_, i) => ({ name: `s${i}`, tools: Object.fromEntries(Array.from({ length: 128 }, (_, j) => [`t${j}`, { name: `t${j}`, description: "d".repeat(1024), _meta: { ui: { resourceUri: APP_URI } } }])) })) });
  assert.deepEqual((await make(big).call("mcp-app:servers", { sessionId: SESSION })).servers.map((server) => server.name), ["visualize"]);
});

test("MA-4 core without an MCP App source: explicit core_unsupported, no request", async () => {
  const harness = fakeOwner({ engine: "deepseek", statuses: [weatherStatus()] });
  const bridge = make(harness);
  assert.deepEqual(await bridge.call("mcp-app:servers", { sessionId: SESSION }), { servers: [await make(fakeOwner()).call("mcp-app:servers", { sessionId: SESSION }).then((r) => r.servers[0])], core: { supported: false, unavailable: "not_connected", reason: CORE_UNSUPPORTED } });
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI }), { contents: [], unavailable: "not_connected", reason: CORE_UNSUPPORTED });
  assert.equal(harness.calls.length, 0);
  // A core that says it serves them but answers Method not found.
  const claims = fakeOwner({ engine: "bridge-x", statusError: Object.assign(new Error("mcpServerStatus/list is not supported"), { code: -32601 }) });
  const claimed = make(claims, { coreSupportsMcpApps: () => true });
  assert.deepEqual(await claimed.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI }), { contents: [], unavailable: "not_connected", reason: CORE_UNSUPPORTED });
  assert.equal((await claimed.call("mcp-app:servers", { sessionId: SESSION })).core.reason, CORE_UNSUPPORTED);
  // Not connected at all.
  const none = createMcpAppsHost({ client: () => null, session, coreSupportsMcpApps: () => true });
  assert.deepEqual(await none.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI }), { contents: [], unavailable: "not_connected" });
});

test("MA-4 Codex resource read: params, UA checks, _meta filter", async () => {
  const html = { uri: APP_URI, mimeType: "text/html;profile=mcp-app", text: "<p>hi</p>", _meta: { ui: { csp: { connectDomains: ["https://api.weather.test"] }, permissions: { camera: {} }, domain: "x", prefersBorder: true }, other: 1 } };
  const owner = fakeOwner({ statuses: [weatherStatus()], read: { contents: [html], originCallId: null } });
  const bridge = make(owner);
  const reply = await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI, originCallId: "call_1" });
  assert.deepEqual(reply, { contents: [{ uri: APP_URI, mimeType: "text/html;profile=mcp-app", text: "<p>hi</p>", _meta: { ui: { csp: { connectDomains: ["https://api.weather.test"] }, prefersBorder: true } } }] });
  assert.deepEqual(owner.calls.map((call) => call.method), ["mcpServerStatus/list", "mcpServer/resource/read"]);
  assert.deepEqual(owner.calls[1].params, { threadId: SESSION, server: "weather", uri: APP_URI, originCallId: "call_1" });
  assert.equal(owner.calls[1].timeout, 30000);
  // Cached listing: the second read asks only for the resource.
  await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI });
  assert.deepEqual(owner.calls.map((call) => call.method), ["mcpServerStatus/list", "mcpServer/resource/read", "mcpServer/resource/read"]);
  // Only ui://; an undeclared uri of a listed server fails; an unlisted server is not connected.
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: "https://x/y" }), { contents: [], unavailable: "read_failed" });
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: "ui://weather/other.html" }), { contents: [], unavailable: "read_failed" });
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "ghost", uri: APP_URI }), { contents: [], unavailable: "not_connected" });
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: "nope", server: "weather", uri: APP_URI }), { contents: [] });
  assert.equal(owner.calls.filter((call) => call.method === "mcpServer/resource/read").length, 2);
  assert.deepEqual(await bridge.call("mcp-app:list-resources", { sessionId: SESSION, server: "weather" }), [], "core servers list nothing (official CLI-owned branch)");
});

test("MA-4 Codex resource read failures: malformed, over 10 MB, error, deadline", async () => {
  const cases = [
    [{ read: { contents: [{ uri: APP_URI, text: 1 }] } }, "malformed"],
    [{ read: { contents: [{ uri: APP_URI, text: "x".repeat(MAX_CONTENTS_CHARS) }] } }, "over the limit"],
    [{ readError: new Error("boom") }, "error"],
  ];
  for (const [options, label] of cases) {
    const bridge = make(fakeOwner({ statuses: [weatherStatus()], ...options }));
    assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI }), { contents: [], unavailable: "read_failed" }, label);
  }
  const slow = fakeOwner({ statuses: [weatherStatus()], read: () => new Promise(() => {}) });
  const warnings = [];
  const bridge = make(slow, { deadlineMs: 20, log: { warn: (message) => warnings.push(message) } });
  assert.deepEqual(await bridge.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI }), { contents: [], unavailable: "read_failed" });
  assert.deepEqual(warnings, ["[mcp-app] readMcpResource failed (no reply)"]);
  // A reconnect (new connection object) drops the cached listing.
  const owner = fakeOwner({ statuses: [weatherStatus()], read: { contents: [] } });
  const again = make(owner);
  await again.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI });
  owner.connection = { closed: false };
  await again.call("mcp-app:read-resource", { sessionId: SESSION, server: "weather", uri: APP_URI });
  assert.equal(owner.calls.filter((call) => call.method === "mcpServerStatus/list").length, 2);
});

test("MA-4 sandbox origin = cbc7fd025 x(e,t) on the local scheme", async () => {
  const bridge = make(fakeOwner());
  const result = await bridge.call("mcp-app:sandbox-origin", { sessionId: SESSION, server: VISUALIZE_SERVER_UUID });
  const hash = crypto.createHash("sha256").update(SESSION + VISUALIZE_SERVER_UUID).digest("hex").slice(0, 32);
  assert.deepEqual(result, { hash, origin: `oc-mcp-sandbox://${hash}`, proxyUrl: `oc-mcp-sandbox://${hash}/mcp_apps` });
  await assert.rejects(bridge.call("mcp-app:sandbox-origin", { sessionId: "nope", server: "x" }), /Unknown session/);
  await assert.rejects(bridge.call("mcp-app:sandbox-origin", { sessionId: SESSION, server: "" }), /Invalid MCP App server/);
  await assert.rejects(bridge.call("mcp-app:nope", { sessionId: SESSION }), /Unknown MCP App action/);
});

test("MA-4 main.cjs wiring: one delegation before the switch; pane windows get the widget actions (R4i-mcp MC1)", () => {
  const main = fs.readFileSync(path.join(here, "../electron/main.cjs"), "utf8");
  assert.equal(main.split('require("./mcp-apps-host.cjs").createMcpAppsHost(').length - 1, 1);
  assert.equal(main.split('if (typeof action === "string" && action.startsWith("mcp-app:")) return mcpAppsHost.call(action, p);').length - 1, 1);
  const handler = main.indexOf('ipcMain.handle("desktop:call"');
  const delegation = main.indexOf('action.startsWith("mcp-app:")');
  assert.ok(handler > 0 && delegation > handler && delegation < main.indexOf("switch (action) {", handler));
  assert.ok(main.indexOf("const senderKind = validSender(e, action);", handler) < delegation);
  const popout = main.match(/const POPOUT_ACTIONS = new Set\(\[([^\]]*)\]\)/);
  assert.ok(popout);
  const allowed = JSON.parse(`[${popout[1]}]`);
  assert.deepEqual(allowed.filter((action) => action.startsWith("mcp-app:")), [...host.WIDGET_ACTIONS]);
  assert.equal(allowed.includes("mcp-app:tool-states"), false, "the send-time model context comes from the main window only");
});
