import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createWordDiffService } from '../src/word-diff-service.mjs';
import { createHighlightBinding } from '../src/highlight-binding.mjs';

const rows = [{ type: 'removed', text: 'let value = 1;' }, { type: 'added', text: 'let value = 2;' }];
function fake() {
  const workers = [], timers = new Map(); let timerId = 0;
  const service = createWordDiffService({
    createWorker() { const worker = { sent: [], stopped: false, postMessage(data) { this.sent.push(data); }, terminate() { this.stopped = true; } }; workers.push(worker); return worker; },
    schedule(fn) { timers.set(++timerId, fn); return timerId; }, cancelTimer(id) { timers.delete(id); },
  });
  return { service, workers, timers, reply(index, ranges = [[[12, 13]], [[12, 13]]]) { const w = workers[index]; w.onmessage({ data: { id: w.sent.at(-1).id, status: 'highlighted', ranges } }); } };
}
test('shared diff worker serializes jobs; cancelling active work restarts for queued work and rejects late replies', async () => {
  const f = fake(), controller = new AbortController();
  const a = f.service.request({ rows }, { signal: controller.signal }), b = f.service.request({ rows });
  assert.equal(f.workers.length, 1); assert.equal(f.workers[0].sent.length, 1);
  controller.abort(); assert.equal((await a).reason, 'aborted'); assert.equal(f.workers[0].stopped, true);
  assert.equal(f.workers.length, 2); f.reply(0); assert.equal(f.timers.size, 1);
  f.reply(1); assert.equal((await b).status, 'highlighted'); assert.equal(f.timers.size, 0); f.service.dispose();
});
test('deadline releases a blocked worker and queued cancellation does not disturb the running hunk', async () => {
  const f = fake(), controller = new AbortController();
  const a = f.service.request({ rows }), b = f.service.request({ rows }, { signal: controller.signal });
  controller.abort(); assert.equal((await b).reason, 'aborted'); assert.equal(f.workers[0].stopped, false);
  [...f.timers.values()][0](); assert.equal((await a).reason, 'timeout'); assert.equal(f.workers[0].stopped, true); f.service.dispose();
});
test('transient queue pressure is explicit and dispose settles every request without retaining timers', async () => {
  const f = fake(), jobs = Array.from({ length: 33 }, () => f.service.request({ rows }));
  assert.equal((await f.service.request({ rows })).reason, 'queue-limit');
  f.service.dispose(); assert.ok((await Promise.all(jobs)).every(r => r.reason === 'disposed'));
  assert.equal(f.timers.size, 0); assert.equal(f.workers[0].stopped, true);
  assert.equal((await f.service.request({ rows })).reason, 'inactive');
});
test('streaming and invalid/oversized input never start a worker', async () => {
  const f = fake();
  for (const input of [{ rows, isFrontier: true }, { rows: null }, { rows: [{ text: null }] }, { rows: [{ text: 'x'.repeat(4 * 1024 * 1024 + 1) }] }]) assert.equal((await f.service.request(input)).status, 'plain');
  assert.equal(f.workers.length, 0); f.service.dispose();
});
test('word ranges wait for text selection and an obsolete session cannot publish after a new binding update', async () => {
  const f = fake(), commits = []; let selection = true, selectionChanged;
  const binding = createHighlightBinding({ service: f.service, onResult: (input, result) => { if (result) commits.push(input.session); },
    isSelectionActive: () => selection, subscribeSelection: fn => { selectionChanged = fn; return () => { selectionChanged = null; }; } });
  binding.update({ rows, session: 'old' }); f.reply(0); await Promise.resolve(); assert.deepEqual(commits, []);
  const stale = selectionChanged; binding.update({ rows, session: 'new' }); selection = false; stale(); assert.deepEqual(commits, []);
  f.reply(0); await Promise.resolve(); assert.deepEqual(commits, ['new']); binding.dispose(); f.service.dispose();
});
test('actual worker module computes decorations in an isolated Node worker without a browser', async () => {
  const moduleURL = new URL('../src/word-diff-worker.mjs', import.meta.url).href, stopped = [];
  const service = createWordDiffService({ deadline: 5000, createWorker() {
    // Bridge the two worker transports; execute the actual app worker module.
    const w = new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:data=>parentPort.postMessage(data)};import(${JSON.stringify(moduleURL)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`, { eval: true });
    const adapter = { postMessage: data => w.postMessage(data), terminate() { stopped.push(w.terminate()); } };
    w.on('message', data => adapter.onmessage?.({ data })); w.on('error', error => adapter.onerror?.(error)); return adapter;
  } });
  try {
    const result = await service.request({ rows }); assert.equal(result.status, 'highlighted'); assert.deepEqual(result.ranges, [[[12, 13]], [[12, 13]]]);
  } finally { service.dispose(); await Promise.all(stopped); }
});
