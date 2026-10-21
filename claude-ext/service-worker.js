// OpenClaude Desktop Bridge — service worker.
// Holds the native messaging port to com.openclaude.chrome_bridge (app/electron/browser/native-host.cjs) and answers
// the app's execute_tool requests. Messages are { method, params, tool_use_id } (see app/electron/browser/protocol.cjs).
// An open native port keeps this worker alive; when it drops, the worker reconnects with backoff.
// Tools: navigate, read_page, find (tabs.js picks the tab and runs content.js in it; refs.js keeps the refs' copy).
import { ToolError } from "./errors.js";
import { navigate, resolveTab, inPage, setCurrentTab } from "./tabs.js";
import { withRefs, record, checkRef } from "./refs.js";

const HOST_NAME = "com.openclaude.chrome_bridge";
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 60_000;

let port = null;
let retryMs = RETRY_MIN_MS;
let retryTimer = null;

function intArg(value, name, { min, max, fallback }) {
  if (value === undefined || value === null) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw new ToolError("bad_request", `${name} must be a whole number from ${min} to ${max}.`);
  return value;
}

/** A content.js operation that hands out refs, under the ref counter's lock. replace: read_page voids the tab's old refs. */
async function withPageRefs(tab, op, args, { replace }) {
  return withRefs(async (startAt) => {
    const out = await inPage(tab, op, { ...args, startAt });
    if (out.error) throw new ToolError(out.error.code ?? "page_error", out.error.message ?? "The page couldn't do that.");
    record(tab.id, out.refs, out.nextRef, { replace });
    setCurrentTab(tab.id);
    return { tabId: tab.id, ...out.result };
  });
}

// Tools the app can run here, by name: async (args) → result (JSON). A thrown error with .code becomes {error: {code}}.
const tools = {
  async ping() {
    return { pong: true, extensionId: chrome.runtime.id, version: chrome.runtime.getManifest().version, at: Date.now() };
  },

  // navigate(url, tabId?) → { tabId, url, title, status }
  navigate: (args) => navigate(args),

  // read_page(tabId?, filter?, depth?, ref_id?, max_chars?) → { tabId, title, url, tree, refCount, truncated }
  async read_page(args) {
    const tab = await resolveTab(args.tabId);
    const filter = args.filter ?? "all";
    if (filter !== "all" && filter !== "interactive") throw new ToolError("bad_request", 'filter is "all" or "interactive".');
    const depth = intArg(args.depth, "depth", { min: 1, max: 100, fallback: 15 });
    const maxChars = intArg(args.max_chars, "max_chars", { min: 1000, max: 500_000, fallback: 50_000 });
    const refId = args.ref_id ?? null;
    if (refId !== null) checkRef(tab.id, refId);
    return withPageRefs(tab, "read_page", { filter, depth, maxChars, refId }, { replace: true });
  },

  // find(query, tabId?) → { tabId, query, matches: [{ref, role, name, interactive, text}], total }
  async find(args) {
    if (typeof args.query !== "string" || !args.query.trim()) throw new ToolError("bad_request", "query is required.");
    const tab = await resolveTab(args.tabId);
    const limit = intArg(args.limit, "limit", { min: 1, max: 100, fallback: 20 });
    return withPageRefs(tab, "find", { query: args.query, limit }, { replace: false });
  },
};

function send(message) {
  if (!port) return false;
  try { port.postMessage(message); return true; } catch (error) { console.warn("[bridge] send failed:", error?.message); return false; }
}

async function executeTool(message) {
  const { name, args } = message.params ?? {};
  const tool = Object.hasOwn(tools, name) ? tools[name] : null;
  let params;
  if (!tool) params = { error: { code: "unknown_tool", message: `The extension has no tool named ${name}.` } };
  else {
    try { params = { result: await tool(args ?? {}) }; }
    catch (error) { params = { error: { code: error?.code ?? "tool_error", message: error?.message ?? String(error) } }; }
  }
  send({ method: "tool_response", params, tool_use_id: message.tool_use_id });
}

function onHostMessage(message) {
  retryMs = RETRY_MIN_MS;
  if (!message || typeof message !== "object") return;
  console.debug("[bridge] host→ext", message.method, message.params?.name ?? "", message.tool_use_id ?? "");
  if (message.method === "execute_tool") { executeTool(message); return; }
  // tool_response: the app's answer to a permission_request (from P2 on).
}

function scheduleReconnect() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => { retryTimer = null; connect(); }, retryMs);
  retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
}

function connect() {
  if (port) return;
  try { port = chrome.runtime.connectNative(HOST_NAME); }
  catch (error) { console.warn("[bridge] connectNative failed:", error?.message); port = null; scheduleReconnect(); return; }
  port.onMessage.addListener(onHostMessage);
  port.onDisconnect.addListener(() => {
    console.warn("[bridge] host disconnected:", chrome.runtime.lastError?.message ?? "closed");
    port = null;
    scheduleReconnect();
  });
  send({ method: "notification", params: { type: "hello", extensionId: chrome.runtime.id, version: chrome.runtime.getManifest().version, userAgent: navigator.userAgent }, tool_use_id: null });
}

chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(connect);
connect();
