// system-fetch.cjs (D-04): a signal still stops the request after the response headers arrived.
//
// The relay forwarder aborts its upstream request when the core presses Stop, and Settings › Models bounds its
// requests with AbortSignal.timeout; both fire while the body streams, after "response". The request used to drop
// the abort listener at "response", so a late abort never reached request.abort(): a relay kept generating (and
// billing) a reply nobody read, and a timeout let a slow body run on. fetch's contract, which these callers rely on,
// is that the late abort closes the request and errors the body with the signal's reason.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
const require = createRequire(import.meta.url);
const { requestWith } = require("../electron/system-fetch.cjs");

// A net stand-in whose response body streams one chunk every `every` ms until `total` (Infinity: never ends) or until
// it is destroyed. request.abort() only records, as Electron's does for the request side.
function streamingNet({ every = 10, total = Infinity, status = 200 } = {}) {
  const calls = [];
  const net = {
    request(options) {
      const request = new EventEmitter();
      const record = { options, aborted: 0, pushed: 0, incoming: null };
      calls.push(record);
      request.setHeader = () => {};
      request.write = () => {};
      request.abort = () => { record.aborted += 1; };
      request.end = () => queueMicrotask(() => {
        let timer = null;
        const incoming = new Readable({
          read() {
            if (timer) return;
            timer = setTimeout(() => {
              timer = null;
              if (incoming.destroyed) return;
              if (record.pushed >= total) { incoming.push(null); return; }
              record.pushed += 1;
              incoming.push(Buffer.from(`data: ${record.pushed}\n\n`));
            }, every);
          },
          destroy(error, callback) { clearTimeout(timer); callback(error); },
        });
        incoming.statusCode = status;
        incoming.statusMessage = "OK";
        incoming.headers = { "content-type": "text/event-stream" };
        record.incoming = incoming;
        request.emit("response", incoming);
      });
      return request;
    },
  };
  return { net, calls };
}

// An AbortSignal whose listeners can be counted (EventTarget does not say how many it holds).
function countedSignal(signal) {
  const listeners = new Set();
  return {
    get aborted() { return signal.aborted; },
    get reason() { return signal.reason; },
    addEventListener(type, fn, options) { listeners.add(fn); signal.addEventListener(type, fn, options); },
    removeEventListener(type, fn) { listeners.delete(fn); signal.removeEventListener(type, fn); },
    get listeners() { return listeners.size; },
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("system-fetch: an abort after the response headers aborts the request and errors the body with AbortError", { timeout: 5000 }, async () => {
  const { net, calls } = streamingNet();
  const controller = new AbortController();
  const response = await requestWith(net, "https://relay.example.test/v1/messages", { method: "POST", body: "{}", signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.match(Buffer.from(first.value).toString(), /data: 1/);
  controller.abort();
  assert.equal(calls[0].aborted, 1, "the late abort reaches request.abort()");
  // Whatever was already buffered may still drain; the read after it fails instead of waiting on the upstream.
  let error = null;
  for (let i = 0; i < 5 && !error; i++) { try { const { done } = await reader.read(); if (done) break; } catch (caught) { error = caught; } }
  assert.equal(error?.name, "AbortError", "the body errors with the abort");
  const pushedAtAbort = calls[0].pushed;
  await sleep(60);
  assert.equal(calls[0].pushed, pushedAtAbort, "nothing more is read from the upstream");
  assert.equal(calls[0].incoming.destroyed, true);
});

test("system-fetch: AbortSignal.timeout still applies while the body streams (Settings › Models' listing and Test)", { timeout: 5000 }, async () => {
  const { net, calls } = streamingNet({ every: 15 });
  const started = Date.now();
  const response = await requestWith(net, "https://relay.example.test/v1/models", { signal: AbortSignal.timeout(80) });
  assert.ok(Date.now() - started < 80, "the headers arrive before the timeout");
  await assert.rejects(response.text(), (error) => error.name === "TimeoutError", "text() rejects with the timeout's reason");
  assert.ok(Date.now() - started < 1000, "the timeout ends the body instead of letting it run on");
  assert.equal(calls[0].aborted, 1);
  // A json() caller sees the same rejection (model-settings.cjs catches it and lists nothing).
  const again = await requestWith(streamingNet({ every: 15 }).net, "https://relay.example.test/v1/models", { signal: AbortSignal.timeout(50) });
  assert.equal(await again.json().catch(() => null), null);
});

test("system-fetch: the abort listener is released once the body ends, so a later abort does nothing", { timeout: 5000 }, async () => {
  const { net, calls } = streamingNet({ every: 2, total: 3 });
  const controller = new AbortController();
  const signal = countedSignal(controller.signal);
  const response = await requestWith(net, "https://example.test/short", { signal });
  assert.equal(signal.listeners, 1, "held while the body streams");
  assert.equal(await response.text(), "data: 1\n\ndata: 2\n\ndata: 3\n\n");
  await sleep(10);
  assert.equal(signal.listeners, 0, "released at the end of the body");
  controller.abort();
  assert.equal(calls[0].aborted, 0, "a finished request is not aborted");
});

test("system-fetch: a response without a body releases the abort listener at once", { timeout: 5000 }, async () => {
  const { net, calls } = streamingNet({ status: 204 });
  const controller = new AbortController();
  const signal = countedSignal(controller.signal);
  const response = await requestWith(net, "https://example.test/empty", { signal });
  assert.equal(response.status, 204);
  assert.equal(response.body, null);
  assert.equal(signal.listeners, 0);
  controller.abort();
  assert.equal(calls[0].aborted, 0);
});

test("system-fetch: a body the caller cancels stops reading, and the listener is released", { timeout: 5000 }, async () => {
  const { net, calls } = streamingNet();
  const controller = new AbortController();
  const signal = countedSignal(controller.signal);
  const response = await requestWith(net, "https://example.test/cancel", { signal });
  const reader = response.body.getReader();
  await reader.read();
  await reader.cancel();
  await sleep(30);
  assert.equal(calls[0].incoming.destroyed, true, "cancelling the web stream destroys the incoming message");
  assert.equal(signal.listeners, 0);
});
