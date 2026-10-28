// The main process's Chrome bridge: one connection to a native host (bridge-client.cjs), shared by every session,
// and each session's site permissions. agent-tools/browser.mjs calls it through ctx.chromeBridge (main.cjs).
//
// Sites: a call carries the hosts the user allowed for that session (allowedHosts). When the extension answers
// site_not_allowed for a host, the user is asked (approve → the session's "chrome-site" approval card); allowed, the
// call is sent again — for browser_batch, only the steps that hadn't run yet. A host the user declined is refused
// for the rest of the session without asking again.
"use strict";
const { ChromeBridgeClient } = require("./bridge-client.cjs");

const CALL_TIMEOUT_MS = 60_000;
const BATCH_TIMEOUT_MS = 180_000;
// How long the app waits for a call: never less than the extension may take for it, or a call still running would be
// reported as timed out. A step may wait for a page load (claude-ext/tabs.js, 20 s) plus a script's own timeout_ms
// (javascript_tool, up to 60 s); STEP_MARGIN_MS covers the load, the debugger and the round trip.
const STEP_MARGIN_MS = 30_000;
const scriptMs = (input) => Number.isInteger(input?.timeout_ms) ? Math.min(Math.max(input.timeout_ms, 0), 60_000) : 10_000;
function timeoutFor(name, args) {
  if (name === "javascript_tool") return Math.max(CALL_TIMEOUT_MS, scriptMs(args) + STEP_MARGIN_MS);
  if (name !== "browser_batch") return CALL_TIMEOUT_MS;
  const steps = Array.isArray(args?.actions) ? args.actions : [];
  return Math.max(BATCH_TIMEOUT_MS, steps.reduce((sum, step) => sum + STEP_MARGIN_MS + (step?.name === "javascript_tool" ? scriptMs(step.input) : 0), 0));
}
const MAX_ASKS_PER_CALL = 5;
const NOT_CONNECTED = "Chrome isn't connected to OpenClaude Desktop. The user needs Chrome open with the OpenClaude Desktop Bridge extension loaded (claude-ext/) and its native host registered (node app/electron/browser/install.cjs); claude-ext/README.md explains both. Tell the user; don't retry until they say it's set up.";

class ChromeToolError extends Error {
  constructor(code, message, data) { super(message); this.code = code; if (data) this.data = data; }
}
const unanswered = (host) => new ChromeToolError("site_unanswered", `The request to use ${host} in Chrome ended without an answer, so nothing was done there. Ask again only if the task still needs it.`, { host });
const declined = (host) => new ChromeToolError("site_declined", `The user didn't allow ${host} in Chrome for this session, so nothing was done there. Don't try that site again unless the user asks.`, { host });

/**
 * @param {object} [options]
 * @param {(options: {log}) => Promise<ChromeBridgeClient>} [options.connect]  (tests pass a fake)
 * @param {(line: string) => void} [options.log]
 */
function createChromeBridgeService({ connect = (options) => ChromeBridgeClient.connect(options), log = () => {} } = {}) {
  let client = null;
  let connecting = null;
  const sessions = new Map(); // session id → { allowed: Set<host>, declined: Set<host>, asking: Map<host, Promise> }

  function ensureClient() {
    if (client && !client.closed) return Promise.resolve(client);
    connecting ??= Promise.resolve()
      .then(() => connect({ log }))
      .then((opened) => {
        client = opened;
        opened.on?.("close", () => { if (client === opened) client = null; });
        return opened;
      }, (error) => { throw new ChromeToolError("not_connected", NOT_CONNECTED, error?.message ? { reason: error.message } : undefined); })
      .finally(() => { connecting = null; });
    return connecting;
  }

  function sitesOf(sessionId) {
    const key = String(sessionId ?? "");
    let entry = sessions.get(key);
    if (!entry) { entry = { allowed: new Set(), declined: new Set(), asking: new Map() }; sessions.set(key, entry); }
    return entry;
  }

  /** Runs one extension tool for a session. approve({host, url}) → true when the user allows the site, false when they
   * decline it, null when the card ended without an answer. */
  async function call(sessionId, name, args = {}, { approve = null, signal = null } = {}) {
    const sites = sitesOf(sessionId);
    let asks = 0;
    const allow = async ({ host, url }) => {
      for (;;) {
        if (sites.allowed.has(host)) return true;
        if (sites.declined.has(host)) return false;
        // Another call is already asking about this host (parallel calls): wait for that card instead of opening another.
        const pending = sites.asking.get(host);
        if (pending) {
          await pending;
          if (signal?.aborted) throw new ChromeToolError("stopped", "The turn was stopped.");
          continue;
        }
        if (++asks > MAX_ASKS_PER_CALL) throw new ChromeToolError("too_many_sites", "This call needed too many new sites; call again for the rest.");
        // approve → true (allowed), false (declined); anything else (the card ended unanswered, approve threw) isn't a
        // refusal, so the site isn't kept declined.
        const asked = (async () => { try { return typeof approve === "function" ? await approve({ host, url }) : false; } catch { return null; } })();
        sites.asking.set(host, asked);
        let ok;
        try { ok = await asked; } finally { sites.asking.delete(host); }
        if (signal?.aborted) throw new ChromeToolError("stopped", "The turn was stopped.");
        if (ok !== true && ok !== false) throw unanswered(host);
        if (ok) { sites.allowed.add(host); sites.declined.delete(host); } else sites.declined.add(host);
        return ok;
      }
    };
    const send = async (input) => {
      if (signal?.aborted) throw new ChromeToolError("stopped", "The turn was stopped.");
      const bridge = await ensureClient();
      // signal: Stop gives up on the call and tells the extension to stop it (a batch runs no further steps).
      return bridge.executeTool(name, input, { allowedHosts: [...sites.allowed], timeoutMs: timeoutFor(name, input), signal });
    };

    if (name !== "browser_batch") {
      for (;;) {
        try { return await send(args); }
        catch (error) {
          const host = error?.code === "site_not_allowed" ? error.data?.host : null;
          if (!host) throw error;
          if (!(await allow({ host, url: error.data.url ?? "" }))) throw declined(host);
        }
      }
    }

    // A batch that stops at a site the user hasn't allowed yet: ask, then run the steps from that one on.
    const actions = Array.isArray(args.actions) ? args.actions : [];
    const steps = [];
    let offset = 0;
    for (;;) {
      const result = await send({ ...args, actions: actions.slice(offset) });
      const failed = result?.failed;
      const ran = Array.isArray(result?.steps) ? result.steps : [];
      if (failed?.code === "site_not_allowed" && failed.host) {
        steps.push(...ran.slice(0, -1));
        offset += result.completed;
        if (await allow({ host: failed.host, url: failed.url ?? "" })) continue;
        const refusal = declined(failed.host);
        steps.push({ name: actions[offset]?.name ?? "", ok: false, error: { code: refusal.code, message: refusal.message, host: failed.host } });
        return { steps, completed: offset, failed: { step: offset + 1, code: refusal.code, message: refusal.message, host: failed.host } };
      }
      steps.push(...ran);
      return { ...result, steps, completed: offset + (result?.completed ?? 0), ...(failed ? { failed: { ...failed, step: offset + failed.step } } : {}) };
    }
  }

  /** Whether an extension is connected right now, and which. */
  async function status() {
    try {
      const bridge = await ensureClient();
      return await bridge.getStatus({ timeoutMs: 5000 });
    } catch (error) {
      return { connected: false, error: error?.message ?? String(error) };
    }
  }

  function forgetSession(sessionId) { sessions.delete(String(sessionId ?? "")); }
  function close() { client?.close?.(); client = null; }

  return { call, status, forgetSession, close, allowedSites: (sessionId) => [...sitesOf(sessionId).allowed] };
}

module.exports = { createChromeBridgeService, ChromeToolError, NOT_CONNECTED };
