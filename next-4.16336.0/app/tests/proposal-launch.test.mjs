// R4f-proposal P3 (tasks-proposal-group-card WI-3): starting a proposed task from inside its session
// (src/proposal-launch.mjs) — the host's ordering of workspace-info / prepare-worktree, thread/start, the sidebar row,
// thread/name/set, turn/start and the "task-proposals" record (R4f-proposal P4's channel, stubbed here), against the
// 2.42304.0 spawner's local start (c96d752d0 F1e → LocalSessions.start). Then the spawner and that bridge together.
// Stubs only: no core, no IPC, no real folder, nothing navigates.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { launchProposal, createProposalBridge, withPersistedOutcomes, TASK_PROPOSALS_CHANNEL, proposalStartedRequest, proposalOutcomeRequest } from '../src/proposal-launch.mjs';
import { createProposalSpawner } from '../src/proposal-spawner.mjs';
import { GIT_FAILURE_MESSAGES, gitFailureFromMessage } from '../src/git-dialog-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const read = (...parts) => fs.readFileSync(path.join(reference, ...parts), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
setLocale(DEFAULT_LOCALE);

const PARENT = 'thr_parent';
const HOST_PERMISSION = { default: 'ask', acceptEdits: 'acceptEdits', plan: 'plan', auto: 'auto', bypassPermissions: 'bypass' };

// A stub core and main process that log every call in order.
function harness({ workspace = { isRepo: true, branch: 'main', branches: ['main'] }, failOn = {}, threadId = 'thr_child' } = {}) {
  const log = [];
  const fail = (name) => { if (failOn[name]) throw failOn[name] instanceof Error ? failOn[name] : new Error(`${name} failed`); };
  const call = async (name, payload) => {
    log.push(['call', name, payload]);
    fail(name);
    if (name === 'workspace-info') return workspace;
    if (name === 'prepare-worktree') return `${payload.cwd}/.code/worktrees/repo-1`;
    return { ok: true };
  };
  const rpc = async (method, params) => {
    log.push(['rpc', method, params]);
    fail(method);
    if (method === 'thread/start') return { thread: { id: threadId, cwd: params.cwd } };
    return {};
  };
  const deps = {
    call, rpc,
    toHostPermission: mode => HOST_PERMISSION[mode] ?? 'auto',
    threadStartParams: ({ cwd, model, permission }) => ({ cwd, model: model ?? null, permission, codeDesktop: { surface: 'code' } }),
    turnStartParams: ({ cwd, prompt, model, effort, permission }) => ({ input: [{ type: 'text', text: prompt }], cwd, model, effort, permission }),
    insertSession: (thread, info) => log.push(['insert', thread.id, info]),
    discardThread: (id) => log.push(['discard', id]),
  };
  return { log, deps, steps: () => log.map(entry => entry[0] === 'insert' || entry[0] === 'discard' ? entry[0] : `${entry[0]} ${entry[1]}`) };
}
const request = (extra = {}) => ({ parentId: PARENT, cwd: '/work/repo', title: 'Remove dead config option', prompt: 'Remove the unused `legacyMode` option from src/config.js.',
  spawnedFrom: { sessionId: PARENT, taskId: 'task_0a1b2c3d', title: 'Remove dead config option' }, useWorktree: true, model: 'gpt-5.5', effort: 'high', permissionMode: 'default', ...extra });

test('official: F1e\'s local start (LocalSessions.start with spawnedFrom, detached row) and main skipping a worktree outside Git', () => {
  const chunk = read('ion-dist/assets/v1', 'c96d752d0-BOCqU7c2.js');
  for (const text of [
    ',isScratchWorkspace:g?.isScratchWorkspace===!0&&E===g.originCwd,remote:b,family:x&&Roe(x.sessionId)}),{detached:!0,firstMessage:i})',
    's=A1e(await De({sessionId:ne,cwd:E,message:r(),messageUuid:n,title:v.title,',
    'function A1e(e){if(!e?.sessionId)throw o(Error("LocalSessions.start returned no sessionId")',
    'else X!==null&&cse(X),Si(X);',
    'x=v.id&&!_?{sessionId:l,taskId:v.id,title:v.title}:void 0,C=g?f$(v.cwd,g.originCwd,g.cwd):void 0,w=C!==void 0',
    'E=C??g?.originCwd??""',
    // The "not a Git repository" refusal is the cloud parent's picked-folder precondition only (`_` set), not a local start's.
    'else if(ee&&!m&&!n)return L(a.formatMessage(QQ.worktreeNeedsGit),"epitaxy: suggested-task precondition worktree-needs-git"),!1}E=t}',
  ]) assert.equal(count(chunk, text), 1, text);
  const worktrees = read('asar/.vite/build', 'index.chunk-BAdej_RQ.js');
  for (const text of ['Skipping worktree creation - ${x} is not a git repository`),null', 'code:"git_not_found",userMessage:"Git is required but was not found.'])
    assert.equal(count(worktrees, text), 1, text);
  // A skipped worktree (null) neither uses a worktree nor fails the start; a failed one throws.
  const sessions = read('asar/.vite/build', 'index.chunk-CFJssAFf.js');
  for (const text of ['if(j.worktreeMs=Date.now()-n,l?.success)w=l.worktree.path', 'else if(l&&!l.success)throw'])
    assert.equal(count(sessions, text), 1, text);
  // The research note (r4-proposal-group-card.md §5 step 2) proposed worktreeNeedsGit for a local start; that is
  // corrected here: a plain folder starts in place, as main does.
});

test('launchProposal: worktree, thread/start, the row, the title, the first turn, then the parent link — in that order', async () => {
  const { log, deps, steps } = harness();
  const result = await launchProposal(request(), deps);
  assert.deepEqual(result, { sessionId: 'thr_child', cwd: '/work/repo/.code/worktrees/repo-1', worktree: true, recorded: true });
  assert.deepEqual(steps(), ['call workspace-info', 'call prepare-worktree', 'rpc thread/start', 'insert', 'rpc thread/name/set', 'rpc turn/start', `call ${TASK_PROPOSALS_CHANNEL}`]);
  assert.deepEqual(log[1][2], { cwd: '/work/repo', branch: 'main' });
  assert.deepEqual(log[2][2], { cwd: '/work/repo/.code/worktrees/repo-1', model: 'gpt-5.5', permission: 'ask', codeDesktop: { surface: 'code' } });
  assert.deepEqual(log[3][2], { name: 'Remove dead config option', cwd: '/work/repo/.code/worktrees/repo-1', parentId: PARENT,
    spawnedFrom: { sessionId: PARENT, taskId: 'task_0a1b2c3d', title: 'Remove dead config option' }, model: 'gpt-5.5', effort: 'high', permission: 'ask' });
  assert.deepEqual(log[4][2], { threadId: 'thr_child', name: 'Remove dead config option' });
  assert.deepEqual(log[5][2], { threadId: 'thr_child', input: [{ type: 'text', text: 'Remove the unused `legacyMode` option from src/config.js.' }],
    cwd: '/work/repo/.code/worktrees/repo-1', model: 'gpt-5.5', effort: 'high', permission: 'ask' });
  assert.deepEqual(log[6][2], { operation: 'started', parentId: PARENT, childId: 'thr_child', taskId: 'task_0a1b2c3d' });
  assert.deepEqual(proposalStartedRequest({ parentId: 'a', childId: 'b', taskId: 'task_00000000' }), { operation: 'started', parentId: 'a', childId: 'b', taskId: 'task_00000000' });
  assert.deepEqual(proposalOutcomeRequest({ parentId: 'a', taskId: 'task_00000000', outcome: 'dismissed' }), { operation: 'outcome', parentId: 'a', taskId: 'task_00000000', outcome: 'dismissed' });
  // The parent's recorded source branch, when there is one, is the worktree's start point.
  const branch = harness();
  await launchProposal(request({ sourceBranch: 'feature/x' }), branch.deps);
  assert.deepEqual(branch.log[1][2], { cwd: '/work/repo', branch: 'feature/x' });
  // Locally: no Git calls at all.
  const local = harness();
  await launchProposal(request({ useWorktree: false, permissionMode: 'bypassPermissions' }), local.deps);
  assert.deepEqual(local.steps(), ['rpc thread/start', 'insert', 'rpc thread/name/set', 'rpc turn/start', `call ${TASK_PROPOSALS_CHANNEL}`]);
  assert.equal(local.log[0][2].permission, 'bypass');
});

test('launchProposal: a folder outside Git starts in place; Git that can\'t run inside a repository fails before any thread', async () => {
  const plain = harness({ workspace: { isRepo: false, branch: '', branches: [] } });
  const result = await launchProposal(request(), plain.deps);
  assert.deepEqual([result.cwd, result.worktree], ['/work/repo', false]);
  assert.deepEqual(plain.steps(), ['call workspace-info', 'rpc thread/start', 'insert', 'rpc thread/name/set', 'rpc turn/start', `call ${TASK_PROPOSALS_CHANNEL}`]);
  assert.equal(plain.log[1][2].cwd, '/work/repo');
  for (const reason of ['missing', 'exec_blocked', 'startup_failed']) {
    const broken = harness({ workspace: { isRepo: false, branch: '', branches: [], gitUnavailable: reason } });
    await assert.rejects(launchProposal(request(), broken.deps), (error) => {
      assert.equal(error.message, GIT_FAILURE_MESSAGES[reason]);
      assert.equal(gitFailureFromMessage(error.message).reason, reason, 'the Git dialog recognizes it');
      return true;
    });
    assert.deepEqual(broken.steps(), ['call workspace-info']);
  }
  // prepare-worktree refusing (e.g. a repository without commits) fails the start with nothing created.
  const refused = harness({ failOn: { 'prepare-worktree': new Error('fatal: invalid reference: HEAD') } });
  await assert.rejects(launchProposal(request(), refused.deps), /invalid reference/);
  assert.deepEqual(refused.steps(), ['call workspace-info', 'call prepare-worktree']);
});

test('launchProposal: a first turn that never started discards the empty thread; no parent link is written', async () => {
  const failed = harness({ failOn: { 'turn/start': new Error('The image could not be read.') } });
  await assert.rejects(launchProposal(request(), failed.deps), /image could not be read/);
  assert.deepEqual(failed.steps(), ['call workspace-info', 'call prepare-worktree', 'rpc thread/start', 'insert', 'rpc thread/name/set', 'rpc turn/start', 'discard']);
  assert.deepEqual(failed.log.at(-1), ['discard', 'thr_child']);
  // thread/start failing: nothing to discard.
  const noThread = harness({ failOn: { 'thread/start': new Error('disconnected') } });
  await assert.rejects(launchProposal(request(), noThread.deps), /disconnected/);
  assert.equal(noThread.log.some(entry => entry[0] === 'discard' || entry[0] === 'insert'), false);
  // A start that answers without a thread is A1e's error.
  const empty = harness();
  empty.deps.rpc = async (method) => (method === 'thread/start' ? {} : {});
  await assert.rejects(launchProposal(request(), empty.deps), /LocalSessions\.start returned no sessionId/);
  // A refused rename keeps the default title and still starts; a failed parent link still leaves the child running.
  const quirks = harness({ failOn: { 'thread/name/set': true, [TASK_PROPOSALS_CHANNEL]: true } });
  const result = await launchProposal(request(), quirks.deps);
  assert.deepEqual([result.sessionId, result.recorded], ['thr_child', false]);
  assert.ok(quirks.steps().includes('rpc turn/start'));
  // A task id that isn't spawn_task's shape writes no link; missing folder or prompt never reaches the core.
  const odd = harness();
  await launchProposal(request({ spawnedFrom: { sessionId: PARENT, taskId: 'whatever' } }), odd.deps);
  assert.equal(odd.steps().includes(`call ${TASK_PROPOSALS_CHANNEL}`), false);
  const none = harness();
  await assert.rejects(launchProposal(request({ cwd: '' }), none.deps));
  await assert.rejects(launchProposal(request({ prompt: '  ' }), none.deps));
  assert.deepEqual(none.log, []);
  // The caller may skip the rename (a core that names its own sessions).
  const named = harness();
  named.deps.nameThread = async () => { named.log.push(['named']); };
  await launchProposal(request(), named.deps);
  assert.equal(named.steps().includes('rpc thread/name/set'), false);
});

test('createProposalBridge: a dismissal is saved in main, then filed for later; a launched pop has nothing to remove on the host', async () => {
  const { log, deps } = harness();
  const bridge = createProposalBridge({ ...deps, sendMessage: async () => {} });
  assert.equal(await bridge.popById(PARENT, 'task_0a1b2c3d', true, { id: 'task_0a1b2c3d' }), true);
  assert.deepEqual(log, []);
  const record = { id: 'task_0a1b2c3d', title: 'T', tldr: 'Why', prompt: 'P', cwd: undefined, createdAt: 42 };
  assert.equal(await bridge.popById(PARENT, 'task_0a1b2c3d', false, record), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(log, [
    ['call', TASK_PROPOSALS_CHANNEL, { operation: 'outcome', parentId: PARENT, taskId: 'task_0a1b2c3d', outcome: 'dismissed' }],
    ['call', 'task-backlog-file', { sessionId: PARENT, source: 'dismissed', tasks: [{ taskId: 'task_0a1b2c3d', title: 'T', tldr: 'Why', prompt: 'P', cwd: undefined, suggestedAt: 42 }] }],
  ]);
  // The dismissal not saved: the pop fails (the spawner takes the outcome back) and nothing is filed.
  const down = harness({ failOn: { [TASK_PROPOSALS_CHANNEL]: true } });
  const downBridge = createProposalBridge({ ...down.deps, sendMessage: async () => {} });
  await assert.rejects(downBridge.popById(PARENT, 'task_0a1b2c3d', false, record));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(down.log.some(entry => entry[1] === 'task-backlog-file'), false);
  // withPersistedOutcomes: sent_here and start_failed go to main as they are recorded; dismissed goes through the pop.
  const saved = harness();
  const kept = [];
  const results = withPersistedOutcomes({ record: (...args) => kept.push(['record', ...args]), clear: (...args) => kept.push(['clear', ...args]) }, saved.deps.call);
  results.record(PARENT, 'task_0a1b2c3d', 'sent_here');
  results.record(PARENT, 'task_0a1b2c3e', 'start_failed');
  results.record(PARENT, 'task_0a1b2c3f', 'dismissed');
  results.record(PARENT, 'not-a-task', 'start_failed');
  results.clear(PARENT, 'task_0a1b2c3d');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(kept.length, 5);
  assert.deepEqual(saved.log.map(entry => entry[2]), [
    { operation: 'outcome', parentId: PARENT, taskId: 'task_0a1b2c3d', outcome: 'sent_here' },
    { operation: 'outcome', parentId: PARENT, taskId: 'task_0a1b2c3e', outcome: 'start_failed' }]);
});

test('spawner + bridge: Start all starts each proposal in turn in the background, a failure discards its empty thread, nothing navigates', async () => {
  const log = [], toasts = [];
  let threads = 0;
  const failing = new Set(['task_00000002']);
  const call = async (name, payload) => {
    log.push(`call ${name}${payload?.operation ? ` ${payload.operation}` : ''}`);
    if (name === 'workspace-info') return { isRepo: false, branch: '', branches: [] };
    return { ok: true };
  };
  let current = null;
  const rpc = async (method, params) => {
    log.push(`rpc ${method}`);
    if (method === 'thread/start') { threads += 1; current = `thr_child_${threads}`; return { thread: { id: current, cwd: params.cwd } }; }
    if (method === 'turn/start' && failing.has(params.taskForTest)) throw new Error('turn refused');
    return {};
  };
  const outcomes = new Map(), spawningSet = new Set();
  const bridge = createProposalBridge({ call, rpc, sendMessage: async () => log.push('send here'),
    toHostPermission: mode => HOST_PERMISSION[mode] ?? 'auto',
    threadStartParams: ({ cwd, model, permission }) => ({ cwd, model, permission }),
    turnStartParams: ({ prompt }) => ({ input: [{ type: 'text', text: prompt }], taskForTest: prompt.split(' ')[0] }),
    insertSession: (thread) => log.push(`insert ${thread.id}`),
    discardThread: (id) => log.push(`discard ${id}`) });
  const spawner = createProposalSpawner({
    official: { proposalKey: e => e.id ?? e.prompt, isOffer: () => false, crossRepoCwdOf: () => undefined, keepSessionMode: e => e,
      resolvePermissionMode: ({ overrides }, mode) => overrides?.permissionMode ?? mode, needsModeConsent: () => false, hereText: r => r.title },
    spawning: { visible: (queue) => queue.filter(e => !spawningSet.has(e.id)), mark: (p, id) => spawningSet.add(id), clear: (p, id) => spawningSet.delete(id) },
    results: withPersistedOutcomes({ record: (p, id, outcome) => outcomes.set(id, outcome), clear: (p, id) => outcomes.delete(id) }, call),
    bridge, notify: (message) => toasts.push(message),
  });
  const queue = ['task_00000001', 'task_00000002', 'task_00000003'].map((id, n) => ({ id, title: `Task ${n + 1}`, prompt: `${id} do it`, createdAt: n }));
  spawner.setHost({ sessionId: PARENT, available: true, queue, session: { originCwd: '/work/plain', cwd: '/work/plain', model: 'gpt-5.5', effort: 'low', permissionMode: 'default' } });
  await spawner.getSnapshot().requestSpawnAll(queue.map(record => ({ target: 'worktree', clicked: { key: record.id, cwd: record.cwd }, options: { asProposed: true } })));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(log, [
    'call workspace-info', 'rpc thread/start', 'insert thr_child_1', 'rpc thread/name/set', 'rpc turn/start', 'call task-proposals started',
    'call workspace-info', 'rpc thread/start', 'insert thr_child_2', 'rpc thread/name/set', 'rpc turn/start', 'discard thr_child_2',
    'call task-proposals outcome', // start_failed, saved as it is recorded
    'call workspace-info', 'rpc thread/start', 'insert thr_child_3', 'rpc thread/name/set', 'rpc turn/start', 'call task-proposals started',
  ]);
  assert.deepEqual([...outcomes], [['task_00000002', 'start_failed']]);
  assert.deepEqual(toasts, ['Couldn’t start the suggested task.']);
  assert.equal(spawningSet.size, 0);
  // The launcher was never given anything that opens a session, and the spawner never asked for one.
  for (const source of ['src/proposal-launch.mjs', 'src/proposal-spawner.mjs']) {
    const text = fs.readFileSync(path.join(app, source), 'utf8');
    for (const word of ['setCurrent(', 'openSession(', 'navigate(', 'setHistory(', 'startSessionFromSearch(']) assert.equal(text.includes(word), false, `${source}: ${word}`);
  }
});
