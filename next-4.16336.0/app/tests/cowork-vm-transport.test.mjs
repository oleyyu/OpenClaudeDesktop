import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { CoworkVmTransport } from '../electron/cowork-runtime/vm-transport.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function fixture(options = {}) {
  const events = new EventEmitter(), calls = [], ack = deferred();
  let callbacks;
  const vm = {
    async setEventCallbacks(...values) { callbacks = values; calls.push(['callbacks']); },
    async isGuestConnected() { return true; },
    async spawn(...values) { calls.push(['spawn', ...values]); return ack.promise; },
    async writeStdin(...values) { calls.push(['stdin', ...values]); },
    async kill(...values) { calls.push(['kill', ...values]); },
  };
  const transport = new CoworkVmTransport({ vm, events, ...options });
  const launch = options => transport.spawn({ processName: 'task', command: 'claude', args: ['--output-format', 'stream-json'], ...options });
  return { transport, launch, vm, calls, ack, events, get callbacks() { return callbacks; } };
}

test('guest launch matches the reference positional ABI and does not mutate the environment', async () => {
  const f = fixture();
  const env = { FOO: 'bar', OMIT: undefined, CLAUDE_CODE_OAUTH_TOKEN: 'fixture-only-token' };
  const mounts = { work: { path: '/fixture/work', mode: 'rw' } };
  const child = f.launch({ env, additionalMounts: mounts, cwd: '/sessions/task/mnt/work', isResume: true, allowedDomains: ['example.test'], oneShot: false, mountSkeletonHome: true });
  await setImmediate();
  assert.deepEqual(f.calls.find(call => call[0] === 'spawn'), ['spawn', child.id, 'task', 'claude', ['--output-format', 'stream-json'],
    '/sessions/task/mnt/work', { FOO: 'bar' }, mounts, true, ['example.test'], false, true, 'fixture-only-token']);
  assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, 'fixture-only-token');
  f.ack.resolve({ failedMounts: [] }); await child.ready;
  await f.transport.close();
});

test('stdin waits for spawn acknowledgement, preserves UTF-8 boundaries and stays ordered', async () => {
  const f = fixture(), child = f.launch();
  const text = Buffer.from('中文\n');
  const writes = [text.subarray(0, 2), text.subarray(2), Buffer.from('next\n')].map(chunk => new Promise((resolve, reject) => child.stdin.write(chunk, error => error ? reject(error) : resolve())));
  await setImmediate();
  assert.equal(f.calls.filter(call => call[0] === 'stdin').length, 0);
  f.ack.resolve({}); await Promise.all(writes);
  assert.equal(f.calls.filter(call => call[0] === 'stdin').map(call => call[2]).join(''), '中文\nnext\n');
  await f.transport.close();
});

test('stdout, stderr, OOM metadata and nonzero exits are preserved separately', async () => {
  const f = fixture(), child = f.launch(), out = [], err = [];
  child.stdout.on('data', chunk => out.push(chunk.toString())); child.stderr.on('data', chunk => err.push(chunk.toString()));
  await setImmediate(); f.ack.resolve({}); await child.ready;
  f.callbacks[0](child.id, '{"type":"assistant"}\n');
  f.callbacks[1](child.id, 'diagnostic\n');
  f.callbacks[2](child.id, 137, 'SIGKILL', 1, 256);
  assert.deepEqual(await child.completion, { code: 137, signal: 'SIGKILL', oomKillCount: 1, peakBytes: 256 });
  assert.equal(out.join(''), '{"type":"assistant"}\n'); assert.equal(err.join(''), 'diagnostic\n');
  assert.equal(f.transport.processes.size, 0);
  await f.transport.close();
});

test('cancellation before launch avoids spawn; cancellation during acknowledgement kills again after ack', async () => {
  const f = fixture(), early = f.launch();
  await early.kill(); await setImmediate();
  assert.equal(f.calls.filter(call => call[0] === 'spawn').length, 0);
  assert.match((await early.completion).error.message, /cancelled/);
  const child = f.launch(); await setImmediate(); await child.kill('SIGTERM');
  f.ack.resolve({}); await setImmediate();
  assert.equal(f.calls.filter(call => call[0] === 'kill' && call[1] === child.id).length, 2);
  f.callbacks[2](child.id, null, 'SIGTERM');
  assert.equal((await child.completion).signal, 'SIGTERM');
  await f.transport.close();
});

test('failed mounts reject readiness and terminate the partially launched guest', async () => {
  const f = fixture(), child = f.launch(); await setImmediate();
  f.ack.resolve({ failedMounts: ['work'] });
  await assert.rejects(child.ready, /mount all selected folders/);
  assert.ok((await child.completion).error);
  assert.ok(f.calls.some(call => call[0] === 'kill' && call[1] === child.id));
  await f.transport.close();
});

test('disconnect fails live work and teardown only removes its own event listeners', async () => {
  const f = fixture(); let external = 0;
  f.events.on('guestConnectionChanged', () => external++);
  const a = f.launch(), b = f.launch(); await setImmediate(); f.ack.resolve({}); await Promise.all([a.ready, b.ready]);
  assert.equal(f.calls.filter(call => call[0] === 'callbacks').length, 1);
  f.events.emit('guestConnectionChanged', false);
  for (const child of [a, b]) assert.match((await child.completion).error.message, /disconnected/);
  await f.transport.close();
  assert.equal(f.events.listenerCount('guestConnectionChanged'), 1);
  assert.equal(external, 1);
  assert.throws(() => f.launch(), /closed/);
});

test('readiness is rejected if the guest exits before native spawn acknowledgement', async () => {
  const f = fixture(), child = f.launch(); await setImmediate();
  f.callbacks[2](child.id, 1, null); f.ack.resolve({});
  await assert.rejects(child.ready, /before spawn acknowledgement/);
  assert.equal((await child.completion).code, 1);
  await setImmediate(); await f.transport.close();
});

test('stalled spawn expires and a late acknowledgement is killed again', async () => {
  const f = fixture({ spawnTimeoutMs: 10 }), child = f.launch();
  await assert.rejects(child.ready, /launch timed out/);
  assert.match((await child.completion).error.message, /launch timed out/);
  await setImmediate(); const before = f.calls.filter(call => call[0] === 'kill').length;
  assert.ok(before > 0); assert.equal(f.transport.processes.size, 0);
  f.ack.resolve({}); await setImmediate();
  assert.ok(f.calls.filter(call => call[0] === 'kill').length > before);
  await f.transport.close();
});

test('connection probe stalls are bounded without spawning a process', async () => {
  const f = fixture({ spawnTimeoutMs: 5 }); f.vm.isGuestConnected = () => new Promise(() => {});
  const child = f.launch(); await assert.rejects(child.ready, /launch timed out/);
  assert.equal(f.calls.some(call => call[0] === 'spawn'), false);
  await f.transport.close();
});

test('stalled stdin fails the process and a stalled kill cannot hang transport close', async () => {
  const f = fixture({ ioTimeoutMs: 5 }), child = f.launch();
  f.ack.resolve({}); await child.ready;
  f.vm.writeStdin = () => new Promise(() => {});
  const write = new Promise((resolve, reject) => child.stdin.write('test', error => error ? reject(error) : resolve()));
  await assert.rejects(write, /stdin write timed out/);
  assert.match((await child.completion).error.message, /stdin write timed out/);
  const next = f.launch(); await next.ready;
  f.vm.kill = () => new Promise(() => {});
  const closed = f.transport.close();
  assert.match((await next.completion).error.message, /transport closed/);
  await closed;
  assert.equal(f.transport.processes.size, 0);
});

test('native string spawn rejection retains its cause for both ready and completion', async () => {
  const f = fixture(), child = f.launch();
  const rejected = assert.rejects(child.ready, /useradd: invalid user name/);
  f.ack.reject('RPC error: useradd: invalid user name');
  await rejected;
  const result = await child.completion;
  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /useradd: invalid user name/);
  await f.transport.close();
});
