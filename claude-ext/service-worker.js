// OpenClaude Desktop Bridge — service worker.
// Holds the native messaging port to com.openclaude.chrome_bridge (app/electron/browser/native-host.cjs) and answers
// the app's execute_tool requests. Messages are { method, params, tool_use_id } (see app/electron/browser/protocol.cjs).
// An open native port keeps this worker alive; when it drops, the worker reconnects with backoff.

const HOST_NAME = "com.openclaude.chrome_bridge";
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 60_000;

let port = null;
let retryMs = RETRY_MIN_MS;
let retryTimer = null;

// Tools the app can run here, by name: async (args) → result (JSON). A thrown error with .code becomes {error: {code}}.
const tools = {
  async ping() {
    return { pong: true, extensionId: chrome.runtime.id, version: chrome.runtime.getManifest().version, at: Date.now() };
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
