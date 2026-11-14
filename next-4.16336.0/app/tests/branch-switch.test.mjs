import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import branchSwitch from '../electron/branch-switch.cjs';

const { porcelainEntries, dirtyPaths, pathsOverlap, wouldBranchSwitchConflict } = branchSwitch;

test('porcelainEntries parses v1 -z records, renames and unmerged entries', () => {
  const entries = porcelainEntries(' M README.md\0R  new.txt\0old.txt\0?? notes/\0UU both.txt\0AA added.txt\0');
  assert.deepEqual(entries, [
    { xy: ' M', path: 'README.md', unmerged: false },
    { xy: 'R ', path: 'new.txt', unmerged: false, origPath: 'old.txt' },
    { xy: '??', path: 'notes/', unmerged: false },
    { xy: 'UU', path: 'both.txt', unmerged: true },
    { xy: 'AA', path: 'added.txt', unmerged: true },
  ]);
  assert.deepEqual(dirtyPaths(entries.slice(0, 2)), ['README.md', 'new.txt', 'old.txt']);
  assert.deepEqual(porcelainEntries(''), []);
  assert.deepEqual(porcelainEntries(undefined), []);
});

test('pathsOverlap mirrors b(e, t): same file, a changed file under a dirty folder, a dirty file under a changed path', () => {
  assert.equal(pathsOverlap(['README.md'], ['README.md']), true);
  assert.equal(pathsOverlap(['README.md'], ['src/index.js']), false);
  assert.equal(pathsOverlap(['notes/'], ['notes/a.md']), true, 'an untracked folder the target adds files to');
  assert.equal(pathsOverlap(['src'], ['src/index.js']), true);
  assert.equal(pathsOverlap(['lib/x/y.js'], ['lib/x']), true, 'the target turns a folder into a file');
  assert.equal(pathsOverlap(['src-old/a.js'], ['src/a.js']), false, 'a shared name prefix is not a folder');
  assert.equal(pathsOverlap([], ['a']), false);
  assert.equal(pathsOverlap(['a'], []), false);
});

test('wouldBranchSwitchConflict: clean, unmerged, unknown target, overlap and the any-dirty fallback', async () => {
  const calls = [];
  const git = (changed, { commit = 'abc123', fail = false } = {}) => async (args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') return args[3].startsWith('refs/heads/') ? `${commit}\n` : '';
    if (fail) throw new Error('diff failed');
    return changed.join('\0') + (changed.length ? '\0' : '');
  };
  const dirty = porcelainEntries(' M README.md\0');
  assert.equal(await wouldBranchSwitchConflict([], 'zeta', git([])), false, 'a clean tree never conflicts');
  assert.equal(await wouldBranchSwitchConflict(dirty, 'zeta', git(['src/a.js'])), false, 'a dirty path the target leaves alone');
  assert.equal(await wouldBranchSwitchConflict(dirty, 'zeta', git(['README.md'])), true);
  assert.deepEqual(calls.at(-1), ['diff', '--name-only', '--no-renames', '-z', 'HEAD', 'abc123']);
  assert.equal(await wouldBranchSwitchConflict(porcelainEntries('UU README.md\0'), 'zeta', git([])), true, 'unmerged entries always conflict');
  assert.equal(await wouldBranchSwitchConflict(dirty, 'zeta', git([], { commit: '' })), true, 'an unresolvable target falls back to dirty');
  assert.equal(await wouldBranchSwitchConflict(dirty, 'zeta', git([], { fail: true })), true, 'a failed diff falls back to any-dirty');
  assert.equal(await wouldBranchSwitchConflict(dirty, '-x', git([])), true);
  assert.equal(await wouldBranchSwitchConflict(dirty, undefined, git([])), true, 'no target: the any-dirty gate');
});

test('wouldBranchSwitchConflict against a real repository', async (t) => {
  const run = promisify(execFile);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'branch-switch-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const sh = (...args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' });
  sh('init', '-q', '-b', 'main'); sh('config', 'user.name', 'Fixture'); sh('config', 'user.email', 'fixture@example.invalid');
  await fs.writeFile(path.join(root, 'README.md'), 'base\n'); await fs.writeFile(path.join(root, 'other.md'), 'other\n');
  sh('add', '.'); sh('commit', '-qm', 'base');
  sh('checkout', '-q', '-b', 'zeta'); await fs.writeFile(path.join(root, 'README.md'), 'base\nzeta\n'); sh('commit', '-qam', 'zeta'); sh('checkout', '-q', 'main');
  const git = (args) => run('git', ['-C', root, ...args], { env }).then((result) => result.stdout);
  const status = async () => porcelainEntries((await run('git', ['-C', root, 'status', '--porcelain', '-z'], { env })).stdout);
  await fs.writeFile(path.join(root, 'scratch.txt'), 'untracked\n');
  await fs.appendFile(path.join(root, 'other.md'), 'more\n');
  assert.equal(await wouldBranchSwitchConflict(await status(), 'zeta', git), false, 'untracked scratch.txt and other.md do not block the switch');
  await fs.appendFile(path.join(root, 'README.md'), 'dirty\n');
  assert.equal(await wouldBranchSwitchConflict(await status(), 'zeta', git), true, 'README.md differs on zeta');
  assert.equal(await wouldBranchSwitchConflict(await status(), 'missing', git), true, 'a branch that does not resolve');
});
