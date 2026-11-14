import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { coreById, offeredCores, registerCores, coreSupports } from "../electron/core-registry.mjs";
const require = createRequire(import.meta.url);
const { createExtensionPacks, validatePack } = require("../electron/extension-packs.cjs");
const { createCoreManager } = require("../electron/core-manager.cjs");

function makePack(dir, { core = {}, version = "1.0.0", script = "bridge/bin/app-server.mjs", extra } = {}) {
  fs.mkdirSync(path.join(dir, path.dirname(script)), { recursive: true });
  fs.writeFileSync(path.join(dir, script), "#!/usr/bin/env node\n");
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ format: 1, version, description: "Kimi Code for OpenClaude Desktop",
    core: { id: "kimi", name: "Kimi Code", vendor: "Moonshot", engine: "kimi", kind: "bridge", models: "Kimi models", bridge: { script },
      implies: { customization: true, toolSelection: true, bogus: "yes" }, agent: { binary: "kimi", release: { type: "tgz" } }, ...core }, ...extra }));
  return dir;
}
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cd-packs-")), data = path.join(root, "data");
  fs.mkdirSync(data);
  const config = { core: "deepseek" };
  let changes = 0;
  const packs = createExtensionPacks({ dataDir: () => data, getConfig: () => config, save: () => {}, onChange: () => { changes += 1; }, env: {} });
  return { root, data, config, packs, changes: () => changes };
}

test.afterEach(() => registerCores([]));

test("a pack folder is inspected without installing, then installed, registered and listed", async () => {
  const { root, data, packs, changes } = setup();
  const source = makePack(path.join(root, "kimi-pack"));
  const summary = await packs.inspect(source);
  assert.deepEqual([summary.id, summary.name, summary.version, summary.runsCode, summary.downloadsAgent, summary.replaces], ["kimi", "Kimi Code", "1.0.0", true, true, null]);
  assert.deepEqual(summary.capabilities, ["customization", "toolSelection"], "only true flags with sane names are kept");
  assert.equal(fs.existsSync(path.join(data, "extensions")), false, "inspect installs nothing");
  assert.equal(coreById("kimi").pack, undefined, "still the built-in descriptor");

  await packs.install(summary.token);
  assert.equal(changes(), 1);
  const kimi = coreById("kimi");
  assert.equal(kimi.available, true);
  assert.equal(kimi.bridge.path, path.join(data, "extensions/kimi/bridge/bin/app-server.mjs"));
  assert.equal(kimi.pack.version, "1.0.0");
  assert.ok(offeredCores().some((core) => core.id === "kimi"));
  assert.equal(coreSupports({ engine: "kimi" }, "customization"), true, "the pack's implies drive capabilities");
  assert.deepEqual(packs.list().map((pack) => [pack.id, pack.version]), [["kimi", "1.0.0"]]);
});

test("a zip of the pack folder works; a newer version replaces the installed one", async () => {
  const { root, packs } = setup();
  await packs.install((await packs.inspect(makePack(path.join(root, "v1")))).token);
  const folder = makePack(path.join(root, "zipped", "kimi-pack"), { version: "1.1.0" });
  const zip = path.join(root, "kimi.zip");
  execFileSync("ditto", ["-c", "-k", "--keepParent", folder, zip]);
  const summary = await packs.inspect(zip);
  assert.deepEqual([summary.version, summary.replaces], ["1.1.0", "1.0.0"]);
  await packs.install(summary.token);
  assert.equal(coreById("kimi").pack.version, "1.1.0");
});

test("bad packs are refused with a reason", async () => {
  const { root, packs } = setup();
  await assert.rejects(packs.inspect(path.join(root, "missing")), /Choose an extension pack/);
  const empty = path.join(root, "empty"); fs.mkdirSync(empty);
  await assert.rejects(packs.inspect(empty), /manifest\.json is missing/);
  await assert.rejects(packs.inspect(makePack(path.join(root, "deepseek"), { core: { id: "deepseek" } })), /built-in core/);
  await assert.rejects(packs.inspect(makePack(path.join(root, "bad-id"), { core: { id: "Bad Id" } })), /core id/);
  await assert.rejects(packs.inspect(makePack(path.join(root, "escape"), { core: { bridge: { script: "../outside.mjs" } } })), /bridge script is missing/);
  await assert.rejects(packs.inspect(makePack(path.join(root, "future"), { extra: { format: 2 } })), /newer OpenClaude Desktop/);
  const linked = makePack(path.join(root, "linked"));
  fs.symlinkSync("/etc/hosts", path.join(linked, "hosts"));
  await assert.rejects(packs.inspect(linked), /symbolic links/);
  assert.throws(() => validatePack(empty), /manifest\.json/);
});

test("a pack whose agent program core-manager would refuse is refused at import, not only at Install", () => {
  const { root } = setup();
  const asset = { name: "kimi.tar.gz", size: 10, sha256: "a".repeat(64) };
  const release = (extra = {}) => ({ agent: { binary: "kimi", release: { version: "1.0.0", tag: "v1.0.0", type: "tar.gz", url: "https://example.invalid/{tag}/{name}", assets: { arm64: asset }, ...extra } } });
  assert.equal(validatePack(makePack(path.join(root, "good-release"), { core: release() })).core.agent.binary, "kimi");
  for (const [name, core, reason] of [
    ["http", release({ url: "http://example.invalid/{name}" }), /arm64 can’t be installed: it isn’t downloaded over https/],
    ["no-sum", release({ assets: { arm64: { ...asset, sha256: "nope" } } }), /sha256/],
    ["state", release({ version: "State" }), /plain version name/],
    ["manifest", release({ version: "manifest.json" }), /plain version name/],
    ["escape", release({ assets: { x64: { ...asset, keep: "dir", binaryPath: "../../bin/sh" } } }), /x64 can’t be installed: its binaryPath points outside/],
  ]) assert.throws(() => validatePack(makePack(path.join(root, `bad-${name}`), { core })), reason, name);
  for (const binary of ["../kimi", "bin/kimi", "..", ".", "/usr/bin/kimi"])
    assert.throws(() => validatePack(makePack(path.join(root, `bin-${binary.replace(/\W/g, "_")}`), { core: { agent: { binary } } })), /plain file name/, binary);
  // A native pack that downloads its agent runs it: the import dialog warns about running code.
});

test("a native pack that downloads its agent is shown as running code", async () => {
  const { root, packs } = setup();
  const dir = makePack(path.join(root, "native"), { core: { id: "acme", name: "Acme", engine: "acme", kind: "native", bridge: undefined,
    agent: { binary: "acme", release: { version: "1.0.0", type: "tar.gz", url: "https://example.invalid/{name}", assets: { arm64: { name: "acme.tar.gz", size: 1, sha256: "b".repeat(64) } } } } } });
  const summary = await packs.inspect(dir);
  assert.deepEqual([summary.kind, summary.runsCode, summary.downloadsAgent], ["native", true, true]);
  packs.discard(summary.token);
});

test("every pack is shown as running code, a native one without a release too", async () => {
  const { root, packs } = setup();
  const dir = makePack(path.join(root, "native-system"), { core: { id: "acme", name: "Acme", engine: "acme", kind: "native", bridge: undefined,
    agent: { binary: "acme", systemPaths: ["/opt/homebrew/bin/acme", "~/.local/bin/acme"] } } });
  const summary = await packs.inspect(dir);
  assert.deepEqual([summary.kind, summary.runsCode, summary.downloadsAgent], ["native", true, false]);
  packs.discard(summary.token);
});

test("agent.systemPaths can't point into the app's data folder or the pack, so a pack can't run a file it ships", async () => {
  const { root, data, packs } = setup();
  const native = (systemPaths) => ({ id: "evil", name: "Evil", engine: "evil", kind: "native", bridge: undefined, agent: { binary: "agent.mjs", systemPaths } });
  const shipped = (dir) => { fs.mkdirSync(path.join(dir, "bin"), { recursive: true }); fs.writeFileSync(path.join(dir, "bin/agent.mjs"), "console.log('hi')\n"); return dir; };
  for (const [name, entry] of [
    ["install", path.join(data, "extensions/evil/bin/agent.mjs")],
    ["cores", path.join(data, "cores/evil/1.0.0/agent.mjs")],
    ["dotdot", path.join(data, "elsewhere/../extensions/evil/bin/agent.mjs")],
    ["case", path.join(data, "EXTENSIONS/evil/bin/agent.mjs").replace(path.basename(data), path.basename(data).toUpperCase())],
    ["default", "~/Library/Application Support/OpenClaude Desktop/extensions/evil/bin/agent.mjs"],
  ]) await assert.rejects(packs.inspect(shipped(makePack(path.join(root, `evil-${name}`), { core: native(["/usr/local/bin/evil", entry]) }))), /systemPaths can’t point into/, name);
  const own = shipped(makePack(path.join(root, "evil-own"), { core: native([]) }));
  assert.equal(validatePack(own, { dataDir: data }).core.agent.systemPaths, undefined, "control: an empty list is just dropped");
  // The pack's own folder, wherever it is.
  const self = shipped(makePack(path.join(root, "evil-self"), { core: native([path.join(root, "evil-self/bin/agent.mjs")]) }));
  assert.throws(() => validatePack(self), /systemPaths can’t point into/);
  // A pack folder planted straight into extensions/ (never inspected) is skipped at load too.
  const planted = shipped(makePack(path.join(data, "extensions/evil"), { core: native([path.join(data, "extensions/evil/bin/agent.mjs")]) }));
  assert.ok(fs.existsSync(planted));
  assert.deepEqual(packs.load().map((core) => core.id), []);
});

test("malformed agent.systemPaths are dropped, so one pack can't break the core list", async () => {
  const { root, data, packs } = setup();
  const native = (id, systemPaths) => makePack(path.join(root, id), { core: { id, name: id, engine: id, kind: "native", bridge: undefined, agent: { binary: "agent", systemPaths } } });
  for (const [id, systemPaths, kept] of [
    ["number", 1, undefined], ["numbers", [1], undefined], ["object", { a: "/bin/sh" }, undefined],
    ["mixed", [1, "relative/agent", "/opt/homebrew/bin/agent", null, "~/.local/bin/agent", "bad\npath"], ["/opt/homebrew/bin/agent", "~/.local/bin/agent"]],
    ["many", Array.from({ length: 20 }, (_, index) => `/opt/agent${index}`), Array.from({ length: 12 }, (_, index) => `/opt/agent${index}`)],
  ]) {
    assert.deepEqual(validatePack(native(id, systemPaths)).core.agent.systemPaths, kept, id);
    await packs.install((await packs.inspect(path.join(root, id))).token);
  }
  const manager = createCoreManager({ dataDir: () => data, getConfig: () => ({}), save: () => {}, home: path.join(root, "home"), env: {}, fetchImpl: () => { throw new Error("no network"); } });
  assert.doesNotThrow(() => manager.list());
});

test("a pack keeps the descriptor fields the app reads: capability words and false flags, sandbox, history folder, plugin copy, sign-in details", () => {
  const { root } = setup();
  const core = validatePack(makePack(path.join(root, "fields"), { core: {
    implies: { customization: true, modelParams: false, sandboxNetwork: "always", bogus: "yes", sandboxNetworkX: "policy", "bad key": true },
    sandbox: false, historyLocation: "~/.kimi-code/sessions", plugins: { format: "A plugin folder.", placeholder: "/path/to/plugin", registries: "yes" },
    login: { browser: [{ provider: "openai", label: "ChatGPT Pro/Plus", deviceCode: true }, { type: "chatgpt", label: "Continue" }, { type: "bad type!", label: "x" }],
      deviceCode: [{ type: "chatgptDeviceCode", provider: "kimi", label: "Kimi" }], apiKey: [{ label: "One key" }], store: "~/.kimi-code/credentials", signOutRemovesKeys: true },
  } })).core;
  assert.deepEqual(core.implies, { customization: true, modelParams: false, sandboxNetwork: "always" });
  assert.equal(core.sandbox, false);
  assert.equal(core.historyLocation, "~/.kimi-code/sessions");
  assert.deepEqual(core.plugins, { format: "A plugin folder.", placeholder: "/path/to/plugin" });
  assert.deepEqual(core.login, { browser: [{ provider: "openai", label: "ChatGPT Pro/Plus", deviceCode: true }, { type: "chatgpt", label: "Continue" }],
    deviceCode: [{ type: "chatgptDeviceCode", provider: "kimi", label: "Kimi" }], apiKey: [{ label: "One key" }], store: "~/.kimi-code/credentials", signOutRemovesKeys: true });
  const loose = validatePack(makePack(path.join(root, "loose"), { core: { sandbox: "maybe", historyLocation: "/etc", plugins: { registries: true }, login: { store: "/etc", browser: [{ label: "x" }] } } })).core;
  assert.deepEqual([loose.sandbox, loose.historyLocation, loose.plugins, loose.login], [undefined, undefined, undefined, null]);
  // The summary's "Supports" chips list only what the core has.
  assert.deepEqual(Object.keys(core.implies).filter((key) => core.implies[key] === true), ["customization"]);
});

test("removing a pack unregisters it and moves a session on it back to the DeepSeek core", async () => {
  const { root, data, config, packs } = setup();
  await packs.install((await packs.inspect(makePack(path.join(root, "p")))).token);
  config.core = "kimi";
  packs.remove("kimi");
  assert.equal(fs.existsSync(path.join(data, "extensions/kimi")), false);
  assert.equal(config.core, "deepseek");
  assert.equal(coreById("kimi").pack, undefined, "back to the built-in descriptor");
  assert.throws(() => packs.remove("kimi"), /Unknown extension pack/);
});

test("load registers what is installed (a broken pack folder is skipped)", async () => {
  const { root, data, packs } = setup();
  await packs.install((await packs.inspect(makePack(path.join(root, "p")))).token);
  fs.mkdirSync(path.join(data, "extensions/broken"));
  registerCores([]);
  assert.deepEqual(packs.load().map((core) => core.id), ["kimi"]);
  assert.equal(coreById("kimi").available, true);
});

test("validatePack accepts a relative folder path", () => {
  const { root } = setup();
  const dir = makePack(path.join(root, "rel-pack"));
  const relative = path.relative(process.cwd(), dir);
  assert.equal(validatePack(relative).core.id, "kimi");
});

test("a pack keeps its assistant name (sanitized like the name) and its sign-in options", () => {
  const { root } = setup();
  const kept = validatePack(makePack(path.join(root, "named"), { core: { assistant: "  Kimi  ", login: {
    browser: [{ provider: "google", label: "Sign in with Google" }, { label: "no provider" }],
    deviceCode: [{ type: "chatgptDeviceCode", label: "Sign in with your Kimi account" }, { type: "bad type!", label: "x" }],
    apiKey: [{ template: "kimi", label: "Kimi API key", keyUrl: "javascript:alert(1)" }] } } })).core;
  assert.equal(kept.assistant, "Kimi");
  assert.deepEqual(kept.login, { browser: [{ provider: "google", label: "Sign in with Google" }],
    deviceCode: [{ type: "chatgptDeviceCode", label: "Sign in with your Kimi account" }], apiKey: [{ template: "kimi", label: "Kimi API key" }] });
  for (const assistant of ["x".repeat(41), "Bad\nName", 42, "   "]) assert.equal(validatePack(makePack(path.join(root, `bad-${String(assistant).length}-${typeof assistant}`), { core: { assistant } })).core.assistant, null);
  // A login with no option (the agent signs in only in its own settings) is no login: setup offers no empty Sign in
  // step, and Settings › Account still shows the core's own account row, never Codex's ChatGPT sign-in.
  assert.equal(validatePack(makePack(path.join(root, "empty-login"), { core: { login: { browser: [], apiKey: [] } } })).core.login, null);
  assert.equal(validatePack(makePack(path.join(root, "no-login"))).core.login, null);
});

test("an installed pack without an assistant name keeps the built-in core's, never DeepSeek's", async () => {
  const { root, packs } = setup();
  await packs.install((await packs.inspect(makePack(path.join(root, "p")))).token);
  assert.equal(coreById("kimi").pack.version, "1.0.0");
  assert.equal(coreById("kimi").assistant, "Kimi");
  // Kimi's two device-code regions (kimi.com, kimi.ai).
  assert.deepEqual(coreById("kimi").login.deviceCode.map((entry) => entry.type), ["chatgptDeviceCode", "chatgptDeviceCode"], "and its sign-in options");
});

test("the built Extension Packs (work/agents/*/packs) carry their core's assistant name and sign-in options", () => {
  const work = path.resolve(import.meta.dirname, "../../work/agents");
  let checked = 0;
  for (const bridge of fs.existsSync(work) ? fs.readdirSync(work) : []) {
    const packsDir = path.join(work, bridge, "packs");
    if (!fs.existsSync(packsDir)) continue;
    for (const id of fs.readdirSync(packsDir)) {
      const dir = path.join(packsDir, id);
      if (!fs.statSync(dir).isDirectory() || !fs.existsSync(path.join(dir, "manifest.json"))) continue;
      const { core } = validatePack(dir), builtIn = coreById(id);
      assert.ok(builtIn, `${bridge}/packs/${id} is a known core`);
      assert.equal(core.assistant, builtIn.assistant, `${bridge}/packs/${id} assistant (re-run work/agents/${bridge}/make-pack.mjs)`);
      assert.deepEqual(core.login, JSON.parse(JSON.stringify(builtIn.login ?? null)), `${bridge}/packs/${id} login (re-run work/agents/${bridge}/make-pack.mjs)`);
      // The capabilities and descriptor fields the app reads survive the manifest too.
      assert.deepEqual(core.implies, JSON.parse(JSON.stringify(builtIn.implies ?? {})), `${bridge}/packs/${id} implies (re-run work/agents/${bridge}/make-pack.mjs)`);
      assert.deepEqual(core.agent?.systemPaths, JSON.parse(JSON.stringify(builtIn.agent?.systemPaths ?? null)) ?? undefined, `${bridge}/packs/${id} agent.systemPaths`);
      for (const key of ["sandbox", "historyLocation", "plugins"]) assert.deepEqual(core[key], JSON.parse(JSON.stringify(builtIn[key] ?? null)) ?? undefined, `${bridge}/packs/${id} ${key}`);
      checked += 1;
    }
  }
  if (!fs.existsSync(work)) assert.equal(checked, 0);
});

test("a pack's sessionStore (Settings › Storage) is checked, and a pack without one keeps the built-in descriptor's", () => {
  const { root } = setup();
  const own = validatePack(makePack(path.join(root, "store"), { core: { sessionStore: { files: ["sessions/*/<id>/**", "../x/<id>"] } } })).core;
  assert.deepEqual(own.sessionStore, { files: ["sessions/*/<id>/**"] });
  const bad = validatePack(makePack(path.join(root, "store-bad"), { core: { sessionStore: { database: "/etc" } } })).core;
  assert.equal(bad.sessionStore, undefined);
  registerCores([{ ...bad, bridge: { ...bad.bridge, path: "/x" } }]);
  assert.deepEqual(coreById("kimi").sessionStore, { files: ["sessions/*/<id>/**"] }, "the built-in Kimi layout");
});

test("Codex is a bundled pack: offered until added, added like any pack, and a choice of it made before is kept", async () => {
  const { data, config, packs } = setup();
  assert.equal(coreById("codex"), null, "not a built-in core");
  assert.equal(offeredCores().some((core) => core.id === "codex"), false);
  const [offer] = packs.bundled();
  assert.deepEqual([offer.id, offer.name, offer.vendor, offer.version], ["codex", "Codex", "OpenAI", "0.162.1"]);
  // The pack keeps every fact the Codex descriptor had: word and list capabilities, its home, sign-in and release.
  const { core } = validatePack(offer.path);
  assert.deepEqual([core.kind, core.engine, core.home, core.implies.reviewReadOnly, core.implies.sandboxNetwork, core.implies.nativeTools],
    ["native", "codex", "~/.codex", "sandbox", "policy", ["AskUserQuestion"]]);
  assert.equal(core.login.store, "~/.codex");
  assert.equal(core.agent.release.assets.arm64.sha256.length, 64);
  // A choice of Codex made before it became a pack: added without asking.
  config.core = "codex";
  assert.equal(await packs.installBundled("codex"), true);
  assert.equal(coreById("codex").pack.version, "0.162.1");
  assert.ok(fs.existsSync(path.join(data, "extensions/codex/manifest.json")));
  assert.deepEqual(packs.bundled(), [], "an added pack is no longer offered");
  assert.equal(await packs.installBundled("codex"), false, "already added");
  assert.equal(await packs.installBundled("nope"), false);
  // Removing it falls back to DeepSeek, and it's offered again.
  packs.remove("codex");
  assert.deepEqual([config.core, coreById("codex"), packs.bundled().map((entry) => entry.id)], ["deepseek", null, ["codex"]]);
});

test("a bundled pack added from an older OpenClaude Desktop is replaced by the app's newer copy", async () => {
  const { data, packs } = setup();
  assert.equal(await packs.installBundled("codex"), true);
  assert.deepEqual(await packs.upgradeBundled(), [], "the same version stays");
  const file = path.join(data, "extensions/codex/manifest.json");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/"version": "[^"]+"/, '"version": "0.155.1"'));
  packs.load();
  assert.equal(coreById("codex").pack.version, "0.155.1");
  assert.deepEqual(await packs.upgradeBundled(), ["codex"]);
  assert.equal(coreById("codex").pack.version, "0.162.1");
});
