import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const { workspaceGitStatus, workspaceGitDiff, workspaceGitImage } = createRequire(import.meta.url)('../electron/git-status.cjs');
const execute = promisify(execFile);
const git = (cwd, args) => execute('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], {
  cwd, encoding: 'utf8', timeout: 10000, env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
});
async function directory(t, repo = true) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'code-desktop-git-'));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  if (repo) await git(cwd, ['init', '-q', '-b', 'fixture']);
  return cwd;
}
async function write(cwd, name, text) {
  await fs.mkdir(path.dirname(path.join(cwd, name)), { recursive: true });
  await fs.writeFile(path.join(cwd, name), text);
}
async function commit(cwd) { await git(cwd, ['add', '--all']); await git(cwd, ['commit', '-qm', 'Fixture baseline']); }
const detail = (status, name) => status.fileDetails.find((file) => file.path === name);
const hash = (data) => createHash('sha256').update(data).digest('hex');

test('ordinary directory and missing directory report no repository and empty diff', async (t) => {
  const cwd = await directory(t, false);
  for (const input of [cwd, path.join(cwd, 'missing')]) {
    const status = await workspaceGitStatus(input);
    assert.equal(status.isRepo, false); assert.equal(status.cwd, input);
    assert.equal(status.hasChanges, false); assert.equal(status.diffBase, null);
    assert.equal(status.files, 0); assert.equal(status.added, 0); assert.equal(status.removed, 0);
    assert.equal(await workspaceGitDiff(input), '');
  }
});

test('clean repository resolves nested cwd and reports HEAD; detached HEAD uses short SHA', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'nested/file.txt', 'one\n'); await commit(cwd);
  const head = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  let status = await workspaceGitStatus(path.join(cwd, 'nested'));
  assert.equal(status.isRepo, true); assert.equal(status.cwd, await fs.realpath(cwd));
  assert.equal(status.repoName, path.basename(cwd)); assert.equal(status.branch, 'fixture');
  assert.equal(status.diffBase, head); assert.equal(status.baseKind, 'HEAD');
  assert.equal(status.files, 0); assert.equal(status.hasChanges, false);
  assert.equal(await workspaceGitDiff(cwd), '');
  await git(cwd, ['checkout', '--detach', '-q']);
  status = await workspaceGitStatus(cwd); assert.equal(status.branch, head.slice(0, 7));
});

test('HEAD to current tree includes staged and unstaged changes, rename, deletion, binary and untracked', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'modified.txt', 'a\nb\nc\n');
  await write(cwd, 'staged.txt', 'old\n');
  await write(cwd, 'rename old.txt', 'same\n');
  await write(cwd, 'deleted.txt', 'remove\n');
  await write(cwd, 'binary.dat', Buffer.from([0, 1, 2, 3]));
  await commit(cwd);
  await write(cwd, 'modified.txt', 'a\nB\nc\nd\n');
  await write(cwd, 'staged.txt', 'old\nnew\n'); await git(cwd, ['add', 'staged.txt']);
  await git(cwd, ['mv', 'rename old.txt', 'rename new.txt']);
  await fs.unlink(path.join(cwd, 'deleted.txt'));
  await write(cwd, 'binary.dat', Buffer.from([0, 1, 2, 4]));
  await write(cwd, 'untracked.txt', 'first\nsecond\n');
  await write(cwd, 'untracked.bin', Buffer.from([0, 55, 66]));
  const indexFile = path.join(cwd, '.git/index');
  const before = hash(await fs.readFile(indexFile));
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.hasChanges, true); assert.equal(status.added, 5); assert.equal(status.removed, 2);
  assert.equal(status.files, 7); assert.equal(status.binaryFiles, 2); assert.equal(status.untrackedCount, 2);
  assert.deepEqual([detail(status, 'modified.txt').added, detail(status, 'modified.txt').removed], [2, 1]);
  assert.equal(detail(status, 'staged.txt').indexStatus, 'M');
  assert.equal(detail(status, 'rename new.txt').oldPath, 'rename old.txt');
  assert.equal(detail(status, 'binary.dat').binary, true);
  assert.equal(detail(status, 'untracked.bin').binary, true);
  const diff = await workspaceGitDiff(cwd);
  assert.match(diff, /\+B\n/); assert.match(diff, /\+new\n/); assert.match(diff, /\+second\n/);
  assert.match(diff, /rename from rename old.txt\nrename to rename new.txt/);
  assert.match(diff, /Binary files .*binary.dat differ/); assert.match(diff, /Binary files .*untracked.bin differ/);
  assert.equal(hash(await fs.readFile(indexFile)), before, 'query does not rewrite the index');
});

test('staged and unstaged cancellation is a net zero diff but still a dirty index', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'file.txt', 'original\n'); await commit(cwd);
  await write(cwd, 'file.txt', 'staged\n'); await git(cwd, ['add', 'file.txt']);
  await write(cwd, 'file.txt', 'original\n');
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.hasChanges, true); assert.equal(status.files, 1);
  assert.equal(status.added, 0); assert.equal(status.removed, 0);
  assert.equal(await workspaceGitDiff(cwd), '');
});

test('unborn repository counts current content once, including unstaged edits after git add', async (t) => {
  const cwd = await directory(t);
  let status = await workspaceGitStatus(cwd);
  assert.equal(status.isRepo, true); assert.equal(status.hasChanges, false);
  assert.equal(status.branch, 'fixture'); assert.equal(status.baseKind, 'empty-tree');
  assert.equal(status.diffBase, '4b825dc642cb6eb9a060e54bf8d69288fbee4904');
  await write(cwd, 'staged.txt', 'before\n'); await git(cwd, ['add', 'staged.txt']);
  await write(cwd, 'staged.txt', 'current\nextra\n');
  await write(cwd, 'loose.txt', 'loose\n'); await write(cwd, 'binary.bin', Buffer.from([0, 7]));
  status = await workspaceGitStatus(cwd);
  assert.equal(status.added, 3); assert.equal(status.removed, 0);
  assert.equal(status.files, 3); assert.equal(status.binaryFiles, 1); assert.equal(status.untrackedCount, 2);
  const diff = await workspaceGitDiff(cwd);
  assert.match(diff, /\+current\n\+extra\n/); assert.doesNotMatch(diff, /\+before\n/);
  assert.match(diff, /\+loose\n/); assert.match(diff, /Binary files/);
});

test('NUL protocols preserve spaces, tabs, newlines, Unicode and leading option-like names', async (t) => {
  const cwd = await directory(t);
  const old = 'old\tline\n日本語.txt', renamed = 'new\tline\n日本語.txt';
  await write(cwd, old, 'kept\n'); await commit(cwd);
  await git(cwd, ['mv', '--', old, renamed]);
  const loose = '--file\nwith\ttabs.txt'; await write(cwd, loose, 'new\n');
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.files, 2); assert.equal(status.added, 1);
  assert.equal(detail(status, renamed).oldPath, old); assert.equal(detail(status, loose).untracked, true);
  assert.match(await workspaceGitDiff(cwd), /\+new\n/);
});

test('symlinks are diffed as link text; directory links never reveal outside contents', async (t) => {
  const cwd = await directory(t), outside = await directory(t, false);
  const secret = 'EXTERNAL-CONTENT-MUST-NOT-APPEAR';
  await write(cwd, 'tracked.txt', 'base\n'); await commit(cwd);
  await write(outside, 'private.txt', secret + '\n');
  await fs.symlink(path.join(outside, 'private.txt'), path.join(cwd, 'file-link'));
  await fs.symlink(outside, path.join(cwd, 'directory\tlink\nname'));
  const status = await workspaceGitStatus(cwd), diff = await workspaceGitDiff(cwd);
  assert.equal(status.files, 2); assert.equal(status.untrackedCount, 2); assert.equal(status.added, 2);
  assert.equal((diff.match(/new file mode 120000/g) || []).length, 2);
  assert.doesNotMatch(diff, new RegExp(secret));
  const patchFile = path.join(cwd, '.git/symlink-check.patch');
  await fs.writeFile(patchFile, diff);
  await git(cwd, ['apply', '--check', '--reverse', patchFile]);
});

test('external diff, textconv, clean/process filter and fsmonitor programs are not executed', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'file.txt', 'base\n'); await commit(cwd);
  const marker = path.join(cwd, 'must-not-run');
  // Deliberately configured Git commands are test data; the module must disable
  // them before status/diff can execute any command from repository config.
  const command = `touch '${marker}'`;
  await git(cwd, ['config', 'diff.external', command]);
  await git(cwd, ['config', 'diff.probe.textconv', command]);
  await git(cwd, ['config', 'filter.probe.clean', command]);
  await git(cwd, ['config', 'filter.probe.process', command]);
  await git(cwd, ['config', 'filter.probe.required', 'true']);
  await git(cwd, ['config', 'core.fsmonitor', command]);
  await write(cwd, '.gitattributes', '*.txt filter=probe diff=probe\n');
  await write(cwd, 'file.txt', 'changed\n');
  const status = await workspaceGitStatus(cwd), diff = await workspaceGitDiff(cwd);
  assert.equal(detail(status, 'file.txt').added, 1); assert.match(diff, /\+changed\n/);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

test('log.showSignature never runs the repository gpg.program (commit list, commit scope, status, branch diff)', async (t) => {
  // heavyWorkWorker: its git config carries `-c log.showSignature=false` and Oa passes --no-show-signature.
  const { workspaceGitCommits: commitsOf } = createRequire(import.meta.url)('../electron/git-status.cjs');
  const cwd = await directory(t);
  await write(cwd, 'file.txt', 'base\n'); await commit(cwd);
  await git(cwd, ['branch', 'base']);
  await write(cwd, 'signed.txt', 'signed\n'); await git(cwd, ['add', '--all']);
  const tree = (await git(cwd, ['write-tree'])).stdout.trim(), parent = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  const object = path.join(cwd, '.git', 'signed-commit');
  await fs.writeFile(object, [`tree ${tree}`, `parent ${parent}`, 'author Fixture <fixture@example.invalid> 1700000000 +0000',
    'committer Fixture <fixture@example.invalid> 1700000000 +0000', 'gpgsig -----BEGIN PGP SIGNATURE-----', ' ', ' iQEzBAABCAAdFiEEfixture=',
    ' -----END PGP SIGNATURE-----', '', 'Signed commit', ''].join('\n'));
  const signed = (await git(cwd, ['hash-object', '-t', 'commit', '-w', object])).stdout.trim();
  await git(cwd, ['update-ref', 'HEAD', signed]);
  const marker = path.join(cwd, 'gpg-ran'), program = path.join(cwd, '.git', 'fake-gpg');
  await fs.writeFile(program, `#!/bin/sh\ntouch '${marker}'\nexit 1\n`, { mode: 0o755 });
  for (const key of ['gpg.program', 'gpg.ssh.program', 'gpg.x509.program']) await git(cwd, ['config', key, program]);
  await git(cwd, ['config', 'log.showSignature', 'true']);
  // The fixture is live: a plain log in this repository does run the program.
  await git(cwd, ['log', '-1', '--format=%H']);
  await fs.stat(marker); await fs.rm(marker);
  const listed = await commitsOf(cwd, { base: 'base' });
  assert.deepEqual(listed.commits.map((entry) => entry.sha), [signed]);
  assert.match(await workspaceGitDiff(cwd, { scope: `commit:${signed}` }), /\+signed\n/);
  assert.match(await workspaceGitDiff(cwd, { base: 'base' }), /\+signed\n/);
  assert.equal((await workspaceGitStatus(cwd)).isRepo, true);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

test('untracked nested repository is not recursively included', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'base.txt', 'base\n'); await commit(cwd);
  await fs.mkdir(path.join(cwd, 'nested'));
  await git(path.join(cwd, 'nested'), ['init', '-q']);
  await write(cwd, 'nested/private.txt', 'NESTED-CONTENT\n');
  const status = await workspaceGitStatus(cwd), diff = await workspaceGitDiff(cwd);
  assert.equal(status.untrackedCount, 1); assert.equal(status.added, 0);
  assert.doesNotMatch(diff, /NESTED-CONTENT/);
});

test('large diff rejects at the output bound instead of returning partial content', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'base.txt', 'base\n'); await commit(cwd);
  await write(cwd, 'large.txt', 'x'.repeat(17 * 1024 * 1024) + '\n');
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.added, 1); assert.equal(status.untrackedCount, 1);
  await assert.rejects(workspaceGitDiff(cwd), { code: 'GIT_OUTPUT_LIMIT' });
});

test('untracked files are counted like git diff --no-index --numstat, without one Git process per file', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'base.txt', 'base\n'); await commit(cwd);
  await write(cwd, '.gitattributes', '*.dat -diff\n*.raw binary\n');
  await write(cwd, 'two', 'a\nb'); await write(cwd, 'one', 'a\n'); await write(cwd, 'empty', '');
  await write(cwd, 'crlf', 'a\r\nb\r\n'); await write(cwd, 'nul', Buffer.from('a\0b\n'));
  // A NUL past Git's first 8000 bytes is still text: 5000 lines plus the unterminated "\0".
  await write(cwd, 'late', Buffer.concat([Buffer.from('a\n'.repeat(5000)), Buffer.from([0])]));
  await write(cwd, 'marked.dat', 'x\ny\n'); await write(cwd, 'image.raw', 'x\n');
  for (let at = 0; at < 300; at++) await write(cwd, `many/f${at}.txt`, 'line\n');
  const { commands, trace } = recorder();
  const status = await workspaceGitStatus(cwd, { trace });
  const counts = Object.fromEntries(status.fileDetails.filter((file) => !file.path.startsWith('many/')).map((file) => [file.path, file.binary ? '-' : file.added]));
  assert.deepEqual(counts, { '.gitattributes': 2, two: 2, one: 1, empty: 0, crlf: 2, nul: '-', late: 5001, 'marked.dat': '-', 'image.raw': '-' });
  // Each count matches Git's own answer for that file.
  for (const name of Object.keys(counts)) {
    const { stdout } = await git(cwd, ['diff', '--no-index', '--numstat', '--', '/dev/null', name]).catch((error) => error);
    assert.equal(stdout.split('\t')[0], String(counts[name]), name);
  }
  assert.equal(status.untrackedCount, 309); assert.equal(status.added, 2 + 2 + 1 + 2 + 5001 + 300);
  assert.equal(commands.filter((entry) => entry.args.includes('--no-index')).length, 0, 'no per-file git diff');
  assert.ok(commands.length < 20, `a bounded number of Git processes (${commands.length})`);
});

// ---- Base branch and ahead/behind (official main process merge-base + rev-list --left-right --count) ----
const { workspaceGitComparison } = createRequire(import.meta.url)('../electron/git-status.cjs');
async function remoteRepo(t) {
  // A bare origin plus a clone whose main is pushed; origin/HEAD points at main.
  const origin = await directory(t, false), cwd = await directory(t, false);
  await git(origin, ['init', '-q', '--bare', '-b', 'main']);
  await git(cwd, ['init', '-q', '-b', 'main']);
  await git(cwd, ['remote', 'add', 'origin', origin]);
  await write(cwd, 'base.txt', 'base\n'); await commit(cwd);
  await git(cwd, ['push', '-q', '-u', 'origin', 'main']);
  await git(cwd, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
  return { origin, cwd };
}
async function commitFile(cwd, name, text) { await write(cwd, name, text); await commit(cwd); }
function recorder() {
  const commands = [];
  return { commands, trace: (entry) => commands.push(entry) };
}

test('comparison: on the default branch itself the base is origin/HEAD (same) and unpushed commits count as ahead', async (t) => {
  const { cwd } = await remoteRepo(t);
  const result = await workspaceGitComparison(cwd);
  assert.equal(result.base, 'main'); assert.equal(result.baseSource, 'default'); assert.equal(result.same, true);
  assert.equal(result.baseRef, 'refs/remotes/origin/main');
  assert.equal(result.ahead, 0); assert.equal(result.behind, 0); assert.equal(result.unpushed, 0);
  await commitFile(cwd, 'local.txt', 'local\n');
  const after = await workspaceGitComparison(cwd);
  assert.equal(after.unpushed, 1); assert.equal(after.ahead, 1, 'no branch === base short-circuit');
});

test('comparison: unpushed feature branch resolves origin/HEAD as base with ahead 2 / behind 1 and the real merge base', async (t) => {
  const { cwd } = await remoteRepo(t);
  const mergeBase = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  await git(cwd, ['checkout', '-q', '-b', 'feature']);
  await commitFile(cwd, 'f1.txt', 'one\n'); await commitFile(cwd, 'f2.txt', 'two\n');
  await git(cwd, ['checkout', '-q', 'main']);
  await commitFile(cwd, 'm1.txt', 'main moved\n'); await git(cwd, ['push', '-q', 'origin', 'main']);
  await git(cwd, ['checkout', '-q', 'feature']);
  await write(cwd, 'f1.txt', 'one\nedited\n');
  const { commands, trace } = recorder();
  const status = await workspaceGitStatus(cwd, { trace });
  // Band stats are merge-base → worktree: both feature commits plus the edit (f1 +2, f2 +1).
  assert.equal(status.branch, 'feature'); assert.equal(status.hasChanges, true); assert.equal(status.added, 3);
  assert.equal(status.workingTreeDirty, true); assert.equal(status.diffBase, mergeBase); assert.equal(status.baseKind, 'merge-base');
  assert.equal(status.scopeBase, 'main');
  const comparison = status.comparison;
  assert.equal(comparison.base, 'main'); assert.equal(comparison.baseSource, 'default');
  assert.equal(comparison.ahead, 2); assert.equal(comparison.behind, 1); assert.equal(comparison.same, false);
  assert.equal(comparison.mergeBase, mergeBase); assert.equal(comparison.unpushed, null);
  assert.deepEqual(await workspaceGitComparison(cwd), comparison);
  // Read-only: no network verbs and no inherited protocol allowances.
  for (const entry of commands) {
    assert.ok(!entry.args.some((arg) => ['fetch', 'ls-remote', 'push', 'pull', 'remote'].includes(arg)), `network verb in ${entry.args.join(' ')}`);
    assert.ok(!entry.envKeys.includes('GIT_ALLOW_PROTOCOL'));
    assert.ok(!entry.envKeys.some((key) => key.startsWith('GIT_') && !['GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_GLOBAL', 'GIT_OPTIONAL_LOCKS', 'GIT_NO_REPLACE_OBJECTS', 'GIT_LITERAL_PATHSPECS'].includes(key)), 'inherited GIT_* variable');
  }
  assert.ok(commands.some((entry) => entry.args.includes('merge-base')));
  assert.ok(commands.some((entry) => entry.args.includes('--left-right')));
});

test('comparison: origin/HEAD wins over a pushed branch that contains HEAD (getGitInfo defaultBranch, no cloud-branch order)', async (t) => {
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['checkout', '-q', '-b', 'feature']);
  await commitFile(cwd, 'f1.txt', 'one\n');
  await git(cwd, ['push', '-q', '-u', 'origin', 'feature']);
  await git(cwd, ['checkout', '-q', '-b', 'topic']);
  let result = await workspaceGitComparison(cwd);
  assert.equal(result.base, 'main'); assert.equal(result.baseSource, 'default');
  assert.equal(result.ahead, 1); assert.equal(result.behind, 0); assert.equal(result.same, false);
  await git(cwd, ['checkout', '-q', 'feature']);
  result = await workspaceGitComparison(cwd);
  assert.equal(result.base, 'main'); assert.equal(result.same, false); assert.equal(result.unpushed, 0);
});

test('comparison: without origin/HEAD the first of origin/main and origin/master is the default', async (t) => {
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['symbolic-ref', '--delete', 'refs/remotes/origin/HEAD']);
  await git(cwd, ['checkout', '-q', '-b', 'feature']); await commitFile(cwd, 'f1.txt', 'one\n');
  const result = await workspaceGitComparison(cwd);
  assert.equal(result.base, 'main'); assert.equal(result.baseSource, 'default'); assert.equal(result.ahead, 1);
});

test('comparison: detached HEAD compares against the inferred default without a branch', async (t) => {
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['checkout', '-q', '-b', 'feature']);
  await commitFile(cwd, 'f1.txt', 'one\n');
  await git(cwd, ['checkout', '-q', '--detach']);
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.detached, true);
  assert.equal(status.comparison.base, 'main'); assert.equal(status.comparison.baseSource, 'default');
  assert.equal(status.comparison.ahead, 1); assert.equal(status.comparison.behind, 0); assert.equal(status.comparison.unpushed, null);
});

test('comparison: without a remote the current branch is its own base (HEAD diff); a non-repository has no comparison', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'a.txt', 'a\n'); await commit(cwd);
  const head = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  const result = await workspaceGitComparison(cwd);
  assert.deepEqual(result, { base: 'fixture', baseSource: 'current', baseRef: 'refs/heads/fixture', mergeBase: head, ahead: 0, behind: 0, same: true, unpushed: null });
  assert.equal((await workspaceGitStatus(cwd)).comparison.base, 'fixture');
  // A detached HEAD without a remote resolves no base at all.
  await git(cwd, ['checkout', '-q', '--detach']);
  const detached = await workspaceGitStatus(cwd);
  assert.equal(detached.comparison.base, null); assert.equal(detached.scopeBase, null); assert.equal(detached.diffBase, head);
  const plain = await directory(t, false);
  assert.equal(await workspaceGitComparison(plain), null);
  assert.equal((await workspaceGitStatus(plain)).comparison, null);
  assert.equal((await workspaceGitStatus(plain)).workingTreeDirty, false);
});

test('comparison: unborn HEAD with a configured origin/HEAD reports 0/0 without a merge base', async (t) => {
  const origin = await directory(t, false), cwd = await directory(t);
  await git(origin, ['init', '-q', '--bare', '-b', 'main']);
  await git(cwd, ['remote', 'add', 'origin', origin]);
  await git(cwd, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
  const result = await workspaceGitComparison(cwd);
  assert.equal(result.base, 'main'); assert.equal(result.baseSource, 'default');
  assert.equal(result.ahead, 0); assert.equal(result.behind, 0); assert.equal(result.mergeBase, null);
});

test('comparison: a worktree session uses its recorded creation base only when no default branch resolves; invalid names are ignored', async (t) => {
  const cwd = await directory(t);
  await write(cwd, 'base.txt', 'base\n'); await commit(cwd);
  await git(cwd, ['checkout', '-q', '-b', 'feature']);
  await commitFile(cwd, 'f1.txt', 'one\n');
  const dest = path.join(await directory(t, false), 'wt');
  await git(cwd, ['worktree', 'add', '-q', '-b', 'codex/test', dest, 'feature']);
  await commitFile(dest, 'w1.txt', 'worktree\n');
  const featureSha = (await git(cwd, ['rev-parse', 'feature'])).stdout.trim();
  const preferred = await workspaceGitComparison(dest, { preferredBase: 'feature' });
  assert.equal(preferred.base, 'feature'); assert.equal(preferred.baseSource, 'session');
  assert.equal(preferred.ahead, 1); assert.equal(preferred.behind, 0); assert.equal(preferred.mergeBase, featureSha);
  const status = await workspaceGitStatus(dest, { preferredBase: 'feature' });
  assert.equal(status.added, 1); assert.equal(status.workingTreeDirty, false); assert.equal(status.diffBase, featureSha);
  const inferred = await workspaceGitComparison(dest);
  assert.equal(inferred.base, 'codex/test'); assert.equal(inferred.baseSource, 'current');
  for (const bad of ['--upload-pack=touch', 'no such', 'missing-branch']) {
    assert.equal((await workspaceGitComparison(dest, { preferredBase: bad })).baseSource, 'current');
  }
  // With an origin/HEAD the default wins over the recorded base (defaultBranch ?? sourceBranch ?? branch).
  const { cwd: remote } = await remoteRepo(t);
  await git(remote, ['checkout', '-q', '-b', 'feature']); await commitFile(remote, 'f.txt', 'f\n');
  assert.equal((await workspaceGitComparison(remote, { preferredBase: 'feature' })).baseSource, 'default');
});

// ---- Diff scopes (panes-tile-current.js zm; heavyWorkWorker fa/ua/ya) ----
const { workspaceGitCommits, workspaceGitBranches } = createRequire(import.meta.url)('../electron/git-status.cjs');

test('scope: a commit on feature/x with a clean tree keeps the band (hasChanges) but not the Commit gate (workingTreeDirty)', async (t) => {
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['checkout', '-q', '-b', 'feature/x']);
  await commitFile(cwd, 'feature.txt', 'one\ntwo\n');
  await write(cwd, 'base.txt', 'base\nmore\n'); await commit(cwd);
  const mergeBase = (await git(cwd, ['merge-base', 'origin/main', 'HEAD'])).stdout.trim();
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.hasChanges, true); assert.equal(status.workingTreeDirty, false);
  assert.equal(status.added, 3); assert.equal(status.removed, 0); assert.equal(status.files, 2);
  assert.equal(status.diffBase, mergeBase); assert.equal(status.scopeBase, 'main'); assert.equal(status.headSha, (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim());
  const branch = await workspaceGitDiff(cwd);
  assert.match(branch, /\+one\n\+two\n/); assert.match(branch, /\+more\n/);
  assert.equal(await workspaceGitDiff(cwd, { scope: 'uncommitted' }), '', 'the committed work is not uncommitted');
  await write(cwd, 'loose.txt', 'loose\n');
  assert.match(await workspaceGitDiff(cwd, { scope: 'uncommitted' }), /\+loose\n/);
  assert.match(await workspaceGitDiff(cwd, { scope: 'branch' }), /\+loose\n/, 'branch scope keeps the untracked additions');
});

test('scope: an unpushed commit on main is part of the default diff; without a remote branch scope equals the HEAD diff', async (t) => {
  const { cwd } = await remoteRepo(t);
  await commitFile(cwd, 'unpushed.txt', 'local only\n');
  const status = await workspaceGitStatus(cwd);
  assert.equal(status.hasChanges, true); assert.equal(status.workingTreeDirty, false); assert.equal(status.added, 1);
  assert.match(await workspaceGitDiff(cwd), /\+local only\n/);
  const plain = await directory(t);
  await write(plain, 'a.txt', 'a\n'); await commit(plain); await commitFile(plain, 'b.txt', 'b\n');
  await write(plain, 'a.txt', 'a\nchanged\n');
  assert.equal(await workspaceGitDiff(plain), await workspaceGitDiff(plain, { scope: 'uncommitted' }));
  const clean = await workspaceGitStatus(plain);
  assert.equal(clean.added, 1); assert.equal(clean.baseKind, 'HEAD');
});

test('scope: commit:<sha> is that commit\'s own patch; commits and branches feed the scope menu', async (t) => {
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['checkout', '-q', '-b', 'feature']);
  await commitFile(cwd, 'first.txt', 'first\n');
  await git(cwd, ['commit', '-q', '--allow-empty', '-m', 'Second']);
  await write(cwd, 'dirty.txt', 'dirty\n');
  const first = (await git(cwd, ['rev-parse', 'HEAD~1'])).stdout.trim();
  const patch = await workspaceGitDiff(cwd, { scope: `commit:${first}` });
  assert.match(patch, /\+first\n/); assert.doesNotMatch(patch, /dirty/);
  await assert.rejects(workspaceGitDiff(cwd, { scope: 'commit:--output=x' }), { code: 'GIT_SCOPE_INVALID' });
  await assert.rejects(workspaceGitDiff(cwd, { scope: 'commit:' + 'f'.repeat(40) }), { code: 'GIT_SCOPE_INVALID' });
  const listed = await workspaceGitCommits(cwd);
  assert.equal(listed.base, 'main');
  assert.deepEqual(listed.commits.map((entry) => entry.subject), ['Second', 'Fixture baseline']);
  assert.equal(listed.commits[1].sha, first); assert.equal(listed.commits[1].shortSha, first.slice(0, listed.commits[1].shortSha.length));
  assert.equal(listed.total, 2);
  // B15 Commits section rows (c44d00c7f Wr): the author and the committer date in Unix seconds.
  const author = (await git(cwd, ['log', '-1', '--format=%an%x1f%ct', first])).stdout.trim().split('\x1f');
  assert.equal(listed.commits[1].authorName, author[0]); assert.equal(listed.commits[1].date, Number(author[1]));
  assert.ok(listed.commits[1].date > 0);
  const limited = await workspaceGitCommits(cwd, { limit: 1 });
  assert.equal(limited.commits.length, 1); assert.equal(limited.total, 2, 'total counts every commit past the fetched rows');
  assert.deepEqual((await workspaceGitBranches(cwd)).sort(), ['feature', 'main']);
  // An explicit "Compare against" base replaces the default; an unknown one falls back to it.
  await git(cwd, ['branch', 'topic', 'HEAD~1']);
  assert.doesNotMatch(await workspaceGitDiff(cwd, { base: 'topic' }), /\+first\n/);
  assert.match(await workspaceGitDiff(cwd, { base: 'missing-branch' }), /\+first\n/);
  assert.deepEqual((await workspaceGitCommits(cwd, { base: 'topic' })).commits.map((entry) => entry.subject), ['Second']);
  const plain = await directory(t, false);
  assert.deepEqual(await workspaceGitCommits(plain), { base: null, commits: [], total: 0 });
  assert.deepEqual(await workspaceGitBranches(plain), []);
});

test('scope: commit:<sha> of a merge is the first-parent patch (heavyWorkWorker ka <sha>^..<sha>); a root commit diffs the empty tree', async (t) => {
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['checkout', '-q', '-b', 'feature']);
  await commitFile(cwd, 'feature.txt', 'feature\n');
  await git(cwd, ['checkout', '-q', '-b', 'side', 'main']);
  await commitFile(cwd, 'side.txt', 'side\n');
  await git(cwd, ['checkout', '-q', 'feature']);
  await git(cwd, ['merge', '-q', '--no-ff', '--no-edit', 'side']);
  const merge = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  const patch = await workspaceGitDiff(cwd, { scope: `commit:${merge}` });
  assert.doesNotMatch(patch, /diff --cc/); assert.match(patch, /^diff --git a\/side\.txt b\/side\.txt$/m);
  assert.match(patch, /\+side\n/); assert.doesNotMatch(patch, /feature/);
  const full = await workspaceGitDiff(cwd, { scope: `commit:${merge}`, completeContext: true });
  assert.equal(full.completeContext, true); assert.match(full.patch, /\+side\n/);
  const root = (await git(cwd, ['rev-list', '--max-parents=0', 'HEAD'])).stdout.trim();
  assert.match(await workspaceGitDiff(cwd, { scope: `commit:${root}` }), /new file mode 100644[\s\S]*\+base\n/);
  const listed = await workspaceGitCommits(cwd);
  assert.equal(listed.total, 3); assert.equal(listed.commits.length, 3);
});

test('complete-context envelope preserves real HEAD and current lines without rewriting index', async(t)=>{
 const cwd=await directory(t),lines=Array.from({length:800},(_,i)=>`const line${i+1} = ${i+1};`);
 await write(cwd,'context.ts',lines.join('\n')+'\n');await commit(cwd);
 const before=hash(await fs.readFile(path.join(cwd,'.git/index')));
 lines[149]='const line150 = "changed";';lines[599]='const line600 = "updated";';
 await write(cwd,'context.ts',lines.join('\n')+'\n');
 const partial=await workspaceGitDiff(cwd),full=await workspaceGitDiff(cwd,{completeContext:true});
 assert.equal(full.completeContext,true);assert.match(full.patch,/@@ -1,800 \+1,800 @@/);
 assert.match(full.patch,/\n-const line150 = 150;\n\+const line150 = "changed";/);
 assert.match(full.patch,/\n const line1 = 1;/);assert.match(full.patch,/\n const line800 = 800;/);
 assert.doesNotMatch(partial,/\n const line1 = 1;/);assert.equal(await workspaceGitDiff(cwd),partial);
 assert.equal(hash(await fs.readFile(path.join(cwd,'.git/index'))),before);
});

test('large unchanged context falls back to useful partial patch instead of raw full file',async(t)=>{
 const cwd=await directory(t),lines=Array.from({length:50100},(_,i)=>`line ${i+1}`);
 await write(cwd,'large.txt',lines.join('\n')+'\n');await commit(cwd);lines[24999]='changed';await write(cwd,'large.txt',lines.join('\n')+'\n');
 const value=await workspaceGitDiff(cwd,{completeContext:true});
 assert.equal(value.completeContext,false);assert.equal(value.patch,await workspaceGitDiff(cwd));assert.match(value.patch,/\+changed\n/);assert.ok(value.patch.length<1000);
});

test('empty complete-context query has an explicit empty payload for non-repositories',async(t)=>{
 const cwd=await directory(t,false);assert.deepEqual(await workspaceGitDiff(cwd,{completeContext:true}),{patch:'',completeContext:false});
});

test('B34 workspaceGitImage: before at the scope base, after in the working tree or commit, null when absent or unsafe', async (t) => {
  const cwd = await directory(t);
  const one = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]), two = Buffer.from([0x89, 0x50, 0x4e, 0x47, 2]);
  const url = (bytes, type = 'image/png') => `data:${type};base64,${bytes.toString('base64')}`;
  await fs.writeFile(path.join(cwd, 'logo.png'), one);
  await fs.writeFile(path.join(cwd, 'gone.jpg'), one);
  await write(cwd, 'notes.txt', 'text\n');
  await commit(cwd);
  const first = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  await fs.writeFile(path.join(cwd, 'logo.png'), two);
  await commit(cwd);
  const second = (await git(cwd, ['rev-parse', 'HEAD'])).stdout.trim();
  await fs.writeFile(path.join(cwd, 'logo.png'), one);
  await fs.rm(path.join(cwd, 'gone.jpg'));
  await fs.writeFile(path.join(cwd, 'new.webp'), two);
  // Uncommitted: HEAD (the second commit) against the working tree.
  assert.equal(await workspaceGitImage(cwd, { filePath: 'logo.png', side: 'before', scope: 'uncommitted' }), url(two));
  assert.equal(await workspaceGitImage(cwd, { filePath: 'logo.png', side: 'after', scope: 'uncommitted' }), url(one));
  assert.equal(await workspaceGitImage(cwd, { filePath: 'gone.jpg', side: 'after', scope: 'uncommitted' }), null, 'deleted from the tree');
  assert.equal(await workspaceGitImage(cwd, { filePath: 'gone.jpg', side: 'before', scope: 'uncommitted' }), url(one, 'image/jpeg'));
  assert.equal(await workspaceGitImage(cwd, { filePath: 'new.webp', side: 'before', scope: 'uncommitted' }), null, 'not in HEAD');
  assert.equal(await workspaceGitImage(cwd, { filePath: 'new.webp', side: 'after', scope: 'uncommitted' }), url(two, 'image/webp'));
  // A commit scope: its first parent against the commit itself; a root commit has no before.
  assert.equal(await workspaceGitImage(cwd, { filePath: 'logo.png', side: 'before', scope: `commit:${second}` }), url(one));
  assert.equal(await workspaceGitImage(cwd, { filePath: 'logo.png', side: 'after', scope: `commit:${second}` }), url(two));
  assert.equal(await workspaceGitImage(cwd, { filePath: 'logo.png', side: 'before', scope: `commit:${first}` }), null);
  // Branch scope without a remote compares against the branch's own HEAD.
  assert.equal(await workspaceGitImage(cwd, { filePath: 'logo.png', side: 'before' }), url(two));
  // Not an image, outside the repository, or a symlink: null without reading.
  assert.equal(await workspaceGitImage(cwd, { filePath: 'notes.txt', side: 'after' }), null);
  assert.equal(await workspaceGitImage(cwd, { filePath: '../escape.png', side: 'after' }), null);
  assert.equal(await workspaceGitImage(cwd, { filePath: '/etc/x.png', side: 'after' }), null);
  await fs.symlink(path.join(cwd, 'logo.png'), path.join(cwd, 'link.png'));
  assert.equal(await workspaceGitImage(cwd, { filePath: 'link.png', side: 'after' }), null);
  await assert.rejects(workspaceGitImage(cwd, { filePath: 'logo.png', side: 'sideways' }), TypeError);
  assert.equal(await workspaceGitImage(await directory(t, false), { filePath: 'logo.png', side: 'after' }), null, 'not a repository');
});

test('main.cjs workspace-info: the branch picker lists branch names as git switch takes them, even beside a same-named tag', async (t) => {
  const main = await fs.readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const format = /case "workspace-info"[\s\S]*?"branch", "(--format=[^"]+)"/.exec(main)?.[1];
  assert.ok(format, 'workspace-info lists branches with an explicit format');
  const { cwd } = await remoteRepo(t);
  await git(cwd, ['branch', 'feature']);
  await git(cwd, ['tag', 'feature']);
  const listed = (await git(cwd, ['branch', format])).stdout.trim().split('\n').sort();
  assert.deepEqual(listed, ['feature', 'main']);
});
