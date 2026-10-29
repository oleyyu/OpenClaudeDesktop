import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { scrollPopupToTop } from '../src/settings-shell-model.mjs';

// W12 settings (menus W3 remainder): the stacked Settings dialog's Zv body with scroll-fade-y, On()'s scroll back to
// the top on a section change, and the stacked header without tabs for the Usage page opened on its own. Official
// chunks are read as text, never executed.
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
  createElement: () => ({ relList: { supports: () => false } }) };
const v3 = name => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
const source = name => fs.readFileSync(path.join(app, name), 'utf8');
let server, Settings, React, render;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
});
after(() => closeWhenSettled(server));
const page = initialSection => render(React.createElement(Settings, { open: true, config: { threadIds: [] }, model: 'm', effort: 'medium',
  permission: 'ask', boot: { connected: true, models: [] }, busy: false, initialSection, desktopCall: async () => ({}), onSave: async () => ({}), onClose() {} }));
const narrowPage = initialSection => { globalThis.innerWidth = 700; try { return page(initialSection); } finally { globalThis.innerWidth = 1200; } };

test('scroll-fade-y: the stacked popup scrolls in a Zv body (shared-frame Zv) that holds the header, the tabs and the pane', () => {
  const frame = v3('shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('Zv="isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-[inherit] p-xl break-words"'));
  assert.ok(frame.includes('b("div",{className:Zv,children:i})'), 'non-panels Popup: children inside the Zv body');
  const html = narrowPage('preferences');
  assert.match(html, /<h2 id="[^"]+" class="sr-only">Settings<\/h2><div class="ss-stacked-body scroll-fade-y"><header class="ss-narrow"><div class="ss-narrow-heading">/);
  const body = html.slice(html.indexOf('<div class="ss-stacked-body'));
  assert.ok(body.includes('<div class="ss-pane" data-customize="false">'), 'the pane scrolls with the header');
  // Wide Settings keep the rail and no stacked body.
  const wide = page('preferences');
  assert.equal(wide.includes('ss-stacked-body'), false);
  assert.ok(wide.includes('<nav class="ss-nav"'));
});

test('On(): a section change scrolls the nearest overflow-y auto/scroll ancestor of the pane to the top, stopping at position:fixed', () => {
  const official = v3('cc011544b-Bdta0Cl7.js');
  assert.ok(official.includes('let{overflowY:t,position:n}=v(e).getComputedStyle(e);if(t==="auto"||t==="scroll"){e.scrollTop=0;return}if(n==="fixed")return'));
  assert.ok(official.includes('D=On(E,_)'), 'kn: On(shown section, popupScrolls)');
  const node = (style, parent = null) => ({ parentElement: parent, scrollTop: 40, style, ownerDocument: { defaultView: { getComputedStyle: element => element.style } } });
  const backdrop = node({ overflowY: 'visible', position: 'fixed' });
  const popup = node({ overflowY: 'hidden', position: 'relative' }, backdrop);
  const body = node({ overflowY: 'auto', position: 'static' }, popup);
  const pane = node({ overflowY: 'visible', position: 'relative' }, body);
  assert.equal(scrollPopupToTop(pane), body);
  assert.equal(body.scrollTop, 0);
  assert.equal(popup.scrollTop, 40, 'only the nearest scroller');
  const fixedFirst = node({ overflowY: 'visible', position: 'relative' }, node({ overflowY: 'visible', position: 'fixed' }, node({ overflowY: 'auto', position: 'static' })));
  assert.equal(scrollPopupToTop(fixedFirst), null);
  assert.equal(scrollPopupToTop(null), null);
  const jsx = source('src/source-settings.jsx');
  assert.ok(jsx.includes('useLayoutEffect(()=>{if(narrow)scrollPopupToTop(pane.current);},[tab,narrow]);'), 'layout effect (vendor-frame bo = useLayoutEffect)');
  assert.ok(jsx.includes('<div ref={pane} className="ss-pane"'));
});

test('stacked Usage: the Settings header (B.Header) without tabs, no Usage strip; wide keeps the Usage dialog', () => {
  const shell = v3('shared-46-BIbZBGFq.js');
  assert.ok(shell.includes('F?W?null:o(Yh,{activeSection:H})'), 'stacked + focused: header (tabs) is null');
  assert.ok(shell.includes('o(B.Header,{children:c})') && shell.includes('_!==null&&o("div",{className:"shrink-0 pb-md",children:_})'));
  assert.ok(shell.includes('hideHeaderRow:$e,popupScrolls:F'), 'the pane hides its own header row when stacked');
  const usage = narrowPage('usage');
  assert.match(usage, /<h2 id="[^"]+" class="sr-only">Settings<\/h2><div class="ss-stacked-body scroll-fade-y"><header class="ss-narrow"><div class="ss-narrow-heading"><strong aria-hidden="true">Settings<\/strong><button type="button" class="ss-close" aria-label="Close">/);
  assert.match(usage, /<\/button><\/div><\/header><div class="ss-pane" data-customize="false"><div class="ss-content" data-page="usage">/, 'no tabs wrapper');
  for (const gone of ['ss-usage-header', 'data-usage', 'role="tablist"']) assert.equal(usage.includes(gone), false, gone);
  const wide = page('usage');
  assert.match(wide, /<header class="ss-usage-header">/);
  assert.match(wide, /data-usage="true"/);
});

test('Xh: the stacked tabs are CDS Tabs above the Settings layer, with no Xh class while kh() is off', () => {
  const shell = v3('shared-46-BIbZBGFq.js'), tabs = v3('shared-10-D6FXWZph.js'), frame = v3('shared-frame-6jtSkIit.js');
  assert.ok(shell.includes('var Dh="__gb__2598786380"') && shell.includes('function kh(){return Ae(Dh)}') && shell.includes('v=a?Xh:void 0'));
  assert.ok(shell.includes('disabledReason:e.disabledReason??null,disabledReasonSide:"bottom"'));
  assert.ok(tabs.includes('Mr="flex items-center font-sans"'));
  // shared-frame Lf/Hf: a CDS menu stacks at base + 100 + 20; the Settings backdrop is z-500 (.ss-backdrop --cds-layer-base).
  assert.ok(frame.includes('a=n??i+Pf') && frame.includes('Rf={modal:40,tooltip:30,contextmenu:30,popover:20,menu:20,combobox:20,coachmark:10}'));
  assert.ok(source('src/source-settings.jsx').includes('<CdsLayerProvider base={500}><CdsTabs.Root'));
  assert.ok(source('src/source-settings.css').includes('.ss-backdrop { --cds-layer-base:500; }'));
  const html = narrowPage('preferences');
  const list = /<div[^>]*role="tablist"[^>]*>/.exec(html)?.[0] ?? '';
  assert.ok(list.startsWith('<div data-orientation="horizontal"'));
  assert.equal(list.includes('scroll-fade-x'), false);
});
