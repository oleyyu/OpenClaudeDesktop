// w12b-terminal-preview-tabs: the Preview strip on ViewTabBar (TPT-1, cf580efe9 Oa), its close confirmation on the CDS
// alert dialog (TPT-2, cf580efe9 va / shared-frame ib), the two confirmations on CdsConfirmationDialog (TPT-3), the dev
// server logs drawer (TPT-4, cf580efe9 So / Go), the Allowed sites dialog (TPT-5, c36734a81 P) and the generated
// EmptyState on the terminal and Preview covers (TPT-8). Source, generated output and SSR; nothing is opened.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Tabs, Pane, Strip, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  Tabs = await server.ssrLoadModule('/src/source-preview-tabs.jsx');
  Pane = await server.ssrLoadModule('/src/source-preview-pane.jsx');
  Strip = await server.ssrLoadModule('/src/generated/code-editor/preview-tab-strip.mjs');
});
after(() => server?.close());

const noop = () => {};
const strip = (tabs, extra = {}) => renderToStaticMarkup(React.createElement(Tabs.SourcePreviewTabs,
  { tabs, activeId: tabs.at(-1)?.id, onSelect: noop, onCreate: noop, onClose: noop, onCloseOthers: noop, onExternal: noop, onReorder: noop, ...extra }));

test('TPT-1: the official Oa strip props, labels and tab rows', () => {
  const oa = official('cf580efe9-BFcQCjF9.js');
  for (const feature of ['r(Qn,{ref:fe,className:"min-w-0 flex-1 outline-none focus-visible:shadow-focus focus-visible:outline-hidden"',
    'label:t.title?.trim()||Ca(t.origin),detail:t.origin,icon:r(gr,{src:t.faviconUrl,busy:t.loading||t.toolActive===!0},t.faviconUrl),closable:!0',
    'function Ca(e){try{let{port:t}=new URL(e);if(t&&pt(e))return t}catch{}return ht(e)}', 'createDisabled:mr(E.length)', 'newTabShortcut:a?"cmd+t":void 0'])
    assert.equal(count(oa, feature), 1, feature);
  assert.ok(official('c224804cc-Ct9XIdre.js').includes('function K(e){let $=J9(3),n=A()==="md"?20:12;return J2($,0,e,n)?K2($,0,e,n,t(D,{...e,size:n})):$[2]}'));
  // Ca: a loopback address with a port reads as the port; anything else as its host (or a file's name).
  assert.equal(Strip.previewTabLabel('http://localhost:3000/'), '3000');
  assert.equal(Strip.previewTabLabel('http://127.0.0.1:5173/x'), '5173');
  assert.equal(Strip.previewTabLabel('https://example.com/a'), 'example.com');
  assert.equal(Strip.previewTabLabel('file:///tmp/site/index.html'), 'index.html');
  assert.equal(Strip.previewTabsAtCap(8), false);
  assert.equal(Strip.previewTabsAtCap(9), true);
  assert.equal(Strip.previewSeedTabId, 'seed');

  const html = strip([
    { id: 'a', url: 'http://localhost:3000/', title: '' },
    { id: 'b', url: 'https://example.com/', title: 'Example', faviconUrl: 'https://example.com/f.ico' },
    { id: 'c', url: 'http://localhost:4000/', title: 'Busy', loading: true },
    { id: 'd', url: '', title: '' },
  ]);
  assert.match(html, /<div[^>]*data-view-tab-bar=""[^>]*class="[^"]*source-view-tabs min-w-0 flex-1 outline-none focus-visible:shadow-focus focus-visible:outline-hidden"/);
  assert.match(html, /role="tablist" aria-label="Preview tabs"/);
  assert.match(html, /<span class="whitespace-nowrap text-start">3000<\/span>/, 'Ca: the port for an untitled localhost page');
  assert.match(html, /<img src="https:\/\/example\.com\/f\.ico" alt="" referrerPolicy="no-referrer" class="size-3 object-contain"\/>/, 'c25e47851 a at 12px');
  assert.match(html, /<span class="flex size-3 items-center justify-center motion-safe:animate-pulse">/, 'busy pulses (no spinner)');
  assert.match(html, /data-vtb-id="d"[\s\S]*?<span class="whitespace-nowrap text-start">New tab<\/span>/, 'a blank tab is New tab');
  assert.doesNotMatch(html, /source-file-tab|spv-tab|data-preview-tab-id|SourceSpinner|localhost:3000<\/span>/);
  // No tabs: Oa's placeholder row (_t "seed", not closable) and nothing to close.
  const empty = strip([]);
  assert.match(empty, /data-vtb-id="seed" data-selected="true"/);
  assert.doesNotMatch(empty, /aria-label="Close tab"/);
  const source = local('src/source-preview-tabs.jsx');
  for (const gone of ['SourceMenu', 'SourceTooltip', 'SourceSpinner', 'tabOverflowLayout', 'useTabDragReorder', 'SourcePreviewTabOverflow'])
    assert.equal(count(source, gone), 0, gone);
  assert.match(source, /return !origin \|\| !isWebOrigin\(origin\) \? null : <PreviewTabOpenInBrowserItem tabId=\{id\} label=\{openInBrowser\} onOpenInBrowser=\{onExternal\} \/>;/);
});

test('TPT-2: "Close {host}?" is cf580efe9 va on the published CDS alert dialog', () => {
  const facade = local('src/generated/view-tabs/index.js');
  assert.match(facade, /(?<![\w$])CdsAlertDialog(?![\w$])/);
  assert.match(local('src/generated/view-tabs/shared-frame-6jtSkIit.js'), /ib as CdsAlertDialog/);
  const text = local('src/generated/code-editor/preview-tab-strip.mjs');
  for (const feature of ['CdsAlertDialog as E,', 'o(E.Footer, { align: "between", children: [j, ee] })',
    'className: "epitaxy-root break-words max-w-[28rem]"', '"{count, plural, one {Stop server and close} other {Stop servers and close}}"',
    'defaultMessage: "the dev server"', 'r(Pe, {'])
    assert.ok(text.includes(feature), feature);
  const pane = local('src/source-preview-pane.jsx');
  assert.match(pane, /<SourcePreviewCloseTabsDialog pending=\{tabClose \? \{ mode: tabClose\.others \? 'others' : 'single', processes: tabClose\.processes\.map\(\(\{ name, port \}\) => \(\{ name, port \}\)\) \} : null\}/);
  assert.equal(count(pane, 'SourceDialog'), 0);
  assert.equal(count(pane, 'Stop {count} servers and close'), 0);
});

test('TPT-3: the clear-data confirmation is CdsConfirmationDialog itself (c224804cc W `Xc as u`)', () => {
  assert.ok(official('c224804cc-Ct9XIdre.js').includes('confirmLabel:d,confirmVariant:"danger"'));
  const menu = local('src/source-preview-settings-menu.jsx');
  assert.match(menu, /const ConfirmDialog = CdsConfirmationDialog;/);
  assert.equal(count(menu, 'SourceConfirmationDialog'), 0);
});

test('TPT-4: the logs drawer is cf580efe9 So (no border, no tab stops, centred empty text, break-all rows)', () => {
  const so = official('cf580efe9-BFcQCjF9.js');
  for (const feature of ['className:"relative flex flex-col shrink-0 h-[200px] min-h-[80px] max-h-[60%]"',
    'r("div",{role:"separator","aria-orientation":"horizontal",onPointerDown:C,className:"absolute top-0 inset-x-0 h-[8px] cursor-ns-resize z-[1]"})',
    'className:"min-h-0 flex-1 overflow-auto [contain:strict] px-lg pb-lg text-code text-secondary select-text"',
    'className:"text-muted-as-secondary text-center"', 'w="flex shrink-0 items-center gap-sm pt-md pe-xs ps-lg"'])
    assert.equal(count(so, feature), 1, feature);
  const render = (lines) => renderToStaticMarkup(React.createElement(Pane.LogsDrawer, { source: 'web · localhost:5173', lines, height: 200, paneHeight: 600, onResize: noop, onClose: noop }));
  const empty = render([]);
  assert.match(empty, /^<div class="relative flex flex-col shrink-0 h-\[200px\] min-h-\[80px\] max-h-\[60%\]" style="height:200px"><div role="separator" aria-orientation="horizontal" class="absolute top-0 inset-x-0 h-\[8px\] cursor-ns-resize z-\[1\]"><\/div>/);
  assert.match(empty, /<div class="flex shrink-0 items-center gap-sm pt-md pe-xs ps-lg"><span data-testid="preview-logs-source" title="web · localhost:5173" class="min-w-0 flex-1 truncate text-caption text-muted-as-secondary">/);
  assert.match(empty, /<button[^>]*data-cds="Button"[^>]*aria-label="Close dev server logs"/);
  assert.match(empty, /<div class="min-h-0 flex-1 overflow-auto \[contain:strict\] px-lg pb-lg text-code text-secondary select-text"><div class="text-muted-as-secondary text-center">Waiting for output…<\/div><\/div>/);
  assert.doesNotMatch(empty, /tabindex=|Resize dev server logs|aria-label="Dev server logs"|spv-logs|border-t\b|bg-alpha-1/);
  const rows = render(['ready', 'npm ERR! missing script', 'Warning: deprecated', 'Found 0 errors. Watching for file changes.']);
  assert.match(rows, /<div class="whitespace-pre-wrap break-all">ready<\/div><div class="whitespace-pre-wrap break-all text-danger">npm ERR! missing script<\/div><div class="whitespace-pre-wrap break-all text-warning">Warning: deprecated<\/div><div class="whitespace-pre-wrap break-all">Found 0 errors/);
  assert.equal(count(local('src/source-preview-pane.css'), 'spv-log'), 0);
});

test('TPT-5: Allowed sites is the generated c36734a81 P (CdsDialog popup + CdsSurface popover), no local CSS', () => {
  const text = local('src/generated/code-editor/preview-allowed-sites.mjs');
  for (const feature of ['n(m.Popup, {', 'unstyled: !0,', 'data-[starting-style]:scale-[0.98]', '(P = "popover")', 'w-[400px] max-w-full', 'dir: "ltr",',
    'cdsDialogViewportMaxHeightClass as f,', 'CdsSurface as u,', 'CdsDialog as m,'])
    assert.ok(text.includes(feature), feature);
  assert.doesNotMatch(text, /view-tabs\/index\.js/);
  const host = local('src/source-preview-allowed-sites.jsx');
  assert.match(host, /<PreviewAllowedSitesDialog isOpen=\{!!isOpen\}/);
  assert.match(host, /from "\.\/generated\/view-tabs\/shared-frame-6jtSkIit\.js"/, 'E41: the concrete file, not the facade');
  for (const gone of ['SourceDialog', 'SourceSettingsButton', 'spas-', '.css']) assert.equal(count(host, gone), 0, gone);
  assert.equal(fs.existsSync(path.join(app, 'src/source-preview-allowed-sites.css')), false);
});

test('TPT-8: the terminal and Preview covers are the generated cc0a875c8 EmptyState', () => {
  for (const file of ['src/source-terminal-pane.jsx', 'src/source-preview-pane.jsx']) {
    const text = local(file);
    assert.match(text, /import \{ EmptyState \} from "\.\/generated\/r3b-transcript\/empty-state\.mjs";/, file);
    assert.equal(count(text, 'SourceEmptyState'), 0, file);
    assert.equal(count(text, '<EmptyState '), 2, file);
  }
  const html = renderToStaticMarkup(React.createElement(Pane.PreviewStoppedCard, { serverLabel: null, onClose: noop }));
  assert.match(html, /<p class="max-w-\[36ch\] text-pretty break-words text-body text-primary">Preview server stopped<\/p><p class="max-w-\[36ch\] text-pretty break-words text-footnote text-muted-as-secondary">/);
  assert.match(html, /class="!size-7 text-muted-as-secondary"/);
});
