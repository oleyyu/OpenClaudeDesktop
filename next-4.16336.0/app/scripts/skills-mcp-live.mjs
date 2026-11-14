// Read-only live check for the Customize catalog against the real Codex
// app-server (real ~/.codex, no writes): skills/list, mcpServerStatus/list
// (global, detail toolsAndAuthOnly, bounded wait) and plugin/installed.
// Only counts and status distributions are recorded, never names or paths.
// Never runs skills/config/write, config/batchWrite or config/mcpServer/reload.
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const { CodexClient } = require("../electron/codex.cjs");
const { MCP_LIST_TIMEOUT } = require("../electron/customize-operations.cjs");
import { mcpRows, pluginRows, skillRows } from "../src/customize-model.mjs";

const evidence = path.resolve(import.meta.dirname, "../../analysis/skills-mcp-20260920");
await fs.mkdir(evidence, { recursive: true });
const cwd = path.resolve(import.meta.dirname, "../..");
const report = { passed: false, realCodex: true, readOnly: true, startedAt: new Date().toISOString(), cwd, codexHome: process.env.CODEX_HOME || "~/.codex (default)",
  scriptSha256: createHash("sha256").update(await fs.readFile(import.meta.filename)).digest("hex"), methods: [], checks: [] };
const client = new CodexClient({ cwd });
const requests = [];
const origRequest = client.request.bind(client);
client.request = (method, params, timeout, connection) => { requests.push(method); return origRequest(method, params, timeout, connection); };
const count = (list, key) => list.reduce((acc, row) => { acc[row[key] ?? "null"] = (acc[row[key] ?? "null"] || 0) + 1; return acc; }, {});
try {
  const init = await client.start();
  report.serverVersion = init?.serverInfo?.version ?? init?.version ?? null;
  const skills = await client.request("skills/list", { cwds: [cwd] }, 30000);
  const rows = skillRows(skills);
  report.skills = { entries: (skills?.data || []).length, skills: rows.skills.length, errors: rows.errors.length, byScope: count(rows.skills, "scope"), byGroup: count(rows.skills, "group"), enabled: rows.skills.filter((row) => row.enabled).length, pluginOwned: rows.skills.filter((row) => row.pluginId).length };
  report.checks.push(`skills/list returned ${rows.skills.length} skills (${rows.errors.length} errors) across ${report.skills.entries} cwd entries`);
  const started = Date.now();
  const mcp = await client.request("mcpServerStatus/list", { detail: "toolsAndAuthOnly" }, MCP_LIST_TIMEOUT);
  const servers = mcpRows(mcp);
  report.mcp = { ms: Date.now() - started, servers: servers.length, byRuntimeStatus: count(servers, "runtimeStatus"), byKind: count(servers, "kind"), byAuthStatus: count(servers, "authStatus"), toolCounts: servers.map((row) => row.tools.length), nextCursor: mcp?.nextCursor ?? null };
  if (servers.some((row) => row.kind === "connected")) throw new Error("A global listing (no threadId) must never map to Connected");
  report.checks.push(`mcpServerStatus/list (global) returned ${servers.length} servers in ${report.mcp.ms} ms; runtimeStatus ${JSON.stringify(report.mcp.byRuntimeStatus)} → no row reads Connected`);
  const plugins = await client.request("plugin/installed", { cwds: [cwd] }, 30000);
  const installed = pluginRows(plugins, rows.skills);
  report.plugins = { marketplaces: (plugins?.marketplaces || []).length, installed: installed.length, enabled: installed.filter((row) => row.enabled).length, bySource: count(installed, "source"), skillCounts: installed.map((row) => row.skillCount) };
  report.checks.push(`plugin/installed returned ${report.plugins.marketplaces} marketplaces with ${installed.length} installed plugins`);
  report.methods = requests;
  const WRITE_METHODS = new Set(["skills/config/write", "config/batchWrite", "config/mcpServer/reload", "mcpServer/oauth/login", "plugin/install", "plugin/uninstall", "config/write"]);
  const forbidden = requests.filter((method) => WRITE_METHODS.has(method));
  if (forbidden.length) throw new Error(`Write method issued: ${forbidden.join(", ")}`);
  report.passed = true;
} catch (error) {
  report.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await client.stopAndWait?.().catch?.(() => {}) ?? client.stop();
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(evidence, "live-readonly.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
