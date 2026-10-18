import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { readBtwPlanState } = createRequire(import.meta.url)('../electron/btw-plan-state.cjs');
const plan = (id, extra = {}) => ({ id, status: 'completed', itemsView: 'full', items: [{ id: id + '-plan', type: 'plan', text: 'Plan' }], ...extra });
const meta = { permission: 'plan', ownTurnIds: ['own'] };
const thread = { id: 'child', historyMode: 'paginated' };

test('latest own plan survives inherited context, turn pagination and summary item backfill', async () => {
  const calls = [];
  const rpc = async (method, params) => {
    calls.push({ method, params });
    if (method === 'thread/turns/list') return params.cursor
      ? { data: [plan('own', { items: [], itemsView: 'summary' })], nextCursor: null }
      : { data: [plan('parent')], nextCursor: 'older' };
    return params.cursor ? { data: [{ turnId: 'own', item: { id: 'p', type: 'plan', text: 'Full plan' } }], nextCursor: null }
      : { data: [{ turnId: 'own', item: { id: 'u', type: 'userMessage' } }], nextCursor: 'more-items' };
  };
  assert.deepEqual(await readBtwPlanState(rpc, 'child', thread, meta), { state: 'waiting', handoff: { turnId: 'own', planItemId: 'p' } });
  assert.deepEqual(calls.map(c => c.method), ['thread/turns/list', 'thread/turns/list', 'thread/items/list', 'thread/items/list']);
  assert.ok(calls.every(c => c.params.threadId === 'child'));
});
test('acknowledgment survives reload; a newer completed turn supersedes the earlier plan, even with no items', async () => {
  const rpc = async () => ({ data: [plan('own')], nextCursor: null });
  assert.equal((await readBtwPlanState(rpc, 'child', thread, { ...meta, planAnsweredTurnId: 'own' })).state, 'settled');
  const result = await readBtwPlanState(async () => ({ data: [plan('new', { items: [] }), plan('own')] }), 'child', thread,
    { ...meta, ownTurnIds: ['own', 'new'] });
  assert.equal(result.state, 'settled');
});
test('failed/interrupted plans settle; active, missing, malformed and stale histories never prove settlement', async () => {
  for (const status of ['failed', 'interrupted', 'inProgress', 'unknown']) {
    assert.equal((await readBtwPlanState(async () => ({ data: [plan('own', { status })] }), 'child', thread, meta)).state,
      ['failed', 'interrupted'].includes(status) ? 'settled' : status === 'inProgress' ? 'running' : 'unknown');
  }
  for (const data of [undefined, [], [plan('parent')], [plan('own', { items: null })]])
    assert.equal((await readBtwPlanState(async () => ({ data }), 'child', thread, meta)).state, 'unknown');
  assert.equal((await readBtwPlanState(async () => ({ data: [plan('own')] }), 'child', thread, { ...meta, ownTurnIds: ['own', 'new'] })).state, 'unknown');
  await assert.rejects(readBtwPlanState(async () => { throw Error('read unavailable'); }, 'child', thread, meta), /unavailable/);
});
test('cursor loops, malformed item pages and cross-turn item results cannot erase a pending plan', async () => {
  let calls = 0;
  assert.equal((await readBtwPlanState(async () => { calls++; return { data: [], nextCursor: 'loop' }; }, 'child', thread, meta)).state, 'unknown');
  assert.equal(calls, 2);
  for (const page of [{}, { data: [{ turnId: 'other', item: { type: 'plan' } }] }, { data: [], nextCursor: 'loop' }]) {
    const rpc = async method => method === 'thread/turns/list' ? { data: [plan('own', { itemsView: 'summary' })] } : page;
    assert.equal((await readBtwPlanState(rpc, 'child', thread, meta)).state, 'unknown');
  }
});
test('legacy reads use only the child full history and reject another identity or active status', async () => {
  const legacy = { ...thread, historyMode: 'legacy' };
  for (const kind of ['waiting', 'wrong-id', 'running']) {
    const rpc = async (method, params) => {
      assert.equal(method, 'thread/read'); assert.deepEqual(params, { threadId: 'child', includeTurns: true });
      return { thread: { id: kind === 'wrong-id' ? 'parent' : 'child', turns: [plan('parent'), plan('own')], status: { type: kind === 'running' ? 'active' : 'idle' } } };
    };
    assert.equal((await readBtwPlanState(rpc, 'child', legacy, meta)).state, kind === 'wrong-id' ? 'unknown' : kind);
  }
});
