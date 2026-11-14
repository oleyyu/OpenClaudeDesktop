// Main-process HTTP requests over Chromium's network stack, so they follow the system proxy.
//
// Node's global fetch (undici) reads no proxy configuration by itself: behind a system proxy (Clash, Surge, a PAC
// file) every request it makes goes direct and hangs until it times out — the Cores download that pulls a release
// from github.com, Settings › Models' model listing and Test button, the relay forwarder. Chromium's net stack
// resolves the system proxy, the PAC file and the login keychain's certificates for free, so a request made with
// net.request reaches the hosts the app's own windows reach.
//
// The answer has fetch's shape: { ok, status, statusText, headers, body, text(), json() }, body a web stream that
// iterates as fetch's does. Where there is no Electron net (a unit test under plain node) the global fetch answers.
const { Readable } = require("node:stream");

const NO_BODY_STATUS = new Set([101, 204, 205, 304]);
// Chromium owns transport and fetch-metadata headers. In particular, undici adds
// sec-fetch-mode to requests reaching the loopback relay. setHeader accepts it,
// but Chromium later rejects the entire request with net::ERR_INVALID_ARGUMENT.
const RESERVED_REQUEST_HEADERS = new Set([
  "connection", "content-length", "cookie2", "host", "keep-alive",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

function electronNet() {
  try {
    const { net } = require("electron");
    return net && typeof net.request === "function" ? net : null;
  } catch { return null; }
}

/** statusText reaches Response, which refuses anything that is not a reason phrase. */
const reasonPhrase = (value) => String(value ?? "").replace(/[^\t\x20-\x7e]/g, "").trim().slice(0, 200);

function responseOf(body, status, statusText, headers) {
  const head = new Headers();
  for (const [key, value] of Object.entries(headers ?? {})) {
    try { head.set(key, Array.isArray(value) ? value.join(", ") : String(value)); } catch { /* a header Response refuses */ }
  }
  // Response takes 200–599 only; a 101 upgrade (never one here) would be refused.
  const safe = status >= 200 && status <= 599 ? status : 200;
  return new Response(body, { status: safe, statusText: reasonPhrase(statusText), headers: head });
}

function requestWith(net, url, { method = "GET", headers = {}, body = null, signal, redirect = "follow" } = {}) {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = net.request({ url: String(url), method, redirect: redirect === "manual" ? "manual" : "follow",
        credentials: "omit", useSessionCookies: false, cache: "no-store" });
    } catch (error) { reject(error); return; }
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener?.("abort", onAbort);
      fn(value);
    };
    const onAbort = () => {
      try { request.abort(); } catch { /* gone */ }
      const reason = signal?.reason;
      finish(reject, reason instanceof Error ? reason : Object.assign(new Error("The request was stopped."), { name: "AbortError" }));
    };
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener?.("abort", onAbort, { once: true });
    for (const [key, value] of Object.entries(headers ?? {})) {
      if (value === undefined || value === null) continue;
      const name = key.toLowerCase();
      if (RESERVED_REQUEST_HEADERS.has(name) || name.startsWith("sec-") || name.startsWith("proxy-")) continue;
      try { request.setHeader(key, Array.isArray(value) ? value.map(String) : String(value)); } catch { /* skipped */ }
    }
    // Manual mode is one hop per call: the 3xx answers as a Response carrying its Location, as net.fetch does.
    request.on("redirect", (status, _method, location) => finish(resolve, responseOf(null, status, "", { location })));
    request.on("response", (incoming) => {
      const stream = NO_BODY_STATUS.has(incoming.statusCode) ? null : Readable.toWeb(incoming);
      finish(resolve, responseOf(stream, incoming.statusCode, incoming.statusMessage, incoming.headers));
    });
    request.on("error", (error) => finish(reject, error));
    if (body !== null && body !== undefined) request.write(body);
    request.end();
  });
}

/**
 * fetch, over Chromium's network stack: the system proxy, the PAC file and the keychain's certificates apply.
 * `redirect: "manual"` answers a 3xx as a Response carrying its Location. A body may be a string, a Buffer or a
 * typed array (a stream is not taken); a signal aborts the request.
 */
function systemFetch(url, options = {}) {
  const net = electronNet();
  if (!net) return globalThis.fetch(url, options);
  return requestWith(net, url, options);
}

module.exports = { systemFetch, requestWith };
