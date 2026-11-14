import test from "node:test";
import assert from "node:assert/strict";
import { createStreamHighlightClient } from "../src/highlight-stream-client.mjs";

class FakeWorker {
  listeners = new Map(); messages = []; terminated = false;
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
  postMessage(message) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  pushes() { return this.messages.filter((m) => m.kind === "push"); }
  reply(overrides = {}) { const last = this.pushes().at(-1); this.listeners.get("message")?.({ data: { kind: "batch", streamId: last.streamId, seq: last.seq, recall: 0, tokens: [], ...overrides } }); }
  error() { this.listeners.get("error")?.({}); }
}
function timers() {
  const queue = [];
  let id = 0, now = 0;
  return {
    schedule: (fn, ms) => { const entry = { id: ++id, at: now + ms, fn }; queue.push(entry); return entry.id; },
    cancel: (handle) => { const index = queue.findIndex((entry) => entry.id === handle); if (index !== -1) queue.splice(index, 1); },
    advance(ms) { now += ms; for (const entry of [...queue].sort((a, b) => a.at - b.at)) if (entry.at <= now) { queue.splice(queue.indexOf(entry), 1); entry.fn(); } },
    pending: () => queue.length,
  };
}
function harness(options = {}) {
  const workers = [], clock = timers();
  const client = createStreamHighlightClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker; },
    schedule: clock.schedule, cancelTimer: clock.cancel, isHidden: () => false, ...options });
  return { client, workers, clock };
}
const open = (client, events, language = "javascript") => client.open({ language, onBatch: (batch) => events.push({ batch }), onEnd: (reason) => events.push({ end: reason }) });

test("one chunk in flight per stream; large pushes split at newlines; caughtUp only when nothing remains", () => {
  const { client, workers } = harness();
  const events = [];
  const stream = open(client, events);
  assert.equal(workers.length, 1); assert.deepEqual(workers[0].messages[0], { kind: "open", streamId: 1, language: "javascript" });
  const line = "a".repeat(9_000) + "\n";
  stream.push(line + line + line + "tail");
  assert.equal(workers[0].pushes().length, 1); assert.equal(workers[0].pushes()[0].text, line);
  stream.push("more"); // Buffered behind the in-flight chunk.
  assert.equal(workers[0].pushes().length, 1);
  workers[0].reply();
  assert.equal(events.length, 1); assert.equal(events[0].batch.caughtUp, false); assert.equal(events[0].batch.covered, line.length);
  assert.equal(workers[0].pushes().length, 2); assert.equal(workers[0].pushes()[1].text, line);
  workers[0].reply();
  assert.equal(workers[0].pushes().length, 3); assert.equal(workers[0].pushes().at(-1).text, line + "tailmore", "the remainder fits one chunk");
  assert.equal(events.at(-1).batch.caughtUp, false);
  workers[0].reply();
  assert.equal(events.at(-1).batch.caughtUp, true); assert.equal(events.at(-1).batch.covered, line.length * 3 + 8);
  assert.equal(client.inspect().inFlight, 0);
  client.dispose();
});

test("stale or mismatched replies are ignored; worker errors end the stream", () => {
  const { client, workers } = harness();
  const events = [];
  const stream = open(client, events);
  stream.push("x");
  workers[0].listeners.get("message")({ data: { kind: "batch", streamId: 1, seq: 99, recall: 0, tokens: [] } });
  workers[0].listeners.get("message")({ data: { kind: "batch", streamId: 7, seq: 1, recall: 0, tokens: [] } });
  workers[0].listeners.get("message")({ data: "garbage" });
  assert.equal(events.length, 0);
  workers[0].listeners.get("message")({ data: { kind: "error", streamId: 1, seq: 1, reason: "unknown-language" } });
  assert.deepEqual(events, [{ end: "worker:unknown-language" }]);
  assert.equal(stream.closed, true); assert.equal(client.inspect().streams, 0);
  assert.equal(workers[0].terminated, false, "a per-stream error keeps the worker for other streams");
  client.dispose();
});

test("reply deadline while visible terminates the worker and fails every open stream; the next open gets a fresh worker", () => {
  const { client, workers, clock } = harness();
  const a = [], b = [];
  const first = open(client, a); const second = open(client, b);
  first.push("one"); second.push("two");
  clock.advance(3_999);
  assert.equal(a.length, 0);
  clock.advance(1);
  assert.deepEqual(a, [{ end: "reply-timeout" }]); assert.deepEqual(b, [{ end: "reply-timeout" }]);
  assert.equal(workers[0].terminated, true); assert.equal(client.inspect().worker, false);
  const c = [];
  const third = open(client, c);
  assert.ok(third); assert.equal(workers.length, 2); assert.equal(workers[1].terminated, false);
  client.dispose();
  assert.deepEqual(c, [{ end: "disposed" }]); assert.equal(workers[1].terminated, true);
});

test("a hidden document defers the deadline and re-arms it instead of failing", () => {
  let hidden = true;
  const { client, workers, clock } = harness({ isHidden: () => hidden });
  const events = [];
  open(client, events).push("x");
  clock.advance(4_000); clock.advance(4_000);
  assert.equal(events.length, 0); assert.equal(workers[0].terminated, false);
  hidden = false;
  clock.advance(4_000);
  assert.deepEqual(events, [{ end: "reply-timeout" }]);
  client.dispose();
});

test("uncaught worker error fails all streams; maxStreams refuses extras; closeWhenIdle closes after the buffer drains", () => {
  const { client, workers } = harness({ limits: { chunkUnits: 16_384, replyDeadlineMs: 4_000, maxStreams: 2, idleMs: 30_000 } });
  const a = [], b = [], c = [];
  const first = open(client, a); const second = open(client, b);
  assert.equal(open(client, c), null, "more than maxStreams concurrent streams stay plain");
  first.push("x"); first.closeWhenIdle();
  assert.equal(first.closed, false, "not idle while a chunk is in flight");
  workers[0].reply();
  assert.equal(first.closed, true); assert.equal(a.length, 1);
  assert.ok(workers[0].messages.some((m) => m.kind === "close" && m.streamId === 1));
  const third = open(client, c); assert.ok(third, "a closed slot is reusable");
  workers[0].error();
  assert.deepEqual(b, [{ end: "worker-error" }]); assert.deepEqual(c, [{ end: "worker-error" }]);
  assert.equal(workers[0].terminated, true); assert.equal(second.closed, true);
  client.dispose();
});

test("idle worker is released after the idle period and recreated on demand", () => {
  const { client, workers, clock } = harness();
  const stream = open(client, []);
  stream.close();
  assert.equal(client.inspect().worker, true);
  clock.advance(30_000);
  assert.equal(client.inspect().worker, false); assert.equal(workers[0].terminated, true);
  open(client, []); assert.equal(workers.length, 2);
  client.dispose();
});
