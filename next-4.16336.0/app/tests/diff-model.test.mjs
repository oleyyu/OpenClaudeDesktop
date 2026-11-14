import test from "node:test";
import assert from "node:assert/strict";
import { decodeGitPath, parseUnifiedDiff } from "../src/diff-model.js";

const patch = (name, body) => `diff --git a/${name} b/${name}\nindex 123abc..456def 100644\n--- a/${name}\n+++ b/${name}\n${body}`;
function parse(value) {
  const result = parseUnifiedDiff(value);
  assert.equal(result.raw, value);
  assert.equal(result.sections.map((section) => section.raw).join(""), value, "all patch bytes survive in ordered sections");
  return result;
}
function fallback(value, reason) {
  const file = parse(value).files[0];
  assert.match(file.fallbackReason, reason);
  assert.deepEqual(file.hunks, []);
  assert.equal(file.added, null);
  assert.equal(file.removed, null);
  return file;
}

test("unified rows get only the line numbers consumed by their declared ranges", () => {
  const file = parse(patch("src/a.js", "@@ -10,3 +20,4 @@ function run()\n before\n-old\n+new\n+extra\n after\n")).files[0];
  assert.equal(file.path, "src/a.js");
  assert.equal(file.fallbackReason, null);
  assert.equal(file.added, 2);
  assert.equal(file.removed, 1);
  assert.deepEqual(file.hunks[0].rows.map(({ type, oldLine, newLine }) => [type, oldLine, newLine]), [
    ["context", 10, 20], ["removed", 11, null], ["added", null, 21], ["added", null, 22], ["context", 12, 23],
  ]);
  assert.equal(file.hunks[0].context, "function run()");
});

test("omitted counts mean one and multiple hunks keep separate coordinates", () => {
  const file = parse(patch("file", "@@ -1 +1 @@\n-old\n+new\n@@ -99 +100 @@\n-last\n+final")).files[0];
  assert.equal(file.fallbackReason, null);
  assert.equal(file.hunks.length, 2);
  assert.equal(file.hunks[1].rows[0].oldLine, 99);
  assert.equal(file.hunks[1].rows[1].newLine, 100);
  assert.equal(file.added, 2);
});

test("new and deleted files support zero-length opposite ranges", () => {
  const add = "diff --git a/new b/new\nnew file mode 100644\n--- /dev/null\n+++ b/new\n@@ -0,0 +1,2 @@\n+first\n+second\n";
  const remove = "diff --git a/old b/old\ndeleted file mode 100755\n--- a/old\n+++ /dev/null\n@@ -1 +0,0 @@\n-last\n";
  const [added, deleted] = parse(add + remove).files;
  assert.equal(added.status, "added");
  assert.equal(added.oldPath, null);
  assert.equal(added.newMode, "100644");
  assert.deepEqual(added.hunks[0].rows.map((row) => row.newLine), [1, 2]);
  assert.equal(deleted.status, "deleted");
  assert.equal(deleted.newPath, null);
  assert.equal(deleted.path, "old");
  assert.equal(deleted.hunks[0].rows[0].newLine, null);
});

test("multiple git files and non-file preamble retain original order and exact CRLF bytes", () => {
  const value = `From example\nSubject: change\n\n${patch("one", "@@ -1 +1 @@\n-a\n+b\n")}${patch("two", "@@ -2 +2 @@\n-c\n+d\n")}`.replaceAll("\n", "\r\n");
  const result = parse(value);
  assert.deepEqual(result.sections.map((section) => section.type), ["raw", "file", "file"]);
  assert.deepEqual(result.files.map((file) => file.path), ["one", "two"]);
  assert.equal(result.files[0].hunks[0].rows[0].text, "a");
});

test("ordinary unified headers support multiple files and timestamp suffixes", () => {
  const value = "--- before file.txt\t2026-09-19 00:00:00\n+++ after file.txt\t2026-09-20 00:00:00\n@@ -1 +1 @@\n-before\n+after\n--- other\n+++ other\n@@ -4 +4 @@\n-x\n+y\n";
  const result = parse(value);
  assert.equal(result.files.length, 2);
  assert.equal(result.files[0].oldPath, "before file.txt");
  assert.equal(result.files[0].path, "after file.txt");
  assert.equal(result.files[1].hunks[0].rows[1].newLine, 4);
});

test("C-quoted Git paths decode UTF-8 octal, escaped control characters and emoji", () => {
  assert.equal(decodeGitPath('"\\344\\275\\240\\345\\245\\275.txt"'), "你好.txt");
  assert.equal(decodeGitPath('"line\\nwith\\t\\\"quote\\\"\\\\end"'), 'line\nwith\t"quote"\\end');
  assert.equal(decodeGitPath('"emoji-🦀.txt"'), "emoji-🦀.txt");
  const value = 'diff --git "a/\\344\\275\\240\\345\\245\\275.txt" "b/\\344\\275\\240\\345\\245\\275.txt"\n--- "a/\\344\\275\\240\\345\\245\\275.txt"\n+++ "b/\\344\\275\\240\\345\\245\\275.txt"\n@@ -1 +1 @@\n-a\n+b\n';
  assert.equal(parse(value).files[0].path, "你好.txt");
});

test("malformed quoted bytes and unsupported escapes are rejected without evaluation", () => {
  for (const value of ['"\\377"', '"\\400"', '"bad\\q"', '"unclosed', '"a"tail"', '"a\\"'])
    assert.equal(decodeGitPath(value), null, value);
  fallback('diff --git "a/a" "b/a"\n--- "a/\\377"\n+++ "b/a"\n@@ -1 +1 @@\n-a\n+b\n', /quoting/);
});

test("spaces and a literal b-slash within names are not split as token whitespace", () => {
  for (const path of ["file with spaces.txt", "dir b/sub file.txt"]) {
    const file = parse(`diff --git a/${path} b/${path}\nold mode 100644\nnew mode 100755\n`).files[0];
    assert.equal(file.path, path);
    assert.equal(file.fallbackReason, null);
  }
});

test("rename/copy/mode-only and empty new-file patches preserve factual metadata", () => {
  const value = 'diff --git a/old name b/new name\nsimilarity index 100%\nrename from old name\nrename to new name\n'
    + 'diff --git a/source "b/tab\\tname"\nsimilarity index 100%\ncopy from source\ncopy to "tab\\tname"\n'
    + 'diff --git a/script b/script\nold mode 100644\nnew mode 100755\n'
    + 'diff --git a/empty b/empty\nnew file mode 100644\nindex 0000000..e69de29\n';
  const files = parse(value).files;
  assert.deepEqual(files.map((file) => file.fallbackReason), [null, null, null, null]);
  assert.equal(files[0].status, "renamed");
  assert.equal(files[0].renamedFrom, "old name");
  assert.equal(files[0].path, "new name");
  assert.equal(files[1].copiedFrom, "source");
  assert.equal(files[1].path, "tab\tname");
  assert.equal(files[2].newMode, "100755");
  assert.equal(files[3].status, "added");
  assert.ok(files.every((file) => file.hunks.length === 0 && file.added === 0 && file.removed === 0));
});

test("binary summary and Git binary payloads never become fabricated text rows", () => {
  const summary = "diff --git a/image.png b/image.png\nindex abc..def 100644\nBinary files a/image.png and b/image.png differ\n";
  const binary = "diff --git a/data.bin b/data.bin\nindex abc..def 100644\nGIT binary patch\nliteral 4\nLcmZQzU|;|M00aO5\n\nliteral 3\nKcmZQzWC5L%2LJ>B\n\n";
  const result = parse(summary + binary + patch("next", "@@ -1 +1 @@\n-a\n+b\n"));
  assert.equal(result.files.length, 3);
  for (const file of result.files.slice(0, 2)) {
    assert.equal(file.binary, true);
    assert.equal(file.fallbackReason, null);
    assert.equal(file.hunks.length, 0);
  }
  assert.equal(result.files[1].raw, binary);
});

test("no-newline markers have no coordinates and do not consume hunk counts", () => {
  const file = parse(patch("file", "@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file\n")).files[0];
  assert.equal(file.fallbackReason, null);
  assert.deepEqual(file.hunks[0].rows.map((row) => [row.type, row.oldLine, row.newLine]), [
    ["removed", 1, null], ["note", null, null], ["added", null, 1], ["note", null, null],
  ]);
  assert.equal(file.added, 1);
  assert.equal(file.removed, 1);
});

test("hunk content resembling file headers is interpreted inside its declared range", () => {
  const file = parse(patch("file", "@@ -1 +1 @@\n--- actual content\n+++ actual content\n")).files[0];
  assert.equal(file.fallbackReason, null);
  assert.deepEqual(file.hunks[0].rows.map((row) => row.text), ["-- actual content", "++ actual content"]);
});

test("truncated and overlong hunks fall back completely with no counts or coordinates", () => {
  fallback(patch("file", "@@ -1,2 +1,2 @@\n-old\n+new\n"), /truncated/);
  fallback(patch("file", "@@ -1 +1 @@\n-old\n-too many\n+new\n"), /exceed/);
  fallback(patch("file", "@@ -1 +1 @@\n-old\n+new\n+extra\n"), /Unsupported/);
  fallback(patch("file", "@@ -1 +1 @@\n-a\n+b\n@@ -8,2 +8,2 @@\n-z\n"), /truncated/);
});

test("invalid coordinates, unsafe integers, overlapping and combined hunks are preserved raw", () => {
  fallback(patch("file", "@@ -0 +1 @@\n-a\n+b\n"), /range/);
  fallback(patch("file", "@@ -9007199254740991 +1 @@\n-a\n+b\n"), /range/);
  fallback(patch("file", "@@@ -1 -1 +1 @@@\n--a\n++b\n"), /hunk/);
  fallback(patch("file", "@@ -3 +3 @@\n-a\n+b\n@@ -2 +2 @@\n-c\n+d\n"), /Overlapping/);
  const combined = "diff --cc example\nindex abc,def..123\n@@@ -1 -1 +1 @@@\n--a\n++b\n";
  assert.equal(parse(combined).files.length, 0);
});

test("incomplete headers and rename metadata do not become successful empty patches", () => {
  fallback("diff --git a/file b/file\nindex abc..def 100644\n", /No complete/);
  fallback("--- a/file\n+++ b/file\n", /No complete/);
  fallback("diff --git a/old b/new\nrename from old\n", /Incomplete rename/);
  fallback("diff --git a/script b/script\nold mode 100644\n", /No complete/);
});

test("unknown fragments remain exact original text and do not create line numbers", () => {
  const value = "a/src/unknown.js\n-old\n+new\n";
  const result = parse(value);
  assert.equal(result.files.length, 0);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].type, "raw");
  assert.deepEqual(parseUnifiedDiff(null), { raw: "", files: [], sections: [] });
});

test("size and line budgets preserve the whole original patch with a single fallback", () => {
  for (const value of ["x".repeat(4 * 1024 * 1024 + 1), "x\n".repeat(50001)]) {
    const result = parse(value);
    assert.equal(result.files.length, 0);
    assert.equal(result.sections.length, 1);
    assert.match(result.sections[0].reason, /Large patch/);
  }
});
