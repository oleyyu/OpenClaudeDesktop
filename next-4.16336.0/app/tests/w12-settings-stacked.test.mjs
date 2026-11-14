import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { scrollPopupToTop } from '../src/settings-shell-model.mjs';

// W12 settings (menus W3 remainder), rewritten for U-SET-LITE (2026-11-12, the hand-written simple Settings shell): the
// narrow stacked dialog (Zv body with scroll-fade-y, ss-narrow header, CDS Tabs) is gone; one sl-* shell serves every
// width and the narrow layout is CSS only (settings-lite.css). Kept: On()'s scroll helper, the Usage page opened on its
// own (header without nav), and the CDS layer above the Settings backdrop. Official chunks are read as text, never
// executed.
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// W8-M9 stub contract (round4 integration, stub fields only): cds-core 9203795f reads these at load (official 4.16336.0): document.cookie.
globalThis.document ??= { cookie: '' /* W8-M9: shared-0 CQ / Wo document.cookie */, body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
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

test('one sl-* shell at every width: header, then nav beside the pane; no stacked Zv body, ss-narrow header or official rail', () => {
  const wide = page('preferences'), narrow = narrowPage('preferences');
  // The narrow layout is CSS only, so 700px and 1200px render the same markup.
  assert.equal(narrow, wide, 'no width-dependent markup');
  assert.match(wide, /^<div class="ss-backdrop ss-settings-backdrop"[^>]*><section class="ss-dialog ss-settings-dialog sl-dialog"[^>]* role="dialog" aria-modal="true" aria-labelledby="([^"]+)" tabindex="-1"><header class="sl-header"><h2 id="\1">Settings<\/h2><button type="button" class="ss-close" aria-label="Close">/);
  assert.match(wide, /<\/button><\/header><div class="sl-body"><nav class="sl-nav" aria-label="Settings"><div class="ss-search"/, 'the nav (search first) under the header');
  assert.match(wide, /<\/nav><div class="ss-pane sl-pane" data-customize="false"><div class="ss-content sl-content" data-page="preferences" data-entry="appearance"><span hidden=""><\/span><h2 class="sl-page-title">Appearance<\/h2>/, 'the pane beside the nav: hidden dedupe mark, then the page title');
  for (const gone of ['ss-stacked-body', 'scroll-fade-y', 'ss-narrow', 'class="sr-only">Settings', 'data-perf-region="settings_nav"'])
    assert.equal(wide.includes(gone), false, gone);
  // settings-lite.css: below 768px the body stacks, the nav list becomes one horizontally scrolling row and the separators
  // and the API keys footer hide.
  const css = source('src/settings-lite.css');
  const narrowRules = /@media \(max-width:767px\) \{\n([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  assert.match(narrowRules, /\.sl-body \{ flex-direction:column; \}/);
  assert.match(narrowRules, /\.sl-nav \{ width:auto; border-right:0; border-bottom:1px solid var\(--cds-alpha-2\); \}/);
  assert.match(narrowRules, /\.sl-nav-list \{ flex:none; flex-direction:row; overflow-x:auto; \}/);
  assert.match(narrowRules, /\.sl-sep, \.sl-nav-footer \{ display:none; \}/);
  // The content column is the scroller at every width (no .ss-stacked-body override any more).
  assert.match(source('src/source-settings.css'), /^\.ss-content \{ flex:1; min-width:0; min-height:0; overflow:auto; \}$/m);
});

test('On(): scrollPopupToTop scrolls the nearest overflow-y auto/scroll ancestor, stopping at position:fixed; the sl-* page change mounts a fresh content scroller', () => {
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
  assert.ok(jsx.includes('<div ref={pane} className="ss-pane sl-pane" data-customize="false">'));
  // U-SET-LITE: in the sl-* shell the scroller is the pane's own content column (.ss-content overflow:auto), not an
  // ancestor: from the pane the walk meets .sl-body (visible), the dialog (overflow hidden) and the fixed backdrop.
  const backdropLite = node({ overflowY: 'visible', position: 'fixed' });
  const dialogLite = node({ overflowY: 'hidden', position: 'relative' }, backdropLite);
  const slPane = node({ overflowY: 'visible', position: 'relative' }, node({ overflowY: 'visible', position: 'static' }, dialogLite));
  assert.equal(scrollPopupToTop(slPane), null);
  // So the page change itself resets the scroll: the content column is keyed by the nav entry (and the Customize pill),
  // and a new entry mounts a new scroller at the top.
  assert.ok(jsx.includes(`<div className="ss-content sl-content" key={shownEntry.id+(shownEntry.mode==='tabs'?':'+tab:'')} data-page={tab} data-entry={shownEntry.id}>`));
});

test('Usage opened on its own: the sl-header titled Usage with Close, no nav and no page title, data-usage on the dialog; same at every width', () => {
  const usage = page('usage');
  assert.equal(narrowPage('usage'), usage, 'no width-dependent markup');
  assert.match(usage, /<section class="ss-dialog ss-settings-dialog sl-dialog" data-usage="true"[^>]* role="dialog" aria-modal="true" aria-labelledby="([^"]+)" tabindex="-1"><header class="sl-header"><h2 id="\1">Usage<\/h2><button type="button" class="ss-close" aria-label="Close">/);
  assert.match(usage, /<\/button><\/header><div class="sl-body"><div class="ss-pane sl-pane" data-customize="false"><div class="ss-content sl-content" data-page="usage" data-entry="usage"><span hidden=""><\/span><section class="source-usage"/, 'the Usage page right under the header');
  for (const gone of ['<nav', 'sl-page-title', 'ss-usage-header', 'ss-stacked-body', 'role="tablist"']) assert.equal(usage.includes(gone), false, gone);
  // Settings opened anywhere else keeps the nav (Usage is one of its entries) and has no data-usage.
  const settings = page('preferences');
  assert.equal(settings.includes('data-usage'), false);
  assert.match(settings, /<header class="sl-header"><h2 id="[^"]+">Settings<\/h2>/);
  assert.match(settings, /<button type="button" class="sl-nav-item" data-testid="settings-nav-usage">(?:(?!<\/button>)[\s\S])*<span>Usage<\/span><\/button>/);
});

test('narrow nav: the sl-nav buttons replace the stacked CDS Tabs; official groups keep their CDS layer above the Settings backdrop', () => {
  const frame = v3('shared-frame-6jtSkIit.js');
  // shared-frame Lf/Hf: a CDS menu stacks at base + 100 + 20; the Settings backdrop is z-500 (.ss-backdrop --cds-layer-base).
  assert.ok(frame.includes('a=n??i+Pf') && frame.includes('Rf={modal:40,tooltip:30,contextmenu:30,popover:20,menu:20,combobox:20,coachmark:10}'));
  assert.ok(source('src/source-settings.css').includes('.ss-backdrop { --cds-layer-base:500; }'));
  const jsx = source('src/source-settings.jsx');
  // Neither the official stacked tabs (shared-55 ev) nor the official rail (z_) is rendered any more.
  assert.equal(jsx.includes('<SettingsNavStacked'), false);
  assert.equal(jsx.includes('<SettingsRailWithLocalGroups'), false);
  // The official page groups still draw in a CDS layer based at the backdrop's 500, so their menus stack above Settings.
  for (const official of ['SettingsDesktopPage', 'SettingsClaudeCodeGroups', 'SettingsGeneralAppearance', 'SettingsClaudeCodeAppearance', 'SettingsDeveloperPage'])
    assert.match(jsx, new RegExp(`<CdsLayerProvider (?:key=\\{[^}]+\\} )?base=\\{500\\}><${official} `), official);
  // At 700px the nav is the same button list as wide (settings-lite.css lays it out as a row): every entry in order, three
  // separators, one current entry, the API keys footer; no tablist / tab roles.
  const html = narrowPage('preferences');
  const nav = /<nav class="sl-nav" aria-label="Settings">[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
  assert.deepEqual([...nav.matchAll(/<button type="button" class="sl-nav-item" data-testid="settings-nav-([^"]+)"/g)].map(m => m[1]),
    ['account', 'usage', 'appearance', 'your-claude', 'models', 'notifications', 'customize', 'code', 'desktop']);
  assert.equal(nav.match(/<hr class="sl-sep"\/>/g)?.length, 3);
  assert.equal(nav.match(/aria-current="page"/g)?.length, 1);
  assert.match(nav, /data-testid="settings-nav-appearance" aria-current="page"><span data-cds="Icon"[^>]*>[^<]*<\/span><span>Appearance<\/span><\/button>/);
  assert.match(nav, /<\/div><button type="button" class="sl-nav-footer"><span>API keys<\/span>/);
  assert.equal(/role="tab(?:list)?"/.test(nav), false);
});
