// system-fetch.cjs: the main process's requests go over Chromium's network stack, so the system proxy applies.
//
// These cases drive requestWith with a stand-in net, so no real network is used: the contract checked is the one
// fetch's callers rely on (a Response-shaped answer, a POST body written, redirect: "manual" as one hop, a signal
// aborting the request, application headers preserved and reserved headers omitted).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
const require = createRequire(import.meta.url);
const { systemFetch, requestWith } = require("../electron/system-fetch.cjs");

// A net stand-in: records what was asked, then answers as Electron's ClientRequest does.
function fakeNet(answer) {
  const calls = [];
  const net = {
    request(options) {
      const request = new EventEmitter();
      const record = { options, headers: {}, written: [], ended: false, aborted: false };
      calls.push(record);
      request.setHeader = (key, value) => { record.headers[key] = value; };
      request.write = (chunk) => { record.written.push(String(chunk)); };
      request.abort = () => { record.aborted = true; request.emit("error", Object.assign(new Error("aborted"), { name: "AbortError" })); };
      request.end = () => {
        record.ended = true;
        // Answered on the next tick, as a real request is.
        queueMicrotask(() => answer(record, request));
      };
      return request;
    },
  };
  return { net, calls };
}

const respond = (statusCode, body, headers = {}) => (_record, request) => {
  const incoming = Readable.from(body === null ? [] : [Buffer.from(body)]);
  incoming.statusCode = statusCode;
  incoming.statusMessage = statusCode === 204 ? "No Content" : "OK";
  incoming.headers = headers;
  request.emit("response", incoming);
};

test("system-fetch: a request follows Chromium's stack, answers a Response, and never touches the global fetch", async (t) => {
  const { net, calls } = fakeNet(respond(200, "hello"));
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("the global fetch must not be used when Electron's net is there"); };
  t.after(() => { globalThis.fetch = realFetch; });
  // requestWith takes the net directly, which is what systemFetch hands it inside Electron.
  const response = await requestWith(net, "https://example.test/x", { headers: { accept: "text/plain" } });
  assert.equal(response.status, 200);
  assert.equal(response.ok, true);
  assert.equal(await response.text(), "hello");
  assert.equal(calls[0].options.url, "https://example.test/x");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].headers.accept, "text/plain");
  assert.equal(calls[0].ended, true);
  // No cookies and no cache: the same isolation the app's own WebFetch has.
  assert.equal(calls[0].options.useSessionCookies, false);
  assert.equal(calls[0].options.credentials, "omit");
});

test("system-fetch: a POST body is written before end, and a JSON body round-trips", async (t) => {
  const { net, calls } = fakeNet((record, request) => {
    assert.deepEqual(record.written, ['{"a":1}']);
    assert.equal(record.ended, true);
    respond(200, JSON.stringify({ a: 1 })) (record, request);
  });
  const response = await requestWith(net, "https://example.test/post", { method: "POST", headers: { "content-type": "application/json" }, body: '{"a":1}' });
  assert.deepEqual(await response.json(), { a: 1 });
  assert.equal(calls[0].options.method, "POST");
});

test("system-fetch: a relayed Node fetch omits Chromium-reserved headers but preserves auth and body", async () => {
  const { net, calls } = fakeNet((record, request) => {
    // Chromium rejects these asynchronously, so catching setHeader errors cannot
    // protect the request. Assert the request succeeds at the transport boundary.
    assert.deepEqual(record.headers, {
      "x-api-key": "synthetic-key", Authorization: "Bearer synthetic-key",
      "anthropic-version": "2023-06-01", "content-type": "application/json",
      "accept-encoding": "gzip, deflate", "x-extra": ["one", "two"],
    });
    assert.deepEqual(record.written, ['{"stream":true}']);
    respond(200, "data: ok\n\n", { "content-type": "text/event-stream" })(record, request);
  });
  const response = await requestWith(net, "https://example.test/v1/messages", {
    method: "POST", body: '{"stream":true}', headers: {
      "x-api-key": "synthetic-key", Authorization: "Bearer synthetic-key",
      "anthropic-version": "2023-06-01", "content-type": "application/json",
      "accept-encoding": "gzip, deflate", "x-extra": ["one", "two"],
      "sec-fetch-mode": "cors", "Sec-Fetch-Site": "same-origin",
      "Proxy-Authorization": "Basic synthetic", "proxy-connection": "keep-alive",
      Host: "localhost", "Content-Length": "15", Connection: "keep-alive",
      "Keep-Alive": "timeout=5", "Transfer-Encoding": "chunked",
      TE: "trailers", Trailer: "checksum", Upgrade: "websocket", Cookie2: "ignored",
    },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "data: ok\n\n");
  assert.equal(calls[0].ended, true);
});

test("system-fetch: redirect manual answers the 3xx itself, carrying its Location", async (t) => {
  const { net } = fakeNet((_record, request) => request.emit("redirect", 302, "GET", "https://example.test/next"));
  const response = await requestWith(net, "https://example.test/start", { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://example.test/next");
  assert.equal(response.body, null);
});

test("system-fetch: a 204 has no body, as fetch's does", async () => {
  const { net } = fakeNet(respond(204, null));
  const response = await requestWith(net, "https://example.test/empty");
  assert.equal(response.status, 204);
  assert.equal(response.body, null);
  assert.equal(await response.text(), "");
});

test("system-fetch: a signal aborts the request and rejects with AbortError", async () => {
  const { net, calls } = fakeNet(() => { /* never answers: the abort does */ });
  const controller = new AbortController();
  const pending = requestWith(net, "https://example.test/slow", { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, (error) => error.name === "AbortError");
  assert.equal(calls[0].aborted, true);
});

test("system-fetch: an already-aborted signal never opens the request", async () => {
  const { net, calls } = fakeNet(respond(200, "late"));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestWith(net, "https://example.test/now", { signal: controller.signal }), (error) => error.name === "AbortError");
  assert.equal(calls[0].aborted, true);
});

test("system-fetch: a network error rejects the promise with that error", async () => {
  const { net } = fakeNet((_record, request) => request.emit("error", new Error("ERR_PROXY_CONNECTION_FAILED")));
  await assert.rejects(requestWith(net, "https://example.test/x"), /ERR_PROXY_CONNECTION_FAILED/);
});

test("system-fetch: outside Electron the global fetch answers, so a unit test still runs", async (t) => {
  const realFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, init) => { seen.push([url, init?.method]); return new Response("plain", { status: 200 }); };
  t.after(() => { globalThis.fetch = realFetch; });
  const response = await systemFetch("https://example.test/plain");
  assert.equal(await response.text(), "plain");
  assert.deepEqual(seen, [["https://example.test/plain", undefined]]);
});

test("system-fetch: the packaged main process wires the release download and the model listing to it", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = path.join(import.meta.dirname, "..", "electron");
  const core = fs.readFileSync(path.join(root, "core-manager.cjs"), "utf8");
  assert.match(core, /require\("\.\/system-fetch\.cjs"\)/, "core-manager requires system-fetch");
  assert.match(core, /fetchImpl = \(\.\.\.args\) => systemFetch\(\.\.\.args\)/, "a release download goes through it");
  const settings = fs.readFileSync(path.join(root, "model-settings.cjs"), "utf8");
  assert.doesNotMatch(settings, /await fetch\(/, "no bare fetch in model-settings");
  assert.match(settings, /systemFetch\(/, "the model listing goes through it");
  const relay = fs.readFileSync(path.join(root, "relay-proxy.cjs"), "utf8");
  assert.doesNotMatch(relay, /globalThis\.fetch/, "the relay forwarder does not fall back to the global fetch");
});
