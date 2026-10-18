// R4g-mcp MA-7: the transcript side of the MCP App / Visualize widget card (src/generated/mcp-app-card, MA-6). Pure helpers
// that turn the host's transcript items into what the 2.42304.0 originals read, and the host's MCP App server listing (MA-4
// mcp-app:servers) into the session server state the card's adapters keep.
//
// Official 2.42304.0 (v1/c96d752d0-BOCqU7c2.js):
//   KBe(e,t)  a tool whose kind is not special (YV null) is `t.isMcpAppTool?.(e.name) ? "mcp_app"`; UV.mcp_app is
//             {rollUp:"stands-alone"}, so the call is its own row and never a tool group member ($V → "standalone").
//   m2e       a solo row in an owned session: `a && r?.(e.tools[0].name)` → b(VX,{tool,sessionRef,onPrefillComposer}).
//   e0        a row inside a group: `o && r?.(d.name)` → b(VX,{tool:d,sessionRef:i,onPrefillComposer:a,fallback:_}).
//   cm        (cef1e6037 lt) isMcpAppTool: the MCP-named tools (shared-1 ZN) whose server has a ui:// tool resource
//             (shared-1 pP → dP), as a cached name set (ut).
// The tool shape VX reads (kQe / PQe / cef1e6037 pt, ft, c7407a74b gS): {id, name, status: "running" |
// "awaiting_approval" | "completed" | "error", input, rawResultContent?, toolUseResult?, isError, output?,
// interrupted?, rejected?, startedAt?}.
//
// Host mapping. A core reports an MCP call as an mcpToolCall {server, tool, arguments, status, result, error} (Codex, the
// DeepSeek core, ACP bridges); OpenClaude Desktop's own tools come from its "code_desktop" server, or prefixed
// "code_desktop_" (OpenCode). The official tool name is mcp__<server segment>__<tool> with the segment cleaned by the
// official shared-156 pb. The built-in visualize tools are served under code_desktop (agent-tools/visualize.mjs, MA-2),
// not under the official separate "visualize" server, so code_desktop show_widget / read_me read as the official
// mcp__visualize__show_widget / read_me (X1 G8).
import { lf as mcpServerSegment } from './generated/mcp-app-card/tool-names.mjs';

export const MCP_APP_ROW = 'mcp_app';
export const OWN_SERVER = 'code_desktop'; // electron/agent-tools-host.cjs SERVER_NAME
export const VISUALIZE_SERVER_NAME = 'visualize'; // main BaLvO2wi serverName
export const VISUALIZE_SERVER_UUID = '6f616b42-0ed8-571e-823f-ee4aca6b7ce9'; // shared-78 KD
export const VISUALIZE_TOOLS = Object.freeze(['show_widget', 'read_me']);

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const str = value => (typeof value === 'string' ? value : '');
const RUNNING = new Set(['inProgress', 'running']); // command-row-model RUNNING_STATUSES
const STOPPED = new Set(['interrupted', 'cancelled', 'canceled', 'stopped']);
const REFUSED = new Set(['declined', 'denied']);

/** {server, tool} of an MCP call item (the server as the core named it), or null for anything else. */
export function mcpCallOf(item) {
  if (!item || (item.type !== 'mcpToolCall' && item.type !== 'dynamicToolCall')) return null;
  const server = str(item.server) || str(item.namespace);
  const tool = str(item.tool) || str(item.name);
  if (!tool) return null;
  if (server) {
    const name = server.startsWith('mcp__') ? server.slice(5) : server;
    // A dynamic tool's namespace is not an MCP server, except OpenClaude Desktop's own.
    if (item.type === 'dynamicToolCall' && name !== OWN_SERVER) return null;
    return name ? { server: name, tool } : null;
  }
  if (tool.startsWith(`${OWN_SERVER}_`)) return { server: OWN_SERVER, tool: tool.slice(OWN_SERVER.length + 1) };
  const named = /^mcp__(.+?)__(.+)$/.exec(tool);
  return named ? { server: named[1], tool: named[2] } : null;
}

/** The official tool name of an MCP call item (mcp__<segment>__<tool>; the built-in visualize under its own name), or null. */
export function officialToolName(item) {
  const call = mcpCallOf(item);
  if (!call) return null;
  if (call.server === OWN_SERVER && VISUALIZE_TOOLS.includes(call.tool)) return `mcp__${VISUALIZE_SERVER_NAME}__${call.tool}`;
  return `mcp__${mcpServerSegment(call.server)}__${call.tool}`;
}

/** The official server segment of an MCP server name (shared-156 pb, as in mcp__<segment>__<tool>). */
export function mcpServerSegmentOf(server) {
  return mcpServerSegment(server);
}

/** KBe for the host's items: "mcp_app" when the call's tool is an MCP App tool of the session, else null. */
export function mcpAppRowKind(item, isMcpAppTool) {
  if (typeof isMcpAppTool !== 'function') return null;
  const name = officialToolName(item);
  return name !== null && isMcpAppTool(name) === true ? MCP_APP_ROW : null;
}

/**
 * UV.mcp_app {rollUp:"stands-alone"}: the transcript's tool grouping (file-tool-model groupFileTools) runs between the
 * MCP App rows, so a widget call closes the run before it and is never folded into a group, as a stands-alone kind.
 */
export function groupAroundMcpAppRows(group, items, isMcpAppItem, ...groupArgs) {
  if (!Array.isArray(items) || typeof isMcpAppItem !== 'function' || !items.some(item => isMcpAppItem(item))) return group(items, ...groupArgs);
  const rows = [];
  let run = [];
  for (const item of items) {
    if (!isMcpAppItem(item)) { run.push(item); continue; }
    if (run.length) rows.push(...group(run, ...groupArgs));
    run = [];
    rows.push(item);
  }
  if (run.length) rows.push(...group(run, ...groupArgs));
  return rows;
}

function parsedArguments(value) {
  if (record(value)) return value;
  if (typeof value === 'string' && value.trim()) { try { const parsed = JSON.parse(value); if (record(parsed)) return parsed; } catch {} }
  return {};
}
// A dynamic tool's contentItems as MCP content: inputText → text, a data: inputImage → image.
function dynamicContent(items) {
  return items.flatMap(entry => {
    if (entry?.type === 'inputText' && typeof entry.text === 'string') return [{ type: 'text', text: entry.text }];
    const url = str(entry?.imageUrl);
    const data = /^data:([^;,]+);base64,(.*)$/s.exec(url);
    return entry?.type === 'inputImage' && data ? [{ type: 'image', mimeType: data[1], data: data[2] }] : [];
  });
}
function errorText(item) {
  if (typeof item.error === 'string') return item.error;
  if (record(item.error) && typeof item.error.message === 'string') return item.error.message;
  return undefined;
}

const shapes = new WeakMap();
/**
 * The official tool VX reads for a host MCP call item: status from the item's lifecycle (a call waiting on the user's
 * approval is "awaiting_approval"), input from its arguments, toolUseResult from its MCP result {content,
 * structuredContent, _meta} (pt passes structuredContent and _meta to the widget), output from its error. The same
 * object for the same item and approval state, so the memoized card does not re-render for nothing.
 */
export function toMcpAppTool(item, { awaitingApproval = false } = {}) {
  const name = officialToolName(item);
  if (name === null) return null;
  const key = awaitingApproval ? 'awaiting' : 'settled';
  const cached = shapes.get(item)?.[key];
  if (cached) return cached;
  const status = str(item.status);
  const running = RUNNING.has(status), failed = status === 'failed' || item.success === false;
  const stopped = STOPPED.has(status), refused = REFUSED.has(status);
  const output = errorText(item);
  let toolUseResult;
  if (record(item.result) && (Array.isArray(item.result.content) || typeof item.result.content === 'string')) toolUseResult = item.result;
  else if (Array.isArray(item.result)) toolUseResult = item.result;
  else if (Array.isArray(item.contentItems)) toolUseResult = { content: dynamicContent(item.contentItems) };
  const tool = Object.freeze({
    id: str(item.id),
    name,
    status: running ? (awaitingApproval ? 'awaiting_approval' : 'running') : failed || stopped || refused ? 'error' : 'completed',
    input: parsedArguments(item.arguments),
    ...(toolUseResult !== undefined ? { toolUseResult } : {}),
    isError: failed || refused,
    ...(output !== undefined ? { output } : {}),
    ...(stopped ? { interrupted: true } : {}),
    ...(refused ? { rejected: true } : {}),
  });
  shapes.set(item, { ...shapes.get(item), [key]: tool });
  return tool;
}

/**
 * The session server state for the card's adapters (mcpAppCardHost.setSessionServers) from MA-4's mcp-app:servers
 * reply {servers, core}. The built-in visualize server keeps its official uuid (shared-78 KD) and is not the session's
 * own; a server the running core connects is the official CLI-owned kind (sessionOwned, so the widget's sandbox origin
 * is per session, cef1e6037 zt), identified by its name, which is what MA-4 reads it by.
 */
export function sessionMcpAppServers(reply) {
  const list = Array.isArray(reply?.servers) ? reply.servers : [];
  const seen = new Set();
  return list.flatMap(server => {
    const name = str(server?.name);
    if (!name || seen.has(name)) return [];
    seen.add(name);
    const tools = Array.isArray(server.tools) ? server.tools.filter(tool => record(tool) && typeof tool.name === 'string') : [];
    if (server.isBuiltIn === true)
      return [Object.freeze({ uuid: str(server.uuid) || VISUALIZE_SERVER_UUID, name, type: 'local', isBuiltIn: true, sessionOwned: false, tools })];
    return [Object.freeze({ uuid: name, name, type: 'local', isBuiltIn: false, sessionOwned: true, tools, ...(typeof server.status === 'string' ? { status: server.status } : {}) })];
  });
}

/** Whether the running core can serve third-party MCP Apps (MA-4 core {supported, unavailable?, reason?}). */
export function coreServesMcpApps(reply) {
  return reply?.core?.supported === true && reply.core.unavailable === undefined;
}

/** The pending tool permission requests kQe waits on ({[itemId]: {status:"pending", toolName}}) for a session's items. */
export function pendingMcpAppRequests(items, pendingItemIds) {
  const requests = {};
  if (!Array.isArray(items) || !pendingItemIds?.size) return requests;
  for (const item of items) {
    if (!pendingItemIds.has(item?.id)) continue;
    const name = officialToolName(item);
    if (name !== null) requests[item.id] = { status: 'pending', toolName: name };
  }
  return requests;
}
