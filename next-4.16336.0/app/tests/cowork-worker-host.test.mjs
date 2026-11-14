import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { CoworkWorkerHost } from '../electron/cowork-runtime/worker-host.mjs';

function fixture() {
  const calls = [], children = [];
  const host = new CoworkWorkerHost({ fork: (_file, _args, options) => {
    const child = new EventEmitter(); child.killed = false;
    child.postMessage = record => calls.push(record); child.kill = () => { child.killed = true; };
    children.push(child); assert.equal(options.allowLoadingUnsignedLibraries, true); return child;
  } });
  return { host, calls, children };
}
test('worker is lazy and only boot/open may start it; replies correlate and exits reject pending work', async () => {
  const f = fixture(); assert.equal(f.children.length, 0);
  await assert.rejects(f.host.request('close', {}), /not running/); assert.equal(f.children.length, 0);
  const first = f.host.request('open', {}); const second = f.host.request('send', {});
  const failed = assert.rejects(second, /exited/);
  f.children[0].emit('message', { id: f.calls[0].id, result: 'ready' }); assert.equal(await first, 'ready');
  f.children[0].emit('exit', 1); await failed;
  await f.host.stop(); assert.equal(f.children.length, 1);
});
test('a native startup deadline kills the owned worker and prevents old messages from touching a replacement', async () => {
  const f = fixture(); await assert.rejects(f.host.request('open', {}, 5), /timed out/);
  assert.equal(f.children[0].killed, true);
  const next = f.host.request('open', {});
  f.children[0].emit('message', { id: f.calls.at(-1).id, result: 'stale' });
  f.children[1].emit('message', { id: f.calls.at(-1).id, result: 'new' }); assert.equal(await next, 'new');
  const stop = f.host.stop(); f.children[1].emit('message', { id: f.calls.at(-1).id, result: {} }); await stop;
});
