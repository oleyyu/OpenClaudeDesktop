import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractHomeV4, HOME_V4, HOME_V4_OUTPUT, CDS_CORE_MANIFEST_SHA256, sourcePins } from '../scripts/extract-home-v4.mjs';
import * as v4 from '../scripts/official-4.16336.0.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

// home-chat-cowork (4.16336.0, surfaces-prod): the Chat greeting / Cowork home graph scripts/extract-home-v4.mjs generates
// into src/generated/home-chat-cowork (sharedGraph 'cds-core'), its host adapter src/source-home-v4-adapters.jsx and the
// host components (src/source-chat-home.jsx SourceChatGreeting, src/source-cowork-home.jsx SourceCoworkHome). Synthetic
// fixtures only (no user data); SSR and plain functions, no browser.
const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, HOME_V4_OUTPUT);
const core = path.join(app, 'src/generated/cds-core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo, which read document.cookie at load (as in the app).
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, getElementsByTagName: () => [], addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, adapters, chat, cowork, Home, Ideas, Catalog, Layout, Seat, CdsCore;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  adapters = await server.ssrLoadModule('/src/source-home-v4-adapters.jsx');
  chat = await server.ssrLoadModule('/src/source-chat-home.jsx');
  cowork = await server.ssrLoadModule('/src/source-cowork-home.jsx');
  Home = await server.ssrLoadModule(`/${HOME_V4_OUTPUT}/shared-23.mjs`);
  Ideas = await server.ssrLoadModule(`/${HOME_V4_OUTPUT}/ce266b9be-DwMu7QWG.js`);
  Catalog = await server.ssrLoadModule(`/${HOME_V4_OUTPUT}/c2bf50d9e-C85ZHUZy.js`);
  Layout = await server.ssrLoadModule(`/${HOME_V4_OUTPUT}/shared-19.mjs`);
  Seat = await server.ssrLoadModule(`/${HOME_V4_OUTPUT}/shared-33.mjs`);
  CdsCore = await server.ssrLoadModule('/src/cds-core.mjs');
});
after(async () => { i18n?.setLocale('en-US'); await server?.close(); });

test('generator --check: byte-identical output, finalized cds-core pin, source pins', async () => {
  const manifest = await extractHomeV4({ check: true });
  // cds-core wave 5: preload-helper, shared-31, shared-1 and shared-60 are entered only through cds-core publicNames now.
  assert.equal(manifest.modules.length, 27);
  assert.equal(sha(fs.readFileSync(path.join(core, 'manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  // The finalized cds-core this graph links: since cds-core wave 5b, the wave5b closure proof's owner manifest (after);
  // the wave 5 one it replaces is recorded there as owner.manifestSha256.wave5 (= wave5-merged.json production).
  const closure5b = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave5b/closure.json'));
  const wave5 = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave5/wave5-merged.json'));
  assert.equal(closure5b.verdict, 'PASS');
  // Since cds-core wave 6: the wave6 union proof's owner (after), built on the wave-5b owner (before).
  const union6 = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave6/union.json'));
  assert.deepEqual(union6.problems, []);
  assert.equal(union6.owner.before, closure5b.owner.manifestSha256.after);
  // Since cds-core wave 7: the wave7 union proof's owner (after), built on the wave-6 owner (before).
  const union7 = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave7/union.json'));
  assert.deepEqual(union7.problems, []);
  assert.equal(union7.owner.before, union6.owner.after);
  // Since cds-core wave 8: the wave8 union proof's owner (after), built on the wave-7 owner (before) (was:
  // assert.equal(CDS_CORE_MANIFEST_SHA256, union7.owner.after)).
  const union8 = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave8/union.json'));
  assert.deepEqual(union8.problems, []);
  assert.equal(union8.owner.before, union7.owner.after);
  // Since cds-core wave 8s (W8S-T7): the wave8s union proof's owner (after), built on the wave-8 owner (before) (was:
  // assert.equal(CDS_CORE_MANIFEST_SHA256, union8.owner.after)).
  const union8s = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave8s/union.json'));
  assert.deepEqual(union8s.problems, []);
  assert.equal(union8s.owner.before, union8.owner.after);
  // Since cds-core wave 8a / 8b (R4-K1): the wave8a union proof's owner (after), built on the wave-8s owner (before), and the
  // wave8b one built on it (was: assert.equal(CDS_CORE_MANIFEST_SHA256, union8s.owner.after)).
  const union8a = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave8a/union.json'));
  const union8b = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave8b/union.json'));
  assert.deepEqual([union8a.problems, union8b.problems], [[], []]);
  assert.equal(union8a.owner.before, union8s.owner.after);
  assert.equal(union8b.owner.before, union8a.owner.after);
  // Since cds-core wave 8c (R4-K1 addendum C): the wave8c union proof's owner (after), built on the wave-8b owner (before)
  // (was: assert.equal(CDS_CORE_MANIFEST_SHA256, union8b.owner.after)).
  const union8c = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave8c/union.json'));
  assert.deepEqual(union8c.problems, []);
  assert.equal(union8c.owner.before, union8b.owner.after);
  // W8D-T1 (R6-W8D; cds-core addendum D replayed over addendum C, R4-K1): the wave8d union proof's owner (after), built on the
  // wave-8c owner (before) (was: assert.equal(CDS_CORE_MANIFEST_SHA256, union8c.owner.after)).
  const union8d = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wave8d/union.json'));
  assert.deepEqual(union8d.problems, []);
  assert.equal(union8d.owner.before, union8c.owner.after);
  // cds-core wave cc2 (chat-cowork-1to1-20261117 r2 Core): the wavecc2 union proof's owner (after), built on the wave-8d
  // owner (before) (was: assert.equal(CDS_CORE_MANIFEST_SHA256, union8d.owner.after)).
  const unioncc2 = json(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/wavecc2/union.json'));
  assert.deepEqual(unioncc2.problems, []);
  assert.equal(unioncc2.owner.before, union8d.owner.after);
  assert.equal(CDS_CORE_MANIFEST_SHA256, unioncc2.owner.after);
  assert.equal(closure5b.owner.manifestSha256.wave5, wave5.manifestSha256.production);
  for (const [file, want] of Object.entries(sourcePins)) assert.equal(sha(fs.readFileSync(path.join(v4.ionSource, file))), want, file);
  assert.match(read('scripts/verify-gen-home-v4.mjs'), /extractHomeV4\(\{ check: true \}\)/);
});

test('roots: AST-unique official declarations under the pinned local, export alias and hash (pilot review corrections included)', () => {
  const roots = json(path.join(out, 'roots.json'));
  const expect = {
    useChatGreeting: ['shared-23-BRmsPtuN.js', 'ix', null, 'a10b45da6abac199984c4ff5c4f2a8464d82f146d6d852d7d7f520e66b500c54'],
    personalizedGreeting: ['shared-23-BRmsPtuN.js', 'Hb', null, '71d171b903f713aaa9b69e510c1d0d4754056dc14515f71c9c9c8ac28defa95d'],
    HomeGreeting: ['shared-23-BRmsPtuN.js', 'lx', null, '91578fefae6991bf50fbe52389a2be556847f3754f60f214055941beacdd998c'],
    CoworkHome: ['shared-23-BRmsPtuN.js', 'dw', null, 'f4bbe9943b85a1cb251d3ae6b66b2399c375b4dffbd97532a0ef7793a9ca0c3b'],
    homeSurfaceSlots: ['shared-23-BRmsPtuN.js', 'uw', null, 'bfb42917f52ee82855fd63003f424c950457a6104d08774cc55220c8f7c02c2f'],
    CoworkTaskList: ['shared-23-BRmsPtuN.js', 'ZC', 'vn', 'da248aa1044973858973f4e47ed62d83633f450cc2bda39b2d79916a0e1ffd15'],
    ChorusCoworkSuggestions: ['ce266b9be-DwMu7QWG.js', 'Le', 'ChorusCoworkSuggestions', '6e56d4e1f56c55ec40a19984e44ad4313122675bcf4aa9b20db340ec65960259'],
    // review: c2bf50d9e o is exported as COWORK_HOME_IDEAS_CATALOG (not "o")
    COWORK_HOME_IDEAS_CATALOG: ['c2bf50d9e-C85ZHUZy.js', 'o', 'COWORK_HOME_IDEAS_CATALOG', 'a83df521489af574afa7d6ca7c35b0ef930a5b1b95b6d145b5099138a3ab5639'],
  };
  for (const [name, [chunk, local, alias, declSha]] of Object.entries(expect))
    assert.deepEqual(roots.roots[name], { chunk, local, alias, sha256: declSha }, name);
  // review: shared-23 XC is exported as gn (not internal)
  assert.deepEqual(roots.inner.XC, { chunk: 'shared-23-BRmsPtuN.js', local: 'XC', alias: 'gn', sha256: '2f1142723288f4b46a0d33fd6ee21caa7892753b3175dfb4fc47046d10385bac' });
  assert.equal(roots.inner.sw.sha256, '9f4163b968736dc35e52dd11fd4b5a3da29c39ceabb10261b521be7ea55305f6');
  assert.equal(roots.inner.QC.sha256, 'fc03e8b2c8fa64220479d46044a4a50a35d46088a26c385adb8ec3ee74f7b51b');
  // The preload helper's dedupe cache o left justifiedCopies in cds-core wave 5 (this graph links cds-core vitePreload).
  assert.deepEqual(Object.keys(roots.justifiedCopies), []);
});

test('one cds-core: every CDS binding is a cds-core publicName import; only pure bindings are sliced again', () => {
  const manifest = json(path.join(out, 'manifest.json'));
  const coreManifest = json(path.join(core, 'manifest.json'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, v4.referenceSnapshot);
  assert.equal(manifest.sharedGraph, 'cds-core');
  const byExport = new Map(Object.values(coreManifest.publicNames).map(p => [`${p.target}:${p.exportName}`, p]));
  const linked = new Set();
  for (const m of manifest.modules) {
    assert.equal(m.sourceSha256, sha(fs.readFileSync(path.join(v4.ionSource, m.source))), m.source);
    assert.equal(m.sha256, sha(fs.readFileSync(path.join(out, m.target))), m.target);
    for (const i of m.imports) {
      // W8-RT (cds-integrate/wave8, extract-home-v4.mjs linkedAreas ['r3b-tasks']): shared-0 Tl (lazyValue) is linked from
      // r3b-tasks, its single owner (was: generated / shared-graph / react / adapter).
      assert.ok(['generated', 'shared-graph', 'react', 'adapter', 'linked'].includes(i.kind), `${m.target} ${i.kind}`);
      if (i.kind === 'linked') assert.deepEqual([i.from, i.name, i.original], ['../r3b-tasks/lazy-value.mjs', 'lazyValue', 'Tl'], m.target);
      if (i.kind === 'react') assert.ok(['react', 'react/jsx-runtime', 'react/compiler-runtime', 'react-dom'].includes(i.from), `${m.target} ${i.from}`);
      if (i.kind === 'adapter') assert.equal(i.from, '../../source-home-v4-adapters.jsx');
      if (i.kind !== 'shared-graph') continue;
      const target = i.from.replace('../cds-core/', '');
      assert.ok(byExport.has(`${target}:${i.name}`), `${m.target} ${i.name} is a cds-core publicName`);
      linked.add(byExport.get(`${target}:${i.name}`).exportName);
    }
  }
  // The pilot's proposed additions are the finalized names: CdsSpark -> dM CdsAnimatedSpark, CdsShimmerText -> CdsShimmer.
  for (const name of ['CdsAnimatedSpark', 'CdsShimmer', 'CdsPopover', 'CdsTooltip', 'CdsSkeleton', 'CdsButton', 'CdsIcon', 'cdsClassNames', 'clsx', 'useDirection', 'memoStoreDeps4'])
    assert.ok(linked.has(name), name);
  assert.equal(coreManifest.publicNames.CdsAnimatedSpark.local, 'dM');
  // Copies of what cds-core also holds: the React Compiler helpers (pure, proved by assertCompilerHelpers), shared-33 Cb (a
  // pure direction map) and, since cds-core wave 5 holds more of their chunks, pure helpers it holds without publishing:
  // shared-0 Tl (lazyValue) / ge / he / ve, vendor-intl tn (defineMessages identity) and vendor-all-0's six. shared-5 dH
  // left that list in cds-core wave 5b: it is the publicName usageLimitHeadlineMessages, linked (shared-18 Sm).
  // The preload helper is no longer copied: cds-core publishes it (vitePreload, bound to viteAssetUrl) and it is linked.
  const held = Object.fromEntries(manifest.modules.filter(m => m.heldByViewTabs.length).map(m => [m.target, m.heldByViewTabs]));
  // cds-core wave 6 holds more of shared-0 / shared-25 / shared-62 / shared-183 (closure of its published bindings): the
  // pure helpers it holds without a publicName (shared-0 T6 / _e / yu, shared-25 Ci / Si / wi / xi, shared-62 Cb / Eb / Sb /
  // Tb / bb / wb, shared-183 lJ) are cut again as the same declarations; shared-0 ge / he are no longer cut (their readers are linked).
  // cds-core wave 8s (W8S-T7) also holds shared-123 Fh / Ih / Mh / Ph (pure / load-time constants, unpublished): cut again here
  // as the same declarations (was: the eight keys without 'shared-123.mjs').
  assert.deepEqual(Object.keys(held).sort(), ['shared-0.mjs', 'shared-123.mjs', 'shared-183.mjs', 'shared-25.mjs', 'shared-33.mjs', 'shared-62.mjs', 'shared-frame.mjs', 'vendor-all-0.mjs', 'vendor-intl.mjs']);
  // cds-core wave 8a (R4-K1): shared-123 Fh is the publicName identity_shared123_Fh, linked from cds-core, and Mh / Ph, which
  // only it reached, are not cut here (was: ['Fh', 'Ih', 'Mh', 'Ph']).
  assert.deepEqual(held['shared-123.mjs'], ['Ih']);
  assert.ok(manifest.modules.some(m => m.source.startsWith('shared-123-') && m.imports.some(i => i.name === 'Fh' && i.from === '../cds-core/shared-123.mjs')), 'shared-123 Fh <- cds-core');
  const helpers = new Set(Object.values(v4.compilerHelpers).map(helper => helper.local));
  for (const local of held['shared-frame.mjs']) assert.ok(helpers.has(local), `shared-frame ${local} is a compiler helper`);
  assert.deepEqual(held['shared-33.mjs'], ['Cb']);
  // cds-core wave 8 also holds shared-0 Kc / qc (pure, unpublished: closure of its wave-8 publicNames), cut again here as
  // the same declarations (was: ['T6', 'Tl', '_e', 've', 'yu']). W8-RT: shared-0 Tl is linked from r3b-tasks lazy-value.mjs,
  // no longer cut here (was: ['Kc', 'T6', 'Tl', '_e', 'qc', 've', 'yu']).
  assert.deepEqual(held['shared-0.mjs'], ['Kc', 'T6', '_e', 'qc', 've', 'yu']);
  assert.ok(!manifest.modules.some(m => m.source === 'shared-0-CnnWnVrT.js' && m.bindings.some(b => b.name === 'Tl')), 'shared-0 Tl is not cut again');
  // W8D-T1 (R6-W8D; addendum D replayed over addendum C, R4-K1): cds-core now also holds shared-62 IS (`function IS(){return!k(kS)}`,
  // a pure context read in Pu's closure, unpublished), cut again here as the same declaration (was: ['Cb', 'Eb', 'Sb', 'Tb', 'bb', 'wb']
  // for shared-62.mjs).
  assert.deepEqual([held['shared-25.mjs'], held['shared-62.mjs'], held['shared-183.mjs']], [['Ci', 'Si', 'wi', 'xi'], ['Cb', 'Eb', 'IS', 'Sb', 'Tb', 'bb', 'wb'], ['lJ']]);
  assert.deepEqual([held['vendor-intl.mjs'], held['vendor-all-0.mjs']], [['tn'], ['_', 'g', 'h', 'm', 'p', 'v']]);
  assert.deepEqual(coreManifest.publicNames.usageLimitHeadlineMessages, { file: 'shared-5-u8kha2eH.js', local: 'dH', target: 'shared-5.mjs', exportName: 'dH' });
  assert.ok(!manifest.modules.some(m => m.source === 'shared-5-u8kha2eH.js' && m.bindings.some(b => b.name === 'dH')), 'shared-5 dH is not cut again');
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.name === 'dH').map(i => [m.target, i.kind, i.from])), [['shared-18.mjs', 'shared-graph', '../cds-core/shared-5.mjs']]);
  for (const m of manifest.modules) for (const name of m.heldByViewTabs) {
    const owner = coreManifest.modules.find(c => c.source === m.source)?.bindings.find(b => b.name === name);
    assert.equal(m.bindings.find(b => b.name === name).sha256, owner?.sha256, `${m.source}#${name} is the declaration cds-core holds`);
    assert.ok(!Object.values(coreManifest.publicNames).some(p => p.file === m.source && p.local === name), `${m.source}#${name} is not published`);
  }
  // No React copy: vendor-frame is not sliced here (cds-core's, by publicName), and no module carries a React runtime.
  assert.ok(!manifest.modules.some(m => m.source === v4.vendorFrame));
  for (const file of fs.readdirSync(out).filter(f => /\.(m?js)$/.test(f))) assert.doesNotMatch(fs.readFileSync(path.join(out, file), 'utf8'), /react\.production|__SECRET_INTERNALS|ReactCurrentDispatcher/, file);
  // The preload helper resolves sheets through the host's viteAssetUrl (file://, integration-1 preload-helper): since cds-core
  // wave 5 that is cds-core's vitePreload (browser-preload-helper.mjs imports viteAssetUrl from cds-core-adapter), linked by
  // the two lazy-import sites; this graph keeps no helper (and no dedupe cache) of its own.
  assert.ok(!fs.existsSync(path.join(out, 'browser-preload-helper.mjs')));
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.from === '../cds-core/browser-preload-helper.mjs').map(i => `${m.target}:${i.local}=${i.name}`)).sort(),
    ['ce266b9be-DwMu7QWG.js:t=s', 'shared-23.mjs:c=s']);
  assert.equal(coreManifest.publicNames.vitePreload.exportName, 's');
  assert.match(fs.readFileSync(path.join(core, 'browser-preload-helper.mjs'), 'utf8'), /import \{ viteAssetUrl as a \} from "\.\.\/\.\.\/cds-core-adapter\.mjs";/);
});

test('adapter module answers every adapter import of the graph', () => {
  const manifest = json(path.join(out, 'manifest.json'));
  const need = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  assert.deepEqual([...need].filter(name => !(name in adapters)), []);
  // 71 since cds-core wave 5 (viteAssetUrl is cds-core's own adapter import now).
  assert.equal(need.size, 71);
  // Intl is the shared host contract (cds-core-adapter.mjs), GrowthBook the host table.
  assert.match(read('src/source-home-v4-adapters.jsx'), /export const useIntl = useHostIntl;/);
  assert.match(read('src/source-home-v4-adapters.jsx'), /export \{ hostGrowthBookFeature \} from '\.\/cds-core-adapter\.mjs';/);
  assert.equal(adapters.hostGrowthBookFeature('__gb__3873045074'), null);
});

// ---- fixtures (synthetic) --------------------------------------------------------------------------------------------
const NOW_S = Math.floor(Date.now() / 1000);
const sessions = [
  { id: 'fixture-running', name: 'Fixture: summarize notes', updatedAt: NOW_S - 60 },
  { id: 'fixture-waiting', name: 'Fixture: rename files', updatedAt: NOW_S - 120 },
  { id: 'fixture-pinned', name: 'Fixture: weekly report', updatedAt: NOW_S - 86400 * 30 },
  { id: 'fixture-code', name: 'Fixture: code thread', updatedAt: NOW_S },
  { id: 'fixture-unread', name: 'Fixture: draft memo', updatedAt: NOW_S - 600 },
];
const metadata = { 'fixture-running': { surface: 'cowork' }, 'fixture-waiting': { surface: 'cowork' }, 'fixture-pinned': { surface: 'cowork', pinned: true },
  'fixture-unread': { surface: 'cowork', unread: true } };
const state = { active: { 'fixture-running': 'turn' }, approvals: [{ id: 'req-1', method: 'item/commandExecution/requestApproval', params: { threadId: 'fixture-waiting' } }] };
const noRoutines = async () => ({ tasks: [] });
const renderCowork = (props = {}) => renderToStaticMarkup(h(CdsCore.CdsRoot, { density: 'comfortable' }, h(cowork.SourceCoworkHome, {
  call: noRoutines, sessions, metadata, state, ready: true, onOpen() {}, onOpenRoutine() {}, onClearActive: async () => {},
  onMarkRead() {}, onMarkUnread() {}, onPrompt() {}, onPreviewPrompt() {}, onFocusInput() {}, ...props })));

test('SSR Chat greeting (4.16336.0 fx seat): new_page_home ruling picks the slot, Sa frame, lx lockup with the cds-core Spark', async () => {
  const html = renderToStaticMarkup(h(CdsCore.CdsRoot, { density: 'comfortable' }, h(chat.SourceChatGreeting, {})));
  const classic = Layout.homeLayout('classic'), homeArm = Layout.homeLayout('home');
  assert.deepEqual({ lockup: classic.greetingLockup, slot: classic.greetingSlotClass, seat: classic.greetingPhoneSeat }, { lockup: 'inline', slot: 'my-3 w-full', seat: 'center' });
  assert.deepEqual({ lockup: homeArm.greetingLockup, slot: homeArm.greetingSlotClass, seat: homeArm.greetingPhoneSeat }, { lockup: 'compact', slot: 'mt-3 w-full', seat: 'top' });
  assert.match(Seat.homeGreetingSeatClass('center'), /^dock:mt-0 dock:mb-0 dock:pt-\[max\(0px,calc\(/);
  assert.equal(Seat.homeGreetingSeatClass('top'), '');
  // integration-3 review-0 P1: the variant is the host's new_page_home ruling (host switch local_new_page_home, open:
  // the user's official screenshot draws the home arm), shared by the greeting and the new-page column.
  const growth = await import(new URL('../src/host-growthbook.mjs', import.meta.url).href);
  const variant = growth.hostGrowthBookFlag('local_new_page_home') ? 'home' : 'classic';
  assert.equal(variant, 'home');
  assert.equal(chat.newPageLayoutVariant, variant);
  const layout = Layout.homeLayout(variant);
  // chat-home r1-07: shared-19 SD — `div { className: h(greetingSlotClass + seat, aC) }` (was a host header.surface-greeting).
  const slotClass = [layout.greetingSlotClass, Seat.homeGreetingSeatClass(layout.greetingPhoneSeat), Layout.greetingSlotLiftClass].filter(Boolean).join(' ');
  assert.equal(Layout.greetingSlotLiftClass, 'md:mt-[calc(0.75rem_-_min(var(--chorus-composer-lift,0px)_+_var(--band-slot-lift,0px),5rem))]');
  assert.ok(html.includes(`<div data-surface-greeting="" class="${slotClass}">`), 'greeting slot follows the ruling');
  assert.match(read('src/source-surfaces.jsx'), /const homeVariant = homeLayout\(newPageLayoutVariant\);/);
  assert.ok(html.includes(`<div class="${Layout.greetingFrameClass}">`));
  assert.equal(Layout.greetingFrameClass, 'mx-auto flex w-full flex-col items-center gap-7 max-md:pt-4 max-w-2xl');
  assert.match(html, /data-new-page-greeting-spark=""/);
  // ix has no client clock on the server: the empty text keeps the lockup invisible until the client renders it.
  assert.match(html, /data-new-page-greeting-text="">​<\/span>/);
  assert.match(html, /invisible/);
  const shown = renderToStaticMarkup(h(CdsCore.CdsRoot, { density: 'comfortable' }, h(Home.HomeGreeting, { layout: 'inline', text: 'You’re here!' })));
  assert.match(shown, /data-new-page-greeting-text="">You’re here!<\/span>/);
  assert.doesNotMatch(shown, /invisible/);
  // main.jsx mounts it for Chat; the Cowork new page reaches it through source-surfaces.jsx SourceSurfaceGreeting.
  assert.match(read('src/main.jsx'), /\{!current && mode === 'chat' && <SourceChatGreeting incognito=\{incognitoDraft \|\| undefined\} \/>\}/);
  assert.match(read('src/source-surfaces.jsx'), /export function SourceSurfaceGreeting\(\) \{\n  return <SourceChatGreeting \/>;\n\}/);
});

// One component call under a hand-built client dispatcher (no hydration: useSyncExternalStore reads the client snapshot,
// so ix's clock exists and the text is chosen), as tests/w13-chat-home.test.mjs does for the 3.6556.2 greeting.
function clientCall(component, props, contexts = new Map()) {
  let cursor = 0;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: c => (contexts.has(c) ? contexts.get(c) : c._currentValue),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect() { cursor++; },
    useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot(); },
  };
  hooks.useLayoutEffect = hooks.useInsertionEffect = hooks.useEffect;
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
const clientGreeting = (greetings = [], props = {}) => {
  const frame = clientCall(chat.ChatGreetingText, props, new Map([[adapters.HomeHost, { surface: 'chat', greetings }]]));
  assert.equal(frame.type, 'div');
  assert.equal(frame.props.className, Layout.greetingFrameClass);
  assert.equal(frame.props.children.type, Home.HomeGreeting);
  return frame.props.children.props;
};
test('client render (ix): "You’re here!" / "You’re incognito", a local chat slot, and the host catalog locale', () => {
  assert.equal(clientGreeting().text, 'You\u2019re here!');
  assert.equal(clientGreeting([], { incognito: true }).text, 'You\u2019re incognito');
  const hour = new Date().getHours();
  const table = [{ surface: 'chat', days: null, default_slots: [{ until: 24, text: 'Fixture greeting' }] }];
  assert.equal(hour < 24 && clientGreeting(table).text, 'Fixture greeting');
  assert.equal(clientGreeting([{ ...table[0], surface: 'cowork' }]).text, 'You\u2019re here!');
  assert.deepEqual({ layout: clientGreeting().layout, spark: clientGreeting().spark, isAgentRoute: clientGreeting().isAgentRoute }, { layout: Layout.homeLayout(chat.newPageLayoutVariant).greetingLockup, spark: true, isAgentRoute: false });
  assert.equal(clientGreeting().layout, 'compact', 'the new_page_home ruling (local_new_page_home open) draws the compact lockup');
  i18n.setLocale('zh-CN');
  try {
    assert.equal(clientGreeting().text, '很高兴见到你！');
    assert.equal(clientGreeting([], { incognito: true }).text, '你正处于无痕模式');
  } finally { i18n.setLocale('en-US'); }
});

test('personalizedGreeting (shared-23 Hb) reads the local greeting table like the bootstrap table; slots per surface', () => {
  const table = [{ surface: 'chat', days: [{ day: 'wed', slots: [{ until: 12, text: 'Morning, fixture' }, { until: 24, text: 'Evening, fixture' }] }],
    default_slots: [{ until: 24, text: 'Hello, fixture' }] }];
  assert.equal(Home.personalizedGreeting(table, 'chat', new Date(2026, 10, 4, 9)), 'Morning, fixture');
  assert.equal(Home.personalizedGreeting(table, 'chat', new Date(2026, 10, 5, 9)), 'Hello, fixture');
  assert.equal(Home.personalizedGreeting(table, 'cowork', new Date(2026, 10, 4, 9)), undefined);
  assert.equal(Home.homeSurfaceSlots('cowork', false, false).setupCard, 'task_new');
  assert.equal(Home.homeSurfaceSlots('cowork', false, false).taskList, true);
});

test('SSR Cowork home: local rows, approvals and the read state through HomeHost (sidebar expanded)', () => {
  const html = renderCowork();
  // U-MARLIN (2026-11-18): the below-composer slot takes shared-19's marlin width (was the non-marlin max-w-2xl).
  assert.match(html, /<div class="surface-cowork-home mx-auto w-full max-w-\[40rem\] dock:order-2 dock:flex dock:flex-col" role="region" aria-label="Cowork tasks" aria-busy="false">/);
  assert.ok(html.includes('href="/cowork/fixture-running"'));
  assert.ok(html.includes('href="/cowork/fixture-waiting"'));
  assert.ok(html.includes('href="/cowork/fixture-unread"')); // unread (host metadata) and finished: listed until cleared
  assert.ok(!html.includes('fixture-code'));
  assert.ok(!html.includes('Fixture: weekly report')); // starred + read: the expanded sidebar lists it (QC o = !pins || collapsed)
  assert.match(html, /<h3[^>]*>Active<\/h3>/);
  assert.match(text(html), /Clear active/); // shown while a finished unread row is listed
  assert.ok(html.indexOf('fixture-waiting') < html.indexOf('fixture-running')); // KC: awaiting rows first
  assert.ok(html.indexOf('fixture-unread') < html.indexOf('fixture-running')); // GC: finished unread before the rest
  assert.match(text(html), /Permissions needed/);
  const readOnly = renderCowork({ metadata: { ...metadata, 'fixture-unread': { surface: 'cowork' } } });
  assert.doesNotMatch(text(readOnly), /Clear active|Fixture: draft memo/); // read and finished: no longer active
  assert.match(html, /data-cds="Button"/);
  assert.doesNotMatch(text(html), /Ideas for you/);
});

test('SSR Cowork home, sidebar collapsed: the pinned row joins the list under "Pinned or active"', () => {
  const html = renderCowork({ sidebarCollapsed: true });
  for (const id of ['fixture-running', 'fixture-waiting', 'fixture-pinned', 'fixture-unread']) assert.ok(html.includes(`href="/cowork/${id}"`), id);
  assert.match(html, /<h3[^>]*>Pinned or active<\/h3>/);
});

test('SSR Cowork home without rows: the list returns its lazy Ideas fallback (ssr false: nothing on the server)', () => {
  const html = renderCowork({ sessions: [], metadata: {}, state: {} });
  assert.match(html, /role="region" aria-label="Cowork tasks" aria-busy="false"><\/div>/);
});

test('Ideas (ce266b9be Le, control arm) and the catalog chunk', () => {
  const html = renderToStaticMarkup(h(CdsCore.CdsRoot, { density: 'comfortable' }, h(adapters.HomeHost.Provider, { value: { surface: 'cowork' } },
    h(Ideas.ChorusCoworkSuggestions, { standalone: true }))));
  for (const label of ['Send me a daily briefing', 'Organize my inbox', 'Customize Cowork for me']) assert.ok(text(html).includes(label), label);
  assert.equal(typeof Catalog.COWORK_HOME_IDEAS_CATALOG, 'object');
  assert.ok(Array.isArray(Catalog.COWORK_HOME_IDEAS_CATALOG.pool));
});

test('lazy entry (shared-123 W$ contract): fail-open renders nothing on a chunk error, other modes throw to the boundary', async () => {
  const failing = { id: 'fixture_entry', load: () => Promise.reject(new Error('chunk failed')) };
  const open = adapters.defineLazyEntry({ entry: failing, pick: m => m.X, options: { ssr: false, onChunkError: 'fail-open' } });
  open.handle.preload();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(renderToStaticMarkup(h(open.Component, {})), '');
  const strict = adapters.defineLazyEntry({ entry: failing, pick: m => m.X, options: { ssr: false } });
  strict.handle.preload();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.throws(() => renderToStaticMarkup(h(strict.Component, {})), /chunk failed/);
  const ok = adapters.defineLazyEntry({ entry: { id: 'fixture_ok', load: async () => ({ X: () => h('b', null, 'loaded') }) }, pick: m => m.X, options: { ssr: false, onChunkError: 'fail-open' } });
  assert.equal(renderToStaticMarkup(h(ok.Component, {})), ''); // not loaded yet: the official noFallback placeholder is nothing
  ok.handle.preload();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(renderToStaticMarkup(h(ok.Component, {})), '<b>loaded</b>');
  // The generated entry is the official one: sw passes onChunkError "fail-open".
  assert.match(fs.readFileSync(path.join(out, 'shared-23.mjs'), 'utf8'), /id: "chorus_cowork_suggestions",[\s\S]{0,400}onChunkError: "fail-open",/);
});

test('approvals map to the official predicates (kW / AW / NW over toolName AskUserQuestion)', () => {
  const ask = { id: 'a', method: 'item/tool/requestUserInput' }, cmd = { id: 'c', method: 'item/commandExecution/requestApproval' };
  assert.deepEqual(adapters.officialPendingRequest(ask), { toolUseId: 'a', toolName: 'AskUserQuestion' });
  assert.equal(adapters.sessionAwaiting([]), false);
  assert.equal(adapters.sessionAwaiting([cmd]), true);
  assert.equal(adapters.sessionOnlyQuestions([ask]), true);
  assert.equal(adapters.sessionOnlyQuestions([ask, cmd]), false);
  // The pilot's /question/i rule is gone: a method that merely mentions "question" is not AskUserQuestion.
  assert.equal(adapters.sessionOnlyQuestions([{ id: 'q', method: 'item/questionnaire/requestApproval' }]), false);
});

test('read requests: RH / WH / KH reach the host read-state owner (main.jsx updateSessionMetadata { unread })', async () => {
  const target = new EventTarget(), calls = [], errors = [];
  const actions = { current: { onMarkRead: id => calls.push(['read', id]), onMarkUnread: async id => { calls.push(['unread', id]); throw new Error('ipc'); },
    onError: error => errors.push(error.message) } };
  const stop = cowork.listenHomeReadRequests(target, actions);
  target.dispatchEvent(new CustomEvent(adapters.HOME_MARK_READ_EVENT, { detail: { sessionId: 's1' } }));
  target.dispatchEvent(new CustomEvent(adapters.HOME_MARK_UNREAD_EVENT, { detail: { sessionId: 's2' } }));
  target.dispatchEvent(new CustomEvent(adapters.HOME_MARK_READ_EVENT, { detail: {} }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, [['read', 's1'], ['unread', 's2']]);
  assert.deepEqual(errors, ['ipc']);
  stop();
  target.dispatchEvent(new CustomEvent(adapters.HOME_MARK_READ_EVENT, { detail: { sessionId: 's3' } }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.length, 2);
  // The adapters dispatch on window; the clear event keeps the 3.6556.2 name the host listens for.
  const seen = [], saved = globalThis.window.dispatchEvent;
  globalThis.window.dispatchEvent = event => { seen.push([event.type, event.detail?.sessionId]); return true; };
  try { adapters.markHomeSessionRead('x'); adapters.markHomeSessionUnread('y'); adapters.clearHomeActive(); } finally { globalThis.window.dispatchEvent = saved; }
  assert.deepEqual(seen, [['local-cowork:mark-read', 'x'], ['local-cowork:mark-unread', 'y'], ['local-cowork:clear-active', undefined]]);
  const main = read('src/main.jsx');
  assert.match(main, /onMarkRead=\{id => updateSessionMetadata\(id, \{ unread: false \}\)\} onMarkUnread=\{id => updateSessionMetadata\(id, \{ unread: true \}\)\}/);
  assert.match(main, /case "mark-read": return updateSessionMetadata\(target\.id, \{ unread: false \}\);/);
});

test('host wiring: production mounts the 4.16336.0 home; the 3.6556.2 home stays exported for the screenshot comparison', () => {
  assert.match(read('src/source-cowork-home.jsx'), /import \{ CoworkHome \} from '\.\/generated\/home-chat-cowork\/shared-23\.mjs';/);
  assert.match(read('src/source-chat-home.jsx'), /from '\.\/generated\/home-chat-cowork\/shared-23\.mjs';/);
  assert.equal(typeof cowork.SourceCoworkHomeV3, 'function');
  assert.equal('SourceChatGreetingV3' in chat, false); // chat-home-r3-03: the 3.6556.2 Chat greeting is retired (was kept for the comparison)
  assert.match(read('src/main.jsx'), /import \{ SourceCoworkHome \} from '\.\/source-cowork-home\.jsx';/);
  assert.equal(HOME_V4.sharedGraph, 'cds-core');
});
