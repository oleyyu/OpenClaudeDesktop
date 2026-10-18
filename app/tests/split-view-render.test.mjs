import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Node-only SSR of the split view (source-split-view.jsx) and the session row's split / window items
// (source-sidebar.jsx), over a split-view-store.mjs store: no browser, Electron or core.
let server, Split, Store, Sidebar, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Split = await server.ssrLoadModule('/src/source-split-view.jsx');
  Store = await server.ssrLoadModule('/src/split-view-store.mjs');
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });

const timers = { setTimeout: () => 0, clearTimeout: () => {} };
const storeWith = (setup = () => {}) => { const store = Store.createSplitViewStore({ timers }); setup(store); return store; };
const host = (store, side = 0) => renderToStaticMarkup(React.createElement(Split.SourceSplitHost, { side, store },
  React.createElement('main', { className: 'workspace', 'data-side-content': side })));

test('closed: the workspace sits in the primary grid cell alone (dframe-pane-host, one column), the Primary pane region alone, no resizers or slots', () => {
  const html = host(storeWith());
  assert.match(html, /^<div class="split-host dframe-pane-host" data-focus-region="main" data-pane-count="1" style="--df-col-tracks:1fr;--df-pane-row:0.5"><div class="split-pane split-pane-primary dframe-pane dframe-pane-primary" id="split-pane-0" role="region" aria-label="Primary pane" data-row="0" data-pos="0:0" data-col-last="true" data-pane-index="0" style="--pane-col:1" data-pane-immovable="true"><main class="workspace" data-side-content="0"><\/main><\/div><div class="dframe-pane-col" style="grid-column:1" data-col="0"><\/div><\/div>$/);
  assert.doesNotMatch(html, /role="separator"|aria-current|split-pane-secondary|dframe-pane-grip/);
});

test('open (a1 / o1): Primary and Secondary pane regions in grid cells, the focused one current, the others inactive; column resizers named Resize pane columns; grips', () => {
  const store = storeWith((s) => { s.reportSide(0, { current: 'a', title: 'Alpha' }); s.setMaxColumns(3); s.open('b'); s.open('c'); s.setColWeights([2, 1, 1]); });
  const html = host(store);
  assert.match(html, /class="split-host dframe-pane-host" data-focus-region="main" data-split="true" data-pane-count="3" style="--df-col-tracks:2fr 1fr 1fr;--df-pane-row:0.5"/);
  assert.match(html, /<div class="split-pane split-pane-primary dframe-pane dframe-pane-primary" id="split-pane-0" role="region" aria-label="Primary pane" data-row="0" data-pos="0:0" data-split-inactive="" data-pane-index="0" style="--pane-col:1">/);
  assert.match(html, /<div class="split-pane split-pane-secondary dframe-pane dframe-pane-extra" id="split-pane-2" role="region" aria-label="Secondary pane" aria-current="true" data-row="0" data-pos="2:0" data-col-last="true" data-focused="" data-pane-index="2" style="--pane-col:3"><div class="split-pane-slot"><\/div><button type="button" aria-hidden="true" tabindex="-1" class="dframe-pane-grip draggable-none"><\/button><\/div>/);
  assert.equal((html.match(/aria-label="Resize pane columns"/g) || []).length, 2, 'one boundary per column pair');
  assert.match(html, /<div class="dframe-pane-resize-col"><div aria-label="Resize pane columns" aria-valuenow="67" data-cds="ResizeHandle" role="separator" aria-orientation="vertical" tabindex="0"/);
  assert.match(html, /data-cds-part="resize-pill"/);
  // Each extra pane closes itself from its own titlebar (SourceTitlebar onCloseSplit "Close pane"): no close here.
  assert.doesNotMatch(html, /Close split view|Close pane|Resize split view/);
  store.focus(0);
  assert.match(host(store), /id="split-pane-0" role="region" aria-label="Primary pane" aria-current="true" data-row="0" data-pos="0:0" data-focused=""/);
});

test('rows (h$ / g$): a column with a bottom pane gets the row resizer and the corners beside it', () => {
  const store = storeWith((s) => { s.reportSide(0, { current: 'a' }); s.setMaxColumns(2); s.open('b'); s.open('c'); s.setRowSplit(0.6); });
  const html = host(store);
  assert.match(html, /style="--df-col-tracks:1fr 1fr;--df-pane-row:0.6"/);
  assert.match(html, /id="split-pane-0" role="region" aria-label="Primary pane" data-row="0" data-pos="0:0" data-split="true"/);
  assert.match(html, /id="split-pane-2" role="region" aria-label="Secondary pane" aria-current="true" data-row="1" data-pos="0:1" data-split="true"/);
  assert.match(html, /<div class="dframe-pane-col" style="grid-column:1" data-col="0" data-split="true"><div class="dframe-pane-resize-row"><div aria-label="Resize pane rows" aria-valuenow="60" data-cds="ResizeHandle" role="separator" aria-orientation="horizontal"/);
  assert.match(html, /<div class="dframe-pane-resize-corner" aria-hidden="true"><\/div>/);
});

test('narrow (u1): a parked window shows the primary pane alone; no tab strip', () => {
  const store = storeWith((s) => { s.reportSide(0, { current: 'a', title: 'Alpha' }); s.open('b'); s.setConstrained(true); });
  const html = host(store);
  assert.match(html, /data-pane-count="1"/);
  assert.doesNotMatch(html, /split-pane-secondary|role="tablist"|split-tabs/);
  store.setConstrained(false);
  assert.match(host(store), /data-pane-count="2"/);
});

test('the secondary pane renders its workspace unchanged; the root renders only the primary pane until a slot exists', () => {
  const store = storeWith((s) => s.open('b'));
  assert.equal(host(store, 1), '<main class="workspace" data-side-content="1"></main>');
  const html = renderToStaticMarkup(React.createElement(Split.SourceSplitRoot, { store, renderSide: (side, secondary) => React.createElement('section', { 'data-side': side, 'data-secondary': secondary?.sessionId ?? '' }) }));
  assert.equal(html, '<section data-side="0" data-secondary=""></section>');
});

test('zh-CN: the split chrome speaks the UI language', (context) => {
  context.after(() => I18n.setLocale('en-US'));
  I18n.setLocale('zh-CN');
  const html = host(storeWith((s) => { s.open('b'); s.open('c'); }));
  assert.match(html, /aria-label="主面板"/);
  assert.match(html, /aria-label="副面板"/);
  assert.match(html, /aria-label="调整面板列宽"/);
  assert.match(html, /aria-label="调整面板行高"/);
});

test('split shortcuts follow the official chords: ⌃] ⌃[ focus, ⌃⌘\\ / ⌃⌘- new session on the right / below, ⌃⌘W close, ⌃⌘Arrow focus', () => {
  const key = (code, mods = {}) => Split.splitShortcut({ code, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, repeat: false, defaultPrevented: false, ...mods });
  assert.equal(key('BracketRight'), 'focus-next');
  assert.equal(key('BracketLeft'), 'focus-previous');
  assert.equal(key('Backslash', { metaKey: true }), 'new-right');
  assert.equal(key('Minus', { metaKey: true }), 'new-below');
  assert.equal(key('KeyW', { metaKey: true }), 'close');
  assert.equal(key('ArrowRight', { metaKey: true }), 'focus-right');
  assert.equal(key('KeyW'), null, '⌃W alone stays a text binding');
  assert.equal(key('BracketRight', { shiftKey: true }), null);
  assert.equal(key('BracketRight', { repeat: true }), null);
  assert.equal(Split.splitShortcut({ code: 'BracketRight', ctrlKey: false }), null);
});

test('session row menu: Split view and New window live in the Open in submenu (c80a67939 g/_/b/x); rows drag as sessions', () => {
  const now = Math.floor(Date.now() / 1000);
  const thread = (id) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now });
  const menu = (windowActions) => renderToStaticMarkup(React.createElement(Sidebar.SourceSidebarSessionMenu, { session: thread('s1'), onAction() {}, onClose() {}, onRename() {}, windowActions }));
  const actions = (item) => ({ splitItem: () => item, onOpenSplit() {}, onCloseSplit() {}, onOpenWindow() {} });
  // The submenu popup renders only while open, so the closed menu shows just the 'Open in' trigger: no top-level window rows.
  for (const item of [{ kind: 'open' }, { kind: 'close', side: 1 }, null]) {
    const html = menu(actions(item));
    assert.doesNotMatch(html, /Open in split view|Open in new window|Close split view|split-trigger|new-window-trigger/, JSON.stringify(item));
    assert.match(html, /Open in/);
  }
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  const body = source.slice(source.indexOf('const openInLayout'), source.indexOf('{pinnedAt > 0'));
  assert.match(body, /t\("Split view"\)[\s\S]*t\("New window"\)[\s\S]*editors\.map[\s\S]*t\("Terminal"\)[\s\S]*t\("Finder"\)/, 'layout (Split view, New window), then editors, Terminal, Finder');
  assert.match(body, /splitItem\?\.kind === "open"/, 'Split view only for a session this window does not show');
  assert.match(body, /shortcut=\{digitFor\(index\)\} digit=\{digitFor\(index\)\}/, 'rows are numbered 1-9');
  assert.doesNotMatch(body, /icon=|Close split view"\)/, 'no icons and no Close split view row');
  const sidebar = (props) => renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar, { sessions: [thread('s1')], knownFolders: ['/fixture/work'], ...props }));
  // B10 (shared-19 DY): rows are pointer drags (data-drag-key; source-sidebar-drag.jsx), never native drags.
  const draggableRow = sidebar({ windowActions: actions({ kind: 'open' }), onSessionAction() {} });
  assert.match(draggableRow, /data-source-session-id="s1"[^>]*data-drag-key="s1"[^>]*>.*?<button type="button"[^>]*data-row-main-button=""[^>]*draggable="false"/s);
  assert.doesNotMatch(draggableRow, /draggable="true"/);
  assert.doesNotMatch(sidebar({}), /draggable="true"/);
});

test('the split CSS never sets cursor:pointer, keeps reduced motion, and the store type is exported for the sidebar', () => {
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-split-view.css'), 'utf8');
  assert.doesNotMatch(css, /cursor\s*:\s*pointer/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /html\[data-reduce-motion="true"\] \.split-host \.dframe-pane-extra/);
  // The grid rules are the reference's own (the loaded shared-styles sheet), not copies.
  const sheet = readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/shared-styles-Bl9zqrv-.css'), 'utf8');
  assert.match(readFileSync(path.resolve(import.meta.dirname, '../index.html'), 'utf8'), /href="\/assets\/v1\/shared-styles-Bl9zqrv-\.css"/);
  for (const rule of ['.dframe-pane-host{', '.dframe-pane-col{', '.dframe-pane-resize-col{', '.dframe-pane-resize-row{', '.dframe-pane-resize-corner{', '.dframe-pane-grip{', '.dframe-drop-overlay-badge{', '.dframe-drop-overlay-label{'])
    assert.ok(sheet.includes(rule), rule);
  assert.equal(Split.SESSION_DRAG_TYPE, 'application/x-code-desktop-session');
  assert.equal(Split.inInactiveSplitSide({ closest: (selector) => (selector === '[data-split-inactive]' ? {} : null) }), true);
  assert.equal(Split.inInactiveSplitSide(null), false);
});
