import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileDownloadPlan, downloadFileContents } from '../src/file-download-model.mjs';
import { fileViewerMenu, fileContextMenu } from '../src/file-context-menu-model.mjs';
import { fileViewerMenuItems } from '../src/file-tab-menu-model.mjs';
import { hasReplacementLoss } from '../src/generated/code-current/file-text-decoding.mjs';
const { readFile } = createRequire(import.meta.url)('../electron/files.cjs');

function documentFixture() {
  const blobs = [], links = [], revoked = [], timers = [];
  const document = { defaultView: { Blob, URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:download'; }, revokeObjectURL(url) { revoked.push(url); } }, setTimeout(fn) { timers.push(fn); } },
    createElement() { const link = { click() { links.push({ href: this.href, download: this.download }); } }; return link; } };
  return { document, blobs, links, revoked, timers };
}

test('replacement detection distinguishes literal U+FFFD from lost bytes and counts surrogate pairs', () => {
  assert.equal(hasReplacementLoss('a�😀', 8), false);
  assert.equal(hasReplacementLoss('a�😀', 6), true);
  assert.equal(hasReplacementLoss('hello', 1), false);
  assert.equal(hasReplacementLoss('�'), true);
});
test('damaged binary source only offers a download when original supported document bytes are available', () => {
  const damaged = { path: 'draft.pdf', text: '\0�', size: 2, forcedText: true };
  assert.deepEqual(fileDownloadPlan(damaged), { available: false, raw: true, replacementLoss: true });
  assert.deepEqual(fileDownloadPlan(damaged, { documentLoader: true }), { available: true, raw: true, replacementLoss: true });
  assert.equal(fileDownloadPlan({ ...damaged, inSessionFolders: false }, { documentLoader: true }).available, false);
  for (const extension of ['docx', 'xlsx', 'pptx']) assert.equal(fileDownloadPlan({ ...damaged, path: 'draft.' + extension }, { documentLoader: true }).available, true);
  for (const extension of ['zip', 'exe', 'doc', 'txt']) assert.equal(fileDownloadPlan({ ...damaged, path: 'draft.' + extension }, { documentLoader: true }).available, false);
  assert.equal(fileDownloadPlan({ path: 'text.txt', text: '�', size: 1 }).available, true);
  assert.equal(fileDownloadPlan({ path: 'photo.png', unavailable: 'image' }).available, false);
});
test('text download writes shown contents and warns on decoded replacement loss', async () => {
  const f = documentFixture(), notices = [];
  assert.equal(await downloadFileContents({ path: 'docs/readme.txt', text: 'a�', size: 2 }, { document: f.document, notify: (...args) => notices.push(args) }), true);
  assert.equal(await f.blobs[0].text(), 'a�');
  assert.equal(f.blobs[0].type, 'application/octet-stream');
  assert.deepEqual(f.links, [{ href: 'blob:download', download: 'readme.txt' }]);
  assert.match(notices[0][0], /download has �/);
  assert.equal(notices[0][1].variant, 'warning');
  assert.equal(f.revoked.length, 0); f.timers.forEach(fn => fn()); assert.deepEqual(f.revoked, ['blob:download']);
});
test('raw download preserves bytes and a failed read creates no corrupted fallback', async () => {
  const file = { path: 'draft.pdf', text: '\0�', size: 2 }, original = new Uint8Array([0,255]), f = documentFixture(), notices = [];
  assert.equal(await downloadFileContents(file, { document: f.document, loadDocument: async path => { assert.equal(path, 'draft.pdf'); return { bytes: original }; } }), true);
  assert.deepEqual(new Uint8Array(await f.blobs[0].arrayBuffer()), original);
  assert.equal(await downloadFileContents(file, { document: f.document, loadDocument: async () => { throw Error('offline'); }, notify: (...args) => notices.push(args) }), false);
  // R4i-files FI1 (files-13): c56477982 k's V — "Couldn’t download {name}", a thrown read is the "unknown" cause (no description).
  assert.equal(f.blobs.length, 1); assert.equal(notices[0][0], 'Couldn’t download ⁨draft.pdf⁩');
  assert.equal(notices[0][1].variant, 'danger'); assert.equal(notices[0][1].description, undefined);
});
test('document-byte reads preserve invalid UTF-8 and stay inside the selected folder', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'current-download-'));
  const folder = path.join(root, 'project'); await fs.mkdir(folder);
  const bytes = Buffer.from([0,255,254,80,75]);
  try {
    await fs.writeFile(path.join(folder, 'report.docx'), bytes);
    await fs.writeFile(path.join(folder, 'script.js'), bytes);
    await fs.writeFile(path.join(root, 'outside.pdf'), bytes);
    await fs.symlink(path.join(root, 'outside.pdf'), path.join(folder, 'escape.pdf'));
    await fs.symlink('script.js', path.join(folder, 'masked.pdf'));
    const raw = await readFile(folder, 'report.docx', { documentBytes: true });
    assert.deepEqual(Buffer.from(raw.bytes), bytes);
    assert.equal((await readFile(folder, 'report.docx', { force: true })).size, bytes.length);
    assert.equal((await readFile(folder, 'script.js', { documentBytes: true })).unavailable, 'unsupported');
    assert.equal((await readFile(folder, 'masked.pdf', { documentBytes: true })).unavailable, 'unsupported');
    for (const file of ['../outside.pdf', 'escape.pdf']) assert.equal((await readFile(folder, file, { documentBytes: true })).unavailable, 'outside_root');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('loaded image swaps the path-copy submenu for Copy image; download busy state reaches both menus', () => {
  const entries = fileContextMenu({ surface: 'file_viewer', root: '/w', path: 'photo.png', canAttach: true, canShowInFinder: true });
  const image = fileViewerMenu(entries, { canCopyImage: true });
  assert.deepEqual(image.map(e => e.label ?? e.kind), ['Attach as context', 'separator', 'Show in Finder', 'separator', 'Copy image']);
  assert.ok(fileViewerMenu(entries).some(e => e.label === 'Copy'));
  assert.deepEqual(fileViewerMenu(entries.slice(1), { canCopyImage: true }).map(e => e.label ?? e.kind), ['Show in Finder', 'separator', 'Copy image']);
  const body = fileViewerMenu([], { canDownload: true, downloading: true })[0];
  const header = fileViewerMenuItems({ onDownload() {}, downloading: true })[0];
  for (const item of [body, header]) { assert.equal(item.disabled, true); assert.equal(item.disabledReason, 'Downloading…'); }
});
