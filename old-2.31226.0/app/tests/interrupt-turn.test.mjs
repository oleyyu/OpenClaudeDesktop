import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { interruptTurn, settleAfterStop } = createRequire(import.meta.url)('../electron/interrupt-turn.cjs');
const expected = { connectionId: 'connection-one', connectionEpoch: 3 };
const payload = { threadId: 'thread-a', turnId: 'turn-1', expected };
function harness(patch = {}) {
  const calls = [], connection = { closed: false, approvalConnectionId: expected.connectionId, approvalConnectionEpoch: expected.connectionEpoch };
  const owner = { connection, approvalSnapshot: () => ({ ...expected, closed: false, ...patch }),
    start() { throw new Error('Stop must never initialize another client'); },
    request(...args) { calls.push(args); return Promise.resolve({}); } };
  return { owner, connection, calls };
}
test('Stop pins the exact existing transport and sends only actual wire parameters', async () => {
  const { owner, connection, calls } = harness();
  await interruptTurn(owner, payload);
  assert.deepEqual(calls, [['turn/interrupt', { threadId: 'thread-a', turnId: 'turn-1' }, 120000, connection]]);
});
test('reused task IDs on a different connection cannot receive an earlier Stop', () => {
  for (const patch of [{ connectionId: 'connection-two' }, { connectionEpoch: 4 }, { closed: true }]) {
    const { owner, calls } = harness(patch);
    assert.throws(() => interruptTurn(owner, payload), /not sent/);
    assert.equal(calls.length, 0);
  }
});
test('missing or closed transport never starts a client or dispatches a Stop', () => {
  for (const connection of [null, { closed: true }, { closed: false, approvalConnectionId: 'new', approvalConnectionEpoch: 4 }]) {
    const { owner, calls } = harness(); owner.connection = connection;
    assert.throws(() => interruptTurn(owner, payload), /not sent/); assert.equal(calls.length, 0);
  }
});
test('incomplete identity is rejected before interacting with the transport', () => {
  const { owner, calls } = harness();
  for (const bad of [null, {}, { ...payload, expected: null }, { ...payload, turnId: '' },
    { ...payload, expected: { ...expected, connectionEpoch: 0 } }])
    assert.throws(() => interruptTurn(owner, bad), /identity/);
  assert.equal(calls.length, 0);
});
test('transport rejection is returned to the exact caller without retry', async () => {
  const { owner, calls } = harness();
  owner.request = (...args) => { calls.push(args); return Promise.reject(new Error('Owned transport closed')); };
  await assert.rejects(interruptTurn(owner, payload), /Owned transport closed/);
  assert.equal(calls.length, 1);
});
test('the stale-connection refusal names the core the client runs, through the main-process t()', async () => {
  const i18n = await import('../electron/i18n/index.mjs');
  for (const [serverInfo, name] of [[{ engine: 'codex' }, 'Codex'], [{ engine: 'zcode' }, 'GLM'], [{ engine: 'deepseek-harness' }, 'DeepSeek']]) {
    const { owner, calls } = harness({ connectionId: 'connection-two' }); owner.serverInfo = serverInfo;
    assert.throws(() => interruptTurn(owner, payload), new RegExp(`^Error: The ${name} connection changed\\. The stop request was not sent\\.$`));
    assert.equal(calls.length, 0);
  }
  const { owner } = harness({ closed: true }); owner.serverInfo = { engine: 'kimi' };
  try { i18n.setLocale('zh-CN'); assert.throws(() => interruptTurn(owner, payload), /Kimi 的连接已变更。停止请求未发送。/); }
  finally { i18n.setLocale('en-US'); }
});
test('Stop of a session whose goal is working pauses the goal first, on the same connection, as Codex’s TUI does', async () => {
  const { owner, connection, calls } = harness();
  await interruptTurn(owner, { ...payload, pauseGoal: true });
  assert.deepEqual(calls, [['thread/goal/set', { threadId: 'thread-a', status: 'paused' }, 30000, connection],
    ['turn/interrupt', { threadId: 'thread-a', turnId: 'turn-1' }, 120000, connection]]);
  // A refused pause never blocks the Stop itself.
  const second = harness();
  second.owner.request = (...args) => { second.calls.push(args); return args[0] === 'thread/goal/set' ? Promise.reject(new Error('no goal')) : Promise.resolve({}); };
  await interruptTurn(second.owner, { ...payload, pauseGoal: true });
  assert.equal(second.calls.length, 2);
  // Without the flag, nothing but the interrupt.
  const plain = harness(); await interruptTurn(plain.owner, { ...payload, pauseGoal: 'yes' });
  assert.deepEqual(plain.calls.map((call) => call[0]), ['turn/interrupt']);
});

// settleAfterStop: a stopped turn the core isn't running gets the turn/completed the core never sends.
function statusOwner(status, patch = {}) {
  const calls = [], connection = { closed: false };
  const owner = { connection, request(...args) { calls.push(args); return patch.read ?? Promise.resolve({ thread: { id: 'thread-a', status } }); } };
  return { owner, connection, calls };
}
const settle = (owner, options = {}) => {
  const reports = [];
  const done = settleAfterStop(owner, payload, options.sent ?? Promise.resolve({}), { report: (event) => reports.push(event), wait: () => Promise.resolve(), ...options });
  return { reports, done };
};
test('a stopped turn the core is not running is reported over once the thread reads idle', async () => {
  for (const type of ['idle', 'notLoaded', 'systemError']) {
    const { owner, connection, calls } = statusOwner({ type });
    const { reports, done } = settle(owner, { sent: Promise.reject(new Error('no active turn')) });
    assert.equal(await done, true, type);
    assert.deepEqual(calls, [['thread/read', { threadId: 'thread-a', includeTurns: false }, 10000, connection]]);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].method, 'turn/completed');
    assert.deepEqual(reports[0].params, { threadId: 'thread-a', turn: { id: 'turn-1', items: [], itemsView: 'notLoaded', status: 'interrupted', error: null, startedAt: null, completedAt: null, durationMs: null } });
  }
});
test('a stop whose turn ended, is still running, or lost its connection is left to the core', async () => {
  // The core reported the turn's end since the Stop: no second turn/completed, no read.
  let probe = statusOwner({ type: 'idle' });
  let run = settle(probe.owner, { ended: () => true });
  assert.equal(await run.done, false); assert.equal(probe.calls.length, 0); assert.equal(run.reports.length, 0);
  // Still running (or a newer turn started): nothing is reported.
  probe = statusOwner({ type: 'active', activeFlags: [] });
  run = settle(probe.owner);
  assert.equal(await run.done, false); assert.equal(run.reports.length, 0);
  // The connection changed while waiting: the old connection's thread is never read.
  probe = statusOwner({ type: 'idle' });
  run = settle(probe.owner, { wait: async () => { probe.owner.connection = { closed: false }; } });
  assert.equal(await run.done, false); assert.equal(probe.calls.length, 0);
  // A failed read decides nothing.
  probe = statusOwner(null, { read: Promise.reject(new Error('thread/read timed out.')) });
  run = settle(probe.owner);
  assert.equal(await run.done, false); assert.equal(run.reports.length, 0);
  // Without a turn id there is no turn to settle.
  probe = statusOwner({ type: 'idle' });
  assert.equal(await settleAfterStop(probe.owner, { ...payload, turnId: '' }, Promise.resolve({}), { report: () => assert.fail('reported'), wait: () => Promise.resolve() }), false);
});
