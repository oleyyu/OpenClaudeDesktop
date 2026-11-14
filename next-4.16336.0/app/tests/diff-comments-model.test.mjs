// B14 D4/D5: Changes-pane inline comments (c44d00c7f Ho/Vo/la/pa/Qa, caec4a2d4 In, cf56e4ee1 t).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { parseUnifiedDiff } from '../src/diff-model.js';
import { DIFF_COMMENTS_IMPORTED_PREFIX, DIFF_COMMENTS_PREFIX, addCommentLabel, anchorDiffSpan, createAnnotationCommentsStore, diffCommentAttachmentKey, diffCommentKey,
  diffCommentOutdated, diffCommentSession, diffLineIndex, diffSelectionSpan, diffSpanText, importLegacyDiffComments, legacyDiffCommentKeys, placeDiffComment,
  rowCommentTarget, selectionChipPosition } from '../src/diff-comments-model.mjs';
import { serializeLineComment } from '../src/inline-comments.mjs';
import { addSnippet, makeSnippet, removeSnippetByKey, snippetText } from '../src/composer-attachments-model.mjs';

const patch = [
  'diff --git a/src/a.js b/src/a.js', '--- a/src/a.js', '+++ b/src/a.js',
  '@@ -1,6 +1,7 @@', ' one', ' two', '-three', '+THREE', '+three-b', ' four', ' five', ' six',
  '@@ -20,3 +21,3 @@', ' twenty', '-old21', '+new22', ' twentytwo', '',
].join('\n');
const file = () => parseUnifiedDiff(patch).files[0];
// W14-code r7 (r7pa-03): the comment store is the official cc8941b7b F (with P, its body texts), shared with the pierre
// body; the host card store (createAnnotationCommentsStore) only reads and writes it. Loaded through vite (the generated
// layer imports JSX adapters); each fixture uses its own session id.
let server, F, P;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom', logLevel: 'error' });
  ({ useDiffAnnotationStore: F, P } = await server.ssrLoadModule('/src/generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs'));
});
after(async () => { await server?.close(); });
let sessions = 0;
const fixture = () => {
  const sessionId = `model-${++sessions}`;
  return { sessionId, store: createAnnotationCommentsStore({ sessionId, path: 'src/a.js', store: F, bodies: P }) };
};

test('cards are keyed by side and end line (Je), one per key; a saved comment reopens for editing', () => {
  assert.equal(diffCommentKey('additions', 4), 'additions:4');
  const { store, sessionId } = fixture();
  assert.equal(store.create('additions', 5, 3, 'a\r\nb\n'), 'additions:5');
  const [entry] = store.getSnapshot().entries;
  assert.deepEqual([entry.start, entry.end, entry.code, store.getSnapshot().active], [3, 5, 'a\nb', 'additions:5']);
  // The draft is F's (Ho openDraft → setDraft), keyed side:endLine, and is the session's active card.
  assert.deepEqual(F.getState().draftsBySession[sessionId]['src/a.js']['additions:5'], { filePath: 'src/a.js', side: 'additions', startLine: 3, endLine: 5, snippet: 'a\nb' });
  assert.equal(store.create('deletions', 5, 5, 'x'), 'deletions:5', 'the other side of the same line is its own card');
  assert.deepEqual(store.getSnapshot().entries.map((e) => e.id), ['deletions:5', 'additions:5']);
  store.edit('additions:5', ' fix this ');
  assert.equal(P.getState().bodiesBySession[sessionId]['src/a.js']['additions:5'], ' fix this ');
  assert.equal(store.create('additions', 4, 5, 'b'), 'additions:5', 'a new range at the key replaces the draft range');
  assert.deepEqual([store.getSnapshot().entries[1].start, store.getSnapshot().entries[1].body], [4, ' fix this ']);
  assert.equal(store.create('additions', 5, 5, 'b'), 'additions:5', 'a single line reopens the card at its key');
  assert.equal(store.getSnapshot().entries[1].start, 4);
  const saved = store.save('additions:5');
  assert.equal(saved.savedBody, 'fix this');
  assert.equal(store.getSnapshot().active, null);
  // c82eca2bd: a saved draft is addAnnotation({...draft, body}) + clearDraft; the snippet key rides on its id.
  const [annotation] = F.getState().annotationsBySession[sessionId]['src/a.js'];
  assert.deepEqual([annotation.body, annotation.startLine, annotation.endLine, annotation.snippet, saved.annotationId], ['fix this', 4, 5, 'b', annotation.id]);
  assert.equal(F.getState().draftsBySession[sessionId]['src/a.js']['additions:5'], undefined);
  store.create('additions', 1, 5, 'other');
  assert.deepEqual([store.getSnapshot().active, store.getSnapshot().entries[1].start], ['additions:5', 4], 'a saved comment keeps its range');
  store.edit('additions:5', 'changed');
  assert.equal(P.getState().editBodiesBySession[sessionId][annotation.id], 'changed');
  store.cancel('additions:5');
  assert.equal(store.getSnapshot().entries[1].body, 'fix this');
  store.cancel('deletions:5');
  assert.deepEqual(store.getSnapshot().entries.map((e) => e.id), ['additions:5'], 'cancelling an unsaved draft drops it');
  // An edit saves through updateAnnotation; delete is removeAnnotation.
  store.activate('additions:5'); store.edit('additions:5', 'again'); store.save('additions:5');
  assert.equal(F.getState().annotationsBySession[sessionId]['src/a.js'][0].body, 'again');
  store.remove('additions:5');
  assert.deepEqual(F.getState().annotationsBySession[sessionId]['src/a.js'], []);
});

test('the pierre body and the host rows read one store; release drops abandoned empty drafts; legacy comments import once', () => {
  const { store, sessionId } = fixture();
  // A comment the official card wrote (cc8941b7b addAnnotation) is a host card too, and a host one is F's.
  F.getState().addAnnotation(sessionId, { filePath: 'src/a.js', side: 'deletions', startLine: 3, endLine: 3, snippet: 'three', body: 'from pierre' });
  assert.deepEqual(store.getSnapshot().entries.map((e) => [e.id, e.savedBody, e.code]), [['deletions:3', 'from pierre', 'three']]);
  store.create('additions', 2, 2, 'two'); store.edit('additions:2', 'keep');
  store.create('additions', 4, 4, 'four');
  store.release();
  assert.deepEqual(store.getSnapshot().entries.map((e) => e.id), ['additions:2', 'deletions:3']);
  assert.equal(store.getSnapshot().active, null);
  // PR, Files-pane and finding annotations are not Changes line comments.
  F.getState().addAnnotation(sessionId, { filePath: 'src/a.js', side: 'additions', startLine: 9, endLine: 9, body: 'pr', source: 'pr' });
  assert.equal(store.getSnapshot().entries.length, 2);
  assert.equal(createAnnotationCommentsStore({ sessionId, path: 'src/a.js', store: F, bodies: P }).create('middle', 1, 1), null);
  // The scope → session (source-session.jsx commentScope JSON [sessionId, cwd]).
  assert.equal(diffCommentSession('["s1","/repo"]'), 's1');
  assert.equal(diffCommentSession('scope-a'), 'scope-a');
  // Pre-r7 host comments (localStorage per scope and file) are imported once and kept under the imported prefix.
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k),
    get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null };
  const legacy = `${DIFF_COMMENTS_PREFIX}["legacy-1","/repo"]\0src/b.js`;
  const raw = JSON.stringify([{ side: 'additions', start: 1, end: 2, code: 'x', body: 'old', savedBody: 'old' }, { side: 'deletions', start: 4, end: 4, code: null, body: 'half' }]);
  values.set(legacy, raw); values.set('other', '1');
  assert.deepEqual(legacyDiffCommentKeys(storage), [legacy]);
  assert.equal(importLegacyDiffComments({ storage, store: F, bodies: P, key: legacy }), 2);
  const imported = createAnnotationCommentsStore({ sessionId: 'legacy-1', path: 'src/b.js', store: F, bodies: P }).getSnapshot();
  assert.deepEqual(imported.entries.map((e) => [e.id, e.body, e.savedBody]), [['additions:2', 'old', 'old'], ['deletions:4', 'half', undefined]]);
  assert.equal(imported.active, null, 'importing does not open a card');
  assert.equal(values.get(legacy), undefined);
  assert.equal(values.get(`${DIFF_COMMENTS_IMPORTED_PREFIX}["legacy-1","/repo"]\0src/b.js`), raw);
  values.set(legacy, raw);
  assert.equal(importLegacyDiffComments({ storage, store: F, bodies: P, key: legacy }), 0, 'already there: not twice');
});

test('rows comment on the old file only when removed (or in the split view\'s left column)', () => {
  assert.deepEqual(rowCommentTarget({ type: 'removed', oldLine: 3, newLine: null }), { side: 'deletions', line: 3 });
  assert.deepEqual(rowCommentTarget({ type: 'context', oldLine: 4, newLine: 5 }), { side: 'additions', line: 5 });
  assert.deepEqual(rowCommentTarget({ type: 'context', oldLine: 4, newLine: 5 }, 'before'), { side: 'deletions', line: 4 });
  assert.deepEqual(rowCommentTarget({ type: 'added', oldLine: null, newLine: 3 }, 'after'), { side: 'additions', line: 3 });
  assert.equal(rowCommentTarget({ type: 'note', text: 'x' }), null);
});

test('Vo: an old-file span over unchanged lines moves to the new file; one touching a change stays', () => {
  const { hunks } = file();
  assert.deepEqual(anchorDiffSpan(hunks, 1, 2, 'deletions'), { start: 1, end: 2, side: 'additions' });
  assert.deepEqual(anchorDiffSpan(hunks, 5, 4, 'deletions'), { start: 5, end: 6, side: 'additions' }, 'after +2/-1 the offset is +1');
  assert.deepEqual(anchorDiffSpan(hunks, 3, 3, 'deletions'), { start: 3, end: 3, side: 'deletions' });
  assert.deepEqual(anchorDiffSpan(hunks, 2, 4, 'deletions'), { start: 2, end: 4, side: 'deletions' });
  assert.deepEqual(anchorDiffSpan(hunks, 10, 12, 'deletions'), { start: 11, end: 13, side: 'additions' }, 'between hunks');
  assert.deepEqual(anchorDiffSpan(hunks, 21, 21, 'deletions'), { start: 21, end: 21, side: 'deletions' });
  assert.deepEqual(anchorDiffSpan(hunks, 22, 22, 'deletions'), { start: 23, end: 23, side: 'additions' }, 'hunk 2 is -1/+1, so the +1 of hunk 1 stays');
  assert.deepEqual(anchorDiffSpan(hunks, 7, 7, 'additions'), { start: 7, end: 7, side: 'additions' });
  // Vo isPartial: only a span inside one hunk's old-file range is mapped when just the patch is known.
  assert.deepEqual(anchorDiffSpan(hunks, 5, 4, 'deletions', { partial: true }), { start: 5, end: 6, side: 'additions' });
  assert.deepEqual(anchorDiffSpan(hunks, 10, 12, 'deletions', { partial: true }), { start: 10, end: 12, side: 'deletions' });
  assert.deepEqual(anchorDiffSpan(hunks, 6, 20, 'deletions', { partial: true }), { start: 6, end: 20, side: 'deletions' }, 'across two hunks');
  const pure = parseUnifiedDiff(['diff --git a/b b/b', '--- a/b', '+++ b/b', '@@ -1,2 +1,3 @@', ' a', '+inserted', ' b', ''].join('\n')).files[0].hunks;
  assert.deepEqual(anchorDiffSpan(pure, 1, 2, 'deletions'), { start: 1, end: 2, side: 'deletions' }, 'a span across an insertion stays on the old file');
  assert.deepEqual(anchorDiffSpan(pure, 2, 2, 'deletions'), { start: 3, end: 3, side: 'additions' });
});

test('snippets, outdated (la) and displaced (pa/da) comments come from the shown rows', () => {
  const index = diffLineIndex(file().hunks);
  assert.equal(diffSpanText(index, 'additions', 3, 4), 'THREE\nthree-b');
  assert.equal(diffSpanText(index, 'deletions', 3, 3), 'three');
  assert.equal(diffSpanText(index, 'additions', 9, 10), undefined, 'a line that is not shown');
  assert.equal(diffCommentOutdated(index, { side: 'additions', start: 3, end: 4, code: '  THREE\nthree-b  ' }), false, 'whitespace at the ends is ignored');
  assert.equal(diffCommentOutdated(index, { side: 'additions', start: 3, end: 4, code: 'three\nthree-b' }), true);
  assert.equal(diffCommentOutdated(index, { side: 'additions', start: 9, end: 9, code: 'gone' }), false, 'unknown lines are not outdated');
  assert.deepEqual(placeDiffComment(index, { side: 'additions', end: 5 }), { side: 'additions', line: 5, displaced: false, lineGone: false });
  assert.deepEqual(placeDiffComment(index, { side: 'additions', end: 40 }), { side: 'additions', line: 23, displaced: true, lineGone: false });
  assert.deepEqual(placeDiffComment(index, { side: 'deletions', end: 40 }, { complete: true }), { side: 'deletions', line: 22, displaced: true, lineGone: true });
});

test('Qa: a selection comments on its new-file rows, else its old-file rows, never across split columns', () => {
  assert.deepEqual(diffSelectionSpan([{ side: 'deletions', line: 3, text: 'three', column: 'unified' }, { side: 'additions', line: 4, text: 'three-b\n', column: 'unified' }, { side: 'additions', line: 3, text: 'THREE', column: 'unified' }]),
    { startLine: 3, endLine: 4, side: 'additions', lineTexts: ['THREE', 'three-b'] });
  assert.deepEqual(diffSelectionSpan([{ side: 'deletions', line: 3, text: 'three', column: 'before' }]), { startLine: 3, endLine: 3, side: 'deletions', lineTexts: ['three'] });
  assert.equal(diffSelectionSpan([{ side: 'deletions', line: 3, column: 'before' }, { side: 'additions', line: 3, column: 'after' }]), null);
  assert.equal(diffSelectionSpan([]), null);
});

test('chip placement, aria labels and the attachment a saved comment rides on', () => {
  assert.deepEqual(selectionChipPosition({ clientX: 10, clientY: 300, left: 0, width: 600, scrollerTop: 100 }), { x: 72, y: 300, flipBelow: false });
  assert.deepEqual(selectionChipPosition({ clientX: 590, clientY: 120, left: 0, width: 600, scrollerTop: 100 }), { x: 528, y: 120, flipBelow: true });
  assert.equal(addCommentLabel({ start: 4, end: 4 }), 'Add comment on line 4');
  assert.equal(addCommentLabel({ start: 2, end: 5 }), 'Add comment on lines 2–5');
  const key = diffCommentAttachmentKey('["s","/w"]', 'src/a.js', 'deletions:3');
  const text = serializeLineComment({ path: 'src/a.js', start: 3, end: 3, side: 'deletions', code: 'three', text: 'why removed?' });
  assert.match(text, /^In src\/a\.js, removed line 3:\n> three\nwhy removed\?$/);
  assert.match(serializeLineComment({ path: 'src/a.js', start: 2, end: 4, side: 'additions', code: 'a', text: 'x' }), /^In src\/a\.js, lines 2–4:/);
  let attachments = addSnippet([], makeSnippet(text, { key }));
  attachments = addSnippet(attachments, makeSnippet(text.replace('why', 'how'), { key }));
  assert.equal(attachments.length, 1);
  assert.match(snippetText(attachments), /how removed/);
  assert.deepEqual(removeSnippetByKey(attachments, key), []);
});
