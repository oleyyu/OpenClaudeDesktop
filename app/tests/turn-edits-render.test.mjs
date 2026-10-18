// The Turn edits card (2.42304.0 c96d752d0 N2e, generated) and the Changes file rows. Node-only SSR of the actual components.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

let server, SourceTurnEdits, SourceDiff;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceTurnEdits } = await server.ssrLoadModule('/src/source-turn-edits.jsx'));
  ({ SourceDiff } = await server.ssrLoadModule('/src/source-diff.jsx'));
});
after(async () => { await server?.close(); });

// R3b-transcript step 2 (toolcards-06): the card is now the generated 2.42304.0 original (c96d752d0 N2e / M2e) in its
// 'See all' form (D10: claudeai_cc_epitaxy_session_presets_main on). Controlled clicks and the row stops are covered by
// tests/r3b-transcript-turn-edits.test.mjs.
const file = (path, additions, deletions) => ({ path, additions, deletions, calls: [{ id: `call:${path}` }] });
const host = { onUndo() {}, canViewChanges: true, fileInChanges: () => true, onRevealInChanges() {}, onOpenChanges() {}, onOpenFile() {} };
const render = (props) => renderToStaticMarkup(React.createElement(SourceTurnEdits, { turnId: 't1', sessionKey: 's1', ...props }));
const text = (html) => html.replace(/<[^>]+>/g, '');
const count = (html, needle) => html.split(needle).length - 1;
const ROW = 'class="relative -mx-pad-xs flex min-w-0 items-center gap-sm px-md"';

test('several files: the See all form (title row with Undo over a divider, footnote rows without chevrons, See all + totals)', () => {
  const files = [file('/w/src/a/index.js', 2, 1), file('/w/src/b/index.js', 1, 0), file('/w/c.js', 0, 3)];
  const html = render({ edits: { files, additions: 3, deletions: 4 }, ...host });
  assert.match(html, /^<div class="source-message" data-turn-edits="t1" data-find-omitted=""><div class="mt-pad-xs epitaxy-summary-card-control-text flex w-full select-text flex-col gap-1 rounded-card px-md py-xs shadow-\[inset_0_0_0_1px_var\(--cds-border\)\]">/);
  assert.match(html, /<div class="flex h-control min-w-0 items-center justify-between gap-sm px-xs"><span class="min-w-0 truncate text-primary">Edited 3 files<\/span><button[^>]*class="[^"]*me-outset text-muted hover:text-secondary text-footnote shrink-0"/);
  assert.match(html, /<div aria-hidden="true" class="-mx-\[calc\(var\(--cds-pad-md\)-1px\)\] h-px shrink-0 bg-alpha-2"><\/div><ul role="list" class="flex w-full min-w-0 flex-col">/);
  assert.equal(count(html, ROW), 4, 'three file rows and the See all row');
  assert.ok(!html.includes('ChangesPlusMinus') && !html.includes('rotate-90'), 'no classic header row, no chevrons');
  assert.match(html, /index\.js<span class="ms-xs text-footnote text-muted-as-secondary"><span class="sr-only">, <\/span>a<\/span>/);
  assert.match(html, /data-file-ref="\/w\/src\/a\/index\.js"/);
  assert.equal(count(html, 'class="flex shrink-0 items-center gap-0.5 text-footnote tabular-nums"'), 4);
  // The See all row carries the turn's totals (from the files), with U+2212.
  assert.match(html, /<span class="min-w-0 truncate text-primary">See all<\/span><\/span><\/button><span class="pointer-events-none relative flex shrink-0 items-center gap-1"><span class="flex items-center gap-2\.5"><span class="flex shrink-0 items-center gap-0\.5 text-footnote tabular-nums"><span class="text-git-added">\+3<\/span><span class="text-git-removed">−4<\/span>/);
  assert.ok(!/Show \d+ more|View changes/.test(text(html)));
});

test('more than three files: three rows, then the disclosure row that reads See all with the totals', () => {
  const files = ['a', 'b', 'c', 'd', 'e'].map((name) => file(`/w/${name}.js`, 1, 1));
  const html = render({ edits: { files, additions: 5, deletions: 5 }, ...host });
  assert.equal(count(html, ROW), 4, 'three file rows and the disclosure row');
  assert.ok(!html.includes('data-file-ref="/w/d.js"'), 'the fourth file waits behind See all');
  assert.match(html, /<button type="button" aria-expanded="false" class="flex min-h-7[^"]*"><span class="relative flex min-w-0 items-center gap-xs"><span class="min-w-0 truncate text-primary">See all<\/span>/);
  assert.match(text(html), /See all\+5−5$/);
});

test('one file: its row is the card (no title row), with a base Undo; without Undo, Files opener or Changes it is static', () => {
  const html = render({ edits: { files: [file('/w/a.js', 3, 2)], additions: 3, deletions: 2 }, ...host });
  assert.ok(!/Edited/.test(text(html)));
  assert.equal(count(html, ROW), 1);
  assert.match(html, /<span class="contents" data-file-ref="\/w\/a\.js"><button type="button" class="flex min-h-7 min-w-0 grow items-center/);
  assert.match(text(html), /a\.jsUndo\+3−2/, 'v0: the action (Undo) comes before the counts');
  assert.ok(!html.includes('me-outset'), 'Undo is flush only in the title row');
  const plain = render({ edits: { files: [file('/w/a.js', 3, 2)], additions: 3, deletions: 2 } });
  assert.match(plain, /<span class="contents" data-file-ref="\/w\/a\.js"><span class="flex min-h-7 min-w-0 grow items-center before:absolute/);
  assert.ok(!/Undo/.test(text(plain)) && !plain.includes('<button'));
  assert.equal(render({ edits: { files: [] } }), '');
});

test('Changed files rows: draggable with a drag target, not for a removed file', () => {
  const patch = 'diff --git a/src/app.js b/src/app.js\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1 +1 @@\n-a\n+b\n'
    + 'diff --git a/old.txt b/old.txt\ndeleted file mode 100644\n--- a/old.txt\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n';
  const html = renderToStaticMarkup(React.createElement(SourceDiff, { value: patch, placement: 'changes',
    fileActions: { root: '/repo', onCopy() {}, onAttachFile() {}, onDragFiles() {} },
    fileList: { shown: true, width: 240, tree: false, groupByKind: false, onShownChange() {}, onWidthChange() {}, onCanFitChange() {} } }));
  const rows = html.match(/<button[^>]*data-diff-tree-row=""[^>]*>/g) || [];
  assert.equal(rows.length, 2, html.slice(0, 400));
  assert.equal(rows.filter((row) => row.includes('draggable="true"')).length, 1, 'only the existing file drags');
});
