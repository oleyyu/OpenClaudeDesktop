// w13-chatfn-branches: electron/chat-branches.mjs over a fake core and fake session-operations fork. Retry forks after
// the turn before the retried one (thread/fork lastTurnId), the first turn is forked and reverted in the copy, the
// version is hidden from the session list, switching moves the shown version, Code / Cowork sessions are refused, and a
// deleted conversation's other versions are deleted with it (prune, cascade).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createChatBranches } from '../electron/chat-branches.mjs';
import { surfaceSessions } from '../electron/surface-policy.mjs';

function harness({ revert = true } = {}) {
  const config = { threadIds: ['r', 'k'], archivedThreadIds: [], threadMetadata: { r: { name: 'Trip ideas' } },
    sessionMetadata: { r: { surface: 'chat' }, k: { surface: 'code' } } };
  const turns = { r: ['t0', 't1', 't2'] };
  const calls = [];
  let n = 0, saves = 0;
  const fork = async (payload) => {
    calls.push(['fork', payload]);
    const id = `v${++n}`;
    const source = turns[payload.threadId];
    turns[id] = source.slice(0, source.indexOf(payload.lastTurnId) + 1).map((turn) => `${id}-${turn}`);
    config.threadIds = [id, ...config.threadIds];
    config.threadMetadata[id] = { name: payload.name };
    // session-operations.cjs writes these for a fork.
    config.sessionMetadata[id] = { surface: config.sessionMetadata[payload.threadId].surface, additionalFolders: [], forkedFrom: payload.threadId, forkedAtTurn: payload.lastTurnId };
    return { thread: { id, name: payload.name }, sessionMetadata: config.sessionMetadata[id] };
  };
  const request = async (method, params) => {
    calls.push([method, params]);
    if (method === 'thread/read') return { thread: { id: params.threadId, turns: (turns[params.threadId] ?? []).map((id) => ({ id })) } };
    if (method === 'thread/revert') { const list = turns[params.threadId]; turns[params.threadId] = list.slice(0, list.indexOf(params.beforeTurnId)); return {}; }
    throw new Error(`unexpected ${method}`);
  };
  const deleted = [];
  const deleteThread = async (id) => { deleted.push(id); config.threadIds = config.threadIds.filter((known) => known !== id); delete config.sessionMetadata[id]; };
  const service = createChatBranches({ getConfig: () => config, save: () => { saves += 1; }, fork, request, revertServed: () => revert, deleteThread });
  return { service, config, calls, turns, deleted, saves: () => saves };
}

const sessionsOf = (config) => surfaceSessions(config.threadIds.map((id) => ({ id })), 'chat', config.sessionMetadata).map((s) => s.id);

test('Retry forks after the turn before it, keeps the name, hides the old version and records the group', async () => {
  const h = harness();
  const params = { permission: 'default', expected: { connectionId: 1, connectionEpoch: 2 }, afterPlan: 'auto' };
  const result = await h.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't2', ...params });
  assert.deepEqual(h.calls[0], ['thread/read', { threadId: 'r', includeTurns: true }]);
  assert.deepEqual(h.calls[1], ['fork', { operation: 'fork', threadId: 'r', lastTurnId: 't1', permission: 'default', mode: 'chat',
    expected: { connectionId: 1, connectionEpoch: 2 }, afterPlan: 'auto', name: 'Trip ideas' }]);
  assert.equal(h.calls.length, 2, 'no thread/revert after the first turn');
  assert.equal(result.thread.id, 'v1');
  assert.deepEqual(result.group, { root: 'r', members: [{ id: 'r', parent: null, anchor: 0 }, { id: 'v1', parent: 'r', anchor: 2 }], shown: 'v1' });
  // A version is no user fork: no forkedFrom / forkedAtTurn ("Forked here" marker), surface chat, chatBranchOf root.
  assert.deepEqual(h.config.sessionMetadata.v1, { surface: 'chat', additionalFolders: [], chatBranchOf: 'r' });
  assert.equal(h.config.sessionMetadata.r.chatBranchShown, 'v1');
  assert.deepEqual(result.metadata.v1, h.config.sessionMetadata.v1);
  assert.deepEqual(result.metadata.r, h.config.sessionMetadata.r);
  assert.deepEqual(h.config.chatBranches, { r: result.group });
  assert.deepEqual(sessionsOf(h.config), ['v1']);
  assert.ok(h.saves() > 0);
  // The renderer sends the prompt in the version next (turn/start comes from its sendMessage); the fork itself sent none.
  assert.ok(!h.calls.some(([method]) => method === 'turn/start'));
});

test('the first reply: fork it, then revert the copied turn (thread/revert beforeTurnId); refused without thread/revert', async () => {
  const h = harness();
  const result = await h.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't0', permission: 'default' });
  assert.equal(h.calls[1][1].lastTurnId, 't0');
  assert.deepEqual(h.calls.at(-1), ['thread/revert', { threadId: 'v1', beforeTurnId: 'v1-t0' }]);
  assert.deepEqual(h.turns.v1, []);
  assert.equal(result.group.members[1].anchor, 0);
  const none = harness({ revert: false });
  await assert.rejects(none.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't0', permission: 'default' }), /can’t be retried/);
  assert.ok(!none.calls.some(([kind]) => kind === 'fork'));
});

test('switching versions moves the session row; list returns the group; Code sessions and unknown turns are refused', async () => {
  const h = harness();
  await h.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't1', permission: 'default' });
  h.turns.v1.push('v1-t1'); // the renderer's resend in the version
  const second = await h.service.run({ operation: 'create-variant', threadId: 'v1', turnId: 'v1-t1', permission: 'default' });
  assert.deepEqual(second.group.members.map((m) => [m.id, m.parent, m.anchor]), [['r', null, 0], ['v1', 'r', 1], ['v2', 'v1', 1]]);
  assert.equal(h.calls.filter(([kind]) => kind === 'fork').at(-1)[1].lastTurnId, 'v1-t0');
  assert.deepEqual(sessionsOf(h.config), ['v2']);
  const selected = await h.service.run({ operation: 'select', threadId: 'r' });
  assert.equal(selected.group.shown, 'r');
  assert.equal(selected.metadata.r.chatBranchShown, 'r');
  assert.deepEqual(sessionsOf(h.config), ['r']);
  assert.equal((await h.service.run({ operation: 'list', threadId: 'v2' })).group.root, 'r');
  assert.equal((await h.service.run({ operation: 'list', threadId: 'nope' })).group, null);
  await assert.rejects(h.service.run({ operation: 'create-variant', threadId: 'k', turnId: 'x', permission: 'default' }), /only available in Chat/);
  await assert.rejects(h.service.run({ operation: 'create-variant', threadId: 'r', turnId: 'zz', permission: 'default' }), /no longer in the chat/);
  await assert.rejects(h.service.run({ operation: 'select', threadId: 'k' }), /only available in Chat/);
  await assert.rejects(h.service.run({ operation: 'nope' }), /Unknown chat version operation/);
});

test('deleting a conversation (its shown version) deletes its other versions; removing one version falls back', async () => {
  const h = harness();
  await h.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't1', permission: 'default' });
  await h.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't2', permission: 'default' });
  // remove: v2 goes, shown falls back to its parent r.
  const removed = await h.service.run({ operation: 'remove', threadId: 'v2' });
  assert.deepEqual(removed.removed, ['v2']);
  assert.equal(removed.group.shown, 'r');
  assert.equal(h.config.sessionMetadata.r.chatBranchShown, 'r');
  // The sidebar row (r, shown) is deleted through thread/delete: the next prune deletes v1 too and drops the group.
  h.config.threadIds = h.config.threadIds.filter((id) => id !== 'r'); delete h.config.sessionMetadata.r;
  // v2 left the group without being deleted, so it is a chat of its own again; v1 stays hidden until pruned.
  assert.deepEqual(sessionsOf(h.config), ['v2']);
  const pruned = await h.service.run({ operation: 'prune' });
  assert.deepEqual(pruned.removed, ['v1']);
  assert.deepEqual(h.deleted, ['v1']);
  assert.deepEqual(h.config.chatBranches, {});
  // Removing the root with deleteThreads deletes every version.
  const g = harness();
  await g.service.run({ operation: 'create-variant', threadId: 'r', turnId: 't1', permission: 'default' });
  const all = await g.service.run({ operation: 'remove', threadId: 'r', deleteThreads: true });
  assert.deepEqual(all.removed, ['r', 'v1']);
  assert.deepEqual(g.deleted, ['v1']);
  assert.equal(g.config.sessionMetadata.v1, undefined);
});

test('host wiring: main.cjs routes "chat-branches" to the service over session-operations fork and the app thread/delete', () => {
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  // w13-chatfn-history: the service is created once by chatBranchesReady (also used by the thread/delete cascade).
  assert.match(main, /const chatBranchesReady = async \(\) => \(chatBranchesService \?\?= \(await import\("\.\/chat-branches\.mjs"\)\)\.createChatBranches\(\{ getConfig: \(\) => config, save,/);
  assert.match(main, /case "chat-branches": return \(await chatBranchesReady\(\)\)\.run\(p\);/);
  assert.match(main, /fork: \(payload\) => sessionOperations\.run\(payload\)/);
  assert.match(main, /deleteThread: \(threadId\) => requestRpc\(\{ method: "thread\/delete", params: \{ threadId \} \}, undefined, client\)/);
});
