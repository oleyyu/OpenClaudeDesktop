// account2 batch 5, region sessions-page: the 4.16336.0 Sessions page (scripts/extract-sessions-page-v4.mjs ->
// src/generated/sessions-page-v4, which src/source-sessions-page.jsx renders since the round-3 switch S7; the 3.6556.2
// src/generated/sessions-page stays generated for its old consumers' pure message links). Source checks (manifest, --check, pins, D1 links, adapter module) and SSR of the
// Code page fixture (codeScoped) over the host adapters, through Vite.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup as renderServerMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { sessionPageHref } from '../src/sessions-page-model.mjs';
import { sessionPageRows } from './fixtures/session-page-rows.mjs';
import { extractSessionsPageV4, ROOTS, HOST_ADAPTERS, CDS_CORE_MANIFEST_SHA256, PAGE } from '../scripts/extract-sessions-page-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = 'src/generated/sessions-page-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/cowork-progress-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '', origin: 'file://' }, history: { state: null } };

let server, gen, HfAdapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  HfAdapters = await server.ssrLoadModule('/src/source-sessions-page-hf-adapters.jsx');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

// As tests/sessions-page-hf-generated.test.mjs: CdsSelectableTable reads its row selection with useSyncExternalStore
// and no server snapshot; read it the way a client's first render does.
const renderToStaticMarkup = element => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = d => { if (!d?.useSyncExternalStore) return d; if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (s, g, server) => d.useSyncExternalStore(s, g, server ?? g) }); return wrapped.get(d); };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: d => { raw = d; } });
  try { return renderServerMarkup(element); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};
const now = Date.now();
const sessions = [{ id: 'live', name: 'Live task', updatedAtMs: now }, { id: 'old', name: 'Old task', updatedAtMs: now - 1000 }, { id: 'stored', name: 'Stored task', archived: true, updatedAtMs: now + 1000 }];
const rows = [...sessionPageRows(sessions), ...sessionPageRows(sessions, { surface: 'archived' })];
const Link = ({ item, link }) => React.cloneElement(link, { 'data-test-item': item.id });
const page = (host = {}, props = {}) => renderToStaticMarkup(React.createElement(HfAdapters.SessionsPageHfHost.Provider, { value: { list: { sessions: rows }, getRowHref: ref => sessionPageHref(ref.id), ...host } },
  React.createElement(gen.SessionsPage, { codeScoped: true, reportsRecentsLoad: false, codeRowLinkComponent: Link, ...props })));

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-sessions-page-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-sessions-page-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(a => (typeof a === 'string' ? a : a.area)), ['code-routines-v4', 'cowork-scheduled-v4', 'files-changes-v4', 'r3b-transcript-v4',
    'routines-shared-v4', 'working-line-v4', 'approval-landing-v4', 'code-current-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractSessionsPageV4({ check: true });
});

test('roots: the semantic names, AST-located and pinned, all exported by index.mjs', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'cbd6c85c8-CxDdK_2w.js#hm=SessionsPage', 'shared-123-1Hc1RTKl.js#Ch=sidebarListMessages/MS', 'shared-123-1Hc1RTKl.js#Ah=sidebarMessages/jS',
    'shared-22-BACJUrcb.js#CD=sidebarOlderMessages', 'c39a247c4-BgnGWMne.js#$t=sidebarBulkModelMessages']);
  for (const r of provenance.roots) {
    assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  assert.equal(gen.sidebarListMessages.newChat.id, 'knhVwvlQOb');
  assert.equal(gen.sidebarOlderMessages.olderBulkArchived.id, 'mQXVaIKxH7');
  assert.equal(gen.sidebarBulkModelMessages.bulkModelSetFailed.id, '72nFwMY5yl');
});

test('host boundaries: every adapted original pinned and used; the adapter module answers exactly them', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const a of Object.values(HOST_ADAPTERS)) assert.ok(used.has(a.name), a.name);
  for (const a of provenance.adapters) assert.match(a.declarationSha256, /^[0-9a-f]{64}$/);
  // The page imports nothing outside: generated modules, React, cds-core, linked areas, the adapter module.
  for (const m of manifest.modules) for (const i of m.imports)
    assert.ok(['generated', 'react', 'shared-graph', 'linked', 'adapter'].includes(i.kind), `${m.target} ${i.local}: ${i.kind}`);
  // D1: the Sessions page's own pieces code-current-v4 already cut (row, copy, selection bar, bulk actions, load hold) are
  // linked, not cut again.
  const linked = manifest.modules.find(m => m.target === 'sessions-page.mjs').imports.filter(i => i.kind === 'linked' && i.from.startsWith('../code-current-v4/'));
  assert.deepEqual([...new Set(linked.map(i => i.from))].sort(), ['../code-current-v4/sessions-page-bulk-actions.mjs', '../code-current-v4/sessions-page-copy.mjs',
    '../code-current-v4/sessions-page-load-hold.mjs', '../code-current-v4/sessions-page-row.mjs', '../code-current-v4/sessions-page-selection-bar.mjs']);
});

test('3.6556.2 output untouched; the host page renders the 4.16336.0 graph (round-3 switch S7)', () => {
  const old = JSON.parse(local('src/generated/sessions-page/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  for (const m of old.modules) assert.equal(sha(local(`src/generated/sessions-page/${m.target}`)), m.sha256, m.target);
  const host = local('src/source-sessions-page.jsx');
  assert.match(host, /^import \{SessionsPage as SessionsPageView\} from '\.\/generated\/sessions-page-v4\/index\.mjs';$/m);
  assert.doesNotMatch(host, /generated\/code-current\/sessions-page-view|generated\/sessions-page\//);
  // The official top-level reset registration is carried with the store it clears (cbd6c85c8 `var Xp=new Map;St(()=>Xp.clear());`).
  const ion4 = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/cbd6c85c8-CxDdK_2w.js'), 'utf8');
  assert.equal(ion4.split('var Xp=new Map;St(()=>Xp.clear());').length - 1, 1);
  const pageText = local('src/generated/sessions-page-v4/sessions-page.mjs');
  assert.equal(pageText.split('St(() => Xp.clear());').length - 1, 1);
  assert.match(pageText, /^  registerSessionsReset as St,$/m);
});

test('SSR Code page: Active/Archived tabs, search, Code rows, the official shell', () => {
  const html = page();
  assert.match(html, /role="tablist"/);
  assert.match(html, />Active</);
  assert.match(html, />Archived</);
  assert.match(html, /Search sessions/);
  assert.match(html, /Live task/);
  assert.match(html, /Old task/);
  assert.doesNotMatch(html, /Stored task/);
  assert.match(html, /<table/);
  assert.match(html, /data-test-item="live"/);
  assert.match(html, /data-cds="Page"/);
  // 4.16336.0 CdsPageHeader titles carry their id on an inner span (aria-labelledby target).
  assert.match(html, /<h1[^>]*><span id="[^"]*-title">Sessions<\/span><\/h1>/);
  assert.doesNotMatch(html, /Looking for (your personal|earlier) chats/);
});

test('SSR Code page: ?surface=archived selects the Archived tab and its rows; empty state', () => {
  const html = page({ search: 'surface=archived' });
  assert.match(html, /Stored task/);
  assert.doesNotMatch(html, /Live task/);
  assert.match(page({ list: { sessions: [] } }), /Sessions you start will show up here\./);
});
