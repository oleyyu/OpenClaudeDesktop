// OpenClaude Desktop Bridge — service worker.
// Holds the native messaging port to com.openclaude.chrome_bridge (app/electron/browser/native-host.cjs) and answers
// the app's execute_tool requests. Messages are { method, params, tool_use_id } (see app/electron/browser/protocol.cjs).
// An open native port keeps this worker alive; when it drops, the worker reconnects with backoff.
// Tools: navigate, read_page, find, form_input, computer, javascript_tool, read_console_messages, read_network_requests,
// browser_batch, tabs_create, tabs_context (tabs.js picks the tab and runs content.js in it; refs.js keeps the refs'
// copy; script.js and monitor.js use the tab's debugger session, debugger.js).
import { ToolError } from "./errors.js";
import { navigate, resolveTab, inPage, setCurrentTab, settleAfterAction, tabsCreate, tabsContext, assertTabSite } from "./tabs.js";
import { withRefs, record, checkRef } from "./refs.js";
import { runReadOnly, runWrite } from "./script.js";
import { readConsole, readNetwork } from "./monitor.js";
import { assertScriptSite, hostOf } from "./sites.js";

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

/** A content.js operation that hands out no refs; the ref it names must be from this tab's latest read_page/find. */
async function inPageTool(tab, op, args) {
  const out = await inPage(tab, op, args);
  if (out.error) throw new ToolError(out.error.code ?? "page_error", out.error.message ?? "The page couldn't do that.");
  setCurrentTab(tab.id);
  return { tabId: tab.id, ...out.result };
}

function boolArg(value, name) {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") throw new ToolError("bad_request", `${name} is true or false.`);
  return value;
}
/** A regular expression the model gives (case-insensitive), or null. */
function patternArg(value, name) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ToolError("bad_request", `${name} is a regular expression.`);
  try { return new RegExp(value, "i"); } catch (error) { throw new ToolError("bad_request", `${name} isn't a valid regular expression (${error.message}).`); }
}
/** urlPattern: a substring of the URL ("/api/" is the path segment, as in Claude in Chrome), or a regular expression
 * written /…/ with flags or with pattern characters inside (/\/v\d+\//, /api/i). → (url) => boolean, or null. */
function urlMatcher(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ToolError("bad_request", "urlPattern is text or /a regular expression/.");
  const literal = /^\/(.+)\/([dgimsuvy]*)$/s.exec(value);
  if (!literal || (!literal[2] && !/[\\^$.|?*+()[\]{}]/.test(literal[1]))) return (url) => url.includes(value);
  let pattern;
  try { pattern = new RegExp(literal[1], literal[2].replace(/[gy]/g, "")); } catch (error) { throw new ToolError("bad_request", `urlPattern isn't a valid regular expression (${error.message}).`); }
  return (url) => pattern.test(url);
}

const MAX_BATCH = 50;
const COMPUTER_ACTIONS = new Set(["left_click", "right_click", "double_click", "type", "key", "scroll", "hover"]);

// Tools the app can run here, by name: async (args, ctx) → result (JSON); ctx.allowedHosts limits the sites they act on
// (sites.js), ctx.writeHosts the sites a write script may run on in this call (sites.js assertScriptSite), ctx.signal is
// aborted when the app cancels the call. A thrown error with .code becomes {error: {code, message, …data}}.
const tools = {
  async ping() {
    return { pong: true, extensionId: chrome.runtime.id, version: chrome.runtime.getManifest().version, at: Date.now() };
  },

  // navigate(url, tabId?) → { tabId, url, title, status }
  navigate: (args, ctx) => navigate(args, ctx),

  // tabs_create(url?, active?) → { tabId, url, title, status, active }
  tabs_create: (args, ctx) => tabsCreate(args, ctx),

  // tabs_context() → { currentTabId, windows: [{ windowId, tabs: [{tabId, url, title, active, current, openedByBridge, status}] }] }
  tabs_context: () => tabsContext(),

  // read_page(tabId?, filter?, depth?, ref_id?, max_chars?) → { tabId, title, url, tree, refCount, truncated }
  async read_page(args, ctx) {
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    const filter = args.filter ?? "all";
    if (filter !== "all" && filter !== "interactive") throw new ToolError("bad_request", 'filter is "all" or "interactive".');
    const depth = intArg(args.depth, "depth", { min: 1, max: 100, fallback: 15 });
    const maxChars = intArg(args.max_chars, "max_chars", { min: 1000, max: 500_000, fallback: 50_000 });
    const refId = args.ref_id ?? null;
    if (refId !== null) checkRef(tab.id, refId);
    return withPageRefs(tab, "read_page", { filter, depth, maxChars, refId }, { replace: true });
  },

  // find(query, tabId?) → { tabId, query, matches: [{ref, role, name, interactive, text}], total }
  async find(args, ctx) {
    if (typeof args.query !== "string" || !args.query.trim()) throw new ToolError("bad_request", "query is required.");
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    const limit = intArg(args.limit, "limit", { min: 1, max: 100, fallback: 20 });
    return withPageRefs(tab, "find", { query: args.query, limit }, { replace: false });
  },

  // form_input(ref, value, tabId?) → { tabId, ref, role, name, value | checked, events }
  async form_input(args, ctx) {
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    checkRef(tab.id, args.ref);
    if (args.value === undefined || args.value === null) throw new ToolError("bad_request", "value is required.");
    return inPageTool(tab, "form_input", { ref: args.ref, value: args.value });
  },

  // computer(action, ref?, coordinate?, text?, modifiers?, scroll_direction?, scroll_amount?, tabId?)
  // A ref is used when given (coordinate is then ignored); a coordinate only when there's no ref.
  async computer(args, ctx) {
    if (!COMPUTER_ACTIONS.has(args.action)) throw new ToolError("bad_request", `action is one of ${[...COMPUTER_ACTIONS].join(", ")}.`);
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    const ref = args.ref ?? null;
    if (ref !== null) checkRef(tab.id, ref);
    const coordinate = ref === null ? args.coordinate ?? null : null;
    if (coordinate !== null && !(Array.isArray(coordinate) && coordinate.length === 2 && coordinate.every(Number.isFinite))) throw new ToolError("bad_request", "coordinate is [x, y] in the page's viewport pixels.");
    const amount = intArg(args.scroll_amount, "scroll_amount", { min: 1, max: 20, fallback: 3 });
    const before = tab.url, startedAt = Date.now();
    const result = await inPageTool(tab, "computer", { action: args.action, ref, coordinate, text: args.text, modifiers: args.modifiers, scroll_direction: args.scroll_direction, scroll_amount: amount });
    if (ref !== null && args.coordinate !== undefined) result.note = "coordinate ignored: the ref was used.";
    // A click or key may have started a navigation: wait for it, so the next read_page sees the new page.
    if (args.action !== "scroll" && args.action !== "hover") {
      const navigated = await settleAfterAction(tab.id, before, startedAt);
      if (navigated) result.navigated = navigated;
    }
    return result;
  },

  // javascript_tool(code, tabId?, timeout_ms?, write?) → { tabId, type, value }, in the page's own context (script.js):
  // read-only, or with write: true as DevTools' console runs it, on a site the app approved for this call (writeHosts).
  async javascript_tool(args, ctx) {
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    const timeoutMs = intArg(args.timeout_ms, "timeout_ms", { min: 100, max: 60_000, fallback: 10_000 });
    const write = boolArg(args.write, "write");
    if (write) assertScriptSite(tab.url || tab.pendingUrl || "", ctx, tab.id);
    // Checked again inside the tab's turn, on the document the script will run in (script.js pins it): the tab may
    // have navigated while the call waited for another one on it. A navigation to another site under way is refused.
    const verify = async (url) => {
      const now = await resolveTab(tab.id);
      if (now.pendingUrl && hostOf(now.pendingUrl) !== hostOf(url)) throw new ToolError("page_changed", `Tab ${tab.id} is navigating to ${hostOf(now.pendingUrl) ?? now.pendingUrl}, so the script didn't run. Wait for the page to load, then try again.`);
      await assertTabSite({ ...now, url, pendingUrl: undefined }, ctx);
      if (write) assertScriptSite(url, ctx, tab.id);
    };
    const result = write ? await runWrite(tab, args.code, { timeoutMs, verify }) : await runReadOnly(tab, args.code, { timeoutMs, verify });
    setCurrentTab(tab.id);
    return { tabId: tab.id, ...(write ? { write: true } : {}), ...result };
  },

  // read_console_messages(tabId?, pattern?, onlyErrors?, limit?, clear?) → { tabId, url, started, since, total, matched,
  // messages: [{level, text, url, line, column, timestamp, source}] } (monitor.js; monitoring starts on first use).
  async read_console_messages(args, ctx) {
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    const options = { pattern: patternArg(args.pattern, "pattern"), onlyErrors: boolArg(args.onlyErrors, "onlyErrors"), limit: intArg(args.limit, "limit", { min: 1, max: 1000, fallback: 100 }), clear: boolArg(args.clear, "clear") };
    const result = await readConsole(tab, options);
    setCurrentTab(tab.id);
    return result;
  },

  // read_network_requests(tabId?, urlPattern?, limit?, clear?, includeHeaders?, requestId?) → { tabId, url, started,
  // since, total, matched, requests: [{requestId, method, url, type, status, …}] }, or { request } with its body.
  async read_network_requests(args, ctx) {
    const tab = await resolveTab(args.tabId);
    await assertTabSite(tab, ctx);
    if (args.requestId !== undefined && args.requestId !== null && (typeof args.requestId !== "string" || !args.requestId)) throw new ToolError("bad_request", "requestId is a request's id from an earlier read_network_requests.");
    const options = { match: urlMatcher(args.urlPattern), limit: intArg(args.limit, "limit", { min: 1, max: 1000, fallback: 100 }), clear: boolArg(args.clear, "clear"), headers: boolArg(args.includeHeaders, "includeHeaders"), requestId: args.requestId ?? null };
    const result = await readNetwork(tab, options);
    setCurrentTab(tab.id);
    return result;
  },

  // browser_batch(actions: [{name, input}]) runs the steps here, one after another, in a single round trip with the app.
  // It stops at the first failure. → { steps: [{name, ok, result | error}], completed, failed? }
  async browser_batch(args, ctx) {
    const actions = args.actions;
    if (!Array.isArray(actions) || !actions.length) throw new ToolError("bad_request", "actions is a list of {name, input} steps.");
    if (actions.length > MAX_BATCH) throw new ToolError("bad_request", `At most ${MAX_BATCH} steps in one batch.`);
    actions.forEach((step, index) => {
      if (!step || typeof step.name !== "string") throw new ToolError("bad_request", `Step ${index + 1} needs a name.`);
      if (step.name === "browser_batch" || step.name === "ping" || !Object.hasOwn(tools, step.name)) throw new ToolError("bad_request", `Step ${index + 1}: ${step.name} can't be run in a batch.`);
      // A write script needs the user's approval for its own call: never inside a batch.
      if (step.name === "javascript_tool" && step.input?.write === true) throw new ToolError("bad_request", `Step ${index + 1}: javascript_tool with write: true runs on its own, not in a batch.`);
    });
    const steps = [];
    for (const [index, step] of actions.entries()) {
      try {
        if (ctx?.signal?.aborted) throw new ToolError("stopped", "The app stopped this call before this step.");
        steps.push({ name: step.name, ok: true, result: await tools[step.name](step.input ?? {}, ctx) });
      } catch (error) {
        const failure = { code: error?.code ?? "tool_error", message: error?.message ?? String(error), ...(error?.data ?? {}) };
        steps.push({ name: step.name, ok: false, error: failure });
        return { steps, completed: index, failed: { step: index + 1, ...failure } };
      }
    }
    return { steps, completed: steps.length };
  },
};

function send(message) {
  if (!port) return false;
  try { port.postMessage(message); return true; } catch (error) { console.warn("[bridge] send failed:", error?.message); return false; }
}

const running = new Map(); // tool_use_id → AbortController: the app's cancel_tool aborts it (a batch runs no further steps)

async function executeTool(message) {
  const { name, args, allowedHosts, writeHosts } = message.params ?? {};
  const tool = Object.hasOwn(tools, name) ? tools[name] : null;
  let params;
  if (!tool) params = { error: { code: "unknown_tool", message: `The extension has no tool named ${name}.` } };
  else {
    const controller = new AbortController();
    running.set(message.tool_use_id, controller);
    try { params = { result: await tool(args ?? {}, { allowedHosts, writeHosts, signal: controller.signal }) }; }
    catch (error) { params = { error: { code: error?.code ?? "tool_error", message: error?.message ?? String(error), ...(error?.data ?? {}) } }; }
    finally { if (running.get(message.tool_use_id) === controller) running.delete(message.tool_use_id); }
  }
  send({ method: "tool_response", params, tool_use_id: message.tool_use_id });
}

function onHostMessage(message) {
  retryMs = RETRY_MIN_MS;
  if (!message || typeof message !== "object") return;
  console.debug("[bridge] host→ext", message.method, message.params?.name ?? "", message.tool_use_id ?? "");
  if (message.method === "execute_tool") { executeTool(message); return; }
  if (message.method === "cancel_tool") { running.get(message.tool_use_id)?.abort(); return; }
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
