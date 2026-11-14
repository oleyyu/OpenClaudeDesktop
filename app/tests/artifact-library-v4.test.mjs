// Round 2 unit artifact-library: the 4.16336.0 artifact library (scripts/extract-artifact-library-v4.mjs ->
// src/generated/artifact-library-v4, staged next to the 3.6556.2 src/generated/artifact-library the host still mounts).
// Source only: manifest, the generator's --check, the official chunk text, D1 links and ownership, the host boundaries,
// and SSR of the roots through Vite. No browser, no network; the official chunks are read as text and never executed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractArtifactLibraryV4, ROOTS, HOST_ADAPTERS, LINKED_AREAS, CHUNKS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-artifact-library-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (s, needle) => s.split(needle).length - 1;
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/artifact-library-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/artifacts', search: '', hash: '', href: 'app://local/artifacts' }, history: { state: null, replaceState() {} } };

// The page and thumbnail modules link frame-sidebar-nav shared-3.mjs (D1 owner of the shared-3 id registry). Its zod chain
// (frame-sidebar-nav vendor-zod.mjs) used to write cds-core's vendor-zod `Me` through an import binding and lacked the
// official __zod_globalConfig initializer, so the SSR checks of those roots were todo on that load error. Since cds-core
// wave 7 (W7-D5) the initializer and M are cds-core vendor-zod.mjs's and nav imports them: the graph evaluates in an
// isolated load and those checks are regular tests (any load error fails them). The viewer modules (c2bb74286, shared-38)
// do not reach frame-sidebar-nav.
let server, i18n, gen = null, genError = null, viewer, frame, adapters, oldAdapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  viewer = await server.ssrLoadModule(`/${out}/c2bb74286-pk_O67sD.mjs`);
  frame = await server.ssrLoadModule(`/${out}/shared-38-DyF0_Fim.mjs`);
  adapters = await server.ssrLoadModule('/src/source-artifact-library-v4-adapters.jsx');
  oldAdapters = await server.ssrLoadModule('/src/source-artifact-v3-adapters.jsx');
  try { gen = await server.ssrLoadModule(`/${out}/index.mjs`); } catch (e) { genError = e; }
});
const needGen = () => {
  assert.ifError(genError);
  assert.ok(gen, 'artifact-library-v4 index.mjs evaluates');
  return true;
};
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

const now = Date.now();
const item = (key, patch = {}) => ({ key, title: `Report ${key}`, description: 'Quarterly numbers', source: 'cowork', href: `/artifacts/local/${key}`, icon: 'Note',
  updatedAtMs: now - 36e5, onNavigate() {}, starred: false,
  menu: ({ contextMenuTrigger } = {}) => contextMenuTrigger ?? h('button', { type: 'button', 'data-host-menu': key }, 'menu'), ...patch });
const page = props => renderToStaticMarkup(h(gen.ArtifactLibraryPage, { title: 'Artifacts', items: [], isLoading: false, layout: 'grid',
  search: { value: props.searchQuery ?? '', onChange() {}, onClear() {}, placeholder: 'Search artifacts...', label: 'Search your artifacts' },
  viewToggle: { value: props.layout ?? 'grid', onChange() {} }, primaryAction: h('button', { type: 'button' }, 'New artifact'), ...props }));

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-artifact-library-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-artifact-library-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['routines-shared-v4', 'code-routines-v4', 'cowork-scheduled-v4', 'home-chat-cowork', 'transcript-rows-v4',
    { area: 'frame-sidebar-nav', modules: ['shared-3.mjs'] }]);
  assert.deepEqual(LINKED_AREAS, manifest.linkedAreas);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  assert.deepEqual(manifest.modules.map(m => m.source).sort(), [...new Set([...Object.keys(ROOTS), ...CHUNKS])].sort());
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.target, mod.source.replace(/\.js$/, '.mjs'));
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractArtifactLibraryV4({ check: true });
  assert.match(local('scripts/verify-gen-artifact-library-v4.mjs'), /extractArtifactLibraryV4\(\{ check: true \}\)/);
});

test('roots: the 3.6556.2 semantic names, AST-located and pinned under their 4.16336.0 locals and export aliases', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'c230724a2-qhV7Crzy.js#vc=ArtifactLibraryPage', 'c230724a2-qhV7Crzy.js#Fs=ArtifactMenuTrigger/Mn',
    'c33ae67d6-D8ma6JPd.js#B=ArtifactThumbnail/r', 'c33ae67d6-D8ma6JPd.js#P=ArtifactGlyph',
    'c2bb74286-pk_O67sD.js#mt=ArtifactTitle/r', 'c2bb74286-pk_O67sD.js#bt=ArtifactAction',
    'shared-38-DyF0_Fim.js#xa=artifactFrameClass/K', 'shared-38-DyF0_Fim.js#Sa=artifactHeaderClass/G', 'shared-38-DyF0_Fim.js#Ca=artifactBodyClass/U']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.ok(count(official(r.file), ROOTS[r.file][r.local].probe) >= 1, `${r.file}#${r.local} probe`);
  // The 3.6556.2 graph's semantic names, all kept.
  const old = Object.keys(JSON.parse(local('src/generated/artifact-library/manifest.json')).publicNames);
  assert.deepEqual(old.filter(n => !provenance.roots.some(r => r.name === n)), []);
  const index = local(`${out}/index.mjs`);
  for (const r of provenance.roots) assert.match(index, new RegExp(`\\b${r.name}\\b`), r.name);
  assert.deepEqual(provenance.inner.map(i => i.key), ['c230724a2-qhV7Crzy.js#Ns', 'c230724a2-qhV7Crzy.js#Ps']);
});

test('host boundaries: each adapted original pinned; answered by the v4 adapter module with the 3.6556.2 meaning', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'shared-140#zo=artifactMenuItemsLazy', 'shared-140#wo=artifactMenuActions', 'shared-140#Xo=ArtifactItemMenu', 'c1b2dcb06#v=useArtifactOwners',
    'c33ae67d6#j=ChatArtifactPreview', 'shared-25#Ky=RouterLink', 'shared-5#bC=beginStarDrag', 'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage']);
  assert.ok(provenance.adapters.every(a => a.pinned && a.difference));
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-artifact-library-v4-adapters.jsx');
  const adapterText = local('src/source-artifact-library-v4-adapters.jsx');
  assert.match(adapterText, /^import \{ CdsContextMenu, CdsDropdown \} from '\.\/cds-core\.mjs';$/m);
  assert.doesNotMatch(adapterText, /generated\/view-tabs|generated\/artifact-library\//);
  assert.deepEqual([...adapterText.matchAll(/^export \{[^}]*\} from '([^']+)';/gm)].map(m => m[1]), ['./source-routines-shared-adapters.jsx']);
  // Same answers as the 3.6556.2 adapters for the closed services.
  assert.equal(adapters.artifactMenuItemsLazy, oldAdapters.artifactMenuItemsLazy);
  assert.deepEqual(adapters.artifactMenuActions(), oldAdapters.artifactMenuActions());
  assert.equal(adapters.useArtifactOwners()({ rel: 'shared', ownerAccountUuid: 'x' }), undefined);
  assert.equal(adapters.ChatArtifactPreview({}), null);
  assert.equal(adapters.beginStarDrag(item('a'), {}), false);
  // The original drag start answers false for a host item (not a frame artifact, no onToggleStar) and behind GrowthBook.
  const s5 = official('shared-5-u8kha2eH.js');
  assert.equal(count(s5, 'function bC(e,t){yC();let n=Cn(t);if(!n||e.source!=="frame"||e.folder===!0||e.onToggleStar===void 0||e.starred===!0||!lt("__gb__2021363468"))return!1;'), 1);
  assert.doesNotMatch(local('src/host-growthbook.mjs'), /2021363468/);
});

test('D1: nothing a linked area holds is cut again; frame-sidebar-nav star-drag store is not copied; cds-core answers the CDS parts', () => {
  const held = new Map();
  for (const entry of manifest.linkedAreas) {
    const area = typeof entry === 'string' ? entry : entry.area;
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) {
      if (typeof entry !== 'string' && !entry.modules.includes(mod.target)) continue;
      for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
    }
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area holds is cut again');
  for (const area of ['routines-shared-v4', 'code-routines-v4', 'cowork-scheduled-v4', 'home-chat-cowork', 'transcript-rows-v4', 'frame-sidebar-nav'])
    assert.ok(manifest.modules.some(m => m.imports.some(i => i.kind === 'linked' && i.from.startsWith(`../${area}/`))), `links ${area}`);
  for (const key of ['mC', 'gC', '_C', 'vC', 'yC', 'bC']) assert.ok(!own.includes(`shared-5-u8kha2eH.js#${key}`), key);
  assert.ok(!own.includes('shared-3-IQTrO7Gx.js#id'));
  // No mcp-app-card or 3.6556.2 graph is reached.
  for (const mod of manifest.modules) for (const i of mod.imports) assert.doesNotMatch(i.from, /\.\.\/(mcp-app-card|view-tabs|artifact-library|routines-shared|code-routines|cowork-scheduled|transcript-rows|cowork-home)\//, `${mod.target} ${i.from}`);
  const all = manifest.modules.map(m => local(`${out}/${m.target}`)).join('\n');
  assert.match(all, /CdsIcon as /);
  assert.doesNotMatch(all, /cdsIconAliases/);
});

test('official text: the routes render vc, the thumbnail export list, the switcher action', () => {
  const lib = official('c230724a2-qhV7Crzy.js');
  assert.equal(count(lib, 'o(vc,{title:en,tabs:tn,tabPanel:nn,topBanner:rn,'), 1);
  assert.equal(count(lib, 'defaultMessage:"More options for {label}",id:"rKQPgfPvWS"'), 1);
  assert.equal(count(lib, 'Fs as Mn'), 1);
  assert.equal(count(official('c33ae67d6-D8ma6JPd.js'), 'export{F as a,z as i,U as n,j as o,B as r,G as t}'), 1);
  assert.equal(count(official('c2bb74286-pk_O67sD.js'), '"data-testid":"frame-artifact-switcher-button"'), 1);
  assert.deepEqual(manifest.callSites.map(c => c.raw), [true, true, true]);
});

test('viewer frame classes are the 4.16336.0 literals (byte-identical to 3.6556.2)', async () => {
  const old = await server.ssrLoadModule('/src/generated/artifact-library/index.mjs');
  assert.equal(frame.artifactFrameClass, 'cds-pane-ground flex h-full min-h-0 flex-col');
  for (const n of ['artifactFrameClass', 'artifactHeaderClass', 'artifactBodyClass']) assert.equal(frame[n], old[n], n);
});

test('SSR: viewer title and action', () => {
  const title = renderToStaticMarkup(h(viewer.ArtifactTitle, { title: 'Report', heading: true }));
  assert.match(title, /^<h2 [^>]*data-testid="frame-artifact-title"[^>]*>Report<\/h2>$/);
  assert.equal(renderToStaticMarkup(h(viewer.ArtifactTitle, { title: 'Report' })).startsWith('<span '), true);
  const action = renderToStaticMarkup(h(viewer.ArtifactAction, { glyph: 'ArrowLeft', label: 'Back to artifacts', onClick() {} }));
  assert.match(action, /<button[^>]*aria-label="Back to artifacts"/);
});

test('SSR: glyph, thumbnail and the More options trigger', t => {
  if (!needGen(t)) return;
  const bare = renderToStaticMarkup(h(gen.ArtifactGlyph, { source: 'cowork', iconSize: 'lg', bare: true }));
  assert.match(bare, /^<div data-gallery-type-media="" class="flex h-full w-full items-center justify-center text-muted-as-secondary">/);
  const thumb = renderToStaticMarkup(h(gen.ArtifactThumbnail, { item: item('a'), markless: true }));
  assert.match(thumb, /data-gallery-type-media=""/);
  const trigger = renderToStaticMarkup(h(gen.ArtifactMenuTrigger, { label: 'Report a', placement: 'row' }));
  assert.match(trigger, /aria-label="More options for Report a"/);
  assert.match(trigger, /\[scroll-margin-top:var\(--list-header-scroll-offset\)\]/);
});

test('SSR: library page grid, list, no search match, empty and loading', t => {
  if (!needGen(t)) return;
  const items = [item('a', { starred: true }), item('b')];
  const grid = page({ items });
  for (const k of ['a', 'b']) assert.match(grid, new RegExp(`data-gallery-card="${k}"`));
  assert.match(grid, /href="\/artifacts\/local\/a"/);
  assert.match(grid, /data-host-menu="a"/);
  assert.match(text(grid), /Report a/);
  assert.match(grid, /New artifact/);
  const list = page({ items, layout: 'list' });
  assert.notEqual(list, grid);
  const none = page({ items: [], searchQuery: 'zzz' });
  assert.match(text(none), /No artifacts matching “zzz”/);
  const loading = page({ items: [], isLoading: true });
  assert.doesNotMatch(text(loading), /No artifacts matching/);
});

test('staged: the 3.6556.2 graph and the host mount are unchanged', () => {
  assert.equal(JSON.parse(local('src/generated/artifact-library/manifest.json')).referenceVersion, '3.6556.2');
  assert.doesNotMatch(local('src/source-artifact-library.jsx'), /artifact-library-v4/);
  assert.doesNotMatch(local('src/source-artifact-viewer.jsx'), /artifact-library-v4/);
  assert.doesNotMatch(local('src/main.jsx'), /artifact-library-v4/);
});
