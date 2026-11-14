// chat-header 4.16336.0 (scripts/extract-chat-header-v4.mjs, src/chat-header-host.jsx): the Chat incognito top bar row,
// shared-20 Yw → Xw with Zw → Ix, sliced over the finalized cds-core and frame-sidebar's window chrome, mounted through
// the production host with synthetic fixture values (no user data). SSR through Vite's module graph; no browser, no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { boundaries, extractChatHeader, pinsPath, S20 } from '../scripts/extract-chat-header-v4.mjs';
import { ionSource } from '../scripts/official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const manifest = JSON.parse(read('src/generated/chat-header/manifest.json'));
const official = fs.readFileSync(path.join(ionSource, S20), 'utf8');
const el = React.createElement;

let server, Host, Adapter, Frame, Cds, I18n, TopBar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Frame = await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
  Host = await server.ssrLoadModule('/src/chat-header-host.jsx');
  Adapter = await server.ssrLoadModule('/src/chat-header-adapter.mjs');
  TopBar = await server.ssrLoadModule('/src/generated/chat-header/top-bar.mjs');
  Cds = await server.ssrLoadModule('/src/cds-core.mjs');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });

// The bar in the frame host main.jsx mounts it in (platform / window state of frame-sidebar-host.jsx).
const bar = (props = {}, frame = {}) => renderToStaticMarkup(el(Frame.FrameSidebarHost, { value: { platform: 'mac', zoomFactor: 1, fullScreen: false, ...frame } },
  el(Host.ChatDesktopTopBar, { incognito: true, onToggleIncognito() {}, pathname: '/new', ...props })));

test('generator: --check reproduces the pinned modules; manifest sources are the pinned 4.16336.0 chunks', async () => {
  await extractChatHeader({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.modules.length, 9);
  for (const module of manifest.modules) assert.equal(module.sourceSha256, pins.sources[module.source], module.source);
  assert.deepEqual(Object.keys(pins.sources).sort(), manifest.modules.map((module) => module.source).sort());
  assert.deepEqual(Object.keys(pins.roots).sort(), ['DesktopTopBar', 'DesktopTopBarRow', 'IncognitoToggle', 'TopBarIncognitoToggle']);
  assert.deepEqual(Object.fromEntries(Object.entries(pins.roots).map(([name, root]) => [name, [root.local, root.export, root.old.local]])), {
    DesktopTopBar: ['Yw', 'Ra', 'Py'], DesktopTopBarRow: ['Xw', null, 'Fy'], TopBarIncognitoToggle: ['Zw', 'za', 'Iy'], IncognitoToggle: ['Ix', null, 'Qg'],
  });
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), pins.cdsCore.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/cds-core-adapter.mjs'))), pins.cdsCore.adapterSha256);
  assert.equal(fs.existsSync(path.join(app, 'scripts/verify-gen-chat-header-v4.mjs')), true, 'prepare:ui runs the check');
});

test('D1: window chrome is frame-sidebar\'s (linked), CDS is cds-core\'s; Back / Forward stay the titlebar lane\'s', () => {
  const linked = manifest.modules.flatMap((module) => (module.imports ?? []).filter((entry) => entry.kind === 'linked').map((entry) => [module.target, entry.name, entry.from]));
  assert.deepEqual(linked, [
    ['shared-0.mjs', 'IH', '../frame-sidebar/shared-0.mjs'], ['shared-0.mjs', 'uI', '../frame-sidebar/shared-0.mjs'],
    ['titlebar-area.mjs', 'IH', '../frame-sidebar/shared-0.mjs'], ['titlebar-area.mjs', '_e', '../frame-sidebar/shared-0.mjs'],
    ['top-bar.mjs', 'IH', '../frame-sidebar/shared-0.mjs'],
    ['top-bar.mjs', 'useWindowChrome', '../frame-sidebar/window-chrome.mjs'], ['top-bar.mjs', 'Mr', '../frame-sidebar/window-chrome.mjs']]);
  assert.deepEqual(manifest.linkedAreas, [{ area: 'frame-sidebar', modules: ['window-chrome.mjs', 'shared-0.mjs'] }]);
  // shared-0 lI (the RTL language Set, a collection D1 counts as state) stays frame-sidebar's: uI is linked, lI never sliced here.
  const shared0 = manifest.modules.find((module) => module.target === 'shared-0.mjs');
  assert.ok(!shared0.bindings.some((binding) => binding.name === 'lI' || binding.name === 'uI'));
  const topBar = read('src/generated/chat-header/top-bar.mjs');
  assert.ok(topBar.includes('} from "../cds-core/shared-frame.mjs";'));
  // hv (HistoryNavButtons and its history store) is not sliced here: it is an unreachable boundary.
  assert.ok(!topBar.includes('function hv('));
  for (const module of manifest.modules) assert.ok(!module.bindings.some((binding) => binding.name === 'hv' || binding.name === 'pn'), module.target);
});

test('boundaries: every capability is answered by the host table; the unreachable ones throw', () => {
  const answered = Object.keys(Host.HOST_ANSWERS).sort();
  const reachable = boundaries.filter((b) => !b.unreachable).map((b) => b.name).sort();
  assert.deepEqual(answered, reachable);
  assert.deepEqual(boundaries.filter((b) => b.unreachable).map((b) => b.name).sort(), ['TopBarHistoryNav', 'TopBarModeSelect', 'WindowControlsMenu']);
  for (const name of ['TopBarHistoryNav', 'TopBarModeSelect', 'WindowControlsMenu']) assert.throws(() => Adapter[name]({}), new RegExp(`${name} was entered`));
  assert.equal(Adapter.chatHeaderHost().useVoiceSessionHoldsIncognito(), false);
  assert.equal(Adapter.chatHeaderHost().useShortcut('incognito').shortcutString, 'cmd+shift+i');
  assert.throws(() => Adapter.chatHeaderHost().useShortcut('newChat'), /not answered/);
});

test('SSR incognito: Xw\'s row with the 69px traffic-light spacer, the ghost label and Ix\'s Exit X (4.16336.0 ghost Button)', () => {
  const html = bar();
  assert.match(html, /^<div class="flex items-center draggable px-2" style="z-index:30"><div class="flex-1 flex items-center gap-1"><div class="shrink-0" style="width:env\(titlebar-area-x, 0px\)"><\/div><div class="w-\[69px\] shrink-0"><\/div><\/div>/);
  assert.match(html, /<span class="text-sm select-none">Incognito chat<\/span>/);
  const button = html.match(/<button[^>]*aria-label="Exit incognito"[^>]*>/)?.[0];
  assert.ok(button);
  assert.ok(button.includes('data-cds-ghost') && button.includes('data-cds-icon-only'));
  assert.ok(button.includes('not-in-data-[cds=SplitDropdownButton]'), 'the 4.16336.0 ghost Button class');
  assert.match(button, /class="[^"]*\bgroup draggable-none"/);
  assert.match(html, /<div class="cds-root text-primary contents"[^>]*data-mode="dark"[^>]*><button/);
  // Under a dark root the inverted root is light (Ix `b = t ? d : u`).
  assert.match(renderToStaticMarkup(el(Cds.CdsRoot, { mode: 'dark' }, el(Frame.FrameSidebarHost, { value: { platform: 'mac', zoomFactor: 1 } },
    el(Host.ChatDesktopTopBar, { incognito: true, onToggleIncognito() {}, pathname: '/new' })))), /<div class="cds-root text-primary contents"[^>]*data-mode="light"[^>]*><button[^>]*aria-label="Exit incognito"/);
  // The official text the markup comes from.
  for (const needle of ['A=t&&b&&!x', 'A&&!j&&i("div",{className:"w-[69px] shrink-0"})', 'E=D(T?30:20)', '!T&&o(l,{children:[i(k,{variant:"ghost"',
    'i(Ix,{enabled:r,onToggle:c,shortcut:o,tooltipSide:l,className:"draggable-none",size:t})'])
    assert.equal(official.split(needle).length - 1, 1, needle);
});

test('incognito toggle gate: Zw draws nothing when incognito is off (the frozen bundle has no ghost "Use incognito" button)', () => {
  // Zw: `if(n||!(s||r)||!r)return null` — not enabled ⇒ null, whatever the route. The ghost button of the official
  // screenshot 03 is not reachable from this snapshot's code (recorded in the chat-header report).
  assert.equal(official.split('if(n||!(s||r)||!r)return null').length - 1, 1);
  const toggle = (incognito, pathname) => renderToStaticMarkup(el(Host.ChatHeaderHost, { value: { incognito, onToggleIncognito() {}, pathname } },
    el(TopBar.TopBarIncognitoToggle)));
  assert.equal(toggle(false, '/new'), '');
  assert.equal(toggle(false, '/chat'), '');
  assert.equal(toggle(false, '/chat/fixture'), '');
  assert.match(toggle(true, '/new'), /aria-label="Exit incognito"/);
});

test('Exit X toggles incognito off through the host (setIncognitoModeEnabled(false) → onToggleIncognito once)', () => {
  let calls = 0;
  const onToggle = () => { calls++; };
  let mode;
  const Probe = () => { mode = Adapter.useIncognitoMode(); return null; };
  renderToStaticMarkup(el(Host.ChatHeaderHost, { value: { incognito: true, onToggleIncognito: onToggle, pathname: '/chat/fixture' } }, el(Probe)));
  assert.equal(mode.incognitoModeEnabled, true);
  mode.setIncognitoModeEnabled(true);
  assert.equal(calls, 0);
  mode.setIncognitoModeEnabled(false);
  assert.equal(calls, 1);
});

test('zh-CN: Exit X label and the incognito copy', () => {
  I18n.setLocale('zh-CN');
  try {
    const html = bar();
    assert.match(html, /aria-label="退出无痕模式"/);
    assert.match(html, /<span class="text-sm select-none">无痕聊天<\/span>/);
  } finally { I18n.setLocale('en-US'); }
});
