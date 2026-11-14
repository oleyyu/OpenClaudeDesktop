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
import { extractUsageCountdownV4, ROOTS, HOST_ADAPTERS, COUNTDOWN, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256, BAND } from '../scripts/extract-usage-countdown-v4.mjs';

// account2 prestage, region usage-countdown: the 4.16336.0 usage reset countdown (scripts/extract-usage-countdown-v4.mjs ->
// src/generated/usage-countdown-v4, staged next to the 3.6556.2 src/generated/usage-countdown the host still renders).
// Source only: manifest, the generator's --check, the official chunk text (read, never run), D1 links, and SSR of the
// countdown through Vite. No window, no GUI.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const out = 'src/generated/usage-countdown-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const areaName = a => (typeof a === 'string' ? a : a.area);

let server, gen, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
});
after(async () => { I18n?.setLocale('en-US'); await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-usage-countdown-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-usage-countdown-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(areaName), ['routines-shared-v4']);
  assert.deepEqual(LINKED_AREAS, ['routines-shared-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const area of LINKED_AREAS)
    assert.equal(provenance.linkedAreas[area], sha(fs.readFileSync(path.join(app, `src/generated/${area}/manifest.json`))), area);
  assert.deepEqual(manifest.modules.map(m => m.target), ['usage-countdown.mjs']);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractUsageCountdownV4({ check: true });
});

test('roots: the 3.6556.2 public names, AST-located in 4.16336.0 and pinned; the card context is xQ, not the plan\'s uD', () => {
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  const old = JSON.parse(local('src/generated/usage-countdown/manifest.json')).modules.find(m => m.target === 'usage-countdown.mjs');
  assert.deepEqual(provenance.roots.map(r => r.name).sort(), Object.values(old.exports).sort(), 'the same public names as the 3.6556.2 graph');
  assert.deepEqual(manifest.modules[0].exports, { SQ: 'UsageResetCountdown', xQ: 'UsageNoticeCardContext' });
  const band = official(BAND);
  // SQ reads xQ; the usage limit card provides xQ; uD (the plan's shape-equal candidate) is the pull-request view context.
  for (const needle of ['var xQ=F(!1);function SQ(e){let $=J9(9);if(!I(xQ))return J1($,0,e)?K1($,0,e,p(CQ,{...e})):$[1];',
    '_(xQ.Provider,{value:!0,children:[D,O]})', 'lt=je?p(SQ,{resetsAtSeconds:je,absolute:XQ(je,m)}):void 0', 'uD=F(!1);function dD(){', 'p(uD.Provider,{value:s,children:c})'])
    assert.equal(count(band, needle), 1, needle);
  assert.equal(count(band, 'I(uD)'), 1);
  assert.equal(count(band, 'xQ.Provider'), 1);
  assert.equal(provenance.disambiguation.UsageNoticeCardContext.chosen, `${BAND}#xQ`);
  // The countdown body: absolute text until the minute clock passes the reset, then Resetting… (no per-second store).
  const text = local(`${out}/usage-countdown.mjs`);
  for (const f of COUNTDOWN.features) assert.ok(text.includes(f), f);
  assert.ok(!text.includes('Resets in'), 'no per-second "Resets in" copy in 4.16336.0');
  assert.ok(text.includes('export { SQ as UsageResetCountdown, xQ as UsageNoticeCardContext };'));
  assert.equal(manifest.callSites.length, 2);
  assert.ok(manifest.callSites.every(c => c.raw && c.source === BAND));
});

test('host boundary: FormattedMessage pinned, re-exported from the 3.6556.2 graph\'s adapter module', () => {
  assert.deepEqual(provenance.adapters.map(a => a.original), Object.keys(HOST_ADAPTERS));
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.match(local('src/source-usage-countdown-v4-adapters.jsx'), /^export \{ FormattedMessage \} from "\.\/source-usage-countdown-adapters\.jsx";$/m);
  const imports = manifest.modules[0].imports;
  assert.deepEqual(imports.filter(i => i.kind === 'adapter').map(i => [i.local, i.name, i.original]), [['Q', 'FormattedMessage', 'Gt']]);
});

test('D1: the minute clock and compiler cache come from routines-shared-v4; only xQ / SQ / CQ are cut, and no other graph holds them', () => {
  const imports = manifest.modules[0].imports;
  const ua = imports.find(i => i.local === 'Ua');
  assert.deepEqual([ua.kind, ua.from, ua.name], ['linked', '../routines-shared-v4/shared-183-B2N6Zy4J.mjs', '_J']);
  for (const i of imports) assert.ok(['react', 'linked', 'adapter', 'shared-graph'].includes(i.kind), `${i.local}: ${i.kind}`);
  assert.deepEqual(manifest.modules[0].bindings.map(b => (typeof b === 'string' ? b : b.name)).sort(), ['CQ', 'SQ', 'xQ']);
  const generated = path.join(app, 'src/generated');
  for (const dir of fs.readdirSync(generated)) {
    if (dir === 'usage-countdown-v4') continue;
    const mp = path.join(generated, dir, 'manifest.json');
    if (!fs.existsSync(mp)) continue;
    const other = JSON.parse(fs.readFileSync(mp, 'utf8'));
    for (const mod of Array.isArray(other.modules) ? other.modules : []) {
      if (mod.source !== BAND) continue;
      const names = (mod.bindings ?? []).map(b => (typeof b === 'string' ? b : b?.name));
      for (const n of ['xQ', 'SQ', 'CQ']) assert.ok(!names.includes(n), `${dir}/${mod.target} also cuts ${n}`);
    }
  }
});

test('SSR: outside a notice card the countdown alone; inside one the countdown aria-hidden plus the absolute text sr-only', () => {
  const now = Date.now() / 1000;
  const C = gen.UsageResetCountdown;
  // Reset passed on the minute clock: Resetting…, aria-live off outside a card.
  assert.equal(renderToStaticMarkup(h(C, { resetsAtSeconds: now - 600, absolute: 'Resets at 10:30 AM' })), '<span aria-live="off">Resetting…</span>');
  // Not yet: the absolute text (4.16336.0 has no per-second countdown).
  assert.equal(renderToStaticMarkup(h(C, { resetsAtSeconds: now + 1800, absolute: 'Resets at 10:30 AM' })), 'Resets at 10:30 AM');
  const card = node => renderToStaticMarkup(h(gen.UsageNoticeCardContext.Provider, { value: true }, node));
  assert.equal(card(h(C, { resetsAtSeconds: now + 1800, absolute: 'Resets at 10:30 AM' })),
    '<span aria-hidden="true">Resets at 10:30 AM</span><span class="sr-only">Resets at 10:30 AM</span>');
  // Inside a card the ticking text carries no aria-live.
  assert.equal(card(h(C, { resetsAtSeconds: now - 600, absolute: 'Resets at 10:30 AM' })),
    '<span aria-hidden="true"><span>Resetting…</span></span><span class="sr-only">Resets at 10:30 AM</span>');
  I18n.setLocale('zh-CN');
  try {
    assert.equal(renderToStaticMarkup(h(C, { resetsAtSeconds: now - 600, absolute: 'x' })), '<span aria-live="off">正在重置…</span>');
  } finally { I18n.setLocale('en-US'); }
});
