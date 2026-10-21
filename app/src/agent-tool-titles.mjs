// Friendly transcript titles for OpenClaude Desktop's own agent tools (preview, Chrome, terminal and Workflow: the "code_desktop" MCP
// server every core runs, electron/agent-tools-host.cjs). Preview verbs are the 2.2553.1 ones (shared-5-CGK2eyBT.js hN map: "Starting
// preview" / "Started preview" / "Couldn’t start preview", …). A core reports a call as an mcpToolCall with
// server "code_desktop" (Codex, the DeepSeek core, ACP agents), or with the tool prefixed "code_desktop_" (OpenCode).
import { t, tn } from "../electron/i18n/index.mjs";

export const APP_TOOL_SERVER = "code_desktop";
const str = (value) => (typeof value === "string" ? value : "");
const host = (url) => { try { const parsed = new URL(url); return parsed.host || url; } catch { return str(url) || null; } };

const firstLine = (value) => { const line = str(value).split("\n").find((part) => part.trim()); return line ? line.trim() : null; };
/** The workflow a Workflow call runs: its saved name, else the inline script's meta.name. */
const workflowName = (args) => str(args.name) || (/\bmeta\s*=\s*\{[\s\S]*?\bname\s*:\s*(["'`])([^"'`\n]{1,120})\1/.exec(str(args.script))?.[2] ?? null) || (str(args.scriptPath) ? str(args.scriptPath).split("/").pop() : null);

const resultText = (item) => (Array.isArray(item?.result?.content) ? item.result.content : []).filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("\n");
const baseName = (file) => str(file).split("/").filter(Boolean).pop() || str(file);
const sentFiles = (args) => (Array.isArray(args.files) ? args.files : typeof args.files === "string" ? [args.files] : []).filter((file) => typeof file === "string" && file.trim());
const clip = (value, max = 80) => { const line = firstLine(value); return line ? (line.length > max ? `${line.slice(0, max - 1)}…` : line) : null; };

// [busy, done, failed?] plus the row's meta from the call's arguments (and, where the verb depends on it, the item).
const TITLES = {
  // Claude Code's own tools, served to a core without them (agent-tools/ask.mjs, notify.mjs, files.mjs); the verbs are
  // the 2.2553.1 renderer's (cd5a31703 table: "Sending notification" / "Sent notification" / "Failed to send
  // notification" / "Notification not sent"; SendUserFile "Sending" / "Sent").
  AskUserQuestion: (args) => {
    const questions = Array.isArray(args.questions) ? args.questions : [];
    return { verbs: [t("Asking"), t("Asked")], meta: str(questions[0]?.header).trim() || (questions.length > 1 ? tn(questions.length, "{count} question", "{count} questions") : null) };
  },
  PushNotification: (args, item) => ({
    verbs: [t("Sending notification"), /^Notification not sent\b/.test(resultText(item)) ? t("Notification not sent") : t("Sent notification"), t("Failed to send notification")],
    meta: clip(args.title) || clip(args.message),
  }),
  // Official "Reporting review findings" / "Reported review findings" / "Failed to report review findings" (cd5a31703 Hae/Uae/Wae).
  ReportFindings: (args) => {
    const count = Array.isArray(args.findings) ? args.findings.length : 0;
    return { verbs: [t("Reporting review findings"), t("Reported review findings"), t("Failed to report review findings")], meta: count ? tn(count, "{count} finding", "{count} findings") : null };
  },
  // Monitor / cron / WebFetch (agent-tools/monitor.mjs, schedule.mjs, web.mjs), with the official verbs: Monitor
  // "Watching background command" (no meta), CronCreate "Starting loop" or, for recurring: false, "Scheduling prompt"
  // (meta: the prompt), CronList / CronDelete, WebFetch "Fetching" (meta: the URL); MonitorStop reads as TaskStop.
  Monitor: () => ({ verbs: [t("Watching background command"), t("Started watching background command"), t("Failed to watch background command")], meta: null }),
  MonitorStop: () => ({ verbs: [t("Stopping task"), t("Stopped task"), t("Failed to stop task")], meta: null }),
  CronCreate: (args) => {
    const once = args.recurring === false;
    const prompt = str(args.prompt);
    return { verbs: once ? [t("Scheduling prompt"), t("Scheduled prompt"), t("Failed to schedule prompt")] : [t("Starting loop"), t("Started loop"), t("Failed to start loop")],
      meta: /^<<[^<>]+>>$/.test(prompt.trim()) ? null : clip(prompt) };
  },
  CronList: () => ({ verbs: [t("Listing scheduled prompts"), t("Listed scheduled prompts"), t("Failed to list scheduled prompts")], meta: null }),
  CronDelete: () => ({ verbs: [t("Stopping scheduled prompt"), t("Stopped scheduled prompt"), t("Failed to stop scheduled prompt")], meta: null }),
  WebFetch: (args) => ({ verbs: [t("Fetching"), t("Fetched"), t("Failed to fetch")], meta: str(args.url) || null }),
  // ccd_session_mgmt parity (agent-tools/sessions.mjs): "Listing sessions" / "Looking up session" / "Renaming session".
  list_sessions: (args) => ({ verbs: [t("Listing sessions"), t("Listed sessions"), t("Failed to list sessions")], meta: clip(args.query, 60) }),
  get_session: () => ({ verbs: [t("Looking up session"), t("Looked up session"), t("Failed to look up session")], meta: null }),
  list_events: () => ({ verbs: [t("Reading session"), t("Read session"), t("Failed to read session")], meta: null }),
  set_session_title: (args) => ({ verbs: [t("Renaming session"), t("Renamed session"), t("Failed to rename session")], meta: clip(args.title, 80) }),
  // ccd_host parity (agent-tools/host.mjs): "Showing in file manager" / "Opening in editor".
  reveal_path: (args) => ({ verbs: [t("Showing in file manager"), t("Shown in file manager"), t("Failed to show in file manager")], meta: str(args.path) ? baseName(args.path) : null }),
  open_in_editor: (args) => ({ verbs: [t("Opening in editor"), t("Opened in editor"), t("Failed to open in editor")], meta: str(args.path) ? baseName(args.path) : null }),
  // NotebookEdit (agent-tools/notebook.mjs): Claude's Edit verbs, the notebook's name as meta.
  NotebookEdit: (args) => ({ verbs: [t("Editing"), t("Edited"), t("Failed to edit")], meta: str(args.notebook_path) ? baseName(args.notebook_path) : null }),
  // ccd_session parity (agent-tools/session.mjs): official "Suggested task" / "Suggesting task" (cd5a31703 ov).
  mark_chapter: (args) => ({ verbs: [t("Marking chapter"), t("Marked chapter"), t("Failed to mark chapter")], meta: clip(args.title, 40) }),
  spawn_task: (args) => ({ verbs: [t("Suggesting task"), t("Suggested task"), t("Failed to suggest task")], meta: clip(args.title, 60) }),
  dismiss_task: () => ({ verbs: [t("Dismissing suggestion"), t("Dismissed suggestion"), t("Couldn’t dismiss suggestion")], meta: null }),
  SendUserFile: (args) => {
    const files = sentFiles(args);
    return { verbs: [t("Sending"), t("Sent"), t("Failed to send")], meta: files.length === 1 ? baseName(files[0]) : files.length ? tn(files.length, "{count} file", "{count} files") : null };
  },
  // The terminal tools (agent-tools/terminal.mjs); official 2.2553.1 terminal wording ("Failed to start command in
  // terminal", "Failed to read terminal", "Failed to list terminal tabs").
  run_in_terminal: (args) => ({ verbs: [t("Running in terminal"), t("Ran in terminal"), t("Failed to start command in terminal")], meta: firstLine(args.command) || str(args.title) || null }),
  read_terminal: () => ({ verbs: [t("Reading terminal"), t("Read terminal"), t("Failed to read terminal")], meta: null }),
  list_terminal_tabs: () => ({ verbs: [t("Listing terminal tabs"), t("Listed terminal tabs"), t("Failed to list terminal tabs")], meta: null }),
  open_terminal_tab: (args) => ({ verbs: [t("Opening terminal tab"), t("Opened terminal tab"), t("Failed to open terminal tab")], meta: str(args.title) || null }),
  stop_terminal_tab: () => ({ verbs: [t("Stopping terminal"), t("Stopped terminal"), t("Couldn’t stop terminal")], meta: null }),
  // The Workflow tool (agent-tools/workflow.mjs): official "Running workflow" / "Ran workflow" / "Failed to run workflow".
  Workflow: (args) => ({ verbs: [t("Running workflow"), t("Ran workflow"), t("Failed to run workflow")], meta: workflowName(args) }),
  // WorkflowStop (the model's stop for a run it started; Claude: TaskStop on the workflow task): meta, the task ID.
  WorkflowStop: (args) => ({ verbs: [t("Stopping workflow"), t("Stopped workflow"), t("Failed to stop workflow")], meta: typeof args?.task_id === "string" && args.task_id.trim() ? args.task_id.trim().slice(0, 80) : null }),
  preview_start: (args) => ({ verbs: [t("Starting preview"), t("Started preview"), t("Couldn’t start preview")], meta: str(args.name) || host(args.url) }),
  preview_stop: (args) => ({ verbs: [t("Stopping preview"), t("Stopped preview"), t("Couldn’t stop preview")], meta: str(args.name) || null }),
  preview_list: () => ({ verbs: [t("Listing previews"), t("Listed previews")], meta: null }),
  preview_logs: (args) => ({ verbs: [t("Reading server logs"), t("Read server logs"), t("Couldn’t read server logs")], meta: str(args.name) || null }),
  navigate: (args) => ({ verbs: [t("Opening page"), t("Opened page"), t("Couldn’t open page")], meta: host(args.url) }),
  screenshot: () => ({ verbs: [t("Capturing page"), t("Captured page"), t("Couldn’t capture page")], meta: null }),
  read_page: () => ({ verbs: [t("Reading page"), t("Read page"), t("Couldn’t read page")], meta: null }),
  get_page_text: () => ({ verbs: [t("Reading page"), t("Read page"), t("Couldn’t read page")], meta: null }),
  click: (args) => ({ verbs: [t("Clicking"), t("Clicked"), t("Failed to click")], meta: str(args.ref) || str(args.selector) || (Number.isFinite(args.x) && Number.isFinite(args.y) ? `(${Math.round(args.x)}, ${Math.round(args.y)})` : null) }),
  type: (args) => ({ verbs: [t("Filling in a field"), t("Filled in a field"), t("Couldn’t fill in a field")], meta: null }),
  press: (args) => ({ verbs: [t("Pressing keys"), t("Pressed keys"), t("Failed to press")], meta: str(args.keys) || null }),
  preview_inspect: (args) => ({ verbs: [t("Inspecting element"), t("Inspected element"), t("Couldn’t inspect element")], meta: str(args.ref) || str(args.selector) || null }),
  preview_fill: (args) => ({ verbs: [t("Filling in a field"), t("Filled in a field"), t("Couldn’t fill in a field")], meta: str(args.ref) || str(args.selector) || null }),
  preview_eval: (args) => ({ verbs: [t("Running JavaScript"), t("Ran JavaScript"), t("Couldn’t run JavaScript")], meta: firstLine(args.expression)?.slice(0, 80) ?? null }),
  read_console_messages: () => ({ verbs: [t("Reading console"), t("Read console"), t("Couldn’t read console")], meta: null }),
  read_network_requests: () => ({ verbs: [t("Reading network activity"), t("Read network activity"), t("Couldn’t read network activity")], meta: null }),
  // scroll / hover / find / preview_batch: the 2.2553.1 browser verbs (shared-5 hN: "Scrolling down", "Scrolling to
  // element", "Hovering", "Finding on page", "Performing browser actions").
  scroll: (args) => {
    const way = { up: [t("Scrolling up"), t("Scrolled up")], down: [t("Scrolling down"), t("Scrolled down")], left: [t("Scrolling left"), t("Scrolled left")], right: [t("Scrolling right"), t("Scrolled right")] }[str(args.direction)];
    if (way) return { verbs: [...way, t("Couldn’t scroll")], meta: str(args.ref) || str(args.selector) || null };
    return { verbs: [t("Scrolling to element"), t("Scrolled to element"), t("Couldn’t scroll to element")], meta: str(args.ref) || str(args.selector) || null };
  },
  hover: (args) => ({ verbs: [t("Hovering"), t("Hovered"), t("Couldn’t hover")], meta: str(args.ref) || str(args.selector) || (Number.isFinite(args.x) && Number.isFinite(args.y) ? `(${Math.round(args.x)}, ${Math.round(args.y)})` : null) }),
  find: (args) => ({ verbs: [t("Finding on page"), t("Found on page"), t("Couldn’t search the page")], meta: clip(args.query, 60) }),
  preview_batch: (args) => ({ verbs: [t("Performing browser actions"), t("Performed browser actions"), t("Couldn’t perform browser actions")],
    meta: Array.isArray(args.actions) && args.actions.length ? tn(args.actions.length, "{count} step", "{count} steps") : null }),
  resize_window: (args) => ({ verbs: [t("Resizing preview"), t("Resized preview"), t("Couldn’t resize preview")], meta: str(args.preset) || (Number.isFinite(args.width) && Number.isFinite(args.height) ? `${args.width} × ${args.height}` : str(args.colorScheme) || null) }),
  // The Chrome tools (agent-tools/browser.mjs, Claude in Chrome's): the 2.42304.0 verbs, which map each
  // claude-in-chrome tool to the Browser one (shared-130 zI → WF: navigate "Opening a page", tabs_context "Checking
  // tabs", javascript_tool "Running page script", …); computer by its action (EI), a batch by its steps (XI / AI).
  chrome_navigate: (args) => ({ ...(CHROME_HISTORY[str(args.url)] ?? { verbs: [t("Opening a page"), t("Opened a page"), t("Couldn’t open the page")] }), meta: CHROME_HISTORY[str(args.url)] ? null : host(args.url) }),
  chrome_read_page: (args) => ({ verbs: args.filter === "interactive" ? [t("Reading page (interactive)"), t("Read page (interactive)"), t("Couldn’t read page")] : [t("Reading page"), t("Read page"), t("Couldn’t read page")], meta: str(args.ref_id) || null }),
  chrome_find: (args) => ({ verbs: [t("Finding on page"), t("Found on page"), t("Couldn’t search the page")], meta: clip(args.query, 60) }),
  chrome_form_input: (args) => ({ verbs: [t("Filling in a field"), t("Filled in a field"), t("Couldn’t fill in a field")], meta: str(args.ref) || null }),
  chrome_computer: (args) => ({ verbs: chromeActionVerbs(args), meta: chromeActionMeta(args) }),
  chrome_javascript_tool: (args) => ({ verbs: [t("Running page script"), t("Ran page script"), t("Page script failed")], meta: firstLine(args.code)?.slice(0, 80) ?? null }),
  chrome_tabs_context_mcp: () => ({ verbs: [t("Checking tabs"), t("Checked tabs"), t("Couldn’t check tabs")], meta: null }),
  chrome_tabs_create_mcp: (args) => ({ verbs: [t("Opening tab"), t("Opened tab"), t("Couldn’t open tab")], meta: str(args.url) ? host(args.url) : null }),
  chrome_browser_batch: (args) => ({ verbs: chromeBatchVerbs(args), meta: Array.isArray(args.actions) && args.actions.length ? tn(args.actions.length, "{count} step", "{count} steps") : null }),
};

// chrome_navigate's "back" / "forward" (2.42304.0 goBack / goForward).
const CHROME_HISTORY = {
  get back() { return { verbs: [t("Going back"), t("Went back"), t("Couldn’t go back")] }; },
  get forward() { return { verbs: [t("Going forward"), t("Went forward"), t("Couldn’t go forward")] }; },
};
// computer's action verbs (2.42304.0 EI, with the matching failures).
function chromeActionVerbs(args) {
  const action = str(args?.action);
  if (action === "left_click" || action === "right_click" || action === "double_click") return [t("Clicking"), t("Clicked"), t("Failed to click")];
  if (action === "hover") return [t("Hovering"), t("Hovered"), t("Couldn’t hover")];
  if (action === "type") return [t("Typing"), t("Typed"), t("Couldn’t type")];
  if (action === "key") return [t("Pressing key"), t("Pressed key"), t("Couldn’t press key")];
  if (action === "scroll") {
    const way = { up: [t("Scrolling up"), t("Scrolled up")], down: [t("Scrolling down"), t("Scrolled down")], left: [t("Scrolling left"), t("Scrolled left")], right: [t("Scrolling right"), t("Scrolled right")] }[str(args.scroll_direction)];
    return way ? [...way, t("Couldn’t scroll")] : [t("Scrolling to element"), t("Scrolled to element"), t("Couldn’t scroll to element")];
  }
  return [t("Interacting with page"), t("Interacted with page"), t("Failed to interact with page")];
}
// What a computer row names: the element's ref, else the point; the keys pressed; the text typed.
function chromeActionMeta(args) {
  const action = str(args?.action);
  if (action === "key") return clip(args.text, 60);
  if (action === "type") return clip(args.text, 60) ? `“${clip(args.text, 60)}”` : null;
  if (str(args.ref)) return str(args.ref);
  const point = Array.isArray(args.coordinate) && args.coordinate.length === 2 && args.coordinate.every(Number.isFinite) ? `(${Math.round(args.coordinate[0])}, ${Math.round(args.coordinate[1])})` : null;
  return point;
}
// A batch row: its steps' verbs, each kind once, at most three and "+N" for the rest (2.42304.0 XI / AI, TI = 3).
const CHROME_STEP_TITLES = { navigate: "chrome_navigate", read_page: "chrome_read_page", find: "chrome_find", form_input: "chrome_form_input", computer: "chrome_computer",
  javascript_tool: "chrome_javascript_tool", tabs_context: "chrome_tabs_context_mcp", tabs_context_mcp: "chrome_tabs_context_mcp", tabs_create: "chrome_tabs_create_mcp", tabs_create_mcp: "chrome_tabs_create_mcp" };
function chromeBatchVerbs(args) {
  const steps = Array.isArray(args?.actions) ? args.actions : [];
  const verbs = (done) => {
    const labels = [];
    let more = 0;
    for (const step of steps) {
      const name = CHROME_STEP_TITLES[str(step?.name).replace(/^chrome_/, "")];
      const input = step?.input && typeof step.input === "object" ? step.input : {};
      // Official step labels: navigate is "Opening" / "Opened" and find "Finding" / "Found" inside a batch (DI).
      const label = name === "chrome_navigate" ? (done ? t("Opened") : t("Opening")) : name === "chrome_find" ? (done ? t("Found") : t("Finding"))
        : name ? TITLES[name](input).verbs[done ? 1 : 0] : t("Browser action");
      if (labels.includes(label)) continue;
      if (labels.length < 3) labels.push(label); else more += 1;
    }
    if (!labels.length) return done ? t("Performed browser actions") : t("Performing browser actions");
    const text = labels.map((label, index) => (index === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1))).join(", ");
    return more ? `${text} +${more}` : text;
  };
  return [verbs(false), verbs(true), t("Couldn’t perform browser actions")];
}

/** The app tool a transcript item calls ({tool, args}), or null for anything else. */
export function appToolCall(item) {
  if (!item || (item.type !== "mcpToolCall" && item.type !== "dynamicToolCall")) return null;
  const server = str(item.server) || str(item.namespace);
  let tool = str(item.tool) || str(item.name);
  if (server === APP_TOOL_SERVER || server === `mcp__${APP_TOOL_SERVER}`) { /* tool as is */ }
  else if (!server && tool.startsWith(`${APP_TOOL_SERVER}_`)) tool = tool.slice(APP_TOOL_SERVER.length + 1);
  else if (!server && tool.startsWith(`mcp__${APP_TOOL_SERVER}__`)) tool = tool.slice(`mcp__${APP_TOOL_SERVER}__`.length);
  else return null;
  const args = item.arguments && typeof item.arguments === "object" && !Array.isArray(item.arguments) ? item.arguments : {};
  return Object.hasOwn(TITLES, tool) ? { tool, args } : null;
}

/** {label, meta} for an app tool row in a state ("busy" | "blocked" | "failed" | …), or null. */
export function appToolLabel(item, state) {
  const call = appToolCall(item);
  if (!call) return null;
  const { verbs: [busy, done, failed], meta } = TITLES[call.tool](call.args, item);
  const running = state === "busy" || state === "blocked";
  return { label: running ? busy : state === "failed" ? failed ?? done : done, meta: meta ?? null };
}

// Claude's stands-alone tools (cd5a31703 grouping: ask_user_question, push_notification, send_to_user,
// report_findings): their row or card is never folded into a tool group. The DeepSeek core's `present` (its
// SendUserFile) too.
// mark_chapter is "lifted-out": its heading is never inside a group either.
const STANDS_ALONE = new Set(["AskUserQuestion", "PushNotification", "SendUserFile", "ReportFindings", "mark_chapter"]);
export function appToolStandsAlone(item) {
  if (item?.type === "dynamicToolCall" && Array.isArray(item.codeDesktop?.deliverables) && item.codeDesktop.deliverables.length) return true;
  const call = appToolCall(item);
  return !!call && STANDS_ALONE.has(call.tool);
}

/**
 * Where a model-started run's card goes when the core didn't name its call (only Codex sends _meta.itemId): right
 * after the Workflow tool row whose launch text names the run ("Run ID: wf_…"). run.after when that item is shown.
 */
export function workflowRunAnchor(items, run) {
  if (!run || !Array.isArray(items)) return run?.after;
  if (typeof run.after === "string" && items.some((item) => item?.id === run.after)) return run.after;
  if (run.origin !== "tool" || typeof run.id !== "string" || !run.id) return run.after;
  const names = (item) => { try { return JSON.stringify(item.result ?? item.contentItems ?? item.output ?? "").includes(`Run ID: ${run.id}`); } catch { return false; } };
  return items.find((item) => appToolCall(item)?.tool === "Workflow" && names(item))?.id ?? run.after;
}

/**
 * The transcript with a session's local workflow runs placed: 2.2553.1's Workflow tool row is the run's card (J6: a
 * compact card while it runs, "Ran workflow <name>" once it ends), so a run the model's Workflow call launched takes
 * that call's place instead of adding a second "Ran workflow" line after it. Every other run (/workflow, a call whose
 * item isn't shown) is a local row after its anchor. Returns {items, rows} (rows for withLocalCommandRows).
 */
export function withWorkflowToolRuns(items, runs) {
  const list = Array.isArray(items) ? items : [], rows = [], byItem = new Map();
  for (const run of Array.isArray(runs) ? runs : []) {
    const after = workflowRunAnchor(list, run);
    const anchor = run?.origin === "tool" && typeof after === "string" && !byItem.has(after) ? list.find((item) => item?.id === after) : null;
    if (anchor && appToolCall(anchor)?.tool === "Workflow") byItem.set(after, run);
    else rows.push({ id: "local-workflow:" + run.id, after, workflowRun: run });
  }
  return { items: byItem.size ? list.map((item) => byItem.has(item?.id) ? { id: item.id, turnId: item.turnId, workflowRun: byItem.get(item.id) } : item) : list, rows };
}

const failedCall = (item) => item?.status === "failed" || item?.result?.isError === true || !!item?.error || item?.success === false;

/** A mark_chapter call's heading ({title, summary}), or null (any other item, or a call that failed). */
export function chapterOf(item) {
  if (appToolCall(item)?.tool !== "mark_chapter" || failedCall(item)) return null;
  const title = str(item.arguments?.title).replace(/\s+/g, " ").trim().slice(0, 80);
  if (!title) return null;
  const summary = str(item.arguments?.summary).replace(/\s+/g, " ").trim();
  return { id: item.id, title, ...(summary ? { summary } : {}) };
}

/** The chapters of a transcript's items, in order. */
export function transcriptChapters(items) {
  return (Array.isArray(items) ? items : []).map(chapterOf).filter(Boolean);
}

/**
 * The open suggested tasks of a session's items (spawn_task calls that finished, newest first): {id, title, tldr,
 * prompt, cwd?, itemId}. A dismiss_task call, or an id in `dismissed` (the user's X), withdraws one.
 */
export function suggestedTasks(items, dismissed = null) {
  const list = Array.isArray(items) ? items : [];
  const withdrawn = new Set(dismissed instanceof Set ? dismissed : Array.isArray(dismissed) ? dismissed : []);
  for (const item of list) {
    const call = appToolCall(item);
    if (call?.tool === "dismiss_task" && !failedCall(item) && typeof call.args.task_id === "string") withdrawn.add(call.args.task_id.trim());
  }
  const out = [];
  for (const item of list) {
    const call = appToolCall(item);
    if (call?.tool !== "spawn_task" || item.status !== "completed" || failedCall(item)) continue;
    const id = /\btask_id: (task_[0-9a-f]{8})\b/.exec(resultText(item))?.[1];
    const prompt = str(call.args.prompt).trim();
    if (!id || !prompt || withdrawn.has(id)) continue;
    const cwd = str(call.args.cwd).trim();
    // suggestedAt: when the call finished (the item's completion time), for the backlog's 30-day window.
    const suggestedAt = Number.isFinite(item.completedAtMs) ? item.completedAtMs : Number.isFinite(item.startedAtMs) ? item.startedAtMs : undefined;
    out.push({ id, itemId: item.id, title: str(call.args.title).replace(/\s+/g, " ").trim() || prompt.slice(0, 60), tldr: str(call.args.tldr).trim(), prompt, ...(cwd ? { cwd } : {}),
      ...(suggestedAt !== undefined ? { suggestedAt } : {}) });
  }
  return out.reverse().slice(0, 20);
}
