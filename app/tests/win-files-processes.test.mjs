import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

// Windows process / watcher / worktree behaviour of the main process (platform injected, no real Windows needed).
const require = createRequire(import.meta.url);
const worktrees = require('../electron/worktrees.cjs');
const { createFileNameSearch } = require('../electron/file-name-search.cjs');
const { createFilesWatch } = require('../electron/files-watch.cjs');
const { createTerminalService } = require('../electron/terminal-service.cjs');
const terminalModel = await import('../electron/terminal-model.mjs');
const win = { platform: 'win32', realpath: (value) => value.replace(/RUNNER~1/i, 'runneradmin') };

test('worktrees: Windows folders compare case-insensitively and through short names; a used one is never "unused"', () => {
  const config = {
    threadIds: ['a'], archivedThreadIds: ['b'],
    threadMetadata: { a: { cwd: 'c:\\repo\\.worktrees\\one' }, b: { cwd: 'C:\\Users\\RUNNER~1\\wt\\two\\src' } },
    worktreeDirectories: ['C:\\Repo\\.worktrees\\One', 'C:\\Users\\runneradmin\\wt\\two', 'C:\\repo\\.worktrees\\three'],
  };
  assert.deepEqual(worktrees.unusedWorktrees(config, win), ['C:\\repo\\.worktrees\\three']);
  // macOS: exactly as before (exact resolved paths).
  assert.deepEqual(worktrees.unusedWorktrees({ threadIds: ['a'], threadMetadata: { a: { cwd: '/r/wt/one' } }, worktreeDirectories: ['/r/wt/one', '/r/wt/One'] }, { platform: 'darwin' }), ['/r/wt/One']);
  assert.equal(worktrees.sameWorktreePath('C:/repo/wt', 'c:\\Repo\\WT\\', win), true);
  const forget = { worktreeDirectories: ['C:\\Repo\\wt'], worktreeBases: { 'c:/repo/wt': 'main' }, worktreeOrigins: { 'C:\\Repo\\wt': 'C:\\Repo' }, worktreeBranches: { 'C:\\repo\\WT': 'x' } };
  worktrees.forgetWorktree(forget, 'C:\\repo\\wt', win);
  assert.deepEqual(forget.worktreeDirectories, []);
  assert.deepEqual(forget.worktreeBases, {});
  assert.deepEqual(forget.worktreeOrigins, {});
  assert.deepEqual(forget.worktreeBranches, {});
});

test('worktrees: git lists the main checkout as C:/… (and may end lines in \\r): it is never removed as the worktree', async () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'win-wt-')));
  const calls = [];
  try {
    const run = async (file, args) => {
      calls.push(args.slice(2).join(' '));
      if (args[2] === 'worktree' && args[3] === 'list') return { stdout: `worktree ${dir.toUpperCase().replace(/\//g, '/')}\r\nHEAD abc\r\n` };
      if (args[2] === 'status') return { stdout: ' M a.txt\r\n?? b.txt\r\n' };
      return { stdout: '' };
    };
    assert.equal(await worktrees.removeWorktree(run, dir, { platform: 'win32', realpath: (value) => value }), false);
    assert.ok(!calls.some((call) => call.startsWith('worktree remove')), 'no remove --force of the main checkout');
    const status = await worktrees.worktreeStatus(run, dir);
    assert.deepEqual(status.files, [' M a.txt', '?? b.txt']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('file-name-search: works on Windows: no detached group, a cancel ends the worker tree with killTree', async () => {
  const spawned = [], killed = [];
  const spawn = (command, args, options) => {
    const child = new EventEmitter();
    child.pid = 4242;
    child.send = (_message, callback) => callback?.();
    child.kill = () => killed.push(['kill']);
    spawned.push(options);
    children.push(child);
    return child;
  };
  const children = [];
  const search = createFileNameSearch({ platform: 'win32', spawn, killTree: (pid, signal, options) => { killed.push([pid, signal, options.platform]); return true; } });
  const pending = search.search({ requestId: 'r1', scope: 's', root: process.cwd(), query: 'abc' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(spawned.length, 1, 'searching is not refused on win32');
  assert.equal(spawned[0].detached, false);
  assert.equal(spawned[0].windowsHide, true);
  assert.equal(search.cancel('s'), true);
  assert.deepEqual(killed, [[4242, 'SIGKILL', 'win32']]);
  children[0].emit('close'); // taskkill ended it
  assert.equal((await pending).error.code, 'CANCELLED');
  await search.close();
});

test('terminal-model: busy is unknown (null) on Windows; program names with backslashes and .exe', () => {
  assert.equal(terminalModel.isBusyProcess('pwsh.exe', 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', null, { platform: 'win32' }), null);
  assert.equal(terminalModel.isBusyProcess('vim', '/bin/zsh', null, { platform: 'darwin' }), true);
  assert.equal(terminalModel.isBusyProcess('/bin/zsh', '/bin/zsh', null, { platform: 'darwin' }), false);
});

test('terminal-service on Windows: busy stays unknown, a sweep of a gone folder keeps the shell, probe reports unknown', async () => {
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'win-term-')));
  const kills = [];
  let exitListener = null;
  const proc = { pid: 77777, process: 'pwsh.exe', write() {}, resize() {}, kill: (signal) => { kills.push(signal ?? 'conpty'); exitListener?.({ exitCode: 0 }); },
    onData() {}, onExit(listener) { exitListener = listener; } };
  const terminals = createTerminalService({
    platform: 'win32', resolveOwner: () => folder, shell: '/bin/sh', shellProxy: null, baseEnv: { PATH: '/usr/bin' },
    loadPty: () => ({ module: { spawn: () => proc } }),
  });
  const sender = { id: 1, send() {}, isDestroyed: () => false, once() {} };
  try {
    const info = await terminals.call('create', { sessionId: 's1', cols: 80, rows: 24 }, sender);
    assert.equal(info.status, 'running');
    assert.equal(info.busy, null);
    await terminals.pollBusy();
    assert.equal(terminals.call && (await terminals.call('list', { sessionId: 's1' }, sender))[0].busy, null);
    const probe = await terminals.call('probe', { sessionId: 's1' }, sender);
    assert.deepEqual(probe, { live: [info.id], busy: [], unknown: [info.id] });
    fs.rmSync(folder, { recursive: true, force: true });
    terminals.sweep();
    assert.deepEqual(kills, [], 'a shell whose state is unknown is not stopped by the sweep');
  } finally {
    await terminals.dispose({ timeoutMs: 10 });
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('files-watch: closeUnder lets go of a folder; on Windows a folder found gone is let go at once', async () => {
  const handles = [];
  const watch = (dir, _options, listener) => {
    const handle = new EventEmitter();
    handle.dir = dir; handle.listener = listener; handle.closed = false;
    handle.close = () => { handle.closed = true; };
    handles.push(handle);
    return handle;
  };
  const gone = new Set();
  const watcher = createFilesWatch({ watch, platform: 'win32', exists: (dir) => !gone.has(dir), resolveDir: async (cwd, dir) => path.win32.join(cwd, dir), debounceMs: 1 });
  const sender = { id: 1, send() {}, isDestroyed: () => false, once() {} };
  assert.deepEqual(await watcher.set(sender, { watchId: 'w', cwd: 'C:\\Repo', dirs: ['', 'dist', 'src'] }), ['', 'dist', 'src']);
  assert.equal(watcher.watchedCount(), 3);
  // `rm -rf dist`: the root's watcher reports "dist"; the dist watcher is closed now, not when the renderer re-sends.
  gone.add('C:\\Repo\\dist');
  handles[0].listener('rename', 'dist');
  assert.equal(handles[1].closed, true);
  assert.equal(watcher.watchedCount(), 2);
  // Before C:\Repo goes (a worktree removed): every watcher at or under it, case-insensitively.
  assert.equal(watcher.closeUnder('c:\\repo'), 2);
  assert.equal(watcher.watchedCount(), 0);
  assert.ok(handles.every((handle) => handle.closed));
  watcher.dispose();
});
