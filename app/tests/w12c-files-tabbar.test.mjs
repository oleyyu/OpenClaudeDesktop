import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { FILE_TAB_LABELS, reorderFileTab } from '../src/file-tab-menu-model.mjs';

// W12c files-tabbar (W12b cf-09 / TPT-9): the Files pane's open-file strip is 3.6556.2 cccc2cf0a ND's `ey` — the
// shared ViewTabBar (cfe7c4b3b t) — with ND's tab rows (je + jo), labels (Ge) and file menu items (vE → cd2efac6e bc/q
// over CdsDropdown). Source-only: the official chunks are read as text, the host strip renders through Vite SSR.
const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS = path.resolve(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(ASSETS, file), 'utf8');
const src = (name) => fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
const h = React.createElement;
let server, T, S, V;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom', logLevel: 'error' });
  T = await server.ssrLoadModule('/src/source-file-tabs.jsx');
  S = await server.ssrLoadModule('/src/source-session.jsx');
  V = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

test('official ey call site, rows, labels and file menu (cccc2cf0a ND / vE, cd2efac6e bc / q)', () => {
  const nd = official('cccc2cf0a-DhZC33Gc.js');
  for (const needle of [
    'u(ey,{ref:T,className:"min-w-0 flex-1","aria-label":i.formatMessage({defaultMessage:"Open files",id:"JTAjM0f0bY"}),tabs:Ke,activeId:s??"",onActivate:fe,onReselect:le,onKeep:_?g:void 0,onClose:O,onCloseOthers:k,onCloseToRight:j?A:void 0,onReorder:N?M:void 0,onCloseAll:F,renderTabMenuItems:pe,labels:Ge,minTabWidth:104})',
    'id:e.path,label:wa(e.path),icon:ke?u(OD,{path:e.path,folder:e.folder}):void 0,status:e.folder?i.formatMessage({defaultMessage:"folder",id:"z79ZggtMWP"}):void 0,detail:n<0?void 0:t.slice(0,n)||"/",closable:!0,preview:_&&e.preview===!0,deleted:!e.folder&&e.path!==Oe&&Se.has(e.path)',
    'jo(je)',
    '{closeTab:Me,closeOtherTabs:Ne,closeTabsToRight:Pe,closeTabsToRightRtl:Fe,closeAllTabs:Ie,moreTabs:Le,keepTab:Re,previewTabHint:ze,deletedTabHint:Be,closeTabHint:Ve,closeTabHintRtl:He,closeTabDeleteHint:Ue,moveTabHint:We}',
    'defaultMessage:"Close files to the left",id:"2ySX7d/Uua"', 'defaultMessage:"press left arrow to close",id:"0Z9DIZBF+Q"',
    'function _E(){return Nd("__gb__2327917146")}', 'u(lv,{items:V,extraSections:G})', '{surface:"file_tab",openIn:F,',
  ]) assert.ok(nd.includes(needle), needle);
  // c51596d2b S (Nd) is on without GrowthBook: `return t||!r`.
  // Ke (Od) is that gate and the "epitaxy-files-preview-tabs" preference: the host's previewTabs view setting.
  const gates = official('c51596d2b-Dy8p_zYF.js');
  for (const needle of ['n.getForcedFeatures().has(t)),K2($,0,n,e,r)}else r=$[2];return t||!r}', 'function Ke(){let e=Ne(),[t]=We();return e&&t}', 'var J="epitaxy-files-preview-tabs"'])
    assert.ok(gates.includes(needle), needle);
  const cd = official('cd2efac6e-Be7wcc4w.js');
  assert.ok(cd.includes('c(k.Group,{children:[(t.length>0||n>0)&&a(k.Separator,{}),e.header&&a(k.GroupLabel,{children:e.header}),a(q,{items:e.items})]},`s-${n}`)'));
  assert.ok(cd.includes('a(k.Popup,{side:vn("inline-end",n),align:"start",sideOffset:-4,children:a(q,{items:e.items})})'));
  assert.ok(cd.includes('a(k.Item,{description:e.description,descriptionLines:e.descriptionLines,disabled:e.disabled,disabledReason:e.disabledReason,'));
  // k is shared-frame Jo = CdsDropdown; CdsContextMenu shares its Item / Separator / Group / Submenu parts.
  assert.match(cd, /Jo as k[,}]/);
  assert.match(src('generated/view-tabs/shared-frame-6jtSkIit.js'), /var kA=\{Root:EA,Trigger:K,Popup:TA,Item:GT\.Item,Separator:GT\.Separator,Group:GT\.Group,/);
  // c96d752d0 LH (jo) is the one generated copy behind r3b-transcript's turnEditFolderHints (R0e).
  assert.match(official('c96d752d0-CWv_7-n9.js'), /LH as Gn[,}]/);
  assert.match(src('generated/r3b-transcript/turn-edits-card.mjs'), /function R0e\(e\) \{\n  let t = LH\(/);
});

test('host wiring: SourceFileTabs passes ey\'s props to the ViewTabBar; the hand-made strip is gone', () => {
  const tabs = src('source-file-tabs.jsx');
  assert.match(tabs, /<SourceViewTabBar ref=\{strip\} className="min-w-0 flex-1" aria-label=\{t\("Open files"\)\} tabs=\{rows\} activeId=\{activePath \?\? ""\}\n\s+onActivate=\{activate\} onReselect=\{reselect\} onKeep=\{previewTabs \? onKeep : undefined\} onClose=\{onClose\}\n\s+onCloseOthers=\{onCloseOthers\} onCloseToRight=\{onCloseToRight\} onReorder=\{onReorder\} onCloseAll=\{onCloseAll\}\n\s+renderTabMenuItems=\{renderTabMenuItems\} labels=\{FILE_TAB_LABELS\} minTabWidth=\{104\} \/>/);
  assert.match(tabs, /fileMenu\.entries\(path, \{ surface: "file_tab", unavailable:/);
  assert.match(tabs, /<CdsDropdown\.Popup side=\{direction === "rtl" \? "left" : "right"\} align="start" sideOffset=\{-4\}>/);
  assert.match(tabs, /import \{ CdsDropdown, useDirection \} from "\.\/generated\/view-tabs\/index\.js";/);
  const session = src('source-session.jsx');
  assert.match(session, /onReorder=\{\(path, toIndex\) => setFileTabs\(\(files\) => reorderFileTab\(files, path, toIndex\)\)\}/);
  assert.match(session, /onCloseToRight=\{\(path\) => closeFiles\(fileTabsToRight\(fileTabs, path\)\)\}/);
  assert.match(session, /onFocusFile=\{\(path\) => setFileFocusRequest\(\{ path, seq: opened\.current\.seq \}\)\}/);
  for (const gone of ['function SourceFileTab(', 'function SourceFileTabOverflow(', 'useTabDragReorder', 'tabOverflowLayout', 'fileTabDrag',
    'className="source-file-tab', 'SourceTooltipGroup', 'menuTriggerProps'])
    assert.ok(!session.includes(gone), gone);
  assert.match(session, /node\.closest\("\[data-view-tab-bar\] \[data-vtb-id\]"\)\?\.dataset\.vtbId === request\.path/);
  assert.doesNotMatch(src('source-session.css'), /\.source-file-(tab|tabs|tabbar|overflow)\b/);
});

test('labels: ND Ge, with the RTL forms; zh-CN covers the new one', async () => {
  assert.deepEqual({ ...FILE_TAB_LABELS }, {
    closeTab: 'Close file', closeOtherTabs: 'Close other files', closeTabsToRight: 'Close files to the right',
    closeTabsToRightRtl: 'Close files to the left', closeAllTabs: 'Close all files', keepTab: 'Keep open', previewTabHint: 'preview',
    deletedTabHint: 'deleted', closeTabDeleteHint: 'Press Delete or Backspace to close the file', moreTabs: 'More files',
    closeTabHint: 'press right arrow to close', closeTabHintRtl: 'press left arrow to close',
    moveTabHint: 'Press Control+Shift+Left Arrow or Right Arrow to move the file',
  });
  const panes = (await import('../electron/i18n/zh-CN/panes.mjs')).default;
  assert.equal(panes['Close files to the left'], '关闭左侧文件');
});

test('reorderFileTab is c03935b01 reorderFileTab (clamped, same array when nothing moves)', () => {
  const tabs = ['a', 'b', 'c', 'd'].map((path) => ({ path }));
  assert.deepEqual(reorderFileTab(tabs, 'a', 2).map((tab) => tab.path), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorderFileTab(tabs, 'd', 0).map((tab) => tab.path), ['d', 'a', 'b', 'c']);
  assert.deepEqual(reorderFileTab(tabs, 'b', 99).map((tab) => tab.path), ['a', 'c', 'd', 'b']);
  assert.equal(reorderFileTab(tabs, 'b', 1), tabs);
  assert.equal(reorderFileTab(tabs, 'x', 0), tabs);
});

test('rows: basename, folder detail, preview only with preview tabs, deleted, jo descriptions for repeated names', () => {
  const tabs = [{ path: 'a.txt', preview: true }, { path: 'src/util/b.txt' }, { path: 'lib/util/b.txt', unavailable: 'missing' }, { path: '/tmp/work/c/d.txt' }];
  const rows = T.fileTabRows(tabs, { cwd: '/tmp/work', previewTabs: true });
  assert.deepEqual(rows, [
    { id: 'a.txt', label: 'a.txt', detail: undefined, closable: true, preview: true, deleted: false },
    { id: 'src/util/b.txt', label: 'b.txt', detail: 'src/util', closable: true, preview: false, deleted: false, description: 'src/util' },
    { id: 'lib/util/b.txt', label: 'b.txt', detail: 'lib/util', closable: true, preview: false, deleted: true, description: 'lib/util' },
    { id: '/tmp/work/c/d.txt', label: 'd.txt', detail: 'c', closable: true, preview: false, deleted: false },
  ]);
  assert.equal(T.fileTabRows(tabs, { cwd: '/tmp/work', previewTabs: false })[0].preview, false);
  // Only the shortest distinguishing suffix: x/a/f.js and y/b/f.js differ in their last folder.
  assert.deepEqual(T.fileTabRows([{ path: 'x/a/f.js' }, { path: 'y/b/f.js' }], { cwd: '/w' }).map((row) => row.description), ['a', 'b']);
});

test('menu items: vE\'s items, then the reveal section as a separated Group (bc)', () => {
  const entries = [{ kind: 'item', action: 'attach', label: 'Attach as context' }, { kind: 'submenu', label: 'Copy', items: [] },
    { kind: 'separator' }, { kind: 'item', action: 'show-in-finder', label: 'Show in Finder' },
    { kind: 'separator' }, { kind: 'item', action: 'reveal-in-tree', label: 'Reveal in file tree', value: 'a.txt' }];
  const sections = T.fileTabMenuSections(entries);
  assert.deepEqual(sections.items, entries.slice(0, 4));
  assert.deepEqual(sections.extraSections, [{ key: 'reveal', items: [entries[5]] }]);
  assert.deepEqual(T.fileTabMenuSections(entries.slice(0, 4)), { items: entries.slice(0, 4), extraSections: [] });
  const tree = T.SourceFileTabMenuItems({ entries, onSelect: () => {} });
  const [list, groups] = tree.props.children;
  assert.deepEqual(list.props.entries, entries.slice(0, 4));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].type, V.CdsDropdown.Group);
  assert.equal(groups[0].key, 's-0');
  const [separator, header, inner] = groups[0].props.children;
  assert.equal(separator.type, V.CdsDropdown.Separator);
  assert.equal(header, undefined);
  assert.deepEqual(inner.props.entries, [entries[5]]);
});

test('SSR through the Files pane: the ViewTabBar strip with descriptions, italics, strike-through and the 104px floor', () => {
  const tabs = [{ path: 'a.txt', text: 'x', preview: true }, { path: 'src/b.txt', text: 'x' }, { path: 'lib/b.txt', text: 'x', unavailable: 'missing' }];
  const html = renderToStaticMarkup(h(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'files',
    view: { fileTabs: tabs, activePath: 'a.txt', treeShown: false }, onViewChange: () => {} }));
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.match(header, /data-view-tab-bar=""[^>]*class="flex select-none items-center gap-\[4px\] font-sans source-view-tabs min-w-0 flex-1"/);
  assert.equal((header.match(/style="-webkit-touch-callout:none;min-width:104px"/g) || []).length, 3);
  assert.match(header, /<span class="whitespace-nowrap text-start italic">a\.txt<span class="sr-only">, preview<\/span><\/span>/);
  assert.match(header, /<span class="whitespace-nowrap text-start">b\.txt<span class="ms-xs text-muted-as-secondary"><span class="sr-only">, <\/span>src<\/span><\/span>/);
  assert.match(header, /<span class="whitespace-nowrap text-start line-through">b\.txt<span class="ms-xs text-muted-as-secondary"><span class="sr-only">, <\/span>lib<\/span><span class="sr-only">, deleted<\/span><\/span>/);
  assert.equal((header.match(/aria-label="Close file"/g) || []).length, 3);
  // With preview tabs off no tab is italic (ND `preview:_&&e.preview===!0`).
  const off = T.fileTabRows(tabs, { cwd: '/tmp/work', previewTabs: false });
  assert.ok(off.every((row) => row.preview === false));
});
