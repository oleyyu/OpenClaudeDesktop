// Files viewer Find in file and breadcrumb folder lister (2.2553.1 cd2efac6e Xi / ja / Y), and the ⋮ file items (qa).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { breadcrumbFolders, fileFindShortcut, findInText, findStatus, firstMatchFrom, folderLabel, stepFindIndex, FIND_LIMIT } from '../src/file-find-model.mjs';
import { fileViewerMenuItems } from '../src/file-tab-menu-model.mjs';

let server, V;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  V = await server.ssrLoadModule('/src/source-file-viewer.jsx');
});
after(() => server?.close());

test('findInText: case-insensitive literal matches with 1-based lines and in-line offsets', () => {
  assert.deepEqual(findInText('Foo bar\nbaz FOO foo\n\nfoo', 'foo'), [
    { line: 1, start: 0, end: 3 }, { line: 2, start: 4, end: 7 }, { line: 2, start: 8, end: 11 }, { line: 4, start: 0, end: 3 }]);
  assert.deepEqual(findInText('a.b', '.'), [{ line: 1, start: 1, end: 2 }]);
  assert.deepEqual(findInText('abc', ''), []);
  assert.deepEqual(findInText('a\nb', 'a\nb'), [], 'a match never spans lines');
  assert.equal(findInText('x'.repeat(50), 'x', 7).length, 7);
  assert.equal(FIND_LIMIT, 1000000);
});

test('find stepping wraps, the status reads current/total and caps', () => {
  assert.equal(stepFindIndex(-1, 1, 3), 0);
  assert.equal(stepFindIndex(-1, -1, 3), 2);
  assert.equal(stepFindIndex(2, 1, 3), 0);
  assert.equal(stepFindIndex(0, -1, 3), 2);
  assert.equal(stepFindIndex(0, 1, 0), -1);
  const matches = findInText('a\na\na', 'a');
  assert.equal(firstMatchFrom(matches, 2), 1);
  assert.equal(firstMatchFrom(matches, 9), 0);
  assert.deepEqual(findStatus(matches, 1), { current: 2, total: 3, capped: false });
  assert.deepEqual(findStatus([], -1), { current: 0, total: 0, capped: false });
  assert.equal(findStatus(matches, 0, 3).capped, true);
});

test('find shortcuts: ⌘F opens, ⌘G / ⇧⌘G step, Ctrl off macOS', () => {
  assert.equal(fileFindShortcut({ key: 'f', metaKey: true }), 'open');
  assert.equal(fileFindShortcut({ key: 'g', metaKey: true }), 'next');
  assert.equal(fileFindShortcut({ key: 'G', metaKey: true, shiftKey: true }), 'prev');
  assert.equal(fileFindShortcut({ key: 'f', metaKey: true, shiftKey: true }), null);
  assert.equal(fileFindShortcut({ key: 'f', ctrlKey: true }), null);
  assert.equal(fileFindShortcut({ key: 'f', ctrlKey: true }, { mac: false }), 'open');
});

test('breadcrumb folders: each folder lists itself, the file name lists its parent, outside paths list nothing', () => {
  assert.deepEqual(breadcrumbFolders('src/app/main.js'), { lead: '', dirs: [{ label: 'src', dir: 'src' }, { label: 'app', dir: 'src/app' }], name: { label: 'main.js', dir: 'src/app' } });
  assert.deepEqual(breadcrumbFolders('README.md'), { lead: '', dirs: [], name: { label: 'README.md', dir: '' } });
  assert.deepEqual(breadcrumbFolders('/etc/hosts'), { lead: '/', dirs: [{ label: 'etc', dir: null }], name: { label: 'hosts', dir: null } });
  assert.equal(folderLabel('src/app'), 'app');
  assert.equal(folderLabel('', 'work'), 'work');
});

test('⋮ file items follow qa: Find in file (⌘F), Copy file contents, Download file, Reload file', () => {
  const noop = () => {};
  const items = fileViewerMenuItems({ onFind: noop, onCopyContents: noop, onDownload: noop, onReload: noop, reloading: true });
  assert.deepEqual(items.map((item) => item.label), ['Find in file', 'Copy file contents', 'Download file', 'Reload file']);
  assert.equal(items[0].shortcut, 'cmd+f');
  assert.equal(items[3].disabled, true);
  assert.deepEqual(fileViewerMenuItems({ onCopyContents: noop }).map((item) => item.value), ['copy-file-contents']);
});

test('the breadcrumb with a lister: segment buttons instead of the Copy path button', () => {
  const lister = { root: '/tmp/work', list: async () => [], onOpenFile() {} };
  const html = renderToStaticMarkup(React.createElement(V.SourceFileBreadcrumb, { displayPath: 'src/app.js', fullPath: '/tmp/work/src/app.js', lister }));
  assert.match(html, /data-breadcrumb-lister=""/);
  assert.match(html, /<button type="button" data-breadcrumb-segment="true"[^>]*aria-haspopup="dialog"[^>]*>src<\/button>/);
  assert.match(html, /<button type="button" data-breadcrumb-segment="true"[^>]*>app\.js<\/button>/);
  assert.doesNotMatch(html, /Copy path/);
  const outside = renderToStaticMarkup(React.createElement(V.SourceFileBreadcrumb, { displayPath: '/etc/hosts', fullPath: '/etc/hosts', lister }));
  assert.doesNotMatch(outside, /data-breadcrumb-segment/);
  const plain = renderToStaticMarkup(React.createElement(V.SourceFileBreadcrumb, { displayPath: 'src/app.js', fullPath: '/tmp/work/src/app.js', onCopyPath() {} }));
  assert.match(plain, /aria-label="Copy path \/tmp\/work\/src\/app\.js"/);
});
