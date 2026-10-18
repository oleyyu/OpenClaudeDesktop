import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import {
  splitClipboardFolders, isOutsideFolder, planFolderIntake, planFolderPaste, folderGrantError, stageFiles, IMAGE_TYPE_ERROR,
} from "../src/composer-attachments-model.mjs";
import { setLocale } from "../electron/i18n/index.mjs";

// B01: composer folder/file intake (cc43287c9 Hm / $m / sg / cg; shared-50 kk) and raw custom-group names (shared-21 lz).
const file = (name, type = "") => ({ name, type });
const item = (value, isDirectory = false) => ({ kind: "file", getAsFile: () => value, webkitGetAsEntry: () => ({ isDirectory }) });

test("kk: clipboard items split into folders and files; strings and empty items are skipped", () => {
  const folder = file("src"), doc = file("notes.pdf", "application/pdf"), shot = file("a.png", "image/png");
  const items = [item(folder, true), item(doc), { kind: "string", getAsFile: () => null }, item(shot), { kind: "file", getAsFile: () => null }];
  assert.deepEqual(splitClipboardFolders(items, [folder, doc, shot]), { folders: [folder], files: [doc, shot] });
  // An item without webkitGetAsEntry is a file.
  assert.deepEqual(splitClipboardFolders([{ kind: "file", getAsFile: () => doc }], [doc]), { folders: [], files: [doc] });
  // No item list: every File is a file.
  assert.deepEqual(splitClipboardFolders(undefined, [doc, shot]), { folders: [], files: [doc, shot] });
  assert.deepEqual(splitClipboardFolders(null, null), { folders: [], files: [] });
});

test("cB: outside unless the folder is the working folder or below it", () => {
  assert.equal(isOutsideFolder("/w/app", "/w/app"), false);
  assert.equal(isOutsideFolder("/w/app/", "/w/app"), false);
  assert.equal(isOutsideFolder("/w/app/src", "/w/app"), false);
  assert.equal(isOutsideFolder("/w/application", "/w/app"), true);
  assert.equal(isOutsideFolder("/other", "/w/app"), true);
  assert.equal(isOutsideFolder("C:\\w\\app\\src", "C:/w/app"), false);
  assert.equal(isOutsideFolder("/anything", ""), false);
});

test("Hm: a draft keeps an outside folder as an extra folder and chips an inside one", () => {
  assert.deepEqual(planFolderIntake(["/other", "/w/app/src", "/other"], { workdir: "/w/app", sessionOpen: false }),
    { chips: ["/w/app/src"], grant: [], draftFolders: ["/other"] });
});

test("Hm: a session chips every folder and grants the outside ones", () => {
  assert.deepEqual(planFolderIntake(["/other", "/w/app/src"], { workdir: "/w/app", sessionOpen: true }),
    { chips: ["/other", "/w/app/src"], grant: ["/other"], draftFolders: [] });
  assert.deepEqual(planFolderIntake([null, "", 3], { workdir: "/w/app", sessionOpen: true }), { chips: [], grant: [], draftFolders: [] });
});

test("sg: a draft without a working folder takes the first folder as its folder; otherwise Hm", () => {
  assert.deepEqual(planFolderPaste(["/a", "/b"], { draft: true, workdir: "" }), { workingFolder: "/a" });
  assert.deepEqual(planFolderPaste(["/a"], { draft: true, workdir: "/w" }), { chips: [], grant: [], draftFolders: ["/a"] });
  assert.deepEqual(planFolderPaste(["/a"], { draft: false, workdir: "/w", sessionOpen: true }), { chips: ["/a"], grant: ["/a"], draftFolders: [] });
  assert.equal(planFolderPaste([], { draft: true }), null);
});

test("CNiYa5WL8N: the refused-grant notice counts folders (en-US and zh-CN)", () => {
  assert.equal(folderGrantError(1), "Couldn’t add 1 folder to this session");
  assert.equal(folderGrantError(3), "Couldn’t add 3 folders to this session");
  setLocale("zh-CN");
  try { assert.equal(folderGrantError(2), "无法将 2 个文件夹添加到此会话"); } finally { setLocale("en-US"); }
});

test("cg/$h: a pasted Finder file with a path is attached; a pathless non-image keeps the image-type notice", () => {
  // The paste lane now stages path-backed files like a drop (stageComposerFiles' referenced lane, imagesOnly off) ...
  const referenced = stageFiles([], [{ name: "main.ts", type: "", path: "/w/app/main.ts" }, { name: "spec.pdf", type: "application/pdf", path: "/w/spec.pdf" }],
    { makeId: (index) => `f${index}` });
  assert.deepEqual(referenced.added.map((entry) => [entry.kind, entry.path]), [["file", "/w/app/main.ts"], ["file", "/w/spec.pdf"]]);
  assert.deepEqual(referenced.notices, []);
  // ... while raw clipboard data without a path stays on the image-only lane.
  const clipboard = stageFiles([], [{ name: "blob.bin", type: "application/octet-stream" }], { imagesOnly: true });
  assert.deepEqual(clipboard.added, []);
  assert.deepEqual(clipboard.notices, [IMAGE_TYPE_ERROR]);
});

test("source wiring: paste/drop route folders, Add folder adds instead of switching the working folder", () => {
  const composer = readFileSync(new URL("../src/source-composer.jsx", import.meta.url), "utf8");
  const paste = composer.slice(composer.indexOf("const paste = (event) =>"), composer.indexOf("const drop = (event) =>", composer.indexOf("const paste = (event) =>")));
  assert.doesNotMatch(paste, /imagesOnly: true/, "the paste lane no longer refuses path-backed files");
  // R4g-composer CP4 (composer-12): the split is the original shared-52 mb and the lanes are aK's (the folders lane is
  // onAddFolders), shared by paste and drop.
  assert.match(paste, /intake\(splitTransferItems\(event\.clipboardData\?\.items/);
  assert.match(composer, /folders: onAddFolders \? \(folders\) => onAddFolders\(folders, \{ source \}\) : undefined,/);
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /<SourceMenu\.Item icon="Folder" onClick=\{addFolderFromMenu\}>\{t\("Add folder"\)\}/);
  assert.doesNotMatch(main, /<SourceMenu\.Item icon="Folder" onClick=\{folder\}>\{t\("Add folder"\)\}/);
  assert.match(main, /onAddFolders=\{addFolderFiles\}/);
});

let server, Sidebar, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, ".."), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  Sidebar = await server.ssrLoadModule("/src/source-sidebar.jsx");
  I18n = await server.ssrLoadModule("/electron/i18n/index.mjs");
});
after(async () => { await server?.close(); });

test("lz: custom group names render verbatim in Move-to-group menus (zh-CN, '{…}' in a name)", () => {
  const render = (props, label) => renderToStaticMarkup(React.createElement(Sidebar.Choice, props, label));
  I18n.setLocale("zh-CN");
  try {
    assert.match(render({}, "Archive"), /归档/, "item copy is still localized");
    const archive = render({ raw: true }, "Archive");
    assert.match(archive, />Archive</);
    assert.doesNotMatch(archive, /归档/);
    assert.match(render({ raw: true }, "Pinned"), />Pinned</);
    assert.match(render({ raw: true }, "Team {count}"), />Team \{count\}</);
  } finally { I18n.setLocale("en-US"); }
});
