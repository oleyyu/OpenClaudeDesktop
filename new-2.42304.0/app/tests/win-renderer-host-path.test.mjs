import test from "node:test";
import assert from "node:assert/strict";
import {
  isWindowsHost, pathStyle, isAbsolutePath, normalizePath, joinPath, samePath, relativeTo, isInsidePath,
  splitPath, pathBasename, pathDirname, folderName, toFileUrl,
} from "../src/host-path-model.mjs";

const W = { windows: true }, P = { windows: false };

test("isWindowsHost reads navigator.platform", () => {
  assert.equal(isWindowsHost({ platform: "Win32" }), true);
  assert.equal(isWindowsHost({ platform: "MacIntel" }), false);
  assert.equal(isWindowsHost({ platform: "Linux x86_64" }), false);
  assert.equal(isWindowsHost(null), false);
});

test("POSIX paths keep their old results", () => {
  assert.equal(pathStyle("/a/b", P), "posix");
  assert.equal(pathStyle("/a/b", W), "win");
  assert.equal(isAbsolutePath("/a", P), true);
  assert.equal(isAbsolutePath("a/b", P), false);
  assert.equal(isAbsolutePath("\\a", P), false);
  assert.equal(normalizePath("/a//b/./c/../d", P), "/a/b/d");
  assert.equal(normalizePath("/../..", P), "/");
  assert.equal(normalizePath("/a\\b/c", P), "/a\\b/c");
  assert.equal(joinPath("/p", "src/../a.ts", P), "/p/a.ts");
  assert.equal(relativeTo("/p", "/p/src/a.ts", P), "src/a.ts");
  assert.equal(relativeTo("/p", "/p", P), "");
  assert.equal(relativeTo("/p", "/pq/a", P), null);
  assert.equal(relativeTo("/P", "/p/a", P), null);
  assert.equal(relativeTo("/", "/a", P), null);
  assert.deepEqual(splitPath("/a/b.ts", P), ["/a/", "b.ts"]);
  assert.deepEqual(splitPath("/a/b/", P), ["/a/", "b/"]);
  assert.deepEqual(splitPath("b.ts", P), ["", "b.ts"]);
  assert.equal(pathBasename("/a/b/", P), "b");
  assert.equal(pathBasename("a\\b", P), "a\\b");
  assert.equal(pathDirname("/a/b.ts", P), "/a");
  assert.equal(pathDirname("/a", P), "/");
  assert.equal(folderName("/", P), "/");
  assert.equal(toFileUrl("/Users/me/a b#1?.png", P), "file:///Users/me/a%20b%231%3F.png");
});

test("Windows drive paths", () => {
  assert.equal(pathStyle("C:\\a", P), "win");
  assert.equal(pathStyle("src\\a.ts", W), "win");
  assert.equal(isAbsolutePath("C:\\a", P), true);
  assert.equal(isAbsolutePath("c:/a", P), true);
  assert.equal(isAbsolutePath("C:a", W), false);
  assert.equal(isAbsolutePath("\\\\srv\\share", W), true);
  assert.equal(normalizePath("c:/Users//me/./proj/../x", P), "C:\\Users\\me\\x");
  assert.equal(normalizePath("C:\\", W), "C:\\");
  assert.equal(normalizePath("\\\\srv\\share\\a\\..\\b", W), "\\\\srv\\share\\b");
  assert.equal(joinPath("C:\\p", "src/a.ts", W), "C:\\p\\src\\a.ts");
  assert.equal(samePath("C:\\Users\\Me\\A.ts", "c:/users/me/a.ts", W), true);
  assert.equal(relativeTo("C:\\Users\\me\\proj", "c:/users/me/proj/src/a.ts", W), "src/a.ts");
  assert.equal(relativeTo("C:/Users/me/proj", "C:\\Users\\me\\proj\\src\\A.ts", W), "src/A.ts");
  assert.equal(relativeTo("C:\\Users\\me\\proj", "C:\\Users\\me\\proj", W), "");
  assert.equal(relativeTo("C:\\Users\\me\\proj", "C:\\Users\\me\\project\\a", W), null);
  assert.equal(relativeTo("D:\\", "D:\\a\\b", W), "a/b");
  assert.equal(relativeTo("C:\\p", "/p/a", W), null);
  assert.equal(isInsidePath("C:\\p", "c:\\P\\a", W), true);
  assert.equal(isInsidePath("C:\\p", "C:\\p", { ...W, orEqual: false }), false);
  assert.deepEqual(splitPath("C:\\a\\b.ts", W), ["C:\\a\\", "b.ts"]);
  assert.deepEqual(splitPath("C:/a/b.ts", P), ["C:/a/", "b.ts"]);
  assert.equal(pathBasename("C:\\Users\\me\\proj\\", W), "proj");
  assert.equal(pathBasename("C:\\", W), "");
  assert.equal(folderName("C:\\", W), "C:\\");
  assert.equal(pathDirname("C:\\a\\b.ts", W), "C:\\a");
  assert.equal(pathDirname("C:\\a", W), "C:\\");
  assert.equal(toFileUrl("C:\\Users\\me\\a b#1.png", W), "file:///C:/Users/me/a%20b%231.png");
  assert.equal(toFileUrl("c:/x/y.png", P), "file:///C:/x/y.png");
  assert.equal(toFileUrl("\\\\srv\\share\\a b.png", W), "file://srv/share/a%20b.png");
});
