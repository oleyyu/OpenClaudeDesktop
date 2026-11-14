import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Fidelity F08: git-status.cjs repoIdentity for the sidebar's Folder grouping
// (sidebar-session.js:20892-20903 IJ: owner/name, else the cwd for a repo
// without an owner, else no project).
const require = createRequire(import.meta.url);
const { repoIdentity, parseRemoteUrl, clearRepoIdentityCache } = require('../electron/git-status.cjs');

test('parseRemoteUrl: scp-like, scheme URLs, subgroups and local paths', () => {
  assert.deepEqual(parseRemoteUrl('git@github.com:acme/widget.git'), { host: 'github.com', owner: 'acme', name: 'widget' });
  assert.deepEqual(parseRemoteUrl('https://github.com/acme/widget'), { host: 'github.com', owner: 'acme', name: 'widget' });
  assert.deepEqual(parseRemoteUrl('ssh://git@gitlab.example:2222/group/sub/proj.git'), { host: 'gitlab.example', owner: 'group/sub', name: 'proj' });
  assert.deepEqual(parseRemoteUrl('/srv/git/origin.git'), { host: null, owner: null, name: 'origin' });
  assert.deepEqual(parseRemoteUrl('file:///srv/git/origin.git'), { host: null, owner: null, name: 'origin' });
  assert.equal(parseRemoteUrl(''), null);
  assert.equal(parseRemoteUrl('https://host/'), null);
});

test('repoIdentity: worktrees share owner/name, a repo without a remote has no owner, a plain folder is not a repo', async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'code-desktop-repo-id-')));
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { stdio: 'ignore', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
  try {
    const main = path.join(root, 'widget'), local = path.join(root, 'scratch'), plain = path.join(root, 'notes');
    for (const dir of [main, local, plain]) await fs.mkdir(dir);
    git(main, 'init', '-q'); git(main, 'remote', 'add', 'origin', 'git@github.com:acme/widget.git');
    git(main, '-c', 'user.email=t@example.invalid', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
    git(main, 'worktree', 'add', '-q', path.join(root, 'widget-feature'));
    git(local, 'init', '-q');
    await fs.mkdir(path.join(local, 'sub'));
    clearRepoIdentityCache();
    const [a, b, c, d, missing] = await Promise.all([main, path.join(root, 'widget-feature'), path.join(local, 'sub'), plain, path.join(root, 'gone')]
      .map((cwd) => repoIdentity(cwd, { home: root })));
    assert.deepEqual({ ...a, toplevel: undefined }, { isRepo: true, toplevel: undefined, owner: 'acme', name: 'widget', host: 'github.com', parent: '~' });
    assert.equal(b.owner, 'acme'); assert.equal(b.name, 'widget');
    assert.deepEqual({ isRepo: c.isRepo, owner: c.owner, name: c.name, parent: c.parent }, { isRepo: true, owner: null, name: 'scratch', parent: '~/scratch' });
    assert.deepEqual(d, { isRepo: false, toplevel: null, owner: null, name: null, parent: '~' });
    assert.equal(missing.isRepo, false);
    assert.equal(await repoIdentity('relative/path'), null);
    // Cached per cwd: the same promise answers a second request.
    assert.equal(repoIdentity(main, { home: root }), repoIdentity(main, { home: root }));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
