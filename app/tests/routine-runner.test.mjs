// R4g-routines RT3 (research/r4-code-routines.md §5, §7, §10 WI-3): the routine runner starts a Code task as a Code
// session (mode/surface code, the Code start's instructions), prepares the worktree it asks for first, tags launch
// failures with the official `[ccdErrorCategory:<cat>]` suffix, and records the task on the session (scheduledTaskId).
// Cowork tasks are unchanged. The core and git are stubs (no process is started); folders live under the OS temp
// directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createRoutineRunner, captureRoutineOptions, CODE_ROUTINE_INSTRUCTIONS, folderInRepository, routineKind } from '../electron/routine-runner.mjs';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { prepareWorktree } from '../electron/worktree-prepare.mjs';
import { readErrorCategory, ERROR_CATEGORY_PATTERN } from '../electron/routine-error-category.mjs';
import { turnErrorCategory } from '../src/turn-error-model.mjs';

const require = createRequire(import.meta.url);
const worktrees = require('../electron/worktrees.cjs');
const ROOT = new URL('..', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, ROOT), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;

function tempDir(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'routine-runner-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const HOST = { owner: 'fixture-owner', coreId: 'fixture', models: [{ model: 'fixture-model' }], hints: true, autoReview: false };
const OPTIONS = captureRoutineOptions({ config: { model: 'fixture-model', permission: 'ask' }, ...HOST });

/** A runner over a stub core: every call (and the runner's own hooks) lands in `log` in order. */
function harness({ host = HOST, rpcResult = () => null, prepare, inRepository, turnErrors = turnErrorCategory } = {}) {
  const log = [];
  const rpc = async ({ method, params }, owner) => {
    assert.equal(owner, host.owner);
    log.push(['rpc', method, params]);
    const custom = rpcResult(method, params);
    if (custom) return custom;
    if (method === 'thread/start') return { thread: { id: 'thread-1' } };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    return {};
  };
  const launch = createRoutineRunner({ context: async () => host, rpc,
    prepareWorktree: prepare ?? (async (p) => { log.push(['prepareWorktree', p]); return `${p.cwd}/.code/worktrees/wt-1`; }),
    setSessionMetadata: (id, patch) => log.push(['metadata', id, patch]),
    turnErrorCategory: turnErrors, ...(inRepository ? { inRepository } : {}) });
  const run = (task, hooks = {}) => launch({ id: 'task-1', name: 'Nightly', prompt: 'Run the checks.', options: OPTIONS, ...task },
    { attach: (id) => log.push(['attach', id]), ...hooks });
  return { log, run, steps: () => log.map((entry) => entry[0] === 'rpc' ? entry[1] : entry[0]) };
}

test('a Cowork task starts exactly as before: no folder check, no worktree, no session record, no category', async () => {
  const h = harness();
  const result = await h.run({ cwd: '/cowork/scratch-that-does-not-exist' });
  assert.deepEqual(result, { threadId: 'thread-1', turnId: 'turn-1' });
  assert.deepEqual(h.steps(), ['thread/start', 'attach', 'thread/name/set', 'turn/start']);
  const [, , start] = h.log[0];
  assert.equal(start.cwd, '/cowork/scratch-that-does-not-exist');
  assert.equal(start.codeDesktop.surface, 'cowork');
  assert.match(start.developerInstructions, /Cowork/);
  const [, , turn] = h.log.at(-1);
  assert.deepEqual(turn.codeDesktop.workflowTurn, { mode: 'cowork', permission: 'ask' });
  assert.deepEqual(turn.sandboxPolicy.writableRoots, ['/cowork/scratch-that-does-not-exist']);
  assert.equal(routineKind({}), 'cowork');
  // A core failure keeps its message as it was (the Cowork page shows run.error as text).
  const failing = harness({ rpcResult: (method) => method === 'turn/start'
    ? { __codeDesktopRpcError: { message: 'Overloaded', code: -32000, data: { codexErrorInfo: 'serverOverloaded' } } } : null });
  await assert.rejects(failing.run({ cwd: '/cowork' }), (error) => error.message === 'Overloaded');
});

test('a Code task starts a Code session in its folder and records the task on the session before attach', async (t) => {
  const dir = tempDir(t);
  const h = harness();
  const result = await h.run({ kind: 'code', cwd: dir });
  assert.deepEqual(result, { threadId: 'thread-1', turnId: 'turn-1' });
  assert.deepEqual(h.steps(), ['thread/start', 'metadata', 'attach', 'thread/name/set', 'turn/start']);
  const [, , start] = h.log[0];
  assert.equal(start.cwd, dir);
  assert.equal(start.model, 'fixture-model');
  assert.equal(start.codeDesktop.surface, 'code');
  assert.equal(start.codeDesktop.permissionMode, 'ask');
  assert.equal(start.developerInstructions, CODE_ROUTINE_INSTRUCTIONS, 'a core without customization gets the Code start line');
  assert.deepEqual(h.log[1], ['metadata', 'thread-1', { scheduledTaskId: 'task-1' }]);
  assert.deepEqual(h.log[3][2], { threadId: 'thread-1', name: 'Nightly' });
  const [, , turn] = h.log[4];
  assert.equal(turn.cwd, dir);
  assert.deepEqual(turn.input, [{ type: 'text', text: 'Run the checks.' }]);
  assert.deepEqual(turn.codeDesktop.workflowTurn, { mode: 'code', permission: 'ask' });
  assert.deepEqual(turn.sandboxPolicy.writableRoots, [dir]);
  // A core with customization takes its persona from codeDesktop.customization (main.jsx sendMessage): no line.
  const custom = harness({ host: { ...HOST, customization: true } });
  await custom.run({ kind: 'code', cwd: dir });
  assert.equal('developerInstructions' in custom.log[0][2], false);
});

test('the Code start line is main.jsx\'s and source-proposal-host.jsx\'s', () => {
  assert.equal(occurrences(read('src/source-proposal-host.jsx'), `"${CODE_ROUTINE_INSTRUCTIONS}"`), 1);
  assert.ok(occurrences(read('src/main.jsx'), `"${CODE_ROUTINE_INSTRUCTIONS}"`) >= 1, 'sendMessage and clearSession');
});

test('useWorktree prepares the worktree first and the session runs in it; a folder outside any repository starts in place', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'pkg'));
  const plain = path.join(dir, 'plain');
  fs.mkdirSync(plain);
  assert.equal(folderInRepository(path.join(repo, 'pkg')), true, 'a .git entry up the tree');
  assert.equal(folderInRepository(plain), false);

  const h = harness();
  await h.run({ kind: 'code', cwd: repo, useWorktree: true, sourceBranch: 'feature/x' });
  assert.deepEqual(h.steps(), ['prepareWorktree', 'thread/start', 'metadata', 'attach', 'thread/name/set', 'turn/start']);
  assert.deepEqual(h.log[0][1], { cwd: repo, branch: 'feature/x', skipWithoutCommits: true }, 'no token: no window waits for its phases');
  const dest = `${repo}/.code/worktrees/wt-1`;
  assert.equal(h.log[1][2].cwd, dest);
  assert.equal(h.log.at(-1)[2].cwd, dest);
  assert.deepEqual(h.log.at(-1)[2].sandboxPolicy.writableRoots, [dest]);

  const head = harness();
  await head.run({ kind: 'code', cwd: repo, useWorktree: true });
  assert.deepEqual(head.log[0][1], { cwd: repo, branch: '', skipWithoutCommits: true }, 'no source branch: HEAD');

  // Official createWorktree Na(x): "Skipping worktree creation - … has no git root and no .git entry".
  const skip = harness();
  await skip.run({ kind: 'code', cwd: plain, useWorktree: true, sourceBranch: 'main' });
  assert.deepEqual(skip.steps(), ['thread/start', 'metadata', 'attach', 'thread/name/set', 'turn/start']);
  assert.equal(skip.log[0][2].cwd, plain);

  // useWorktree false (or a Cowork row carrying it) never prepares one.
  const off = harness();
  await off.run({ kind: 'code', cwd: repo, useWorktree: false, sourceBranch: 'main' });
  assert.equal(off.steps().includes('prepareWorktree'), false);
});

test('a missing folder fails before anything starts with [ccdErrorCategory:cwd_not_found]', async (t) => {
  const dir = tempDir(t);
  const h = harness();
  const gone = path.join(dir, 'gone');
  await assert.rejects(h.run({ kind: 'code', cwd: gone, useWorktree: true }), (error) => {
    assert.equal(readErrorCategory(error), 'cwd_not_found');
    assert.equal(error.message, `Folder not found: ${gone} [ccdErrorCategory:cwd_not_found]`);
    assert.match(error.message, ERROR_CATEGORY_PATTERN);
    return true;
  });
  const file = path.join(dir, 'file.txt');
  fs.writeFileSync(file, 'x');
  await assert.rejects(h.run({ kind: 'code', cwd: file }), (error) => readErrorCategory(error) === 'cwd_not_found');
  assert.deepEqual(h.log, [], 'no worktree, no session');
  // A stopped run never prepares a worktree.
  fs.mkdirSync(path.join(dir, 'repo', '.git'), { recursive: true });
  await assert.rejects(h.run({ kind: 'code', cwd: path.join(dir, 'repo'), useWorktree: true },
    { assertActive: () => { throw new Error('Scheduled run was stopped before launch.'); } }), /stopped/);
  assert.deepEqual(h.log, []);
});

test('worktree failures (the real worktree-prepare.mjs over a git stub) carry their official category', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  const execError = (stderr, code = 128) => Object.assign(new Error(`Command failed: git worktree add\n${stderr}`), { code, stderr, stdout: '' });
  const cases = [
    ['worktree_branch_in_use', () => execError("fatal: 'main' is already checked out at '/elsewhere'")],
    ['git_not_found', () => Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' })],
    ['git_checkout_failed', () => execError('fatal: invalid reference: nope')],
    ['git_isolation_failed', () => execError('fatal: something else')],
  ];
  for (const [category, failure] of cases) {
    const config = { cwd: repo, worktreeBases: {}, worktreeDirectories: [], worktreeOrigins: {} };
    const run = async (file, args) => {
      if (args[2] === 'worktree') throw failure();
      // R4i-routines RI2: HEAD names a commit (the official start check passes).
      if (args[2] === 'rev-parse' && args[5] === 'HEAD^{commit}') return { stdout: 'abc\n', stderr: '' };
      if (args[2] === 'remote') throw execError("error: No such remote 'origin'", 2);
      if (args[2] === 'symbolic-ref' || (args[2] === 'rev-parse' && args[3] === '--verify')) throw execError('', 1);
      return { stdout: '', stderr: '' };
    };
    const h = harness({ prepare: (p) => prepareWorktree(p, { run, config, save: () => {}, approvedWorkspaceRoots: new Set(), prefix: 'deepseek/', worktrees }) });
    await assert.rejects(h.run({ kind: 'code', cwd: repo, useWorktree: true }), (error) => {
      assert.equal(readErrorCategory(error), category, category);
      assert.match(error.message, new RegExp(`\\[ccdErrorCategory:${category}\\]$`));
      return true;
    });
    assert.deepEqual(h.log, [], `${category}: no session was started`);
  }
  // An invalid branch is refused by prepareWorktree itself (git_checkout_failed).
  const h = harness({ prepare: (p) => prepareWorktree(p, { run: async () => ({ stdout: '' }), config: { cwd: repo, worktreeBases: {} }, save: () => {},
    approvedWorkspaceRoots: new Set(), prefix: 'deepseek/', worktrees }) });
  await assert.rejects(h.run({ kind: 'code', cwd: repo, useWorktree: true, sourceBranch: '-x' }), (error) =>
    error.message === 'Invalid branch. [ccdErrorCategory:git_checkout_failed]');
});

test('core RPC failures: CodexErrorInfo maps through the host turn-error model; others keep no suffix', async (t) => {
  const dir = tempDir(t);
  const failOn = (target, data) => harness({ rpcResult: (method) => method === target
    ? { __codeDesktopRpcError: { message: 'The request failed.', code: -32000, data } } : null });
  const expect = [
    [{ codexErrorInfo: 'serverOverloaded' }, 'api_overloaded'],
    [{ codexErrorInfo: 'internalServerError' }, 'api_server_error'],
    [{ codexErrorInfo: 'usageLimitExceeded' }, 'rate_limit'],
    [{ codexErrorInfo: { httpConnectionFailed: { httpStatusCode: null } } }, 'network_error'],
    [{ codexErrorInfo: 'rateLimitExceeded' }, undefined],
    [{ codexErrorInfo: 'unauthorized' }, undefined],
    [null, undefined],
  ];
  for (const [data, category] of expect) {
    const h = failOn('thread/start', data);
    await assert.rejects(h.run({ kind: 'code', cwd: dir }), (error) => {
      assert.equal(readErrorCategory(error), category, JSON.stringify(data));
      assert.equal(error.message, category ? `The request failed. [ccdErrorCategory:${category}]` : 'The request failed.');
      assert.equal(error.code, -32000);
      return true;
    });
  }
  // After the session exists (turn/start): still classified, and the session keeps its task.
  const late = failOn('turn/start', { codexErrorInfo: 'serverOverloaded' });
  await assert.rejects(late.run({ kind: 'code', cwd: dir }), (error) => readErrorCategory(error) === 'api_overloaded');
  assert.deepEqual(late.steps(), ['thread/start', 'metadata', 'attach', 'thread/name/set', 'turn/start']);
  // Without the turn-error model (a build without it), nothing is guessed.
  const bare = harness({ turnErrors: null, rpcResult: (method) => method === 'thread/start'
    ? { __codeDesktopRpcError: { message: 'Overloaded', code: -32000, data: { codexErrorInfo: 'serverOverloaded' } } } : null });
  await assert.rejects(bare.run({ kind: 'code', cwd: dir }), (error) => error.message === 'Overloaded');
  // The runner's own refusals are untagged (generic startFailed).
  const other = harness({ host: { ...HOST, models: [] } });
  await assert.rejects(other.run({ kind: 'code', cwd: dir }), (error) => /unavailable/.test(error.message) && readErrorCategory(error) === undefined);
});

test('through local-routines: Code Run now rejects with the tagged failure; the run records it', async (t) => {
  const dir = tempDir(t);
  const folder = path.join(dir, 'project');
  fs.mkdirSync(folder);
  let state = [];
  const h = harness();
  const service = createLocalRoutines({ getState: () => state, commit: (value) => { state = structuredClone(value); },
    dataDir: dir, approveFolder: (value) => value,
    captureOptions: async (execution, previous) => captureRoutineOptions({ config: { model: 'fixture-model', permission: 'ask' }, ...HOST, execution, previous }),
    launch: createRoutineRunner({ context: async () => HOST, rpc: async ({ method }) => method === 'thread/start' ? { thread: { id: 'thread-9' } } : method === 'turn/start' ? { turn: { id: 'turn-9' } } : {},
      setSessionMetadata: (id, patch) => h.log.push(['metadata', id, patch]) }),
    now: () => new Date(2026, 9, 17, 9, 0).getTime(), setTimer: () => 1, clearTimer: () => {} });
  t.after(() => service.dispose());
  const task = await service.request({ action: 'create', kind: 'code', name: 'Code task', prompt: 'Check.', description: 'd', cron: '0 9 * * *', folder });
  const ok = await service.request({ action: 'run', id: task.id });
  assert.equal(ok.threadId, 'thread-9');
  assert.deepEqual(h.log, [['metadata', 'thread-9', { scheduledTaskId: task.id }]]);
  // The started run is finished by the scheduler's own observer; end it so the next Run now is not refused.
  state = state.map((row) => ({ ...row, runs: row.runs.map((r) => ({ ...r, status: 'completed', finishedAt: 1 })) }));
  fs.rmSync(folder, { recursive: true });
  await assert.rejects(service.request({ action: 'run', id: task.id }), /\[ccdErrorCategory:cwd_not_found\]$/);
  assert.match(state[0].runs[0].error, /^Folder not found: .* \[ccdErrorCategory:cwd_not_found\]$/);
  assert.equal(state[0].runs[0].status, 'failed');
});

test('main.cjs: prepare-worktree and the routine runner share worktree-prepare.mjs with main\'s dependencies', () => {
  const main = read('electron/main.cjs');
  assert.equal(occurrences(main, 'case "prepare-worktree": return await prepareWorktreeInMain(p);'), 1);
  assert.equal(occurrences(main, '"worktree",\n            "add",'), 0, 'the inline case is gone');
  assert.equal(occurrences(main, 'async function prepareWorktreeInMain(p) {'), 1);
  assert.equal(occurrences(main, 'const { prepareWorktree } = await import("./worktree-prepare.mjs");'), 1);
  assert.equal(occurrences(main, 'prepareWorktree(p, { run, config, save, emit, approvedWorkspaceRoots, worktrees,'), 1);
  assert.equal(occurrences(main, 'prefix: () => worktreeBranchPrefix(client?.serverInfo ?? config.core ?? "deepseek") });'), 1);
  assert.equal(occurrences(main, 'prepareWorktree: prepareWorktreeInMain, turnErrorCategory: routineTurnErrors?.turnErrorCategory,'), 1);
  assert.equal(occurrences(main, 'const routineTurnErrors = await import("../src/turn-error-model.mjs").catch(() => null);'), 1);
  assert.equal(occurrences(main, 'customization: coreSupports(owner.serverInfo, "customization") };'), 1);
  const wiring = main.slice(main.indexOf('setSessionMetadata: (id, patch) => {'), main.indexOf('} }),', main.indexOf('setSessionMetadata: (id, patch) => {')));
  assert.match(wiring, /if \(!config\.threadIds\.includes\(id\)\) return;/);
  assert.match(wiring, /emit\(\{ kind: "sidebar-state", state: sidebarSnapshot\(\) \}\)/);
});
