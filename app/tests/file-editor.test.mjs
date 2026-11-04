import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const { readEditableFile, writeFile } = createRequire(import.meta.url)('../electron/file-editor.cjs');
async function fixture(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaude-edit-')); t.after(() => fs.rm(root, { recursive: true, force: true })); return root; }
test('save exact UTF-8/BOM/CRLF text, preserve mode, reject stale baseline', async t => {
  const root = await fixture(t), target = path.join(root, 'script.txt');
  await fs.writeFile(target, '\ufeff你好\r\nsecond\r\n', { mode: 0o755 });
  const read = await readEditableFile(root, 'script.txt');
  assert.equal(read.text, '\ufeff你好\r\nsecond\r\n');
  const saved = await writeFile(root, 'script.txt', read.text + 'third\r\n', read.hash);
  assert.equal(saved.status, 'saved');
  assert.equal(await fs.readFile(target, 'utf8'), read.text + 'third\r\n');
  assert.equal((await fs.stat(target)).mode & 0o777, 0o755);
  assert.deepEqual(await writeFile(root, 'script.txt', 'stale', read.hash), { status: 'conflict', currentHash: saved.hash });
  assert.deepEqual((await fs.readdir(root)), ['script.txt']);
});
test('external changes and deletion require explicit current baseline; overrides still detect a second change', async t => {
  const root = await fixture(t), target = path.join(root, 'a.txt');
  await fs.writeFile(target, 'initial'); const read = await readEditableFile(root, 'a.txt');
  await fs.writeFile(target, 'external'); const conflict = await writeFile(root, 'a.txt', 'mine', read.hash);
  assert.equal(conflict.status, 'conflict'); assert.equal(await fs.readFile(target, 'utf8'), 'external');
  await fs.writeFile(target, 'second external'); assert.equal((await writeFile(root, 'a.txt', 'mine', conflict.currentHash)).status, 'conflict');
  await fs.unlink(target); assert.deepEqual(await writeFile(root, 'a.txt', 'mine', read.hash), { status: 'conflict', currentHash: null });
  assert.equal((await writeFile(root, 'a.txt', 'restored', null)).status, 'saved');
  assert.equal(await fs.readFile(target, 'utf8'), 'restored');
});
test('scope, symlinks, directories, binary, invalid UTF-8, size and malformed saves', async t => {
  const root = await fixture(t), outside = await fixture(t);
  await fs.writeFile(path.join(outside, 'secret'), 'outside');
  await fs.symlink(outside, path.join(root, 'escape'));
  await fs.symlink(path.join(outside, 'missing'), path.join(root, 'dangling'));
  for (const relative of ['escape/secret', 'escape/new', 'dangling', '../out.txt', '.']) assert.equal((await writeFile(root, relative, 'bad', null)).status, 'denied');
  await fs.writeFile(path.join(root, 'binary'), Buffer.from([0,1]));
  await fs.writeFile(path.join(root, 'invalid'), Buffer.from([0xff]));
  await fs.writeFile(path.join(root, 'big'), Buffer.alloc(1024*1024+1, 97));
  for (const relative of ['binary','invalid','big']) assert.equal(await readEditableFile(root, relative), null);
  assert.equal((await writeFile(root, 'new', 'bad', undefined)).status, 'denied');
  assert.equal(await fs.readFile(path.join(outside, 'secret'), 'utf8'), 'outside');
});
test('simultaneous saves serialize; one stale save conflicts', async t => {
  const root = await fixture(t); await fs.writeFile(path.join(root, 'a'), 'one'); const read = await readEditableFile(root, 'a');
  const results = await Promise.all(['two','three'].map(text => writeFile(root, 'a', text, read.hash)));
  // Path resolution can finish in either order; serialization promises one winner, not invocation order.
  assert.deepEqual(results.map(r => r.status).sort(), ['conflict','saved']);
  const winner = results.findIndex(r => r.status === 'saved');
  assert.equal(await fs.readFile(path.join(root, 'a'), 'utf8'), ['two','three'][winner]);
  assert.equal(results[1-winner].currentHash, results[winner].hash);
});

test('read-only files are not replaced through a writable parent directory', async t => {
  if (process.getuid?.() === 0) return t.skip('root bypasses filesystem mode checks');
  const root = await fixture(t), target = path.join(root, 'readonly');
  await fs.writeFile(target, 'original', { mode: 0o444 });
  const read = await readEditableFile(root, 'readonly');
  assert.equal((await writeFile(root, 'readonly', 'changed', read.hash)).status, 'failed');
  assert.equal(await fs.readFile(target, 'utf8'), 'original');
});

// W14-code r4 r4pa-c08: 3.6556.2 asar index.chunk-DNPOm2Zc.js isHookManagerPackageJsonKeyChange — a package.json save that
// changes a Git-hook tool key is refused with deniedReason "hook_manager_package_key" (cd2efac6e maps it to hook_denied).
test('package.json saves that change a Git-hook tool key are refused (hook_manager_package_key); other edits save', async t => {
  const { isHookManagerPackageJsonKeyChange, HOOK_MANAGER_PACKAGE_JSON_KEYS } = createRequire(import.meta.url)('../electron/file-editor.cjs');
  assert.deepEqual(HOOK_MANAGER_PACKAGE_JSON_KEYS, ['lint-staged', 'husky', 'commitlint', 'pre-commit', 'precommit', 'gitHooks', 'nano-staged']);
  const root = await fixture(t), target = path.join(root, 'package.json');
  const base = '﻿' + JSON.stringify({ name: 'x', husky: { hooks: { 'pre-commit': 'lint' } } }, null, 2);
  await fs.writeFile(target, base);
  const read = await readEditableFile(root, 'package.json');
  for (const next of [{ name: 'x' }, { name: 'x', husky: { hooks: { 'pre-commit': 'rm -rf /' } } }, { name: 'x', husky: { hooks: { 'pre-commit': 'lint' } }, 'lint-staged': {} }]) {
    assert.deepEqual(await writeFile(root, 'package.json', JSON.stringify(next), read.hash), { status: 'denied', deniedReason: 'hook_manager_package_key' });
    assert.equal(await fs.readFile(target, 'utf8'), base);
  }
  // Reformatting the same hook settings and editing other keys save; unparsable text is not refused by this check.
  const same = JSON.stringify({ name: 'y', husky: { hooks: { 'pre-commit': 'lint' } } });
  const saved = await writeFile(root, 'package.json', same, read.hash);
  assert.equal(saved.status, 'saved');
  assert.equal((await writeFile(root, 'package.json', '{ not json', saved.hash)).status, 'saved');
  // A new package.json that adds a hook key is refused too (the missing file counts as {}); other files are never checked.
  assert.equal((await writeFile(root, 'sub-package.json', JSON.stringify({ husky: {} }), null)).status, 'saved');
  await fs.mkdir(path.join(root, 'pkg'));
  assert.deepEqual(await writeFile(root, 'pkg/PACKAGE.JSON', JSON.stringify({ gitHooks: {} }), null), { status: 'denied', deniedReason: 'hook_manager_package_key' });
  assert.equal(isHookManagerPackageJsonKeyChange(undefined, '[]'), false);
  assert.equal(isHookManagerPackageJsonKeyChange('{"precommit":["a"]}', '{"precommit":["a"]}'), false);
  assert.equal(isHookManagerPackageJsonKeyChange('{"nano-staged":1}', '{}'), true);
});
