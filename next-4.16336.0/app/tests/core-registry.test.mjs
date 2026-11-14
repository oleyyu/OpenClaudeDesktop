import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { allCores, offeredCores, coreAssistant, coreById, coreForEngine, registerCores, hasSignInOptions, coreSandboxed, coreCapabilities, coreSupports, worktreeBranchPrefix } from "../electron/core-registry.mjs";
import { registerCodexPack } from "./codex-pack.mjs";
import { ADAPTERS } from "../../harness/packages/acp-bridge/src/agents/index.js";
import { capabilitiesFor } from "../../harness/packages/opencode-bridge/src/index.js";
import { FLAVORS } from "../../harness/packages/opencode-bridge/src/flavor.js";

const harness = path.resolve(import.meta.dirname, "../../harness/packages");
const read = (file) => fs.readFileSync(path.join(harness, file), "utf8");

test.afterEach(() => registerCores([]));

test("every core has an assistant name for the copy, never the DeepSeek default", () => {
  // Codex is an Extension Pack: offered once added, never built in.
  assert.equal(offeredCores().some((core) => core.id === "codex"), false);
  // A server that reports no engine still reads as Codex (the protocol's own descriptor), pack added or not.
  assert.deepEqual([coreForEngine(undefined).id, coreForEngine("codex").implies.titleRequest], ["codex", true]);
  registerCodexPack();
  for (const core of allCores()) {
    assert.equal(typeof core.assistant, "string", `${core.id} has an assistant`);
    assert.ok(core.assistant.trim(), `${core.id} assistant is not blank`);
    if (core.id !== "deepseek") assert.doesNotMatch(core.assistant, /DeepSeek/, `${core.id} is not called DeepSeek`);
    assert.equal(coreAssistant(core.id), core.available === false ? "DeepSeek" : core.assistant);
  }
  assert.deepEqual(Object.fromEntries(offeredCores().map((core) => [core.id, core.assistant])), {
    deepseek: "DeepSeek", zcode: "GLM", opencode: "OpenCode", mimo: "MiMo",
    kimi: "Kimi", qwen: "Qwen", gemini: "Gemini", minimax: "MiniMax", codex: "Codex",
  });
});

test("coreAssistant falls back to the DeepSeek core only when no core applies", () => {
  for (const value of [undefined, null, "", "no-such-core", { available: false, assistant: "X" }]) assert.equal(coreAssistant(value), "DeepSeek");
  assert.equal(coreAssistant({ id: "x", name: "X Agent" }), "X Agent", "a descriptor without assistant is called by its name");
  assert.equal(coreAssistant(coreById("opencode")), "OpenCode");
});

test("a core's login lists at least one sign-in option, or the core has none (no empty login objects)", () => {
  for (const core of offeredCores().filter((entry) => !["deepseek", "codex"].includes(entry.id))) {
    if (!core.login) { assert.equal(hasSignInOptions(core), false, `${core.id}: no sign-in here`); continue; }
    assert.equal(hasSignInOptions(core.login), true, `${core.id}: a login lists an option (an empty one reads as a Sign in step with nothing in it)`);
    for (const key of ["browser", "apiKey"]) assert.ok(Array.isArray(core.login[key]), `${core.id} login.${key} is a list`);
    for (const entry of core.login.browser) assert.ok((entry.provider || entry.type) && entry.label, `${core.id} browser entry`);
    for (const entry of core.login.deviceCode ?? []) assert.ok(entry.type && entry.label, `${core.id} device-code entry`);
    for (const entry of core.login.apiKey) assert.ok(entry.template && entry.label, `${core.id} API key entry`);
    if (core.login.store !== undefined) assert.match(core.login.store, /^~\//, `${core.id} login.store is a ~/ folder`);
  }
  // Qwen Code: an API key for one of its own providers (qwen/providers/connect), no browser sign-in.
  assert.deepEqual(coreById("qwen").login.browser, []);
  assert.ok(coreById("qwen").login.apiKey.some((entry) => entry.template === "coding-plan:aliyun"));
});

test("hasSignInOptions reads a login, a descriptor, boot.core or an engine/core id", () => {
  registerCodexPack();
  assert.equal(hasSignInOptions({ browser: [], apiKey: [] }), false, "an empty login");
  for (const value of [undefined, null, "", { login: null }]) assert.equal(hasSignInOptions(value), false, JSON.stringify(value));
  assert.equal(hasSignInOptions({ deviceCode: [{ type: "chatgptDeviceCode", label: "x" }] }), true);
  for (const id of ["codex", "zcode", "opencode", "mimo", "kimi", "gemini", "minimax", "qwen"]) {
    assert.equal(hasSignInOptions(id), true, id);
    assert.equal(hasSignInOptions({ engine: coreById(id).engine }), true, `${id} boot.core`);
    assert.equal(hasSignInOptions(coreById(id)), true, `${id} descriptor`);
  }
  for (const id of ["deepseek", "no-such-core"]) assert.equal(hasSignInOptions(id), false, id);
});

test("the ACP descriptors' sign-in options are what the ACP bridge's account/login/start does", () => {
  for (const adapter of ADAPTERS) {
    const login = coreById(adapter.id)?.login;
    // An agent that sets providers up itself (Qwen Code, connectProvider) takes an API key; the others keep keys in
    // their own config.
    if (adapter.connectProvider) assert.ok(login?.apiKey?.length > 0, `${adapter.id} offers its provider keys`);
    if (!adapter.login) { if (!adapter.connectProvider) assert.equal(hasSignInOptions(login), false, `${adapter.id} has no sign-in here`); continue; }
    assert.ok(login, `${adapter.id} descriptor has login`);
    // An API key option only where account/login/start takes one (connectProvider: Kimi Platform, Gemini, MiniMax keys).
    if (!adapter.connectProvider) assert.deepEqual(login.apiKey, [], `${adapter.id} offers no API key sign-in`);
    const type = adapter.login?.type ?? null;
    // account-operations.cjs requires the answer's type to equal the requested one, and Settings › Account sends
    // "chatgpt" for browser rows: a device-code agent lists deviceCode, a browser agent lists browser.
    if (type === "chatgpt") {
      assert.ok(login.browser.length > 0, `${adapter.id} offers its browser sign-in`);
      assert.equal(login.deviceCode, undefined, `${adapter.id} has no device code`);
    } else if (type === "chatgptDeviceCode") {
      assert.deepEqual(login.browser, [], `${adapter.id} has no browser sign-in`);
      assert.ok(login.deviceCode?.length > 0 && login.deviceCode.every((entry) => entry.type === "chatgptDeviceCode"), `${adapter.id} offers its device code`);
    } else {
      assert.equal(type, null);
      assert.deepEqual([login.browser, login.deviceCode ?? []], [[], []], `${adapter.id} offers no sign-in`);
    }
    // Sign-out reaches the agent's own credentials: name them only where account/logout exists.
    if (login.store) assert.equal(typeof adapter.logout, "function", `${adapter.id}: login.store without account/logout`);
  }
});

test("a pack core inherits the built-in descriptor's assistant and sign-in options; a pack-only core is called by its name", () => {
  registerCores([
    { id: "zcode", name: "ZCode", engine: "zcode", kind: "bridge", implies: {} },
    { id: "kimi", name: "Kimi Code", engine: "kimi", kind: "bridge", assistant: "Kimi K3", implies: {} },
    { id: "acme", name: "Acme Agent", engine: "acme", kind: "bridge", implies: {} },
  ]);
  assert.equal(coreById("zcode").assistant, "GLM");
  assert.equal(coreById("zcode").login.browser[0].provider, "zai");
  assert.equal(coreById("kimi").assistant, "Kimi K3", "the pack's own name wins");
  assert.equal(coreById("acme").assistant, "Acme Agent");
  assert.equal(coreAssistant("acme"), "Acme Agent");
});

test("a pack core keeps the built-in sandbox fact, history folder and plugin copy, and an empty pack login falls back", () => {
  registerCores([
    { id: "zcode", name: "ZCode", engine: "zcode", kind: "bridge", implies: {}, login: null },
    { id: "kimi", name: "Kimi Code", engine: "kimi", kind: "bridge", implies: {}, login: { browser: [], apiKey: [] } },
    { id: "acme", name: "Acme Agent", engine: "acme", kind: "bridge", implies: {}, sandbox: false, historyLocation: "~/.acme/sessions" },
  ]);
  assert.equal(coreById("zcode").sandbox, false);
  assert.equal(coreById("zcode").historyLocation, "~/.zcode/cli/db");
  assert.match(coreById("zcode").plugins.format, /zcode-plugin/);
  assert.equal(coreById("kimi").login.deviceCode[0].type, "chatgptDeviceCode", "an empty pack login keeps the built-in options");
  assert.equal(coreById("acme").login, null);
  assert.equal(coreSandboxed("acme"), false);
  assert.equal(coreById("acme").historyLocation, "~/.acme/sessions");
});

test("coreSandboxed: ZCode has no sandbox; an ACP agent reporting none or seatbelt; Codex and others undeclared", () => {
  assert.equal(coreSandboxed("zcode"), false);
  assert.equal(coreSandboxed({ engine: "zcode", capabilities: {} }), false);
  assert.equal(coreSandboxed({ engine: "kimi", capabilities: { sandbox: "none" } }), false);
  assert.equal(coreSandboxed({ engine: "kimi", capabilities: { sandbox: "seatbelt" } }), true);
  assert.equal(coreSandboxed({ engine: "opencode", capabilities: { sandbox: false } }), false);
  for (const id of ["codex", "deepseek", "opencode", "mimo", undefined]) assert.equal(coreSandboxed(id), null, String(id));
});

test("Codex implies what its upstream protocol serves: Plan modes, outputSchema and its own /side (as /btw), no file mentions", () => {
  const caps = coreCapabilities("codex");
  assert.equal(caps.collaborationModes, true);
  assert.equal(caps.structuredOutput, true);
  // main.cjs answers /btw with Codex's ephemeral side-conversation fork (native-side-chat.cjs).
  assert.equal(caps.sideQuestion, true);
  assert.equal(caps.fileMentions, false);
  assert.equal(caps.sandboxNetwork, "policy");
  // A report still wins.
  assert.equal(coreSupports({ engine: "codex", capabilities: { structuredOutput: false } }, "structuredOutput"), false);
  // The upstream app-server (experimental API, which codex.cjs initialize opts into) has collaborationMode/list and
  // turn/start collaborationMode + outputSchema, and no codeDesktop/* methods (protocol 0.155.1 schema).
  const schema = path.resolve(import.meta.dirname, "../../work/codex-schema-0.155.1/ts-experimental");
  if (fs.existsSync(schema)) {
    const requests = fs.readFileSync(path.join(schema, "ClientRequest.ts"), "utf8"), turn = fs.readFileSync(path.join(schema, "v2/TurnStartParams.ts"), "utf8");
    assert.match(requests, /"method": "collaborationMode\/list"/);
    assert.doesNotMatch(requests, /codeDesktop\//);
    assert.match(turn, /collaborationMode\?:/);
    assert.match(turn, /outputSchema\?:/);
  }
});

test("every OpenClaude Desktop core that serves codeDesktop/sideQuestion implies sideQuestion", () => {
  const serves = { deepseek: "codex-app-server/src/index.js", zcode: "zcode-bridge/src/server.js", opencode: "opencode-bridge/src/index.js", mimo: "opencode-bridge/src/index.js" };
  for (const adapter of ADAPTERS) serves[adapter.id] = "acp-bridge/src/server.js";
  for (const [id, file] of Object.entries(serves)) {
    assert.match(read(file), /case 'codeDesktop\/sideQuestion'/, `${id}: ${file} serves it`);
    assert.equal(coreCapabilities(id).sideQuestion, true, `${id} implies sideQuestion`);
  }
});

test("bridge descriptors agree with what their bridge reports in initialize", () => {
  for (const id of ["opencode", "mimo"]) {
    const reported = capabilitiesFor(FLAVORS[id]), implied = coreById(id).implies;
    for (const [key, value] of Object.entries(implied)) if (key in reported) assert.equal(value, reported[key], `${id}.${key}`);
  }
  // ZCode: structuredOutput false and no sandbox (zcode-bridge BASE_CAPABILITIES and README).
  const zcode = read("zcode-bridge/src/server.js");
  assert.match(zcode, /structuredOutput: false/);
  assert.equal(coreCapabilities("zcode").structuredOutput, false);
  assert.match(read("zcode-bridge/README.md"), /ZCode has no sandbox/);
  // The ACP bridge: no outputSchema, network left open by its Seatbelt profile.
  const acp = read("acp-bridge/src/server.js");
  assert.match(acp, /structuredOutput: false/);
  for (const adapter of ADAPTERS) {
    assert.equal(coreCapabilities(adapter.id).structuredOutput, false, adapter.id);
    assert.equal(coreCapabilities(adapter.id).sandboxNetwork, "always", adapter.id);
    assert.equal(coreCapabilities(adapter.id).deleteHistory, adapter.sessionFeatures?.deleteHistory !== false, `${adapter.id} deleteHistory`);
    // A core with its own dynamic workflows says so before it connects (Settings › Dynamic workflows, /workflow).
    assert.equal(coreCapabilities(adapter.id).modelWorkflows === true, Boolean(adapter.workflowRun), `${adapter.id} modelWorkflows`);
  }
  // modelParams travel inside customization, so only a core that ignores them declares modelParams: false (MiniMax,
  // whose adapter says modelParams: false); every other ACP adapter reads config.modelParams and follows customization.
  for (const adapter of ADAPTERS) {
    const source = read(`acp-bridge/src/agents/${adapter.id}.js`), modelParams = coreCapabilities(adapter.id).modelParams;
    const ignores = adapter.modelParams === false || !/config\.modelParams/.test(source);
    assert.equal(modelParams === false, ignores, `${adapter.id} modelParams`);
    assert.notEqual(modelParams, true, `${adapter.id}: modelParams is never implied true (a reported customization:false must still hide the rows)`);
  }
});

test("OpenCode and MiMo offer the ChatGPT headless sign-in their bridge serves as a device code", () => {
  assert.match(read("opencode-bridge/src/index.js"), /params\.type === 'chatgptDeviceCode'/);
  for (const id of ["opencode", "mimo"]) {
    const openai = coreById(id).login.browser.find((entry) => entry.provider === "openai");
    assert.equal(openai?.deviceCode, true, id);
  }
  // MiMo's own provider has no headless method (flavor.js login.headless null).
  assert.equal(FLAVORS.mimo.login.headless, null);
  assert.equal(coreById("mimo").login.browser.find((entry) => entry.provider === "xiaomi").deviceCode, undefined);
});

test("historyLocation and plugin copy: the cores that delete their own history name where it lives", () => {
  for (const [id, location] of Object.entries({ zcode: "~/.zcode/cli/db", opencode: "~/.local/share/opencode", mimo: "~/.local/share/mimocode" }))
    assert.equal(coreById(id).historyLocation, location, id);
  assert.match(coreById("deepseek").historyLocation, /^~\/\.dsh\/sessions$/);
  for (const core of allCores()) if (core.historyLocation) assert.equal(coreSupports(core.id, "deleteHistory"), true, `${core.id}: historyLocation without deleteHistory`);
  for (const id of ["zcode", "opencode", "mimo"]) {
    assert.ok(coreById(id).plugins?.format && coreById(id).plugins?.placeholder, id);
    assert.equal(coreSupports(id, "pluginManage"), true, id);
  }
});

test("worktree branches are named after the running core, never Codex for other cores", () => {
  for (const core of allCores()) {
    assert.equal(worktreeBranchPrefix(core.id), `${core.id}/`);
    assert.equal(worktreeBranchPrefix({ engine: core.engine }), `${core.id}/`);
  }
  assert.equal(worktreeBranchPrefix({ engine: "deepseek-harness", capabilities: {} }), "deepseek/");
  assert.equal(worktreeBranchPrefix({}), "codex/", "Codex's own app-server reports no engine");
  assert.equal(worktreeBranchPrefix("My Agent!"), "my-agent/");
  assert.equal(worktreeBranchPrefix("..."), "code-desktop/");
  assert.equal(worktreeBranchPrefix("x.lock"), "code-desktop/");
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, "../electron/main.cjs"), "utf8"), /worktreeBranchPrefix\(client\?\.serverInfo/);
});
