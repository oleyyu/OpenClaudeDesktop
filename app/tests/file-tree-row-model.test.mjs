import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

// R2-files FT-01: file-tree-style is the 2.42304.0 ca7840910 geometry, which reads the fizzy-lake gate from the
// view-tabs graph (shared-4 → vendor-frame → the .jsx React seam), so the model loads through Vite SSR.
let server, SINGLE_CHILD_EXPAND_LIMIT, singleChildFolderChain, treeEntryOpenable, fileTreeGuideStyle, REVEAL_FLASH_MS,
  onEnterReleased, fileTreeCoachmarkEligible, fileTreeNuxDismissed, dismissFileTreeNux, FILE_TREE_NUX_ID, nuxAccountAged,
  NUX_ACCOUNT_MIN_AGE_MS, treeIndent, fileTreeRowStyle, Style, Density, Gate;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, ".."),
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  ({ SINGLE_CHILD_EXPAND_LIMIT, singleChildFolderChain, treeEntryOpenable, fileTreeGuideStyle, REVEAL_FLASH_MS,
    onEnterReleased, fileTreeCoachmarkEligible, fileTreeNuxDismissed, dismissFileTreeNux, FILE_TREE_NUX_ID, nuxAccountAged,
    NUX_ACCOUNT_MIN_AGE_MS, treeIndent, fileTreeRowStyle } = await server.ssrLoadModule("/src/file-tree-row-model.mjs"));
  Style = await server.ssrLoadModule("/src/generated/code-current/file-tree-style.mjs");
  Density = await server.ssrLoadModule("/src/generated/code-current/file-tree-density.mjs");
  Gate = await server.ssrLoadModule("/src/generated/view-tabs/shared-4-CJsHhp5n.js");
});
after(() => server?.close());
const read = (file) => fs.readFileSync(path.resolve(import.meta.dirname, "..", file), "utf8");

const dir = (path, extra = {}) => ({ name: path.split("/").at(-1), path, directory: true, symlink: false, ...extra });
const file = (path) => ({ name: path.split("/").at(-1), path, directory: false, symlink: false });

test("av: a chain of only-child folders expands, stopping at a file, a link, siblings or a failed read", async () => {
  const tree = {
    src: [dir("src/main")], "src/main": [dir("src/main/java")], "src/main/java": [dir("src/main/java/com")],
    "src/main/java/com": [file("src/main/java/com/App.java"), file("src/main/java/com/Util.java")],
  };
  const calls = [];
  const list = async (path) => { calls.push(path); if (!(path in tree)) throw new Error("ENOENT"); return tree[path]; };
  assert.deepEqual(await singleChildFolderChain("src", list), ["src/main", "src/main/java", "src/main/java/com"]);
  assert.deepEqual(calls, ["src", "src/main", "src/main/java", "src/main/java/com"]);
  assert.deepEqual(await singleChildFolderChain("a", async () => [file("a/only.txt")]), []);
  assert.deepEqual(await singleChildFolderChain("a", async () => [dir("a/b", { symlink: true, link: { target: "x", state: "ok" } })]), []);
  assert.deepEqual(await singleChildFolderChain("a", async () => [dir("a/b"), dir("a/c")]), []);
  assert.deepEqual(await singleChildFolderChain("a", async () => []), []);
  assert.deepEqual(await singleChildFolderChain("missing", list), []);
});

test("av: at most 16 levels", async () => {
  assert.equal(SINGLE_CHILD_EXPAND_LIMIT, 16);
  const list = async (path) => [dir(`${path}/d`)];
  const chain = await singleChildFolderChain("r", list);
  assert.equal(chain.length, 16);
  assert.equal(chain.at(-1), `r${"/d".repeat(16)}`);
});

test("Qo: only a non-link or an ok link opens", () => {
  assert.equal(treeEntryOpenable(file("a.txt")), true);
  assert.equal(treeEntryOpenable({ ...file("l"), link: { target: "a.txt", state: "ok" } }), true);
  for (const state of ["external", "dangling", "cycle"])
    assert.equal(treeEntryOpenable({ ...file("l"), link: { target: "x", state } }), false, state);
});

test("ca7840910 B (was ce9ca5630 g): one 1px border guide per ancestor level from the root icon's centre", () => {
  assert.deepEqual(fileTreeGuideStyle(0), {});
  assert.deepEqual(fileTreeGuideStyle(3), {
    "--file-tree-guides": "repeating-linear-gradient(var(--file-tree-guides-to, to right), var(--cds-border) 0 1px, transparent 1px 10px)",
    "--file-tree-guides-x": "14px", backgroundPosition: "14px 0", backgroundRepeat: "no-repeat", backgroundSize: "30px 100%",
  });
  assert.equal(REVEAL_FLASH_MS, 1200);
});

test("2.42304.0 ca7840910: E reads the fizzy-lake panels part, off in this build; V = L + B; literal --cds-border", () => {
  const V = "../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/";
  const official = read(`${V}ca7840910-DSVFtTw1.js`);
  assert.match(official, /var w=8,T=4;function E\(\)\{return p\("panels"\)\?"sm":"xs"\}/);
  assert.match(official, /import\{co as p\}from"\.\/shared-4-CJsHhp5n\.js"/);
  assert.match(official, /Wl as v/);
  // shared-4 jf: kf("panels") needs the part listed in Ef, and Ef = Cf = [] in this build.
  const gate = read(`${V}shared-4-CJsHhp5n.js`);
  assert.match(gate, /Sf="data-cds-fizzy-lake",Cf=\[\];/);
  assert.match(gate, /var Ef=Cf,Df;/);
  assert.equal(Gate.isFizzyLakePartEnabled("panels"), false);
  const manifest = JSON.parse(read("src/generated/view-tabs/manifest.json"));
  assert.deepEqual(manifest.publicNames.isFizzyLakePartEnabled, { file: "shared-4-CJsHhp5n.js", local: "jf", export: "co" });
  const generated = read("src/generated/code-current/file-tree-style.mjs");
  assert.match(generated, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
  assert.match(generated, /import \{ isFizzyLakePartEnabled as p \} from "\.\.\/view-tabs\/shared-4-CJsHhp5n\.js";/);
  assert.match(generated, /return p\("panels"\) \? "sm" : "xs";/);
  assert.doesNotMatch(generated, /cssVar|const n = \{/);
  // v is shared-frame Wl (local Co), emitted whole rather than restated.
  assert.match(read(`${V}shared-frame-BfjMqbuN.js`), /var Co=\{xs:\{px:12,master:"small",stroke:\{regular:\.8\}\},sm:\{px:16,/);
  assert.equal(Density.iconDensities.xs.px, 12);
  assert.equal(Density.iconDensities.sm.px, 16);
  // xs geometry: 8px pad, 6 + 4 = 10px per level, guides from 8 + 6 = 14px.
  assert.deepEqual(treeIndent(0), { paddingInlineStart: 8 });
  assert.deepEqual(treeIndent(2), { paddingInlineStart: 28 });
  assert.deepEqual(fileTreeRowStyle(0), { paddingInlineStart: 8 });
  for (const depth of [1, 3]) assert.deepEqual(fileTreeRowStyle(depth), { ...treeIndent(depth), ...fileTreeGuideStyle(depth) });
  assert.equal(Style.guideGradient(2),
    "linear-gradient(var(--file-tree-guides-to, to right), transparent 20px, var(--cds-border) 20px 21px, transparent 21px)");
});

function fakeDocument() {
  const view = new EventTarget(), body = { id: "body" };
  const document = { defaultView: view, body, activeElement: body };
  const tree = { ownerDocument: document, nodes: new Set(["row"]), contains(node) { return this.nodes.has(node); } };
  view.addEventListener = view.addEventListener.bind(view);
  const key = (type, key) => Object.assign(new Event(type), { key });
  return { view, document, tree, key };
}

test("c82eca2bd M: the hand-off runs once on Enter release while focus is in the tree or lost", () => {
  const { view, document, tree, key } = fakeDocument();
  let count = 0;
  onEnterReleased(tree, () => count++);
  view.dispatchEvent(key("keyup", "Shift"));
  assert.equal(count, 0);
  document.activeElement = "row";
  view.dispatchEvent(key("keyup", "Enter"));
  view.dispatchEvent(key("keyup", "Enter"));
  assert.equal(count, 1, "one-shot");
  onEnterReleased(tree, () => count++);
  document.activeElement = "elsewhere";
  view.dispatchEvent(key("keyup", "Enter"));
  assert.equal(count, 1, "focus moved elsewhere");
  onEnterReleased(tree, () => count++);
  view.dispatchEvent(new Event("blur"));
  document.activeElement = document.body;
  view.dispatchEvent(key("keyup", "Enter"));
  assert.equal(count, 1, "window blur drops the listener");
  onEnterReleased(tree, () => count++);
  view.dispatchEvent(key("keyup", "Enter"));
  assert.equal(count, 2, "focus lost to the body still hands off");
});

test("Db Oe: the tree coachmark needs the toggle, an open file, room for the tree, a hidden tree, no pop-out", () => {
  const base = { toggleShown: true, hasFile: true, canFit: true, treeVisible: false };
  assert.equal(fileTreeCoachmarkEligible(base), true);
  for (const change of [{ toggleShown: false }, { hasFile: false }, { canFit: false }, { treeVisible: true }, { popout: true }])
    assert.equal(fileTreeCoachmarkEligible({ ...base, ...change }), false, JSON.stringify(change));
});

test("epitaxy_files_tree_nux persists its dismissal and tolerates unavailable storage", () => {
  const data = new Map();
  const storage = { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, value) };
  assert.equal(FILE_TREE_NUX_ID, "epitaxy_files_tree_nux");
  assert.equal(fileTreeNuxDismissed(storage), false);
  dismissFileTreeNux("accepted", storage);
  assert.equal(fileTreeNuxDismissed(storage), true);
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal(fileTreeNuxDismissed(broken), false);
  assert.doesNotThrow(() => dismissFileTreeNux("closed", broken));
});

test("shared-5 Sy: NUXes wait until the account (locally the profile) is a day old; no start time counts as new", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  assert.equal(NUX_ACCOUNT_MIN_AGE_MS, 864e5);
  assert.equal(nuxAccountAged(undefined, now), false);
  assert.equal(nuxAccountAged("not a date", now), false);
  assert.equal(nuxAccountAged(new Date(now - 864e5 + 1).toISOString(), now), false);
  assert.equal(nuxAccountAged(new Date(now - 864e5).toISOString(), now), true);
  assert.equal(nuxAccountAged(now - 3 * 864e5, now), true);
});
