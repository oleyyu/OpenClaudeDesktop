import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { revealChild } from "../src/files-search-model.mjs";

const require = createRequire(import.meta.url);
const { listFiles } = require("../electron/files.cjs");
let fixtureRoot;
const ordered = (a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name);
const nameAt = index => `item-${String(index).padStart(3, "0")}.txt`;
async function inBatches(values, operation) {
  for (let offset = 0; offset < values.length; offset += 40)
    await Promise.all(values.slice(offset, offset + 40).map(operation));
}
before(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-reveal-"));
  await inBatches(Array.from({ length: 501 }, (_, index) => nameAt(index)), name => fs.writeFile(path.join(fixtureRoot, name), ""));
  await fs.writeFile(path.join(fixtureRoot, "zz-target.txt"), "target");
  await fs.writeFile(path.join(fixtureRoot, "zz-\n😀.txt"), "special");
  await fs.mkdir(path.join(fixtureRoot, ".git"));
  await fs.mkdir(path.join(fixtureRoot, "node_modules"));
  await fs.writeFile(path.join(fixtureRoot, ".DS_Store"), "");
});
after(async () => { if (fixtureRoot) await fs.rm(fixtureRoot, { recursive: true, force: true }); });

test("ordinary listing keeps its existing first 500 sorted eligible entries", async () => {
  const entries = await listFiles(fixtureRoot);
  assert.equal(entries.length, 500);
  assert.deepEqual(entries.map(entry => entry.name), Array.from({ length: 500 }, (_, index) => nameAt(index)));
  assert.deepEqual(entries, [...entries].sort(ordered));
});

test("real 501st or last child replaces only the last ordinary row and stays sorted", async () => {
  for (const includeChild of [nameAt(500), "zz-target.txt"]) {
    const entries = await listFiles(fixtureRoot, "", { includeChild });
    assert.equal(entries.length, 500);
    assert.equal(entries.filter(entry => entry.name === includeChild).length, 1);
    assert.deepEqual(entries.slice(0, 499).map(entry => entry.name), Array.from({ length: 499 }, (_, index) => nameAt(index)));
    assert.equal(entries.some(entry => entry.name === nameAt(499)), false);
    assert.deepEqual(entries, [...entries].sort(ordered));
    const target = entries.find(entry => entry.name === includeChild);
    assert.equal(target.directory, false); assert.equal(target.symlink, false);
    assert.equal((await fs.stat(path.join(fixtureRoot, target.path))).isFile(), true);
  }
});

test("already-visible targets keep the entire normal page unchanged", async () => {
  const normal = await listFiles(fixtureRoot);
  for (const includeChild of [nameAt(0), nameAt(499)])
    assert.deepEqual(await listFiles(fixtureRoot, "", { includeChild }), normal);
});

test("missing, excluded, traversal and wrong-case hints never fabricate or broaden rows", async () => {
  const normal = await listFiles(fixtureRoot);
  for (const includeChild of ["missing.txt", ".git", "node_modules", ".DS_Store", "", ".", "..", "/tmp", "dir/file", "nul\0name", "ZZ-TARGET.TXT", 42, ["zz-target.txt"]])
    assert.deepEqual(await listFiles(fixtureRoot, "", { includeChild }), normal);
});

test("actual Unicode/newline filename is retained without normalization", async () => {
  const includeChild = "zz-\n😀.txt";
  const entries = await listFiles(fixtureRoot, "", { includeChild });
  assert.equal(entries.length, 500);
  assert.equal(entries.find(entry => entry.name === includeChild)?.path, includeChild);
});

test("deep reveal can retain a real direct child at every independently capped level", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-deep-reveal-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await inBatches(Array.from({ length: 501 }, (_, index) => `dir-${String(index).padStart(3, "0")}`), name => fs.mkdir(path.join(root, name)));
  await fs.mkdir(path.join(root, "zz-nested"));
  await inBatches(Array.from({ length: 501 }, (_, index) => nameAt(index)), name => fs.writeFile(path.join(root, "zz-nested", name), ""));
  await fs.writeFile(path.join(root, "zz-nested", "zz-needle.txt"), "needle");
  const revealPath = "zz-nested/zz-needle.txt";
  assert.equal((await listFiles(root)).some(entry => entry.name === "zz-nested"), false);
  const roots = await listFiles(root, "", { includeChild: revealChild("", revealPath) });
  assert.equal(roots.length, 500); assert.equal(roots.find(entry => entry.name === "zz-nested")?.directory, true);
  const children = await listFiles(root, "zz-nested", { includeChild: revealChild("zz-nested", revealPath) });
  assert.equal(children.length, 500); assert.equal(children.find(entry => entry.name === "zz-needle.txt")?.path, revealPath);
  assert.deepEqual(roots, [...roots].sort(ordered)); assert.deepEqual(children, [...children].sort(ordered));
});

test("direct-child hints follow component boundaries and reject unrelated/unsafe paths", () => {
  assert.equal(revealChild("", "src/deep/file.js"), "src");
  assert.equal(revealChild("src", "src/deep/file.js"), "deep");
  assert.equal(revealChild("src/deep", "src/deep/file.js"), "file.js");
  assert.equal(revealChild("src", "src2/file.js"), undefined);
  assert.equal(revealChild("src", "src"), undefined);
  assert.equal(revealChild("src", "src/../outside"), undefined);
  assert.equal(revealChild("../src", "src/file.js"), undefined);
  assert.equal(revealChild("", "/absolute"), undefined);
  assert.equal(revealChild("", null), undefined);
});
