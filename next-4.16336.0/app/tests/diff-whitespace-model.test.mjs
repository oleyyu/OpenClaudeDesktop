import test from 'node:test';
import assert from 'node:assert/strict';
import { hideWhitespaceChanges, trimWhitespace, diffLineArrays, NO_NEWLINE_MARKER } from '../src/diff-whitespace-model.mjs';

// gn / mn / hn / fn port (2.2553.1 readable/panes-diff-view-current.js:216-315).
const header = 'diff --git a/app.js b/app.js\nindex 1111111..2222222 100644\n--- a/app.js\n+++ b/app.js\n';

test('an indent-only file is whitespaceOnly with every hunk dropped and the header kept', () => {
  const patch = header + '@@ -1,3 +1,3 @@\n function a() {\n-return 1;\n+  return 1;\n }\n@@ -10,2 +10,2 @@\n-\tx();\n+    x();\n end\n';
  const result = hideWhitespaceChanges(patch);
  assert.equal(result.whitespaceOnly, true);
  assert.equal(result.patch, header.slice(0, -1) + '\n');
});

test('a mixed hunk keeps its real -/+ lines and turns whitespace-only pairs into context (new side text)', () => {
  const patch = header + '@@ -1,4 +1,4 @@\n keep\n-  one\n-two\n-three\n+    one\n+TWO\n+three  \n tail\n';
  const result = hideWhitespaceChanges(patch);
  assert.equal(result.whitespaceOnly, false);
  assert.equal(result.patch, header + '@@ -1,4 +1,4 @@\n keep\n     one\n-two\n+TWO\n three  \n tail\n');
  // Hunks without a real change are dropped; the others keep their header.
  const two = header + '@@ -1,2 +1,2 @@\n-a\n+ a\n b\n@@ -9,2 +9,2 @@\n-old\n+new\n z\n';
  assert.equal(hideWhitespaceChanges(two).patch, header + '@@ -9,2 +9,2 @@\n-old\n+new\n z\n');
  // A pure addition or deletion run is a real change.
  assert.equal(hideWhitespaceChanges(header + '@@ -1,1 +1,2 @@\n a\n+b\n').whitespaceOnly, false);
});

test('the no-EOL marker follows its line; differing markers keep the run', () => {
  const same = header + '@@ -1,1 +1,1 @@\n-end\n\\ No newline at end of file\n+  end\n\\ No newline at end of file\n';
  const result = hideWhitespaceChanges(same);
  assert.equal(result.whitespaceOnly, true, 'equal markers on both sides: a whitespace-only change');
  const mixed = header + '@@ -1,2 +1,2 @@\n-x\n+ x\n-end\n\\ No newline at end of file\n+end\n';
  // mn reads the whole -/+ run and files a note after any addition under the new side, so the markers differ and the run is kept as is.
  assert.equal(hideWhitespaceChanges(mixed).patch, mixed);
  const eol = header + '@@ -1,2 +1,2 @@\n-a\n-b\n\\ No newline at end of file\n+A\n+  b\n\\ No newline at end of file\n';
  assert.deepEqual(hideWhitespaceChanges(eol), { patch: eol, whitespaceOnly: false }, 'a run with a no-EOL side is kept, not line-diffed');
  assert.equal(NO_NEWLINE_MARKER, '\\ No newline at end of file');
});

test('a patch with no changes is not whitespaceOnly; trailing newline handling; fn trims only space, tab and CR', () => {
  assert.deepEqual(hideWhitespaceChanges(header), { patch: header, whitespaceOnly: false });
  assert.equal(hideWhitespaceChanges('@@ -1 +1 @@\n-a\n+b').patch, '@@ -1 +1 @@\n-a\n+b');
  assert.equal(trimWhitespace(' \t\rx y\t \r'), 'x y');
  assert.equal(trimWhitespace('\u00a0x'), '\u00a0x', 'a no-break space is not trimmed');
});

test('diffLineArrays: jsdiff diffArrays runs with removals first and the maxEditLength bail-out', () => {
  assert.deepEqual(diffLineArrays(['a', 'b', 'c'], ['a', 'x', 'c']), [{ count: 1, same: true }, { count: 1, removed: true }, { count: 1, added: true }, { count: 1, same: true }]);
  assert.deepEqual(diffLineArrays([], ['a']), [{ count: 1, added: true }]);
  assert.deepEqual(diffLineArrays(['a'], ['a']), [{ count: 1, same: true }]);
  assert.equal(diffLineArrays(['a', 'b', 'c'], ['x', 'y', 'z'], { maxEditLength: 2 }), undefined);
  const big = Array.from({ length: 300 }, (_, index) => `line ${index}`);
  assert.equal(diffLineArrays(big, big.map((line) => line + '!'), { maxEditLength: 400 }), undefined, 'more than 400 edits bails out');
});
