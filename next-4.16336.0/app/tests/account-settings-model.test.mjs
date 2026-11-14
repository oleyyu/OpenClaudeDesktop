import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { DEEPSEEK_KEYS_URL, accountMenuSignOut, accountSettingsPlan, deepseekKeyDescription, usesCustomEndpoint } from "../src/account-settings-model.mjs";
import { accountReadResponse } from "../../harness/packages/codex-app-server/src/account.js";

// Preferences › DeepSeek account. The DeepSeek bridge's account/read (harness
// account.js) carries `deepseek`; the Codex core keeps the ChatGPT rows.
const deepseek = (keyInfo, platformState) => accountReadResponse({ keyInfo, platformState });

test("no DeepSeek key but an account: the row says the core runs on custom providers", () => {
  assert.match(deepseekKeyDescription({ apiKey: { configured: false } }, { type: "apiKey" }), /^Using your custom providers/);
  assert.match(deepseekKeyDescription({ apiKey: { configured: false } }, null), /^No API key/);
});

test("a DeepSeek snapshot is one API key row described by the key's source, with no sign-in or sign-out", () => {
  const cases = [
    [deepseek({ configured: true, source: "file" }), "Saved in DeepSeek Harness (~/.dsh)"],
    [deepseek({ configured: true, source: "env" }), "From the DEEPSEEK_API_KEY environment variable"],
    [deepseek({ configured: true, source: "user-env" }), "Configured in DeepSeek Harness"],
    [deepseek({ configured: false }, { status: "credential-stored", links: null }), "Signed in to the DeepSeek Platform"],
    [deepseek({ configured: false }, { status: "signed-out", links: null }), "No API key. Add one in Settings › Models, in DeepSeek Harness, or with DEEPSEEK_API_KEY."],
  ];
  for (const [snapshot, description] of cases) {
    const plan = accountSettingsPlan(snapshot);
    assert.deepEqual(plan, { kind: "deepseek", label: "DeepSeek API key", description, showSignOut: false, showSignIn: false, manageUrl: "https://platform.deepseek.com/api_keys" });
    assert.doesNotMatch(JSON.stringify(plan), /ChatGPT|Sign out/);
  }
  assert.match(accountSettingsPlan(deepseek({ configured: false })).description, /DEEPSEEK_API_KEY/);
  assert.equal(DEEPSEEK_KEYS_URL, "https://platform.deepseek.com/api_keys");
});

test("the Codex core keeps the legacy rows; the DeepSeek core never falls back to them", () => {
  assert.deepEqual(accountSettingsPlan({ account: { type: "chatgpt", planType: "plus" }, requiresOpenaiAuth: true }), { kind: "legacy" });
  assert.deepEqual(accountSettingsPlan(null), { kind: "legacy" });
  assert.deepEqual(accountSettingsPlan(null, { engine: "codex" }), { kind: "legacy" });
  assert.equal(accountSettingsPlan(null, { engine: "deepseek" }).description, "Account unavailable");
  // A DeepSeek core without the extension (no credentials service): only the account is known.
  assert.equal(accountSettingsPlan({ account: { type: "apiKey" }, requiresOpenaiAuth: false }, { engine: "deepseek" }).description, "Configured in DeepSeek Harness");
  assert.match(accountSettingsPlan({ account: null, requiresOpenaiAuth: false }, { engine: "deepseek" }).description, /DEEPSEEK_API_KEY/);
  assert.equal(deepseekKeyDescription(undefined, null), "No API key. Add one in Settings › Models, in DeepSeek Harness, or with DEEPSEEK_API_KEY.");
});

let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, ".."), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  M = await server.ssrLoadModule("/src/source-account-settings.jsx");
});
after(() => server?.close());
const noBackend = () => { throw Error("SSR may not call the backend"); };
function rows(props) {
  let result;
  function Probe() {
    result = M.useAccountSettings({ connected: true, busy: false, onLogin: noBackend, onAccountAction: noBackend, onRefreshAccount: noBackend, onOpenExternal: noBackend, ...props });
    return React.createElement(React.Fragment, null, result.map((row) => React.createElement("section", { key: row.id, "data-row": row.id, "data-search": row.searchText ?? "" }, row.label, " ", row.description, row.control, row.below)));
  }
  const html = renderToStaticMarkup(React.createElement(Probe));
  return { rows: result, html };
}

test("rendered DeepSeek rows: Refresh and Manage keys only; Codex rows still offer Sign out and ChatGPT sign-in", () => {
  for (const snapshot of [deepseek({ configured: true, source: "file" }), deepseek({ configured: false })]) {
    const { rows: list, html } = rows({ snapshot, engine: "deepseek" });
    assert.deepEqual(list.map((row) => row.id), ["account"]);
    assert.equal(list[0].label, "DeepSeek API key");
    assert.match(html, />Refresh</);
    assert.match(html, />Manage keys</);
    assert.doesNotMatch(html, /Sign out|ChatGPT|device code|API key authentication/);
    assert.doesNotMatch(list[0].searchText, /Sign out|ChatGPT/);
    assert.match(list[0].searchText, /Manage keys/);
  }
  const unconfigured = rows({ snapshot: deepseek({ configured: false }), engine: "deepseek" });
  assert.match(unconfigured.html, /DEEPSEEK_API_KEY/);
  const codexSignedIn = rows({ snapshot: { account: { type: "chatgpt", email: "a@example.invalid" }, requiresOpenaiAuth: true } });
  assert.match(codexSignedIn.html, />Sign out</);
  const codexSignedOut = rows({ snapshot: { account: null, requiresOpenaiAuth: true } });
  assert.match(codexSignedOut.html, /Sign in with ChatGPT/);
  assert.match(codexSignedOut.html, /Use device code/);
});

test("home: a DeepSeek core without a key gets the key card; the ChatGPT card is only for the Codex core", async () => {
  const fs = await import("node:fs/promises");
  const main = await fs.readFile(path.join(import.meta.dirname, "..", "src/main.jsx"), "utf8");
  assert.match(main, /boot\?\.connected && boot\.account\?\.deepseek && !boot\.account\.account && \(/);
  assert.match(main, /<span className="connection-card-title">\{t\("Add your DeepSeek API key"\)\}<\/span>\s*<span className="connection-card-body">\{t\("Choose Add key and paste your key to start\. A key saved in DeepSeek Harness or set as DEEPSEEK_API_KEY also works; refresh after adding one there\."\)\}<\/span>/);
  // After 'Set up later' the card reopens setup's Connect a model step, the in-app way to add a key.
  assert.match(main, /onClick=\{\(\) => setOnboarding\("connect"\)\}>\{t\("Add key"\)\}/);
  assert.match(main, /call\("account-auth", \{ operation: "refresh" \}\)[\s\S]{0,120}Refresh/);
  assert.match(main, /call\("external", \{ url: DEEPSEEK_KEYS_URL \}\)[\s\S]{0,120}Get an API key/);
  // The sign-in card follows the running core (account-label-model coreSignInPrompt, tested in core-gated-commands.test.mjs):
  // gated off the DeepSeek core (its key card), titled for the core; a native core's browser sign-in reads and starts
  // the descriptor's first browser option (Codex "Continue with ChatGPT", type chatgpt), never hardcoded ChatGPT copy.
  assert.match(main, /const signInPrompt = boot\?\.connected && onboarding !== "signin" \? coreSignInPrompt\(boot\.account, boot\.core\) : null;/);
  const card = main.slice(main.indexOf('data-testid="core-sign-in-card"'), main.indexOf('t("Sign in in your browser to continue.")'));
  assert.match(card, /<span className="connection-card-title">\{t\("Sign in to \{name\}", \{ name: signInPrompt\.name \}\)\}<\/span>/);
  assert.match(card, /signInPrompt\.action === "login" \? \(signInBrowser\?\.label \? t\(signInBrowser\.label\) : $/);
  assert.match(main, /const signInBrowser = signInCore\?\.login\?\.browser\?\.\[0\] \|\| null;/);
  assert.match(main, /call\("login", \{ type: signInBrowser\?\.type \|\| "chatgpt", \.\.\.\(signInBrowser\?\.provider \? \{ codeDesktop: \{ provider: signInBrowser\.provider \} \} : \{\}\) \}\)/);
  assert.doesNotMatch(main, /Continue with your ChatGPT account\./, "no hardcoded ChatGPT body");
  assert.doesNotMatch(main, /t\("Sign in to Codex"\)/, "no hardcoded Codex card");
  assert.doesNotMatch(main, /Set up DeepSeek/);
});

// R02 wiring: without a key the composer warns (Add key opens the key step), send() refuses before any
// thread/start or turn/start, and the account menu reaches the key row in Settings › Preferences.
test("no-key wiring: composer warning + account refresh, a one-line send guard, the account-menu key item", async () => {
  const fs = await import("node:fs/promises");
  const main = await fs.readFile(path.join(import.meta.dirname, "..", "src/main.jsx"), "utf8");
  const missing = "boot?.connected && boot.account?.deepseek && !boot.account.account";
  // Compared with runs of whitespace collapsed, so re-indenting the composer props does not fail the check.
  const flat = (text) => text.replace(/\s+/g, " ");
  const warning = flat(main.slice(main.indexOf("warning={boot !== null"), main.indexOf("onStop={stop}")));
  // The core sign-in warning only when the core itself says it needs one (account/read requiresOpenaiAuth): a bridge
  // that merely reports no account (Gemini with a key in its own .env) keeps the Home card but gets no warning.
  assert.ok(warning.includes(flat(`${missing} ? t("Add a DeepSeek API key to start a session.")\n                    : signInRequired ? t("Sign in to {name} to start a session.", { name: signInPrompt.name }) : undefined}`)));
  assert.match(main, /const signInRequired = !!signInPrompt && boot\.account\?\.requiresOpenaiAuth === true;/);
  // A missing sign-in's action is the sign-in itself, labelled Sign in; the DeepSeek key case is Add key (setup's
  // Connect a model step, as on the home key card); another sign-in prompt re-reads account/read.
  assert.ok(warning.includes(flat(`onReconnect={signInRequired ? startCoreSignIn : ${missing} ? () => setOnboarding("connect")\n                    : boot?.connected && signInPrompt ? () => call("account-auth", { operation: "refresh" }).catch((e) => setError(e.message)) : reconnect}`)));
  assert.ok(warning.includes(flat(`reconnectLabel={signInRequired ? t("Sign in") : ${missing} ? t("Add key") : undefined}`)));
  // send() keeps the draft and starts the core's sign-in instead of a request that would fail with a 401.
  assert.match(main, /\n\s+if \(signInRequired\) \{ startCoreSignIn\(\); return; \}/);
  const send = main.slice(main.indexOf("async function send({ priority, title } = {}) {"), main.indexOf("const parsed = parseSessionCommand(draft, commandContext);", main.indexOf("async function send({ priority, title } = {}) {")));
  assert.match(send, /\n\s+if \(boot\?\.account\?\.deepseek && !boot\.account\.account\) return;/);
  assert.doesNotMatch(send, /setDraft|thread\/start|turn\/start/, "the guard keeps the draft and starts nothing");
  assert.match(main, /\{boot\?\.account\?\.deepseek && <SourceMenu\.Item icon="Key" data-testid="user-menu-deepseek-key" onClick=\{\(\) => setSettings\("preferences"\)\}>\{t\("DeepSeek API key"\)\}<\/SourceMenu\.Item>\}/);
});

// A Codex custom endpoint (Settings › Models): account/read reports requiresOpenaiAuth false and no account.
test("Codex on a custom endpoint: no ChatGPT sign-in rows, setup treats it as signed in", async () => {
  const relay = { account: null, requiresOpenaiAuth: false };
  assert.equal(usesCustomEndpoint(relay, "codex"), true);
  assert.equal(usesCustomEndpoint(relay, { capabilities: {} }), true, "a core reporting no engine is Codex");
  assert.equal(usesCustomEndpoint({ account: null, requiresOpenaiAuth: true }, "codex"), false);
  assert.equal(usesCustomEndpoint({ account: { type: "apiKey" }, requiresOpenaiAuth: false }, "codex"), false);
  assert.equal(usesCustomEndpoint(relay, "deepseek"), false);
  assert.equal(usesCustomEndpoint(relay, "zcode"), false, "only a core with codexProvider");
  assert.equal(usesCustomEndpoint(null, "codex"), false);
  assert.deepEqual(accountSettingsPlan(relay, { engine: "codex" }), { kind: "legacy", customEndpoint: true });
  assert.deepEqual(accountSettingsPlan({ account: null, requiresOpenaiAuth: true }, { engine: "codex" }), { kind: "legacy" });
  const { rows: list, html } = rows({ snapshot: relay, engine: "codex" });
  assert.deepEqual(list.map((row) => row.id), ["account"]);
  assert.match(html, /Using a custom endpoint \(Settings › Models\)/);
  assert.match(html, />Refresh</);
  assert.doesNotMatch(html, /Not signed in|Sign in|device code|Sign out/);
  // A sign-in already under way keeps its rows.
  assert.match(rows({ snapshot: relay, engine: "codex", auth: { phase: "waiting", login: { url: "https://auth.example.invalid" } } }).html, /Cancel sign-in/);
  const fs = await import("node:fs/promises");
  const main = await fs.readFile(path.join(import.meta.dirname, "..", "src/main.jsx"), "utf8");
  assert.match(main, /const signedIn = !!boot\?\.account\?\.account \|\| usesCustomEndpoint\(boot\?\.account, boot\?\.core\);/);
  assert.match(main, /signInOptions\(coreForEngine\(b\.core\?\.engine\)\.login\) && !b\.account\?\.account && !usesCustomEndpoint\(b\.account, b\.core\)\) \{ setOnboarding\("signin"\)/);
});

test("the account menu offers Sign out exactly where Settings does: a connected core with a signed-in account of its own", () => {
  const chatgpt = { account: { type: "chatgpt", email: "a@example.invalid" }, requiresOpenaiAuth: true };
  assert.equal(accountMenuSignOut(chatgpt, { engine: undefined, connected: true }), true, "Codex with ChatGPT");
  assert.equal(accountMenuSignOut(chatgpt, { engine: undefined, connected: false }), false, "nothing to sign out of while disconnected");
  assert.equal(accountMenuSignOut({ account: null, requiresOpenaiAuth: true }, { connected: true }), false, "signed out");
  assert.equal(accountMenuSignOut({ account: { type: "apiKey" } }, { engine: { engine: "kimi-code" }, connected: true }), true, "a bridge core's own account");
  assert.equal(accountMenuSignOut({ account: { type: "apiKey" }, deepseek: { apiKey: { configured: true, source: "file" } } }, { engine: { engine: "deepseek-harness" }, connected: true }), false,
    "the DeepSeek core has a key, not a sign-in");
  assert.equal(accountMenuSignOut(null, { connected: true }), false);
});

