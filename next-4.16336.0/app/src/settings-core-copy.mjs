// Settings copy that names the running core (core-registry.mjs descriptors and boot.core), so a page never
// tells a Codex, ZCode or ACP user about DeepSeek Harness. Only the DeepSeek Harness core (harnessProfile: its
// profile and ~/.dsh key) keeps the DeepSeek Harness wording.
import { t } from "../electron/i18n/index.mjs";
import { coreById, coreCapabilities, coreForEngine, corePath, coreSupports } from "../electron/core-registry.mjs";

const descriptorOf = (core) => (typeof core === "string" ? coreById(core) ?? coreForEngine(core) : coreForEngine(core?.engine));

/**
 * The core Settings pages describe and gate on: boot.core (initialize's report, whose capabilities win; it stays
 * after a disconnect), else the chosen core id (config.core) before any core reported.
 * @param {object | null | undefined} boot
 * @param {object | null | undefined} config
 * @returns {object | string | undefined}
 */
export function settingsCore(boot, config) {
  if (boot?.core && typeof boot.core === "object") return boot.core;
  return chosenCore(boot, config);
}
// config.core; a failed start without one is the DeepSeek core the app falls back to (core-manager.cjs chosen()).
// A connected boot without a core report is the Codex fixture case (coreForEngine(undefined)), so it stays undefined.
function chosenCore(boot, config) {
  if (typeof config?.core === "string" && config.core) return config.core;
  return boot && boot.connected === false ? "deepseek" : undefined;
}

/**
 * The core whose account Preferences shows: the running one while connected, else the chosen one (config.core),
 * so a disconnected or crashed Codex still reads "Codex account".
 */
export function accountCore(boot, config) {
  if (boot?.connected && boot?.core && typeof boot.core === "object") return boot.core;
  return chosenCore(boot, config) ?? boot?.core ?? undefined;
}

/** Preferences' account group title: "DeepSeek account" on DeepSeek Harness, "{name} account" on any other core. */
export function accountGroupTitle(core) {
  const descriptor = descriptorOf(core ?? "deepseek");
  return coreSupports(core ?? "deepseek", "harnessProfile") ? "DeepSeek account" : t("{name} account", { name: descriptor.name });
}

/** Where a core keeps its own configuration: what it reported (configPath), else its descriptor's configFile. */
export function coreConfigFile(core) {
  const reported = core && typeof core === "object" && typeof core.configPath === "string" && core.configPath ? core.configPath : null;
  return (reported ?? corePath(core, descriptorOf(core)?.configFile ?? null))?.replace(/^\/Users\/[^/]+/, "~") ?? null;
}

/** Where a core keeps its MCP servers when that is a separate file (Kimi's mcp.json): reported, else the descriptor's. */
export function coreMcpConfigFile(core) {
  const reported = core && typeof core === "object" && typeof core.mcpConfigPath === "string" && core.mcpConfigPath ? core.mcpConfigPath : null;
  return (reported ?? corePath(core, descriptorOf(core)?.mcpConfigFile ?? null))?.replace(/^\/Users\/[^/]+/, "~") ?? null;
}

/**
 * Developer › Local engine: the row label and the Engine description for the running core (name, version when it
 * reported one, its own configuration file).
 */
export function engineCopy(core) {
  if (coreSupports(core, "harnessProfile"))
    return { label: t("DeepSeek core"), engine: t("Uses DeepSeek Harness with the API key from Settings › Models (else DEEPSEEK_API_KEY or the key saved in DeepSeek Harness). Settings here do not rewrite your DeepSeek Harness configuration."),
      mcp: t("Local MCP servers from your DeepSeek Harness configuration.") };
  const descriptor = descriptorOf(core), name = descriptor.name;
  const version = core && typeof core === "object" && typeof core.engineVersion === "string" && core.engineVersion ? core.engineVersion : null;
  const config = coreConfigFile(core), mcpConfig = coreMcpConfigFile(core) ?? config;
  const runs = version ? t("Runs {core} {version}.", { core: name, version }) : t("Runs {core}.", { core: name });
  return {
    label: t("{core} core", { core: name }),
    // Two sentences; the dictionary decides the joiner (zh-CN runs them together).
    engine: t("{first} {second}", { first: runs, second: writesCopy(core, descriptor, name, config, mcpConfig) }),
    mcp: mcpConfig ? t("Local MCP servers from {core}’s configuration ({config}).", { core: name, config: mcpConfig }) : t("Local MCP servers from {core}’s configuration.", { core: name }),
  };
}

// What OpenClaude Desktop writes into the core's own files. An overlay core (capability configOverlay: OpenCode, MiMo, or a
// reported configPath that isn't the user's file) keeps its changes in OpenClaude Desktop's overlay; a core that saves
// connectors (mcpConfigWrite; a native core unless it says false) or its own settings (coreSettings: Qwen, Gemini) into
// the user's file says so, since the CLI shares that file.
function writesCopy(core, descriptor, name, config, mcpConfig) {
  const capabilities = coreCapabilities(core);
  const userFile = corePath(core, descriptor.configFile ?? null);
  const overlay = capabilities.configOverlay === true || (!!config && !!userFile && config !== userFile);
  if (overlay) return userFile ? t("Settings here do not rewrite its own configuration in {config}.", { config: userFile }) : t("Settings here do not rewrite its own configuration.");
  const connectors = descriptor.kind === "native" ? capabilities.mcpConfigWrite !== false : capabilities.mcpConfigWrite === true;
  // A core whose settings OpenClaude Desktop keeps itself (coreSettingsInConfig false: ZCode's host preferences) changes
  // nothing in the agent's config file through them.
  const settings = capabilities.coreSettings === true && capabilities.coreSettingsInConfig !== false;
  if (settings && config) return connectors && mcpConfig === config
    ? t("Connectors and {core} settings you change in OpenClaude Desktop are saved to {config}.", { core: name, config })
    : t("{core} settings you change in OpenClaude Desktop are saved to {config}.", { core: name, config });
  if (connectors && mcpConfig) return t("Connectors you add or remove in OpenClaude Desktop are saved to {config}.", { config: mcpConfig });
  return config ? t("Settings here do not rewrite its own configuration in {config}.", { config }) : t("Settings here do not rewrite its own configuration.");
}

/**
 * The sign-out confirmation for a core with its own sign-in: signing out reaches every tool on this Mac that shares
 * the core's credentials (the Codex CLI's ~/.codex, the ZCode app, OpenCode's auth store), not only OpenClaude Desktop.
 */
export function signOutConfirmText(core) {
  const descriptor = descriptorOf(core), name = descriptor.name;
  // Where the shared sign-in really lives: the descriptor's credentials folder (login.store: OpenCode's and MiMo's
  // ~/.local/share/<agent>, not their config folder), else the config file's folder; under a moved home (corePath).
  const configFile = corePath(core, descriptor.configFile ?? null);
  const config = corePath(core, descriptor.login?.store ?? null) || (configFile ? configFile.replace(/\/[^/]+$/, "") : null);
  return config
    ? t("Sign out of {core}? {core} on this Mac signs out too, including other tools that share its sign-in in {where}.", { core: name, where: config })
    : t("Sign out of {core}? {core} on this Mac signs out too, including other tools that share its sign-in.", { core: name });
}
