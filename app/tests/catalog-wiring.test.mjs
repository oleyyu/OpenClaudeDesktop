import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { configReadResponse, mcpServerStatuses, pluginReadResponse, pluginsInstalledResponse, skillsListEntry } from "../../harness/packages/codex-app-server/src/catalog.js";
import { mcpRows, pluginRows, skillAuthor, skillMenuItems, skillRows } from "../src/customize-model.mjs";
import { pluginDetailTabs } from "../src/plugin-detail-model.mjs";
const require = createRequire(import.meta.url);
const { mcpDefinitions } = require("../electron/settings-pages.cjs");

// The DeepSeek bridge's settings catalog (harness catalog.js) through the
// app's own Customize and Developer models: the shapes the pages render.
const summary = (over) => ({ description: "d", provider: "filesystem", invocation: { modelInvocable: true, userInvocable: true }, ...over });
const mcpEntry = (id, config, state = 2) => ({ options: { id, name: "@deepseek-ai/dsh-mcp-client", config }, disabled: false, fiber: { state, uid: 1 } });

test("bridge skills/list rows: Personal and Repository groups, You/Repository authors, composer lists user-invocable skills", () => {
  const response = { data: [skillsListEntry("/w", { complete: true, skills: [
    summary({ name: "figma", path: "/x/.agents/skills/figma/SKILL.md", source: "user-agents", description: "Figma" }),
    summary({ name: "lint", path: "/w/.dsh/skills/lint/SKILL.md", source: "project-dsh" }),
    summary({ name: "quiet", path: "/x/.dsh/skills/quiet/SKILL.md", source: "user-dsh", invocation: { modelInvocable: false, userInvocable: true } }),
    summary({ name: "virtual", source: "runtime" }),
    summary({ name: "auto", path: "/x/.dsh/skills/auto/SKILL.md", source: "user-dsh", invocation: { modelInvocable: true, userInvocable: false } }),
  ] })] };
  const { skills, errors } = skillRows(response);
  assert.deepEqual(errors, []);
  assert.deepEqual(skills.map((row) => [row.name, row.group, skillAuthor(row), row.enabled]), [
    ["auto", "personal", "You", true],
    ["figma", "personal", "You", true],
    ["lint", "repository", "Repository", true],
    ["quiet", "personal", "You", false],
  ]);
  // W14-code r4 gen-final-4: skillGroupOptions (test-only host helper, no caller) is deleted.
  // R04: the slash-only 'quiet' is offered (user-invocable); the model-only 'auto' is not.
  assert.deepEqual(skillMenuItems(skills).map((item) => item.skillName), ["figma", "lint", "quiet"]);
  const incomplete = skillRows({ data: [skillsListEntry("/w", { complete: false, skills: [] })] });
  assert.deepEqual(incomplete.errors.map((row) => [row.path, row.message]), [["/w", "Some skill sources could not be read."]]);
});

test("bridge plugin/installed and plugin/read: one row per bundle under the profile marketplace", () => {
  const bundles = [
    { name: "@deepseek-ai/dsh-base", enabled: true, installed: false, rows: [] },
    { name: "@code-desktop/dsh-code-desktop-app", enabled: true, installed: true, description: "x", rows: [{ rowId: "mcp-gh", moduleName: "@deepseek-ai/dsh-mcp-client" }] },
  ];
  const rows = pluginRows(pluginsInstalledResponse(bundles, "/h/profile"), []);
  assert.deepEqual(rows.map((row) => [row.id, row.marketplaceName, row.marketplacePath, row.enabled, row.description, row.source]), [
    ["@code-desktop/dsh-code-desktop-app", "DeepSeek Harness profile", "/h/profile", true, "x", "local"],
    ["@deepseek-ai/dsh-base", "DeepSeek Harness profile", "/h/profile", true, "", "local"],
  ]);
  assert.deepEqual(pluginRows(pluginsInstalledResponse(undefined, "/h/profile")), []);
  const detail = pluginReadResponse(bundles[1], { dir: "/h/profile", mcpEntries: [mcpEntry("mcp-gh", { serverName: "gh" })] }).plugin;
  assert.deepEqual(pluginDetailTabs(detail, rows[0].id).map((tab) => [tab.id, tab.items.map((item) => item.label)]), [["connectors", ["gh"]]]);
});

test("bridge mcpServerStatus/list and config/read: Connectors rows and Developer definitions without secrets", () => {
  const entries = [
    mcpEntry("mcp-gh", { serverName: "gh", transport: "stdio", command: "npx", args: ["-y", "gh-mcp"], env: { GH_TOKEN: "secret-token" } }),
    mcpEntry("mcp-web", { serverName: "web", transport: "streamable-http", url: "https://example.test/mcp", headers: { Authorization: "Bearer secret-token" } }, 3),
  ];
  const rows = mcpRows({ data: mcpServerStatuses(entries, ["mcp__gh__search", "mcp__gh__issue", "read"]), nextCursor: null });
  assert.deepEqual(rows.map((row) => [row.name, row.kind, row.tools, row.authStatus]), [
    ["gh", "connected", ["search", "issue"], "unsupported"],
    ["web", "unreachable", [], "unsupported"],
  ]);
  const definitions = mcpDefinitions(configReadResponse({ mcpEntries: entries }).config);
  assert.deepEqual(definitions, [
    { name: "gh", command: "npx", args: ["-y", "gh-mcp"], environmentNames: ["GH_TOKEN"] },
    { name: "web", url: "https://example.test/mcp", args: [], environmentNames: [] },
  ]);
  assert.equal(JSON.stringify(configReadResponse({ mcpEntries: entries })).includes("secret"), false);
});
