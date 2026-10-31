// Who provides computer use to a session (Settings › Computer use › Computer use provider; config.computerUseProvider):
//   "core"        the agent's own when its core has one, else OpenClaude Desktop's (agent-tools/computer-use.mjs). Unset
//                 reads as this.
//   "openclaude"  always OpenClaude Desktop's; a core's own is turned off where OpenClaude Desktop can turn it off.
// A core has its own when its capabilities list "ComputerUse" in nativeTools (none does today), when it reports
// ownComputerUse (the ZCode bridge: ZCode's official computer-use plugin is on), or, for Codex, when the session's
// config.toml (config/read) turns on one of the Codex app's computer-use plugins or its computer-use MCP server
// (codexComputerUse). main.cjs agentToolServedToCore asks servesOpenClaudeComputerUse for every tool of the computer-use
// group (its module's native is "ComputerUse"); the Enable computer use switch (agentComputerUse) turns the group off first.
const PROVIDERS = Object.freeze(["core", "openclaude"]);
const NATIVE_NAME = "ComputerUse";
// The Codex app's computer-use plugins and MCP server as config.toml names them (`[plugins."<id>"]`,
// `[mcp_servers.computer-use]`); the plugins come with the ChatGPT / Codex desktop app, not the CLI.
const CODEX_PLUGINS = Object.freeze(["computer-use@openai-bundled", "unified-computer-use@openai-bundled"]);
const CODEX_SERVER = "computer-use";

/** The saved choice, unset or unknown reading as "core". */
function computerUseProvider(config) {
  return config?.computerUseProvider === "openclaude" ? "openclaude" : "core";
}
/** Whether a core's capabilities (implied and reported) say it has computer use of its own. */
function coreHasComputerUse(capabilities) {
  return (Array.isArray(capabilities?.nativeTools) && capabilities.nativeTools.includes(NATIVE_NAME)) || capabilities?.ownComputerUse === true;
}
/** Whether a session whose core has (own) or lacks computer use of its own is served OpenClaude Desktop's. */
function servesOpenClaudeComputerUse({ provider, own }) {
  return provider === "openclaude" || own !== true;
}
/** Whether a core's own computer use is to be turned off: only with "openclaude", only where it has one. */
function coreComputerUseOff({ provider, own }) {
  return provider === "openclaude" && own === true;
}
/**
 * A Codex session's own computer use, from its config/read config: own (a plugin or the MCP server is on) and the
 * thread config overrides that turn exactly those off (dotted keys, as thread/start config takes them). An entry
 * without `enabled` counts as on; a config that couldn't be read has none.
 */
function codexComputerUse(codexConfig) {
  const on = (entry) => !!entry && typeof entry === "object" && entry.enabled !== false;
  const off = {};
  for (const id of CODEX_PLUGINS) if (on(codexConfig?.plugins?.[id])) off[`plugins.${id}.enabled`] = false;
  if (on(codexConfig?.mcp_servers?.[CODEX_SERVER])) off[`mcp_servers.${CODEX_SERVER}.enabled`] = false;
  return { own: Object.keys(off).length > 0, off };
}

module.exports = { PROVIDERS, NATIVE_NAME, CODEX_PLUGINS, CODEX_SERVER, computerUseProvider, coreHasComputerUse, servesOpenClaudeComputerUse, coreComputerUseOff, codexComputerUse };
