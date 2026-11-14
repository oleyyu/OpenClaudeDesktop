// W14-code r6 pierre lane (R6DC-01 = r6pa-01 = gates-r6-11; E90 / E95): the Changes pane body is the 3.6556.2 c44d00c7f Ju
// (`var Ju = v(qu)`, qu over the pierre CodeView ca7ba268c Ba), which Jd draws in the main window (`pt = Le(!dt && !Ye)`),
// sliced once by scripts/extract-pierre-changes.mjs (generated/pierre-changes, linking code-transcript and transcript-rows)
// and mounted by src/source-diff.jsx behind the host switch local_pierre_changes_body (false: the host's per-file rows).
// Source / SSR only (E61): pierre draws its rows in the diffs-container shadow root on the client, so the rows, comments,
// F7, expansion and scrolling themselves need the user's GUI check.
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

let server, D, Store, Pane, Growth;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  D = await server.ssrLoadModule('/src/source-diff.jsx');
  Store = await server.ssrLoadModule('/src/generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs');
  Pane = await server.ssrLoadModule('/src/source-pane-review.jsx');
  Growth = await server.ssrLoadModule('/src/host-growthbook.mjs');
});
after(async () => { await server?.close(); });

const PATCH = 'diff --git a/src/a.txt b/src/a.txt\n--- a/src/a.txt\n+++ b/src/a.txt\n@@ -1,12 +1,12 @@\n l1\n l2\n l3\n l4\n l5\n-x\n+y\n l7\n l8\n l9\n l10\n l11\n l12\n'
  + 'diff --git a/b.png b/b.png\nindex 1..2 100644\nBinary files a/b.png and b/b.png differ\n';
const fileList = { sessionId: 's-pierre', shown: true, tree: true };
const actions = { root: '/repo', onCopy() {}, onOpenFile() {}, onAttachFile() {} };

test('official: Jd draws Ju (qu over the CodeView) in the main window; its props and the cccc2cf0a onAnnotationSaved', () => {
  const view = chunk('c44d00c7f-Cr1FDL2F.js');
  has(view, ['pt=Le(!dt&&!Ye)', 'Ju=v(qu)', 'Zu=v(Xu)', 'wc=v(Cc)', 'Yc=y(null)', 'Xc=y(!1)', 'defaultMessage:"Show more lines",id:"UT3lU03eUR"',
    'onAnnotationSaved:ne,onAnnotationCreated:re', 'diffIndicators:"classic",collapsedContextThreshold:3', 'stickyHeaders:!0',
    '"data-diff-body-menu-trigger":""', 't as kt}from"./ca7ba268c-B3JMi1tw.js"']);
  // The Code diff pane answers a saved comment with the composer action (submit or focus), the comment itself staying in
  // the cc8941b7b store the composer reads.
  has(chunk('cccc2cf0a-DhZC33Gc.js'), ['let{submit:t}=e;return ke(t?"submit":"focus")', 'function ZO(){kl({origin:"diff_pane"})']);
  has(chunk('cc8941b7b-DAgMZRvX.js'), ['scrollToAnnotation:(t,n,r)=>', 'findingsIndexBySession:{}']);
});

test('generator: one pierre-changes area over code-transcript and transcript-rows (D1), wc handed to the host card', () => {
  const manifest = JSON.parse(read('src/generated/pierre-changes/manifest.json'));
  const mod = (target) => manifest.modules.find((m) => m.target === target);
  assert.deepEqual(mod('pierre-changes.mjs').exports, { Ju: 'PierreChanges', Zu: 'PierreChangesFileHeader', lu: 'pierreChangesMessages',
    mi: 'comparisonFileEntries', Vc: 'useDiffFetchScheduler', Yc: 'DiffImageViewerContext', Xc: 'DiffImageViewerShownContext',
    // W14-code r8 (r8pa-02): Fc, Pc's line comment card, for the host rows; cd2efac6e Hu's reads of F for the Files editor.
    Fc: 'PierreChangesCommentCard' });
  assert.deepEqual(mod('pierre-cc8941b7b-DAgMZRvX.mjs').exports, { F: 'useDiffAnnotationStore', I: 'diffAnnotationActions', k: 'diffAnnotationKey',
    A: 'isFileAnnotationKey', Ie: 'useFileAnnotations', St: 'useFileAnnotationDrafts' });
  assert.ok(manifest.linkedAreas.some((area) => area === 'code-transcript' || area?.area === 'code-transcript'));
  // No second pierre: ca7ba268c and c64baa838 stay transcript-rows' (the CodeView and the diffs-container element).
  assert.equal(manifest.modules.some((m) => /ca7ba268c|c64baa838|c49d7f557/.test(m.source)), false);
  const body = read('src/generated/pierre-changes/pierre-changes.mjs');
  assert.match(body, /import \{ CodeView as kt \} from "\.\.\/transcript-rows\/rows-ca7ba268c-B3JMi1tw\.mjs";/);
  assert.match(body, /PierreReviewFindingCard as wc/);
  // The bindings the two linked areas slice for this closure are exported there under their own names.
  const links = JSON.parse(read('scripts/code-transcript-links.json')).linkExports;
  assert.deepEqual(links['transcript-rows']['c6e73333a-DjPHi7Jv.js'], ['T', '_', 'c', 'd', 'f', 'g', 'h', 'l', 'p', 's', 'y']);
  assert.ok(links['code-transcript']['cb8c5a88f-h6ooJ7Al.js'].length >= 70);
  const ct = JSON.parse(read('src/generated/code-transcript/manifest.json'));
  assert.ok(ct.modules.find((m) => m.source === 'shared-78-D5Fw2h0a.js').linkExports.includes('ko'));
  has(read('scripts/extract-code-transcript.mjs'), ["LINKS.linkExports['code-transcript']"]);
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-pierre-changes.mjs')));
});

test('switch: local_pierre_changes_body is a host entry, on by default; Jd`s pop-out check', () => {
  assert.equal(Growth.hostGrowthBookFlag('local_pierre_changes_body'), true);
  assert.equal(D.PIERRE_CHANGES_BODY_SWITCH, 'local_pierre_changes_body');
  assert.equal(D.inPopoutPaneWindow({ location: { search: '?popout=s1&pane=changes' } }), true);
  assert.equal(D.inPopoutPaneWindow({ location: { search: '' } }), false);
});

test('SSR: the main-window Changes body is the official mount; switch off, no session or no file list keep the host rows', () => {
  const on = renderToStaticMarkup(h(D.SourceDiff, { value: PATCH, fileList, fileActions: actions, completeContext: true }));
  assert.match(on, /<div class="sdiff-changes-main"><div class="relative flex min-h-0 flex-1 flex-col" data-layout="unified" data-pierre-changes-body=""><div class="relative flex-1 min-h-0" data-pierre-changes=""><\/div><\/div><\/div>/);
  // The CodeView is the "Changes" group and scroll root itself (ca7ba268c La), so the host group is not drawn.
  assert.doesNotMatch(on, /class="source-changes |sdiff-row|sdiff-file-body/);
  assert.match(on, /role="tree" aria-label="Changed files"/, 'the Changed files column stays');
  const off = renderToStaticMarkup(h(D.PierreChangesBodyContext.Provider, { value: false }, h(D.SourceDiff, { value: PATCH, fileList, fileActions: actions })));
  assert.match(off, /class="source-changes [^"]*" role="group" aria-label="Changes" tabindex="0"/);
  assert.match(off, /class="sdiff-row /);
  assert.doesNotMatch(off, /data-pierre-changes/);
  const noSession = renderToStaticMarkup(h(D.SourceDiff, { value: PATCH, fileList: { shown: true }, fileActions: actions }));
  assert.match(noSession, /class="sdiff-row /);
  const standalone = renderToStaticMarkup(h(D.SourceDiff, { value: PATCH }));
  assert.match(standalone, /class="sdiff-row /);
});

test('SSR (server snapshot shim): the mount draws qu — the body menu trigger and the CodeView scroller in the layout', async () => {
  // qu's prefetcher ($u) reads a store with useSyncExternalStore and no server snapshot, so on the server the host mounts
  // only qu's root box. A second server answers the client snapshot on the server too, for pierre-changes' modules only
  // (a virtual React that forwards everything else), so the original body renders as it does on the client.
  const shim = '\0pierre-react-ssr-snapshot';
  const second = await createServer({ configFile: false, root: app, appType: 'custom', logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
    plugins: [react(), { name: 'pierre-ssr-snapshot', enforce: 'pre',
      transform: (code, id) => (id.includes('/generated/pierre-changes/') ? code.replace(/\} from "react";/g, '} from "pierre-react-ssr-snapshot";') : null),
      resolveId: (source) => (source === 'pierre-react-ssr-snapshot' ? shim : null),
      load: (id) => (id === shim ? "import * as R from 'react'; export * from 'react'; export function useSyncExternalStore(s, g, gs) { return R.useSyncExternalStore(s, g, gs ?? g); }" : null) }] });
  let html;
  try {
    const Diff = await second.ssrLoadModule('/src/source-diff.jsx');
    const Mount = await second.ssrLoadModule('/src/generated/pierre-changes/pierre-changes.mjs');
    const Query = await second.ssrLoadModule('/src/generated/files-changes/file-browser-query.mjs');
    const Breadcrumb = await second.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
    const { comparison } = Diff.pierreComparison((await second.ssrLoadModule('/src/diff-model.js')).parseUnifiedDiff(PATCH).sections, { completeContext: true });
    const files = Mount.comparisonFileEntries(comparison, undefined, 'tree');
    html = renderToStaticMarkup(h(Query.QueryClientProvider, { client: Breadcrumb.fileBrowserQueryClient },
      h(Mount.PierreChanges, { sessionId: 's-pierre', files, foldScope: 'scope', diffStyle: 'unified', wordWrap: true, wordDiff: true, onAnnotationSaved() {} })));
  } finally { await second.close(); }
  assert.match(html, /^<div class="relative flex-1 min-h-0"><div class="h-full" data-diff-body-menu-trigger="" style="-webkit-touch-callout:none"><div class="h-full overflow-y-auto /);
  assert.match(html, /--diffs-font-family:var\(--cds-font-mono\)/);
  assert.match(html, /data-diff-pane-focus-ring=""/);
});

test('comparison: sections become cb61be3a2 files; a complete-context hunk becomes a 3-line patch plus the two file texts', () => {
  const sections = [
    { type: 'file', path: 'src/a.txt', status: 'modified', added: 1, removed: 1, raw: 'diff --git a/src/a.txt b/src/a.txt\n@@ -1 +1 @@\n-a\n+b\n', hunks: [] },
    { type: 'file', path: 'n.txt', status: 'renamed', renamedFrom: 'o.txt', added: 0, removed: 0, raw: 'diff --git a/o.txt b/n.txt\nrename from o.txt\nrename to n.txt\n', hunks: [] },
    { type: 'file', path: 'gone.txt', status: 'deleted', added: 0, removed: 3, raw: 'x', hunks: [] },
    { type: 'file', path: 'big.txt', status: 'modified', added: 5, removed: 2, lazyPatch: { previousPath: undefined }, hunks: [] },
    { type: 'raw', raw: 'junk' },
  ];
  const { comparison } = D.pierreComparison(sections);
  assert.equal(comparison.lazy_file_hunks, true);
  assert.deepEqual(comparison.files.map((file) => [file.filename, file.status, file.changes, file.previous_filename ?? null, typeof file.patch]), [
    ['src/a.txt', 'modified', 2, null, 'string'], ['n.txt', 'renamed', 0, 'o.txt', 'string'], ['gone.txt', 'removed', 3, null, 'string'], ['big.txt', 'modified', 7, null, 'undefined']]);
  const html = 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,12 +1,12 @@\n l1\n l2\n l3\n l4\n l5\n-x\n+y\n l7\n l8\n l9\n l10\n l11\n-l12\n\\ No newline at end of file\n+L12\n\\ No newline at end of file\n';
  return server.ssrLoadModule('/src/diff-model.js').then(({ parseUnifiedDiff: parse }) => {
    const section = parse(html).sections[0];
    const complete = D.pierreCompleteFile(section, true);
    assert.equal(complete.patch, 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -3,10 +3,10 @@\n l3\n l4\n l5\n-x\n+y\n l7\n l8\n l9\n l10\n l11\n-l12\n\\ No newline at end of file\n+L12\n\\ No newline at end of file\n');
    assert.deepEqual(complete.fileLines, { oldText: 'l1\nl2\nl3\nl4\nl5\nx\nl7\nl8\nl9\nl10\nl11\nl12', newText: 'l1\nl2\nl3\nl4\nl5\ny\nl7\nl8\nl9\nl10\nl11\nL12' });
    assert.equal(D.pierreCompleteFile(section, false), null, 'without complete context the patch is used as is');
    // Two separate changes keep two hunks.
    const two = parse('diff --git a/t b/t\n--- a/t\n+++ b/t\n@@ -1,12 +1,12 @@\n-1\n+one\n 2\n 3\n 4\n 5\n 6\n 7\n 8\n 9\n 10\n 11\n-12\n+twelve\n').sections[0];
    assert.equal(D.pierreCompleteFile(two, true).patch, 'diff --git a/t b/t\n--- a/t\n+++ b/t\n@@ -1,4 +1,4 @@\n-1\n+one\n 2\n 3\n 4\n@@ -9,4 +9,4 @@\n 9\n 10\n 11\n-12\n+twelve\n');
  });
});

test('mi: the official files of a comparison (order, content hash, the patch-or-lazy filter)', async () => {
  const P = await server.ssrLoadModule('/src/generated/pierre-changes/pierre-changes.mjs');
  const files = P.comparisonFileEntries({ files: [{ filename: 'z.txt', status: 'modified', additions: 1, deletions: 0, changes: 1, patch: '@@ -1 +1,2 @@\n a\n+b\n' },
    { filename: 'a/b.txt', status: 'added', additions: 1, deletions: 0, changes: 1, patch: '@@ -0,0 +1 @@\n+x\n' },
    { filename: 'nopatch.txt', status: 'modified', additions: 1, deletions: 1, changes: 2 }], merge_base: '', lazy_file_hunks: false }, undefined, 'tree');
  assert.deepEqual(files.map((file) => file.filePath), ['a/b.txt', 'z.txt']);
  assert.ok(files.every((file) => typeof file.contentHash === 'string' && file.rawFile && file.lazy === false));
});

test('comments: the store\'s saved / edited / removed line comments go to the composer as keyed snippets', () => {
  const a = { id: 'c1', filePath: 'src/a.txt', side: 'additions', startLine: 6, endLine: 7, body: 'fix', snippet: 'y' };
  const pr = { id: 'p1', filePath: 'src/a.txt', source: 'pr', body: 'x' };
  const before = D.sessionLineComments({ annotationsBySession: { s: { 'src/a.txt': [pr] } } }, 's');
  assert.equal(before.size, 0, 'PR comments and findings are not composer comments');
  const next = D.sessionLineComments({ annotationsBySession: { s: { 'src/a.txt': [pr, a] } } }, 's');
  assert.deepEqual(D.lineCommentChanges(before, next), { saved: [a], removed: [] });
  const edited = { ...a, body: 'fix it' };
  const after = D.sessionLineComments({ annotationsBySession: { s: { 'src/a.txt': [edited] } } }, 's');
  assert.deepEqual(D.lineCommentChanges(next, after), { saved: [edited], removed: [] });
  assert.deepEqual(D.lineCommentChanges(after, new Map()), { saved: [], removed: [edited] });
  const entry = D.pierreCommentEntry(a, '["s","/w"]');
  assert.deepEqual(entry, { id: 'c1', path: 'src/a.txt', start: 6, end: 7, side: 'additions', code: 'y', body: 'fix', savedBody: 'fix',
    key: 'diff-comment:["s","/w"]:src/a.txt:c1' });
  // The bridge is wired: the body's onAnnotationSaved is the bridge's keyboard save, the store subscription the rest.
  has(read('src/source-diff.jsx'), ['const onAnnotationSaved = usePierreCommentBridge(sessionId, commentScope ?? scopeKey, fileActions);',
    'return useDiffAnnotationStore.subscribe((state) => {', "send(annotation, { viaKeyboard: true, submit: options?.submit === true });"]);
});

test('findings: the review goes into the store index under the Changes paths; the card is the host\'s over the same review', () => {
  const findings = D.pierreFindings([{ id: 'f1', file: '/w/src/a.txt', line: 6, endLine: 7, summary: 'Bug', detail: null, category: 'P1' }], ['src/a.txt']);
  assert.equal(findings[0].filePath, 'src/a.txt');
  assert.equal(findings[0].endLine, 7);
  Store.diffAnnotationActions.setReviewFindings('s-find', findings);
  Store.diffAnnotationActions.resolveReviewFindingPaths('s-find', 'diff', ['src/a.txt']);
  assert.deepEqual(Store.useDiffAnnotationStore.getState().findingsIndexBySession['s-find'].diff['src/a.txt'].map((entry) => entry.id), ['f1']);
  const review = { findings: [{ id: 'f1', file: 'src/a.txt', line: 6, endLine: 7, summary: 'Bug', detail: null, category: 'P1' }], currentId: 'f1', statuses: {}, onDismiss() {} };
  const card = renderToStaticMarkup(h(Pane.PierreReviewContext.Provider, { value: review }, h(Pane.PierreReviewFindingCard, { annotation: { id: 'f1' } })));
  assert.match(card, /data-review-finding="f1"/);
  assert.match(card, /aria-current="true"/);
  assert.equal(renderToStaticMarkup(h(Pane.PierreReviewFindingCard, { annotation: { id: 'f1' } })), '');
});

test('file menu, image viewer, F7: the host extras in the official menu; Xc / Yc provided; the host F7 handler steps aside', () => {
  const entries = D.pierreFileMenuEntries({ root: '/repo', revealRoot: '/repo', onRevealFile() {}, onOpenInEditor() {}, editors: [{ name: 'Zed', type: 'zed' }],
    onOpenFile() {}, onAttachFile() {}, onCopy() {} }, 'src/a.js');
  assert.deepEqual(entries.map((entry) => entry.kind === 'submenu' ? `submenu:${entry.items.map((item) => item.label).join(',')}` : entry.action), ['submenu:Zed', 'show-in-finder']);
  const src = read('src/source-diff.jsx');
  has(src, ['<DiffImageViewerShownContext.Provider value={!!imageViewer}>', '<DiffImageViewerContext.Provider value={imageViewer ?? null}>',
    'if (!view || pierre) return undefined;', 'if (pierre) diffAnnotationActions.scrollToAnnotation(targetSession, path, anchor ? { anchor } : undefined);',
    // r6pa-04 / R6DC-02: the rollback header's View image / Open file are the CDS Button too.
    '<CdsButton size="xs" variant="ghost" icon="Image" iconOnly aria-label={t("View image")} tooltipSide="bottom"',
    '<CdsButton size="xs" variant="ghost" icon="ArrowUpRight" iconOnly aria-label={t("Open file")} tooltipSide="bottom"']);
  assert.doesNotMatch(src, /SourceSettingsButton/);
});
