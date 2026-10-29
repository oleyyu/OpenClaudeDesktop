import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

// w10-shell-settings: notdone 45 (Storage copy, D23 keeps "Claude"), menus:W2 (search "+N more" jump set) and
// menus:W3 (stacked Settings popup under 768px). Official chunks are read as text, never executed.
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
  createElement: () => ({ relList: { supports: () => false } }) };
const v3 = name => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
const source = name => fs.readFileSync(path.join(app, name), 'utf8');
let server, React, render, pages;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
});
// V3-w11-sweep-shell-b: a module of the settings graph may still be running a dynamic import() (source-home-adapters.jsx
// no longer preloads under SSR, but the graph is shared): close only once the SSR runner has settled (shared helper).
after(() => closeWhenSettled(server));

test('notdone 45: the Storage row and the Storage dialog header read the 3.6556.2 copy', async () => {
  const official = v3('c71860c77-BH7EuJ1o.js');
  assert.ok(official.includes('{defaultMessage:"See how much space Claude uses on this computer.",id:"HT0EwshToA"}'));
  assert.ok(official.includes('r(D.Header,{description:r(Y,{defaultMessage:"Space Claude uses on this computer.",id:"hCcWWt16U7"}'));
  const settings = source('src/source-settings.jsx');
  assert.ok(settings.includes("row('storage',t('Storage'),t('See how much space Claude uses on this computer.'),"));
  assert.equal(settings.includes('See how much space OpenClaude Desktop uses'), false);
  const html = render(React.createElement(pages.StorageDialog, { call: async () => ({}), settingsRoot: { current: null }, onClose() {} }));
  assert.match(html, /<header class="ss-storage-header"><h2 id="[^"]+">Storage<\/h2><p id="[^"]+">Space Claude uses on this computer\.<\/p>/);
  const text = source('src/source-settings-pages.jsx');
  for (const gone of ['Space OpenClaude Desktop and local {name} data use on this computer.', 'Space OpenClaude Desktop and its agent core use on this computer.'])
    assert.equal(text.includes(gone), false, gone);
  const { setLocale, DEFAULT_LOCALE, t } = await import('../electron/i18n/index.mjs');
  try {
    setLocale('zh-CN');
    assert.equal(t('See how much space Claude uses on this computer.'), '查看 Claude 在此电脑上占用的空间。');
    assert.equal(t('Space Claude uses on this computer.'), 'Claude 在此电脑上占用的空间。');
  } finally { setLocale(DEFAULT_LOCALE); }
});

test('menus:W2: only the Customize lists keep the "+N more" jump (shared-156 Dm = xh), with the search seed', async () => {
  const official = v3('cc011544b-Bdta0Cl7.js');
  assert.ok(official.includes('xh as Te'), 'cc011544b imports shared-156 xh as Te');
  assert.ok(v3('shared-156-BLTosN8U.js').includes('Dm as xh'));
  assert.ok(v3('shared-156-BLTosN8U.js').includes('Dm=new Set(["customize-skills","customize-connectors","customize-plugins"])'));
  assert.ok(official.includes('else if(e.kind==="more"){let e=u.trim();e!==""&&J.setState({panelSearchSeed:e})'), 'a jumping "+N more" seeds the page search');
  const { SETTINGS_SEARCH_JUMP_SECTIONS } = await import('../src/settings-catalog-search.mjs');
  assert.deepEqual([...SETTINGS_SEARCH_JUMP_SECTIONS], ['customize-skills', 'customize-connectors', 'customize-plugins']);
  assert.ok(source('src/source-settings.jsx').includes("setFocus(result.focus||((result.kind==='more'&&destination.startsWith('customize-'))?{searchSeed:query.trim()}:null));"));
});

test('menus:W3: under 768px Settings is a stacked lg Dialog with a title header, the tabs in pb-md and a scrolling popup', () => {
  const shell = v3('shared-46-BIbZBGFq.js'), frame = v3('shared-frame-6jtSkIit.js');
  assert.ok(shell.includes('F=fe("(max-width: 767px)",M())') && shell.includes('stacked:F,'), 'stacked = the 767px media query');
  assert.ok(shell.includes('B.Popup,{size:"lg",fullHeight:!0'));
  assert.ok(shell.includes('className:"shrink-0 pb-md",children:_'));
  assert.ok(shell.includes('mg="flex min-w-0 shrink-0 grow flex-col wrap-normal"'), 'popupScrolls pane root: no surface');
  assert.ok(frame.includes('lg:"max-w-[720px]"') && frame.includes('Zv="isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-[inherit] p-xl break-words"'));
  assert.ok(frame.includes('My="-mt-1"') && frame.includes('Yy="-me-pad-sm -mt-pad-sm"') && frame.includes('Ay="text-title font-semibold font-header break-words"'));
  const css = source('src/source-settings.css');
  const rule = selector => { const at = css.indexOf(selector + ' {'); assert.ok(at >= 0, selector); return css.slice(at, css.indexOf('}', at)); };
  // W12 settings: the popup (Xv) keeps size, surface and ring and no longer scrolls; .ss-stacked-body is Zv.
  const popup = rule('.ss-settings-dialog:has(> .ss-stacked-body)');
  for (const part of ['max-width:720px', 'height:var(--ss-stacked-height)', 'background:var(--cds-surface-3)', 'var(--cds-shadow-lg)', 'border:0'])
    assert.ok(popup.includes(part), part);
  for (const gone of ['overflow-y:auto', 'padding:var(--cds-pad-xl)']) assert.equal(popup.includes(gone), false, gone);
  const body = rule('.ss-stacked-body');
  for (const part of ['isolation:isolate', 'display:flex', 'min-height:0', 'flex:1 1 0%', 'flex-direction:column', 'overflow-y:auto', 'border-radius:inherit', 'padding:var(--cds-pad-xl)', 'overflow-wrap:break-word'])
    assert.ok(body.includes(part), part);
  assert.equal(css.includes(':has(> .ss-narrow)::after'), false, 'the nested-dialog dim is the plain absolute ::after again');
  assert.equal(rule('.ss-narrow').includes('padding-bottom'), false, 'the tabs wrapper is shared-46 "shrink-0 pb-md"');
  assert.equal(rule('.ss-narrow').includes('border-bottom'), false, 'no 2.42304.0 header strip');
  assert.match(rule('.ss-narrow-heading'), /align-items:flex-start; gap:8px; margin-bottom:var\(--cds-pad-md\)/);
  const title = rule('.ss-narrow-heading strong');
  for (const part of ['margin-top:-4px', 'font-size:var(--cds-font-size-title)', 'var(--cds-font-weight-semibold)', 'var(--cds-font-sans-display)']) assert.ok(title.includes(part), part);
  assert.match(rule('.ss-settings-dialog .ss-narrow-heading .ss-close'), /margin-inline-end:calc\(-1 \* var\(--cds-pad-sm\)\); margin-top:calc\(-1 \* var\(--cds-pad-sm\)\)/);
  assert.match(rule('.ss-stacked-body > .ss-pane[data-customize=false] > .ss-content'), /overflow:visible; padding:0/);
  assert.match(rule('.ss-stacked-body > .ss-pane[data-customize=true]'), /margin:0 calc\(-1 \* var\(--cds-pad-xl\)\) calc\(-1 \* var\(--cds-pad-xl\)\)/);
  const jsx = source('src/source-settings.jsx');
  assert.ok(jsx.includes('const stackedBody = children => narrow ? <div className="ss-stacked-body scroll-fade-y">{children}</div> : children;'));
  // The narrow header is still the host's 767px state (innerWidth<=767).
  assert.ok(source('src/source-settings.jsx').includes('setNarrow(innerWidth<=767)'));
});
