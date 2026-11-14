import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const worktrees = require('../electron/worktrees.cjs');
const run = promisify(execFile);
const git = (cwd, ...args) => run('git', ['-C', cwd, ...args]);

async function repo() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wt-')));
  const root = path.join(base, 'repo');
  fs.mkdirSync(root);
  await git(root, 'init', '-q', '-b', 'main');
  await git(root, '-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
  return { base, root };
}

test('a worktree inside the repository stays out of its status; removal and cleanup use git, keep dirty ones', async (t) => {
  const { base, root } = await repo();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const folder = path.join(root, '.code', 'worktrees');
  const dest = path.join(folder, 'repo-1');
  fs.mkdirSync(folder, { recursive: true });
  await git(root, 'worktree', 'add', '-q', '-b', 'deepseek/x', dest, 'HEAD');
  assert.match((await git(root, 'status', '--porcelain')).stdout, /\?\? \.code\//, 'without the exclude the main checkout looks dirty');
  assert.equal(await worktrees.excludeWorktreeRoot(run, root, folder), '/.code/worktrees/');
  assert.equal(await worktrees.excludeWorktreeRoot(run, root, folder), '/.code/worktrees/', 'written once');
  assert.equal((await git(root, 'status', '--porcelain')).stdout.trim(), '');
  assert.equal(await worktrees.excludeWorktreeRoot(run, root, path.join(base, 'elsewhere')), null);
  fs.writeFileSync(path.join(dest, 'new.txt'), 'x');
  assert.deepEqual(await worktrees.worktreeStatus(run, dest), { exists: true, changes: 1, files: ['?? new.txt'] });
  // shared-19 DK lists the porcelain lines themselves (B37).
  fs.mkdirSync(path.join(dest, 'dir'));
  fs.writeFileSync(path.join(dest, 'dir', 'b.txt'), 'y');
  assert.deepEqual(await worktrees.worktreeStatus(run, dest), { exists: true, changes: 2, files: ['?? dir/b.txt', '?? new.txt'] });
  fs.rmSync(path.join(dest, 'dir'), { recursive: true });
  assert.deepEqual(await worktrees.worktreeStatus(run, path.join(base, 'missing')), { exists: false, changes: 0, files: [] });
  assert.deepEqual(await worktrees.worktreeStatus(async () => { throw new Error('git failed'); }, dest), { exists: true, changes: 0, files: [], unknown: true });
  const config = { threadIds: ['a'], archivedThreadIds: [], threadMetadata: { a: { cwd: root } }, worktreeDirectories: [dest], worktreeBases: { [dest]: 'main' } };
  assert.deepEqual(worktrees.unusedWorktrees(config), [dest]);
  assert.equal(await worktrees.removeWorktree(run, dest), true);
  assert.equal(fs.existsSync(dest), false);
  assert.match((await git(root, 'branch', '--list', 'deepseek/x')).stdout, /deepseek\/x/, 'the branch stays');
  worktrees.forgetWorktree(config, dest);
  assert.deepEqual([config.worktreeDirectories, config.worktreeBases], [[], {}]);
  assert.equal(await worktrees.removeWorktree(run, path.join(base, 'not-a-worktree')), true, 'a missing folder counts as gone');
});

test('the git rail status never lists a .code/worktrees folder, even without the exclude', async (t) => {
  const { base, root } = await repo();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const { workspaceGitStatus } = require('../electron/git-status.cjs');
  await git(root, 'worktree', 'add', '-q', '-b', 'kimi/y', path.join(root, '.code', 'worktrees', 'r'), 'HEAD');
  fs.writeFileSync(path.join(root, 'real.txt'), 'x');
  fs.mkdirSync(path.join(root, 'sub'));
  const status = await workspaceGitStatus(path.join(root, 'sub'));
  const paths = JSON.stringify(status);
  assert.equal(paths.includes('.code/worktrees'), false);
  assert.ok(paths.includes('real.txt'), 'changes outside the session folder still count');
});

// B29 (asar createWorktree worktree_fetch → refreshSourceRef / resolveWorktreeStartPoint): a real origin clone.
test('B29 refreshedStartPoint fetches the base branch from origin and starts from it when the local branch is behind', async (t) => {
  const { base, root } = await repo();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  worktrees._resetSourceRefFetches();
  const clone = path.join(base, 'clone');
  await run('git', ['clone', '-q', root, clone]);
  await git(root, '-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'upstream');
  const upstream = (await git(root, 'rev-parse', 'HEAD')).stdout.trim();
  const phases = [];
  const behind = await worktrees.refreshedStartPoint(run, clone, 'main', { onPhase: (phase) => phases.push(phase) });
  assert.deepEqual(phases, ['worktree_fetch']);
  assert.equal(behind.outcome, 'fetched');
  assert.equal(behind.start, upstream, 'a behind local branch starts at origin (fast-forward)');
  assert.equal(behind.fastForward, true);
  assert.equal((await git(clone, 'rev-parse', 'main')).stdout.trim() === upstream, false, 'the local branch itself is left alone');
  // Within a minute the fetch is not repeated.
  const again = await worktrees.refreshedStartPoint(run, clone, 'main', { onPhase: (phase) => phases.push(phase) });
  assert.equal(again.outcome, 'throttled');
  assert.deepEqual(phases, ['worktree_fetch']);
  // Local commits origin lacks keep the local branch.
  await git(clone, 'merge', '-q', '--ff-only', 'origin/main');
  await git(clone, '-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'local');
  assert.equal((await worktrees.refreshedStartPoint(run, clone, 'main')).start, 'main');
  // No origin: nothing to fetch.
  assert.deepEqual(await worktrees.refreshedStartPoint(run, root, 'main'), { start: 'main', outcome: 'no_origin' });
  assert.equal((await worktrees.refreshedStartPoint(run, clone, '--upload-pack=x')).outcome, 'skipped_ref');
  assert.equal(worktrees.fetchableBranch('feature/x'), true);
  assert.equal(worktrees.fetchableBranch('a..b'), false);
  assert.equal(worktrees.fetchableBranch('origin/main'), false);
});

test('B29 gitUnavailable: missing git, the macOS stub, a blocked exec and a broken config', () => {
  assert.deepEqual(worktrees.gitUnavailable(Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' })), { reason: 'missing' });
  assert.deepEqual(worktrees.gitUnavailable({ code: 1, stderr: 'xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools), missing xcrun at: …' }), { reason: 'missing' });
  assert.deepEqual(worktrees.gitUnavailable({ code: 'EACCES', message: 'spawn git EACCES' }), { reason: 'exec_blocked' });
  assert.deepEqual(worktrees.gitUnavailable({ code: 128, stderr: "fatal: bad config line 3 in file /Users/x/.gitconfig\n" }),
    { reason: 'startup_failed', message: 'fatal: bad config line 3 in file /Users/x/.gitconfig' });
  assert.equal(worktrees.gitUnavailable({ code: 128, stderr: "fatal: not a git repository" }), null);
  assert.equal(worktrees.gitUnavailable(null), null);
});

// cov8-02 (FT-12; asar 2.42304.0 index.chunk-BAdej_RQ.js readVettedTrackingRef / vetTrackingRef / probeSymbolicRef / Ea,
// unchanged from 2.37337.1 apart from names): a symbolic remote-tracking ref is never a worktree start point.
test('cov8-02 refreshedStartPoint refuses a symbolic refs/remotes/origin/<branch> and adds no worktree', async (t) => {
  const { base, root } = await repo();
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  worktrees._resetSourceRefFetches();
  const clone = path.join(base, 'clone');
  await run('git', ['clone', '-q', root, clone]);
  // origin is unreachable from now on: the fetch fails and the refs on disk decide (a failed fetch never throws).
  await git(clone, 'remote', 'set-url', 'origin', path.join(base, 'gone'));
  const plain = (await git(clone, 'rev-parse', 'refs/remotes/origin/main')).stdout.trim();
  assert.deepEqual(await worktrees.vetTrackingRef(run, clone, 'refs/remotes/origin/main'), { kind: 'commit', oid: plain });
  assert.deepEqual(await worktrees.vetTrackingRef(run, clone, 'refs/remotes/origin/missing'), { kind: 'absent' });
  assert.equal(await worktrees.readVettedTrackingRef(run, clone, 'refs/remotes/origin/missing'), null);
  // origin/HEAD (a symbolic ref git clone makes) is followed once to origin/main.
  assert.deepEqual(await worktrees.vetTrackingRef(run, clone, 'refs/remotes/origin/HEAD'), { kind: 'commit', oid: plain });
  // The branch ref itself made symbolic (git never does that; a fetch would write through it).
  await git(clone, 'update-ref', 'refs/remotes/origin/other', plain);
  await git(clone, 'symbolic-ref', 'refs/remotes/origin/main', 'refs/remotes/origin/other');
  const calls = [];
  const logged = (command, args, options) => { calls.push(args.slice(2)); return run(command, args, options); };
  await assert.rejects(worktrees.refreshedStartPoint(logged, clone, 'main'), (error) => {
    assert.ok(error instanceof worktrees.WorktreeStartRefused);
    assert.equal(error.code, 'tracking_ref_untrusted');
    assert.equal(error.message, 'OpenClaude Desktop could not create a worktree: this repository\'s remote-tracking ref for the branch is a symbolic ref, which git itself never creates there, so the remote\'s copy of the branch cannot be read from it. Delete it (git symbolic-ref --delete refs/remotes/origin/main), then run "git fetch" in the repository and try again.');
    return true;
  });
  assert.ok(calls.some((args) => args[0] === 'symbolic-ref' && args.at(-1) === 'refs/remotes/origin/main'), 'probed');
  assert.ok(!calls.some((args) => args[0] === 'worktree'), 'no worktree add');
  assert.equal(fs.readdirSync(base).sort().join(), 'clone,repo', 'nothing was created next to the repository');
  // origin/HEAD → origin/main → origin/other: git symbolic-ref prints the end of the chain, a plain ref of the same
  // remote, so the HEAD is vetted as that ref (as in the original).
  assert.deepEqual(await worktrees.vetTrackingRef(run, clone, 'refs/remotes/origin/HEAD'), { kind: 'commit', oid: plain });
  // A remote HEAD that leads out of its remote is refused with the HEAD copy.
  await git(clone, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/elsewhere/main');
  assert.deepEqual(await worktrees.vetTrackingRef(run, clone, 'refs/remotes/origin/HEAD'), { kind: 'symbolic', ref: 'refs/remotes/origin/HEAD' });
  await assert.rejects(worktrees.readVettedTrackingRef(run, clone, 'refs/remotes/origin/HEAD'), /remote HEAD leads through a symbolic remote-tracking ref/);
  assert.match(worktrees.trackingRefRefusal('refs/remotes/origin/HEAD', 'symbolic'), /remote HEAD leads through a symbolic remote-tracking ref/);
  assert.match(worktrees.trackingRefRefusal('refs/remotes/origin/a b', 'symbolic'), /\(git symbolic-ref --delete refs\/remotes\/<remote>\/<branch>\)/, 'Ca: an unquotable name');
  assert.match(worktrees.trackingRefRefusal('refs/remotes/origin/main', 'unconfirmed'), /could not read this repository's remote-tracking ref for the branch to confirm it is a plain ref/);
  // Back to a plain ref: the worktree starts from it again.
  await git(clone, 'symbolic-ref', '--delete', 'refs/remotes/origin/main');
  await git(clone, 'update-ref', 'refs/remotes/origin/main', plain);
  assert.equal((await worktrees.refreshedStartPoint(run, clone, 'main')).start, plain);
});

test('cov8-02 vetTrackingRef: an unconfirmable probe refuses, a git that cannot start is a git refusal', async () => {
  const oid = 'a'.repeat(40);
  const runner = (answers) => async (command, args) => {
    const answer = answers[args[2]];
    if (typeof answer === 'function') return answer(args);
    if (answer instanceof Error) throw answer;
    return { stdout: answer ?? '', stderr: '' };
  };
  const exit = (code, stderr = '') => Object.assign(new Error(`exit ${code}`), { code, stderr });
  const warn = console.warn; const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    // symbolic-ref exits 128 (not 0/1): unconfirmed unless check-ref-format also rejects the name and nothing is listed.
    const unconfirmed = runner({ 'symbolic-ref': exit(128, 'fatal: weird'), 'for-each-ref': `refs/remotes/origin/x\0\0${oid}\n`, 'check-ref-format': '' });
    assert.deepEqual(await worktrees.vetTrackingRef(unconfirmed, '/r', 'refs/remotes/origin/x'), { kind: 'unconfirmed', ref: 'refs/remotes/origin/x' });
    assert.equal(warnings.length, 1);
    await assert.rejects(worktrees.readVettedTrackingRef(unconfirmed, '/r', 'refs/remotes/origin/x'), /could not read this repository's remote-tracking ref/);
    const badName = runner({ 'symbolic-ref': exit(128), 'for-each-ref': '', 'check-ref-format': exit(1) });
    assert.deepEqual(await worktrees.vetTrackingRef(badName, '/r', 'refs/remotes/origin/x'), { kind: 'absent' });
    // for-each-ref lists it with a symref column while symbolic-ref says "not": still symbolic.
    const listed = runner({ 'symbolic-ref': exit(1), 'for-each-ref': `refs/remotes/origin/x\0refs/remotes/origin/y\0${oid}\n` });
    assert.deepEqual(await worktrees.vetTrackingRef(listed, '/r', 'refs/remotes/origin/x'), { kind: 'symbolic', ref: 'refs/remotes/origin/x' });
    // git did not start (no exit code): readVettedTrackingRef refuses with the git error attached.
    const missing = runner({ 'symbolic-ref': Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }), 'for-each-ref': '' });
    await assert.rejects(worktrees.readVettedTrackingRef(missing, '/r', 'refs/remotes/origin/x'), (error) => {
      assert.equal(error.message, 'git could not probe a tracking ref');
      assert.deepEqual(error.gitStartup, { error: 'spawn git ENOENT', detail: 'ENOENT', kind: 'failed' });
      return true;
    });
  } finally { console.warn = warn; }
});
