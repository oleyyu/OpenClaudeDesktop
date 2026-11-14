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
import { extractPierreChangesV4, ROOTS, PENDING_ROOTS, HOST_ADAPTERS, LINKED_AREA_NAMES, CDS_CORE_MANIFEST_SHA256, STEPS } from '../scripts/extract-pierre-changes-v4.mjs';

// Round 2, unit pierre-changes: the 4.16336.0 Pierre Changes body roots (scripts/extract-pierre-changes-v4.mjs ->
// src/generated/pierre-changes-v4, staged next to the 3.6556.2 src/generated/pierre-changes the host still renders).
// Source checks (manifest, --check, pins, held roots, adapters, D1, the official text) and SSR of the cut roots.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/pierre-changes-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const C44 = 'c44d00c7f-DNez7133.js', CC89 = 'cc8941b7b-C4hsxbbb.js';

// The same DOM stand-ins as tests/session-rail-changes-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

// The path sort the comparison entries use (shared-39 Eg / Dg) links frame-sidebar-nav shared-39.mjs (D1 owner). Until
// cds-core wave 7 that module did not evaluate in an isolated load (its zod chain lacked the official __zod_globalConfig
// initializer and wrote the cds-core import binding Me), so the SSR tests were todo on exactly that error. Wave 7 (W7-D2)
// fixed it: the graph loads in isolation, and a load failure now fails every SSR test (round 3, rl-queued-bar-pierre).
let server, gen, genError;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  try { gen = await server.ssrLoadModule(`/${out}/index.mjs`); } catch (error) { genError = error; }
});
after(async () => { await closeWhenSettled(server); await server.close(); });
const ssr = () => {
  assert.equal(genError, undefined, `the pierre-changes-v4 index (with frame-sidebar-nav shared-39.mjs) evaluates in isolation: ${String(genError?.message).slice(0, 200)}`);
  return true;
};

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-pierre-changes-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-pierre-changes-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(a => typeof a === 'string' ? a : a.area), LINKED_AREA_NAMES);
  assert.deepEqual(provenance.steps, STEPS);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  // wave 7: c761aa8b9 Kn is session-rail-changes-v4's (it cuts and exports it): linked from there, not cut here
  assert.deepEqual(manifest.modules.map(m => m.target).sort(), ['pierre-cd14a8022.mjs', 'pierre-changes.mjs', 'pierre-shared-39.mjs']);
  assert.ok(manifest.modules.some(m => m.imports.some(i => i.kind === 'linked' && i.name === 'Kn' && /session-rail-changes-v4\/c761aa8b9\.mjs$/.test(i.from))), 'Kn is imported from session-rail-changes-v4');
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractPierreChangesV4({ check: true });
});

test('roots: semantic names AST-located and pinned; the 3.6556.2 counterparts; held roots located but not emitted', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file.replace(/-[\w-]{8}\.js$/, '')}#${r.local}=${r.name}${r.exports.length ? `/${r.exports.join(',')}` : ''}${r.sliced ? '' : ' (held)'}`), [
    'c44d00c7f#fo=PierreChangesFileHeader', 'c44d00c7f#Ff=pierreChangesMessages', 'c44d00c7f#ca=comparisonFileEntries/C', 'c44d00c7f#Ql=useDiffFetchScheduler',
    'c44d00c7f#ud=DiffImageViewerContext', 'c44d00c7f#dd=DiffImageViewerShownContext', 'c44d00c7f#fd=DiffImageViewerProvider/s',
    'c44d00c7f#Cp=PierreChanges (held)', 'c44d00c7f#Kl=PierreChangesCommentCard (held)',
    'cc8941b7b#I=useDiffAnnotationStore/q (held)', 'cc8941b7b#L=diffAnnotationActions/N (held)', 'cc8941b7b#j=diffAnnotationKey/H (held)',
    'cc8941b7b#M=isFileAnnotationKey/R (held)', 'cc8941b7b#at=useFileAnnotations/Q (held)', 'cc8941b7b#Kt=useFileAnnotationDrafts/$ (held)',
    'cc8941b7b#F=prCommentBodiesStore/J (held)']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  assert.deepEqual(Object.fromEntries(provenance.roots.filter(r => r.previous).map(r => [r.name, r.previous.replace(/-[\w-]{8}\.js#/, '#')])), {
    PierreChangesFileHeader: 'c44d00c7f#Zu', pierreChangesMessages: 'c44d00c7f#lu', comparisonFileEntries: 'c44d00c7f#mi', useDiffFetchScheduler: 'c44d00c7f#Vc',
    DiffImageViewerContext: 'c44d00c7f#Yc', DiffImageViewerShownContext: 'c44d00c7f#Xc', PierreChanges: 'c44d00c7f#Ju', PierreChangesCommentCard: 'c44d00c7f#Fc',
    useDiffAnnotationStore: 'cc8941b7b#F', diffAnnotationActions: 'cc8941b7b#I', diffAnnotationKey: 'cc8941b7b#k', isFileAnnotationKey: 'cc8941b7b#A',
    useFileAnnotations: 'cc8941b7b#Ie', useFileAnnotationDrafts: 'cc8941b7b#St' });
  // The two image viewer contexts are told apart from their shape family by their one provider (fd).
  for (const name of ['DiffImageViewerContext', 'DiffImageViewerShownContext']) assert.match(provenance.roots.find(r => r.name === name).constraint, /^imageViewerProvider:/);
  // The call site the host follows: the Changes pane Dm mounts Cp under `mt`, with the scheduler Ql(sessionId).
  assert.deepEqual(provenance.callSites.map(c => `${c.file}#${c.local}<-${c.previous}`), [`${C44}#Dm<-c44d00c7f-Cr1FDL2F.js#Jd`]);
  assert.ok(provenance.callSites.every(c => c.pinned));
  const index = local(`${out}/index.mjs`);
  for (const r of provenance.roots) assert.equal(new RegExp(`\\b${r.name}\\b`).test(index), r.sliced, r.name);
});

test('held roots: what each waits for is recorded and re-checked (cds-core writers; wave 7: frame-sidebar-nav shared-212 Pv / Av / vv unexported)', () => {
  assert.deepEqual(Object.keys(PENDING_ROOTS).sort(), [`${C44}#Cp`, `${C44}#Kl`, ...['I', 'L', 'j', 'M', 'at', 'Kt', 'F'].map(l => `${CC89}#${l}`)].sort());
  assert.deepEqual(provenance.pendingRoots.map(p => p.root).sort(), Object.keys(PENDING_ROOTS).sort());
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  const published = new Set(Object.values(cds.publicNames).map(v => `${v.file}#${v.local}`));
  // Cp still waits for the two cds-core writers; wave 7 published the ce311b43f counters the store roots waited for
  for (const writer of Object.keys(PENDING_ROOTS[`${C44}#Cp`].cdsCoreWriters)) assert.ok(!published.has(writer), `cds-core does not publish ${writer} yet`);
  for (const k of ['ce311b43f-CaHZaaO5.js#a', 'ce311b43f-CaHZaaO5.js#o', 'ce311b43f-CaHZaaO5.js#de']) assert.ok(published.has(k), `cds-core publishes ${k}`);
  for (const p of Object.values(PENDING_ROOTS)) assert.equal(p.foreignOwners, undefined);
  // the hold that remains: frame-sidebar-nav slices shared-212 Pv / Av / vv without exporting them
  const fsn = JSON.parse(local('src/generated/frame-sidebar-nav/manifest.json'));
  const m212 = fsn.modules.find(m => /shared-212-BHMAi0oa\.js$/.test(m.source));
  for (const l of ['Pv', 'Av', 'vv']) {
    assert.ok(m212.bindings.some(b => (typeof b === 'string' ? b : b.name) === l), `frame-sidebar-nav slices shared-212 ${l}`);
    assert.ok(!Object.keys(m212.exports ?? {}).includes(l), `frame-sidebar-nav does not export ${l} yet`);
  }
  for (const p of Object.values(PENDING_ROOTS)) assert.deepEqual(p.unexportedLinks, { 'frame-sidebar-nav': ['Pv', 'Av', 'vv'].map(l => `shared-212-BHMAi0oa.js#${l}`) });
  // Nothing of the store chunk or of ce311b43f is cut here.
  assert.ok(!manifest.modules.some(m => [CC89, 'ce311b43f-CaHZaaO5.js', 'cfdc58f68-BL8saXpq.js'].includes(m.source)));
});

test('host boundaries: vendor-intl useIntl / FormattedMessage pinned, re-exported unchanged from the kit adapters', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original}=${a.name}<-${a.hostAdapter}`), [
    'vendor-intl-BJgYK7RA.js#q=useIntl<-src/source-session-rail-kit-adapters.jsx', 'vendor-intl-BJgYK7RA.js#Gt=FormattedMessage<-src/source-session-rail-kit-adapters.jsx']);
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  assert.deepEqual([...used].sort(), ['FormattedMessage', 'useIntl']);
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-pierre-changes-v4-adapters.jsx');
  const adapterText = local('src/source-pierre-changes-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default|\*)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]), ['./source-session-rail-kit-adapters.jsx']);
  assert.ok(!manifest.modules.some(m => m.source === 'vendor-intl-BJgYK7RA.js'), 'react-intl is the host\'s, not cut');
});

test('D1: no binding cut here is held by another 4.16336.0 graph; the linked owners are imported; the 3.6556.2 graph is untouched', () => {
  const held = new Map();
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'pierre-changes-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const mod of m.modules ?? []) for (const b of mod.bindings ?? []) {
      const name = typeof b === 'string' ? b : b.name, file = typeof b === 'object' && b.file ? path.basename(b.file) : path.basename(mod.source ?? '');
      held.set(`${file}#${name}`, dir);
    }
  }
  for (const mod of manifest.modules) for (const b of mod.bindings) assert.ok(!held.has(`${mod.source}#${b.name}`), `${mod.source}#${b.name} is also cut by ${held.get(`${mod.source}#${b.name}`)}`);
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  for (const area of ['working-line-v4', 'files-changes-v4', 'routines-shared-v4', 'frame-sidebar-nav']) assert.ok(linked.has(area), `links ${area}`);
  assert.ok(manifest.modules.flatMap(m => m.imports).some(i => i.kind === 'shared-graph' && i.name === 'useEventCallback'), 'useEventCallback through cds-core');
  // The two image viewer contexts are declared once, here (createContext = h in c44d00c7f).
  const body = local(`${out}/pierre-changes.mjs`);
  assert.equal(body.split('var ud = h(null);').length - 1, 1);
  assert.equal(body.split('var dd = h(!1);').length - 1, 1);
  assert.equal(JSON.parse(local('src/generated/pierre-changes/manifest.json')).referenceVersion, '3.6556.2');
});

test('the official text: the image viewer provider, the scheduler, the comparison entries and the pane mount', () => {
  const c44 = official(C44);
  for (const s of ['var ud=h(null),dd=h(!1);', 'i(ud,{value:m,children:[c,b]})', 'n(dd,{value:d,children:x})', 'fd as s', 'ca as C', 'var fo=u(co)', 'var Cp=u(Sp)',
    'Ct=Ql(r)', 'mt=Re(!dt&&!Ye)', 'showMoreLines:{defaultMessage:"Show more lines",id:"UT3lU03eUR"}', 'defaultMessage:"Tell Claude what to change",id:"K15bjS+2Xf"'])
    assert.ok(c44.includes(s), s);
  const c89 = official(CC89);
  for (const s of ['I as q', 'L as N', 'j as H', 'M as R', 'at as Q', 'Kt as $', 'F as J']) assert.ok(c89.includes(s), s);
});

test('SSR: the image viewer provider gives {open, stale} and true only where images can be fetched', t => {
  ssr();
  const Read = () => {
    const v = React.useContext(gen.DiffImageViewerContext), shown = React.useContext(gen.DiffImageViewerShownContext);
    return h('i', null, JSON.stringify([v === null ? null : Object.keys(v).sort(), v?.stale ?? null, typeof v?.open, shown]));
  };
  const read = node => JSON.parse(text(renderToStaticMarkup(node)).replaceAll('&quot;', '"'));
  assert.deepEqual(read(h(Read)), [null, null, 'undefined', false]);
  assert.deepEqual(read(h(gen.DiffImageViewerProvider, { files: [], fetchFileImages: async () => ({}), scopeKey: 's', stale: false }, h(Read))), [['open', 'stale'], false, 'function', true]);
  assert.deepEqual(read(h(gen.DiffImageViewerProvider, { files: [], fetchFileImages: async () => ({}), scopeKey: 's', stale: true }, h(Read))), [['open', 'stale'], true, 'function', true]);
  assert.deepEqual(read(h(gen.DiffImageViewerProvider, { files: [], scopeKey: 's', stale: true }, h(Read))), [null, null, 'undefined', false]);
});

test('comparison entries: patchless files filtered, content hash per scope / merge base, cached per file object, sorted', t => {
  ssr();
  const f1 = { filename: 'z.ts', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n-a\n+b' };
  const f2 = { filename: 'a/b.ts', status: 'added', additions: 2, deletions: 0, patch: '@@ +1,2 @@' };
  const f3 = { filename: 'n.bin', status: 'modified', additions: 0, deletions: 0 };
  const cmp = { merge_base: 'abc', files: [f1, f2, f3] };
  const a = gen.comparisonFileEntries(cmp, 'scope'), b = gen.comparisonFileEntries(cmp, 'scope');
  assert.deepEqual(a.map(e => [e.filePath, e.status, e.additions, e.deletions, e.lazy]), [['a/b.ts', 'added', 2, 0, false], ['z.ts', 'modified', 1, 0, false]]);
  assert.equal(a[0], b[0], 'the entry object is reused for the same file and hash input');
  assert.notEqual(gen.comparisonFileEntries(cmp, 'other')[0].contentHash, a[0].contentHash);
  const lazy = gen.comparisonFileEntries({ files: [f1, f3], lazy_file_hunks: true });
  assert.deepEqual(lazy.map(e => [e.filePath, e.lazy]), [['n.bin', true], ['z.ts', true]]);
});

test('SSR: the file header (fo) and the messages (Ff)', t => {
  ssr();
  assert.deepEqual(JSON.parse(JSON.stringify(gen.pierreChangesMessages)), { showMoreLines: { defaultMessage: 'Show more lines', id: 'UT3lU03eUR' } });
  const html = renderToStaticMarkup(h(gen.PierreChangesFileHeader, { filePath: 'src/app/main.ts', additions: 3, deletions: 1, status: 'modified', expanded: true }));
  assert.ok(text(html).includes('main.ts'), text(html));
  const renamed = renderToStaticMarkup(h(gen.PierreChangesFileHeader, { filePath: 'b.ts', renamedFrom: 'a.ts', additions: 0, deletions: 0, status: 'renamed', expanded: false }));
  assert.ok(renamed.includes('a.ts'), renamed);
});

test('SSR: the fetch scheduler hands each view of a session the shared core\'s handle', t => {
  ssr();
  const seen = [];
  const S = ({ id }) => { seen.push(gen.useDiffFetchScheduler(id)); return null; };
  renderToStaticMarkup(h(React.Fragment, null, h(S, { id: 'sess' }), h(S, { id: 'sess' })));
  assert.equal(seen.length, 2);
  for (const handle of seen) assert.equal(typeof handle, 'object');
});
