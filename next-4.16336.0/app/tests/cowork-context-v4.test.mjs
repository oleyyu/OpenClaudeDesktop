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
import { extractCoworkContextV4, ROOTS, HOST_ADAPTERS, LINKED_AREAS, REQUIRED_LINKS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-cowork-context-v4.mjs';
import { coworkContextData } from '../src/cowork-context-model.mjs';

// round2 unit cowork-context: the 4.16336.0 Context section of the Cowork activity panel (c21f11e6d gE) and its
// "Suggested connectors" card (FT) (scripts/extract-cowork-context-v4.mjs -> src/generated/cowork-context-v4, staged next
// to the 3.6556.2 src/generated/cowork-context the host still renders), over the existing host adapters
// (src/source-cowork-context-adapters.jsx) and the session data src/cowork-context-model.mjs derives, inside the
// cowork-progress-v4 panel. Source only: manifest, the generator's --check, the official chunk text, D1 links, SSR via Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/cowork-context-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const PANEL = 'c21f11e6d-Cyj5xu_D.js';

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, gen, panel, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  panel = await server.ssrLoadModule('/src/generated/cowork-progress-v4/index.mjs');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-cowork-context-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-context-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, LINKED_AREAS);
  assert.deepEqual(LINKED_AREAS, ['cowork-progress-v4', 'cowork-runs-v4', 'cowork-session-states-v4', 'cowork-session-actions', 'cowork-live-v4', 'routines-shared-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, pinned] of Object.entries(provenance.linkedAreas)) {
    assert.equal(JSON.parse(local(`src/generated/${area}/manifest.json`)).referenceVersion, '4.16336.0', area);
    assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), pinned, area);
  }
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractCoworkContextV4({ check: true });
});

test('roots: the 3.6556.2 semantic names, AST-located and pinned; the panel mounts them as pinned', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`), [`${PANEL}#gE=CoworkContextSection`, `${PANEL}#FT=CoworkSuggestedConnectorsCard`]);
  assert.ok(provenance.roots.every(r => r.pinned && r.export === null), 'chunk-internal, pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  // Same public names as the 3.6556.2 graph (nothing removed upstream).
  assert.deepEqual(Object.keys(JSON.parse(local('src/generated/cowork-context/manifest.json')).publicNames).sort(), provenance.roots.map(r => r.name).sort());
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
  const c21 = official(PANEL);
  for (const s of ['defaultMessage:"Used in this session",id:"d2ykzrGcrl"', 'defaultMessage:"Context",id:"Qrvq7+mBse"',
    'defaultMessage:"Track tools and referenced files used in this task.",id:"WXQkdiBWrh"',
    'src:"/images/illustrations/session-context.svg",darkSrc:"/images/illustrations/session-context-dark.svg",width:114,height:56',
    'defaultMessage:"Suggested connectors",id:"4lWgUGlrk4"', 'defaultMessage:"See all connectors",id:"7fCBPXAUhO"', 'ja&&p(gE,{groupContextByKind:Ne,'])
    assert.equal(c21.split(s).length - 1, 1, s);
  assert.deepEqual(manifest.callSites.map(c => c.source), [PANEL, PANEL, PANEL, PANEL]);
});

test('groupContextByKind: xE defaults it to false and no 4.16336.0 chunk passes it (the kind groups stay unmounted)', () => {
  const hits = fs.readdirSync(path.join(ion, 'assets/v1')).filter(n => n.endsWith('.js')).flatMap(n => Array(official(n).split('groupContextByKind').length - 1).fill(n));
  // gE's destructure, xE's destructure and xE's p(gE,{groupContextByKind:Ne,…}): no caller of xE names it.
  assert.deepEqual(hits, [PANEL, PANEL, PANEL]);
  assert.ok(official(PANEL).includes('Ne=L!==void 0&&L'));
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', async () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'c21f11e6d#Qy=CoworkAddFolderAction', 'c21f11e6d#mT=CoworkMountedProjects', 'c21f11e6d#sT=CoworkContextKindGroupsWithBrowser',
    'c21f11e6d#iT=CoworkContextKindGroups', 'c21f11e6d#iC=CoworkRemoteContextSources', 'c21f11e6d#IT=CoworkSuggestedConnectors',
    'shared-36#Db=ConnectorServerIcon', 'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-cowork-context-v4-adapters.jsx');
  const adapterText = local('src/source-cowork-context-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-cowork-context-adapters.jsx', './source-routine-cowork-adapters.jsx', './source-routines-shared-adapters.jsx']);
  // The closed branches: each existing adapter answers the original's null branch for a local session.
  const v4 = await server.ssrLoadModule('/src/source-cowork-context-v4-adapters.jsx');
  for (const name of ['CoworkAddFolderAction', 'CoworkMountedProjects', 'CoworkContextKindGroups', 'CoworkContextKindGroupsWithBrowser',
    'CoworkRemoteContextSources', 'CoworkSuggestedConnectors'])
    assert.equal(v4[name]({}), null, name);
  // IT's own null branch without directory servers (pinned raw in the manifest call sites).
  assert.ok(official(PANEL).includes('Xe=O.length>0;if(!T||!Xe||y||He||ze||Le.length===0||Ke)return null;'));
});

test('D1: the activity list, its illustration frame, the panel Section and the browser row are linked, never cut again', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area holds is cut here');
  assert.deepEqual(provenance.linkedCopies, {});
  assert.deepEqual(manifest.modules.map(m => `${m.target}:${m.bindings.map(b => b.name).sort().join(',')}`).sort(),
    ['c21f11e6d.mjs:FT,MT,NT,PT,gE,hE,jT,mE,rE,sE', 'shared-33.mjs:bR,yR']);
  const imports = new Map(manifest.modules.flatMap(m => m.imports).map(i => [i.local, i]));
  for (const [name, from, exported] of [['eC', '../cowork-progress-v4/c21f11e6d.mjs', 'eC'], ['iE', '../cowork-progress-v4/c21f11e6d.mjs', 'iE'],
    ['t_', '../cowork-progress-v4/cc5a62f6f.mjs', 'CoworkPanelSection'], ['$g', '../cowork-progress-v4/cc5a62f6f.mjs', 'k'],
    ['Kb', '../cowork-live-v4/c21f11e6d.mjs', 'CoworkInAppBrowserSection']]) {
    assert.equal(imports.get(name)?.from, from, name);
    assert.equal(imports.get(name)?.name, exported, name);
  }
  assert.deepEqual(Object.values(REQUIRED_LINKS).sort(), ['cowork-live-v4', 'cowork-progress-v4', 'cowork-progress-v4', 'cowork-progress-v4', 'cowork-progress-v4']);
  // cowork-progress-v4 exports eC / iE for this graph (its linkExports).
  const progress = JSON.parse(local('src/generated/cowork-progress-v4/manifest.json')).modules.find(m => m.source === PANEL);
  assert.deepEqual(progress.linkExports, ['eC', 'iE']);
  // hE's ResizeObserver comes from cds-core (getResizeObserverClass), not a copy of shared-25.
  assert.equal(imports.get('St')?.from, '../cds-core/shared-25.mjs');
  assert.equal(imports.get('St')?.name, 'getResizeObserverClass');
});

// chat-cowork-1to1 r1 (cowork-r1-01): the panel host (source-surfaces.jsx) is cut over to the -v4 graph; the 3.6556.2
// output stays for its other readers, and no other host file imports the -v4 graph.
test('the double output after the cutover: only the panel host reads the -v4 graph', () => {
  assert.equal(JSON.parse(local('src/generated/cowork-context/manifest.json')).referenceVersion, '3.6556.2');
  for (const name of fs.readdirSync(path.join(app, 'src'))) {
    if (!/\.(jsx|mjs|js)$/.test(name) || name === 'source-cowork-context-v4-adapters.jsx' || name === 'source-surfaces.jsx') continue;
    assert.ok(!local(`src/${name}`).includes('generated/cowork-context-v4'), `src/${name} does not import the staged graph`);
  }
  assert.match(local('src/source-surfaces.jsx'), /from '\.\/generated\/cowork-context-v4\/index\.mjs';/);
});

const cwd = '/Users/me/Work';
const props = { isContextExpanded: true, setIsContextExpanded() {}, contextSeedSnap: false, conversationUuid: 's1', headerHostedToggle: false,
  onRevealStep() {}, canRevealStep: () => true, handleContextActivityClick() {}, handleKindRowSkillOpen: undefined, selectedPath: undefined,
  coworkBrowserPreviewId: undefined, isCoworkBrowserPaneOpen: false, handleToggleCoworkBrowserPane() {} };
const section = (data, { flat = false, ...extra } = {}) => renderToStaticMarkup(h(panel.CoworkPanelLayoutContext.Provider,
  { value: flat ? panel.coworkPanelFlatLayout : panel.coworkPanelCardLayout },
  h(panel.CoworkPanel, {}, h(gen.CoworkContextSection, { ...props, ...data, ...(flat ? { headerHostedToggle: true } : {}), ...extra }))));

test('SSR: no activity — "Context", the official empty body over the session-context art, no suggested connectors', () => {
  const html = section(coworkContextData({ cwd, sessionId: 's1', items: [] }));
  const words = text(html);
  assert.match(words, /^Context /, words);
  assert.ok(words.includes('Track tools and referenced files used in this task.'), words);
  assert.ok(html.includes('<p class="text-muted-as-secondary text-caption-regular font-sans">'), 'mE copy class');
  assert.ok(html.includes('background-image:url(/images/illustrations/session-context.svg)'), 'sE art (iE light)');
  assert.ok(html.includes('background-image:url(/images/illustrations/session-context-dark.svg)'), 'sE art (iE dark)');
  assert.ok(html.includes('<div class="flex flex-col flex-1 min-h-0">'), 'hE (not inside an embedded artifact)');
  assert.ok(!words.includes('Suggested connectors'), 'IT: no connector directory, the original returns null');
  assert.ok(!words.includes('Used in this session'));
  assert.ok(html.includes('data-section-header=""') && html.includes('aria-expanded="true"'));
});

test('SSR: MCP tools, a skill and a web search — the activity list eC with category headers, no empty body', () => {
  const items = [
    { id: 'm1', type: 'mcpToolCall', server: 'github', tool: 'search_issues', status: 'completed', arguments: { q: 'x' }, result: { content: [] } },
    { id: 'm2', type: 'mcpToolCall', server: 'github', tool: 'get_issue', status: 'completed', result: { content: [] } },
    { id: 'm3', type: 'mcpToolCall', server: 'linear', tool: 'list_issues', status: 'completed', result: { content: [] } },
    { id: 'own', type: 'mcpToolCall', server: 'code_desktop', tool: 'chrome_navigate', status: 'completed' },
    { id: 's1', type: 'dynamicToolCall', tool: 'skill', arguments: { name: 'pdf' }, status: 'completed' },
    { id: 'w1', type: 'webSearch', query: 'release notes', action: { type: 'search', query: 'release notes' } },
    { id: 'f1', type: 'fileChange', status: 'completed', changes: [{ path: 'notes.md', kind: { type: 'add' } }] },
  ];
  const data = coworkContextData({ cwd, sessionId: 's1', items });
  assert.equal(data.contextResourceActivity.length, 5, 'own server and plain files stay out of Context');
  const html = section(data);
  const words = text(html);
  assert.match(words, /^Context /, words);
  assert.ok(!words.includes('Track tools and referenced files used in this task.'), words);
  assert.ok(words.includes('Connectors') && words.includes('Skills'), words);
  assert.ok(html.includes('aria-label="3 connectors"'), 'the card layout piles the connectors (JS: connectors && !flat)');
  assert.ok(/pdf/i.test(words), words);
  assert.ok(!/chrome_navigate|notes\.md/.test(html));
  // Flat (header-hosted) layout: no category headers (QS `C = !S && …`), each row carries its kind instead.
  const flat = section(data, { flat: true });
  assert.ok(flat.includes('data-section-header=""'));
  const flatWords = text(flat);
  assert.ok(!flatWords.includes('Connectors') && !flatWords.includes('Skills'), flatWords);
  assert.ok(flatWords.includes('github Connector') && flatWords.includes('linear Connector') && flatWords.includes('pdf Skill'), flatWords);
});

test('SSR: the "Suggested connectors" card FT (the official markup, generated for when a directory exists)', () => {
  const connectors = [{ id: 'notion', name: 'Notion', description: 'Search and update your Notion pages and databases', iconType: 'favicon', iconSrc: 'n.png', isConnected: false, onClick() {} },
    { id: 'linear', name: 'Linear', description: 'Create, update, and track issues in Linear', iconType: 'favicon', iconSrc: 'l.png', isConnected: false, onClick() {} }];
  const html = renderToStaticMarkup(h(gen.CoworkSuggestedConnectorsCard, { isReady: true, hasAppeared: true, setHasAppeared() {}, connectors,
    clickedConnectors: new Set(), isPending: false, handleDismiss() {}, handleAddConnector() {}, handleSeeAllConnectors() {}, isCycling: false, showDescription: true }));
  const words = text(html);
  assert.ok(words.startsWith('Suggested connectors'), words);
  assert.ok(html.includes('aria-label="Dismiss suggested connectors"'));
  assert.ok(words.includes('See all connectors') && words.includes('Notion') && words.includes('Linear'), words);
  assert.ok(words.includes('Cowork uses connectors to browse websites, manage tasks, and more.'), words);
  assert.ok(html.includes('-mx-3 mt-auto border-t-0.5 border-border-300 transition-opacity duration-200 opacity-100'));
});

test('SSR zh-CN: the section title and the empty body copy are translated', () => {
  i18n.setLocale('zh-CN');
  try {
    const html = section(coworkContextData({ cwd, sessionId: 's1', items: [] }));
    assert.notEqual(i18n.t('Context'), 'Context');
    assert.ok(html.includes(`>${i18n.t('Context')}<`), html.slice(0, 400));
    assert.ok(text(html).includes(i18n.t('Track tools and referenced files used in this task.')));
  } finally { i18n.setLocale('en-US'); }
});
