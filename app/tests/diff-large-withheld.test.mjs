// R4g-files FV2 (diffgit-08): the Changes body's large-diff decision is 2.42304.0 c44d00c7f Al $e. SSR of SourceDiff
// (placement "changes"): the line limit, then a boolean patchesWithheld (the main process's comparison.patches_withheld
// carried by diffPayload), then the no-patch heuristics, which only run where fileActions.fetchFilePatch exists.
// R4i-files FI2 (diffgit-08-lazy): withheld files arrive as header-only blocks plus comparisonFiles (their counts); with
// fetchFilePatch each row is expandable and reads its own patch (LazyFileDiff, driven here through a hook fixture).
// Vite SSR only (no hmr, no ws, no listening port); no browser, no Electron, no git.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
let server, D, C, L, parseUnifiedDiff;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], appType: 'custom', logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
  D = await server.ssrLoadModule('/src/source-diff.jsx');
  C = await server.ssrLoadModule('/src/diff-context-model.mjs');
  L = await server.ssrLoadModule('/src/diff-file-list-model.mjs');
  ({ parseUnifiedDiff } = await server.ssrLoadModule('/src/diff-model.js'));
});
after(async () => { await server?.close(); });

const file = (name, added) => [`diff --git a/${name} b/${name}`, `--- a/${name}`, `+++ b/${name}`, `@@ -1 +1,${added} @@`, '-old',
  ...Array.from({ length: added }, (_, index) => `+new ${index}`)].join('\n');
const patchOf = (...files) => `${files.join('\n')}\n`;
const BANNER = 'Files are collapsed for large diffs. Select a file to expand it.';
const render = (props) => renderToStaticMarkup(h(D.SourceDiff, { placement: 'changes', ...props }));
const bodies = (html) => html.split('class="sdiff-file-body').length - 1;

test('a small diff stays expanded unless the main process withheld its patches', () => {
  const value = patchOf(file('a.js', 2), file('b.js', 1));
  const open = render({ value });
  assert.equal(open.includes(BANNER), false);
  assert.equal(bodies(open), 2);
  const withheld = render({ value, patchesWithheld: true });
  assert.equal(withheld.includes(BANNER), true);
  assert.equal(bodies(withheld), 0, 'every file mounts collapsed');
  assert.equal(render({ value, patchesWithheld: false }).includes(BANNER), false);
});

test('the line limit decides before patches_withheld, and the per-file body uses 5000 (Pt)', () => {
  const value = patchOf(file('big.js', 5001));
  assert.equal(render({ value }).includes(BANNER), true);
  assert.equal(render({ value, patchesWithheld: false }).includes(BANNER), true);
  assert.equal(render({ value: patchOf(file('ok.js', 4999)) }).includes(BANNER), false);
});

// A withheld file as the main process sends it (git-status.cjs headerOnlyPatch) and its comparison entry.
const header = (name) => `diff --git a/${name} b/${name}\n`;
const stat = (name, additions, deletions = 0, extra = {}) => ({ filename: name, status: 'modified', additions, deletions, changes: additions + deletions, ...extra });
const fetchFilePatch = async () => null;

test('with fetchFilePatch (Fe) and no patches_withheld, the no-patch heuristic decides from the rows\' own patches', () => {
  // Every file carries hunks: its rawFile.patch is its text, so nothing is withheld.
  const value = patchOf(file('a.js', 2));
  assert.equal(render({ value, fileActions: { fetchFilePatch } }).includes(BANNER), false);
  // A changed file without a patch (a header-only block whose comparison entry has changes) and no file with one:
  // `Z.some(changes>0) && !Z.some(patch)` is true only where Fe exists.
  const withheldOnly = header('big.js');
  const comparisonFiles = [stat('big.js', 12, 3)];
  assert.equal(render({ value: withheldOnly, comparisonFiles, fileActions: { fetchFilePatch } }).includes(BANNER), true);
  assert.equal(render({ value: withheldOnly, comparisonFiles }).includes(BANNER), false, 'without Fe the heuristic is off');
  // One row with hunks among them: some file has a patch, and there are not more than 300 files.
  assert.equal(render({ value: patchOf(file('a.js', 2), header('big.js').trimEnd()), comparisonFiles, fileActions: { fetchFilePatch } }).includes(BANNER), false);
  // The rawFile entries the decision reads.
  const parsedSections = withSections(patchOf(file('a.js', 2), header('big.js').trimEnd()), comparisonFiles);
  const entries = L.withRawFiles(L.diffFileEntries(parsedSections), parsedSections);
  assert.deepEqual(entries.map(entry => [entry.filePath, entry.additions, entry.deletions, entry.rawFile.changes, typeof entry.rawFile.patch]),
    [['a.js', 2, 1, 3, 'string'], ['big.js', 12, 3, 15, 'undefined']]);
});
const withSections = (value, files) => L.withComparisonFiles(parseUnifiedDiff(value).sections, files);

test('the payload carries patches_withheld from the workspace-git-diff result into SourceDiff', () => {
  const value = patchOf(file('a.js', 2));
  const view = C.diffPayload({ patch: value, completeContext: false, patches_withheld: true });
  assert.equal(render({ value: view.patch, patchesWithheld: view.patchesWithheld }).includes(BANNER), true);
  const plain = C.diffPayload({ patch: value, completeContext: true });
  assert.equal(render({ value: plain.patch, patchesWithheld: plain.patchesWithheld }).includes(BANNER), false);
});

test('a withheld diff lists every file with the comparison counts; rows are expandable only where fetchFilePatch exists', () => {
  const value = [header('a.js'), 'diff --git a/old.js b/new.js\nrename from old.js\nrename to new.js\n', 'diff --git a/n.txt b/n.txt\nnew file mode 100644\n'].join('');
  const comparisonFiles = [stat('a.js', 40, 2), stat('new.js', 5, 1, { status: 'renamed', previous_filename: 'old.js' }), stat('n.txt', 7, 0, { status: 'added' })];
  const html = render({ value, patchesWithheld: true, comparisonFiles, fileActions: { fetchFilePatch } });
  assert.equal(html.includes(BANNER), true);
  assert.equal(bodies(html), 0, 'the large diff mounts every row collapsed');
  for (const count of ['+40', '−2', '+5', '−1', '+7']) assert.ok(html.includes(count), count);
  const toggles = html.match(/<button[^>]*class="sdiff-file-toggle[^"]*"[^>]*>/g) ?? [];
  assert.equal(toggles.length, 3);
  assert.ok(toggles.every(tag => !tag.includes('aria-disabled="true"') && tag.includes('aria-expanded="false"')), 'pending rows have a body to expand');
  const inert = render({ value, patchesWithheld: true, comparisonFiles }).match(/<button[^>]*class="sdiff-file-toggle[^"]*"[^>]*>/g) ?? [];
  assert.ok(inert.length === 3 && inert.every(tag => tag.includes('aria-disabled="true"')), 'without fetchFilePatch a withheld row has no body');
  // Sections: counts from the comparison, lazyPatch carries the previous path for the read.
  const sections = withSections(value, comparisonFiles);
  assert.deepEqual(sections.map(section => [section.path, section.added, section.removed, section.lazyPatch?.previousPath ?? null]),
    [['a.js', 40, 2, null], ['new.js', 5, 1, 'old.js'], ['n.txt', 7, 0, null]]);
  // A file whose comparison entry has no changes (a mode change, a binary file) is not lazy.
  assert.equal(withSections(header('mode.sh'), [stat('mode.sh', 0)])[0].lazyPatch, undefined);
  assert.equal(L.withComparisonFiles([], undefined).length, 0);
});

test('lazyPatchSection: the read patch replaces the header-only row; "", null and patches without hunks leave it bodiless', () => {
  const [stub] = withSections(header('a.js'), [stat('a.js', 2, 1)]);
  const loaded = D.lazyPatchSection(stub, patchOf(file('a.js', 2)));
  assert.equal(loaded.id, stub.id); assert.equal(loaded.path, 'a.js');
  assert.equal(loaded.hunks.length, 1); assert.equal(loaded.added, 2); assert.equal(loaded.removed, 1);
  assert.equal(loaded.lazyPatch, undefined);
  for (const patch of ['', '   ', null, undefined, header('a.js')]) {
    const none = D.lazyPatchSection(stub, patch);
    assert.equal(none.lazyPatch, null, String(patch)); assert.equal(none.hunks.length, 0);
  }
});

// Deterministic hook cells (as tests/btw-read-state.test.mjs): effects run on flush, cleanups on close.
function hookFixture(body, props) {
  const cells = [], effects = []; let cursor = 0, output;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (fn, deps) => { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { deps, value: fn() }; return cells[i].value; };
  const dispatcher = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, next => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useRef(initial) { return dispatcher.useState(() => ({ current: initial }))[0]; },
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const old = cells[i]; cells[i] = { deps }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  const render = next => {
    if (next) props = next;
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internals.H;
    internals.H = dispatcher;
    try { output = body(props); } finally { internals.H = old; }
    while (effects.length) effects.shift()();
    return output;
  };
  render();
  return { render, get output() { return output; }, close: () => cells.forEach(cell => cell?.cleanup?.()) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('LazyFileDiff reads the patch once through the queue with {filePath, previousPath} and swaps the parsed section in', async () => {
  const [stub] = withSections('diff --git a/old.js b/new.js\nrename from old.js\nrename to new.js\n', [stat('new.js', 2, 1, { status: 'renamed', previous_filename: 'old.js' })]);
  const calls = [], queued = [];
  const queue = run => { queued.push(run); return Promise.resolve().then(run); };
  const fetch = async request => { calls.push(request); return 'diff --git a/old.js b/new.js\nrename from old.js\nrename to new.js\n--- a/old.js\n+++ b/new.js\n@@ -1 +1,2 @@\n-old\n+new 0\n+new 1\n'; };
  const view = hookFixture(D.SourceLazyFileDiff, { file: stub, fetchFilePatch: fetch, queue, placement: 'changes' });
  let element = view.output;
  assert.equal(element.props.file, stub);
  assert.equal(element.props.lazyPatch.pending, true);
  assert.equal(calls.length, 0, 'nothing is read before the row expands');
  element.props.lazyPatch.load(); element.props.lazyPatch.load();
  await tick(); await tick();
  assert.deepEqual(calls, [{ filePath: 'new.js', previousPath: 'old.js' }]);
  assert.equal(queued.length, 1);
  element = view.render();
  assert.equal(element.props.lazyPatch, null);
  assert.equal(element.props.file.hunks.length, 1);
  assert.equal(element.props.file.id, stub.id);
  view.close();
  // A failed read leaves the row bodiless instead of pending.
  const failed = hookFixture(D.SourceLazyFileDiff, { file: stub, fetchFilePatch: async () => { throw new Error('gone'); }, queue, placement: 'changes' });
  failed.output.props.lazyPatch.load();
  await tick(); await tick();
  const after = failed.render();
  assert.equal(after.props.lazyPatch, null); assert.equal(after.props.file.hunks.length, 0);
  failed.close();
});

// R4i-files review fix: the lazy row is keyed by its path, and its read by lazyPatch.hashInput (c44d00c7f Br / Qo):
// a refresh with other counts re-reads while the last patch stays shown; unchanged counts re-read once stale (30 s,
// 0 after a failed read); the read's own result never triggers another read.
test('LazyFileDiff re-reads on a changed hashInput or stale data, keeps the last patch meanwhile, and does not loop', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(path.join(ROOT, 'src/source-diff.jsx'), 'utf8');
  assert.equal(source.split('<LazyFileDiff key={`lazy:${section.path}`}').length - 1, 1);
  assert.equal(source.split(':${section.added}:${section.removed}').length - 1, 0);
  const reference = fs.readFileSync(path.resolve(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c44d00c7f-zUAG9XyS.js'), 'utf8');
  assert.equal(reference.split('`${i}${n}:${t.status}:${t.additions}:${t.deletions}:${t.previous_filename??""}`').length - 1, 1);
  assert.equal(reference.split('staleTime:e=>e.state.data===null?0:3e4').length - 1, 1);
  assert.equal(D.LAZY_PATCH_STALE_MS, 30000);
  const stubOf = (added) => withSections(header('a.js'), [stat('a.js', added, 1)])[0];
  const first = stubOf(2);
  assert.equal(first.lazyPatch.hashInput, 'modified:2:1:');
  let clock = 1000, answer = patchOf(file('a.js', 2));
  const calls = [];
  const queue = run => Promise.resolve().then(run);
  const fetch = async request => { calls.push(request); return answer; };
  const props = (stub, fetchFilePatch = fetch) => ({ file: stub, fetchFilePatch, queue, now: () => clock, placement: 'changes' });
  const view = hookFixture(D.SourceLazyFileDiff, props(first));
  view.output.props.lazyPatch.load();
  await tick(); await tick();
  let element = view.render();
  assert.equal(calls.length, 1); assert.equal(element.props.file.added, 2); assert.equal(element.props.lazyPatch, null);
  // The same counts within 30 s: no read, on the same or a new file object.
  view.render(props(stubOf(2)));
  await tick(); await tick();
  assert.equal(calls.length, 1);
  // Stale (30 s) on a refresh: one read, the last patch shown until it lands.
  clock += 30000; answer = patchOf(file('a.js', 3));
  element = view.render(props(stubOf(2)));
  assert.equal(element.props.lazyPatch, null); assert.equal(element.props.file.added, 2);
  await tick(); await tick();
  assert.equal(calls.length, 2);
  assert.equal(view.render().props.file.added, 3);
  // Other counts: read at once (no wait for staleness), the old patch kept meanwhile.
  answer = patchOf(file('a.js', 4));
  element = view.render(props(stubOf(4)));
  assert.equal(element.props.file.added, 3);
  await tick(); await tick();
  assert.equal(calls.length, 3);
  assert.equal(view.render().props.file.added, 4);
  view.close();
  // A failed read is stale at once (staleTime 0) but is retried only on the next refresh, never by its own result.
  let failures = 0;
  const failing = async () => { failures++; return null; };
  const broken = hookFixture(D.SourceLazyFileDiff, props(first, failing));
  broken.output.props.lazyPatch.load();
  for (let i = 0; i < 4; i++) { await tick(); broken.render(); }
  assert.equal(failures, 1);
  broken.render(props(stubOf(2), failing));
  for (let i = 0; i < 4; i++) { await tick(); broken.render(); }
  assert.equal(failures, 2);
  broken.close();
});

test('FileDiff starts the read when a pending row is expanded, and its pending body shows no "no hunks" line', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(path.join(ROOT, 'src/source-diff.jsx'), 'utf8');
  const count = (needle) => source.split(needle).length - 1;
  assert.equal(count('useEffect(() => { if (expanded && pending) lazyPatch.load(); }, [expanded, pending, lazyPatch]);'), 1);
  assert.equal(count('const hasBody = !changes || !!file.fallbackReason || file.hunks.length > 0 || pending;'), 1);
  assert.equal(count(': pending ? null : <div className="sdiff-metadata-only">'), 1);
  // A small withheld-but-included diff (patches_withheld false) with a lazy row mounts it expanded and pending.
  const html = render({ value: header('a.js'), patchesWithheld: false, comparisonFiles: [stat('a.js', 2)], fileActions: { fetchFilePatch } });
  assert.equal(html.includes(BANNER), false);
  assert.equal(bodies(html), 1);
  assert.ok(html.includes('aria-busy="true"'));
  assert.equal(html.includes('No text hunks in this patch'), false);
});

test('createPatchFetchQueue runs at most PER_FILE_FETCH_CONCURRENCY reads at once, in order', async () => {
  assert.equal(L.PER_FILE_FETCH_CONCURRENCY, 4);
  assert.deepEqual({ ...L.INLINE_PATCH_BUDGET }, { includePatches: false, inlinePatchesMaxChangedLines: 20000 });
  assert.deepEqual([undefined, 'branch', 'uncommitted', 'commit:abcdef0'].map(L.lazyDiffScope), [true, true, true, false]);
  const schedule = L.createPatchFetchQueue();
  let active = 0, peak = 0; const order = [], release = [];
  const jobs = Array.from({ length: 9 }, (_, index) => schedule(() => new Promise(resolve => {
    active++; peak = Math.max(peak, active); order.push(index);
    release.push(() => { active--; resolve(index); });
  })));
  await tick();
  assert.equal(active, 4);
  while (release.length) { release.shift()(); await tick(); }
  assert.deepEqual(await Promise.all(jobs), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(peak, 4);
  assert.deepEqual(order, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  await assert.rejects(schedule(() => { throw new Error('read failed'); }), /read failed/);
});
