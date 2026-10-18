// The main-process side of OpenClaude Desktop's agent tools (the local MCP server every core runs for the app's
// sessions; agent-tools-server.mjs is the stdio relay a core starts).
//
//   core ──stdio MCP──▶ agent-tools-server.mjs ──unix socket (0700 dir, random token)──▶ this host ──▶ tool modules
//
// Tool modules are app/electron/agent-tools/*.mjs, each exporting
//   export const tools = [{ name, description, inputSchema, annotations?, title?, approval?, handler: async (args, ctx) => result }]
//   (approval: "prompt" keeps the core's own per-call approval for that tool; by default the app's tools run without it)
//   export const group = "preview"            (optional: the Settings switch that turns the module's tools off)
//   export const native = "WebFetch"          (optional, or a tool's own `native`: the Claude tool it stands in for; a core
//                                              whose capabilities list it in nativeTools has its own, so it isn't offered)
//   mainOnly: true on a tool                  (optional: for the main conversation only — Workflow, set_session_title,
//                                              mark_chapter, CronCreate: a sub-agent's call is refused, as Claude Code
//                                              withholds them from its sub-agents)
// A handler's ctx is { sessionId, cwd, requestApproval, signal, log, ...services } where services are what the app
// provided with host.provide(name, (session, ctx) => value) — preview (preview-service.cjs), terminals (terminal-service),
// … — so a module asking for another service only needs one provide() call in main.cjs.
// ctx.signal aborts when the call can no longer matter: the core's connection to the server closed, the core sent
// notifications/cancelled for it, or the app stopped the session's turn (cancelSession: a stopped or interrupted turn,
// which Codex doesn't tell its MCP servers about). ctx.requestApproval passes it on, so an open sheet closes as a No.
// A result is an MCP CallToolResult ({content:[…], isError?}), or a string (text), or {image:{data, mimeType}, text?},
// or anything JSON (pretty text). A thrown Error is a tool error the agent sees.
//
// Sessions: a core runs one MCP server per app session (Codex per thread, cwd = the thread's folder). The server
// names its session in CODE_DESKTOP_AGENT_SESSION: a thread id, or a start token minted for thread/start that
// bindThread() points at the new thread once the core answers. tools/call `_meta.threadId` (Codex) is the fallback.
// Tools always act on that session only.
// The calling thread: a core that runs sub-agents in threads of their own (Codex's spawn_agent) gives them the parent's
// server config, so their calls name the parent session; Codex says which thread is calling (_meta.threadId on every
// tools/call). It is kept as information only, never the session acted on (ctx.call.thread, ctx.call.subAgent): a
// sub-agent's call is cancelled by that sub-agent's own turn ending (cancelThread), never by the parent's, and a
// mainOnly tool refuses it.
//
// Credentials: the channel's secret (CODE_DESKTOP_AGENT_TOOLS_TOKEN) lets a server name any session, so it stays with
// the core processes (every agent shell has it removed). A server started for one session can carry that session's own
// credential instead (sessionToken: HMAC of the secret and the session's name, computed the same way by the bridges'
// app-tools.js): it is accepted only for the session it names, and a call from it acts on that session alone (no
// per-call session, no _meta.threadId fallback). A file or process that holds it gives away nothing more.
const SESSION_TOKEN_LABEL = "code-desktop-agent-session\n";
/** A session's own credential: HMAC-SHA256(secret, "code-desktop-agent-session\n" + session), hex. */
function sessionTokenFor(secret, session) {
  return crypto.createHmac("sha256", String(secret)).update(SESSION_TOKEN_LABEL + String(session)).digest("hex");
}
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { INSTRUCTIONS } = require("./agent-tools-instructions.cjs");

const SERVER_NAME = "code_desktop";
// The tool a core that can't defer tools loads the deferred groups with (deferredGroups below).
const LOAD_TOOL = "load_tools";
const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;
const START_TOKEN = /^start-[0-9a-f-]{36}$/;
const MAX_LINE = 4 * 1024 * 1024;
const MAX_TEXT = 200000;
// load_tools' result waits for the core's next tools/list (loadGroups), then this long for the core to apply it.
const LIST_WAIT_MS = 2000, LIST_SETTLE_MS = 150;
// Loaded groups remembered per server identity and folder (a restarted server keeps what the model was told).
const MAX_REMEMBERED_LOADS = 200;

function safeEqual(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** A handler's return value as an MCP CallToolResult. */
function toolResult(value) {
  if (value && typeof value === "object" && Array.isArray(value.content)) {
    return { content: value.content.filter((part) => part && typeof part === "object" && typeof part.type === "string"), ...(value.isError ? { isError: true } : {}), ...(value.structuredContent !== undefined ? { structuredContent: value.structuredContent } : {}),
      // An MCP result _meta passes through (the ccd_turn wrap_up answer carries {"claude/endTurn": true}).
      ...(value._meta && typeof value._meta === "object" && !Array.isArray(value._meta) ? { _meta: value._meta } : {}) };
  }
  if (typeof value === "string") return { content: [{ type: "text", text: value.slice(0, MAX_TEXT) }] };
  if (value && typeof value === "object" && value.image && typeof value.image.data === "string") {
    const content = [];
    if (typeof value.text === "string" && value.text) content.push({ type: "text", text: value.text.slice(0, MAX_TEXT) });
    content.push({ type: "image", data: value.image.data, mimeType: value.image.mimeType || "image/png" });
    return { content };
  }
  if (value === undefined || value === null) return { content: [{ type: "text", text: "Done." }] };
  let text;
  try { text = JSON.stringify(value, null, 2); } catch { text = String(value); }
  return { content: [{ type: "text", text: String(text).slice(0, MAX_TEXT) }] };
}

/** The Claude tool a module's tool stands in for (its own `native`, else the module's), or null. */
function nativeOf(tool, module) {
  const value = typeof tool?.native === "string" ? tool.native : typeof module?.native === "string" ? module.native : null;
  return value && value.trim() ? value.trim() : null;
}

function validTool(tool) {
  return tool && typeof tool === "object" && typeof tool.name === "string" && TOOL_NAME.test(tool.name)
    && typeof tool.description === "string" && typeof tool.handler === "function";
}

/**
 * @param {object} options
 * @param {string} [options.toolsDir]        where the tool modules are (default ./agent-tools)
 * @param {(session: string|null, meta: {threadId?: string|null}) => ({id: string, cwd: string|null}|null)} options.resolveSession
 * @param {(group: string) => boolean} [options.isGroupEnabled]
 * @param {(group: string) => boolean} [options.isGroupListed]  what tools/list offers (default: isGroupEnabled). A core
 *        that never reads the list again (Codex ignores tools/list_changed) is offered a group that is merely turned
 *        off, so turning it on reaches its open sessions; a call while it is off is refused, naming the setting.
 * @param {(tool: {name: string, native: string|null, group: string}, server: {session: string|null}) => boolean} [options.isToolListed]
 *        whether the running core is served a tool at all (both tools/list and tools/call): a tool that stands in for a
 *        Claude tool the core already has (its nativeTools capability) is left out, so the agent never sees two of the
 *        same. server.session: the identity the asking server names (a thread id or a start token), else null.
 * @param {() => string[]} [options.deferredGroups]  groups a core that can’t defer tools itself (DeepSeek, OpenCode, MiMo: no
 *        tool search) is not offered until the model loads them with load_tools: every tool definition goes out with
 *        each model request there, so the rarely used, long ones (Workflow, Monitor, CronCreate…) wait until needed.
 *        Loaded per server (OpenCode runs one per folder), remembered by the server's session and folder so a restarted
 *        server keeps them; tools/list_changed tells the core, and load_tools answers once the core has listed again.
 * @param {(session: {id, cwd}, tool: string) => (string|null)} [options.refuseCall]  a reason the session can't use
 *        this tool right now (a Codex review, which runs read-only and never asks), else null: the call fails with it
 *        and no approval card opens.
 * @param {(session: {id, cwd}, request: object) => Promise<boolean>} [options.requestApproval]
 * @param {string} [options.serverScript]    the stdio server (default ./agent-tools-server.mjs)
 * @param {string} [options.command]         the program that runs it (default process.execPath, as Node)
 * @param {Array} [options.modules]          tool modules already loaded (tests)
 */
function createAgentToolsHost({
  toolsDir = path.join(__dirname, "agent-tools"),
  resolveSession,
  isGroupEnabled = () => true,
  isGroupListed = null,
  isToolListed = () => true,
  requestApproval = async () => false,
  refuseCall = () => null,
  deferredGroups = () => [],
  serverScript = path.join(__dirname, "agent-tools-server.mjs"),
  command = process.execPath,
  runAsNode = !!process.versions.electron,
  modules = null,
  tmpRoot = os.tmpdir(),
  logger = console,
} = {}) {
  if (typeof resolveSession !== "function") throw new Error("resolveSession is required.");
  const token = crypto.randomBytes(32).toString("hex");
  const services = new Map();
  const startTokens = new Map(); // token → thread id (null until bound)
  const connections = new Set();
  const pendingCalls = new Set(); // { controller, session, caller }: the calls still running (caller: the calling thread, or null)
  let dir = null, socketPath = null, server = null;
  let tools = new Map(); // name → { tool, group, native }
  let loading = null;

  async function load() {
    const loaded = new Map();
    const list = modules ?? await (async () => {
      let files = [];
      try { files = fs.readdirSync(toolsDir).filter((file) => file.endsWith(".mjs")).sort(); } catch { files = []; }
      const out = [];
      for (const file of files) {
        try { out.push({ file, module: await import(pathToFileURL(path.join(toolsDir, file)).href) }); }
        catch (error) { logger.warn?.(`agent tools: ${file} failed to load: ${error?.message || error}`); }
      }
      return out;
    })();
    for (const entry of list) {
      const module = entry.module ?? entry;
      const group = typeof module.group === "string" && module.group ? module.group : (entry.file ? entry.file.replace(/\.mjs$/, "") : "tools");
      for (const tool of Array.isArray(module.tools) ? module.tools : []) {
        if (!validTool(tool)) { logger.warn?.(`agent tools: skipped an invalid tool in ${entry.file ?? group}`); continue; }
        if (loaded.has(tool.name)) { logger.warn?.(`agent tools: duplicate tool ${tool.name} in ${entry.file ?? group}`); continue; }
        loaded.set(tool.name, { tool, group, native: nativeOf(tool, module) });
      }
    }
    tools = loaded;
    return tools;
  }
  const ready = () => (loading ??= load());

  const servedToCore = ({ tool, group, native }, session = null) => {
    try { return isToolListed({ name: tool.name, native: native ?? null, group }, { session: typeof session === "string" && session ? session : null }) !== false; } catch { return true; }
  };
  const deferred = () => { try { const list = deferredGroups(); return new Set(Array.isArray(list) ? list.filter((group) => typeof group === "string") : []); } catch { return new Set(); } };
  // What each deferrable group gives, for load_tools' description (the model decides from it what to load).
  const GROUP_SUMMARIES = {
    workflow: "Workflow: run a dynamic multi-agent workflow (load it before calling Workflow: the user said \"ultracode\", asked for a workflow, or ultracode is on)",
    monitor: "Monitor: run a command in the background and get each line it prints as it arrives",
    schedule: "CronCreate, CronList, CronDelete: schedule a prompt for later or on a repeating schedule (\"remind me at 3pm\", \"every 10 minutes\")",
    findings: "ReportFindings: report code-review findings as a typed list the app shows",
    notebook: "NotebookEdit: edit, insert or delete a cell of a Jupyter notebook",
    web: "WebFetch: fetch a web page and read its content",
    sessions: "tools that read the user's other sessions",
    host: "tools that open a file in the user's editor or show it in Finder",
    window: "get_window_layout, open_session_in, close_split, set_sidebar_collapsed: read the app's window layout and arrange where this session shows",
  };
  // load_tools groups by server: identity (a session, or none for a server shared by a folder) and the server's folder.
  const loads = new Map(); // key → Set<group>
  function rememberedLoads(identity, cwd) {
    const folder = typeof cwd === "string" && path.isAbsolute(cwd) && cwd.length <= 4096 && !cwd.includes("\0") ? cwd : null;
    if (!folder) return new Set();
    const key = `${identity ?? ""}\u0000${folder}`;
    let set = loads.get(key);
    if (set) loads.delete(key); else set = new Set();
    loads.set(key, set);
    while (loads.size > MAX_REMEMBERED_LOADS) loads.delete(loads.keys().next().value);
    return set;
  }
  /** The groups a connection is still waiting to load (listed, deferred and not yet loaded), in load order. */
  function pendingGroups(connection) {
    if (!connection) return [];
    const listed = typeof isGroupListed === "function" ? isGroupListed : isGroupEnabled;
    const defer = deferred();
    const groups = [];
    for (const entry of tools.values()) if (defer.has(entry.group) && !connection.loaded?.has(entry.group) && listed(entry.group) && servedToCore(entry, connection.identity) && !groups.includes(entry.group)) groups.push(entry.group);
    return groups;
  }
  function loadToolDefinition(groups) {
    return {
      name: LOAD_TOOL,
      title: "Load more OpenClaude Desktop tools",
      description: `Load more of OpenClaude Desktop's tools into this session. To keep each request small, these aren't loaded yet:\n${groups.map((group) => `- ${group}: ${GROUP_SUMMARIES[group] ?? "more OpenClaude Desktop tools"}`).join("\n")}\nCall this with the groups you need before using their tools; they are available from your next step.`,
      inputSchema: { type: "object", properties: { groups: { type: "array", items: { type: "string", enum: groups }, minItems: 1, description: "The groups to load." } }, required: ["groups"], additionalProperties: false },
      annotations: { title: "Load more OpenClaude Desktop tools", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    };
  }
  /** tools/list. connection: the server connection asking (deferred groups apply to it); none = every tool. */
  function listTools(connection = null) {
    const listed = typeof isGroupListed === "function" ? isGroupListed : isGroupEnabled;
    const defer = connection ? deferred() : new Set();
    const out = [...tools.values()].filter((entry) => listed(entry.group) && servedToCore(entry, connection?.identity) && (!defer.has(entry.group) || connection.loaded?.has(entry.group))).map(({ tool }) => ({
      name: tool.name,
      ...(typeof tool.title === "string" ? { title: tool.title } : {}),
      description: tool.description,
      inputSchema: tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : { type: "object", properties: {} },
      ...(tool.annotations && typeof tool.annotations === "object" ? { annotations: tool.annotations } : {}),
    }));
    const pending = pendingGroups(connection);
    if (pending.length) out.push(loadToolDefinition(pending));
    return out;
  }
  /** context-breakdown (session rail Context card): the tool definitions a session's code_desktop server lists to its
   * core right now (`tools`, load_tools included while groups wait) and the deferred groups' tools it does not list yet
   * (`deferred`). A session without a live server is answered as a fresh one (nothing loaded). */
  function sessionToolLists(threadId) {
    const named = (identity) => (typeof identity === "string" && START_TOKEN.test(identity) ? startTokens.get(identity) ?? null : identity);
    const connection = [...connections].find((entry) => named(entry.identity) === threadId) ?? { identity: threadId, loaded: new Set() };
    const listed = typeof isGroupListed === "function" ? isGroupListed : isGroupEnabled;
    const pending = new Set(pendingGroups(connection));
    const deferredTools = [...tools.values()].filter((entry) => pending.has(entry.group) && listed(entry.group) && servedToCore(entry, connection.identity))
      .map(({ tool }) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : { type: "object", properties: {} } }));
    return { tools: listTools(connection), deferred: deferredTools };
  }
  /** load_tools on one connection: the groups join its list, and the core is told to read it again. */
  function loadGroups(connection, args) {
    const pending = pendingGroups(connection);
    const asked = Array.isArray(args?.groups) ? args.groups.filter((group) => typeof group === "string") : [];
    const chosen = asked.filter((group) => pending.includes(group));
    const unknown = asked.filter((group) => !pending.includes(group) && !connection.loaded?.has(group));
    if (!chosen.length) {
      if (asked.length && !unknown.length) return { content: [{ type: "text", text: `Already loaded: ${asked.join(", ")}.` }] };
      return { content: [{ type: "text", text: `Nothing to load${unknown.length ? ` (unknown: ${unknown.join(", ")})` : ""}. Groups not loaded yet: ${pending.join(", ") || "none"}.` }], isError: !!unknown.length };
    }
    connection.loaded ??= new Set();
    for (const group of chosen) connection.loaded.add(group);
    const names = [...tools.values()].filter((entry) => chosen.includes(entry.group) && servedToCore(entry, connection.identity)).map(({ tool }) => tool.name);
    const result = { content: [{ type: "text", text: `Loaded ${chosen.join(", ")}: ${names.join(", ")}. They are available from your next step.` }] };
    // The result waits for the core to read the list again: OpenCode re-lists in its tools/list_changed handler while
    // the next step's tools are already being resolved, so a result sent at once reaches a step without the tools
    // ("Model tried to call unavailable tool"). Held until this connection's next tools/list was answered (plus a
    // moment for the core to take it in), at most LIST_WAIT_MS for a core that never lists again.
    const listed = new Promise((resolve) => {
      let timer = null;
      const done = () => { clearTimeout(timer); connection.listWaiters?.delete(wake); resolve(); };
      const wake = () => { clearTimeout(timer); timer = setTimeout(done, LIST_SETTLE_MS); timer.unref?.(); };
      connection.listWaiters ??= new Set();
      connection.listWaiters.add(wake);
      timer = setTimeout(done, LIST_WAIT_MS);
      timer.unref?.();
      connection.closed?.then(done);
    });
    connection.send({ type: "list_changed" });
    return listed.then(() => result);
  }

  /** The session a server's identity names: a bound start token, a thread id, else Codex's _meta.threadId. */
  function sessionFor(identity, meta = {}, { scoped = false } = {}) {
    // The server's own identity wins; a per-call one (meta.session, see agent-tools-server.mjs) serves a shared server.
    // A server holding a session's own credential (scoped) acts for that session only. A call the core itself names
    // a thread for (Codex's _meta.threadId: one server per thread, never shared) never takes the per-call session: that
    // is a tool argument the model writes, so a Codex thread's server could otherwise act on any session it names.
    const coreThread = typeof meta?.threadId === "string" && !!meta.threadId;
    let named = typeof identity === "string" && identity ? identity : !scoped && !coreThread && typeof meta?.session === "string" && meta.session ? meta.session : null;
    if (named && START_TOKEN.test(named)) named = startTokens.get(named) ?? null;
    if (scoped && !named) return null;
    return resolveSession(named, { threadId: !scoped && typeof meta?.threadId === "string" ? meta.threadId : null });
  }

  const ids = (value) => (typeof value === "string" && value && value.length <= 200 ? value : null);
  /** The thread the core says is calling (Codex _meta.threadId), else null: information only (see the header). */
  const callerOf = (meta) => ids(meta?.threadId);
  function context(session, signal, meta = {}) {
    const caller = callerOf(meta);
    const ctx = {
      sessionId: session.id,
      cwd: session.cwd ?? null,
      signal,
      // The core's own names for this call, when it sends them (Codex: _meta.callId / _meta.itemId), and the thread
      // calling (thread; subAgent: a sub-agent thread of the session, Codex's spawn_agent, not the session's own).
      call: { callId: ids(meta?.callId), itemId: ids(meta?.itemId), thread: caller, subAgent: !!caller && caller !== session.id },
      requestApproval: (request = {}, options = {}) => requestApproval(session, request, { ...options, signal: options?.signal ?? signal, call: options?.call ?? ctx.call }),
      log: (...args) => logger.log?.("[agent tools]", session.id, ...args),
    };
    for (const [name, factory] of services) {
      Object.defineProperty(ctx, name, { enumerable: true, configurable: true, get() { const value = factory(session, ctx); Object.defineProperty(ctx, name, { value, enumerable: true }); return value; } });
    }
    return ctx;
  }

  async function call(identity, { name, arguments: args = {}, meta = {} } = {}, signal, { scoped = false } = {}) {
    await ready();
    const entry = tools.get(name);
    if (!entry || !isGroupEnabled(entry.group)) throw new Error(entry ? `${name} is turned off in OpenClaude Desktop’s settings.` : `Unknown tool: ${name}`);
    if (!servedToCore(entry, identity)) throw new Error(`${name} isn’t offered to this agent: use its own ${entry.native ?? name} tool.`);
    const session = sessionFor(identity, meta, { scoped });
    if (!session?.id) throw new Error("This tool works only in an OpenClaude Desktop session.");
    const caller = callerOf(meta);
    if (entry.tool.mainOnly === true && caller && caller !== session.id)
      throw new Error(`${name} is for the main conversation only: a sub-agent can’t use it. Finish your task and report back; the main agent can use ${name} if it is needed.`);
    const refusal = refuseCall(session, name);
    if (typeof refusal === "string" && refusal) throw new Error(refusal);
    // The call's own signal: the connection's (or the relay's per-call cancel), and the session's turn being stopped.
    const controller = new AbortController();
    const forward = () => controller.abort(signal?.reason);
    if (signal?.aborted) controller.abort(signal.reason); else signal?.addEventListener?.("abort", forward, { once: true });
    const record = { controller, session: session.id, caller };
    pendingCalls.add(record);
    try {
      const result = toolResult(await entry.tool.handler(args && typeof args === "object" ? args : {}, context(session, controller.signal, meta)));
      rememberImages(session.id, name, result);
      return result;
    } catch (error) {
      return { content: [{ type: "text", text: String(error?.message || error).slice(0, MAX_TEXT) }], isError: true };
    } finally {
      signal?.removeEventListener?.("abort", forward);
      pendingCalls.delete(record);
    }
  }
  // The image a call returned, kept briefly by session and tool: some cores pass an MCP image to the model but report
  // only a placeholder text in their tool item (ZCode "[Attached image/png: MCP image]", Qwen "[Tool 'screenshot'
  // provided the following image data…]", Gemini "[Image: image/png]"), so main puts the picture back (recentImages).
  const IMAGE_KEEP_MS = 5 * 60 * 1000;
  const images = new Map(); // `${session}\u0000${tool}` → { content, at }
  function rememberImages(sessionId, tool, result) {
    const content = Array.isArray(result?.content) ? result.content.filter((part) => part?.type === "image" && typeof part.data === "string") : [];
    const key = `${sessionId}\u0000${tool}`;
    if (!content.length) { images.delete(key); return; }
    images.delete(key);
    images.set(key, { content, at: Date.now() });
    while (images.size > 50) images.delete(images.keys().next().value);
  }
  /** The image blocks the session's latest call of `tool` returned (within a few minutes), else null. */
  function recentImages(sessionId, tool) {
    const entry = images.get(`${sessionId}\u0000${tool}`);
    return entry && Date.now() - entry.at <= IMAGE_KEEP_MS ? entry.content.map((part) => ({ ...part })) : null;
  }

  function cancelWhere(match, reason) {
    let count = 0;
    for (const record of [...pendingCalls]) {
      if (match(record) && !record.controller.signal.aborted) { record.controller.abort(new Error(reason)); count += 1; }
    }
    return count;
  }
  /** The session ends (archived, removed): every tool call for it still running is cancelled, its sub-agents' too. */
  function cancelSession(sessionId, reason = "The turn was stopped.") {
    if (typeof sessionId !== "string" || !sessionId) return 0;
    return cancelWhere((record) => record.session === sessionId || record.caller === sessionId, reason);
  }
  /**
   * A thread's turn ended or was stopped: the calls that thread made are cancelled (their approval sheets close). A
   * call whose core named no calling thread counts as its session's own; a sub-agent's call (Codex names its thread)
   * waits for that sub-agent's own turn instead.
   */
  function cancelThread(threadId, reason = "The turn was stopped.") {
    if (typeof threadId !== "string" || !threadId) return 0;
    return cancelWhere((record) => record.caller === threadId || (!record.caller && record.session === threadId), reason);
  }

  function serve(socket) {
    let authed = false, identity = null, scoped = false, buffer = "";
    const controller = new AbortController();
    const callControllers = new Map(); // channel request id → the call's AbortController
    const send = (message) => { if (!socket.destroyed) socket.write(JSON.stringify(message) + "\n"); };
    let closed = null;
    const entry = { socket, send, get identity() { return identity; }, closed: new Promise((resolve) => { closed = resolve; }), listWaiters: new Set(), loaded: null };
    socket.setEncoding("utf8");
    const authTimer = setTimeout(() => { if (!authed) socket.destroy(); }, 5000);
    socket.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > MAX_LINE) { socket.destroy(); return; }
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        let message;
        try { message = JSON.parse(line); } catch { socket.destroy(); return; }
        if (!authed) {
          const named = typeof message?.session === "string" && message.session && message.session.length <= 200 ? message.session : null;
          // The channel's secret (any session), else the named session's own credential (that session only).
          const master = message?.type === "hello" && safeEqual(message.token ?? "", token);
          if (!master && !(message?.type === "hello" && named && safeEqual(message.token ?? "", sessionTokenFor(token, named)))) { socket.destroy(); return; }
          authed = true;
          clearTimeout(authTimer);
          identity = named;
          scoped = !master;
          // What this server's model already loaded with load_tools: kept per identity and folder, so a server the core
          // restarts (OpenCode disposes its instance on a config change) starts with the groups the model was told it has.
          entry.loaded = rememberedLoads(identity, message?.cwd);
          connections.add(entry);
          send({ type: "welcome" });
          continue;
        }
        // notifications/cancelled from the core, relayed for one call of this connection.
        if (message?.type === "cancel") { if (typeof message.id === "number") callControllers.get(message.id)?.abort(new Error("The call was cancelled.")); continue; }
        const { id, method, params } = message ?? {};
        if (typeof id !== "number") continue;
        let work;
        if (method === "call" && params?.name === LOAD_TOOL) work = ready().then(() => loadGroups(entry, params?.arguments));
        else if (method === "call") {
          const own = new AbortController();
          const forward = () => own.abort(controller.signal.reason);
          controller.signal.addEventListener("abort", forward, { once: true });
          callControllers.set(id, own);
          work = call(identity, params, own.signal, { scoped }).finally(() => { controller.signal.removeEventListener("abort", forward); if (callControllers.get(id) === own) callControllers.delete(id); });
        } else if (method === "list") {
          // load_tools results waiting for this list (registered before it was asked): released once it is answered.
          const waiting = [...entry.listWaiters];
          work = ready().then(() => ({ tools: listTools(entry) }));
          work.finally(() => { for (const wake of waiting) wake(); }).catch(() => {});
        } else work = Promise.reject(new Error("Unknown request."));
        work.then((result) => send({ id, result }), (error) => send({ id, error: { message: String(error?.message || error) } }));
      }
    });
    const drop = () => { clearTimeout(authTimer); controller.abort(); connections.delete(entry); closed(); };
    socket.on("close", drop);
    socket.on("error", drop);
  }

  async function start() {
    if (server) return { socketPath, token };
    await ready();
    // A unix socket path is limited to ~104 bytes: a long temp root falls back to /tmp (still a private 0700 dir).
    const base = path.join(tmpRoot, "cd-tools-XXXXXX", "s").length <= 100 ? tmpRoot : (process.platform === "win32" ? os.tmpdir() : "/tmp");
    dir = fs.mkdtempSync(path.join(base, "cd-tools-"));
    fs.chmodSync(dir, 0o700);
    socketPath = path.join(dir, "s");
    server = net.createServer(serve);
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(socketPath, () => { server.off("error", reject); resolve(); }); });
    try { fs.chmodSync(socketPath, 0o600); } catch { /* best effort: the directory is 0700 */ }
    return { socketPath, token };
  }
  function stop() {
    for (const { socket } of connections) socket.destroy();
    connections.clear();
    try { server?.close(); } catch { /* closed */ }
    server = null;
    if (dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } }
    dir = null;
    socketPath = null;
  }

  // How a core starts the stdio server.
  const serverCommand = () => ({ command, args: [serverScript], env: runAsNode ? { ELECTRON_RUN_AS_NODE: "1" } : {} });
  /** The variables every core gets: where the channel is, its secret, and the server definition (for bridges). */
  function launchEnv() {
    if (!socketPath) return {};
    return {
      CODE_DESKTOP_AGENT_TOOLS_SOCKET: socketPath,
      CODE_DESKTOP_AGENT_TOOLS_TOKEN: token,
      // instructions: for bridges whose agent never shows the model an MCP server's initialize instructions (ZCode).
      CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: SERVER_NAME, ...serverCommand(), instructions: INSTRUCTIONS }),
    };
  }
  /**
   * Codex's `-c` launch overrides: the server definition (never written to ~/.codex/config.toml). The secret and
   * socket reach the server through env_vars (Codex forwards only listed variables), so they never appear in the
   * command line; the per-session identity is a thread-level config override (sessionConfig).
   */
  function codexArgs() {
    if (!socketPath) return [];
    const { command: program, args, env } = serverCommand();
    const toml = (value) => JSON.stringify(value);
    const out = [
      "-c", `mcp_servers.${SERVER_NAME}.command=${toml(program)}`,
      "-c", `mcp_servers.${SERVER_NAME}.args=${toml(args)}`,
      "-c", `mcp_servers.${SERVER_NAME}.env_vars=${toml(["CODE_DESKTOP_AGENT_TOOLS_SOCKET", "CODE_DESKTOP_AGENT_TOOLS_TOKEN"])}`,
      "-c", `mcp_servers.${SERVER_NAME}.startup_timeout_sec=30`,
      "-c", `mcp_servers.${SERVER_NAME}.tool_timeout_sec=600`,
      // The app's own tools act on this session's panes only and ask the user themselves where it matters
      // (ctx.requestApproval), so Codex doesn't raise its own MCP approval for each call; a tool that wants Codex's
      // prompt says `approval: "prompt"`.
      "-c", `mcp_servers.${SERVER_NAME}.default_tools_approval_mode="approve"`,
    ];
    // The channel's secret is for the server only: Codex's shells inherit its environment (shell_environment_policy
    // keeps *TOKEN* names by default), so a command the agent runs would otherwise be able to drive any session's
    // terminal and preview tools. Blank them for every command, as the Codex endpoint key is (prefs/codex-provider.mjs).
    for (const key of ["CODE_DESKTOP_AGENT_TOOLS_TOKEN", "CODE_DESKTOP_AGENT_TOOLS_SOCKET", "CODE_DESKTOP_AGENT_TOOLS_SERVER"]) out.push("-c", `shell_environment_policy.set.${key}=""`);
    // A tool that takes the place of one Codex has built in (codexBuiltin: agent-tools/turn-plan.mjs update_plan) turns
    // Codex's own off, so its model sees one tool of that name (config [tools] <name>.enabled).
    for (const { tool } of tools.values()) if (typeof tool.codexBuiltin === "string" && /^[a-z_]{1,64}$/.test(tool.codexBuiltin)) out.push("-c", `tools.${tool.codexBuiltin}.enabled=false`);
    for (const { tool } of tools.values()) if (tool.approval === "prompt") out.push("-c", `mcp_servers.${SERVER_NAME}.tools.${tool.name}.approval_mode="prompt"`);
    for (const [key, value] of Object.entries(env)) out.push("-c", `mcp_servers.${SERVER_NAME}.env.${key}=${toml(value)}`);
    return out;
  }
  /** A thread id the server can name, or a fresh start token for a thread/start (bound once the core answers). */
  function sessionIdentity(threadId) {
    if (typeof threadId === "string" && threadId) return threadId;
    const minted = `start-${crypto.randomUUID()}`;
    startTokens.set(minted, null);
    if (startTokens.size > 500) startTokens.delete(startTokens.keys().next().value);
    return minted;
  }
  function bindThread(identity, threadId) {
    if (typeof identity === "string" && startTokens.has(identity) && typeof threadId === "string" && threadId) startTokens.set(identity, threadId);
  }
  /** Codex thread/start|resume|fork `config` entry naming the session for that thread's MCP server. */
  /** A session's own credential (see the header): what a server started for that session alone may carry. */
  function sessionToken(session) {
    return typeof session === "string" && session ? sessionTokenFor(token, session) : null;
  }
  function sessionConfig(identity) {
    return { [`mcp_servers.${SERVER_NAME}.env.CODE_DESKTOP_AGENT_SESSION`]: identity };
  }
  function provide(name, factory) {
    if (typeof name !== "string" || !/^[A-Za-z_$][\w$]*$/.test(name) || ["sessionId", "cwd", "signal", "call", "requestApproval", "log"].includes(name)) throw new Error(`Invalid service name: ${name}`);
    if (typeof factory !== "function") throw new Error("A service is a function of the session.");
    services.set(name, factory);
  }
  /** Tell every running server its tool list changed (a Settings switch); `revision` counts the changes. */
  let revision = 0;
  function notifyListChanged() {
    revision += 1;
    for (const { send } of connections) send({ type: "list_changed" });
  }
  return {
    start, stop, ready, provide, call, cancelSession, cancelThread, recentImages, listTools, sessionToolLists, launchEnv, codexArgs, sessionIdentity, bindThread, sessionConfig, sessionToken, notifyListChanged,
    serverCommand, get socketPath() { return socketPath; }, get connectionCount() { return connections.size; }, get revision() { return revision; }, SERVER_NAME,
  };
}

module.exports = { createAgentToolsHost, toolResult, sessionTokenFor, SERVER_NAME };
