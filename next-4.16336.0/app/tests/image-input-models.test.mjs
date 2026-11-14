import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  validateConnection, normalizeConnection, relayCatalogRow, validateProvider, normalizeProviders, providerOverlayRow, defaultRelayImageModels,
} from "../electron/prefs/model-settings.mjs";
import { setLocale, t } from "../electron/i18n/index.mjs";

const relay = { mode: "relay", relayBaseURL: "https://relay.example.com/anthropic", relayModels: ["glm-5v-turbo", "deepseek-v4.1-flash", "deepseek-v4-pro", "deepseek-flash"] };

test("a relay saved before image input existed marks DeepSeek's image models (flash), not the others", () => {
  assert.deepEqual(defaultRelayImageModels(relay.relayModels), ["deepseek-v4.1-flash", "deepseek-flash"]);
  const connection = normalizeConnection(relay);
  assert.deepEqual(connection.relayImageModels, ["deepseek-v4.1-flash", "deepseek-flash"]);
  const models = relayCatalogRow(connection).config.models;
  assert.deepEqual(models.find((m) => m.id === "deepseek-v4.1-flash").inputModalities, ["text", "image"]);
  assert.equal(models.find((m) => m.id === "deepseek-v4-pro").inputModalities, undefined, "absent = text only in dsh-llm-deepseek");
  assert.equal(models.find((m) => m.id === "glm-5v-turbo").inputModalities, undefined);
});

test("the user's choice wins, unknown ids are dropped, and an empty list means no image models", () => {
  const chosen = validateConnection({ ...relay, relayImageModels: ["glm-5v-turbo", "not-listed"] });
  assert.deepEqual(chosen.relayImageModels, ["glm-5v-turbo"]);
  const images = relayCatalogRow(chosen).config.models.filter((m) => m.inputModalities).map((m) => m.id);
  assert.deepEqual(images, ["glm-5v-turbo"]);
  assert.deepEqual(validateConnection({ ...relay, relayImageModels: [] }).relayImageModels, []);
  assert.deepEqual(normalizeConnection(null).relayImageModels, []);
});

test("custom provider models carry pi-ai `input` only when marked", () => {
  const provider = validateProvider({ route: "openrouter", baseURL: "https://openrouter.ai/api/v1", models: "gpt-4.1-mini qwen3-coder", imageModels: ["gpt-4.1-mini", "x"] });
  assert.deepEqual(provider.imageModels, ["gpt-4.1-mini"]);
  assert.deepEqual(providerOverlayRow([provider]).config.providers.openrouter.models, [{ id: "gpt-4.1-mini", name: "GPT-4.1 Mini", input: ["text", "image"] }, { id: "qwen3-coder", name: "Qwen 3 Coder", reasoningEfforts: { off: null, low: "low", medium: "medium", high: "high" } }]);
  const plain = validateProvider({ route: "plain", baseURL: "https://x.example/v1", models: ["a"] });
  assert.equal("imageModels" in plain, false);
  assert.deepEqual(normalizeProviders([provider])[0].imageModels, ["gpt-4.1-mini"], "kept through the stored list");
});

test("the Accept images chips render one pressed toggle per marked id, in both languages", async (t2) => {
  const path = await import("node:path");
  const app = path.resolve(import.meta.dirname, "..");
  const { createServer } = await import("vite"), react = (await import("@vitejs/plugin-react")).default;
  const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  t2.after(() => server.close());
  const { ImageModelChips } = await server.ssrLoadModule("/src/source-settings-models.jsx");
  const i18n = await server.ssrLoadModule("/electron/i18n/index.mjs");
  t2.after(() => i18n.setLocale("en-US"));
  const html = renderToStaticMarkup(React.createElement(ImageModelChips, { ids: ["glm-5v-turbo", "deepseek-v4-pro"], selected: ["glm-5v-turbo"], onChange() {} }));
  assert.match(html, /role="group"/);
  assert.match(html, /aria-pressed="true"[^>]*>(?:<span[^>]*>✓<\/span>)glm-5v-turbo/);
  assert.match(html, /aria-pressed="false"[^>]*>(?:<span[^>]*>\+<\/span>)deepseek-v4-pro/);
  assert.ok(html.includes("Accept images"));
  assert.equal(renderToStaticMarkup(React.createElement(ImageModelChips, { ids: [], selected: [], onChange() {} })), "", "nothing without model ids");
  i18n.setLocale("zh-CN");
  assert.ok(renderToStaticMarkup(React.createElement(ImageModelChips, { ids: ["a"], selected: [], onChange() {} })).includes("支持图片"));
  setLocale("en-US"); void t;
});

test("saving the relay writes the marked image models; a legacy connection.json gets its defaults on startup", async (t2) => {
  const fs = await import("node:fs"), os = await import("node:os"), path = await import("node:path");
  const { createRequire } = await import("node:module");
  const { createModelSettings } = createRequire(import.meta.url)("../electron/model-settings.cjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image-models-"));
  t2.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: (s) => Buffer.from(`enc:${Buffer.from(s).toString("base64")}`), decryptString: (b) => Buffer.from(String(b).slice(4), "base64").toString() };
  const rows = new Map();
  const profile = { setManagedRow: async (id, row) => { rows.set(id, row); }, removeManagedRow: async (id) => { rows.delete(id); }, setCoreEnv: () => {} };
  const relayProxy = { async start() { return "http://127.0.0.1:4321"; }, async stop() {} };
  const client = { serverInfo: { engine: "deepseek-harness" }, start: async () => {}, request: async () => ({}) };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => client, getHarnessProfile: () => profile, safeStorage, dir, relayProxy });
  const view = await settings.run({ op: "connection-save", connection: { mode: "relay", relayBaseURL: "https://relay.test", relayModels: "glm-5v-turbo\nglm-5.2", relayImageModels: ["glm-5v-turbo"] }, relayKey: "sk-relay" });
  assert.deepEqual(view.relayImageModels, ["glm-5v-turbo"]);
  assert.deepEqual(rows.get("llm-deepseek").config.models, [{ id: "glm-5v-turbo", name: "GLM 5V Turbo", inputModalities: ["text", "image"] }, { id: "glm-5.2", name: "GLM 5.2" }]);

  // A connection saved before image input existed (no relayImageModels): the app's startup rewrite marks deepseek flash.
  fs.writeFileSync(path.join(dir, "connection.json"), JSON.stringify({ version: 1, mode: "relay", relayBaseURL: "https://relay.test", relayModels: ["deepseek-v4.1-flash", "deepseek-v4-pro"] }));
  rows.clear();
  const app = { whenReady: () => Promise.resolve() };
  createModelSettings({ app, getConfig: () => ({}), getClient: () => client, getHarnessProfile: () => profile, safeStorage, dir, relayProxy });
  for (let i = 0; i < 50 && !rows.has("llm-deepseek"); i++) await new Promise((r) => setTimeout(r, 10));
  const models = rows.get("llm-deepseek")?.config.models;
  assert.deepEqual(models?.map((m) => [m.id, m.inputModalities ?? null]), [["deepseek-v4.1-flash", ["text", "image"]], ["deepseek-v4-pro", null]]);
});
