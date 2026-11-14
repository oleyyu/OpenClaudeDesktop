import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w10-curchat-artifacts-host: the artifact library, viewer and glyph hosts now render the 3.6556.2 slices from
// src/generated/artifact-library (c230724a2 Ns, c2bb74286 Lt / Bt, shared-9 fh / ph / mh, cbbbbbd87 I) instead of the
// 2.31226.0 current-chat graph. SSR only; official chunks are read as text, never executed.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const hosts = ['src/source-artifact-library.jsx', 'src/source-artifact-viewer.jsx'];

// code-routines' shared-25 router store reads window.location when its module evaluates; no document stub, so the
// CodeMirror / ProseMirror vendors behind the viewer body take their SSR branch.
globalThis.window ??= { navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/artifacts', search: '', hash: '', href: 'app://local/artifacts' },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

let server, gen, library, viewer, v3;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/artifact-library/index.mjs');
  library = await server.ssrLoadModule('/src/source-artifact-library.jsx');
  viewer = await server.ssrLoadModule('/src/source-artifact-viewer.jsx');
  v3 = await server.ssrLoadModule('/src/source-artifact-v3-adapters.jsx');
});
after(() => server?.close());

const pending = () => new Promise(() => {});
const record = { key: 'k1', title: 'Research report', description: 'Quarterly numbers', path: '/p/research-report.md', threadId: 't1', starred: false, updatedAtMs: Date.now() - 36e5 };

test('the two hosts import the artifact-library slices, not the 2.31226.0 current-chat graph', () => {
  for (const file of hosts) {
    const text = local(file);
    assert.doesNotMatch(text, /generated\/current-chat\//, file);
    assert.match(text, /from '\.\/generated\/artifact-library\/index\.mjs'/, file);
  }
  // R6: the library host takes CDS originals by semantic name from the view-tabs facade.
  assert.match(local('src/source-artifact-library.jsx'), /import \{ CdsBanner, CdsButton, CdsDropdown \} from '\.\/generated\/view-tabs\/index\.js';/);
  assert.doesNotMatch(local('src/source-artifact-library.jsx'), /HostMenuButton|HostButton|source-chat-adapters/);
  // w10-cleanup-final: the 2.31226.0 adapters (src/source-artifact-adapters.jsx) lost their last importer with
  // w10-curchat-retire and were deleted with their glyph test; the 3.6556.2 hosts use source-artifact-v3-adapters.jsx.
  assert.equal(fs.existsSync(path.join(app, 'src/source-artifact-adapters.jsx')), false);
});

test('viewer frame: fh root, ph header with the official leading / actions groups, Lt title, Bt actions, mh body', () => {
  const html = renderToStaticMarkup(h(viewer.SourceArtifactViewer, { record, call: pending, onClose() {}, onSession() {}, onPin() {} }));
  assert.ok(html.startsWith(`<section tabindex="-1" aria-label="Artifact preview" class="surface-artifact-viewer ${gen.artifactFrameClass} cds-root" data-density="comfortable">`), html.slice(0, 200));
  assert.equal(gen.artifactFrameClass, 'cds-pane-ground flex h-full min-h-0 flex-col');
  // w11-sweep-curchat: `s(Fn,!r&&"dframe-header")` (not a popout) adds dframe-header after ur.
  assert.match(html, new RegExp(`<div data-testid="frame-artifact-viewer-header" class="${gen.artifactHeaderClass.replace(/[[\]().*+?^$|\\]/g, '\\$&')} dframe-header">`));
  assert.match(gen.artifactHeaderClass, /^flex h-frame-row shrink-0 /);
  assert.match(html, /<div class="draggable flex min-w-0 shrink-\[999\] items-center gap-2 self-stretch ps-2" data-testid="frame-artifact-header-leading">/);
  // w11-sweep-curchat: oo's actions group keeps its official class; the buttons sit in Ht's root (jn, no attribution seat).
  assert.match(html, /<div class="draggable flex min-w-0 flex-auto items-center"><div class="-mx-2 flex min-w-0 flex-auto items-center justify-end gap-1 overflow-x-clip px-2">/);
  const oo = official('cca654f75-Dbgl694v.js'), ht = official('c2bb74286-CQLOwqIZ.js');
  assert.ok(oo.includes('l("div",{className:"draggable flex min-w-0 flex-auto items-center",children:t})'));
  assert.ok(ht.includes('"-mx-2 flex min-w-0 flex-auto items-center justify-end gap-1 overflow-x-clip px-2"'));
  assert.match(html, /<h2 [^>]*data-testid="frame-artifact-title"[^>]*>Research report<\/h2>/);
  for (const label of ['Back to artifacts', 'Pin', 'Reload', 'Open conversation', 'Open in default app', 'Close'])
    assert.match(html, new RegExp(`<button[^>]*aria-label="${label}"`), label);
  // The body element is cr alone (cca654f75 `l("div",{className:kn`); the host viewer fills it from an inner column.
  assert.ok(html.includes(`<div class="${gen.artifactBodyClass.replaceAll("'", '&#x27;')}"><div class="absolute inset-0 flex flex-col overflow-hidden">`));
  // The 2.31226.0 frame (h-12 … pl-2 pr-3 header, window-drag) is gone.
  assert.doesNotMatch(html, /window-drag|\bh-12\b/);
  // Official 3.6556.2 cca654f75: root `Qf = u ? … : An` (dr = fh), header `s(Fn, …)` (ur = ph), body `className: kn` (cr = mh).
  const frame = official('cca654f75-Dbgl694v.js');
  for (const needle of ['import{Kr as On,cr as kn,dr as An,ir as jn,nr as Mn,qr as Nn,tr as Pn,ur as Fn}from"./shared-9-CM21XrJw.js"',
    'Qf=u?"flex h-full min-h-0 flex-col":An', 'className:s(Fn,!r&&"dframe-header")', 'l("div",{className:kn,children:',
    'className:"draggable flex min-w-0 shrink-[999] items-center gap-2 self-stretch ps-2","data-testid":"frame-artifact-header-leading",children:n}),l("div",{className:"draggable flex min-w-0 flex-auto items-center",children:t})'])
    assert.equal(count(frame, needle), 1, needle);
});

test('library page: Ns shell, Pc primary action and the official "More options" trigger on cards and rows', () => {
  const html = renderToStaticMarkup(h(library.SourceArtifactLibrary, { call: pending, onCreate() {}, onSession() {} }));
  assert.ok(html.startsWith('<div class="surface-artifact-library cds-root " data-density="comfortable">'), html.slice(0, 120));
  assert.match(html, /Artifacts/);
  assert.match(html, /<button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>).)*New artifact/);
  assert.doesNotMatch(html, /Your artifacts will be listed here/, 'loading state, no empty-library copy');
  const lib = official('c230724a2-Dey3VRG9.js');
  assert.equal(count(lib, 's(b,{variant:"primary",onClick:e,disabled:t,busy:i,busyLabel:a,disabledReason:o,children:c})'), 1);
  assert.equal(count(lib, 's(N,{variant:"warning",className:"mb-6",action:i,children:a})'), 1);

  // w11-sweep-curchat: no host mirror any more. Items carry menuExtras (no `menu`), so c69e9937a on -> sn renders the
  // generated cn (ArtifactMenuTrigger) and shared-16 uu (ArtifactItemMenu) opens the extras in the CDS dropdown.
  assert.ok(!('ArtifactOptionsMenu' in library), 'the cn mirror is gone');
  assert.doesNotMatch(local('src/source-artifact-library.jsx'), /\bmenu: \(|ArtifactOptionsMenu|t\('More options for/);
  assert.match(local('src/source-artifact-library.jsx'), /menuExtras: <>/);
  const items = ['a', 'b'].map(key => ({ ...record, key, title: `Report ${key}`, source: 'cowork', href: `/artifacts/local/${key}`, icon: 'Note', onNavigate() {}, onToggleStar() {},
    menuExtras: h('span', null, 'Open') }));
  const page = layout => renderToStaticMarkup(h(gen.ArtifactLibraryPage, { title: 'Artifacts', items, isLoading: false, layout, searchQuery: '',
    search: { value: '', onChange() {}, onClear() {}, placeholder: 'Search artifacts...', label: 'Search your artifacts' }, viewToggle: { value: layout, onChange() {} } }));
  const grid = page('grid'), list = page('list');
  for (const html of [grid, list]) {
    assert.match(html, /<button[^>]*aria-label="More options for Report a"/);
    assert.match(html, /<button[^>]*aria-label="More options for Report b"/);
  }
  const trigger = html => html.match(/<button[^>]*aria-label="More options for Report a"[^>]*>/)[0];
  assert.match(trigger(grid), /aria-haspopup="menu"/);
  assert.match(trigger(grid), /\[scroll-margin-top:var\(--list-header-scroll-offset\)\]/);
  assert.match(trigger(grid), /bg-surface-1 hover:bg-surface-3 aria-expanded:bg-surface-3/);
  assert.doesNotMatch(trigger(list), /bg-surface-1/);
  const menu = official('c69e9937a-BIwXoJBq.js');
  for (const needle of ['defaultMessage:"More options for {label}",id:"rKQPgfPvWS"', 'variant:p,iconOnly:!0,icon:"DotsVertical",tooltip:!1',
    '"bg-surface-1 hover:bg-surface-3 aria-expanded:bg-surface-3"', 'e("[scroll-margin-top:var(--list-header-scroll-offset)]",f,r)'])
    assert.equal(count(menu, needle), 1, needle);
  // The trigger is the generated cn itself: the same markup as rendering ArtifactMenuTrigger directly.
  const direct = renderToStaticMarkup(h(gen.ArtifactMenuTrigger, { label: 'Report a', placement: 'card' }));
  assert.equal(direct.match(/<button[^>]*>/)[0].replace(/ (?:id|aria-haspopup|aria-expanded|data-popup-open|tabindex)="[^"]*"/g, ''),
    trigger(grid).replace(/ (?:id|aria-haspopup|aria-expanded|data-popup-open|tabindex)="[^"]*"/g, ''));
  // shared-16 uu: a list row's right click (fu, mode "context") wraps the row element itself; without extras nothing wraps.
  const row = h('li', { 'data-row': '', className: 'group/cdsrow relative' });
  assert.equal(renderToStaticMarkup(h(v3.ArtifactItemMenu, { item: {}, contextMenuTrigger: row })), '<li data-row="" class="group/cdsrow relative"></li>');
  const wrapped = renderToStaticMarkup(h(v3.ArtifactItemMenu, { item: { menuExtras: h('span', null, 'x') }, contextMenuTrigger: row }));
  assert.match(wrapped, /^<li [^>]*data-row=""[^>]*class="group\/cdsrow relative"/);
  assert.doesNotMatch(wrapped, /<span>x<\/span>/, 'the menu content mounts only when opened');
  assert.equal(renderToStaticMarkup(h(v3.ArtifactItemMenu, { item: {} })), '');
  const s16 = official('shared-16-ByfgAyLr.js');
  for (const needle of ['e.contextMenuTrigger?a(fu,{...e}):a(du,{...e})', 'c&&a(mu,{content:t,mode:"context",anchor:f,openEvent:m,open:l,onOpenChange:p})', '(s||h)&&a(mu,{content:t,mode:"dropdown",handle:o,open:h,onOpenChange:g})', 'children:a(O.Popup,{align:"end",onKeyDownCapture:g,children:w})', 'Jo as O,', 'qi as ne,'])
    assert.equal(count(s16, needle), 1, needle);
  assert.equal(count(official('c69e9937a-BIwXoJBq.js'), 'return e.menu?e.menu(t):le(e,{}).length===0&&!e.menuExtras?null:t.contextMenuTrigger?'), 1);
});
