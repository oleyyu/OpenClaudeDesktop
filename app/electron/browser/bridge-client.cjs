// OpenClaude Desktop's end of the Chrome bridge: connects to a native host's socket (protocol.cjs) and turns
// execute_tool / get_status into promises matched by tool_use_id. Notifications from the extension are emitted as
// "notification"; the socket closing as "close".
//
//   const client = await ChromeBridgeClient.connect({ log });
//   await client.executeTool("ping") → { pong: true, … }
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { socketDir, encode, FrameReader, validMessage } = require("./protocol.cjs");

const DEFAULT_TIMEOUT_MS = 30_000;

class BridgeError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

/** The hosts' sockets, newest first. A socket whose host process is gone is removed. */
function listSockets(dir = socketDir()) {
  let stat;
  try { stat = fs.lstatSync(dir); } catch { return []; }
  if (!stat.isDirectory() || stat.isSymbolicLink() || (typeof process.getuid === "function" && stat.uid !== process.getuid())) return [];
  const sockets = [];
  for (const name of fs.readdirSync(dir)) {
    const match = /^(\d+)\.sock$/.exec(name);
    if (!match) continue;
    const file = path.join(dir, name);
    if (!alive(Number(match[1]))) { try { fs.unlinkSync(file); } catch {} continue; }
    try { sockets.push({ file, pid: Number(match[1]), mtime: fs.statSync(file).mtimeMs }); } catch {}
  }
  return sockets.sort((a, b) => b.mtime - a.mtime);
}

class ChromeBridgeClient extends EventEmitter {
  constructor(socket, { log = () => {}, file = null } = {}) {
    super();
    this.socket = socket;
    this.file = file;
    this.log = log;
    this.pending = new Map(); // tool_use_id → { resolve, reject, timer }
    this.closed = false;
    const reader = new FrameReader((message) => this.receive(message), (error) => { this.log(`host sent ${error.message}`); socket.destroy(); });
    socket.on("data", (chunk) => reader.push(chunk));
    socket.on("error", (error) => this.log(`socket error: ${error.message}`));
    socket.on("close", () => {
      this.closed = true;
      for (const [, waiting] of this.pending) { clearTimeout(waiting.timer); waiting.reject(new BridgeError("disconnected", "The Chrome extension disconnected.")); }
      this.pending.clear();
      this.emit("close");
    });
  }

  /** Connects to one host's socket: `file`, or the newest live one in `dir`. */
  static connect({ dir = socketDir(), file = null, log = () => {} } = {}) {
    const candidates = file ? [{ file }] : listSockets(dir);
    if (!candidates.length) return Promise.reject(new BridgeError("not_connected", "The Chrome extension isn't connected: no native host is running."));
    return new Promise((resolve, reject) => {
      const attempt = (index) => {
        if (index >= candidates.length) { reject(new BridgeError("not_connected", "The Chrome extension isn't connected: no native host answered.")); return; }
        const socket = net.createConnection(candidates[index].file);
        socket.once("connect", () => { socket.removeAllListeners("error"); log(`connected to ${candidates[index].file}`); resolve(new ChromeBridgeClient(socket, { log, file: candidates[index].file })); });
        socket.once("error", () => attempt(index + 1));
      };
      attempt(0);
    });
  }

  receive(message) {
    if (!validMessage(message)) return;
    this.log(`host→electron ${message.method}${message.tool_use_id ? ` [${message.tool_use_id}]` : ""}`);
    if (message.method === "tool_response") {
      const waiting = this.pending.get(message.tool_use_id);
      if (!waiting) return;
      this.pending.delete(message.tool_use_id);
      clearTimeout(waiting.timer);
      const error = message.params?.error;
      if (error) {
        const { code, message: text, ...data } = error;
        waiting.reject(Object.assign(new BridgeError(code ?? "tool_error", text ?? "The extension couldn't do that."), Object.keys(data).length ? { data } : {}));
      }
      else waiting.resolve(message.params?.result);
      return;
    }
    this.emit(message.method, message.params ?? {}, message.tool_use_id ?? null);
  }

  request(method, params = {}, { timeoutMs = DEFAULT_TIMEOUT_MS, toolUseId = `toolu_bridge_${crypto.randomUUID()}` } = {}) {
    if (this.closed) return Promise.reject(new BridgeError("disconnected", "The Chrome extension disconnected."));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(toolUseId);
        reject(new BridgeError("timeout", `The Chrome extension didn't answer within ${Math.round(timeoutMs / 1000)} s.`));
      }, timeoutMs);
      this.pending.set(toolUseId, { resolve, reject, timer });
      this.log(`electron→host ${method}${params?.name ? ` ${params.name}` : ""} [${toolUseId}]`);
      this.socket.write(encode({ method, params, tool_use_id: toolUseId }));
    });
  }

  getStatus(options) { return this.request("get_status", {}, options); }
  /** options.allowedHosts: the sites the call may act on (the extension's sites.js); omitted, it isn't limited. */
  executeTool(name, args = {}, options = {}) {
    const { allowedHosts, ...rest } = options;
    return this.request("execute_tool", { name, args, ...(Array.isArray(allowedHosts) ? { allowedHosts } : {}) }, rest);
  }
  close() { this.socket.end(); }
}

module.exports = { ChromeBridgeClient, BridgeError, listSockets };
