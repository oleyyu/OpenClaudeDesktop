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
import { extractCodeCurrentUpperV4, ROOTS, FACADES, HOST_ADAPTERS, PENDING_ROOTS, LINKED_AREA_NAMES, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-code-current-upper-v4.mjs';

// account2 batch 7, region code-current:upper: the twelve 3.6556.2 "upper" modules of src/generated/code-current
// re-located in 4.16336.0 (scripts/extract-code-current-upper-v4.mjs -> src/generated/code-current-upper-v4, staged next to
// the 3.6556.2 graph the host still renders, linking the base graph code-current-v4). Source only: manifest, --check, the
// official chunk text, D1 links, the breadcrumb roots (released in round 3 once r3b-transcript-v4 exported cd8a7d7c0 m),
// and SSR through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/code-current-upper-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/session-rail-changes-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

const SEMANTIC = ['breadcrumb-file', 'breadcrumb-view', 'environment-delete-question', 'sessions-page-view', 'terminal-action-bar', 'titlebar-folder-pill', 'titlebar-seed-latch',
  'titlebar-spawn-lead', 'titlebar-spawn-origin'];
// RW8-NAV-1 (round-4 real-b sidebar lane): facade modules onto frame-sidebar-nav shared-57 (yS / fS; Bg / s_ / c_ / r_). Not
// SSR-loaded here: the nav graph evaluates only under its host table (frame-sidebar-nav-body.jsx order); their re-export
// lines, the linked manifest's exports and the pins are asserted instead.
const NAV_FACADE_MODULES = ['sidebar-filter-controls', 'sidebar-nested-caret'];
let server, gen = {}, adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  for (const m of SEMANTIC) gen[m] = await server.ssrLoadModule(`/${out}/${m}.mjs`);
  adapters = await server.ssrLoadModule('/src/source-code-current-upper-v4-adapters.jsx');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-code-current-upper-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-code-current-upper-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(a => typeof a === 'string' ? a : a.area), LINKED_AREA_NAMES);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  // The semantic modules keep the 3.6556.2 file names (the upper split of src/generated/code-current).
  // was: …sort(), SEMANTIC.map(m => `${m}.mjs`)) (before RW8-NAV-1)
  assert.deepEqual(fs.readdirSync(path.join(app, out)).filter(f => !/^(c[0-9a-f]+|shared-\d+)\.mjs$/.test(f) && f.endsWith('.mjs')).sort(), [...SEMANTIC, ...NAV_FACADE_MODULES].sort().map(m => `${m}.mjs`));
  for (const m of [...SEMANTIC, ...NAV_FACADE_MODULES]) assert.ok(fs.existsSync(path.join(app, 'src/generated/code-current', `${m}.mjs`)), `3.6556.2 ${m}.mjs`);
  await extractCodeCurrentUpperV4({ check: true });
});

test('roots and facades: AST-located and pinned under their 3.6556.2 semantic names; the breadcrumb shell links r3b\'s m', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file.replace(/-[\w-]{8}\.js$/, '')}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'c73f45bc3#ex=TitlebarSpawnLead/N', 'c73f45bc3#Nb=TitlebarOriginLabel', 'c73f45bc3#wb=originPillBase', 'c73f45bc3#vb=originPillSize',
    'c73f45bc3#yb=originPillPanelsSize', 'c73f45bc3#Eb=originPillStaticClass', 'c73f45bc3#Ob=originPillStaticPanelsClass',
    'c73f45bc3#Db=folderPillTriggerClass', 'c73f45bc3#kb=folderPillTriggerPanelsClass', 'c73f45bc3#mb=useEpisodeSeed/P',
    'shared-92#Jk=spawnOrigin/Yf', 'ceb49ada3#u=SelectionActionBar/t', 'cc3b500c8#C=EnvironmentDeleteQuestionHost/t',
    'cc3b500c8#S=askEnvironmentDelete/r', 'cc3b500c8#v=environmentDeleteQuestionText', 'cc3b500c8#_=environmentDeleteQuestionMessages',
    'cd2efac6e#wm=FileBreadcrumb', 'cd2efac6e#dd=BreadcrumbBody', 'cd2efac6e#pd=BreadcrumbFileName', 'cd2efac6e#md=BreadcrumbSegment',
    'cd2efac6e#hd=BreadcrumbSegmentLabel', 'cd2efac6e#fd=BreadcrumbSizerText', 'cd2efac6e#ld=preventBreadcrumbNativeMenu']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  // sessions-page-view re-exports sessions-page-v4's SessionsPage (cbd6c85c8 hm), the same declaration its generator pins.
  // was (before RW8-NAV-1): ['sessions-page-view:SessionsPageView=sessions-page-v4/sessions-page.mjs#SessionsPage'] and
  // Object.keys(FACADES).length 1. The sidebar facades link frame-sidebar-nav's shared-57 (cut whole there, D1).
  assert.deepEqual(provenance.facades.map(f => `${f.module}:${f.exportName}=${f.area}/${f.target}#${f.linkedName}`), [
    'sessions-page-view:SessionsPageView=sessions-page-v4/sessions-page.mjs#SessionsPage',
    'sidebar-nested-caret:SidebarContainerToggle=frame-sidebar-nav/shared-57.mjs#fS',
    'sidebar-nested-caret:SidebarNestedCaret=frame-sidebar-nav/shared-57.mjs#yS',
    'sidebar-filter-controls:sidebarFilterMessages=frame-sidebar-nav/shared-57.mjs#Bg',
    'sidebar-filter-controls:SidebarOptionMenu=frame-sidebar-nav/shared-57.mjs#s_',
    'sidebar-filter-controls:SidebarSortMenu=frame-sidebar-nav/shared-57.mjs#c_',
    'sidebar-filter-controls:SidebarViewResetItems=frame-sidebar-nav/shared-57.mjs#r_']);
  assert.ok(provenance.facades.every(f => f.pinned));
  assert.equal(Object.keys(FACADES).length, 3);
  const nav57 = JSON.parse(local('src/generated/frame-sidebar-nav/manifest.json')).modules.find(m => m.target === 'shared-57.mjs');
  for (const f of provenance.facades.filter(f => f.area === 'frame-sidebar-nav')) {
    assert.ok(nav57.bindings.some(b => (typeof b === 'string' ? b : b.name) === f.local), `frame-sidebar-nav holds ${f.local}`);
    assert.ok([...(nav57.linkExports ?? []), ...(nav57.sharedExports ?? [])].includes(f.local), `frame-sidebar-nav exports ${f.local}`);
    assert.ok(!manifest.modules.some(m => /^shared-57-/.test(m.source ?? '') && m.bindings.some(b => (typeof b === 'string' ? b : b.name) === f.local)), `${f.local} is not cut here`);
    assert.match(local(`${out}/${f.module}.mjs`), new RegExp(`^export \\{ ${f.local.replace('$', '\\$')} as ${f.exportName} \\} from "\\.\\./frame-sidebar-nav/shared-57\\.mjs";$`, 'm'));
  }
  assert.deepEqual(Object.keys(provenance.notPorted).sort(), ['sidebar-filter-controls', 'sidebar-filter-view']);
  assert.match(local('scripts/extract-sessions-page-v4.mjs'), new RegExp(`'cbd6c85c8-CxDdK_2w.js#hm': '${provenance.facades[0].declarationSha256}'`));
  assert.equal(typeof gen['sessions-page-view'].SessionsPageView, 'function');
  // dd / wm waited (PENDING_ROOTS) until r3b-transcript-v4 exported cd8a7d7c0 m (round 3: linkExports ['m']); now both
  // are emitted and the path label options context is imported from r3b-transcript-v4, never cut here (D1).
  assert.deepEqual(PENDING_ROOTS, {});
  assert.deepEqual(provenance.pendingRoots, []);
  assert.ok(fs.existsSync(path.join(app, out, 'breadcrumb-file.mjs')));
  assert.equal(typeof gen['breadcrumb-file'].FileBreadcrumb, 'function', 'FileBreadcrumb');
  assert.notEqual(gen['breadcrumb-view'].BreadcrumbBody, undefined);
  const r3b = JSON.parse(local('src/generated/r3b-transcript-v4/manifest.json'));
  const pdo = r3b.modules.find(m => m.target === 'path-display-options.mjs');
  assert.ok(pdo.bindings.some(b => (typeof b === 'string' ? b : b.name) === 'm') && (pdo.linkExports ?? []).includes('m'), 'r3b-transcript-v4 holds m and exports it (linkExports)');
  assert.match(local('src/generated/r3b-transcript-v4/path-display-options.mjs'), /export \{[^}]*\bm\b[^}]*\};\s*$/);
  const linkedM = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked' && i.name === 'm' && /r3b-transcript-v4\/path-display-options\.mjs$/.test(i.from)).map(() => m.target));
  assert.ok(linkedM.length >= 1, 'the label options context m is imported from r3b-transcript-v4');
  assert.ok(!manifest.modules.some(m => /cd8a7d7c0/.test(m.source) && m.bindings.some(b => (typeof b === 'string' ? b : b.name) === 'm')), 'm is not cut here');
  for (const [file, roots] of Object.entries(ROOTS)) for (const [l, r] of Object.entries(roots)) {
    if (PENDING_ROOTS[`${file}#${l}`]) continue;
    assert.notEqual(gen[r.module][r.name], undefined, `${r.module} ${r.name}`);
  }
});

test('host boundaries: only react-intl over the local catalog, re-exported unchanged', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), ['vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, 2);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), ['vendor-intl-BJgYK7RA.js#Gt', 'vendor-intl-BJgYK7RA.js#q']);
  const adapterText = local('src/source-code-current-upper-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]), ['./source-session-rail-changes-adapters.jsx']);
});

test('D1: bindings the linked areas hold are imported from them, never cut again; the base graph is linked, not changed', () => {
  const held = new Map();
  for (const linked of manifest.linkedAreas) {
    const area = typeof linked === 'string' ? linked : linked.area;
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    const only = typeof linked === 'string' ? null : new Set(linked.modules);
    for (const mod of m.modules) if (mod.source && (!only || only.has(mod.target))) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  for (const k of own) assert.ok(!held.has(k), `${k} is cut again although ${held.get(k)} holds it`);
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  for (const area of ['code-current-v4', 'files-changes-v4', 'session-rail-kit-v4', 'session-rail-changes-v4', 'routines-shared-v4']) assert.ok(linked.has(area), `links ${area}`);
  const imp = (target, local) => manifest.modules.find(m => m.target === target).imports.find(i => i.local === local);
  // The titlebar title skeleton and origin box classes stay code-current-v4's (base); the breadcrumb segment menu is
  // session-rail-changes-v4's RowContextMenu; the folder segment and the gone check are files-changes-v4's.
  assert.equal(imp('c73f45bc3.mjs', '$b').from, '../code-current-v4/titlebar-title-skeleton.mjs');
  assert.equal(imp('cd2efac6e.mjs', 'Ta').from, '../session-rail-changes-v4/c0cdf4a08.mjs');
  assert.equal(imp('cd2efac6e.mjs', 'ua').from, '../files-changes-v4/file-gone-check.mjs');
  // The environment-delete question store (cc3b500c8 y, zustand) is held here once among the 4.16336.0 graphs.
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'code-current-upper-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    let m; try { m = JSON.parse(local(`src/generated/${dir}/manifest.json`)); } catch { continue; }
    if (m.referenceVersion !== '4.16336.0') continue;
    assert.ok(!(m.modules ?? []).some(mod => path.basename(mod.source ?? '') === 'cc3b500c8-zdjI6Jju.js' && (mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === 'y')), dir);
  }
  assert.equal(JSON.parse(local('src/generated/code-current/manifest.json')).referenceVersion ?? '3.6556.2', '3.6556.2');
});

test('the official text: titlebar pills, action bar, environment-delete copy', () => {
  const tb = official('c73f45bc3-C7dtUSq8.js');
  for (const s of ['vb=_b("h-[20px] px-1.25")', 'yb=_b("h-control px-3")', 'Eb=wb(vb,"text-secondary")', 'Db=Tb(wb(vb,"text-secondary-control"))', 'ex as N', 'mb as P'])
    assert.ok(tb.includes(s), s);
  const sp = gen['titlebar-spawn-lead'], fp = gen['titlebar-folder-pill'];
  assert.equal(sp.originPillSize, "relative isolate inline-flex items-center gap-0.75 h-[20px] px-1.25 rounded text-footnote select-none before:content-[''] before:absolute before:-z-[1] before:inset-0 before:rounded");
  assert.equal(sp.originPillStaticClass, sp.originPillBase(sp.originPillSize, 'text-secondary'));
  assert.ok(fp.folderPillTriggerClass.startsWith(sp.originPillBase(sp.originPillSize, 'text-secondary-control') + ' border-0 focus-visible:outline-hidden'));
  assert.ok(fp.folderPillTriggerPanelsClass.includes('h-control px-3'));
  assert.ok(official('cc3b500c8-zdjI6Jju.js').includes('defaultMessage:"Delete environment?",id:"1sJ0FTOE0U"'));
  assert.equal(gen['environment-delete-question'].environmentDeleteQuestionMessages.title.defaultMessage, 'Delete environment?');
});

test('pure helpers: spawnOrigin follows the official text', () => {
  const { spawnOrigin } = gen['titlebar-spawn-origin'];
  assert.deepEqual(spawnOrigin({ type: 'local', cwd: '/Users/me/work/claude-ui-lab', remote: false }), { type: 'local', label: 'claude-ui-lab', remote: false, isScratchWorkspace: false });
  assert.deepEqual(spawnOrigin({ type: 'local', repoInfo: { name: 'repo' }, cwd: '/x/y' }), { type: 'local', label: 'repo', remote: undefined, isScratchWorkspace: false });
  assert.equal(spawnOrigin({ type: 'local', cwd: '/x/y', isScratchWorkspace: true }).label, undefined);
});

test('SSR: the titlebar spawn lead (loading origin ghost, local origin glyph with its label pill)', () => {
  const { TitlebarSpawnLead } = gen['titlebar-spawn-lead'];
  const ghost = renderToStaticMarkup(h(TitlebarSpawnLead, { origin: null, title: null }));
  assert.match(ghost, /role="status"/);
  assert.match(ghost, /data-slot="origin-ghost"/);
  assert.match(text(ghost), /Loading session/);
  const lead = renderToStaticMarkup(h(TitlebarSpawnLead, { origin: { kind: 'local', label: 'claude-ui-lab' }, title: 'Fix the build' }));
  assert.match(lead, /data-testid="epitaxy-origin-indicator"/);
  assert.match(lead, /data-testid="epitaxy-origin-label"[^>]*>claude-ui-lab</);
  assert.doesNotMatch(lead, /origin-ghost/);
  const bare = renderToStaticMarkup(h(TitlebarSpawnLead, { origin: { kind: 'local', label: 'x' }, title: 'T', bare: true }));
  assert.doesNotMatch(bare, /epitaxy-origin-indicator|epitaxy-origin-label/);
});

test('SSR: the selection action bar (labels, icon buttons, the split separator)', () => {
  const { SelectionActionBar } = gen['terminal-action-bar'];
  assert.equal(renderToStaticMarkup(h(SelectionActionBar, { actions: [] })), '');
  const html = renderToStaticMarkup(h(SelectionActionBar, { actions: [
    { key: 'copy', label: 'Copy', ariaLabel: 'Copy selection', onSelect() {} },
    { key: 'ask', label: 'Ask Claude', ariaLabel: 'Ask Claude about selection', onSelect() {} }] }));
  assert.match(html, /!rounded group\/split flex/);
  assert.equal(html.split('group-hover/split:opacity-0').length - 1, 1, 'one separator between two actions');
  assert.match(text(html), /^Copy Ask Claude$/);
  assert.match(html, /aria-label="Copy selection"/);
});

test('SSR: the environment-delete question text and its host (no question pending)', () => {
  const q = gen['environment-delete-question'];
  function Probe(props) { return q.environmentDeleteQuestionText(adapters.useIntl(), props); }
  const one = renderToStaticMarkup(h(Probe, { name: 'Remote box', count: 1, pinnedCount: 0, runningCount: 0 }));
  assert.match(one, /Remote box/);
  assert.match(one, /Keep the session started from it, or delete both\./);
  const many = renderToStaticMarkup(h(Probe, { name: 'Remote box', count: 3, pinnedCount: 0, runningCount: 0, someRanElsewhere: true }));
  assert.match(many, /Keep the 3 sessions started from it, or delete them too\./);
  assert.equal(renderToStaticMarkup(h(q.EnvironmentDeleteQuestionHost)), '');
  assert.equal(typeof q.askEnvironmentDelete, 'function');
});

// Round 3: the breadcrumb shell (cd2efac6e wm FileBreadcrumb over dd BreadcrumbBody), whose path label options come from
// r3b-transcript-v4's one cd8a7d7c0 m context. Without a lister the segments are plain spans titled with their absolute
// path, under the invisible sizer row (`data-text` per segment, the lead ellipsis first) that measures the truncation.
test('SSR: the file breadcrumb (wm over dd): the sizer row, the body marker and the titled segments', () => {
  const html = renderToStaticMarkup(h(gen['breadcrumb-file'].FileBreadcrumb, { displayPath: 'src/a.js', fullPath: '/repo/src/a.js', tooltipPath: '/repo/src/a.js', posix: true, onCopyPath() {} }));
  assert.match(html, /^<div class="text-body font-normal font-control text-secondary flex min-w-0 -mx-0\.75">/);
  assert.match(html, /<span aria-hidden="true" class="invisible flex shrink-0"><span class="absolute flex"><span data-text="…" /);
  assert.match(html, /<span data-file-breadcrumb="true" class="absolute inset-1 flex items-baseline"><span title="\/repo\/src" class="px-0\.75 shrink-0 text-muted-as-secondary">src<\/span><span aria-hidden="true" class="shrink-0 text-muted-as-secondary">\/<\/span><span title="\/repo\/src\/a\.js" class="px-0\.75 shrink-0">a\.js<\/span><\/span>/);
  assert.doesNotMatch(html, /data-breadcrumb-segment/);
});
