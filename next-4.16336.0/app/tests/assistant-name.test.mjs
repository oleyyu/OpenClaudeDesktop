import test from "node:test";
import assert from "node:assert/strict";
import { getAssistantName, setAssistantName, setLocale, t, tn } from "../electron/i18n/index.mjs";
import { assistantName } from "../src/persona-store.mjs";

test.afterEach(() => { setAssistantName("DeepSeek"); setLocale("en-US"); });

test("the assistant-as-actor copy names the running core's assistant", () => {
  assert.equal(getAssistantName(), "DeepSeek");
  assert.equal(t("Message DeepSeek"), "Message DeepSeek", "unchanged on the DeepSeek core");
  setAssistantName("Codex");
  assert.equal(t("Message DeepSeek"), "Message Codex");
  assert.equal(t("Stop DeepSeek’s response"), "Stop Codex’s response");
  assert.equal(t("Connection to DeepSeek lost."), "Connection to Codex lost.");
  assert.equal(t("DeepSeek core"), "Codex core");
  assert.equal(tn(2, "{count} item", "{count} items"), "2 items");
  assert.equal(assistantName(), "Codex", "the persona default follows the core");
});

test("DeepSeek's own product, account and pricing terms stay DeepSeek", () => {
  setAssistantName("Codex");
  for (const text of ["DeepSeek API key", "Showing DeepSeek’s official prices.", "by DeepSeek", "Add credits to your DeepSeek balance to continue.",
    "Requests go through a relay that serves DeepSeek’s models.", "Add an OpenAI-compatible endpoint to use its models next to DeepSeek’s.",
    "No DeepSeek usage in the last 30 days.", "DeepSeek Platform usage", "“deepseek” is reserved for the built-in DeepSeek API. Choose another id.",
    "Harness plugins, hooks and profile overlays apply with DeepSeek Harness.",
    "DeepSeek models, and any OpenAI- or Anthropic-compatible API added in Settings › Models"])
    assert.equal(t(text), text, text);
});

test("the DeepSeek core's own description keeps DeepSeek on another core (Settings › Cores, setup), in both languages", async () => {
  const { default: deepseek } = await import("../electron/cores/deepseek.mjs");
  setAssistantName("Codex");
  assert.match(t(deepseek.models), /^DeepSeek models, /);
  setLocale("zh-CN");
  assert.match(t(deepseek.models), /^DeepSeek 模型，/);
  assert.doesNotMatch(t(deepseek.models), /Codex/);
});

test("the Chinese copy follows too, keeping DeepSeek's terms", () => {
  setLocale("zh-CN");
  setAssistantName("GLM");
  assert.match(t("Message DeepSeek"), /GLM/);
  assert.doesNotMatch(t("Message DeepSeek"), /DeepSeek/);
  assert.match(t("DeepSeek API key"), /DeepSeek API/);
});

test("copy that names the running core uses {core}, never a literal DeepSeek; DeepSeek Harness pointers stay", async () => {
  const { default: settings } = await import("../electron/i18n/zh-CN/settings.mjs");
  const coreStrings = Object.keys(settings).filter((key) => key.includes("{core}"));
  for (const key of ["{core} manages its own connection and prices.", "{core} models", "{core} provider",
    "{core} speaks only the OpenAI Responses API, so a relay that serves only /chat/completions can’t run it."]) assert.ok(coreStrings.includes(key), key);
  for (const key of coreStrings) {
    assert.doesNotMatch(key, /DeepSeek/, key);
    assert.doesNotMatch(settings[key], /DeepSeek/, settings[key]);
  }
  setAssistantName("Codex");
  assert.equal(t("{core} models", { core: "Codex" }), "Codex models");
  for (const text of ["Add a relay like that as a custom provider on DeepSeek Harness instead.", "Codex supports only the Responses API. Add a Chat Completions endpoint as a custom provider on DeepSeek Harness."])
    assert.equal(t(text), text, text);
  setLocale("zh-CN");
  assert.match(t("Add a relay like that as a custom provider on DeepSeek Harness instead."), /DeepSeek Harness/);
});

test("every offered core renames the assistant-as-actor copy to its own assistant, in both languages", async () => {
  const { offeredCores, coreAssistant } = await import("../electron/core-registry.mjs");
  for (const locale of ["en-US", "zh-CN"]) {
    setLocale(locale);
    for (const core of offeredCores().filter((entry) => entry.id !== "deepseek")) {
      setAssistantName(coreAssistant(core.id));
      assert.equal(getAssistantName(), core.assistant, core.id);
      for (const text of ["Message DeepSeek", "DeepSeek needs your approval to use a tool.", "DeepSeek proposed a plan"]) {
        assert.doesNotMatch(t(text), /DeepSeek/, `${core.id} ${locale}: ${text}`);
        assert.ok(t(text).includes(core.assistant), `${core.id} ${locale}: ${text}`);
      }
    }
  }
});

test("setAssistantName takes a core descriptor: its assistant, else its name", () => {
  assert.equal(setAssistantName({ id: "opencode", name: "OpenCode", assistant: "OpenCode" }), "OpenCode");
  assert.equal(setAssistantName({ id: "acme", name: "Acme Agent" }), "Acme Agent");
  assert.equal(t("Message DeepSeek"), "Message Acme Agent");
  assert.equal(setAssistantName(null), "DeepSeek");
});

test("the core descriptors' sign-in labels are translated", async () => {
  const { allCores } = await import("../electron/core-registry.mjs");
  const { dictionary } = await import("../electron/i18n/index.mjs");
  const zh = dictionary("zh-CN");
  for (const core of allCores()) for (const entry of [...(core.login?.browser ?? []), ...(core.login?.deviceCode ?? []), ...(core.login?.apiKey ?? [])]) {
    if (/^(Sign in|Continue|Use)\b/.test(entry.label)) assert.ok(Object.hasOwn(zh, entry.label), `${core.id}: ${entry.label}`);
  }
});
