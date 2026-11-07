// Windows: git-status keeps system/global gitconfig out but passes back what Git for Windows needs there
// (docs/windows-bugs.md R7): core.autocrlf & co. (unless the repository sets them) and the user's safe.directory entries.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const status = require('../electron/git-status.cjs');
const config = require('../electron/git-user-config.cjs');
const execute = promisify(execFile);
const isolated = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
const git = (cwd, args) => execute('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd, encoding: 'utf8', timeout: 10000, env: isolated });

async function crlfRepo(t) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'code-desktop-git-crlf-'));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await git(cwd, ['init', '-q', '-b', 'fixture']);
  // Checked out the Git for Windows way: LF in the repository, CRLF in the working tree.
  await fs.writeFile(path.join(cwd, 'notes.txt'), 'one\r\ntwo\r\nthree\r\n');
  await git(cwd, ['-c', 'core.autocrlf=true', 'add', 'notes.txt']);
  await git(cwd, ['-c', 'core.autocrlf=true', 'commit', '-qm', 'baseline']);
  assert.equal((await git(cwd, ['show', 'HEAD:notes.txt'])).stdout, 'one\ntwo\nthree\n');
  await fs.writeFile(path.join(cwd, 'notes.txt'), 'one\r\nTWO\r\nthree\r\n');
  return cwd;
}
const windowsUser = { core: { 'core.autocrlf': 'true' }, safeDirectories: [] };

test('R7: a CRLF working tree counts only the edited line once the system core.autocrlf is passed back', async (t) => {
  const cwd = await crlfRepo(t);
  const win = await status.workspaceGitStatus(cwd, { platform: 'win32', userConfig: windowsUser });
  assert.equal(win.files, 1); assert.equal(win.added, 1); assert.equal(win.removed, 1);
  const patch = await status.workspaceGitDiff(cwd, { platform: 'win32', userConfig: windowsUser });
  assert.match(patch, /^-two$/m); assert.match(patch, /^\+TWO\r?$/m); assert.doesNotMatch(patch, /^-one$/m);
  // macOS (and Windows before): system/global stay out entirely, so every line differs.
  const mac = await status.workspaceGitStatus(cwd, { platform: 'darwin', userConfig: windowsUser });
  assert.equal(mac.added, 3); assert.equal(mac.removed, 3);
});

test('R7: the repository\'s own core.autocrlf still wins over the user\'s (as in command-line Git)', async (t) => {
  const cwd = await crlfRepo(t);
  await git(cwd, ['config', 'core.autocrlf', 'false']);
  const win = await status.workspaceGitStatus(cwd, { platform: 'win32', userConfig: windowsUser });
  assert.equal(win.added, 3); assert.equal(win.removed, 3);
});

test('R7: the user\'s safe.directory entries go first on Windows only; nothing else from their config', async () => {
  const user = { core: {}, safeDirectories: ['C:/Users/me/usb-repo', '*'] };
  const ctx = { config: ['-c', 'core.fsmonitor=false'] };
  assert.equal(await status.hostConfig(ctx, { platform: 'win32', userConfig: user }), user);
  assert.deepEqual(ctx.config, ['-c', 'core.fsmonitor=false', '-c', 'safe.directory=C:/Users/me/usb-repo', '-c', 'safe.directory=*']);
  const mac = { config: [] };
  assert.equal(await status.hostConfig(mac, { platform: 'darwin', userConfig: user }), null);
  assert.deepEqual(mac.config, []);
  assert.deepEqual(config.coreArgs({ core: { 'core.autocrlf': 'true', 'core.eol': 'crlf' } }, ['core.eol']), ['-c', 'core.autocrlf=true']);
});

test('R7: the user config reader takes system and global values only, caches them briefly, and never fails a query', async () => {
  config.clearUserGitConfigCache();
  assert.deepEqual(config.parseUserGitConfig('system\0core.autocrlf\ntrue\0global\0core.autocrlf\ninput\0local\0core.eol\nlf\0command\0safe.directory\n*\0global\0safe.directory\nC:/r\0global\0core.longpaths\0global\0user.name\nx\0'),
    { core: { 'core.autocrlf': 'input', 'core.longpaths': 'true' }, safeDirectories: ['C:/r'] });
  let calls = 0, clock = 0;
  const run = (file, args, options, done) => { calls++; assert.equal(file, 'git'); assert.ok(args.includes('--show-scope'));
    assert.equal(Object.keys(options.env).some((key) => key.startsWith('GIT_')), false, 'the user\'s own files, no inherited GIT_*');
    done(null, 'system\0core.autocrlf\ntrue\0'); };
  assert.deepEqual(await config.userGitConfig({ platform: 'win32', run, now: () => clock }), { core: { 'core.autocrlf': 'true' }, safeDirectories: [] });
  clock = 1000; await config.userGitConfig({ platform: 'win32', run, now: () => clock });
  assert.equal(calls, 1, 'cached');
  clock = 31000; await config.userGitConfig({ platform: 'win32', run, now: () => clock });
  assert.equal(calls, 2, 'read again after the TTL');
  config.clearUserGitConfigCache();
  assert.deepEqual(await config.userGitConfig({ platform: 'win32', run: (f, a, o, done) => done(Object.assign(new Error('x'), { code: 129 }), '') }), { core: {}, safeDirectories: [] });
  config.clearUserGitConfigCache();
  assert.deepEqual(await config.userGitConfig({ platform: 'win32', run: () => { throw Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }); } }), { core: {}, safeDirectories: [] });
  config.clearUserGitConfigCache();
  let ran = false;
  assert.deepEqual(await config.userGitConfig({ platform: 'darwin', run: () => { ran = true; } }), { core: {}, safeDirectories: [] });
  assert.equal(ran, false);
});

test('R7: the reader sees the real global gitconfig (HOME) with the real git', async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'code-desktop-git-home-'));
  const saved = { HOME: process.env.HOME, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
  t.after(async () => { for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value; config.clearUserGitConfigCache(); await fs.rm(home, { recursive: true, force: true }); });
  await fs.writeFile(path.join(home, '.gitconfig'), '[core]\n\tautocrlf = true\n\tfsmonitor = true\n[safe]\n\tdirectory = C:/Users/me/usb-repo\n[user]\n\tname = Someone\n');
  process.env.HOME = home; process.env.XDG_CONFIG_HOME = path.join(home, '.config');
  config.clearUserGitConfigCache();
  const read = await config.userGitConfig({ platform: 'win32' });
  assert.equal(read.core['core.autocrlf'], 'true');
  assert.equal('core.fsmonitor' in read.core, false, 'never a program-running key');
  assert.ok(read.safeDirectories.includes('C:/Users/me/usb-repo'));
});
