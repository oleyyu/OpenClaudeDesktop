// titlebar 4.16336.0 (scripts/extract-titlebar-v4.mjs, src/titlebar-host.jsx): Back / Forward (shared-21 _O, shared-20 hv over
// the shared-1 jm history store) and the Code titlebar pane toggles (cc43287c9 SY / UJ, cc44b66a7 M) sliced over cds-core,
// linked to frame-sidebar for the stateful bindings it already holds (D1). SSR through Vite's module graph; no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { boundaries, extractTitlebar, linkedAreas, pinsPath } from '../scripts/extract-titlebar-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const manifest = JSON.parse(read('src/generated/titlebar/manifest.json'));
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const v4 = (name) => fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1', name), 'utf8');
// The press-and-hold page list: the host state never sets listsPages, so the official code never reaches these.
const UNREACHABLE = ['HistoryPagesMenu', 'historyPagesMenuEntry'];

let server, Host, Adapter, Model;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/titlebar-host.jsx');
  Adapter = await server.ssrLoadModule('/src/titlebar-adapter.mjs');
  Model = await server.ssrLoadModule('/src/titlebar-controls-model.mjs');
});
after(async () => { await server?.close(); });

test('generator: --check reproduces the pinned modules from the pinned 4.16336.0 chunks', async () => {
  await extractTitlebar({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph?.area ?? manifest.sharedGraph, 'cds-core');
  assert.deepEqual(Object.keys(pins.roots).length, 5);
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-titlebar.mjs')));
});

test('D1: frame-sidebar\'s focus registry (tj), isMac (Qa), chrome size (rO) are linked, never sliced again; no ny fold store here', () => {
  assert.deepEqual(linkedAreas, ['frame-sidebar']);
  const linked = manifest.modules.flatMap((module) => (module.imports ?? []).filter((entry) => entry.kind === 'linked').map((entry) => `${module.target} ${entry.name} ${entry.from}`));
  assert.ok(linked.includes('sidebar-history-nav.mjs tj ../frame-sidebar/shared-19.mjs'));
  assert.ok(linked.includes('sidebar-history-nav.mjs rO ../frame-sidebar/frame-chrome.mjs'));
  assert.ok(linked.includes('history-nav.mjs Qa ../frame-sidebar/shared-62.mjs'));
  const bound = manifest.modules.flatMap((module) => module.bindings.map((binding) => binding.name ?? binding));
  for (const name of ['tj', 'qA', 'Qa', 'rO', 'ny', 'ry', 'Am', 'gO']) assert.ok(!bound.includes(name), `${name} is not sliced into generated/titlebar`);
  // jm (the store over Am) is this lane's single copy.
  assert.match(read('src/generated/titlebar/navigation-state.mjs'), /navigationStateStore/);
  for (const file of fs.readdirSync(path.join(app, 'src/generated/titlebar')).filter((name) => name.endsWith('.mjs'))) {
    assert.doesNotMatch(read(`src/generated/titlebar/${file}`), /\bny\b\s*=/, file);
  }
});

test('host contract: every boundary is answered or deliberately unreachable; the unreachable ones throw', () => {
  const names = boundaries.map((boundary) => boundary.name).sort();
  assert.deepEqual([...Object.keys(Host.HOST_ANSWERS), ...UNREACHABLE].sort(), names);
  for (const [name, [kind]] of Object.entries(Host.HOST_ANSWERS)) assert.ok(['host', 'gap'].includes(kind), name);
  assert.equal(Host.HOST_ANSWERS.notePaneToggleClick[0], 'gap');
  assert.throws(() => Adapter.historyPagesMenuEntry.handle, /historyPagesMenuEntry is not provided/);
  assert.throws(() => Adapter.HistoryPagesMenu({}).type({}), /HistoryPagesMenu is not provided/);
  // One React: the adapter hands the slice the host instance.
  assert.equal(Adapter.loadHostReact().createElement, React.createElement);
});

test('one BrowserNavigation object answers both bridges; it follows main.jsx history and travels through it', async () => {
  assert.equal(Host.HOST_ANSWERS.BrowserNavigationState[1], Host.HOST_ANSWERS.BrowserNavigation[1]);
  assert.equal(Adapter.BrowserNavigationState.navigationStateStore, Host.hostBrowserNavigation.navigationStateStore);
  assert.equal(Adapter.BrowserNavigation.historyPages, undefined, 'no page list: the official no-list path');
  assert.equal(Adapter.BrowserNavigation.goToHistoryPage, undefined);
  const seen = [], travels = [];
  const off = Adapter.BrowserNavigationState.navigationStateStore.onStateChange((state) => seen.push(state));
  Host.publishHostNavigation({ historyAt: 1, historyLength: 3, travel: (delta) => travels.push(delta) });
  assert.deepEqual(await Adapter.BrowserNavigationState.navigationStateStore.getState(), { canGoBack: true, canGoForward: true });
  Host.publishHostNavigation({ historyAt: 1, historyLength: 3, travel: (delta) => travels.push(delta) });
  assert.equal(seen.length, 1, 'an unchanged state is not re-published');
  Adapter.BrowserNavigation.goBack();
  Adapter.BrowserNavigation.goForward();
  assert.deepEqual(travels, [-1, 1]);
  Host.publishHostNavigation({ historyAt: 0, historyLength: 1, travel: null });
  assert.deepEqual(seen.at(-1), { canGoBack: false, canGoForward: false });
  assert.ok(!('listsPages' in seen.at(-1)));
  off();
  Host.publishHostNavigation({ historyAt: 2, historyLength: 3, travel: null });
  assert.equal(seen.length, 2, 'unsubscribed');
  Host.publishHostNavigation({ historyAt: 0, historyLength: 1, travel: null });
});

test('pane icons are cc44b66a7 M; the ⋮ glyph is cc43287c9 UJ (DotsHorizontal); the model maps host panes to M keys', () => {
  assert.equal(Host.PANE_ICONS.terminal, 'CommandLinePrompt');
  assert.equal(Host.PANE_ICONS.diff, 'ChangesPlusMinus');
  assert.equal(Host.PANE_ICONS.file, 'Folder');
  assert.equal(Host.PANE_ICONS.preview, 'Play');
  assert.deepEqual(Model.PANE_ICON_KIND, { terminal: 'terminal', changes: 'diff', preview: 'preview', files: 'file' });
  assert.match(read('src/generated/titlebar/pane-toggle.mjs'), /var UJ = Dp\("DotsHorizontal"\);/);
  const cc = v4('cc43287c9-dzfX-J5i.js');
  assert.ok(cc.includes('Dp(`DotsHorizontal`)') || cc.includes('Dp("DotsHorizontal")'));
  const icons = v4('cc44b66a7-CBE7MOEW.js');
  assert.ok(icons.includes('terminal:`CommandLinePrompt`') || icons.includes('terminal:"CommandLinePrompt"'));
});
