import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// W14-code panes-files: 3.6556.2 originals (cd2efac6e Js / Qs / Gs / xb / Eb / Hy; cccc2cf0a _T / WT / UT, kA, tN;
// cb1b78cfa ImagePreviewModal; c9c84d68b C; c4db265df pane header; cbd02b8f2 Tab hint / cda9b4504 gutter button).
const app = path.resolve(import.meta.dirname, '..');
let server, V, G, B, P, E;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  V = await server.ssrLoadModule('/src/source-file-viewer.jsx');
  G = await server.ssrLoadModule('/src/source-file-go-to-line.jsx');
  B = await server.ssrLoadModule('/src/source-btw-pane.jsx');
  P = await server.ssrLoadModule('/src/source-preview-pane.jsx');
  E = await server.ssrLoadModule('/src/source-file-edit-guard.jsx');
});
after(() => server?.close());
const h = React.createElement;
const source = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const SUBHEADER = 'epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md bg-alpha-1 h-[calc(2rem*var(--cds-rem-scale,1))]';

test('cd2efac6e Js: the find bar is the c82eca2bd subheader with CdsTextInput, Gs options and base ghost CdsButtons', () => {
  assert.equal(G.PANE_SUBHEADER_CLASS, SUBHEADER);
  const html = renderToStaticMarkup(h(V.SourceFileFindBar, { query: 'ab', status: { total: 2, current: 1, capped: false },
    options: { matchCase: true, wholeWord: false, regexp: false }, result: { invalid: false, partial: false, hasLongLines: false },
    inputRef: { current: null }, onToggle() {}, onQuery() {}, onNext() {}, onPrev() {}, onClose() {} }));
  assert.ok(html.startsWith(`<div role="search" data-pane-editor="" class="${SUBHEADER}" data-file-find="">`), html.slice(0, 200));
  assert.match(html, /data-cds="TextInput"/);
  assert.match(html, /aria-label="Find in file" placeholder="Find in file…"/);
  assert.match(html, /<span role="group" aria-label="Search options" class="flex items-center gap-xs">/);
  assert.match(html, /aria-pressed="true"[^>]*aria-label="Match case"|aria-label="Match case"[^>]*aria-pressed="true"/);
  assert.match(html, /<span aria-hidden="true" class="text-caption underline">ab<\/span>/);
  assert.match(html, /<span aria-live="polite" class="text-footnote text-muted-as-secondary tabular-nums">1 of 2<\/span>/);
  for (const label of ['Previous match', 'Next match', 'Close find bar']) assert.match(html, new RegExp(`aria-label="${label}"`));
  assert.doesNotMatch(html, /sfv-find/);
});

test('cd2efac6e Qs: go to line is the same subheader with CdsField around CdsTextInput and the status', () => {
  const html = renderToStaticMarkup(h(G.SourceFileGoToLine, { caret: { line: 3, lines: 10 }, onGo() {}, onClose() {} }));
  assert.ok(html.startsWith(`<div class="${SUBHEADER}" data-pane-editor="" data-go-to-line="">`), html.slice(0, 200));
  assert.match(html, /class="flex flex-col gap-xs font-sans min-w-0 flex-1"/);
  assert.match(html, /aria-label="Go to line" placeholder="Line, or line:column"/);
  assert.match(html, /<span aria-live="polite" class="text-footnote text-muted-as-secondary tabular-nums">Line 3 of 10<\/span>/);
  assert.match(html, /aria-label="Close go to line bar"/);
});

test('cd2efac6e xb / Eb / ordering, and the removed host rules', () => {
  const viewer = source('src/source-file-viewer.jsx');
  assert.match(viewer, /role="status" className="shrink-0 px-md py-1\.25 bg-alpha-2 text-body text-primary"/);
  assert.match(viewer, /role="alert" className="shrink-0 px-md py-1\.25 bg-alpha-2 flex items-center gap-1"/);
  assert.match(viewer, /<span className="flex-1 text-body text-primary">/);
  const banner = viewer.indexOf('This file isn’t valid UTF-8, so it’s saved only'), find = viewer.indexOf('<SourceFileFindBar query'),
    goTo = viewer.indexOf('<SourceFileGoToLine caret'), error = viewer.indexOf('data-file-save-error');
  assert.ok(banner > 0 && banner < find && find < goTo && goTo < error, 'xb, wb, Tb, Eb');
  assert.match(viewer, /invalidUtf8 && settings\.autoSave !== false \? \{ \.\.\.settings, autoSave: false \}/, 'qu = Ku && !Su');
  const css = source('src/source-file-viewer.css');
  assert.doesNotMatch(css, /\.sfv-find|\.sfv-edit-error|--alpha-2|\.sfv-editor-tab-hint|\.sfv-gutter-comment/);
  const editor = source('src/source-file-editor.jsx');
  assert.match(editor, /"pointer-events-none absolute bottom-2 right-3 rounded border-\[0\.5px\] border-strong bg-surface-1 px-2 py-1 text-footnote text-secondary shadow-sm"/);
  assert.match(editor, /"absolute left-px flex size-4 items-center justify-center rounded bg-fill-accent text-on-accent hover:bg-fill-accent-hover"/);
});

test('cd2efac6e Hy: the detached auto-save toast copy by kind', () => {
  const name = 'a.ts';
  assert.equal(E.detachedSaveFailureMessage('conflict', name), 'Your changes to a.ts weren’t saved because the file changed on disk. Reopen the file to see the latest version.');
  assert.equal(E.detachedSaveFailureMessage('missing', name), 'Your changes to a.ts weren’t saved because the file was deleted on disk.');
  assert.equal(E.detachedSaveFailureMessage('denied', name), 'Your changes to a.ts weren’t saved because this session can’t write to that file. Edit it in your editor or terminal instead.');
  assert.match(E.detachedSaveFailureMessage('hook_denied', name), /^Your changes to a\.ts weren’t saved because they change Git-hook tool settings/);
  assert.equal(E.detachedSaveFailureMessage('failed', name), 'Your changes to a.ts couldn’t be saved. Reopen the file and try again.');
});

test('cccc2cf0a _T / WT / UT: the Files filter bar and its notes', () => {
  const search = source('src/source-files-search.jsx');
  assert.match(search, /className="flex h-8 shrink-0 items-center px-md" data-files-filter=""/);
  assert.match(search, /<CdsTextInput ref=\{input\}/);
  assert.match(search, /className="grid size-4 shrink-0 place-items-center"/);
  assert.match(search, /<CdsSpinner size="sm" label=\{t\("Searching files"\)\} \/>/);
  assert.match(search, /"flex items-center justify-center px-lg py-1 text-body text-muted-as-secondary"/);
  assert.match(search, /"py-1\.5 pe-md text-footnote text-muted-as-secondary select-none"/);
  assert.doesNotMatch(search, /Couldn’t search filenames|sfs-notice|sfs-limit|sfs-field|role="alert"/);
  assert.doesNotMatch(source('src/source-files-search.css'), /\.sfs-(field|notice|limit|error|spinner|filter-bar)/);
});

test('cccc2cf0a kA: /btw in a side chat asks the parent side chat; refusals are the original toasts', () => {
  assert.equal(B.btwSideChatQuestion('/btw why is this slow?'), 'why is this slow?');
  assert.equal(B.btwSideChatQuestion('/btw: x'), 'x');
  assert.equal(B.btwSideChatQuestion('/btw'), '');
  assert.equal(B.btwSideChatQuestion('/side  y '), 'y');
  assert.equal(B.btwSideChatQuestion('/btwx'), undefined);
  assert.equal(B.btwSideChatQuestion('hello'), undefined);
  assert.match(B.btwSideChatRefusal('alone'), /^A side chat in its own window can’t open another one/);
  assert.match(B.btwSideChatRefusal('busy'), /^Another side chat is still starting/);
  assert.match(B.btwSideChatRefusal('other'), /^A new side chat can’t open from this one/);
  const pane = source('src/source-btw-pane.jsx');
  assert.match(pane, /nameFocusRescue\(from\.scope, t\('DeepSeek proposed a plan'\)\)/);
  assert.match(pane, /title=\{t\('Connecting to session…'\)\}/);
});

test('c9c84d68b C: the preview viewport colour', () => {
  const bg = P.previewViewportBackground;
  assert.equal(bg({ hasServer: false }), false);
  assert.equal(bg({ hasServer: true, hideForStartPage: true }), false);
  assert.equal(bg({ hasServer: true, pageBackgroundColor: 'rgb(1, 2, 3)' }), 'rgb(1, 2, 3)');
  assert.equal(bg({ hasServer: true, isHtmlPreview: true }), '#ffffff');
  assert.equal(bg({ hasServer: true }), 'scheme');
  const css = source('src/source-preview-pane.css');
  assert.match(css, /\.spv-viewport\[data-placeholder\] \{ background: #f5f5f5; \}/);
  assert.doesNotMatch(css, /\.spv-button/);
});

test('cb1b78cfa ImagePreviewModal popup and c4db265df pane header grouping', () => {
  assert.match(source('src/source-image-viewer.jsx'), /className="fixed inset-0 grid place-items-center p-4 sm:p-10 bg-black\/62\.5 outline-none siv-popup"/);
  assert.doesNotMatch(source('src/source-image-viewer.css'), /backdrop-filter|48rem/);
  const session = source('src/source-session.jsx');
  assert.match(session, /"z-\[1\] flex items-center flex-1 min-w-0 draggable-none gap-0\.5"/);
  assert.match(session, /"relative z-\[2\] flex items-center gap-0\.5 min-w-0"/);
  assert.match(source('src/source-session.css'), /\.source-file-panel > \.source-pane-header \{\n  display: flex;\n  gap: var\(--cds-gap-sm, 8px\);\n  justify-content: space-between;/);
});
