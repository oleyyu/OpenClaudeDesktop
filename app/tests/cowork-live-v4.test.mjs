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
import { extractCoworkLiveV4, ROOTS, HOST_ADAPTERS, REMOVED_ROOTS, CDS_CORE_MANIFEST_SHA256, LINKED_AREAS } from '../scripts/extract-cowork-live-v4.mjs';

// account2 batch 7, region cowork-live: the 4.16336.0 live sections of the Cowork activity panel
// (scripts/extract-cowork-live-v4.mjs -> src/generated/cowork-live-v4, staged next to the 3.6556.2 src/generated/cowork-live
// the host still renders). Source only: manifest, the generator's --check, the official chunk text, D1 links, and SSR of
// the sections inside the 4.16336.0 panel column (cowork-progress-v4) through Vite. No browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/cowork-live-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/cowork-progress-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

// The official app is client-rendered: its stores call useSyncExternalStore without getServerSnapshot. SSR here takes the
// client snapshot as the server one (as tests/cowork-live-generated.test.mjs does).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(h(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, gen, live, progress;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  live = await server.ssrLoadModule('/src/source-cowork-live-adapters.jsx');
  progress = await server.ssrLoadModule('/src/generated/cowork-progress-v4/index.mjs');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-cowork-live-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-live-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, LINKED_AREAS);
  assert.deepEqual(LINKED_AREAS, ['cowork-progress-v4', 'cowork-scheduled-v4', 'routines-shared-v4', 'session-rail-kit-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractCoworkLiveV4({ check: true });
});

test('roots: the semantic names, AST-located and pinned; useCoworkToolRunning is removed upstream', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.local}=${r.name}`), [
    'jb=CoworkBrowserSection', 'Ib=CoworkComputerUseSection', 'Lb=CoworkComputerUseCard', 'Gb=CoworkInAppBrowserTabsProbe',
    'Kb=CoworkInAppBrowserSection', 'kb=useCoworkBrowserActivityText', 'Tb=useCoworkBrowserScreenshot', 'Nb=useCoworkComputerUseScreenshot']);
  assert.ok(provenance.roots.every(r => r.pinned && r.file === 'c21f11e6d-Cyj5xu_D.js' && r.export === null), 'pinned, chunk-internal');
  const chunk = official('c21f11e6d-Cyj5xu_D.js');
  for (const r of provenance.roots) assert.equal(chunk.split(ROOTS[r.file][r.local].probe).length - 1, 1, `${r.local} probe once`);
  // The old graph's names, minus the one 4.16336.0 removed, plus the computer-use screenshot reader xE now calls.
  const old = local('src/generated/cowork-live/index.mjs').match(/ as (\w+)/g).map(s => s.slice(4));
  assert.deepEqual(old.filter(n => !provenance.roots.some(r => r.name === n)), ['useCoworkToolRunning']);
  assert.deepEqual(provenance.roots.map(r => r.name).filter(n => !old.includes(n)), ['useCoworkComputerUseScreenshot']);
  assert.deepEqual(REMOVED_ROOTS.map(r => r.name), ['useCoworkToolRunning']);
  for (const ev of REMOVED_ROOTS[0].evidence) assert.ok(!chunk.includes(ev), ev);
  assert.equal(gen.useCoworkToolRunning, undefined);
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'ca2ef848d#A0=unavailableActivityDetail', 'cb34f9f5d#de=useLivePreviewFps', 'c96143e67#l=useConnectedBrowsers', 'c17c38211#d=useSwitchBrowser',
    'shared-1#Nm=ComputerUseLivePreview', 'shared-0#EO=ComputerUseLivePreview', 'shared-62#kw=useFeatureIsOn', 'shared-62#Ha=loadPublicSuffixList',
    'shared-25#Z=useCurrentAccount', 'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-cowork-live-v4-adapters.jsx');
  const adapterText = local('src/source-cowork-live-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-cowork-live-adapters.jsx', './source-cowork-progress-v3-adapters.jsx', './source-routines-shared-adapters.jsx', './source-code-transcript-adapters.jsx']);
});

test('D1: bindings the linked areas hold are imported from them, never cut again; the panel kit comes from cowork-progress-v4', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area holds is cut again');
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1]));
  for (const area of manifest.linkedAreas) assert.ok(linked.includes(area), `links ${area}`);
  const c21 = local(`${out}/c21f11e6d.mjs`);
  assert.match(c21, /CoworkPanelSection as t_,[\s\S]*from "\.\.\/cowork-progress-v4\/cc5a62f6f\.mjs"/);
  assert.match(c21, /CoworkPanelLayoutContext as e_/);
  // The panel column (cc5a62f6f) is cowork-progress-v4's alone.
  assert.ok(!manifest.modules.some(m => m.source === 'cc5a62f6f-CsfnfFRu.js'));
});

test('the official text: the live sections, the server identities and the gate xE reads for the computer-use card', () => {
  const c21 = official('c21f11e6d-Cyj5xu_D.js'), s123 = official('shared-123-1Hc1RTKl.js');
  for (const s of ['{defaultMessage:"Claude in Chrome",id:"1XvgYxOFV4"}', '{defaultMessage:"Computer use",id:"RfG2KsHAez"}', '{defaultMessage:"Live",id:"FAq+HlOlG7"}',
    'Db=new Set(["batch","browser_batch","computer_batch"])', 'let e=ph(mh(n.mcpToolResult),r);e&&(i=e)', 'e.mcpToolResult||(t.pending=!0)'])
    assert.ok(c21.includes(s), s);
  assert.ok(s123.includes('var iA="computer-use",aA="cowork_computer_use_side_panel_card";') && s123.includes('function sA(){return V(aA)}'));
  assert.equal(manifest.callSites.length, 2, 'the two pinned raw call sites');
  assert.deepEqual(Object.keys(manifest.extraGlobals), ['DOMMatrixReadOnly']);
});

function inPanel(child, flat = true) {
  return renderToStaticMarkup(h(progress.CoworkPanelMergedContext.Provider, { value: true },
    h(progress.CoworkPanelLayoutContext.Provider, { value: flat ? progress.coworkPanelFlatLayout : progress.coworkPanelCardLayout },
      h(progress.CoworkPanel, { shrinkSections: true }, child))));
}
const browserProps = extra => ({ hasBrowserActivity: true, conversationUuid: 's1', isSessionActive: true, isBrowserToolRunning: true, collapsible: true, panelShown: true, ...extra });

test('SSR: no browser and no computer-use activity — neither section renders (official `visible` false)', () => {
  assert.equal(inPanel(h(gen.CoworkBrowserSection, browserProps({ hasBrowserActivity: false, isBrowserToolRunning: false }))).includes('Claude in Chrome'), false);
  assert.equal(renderToStaticMarkup(h(gen.CoworkBrowserSection, browserProps({ hasBrowserActivity: false }))), '');
  assert.equal(renderToStaticMarkup(h(gen.CoworkComputerUseSection, { hasComputerUseActivity: false, previewSessionId: 's1', isSessionActive: true })), '');
  assert.equal(renderToStaticMarkup(h(gen.CoworkInAppBrowserTabsProbe, { previewId: 'p1', onHasTabsChange() {} })), '');
});

test('SSR: a Chrome tool running without a page yet — "Claude in Chrome" and the official working copy (flat and card)', () => {
  for (const flat of [true, false]) {
    const html = inPanel(h(gen.CoworkBrowserSection, browserProps()), flat);
    const words = text(html);
    assert.ok(words.startsWith('Claude in Chrome'), words);
    assert.ok(words.includes('Claude is working in Chrome. You’ll see updates here as Claude makes progress.'), words);
    assert.ok(html.includes('aria-label="Switch browser"'), 'Sb: the official Switch browser trigger');
    assert.ok(html.includes('data-section-header=""'), 'the panel Section header');
    assert.ok(html.includes(flat ? 'block py-1.5 text-caption text-muted-as-secondary' : 'text-muted-as-secondary text-caption-regular font-sans'), flat ? 'flat empty copy' : 'card empty copy');
  }
});

test('SSR: a page in Chrome — the domain and the latest action replace the working copy', () => {
  const html = inPanel(h(gen.CoworkBrowserSection, browserProps({ currentDomain: 'example.com', latestActionText: 'Read page' })));
  const words = text(html);
  assert.ok(words.includes('example.com') && words.includes('Read page'), words);
  assert.ok(!words.includes('Claude is working in Chrome.'), words);
  assert.ok(html.includes('flex items-center gap-2.5 py-1.5'), 'flat row');
});

test('SSR: computer use in progress — "Computer use", "Live" and "Background · {target}" / "Full control · {target}"', () => {
  const frame = 'data:image/png;base64,AAAA';
  const card = preview => inPanel(h(gen.CoworkComputerUseCard, { hasComputerUseActivity: true, previewSessionId: 's1', activityKey: 'c1', preview,
    isSessionActive: true, isComputerUseToolRunning: true, collapsible: true, panelShown: true }));
  const background = card({ sessionId: 's1', active: true, mode: 'app', targetLabel: 'Finder', frame });
  const words = text(background);
  assert.ok(words.startsWith('Computer use'), words);
  assert.ok(words.includes('Live') && words.includes('Background · Finder'), words);
  assert.ok(background.includes(frame), 'the live frame');
  const full = text(card({ sessionId: 's1', active: true, mode: 'display', targetLabel: 'Display 1', frame }));
  assert.ok(full.includes('Full control · Display 1') && full.includes('Live'), full);
  const idle = text(card(undefined));
  assert.ok(idle.includes('Claude is working on your computer. You’ll see updates here as Claude makes progress.') && !idle.includes('Live'), idle);
  // Ib reads the preview store; without the host bridge (no window.desktop here) it is "missing" and Ib passes no preview.
  assert.equal(live.ComputerUseLivePreview, undefined);
  assert.ok(text(inPanel(h(gen.CoworkComputerUseSection, { hasComputerUseActivity: true, previewSessionId: 's1', isSessionActive: true }))).startsWith('Computer use'));
});

test('hooks over the host resource activity: kb text/domain, Tb Chrome screenshot, Nb computer-use screenshot', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const call = (id, tool, args, status = 'completed', result = { content: [] }) => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool, arguments: args, status, result });
  const items = [
    call('c1', 'chrome_navigate', { url: 'https://www.example.com/a' }),
    call('c2', 'chrome_browser_batch', { actions: [{ name: 'chrome_navigate', input: { url: 'docs.example.org/x' } }] }, 'completed', { content: [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }] }),
    call('s', 'app_screenshot', { app: 'Finder' }, 'completed', { content: [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }] }),
  ];
  const events = live.coworkLiveActivity(items).resourceActivity;
  let res;
  const Probe = ({ events }) => { res = { text: gen.useCoworkBrowserActivityText(events), chrome: gen.useCoworkBrowserScreenshot(events), cu: gen.useCoworkComputerUseScreenshot(events) }; return null; };
  renderToStaticMarkup(h(Probe, { events }));
  assert.equal(res.text.currentDomain, 'docs.example.org');
  assert.equal(typeof res.text.latestActionText, 'string');
  assert.equal(res.chrome, png);
  assert.equal(res.cu, png);
  renderToStaticMarkup(h(Probe, { events: [] }));
  assert.deepEqual(res, { text: { latestActionText: undefined, currentDomain: undefined }, chrome: undefined, cu: undefined });
});
