import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// SSR of the Back/Forward cluster (2.2553.1 sidebar-session.js:10732-10800 qM) and its
// collapsed placement (3.6556.2 shared-21 CI df-collapsed-chrome/df-collapsed-nav, the aside's pill).
let server, N, T;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  N = await server.ssrLoadModule('/src/source-nav-buttons.jsx');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
});
after(() => server?.close());
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const buttons = html => html.split('<button').slice(1).map(chunk => chunk.slice(0, chunk.indexOf('>')));

test('navAvailability mirrors travel() bounds', () => {
  assert.deepEqual(N.navAvailability(0, 1), { canGoBack: false, canGoForward: false });
  assert.deepEqual(N.navAvailability(0, 2), { canGoBack: false, canGoForward: true });
  assert.deepEqual(N.navAvailability(1, 2), { canGoBack: true, canGoForward: false });
  assert.deepEqual(N.navAvailability(1, 3), { canGoBack: true, canGoForward: true });
});

// W12 frame: 3.6556.2 shared-20 Cm (shared-21 xI `u(w_,{buttonClassName:"df-chrome-btn",placement:"sidebar",size:a,…})`)
// draws two ghost icon-only CDS Buttons; the host ToolButton (24px code-icon-button) is gone.
test('Cm: ghost icon-only CdsButtons with df-chrome-btn + Sm, aria-disabled instead of disabled, sidebar wrapper', () => {
  const html = render(N.SourceNavButtons, { placement: 'sidebar', historyAt: 0, historyLength: 1 });
  assert.match(html, /^<div class="flex items-center draggable-none"><button/);
  assert.doesNotMatch(html, /source-nav-buttons|code-icon-button|data-placement/);
  const [back, forward] = buttons(html);
  for (const button of [back, forward]) {
    assert.match(button, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
    // xI size: the fizzy-lake "panels" gate is closed, so no size (h-control default) — no data-size attribute.
    assert.doesNotMatch(button, /data-size=/);
    assert.match(button, / df-chrome-btn aria-disabled:pointer-events-none aria-disabled:\*:opacity-50"/);
    assert.match(button, /aria-disabled="true"/);
    assert.doesNotMatch(button, /\sdisabled(=|\s|$)/);
    assert.doesNotMatch(button, /title=/);
  }
  // No window in node: isMacUserAgent() is false (as Qr() is on the server), so Cm's non-mac alt+left / alt+right.
  assert.match(back, /aria-label="Back"/); assert.match(back, /aria-keyshortcuts="Alt\+ArrowLeft"/);
  assert.match(forward, /aria-label="Forward"/); assert.match(forward, /aria-keyshortcuts="Alt\+ArrowRight"/);
  const middle = buttons(render(N.SourceNavButtons, { placement: 'sidebar', historyAt: 1, historyLength: 3 }));
  for (const button of middle) assert.doesNotMatch(button, /aria-disabled="true"/);
  assert.match(render(N.SourceNavButtons, { placement: 'project_window' }), /^<div class="flex items-center gap-0\.5 draggable-none">/);
  assert.deepEqual(N.NAV_TOOLTIPS, {
    back: { content: 'Back', shortcut: 'cmd+[', side: 'bottom', hoverable: false },
    forward: { content: 'Forward', shortcut: 'cmd+]', side: 'bottom', hoverable: false },
  });
  // Official text (only parsed): Cm's wrapper / Sm / Button props, and xI's call.
  const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const cm = fs.readFileSync(path.join(v1, 'shared-20-mUr7IqZY.js'), 'utf8');
  for (const needle of ['"aria-disabled:pointer-events-none aria-disabled:*:opacity-50"',
    '"sidebar"?"flex items-center draggable-none":"flex items-center gap-0.5 draggable-none"',
    'variant:"ghost",iconOnly:!0,icon:f?"CaretLeft":"ArrowLeft",className:x,tooltipSide:"bottom",shortcut:g'])
    assert.ok(cm.includes(needle), needle);
  const s21 = fs.readFileSync(path.join(v1, 'shared-21-R7LldJ05.js'), 'utf8');
  assert.ok(s21.includes('buttonClassName:"df-chrome-btn",placement:"sidebar",size:a'));
  // The utilities are in the loaded sheet.
  const sheet = fs.readFileSync(path.join(v1, 'c6a992d55-Che1orl5.css'), 'utf8');
  for (const rule of ['.aria-disabled\\:pointer-events-none[aria-disabled=true]{pointer-events:none}', '.aria-disabled\\:\\*\\:opacity-50[aria-disabled=true]>*{opacity:.5}'])
    assert.ok(sheet.includes(rule), rule);
  assert.doesNotMatch(fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-nav-buttons.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), /\S/);
});

// W12 frame-settings-cont: Cm `h=Qr(),g=h?"cmd+[":"alt+left",_=h?"cmd+]":"alt+right"` (Qr = shared-78 Do, the To
// user-agent test); the host branches on view-tabs isMacUserAgent (shared-78 Eo, the same To regex).
test('Cm platform branch: cmd+[ / cmd+] on a Mac user agent, alt+left / alt+right elsewhere', () => {
  assert.deepEqual(N.navShortcuts(true), { back: 'cmd+[', forward: 'cmd+]' });
  assert.deepEqual(N.navShortcuts(false), { back: 'alt+left', forward: 'alt+right' });
  const keys = () => [...render(N.SourceNavButtons, { placement: 'sidebar', historyAt: 1, historyLength: 3 })
    .matchAll(/aria-keyshortcuts="([^"]+)"/g)].map(match => match[1]);
  const had = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const as = userAgent => { Object.defineProperty(globalThis, 'window', { value: { navigator: { userAgent } }, configurable: true, writable: true }); };
  try {
    as('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Claude/3.6556.2');
    assert.equal(N.navShortcuts().back, 'cmd+[');
    // The CDS Button resolves "cmd" with its own (hydration-time) platform read, so SSR spells it Control.
    assert.match(keys().join(' '), /^(Meta|Control)\+\[ (Meta|Control)\+\]$/);
    for (const ua of ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36']) {
      as(ua);
      assert.deepEqual(N.navShortcuts(), { back: 'alt+left', forward: 'alt+right' });
      assert.deepEqual(keys(), ['Alt+ArrowLeft', 'Alt+ArrowRight']);
    }
  } finally {
    if (had) Object.defineProperty(globalThis, 'window', had); else delete globalThis.window;
  }
  const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const cm = fs.readFileSync(path.join(v1, 'shared-20-mUr7IqZY.js'), 'utf8');
  assert.ok(cm.includes('h=Qr(),g=h?"cmd+[":"alt+left",_=h?"cmd+]":"alt+right"'));
  assert.match(cm, /import\{[^}]*\bSE as Qr\b[^}]*\}from"\.\/shared-78-D5Fw2h0a\.js"/);
  const s78 = fs.readFileSync(path.join(v1, 'shared-78-D5Fw2h0a.js'), 'utf8');
  for (const needle of ['Do as SE', 'function Do(){return Oe(Oo,!1)}function Oo(){return To.test(window.navigator.userAgent)}', 'To=/(macintosh|macintel|macppc|mac68k|macos)/i'])
    assert.ok(s78.includes(needle), needle);
});

// w11-frame-root-cont: 3.6556.2 shared-21 CI (shared-22 GI `l ? I ? null : o(Sy, …)`) is the aside's collapsed pill, so
// the session titlebar no longer renders it (it carries cc43287c9 Vh's data-top-left clearance target instead).
test('CI: SourceCollapsedChrome renders the compact trigger then df-collapsed-nav with Back/Forward; the titlebar renders neither', () => {
  const chrome = render(T.SourceCollapsedChrome, { historyAt: 1, historyLength: 2 });
  assert.ok(chrome.startsWith('<div class="df-collapsed-chrome flex items-center">'), chrome.slice(0, 120));
  const labels = [...chrome.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(match => match[1]).slice(0, 3);
  assert.deepEqual(labels, ['Show sidebar', 'Back', 'Forward']);
  const [trigger] = buttons(chrome);
  // W12 frame — gI: CdsTooltip around a ghost icon-only CdsButton, size "lg" (compact aside; the 28px --df-pill-size pill),
  // CdsIcon sm "Sidebar" text-secondary, data-testid, `df-compact-trigger draggable-none`, aria-expanded / aria-controls (wC).
  assert.match(trigger, /data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-size="lg"/);
  assert.match(trigger, / df-compact-trigger draggable-none"/);
  assert.doesNotMatch(trigger, /code-icon-button|aria-expanded:bg-fill-ghost-hover|title=/);
  assert.match(trigger, /aria-label="Show sidebar" aria-keyshortcuts="(?:Meta|Control)\+b"/);
  assert.match(trigger, /data-testid="sidebar-compact-trigger"/);
  assert.match(trigger, /aria-expanded="false" aria-controls="frame-peek-popover"/);
  assert.match(chrome, /<span data-cds="Icon" style="font-size:calc\(1rem \* var\(--cds-rem-scale, 1\)\);font-weight:533\.3" class="text-secondary" aria-hidden="true">/);
  assert.doesNotMatch(trigger, /data-peek-open/);
  assert.match(buttons(render(T.SourceCollapsedChrome, { peekOpen: true }))[0], /aria-expanded="true"/);
  const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const s21 = fs.readFileSync(path.join(v1, 'shared-21-R7LldJ05.js'), 'utf8');
  for (const needle of ['_==="compact"?"lg":', '"data-testid":"sidebar-compact-trigger"', '"aria-controls":wC', 'shortcut:"cmd+b",hoverable:!1', 'pI="text-secondary"'])
    assert.ok(s21.includes(needle), needle);
  assert.ok(fs.readFileSync(path.join(v1, 'shared-styles-D_GJawPO.css'), 'utf8').includes('--df-pill-size:28px'));
  assert.ok(chrome.indexOf('<div class="df-collapsed-nav draggable-none relative flex items-center"><div class="flex items-center draggable-none">') > chrome.indexOf('aria-label="Show sidebar"'));
  const [back, forward] = buttons(chrome.slice(chrome.indexOf('df-collapsed-nav')));
  assert.doesNotMatch(back, /aria-disabled="true"/); assert.match(forward, /aria-disabled="true"/);
  assert.doesNotMatch(render(T.SourceCollapsedChrome, { withNavButtons: false }), /df-collapsed-nav|aria-label="Back"/);
  for (const collapsed of [true, false]) {
    const titlebar = render(T.SourceTitlebar, { collapsed, section: 'new', historyAt: 1, historyLength: 2 });
    assert.doesNotMatch(titlebar, /df-collapsed-chrome|df-collapsed-nav|aria-label="Show sidebar"|aria-label="Back"/);
    assert.match(titlebar, /^<header class="workspace-toolbar st-toolbar window-drag" data-surface="code" data-top-left="true">/);
  }
});
