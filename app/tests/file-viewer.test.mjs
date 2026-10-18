import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { breadcrumbParts, fileViewerLines, fileViewerTooSlow, jumpRange } from '../src/file-preview-model.mjs';

// Files pane file viewer (2.2553.1 cd2efac6e jo :2576-4674): Yo/Ma breadcrumb
// subheader, numbered wrapped rows in [data-file-viewer].epitaxy-diff, the Zo
// "Loading file" spinner and the unavailable cards. Middleware-mode Vite SSR.
let server, S, V;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
  V = await server.ssrLoadModule('/src/source-file-viewer.jsx');
});
after(() => server?.close());
const h = React.createElement;
const text = (markup) => markup.replace(/<[^>]+>/g, '');
const panel = (props) => renderToStaticMarkup(h(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'files', onViewChange: () => {}, ...props }));
const filesView = (tab, extra = {}) => ({ fileTabs: [tab], activePath: tab.path, treeShown: false, treeHiddenWhileEmpty: false, ...extra });

// R3-files FT-18 (files-26): Escape on a multi-selection is 2.42304.0 c856385e2 nt (generated file-selection-escape.mjs),
// bound to the tree element (Nx `If(z, H.store)`) and to the filename results; treeKeyDown no longer handles it.
test('clearing a file-tree multiselection consumes held Escape until key release', async () => {
  const { useMultiSelectionEscape } = await server.ssrLoadModule('/src/generated/files-changes/file-selection-escape.mjs');
  const { createFileTreeSelection } = await server.ssrLoadModule('/src/file-tree-selection.mjs');
  const target = () => { const listeners = new Map(); return { listeners, addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }, fire(type, event) { for (const fn of [...(listeners.get(type) ?? [])]) fn(event); return event; } }; };
  const view = target(), tree = Object.assign(target(), { nodeType: 1, ownerDocument: { nodeType: 9, defaultView: view } });
  const store = createFileTreeSelection();
  // A hook dispatcher that runs the effect at once (no React DOM); the cleanup removes the listener.
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let cleanup;
  internal.H = { useEffect: (effect) => { cleanup = effect(); } };
  try { useMultiSelectionEscape(tree, store); } finally { internal.H = old; }
  const press = (extra = {}) => Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape', repeat: false, isComposing: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, stopPropagation() { this.stopped = true; } }, extra);
  store.getState().selectOnly({ absPath: 'a' });
  const single = tree.fire('keydown', press());
  assert.equal(single.defaultPrevented, false, 'one selected row: Escape passes through'); assert.equal(store.getState().selected.size, 1);
  store.getState().toggle({ absPath: 'b' });
  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'isComposing']) assert.equal(tree.fire('keydown', press({ [modifier]: true })).defaultPrevented, false, modifier);
  const initial = tree.fire('keydown', press());
  assert.equal(initial.defaultPrevented, true); assert.equal(initial.stopped, true); assert.equal(store.getState().selected.size, 0);
  // shared-19 pZ: the window swallows the held key's repeats until it is released.
  const repeat = view.fire('keydown', press({ repeat: true }));
  assert.equal(repeat.defaultPrevented, true);
  view.fire('keyup', { key: 'Escape' });
  const released = view.fire('keydown', press({ repeat: true }));
  assert.equal(released.defaultPrevented, false);
  cleanup();
  assert.equal(tree.listeners.get('keydown').size, 0);
  // treeKeyDown leaves Escape alone; the tree and the filename results bind nt.
  const selected = new Set(['a', 'b']);
  const fake = { querySelectorAll: () => [{ closest: () => null }], ownerDocument: { defaultView: view, activeElement: null } };
  const legacy = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
  S.treeKeyDown(legacy, fake, null, { store: { getState: () => ({ selected, clear: () => selected.clear() }) } });
  assert.equal(legacy.defaultPrevented, false); assert.equal(selected.size, 2);
  const session = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(session, /useMultiSelectionEscape\(active \? treeElement : null, selection\.store\);/);
  assert.doesNotMatch(session, /event\.key==='Escape'&&!event\.defaultPrevented&&!modified/);
  const search = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-files-search.jsx'), 'utf8');
  assert.match(search, /useMultiSelectionEscape\(content \? null : resultsElement, selectionStore\);/);
  assert.doesNotMatch(search, /event\.key==='Escape'&&!content/);
});

test('a text tab renders the breadcrumb subheader and two numbered rows (no Back to files, no location row, no pill)', () => {
  const markup = panel({ view: filesView({ path: 'src/app.js', text: 'a\nb\n' }) });
  const viewer = markup.slice(markup.indexOf('<div data-file-viewer'));
  assert.match(viewer, /^<div data-file-viewer="" class="epitaxy-diff sfv-viewer">/);
  const rows = [...viewer.matchAll(/<div class="sfv-line" data-line="(\d+)"><span class="sfv-number" data-number="(\d+)" aria-hidden="true"><\/span><code class="scb-code source-diff-code">([^<]*)<\/code><\/div>/g)];
  assert.deepEqual(rows.map((row) => [row[1], row[2], row[3]]), [['1', '1', 'a\n'], ['2', '2', 'b\n']], 'exactly two numbered rows');
  // A local session's breadcrumb has a folder lister (Yo with a lister): a plain div whose segments open
  // "Files in {folder}"; the copy-path button is the no-lister variant (SourceFileBreadcrumb without one).
  assert.match(markup, /class="source-file-breadcrumb" data-breadcrumb-lister=""/);
  assert.match(markup, /text-body font-normal font-control text-secondary/);
  assert.match(markup, /data-file-breadcrumb="true" class="absolute inset-1 flex items-baseline"/);
  // R3-files FT-06/FT-16: the 2.42304.0 segments (cfac349aa Pt: the popover trigger merges aria-description into the
  // segment button after its own class, jt; folder segments and separators are text-muted-as-secondary).
  assert.match(markup, /data-breadcrumb-segment="true" class="[^"]* shrink-0 text-muted-as-secondary" aria-description="\/tmp\/work\/src"[^>]*>src<\/button>/);
  assert.match(markup, /data-breadcrumb-segment="true" class="[^"]* shrink-0" aria-description="\/tmp\/work\/src\/app.js"[^>]*>app.js<\/button>/);
  assert.match(markup, /aria-hidden="true" class="invisible flex shrink-0"/);
  assert.match(markup, /<div class="epitaxy-panel-subheader sfv-subheader">/);
  assert.doesNotMatch(markup, /Back to files|source-file-location|Opening file…|source-panel-error/);
  // The scroller is the .source-file-preview element; its text is the file.
  assert.match(viewer, /<div class="source-file-preview sfv-scroller select-text" data-word-wrap="true" style="--sfv-number-width:3ch;/);
  assert.equal(text(viewer.slice(viewer.indexOf('<div class="sfv-line"'))), 'a\nb\n');
});

test('a chip line range marks rows line..endLine with data-active and the scroller carries the range', () => {
  const tab = { path: 'src/app.js', text: Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n') };
  const markup = renderToStaticMarkup(h(V.SourceFileViewer, { file: tab, displayPath: 'src/app.js', fullPath: '/w/src/app.js', line: 3, endLine: 4, scrollNonce: 1, scopeKey: 'k' }));
  const active = [...markup.matchAll(/<div class="sfv-line" data-line="(\d+)" data-active="">/g)].map((row) => row[1]);
  assert.deepEqual(active, ['3', '4']);
  assert.match(markup, /class="source-file-preview sfv-scroller select-text" data-word-wrap="true" data-active-line="3" data-active-end-line="4"/);
  // Without a terminal LF the last row has no newline; the gutter is sized by digit count (12 -> 3ch minimum).
  assert.match(markup, /data-line="12"><span class="sfv-number" data-number="12" aria-hidden="true"><\/span><code class="scb-code source-diff-code">line 12<\/code>/);
  assert.deepEqual(jumpRange(5, 300), { first: 5, last: 204 }, 'at most 200 rows (la)');
  assert.deepEqual(jumpRange(7), { first: 7, last: 7 });
  assert.equal(jumpRange(0), null);
});

test('loading, unavailable, binary and empty bodies keep the breadcrumb subheader', () => {
  const loading = panel({ view: filesView({ path: 'src/app.js', preview: true }) });
  assert.match(loading, /<span role="status" aria-label="Loading file" class="leading-\[0\]">/);
  assert.match(loading, /class="source-file-breadcrumb" data-breadcrumb-lister=""/);
  const missing = panel({ view: filesView({ path: 'src/missing.js', unavailable: 'missing' }) });
  assert.match(missing, /<div role="alert" class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state">/);
  assert.match(text(missing), /Couldn’t find this fileIt may have been deleted or moved\.src\/missing\.js/);
  assert.match(missing, /class="source-file-breadcrumb" data-breadcrumb-lister=""/);
  const binary = panel({ view: filesView({ path: 'img.bin', unavailable: 'binary' }) });
  assert.match(text(binary), /This file looks like binary data and can’t be previewed as text/);
  assert.match(binary, /<button data-step="1" type="button" data-cds="Button" data-variant="secondary"[^>]*>.*View as text anyway/);
  assert.doesNotMatch(binary, /role="alert"/);
  const empty = panel({ view: filesView({ path: 'blank.txt', text: '' }) });
  assert.match(text(empty), /This file is empty/);
  assert.doesNotMatch(empty, /data-file-viewer/);
  const outside = panel({ view: filesView({ path: '/etc/hosts', unavailable: 'outside_root' }) });
  assert.match(text(outside), /This file is outside the working directoryIt can’t be opened here, but it may still exist on disk\./);
  assert.match(outside, /class="source-file-breadcrumb" data-breadcrumb-lister=""/);
  assert.doesNotMatch(outside, /data-breadcrumb-segment/, 'a path outside the workspace lists nothing');
});

test('the plain-text notice appears only for a highlightable file above the highlighter limits', () => {
  const long = Array.from({ length: 2100 }, (_, index) => `const x${index} = ${index};`).join('\n');
  assert.equal(fileViewerTooSlow(long, 'javascript'), true);
  assert.equal(fileViewerTooSlow(long, 'text'), false, 'plain files are not "too slow"');
  assert.equal(fileViewerTooSlow('x'.repeat(1500), 'javascript'), true, 'a long line');
  assert.equal(fileViewerTooSlow('const a = 1;\n', 'javascript'), false);
  const markup = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'big.js', text: long }, displayPath: 'big.js', fullPath: '/w/big.js', scopeKey: 'k' }));
  assert.match(markup, /<p role="note" class="sfv-plain-note">Shown as plain text: formatting this file would be too slow\.<\/p>/);
  assert.equal((markup.match(/class="sfv-line"/g) || []).length, 2100);
  assert.match(markup, /style="--sfv-number-width:4ch;/);
});

test('model helpers: rows, breadcrumb parts', () => {
  assert.deepEqual(fileViewerLines(null, 'a\nb\n').map((row) => row[0].text), ['a', 'b']);
  assert.deepEqual(fileViewerLines(null, 'a\n\nb').map((row) => row[0].text), ['a', '', 'b']);
  assert.deepEqual(fileViewerLines(null, '\n').map((row) => row[0].text), ['']);
  assert.deepEqual(breadcrumbParts('src/lib/app.js'), { lead: '', dirs: ['src', 'lib'], name: 'app.js' });
  assert.deepEqual(breadcrumbParts('/etc/hosts'), { lead: '/', dirs: ['etc'], name: 'hosts' });
  assert.deepEqual(breadcrumbParts('README.md'), { lead: '', dirs: [], name: 'README.md' });
});

test('source: the CSS Highlight line mark, the location row and the loading pill are gone', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.css'), 'utf8');
  assert.doesNotMatch(src, /CSS\?\.highlights|source-file-line|source-file-location|Back to files|Opening file…/);
  assert.doesNotMatch(css, /::highlight\(source-file-line\)|\.source-file-location|\.source-file-loading/);
  const viewerCss = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-file-viewer.css'), 'utf8');
  assert.match(viewerCss, /\.sfv-scroller \{[^}]*scrollbar-gutter: stable both-edges;/);
  assert.match(viewerCss, /\.sfv-line > code \{[^}]*white-space: pre-wrap;\s*overflow-wrap: anywhere;/);
  assert.match(viewerCss, /\.sfv-line\[data-active\] \{\s*background: color-mix\(in srgb, currentColor 8%, transparent\);/);
});

// R09 previews (cd2efac6e qo/en/pn, the Eye/Code toggle :4169-4186, nr/ir :4481-4609, EpitaxyCsvPreview).
test('README without a line opens as the Markdown preview with a "View source" toggle; a line opens numbered source with "Preview"', () => {
  const tab = { path: 'README.md', text: '# Read me\n\nBody text.\n\nline four\n' };
  const markup = panel({ view: filesView(tab) });
  const sub = markup.slice(markup.indexOf('<div class="epitaxy-panel-subheader sfv-subheader">'), markup.indexOf('<div class="sfv-body">'));
  assert.match(sub, /<button type="button" class="source-icon-button sfv-view-toggle" aria-label="View source" data-view-toggle=""><span[^>]*data-cds="Icon"/);
  assert.ok(sub.indexOf('source-file-breadcrumb') < sub.indexOf('View source'), 'the toggle follows the breadcrumb');
  assert.match(markup, /data-file-view="preview"/);
  const body = markup.slice(markup.indexOf('<div class="sfv-body">'));
  assert.match(body, /^<div class="sfv-body"><div data-file-viewer="" data-file-preview="markdown" class="flex-1 min-h-0 overflow-y-auto \[contain:strict\] \[scrollbar-gutter:stable_both-edges\] select-text p-lg source-file-preview sfv-preview"><div class="mx-auto max-w-\[860px\]"><div class="epitaxy-file-prose sfv-prose"><div class="source-markdown">/);
  assert.match(body, /<h1>Read me<\/h1>/);
  assert.doesNotMatch(body, /class="sfv-line"/);
  const atLine = renderToStaticMarkup(h(V.SourceFileViewer, { file: tab, displayPath: 'README.md', fullPath: '/w/README.md', line: 3, scrollNonce: 1, scopeKey: 'k',
    renderMarkdown: (value) => h('div', { className: 'probe-markdown' }, value) }));
  assert.match(atLine, /aria-label="Preview"/);
  assert.match(atLine, /data-file-view="source"/);
  const rows = [...atLine.matchAll(/<div class="sfv-line" data-line="(\d+)"/g)].map((row) => row[1]);
  assert.deepEqual(rows, ['1', '2', '3', '4', '5']);
  assert.match(atLine, /<div class="sfv-line" data-line="3" data-active="">/);
  assert.doesNotMatch(atLine, /probe-markdown/);
  // Without a Markdown renderer there is no preview (and so no toggle).
  const bare = renderToStaticMarkup(h(V.SourceFileViewer, { file: tab, displayPath: 'README.md', fullPath: '/w/README.md', scopeKey: 'k' }));
  assert.doesNotMatch(bare, /sfv-view-toggle|data-file-preview/);
  assert.match(bare, /class="sfv-line" data-line="1"/);
});

test('CSV opens as the table preview (header row, Table preview region); TSV too; an unparsable file shows the source copy', () => {
  const csv = panel({ view: filesView({ path: 'data.csv', text: 'name,count\nalpha,1\nbeta,2\n' }) });
  assert.match(csv, /data-file-preview="csv"/);
  assert.match(csv, /role="region" aria-label="Table preview"/);
  assert.match(csv, /epitaxy-document-csv-page epitaxy-document-page/);
  assert.match(csv, /data-pane-line=""/);
  assert.match(csv, /aria-label="Sort by count"/);
  assert.match(csv, /<tbody><tr><td>alpha<\/td><td data-numeric="true">1<\/td><\/tr><tr><td>beta<\/td><td data-numeric="true">2<\/td><\/tr><\/tbody>/);
  assert.match(csv, /aria-label="View source"/);
  const tsv = panel({ view: filesView({ path: 'data.tsv', text: 'a\tb\n1\t2\n' }) });
  assert.match(tsv, /<th scope="col" style="white-space:normal" data-numeric="true"[^>]*aria-sort="none"/);
  // relax_quotes: text after a closing quote is still a table cell.
  const relaxed = panel({ view: filesView({ path: 'data.csv', text: '"a"b,c\n' }) });
  assert.match(relaxed, /<tbody><tr><td>&quot;a&quot;b<\/td><td>c<\/td><\/tr><\/tbody>/);
  const broken = panel({ view: filesView({ path: 'data.csv', text: '"a,b\n' }) });
  assert.match(text(broken), /Couldn’t parse this file as a tableSwitch to Source to view the raw text\./);
});

test('images, video and audio render from the file:// URL (alt / aria-label = the base name); no toggle, no card', () => {
  const image = panel({ view: filesView({ path: 'img/photo.png', unavailable: 'image', size: 70 }) });
  assert.match(image, /data-file-state="image"/);
  assert.match(image, /<div data-file-viewer="" data-file-media="image" class="flex-1 min-h-0 \[contain:strict\] sfv-media"><div class="h-full overflow-auto p-md flex items-center justify-center"><img src="file:\/\/\/tmp\/work\/img\/photo\.png" alt="photo\.png" class="max-w-full max-h-full object-contain"\/><\/div><\/div>/);
  assert.doesNotMatch(image, /sfv-view-toggle|role="alert"|looks like binary/);
  const video = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'clip.mp4', unavailable: 'video' }, displayPath: 'clip.mp4', fullPath: '/w/clip.mp4', scopeKey: 'k' }));
  assert.match(video, /<video src="file:\/\/\/w\/clip\.mp4" controls="" preload="metadata" aria-label="clip\.mp4" class="max-w-full max-h-full"><\/video>/);
  const audio = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'a song.mp3', unavailable: 'audio' }, displayPath: 'a song.mp3', fullPath: '/w/a song.mp3', scopeKey: 'k' }));
  assert.match(audio, /<audio src="file:\/\/\/w\/a%20song\.mp3" controls="" preload="metadata" aria-label="a song\.mp3" class="w-full max-w-\[480px\]"><\/audio>/);
});

test('media error copy (Un, local reader): the image and media bodies with View as text anyway', async () => {
  const { fileMediaErrorCopy, fileTabReason, FILE_MEDIA_KINDS } = await import('../src/file-unavailable-model.mjs');
  assert.deepEqual(FILE_MEDIA_KINDS, ['image', 'video', 'audio', 'pdf']);
  assert.deepEqual(fileMediaErrorCopy('image'), { title: 'Couldn’t load this file', body: 'This image couldn’t be loaded. It may be too large, or it may have been deleted or moved.', role: undefined, showsPath: false, action: 'view-as-text' });
  assert.equal(fileMediaErrorCopy('video').body, 'This file couldn’t be loaded for preview. It may be too large to preview inline, in a format this browser can’t play, or it may have been deleted or moved.');
  assert.equal(fileTabReason({ path: 'a.png', unavailable: 'image' }), 'image');
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-file-viewer.jsx'), 'utf8');
  assert.match(src, /const onError = \(\) => \{ setFailed\(true\); onImageReady\?\.\(null\); \};/);
  assert.match(src, /<SourceFileMedia key=\{file\.path\}/);
});

// R09 review: Ai's Ti pre-pass (cd2efac6e :887-1100): the Ci plain fallback,
// the Si progressive chunks (Mi/Ni/Pi) and the Ur frontmatter grid (ki).
const changelogEntry = (index) => `## [1.${index}.0] - 2026-01-01\n\n### Added\n\n- Feature ${index} with a description long enough to read like a real entry.\n- Another change for ${index}.\n\n`;
const changelog = (bytes) => { let value = '# Changelog\n\n', index = 0; while (value.length < bytes) value += changelogEntry(index++); return value; };

test('a Markdown file Ci calls too slow shows the plain notice and the raw text, not the response renderer', () => {
  // A trailing reference definition keeps the body in one chunk (Nr), and
  // 600 KB of counted prose trips chars > 524288.
  const source = `${changelog(600 * 1024)}[1.0.0]: https://example.com/compare/v0...v1\n`;
  let rendered = 0;
  const markup = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'CHANGELOG.md', text: source }, displayPath: 'CHANGELOG.md', fullPath: '/w/CHANGELOG.md', scopeKey: 'k',
    renderMarkdown: (value) => { rendered += 1; return h('div', { className: 'source-markdown' }, value); } }));
  assert.equal(rendered, 0, 'the renderer is never called');
  assert.doesNotMatch(markup, /class="source-markdown"/);
  assert.match(markup, /data-file-view="preview"/);
  assert.match(markup, /<div class="mx-auto max-w-\[860px\]"><div data-markdown-plain=""><p role="note" class="mb-\[16px\] text-footnote text-muted">Shown as plain text: formatting this file would be too slow\.<\/p><pre class="text-code text-primary whitespace-pre-wrap break-words select-text sfv-plain-source"># Changelog/);
  assert.ok(markup.includes('[1.0.0]: https://example.com/compare/v0...v1\n</pre>'));
  // A single 40000-char line trips longestLine > 32768 at any size.
  const longLine = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'notes.md', text: `# Notes\n\n${'word '.repeat(8000)}\n` }, displayPath: 'notes.md', fullPath: '/w/notes.md', scopeKey: 'k',
    renderMarkdown: (value) => h('div', { className: 'source-markdown' }, value) }));
  assert.match(longLine, /role="note"[^>]*>Shown as plain text/);
  // View source still shows the numbered rows.
  assert.match(markup, /aria-label="View source"/);
});

test('a Markdown file above Si mounts its first ~16 KiB chunk, then the "Loading file" status row (Mi)', () => {
  const source = changelog(100 * 1024);
  const calls = [];
  const markup = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'CHANGELOG.md', text: source }, displayPath: 'CHANGELOG.md', fullPath: '/w/CHANGELOG.md', scopeKey: 'k',
    renderMarkdown: (value, chunk) => { calls.push([value.length, chunk]); return h('div', { className: 'source-markdown' }, `chunk ${chunk}`); } }));
  assert.equal(calls.length, 1, 'only the first chunk renders before the idle mounts');
  assert.equal(calls[0][1], 0);
  assert.ok(calls[0][0] >= 16384 && calls[0][0] <= 24576, `first chunk ${calls[0][0]} chars`);
  assert.match(markup, /<div class="mx-auto max-w-\[860px\]"><div><div class="epitaxy-file-prose epitaxy-file-prose-chunk sfv-prose"><div class="source-markdown">chunk 0<\/div><\/div><div role="status" class="animate-placeholder-reveal flex justify-center py-lg text-muted"><span data-cds="Spinner"[^>]*>.*?<\/span><span class="sr-only">Loading file<\/span><\/div><\/div><\/div>/);
  assert.doesNotMatch(markup, /role="note"/);
});

test('a large Markdown file in one unsplittable chunk waits behind the Zo spinner (Ei pending)', () => {
  // 60 KB with a reference definition: one chunk of more than 24576 chars, not plain.
  const source = `${changelog(60 * 1024)}[1.0.0]: https://example.com\n`;
  let rendered = 0;
  const markup = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'CHANGELOG.md', text: source }, displayPath: 'CHANGELOG.md', fullPath: '/w/CHANGELOG.md', scopeKey: 'k',
    renderMarkdown: () => { rendered += 1; return h('div', null, 'x'); } }));
  assert.equal(rendered, 0);
  assert.match(markup, /<div data-file-viewer="" data-file-preview="markdown" class="[^"]*sfv-preview"><div class="flex items-center justify-center h-full w-full source-pane-state"><span role="status" aria-label="Loading file" class="leading-\[0\]"><\/span><\/div><\/div>/);
});

// R3-files FT-18 (cov9-01): the grid is the generated 2.42304.0 c3fde7009 Ei, variant "pane" (labels through Ti; the
// labels are text-muted-as-secondary; no host class: its dl/dd margins are the official preflight's).
test('YAML frontmatter renders as the ki <dl> grid above the body, not as a heading', () => {
  const skill = '---\nname: demo-skill\ndescription: A demo skill\nallowed-tools: [Read, Write]\n---\n\n# Demo\n\nBody.\n';
  const markup = panel({ view: filesView({ path: '.claude/skills/demo/SKILL.md', text: skill }) });
  assert.match(markup, /<div class="mx-auto max-w-\[860px\]"><dl class="grid grid-cols-\[max-content_1fr\] items-baseline gap-x-\[28px\] gap-y-md mb-\[24px\] pb-\[20px\] border-b border-alpha-2"><dt class="text-footnote text-muted-as-secondary">Name<\/dt><dd class="text-body text-primary min-w-0 break-words">demo-skill<\/dd><dt class="text-footnote text-muted-as-secondary">Description<\/dt><dd class="text-body text-primary min-w-0 break-words">A demo skill<\/dd><dt class="text-footnote text-muted-as-secondary">Allowed tools<\/dt><dd class="text-body text-primary min-w-0 break-words">Read, Write<\/dd><\/dl><div class="epitaxy-file-prose sfv-prose"><div class="source-markdown">/);
  const prose = markup.slice(markup.indexOf('<div class="epitaxy-file-prose sfv-prose">'));
  assert.match(prose, /<h1>Demo<\/h1>/);
  assert.doesNotMatch(prose, /<hr|name: demo|<h2/);
  // Unsupported YAML still splits the body off, with no grid.
  const odd = panel({ view: filesView({ path: 'agent.md', text: '---\nkey: a: b\n---\nBody\n' }) });
  assert.doesNotMatch(odd, /<dl|<hr|key: a/);
  assert.match(odd, /<p>Body<\/p>/);
  // The source view keeps the frontmatter lines.
  const source = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'SKILL.md', text: skill }, displayPath: 'SKILL.md', fullPath: '/w/SKILL.md', line: 1, scopeKey: 'k', renderMarkdown: () => null }));
  assert.match(source, /data-line="2"><span class="sfv-number" data-number="2" aria-hidden="true"><\/span><code class="scb-code source-diff-code">name: demo-skill/);
});

test('source: the pane gives each progressive chunk its own Markdown owner', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(src, /renderMarkdown=\{\(text, chunk = 0\) => <SourceMarkdown text=\{text\} sessionKey=\{sessionId\} itemId=\{chunk \? `file:\$\{preview\.path\}#\$\{chunk\}` : `file:\$\{preview\.path\}`\} cwd=\{cwd\} \/>\} \/>/);
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-file-viewer.css'), 'utf8');
  assert.match(css, /\.sfv-prose\.epitaxy-file-prose-chunk \{\s*margin-bottom: var\(--chat-item-gap\);/);
  // R3-files FT-18: no host frontmatter rule; the dl/dd margins are the loaded 2.42304.0 preflight (@layer base).
  assert.doesNotMatch(css, /sfv-frontmatter/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8'), /@layer base\{\*,:after,:before,::backdrop\{box-sizing:border-box;border:0 solid;margin:0;padding:0\}/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../index.html'), 'utf8'), /<link rel="stylesheet" href="\/assets\/v1\/c6a992d55-sXiDGMFQ\.css" \/>/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-file-viewer.jsx'), 'utf8'), /import \{ Frontmatter \} from "\.\/generated\/files-changes\/file-frontmatter-view\.mjs";/);
});

// B13 (2.31226.0 cd2efac6e Ql :6783-6799, the sandbox branch :6283-6330, su :7141-7176): .html opens on the
// sandboxed preview frame (the lu "Loading file" cover until it draws) with the View source toggle when the pane
// hosts frames; .svg draws as an image; a PDF shows in Chromium's viewer; the bodies carry the im file menu.
test('B13: HTML opens in the preview frame, SVG as the drawn image, PDF in an iframe; source stays one toggle away', () => {
  const page = { path: 'site/index.html', text: '<!doctype html><h1>Hi</h1>' };
  const frame = { register: async () => ({ url: 'oc-file-preview://t/site/index.html' }), release: () => {} };
  const html = renderToStaticMarkup(h(V.SourceFileViewer, { file: page, displayPath: page.path, fullPath: '/w/site/index.html', scopeKey: 'k', previewFrame: frame }));
  assert.match(html, /data-file-view="preview"/);
  assert.match(html, /aria-label="View source" data-view-toggle=""/);
  assert.match(html, /<div data-file-viewer="" data-file-preview="html" class="relative flex-1 min-h-0 flex flex-col"><div class="absolute inset-0"><div class="flex items-center justify-center h-full w-full source-pane-state"><span role="status" aria-label="Loading file"/);
  assert.doesNotMatch(html, /class="sfv-line"/);
  // Opened at a line (a chip, Find in file) it starts on the source; without a frame host there is no preview.
  const atLine = renderToStaticMarkup(h(V.SourceFileViewer, { file: page, displayPath: page.path, fullPath: '/w/site/index.html', scopeKey: 'k', previewFrame: frame, line: 1, scrollNonce: 1 }));
  assert.match(atLine, /aria-label="Preview"/);
  assert.match(atLine, /data-file-view="source"/);
  const bare = renderToStaticMarkup(h(V.SourceFileViewer, { file: page, displayPath: page.path, fullPath: '/w/site/index.html', scopeKey: 'k' }));
  assert.doesNotMatch(bare, /sfv-view-toggle|data-file-preview/);
  // The Files pane hosts frames for its workspace.
  const pane = panel({ view: filesView(page) });
  assert.match(pane, /data-file-view="source"/);
  assert.match(pane, /aria-label="Preview" data-view-toggle=""/);
  assert.doesNotMatch(pane, /data-file-preview="html"/);
  const svg = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'logo.svg', text: '<svg xmlns="http://www.w3.org/2000/svg"/>' }, displayPath: 'logo.svg', fullPath: '/w/logo.svg', scopeKey: 'k' }));
  assert.match(svg, /<div data-file-viewer="" data-file-preview="svg" class="flex-1 min-h-0 \[contain:strict\] sfv-media"><div class="h-full overflow-auto p-md flex items-center justify-center"><img src="data:image\/svg\+xml;charset=utf-8,%3Csvg%20xmlns[^"]*" alt="logo\.svg" class="max-w-full max-h-full object-contain"\/>/);
  assert.match(svg, /aria-label="View source" data-view-toggle=""/);
  const pdf = renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'docs/Spec.pdf', unavailable: 'pdf' }, displayPath: 'docs/Spec.pdf', fullPath: '/w/docs/Spec.pdf', scopeKey: 'k' }));
  assert.match(pdf, /<div data-file-viewer="" data-file-media="pdf" class="flex-1 min-h-0 \[contain:strict\] sfv-media"><div class="h-full w-full relative overflow-hidden"><iframe src="file:\/\/\/w\/docs\/Spec\.pdf" title="Spec\.pdf" class="h-full w-full border-0 sfv-pdf"><\/iframe>/);
  assert.doesNotMatch(pdf, /sfv-view-toggle|role="alert"|looks like binary/);
});

test('B13 source: the frame is sandboxed without same-origin, routes posted links, times out after 20 s; bodies open the file menu', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-file-viewer.jsx'), 'utf8');
  assert.match(src, /sandbox="allow-scripts" title=\{name\}/);
  assert.doesNotMatch(src, /allow-same-origin/);
  assert.match(src, /event\.source !== iframe\.current\.contentWindow/);
  // Ba / OpenExternal "ask": only a gesture on a link the page wrote opens at once; others ask (cfdfec14c le).
  assert.match(src, /userActivation\?\.isActive === true && previewLinkWritten\(text, link\.href\)\) openWebLink\(link\.href, link\.event\);\n\s*else setAsk\(\(value\) => value \?\? link\)/);
  assert.match(src, /<SourceDialog alert size="md" showClose=\{false\} title=\{t\("Open external link"\)\} description=\{t\("You’re leaving Claude to visit an external link:"\)\}\n\s*initialFocusRef=\{cancel\}/);
  assert.equal(V.EXTERNAL_LINK_ACTIVATION_DELAY_MS, 400);
  assert.equal(V.PREVIEW_FRAME_TIMEOUT_MS, 20000);
  assert.match(src, /<div ref=\{bodyRef\} className="sfv-body"[^>]*onContextMenu=\{fileMenu \? openBodyMenu : undefined\}/);
  assert.match(src, /fileViewerMenu\(fileMenu\.entries\(file\.path, \{ surface: "file_viewer", unavailable: file\.unavailable \}\)/);
  const session = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(session, /lister=\{folderLister\} fileMenu=\{fileMenu\} previewFrame=\{previewFrame\}/);
  assert.match(session, /register: \(text, path\) => call\("file:preview-frame", \{ cwd, relative: path, text \}\)/);
});

// B32 (2.31226.0 cd2efac6e readable mp/bp/Cp :5181-5225 and :5565-5600, Gl :6735-6748, tp :5114-5135, cu :7179-7203).
test('B32: the missing card offers Try again, and Create file only when the parent folder exists', () => {
  const buttons = (markup) => [...markup.matchAll(/<button data-step="1"[^>]*data-card-action="([^"]+)"/g)].map((match) => match[1]);
  const plain = panel({ view: filesView({ path: 'src/missing.js', unavailable: 'missing' }) });
  assert.deepEqual(buttons(plain), ['retry'], 'creatable unknown: no Create file');
  assert.match(text(plain), /src\/missing\.jsTry again$/m);
  const creatable = panel({ view: filesView({ path: 'src/missing.js', unavailable: 'missing', creatable: true }) });
  assert.deepEqual(buttons(creatable), ['retry', 'create']);
  assert.match(text(creatable), /Try againCreate file/);
  const notHere = panel({ view: filesView({ path: 'src/missing.js', unavailable: 'missing', creatable: false }) });
  assert.deepEqual(buttons(notHere), ['retry']);
  assert.match(text(notHere), /Couldn’t find this fileIt can’t be created from here\. Ask Claude to create it\.src\/missing\.js/);
  const image = panel({ view: filesView({ path: 'logo.png', unavailable: 'missing', creatable: true }) });
  assert.deepEqual(buttons(image), ['retry'], 'Gt: an image is never created empty');
});

test('B32: outside-root and binary cards put Show in Finder before View as text anyway', () => {
  const fileActions = { onShowSessionFile: async () => true };
  const outside = panel({ fileActions, view: filesView({ path: '/etc/hosts', unavailable: 'outside_root' }) });
  assert.match(text(outside), /may still exist on disk\.\/etc\/hostsShow in Finder/);
  const binary = panel({ fileActions, view: filesView({ path: 'img.bin', unavailable: 'binary' }) });
  assert.match(text(binary), /can’t be previewed as textShow in FinderView as text anyway/);
  const none = panel({ view: filesView({ path: 'img.bin', unavailable: 'binary' }) });
  assert.doesNotMatch(none, /Show in Finder/, 'no reveal without the session reveal action');
  const tooLarge = panel({ fileActions, view: filesView({ path: 'big.log', unavailable: 'too_large' }) });
  assert.doesNotMatch(tooLarge, /Show in Finder/, 'too_large inside the root has no reveal');
});

test('B32 source: card actions, offer flow and breadcrumb segment menus are wired to real services', () => {
  const viewer = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-file-viewer.jsx'), 'utf8');
  const session = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  assert.match(session, /onCreateFile: sessionId \? \(\) => call\("file:save", \{ cwd, relative: preview\.path, text: "", expectedHash: null \}\)/);
  assert.match(session, /onRetry: \(\) => loadFile\(preview\.path\)/);
  assert.match(session, /call\("file", \{ cwd, relative: path, \.\.\.\(sessionId \? \{ sessionId \} : \{\}\)/);
  assert.match(viewer, /createFileFailedMessage\(name\)/);
  assert.match(viewer, /surface: "file_breadcrumb"/);
  assert.match(viewer, /setOfferNonce\(\(value\) => value \+ 1\)/, 'the offer is asked again after an add');
  for (const action of ['case "file:reveal-session"', 'case "file:folder-offer"']) assert.ok(main.includes(action), action);
});
