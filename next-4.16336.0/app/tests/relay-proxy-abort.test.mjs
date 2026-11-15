// relay-proxy.cjs (D-04): when the core stops (Stop closes its connection to the forwarder), the forwarder stops the
// upstream at once, instead of reading the relay's reply to its end while the relay keeps generating and billing.
//
// Two layers: the abort reaches the upstream request (system-fetch keeps its signal after the headers), and the
// forwarder itself stops reading the moment the core is gone, even with a fetch that ignores a late abort.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
const require = createRequire(import.meta.url);
const { createRelayProxy } = require("../electron/relay-proxy.cjs");
const { requestWith } = require("../electron/system-fetch.cjs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check, ms = 2000) => { const end = Date.now() + ms; while (Date.now() < end && !check()) await sleep(10); return check(); };

// A slow SSE relay: one chunk every `every` ms, up to `total`, then a normal end. Records when its connection closed.
async function slowRelay({ every = 40, total = 100 } = {}) {
  const log = [];
  const server = http.createServer((req, res) => {
    req.resume();
    const record = { chunks: 0, closedAt: null, endedNormally: false };
    log.push(record);
    res.writeHead(200, { "content-type": "text/event-stream" });
    const timer = setInterval(() => {
      if (record.chunks >= total) { clearInterval(timer); record.endedNormally = true; res.end("data: [DONE]\n\n"); return; }
      res.write(`data: ${++record.chunks}\n\n`);
    }, every);
    res.on("close", () => { clearInterval(timer); record.closedAt ??= Date.now(); });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, log, url: `http://127.0.0.1:${server.address().port}` };
}

// The core's side: stream from the forwarder, read a few chunks, then abort (what Stop does to the core's fetch).
async function coreReadsThenStops(url, chunks = 3) {
  const controller = new AbortController();
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: controller.signal });
  const reader = response.body.getReader();
  let text = "";
  while ((text.match(/data: \d+/g) ?? []).length < chunks) { const { value, done } = await reader.read(); if (done) break; text += Buffer.from(value).toString(); }
  controller.abort();
  return Date.now();
}

test("relay forwarder: Stop on the core closes the upstream relay at once (global fetch, signal honoured)", { timeout: 10000 }, async (t) => {
  const relay = await slowRelay();
  const proxy = createRelayProxy({ fetchImpl: (...args) => globalThis.fetch(...args) });
  t.after(async () => { await proxy.dispose(); relay.server.closeAllConnections?.(); relay.server.close(); });
  const base = await proxy.start(`${relay.url}/v1`);
  const stoppedAt = await coreReadsThenStops(`${base}/messages`);
  const chunksAtStop = relay.log[0].chunks;
  assert.ok(await until(() => relay.log[0].closedAt != null, 1000), "the relay connection closes within a second");
  assert.ok(relay.log[0].closedAt - stoppedAt < 500, `closed ${relay.log[0].closedAt - stoppedAt}ms after Stop`);
  assert.ok(relay.log[0].chunks - chunksAtStop <= 1, "at most the chunk in flight is generated after Stop");
  assert.equal(relay.log[0].endedNormally, false);
});

test("relay forwarder: it stops reading the relay even when the fetch in use ignores the abort", { timeout: 10000 }, async (t) => {
  const relay = await slowRelay();
  // A fetch that drops the signal: only the forwarder's own cancel can stop it.
  const proxy = createRelayProxy({ fetchImpl: (url, { signal, ...rest }) => globalThis.fetch(url, rest) });
  t.after(async () => { await proxy.dispose(); relay.server.closeAllConnections?.(); relay.server.close(); });
  const base = await proxy.start(`${relay.url}/v1`);
  const stoppedAt = await coreReadsThenStops(`${base}/messages`);
  assert.ok(await until(() => relay.log[0].closedAt != null, 1000), "cancelling the body closes the relay connection");
  assert.ok(relay.log[0].closedAt - stoppedAt < 500);
  assert.equal(relay.log[0].endedNormally, false);
});

test("relay forwarder: with a silent upstream the copy loop ends when the core goes, without waiting for another chunk", { timeout: 10000 }, async (t) => {
  // An upstream that sends one chunk and then nothing, through a fetch that ignores the abort: the forwarder's
  // pending read must end on the core's close, or the handler (and the upstream connection) would hang on.
  let cancelled = 0, pulls = 0;
  const fetchImpl = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode("data: 1\n\n")); },
    pull() { pulls += 1; return new Promise(() => {}); },
    cancel() { cancelled += 1; },
  }), { status: 200, headers: { "content-type": "text/event-stream" } });
  const proxy = createRelayProxy({ fetchImpl });
  t.after(() => proxy.dispose());
  const base = await proxy.start("http://relay.example.test/v1");
  await coreReadsThenStops(`${base}/messages`, 1);
  assert.ok(await until(() => cancelled === 1, 1000), "the upstream body is cancelled when the core goes");
});

test("relay forwarder: the default system-fetch path aborts the upstream request after its headers", { timeout: 10000 }, async (t) => {
  // requestWith over a stand-in net (what systemFetch hands it inside Electron), streaming until destroyed.
  const records = [];
  const net = {
    request(options) {
      const request = new EventEmitter();
      const record = { options, aborted: 0, pushed: 0 };
      records.push(record);
      request.setHeader = () => {};
      request.write = () => {};
      request.abort = () => { record.aborted += 1; };
      request.end = () => queueMicrotask(() => {
        let timer = null;
        const incoming = new Readable({
          read() { if (!timer) timer = setTimeout(() => { timer = null; if (!incoming.destroyed) incoming.push(`data: ${++record.pushed}\n\n`); }, 20); },
          destroy(error, callback) { clearTimeout(timer); callback(error); },
        });
        Object.assign(incoming, { statusCode: 200, statusMessage: "OK", headers: { "content-type": "text/event-stream" } });
        record.incoming = incoming;
        request.emit("response", incoming);
      });
      return request;
    },
  };
  const proxy = createRelayProxy({ fetchImpl: (url, options) => requestWith(net, url, options) });
  t.after(() => proxy.dispose());
  const base = await proxy.start("http://relay.example.test/v1");
  await coreReadsThenStops(`${base}/messages`);
  assert.ok(await until(() => records[0].aborted > 0, 1000), "Stop reaches request.abort() after the response");
  assert.equal(records[0].incoming.destroyed, true);
  const pushed = records[0].pushed;
  await sleep(100);
  assert.equal(records[0].pushed, pushed, "nothing more is read from the relay");
});

test("relay forwarder: a reply the core reads to its end still passes through whole", { timeout: 10000 }, async (t) => {
  const relay = await slowRelay({ every: 5, total: 6 });
  const proxy = createRelayProxy({ fetchImpl: (...args) => globalThis.fetch(...args) });
  t.after(async () => { await proxy.dispose(); relay.server.close(); });
  const base = await proxy.start(`${relay.url}/v1`);
  const text = await (await fetch(`${base}/messages`, { method: "POST", body: "{}" })).text();
  assert.equal(text, "data: 1\n\ndata: 2\n\ndata: 3\n\ndata: 4\n\ndata: 5\n\ndata: 6\n\ndata: [DONE]\n\n");
  assert.equal(relay.log[0].endedNormally, true);
});
