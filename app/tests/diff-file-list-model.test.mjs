import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnifiedDiff } from '../src/diff-model.js';
import {
  DIFF_FILE_KINDS, DIFF_FILE_LIST_LABELS, DIFF_FILE_LIST_MIN_PANE, DIFF_FILE_LIST_WIDTH, LARGE_DIFF_FILES, LARGE_DIFF_LINES, LARGE_DIFF_LINES_SINGLE_LIST,
  clampDiffFileListWidth, compareDiffPaths, diffFileEntries, diffFileFlat, diffFileKind, diffFileList, diffFileListCanFit, diffFileListLimit,
  diffFileTree, diffTotals, groupFilesByKind, isLargeDiff, isTestPath, kindSectionOpen, openKindSections, orderDiffFiles, orderDiffSections,
  revealCollapsed, toggleCollapsed, treeRowTarget,
} from '../src/diff-file-list-model.mjs';

// 2.2553.1 readable/panes-diff-view-current.js:2577-2586 (di/fi), :3916-4036
// (Sa/Ca/wa/Ta/Ea/Da/Oa/ka/Aa/ja/Ma), :4038-4096 (Pa/Ia/La), :4334-4411 (Ga),
// :472-501 (Mn/Pn), :5221-5232 (Qe); tmp-shared-20 jT/MT; cf3dc7910 l/b.
const entry = (filePath, additions = 1, deletions = 0, status = 'modified') => ({ filePath, additions, deletions, status, removed: status === 'deleted' });
const paths = list => list.map(item => item.filePath ?? item.path);

test('di test regex, ported exactly: __tests__/__snapshots__, .test/.spec, test_*.py, .snap', () => {
  for (const path of ['__tests__/a.js', 'src/__tests__/deep/a.ts', 'src/__snapshots__/a.snap', 'a.test.js', 'src/b.spec.tsx', 'c.test.go',
    'pkg/x.spec.rb', 'a_test.ts', 'test_api.py', 'pkg/test_x.py', 'ui.snap', 'deep/x.snap'])
    assert.equal(isTestPath(path), true, path);
  for (const path of ['tests/a.js', 'src/testing.js', 'contest.py', 'mytest_x.py', 'test_x.pyc', 'a.test', 'spec/a.rb', 'snap.js', 'a.snapshot',
    '__tests__.js', 'x/test_y.py/z.js'])
    assert.equal(isTestPath(path), false, path);
  // _test (underscore) counts: "[._](test|spec)\.[^/]+$".
  assert.equal(isTestPath('handler_test.go'), true);
  assert.equal(isTestPath('handler_spec.rb'), true);
});

test('Da kind rules: generated before build before test, everything else source', () => {
  const cases = {
    generated: ['package-lock.json', 'web/yarn.lock', 'Cargo.lock', 'go.sum', 'src/__generated__/a.ts', 'gen/x.go', 'api.pb.go', 'svc_pb2.py', 'svc_pb2_grpc.pyi',
      'a_pb.d.ts', 'model.g.dart', 'Form1.Designer.cs', 'app.min.js', 'app.css.map', '.next/cache/x', 'mod.pyc', 'tsconfig.tsbuildinfo', 'dist/index.js',
      'schema.generated.ts', 'routes.gen.ts', 'src/__tests__/generated/a.test.ts'],
    build: ['BUILD', 'pkg/BUILD.bazel', 'WORKSPACE', 'WORKSPACE.bzlmod', 'MODULE.bazel', 'MODULE.bazel.lock', 'rules/defs.bzl'],
    test: ['a.test.js', 'src/b.spec.ts', 'test_x.py', 'ui.snap', 'Button.stories.tsx', 'conftest.py', 'FooTests.swift', 'BarTest.kt', 'x_unittest.cc',
      'src/tests.rs', 'lib_tests.rs', 'tests/a.js', 'test/b.go', 'spec/c.rb', 'e2e/d.ts', 'e2e-tests/e.ts', 'src/__Snapshots__/f.png'],
    source: ['README.md', 'src/app.js', 'src/testing.js', 'contest.py', 'distribution/x.js', 'src/dist/a.js', 'generator.ts', 'BUILDING.md', 'latest/a.js'],
  };
  for (const [kind, list] of Object.entries(cases)) for (const path of list) assert.equal(diffFileKind(path), kind, path);
  assert.deepEqual(DIFF_FILE_KINDS, ['test', 'build', 'generated']);
  const groups = groupFilesByKind(['a.test.js', 'BUILD', 'yarn.lock', 'src/a.js'].map(path => entry(path)));
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([kind, list]) => [kind, paths(list)])),
    { source: ['src/a.js'], test: ['a.test.js'], build: ['BUILD'], generated: ['yarn.lock'] });
});

test('Mn/Pn order: tree puts folders first, list puts files first, numeric collation, "… " last', () => {
  const list = ['README.md', 'src/app.js', 'src/a/b/c.ts', 'z10.txt', 'z9.txt', 'a/b.txt', 'a.txt', '… 3 more'];
  assert.deepEqual(paths(orderDiffFiles(list.map(path => entry(path)))),
    ['a/b.txt', 'src/a/b/c.ts', 'src/app.js', 'a.txt', 'README.md', 'z9.txt', 'z10.txt', '… 3 more']);
  assert.deepEqual(paths(orderDiffFiles(list.map(path => entry(path)), { tree: false })),
    ['a.txt', 'README.md', 'z9.txt', 'z10.txt', 'a/b.txt', 'src/app.js', 'src/a/b/c.ts', '… 3 more']);
  assert.ok(compareDiffPaths('dir/x', 'file', 'tree') < 0);
  assert.ok(compareDiffPaths('dir/x', 'file', 'list') > 0);
  assert.equal(compareDiffPaths('same', 'same'), 0);
  // ka: grouping by kind keeps each group's path order, source first.
  assert.deepEqual(paths(orderDiffFiles(['yarn.lock', 'src/a.test.js', 'src/z.js', 'BUILD', 'a.js'].map(path => entry(path)), { groupByKind: true })),
    ['src/z.js', 'a.js', 'src/a.test.js', 'BUILD', 'yarn.lock']);
});

test('Aa/Ma folder tree joins single-folder chains; ja flat rows keep the path', () => {
  const tree = diffFileTree(orderDiffFiles(['src/a/b/c.ts', 'src/a/b/d.ts', 'src/app.js', 'lib/only/deep/x.js', 'README.md'].map(path => entry(path, 2, 1))));
  const shape = nodes => nodes.map(node => node.kind === 'dir' ? { [node.name]: shape(node.children) } : node.name);
  assert.deepEqual(shape(tree), [{ 'lib/only/deep': ['x.js'] }, { src: [{ 'a/b': ['c.ts', 'd.ts'] }, 'app.js'] }, 'README.md']);
  assert.equal(tree[0].path, 'lib/only/deep');
  assert.deepEqual(tree[1].children[0].children[0], { kind: 'file', name: 'c.ts', path: 'src/a/b/c.ts', additions: 2, deletions: 1, removed: false });
  assert.deepEqual(diffFileFlat([entry('src/x.js', 3, 4, 'deleted')]), [{ kind: 'file', name: 'x.js', path: 'src/x.js', additions: 3, deletions: 4, removed: true }]);
});

test('diffFileList: by folder, flat, and by kind with separated Test / Build / Generated sections', () => {
  const entries = ['src/app.js', 'src/app.test.js', 'BUILD', 'package-lock.json', 'README.md'].map(path => entry(path));
  const folder = diffFileList(entries);
  assert.equal(folder.sections.length, 0);
  assert.deepEqual(folder.nodes.map(node => node.name), ['src', 'BUILD', 'package-lock.json', 'README.md']);
  const flat = diffFileList(entries, { tree: false });
  assert.deepEqual(flat.nodes.map(node => node.path), ['BUILD', 'package-lock.json', 'README.md', 'src/app.js', 'src/app.test.js']);
  const kind = diffFileList(entries, { groupByKind: true });
  assert.deepEqual(kind.nodes.map(node => node.name), ['src', 'README.md']);
  assert.deepEqual(kind.sections.map(({ kind: k, label, count, paths: p, separated }) => ({ k, label, count, p, separated })), [
    { k: 'test', label: 'Test files', count: 1, p: ['src/app.test.js'], separated: true },
    { k: 'build', label: 'Build files', count: 1, p: ['BUILD'], separated: true },
    { k: 'generated', label: 'Generated files', count: 1, p: ['package-lock.json'], separated: true },
  ]);
  // A section nests its own folder tree (or flat rows when grouping by folder is off).
  assert.equal(kind.sections[0].nodes[0].kind, 'dir');
  assert.equal(diffFileList(entries, { groupByKind: true, tree: false }).sections[0].nodes[0].kind, 'file');
  // The first section is not separated when there are no source rows (Ba separated: n > 0 || v.length > 0).
  const onlyTests = diffFileList([entry('a.test.js'), entry('BUILD')], { groupByKind: true });
  assert.deepEqual(onlyTests.sections.map(section => section.separated), [false, true]);
  assert.deepEqual(paths(kind.files), ['src/app.js', 'README.md', 'src/app.test.js', 'BUILD', 'package-lock.json']);
  assert.equal(DIFF_FILE_LIST_LABELS.changedFiles, 'Changed files');
});

test('filter (Mn inclusion): only parsed file sections with a path, once; counts kept or null for a fallback', () => {
  const patch = [
    'diff --git a/src/app.js b/src/app.js', '--- a/src/app.js', '+++ b/src/app.js', '@@ -1 +1,2 @@', '-old', '+new', '+more',
    'diff --git a/gone.txt b/gone.txt', 'deleted file mode 100644', '--- a/gone.txt', '+++ /dev/null', '@@ -1 +0,0 @@', '-bye',
    'diff --git a/run.sh b/run.sh', 'old mode 100644', 'new mode 100755',
  ].join('\n') + '\n';
  const parsed = parseUnifiedDiff(patch);
  const entries = diffFileEntries([...parsed.sections, { type: 'raw', id: 'raw-x', raw: 'junk' }, { type: 'file', path: null, added: 1, removed: 1 },
    { ...parsed.sections[0] }, { type: 'file', path: 'broken.txt', added: null, removed: null, status: 'modified' }]);
  assert.deepEqual(entries, [
    { filePath: 'src/app.js', additions: 2, deletions: 1, status: 'modified', removed: false },
    { filePath: 'gone.txt', additions: 0, deletions: 1, status: 'deleted', removed: true },
    { filePath: 'run.sh', additions: 0, deletions: 0, status: 'modified', removed: false },
    { filePath: 'broken.txt', additions: null, deletions: null, status: 'modified', removed: false },
  ]);
  // Body order follows the list; unlisted sections keep their order after it.
  const raw = { type: 'raw', id: 'raw-1', raw: 'x' };
  const ordered = orderDiffSections([raw, ...parsed.sections], { tree: true });
  assert.deepEqual(ordered.map(section => section.path ?? section.id), ['src/app.js', 'gone.txt', 'run.sh', 'raw-1']);
  assert.deepEqual(orderDiffSections([], {}), []);
});

test('Qe large diff: the summed additions + deletions above 5000', () => {
  assert.equal(LARGE_DIFF_LINES, 5000);
  assert.deepEqual(diffTotals([entry('a', 2500, 2499), entry('b', null, null)]), { additions: 2500, deletions: 2499 });
  assert.equal(isLargeDiff([entry('a', 2500, 2499)]), false);
  assert.equal(isLargeDiff([entry('a', 2500, 2500)]), false);
  assert.equal(isLargeDiff([entry('a', 2500, 2500), entry('b', 1, 0)]), true);
  assert.equal(isLargeDiff([]), false);
});

test('diffgit-08 $e: line limit (He), then patches_withheld, then the no-patch heuristics only with fetchFilePatch', () => {
  assert.equal(LARGE_DIFF_LINES_SINGLE_LIST, 20000);
  assert.equal(LARGE_DIFF_FILES, 300);
  // He picks the limit: 20000 for the single list, 5000 (the default here) for the per-file list.
  assert.equal(isLargeDiff([entry('a', 12000, 0)]), true);
  assert.equal(isLargeDiff([entry('a', 12000, 0)], { singleList: true }), false);
  assert.equal(isLargeDiff([entry('a', 20001, 0)], { singleList: true }), true);
  // Over the limit wins over patches_withheld:false; under it a boolean Qe decides on its own.
  assert.equal(isLargeDiff([entry('a', 5001, 0)], { withheld: false }), true);
  assert.equal(isLargeDiff([entry('a', 1, 0)], { withheld: true }), true);
  assert.equal(isLargeDiff([entry('a', 1, 0)], { withheld: false, lazyPatches: true }), false);
  // A non-boolean Qe counts as absent.
  assert.equal(isLargeDiff([entry('a', 1, 0)], { withheld: 'yes' }), false);
  const raw = (changes, patch) => ({ ...entry('f', changes, 0), rawFile: { changes, patch } });
  // Qe absent: changed files with no patch at all collapse, but only where patches can be fetched (Fe).
  assert.equal(isLargeDiff([raw(3, undefined)], { lazyPatches: true }), true);
  assert.equal(isLargeDiff([raw(3, undefined)]), false);
  assert.equal(isLargeDiff([raw(3, undefined), raw(1, '@@ -1 +1 @@\n-a\n+b\n')], { lazyPatches: true }), false);
  // >300 files, some changed without a patch, and no patch carries an @@ line.
  const many = (patch) => [...Array.from({ length: 300 }, () => raw(0, patch)), raw(1, undefined)];
  assert.equal(isLargeDiff(many('diff --git a/x b/x\nnew file mode 100644\n'), { lazyPatches: true }), true);
  assert.equal(isLargeDiff(many('diff --git a/x b/x\n@@ -0,0 +1 @@\n+a\n'), { lazyPatches: true }), false);
  assert.equal(isLargeDiff(many('diff --git a/x b/x\nnew file mode 100644\n').slice(1), { lazyPatches: true }), false);
});

test('selection: La reveals collapsed ancestors, Ia kind sections, Ga row targets', () => {
  const collapsed = new Set(['src', 'src/a', 'lib']);
  const revealed = revealCollapsed(collapsed, 'src/a/x.js');
  assert.deepEqual([...revealed], ['lib']);
  assert.notEqual(revealed, collapsed);
  assert.equal(revealCollapsed(collapsed, 'other.js'), collapsed, 'unchanged set is returned as is');
  assert.equal(revealCollapsed(collapsed, null), collapsed);
  assert.equal(revealCollapsed(new Set(['sr']), 'src/x.js').has('sr'), true, 'prefix must end at a folder boundary');
  assert.deepEqual([...toggleCollapsed(new Set(['a']), 'b')], ['a', 'b']);
  assert.deepEqual([...toggleCollapsed(new Set(['a']), 'a')], []);
  // Ia: default = holds the selected file; a stored choice wins until a file inside is selected again.
  assert.equal(kindSectionOpen(undefined, false), false);
  assert.equal(kindSectionOpen(undefined, true), true);
  assert.equal(kindSectionOpen(false, true), false);
  const sections = [{ kind: 'test', paths: ['a.test.js'] }, { kind: 'build', paths: ['BUILD'] }];
  assert.deepEqual(openKindSections({ test: false }, sections, 'a.test.js'), { test: true });
  const stored = { build: true };
  assert.equal(openKindSections(stored, sections, 'BUILD'), stored);
  assert.equal(openKindSections(stored, sections, 'src/x.js'), stored);
  assert.equal(openKindSections(stored, sections, null), stored);
  // Ga: from the tree itself the current row (else the first); clamped steps; Home/End.
  assert.equal(treeRowTarget('ArrowDown', { index: -1, count: 5, currentIndex: 3 }), 3);
  assert.equal(treeRowTarget('ArrowUp', { index: -1, count: 5 }), 0);
  assert.equal(treeRowTarget('ArrowDown', { index: 4, count: 5 }), 4);
  assert.equal(treeRowTarget('ArrowDown', { index: 1, count: 5 }), 2);
  assert.equal(treeRowTarget('ArrowUp', { index: 0, count: 5 }), 0);
  assert.equal(treeRowTarget('Home', { index: 3, count: 5 }), 0);
  assert.equal(treeRowTarget('End', { index: 0, count: 5 }), 4);
  assert.equal(treeRowTarget('ArrowLeft', { index: 0, count: 5 }), null);
  assert.equal(treeRowTarget('ArrowDown', { index: -1, count: 0 }), null);
});

test('width: cf3dc7910 {240, 160, 640} rounded clamp, 160px left for the diff, fits from 400px (So)', () => {
  assert.deepEqual(DIFF_FILE_LIST_WIDTH, { DEFAULT: 240, MIN: 160, MAX: 640 });
  assert.equal(DIFF_FILE_LIST_MIN_PANE, 400);
  assert.equal(clampDiffFileListWidth(300.4), 300);
  assert.equal(clampDiffFileListWidth(10), 160);
  assert.equal(clampDiffFileListWidth(9999), 640);
  assert.equal(clampDiffFileListWidth('300'), 240);
  assert.equal(clampDiffFileListWidth(NaN), 240);
  assert.equal(diffFileListLimit(1000), 640);
  assert.equal(diffFileListLimit(500), 340);
  assert.equal(diffFileListLimit(200), 160);
  assert.equal(diffFileListCanFit(0), true, 'unmeasured counts as fitting (diffCanFitTree ?? true)');
  assert.equal(diffFileListCanFit(399), false);
  assert.equal(diffFileListCanFit(400), true);
});
