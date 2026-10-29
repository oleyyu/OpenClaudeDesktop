// w12b-changes-files (W12b): Changes / Files / comments against 3.6556.2 — the comment annotation tile (c0fbbe82d fs/Bo/zo,
// cc43287c9 lg), the no-repo Changes state (cb61be3a2 it/ut), filename results as tree rows (cccc2cf0a _T > RT), Go to file
// on CdsCombobox (cccc2cf0a CC), the editor's selection bar (cbd02b8f2 li > ceb49ada3 t), its context menu without Copy
// file contents (cd2efac6e), the silent failed copy (cd2efac6e eg) and the danger hover on Delete comment (c82eca2bd ke).
// Official chunks are read as text only.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { annotationClickTarget, annotationText, annotationWhere, commentAnnotation, makeSnippet } from '../src/composer-attachments-model.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const chunk = (prefix) => fs.readFileSync(path.join(ASSETS, fs.readdirSync(ASSETS).find((name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'))), 'utf8');
const src = (name) => fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
let server;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

test('official originals carry what the host follows', () => {
  const composer = chunk('c0fbbe82d');
  for (const needle of [
    'a.formatMessage({defaultMessage:"Comment on {where}",id:"zDGTd+10O6"},{where:Bo(a,t)})',
    't.body.trim()||t.snippet?.trim()||Bo(a,t)',
    'a.formatMessage({defaultMessage:"Comment",id:"FJI3BnIl+Q"})',
    'function Bo(e,t){let n=t.filePath.lastIndexOf("/"),r=`${n>=0?t.filePath.slice(n+1):t.filePath}:${t.startLine===t.endLine?`${t.startLine}`:`${t.startLine}-${t.endLine}`}`;return t.side==="deletions"?zo(e,r):r}',
    '{defaultMessage:"{where} (before changes)",id:"BD+Pn6/K6Z"}',
  ]) assert.ok(composer.includes(needle), needle);
  const code = chunk('cc43287c9');
  for (const needle of ['onClickAnnotation:lg', 'if(e.source==="file"){', 'line:e.endLine', 'tI.scrollToAnnotation(J,e.filePath,{anchor:{side:e.side,line:e.endLine}})'])
    assert.ok(code.includes(needle), needle);
  const changes = chunk('cb61be3a2');
  for (const needle of ['{defaultMessage:"Changes need a Git repository",id:"ZSmll0R5ni"}', 'On=E&&Oe!==void 0&&!v', 'noRepo:On',
    '{defaultMessage:"None was found for this session, or its folder couldn\\u2019t be reached.",id:"oY/OLoumIq"}'])
    assert.ok(changes.includes(needle), needle);
  const pane = chunk('cccc2cf0a');
  for (const needle of [
    'u(ul,{fileName:P,size:$c(),className:c("shrink-0 self-center",H?"text-muted-control":"text-muted-as-secondary")})',
    'Ke=H?te?"text-secondary":"text-primary":"text-muted-as-secondary"',
    'className:"truncate text-footnote text-muted-as-secondary"',
    'u(ul,{fileName:e.name,size:$c(),className:"shrink-0 text-muted-control"})',
    'positionerClassName:"w-[22rem] max-w-[calc(100vw-16px)]",maxVisibleItems:12',
    '{defaultMessage:"{previousPath} \\u2192 {path}",id:"jkPhvybAbJ"}',
    'className:"px-md py-1.5 text-body text-muted-as-secondary select-none"',
    'className:"aspect-square w-control justify-center px-0 rounded"',
  ]) assert.ok(pane.includes(needle), needle);
  const editor = chunk('cbd02b8f2');
  for (const needle of ['{key:"add-to-chat",label:Ke,shortcut:"cmd+shift+l",onSelect:W.attach}', '{key:"add-comment",label:r,ariaLabel:i,onSelect:W.comment}',
    'className:Ft?"pointer-events-auto invisible":"pointer-events-auto",children:n(le,{actions:Z})'])
    assert.ok(editor.includes(needle), needle);
  const viewer = chunk('cd2efac6e');
  for (const needle of ['(z||pg)&&a(F.Separator,{}),z&&a(F.Item,{onClick:eg', 'z=R!==null']) assert.ok(viewer.includes(needle), needle);
  assert.ok(chunk('c82eca2bd').includes('className:e(d?W:Oe,"hover:text-danger")'));
  const catalog = fs.readFileSync(path.join(ASSETS, '../../i18n/en-US.json'), 'utf8');
  assert.ok(!catalog.includes('"Couldn’t copy to clipboard."'), 'the official catalog has no "Couldn’t copy to clipboard."');
});

test('cf-01: a saved line comment carries fs\'s annotation; Bo / text / lg target', () => {
  const diff = commentAnnotation({ path: 'src/foo.js', start: 3, end: 5, side: 'additions', body: '  tighten this  ', code: 'let a = 1;' });
  assert.deepEqual(diff, { source: 'diff', filePath: 'src/foo.js', startLine: 3, endLine: 5, body: '  tighten this  ', side: 'additions', snippet: 'let a = 1;' });
  assert.equal(annotationWhere(diff), 'foo.js:3-5');
  assert.equal(annotationText(diff, 'foo.js:3-5'), 'tighten this');
  assert.equal(annotationText({ ...diff, body: ' ' }, 'w'), 'let a = 1;');
  assert.equal(annotationText({ ...diff, body: '', snippet: undefined }, 'w'), 'w');
  assert.deepEqual(annotationClickTarget(diff), { pane: 'changes', path: 'src/foo.js', anchor: { side: 'additions', line: 5 } });
  const file = commentAnnotation({ path: 'a/b.md', start: 7, end: 7, body: 'x', source: 'file' });
  assert.equal(annotationWhere(file), 'b.md:7');
  assert.deepEqual(annotationClickTarget(file), { pane: 'files', path: 'a/b.md', line: 7 });
  assert.equal(commentAnnotation({ start: 1 }), null);
  const snippet = makeSnippet('In src/foo.js, lines 3–5:\n> let a = 1;\ntighten this', { key: 'k', label: 'src/foo.js:L3-L5', annotation: { path: 'src/foo.js', start: 3, end: 5, side: 'deletions', body: 'b' } });
  assert.equal(snippet.annotation.side, 'deletions');
  assert.equal(snippet.text.startsWith('In src/foo.js'), true, 'the model still gets the serialized comment');
  // A persisted entry (main.jsx restores drafts with makeSnippet(entry.text, entry)) keeps its annotation.
  assert.deepEqual(makeSnippet(snippet.text, snippet).annotation, snippet.annotation);
  assert.equal(makeSnippet('plain', { label: 'x' }).annotation, undefined);
});

test('cf-01: the composer tile renders fs (Comment on {where}, Comment badge, before changes)', async () => {
  const { ComposerAttachmentTiles, annotationWhereLabel } = await server.ssrLoadModule('/src/source-composer-tiles.jsx');
  const add = makeSnippet('serialized', { key: 'a', label: 'l', annotation: { path: 'src/foo.js', start: 3, end: 5, side: 'additions', body: 'tighten this' } });
  const del = makeSnippet('serialized', { key: 'b', label: 'l', annotation: { path: 'src/foo.js', start: 2, end: 2, side: 'deletions', body: '' , code: 'old()' } });
  const plain = makeSnippet('quoted text', { label: 'Quote' });
  assert.equal(annotationWhereLabel(del.annotation), 'foo.js:2 (before changes)');
  const html = renderToStaticMarkup(React.createElement(ComposerAttachmentTiles, { entries: [add, plain, del], onRemove() {}, onClickAnnotation() {} }));
  assert.match(html, /Comment on foo\.js:3-5/);
  assert.match(html, /tighten this/);
  assert.match(html, /Comment on foo\.js:2 \(before changes\)/);
  assert.match(html, /old\(\)/);
  assert.ok(html.indexOf('quoted text') < html.indexOf('Comment on foo.js:3-5'), 'Go maps the annotations after the snippets');
  const count = (text, word) => text.split(word).length - 1;
  const plainOnly = renderToStaticMarkup(React.createElement(ComposerAttachmentTiles, { entries: [plain], onRemove() {} }));
  assert.equal(count(html, 'Excerpt'), count(plainOnly, 'Excerpt'), 'only the plain snippet keeps the Excerpt badge');
  assert.equal(count(html, '>Comment<'), 2, 'each annotation carries the Comment badge');
  const composer = src('source-composer.jsx');
  assert.match(composer, /onClickAnnotation=\{onClickAnnotation\}/);
});

test('cf-02: the Changes state titles a folder without a repository like it', async () => {
  const { SourceChangesState } = await server.ssrLoadModule('/src/source-pane-states.jsx');
  const html = (props) => renderToStaticMarkup(React.createElement(SourceChangesState, props));
  assert.match(html({ state: 'empty', noRepo: true }), /Changes need a Git repository[\s\S]*None was found for this session, or its folder couldn’t be reached\./);
  assert.match(html({ state: 'empty', uncommittedOnly: true }), /No uncommitted changes/);
  assert.doesNotMatch(html({ state: 'empty' }), /None was found/);
  assert.match(html({ state: 'failed', noRepo: true }), /Couldn’t load the changes/);
  const session = src('source-session.jsx');
  assert.equal((session.match(/noRepo=\{diffNoRepo\}/g) ?? []).length, 2);
  assert.match(session, /diffNoRepo = false,/);
});

test('cf-03: filename results are RT rows (file-tree row classes, FileTypeIcon, muted-as-secondary folder)', () => {
  const search = src('source-files-search.jsx');
  assert.match(search, /className=\{treeRow \? fileTreeRowClassName\(\{ current: rowCurrent, selected: rowSelected \}\) : "sfs-result-row"\}/);
  assert.match(search, /<FileTypeIcon fileName=\{entry\.name\} size=\{fileTreeIconSize\(\)\} className=\{fileTreeIconClassName\(\{ openable: true \}\)\} \/>/);
  assert.match(search, /className="truncate text-footnote text-muted-as-secondary"/);
  assert.match(search, /hasNameMatches \? "truncate text-secondary" : "truncate text-primary"/);
  assert.match(search, /className=\{treeRow \? fileTreeRowPrimary : undefined\}/);
});

test('cf-04: Go to file is CC on CdsCombobox', async () => {
  const { SourceDiffGoToFile, goToFileMatches, goToFileRows } = await server.ssrLoadModule('/src/source-pane-go-to-file.jsx');
  const patch = ['diff --git a/src/old.js b/src/new.js', 'similarity index 90%', 'rename from src/old.js', 'rename to src/new.js',
    '--- a/src/old.js', '+++ b/src/new.js', '@@ -1 +1 @@', '-a', '+b',
    'diff --git a/lib/util.ts b/lib/util.ts', '--- a/lib/util.ts', '+++ b/lib/util.ts', '@@ -1 +1,2 @@', ' x', '+y'].join('\n') + '\n';
  const rows = goToFileRows(patch);
  assert.deepEqual(rows.map((row) => [row.value, row.name, row.previousPath]), [['src/new.js', 'new.js', 'src/old.js'], ['lib/util.ts', 'util.ts', undefined]]);
  const old = goToFileMatches(rows, 'old');
  assert.deepEqual(old.filtered.map((row) => row.value), ['src/new.js']);
  assert.ok(old.byPreviousPath.has('src/new.js'), 'only the previous path matched: the row gets the rename title');
  assert.equal(old.positions.has('src/new.js'), false);
  const util = goToFileMatches(rows, 'util');
  assert.deepEqual(util.filtered.map((row) => row.value), ['lib/util.ts']);
  assert.ok(util.positions.get('lib/util.ts')?.length > 0);
  const html = renderToStaticMarkup(React.createElement(SourceDiffGoToFile, { patch }));
  assert.match(html, /data-cds="Combobox"/);
  assert.match(html, /aria-label="Go to file"/);
  assert.match(html, /aspect-square w-control justify-center px-0 rounded/);
  const host = src('source-pane-go-to-file.jsx');
  for (const needle of ['positionerClassName="w-[22rem] max-w-[calc(100vw-16px)]" maxVisibleItems={12}', 'className="shrink-0 text-muted-control"',
    'className="px-md py-1.5 text-body text-muted-as-secondary select-none"', 't("{previousPath} → {path}"', '<CdsCombobox.PopupSearch', '<CdsCombobox.Status'])
    assert.ok(host.includes(needle), needle);
  assert.ok(!host.includes('createPortal') && !host.includes('fileKindIcon'), 'the 2.2553.1 hand-made popup is gone');
});

test('cf-05 / cf-06 / cf-07 / cf-08: editor selection bar, editor menu, silent copy failure, danger delete', () => {
  const editor = src('source-file-editor.jsx');
  assert.match(editor, /<CdsRoot density="compact" experimental=\{CHIP_ROOT_EXPERIMENTAL\} className="contents">/);
  assert.match(editor, /className=\{menu\?'pointer-events-auto invisible':'pointer-events-auto'\}><SelectionActionBar actions=\{chipActions\}\/>/);
  assert.match(editor, /\{ key: 'add-to-chat', label: t\('Attach as context'\), shortcut: 'cmd\+shift\+l', onSelect: chip\.attach \}/);
  assert.match(editor, /key: 'add-comment', label: t\('Add comment'\), ariaLabel:/);
  assert.ok(!editor.includes('sfv-selection') && !editor.includes('SourceSettingsButton'));
  assert.ok(!editor.includes("t('Copy file contents')"), 'no Copy file contents in the editor context menu');
  assert.match(editor, /\{onDownload && <><SourceMenu\.Separator \/>/);
  const viewer = src('source-file-viewer.jsx');
  assert.ok(!viewer.includes('Couldn’t copy to clipboard.'));
  assert.match(viewer, /toasts\?\.add\(t\("Copied to clipboard\."\), \{ variant: "neutral" \}\), \(\) => \{\}\);/);
  const css = src('source-file-viewer.css');
  assert.ok(!css.includes('.sfv-selection-'));
  assert.match(css, /\.sfv-comment-actions button\[data-comment-delete\]:hover \{ color:var\(--cds-text-danger\); \}/);
  assert.match(src('source-file-comments.jsx'), /data-comment-delete="" aria-label=\{t\('Delete comment'\)\}/);
});

// W12c files-tabbar finished cf-09: the strip is the ViewTabBar itself, so these classes come from the generated
// cfe7c4b3b and the host's .source-file-tab* / .source-file-overflow* rules are gone.
test('cf-09: the Files tab strip is cfe7c4b3b\'s ViewTabBar with its own tokens', () => {
  const bar = chunk('cfe7c4b3b');
  const generated = src('generated/view-tabs/cfe7c4b3b-BF79K6ux.js');
  for (const needle of ['"items-center gap-[4px] overflow-clip text-body text-secondary-control"',
    '"text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary group-data-[selected]/tab:text-primary"',
    '"text-caption text-muted-as-secondary"', '"grid shrink-0 cursor-interactive place-items-center rounded-sm text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary"']) {
    assert.ok(bar.includes(needle), needle);
    assert.ok(generated.includes(needle), `generated: ${needle}`);
  }
  assert.doesNotMatch(src('source-session.css'), /\.source-file-(tab|tabs|tabbar|overflow)\b/);
  assert.match(src('source-session.jsx'), /<SourceFileTabs tabs=\{fileTabs\}/);
});
