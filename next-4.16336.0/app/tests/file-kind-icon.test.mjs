import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FILE_KIND_GLYPHS, fileExtension, fileKind, fileKindIcon } from "../src/file-kind-icon.mjs";

const glyphs = JSON.parse(readFileSync(new URL("../src/generated/icons.json", import.meta.url), "utf8"));

test("fileKindIcon follows shared-14 cP over the vendored extension tables", () => {
  const cases = { "a.tsx": "Code", "b.png": "Image", "c.csv": "Spreadsheet", "d.sqlite": "Database", "e.pptx": "Slides",
    "f.zip": "Archive", "dir/SKILL.md": "Scroll", "g.md": "Note", "h.html": "Globe", "notes.txt": "File", "Makefile": "File",
    "x.json": "Code" };
  for (const [path, glyph] of Object.entries(cases)) assert.equal(fileKindIcon(path), glyph, path);
});

test("fileKindIcon covers every oP branch and the qN fallback", () => {
  // uu (shared-5 tF) and ZN code, QN ico, eP/tP documents incl. media, qN xls/mermaid/svg/jsx and Zc language ids.
  const cases = { "main.py": "Code", "App.vue": "Code", "page.htm": "Globe", "site.XHTML": "Globe", "favicon.ico": "Image",
    "clip.mp4": "File", "song.flac": "File", "paper.pdf": "File", "README.markdown": "Note", "book.xlsx": "Spreadsheet",
    "flow.mmd": "Image", "logo.svg": "Image", "photo.JPEG": "Image", "styles.less": "Code", "query.graphql": "Code",
    "data.jsonl": "Database", "deck.ppt": "Slides", "pack.tgz": "Archive", "my.skill": "Scroll", "x.plugin": "Scroll",
    "table.tsv": "Spreadsheet", "doc.clark": "File", "unknown.xyz": "File", ".gitignore": "File", "": "File" };
  for (const [path, glyph] of Object.entries(cases)) assert.equal(fileKindIcon(path), glyph, path);
  assert.equal(fileExtension("Makefile"), "");
  assert.equal(fileExtension("src/Main.TS"), "ts");
  assert.equal(fileKind("a/SKILL.md"), "skill");
  assert.equal(fileKind("nothing"), "doc");
  // Every glyph the helper can return exists in the vendored CDS icon font.
  for (const name of [...Object.values(FILE_KIND_GLYPHS), "Note", "Globe"]) assert.equal(typeof glyphs[name], "number", name);
});
