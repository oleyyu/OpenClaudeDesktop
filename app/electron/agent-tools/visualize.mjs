// R4g-mcp MA-2: the built-in visualize tools (show_widget, read_me) of Claude Desktop 2.42304.0, served to every core
// through OpenClaude Desktop's own MCP server. Official: main index.chunk-BaLvO2wi.js `A` (getImagineServerDef) builds
// the "visualize" server from the tool array `b` and the handler `S`; index.chunk-D89SZXs4.js gates it with GrowthBook
// 3444158716 (`l()`), which the host turns on by product decision D35. The definitions, the read_me text and the widget
// template come unchanged from electron/generated/visualize/imagine-server.cjs (scripts/extract-visualize.mjs), bound
// through electron/visualize-adapters.cjs (org policy / HIPAA refusal never applies on the host, D17).
//
// The switch is this module's group "visualize" (main.cjs agentToolGroupEnabled: on unless config.agentVisualize is
// false): the host lists and calls these tools only while it is on, which is the official server's isEnabled().
// The widget itself is drawn by the transcript (MA-6/MA-7) from ui://imagine/show-widget.html (MA-4 reads it from
// `serverDef.handleReadResource`); tools/call here only returns the official result text.
import adapters from "../visualize-adapters.cjs";

export const group = "visualize";

/** The official server, bound with the host's gates (enabled: the agent-tools group decides before any call). */
export const imagineServer = adapters.createVisualizeServer({ enabled: () => true });
/** getImagineServerDef(): {serverName:"visualize", tools, handleToolCall, handleReadResource, handleListResources, isEnabled}. */
export const serverDef = imagineServer.getImagineServerDef();

// The official tool array `b` carries annotations ({readOnlyHint:true}) that `A` leaves out of the server definition; the
// host passes them on so a core that asks before calling MCP tools sees both tools as read-only.
const annotationsOf = (name) => adapters.IMAGINE_TOOLS.find((tool) => tool.name === name)?.annotations;

export const tools = serverDef.tools.map((definition) => {
  const annotations = annotationsOf(definition.name);
  return {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    ...(annotations && typeof annotations === "object" ? { annotations } : {}),
    // Kept from the official definition for MA-4/MA-7 (agent-tools-host.cjs lists name/title/description/inputSchema/annotations only).
    _meta: definition._meta,
    alwaysLoad: definition.alwaysLoad,
    maxResultSizeChars: definition.maxResultSizeChars,
    handler: async (args = {}) => serverDef.handleToolCall(definition.name, args && typeof args === "object" ? args : {}),
  };
});
