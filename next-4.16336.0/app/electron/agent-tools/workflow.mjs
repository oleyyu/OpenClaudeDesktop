// OpenClaude Desktop's Workflow tool (Claude Code 2.1.280's Workflow, alias RunWorkflow), served by agent-tools-host.cjs over
// the app's local MCP server to every core whose dynamic workflows run on OpenClaude Desktop's engine (Settings › Code ›
// Dynamic workflows › Workflow engine). The work happens in the main process: ctx.workflows is
// workflow-tool-service.cjs bound to the calling session. Workflow agents never see this tool (the runner's core gets
// no agent-tools server: one nesting level).
//
// group "workflow": main.cjs lists it only while Dynamic workflows is on and the running core uses OpenClaude Desktop's
// engine. The description follows the size guideline, so it is read at each tools/list (setDescriptionSource).
import { WORKFLOW_TOOL, WORKFLOW_INPUT_SCHEMA, WORKFLOW_STOP_TOOL, WORKFLOW_STOP_DESCRIPTION, WORKFLOW_STOP_INPUT_SCHEMA, workflowToolDescription } from "../workflow-tool-model.mjs";

export const group = "workflow";
let describe = () => workflowToolDescription();
/** main.cjs: the description for the current settings ({sizeGuideline, sizeIsDefault, nameOnly}). */
export function setDescriptionSource(source) { describe = typeof source === "function" ? () => workflowToolDescription(source() ?? {}) : () => workflowToolDescription(); }

export const tools = [
  {
    name: WORKFLOW_TOOL,
    title: "Workflow",
    // Workflows are one level deep, as in Claude Code: a sub-agent's call is refused (agent-tools-host.cjs).
    mainOnly: true,
    get description() { return describe(); },
    inputSchema: WORKFLOW_INPUT_SCHEMA,
    annotations: { title: "Run a dynamic workflow", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async handler(args, ctx) {
      if (!ctx?.workflows || typeof ctx.workflows.launch !== "function") throw new Error("Dynamic workflows aren’t available in this session.");
      return { content: [{ type: "text", text: await ctx.workflows.launch(args) }] };
    },
  },
  {
    name: WORKFLOW_STOP_TOOL,
    title: "Stop workflow",
    mainOnly: true,
    description: WORKFLOW_STOP_DESCRIPTION,
    inputSchema: WORKFLOW_STOP_INPUT_SCHEMA,
    annotations: { title: "Stop a dynamic workflow", readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async handler(args, ctx) {
      if (!ctx?.workflows || typeof ctx.workflows.stop !== "function") throw new Error("Dynamic workflows aren’t available in this session.");
      return { content: [{ type: "text", text: await ctx.workflows.stop(args) }] };
    },
  },
];
