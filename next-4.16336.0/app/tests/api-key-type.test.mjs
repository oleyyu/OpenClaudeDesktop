// A key pasted under the wrong Key type (core descriptor login.apiKey keyPrefix): MiMo's Token Plan tp- keys and its
// pay-as-you-go sk- keys cannot be mixed, so account-operations refuses the mix-up before the core saves it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { coreById, registerCores } from "../electron/core-registry.mjs";
import * as i18n from "../electron/i18n/index.mjs";
import zh from "../electron/i18n/zh-CN/settings.mjs";
const require = createRequire(import.meta.url);
const { createAccountOperations } = require("../electron/account-operations.cjs");
const { validatePack } = require("../electron/extension-packs.cjs");

function fixture(engine = "mimo") {
  const calls = [];
  const owner = { serverInfo: { engine }, start: async () => {}, request: async (method, params) => { calls.push({ method, params }); return method === "account/read" ? { account: { type: "apiKey" }, requiresOpenaiAuth: false } : { type: "apiKey" }; } };
  return { calls, service: createAccountOperations({ getClient: () => owner, openExternal: async () => {} }) };
}
const save = (f, apiKey, template) => f.service.start("apiKey", { apiKey, ...(template ? { codeDesktop: { template } } : {}) });

test("MiMo offers its Token Plan regions beside the pay-as-you-go key, each with its own key page", () => {
  const keys = coreById("mimo").login.apiKey;
  assert.deepEqual(keys.map((entry) => entry.template), ["xiaomi", "xiaomi-token-plan-cn", "xiaomi-token-plan-ams", "xiaomi-token-plan-sgp", "anthropic", "openrouter",
    "openai", "deepseek", "moonshotai", "zai-coding-plan", "minimax", "xai"]);
  for (const entry of keys.filter((key) => key.template.startsWith("xiaomi-token-plan-"))) {
    assert.equal(entry.keyPrefix, "tp-");
    assert.equal(entry.keyUrl, "https://platform.xiaomimimo.com/#/console/plan-manage");
  }
  for (const entry of keys) assert.ok(Object.hasOwn(zh, entry.label), `zh-CN for ${entry.label}`);
});

test("a tp- key under the pay-as-you-go option is refused, naming the Token Plan options; nothing is saved", async () => {
  const f = fixture();
  await assert.rejects(save(f, "tp-abc123", "xiaomi"), (error) => /doesn’t fit “Xiaomi MiMo API key”/.test(error.message)
    && /Token Plan key \(China\)” \/ “Xiaomi MiMo Token Plan key \(Europe\)” \/ “Xiaomi MiMo Token Plan key \(Singapore\)”/.test(error.message));
  assert.equal(f.calls.length, 0);
  assert.equal(f.service.snapshot().phase, "idle");
});

test("an sk- key under a Token Plan option names the pay-as-you-go option; Anthropic and OpenRouter keys name theirs", async () => {
  const f = fixture();
  // Every pay-as-you-go option whose keys start with sk- fits it, so all of them are named.
  await assert.rejects(save(f, "sk-abc123", "xiaomi-token-plan-sgp"), /choose one of “Xiaomi MiMo API key” \/ “OpenAI API key” \/ “DeepSeek API key” \/ “Moonshot \(Kimi\) API key” \/ “MiniMax API key”\.$/);
  await assert.rejects(save(f, "sk-ant-api03-x", "xiaomi"), /choose “Anthropic API key”\.$/);
  await assert.rejects(save(f, "sk-or-v1-x", "xiaomi-token-plan-cn"), /choose “OpenRouter API key”\.$/);
  assert.equal(f.calls.length, 0);
});

test("matching keys, and keys of a format no option claims, go to the core as before", async () => {
  const f = fixture();
  await save(f, "tp-abc123", "xiaomi-token-plan-ams");
  await save(f, "sk-abc123", "xiaomi");
  await save(f, "sk-ant-api03-x", "anthropic");
  await save(f, "unknown-format", "xiaomi");
  assert.deepEqual(f.calls.filter((call) => call.method === "account/login/start").map((call) => call.params.codeDesktop.template), ["xiaomi-token-plan-ams", "xiaomi", "anthropic", "xiaomi"]);
  // A core whose options declare no prefixes (ZCode) never refuses on format.
  const z = fixture("zcode");
  await save(z, "tp-abc123", "zai-api");
  assert.equal(z.calls[0].method, "account/login/start");
});

test("the refusal follows the UI language", async () => {
  const before = i18n.getLocale?.() ?? "en";
  try {
    i18n.setLocale("zh-CN");
    await assert.rejects(save(fixture(), "sk-ant-api03-x", "xiaomi-token-plan-cn"), /^Error: 此密钥不属于“小米 MiMo Token Plan 密钥（中国）”。请在密钥类型中选择 “Anthropic API 密钥”。$/);
    await assert.rejects(save(fixture(), "sk-abc123", "xiaomi-token-plan-cn"), /^Error: 此密钥不属于“小米 MiMo Token Plan 密钥（中国）”。请在密钥类型中选择以下之一：“小米 MiMo API 密钥” \/ /);
  } finally { i18n.setLocale(before); }
});

test("an Extension Pack keeps its key types' placeholders and prefixes (sanitized)", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cd-keytype-"));
  try {
    fs.mkdirSync(path.join(root, "bridge/bin"), { recursive: true });
    fs.writeFileSync(path.join(root, "bridge/bin/app-server.mjs"), "#!/usr/bin/env node\n");
    fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify({ format: 1, version: "1.0.0", description: "MiMo Code for OpenClaude Desktop",
      core: { id: "mimo", name: "MiMo Code", vendor: "Xiaomi", engine: "mimo", kind: "bridge", models: "Xiaomi MiMo models", bridge: { script: "bridge/bin/app-server.mjs" },
        agent: { binary: "mimo", release: { type: "zip" } }, login: { apiKey: [
          { template: "xiaomi", label: "Xiaomi MiMo API key", keyPrefix: "sk-", keyPlaceholder: "sk-…" },
          { template: "xiaomi-token-plan-cn", label: "Xiaomi MiMo Token Plan key (China)", keyPrefix: ["tp-", "bad prefix!", 7] },
          { template: "other", label: "Other", keyPrefix: "", keyPlaceholder: "x".repeat(81) },
        ] } } }));
    assert.deepEqual(validatePack(root).core.login.apiKey, [
      { template: "xiaomi", label: "Xiaomi MiMo API key", keyPlaceholder: "sk-…", keyPrefix: "sk-" },
      { template: "xiaomi-token-plan-cn", label: "Xiaomi MiMo Token Plan key (China)", keyPrefix: "tp-" },
      { template: "other", label: "Other" },
    ]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); registerCores([]); }
});

test("ZCode's Skills folders include the project folders ZCode loads, .zcode before .agents", () => {
  assert.deepEqual([...coreById("zcode").skillRoots], ["<project>/.zcode/skills", "<project>/.agents/skills", "~/.zcode/skills", "~/.agents/skills"]);
});
