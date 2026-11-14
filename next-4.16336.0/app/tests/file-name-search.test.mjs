import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import searchModule from '../electron/file-name-search.cjs';
import matcher from '../electron/file-name-matcher.cjs';
const { createFileNameSearch } = searchModule;
const run = promisify(execFile);
let serial = 0;

async function fixture(t, { git = false } = {}) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'files-search-draft-'));
  const root = path.join(base, 'project');
  await fs.mkdir(root);
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  if (git) await run('git', ['init', '-q', root]);
  return { base, root, async file(relative, contents = 'fixture\n') {
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents);
    return target;
  } };
}

function service(t, limits) {
  const api = createFileNameSearch({ limits });
  t.after(() => api.close());
  return api;
}
const request = (root, query, scope = 'pane') => ({ root, query, scope, requestId: `r${++serial}` });
const names = result => result.matches.map(match => match.path);

test('smart-case subsequence, deterministic ranking, and original Unicode offsets', () => {
  assert.ok(matcher.matchPath('src/FileName.ts', 'fnt'));
  assert.ok(matcher.matchPath('src/FileName.ts', 'FN'));
  assert.equal(matcher.matchPath('src/filename.ts', 'FN'), null);
  assert.equal(matcher.matchPath('abc.js', 'cb'), null);
  assert.ok(matcher.matchPath('src/main.js', 'main').rankScore > matcher.matchPath('src/m-a-i-n.js', 'main').rankScore);
  assert.deepEqual(matcher.matchPath('İx.js', 'x').positions, [1]);
  assert.deepEqual(matcher.matchPath('😀x.js', 'x').positions, [2]);
});

test('non-repo scans unopened deep paths, no candidate content reads, and declared exclusions', async t => {
  const f = await fixture(t), api = service(t);
  await f.file('src/never/opened/Needle.ts');
  const unreadable = await f.file('Needle-unreadable.bin', Buffer.from([0, 255, 0]));
  await fs.chmod(unreadable, 0);
  await f.file('node_modules/Needle-hidden.js');
  await f.file('.git/Needle-hidden.js');
  // A fake .git directory makes Git report non-repo; the fallback is explicit.
  const result = await api.search(request(f.root, 'needle'));
  assert.equal(result.error, null);
  assert.equal(result.source, 'filesystem');
  assert.deepEqual(new Set(names(result)), new Set(['src/never/opened/Needle.ts', 'Needle-unreadable.bin']));
  assert.ok(result.warnings.includes('filesystem-policy-excludes-git-node_modules-ds_store'));
  assert.equal(result.complete, true);
});

test('Git includes tracked and untracked names, respects local ignores, and supports unborn HEAD', async t => {
  const f = await fixture(t, { git: true }), api = service(t);
  await f.file('deep/TrackedNeedle.js');
  await run('git', ['-C', f.root, 'add', '.']);
  await f.file('fresh/Needle-new.js');
  await f.file('.gitignore', 'ignored/\n');
  await f.file('ignored/Needle-ignored.js');
  const result = await api.search(request(f.root, 'needle'));
  assert.equal(result.error, null);
  assert.equal(result.source, 'git');
  assert.deepEqual(new Set(names(result)), new Set(['deep/TrackedNeedle.js', 'fresh/Needle-new.js']));
  assert.equal(result.truncated, false);
  await fs.rm(path.join(f.root, 'deep/TrackedNeedle.js'));
  const deleted = await api.search(request(f.root, 'needle'));
  assert.deepEqual(names(deleted), ['fresh/Needle-new.js']);
});

test('Git -z preserves tab/newline/spaces; subdirectory cwd does not expose siblings', async t => {
  const f = await fixture(t, { git: true }), api = service(t);
  await f.file('inside/odd name\tline\nNeedle.js');
  await f.file('sibling/Needle-secret.js');
  const root = path.join(f.root, 'inside');
  const result = await api.search(request(root, 'needle'));
  assert.equal(result.error, null);
  assert.equal(result.root, await fs.realpath(root));
  assert.deepEqual(names(result), ['odd name\tline\nNeedle.js']);
});

test('canonical root, symlink files/directories, and tracked parent replacement stay scoped', async t => {
  const f = await fixture(t, { git: true }), api = service(t);
  const outside = path.join(f.base, 'outside');
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'Needle-secret.js'), 'private fixture');
  await f.file('kept/Needle-safe.js');
  await f.file('replaced/Needle-secret.js');
  await run('git', ['-C', f.root, 'add', '.']);
  await fs.rm(path.join(f.root, 'replaced'), { recursive: true });
  await fs.symlink(outside, path.join(f.root, 'replaced'));
  await fs.symlink(outside, path.join(f.root, 'outside-link'));
  await fs.symlink(path.join(f.root, 'kept/Needle-safe.js'), path.join(f.root, 'Needle-internal-link.js'));
  await fs.symlink(path.join(outside, 'Needle-secret.js'), path.join(f.root, 'Needle-external-link.js'));
  const alias = path.join(f.base, 'project-alias');
  await fs.symlink(f.root, alias);
  const result = await api.search(request(alias, 'needle'));
  assert.equal(result.error, null);
  assert.equal(result.requestedRoot, alias);
  assert.equal(result.root, await fs.realpath(f.root));
  assert.deepEqual(names(result), ['kept/Needle-safe.js']);
});

test('filesystem traversal skips outside and internal symlink directories', async t => {
  const f = await fixture(t), api = service(t);
  await f.file('real/Needle.js');
  await fs.mkdir(path.join(f.base, 'outside'));
  await fs.writeFile(path.join(f.base, 'outside/Needle-outside.js'), 'fixture');
  await fs.symlink(path.join(f.base, 'outside'), path.join(f.root, 'linked-outside'));
  await fs.symlink(path.join(f.root, 'real'), path.join(f.root, 'linked-inside'));
  assert.deepEqual(names(await api.search(request(f.root, 'needle'))), ['real/Needle.js']);
});

test('ls-files invokes no filters, hooks, or fsmonitor programs', async t => {
  const f = await fixture(t, { git: true }), api = service(t);
  await f.file('Needle.js');
  await run('git', ['-C', f.root, 'add', '.']);
  const marker = path.join(f.base, 'program-ran');
  const hook = path.join(f.base, 'sentinel.sh');
  await fs.writeFile(hook, `#!/bin/sh\ntouch '${marker}'\nexit 1\n`, { mode: 0o700 });
  for (const key of ['filter.tripwire.clean', 'filter.tripwire.smudge', 'filter.tripwire.process', 'core.fsmonitor'])
    await run('git', ['-C', f.root, 'config', key, hook]);
  await f.file('.gitattributes', '*.js filter=tripwire\n');
  await fs.copyFile(hook, path.join(f.root, '.git/hooks/post-index-change'));
  const result = await api.search(request(f.root, 'needle'));
  assert.equal(result.error, null);
  assert.deepEqual(names(result), ['Needle.js']);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

test('50 actual results and reported enumeration/output/depth limits are distinct', async t => {
  const f = await fixture(t, { git: true });
  for (let i = 0; i < 55; i++) await f.file(`Needle-${String(i).padStart(3, '0')}.js`);
  const api = service(t);
  const result = await api.search(request(f.root, 'needle'));
  assert.equal(result.matches.length, 50);
  assert.equal(result.truncated, true);
  assert.deepEqual(result.truncationReasons, ['result-limit']);
  const capped = await service(t, { maxCandidates: 5 }).search(request(f.root, 'needle'));
  assert.equal(capped.scanned.candidates, 5);
  assert.equal(capped.matches.length, 5);
  assert.ok(capped.truncationReasons.includes('candidate-limit'));
  const bytes = await service(t, { maxGitBytes: 80 }).search(request(f.root, 'needle'));
  assert.ok(bytes.truncationReasons.includes('git-output-limit'));
  assert.equal(bytes.error, null);
  const depth = await fixture(t);
  await depth.file('one/two/Needle.js');
  const limited = await service(t, { maxDepth: 1 }).search(request(depth.root, 'needle'));
  assert.equal(limited.matches.length, 0);
  assert.ok(limited.truncationReasons.includes('depth-limit'));
  const entries = await service(t, { maxEntries: 1 }).search(request(depth.root, 'needle'));
  assert.ok(entries.truncationReasons.includes('entry-limit'));
  const directories = await service(t, { maxDirectories: 1 }).search(request(depth.root, 'needle'));
  assert.ok(directories.truncationReasons.includes('directory-limit'));
  const index = await service(t, { maxIndexBytes: 10 }).search(request(depth.root, 'needle'));
  assert.ok(index.truncationReasons.includes('index-byte-limit'));
  for (let i = 50; i < 55; i++) await fs.rm(path.join(f.root, `Needle-${String(i).padStart(3, '0')}.js`));
  const exact = await api.search(request(f.root, 'needle'));
  assert.equal(exact.matches.length, 50);
  assert.equal(exact.truncated, false, 'Exactly 50 matches does not prove a 51st result exists');
});

test('missing Git is a declared fallback, with no hard dependency on another global tool', async t => {
  const f = await fixture(t);
  await f.file('Needle.js');
  const api = service(t);
  const original = process.env.PATH;
  let promise;
  try { process.env.PATH = path.join(f.base, 'no-programs'); promise = api.search(request(f.root, 'needle')); }
  finally { if (original === undefined) delete process.env.PATH; else process.env.PATH = original; }
  const result = await promise;
  assert.equal(result.error, null);
  assert.equal(result.source, 'filesystem');
  assert.ok(result.warnings.includes('git-unavailable-fs-fallback'));
  assert.deepEqual(names(result), ['Needle.js']);
});

test('response byte limit is genuine and does not mislabel omitted long paths as no matches', async t => {
  const f = await fixture(t), api = service(t, { maxResultBytes: 16384 });
  const parent = Array.from({length:8}, (_, i) => `${i}-${'long'.repeat(25)}`).join('/');
  for (let i = 0; i < 30; i++) await f.file(`${parent}/Needle-${i}.js`);
  const result = await api.search(request(f.root, 'needle'));
  assert.equal(result.error, null);
  assert.ok(result.matches.length > 0 && result.matches.length < 30);
  assert.ok(result.truncationReasons.includes('result-output-limit'));
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 16384);
});

test('invalid roots/queries and unsupported content search return explicit errors', async t => {
  const f = await fixture(t), api = service(t);
  assert.equal((await api.search(request('/', 'x'))).error.code, 'ROOT_TOO_BROAD');
  assert.equal((await api.search(request(path.join(f.root, 'missing'), 'x'))).error.code, 'ROOT_NOT_FOUND');
  assert.equal((await api.search(request('relative', 'x'))).error.code, 'INVALID_REQUEST');
  assert.equal((await api.search(request(f.root, 'x'.repeat(65)))).error.code, 'INVALID_REQUEST');
  assert.equal((await api.search(request(f.root, 'x\ny'))).error.code, 'INVALID_REQUEST');
  assert.equal((await api.search(request(f.root, '? secret'))).error.code, 'CONTENT_SEARCH_UNSUPPORTED');
  const empty = await api.search(request(f.root, '  '));
  assert.equal(empty.complete, true);
  assert.equal(empty.query, '');
  assert.equal(empty.scanned.candidates, 0);
  // browse (the composer's bare '@'): an empty query lists files, the shallowest first, with no highlights.
  await f.file('deep/er/nested.txt'); await f.file('readme.md'); await f.file('src/app.js');
  const browsed = await api.search({ ...request(f.root, ''), browse: true });
  assert.equal(browsed.error, null);
  assert.ok(browsed.matches.length > 0);
  const depths = browsed.matches.map(match => match.path.split('/').length);
  assert.deepEqual(depths, [...depths].sort((a, b) => a - b));
  assert.ok(browsed.matches.every(match => match.positions.length === 0));
});

test('new request supersedes the same scope, cancellation is identifier-safe, and capacity is bounded', async t => {
  const f = await fixture(t), api = service(t, { maxConcurrent: 1, maxPending: 1 });
  await f.file('Needle.js');
  const a = request(f.root, 'old', 'pane');
  const first = api.search(a);
  const b = request(f.root, 'needle', 'pane');
  const second = api.search(b);
  assert.equal(api.cancel('pane', a.requestId), false, 'A stale cancel cannot cancel the successor');
  assert.equal((await first).error.code, 'SUPERSEDED');
  const result = await second;
  assert.equal(result.requestId, b.requestId);
  assert.deepEqual(names(result), ['Needle.js']);
  const running = api.search(request(f.root, 'needle', 'a'));
  const waiting = api.search(request(f.root, 'needle', 'b'));
  const crowded = await api.search(request(f.root, 'needle', 'c'));
  assert.equal(crowded.error.code, 'BUSY');
  assert.equal(api.cancel('a'), true);
  assert.equal((await running).error.code, 'CANCELLED');
  assert.equal((await waiting).error, null);
});

test('deadline and close settle outstanding jobs without leaving a search worker active', async t => {
  const f = await fixture(t);
  await f.file('Needle.js');
  const timed = await service(t, { deadlineMs: 1 }).search(request(f.root, 'needle'));
  assert.equal(timed.error.code, 'TIMEOUT');
  assert.ok(timed.elapsedMs < 1500);
  const api = service(t, { maxConcurrent: 1 });
  const a = api.search(request(f.root, 'needle', 'a'));
  const b = api.search(request(f.root, 'needle', 'b'));
  await api.close();
  assert.equal((await a).error.code, 'CANCELLED');
  assert.equal((await b).error.code, 'CANCELLED');
  assert.equal((await api.search(request(f.root, 'needle'))).error.code, 'CLOSED');
});

test('cancelAll can be awaited and reused; dispose is idempotent and leaves an unrelated child alive', async t => {
  const f = await fixture(t), api = service(t);
  await f.file('Needle.js');
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
  const unrelatedDone = new Promise(resolve => unrelated.on('close', resolve));
  t.after(async () => { unrelated.kill('SIGKILL'); await unrelatedDone; });
  const pending = api.search(request(f.root, 'needle'));
  await api.cancelAll();
  assert.equal((await pending).error.code, 'CANCELLED');
  assert.equal((await api.search(request(f.root, 'needle'))).error, null);
  const running = api.search(request(f.root, 'needle'));
  await Promise.all([api.dispose(), api.dispose()]);
  assert.equal((await running).error.code, 'CANCELLED');
  assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
  assert.equal((await api.search(request(f.root, 'needle'))).error.code, 'CLOSED');
});

test('cancellation also removes a running Git child in the owned worker process group', async t => {
  const f = await fixture(t), api = service(t);
  const bin = path.join(f.base, 'bin'), pidFile = path.join(f.base, 'git.pid');
  await fs.mkdir(bin);
  // Deterministic lifecycle fixture only: real Git enumeration is covered above.
  // This child ignores SIGTERM so the test proves group SIGKILL, not cooperation.
  await fs.writeFile(path.join(bin, 'git'), `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));\nprocess.on('SIGTERM',()=>{}); setInterval(()=>{},1000);\n`, { mode: 0o700 });
  const original = process.env.PATH;
  let pending;
  try { process.env.PATH = bin; pending = api.search(request(f.root, 'needle')); }
  finally { if (original === undefined) delete process.env.PATH; else process.env.PATH = original; }
  let pid;
  for (let i = 0; i < 150 && !pid; i++) {
    try { pid = Number(await fs.readFile(pidFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!pid) await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(pid, 'The worker must actually have started its Git child before cancellation');
  assert.equal(api.cancel('pane'), true);
  assert.equal((await pending).error.code, 'CANCELLED');
  let alive = true;
  for (let i = 0; i < 150 && alive; i++) {
    try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
    if (alive) await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(alive, false, 'Cancelling the worker must not orphan its running Git child');
});

test('unrepresentable filenames are reported, never silently queried under replacement characters', async t => {
  const f = await fixture(t), api = service(t);
  try { await fs.writeFile(Buffer.concat([Buffer.from(f.root + '/Needle-'), Buffer.from([0xff])]), 'fixture'); }
  catch (error) {
    if (error.code === 'EILSEQ') { t.skip('This filesystem rejects invalid UTF-8 filenames at creation.'); return; }
    throw error;
  }
  const result = await api.search(request(f.root, 'needle'));
  assert.equal(result.error.code, 'PATH_ENCODING');
  assert.equal(result.matches.length, 0);
});

// B33 (cccc2cf0a Fv): a filter ending in '/' lists the folder's direct children (folders first, numeric name
// order), then deeper matches, then the rest; folder rows only when the Files pane asks for them.
test('Fv orders a folder query: direct children in tree order, then deeper, then other matches', () => {
  const rows = [
    { path: 'lib/src/x.js', name: 'x.js', directory: false },
    { path: 'src/b10.js', name: 'b10.js', directory: false },
    { path: 'src/deep/c.js', name: 'c.js', directory: false },
    { path: 'Src/b9.js', name: 'b9.js', directory: false },
    { path: 'src/deep', name: 'deep', directory: true },
  ];
  assert.deepEqual(matcher.orderFolderQuery(rows, 'src/').map(row => row.path),
    ['src/deep', 'Src/b9.js', 'src/b10.js', 'src/deep/c.js', 'lib/src/x.js']);
});

test('a trailing-slash query with folders lists real folders, scoped and safe', async t => {
  const f = await fixture(t), api = service(t);
  await f.file('src/main/App.ts');
  await f.file('src/util.ts');
  await f.file('docs/src-notes.md');
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'files-search-outside-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.writeFile(path.join(outside, 'leak.ts'), 'x');
  await fs.symlink(outside, path.join(f.root, 'src', 'linked'));
  const folders = await api.search({ ...request(f.root, 'src/'), folders: true });
  assert.equal(folders.error, null);
  const rows = folders.matches.map(match => `${match.directory ? 'd' : 'f'}:${match.path}`);
  assert.deepEqual(rows.slice(0, 2), ['d:src/main', 'f:src/util.ts']);
  assert.ok(rows.includes('f:src/main/App.ts'));
  assert.ok(!rows.some(row => row.includes('linked')), 'a symlinked folder is never listed');
  for (const match of folders.matches) assert.equal(match.name, match.path.split('/').at(-1));
  const plain = await api.search(request(f.root, 'src/'));
  assert.ok(plain.matches.every(match => match.directory === false), 'without the Files pane flag only files');
  const noSlash = await api.search({ ...request(f.root, 'src'), folders: true });
  assert.ok(noSlash.matches.every(match => match.directory === false), 'folders only for a query ending in /');
});
