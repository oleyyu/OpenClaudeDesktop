import test from "node:test";
import assert from "node:assert/strict";
import { PRESETS, modelsURL, presetById, presetDisplayName, presetRoute, testRequest } from "../electron/prefs/provider-presets.mjs";
import { OFFICIAL_BASE_URL, PROVIDER_PROTOCOLS, validateProvider } from "../electron/prefs/model-settings.mjs";

test("every preset is a valid custom provider (DeepSeek is the core's own official connection)", () => {
  const ids = new Set();
  for (const preset of PRESETS) {
    assert.ok(!ids.has(preset.id), preset.id); ids.add(preset.id);
    assert.ok(PROVIDER_PROTOCOLS.includes(preset.api), preset.id);
    assert.ok(preset.variants.length >= 1, preset.id);
    if (preset.builtIn) { assert.equal(preset.variants[0].baseURL, OFFICIAL_BASE_URL); continue; }
    for (const variant of preset.variants) {
      if (preset.id === "custom") { assert.equal(variant.baseURL, ""); continue; }
      assert.match(variant.baseURL, /^https:\/\//, `${preset.id}/${variant.id}`);
      const models = preset.models.length ? preset.models : ["vendor/model"];
      const provider = validateProvider({ route: presetRoute(preset, variant), displayName: presetDisplayName(preset, variant), api: preset.api, baseURL: variant.baseURL, models });
      assert.equal(provider.route.length <= 32, true);
    }
  }
  assert.equal(presetById("deepseek").builtIn, true);
  assert.equal(presetRoute(presetById("deepseek"), presetById("deepseek").variants[0]), null);
});

test("routes and names tell regions apart", () => {
  const kimi = presetById("kimi");
  assert.equal(presetRoute(kimi, kimi.variants[0]), "kimi-cn");
  assert.equal(presetRoute(kimi, kimi.variants[1]), "kimi-intl");
  assert.equal(presetRoute(presetById("anthropic"), presetById("anthropic").variants[0]), "anthropic");
  assert.equal(presetDisplayName(kimi, kimi.variants[1]), "Kimi · International (moonshot.ai)");
});

test("the connection test authenticates the way the core's clients do", () => {
  assert.deepEqual(testRequest({ api: "anthropic-messages", baseURL: "https://api.moonshot.ai/anthropic/", model: "kimi-k3" }),
    { url: "https://api.moonshot.ai/anthropic/v1/messages", auth: "x-api-key", body: { model: "kimi-k3", max_tokens: 1, messages: [{ role: "user", content: "ping" }] } });
  assert.equal(testRequest({ api: "openai-completions", baseURL: "https://openrouter.ai/api/v1", model: "a/b" }).url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(testRequest({ api: "openai-responses", baseURL: "https://api.openai.com/v1", model: "m" }).url, "https://api.openai.com/v1/responses");
  assert.equal(modelsURL({ api: "anthropic-messages", baseURL: "https://api.anthropic.com" }), "https://api.anthropic.com/v1/models");
  assert.equal(modelsURL({ api: "openai-completions", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }), "https://generativelanguage.googleapis.com/v1beta/openai/models");
});
