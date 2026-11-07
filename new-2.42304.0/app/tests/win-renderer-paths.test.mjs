import test from "node:test";
import assert from "node:assert/strict";
import { pathChoices } from "../src/file-tool-model.mjs";
import { absoluteDiffPath, copyChoices } from "../src/diff-file-header-model.mjs";
import { tabRelativePath } from "../src/file-tab-menu-model.mjs";
import { fileCopyChoices } from "../src/file-context-menu-model.mjs";
import { tabPathForEdit, tabsForEdits } from "../src/file-live-refresh-model.mjs";
import { filePreviewUrl } from "../src/file-preview-model.mjs";
import { localImageSource } from "../src/media-item-model.mjs";

const W = { windows: true };

test("pathChoices: POSIX unchanged", () => {
  assert.deepEqual(pathChoices("src/../a.ts", "/p"), { absolute: "/p/a.ts", relative: "a.ts", filename: "a.ts" });
  assert.deepEqual(pathChoices("/q/a.ts", "/p"), { absolute: "/q/a.ts", relative: null, filename: "a.ts" });
  assert.deepEqual(pathChoices("a.ts", "rel"), { absolute: null, relative: null, filename: "a.ts" });
  assert.deepEqual(pathChoices("/p", "/p"), { absolute: "/p", relative: null, filename: "p" });
});

test("pathChoices: Windows paths", () => {
  assert.deepEqual(pathChoices("C:\\Users\\me\\proj\\src\\a.ts", "C:\\Users\\me\\proj", W),
    { absolute: "C:\\Users\\me\\proj\\src\\a.ts", relative: "src/a.ts", filename: "a.ts" });
  assert.deepEqual(pathChoices("src\\a.ts", "c:/users/me/proj", W),
    { absolute: "C:\\users\\me\\proj\\src\\a.ts", relative: "src/a.ts", filename: "a.ts" });
  assert.deepEqual(pathChoices("c:\\users\\ME\\proj\\a.ts", "C:\\Users\\me\\proj", W).relative, "a.ts");
  assert.equal(pathChoices("D:\\x\\a.ts", "C:\\Users\\me\\proj", W).relative, null);
});

test("absoluteDiffPath / copyChoices with a Windows root", () => {
  assert.equal(absoluteDiffPath("/r", "src/a.ts"), "/r/src/a.ts");
  assert.equal(absoluteDiffPath("C:\\r", "src/a.ts", W), "C:\\r\\src\\a.ts");
  assert.equal(absoluteDiffPath("C:/r", "src/a.ts"), "C:\\r\\src\\a.ts");
  assert.deepEqual(copyChoices("C:\\r", "src/a.ts"), { absolute: "C:\\r\\src\\a.ts", relative: "src/a.ts", filename: "a.ts" });
});

test("tabRelativePath / fileCopyChoices with a Windows cwd", () => {
  assert.equal(tabRelativePath("/p/src/a.ts", "/p"), "src/a.ts");
  assert.equal(tabRelativePath("C:\\P\\src\\a.ts", "c:\\p", W), "src/a.ts");
  assert.equal(tabRelativePath("src/a.ts", "C:\\p", W), "src/a.ts");
  assert.deepEqual(fileCopyChoices("C:\\p", "src/a.ts"), { absolute: "C:\\p\\src\\a.ts", relative: "src/a.ts", filename: "a.ts" });
});

test("tabPathForEdit / tabsForEdits with Windows edit paths", () => {
  assert.equal(tabPathForEdit("/p/src/a.ts", "/p"), "src/a.ts");
  assert.equal(tabPathForEdit("C:\\p\\src\\a.ts", "C:\\p", W), "src/a.ts");
  assert.equal(tabPathForEdit("c:/P/src/a.ts", "C:\\p", W), "src/a.ts");
  assert.equal(tabPathForEdit("D:\\other\\a.ts", "C:\\p", W), null);
  assert.equal(tabPathForEdit("src\\a.ts", "C:\\p", W), "src/a.ts");
  assert.deepEqual(tabsForEdits([{ path: "src/A.ts" }, { path: "b.ts" }], ["C:\\p\\src\\a.ts"], "C:\\p", W), ["src/A.ts"]);
  assert.deepEqual(tabsForEdits([{ path: "src/A.ts" }], ["/p/src/a.ts"], "/p"), []);
});

test("file:// URLs for Windows paths", () => {
  assert.equal(filePreviewUrl("/Users/me/a b#.png"), "file:///Users/me/a%20b%23.png");
  assert.equal(filePreviewUrl("C:\\Users\\me\\a b.png"), "file:///C:/Users/me/a%20b.png");
  assert.equal(localImageSource("/tmp/x.png"), "file:///tmp/x.png");
  assert.equal(localImageSource("C:\\tmp\\x?.png"), "file:///C:/tmp/x%3F.png");
  assert.equal(localImageSource("relative.png"), null);
});
