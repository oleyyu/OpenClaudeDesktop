import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sessionFolders, createDetectedProjects, detectProjects, dedupeProjects, lastActivity, inferWorktreeOrigin, queued, CACHE_MS, FS_CONCURRENCY } = require('../electron/recent-folders.cjs');
const root = path.resolve(import.meta.dirname, '..');

// B03: main.cjs 'recent-folder-sessions' (c749529a1 getAll's originCwd / folderExists / isScratchWorkspace) and
// 'detected-projects' (index.chunk-BMnTSdxh.js getDetectedProjects).
const tempDir = (t) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'recent-folders-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('sessionFolders: recorded origins, legacy .code/worktrees origins, folderExists and scratch workspaces', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo'), worktree = path.join(repo, '.code', 'worktrees', 'repo-mabc12'), custom = path.join(dir, 'trees', 'repo-x');
  fs.mkdirSync(worktree, { recursive: true });
  fs.mkdirSync(custom, { recursive: true });
  fs.mkdirSync(path.join(dir, 'ud', 'workspaces', 'cowork'), { recursive: true });
  const config = {
    sessionMetadata: { a: { originCwd: repo } },
    worktreeOrigins: { [custom]: repo },
    worktreeDirectories: [worktree, custom],
  };
  const { sessions, changed } = await sessionFolders([
    { id: 'a', cwd: worktree },
    { id: 'b', cwd: custom },
    { id: 'legacy', cwd: worktree },
    { id: 'plain', cwd: repo },
    { id: 'gone', cwd: path.join(dir, 'deleted') },
    { id: 'scratch', cwd: path.join(dir, 'ud', 'workspaces', 'cowork') },
    { id: 'relative', cwd: 'repo' },
  ], { config, scratchRoot: path.join(dir, 'ud', 'workspaces') });
  assert.deepEqual(sessions.a, { originCwd: repo, folderExists: true, isScratchWorkspace: false });
  assert.equal(sessions.b.originCwd, repo, 'prepare-worktree recorded the origin');
  assert.equal(sessions.legacy.originCwd, repo, 'the default <repo>/.code/worktrees layout is traced back');
  assert.equal(config.sessionMetadata.legacy.originCwd, repo, 'and kept on the session');
  assert.equal(changed, true);
  assert.deepEqual(sessions.plain, { originCwd: repo, folderExists: true, isScratchWorkspace: false });
  assert.deepEqual(sessions.gone, { originCwd: path.join(dir, 'deleted'), folderExists: false, isScratchWorkspace: false });
  assert.equal(sessions.scratch.isScratchWorkspace, true);
  assert.equal(sessions.relative, undefined);
});

test('inferWorktreeOrigin: a custom-location worktree asks git for its common dir', async () => {
  const calls = [];
  const run = async (cmd, args) => { calls.push([cmd, ...args]); return { stdout: '/src/repo/.git\n' }; };
  assert.equal(await inferWorktreeOrigin(os.tmpdir(), run), '/src/repo');
  assert.deepEqual(calls[0].slice(0, 4), ['git', '-C', os.tmpdir(), 'rev-parse']);
  assert.equal(await inferWorktreeOrigin('/nowhere/at/all', run), null, 'a missing folder is not asked about');
  assert.equal(await inferWorktreeOrigin(os.tmpdir(), async () => ({ stdout: '/bare.git\n' })), null);
});

test('lastActivity: .git/index mtime, else the newest project marker, else 0', async (t) => {
  const dir = tempDir(t);
  const git = path.join(dir, 'g'), marked = path.join(dir, 'm'), empty = path.join(dir, 'e');
  fs.mkdirSync(path.join(git, '.git'), { recursive: true });
  fs.writeFileSync(path.join(git, '.git', 'index'), '');
  fs.utimesSync(path.join(git, '.git', 'index'), new Date(2_000_000_000_000), new Date(2_000_000_000_000));
  fs.mkdirSync(marked); fs.writeFileSync(path.join(marked, 'package.json'), '{}');
  fs.utimesSync(path.join(marked, 'package.json'), new Date(1_900_000_000_000), new Date(1_900_000_000_000));
  fs.mkdirSync(empty);
  assert.equal(Math.round(await lastActivity(git)), 2_000_000_000_000);
  assert.equal(Math.round(await lastActivity(marked)), 1_900_000_000_000);
  assert.equal(await lastActivity(empty), 0);
});

test('detectProjects: home code directories one level deep (no signal, dot folders and duplicates skipped) and Zed workspaces', async (t) => {
  const home = tempDir(t);
  fs.mkdirSync(path.join(home, 'code', 'site'), { recursive: true });
  fs.writeFileSync(path.join(home, 'code', 'site', 'package.json'), '{}');
  fs.mkdirSync(path.join(home, 'code', 'notes'));
  fs.mkdirSync(path.join(home, 'code', '.hidden'));
  fs.writeFileSync(path.join(home, 'code', '.hidden', 'Makefile'), '');
  fs.symlinkSync(path.join(home, 'code'), path.join(home, 'dev'));
  const zedProject = path.join(home, 'elsewhere', 'zed-proj');
  fs.mkdirSync(zedProject, { recursive: true });
  const zedDb = path.join(home, 'Library', 'Application Support', 'Zed', 'db', '0-stable');
  fs.mkdirSync(zedDb, { recursive: true });
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(zedDb, 'db.sqlite'));
  db.exec("CREATE TABLE workspaces (paths TEXT, timestamp INTEGER); INSERT INTO workspaces VALUES ('" + zedProject + "', 2), ('', 3);");
  db.close();
  const found = await detectProjects(home);
  const byPath = new Map(found.map((entry) => [entry.path, entry]));
  assert.equal(byPath.get(path.join(home, 'code', 'site'))?.source, 'scan');
  assert.equal(byPath.has(path.join(home, 'code', 'notes')), false, 'no activity signal');
  assert.equal(byPath.has(path.join(home, 'code', '.hidden')), false);
  assert.equal(found.filter((entry) => entry.path === path.join(home, 'code', 'site')).length, 1, '~/dev (a link to ~/code) is not scanned twice');
  assert.deepEqual({ ...byPath.get(zedProject), lastActivity: 0 }, { path: zedProject, name: 'zed-proj', source: 'zed', lastActivity: 0 });
});

test('createDetectedProjects: first read waits, later reads serve the cache and refresh after 30 minutes', async () => {
  let clock = 0, runs = 0;
  const detected = createDetectedProjects({ now: () => clock, detect: async () => { runs += 1; return [{ path: '/a', lastActivity: 1 }, { path: '/b', lastActivity: runs }, { path: '/a', lastActivity: 5 }]; } });
  assert.deepEqual(await detected.get(), [{ path: '/a', lastActivity: 5 }, { path: '/b', lastActivity: 1 }]);
  await detected.get();
  assert.equal(runs, 1);
  assert.equal(CACHE_MS, 1_800_000);
  clock = CACHE_MS + 1;
  const stale = await detected.get();
  assert.equal(stale[1].lastActivity, 1, 'the cached list is served while it refreshes');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runs, 2);
  assert.deepEqual([...detected.paths()].sort(), ['/a', '/b']);
  assert.deepEqual(dedupeProjects([{ path: '/x', lastActivity: 1 }, { path: '/x', lastActivity: 3 }]), [{ path: '/x', lastActivity: 3 }]);
});

test('main.cjs records the worktree origin, answers the Recent IPC and saves a Recent pick as the session folder', async () => {
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  // R4g-routines RT3: main.cjs's prepare-worktree case is worktree-prepare.mjs now (the same write).
  assert.match(main, /case "prepare-worktree": return await prepareWorktreeInMain\(p\);/);
  assert.match(fs.readFileSync(path.join(root, 'electron/worktree-prepare.mjs'), 'utf8'), /config\.worktreeOrigins = \{ \.\.\.\(config\.worktreeOrigins[^\n]*\[dest\]: cwd \}/);
  assert.match(main, /config\.sessionMetadata\[result\.thread\.id\] = \{ \.\.\.config\.sessionMetadata\[result\.thread\.id\], originCwd \}/);
  assert.match(main, /case "recent-folder-sessions": \{/);
  assert.match(main, /case "detected-projects": \{/);
  assert.match(main, /if\(!p\.additional && typeof p\.path === "string"\) \{[\s\S]{0,900}else config\.cwd = p\.path;[\s\S]{0,120}save\(\);/);
  const worktrees = fs.readFileSync(path.join(root, 'electron/worktrees.cjs'), 'utf8');
  assert.match(worktrees, /delete config\.worktreeOrigins\[dir\]/);
  const renderer = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
  assert.match(renderer, /<SourceRecentFolderMenu rows=\{recentFolderList\.rows\} onSelect=\{pickRecentFolder\}/);
  assert.match(renderer, /call\("folder", \{ surface, path: dir \}\)/);
});

test('B03 review: fs probes share 50 slots (index.chunk-BMnTSdxh _ PQueue) and the Recent IPC trusts only main-recorded session folders', async () => {
  let active = 0, peak = 0;
  const probe = () => queued(async () => { active += 1; peak = Math.max(peak, active); await new Promise((resolve) => setTimeout(resolve, 5)); active -= 1; return 1; });
  const results = await Promise.all(Array.from({ length: 140 }, probe));
  assert.equal(results.length, 140);
  assert.equal(FS_CONCURRENCY, 50);
  assert.equal(peak, 50);
  await assert.rejects(queued(() => new Promise(() => {}), 10), /fs timeout/);
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  assert.match(main, /case "recent-folder-sessions": \{[\s\S]{0,700}session\.cwd === recorded \|\| observedThreadCwds\.has\(session\.cwd\)/);
});
