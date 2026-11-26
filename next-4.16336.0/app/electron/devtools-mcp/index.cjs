// Google's chrome-devtools-mcp for the app's sessions, on the Preview pane's tabs (see cdp-proxy.cjs).
//
// Every core that gets OpenClaude Desktop's own MCP server (agent-tools-host.cjs, "code_desktop") also gets a
// "chrome-devtools" server (Codex: `chrome_devtools`, its config keys allow no dash): the chrome-devtools-mcp 1.13.0 that
// ships with the app — the harness's node_modules (harness/package.json, vendor-packages/chrome-devtools-mcp-1.13.0.tgz),
// which scripts/bundle-harness.mjs copies to <app>/Contents/Resources/harness — run by the app's own binary as Node
// (ELECTRON_RUN_AS_NODE, as agent-tools-server.mjs), never `npx …@latest`. Its arguments point it at the proxy:
//   --wsEndpoint ws://127.0.0.1:<port>/devtools/browser/<token> --no-usage-statistics --no-performance-crux
// and its environment turns off the npm update check and config-file discovery. Bridges and the DeepSeek core read the
// definition from CODE_DESKTOP_DEVTOOLS_MCP_SERVER ({name, command, args, env}); Codex gets `-c mcp_servers.*` overrides.
//
// The proxy starts the first time a core is about to spawn (beforeSpawn), not with the app, and stops at quit.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createCdpProxy } = require("./cdp-proxy.cjs");

const SERVER_NAME = "chrome-devtools";
const CODEX_SERVER_NAME = "chrome_devtools";
const VERSION = "1.13.0";
const ENV_KEY = "CODE_DESKTOP_DEVTOOLS_MCP_SERVER";
const BIN = path.join("node_modules", "chrome-devtools-mcp", "out", "Default", "gen", "src", "bin", "chrome-devtools-mcp.js");
const LAUNCHER = path.join(__dirname, "launch.mjs");
const SERVER_ENV = Object.freeze({
  CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: "1",
  CHROME_DEVTOOLS_MCP_NO_CONFIG_DISCOVERY: "1",
  CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: "1",
});

/** The packaged (or this checkout's) chrome-devtools-mcp entry of the pinned version, else null. */
function resolveServerScript({ resourcesPath = process.resourcesPath, repoRoot = path.resolve(__dirname, "../../..") } = {}) {
  for (const harness of [resourcesPath && path.join(resourcesPath, "harness"), path.join(repoRoot, "harness")].filter(Boolean)) {
    const script = path.join(harness, BIN);
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(harness, "node_modules", "chrome-devtools-mcp", "package.json"), "utf8"));
      if (pkg.version === VERSION && fs.statSync(script).isFile()) return script;
    } catch { /* next */ }
  }
  return null;
}

/**
 * @param {object} options
 * @param {object} options.previewService   preview-service.cjs (its `devtools` host)
 * @param {() => boolean} [options.enabled] whether the preview tools are on
 * @param {string} [options.command]        the program that runs the server (the app's binary)
 * @param {boolean} [options.runAsNode]
 * @param {string|null} [options.script]    tests: the server entry
 */
function createDevtoolsMcp({ previewService, enabled = () => true, logger = console, command = process.execPath, runAsNode = !!process.versions.electron, script = undefined } = {}) {
  const serverScript = script === undefined ? resolveServerScript() : script;
  let proxy = null, endpoint = null, starting = null;
  if (!serverScript) logger.warn?.(`chrome-devtools-mcp ${VERSION} isn’t installed (harness/node_modules): sessions won’t get the chrome-devtools server.`);

  /** Starts the proxy once (lazily); resolves with its endpoint, or null when there is nothing to serve. */
  function start() {
    if (endpoint || !serverScript || !previewService?.devtools) return Promise.resolve(endpoint);
    starting ??= (async () => {
      proxy = createCdpProxy({ host: { ...previewService.devtools, enabled }, logger });
      try { endpoint = await proxy.start(); }
      catch (error) { logger.warn?.(`chrome-devtools proxy unavailable: ${error?.message ?? error}`); proxy = null; endpoint = null; }
      finally { starting = null; }
      return endpoint;
    })();
    return starting;
  }
  function stop() {
    try { proxy?.stop(); } catch { /* stopped */ }
    proxy = null; endpoint = null;
  }
  /** {name, command, args, env} once the proxy listens, else null. */
  function serverDefinition() {
    if (!endpoint || !serverScript) return null;
    return {
      name: SERVER_NAME,
      command,
      // Under the app's binary the server goes through launch.mjs, which keeps it out of the Dock (process.title).
      args: [...(runAsNode ? [LAUNCHER] : []), serverScript, "--wsEndpoint", endpoint.wsEndpoint, "--no-usage-statistics", "--no-performance-crux"],
      env: { ...(runAsNode ? { ELECTRON_RUN_AS_NODE: "1" } : {}), ...SERVER_ENV },
    };
  }
  /** The variable bridges and the DeepSeek core read. */
  function launchEnv() {
    const definition = serverDefinition();
    return definition ? { [ENV_KEY]: JSON.stringify(definition) } : {};
  }
  /** Codex's `-c` overrides (never written to ~/.codex/config.toml). */
  function codexArgs() {
    return codexArgsFor(serverDefinition());
  }
  /** Wraps codex.cjs setAgentToolsLaunch's function: the chrome-devtools server next to code_desktop. */
  function wrapLaunch(launch) {
    return () => {
      const base = launch() ?? {};
      return { ...base, env: { ...(base.env ?? {}), ...launchEnv() }, codexArgs: [...(Array.isArray(base.codexArgs) ? base.codexArgs : []), ...codexArgs()] };
    };
  }
  return { start, stop, serverDefinition, launchEnv, codexArgs, wrapLaunch, get endpoint() { return endpoint; }, get proxy() { return proxy; }, serverScript };
}

/** A server definition as Codex `-c mcp_servers.chrome_devtools.*` overrides ([] without one). */
function codexArgsFor(definition) {
  if (!definition) return [];
  const toml = (value) => JSON.stringify(value);
  const key = `mcp_servers.${CODEX_SERVER_NAME}`;
  const out = [
    "-c", `${key}.command=${toml(definition.command)}`,
    "-c", `${key}.args=${toml(definition.args)}`,
    "-c", `${key}.startup_timeout_sec=30`,
    "-c", `${key}.tool_timeout_sec=600`,
    // Like the preview tools (preview_eval included), it acts on the preview tabs only: no Codex prompt per call.
    "-c", `${key}.default_tools_approval_mode="approve"`,
    // The definition (it carries the proxy's address and token) is for the cores only, never an agent's shell.
    "-c", `shell_environment_policy.set.${ENV_KEY}=""`,
  ];
  for (const [name, value] of Object.entries(definition.env)) out.push("-c", `${key}.env.${name}=${toml(value)}`);
  return out;
}

module.exports = { createDevtoolsMcp, codexArgsFor, resolveServerScript, SERVER_NAME, CODEX_SERVER_NAME, VERSION, ENV_KEY, SERVER_ENV };
