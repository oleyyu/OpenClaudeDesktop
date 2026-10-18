// The host's engine items as the SDK tool calls the 2.42304.0 Code transcript reads (c06cf64bb Ps / qc / Bc: one tool
// object per tool_use, its status, output and flags filled from the tool_result). The original rows
// (generated/transcript-rows: c96d752d0 v2e / e0 / JIe, c52b02f3f fn, c24951e9f, cd57a9664) dispatch on the SDK tool
// name and read its input, so the host converts once, here, and every core's tools land on the official names.
// Pure: no React, no i18n.
//
// The tool object (the fields the rows read):
//   id, name, input           the tool_use (name: an official SDK tool name, see SDK_TOOL_TABLE)
//   status                    "running" | "awaiting_approval" | "completed" | "error"
//   isError, output           the tool_result (output: its text)
//   outputImages              [{mimeType, data}] (Zc: the result's image blocks)
//   interrupted / rejected / policyDenied   Bc's flags (a stopped call, a call the user declined)
//   toolUseResult             the CLI's structured result: Write {type, filePath, content}, Edit {filePath, oldString,
//                             newString, structuredPatch} (c254f7f8c A reads the sidecar diff counts from it)
//   startedAt                 ms
//   hostItem                  the engine item (not read by the originals; the host adapters render its body)
import { changeKind, changePath, fileAction } from "./file-tool-model.mjs";
import { computerUseAction } from "./computer-use-model.mjs";
import { mcpCallOf, mcpServerSegmentOf, VISUALIZE_SERVER_NAME, VISUALIZE_TOOLS } from "./mcp-app-model.mjs";

const str = (value) => (typeof value === "string" ? value : "");
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const args = (item) => {
  let value = item?.arguments ?? item?.input;
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { value = null; } }
  return record(value) ? value : {};
};

/** The host's own MCP server (electron/agent-tools-host.cjs), which every core runs. */
export const APP_SERVER = "code_desktop";

/**
 * Official SDK tool names, by where they come from. Each entry is the documentation of one mapping; sdkToolName applies
 * them (tests/transcript-sdk-tools.test.mjs pins every row).
 *
 * Engine item types (Codex protocol, which every bridge projects to):
 *   commandExecution             Bash; one read action Read, one search action Grep (Glob when the bridge says it ran a
 *                                glob), one listFiles action LS
 *   fileChange                   one tool per change: add → Write, update / delete → Edit (Claude Code has no delete
 *                                tool; the removed lines are the edit)
 *   webSearch                    search → WebSearch, openPage / findInPage → WebFetch
 *   mcpToolCall                  mcp__<server segment>__<tool> (the segment cleaned as shared-156 pb does, mcp-app-model);
 *                                the host's own server's tools under the names Claude Desktop gives them (APP_TOOLS),
 *                                its visualize tools as mcp__visualize__show_widget / read_me
 *   collabAgentToolCall          spawnAgent → Task, sendInput → SendMessage, wait → TaskOutput, closeAgent → TaskStop
 *   imageView                    Read (the CLI reads images with Read)
 *   computerUse                  mcp__computer-use__<action>
 *   imageGeneration / sleep      no SDK counterpart: their host names (the original rows' generic fallback)
 * dynamicToolCall (namespace null): the core's own tool name, normalised by DYNAMIC_TOOLS; an app tool by APP_TOOLS;
 * anything else keeps its name.
 */
export const DYNAMIC_TOOLS = Object.freeze({
  // DeepSeek Harness (codex-app-server) and the renamed OpenCode / ACP tools
  todo_write: "TodoWrite", todowrite: "TodoWrite", TodoWrite: "TodoWrite",
  skill: "Skill", Skill: "Skill",
  exit_plan_mode: "ExitPlanMode", plan_exit: "ExitPlanMode", ExitPlanMode: "ExitPlanMode",
  enter_plan_mode: "EnterPlanMode", EnterPlanMode: "EnterPlanMode",
  ask_user_question: "AskUserQuestion", question: "AskUserQuestion", AskUserQuestion: "AskUserQuestion",
  job_output: "TaskOutput", TaskOutput: "TaskOutput", BashOutput: "TaskOutput",
  job_list: "TaskList", TaskList: "TaskList",
  job_kill: "TaskStop", TaskStop: "TaskStop", KillShell: "TaskStop",
  run_code: "Bash", Bash: "Bash",
  read_file: "Read", Read: "Read", write_file: "Write", Write: "Write", edit_file: "Edit", Edit: "Edit", MultiEdit: "MultiEdit",
  NotebookEdit: "NotebookEdit", grep: "Grep", Grep: "Grep", glob: "Glob", Glob: "Glob", list_directory: "LS", LS: "LS",
  web_fetch: "WebFetch", webfetch: "WebFetch", WebFetch: "WebFetch", web_search: "WebSearch", websearch: "WebSearch", WebSearch: "WebSearch",
  task: "Task", Task: "Task", Agent: "Agent", SendMessage: "SendMessage",
  TaskCreate: "TaskCreate", TaskUpdate: "TaskUpdate", TaskGet: "TaskGet",
  EnterWorktree: "EnterWorktree", ExitWorktree: "ExitWorktree",
});
/**
 * The host's app tools (the code_desktop MCP server) under the names Claude Desktop gives the same tools: its built-in
 * CLI tools by their bare names, its ccd_* servers by theirs. A tool not listed stays mcp__code_desktop__<tool>.
 */
export const APP_TOOLS = Object.freeze({
  update_plan: "mcp__ccd_turn__update_plan", wrap_up: "mcp__ccd_turn__wrap_up",
  mark_chapter: "mcp__ccd_session__mark_chapter", spawn_task: "mcp__ccd_session__spawn_task", dismiss_task: "mcp__ccd_session__dismiss_task",
  list_sessions: "mcp__ccd_session_mgmt__list_sessions", get_session: "mcp__ccd_session_mgmt__get_session",
  list_events: "mcp__ccd_session_mgmt__list_events", set_session_title: "mcp__ccd_session_mgmt__set_session_title",
  reveal_path: "mcp__ccd_host__reveal_path", open_in_editor: "mcp__ccd_host__open_in_editor",
  run_in_terminal: "mcp__terminal__run_in_terminal", read_terminal: "mcp__terminal__read_terminal",
  list_terminal_tabs: "mcp__terminal__list_terminal_tabs", open_terminal_tab: "mcp__terminal__open_terminal_tab",
  stop_terminal_tab: "mcp__terminal__stop_terminal_tab",
  AskUserQuestion: "AskUserQuestion", PushNotification: "PushNotification", SendUserFile: "SendUserFile",
  ReportFindings: "ReportFindings", Monitor: "Monitor", MonitorStop: "TaskStop", CronCreate: "CronCreate", CronList: "CronList",
  CronDelete: "CronDelete", WebFetch: "WebFetch", NotebookEdit: "NotebookEdit", Workflow: "Workflow", WorkflowStop: "TaskStop",
});
const COLLAB_TOOLS = Object.freeze({ spawnAgent: "Task", sendInput: "SendMessage", sendMessage: "SendMessage", wait: "TaskOutput", closeAgent: "TaskStop", resumeAgent: "Task" });

/** The app tool an mcp / dynamic item calls (the tool name on the host's own server), or null. */
function appTool(item) {
  const server = str(item.server) || str(item.namespace);
  const tool = str(item.tool) || str(item.name);
  if (server === APP_SERVER || server === `mcp__${APP_SERVER}`) return tool;
  if (!server && tool.startsWith(`mcp__${APP_SERVER}__`)) return tool.slice(APP_SERVER.length + 7);
  if (!server && tool.startsWith(`${APP_SERVER}_`)) return tool.slice(APP_SERVER.length + 1);
  return null;
}

/** The official SDK tool name for an engine item (null for an item that is not a tool call). */
export function sdkToolName(item) {
  if (!record(item)) return null;
  const action = fileAction(item);
  if (action?.type === "read") return "Read";
  if (action?.type === "search") return /glob/i.test(str(action.tool)) ? "Glob" : "Grep";
  if (action?.type === "listFiles") return "LS";
  switch (item.type) {
    case "commandExecution": return "Bash";
    case "fileChange": return changeKind(item.changes?.[0] ?? {}) === "add" ? "Write" : "Edit";
    case "webSearch": return item.action?.type === "openPage" || item.action?.type === "findInPage" ? "WebFetch" : "WebSearch";
    case "imageView": return "Read";
    case "collabAgentToolCall": return COLLAB_TOOLS[str(item.tool)] ?? "Task";
    case "computerUse": return `mcp__computer-use__${str(computerUseAction(item)?.kind) || "computer"}`;
    case "imageGeneration": case "sleep": return item.type;
    case "mcpToolCall": case "dynamicToolCall": {
      const app = appTool(item);
      if (app !== null) {
        if (VISUALIZE_TOOLS.includes(app)) return `mcp__${VISUALIZE_SERVER_NAME}__${app}`;
        return APP_TOOLS[app] ?? `mcp__${APP_SERVER}__${app}`;
      }
      const call = mcpCallOf(item);
      if (call) return `mcp__${mcpServerSegmentOf(call.server)}__${call.tool}`;
      if (item.type === "mcpToolCall") return `mcp__server__${str(item.tool) || "tool"}`;
      // A dynamic tool (a core's own tool; its namespace, if any, is not an MCP server).
      const tool = str(item.tool) || str(item.name) || "tool";
      return Object.hasOwn(DYNAMIC_TOOLS, tool) ? DYNAMIC_TOOLS[tool] : tool;
    }
    default: return null;
  }
}

// A unified diff's hunks as the CLI's structuredPatch ({oldStart, oldLines, newStart, newLines, lines}) and the text
// either side had in them.
export function structuredPatch(diff) {
  const hunks = [];
  let hunk = null;
  for (const line of str(diff).split("\n")) {
    const head = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (head) {
      hunk = { oldStart: +head[1], oldLines: head[2] === undefined ? 1 : +head[2], newStart: +head[3], newLines: head[4] === undefined ? 1 : +head[4], lines: [] };
      hunks.push(hunk);
      continue;
    }
    if (!hunk || line.startsWith("--- ") || line.startsWith("+++ ")) continue;
    if (/^[ +\-\\]/.test(line)) hunk.lines.push(line);
  }
  const kept = hunks.filter((h) => h.lines.some((line) => !line.startsWith("\\")));
  const side = (keep) => kept.flatMap((h) => h.lines.filter((line) => line[0] === " " || line[0] === keep).map((line) => line.slice(1))).join("\n");
  return { hunks: kept, oldText: side("-"), newText: side("+") };
}
const plainLines = (text) => { const lines = str(text).split("\n"); if (lines.at(-1) === "") lines.pop(); return lines; };

function changeInput(change) {
  const path = changePath(change), kind = changeKind(change), diff = str(change.diff);
  const framed = /^(@@|--- )/m.test(diff);
  if (kind === "add") {
    const content = framed ? structuredPatch(diff).newText : diff;
    return { name: "Write", input: { file_path: path, content }, toolUseResult: { type: "create", filePath: path, content, structuredPatch: [] } };
  }
  if (!framed && kind === "delete") {
    const lines = plainLines(diff);
    const patch = lines.length ? [{ oldStart: 1, oldLines: lines.length, newStart: 0, newLines: 0, lines: lines.map((line) => `-${line}`) }] : [];
    return { name: "Edit", input: { file_path: path, old_string: lines.join("\n"), new_string: "" }, toolUseResult: { filePath: path, oldString: lines.join("\n"), newString: "", structuredPatch: patch } };
  }
  const { hunks, oldText, newText } = structuredPatch(diff);
  return { name: "Edit", input: { file_path: path, old_string: oldText, new_string: newText }, toolUseResult: { filePath: path, oldString: oldText, newString: newText, structuredPatch: hunks } };
}

const resultParts = (item) => (Array.isArray(item?.result?.content) ? item.result.content : Array.isArray(item?.contentItems) ? item.contentItems : []);
const DATA_URL = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
function outputImages(item) {
  const images = [];
  for (const part of resultParts(item)) {
    if (part?.type === "image" && typeof part.data === "string" && typeof part.mimeType === "string") images.push({ mimeType: part.mimeType, data: part.data });
    const url = part?.type === "inputImage" ? DATA_URL.exec(str(part.imageUrl)) : null;
    if (url) images.push({ mimeType: url[1], data: url[2] });
  }
  for (const value of Array.isArray(item?.outputImages) ? item.outputImages : []) {
    const url = DATA_URL.exec(str(value?.url ?? value));
    if (url) images.push({ mimeType: url[1], data: url[2] });
  }
  return images;
}
function outputText(item) {
  if (item.type === "commandExecution") return str(item.aggregatedOutput);
  if (item.type === "webSearch") {
    const results = item.results ?? item.result;
    if (typeof results === "string") return results;
    try { return results == null ? "" : JSON.stringify(results); } catch { return ""; }
  }
  const text = resultParts(item).filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n");
  return text || str(item.error?.message) || str(item.output);
}

const RUNNING = new Set(["inProgress", "running", "pending"]);
const STOPPED = new Set(["interrupted", "cancelled", "canceled", "stopped"]);
const DECLINED = new Set(["declined", "denied"]);
const failed = (item) => item.status === "failed" || item.result?.isError === true || !!item.error || item.success === false;

/** The SDK status (and Bc's flags) of an engine item. `awaiting`: an unresolved approval names it. */
export function sdkToolStatus(item, awaiting = false) {
  const status = str(item?.status);
  if (item?.type === "imageGeneration" && ["generating", "inProgress", "in_progress"].includes(status)) return { status: awaiting ? "awaiting_approval" : "running" };
  if (RUNNING.has(status)) return { status: awaiting ? "awaiting_approval" : "running" };
  if (STOPPED.has(status)) return { status: "error", isError: true, interrupted: true };
  if (DECLINED.has(status)) return { status: "error", isError: true, rejected: true };
  if (failed(item)) return { status: "error", isError: true };
  return { status: "completed", isError: false };
}

/** The input of an engine item's tool_use (fileChange: the first change; see sdkTools for the others). */
export function sdkToolInput(item) {
  if (!record(item)) return {};
  const action = fileAction(item);
  if (action?.type === "read") return { file_path: str(action.path) || str(action.name) };
  if (action?.type === "search") {
    const own = record(action.arguments) ? action.arguments : {};
    return { ...own, pattern: str(action.query) || str(own.pattern), ...(str(action.path) ? { path: action.path } : {}) };
  }
  if (action?.type === "listFiles") return { path: str(action.path) || str(item.cwd) };
  switch (item.type) {
    case "commandExecution": return { command: str(item.command), ...(str(item.description) ? { description: item.description } : {}) };
    case "fileChange": return item.changes?.length ? changeInput(item.changes[0]).input : {};
    case "webSearch": {
      const action = record(item.action) ? item.action : {};
      if (action.type === "openPage" || action.type === "findInPage") return { url: str(action.url), ...(str(action.pattern) ? { prompt: action.pattern } : {}) };
      return { query: str(item.query) || str(action.query) || (Array.isArray(action.queries) ? action.queries.filter((q) => typeof q === "string").join(", ") : "") };
    }
    case "imageView": return { file_path: str(item.path) };
    case "collabAgentToolCall": {
      const own = args(item);
      const description = str(item.description) || str(own.description) || str(item.prompt).split("\n")[0].slice(0, 80);
      return { ...own, description, prompt: str(item.prompt) || str(own.prompt), ...(str(item.model) ? { model: item.model } : {}),
        ...(item.receiverThreadIds?.[0] ? { to: item.receiverThreadIds[0] } : {}) };
    }
    case "dynamicToolCall": {
      const input = args(item);
      const name = sdkToolName(item);
      if (name === "Skill" && !str(input.skill) && str(input.name)) return { ...input, skill: input.name };
      if (name === "Bash" && !str(input.command)) return { ...input, command: str(input.code) || str(input.command) };
      return input;
    }
    default: return args(item);
  }
}

function base(item, { awaiting = false } = {}) {
  const flags = sdkToolStatus(item, awaiting);
  const output = flags.status === "running" || flags.status === "awaiting_approval" ? undefined : outputText(item);
  const images = outputImages(item);
  const started = Number.isFinite(item.startedAtMs) ? item.startedAtMs : undefined;
  return {
    ...flags,
    ...(output !== undefined ? { output } : {}),
    ...(images.length ? { outputImages: images } : {}),
    ...(item.type === "commandExecution" && output !== undefined ? { toolUseResult: { stdout: output, stderr: "", interrupted: !!flags.interrupted } } : {}),
    ...(started !== undefined ? { startedAt: started } : {}),
    ...(item.type === "mcpToolCall" && Array.isArray(item.result?.content) ? { rawResultContent: item.result.content } : {}),
  };
}

/**
 * The SDK tool objects for an engine item: one, except a fileChange with several changes (one Edit / Write per file,
 * the first keeps the item's id). null for an item that is not a tool call.
 */
export function sdkTools(item, options = {}) {
  const name = sdkToolName(item);
  if (name === null) return null;
  const common = base(item, options);
  if (item.type === "fileChange" && item.changes?.length) {
    return item.changes.map((change, index) => {
      const own = changeInput(change);
      const toolUseResult = common.status === "completed" ? own.toolUseResult : undefined;
      const { toolUseResult: _drop, ...rest } = common;
      return { ...rest, id: index ? `${item.id}#${index}` : item.id, name: own.name, input: own.input, ...(toolUseResult ? { toolUseResult } : {}),
        hostItem: item.changes.length > 1 ? { ...item, changes: [change] } : item };
    });
  }
  return [{ ...common, id: str(item.id), name, input: sdkToolInput(item), hostItem: item }];
}

/** The SDK tool calls of a run of engine items (a host tool group's members, or one standalone row). */
export function sdkToolRun(items, { awaitingIds = null } = {}) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    for (const member of Array.isArray(item?.fileRun) && item.fileRun.length ? item.fileRun : [item]) {
      const tools = sdkTools(member, { awaiting: !!awaitingIds?.has?.(member?.id) });
      if (tools) out.push(...tools);
    }
  }
  return out;
}

/** {name, input} of an engine item's tool (the clay mark's activity kind and the running candidate read only these). */
export function sdkToolOf(item) {
  const name = sdkToolName(item);
  return name === null ? null : { name, input: sdkToolInput(item) };
}
