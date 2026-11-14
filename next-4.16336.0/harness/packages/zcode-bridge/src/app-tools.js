/**
 * OpenClaude Desktop's own tools: the local MCP server "code_desktop" (app/electron/agent-tools-server.mjs) every core runs
 * for the app's sessions only. The app starts the bridge with
 *   CODE_DESKTOP_AGENT_TOOLS_SERVER  {"name":"code_desktop","command":…,"args":[…],"env":{…}}
 *   CODE_DESKTOP_AGENT_TOOLS_SOCKET / CODE_DESKTOP_AGENT_TOOLS_TOKEN  the app's channel and its secret
 * and each session gets the server in its session/create|resume mcpServers, its env naming the session
 * (CODE_DESKTOP_AGENT_SESSION). Nothing is written to ZCode's own config. Without the variables: nothing.
 *
 * The session: the thread id once the thread exists; for thread/start (ZCode picks the session id only when it
 * answers session/create, and refuses one chosen by the client) the opaque start token the app sends in params.config under SESSION_CONFIG_KEY, which the app
 * binds to the thread id from the response.
 */
import { createHmac } from 'node:crypto'

export const SESSION_CONFIG_KEY = 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION'

/** {name, command, args, env} (env holds the socket and token) or null. */
export function appToolsServer(env = process.env) {
  const raw = env?.CODE_DESKTOP_AGENT_TOOLS_SERVER
  const socket = env?.CODE_DESKTOP_AGENT_TOOLS_SOCKET
  const token = env?.CODE_DESKTOP_AGENT_TOOLS_TOKEN
  if (typeof raw !== 'string' || !raw || typeof socket !== 'string' || !socket || typeof token !== 'string' || !token) return null
  let value
  try { value = JSON.parse(raw) } catch { return null }
  if (!value || typeof value !== 'object' || typeof value.command !== 'string' || !value.command) return null
  if (value.args !== undefined && (!Array.isArray(value.args) || value.args.some((arg) => typeof arg !== 'string'))) return null
  const own = value.env && typeof value.env === 'object' && !Array.isArray(value.env) ? Object.entries(value.env).filter(([, item]) => typeof item === 'string') : []
  return {
    name: typeof value.name === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.name) ? value.name : 'code_desktop',
    command: value.command,
    args: value.args ?? [],
    env: { ...Object.fromEntries(own), CODE_DESKTOP_AGENT_TOOLS_SOCKET: socket, CODE_DESKTOP_AGENT_TOOLS_TOKEN: token },
    // The server's own instructions (its initialize reply): ZCode's MCP adapter never shows those to the model, so the
    // bridge adds them to the instructions it sends (server.js appToolsInstructions).
    instructions: typeof value.instructions === 'string' && value.instructions.trim() ? value.instructions.trim().slice(0, 20000) : null,
  }
}

/** The start token a thread/start or thread/fork carries (params.config[SESSION_CONFIG_KEY]), else null. */
export function sessionIdentityOf(params) {
  const value = params?.config?.[SESSION_CONFIG_KEY]
  return typeof value === 'string' && value && value.length <= 200 ? value : null
}

/**
 * A session's own credential for the app's channel (app/electron/agent-tools-host.cjs sessionTokenFor): the server
 * started for one session carries it instead of the channel's secret, so whatever can read that server's environment
 * (or a config file naming it) can act for that session only.
 */
export function sessionToken(secret, session) {
  return createHmac('sha256', String(secret)).update(`code-desktop-agent-session\n${session}`).digest('hex')
}

/**
 * The ZCode protocol stdio mcpServers entry for one session (null without a server or a session to name): its own
 * process per session (isolation 'session', as the env differs per session), tool calls up to 10 minutes.
 */
export function zcodeAppToolsServer(server, session) {
  if (!server || typeof session !== 'string' || !session) return null
  const env = { ...server.env, CODE_DESKTOP_AGENT_TOOLS_TOKEN: sessionToken(server.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN, session), CODE_DESKTOP_AGENT_SESSION: session }
  return { name: server.name, command: server.command, args: [...server.args], env: Object.entries(env).map(([name, value]) => ({ name, value })), isolation: 'session', timeoutMs: 600000 }
}
