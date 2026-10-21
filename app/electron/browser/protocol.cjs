// The Chrome bridge's wire format and shared names (the Claude in Chrome equivalent):
//
//   Chrome extension (claude-ext/, MV3) ──chrome.runtime.connectNative──▶ native-host.cjs ──unix socket──▶ Electron main
//
// Both legs carry the same frames: a 4-byte little-endian length, then that many bytes of UTF-8 JSON (Chrome's native
// messaging format, kept on the socket too so the host only routes). Every message is
//   { method, params, tool_use_id }
// method: execute_tool (Electron → extension) · tool_response (the answer, matched by tool_use_id; params {result} or
// {error: {code, message}}) · get_status (Electron → host, answered by the host itself) · permission_request
// (extension → Electron) · notification (extension → every Electron client; params.type "hello" names the extension).
"use strict";
const os = require("node:os");
const path = require("node:path");

const HOST_NAME = "com.openclaude.chrome_bridge";
// The ID Chrome derives from the public key in claude-ext/manifest.json ("key"): fixed so allowed_origins matches.
const EXTENSION_ID = "gackkfbnmmbigiaafjakioegnbjakdef";
const METHODS = new Set(["execute_tool", "get_status", "permission_request", "tool_response", "notification"]);
// Chrome refuses a message from a host larger than 1 MB; one to a host may be up to 4 GB (we stop at 64 MB).
const MAX_TO_EXTENSION = 1024 * 1024;
const MAX_FRAME = 64 * 1024 * 1024;

/** The folder the hosts' sockets live in (<pid>.sock each): /tmp/openclaude-chrome-bridge-<user>, like Claude's own
 * /tmp/claude-mcp-browser-bridge-<user>. OPENCLAUDE_CHROME_BRIDGE_DIR overrides it (the P0 check's own folder). */
function socketDir(env = process.env) {
  if (env.OPENCLAUDE_CHROME_BRIDGE_DIR) return env.OPENCLAUDE_CHROME_BRIDGE_DIR;
  return path.join("/tmp", `openclaude-chrome-bridge-${os.userInfo().username}`);
}

function encode(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  if (body.length > MAX_FRAME) throw new Error(`message too large (${body.length} bytes)`);
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

/** Splits a byte stream into messages. onMessage(message); onError(error) for a bad frame (the stream is then unusable). */
class FrameReader {
  constructor(onMessage, onError = () => {}) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.buffer = Buffer.alloc(0);
    this.broken = false;
  }
  push(chunk) {
    if (this.broken) return;
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    while (this.buffer.length >= 4) {
      const size = this.buffer.readUInt32LE(0);
      if (size > MAX_FRAME) { this.broken = true; this.onError(new Error(`frame too large (${size} bytes)`)); return; }
      if (this.buffer.length < 4 + size) return;
      const body = this.buffer.subarray(4, 4 + size);
      this.buffer = this.buffer.subarray(4 + size);
      let message;
      try { message = JSON.parse(body.toString("utf8")); } catch (error) { this.onError(new Error(`bad JSON frame: ${error.message}`)); continue; }
      this.onMessage(message);
    }
  }
}

function validMessage(message) {
  return !!message && typeof message === "object" && !Array.isArray(message) && METHODS.has(message.method);
}

module.exports = { HOST_NAME, EXTENSION_ID, METHODS, MAX_TO_EXTENSION, MAX_FRAME, socketDir, encode, FrameReader, validMessage };
