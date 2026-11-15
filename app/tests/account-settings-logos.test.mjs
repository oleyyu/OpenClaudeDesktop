// Settings › Account on a bridge core (OpenCode, ZCode, Qwen Code…): every row leads with a real vendor logo
// (account-brand-model.mjs → brand-logos.mjs), each row's Sign in sits last so they line up, and the API key row keeps
// its key type, field and Save key on one line under the label.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { signInBrand, keyBrand } from "../src/account-brand-model.mjs";
import { BRAND_SVGS } from "../src/brand-logos.mjs";
import { allCores, registerCores } from "../electron/core-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");
test.afterEach(() => registerCores([]));

test("OpenCode's sign-ins and key types each resolve to their own vendor's logo", () => {
  const opencode = allCores().find((core) => core.id === "opencode");
  const signIns = [...opencode.login.browser, ...opencode.login.deviceCode];
  assert.deepEqual(signIns.map((option) => [option.provider, signInBrand(option, opencode.brand)]), [
    ["openai", "openai"], ["poe", "poe"], ["claude-agent", "claude"], ["github-copilot", "githubcopilot"], ["xai", "grok"],
  ]);
  assert.deepEqual(opencode.login.apiKey.map((option) => [option.template, keyBrand(option)]), [
    ["anthropic", "anthropic"], ["openrouter", "openrouter"], ["openai", "openai"], ["zai-coding-plan", "zai"],
    ["moonshotai", "moonshot"], ["minimax", "minimax"], ["deepseek", "deepseek"], ["xai", "xai"],
  ]);
});

test("every built-in core's sign-in shows a logo brand-logos.mjs has; a key type shows its vendor's or none", () => {
  for (const core of allCores()) {
    for (const option of [...(core.login?.browser ?? []), ...(core.login?.deviceCode ?? [])]) {
      const brand = signInBrand(option, core.brand);
      assert.ok(Object.hasOwn(BRAND_SVGS, brand), `${core.id}: ${option.label} → ${brand}`);
    }
    for (const option of core.login?.apiKey ?? []) {
      const brand = keyBrand(option);
      assert.ok(brand === null || Object.hasOwn(BRAND_SVGS, brand), `${core.id}: ${option.label} → ${brand}`);
    }
  }
  // A core's own account with no provider named falls back to the core's logo; a key never does.
  assert.equal(signInBrand({ type: "chatgptDeviceCode", label: "Sign in with your MiniMax account" }, "minimax"), "minimax");
  assert.equal(keyBrand({ template: "requesty", label: "Requesty API key" }), null);
  // Qwen Code's Alibaba Cloud plans, ZCode's BigModel, Kimi's two sites, a key with no template (Codex's).
  assert.equal(keyBrand({ template: "alibabaStandard:cn-hongkong" }), "alibabacloud");
  assert.equal(keyBrand({ template: "token-plan:cn-beijing" }), "alibabacloud");
  assert.equal(signInBrand({ provider: "bigmodel" }, "zai"), "zhipu");
  assert.equal(signInBrand({ provider: "kimi-global" }, "kimi"), "kimi");
  assert.equal(keyBrand({ label: "OpenAI API key" }), "openai");
});

test("a descriptor's own brand wins only when brand-logos.mjs has it: a pack can't name markup or a prototype key", () => {
  assert.equal(signInBrand({ provider: "openai", brand: "claude" }, "opencode"), "claude");
  for (const brand of ["<svg onload=alert(1)>", "__proto__", "constructor", "toString", 7, null]) {
    assert.equal(signInBrand({ provider: "acme", brand }, "opencode"), "opencode", String(brand));
    assert.equal(keyBrand({ template: "acme", brand }), null, String(brand));
  }
  assert.equal(signInBrand({ provider: "acme" }, "__proto__"), null, "an unknown core brand is no logo either");
  assert.equal(signInBrand(null, undefined), null);
});

test("the logos added for Settings › Account are cleaned like the rest: no title, size, inline style or script", () => {
  for (const key of ["poe", "anthropic", "xai", "google", "modelscope"]) {
    const svg = BRAND_SVGS[key];
    assert.match(svg, /^<svg [^>]*viewBox="0 0 24 24"[^>]*>.*<\/svg>$/s, key);
    assert.doesNotMatch(svg, /<title|<script|\sstyle=|\son[a-z]+=|\s(height|width)="1em"/, key);
  }
});

// The page under test is loaded through vite, which has its own copy of core-registry.mjs: a pack core for it is
// registered there (Registry), not through this file's import.
let server, M, Kit, Registry;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  M = await server.ssrLoadModule("/src/source-account-settings.jsx");
  Kit = await server.ssrLoadModule("/src/source-settings-kit.jsx");
  Registry = await server.ssrLoadModule("/electron/core-registry.mjs");
});
after(() => server?.close());

const noBackend = () => { throw Error("SSR may not call the backend"); };
/** The rows the hook returns, and the page as Settings draws it (SettingsGroup → SettingRow). */
function render(props) {
  let rows;
  function Probe() {
    rows = M.useAccountSettings({ connected: true, busy: false, onLogin: noBackend, onAccountAction: noBackend, onRefreshAccount: noBackend, onOpenExternal: noBackend, ...props });
    return React.createElement(Kit.SettingsGroup, { title: "Account", rows });
  }
  return { html: renderToStaticMarkup(React.createElement(Probe)), rows };
}
const rowHtml = (html, id) => html.split('data-setting-id="').find((part) => part.startsWith(`${id}"`)) ?? "";
const brandOf = (html, id) => /class="ss-row-leading"><span class="sbl[^"]*"[^>]*data-brand="([^"]+)"/.exec(rowHtml(html, id))?.[1] ?? null;

test("OpenCode account: every row leads with its logo, Sign in comes last, and only the API key row has a form", () => {
  const { rows, html } = render({ engine: "opencode", snapshot: { account: { type: "apiKey" }, requiresOpenaiAuth: false } });
  const ids = ["account", "signin-openai", "signin-poe", "signin-claude-agent", "device-github-copilot", "device-xai", "apikey"];
  assert.deepEqual(rows.map((row) => row.id), ids);
  assert.deepEqual(ids.map((id) => brandOf(html, id)), ["opencode", "openai", "poe", "claude", "githubcopilot", "grok", "anthropic"]);
  // The logo is decoration (the row's label names the vendor) and the row says it has one, so its below slot indents.
  assert.equal((html.match(/data-leading=""/g) || []).length, ids.length);
  assert.match(rowHtml(html, "signin-openai"), /class="sbl[^"]*"[^>]*aria-hidden="true"/);
  // ChatGPT: the quieter device code first, Sign in last, so Sign in lines up with the rows below.
  const chatgpt = rowHtml(html, "signin-openai");
  assert.ok(chatgpt.indexOf("Use device code") > 0 && chatgpt.indexOf("Use device code") < chatgpt.indexOf(">Sign in<"), "device code before Sign in");
  assert.match(chatgpt, /data-variant="ghost"[^>]*>(?:<[^>]*>)*Use device code/);
  // Five ways in: none is the accent button (the only accent on the page is Save key).
  for (const id of ids.slice(1, 6)) assert.doesNotMatch(rowHtml(html, id), /data-variant="primary"/, id);
  // The API key row: Get a key beside the label; key type, field and Save key in one form below.
  const key = rowHtml(html, "apikey");
  assert.match(key, /class="ss-control"><button type="button" class="ss-account-link">Get a key/);
  assert.match(key, /<form class="ss-account-key" style="--ss-key-type-width:\d+ch">.*role="combobox".*<input type="password"[^>]*placeholder="sk-ant-…".*Save key.*<\/form>/s);
});

test("signed out with one way in, that Sign in is the accent button; with several, none is", (t) => {
  Registry.registerCores([{ id: "acme", name: "Acme", engine: "acme", kind: "bridge", brand: "nope", implies: {}, login: { browser: [{ provider: "acme", label: "Acme account" }] } }]);
  t.after(() => Registry.registerCores([]));
  const solo = render({ engine: "acme", snapshot: { account: null, requiresOpenaiAuth: false } });
  assert.match(rowHtml(solo.html, "signin-acme"), /data-variant="primary"[^>]*>(?:<[^>]*>)*Sign in/);
  // No logo for the vendor or the core: the same tile with a person glyph, never initials.
  assert.match(rowHtml(solo.html, "signin-acme"), /class="ss-row-leading"><span class="sbl ss-account-glyph"/);
  assert.equal(brandOf(solo.html, "signin-acme"), null);
  const several = render({ engine: "opencode", snapshot: { account: null, requiresOpenaiAuth: false } });
  assert.doesNotMatch(several.html.replace(/Save key/g, ""), /data-variant="primary"[^>]*>(?:<[^>]*>)*Sign in/);
});

test("rows without a logo of their own keep the slot (ZCode's Plan), so the copy lines up down the group", () => {
  const { rows, html } = render({ engine: "zcode", snapshot: { account: { type: "apiKey", planType: "Z.ai Coding Plan" }, requiresOpenaiAuth: false } });
  assert.deepEqual(rows.map((row) => row.id).slice(0, 2), ["account", "plan"]);
  assert.match(rowHtml(html, "plan"), /^plan"[^>]*data-leading=""[^>]*><div class="ss-row-top"><div class="ss-row-leading"><span aria-hidden="true"><\/span><\/div>/);
  assert.deepEqual(["account", "signin-zai", "signin-bigmodel", "apikey"].map((id) => brandOf(html, id)), ["zai", "zai", "zhipu", "zai"]);
});

test("a single key (no key type select) names the key in the field; Codex's rows carry no logos", () => {
  const gemini = render({ engine: "gemini", snapshot: { account: null, requiresOpenaiAuth: false } });
  const key = rowHtml(gemini.html, "apikey");
  assert.doesNotMatch(key, /role="combobox"/);
  assert.match(key, /placeholder="Gemini API key"/);
  assert.equal(brandOf(gemini.html, "apikey"), "gemini");
  const codex = render({ engine: "codex", snapshot: { account: null, requiresOpenaiAuth: true } });
  assert.deepEqual(codex.rows.map((row) => row.id), ["account", "signin", "apikey"]);
  assert.doesNotMatch(codex.html, /ss-row-leading|data-leading/);
  assert.match(rowHtml(codex.html, "apikey"), /<form class="ss-account-key"[^>]*>.*placeholder="OpenAI API key".*Save key.*<\/form>/s);
});

test("the key type select is sized to its longest label, within 24–46ch", () => {
  const width = (engine) => Number(/--ss-key-type-width:(\d+)ch/.exec(render({ engine, snapshot: { account: null, requiresOpenaiAuth: false } }).html)[1]);
  assert.ok(width("opencode") >= 24 && width("opencode") <= 30, `OpenCode ${width("opencode")}ch`);
  assert.ok(width("qwen") > width("opencode") && width("qwen") <= 46, `Qwen Code ${width("qwen")}ch`);
});

test("the row styles: a 32px leading slot 12px from the copy, and a below slot that starts under the copy", () => {
  const css = fs.readFileSync(path.join(root, "src/source-settings.css"), "utf8");
  assert.match(css, /\.ss-row-leading\{[^}]*width:32px;margin-inline-end:calc\(12px - var\(--cds-gap-lg,16px\)\)\}/);
  assert.match(css, /\.ss-row\[data-leading\]>\.ss-row-below\{padding-inline-start:44px\}/);
});
