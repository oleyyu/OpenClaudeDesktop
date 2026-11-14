import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { conciseCopy } from '../electron/i18n/concise.mjs';
import { extractCoworkSettingsV4, ROOTS, ROOT_PINS, HOST_ADAPTERS, ADAPTER_PINS, CDS_CORE_MANIFEST_SHA256, PAGE } from '../scripts/extract-cowork-settings-v4.mjs';

// claude-4.16336.0-migrate-20261104 round 2, region cowork-settings: Settings › Cowork, the 4.16336.0 c71860c77 Q page
// (scripts/extract-cowork-settings-v4.mjs -> src/generated/cowork-settings-v4), staged next to the 3.6556.2
// src/generated/cowork-settings the host page still renders (no production switch before batch 9). Fed from the same local
// preferences host (src/source-cowork-settings-adapters.jsx) through src/source-cowork-settings-v4-adapters.jsx. Source
// only: manifest, the generator's --check, the official chunk text, D1 links, and SSR through Vite; no browser, no network.
//
// Round 3 (rl-settings, after cds-core wave 7 79b004e0): frame-sidebar-nav evaluates in isolation now (vendor-zod k / Ne / O /
// M / z are cds-core's, W7-D2), so this page's modules load and the server render runs until the first frame-sidebar-nav
// host boundary: the remote device list (c79197f2b Be -> c2d87f9e7 o -> frame-sidebar-nav shared-25 sd) asks the nav host
// for useRouterState. That table is installed only by src/frame-sidebar-nav-host.jsx, which cannot load yet: its nav body
// (generated/frame-sidebar-nav/shared-140) calls defineLazyEntry at module load, before installFrameSidebarNavHost runs, and
// main.jsx does not mount the nav (rl-sidebar-wave8-prep). The full SSR of the sections stays `todo` for that (BLOCKED).
// The production switch (S10) is held as well: the frame-sidebar-nav bindings this page links statically reach three of
// the 54 frame-sidebar-nav import-write writers (shared-0 K$ via H9 -> A9, mC / bC via H -> Zw -> pC, the o11y path;
// analysis round3/relink/rl-settings/logs/s10-reach.json), so the host keeps the 3.6556.2 graph until wave 8 (W7-D3).
const BLOCKED = 'wave 8: the frame-sidebar-nav host table (src/frame-sidebar-nav-host.jsx) cannot be installed (nav body shared-140 calls defineLazyEntry at module load) and nav writers K$ / mC / bC are reachable (W7-D3)';
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const out = 'src/generated/cowork-settings-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const once = (haystack, needle) => assert.equal(haystack.split(needle).length - 1, 1, needle);

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, gen, host, shared, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });
async function load() {
  i18n ??= await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  host ??= await server.ssrLoadModule('/src/source-cowork-settings-adapters.jsx');
  shared ??= await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  gen ??= await server.ssrLoadModule(`/${out}/index.mjs`);
}

// Every write in the generated modules to an imported binding (an ES live binding is read-only: the write throws).
function importWrites(dir) {
  const babel = createRequire(import.meta.url)('../../tools/node_modules/playwright/lib/transform/babelBundle.js');
  const hits = [];
  for (const f of fs.readdirSync(dir).filter(f => /\.m?js$/.test(f))) {
    const check = (p, name) => { const b = p.scope.getBinding(name); if (b?.kind === 'module') hits.push(`${f}: ${name} <- ${b.path.parent.source.value}`); };
    babel.traverse(babel.babelParse(fs.readFileSync(path.join(dir, f), 'utf8'), f, true), {
      AssignmentExpression(p) { for (const n of Object.keys(p.getBindingIdentifiers())) check(p, n); },
      UpdateExpression(p) { if (p.node.argument.type === 'Identifier') check(p, p.node.argument.name); },
    });
  }
  return hits;
}

// The 4.16336.0 page under the same host value the 3.6556.2 host page builds (src/source-cowork-settings.jsx).
function render(config = {}, { call = async () => undefined, onSave = async () => {} } = {}) {
  const Page = () => {
    const value = host.useCoworkSettingsHostValue({ config, call, onSave });
    return h(host.CoworkSettingsHostProvider, { value }, h(gen.CoworkSettingsPage, { deepLinkHeld: false }));
  };
  return renderToStaticMarkup(h(shared.RoutinesSharedHost.Provider, { value: { navigate() {}, pathname: '/settings/cowork', search: '', bridge: undefined, models: [] } }, h(Page)));
}
const order = (haystack, needles) => {
  let at = -1;
  for (const needle of needles) {
    const next = haystack.indexOf(needle, at + 1);
    assert.ok(next > at, `${JSON.stringify(needle)} after position ${at}`);
    at = next;
  }
};

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-cowork-settings-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-settings-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['frame-sidebar-nav', 'settings-nav', 'cowork-scheduled-v4', 'routines-shared-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, pinned] of Object.entries(provenance.linkedAreas))
    assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), pinned, area);
  assert.equal(manifest.modules.length, 31);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  // No lazy chunk is entered: the pictogram def loaders (shared-1 R$ -> c79901f9f) stay behind the K$ host boundary.
  for (const mod of manifest.modules) assert.doesNotMatch(local(`${out}/${mod.target}`), /\bimport\(/, mod.target);
  await extractCoworkSettingsV4({ check: true });
});

test('root: c71860c77 Q, AST-located, chunk-internal and pinned; W mounts it with the held deep link', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`), ['c71860c77-iq75iE8v.js#Q=CoworkSettingsPage']);
  const [r] = provenance.roots;
  assert.ok(r.pinned && r.export === null);
  assert.equal(r.declarationSha256, ROOT_PINS[`${r.file}#${r.local}`]);
  assert.equal(PAGE, 'c71860c77-iq75iE8v.js');
  const page = official(PAGE);
  once(page, ROOTS[PAGE].Q.probe);
  once(page, 'e(Q,{deepLinkHeld:r})');
  once(official('cc011544b-CT2WxCJo.js'), 'cowork:Q("cowork",()=>e(()=>import("./c71860c77-iq75iE8v.js"),__vite__mapDeps([0,1])))');
  // Same public name as the 3.6556.2 graph.
  assert.deepEqual(Object.keys(JSON.parse(local('src/generated/cowork-settings/manifest.json')).publicNames), ['CoworkSettingsPage']);
  assert.match(local(`${out}/index.mjs`), /^export \{ CoworkSettingsPage \} from "\.\/c71860c77\.mjs";$/m);
});

test('the 4.16336.0 section order, pinned on the minified page (re-checked against 3.6556.2: Memory left the page)', () => {
  const page = official(PAGE);
  for (const raw of [
    'children:[e(V,{}),_&&e(B,{}),_&&e(z,{}),e(I,{}),e(F,{}),_&&e(H,{}),e(k,{}),p&&e(M,{}),g&&e(N,{})]',
    't("main",{className:"flex flex-col gap-7",children:[v,y,b]})', 'children:[n,r,a,o,s,c]', 'p=u&&f,g=u&&!f,_=h().onThisDevice',
    'import{n as k,r as A,t as j}from"./c79197f2b-BIMApRGi.js"', 'import{n as M,t as N}from"./ced6780ff-BmLhI5uX.js"',
    'import{a as P,r as F,t as I}from"./cabd7b1c1-CAF7rZLU.js"', 'import{n as L,t as R}from"./cdc95db1a-Dwi18fP3.js"',
    'import{n as z,t as B}from"./cfea69990-Cqha5dsf.js"'])
    once(page, raw);
  // 3.6556.2 De mounted Memory (me) last; 4.16336.0 Q has no memory section.
  assert.ok(!page.includes('Use memory in sessions'));
  assert.deepEqual(manifest.callSites.map(c => c.source), ['cc011544b-CT2WxCJo.js', PAGE, PAGE, PAGE, PAGE, 'cfea69990-Cqha5dsf.js', 'cfea69990-Cqha5dsf.js',
    'shared-55-BRv2XBP7.js', 'ca25db325-CVWdSFl1.js']);
  assert.deepEqual(provenance.previous.removedSections, ['c71860c77 me (Memory: "Use memory in sessions")']);
});

test('host boundaries: each adapted original pinned; re-exports come from the host adapter that documents them', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  for (const a of provenance.adapters) {
    assert.ok(a.pinned, a.original);
    assert.equal(a.declarationSha256, ADAPTER_PINS[a.original], a.original);
    assert.equal(a.hostAdapter, HOST_ADAPTERS[a.original].from, a.original);
  }
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-cowork-settings-v4-adapters.jsx');
  const adapterText = local('src/source-cowork-settings-v4-adapters.jsx');
  assert.deepEqual([...adapterText.matchAll(/from '([^']+)'/g)].map(m => m[1]),
    ['react', './source-pictogram.jsx', './source-cowork-settings-adapters.jsx', './source-routines-shared-adapters.jsx', './source-code-routines-v4-adapters.jsx']);
  // The new answers are service boundaries only: none of them is a section component of the page.
  const defined = [...adapterText.matchAll(/^export (?:const|function) ([\w$]+)/gm)].map(m => m[1]);
  assert.deepEqual(defined.filter(n => /^[A-Z]/.test(n)), ['NamedPictogram']);
  for (const section of ['c79197f2b-BIMApRGi.js', 'cabd7b1c1-CAF7rZLU.js', 'cdc95db1a-Dwi18fP3.js', 'ced6780ff-BmLhI5uX.js', 'cfea69990-Cqha5dsf.js'])
    assert.ok(manifest.modules.some(m => m.source === section && m.bindings.length > 0), `${section} is cut, not adapted`);
});

test('D1: bindings the linked areas hold are imported from them, never cut again; only the reviewed pure copies', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)).sort(), Object.keys(provenance.linkedCopies).sort(), 'only the pure linkedCopies are cut again');
  for (const why of Object.values(provenance.linkedCopies)) assert.match(why, /^pure: /);
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1]));
  for (const area of manifest.linkedAreas) assert.ok(linked.includes(area), `links ${area}`);
  // The 3.6556.2 shared-78 K context reader (4.16336.0 shared-123 q) is cowork-scheduled-v4's; the settings modal store
  // (shared-183 yg) settings-nav's.
  const q = manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'linked' && i.from.startsWith('../cowork-scheduled-v4/shared-123'));
  assert.ok(q.length > 0, 'shared-123 is linked from cowork-scheduled-v4');
  const store = manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'linked' && i.from.startsWith('../settings-nav/'));
  assert.deepEqual([...new Set(store.map(i => `${i.from}#${i.name}`))], ['../settings-nav/settings-store.mjs#settingsModalStore'], 'shared-183 yg from settings-nav');
  // No stateful module binding is held twice: shared-8 PC (the only createContext this graph cuts outside the page chunks)
  // is held by no linked area.
  for (const key of own) if (/^shared-8-/.test(key)) assert.ok(!held.has(key), key);
  // What this graph reads from frame-sidebar-nav (the reviewed list; see the round 3 note above).
  const fromNav = new Set(manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'linked' && i.from.startsWith('../frame-sidebar-nav/'))
    .map(i => `${i.from.split('/')[2].replace(/(-[\w-]{8})?\.(m?js)$/, '')}#${i.name}`));
  // cds-core wave 8 (W8-M1, W7-D3 ruling (a)): shared-0 H (trackEvent) is the official one cds-core publishes
  // (o11y_shared0_H), linked from cds-core, no longer from frame-sidebar-nav (was: 'shared-0#H' in this list).
  assert.deepEqual([...fromNav].sort(), ['shared-0#F8', 'shared-0#H9', 'shared-0#L0', 'shared-0#OV', 'shared-0#U0', 'shared-0#gte', 'shared-0#wY',
    'shared-153#wC', 'shared-212#Pw', 'shared-25#fs', 'shared-25#ms', 'shared-25#nd', 'shared-25#sd', 'shared-25#wq', 'shared-33#mI', 'shared-62#FD', 'shared-62#RD']);
  const h = manifest.modules.flatMap(m => m.imports).filter(i => i.original === 'H' && /\/shared-0\.mjs$/.test(i.from));
  assert.deepEqual([...new Set(h.map(i => `${i.kind} ${i.from} ${i.name}`))], ['shared-graph ../cds-core/shared-0.mjs H'], 'shared-0 H from cds-core');
  assert.equal(JSON.parse(local('src/generated/cds-core/manifest.json')).publicNames.o11y_shared0_H.exportName, 'H');
});

test('D1 writer contract: no binding this graph cuts writes another module\'s state', () => {
  assert.deepEqual(importWrites(path.join(app, out)), []);
});

test('the staged double output: the 3.6556.2 graph and generator are still the ones the host reads', () => {
  const old = JSON.parse(local('src/generated/cowork-settings/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  assert.equal(old.generator, 'scripts/extract-cowork-settings.mjs');
  assert.match(local('src/source-cowork-settings.jsx'), /from '\.\/generated\/cowork-settings\/index\.mjs'/);
  for (const name of fs.readdirSync(path.join(app, 'src'))) {
    if (!/\.(jsx|mjs|js)$/.test(name)) continue;
    assert.doesNotMatch(local(`src/${name}`), /from ['"][^'"]*generated\/cowork-settings-v4/, `src/${name} does not import the staged graph`);
  }
});

test('frame-sidebar-nav loads in isolation (wave 7): the page module evaluates; Q is the official memo; the server render stops at the nav host boundary useRouterState', async () => {
  await load();
  // c71860c77 `Q=i(n=>{…})` with vendor-frame `co as i` = React.memo: the page is a memo type around the official function.
  assert.equal(gen.CoworkSettingsPage.$$typeof, Symbol.for('react.memo'));
  assert.equal(typeof gen.CoworkSettingsPage.type, 'function');
  once(official(PAGE), 'Q=i(n=>{');
  // c79197f2b Be (remote device list) -> c2d87f9e7 o -> frame-sidebar-nav shared-25 sd: the first nav host capability read.
  assert.throws(() => render({ customInstructions: { enabled: true, global: 'Be brief.', projects: {} } }),
    /^Error: frame-sidebar-nav host capability useRouterState is not provided \(scripts\/extract-frame-sidebar-nav\.mjs boundaries\)$/);
  const be = local(`${out}/c2d87f9e7.mjs`);
  assert.match(be, /from "\.\.\/frame-sidebar-nav\/shared-25-D-aF0gt9\.js"/);
});

test('SSR on this computer: main.flex.flex-col.gap-7, the official sections in Q order and copy, account rows closed', { todo: BLOCKED }, async () => {
  await load();
  await server.ssrLoadModule('/src/frame-sidebar-nav-host.jsx'); // installs the nav host table (installFrameSidebarNavHost)
  const html = render({ customInstructions: { enabled: true, global: 'Be brief.', projects: {} } });
  assert.ok(html.startsWith('<main class="flex flex-col gap-7">'), html.slice(0, 120));
  const shown = text(html);
  order(shown, ['Trusted Cowork folders', 'Manage', 'Open links in built-in browser', 'Allowed sites', 'Manage', 'Global instructions', 'Edit']);
  const copy = [
    ['cabd7b1c1-CAF7rZLU.js', 'Trusted Cowork folders'],
    ['cdc95db1a-Dwi18fP3.js', 'Links open in the built-in browser instead of your default browser.'],
    ['cdc95db1a-Dwi18fP3.js', 'Sites where Claude can use its Browser tools without a permission prompt.'],
    ['ced6780ff-BmLhI5uX.js', 'Instructions here apply to all Cowork sessions. Use this for preferences, conventions, or context that Claude should always know.'],
  ];
  // U-SET-LITE: a long official sentence renders its short line (concise.mjs); a title without one renders as is.
  for (const [file, message] of copy) {
    assert.ok(official(file).includes(`defaultMessage:"${message}"`), `${file} has ${message}`);
    const line = conciseCopy(message, 'en-US') ?? message;
    assert.ok(shown.includes(line), `shown: ${line}`);
  }
  assert.ok(!shown.includes('Links open in the built-in browser instead of your default browser.'), 'the long sentence is gone');
  // The account-only rows take their official closed branch (no account, no organization, no sessions bridge).
  for (const absent of ['Dispatch', 'Require trusted devices', 'guest pass', 'Cowork isn’t enabled for your organization', 'Use memory in sessions'])
    assert.ok(!shown.includes(absent), absent);
});
