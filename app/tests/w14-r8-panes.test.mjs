// W14-code r8 panes (r8pa-01 / r8pa-02 / r8pa-03): SSR and model checks against the 3.6556.2 originals (parsed, never run).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const V1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const chunk = (prefix) => fs.readFileSync(path.join(V1, fs.readdirSync(V1).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const h = React.createElement;
// A client-side hook run for one hook (SSR reads a zustand store's initial state, so F's hooks need a client snapshot):
// cursor slots, effects flushed after each pass, cleanups on unmount; React Compiler's useMemoCache via withMemoCache.
function hookHarness(hook) {
  const slots = [], effects = [];
  let index = 0, result;
  const same = (a, b) => !!a && !!b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const effect = (fn, deps) => { const at = index++; if (!(at in slots) || !same(slots[at].deps, deps)) effects.push({ at, fn, deps }); };
  const hooks = withMemoCache({
    useState: (initial) => { const at = index++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial; return [slots[at], (v) => { slots[at] = typeof v === 'function' ? v(slots[at]) : v; }]; },
    useRef: (initial) => { const at = index++; return (slots[at] ??= { current: initial }); },
    useMemo: (fn, deps) => { const at = index++; if (!(at in slots) || !same(slots[at].deps, deps)) slots[at] = { value: fn(), deps }; return slots[at].value; },
    useCallback: (fn, deps) => { const at = index++; if (!(at in slots) || !same(slots[at].deps, deps)) slots[at] = { value: fn, deps }; return slots[at].value; },
    useSyncExternalStore: (subscribe, getSnapshot) => { index++; return getSnapshot(); },
    useId: () => { const at = index++; return (slots[at] ??= `:h${at}:`); },
    useDebugValue: () => {}, useEffect: effect, useLayoutEffect: effect, useInsertionEffect: effect,
    useContext: (context) => context._currentValue,
  });
  const render = (props) => {
    index = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { result = hook(props); } finally { internal.H = old; }
    while (effects.length) { const { at, fn, deps } = effects.shift(); slots[at]?.cleanup?.(); const cleanup = fn(); slots[at] = { deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined }; }
    return result;
  };
  const unmount = () => { for (const slot of slots) slot?.cleanup?.(); };
  return { render, unmount };
}
let server, Search, FileComments, DiffComments, Store, Snippets;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Search = await server.ssrLoadModule('/src/source-files-search.jsx');
  FileComments = await server.ssrLoadModule('/src/source-file-comments.jsx');
  DiffComments = await server.ssrLoadModule('/src/source-diff-comments.jsx');
  Store = await server.ssrLoadModule('/src/generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs');
  Snippets = await server.ssrLoadModule('/src/composer-attachments-model.mjs');
});
after(() => server?.close());

// ---- r8pa-01: content matches (cccc2cf0a zT / BT) ------------------------------------------------------------------------
test('r8pa-01: a content match is BT — line number, ltr snippet, gl marks — and the more row is zT\'s', () => {
  const official = chunk('cccc2cf0a-');
  for (const literal of ['shrink-0 min-w-[2.5ch] text-footnote text-muted-as-secondary tabular-nums text-end', 'flex min-w-0 overflow-hidden whitespace-pre text-code text-primary',
    'min-w-0 overflow-hidden text-ellipsis', 'max-w-full shrink-0 overflow-hidden text-ellipsis', 'min-w-[2ch] shrink-[9999] overflow-hidden text-ellipsis',
    'flex items-center gap-1 h-control app-list-row pe-md text-footnote text-muted-as-secondary select-none'])
    assert.ok(official.includes(literal), literal);
  assert.ok(official.includes('D=R(de(),dw,ol)),(O=el(1))') || official.includes('D=R(de(),dw,ol),O=el(1)'), 'BT row at el(1)');
  const html = renderToStaticMarkup(h(Search.ContentSnippet, { entry: { path: 'src/a.ts', line: 12, column: 7, preview: '  const needle = needle + 1;', ranges: [[8, 14], [17, 23]] } }));
  assert.equal(html, '<span class="shrink-0 min-w-[2.5ch] text-footnote text-muted-as-secondary tabular-nums text-end">12</span>'
    + '<span dir="ltr" class="flex min-w-0 overflow-hidden whitespace-pre text-code text-primary">'
    // gT: the lead gives its trailing whitespace to the hit.
    + '<span dir="rtl" class="min-w-0 overflow-hidden text-ellipsis"><span dir="ltr">const</span></span>'
    + '<span class="max-w-full shrink-0 overflow-hidden text-ellipsis"><span> </span><mark class="bg-accent text-inherit rounded-sm">needle</mark></span>'
    + '<span class="min-w-[2ch] shrink-[9999] overflow-hidden text-ellipsis"><span> = </span><mark class="bg-accent text-inherit rounded-sm">needle</mark><span> + 1;</span></span></span>');
  const search = read('src/source-files-search.jsx'), css = read('src/source-files-search.css');
  assert.match(search, /aria-hidden="true" className=\{CONTENT_MORE_CLASS\} style=\{treeIndent\(1\)\}>\s*<span className="shrink-0 min-w-\[2\.5ch\]" \/><span className="min-w-0 truncate">\{t\('More matches in this file\.'\)\}<\/span>/);
  assert.match(search, /style=\{treeIndent\(treeRow \? 0 : 1\)\}/);
  assert.doesNotMatch(css, /\.sfs-(result|content)-/);
  assert.doesNotMatch(read('src/style.css'), /sfs-result-row|sfv-comment-actions/);
});

// ---- r8pa-03: the plan pane's muted text -----------------------------------------------------------------------------------
test('r8pa-03: the hint, the Tasks heading, the pending glyph and the popover icon buttons are text-muted-as-secondary', () => {
  assert.ok(chunk('ca7d7d34d-').includes('e(s,"text-muted-as-secondary",i)'));
  assert.ok(chunk('cb6930dae-').includes('name:"Placeholder",size:"sm",className:"text-muted-as-secondary"'));
  assert.ok(chunk('c82eca2bd-').includes('De="rounded-sm p-0.75 text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary disabled:opacity-40"'));
  const pane = read('src/source-plan-pane.jsx'), list = read('src/source-plan-checklist.jsx');
  assert.match(pane, /className="mb-\[var\(--chat-item-gap\)\] flex items-center gap-1 text-caption text-muted-as-secondary" data-comments-enabled/);
  assert.match(pane, /<CdsIcon name="ChatSimple" size="xs" \/>/);
  assert.match(pane, /"text-caption-medium uppercase tracking-wide text-muted-as-secondary mb-1\.25"/);
  assert.match(pane, /const ICON_BUTTON = "rounded-sm p-0\.75 text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary disabled:opacity-40";/);
  // gen-final-8 (panes review low #2): the CDS Icon itself, sm + aria-hidden, as cb6930dae Ta.
  assert.match(list, /<CdsIcon name="Placeholder" size="sm" className="text-muted-as-secondary" aria-hidden \/>/);
  assert.doesNotMatch(pane, /spp-comment-hint/);
});

// ---- r8pa-02: the official comment card on the host rows and in the Files editor -------------------------------------------
test('r8pa-02: no host card is left; Changes rows draw c44d00c7f Fc, the Files editor c82eca2bd st', () => {
  assert.doesNotMatch(read('src/source-file-comments.jsx'), /function FileCommentCard|className="sfv-comment/);
  assert.ok(!fs.existsSync(path.join(app, 'src/file-comments-store.mjs')));
  assert.doesNotMatch(read('src/source-file-viewer.css'), /\.sfv-comment-/);
  assert.match(read('src/source-diff-comments.jsx'), /<PierreChangesCommentCard sessionId=\{sessionId\} filePath=\{file\.path\} cardKey=\{diffCommentKey\(entry\.side, entry\.end\)\} instanceId=\{instanceId\}/);
  assert.match(read('src/source-file-editor.jsx'), /className="font-sans whitespace-normal" data-file-comment-card="" onContextMenu=\{stopEvent\} onTouchStart=\{stopEvent\}>\{comments\.renderComment\(card\.id\)\}/);
  const official = chunk('cd2efac6e-');
  assert.ok(official.includes('canPostToGitHub:!1'));
});

test('r8pa-02 bridge: a saved, edited or removed comment reaches the composer once; another window\'s write is not this one\'s save', () => {
  const S = Store.useDiffAnnotationStore, session = 'r8-bridge', calls = [];
  let syncing = false;
  const off = DiffComments.subscribeCommentChanges(S, (state) => DiffComments.fileLineComments(state, session, 'src/a.js'), {
    onSaved: (annotation) => calls.push(['saved', annotation.body]), onRemoved: (annotation) => calls.push(['removed', annotation.body]), syncing: () => syncing });
  const created = S.getState().addAnnotation(session, { filePath: 'src/a.js', side: 'additions', startLine: 1, endLine: 2, body: 'one' });
  S.getState().addAnnotation(session, { filePath: 'src/b.js', side: 'additions', startLine: 1, endLine: 1, body: 'other file' });
  S.getState().addAnnotation(session, { filePath: 'src/a.js', side: 'additions', startLine: 4, endLine: 4, body: 'a file comment', source: 'file' });
  S.getState().updateAnnotation(session, 'src/a.js', created.id, 'one, edited');
  syncing = true;
  S.getState().addAnnotation(session, { filePath: 'src/a.js', side: 'deletions', startLine: 3, endLine: 3, body: 'from the other window' });
  syncing = false;
  S.getState().removeAnnotation(session, 'src/a.js', created.id);
  off();
  assert.deepEqual(calls, [['saved', 'one'], ['saved', 'one, edited'], ['removed', 'one, edited']]);
  const snippet = DiffComments.lineCommentSnippet({ id: 'x1', side: 'deletions', startLine: 3, endLine: 4, snippet: 'a\nb', body: 'why' }, { scope: 'sc', filePath: 'src/a.js', path: 'a.js' });
  assert.deepEqual(snippet, { id: 'deletions:4', annotationId: 'x1', side: 'deletions', start: 3, end: 4, code: 'a\nb', body: 'why', savedBody: 'why', path: 'a.js', key: 'diff-comment:sc:src/a.js:x1' });
});

test('r8pa-02 Files: cd2efac6e Hu over F — file comments are source "file" at `file:${endLine}`, drawn by the official card', () => {
  const S = Store.useDiffAnnotationStore, session = 'r8-files', filePath = '/repo/src/a.js';
  S.getState().addAnnotation(session, { filePath, side: 'additions', startLine: 3, endLine: 3, body: 'saved note', source: 'file' });
  S.getState().addAnnotation(session, { filePath, side: 'additions', startLine: 5, endLine: 5, body: 'a Changes comment' });
  const sent = [], removed = [];
  const props = { sessionId: session, filePath, scope: 'scope-files', lang: 'javascript', enabled: true,
    onSaveComment: (entry, options) => sent.push([entry.body, entry.key.startsWith('file-comment:scope-files:'), options.viaKeyboard]), onDeleteComment: (entry) => removed.push(entry.body) };
  const harness = hookHarness(FileComments.useFileComments);
  let api = harness.render(props);
  assert.deepEqual(api.slots, [{ id: 'file:3', line: 3 }]);
  const html = renderToStaticMarkup(h('div', null, api.slots.map((slot) => h('section', { key: slot.id, 'data-slot': slot.id }, api.renderComment(slot.id)))));
  assert.match(html, /data-slot="file:3"><div class="px-md py-xs"><div class="group\/card relative isolate flex flex-col transition-colors gap-xs px-lg py-2\.5 font-sans bg-\[var\(--diff-widget-bg,var\(--cds-surface-3\)\)\] rounded-\[5px\] border border-\[var\(--diff-widget-border,var\(--cds-border\)\)\]">/);
  assert.match(html, /Line 3[\s\S]*saved note[\s\S]*aria-label="Edit comment"[\s\S]*aria-label="Delete comment"/);
  assert.doesNotMatch(html, /a Changes comment|Post to GitHub/);
  // addComment: a new range opens a draft (snippet, lang, this view's origin); the same key again only reactivates it.
  api.addComment(9, 7, 'line seven\nline eight\n  ');
  const draft = S.getState().draftsBySession[session][filePath]['file:9'];
  assert.deepEqual(draft, { filePath, side: 'additions', startLine: 7, endLine: 9, source: 'file', snippet: 'line seven\nline eight', lang: 'javascript' });
  assert.equal(S.getState().activeBySession[session].key, 'file:9');
  S.getState().setActive(session, null);
  api.addComment(8, 9, 'other');
  assert.equal(S.getState().draftsBySession[session][filePath]['file:9'], draft, 'the open draft is kept');
  assert.equal(S.getState().activeBySession[session].key, 'file:9');
  api = harness.render(props);
  assert.deepEqual(api.slots.map((slot) => slot.id), ['file:3', 'file:9']);
  assert.deepEqual(api.activeRange, { from: 7, to: 9 });
  // The composer bridge: a saved file comment goes out once (keyed by its annotation id), a keyboard save focuses it, a
  // removed one is detached; Changes comments of the same file are not the Files bridge's.
  const note = S.getState().addAnnotation(session, { filePath, side: 'additions', startLine: 7, endLine: 9, body: 'new note', source: 'file' });
  S.getState().addAnnotation(session, { filePath, side: 'additions', startLine: 6, endLine: 6, body: 'changes only' });
  api.renderComment('file:3').props.onSaved({ submit: false });
  S.getState().removeAnnotation(session, filePath, note.id);
  assert.deepEqual(sent, [['new note', true, false], ['new note', true, true]]);
  assert.deepEqual(removed, ['new note']);
  // Unmount: the empty draft this view opened goes, as Hu's cleanup does.
  harness.unmount();
  assert.equal(S.getState().draftsBySession[session][filePath]['file:9'], undefined);
  assert.equal(hookHarness(FileComments.useFileComments).render({ sessionId: session, filePath, scope: 's', enabled: false }), null);
});

test('r8pa-02 Files: the host\'s pre-r8 comments are imported once into F and the old list is kept aside', () => {
  const values = new Map(), storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
  const S = Store.useDiffAnnotationStore, session = 'r8-legacy', filePath = '/repo/b.js';
  values.set(`${FileComments.FILE_COMMENTS_PREFIX}scope-b`, JSON.stringify([
    { id: '1:2', start: 1, end: 2, code: 'a\nb\n', body: 'kept', savedBody: 'kept' },
    { id: '4:4', start: 4, end: 4, code: 'd', body: 'unsaved text' },
    { id: '6:6', start: 6, end: 6, code: 'f', body: '' },
    { bad: true },
  ]));
  const args = { storage, store: S, bodies: Store.P, scope: 'scope-b', sessionId: session, filePath };
  assert.equal(FileComments.importLegacyFileComments(args), 2);
  const saved = S.getState().annotationsBySession[session][filePath];
  assert.deepEqual(saved.map((a) => [a.source, a.side, a.startLine, a.endLine, a.snippet, a.body]), [['file', 'additions', 1, 2, 'a\nb', 'kept']]);
  assert.deepEqual(Object.keys(S.getState().draftsBySession[session][filePath]), ['file:4']);
  assert.equal(Store.P.getState().bodiesBySession[session][filePath]['file:4'], 'unsaved text');
  assert.equal(values.get(`${FileComments.FILE_COMMENTS_PREFIX}scope-b`), undefined);
  assert.ok(values.get(`${FileComments.FILE_COMMENTS_IMPORTED_PREFIX}scope-b`).includes('kept'));
  assert.equal(FileComments.importLegacyFileComments(args), 0, 'nothing is imported twice');
  // The composer snippet: keyed by the annotation id; an edit replaces it, a delete detaches it.
  const entry = FileComments.fileCommentSnippet(saved[0], 'scope-b');
  assert.deepEqual({ ...entry, annotationId: undefined }, { id: 'file:2', annotationId: undefined, start: 1, end: 2, code: 'a\nb', body: 'kept', savedBody: 'kept', key: `file-comment:scope-b:${saved[0].id}`, source: 'file' });
  let attachments = Snippets.addSnippet([], Snippets.makeSnippet('first', { key: entry.key }));
  attachments = Snippets.addSnippet(attachments, Snippets.makeSnippet('updated', { key: entry.key }));
  assert.equal(attachments.length, 1);
  assert.deepEqual(Snippets.removeSnippetByKey(attachments, entry.key), []);
});
