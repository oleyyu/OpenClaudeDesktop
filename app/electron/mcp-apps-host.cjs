"use strict";
// R4g-mcp MA-4: the main-process MCP App bridge (desktop:call "mcp-app:*"). The transcript's MCP App widgets
// (MA-5/MA-6, the official AppRenderer and its local client) read their ui:// resource, list a server's resources, call
// a server tool, learn which servers have App tools, and get their sandbox origin through here.
//
// Official 2.42304.0 (main/index.chunk-CFJssAFf.js, LocalSessions manager; preload mainView.js
// "LocalSessions_$_mcpReadResource" / "_$_mcpListResources" / "_$_mcpCallTool"):
//   mcpReadResource(e,t,n)  widgetIpcRefusal → {contents:[]}; a CLI-owned MCP App server (NA(cliMcpAppServerNames,t))
//                           → sessionCliMcpApps.readFromCliMcpAppServer → UA(query, server, uri, …); everything else
//                           (the built-in visualize server among them) → mcpCoordinator.readRemoteResource.
//   readFromCliMcpAppServer no query / server not listed → {contents:[], unavailable:NotConnected}; listed but no tool
//                           whose _meta names the uri (n.pu = B5tintml Ln) → {contents:[], unavailable:ReadFailed}.
//   UA                      only "ui://" (else BA = ReadFailed); deadline VA=3e4; reply checked with n.uu (B5tintml Fn:
//                           {contents:[{uri, mimeType?, text?, blob?, _meta?}]}); JSON over RA=10485760 → ReadFailed;
//                           each content's _meta through n.lu (B5tintml Un: ui.{resourceUri,visibility,prefersBorder},
//                           csp when the CLI runs as this user, and the legacy "ui/resourceUri").
//   mcpListResources(e,t)   widgetIpcRefusal → []; a CLI-owned server → []; else mcpCoordinator.listRemoteResources.
//   mcpCallTool(e,t,r,i)    widgetIpcRefusal → {content:[{type:"text",text}],isError:true}; a CLI-owned server, or a
//                           tool switched off for the session (n.Gn) → "Tool '<r>' is not permitted"; else callRemoteTool.
//   zA                      a session's CLI MCP App servers for the page: tools' _meta through n.lu, the whole list
//                           dropped when its JSON is over LA=1048576.
//   B5tintml Bn             which tools are App tools: In(_meta) has a ui:// resourceUri; ≤256 servers, ≤128 tools,
//                           names ≤128 matching Fe, descriptions cut at Pe=1024, uris ≤2048.
//   unavailable enum        muI2IV6k bgt / BaLvO2wi T: blocked_by_policy, needs_sign_in, not_connected, read_failed.
//
// Host mapping. The servers the running core connects (its config's MCP servers) are the host's counterpart of the
// official CLI-owned servers: they are read through the core and get the official CLI-server treatment (list → [],
// App-initiated tools/call refused). The built-in visualize server (MA-1, electron/visualize-adapters.cjs) is the
// counterpart of the official internal server and is served here directly, without the core. OpenClaude Desktop's
// own server (code_desktop: terminal, windows, files…) is never an App server: its tools are refused and only the
// visualize widget resource is read under its name (G8/G9). Only Codex (native, schema 0.155.1: mcpServerStatus/list
// with Tool _meta, mcpServer/resource/read) — or a core reporting the "mcpApps" capability — is asked; any other core
// (the DeepSeek Harness, ACP bridges) gets an explicit "core_unsupported" answer and no request (MA-8a/MA-8b).
// mcp-app:sandbox-origin is the main-process copy of cbc7fd025 x(e,t) (mcp-app-sandbox.cjs sandboxHash).
//
// R4i-mcp MC1. mcp-app:call-tool reads the MCP tools/call field `name` (the card's bridge client sends
// {name, arguments, _meta}; official preload "LocalSessions_$_mcpCallTool"(sessionId, server, toolName, args)).
// mcp-app:servers also says whether a listed core server is still starting (core.pending: a status whose runtimeStatus
// is "starting"), which the page repolls on CFJssAFf schedulePendingMcpRepoll's XA=[2e3,5e3,15e3,3e4,6e4].
// mcp-app:tool-states is the send-time half of the widgets' model context (ui/update-model-context): the renderer's
// shared-28 getModelContextStates(sessionId) goes out with each send (c6b8adeaf: `f.length>0 … ? f : void 0` as
// LocalSessions sendMessage's toolStates) and CFJssAFf noteAcceptedSend keeps it as the session's widgetToolStates
// (`r&&"toolStates"in r&&(e.widgetToolStates=r.toolStates)`). widgetContextHint is B5tintml Wx (export "aa", appended
// to the sent text as <widget_context_hint>) and readWidgetContext is BPh06o4s r (ccd_session read_widget_context);
// both are kept here for the core send path and the app tools server, which are not wired yet (report R4i-mcp-MC1).
const { createVisualizeServer, WIDGET_RESOURCE_URI, IMAGINE_SERVER_NAME } = require("./visualize-adapters.cjs");
const { SCHEME: SANDBOX_SCHEME, sandboxHash, sandboxProxyUrl } = require("./mcp-app-sandbox.cjs");

const ACTIONS = Object.freeze(["mcp-app:servers", "mcp-app:read-resource", "mcp-app:list-resources", "mcp-app:call-tool", "mcp-app:sandbox-origin", "mcp-app:tool-states"]);
// The actions a widget itself sends (official widget IPC: mcpReadResource / mcpListResources / mcpCallTool, plus the
// host's listing and sandbox origin); a pane window (main.cjs POPOUT_ACTIONS) draws widgets with these.
const WIDGET_ACTIONS = Object.freeze(ACTIONS.slice(0, 5));
// muI2IV6k bgt / BaLvO2wi T.
const UNAVAILABLE = Object.freeze({ BlockedByPolicy: "blocked_by_policy", NeedsSignIn: "needs_sign_in", NotConnected: "not_connected", ReadFailed: "read_failed" });
// Host reason beside `unavailable`: the running core has no MCP App source (no resource read, no Tool _meta).
const CORE_UNSUPPORTED = "core_unsupported";
const READ_DEADLINE_MS = 30000; // CFJssAFf VA
const MAX_CONTENTS_CHARS = 10485760; // CFJssAFf RA
const MAX_SERVER_LIST_CHARS = 1048576; // CFJssAFf LA
const UI_SCHEME = "ui://"; // B5tintml Nn = U7().startsWith(jn)
const MAX_SERVERS = 256, MAX_TOOLS = 128, MAX_NAME = 128, MAX_URI = 2048, MAX_DESCRIPTION = 1024; // B5tintml Rn / Bn / Pe
const TOOL_NAME = /^[\x21-\x7e]+(?: [\x21-\x7e]+)*$/; // B5tintml Fe
const UI_META_KEYS = new Set(["resourceUri", "visibility", "prefersBorder"]); // B5tintml Vn
const VISUALIZE_SERVER_UUID = "6f616b42-0ed8-571e-823f-ee4aca6b7ce9"; // shared-78 KD
const OWN_SERVER_NAME = "code_desktop"; // agent-tools-host.cjs SERVER_NAME
const METHOD_NOT_FOUND = -32601;
const MAX_PAGES = 100;
const MAX_SERVER_ID = 512;
const MAX_CACHED_SESSIONS = 32;
const SESSION_NOT_FOUND = "Session not found"; // CFJssAFf widgetIpcRefusal
const STARTING = "starting"; // Codex McpServerStatus.runtimeStatus while the server connects (customize-model.mjs)
const READ_WIDGET_CONTEXT = "read_widget_context"; // muI2IV6k y1t / B5tintml t.vJ
const MAX_TOOL_STATES = 256;
const UNSAFE_CHARS = /[\x00-\x1f\x7f-\x9f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g; // muI2IV6k mWt

/** muI2IV6k gWt(e,t): control and bidi characters as spaces, trimmed, cut at `max` code points with an ellipsis. */
function clip(text, max) {
  const chars = Array.from(String(text).replace(UNSAFE_CHARS, " ").trim());
  return chars.length > max ? `${chars.slice(0, max).join("")}\u2026` : chars.join("");
}
/** BPh06o4s t: a tool name quoted for the model. */
const quoted = (name) => `'${clip(name, 200).replace(/[<>'"\`]/g, "")}'`;

/**
 * The toolStates of one send (shared-28 getModelContextStates: [{tool_name, content:[{type:"text",text} |
 * {type:"image",data,media_type}]}]), or null when the shape is not that.
 */
function parseToolStates(value) {
  if (!Array.isArray(value) || value.length > MAX_TOOL_STATES) return null;
  const states = [];
  for (const state of value) {
    if (!isRecord(state) || typeof state.tool_name !== "string" || !state.tool_name || state.tool_name.length > MAX_NAME * 2 || !Array.isArray(state.content)) return null;
    const content = [];
    for (const block of state.content) {
      if (isRecord(block) && block.type === "text" && typeof block.text === "string") content.push({ type: "text", text: block.text });
      else if (isRecord(block) && block.type === "image" && typeof block.data === "string" && typeof block.media_type === "string") content.push({ type: "image", data: block.data, media_type: block.media_type });
      else return null;
    }
    states.push({ tool_name: state.tool_name, content });
  }
  return JSON.stringify(states).length > MAX_CONTENTS_CHARS ? null : states;
}

/** B5tintml Wx(e,t): the sent text with the <widget_context_hint> naming the widgets that shared something. */
function widgetContextHintFor(states, text, toolName) {
  if (!states?.length) return text;
  const safe = (value) => value.replace(/[<>]/g, "");
  return `${text}\n\n<widget_context_hint>Interactive widgets in this conversation: ${[...new Set(states.map((state) => safe(state.tool_name)))].join(", ")}. To read a widget's current state, call ${toolName} with the widget's tool_name.</widget_context_hint>`;
}

/** BPh06o4s r(e,r): the read_widget_context result for a tool name over the session's last-sent states. */
function readWidgetContextFrom(toolName, states) {
  if (toolName === "") return refusedText("tool_name is required: the full name of the tool call that drew the widget.");
  if (states.length === 0) return { content: [{ type: "text", text: `No widget had shared anything when the user last sent a message, so there is nothing to read for ${quoted(toolName)}. This is expected, not a failure: a widget's content reaches you only if the widget sends it to the host, and most never do. It also means you cannot tell from here whether the user changed the widget. Asking again gives the same answer until the user sends another message. If the user says they changed it, or if what you do next depends on what it shows now (sending a draft, for example), ask them to paste or describe the current content in the chat, or to press a button in the widget that sends it back, if it has one.` }] };
  const matching = states.filter((state) => state.tool_name === toolName);
  if (matching.length === 0) {
    const shared = [...new Set(states.map((state) => quoted(state.tool_name)))];
    return refusedText(`No widget context available for tool ${quoted(toolName)}. Widgets that have shared something: ${shared.join(", ")}. If you meant one of those, call again with that exact name. If ${quoted(toolName)} is a different widget, it has shared nothing, and you cannot tell from here whether the user changed it: ask them to paste or describe its current content if you need it.`);
  }
  const content = [];
  for (const state of matching) for (const block of state.content) {
    if (block.type === "text" && block.text !== undefined) content.push({ type: "text", text: block.text });
    else if (block.type === "image" && block.data !== undefined && block.media_type !== undefined) content.push({ type: "image", data: block.data, mimeType: block.media_type });
  }
  return { content };
}

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const notPermitted = (tool) => ({ content: [{ type: "text", text: `Tool '${tool}' is not permitted` }], isError: true });
const refusedText = (text) => ({ content: [{ type: "text", text }], isError: true });
const readFailed = () => ({ contents: [], unavailable: UNAVAILABLE.ReadFailed }); // CFJssAFf BA
const notConnected = (reason) => ({ contents: [], unavailable: UNAVAILABLE.NotConnected, ...(reason ? { reason } : {}) });

/** B5tintml Un(e,t): the App part of a _meta (keepCsp: the core runs as this user, as the host's always does). */
function filterUiMeta(meta, keepCsp) {
  if (typeof meta != "object" || !meta) return {};
  const { ui, "ui/resourceUri": legacy } = { ...meta };
  return {
    ...(typeof ui == "object" && !!ui && { ui: Object.fromEntries(Object.entries(ui).filter(([key]) => UI_META_KEYS.has(key) || (keepCsp && key === "csp"))) }),
    ...(legacy !== undefined && { "ui/resourceUri": legacy }),
  };
}

/** B5tintml In/Ln: a tool _meta's ui:// resource (ui.resourceUri, else the legacy "ui/resourceUri"), or undefined. */
function appResourceUri(meta) {
  if (!isRecord(meta)) return undefined;
  const { ui, "ui/resourceUri": legacy } = meta;
  const valid = (value) => value === undefined || (typeof value === "string" && value.startsWith(UI_SCHEME));
  if (ui !== undefined && !isRecord(ui)) return undefined;
  if (!valid(ui?.resourceUri) || !valid(legacy)) return undefined;
  return ui?.resourceUri ?? legacy;
}

/** B5tintml Bn for one server: its App tools (a Codex McpServerStatus.tools map, or an array), shaped for the page. */
function appToolsOf(tools) {
  const list = Array.isArray(tools) ? tools : isRecord(tools) ? Object.values(tools) : [];
  return list.flatMap((tool) => {
    if (!isRecord(tool) || typeof tool.name !== "string" || !isRecord(tool._meta)) return [];
    if (tool.description !== undefined && typeof tool.description !== "string") tool = { ...tool, description: undefined };
    return appResourceUri(tool._meta) === undefined ? [] : [tool];
  }).slice(0, MAX_TOOLS)
    .filter(({ name, _meta }) => name.length <= MAX_NAME && TOOL_NAME.test(name)
      && (typeof _meta.ui?.resourceUri === "string" ? _meta.ui.resourceUri : "").length <= MAX_URI
      && (typeof _meta["ui/resourceUri"] === "string" ? _meta["ui/resourceUri"] : "").length <= MAX_URI)
    .map(({ name, description, _meta }) => ({ name, ...(description !== undefined ? { description: description.slice(0, MAX_DESCRIPTION) } : {}), inputSchema: { type: "object" }, _meta: filterUiMeta(_meta, true) }));
}

/** B5tintml Fn (n.uu): {contents:[{uri, mimeType?, text?, blob?, _meta?}]} with unknown keys dropped, or null. */
function parseReadReply(reply) {
  if (!isRecord(reply) || !Array.isArray(reply.contents)) return null;
  const contents = [];
  for (const content of reply.contents) {
    if (!isRecord(content) || typeof content.uri !== "string") return null;
    for (const key of ["mimeType", "text", "blob"]) if (content[key] !== undefined && typeof content[key] !== "string") return null;
    if (content._meta !== undefined && !isRecord(content._meta)) return null;
    const { uri, mimeType, text, blob, _meta } = content;
    contents.push({ uri, ...(mimeType !== undefined && { mimeType }), ...(text !== undefined && { text }), ...(blob !== undefined && { blob }), ...(_meta !== undefined && { _meta }) });
  }
  return { contents };
}

/**
 * @param {object} options
 * @param {() => any} options.client the running core's client (codex.cjs: request(method, params, timeout), serverInfo)
 * @param {(id: string) => ({id: string, cwd: string} | null)} options.session a known session (main.cjs agentToolSession)
 * @param {() => boolean} [options.visualizeEnabled] the agent-tools "visualize" group (D35, on unless switched off)
 * @param {(serverInfo: any) => boolean} [options.coreSupportsMcpApps] whether the core serves MCP App sources
 * @param {() => string} [options.ownServerName] OpenClaude Desktop's own MCP server name (code_desktop)
 * @param {number} [options.deadlineMs] the resource-read deadline (VA)
 * @param {{warn?: Function}} [options.log]
 */
function createMcpAppsHost({ client, session, visualizeEnabled = () => true, coreSupportsMcpApps = () => false, ownServerName = () => OWN_SERVER_NAME, deadlineMs = READ_DEADLINE_MS, log = null } = {}) {
  if (typeof client !== "function" || typeof session !== "function") throw new TypeError("createMcpAppsHost: client and session must be functions.");
  const visualize = createVisualizeServer({ enabled: () => { try { return visualizeEnabled() === true; } catch { return false; } } }).getImagineServerDef();
  const warn = (message) => { try { log?.warn?.(`[mcp-app] ${message}`); } catch {} };
  // Per session: the core's App servers from the last listing ({owner, connection, servers: Map name → Set<uri>}).
  const cache = new Map();

  const ownName = () => { try { const name = ownServerName(); return typeof name === "string" && name ? name : OWN_SERVER_NAME; } catch { return OWN_SERVER_NAME; } };
  const visualizeOn = () => visualize.isEnabled() === true;
  const isVisualize = (server) => server === VISUALIZE_SERVER_UUID || server === IMAGINE_SERVER_NAME;
  const serverId = (value) => (typeof value === "string" && value && value.length <= MAX_SERVER_ID && !value.includes("\0") ? value : null);
  const known = (sessionId) => typeof sessionId === "string" && !!session(sessionId);

  // The core when it may be asked: {owner} | {refusal: {unavailable, reason?}}.
  function core() {
    const owner = client();
    if (!owner || typeof owner.request !== "function" || !owner.serverInfo || owner.connection?.closed === true) return { refusal: { unavailable: UNAVAILABLE.NotConnected } };
    let supported = false;
    try { supported = coreSupportsMcpApps(owner.serverInfo) === true; } catch {}
    return supported ? { owner } : { refusal: { unavailable: UNAVAILABLE.NotConnected, reason: CORE_UNSUPPORTED } };
  }
  const unsupportedError = (error) => error?.code === METHOD_NOT_FOUND;

  function remember(sessionId, entry) {
    cache.delete(sessionId);
    cache.set(sessionId, entry);
    while (cache.size > MAX_CACHED_SESSIONS) cache.delete(cache.keys().next().value);
  }

  // mcpServerStatus/list {threadId} → the core's servers with App tools (zA / Bn), cached for read-resource.
  async function coreServers(sessionId, owner, detail = null) {
    const statuses = [], seen = new Set();
    let cursor;
    do {
      const page = await owner.request("mcpServerStatus/list", { limit: 100, threadId: sessionId, ...(cursor ? { cursor } : {}) }, deadlineMs);
      statuses.push(...(Array.isArray(page?.data) ? page.data : []));
      cursor = typeof page?.nextCursor === "string" && page.nextCursor ? page.nextCursor : null;
      if (cursor && seen.has(cursor)) throw new Error("MCP pagination did not advance.");
      if (cursor) seen.add(cursor);
    } while (cursor && statuses.length < MAX_SERVERS && seen.size < MAX_PAGES);
    const own = ownName(), names = new Set();
    let servers = [];
    for (const status of statuses.slice(0, MAX_SERVERS)) {
      const name = status?.name;
      // Not an App server: OpenClaude Desktop's own, the built-in visualize name (the host serves it), duplicates.
      if (typeof name !== "string" || !name || name.length > MAX_NAME || name === own || isVisualize(name) || names.has(name)) continue;
      const tools = appToolsOf(status.tools);
      if (!tools.length) continue;
      names.add(name);
      servers.push({ name, type: "core", isBuiltIn: false, ...(typeof status.runtimeStatus === "string" ? { status: status.runtimeStatus } : {}), tools });
    }
    if (JSON.stringify(servers).length > MAX_SERVER_LIST_CHARS) servers = []; // zA
    remember(sessionId, { owner, connection: owner.connection, servers: new Map(servers.map((server) => [server.name, new Set(server.tools.map((tool) => appResourceUri(tool._meta)))])) });
    // A core server still connecting has no tools yet (CFJssAFf schedulePendingMcpRepoll: status "pending").
    if (detail) detail.pending = statuses.slice(0, MAX_SERVERS).some((status) => status?.runtimeStatus === STARTING && status?.name !== own && !isVisualize(status?.name));
    return servers;
  }

  function visualizeEntry() {
    return { name: IMAGINE_SERVER_NAME, uuid: VISUALIZE_SERVER_UUID, type: "local", isBuiltIn: true,
      tools: visualize.tools.map(({ name, description, inputSchema, _meta }) => ({ name, description, inputSchema, _meta })) };
  }

  async function servers(p) {
    if (!known(p.sessionId)) throw new Error("Unknown session.");
    const builtIn = visualizeOn() ? [visualizeEntry()] : [];
    const { owner, refusal } = core();
    if (refusal) return { servers: builtIn, core: { supported: false, ...refusal } };
    try {
      const detail = { pending: false };
      const listed = await coreServers(p.sessionId, owner, detail);
      return { servers: [...builtIn, ...listed], core: { supported: true, ...(detail.pending ? { pending: true } : {}) } };
    } catch (error) {
      if (unsupportedError(error)) return { servers: builtIn, core: { supported: false, unavailable: UNAVAILABLE.NotConnected, reason: CORE_UNSUPPORTED } };
      warn(`mcpServerStatus/list failed: ${error?.message ?? error}`);
      return { servers: builtIn, core: { supported: true, unavailable: UNAVAILABLE.ReadFailed } };
    }
  }

  // The uri's server in the session's last core listing: true (declared), false (listed, not declared), null (unlisted).
  function declared(sessionId, owner, server, uri) {
    const entry = cache.get(sessionId);
    if (!entry || entry.owner !== owner || entry.connection !== owner.connection) return null;
    const uris = entry.servers.get(server);
    return uris ? uris.has(uri) : null;
  }

  async function withDeadline(promise) {
    let timer;
    const late = Symbol("no reply before the deadline"); // CFJssAFf HA
    try {
      return await Promise.race([promise, new Promise((resolve) => { timer = setTimeout(() => resolve(late), deadlineMs); })]).then((value) => (value === late ? { late: true } : { value }));
    } finally { clearTimeout(timer); }
  }

  function readVisualize(uri) {
    if (!visualizeOn()) return notConnected();
    try { return visualize.handleReadResource(uri); } catch (error) { warn(`visualize resource read failed: ${error?.message ?? error}`); return readFailed(); }
  }

  async function readResource(p) {
    if (!known(p.sessionId)) return { contents: [] }; // widgetIpcRefusal
    const server = serverId(p.server), uri = p.uri;
    if (!server || typeof uri !== "string" || uri.length > MAX_URI) return readFailed();
    if (isVisualize(server)) return readVisualize(uri);
    // The visualize widget under the name of OpenClaude Desktop's own server (its show_widget, G8); nothing else of it.
    if (server === ownName()) return uri === WIDGET_RESOURCE_URI ? readVisualize(uri) : readFailed();
    if (!uri.startsWith(UI_SCHEME)) return readFailed(); // UA
    const { owner, refusal } = core();
    if (refusal) return { contents: [], ...refusal };
    try {
      let found = declared(p.sessionId, owner, server, uri);
      if (found !== true) { await coreServers(p.sessionId, owner); found = declared(p.sessionId, owner, server, uri); }
      if (found === null) return notConnected();
      if (found === false) return readFailed();
    } catch (error) {
      if (unsupportedError(error)) return notConnected(CORE_UNSUPPORTED);
      warn(`mcpServerStatus/list failed: ${error?.message ?? error}`);
      return notConnected();
    }
    const originCallId = typeof p.originCallId === "string" && p.originCallId && p.originCallId.length <= MAX_SERVER_ID ? p.originCallId : null;
    try {
      const reply = await withDeadline(owner.request("mcpServer/resource/read", { threadId: p.sessionId, server, uri, ...(originCallId ? { originCallId } : {}) }, deadlineMs));
      if (reply.late) { warn("readMcpResource failed (no reply)"); return readFailed(); }
      const parsed = parseReadReply(reply.value);
      if (!parsed) { warn("readMcpResource failed (malformed reply)"); return readFailed(); }
      if (JSON.stringify(parsed.contents).length > MAX_CONTENTS_CHARS) return readFailed();
      return { contents: parsed.contents.map(({ _meta, ...rest }) => ({ ...rest, ...(_meta && { _meta: filterUiMeta(_meta, true) }) })) };
    } catch (error) {
      if (unsupportedError(error)) return notConnected(CORE_UNSUPPORTED);
      warn("readMcpResource failed (error)");
      return readFailed();
    }
  }

  function listResources(p) {
    if (!known(p.sessionId)) return [];
    const server = serverId(p.server);
    // Only the built-in server lists; the core's servers are CLI-owned in the official sense (NA → []).
    if (server && isVisualize(server) && visualizeOn()) { try { return visualize.handleListResources(); } catch { return []; } }
    return [];
  }

  async function callTool(p) {
    // MCP tools/call {name, arguments, _meta}: the card's bridge client (source-mcp-app-card-adapters.jsx) sends `name`.
    const tool = typeof p.name === "string" ? p.name.slice(0, MAX_NAME) : "";
    if (!known(p.sessionId)) return refusedText(SESSION_NOT_FOUND);
    const server = serverId(p.server);
    if (!server || !tool) return notPermitted(tool);
    if (p.arguments !== undefined && p.arguments !== null && !isRecord(p.arguments)) return notPermitted(tool);
    // The built-in server's own tools only; OpenClaude Desktop's own tools and the core's servers are refused (official
    // CLI-owned branch; G9: a widget never reaches the terminal, windows or files tools).
    if (!isVisualize(server) || !visualizeOn() || !visualize.tools.some((definition) => definition.name === tool)) return notPermitted(tool);
    try { return await visualize.handleToolCall(tool, p.arguments ?? {}); } catch (error) { return refusedText(String(error?.message ?? error)); }
  }

  function sandboxOrigin(p) {
    if (!known(p.sessionId)) throw new Error("Unknown session.");
    const server = serverId(p.server);
    if (!server) throw new Error("Invalid MCP App server.");
    const hash = sandboxHash(p.sessionId, server);
    return { hash, origin: `${SANDBOX_SCHEME}://${hash}`, proxyUrl: sandboxProxyUrl(hash) };
  }

  // Per session: the toolStates of its last send that carried any (CFJssAFf noteAcceptedSend → widgetToolStates).
  const toolStates = new Map();
  function noteToolStates(p) {
    if (!known(p.sessionId)) return { stored: false };
    const states = parseToolStates(p.toolStates);
    if (!states) return { stored: false };
    toolStates.delete(p.sessionId);
    toolStates.set(p.sessionId, states);
    while (toolStates.size > MAX_CACHED_SESSIONS) toolStates.delete(toolStates.keys().next().value);
    return { stored: true, count: states.length };
  }
  const widgetToolStates = (sessionId) => toolStates.get(sessionId) ?? [];
  const widgetContextHint = (sessionId, text, toolName = `mcp__${ownName()}__${READ_WIDGET_CONTEXT}`) => widgetContextHintFor(toolStates.get(sessionId), text, toolName);
  const readWidgetContext = (sessionId, toolName) => readWidgetContextFrom(typeof toolName === "string" ? toolName : "", widgetToolStates(sessionId));

  async function call(action, p) {
    const params = isRecord(p) ? p : {};
    switch (action) {
      case "mcp-app:servers": return servers(params);
      case "mcp-app:read-resource": return readResource(params);
      case "mcp-app:list-resources": return listResources(params);
      case "mcp-app:call-tool": return callTool(params);
      case "mcp-app:sandbox-origin": return sandboxOrigin(params);
      case "mcp-app:tool-states": return noteToolStates(params);
      default: throw new Error("Unknown MCP App action.");
    }
  }

  return { call, servers, readResource, listResources, callTool, sandboxOrigin, widgetToolStates, widgetContextHint, readWidgetContext,
    forget: (sessionId) => { cache.delete(sessionId); toolStates.delete(sessionId); } };
}

module.exports = {
  ACTIONS, WIDGET_ACTIONS, READ_WIDGET_CONTEXT, UNAVAILABLE, CORE_UNSUPPORTED, READ_DEADLINE_MS, MAX_CONTENTS_CHARS, MAX_SERVER_LIST_CHARS, VISUALIZE_SERVER_UUID,
  filterUiMeta, appResourceUri, appToolsOf, parseReadReply, parseToolStates, widgetContextHintFor, readWidgetContextFrom, createMcpAppsHost,
};
