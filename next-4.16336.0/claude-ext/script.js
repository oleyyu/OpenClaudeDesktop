// javascript_tool: runs the model's code in the page's own JavaScript context (its globals, its DOM) and returns its
// value: an expression's value, or the last expression of a block of statements.
//
// Read-only (runReadOnly, the default): declarations stay local to the call, and it runs synchronously: waiting on a
// promise schedules work in the page, so await / .then are refused. The browser enforces it: the code runs through the
// DevTools protocol's Runtime.evaluate with throwOnSideEffect, so V8 and Blink refuse anything with an effect outside
// the evaluation itself — changing the DOM or a global, network requests, storage, timers — whatever the spelling. A
// short list of well-known calls (cookies, network, storage) is refused up front with a clearer message. Reading
// cookies has no side effect to V8, so the document's cookies are switched off for the evaluation
// (Emulation.setDocumentCookieDisabled): document.cookie reads "" however it is spelled.
//
// Write (runWrite, javascript_tool's write: true, which the app runs only once the user approved it for the page's
// site: sites.js assertScriptSite): the code runs as DevTools' console runs what is typed into it — replMode (top-level
// await, let / const redeclared from one call to the next), a user gesture, the console's helpers ($, $$, $x, copy …)
// — with no side-effect check and the page's cookies as they are. A promise the code ends with is awaited too (the
// console would show it pending; replMode itself waits only for an explicit await).
//
// Both run in the document they were checked against: inside the tab's turn, right before the evaluation, the main
// frame's URL (the browser's, Page.getFrameTree) goes through options.verify (the site checks, service-worker.js), and
// the evaluation is pinned to that document's execution context (uniqueContextId). A navigation in between — another
// call's script, a link, a redirect — destroys the context, so the evaluation fails rather than run on the new site.
//
// Going through the debugger also means a page's Content-Security-Policy can't block either. The debugger session is
// debugger.js's, shared with console / network monitoring: attached for the call unless a monitor already holds the
// tab (Chrome shows its "started debugging" bar meanwhile).
import { ToolError } from "./errors.js";
import { acquire, enableRuntime, mainContext } from "./debugger.js";
import { hostOf } from "./sites.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESULT_CHARS = 50_000;
const REFUSED = [
  [/\bdocument\s*\.\s*cookie\b|\bcookieStore\b/, "reads cookies"],
  [/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b|\bWebSocket\b|\bEventSource\b|\bimport\s*\(/, "makes a network request"],
  [/\b(localStorage|sessionStorage|indexedDB|caches)\b/, "touches the page's storage"],
];
const READ_ONLY = "javascript_tool only reads the page: no changes to the DOM or globals, no network, no cookies or storage. Use form_input or computer to change the page, or javascript_tool with write: true (the user approves it).";

const GROUP = "openclaude-bridge";
const locks = new Map(); // tabId → the evaluation running on it (one at a time per tab: read-only ones switch cookies off)
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

const changed = (what) => new ToolError("page_changed", `The page changed while the script was waiting to run (${what}), so it didn't run. Read the tab again (chrome_tabs_context_mcp, chrome_read_page) and retry if it still makes sense.`);

const notReady = () => new ToolError("page_not_ready", "The page has no script context right now (it may be loading or navigating). Try again in a moment.");

/** The document a call runs in, inside the tab's turn: the main frame's URL as the browser sees it, checked by
 * verify(url) (the site checks), and its default execution context to pin the evaluation to (→ { url, contextId, pin }).
 * The site is checked first: a document on a site the call may not use is refused as such, even before it has a
 * script context. Runtime is enabled for it (and Runtime.compileScript needs it). */
async function checkedDocument(target, verify) {
  await enableRuntime(target.tabId);
  const frame = (await chrome.debugger.sendCommand(target, "Page.getFrameTree")).frameTree?.frame;
  if (!frame) throw notReady();
  const url = frame.url ?? "";
  if (verify) await verify(url);
  const context = mainContext(target.tabId, frame.id);
  if (!context) throw notReady();
  // The frame tree and the context were read one after the other: a navigation between them shows as another site.
  if (hostOf(context.origin) !== hostOf(url)) throw changed(`it now shows ${hostOf(url) ?? url}`);
  return { url, contextId: context.id, pin: context.uniqueId ? { uniqueContextId: context.uniqueId } : { contextId: context.id } };
}

/** A failed evaluation's protocol error: the pinned document went away (the page navigated, the evaluation was sent
 * on to the new document's process and found no such context there, or its process went). Pinned by uniqueContextId,
 * V8 says "uniqueContextId not found"; by contextId (or an objectId), "Cannot find context with specified id". */
const contextGone = (error) => /cannot find context|uniquecontextid not found|context was destroyed|execution context .*(not found|destroyed)|inspected target navigated/i.test(error?.message ?? "");
/** V8 let go of the promise an evaluation awaits: nothing refers to it any more (await new Promise(() => {})), so it
 * can never settle. */
const promiseCollected = (error) => /promise was collected/i.test(error?.message ?? "");
const navigatedAway = () => new ToolError("page_changed", "The page navigated away while the script was about to run or running: nothing ran on the new page; what the script did before the navigation stays done. Read the tab again before retrying.");

/** The forms the code is tried in: as an expression, else as statements whose last expression is the value. */
const forms = (code) => [`(\n${code}\n)`, `{\n${code}\n}`];

// Where the code sits in the script that was evaluated: whole lines before its first line, and characters before it on
// that line. forms() puts a line before it; the console's object-literal parentheses (consoleForm) a character.
const AS_IS = { lines: 0, columns: 0 };
const IN_FORMS = { lines: 1, columns: 0 };
const IN_PARENS = { lines: 0, columns: 1 };

const stoppedAfter = (timeoutMs) => new ToolError("timeout", `The code ran longer than ${Math.round(timeoutMs / 1000)} s and was stopped.`);

/** A position in the evaluated script (0-based line and column) as one in the code (1-based → { line, column }), or
 * null when it isn't in the code (it is in the wrapping around it, or past the end of the code's line). */
function inCode(line, column, code, offset) {
  const lines = code.split(/\r\n|[\n\r\u2028\u2029]/);
  const codeLine = line - offset.lines;
  const codeColumn = codeLine === 0 ? column - offset.columns : column;
  if (codeLine < 0 || codeLine >= lines.length || codeColumn < 0 || codeColumn > lines[codeLine].length) return null;
  return { line: codeLine + 1, column: codeColumn + 1 };
}

const STACKED = /^\s+at (?:.*\()?<anonymous>:(\d+):(\d+)\)?$/m;

/** The places in the evaluated script the exception's stack shows (0-based [line, column], innermost first), or null
 * when it has no stack. Its frames (0-based) say it: those of the evaluated script, which has no URL (the page's own
 * scripts have theirs: an error thrown in a page function the code called is placed at the call). Other scripts have
 * none either — functions an earlier write call declared (replMode keeps them), code the page eval'd — so the script
 * is told by its id: the outermost URL-less frame's, where the code started running (its top level, or a callback of
 * its trailing promise). The limit: when none of the stack's frames are the code's (it awaited a function an earlier
 * call declared, which threw after an await of its own), that function's place is taken for the code's. Without
 * frames, the Error's own stack text (1-based), its innermost <anonymous> line.
 * V8 gives no stack for a value that isn't an Error thrown in replMode, or rejecting a trailing promise: it is caught
 * in a microtask, where there are no frames to capture (→ null). */
function stackPlaces(details) {
  const frames = details.stackTrace?.callFrames;
  if (Array.isArray(frames)) {
    const unnamed = frames.filter((frame) => !frame.url && Number.isInteger(frame.lineNumber));
    const script = unnamed.at(-1)?.scriptId;
    return unnamed.filter((frame) => frame.scriptId === script).map((frame) => [frame.lineNumber, frame.columnNumber ?? 0]);
  }
  const stacked = STACKED.exec(details.exception?.description ?? "");
  return stacked ? [[Number(stacked[1]) - 1, Number(stacked[2]) - 1]] : null;
}

/** Where the code threw (→ { line, column } in the code, 1-based, or null): the innermost of its places in the stack
 * (stackPlaces). exceptionDetails.lineNumber / columnNumber aren't used for that: V8 gives them 1-based for an
 * exception that rejected a promise (in replMode every runtime error does, and so does a trailing promise's rejection),
 * 0 (and no stack) for such a value that isn't an Error, and 0-based for one thrown synchronously. Only a syntax error,
 * which has no stack, is placed by them (0-based, as compiled). */
function thrownAt(details, places, code, offset) {
  if (places) return places.length ? inCode(places[0][0], places[0][1], code, offset) : null;
  const compiled = !details.exception || details.exception.className === "SyntaxError";
  return compiled && Number.isInteger(details.lineNumber) ? inCode(details.lineNumber, details.columnNumber ?? 0, code, offset) : null;
}

/** What was thrown, as text: an Error (or another object) as its description — for an Error its stack, "TypeError: x
 * is not a function\n    at …" — as it is (exceptionDetails.text, "Uncaught", isn't put before it); a value that
 * isn't an object ('x', 42, null, undefined) as Uncaught "x", much as the console shows it. */
function exceptionText(details) {
  const exception = details.exception;
  if (!exception) return details.text || "The code threw.";
  const { type, subtype, value, description } = exception;
  if ((type === undefined || type === "object" || type === "function") && subtype !== "null" && description) return description;
  const shown = type === "string" ? JSON.stringify(value) : subtype === "null" ? "null" : type === "undefined" ? "undefined" : description ?? String(value);
  return `Uncaught ${shown}`;
}

/** An evaluation's exception as a ToolError: what was thrown (with its stack's first lines), and where in the code —
 * the stack's positions in the code too, when the code was evaluated wrapped (offset): those of its own frames only
 * (another script's <anonymous> lines aren't the code's). */
function thrown(details, timeoutMs, code, offset = AS_IS) {
  if (/execution was terminated/i.test(details.exception?.description ?? details.text ?? "")) return stoppedAfter(timeoutMs);
  let message = exceptionText(details);
  const places = stackPlaces(details);
  if ((offset.lines || offset.columns) && places?.length) {
    const own = new Set(places.map(([line, column]) => `${line + 1}:${column + 1}`));
    message = message.replace(/<anonymous>:(\d+):(\d+)/g, (match, line, column) => {
      const at = own.has(`${line}:${column}`) ? inCode(Number(line) - 1, Number(column) - 1, code, offset) : null;
      return at ? `<anonymous>:${at.line}:${at.column}` : match;
    });
  }
  const at = thrownAt(details, places, code, offset);
  return new ToolError("js_error", `${message.split("\n").slice(0, 6).join("\n")}${at ? ` (line ${at.line}, column ${at.column})` : ""}`);
}

export async function runReadOnly(tab, code, { timeoutMs = DEFAULT_TIMEOUT_MS, verify = null } = {}) {
  if (typeof code !== "string" || !code.trim()) throw new ToolError("bad_request", "code is required.");
  for (const [pattern, what] of REFUSED) if (pattern.test(code)) throw new ToolError("not_read_only", `Refused: the code ${what}. ${READ_ONLY}`);
  // Waiting on a promise schedules work in the page, which a side-effect-free evaluation can't do.
  if (/\bawait\b|\.then\s*\(/.test(code)) throw new ToolError("not_supported", "javascript_tool runs synchronously: await and .then aren't available. Read the page's current state instead, or use write: true.");
  return inTurn(tab.id, async () => {
    const { target, release } = await acquire(tab);
    let cookiesOff = false;
    const started = Date.now();
    try {
      const doc = await checkedDocument(target, verify);
      await chrome.debugger.sendCommand(target, "Emulation.setDocumentCookieDisabled", { disabled: true });
      cookiesOff = true;
      let reply;
      for (const expression of forms(code)) {
        reply = await chrome.debugger.sendCommand(target, "Runtime.evaluate", {
          expression, throwOnSideEffect: true, returnByValue: false, objectGroup: GROUP, ...doc.pin,
          timeout: timeoutMs, userGesture: false, allowUnsafeEvalBlockedByCSP: true, silent: true,
        });
        if (reply.exceptionDetails?.exception?.className !== "SyntaxError") break;
      }
      if (reply.exceptionDetails) {
        const details = reply.exceptionDetails;
        const message = details.exception?.description ?? details.text ?? "The code threw.";
        if (/possible side-effect|side effect/i.test(message)) throw new ToolError("not_read_only", `Refused: Chrome found a possible side effect (${message.split("\n")[0]}). ${READ_ONLY} If this was only a read: Chrome doesn't mark every DOM method as side-effect free (getElementById, getElementsBy… aren't); use querySelector / querySelectorAll.`);
        throw thrown(details, timeoutMs, code, IN_FORMS);
      }
      return await format(target, reply.result);
    } catch (error) {
      if (error instanceof ToolError) throw error;
      if (contextGone(error)) throw navigatedAway();
      // A terminated evaluation comes back as a protocol error rather than an exception.
      if (Date.now() - started >= timeoutMs) throw stoppedAfter(timeoutMs);
      throw new ToolError("js_error", error?.message ?? String(error));
    } finally {
      await chrome.debugger.sendCommand(target, "Runtime.releaseObjectGroup", { objectGroup: GROUP }).catch(() => {});
      if (cookiesOff) await chrome.debugger.sendCommand(target, "Emulation.setDocumentCookieDisabled", { disabled: false }).catch(() => {});
      release();
    }
  });
}

/** What the console would run for `code`: like DevTools, code that reads as an object literal ({a: 1}) is wrapped in
 * parentheses when that compiles (Runtime.compileScript runs nothing; it needs Runtime enabled, as checkedDocument has),
 * else it is run as it is (a block). */
async function consoleForm(target, code, contextId) {
  if (!/^\s*\{/.test(code) || !/\}\s*$/.test(code)) return code;
  try {
    const compiled = await chrome.debugger.sendCommand(target, "Runtime.compileScript", { expression: `(${code})`, sourceURL: "", persistScript: false, executionContextId: contextId });
    return compiled.exceptionDetails ? code : `(${code})`;
  } catch { return code; }
}

export async function runWrite(tab, code, { timeoutMs = DEFAULT_TIMEOUT_MS, verify = null } = {}) {
  if (typeof code !== "string" || !code.trim()) throw new ToolError("bad_request", "code is required.");
  return inTurn(tab.id, async () => {
    const { target, release } = await acquire(tab);
    const started = Date.now();
    let timer = null;
    try {
      const doc = await checkedDocument(target, verify);
      const expression = await consoleForm(target, code, doc.contextId);
      const offset = expression === code ? AS_IS : IN_PARENS;
      // Runtime.evaluate's own timeout stops a script that is still running; a promise that never settles is given up
      // on here (it can't be stopped: what it started may still finish in the page).
      const expired = new Promise((resolve, reject) => { timer = setTimeout(() => reject(new ToolError("timeout", `The code didn't finish within ${Math.round(timeoutMs / 1000)} s: stopped waiting for it (a promise it awaits may never settle; work it started may still finish in the page).`)), timeoutMs + 250); });
      let reply = await Promise.race([expired, chrome.debugger.sendCommand(target, "Runtime.evaluate", {
        expression, replMode: true, awaitPromise: true, userGesture: true, includeCommandLineAPI: true, returnByValue: false,
        objectGroup: GROUP, ...doc.pin, timeout: timeoutMs, allowUnsafeEvalBlockedByCSP: true, silent: true,
      })]);
      // replMode awaits an explicit top-level await only: a promise the code ends with (fetch(…).then(…)) comes back
      // as the Promise itself. Its value is waited for here, within the same time.
      if (!reply.exceptionDetails && reply.result?.subtype === "promise" && reply.result.objectId) {
        reply = await Promise.race([expired, chrome.debugger.sendCommand(target, "Runtime.awaitPromise", { promiseObjectId: reply.result.objectId, returnByValue: false })]);
      }
      if (reply.exceptionDetails) throw thrown(reply.exceptionDetails, timeoutMs, code, offset);
      return await format(target, reply.result);
    } catch (error) {
      if (error instanceof ToolError) throw error;
      if (contextGone(error)) throw navigatedAway();
      if (promiseCollected(error)) throw new ToolError("timeout", "The code awaits a promise that can never settle (nothing in the page refers to it any more), so it was stopped waiting for. Work it started may still finish in the page.");
      if (Date.now() - started >= timeoutMs) throw stoppedAfter(timeoutMs);
      throw new ToolError("js_error", error?.message ?? String(error));
    } finally {
      clearTimeout(timer);
      await chrome.debugger.sendCommand(target, "Runtime.releaseObjectGroup", { objectGroup: GROUP }).catch(() => {});
      release();
    }
  });
}
