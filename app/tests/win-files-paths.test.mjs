import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Windows path handling of the main process's file / preview / prefs modules, run on any host (platform injected).
const require = createRequire(import.meta.url);
const paths = require('../electron/fs-paths.cjs');
const { fileUrlPath, fileUrlOf, parseUserUrl, navigationAllowed } = await import('../electron/preview-launch.mjs');
const hostPaths = await import('../electron/prefs/host-paths.mjs');
const instructions = await import('../electron/prefs/instructions.mjs');
const customCommands = await import('../electron/prefs/custom-commands.mjs');
const harness = await import('../electron/prefs/harness-profile.mjs');
const codex = await import('../electron/codex-permissions.mjs');
const { parseRemoteUrl, tildePath } = require('../electron/git-status.cjs');
const win = { platform: 'win32' }, mac = { platform: 'darwin' };

test('fs-paths: Windows compares case- and separator-insensitively, roots keep one separator, macOS is exact', () => {
  assert.equal(paths.samePath('C:\\Repo\\wt', 'c:/repo/WT/', win), true);
  assert.equal(paths.samePath('/Users/me/Repo', '/Users/me/repo', mac), false);
  assert.equal(paths.pathInside('C:\\Repo', 'c:\\repo\\src\\a.ts', win), true);
  assert.equal(paths.pathInside('C:\\Repo', 'C:\\Repository\\a.ts', win), false);
  assert.equal(paths.pathInside('D:\\', 'D:\\proj\\a', win), true, 'a drive root is not D:\\\\');
  assert.equal(paths.pathInside('/', '/etc/hosts', mac), true, 'nor is / //');
  assert.equal(paths.pathInside('/a', '/A/b', mac), false);
  assert.equal(paths.withTrailingSeparator('D:\\', win), 'D:\\');
  assert.equal(paths.withTrailingSeparator('D:\\proj', win), 'D:\\proj\\');
  assert.equal(paths.withTrailingSeparator('/', mac), '/');
  assert.equal(paths.withTrailingSeparator('/a\\', mac), '/a\\/', 'a backslash is a filename character on macOS');
  // 8.3 short names: compared after realpath.
  const realpath = (value) => value.replace(/RUNNER~1/i, 'runneradmin');
  assert.equal(paths.pathInsideReal('C:\\Users\\runneradmin\\proj', 'C:\\Users\\RUNNER~1\\proj\\x', { ...win, realpath }), true);
  assert.equal(paths.isAbsoluteHostPath('C:\\x', win), true);
  assert.equal(paths.isAbsoluteHostPath('C:\\x', mac), false);
});

test('fs-paths: rename retries EPERM / EBUSY / EACCES on Windows only, then gives up', async () => {
  let calls = 0;
  const busy = (n) => () => { calls += 1; if (calls <= n) throw Object.assign(new Error('busy'), { code: calls % 2 ? 'EPERM' : 'EBUSY' }); };
  const waits = [];
  paths.renameSyncRetry('a', 'b', { platform: 'win32', rename: busy(3), wait: (ms) => waits.push(ms) });
  assert.equal(calls, 4);
  assert.deepEqual(waits, [20, 50, 100]);
  calls = 0;
  assert.throws(() => paths.renameSyncRetry('a', 'b', { platform: 'darwin', rename: busy(1), wait: () => {} }), /busy/);
  assert.equal(calls, 1, 'macOS: no retry');
  calls = 0;
  await assert.rejects(paths.renameRetry('a', 'b', { platform: 'win32', rename: async () => busy(99)(), wait: async () => {} }), /busy/);
  assert.equal(calls, 6, 'five retries at most');
  calls = 0;
  await assert.rejects(paths.renameRetry('a', 'b', { platform: 'win32', rename: async () => { calls += 1; throw Object.assign(new Error('gone'), { code: 'ENOENT' }); }, wait: async () => {} }), /gone/);
  assert.equal(calls, 1, 'other errors are not retried');
});

test('preview: file URLs of Windows paths (fileURLToPath / pathToFileURL), and C:\\ typed in the address field', () => {
  assert.equal(fileUrlPath('file:///C:/Users/me/a%20b/index.html', win), 'C:\\Users\\me\\a b\\index.html');
  assert.equal(fileUrlPath('file://server/share/x.html', win), '\\\\server\\share\\x.html');
  assert.equal(fileUrlPath('file:///work/app/index.html', mac), '/work/app/index.html');
  assert.equal(fileUrlPath('file:///work/a%2Fb', mac), null, 'an encoded slash names no file');
  assert.equal(fileUrlPath('https://example.com', win), null);
  assert.equal(fileUrlOf('C:\\Users\\me\\#1.html', win), 'file:///C:/Users/me/%231.html');
  const root = 'C:\\work\\app';
  assert.equal(parseUserUrl('C:\\work\\app\\dist\\index.html', root, 'C:\\Users\\me', win), 'file:///C:/work/app/dist/index.html');
  assert.equal(parseUserUrl('c:/work/app/a b.html', root, '', win), 'file:///c:/work/app/a%20b.html');
  assert.equal(parseUserUrl('.\\dist\\index.html', root, '', win), 'file:///C:/work/app/dist/index.html');
  assert.equal(parseUserUrl('..\\site\\index.html', root, '', win), 'file:///C:/work/site/index.html');
  assert.equal(parseUserUrl('~\\site\\a.html', root, 'C:\\Users\\me', win), 'file:///C:/Users/me/site/a.html');
  assert.equal(parseUserUrl('\\\\nas\\share\\a.html', root, '', win), 'file://nas/share/a.html');
  assert.equal(parseUserUrl('localhost:3000', root, '', win), 'http://localhost:3000');
  assert.equal(parseUserUrl('example.com', root, '', win), 'https://example.com');
  // macOS keeps its results.
  assert.equal(parseUserUrl('./dist/index.html', '/work/app', '', mac), 'file:///work/app/dist/index.html');
  assert.equal(parseUserUrl('~/site/a b.html', '/work/app', '/Users/me', mac), 'file:///Users/me/site/a%20b.html');
  assert.match(parseUserUrl('C:\\x', '/work/app', '', mac), /^https:\/\/www\.google\.com\/search/);
  // navigationAllowed reads the URL by the host's rules: on Windows /C:/… is never taken for a path.
  assert.equal(navigationAllowed('file:///etc/passwd', '/work/app', mac).ok, false);
  assert.equal(navigationAllowed('file://host/work/app/a.html', '/work/app', mac).ok, false, 'macOS: a file URL with a host names nothing');
});

test('prefs: Windows folders are absolute (instructions, custom commands, harness, codex writable roots)', () => {
  assert.equal(hostPaths.isAbsoluteFolder('C:\\proj'), true);
  assert.equal(hostPaths.isAbsoluteFolder('C:/proj'), true);
  assert.equal(hostPaths.isAbsoluteFolder('\\\\nas\\share'), true);
  assert.equal(hostPaths.isAbsoluteFolder('proj'), false);
  assert.equal(hostPaths.isAbsoluteFolder('C:proj'), false);
  assert.equal(hostPaths.trimFolder('C:\\proj\\'), 'C:\\proj');
  assert.equal(hostPaths.trimFolder('C:\\'), 'C:\\');
  assert.equal(hostPaths.trimFolder('/a/b//'), '/a/b');
  assert.equal(hostPaths.trimFolder('/'), '/');
  assert.equal(hostPaths.folderContains('C:\\Proj', 'c:\\proj\\src'), true);
  assert.equal(hostPaths.folderContains('C:\\Proj', 'C:\\Project'), false);
  assert.equal(hostPaths.folderContains('C:\\', 'C:\\x'), true);
  assert.equal(hostPaths.folderContains('/a', '/A/b'), false, 'POSIX stays case-sensitive');

  const prefs = instructions.validateInstructions({ projects: { 'C:\\Proj\\': { text: 'win', useFile: false }, '/Users/me/p': { text: 'mac', useFile: false } } });
  assert.deepEqual(Object.keys(prefs.projects).sort(), ['/Users/me/p', 'C:\\Proj']);
  assert.equal(instructions.projectInstructionsFor(prefs, 'c:\\proj\\src')?.text, 'win');
  assert.equal(instructions.projectInstructionsFor(prefs, 'C:\\Project'), null);
  assert.equal(instructions.projectInstructionsFor(prefs, '/Users/me/p/x')?.text, 'mac');
  assert.deepEqual(instructions.instructionsProjectList('C:\\Proj', { a: { cwd: 'c:\\proj\\' }, b: { cwd: 'D:\\x' } }), ['C:\\Proj', 'D:\\x']);

  assert.equal(customCommands.validateCustomCommands({ globalDir: 'C:\\Users\\me\\commands' }).globalDir, 'C:\\Users\\me\\commands');
  assert.throws(() => customCommands.validateCustomCommands({ globalDir: 'commands' }));
  assert.equal(customCommands.normalizeCustomCommands({ globalDir: '/Users/me/c' }).globalDir, '/Users/me/c');

  const dirs = harness.setSkillDirs({}, ['C:\\skills\\', 'C:\\skills', '/Users/me/skills/']);
  assert.deepEqual(dirs.rows[harness.SKILL_ROW].config.customSkillDirs, ['C:\\skills', '/Users/me/skills']);

  const params = { sandboxPolicy: { type: 'workspaceWrite', writableRoots: [] } };
  codex.applyCodexPermissions('turn/start', params, { workspaceWrite: { writable_roots: ['C:\\cache', 'relative', '/tmp/x'] } });
  assert.deepEqual(params.sandboxPolicy.writableRoots, ['C:\\cache', '/tmp/x']);
});

test('git-status: a Windows origin path is local, not scp host "C"; the home folder folds case on Windows', () => {
  assert.deepEqual(parseRemoteUrl('C:\\repos\\widget.git'), { host: null, owner: null, name: 'widget' });
  assert.deepEqual(parseRemoteUrl('\\\\nas\\git\\widget.git'), { host: null, owner: null, name: 'widget' });
  assert.deepEqual(parseRemoteUrl('git@github.com:acme/widget.git'), { host: 'github.com', owner: 'acme', name: 'widget' });
  assert.equal(tildePath('c:\\users\\me\\code', 'C:\\Users\\Me', 'win32'), '~\\code');
  assert.equal(tildePath('C:\\Users\\Me', 'C:\\Users\\Me\\', 'win32'), '~');
  assert.equal(tildePath('/Users/me/code', '/Users/me', 'darwin'), '~/code');
  assert.equal(tildePath('/users/me/code', '/Users/me', 'darwin'), '/users/me/code');
});

test('files: Windows installers and script types never open from a session; a drive-root workspace still scopes', async () => {
  const { openBlockReason, scopedPath } = require('../electron/files.cjs');
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'win-files-')));
  try {
    for (const ext of ['.msix', '.msixbundle', '.appx', '.appxbundle', '.msp', '.mst', '.psm1', '.psd1', '.inf', '.scf', '.gadget', '.xbap', '.website', '.ws',
      '.lnk', '.url', '.hta', '.cpl', '.msc', '.reg', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.ps1', '.bat', '.cmd', '.com', '.exe', '.msi', '.scr', '.pif', '.application', '.appref-ms']) {
      const file = path.join(dir, `x${ext}`);
      fs.writeFileSync(file, '');
      assert.match(String(await openBlockReason(file, file)), /doesn’t open apps, scripts or installers/, ext);
    }
    const doc = path.join(dir, 'notes.txt');
    fs.writeFileSync(doc, 'x');
    assert.equal(await openBlockReason(doc, doc), null);
    assert.equal(await scopedPath(dir, 'notes.txt'), doc);
    await assert.rejects(scopedPath(dir, '..'), /outside the selected workspace/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
