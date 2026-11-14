import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { withPreviewDom, reactProps } from './fixtures/preview-r3b-dom.mjs';

// surfaces wave 2 (titlebar): Back / Forward are the sliced 4.16336.0 shared-20 hv (memo(mv) → uv) and shared-21 _O
// (generated/titlebar, scripts/extract-titlebar-v4.mjs); they read the official history store (shared-1 jm over
// BrowserNavigation.navigationStateStore), which src/titlebar-host.jsx answers from main.jsx's history.
const app = path.resolve(import.meta.dirname, '..');
const v4 = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
let server, N, T, H;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  N = await server.ssrLoadModule('/src/source-nav-buttons.jsx');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  H = await server.ssrLoadModule('/src/titlebar-host.jsx');
});
after(() => server?.close());
const h = React.createElement;
const render = (Component, props) => renderToStaticMarkup(h(Component, props));
const buttons = html => html.split('<button').slice(1).map(chunk => chunk.slice(0, chunk.indexOf('>')));
const generated = name => fs.readFileSync(path.join(app, 'src/generated/titlebar', name), 'utf8');

test('navAvailability is the host store state: travel() bounds', () => {
  assert.equal(N.navAvailability, H.hostNavigationState);
  assert.deepEqual(N.navAvailability(0, 1), { canGoBack: false, canGoForward: false });
  assert.deepEqual(N.navAvailability(0, 2), { canGoBack: false, canGoForward: true });
  assert.deepEqual(N.navAvailability(1, 2), { canGoBack: true, canGoForward: false });
  assert.deepEqual(N.navAvailability(1, 3), { canGoBack: true, canGoForward: true });
});

test('the slice is the official text: uv CaretLeft / CaretRight, ov, the wrappers; mv over jm; _O over td', () => {
  const nav = generated('history-nav.mjs');
  for (const needle of ['icon: "CaretLeft"', 'icon: "CaretRight"', 'var ov = "aria-disabled:pointer-events-none aria-disabled:*:opacity-50";',
    '? "flex items-center draggable-none"', ': "flex items-center gap-0.5 draggable-none"', '_ = g ? "cmd+[" : "alt+left"', 'v = g ? "cmd+]" : "alt+right"',
    'n = Zn(),', 'onGoBack: dv,', 'onGoForward: fv,', 'wt?.goBack?.();', 'wt?.goForward?.();', 'var hv = f(mv);', 'export { hv as HistoryNavButtons, Bg };'])
    assert.ok(nav.includes(needle), needle);
  assert.doesNotMatch(nav, /ArrowLeft"|ArrowRight"/);
  assert.match(nav, /import \{ CdsIcon as G, CdsButton as k \} from "\.\.\/cds-core\/shared-frame\.mjs";/);
  assert.match(nav, /BrowserNavigation as wt,/);
  const state = generated('navigation-state.mjs');
  assert.match(state, /import \{ BrowserNavigationState as Am \} from "\.\.\/\.\.\/titlebar-adapter\.mjs";/);
  assert.ok(state.includes('return Am?.navigationStateStore ? { state: "loading" } : { state: "missing" };'));
  const sidebar = generated('sidebar-history-nav.mjs');
  for (const needle of ['(ju(e, "nav-back", n), ju(t, "nav-forward", n));', 'let r = rO(N()) ? "sm" : void 0;', 'buttonClassName: "df-chrome-btn",', 'placement: "sidebar",'])
    assert.ok(sidebar.includes(needle), needle);
  // D1: the focus registry tj writes is frame-sidebar's one copy (linked), not a second one.
  assert.match(sidebar, /import \{ tj as ju \} from "\.\.\/frame-sidebar\/shared-19\.mjs";/);
  assert.doesNotMatch(Object.values(Object.fromEntries(fs.readdirSync(path.join(app, 'src/generated/titlebar')).filter(n => n.endsWith('.mjs')).map(n => [n, generated(n)]))).join('\n'), /new Map\(\)/);
  // The official declarations themselves (only parsed).
  const s20 = fs.readFileSync(path.join(v4, 'shared-20-DUEo90UF.js'), 'utf8');
  for (const needle of ['icon:"CaretLeft"', 'icon:"CaretRight"', 'ov="aria-disabled:pointer-events-none aria-disabled:*:opacity-50"', 'hv=f(mv)', 'hv as xc'])
    assert.ok(s20.includes(needle), needle);
  const s21 = fs.readFileSync(path.join(v4, 'shared-21-CuohtEoj.js'), 'utf8');
  assert.ok(s21.includes('buttonClassName:"df-chrome-btn",placement:"sidebar",size:r,backRef:e,forwardRef:t'));
  const s1 = fs.readFileSync(path.join(v4, 'shared-1-D1bGaTaN.js'), 'utf8');
  assert.ok(s1.includes('Am=globalThis[`claude.web`]?.BrowserNavigation') || s1.includes('Am=globalThis["claude.web"]?.BrowserNavigation'));
});

test('SSR: two ghost icon-only cds-core Buttons with df-chrome-btn + ov, aria-disabled until the store answers; wrappers by placement', () => {
  const html = render(N.SourceNavButtons, { placement: 'sidebar' });
  assert.match(html, /^<div class="flex items-center draggable-none"><button/);
  const [back, forward] = buttons(html);
  for (const button of [back, forward]) {
    assert.match(button, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
    assert.doesNotMatch(button, /data-size=/);
    assert.match(button, / df-chrome-btn aria-disabled:pointer-events-none aria-disabled:\*:opacity-50"/);
    // jm's first state is "loading" (useState(Mm)); the getState promise lands in an effect, which SSR never runs.
    assert.match(button, /aria-disabled="true"/);
    assert.doesNotMatch(button, /\sdisabled(=|\s|$)|title=/);
  }
  // uv's va() is shared-62 Qa (ni($a, !1)): the server snapshot is false, so SSR names the non-mac keys.
  assert.match(back, /aria-label="Back" aria-keyshortcuts="Alt\+ArrowLeft"/);
  assert.match(forward, /aria-label="Forward" aria-keyshortcuts="Alt\+ArrowRight"/);
  assert.match(render(N.SourceNavButtons, { placement: 'project_window' }), /^<div class="flex items-center gap-0\.5 draggable-none">/);
  assert.match(render(N.SourceNavButtons, { placement: 'sidebar', buttonClassName: '' }), /draggable-none"><button[^>]* aria-disabled:pointer-events-none aria-disabled:\*:opacity-50"/);
});

test('mounted: the store follows main.jsx history; Back / Forward call travel(); a mac user agent names cmd+[ / cmd+]; only the primary side publishes', async () => {
  await withPreviewDom(async (dom) => {
    Object.assign(dom.window, { setTimeout, clearTimeout, navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Claude/4.16336.0' } });
    const host = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(host);
    const travels = [];
    const travel = (delta) => travels.push(delta);
    const button = (label) => host.find((node) => node.localName === 'button' && node.getAttribute('aria-label') === label);
    function App({ at, length, primary = true }) {
      H.useHostNavigation(at, length, travel, primary);
      return h(N.SourceNavButtons, { placement: 'sidebar' });
    }
    const settle = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
    try {
      await act(async () => root.render(h(App, { at: 0, length: 1 })));
      await settle();
      assert.equal(button('Back').getAttribute('aria-disabled'), 'true');
      assert.equal(button('Forward').getAttribute('aria-disabled'), 'true');
      act(() => reactProps(button('Back')).onClick?.({ preventDefault() {}, stopPropagation() {} }));
      assert.deepEqual(travels, [], 'uv: `onClick: t ? y : void 0` — an unavailable direction does nothing');
      await act(async () => root.render(h(App, { at: 1, length: 2 })));
      await settle();
      assert.equal(button('Back').getAttribute('aria-disabled'), null);
      assert.equal(button('Forward').getAttribute('aria-disabled'), 'true');
      act(() => reactProps(button('Back')).onClick({}));
      assert.deepEqual(travels, [-1], 'dv → BrowserNavigation.goBack → travel(-1)');
      await act(async () => root.render(h(App, { at: 0, length: 2 })));
      await settle();
      act(() => reactProps(button('Forward')).onClick({}));
      assert.deepEqual(travels, [-1, 1], 'fv → goForward → travel(1)');
      // va() (Qa) read the mac user agent, so uv passes cmd+[ / cmd+] (the CDS Button spells "cmd" from its own platform
      // read, which the fake DOM's navigator does not name: Meta or Control); never Alt+Arrow here.
      assert.match(button('Back').getAttribute('aria-keyshortcuts'), /^(Meta|Control)\+\[$/);
      assert.match(button('Forward').getAttribute('aria-keyshortcuts'), /^(Meta|Control)\+\]$/);
      // A split view's secondary App does not move the window's store.
      await act(async () => root.render(h(App, { at: 3, length: 4, primary: false })));
      await settle();
      assert.equal(button('Back').getAttribute('aria-disabled'), 'true');
      assert.equal(button('Forward').getAttribute('aria-disabled'), null);
      // The host keeps no page list: the state has no listsPages (pv(false, …) gives no press-and-hold props and never
      // loads the lazy HistoryPagesMenu), and historyPages / goToHistoryPage are absent.
      assert.equal('listsPages' in await H.hostBrowserNavigation.navigationStateStore.getState(), false);
      assert.equal(H.hostBrowserNavigation.historyPages, undefined);
      assert.equal(H.hostBrowserNavigation.goToHistoryPage, undefined);
    } finally {
      act(() => root.unmount());
      H.publishHostNavigation({ historyAt: 0, historyLength: 1, travel: null });
    }
  });
});

// 4.16336.0 shared-21 yO (the aside's collapsed pill): `l(fO, {onPointerEnter})` then, withNavButtons,
// `div.df-collapsed-nav.draggable-none.relative.flex.items-center` around `l(_O, {})`.
test('yO: SourceCollapsedChrome renders the compact trigger then df-collapsed-nav with the sliced _O; the titlebar renders neither', () => {
  const chrome = render(T.SourceCollapsedChrome, {});
  assert.ok(chrome.startsWith('<div class="df-collapsed-chrome flex items-center">'), chrome.slice(0, 120));
  const labels = [...chrome.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(match => match[1]).slice(0, 3);
  assert.deepEqual(labels, ['Show sidebar', 'Back', 'Forward']);
  const [trigger] = buttons(chrome);
  assert.match(trigger, /data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-size="lg"/);
  assert.match(trigger, / df-compact-trigger draggable-none"/);
  assert.match(trigger, /aria-label="Show sidebar" aria-keyshortcuts="(?:Meta|Control)\+b"/);
  assert.match(trigger, /aria-expanded="false" aria-controls="frame-peek-popover"/);
  assert.match(buttons(render(T.SourceCollapsedChrome, { peekOpen: true }))[0], /aria-expanded="true"/);
  assert.ok(chrome.indexOf('<div class="df-collapsed-nav draggable-none relative flex items-center"><div class="flex items-center draggable-none">') > chrome.indexOf('aria-label="Show sidebar"'));
  const [back, forward] = buttons(chrome.slice(chrome.indexOf('df-collapsed-nav')));
  for (const button of [back, forward]) assert.match(button, / df-chrome-btn aria-disabled:pointer-events-none aria-disabled:\*:opacity-50"/);
  assert.doesNotMatch(render(T.SourceCollapsedChrome, { withNavButtons: false }), /df-collapsed-nav|aria-label="Back"/);
  const s21 = fs.readFileSync(path.join(v4, 'shared-21-CuohtEoj.js'), 'utf8');
  assert.ok(s21.includes('className:`df-collapsed-nav draggable-none relative flex items-center`,children:l(_O,{})') || s21.includes('className:"df-collapsed-nav draggable-none relative flex items-center",children:l(_O,{})'));
  for (const collapsed of [true, false]) {
    const titlebar = render(T.SourceTitlebar, { collapsed, section: 'new' });
    assert.doesNotMatch(titlebar, /df-collapsed-chrome|df-collapsed-nav|aria-label="Show sidebar"|aria-label="Back"/);
    // surfaces wave 3 (titlebar frame): the Code titlebar is the 4.16336.0 frame (shared-20 o_: the comfortable CdsRoot, then
    // s_'s row with data-top-left and RX's data-perf-region="header"), not the host header.
    assert.match(titlebar, /^<div class="cds-root [^"]*\bcontents" data-density="comfortable"[^>]*><div class="[^"]*"><div data-top-left="true" data-perf-region="header" class="epitaxy-titlebar /);
    assert.doesNotMatch(titlebar, /st-toolbar|window-drag/);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/source-nav-buttons.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), /\S/);
});
