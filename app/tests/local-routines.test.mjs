import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { createRoutineRunner, captureRoutineOptions } from '../electron/routine-runner.mjs';

async function fixture(t, launch = async () => {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-routines-'));
  let state = [], clock = new Date(2026, 9, 11, 9, 0).getTime();
  const options = { coreId: 'fixture', model: 'fixture-model', effort: 'low', permission: 'ask', networkAccess: false };
  const service = createLocalRoutines({ getState: () => state, commit: value => { state = structuredClone(value); },
    dataDir, approveFolder: value => { if (value !== dataDir) throw new Error('Unapproved folder'); return value; },
    captureOptions: async (execution, previous) => captureRoutineOptions({ config: options, coreId: 'fixture',
      models: [{ model: 'fixture-model' }, { model: 'alternate', defaultReasoningEffort: 'medium' }], execution, previous }),
    launch, now: () => clock, setTimer: () => 1, clearTimer: () => {} });
  t.after(async () => { service.dispose(); await fs.rm(dataDir, { recursive: true, force: true }); });
  return { service, dataDir, options, setTime: value => { clock = value; }, now: () => clock,
    state: () => structuredClone(state), restore: value => { state = structuredClone(value); },
    create: patch => service.request({ action: 'create', name: 'Morning brief', prompt: 'Summarize the notes.', cron: '* * * * *', ...patch }) };
}

test('durable schedules validate input and approved folders, preserve runs on edits and pause deadlines', async t => {
  const f = await fixture(t); f.service.start();
  await assert.rejects(f.create({ cron: '61 * * * *' }), /minute/);
  await assert.rejects(f.create({ folder: '/' }), /Unapproved/);
  await assert.rejects(f.create({ cron: '', fireAt: f.now() - 1 }), /future/);
  const task = await f.create();
  assert.ok((await fs.stat(task.cwd)).isDirectory());
  assert.equal(task.nextRunAt, f.now() + 60000);
  assert.deepEqual(task.options, f.options);
  const edited = await f.service.request({ action: 'update', id: task.id, name: 'Updated before first run', prompt: task.prompt, cron: task.cron, folder: task.cwd });
  assert.equal(edited.cwd, task.cwd);
  assert.equal(edited.runs.length, 0);
  await f.service.request({ action: 'toggle', id: task.id, enabled: false });
  assert.equal(f.state()[0].nextRunAt, null);
  f.setTime(f.now() + 120000); await f.service.tick();
  assert.equal(f.state()[0].runs.length, 0);
  await f.service.request({ action: 'toggle', id: task.id, enabled: true });
  assert.equal(f.state()[0].nextRunAt, f.now() + 60000);
  await f.service.request({ action: 'delete', id: task.id });
  await assert.rejects(f.service.request({ action: 'run', id: task.id }), /not found/);
});

test('a scheduled launch reserves its occurrence, skips overlapping work and captures an early completion', async t => {
  let release, count = 0;
  const f = await fixture(t, async (task, { attach }) => {
    count++; attach('task-thread');
    if (count === 1) await new Promise(resolve => { release = resolve; });
    f.service.observe({ method: 'turn/completed', params: { threadId: 'task-thread', turn: { id: 'turn', status: 'completed' } } });
    return { turnId: 'turn' };
  });
  f.service.start(); const task = await f.create();
  f.setTime(task.nextRunAt); const pending = f.service.tick();
  assert.equal(f.state()[0].runs[0].status, 'running');
  await assert.rejects(f.service.request({ action: 'run', id: task.id }), /already running/);
  f.setTime(f.now() + 60000); await f.service.tick();
  assert.equal(count, 1); assert.equal(f.state()[0].skippedAt, f.now());
  release(); await pending;
  assert.equal(f.state()[0].runs[0].status, 'completed');
  assert.equal(f.state()[0].runs[0].turnId, 'turn');
});

test('restart skips missed dates, marks unconfirmed work interrupted and keeps history', async t => {
  const f = await fixture(t); const at = f.now();
  const daily = await f.create(); const once = await f.create({ cron: '', fireAt: at + 60000 });
  await f.service.request({ action: 'run', id: daily.id });
  const persisted = f.state();
  f.setTime(at + 3600000); f.restore(persisted); f.service.start();
  assert.equal(f.state()[0].runs[0].status, 'interrupted');
  assert.equal(f.state()[0].nextRunAt, f.now() + 60000);
  assert.equal(f.state().find(task => task.id === once.id).enabled, false);
  assert.equal(f.state().find(task => task.id === once.id).nextRunAt, null);
});

test('form settings persist, validate model and permission, and preserve completed one-shot schedules on edits', async t => {
  const f = await fixture(t);
  const task = await f.create({ description: ' Daily notes ', execution: { model: 'alternate', permission: 'plan' } });
  assert.equal(task.description, 'Daily notes');
  assert.deepEqual(task.options, { ...f.options, model: 'alternate', permission: 'plan', effort: 'medium' });
  await assert.rejects(f.create({ execution: { model: 'missing' } }), /available model/);
  await assert.rejects(f.create({ execution: { permission: 'unknown' } }), /permission mode/);
  await assert.rejects(f.create({ description: 'a'.repeat(2001) }), /Description/);
  const updated = await f.service.request({ action: 'update', id: task.id, name: task.name, prompt: task.prompt,
    cron: task.cron, execution: { model: 'fixture-model', permission: 'acceptEdits' } });
  assert.equal(updated.options.model, 'fixture-model');
  assert.equal(updated.options.permission, 'acceptEdits');
  assert.equal(updated.description, 'Daily notes');
  const once = await f.create({ cron: '', fireAt: f.now() + 1000 });
  f.setTime(f.now() + 2000); f.service.start();
  const renamed = await f.service.request({ action: 'update', id: once.id, name: 'Past one-shot', prompt: once.prompt, fireAt: once.fireAt });
  assert.equal(renamed.fireAt, once.fireAt);
  assert.equal(renamed.enabled, false);
  assert.equal(renamed.nextRunAt, null);
  await assert.rejects(f.service.request({ action: 'update', id: once.id, name: once.name, prompt: once.prompt, fireAt: once.fireAt, enabled: true }), /future time/);
  assert.throws(() => captureRoutineOptions({ config: f.options, coreId: 'other', models: [], previous: task.options, execution: { model: 'alternate' } }), /Switch to fixture/);
});

test('one-shot failures are visible and cannot loop', async t => {
  const f = await fixture(t, async () => { throw new Error('Model unavailable'); });
  f.service.start(); const task = await f.create({ cron: '', fireAt: f.now() + 60000 });
  f.setTime(task.nextRunAt); await f.service.tick(); await f.service.tick();
  assert.equal(f.state()[0].runs.length, 1);
  assert.equal(f.state()[0].runs[0].status, 'failed');
  assert.equal(f.state()[0].runs[0].error, 'Model unavailable');
  assert.equal(f.state()[0].enabled, false);
  assert.equal(f.state()[0].nextRunAt, null);
});

test('editing during a run keeps its live journal; disconnect aborts further launch steps', async t => {
  let resume, continued = false;
  const f = await fixture(t, async (task, { attach, assertActive }) => {
    attach('thread');
    await new Promise(resolve => { resume = resolve; });
    assertActive(); continued = true;
  });
  f.service.start(); const task = await f.create();
  const run = f.service.request({ action: 'run', id: task.id });
  const edited = await f.service.request({ action: 'update', id: task.id, name: 'Changed', prompt: 'New prompt', cron: task.cron });
  assert.equal(edited.runs[0].threadId, 'thread');
  assert.equal(edited.runs[0].status, 'running');
  assert.deepEqual(edited.options, task.options);
  f.service.observe({ kind: 'connection', connected: false });
  resume(); await run;
  assert.equal(continued, false);
  assert.equal(f.state()[0].runs[0].status, 'interrupted');
  assert.equal(f.state()[0].name, 'Changed');
});

test('deleting a pending launch prevents it sending its turn and does not recreate the task', async t => {
  let resume, sent = false;
  const f = await fixture(t, async (task, { attach }) => {
    await new Promise(resolve => { resume = resolve; });
    attach('late-thread'); sent = true;
  });
  f.service.start(); const task = await f.create();
  const pending = f.service.request({ action: 'run', id: task.id });
  await f.service.request({ action: 'delete', id: task.id });
  resume(); await pending;
  assert.equal(sent, false); assert.deepEqual(f.state(), []);
});

test('runner uses Cowork policies, registers before sending and refuses model/core substitution', async () => {
  let host = { owner: {}, coreId: 'fixture', models: [{ model: 'model', isDefault: true }], hints: true, autoReview: false };
  const options = captureRoutineOptions({ config: { model: 'model', permission: 'ask' }, ...host });
  const calls = [];
  const launch = createRoutineRunner({ context: async () => host, rpc: async ({ method, params }) => {
    calls.push({ method, params });
    if (method === 'thread/start') return { thread: { id: 'thread' } };
    if (method === 'turn/start') { assert.equal(calls.at(-3).method, 'attached'); return { turn: { id: 'turn' } }; }
    return {};
  } });
  await launch({ name: 'Task', prompt: 'Do work', cwd: '/project', options }, { attach: id => calls.push({ method: 'attached', id }) });
  assert.equal(calls[0].params.codeDesktop.surface, 'cowork');
  assert.equal(calls[0].params.approvalPolicy, 'untrusted');
  assert.equal(calls.at(-1).params.codeDesktop.permissionMode, 'ask');
  assert.deepEqual(calls.at(-1).params.sandboxPolicy.writableRoots, ['/project']);
  assert.equal(calls.at(-1).params.sandboxPolicy.networkAccess, false);
  host = { ...host, coreId: 'different' };
  await assert.rejects(launch({ options }, { attach() {} }), /Switch to/);
  assert.equal(calls.length, 4);
  host = { ...host, coreId: 'fixture', models: [] };
  await assert.rejects(launch({ options }, { attach() {} }), /unavailable/);
});

// R4g-routines RT1 (research/r4-code-routines.md WI-1): Code and Cowork stores, worktree fields, missedRuns.
test('legacy rows become Cowork rows without losing history; list filters by kind', async t => {
  const f = await fixture(t);
  const legacy = await f.create();
  await f.service.request({ action: 'run', id: legacy.id });
  const persisted = f.state().map(({ kind, ...row }) => row);
  assert.equal(persisted[0].kind, undefined);
  f.restore(persisted);
  assert.deepEqual((await f.service.request({ action: 'list', kind: 'cowork' })).map(task => task.id), [legacy.id]);
  f.service.start();
  assert.equal(f.state()[0].kind, 'cowork');
  assert.equal(f.state()[0].runs.length, 1);
  const code = await f.create({ kind: 'code', folder: f.dataDir });
  assert.equal(code.kind, 'code');
  assert.deepEqual((await f.service.request({ action: 'list', kind: 'code' })).map(task => task.id), [code.id]);
  assert.deepEqual((await f.service.request({ action: 'list', kind: 'cowork' })).map(task => task.id), [legacy.id]);
  assert.equal((await f.service.request({ action: 'list' })).length, 2);
  assert.deepEqual(f.service.list('code').map(task => task.id), [code.id]);
  await assert.rejects(f.service.request({ action: 'list', kind: 'cloud' }), /kind/);
  await assert.rejects(f.create({ kind: 'cloud' }), /kind/);
  await assert.rejects(f.service.request({ action: 'update', id: legacy.id, name: 'x', prompt: 'y', cron: legacy.cron, kind: 'code' }), /move between Code and Cowork/);
  const renamed = await f.service.request({ action: 'update', id: code.id, name: 'Renamed', prompt: 'y', cron: code.cron });
  assert.equal(renamed.kind, 'code');
});

test('Code tasks need a folder and validate worktree source branches', async t => {
  const f = await fixture(t);
  await assert.rejects(f.create({ kind: 'code' }), /^Error: Select a folder\.$/);
  await assert.rejects(f.create({ useWorktree: true }), /only available for Code/);
  for (const sourceBranch of ['-main', 'a..b', 'feat/', 'a b', 'x.lock', 'a/.hidden', 'a@{1}', '@', 'a~1', 'a\\b', 'a//b'])
    await assert.rejects(f.create({ kind: 'code', folder: f.dataDir, useWorktree: true, sourceBranch }), /valid branch/, sourceBranch);
  await assert.rejects(f.create({ kind: 'code', folder: f.dataDir, useWorktree: 'yes' }), /worktree/);
  const task = await f.create({ kind: 'code', folder: f.dataDir, useWorktree: true, sourceBranch: 'feature/x-1' });
  assert.equal(task.cwd, f.dataDir);
  assert.equal(task.useWorktree, true);
  assert.equal(task.sourceBranch, 'feature/x-1');
  assert.deepEqual(task.missedRuns, []);
  const kept = await f.service.request({ action: 'update', id: task.id, name: task.name, prompt: task.prompt, cron: task.cron });
  assert.equal(kept.cwd, f.dataDir); assert.equal(kept.sourceBranch, 'feature/x-1');
  const plain = await f.service.request({ action: 'update', id: task.id, name: task.name, prompt: task.prompt, cron: task.cron, useWorktree: false });
  assert.equal(plain.useWorktree, false); assert.equal('sourceBranch' in plain, false);
  const current = await f.service.request({ action: 'update', id: task.id, name: task.name, prompt: task.prompt, cron: task.cron, useWorktree: true, sourceBranch: '' });
  assert.equal(current.useWorktree, true); assert.equal('sourceBranch' in current, false);
  const cowork = await f.create();
  assert.equal(cowork.kind, 'cowork'); assert.equal('useWorktree' in cowork, false);
});

test('missedRuns record overlap, restart and sleep skips, newest first and at most 50', async t => {
  let release;
  const f = await fixture(t, async (task, { attach }) => { attach('thread'); await new Promise(resolve => { release = resolve; }); });
  f.service.start(); const task = await f.create();
  const first = task.nextRunAt;
  f.setTime(first); const pending = f.service.tick();
  f.setTime(first + 60000); await f.service.tick();
  assert.deepEqual(f.state()[0].missedRuns, [{ time: new Date(first + 60000).toISOString(), reason: 'per_task_limit' }]);
  f.service.observe({ method: 'turn/completed', params: { threadId: 'thread', turn: { id: 'turn', status: 'completed' } } });
  release(); await pending;
  // A late timer (sleep) runs the latest occurrence and records the one before it.
  const deadline = f.state()[0].nextRunAt;
  f.setTime(deadline + 5 * 60000 + 30000);
  const late = f.service.tick(); release(); await late;
  assert.equal(f.state()[0].missedRuns[0].time, new Date(deadline + 4 * 60000).toISOString());
  assert.equal('reason' in f.state()[0].missedRuns[0], false);
  // Restart: the latest occurrence while the app was closed, without a reason.
  const persisted = f.state(); const closed = persisted[0].nextRunAt;
  const again = await fixture(t);
  again.restore(persisted.map(row => ({ ...row, runs: [] }))); again.setTime(closed + 3 * 3600000); again.service.start();
  assert.equal(again.state()[0].missedRuns[0].time, new Date(closed + 3 * 3600000).toISOString());
  assert.equal(again.state()[0].missedRuns.length, 3);
  // Cap and 7-day window.
  const old = Array.from({ length: 60 }, (_, index) => ({ time: new Date(again.now() - (index + 1) * 60000).toISOString() }));
  again.restore([{ ...again.state()[0], missedRuns: [...old, { time: new Date(again.now() - 8 * 864e5).toISOString() }], nextRunAt: again.now() - 1 }]);
  const restarted = await fixture(t); restarted.restore(again.state()); restarted.setTime(again.now()); restarted.service.start();
  assert.equal(restarted.state()[0].missedRuns.length, 50);
  assert.equal(restarted.state()[0].missedRuns[0].time, new Date(again.now()).toISOString());
});

test('a one-shot missed while closed is recorded at its fire time', async t => {
  const f = await fixture(t); const task = await f.create({ cron: '', fireAt: f.now() + 60000 });
  const persisted = f.state(); f.setTime(task.fireAt + 3600000); f.restore(persisted); f.service.start();
  assert.deepEqual(f.state()[0].missedRuns, [{ time: new Date(task.fireAt).toISOString() }]);
  assert.equal(f.state()[0].enabled, false);
});

test('scheduled launch failures before a session are missed runs; Code Run now rethrows the launch error', async t => {
  let failure = new Error('Folder not found: /gone [ccdErrorCategory:cwd_not_found]'), attachFirst = false;
  const f = await fixture(t, async (task, { attach }) => { if (attachFirst) attach('thread'); throw failure; });
  f.service.start();
  const code = await f.create({ kind: 'code', folder: f.dataDir });
  f.setTime(code.nextRunAt); await f.service.tick();
  const row = () => f.state().find(task => task.id === code.id);
  assert.equal(row().runs[0].status, 'failed');
  assert.equal(row().runs[0].error, failure.message);
  assert.deepEqual(row().missedRuns, [{ time: new Date(code.nextRunAt).toISOString(), reason: 'folder_missing', detail: failure.message }]);
  failure = new Error('The core is not connected.');
  f.setTime(row().nextRunAt); await f.service.tick();
  assert.equal(row().missedRuns[0].reason, 'start_failed');
  assert.equal(row().missedRuns.length, 2);
  attachFirst = true; failure = new Error('turn/start failed');
  f.setTime(row().nextRunAt); await f.service.tick();
  assert.equal(row().missedRuns.length, 2, 'a failure after the session exists is shown in History, not as a missed run');
  assert.equal(row().runs[0].threadId, 'thread');
  attachFirst = false; failure = new Error('Folder not found: /gone [ccdErrorCategory:cwd_not_found]');
  await assert.rejects(f.service.request({ action: 'run', id: code.id }), error => error === failure);
  assert.equal(row().runs[0].trigger, 'manual');
  assert.equal(row().runs[0].status, 'failed');
  assert.equal(row().missedRuns.length, 2);
  const cowork = await f.create({ name: 'Cowork brief' });
  const run = await f.service.request({ action: 'run', id: cowork.id });
  assert.equal(run.status, 'failed'); assert.equal(run.error, failure.message);
});

// R4g-routines RT6 (WI-6, hostGap 7): a Code task's Always allowed rules (routine-approvals.mjs adds them from main only).
test('Code tasks keep Always allowed rules: main adds them, remove-approval removes by the official key', async t => {
  const f = await fixture(t);
  const code = await f.create({ kind: 'code', folder: f.dataDir });
  const rule = { toolName: 'Bash', ruleContent: 'npm test', cwd: '' };
  assert.equal(f.service.rememberApproval(code.id, rule), true);
  assert.equal(f.service.rememberApproval(code.id, { ...rule }), false, 'the same rule is stored once');
  assert.equal(f.service.rememberApproval(code.id, { ...rule, cwd: 'pkg' }), true, 'another folder is another rule');
  assert.equal(f.service.rememberApproval(code.id, { ...rule, ruleContent: 'npm run lint', escalation: 'danger-full-access' }), true);
  for (const invalid of [{ toolName: 'Edit', ruleContent: 'x', cwd: '' }, { toolName: 'Bash', cwd: '' }, { ...rule, cwd: '../up' },
    { ...rule, cwd: '/abs' }, { ...rule, ruleContent: 'a\0b' }, { ...rule, escalation: 'x y' }, null])
    assert.equal(f.service.rememberApproval(code.id, invalid), false, JSON.stringify(invalid));
  const cowork = await f.create({ name: 'Cowork brief' });
  assert.equal(f.service.rememberApproval(cowork.id, rule), false, 'Cowork tasks keep no rules');
  assert.equal(f.service.rememberApproval('missing', rule), false);
  const row = () => f.state().find(task => task.id === code.id);
  assert.deepEqual(row().approvedPermissions.map(({ approvedAt, ...value }) => (assert.equal(approvedAt, f.now()), value)), [
    rule, { ...rule, cwd: 'pkg' }, { toolName: 'Bash', ruleContent: 'npm run lint', cwd: '', escalation: 'danger-full-access' }]);
  // The renderer cannot add a rule: there is no such request action.
  await assert.rejects(f.service.request({ action: 'add-approval', id: code.id, ...rule }), /Unknown scheduled task operation/);
  // Edits in the same folder keep them.
  const edited = await f.service.request({ action: 'update', id: code.id, name: 'Renamed', prompt: code.prompt, cron: code.cron, folder: f.dataDir });
  assert.equal(edited.approvedPermissions.length, 3);
  await assert.rejects(f.service.request({ action: 'remove-approval', id: code.id }), /approval to remove/);
  await assert.rejects(f.service.request({ action: 'remove-approval', id: 'missing', toolName: 'Bash' }), /not found/);
  // The official key (toolName\0ruleContent) removes both folders' rules for that command.
  const removed = await f.service.request({ action: 'remove-approval', id: code.id, toolName: 'Bash', ruleContent: 'npm test' });
  assert.deepEqual(removed.approvedPermissions.map(value => value.ruleContent), ['npm run lint']);
  assert.equal((await f.service.request({ action: 'remove-approval', id: code.id, toolName: 'Bash', ruleContent: 'nothing' })).approvedPermissions.length, 1);
  // No ruleContent removes every rule of the tool; the field goes with the last one.
  const cleared = await f.service.request({ action: 'remove-approval', id: code.id, toolName: 'Bash' });
  assert.equal('approvedPermissions' in cleared, false);
  assert.equal('approvedPermissions' in row(), false);
  // A task moved to another folder loses its rules.
  const other = await fs.mkdtemp(path.join(os.tmpdir(), 'local-routines-other-'));
  t.after(() => fs.rm(other, { recursive: true, force: true }));
  const g = await (async () => {
    let state = structuredClone(f.state());
    const service = createLocalRoutines({ getState: () => state, commit: value => { state = structuredClone(value); }, dataDir: f.dataDir,
      approveFolder: value => value, captureOptions: async () => f.options, launch: async () => {}, now: f.now, setTimer: () => 1, clearTimer: () => {} });
    t.after(() => service.dispose());
    return { service, state: () => state };
  })();
  g.service.rememberApproval(code.id, rule);
  const moved = await g.service.request({ action: 'update', id: code.id, name: 'Renamed', prompt: code.prompt, cron: code.cron, folder: other });
  assert.equal(moved.cwd, other);
  assert.equal('approvedPermissions' in moved, false);
});
