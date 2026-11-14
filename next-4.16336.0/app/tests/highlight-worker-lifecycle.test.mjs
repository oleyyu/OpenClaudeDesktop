import test from "node:test";
import assert from "node:assert/strict";
import { createHighlightService } from "../src/highlight-service.mjs";
import { nodeWorkerFactory } from "./fixtures/highlight-node-worker-adapter.mjs";

test("actual worker module tokenizes five languages through structured clone", { timeout: 10_000 }, async () => {
  const records = [];
  const service = createHighlightService({ createWorker: nodeWorkerFactory(records) });
  try {
    for (const [language, text] of [["js", "const x = 1;"], ["ts", "const x: number = 1;"], ["json", '{"x":1}'], ["py", "x = 1 # number"], ["bash", 'echo "$HOME"']]) {
      const result = await service.request({ text, language });
      assert.equal(result.status, "highlighted", JSON.stringify(result));
      assert.equal(result.tokens.map((token) => token.text).join(""), text);
    }
    assert.equal(records.length, 1);
  } finally { service.dispose(); await Promise.all(records.map((record) => record.exit)); }
  assert.ok(records.every((record) => record.terminated && record.raw.threadId === -1));
});

test("hard timeout interrupts genuinely blocked worker, not merely a delayed result", { timeout: 5000 }, async () => {
  const records = [];
  const service = createHighlightService({ createWorker: nodeWorkerFactory(records, { block: true }), deadlineMs: 500 });
  const pending = service.request({ text: "const x = 1;", language: "js" });
  await records[0].blocked;
  assert.equal((await pending).reason, "timeout");
  await records[0].exit;
  assert.equal(records[0].raw.threadId, -1); assert.equal(service.inspect().worker, false);
  service.dispose();
});

test("abort of genuinely blocked worker exits and preserves an unrelated sentinel worker", { timeout: 5000 }, async () => {
  const records = [], sentinels = [];
  const sentinel = nodeWorkerFactory(sentinels, { block: true })();
  await sentinels[0].ready;
  const service = createHighlightService({ createWorker: nodeWorkerFactory(records, { block: true }) });
  try {
    const controller = new AbortController();
    const pending = service.request({ text: "const x = 1;", language: "js" }, { signal: controller.signal });
    await records[0].blocked; controller.abort();
    assert.equal((await pending).reason, "cancelled"); await records[0].exit;
    assert.equal(records[0].raw.threadId, -1); assert.notEqual(sentinels[0].raw.threadId, -1);
  } finally { service.dispose(); sentinel.terminate(); await sentinels[0].exit; }
});

test("dispose exits active actual worker and settles pending queue", { timeout: 5000 }, async () => {
  const records = [];
  const service = createHighlightService({ createWorker: nodeWorkerFactory(records, { block: true }) });
  const a = service.request({ text: "a", language: "js" }), b = service.request({ text: "b", language: "js" });
  await records[0].blocked; service.dispose();
  assert.equal((await a).reason, "disposed"); assert.equal((await b).reason, "disposed");
  await records[0].exit; assert.equal(records[0].raw.threadId, -1);
});
