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
// One forwarder per relay origin, each on its own port and never re-aimed: a
// core reads DEEPSEEK_BASE_URL when it spawns, so the core already running when
// Settings › Models saves another relay (or the official API) keeps talking to
// the relay it started with until it is restarted ("Restart the core to
// apply"), instead of sending its old key to the new relay or losing its
// connection mid-session. Saving never waits on a stream in flight. The
// forwarders a newer save left behind stay up (at most MAX_FORWARDERS, oldest
// closed first) until the app quits.
const http = require("node:http");
// The relay is usually a remote host: its requests follow the system proxy (system-fetch.cjs).
const { systemFetch } = require("./system-fetch.cjs");

const HOP_BY_HOP = new Set(["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade", "proxy-connection", "te", "trailer"]);
const RESPONSE_SKIP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);
const MAX_FORWARDERS = 4;

/** Rename the reminder tag in a request body (plain text, so JSON escaping is untouched). */
function rewriteBody(text) {
  return text.replace(/<(\/?)system-reminder>/g, "<$1system_reminder>");
}

function createRelayProxy({ fetchImpl = (...args) => systemFetch(...args) } = {}) {
  // origin → {server, port, origin}, oldest first; `current` is the one the next core spawn gets.
  const forwarders = new Map();
  let current = null;

  async function handle(target, req, res) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = chunks.length ? Buffer.concat(chunks) : null;
    if (body && /json/i.test(req.headers["content-type"] || "")) body = Buffer.from(rewriteBody(body.toString("utf8")));
    const headers = Object.fromEntries(Object.entries(req.headers).filter(([key]) => !HOP_BY_HOP.has(key.toLowerCase())));
    const controller = new AbortController();
    res.on("close", () => { if (!res.writableFinished) controller.abort(); });
    let upstream;
    try {
      upstream = await fetchImpl(`${target}${req.url}`, { method: req.method, headers, body: body ?? undefined, signal: controller.signal, redirect: "manual" });
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

  const close = (forwarder, { force = false } = {}) => new Promise(resolve => {
    forwarder.server.close(() => resolve());
    if (force) forwarder.server.closeAllConnections?.(); else forwarder.server.closeIdleConnections?.();
  });

  /** Forward to `relayBaseURL`; resolves with the loopback base URL for the core. */
  async function start(relayBaseURL) {
    const target = new URL(relayBaseURL);
    let forwarder = forwarders.get(target.origin);
    if (!forwarder) {
      const origin = target.origin;
      const server = http.createServer((req, res) => { handle(origin, req, res).catch(() => { try { res.destroy(); } catch {} }); });
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => { server.off("error", reject); resolve(); }); });
      server.unref();
      forwarder = { server, port: server.address().port, origin };
      forwarders.set(origin, forwarder);
      for (const [key, old] of forwarders) {
        if (forwarders.size <= MAX_FORWARDERS) break;
        if (old === forwarder) continue;
        forwarders.delete(key);
        void close(old);
      }
    }
    current = forwarder;
    return `http://127.0.0.1:${forwarder.port}${target.pathname.replace(/\/+$/, "")}`;
  }

  /** The next core spawn goes straight to its endpoint; a running core keeps the forwarder it started with. */
  async function stop() {
    current = null;
  }

  /** App quit: every forwarder closes, connections in flight too. */
  async function dispose() {
    current = null;
    const all = [...forwarders.values()];
    forwarders.clear();
    await Promise.all(all.map(forwarder => close(forwarder, { force: true })));
  }

  return { start, stop, dispose, get running() { return !!current; } };
}

module.exports = { createRelayProxy, rewriteBody };
