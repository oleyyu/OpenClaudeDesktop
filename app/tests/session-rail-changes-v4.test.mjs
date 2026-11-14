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
import { extractSessionRailChangesV4, ROOTS, HOST_ADAPTERS, PENDING_ROOTS, LINKED_AREA_NAMES, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-session-rail-changes-v4.mjs';

// account2 batch 5, region session-rail-changes: the 4.16336.0 session rail Changes card rows
// (scripts/extract-session-rail-changes-v4.mjs -> src/generated/session-rail-changes-v4, staged next to the 3.6556.2
// src/generated/session-rail-changes the host still renders). Source only: manifest, the generator's --check, the
// official chunk text, D1 links, the pending PrBarRow root, and SSR of the rail rows through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/session-rail-changes-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/cowork-progress-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

let server, gen;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-session-rail-changes-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-session-rail-changes-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(a => typeof a === 'string' ? a : a.area), LINKED_AREA_NAMES);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractSessionRailChangesV4({ check: true });
});

test('roots: the semantic names, AST-located and pinned; PrBarRow emitted over cds-core renderMenuItems (shared-frame _D, wave 7)', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file.replace(/-[\w-]{8}\.js$/, '')}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'c96d752d0#qE=PrBarRow/Go', 'c96d752d0#vMe=RailPrRows', 'c96d752d0#EE=PrBarLayoutContext', 'c96d752d0#TE=RailPrCountContext/ts',
    // R4-RW8-SR (round4 relink-w8, session-rail sN): + OE RepoNameChip / DE InRepoNameChipContext after hje (moved here from
    // session-rail-v4's held roots; was: ... 'c96d752d0#hje=useReportRailPrCount', 'c96d752d0#_Pe=prBarMode', ...).
    'c96d752d0#fMe=railRowsShape', 'c96d752d0#gMe=useRailRowsControls', 'c96d752d0#hje=useReportRailPrCount',
    'c96d752d0#OE=RepoNameChip/$o', 'c96d752d0#DE=InRepoNameChipContext/es', 'c96d752d0#_Pe=prBarMode',
    'c96d752d0#VD=repoRowId', 'c96d752d0#BD=repoRowIdKey', 'c96d752d0#rMe=PrBarStaleRow', 'c96d752d0#wD=PR_BAR_ROWS_CLASS/Vo',
    'c96d752d0#xNe=PR_BAR_HOLD_CLASS', 'c96d752d0#fNe=RAIL_PR_BAR_NAV_CLASS', 'c96d752d0#uPe=prBarRowShown', 'c03935b01#Vn=prBarRowSnapshot/Vr',
    'c0cdf4a08#g=RowContextMenu/t', 'c0b46114c#h=useBandEnter/s', 'c0b46114c#p=BAND_ENTER_CLASS/t', 'shared-38#Yr=bandAccentClassName/Qr',
    'shared-55#gy=BRANCH_ROW_GHOST_ATTR/il', 'shared-1#G3=commandShortcut/$n', 'vendor-intl#sn=FormattedList/r']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  // PrBarRow waited for cds-core's renderMenuItems; cds-core publishes it since wave 7, so nothing is pending and the
  // menu body links that one copy (never cut here).
  assert.deepEqual(Object.keys(PENDING_ROOTS), []);
  assert.deepEqual(provenance.pendingRoots ?? [], []);
  assert.notEqual(gen.PrBarRow, undefined);
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  assert.deepEqual([cds.publicNames.renderMenuItems.file, cds.publicNames.renderMenuItems.local], ['shared-frame-CJdE5Ria.js', '_D']);
  assert.ok(manifest.modules.some(m => (m.imports ?? []).some(i => i.kind === 'shared-graph' && i.from === `../cds-core/${cds.publicNames.renderMenuItems.target}` && i.name === cds.publicNames.renderMenuItems.exportName)), 'renderMenuItems from cds-core');
  assert.ok(!manifest.modules.some(m => m.source === 'shared-frame-CJdE5Ria.js' && m.bindings.some(b => b.name === '_D')), '_D is not cut here');
  for (const r of provenance.roots.filter(r => !PENDING_ROOTS[`${r.file}#${r.local}`])) assert.notEqual(gen[r.name], undefined, r.name);
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage', 'shared-62#rP=useErrors', 'c227f4d5e#mD=prPanelPreloadHandle',
    'cc6e65d4b#b=usePrLinkInAppClick', 'c2fd10b8d#sc=usePrLinkPolicy', 'c60636ac6#mt=hasPrHoverCard', 'c96d752d0#gD=RailPrListItem',
    'shared-62#OT=useAnalytics', 'c60636ac6#ht=PrHoverCard']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  // Every adapter import site names an adapted original; since wave 7 qE (PrBarRow) is emitted, so its boundaries are
  // used too: every adapter is.
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  assert.deepEqual([...used].sort(), ['c227f4d5e-DGDdGBTz.js#mD', 'c2fd10b8d-DEwP4IO5.js#sc', 'c60636ac6-Qhz8qfr3.js#ht', 'c60636ac6-Qhz8qfr3.js#mt',
    'c96d752d0-D9VB6ArX.js#gD', 'cc6e65d4b-CkNcfjau.js#b', 'shared-62-DoCqVpIq.js#OT', 'shared-62-DoCqVpIq.js#rP', 'vendor-intl-BJgYK7RA.js#Gt', 'vendor-intl-BJgYK7RA.js#q']);
  for (const key of used) assert.ok(HOST_ADAPTERS[key], key);
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-session-rail-changes-v4-adapters.jsx');
  // The adapter module only re-exports existing host adapters (no new implementation).
  const adapterText = local('src/source-session-rail-changes-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-session-rail-changes-adapters.jsx', './source-routines-shared-adapters.jsx']);
});

test('D1: bindings the linked areas hold are imported from them, never cut again; the rail PR count context is held once', () => {
  const held = new Map();
  for (const linked of manifest.linkedAreas) {
    const area = typeof linked === 'string' ? linked : linked.area;
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) if (mod.source) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  for (const k of own.filter(k => held.has(k))) assert.ok(Object.hasOwn(provenance.linkedCopies, k), `${k} is cut again although ${held.get(k)} holds it`);
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  for (const area of ['session-rail-kit-v4', 'files-changes-v4', 'routines-shared-v4', 'code-current-v4']) assert.ok(linked.has(area), `links ${area}`);
  // TE (createContext = k) is declared once, here, and no other 4.16336.0 graph holds it.
  assert.equal(local(`${out}/c96d752d0.mjs`).split('TE = k(null)').length - 1, 1);
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'session-rail-changes-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    assert.ok(!(m.modules ?? []).some(mod => path.basename(mod.source ?? '') === 'c96d752d0-D9VB6ArX.js' && (mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === 'TE')), dir);
  }
  // The 3.6556.2 graph is untouched (staged double output).
  assert.equal(JSON.parse(local('src/generated/session-rail-changes/manifest.json')).referenceVersion, '3.6556.2');
});

test('the official text: the rail rows copy and classes', () => {
  const c96 = official('c96d752d0-D9VB6ArX.js');
  for (const s of ['"scroll-fade-y flex max-h-[50vh] flex-col overflow-y-auto overscroll-contain empty:hidden"', 'fNe="flex flex-col gap-1 empty:hidden"',
    '{defaultMessage:"{count} merged",id:"WQh7w3BsRk"', 'TE=k(null)', 'EE=k("band")', 'wD as Vo', 'TE as ts', 'qE as Go'])
    assert.ok(c96.includes(s), s);
  assert.ok(official('c0b46114c-hEcQAWZ3.js').includes('p="epitaxy-band-enter"'));
  assert.ok(official('shared-55-BRv2XBP7.js').includes('gy="data-epitaxy-branch-row-ghost"'));
});

const input = (n, over = {}) => ({ id: `r${n}`, repoName: 'claude-ui-lab', hideRepo: false, branchName: `feature/${n}`, prState: 'open',
  prUrl: `https://github.com/acme/claude-ui-lab/pull/${n}`, prNumber: n, prMode: 'view', diff: { added: 12, removed: 3 }, comments: 0, ci: undefined,
  chooser: false, dismissable: false, ...over });
const entry = (n, history = false, over = {}) => {
  const row = gen.prBarRowSnapshot(input(n, over));
  return { rowKey: `k#${n}`, primary: n === 1, history, facts: { prState: over.prState ?? 'open', ciStatus: undefined }, row };
};
function rows(entries, state = { showAll: false, historyOpen: false }) {
  const shape = gen.railRowsShape(entries);
  const controls = { state, onToggleShowAll() {}, onHistoryOpenChange() {} };
  return renderToStaticMarkup(h(gen.PrBarLayoutContext.Provider, { value: 'rail' },
    h(gen.RailPrRows, { shape, controls, announcement: { text: '', nonce: 0 }, renderRow: (e) => h(gen.PrBarStaleRow, { row: e.row }) })));
}

test('pure helpers: snapshot, shape, mode and the row ids follow the official text', () => {
  const snap = gen.prBarRowSnapshot(input(7, { prState: 'merged' }));
  assert.deepEqual([snap.pr, snap.diff, snap.accent, snap.action], [{ number: 7, state: 'merged' }, null, true, 'view']);
  assert.equal(gen.prBarRowSnapshot(input(1, { prMode: 'merge' })).action, 'none');
  const shape = gen.railRowsShape([entry(1), entry(2, true, { prState: 'merged' }), entry(3, true, { prState: 'closed' })]);
  assert.deepEqual([shape.rows.length, shape.history.length, shape.prCount], [1, 2, 3]);
  assert.equal(gen.prBarMode({ state: 'merged' }, 'create', false), 'merged');
  assert.equal(gen.prBarMode(null, 'create', true), 'none');
  assert.deepEqual(gen.repoRowId({ cwd: '/w', repo: 'Acme/Claude-UI-Lab', branch: 'main' }, false), { cwd: '/w', repo: 'claude-ui-lab', branch: 'main', history: false });
  assert.equal(gen.repoRowIdKey({ cwd: '/w', repo: 'r', branch: 'b', history: true }), '["/w","r","b",true]');
  assert.equal(gen.prBarRowShown(false, { hasChanges: true }, true, false), true);
  assert.equal(gen.BAND_ENTER_CLASS, 'epitaxy-band-enter');
  assert.equal(gen.BRANCH_ROW_GHOST_ATTR, 'data-epitaxy-branch-row-ghost');
  assert.equal(gen.RAIL_PR_BAR_NAV_CLASS, 'flex flex-col gap-1 empty:hidden');
});

test('SSR: the rail rows list (vMe) with the official stale rows (rMe), Show more after five rows, earlier pull requests', () => {
  const one = rows([entry(1)]);
  assert.match(one, /<ul[^>]*role="list"[^>]*class="flex flex-col gap-1"|<ul[^>]*class="flex flex-col gap-1"[^>]*role="list"/);
  assert.equal(one.split('<li class="flex flex-col"').length - 1, 1);
  assert.ok(text(one).includes('#1') && text(one).includes('claude-ui-lab'), text(one));
  assert.doesNotMatch(one, /Show more|earlier pull request/);
  const six = rows([1, 2, 3, 4, 5, 6].map(n => entry(n)));
  // vMe mounts hD(shape, showAll): the first five rows (plus `kept` ones, none here), then the Show-more toggle.
  assert.equal(six.split('<li class="flex flex-col"').length - 1, 5, 'five rows before Show more');
  assert.ok(!six.includes('hidden=""'));
  // g_e is the kit's RailShowMoreToggle (c227f4d5e xE: "Show more" / "Show less", linked from session-rail-kit-v4).
  assert.match(text(six), /#5 claude-ui-lab feature\/5 \+12 −3 Show more$/);
  const all = rows([1, 2, 3, 4, 5, 6].map(n => entry(n)), { showAll: true, historyOpen: false });
  assert.equal(all.split('<li class="flex flex-col"').length - 1, 6);
  assert.match(text(all), /Show less/);
  const history = rows([entry(1), entry(2, true, { prState: 'merged' }), entry(3, true, { prState: 'closed' })]);
  assert.match(text(history), /2 earlier pull requests/);
  assert.match(history, /<span class="shrink-0 text-footnote text-muted">1 merged<\/span>/);
});

test('SSR: the row context menu (closed) passes its trigger through', () => {
  const html = renderToStaticMarkup(h(gen.RowContextMenu, { trigger: h('button', { type: 'button' }, 'row') }, h('span', null, 'menu')));
  assert.equal(html, '<button type="button">row</button>');
});
