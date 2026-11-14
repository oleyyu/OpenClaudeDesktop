// R4g-small SM3 (research-ext/X5-lazy-worktree.md X5-E1, D38): prepare-worktree records the branch it created, the
// record outlives the folder while a session still names it, and the Session rail's local record (session-rail-meta)
// reports it after the worktree is gone, as 2.42304.0's LocalSession keeps `branch` past the deleted-worktree fallback.
// git is a stub (no process is started); folders live under the OS temp directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { prepareWorktree } from '../electron/worktree-prepare.mjs';
import { localSessionRecord, railRecordFacts, railMetaFromRecord } from '../src/session-rail-meta-model.mjs';

const require = createRequire(import.meta.url);
const worktrees = require('../electron/worktrees.cjs');
const railMeta = require('../electron/session-rail-meta.cjs');
const root = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(root, '../reference/installed-2.42304.0-20261017');
const occurrences = (text, needle) => text.split(needle).length - 1;
const tempDir = (t) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wt-branch-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

test('the original keeps the session branch past the deleted-worktree fallback (2.42304.0 counts)', () => {
  const main = fs.readFileSync(path.join(reference, 'asar/.vite/build/index.chunk-CFJssAFf.js'), 'utf8');
  for (const needle of ['sourceBranch:e.sourceBranch,branch:e.branch,', 'function $C(e){return!e.worktreeLazy&&!!e.branch&&!!e.originCwd}',
    'was deleted; falling back to origin repo ${e.originCwd}`', 'e.cwd=e.originCwd,e.worktreePath=void 0,e.worktreeName=void 0,e.sourceBranch=void 0,'])
    assert.equal(occurrences(main, needle), 1, needle);
  const rail = fs.readFileSync(path.join(reference, 'ion-dist/assets/v1/cf74bc599-D9NZWRyl.js'), 'utf8');
  assert.equal(occurrences(rail, 'recorded:O?.branch'), 1);
});

test('recordWorktreeBranch / recordedWorktreeBranch: absolute folders and git-acceptable branch names only', () => {
  // R4i-small SM3: '/old' is still one of the app's worktrees, so recording another branch keeps it.
  const config = { worktreeDirectories: ['/old'], worktreeBranches: { '/old': 'kimi/a' } };
  assert.equal(worktrees.recordWorktreeBranch(config, '/r/.code/worktrees/r-1', 'deepseek/m1'), true);
  assert.deepEqual(config.worktreeBranches, { '/old': 'kimi/a', '/r/.code/worktrees/r-1': 'deepseek/m1' });
  for (const [dir, branch] of [['relative', 'b'], ['/x', ''], ['/x', '-b'], ['/x', 'a b'], ['/x', 'a\nb'], ['/x', 7], [7, 'b'], ['/x', 'x'.repeat(256)]])
    assert.equal(worktrees.recordWorktreeBranch(config, dir, branch), false, JSON.stringify([dir, branch]));
  assert.equal(Object.keys(config.worktreeBranches).length, 2);
  const fresh = {};
  worktrees.recordWorktreeBranch(fresh, '/y', 'deepseek/z');
  assert.deepEqual(fresh.worktreeBranches, { '/y': 'deepseek/z' });
  assert.equal(worktrees.recordedWorktreeBranch(config, '/r/.code/worktrees/r-1/'), 'deepseek/m1', 'folders compare resolved');
  assert.equal(worktrees.recordedWorktreeBranch(config, '/nowhere'), undefined);
  assert.equal(worktrees.recordedWorktreeBranch({ worktreeBranches: { '/x': 'a\u0000b' } }, '/x'), undefined, 'a hand-edited bad entry is not reported');
  assert.equal(worktrees.recordedWorktreeBranch({}, '/x'), undefined);
});

test('forgetWorktree keeps the branch while a session (open or archived) names the folder, drops it otherwise', () => {
  const make = () => ({
    threadIds: ['open'], archivedThreadIds: ['archived'],
    threadMetadata: { open: { cwd: '/r/wt-open' }, archived: { cwd: '/r/wt-archived/' } },
    worktreeDirectories: ['/r/wt-open', '/r/wt-archived', '/r/wt-unused'],
    worktreeBases: { '/r/wt-archived': 'main' }, worktreeOrigins: { '/r/wt-archived': '/r', '/r/wt-unused': '/r' },
    worktreeBranches: { '/r/wt-open': 'deepseek/o', '/r/wt-archived': 'deepseek/a', '/r/wt-unused': 'deepseek/u' },
  });
  const config = make();
  worktrees.forgetWorktree(config, '/r/wt-archived');
  assert.deepEqual(config.worktreeDirectories, ['/r/wt-open', '/r/wt-unused']);
  assert.deepEqual(config.worktreeBases, {});
  assert.deepEqual(config.worktreeOrigins, { '/r/wt-unused': '/r' });
  assert.equal(config.worktreeBranches['/r/wt-archived'], 'deepseek/a', 'an archived session still works there');
  worktrees.forgetWorktree(config, '/r/wt-unused');
  assert.equal('/r/wt-unused' in config.worktreeBranches, false, 'Storage › Remove worktrees: nobody names it');
  config.archivedThreadIds = [];
  worktrees.forgetWorktree(config, '/r/wt-archived');
  assert.equal('/r/wt-archived' in config.worktreeBranches, false, 'the deleted session took the folder with it');
  assert.deepEqual(config.worktreeBranches, { '/r/wt-open': 'deepseek/o' });
  const without = { worktreeDirectories: ['/x'] };
  worktrees.forgetWorktree(without, '/x');
  assert.equal('worktreeBranches' in without, false, 'configs from before the record stay as they were');
});

// R4i-small SM3 (R4g-small SM3 followUp): a session archived (worktree-remove kept its record) and then deleted
// left the record behind for good, since its folder was never forgotten again. The original's branch is a LocalSession
// field and goes with the session, so every record and forget now drops records nobody can name.
test('pruneWorktreeBranches: records go with their session; the map stays bounded by worktrees plus sessions', () => {
  const config = {
    threadIds: ['open'], archivedThreadIds: ['archived'],
    threadMetadata: { open: { cwd: '/r/wt-open' }, archived: { cwd: '/r/wt-archived' }, deleted: { cwd: '/r/wt-deleted' } },
    worktreeDirectories: ['/r/wt-open', '/r/wt-prepared'],
    worktreeBranches: { '/r/wt-open': 'deepseek/o', '/r/wt-archived/': 'deepseek/a', '/r/wt-prepared': 'deepseek/p', '/r/wt-deleted': 'deepseek/d' },
  };
  worktrees.pruneWorktreeBranches(config);
  assert.deepEqual(config.worktreeBranches, { '/r/wt-open': 'deepseek/o', '/r/wt-archived/': 'deepseek/a', '/r/wt-prepared': 'deepseek/p' },
    'live folders (even before their session starts) and folders an open or archived session names stay; the deleted session\'s goes');
  // Archive then delete: the archived session's record survives worktree-remove, and goes on the next record.
  config.archivedThreadIds = [];
  config.worktreeDirectories.push('/r/wt-new');
  worktrees.recordWorktreeBranch(config, '/r/wt-new', 'deepseek/n');
  assert.deepEqual(Object.keys(config.worktreeBranches).sort(), ['/r/wt-new', '/r/wt-open', '/r/wt-prepared']);
  // ... and on the next forget, too.
  config.worktreeBranches['/r/wt-stale'] = 'deepseek/s';
  worktrees.forgetWorktree(config, '/r/wt-prepared');
  assert.deepEqual(Object.keys(config.worktreeBranches).sort(), ['/r/wt-new', '/r/wt-open']);
  // Many sessions archived and deleted in turn never grow the map past the app's worktrees plus its sessions.
  const churn = { threadIds: [], archivedThreadIds: [], threadMetadata: {}, worktreeDirectories: [] };
  for (let i = 0; i < 200; i++) {
    const dir = `/r/wt-${i}`, id = `s${i}`;
    churn.worktreeDirectories.push(dir);
    worktrees.recordWorktreeBranch(churn, dir, `deepseek/${i}`);
    churn.threadMetadata[id] = { cwd: dir }; churn.archivedThreadIds.push(id);
    worktrees.forgetWorktree(churn, dir); // archived: worktree-remove
    churn.archivedThreadIds = churn.archivedThreadIds.filter((x) => x !== id); delete churn.threadMetadata[id]; // deleted
  }
  assert.ok(Object.keys(churn.worktreeBranches).length <= 1, JSON.stringify(churn.worktreeBranches));
  assert.equal(worktrees.pruneWorktreeBranches({}), undefined, 'no record map: nothing to do');
});

test('prepareWorktree (and the IPC case) record the new branch next to the base and origin', async (t) => {
  const base = tempDir(t);
  const repo = path.join(base, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  const calls = [];
  const run = async (file, args) => {
    calls.push(args.slice(2));
    if (args[2] === 'remote') throw Object.assign(new Error("error: No such remote 'origin'"), { code: 2, stderr: '' });
    if (args[2] === 'rev-parse' && args[3] === '--show-toplevel') return { stdout: `${repo}\n`, stderr: '' };
    if (args[2] === 'rev-parse' && args[3] === '--git-common-dir') return { stdout: '.git\n', stderr: '' };
    return { stdout: '', stderr: '' };
  };
  let n = 1_900_000_000_000;
  const config = { cwd: repo, worktreeBases: {}, worktreeDirectories: [] };
  const dest = await prepareWorktree({ cwd: repo, branch: 'main' }, { run, config, save: () => {}, approvedWorkspaceRoots: new Set(),
    prefix: 'deepseek/', now: () => n++ });
  const branch = `deepseek/${(1_900_000_000_000).toString(36)}`;
  assert.deepEqual(calls.find((args) => args[0] === 'worktree'), ['worktree', 'add', '-b', branch, dest, 'main']);
  assert.deepEqual(config.worktreeBranches, { [dest]: branch });
  assert.deepEqual(config.worktreeOrigins, { [dest]: repo });
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  const start = main.indexOf('case "prepare-worktree": {');
  const body = main.slice(start, main.indexOf('return dest;', start));
  if (body.includes('"worktree",\n            "add",'))
    assert.equal(occurrences(body, 'worktrees.recordWorktreeBranch(config, dest, name);'), 1, 'the inline IPC case records it too');
});

/** A repository with a live worktree, a gone one and a live detached one; the gone one was forgotten by worktree-remove. */
function fixture(t) {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  write(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  const live = path.join(repo, '.code', 'worktrees', 'repo-a');
  write(path.join(repo, '.git', 'worktrees', 'repo-a', 'HEAD'), 'ref: refs/heads/feature/switched\n');
  write(path.join(live, '.git'), `gitdir: ${path.join(repo, '.git', 'worktrees', 'repo-a')}\n`);
  const detached = path.join(repo, '.code', 'worktrees', 'repo-d');
  write(path.join(repo, '.git', 'worktrees', 'repo-d', 'HEAD'), '0123456789abcdef0123456789abcdef01234567\n');
  write(path.join(detached, '.git'), `gitdir: ${path.join(repo, '.git', 'worktrees', 'repo-d')}\n`);
  const gone = path.join(repo, '.code', 'worktrees', 'repo-gone');
  const goneBare = path.join(repo, '.code', 'worktrees', 'repo-gone-bare');
  const config = {
    threadIds: ['live', 'detached', 'plain'], archivedThreadIds: ['gone', 'bare'],
    threadMetadata: { live: { cwd: live }, detached: { cwd: detached }, plain: { cwd: repo }, gone: { cwd: gone }, bare: { cwd: goneBare } },
    sessionMetadata: { live: { originCwd: repo }, gone: { originCwd: repo } },
    worktreeDirectories: [live, detached, gone, goneBare],
    worktreeOrigins: { [live]: repo, [detached]: repo, [gone]: repo, [goneBare]: repo },
    worktreeBases: {}, worktreeBranches: {},
  };
  for (const [folder, branch] of [[live, 'deepseek/m1live'], [detached, 'deepseek/m1det'], [gone, 'deepseek/m1gone'], [goneBare, 'kimi/m1bare']])
    worktrees.recordWorktreeBranch(config, folder, branch);
  // worktree-remove after the sessions were archived: the folders went, their sessions still name them.
  worktrees.forgetWorktree(config, gone);
  worktrees.forgetWorktree(config, goneBare);
  return { repo, live, detached, gone, goneBare, config };
}

test('session-rail-meta: the live branch first, the recorded branch for a detached HEAD or a gone worktree', async (t) => {
  const f = fixture(t);
  const read = (sessionId) => railMeta.sessionRailRecord({ sessionId }, { config: f.config, run: async () => ({ stdout: '' }) });
  assert.equal((await read('live')).branch, 'feature/switched', 'a live worktree reports what it has checked out');
  assert.equal((await read('detached')).branch, 'deepseek/m1det', 'a detached HEAD falls back to the record');
  assert.deepEqual(await read('gone'), { cwd: f.gone, originCwd: f.repo, startedWithWorktree: true, worktreeRemoved: true, isArchived: true,
    branch: 'deepseek/m1gone' }, 'the original keeps branch after its worktree was deleted');
  const bare = await read('bare');
  assert.deepEqual([bare.startedWithWorktree, bare.worktreeRemoved, bare.branch], [true, true, 'kimi/m1bare'],
    'a session with no recorded origin is still a worktree session ($C: a recorded branch)');
  assert.equal(bare.originCwd, f.repo, 'the .code/worktrees layout names the repository');
  assert.equal((await read('plain')).branch, undefined, 'a session in its own folder has none');
  const record = localSessionRecord(await read('gone'));
  assert.equal(railRecordFacts(record, false).recordedBranch, 'deepseek/m1gone', 'cf74bc599 VE recorded:O?.branch');
  assert.equal(railMetaFromRecord(record).hasDesktopWorktree, false, 'no worktree mark for a gone worktree');
});
