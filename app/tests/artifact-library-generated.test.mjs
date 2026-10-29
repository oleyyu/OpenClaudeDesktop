import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractArtifactLibrary } from '../scripts/extract-artifact-library.mjs';

// w10-curchat-artifacts-gen: the 3.6556.2 artifact library page shell (c230724a2 Ns), the artifact glyph and thumbnail
// (cbbbbbd87 I / V), the viewer title and action (c2bb74286 Lt / Bt) and the viewer frame classes (shared-9 fh / ph / mh),
// sliced by scripts/extract-artifact-library.mjs over src/source-artifact-v3-adapters.jsx. SSR only; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
// code-routines' shared-25 router store reads window.location when its module evaluates.
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/artifacts', search: '', hash: '', href: 'app://local/artifacts' },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, gen, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/artifact-library/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-artifact-v3-adapters.jsx');
});
after(() => server?.close());

const now = Date.now();
const item = (key, patch = {}) => ({ key, title: `Report ${key}`, description: 'Quarterly numbers', source: 'cowork', href: `/artifacts/local/${key}`, icon: 'Note',
  updatedAtMs: now - 36e5, onNavigate() {}, onToggleStar() {}, starred: false,
  menu: ({ contextMenuTrigger } = {}) => contextMenuTrigger ?? h('button', { type: 'button', 'data-host-menu': key }, 'menu'), ...patch });
const page = props => renderToStaticMarkup(h(gen.ArtifactLibraryPage, { title: 'Artifacts', items: [], isLoading: false, layout: 'grid',
  search: { value: props.searchQuery ?? '', onChange() {}, onClear() {}, placeholder: 'Search artifacts...', label: 'Search your artifacts' },
  viewToggle: { value: props.layout ?? 'grid', onChange() {} }, primaryAction: h('button', { type: 'button' }, 'New artifact'), ...props }));

test('the generated graph is current (--check); roots, adapters and the official evidence', async () => {
  const manifest = await extractArtifactLibrary({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(Object.keys(manifest.publicNames).sort(), ['ArtifactAction', 'ArtifactGlyph', 'ArtifactLibraryPage', 'ArtifactMenuTrigger', 'ArtifactThumbnail', 'ArtifactTitle',
    'artifactBodyClass', 'artifactFrameClass', 'artifactHeaderClass']);
  for (const name of Object.keys(manifest.publicNames)) assert.ok(name in gen, `index.mjs exports ${name}`);
  for (const { name } of manifest.adapters) assert.ok(name in adapters, `adapter ${name}`);
  assert.ok(manifest.hostDifferences.length === manifest.adapters.length, 'every adapter states its host difference');
  // No context is copied from view-tabs; nothing comes from the 2.31226.0 current-chat graph or the chat graph.
  for (const key of manifest.viewTabsCopies) assert.ok(!manifest.contexts.includes(key), key);
  for (const file of fs.readdirSync(path.join(app, 'src/generated/artifact-library')))
    assert.doesNotMatch(local(`src/generated/artifact-library/${file}`), /current-chat|generated\/chat\/|\.\.\/chat\//, file);
  // The page shell reuses code-routines' gallery page layout (cd75b47e6 l, one copy, D1); the local alias and chunk hash
  // are left free so a code-routines re-slice does not break this check (w11-sweep-curchat).
  assert.match(local('src/generated/artifact-library/c230724a2-Dey3VRG9.mjs'), /import \{ l as [\w$]+ \} from "\.\.\/code-routines\/cd75b47e6-[\w-]{8}\.mjs";/);
  // w11-sweep-curchat (D1): what cowork-home, mcp-app-card and transcript-rows already hold is imported (by the name the
  // holder exports it as), not sliced again: shared-156 / shared-3 uh (cowork-home), shared-78 Cv (mcp-app-card zS),
  // shared-28 cF (transcript-rows).
  assert.deepEqual(manifest.linkedGraphs, ['cowork-home', 'mcp-app-card', 'transcript-rows']);
  const own = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${typeof b === 'string' ? b : b.name}`)));
  for (const dir of [...manifest.heldGraphs, ...manifest.linkedGraphs]) {
    const other = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    const exportsOf = target => new Set([...local(`src/generated/${dir}/${target}`).matchAll(/^export \{([^}]*)\};/gm)].flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0])));
    const twice = other.modules.flatMap(m => { const ex = exportsOf(m.target); return m.bindings.map(b => typeof b === 'string' ? b : b.name).filter(n => ex.has(n)).map(n => `${m.source}#${n}`); }).filter(k => own.has(k));
    assert.deepEqual(twice, [], `artifact-library re-slices exported bindings ${dir} holds`);
  }
  const libOut = local('src/generated/artifact-library/c230724a2-Dey3VRG9.mjs');
  assert.match(libOut, /import \{ uh as hn \} from "\.\.\/cowork-home\/shared-3-BCEbd8Fv\.mjs";/);
  assert.match(libOut, /import \{ zS as Tt \} from "\.\.\/mcp-app-card\/shared-78\.mjs";/);
  assert.match(local('src/generated/artifact-library/c69e9937a-BIwXoJBq.mjs'), /import \{ cF as P \} from "\.\.\/transcript-rows\/rows-shared-28-DNYlf4wu\.mjs";/);
  assert.ok(!fs.existsSync(path.join(app, 'src/generated/artifact-library/shared-78-D5Fw2h0a.mjs')));
  // The "More options for {label}" trigger is c69e9937a cn (rendered by sn for an item without its own menu).
  assert.equal(manifest.publicNames.ArtifactMenuTrigger.local, 'cn');
  assert.equal(count(official('c69e9937a-BIwXoJBq.js'), 'defaultMessage:"More options for {label}",id:"rKQPgfPvWS"'), 1);
  // Official evidence on the minified chunks.
  const lib = official('c230724a2-Dey3VRG9.js'), glyph = official('cbbbbbd87-VKX81sbm.js'), viewer = official('c2bb74286-CQLOwqIZ.js'), s9 = official('shared-9-CM21XrJw.js');
  for (const needle of ['function Ns(e){let $=J9(94),{title:t,tabs:n,tabPanel:r,contentGap:i,search:a,', 'No artifacts matching \\u201C{search}\\u201D', 'No artifacts match your search',
    'Your artifacts will be listed here once you create one.']) assert.equal(count(lib, needle), 1, needle);
  for (const needle of ['r===`frame`?`Code`:r===`design`?`Palette`:`Artifacts`', 'export{V as a,W as i,J as n,B as o,K as r,N as s,q as t}'].map(n => n.replaceAll('`', '"')))
    assert.equal(count(glyph, needle), 1, needle);
  for (const needle of ['"data-testid":"frame-artifact-title"', 'Lt as r']) assert.equal(count(viewer, needle), 1, needle);
  for (const needle of ['fh="cds-pane-ground flex h-full min-h-0 flex-col"', 'ph="flex h-frame-row shrink-0 items-center justify-between gap-sm bg-surface-3 ps-2 pe-3 pb-[var(--frame-row-line,0px)] -mb-[var(--frame-row-line,0px)]"',
    'mh as cr', 'fh as dr', 'ph as ur']) assert.equal(count(s9, needle), 1, needle);
});

test('viewer frame classes are the 3.6556.2 literals', () => {
  assert.equal(gen.artifactFrameClass, 'cds-pane-ground flex h-full min-h-0 flex-col');
  assert.equal(gen.artifactHeaderClass, 'flex h-frame-row shrink-0 items-center justify-between gap-sm bg-surface-3 ps-2 pe-3 pb-[var(--frame-row-line,0px)] -mb-[var(--frame-row-line,0px)]');
  assert.match(gen.artifactBodyClass, /^relative min-h-0 flex-1 bg-surface-2 .*after:border-\[color:var\(--cds-border-line,var\(--cds-alpha-1\)\)\]/);
  // The 2.31226.0 header row (h-12 … pl-2 pr-3) and divider (after:border-alpha-1) are gone.
  assert.doesNotMatch(gen.artifactHeaderClass, /\bh-12\b|\bpl-2\b|\bpr-3\b/);
  assert.doesNotMatch(gen.artifactBodyClass, /after:border-alpha-1\b/);
});

test('viewer title and action render the 3.6556.2 markup', () => {
  const title = renderToStaticMarkup(h(gen.ArtifactTitle, { title: 'Report', heading: true }));
  assert.match(title, /^<h2 [^>]*data-testid="frame-artifact-title"[^>]*>Report<\/h2>$/);
  assert.match(title, /title="Report"/);
  assert.equal(renderToStaticMarkup(h(gen.ArtifactTitle, { title: 'Report' })).startsWith('<span '), true);
  const action = renderToStaticMarkup(h(gen.ArtifactAction, { glyph: 'ArrowLeft', label: 'Back to artifacts', onClick() {} }));
  assert.match(action, /<button[^>]*aria-label="Back to artifacts"/);
  assert.match(action, /data-cds="Button"|data-cds="IconButton"|data-cds/);
});

test('glyph and thumbnail: the old Jr markup, now in cbbbbbd87 I', () => {
  const bare = renderToStaticMarkup(h(gen.ArtifactGlyph, { source: 'cowork', iconSize: 'lg', bare: true }));
  assert.match(bare, /^<div data-gallery-type-media="" class="flex h-full w-full items-center justify-center text-muted-as-secondary">/);
  const tinted = renderToStaticMarkup(h(gen.ArtifactGlyph, { source: 'frame', icon: 'Note', tint: 'blue', iconSize: 'md' }));
  assert.doesNotMatch(tinted, /data-gallery-type-media/);
  assert.match(tinted, /^<div class="flex h-full w-full items-center justify-center [^"]+">/);
  const thumb = renderToStaticMarkup(h(gen.ArtifactThumbnail, { item: item('a') }));
  assert.match(thumb, /data-gallery-type-media=""/);
});

test('library page: grid, list, no search match, empty library and loading', () => {
  const items = [item('a', { starred: true }), item('b')];
  const grid = page({ items });
  for (const k of ['a', 'b']) assert.match(grid, new RegExp(`data-gallery-card="${k}"`));
  assert.match(grid, /<ul role="list" aria-label="Artifacts" class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">/);
  assert.match(grid, /href="\/artifacts\/local\/a"/);
  assert.match(grid, /data-host-menu="a"/);
  assert.match(text(grid), /Report a/);
  const list = page({ items, layout: 'list' });
  assert.doesNotMatch(list, /grid grid-cols-1 gap-6/);
  assert.match(list, /<section class="flex flex-col"><h2 id="[^"]+" class="px-md py-xs text-caption font-medium text-muted-as-secondary">Pinned<\/h2>/);
  assert.match(list, /<li data-gallery-card="a" class="group\/cdsrow relative"><a href="\/artifacts\/local\/a" data-primary="true" aria-label="Report a"/);
  const none = page({ items: [], searchQuery: 'zzz' });
  assert.match(none, /<div role="status" class="mt-10 text-center text-body text-muted-as-secondary">No artifacts matching “zzz”/);
  const empty = page({ items: [] });
  assert.match(empty, /<div role="status" class="mt-10 text-center text-body text-muted-as-secondary">Your artifacts will be listed here once you create one\.<\/div>/);
  const loading = page({ items: [], isLoading: true });
  assert.doesNotMatch(loading, /Your artifacts will be listed here/);
  assert.match(text(grid), /Artifacts/);
  assert.match(grid, /New artifact/);
});
