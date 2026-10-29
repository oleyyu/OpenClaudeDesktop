import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCoworkContext } from '../scripts/extract-cowork-context.mjs';
import { coworkContextData } from '../src/cowork-context-model.mjs';

// w13-coworkui-context (cwui-19 / cwui-20): the 3.6556.2 Context section of the Cowork activity panel
// (scripts/extract-cowork-context.mjs: c21f11e6d TT with its empty body CT/wT and the "Suggested connectors" card Gw)
// over src/source-cowork-context-adapters.jsx, its rows from cowork-progress (mS). Source only: manifest, the generator's
// --check, the official chunk text and SSR. No browser, no network; the official chunks are read, never executed.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(snapshot, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const manifest = JSON.parse(local('src/generated/cowork-context/manifest.json'));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, gen, panel;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/cowork-context/index.mjs');
  panel = await server.ssrLoadModule('/src/generated/cowork-progress/index.mjs');
});
after(() => server?.close());

test('manifest: 3.6556.2 snapshot, chunk and illustration hashes, the roots, adapters and linked imports', async () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifest.generator, 'scripts/extract-cowork-context.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-context-adapters.jsx');
  for (const mod of manifest.modules) {
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(snapshot, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`src/generated/cowork-context/${mod.target}`)), mod.target);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.publicNames).map(([name, e]) => [name, `${e.file}#${e.local}`])), {
    CoworkContextSection: 'c21f11e6d-Cyd8_HO8.js#TT', CoworkSuggestedConnectorsCard: 'c21f11e6d-Cyd8_HO8.js#Gw' });
  assert.deepEqual(manifest.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'c21f11e6d#Fy=CoworkAddFolderAction', 'c21f11e6d#ww=CoworkMountedProjects', 'c21f11e6d#_w=CoworkContextKindGroupsWithBrowser',
    'c21f11e6d#mw=CoworkContextKindGroups', 'c21f11e6d#_S=CoworkRemoteContextSources',
    'c21f11e6d#Kw=CoworkSuggestedConnectors']);
  // D1: the Section, the activity list and the art helper are cowork-progress's single copy.
  const linked = manifest.linkedImports.map(l => `${l.original.replace(/-[\w-]{8}\.js#/, '#')}<${l.from}`);
  // The built-in browser row Ab is cowork-live's slice (CoworkInAppBrowserSection), not an adapter (w13-close-gen-dedup).
  for (const want of ['c21f11e6d#mS<../cowork-progress/c21f11e6d-Cyd8_HO8.mjs', 'c21f11e6d#pT<../cowork-progress/c21f11e6d-Cyd8_HO8.mjs',
    'cc5a62f6f#L<../cowork-progress/cc5a62f6f-CwJjes2b.mjs', 'c21f11e6d#Ab<../cowork-live/c21f11e6d-Cyd8_HO8.mjs'])
    assert.ok(linked.includes(want), `${want} in ${linked.join(', ')}`);
  const own = manifest.modules.find(m => m.source === 'c21f11e6d-Cyd8_HO8.js').bindings.map(b => b.name);
  assert.deepEqual(own.filter(n => ['mS', 'fS', 'Qx', 'sS', 'Fx', 'Ux', 'Wx', 'pT', 'yT'].includes(n)), [], 'rows are not sliced twice');
  assert.deepEqual(manifest.illustrations.map(a => a.path), ['images/illustrations/session-context.svg', 'images/illustrations/session-context-dark.svg']);
  for (const a of manifest.illustrations)
    assert.equal(sha(fs.readFileSync(path.join(app, 'public', a.path))), sha(fs.readFileSync(path.join(snapshot, a.path.replace(/^images/, 'images')))), a.path);
  await extractCoworkContext({ check: true });
});

test('the official text: TT, CT, gT, Kw and Gw in c21f11e6d; the adapters pin the branches this host never takes', () => {
  const chunk = official('c21f11e6d-Cyd8_HO8.js');
  for (const s of ['defaultMessage:"Used in this session",id:"d2ykzrGcrl"', 'defaultMessage:"Context",id:"Qrvq7+mBse"',
    'defaultMessage:"Track tools and referenced files used in this task.",id:"WXQkdiBWrh"', 'className:"text-muted-as-secondary font-small"',
    'src:"/images/illustrations/session-context.svg",darkSrc:"/images/illustrations/session-context-dark.svg",width:114,height:56',
    'defaultMessage:"Suggested connectors",id:"4lWgUGlrk4"', 'defaultMessage:"See all connectors",id:"7fCBPXAUhO"',
    'groupContextByKind:L=!1', 'alwaysShowCategoryHeaders:!0'])
    assert.ok(chunk.includes(s), s);
  // groupContextByKind is never set: AT's one caller (the Cowork session view) does not pass it.
  assert.equal(chunk.split('groupContextByKind:').length - 1, 3);
  // Kw returns null while the claude.ai connector directory lists no servers (always, without an account).
  assert.ok(/\{servers:(\w+)\}=\w+\(\)/.test(chunk) && chunk.includes('if(!C||!$e||g||Ue||ze||Le.length===0||Je)return null'));
  const out = local('src/generated/cowork-context/c21f11e6d-Cyd8_HO8.mjs');
  assert.equal(out.split('"./images/illustrations/').length - 1, 2);
  assert.ok(!out.includes('"/images/illustrations/'));
  const adapterImports = [...local('src/source-cowork-context-adapters.jsx').matchAll(/^(?:import|export)\b[^;]*?from "([^"]+)"/gm)].map(m => m[1]);
  assert.deepEqual(adapterImports, []);
});

const cwd = '/Users/me/Work';
function section(data, extra = {}) {
  return renderToStaticMarkup(h(panel.CoworkPanelLayoutContext.Provider, { value: panel.coworkPanelCardLayout },
    h(panel.CoworkPanel, {},
      h(gen.CoworkContextSection, { isContextExpanded: true, setIsContextExpanded() {}, contextSeedSnap: false, conversationUuid: 's1',
        headerHostedToggle: false, onRevealStep() {}, canRevealStep: () => true, handleContextActivityClick() {}, handleKindRowSkillOpen: undefined,
        selectedPath: undefined, coworkBrowserPreviewId: undefined, isCoworkBrowserPaneOpen: false, handleToggleCoworkBrowserPane() {}, ...data, ...extra }))));
}

test('SSR: no activity — "Context", the official empty body with its art, no suggested connectors (cwui-19 / cwui-20)', () => {
  const html = section(coworkContextData({ cwd, sessionId: 's1', items: [] }));
  const words = text(html);
  assert.match(words, /^Context /, words);
  assert.ok(words.includes('Track tools and referenced files used in this task.'), words);
  assert.ok(html.includes('<p class="text-muted-as-secondary font-small">'), 'CT copy class');
  assert.ok(html.includes('./images/illustrations/session-context.svg'), 'gT art');
  assert.ok(!words.includes('Suggested connectors'), 'Kw: no connector directory, so the original returns null');
  assert.ok(!words.includes('Used in this session'));
  assert.ok(html.includes('data-section-header=""') && html.includes('aria-expanded="true"'));
});

test('SSR: MCP tools, a skill and a web search — Connectors / Skills headers, the "{count} connectors" pile, no empty body', () => {
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
  assert.ok(html.includes('aria-label="3 connectors"'), html);
  assert.ok(words.includes('Pdf') || words.includes('pdf'), words);
  assert.ok(!/chrome_navigate|notes\.md/.test(html));
});

test('SSR: the "Suggested connectors" card Gw (the official markup, generated for when a directory exists)', () => {
  const connectors = [{ id: 'notion', name: 'Notion', description: 'Search and update your Notion pages and databases', iconType: 'favicon', iconSrc: 'n.png', isConnected: false, onClick() {} },
    { id: 'linear', name: 'Linear', description: 'Create, update, and track issues in Linear', iconType: 'favicon', iconSrc: 'l.png', isConnected: false, onClick() {} }];
  const html = renderToStaticMarkup(h(gen.CoworkSuggestedConnectorsCard, { isReady: true, hasAppeared: true, setHasAppeared() {}, connectors,
    clickedConnectors: new Set(), isPending: false, handleDismiss() {}, handleAddConnector() {}, handleSeeAllConnectors() {}, isCycling: false, showDescription: true }));
  const words = text(html);
  assert.ok(words.startsWith('Suggested connectors'), words);
  assert.ok(html.includes('aria-label="Dismiss suggested connectors"'));
  assert.ok(words.includes('See all connectors') && words.includes('Notion') && words.includes('Linear'), words);
  assert.ok(/(Cowork|Claude) uses connectors to browse websites, manage tasks, and more\./.test(words), words);
  assert.ok(html.includes('-mx-3 mt-auto border-t-0.5 border-border-300'));
});

test('host click: a Context row reveals its latest step in the transcript, else opens its file; adapters answer null', async () => {
  const adapters = await server.ssrLoadModule('/src/source-cowork-context-adapters.jsx');
  const revealed = [], opened = [];
  const handlers = { onRevealStep: id => revealed.push(id), canRevealStep: id => id !== 'gone', onOpenFile: p => opened.push(p) };
  assert.equal(adapters.coworkContextActivityClick({ latestId: 'm2', openWith: { via: 'none' } }, handlers), true);
  assert.equal(adapters.coworkContextActivityClick({ latestId: 'gone', openWith: { via: 'path' }, filePath: '/m/a.md' }, handlers), true);
  assert.equal(adapters.coworkContextActivityClick({ openWith: { via: 'none' } }, handlers), false);
  assert.deepEqual(revealed, ['m2']);
  assert.deepEqual(opened, ['/m/a.md']);
  for (const name of ['CoworkAddFolderAction', 'CoworkMountedProjects', 'CoworkContextKindGroups', 'CoworkContextKindGroupsWithBrowser',
    'CoworkRemoteContextSources', 'CoworkSuggestedConnectors'])
    assert.equal(adapters[name]({}), null, name);
  assert.equal(adapters.CoworkInAppBrowserRow, undefined);
});
