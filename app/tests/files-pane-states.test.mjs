import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Files pane states of 2.2553.1 readable/panes-tile-current.js: Ig root states
// (:5496-5512) in Jg (:6101-6110) with Yg (:6111-6113), Pg subfolder rows
// (:5335-5350) with the Lg error treeitem (:5547-5570), the yu empty preview
// (:6355-6390) and the c_ "Go to file or search" button (:6791-6807) first in the file
// pane's trailing slot (:16366-16378). Middleware-mode SSR only.
let server, S, P, C;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
  P = await server.ssrLoadModule('/src/source-pane-states.jsx');
  C = await server.ssrLoadModule('/src/source-pane-controls.jsx');
});
after(() => server?.close());
const h = React.createElement;
const html = (type, props) => renderToStaticMarkup(h(type, props));
const text = markup => markup.replace(/<[^>]+>/g, '');
const JG = 'flex items-center justify-center px-lg py-2.5 text-body text-muted source-files-tree-state';
const controls = ({ menuSections, leading }) => h(C.SourcePaneControls, { tileId: 'files', paneName: 'Files', layout: 'right',
  menuSections, leading, onToggleExpand: () => {}, onClose: () => {} });
const panel = props => renderToStaticMarkup(h(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'files', paneControls: controls, ...props }));

test('root tree states: Yg spinner with no visible text, fixed error copy, "Folder is empty"', () => {
  const loading = html(P.SourceFilesTreeState, { state: 'loading' });
  assert.match(loading, new RegExp(`^<div role="status" class="${JG.replace(/\./g, '\\.')}" data-tree-state="loading"><span data-cds="Spinner" class="relative inline-block shrink-0 align-middle" style="width:calc\\(0\\.75rem \\* var\\(--cds-rem-scale, 1\\)\\);height:calc\\(0\\.75rem \\* var\\(--cds-rem-scale, 1\\)\\)" aria-hidden="true">`));
  assert.match(loading, /<span class="sr-only">Loading<\/span><\/div>$/);
  assert.equal(text(loading), 'Loading');
  const error = html(P.SourceFilesTreeState, { state: 'error' });
  assert.equal(error, `<div class="${JG}" data-tree-state="error">Couldn’t read this folder.</div>`);
  assert.doesNotMatch(error, /role=|alert/);
  assert.equal(html(P.SourceFilesTreeState, { state: 'empty' }), `<div class="${JG}" data-tree-state="empty">Folder is empty</div>`);
  assert.equal(P.FILES_FOLDER_ERROR, 'Couldn’t read this folder.');
  assert.equal(P.FILES_FOLDER_EMPTY, 'Folder is empty');
});

test('root read error with onRetry is Oy: the error copy, then a sm "Try again" (Jm) and an empty sr-only status', () => {
  const markup = html(P.SourceFilesTreeState, { state: 'error', onRetry: async () => false });
  assert.ok(markup.startsWith(`<div class="flex flex-col items-center gap-sm source-files-tree-retry"><div class="${JG}" data-tree-state="error">Couldn’t read this folder.</div>`));
  assert.match(markup, /<button[^>]*data-cds="Button" data-variant="secondary"[^>]*data-size="sm"[^>]*>.*Try again.*<\/button>/);
  assert.match(markup, /<span role="status" class="sr-only"><\/span><\/div>$/);
  assert.doesNotMatch(markup, /aria-busy/);
  assert.equal(P.FILES_TREE_RETRY_BUSY, 'Listing this folder');
  // No retry handler (subfolder rows, older callers): the bare Jg row as before.
  assert.equal(html(P.SourceFilesTreeState, { state: 'empty', onRetry: () => {} }), `<div class="${JG}" data-tree-state="empty">Folder is empty</div>`);
});

test('panel: root loading is the Yg state (no "Loading files…"); no working directory is the Jg row', () => {
  const markup = panel({});
  assert.match(markup, /<div role="status" class="flex items-center justify-center px-lg py-2\.5 text-body text-muted source-files-tree-state" data-tree-state="loading"><span data-cds="Spinner"/);
  assert.doesNotMatch(markup, /Loading files|This folder is empty|Empty folder|role="alert"/);
  // Jg "No working directory for this session" (panes-tile-current.js:4780-4786).
  const none = panel({ cwd: '' });
  assert.match(none, new RegExp(`<div class="${JG.replace(/\./g, '\\.')}" data-tree-state="no-cwd">No working directory for this session</div>`));
  assert.doesNotMatch(none, /Choose a folder to browse files|source-panel-empty/);
  assert.equal(P.FILES_NO_WORKING_DIRECTORY, 'No working directory for this session');
});

test('pane titles are span.source-pane-title (regular weight, text-secondary, no native title); pl-0 after the ListBullet', () => {
  const files = panel({});
  const header = files.slice(files.indexOf('<header'), files.indexOf('</header>'));
  assert.match(header, /<span class="source-pane-title" data-after-toggle="">Files<\/span>/);
  assert.doesNotMatch(header, /<strong|<span class="source-pane-title"[^>]*title=/);
  const none = panel({ cwd: '' });
  assert.match(none, /<span class="source-pane-title">Files<\/span>/, 'no toggle without a working directory');
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.css'), 'utf8');
  const rule = css.slice(css.indexOf('.source-pane-title {'), css.indexOf('}', css.indexOf('.source-pane-title {')));
  for (const declaration of ['flex: 1;', 'min-width: 0;', 'padding-left: 4px;', 'font-size: var(--cds-font-size-body);', 'line-height: var(--cds-leading-body);',
    'font-weight: var(--cds-font-weight-regular, 400);', 'color: var(--cds-text-secondary);', 'user-select: none;', 'text-overflow: ellipsis;'])
    assert.ok(rule.includes(declaration), declaration);
  assert.match(css, /\.source-pane-title\[data-after-toggle\] \{\s*padding-left: 0;/);
  assert.doesNotMatch(css, /\.source-pane-header > strong/);
  const agent = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-agent.css'), 'utf8');
  assert.match(agent, /\.sag-pane-title \{[^}]*color:var\(--cds-text-secondary\)/);
});

test('ListBullet: CDS tooltip with ⌘⇧Y, aria-keyshortcuts, no native title; tree labelled "Project files"', () => {
  const markup = panel({ treeToggleRef: { current: null }, view: { treeHiddenWhileEmpty: false }, onViewChange: () => {} });
  const button = markup.match(/<button[^>]*aria-label="(?:Show|Hide) file tree"[^>]*>/)[0];
  assert.match(button, /aria-keyshortcuts="Meta\+Shift\+Y"/);
  assert.match(button, /aria-pressed="true"/);
  assert.doesNotMatch(button, /title=/);
  // Without main.jsx's handle (popout, artifacts) there is no shortcut to announce.
  assert.doesNotMatch(panel({}).match(/<button[^>]*aria-label="(?:Show|Hide) file tree"[^>]*>/)[0], /aria-keyshortcuts|title=/);
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(src, /<SourceTooltip content=\{treeVisible \? t\("Hide file tree"\) : t\("Show file tree"\)\} shortcut=\{treeToggleRef \? TREE_TOGGLE_SHORTCUT : undefined\}\s*side="top" align="start" hoverable=\{false\}>/);
  assert.match(src, /const TREE_TOGGLE_SHORTCUT = "cmd\+shift\+y";/);
  assert.match(src, /shortcut: treeToggleRef \? TREE_TOGGLE_SHORTCUT : undefined, onSelect: \(\) => setVisibleTree\(!treeVisible\)/);
  assert.match(src, /aria-label=\{t\("Project files"\)\}/);
  assert.doesNotMatch(src, /Workspace files/);
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  // R10: ⌘⇧Y goes through fileListRoute; the Files route still calls the Files pane's handle.
  assert.match(main, /if \(route === "files"\) fileTreeToggleRef\.current\?\.\(\);/);
  assert.match(main, /treeToggleRef=\{tileId === "files" \? fileTreeToggleRef : tileId === "changes" \? diffTreeToggleRef : null\}/);
});

test('tabs: data-vtb-id, the move hint, and the "More files" overflow markup', () => {
  const tabs = ['a.txt', 'b.txt'].map((path) => ({ path, text: 'x' }));
  const markup = panel({ view: { fileTabs: tabs, activePath: 'a.txt', treeShown: false }, onViewChange: () => {} });
  assert.match(markup, /<div class="source-file-tabbar" data-view-tab-bar=""><div class="source-file-tabs" role="tablist" aria-label="Open files">/);
  assert.equal((markup.match(/class="source-file-tab" data-vtb-id="/g) || []).length, 2);
  const tab = markup.match(/<div role="tab"[^>]*>/)[0];
  const ids = tab.match(/aria-describedby="([^"]+)"/)[1].split(' ');
  assert.equal(ids.length, 2);
  assert.match(markup, new RegExp(`<span id="${ids[1]}" class="source-sr-only">Press Control\\+Shift\\+Left Arrow or Right Arrow to move the file</span>`));
  assert.doesNotMatch(markup, /data-vtb-overflow/, 'nothing is hidden before the strip is measured');
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(src, /<span data-vtb-overflow="" className="source-file-tabs-overflow">/);
  assert.match(src, /<SourceMenu\.Popup anchor=\{button\.current\} side="bottom" align="end" label=\{FILE_TAB_LABELS\.moreTabs\}/);
  assert.match(src, /setFileTabs\(\(files\) => insertFileTab\(files, opened\)\)|return insertFileTab\(files, opened\);/);
});

test('source: raw read errors never render and subfolders add no loading/empty notices', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.doesNotMatch(src, /\{treeError\}|Loading files…|This folder is empty\.|Empty folder|source-tree-notice|Loading…<\/p>/);
  assert.match(src, /\{children === null \? \(\s*error \? <SourceTreeErrorRow depth=\{level \+ 1\} \/> : null\s*\) : \(/);
  assert.match(src, /\.catch\(\(\) => live && setError\(true\)\)/);
  // B07 Oy: the root error carries the retry (re-lists the root, resolves true when it failed again).
  assert.match(src, /<SourceFilesTreeState state=\{treeError \? "error" : "loading"\} onRetry=\{treeError \? retryTree : undefined\} \/>/);
  assert.match(src, /!entries\.length \? \(\s*<SourceFilesTreeState state="empty" \/>/);
});

test('Lg subfolder error row: treeitem at depth+1, no activation button, muted control-height row', () => {
  const row = html(P.SourceTreeErrorRow, { depth: 1 });
  // B33 (cccc2cf0a ky): the row also carries the Ec indent-guide layer (style xc = padding + ce9ca5630 g).
  // R2-files FT-01, 2.42304.0 cccc2cf0a AS: style Ll(t) = ca7840910 V (padding-inline-start 8 + depth * 10, guides
  // from --file-tree-guides-x 14px), and the muted copy is text-muted-as-secondary.
  // R3-files FT-14: the class is AS's own, generated: shared-6 vh (Dn) "min-h-control app-list-row-min" and ca7840910 j
  // (zl), the kept-guide layer painting on the row itself; no host class.
  assert.equal(row, '<div role="treeitem" aria-level="2" data-tree-row="" tabindex="-1" class="flex items-center min-h-control app-list-row-min px-lg text-body text-muted-as-secondary outline-none bg-(image:--file-tree-kept-guides) group-hover/file-tree:bg-(image:--file-tree-guides) group-focus-within/file-tree:bg-(image:--file-tree-guides) [&amp;:where(:root[dir=rtl]_:dir(rtl))]:bg-[position:right_var(--file-tree-guides-x)_top_0]!" style="padding-inline-start:18px;--file-tree-guides:repeating-linear-gradient(var(--file-tree-guides-to, to right), var(--cds-border) 0 1px, transparent 1px 10px);--file-tree-guides-x:14px;background-position:14px 0;background-repeat:no-repeat;background-size:10px 100%"><span class="truncate">Couldn’t read this folder.</span></div>');
  assert.doesNotMatch(row, /data-tree-primary|<button|role="alert"/);
  assert.match(html(P.SourceTreeErrorRow, { depth: 3 }), /aria-level="4"[^>]*style="padding-inline-start:38px;[^"]*background-size:30px 100%"/);
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/cccc2cf0a-B0D--VZp.js'), 'utf8');
  assert.match(official, /className:`flex items-center \$\{[\w$]+\} px-lg text-body text-muted-as-secondary outline-none \$\{[\w$]+\}`,style:([\w$]+)\(t\)/);
  assert.match(official, /h as Ll,[^}]*\}from"\.\/ca7840910-DSVFtTw1\.js"/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/ca7840910-DSVFtTw1.js'), 'utf8'), /V as h[,}]/);
  assert.match(official, /,ff as Dn[,}][^;]*from"\.\/shared-6-Cby4X-ms\.js"|[{,]ff as Dn[,}]/);
  assert.match(official, /l as zl,[^}]*\}from"\.\/ca7840910-DSVFtTw1\.js"/);
  // No host rule styles the row any more (the hand-written .source-tree-error / .source-tree-guided are gone); the
  // color, height and guides are official @layer utilities rules.
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\.source-tree-(error|guided|guides)\b/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8'), /\.text-muted-as-secondary\{color:var\(--muted-as-secondary,var\(--cds-text-muted\)\)\}/);
});

test('empty preview: the three exact source title/body pairs in EmptyState yu with icon Folder', () => {
  assert.deepEqual(P.filesEmptyPreviewCopy({ tabs: 2, treeShown: true }), { title: 'No file selected', body: 'Pick an open file above, or click a file path in the conversation.' });
  assert.deepEqual(P.filesEmptyPreviewCopy({ tabs: 1, treeShown: false }), { title: 'No file selected', body: 'Pick an open file above, or click a file path in the conversation.' });
  assert.deepEqual(P.filesEmptyPreviewCopy({ tabs: 0, treeShown: true }), { title: 'Open files appear here', body: 'Pick a file in the tree, or click a file path in the conversation.' });
  assert.deepEqual(P.filesEmptyPreviewCopy({ tabs: 0, treeShown: false }), { title: 'Open files appear here', body: 'Click a file path in the conversation to open it.' });
  const markup = html(P.SourceFilesEmptyPreview, { tabs: 1, treeShown: true });
  assert.match(markup, /^<div class="flex min-h-0 min-w-0 flex-1 flex-col source-file-empty-preview"><div class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state"><span aria-hidden="true" data-cds="Icon" class="!size-7 text-muted"/);
  assert.match(markup, /<p class="max-w-\[36ch\] break-words text-body text-primary">No file selected<\/p><p class="max-w-\[36ch\] break-words text-footnote text-muted">Pick an open file above, or click a file path in the conversation\.<\/p>/);
  // Through the panel: tree hidden while empty and no tabs -> "Click a file path…".
  const hidden = panel({ view: { treeHiddenWhileEmpty: true }, onViewChange: () => {} });
  assert.match(text(hidden), /Open files appear hereClick a file path in the conversation to open it\./);
});

test('Go to file or search: ghost icon-only button first in the trailing controls, only with a workdir', () => {
  const markup = panel({});
  const header = markup.slice(markup.indexOf('<header'), markup.indexOf('</header>'));
  const at = label => header.indexOf(`aria-label="${label}"`);
  assert.ok(at('Go to file or search') > 0);
  assert.ok(at('Go to file or search') < at('Files settings'), 'before the settings menu');
  assert.ok(at('Files settings') < at('Expand'), 'settings before Expand');
  assert.ok(at('Expand') < at('Close panel'), 'Expand before Close');
  assert.ok(header.indexOf('class="spc-controls"') < at('Go to file or search'), 'inside the trailing cluster');
  const button = header.match(/<button[^>]*aria-label="Go to file or search"[^>]*>/)[0];
  assert.match(button, /class="source-icon-button spc-ghost"/);
  assert.doesNotMatch(button, /title=/);
  assert.equal(header.split('aria-label="Go to file or search"').length, 2);
  const none = panel({ cwd: '' });
  assert.doesNotMatch(none, /Go to file or search/);
  assert.doesNotMatch(panel({ tab: 'changes' }), /Go to file or search/);
  // Without a paneControls render function the button still leads the fallback Close.
  const bare = panel({ paneControls: null });
  assert.ok(bare.indexOf('aria-label="Go to file or search"') < bare.indexOf('aria-label="Close panel"'));
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-pane-controls.jsx'), 'utf8');
  assert.match(button, /aria-keyshortcuts="Meta\+P"/);
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.equal(main.split('leading={leading}').length, 3, 'tile and popout controls forward the leading slot');
});

test('Go to file or search focuses and selects Filter files after temporary tree expansion', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  const fn = src.slice(src.indexOf('function focusFilesFilter('), src.indexOf('function resizeTreeVisibility('));
  assert.match(fn, /if \(treeHiddenWhileEmpty\) setTreeHiddenWhileEmpty\(false\);/);

  assert.match(fn, /searchFocusRef\.current\?\.\(filterFocus\.current\)/);
  assert.match(fn, /`\.source-files-tree input\[aria-label="\$\{t\("Filter files"\)\}"\]`/);
});

// R09: a pressed CDS Button paints bg-accent + text-accent, hovered or not (shared-frame-C_2npUJq.js:2697 cs,
// :2723-2724); the ListBullet (aria-pressed while the tree shows) is a .source-icon-button.
test('pressed paint: .source-icon-button[aria-pressed="true"] is text-accent on bg-accent, also while hovered', () => {
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.css'), 'utf8');
  const at = css.indexOf('.source-icon-button[aria-pressed="true"],');
  assert.ok(at > 0, 'the pressed rule exists');
  const rule = css.slice(at, css.indexOf('}', at) + 1);
  assert.match(rule, /^\.source-icon-button\[aria-pressed="true"\],\n\.source-icon-button\[aria-pressed="true"\]:not\(:disabled\),\n\.source-icon-button\[aria-pressed="true"\]:hover:not\(:disabled\) \{\n  color: var\(--cds-text-accent\);\n  background: var\(--cds-bg-accent\);\n\}$/);
  assert.ok(at > css.indexOf('.source-icon-button:hover:not(:disabled)'), 'after the ghost hover rule');
  const markup = panel({ view: { treeHiddenWhileEmpty: false }, onViewChange: () => {} });
  assert.match(markup.match(/<button[^>]*aria-label="Hide file tree"[^>]*>/)[0], /class="source-icon-button"[^>]*aria-pressed="true"/);
});
