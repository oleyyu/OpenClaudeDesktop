/**
 * OpenClaude Desktop's own tools: the local MCP server "code_desktop" (app/electron/agent-tools-server.mjs) every core runs
 * for the app's sessions only. The app starts the bridge with
 *   CODE_DESKTOP_AGENT_TOOLS_SERVER  {"name":"code_desktop","command":…,"args":[…],"env":{…}}
 *   CODE_DESKTOP_AGENT_TOOLS_SOCKET / CODE_DESKTOP_AGENT_TOOLS_TOKEN  the app's channel and its secret
 * and each session gets the server as an ACP session mcpServers entry, its env naming the session
 * (CODE_DESKTOP_AGENT_SESSION). Nothing is written to the agent's own config. Without the variables: nothing.
 *
 * The session: the thread id once the thread exists; for thread/start (the agent picks the session id only when it
 * answers session/new) the opaque start token the app sends in params.config under SESSION_CONFIG_KEY, which the app
 * binds to the thread id from the response.
 */
import { createHmac } from 'node:crypto'

export const SESSION_CONFIG_KEY = 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION'

/**
 * The tools the server serves (app/electron/agent-tools/*.mjs), for agents whose rules name tools one by one (Gemini's
 * Plan Mode policy, Qwen's up-front tools). A tool missing here still works; only those rules leave it out.
 */
export const APP_TOOL_NAMES = Object.freeze([
  'preview_start', 'preview_stop', 'preview_list', 'preview_logs', 'navigate', 'screenshot', 'read_page', 'get_page_text', 'click', 'type', 'press',
  'preview_inspect', 'preview_fill', 'preview_eval',
  'read_console_messages', 'read_network_requests', 'resize_window', 'list_terminal_tabs', 'read_terminal', 'run_in_terminal', 'stop_terminal_tab', 'Workflow', 'WorkflowStop',
  'open_terminal_tab', 'AskUserQuestion', 'PushNotification', 'SendUserFile', 'ReportFindings', 'mark_chapter', 'spawn_task', 'dismiss_task',
  'Monitor', 'MonitorStop', 'CronCreate', 'CronList', 'CronDelete', 'WebFetch', 'scroll', 'hover', 'find', 'preview_batch',
  'NotebookEdit', 'list_sessions', 'get_session', 'list_events', 'set_session_title', 'reveal_path', 'open_in_editor',
  'get_window_layout', 'open_session_in', 'close_split', 'set_sidebar_collapsed',
  'show_widget', 'read_me',
  // agent-tools/turn-plan.mjs: the task list and the next-step box (2.42304.0 ccd_turn update_plan / wrap_up, alwaysLoad).
  'update_plan', 'wrap_up',
])

/** {name, command, args, env, instructions} (env holds the socket and token; instructions text or null) or null. */
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
    // The server's own instructions (its initialize reply). Kimi and MiniMax never show those to the model, so for an
    // adapter with appToolsInstructions the bridge adds them to the prompt it already appends (server.js launchConfig).
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

/** The ACP stdio mcpServers entry for one session (null without a server or a session to name). */
export function acpAppToolsServer(server, session, { runAsNodeInCommand = false } = {}) {
  let entry = appToolsLaunchEntry(server, session)
  if (entry && runAsNodeInCommand) entry = withRunAsNodeInCommand(entry)
  return entry ? { ...entry, env: Object.entries(entry.env).map(([name, value]) => ({ name, value })) } : null
}

/**
 * An entry whose ELECTRON_RUN_AS_NODE rides in the command (/usr/bin/env ELECTRON_RUN_AS_NODE=1 <app> <script>), for an
 * agent that drops that variable from a server's env (adapter.mcpDropsRunAsNode: Gemini CLI's BLOCKED_EXECUTION_ENVS):
 * without it the app's own binary starts as a second OpenClaude Desktop, window and all. Unchanged on Windows.
 */
export function withRunAsNodeInCommand(entry, platform = process.platform) {
  if (!entry?.env?.ELECTRON_RUN_AS_NODE || platform === 'win32') return entry
  const { ELECTRON_RUN_AS_NODE: value, ...env } = entry.env
  return { ...entry, command: '/usr/bin/env', args: [`ELECTRON_RUN_AS_NODE=${value}`, entry.command, ...entry.args], env }
}

/**
 * The server for one session as an agent's own config declares it ({name, command, args, env} with env an object),
 * for an agent whose ACP mcpServers can't carry what the server needs (adapter.appToolsInLaunch: MiniMax's tool-call
 * timeout lives only in its mcp.json). The env holds the session's own credential, never the channel's secret.
 */
export function appToolsLaunchEntry(server, session) {
  if (!server || typeof session !== 'string' || !session) return null
  const env = { ...server.env, CODE_DESKTOP_AGENT_TOOLS_TOKEN: sessionToken(server.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN, session), CODE_DESKTOP_AGENT_SESSION: session }
  return { name: server.name, command: server.command, args: [...server.args], env }
}
