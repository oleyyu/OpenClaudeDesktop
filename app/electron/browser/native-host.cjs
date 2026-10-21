#!/usr/bin/env node
// The Chrome bridge's native messaging host. Chrome starts it (through the launcher install.cjs writes) when the
// extension calls connectNative, with the extension's origin as its argument, and talks to it over stdin/stdout.
// It listens on <socketDir>/<pid>.sock for OpenClaude Desktop's main process and routes between the two:
//   Electron execute_tool ─▶ extension, the extension's tool_response ─▶ the Electron client that sent that tool_use_id,
//   get_status ─▶ answered here, notification / permission_request ─▶ every Electron client.
// stdout carries frames only: everything else goes to <socketDir>/host.log (and stderr, which Chrome keeps).
// It exits when Chrome closes stdin (the extension's port went away), removing its socket.
"use strict";
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { EXTENSION_ID, MAX_TO_EXTENSION, socketDir, encode, FrameReader, validMessage } = require("./protocol.cjs");

const VERSION = "0.1.0";
const MAX_LOG_BYTES = 1024 * 1024;
const dir = socketDir();
const socketPath = path.join(dir, `${process.pid}.sock`);
const logPath = path.join(dir, "host.log");
const origin = process.argv.find((arg) => arg.startsWith("chrome-extension://")) ?? null;

/** The socket folder, owned by this user and closed to everyone else (a folder someone else made is refused). */
function prepareDir() {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${dir} is not a folder`);
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) throw new Error(`${dir} belongs to another user`);
  if ((stat.mode & 0o777) !== 0o700) fs.chmodSync(dir, 0o700);
  try { if (fs.statSync(logPath).size > MAX_LOG_BYTES) fs.truncateSync(logPath, 0); } catch {}
}

function summary(message) {
  const params = message?.params ?? {};
  const what = message?.method === "execute_tool" ? params.name
    : message?.method === "notification" ? params.type
      : message?.method === "tool_response" ? (params.error ? `error ${params.error.code ?? ""}`.trim() : "ok") : "";
  return `${message?.method ?? "?"}${what ? ` ${what}` : ""}${message?.tool_use_id ? ` [${message.tool_use_id}]` : ""}`;
}
function log(line) {
  const text = `${new Date().toISOString()} host[${process.pid}] ${line}\n`;
  try { fs.appendFileSync(logPath, text, { mode: 0o600 }); } catch {}
  try { process.stderr.write(text); } catch {}
}
// Nothing but frames may reach stdout: a stray console.log would corrupt Chrome's stream.
console.log = console.info = console.warn = console.error = console.debug = (...args) => log(args.map(String).join(" "));

const clients = new Set();
const pending = new Map(); // tool_use_id → the client socket waiting for its tool_response
let extension = null; // the extension's hello: { extensionId, version, … }
let closing = false;

function toExtension(message) {
  const frame = encode(message);
  if (frame.length - 4 > MAX_TO_EXTENSION) throw new Error(`message for the extension is too large (${frame.length - 4} bytes, Chrome allows 1 MB)`);
  log(`host→ext ${summary(message)}`);
  process.stdout.write(frame);
}
function toClient(client, message) {
  if (client.destroyed) return false;
  log(`host→electron ${summary(message)}`);
  client.write(encode(message));
  return true;
}
function answer(client, tool_use_id, outcome) {
  toClient(client, { method: "tool_response", params: outcome, tool_use_id });
}

function fromExtension(message) {
  if (!validMessage(message)) { log(`ext→host ignored a message without a known method`); return; }
  log(`ext→host ${summary(message)}`);
  if (message.method === "tool_response") {
    const client = pending.get(message.tool_use_id);
    pending.delete(message.tool_use_id);
    if (!client || !toClient(client, message)) log(`dropped the response to ${message.tool_use_id}: nobody is waiting for it`);
    return;
  }
  if (message.method === "notification" && message.params?.type === "hello") extension = { ...message.params, connectedAt: Date.now() };
  // notification, permission_request: every connected app window hears it (an answer comes back as a tool_response).
  if (message.method === "notification" || message.method === "permission_request") for (const client of clients) toClient(client, message);
}

function fromClient(client, message) {
  if (!validMessage(message)) { log(`electron→host ignored a message without a known method`); return; }
  log(`electron→host ${summary(message)}`);
  const id = message.tool_use_id;
  if (message.method === "get_status") {
    answer(client, id, { result: { host: { pid: process.pid, version: VERSION, origin }, extension, connected: !!extension, pending: pending.size } });
    return;
  }
  if (message.method === "execute_tool") {
    if (typeof id !== "string" || !id) return answer(client, id ?? null, { error: { code: "bad_request", message: "execute_tool needs a tool_use_id" } });
    if (pending.has(id)) return answer(client, id, { error: { code: "bad_request", message: `${id} is already running` } });
    if (typeof message.params?.name !== "string") return answer(client, id, { error: { code: "bad_request", message: "execute_tool needs params.name" } });
    pending.set(id, client);
    try { toExtension(message); } catch (error) { pending.delete(id); answer(client, id, { error: { code: "too_large", message: error.message } }); }
    return;
  }
  if (message.method === "tool_response") { // the app answering the extension's permission_request
    try { toExtension(message); } catch (error) { log(`could not pass on a tool_response: ${error.message}`); }
    return;
  }
  answer(client, id ?? null, { error: { code: "bad_request", message: `${message.method} isn't sent to the host` } });
}

function shutdown(reason) {
  if (closing) return;
  closing = true;
  log(`exiting: ${reason}`);
  for (const client of clients) client.destroy();
  try { server.close(); } catch {}
  try { fs.unlinkSync(socketPath); } catch {}
  process.exit(0);
}

let server;
try {
  prepareDir();
  try { fs.unlinkSync(socketPath); } catch {}
  server = net.createServer((client) => {
    clients.add(client);
    log(`electron connected (${clients.size} client${clients.size === 1 ? "" : "s"})`);
    const reader = new FrameReader((message) => fromClient(client, message), (error) => { log(`electron sent ${error.message}`); client.destroy(); });
    client.on("data", (chunk) => reader.push(chunk));
    client.on("error", () => {});
    client.on("close", () => {
      clients.delete(client);
      for (const [id, waiting] of pending) if (waiting === client) pending.delete(id);
      log(`electron disconnected (${clients.size} left)`);
    });
  });
  server.on("error", (error) => { log(`socket error: ${error.message}`); shutdown("socket error"); });
  server.listen(socketPath, () => {
    try { fs.chmodSync(socketPath, 0o600); } catch {}
    log(`listening on ${socketPath} for ${origin ?? "an unnamed origin"}${origin && origin !== `chrome-extension://${EXTENSION_ID}/` ? " (not the bridge extension's ID)" : ""}`);
  });
} catch (error) {
  log(`can't start: ${error.message}`);
  process.exit(1);
}

const stdinReader = new FrameReader(fromExtension, (error) => { log(`extension sent ${error.message}`); shutdown("bad frame from Chrome"); });
process.stdin.on("data", (chunk) => stdinReader.push(chunk));
process.stdin.on("end", () => shutdown("Chrome closed the port"));
process.stdin.on("error", () => shutdown("stdin error"));
process.stdout.on("error", () => shutdown("stdout error"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
