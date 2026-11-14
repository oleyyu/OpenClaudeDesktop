import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// B32: the viewer card's session file actions (2.31226.0 asar index.chunk-D5UeOeQn.js resolveSessionFileForReveal /
// suggestFolderFor / DI-CI, served to cd2efac6e Gl / tp / pp) and files.cjs's missing-file `creatable` (c4e0cfada k).
const require = createRequire(import.meta.url);
const access = require('../electron/session-file-access.cjs');
const { readFile } = require('../electron/files.cjs');
let base, work, other, home;
before(async () => {
  base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'b32-access-')));
  home = path.join(base, 'home'); work = path.join(home, 'work'); other = path.join(home, 'other', 'proj');
  await fs.mkdir(path.join(work, 'src'), { recursive: true });
  await fs.mkdir(other, { recursive: true });
  await fs.mkdir(path.join(home, '.hidden'), { recursive: true });
  await fs.writeFile(path.join(work, 'src', 'a.txt'), 'a');
  await fs.writeFile(path.join(other, 'notes.md'), 'n');
  await fs.writeFile(path.join(home, '.hidden', 'x.txt'), 'x');
  await fs.writeFile(path.join(home, 'top.txt'), 't');
  await fs.symlink(path.join(other, 'notes.md'), path.join(home, 'other', 'link.md'));
});
after(async () => { if (base) await fs.rm(base, { recursive: true, force: true }); });

test('reveal: a file inside or outside the working folder is shown; a folder, link or missing path is not', async () => {
  const shown = [];
  const reveal = (filePath) => access.revealSessionFile({ root: work, filePath, showItemInFolder: (target) => shown.push(target) });
  assert.equal(await reveal('src/a.txt'), true);
  assert.equal(await reveal(path.join(other, 'notes.md')), true);
  assert.equal(await reveal(path.join(home, 'other', 'link.md')), false, 'lstat: an outside link is refused');
  assert.equal(await reveal('src'), false);
  assert.equal(await reveal('src/none.txt'), false);
  assert.equal(await reveal('src/a‮.txt'), false, 'unusual characters');
  assert.deepEqual(shown, [path.join(work, 'src', 'a.txt'), path.join(other, 'notes.md')]);
});

test('folder offer: the outside file\'s own folder unless withheld or already a session folder', async () => {
  const offer = (filePath, sessionFolders = []) => access.suggestFolderForFile({ root: work, sessionFolders, filePath, home });
  assert.equal(await offer(path.join(other, 'notes.md')), other);
  assert.equal(await offer(path.join(other, 'notes.md'), [other]), null, 'already added');
  assert.equal(await offer('src/a.txt'), null, 'inside the working folder');
  assert.equal(await offer(path.join(home, 'top.txt')), null, 'the home folder itself');
  assert.equal(await offer(path.join(home, '.hidden', 'x.txt')), null, 'a dot folder');
  assert.equal(await offer(path.join(home, 'other', 'link.md')), null, 'a link');
  assert.equal(await offer(path.join(other, 'missing.md')), null, 'no file');
});

test('verdicts and session folder lookup', () => {
  const homes = ['/Users/me'];
  assert.equal(access.folderVerdict('/Users/me', { homes, sessionFolders: [] }), 'withhold');
  assert.equal(access.folderVerdict('/Users', { homes, sessionFolders: [] }), 'withhold');
  assert.equal(access.folderVerdict('/Users/other', { homes, sessionFolders: [] }), 'withhold', 'another user\'s home');
  assert.equal(access.folderVerdict('/Users/me/Library/Caches', { homes, sessionFolders: [] }), 'withhold');
  assert.equal(access.folderVerdict('/Users/me/code/x', { homes, sessionFolders: [] }), 'offer');
  assert.equal(access.folderVerdict('/Users/me/code', { homes, sessionFolders: ['/Users/me/code/app'] }), 'probe', 'holds the session folder, under home: repo roots only');
  assert.equal(access.folderVerdict('/', { homes, sessionFolders: [] }), 'withhold');
  assert.deepEqual(access.sessionFolderFor('/a/b/c.txt', ['/x', '/a/b']), { folder: '/a/b', relative: 'c.txt' });
  assert.equal(access.sessionFolderFor('/a/bc/c.txt', ['/a/b']), null, 'a prefix sibling');
});

test('files.cjs: a missing file is creatable only in an existing in-root folder', async () => {
  assert.deepEqual(await readFile(work, 'src/new.md'), { path: 'src/new.md', unavailable: 'missing', creatable: true });
  assert.deepEqual(await readFile(work, 'nope/new.md'), { path: 'nope/new.md', unavailable: 'missing', creatable: false });
  assert.deepEqual(await readFile(work, 'src/a.txt/new.md'), { path: 'src/a.txt/new.md', unavailable: 'missing', creatable: false });
  await fs.symlink(path.join(work, 'gone'), path.join(work, 'src', 'dangling.md'));
  assert.equal((await readFile(work, 'src/dangling.md')).creatable, false, 'a dangling link is never replaced');
  // W14-code pane-03 (cd2efac6e Hd): a missing path that leaves the folder is missing_outside; main.cjs still looks it up
  // in the session's added folders before the card says so.
  assert.equal((await readFile(work, '../outside.md')).unavailable, 'missing_outside');
});
