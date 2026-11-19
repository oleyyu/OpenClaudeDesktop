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
import {
  extractQueuedBarV4, locateRoots, pinAdapters, assertRawCallSites, assertAdapterModule, assertPending,
  ROOTS, ROOT_PINS, HOST_ADAPTERS, ADAPTER_PINS, PENDING_ROOTS, RELEASED_ROOTS, LINKED_AREAS, CLOSURE_CHUNKS, linkedCopies, RAW_CALL_SITES,
  CDS_CORE_MANIFEST_SHA256, QUEUED_BAR_V4_OUTPUT, BAR, SCOPE_BODY, DND_KIT, DND_KIT_LINK_EXPORTS, DND_KIT_PURE_LINK_EXPORTS, DND_KIT_ENUM_STATEMENTS,
} from '../scripts/extract-queued-bar-v4.mjs';

// Round 2 batch 11, unit queued-bar: the 4.16336.0 QueuedMessageBar (cf74bc599 wO), scripts/extract-queued-bar-v4.mjs
// -> src/generated/queued-bar-v4, staged next to the 3.6556.2 src/generated/queued-bar the host still mounts. Round 3
// (relink task rl-queued-bar-pierre): cds-core wave 7 published both needs the root waited for (shared-frame _D
// renderMenuItems, shared-3 jF artifactNamesStore), so wO is back in ROOTS and the graph is generated. Checked here: the
// root, adapter and call-site pins on the official bytes, the released hold, --check, the linkedCopies being pure and
// still unexported, dnd-kit's one holder (this graph) and its exported module state, SSR of the generated bar (one entry,
// several, exiting), and the 3.6556.2 graph being untouched (no production switch this round, see the report).
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('cds-core pin: the reviewed wave-6 manifest', () => {
  assert.equal(CDS_CORE_MANIFEST_SHA256, 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd');
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
});

test('root: cf74bc599 wO QueuedMessageBar, the one declaration carrying its features, raw sha256 pinned', async () => {
  assert.deepEqual(Object.keys(ROOTS), [BAR]);
  assert.deepEqual(Object.keys(ROOTS[BAR]), ['wO']);
  const [found, ...rest] = await locateRoots();
  assert.equal(rest.length, 0);
  assert.deepEqual({ file: found.file, local: found.local, name: found.name, export: found.export }, { file: BAR, local: 'wO', name: 'QueuedMessageBar', export: 'QueuedMessageBar' });
  assert.equal(found.declarationSha256, ROOT_PINS[`${BAR}#wO`]);
  const text = fs.readFileSync(path.join(ion, BAR), 'utf8');
  assert.equal(text.split('wO=p(function(e){let $=J9(18),t=e.entries.length;if(t===0)return null;').length - 1, 1);
});

test('host boundaries: every adapted original pinned; the adapter module only re-exports existing host adapters', async () => {
  const pinned = await pinAdapters();
  assert.deepEqual(pinned.map(a => a.original).sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const a of pinned) assert.equal(a.declarationSha256, ADAPTER_PINS[a.original]);
  assert.deepEqual(Object.fromEntries(pinned.map(a => [a.original, a.name])), {
    'c6b8adeaf-qnfs920E.js#la': 'useQueuedEntryRemoving', 'c6b8adeaf-qnfs920E.js#ta': 'useQueuedEntrySending',
    'c6b8adeaf-qnfs920E.js#na': 'useQueuedEntrySendAccepted', 'c6b8adeaf-qnfs920E.js#ra': 'useQueuedEntrySendLanded',
    'cb231ff8d-H_9bdVKG.js#c': 'SEEDED_SUMMON_PARSER_ENTRY', 'shared-25-D-aF0gt9.js#Z': 'useCurrentAccount',
    'vendor-intl-BJgYK7RA.js#q': 'useIntl', 'vendor-intl-BJgYK7RA.js#Gt': 'QueuedBarMessage',
  });
  await assertAdapterModule();
  const adapterModule = local('src/source-queued-bar-v4-adapters.jsx');
  assert.doesNotMatch(adapterModule, /\bfunction\b|=>|createContext|useState/);
  // cf74bc599 reads the four queue stores under these import aliases (the 3.6556.2 Ti / vi / yi / bi readers).
  const bar = fs.readFileSync(path.join(ion, BAR), 'utf8');
  assert.match(bar, /\bN as r_\b/); assert.match(bar, /\bL as n_\b/); assert.match(bar, /\bR as i_\b/); assert.match(bar, /\bB as t_\b/);
});

test('call sites: the session scope body overlay ICe and the export alias, each feature once in the official bytes', async () => {
  const sites = await assertRawCallSites();
  assert.deepEqual(sites.map(s => s.source), [SCOPE_BODY, BAR]);
  assert.equal(sites[0].sourceSha256, sha(fs.readFileSync(path.join(ion, SCOPE_BODY))));
  assert.ok(RAW_CALL_SITES[0].features[0].includes('overlayHost:"EpitaxySessionScopeBody.QueuedMessageBar"'));
});

// Wave 7 (cds-integrate/wave7): cds-core publishes both needs, shared-frame _D (renderMenuItems) and shared-3 jF
// (artifactNamesStore). Round 3 moved wO back into ROOTS: nothing is pending, the graph is generated and passes --check,
// and both former needs are imported from cds-core (the shared graph), not cut here.
test('released: wO left PENDING_ROOTS once cds-core published _D and jF; the graph is generated and passes --check', async () => {
  const core = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const byBinding = new Map(Object.entries(core.publicNames).map(([name, v]) => [`${v.file}#${v.local}`, name]));
  assert.deepEqual(PENDING_ROOTS, {});
  assert.deepEqual(await assertPending(), []);
  assert.deepEqual(RELEASED_ROOTS[`${BAR}#wO`].needs.map(n => [n.binding, byBinding.get(n.binding), n.publicName]),
    [['shared-frame-CJdE5Ria.js#_D', 'renderMenuItems', 'renderMenuItems'], ['shared-3-IQTrO7Gx.js#jF', 'artifactNamesStore', 'artifactNamesStore']]);
  assert.ok(fs.existsSync(path.join(app, QUEUED_BAR_V4_OUTPUT, 'manifest.json')));
  const m = JSON.parse(local(`${QUEUED_BAR_V4_OUTPUT}/manifest.json`));
  assert.equal(m.referenceVersion, '4.16336.0');
  assert.equal(m.generator, 'scripts/extract-queued-bar-v4.mjs');
  assert.deepEqual(m.modules.map(x => x.source).sort(), [...CLOSURE_CHUNKS, BAR].sort());
  const bar = m.modules.find(x => x.source === BAR);
  assert.deepEqual(bar.exports, { wO: 'QueuedMessageBar' });
  const imp = (mod, name) => mod.imports.find(i => i.name === name);
  assert.deepEqual([imp(bar, '_D')?.kind, imp(bar, '_D')?.from], ['shared-graph', '../cds-core/shared-frame.mjs']);
  const s3 = m.modules.find(x => x.source === 'shared-3-IQTrO7Gx.js');
  assert.deepEqual([imp(s3, 'jF')?.kind, imp(s3, 'jF')?.from], ['shared-graph', '../cds-core/shared-3.mjs']);
  for (const mod of m.modules) {
    assert.ok(!(mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === (mod.source === BAR ? '_D' : 'jF') && ['shared-frame-CJdE5Ria.js', 'shared-3-IQTrO7Gx.js'].includes(mod.source)), `${mod.source}: _D / jF not cut here`);
    assert.equal(sha(fs.readFileSync(path.join(app, QUEUED_BAR_V4_OUTPUT, mod.target))), mod.sha256, mod.target);
  }
  assert.match(local(`${QUEUED_BAR_V4_OUTPUT}/index.mjs`), /export \{ QueuedMessageBar \} from "\.\/queued-bar\.mjs";/);
  assert.equal(local('scripts/verify-gen-queued-bar-v4.mjs').includes('extractQueuedBarV4({ check: true })'), true);
  await extractQueuedBarV4({ check: true });
});

test('D1: linkedCopies are pure and still sliced without an export by the graph named; the closure lists dnd-kit', async () => {
  const L = await import(path.resolve(app, '../analysis/claude-4.16336.0-migrate-20261104/d1/d1-lib.mjs'));
  // wave 8c (R4-K1 addendum C): 30 -> 22 (the eight shared-0 copies became a link: frame-sidebar-nav exports ut since its jk root).
  assert.equal(Object.keys(linkedCopies).length, 22);
  for (const key of Object.keys(linkedCopies)) assert.equal(L.classify(...key.split('#')).stateful, false, key);
  const byArea = { 'turn-plan-v4': [], 'frame-sidebar-nav': [] };
  for (const [key, why] of Object.entries(linkedCopies)) byArea[/sliced by ([\w-]+) without an export/.exec(why)[1]].push(key);
  for (const [area, keys] of Object.entries(byArea)) {
    assert.ok(LINKED_AREAS.includes(area));
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const key of keys) {
      const [file, name] = key.split('#');
      const mod = m.modules.find(x => path.basename(x.source) === file && (x.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === name));
      assert.ok(mod, `${area} slices ${key}`);
      assert.ok(!mod.exports?.[name] && !mod.linkExports?.includes(name) && !mod.sharedExports?.includes(name), `${area} does not export ${key}`);
    }
  }
  assert.ok(CLOSURE_CHUNKS.includes(DND_KIT));
  assert.ok(!CLOSURE_CHUNKS.includes(BAR));
  for (const area of LINKED_AREAS) assert.equal(JSON.parse(local(`src/generated/${area}/manifest.json`)).referenceVersion, '4.16336.0', area);
});

// dnd-kit (c09f6b4e5): no other 4.16336.0 graph holds any of its bindings (D1: this graph is its first and only holder);
// its module state (6 contexts, the measuring cache, the 2 default context values) is exported under its own names for a
// later linking graph (session-rail-v4 sN); its nine TypeScript enums are carried as the official statements.
test('D1: dnd-kit has one holder, this graph, with its module state exported and its enums filled', async () => {
  const L = await import(path.resolve(app, '../analysis/claude-4.16336.0-migrate-20261104/d1/d1-lib.mjs'));
  const { graphs } = L.loadGraphs({ appOnly: true });
  const holders = new Set();
  for (const g of graphs.filter(g => g.status === 'ok')) for (const key of g.sliced.keys()) if (key.startsWith(`${DND_KIT}#`)) holders.add(g.name);
  assert.deepEqual([...holders], ['queued-bar-v4']);
  for (const local of DND_KIT_LINK_EXPORTS) assert.equal(L.classify(DND_KIT, local).stateful, true, local);
  const m = JSON.parse(local(`${QUEUED_BAR_V4_OUTPUT}/manifest.json`));
  const dnd = m.modules.find(x => x.source === DND_KIT);
  // R4-RW8-SR (round4 relink-w8): + the five pure helpers session-rail-v4 links (N / y / _ / v / Dn), each classified pure
  // (was: dnd.linkExports deepEqual [...DND_KIT_LINK_EXPORTS].sort(), the nine module-state bindings only).
  // round4 navfix: + En / dn (DragOverlay, useDndContext), which frame-sidebar-nav's shipped c1afd40ea links (each pure).
  assert.deepEqual(DND_KIT_PURE_LINK_EXPORTS, ['Dn', 'En', 'N', '_', 'dn', 'v', 'y']);
  for (const local of DND_KIT_PURE_LINK_EXPORTS) assert.equal(L.classify(DND_KIT, local).stateful, false, local);
  assert.deepEqual(dnd.linkExports, [...DND_KIT_LINK_EXPORTS, ...DND_KIT_PURE_LINK_EXPORTS].sort());
  const text = local(`${QUEUED_BAR_V4_OUTPUT}/${dnd.target}`);
  const exported = /export \{([^}]*)\};\s*$/.exec(text)[1].split(',').map(x => x.trim()).filter(Boolean);
  for (const local of [...DND_KIT_LINK_EXPORTS, ...DND_KIT_PURE_LINK_EXPORTS]) assert.ok(exported.includes(local), `${local} exported`);
  const official = fs.readFileSync(path.join(ion, DND_KIT), 'utf8');
  for (const arg of DND_KIT_ENUM_STATEMENTS) {
    assert.equal(official.split(arg).length - 1, 1, arg);
    const name = /^\((\w+)\|\|=\{\}\)$/.exec(arg)[1];
    assert.ok(text.includes(`})((${name} ||= {}));`) || text.includes(`})(${name} ||= {});`), `${name}: its enum statement is carried`);
  }
});

// SSR of the generated bar. The bar's "sent" mark gate (shared-39 Ol, linked from frame-sidebar-nav) reads the epitaxy
// presets flag through the nav boundary useFeatureIsOn; the nav host table (src/frame-sidebar-nav-host.jsx) does not load
// in isolation this round, so the test installs only that capability, answered as the nav host answers it (HOST_GROWTHBOOK
// by growthBookFlagKey; frame-sidebar-nav-host.jsx feature()). Every other capability stays unanswered (asking one throws).
let server, gen, navAsked;
before(async () => {
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  const gb = await server.ssrLoadModule('/src/host-growthbook.mjs');
  const nav = await server.ssrLoadModule('/src/frame-sidebar-nav-adapter.mjs');
  navAsked = [];
  nav.installFrameSidebarNavHost({ useFeatureIsOn: key => { navAsked.push(key); const flag = gb.growthBookFlagKey(key); return Object.hasOwn(gb.HOST_GROWTHBOOK, flag) && gb.HOST_GROWTHBOOK[flag] === true; } });
  gen = await server.ssrLoadModule(`/${QUEUED_BAR_V4_OUTPUT}/index.mjs`);
});
after(async () => { await closeWhenSettled(server); await server?.close(); });
const h = React.createElement, noop = () => {};
const entry = (id, text) => ({ id, author: 'user', items: [{ kind: 'text', id: `${id}:0`, text }] });
const labels = html => [...html.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(m => m[1]);
// Text content without markup and without the CdsIcon glyphs (private-use code points of the icon font).
const plain = html => html.replace(/<[^>]+>/g, ' ').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();

test('SSR: one entry is DO\'s row (count, preview, Send now with its note, Edit in composer, Remove from queue) in the entering band', () => {
  const html = renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [entry('q1', 'run the tests')], onCancel: noop, onEdit: noop, onSteer: noop }));
  assert.match(html, /^<div class="epitaxy-band-enter ">/);
  assert.match(html, /<div data-take-back-entry="q1" class="[^"]* px-lg select-none ">/);
  assert.ok(plain(html).startsWith('1 message queued run the tests'), plain(html));
  assert.deepEqual(labels(html), ['Send now', 'Edit in composer', 'Remove from queue']);
  const note = /aria-label="Send now" aria-describedby="([^"]+)"/.exec(html)?.[1];
  assert.ok(note);
  // QueuedBarMessage (E83): the note names the running core's assistant.
  assert.match(html, new RegExp(`<span id="${note}" hidden="">DeepSeek reads this message at its next step.</span>`));
  assert.deepEqual([...new Set(navAsked)], ['claudeai_cc_epitaxy_session_presets_main']);
  // No onSteer: no Send now; a seeded entry is never editable or steerable (SO).
  assert.deepEqual(labels(renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [entry('q1', 'x')], onCancel: noop, onEdit: noop }))), ['Edit in composer', 'Remove from queue']);
  assert.deepEqual(labels(renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [{ ...entry('q1', 'x'), seeded: true }], onCancel: noop, onEdit: noop, onSteer: noop }))), ['Remove from queue']);
  assert.equal(renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [] })), '');
});

test('SSR: several entries are OO\'s collapsed summary ("N messages queued", "Next: …"), the sortable list closed', () => {
  const html = renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [entry('q1', 'run the tests'), entry('q2', 'lint'), entry('q3', 'ship')], onCancel: noop, onEdit: noop, onSteer: noop, onReorder: noop }));
  assert.match(html, /^<div class="epitaxy-band-enter "><button type="button" aria-expanded="false" class="[^"]*px-lg rounded-card bg-alpha-1[^"]*">/);
  assert.equal(plain(html), '3 messages queued Next: run the tests');
  assert.doesNotMatch(html, /data-take-back-entry/);
});

test('SSR: exiting keeps the band mounted with the exit class and inert (wO: `inert: a`), its row unchanged', () => {
  const html = renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [entry('q1', 'run the tests')], exiting: true, onExited: noop, onCancel: noop, onEdit: noop, onSteer: noop }));
  assert.match(html, /^<div class="epitaxy-band-enter epitaxy-band-exit" inert=""><div data-take-back-entry="q1" /);
  assert.ok(plain(html).startsWith('1 message queued run the tests'), plain(html));
  // the controls stay drawn (the whole band is inert while it animates out)
  assert.deepEqual(labels(html), ['Send now', 'Edit in composer', 'Remove from queue']);
  const bare = renderToStaticMarkup(h(gen.QueuedMessageBar, { entries: [entry('q1', 'run the tests')], exiting: true, onExited: noop }));
  assert.equal(plain(bare), '1 message queued run the tests');
  assert.deepEqual(labels(bare), []);
});

test('staged double output: the 3.6556.2 queued-bar graph is self-consistent and still 3.6556.2', () => {
  const m = JSON.parse(local('src/generated/queued-bar/manifest.json'));
  assert.equal(m.referenceVersion, '3.6556.2');
  assert.equal(m.generator, 'scripts/extract-queued-bar.mjs');
  for (const mod of m.modules) assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/queued-bar', mod.target))), mod.sha256, mod.target);
});
