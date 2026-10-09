// Customize catalog operations (Skills / Connectors / Plugins) as a validated
// desktop:call family instead of widening the raw rpc allowlist. Every method
// exists in the installed Codex app-server schema (work/codex-schema-0.155.1
// ClientRequest.json): skills/list, skills/config/write, mcpServerStatus/list,
// config/mcpServer/reload, mcpServer/oauth/login, config/batchWrite,
// plugin/installed, plugin/read, hooks/list. Plugin management (install,
// remove, on/off) is a core's codeDesktop/plugin/* (the DeepSeek bridge's
// harness plugins.js, a bridge's own), offered only by a core with
// capabilities.pluginManage; a native core (Codex) without it manages plugins
// through the protocol's own marketplace/add, plugin/list, plugin/install,
// plugin/uninstall and config/value/write plugins.<id> (verified against
// codex 0.155.1 with an isolated CODEX_HOME).
//
// skills/config/write and config/batchWrite edit the shared ~/.codex/config.toml
// (the only real mechanism); the renderer says so next to those controls. A
// core reporting capabilities.mcpConfigWrite false (the DeepSeek bridge loads
// MCP servers from its own profile patch) never receives config/batchWrite.
const fs = require("node:fs");
const path = require("node:path");
const { coreById, coreForEngine, corePath } = require("./core-registry.mjs");
// The app's own tools server (agent-tools-host.cjs SERVER_NAME), left out of the connector lists.
const APP_TOOLS_SERVER = "code_desktop";
const { coreError } = require("./codex.cjs");
const { t } = require("./i18n/index.mjs");

// User-facing refusals go through the main-process t() (the renderer shows them as given). Copy about what a core
// can't do names the program by its descriptor name (Kimi Code, ZCode: the program that owns the config file);
// the DeepSeek core's own profile hint keeps "the DeepSeek core" (codex.cjs coreError).
const refusal = (source, values) => new Error(t(source, values));

const SERVER_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
// Codex AppToolApproval (app-server-protocol v2/config.rs): auto asks for tools that may change things, prompt always
// asks, writes asks unless the tool is read-only, approve never asks ('Always allow').
const MCP_TOOL_MODES = new Set(["auto", "prompt", "writes", "approve"]);
const plainObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null);
// A config keyPath segment, quoted so a dot or quote in a name stays part of it (Codex parse_key_path).
const keySegment = (value) => `"${String(value).replace(/[\\"]/g, (ch) => "\\" + ch)}"`;
// mcp_servers.<name> for add/remove: a plain name as is (the bridges read that form), any other quoted.
const serverKeyPath = (name) => `mcp_servers.${/^[A-Za-z0-9_-]+$/.test(name) ? name : keySegment(name)}`;
const MCP_LIST_TIMEOUT = 15000;
const MCP_WRITE_TIMEOUT = 30000;

const SKILL_FILE_MAX_BYTES = 512 * 1024;
// A pnpm install can download, build and fall back to a second registry.
const PLUGIN_INSTALL_TIMEOUT = 15 * 60 * 1000;
const PLUGIN_CHANGE_TIMEOUT = 5 * 60 * 1000;
const PLUGIN_INSPECT_TIMEOUT = 90 * 1000;
const PLUGIN_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

function createCustomizeOperations({ getClient, getConfig, knownCwd, stat = fs.promises.stat, readFile = fs.promises.readFile, openPath = null, home = () => require("node:os").homedir() }) {
  // Only paths returned by the last skills/list may be toggled or read; the
  // name selector is never used.
  const knownSkillPaths = new Set();
  // Agent definition files the last Customize › Agents listing named (Show in Finder only).
  const knownAgentPaths = new Set();
  // Agents with a file of their own the last listing named (agent-remove).
  const knownRemovableAgents = new Set();
  // Prompt templates of listed commands without a file (path "command:<name>"), for skill-file.
  const knownTemplates = new Map();
  // Names from the last mcpServerStatus/list, so "mcp-add" never upserts over
  // a server the CLI already has in the shared ~/.codex/config.toml.
  const knownServerNames = new Set();
  // A native core's plugins: ids from the last plugin/installed or plugin/list (uninstall, on/off), and the
  // marketplace file + name pairs plugin/list offered (install). Nothing else is ever sent.
  const knownPluginIds = new Set();
  const knownCatalog = new Set();
  // Marketplaces the user's own config.toml adds (marketplaces.<name>, from the last "marketplaces" listing): only
  // those can be removed, and only a git one updated (as the Codex TUI's plugin browser allows).
  const knownMarketplaces = new Map();
  // Hooks from the last hooks/list (key → {hash, managed}): only those can be trusted or switched (hooks-state).
  const knownHooks = new Map();
  // App ids from the last app/list: only those can be switched (app-enabled).
  const knownApps = new Set();
  const catalogKey = (marketplacePath, name) => `${marketplacePath}\0${name}`;

  const client = async () => { const owner = getClient(); await owner.start(); return owner; };
  const optionalString = (value, label) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string") throw new Error(`Invalid ${label}.`);
    return value;
  };
  function threadIdParam(threadId) {
    if (threadId === undefined || threadId === null || threadId === "") return undefined;
    const config = getConfig();
    if (typeof threadId !== "string" || ![...(config.threadIds || []), ...(config.archivedThreadIds || [])].includes(threadId)) throw new Error("Unknown session.");
    return threadId;
  }
  function cwdsParam(cwd) {
    if (cwd === undefined || cwd === null || cwd === "") return undefined;
    return [knownCwd(cwd)];
  }
  function serverName(name) {
    if (typeof name !== "string" || !SERVER_NAME.test(name)) throw refusal("Use 1–64 letters, digits, dots, dashes or underscores for the name.");
    return name;
  }
  // The running core's descriptor (core-registry.mjs) and the config file it writes.
  const descriptorOf = (owner) => coreForEngine(owner.serverInfo?.engine);
  // The running program's name: its initialize engine's descriptor, else the core the client spawned (a native
  // Extension Pack reports no engine), else that default descriptor.
  const coreLabel = (owner) => (owner.serverInfo?.engine ? null : coreById(owner.spawnedCore)?.name) || descriptorOf(owner).name;
  // Under the core's own home where it reports one (Codex's codexHome with CODEX_HOME: core-registry corePath).
  const configFileOf = (owner) => owner.serverInfo?.configPath || corePath(owner.serverInfo ?? null, descriptorOf(owner).configFile) || t("the {core} configuration", { core: descriptorOf(owner).name });
  function assertMcpWritable(owner) {
    const info = owner.serverInfo;
    if (info?.capabilities?.mcpConfigWrite !== false) return;
    const descriptor = descriptorOf(owner);
    // The DeepSeek core loads @deepseek-ai/dsh-mcp-client entries from its profile; another core reads its own config.
    throw descriptor.id === "deepseek"
      ? coreError(owner, "Connector changes are not supported by the {core} core. Add a @deepseek-ai/dsh-mcp-client entry to {file}, then Reconnect.", { file: info.configPath || t("the core profile") })
      : refusal("Connector changes are not supported by {core}. Add the server to {file}, then Reconnect.", { core: coreLabel(owner), file: configFileOf(owner) });
  }
  function assertPluginManage(owner) {
    if (owner.serverInfo?.capabilities?.pluginManage !== true) throw refusal("Plugin management is not supported by {core}.", { core: coreLabel(owner) });
  }
  // Per-connector settings (on/off, per-tool on/off and approval) live in a native core's own config.toml
  // (Codex mcp_servers.<name>: enabled, enabled_tools, disabled_tools, default_tools_approval_mode,
  // tools.<tool>.approval_mode; verified against codex 0.155.1 with an isolated CODEX_HOME).
  function assertNativeMcp(owner) {
    if (descriptorOf(owner).kind !== "native" || owner.serverInfo?.capabilities?.mcpConfigWrite === false) throw refusal("Connector settings are not supported by {core}.", { core: coreLabel(owner) });
  }
  // Codex's sub-agent roles for Customize › Agents: the built-ins (role.rs built_in::configs, described here in the UI
  // language) and every [agents.<role>] table (its description as written; its config_file as the path to show).
  // The table's other keys (max_depth, default_subagent_model, …) are settings, not roles.
  const CODEX_AGENT_SETTINGS = new Set(["enabled", "max_concurrent_threads_per_session", "max_depth", "default_subagent_model", "default_subagent_reasoning_effort", "job_max_runtime_seconds", "interrupt_message", "max_threads"]);
  async function codexAgentRoles(owner, cwd) {
    const result = await owner.request("config/read", cwd ? { cwd } : {}, MCP_LIST_TIMEOUT).catch(() => null);
    const agents = plainObject(result?.config?.agents) ?? {};
    const origins = plainObject(result?.origins) ?? {};
    const builtins = [
      ["default", t("The agent Codex uses when it doesn’t pick a type: the same as the session.")],
      ["explorer", t("Answers specific questions about the codebase. Fast; Codex can run several at once.")],
      ["worker", t("Does the work itself: implements part of a feature, fixes tests or bugs, takes a slice of a refactor.")],
    ];
    const rows = new Map(builtins.map(([name, description]) => [name, { name, description, scope: "builtin", path: null, tools: null, model: null }]));
    for (const [name, value] of Object.entries(agents)) {
      if (CODEX_AGENT_SETTINGS.has(name) || !plainObject(value) || !/^[A-Za-z0-9_.-]{1,64}$/.test(name)) continue;
      const description = typeof value.description === "string" ? value.description.trim().slice(0, 400) : "";
      const origin = origins[`agents.${name}.description`] ?? origins[`agents.${name}.config_file`] ?? null;
      const configFile = typeof value.config_file === "string" && path.isAbsolute(value.config_file) ? value.config_file : null;
      rows.set(name, { name, description, scope: origin?.name?.type === "project" ? "project" : "user", path: configFile, tools: null, model: null });
    }
    return { agents: [...rows.values()] };
  }
  // The effective mcp_servers.<name> settings, and whether the user's config.toml defines the server (only then
  // are its settings written there: a server from a project's .codex/config.toml, or a plugin's, stays as it is).
  async function mcpServerConfig(owner, name, cwd) {
    const result = await owner.request("config/read", cwd ? { cwd } : {}, MCP_LIST_TIMEOUT);
    const servers = plainObject(result?.config?.mcp_servers) ?? {};
    const origins = plainObject(result?.origins) ?? {};
    const origin = origins[`mcp_servers.${name}.command`] ?? origins[`mcp_servers.${name}.url`];
    return { value: plainObject(servers[name]), editable: origin?.name?.type === "user" };
  }
  function mcpServerSettings(value, editable) {
    const strings = (list) => (Array.isArray(list) ? list.filter((item) => typeof item === "string" && item) : null);
    const tools = {};
    for (const [tool, entry] of Object.entries(plainObject(value?.tools) ?? {})) if (MCP_TOOL_MODES.has(entry?.approval_mode)) tools[tool] = entry.approval_mode;
    return { enabled: value?.enabled !== false, enabledTools: strings(value?.enabled_tools), disabledTools: strings(value?.disabled_tools) ?? [],
      defaultMode: MCP_TOOL_MODES.has(value?.default_tools_approval_mode) ? value.default_tools_approval_mode : null, tools, editable };
  }
  function toolName(value) {
    if (typeof value !== "string" || !value || value.length > 128 || /[\u0000-\u001f]/.test(value)) throw new Error("Unknown tool.");
    return value;
  }
  function toolMode(value) {
    if (value === null) return null;
    if (!MCP_TOOL_MODES.has(value)) throw new Error("Invalid approval setting.");
    return value;
  }
  async function writeMcpSettings(owner, edits) {
    await owner.request("config/batchWrite", { edits, reloadUserConfig: true }, MCP_WRITE_TIMEOUT);
    await owner.request("config/mcpServer/reload", {}, MCP_WRITE_TIMEOUT);
  }
  // The protocol's own plugin management: a native core that has no codeDesktop/plugin/* manager.
  function assertNativePlugins(owner) {
    if (descriptorOf(owner).kind !== "native" || owner.serverInfo?.capabilities?.pluginManage === true) throw refusal("Plugin management is not supported by {core}.", { core: coreLabel(owner) });
  }
  function pluginSpec(value) {
    const spec = typeof value === "string" ? value.trim() : "";
    if (!spec || spec.length > 2048 || spec.includes("\0") || spec.startsWith("-")) throw refusal("Enter a plugin package name, path or URL.");
    return spec;
  }
  // marketplace/add source: a git URL, owner/repo or a local folder (the same shape checks as a plugin spec).
  function marketplaceSource(value) {
    const source = typeof value === "string" ? value.trim() : "";
    if (!source || source.length > 2048 || source.includes("\0") || source.startsWith("-")) throw refusal("Enter a marketplace: a git URL, owner/repo or a local folder.");
    return source;
  }
  const shareablePaths = new Set(), sharedPluginIds = new Set();
  function rememberPlugins(result, { catalog = false } = {}) {
    if (catalog) knownCatalog.clear();
    for (const marketplace of result?.marketplaces || []) {
      for (const plugin of marketplace?.plugins || []) {
        if (typeof plugin?.id === "string" && plugin.id) knownPluginIds.add(plugin.id);
        if (catalog && typeof marketplace.path === "string" && marketplace.path && typeof plugin?.name === "string" && plugin.name) knownCatalog.add(catalogKey(marketplace.path, plugin.name));
        // A shared / workspace marketplace (remote, no file): installed by its name (plugin/install remoteMarketplaceName).
        if (catalog && !marketplace.path && marketplace.codeDesktop?.shareKind && typeof marketplace.name === "string" && typeof plugin?.name === "string" && plugin.name) knownCatalog.add(catalogKey(`remote:${marketplace.name}`, plugin.name));
        // A local plugin that can be shared (plugin/share/save takes its folder).
        if (plugin?.source?.type === "local" && typeof plugin.source.path === "string" && plugin.source.path) shareablePaths.add(plugin.source.path);
        for (const id of [plugin?.remotePluginId, plugin?.shareContext?.remotePluginId]) if (typeof id === "string" && id) sharedPluginIds.add(id);
      }
    }
    return result;
  }
  function knownPluginId(value) {
    if (typeof value !== "string" || !knownPluginIds.has(value)) throw new Error("Unknown plugin.");
    return value;
  }
  // An install source the form picked: an http(s) registry URL, or nothing for the core's own order.
  function pluginRegistry(value) {
    if (value === undefined || value === null || value === "") return {};
    let url;
    try { url = new URL(String(value)); } catch { throw new Error("Invalid registry."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid registry.");
    return { registry: url.href };
  }
  function pluginName(value) {
    if (typeof value !== "string" || !value || value.length > 214 || value.includes("\0")) throw new Error("Unknown plugin.");
    return value;
  }
  async function skillUpdatedAt(skillPath) {
    // SkillMetadata.path is the SKILL.md file; a directory path also works.
    const candidates = skillPath.endsWith("SKILL.md") ? [skillPath] : [path.join(skillPath, "SKILL.md"), skillPath];
    for (const candidate of candidates) {
      try {
        const info = await stat(candidate);
        return Math.floor(info.mtimeMs / 1000);
      } catch { /* try the next candidate */ }
    }
    return null;
  }

  async function run(p = {}) {
    const operation = p.operation;
    switch (operation) {
      case "skills": {
        const owner = await client();
        const params = {};
        const cwds = cwdsParam(p.cwd);
        if (cwds) params.cwds = cwds;
        if (p.forceReload === true) params.forceReload = true;
        const result = await owner.request("skills/list", params);
        const updatedAt = {};
        knownSkillPaths.clear();
        knownTemplates.clear();
        for (const entry of result?.data || []) {
          for (const skill of entry?.skills || []) {
            if (typeof skill?.path !== "string" || !skill.path) continue;
            knownSkillPaths.add(skill.path);
            // A bridge's slash command with no file of its own (OpenCode's built-ins, an opencode.json command): its
            // prompt template, which the detail shows (skill-file).
            if (typeof skill.codeDesktop?.template === "string") knownTemplates.set(skill.path, skill.codeDesktop.template.slice(0, SKILL_FILE_MAX_BYTES));
            if (!(skill.path in updatedAt)) updatedAt[skill.path] = await skillUpdatedAt(skill.path);
          }
        }
        return { data: result?.data || [], updatedAt };
      }
      case "skill-file": {
        // SKILL.md of a listed skill, read straight from disk (there is no
        // app-server method for it). Missing file => content null, which the
        // renderer draws as the official "No files to show."
        if (typeof p.path !== "string" || !knownSkillPaths.has(p.path)) throw new Error("Unknown skill.");
        if (p.path.startsWith("command:")) return { path: p.path, content: knownTemplates.get(p.path) ?? null };
        // A command's own Markdown file (OpenCode's command/<name>.md) is shown as it is.
        const target = p.path.endsWith("SKILL.md") || (p.path.endsWith(".md") && path.isAbsolute(p.path)) ? p.path : path.join(p.path, "SKILL.md");
        let info;
        try { info = await stat(target); }
        catch { return { path: target, content: null }; }
        if (typeof info.isFile === "function" && !info.isFile()) return { path: target, content: null };
        if (Number.isFinite(info.size) && info.size > SKILL_FILE_MAX_BYTES) throw refusal("The skill file is too large to show.");
        return { path: target, content: await readFile(target, "utf8") };
      }
      case "skill-toggle": {
        if (typeof p.path !== "string" || !knownSkillPaths.has(p.path)) throw new Error("Unknown skill.");
        if (typeof p.enabled !== "boolean") throw new Error("Invalid skill setting.");
        const owner = await client();
        const result = await owner.request("skills/config/write", { path: p.path, enabled: p.enabled });
        return { effectiveEnabled: typeof result?.effectiveEnabled === "boolean" ? result.effectiveEnabled : p.enabled };
      }
      case "mcp": {
        const owner = await client();
        const params = { detail: "toolsAndAuthOnly" };
        const threadId = threadIdParam(p.threadId);
        if (threadId) params.threadId = threadId;
        const cursor = optionalString(p.cursor, "cursor");
        if (cursor) params.cursor = cursor;
        // The listing may start configured servers; bound the wait.
        const listed = await owner.request("mcpServerStatus/list", params, MCP_LIST_TIMEOUT);
        // OpenClaude Desktop's own tools server (agent-tools-host.cjs "code_desktop", which every core runs for the app's
        // sessions) is never one of the user's connectors: Settings › Code › Preview and Dynamic workflows control it.
        const result = listed && Array.isArray(listed.data) ? { ...listed, data: listed.data.filter((server) => server?.name !== APP_TOOLS_SERVER) } : listed;
        knownServerNames.clear();
        for (const server of result?.data || []) if (typeof server?.name === "string" && server.name) knownServerNames.add(server.name);
        return result;
      }
      case "mcp-reload": {
        const owner = await client();
        await owner.request("config/mcpServer/reload", {}, MCP_WRITE_TIMEOUT);
        return true;
      }
      case "mcp-login": {
        const owner = await client();
        const params = { name: serverName(p.name) };
        const threadId = threadIdParam(p.threadId);
        if (threadId) params.threadId = threadId;
        const result = await owner.request("mcpServer/oauth/login", params, MCP_WRITE_TIMEOUT);
        const url = new URL(String(result?.authorizationUrl || ""));
        if (!["https:", "http:"].includes(url.protocol)) throw refusal("The sign-in URL is not supported.");
        // The renderer opens it through the "external" operation; never loaded here.
        return { authorizationUrl: url.href };
      }
      // Sign out of a connector the core signed in to itself (capabilities.mcpLogout: Qwen's clear-auth).
      case "mcp-logout": {
        const owner = await client();
        if (owner.serverInfo?.capabilities?.mcpLogout !== true) throw refusal("Connector sign-out is not supported by {core}.", { core: coreLabel(owner) });
        await owner.request("codeDesktop/mcpServer/logout", { name: serverName(p.name) }, MCP_WRITE_TIMEOUT);
        return {};
      }
      case "mcp-add": {
        const name = serverName(p.name);
        const owner = await client();
        assertMcpWritable(owner);
        // An upsert on an existing mcp_servers.<name> would silently replace
        // the CLI's command/args/env/url. Refuse instead; removal stays the
        // explicit, confirmation-gated path.
        if (knownServerNames.has(name)) throw refusal("A connector named {name} is already in {file}. Remove it first or choose another name.", { name, file: configFileOf(owner) });
        // oauth (a pre-registered OAuth client) only where the core takes it (capabilities.mcpOAuthClient: OpenCode).
        const value = mcpServerValue(p, { oauth: owner.serverInfo?.capabilities?.mcpOAuthClient === true });
        await owner.request("config/batchWrite", { edits: [{ keyPath: serverKeyPath(name), value, mergeStrategy: "upsert" }], reloadUserConfig: true }, MCP_WRITE_TIMEOUT);
        await owner.request("config/mcpServer/reload", {}, MCP_WRITE_TIMEOUT);
        return { name, value };
      }
      case "mcp-remove": {
        // A null value clears the key (config_manager_service apply_merge →
        // clear_path); verified against an isolated CODEX_HOME before use.
        const name = serverName(p.name);
        const owner = await client();
        assertMcpWritable(owner);
        await owner.request("config/batchWrite", { edits: [{ keyPath: serverKeyPath(name), value: null, mergeStrategy: "replace" }], reloadUserConfig: true }, MCP_WRITE_TIMEOUT);
        await owner.request("config/mcpServer/reload", {}, MCP_WRITE_TIMEOUT);
        knownServerNames.delete(name);
        return { name };
      }
      case "agents": {
        // The core's own sub-agents (codeDesktop/agents/list), only on a core that reports agentsList.
        const owner = await client();
        // Codex: its built-in roles (core/src/agent/role.rs: default, explorer, worker) and the user's or project's own
        // [agents.<role>] tables from config/read, which spawn_agent's agent_type names.
        const listed = descriptorOf(owner).kind === "native" && descriptorOf(owner).id === "codex" ? await codexAgentRoles(owner, cwdsParam(p.cwd)?.[0] ?? null)
          : owner.serverInfo?.capabilities?.agentsList !== true ? { agents: [] }
          : await owner.request("codeDesktop/agents/list", cwdsParam(p.cwd) ? { cwd: cwdsParam(p.cwd)[0] } : {});
        // An agent's file is one Show in Finder may reveal (main.cjs reveal-item).
        knownAgentPaths.clear(); knownRemovableAgents.clear();
        for (const agent of Array.isArray(listed?.agents) ? listed.agents : []) {
          if (typeof agent?.path === "string" && path.isAbsolute(agent.path)) knownAgentPaths.add(agent.path);
          if (agent?.removable === true && typeof agent.name === "string") knownRemovableAgents.add(agent.name);
        }
        return listed;
      }
      // Customize › Agents' Create agent and Delete on a core that writes its own agent files (capabilities.agentsWrite:
      // OpenCode, MiMo). The fields are rebuilt here; only an agent the last listing named can be removed.
      case "agent-write": {
        const owner = await client();
        if (owner.serverInfo?.capabilities?.agentsWrite !== true) throw refusal("Creating agents is not supported by {core}.", { core: coreLabel(owner) });
        const scope = p.scope === "user" ? "user" : "project";
        const cwds = cwdsParam(p.cwd);
        if (scope === "project" && !cwds) throw refusal("Open a project first to add an agent to it.");
        const text = (value, max) => typeof value === "string" && value.length <= max ? value : "";
        const deny = Array.isArray(p.deny) ? p.deny.filter((key) => typeof key === "string" && /^[a-z]{1,32}$/.test(key)).slice(0, 20) : [];
        return owner.request("codeDesktop/agents/write", { ...(cwds ? { cwd: cwds[0] } : {}), scope, name: text(p.name, 64), description: text(p.description, 1000),
          mode: ["subagent", "primary", "all"].includes(p.mode) ? p.mode : "subagent", ...(text(p.model, 200) ? { model: p.model } : {}), prompt: text(p.prompt, 100000), deny });
      }
      case "agent-remove": {
        const owner = await client();
        if (owner.serverInfo?.capabilities?.agentsWrite !== true) throw refusal("Creating agents is not supported by {core}.", { core: coreLabel(owner) });
        if (typeof p.name !== "string" || !knownRemovableAgents.has(p.name)) throw new Error("Unknown agent.");
        const cwds = cwdsParam(p.cwd);
        return owner.request("codeDesktop/agents/remove", { ...(cwds ? { cwd: cwds[0] } : {}), name: p.name });
      }
      case "mcp-trust": {
        // A known workspace folder trusted as the agent's own trust prompt does (codeDesktop/workspace/trust), only on a
        // core that reports workspaceTrust; the user chose it on the connector's page.
        const owner = await client();
        if (owner.serverInfo?.capabilities?.workspaceTrust !== true) throw refusal("Folder trust is not supported by {core}.", { core: coreLabel(owner) });
        const cwd = knownCwd(p.cwd);
        return owner.request("codeDesktop/workspace/trust", { cwd }, MCP_WRITE_TIMEOUT);
      }
      case "mcp-config": {
        // Every listed connector's settings ({servers: {name: {enabled, enabledTools, disabledTools, defaultMode,
        // tools: {tool: mode}, editable}}}) for Customize › Connectors and the composer's Connectors menu.
        const owner = await client();
        assertNativeMcp(owner);
        const cwds = cwdsParam(p.cwd);
        const result = await owner.request("config/read", cwds ? { cwd: cwds[0] } : {}, MCP_LIST_TIMEOUT);
        const servers = plainObject(result?.config?.mcp_servers) ?? {};
        const origins = plainObject(result?.origins) ?? {};
        const out = {};
        for (const [name, value] of Object.entries(servers)) {
          if (!SERVER_NAME.test(name) || !plainObject(value) || name === APP_TOOLS_SERVER) continue;
          const origin = origins[`mcp_servers.${name}.command`] ?? origins[`mcp_servers.${name}.url`];
          out[name] = mcpServerSettings(value, origin?.name?.type === "user");
        }
        return { servers: out };
      }
      case "mcp-enable": {
        // On: the key is cleared (Codex's default is on); off: enabled = false.
        const name = serverName(p.name);
        if (typeof p.enabled !== "boolean") throw new Error("Invalid connector setting.");
        const owner = await client();
        // A bridge that turns its agent's connectors on and off itself (capabilities.mcpEnable: OpenCode, MiMo).
        if (descriptorOf(owner).kind !== "native" && owner.serverInfo?.capabilities?.mcpEnable === true) {
          if (!knownServerNames.has(name)) throw new Error("Unknown connector.");
          await writeMcpSettings(owner, [{ keyPath: `mcp_servers.${keySegment(name)}.enabled`, value: p.enabled, mergeStrategy: "replace" }]);
          return { name, enabled: p.enabled };
        }
        assertNativeMcp(owner);
        const { editable } = await mcpServerConfig(owner, name, cwdsParam(p.cwd)?.[0]);
        if (!editable) throw refusal("{name} is defined outside {file}, so it can’t be changed here.", { name, file: configFileOf(owner) });
        await writeMcpSettings(owner, [{ keyPath: `mcp_servers.${keySegment(name)}.enabled`, value: p.enabled ? null : false, mergeStrategy: "replace" }]);
        return { name, enabled: p.enabled };
      }
      case "mcp-tool": {
        // One tool: on/off (disabled_tools; an enabled_tools allowlist gains it when turned on) and its approval
        // (tools.<tool>.approval_mode: auto, prompt, writes, approve; null clears an 'Always allow' Codex saved).
        // Or, with no tool, the connector's default approval (default_tools_approval_mode).
        const name = serverName(p.name);
        const owner = await client();
        assertNativeMcp(owner);
        const { value, editable } = await mcpServerConfig(owner, name, cwdsParam(p.cwd)?.[0]);
        if (!editable) throw refusal("{name} is defined outside {file}, so it can’t be changed here.", { name, file: configFileOf(owner) });
        const base = `mcp_servers.${keySegment(name)}`;
        const edits = [];
        if (p.tool === undefined || p.tool === null) {
          if (p.mode === undefined) throw new Error("Invalid approval setting.");
          edits.push({ keyPath: `${base}.default_tools_approval_mode`, value: toolMode(p.mode), mergeStrategy: "replace" });
        } else {
          const tool = toolName(p.tool);
          if (p.enabled !== undefined) {
            if (typeof p.enabled !== "boolean") throw new Error("Invalid tool setting.");
            const disabled = new Set(Array.isArray(value?.disabled_tools) ? value.disabled_tools.filter((item) => typeof item === "string") : []);
            if (p.enabled) disabled.delete(tool); else disabled.add(tool);
            edits.push({ keyPath: `${base}.disabled_tools`, value: disabled.size ? [...disabled] : null, mergeStrategy: "replace" });
            if (p.enabled && Array.isArray(value?.enabled_tools) && !value.enabled_tools.includes(tool))
              edits.push({ keyPath: `${base}.enabled_tools`, value: [...value.enabled_tools.filter((item) => typeof item === "string"), tool], mergeStrategy: "replace" });
          }
          if (p.mode !== undefined) edits.push({ keyPath: `${base}.tools.${keySegment(tool)}.approval_mode`, value: toolMode(p.mode), mergeStrategy: "replace" });
        }
        if (!edits.length) throw new Error("Invalid tool setting.");
        await writeMcpSettings(owner, edits);
        return { name };
      }
      case "plugins": {
        const owner = await client();
        const params = {};
        const cwds = cwdsParam(p.cwd);
        if (cwds) params.cwds = cwds;
        const result = await owner.request("plugin/installed", params);
        if (descriptorOf(owner).kind === "native") rememberPlugins(result);
        return result;
      }
      case "plugin-catalog": {
        // A native core's marketplaces with every plugin they offer (installed or not), or a bridge's own catalog
        // (capabilities.pluginCatalog: MiniMax), installed by name through codeDesktop/plugin/install.
        const owner = await client();
        if (owner.serverInfo?.capabilities?.pluginCatalog !== true) assertNativePlugins(owner);
        const params = {};
        const cwds = cwdsParam(p.cwd);
        if (cwds) params.cwds = cwds;
        const result = await owner.request("plugin/list", params);
        // A ChatGPT workspace's plugins (Codex plugin_sharing / remote_plugin): shared with you, your workspace's
        // directory and the ones you shared, each its own marketplace tagged codeDesktop.shareKind. Signed out (or a
        // core without them) these calls fail and nothing is added.
        if (owner.serverInfo?.capabilities?.pluginCatalog !== true) {
          const kinds = ["shared-with-me", "workspace-directory", "created-by-me-remote"];
          const shared = await Promise.all(kinds.map((kind) => owner.request("plugin/list", { ...params, marketplaceKinds: [kind] }, MCP_LIST_TIMEOUT).then((value) => ({ kind, value }), () => null)));
          const names = new Set((result?.marketplaces || []).map((entry) => entry?.name));
          for (const entry of shared) for (const marketplace of entry?.value?.marketplaces || []) {
            if (!marketplace || marketplace.path || names.has(marketplace.name)) continue;
            names.add(marketplace.name);
            (result.marketplaces ??= []).push({ ...marketplace, codeDesktop: { shareKind: entry.kind } });
          }
        }
        return rememberPlugins(result, { catalog: true });
      }
      case "marketplace-add": {
        const owner = await client();
        assertNativePlugins(owner);
        // A git source is cloned; bound the wait like a plugin change.
        return owner.request("marketplace/add", { source: marketplaceSource(p.source) }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "marketplaces": {
        // [{name, sourceType, source}] of the marketplaces the user's config.toml adds (config/read marketplaces).
        const owner = await client();
        assertNativePlugins(owner);
        const result = await owner.request("config/read", {}, MCP_LIST_TIMEOUT);
        const configured = plainObject(result?.config?.marketplaces) ?? {};
        const origins = plainObject(result?.origins) ?? {};
        knownMarketplaces.clear();
        const out = [];
        for (const [name, value] of Object.entries(configured)) {
          if (!plainObject(value) || typeof name !== "string" || !name || name.length > 128) continue;
          if (origins[`marketplaces.${name}.source`]?.name?.type !== "user" && origins[`marketplaces.${name}.source_type`]?.name?.type !== "user") continue;
          const entry = { name, sourceType: typeof value.source_type === "string" ? value.source_type : null, source: typeof value.source === "string" ? value.source : null,
            // MarketplaceConfig last_updated (RFC 3339, written by marketplace add / upgrade): c6a2a31c4 Us "Last updated".
            lastUpdated: typeof value.last_updated === "string" && value.last_updated ? value.last_updated : null };
          knownMarketplaces.set(name, entry);
          out.push(entry);
        }
        return { marketplaces: out.sort((a, b) => a.name.localeCompare(b.name)) };
      }
      case "marketplace-remove": {
        const owner = await client();
        assertNativePlugins(owner);
        if (typeof p.name !== "string" || !knownMarketplaces.has(p.name)) throw new Error("Unknown marketplace.");
        const result = await owner.request("marketplace/remove", { marketplaceName: p.name }, PLUGIN_CHANGE_TIMEOUT);
        knownMarketplaces.delete(p.name);
        return result;
      }
      case "marketplace-upgrade": {
        // A git marketplace pulls its newest plugins; {selectedMarketplaces, upgradedRoots, errors}.
        const owner = await client();
        assertNativePlugins(owner);
        if (typeof p.name !== "string" || knownMarketplaces.get(p.name)?.sourceType !== "git") throw new Error("Unknown marketplace.");
        return owner.request("marketplace/upgrade", { marketplaceName: p.name }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-install-native": {
        const owner = await client();
        assertNativePlugins(owner);
        // A shared / workspace plugin: by its remote marketplace's name.
        if (typeof p.remoteMarketplaceName === "string" && p.remoteMarketplaceName) {
          if (typeof p.pluginName !== "string" || !knownCatalog.has(catalogKey(`remote:${p.remoteMarketplaceName}`, p.pluginName))) throw new Error("Unknown plugin.");
          return owner.request("plugin/install", { remoteMarketplaceName: p.remoteMarketplaceName, pluginName: p.pluginName }, PLUGIN_CHANGE_TIMEOUT);
        }
        if (typeof p.marketplacePath !== "string" || typeof p.pluginName !== "string" || !knownCatalog.has(catalogKey(p.marketplacePath, p.pluginName))) throw new Error("Unknown plugin.");
        return owner.request("plugin/install", { marketplacePath: p.marketplacePath, pluginName: p.pluginName }, PLUGIN_CHANGE_TIMEOUT);
      }
      // Share a local plugin with your ChatGPT workspace (plugin/share/save: an unlisted link, or listed in the
      // workspace directory), and stop sharing it (plugin/share/delete).
      case "plugin-share": {
        const owner = await client();
        assertNativePlugins(owner);
        if (typeof p.pluginPath !== "string" || !shareablePaths.has(p.pluginPath)) throw new Error("Unknown plugin.");
        const discoverability = ["LISTED", "UNLISTED", "PRIVATE"].includes(p.discoverability) ? p.discoverability : "UNLISTED";
        return owner.request("plugin/share/save", { pluginPath: p.pluginPath, discoverability, ...(typeof p.remotePluginId === "string" && sharedPluginIds.has(p.remotePluginId) ? { remotePluginId: p.remotePluginId } : {}) }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-unshare": {
        const owner = await client();
        assertNativePlugins(owner);
        if (typeof p.remotePluginId !== "string" || !sharedPluginIds.has(p.remotePluginId)) throw new Error("Unknown plugin.");
        return owner.request("plugin/share/delete", { remotePluginId: p.remotePluginId }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-uninstall": {
        const owner = await client();
        assertNativePlugins(owner);
        const pluginId = knownPluginId(p.pluginId);
        const result = await owner.request("plugin/uninstall", { pluginId }, PLUGIN_CHANGE_TIMEOUT);
        knownPluginIds.delete(pluginId);
        return result;
      }
      case "plugin-enable-native": {
        // The Codex TUI's own switch: config/value/write plugins.<id> = {enabled}.
        const owner = await client();
        assertNativePlugins(owner);
        const pluginId = knownPluginId(p.pluginId);
        if (typeof p.enabled !== "boolean") throw new Error("Invalid plugin state.");
        return owner.request("config/value/write", { keyPath: `plugins.${pluginId}`, value: { enabled: p.enabled }, mergeStrategy: "upsert" }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-read": {
        if (typeof p.pluginName !== "string" || !p.pluginName) throw new Error("Unknown plugin.");
        const owner = await client();
        const params = { pluginName: p.pluginName };
        const marketplacePath = optionalString(p.marketplacePath, "marketplace path");
        if (marketplacePath) params.marketplacePath = marketplacePath;
        // A bridge reads a project plugin in the Customize folder (OpenCode's project plugins); Codex's PluginReadParams has none.
        const cwds = descriptorOf(owner).kind !== "native" ? cwdsParam(p.cwd) : undefined;
        if (cwds) params.cwds = cwds;
        return owner.request("plugin/read", params);
      }
      case "plugin-inspect": {
        const owner = await client();
        assertPluginManage(owner);
        return owner.request("codeDesktop/plugin/inspect", { spec: pluginSpec(p.spec), ...pluginRegistry(p.registry) }, PLUGIN_INSPECT_TIMEOUT);
      }
      case "plugin-install": {
        const owner = await client();
        assertPluginManage(owner);
        if (typeof p.requestId !== "string" || !PLUGIN_REQUEST_ID.test(p.requestId)) throw new Error("Invalid install request.");
        const params = { spec: pluginSpec(p.spec), requestId: p.requestId };
        // "Allow these scripts and retry": the package names the failed run reported, approved by the user.
        if (p.approvedBuilds !== undefined) {
          if (!Array.isArray(p.approvedBuilds) || p.approvedBuilds.length > 200 || p.approvedBuilds.some((name) => typeof name !== "string" || !name || name.length > 214)) throw new Error("Invalid build approval.");
          params.approvedBuilds = p.approvedBuilds;
        }
        Object.assign(params, pluginRegistry(p.registry));
        return owner.request("codeDesktop/plugin/install", params, PLUGIN_INSTALL_TIMEOUT);
      }
      case "plugin-registries": {
        // The install form's source picker (dsh-plugin-manager registries()).
        const owner = await client();
        assertPluginManage(owner);
        return owner.request("codeDesktop/plugin/registries", {}, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-cancel-install": {
        const owner = await client();
        assertPluginManage(owner);
        if (typeof p.requestId !== "string" || !PLUGIN_REQUEST_ID.test(p.requestId)) throw new Error("Invalid install request.");
        return owner.request("codeDesktop/plugin/cancelInstall", { requestId: p.requestId }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-set-enabled": {
        const owner = await client();
        assertPluginManage(owner);
        if (typeof p.enabled !== "boolean") throw new Error("Invalid plugin state.");
        return owner.request("codeDesktop/plugin/setEnabled", { pluginName: pluginName(p.pluginName), enabled: p.enabled }, PLUGIN_CHANGE_TIMEOUT);
      }
      // Customize › Skills › Add from URL / Delete (capabilities.skillInstall: Qwen's managed skills).
      case "skill-install":
      case "skill-delete": {
        const owner = await client();
        if (owner.serverInfo?.capabilities?.skillInstall !== true) throw refusal("Adding skills is not supported by {core}.", { core: coreLabel(owner) });
        const slug = typeof p.slug === "string" ? p.slug.trim() : "";
        if (!/^[A-Za-z0-9._-]{1,64}$/.test(slug) || slug === "." || slug === "..") throw new Error(t("Use letters, digits, dots, dashes or underscores for the skill name."));
        if (p.operation === "skill-install") {
          let parsed;
          try { parsed = new URL(String(p.url ?? "").trim()); } catch { parsed = null; }
          if (!parsed || parsed.protocol !== "https:") throw new Error(t("Enter the https:// address of a SKILL.md file."));
          return owner.request("codeDesktop/skills/install", { slug, url: parsed.href }, PLUGIN_CHANGE_TIMEOUT);
        }
        return owner.request("codeDesktop/skills/delete", { slug }, PLUGIN_CHANGE_TIMEOUT);
      }
      // One MCP server of an installed plugin on or off (capabilities.pluginServerToggle: Kimi's setMcpServerEnabled).
      case "plugin-mcp-server": {
        const owner = await client();
        assertPluginManage(owner);
        if (owner.serverInfo?.capabilities?.pluginServerToggle !== true) throw refusal("Plugin connectors can’t be switched one by one on {core}.", { core: coreLabel(owner) });
        if (typeof p.server !== "string" || !p.server.trim() || p.server.length > 200 || typeof p.enabled !== "boolean") throw new Error("Unknown connector.");
        return owner.request("codeDesktop/plugin/mcpServer/setEnabled", { pluginName: pluginName(p.pluginName), server: p.server, enabled: p.enabled }, PLUGIN_CHANGE_TIMEOUT);
      }
      // Update an installed plugin from its source (capabilities.pluginUpdate: Qwen's `extensions update`).
      case "plugin-update": {
        const owner = await client();
        assertPluginManage(owner);
        if (owner.serverInfo?.capabilities?.pluginUpdate !== true) throw refusal("Updating plugins is not supported by {core}.", { core: coreLabel(owner) });
        return owner.request("codeDesktop/plugin/update", { pluginName: pluginName(p.pluginName) }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "plugin-remove": {
        const owner = await client();
        assertPluginManage(owner);
        return owner.request("codeDesktop/plugin/remove", { pluginName: pluginName(p.pluginName) }, PLUGIN_CHANGE_TIMEOUT);
      }
      case "hooks": {
        const owner = await client();
        const params = {};
        const cwds = cwdsParam(p.cwd);
        if (cwds) params.cwds = cwds;
        const result = await owner.request("hooks/list", params);
        for (const entry of Array.isArray(result?.data) ? result.data : [])
          for (const hook of Array.isArray(entry?.hooks) ? entry.hooks : [])
            if (typeof hook?.key === "string") knownHooks.set(hook.key, { hash: typeof hook.currentHash === "string" ? hook.currentHash : null, managed: hook.isManaged === true });
        return result;
      }
      // A connector's model requests on MiMo (capabilities.mcpSampling: mcp.<name>.sampling ask / allow / deny), in the
      // bridge's overlay; only a connector the last listing named.
      case "mcp-sampling": {
        const owner = await client();
        if (owner.serverInfo?.capabilities?.mcpSampling !== true) throw refusal("Connector model requests are not supported by {core}.", { core: coreLabel(owner) });
        const name = serverName(p.name);
        if (!knownServerNames.has(name)) throw new Error("Unknown connector.");
        if (!["ask", "allow", "deny"].includes(p.policy)) throw new Error("Choose ask, allow or deny.");
        return owner.request("config/batchWrite", { edits: [{ keyPath: `mcp_servers.${keySegment(name)}.sampling`, value: p.policy, mergeStrategy: "replace" }], reloadUserConfig: true }, MCP_WRITE_TIMEOUT);
      }
      // ChatGPT Apps (Codex /apps, chatwidget/connectors.rs): app/list (paged; forceRefetch for Reload), and an app's switch
      // in config.toml apps.<id>.enabled (config_update.rs app_scoped_key_path). A native core only; ids from the listing.
      case "apps": {
        const owner = await client();
        if (descriptorOf(owner).kind !== "native") throw refusal("Apps are not supported by {core}.", { core: coreLabel(owner) });
        const data = [];
        let cursor = null;
        for (let page = 0; page < 10; page++) {
          let result;
          try { result = await owner.request("app/list", { limit: 100, ...(cursor ? { cursor } : {}), ...(p.reload === true && page === 0 ? { forceRefetch: true } : {}) }, MCP_LIST_TIMEOUT); }
          // A core without app/list (-32601: an older Codex) has no Apps: the section stays hidden, as for an empty list.
          catch (error) { if (page === 0 && Number(error?.code) === -32601) return { data: [], unsupported: true }; throw error; }
          data.push(...(Array.isArray(result?.data) ? result.data : []));
          cursor = typeof result?.nextCursor === "string" && result.nextCursor ? result.nextCursor : null;
          if (!cursor) break;
        }
        knownApps.clear();
        for (const app of data) if (typeof app?.id === "string" && app.id) knownApps.add(app.id);
        return { data };
      }
      case "app-enabled": {
        const owner = await client();
        if (descriptorOf(owner).kind !== "native" || owner.serverInfo?.capabilities?.mcpConfigWrite === false) throw refusal("Apps are not supported by {core}.", { core: coreLabel(owner) });
        if (typeof p.id !== "string" || !knownApps.has(p.id) || typeof p.enabled !== "boolean") throw new Error("Unknown app.");
        return owner.request("config/batchWrite", { edits: [{ keyPath: `apps.${keySegment(p.id)}.enabled`, value: p.enabled, mergeStrategy: "replace" }], reloadUserConfig: true }, MCP_WRITE_TIMEOUT);
      }
      // Customize › Skills folders (descriptor skillRoots, as the page lists them): open one in Finder, creating it when
      // missing, or start a new skill there (<root>/<name>/SKILL.md, then opened). Only a listed root, with ~ and the
      // Customize folder (<project>, <workspace>) filled in.
      case "skill-root": {
        const owner = await client();
        const roots = (descriptorOf(owner).skillRoots ?? []).map((root) => corePath(owner.serverInfo ?? null, root));
        if (typeof p.root !== "string" || !roots.includes(p.root)) throw new Error("Unknown skill folder.");
        let target = p.root;
        if (/^<(project|workspace)>(\/|$)/.test(target)) {
          const folder = typeof p.cwd === "string" && p.cwd ? knownCwd(p.cwd) : null;
          if (!folder) throw refusal("Open a project first to use its skill folder.");
          target = path.join(folder, target.replace(/^<(project|workspace)>\/?/, ""));
        } else if (target === "~" || target.startsWith("~/")) target = path.join(home(), target.slice(2));
        if (!path.isAbsolute(target)) throw new Error("Unknown skill folder.");
        if (p.action === "open") {
          await fs.promises.mkdir(target, { recursive: true });
          if (openPath) { const error = await openPath(target); if (error) throw new Error(error); }
          return { path: target };
        }
        if (p.action === "new-skill") {
          const name = typeof p.name === "string" ? p.name.trim() : "";
          if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw refusal("Use lowercase letters, digits and dashes for the skill name.");
          const dir = path.join(target, name), file = path.join(dir, "SKILL.md");
          await fs.promises.mkdir(dir, { recursive: true });
          try { await fs.promises.writeFile(file, `---\nname: ${name}\ndescription: What this skill does and when to use it.\n---\n\n# ${name}\n\nWrite the instructions here.\n`, { flag: "wx" }); }
          catch (error) { if (error?.code === "EEXIST") throw refusal("A skill named {name} already exists there.", { name }); throw error; }
          if (openPath) await openPath(file);
          return { path: file };
        }
        throw new Error("Unknown skill folder action.");
      }
      // The Hooks page's way in on a native core (Codex reads hooks.json beside config.toml and in a project's .codex
      // folder): open the user's or this project's hooks.json, created from a minimal template when missing.
      case "hooks-file": {
        const owner = await client();
        if (descriptorOf(owner).kind !== "native") throw refusal("Hook changes are not supported by {core}.", { core: coreLabel(owner) });
        if (p.action !== "open" || !["user", "project"].includes(p.scope)) throw new Error("Unknown hooks file.");
        let folder;
        if (p.scope === "user") {
          const reported = owner.serverInfo?.codexHome;
          folder = typeof reported === "string" && path.isAbsolute(reported) ? reported : path.join(home(), ".codex");
        } else {
          const cwd = typeof p.cwd === "string" && p.cwd ? knownCwd(p.cwd) : null;
          if (!cwd) throw refusal("Open a project first to use its hooks file.");
          folder = path.join(cwd, ".codex");
        }
        const file = path.join(folder, "hooks.json");
        await fs.promises.mkdir(folder, { recursive: true });
        try { await fs.promises.writeFile(file, "{\n  \"hooks\": {}\n}\n", { flag: "wx" }); }
        catch (error) { if (error?.code !== "EEXIST") throw error; }
        if (openPath) { const error = await openPath(file); if (error) throw new Error(error); }
        return { path: file };
      }
      // Codex's hook review (/hooks, startup_hooks_review.rs): trust a listed hook at its current hash, or switch one on or
      // off, in the user's config.toml (hooks.state.<key>: trusted_hash / enabled, hooks_rpc.rs). A native core only.
      case "hooks-state": {
        const owner = await client();
        // A bridge core that switches its own hooks (capabilities.hooksToggle: Gemini's hooksConfig.disabled): one listed
        // hook on or off, never a trust (its hooks have no review here).
        if (descriptorOf(owner).kind !== "native" && owner.serverInfo?.capabilities?.hooksToggle === true) {
          const known = typeof p.enabled?.key === "string" ? knownHooks.get(p.enabled.key) : null;
          if (!known || known.managed || typeof p.enabled.enabled !== "boolean" || (Array.isArray(p.trust) && p.trust.length)) throw new Error("Unknown hook.");
          const cwds = cwdsParam(p.cwd);
          return owner.request("codeDesktop/hooks/setEnabled", { key: p.enabled.key, enabled: p.enabled.enabled, ...(cwds ? { cwd: cwds[0] } : {}) }, MCP_WRITE_TIMEOUT);
        }
        if (descriptorOf(owner).kind !== "native" || owner.serverInfo?.capabilities?.mcpConfigWrite === false) throw refusal("Hook changes are not supported by {core}.", { core: coreLabel(owner) });
        const value = {};
        for (const key of Array.isArray(p.trust) ? p.trust : []) {
          const known = typeof key === "string" ? knownHooks.get(key) : null;
          if (!known || known.managed || typeof known.hash !== "string" || !/^[A-Za-z0-9:_-]{8,200}$/.test(known.hash)) throw new Error("Unknown hook.");
          value[key] = { trusted_hash: known.hash };
        }
        if (p.enabled !== undefined) {
          const known = typeof p.enabled?.key === "string" ? knownHooks.get(p.enabled.key) : null;
          if (!known || known.managed || typeof p.enabled.enabled !== "boolean") throw new Error("Unknown hook.");
          value[p.enabled.key] = { ...value[p.enabled.key], enabled: p.enabled.enabled };
        }
        if (!Object.keys(value).length || Object.keys(value).length > 200) throw new Error("Unknown hook.");
        return owner.request("config/batchWrite", { edits: [{ keyPath: "hooks.state", value, mergeStrategy: "upsert" }], reloadUserConfig: true }, MCP_WRITE_TIMEOUT);
      }
      default:
        throw new Error("Unknown customize operation.");
    }
  }
  return { run, knownSkillPaths, knownAgentPaths, knownServerNames, knownPluginIds, knownCatalog, knownMarketplaces, knownHooks };
}

// Validate the "Add custom connector" form into a mcp_servers.<name> table:
// stdio {command,args} or streamable HTTP {url}. Arguments must already be an
// array of non-empty strings.
// The Add connector form's advanced fields: a stdio server's env (NAME → value) and an HTTP server's http_headers
// (Name → value), as Codex config mcp_servers keeps them; anything else is refused rather than written.
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/, HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
function stringTable(value, names, label) {
  if (value === undefined || value === null) return null;
  const table = plainObject(value);
  if (!table) throw new Error(`Invalid ${label}.`);
  const entries = Object.entries(table);
  if (entries.length > 64 || entries.some(([key, item]) => !names.test(key) || typeof item !== "string" || item.length > 8192 || /[\0\r\n]/.test(item))) throw new Error(`Invalid ${label}.`);
  return entries.length ? Object.fromEntries(entries) : null;
}
function mcpServerValue({ command, args, url, env, http_headers: headers, oauth } = {}, { oauth: oauthAllowed = false } = {}) {
  const cmd = typeof command === "string" ? command.trim() : "";
  const link = typeof url === "string" ? url.trim() : "";
  if (cmd) {
    if (cmd.includes("\0")) throw new Error("Invalid command.");
    const list = Array.isArray(args) ? args : [];
    if (list.some((item) => typeof item !== "string" || !item || item.includes("\0"))) throw new Error("Invalid arguments.");
    const vars = stringTable(env, ENV_NAME, "environment variables");
    return { command: cmd, ...(list.length ? { args: list } : {}), ...(vars ? { env: vars } : {}) };
  }
  if (link) {
    let parsed;
    try { parsed = new URL(link); } catch { throw new Error(t("Enter a valid http(s) URL.")); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(t("Enter a valid http(s) URL."));
    const sent = stringTable(headers, HEADER_NAME, "headers");
    let client = null;
    if (oauth !== undefined && oauth !== null) {
      const table = plainObject(oauth);
      const clientId = typeof table?.client_id === "string" ? table.client_id.trim() : "";
      const secret = typeof table?.client_secret === "string" ? table.client_secret.trim() : "";
      const scope = typeof table?.scope === "string" ? table.scope.trim() : "";
      if (!oauthAllowed || !clientId || [clientId, secret, scope].some((item) => item.length > 2048 || /[\0\r\n]/.test(item))) throw new Error("Invalid OAuth client.");
      client = { client_id: clientId, ...(secret ? { client_secret: secret } : {}), ...(scope ? { scope } : {}) };
    }
    return { url: parsed.href, ...(sent ? { http_headers: sent } : {}), ...(client ? { oauth: client } : {}) };
  }
  throw new Error(t("Enter a command or a URL."));
}

module.exports = { createCustomizeOperations, mcpServerValue, SERVER_NAME, MCP_LIST_TIMEOUT, SKILL_FILE_MAX_BYTES };
