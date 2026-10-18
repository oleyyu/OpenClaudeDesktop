// R4i-routines RI2: the R4g-routines follow-ups.
//   (1) captureOptions receives the task's kind, and main.cjs captures a new Code task on the connected core (never the
//       Cowork engine when CODE_DESKTOP_COWORK=1);
//   (2) a Code routine in a repository with no commits starts in its folder (2.42304.0 asar index.chunk-BAdej_RQ.js
//       createWorktree: "Skipping worktree creation - … has no commits yet"), HEAD without a commit in a repository
//       with refs refuses (unbornHead → git_startup_failed), an unresolved start point falls back to HEAD;
//   (3) the Code form's Recent folders read LocalSessions.getAll (c749529a1 F) over 'recent-folder-sessions';
//   (4) an interrupted Cowork run is the official process_interrupted error ("Session was interrupted").
// git and the core are stubs: no process is started, no port is opened. The Vite SSR server has no HMR / websocket.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { createRoutineRunner, captureRoutineOptions } from '../electron/routine-runner.mjs';
import { createWorktree, prepareWorktree, UNBORN_HEAD_MESSAGE } from '../electron/worktree-prepare.mjs';
import { classifyWorktreeError, readErrorCategory } from '../electron/routine-error-category.mjs';

const require = createRequire(import.meta.url);
const worktrees = require('../electron/worktrees.cjs');
const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const REFERENCE = path.resolve(ROOT, '..', 'reference/installed-2.42304.0-20261017');
const ASAR_CHUNK = path.join(REFERENCE, 'asar/.vite/build/index.chunk-BAdej_RQ.js');

function tempDir(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'r4i-ri2-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// ---- (1) captureOptions kind ----
test('captureOptions receives the task’s kind: a new task its own, an edit the saved task’s', async (t) => {
  const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'r4i-ri2-routines-'));
  t.after(() => fsp.rm(dataDir, { recursive: true, force: true }));
  const folder = path.join(dataDir, 'repo');
  await fsp.mkdir(folder);
  let state = [];
  const seen = [];
  const service = createLocalRoutines({ getState: () => state, commit: (rows) => { state = structuredClone(rows); }, dataDir,
    approveFolder: (dir) => dir, launch: async () => {}, setTimer: () => 1, clearTimer: () => {},
    captureOptions: async (execution, previous, kind) => {
      seen.push(kind);
      return captureRoutineOptions({ config: { model: 'm' }, coreId: kind === 'code' ? 'connected' : 'cowork', models: [{ model: 'm' }], execution, previous });
    } });
  t.after(() => service.dispose());
  const code = await service.request({ action: 'create', kind: 'code', name: 'Code task', prompt: 'p', cron: '0 9 * * *', folder, execution: { model: 'm' } });
  const cowork = await service.request({ action: 'create', name: 'Cowork task', prompt: 'p', cron: '0 9 * * *', execution: { model: 'm' } });
  assert.deepEqual(seen, ['code', 'cowork']);
  assert.equal(code.options.coreId, 'connected');
  assert.equal(cowork.options.coreId, 'cowork');
  await service.request({ action: 'update', id: code.id, name: 'Code task', prompt: 'p2', cron: '0 9 * * *', execution: { model: 'm' } });
  assert.deepEqual(seen, ['code', 'cowork', 'code'], 'an edit captures for the saved task’s kind');
  // A kind that is invalid or moves between stores is refused before any options are captured.
  await assert.rejects(service.request({ action: 'create', kind: 'nope', name: 'x', prompt: 'p', cron: '0 9 * * *', execution: {} }), /Unknown scheduled task kind/);
  await assert.rejects(service.request({ action: 'update', id: code.id, kind: 'cowork', name: 'x', prompt: 'p', cron: '0 9 * * *', execution: {} }), /can’t move/);
  assert.equal(seen.length, 3);
});

test('main.cjs captures a new Code task on the connected core (null engine), Cowork rows on the Cowork engine', () => {
  const main = read('electron/main.cjs');
  assert.equal(occurrences(main, 'captureOptions: async (execution, previous, kind) => captureRoutineOptions({ config,'), 1);
  assert.equal(occurrences(main, "...await routineContext(previous?.coreId ?? (kind === 'code' ? null : COWORK_ENGINE)), execution, previous }),"), 1);
  // routineContext only answers with the Cowork engine for that engine (null goes to the connected core).
  assert.equal(occurrences(main, 'const routineContext = async (engine = COWORK_ENGINE) => {'), 1);
  assert.equal(occurrences(main, '    if (engine === COWORK_ENGINE && COWORK_ENABLED) {'), 1);
  assert.equal(occurrences(read('electron/local-routines.mjs'), 'await captureOptions(p.execution, previous?.options, kind)'), 1);
});

// ---- (2) empty repository ----
/** A git stub: `head` whether HEAD names a commit, `refs` for-each-ref's output, `branches` the refs that resolve. */
function gitStub({ head = true, refs = '', branches = [], failForEachRef = false } = {}) {
  const calls = [];
  const fail = (stderr = '', code = 1) => Object.assign(new Error(`Command failed\n${stderr}`), { code, stderr, stdout: '' });
  const run = async (file, args) => {
    calls.push(args.slice(2));
    const [cmd, ...rest] = args.slice(2);
    if (cmd === 'rev-parse' && rest[0] === '--verify' && rest[1] === '--quiet') {
      const ref = rest[2].replace(/\^\{commit\}$/, '');
      if (ref === 'HEAD' ? head : branches.includes(ref)) return { stdout: 'abc\n', stderr: '' };
      throw fail();
    }
    if (cmd === 'for-each-ref') { if (failForEachRef) throw fail('fatal: broken'); return { stdout: refs, stderr: '' }; }
    if (cmd === 'remote') throw fail("error: No such remote 'origin'", 2);
    if (cmd === 'rev-parse' || cmd === 'symbolic-ref') throw fail();
    return { stdout: '', stderr: '' };
  };
  return { run, calls, commands: () => calls.map((c) => c[0]) };
}

test('official createWorktree start checks: the source strings this host follows', () => {
  if (!fs.existsSync(ASAR_CHUNK)) return;
  const chunk = fs.readFileSync(ASAR_CHUNK, 'utf8');
  assert.equal(occurrences(chunk, 'has no commits yet; nothing to branch from'), 1);
  assert.equal(occurrences(chunk, '["rev-parse","--verify","--quiet","HEAD^{commit}"]'), 1);
  assert.equal(occurrences(chunk, '["for-each-ref","--count=1"]'), 1);
  assert.equal(occurrences(chunk, "this folder's current branch has no commit yet, so a session worktree cannot be created from it. Check out a branch that has commits, then try again."), 1);
  assert.equal(occurrences(chunk, 'does not resolve in ${x}, falling back to HEAD'), 1);
});

test('skipWithoutCommits: no commits and no refs → null before anything is created; without it nothing changes', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  const empty = gitStub({ head: false, refs: '' });
  assert.equal(await createWorktree(empty.run, { cwd: repo, branch: '', prefix: 'deepseek/', skipWithoutCommits: true }), null);
  assert.deepEqual(empty.commands(), ['rev-parse', 'for-each-ref']);
  assert.equal(fs.existsSync(path.join(repo, '.code')), false, 'no worktree folder was made');
  // prepareWorktree records nothing either.
  const config = { cwd: repo, worktreeBases: {}, worktreeDirectories: [], worktreeOrigins: {} };
  let saves = 0;
  const roots = new Set();
  assert.equal(await prepareWorktree({ cwd: repo, branch: '', skipWithoutCommits: true },
    { run: gitStub({ head: false }).run, config, save: () => { saves++; }, approvedWorkspaceRoots: roots, prefix: 'deepseek/', worktrees }), null);
  assert.equal(saves, 0);
  assert.equal(roots.size, 0);
  assert.deepEqual(config.worktreeDirectories, []);
  // Without the option (the interactive prepare-worktree IPC case) no probe runs.
  const plain = gitStub({ head: false });
  await createWorktree(plain.run, { cwd: repo, branch: '', prefix: 'deepseek/', now: () => 1 });
  assert.deepEqual(plain.commands(), ['worktree']);
});

test('skipWithoutCommits: refs but no HEAD commit refuses (git_startup_failed); a failing for-each-ref refuses too', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  for (const stub of [gitStub({ head: false, refs: 'abc commit\trefs/heads/other\n' }), gitStub({ head: false, failForEachRef: true })]) {
    await assert.rejects(createWorktree(stub.run, { cwd: repo, branch: '', prefix: 'deepseek/', skipWithoutCommits: true }), (error) => {
      assert.equal(error.message, UNBORN_HEAD_MESSAGE);
      assert.equal(error.worktreeStage, 'worktree_add');
      assert.equal(classifyWorktreeError(error, { worktrees }), 'git_startup_failed');
      return true;
    });
    assert.equal(stub.commands().includes('worktree'), false);
  }
  // A branch that resolves still starts from it when HEAD is unborn.
  const branchOnly = gitStub({ head: false, refs: 'abc commit\trefs/heads/feature\n', branches: ['feature'] });
  const created = await createWorktree(branchOnly.run, { cwd: repo, branch: 'feature', prefix: 'deepseek/', skipWithoutCommits: true, now: () => 2 });
  assert.equal(created.start, 'feature');
  // …and one that does not resolve refuses (nothing to fall back to).
  await assert.rejects(createWorktree(gitStub({ head: false, refs: 'x\n' }).run, { cwd: repo, branch: 'gone', prefix: 'deepseek/', skipWithoutCommits: true, now: () => 3 }),
    (error) => error.message === UNBORN_HEAD_MESSAGE);
  // A git that cannot run fails like worktree add (git_not_found).
  const missing = async () => { throw Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }); };
  await assert.rejects(createWorktree(missing, { cwd: repo, branch: '', prefix: 'deepseek/', skipWithoutCommits: true }),
    (error) => classifyWorktreeError(error, { worktrees }) === 'git_not_found');
});

test('skipWithoutCommits: an unresolved start point falls back to HEAD (no recorded base)', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  const stub = gitStub({ head: true, branches: [] });
  const config = { cwd: repo, worktreeBases: {}, worktreeDirectories: [], worktreeOrigins: {} };
  const dest = await prepareWorktree({ cwd: repo, branch: 'gone', skipWithoutCommits: true },
    { run: stub.run, config, save: () => {}, approvedWorkspaceRoots: new Set(), prefix: 'deepseek/', worktrees, now: () => 5 });
  const add = stub.calls.find((c) => c[0] === 'worktree');
  assert.equal(add.at(-1), 'HEAD');
  assert.equal(config.worktreeBases[dest], undefined);
  // The interactive path keeps the branch (no fallback, the base is recorded).
  const interactive = gitStub({ head: true, branches: [] });
  const config2 = { cwd: repo, worktreeBases: {}, worktreeDirectories: [], worktreeOrigins: {} };
  const dest2 = await prepareWorktree({ cwd: repo, branch: 'gone' }, { run: interactive.run, config: config2, save: () => {},
    approvedWorkspaceRoots: new Set(), prefix: 'deepseek/', worktrees, now: () => 6 });
  assert.equal(interactive.calls.find((c) => c[0] === 'worktree').at(-1), 'gone');
  assert.equal(config2.worktreeBases[dest2], 'gone');
});

test('the runner starts a Code task in its folder when the repository has no commits yet', async (t) => {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  const host = { owner: 'o', coreId: 'fixture', models: [{ model: 'm' }], hints: true, autoReview: false };
  const options = captureRoutineOptions({ config: { model: 'm', permission: 'ask' }, ...host });
  const log = [];
  const config = { cwd: repo, worktreeBases: {}, worktreeDirectories: [], worktreeOrigins: {} };
  const launch = createRoutineRunner({ context: async () => host,
    rpc: async ({ method, params }) => { log.push([method, params]); return method === 'thread/start' ? { thread: { id: 't1' } } : method === 'turn/start' ? { turn: { id: 'u1' } } : {}; },
    prepareWorktree: (p) => { log.push(['prepare', p]); return prepareWorktree(p, { run: gitStub({ head: false }).run, config, save: () => {}, approvedWorkspaceRoots: new Set(), prefix: 'deepseek/', worktrees }); },
    setSessionMetadata: () => {} });
  const result = await launch({ id: 'task', kind: 'code', name: 'N', prompt: 'p', cwd: repo, useWorktree: true, options }, { attach: () => {} });
  assert.deepEqual(result, { threadId: 't1', turnId: 'u1' });
  assert.deepEqual(log[0], ['prepare', { cwd: repo, branch: '', skipWithoutCommits: true }]);
  assert.equal(log.find(([m]) => m === 'thread/start')[1].cwd, repo);
  assert.equal(log.find(([m]) => m === 'turn/start')[1].cwd, repo);
  // Refs but an unborn HEAD fails before any session with the official category.
  const refused = createRoutineRunner({ context: async () => host, rpc: async () => { throw new Error('no session expected'); },
    prepareWorktree: (p) => prepareWorktree(p, { run: gitStub({ head: false, refs: 'x\n' }).run, config, save: () => {}, approvedWorkspaceRoots: new Set(), prefix: 'deepseek/', worktrees }) });
  await assert.rejects(refused({ id: 'task', kind: 'code', name: 'N', prompt: 'p', cwd: repo, useWorktree: true, options }, { attach: () => {} }),
    (error) => readErrorCategory(error) === 'git_startup_failed');
});

// ---- (3) and (4): renderer ----
let server, page, coworkStatus;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  page = await server.ssrLoadModule('/src/source-code-routines.jsx');
  coworkStatus = await server.ssrLoadModule('/src/generated/routines-shared/shared-14-u0TSV9dR.mjs');
});
after(async () => { await server?.close(); });

test('the Code form’s Recent folders: getAll over the Code sessions and recent-folder-sessions (c749529a1 F)', async () => {
  const requests = [];
  const call = async (channel, p) => {
    requests.push([channel, p]);
    assert.equal(channel, 'recent-folder-sessions');
    return { s1: { originCwd: '/work/repo', folderExists: true, isScratchWorkspace: false }, s3: { originCwd: '/scratch/x', isScratchWorkspace: true } };
  };
  let source = { sessions: [
    { id: 's1', cwd: '/work/repo/.code/worktrees/wt', createdAt: 1_760_000_000, updatedAt: 1_760_000_100 },
    { id: 's2', cwd: '/cowork/folder', createdAt: 1_760_000_000 },
    { id: 's3', cwd: '/scratch/x', createdAt: Date.UTC(2026, 9, 1) },
    { id: 's4' },
  ], metadata: { s1: { surface: 'code' }, s2: { surface: 'cowork' }, s3: { surface: 'code' }, s4: { surface: 'code' } } };
  const getAll = page.codeRoutineRecentSessions(call, () => source);
  const rows = await getAll();
  assert.deepEqual(requests, [['recent-folder-sessions', { sessions: [{ id: 's1', cwd: '/work/repo/.code/worktrees/wt' }, { id: 's3', cwd: '/scratch/x' }] }]]);
  assert.deepEqual(rows, [
    { sessionId: 's1', cwd: '/work/repo/.code/worktrees/wt', createdAt: 1_760_000_000_000, lastActivityAt: 1_760_000_100_000, originCwd: '/work/repo', folderExists: true, isScratchWorkspace: false },
    { sessionId: 's3', cwd: '/scratch/x', createdAt: Date.UTC(2026, 9, 1), lastActivityAt: Date.UTC(2026, 9, 1), originCwd: '/scratch/x', isScratchWorkspace: true },
  ]);
  // The official list (c749529a1 O) keeps the worktree session's repository and drops the scratch workspace.
  const recent = await server.ssrLoadModule('/src/generated/code-routines/c749529a1-Bq5B67O8.mjs');
  assert.deepEqual(recent.O(rows, [{ path: '/detected/project', lastActivity: 1 }]), [{ path: '/work/repo' }, { path: '/detected/project' }]);
  // No Code session with a folder: nothing is asked.
  source = { sessions: [], metadata: {} };
  requests.length = 0;
  assert.deepEqual(await getAll(), []);
  assert.deepEqual(requests, []);
  // The page's host hands getAll to LocalSessions.
  const src = read('src/source-code-routines.jsx');
  assert.equal(occurrences(src, 'getLocalBranches: localSessions.getLocalBranches, getAll, getDetectedProjects: localSessions.getDetectedProjects },'), 1);
});

test('an interrupted Cowork run is the official process_interrupted error, "Session was interrupted"', async () => {
  const src = read('src/source-routines.jsx');
  assert.equal(occurrences(src, "...(run.status === 'interrupted' && { errorCategory: 'process_interrupted' }) };"), 1);
  const titles = [];
  const intl = { formatMessage: (message) => { titles.push(message.defaultMessage); return message.defaultMessage; } };
  assert.equal(coworkStatus.Ft(intl, 'process_interrupted').title, 'Session was interrupted');
  assert.equal(coworkStatus.Ft(intl, undefined).title, 'Something went wrong');
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(zh['Session was interrupted'], '会话已中断');
});
