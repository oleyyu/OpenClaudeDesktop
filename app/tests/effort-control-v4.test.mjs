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
import { extractEffortControlV4, ROOTS, HOST_ADAPTERS, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-effort-control-v4.mjs';

// Round 2, unit effort-control: the 4.16336.0 effort popover (c8e04f916 S, exported EffortControl) and the composer's
// slider overlays (c227f4d5e Zz / Qz / $z) (scripts/extract-effort-control-v4.mjs -> src/generated/effort-control-v4,
// staged next to the 3.6556.2 src/generated/effort-control the host still renders). Source only: manifest, the
// generator's --check, the official chunk text, D1 links, no second React, and SSR through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/effort-control-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

let server, gen, slider;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  slider = await server.ssrLoadModule(`/${out}/slider.mjs`);
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-effort-control-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-effort-control-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['code-composer-v4', 'session-rail-kit-v4', 'cowork-scheduled-v4', 'transcript-rows-v4']);
  assert.deepEqual(manifest.linkedAreas, LINKED_AREAS);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, pinned] of Object.entries(provenance.linkedAreas))
    assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), pinned, area);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  // W8S-T4 (W8S-M9): value-percent.mjs (c7b39e598) left with cds-core wave 8s, which holds that chunk (wave 8: listed here).
  // wave 8a (R4-K1): rolldown-runtime.mjs left too: vendor-frame c = e(i()) (the only reader of rolldown-runtime l here) is the
  // cds-core publicName identity_vendorframe_c, linked from cds-core (wave 8s: 'rolldown-runtime.mjs' listed after 'number-format.mjs').
  assert.deepEqual(manifest.modules.map(m => m.target).sort(), ['effort-control.mjs', 'lit-overlay.mjs', 'number-format.mjs',
    'shared-frame.mjs', 'slider-parts.mjs', 'slider.mjs', 'vendor-frame.mjs']);
  await extractEffortControlV4({ check: true });
});

test('staged double output: the 3.6556.2 effort-control graph stays as it was (its own generator, version and roots)', () => {
  const old = JSON.parse(local('src/generated/effort-control/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  assert.equal(old.generator, 'scripts/extract-effort-control.mjs');
  assert.deepEqual(provenance.previous, { generator: 'scripts/extract-effort-control.mjs', output: 'src/generated/effort-control', referenceVersion: '3.6556.2',
    roots: { 'c8e04f916-39YFkTtR.js#S': 'EffortControl', 'c227f4d5e-B-FYKrwT.js#P$': 'EffortSliderOverlay' } });
  // Round 3 relink rl-composer S4 switched the host to this graph (round2/effort-control/patches/source-composer-effort-v4.patch);
  // the 3.6556.2 graph above stays byte for byte for its own tests, and the host no longer imports it.
  assert.ok(local('src/source-composer.jsx').includes('import { EffortControl as OfficialEffortControl, EffortSliderOverlay } from "./generated/effort-control-v4/index.mjs";'));
  assert.ok(!local('src/source-composer.jsx').includes('from "./generated/effort-control/'));
});

test('roots: AST-located and pinned; S is the chunk export EffortControl, the overlays are chunk-internal', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`), [
    'c8e04f916-DxnnNQyG.js#S=EffortControl', 'c227f4d5e-DGDdGBTz.js#Zz=EffortSliderOverlay',
    'c227f4d5e-DGDdGBTz.js#Qz=EffortSliderOverlayLit', 'c227f4d5e-DGDdGBTz.js#$z=EffortSliderOverlayUnlit']);
  assert.ok(provenance.roots.every(r => r.pinned));
  assert.deepEqual(provenance.roots.map(r => r.export), ['EffortControl', null, null, null]);
  for (const r of provenance.roots) {
    assert.equal(official(r.file).split(ROOTS[r.file][r.local].probe).length - 1, 1, `${r.file}#${r.local} probe`);
    assert.equal(typeof gen[r.name] === 'function' || typeof gen[r.name] === 'object', true, r.name);
  }
  // shared-7 FI loads S lazily (II the fallback), aL feeds it; rB picks the overlay (3.6556.2 R$: only P$ by ultracode).
  const s7 = official('shared-7-D2e77H6v.js'), c227 = official('c227f4d5e-DGDdGBTz.js');
  assert.equal(s7.split('FI=P(()=>_(()=>import("./c8e04f916-DxnnNQyG.js").then(e=>({default:e?.EffortControl??II})').length - 1, 1);
  assert.equal(c227.split('me=F?v?v.on?Qz:$z:void 0:qf(fe?.thinking?.effort_options?.at(-1)?.id)?Zz:void 0').length - 1, 1);
  assert.deepEqual(manifest.callSites.map(c => `${c.source}${c.binding ? '#' + c.binding : ' (raw)'}`), [
    'shared-7-D2e77H6v.js#aL', 'c227f4d5e-DGDdGBTz.js#rB', 'c227f4d5e-DGDdGBTz.js (raw)', 'shared-7-D2e77H6v.js (raw)']);
});

test('host boundaries: only vendor-frame\'s CommonJS React loader and JSX runtime, re-exported from cds-core-adapter', () => {
  // wave 8a (R4-K1): vendor-frame i (loadHostReact) left: its one reader c = e(i()) is cds-core's identity_vendorframe_c now
  // (was: ['vendor-frame-BckkO60Y.js#i=loadHostReact', 'vendor-frame-BckkO60Y.js#ce=hostJsxRuntime']).
  assert.deepEqual(provenance.adapters.map(a => `${a.original}=${a.name}`), ['vendor-frame-BckkO60Y.js#ce=hostJsxRuntime']);
  // The React namespace this graph reads from vendor-frame is cds-core's own binding, never a copy.
  assert.ok(!manifest.modules.some(m => m.source === 'vendor-frame-BckkO60Y.js' && m.bindings.some(b => b.name === 'c')), 'vendor-frame c is not cut here');
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-effort-control-v4-adapters.jsx');
  const adapterText = local('src/source-effort-control-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]), ['./cds-core-adapter.mjs']);
  // No second React: vendor-frame's bundled React / JSX runtime are never copied.
  for (const mod of manifest.modules) assert.doesNotMatch(local(`${out}/${mod.target}`), /react\.transitional\.element|__CLIENT_INTERNALS|e\.version = "19/, mod.target);
});

test('D1: bindings the linked areas and cds-core hold are imported from them, never cut again', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) {
      const tabled = mod.exports !== undefined || mod.linkExports !== undefined || mod.sharedExports !== undefined;
      for (const b of mod.bindings ?? []) {
        const name = typeof b === 'string' ? b : b.name;
        const exported = !tabled || mod.exports?.[name] !== undefined || mod.linkExports?.includes(name) || mod.sharedExports?.includes(name);
        if (exported) held.set(`${path.basename(mod.source)}#${name}`, area);
      }
    }
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area exports is cut again');
  assert.deepEqual(provenance.linkedCopies, {});
  // The stateful owners the plan names: presence motion (code-composer-v4), reduced motion / mode / preview card (cds-core).
  const ec = local(`${out}/effort-control.mjs`), lit = local(`${out}/lit-overlay.mjs`);
  assert.ok(ec.includes('import { presenceMotion as ae } from "../code-composer-v4/chat-composer-presence.mjs";'));
  assert.ok(ec.includes('import { CdsPreviewCard as h } from "../cds-core/shared-183.mjs";'));
  assert.match(ec, /useCdsPrefersReducedMotion as ne,/);
  assert.match(lit, /useCdsMode as W,/);
  assert.ok(lit.includes('import { useEventCallback as ut } from "../cds-core/shared-0.mjs";'));
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  assert.deepEqual([...linked].sort(), [...LINKED_AREAS].sort(), 'every linked area is used');
});

test('SSR: EffortControl renders the official ghost trigger; the popover reads its label', () => {
  const html = renderToStaticMarkup(h(gen.EffortControl, { options: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], activeEffortId: 'low', effortLabel: 'Effort', onPickEffort: async () => true }));
  assert.match(html, /data-cds="ModelSelectorEffort"/);
  assert.match(html, /aria-label="Effort: Low"/);
  const trigger = h('span', { 'data-effort-anchor': '' });
  const viaTrigger = renderToStaticMarkup(h(gen.EffortControl, { options: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], activeEffortId: 'high', effortLabel: 'Effort', renderTrigger: trigger, tooltip: false, onPickEffort: async () => true }));
  assert.match(viaTrigger, /^<span data-effort-anchor=""[^>]*aria-haspopup="dialog"[^>]*data-cds="ModelSelectorEffort" aria-label="Effort: High"/);
});

test('SSR: the overlays are Fz over Pz (bg-surface-3 / bg-alpha-2); Zz follows atMax, Qz always lit, $z never', () => {
  const html = (C, props) => renderToStaticMarkup(h(C, props));
  assert.match(html(gen.EffortSliderOverlay, { atMax: false }), /^<span class="epitaxy-root text-body text-primary break-words contents"><span class="absolute inset-0 bg-surface-3 opacity-0"[^>]*><span class="absolute inset-0 bg-alpha-2"><\/span>/);
  assert.match(html(gen.EffortSliderOverlay, { atMax: true }), /class="absolute inset-0 bg-surface-3 opacity-100"/);
  assert.match(html(gen.EffortSliderOverlayLit, {}), /class="absolute inset-0 bg-surface-3 opacity-100"/);
  assert.match(html(gen.EffortSliderOverlayUnlit, {}), /class="absolute inset-0 bg-surface-3 opacity-0"/);
  const s = renderToStaticMarkup(h(slider.y, { value: 2, min: 0, max: 2, step: 1, showStops: true, mark: { value: 1, label: 'Default' },
    overlay: h(gen.EffortSliderOverlay, { atMax: true }), 'aria-label': 'Effort', getAriaValueText: index => ['Low', 'High (Default)', 'Ultracode'][index] }));
  assert.match(s, /data-cds="Slider"/);
  assert.match(s, /data-slider-overlay=""/);
  assert.match(s, /bg-surface-3 opacity-100/);
  assert.match(s, />Default</);
  assert.match(s, /aria-valuetext="Ultracode"/);
});
