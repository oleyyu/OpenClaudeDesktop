// A minimal WebSocket server (RFC 6455) for the CDP proxy, Node built-ins only: the app's node_modules aren't packaged,
// and Node has a WebSocket client but no server. Text and binary messages (a CDP client sends text), fragmentation,
// ping/pong (puppeteer's keepAlive pings the socket), close. No extensions (permessage-deflate is declined by omission).
//
//   const wss = createWebSocketServer({ maxMessage, onConnection(ws, request) {} });
//   http.createServer().on("upgrade", (req, socket, head) => wss.handleUpgrade(req, socket, head));
//   ws.send(text); ws.close(code, reason); ws.on("message" | "close", …)
"use strict";
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const DEFAULT_MAX_MESSAGE = 256 * 1024 * 1024; // a heap snapshot chunk or a trace stays far below this

/** Refuses an upgrade with a plain HTTP status. */
function refuse(socket, status, text) {
  try { socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`); } catch { /* gone */ }
}

class WebSocketConnection extends EventEmitter {
  constructor(socket, { maxMessage = DEFAULT_MAX_MESSAGE } = {}) {
    super();
    this.socket = socket;
    this.maxMessage = maxMessage;
    this.closed = false;
    this.buffer = Buffer.alloc(0);
    this.fragments = null; // { opcode, parts, size }
    socket.setNoDelay?.(true);
    socket.on("data", (chunk) => this.receive(chunk));
    socket.on("error", () => this.terminate());
    socket.on("close", () => this.finish(1006, ""));
  }
  receive(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    for (;;) {
      const frame = this.parse();
      if (!frame) return;
      if (this.closed) return;
      this.frame(frame);
    }
  }
  parse() {
    const data = this.buffer;
    if (data.length < 2) return null;
    const fin = (data[0] & 0x80) !== 0, opcode = data[0] & 0x0f, masked = (data[1] & 0x80) !== 0;
    let length = data[1] & 0x7f, offset = 2;
    if (length === 126) { if (data.length < 4) return null; length = data.readUInt16BE(2); offset = 4; }
    else if (length === 127) {
      if (data.length < 10) return null;
      const high = data.readUInt32BE(2), low = data.readUInt32BE(6);
      if (high > 0x1fffff) { this.fail(1009); return null; }
      length = high * 2 ** 32 + low; offset = 10;
    }
    if (length > this.maxMessage) { this.fail(1009); return null; }
    // A client's frames are always masked (RFC 6455 5.1).
    if (!masked) { this.fail(1002); return null; }
    if (data.length < offset + 4 + length) return null;
    const mask = data.subarray(offset, offset + 4);
    const payload = Buffer.from(data.subarray(offset + 4, offset + 4 + length));
    for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i & 3];
    this.buffer = data.subarray(offset + 4 + length);
    return { fin, opcode, payload };
  }
  frame({ fin, opcode, payload }) {
    if (opcode === 0x8) { // close
      const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
      this.close(code === 1005 ? 1000 : code);
      return;
    }
    if (opcode === 0x9) { this.write(0xa, payload); return; } // ping → pong
    if (opcode === 0xa) return; // pong
    if (opcode === 0x0) {
      if (!this.fragments) { this.fail(1002); return; }
      this.fragments.parts.push(payload); this.fragments.size += payload.length;
      if (this.fragments.size > this.maxMessage) { this.fail(1009); return; }
      if (fin) { const { opcode: first, parts } = this.fragments; this.fragments = null; this.deliver(first, Buffer.concat(parts)); }
      return;
    }
    if (opcode === 0x1 || opcode === 0x2) {
      if (this.fragments) { this.fail(1002); return; }
      if (fin) this.deliver(opcode, payload);
      else this.fragments = { opcode, parts: [payload], size: payload.length };
      return;
    }
    this.fail(1002);
  }
  deliver(opcode, payload) {
    this.emit("message", opcode === 0x1 ? payload.toString("utf8") : payload, opcode === 0x2);
  }
  write(opcode, payload) {
    if (this.socket.destroyed) return;
    const length = payload.length;
    let header;
    if (length < 126) { header = Buffer.alloc(2); header[1] = length; }
    else if (length < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(length, 2); }
    else { header = Buffer.alloc(10); header[1] = 127; header.writeUInt32BE(Math.floor(length / 2 ** 32), 2); header.writeUInt32BE(length >>> 0, 6); }
    header[0] = 0x80 | opcode;
    try { this.socket.write(Buffer.concat([header, payload])); } catch { /* gone */ }
  }
  send(text) {
    if (this.closed) return;
    this.write(0x1, Buffer.from(String(text), "utf8"));
  }
  fail(code) { this.close(code); }
  close(code = 1000, reason = "") {
    if (this.closed) return;
    const body = Buffer.alloc(2 + Buffer.byteLength(reason));
    body.writeUInt16BE(code, 0); body.write(reason, 2);
    this.write(0x8, body);
    try { this.socket.end(); } catch { /* gone */ }
    const timer = setTimeout(() => this.terminate(), 1000);
    timer.unref?.();
    this.finish(code, reason);
  }
  terminate() {
    try { this.socket.destroy(); } catch { /* gone */ }
    this.finish(1006, "");
  }
  finish(code, reason) {
    if (this.closed) return;
    this.closed = true;
    this.emit("close", code, reason);
  }
}

/**
 * @param {{ maxMessage?: number, onConnection: (ws: WebSocketConnection, request: import("node:http").IncomingMessage) => void }} options
 */
function createWebSocketServer({ maxMessage = DEFAULT_MAX_MESSAGE, onConnection }) {
  const connections = new Set();
  function handleUpgrade(request, socket, head) {
    const key = request.headers["sec-websocket-key"];
    const upgrade = String(request.headers.upgrade || "").toLowerCase();
    if (request.method !== "GET" || upgrade !== "websocket" || typeof key !== "string" || !/^[A-Za-z0-9+/]{22}==$/.test(key) || request.headers["sec-websocket-version"] !== "13") {
      refuse(socket, "400", "Bad Request");
      return null;
    }
    const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const ws = new WebSocketConnection(socket, { maxMessage });
    connections.add(ws);
    ws.on("close", () => connections.delete(ws));
    if (head?.length) ws.receive(head);
    onConnection(ws, request);
    return ws;
  }
  function closeAll(code = 1001, reason = "") { for (const ws of [...connections]) ws.close(code, reason); }
  return { handleUpgrade, closeAll, connections };
}

module.exports = { createWebSocketServer, refuse, WebSocketConnection };
