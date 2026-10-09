import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  applySkillEnabled, customizeCore, filterMcp, filterPlugins, filterSkills, mcpBatchWriteParams, mcpRows, mcpServerConfigValue, mcpStatusKind,
  patchMcpRow, pluginMenuGroups, pluginRows, shortDate, skillAuthor, skillGroupOptions, skillMenuItems, skillRows, splitArguments, joinArguments,
  validateServerName, pluginDisplayNames, filterMcpByStatus, connectorDetailState, connectorDetailMessage, connectorsListView, MCP_STATUS_FILTERS, CONNECTOR_ACTION_LABELS,
  skillInvocable, skillTrigger, MCP_STATUS_LABELS, CONNECTOR_TOASTS,
} from "../src/customize-model.mjs";
import { createCustomizeStore } from "../src/customize-store.mjs";
import { skillChipInput } from "../src/composer-attachments-model.mjs";
const require = createRequire(import.meta.url);
const { createCustomizeOperations, mcpServerValue } = require("../electron/customize-operations.cjs");

const skill = (over) => ({ name: "demo", description: "Demo skill", path: "/home/u/.codex/skills/demo/SKILL.md", scope: "user", enabled: true, pluginId: null, ...over });
const listing = {
  data: [
    { cwd: "/repo", skills: [
      skill({ name: "zeta", description: "Last by name" }),
      skill({ name: "alpha", path: "/repo/.agents/skills/alpha/SKILL.md", scope: "repo", interface: { displayName: "Alpha Skill", shortDescription: "Short" }, description: "Long" }),
      skill({ name: "off", path: "/home/u/.codex/skills/off/SKILL.md", enabled: false }),
      skill({ name: "plug", path: "/home/u/.codex/plugins/p/skills/plug/SKILL.md", pluginId: "acme-plugin" }),
      skill({ name: "sys", path: "/opt/codex/skills/sys/SKILL.md", scope: "system" }),
    ], errors: [{ path: "/repo/.agents/skills/broken/SKILL.md", message: "invalid frontmatter" }] },
    // A second cwd repeating a skill must not duplicate rows or errors.
    { cwd: "/other", skills: [skill({ name: "zeta", description: "dup" })], errors: [{ path: "/repo/.agents/skills/broken/SKILL.md", message: "invalid frontmatter" }] },
  ],
};

test("skills flatten per cwd, dedupe by path, sort by display name and keep real mtimes only", () => {
  const rows = skillRows(listing, { "/home/u/.codex/skills/demo/SKILL.md": 1_700_000_000, "/opt/codex/skills/sys/SKILL.md": "nope" });
  assert.deepEqual(rows.skills.map((row) => row.name), ["Alpha Skill", "off", "plug", "sys", "zeta"]);
  assert.equal(rows.skills.find((row) => row.name === "Alpha Skill").description, "Short");
  assert.equal(rows.skills.find((row) => row.name === "zeta").updatedAt, 1_700_000_000);
  assert.equal(rows.skills.find((row) => row.name === "sys").updatedAt, null);
  assert.equal(rows.errors.length, 1);
  assert.equal(rows.errors[0].name, "broken");
  assert.deepEqual(rows.skills.map((row) => row.group), ["repository", "personal", "plugins", "managed", "personal"]);
});

test("a slash command a bridge lists among the skills has no switch; a skill file does", () => {
  const rows = skillRows({ data: [{ cwd: "/r", skills: [
    skill({ name: "init", path: "command:init", scope: "system" }),
    skill({ name: "fixed", path: "/s/fixed/SKILL.md", toggleable: false }),
    skill({ name: "demo" }),
  ] }] }).skills;
  assert.deepEqual(rows.map((row) => [row.name, row.toggleable]), [["demo", true], ["fixed", false], ["init", false]]);
});

test("author labels follow scope and plugin ownership", () => {
  const rows = skillRows(listing).skills;
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  assert.equal(skillAuthor(byName.zeta), "You");
  assert.equal(skillAuthor(byName["Alpha Skill"]), "Repository");
  // System skills ship with the running core: credited to it, never to a fixed vendor.
  assert.equal(skillAuthor(byName.sys), "Codex", "no core: the Codex default");
  assert.equal(skillAuthor(byName.sys, [], customizeCore({ engine: "deepseek-harness" })), "DeepSeek Harness");
  for (const [engine, name] of [["codex", "Codex"], ["zcode", "ZCode"], ["opencode", "OpenCode"], ["mimo", "MiMo Code"], ["kimi", "Kimi Code"]])
    assert.equal(skillAuthor(byName.sys, [], customizeCore({ engine })), name, engine);
  assert.equal(skillAuthor(byName.plug, [{ id: "acme-plugin", name: "Acme" }]), "Acme");
  assert.equal(skillAuthor(byName.plug, []), "acme-plugin");
});

test("owner segments appear only with two or more non-empty groups; search and scope filter rows", () => {
  const rows = skillRows(listing).skills;
  const groups = skillGroupOptions(rows);
  assert.equal(groups.show, true);
  assert.deepEqual(groups.options.map((option) => option.value), ["all", "personal", "repository", "plugins", "managed"]);
  assert.equal(skillGroupOptions(rows.filter((row) => row.group === "personal")).show, false);
  assert.deepEqual(filterSkills(rows, { query: "alpha" }).map((row) => row.name), ["Alpha Skill"]);
  assert.deepEqual(filterSkills(rows, { group: "personal" }).map((row) => row.name), ["off", "zeta"]);
  assert.equal(filterSkills(rows, { query: "nomatch" }).length, 0);
  const toggled = applySkillEnabled(rows, "/home/u/.codex/skills/off/SKILL.md", true);
  assert.equal(toggled.find((row) => row.name === "off").enabled, true);
  assert.equal(rows.find((row) => row.name === "off").enabled, false, "pure update");
});

test("Add menu skill items are the enabled skills sorted by label; plugin groups hold their skills", () => {
  const rows = skillRows(listing).skills;
  assert.deepEqual(skillMenuItems(rows).map((item) => item.label), ["Alpha Skill", "plug", "sys", "zeta"]);
  assert.equal(skillMenuItems(rows)[0].icon, "Scroll");
  const plugins = [{ id: "acme-plugin", name: "Acme", enabled: true, source: "local" }, { id: "other", name: "Other", enabled: true, source: "local" }, { id: "off", name: "Off", enabled: false, source: "local" }];
  const groups = pluginMenuGroups(plugins, rows);
  assert.deepEqual(groups.map((group) => [group.label, group.items.map((item) => item.skillName)]), [["Acme", ["plug"]]]);
  const twins = pluginMenuGroups([{ id: "a", name: "Same", enabled: true, source: "local" }, { id: "b", name: "Same", enabled: true, source: "git" }],
    [skill({ pluginId: "a", path: "/a/SKILL.md" }), skill({ pluginId: "b", path: "/b/SKILL.md" })]);
  assert.deepEqual(twins.map((group) => group.label), ["Same (local)", "Same"]);
});

test("MCP status never reads Connected without a thread runtime status", () => {
  assert.equal(mcpStatusKind({ runtimeStatus: null, authStatus: "oAuth" }), "notStarted");
  assert.equal(mcpStatusKind({ runtimeStatus: undefined }), "notStarted");
  assert.equal(mcpStatusKind({ runtimeStatus: "notStarted" }), "notStarted");
  assert.equal(mcpStatusKind({ runtimeStatus: "connected" }), "connected");
  assert.equal(mcpStatusKind({ runtimeStatus: "starting" }), "connecting");
  assert.equal(mcpStatusKind({ runtimeStatus: "failed" }), "unreachable");
  assert.equal(mcpStatusKind({ runtimeStatus: "cancelled" }), "unreachable");
  assert.equal(mcpStatusKind({ runtimeStatus: "authenticationRequired" }), "signIn");
  assert.equal(mcpStatusKind({ runtimeStatus: null, authStatus: "notLoggedIn" }), "signIn");
  assert.equal(mcpStatusKind({ runtimeStatus: "disabled" }), "disabled");
  const rows = mcpRows({ data: [
    { name: "b", runtimeStatus: "connected", serverInfo: { title: "Bee", version: "1" }, tools: { x: {}, y: {} }, resources: [1], authStatus: "unsupported", pluginId: null },
    { name: "a", runtimeStatus: null, tools: {}, authStatus: "notLoggedIn", pluginId: "p" },
    { name: "", runtimeStatus: "connected" },
  ] });
  assert.deepEqual(rows.map((row) => [row.name, row.title, row.kind, row.tools.length, row.pluginId]), [["a", "a", "signIn", 0, "p"], ["b", "Bee", "connected", 2, null]]);
  assert.deepEqual(filterMcp(rows, { query: "bee" }).map((row) => row.name), ["b"]);
});

test("startup notifications patch rows by name and only settled states ask for a re-list", () => {
  const rows = mcpRows({ data: [{ name: "a", runtimeStatus: "starting", tools: {}, authStatus: "unsupported" }] });
  const starting = patchMcpRow(rows, { params: { name: "a", status: "starting", threadId: "t", error: null } }, { threadId: "t" });
  assert.equal(starting.relist, false);
  assert.equal(starting.rows[0].kind, "connecting");
  const ready = patchMcpRow(rows, { params: { name: "a", status: "ready", threadId: "t" } }, { threadId: "t" });
  assert.equal(ready.rows[0].kind, "connected");
  assert.equal(ready.relist, true);
  const failed = patchMcpRow(rows, { params: { name: "a", status: "failed", threadId: "t", error: "boom", failureReason: "reauthenticationRequired" } }, { threadId: "t" });
  assert.equal(failed.rows[0].kind, "signIn");
  assert.equal(failed.rows[0].error, "boom");
  const other = patchMcpRow(rows, { params: { name: "a", status: "ready", threadId: "elsewhere" } }, { threadId: "t" });
  assert.equal(other.rows, rows);
  const unknown = patchMcpRow(rows, { params: { name: "zzz", status: "ready" } });
  assert.equal(unknown.rows, rows);
  assert.equal(unknown.relist, true);
});

test("connector payload builders: name validation, argument splitting, stdio/url tables, null removes", () => {
  assert.equal(validateServerName("fx-new"), "");
  assert.match(validateServerName("bad name!"), /letters, digits/);
  assert.match(validateServerName(""), /Enter/);
  assert.deepEqual(splitArguments("  -y   demo "), ["-y", "demo"]);
  // Quotes keep an argument with spaces whole; the quotes themselves never reach the server.
  assert.deepEqual(splitArguments('-e "process.stdin.resume()" --root \'/Users/me/My Projects\''), ["-e", "process.stdin.resume()", "--root", "/Users/me/My Projects"]);
  assert.throws(() => splitArguments('-e "unclosed'), /Close the quote/);
  assert.equal(joinArguments(["-e", "process.stdin.resume()", "/Users/me/My Projects", 'say "hi"', ""]), '-e process.stdin.resume() "/Users/me/My Projects" \'say "hi"\' ""');
  assert.deepEqual(mcpServerConfigValue({ command: "npx", args: ["-y", "demo"] }), { command: "npx", args: ["-y", "demo"] });
  assert.deepEqual(mcpServerConfigValue({ command: "npx", args: "" }), { command: "npx" });
  assert.deepEqual(mcpServerConfigValue({ url: "https://example.invalid/mcp" }), { url: "https://example.invalid/mcp" });
  assert.throws(() => mcpServerConfigValue({ url: "ftp://x" }), /http/);
  assert.throws(() => mcpServerConfigValue({}), /command or a URL/);
  assert.deepEqual(mcpBatchWriteParams("fx-new", { command: "npx", args: ["-y", "demo"] }),
    { edits: [{ keyPath: "mcp_servers.fx-new", value: { command: "npx", args: ["-y", "demo"] }, mergeStrategy: "upsert" }], reloadUserConfig: true });
  assert.deepEqual(mcpBatchWriteParams("gone", null).edits[0], { keyPath: "mcp_servers.gone", value: null, mergeStrategy: "replace" });
  assert.throws(() => mcpBatchWriteParams("bad name!", {}), /letters/);
  // Main-process twin used by the IPC operation.
  assert.deepEqual(mcpServerValue({ command: "npx", args: ["-y", "demo"] }), { command: "npx", args: ["-y", "demo"] });
  assert.throws(() => mcpServerValue({ command: "npx", args: [""] }), /arguments/i);
});

test("plugins: installed rows only, real skill counts by pluginId, search", () => {
  const skills = skillRows(listing).skills;
  const rows = pluginRows({ marketplaces: [{ name: "openai-bundled", interface: { displayName: "Bundled" }, path: "/m.json", plugins: [
    { id: "acme-plugin", name: "acme", installed: true, enabled: true, source: { type: "local", path: "/p" }, interface: { displayName: "Acme", developerName: "Acme Inc" } },
    { id: "off-plugin", name: "off", installed: true, enabled: false, source: { type: "git" }, interface: null },
    { id: "remote", name: "remote", installed: false, enabled: true, source: { type: "remote" } },
  ] }, { name: "dup", plugins: [{ id: "acme-plugin", name: "acme", installed: true, enabled: true }] }] }, skills);
  assert.deepEqual(rows.map((row) => [row.name, row.author, row.skillCount, row.enabled, row.marketplaceName, row.updatedAt]),
    [["Acme", "Acme Inc", 1, true, "Bundled", null], ["off", "", 0, false, "Bundled", null]]);
  assert.deepEqual(filterPlugins(rows, { query: "acme" }).map((row) => row.id), ["acme-plugin"]);
});

test("short dates come from the real timestamp and skill chips become protocol skill inputs", () => {
  assert.equal(shortDate(NaN), "");
  assert.match(shortDate(1_700_000_000, "en-US"), /^11\/1[45]\/23$/);
  // Fidelity F05: the Add › Skills row inserts the editor chip; its leading '/alpha' is the skill input.
  assert.deepEqual(skillChipInput("/alpha ", { name: "alpha", path: "/repo/.agents/skills/alpha/SKILL.md" }),
    { text: "", item: { type: "skill", name: "alpha", path: "/repo/.agents/skills/alpha/SKILL.md" } });
});

function fakeTimers() {
  const timers = new Map(); let id = 0, clock = 0;
  return {
    setTimeout: (fn, ms) => { const handle = ++id; timers.set(handle, { fn, at: clock + ms }); return handle; },
    clearTimeout: (handle) => timers.delete(handle),
    now: () => clock,
    async advance(ms) { clock += ms; for (const [handle, timer] of [...timers]) if (timer.at <= clock) { timers.delete(handle); timer.fn(); } await Promise.resolve(); await Promise.resolve(); },
    pending: () => timers.size,
  };
}

test("store: skills load once, toggle is optimistic and follows effectiveEnabled, failure reverts", async () => {
  const calls = [];
  const timers = fakeTimers();
  let fail = false;
  const call = async (action, p) => {
    calls.push(p);
    if (p.operation === "skills") return { data: listing.data.slice(0, 1), updatedAt: {} };
    if (p.operation === "skill-toggle") { if (fail) throw new Error("refused"); return { effectiveEnabled: p.enabled }; }
    if (p.operation === "plugins") return { marketplaces: [] };
    throw new Error("unexpected " + p.operation);
  };
  const store = createCustomizeStore({ call, ...timers });
  await store.loadSkills({ cwd: "/repo" });
  await store.loadSkills({ cwd: "/repo" });
  assert.equal(calls.filter((p) => p.operation === "skills").length, 1);
  assert.equal(store.getSnapshot().skills.status, "ready");
  const path = "/home/u/.codex/skills/demo/SKILL.md";
  const states = [];
  store.subscribe((state) => states.push(state.skills.skills.find((row) => row.path === path).enabled));
  await store.setSkillEnabled(path, false);
  assert.deepEqual(states, [false, false]);
  assert.deepEqual(calls.at(-1), { operation: "skill-toggle", path, enabled: false });
  fail = true;
  await assert.rejects(store.setSkillEnabled(path, true), /refused/);
  assert.equal(store.getSnapshot().skills.skills.find((row) => row.path === path).enabled, false, "reverted to the last confirmed flag");
  await assert.rejects(store.setSkillEnabled("/nope", true), /Unknown skill/);
});

test("store: skills/changed re-lists within the debounce window with forceReload; idle store ignores it", async () => {
  const calls = [];
  const timers = fakeTimers();
  const call = async (action, p) => { calls.push({ ...p, at: timers.now() }); return p.operation === "skills" ? { data: [], updatedAt: {} } : { data: [] }; };
  const store = createCustomizeStore({ call, ...timers });
  store.observe({ method: "skills/changed", params: {} });
  assert.equal(timers.pending(), 0, "idle store does not schedule");
  await store.loadSkills({ cwd: "/repo" });
  store.observe({ method: "skills/changed", params: {} });
  store.observe({ method: "skills/changed", params: {} });
  assert.equal(timers.pending(), 1, "coalesced");
  await timers.advance(300);
  const reloads = calls.filter((p) => p.operation === "skills");
  assert.equal(reloads.length, 2);
  assert.equal(reloads[1].forceReload, true);
  assert.ok(reloads[1].at <= 500);
});

test("store: MCP list keys on thread, startup notifications patch and re-list, oauth completion re-lists", async () => {
  const calls = [];
  const timers = fakeTimers();
  const call = async (action, p) => {
    calls.push(p);
    return { data: [{ name: "a", runtimeStatus: p.threadId ? "starting" : null, tools: {}, authStatus: "unsupported" }], nextCursor: null };
  };
  const store = createCustomizeStore({ call, ...timers });
  await store.loadMcp({ threadId: null, cwd: "/repo" });
  assert.equal(store.getSnapshot().mcp.rows[0].kind, "notStarted");
  await store.loadMcp({ threadId: "t1", cwd: "/repo" });
  assert.equal(calls.length, 2, "a new thread re-lists");
  assert.equal(store.getSnapshot().mcp.rows[0].kind, "connecting");
  store.observe({ method: "mcpServer/startupStatus/updated", params: { threadId: "t1", name: "a", status: "ready", error: null, failureReason: null } });
  assert.equal(store.getSnapshot().mcp.rows[0].kind, "connected", "patched before the re-list");
  await timers.advance(300);
  assert.equal(calls.length, 3);
  store.observe({ method: "mcpServer/oauthLogin/completed", params: { name: "a", threadId: "t1", success: true } });
  await timers.advance(300);
  assert.equal(calls.length, 4);
});

test("main-process operations validate inputs, guard toggles to listed paths and attach real mtimes", async () => {
  const requests = [];
  const client = { start: async () => {}, request: async (method, params, timeout) => {
    requests.push({ method, params, timeout });
    if (method === "skills/list") return { data: [{ cwd: "/repo", skills: [skill({ path: "/skills/demo/SKILL.md" }), skill({ name: "dir", path: "/skills/dir" })], errors: [] }] };
    if (method === "skills/config/write") return { effectiveEnabled: params.enabled };
    if (method === "mcpServer/oauth/login") return { authorizationUrl: "https://example.invalid/oauth" };
    if (method === "mcpServerStatus/list") return { data: [], nextCursor: null };
    return {};
  } };
  const stat = async (target) => {
    if (target === "/skills/demo/SKILL.md") return { mtimeMs: 1_700_000_000_500 };
    if (target === "/skills/dir/SKILL.md") return { mtimeMs: 1_600_000_000_000 };
    throw new Error("ENOENT");
  };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: ["t1"], archivedThreadIds: [] }), knownCwd: (cwd) => { if (cwd !== "/repo") throw new Error("Unknown workspace directory."); return cwd; }, stat });
  await assert.rejects(ops.run({ operation: "skill-toggle", path: "/skills/demo/SKILL.md", enabled: false }), /Unknown skill/);
  const listed = await ops.run({ operation: "skills", cwd: "/repo", forceReload: true });
  assert.deepEqual(requests[0], { method: "skills/list", params: { cwds: ["/repo"], forceReload: true }, timeout: undefined });
  assert.deepEqual(listed.updatedAt, { "/skills/demo/SKILL.md": 1_700_000_000, "/skills/dir": 1_600_000_000 });
  await assert.rejects(ops.run({ operation: "skills", cwd: "/elsewhere" }), /Unknown workspace/);
  const toggled = await ops.run({ operation: "skill-toggle", path: "/skills/demo/SKILL.md", enabled: false });
  assert.deepEqual(toggled, { effectiveEnabled: false });
  assert.deepEqual(requests.at(-1).params, { path: "/skills/demo/SKILL.md", enabled: false });
  await assert.rejects(ops.run({ operation: "skill-toggle", path: "/skills/demo/SKILL.md", enabled: "no" }), /Invalid/);
  await ops.run({ operation: "mcp", threadId: "t1" });
  assert.deepEqual(requests.at(-1), { method: "mcpServerStatus/list", params: { detail: "toolsAndAuthOnly", threadId: "t1" }, timeout: 15000 });
  await assert.rejects(ops.run({ operation: "mcp", threadId: "unknown" }), /Unknown session/);
  await ops.run({ operation: "mcp" });
  assert.deepEqual(requests.at(-1).params, { detail: "toolsAndAuthOnly" });
  const login = await ops.run({ operation: "mcp-login", name: "fx-auth" });
  assert.deepEqual(login, { authorizationUrl: "https://example.invalid/oauth" });
  await assert.rejects(ops.run({ operation: "mcp-login", name: "bad name!" }), /letters/);
  await ops.run({ operation: "mcp-add", name: "fx-new", command: "npx", args: ["-y", "demo"] });
  assert.deepEqual(requests.slice(-2).map((r) => [r.method, r.params]), [
    ["config/batchWrite", { edits: [{ keyPath: "mcp_servers.fx-new", value: { command: "npx", args: ["-y", "demo"] }, mergeStrategy: "upsert" }], reloadUserConfig: true }],
    ["config/mcpServer/reload", {}],
  ]);
  await ops.run({ operation: "mcp-remove", name: "fx-new" });
  assert.deepEqual(requests.at(-2).params.edits, [{ keyPath: "mcp_servers.fx-new", value: null, mergeStrategy: "replace" }]);
  await ops.run({ operation: "plugin-read", pluginName: "acme", marketplacePath: "/m.json" });
  assert.deepEqual(requests.at(-1).params, { pluginName: "acme", marketplacePath: "/m.json" });
  await assert.rejects(ops.run({ operation: "nope" }), /Unknown customize operation/);
});

test("store: a workspace switch re-lists skills and plugins instead of serving the previous cwd", async () => {
  const calls = [];
  const timers = fakeTimers();
  const call = async (action, p) => {
    calls.push(p);
    if (p.operation === "skills") return { data: [{ cwd: p.cwd, skills: [skill({ name: "s", path: `${p.cwd}/.agents/skills/s/SKILL.md`, scope: "repo" })], errors: [] }], updatedAt: {} };
    if (p.operation === "plugins") return { marketplaces: [] };
    throw new Error("unexpected " + p.operation);
  };
  const store = createCustomizeStore({ call, ...timers });
  await store.loadSkills({ cwd: "/repo-a" });
  await store.loadPlugins({ cwd: "/repo-a" });
  await store.loadSkills({ cwd: "/repo-a" });
  await store.loadPlugins({ cwd: "/repo-a" });
  assert.equal(calls.filter((p) => p.operation === "skills").length, 1, "same cwd is served from the cache");
  assert.equal(calls.filter((p) => p.operation === "plugins").length, 1);
  await store.loadSkills({ cwd: "/repo-b" });
  await store.loadPlugins({ cwd: "/repo-b" });
  assert.deepEqual(calls.filter((p) => p.operation === "skills").map((p) => p.cwd), ["/repo-a", "/repo-b"]);
  assert.deepEqual(calls.filter((p) => p.operation === "plugins").map((p) => p.cwd), ["/repo-a", "/repo-b"]);
  assert.deepEqual(store.getSnapshot().skills.skills.map((row) => row.path), ["/repo-b/.agents/skills/s/SKILL.md"]);
  // An omitted cwd keeps the current one and stays cached.
  await store.loadSkills({});
  assert.equal(calls.filter((p) => p.operation === "skills").length, 2);
});

test("main process: skill-file reads a listed SKILL.md, reports a missing one as null and refuses unknown paths", async () => {
  const requests = [];
  const client = { start: async () => {}, request: async (method, params) => {
    requests.push({ method, params });
    if (method === "skills/list") return { data: [{ cwd: "/repo", skills: [skill({ path: "/skills/demo/SKILL.md" }), skill({ name: "gone", path: "/skills/gone/SKILL.md" })], errors: [] }] };
    return {};
  } };
  const files = { "/skills/demo/SKILL.md": "# demo\n" };
  const stat = async (target) => {
    if (!(target in files)) throw new Error("ENOENT");
    return { mtimeMs: 1_700_000_000_000, size: files[target].length, isFile: () => true };
  };
  const readFile = async (target) => files[target];
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd, stat, readFile });
  await assert.rejects(ops.run({ operation: "skill-file", path: "/skills/demo/SKILL.md" }), /Unknown skill/, "nothing is readable before a listing");
  await ops.run({ operation: "skills", cwd: "/repo" });
  assert.deepEqual(await ops.run({ operation: "skill-file", path: "/skills/demo/SKILL.md" }), { path: "/skills/demo/SKILL.md", content: "# demo\n" });
  assert.deepEqual(await ops.run({ operation: "skill-file", path: "/skills/gone/SKILL.md" }), { path: "/skills/gone/SKILL.md", content: null });
  await assert.rejects(ops.run({ operation: "skill-file", path: "/etc/passwd" }), /Unknown skill/);
  assert.equal(requests.filter((entry) => entry.method !== "skills/list").length, 0, "reading a file issues no protocol request");
});

test("main process: mcp-add refuses a name the last listing already has, and works again after a removal", async () => {
  const requests = [];
  const client = { start: async () => {}, request: async (method, params) => {
    requests.push({ method, params });
    if (method === "mcpServerStatus/list") return { data: [{ name: "node_repl", runtimeStatus: null, authStatus: "unsupported" }] };
    return {};
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd, stat: async () => { throw new Error("ENOENT"); } });
  await ops.run({ operation: "mcp" });
  await assert.rejects(ops.run({ operation: "mcp-add", name: "node_repl", command: "node" }), /already in ~\/\.codex\/config\.toml/);
  assert.equal(requests.filter((entry) => entry.method === "config/batchWrite").length, 0, "an existing server is never overwritten");
  await ops.run({ operation: "mcp-remove", name: "node_repl" });
  await ops.run({ operation: "mcp-add", name: "node_repl", command: "node" });
  assert.deepEqual(requests.at(-2).params.edits, [{ keyPath: "mcp_servers.node_repl", value: { command: "node" }, mergeStrategy: "upsert" }]);
});

test("Add menu: plugin skill rows carry the plugin display name for the hover card", () => {
  const rows = skillRows(listing).skills;
  const groups = pluginMenuGroups([{ id: "acme-plugin", name: "Acme", enabled: true, source: "local" }], rows);
  assert.deepEqual(groups.map((group) => group.label), ["Acme"]);
  assert.deepEqual(groups[0].items.map((item) => [item.label, item.sourcePluginName, item.description]), [["plug", "Acme", "Demo skill"]]);
  // Non-plugin rows keep no source line.
  assert.equal(skillMenuItems(rows.filter((row) => !row.pluginId))[0].sourcePluginName, undefined);
});

test("Customize copy and controls follow boot.core: Codex servers keep config.toml writes, the DeepSeek core reads Harness roots", () => {
  for (const core of [undefined, null, { engine: "codex", engineVersion: null, capabilities: {}, configPath: null }]) {
    const codex = customizeCore(core);
    assert.equal(codex.deepseek, false);
    assert.equal(codex.skillToggle, true);
    assert.equal(codex.mcpConfigWrite, true);
    assert.equal(codex.configFile, "~/.codex/config.toml");
    assert.deepEqual(codex.skillRoots, ["~/.codex/skills", "~/.agents/skills", "<workspace>/.agents/skills"]);
    // F13: the local notice paragraphs and the plugins empty hint are gone (customize-page-shell :410-424).
    for (const key of ["skillsNotice", "skillDetailNotice", "connectorsNotice", "pluginsNotice", "pluginsEmptyHint"]) assert.equal(Object.hasOwn(codex, key), false, key);
  }
  const deepseek = customizeCore({ engine: "deepseek-harness", capabilities: { unsupportedMethods: [], skillToggle: false, mcpConfigWrite: false }, configPath: "/h/profile/cordis.patch.yml" });
  assert.equal(deepseek.deepseek, true);
  assert.equal(deepseek.skillToggle, false);
  assert.equal(deepseek.mcpConfigWrite, false);
  assert.equal(deepseek.configFile, "/h/profile/cordis.patch.yml");
  assert.deepEqual(deepseek.skillRoots, ["<project>/.dsh/skills", "<project>/.agents/skills", "~/.dsh/skills", "~/.agents/skills"]);
  assert.equal(Object.hasOwn(deepseek, "skillToggleReason"), false, "no read-only switch reason: the DeepSeek core draws no switch");
  const text = JSON.stringify(deepseek);
  assert.doesNotMatch(text, /\.codex|ChatGPT|dsh plugin add/);
  for (const key of ["skillsNotice", "skillDetailNotice", "connectorsNotice", "pluginsNotice", "pluginsEmptyHint"]) assert.equal(Object.hasOwn(deepseek, key), false, key);
  // Source copy naming the assistant follows the Claude → DeepSeek rule; everything else is verbatim.
  assert.equal(deepseek.skillDescriptionTooltip, "DeepSeek uses these descriptions when deciding which skills to use in chat.");
  assert.equal(deepseek.skillsEmpty, "Add skills to extend DeepSeek’s capabilities.");
  assert.equal(deepseek.connectorsEmpty, "Unlock more with DeepSeek when you connect your team’s tools.");
  assert.equal(deepseek.pluginsEmpty, "Give DeepSeek role-level expertise with plugins");
  // ccb4abbdf r Trigger tooltips and c36b3644c _e plugin tab descriptions, Claude → DeepSeek.
  assert.deepEqual(deepseek.skillTriggerTooltips, { auto: "DeepSeek runs this skill automatically when it’s relevant to your request.",
    both: "Appears in the / menu. DeepSeek can also run it automatically when relevant.", slash: "Appears in the / menu." });
  assert.deepEqual(deepseek.pluginTabDescriptions, { skills: "Invoke by typing / in chat, or let DeepSeek use them automatically for relevant tasks.",
    connectors: "Tools and data sources this plugin connects to. Connect each one so DeepSeek can use it.",
    hooks: "Commands this plugin runs automatically — on session events, or when its skills are used.",
    tools: "Tools this plugin adds. DeepSeek can call them while it works.",
    // B24 c24c8737b Dc / Ns helper lines (the Commands one is a server message there: none locally).
    agents: "Specialized AI assistants that can be invoked to handle specific types of tasks.", commands: "",
    monitors: "Background commands that run automatically during your session." });
  assert.equal(deepseek.connectorRemoveNote, "However, DeepSeek won’t be able to access new content or perform new tasks.");
  assert.doesNotMatch(JSON.stringify(customizeCore(null)), /Claude/);
  assert.equal(customizeCore({ engine: "deepseek-harness", capabilities: { skillToggle: false } }).configFile, "the DeepSeek core profile");
  // A capability the core does not report keeps the control.
  assert.equal(customizeCore({ engine: "deepseek-harness", capabilities: {} }).mcpConfigWrite, true);
});

test("Connector copy names the file the running core writes and the core itself", () => {
  // Codex (native): its own CLI config, shared with that CLI.
  const codex = customizeCore({ engine: "codex", capabilities: {} });
  assert.equal(codex.addConnectorNote, "Saved to ~/.codex/config.toml, shared with the Codex CLI.");
  assert.equal(codex.connectorRemoved("gh"), "Removed gh from ~/.codex/config.toml.");
  // Codex launched with CODEX_HOME reports its home (boot.core.home): the copy and skill folders follow it.
  const moved = customizeCore({ engine: "codex", capabilities: {}, home: "/Users/u/profile/codex-home" });
  assert.equal(moved.addConnectorNote, "Saved to ~/profile/codex-home/config.toml, shared with the Codex CLI.");
  assert.equal(moved.configOverlay, false);
  assert.deepEqual(moved.skillRoots, ["~/profile/codex-home/skills", "~/.agents/skills", "<workspace>/.agents/skills"]);
  // ZCode writes the agent's own config (configPath is that file): never Codex's.
  const zcode = customizeCore({ engine: "zcode", capabilities: { mcpConfigWrite: true }, configPath: "/Users/u/.zcode/cli/config.json" });
  assert.equal(zcode.configOverlay, false);
  assert.equal(zcode.addConnectorNote, "Saved to ~/.zcode/cli/config.json.");
  assert.equal(zcode.connectorRemoved("gh"), "Removed gh from ~/.zcode/cli/config.json.");
  assert.equal(zcode.duplicateConnector("gh"), "A connector named gh is already in ~/.zcode/cli/config.json. Remove it first or choose another name.");
  // OpenCode / MiMo write OpenClaude Desktop's overlay (configPath) and leave the user's own file alone.
  for (const [engine, overlay, own, name] of [["opencode", "/s/config/opencode.json", "~/.config/opencode/opencode.json", "OpenCode"], ["mimo", "/s/config/mimocode.json", "~/.config/mimocode/mimocode.jsonc", "MiMo Code"]]) {
    const copy = customizeCore({ engine, capabilities: { mcpConfigWrite: true }, configPath: overlay });
    assert.equal(copy.configOverlay, true, engine);
    assert.equal(copy.configFile, overlay);
    assert.equal(copy.addConnectorNote, `Saved to ${overlay}. Your own ${own} isn’t changed.`);
    assert.equal(copy.connectorRemoved("gh"), `Removed gh from OpenClaude Desktop’s ${name} config. Your own ${own} isn’t changed.`);
    assert.equal(copy.duplicateConnector("gh"), `A connector named gh already exists in ${name}. Remove it first or choose another name.`);
  }
  for (const engine of ["zcode", "opencode", "mimo", "kimi", "qwen", "gemini", "minimax"])
    assert.doesNotMatch(customizeCore({ engine, capabilities: {}, configPath: null }).addConnectorNote, /codex|Codex/, engine);
  // A core that does not write MCP config: the DeepSeek profile entry, else the core's own config.
  assert.deepEqual(customizeCore({ engine: "deepseek-harness", capabilities: { mcpConfigWrite: false } }).connectorConfigHint, { text: "Add a {package} entry to {file}, then Reconnect.", package: "@deepseek-ai/dsh-mcp-client" });
  assert.deepEqual(customizeCore({ engine: "kimi", capabilities: { mcpConfigWrite: false } }).connectorConfigHint, { text: "Add the server to {file}, then Reconnect." });
  // Plugin copy names the running core; only a native core gets the protocol's plugin management.
  assert.equal(customizeCore({ engine: "codex" }).nativePlugins, true);
  assert.equal(customizeCore(null).nativePlugins, true);
  for (const engine of ["deepseek-harness", "zcode", "opencode"]) assert.equal(customizeCore({ engine, capabilities: { pluginManage: true } }).nativePlugins, false, engine);
  const zc = customizeCore({ engine: "zcode", capabilities: { pluginManage: true } });
  assert.equal(zc.pluginRemoveBody, "The plugin is uninstalled from ZCode. You can install it again later.");
  assert.equal(zc.officialBy, "by Z.ai (Zhipu)");
  assert.equal(zc.pluginForm.registries, false);
  assert.equal(customizeCore({ engine: "deepseek-harness" }).pluginForm.registries, true);
});

test("main process: a core without MCP config writes never receives config/batchWrite", async () => {
  const requests = [];
  const client = { start: async () => {}, serverInfo: { engine: "deepseek-harness", configPath: "/h/profile/cordis.patch.yml", capabilities: { mcpConfigWrite: false } },
    request: async (method, params) => { requests.push({ method, params }); return {}; } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(ops.run({ operation: "mcp-add", name: "gh", command: "npx" }), /not supported by the DeepSeek core[^]*dsh-mcp-client[^]*\/h\/profile\/cordis\.patch\.yml/);
  await assert.rejects(ops.run({ operation: "mcp-remove", name: "gh" }), /not supported by the DeepSeek core/);
  await assert.rejects(ops.run({ operation: "mcp-add", name: "bad name!", command: "npx" }), /letters/, "name validation still comes first");
  assert.deepEqual(requests, []);
  await ops.run({ operation: "mcp-reload" });
  assert.deepEqual(requests.map((entry) => entry.method), ["config/mcpServer/reload"], "Reconnect still reloads");
});

test("F13 plugin display names: the marketplace suffix appears only on a display-name collision (shared-4 _L), and search matches it", () => {
  const unique = [{ id: "a", name: "Alpha", pluginName: "alpha", description: "", marketplaceName: "DeepSeek Harness profile" },
    { id: "b", name: "Beta", pluginName: "beta", description: "", marketplaceName: "DeepSeek Harness profile" }];
  const uniqueNames = pluginDisplayNames(unique);
  assert.deepEqual([...uniqueNames.entries()], [["a", { name: "Alpha" }], ["b", { name: "Beta" }]], "unique names carry no suffix");
  const twins = [{ id: "foo-a", name: "Foo", pluginName: "foo", description: "", marketplaceName: "A" },
    { id: "foo-b", name: "Foo", pluginName: "foo", description: "", marketplaceName: "B" },
    { id: "foo-c", name: "Foo", pluginName: "foo", description: "", marketplaceName: "" },
    { id: "bar", name: "Bar", pluginName: "bar", description: "", marketplaceName: "A" }];
  const names = pluginDisplayNames(twins);
  assert.deepEqual(names.get("foo-a"), { name: "Foo", suffix: "(A)" });
  assert.deepEqual(names.get("foo-b"), { name: "Foo", suffix: "(B)" });
  assert.deepEqual(names.get("foo-c"), { name: "Foo" }, "no marketplace name, no suffix");
  assert.deepEqual(names.get("bar"), { name: "Bar" });
  assert.deepEqual(filterPlugins(twins, { query: "(b)" }).map((row) => row.id), ["foo-b"], "the suffix is searchable");
  assert.deepEqual(filterPlugins(twins, { query: "foo" }).map((row) => row.id), ["foo-a", "foo-b", "foo-c"]);
  assert.deepEqual(filterPlugins(unique, { query: "harness profile" }), [], "a marketplace name that is not a suffix is not matched");
  assert.equal(filterPlugins(twins, { query: "  " }), twins);
});

test("F13 connectors: the status filter splits connected rows from everything else (customize-connectors Ja/Ge)", () => {
  assert.deepEqual(MCP_STATUS_FILTERS.map((option) => [option.value, option.label]), [["all", "All"], ["connected", "Connected"], ["notConnected", "Not connected"]]);
  const rows = ["connected", "connecting", "unreachable", "signIn", "disabled", "notStarted"].map((kind) => ({ name: kind, kind }));
  assert.equal(filterMcpByStatus(rows, "all"), rows);
  assert.deepEqual(filterMcpByStatus(rows, "connected").map((row) => row.name), ["connected"]);
  assert.deepEqual(filterMcpByStatus(rows, "notConnected").map((row) => row.name), ["connecting", "unreachable", "signIn", "disabled", "notStarted"]);
  assert.deepEqual(filterMcpByStatus([], "connected"), []);
});

test("F13 connector drill state follows c08e79e85 En: connected page, checking spinner, or the not-connected column", () => {
  const view = (kind, extra = {}) => connectorDetailState({ kind, ...extra });
  assert.deepEqual(view("connected"), { view: "connected", issue: false, action: null, label: null, disabled: false });
  assert.deepEqual(view("connecting"), { view: "checking", issue: false, action: null, label: null, disabled: false });
  assert.deepEqual(view("unreachable"), { view: "disconnected", issue: true, action: "reconnect", label: "Reconnect", disabled: false });
  assert.deepEqual(view("signIn", { runtimeStatus: null, authStatus: "notLoggedIn" }), { view: "disconnected", issue: false, action: "signIn", label: "Sign in", disabled: false });
  // A runtime re-authentication failure is a real failure: issue title, stopped-working copy and vn's "Reconnect" label (still the sign-in flow).
  assert.deepEqual(view("signIn", { runtimeStatus: "authenticationRequired" }), { view: "disconnected", issue: true, action: "signIn", label: "Reconnect", disabled: false });
  assert.deepEqual(view("notStarted"), { view: "disconnected", issue: false, action: "connect", label: "Connect", disabled: false });
  assert.deepEqual(view("disabled"), { view: "disconnected", issue: false, action: "connect", label: "Connect", disabled: true });
  assert.deepEqual(connectorDetailState(null), view("notStarted"));
  assert.equal(connectorDetailMessage(view("unreachable"), "gh"), "Your connection to gh stopped working. Reconnect to continue.");
  assert.equal(connectorDetailMessage(view("signIn"), "gh"), "You’re not connected to gh yet.");
  assert.deepEqual(CONNECTOR_ACTION_LABELS, { reconnect: "Reconnect", signIn: "Sign in", connect: "Connect" });
});

test("F13 connectors list body: filter with any row, table while rows remain, Nothing connected / Nothing to connect, Ee otherwise", () => {
  assert.deepEqual(connectorsListView({ total: 0, visible: 0 }), { filter: false, table: false, filterEmpty: null, empty: "empty" });
  assert.deepEqual(connectorsListView({ total: 3, visible: 3 }), { filter: true, table: true, filterEmpty: null, empty: null });
  assert.deepEqual(connectorsListView({ total: 3, visible: 0, status: "connected" }), { filter: true, table: false, filterEmpty: "Nothing connected.", empty: null });
  assert.deepEqual(connectorsListView({ total: 3, visible: 0, status: "notConnected" }), { filter: true, table: false, filterEmpty: "Nothing to connect.", empty: null });
  assert.deepEqual(connectorsListView({ total: 3, visible: 0, status: "connected", query: "zz" }), { filter: true, table: false, filterEmpty: null, empty: "search" });
  assert.deepEqual(connectorsListView({ total: 3, visible: 0, query: " zz " }), { filter: true, table: false, filterEmpty: null, empty: "search" });
});

test("R04 skill invocation: the bridge's policy gates '/' and Add › Skills; a Codex core keeps enabled", () => {
  // DeepSeek bridge rows (harness catalog.js): enabled = modelInvocable, plus userInvocable/modelInvocable.
  const bridge = skillRows({ data: [{ cwd: "/w", skills: [
    skill({ name: "both", path: "/u/both/SKILL.md", enabled: true, userInvocable: true, modelInvocable: true, version: " 1.0 " }),
    skill({ name: "slash", path: "/u/slash/SKILL.md", enabled: false, userInvocable: true, modelInvocable: false }),
    skill({ name: "auto", path: "/u/auto/SKILL.md", enabled: true, userInvocable: false, modelInvocable: true }),
  ] }] }).skills;
  const byName = Object.fromEntries(bridge.map((row) => [row.name, row]));
  assert.deepEqual([byName.slash.userInvocable, byName.slash.modelInvocable, byName.slash.enabled], [true, false, false]);
  assert.deepEqual([byName.auto.userInvocable, byName.auto.modelInvocable], [false, true]);
  assert.equal(byName.both.version, "1.0"); assert.equal(byName.slash.version, null);
  assert.deepEqual(bridge.filter(skillInvocable).map((row) => row.name), ["both", "slash"], "slash-only in, model-only out");
  assert.deepEqual(skillMenuItems(bridge).map((item) => item.label), ["both", "slash"]);
  // Codex rows: no flags (undefined), so `enabled` is the only gate and nothing else changes.
  const codex = skillRows(listing).skills;
  for (const row of codex) { assert.equal(row.userInvocable, undefined); assert.equal(row.modelInvocable, undefined); assert.equal(skillInvocable(row), row.enabled); }
  assert.deepEqual(skillMenuItems(codex).map((item) => item.label), ["Alpha Skill", "plug", "sys", "zeta"]);
  // ccb4abbdf Trigger: Auto / Slash command + auto, model-hidden → Slash command; none without the policy.
  const copy = customizeCore({ engine: "deepseek-harness", capabilities: { skillToggle: false } });
  assert.deepEqual(skillTrigger(byName.auto, copy), { label: "Auto", tooltip: copy.skillTriggerTooltips.auto });
  assert.deepEqual(skillTrigger(byName.both, copy), { label: "Slash command + auto", tooltip: copy.skillTriggerTooltips.both });
  assert.deepEqual(skillTrigger(byName.slash, copy), { label: "Slash command", tooltip: copy.skillTriggerTooltips.slash });
  assert.equal(skillTrigger(codex[0], copy), null);
});

test("R04 connector copy: q87c5Fstfm Sign-in required and the source toast strings", () => {
  assert.equal(MCP_STATUS_LABELS.signIn, "Sign-in required");
  assert.deepEqual({ ...CONNECTOR_TOASTS }, { connectFailed: "Connection to server failed. You can try again.", refreshFailed: "Couldn’t refresh tools list. You can try again.",
    refreshed: "Tools list refreshed", removeFailed: "Failed to remove server" });
});

test("a core command tagged with localizationKey (MiMo's built-ins) shows the app's translation, else the core's text", async () => {
  const { skillDescription } = await import("../src/customize-model.mjs");
  const { setLocale } = await import("../electron/i18n/index.mjs");
  const dream = { name: "dream", description: "manually consolidate project memory from memory files and raw trajectory", localizationKey: "mimo.slash.dream" };
  assert.equal(skillDescription(dream), "manually consolidate project memory from memory files and raw trajectory");
  setLocale("zh-CN");
  try {
    assert.equal(skillDescription(dream), "从 memory 文件与原始轨迹中手动整合项目记忆");
    assert.equal(skillDescription({ ...dream, localizationKey: "unknown.key" }), dream.description);
  } finally { setLocale("en-US"); }
});

test("Add connector: env and headers reach the core's config; an OAuth client only where the core takes one", () => {
  assert.deepEqual(mcpServerValue({ command: "npx", args: ["-y", "gh"], env: { GITHUB_TOKEN: "t" } }), { command: "npx", args: ["-y", "gh"], env: { GITHUB_TOKEN: "t" } });
  assert.deepEqual(mcpServerValue({ url: "https://m.example/mcp", http_headers: { Authorization: "Bearer x" } }), { url: "https://m.example/mcp", http_headers: { Authorization: "Bearer x" } });
  assert.throws(() => mcpServerValue({ command: "npx", env: { "bad name": "x" } }), /environment/);
  const oauth = { client_id: "abc", client_secret: "s", scope: "read" };
  assert.throws(() => mcpServerValue({ url: "https://m.example/mcp", oauth }), /OAuth/);
  assert.deepEqual(mcpServerValue({ url: "https://m.example/mcp", oauth }, { oauth: true }), { url: "https://m.example/mcp", oauth });
  assert.deepEqual(mcpServerConfigValue({ url: "https://m.example/mcp", oauth: { clientId: " abc ", clientSecret: "", scope: "" } }), { url: "https://m.example/mcp", oauth: { client_id: "abc" } });
  assert.throws(() => mcpServerConfigValue({ url: "https://m.example/mcp", oauth: { clientId: "", scope: "read" } }), /client ID/);
  assert.equal(mcpRows({ data: [{ name: "sso", runtimeStatus: "failed", codeDesktop: { oauthClientRequired: true } }] })[0].oauthClient, true);
});

const connectorClient = (requests) => ({ start: async () => {}, request: async (method, params) => {
  requests.push({ method, params });
  if (method === "mcpServerStatus/list") return { data: [{ name: "github" }, { name: "my.server" }, { name: "code_desktop" }], nextCursor: null };
  return {};
} });

test("connector add/remove: a dotted name stays one config key", async () => {
  const requests = [];
  const client = connectorClient(requests);
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [], archivedThreadIds: [] }), knownCwd: (cwd) => cwd });
  await ops.run({ operation: "mcp" });
  // Unquoted, `mcp_servers.my.server` is key `server` of a server `my`, and `github.env` is the github server's env table.
  await ops.run({ operation: "mcp-remove", name: "my.server" });
  assert.deepEqual(requests.at(-2).params.edits, [{ keyPath: 'mcp_servers."my.server"', value: null, mergeStrategy: "replace" }]);
  await ops.run({ operation: "mcp-remove", name: "github.env" });
  assert.deepEqual(requests.at(-2).params.edits, [{ keyPath: 'mcp_servers."github.env"', value: null, mergeStrategy: "replace" }]);
  await ops.run({ operation: "mcp-add", name: "new.srv", command: "npx" });
  assert.equal(requests.at(-2).params.edits[0].keyPath, 'mcp_servers."new.srv"');
  // Plain names keep the plain key path the bridges parse.
  await ops.run({ operation: "mcp-add", name: "fx-new", command: "npx" });
  assert.equal(requests.at(-2).params.edits[0].keyPath, "mcp_servers.fx-new");
});

test("connector add: the app's own tools server name is refused", async () => {
  const requests = [];
  const client = connectorClient(requests);
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [], archivedThreadIds: [] }), knownCwd: (cwd) => cwd });
  await ops.run({ operation: "mcp" });
  // Hidden from the listing (Settings › Code controls it), and never written to the user's config.
  await assert.rejects(ops.run({ operation: "mcp-add", name: "code_desktop", command: "evil" }), /code_desktop/);
  assert.equal(requests.some((r) => r.method === "config/batchWrite"), false);
});
