/**
 * OpenClaude Desktop's own tools: the local MCP server "code_desktop" (app/electron/agent-tools-server.mjs) every core runs
 * for the app's sessions only. The app starts the core with
 *   CODE_DESKTOP_AGENT_TOOLS_SERVER  {"name":"code_desktop","command":…,"args":[…],"env":{…}}
 *   CODE_DESKTOP_AGENT_TOOLS_SOCKET / CODE_DESKTOP_AGENT_TOOLS_TOKEN  the app's channel and its secret
 * and each thread's agent (createThread, openThread) gets its own scoped dsh-mcp-client for it, its env naming the
 * thread (CODE_DESKTOP_AGENT_SESSION): tools mcp__code_desktop__<tool>, gone with the agent. Its sub-agents (and the
 * agents of its model workflows) borrow that client (shareAppTools) instead of starting a server each. Never in the
 * profile or the user's Harness config; side questions and previews never get one. Without the variables: nothing.
 */
import { createHmac } from 'node:crypto'
import { Config, activateMcpClient, inheritMcpServer } from '@deepseek-ai/dsh-mcp-client'

/** The public tool-name prefix of the server's tools (dsh-mcp-client: mcp__<serverName>__<tool>). */
export const APP_TOOL_PREFIX = 'mcp__code_desktop__'

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
    // dsh-mcp-client serverName: [A-Za-z0-9_-]{1,32}.
    name: typeof value.name === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(value.name) ? value.name : 'code_desktop',
    command: value.command,
    args: value.args ?? [],
    env: { ...Object.fromEntries(own), CODE_DESKTOP_AGENT_TOOLS_SOCKET: socket, CODE_DESKTOP_AGENT_TOOLS_TOKEN: token },
  }
}

/**
 * A session's own credential for the app's channel (app/electron/agent-tools-host.cjs sessionTokenFor): the server
 * started for one session carries it instead of the channel's secret, so whatever can read that server's environment
 * (or a config file naming it) can act for that session only.
 */
export function sessionToken(secret, session) {
  return createHmac('sha256', String(secret)).update(`code-desktop-agent-session\n${session}`).digest('hex')
}

/** Whether a tool is one of OpenClaude Desktop's own (the app asks the user itself where it matters, as for Codex). */
export const isAppTool = (toolName) => typeof toolName === 'string' && toolName.startsWith(APP_TOOL_PREFIX)

/**
 * Starts the thread's code_desktop client on the agent's scope, from an agents.create|resume setup callback (which
 * must return nothing): in the background, a failure only logged, so the thread opens whatever the app does. Returns
 * a promise that settles once the client is up (or failed), for a caller that wants its tools before the first step.
 * @param {import('@deepseek-ai/cordis').Context} agentCtx
 * @param {{name: string, command: string, args: string[], env: Record<string, string>} | null} server
 * @param {{session: string, cwd?: string, logger?: {warn?: Function}}} options
 */
export function installAppTools(agentCtx, server, { session, cwd, logger = console }) {
  if (!server || typeof session !== 'string' || !session) return undefined
  const warn = (error) => logger.warn?.(`OpenClaude Desktop tools for ${session}: ${error?.message ?? error}`)
  try {
    const config = Config({
      transport: 'stdio', serverName: server.name, command: server.command, args: [...server.args],
      env: { ...server.env, CODE_DESKTOP_AGENT_TOOLS_TOKEN: sessionToken(server.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN, session), CODE_DESKTOP_AGENT_SESSION: session }, cwd: typeof cwd === 'string' ? cwd : '',
      // Tools that wait on the user (a preview action the app confirms) may take long.
      toolCallTimeoutMs: 600000, failOnStartupError: false,
    })
    const fiber = agentCtx.plugin({ name: 'code-desktop-agent-tools', apply: async (inner) => { await activateMcpClient(inner, config) } })
    // Settles (never rejects) once the client is up: the thread's open waits for it (index.js createThread/openThread).
    return Promise.resolve(fiber).then(() => undefined, warn)
  } catch (error) {
    warn(error)
    return undefined
  }
}

/** How long a thread's first step (or a sub-agent's) waits for the code_desktop client: a stuck server never holds it longer. */
export const APP_TOOLS_WAIT_MS = 5000

/**
 * installAppTools' readiness, bounded: settles once the client is up (or failed), or after `ms`. Undefined stays
 * undefined (nothing was installed), so `await` on it costs nothing.
 * @param {Promise<void> | undefined} ready
 */
export function boundedReady(ready, ms = APP_TOOLS_WAIT_MS) {
  if (!ready) return undefined
  let timer
  const timeout = new Promise((resolve) => { timer = setTimeout(resolve, ms); timer.unref?.() })
  return Promise.race([ready, timeout]).then(() => { clearTimeout(timer) })
}

/**
 * Gives a sub-agent its root thread's code_desktop tools and server instructions by borrowing the root's client
 * (dsh-mcp-client inheritMcpServer): no process of its own, and the tools follow the root's list (a server that comes
 * up late, a reconnect). Calls still act for the root session, the one the user sees. Disposal (the child's scope)
 * removes only the borrowed registrations. False when the root has no such client (then nothing is installed).
 * @param {import('@deepseek-ai/cordis').Context} childCtx
 * @param {import('@deepseek-ai/cordis').Context} rootCtx the root thread's agent scope (createThread/openThread setup)
 * @param {{name: string} | null} server
 */
export function shareAppTools(childCtx, rootCtx, server, { logger = console } = {}) {
  if (!server || !childCtx || !rootCtx) return false
  try {
    return inheritMcpServer(childCtx, rootCtx, server.name, () => true) === true
  } catch (error) {
    logger.warn?.(`OpenClaude Desktop tools for a sub-agent: ${error?.message ?? error}`)
    return false
  }
}
