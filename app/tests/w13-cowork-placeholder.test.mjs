import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-coworkui-placeholder (cwui-09): 3.6556.2 has no "Cowork is in development" page, so the host placeholder
// (SourceCoworkComingSoon, .cowork-soon*) is gone and the Cowork new page is always the official home. An unavailable
// Cowork answers with the official availability reason (w13-coworkfn-engine) when a task starts. Source only: file text,
// the official snapshot read as text (never executed) and SSR in a local state; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const jsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? jsFiles(full) : /\.(?:m?js|cjs)$/.test(entry.name) ? [full] : [];
});

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, surfaces;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  surfaces = await server.ssrLoadModule('/src/source-surfaces.jsx');
});
after(() => server?.close());

test('official 3.6556.2: no in-development page; the unavailable copy is the official catalog text', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(snapshot, 'ion-dist/i18n/en-US.json'), 'utf8'));
  const messages = Object.values(catalog).join('\n');
  for (const gone of ['Cowork is in development', 'It’s coming in a later release', 'Cowork is still in development'])
    assert.equal(messages.includes(gone), false, gone);
  assert.equal(catalog['+d/ZHiTBCA'], 'Couldn’t load Cowork. Check your connection and try again.');
  assert.equal(catalog['+bt9+eulkK'], 'The Cowork VM isn’t connected. It may still be starting up.');
  // No renderer or main-process chunk carries the placeholder copy either.
  const chunks = [...jsFiles(path.join(snapshot, 'ion-dist/assets/v1')), ...jsFiles(path.join(snapshot, 'asar/.vite/build'))];
  assert.ok(chunks.length > 1000, `${chunks.length} chunks`);
  const carriers = chunks.filter((file) => /Cowork is in development|coming in a later release/.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(carriers, []);
  // The official "Couldn’t load Cowork" is the shared-6 DP prompt-config failure message, not a page.
  const shared6 = fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1/shared-6-sd9jbJqs.js'), 'utf8');
  assert.equal(occurrences(shared6, 'failed:{defaultMessage:"Couldn\\u2019t load Cowork. Check your connection and try again.",id:"+d/ZHiTBCA"}'), 1);
});

test('host: the placeholder component, its branch, import and rules are gone', () => {
  const main = local('src/main.jsx');
  const surfacesSource = local('src/source-surfaces.jsx');
  const css = local('src/source-surfaces.css');
  for (const [name, text] of [['main.jsx', main], ['source-surfaces.jsx', surfacesSource], ['source-surfaces.css', css]]) {
    assert.equal(occurrences(text, 'SourceCoworkComingSoon'), 0, name);
    assert.equal(occurrences(text, 'cowork-soon'), 0, name);
    assert.equal(occurrences(text, 'Cowork is in development'), 0, name);
  }
  // The dead More-row rule (w13-surfaces-modes removed the row) goes with it.
  assert.equal(occurrences(css, '.surface-more'), 0);
  // The new section renders the home directly: no Cowork-only alternative in front of it. w13-close-main-jsx-tests
  // (coworkui-placeholder-03): main.jsx is a hot file, so no whitespace, line break or import line is locked here.
  assert.ok(main.includes('section === "new" ? ('));
  assert.match(main, /\{section === "new" \? \(\s*<SourceSurfaceHome active=\{/);
  assert.equal(occurrences(main, "mode === 'cowork' && boot?.cowork?.status === 'unsupported' ?"), 0);
  // w13-close-main-jsx-tests (coworkui-placeholder-01): the placeholder page's zh-CN entries went with it.
  const zh = local('electron/i18n/zh-CN/surfaces.mjs');
  for (const gone of ['Cowork is in development', 'It’s coming in a later release', "'Open Code'", "'Open Chat'", 'Cowork is still in development'])
    assert.equal(occurrences(zh, gone), 0, gone);
  // Imports kept only for the placeholder are dropped.
  assert.doesNotMatch(surfacesSource, /from '\.\/source-spark\.jsx'|from '\.\/source-settings-button\.jsx'/);
});

test('SSR: source-surfaces.jsx exports no placeholder and the Cowork home column renders', () => {
  assert.equal('SourceCoworkComingSoon' in surfaces, false);
  const html = renderToStaticMarkup(React.createElement(surfaces.SourceSurfaceHome, { active: true },
    React.createElement(surfaces.SourceSurfaceGreeting, { name: 'Ada' })));
  assert.doesNotMatch(html, /cowork-soon|in development|Open Code|Open Chat/);
  assert.match(html, /surface-greeting/);
});

test('main.cjs: no in-development error; a Cowork start while unavailable gives the official availability reason', () => {
  const main = local('electron/main.cjs');
  assert.equal(occurrences(main, 'Cowork is still in development.'), 0);
  assert.equal(occurrences(main, 'const COWORK_ENABLED = COWORK.status === "supported";'), 1);
  assert.equal(occurrences(main, 'if (coworkStartRequest && !COWORK_ENABLED) throw new Error(i18n.t(COWORK.reasonMessage.text, COWORK.reasonMessage.values));'), 1);
});
