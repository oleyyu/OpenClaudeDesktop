import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { accountFooter, accountIdentity, accountMenuLines, accountOrgLine, connectionMenuHeader } from "../src/account-label-model.mjs";
import { setAssistantName } from "../electron/i18n/index.mjs";
import { coreName } from "../electron/core-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");

// Original sidebar-rows tV: identity, then `orgPrimary · orgSecondary` (or orgPrimary alone).
test("account menu org line: 'DeepSeek API · API key' for a key account, never 'DeepSeek · DeepSeek'", () => {
  const key = accountMenuLines({ account: { type: "apiKey" }, requiresOpenaiAuth: false });
  assert.deepEqual(key, { orgPrimary: "DeepSeek API", orgSecondary: "API key" });
  assert.equal(accountOrgLine(key), "DeepSeek API · API key");
  for (const snapshot of [{ account: null }, null, undefined, { account: { type: "chatgpt", planType: "plus" } }]) {
    const lines = accountMenuLines(snapshot);
    assert.deepEqual(lines, { orgPrimary: "DeepSeek API", orgSecondary: null });
    assert.equal(accountOrgLine(lines), "DeepSeek API");
    assert.doesNotMatch(accountOrgLine(lines), /DeepSeek · DeepSeek/);
  }
});

// R02, shared-21 IO (sidebar-rows.js:8597-8613): identity = principal name || provider label; with a
// principal the org line is label (+ subtitle), without one it is the subtitle alone.
test("the DeepSeek core on custom providers only is labelled 'Custom provider', not 'DeepSeek API'", () => {
  const custom = { account: { type: "apiKey" }, deepseek: { apiKey: { configured: false } } };
  assert.deepEqual(accountMenuLines(custom, "deepseek"), { orgPrimary: "Custom provider", orgSecondary: "API key" });
  assert.equal(accountMenuLines({ ...custom, deepseek: { apiKey: { configured: true, source: "env" } } }, "deepseek").orgPrimary, "DeepSeek API");
  assert.equal(accountMenuLines({ ...custom, deepseek: { apiKey: { configured: false }, platform: "credential-stored" } }, "deepseek").orgPrimary, "DeepSeek API");
});

test("account identity: the preferred name with 'DeepSeek API' (· API key), else the provider label itself", () => {
  const key = { account: { type: "apiKey" }, requiresOpenaiAuth: false };
  assert.deepEqual(accountIdentity("Ada Lovelace", key), { identity: "Ada Lovelace", orgPrimary: "DeepSeek API", orgSecondary: "API key" });
  assert.equal(accountOrgLine(accountIdentity("Ada Lovelace", key)), "DeepSeek API · API key");
  assert.deepEqual(accountIdentity("Ada Lovelace", { account: null }), { identity: "Ada Lovelace", orgPrimary: "DeepSeek API", orgSecondary: null });
  for (const name of ["", "   ", null, undefined]) {
    assert.deepEqual(accountIdentity(name, key), { identity: "DeepSeek API", orgPrimary: "API key", orgSecondary: null }, "no invented 'Local user'");
    for (const snapshot of [{ account: null }, null, undefined, { account: { type: "chatgpt", planType: "plus" } }])
      assert.deepEqual(accountIdentity(name, snapshot), { identity: "DeepSeek API", orgPrimary: null, orgSecondary: null });
  }
  assert.equal(accountIdentity("  Grace  ", null).identity, "Grace");
});

test("the Connection settings header names the running core", () => {
  assert.equal(connectionMenuHeader("deepseek", true), "DeepSeek Harness connected");
  assert.equal(connectionMenuHeader("deepseek", false), "DeepSeek Harness disconnected");
  assert.equal(connectionMenuHeader("codex", true), "Codex connected");
  assert.equal(connectionMenuHeader("codex", false), "Codex disconnected", "the Codex fixture text (approval-ui.mjs) is unchanged");
  assert.equal(connectionMenuHeader(undefined, false), "Codex disconnected");
});

test("main.jsx renders the IO identity in the header and footer, with no 'Local user' fallback", async () => {
  const main = await fs.readFile(path.join(root, "src/main.jsx"), "utf8");
  assert.match(main, /const accountLines = accountIdentity\(displayName, boot\?\.account, boot\?\.core \|\| boot\?\.config\?\.core \|\| undefined\);/);
  assert.match(main, /const accountButton = accountFooter\(displayName, boot\?\.account, boot\?\.core \|\| boot\?\.config\?\.core \|\| undefined\);/);
  assert.match(main, /data-testid="user-menu-header">\{accountLines\.identity\}</);
  assert.match(main, /\{accountLines\.orgPrimary && <span className="smenu-header-line smenu-header-secondary" data-testid="user-menu-header-org">\{accountOrgLine\(accountLines\)\}<\/span>\}/);
  assert.match(main, /displayName=\{accountButton\.name\}\s+accountLabel=\{accountButton\.plan\}\s+avatarName=\{accountButton\.avatarName\}/);
  assert.match(main, /<SourceMenu\.Header>\{connectionMenuHeader\(engine, !!boot\?\.connected\)\}<\/SourceMenu\.Header>/);
  assert.doesNotMatch(main, /Local user/);
  assert.doesNotMatch(main, /\{accountLabel\} · DeepSeek/);
  assert.doesNotMatch(main, /planType \|\| "DeepSeek API"/);
  const sidebar = await fs.readFile(path.join(root, "src/source-sidebar.jsx"), "utf8");
  assert.doesNotMatch(sidebar, /displayName\.split\(/, "the first-name rule lives in accountFooter");
  assert.match(sidebar, /<span className="whitespace-nowrap text-secondary max-w-full shrink-0 truncate">\{accountName\}<\/span>/);
});

// R02 account menu (sidebar-rows.js:16155-16432 $B, pw w-[17rem] at sidebar-groups.js:5250-5253).
test("account menu: 17rem popup, DeepSeek key row, View changelog, Learn more holding Keyboard shortcuts", async () => {
  const css = await fs.readFile(path.join(root, "src/source-menu.css"), "utf8");
  assert.match(css, /\.smenu-popup\.account-menu \{ width: 17rem; \}/);
  assert.match(css, /\.smenu-popup\.account-learn-more \{ min-width: 208px; \}/);
  assert.ok(css.indexOf(".smenu-popup.account-menu {") < css.indexOf(".smenu-popup.smenu-sheet {"), "the coarse sheet keeps its full width");
  const main = await fs.readFile(path.join(root, "src/main.jsx"), "utf8");
  const account = main.slice(main.indexOf('case "account":'), main.indexOf('case "connection":'));
  const order = ['t("Settings")}</SourceMenu.Item>', 't("Usage")}</SourceMenu.Item>', 't("Language")}</SourceMenu.Item>', 't("DeepSeek API key")}</SourceMenu.Item>', "<SourceMenu.Separator />",
    't("View changelog")}</SourceMenu.Item>', '<SourceMenu.SubmenuTrigger icon="Info">{t("Learn more")', 't("Keyboard shortcuts")}</SourceMenu.Item>'].map((needle) => account.indexOf(needle));
  assert.ok(order.every((index) => index > 0), `every item present: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, "Settings, Usage, Language, key row, separator, View changelog, Learn more › Keyboard shortcuts");
  // sidebar-rows.js:16140-16460 has no appearance item: Light / Dark / System lives in Settings › Theme.
  assert.doesNotMatch(account, /appearance"\)/, "no invented Dark / Light appearance item");
  assert.match(account, /\{boot\?\.account\?\.deepseek && <SourceMenu\.Item icon="Key" data-testid="user-menu-deepseek-key" onClick=\{\(\) => setSettings\("preferences"\)\}>\{t\("DeepSeek API key"\)/);
  assert.match(account, /<SourceMenu\.Item icon="Scroll" onClick=\{\(\) => setWhatsNew\(true\)\}>\{t\("View changelog"\)/);
  assert.match(account, /<SourceMenu\.Popup label=\{t\("Learn more"\)\} className="account-learn-more">[\s\S]*<SourceMenu\.Item shortcut=\{SHORTCUTS_DIALOG_KEYS\} onClick=\{\(\)=>setActionDialog\(\{kind:"shortcuts"\}\)\}>\{t\("Keyboard shortcuts"\)/);
  assert.doesNotMatch(account, /icon="Keyboard"/, "Keyboard shortcuts left the top level");
  assert.doesNotMatch(account, /https?:\/\//, "no invented Learn more URLs");
});

// Before boot (init waits for the core to connect) no core is passed: the label is the window's own core
// (the first-paint assistant name), so a Kimi or Codex window never reads "DeepSeek API" while its core starts.
test("without a reported core the account label names the window's core, not 'DeepSeek API'", () => {
  try {
    setAssistantName("Kimi");
    assert.deepEqual(accountIdentity("", undefined, undefined), { identity: coreName("kimi"), orgPrimary: null, orgSecondary: null });
    assert.notEqual(coreName("kimi"), "DeepSeek API");
    assert.equal(accountMenuLines(null).orgPrimary, coreName("kimi"));
    setAssistantName("Codex");
    assert.equal(accountIdentity("", null).identity, coreName("codex"));
    // A reported core still wins over the window's.
    assert.equal(accountMenuLines({ account: { type: "apiKey" } }, "deepseek").orgPrimary, "DeepSeek API");
    setAssistantName("DeepSeek");
    assert.equal(accountIdentity("", undefined).identity, "DeepSeek API");
  } finally { setAssistantName("DeepSeek"); }
});

// shared-19 E0 footer, user ruling 2026-10-18: CDS Avatar of the full name (C0 / x0), the first word (VWt), `· plan`.
test("account footer: initials name, first name, and 'API' / the plan / the core as the suffix", () => {
  const key = { account: { type: "apiKey" }, requiresOpenaiAuth: false };
  assert.deepEqual(accountFooter("Oley Yu", key, "deepseek"), { avatarName: "Oley Yu", name: "Oley", plan: "API" });
  assert.deepEqual(accountFooter("  Oley   Yu ", { account: { type: "apiKey" }, deepseek: { apiKey: { configured: true } } }, "deepseek").name, "Oley");
  // A DeepSeek key reported only by the extension still reads as a key.
  assert.equal(accountFooter("Oley Yu", { account: null, deepseek: { apiKey: { configured: true } } }, "deepseek").plan, "API");
  // Codex's ChatGPT sign-in: planLabel(planType).
  const chatgpt = (planType) => ({ account: { type: "chatgpt", email: "fixture@example.com", planType }, requiresOpenaiAuth: true });
  assert.equal(accountFooter("Oley Yu", chatgpt("plus"), "codex").plan, "Plus");
  assert.equal(accountFooter("Oley Yu", chatgpt("pro"), "codex").plan, "Pro");
  // A bridge's own sign-in name is shown as reported.
  assert.equal(accountFooter("Oley Yu", { account: { type: "chatgpt", planType: "Z.ai Coding Plan" } }, "zcode").plan, "Z.ai Coding Plan");
  // A subscription sign-in without a plan ('unknown' / none) falls back to the core's name.
  assert.equal(accountFooter("Oley Yu", chatgpt("unknown"), "codex").plan, coreName("codex"));
  assert.equal(accountFooter("Oley Yu", chatgpt(undefined), "codex").plan, coreName("codex"));
  // No account: the provider label, as before.
  assert.equal(accountFooter("Oley Yu", { account: null }, "deepseek").plan, "DeepSeek API");
  // No preferred name: the signed-in email, else the provider label, never repeated as the suffix.
  assert.deepEqual(accountFooter("", chatgpt("plus"), "codex"), { avatarName: "fixture@example.com", name: "fixture@example.com", plan: "Plus" });
  assert.deepEqual(accountFooter(null, { account: null }, "deepseek"), { avatarName: "DeepSeek API", name: "DeepSeek API", plan: "" });
  assert.deepEqual(accountFooter("", key, "deepseek"), { avatarName: "DeepSeek API", name: "DeepSeek API", plan: "API" });
  // A name without spaces (CJK) is kept whole.
  assert.equal(accountFooter("张三", key, "deepseek").name, "张三");
});
