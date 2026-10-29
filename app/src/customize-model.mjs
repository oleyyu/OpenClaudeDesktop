// Customize (Skills / Connectors / Plugins) view model over the local Codex
// app-server catalog: skills/list, mcpServerStatus/list, plugin/installed and
// their notifications. Pure functions only; every row is derived from real
// protocol data (no cloud "last updated", author identity or marketplace).
//
// Official shapes traced in analysis/skills-mcp-20260920/source-contract.md:
// customize-skills-current.js:3005-3022 (columns), :3138-3170 (row), :3240-3255
// (author label); customize-plugins-current.js:1328-1350, :1479-1530;
// customize-connectors-current.js:1978-2007 (Connected/Connecting), :1683
// ("Server not responding"); customize-page-shell-current.js:628-655 (owner
// segments rendered only with >= 2 non-empty groups).

import { coreForEngine, corePath, coreSupports } from "../electron/core-registry.mjs";
import { getLocale, t, tn } from "../electron/i18n/index.mjs";
import { splitArgs } from "../electron/prefs/harness-profile.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";

export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

const text = (value) => (typeof value === "string" ? value : "");
const bySkillName = (a, b) => a.name.localeCompare(b.name);

export function skillDisplayName(skill) {
  return text(skill?.interface?.displayName).trim() || text(skill?.name);
}

// A core's built-in commands it translates on its own client (the bridge tags them with localizationKey): the app's
// translation of the core's English text, so zh-CN reads like the core's own UI (MiMo tui/i18n en.ts / zh.ts).
const KNOWN_SKILL_DESCRIPTIONS = {
  'mimo.slash.init':() => t('guided AGENTS.md setup'),
  'mimo.slash.review':() => t('review changes [commit|branch|pr], defaults to uncommitted'),
  'mimo.slash.dream':() => t('manually consolidate project memory from memory files and raw trajectory'),
  'mimo.slash.distill':() => t('find repeated workflows in recent work and package them into skills, subagents, or commands'),
  'mimo.slash.goal':() => t('set a stop-condition goal; runs until a judge says it’s met. /goal clear to abort'),
  'mimo.slash.deep-research':() => t('deep multi-source, fact-checked research report (runs the deep-research workflow)'),
};

export function skillDescription(skill) {
  const key = text(skill?.localizationKey);
  if (key && Object.hasOwn(KNOWN_SKILL_DESCRIPTIONS, key)) return KNOWN_SKILL_DESCRIPTIONS[key]();
  return text(skill?.interface?.shortDescription).trim() || text(skill?.shortDescription).trim() || text(skill?.description).trim();
}

// Owner group of a skill row (official personal/shared/org segments mapped to
// what Codex reports): plugin-owned first, then the SkillScope.
export function skillGroup(skill) {
  if (skill?.pluginId) return "plugins";
  switch (skill?.scope) {
    case "user": return "personal";
    case "repo": return "repository";
    default: return "managed";
  }
}

export const SKILL_GROUP_LABELS = Object.freeze({
  all: t("All"), personal: t("Personal"), repository: t("Repository"), plugins: t("Plugins"), managed: t("Managed"),
});

// Official Hi: Anthropic / owner / "Your organization" / "You". Locally the
// scope is the only real identity signal; plugin rows show the plugin name.
// System skills (and the slash commands a bridge lists as skills) ship with the
// running core, so they are credited to it (copy.name, the core descriptor's name).
export function skillAuthor(row, plugins = [], copy = customizeCore()) {
  // An MCP prompt a bridge lists as a command (OpenCode's `<server>:<prompt>`): credited to its connector.
  if (row.server) return row.server;
  if (row.pluginId) {
    const plugin = plugins.find((entry) => entry.id === row.pluginId);
    return plugin ? plugin.name : row.pluginId;
  }
  switch (row.scope) {
    case "user": return t("You");
    case "repo": return t("Repository");
    case "system": return copy.name;
    case "admin": return t("Managed");
    default: return "—";
  }
}

// Flatten SkillsListEntry[] (one per cwd) into unique rows keyed by path, plus
// error rows for SkillErrorInfo. `updatedAt` (seconds) is attached by the main
// process from the real SKILL.md mtime and stays null when unknown.
export function skillRows(response, updatedAt = {}) {
  const entries = Array.isArray(response?.data) ? response.data : [];
  const rows = new Map();
  const errors = new Map();
  for (const entry of entries) {
    for (const skill of entry?.skills || []) {
      if (!skill || typeof skill.path !== "string" || !skill.path) continue;
      if (rows.has(skill.path)) continue;
      rows.set(skill.path, {
        kind: "skill",
        id: skill.path,
        path: skill.path,
        skillName: text(skill.name),
        name: skillDisplayName(skill),
        description: skillDescription(skill),
        scope: text(skill.scope) || "user",
        ...(text(skill.codeDesktop?.server) ? { server: text(skill.codeDesktop.server) } : {}),
        enabled: skill.enabled !== false,
        // Whether skills/config/write may turn it on or off: a core reports toggleable false for an
        // entry it cannot switch, and a slash command a bridge lists among the skills (path
        // "command:<name>", no SKILL.md) only when the core says so (ZCode's custom command files).
        toggleable: skill.path.startsWith("command:") ? skill.toggleable === true : skill.toggleable !== false,
        // The DeepSeek bridge's invocation policy (harness catalog.js); both stay
        // undefined on a Codex core, whose `enabled` is the only gate.
        userInvocable: typeof skill.userInvocable === "boolean" ? skill.userInvocable : undefined,
        modelInvocable: typeof skill.modelInvocable === "boolean" ? skill.modelInvocable : undefined,
        // Why the agent's own settings hide it (Qwen: which settings file), shown on the skill's page.
        ...(text(skill.disabledReason).trim() ? { disabledReason: text(skill.disabledReason).trim() } : {}),
        version: text(skill.version).trim() || null,
        pluginId: typeof skill.pluginId === "string" && skill.pluginId ? skill.pluginId : null,
        cwd: text(entry.cwd),
        dependencies: Array.isArray(skill.dependencies?.tools) ? skill.dependencies.tools : [],
        defaultPrompt: text(skill.interface?.defaultPrompt),
        // A core command's argument hint (a bridge's skills/list row: OpenCode '$ARGUMENTS' → '[arguments]').
        argumentHint: text(skill.argumentHint).slice(0, 80),
        // A command that runs the core's own workflow tool (MiMo's /deep-research): offered only while that tool is.
        ...(skill.requiresWorkflowTool === true ? { requiresWorkflowTool: true } : {}),
        updatedAt: Number.isFinite(updatedAt?.[skill.path]) ? updatedAt[skill.path] : null,
        group: skillGroup(skill),
      });
    }
    for (const error of entry?.errors || []) {
      if (!error || typeof error.path !== "string") continue;
      if (errors.has(error.path)) continue;
      errors.set(error.path, { kind: "error", id: `error:${error.path}`, path: error.path, name: baseName(error.path), message: text(error.message), cwd: text(entry.cwd) });
    }
  }
  return { skills: [...rows.values()].sort(bySkillName), errors: [...errors.values()] };
}

export function baseName(path) {
  const parts = String(path || "").split(/[\\/]/).filter(Boolean);
  if (parts.length && parts[parts.length - 1] === "SKILL.md") parts.pop();
  return parts.pop() || String(path || "");
}

// Segmented owner filter: only groups with rows, and the control is shown
// only when at least two groups are non-empty (official De).
export function skillGroupOptions(skills) {
  const counts = {};
  for (const row of skills) counts[row.group] = (counts[row.group] || 0) + 1;
  const present = ["personal", "repository", "plugins", "managed"].filter((group) => counts[group] > 0);
  return { show: present.length >= 2, options: ["all", ...present].map((value) => ({ value, label: SKILL_GROUP_LABELS[value], count: value === "all" ? skills.length : counts[value] })) };
}

export function filterSkills(skills, { query = "", group = "all" } = {}) {
  const term = query.trim().toLowerCase();
  return skills.filter((row) => (group === "all" || row.group === group)
    && (!term || `${row.name} ${row.skillName} ${row.description}`.toLowerCase().includes(term)));
}

export function filterErrors(errors, { query = "" } = {}) {
  const term = query.trim().toLowerCase();
  return errors.filter((row) => !term || `${row.name} ${row.path} ${row.message}`.toLowerCase().includes(term));
}

// Apply a skills/config/write response to the rows (row badge follows
// effectiveEnabled, never the optimistic request).
export function applySkillEnabled(skills, path, effectiveEnabled) {
  return skills.map((row) => (row.path === path ? { ...row, enabled: effectiveEnabled !== false } : row));
}

// Whether '/' and Add › Skills offer a skill (official: the session's
// user-invocable skills, cc183b3ab :619-700). A Codex core reports only
// `enabled`; the DeepSeek bridge also reports the invocation policy, where a
// slash-only skill (disable-model-invocation) has enabled false but stays
// user-invocable and a `user-invocable: false` skill is model-only.
export function skillInvocable(row) {
  return row?.modelInvocable === undefined ? !!row?.enabled : row.userInvocable !== false;
}

// ccb4abbdf export r "Trigger" fact (shown when userInvocable is reported):
// "Auto" for a model-only skill, "Slash command + auto" otherwise; a
// model-hidden skill reads "Slash command" (customize-skill-detail :118).
export function skillTrigger(row, copy = customizeCore()) {
  if (row?.userInvocable === undefined) return null;
  if (row.userInvocable === false) return { label: t("Auto"), tooltip: copy.skillTriggerTooltips.auto };
  if (row.modelInvocable === false) return { label: t("Slash command"), tooltip: copy.skillTriggerTooltips.slash };
  return { label: t("Slash command + auto"), tooltip: copy.skillTriggerTooltips.both };
}

// Composer Add menu → Skills submenu items (official Ay/jy): user-invocable
// skills (skillInvocable), icon Scroll, sorted by label.
export function skillMenuItems(skills) {
  return skills.filter(skillInvocable).map((row) => ({
    type: "skill", icon: "Scroll", label: row.name, skillName: row.skillName, path: row.path, description: row.description, pluginId: row.pluginId,
  })).sort((a, b) => a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Core-aware copy and controls (boot.core: main.cjs coreInfo). A Codex
// app-server keeps skills and MCP servers in ~/.codex/config.toml, which
// skills/config/write and config/batchWrite edit. The DeepSeek core reads
// skills from Harness roots, has no per-skill switch (capabilities.skillToggle
// false) and loads MCP servers from its own profile patch, which it does not
// write (capabilities.mcpConfigWrite false). A bridge core writes the file it
// reports as configPath in initialize: the agent's own config (ZCode, the ACP
// agents) or OpenClaude Desktop's overlay next to it (OpenCode, MiMo), which leaves
// the user's own file untouched. Servers without these capabilities (Codex, UI
// fixtures) keep every control. Copy names the running core from its descriptor
// (name, vendor), never a fixed vendor.

export const CODEX_CONFIG_FILE = "~/.codex/config.toml";
export const MCP_CLIENT_PACKAGE = "@deepseek-ai/dsh-mcp-client";

// Whether an absolute path the core reported is the descriptor's "~/…" file.
const sameConfigFile = (reported, declared) => !!reported && !!declared && (reported === declared || reported.endsWith(declared.replace(/^~(?=\/)/, "")));

// The Add plugin form per plugin manager: the built-in core's dsh-plugin-manager takes npm, a folder, a git URL or
// a tarball and installs from a chosen npm registry; a bridge's plugin format comes from its descriptor
// (`plugins: {format, placeholder}`, both English and translated through t()), else generic copy.
function pluginFormCopy(descriptor, name) {
  if (descriptor.kind === "builtin") return {
    intro: t("Install a plugin into {core} from npm, a local folder (absolute path), a git URL or a tarball. Plugins run inside {core} with your user permissions; install only ones you trust.", { core: name }),
    placeholder: t("@scope/dsh-plugin or /path/to/plugin"),
    registries: true,
  };
  const format = typeof descriptor.plugins?.format === "string" && descriptor.plugins.format ? t(descriptor.plugins.format) : "";
  const placeholder = typeof descriptor.plugins?.placeholder === "string" && descriptor.plugins.placeholder ? t(descriptor.plugins.placeholder) : t("Plugin name or path");
  return {
    intro: [t("Install a plugin into {core}. Plugins run inside {core} with your user permissions; install only ones you trust.", { core: name }), format].filter(Boolean).join(" "),
    placeholder,
    registries: descriptor.plugins?.registries === true,
  };
}

export function customizeCore(core) {
  const descriptor = coreForEngine(core?.engine);
  const deepseek = descriptor.id === "deepseek";
  const name = descriptor.name || descriptor.id;
  const vendor = descriptor.vendor || name;
  // The assistant-as-actor in copy ported from Claude ("Add skills to extend Claude’s capabilities."): this core's
  // own assistant, never a hard-coded DeepSeek (a Codex core reads "Add skills to extend Codex’s capabilities.").
  const assistant = descriptor.assistant || name;
  const capabilities = core?.capabilities || {};
  // Connectors are saved where the core keeps its MCP servers: a separate file for some (Kimi's mcp.json, descriptor
  // mcpConfigFile / reported mcpConfigPath), else its main config.
  const configPath = typeof core?.mcpConfigPath === "string" && core.mcpConfigPath ? core.mcpConfigPath
    : typeof core?.configPath === "string" && core.configPath ? core.configPath : null;
  // Under the core's own home where it reports one (Codex with CODEX_HOME: core-registry corePath).
  const userConfigFile = corePath(core, descriptor.mcpConfigFile || descriptor.configFile || null);
  // OpenClaude Desktop's own overlay beside the agent's config: what the core reports writing is not the user's file.
  const configOverlay = !!configPath && !!userConfigFile && !sameConfigFile(configPath, userConfigFile);
  const configFile = configOverlay ? configPath
    : userConfigFile || configPath || (deepseek ? t("the DeepSeek core profile") : t("the {core} configuration", { core: name }));
  // A native core is the agent's own CLI app-server, so its config is the CLI's too.
  const native = descriptor.kind === "native";
  return {
    deepseek,
    // The running core (descriptor): its id, display name and vendor for copy.
    id: descriptor.id,
    name,
    vendor,
    skillToggle: capabilities.skillToggle !== false,
    mcpConfigWrite: capabilities.mcpConfigWrite !== false,
    // A codeDesktop/plugin/* manager (the DeepSeek core's dsh-plugin-manager, a bridge's own): install, remove, on/off.
    pluginManage: capabilities.pluginManage === true,
    // A native core serves the protocol's own plugin management (marketplace/add, plugin/list|install|uninstall,
    // config/value/write plugins.<id>); the page uses it when the core has no codeDesktop/plugin/* manager.
    nativePlugins: native && capabilities.pluginManage !== true,
    // A plugin's MCP servers switched one by one in its detail (capabilities.pluginServerToggle: Kimi's plugin servers).
    pluginServerToggle: capabilities.pluginServerToggle === true,
    // MiMo's per-connector model requests (capabilities.mcpSampling): Ask / Allow / Deny on the connector page.
    mcpSampling: capabilities.mcpSampling === true,
    // ChatGPT Apps (Codex /apps): app/list in Customize › Connectors, each opened in the browser and switched in config.
    apps: native && coreSupports(core, "appsDirectory"),
    // A native core keeps per-connector settings in its own config (Codex mcp_servers.<name>: on/off, per-tool on/off
    // and approval): customize mcp-config / mcp-enable / mcp-tool.
    connectorSettings: native && capabilities.mcpConfigWrite !== false,
    // A bridge that turns its agent's connectors on and off (capabilities.mcpEnable: OpenCode, MiMo): the switch only.
    connectorToggle: !native && capabilities.mcpEnable === true,
    // A connector the core signed in to can be signed out of here (capabilities.mcpLogout: Qwen's clear-auth).
    mcpLogout: capabilities.mcpLogout === true,
    // The Add connector form asks for a pre-registered OAuth client (capabilities.mcpOAuthClient: OpenCode, MiMo).
    mcpOAuthClient: capabilities.mcpOAuthClient === true,
    // A bridge that serves its agent's own plugin catalog (plugin/list: MiniMax's official plugins), installed by name.
    pluginCatalog: !native && capabilities.pluginCatalog === true,
    // Customize › Skills › Add from URL and Delete (codeDesktop/skills/install|delete: Qwen's managed skills).
    skillInstall: capabilities.skillInstall === true,
    // Plugin detail's Update (codeDesktop/plugin/update: Qwen's `extensions update`).
    pluginUpdate: capabilities.pluginUpdate === true,
    // The core's own sub-agents (codeDesktop/agents/list: Qwen, ZCode…; Codex's roles from its config), listed under Skills.
    agentsList: coreSupports(core, "agentsList"),
    // Customize › Agents' Create agent and Delete (codeDesktop/agents/write|remove: OpenCode's and MiMo's agent files).
    agentsWrite: !native && capabilities.agentsWrite === true,
    pluginForm: pluginFormCopy(descriptor, name),
    configPath,
    configFile,
    userConfigFile,
    configOverlay,
    // The core's skill roots, in precedence order (core-registry.mjs).
    skillRoots: (descriptor.skillRoots ?? []).map((root) => corePath(core, root)),
    addConnectorNote: native ? t("Saved to {file}, shared with the {core} CLI.", { file: configFile, core: name })
      : configOverlay ? t("Saved to {file}. Your own {userFile} isn’t changed.", { file: configFile, userFile: userConfigFile })
      : t("Saved to {file}.", { file: configFile }),
    // The Add connector refusal for a name the last listing already has (it may come from the user's own file).
    duplicateConnector: (server) => configOverlay
      ? t("A connector named {name} already exists in {core}. Remove it first or choose another name.", { name: server, core: name })
      : t("A connector named {name} is already in {file}. Remove it first or choose another name.", { name: server, file: configFile }),
    // The Remove toast: an overlay core drops the server from its overlay (or turns off one from the user's file there).
    connectorRemoved: (server) => configOverlay
      ? t("Removed {name} from OpenClaude Desktop’s {core} config. Your own {userFile} isn’t changed.", { name: server, core: name, userFile: userConfigFile })
      : t("Removed {name} from {file}.", { name: server, file: configFile }),
    // A core that does not write MCP config: the DeepSeek core loads @deepseek-ai/dsh-mcp-client entries from its
    // profile; any other core reads servers from its own config file.
    connectorConfigHint: deepseek ? { text: t("Add a {package} entry to {file}, then Reconnect."), package: MCP_CLIENT_PACKAGE }
      : { text: t("Add the server to {file}, then Reconnect.") },
    // Customize › Plugins copy naming the running core.
    // The Official group's subtitle follows its rows (officialSubtitleFor): the DeepSeek core offers its optional
    // bundles switched off, ZCode turns its built-in plugins on by default (installPolicy INSTALLED_BY_DEFAULT).
    officialSubtitle: t("Ships with {core}, off until you turn it on.", { core: name }),
    officialSubtitleOn: t("Ships with {core}, on until you turn it off.", { core: name }),
    officialSubtitleMixed: t("Ships with {core}.", { core: name }),
    officialBy: t("by {vendor}", { vendor }),
    pluginRemoveBody: t("The plugin is uninstalled from {core}. You can install it again later.", { core: name }),
    notPluginMessage: t("This package is not a plugin {core} can load.", { core: name }),
    // Source copy that names the assistant, with Claude → the running core's assistant (descriptor `assistant`:
    // "DeepSeek", "Codex", …): c6f9b6c10 s("skills"), customize-skills :3104-3108, customize-connectors
    // :3693-3697 (its claude.ai "Learn more" link is not drawn) and customize-plugins :1418-1421.
    skillDescriptionTooltip: t("{assistant} uses these descriptions when deciding which skills to use in chat.", { assistant }),
    skillsEmpty: t("Add skills to extend {assistant}’s capabilities.", { assistant }),
    connectorsEmpty: t("Unlock more with {assistant} when you connect your team’s tools.", { assistant }),
    pluginsEmpty: t("Give {assistant} role-level expertise with plugins", { assistant }),
    // ccb4abbdf r Trigger tooltips (hjJUiuUPEX / eFWPHBACre); a slash-only
    // skill keeps the first sentence only, since it never runs automatically.
    skillTriggerTooltips: {
      auto: t("{assistant} runs this skill automatically when it’s relevant to your request.", { assistant }),
      both: t("Appears in the / menu. {assistant} can also run it automatically when relevant.", { assistant }),
      slash: t("Appears in the / menu."),
    },
    // c36b3644c _e tab descriptions (knl1HOkRzw / 7E0XKPYZcj / jBsLHc22T9).
    pluginTabDescriptions: {
      skills: t("Invoke by typing / in chat, or let {assistant} use them automatically for relevant tasks.", { assistant }),
      connectors: t("Tools and data sources this plugin connects to. Connect each one so {assistant} can use it.", { assistant }),
      hooks: t("Commands this plugin runs automatically — on session events, or when its skills are used."),
      // A plugin's own tools (OpenCode plugin/read detail.tools).
      tools: t("Tools this plugin adds. {assistant} can call them while it works.", { assistant }),
      // c24c8737b Dc agents / Ns monitors helper lines; the Commands line is a server-provided message there (none locally).
      agents: t("Specialized AI assistants that can be invoked to handle specific types of tasks."),
      commands: "",
      monitors: t("Background commands that run automatically during your session."),
    },
    // c5fb58ef0 personal removal dialog body (xonrKBdErN + GXIZPZXIvC); its
    // claude.ai "project files synced" sentence has no local counterpart.
    connectorRemoveNote: t("However, {assistant} won’t be able to access new content or perform new tasks.", { assistant }),
  };
}

// Connector action toasts (N() addError / addSuccess): c08e79e85 Sn
// (KODL04UyPx, MMd95RjV2L), customize-connectors :2565-2590 (tDkUqq5UZf) and
// c5fb58ef0 (6ZBacUc8Qf).
export const CONNECTOR_TOASTS = Object.freeze({
  connectFailed: t("Connection to server failed. You can try again."),
  refreshFailed: t("Couldn’t refresh tools list. You can try again."),
  refreshed: t("Tools list refreshed"),
  removeFailed: t("Failed to remove server"),
});

// ---------------------------------------------------------------------------
// MCP servers ("Connectors")

export const MCP_STATUS_LABELS = Object.freeze({
  connected: t("Connected"),
  connecting: t("Connecting"),
  unreachable: t("Server not responding"),
  signIn: t("Sign-in required"),
  disabled: t("Disabled"),
  notStarted: t("Not started"),
  // A project connector the agent loads only in a trusted folder (Kimi: codeDesktop.trustRequired).
  trust: t("Needs folder trust"),
});

// runtimeStatus is null whenever no thread runtime backs the listing; that is
// "Not started", never "Connected" (official rows only show Check for a live
// connection).
export function mcpStatusKind(server) {
  if (server?.codeDesktop?.trustRequired === true || server?.trust) return "trust";
  const runtime = server?.runtimeStatus ?? null;
  if (runtime === "connected") return "connected";
  if (runtime === "starting") return "connecting";
  if (runtime === "failed" || runtime === "cancelled") return "unreachable";
  if (runtime === "authenticationRequired" || server?.authStatus === "notLoggedIn") return "signIn";
  if (runtime === "disabled") return "disabled";
  return "notStarted";
}

export function mcpRows(response) {
  const data = Array.isArray(response?.data) ? response.data : [];
  return data.filter((server) => server && typeof server.name === "string" && server.name).map((server) => ({
    id: server.name,
    name: server.name,
    title: text(server.serverInfo?.title).trim() || server.name,
    version: text(server.serverInfo?.version),
    description: text(server.serverInfo?.description),
    websiteUrl: text(server.serverInfo?.websiteUrl),
    runtimeStatus: server.runtimeStatus ?? null,
    authStatus: text(server.authStatus) || "unknown",
    pluginId: typeof server.pluginId === "string" && server.pluginId ? server.pluginId : null,
    // The CLI scope customize-operations' mcp list put on the server (mcpScope: the core's own, else the config layer
    // user / project, else plugin / project / user), for the Session rail's Connectors grouping (c9081d688 v / O;
    // session-rail-connectors-model hostMcpScope). w11-sweep-ccres (w10-ccres-rail-connectors' missing hand-off).
    ...(typeof server.scope === "string" && server.scope ? { scope: server.scope } : {}),
    tools: server.tools && typeof server.tools === "object" ? Object.keys(server.tools) : [],
    resourceCount: Array.isArray(server.resources) ? server.resources.length : 0,
    // The startup error a core lists with the server (toolsError), else the one a startupStatus notification brings.
    error: text(server.toolsError) || null,
    // An untrusted folder's project connector (Kimi): what it would launch, and the folder to trust.
    ...(server.codeDesktop?.trustRequired === true ? { trust: { launch: text(server.codeDesktop.launch), cwd: text(server.codeDesktop.cwd) } } : {}),
    // The server refuses dynamic client registration (OpenCode needs_client_registration): Sign in can't work until the
    // connector names a pre-registered OAuth client.
    ...(server.codeDesktop?.oauthClientRequired === true ? { oauthClient: true } : {}),
    // A connector the core won't load (Gemini: blocked by the organization, by mcp.allowed / mcp.excluded, or an
    // untrusted folder's settings): why, and no on/off switch.
    ...(typeof server.codeDesktop?.blocked === "string" ? { blocked: { kind: server.codeDesktop.blocked, reason: text(server.error) } } : {}),
    // MiMo: whether the connector may ask for model calls on the user's account (mcp.<name>.sampling).
    ...(["ask", "allow", "deny"].includes(server.codeDesktop?.sampling) ? { sampling: server.codeDesktop.sampling } : {}),
    kind: mcpStatusKind(server),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// mcpServer/startupStatus/updated {threadId,name,status,error,failureReason}
// patches a row in place. Returns {rows, relist}: ready/failed are settled
// states worth a fresh mcpServerStatus/list; starting only marks the row.
export function patchMcpRow(rows, notification, { threadId = null } = {}) {
  const params = notification?.params ?? notification ?? {};
  if (typeof params.name !== "string") return { rows, relist: false };
  if (params.threadId && threadId && params.threadId !== threadId) return { rows, relist: false };
  const index = rows.findIndex((row) => row.name === params.name);
  if (index < 0) return { rows, relist: params.status === "ready" || params.status === "failed" };
  const runtimeStatus = params.status === "starting" ? "starting"
    : params.status === "ready" ? "connected"
    : params.status === "failed" ? (params.failureReason === "reauthenticationRequired" ? "authenticationRequired" : "failed")
    : params.status === "cancelled" ? "cancelled" : rows[index].runtimeStatus;
  const next = rows.slice();
  const patched = { ...rows[index], runtimeStatus, error: text(params.error) || null };
  patched.kind = mcpStatusKind(patched);
  next[index] = patched;
  return { rows: next, relist: params.status === "ready" || params.status === "failed" };
}

export function filterMcp(rows, { query = "" } = {}) {
  const term = query.trim().toLowerCase();
  return rows.filter((row) => !term || `${row.name} ${row.title} ${row.description}`.toLowerCase().includes(term));
}

// customize-connectors Ja (:3013-3023): the uncontained "Filter by status"
// segments, shown above the table whenever at least one connector exists.
export const MCP_STATUS_FILTERS = Object.freeze([
  Object.freeze({ value: "all", label: t("All") }),
  Object.freeze({ value: "connected", label: t("Connected") }),
  Object.freeze({ value: "notConnected", label: t("Not connected") }),
]);

// :3361-3420 Ge: "connected" keeps the connected rows (M), "notConnected" the
// needs-attention and other rows (P). Locally a row is connected only when its
// runtime reports it (kind "connected"); connecting, broken, sign-in, disabled
// and never-started rows all count as not connected.
export function filterMcpByStatus(rows, status = "all") {
  if (status === "connected") return rows.filter((row) => row.kind === "connected");
  if (status === "notConnected") return rows.filter((row) => row.kind !== "connected");
  return rows;
}

// What the connectors list body shows (customize-connectors :3556-3735):
// the status filter whenever any connector exists; the table when the search
// and filter leave rows (Ve); "Nothing connected." / "Nothing to connect."
// for an empty filter without a search; otherwise Ee — the search no-match
// line, or the empty state when there is nothing at all.
export function connectorsListView({ total = 0, visible = 0, status = "all", query = "" } = {}) {
  const searching = query.trim() !== "";
  const table = visible > 0;
  return {
    filter: total > 0,
    table,
    filterEmpty: !table && status !== "all" && !searching ? (status === "connected" ? t("Nothing connected.") : t("Nothing to connect.")) : null,
    empty: !table && (searching || status === "all") ? (searching ? "search" : "empty") : null,
  };
}

// Connector drill-in body (c08e79e85 En) by row state:
// - connected → the px-6 pb-6 page (header row, description, tools);
// - connecting → the centred spinner with "Checking connection…" (n && !isConnected);
// - everything else → the centred not-connected column. `issue` (En I, a
//   failure) draws the "Connection issue" title and the "stopped working"
//   message, and vn's label becomes "Reconnect": a failed/cancelled server,
//   or a runtime that asked to authenticate again (failureReason
//   reauthenticationRequired). A plain Codex notLoggedIn never says a previous
//   sign-in expired, so it reads "not connected yet" with Sign in;
//   never-started rows get Connect (the reload). A disabled server cannot be
//   started from here, so its Connect is disabled (the source's unavailable
//   connector also shows a disabled Connect).
export const CONNECTOR_ACTION_LABELS = Object.freeze({ reconnect: t("Reconnect"), signIn: t("Sign in"), connect: t("Connect") });

export function connectorDetailState(row) {
  const state = (view, issue, action, disabled = false) => ({ view, issue, action, label: action ? (issue ? CONNECTOR_ACTION_LABELS.reconnect : CONNECTOR_ACTION_LABELS[action]) : null, disabled });
  switch (row?.kind) {
    case "connected": return state("connected", false, null);
    case "connecting": return state("checking", false, null);
    case "unreachable": return state("disconnected", true, "reconnect");
    case "signIn": return state("disconnected", row.runtimeStatus === "authenticationRequired", "signIn");
    case "disabled": return state("disconnected", false, "connect", true);
    case "trust": return { view: "trust", issue: false, action: "trust", label: t("Trust this folder"), disabled: !row.trust?.cwd };
    default: return state("disconnected", false, "connect");
  }
}

// A native core's per-tool approval (Codex AppToolApproval): auto asks when a tool may change things (Codex's
// default), prompt always asks, writes asks unless the tool says it is read-only, approve never asks ('Always allow',
// what the approval card's Always allow saves).
export const CONNECTOR_APPROVAL_MODES = Object.freeze(["auto", "prompt", "writes", "approve"]);
export function connectorApprovalLabel(mode) {
  return mode === "prompt" ? t("Always ask") : mode === "writes" ? t("Ask unless read-only") : mode === "approve" ? t("Always allow") : t("Ask when it may change things");
}
/** The approval choices: for one tool, '' follows the connector's own setting; for the connector, '' is Codex's default. */
export function connectorApprovalItems({ tool = false, inherited = null } = {}) {
  const first = tool ? { value: "", label: t("Default ({mode})", { mode: connectorApprovalLabel(inherited) }) } : null;
  return [...(first ? [first] : []), ...CONNECTOR_APPROVAL_MODES.map((mode) => ({ value: tool || mode !== "auto" ? mode : "", label: connectorApprovalLabel(mode) }))];
}
/**
 * A connector's tools with their settings ({name, enabled, mode}): the tools it lists, plus those turned off (a server
 * leaves them out of its list) or given an approval in the config. Without settings every listed tool is on.
 */
export function connectorToolRows(row, settings) {
  const names = new Set([...(row?.tools ?? []), ...(settings?.disabledTools ?? []), ...Object.keys(settings?.tools ?? {})]);
  return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({
    name,
    enabled: !(settings?.disabledTools ?? []).includes(name) && (!Array.isArray(settings?.enabledTools) || settings.enabledTools.includes(name)),
    mode: settings?.tools?.[name] ?? "",
  }));
}

// En message copy (:5QF1f3BckZ / :3lTGLnIzRn), {name} = the connector's display name.
export function connectorDetailMessage(state, name) {
  return state.issue ? t("Your connection to {name} stopped working. Reconnect to continue.", { name }) : t("You’re not connected to {name} yet.", { name });
}

export function validateServerName(name) {
  if (typeof name !== "string" || !name.trim()) return t("Enter a connector name.");
  if (!SERVER_NAME_PATTERN.test(name)) return t("Use 1–64 letters, digits, dots, dashes or underscores for the name.");
  return "";
}

// Split an arguments string like a shell does for simple quoting (Settings › Harness's splitArgs): whitespace
// separates arguments, "…" or '…' keeps spaces inside one (-e "process.stdin.resume()" → ["-e", "process.stdin.resume()"]).
// An unclosed quote throws, with the message the form shows.
export function splitArguments(value) {
  return splitArgs(String(value || "").trim());
}
// The arguments as one line the user can read back (and type again): an argument with whitespace or a quote is quoted.
export function joinArguments(args) {
  return (Array.isArray(args) ? args : []).map((arg) => {
    const text = String(arg);
    if (text && !/[\s"']/.test(text)) return text;
    return text.includes('"') && !text.includes("'") ? `'${text}'` : `"${text.replaceAll('"', "'")}"`;
  }).join(" ");
}

// mcp_servers.<name> table value written to ~/.codex/config.toml: either a
// stdio server {command,args} or a streamable-HTTP server {url}.
// env (a stdio server's variables, e.g. GITHUB_PERSONAL_ACCESS_TOKEN) and headers (an HTTP server's, e.g.
// Authorization): Codex mcp_servers env / http_headers, which every bridge's writer maps to its agent's own keys.
// oauth {clientId, clientSecret?, scope?}: a pre-registered OAuth client for an HTTP server (a core with
// capabilities.mcpOAuthClient), written as mcp_servers.<name>.oauth {client_id, client_secret?, scope?}.
export function mcpServerConfigValue({ command, args = [], url, env = {}, headers = {}, oauth = null } = {}) {
  const cmd = text(command).trim();
  const link = text(url).trim();
  const filled = (value) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length ? value : null;
  if (cmd) {
    const list = Array.isArray(args) ? args.filter((item) => typeof item === "string" && item) : splitArguments(args);
    const vars = filled(env);
    return { command: cmd, ...(list.length ? { args: list } : {}), ...(vars ? { env: { ...vars } } : {}) };
  }
  if (link) {
    let parsed;
    try { parsed = new URL(link); } catch { throw new Error(t("Enter a valid http(s) URL.")); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(t("Enter a valid http(s) URL."));
    const sent = filled(headers);
    const clientId = text(oauth?.clientId).trim(), secret = text(oauth?.clientSecret).trim(), scope = text(oauth?.scope).trim();
    if (!clientId && (secret || scope)) throw new Error(t("Enter the OAuth client ID, or leave the OAuth fields empty."));
    return { url: parsed.href, ...(sent ? { http_headers: { ...sent } } : {}),
      ...(clientId ? { oauth: { client_id: clientId, ...(secret ? { client_secret: secret } : {}), ...(scope ? { scope } : {}) } } : {}) };
  }
  throw new Error(t("Enter a command or a URL."));
}
/** 'NAME=value' lines (env) or 'Name: value' lines (headers) from the add form; blank lines skipped. */
export function connectorPairs(textValue, kind = "env") {
  const out = {};
  for (const raw of String(textValue ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const at = line.indexOf(kind === "env" ? "=" : ":");
    const key = at > 0 ? line.slice(0, at).trim() : "";
    if (kind === "env" ? !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) : !/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(key))
      throw new Error(kind === "env" ? t("Environment variables need NAME=value lines.") : t("Headers need Name: value lines."));
    out[key] = line.slice(at + 1).trim();
  }
  return out;
}

export function mcpBatchWriteParams(name, value) {
  const problem = validateServerName(name);
  if (problem) throw new Error(problem);
  return { edits: [{ keyPath: `mcp_servers.${name}`, value, mergeStrategy: value === null ? "replace" : "upsert" }], reloadUserConfig: true };
}

// ---------------------------------------------------------------------------
// Plugins (installed marketplaces only)

// PluginLocalizedMeta text from the DeepSeek bridge ({en, zh, …} or a literal): the UI language's
// entry, then its base language, then English.
export function localizedMetaText(value, locale = getLocale()) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const base = String(locale).split("-")[0];
  return text(value[locale] ?? value[base] ?? value.en ?? Object.values(value)[0]).trim();
}

// dsh-client-ui-plugin-manager BUILTIN_PROFILE_BUNDLES (+ this app's own core bundle): the profile's
// fixed layers, which its Plugins page hides. Listed last here, never in the Official group.
export const CORE_PLUGIN_IDS = Object.freeze(["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@deepseek-ai/dsh-headless", "@deepseek-ai/dsh-sdk-app", "@deepseek-ai/dsh-acp-app", "@deepseek-ai/dsh-sdk-minimal", "@code-desktop/dsh-code-desktop-app"]);

export function pluginRows(response, skills = []) {
  const marketplaces = Array.isArray(response?.marketplaces) ? response.marketplaces : [];
  const rows = [];
  const seen = new Set();
  for (const marketplace of marketplaces) {
    const marketplaceName = text(marketplace?.interface?.displayName).trim() || text(marketplace?.name);
    for (const plugin of marketplace?.plugins || []) {
      if (!plugin || plugin.installed !== true || typeof plugin.id !== "string" || seen.has(plugin.id)) continue;
      seen.add(plugin.id);
      rows.push({
        id: plugin.id,
        pluginName: text(plugin.name),
        name: localizedMetaText(plugin.codeDesktop?.title) || text(plugin.interface?.displayName).trim() || text(plugin.name),
        description: localizedMetaText(plugin.codeDesktop?.description) || text(plugin.interface?.shortDescription).trim(),
        author: text(plugin.interface?.developerName).trim(),
        enabled: plugin.enabled !== false,
        source: text(plugin.source?.type) || "local",
        marketplaceName,
        // The marketplace's config name (marketplace/remove takes it; Manage marketplaces lists what removing it uninstalls).
        marketplaceId: text(marketplace?.name),
        marketplacePath: typeof marketplace?.path === "string" ? marketplace.path : null,
        skillCount: skills.filter((skill) => skill.pluginId === plugin.id).length,
        updatedAt: null,
        // Workspace sharing (Codex plugin/share/*): the local folder share/save takes, and what is shared now.
        sourcePath: plugin.source?.type === "local" && typeof plugin.source.path === "string" && plugin.source.path ? plugin.source.path : null,
        share: plugin.shareContext && typeof plugin.shareContext.remotePluginId === "string" ? { remotePluginId: plugin.shareContext.remotePluginId, url: text(plugin.shareContext.shareUrl) || null,
          discoverability: plugin.shareContext.discoverability ?? null, creator: text(plugin.shareContext.creatorName) || null } : null,
        // Codex reports a local marketplace plugin's manifest version as localVersion (version is the remote one).
        version: typeof plugin.version === "string" ? plugin.version : typeof plugin.localVersion === "string" ? plugin.localVersion : null,
        // Bridge field (codex-app-server / zcode-bridge catalog.js pluginSummary): what management may do with this
        // bundle. readOnlyReason says why it can't be managed, except on an optional bundle (one the core lets you turn
        // on and off): there it only explains why Remove isn't offered (ZCode: "Built into ZCode: turn it off instead.").
        removable: plugin.codeDesktop?.removable === true,
        manageable: !!plugin.codeDesktop && (!plugin.codeDesktop.readOnlyReason || plugin.codeDesktop.optional === true),
        // NOT_AVAILABLE | AVAILABLE | INSTALLED_BY_DEFAULT (0.155.1 PluginInstallPolicy): a default-installed plugin is
        // on until turned off, and a native core reinstalls it, so it is never offered for removal there.
        installPolicy: typeof plugin.installPolicy === "string" ? plugin.installPolicy : null,
        loadError: text(plugin.codeDesktop?.loadError).trim(),
        // A bridge's 'this can't work here' code (zcode-bridge catalog.js: Browser Use needs a browser the host provides).
        unavailable: pluginUnavailableReason(plugin.codeDesktop?.unavailable),
        // "Official": shipped with the core's installation, offered switched off, not removable (a removable
        // bundle is one the person installed, whatever else the core reports about it).
        official: plugin.codeDesktop?.optional === true && plugin.codeDesktop?.held !== true && plugin.codeDesktop?.removable !== true,
        experimental: plugin.codeDesktop?.experimental === true,
        core: CORE_PLUGIN_IDS.includes(plugin.id),
        icon: typeof plugin.codeDesktop?.icon === "string" && plugin.codeDesktop.icon.startsWith("data:image/") ? plugin.codeDesktop.icon : null,
        // A count (the DeepSeek bridge) or the list of component kinds (ZCode).
        components: Number.isInteger(plugin.codeDesktop?.components) ? plugin.codeDesktop.components : Array.isArray(plugin.codeDesktop?.components) ? plugin.codeDesktop.components.length : 0,
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// A bridge's 'this can't work here' code as the reason shown on the plugin: zcode-bridge catalog.js noBrowser (Browser
// Use needs a browser the host provides); codex-app-server catalog.js needsHost (a service only the DeepSeek app's own
// window provides, e.g. Schedule) and notSupported (Agent Team, Auto review).
export function pluginUnavailableReason(code) {
  if (code === "noBrowser") return t("Browser control isn’t available in OpenClaude Desktop yet, so this plugin can’t open or drive pages here.");
  if (code === "needsHost") return t("This plugin needs the DeepSeek app’s own window and can’t run in OpenClaude Desktop.");
  if (code === "notSupported") return t("OpenClaude Desktop can’t show or run what this plugin adds yet, so it stays off here.");
  return null;
}

// The Official group's subtitle for its rows: off until turned on, on until turned off, or neither when they differ.
export function officialSubtitleFor(rows, copy) {
  const on = rows.filter((row) => row.installPolicy === "INSTALLED_BY_DEFAULT").length;
  if (!on) return copy.officialSubtitle;
  return on === rows.length ? copy.officialSubtitleOn ?? copy.officialSubtitle : copy.officialSubtitleMixed ?? copy.officialSubtitle;
}

// A native core's own plugin actions (Codex: plugin/uninstall, config/value/write plugins.<id>). A default-installed
// plugin is turned off, not removed: Codex installs it again.
export function nativePluginActions(row) {
  return { canToggle: true, canRemove: row?.installPolicy !== "INSTALLED_BY_DEFAULT" };
}

// A native core's plugin/list (Codex): the plugins its local marketplaces offer that are not installed yet,
// each with the marketplace file plugin/install needs. Remote-only catalog entries (no local path) are left out.
export function availablePluginRows(response) {
  const marketplaces = Array.isArray(response?.marketplaces) ? response.marketplaces : [];
  const rows = [];
  const seen = new Set();
  // A ChatGPT workspace's remote marketplaces (customize-operations plugin-catalog codeDesktop.shareKind).
  const SHARE_LABELS = { "shared-with-me": () => t("Shared with you"), "workspace-directory": () => t("Your workspace"), "created-by-me-remote": () => t("Shared by you") };
  for (const marketplace of marketplaces) {
    const shareKind = Object.hasOwn(SHARE_LABELS, marketplace?.codeDesktop?.shareKind ?? "") ? marketplace.codeDesktop.shareKind : null;
    if ((typeof marketplace?.path !== "string" || !marketplace.path) && !shareKind) continue;
    const marketplaceName = shareKind ? SHARE_LABELS[shareKind]() : text(marketplace.interface?.displayName).trim() || text(marketplace.name);
    for (const plugin of marketplace.plugins || []) {
      if (!plugin || plugin.installed === true || typeof plugin.id !== "string" || typeof plugin.name !== "string" || !plugin.name || seen.has(plugin.id)) continue;
      if (plugin.availability && plugin.availability !== "AVAILABLE") continue;
      // A policy that forbids installing it: plugin/install would only fail.
      if (plugin.installPolicy === "NOT_AVAILABLE") continue;
      seen.add(plugin.id);
      rows.push({
        id: plugin.id,
        pluginName: plugin.name,
        name: text(plugin.interface?.displayName).trim() || plugin.name,
        description: text(plugin.interface?.shortDescription).trim(),
        author: text(plugin.interface?.developerName).trim(),
        version: typeof plugin.version === "string" ? plugin.version : typeof plugin.localVersion === "string" ? plugin.localVersion : null,
        marketplaceName,
        marketplacePath: shareKind ? null : marketplace.path,
        ...(shareKind ? { remoteMarketplaceName: text(marketplace.name), shareKind,
          sharedBy: text(plugin.shareContext?.creatorName) || null } : {}),
        // A bridge's own catalog (MiniMax: codeDesktop.installName 'name@official'): installed by name through
        // codeDesktop/plugin/install instead of plugin/install.
        ...(typeof plugin.codeDesktop?.installName === "string" && plugin.codeDesktop.installName ? { installName: plugin.codeDesktop.installName } : {}),
        // The bridge says installing needs the agent's own account sign-in (MiniMax's official plugins while signed out).
        ...(plugin.codeDesktop?.signInRequired === true ? { signInRequired: true } : {}),
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// The outcome of a native plugin change (a plain protocol response, or the error it threw) for the page.
/** A plugin/list or plugin/installed answer's marketplaceLoadErrors: [{key, path, message}] (a marketplace that failed). */
export function marketplaceLoadErrors(response) {
  return (Array.isArray(response?.marketplaceLoadErrors) ? response.marketplaceLoadErrors : [])
    .filter((entry) => entry && typeof entry.message === "string" && entry.message.trim())
    .map((entry, index) => ({ key: `${entry.marketplacePath ?? ""}:${index}`, path: typeof entry.marketplacePath === "string" ? entry.marketplacePath : "", message: entry.message.trim() }));
}
/**
 * After a Codex plugin install (PluginInstallResponse {authPolicy, appsNeedingAuth}): the apps the plugin still needs
 * to be connected to, [{id, name, installUrl}], and whether Codex asks only when one is first used (ON_USE).
 */
export function pluginAppsNeedingAuth(result) {
  const apps = (Array.isArray(result?.appsNeedingAuth) ? result.appsNeedingAuth : [])
    .filter((app) => app && typeof app.id === "string" && app.id)
    .map((app) => ({ id: app.id, name: text(app.name).trim() || app.id, installUrl: typeof app.installUrl === "string" && /^https?:\/\//.test(app.installUrl) ? app.installUrl : null }));
  return { apps, onUse: result?.authPolicy === "ON_USE" };
}

export function nativePluginOutcome(result, error) {
  if (error) return { ok: false, message: text(error?.message).trim() || t("The plugin change failed.") };
  return { ok: true, restartRequired: false, ...(result && typeof result === "object" ? { result } : {}) };
}

// shared-4 _L (customize-plugins :1307 h = ge(e)): group the rows by display
// name; a unique name is {name}, and every row of a colliding name also gets
// the muted suffix "({marketplace display name})" (none without a marketplace).
export function pluginDisplayNames(rows) {
  const groups = new Map();
  for (const row of rows) {
    const list = groups.get(row.name);
    if (list) list.push(row); else groups.set(row.name, [row]);
  }
  const names = new Map();
  for (const [name, list] of groups) {
    if (list.length === 1) { names.set(list[0].id, { name }); continue; }
    for (const row of list) names.set(row.id, row.marketplaceName ? { name, suffix: `(${row.marketplaceName})` } : { name });
  }
  return names;
}

// :1308-1318 te: the search also matches the collision suffix (the marketplace
// name alone no longer matches, as in the source).
export function filterPlugins(rows, { query = "" } = {}) {
  const term = query.trim().toLowerCase();
  if (!term) return rows;
  const names = pluginDisplayNames(rows);
  return rows.filter((row) => `${row.name} ${row.pluginName} ${row.description} ${names.get(row.id)?.suffix ?? ""}`.toLowerCase().includes(term));
}

// Composer Add menu → Plugins submenu, 3.6556.2 c752b32f8-mYZAs6yC gs → us (w12b-slash-plugin-groups).
//
// gs reads the plugins from shared-5 lw, which keeps only enabled plugins that own a user-invocable skill (cw
// `!e.enabled || … || !e.skills.some(nu) ? !1 : …`), and hands us its flags:
//   singleSkillRows  `h = G() && (!f || a)`  G = shared-52 YL = ze("__gb__254483703"), f = isAgentMode, a = canFold;
//   skillsFolded     `M = Ue(Sr()) && A`     A = canFold = shared-8 di = NP, which returns the constant `MP = !1`;
//   connectorsFolded `i !== null`            i = te = `N ? R : null`, N = `Ue(a === "on" && j) && j`, j = Ar(A) =
//                                            shared-8 PP(!1) = `e && !t && !Sn()` = false.
// So with canFold false only the GrowthBook gate could turn singleSkillRows on, and only outside agent mode; the host
// answers every gate from host-growthbook.mjs (a flag not listed there is off, D29 / D31 / R15).
export const PLUGIN_MENU_SINGLE_SKILL_ROWS_GATE = "__gb__254483703";
export function pluginMenuFlags({ singleSkillRowsGate = hostGrowthBookFlag(PLUGIN_MENU_SINGLE_SKILL_ROWS_GATE), isAgentMode = true, canFold = false, skillsFoldedGate = false, connectorsFolded = false } = {}) {
  const singleSkillRows = !!singleSkillRowsGate && (!isAgentMode || !!canFold);
  const skillsFolded = !!skillsFoldedGate && !!canFold;
  const folded = !!connectorsFolded;
  // us `_ = i || o` (the Plugin icon on a plugin's submenu; the search field b = Ue(_)), `v = a || o` (the count subtitle).
  return Object.freeze({ singleSkillRows, skillsFolded, connectorsFolded: folded, pluginIcon: singleSkillRows || folded, countSubtitle: skillsFolded || folded, search: singleSkillRows || folded });
}

// us's per-plugin mapper: `{name: e.name, label: o, skills: t, singleRow: i && t.length === 1 ? n : void 0}`, where o is
// the display name W(e) with " (local)" when another offered plugin shares it (`(O.get(a) ?? 0) > 1 && e.source ===
// "local"`, O counting the display names of the offered plugins n only). The skill rows (cs → shared-5 aw) carry the
// plugin for the hover card (sourcePluginName).
export function pluginMenuGroups(plugins, skills, { singleSkillRows = pluginMenuFlags().singleSkillRows } = {}) {
  const offered = plugins.filter((plugin) => plugin.enabled)
    .map((plugin) => ({ plugin, rows: skillMenuItems(skills.filter((skill) => skill.pluginId === plugin.id)) }))
    .filter((entry) => entry.rows.length > 0);
  const counts = new Map();
  for (const { plugin } of offered) counts.set(plugin.name, (counts.get(plugin.name) || 0) + 1);
  return offered.map(({ plugin, rows }) => {
    const label = counts.get(plugin.name) > 1 && plugin.source === "local" ? t("{name} (local)", { name: plugin.name }) : plugin.name;
    const items = rows.map((item) => ({ ...item, sourcePluginName: label }));
    return { id: plugin.id, name: plugin.pluginName || plugin.name, label, items, singleRow: singleSkillRows && items.length === 1 ? items[0] : undefined };
  });
}

// us's rows over those groups (3.6556.2 c752b32f8 :3434-3460):
//   a plugin folded to its one skill (singleRow) is that skill row, with `pluginLabel` (the row's hint, Qi `hint: m`)
//   only when another single row or a folded Skills row has the same label, case-insensitively;
//   any other plugin is `{type: "submenu", label, ...(_ ? {icon: "Plugin"} : {}), ...(v && n.length > 1 ? {subtitle:
//   "{count, plural, one {# skill} other {# skills}}"} : {}), items: n, submenuClassName: "max-h-[284px]"}`;
// then the folded Skills rows (`[...u, ...s]`). namedRows keeps `{name, label, row}` (A), which us's search reads.
export const PLUGIN_SUBMENU_CLASS = "max-h-[284px]";
export function pluginMenuRows(groups, flags = pluginMenuFlags(), skillRows = []) {
  const labels = new Map();
  for (const row of [...groups.map((group) => group.singleRow), ...skillRows.filter((row) => row.type === "skill")]) {
    if (!row) continue;
    const key = row.label.toLowerCase();
    labels.set(key, (labels.get(key) ?? 0) + 1);
  }
  const rows = groups.map(({ id, label, items, singleRow }) => singleRow
    ? (labels.get(singleRow.label.toLowerCase()) ?? 0) > 1 ? { ...singleRow, pluginLabel: label } : singleRow
    : {
      type: "submenu", id, label,
      ...(flags.pluginIcon ? { icon: "Plugin" } : {}),
      ...(flags.countSubtitle && items.length > 1 ? { subtitle: tn(items.length, "{count} skill", "{count} skills") } : {}),
      items, submenuClassName: PLUGIN_SUBMENU_CLASS,
    });
  return { items: [...rows, ...skillRows], namedRows: groups.map(({ name, label }, index) => ({ name, label, row: rows[index] })) };
}

// Official rows format updatedAt with dateStyle "short"; the local value is a
// Unix timestamp in seconds from fs.stat.
export function shortDate(seconds, locale = undefined) {
  if (!Number.isFinite(seconds)) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(new Date(seconds * 1000));
}

// Debounce plan for skills/changed: coalesce bursts, never wait longer than
// the window (the acceptance bound is 500 ms from the notification).
export const SKILLS_CHANGED_DEBOUNCE_MS = 250;

// ---------------------------------------------------------------------------
// Plugin installs (DeepSeek core, harness plugins.js over dsh-plugin-manager).

const INSTALL_FAILURES = {
  "pnpm-missing": t("The package manager (pnpm) could not be started."),
  timeout: t("The installation timed out."),
  "not-found": t("No package was found for this spec."),
  "no-matching-version": t("No version of this package matches."),
  network: t("The package registry could not be reached. Check your connection and try again."),
  "disk-full": t("There is not enough disk space."),
  permission: t("The plugin folder is not writable."),
  "build-blocked": t("The package needs to run build scripts."),
  integrity: t("The downloaded package failed its integrity check."),
};
const MANAGEMENT_ERRORS = {
  "not-bundle": t("This package is not a DeepSeek Harness plugin."),
  "not-removable": t("This plugin is part of OpenClaude Desktop and cannot be removed."),
  "management-required": t("OpenClaude Desktop needs this plugin."),
  "invalid-spec": t("Enter a package name, absolute path, git URL or tarball URL."),
  "incompatible-version": t("This plugin does not support this DeepSeek Harness version."),
  "bundle-in-use": t("This plugin is in use and cannot be removed now."),
};

// A finished install/remove/toggle (dsh-plugin-manager ChangeResult) → what the page says.
export function pluginChangeOutcome(result) {
  if (!result || typeof result !== "object") return { ok: false, message: t("The plugin change did not finish.") };
  if (result.application === "cancelled") return { ok: false, cancelled: true, message: t("Installation cancelled.") };
  const pending = Array.isArray(result.pendingBuilds) ? result.pendingBuilds.filter((name) => typeof name === "string") : [];
  if (result.error || result.application === "failed" || (result.stage === "install" && result.changed !== true)) {
    const kind = result.packageResult?.kind;
    const incompatible = Array.isArray(result.error?.incompatible) && result.error.incompatible.length
      ? ` (${result.error.incompatible.map((item) => `${item.name}@${item.version}`).join(", ")})` : "";
    const message = (result.error?.code && MANAGEMENT_ERRORS[result.error.code] ? MANAGEMENT_ERRORS[result.error.code] + incompatible : "")
      || (kind && INSTALL_FAILURES[kind]) || text(result.error?.diagnostic).trim() || t("The plugin change failed.");
    return { ok: false, message, pendingBuilds: pending, output: text(result.packageResult?.output) };
  }
  return { ok: true, restartRequired: result.application === "restart-required" && result.changed !== false, bundle: text(result.bundle) || text(result.target) };
}

// install-state progress → one status line.
export function pluginInstallStatus(install) {
  if (!install) return "";
  if (install.phase === "cancelling") return t("Cancelling…");
  if (install.phase === "applying") return t("Applying…");
  const attempt = install.attempt;
  const count = attempt && attempt.total > 1 ? ` (${attempt.index + 1}/${attempt.total})` : "";
  return attempt?.registry ? t("Installing from {registry}{count}…", { registry: attempt.registry, count }) : t("Installing{count}…", { count });
}

export const PLUGIN_LOG_LIMIT = 20000;
export const appendPluginLog = (log, chunk) => { const next = (log || "") + (chunk || ""); return next.length > PLUGIN_LOG_LIMIT ? next.slice(-PLUGIN_LOG_LIMIT) : next; };

/**
 * ChatGPT Apps (Codex app/list AppInfo) as Customize › Connectors lists them, the way Codex's /apps directory does
 * (chatwidget/connectors.rs): installed ones first, each 'Installed', 'Installed · Off' or 'Can be installed', and how
 * many of the available apps are installed.
 */
export function appsView(response) {
  const apps = (Array.isArray(response?.data) ? response.data : []).filter((app) => app && typeof app.id === "string" && app.id)
    .map((app) => ({
      id: app.id,
      name: text(app.name).trim() || app.id,
      description: text(app.description).trim(),
      icon: typeof app.logoUrl === "string" && /^https:\/\//.test(app.logoUrl) ? app.logoUrl : null,
      iconDark: typeof app.logoUrlDark === "string" && /^https:\/\//.test(app.logoUrlDark) ? app.logoUrlDark : null,
      installed: app.isAccessible === true,
      enabled: app.isEnabled !== false,
      url: typeof app.installUrl === "string" && /^https:\/\//.test(app.installUrl) ? app.installUrl : null,
      plugins: Array.isArray(app.pluginDisplayNames) ? app.pluginDisplayNames.filter((name) => typeof name === "string") : [],
    }))
    .map((app) => ({ ...app, status: app.installed ? (app.enabled ? t("Installed") : t("Installed · Off")) : t("Can be installed") }))
    .sort((a, b) => Number(b.installed) - Number(a.installed) || a.name.localeCompare(b.name));
  const installed = apps.filter((app) => app.installed).length;
  return { apps, installed, total: apps.length, summary: apps.length ? t("{installed} of {total} available apps installed", { installed, total: apps.length }) : "" };
}
