// javascript_tool: runs the model's code in the page's own JavaScript context (its globals, its DOM) and returns its
// value: an expression's value, or the last expression of a block of statements. Declarations stay local to the call.
// It runs synchronously: waiting on a promise schedules work in the page, so await / .then are refused.
//
// It is read-only, and the browser enforces it: the code runs through the DevTools protocol's Runtime.evaluate with
// throwOnSideEffect, so V8 and Blink refuse anything with an effect outside the evaluation itself — changing the DOM or
// a global, network requests, storage, timers — whatever the spelling. A short list of well-known calls (cookies,
// network, storage) is refused up front with a clearer message. Reading cookies has no side effect to V8, so the
// document's cookies are switched off for the evaluation (Emulation.setDocumentCookieDisabled): document.cookie reads
// "" however it is spelled. Going through the debugger also means a page's Content-Security-Policy can't block it.
// The debugger is attached for the call only (Chrome shows its "started debugging" bar meanwhile).
import { ToolError } from "./errors.js";

const PROTOCOL = "1.3";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESULT_CHARS = 50_000;
const REFUSED = [
  [/\bdocument\s*\.\s*cookie\b|\bcookieStore\b/, "reads cookies"],
  [/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b|\bWebSocket\b|\bEventSource\b|\bimport\s*\(/, "makes a network request"],
  [/\b(localStorage|sessionStorage|indexedDB|caches)\b/, "touches the page's storage"],
];
const READ_ONLY = "javascript_tool only reads the page: no changes to the DOM or globals, no network, no cookies or storage. Use form_input or computer to change the page.";

const locks = new Map(); // tabId → the debugger session in use (one at a time per tab)
function inTurn(tabId, fn) {
  const run = (locks.get(tabId) ?? Promise.resolve()).then(fn);
  const settled = run.catch(() => {});
  locks.set(tabId, settled);
  settled.then(() => { if (locks.get(tabId) === settled) locks.delete(tabId); });
  return run;
}

/** A RemoteObject as {type, value}: plain values by value, a DOM node as its description (e.g. "a#home.nav"). */
async function format(target, remote) {
  if (!remote) return { type: "undefined" };
  const { type, subtype, value, description, unserializableValue, objectId } = remote;
  if (type === "undefined") return { type };
  if (unserializableValue !== undefined) return { type, value: unserializableValue };
  if (subtype === "node") return { type: "node", value: description ?? "node" };
  if (type === "function" || type === "symbol") return { type, value: description ?? type };
  let plain = value;
  if (objectId) {
    const reply = await chrome.debugger.sendCommand(target, "Runtime.callFunctionOn", { objectId, functionDeclaration: "function () { return this; }", returnByValue: true, silent: true });
    plain = reply.exceptionDetails ? description : reply.result?.value;
  }
  const text = JSON.stringify(plain);
  if (text === undefined) return { type: subtype ?? type, value: description ?? null };
  if (text.length > MAX_RESULT_CHARS) return { type: subtype ?? type, value: `${text.slice(0, MAX_RESULT_CHARS)}…`, truncated: true };
  return { type: subtype ?? type, value: plain };
}

/** The forms the code is tried in: as an expression, else as statements whose last expression is the value. */
const forms = (code) => [`(\n${code}\n)`, `{\n${code}\n}`];

export async function runReadOnly(tab, code, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof code !== "string" || !code.trim()) throw new ToolError("bad_request", "code is required.");
  for (const [pattern, what] of REFUSED) if (pattern.test(code)) throw new ToolError("not_read_only", `Refused: the code ${what}. ${READ_ONLY}`);
  // Waiting on a promise schedules work in the page, which a side-effect-free evaluation can't do.
  if (/\bawait\b|\.then\s*\(/.test(code)) throw new ToolError("not_supported", "javascript_tool runs synchronously: await and .then aren't available. Read the page's current state instead.");
  const target = { tabId: tab.id };
  return inTurn(tab.id, async () => {
    try { await chrome.debugger.attach(target, PROTOCOL); }
    catch (error) {
      const message = error?.message ?? String(error);
      if (/cannot access|chrome:\/\/|cannot attach/i.test(message)) throw new ToolError("restricted_page", `Chrome doesn't allow scripts on ${tab.url || "this page"} (${message}).`);
      throw new ToolError("debugger_busy", `Couldn't attach to tab ${tab.id}: ${message}`);
    }
    let cookiesOff = false;
    const started = Date.now();
    try {
      await chrome.debugger.sendCommand(target, "Emulation.setDocumentCookieDisabled", { disabled: true });
      cookiesOff = true;
      let reply;
      for (const expression of forms(code)) {
        reply = await chrome.debugger.sendCommand(target, "Runtime.evaluate", {
          expression, throwOnSideEffect: true, returnByValue: false, objectGroup: "openclaude-bridge",
          timeout: timeoutMs, userGesture: false, allowUnsafeEvalBlockedByCSP: true, silent: true,
        });
        if (reply.exceptionDetails?.exception?.className !== "SyntaxError") break;
      }
      if (reply.exceptionDetails) {
        const details = reply.exceptionDetails;
        const message = details.exception?.description ?? details.text ?? "The code threw.";
        if (/possible side-effect|side effect/i.test(message)) throw new ToolError("not_read_only", `Refused: Chrome found a possible side effect (${message.split("\n")[0]}). ${READ_ONLY} If this was only a read: Chrome doesn't mark every DOM method as side-effect free (getElementById, getElementsBy… aren't); use querySelector / querySelectorAll.`);
        if (/execution was terminated/i.test(message)) throw new ToolError("timeout", `The code ran longer than ${Math.round(timeoutMs / 1000)} s and was stopped.`);
        throw new ToolError("js_error", message.split("\n").slice(0, 6).join("\n"));
      }
      return await format(target, reply.result);
    } catch (error) {
      if (error instanceof ToolError) throw error;
      // A terminated evaluation comes back as a protocol error rather than an exception.
      if (Date.now() - started >= timeoutMs) throw new ToolError("timeout", `The code ran longer than ${Math.round(timeoutMs / 1000)} s and was stopped.`);
      throw new ToolError("js_error", error?.message ?? String(error));
    } finally {
      await chrome.debugger.sendCommand(target, "Runtime.releaseObjectGroup", { objectGroup: "openclaude-bridge" }).catch(() => {});
      if (cookiesOff) await chrome.debugger.sendCommand(target, "Emulation.setDocumentCookieDisabled", { disabled: false }).catch(() => {});
      await chrome.debugger.detach(target).catch(() => {});
    }
  });
}
