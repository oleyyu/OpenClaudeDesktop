import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { offeredCores, coreById, coreForEngine, coreName, releaseAsset, registerCores } from "../electron/core-registry.mjs";
const require = createRequire(import.meta.url);
const { createCoreManager, findBinary, releaseProblem, compareVersions } = require("../electron/core-manager.cjs");

// A release tarball like the official one: one binary named codex-<triple> that answers --version.
function fakeRelease(dir, version = "0.155.1") {
  const stage = path.join(dir, "stage");
  fs.mkdirSync(stage, { recursive: true });
  const binary = path.join(stage, "codex-aarch64-apple-darwin");
  fs.writeFileSync(binary, `#!/bin/sh\necho "codex-cli ${version}"\n`, { mode: 0o755 });
  const archive = path.join(dir, "codex.tar.gz");
  execFileSync("tar", ["-czf", archive, "-C", stage, "codex-aarch64-apple-darwin"]);
  const bytes = fs.readFileSync(archive);
  return { archive, bytes, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length };
}

function setup({ release, systemCodex = false, onEvent = () => {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cd-cores-")), home = path.join(root, "home"), data = path.join(root, "data");
  fs.mkdirSync(home); fs.mkdirSync(data);
  if (systemCodex) {
    fs.mkdirSync(path.join(home, ".local/bin"), { recursive: true });
    fs.writeFileSync(path.join(home, ".local/bin/codex"), "#!/bin/sh\necho 'codex-cli 0.150.0'\n", { mode: 0o755 });
  }
  const config = {}, choices = [], events = [];
  let saves = 0;
  const env = {};
  if (release) {
    env.CODE_DESKTOP_CORE_RELEASE_MANIFEST = path.join(root, "release.json");
    fs.writeFileSync(env.CODE_DESKTOP_CORE_RELEASE_MANIFEST, JSON.stringify({ url: "https://example.test/codex.tar.gz", version: "0.155.1", ...release.manifest }));
  }
  const fetches = [];
  const manager = createCoreManager({
    dataDir: () => data, getConfig: () => config, save: () => { saves += 1; }, emit: (event) => { events.push(event); onEvent(event); },
    setCoreChoice: (choice) => choices.push(choice), deepseekScript: () => "/repo/harness/bin/codex-app-server.mjs",
    fetchImpl: async (url) => { fetches.push(url); return release.response ? release.response() : new Response(release.bytes); }, arch: "arm64", home, env,
  });
  return { root, home, data, config, choices, events, manager, fetches, saves: () => saves };
}

test("the registry pins Codex to this app's protocol release and maps engines to cores", () => {
  const codex = coreById("codex");
  assert.equal(codex.agent.release.version, "0.162.1");
  const asset = releaseAsset(codex, "arm64");
  assert.equal(asset.url, "https://github.com/openai/codex/releases/download/rust-v0.162.1/codex-aarch64-apple-darwin.tar.gz");
  assert.match(asset.sha256, /^[0-9a-f]{64}$/);
  assert.equal(coreForEngine(undefined).id, "codex");
  assert.equal(coreForEngine("deepseek-harness").id, "deepseek");
  assert.equal(coreName("deepseek-harness"), "DeepSeek Harness");
  const offered = offeredCores().map((core) => core.id);
  // DeepSeek is the one built-in core and comes first; Codex is an added pack, listed after the built-in ones.
  assert.equal(offered[0], "deepseek");
  assert.equal(offered.at(-1), "codex");
  assert.ok(offeredCores().every((core) => core.available !== false), "cores still being adapted are not offered");
});

test("list reports the built-in bridge, the user's own Codex and the release to download", async () => {
  const { manager } = setup({ systemCodex: true });
  const { cores, selected } = await manager.list();
  assert.equal(selected, "deepseek");
  const deepseek = cores[0], codex = cores.find((core) => core.id === "codex");
  assert.deepEqual([deepseek.installed, deepseek.source, deepseek.selected], [true, "built-in", true]);
  assert.deepEqual([codex.installed, codex.source, codex.version, codex.appInstall], [true, "system", "codex-cli 0.150.0", null]);
  assert.equal(codex.release.version, "0.162.1");
});

test("install downloads, checks the checksum, extracts the binary and records it; remove deletes only the app copy", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = fakeRelease(work);
  const { manager, data, choices, events, config, fetches } = setup({ release: { bytes: release.bytes, manifest: { sha256: release.sha256, size: release.size } } });
  const { cores } = await manager.install("codex");
  const codex = cores.find((core) => core.id === "codex");
  assert.equal(fetches[0], "https://example.test/codex.tar.gz");
  assert.deepEqual([codex.source, codex.version, codex.appInstall.version], ["app", "0.155.1", "0.155.1"]);
  assert.equal(codex.path, path.join(data, "cores/codex/0.155.1/codex"));
  const manifest = JSON.parse(fs.readFileSync(path.join(data, "cores/codex/manifest.json"), "utf8"));
  assert.deepEqual([manifest.reported, manifest.sha256], ["codex-cli 0.155.1", release.sha256]);
  assert.equal(choices.at(-1).agents.codex.path, codex.path, "codex.cjs learns the downloaded binary");
  assert.deepEqual(events.map((event) => event.phase).filter((phase, at, all) => all.indexOf(phase) === at), ["download", "verify", "extract", "done"]);
  assert.deepEqual(fs.readdirSync(path.join(data, "cores/codex")).sort(), ["0.155.1", "manifest.json"], "no download leftovers");

  await manager.select("codex");
  assert.equal(config.core, "codex");
  await manager.uninstall("codex");
  assert.equal(fs.existsSync(path.join(data, "cores/codex")), false);
  assert.equal(config.core, "deepseek", "with no copy left the choice falls back");
});

test("a download that doesn't match the release checksum is not installed", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = fakeRelease(work);
  const { manager, data, events } = setup({ release: { bytes: release.bytes, manifest: { sha256: "0".repeat(64), size: release.size } } });
  await assert.rejects(manager.install("codex"), /checksum/);
  assert.equal(events.at(-1).phase, "failed");
  assert.deepEqual(fs.readdirSync(path.join(data, "cores/codex")), [], "nothing kept");
  assert.equal((await manager.list()).cores[1].installed, false);
});

test("choosing a core that isn't installed is refused", async () => {
  const { manager, config } = setup();
  await assert.rejects(manager.select("codex"), /Install Codex first/);
  assert.equal(config.core, undefined);
  await assert.rejects(manager.select("nope"), /Unknown core/);
});

test("findBinary takes the bare name or the target-triple name at any shallow depth", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-find-"));
  fs.mkdirSync(path.join(dir, "pkg/bin"), { recursive: true });
  fs.writeFileSync(path.join(dir, "pkg/bin/codex-x86_64-apple-darwin"), "");
  fs.writeFileSync(path.join(dir, "pkg/README"), "");
  assert.equal(findBinary(dir, "codex"), path.join(dir, "pkg/bin/codex-x86_64-apple-darwin"));
  assert.equal(findBinary(path.join(dir, "pkg"), "rg"), null);
});

test("a DMG release (ZCode's shape): extractPaths kept as a tree, a Node-script entry run under Node", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-dmg-src-"));
  const resources = path.join(work, "src", "Agent.app", "Contents", "Resources");
  fs.mkdirSync(path.join(resources, "glm"), { recursive: true });
  fs.mkdirSync(path.join(resources, "config"), { recursive: true });
  fs.writeFileSync(path.join(resources, "glm", "agent.cjs"), "console.log('agent 0.16.9')\n");
  fs.writeFileSync(path.join(resources, "config", "builtin.json"), "{}\n");
  fs.mkdirSync(path.join(work, "src", "Agent.app", "Contents", "MacOS"));
  fs.writeFileSync(path.join(work, "src", "Agent.app", "Contents", "MacOS", "huge"), "not copied\n");
  const dmg = path.join(work, "agent.dmg");
  execFileSync("hdiutil", ["create", "-quiet", "-fs", "HFS+", "-srcfolder", path.join(work, "src"), "-volname", "Agent", dmg]);
  const bytes = fs.readFileSync(dmg);
  const { manager, data, choices } = setup({ release: { bytes, manifest: { type: "dmg", keep: "dir", runner: "node", sha256: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length,
    extractPaths: ["Agent.app/Contents/Resources/glm", "Agent.app/Contents/Resources/config"], binaryPath: "Agent.app/Contents/Resources/glm/agent.cjs" } } });
  await manager.install("codex");
  const root = path.join(data, "cores/codex/0.155.1");
  assert.ok(fs.existsSync(path.join(root, "Agent.app/Contents/Resources/config/builtin.json")));
  assert.equal(fs.existsSync(path.join(root, "Agent.app/Contents/MacOS/huge")), false, "only extractPaths are kept");
  const manifest = JSON.parse(fs.readFileSync(path.join(data, "cores/codex/manifest.json"), "utf8"));
  assert.deepEqual([manifest.reported, manifest.runner], ["agent 0.16.9", "node"]);
  assert.equal(choices.at(-1).agents.codex.runner, "node");
});

// A release.json for the test hook, rewritten between installs (an app update that pins a newer release).
const pin = (root, fields) => fs.writeFileSync(path.join(root, "release.json"), JSON.stringify({ url: "https://example.test/codex.tar.gz", ...fields }));
const releaseFields = (release, version) => ({ version, sha256: release.sha256, size: release.size });

test("the bridge state folder survives install, update and Remove download; removeState deletes it", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const first = fakeRelease(path.join(work, "a"), "0.155.1");
  const release = { bytes: first.bytes, manifest: { sha256: first.sha256, size: first.size } };
  const { manager, data, root } = setup({ release });
  const core = path.join(data, "cores/codex"), state = path.join(core, "state");
  fs.mkdirSync(state, { recursive: true });
  fs.writeFileSync(path.join(state, "threads.json"), "{\"archived\":[\"t1\"]}\n");
  fs.writeFileSync(path.join(state, "mcp.json"), "{}\n");

  let { cores } = await manager.install("codex");
  assert.deepEqual(fs.readdirSync(core).sort(), ["0.155.1", "manifest.json", "state"], "install keeps the state folder");
  assert.equal(fs.readFileSync(path.join(state, "threads.json"), "utf8"), "{\"archived\":[\"t1\"]}\n");
  let codex = cores.find((row) => row.id === "codex");
  assert.equal(codex.updateAvailable, false);
  assert.equal(codex.bridgeState.path, state);
  const versionBytes = fs.statSync(path.join(core, "0.155.1/codex")).size + fs.statSync(path.join(core, "manifest.json")).size;
  assert.equal(codex.appInstall.size, versionBytes, "the size is the downloaded copy, not the state");

  // The app now pins a newer release: list reports the update, install replaces the old version in place.
  const second = fakeRelease(path.join(work, "b"), "0.156.0");
  pin(root, releaseFields(second, "0.156.0"));
  release.bytes = second.bytes;
  codex = (await manager.list()).cores.find((row) => row.id === "codex");
  assert.deepEqual([codex.appInstall.version, codex.release.version, codex.updateAvailable], ["0.155.1", "0.156.0", true]);
  ({ cores } = await manager.install("codex"));
  codex = cores.find((row) => row.id === "codex");
  assert.deepEqual([codex.appInstall.version, codex.updateAvailable], ["0.156.0", false]);
  assert.deepEqual(fs.readdirSync(core).sort(), ["0.156.0", "manifest.json", "state"], "the old version goes, the state stays");

  await manager.uninstall("codex");
  assert.deepEqual(fs.readdirSync(core), ["state"], "Remove download keeps the state by default");
  codex = (await manager.list()).cores.find((row) => row.id === "codex");
  assert.deepEqual([codex.installed, codex.appInstall, codex.bridgeState?.path], [false, null, state]);

  await manager.run({ op: "uninstall", id: "codex", removeState: true });
  assert.equal(fs.existsSync(core), false, "removeState deletes the bridge state too");
});

test("a release without a checksum, or whose paths leave its folder, is refused before anything is fetched or removed", async () => {
  const base = { url: "https://example.test/a.tar.gz", version: "1.2.3", sha256: "a".repeat(64), size: 10 };
  assert.equal(releaseProblem(base), null);
  assert.equal(releaseProblem({ ...base, url: "http://127.0.0.1:9/a.tar.gz" }), null, "loopback http is fine (test servers)");
  for (const [change, why] of [
    [{ sha256: undefined }, /sha256/], [{ sha256: "abc" }, /sha256/], [{ size: undefined }, /size/], [{ size: -1 }, /size/],
    [{ url: "http://example.test/a.tar.gz" }, /https/], [{ url: "file:///etc/passwd" }, /https/], [{ url: "nope" }, /URL/],
    [{ version: "../../../victim" }, /version/], [{ version: ".." }, /version/], [{ version: "" }, /version/], [{ version: "state" }, /version/], [{ version: "a/b" }, /version/],
    [{ binaryPath: "../../bin/sh" }, /binaryPath/], [{ binaryPath: "/bin/sh" }, /binaryPath/], [{ keep: "dir" }, /binaryPath/],
    [{ binaryName: "../x" }, /binaryName/], [{ extractPaths: ["ok", "../../escape"] }, /extractPaths/], [{ extractPaths: "x" }, /extractPaths/],
    [{ type: "exe" }, /type/],
    // APFS and HFS+ fold case by default: "State" is the bridge state folder, "Manifest.json" the manifest.
    [{ version: "State" }, /version/], [{ version: "STATE" }, /version/], [{ version: "manifest.json" }, /version/], [{ version: "Manifest.JSON.tmp" }, /version/],
  ]) assert.match(String(releaseProblem({ ...base, ...change })), why, JSON.stringify(change));
  // A pack's agent.binary is as untrusted as its release: it names the installed entry's file.
  assert.equal(releaseProblem(base, { agent: { binary: "agent" } }), null);
  for (const binary of ["../../../victim", "/bin/sh", "bin/agent", "", undefined]) assert.match(String(releaseProblem(base, { agent: { binary } })), /agent binary/, String(binary));
  assert.equal(releaseProblem({ ...base, keep: "dir", binaryPath: "pkg/cli.js" }, { agent: {} }), null, "a kept tree names its entry with binaryPath");
  assert.match(String(releaseProblem({ ...base, keep: "dir", binaryPath: "pkg/cli.js" }, { agent: { binary: "../x" } })), /agent binary/);

  // A pack-style release with a traversal version and no checksum: refused, the victim folder is untouched, nothing fetched.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = fakeRelease(work);
  const { manager, data, fetches, events } = setup({ release: { bytes: release.bytes, manifest: { version: "../../victim", size: release.size } } });
  const victim = path.join(data, "..", "victim");
  fs.mkdirSync(victim, { recursive: true });
  fs.writeFileSync(path.join(victim, "important.txt"), "keep\n");
  await assert.rejects(manager.install("codex"), /can’t be installed: it has no sha256/);
  assert.equal(fs.readFileSync(path.join(victim, "important.txt"), "utf8"), "keep\n");
  assert.deepEqual([fetches.length, events.length], [0, 0]);
});

test("an entry that is a symlink out of the release is refused and the file it points at is untouched", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const outside = path.join(work, "outside.txt");
  fs.writeFileSync(outside, "not a binary\n", { mode: 0o644 });
  const stage = path.join(work, "stage");
  fs.mkdirSync(stage);
  fs.symlinkSync(outside, path.join(stage, "codex"));
  const archive = path.join(work, "evil.tar.gz");
  execFileSync("tar", ["-czf", archive, "-C", stage, "codex"]);
  const bytes = fs.readFileSync(archive);
  const { manager, data } = setup({ release: { bytes, manifest: { sha256: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length, binaryPath: "codex" } } });
  await assert.rejects(manager.install("codex"), /points outside it/);
  assert.equal(fs.statSync(outside).mode & 0o777, 0o644);
  assert.deepEqual(fs.readdirSync(path.join(data, "cores/codex")), []);
});

// A tarball built from a stage folder the caller fills (symlinks kept as symlinks).
function tarOf(dir, build) {
  const stage = path.join(dir, "stage");
  fs.mkdirSync(stage, { recursive: true });
  build(stage);
  const archive = path.join(dir, "release.tar.gz");
  execFileSync("tar", ["-czf", archive, "-C", stage, "."]);
  const bytes = fs.readFileSync(archive);
  return { bytes, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length };
}

test("a pack whose agent.binary leaves the release is refused before anything is fetched, and the file it names is untouched", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = tarOf(work, (stage) => fs.writeFileSync(path.join(stage, "x"), "#!/bin/sh\necho evil\n", { mode: 0o755 }));
  const { manager, data, fetches, events } = setup({ release: { bytes: release.bytes, manifest: {} } });
  const victim = path.join(data, "..", "victim.txt");
  fs.writeFileSync(victim, "precious\n");
  // From <userData>/cores/packa/.download-<pid>-<time>/staged up to the victim, the way the move would have resolved it.
  const binary = path.relative(path.join(data, "cores", "packa", ".download-1-1", "staged"), victim);
  registerCodexPack([{ id: "packa", name: "Pack A", kind: "native", models: [], agent: { binary, systemPaths: [],
    release: { version: "1.0.0", assets: { arm64: { name: "a.tar.gz", url: "https://example.test/a.tar.gz", sha256: release.sha256, size: release.size, binaryPath: "x" } } } } }]);
  try {
    await assert.rejects(manager.install("packa"), /can’t be installed: its agent binary isn’t a plain file name/);
    assert.equal(fs.readFileSync(victim, "utf8"), "precious\n");
    assert.deepEqual([fetches.length, events.length], [0, 0]);
  } finally { registerCodexPack([]); }
});

test("an entry reached through a symlinked folder is refused and the outside file stays where it is", async () => {
  for (const keep of [undefined, "dir"]) {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
    const outside = path.join(work, "Documents");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "notes.txt"), "#!/bin/sh\necho mine\n", { mode: 0o644 });
    const release = tarOf(work, (stage) => fs.symlinkSync(outside, path.join(stage, "d")));
    const { manager, data } = setup({ release: { bytes: release.bytes, manifest: { sha256: release.sha256, size: release.size, binaryPath: "d/notes.txt", ...(keep ? { keep } : {}) } } });
    await assert.rejects(manager.install("codex"), /d\/notes\.txt points outside it/, `keep: ${keep}`);
    assert.equal(fs.readFileSync(path.join(outside, "notes.txt"), "utf8"), "#!/bin/sh\necho mine\n", `keep: ${keep}`);
    assert.equal(fs.statSync(path.join(outside, "notes.txt")).mode & 0o777, 0o644, "not made executable");
    assert.deepEqual(fs.readdirSync(path.join(data, "cores/codex")), []);
  }
});

test("an entry that is a symlink to another file inside the release installs that file", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = tarOf(work, (stage) => {
    fs.mkdirSync(path.join(stage, "bin"));
    fs.writeFileSync(path.join(stage, "bin/real"), "#!/bin/sh\necho 'codex-cli 0.155.1'\n", { mode: 0o755 });
    fs.symlinkSync("bin/real", path.join(stage, "codex"));
  });
  const { manager, data } = setup({ release: { bytes: release.bytes, manifest: { sha256: release.sha256, size: release.size, binaryPath: "codex" } } });
  await manager.install("codex");
  const entry = path.join(data, "cores/codex/0.155.1/codex");
  assert.ok(fs.lstatSync(entry).isFile(), "the real file, not a link");
});

test("a release whose version folds to the bridge state folder is refused and the state is kept", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = fakeRelease(work);
  for (const version of ["State", "STATE", "Manifest.json"]) {
    const { manager, data, fetches } = setup({ release: { bytes: release.bytes, manifest: { version, sha256: release.sha256, size: release.size } } });
    const state = path.join(data, "cores/codex/state");
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(path.join(state, "threads.json"), "{\"archived\":[\"t1\"]}\n");
    await assert.rejects(manager.install("codex"), /version isn’t a plain version name/, version);
    assert.equal(fs.readFileSync(path.join(state, "threads.json"), "utf8"), "{\"archived\":[\"t1\"]}\n");
    assert.deepEqual([fs.readdirSync(path.join(data, "cores/codex")), fetches.length], [["state"], 0]);
  }
});

test("a disk image extract path through a symlink out of the image is refused", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-dmg-src-"));
  const outside = path.join(work, "Documents");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "agent.cjs"), "console.log('mine 1.0')\n");
  fs.mkdirSync(path.join(work, "src"));
  fs.symlinkSync(outside, path.join(work, "src", "link"));
  const dmg = path.join(work, "agent.dmg");
  execFileSync("hdiutil", ["create", "-quiet", "-fs", "HFS+", "-srcfolder", path.join(work, "src"), "-volname", "Agent", dmg]);
  const bytes = fs.readFileSync(dmg);
  const { manager, data } = setup({ release: { bytes, manifest: { type: "dmg", keep: "dir", runner: "node", sha256: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length,
    extractPaths: ["link/agent.cjs"], binaryPath: "link/agent.cjs" } } });
  await assert.rejects(manager.install("codex"), /link\/agent\.cjs points outside it/);
  assert.equal(fs.readFileSync(path.join(outside, "agent.cjs"), "utf8"), "console.log('mine 1.0')\n");
  assert.deepEqual(fs.readdirSync(path.join(data, "cores/codex")), []);
});

test("Cancel while unpacking stops the update and leaves the installed copy as it was", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const first = fakeRelease(path.join(work, "a"), "0.155.1");
  const release = { bytes: first.bytes, manifest: { sha256: first.sha256, size: first.size } };
  let manager;
  const setupResult = setup({ release, onEvent: (event) => { if (event.phase === "extract") manager.cancel("codex"); } });
  manager = setupResult.manager;
  const { data, root, events } = setupResult;
  // The first install runs with Cancel stubbed out, so the hook only bites on the update.
  const cancelOff = manager.cancel; manager.cancel = () => true;
  await manager.install("codex");
  manager.cancel = cancelOff;
  const before = fs.readFileSync(path.join(data, "cores/codex/manifest.json"), "utf8");

  const second = fakeRelease(path.join(work, "b"), "0.156.0");
  pin(root, releaseFields(second, "0.156.0"));
  release.bytes = second.bytes;
  await assert.rejects(manager.install("codex"), /^Error: Download cancelled\.$/);
  assert.deepEqual([events.at(-1).phase, events.at(-1).error], ["failed", "Download cancelled."]);
  assert.equal(fs.readFileSync(path.join(data, "cores/codex/manifest.json"), "utf8"), before);
  assert.deepEqual(fs.readdirSync(path.join(data, "cores/codex")).sort(), ["0.155.1", "manifest.json"], "no new version, no download leftovers");
  const codex = (await manager.list()).cores.find((row) => row.id === "codex");
  assert.deepEqual([codex.version, codex.download], ["0.155.1", null]);
});

test("download folders left by a quit or crash are swept on start and on the next install", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cd-release-"));
  const release = fakeRelease(work);
  const { manager, data } = setup({ release: { bytes: release.bytes, manifest: { sha256: release.sha256, size: release.size } } });
  const core = path.join(data, "cores/codex");
  const plant = () => {
    for (const name of [".download-999999999-1", `.download-${process.pid}-1`]) {
      fs.mkdirSync(path.join(core, name, "unpacked"), { recursive: true });
      fs.writeFileSync(path.join(core, name, "codex.tar.gz"), Buffer.alloc(4096));
    }
    fs.mkdirSync(path.join(core, "state"), { recursive: true });
  };
  plant();
  manager.apply();
  assert.deepEqual(fs.readdirSync(core), ["state"], "swept at start; the state stays");
  plant();
  await manager.install("codex");
  assert.deepEqual(fs.readdirSync(core).sort(), ["0.155.1", "manifest.json", "state"]);
});

test("compareVersions orders release versions numerically", () => {
  assert.equal(compareVersions("0.156.0", "0.155.1"), 1);
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("v1.2", "1.2.0"), 0);
  assert.equal(compareVersions("3.14.3", "3.14.10"), -1);
});
