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
import { extractComposerNoticesV4, ROOTS, LINKED_ROOTS, HOST_ADAPTERS, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-composer-notices-v4.mjs';

// account2 batch 5, region composer-notices: the 4.16336.0 composer notice stack, the Code notice slot table and the band
// row (scripts/extract-composer-notices-v4.mjs -> src/generated/composer-notices-v4, staged next to the 3.6556.2
// src/generated/composer-notices the host still renders). Source only: manifest, the generator's --check, the official
// chunk text, D1 links, and SSR of the stack through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/composer-notices-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

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
  assert.equal(manifest.generator, 'scripts/extract-composer-notices-v4.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['code-composer-v4', 'cowork-scheduled-v4', 'files-changes-v4', 'session-rail-kit-v4']);
  assert.deepEqual(LINKED_AREAS, manifest.linkedAreas);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  assert.deepEqual(manifest.modules.map(m => `${m.target}<-${m.source}`), [
    'composer-notices.mjs<-shared-26-B-POtn5S.js', 'shared-1.mjs<-shared-1-D1bGaTaN.js', 'code-notice-slots.mjs<-c227f4d5e-DGDdGBTz.js', 'code-band-row.mjs<-shared-6-2QYRw_Wv.js']);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractComposerNoticesV4({ check: true });
});

test('roots: the 3.6556.2 graph\'s semantic names, AST-located and pinned on 4.16336.0', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}/${r.export}<-${r.previous.replace(/-[\w-]{8}\.js#/, '#')}`), [
    'shared-26-B-POtn5S.js#bH=ChatComposerNotices/li<-shared-26#RM',
    'c227f4d5e-DGDdGBTz.js#iR=CodeNoticeSlotsProvider/Oa<-c227f4d5e#cI', 'c227f4d5e-DGDdGBTz.js#oR=useCodeNoticeSlot/Aa<-c227f4d5e#uI',
    'c227f4d5e-DGDdGBTz.js#XL=CodeNoticeRegionContext/Ma<-c227f4d5e#eI', 'c227f4d5e-DGDdGBTz.js#ZL=useInCodeNoticeRegion/Na<-c227f4d5e#tI',
    'c227f4d5e-DGDdGBTz.js#uR=useCodeNoticeSlotEntries/ka<-c227f4d5e#mI', 'c227f4d5e-DGDdGBTz.js#$L=CODE_NOTICE_SLOT_ORDER/Da<-c227f4d5e#rI',
    'c227f4d5e-DGDdGBTz.js#OV=useScopeStoreNotice/fi<-c227f4d5e#pY', 'c227f4d5e-DGDdGBTz.js#wV=TURN_TAIL_NOTICE_PLACEMENT/ci<-c227f4d5e#lY',
    'c227f4d5e-DGDdGBTz.js#TV=tailSessionNotice/di<-c227f4d5e#uY', 'shared-6-2QYRw_Wv.js#nv=CodeBandRow/xa<-shared-6#kT',
    'shared-26-B-POtn5S.js#uH=ChatComposerBand/ui<-shared-26#kM']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    const spec = ROOTS[r.file]?.[r.local] ?? LINKED_ROOTS[`${r.file}#${r.local}`];
    assert.ok(official(r.file).includes(spec.probe), `${r.file}#${r.local} probe`);
  }
  // Every name of the 3.6556.2 graph is answered.
  const old = local('src/generated/composer-notices/composer-notices.mjs') + local('src/generated/composer-notices/code-notice-slots.mjs') + local('src/generated/composer-notices/code-band-row.mjs');
  const oldNames = [...old.matchAll(/export \{([^}]*)\}/g)].flatMap(m => m[1].split(',')).map(s => s.trim().split(/\s+as\s+/)[1]).filter(n => n && /^[A-Z]|^use|^tail/.test(n));
  for (const n of oldNames) assert.notEqual(gen[n], undefined, n);
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
});

test('linked root: ChatComposerBand is cowork-scheduled-v4\'s slice of shared-26 uH (over cds-core Mp), re-exported, not cut again', () => {
  assert.deepEqual(provenance.linkedRoots.map(r => `${r.original}=${r.name}@${r.area}/${r.module}`), ['shared-26-B-POtn5S.js#uH=ChatComposerBand@cowork-scheduled-v4/shared-26-B-POtn5S.mjs']);
  assert.match(local(`${out}/index.mjs`), /export \{ uH as ChatComposerBand \} from "\.\.\/cowork-scheduled-v4\/shared-26-B-POtn5S\.mjs";/);
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.ok(!own.includes('shared-26-B-POtn5S.js#uH'));
  const scheduled = local('src/generated/cowork-scheduled-v4/shared-26-B-POtn5S.mjs');
  assert.match(scheduled, /import \{[^}]*\bMp\b[^}]*\} from "\.\.\/cds-core\/shared-26\.mjs";/);
  assert.match(scheduled, /e = x\(Mp\)\.startInset,/);
  // The band row reads that same band.
  const row = manifest.modules.find(m => m.target === 'code-band-row.mjs');
  assert.ok(row.imports.some(i => i.kind === 'linked' && i.from === '../cowork-scheduled-v4/shared-26-B-POtn5S.mjs' && i.name === 'uH'));
  assert.equal(typeof gen.ChatComposerBand, 'function');
});

test('no host boundary: no adapter import; the session scope read is the original over cds-core hB', () => {
  assert.deepEqual(Object.keys(HOST_ADAPTERS), []);
  assert.deepEqual(provenance.adapters, []);
  for (const m of manifest.modules) assert.ok(!m.imports.some(i => i.kind === 'adapter'), m.target);
  const s1 = local(`${out}/shared-1.mjs`);
  assert.match(s1, /import \{ hB \} from "\.\.\/cds-core\/shared-1\.mjs";/);
  assert.match(s1, /return ud\(E\(hB\), yB\);/);
  // The visible-zone registry hook is cowork-scheduled-v4's slice (D1), the other-window read session-rail-kit-v4's.
  const slots = manifest.modules.find(m => m.target === 'code-notice-slots.mjs');
  assert.ok(slots.imports.some(i => i.local === 'Yc' && i.kind === 'linked' && i.from === '../cowork-scheduled-v4/shared-2-CsjIBQD8.mjs' && i.name === 'Kq'));
  assert.ok(slots.imports.some(i => i.local === 'ge' && i.kind === 'linked' && i.from === '../session-rail-kit-v4/shared-frame-CJdE5Ria.mjs' && i.name === 'ho'));
});

test('D1: bindings the linked areas or cds-core hold are imported, never cut again; the slot contexts are this graph\'s own', () => {
  const held = new Map();
  for (const area of [...manifest.linkedAreas, 'cds-core']) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), []);
  for (const area of manifest.linkedAreas) assert.ok(manifest.modules.some(m => m.imports.some(i => i.kind === 'linked' && i.from.split('/')[1] === area)), `links ${area}`);
  const slots = local(`${out}/code-notice-slots.mjs`);
  for (const decl of ['eR = new Map()', 'tR = F(null)', 'nR = F(eR)', 'rR = F(null)', 'XL = F(!1)']) assert.equal(slots.split(decl).length - 1, 1, decl);
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'composer-notices-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const mod of m.modules ?? []) {
      if (path.basename(mod.source ?? '') !== 'c227f4d5e-DGDdGBTz.js') continue;
      const names = (mod.bindings ?? []).map(b => typeof b === 'string' ? b : b.name);
      for (const n of ['eR', 'tR', 'nR', 'rR', 'XL', 'iR', 'oR', 'uR']) assert.ok(!names.includes(n), `${dir} ${n}`);
    }
  }
});

test('the slot table and the tail pick follow the official text', () => {
  assert.deepEqual(gen.CODE_NOTICE_SLOT_ORDER, ['ops', 'paused', 'environment', 'acorn', 'credits', 'workflow', 'limit', 'tokenLimit', 'refusal', 'sleep', 'keptAwake',
    'bridge', 'hostSandbox', 'repository', 'credentialNudge']);
  assert.ok(official('c227f4d5e-DGDdGBTz.js').includes('$L=["ops","paused","environment","acorn","credits","workflow","limit","tokenLimit","refusal","sleep","keptAwake","bridge","hostSandbox","repository","credentialNudge"]'));
  assert.deepEqual(gen.TURN_TAIL_NOTICE_PLACEMENT, { placement: 'turn_tail' });
  const n = name => ({ name });
  assert.equal(gen.tailSessionNotice({ sleepNotice: null, pausedNotice: n('p'), refusalFallbackNotice: n('r'), keepAwakeNotice: null, newerModelNotice: null }).name, 'p');
  assert.equal(gen.tailSessionNotice({ sleepNotice: n('s'), pausedNotice: n('p'), refusalFallbackNotice: null, keepAwakeNotice: null, newerModelNotice: null }).name, 's');
  assert.equal(gen.tailSessionNotice({ sleepNotice: null, pausedNotice: null, refusalFallbackNotice: null, keepAwakeNotice: null, newerModelNotice: null }), undefined);
});

test('SSR: the stack renders the polite live region with a CDS banner and a custom item; the region flag and the band row render', () => {
  const items = [
    { key: 'a', content: { kind: 'banner', tone: 'warning', copy: 'Fixture banner copy' }, dismissible: true },
    { key: 'b', content: { render: ({ leaving }) => h('span', { 'data-fixture': 'custom' }, leaving ? 'leaving' : 'Fixture custom row') } },
    { key: 'c', content: { kind: 'banner', copy: '   ' } },
  ];
  const html = renderToStaticMarkup(h(gen.ChatComposerNotices, { items, onDismiss() {}, 'data-testid': 'notices-fixture' }));
  assert.match(html, /data-cds="ChatComposerNotices"/);
  assert.match(html, /data-cds-dock-group=""/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /data-testid="notices-fixture"/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="false"/);
  assert.match(text(html), /Fixture banner copy/);
  assert.match(html, /data-fixture="custom"/);
  assert.match(text(html), /Fixture custom row/);
  assert.doesNotMatch(html, /leaving/);
  // A blank banner copy is dropped (aH).
  assert.equal((html.match(/data-cds="Banner"/g) ?? []).length, 1);

  const Probe = () => h('span', null, String(gen.useInCodeNoticeRegion()));
  assert.equal(renderToStaticMarkup(h(Probe)), '<span>false</span>');
  assert.equal(renderToStaticMarkup(h(gen.CodeNoticeRegionContext.Provider, { value: true }, h(Probe))), '<span>true</span>');
  const Entries = () => { const { entries } = gen.useCodeNoticeSlotEntries(); return h('span', null, String(entries.size)); };
  assert.equal(renderToStaticMarkup(h(gen.CodeNoticeSlotsProvider, { session: 's1' }, h(Entries))), '<span>0</span>');

  const row = renderToStaticMarkup(h(gen.CodeBandRow, { wordsClassName: 'fixture-words' }, 'Fixture band words'));
  assert.match(row, /<span aria-atomic="true" class="fixture-words">Fixture band words<\/span>/);
  assert.match(row, /data-cds="Banner"/);
});
