// session-panels-v4 (scripts/extract-session-panels-v4.mjs; surfaces-prod-3 session-page lane, item 2; round3 relink SP-1 /
// SP-2): the Code session tile line mode and the pane frame c4db265df Tn (PaneFrame) over cds-core, with the tile contexts
// its tile host provides (c4db265df ot, shared-20 ub). The 4.16336.0 CdsPanel layer (shared-38 Wi / Di / Ei, official
// exports ft / mt / ht) Tn puts around every docked pane was this area's until cds-core wave 7 published it (CdsPanel /
// CdsPanelLabelContext / CdsPanelResizeHandle, with shared-20 f_ / u_ / p_, and shared-120 Je as CdsPanePanelsContext):
// the render checks below read cds-core's one copy. The Background tasks pane (src/source-agent.jsx) is drawn by
// PaneFrame. SSR through Vite's module graph; no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionPanelsV4, linkedAreas, linkedCopies, hostAdapters, pinsPath, adapterSource, roots } from '../scripts/extract-session-panels-v4.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = b => createHash('sha256').update(b).digest('hex');
const OUT = 'src/generated/session-panels-v4';
const manifest = JSON.parse(read(`${OUT}/manifest.json`));
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const officialText = name => fs.readFileSync(path.join(official4.ionSource, name), 'utf8');
const imports = manifest.modules.flatMap(m => (m.imports ?? []).map(i => ({ module: m.target, ...i })));
const h = React.createElement;
const core = JSON.parse(read('src/generated/cds-core/manifest.json'));
const PANEL = ['CdsPanel', 'CdsPanelLabelContext', 'CdsPanelResizeHandle'];

let server, P, F, L, A, Ad;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const mod = await server.ssrLoadModule(`/src/generated/cds-core/${core.publicNames.CdsPanel.target}`);
  P = Object.fromEntries(PANEL.map(n => [n, mod[core.publicNames[n].exportName]]));
  F = await server.ssrLoadModule(`/${OUT}/pane-frame.mjs`);
  L = await server.ssrLoadModule(`/${OUT}/tiles-line.mjs`);
  A = await server.ssrLoadModule('/src/source-agent.jsx');
  Ad = await server.ssrLoadModule('/src/session-panels-v4-adapter.mjs');
});
after(async () => { await server?.close(); });

test('generator: --check reproduces the pinned modules from the pinned 4.16336.0 chunks, over cds-core', async () => {
  await extractSessionPanelsV4({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph?.area ?? manifest.sharedGraph, 'cds-core');
  // R4-RW8-SR (round4 relink-w8, session-rail sN): + PaneReadingOrderContext (c4db265df at, export E; was the 11 names without it).
  assert.deepEqual(Object.keys(pins.roots).sort(), ['PaneFrame', 'PaneInTileContext', 'PaneReadingOrderContext', 'PaneStandsOnPageContext', 'TILE_AFTER_LINE_X_STYLE', 'TILE_AFTER_LINE_Y_STYLE',
    'TILE_REACH_BACK', 'TILE_STYLES', 'WIDE_TITLE_ROW_H', 'isChatOrSessionTile', 'paneTileStandsOnPage', 'tileShellStyle']);
  assert.deepEqual(pins.also, {});
  assert.equal(Object.keys(pins.sources).length, 29);
  for (const file of ['c9543da06-DHwxxZai.js', 'shared-20-DUEo90UF.js', 'c4db265df-CHyZjtsm.js', 'c03935b01-BylKMWqe.js']) assert.ok(pins.sources[file], file);
  // The Code session tile line mode (shared-20 h_ / l_ / fb / Qy, c9543da06 Os / ks / As / vs) the host tile engine runs
  // (src/tile-line-model.mjs), and SP-1's pane frame with its tile contexts; f_ / p_, the CdsPanel layer and Je are cds-core's.
  assert.deepEqual(roots.map(r => [r.file.split('-')[0] + '-' + r.file.split('-')[1], r.local, r.export]), [
    ['shared-20', 'h_', 'Vc'], ['shared-20', 'l_', 'zc'], ['shared-20', 'fb', 'Cs'], ['shared-20', 'Qy', 'Os'],
    ['c9543da06-DHwxxZai.js', 'Os', null], ['c9543da06-DHwxxZai.js', 'ks', null], ['c9543da06-DHwxxZai.js', 'As', null], ['c9543da06-DHwxxZai.js', 'vs', null],
    // R4-RW8-SR: + ['c4db265df-CHyZjtsm.js', 'at', 'E'] after ot (was: ... ['c4db265df-CHyZjtsm.js', 'ot', 'D'], ['shared-20', 'ub', 'xs']).
    ['c4db265df-CHyZjtsm.js', 'Tn', 't'], ['c4db265df-CHyZjtsm.js', 'ot', 'D'], ['c4db265df-CHyZjtsm.js', 'at', 'E'], ['shared-20', 'ub', 'xs']]);
  // SP-1: PaneFrame's closure past the D-SP-1 cut (the CdsPanel closure itself stays in cds-core).
  assert.deepEqual(manifest.modules.map(m => m.target).sort(), ['c03935b01.mjs', 'c12ca901f.mjs', 'c41956fd9.mjs', 'c5d464fa3.mjs', 'c68c4283d.mjs', 'c6e73333a.mjs',
    'c7037f09e.mjs', 'c70925de4.mjs', 'c9bc99274.mjs', 'ca5db7aaf.mjs', 'cb50b3202.mjs', 'cc44b66a7.mjs', 'cd12ec3aa.mjs', 'cd1d8a6ac.mjs', 'cf53e1812.mjs',
    'pane-frame.mjs', 'shared-0.mjs', 'shared-1.mjs', 'shared-18.mjs', 'shared-183.mjs', 'shared-19.mjs', 'shared-31.mjs', 'shared-38.mjs', 'shared-39.mjs', 'shared-55.mjs',
    'shared-62.mjs', 'shared-frame.mjs', 'tiles-line.mjs', 'tiles-shell.mjs']);
  for (const m of manifest.modules) {
    assert.equal(sha(fs.readFileSync(path.join(app, OUT, m.target))), m.sha256, m.target);
    assert.equal(m.referenceVersion ?? manifest.referenceVersion, '4.16336.0');
  }
  assert.equal(read('src/session-panels-v4-adapter.mjs'), adapterSource());
  assert.equal(pins.cdsCore.manifestSha256, sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))));
  // The CdsPanel layer and f_ / u_ / p_ are cds-core publicNames over their original declarations.
  for (const [name, local] of [['CdsPanel', 'Wi'], ['CdsPanelLabelContext', 'Di'], ['CdsPanelResizeHandle', 'Ei']])
    assert.deepEqual([core.publicNames[name].file, core.publicNames[name].local], ['shared-38-DyF0_Fim.js', local], name);
  for (const [name, local] of [['writer_shared20_f_', 'f_'], ['state_shared20_u_', 'u_'], ['writer_shared20_p_', 'p_']])
    assert.deepEqual([core.publicNames[name].file, core.publicNames[name].local], ['shared-20-DUEo90UF.js', local], name);
  const text = read(`src/generated/cds-core/${core.publicNames.CdsPanel.target}`);
  assert.match(text, /\bvar Di = d\(null\);/);
  const s38 = officialText('shared-38-DyF0_Fim.js');
  for (const piece of ['Wi as ft', 'Di as mt', 'Ei as ht', 'Di=d(null)', 'Bi=320', 'Vi=280', 'Hi=640', '"data-cds":"Panel"']) assert.ok(s38.includes(piece), piece);
  // SP-1: PaneFrame and its tile contexts are exported from their original declarations; it reads the CdsPanel layer and
  // the panes-panels context (shared-120 Je) from cds-core.
  const frame = read(`${OUT}/pane-frame.mjs`);
  // R4-RW8-SR: + at as PaneReadingOrderContext (prettier now breaks the list; was /^export \{ Tn as PaneFrame, ot as PaneInTileContext \};$/m).
  assert.match(frame, /^export \{\n  Tn as PaneFrame,\n  ot as PaneInTileContext,\n  at as PaneReadingOrderContext,\n\};$/m);
  assert.match(frame, /^var .*\bat = c\(\[\]\)/m);
  assert.match(frame, /^function Tn\(r\) \{$/m);
  assert.match(frame, /^var .*\bot = c\(!1\)/m);
  assert.match(frame, /^import \{ Dr as Ce, Je as we \} from "\.\.\/cds-core\/shared-120\.mjs";$/m);
  assert.deepEqual([core.publicNames.CdsPanePanelsContext.file, core.publicNames.CdsPanePanelsContext.local], ['shared-120-DCdTP1_5.js', 'Je']);
  assert.match(read(`${OUT}/tiles-line.mjs`), /\bub as PaneStandsOnPageContext\b/);
  const c4d = officialText('c4db265df-CHyZjtsm.js');
  for (const piece of ['Tn as t', 'ot as D', 'ot=c(!1)', '"data-pane-root":M', 'te("side_pane")', 'Ye=o(ot)', 'Xe=o(fe)', 'ht=Pe()', 'xs as fe', 'gn as we', 'Et as Ie', 'Dt as Pe'])
    assert.ok(c4d.includes(piece), piece);
});

test('D1: cds-core names and linked -v4 areas only; the panel label context, the u_ cache and Je are held by cds-core alone', () => {
  assert.deepEqual(linkedAreas, ['code-composer-v4', 'routines-shared-v4', 'frame-sidebar', 'settings-pages-v4',
    { area: 'code-current-v4', modules: ['environment-modifier-keys.mjs'] }, { area: 'files-changes-v4', modules: ['file-type-icon-context.mjs'] }]);
  assert.deepEqual(Object.keys(linkedCopies).sort(), ['c5d464fa3-D1V4bYI5.js#V', 'shared-1-D1bGaTaN.js#AU', 'shared-1-D1bGaTaN.js#jU']);
  const linkedRoot = /^\.\.\/(cds-core|code-composer-v4|routines-shared-v4|frame-sidebar|settings-pages-v4)\/|^\.\.\/code-current-v4\/environment-modifier-keys\.mjs$|^\.\.\/files-changes-v4\/file-type-icon-context\.mjs$/;
  for (const i of imports) {
    if (i.kind === 'react' || i.kind === 'adapter' || i.kind === 'generated') continue;
    assert.ok(linkedRoot.test(i.from), `${i.module}: ${i.name} from ${i.from}`);
  }
  // The tile line-mode roots still read nothing outside their two chunks.
  assert.deepEqual(imports.filter(i => (i.module === 'tiles-shell.mjs' || i.module === 'tiles-line.mjs') && i.kind !== 'generated' && i.kind !== 'react'), []);
  // The stateful bindings PaneFrame reads, from their one holder.
  const one = (module, kind, name, from, original) => assert.ok(imports.some(i => i.module === module && i.kind === kind && i.name === name && i.from === from && i.original === original), `${module} ${name}`);
  one('pane-frame.mjs', 'shared-graph', 'Wi', '../cds-core/shared-38.mjs', 'Wi');
  one('pane-frame.mjs', 'shared-graph', 'Je', '../cds-core/shared-120.mjs', 'Je');
  one('pane-frame.mjs', 'shared-graph', 'Dr', '../cds-core/shared-120.mjs', 'Dr');
  one('c03935b01.mjs', 'shared-graph', 'vf', '../cds-core/c03935b01.mjs', 'vf');
  one('pane-frame.mjs', 'linked', 'environmentModifierKeys', '../code-current-v4/environment-modifier-keys.mjs', 'F9');
  one('pane-frame.mjs', 'linked', 'FileTypeIconSetContext', '../files-changes-v4/file-type-icon-context.mjs', 't');
  // D-SP-1: c03935b01 Q is the one host boundary of the closure; the module store yf it falls back to is not cut.
  assert.deepEqual([...new Set(imports.filter(i => i.kind === 'adapter').map(i => i.name))].sort(), ['HostFormattedMessage', 'useHostIntl', 'usePaneTileStoreSelector']);
  assert.deepEqual(imports.filter(i => i.name === 'usePaneTileStoreSelector').map(i => `${i.module} ${i.via}`).sort(), ['ca5db7aaf.mjs c03935b01-BylKMWqe.js:Et', 'pane-frame.mjs c03935b01-BylKMWqe.js:Et']);
  assert.ok(imports.filter(i => /^(useHostIntl|HostFormattedMessage)$/.test(i.name)).every(i => /^vendor-intl-BJgYK7RA\.js[#:]/.test(i.via)));
  assert.deepEqual(Object.keys(hostAdapters['c03935b01-BylKMWqe.js']), ['Et']);
  assert.ok(!manifest.modules.find(m => m.target === 'c03935b01.mjs').bindings.some(b => ['Q', 'yf', 'du'].includes(b.name ?? b)));
  const generated = path.join(app, 'src/generated');
  const coreMods = core.modules.filter(m => ['shared-38-DyF0_Fim.js', 'shared-20-DUEo90UF.js', 'shared-120-DCdTP1_5.js'].includes(m.source));
  assert.ok(coreMods.some(m => m.bindings.some(b => b.name === 'Di')) && coreMods.some(m => m.bindings.some(b => b.name === 'u_')) && coreMods.some(m => m.bindings.some(b => b.name === 'Je')));
  for (const dir of fs.readdirSync(generated)) {
    if (dir === 'cds-core') continue;
    const mp = path.join(generated, dir, 'manifest.json');
    if (!fs.existsSync(mp)) continue;
    const other = JSON.parse(fs.readFileSync(mp, 'utf8'));
    if (other.referenceVersion !== '4.16336.0') continue;
    for (const m of other.modules ?? []) {
      const names = (m.bindings ?? []).map(b => b.name ?? b);
      if (m.source === 'shared-38-DyF0_Fim.js') assert.ok(!names.includes('Di') && !names.includes('Wi'), `${dir} also cuts shared-38 Di / Wi`);
      if (m.source === 'shared-20-DUEo90UF.js') assert.ok(!names.includes('u_') && !names.includes('f_'), `${dir} also cuts shared-20 f_ / u_`);
      if (m.source === 'shared-120-DCdTP1_5.js') assert.ok(!names.includes('Je'), `${dir} also cuts shared-120 Je`);
      // The pane frame and its tile contexts are held here and nowhere else.
      if (dir !== 'session-panels-v4' && m.source === 'c4db265df-CHyZjtsm.js') assert.ok(!names.includes('ot') && !names.includes('Tn'), `${dir} also cuts c4db265df ot / Tn`);
      if (dir !== 'session-panels-v4' && m.source === 'shared-20-DUEo90UF.js') assert.ok(!names.includes('ub'), `${dir} also cuts shared-20 ub`);
    }
    for (const m of other.modules ?? []) for (const b of m.bindings ?? [])
      if (typeof b === 'object' && b.file === 'shared-120-DCdTP1_5.js') assert.notEqual(b.name, 'Je', `${dir}/${m.target} also cuts shared-120 Je`);
  }
});

test('render: a docked end panel is data-cds="Panel" with the end seam, inset and gap; contained, region by default', () => {
  const docked = renderToStaticMarkup(h(P.CdsPanel, { side: 'end', label: 'Background tasks' }, h('div', null, 'body')));
  assert.match(docked, /^<div role="complementary" aria-label="Background tasks" data-cds="Panel" data-side="end" class="[^"]*"/);
  const cls = docked.match(/class="([^"]*)"/)[1].split(/\s+/);
  for (const c of ['relative', 'isolate', 'flex', 'flex-col', 'bg-surface-2', 'rounded-[var(--cds-panel-radius)]', '[box-shadow:var(--cds-panel-shadow)]',
    'border-s-[length:var(--cds-panel-line)]', 'border-[color:var(--cds-border-line,var(--cds-border))]',
    'my-[var(--cds-panel-inset)]', 'me-[var(--cds-panel-inset)]', 'ms-[var(--cds-panel-gap)]',
    'stacks:border-[color:var(--cds-fizzy-lake-color-seam,var(--cds-border))]']) assert.ok(cls.includes(c), c);
  assert.ok(!cls.includes('border-e-[length:var(--cds-panel-line)]'));
  // flush drops the seam, inset, gap and frame; uncontained is the page ground.
  const flush = renderToStaticMarkup(h(P.CdsPanel, { side: 'end', flush: true }));
  assert.match(flush, /data-flush=""/);
  assert.doesNotMatch(flush, /border-s-\[length:var\(--cds-panel-line\)\]|rounded-\[var\(--cds-panel-radius\)\]/);
  const free = renderToStaticMarkup(h(P.CdsPanel, { variant: 'uncontained' }));
  assert.match(free, /role="region"/);
  assert.match(free, /data-variant="uncontained"/);
  assert.match(free, /bg-page/);
  // resizable: the default width 320 and the separator on the inner (start) edge of an end panel.
  const sized = renderToStaticMarkup(h(P.CdsPanel, { side: 'end', resizable: true, label: 'Tasks' }));
  // (a contained panel's style also carries the surface's page ground and focus shadows, shared-38 Y = M(ki)).
  assert.match(sized, /data-cds="Panel"[^>]*style="--cds-page-bg:var\(--cds-surface-2\);[^"]*;width:320px"/);
  assert.ok(sized.indexOf('aria-valuenow="320"') !== -1 && sized.indexOf('aria-valuenow="320"') < sized.indexOf('data-cds="Panel"'), 'the handle comes before an end panel');
  // The label reaches the children through Di.
  const seen = [];
  const Probe = () => { seen.push(React.useContext(P.CdsPanelLabelContext)); return null; };
  renderToStaticMarkup(h(P.CdsPanel, { label: 'Files' }, h(Probe)));
  assert.deepEqual(seen, ['Files']);
});

test('wiring: the host tile engine reads the line-mode slice and f_ / p_ from cds-core and provides the pane tile contexts; the tasks pane is PaneFrame', () => {
  const src = path.join(app, 'src');
  const hits = [];
  for (const name of fs.readdirSync(src)) {
    if (!/\.(jsx?|mjs)$/.test(name)) continue;
    for (const m of fs.readFileSync(path.join(src, name), 'utf8').matchAll(/generated\/session-panels-v4\/([\w-]+\.mjs)/g)) hits.push(`${name}:${m[1]}`);
  }
  assert.deepEqual(hits.sort(), ['source-agent.jsx:pane-frame.mjs', 'source-tile-layout.jsx:pane-frame.mjs', 'source-tile-layout.jsx:tiles-line.mjs',
    'tile-line-model.mjs:tiles-line.mjs', 'tile-line-model.mjs:tiles-shell.mjs']);
  assert.match(read('src/tile-line-model.mjs'), /import \{ writer_shared20_f_ as tilesSplitConfig, writer_shared20_p_ as tilesFrameVars \} from "\.\/cds-core\.mjs";/);
  // CdsPanel is drawn only through PaneFrame (no host component imports or renders it directly).
  for (const name of fs.readdirSync(src)) if (/\.(jsx?|mjs)$/.test(name) && name !== 'cds-core.mjs') {
    const text = fs.readFileSync(path.join(src, name), 'utf8');
    assert.doesNotMatch(text, /\bCdsPanel(LabelContext|ResizeHandle)?\b.*from "\.\/cds-core\.mjs"/, `${name} renders CdsPanel`);
    assert.doesNotMatch(text, /<CdsPanel\b/, name);
  }
});

// cc43287c9 Hje provides `p(sR, {value: !0})` (c4db265df ot) and `p(lm, {value: Wf(b)})` (shared-20 ub) around a pane tile.
const inTile = (kind, child) => h(F.PaneInTileContext, { value: true }, h(L.PaneStandsOnPageContext, { value: L.paneTileStandsOnPage(kind) }, child));

test('PaneFrame in a tile: data-pane-root on the CdsPanel, the title row, trailing actions, back button; no tile-store reader', () => {
  const html = renderToStaticMarkup(inTile('tasks', h(F.PaneFrame, { title: 'Background tasks', trailing: h('button', { 'data-probe-trailing': '' }, 'T'),
    center: h('span', { 'data-probe-center': '' }), onBack() {}, style: { height: '100%' } }, h('div', { 'data-probe-body': '' }, 'body'))));
  // In a tile (Ye) the CdsPanel itself is the pane root: `n(ye, {…, role: k, side: ne, flush: A, variant: j, "data-pane-root": M,
  // ...N (te("side_pane")), …})`; no side is passed by the tile host's call, so no seam side (official).
  const root = html.match(/^<div[^>]*>/)?.[0];
  assert.match(root, /^<div role="presentation" data-pane-root="" data-perf-region="side_pane" data-cds="Panel" data-variant="uncontained" class="/);
  // fb("tasks") is true (shared-20 db `tasks:!0`): the pane stands on the page ground, Tn's variant "uncontained".
  assert.equal(L.paneTileStandsOnPage('tasks'), true);
  assert.match(root, / bg-page /);
  assert.match(root, /style="height:100%"/);
  assert.match(html, /data-cds="Toolbar" role="toolbar"/);
  assert.ok(html.indexOf('Background tasks</') > html.indexOf('data-cds="Panel"'), 'the title row is inside the panel');
  assert.match(html, /data-pane-actions=""/);
  assert.ok(html.indexOf('data-probe-trailing') > html.indexOf('Background tasks</'), 'trailing after the title');
  assert.ok(html.indexOf('data-probe-center') > 0);
  const back = html.match(/<button[^>]*aria-label="Back"[^>]*>/)?.[0];
  assert.ok(back);
  assert.match(back, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
  assert.ok(html.indexOf('data-probe-body') > html.indexOf('data-probe-trailing'));
  const seen = [];
  const Probe = () => { seen.push(React.useContext(F.PaneInTileContext)); return null; };
  renderToStaticMarkup(inTile('tasks', h(F.PaneFrame, { title: 'x' }, h(Probe))));
  assert.deepEqual(seen, [false], 'Tn resets ot for its children (`t(ot, {value: !1, …})`)');
});

test('PaneFrame outside a tile (no tile host): the floating panel card around a flush CdsPanel', () => {
  // Tn r branch (`!Ye`): the panel is flush and presentation-only inside the `panel` surface card (data-surface tn).
  const html = renderToStaticMarkup(h(F.PaneFrame, { title: 'Background tasks' }, h('div', null, 'body')));
  assert.match(html, /^<div data-cds="Surface" data-surface="panel" data-pane-root="" data-perf-region="side_pane" class="rounded-card bg-surface-2 shadow-panel-sm /);
  assert.match(html, /<div role="presentation" data-cds="Panel" data-flush="" data-variant="uncontained"/);
  assert.match(html, /aria-label="Background tasks controls"/);
});

test('D-SP-1 boundary: the official session tile store has no host answer and says so', () => {
  assert.throws(() => Ad.usePaneTileStoreSelector(() => 0), /official session tile store/);
  assert.match(read('src/session-panels-v4-adapter.mjs'), /^export \{ useHostIntl, HostFormattedMessage \} from '\.\/cds-core-adapter\.mjs';$/m);
});

test('SP-2: the Background tasks pane renders through PaneFrame', () => {
  const props = { state: { items: {} }, sessionId: 's', onBack() {}, onClose() {}, onLoad: async () => {}, renderItem: () => null };
  // (no background list here: its Clear finished tasks control subscribes a host store SSR cannot snapshot)
  const list = renderToStaticMarkup(inTile('tasks', h(A.SourceTasksPane, { ...props, views: [],
    headerCenter: h('span', { 'data-probe-handle': '' }), controls: h('div', { 'data-probe-controls': '' }) })));
  assert.match(list, /^<div role="presentation" data-pane-root="" data-perf-region="side_pane" data-cds="Panel" data-variant="uncontained"[^>]*style="height:100%"/);
  assert.match(list, /aria-label="Background tasks controls"/);
  assert.doesNotMatch(list, /<aside|source-pane-header|sag-pane/);
  assert.ok(list.indexOf('data-probe-controls') > list.indexOf('Background tasks</'));
  assert.ok(list.indexOf('data-probe-handle') > list.indexOf('data-probe-controls'), 'Tn: center after the toolbar');
  assert.ok(list.indexOf('No activity yet') > list.indexOf('data-probe-handle'));
  const view = renderToStaticMarkup(inTile('tasks', h(A.SourceTasksPane, { ...props, views: [{ kind: 'subagent', threadId: 't', toolId: 'x', description: 'Agent' }] })));
  assert.match(view, /<button[^>]*aria-label="Back"/);
  assert.match(view, />Agent</);
  const source = read('src/source-agent.jsx');
  assert.match(source, /<PaneFrame style=\{PANE_FRAME_STYLE\} leadingClearance=\{leadingClearance\} title=\{current\?\.description \|\| t\('Background tasks'\)\}/);
  assert.match(source, /center=\{headerCenter\} trailing=\{trailing\(controls\)\} onEscapeClose=\{onClose\}/);
  assert.doesNotMatch(source, /tileId=|paneLayout=|onPopOut=/);
  assert.doesNotMatch(source, /onKeyDown=\{event=>\{\s*if\(event\.key==='Escape'/, 'one Escape path');
});
