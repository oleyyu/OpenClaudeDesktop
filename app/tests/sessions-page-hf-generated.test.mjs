// w10-ccres-hf-gen: the generated 3.6556.2 Sessions page shell (cbd6c85c8 Hf, src/generated/sessions-page) rendered on
// the Code page fixture (codeScoped) over its host adapters, plus manifest checks against the official chunk.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup as renderServerMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { sessionPageRows, sessionPageHref } from '../src/sessions-page-model.mjs';
import { ionSource, referenceSnapshot } from '../scripts/official-3.6556.2.mjs';

const root = new URL('..', import.meta.url).pathname;
const output = path.join(root, 'src/generated/sessions-page');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
const officialPage = fs.readFileSync(path.join(ionSource, 'cbd6c85c8-D1xuycDy.js'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

let server, Hf, Adapters;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Hf = await server.ssrLoadModule('/src/generated/sessions-page/sessions-page-hf.mjs');
  Adapters = await server.ssrLoadModule('/src/source-sessions-page-hf-adapters.jsx');
});
after(() => server?.close());

// As tests/sessions-page-current.test.mjs: view-tabs CdsSelectableTable reads its row selection with
// useSyncExternalStore and no server snapshot; read it the way a client's first render does.
const renderToStaticMarkup = element => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = d => { if (!d?.useSyncExternalStore) return d; if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (s, g, server) => d.useSyncExternalStore(s, g, server ?? g) }); return wrapped.get(d); };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: d => { raw = d; } });
  try { return renderServerMarkup(element); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};

const now = Date.now();
const sessions = [{ id: 'live', name: 'Live task', updatedAtMs: now }, { id: 'old', name: 'Old task', updatedAtMs: now - 1000 }, { id: 'stored', name: 'Stored task', archived: true, updatedAtMs: now + 1000 }];
const rows = [...sessionPageRows(sessions), ...sessionPageRows(sessions, { surface: 'archived' })];
// Hf hands codeRowLinkComponent `{ item: <the code session data>, link: <its router link element> }` (cbd6c85c8 Bf).
const Link = ({ item, link }) => React.cloneElement(link, { 'data-test-item': item.id });
const page = (host = {}, props = {}) => renderToStaticMarkup(React.createElement(Adapters.SessionsPageHfHost.Provider, { value: { list: { sessions: rows }, getRowHref: ref => sessionPageHref(ref.id), ...host } },
  React.createElement(Hf.SessionsPageHf, { codeScoped: true, reportsRecentsLoad: false, codeRowLinkComponent: Link, ...props })));

test('manifest pins cbd6c85c8 Hf of 3.6556.2 and every import resolves to a known kind', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, referenceSnapshot);
  assert.equal(manifest.root, 'cbd6c85c8-D1xuycDy.js:Hf');
  const hf = manifest.modules.find(m => m.target === 'sessions-page-hf.mjs');
  assert.equal(hf.source, 'cbd6c85c8-D1xuycDy.js');
  assert.equal(hf.sourceSha256, sha(officialPage));
  assert.deepEqual(hf.exports, { Hf: 'SessionsPageHf' });
  assert.ok(hf.bindings.some(b => b.name === 'Hf'));
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(fs.readFileSync(path.join(ionSource, module.source))), module.target);
    assert.equal(module.sha256, sha(fs.readFileSync(path.join(output, module.target))), module.target);
    for (const i of module.imports) assert.ok(['react', 'generated', 'held', 'adapter'].includes(i.kind), `${module.target} ${i.local}`);
  }
  // code-current holds the Sessions pieces it already generated (one copy each: rows, bulk actions, selection bar, copy).
  const held = new Set(hf.imports.filter(i => i.kind === 'held' && i.area === 'code-current').map(i => i.original));
  for (const local of ['dp', 'Od', 'Dd', 'Jd', 'Yd', 'Kd', 'Af', 'jf', 'Nf', 'Pf', '$u']) assert.ok(held.has(`cbd6c85c8-D1xuycDy.js:${local}`), local);
  // The served recents search chunk is generated as its official failure branch.
  assert.deepEqual(hf.rewrites.map(r => r.original), ['import("./cf9da38bc-CzmE6ktB.js")', '__vite__mapDeps([0])']);
  // The official top-level registration `var Tf=new Map;J(()=>Tf.clear());` is kept: J is shared-52 Xi (exported Jx),
  // the sign-out reset registry, standing in as the host adapter registerSessionsReset.
  assert.ok(officialPage.toString().includes('var Tf=new Map;J(()=>Tf.clear());function Ef('));
  assert.deepEqual(hf.statements.map(s => s.text), ['J(() => Tf.clear());']);
  const reset = hf.imports.find(i => i.local === 'J');
  assert.deepEqual({ name: reset.name, kind: reset.kind, original: reset.original, via: reset.via },
    { name: 'registerSessionsReset', kind: 'adapter', original: 'shared-52-uHFNjl7C.js:Xi', via: 'shared-52-uHFNjl7C.js:Jx' });
  assert.match(fs.readFileSync(path.join(output, 'sessions-page-hf.mjs'), 'utf8'), /var Tf = new Map\(\);\nJ\(\(\) => Tf\.clear\(\)\);/);
  // Compiler helpers come from view-tabs by semantic name (R3/R6), never by minified name.
  const text = fs.readFileSync(path.join(output, 'sessions-page-hf.mjs'), 'utf8');
  assert.match(text, /reactMemoCache as J9/);
  assert.doesNotMatch(text, /from "\.\.\/view-tabs\/index\.js"/);
  assert.match(text, /function Hf\(e\) \{\n  let \$ = J9\(537\)/);
  // D1 (w11-sweep-ccres): shared-0 ra is imported from the copy cowork-home already holds, not sliced a second time.
  const ra = hf.imports.find(i => i.original === 'shared-0-DDOOdL6P.js:ra');
  assert.deepEqual({ kind: ra.kind, area: ra.area, from: ra.from, name: ra.name },
    { kind: 'held', area: 'cowork-home', from: '../cowork-home/shared-0-DDOOdL6P.mjs', name: 'ra' });
  assert.ok(!manifest.modules.some(m => m.target !== 'sessions-page-hf.mjs' && m.source === 'shared-0-DDOOdL6P.js' && m.bindings.some(b => b.name === 'ra')));
});

test('Code page: Active/Archived tabs, "Search sessions", Code rows and the official shell', () => {
  const html = page();
  assert.match(html, /role="tablist"/);
  assert.match(html, />Active</);
  assert.match(html, />Archived</);
  assert.match(html, /Search sessions/);
  assert.match(html, /Live task/);
  assert.match(html, /Old task/);
  assert.doesNotMatch(html, /Stored task/);
  assert.match(html, /<table/);
  assert.match(html, /<a href="#code-session\/live" data-primary="true" aria-label="Live task"[^>]*data-test-item="live">/);
  // The primary New session action is official (shared-25 link to the Code start route).
  assert.match(html, />New session</);
  assert.doesNotMatch(html, /Couldn’t load your sessions|Sessions loaded\.|Searching…/);
  // The CdsPage shell and its title (w11-sweep-ccres: hf-gen restored item, now pinned).
  assert.match(html, /data-cds="Page"/);
  assert.match(html, /data-cds="PageHeader"/);
  assert.match(html, /<h1[^>]*>Sessions<\/h1>/);
});

test('loadArchivedSessions (shared-8 __) asks the host of the committed page, never one written during render', () => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, saved = internals.H;
  const calls = [], effects = [];
  const host = { list: {}, loadArchivedSessions: () => calls.push('page') };
  internals.H = { useContext: () => host, useMemo: f => f(), useLayoutEffect: f => effects.push(f) };
  try { Adapters.useSessionsPageList(); } finally { internals.H = saved; }
  Adapters.loadArchivedSessions();
  assert.deepEqual(calls, [], 'a render alone registers nothing');
  const cleanup = effects[0]();
  Adapters.loadArchivedSessions();
  assert.deepEqual(calls, ['page']);
  cleanup();
  Adapters.loadArchivedSessions();
  assert.deepEqual(calls, ['page']);
});

test('Code page: empty state paragraph uses the official classes', () => {
  const html = page({ list: { sessions: [] } });
  assert.match(html, /<p class="text-body text-muted-as-secondary whitespace-normal wrap-anywhere">/);
  assert.match(html, /Sessions you start will show up here\./);
});

test('Code page: ?surface=archived selects the Archived tab and its rows (cbd6c85c8 ef / Qd "surface")', () => {
  const html = page({ search: 'surface=archived' });
  assert.match(html, /aria-selected="true" id="[^"]*-archived"/);
  assert.match(html, /Stored task/);
  assert.doesNotMatch(html, /Live task/);
  // A surface Code does not offer falls back to the Code default (Hf: `H = oe.includes(F) ? F : P`).
  assert.match(page({ search: 'surface=chat' }), /aria-selected="true" id="[^"]*-code"/);
});
