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
const http = require("node:http");

const HOP_BY_HOP = new Set(["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade", "proxy-connection", "te", "trailer"]);
const RESPONSE_SKIP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

/** Rename the reminder tag in a request body (plain text, so JSON escaping is untouched). */
function rewriteBody(text) {
  return text.replace(/<(\/?)system-reminder>/g, "<$1system_reminder>");
}

function createRelayProxy({ fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  let server = null, target = null, port = 0;

  async function handle(req, res) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = chunks.length ? Buffer.concat(chunks) : null;
    if (body && /json/i.test(req.headers["content-type"] || "")) body = Buffer.from(rewriteBody(body.toString("utf8")));
    const headers = Object.fromEntries(Object.entries(req.headers).filter(([key]) => !HOP_BY_HOP.has(key.toLowerCase())));
    const controller = new AbortController();
    res.on("close", () => { if (!res.writableFinished) controller.abort(); });
    let upstream;
    try {
      upstream = await fetchImpl(`${target.origin}${req.url}`, { method: req.method, headers, body: body ?? undefined, signal: controller.signal, redirect: "manual" });
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

  /** Forward to `relayBaseURL`; resolves with the loopback base URL for the core. */
  async function start(relayBaseURL) {
    target = new URL(relayBaseURL);
    if (!server) {
      server = http.createServer((req, res) => { handle(req, res).catch(() => { try { res.destroy(); } catch {} }); });
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => { server.off("error", reject); resolve(); }); });
      server.unref();
      port = server.address().port;
    }
    return `http://127.0.0.1:${port}${target.pathname.replace(/\/+$/, "")}`;
  }

  async function stop() {
    const current = server;
    server = null; target = null; port = 0;
    // No new connections from here on; a reply still streaming (a running turn) finishes on its own. Waiting for it
    // would hold a Settings › Models save until the turn ends.
    if (current) { current.close(); current.closeIdleConnections?.(); }
  }

  return { start, stop, get running() { return !!server; } };
}

module.exports = { createRelayProxy, rewriteBody };
