// R4g-routines RT5 (tasks-code-routines WI-5, D32): src/code-routine-model.mjs, the host side of the Code Routines page,
// over the real scheduler (electron/local-routines.mjs) and runner (electron/routine-runner.mjs). The core is a stub (no
// process is started); folders live under the OS temp directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { createRoutineRunner, captureRoutineOptions } from '../electron/routine-runner.mjs';
import { codeScheduledTask, codeScheduledTaskRequest, createCodeRoutinesBridge, createCodeLocalSessions, codeRoutineSessions,
  codeRoutineModels, routineHrefTarget, toHostPermission, toOfficialPermission } from '../src/code-routine-model.mjs';

function tempDir(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'code-routine-model-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const HOST = { owner: 'fixture-owner', coreId: 'fixture', models: [{ model: 'fixture-model' }, { model: 'alternate' }], hints: true, autoReview: false };

/** The renderer's `call` over the real scheduler and runner (main.cjs's cases, minus Electron). */
function host(t, { rpcResult = () => null } = {}) {
  const dataDir = tempDir(t);
  const approved = new Set();
  const calls = [];
  let rows = [];
  const listeners = new Set();
  const rpc = async ({ method }) => {
    const custom = rpcResult(method);
    if (custom) return custom;
    if (method === 'thread/start') return { thread: { id: 'thread-1' } };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    return {};
  };
  const metadata = {};
  const launch = createRoutineRunner({ context: async () => HOST, rpc,
    prepareWorktree: async (p) => `${p.cwd}/.code/worktrees/wt-1`, setSessionMetadata: (id, patch) => { metadata[id] = { ...metadata[id], ...patch }; } });
  const service = createLocalRoutines({ getState: () => rows,
    commit: (value) => { rows = structuredClone(value); for (const listener of listeners) listener({ kind: 'local-routines' }); },
    dataDir, approveFolder: (value) => { if (!approved.has(value)) throw new Error('Unknown workspace directory.'); return value; },
    captureOptions: async (execution, previous) => captureRoutineOptions({ config: { model: 'fixture-model', permission: 'ask' }, ...HOST, execution, previous }),
    launch, setTimer: () => 1, clearTimer: () => {} });
  service.start();
  t.after(() => service.dispose());
  const call = async (channel, p) => {
    calls.push([channel, p]);
    if (channel === 'local-routines') return service.request(p);
    if (channel === 'folder') { const real = fs.realpathSync(p.path); approved.add(real); return real; }
    if (channel === 'workspace-git-branches') { if (!approved.has(p.cwd)) throw new Error('Unknown workspace directory.'); return ['main', 'feature/x']; }
    if (channel === 'workspace-info') return { isRepo: p.cwd.endsWith('repo') };
    if (channel === 'detected-projects') return [{ path: dataDir, name: 'data', source: 'vscode', lastActivity: 1 }];
    throw new Error(`unexpected ${channel}`);
  };
  const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
  return { call, calls, service, metadata, rows: () => rows, subscribe, dir: (name) => { const d = path.join(dataDir, name); fs.mkdirSync(d, { recursive: true }); return d; } };
}

const FORM = { name: 'nightly-tests', displayName: 'Nightly tests', prompt: 'Run the tests.', description: 'Every night', cronExpression: '0 9 * * *' };

test('permission names map both ways and models become the form catalog', () => {
  assert.equal(toHostPermission('default'), 'ask');
  assert.equal(toHostPermission('bypassPermissions'), 'bypass');
  assert.equal(toHostPermission('auto'), 'auto');
  assert.equal(toOfficialPermission('ask'), 'default');
  assert.equal(toOfficialPermission('bypass'), 'bypassPermissions');
  assert.equal(toOfficialPermission(undefined), undefined);
  assert.deepEqual(codeRoutineModels([{ model: 'm1', displayName: 'Model one' }, { id: 'm2' }, null]), [{ id: 'm1', name: 'Model one' }, { id: 'm2', name: 'm2' }]);
});

test('a local-routines Code row reads as the official CCD task (bv)', () => {
  const row = { id: 'id-1', kind: 'code', name: 'Nightly tests', description: 'd', prompt: 'p', cwd: '/repo', cron: '0 9 * * *', fireAt: null,
    enabled: true, createdAt: 1, lastRunAt: Date.UTC(2026, 9, 17, 9), nextRunAt: Date.UTC(2026, 9, 18, 9), options: { model: 'm', permission: 'ask' },
    useWorktree: true, sourceBranch: 'main', missedRuns: [{ time: '2026-10-16T09:00:00.000Z', reason: 'per_task_limit' }, { time: '2026-10-15T09:00:00.000Z' }, { bad: 1 }], runs: [] };
  const task = codeScheduledTask(row);
  assert.deepEqual(task, { id: 'id-1', displayName: 'Nightly tests', description: 'd', prompt: 'p', enabled: true, cronExpression: '0 9 * * *', createdAt: 1,
    lastRunAt: '2026-10-17T09:00:00.000Z', nextRunAt: '2026-10-18T09:00:00.000Z', model: 'm', cwd: '/repo', useWorktree: true, sourceBranch: 'main',
    permissionMode: 'default', missedRuns: [{ time: '2026-10-16T09:00:00.000Z', reason: 'per_task_limit' }, { time: '2026-10-15T09:00:00.000Z' }],
    approvedPermissions: [] });
  // No file, place, waiting or jitter: the host has none (hostGaps 4, 5, 9).
  for (const key of ['filePath', 'fileReadError', 'place', 'waiting', 'jitterSeconds']) assert.ok(!(key in task), key);
  // RT6 (hostGap 7): the task's Always allowed rules as the official list, one per toolName\0ruleContent.
  assert.deepEqual(codeScheduledTask({ ...row, approvedPermissions: [{ toolName: 'Bash', ruleContent: 'npm test', cwd: '', approvedAt: 1 },
    { toolName: 'Bash', ruleContent: 'npm test', cwd: 'pkg' }, { toolName: 'Bash', ruleContent: 'ls', cwd: '', escalation: 'workspace-write' }, { cwd: '' }] }).approvedPermissions,
    [{ toolName: 'Bash', ruleContent: 'npm test' }, { toolName: 'Bash', ruleContent: 'ls' }]);
  // A source branch without a worktree is not part of the task (the dispatch drops it too).
  assert.ok(!('sourceBranch' in codeScheduledTask({ ...row, useWorktree: false })));
  assert.equal(codeScheduledTask({ ...row, cron: null, fireAt: 5 }).fireAt, 5);
});

test('the official create / update payloads become local-routines requests', () => {
  const profile = { model: 'host-model', permission: 'auto' };
  assert.deepEqual(codeScheduledTaskRequest({ ...FORM, cwd: '/repo', model: undefined, useWorktree: true, sourceBranch: undefined, permissionMode: undefined }, undefined, profile), {
    action: 'create', kind: 'code', name: 'Nightly tests', description: 'Every night', prompt: 'Run the tests.', folder: '/repo', cron: '0 9 * * *', fireAt: null,
    useWorktree: true, sourceBranch: '', execution: { model: 'host-model', permission: 'auto' } });
  const previous = { id: 'id-1', name: 'Old', prompt: 'old', cron: '0 9 * * *', fireAt: null, options: { model: 'm', permission: 'ask' } };
  // Yt "once" on a cron task: cronExpression undefined clears the schedule (manual only).
  const update = codeScheduledTaskRequest({ scheduledTaskId: 'id-1', prompt: 'new', description: 'x', cronExpression: undefined, cwd: '/repo', model: 'alternate',
    useWorktree: false, sourceBranch: undefined, permissionMode: 'bypassPermissions' }, previous, profile);
  assert.deepEqual(update, { action: 'update', id: 'id-1', name: 'Old', description: 'x', prompt: 'new', folder: '/repo', cron: '', fireAt: null,
    useWorktree: false, sourceBranch: undefined, execution: { model: 'alternate', permission: 'bypass' } });
  // Yt "fireAt" ({}): the one-time schedule stays.
  assert.equal(codeScheduledTaskRequest({ scheduledTaskId: 'id-1', prompt: 'p' }, { ...previous, cron: null, fireAt: 99 }, profile).fireAt, 99);
});

test('the bridge creates, edits, pauses and deletes Code tasks in the scheduler; folder and branch are validated', async (t) => {
  const h = host(t);
  const bridge = createCodeRoutinesBridge({ call: h.call, subscribe: h.subscribe, executionProfile: () => ({ model: 'fixture-model', permission: 'ask' }) });
  // Code tasks need a folder (official folderRequired, no scratch directory).
  await assert.rejects(bridge.createScheduledTask({ ...FORM, cwd: undefined }), /^Error: Select a folder\.$/);
  // A worktree's source branch must be a branch name (git check-ref-format, in the scheduler).
  const repo = h.dir('repo');
  await assert.rejects(bridge.createScheduledTask({ ...FORM, cwd: repo, useWorktree: true, sourceBranch: '-bad' }), /Enter a valid branch name\./);
  await assert.rejects(bridge.createScheduledTask({ ...FORM, cwd: repo, useWorktree: true, sourceBranch: 'a..b' }), /Enter a valid branch name\./);
  const events = [];
  const unsubscribe = bridge.onOnScheduledTaskEvent((event) => events.push(event.type));
  const created = await bridge.createScheduledTask({ ...FORM, cwd: repo, useWorktree: true, sourceBranch: 'feature/x', permissionMode: 'auto' });
  // The picked folder was approved before the save (main.cjs 'folder' additional + path).
  assert.ok(h.calls.some(([channel, p]) => channel === 'folder' && p.additional === true && p.path === repo));
  assert.equal(created.displayName, 'Nightly tests');
  assert.equal(created.cwd, repo);
  assert.equal(created.useWorktree, true);
  assert.equal(created.sourceBranch, 'feature/x');
  assert.equal(created.permissionMode, 'auto');
  assert.equal(h.rows()[0].kind, 'code');
  assert.ok(events.length > 0 && events.every((type) => type === 'scheduled_task_updated'));
  // The list is Code tasks only, in the official shape.
  await h.service.request({ action: 'create', name: 'Cowork task', prompt: 'p', cron: '' });
  const list = await bridge.getAllScheduledTasks();
  assert.deepEqual(list.map((task) => task.id), [created.id]);
  // Update keeps the task, turns the worktree off (the branch goes with it) and maps the permission back.
  const updated = await bridge.updateScheduledTask({ scheduledTaskId: created.id, displayName: 'Renamed', prompt: 'Run more tests.', description: 'd',
    cronExpression: '0 10 * * *', cwd: repo, model: undefined, useWorktree: false, sourceBranch: undefined, permissionMode: 'default' });
  assert.equal(updated.displayName, 'Renamed');
  assert.equal(updated.cronExpression, '0 10 * * *');
  assert.equal(updated.useWorktree, false);
  assert.ok(!('sourceBranch' in updated));
  assert.equal(updated.permissionMode, 'default');
  await assert.rejects(bridge.updateScheduledTask({ scheduledTaskId: 'missing', prompt: 'p' }), /Scheduled task not found\./);
  assert.equal(await bridge.updateScheduledTaskStatus(created.id, 'disabled'), true);
  assert.equal(h.rows().find((task) => task.id === created.id).enabled, false);
  assert.equal(await bridge.updateScheduledTaskStatus(created.id, 'enabled'), true);
  assert.equal(await bridge.updateScheduledTaskStatus(created.id, 'bogus'), false);
  // RT6 (hostGap 7): the detail's chip removes the task's rule (main adds it; the bridge has no way to).
  h.service.rememberApproval(created.id, { toolName: 'Bash', ruleContent: 'npm test', cwd: '' });
  assert.deepEqual((await bridge.getAllScheduledTasks()).find((task) => task.id === created.id).approvedPermissions, [{ toolName: 'Bash', ruleContent: 'npm test' }]);
  assert.equal(await bridge.removeApprovedPermission(created.id, 'Bash', 'npm test'), true);
  assert.deepEqual(h.calls.at(-1), ['local-routines', { action: 'remove-approval', id: created.id, toolName: 'Bash', ruleContent: 'npm test' }]);
  assert.deepEqual((await bridge.getAllScheduledTasks()).find((task) => task.id === created.id).approvedPermissions, []);
  assert.equal(await bridge.updateScheduledTaskStatus(created.id, 'deleted', true), true);
  assert.deepEqual(await bridge.getAllScheduledTasks(), []);
  unsubscribe();
  const before = events.length;
  await h.service.request({ action: 'create', name: 'Another', prompt: 'p', cron: '' });
  assert.equal(events.length, before);
  // Bridge methods the host has no counterpart for are absent (hostGap 5).
  assert.ok(!('getScheduledTaskFileContent' in bridge));
});

test('Run now goes to the main process runner: a session id on success, the categorised launch error otherwise', async (t) => {
  const h = host(t);
  const bridge = createCodeRoutinesBridge({ call: h.call, subscribe: h.subscribe });
  const sessions = createCodeLocalSessions({ call: h.call });
  const repo = h.dir('repo');
  const task = await bridge.createScheduledTask({ ...FORM, cwd: repo });
  assert.deepEqual(await sessions.start({ scheduledTaskId: task.id, message: '<scheduled-task …>', title: 'Nightly tests', scheduledTaskManualStart: true }), { sessionId: 'thread-1' });
  assert.ok(h.calls.some(([channel, p]) => channel === 'local-routines' && p.action === 'run' && p.id === task.id));
  assert.equal(h.rows()[0].runs[0].threadId, 'thread-1');
  // The runner records the task on the session (sessionMetadata.scheduledTaskId).
  assert.equal(h.metadata['thread-1'].scheduledTaskId, task.id);
  h.service.observe({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } } });
  assert.equal(h.rows()[0].runs[0].status, 'completed');
  // The folder is gone: the runner's cwd_not_found suffix ends the rejected message (Hc words it, cov11-01).
  fs.rmSync(repo, { recursive: true, force: true });
  await assert.rejects(sessions.start({ scheduledTaskId: task.id }), (error) => /\[ccdErrorCategory:cwd_not_found\]$/.test(error.message));
  await assert.rejects(sessions.start({}), /Scheduled task not found\./);
  // A core failure the host can classify carries its category too.
  const busy = host(t, { rpcResult: (method) => method === 'turn/start' ? { __codeDesktopRpcError: { message: 'Overloaded', code: -32000, data: { codexErrorInfo: 'serverOverloaded' } } } : null });
  const busyBridge = createCodeRoutinesBridge({ call: busy.call });
  const busyTask = await busyBridge.createScheduledTask({ ...FORM, cwd: busy.dir('repo') });
  await assert.rejects(createCodeLocalSessions({ call: busy.call }).start({ scheduledTaskId: busyTask.id }), /Overloaded/);
});

test('branches, detected projects, folder picking and the git check read the host', async (t) => {
  const h = host(t);
  const sessions = createCodeLocalSessions({ call: h.call });
  const repo = h.dir('repo');
  // A folder picked from the recents is approved before its branches are read.
  assert.deepEqual(await sessions.getLocalBranches(repo), ['main', 'feature/x']);
  assert.equal((await sessions.getDetectedProjects())[0].source, 'vscode');
  assert.equal(await sessions.isGitRepo(repo), true);
  assert.equal(await sessions.isGitRepo(h.dir('plain')), false);
  const picked = createCodeLocalSessions({ call: async (channel, p) => (channel === 'folder' && p.additional && !p.path ? null : undefined) });
  assert.equal(await picked.browseFolder('Choose a folder'), undefined);
});

test('the sessions store rows: runs with a session and sessions that name a task', () => {
  const rows = [{ id: 'task-1', runs: [
    { id: 'r3', status: 'running', startedAt: 3000, threadId: 'thread-3' },
    { id: 'r2', status: 'failed', startedAt: 2000, finishedAt: 2500, threadId: 'thread-2', error: 'Turn failed' },
    { id: 'r1', status: 'failed', startedAt: 1000, error: 'Folder not found [ccdErrorCategory:cwd_not_found]' },
  ] }];
  const sessions = [{ id: 'thread-3', name: 'Nightly run', updatedAt: 3 }, { id: 'thread-2', name: 'Earlier', archived: true, updatedAt: 2 },
    { id: 'thread-9', name: 'Old run', createdAt: 1 }];
  const metadata = { 'thread-9': { scheduledTaskId: 'task-1' }, 'thread-x': { scheduledTaskId: 'other-task' } };
  const state = { approvals: [{ params: { threadId: 'thread-3' } }], active: {}, threadParents: {} };
  const store = codeRoutineSessions(rows, { sessions, metadata, state });
  assert.deepEqual(store.map((row) => row.sessionId), ['thread-3', 'thread-2', 'thread-9']);
  assert.deepEqual(store[0], { sessionId: 'thread-3', scheduledTaskId: 'task-1', isRunning: true, isArchived: false, title: 'Nightly run', createdAt: 3000,
    lastActivityAt: 3000, pendingToolPermissions: [{ params: { threadId: 'thread-3' } }] });
  assert.equal(store[1].error, 'Turn failed');
  assert.equal(store[1].isArchived, true);
  assert.equal(store[1].lastActivityAt, 2500);
  // A launch that failed before its session existed has no row (it is a toast or a missed run instead).
  assert.ok(!store.some((row) => row.error?.includes('cwd_not_found')));
  assert.equal(store[2].createdAt, 1000);
});

test('routines links select a task, the create page or the list', () => {
  assert.deepEqual(routineHrefTarget('/code/routines/abc%20d'), { id: 'abc d' });
  assert.deepEqual(routineHrefTarget('/epitaxy/scheduled/xyz?tab=1'), { id: 'xyz' });
  assert.deepEqual(routineHrefTarget('/scheduled-task/t1'), { id: 't1' });
  assert.deepEqual(routineHrefTarget('/code/routines/new-local'), { id: 'new-local' });
  assert.deepEqual(routineHrefTarget('/code/routines'), { id: null });
  assert.deepEqual(routineHrefTarget(-1), { id: null });
  assert.equal(routineHrefTarget('/code/sessions/abc'), null);
  assert.equal(routineHrefTarget('/code/routines/a/b'), null);
});
