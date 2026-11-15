// Loopback forwarder for third-party relays (Settings › Models › API connection).
//
// Some relays treat any user message containing a `<system-reminder>` block as
// Claude Code metadata and replace the whole message, so the user's own text
// never reaches the model. The Harness puts its skill catalog and runtime
// reminders in exactly such blocks. In relay mode the core's DEEPSEEK_BASE_URL
// points here instead: request bodies get the tag renamed to
// `<system_reminder>` (same meaning to the model, invisible to the relay's
// rewrite) and everything else, the response stream included, passes through.
// The server listens on 127.0.0.1 only, on a free port, and keeps the relay's
// base path so the adapter's /v1 handling stays the same.
//
// Each relay gets a route of its own, `/<token><relay path>`, fixed to that
// relay for good (integration D9): a core keeps forwarding to the relay it was
// started with, together with the key it was started with, until it restarts.
// A Settings › Models save only hands the next spawn a new route; switching to
// another relay or back to the official API neither redirects nor cuts off a
// running core, and a save never waits for a reply that is still streaming.
// The server closes only when the app quits (stop).
const http = require("node:http");
const crypto = require("node:crypto");

const HOP_BY_HOP = new Set(["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade", "proxy-connection", "te", "trailer"]);
const RESPONSE_SKIP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

/** Rename the reminder tag in a request body (plain text, so JSON escaping is untouched). */
function rewriteBody(text) {
  return text.replace(/<(\/?)system-reminder>/g, "<$1system_reminder>");
}

function createRelayProxy({ fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  let server = null, port = 0, listening = null;
  const routes = new Map(), tokens = new Map();

  async function handle(req, res) {
    const match = /^\/([0-9a-f]{32})(.*)$/s.exec(req.url || "");
    const target = match && routes.get(match[1]);
    if (!target) {
      req.resume();
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "OpenClaude Desktop has no relay at this address. Restart the core." } }));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = chunks.length ? Buffer.concat(chunks) : null;
    if (body && /json/i.test(req.headers["content-type"] || "")) body = Buffer.from(rewriteBody(body.toString("utf8")));
    const headers = Object.fromEntries(Object.entries(req.headers).filter(([key]) => !HOP_BY_HOP.has(key.toLowerCase())));
    const controller = new AbortController();
    res.on("close", () => { if (!res.writableFinished) controller.abort(); });
    let upstream;
    try {
      upstream = await fetchImpl(`${target.origin}${match[2] || "/"}`, { method: req.method, headers, body: body ?? undefined, signal: controller.signal, redirect: "manual" });
    } catch (error) {
      if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: `OpenClaude Desktop couldn’t reach the relay: ${error?.message || error}` } }));
      return;
    }
    res.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !RESPONSE_SKIP.has(key.toLowerCase()))));
    if (!upstream.body) { res.end(); return; }
    try {
      for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch { res.destroy(); }
  }

  /** A route forwarding to `relayBaseURL` for good; resolves with its loopback base URL for the core. Same relay, same route. */
  async function start(relayBaseURL) {
    const target = new URL(relayBaseURL);
    const pathname = target.pathname.replace(/\/+$/, "");
    const id = `${target.origin}${pathname}`;
    // One listener for every route; concurrent first calls share its start.
    if (!server) {
      const next = server = http.createServer((req, res) => { handle(req, res).catch(() => { try { res.destroy(); } catch {} }); });
      listening = new Promise((resolve, reject) => { next.once("error", reject); next.listen(0, "127.0.0.1", () => { next.off("error", reject); resolve(); }); });
      next.unref();
    }
    const current = server;
    try { await listening; } catch (error) { if (server === current) server = null; throw error; }
    if (server !== current) throw new Error("The relay forwarder stopped.");
    port = current.address().port;
    let token = tokens.get(id);
    if (!token) {
      token = crypto.randomBytes(16).toString("hex");
      tokens.set(id, token);
      routes.set(token, new URL(`${target.origin}${pathname}`));
    }
    return `http://127.0.0.1:${port}/${token}${pathname}`;
  }

  /** App quit: no new connections; a reply still streaming finishes on its own (never waited for). */
  async function stop() {
    const current = server;
    server = null; port = 0; routes.clear(); tokens.clear();
    if (current) { current.close(); current.closeIdleConnections?.(); }
  }

  return { start, stop, get running() { return !!server; } };
}

module.exports = { createRelayProxy, rewriteBody };
