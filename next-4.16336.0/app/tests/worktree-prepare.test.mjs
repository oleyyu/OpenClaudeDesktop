// R4g-routines RT2: electron/worktree-prepare.mjs is main.cjs's `case "prepare-worktree"` as an injected function.
// git is a stub (no process is started); folders live under the OS temp directory. While main.cjs still carries the
// inline case, the same stubs drive both and the git commands, events, config writes and results must match.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { prepareWorktree, createWorktree, worktreeGitFailure } from '../electron/worktree-prepare.mjs';
import { classifyWorktreeError, tagRoutineLaunchError, readErrorCategory } from '../electron/routine-error-category.mjs';

const require = createRequire(import.meta.url);
const worktrees = require('../electron/worktrees.cjs');

function folder() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wtp-')));
  const repo = path.join(base, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  return { base, repo };
}
const execError = ({ code = 128, stderr = '', message } = {}) =>
  Object.assign(new Error(message ?? `Command failed: git worktree add\n${stderr}`), { code, stderr, stdout: '' });

// A git stub: records every call; `fail` decides per call (return an error to reject).
function gitStub(repo, { fail = () => null, origin = false } = {}) {
  const calls = [];
  const run = async (file, args) => {
    calls.push([file, ...args]);
    const error = fail(args);
    if (error) throw error;
    const sub = args.slice(2);
    if (sub[0] === 'remote' && sub[1] === 'get-url') {
      if (!origin) throw execError({ code: 2, stderr: "error: No such remote 'origin'" });
      return { stdout: 'https://example.invalid/repo.git\n', stderr: '' };
    }
    // cov8-02 vetting: refs/remotes/origin/<branch> is not symbolic (exit 1) and absent; no local branch either.
    if (sub[0] === 'symbolic-ref' || (sub[0] === 'rev-parse' && sub[1] === '--verify')) throw execError({ code: 1 });
    if (sub[0] === 'rev-parse' && sub[1] === '--show-toplevel') return { stdout: `${repo}\n`, stderr: '' };
    if (sub[0] === 'rev-parse' && sub[1] === '--git-common-dir') return { stdout: '.git\n', stderr: '' };
    return { stdout: '', stderr: '' };
  };
  return { run, calls };
}
function clock(start = 1_700_000_000_000) {
  let value = start;
  return () => value++;
}
function deps(repo, overrides = {}) {
  const events = [];
  let saves = 0;
  const config = { cwd: repo, worktreeBases: {}, worktreeDirectories: ['/old/one'], worktreeOrigins: { '/old/one': '/old' }, ...overrides.config };
  const roots = new Set();
  const stub = gitStub(repo, overrides.git);
  return { events, config, roots, stub, saves: () => saves,
    deps: { run: stub.run, config, save: () => { saves++; }, emit: (event) => events.push(event), approvedWorkspaceRoots: roots,
      prefix: 'deepseek/', now: overrides.now ?? clock(), ...overrides.deps } };
}

test('prepareWorktree adds the worktree on a new core-named branch and records it like the IPC case', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const now = clock(1_700_000_000_000);
  const d = deps(repo, { now });
  const dest = await prepareWorktree({ cwd: repo, branch: 'main', token: 'tok-1' }, d.deps);
  const name = `deepseek/${(1_700_000_000_000).toString(36)}`;
  const expected = path.join(repo, '.code', 'worktrees', `repo-${(1_700_000_000_001).toString(36)}`);
  assert.equal(dest, expected);
  assert.ok(fs.existsSync(path.dirname(dest)), 'the worktrees folder is created before git runs');
  // No origin: refreshedStartPoint asks once and starts from the branch itself.
  assert.deepEqual(d.stub.calls, [
    ['git', '-C', repo, 'remote', 'get-url', 'origin'],
    ['git', '-C', repo, 'worktree', 'add', '-b', name, dest, 'main'],
    ['git', '-C', repo, 'rev-parse', '--show-toplevel'],
    ['git', '-C', repo, 'rev-parse', '--git-common-dir'],
  ]);
  assert.deepEqual(d.events, [{ kind: 'worktree-phase', token: 'tok-1', phase: 'worktree_add' }]);
  assert.deepEqual([...d.roots], [dest]);
  assert.deepEqual(d.config.worktreeDirectories, ['/old/one', dest]);
  assert.deepEqual(d.config.worktreeBases, { [dest]: 'main' });
  assert.deepEqual(d.config.worktreeOrigins, { '/old/one': '/old', [dest]: repo });
  assert.equal(d.saves(), 3);
  assert.match(fs.readFileSync(path.join(repo, '.git', 'info', 'exclude'), 'utf8'), /^\/\.code\/worktrees\/$/m);
});

test('prepareWorktree without a branch starts at HEAD, records no base and emits nothing without a token', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const custom = path.join(base, 'trees');
  const d = deps(repo, { config: { worktreeLocation: 'custom', worktreeDirectory: custom, worktreeOrigins: null } });
  const dest = await prepareWorktree({ cwd: repo, branch: '' }, d.deps);
  assert.equal(path.dirname(dest), custom);
  assert.deepEqual(d.stub.calls[0].slice(3), ['worktree', 'add', '-b', d.stub.calls[0][6], dest, 'HEAD']);
  assert.deepEqual(d.events, []);
  assert.deepEqual(d.config.worktreeBases, {});
  assert.deepEqual(d.config.worktreeOrigins, { [dest]: repo });
  assert.equal(d.saves(), 2);
  // Outside the repository: no exclude entry.
  assert.equal(fs.existsSync(path.join(repo, '.git', 'info', 'exclude')), false);
});

test('prepareWorktree falls back to config.cwd and resolves symlinks; prefix may be a function called once', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const link = path.join(base, 'link');
  fs.symlinkSync(repo, link);
  let asked = 0;
  const d = deps(repo, { config: { cwd: link }, deps: { prefix: () => { asked++; return 'kimi/'; } } });
  const dest = await prepareWorktree({ branch: '' }, d.deps);
  assert.equal(asked, 1);
  assert.ok(dest.startsWith(path.join(repo, '.code', 'worktrees')));
  assert.equal(d.config.worktreeOrigins[dest], repo);
  assert.match(d.stub.calls[0][6], /^kimi\//);
});

test('refusals before git: invalid branch, missing folder, custom location without a folder', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  for (const branch of [undefined, 3, '-x']) {
    const d = deps(repo);
    const error = await prepareWorktree({ cwd: repo, branch }, d.deps).catch((e) => e);
    assert.equal(error.message, 'Invalid branch.');
    assert.equal(error.worktreeStage, 'branch');
    assert.equal(Object.keys(error).includes('worktreeStage'), false, 'the stage is not enumerable');
    assert.deepEqual(d.stub.calls, []);
    assert.equal(classifyWorktreeError(error), 'git_checkout_failed');
  }
  const gone = deps(repo);
  const missing = await prepareWorktree({ cwd: path.join(base, 'gone'), branch: '' }, gone.deps).catch((e) => e);
  assert.equal(missing.code, 'ENOENT');
  assert.equal(missing.worktreeStage, 'cwd');
  assert.equal(classifyWorktreeError(missing), 'cwd_not_found', 'ENOENT of the folder is not a missing git');
  const custom = deps(repo, { config: { worktreeLocation: 'custom', worktreeDirectory: '' } });
  const noDir = await prepareWorktree({ cwd: repo, branch: '' }, custom.deps).catch((e) => e);
  assert.equal(noDir.message, 'Choose a custom worktree directory first.');
  assert.equal(classifyWorktreeError(noDir), null);
  assert.deepEqual(custom.stub.calls, []);
  assert.deepEqual([...custom.roots], []);
});

test('git failures keep the IPC messages and map to the official categories', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const onAdd = (error) => (args) => (args[2] === 'worktree' ? error : null);
  const cases = [
    ['missing', Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }), 'Git is required to use a worktree.', 'git_not_found'],
    ['xcrun stub', execError({ code: 1, stderr: 'xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools)' }), 'Git is required to use a worktree.', 'git_not_found'],
    ['exec_blocked', Object.assign(new Error('spawn git EACCES'), { code: 'EACCES' }), 'Your system blocked OpenClaude Desktop from running Git.', 'git_startup_failed'],
    ['startup_failed', execError({ stderr: 'fatal: bad config line 1 in file .git/config' }), 'Git is installed but isn’t working.\nfatal: bad config line 1 in file .git/config', 'git_startup_failed'],
    ['already checked out', execError({ stderr: "fatal: 'main' is already checked out at '/elsewhere'" }), null, 'worktree_branch_in_use'],
    ['already used by worktree', execError({ stderr: "fatal: 'main' is already used by worktree at '/elsewhere'" }), null, 'worktree_branch_in_use'],
    ['invalid ref', execError({ stderr: 'fatal: invalid reference: HEAD' }), null, 'git_checkout_failed'],
    ['not a repository', execError({ stderr: 'fatal: not a git repository (or any of the parent directories): .git' }), null, 'not_git_repo'],
    ['ENOSPC', execError({ stderr: "error: unable to write file 'a.txt': No space left on device\nfatal: unable to checkout working tree" }), null, 'disk_full'],
    ['read-only', execError({ stderr: "fatal: could not create leading directories of '/x': Read-only file system" }), null, 'filesystem_error'],
    ['other', execError({ stderr: "fatal: a branch named 'deepseek/x' already exists" }), null, 'git_isolation_failed'],
  ];
  for (const [label, raw, message, category] of cases) {
    const d = deps(repo, { git: { fail: onAdd(raw) } });
    const error = await prepareWorktree({ cwd: repo, branch: '' }, d.deps).catch((e) => e);
    assert.equal(error.worktreeStage, 'worktree_add', label);
    if (message === null) assert.equal(error, raw, `${label}: any other git failure is the original error`);
    else {
      assert.equal(error.message, message, label);
      assert.equal(error.cause, raw, `${label}: the original error stays as the cause`);
    }
    assert.equal(classifyWorktreeError(error), category, label);
    assert.deepEqual([...d.roots], [], `${label}: nothing recorded`);
    assert.equal(d.saves(), 0, label);
    const tagged = tagRoutineLaunchError(error);
    assert.equal(readErrorCategory(tagged), category, label);
    assert.ok(tagged.message.endsWith(` [ccdErrorCategory:${category}]`), label);
  }
});

test('the start point refused (cov8-02) is no cause; git failing to probe it is git_startup_failed', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const refused = new worktrees.WorktreeStartRefused(worktrees.trackingRefRefusal('refs/remotes/origin/main', 'symbolic'));
  const probe = new worktrees.WorktreeStartRefused('git could not probe a tracking ref', { error: 'boom', detail: null, kind: 'failed' });
  for (const [thrown, category] of [[refused, null], [probe, 'git_startup_failed']]) {
    const d = deps(repo, { deps: { worktrees: { ...worktrees, refreshedStartPoint: async () => { throw thrown; } } } });
    const error = await prepareWorktree({ cwd: repo, branch: 'main' }, d.deps).catch((e) => e);
    assert.equal(error, thrown);
    assert.equal(error.worktreeStage, 'start_point');
    assert.equal(classifyWorktreeError(error), category);
    assert.equal(d.stub.calls.length, 0, 'no worktree add');
    if (category === null) assert.equal(readErrorCategory(tagRoutineLaunchError(error)), undefined, 'left untagged');
  }
});

test('mkdir of the worktrees folder: ENOSPC is disk_full, EACCES filesystem_error', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  for (const [code, category] of [['ENOSPC', 'disk_full'], ['EDQUOT', 'disk_full'], ['EACCES', 'filesystem_error'], ['EIO', null]]) {
    const failing = { ...fs, mkdirSync: () => { throw Object.assign(new Error(`${code}: mkdir`), { code }); } };
    const d = deps(repo, { deps: { fs: failing } });
    const error = await prepareWorktree({ cwd: repo, branch: '' }, d.deps).catch((e) => e);
    assert.equal(error.code, code);
    assert.equal(error.worktreeStage, 'mkdir');
    assert.equal(classifyWorktreeError(error), category, code);
    assert.deepEqual(d.stub.calls, []);
  }
});

test('createWorktree alone (X5-L1) creates without recording and reports the new branch', async (t) => {
  const { base, repo } = folder();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const stub = gitStub(repo);
  const phases = [];
  const made = await createWorktree(stub.run, { cwd: repo, branch: 'main', prefix: 'deepseek/', onPhase: (p) => phases.push(p), now: clock(10) });
  assert.deepEqual(made, { path: path.join(repo, '.code', 'worktrees', `repo-${(11).toString(36)}`), branch: `deepseek/${(10).toString(36)}`,
    base: path.join(repo, '.code', 'worktrees'), start: 'main', cwd: repo });
  assert.deepEqual(phases, ['worktree_add']);
  assert.deepEqual(stub.calls.map((call) => call[3]), ['remote', 'worktree']);
  assert.equal(worktreeGitFailure(execError({ stderr: 'fatal: other' })).message.startsWith('Command failed'), true);
});

// While main.cjs still has the inline case: run it with the same stubs and compare everything observable.
const MAIN = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
const START = 'case "prepare-worktree": {';
const inline = MAIN.includes(START) && MAIN.slice(MAIN.indexOf(START), MAIN.indexOf(START) + 4000).includes('"worktree",\n            "add",');
test('same behaviour as main.cjs\'s inline prepare-worktree case', { skip: inline ? false : 'main.cjs now calls worktree-prepare.mjs' }, async (t) => {
  const at = MAIN.indexOf(START) + START.length;
  const end = MAIN.indexOf('return dest;\n      }', at);
  assert.ok(end > at);
  const body = MAIN.slice(at, end + 'return dest;'.length);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const original = new AsyncFunction('p', 'fs', 'path', 'config', 'client', 'worktreeBranchPrefix', 'emit', 'worktrees', 'run', 'approvedWorkspaceRoots', 'save', body);
  const scenarios = [
    { label: 'branch + token', p: (repo) => ({ cwd: repo, branch: 'main', token: 't' }) },
    { label: 'HEAD, custom folder', p: (repo) => ({ cwd: repo, branch: '' }), config: (base) => ({ worktreeLocation: 'custom', worktreeDirectory: path.join(base, 'trees') }) },
    { label: 'origin fetched', p: (repo) => ({ cwd: repo, branch: 'feature/x', token: 'u' }), git: { origin: true } },
    { label: 'invalid branch', p: (repo) => ({ cwd: repo, branch: '-x' }) },
    { label: 'git missing', p: (repo) => ({ cwd: repo, branch: '' }), git: { fail: (args) => (args[2] === 'worktree' ? Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }) : null) } },
    { label: 'git startup', p: (repo) => ({ cwd: repo, branch: '' }), git: { fail: (args) => (args[2] === 'worktree' ? execError({ stderr: 'fatal: bad config line 3 in file /x/config' }) : null) } },
    { label: 'invalid ref', p: (repo) => ({ cwd: repo, branch: '' }), git: { fail: (args) => (args[2] === 'worktree' ? execError({ stderr: 'fatal: invalid reference: HEAD' }) : null) } },
  ];
  const outcome = async (impl, scenario) => {
    const { base, repo } = folder();
    try {
      worktrees._resetSourceRefFetches();
      let n = 1_800_000_000_000;
      t.mock.method(Date, 'now', () => n++);
      const d = deps(repo, { config: scenario.config?.(base), git: scenario.git, now: () => Date.now() });
      let result, error;
      try { result = await impl(scenario.p(repo), d); } catch (e) { error = e; }
      t.mock.restoreAll();
      const rel = (value) => JSON.parse(JSON.stringify(value ?? null).split(base).join('<base>'));
      return rel({ result, error: error && { message: error.message, name: error.name }, calls: d.stub.calls, events: d.events,
        roots: [...d.roots], config: d.config, saves: d.saves() });
    } finally { t.mock.restoreAll(); fs.rmSync(base, { recursive: true, force: true }); }
  };
  for (const scenario of scenarios) {
    const viaModule = await outcome((p, d) => prepareWorktree(p, d.deps), scenario);
    const viaMain = await outcome((p, d) => original(p, fs, path, d.config, { serverInfo: { name: 'deepseek' } }, () => 'deepseek/', d.deps.emit,
      worktrees, d.deps.run, d.roots, d.deps.save), scenario);
    assert.deepEqual(viaModule, viaMain, scenario.label);
  }
});
