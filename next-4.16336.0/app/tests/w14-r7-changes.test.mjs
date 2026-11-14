// W14-code r7 changes lane (r7pa-03, R7DC-01, r7pa-05; css7-git-band-prbarrow is in tests/source-git-band.test.mjs).
// - r7pa-03: the host per-file Changes rows (the pop-out window and the local_pierre_changes_body rollback) read and write the
//   official cc8941b7b store the pierre body uses (`{name:"diff-annotations",partialize:Oe}`), so both bodies show the same
//   comments; another window's write is read in (storage event), the host review store keeps its own fields of the key.
// - R7DC-01: the official body gets the unfiltered sections and pauses / hides whitespace per file itself (c44d00c7f qu
//   `hideWhitespace:N&&!Dc({annotations:c,prComments:l,findings:u,drafts:d})`); only the host rows filter.
// - r7pa-05: workspaceGitFileText (cb61be3a2 getDiffFileContent → fetchFileLines): the two texts of a listed file, the same
//   guards as the image viewer's read. Git never runs: the `exec` test seam answers each argv (as diff-large-withheld-main).
// Source / SSR / main-process model only (E61).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const chunk = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const git = createRequire(import.meta.url)('../electron/git-status.cjs');

let server, D, C, Store;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom', logLevel: 'error' });
  D = await server.ssrLoadModule('/src/source-diff.jsx');
  C = await server.ssrLoadModule('/src/source-diff-comments.jsx');
  Store = await server.ssrLoadModule('/src/generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs');
});
after(async () => { await server?.close(); });

const PATCH = 'diff --git a/src/app.js b/src/app.js\nindex 1..2 100644\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1,3 +1,3 @@\n keep\n-export const answer = 1;\n+export const answer = 2;\n tail\n';
const actions = { root: '/repo', onCopy() {}, onAttachFile() {} };

test('r7pa-03 official: one diff-annotations store behind both Changes bodies (Jd draws Ju or the per-file list over it)', () => {
  assert.ok(chunk('cc8941b7b-DAgMZRvX.js').includes('{name:"diff-annotations",partialize:Oe}'));
  assert.ok(chunk('c44d00c7f-Cr1FDL2F.js').includes('pt=Le(!dt&&!Ye)'));
  // The host rows' store is the official one (no localStorage list of its own any more).
  const model = read('src/diff-comments-model.mjs');
  assert.doesNotMatch(model, /export function createDiffCommentsStore|storage\?\.setItem\(key/);
  assert.match(read('src/source-diff-comments.jsx'), /createAnnotationCommentsStore\(\{ sessionId: diffCommentSession\(scope\), path, store: useDiffAnnotationStore, bodies: diffAnnotationBodies \}\)/);
});

test('r7pa-03 SSR: a comment the pierre body saved shows as a card on the host rows (pop-out / switch off), and back', () => {
  const sessionId = 'r7-shared';
  Store.useDiffAnnotationStore.getState().addAnnotation(sessionId, { filePath: 'src/app.js', side: 'additions', startLine: 2, endLine: 2, snippet: 'export const answer = 2;', body: 'from pierre' });
  const fileList = { sessionId, shown: true, tree: true };
  const off = renderToStaticMarkup(h(D.PierreChangesBodyContext.Provider, { value: false },
    h(D.SourceDiff, { value: PATCH, fileList, fileActions: actions, commentScope: JSON.stringify([sessionId, '/repo']) })));
  assert.match(off, /data-comment-key="additions:2"/);
  assert.match(off, /from pierre/);
  // A host card's save lands in the official store, where the pierre body (and its composer bridge) reads it.
  const store = C.diffFileCommentsStore(JSON.stringify([sessionId, '/repo']), 'src/app.js');
  store.create('deletions', 2, 2, 'export const answer = 1;');
  store.edit('deletions:2', 'from the rows');
  const saved = store.save('deletions:2');
  const annotations = Store.useDiffAnnotationStore.getState().annotationsBySession[sessionId]['src/app.js'];
  assert.deepEqual(annotations.map((a) => [a.side, a.endLine, a.body]), [['additions', 2, 'from pierre'], ['deletions', 2, 'from the rows']]);
  // Both bodies key the composer snippet by the annotation id (pierreCommentEntry / useDiffComments' bridge, r8pa-02:
  // lineCommentSnippet over the F annotation the official card saved).
  const scope = JSON.stringify([sessionId, '/repo']);
  assert.equal(D.pierreCommentEntry(annotations[1], scope).key, `diff-comment:${scope}:src/app.js:${saved.annotationId}`);
  assert.equal(C.lineCommentSnippet(annotations[1], { scope, filePath: 'src/app.js', path: 'src/app.js' }).key, `diff-comment:${scope}:src/app.js:${saved.annotationId}`);
});

test('r7pa-03 persistence: F writes back only its comment fields; a re-read takes only those; another window\'s write is not this composer\'s save', () => {
  const values = new Map([['diff-annotations', JSON.stringify({ state: { findingsBySession: { s: [{ id: 'f' }] }, findingStatusBySession: { s: { f: 'open' } } }, version: 0 })]]);
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
  const wrapped = C.annotationCommentStorage(storage);
  wrapped.setItem('diff-annotations', { state: { annotationsBySession: { s: { 'a.js': [{ id: 'c' }] } }, sentPrIdsBySession: {}, findingsBySession: { s: [] } }, version: 0 });
  const written = JSON.parse(values.get('diff-annotations'));
  assert.deepEqual(written.state.findingsBySession, { s: [{ id: 'f' }] }, 'the host review store keeps its findings');
  assert.deepEqual(written.state.annotationsBySession, { s: { 'a.js': [{ id: 'c' }] } });
  assert.deepEqual(wrapped.getItem('diff-annotations').state.findingStatusBySession, { s: { f: 'open' } });
  const merged = C.mergeAnnotationComments({ annotationsBySession: { x: {} }, findingsBySession: { y: [] } }, { annotationsBySession: {}, findingsBySession: { z: [] }, other: 1 });
  assert.deepEqual(merged, { annotationsBySession: { x: {} }, findingsBySession: { z: [] }, other: 1 });
  assert.equal(C.annotationStoreSyncing(), false);
  const source = read('src/source-diff-comments.jsx');
  assert.ok(source.includes('useDiffAnnotationStore.persist.setOptions({ storage: annotationCommentStorage(storage), merge: mergeAnnotationComments });'));
  assert.ok(source.includes('if (event.key !== ANNOTATION_STORE_KEY || (event.storageArea && event.storageArea !== storage)) return;'));
  assert.ok(read('src/source-diff.jsx').includes('for (const annotation of external ? [] : saved) {'));
  // The host review store's own write keeps F's comment fields of the same key (review-findings-model persist).
  assert.ok(read('src/review-findings-model.mjs').includes('state: { ...kept, ...written }'));
});

test('R7DC-01: the official body gets the unfiltered sections; Hide whitespace filters the host rows only', async () => {
  const qu = chunk('c44d00c7f-Cr1FDL2F.js');
  assert.ok(qu.includes('hideWhitespace:N&&!Dc({annotations:c,prComments:l,findings:u,drafts:d})'));
  assert.ok(qu.includes('ci(s,void 0,{hideWhitespace:f.hideWhitespace})'));
  const { parseUnifiedDiff } = await server.ssrLoadModule('/src/diff-model.js');
  const indent = 'diff --git a/a.js b/a.js\nindex 1111111..2222222 100644\n--- a/a.js\n+++ b/a.js\n@@ -1,3 +1,3 @@\n function a() {\n-return 1;\n+  return 1;\n }\n';
  const sections = parseUnifiedDiff(indent).sections;
  const shown = D.shownDiffSections(sections, { hideWhitespace: false });
  assert.equal(shown[0], sections[0], 'unfiltered: the parsed section itself (its whitespace-only change kept for qu)');
  assert.equal(D.shownDiffSections(sections, { hideWhitespace: true })[0].whitespaceOnly, true, 'the host rows hide it');
  assert.equal(D.shownDiffSections(sections, { hideWhitespace: true, paused: new Set(['a.js']) })[0], sections[0], 'a paused file keeps it');
  const text = read('src/source-diff.jsx');
  assert.ok(text.includes('const hostWhitespace = hideWhitespace && !pierre;'));
  assert.ok(text.includes('useWhitespacePausedFiles({ parsed, active: hostWhitespace, commentScope, findings: review?.findings ?? null })'));
  assert.ok(text.includes('<PierreChangesMount sessionId={targetSession} scopeKey={scopeKey} sections={sections}'));
  assert.ok(text.includes('wordWrap={wordWrap} wordDiff={wordDiff} hideWhitespace={hideWhitespace}'), 'qu still gets the preference');
});

// ---- r7pa-05 -------------------------------------------------------------------------------------------------------
const HEAD = 'a'.repeat(40), BASE = 'b'.repeat(40);
function workspace(t, files = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'r7-file-text-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); fs.writeFileSync(path.join(dir, name), text); }
  return dir;
}
// numstat: what `diff --numstat -z <from> [<to>] -- <paths>` lists; shown: rev:path → bytes; untracked: ls-files --others.
function fixtureGit(dir, { numstat = '', shown = {}, untracked = '' } = {}) {
  const calls = [];
  const exec = (args) => {
    calls.push(args);
    const [command] = args;
    if (command === 'rev-parse' && args[1] === '--show-toplevel') return { stdout: `${dir}\n` };
    if (command === 'config') return { code: 1 };
    if (command === 'rev-parse' && args.includes('HEAD^{commit}')) return { stdout: `${HEAD}\n` };
    if (command === 'rev-parse' && args.some((arg) => /\^\{commit\}$/.test(arg))) return { stdout: `${BASE}\n` };
    if (command === 'rev-parse' && args.some((arg) => arg.endsWith('^'))) return { stdout: `${BASE}\n` };
    if (command === 'diff' && args.includes('--numstat')) return { stdout: numstat };
    if (command === 'ls-files') return { stdout: untracked };
    if (command === 'show') { const spec = args.find((arg) => arg.includes(':')); return spec in shown ? { stdout: shown[spec] } : { code: 128, stderr: 'fatal: path not in tree' }; }
    if (command === 'hash-object') return { stdout: '4b825dc642cb6eb9a060e54bf8d69288fbee4904\n' };
    return { code: 1 };
  };
  return { exec, calls };
}

test('r7pa-05 official: cb61be3a2 hands Jd getDiffFileContent(cwd, base, path, previous) as fetchFileLines; eu / ru read {oldText, newText}', () => {
  const page = chunk('cb61be3a2-TL7PL04A.js');
  assert.ok(page.includes('t=>e(q,Y,t.filePath,t.rawFile.previous_filename??void 0)'));
  assert.ok(page.includes('getDiffFileContent'));
  const view = chunk('c44d00c7f-Cr1FDL2F.js');
  assert.ok(view.includes('fetchFileLines:$e'));
  assert.match(view, /oldText===null&&n!=="added"/);
});

test('r7pa-05 workspaceGitFileText: a listed file\'s committed old text (show --no-textconv) and working-tree new text', async (t) => {
  const dir = workspace(t, { 'src/a.txt': 'one\ntwo\n' });
  const one = fixtureGit(dir, { numstat: '1\t1\tsrc/a.txt\0', shown: { [`${HEAD}:src/a.txt`]: 'one\n' } });
  assert.deepEqual(await git.workspaceGitFileText(dir, { filePath: 'src/a.txt', scope: 'uncommitted', exec: one.exec }), { oldText: 'one\n', newText: 'one\ntwo\n' });
  assert.deepEqual(one.calls.find((args) => args[0] === 'show'), ['show', '--no-textconv', '--no-ext-diff', `${HEAD}:src/a.txt`, '--']);
  const listing = one.calls.find((args) => args[0] === 'diff');
  assert.ok(listing.includes('--numstat') && listing.includes(HEAD), 'the scope\'s numstat');
  assert.deepEqual(listing.slice(listing.indexOf('--')), ['--', 'src/a.txt']);
  // A rename reads the old side under its previous path; the listing names both paths.
  const renamed = fixtureGit(dir, { numstat: `0\t0\t\0old.txt\0src/a.txt\0`, shown: { [`${HEAD}:old.txt`]: 'one\n' } });
  assert.deepEqual(await git.workspaceGitFileText(dir, { filePath: 'src/a.txt', previousPath: 'old.txt', scope: 'uncommitted', exec: renamed.exec }), { oldText: 'one\n', newText: 'one\ntwo\n' });
  assert.deepEqual(renamed.calls.find((args) => args[0] === 'diff').slice(-3), ['--', 'old.txt', 'src/a.txt']);
  // A commit scope reads both sides from Git.
  const commit = fixtureGit(dir, { numstat: '1\t0\tsrc/a.txt\0', shown: { [`${BASE}:src/a.txt`]: 'x\n' } });
  const both = await git.workspaceGitFileText(dir, { filePath: 'src/a.txt', scope: 'commit:abcdef0', exec: commit.exec });
  assert.deepEqual(both, { oldText: 'x\n', newText: 'x\n' });
  // An untracked file in a working-tree scope: listed by ls-files --others, no old side.
  const fresh = fixtureGit(dir, { numstat: '', untracked: 'src/a.txt\0' });
  assert.deepEqual(await git.workspaceGitFileText(dir, { filePath: 'src/a.txt', scope: 'branch', exec: fresh.exec }), { oldText: null, newText: 'one\ntwo\n' });
});

test('r7pa-05 workspaceGitFileText guards: only listed files, no unsafe paths, binary / non-UTF-8 sides are null', async (t) => {
  const dir = workspace(t, { 'bin.dat': Buffer.from([0, 1, 2]), 'latin.txt': Buffer.from([0xe9, 0x0a]), 'ok.txt': 'ok\n' });
  // Not in the comparison: null, nothing read.
  const unlisted = fixtureGit(dir, { numstat: '', untracked: '' });
  assert.equal(await git.workspaceGitFileText(dir, { filePath: 'ok.txt', scope: 'uncommitted', exec: unlisted.exec }), null);
  assert.equal(unlisted.calls.some((args) => args[0] === 'show'), false);
  for (const options of [{ filePath: '../x' }, { filePath: '/etc/passwd' }, { filePath: '' }, { filePath: 'C:/x' }, { filePath: 'a.js', previousPath: '../b' },
    { filePath: 'a.js', scope: 'commit:-x' }, { filePath: '.code/worktrees/w/a.js' }]) {
    const guarded = fixtureGit(dir, { numstat: '1\t1\ta.js\0' });
    assert.equal(await git.workspaceGitFileText(dir, { scope: 'uncommitted', ...options, exec: guarded.exec }), null, JSON.stringify(options));
    assert.equal(guarded.calls.some((args) => args[0] === 'show' || args[0] === 'diff'), false, JSON.stringify(options));
  }
  const binary = fixtureGit(dir, { numstat: '-\t-\tbin.dat\0', shown: { [`${HEAD}:bin.dat`]: Buffer.from([0, 9]) } });
  assert.deepEqual(await git.workspaceGitFileText(dir, { filePath: 'bin.dat', scope: 'uncommitted', exec: binary.exec }), { oldText: null, newText: null });
  const latin = fixtureGit(dir, { numstat: '1\t1\tlatin.txt\0', shown: { [`${HEAD}:latin.txt`]: 'e\n' } });
  assert.deepEqual(await git.workspaceGitFileText(dir, { filePath: 'latin.txt', scope: 'uncommitted', exec: latin.exec }), { oldText: 'e\n', newText: null });
  // Missing at the base (an added tracked file): old side null.
  const added = fixtureGit(dir, { numstat: '1\t0\tok.txt\0' });
  assert.deepEqual(await git.workspaceGitFileText(dir, { filePath: 'ok.txt', scope: 'uncommitted', exec: added.exec }), { oldText: null, newText: 'ok\n' });
});

test('r7pa-05 wiring: main.cjs serves workspace-git-file-text; main.jsx attaches fetchFileLines; the body reads it when the hunk has no texts', () => {
  const main = read('electron/main.cjs');
  assert.ok(main.includes('case "workspace-git-file-text": {'));
  assert.ok(main.includes('return workspaceGitFileText(cwd, { filePath: p.path, previousPath: typeof p.previousPath === "string" ? p.previousPath : undefined, scope,'));
  const renderer = read('src/main.jsx');
  assert.ok(renderer.includes('if (gitStatus?.isRepo) diffFileActions.fetchFileLines = ({ filePath, previousPath }) => call("workspace-git-file-text", { cwd: workdir,'));
  const body = read('src/source-diff.jsx');
  assert.ok(body.includes('const fetchFileLines = useMemo(() => (completeContext || canFetchLines ? async (file) => {'));
  assert.ok(body.includes('const read = await actions.current?.fetchFileLines?.({ filePath: file.filePath, previousPath: file.rawFile?.previous_filename });'));
});
