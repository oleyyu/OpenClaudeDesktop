import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { accountSettingsPlan } from "../src/account-settings-model.mjs";
import { allCores, registerCores, hasSignInOptions } from "../electron/core-registry.mjs";

// Settings › Account plans: only Codex gets the legacy ChatGPT rows. Every other core (a bridge, a pack core, native or
// not, or one whose descriptor lists no sign-in) gets its own account row plus exactly the options its descriptor lists.
test.afterEach(() => registerCores([]));

test("only Codex keeps the ChatGPT rows; a core without sign-in options gets its own account row and nothing to sign in with", () => {
  assert.equal(accountSettingsPlan(null, { engine: "codex" }).kind, "legacy");
  assert.equal(accountSettingsPlan({ account: null }, {}).kind, "legacy", "no engine reported is Codex");
  for (const core of allCores().filter((entry) => !["deepseek", "codex"].includes(entry.id))) {
    const plan = accountSettingsPlan({ account: null, requiresOpenaiAuth: false }, { engine: core.engine });
    assert.equal(plan.kind, "bridge", core.id);
    assert.equal(plan.name, core.name);
    assert.equal(plan.browser.length + plan.deviceCode.length + plan.apiKey.length > 0, hasSignInOptions(core), `${core.id}: options match the descriptor`);
  }
  // Qwen Code: no browser or device sign-in, its own providers' API keys (qwen/providers/connect).
  const qwen = accountSettingsPlan({ account: null, requiresOpenaiAuth: false }, { engine: { engine: "qwen", capabilities: {} } });
  assert.deepEqual([qwen.kind, qwen.browser, qwen.deviceCode], ["bridge", [], []]);
  assert.ok(qwen.apiKey.length > 0);
  // A pack-only core with no login, and an engine the registry doesn't know yet: never Codex's ChatGPT sign-in.
  registerCores([{ id: "acme", name: "Acme Agent", engine: "acme", kind: "bridge", implies: {} }]);
  assert.deepEqual(accountSettingsPlan(null, { engine: "acme" }), { kind: "bridge", name: "Acme Agent", browser: [], deviceCode: [], apiKey: [] });
  assert.equal(accountSettingsPlan(null, { engine: "unknown-agent" }).kind, "bridge");
});

test("a native pack core with its own sign-in gets its options, not ChatGPT's", () => {
  registerCores([{ id: "acme", name: "Acme", engine: "acme", kind: "native", implies: {}, agent: { binary: "acme" },
    login: { browser: [{ type: "chatgpt", label: "Continue with Acme" }], apiKey: [] } }]);
  const plan = accountSettingsPlan({ account: null, requiresOpenaiAuth: true }, { engine: "acme" });
  assert.equal(plan.kind, "bridge");
  assert.deepEqual(plan.browser, [{ type: "chatgpt", label: "Continue with Acme" }]);
});

let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, ".."), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  M = await server.ssrLoadModule("/src/source-account-settings.jsx");
});
after(() => server?.close());
const noBackend = () => { throw Error("SSR may not call the backend"); };
function render(props) {
  let rows;
  function Probe() {
    rows = M.useAccountSettings({ connected: true, busy: false, onLogin: noBackend, onAccountAction: noBackend, onRefreshAccount: noBackend, onOpenExternal: noBackend, ...props });
    return React.createElement(React.Fragment, null, rows.map((row) => React.createElement("section", { key: row.id }, row.label, " ", row.description, row.control, row.below)));
  }
  return { html: renderToStaticMarkup(React.createElement(Probe)), rows };
}

test("Settings › Account on Qwen Code: its account row and a provider key row, no ChatGPT or browser Sign in rows", () => {
  const { rows, html } = render({ engine: "qwen", snapshot: { account: null, requiresOpenaiAuth: false } });
  assert.deepEqual(rows.map((row) => row.id), ["account", "apikey"]);
  assert.match(html, /Not signed in/);
  assert.match(html, /Coding Plan/);
  assert.doesNotMatch(html, /ChatGPT|Use device code|>Sign in</);
  const keyed = render({ engine: "qwen", snapshot: { account: { type: "apiKey" }, requiresOpenaiAuth: false } });
  assert.match(keyed.html, /Signed in with an API key/);
});

test("Settings › Account on OpenCode and MiMo: the ChatGPT Pro/Plus row also offers a device code", () => {
  for (const engine of ["opencode", "mimo"]) {
    const { rows, html } = render({ engine, snapshot: { account: null, requiresOpenaiAuth: true } });
    const row = rows.find((entry) => entry.id === "signin-openai");
    assert.ok(row, engine);
    assert.match(row.searchText, /device code/);
    assert.match(html, /Use device code/);
  }
  // MiMo's own Xiaomi sign-in has no headless method.
  const mimo = render({ engine: "mimo", snapshot: { account: null } });
  assert.doesNotMatch(renderToStaticMarkup(mimo.rows.find((entry) => entry.id === "signin-xiaomi").control), /Use device code/);
});
