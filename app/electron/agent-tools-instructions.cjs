// The code_desktop MCP server's instructions (agent-tools-server.mjs sends them in its initialize reply). The
// verification workflow is Claude Desktop's auto-verify (2.2553.1 <preview_tools> <verification_workflow>, on while
// .claude/launch.json leaves top-level "autoVerify" unset or true), in OpenClaude Desktop's tool names; the Preview pane's
// Servers & settings › Enable / Disable auto verify writes that key.
//
// Not every core hands an MCP server's instructions to its model (ZCode's MCP adapter drops them), so the agent-tools
// host also puts the text in the server definition it gives bridges (CODE_DESKTOP_AGENT_TOOLS_SERVER "instructions"),
// and such a bridge adds it to the instructions it already sends.
"use strict";

const INSTRUCTIONS = [
  "Tools provided by OpenClaude Desktop, the app this session runs in. They act on this session only.",
  "",
  // How to start multi-agent work and reach the tools that aren't listed yet. Without it a model on a core that defers
  // tool groups (DeepSeek Harness, OpenCode, MiMo) meets Workflow only as one line of load_tools' description among
  // ~70 tools, and nothing says which of its tools delegates. Worded for every core: each names its tools differently.
  "Starting multi-agent work and finding tools:",
  "- Sub-agents: to delegate a self-contained task (research, a scoped change, a review) or to run independent tasks in parallel, call your own sub-agent tool: the one in your tool list named subagent, Task, Agent or spawn_agent. Start independent ones together in one message. When the user asks for sub-agents, delegation or parallel work, do it with that tool rather than doing everything yourself.",
  "- Workflows: when the user asks for a workflow or multi-agent orchestration, or writes \"ultracode\", call the Workflow tool. If Workflow isn't in your tool list, first call load_tools with {\"groups\": [\"workflow\"]}; Workflow is available from your next step. If Workflow isn't listed and load_tools offers no workflow group, dynamic workflows are turned off in Settings: say so instead of imitating one by hand.",
  "- More tools: load_tools' description lists the tool groups that aren't loaded yet (background monitors, scheduled prompts, the user's Chrome, notebooks, window layout). When a task needs one, load its group before saying a tool doesn't exist.",
  "",
  "Verifying changes in the preview: when this session's folder has a .claude/launch.json whose top-level \"autoVerify\" is not false, and the preview tools are available, then after you edit code that changes what a running app shows or does, check the change before you finish your response:",
  "1. Make sure a dev server runs (preview_start with the configuration's name; preview_list shows what runs).",
  "2. Reload or open the changed page (navigate).",
  "3. Look for errors: read_console_messages, read_network_requests, and preview_logs for the server's output.",
  "4. Check the result: read_page or get_page_text for content and structure, preview_inspect for styles and layout, click/type/press to try an interaction, resize_window for other sizes or a color scheme.",
  "5. Share proof: if you can see images, take a screenshot of the changed state; if you can't, rely on read_page, get_page_text and preview_inspect, and never claim you saw a screenshot. Say briefly what you verified. If something is broken, fix it and check again.",
  "Skip this for changes nothing in the app shows (tests, docs, tooling), or when the user asks you not to.",
  "",
  // devtools-mcp/: the chrome-devtools server every core gets next to this one, on the same preview tabs.
  "Deeper debugging in the preview: keep using the preview tools above (navigate, click, read_page, screenshot…) for everyday work on a page. When you need more than they show — a performance trace, a network response body, an error's stack mapped through source maps, memory — use the chrome-devtools MCP server's tools if they are in your tool list: they see the same preview tabs (only those), not a separate Chrome. Call its list_pages first and select_page the tab you mean before its other tools; it can't open outside sites the preview hasn't been allowed to open (use navigate for that).",
].join("\n");

module.exports = { INSTRUCTIONS };
