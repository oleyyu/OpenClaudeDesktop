// Settings › Storage › Clean up inactive sessions, main side (electron/code-cleanup.cjs; 2.31226.0 DeviceStorage
// previewCodeCleanup rfa / runCodeCleanup afa→ifa / cancelCodeCleanup).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCodeCleanup, CLEANUP_WINDOWS } = require('../electron/code-cleanup.cjs');

const NOW = Date.UTC(2026, 9, 14);
const DAY = 86400000;
const ago = (days) => (NOW - days * DAY) / 1000;

// s-clean: 40 days, clean worktree; s-dirty: 50 days, uncommitted worktree; s-plain: 45 days, no worktree;
// s-recent: 5 days; s-shared + s-live share a worktree and s-live is recent (held); s-cowork; s-pinned: 70 days, clean.
function fixture(overrides = {}) {
  const config = {
    threadIds: ['s-clean', 's-dirty', 's-plain', 's-recent', 's-shared', 's-live', 's-cowork', 's-pinned'],
    archivedThreadIds: [],
    threadMetadata: {
      's-clean': { cwd: '/wt/clean', updatedAt: ago(40) }, 's-dirty': { cwd: '/wt/dirty', updatedAt: ago(50) },
      's-plain': { cwd: '/repo', updatedAt: ago(45) }, 's-recent': { cwd: '/wt/recent', updatedAt: ago(5) },
      's-shared': { cwd: '/wt/shared', updatedAt: ago(60) }, 's-live': { cwd: '/wt/shared', updatedAt: ago(1) },
      's-cowork': { cwd: '/x', updatedAt: ago(90) }, 's-pinned': { cwd: '/wt/pinned', updatedAt: ago(70) },
    },
    sessionMetadata: { 's-cowork': { surface: 'cowork' } },
    worktreeDirectories: ['/wt/clean', '/wt/dirty', '/wt/recent', '/wt/shared', '/wt/pinned'],
    pinnedOrder: ['s-pinned'],
    ...overrides.config,
  };
  const folders = { '/wt/clean': { exists: true, changes: 0 }, '/wt/dirty': { exists: true, changes: 3 }, '/wt/recent': { exists: true, changes: 0 },
    '/wt/shared': { exists: true, changes: 0 }, '/wt/pinned': { exists: true, changes: 0 } };
  const calls = { removed: [], deleted: [], progress: [], reads: [], saves: 0 };
  const deps = {
    getConfig: () => config, save: () => { calls.saves++; }, connected: () => true, now: () => NOW,
    readThread: async (id) => { calls.reads.push(id); return { thread: { id, updatedAt: config.threadMetadata[id].updatedAt, status: { type: 'notLoaded' }, name: id === 's-plain' ? '' : `Title ${id}` } }; },
    inUse: () => false, isCowork: (id) => config.sessionMetadata?.[id]?.surface === 'cowork',
    worktreeStatus: async (dir) => folders[dir] ?? { exists: false, changes: 0 },
    removeWorktree: async (dir) => { calls.removed.push(dir); folders[dir] = { exists: false, changes: 0 }; return true; },
    forgetWorktree: (cfg, dir) => { cfg.worktreeDirectories = cfg.worktreeDirectories.filter((entry) => entry !== dir); },
    directoryUsage: async (dir) => ({ bytes: { '/wt/clean': 1000, '/wt/dirty': 500, '/wt/pinned': 2000 }[dir] ?? 0, incomplete: false }),
    deleteSession: async (id) => { calls.deleted.push(id); config.threadIds = config.threadIds.filter((known) => known !== id); },
    onProgress: (done, total) => calls.progress.push([done, total]),
    ...overrides.deps,
  };
  return { config, folders, calls, cleanup: createCodeCleanup(deps) };
}

test('windows are 30, 60 and 90 days; an unknown window is refused', async () => {
  assert.deepEqual(CLEANUP_WINDOWS, [30, 60, 90]);
  await assert.rejects(fixture().cleanup.preview(7), /Unknown cleanup window/);
});

test('preview: inactive Code sessions, their worktree state and sizes; recent, shared-with-active and Cowork sessions stay out', async () => {
  const { cleanup, calls } = fixture();
  const { preview } = await cleanup.preview(30);
  assert.equal(typeof preview.token, 'string');
  assert.equal(preview.olderThanDays, 30);
  assert.equal(preview.sessionCount, 4, 's-clean, s-dirty, s-plain, s-pinned (s-shared held: s-live still works there)');
  assert.equal(preview.count, 2, 'clean worktrees: s-clean and s-pinned');
  assert.equal(preview.bytes, 3000);
  assert.equal(preview.incomplete, false);
  assert.deepEqual(preview.examples, [{ title: 'Title s-pinned', bytes: 2000 }, { title: 'Title s-clean', bytes: 1000 }], 'largest first, three when uncommitted ones are listed');
  assert.equal(preview.uncommittedCount, 1);
  assert.equal(preview.uncommittedBytes, 500);
  assert.deepEqual(preview.uncommitted, [{ title: 'Title s-dirty', bytes: 500 }]);
  assert.equal(calls.reads.includes('s-recent'), false, 'a recent recorded activity settles it without a read');
  assert.equal(calls.reads.includes('s-cowork'), false);
  const sixty = (await cleanup.preview(60)).preview;
  assert.deepEqual([sixty.sessionCount, sixty.count, sixty.uncommittedCount], [1, 1, 0], 'only s-pinned (70 days) at 60 days');
});

test('preview: not connected, a failed read, an active or shown session are never candidates', async () => {
  assert.deepEqual(await fixture({ deps: { connected: () => false } }).cleanup.preview(30), { errorCode: 'not-loaded' });
  const failing = fixture({ deps: { readThread: async () => { throw new Error('gone'); } } });
  assert.equal((await failing.cleanup.preview(30)).preview.sessionCount, 0);
  const busy = fixture({ deps: { inUse: (id) => id === 's-clean' } });
  assert.equal((await busy.cleanup.preview(30)).preview.count, 1);
  const running = fixture({ deps: { readThread: async (id) => ({ thread: { id, updatedAt: ago(80), status: { type: 'active' } } }) } });
  assert.equal((await running.cleanup.preview(30)).preview.sessionCount, 0);
  const restored = fixture({ config: { restoredAt: { 's-clean': NOW - DAY } } });
  assert.equal((await restored.cleanup.preview(30)).preview.count, 1, 'a session restored yesterday is active');
});

test('run: removes the clean worktrees only; sessions and uncommitted changes stay; the token is single-use', async () => {
  const { cleanup, calls, config } = fixture();
  const { preview } = await cleanup.preview(30);
  const result = await cleanup.run(preview.token, {});
  assert.deepEqual(result, { removedCount: 2, deletedCount: 0, skippedCount: 0, failedCount: 0, cancelled: false });
  assert.deepEqual(calls.removed.sort(), ['/wt/clean', '/wt/pinned']);
  assert.deepEqual(calls.deleted, []);
  assert.deepEqual(config.worktreeDirectories, ['/wt/dirty', '/wt/recent', '/wt/shared']);
  assert.deepEqual(calls.progress.at(-1), [2, 2]);
  assert.equal((await cleanup.run(preview.token, {})).errorCode, 'expired');
});

test('run: a newer preview expires the older token', async () => {
  const { cleanup } = fixture();
  const first = (await cleanup.preview(30)).preview;
  await cleanup.preview(60);
  assert.equal((await cleanup.run(first.token, {})).errorCode, 'expired');
});

test('run: include uncommitted and delete sessions; a pinned session is left as it is', async () => {
  const { cleanup, calls } = fixture();
  const { preview } = await cleanup.preview(30);
  const result = await cleanup.run(preview.token, { includeUncommitted: true, deleteSessions: true });
  assert.deepEqual(calls.deleted.sort(), ['s-clean', 's-dirty', 's-plain']);
  assert.deepEqual(calls.removed.sort(), ['/wt/clean', '/wt/dirty']);
  assert.deepEqual(result, { removedCount: 2, deletedCount: 3, skippedCount: 1, failedCount: 0, cancelled: false });
});

test('run: deleting sessions without uncommitted keeps the dirty session; a changed worktree since the preview is skipped', async () => {
  const { cleanup, calls, folders } = fixture();
  const { preview } = await cleanup.preview(30);
  folders['/wt/clean'] = { exists: true, changes: 1 };
  const result = await cleanup.run(preview.token, { deleteSessions: true });
  assert.deepEqual(calls.deleted.sort(), ['s-plain']);
  assert.equal(result.skippedCount, 2, 's-clean changed since, s-pinned pinned');
  assert.equal(calls.deleted.includes('s-dirty'), false);
});

test('run: failures are counted, a second run while one is going is refused, Stop ends after the current item', async () => {
  const failing = fixture({ deps: { removeWorktree: async () => false } });
  const plan = (await failing.cleanup.preview(30)).preview;
  assert.deepEqual(await failing.cleanup.run(plan.token, {}), { removedCount: 0, deletedCount: 0, skippedCount: 0, failedCount: 2, cancelled: false });

  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const slow = fixture({ deps: { removeWorktree: async (dir) => { await gate; return !!dir; } } });
  const token = (await slow.cleanup.preview(30)).preview.token;
  const running = slow.cleanup.run(token, {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(slow.cleanup.running, true);
  assert.equal((await slow.cleanup.run(token, {})).errorCode, 'already-running');
  slow.cleanup.cancel();
  release();
  const result = await running;
  assert.equal(result.cancelled, true);
  assert.equal(result.removedCount, 1, 'the item in progress finishes; the next is not reached');
});

// B36 review: a session whose workflow still runs (its turn has ended) is in use; inUse may answer asynchronously.
test('preview and run: an asynchronous in-use answer (a running workflow) keeps the session out', async () => {
  let workflowRunning = new Set(['s-clean']);
  const { cleanup, calls } = fixture({ deps: { inUse: async (id) => workflowRunning.has(id) } });
  const { preview } = await cleanup.preview(30);
  assert.equal(preview.count, 1, 's-clean is busy with a workflow; only s-pinned is listed');
  workflowRunning = new Set();
  const plan = (await cleanup.preview(30)).preview;
  workflowRunning = new Set(['s-clean']);
  const result = await cleanup.run(plan.token, {});
  assert.deepEqual(calls.removed, ['/wt/pinned'], 'a workflow started since the preview keeps its worktree');
  assert.equal(result.skippedCount, 1);
});
