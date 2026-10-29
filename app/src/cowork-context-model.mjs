// w13-coworkui-context: the data the 3.6556.2 Context section (c21f11e6d TT, generated as CoworkContextSection in
// src/generated/cowork-context) reads, derived from this host's Cowork session the way the official session activity
// panel AT derives it (readable c21f11e6d :11655-12292) from the resource activity ccba96ec3 builds out of the
// conversation's tool_use blocks (readable ccba96ec3 :1395-1720). Pure: plain node imports it (no React, no i18n).
//
// Official → host:
//   resourceActivity (W)        events, one per tool call, in ccba96ec3's shapes:
//     mcp_tool       an MCP tool call on an external server (mcpToolCall / an MCP-named dynamicToolCall). This host's
//                    own server (code_desktop: app tools, the Chrome bridge, computer use) and the visualize server are
//                    skipped, as ccba96ec3 skips its internal servers (`ge(u.server.name) || re(u.server.name)`).
//                    Local servers have no claude.ai uuid, so the server name stands in (as ccba96ec3's fallback
//                    branches do: `mcpServerUuid: y`, `mcpServer: { name, uuid, iconType: "external" }`).
//     skill_invoked  the Skill tool (dynamicToolCall skill): `skill://${name}`, fileName without the plugin prefix,
//                    pluginName for `plugin:skill` (F / N / xe).
//     web_search     a webSearch search ({ searchQuery, searchResults }); web_fetch an openPage ({ host }, the field
//                    c21f11e6d Wx reads as fetchedHost).
//     memory         a read (commandExecution read action) or a file change of a path under one of shared-6 nw's
//                    memory folders, except their MEMORY.md / CLAUDE.md index files (iw).
//   Plain file reads and writes are not Context activity: shared-130 oU classifies every path outside the Cowork VM's
//   special folders as "working", which AT's filter (mr) keeps out of Context (they belong to Outputs / Scratchpad).
//   contextResourceActivity (_r = mr)  the events AT keeps for Context: not device_commit / project_file (uT); the
//                    operations of lT always; anything else only outside the selected folders and outside the
//                    "working" / "internal" categories (never true for a local path, see above); minus documents-plugin
//                    skills (xw, bw) and the documents MCP server.
//   hasContextActivity (ni)    groupContextByKind is false in 3.6556.2, so `_r.length > 0`.
//   hasContextCardContent (oi) `$r || ti || ni || ri || ii || ai`: mounted projects ($r), remote sources (ti), lead
//                    rows (ri), grouped uploads (ii) and the browser row (ai) are all absent here, so it is ni.
//   isRemote / mountedProjects / contextLeadRows / contextUploads / contextSources / coworkBrowserEnabled: a local
//                    session without them (the generated adapters answer those branches).
export const CONTEXT_OPERATIONS = Object.freeze(["mcp_tool", "cli_tool", "web_search", "web_fetch", "skill_invoked", "command_invoked", "memory"]); // lT
export const NON_RESOURCE_OPERATIONS = Object.freeze(["device_commit", "project_file"]); // uT
// shared-6 nw (memory folders) and bw (documents plugins), verbatim.
const MEMORY_FOLDERS = [/\/mnt\/\.auto-memory(\/|$)/, /^\/mnt\/memory(\/|$)/, /^\/tmp\/claude\/memory(\/|$)/, /\/\.claude\/agent-memory(?:-local)?(\/|$)/,
  /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(memory|spaces\/[^/]+\/memory|agent\/memory)(\/|$)/];
const DOCUMENT_PLUGINS = new Set(["documents", "documents-mcp", "clarkdown", "clarkdown-mcp"]);
const DOCUMENTS_SERVER = "plugin:documents:Documents";
const OWN_SERVERS = new Set(["code_desktop", "visualize", "computer-use"]);
const lt = new Set(CONTEXT_OPERATIONS);
const ut = new Set(NON_RESOURCE_OPERATIONS);

const str = (value) => (typeof value === "string" ? value : "");
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const slash = (value) => String(value).replace(/\\/g, "/");
const trimEnd = (value) => slash(value).replace(/\/+$/, "");
const baseName = (value) => trimEnd(value).split("/").pop() ?? "";
const argsOf = (item) => {
  let value = item?.arguments ?? item?.input;
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { value = null; } }
  return record(value) ? value : {};
};
function absolute(filePath, cwd) {
  const value = slash(filePath).replace(/^\.\//, "");
  if (value.startsWith("/") || /^[a-zA-Z]:\//.test(value) || !cwd) return value;
  return `${trimEnd(cwd)}/${value}`;
}
const timestampOf = (item) => {
  for (const key of ["completedAt", "updatedAt", "createdAt", "startedAt", "timestamp"]) {
    const value = item?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return Date.parse(value);
  }
  return undefined;
};

/** shared-6 iw: a memory file (inside a memory folder, not its MEMORY.md / CLAUDE.md index). */
export function isMemoryPath(filePath) {
  const path = slash(filePath);
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  if (name === "memory.md" || name === "claude.md") return false;
  return MEMORY_FOLDERS.some((pattern) => pattern.test(path));
}

/** The MCP server and tool of an engine item, or null (an MCP call by its server field or its mcp__server__tool name). */
export function mcpCallOfItem(item) {
  if (item?.type !== "mcpToolCall" && item?.type !== "dynamicToolCall") return null;
  const server = str(item.server) || str(item.namespace);
  const tool = str(item.tool) || str(item.name);
  if (!tool) return null;
  if (server) {
    const name = server.startsWith("mcp__") ? server.slice(5) : server;
    if (item.type === "dynamicToolCall" && name !== "code_desktop") return null;
    return name ? { server: name, tool } : null;
  }
  const named = /^mcp__(.+?)__(.+)$/.exec(tool);
  return named ? { server: named[1], tool: named[2] } : null;
}
const mcpResult = (item) => {
  if (item.status === "inProgress" || item.status === "in_progress") return undefined;
  const failed = item.status === "failed" || item.status === "error" || !!item.error;
  const content = item.result?.content ?? item.result ?? item.error;
  return { isError: failed, content: Array.isArray(content) ? content : content === undefined || content === null ? [] : [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content) }] };
};

/** Context resource events of a Cowork session's items, oldest first (ccba96ec3's shapes; see the header). */
export function coworkContextEvents(items = [], { cwd } = {}) {
  const events = [];
  for (const item of items ?? []) {
    if (!record(item)) continue;
    const id = str(item.id) || `item-${events.length}`;
    const timestamp = timestampOf(item);
    const mcp = mcpCallOfItem(item);
    if (mcp) {
      if (OWN_SERVERS.has(mcp.server)) continue;
      events.push({
        id, filePath: `mcp://${mcp.server}/${mcp.tool}`, fileName: mcp.tool, operation: "mcp_tool", timestamp,
        mcpServerUuid: mcp.server, mcpToolName: mcp.tool, mcpToolWireName: `mcp__${mcp.server}__${mcp.tool}`, mcpToolDisplayName: mcp.tool,
        mcpServer: { name: mcp.server, uuid: mcp.server, iconType: "external" },
        mcpToolInput: argsOf(item), mcpToolResult: mcpResult(item), openWith: { via: "none" },
      });
      continue;
    }
    if (item.type === "dynamicToolCall" && /^skill$/i.test(str(item.tool))) {
      const args = argsOf(item);
      const skill = (str(args.name) || str(args.skill)).replace(/^\//, "").trim();
      if (!skill) continue;
      const at = skill.indexOf(":");
      events.push({
        id, filePath: `skill://${skill}`, fileName: at === -1 ? skill : skill.slice(at + 1), operation: "skill_invoked", skillName: skill,
        pluginName: at === -1 ? undefined : skill.slice(0, at), timestamp, openWith: { via: "none" },
      });
      continue;
    }
    if (item.type === "webSearch" || (item.type === "dynamicToolCall" && /^web_(search|fetch)$/.test(str(item.tool)))) {
      const args = argsOf(item);
      const url = item.type === "webSearch" ? (item.action?.type === "openPage" ? str(item.action.url) : "") : item.tool === "web_fetch" ? str(args.url) : "";
      if (url) {
        let host = "";
        try { host = new URL(url).host; } catch { host = url; }
        events.push({ id, filePath: `web_fetch://${id}`, fileName: host || url, operation: "web_fetch", timestamp, host, openWith: { via: "none" } });
      } else {
        const queries = Array.isArray(args.queries) ? args.queries.filter((q) => typeof q === "string") : [];
        const query = str(item.action?.query) || str(item.query) || str(args.query) || queries.join(", ");
        events.push({ id, filePath: `web_search://${id}`, fileName: query || "Web search", operation: "web_search", timestamp, searchQuery: query, searchResults: [], openWith: { via: "none" } });
      }
      continue;
    }
    if (item.type === "commandExecution" && item.commandActions?.length === 1 && item.commandActions[0]?.type === "read") {
      const filePath = absolute(str(item.commandActions[0].path) || str(item.commandActions[0].name), cwd);
      if (filePath && isMemoryPath(filePath))
        events.push({ id, filePath, fileName: baseName(filePath), timestamp, openWith: { via: "path" }, operation: "memory", fileOperation: "read" });
      continue;
    }
    if (item.type === "fileChange" && item.status === "completed")
      for (const change of item.changes ?? []) {
        const filePath = change?.path ? absolute(change.path, cwd) : "";
        if (!filePath || !isMemoryPath(filePath)) continue;
        const kind = typeof change.kind === "string" ? change.kind : change.kind?.type;
        events.push({ id: `${id}:${filePath}`, filePath, fileName: baseName(filePath), timestamp, openWith: { via: "path" }, operation: "memory", fileOperation: kind === "add" ? "write" : "edit" });
      }
  }
  return events;
}

// shared-130 oU / _H for this host: none of its paths are under the Cowork VM's outputs / uploads / skills mounts.
const pathCategory = () => "working";
const insideFolder = (filePath, folders) => (folders ?? []).some((folder) => slash(filePath).startsWith(`${trimEnd(folder)}/`));

/** AT mr: the events the Context section lists. Local paths are always the "working" category (shared-130 oU). */
export function isContextEvent(event, folders) {
  if (ut.has(event.operation)) return false;
  if (event.operation === "skill_invoked" && event.pluginName !== undefined && DOCUMENT_PLUGINS.has(event.pluginName.toLowerCase())) return false; // xw
  if (event.operation === "mcp_tool" && event.mcpServerUuid === DOCUMENTS_SERVER) return false;
  if (lt.has(event.operation)) return true;
  // The rest are file events: kept only outside the selected folders and outside the "working" / "internal" categories;
  // shared-130 oU puts every path outside the Cowork VM's special folders in "working", so a local file never qualifies.
  return !insideFolder(event.filePath, folders) && pathCategory(event.filePath) !== "working" && pathCategory(event.filePath) !== "internal";
}

/** The data props of CoworkContextSection for one session (with the panel's own state props added by the host). */
export function coworkContextData({ items = [], cwd, sessionId } = {}) {
  const folders = typeof cwd === "string" && cwd.trim() ? [cwd] : [];
  const resourceActivity = coworkContextEvents(items, { cwd });
  const contextResourceActivity = resourceActivity.filter((event) => isContextEvent(event, folders));
  const hasContextActivity = contextResourceActivity.length > 0;
  return {
    sessionId,
    groupContextByKind: false,
    isRemote: false,
    mountedProjects: [],
    hasContextActivity,
    browserRowInContext: false,
    hasContextUploads: false,
    contextUploads: [],
    coworkBrowserEnabled: false,
    contextResourceActivity,
    contextLeadRows: undefined,
    persistedUserSelectedFolders: undefined,
    contextSources: [],
    userSelectedFolders: folders,
    hasContextCardContent: hasContextActivity,
  };
}
