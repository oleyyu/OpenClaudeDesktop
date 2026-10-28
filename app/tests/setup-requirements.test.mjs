import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parseVersion, meetsMinimum, nodeCandidates, createNodeResolver, createSetupRequirements } = require("../electron/setup-requirements.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "setup-req-"));

test("Node versions: 22.19.0 is the minimum, a v prefix is optional", () => {
  assert.deepEqual(parseVersion("v22.19.0"), [22, 19, 0]);
  assert.equal(parseVersion("not a version"), null);
  assert.equal(meetsMinimum("v22.19.0"), true);
  assert.equal(meetsMinimum("22.20.1"), true);
  assert.equal(meetsMinimum("v24.0.0"), true);
  assert.equal(meetsMinimum("v22.18.9"), false);
  assert.equal(meetsMinimum("v20.30.0"), false);
  assert.equal(meetsMinimum(null), false);
});

test("candidates: CODE_DESKTOP_NODE, Homebrew, the official installer, then nvm's versions newest first", () => {
  const list = nodeCandidates({ env: { CODE_DESKTOP_NODE: "/custom/node" }, home: "/Users/me", readdir: () => ["v20.1.0", "v24.2.0", "garbage", "v22.19.0"] });
  assert.deepEqual(list.slice(0, 3), ["/custom/node", "/opt/homebrew/bin/node", "/usr/local/bin/node"]);
  assert.deepEqual(list.slice(-3), ["/Users/me/.nvm/versions/node/v24.2.0/bin/node", "/Users/me/.nvm/versions/node/v22.19.0/bin/node", "/Users/me/.nvm/versions/node/v20.1.0/bin/node"]);
});

test("resolver: an old Homebrew node doesn't shadow a newer nvm one; a missing Node is looked up again next time", () => {
  const versions = { "/opt/homebrew/bin/node": "v18.20.0", "/nvm/node": "v24.1.0" };
  let present = new Set(["/opt/homebrew/bin/node"]);
  const resolver = createNodeResolver({ candidates: () => ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/nvm/node"], exists: (file) => present.has(file), versionOf: (file) => versions[file] ?? null });
  assert.deepEqual(resolver.resolve(), { path: "/opt/homebrew/bin/node", version: "v18.20.0", ok: false });
  present = new Set(["/opt/homebrew/bin/node", "/nvm/node"]);
  assert.deepEqual(resolver.resolve(), { path: "/nvm/node", version: "v24.1.0", ok: true });
  present = new Set();
  assert.equal(resolver.resolve(), null);
});

test("Git: Homebrew's or the Command Line Tools' git counts; /usr/bin/git is never run", async () => {
  const calls = [];
  const exec = async (file, args) => { calls.push([file, ...args]); if (file === "/usr/bin/xcode-select") return "/Library/Developer/CommandLineTools\n"; throw new Error("unexpected"); };
  const make = (files) => createSetupRequirements({ resolveNode: () => null, downloadsDir: () => "/nowhere", openPath: async () => "", exec, exists: (file) => files.includes(file) });
  assert.deepEqual((await make(["/opt/homebrew/bin/git"]).check()).git, { ok: true, path: "/opt/homebrew/bin/git" });
  assert.deepEqual((await make(["/Library/Developer/CommandLineTools/usr/bin/git"]).check()).git, { ok: true, path: "/Library/Developer/CommandLineTools/usr/bin/git" });
  assert.deepEqual((await make([]).check()).git, { ok: false, path: null });
  assert.ok(calls.every(([file]) => file === "/usr/bin/xcode-select"));
  const report = await make([]).check();
  assert.deepEqual(report.node, { ok: false, path: null, version: null, minimum: "22.19.0" });
});

test("install-git hands over to Apple's installer", async () => {
  const launched = [];
  const setup = createSetupRequirements({ resolveNode: () => null, downloadsDir: () => "/nowhere", openPath: async () => "", exec: async () => { throw new Error("no tools"); }, exists: () => false, launch: (file, args) => launched.push([file, ...args]) });
  await setup.run({ op: "install-git" });
  assert.deepEqual(launched, [["/usr/bin/xcode-select", "--install"]]);
  await assert.rejects(setup.run({ op: "nope" }), /Unsupported operation/);
});

// A Node.js dist server: index.json, SHASUMS256.txt and the installer, from base.
function fakeDist(base, { body = Buffer.from("pkg bytes"), sha = crypto.createHash("sha256").update(body).digest("hex"), down = false } = {}) {
  return async (url) => {
    if (!url.startsWith(base) || down) throw new Error(`fetch failed: ${url}`);
    const rest = url.slice(base.length);
    if (rest === "/index.json") return Response.json([{ version: "v25.0.0", lts: false, files: ["osx-x64-pkg"] }, { version: "v24.11.0", lts: "Krypton", files: ["osx-arm64-tar", "osx-x64-pkg"] }, { version: "v22.20.0", lts: "Jod", files: ["osx-x64-pkg"] }]);
    if (rest === "/v24.11.0/SHASUMS256.txt") return new Response(`${"0".repeat(64)}  node-v24.11.0.tar.gz\n${sha}  node-v24.11.0.pkg\n`);
    if (rest === "/v24.11.0/node-v24.11.0.pkg") return new Response(body, { headers: { "content-length": String(body.length) } });
    return new Response("not found", { status: 404 });
  };
}
const settled = async (setup) => { for (let i = 0; i < 100; i++) { const state = await setup.check(); if (!["download", "verify"].includes(state.nodeInstall?.phase)) return state; await new Promise((resolve) => setTimeout(resolve, 10)); } throw new Error("install never settled"); };

test("install-node downloads the newest LTS installer, checks its checksum and opens it", async () => {
  const dir = tmp(), opened = [];
  let node = null;
  const setup = createSetupRequirements({ resolveNode: () => node, downloadsDir: () => dir, openPath: async (file) => { opened.push(file); return ""; }, exec: async () => "", exists: () => false,
    fetchImpl: fakeDist("https://dist.test"), sources: ["https://dist.test"] });
  const first = await setup.run({ op: "install-node" });
  assert.equal(first.nodeInstall.phase, "download");
  const state = await settled(setup);
  assert.equal(state.nodeInstall.phase, "installer");
  assert.equal(state.nodeInstall.version, "v24.11.0");
  assert.deepEqual(opened, [path.join(dir, "node-v24.11.0.pkg")]);
  assert.equal(fs.readFileSync(opened[0], "utf8"), "pkg bytes");
  assert.deepEqual(fs.readdirSync(dir), ["node-v24.11.0.pkg"]);
  // The user finished Installer: the row turns ready and the install record is done.
  node = { path: "/usr/local/bin/node", version: "v24.11.0", ok: true };
  const after = await setup.check();
  assert.equal(after.node.ok, true);
  assert.equal(after.nodeInstall, null);
});

test("install-node: a checksum mismatch is never opened; the mirror is tried next", async () => {
  const dir = tmp(), opened = [];
  const bad = fakeDist("https://bad.test", { sha: "f".repeat(64) }), good = fakeDist("https://mirror.test");
  const setup = createSetupRequirements({ resolveNode: () => null, downloadsDir: () => dir, openPath: async (file) => { opened.push(file); return ""; }, exec: async () => "", exists: () => false,
    fetchImpl: (url) => (url.startsWith("https://bad.test") ? bad(url) : good(url)), sources: ["https://bad.test", "https://mirror.test"] });
  await setup.run({ op: "install-node" });
  const state = await settled(setup);
  assert.equal(state.nodeInstall.phase, "installer");
  assert.equal(opened.length, 1);
});

test("install-node: when every source fails the record says why and nothing is left behind", async () => {
  const dir = tmp();
  const setup = createSetupRequirements({ resolveNode: () => null, downloadsDir: () => dir, openPath: async () => "", exec: async () => "", exists: () => false,
    fetchImpl: fakeDist("https://dist.test", { sha: "f".repeat(64) }), sources: ["https://dist.test", "https://down.test"] });
  await setup.run({ op: "install-node" });
  const state = await settled(setup);
  assert.equal(state.nodeInstall.phase, "failed");
  assert.match(state.nodeInstall.error, /didn't match its published checksum/);
  assert.match(state.nodeInstall.error, /down\.test/);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test("first-run setup opens when the core didn't start, and Requirements comes before Choose your agent", () => {
  const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  const onboarding = fs.readFileSync(new URL("../src/source-onboarding.jsx", import.meta.url), "utf8");
  assert.match(main, /if \(!boot\.connected\) \{\n\s+\/\/ Only a start that failed \(boot\.error\), not a reconnect in flight\.\n\s+if \(!boot\.error\) return;\n\s+onboardingOffered\.current = true;\n\s+setOnboarding\("welcome"\);/);
  assert.doesNotMatch(main, /onboardingOffered\.current \|\| !boot\?\.connected/);
  assert.match(main, /onRequirementsMet=\{onboardingRequirementsMet\}/);
  assert.match(onboarding, /onClick=\{\(\) => setStep\("setup"\)\}>\{t\("Get started"\)\}/);
  assert.match(onboarding, /desktopCall\("setup", \{ op \}\)/);
});
