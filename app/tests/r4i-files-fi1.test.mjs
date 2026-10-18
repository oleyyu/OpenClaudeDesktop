import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { downloadFileContents, downloadFailureToast, downloadFileName, downloadToastName, documentReadFailureCause } from '../src/file-download-model.mjs';
import zhPanes from '../electron/i18n/zh-CN/panes.mjs';
import zhSession from '../electron/i18n/zh-CN/session.mjs';

// R4i-files FI1: files-12 (c26fb8b6b Le toast), files-13 (c56477982 k's failure toast / T / shared-6 my, cd2efac6e Sf
// truncated warning), files-17 (cd2efac6e so keyCode 229), the c19e90103 wg rail in every overflow mode.
const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function documentFixture() {
  const blobs = [], links = [];
  const document = { defaultView: { Blob, URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:x'; }, revokeObjectURL() {} }, setTimeout() {} },
    createElement() { return { click() { links.push(this.download); } }; } };
  return { document, blobs, links };
}

test('files-13: the failure toast follows c56477982 V (title, cause description, uniqueKey)', () => {
  assert.deepEqual(downloadFailureToast('report.pdf', 'missing'), { message: 'Couldn’t download ⁨report.pdf⁩',
    options: { variant: 'danger', description: 'This file is no longer available.', key: 'epitaxy-download-failed:pane:⁨report.pdf⁩' } });
  assert.equal(downloadFailureToast('a.pdf', 'outside').options.description,
    'This file is outside this session’s folders. You can ask Claude to copy it into one of them, then download the copy.');
  assert.equal(downloadFailureToast('a.pdf', 'read_error').options.description, 'Couldn’t read this file.');
  assert.equal(downloadFailureToast('a.pdf', 'too_large').options.description, 'This file is too large to download.');
  assert.equal(downloadFailureToast('a.pdf').options.description, 'Right-click the file’s tab, choose Reload file, then try again.', 'n?.cause ?? "undecodable"');
  for (const cause of ['unknown', 'slow', 'read_twice']) assert.equal(Object.hasOwn(downloadFailureToast('a.pdf', cause).options, 'description'), false, cause);
  // G's O(…, true) over the host's classified document-byte reasons.
  assert.equal(documentReadFailureCause({ unavailable: 'missing' }), 'missing');
  assert.equal(documentReadFailureCause({ unavailable: 'outside_root' }), 'outside');
  assert.equal(documentReadFailureCause({ unavailable: 'read_error' }), 'read_error');
  assert.equal(documentReadFailureCause({ unavailable: 'unsupported' }), 'read_twice');
  assert.equal(documentReadFailureCause(null), 'unknown');
});

test('files-13: T isolates and middle-elides past 80 code points; my strips invisibles and separators', () => {
  const long = 'a'.repeat(50) + 'b'.repeat(50);
  assert.equal(downloadToastName(long), `⁨${'a'.repeat(39)}…${'b'.repeat(40)}⁩`);
  assert.equal(downloadToastName('x'.repeat(80)), `⁨${'x'.repeat(80)}⁩`);
  assert.equal(downloadFileName('re‮port\u0007.pdf'), 'report.pdf');
  assert.equal(downloadFileName('a‍b️/c\\d'), 'a‍b️cd');
});

test('files-13: a document-byte read that answers a reason shows that cause; truncated text warns before replacement', async () => {
  const notices = [], f = documentFixture();
  const damaged = { path: 'docs/draft.pdf', text: '\0�', size: 2 };
  assert.equal(await downloadFileContents(damaged, { document: f.document, loadDocument: async () => ({ unavailable: 'missing' }), notify: (...a) => notices.push(a) }), false);
  assert.equal(f.blobs.length, 0);
  assert.equal(notices[0][0], 'Couldn’t download ⁨draft.pdf⁩');
  assert.equal(notices[0][1].description, 'This file is no longer available.');
  notices.length = 0;
  assert.equal(await downloadFileContents({ path: 'notes/big.txt', text: 'a�', size: 2, truncated: true }, { document: f.document, notify: (...a) => notices.push(a) }), true);
  assert.deepEqual(notices.map(([message, options]) => [message, options.variant]), [
    ['This file is too large to load in full, so the download is incomplete.', 'warning'],
    ['Some characters in this file couldn’t be read, so the download has � in their place.', 'warning']]);
  notices.length = 0;
  await downloadFileContents({ path: 'notes/ok.txt', text: 'ok', size: 2 }, { document: f.document, notify: (...a) => notices.push(a) });
  assert.deepEqual(notices, [], 'no truncated flag, no warning');
  // gy: the link's download name goes through my.
  await downloadFileContents({ path: 'x/odd‮name.txt', text: 'ok', size: 2 }, { document: f.document });
  assert.equal(f.links.at(-1), 'oddname.txt');
  assert.doesNotMatch(read('src/file-download-model.mjs'), /connection may have dropped/);
});

test('files-13: a byte read pending past 1 s shows Downloading… with the name, cleared when it settles', async () => {
  const f = documentFixture(), notices = [], dismissed = [], timers = [];
  let settle;
  const pending = downloadFileContents({ path: 'docs/deck.pptx', text: '\0�', size: 2 }, { document: f.document,
    loadDocument: () => new Promise((resolve) => { settle = resolve; }),
    notify: (...a) => { notices.push(a); return 'toast-1'; }, dismiss: (id) => dismissed.push(id),
    schedule: (fn, ms) => { timers.push({ fn, ms, cancelled: false }); return timers.length - 1; }, cancel: (id) => { timers[id].cancelled = true; } });
  assert.equal(timers[0].ms, 1000);
  timers[0].fn();
  assert.equal(notices[0][0], 'Downloading…');
  assert.equal(notices[0][1].description, '⁨deck.pptx⁩');
  assert.equal(notices[0][1].timeout, Infinity);
  assert.equal(typeof notices[0][1].key, 'string');
  settle({ bytes: new Uint8Array([1]) });
  assert.equal(await pending, true);
  assert.deepEqual(dismissed, ['toast-1']);
  assert.equal(timers[0].cancelled, true);
  // A fast read never shows it.
  const quick = [], quickTimers = [];
  await downloadFileContents({ path: 'a.pdf', text: '\0�', size: 2 }, { document: f.document, loadDocument: async () => ({ bytes: new Uint8Array([2]) }),
    notify: (...a) => quick.push(a), schedule: (fn) => { quickTimers.push(fn); return 0; }, cancel() {} });
  assert.deepEqual(quick, []);
});

test('files-13: zh-CN translates the new download strings with the same placeholders', () => {
  for (const key of ['Couldn’t download {name}', 'This session isn’t reachable right now. Try again.', 'This file is no longer available.',
    'This file is outside this session’s folders. You can ask Claude to copy it into one of them, then download the copy.',
    'This file is too large to download.', 'Some characters in this file can’t be copied exactly, so nothing was saved.',
    'Right-click the file’s tab, choose Reload file, then try again.', 'Couldn’t read this file.',
    'This file is too large to load in full, so the download is incomplete.'])
    assert.ok(typeof zhPanes[key] === 'string' && zhPanes[key].trim(), key);
  assert.match(zhPanes['Couldn’t download {name}'], /\{name\}/);
  assert.equal(Object.hasOwn(zhPanes, 'Couldn’t download this file. The connection may have dropped. Try again.'), false);
});

test('files-12: Copy image confirms with c26fb8b6b Le "Image copied to clipboard."', () => {
  const viewer = read('src/source-file-viewer.jsx');
  const at = viewer.indexOf("item.action === 'copy-image'");
  assert.ok(at > 0);
  const branch = viewer.slice(at, viewer.indexOf('\n    else ', at + 1));
  assert.match(branch, /toasts\?\.add\(t\('Image copied to clipboard\.'\), \{ variant: 'neutral' \}\)/);
  assert.match(branch, /t\('Couldn’t copy image\.'\), \{ variant: 'danger' \}/);
  assert.doesNotMatch(branch, /'Copied to clipboard\.'/);
  assert.equal(zhSession['Image copied to clipboard.'], '图片已复制到剪贴板。');
});

test('files-17: go to line ignores Enter while composing or for keyCode 229, like the find bar', () => {
  const source = read('src/source-file-go-to-line.jsx');
  const input = source.slice(source.indexOf('onChange={event => setQuery'), source.indexOf('}} />'));
  assert.match(input, /if \(event\.nativeEvent\.isComposing \|\| event\.keyCode === 229\) return;\n\s*if \(event\.key === 'Enter'\)/);
  assert.match(read('src/source-file-viewer.jsx'), /keyCode !== 229|keyCode === 229/, 'the find bar keeps its guard');
});

test('wg: the actions rail is flex, items-start, overflow-y clip and pb-0.5 in every overflow mode', () => {
  const css = read('src/source-code-block.css');
  const start = css.indexOf('.scb-actions-track {');
  const rule = css.slice(start, css.indexOf('}', start));
  for (const decl of ['position: absolute', 'inset-block: 0', 'right: 7px', 'pointer-events: none', 'display: flex', 'align-items: flex-start', 'overflow-y: clip', 'padding-bottom: 2px'])
    assert.ok(rule.includes(decl), decl);
  assert.doesNotMatch(css, /\[data-overflow="scroll"\] \.scb-actions-track/, 'no scroll-only rail rule left');
});
