#!/usr/bin/env node
// OpenClaude Desktop's local MCP server (stdio). Every agent core starts it for the app's own sessions only (codex.cjs
// `-c mcp_servers.code_desktop.*` overrides, the DeepSeek harness and the bridges through CODE_DESKTOP_AGENT_TOOLS_SERVER,
// see agent-tools-host.cjs). It is a thin relay: the tools themselves (app/electron/agent-tools/*.mjs) run in the
// app's main process, which owns the preview, the terminals and the windows; this process only speaks MCP to the
// core and forwards tools/list and tools/call over a private local channel.
//
// Run with ELECTRON_RUN_AS_NODE=1 by the app's own binary (or plain Node in tests). Node built-ins only: it runs
// from inside the packaged app and must not load anything else.
//
// Environment:
//   CODE_DESKTOP_AGENT_TOOLS_SOCKET  the main process's unix socket (in a 0700 temp dir of this app run)
//   CODE_DESKTOP_AGENT_TOOLS_TOKEN   the random secret that socket requires before anything else
//   CODE_DESKTOP_AGENT_SESSION       which app session this server works for (a thread id, or a start token the
//                                    main process binds to the thread once the core has created it); optional:
//                                    a tools/call `_meta.threadId` (Codex sends it) is the fallback
import net from "node:net";
import readline from "node:readline";
import instructionsModule from "./agent-tools-instructions.cjs";

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "code-desktop", title: "OpenClaude Desktop", version: "1.0.0" };
const CALL_TIMEOUT_MS = Number(process.env.CODE_DESKTOP_AGENT_TOOLS_TIMEOUT_MS) > 0 ? Number(process.env.CODE_DESKTOP_AGENT_TOOLS_TIMEOUT_MS) : 10 * 60 * 1000;
const socketPath = process.env.CODE_DESKTOP_AGENT_TOOLS_SOCKET || "";
const token = process.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN || "";
const session = process.env.CODE_DESKTOP_AGENT_SESSION || "";

const write = (message) => { try { process.stdout.write(JSON.stringify(message) + "\n"); } catch { /* stdout closed */ } };
const reply = (id, result) => write({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => write({ jsonrpc: "2.0", id, error: { code, message } });
const log = (text) => { try { process.stderr.write(`[code-desktop tools] ${text}\n`); } catch { /* stderr closed */ } };

// --- The private channel to the main process: newline-delimited JSON, hello first.
let channel = null; // { socket, ready: Promise, pending: Map }
let seq = 0;
function connect() {
  if (channel && !channel.closed) return channel.ready;
  if (!socketPath || !token) return Promise.reject(new Error("OpenClaude Desktop isn't running this session."));
  const state = { socket: null, closed: false, pending: new Map(), ready: null };
  channel = state;
  state.ready = new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    state.socket = socket;
    socket.setEncoding("utf8");
    let buffer = "";
    const close = (error) => {
      if (state.closed) return;
      state.closed = true;
      for (const entry of state.pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
      state.pending.clear();
      reject(error);
    };
    socket.on("connect", () => {
      // cwd: the folder the core started this server in (the host keeps what load_tools loaded per session and folder).
      socket.write(JSON.stringify({ type: "hello", token, session, pid: process.pid, ppid: process.ppid, cwd: process.cwd() }) + "\n");
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.type === "welcome") { resolve(); continue; }
        if (message.type === "list_changed") { write({ jsonrpc: "2.0", method: "notifications/tools/list_changed" }); continue; }
        const entry = state.pending.get(message.id);
        if (!entry) continue;
        state.pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.reject(Object.assign(new Error(message.error.message || "Tool failed."), { code: message.error.code }));
        else entry.resolve(message.result);
      }
    });
    socket.on("error", (error) => close(new Error(`OpenClaude Desktop isn't reachable (${error.code || error.message}).`)));
    socket.on("close", () => close(new Error("OpenClaude Desktop closed the connection.")));
  });
  state.ready.catch(() => {});
  return state.ready;
}
async function ask(method, params, timeout = CALL_TIMEOUT_MS, onId = null) {
  await connect();
  const state = channel;
  const id = ++seq;
  onId?.(id);
  return new Promise((resolve, reject) => {
    // Timed out: the main process cancels it too, so the tool (and an approval card it waits on) stops with the error.
    const timer = setTimeout(() => {
      state.pending.delete(id);
      if (!state.closed) { try { state.socket.write(JSON.stringify({ type: "cancel", id }) + "\n"); } catch { /* closed */ } }
      reject(new Error("The tool took too long."));
    }, timeout);
    state.pending.set(id, { resolve, reject, timer });
    try { state.socket.write(JSON.stringify({ id, method, params }) + "\n"); }
    catch (error) { clearTimeout(timer); state.pending.delete(id); reject(error); }
  });
}

// The server's instructions (agent-tools-instructions.cjs: also handed to bridges whose agent drops them).
const { INSTRUCTIONS } = instructionsModule;

// tools/call requests still running: MCP request id → the channel request id (for notifications/cancelled).
const running = new Map();
const callKey = (id) => `${typeof id}:${id}`;

// --- MCP over stdio.
async function handle(message) {
  const { id, method, params } = message;
  const isRequest = id !== undefined && id !== null;
  if (!method) return; // a response to something we never ask
  if (!isRequest) {
    // The core gave up on a call (a stopped turn): the main process cancels it, so an approval it waits on closes.
    if (method === "notifications/cancelled" && params && (typeof params.requestId === "number" || typeof params.requestId === "string")) {
      const channelId = running.get(callKey(params.requestId));
      if (channelId !== undefined && channel && !channel.closed) { try { channel.socket.write(JSON.stringify({ type: "cancel", id: channelId }) + "\n"); } catch { /* closed */ } }
    }
    return; // notifications/initialized, …
  }
  switch (method) {
    case "initialize": {
      const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSIONS[0];
      // Connect early so the first tools/list is quick; a failure is reported per call.
      connect().catch((error) => log(error.message));
      return reply(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: true } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping": return reply(id, {});
    case "tools/list": {
      try {
        const result = await ask("list", {}, 30000);
        return reply(id, { tools: Array.isArray(result?.tools) ? result.tools : [] });
      } catch (error) {
        log(error.message);
        return reply(id, { tools: [] });
      }
    }
    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args = params?.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? { ...params.arguments } : {};
      const meta = params?._meta && typeof params._meta === "object" ? params._meta : {};
      // A core that runs one server for several sessions (OpenCode: one per folder) names the session per call: its
      // plugin adds this argument, which never reaches the tool.
      const named = typeof args.__code_desktop_session === "string" ? args.__code_desktop_session : null;
      delete args.__code_desktop_session;
      try {
        // Codex names the call too (_meta.callId, _meta.itemId: its transcript item), so a workflow's card sits at its call.
        const id200 = (value) => (typeof value === "string" && value && value.length <= 200 ? value : null);
        const result = await ask("call", { name, arguments: args, meta: { threadId: typeof meta.threadId === "string" ? meta.threadId : null, session: named, callId: id200(meta.callId), itemId: id200(meta.itemId) } }, CALL_TIMEOUT_MS, (channelId) => running.set(callKey(id), channelId));
        return reply(id, result && Array.isArray(result.content) ? result : { content: [{ type: "text", text: String(result ?? "") }] });
      } catch (error) {
        return reply(id, { content: [{ type: "text", text: error.message || String(error) }], isError: true });
      } finally { running.delete(callKey(id)); }
    }
    case "resources/list": return reply(id, { resources: [] });
    case "resources/templates/list": return reply(id, { resourceTemplates: [] });
    case "prompts/list": return reply(id, { prompts: [] });
    default: return fail(id, -32601, `Method not found: ${method}`);
  }
}

const input = readline.createInterface({ input: process.stdin });
input.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try { message = JSON.parse(line); } catch { return fail(null, -32700, "Parse error"); }
  Promise.resolve(handle(message)).catch((error) => { if (message?.id != null) fail(message.id, -32603, error.message || "Internal error"); });
});
input.on("close", () => { try { channel?.socket?.end(); } catch { /* gone */ } process.exit(0); });
process.on("SIGTERM", () => process.exit(0));
