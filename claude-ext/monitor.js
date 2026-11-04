// read_console_messages / read_network_requests: what a tab logs and loads, as DevTools' Console and Network panels
// show it. Nothing is recorded until one of them is first called for a tab; then the tab is monitored through the
// debugger (debugger.js, held): Runtime (console calls and uncaught exceptions — V8 replays the console messages it
// still holds, so what the page logged before shows up too), Log (the browser's own entries: failed loads, CSP and
// security messages) and Network (requests from then on: earlier ones aren't known).
// V8 replays those earlier messages without the previews it gives live ones (an object arrives as just "Object"), so
// for a replayed message's object arguments a preview is asked for once the replay is in (fillPreviews: at most
// MAX_PREVIEWS per monitor, newest message first, as a read shows the newest; the message keeps its place and gets its
// full text once the previews are in, which a read waits for, briefly). The preview shows the object as it is now, not
// as it was logged.
// Each tab keeps its newest MAX_ENTRIES messages and requests. A tab that navigates to another origin starts over
// (only the current site's are kept, as Claude in Chrome does). Monitoring stops — and the debugger is detached, so
// Chrome's "started debugging" bar goes away — when the tab closes, the user cancels that bar, or no read came for
// IDLE_MS; the next read starts it again. Nothing is kept across a service worker restart.
import { ToolError } from "./errors.js";
import { hold, unhold, onEvent, onDetached, enableRuntime } from "./debugger.js";

const MAX_ENTRIES = 1000;
const IDLE_MS = 10 * 60_000;
const MAX_TEXT = 2000;
const MAX_URL = 1000;
const MAX_BODY = 20_000;
const REPLAY_SETTLE_MS = 100;
const MAX_PREVIEWS = 100;
const PREVIEW_WAIT_MS = 1000;
const PREVIEW_GROUP = "openclaude-monitor";
const MAX_HEADERS = 50;
const MAX_HEADER_VALUE = 500;
// Header names whose values are credentials: cookies, authorization, tokens, keys, secrets, sessions, CSRF tokens …
const REDACTED = /cookie|authorization|token|secret|passw|credential|session|csrf|xsrf|signature|(^|[-_])auth($|[-_])|(^|[-_])(api[-_]?)?key($|[-_])/i;
const monitors = new Map(); // tabId → { console, requests, live, origin, mainFrameId, since, timer, ready, replayed, previewQueue, previewing, previewsLeft, previewsPending }

const originOf = (url) => { try { return new URL(url).origin; } catch { return "null"; } };
const clip = (text, max) => (text.length > max ? `${text.slice(0, max)}…` : text);
const firstLine = (text) => String(text ?? "").split("\n")[0];
const push = (list, entry, onDrop) => { list.push(entry); while (list.length > MAX_ENTRIES) onDrop?.(list.shift()); };

// ── console text ───────────────────────────────────────────────────────────────────────────────────────────────────
/** A PropertyPreview's value: nested objects by their own preview, strings quoted. */
function propertyText(property) {
  if (property.valuePreview) return previewText(property.valuePreview);
  if (property.type === "string") return JSON.stringify(property.value ?? "");
  if (property.type === "function") return "ƒ";
  return property.value ?? property.type;
}
/** An ObjectPreview, compactly: [1, 2, 3], {a: 1, b: "x"}, Map(1) {"k" => 1}, with … where V8 cut it short. */
function previewText(preview) {
  if (preview.subtype === "node" || preview.subtype === "error" || preview.subtype === "regexp" || preview.subtype === "date") return firstLine(preview.description ?? preview.type);
  const list = preview.subtype === "array" || preview.subtype === "typedarray";
  const parts = (preview.properties ?? []).map((property) => (list ? propertyText(property) : `${property.name}: ${propertyText(property)}`));
  for (const entry of preview.entries ?? []) parts.push(`${entry.key ? `${previewText(entry.key)} => ` : ""}${previewText(entry.value)}`);
  const body = `${parts.join(", ")}${preview.overflow ? ", …" : ""}`;
  if (list) return `[${body}]`;
  if (preview.type !== "object") return preview.description ?? preview.type;
  const name = preview.description && preview.description !== "Object" ? `${preview.description} ` : "";
  return `${name}{${body}}`;
}
/** A console argument (RemoteObject) as DevTools prints it; strings bare at the top level. */
export function remoteText(remote, top = true) {
  if (!remote) return "undefined";
  const { type, subtype, value, unserializableValue, description, preview } = remote;
  if (type === "string") return top ? value : JSON.stringify(value);
  if (unserializableValue !== undefined) return unserializableValue;
  if (type === "undefined") return "undefined";
  if (subtype === "null") return "null";
  if (type === "number" || type === "boolean") return String(value);
  if (type === "function") return `ƒ ${clip(firstLine(description).replace(/^(async\s+)?function\s*/, "$1"), 100)}`;
  if (subtype === "error") return String(description ?? "Error").split("\n").slice(0, 4).join("\n");
  if (type === "symbol" || type === "bigint" || subtype === "node") return description ?? type;
  if (preview) return previewText(preview);
  if (value !== undefined) { try { return JSON.stringify(value); } catch {} }
  return description ?? type;
}
/** console.log's arguments as one line, with the format specifiers (%s %d %i %f %o %O %c) of a leading string. */
export function consoleText(args = []) {
  if (!args.length) return "";
  let next = 1;
  let head = remoteText(args[0]);
  if (args[0].type === "string" && /%[sdifoOc]/.test(args[0].value)) {
    head = args[0].value.replace(/%([sdifoOc%])/g, (match, spec) => {
      if (spec === "%") return "%";
      if (next >= args.length) return match;
      const arg = args[next++];
      if (spec === "c") return "";
      if (spec === "d" || spec === "i") return arg.type === "number" ? String(Math.trunc(arg.value)) : "NaN";
      if (spec === "f") return arg.type === "number" ? String(arg.value) : "NaN";
      return remoteText(arg, spec === "s");
    });
  }
  return [head, ...args.slice(next).map((arg) => remoteText(arg))].join(" ");
}

const LEVELS = { log: "log", info: "info", debug: "debug", verbose: "debug", warning: "warn", warn: "warn", error: "error", assert: "error" };
const where = (url, line, column) => ({ url: url || null, line: Number.isInteger(line) ? line + 1 : null, column: Number.isInteger(column) ? column + 1 : null });

function consoleEntry(params) {
  if (params.type === "clear" || params.type === "endGroup") return null;
  const frame = params.stackTrace?.callFrames?.[0];
  let text = consoleText(params.args);
  if (params.type === "assert") text = `Assertion failed${text ? `: ${text}` : ""}`;
  return { level: LEVELS[params.type] ?? "log", text: clip(text, MAX_TEXT), ...where(frame?.url, frame?.lineNumber, frame?.columnNumber), timestamp: params.timestamp ?? Date.now(), source: "console" };
}
function exceptionEntry({ timestamp, exceptionDetails: details = {} }) {
  const frame = details.stackTrace?.callFrames?.[0];
  const message = details.exception ? firstLine(details.exception.description ?? remoteText(details.exception)) : "";
  const text = message ? `${details.text && details.text !== message ? `${details.text} ` : ""}${message}` : details.text ?? "Uncaught exception";
  return { level: "error", text: clip(text, MAX_TEXT), ...where(details.url || frame?.url, details.lineNumber ?? frame?.lineNumber, details.columnNumber ?? frame?.columnNumber), timestamp: timestamp ?? Date.now(), source: "exception", exceptionId: details.exceptionId };
}
function logEntry({ entry = {} }) {
  return { level: LEVELS[entry.level] ?? "log", text: clip(String(entry.text ?? ""), MAX_TEXT), ...where(entry.url, entry.lineNumber, null), timestamp: entry.timestamp ?? Date.now(), source: entry.source ?? "other" };
}

// An argument V8 sent without a preview (a replayed message's object): its text would be the bare class name.
const NO_PREVIEW_NEEDED = new Set(["null", "node", "error", "regexp", "date"]);
const needsPreview = (arg) => arg?.type === "object" && typeof arg.objectId === "string" && !arg.preview && !NO_PREVIEW_NEEDED.has(arg.subtype);

/** The messages waiting in monitor.previewQueue get their object arguments' previews (Runtime.callFunctionOn returning
 * the object itself, with generatePreview), newest message first, one after another, and their entries their full
 * text; a message no longer kept (cleared, dropped, the tab went to another origin) is skipped and costs nothing. An
 * object V8 no longer has (the page navigated, Runtime was re-enabled) or a detached tab keeps the text it had. The
 * objects this creates are released once nothing is pending. */
function fillPreviews(monitor) {
  if (!monitor.previewQueue.length) return;
  monitor.previewsPending += 1;
  monitor.previewing = monitor.previewing.then(async () => {
    const target = { tabId: monitor.tabId };
    const kept = new Set(monitor.console);
    for (const { entry, params } of monitor.previewQueue.splice(0).reverse()) {
      if (monitor.previewsLeft <= 0 || monitors.get(monitor.tabId) !== monitor) break;
      if (!kept.has(entry)) continue;
      const args = [];
      let filled = false;
      for (const arg of params.args) {
        if (!needsPreview(arg) || monitor.previewsLeft <= 0 || monitors.get(monitor.tabId) !== monitor) { args.push(arg); continue; }
        monitor.previewsLeft -= 1;
        try {
          const reply = await chrome.debugger.sendCommand(target, "Runtime.callFunctionOn", { objectId: arg.objectId, functionDeclaration: "function () { return this; }", generatePreview: true, silent: true, objectGroup: PREVIEW_GROUP });
          if (!reply?.exceptionDetails && reply?.result?.preview) { args.push({ ...arg, preview: reply.result.preview }); filled = true; continue; }
        } catch {}
        args.push(arg);
      }
      if (filled) entry.text = consoleEntry({ ...params, args })?.text ?? entry.text;
    }
  }).catch(() => {}).finally(() => {
    monitor.previewsPending -= 1;
    if (monitor.previewsPending === 0) chrome.debugger.sendCommand({ tabId: monitor.tabId }, "Runtime.releaseObjectGroup", { objectGroup: PREVIEW_GROUP }).catch(() => {});
  });
}
/** Waits (at most PREVIEW_WAIT_MS) for the previews still being filled in. */
async function previewsIn(monitor) {
  if (!monitor.previewsPending) return;
  let timer = null;
  await Promise.race([monitor.previewing, new Promise((resolve) => { timer = setTimeout(resolve, PREVIEW_WAIT_MS); })]);
  clearTimeout(timer);
}

// ── network ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Headers as they are kept: redacted, and bounded (a page could send huge ones), when they arrive. */
function storedHeaders(headers) {
  if (!headers || typeof headers !== "object") return null;
  const entries = Object.entries(headers);
  const kept = entries.slice(0, MAX_HEADERS).map(([name, value]) => [clip(name, 200), REDACTED.test(name) ? "(redacted)" : clip(String(value), MAX_HEADER_VALUE)]);
  if (entries.length > MAX_HEADERS) kept.push(["…", `${entries.length - MAX_HEADERS} more headers not kept`]);
  return Object.fromEntries(kept);
}

function applyResponse(request, response = {}) {
  request.status = response.status ?? null;
  request.statusText = response.statusText || null;
  request.mimeType = response.mimeType || null;
  request.fromCache ||= response.fromDiskCache === true || response.fromPrefetchCache === true;
  if (response.fromServiceWorker) request.fromServiceWorker = true;
  if (Number.isFinite(response.encodedDataLength)) request.size = response.encodedDataLength;
  request.responseHeaders = storedHeaders(response.headers);
}
const msBetween = (from, to) => (Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, Math.round((to - from) * 1000)) : null);

/** The tab's page went to another origin: what was recorded for the old one is dropped. */
function navigated(monitor, url) {
  const origin = originOf(url);
  if (origin === monitor.origin) return;
  monitor.origin = origin;
  monitor.console = [];
  monitor.requests = [];
  monitor.live.clear();
}

const handlers = {
  "Runtime.consoleAPICalled": (monitor, params) => {
    const entry = consoleEntry(params);
    if (!entry) return;
    push(monitor.console, entry);
    if (!params.args?.some(needsPreview) || monitor.previewsLeft <= 0) return;
    // Kept until the replay is in, so the previews go to the newest messages; bounded like the console itself.
    push(monitor.previewQueue, { entry, params });
    if (monitor.replayed) fillPreviews(monitor);
  },
  "Runtime.exceptionThrown": (monitor, params) => push(monitor.console, exceptionEntry(params)),
  // A promise rejection the page handled after all: DevTools takes its error back out.
  "Runtime.exceptionRevoked": (monitor, { exceptionId }) => { monitor.console = monitor.console.filter((entry) => entry.exceptionId !== exceptionId); },
  "Log.entryAdded": (monitor, params) => push(monitor.console, logEntry(params)),
  "Network.requestWillBeSent": (monitor, params) => {
    const url = params.request?.url ?? "";
    if (params.type === "Document" && params.requestId === params.loaderId && monitor.mainFrameId && params.frameId === monitor.mainFrameId) navigated(monitor, url);
    const previous = monitor.live.get(params.requestId);
    if (previous && params.redirectResponse) {
      applyResponse(previous, params.redirectResponse);
      previous.duration = msBetween(previous.start, params.timestamp);
      previous.finished = true;
    }
    const request = {
      requestId: params.requestId, method: params.request?.method ?? "GET", url: clip(url, MAX_URL), type: params.type ?? "Other", initiator: params.initiator?.type ?? null,
      start: params.timestamp, timestamp: Number.isFinite(params.wallTime) ? Math.round(params.wallTime * 1000) : Date.now(),
      status: null, statusText: null, mimeType: null, size: null, duration: null, failed: false, errorText: null, fromCache: false, finished: false,
      requestHeaders: storedHeaders(params.request?.headers), responseHeaders: null,
    };
    monitor.live.set(params.requestId, request);
    push(monitor.requests, request, (dropped) => { if (monitor.live.get(dropped.requestId) === dropped) monitor.live.delete(dropped.requestId); });
  },
  "Network.responseReceived": (monitor, { requestId, type, response }) => {
    const request = monitor.live.get(requestId);
    if (!request) return;
    applyResponse(request, response);
    if (type) request.type = type;
  },
  "Network.requestServedFromCache": (monitor, { requestId }) => { const request = monitor.live.get(requestId); if (request) request.fromCache = true; },
  "Network.loadingFinished": (monitor, { requestId, timestamp, encodedDataLength }) => {
    const request = monitor.live.get(requestId);
    if (!request) return;
    if (Number.isFinite(encodedDataLength)) request.size = encodedDataLength;
    request.duration = msBetween(request.start, timestamp);
    request.finished = true;
  },
  "Network.loadingFailed": (monitor, { requestId, timestamp, errorText, canceled, blockedReason }) => {
    const request = monitor.live.get(requestId);
    if (!request) return;
    request.failed = true;
    request.errorText = [errorText || "failed", blockedReason ? `blocked: ${blockedReason}` : null, canceled ? "canceled" : null].filter(Boolean).join(", ");
    request.duration = msBetween(request.start, timestamp);
    request.finished = true;
  },
};

onEvent((tabId, method, params) => {
  const monitor = monitors.get(tabId);
  if (monitor && Object.hasOwn(handlers, method)) handlers[method](monitor, params);
});
// Chrome detached the tab (closed, or the user cancelled the bar): monitoring is over; a read starts it again.
onDetached((tabId) => forget(tabId));
chrome.tabs.onRemoved.addListener((tabId) => stop(tabId));
// A navigation the network didn't show (a back/forward cache restore, a main frame Chrome swapped): by the tab's URL.
chrome.tabs.onUpdated.addListener((tabId, change) => {
  const monitor = monitors.get(tabId);
  if (monitor && typeof change.url === "string") navigated(monitor, change.url);
});

function forget(tabId) {
  const monitor = monitors.get(tabId);
  if (!monitor) return false;
  clearTimeout(monitor.timer);
  monitors.delete(tabId);
  return true;
}
/** Stops monitoring a tab and lets the debugger go (unless a call is using it right now). */
export function stop(tabId) {
  if (forget(tabId)) unhold(tabId);
}
function touch(monitor) {
  clearTimeout(monitor.timer);
  monitor.timer = setTimeout(() => { if (monitors.get(monitor.tabId) === monitor) stop(monitor.tabId); }, IDLE_MS);
}

/** The tab's monitor, started on first use: → { monitor, started }. */
async function ensure(tab) {
  let monitor = monitors.get(tab.id);
  if (monitor) {
    await monitor.ready;
    touch(monitor);
    return { monitor, started: false };
  }
  // In the map before Runtime.enable: the messages it replays arrive as events and must find it.
  monitor = { tabId: tab.id, console: [], requests: [], live: new Map(), origin: originOf(tab.url || tab.pendingUrl || ""), mainFrameId: null, since: Date.now(), timer: null, ready: null,
    replayed: false, previewQueue: [], previewing: Promise.resolve(), previewsLeft: MAX_PREVIEWS, previewsPending: 0 };
  monitors.set(tab.id, monitor);
  const target = { tabId: tab.id };
  monitor.ready = (async () => {
    try {
      await hold(tab);
      try { monitor.mainFrameId = (await chrome.debugger.sendCommand(target, "Page.getFrameTree")).frameTree?.frame?.id ?? null; } catch { monitor.mainFrameId = null; }
      await chrome.debugger.sendCommand(target, "Network.enable", {});
      await chrome.debugger.sendCommand(target, "Log.enable");
      // replay: Runtime may already be on for a script call on this tab; it is enabled anew so V8 replays its messages.
      await enableRuntime(tab.id, { replay: true });
      await new Promise((resolve) => setTimeout(resolve, REPLAY_SETTLE_MS));
      monitor.replayed = true;
      fillPreviews(monitor);
    } catch (error) {
      if (monitors.get(tab.id) === monitor) stop(tab.id);
      if (error instanceof ToolError) throw error;
      throw new ToolError("debugger_error", `Couldn't watch tab ${tab.id}: ${error?.message ?? String(error)}`);
    }
  })();
  await monitor.ready;
  touch(monitor);
  return { monitor, started: true };
}

const publicMessage = ({ exceptionId, ...entry }) => entry;
function publicRequest(request, { headers }) {
  const { start, requestHeaders, responseHeaders, finished, ...out } = request;
  if (!finished && !out.failed) out.pending = true;
  if (headers) out.headers = { request: requestHeaders ?? {}, response: responseHeaders ?? {} };
  return out;
}

/** read_console_messages: { tabId, url, started, since, total, matched, messages, cleared? } (newest last). */
export async function readConsole(tab, { pattern = null, onlyErrors = false, limit = 100, clear = false } = {}) {
  const { monitor, started } = await ensure(tab);
  await previewsIn(monitor);
  let list = monitor.console;
  if (onlyErrors) list = list.filter((entry) => entry.level === "error");
  if (pattern) list = list.filter((entry) => pattern.test(entry.text));
  const total = monitor.console.length;
  const messages = list.slice(-limit).map(publicMessage);
  if (clear) monitor.console = [];
  return { tabId: tab.id, url: tab.url ?? "", started, since: monitor.since, total, matched: list.length, messages, ...(clear ? { cleared: true } : {}) };
}

/** read_network_requests: { tabId, url, started, since, total, matched, requests, cleared? } (oldest first); with
 * requestId, that one request with its headers and response body. */
export async function readNetwork(tab, { match = null, limit = 100, clear = false, headers = false, requestId = null } = {}) {
  const { monitor, started } = await ensure(tab);
  if (requestId !== null) {
    const request = [...monitor.requests].reverse().find((entry) => entry.requestId === requestId);
    if (!request) throw new ToolError("not_found", `No request ${requestId} was recorded on tab ${tab.id} (only requests since monitoring began, on the current site).`);
    const out = publicRequest(request, { headers: true });
    try {
      const { body, base64Encoded } = await chrome.debugger.sendCommand({ tabId: tab.id }, "Network.getResponseBody", { requestId });
      if (base64Encoded) out.bodyOmitted = `binary, ${Math.floor((body.length * 3) / 4)} bytes`;
      else { out.body = clip(body, MAX_BODY); if (body.length > MAX_BODY) out.bodyTruncated = true; }
    } catch (error) { out.bodyOmitted = `Chrome no longer has it (${error?.message ?? String(error)})`; }
    return { tabId: tab.id, url: tab.url ?? "", started, since: monitor.since, request: out };
  }
  const list = match ? monitor.requests.filter((entry) => match(entry.url)) : monitor.requests;
  const total = monitor.requests.length;
  const requests = list.slice(-limit).map((entry) => publicRequest(entry, { headers }));
  if (clear) { monitor.requests = []; monitor.live.clear(); }
  return { tabId: tab.id, url: tab.url ?? "", started, since: monitor.since, total, matched: list.length, requests, ...(clear ? { cleared: true } : {}) };
}

export const monitoredTabs = () => [...monitors.keys()];
