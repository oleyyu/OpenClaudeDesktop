// W14-code r5 pierre lane (css5-file-viewer-pierre-file, E95): the Files viewer's read-only text body is the 3.6556.2
// pierre File (cd2efac6e `Bh ? a(oi, {className: "h-full overflow-y-auto select-text", children: a(li, {file: Bh,
// options: Sh, metrics: Ph, style: Ch})})`, oi = c64baa838 _n, li = c19e90103 Uc), sliced once by transcript-rows, behind
// the host switch local_pierre_file_viewer (false: the host's numbered rows, tests/file-viewer.test.mjs). Source / SSR only:
// pierre draws its rows in the diffs-container shadow root on the client, so the rows themselves need the GUI check.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const chunk = (name) => fs.readFileSync(path.join(official.ionSource, name), 'utf8');
const has = (text, features) => { for (const feature of features) assert.ok(text.includes(feature), feature); };
const h = React.createElement;

let server, V, rows, gutter, outside;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  V = await server.ssrLoadModule('/src/source-file-viewer.jsx');
  rows = await server.ssrLoadModule('/src/generated/transcript-rows/rows-cd2efac6e-Be7wcc4w.mjs');
  gutter = await server.ssrLoadModule('/src/generated/transcript-rows/rows-cc3bc2027-CqmDBxcX.mjs');
  outside = await server.ssrLoadModule('/src/generated/transcript-rows/outside-handlers.mjs');
});
after(async () => { await server?.close(); });

test('official: cd2efac6e draws the read-only text as pierre File in the c64baa838 scroller', () => {
  const viewer = chunk('cd2efac6e-Be7wcc4w.js');
  has(viewer, ['import{t as oi}from"./c64baa838-cddTLIc9.js"', 'Zn as li', 'className:"h-full overflow-y-auto select-text",children:a(li,{file:Bh,options:Sh,metrics:Ph,style:Ch})',
    'disableFileHeader:!0,overflow:yh,unsafeCSS:xh', '"data-file-viewer":!0', '"epitaxy-diff flex-1 min-h-0 [contain:strict]"', '"--diffs-tab-size":jh',
    'data-epitaxy-find-style', 'data-epitaxy-active-line-style', 'scrollIntoView({behavior:"instant",block:"center"})']);
  assert.match(chunk('c19e90103-BQFzF8EA.js'), /Uc as Zn/);
  assert.match(chunk('c64baa838-cddTLIc9.js'), /_n as t/);
});

test('generator: transcript-rows holds the one copy of pierre File, its scroller and the viewer helpers', () => {
  const manifest = JSON.parse(read('src/generated/transcript-rows/manifest.json'));
  const mod = (target) => manifest.modules.find((m) => m.target === target);
  assert.deepEqual(mod('rows-cd2efac6e-Be7wcc4w.mjs').exports, { fc: 'highlightFileFind', _c: 'highlightFileLines', vc: 'revealFileLine' });
  assert.deepEqual(mod('rows-c82eca2bd-CImI7zNG.mjs').exports, { ht: 'fileMetrics', ct: 'codeSelectionCss' });
  // W14-code r5 gen-final-5 (D1): n / r are exported too; code-editor-current's layout-tokens.mjs re-exports this copy.
  assert.deepEqual(mod('rows-cc3bc2027-CqmDBxcX.mjs').exports, { i: 'fileGutterCss', S: 'findLineOrdinal', n: 'editorLayout', r: 'lineNumberLayout' });
  for (const name of ['Uc', 'fl', 'Rc', 'zc']) assert.ok(mod('outside-handlers.mjs').linkExports.includes(name), name);
  assert.ok(mod('rows-c64baa838-cddTLIc9.mjs').linkExports.includes('_n'));
  // code-transcript imports the shared-28 line count from this area instead of a second copy (D1).
  assert.match(read('src/generated/code-transcript/ca288e1f2-Bh3_g2mG.mjs'), /import \{ AD as e \} from "\.\.\/transcript-rows\/rows-shared-28-DNYlf4wu\.mjs";/);
  const src = read('scripts/extract-transcript-rows.mjs');
  has(src, ["'cd2efac6e-Be7wcc4w.js': { internal: true, exports: { fc: 'highlightFileFind'", "linkExports: ['Uc', 'fl', 'Rc', 'zc']"]);
});

test('switch: local_pierre_file_viewer is a host entry, on by default', async () => {
  const growth = await server.ssrLoadModule('/src/host-growthbook.mjs');
  assert.equal(growth.hostGrowthBookFlag('local_pierre_file_viewer'), true);
  assert.equal(V.PIERRE_FILE_VIEWER_SWITCH, 'local_pierre_file_viewer');
});

test('SSR: the read-only text body is [data-file-viewer] > the pierre scroller > diffs-container', () => {
  const tab = { path: 'src/app.js', text: 'const a = 1;\nconst b = 2;\n' };
  const markup = renderToStaticMarkup(h(V.SourceFileViewer, { file: tab, displayPath: 'src/app.js', fullPath: '/w/src/app.js', scopeKey: 'k' }));
  const body = markup.slice(markup.indexOf('<div class="sfv-body">'));
  assert.match(body, /^<div class="sfv-body"><div data-file-viewer="" class="epitaxy-diff flex-1 min-h-0 \[contain:strict\]" style="--diffs-tab-size:4"><div class="h-full overflow-y-auto select-text"><div><diffs-container style="--diffs-overflow-override:clip;--diffs-scrollbar-gutter-override:0px"><\/diffs-container><\/div><\/div><\/div><\/div>/);
  assert.doesNotMatch(markup, /sfv-line|sfv-scroller|sfv-viewer|sfv-plain-note/);
  // Je false (word wrap off): overflow "scroll" and no Ch style.
  const scroll = renderToStaticMarkup(h(V.SourceFileViewer, { file: tab, displayPath: 'src/app.js', fullPath: '/w/src/app.js', scopeKey: 'k',
    settings: { wordWrap: false, tabSize: 2 } }));
  assert.match(scroll, /style="--diffs-tab-size:2"><div class="h-full overflow-y-auto select-text"><div><diffs-container><\/diffs-container>/);
  // The switch off: the host's numbered rows (rollback).
  const legacy = renderToStaticMarkup(h(V.PierreFileViewerContext.Provider, { value: false },
    h(V.SourceFileViewer, { file: tab, displayPath: 'src/app.js', fullPath: '/w/src/app.js', scopeKey: 'k' })));
  assert.match(legacy, /<div data-file-viewer="" class="epitaxy-diff sfv-viewer">/);
  assert.equal((legacy.match(/class="sfv-line"/g) || []).length, 2);
});

test('helpers: the sliced Bh / Sh pieces and the find, jump and reveal helpers', () => {
  // ci (fl): a CR shows as U+240D; Rc the letter-spacing rule of unsafeCSS; zc the wrapped style.
  assert.equal(outside.fl('a\rb'), 'a␍b');
  assert.match(outside.Rc, /^letter-spacing: calc\(round\(up, 1ch, 1px \/ 64\) - 1ch\); font-feature-settings: "liga", "clig", "calt";$/);
  assert.deepEqual(outside.zc, { '--diffs-overflow-override': 'clip', '--diffs-scrollbar-gutter-override': '0px' });
  // Pa(false, digits): the editor gutter without the fold column.
  assert.match(gutter.fileGutterCss(false, 3), /^:host\{--diffs-gap-block:8px;--diffs-gap-style:none\}\[data-column-number\]\{padding-left:18px;padding-right:8px\}\[data-line-number-content\]\{min-width:max\(calc\(2\.5rem - 18px - 8px\),3ch\)\}/);
  // Na: the current match's ordinal on its line.
  assert.equal(gutter.findLineOrdinal([3, 5, 5, 5, 9], 3), 2);
  assert.equal(gutter.findLineOrdinal([3, 5, 5, 5, 9], 4), 0);
  // vc / fc on a viewer whose pierre body has not mounted: nothing to reveal or mark yet.
  const removed = [];
  const style = { remove: () => removed.push('style') };
  const viewer = { firstElementChild: null, ownerDocument: { defaultView: null }, querySelector: (selector) => (selector === 'style[data-epitaxy-find-style]' ? style : null) };
  assert.equal(rows.revealFileLine(viewer, 4), false);
  assert.equal(rows.highlightFileFind(viewer, 4, null, 0), false);
  assert.deepEqual(removed, ['style']);
});

test('host source: the jump, find and focus wiring follow cd2efac6e Kh / Jh / Xh / zm', () => {
  const src = read('src/source-file-viewer.jsx');
  has(src, ['revealFileLine(node, line) || ++tries > 60', 'highlightFileLines(node, line, endLine, rangeColor)',
    'highlightFileFind(node, activeLine, matcher, ordinal)', 'passes < 5', 'compileSearch(find.query, find.options)',
    'resolved?.colors?.["editor.lineHighlightBackground"] ?? bundledThemeColor(mode, "editor.lineHighlightBackground")',
    'unsafeCSS: `${codeSelectionCss}[data-file] { ${pierreLetterSpacing} }${fileGutterCss(false, lineDigits)}`',
    'cacheKey: `file:${lang}:${hash ?? text}`', '(root.current?.querySelector(".cm-content, .sfv-scroller") ?? root.current)']);
});

// W14-code r5 pierre review fix (medium #1): cd2efac6e `fl = Wi(L, dl)` (c0fbbe82d Xr → Wr(e) = e.type === "local" &&
// !!writeSessionFile), `Lu = fl && !!Y && X === null && !vu` (:5022). With Lu the body is qi (the CodeMirror editor)
// with `readOnly: !Au`, showWhitespace and scrollPastEnd; pierre File is only its Suspense fallback. So in a local
// session a file it cannot write reads in the editor read-only, and pierre stays the fl-false body (no session).
test('official: Lu puts a local session\'s read-only text in qi (readOnly: !Au) with pierre as the Suspense fallback', () => {
  const viewer = chunk('cd2efac6e-Be7wcc4w.js');
  has(viewer, ['fl=Wi(L,dl)', 'Lu=fl&&!!Y&&X===null&&!vu', 'Au=pl&&Y?.hash!==void 0&&!Du', 'readOnly:!Au', 'showWhitespace:se?.showWhitespace', 'scrollPastEnd:se?.scrollPastEnd']);
  const gate = chunk('c0fbbe82d-COsmfHJY.js');
  assert.match(gate, /function Wr\(e\)\{return e!==null&&e\.type==="local"&&!!q\?\.writeSessionFile\}/);
  const editor = chunk(fs.readdirSync(official.ionSource).find((name) => name.startsWith('cbd02b8f2-')));
  assert.match(editor, /function Wa\(e\)\{return e\?\[L\.readOnly\.of\(!0\),O\(\{cursorBlinkRate:0\}\)\]:L\.readOnly\.of\(!1\)\}/);
  assert.match(editor, /F=ze&&!O/);
});

test('session: a file the local session cannot write is the read-only editor; no session keeps pierre', async () => {
  const S = await server.ssrLoadModule('/src/source-session.jsx');
  const tab = { path: 'src/app.js', text: 'a\n\tb\n' };
  const panel = renderToStaticMarkup(h(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'files', onViewChange: () => {},
    view: { fileTabs: [tab], activePath: tab.path, treeShown: false, treeHiddenWhileEmpty: false } }));
  assert.match(panel, /<div class="sfv-editor-shell"><div dir="ltr" class="sfv-editor" data-file-viewer="" data-word-wrap="true"><\/div><\/div>/);
  assert.doesNotMatch(panel, /diffs-container|epitaxy-diff flex-1 min-h-0 \[contain:strict\]/);
  // showWhitespace / scrollPastEnd reach the read-only editor as they do the writable one; no Tab hint (F = ze && !O).
  const settings = { wordWrap: false, showWhitespace: true, scrollPastEnd: true, tabIndents: true, tabSize: 4, autoSave: true };
  const session = renderToStaticMarkup(h(V.SourceSessionFileViewer, { file: tab, sessionId: 's', scopeKey: 'k-ro', displayPath: tab.path, fullPath: '/tmp/work/src/app.js', settings }));
  assert.match(session, /class="sfv-editor" data-file-viewer="" data-word-wrap="false" data-show-whitespace="true" data-scroll-past-end="true"/);
  assert.doesNotMatch(session, /Tab inserts indentation/);
  // No session (fl false): the pierre body.
  const bare = renderToStaticMarkup(h(V.SourceSessionFileViewer, { file: tab, sessionId: null, scopeKey: 'k-bare', displayPath: tab.path, fullPath: '/tmp/work/src/app.js' }));
  assert.match(bare, /<div data-file-viewer="" class="epitaxy-diff flex-1 min-h-0 \[contain:strict\]"/);
  assert.doesNotMatch(bare, /sfv-editor/);
});

test('read-only store: never dirty or saved, outside the edit guards, follows the re-read text', async () => {
  const store = await server.ssrLoadModule('/src/file-edit-store.mjs');
  const ro = V.readOnlyFileEditor({ key: 'k-store', path: 'a.js', sessionId: 's' });
  assert.equal(ro.readOnly, true); assert.equal(ro.dirty, false);
  ro.sync('one'); const first = ro.getSnapshot();
  assert.equal(first.text, 'one'); ro.sync('one'); assert.equal(ro.getSnapshot(), first, 'same text keeps the snapshot');
  ro.change('typed'); ro.sync('two'); assert.equal(ro.getSnapshot().text, 'two');
  await ro.save(); await ro.flushAutoSave();
  assert.equal(ro.dirty, false);
  assert.equal(store.fileEditGuards.dirty().some((editor) => editor.key === 'k-store'), false);
});

test('host source: SourceFileEditor applies qi Wa for a read-only store; the viewer root leaves the editor focus alone', async () => {
  const editor = read('src/source-file-editor.jsx');
  has(editor, ['const readOnlyMode = on => on ? [EditorState.readOnly.of(true), drawSelection({ cursorBlinkRate: 0 })] : drawSelection();',
    'readOnlyMode(editor.readOnly === true)', "{ key: 'Mod-s', run: cm => { if (cm.state.readOnly) return false; void editor.save(); return true; } }"]);
  const { EditorState, drawSelection } = await server.ssrLoadModule('/src/code-editor-core.mjs');
  assert.equal(EditorState.create({ doc: 'x', extensions: [EditorState.readOnly.of(true), drawSelection({ cursorBlinkRate: 0 })] }).readOnly, true);
  const viewer = read('src/source-file-viewer.jsx');
  has(viewer, ["const readOnly = useMemo(() => !file.editHash && sessionId ? readOnlyFileEditor(", "editor={readOnly} />",
    "editor?.readOnly ? { ...settings, autoSave: false, tabIndents: false }", "!event.target.closest('.cm-editor')"]);
});
