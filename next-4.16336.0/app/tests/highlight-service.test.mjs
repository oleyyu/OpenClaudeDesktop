import test from "node:test";
import assert from "node:assert/strict";
import { createHighlightService } from "../src/highlight-service.mjs";
import { createHighlightBinding } from "../src/highlight-binding.mjs";

const input = (text = "const x=1;") => ({ language: "js", text, isFrontier: false, languageSettled: true });
const result = (text) => ({ status: "highlighted", language: "javascript", tokens: [{ text, light: { color: "#1a1a1a", fontStyle: 0 }, dark: { color: "#eaecf0", fontStyle: 0 } }] });
class FakeWorker {
  listeners = new Map(); messages = []; terminated = false;
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
  postMessage(message) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  reply(value = result(this.messages.at(-1).input.text)) { this.listeners.get("message")?.({ data: { id: this.messages.at(-1).id, ...value } }); }
  fail() { this.listeners.get("error")?.({}); }
}
function harness(options = {}) {
  const workers = [];
  const service = createHighlightService({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker; }, ...options });
  return { service, workers };
}
test("streaming/unknown/overlimit do not construct a worker", async () => {
  const { service, workers } = harness();
  assert.equal((await service.request({ ...input(), isFrontier: true })).reason, "streaming");
  assert.equal((await service.request({ ...input(), language: "notalang" })).reason, "unknown-language");
  assert.equal((await service.request(input("x".repeat(1001)))).reason, "line-length-limit");
  assert.equal(workers.length, 0); service.dispose();
});
test("one in-flight request and a bounded FIFO queue, excess stays plain", async () => {
  const { service, workers } = harness({ maxQueued: 1 });
  const first = service.request(input("a")); const second = service.request(input("b"));
  assert.equal((await service.request(input("c"))).reason, "queue-limit");
  assert.equal(workers.length, 1); assert.equal(workers[0].messages.length, 1);
  workers[0].reply(); assert.equal((await first).status, "highlighted");
  assert.equal(workers[0].messages[1].input.text, "b");
  workers[0].reply(); await second; service.dispose();
});
test("cancel queued job leaves unrelated active worker running", async () => {
  const { service, workers } = harness();
  const a = service.request(input("a")); const controller = new AbortController();
  const b = service.request(input("b"), { signal: controller.signal }); controller.abort();
  assert.equal((await b).reason, "cancelled"); assert.equal(workers[0].terminated, false);
  workers[0].reply(); await a; service.dispose();
});
test("cancel active job terminates only its worker and ignores late same-wire result", async () => {
  const { service, workers } = harness(); const controller = new AbortController();
  const a = service.request(input("old"), { signal: controller.signal });
  const oldListener = workers[0].listeners.get("message");
  const b = service.request(input("new")); controller.abort();
  assert.equal((await a).reason, "cancelled"); assert.equal(workers[0].terminated, true);
  assert.equal(workers.length, 2);
  oldListener({ data: { id: workers[1].messages[0].id, ...result("new") } });
  assert.equal(service.inspect().active, true);
  workers[1].reply(); assert.equal((await b).tokens[0].text, "new"); service.dispose();
});
test("hard timeout destroys a blocked worker; subsequent queued request can recover", async () => {
  const { service, workers } = harness({ deadlineMs: 15 });
  const a = service.request(input("slow")), b = service.request(input("next"));
  assert.equal((await a).reason, "timeout"); assert.equal(workers[0].terminated, true);
  assert.equal(workers.length, 2); workers[1].reply(); await b; service.dispose();
});
test("worker error and malformed text are plain fallback, never changed code", async () => {
  const { service, workers } = harness();
  const a = service.request(input()); workers[0].fail(); assert.equal((await a).reason, "worker-error");
  const b = service.request(input()); workers[1].reply(result("wrong"));
  assert.equal((await b).reason, "worker-protocol-error"); assert.equal(workers[1].terminated, true); service.dispose();
});
test("constructor/post failure settles and can be retried", async () => {
  const service = createHighlightService({ createWorker() { throw new Error("blocked CSP"); } });
  assert.equal((await service.request(input())).reason, "worker-unavailable");
  assert.equal((await service.request(input())).reason, "worker-unavailable"); service.dispose();
});
test("cache is immutable, LRU and bounded by retained key plus output bytes", async () => {
  const { service, workers } = harness({ maxCacheEntries: 1, maxCacheBytes: 1000 });
  const a = service.request(input("a")); workers[0].reply(); const first = await a;
  assert.equal(await service.request(input("a")), first);
  assert.throws(() => { first.tokens[0].text = "bad"; }, TypeError);
  const b = service.request(input("b")); workers[0].reply(); await b;
  assert.equal(service.inspect().cacheEntries, 1); assert.ok(service.inspect().cacheBytes <= 1000);
  const again = service.request(input("a")); assert.equal(workers[0].messages.length, 3); workers[0].reply(); await again;
  service.dispose(); assert.equal(service.inspect().cacheBytes, 0);
});
test("idle cleanup releases worker, cache hit does not recreate one", async () => {
  const { service, workers } = harness({ idleMs: 5 });
  const a = service.request(input()); workers[0].reply(); await a;
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(workers[0].terminated, true); assert.equal(service.inspect().worker, false);
  assert.equal((await service.request(input())).status, "highlighted"); assert.equal(workers.length, 1); service.dispose();
});
test("dispose settles active and queued requests and is idempotent", async () => {
  const { service, workers } = harness();
  const a = service.request(input("a")), b = service.request(input("b"));
  service.dispose(); service.dispose();
  assert.equal((await a).reason, "disposed"); assert.equal((await b).reason, "disposed");
  assert.equal((await service.request(input())).reason, "disposed");
  assert.equal(workers[0].terminated, true); assert.equal(service.inspect().queued, 0);
});
test("view binding blocks stale success after text, frontier or session replacement", async () => {
  const pending = [], visible = [];
  const service = { request(value, { signal }) { return new Promise((resolve) => pending.push({ value, signal, resolve })); } };
  const binding = createHighlightBinding({ service, onResult: (value, result) => visible.push({ value, result }) });
  binding.update({ ...input("A"), scopeKey: "thread-a" });
  binding.update({ ...input("B"), scopeKey: "thread-b" });
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve(result("A")); await Promise.resolve(); assert.equal(visible.at(-1).result, null);
  pending[1].resolve(result("B")); await Promise.resolve(); assert.equal(visible.at(-1).value.scopeKey, "thread-b");
  binding.update({ ...input("B"), isFrontier: true, scopeKey: "thread-b" });
  assert.equal(visible.at(-1).result, null); binding.dispose();
});
test("selection defers highlight arrival without changing copy source, then releases", async () => {
  let selected = true, listener = null; const visible = [];
  const service = { request: async (input) => result(input.text) };
  const binding = createHighlightBinding({ service, onResult: (value, result) => visible.push({ value, result }),
    isSelectionActive: () => selected,
    subscribeSelection: (callback) => { listener = callback; return () => { listener = null; }; },
  });
  const value = input("canonical"); binding.update(value); await Promise.resolve();
  assert.equal(visible.length, 1); assert.equal(visible[0].result, null);
  selected = false; listener(); assert.equal(visible.at(-1).result.tokens[0].text, value.text); assert.equal(listener, null);
  binding.dispose();
});
test("selection-held result and late errors cannot resurrect an unmounted block", async () => {
  let listener; const visible = [];
  const binding = createHighlightBinding({ service: { request: async (input) => result(input.text) }, onResult: (_value, result) => visible.push(result),
    isSelectionActive: () => true, subscribeSelection: (callback) => { listener = callback; return () => {}; },
  });
  binding.update(input()); await Promise.resolve(); binding.dispose(); listener();
  assert.equal(visible.length, 1); assert.equal(visible[0], null);
});
test("the theme pair is part of the cache and in-flight key", async () => {
  const { service, workers } = harness();
  const first = service.request(input("a"));
  assert.equal(workers[0].messages[0].input.themes.dark, "claude-dark");
  workers[0].reply(); await first;
  assert.equal((await service.request(input("a"))).status, "highlighted", "same pair hits the cache");
  assert.equal(workers[0].messages.length, 1);
  const themed = service.request({ ...input("a"), themes: { light: "claude-light", dark: "github-dark" } });
  assert.equal(workers[0].messages.length, 2, "a different dark theme re-requests instead of serving cached colors");
  assert.equal(workers[0].messages[1].input.themes.dark, "github-dark");
  workers[0].reply(); await themed;
  assert.equal(service.inspect().cacheEntries, 2); service.dispose();
});
test("view binding retries transient capacity results with capped backoff, and only while the update is current", async () => {
  const timers = [], visible = [], outcomes = [];
  const service = { request: async () => outcomes.shift() ?? result("x") };
  const binding = createHighlightBinding({ service, onResult: (_value, value) => visible.push(value),
    schedule: (callback, delay) => { timers.push({ callback, delay }); return timers.length; }, cancelTimer: (id) => { timers[id - 1].cancelled = true; },
    retryDelayMs: 50, maxRetryDelayMs: 200 });
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  outcomes.push({ status: "plain", reason: "queue-limit" }, { status: "plain", reason: "subscriber-limit" }, { status: "plain", reason: "queue-limit" }, { status: "plain", reason: "queue-limit" });
  binding.update(input("x")); await flush();
  assert.deepEqual(visible, [null]); assert.equal(binding.inspect().retrying, true);
  for (const expected of [50, 100, 200, 200]) {
    const timer = timers.at(-1); assert.equal(timer.delay, expected); timer.callback(); await flush();
  }
  assert.equal(visible.at(-1).tokens[0].text, "x", "the fifth attempt is highlighted");
  assert.equal(binding.inspect().retries, 4); assert.equal(binding.inspect().retrying, false);
  assert.equal(timers.length, 4);
  // A final plain reason is not retried.
  outcomes.push({ status: "plain", reason: "line-length-limit" });
  binding.update(input("y")); await flush();
  assert.equal(timers.length, 4); assert.equal(visible.at(-1), null);
  // A newer update cancels the pending retry of the previous one; dispose cancels too.
  outcomes.push({ status: "plain", reason: "queue-limit" });
  binding.update(input("z")); await flush();
  assert.equal(timers.length, 5); assert.equal(timers[4].cancelled, undefined);
  binding.update(input("w")); await flush();
  assert.equal(timers[4].cancelled, true); assert.equal(visible.at(-1).tokens[0].text, "x");
  outcomes.push({ status: "plain", reason: "queue-limit" });
  binding.update(input("v")); await flush();
  assert.equal(timers.length, 6); binding.dispose(); assert.equal(timers[5].cancelled, true);
  // A late timer callback after dispose or supersession requests nothing.
  let requests = 0; const counting = { request: async () => { requests += 1; return { status: "plain", reason: "queue-limit" }; } };
  const late = createHighlightBinding({ service: counting, onResult: () => {}, schedule: (callback) => { timers.push({ callback }); return timers.length; }, cancelTimer: () => {} });
  late.update(input("a")); await flush(); assert.equal(requests, 1);
  late.update(input("b")); await flush(); assert.equal(requests, 2);
  timers.at(-2).callback(); await flush(); assert.equal(requests, 2, "a superseded retry is dropped");
  late.dispose(); timers.at(-1).callback(); await flush(); assert.equal(requests, 2, "a disposed retry is dropped");
});
test("with the real service a queue-limited fence becomes highlighted once the queue drains", async () => {
  const { service, workers } = harness({ maxQueued: 1 });
  const timers = [];
  const make = (text) => { const seen = []; const binding = createHighlightBinding({ service, onResult: (_v, r) => seen.push(r), schedule: (callback, delay) => { timers.push({ callback, delay }); return timers.length; }, cancelTimer: () => {} }); binding.update(input(text)); return { binding, seen }; };
  const a = make("a"), b = make("b"), c = make("c");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(timers.length, 1, "only the third fence was queue-limited");
  assert.equal(service.inspect().queued, 1);
  workers[0].reply(); await Promise.resolve(); await Promise.resolve();
  timers[0].callback(); await Promise.resolve();
  assert.equal(service.inspect().queued, 1, "the retry joined the queue once the first job finished");
  workers[0].reply(); await Promise.resolve(); await Promise.resolve();
  workers[0].reply(); await Promise.resolve(); await Promise.resolve();
  assert.equal(a.seen.at(-1).tokens[0].text, "a"); assert.equal(b.seen.at(-1).tokens[0].text, "b"); assert.equal(c.seen.at(-1).tokens[0].text, "c");
  for (const item of [a, b, c]) item.binding.dispose();
  service.dispose();
});
