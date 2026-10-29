import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { DIFF_ROW_LABELS, absoluteDiffPath, copyChoices, executableChange, headerTooltip, pathParts, renamedFrom, renamedFromDisplay, rowLabels, stripClipboardControls } from '../src/diff-file-header-model.mjs';
import { fileKindIcon } from '../src/file-kind-icon.mjs';

// Changes-pane file header: 2.2553.1 c219730b0-DMsvWaVJ.js We/Ke/Ze/$e/W/qe and
// c3e58cab4-BIx3-QB8.js (Copy submenu). Node-only SSR of the actual component.
const glyphs = JSON.parse(readFileSync(new URL('../src/generated/icons.json', import.meta.url), 'utf8'));
const glyph = (name) => String.fromCodePoint(glyphs[name]);
const W_ROWS = Object.values(DIFF_ROW_LABELS).map((label) => label.row);
let server, SourceDiff;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceDiff } = await server.ssrLoadModule('/src/source-diff.jsx'));
});
after(async () => { await server?.close(); });

const actions = { root: '/repo', onCopy() {}, onOpenFile() {}, onAttachFile() {} };
const render = (value, props = {}) => renderToStaticMarkup(React.createElement(SourceDiff, { value, placement: 'changes', fileActions: actions, ...props }));
// Each FileDiff section's header (the aa trigger div) up to its body.
// 3.6556.2 c44d00c7f (w10-ccres-e31-diff): the trigger is `group/diff-file @container/diff-file relative`.
const headers = (html) => [...html.matchAll(/<div class="sdiff-header group\/diff-file @container\/diff-file relative"[\s\S]*?(?=<div id=|<\/section>)/g)].map((match) => match[0]);
const labelsOf = (header) => [...header.matchAll(/class="sdiff-row-label [^"]*">([^<]*)</g)].map((match) => match[1]);

const MODIFIED = 'diff --git a/src/app.js b/src/app.js\nindex 1..2 100644\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1 +1 @@\n-export const answer = 1;\n+export const answer = 2;\n';
const DELETED = 'diff --git a/gone.md b/gone.md\ndeleted file mode 100644\nindex 1..0\n--- a/gone.md\n+++ /dev/null\n@@ -1 +0,0 @@\n-bye\n';
const ADDED = 'diff --git a/new.txt b/new.txt\nnew file mode 100644\nindex 0..1\n--- /dev/null\n+++ b/new.txt\n@@ -0,0 +1 @@\n+hi\n';
const RENAMED = 'diff --git a/docs/old.txt b/docs/new.txt\nsimilarity index 100%\nrename from docs/old.txt\nrename to docs/new.txt\n';
const MOVED = 'diff --git a/a/old.txt b/b/old.txt\nsimilarity index 100%\nrename from a/old.txt\nrename to b/old.txt\n';
const EXECUTABLE = 'diff --git a/run.sh b/run.sh\nold mode 100644\nnew mode 100755\n';
const CLEARED = 'diff --git a/run.sh b/run.sh\nold mode 100755\nnew mode 100644\n';
const SYMLINK = 'diff --git a/link b/link\nold mode 100644\nnew mode 120000\n';
const BINARY = 'diff --git a/logo.png b/logo.png\nindex 1..2 100644\nBinary files a/logo.png and b/logo.png differ\n';

test('model: W labels only from binary and 100644<->100755; tooltip suffixes apply in order', () => {
  assert.equal(executableChange({ oldMode: '100644', newMode: '100755' }), 'set');
  assert.equal(executableChange({ oldMode: '100755', newMode: '100644' }), 'cleared');
  assert.equal(executableChange({ oldMode: '100644', newMode: '120000' }), undefined);
  assert.equal(executableChange({ newMode: '100755', status: 'added' }), undefined);
  assert.deepEqual(rowLabels({ binary: true, oldMode: '100644', newMode: '100755' }).map((label) => label.row), ['Binary file', 'Made executable']);
  assert.deepEqual(rowLabels({ status: 'deleted', oldMode: '100644' }), []);
  assert.deepEqual(rowLabels({ whitespaceOnly: true }).map((label) => label.row), ['Whitespace only'], 'used only when the parser sets it');
  assert.equal(headerTooltip({ path: 'b.sh', renamedFrom: 'a.sh', binary: true, oldMode: '100755', newMode: '100644' }),
    'a.sh → b.sh (binary file) (no longer executable)');
  assert.equal(headerTooltip({ path: 'x.js' }), 'x.js');
  assert.equal(renamedFrom({ path: 'x', renamedFrom: 'x' }), undefined);
  assert.equal(renamedFromDisplay('docs/new.txt', 'docs/old.txt'), 'old.txt');
  assert.equal(renamedFromDisplay('b/old.txt', 'a/old.txt'), 'a/old.txt');
  assert.deepEqual(pathParts('src/lib/app.js'), { base: 'app.js', directory: 'src/lib' });
  assert.deepEqual(pathParts('README.md'), { base: 'README.md', directory: '' });
});

test('model: c3e58cab4 copy choices and control stripping', () => {
  assert.deepEqual(copyChoices('/repo', 'src/app.js'), { absolute: '/repo/src/app.js', relative: 'src/app.js', filename: 'app.js' });
  assert.deepEqual(copyChoices(null, 'src/app.js'), { absolute: null, relative: 'src/app.js', filename: 'app.js' });
  assert.equal(absoluteDiffPath('/repo/', '../x/./y.txt'), '/x/y.txt');
  assert.equal(stripClipboardControls('a\u0000b\nc\u202ed\u2028e\u200f'), 'abcde');
});

test('Changes placement header follows aa: chevron svg, file-type icon, path tooltip span, counts, reserve, Ze; no native title', () => {
  const html = render(MODIFIED);
  const [header] = headers(html);
  assert.ok(header, 'header rendered');
  assert.match(html, /data-placement="changes"/);
  assert.doesNotMatch(header, /\stitle="/, 'no native title in a modified-file header');
  assert.doesNotMatch(html, /Copy patch|sdiff-copy|role="status"/);
  assert.match(header, /<button type="button" class="sdiff-file-toggle aria-disabled:cursor-default" aria-expanded="true" aria-controls="[^"]+">/);
  assert.match(header, /<span aria-hidden="true" class="sdiff-chevron flex items-center justify-center size-\[16px\] shrink-0 text-muted-as-secondary"><svg width="16" height="16" viewBox="0 0 16 16" class="transition-transform duration-fast motion-reduce:transition-none"><path d="M3\.47 5\.47a\.75\.75 0 0 1 1\.06 0L8 8\.94l3\.47-3\.47a\.75\.75 0 1 1 1\.06 1\.06l-4 4a\.75\.75 0 0 1-1\.06 0l-4-4a\.75\.75 0 0 1 0-1\.06" fill="currentColor"><\/path><\/svg><\/span>/);
  // aa: c280f9bbb wt (FileTypeIcon) for the path, size xs, text-muted-as-secondary (not the host fileKindIcon glyph).
  assert.match(header, /<\/svg><\/span><span data-cds="Icon" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\);[^"]*" class="shrink-0 text-muted-as-secondary" aria-hidden="true">[^<]*<\/span><span class="sdiff-path /);
  assert.doesNotMatch(header, /sdiff-file-kind/);
  assert.match(header, /<span class="sdiff-path flex min-w-0 text-body text-secondary"><span dir="ltr" class="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap"><span class="max-w-full shrink-0 truncate">app\.js<\/span><span class="sdiff-path-directory flex min-w-0 text-footnote text-muted data-\[clipped\]:opacity-0"><span dir="ltr" class="flex min-w-0 overflow-hidden whitespace-nowrap"><span class="min-w-0 truncate">src<\/span><\/span><\/span><\/span><\/span>/);
  assert.match(header, /<span dir="ltr" class="sdiff-counts flex shrink-0 items-center gap-0\.5 text-body tabular-nums"><span class="text-git-added">\+1<\/span><span class="text-git-removed">−1<\/span><\/span><span aria-hidden="true" data-size="xs" class="w-control shrink-0"><\/span><\/button>/);
  assert.match(header, /<span class="sdiff-open-file absolute inset-y-0 end-0 flex items-center pe-md opacity-0 transition-opacity motion-reduce:transition-none group-hover\/diff-file:opacity-100 group-focus-within\/diff-file:opacity-100 pointer-coarse:opacity-100">/);
  assert.match(header, /<button aria-label="Open file" type="button" data-cds="Button" data-variant="ghost"[^>]*data-size="xs" data-cds-icon-only=""/);
  assert.deepEqual(labelsOf(header), []);
});

test('Changes placement labels come only from W; Renamed from uses the basename in the same directory', () => {
  const html = render([ADDED, RENAMED, MOVED, EXECUTABLE, CLEARED, SYMLINK, BINARY].join(''));
  const all = headers(html);
  assert.equal(all.length, 7);
  for (const header of all) for (const label of labelsOf(header)) assert.ok(W_ROWS.includes(label), label);
  assert.doesNotMatch(html, /New file|Deleted file|Copied from|Mode \d/);
  const [added, renamed, moved, executable, cleared, symlink, binary] = all;
  assert.deepEqual(labelsOf(added), []);
  assert.match(renamed, /<span class="sdiff-renamed flex min-w-0 shrink-\[9999\] items-baseline gap-1 overflow-hidden whitespace-nowrap text-body text-muted-as-secondary"><span class="min-w-0 truncate">Renamed from <\/span><span class="flex min-w-0 shrink-\[9999\]"><span dir="ltr" class="flex min-w-0 overflow-hidden whitespace-nowrap" title="docs\/old\.txt"><span class="min-w-0 truncate">old\.txt<\/span><\/span><\/span><\/span>/);
  assert.equal(renamed.replace(/<[^>]+>/g, '').includes('Renamed from old.txt'), true);
  // The only native title in a rename header is Ke's c784da984 title (the full previous path).
  assert.deepEqual([...renamed.matchAll(/\stitle="([^"]*)"/g)].map((match) => match[1]), ['docs/old.txt']);
  assert.match(moved, /<span class="min-w-0 truncate">a\/<\/span><span class="max-w-full shrink-0 truncate">old\.txt<\/span>/);
  assert.deepEqual(labelsOf(executable), ['Made executable']);
  assert.deepEqual(labelsOf(cleared), ['No longer executable']);
  assert.deepEqual(labelsOf(symlink), []);
  assert.deepEqual(labelsOf(binary), ['Binary file']);
  assert.match(binary, /<span data-cds="Icon" style="[^"]*" class="shrink-0 text-muted-as-secondary" aria-hidden="true">/);
  // We renders the counts unconditionally; a binary patch has 0/0 text lines (aa passes additions/deletions as is).
  assert.match(binary, /<span dir="ltr" class="sdiff-counts flex shrink-0 items-center gap-0\.5 text-body tabular-nums"><span class="text-git-added">\+0<\/span><span class="text-git-removed">−0<\/span><\/span>/);
});

// panes-diff-view-current.js:3279 hasBody = meta !== null && hunks.length > 0; aa :3717-3723 and We (disabled).
const EMPTY_ADDED = 'diff --git a/empty.txt b/empty.txt\nnew file mode 100644\nindex 0000000..e69de29\n';
const EMPTY_DELETED = 'diff --git a/void.txt b/void.txt\ndeleted file mode 100644\nindex e69de29..0000000\n';
const FALLBACK = 'diff --git a/odd.txt b/odd.txt\nindex 1..2 100644\n';
test('a Changes file without text hunks gets the aa no-body header: aria-disabled, no aria-expanded, dimmed collapsed chevron, no body', () => {
  const sections = [RENAMED, EMPTY_ADDED, EMPTY_DELETED, EXECUTABLE, SYMLINK, BINARY];
  const html = render(sections.join(''));
  const all = headers(html);
  assert.equal(all.length, sections.length);
  for (const header of all) {
    assert.match(header, /<button type="button" class="sdiff-file-toggle aria-disabled:cursor-default" aria-disabled="true">/);
    assert.doesNotMatch(header, /aria-expanded|aria-controls/);
    assert.match(header, /<span aria-hidden="true" class="sdiff-chevron flex items-center justify-center size-\[16px\] shrink-0 text-muted-as-secondary opacity-40"><svg width="16" height="16" viewBox="0 0 16 16" class="transition-transform duration-fast motion-reduce:transition-none -rotate-90 \[&amp;:where\(:root\[dir=rtl\]_:dir\(rtl\)\)\]:rotate-90">/);
  }
  assert.doesNotMatch(html, /sdiff-file-body|sdiff-metadata-only|No text hunks in this patch/);
  // The row labels still come only from W (no body repeats them), and the context menu / Open file stay available.
  assert.deepEqual(all.map(labelsOf), [[], [], [], ['Made executable'], [], ['Binary file']]);
  assert.match(all[0], /aria-label="Open file"/);
  assert.doesNotMatch(all[2], /aria-label="Open file"/, 'deleted: no Ze');
  // A file with hunks keeps the toggle; a parser fallback file keeps it too (its body is the raw patch) without counts.
  const mixed = render(MODIFIED + FALLBACK);
  const [modified, fallback] = headers(mixed);
  assert.match(modified, /aria-expanded="true" aria-controls="[^"]+">/);
  assert.doesNotMatch(modified, /opacity-40|-rotate-90|aria-disabled="/);
  assert.match(fallback, /<button type="button" class="sdiff-file-toggle aria-disabled:cursor-default" aria-expanded="true" aria-controls="[^"]+">/);
  assert.doesNotMatch(fallback, /sdiff-counts/, 'diff-model leaves a fallback file\'s counts null (unknown)');
  assert.match(mixed, /No complete text hunks or change metadata\. Showing original patch\./);
});

test('Open file and its reserve exist for a modified file and are absent for a deleted one', () => {
  const [modified] = headers(render(MODIFIED));
  const [deleted] = headers(render(DELETED));
  assert.match(modified, /aria-label="Open file"/);
  assert.match(modified, /data-size="xs" class="w-control shrink-0"/);
  assert.doesNotMatch(deleted, /aria-label="Open file"|w-control|sdiff-open-file/);
  assert.match(deleted, /−1</);
  // Without an open handler (e.g. the popout window) there is no Ze or reserve either.
  const [bare] = headers(render(MODIFIED, { fileActions: null }));
  assert.doesNotMatch(bare, /Open file|w-control/);
});

test('the inline placement (approval FileChanges) keeps its existing header', () => {
  const html = renderToStaticMarkup(React.createElement(SourceDiff, { value: ADDED }));
  assert.match(html, /data-placement="inline"/);
  assert.match(html, /<div class="sdiff-header"><button type="button" class="sdiff-file-toggle" aria-expanded="true" aria-controls="[^"]+" title="new\.txt · New file · Mode 100644">/);
  assert.match(html, /<div class="sdiff-meta">New file · Mode 100644<\/div>/);
});

// F12 "Hide whitespace changes" (gn/Tn, panes-diff-view-current.js:247-401): a re-indent-only file keeps its row
// with the W 'Whitespace only' label, its real counts and no body; a mixed file keeps only its real changes.
const INDENT_ONLY = 'diff --git a/indent.js b/indent.js\nindex 1111111..2222222 100644\n--- a/indent.js\n+++ b/indent.js\n@@ -1,3 +1,3 @@\n function a() {\n-return 1;\n+  return 1;\n }\n';
const MIXED_WS = 'diff --git a/mixed.js b/mixed.js\nindex 3333333..4444444 100644\n--- a/mixed.js\n+++ b/mixed.js\n@@ -1,3 +1,3 @@\n-  one\n-two\n+    one\n+TWO\n tail\n';
test('hideWhitespace: an indent-only file shows the "Whitespace only" label with no body; real changes stay', () => {
  const html = render(INDENT_ONLY + MIXED_WS, { hideWhitespace: true });
  const [indent, mixed] = headers(html);
  assert.deepEqual(labelsOf(indent), ['Whitespace only']);
  assert.match(indent, /<button type="button" class="sdiff-file-toggle aria-disabled:cursor-default" aria-disabled="true">/);
  assert.match(indent, /<span class="text-git-added">\+1<\/span><span class="text-git-removed">−1<\/span>/, 'counts stay the file\'s real +/-');
  assert.doesNotMatch(html, /return 1;/, 'the indent-only body is gone');
  assert.deepEqual(labelsOf(mixed), []);
  assert.match(html, /TWO/); assert.doesNotMatch(html, /data-kind="removed"[^>]*>[\s\S]{0,400}?one</);
  // Off (the default), both files render their whitespace edits.
  const shown = render(INDENT_ONLY + MIXED_WS);
  assert.deepEqual(headers(shown).map(labelsOf), [[], []]);
  assert.match(shown, /return 1;/);
  assert.equal(headerTooltip({ path: 'indent.js', whitespaceOnly: true }), 'indent.js (whitespace only)');
});
