// OpenCode's model menus list providers first, each one's models in a submenu (model-menu-model.mjs modelProviderGroups).
import test from "node:test";
import assert from "node:assert/strict";
import { MODEL_SEARCH_THRESHOLD, modelProviderGroups, modelProviderId, providerModelName } from "../src/model-menu-model.mjs";

// The bridge's catalog entries (opencode-bridge models.js codexModels): provider id, provider name as description.
const entry = (provider, name, id, extra = {}) => ({ id: `${provider}/${id}`, model: `${provider}/${id}`, displayName: name, provider, description: { opencode: "OpenCode Zen", "claude-agent": "Claude Agent", openai: "OpenAI", openrouter: "OpenRouter", myproxy: "My Proxy" }[provider], ...extra });
const catalog = [
  entry("opencode", "Hy4 flash Free", "hy4-flash-free", { isDefault: true, section: "main" }),
  entry("claude-agent", "Haiku 5.5", "claude-haiku-5-5", { section: "main" }),
  entry("openai", "GPT-5.6", "gpt-5.6", { section: "overflow" }),
  entry("opencode", "Big Pickle", "big-pickle", { section: "overflow" }),
  entry("claude-agent", "Opus 5.5", "claude-opus-5-5", { section: "main" }),
  entry("myproxy", "Sonnet 5.5 (My Proxy)", "sonnet", { section: "main" }),
  entry("openai", "GPT-5.6 mini", "gpt-5.6-mini", { section: "main" }),
];

test("providers in catalog order, each with its main models before its overflow ones", () => {
  const groups = modelProviderGroups(catalog, "claude-agent/claude-opus-5-5");
  assert.deepEqual(groups.map((group) => [group.id, group.name]), [["opencode", "OpenCode Zen"], ["claude-agent", "Claude"], ["openai", "OpenAI"], ["myproxy", "My Proxy"]]);
  assert.deepEqual(groups.find((group) => group.id === "openai").models.map((model) => model.displayName), ["GPT-5.6 mini", "GPT-5.6"]);
  assert.deepEqual(groups.find((group) => group.id === "opencode").models.map((model) => model.displayName), ["Hy4 flash Free", "Big Pickle"]);
});

test("the selected model's provider carries it; the others none", () => {
  const groups = modelProviderGroups(catalog, "claude-agent/claude-opus-5-5");
  assert.equal(groups.find((group) => group.id === "claude-agent").selected.model, "claude-agent/claude-opus-5-5");
  assert.deepEqual(groups.filter((group) => group.selected).map((group) => group.id), ["claude-agent"]);
  assert.equal(modelProviderGroups(catalog, null).some((group) => group.selected), false);
});

test("removed and hidden models are left out, the selected one excepted; a provider left empty goes", () => {
  const removed = catalog.map((model) => model.provider === "myproxy" ? { ...model, hidden: true, removedByUser: true } : model);
  assert.equal(modelProviderGroups(removed, null).some((group) => group.id === "myproxy"), false);
  assert.equal(modelProviderGroups(removed, "myproxy/sonnet").find((group) => group.id === "myproxy").selected.model, "myproxy/sonnet");
});

test("one provider, or a model naming none, keeps the flat menu", () => {
  assert.equal(modelProviderGroups(catalog.filter((model) => model.provider === "openai"), null), null);
  assert.equal(modelProviderGroups([...catalog, { id: "plain", model: "plain", displayName: "Plain" }], null), null);
  assert.equal(modelProviderGroups([], null), null);
  // The deprecated row (the selected model no longer listed) is the menu's, not a provider's.
  assert.equal(modelProviderGroups([...catalog, { id: "gone/x", model: "gone/x", section: "deprecated" }], "gone/x").some((group) => group.id === "gone"), false);
});

test("a long provider list gets its search field", () => {
  const many = Array.from({ length: MODEL_SEARCH_THRESHOLD + 1 }, (_, index) => entry("openrouter", `Model ${index}`, `m${index}`));
  const groups = modelProviderGroups([...catalog, ...many], null);
  assert.equal(groups.find((group) => group.id === "openrouter").searchable, true);
  assert.equal(groups.find((group) => group.id === "openai").searchable, false);
});

test("provider ids and names inside a submenu", () => {
  assert.equal(modelProviderId({ model: "anthropic/claude-sonnet-4-5" }), "anthropic");
  assert.equal(modelProviderId({ model: "x/y", provider: "openrouter" }), "openrouter");
  assert.equal(modelProviderId({ model: "gpt-5.6" }), null);
  // The bridge suffixes a name two providers share with the provider's name; inside that provider's submenu it goes.
  assert.equal(providerModelName({ displayName: "Sonnet 5.5 (My Proxy)", description: "My Proxy" }), "Sonnet 5.5");
  assert.equal(providerModelName({ displayName: "Sonnet 5.5", description: "My Proxy" }), "Sonnet 5.5");
  assert.equal(providerModelName({ displayName: "(OpenAI)", description: "OpenAI" }), "(OpenAI)");
  assert.equal(providerModelName({ model: "openai/gpt" }), "openai/gpt");
});

test("a session's provider bucket: named and ordered as the menu lists providers", async () => {
  const { sessionProviderGroup } = await import("../src/model-menu-model.mjs");
  const of = sessionProviderGroup(catalog);
  assert.deepEqual(of("claude-agent/claude-opus-5-5"), { key: "claude-agent", label: "Claude", order: 1 });
  assert.deepEqual(of("openai/gpt-5.6"), { key: "openai", label: "OpenAI", order: 2 });
  // A provider the catalog no longer lists keeps its id as the name and goes after the listed ones.
  assert.deepEqual(of("deepseek/deepseek-chat"), { key: "deepseek", label: "deepseek", order: Infinity });
  assert.equal(of(null), null);
  assert.equal(of("plain"), null);
});

test("a session's provider comes from the catalog entry first, its id's prefix only when the catalog lists it no more", async () => {
  const { sessionProviderGroup } = await import("../src/model-menu-model.mjs");
  const of = sessionProviderGroup([...catalog, { id: "zen/grok", model: "zen/grok", provider: "opencode", description: "OpenCode Zen" }]);
  assert.deepEqual(of("zen/grok"), { key: "opencode", label: "OpenCode Zen", order: 0 });
});

test("New session in {provider}: its most recent session's model, else its default, else its first main model", async () => {
  const { providerStartModel } = await import("../src/model-menu-model.mjs");
  assert.equal(providerStartModel(catalog, "claude-agent", "claude-agent/claude-opus-5-5").model, "claude-agent/claude-opus-5-5");
  assert.equal(providerStartModel(catalog, "claude-agent", null).model, "claude-agent/claude-haiku-5-5");
  assert.equal(providerStartModel(catalog, "opencode", "openai/gpt-5.6").model, "opencode/hy4-flash-free");
  assert.equal(providerStartModel(catalog, "openai", null).model, "openai/gpt-5.6-mini");
  // A recent model the user removed is not offered again; a provider with nothing offered starts nothing.
  const removed = catalog.map((model) => model.model === "claude-agent/claude-opus-5-5" || model.provider === "myproxy" ? { ...model, hidden: true, removedByUser: true } : model);
  assert.equal(providerStartModel(removed, "claude-agent", "claude-agent/claude-opus-5-5").model, "claude-agent/claude-haiku-5-5");
  assert.equal(providerStartModel(removed, "myproxy", "myproxy/sonnet"), null);
  assert.equal(providerStartModel(catalog, "gone", null), null);
});
