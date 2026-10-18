// B14 D4/D5: the Changes pane renders line comments as inline cards (c44d00c7f ha/ga) under their row, with the
// Ca gutter "+" ('Add comment on this line') and the yo body menu trigger. Node-only SSR of the actual component.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const values = new Map();
const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let server, SourceDiff, DIFF_COMMENTS_PREFIX;
before(async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) } });
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceDiff } = await server.ssrLoadModule('/src/source-diff.jsx'));
  ({ DIFF_COMMENTS_PREFIX } = await server.ssrLoadModule('/src/diff-comments-model.mjs'));
});
after(async () => {
  await server?.close();
  if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
});

const PATCH = 'diff --git a/src/app.js b/src/app.js\nindex 1..2 100644\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1,3 +1,3 @@\n keep\n-export const answer = 1;\n+export const answer = 2;\n tail\n';
const render = (props) => renderToStaticMarkup(React.createElement(SourceDiff, { value: PATCH, placement: 'changes', fileActions: { root: '/repo', onCopy() {}, onAttachFile() {} }, ...props }));
const seed = (scope, entries) => values.set(`${DIFF_COMMENTS_PREFIX}${scope}\0src/app.js`, JSON.stringify(entries));

test('rows say which side and line they comment on; the gutter "+" reads Add comment on this line', () => {
  const html = render({ commentScope: '["s1","/repo"]' });
  assert.equal((html.match(/aria-label="Add comment on this line"/g) ?? []).length, 4);
  assert.doesNotMatch(html, /Add a comment on this line|Add to prompt/);
  assert.match(html, /class="sdiff-row removed"[^>]*data-comment-side="deletions" data-comment-line="2" data-column="unified"/);
  assert.match(html, /class="sdiff-row added"[^>]*data-comment-side="additions" data-comment-line="2"/);
  assert.match(html, /class="sdiff-row context"[^>]*data-comment-side="additions" data-comment-line="3"/);
  assert.match(html, /class="sdiff-file-body"[^>]*data-diff-body-menu-trigger=""/);
  const split = render({ commentScope: '["s1","/repo"]', layout: 'split' });
  assert.match(split, /data-side="before"[^>]*data-comment-side="deletions" data-comment-line="1" data-column="before"/, 'the left column comments on the old file');
});

test('without a comment scope (the inline approval placement, or no session) there are no comment controls', () => {
  // yo menuEnabled is independent of comments: a Changes body with no session keeps Attach as context / Copy.
  const noSession = render({});
  assert.doesNotMatch(noSession, /sdiff-gutter-add|data-commentable/);
  assert.match(noSession, /class="sdiff-file-body"[^>]*data-diff-body-menu-trigger=""/);
  assert.match(noSession, /class="sdiff-row removed"[^>]*data-comment-side="deletions" data-comment-line="2"/, 'rows still name their side/line for the menu');
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(SourceDiff, { value: PATCH, commentScope: 'x' })), /sdiff-gutter-add|data-comment-line|data-diff-body-menu-trigger/);
});

test('an old-file comment ending on an unchanged line sits under that row in both layouts', () => {
  // A split left-column drag from the removed line to the unchanged line after it touches a change, so it stays on
  // the old file (Vo) and ends on old line 3, a context row.
  seed('scope-c', [{ side: 'deletions', start: 2, end: 3, code: 'export const answer = 1;\ntail', body: 'both', savedBody: 'both' }]);
  for (const layout of ['unified', 'split']) {
    const html = render({ commentScope: 'scope-c', layout });
    const card = html.indexOf('data-comment-key="deletions:3"');
    assert.ok(card > 0, `${layout}: the card renders`);
    assert.ok(html.lastIndexOf('class="sdiff-row context', card) > html.indexOf('data-comment-line="2"'), `${layout}: under the context row`);
    assert.doesNotMatch(html, /Outdated/);
  }
});

test('saved, draft and outdated comments render as cards under their row', () => {
  seed('scope-a', [
    { side: 'deletions', start: 2, end: 2, code: 'export const answer = 1;', body: 'why?', savedBody: 'why?' },
    { side: 'additions', start: 1, end: 2, code: 'keep\nexport const answer = 3;', body: 'stale', savedBody: 'stale' },
    { side: 'additions', start: 3, end: 3, code: 'tail', body: '' },
  ]);
  const html = render({ commentScope: 'scope-a' });
  const cards = [...html.matchAll(/data-comment-key="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(cards, ['deletions:2', 'additions:2', 'additions:3'], 'each card follows its row, removed line first');
  const removedRow = html.indexOf('data-comment-side="deletions" data-comment-line="2"'), removedCard = html.indexOf('data-comment-key="deletions:2"');
  const addedRow = html.indexOf('data-comment-side="additions" data-comment-line="2"');
  assert.ok(removedRow < removedCard && removedCard < addedRow);
  assert.match(html, /data-comment-key="additions:2"[\s\S]*?Lines 1–2<span class="sfv-comment-badge"[^>]*>Outdated</);
  assert.doesNotMatch(html.slice(removedCard, addedRow), /Outdated/);
  assert.match(html, /data-comment-key="additions:3"[\s\S]*?<textarea aria-label="Comment on line 3" placeholder="Tell Claude what to change"/);
  assert.match(html, /aria-label="Edit comment"/);
});

test('a comment on a line the diff no longer shows moves to the last row (outdated when the file is gone)', () => {
  seed('scope-b', [{ side: 'additions', start: 40, end: 40, code: 'x', body: 'far', savedBody: 'far' }]);
  const html = render({ commentScope: 'scope-b' });
  assert.ok(html.indexOf('data-comment-line="3"') < html.indexOf('data-comment-key="additions:40"'));
  assert.doesNotMatch(html, /Outdated/, 'a partial patch: the line may still exist past the last hunk');
});

// FT-10 (diffgit-16/17, 2.42304.0): the card's field and the chip use the Escape-repeat suppression (controlled events in
// tests/files-changes-current.test.mjs); the body menu takes c82eca2bd Be as its Popup onContextMenu.
test('the comment field and the selection chip are wired to the 2.42304.0 Escape handling; the body menu blocks the native menu', async () => {
  const fsm = await import('node:fs');
  const read = (file) => fsm.readFileSync(path.resolve(import.meta.dirname, '..', file), 'utf8');
  const card = read('src/source-file-comments.jsx'), body = read('src/source-diff-comments.jsx');
  assert.match(card, /onKeyDown=\{event=>commentFieldKeyDown\(event,\{save,cancel\}\)\}/);
  assert.match(card, /else if\(event\.key==='Escape'\)\{event\.preventDefault\(\);const view=ownerWindow\(event\.currentTarget\);if\(view\)suppressEscapeRepeat\(view\);cancel\(\);\}/);
  assert.match(body, /const key = selectionChipEscape\(doc, hide\);/);
  assert.match(body, /onContextMenu=\{preventContextMenu\}/);
  const html = render({ commentScope: 'scope-wiring' });
  assert.match(html, /class="sdiff-file-body"[^>]*data-diff-body-menu-trigger=""/);
});
