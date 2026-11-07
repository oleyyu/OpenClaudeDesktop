import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// R6: on Windows a renderer-, page- or model-supplied path that is a UNC or device path (\\host\share, //host/share,
// \\?\UNC\…, \\.\…) is refused before any fs call: a realpath or stat of one already makes Windows authenticate to that
// host as the user (SMB, then WebDAV), leaking the account's NTLM hash. Run on any host with the platform injected;
// the fs functions are spied on to prove nothing touched the path. macOS: "//x" is "/x", nothing changes.
const require = createRequire(import.meta.url);
const paths = require('../electron/fs-paths.cjs');
const { scopedPath } = require('../electron/files.cjs');
const { SCHEME, createFilePreviewFrames } = require('../electron/file-preview-frame.cjs');
const access = require('../electron/session-file-access.cjs');
const { sessionPath } = await import('../electron/agent-tools/host.mjs');
const { sessionFile } = await import('../electron/agent-tools/files.mjs');
const { notebookFile } = await import('../electron/agent-tools/notebook.mjs');
const { startFolder } = await import('../electron/agent-tools/terminal.mjs');
const win = { platform: 'win32' }, mac = { platform: 'darwin' };

const REMOTE = ['\\\\attacker.com\\s\\x.png', '//attacker.com/s/x.png', '\\\\?\\UNC\\attacker\\s\\x', '\\\\.\\pipe\\x', '\\\\?\\C:\\x', '\\/attacker/s', '/\\attacker\\s'];

/** Count calls of fs functions (sync and promise forms) while `run` runs. */
async function spyFs(run) {
  const names = ['realpath', 'stat', 'lstat', 'readFile', 'readdir'];
  const calls = [];
  const saved = [];
  for (const name of names) {
    for (const [owner, key] of [[fsp, name], [fs, `${name}Sync`]]) {
      const original = owner[key];
      if (typeof original !== 'function') continue;
      saved.push([owner, key, original]);
      const spy = function (...args) { calls.push([key, String(args[0])]); return original.apply(this, args); };
      if (original.native) spy.native = function (...args) { calls.push([`${key}.native`, String(args[0])]); return original.native.apply(this, args); };
      owner[key] = spy;
    }
  }
  try { await run(); } finally { for (const [owner, key, original] of saved) owner[key] = original; }
  return calls;
}
const touched = (calls) => calls.filter(([, arg]) => /^[\\/]{2}/.test(arg) || /attacker/.test(arg));

test('fs-paths isUncPath / remotePathRefused: Windows UNC and device paths, as given or resolved; never on macOS', () => {
  for (const value of REMOTE) {
    assert.equal(paths.isUncPath(value, win), true, value);
    assert.equal(paths.remotePathRefused(value, { base: 'C:\\ws', ...win }), true, value);
    assert.equal(paths.isUncPath(value, mac), false, value);
    assert.equal(paths.remotePathRefused(value, { base: '/ws', ...mac }), false, value);
  }
  for (const value of ['a\\b.png', 'C:\\ws\\a', 'C:/ws/a', '\\Windows\\x', 'a/../../\\\\host\\s', '..\\..\\x']) {
    assert.equal(paths.remotePathRefused(value, { base: 'C:\\ws', ...win }), false, value);
  }
  // A workspace that is itself on a share (or a mapped drive realpath'd to one) keeps its own files, nothing else.
  assert.equal(paths.remotePathRefused('src\\a.ts', { base: '\\\\nas\\team\\ws', ...win }), false);
  assert.equal(paths.remotePathRefused('\\\\NAS\\team\\ws\\a.ts', { base: '\\\\nas\\team\\ws', ...win }), false);
  assert.equal(paths.remotePathRefused('..\\..\\other\\a', { base: '\\\\nas\\team\\ws', ...win }), true);
  assert.equal(paths.remotePathRefused('\\\\evil\\s\\a', { base: '\\\\nas\\team\\ws', ...win }), true);
  assert.equal(paths.remotePathRefused('\\\\nas\\home\\me\\a', { base: 'C:\\ws', roots: ['\\\\nas\\home\\me'], ...win }), false);
  assert.throws(() => paths.assertLocalPath('\\\\evil\\s', { base: 'C:\\ws', ...win }, 'that path'), /that path is a network or device path/);
  assert.equal(paths.assertLocalPath('a.txt', { base: 'C:\\ws', ...win }), 'a.txt');
});

test('files.cjs scopedPath refuses a Windows UNC relative before any fs call', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'unc-scoped-'));
  try {
    for (const relative of REMOTE) {
      const calls = await spyFs(() => assert.rejects(scopedPath(root, relative, win), /outside the selected workspace/));
      assert.deepEqual(calls, [], `${relative}: no fs call at all`);
    }
    await fsp.writeFile(path.join(root, 'a.txt'), 'x');
    assert.equal(await scopedPath(root, 'a.txt', win), await fsp.realpath(path.join(root, 'a.txt')));
    // macOS: "//x" is an absolute local path, refused by the containment check as before.
    await assert.rejects(scopedPath(root, '//etc/hosts', mac), /outside the selected workspace/);
  } finally { await fsp.rm(root, { recursive: true, force: true }); }
});

test('HTML preview frame: a sub-resource that decodes to a UNC path is a 404 that never reaches the filesystem', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'unc-frame-'));
  try {
    await fsp.writeFile(path.join(root, 'index.html'), '<p>x</p>');
    await fsp.writeFile(path.join(root, 'app.css'), 'p{}');
    const frames = createFilePreviewFrames(win);
    const { url } = await frames.register({ root, relative: 'index.html', text: '<img src="/%5C%5Cattacker.com%5Cs%5Cx.png">' });
    const token = new URL(url).hostname;
    for (const encoded of ['%5C%5Cattacker.com%5Cs%5Cx.png', '%2F%2Fattacker.com%2Fs%2Fx.png', '%5C%5C%3F%5CUNC%5Cattacker%5Cs%5Cx', '%5C%5C.%5Cpipe%5Cx']) {
      let response;
      const calls = await spyFs(async () => { response = await frames.handle({ url: `${SCHEME}://${token}/${encoded}`, method: 'GET' }); });
      assert.equal(response.status, 404, encoded);
      assert.deepEqual(touched(calls), [], `${encoded}: the remote path was never opened`);
      assert.deepEqual(calls, [], `${encoded}: no fs call at all`);
    }
    const css = await frames.handle({ url: `${SCHEME}://${token}/app.css`, method: 'GET' });
    assert.equal(await css.text(), 'p{}', 'workspace files still load');
  } finally { await fsp.rm(root, { recursive: true, force: true }); }
});

test('agent tools: sessionPath / sessionFile / notebookFile / startFolder refuse a Windows UNC path before any fs call', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'unc-agent-'));
  try {
    for (const value of REMOTE) {
      const notebook = `${value}.ipynb`;
      const calls = await spyFs(() => {
        assert.throws(() => sessionPath(value, root, win), /network or device path/, value);
        assert.throws(() => sessionFile(value, root, win), /network or device path/, value);
        assert.throws(() => notebookFile(notebook, root, win), /network or device path/, value);
        assert.throws(() => startFolder(value, root, win), /network or device path/, value);
      });
      assert.deepEqual(calls, [], `${value}: no fs call at all`);
    }
    // Local paths are unchanged.
    await fsp.writeFile(path.join(root, 'a.txt'), 'x');
    await fsp.writeFile(path.join(root, 'n.ipynb'), '{}');
    const real = await fsp.realpath(root);
    assert.equal(sessionPath('a.txt', root, win), path.join(real, 'a.txt'));
    assert.equal(sessionFile('a.txt', root, win), path.join(real, 'a.txt'));
    assert.equal(notebookFile('n.ipynb', root, win), path.join(real, 'n.ipynb'));
    assert.equal(startFolder(null, root, win), real);
    // macOS: "//etc" is /etc, refused as outside the folder, not as a network path.
    assert.throws(() => sessionPath('//etc', root, mac), /outside the session’s folders/);
  } finally { await fsp.rm(root, { recursive: true, force: true }); }
});

test('session-file-access requestedAbsolute: a Windows UNC path is no path (reveal / suggest folder never touch it)', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'unc-access-'));
  try {
    for (const value of REMOTE) assert.equal(access.requestedAbsolute(root, value, win), null, value);
    assert.equal(access.requestedAbsolute(root, 'a.txt', win), path.resolve(root, 'a.txt'));
    assert.equal(access.requestedAbsolute(root, '//etc/hosts', mac), path.resolve('//etc/hosts'));
    const calls = await spyFs(async () => {
      assert.equal(await access.resolveFileForReveal(root, '\\\\attacker\\s\\x.txt', win), null);
      assert.equal(await access.suggestFolderForFile({ root, filePath: '\\\\attacker\\s\\x.txt', ...win }), null);
    });
    assert.deepEqual(touched(calls), []);
  } finally { await fsp.rm(root, { recursive: true, force: true }); }
});
