/**
 * OpenClaude Desktop's own tools: the local MCP server "code_desktop" (app/electron/agent-tools-server.mjs) every core runs
 * for the app's sessions only. The app starts the bridge with
 *   CODE_DESKTOP_AGENT_TOOLS_SERVER  {"name":"code_desktop","command":…,"args":[…],"env":{…}}
 *   CODE_DESKTOP_AGENT_TOOLS_SOCKET / CODE_DESKTOP_AGENT_TOOLS_TOKEN  the app's channel and its secret
 * OpenCode runs one MCP server per folder for every session in it, so the server is registered once, in the bridge's
 * generated config layer (config.js overlay; the user's own config is never written), without a session of its own:
 * the plugin (plugin.js tool.execute.before) names the app thread on every call of one of its tools with the
 * SESSION_ARG argument, which the server strips before the tool sees it (OpenCode 2.x drops it before the server: there
 * the server reads the session from the call's _meta, src/v2/config.js appToolsEntryV2). The socket and token stay out
 * of the config file: {env:…} references, filled in from the agent server's environment. Without the variables: nothing.
 */
export const SESSION_ARG = '__code_desktop_session'

/** {name, command, args, env} (env: the server's own variables) or null. */
export function appToolsServer(env = process.env) {
  const raw = env?.CODE_DESKTOP_AGENT_TOOLS_SERVER
  if (typeof raw !== 'string' || !raw || !env.CODE_DESKTOP_AGENT_TOOLS_SOCKET || !env.CODE_DESKTOP_AGENT_TOOLS_TOKEN) return null
  let value
  try { value = JSON.parse(raw) } catch { return null }
  if (!value || typeof value !== 'object' || typeof value.command !== 'string' || !value.command) return null
  if (value.args !== undefined && (!Array.isArray(value.args) || value.args.some((arg) => typeof arg !== 'string'))) return null
  const own = value.env && typeof value.env === 'object' && !Array.isArray(value.env) ? Object.entries(value.env).filter(([, item]) => typeof item === 'string') : []
  return {
    name: typeof value.name === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.name) ? value.name : 'code_desktop',
    command: value.command,
    args: value.args ?? [],
    env: Object.fromEntries(own),
    // The server's own instructions (its initialize reply, e.g. the preview auto-verify workflow): OpenCode shows a
    // server's instructions to the model, MiMo doesn't, so the bridge adds them to MiMo's instructions (writeRuntime).
    instructions: typeof value.instructions === 'string' && value.instructions.trim() ? value.instructions.trim().slice(0, 20000) : null,
  }
}

/** The OpenCode/MiMo `mcp.<name>` entry: a local server, tool calls up to 10 minutes (OpenCode's default is 5 s). */
export function opencodeAppToolsEntry(server) {
  return {
    type: 'local',
    command: [server.command, ...server.args],
    environment: { ...server.env, CODE_DESKTOP_AGENT_TOOLS_SOCKET: '{env:CODE_DESKTOP_AGENT_TOOLS_SOCKET}', CODE_DESKTOP_AGENT_TOOLS_TOKEN: '{env:CODE_DESKTOP_AGENT_TOOLS_TOKEN}' },
    timeout: 600000,
  }
}

/** OpenCode's tool key prefix for the server's tools (mcp/index.ts: sanitize(client) + '_' + sanitize(tool)). */
export const appToolsPrefix = (server) => `${server.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_`
