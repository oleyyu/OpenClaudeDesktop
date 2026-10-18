// The model-invoked Workflow tool (agent-tools/workflow.mjs) and its notifications: pure pieces modeled on Claude
// Code 2.1.280's Workflow tool (input validation, launch text, <task-notification>, saved-workflow lookup, the
// opt-in reminders). Main-process only (Node fs). The model-facing description is OpenClaude Desktop's own wording of
// Claude's rules: the opt-in rule, the cost ask, the script contract and the size guideline.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseClaudeWorkflowScript } from "../third-party/codex-workflows-runner/src/claude-metadata.js";
import { compileWorkflowBody } from "../third-party/codex-workflows-runner/src/workflow-compiler.js";
import { SIZE_LIMITS } from "./prefs/workflow-settings.mjs";

export const WORKFLOW_TOOL = "Workflow";
export const MAX_SCRIPT_BYTES = 524288;
export const RUN_ID = /^wf_[a-z0-9-]{6,}$/;
const LEGACY_RUN_ID = /^[a-f0-9-]{36}$/;
export const isRunId = (value) => typeof value === "string" && (RUN_ID.test(value) || LEGACY_RUN_ID.test(value));
/** Claude: `wf_` + the first 12 characters of a UUID. */
export const newRunId = () => `wf_${crypto.randomUUID().slice(0, 12)}`;
/** Claude's local_workflow task id: "w" + 8 of [0-9a-z]. */
export function newTaskId() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz", bytes = crypto.randomBytes(8);
  let id = "w";
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}
/** Claude's slug for saved and persisted scripts: lowercase, runs of other characters → "-", trimmed. */
export const workflowSlug = (name) => String(name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "workflow";

// The opt-in and mode reminders live in a light module (no script parser), read on every turn/start.
export * from "./workflow-reminders.mjs";
import { sizeGuidelineText, SYSTEM_NOTIFICATION } from "./workflow-reminders.mjs";

// --- Model-facing description (OpenClaude Desktop's wording of Claude's rules).
const DESCRIPTION = `Run a dynamic workflow: a JavaScript script that orchestrates many subagents deterministically. The run goes to the background — this tool returns at once with a task ID and run ID, and a <task-notification> message arrives in this conversation when the workflow finishes. The user watches progress in the Tasks pane (/workflows).

Call this tool ONLY when the user has explicitly opted into multi-agent orchestration. A workflow can start dozens of agents and use a lot of tokens, so the user must ask for that scale; never infer it. Explicit opt-in is one of:
- The user's prompt contains the keyword "ultracode" (a system-reminder confirms it).
- Ultracode is on for the session (a system-reminder confirms it): then use a workflow for every substantive task.
- The user asked in their own words to run a workflow or orchestrate subagents ("use a workflow", "run a workflow", "fan out agents", "orchestrate this with subagents"). A task that would merely benefit from parallelism does not count.
- A skill or slash command the user invoked tells you to call this tool.
- The user asked for a specific named or saved workflow (pass it as \`name\`).
For anything else — even work that would clearly benefit from parallel agents — do NOT call this tool. Briefly describe what a workflow could do and roughly how much it would cost, and ask whether to run it; mention that saying "use a workflow" next time skips the question.

Inputs: \`script\` (inline source), or \`name\` (a saved workflow from .claude/workflows), or \`scriptPath\` (a script file this tool returned earlier, edited; it wins over the others); \`args\` (any JSON value, exposed to the script as the global \`args\` — pass arrays and objects as JSON values, not as a JSON-encoded string); \`resumeFromRunId\` (a finished run of this session: unchanged agent() calls return their cached results). Pass the script inline — do not write it to a file first — and do not also set \`name\` with an inline script.

Script contract:
- The FIRST statement must be \`export const meta = { name, description, phases }\` as a pure literal (no variables, calls, spreads or interpolation). \`name\` and \`description\` (one line, shown when the user approves the run) are required; \`title\`, \`whenToUse\` and \`phases\` ([{ title, detail? }], titles matching your phase() calls exactly) are optional.
- The body is plain JavaScript (not TypeScript) running in an async context. Globals: agent(prompt, opts?) → the subagent's final text, or with opts.schema (a JSON Schema with an object root) the validated object; opts also take label, phase, model, effort, isolation: 'worktree' (only when agents edit files in parallel) and agentType. agent() resolves to null when the user skips that agent or it ends on an API error it can't recover from, and throws for an unknown agentType, a worktree that can't be set up, or an agent that stalls on every retry. pipeline(items, ...stages) runs each item through all stages with no barrier (the default for multi-stage work; stages get (previous, item, index)); parallel(thunks) is a barrier whose failed slots resolve to null (filter with .filter(Boolean)); phase(title); log(message); args; budget {total, spent(), remaining()} (total is the token target of the user's "+500k"-style directive in the message that started the run, else null and remaining() is Infinity; spent() counts the main model and all workflows sharing that turn's budget; running agents may finish above the target, but further agent() calls are refused); workflow(nameOrRef, args?) runs another workflow as one sub-step (one level of nesting).
- Date.now(), Math.random() and argless new Date() are unavailable (they would break resume): pass timestamps in args and vary prompts by index instead. No filesystem or Node.js APIs.
- Subagents' final text is the return value, not a message to a human; they have the session's tools except this one.
- At most min(16, CPU cores − 2) agents run at once (more wait for a slot), at most 1000 agents per run and 4096 items per parallel()/pipeline() call.

Ultracode: when a system-reminder says ultracode is on, the opt-in stands for the whole session — run a workflow for every substantive task by default and aim for the most exhaustive, correct answer; token cost is not a constraint. Multi-phase work (understand → design → implement → review) usually means several workflows in sequence, one per phase, reading each result before starting the next. Lean on the quality patterns below and verify findings adversarially unless the work is trivial or already verified. Work solo only on conversational turns or trivial mechanical edits. When a reminder says ultracode is off, the opt-in rule above applies again.

Quality patterns (pick what fits the task and combine them):
- Adversarial verify: several independent agents per finding, each told to refute it (refuted when uncertain); keep a finding only when most fail to refute it.
- Perspective-diverse verify: give each verifier a different lens (correctness, security, performance, does it reproduce) instead of identical refuters.
- Judge panel: several independent attempts from different angles, scored by parallel judges; build on the winner and borrow the best of the rest.
- Loop-until-dry: for discovery of unknown size, keep running finder rounds until a couple of rounds in a row find nothing new (dedupe against everything seen, not just what was confirmed).
- Multi-modal sweep: parallel agents that each search a different way (by file, by content, by entity, by time).
- Completeness critic: a last agent asks what is missing (a search not run, a claim not verified, a source not read); what it finds is the next round.
- No silent caps: when a workflow bounds its coverage (top N, sampling, no retries), log() what it left out.
Scale to the request: "find any bugs" → a few finders and a single verify vote; "audit this thoroughly" → more finders, a 3–5 vote adversarial pass and a synthesis step.

Prefer pipeline() over barriers; verify findings adversarially before reporting them; log() what a bounded workflow leaves out. To resume after a stop, failure or script edit, call this tool with {scriptPath, resumeFromRunId}: the longest unchanged prefix of agent() calls replays from cache. Read <transcript dir>/journal.jsonl before diagnosing an empty result.`;
export function workflowToolDescription({ sizeGuideline = "medium", sizeIsDefault = true, nameOnly = false } = {}) {
  const advisory = sizeGuidelineText(sizeGuideline, sizeIsDefault);
  // Claude Code under CLAUDE_WORKFLOW_NAME_ONLY lists only its bundled workflows; OpenClaude Desktop bundles none.
  const restricted = nameOnly ? `\n\nThis session runs named bundled workflows only (CLAUDE_WORKFLOW_NAME_ONLY): call this tool as {name, args}. ${NAME_ONLY_NONE}` : "";
  return DESCRIPTION + restricted + (advisory ? `\n\n${advisory}` : "");
}
// WorkflowStop: the model stops a run it started (Claude Code's TaskStop on a workflow task), by the launch text's task
// ID (or its run ID). A run stopped this way sends no task notification, as a run the user stops.
export const WORKFLOW_STOP_TOOL = "WorkflowStop";
export const WORKFLOW_STOP_DESCRIPTION = "Stops a background dynamic workflow this session's Workflow tool started, by the Task ID its launch result gave (a Run ID works too). Agents still running are stopped; finished agents' results stay in the run's journal, so the run can be resumed later with Workflow({scriptPath, resumeFromRunId}). Use it when a run is no longer needed (wrong script, wrong folder, the user asked to stop it) or before resuming it. No completion notification follows.";
export const WORKFLOW_STOP_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: { task_id: { type: "string", description: "The Task ID from the Workflow tool's result (w…), or the run's Run ID (wf_…)." } },
  required: ["task_id"],
  additionalProperties: false,
});
export const WORKFLOW_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    script: { type: "string", description: "Self-contained workflow script. Must begin with `export const meta = { name, description, phases }` (a pure literal) followed by the script body using agent()/parallel()/pipeline()/phase()." },
    name: { type: "string", description: "Name of a saved workflow (from .claude/workflows). Resolves to its script." },
    scriptPath: { type: "string", description: "Path of a workflow script file — one this tool returned (edit it, then pass it back instead of resending the script). Takes precedence over `script` and `name`." },
    args: { description: "Optional input value exposed to the script as the global `args`, verbatim. Pass arrays/objects as JSON values, not as a JSON-encoded string." },
    resumeFromRunId: { type: "string", description: "Run ID of an earlier Workflow run in this session to resume from: unchanged agent() calls return their cached results; edited or new calls run again. Stop that run first (WorkflowStop)." },
    description: { type: "string", description: "Ignored — set the description in the script's `meta`." },
    title: { type: "string", description: "Ignored — set the title in the script's `meta`." },
  },
  additionalProperties: false,
});

// --- Input validation (Claude validateInput, in its order).
// Characters a person can't see in the approval: C0 controls except \t and \n, DEL and C1 controls.
const hiddenControl = (text) => { for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); if ((code < 32 && code !== 9 && code !== 10) || (code >= 127 && code <= 159)) return true; } return false; };
const invisible = (text) => /[\u0000-\u001f\u007f-\u009f­؜᠎​-‏‪-‮⁠-⁤⁦-⁯﻿￹-￻]/u.test(text);
export const DISABLED_MANAGED = "Dynamic workflows are disabled by managed settings (`disableWorkflows`).";
export const DISABLED_SESSION = 'Dynamic workflows are not enabled for this session (org policy, launch gate, or the "Dynamic workflows" setting in Settings).';
/**
 * Shape checks only (no file or saved-workflow reads). Returns {error} or {ok: true, input} with the normalized
 * input. A string `args` that starts with { or [ is parsed as JSON (Claude coerceInput).
 */
export function checkWorkflowInput(raw, { enabled = true, disabledBy = null, nameOnly = false } = {}) {
  if (!enabled) return { error: disabledBy === "managed" ? DISABLED_MANAGED : DISABLED_SESSION };
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const input = {};
  for (const key of ["script", "name", "scriptPath", "resumeFromRunId", "description", "title"]) {
    if (value[key] === undefined || value[key] === null) continue;
    if (typeof value[key] !== "string") return { error: `${key} must be a string.` };
    input[key] = value[key];
  }
  if (Object.hasOwn(value, "args")) {
    let args = value.args;
    if (typeof args === "string" && /^\s*[[{]/.test(args)) { try { args = JSON.parse(args); } catch { /* kept as the string */ } }
    if (args !== undefined && JSON.stringify(args) === undefined) return { error: "args must be a JSON value." };
    if (args !== undefined) input.args = args;
  }
  if (input.script !== undefined) {
    if (Buffer.byteLength(input.script, "utf8") > MAX_SCRIPT_BYTES) return { error: `Script exceeds ${MAX_SCRIPT_BYTES} bytes` };
    if (hiddenControl(input.script)) return { error: "script contains control characters that would be hidden in the approval dialog" };
  }
  for (const key of ["name", "scriptPath"]) if (input[key] !== undefined && (invisible(input[key]) || !input[key].trim())) return { error: `${key} contains control or invisible format characters` };
  if (input.resumeFromRunId !== undefined && !RUN_ID.test(input.resumeFromRunId)) return { error: "resumeFromRunId must be a run ID like wf_1b4e28ba-2fa." };
  if (!input.script && !input.name && !input.scriptPath) return { error: "Must provide script, name, or scriptPath" };
  if (nameOnly) {
    const refused = ["script", "scriptPath", "resumeFromRunId"].filter((key) => input[key]);
    if (refused.length) return { error: `This session restricts the Workflow tool to named workflows (CLAUDE_WORKFLOW_NAME_ONLY is set). Not allowed here: ${refused.join(", ")}. Invoke as {name, args} only.` };
  }
  return { ok: true, input };
}

/** Parses and compiles a script; {meta, body} or {error} (Claude Rh + compile, with its messages). */
export function parseWorkflowScript(source) {
  if (typeof source !== "string") return { error: "Invalid workflow script: the script is not text" };
  if (Buffer.byteLength(source, "utf8") > MAX_SCRIPT_BYTES) return { error: `Invalid workflow script: Script exceeds ${MAX_SCRIPT_BYTES} bytes` };
  let parsed;
  try { parsed = parseClaudeWorkflowScript(source); }
  catch (error) { return { error: `Invalid workflow script: ${error?.message ?? error}` }; }
  try { compileWorkflowBody(parsed.script); }
  catch (error) { return { error: `Workflow script has a syntax error and was not launched:\nSyntaxError: ${String(error?.message ?? error).replace(/^SyntaxError:\s*/, "")}` }; }
  return { meta: parsed.meta, body: parsed.script };
}

// Code with string, comment and template text blanked out (template ${…} expressions stay code), so the
// determinism check reads only what runs. Regex literals are rare in scripts and left as code.
export function codeOnly(source) {
  let out = "", i = 0;
  const stack = []; // template nesting: brace depth per open ${
  const n = source.length;
  while (i < n) {
    const ch = source[i], next = source[i + 1];
    if (ch === "/" && next === "/") { while (i < n && source[i] !== "\n") { out += " "; i++; } continue; }
    if (ch === "/" && next === "*") { out += "  "; i += 2; while (i < n && !(source[i] === "*" && source[i + 1] === "/")) { out += source[i] === "\n" ? "\n" : " "; i++; } out += "  "; i += 2; continue; }
    if (ch === "'" || ch === '"') { out += " "; i++; while (i < n && source[i] !== ch && source[i] !== "\n") { if (source[i] === "\\") { out += " "; i++; } out += " "; i++; } out += " "; i++; continue; }
    if (ch === "`" || (ch === "}" && stack.length && stack.at(-1) === 0)) {
      if (ch === "}") stack.pop();
      out += " "; i++;
      while (i < n && source[i] !== "`") {
        if (source[i] === "\\") { out += "  "; i += 2; continue; }
        if (source[i] === "$" && source[i + 1] === "{") { out += "  "; i += 2; stack.push(0); break; }
        out += source[i] === "\n" ? "\n" : " "; i++;
      }
      if (source[i] === "`") { out += " "; i++; }
      continue;
    }
    if (stack.length && ch === "{") stack[stack.length - 1]++;
    if (stack.length && ch === "}" && stack.at(-1) > 0) stack[stack.length - 1]--;
    out += ch; i++;
  }
  return out;
}
/** Claude's static determinism check for inline scripts: Date.now / Math.random member reads, argless new Date. */
export function readsClock(body) {
  const code = codeOnly(String(body));
  return /(?<![\w$.])Date\s*(?:\?\.|\.)\s*now(?![\w$])/.test(code) || /(?<![\w$.])Math\s*(?:\?\.|\.)\s*random(?![\w$])/.test(code)
    || /(?<![\w$.])new\s+Date(?![\w$])(?!\s*\(\s*[^\s)])/.test(code);
}
export const NONDETERMINISTIC = "Workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.";

// --- Saved workflows (Claude: ~/.claude/workflows, then every .claude/workflows from the farthest project folder to
// the nearest; later wins by meta.name). Only .js files of at most 512 KB with valid meta.
function gitRoot(start) {
  for (let dir = start, depth = 0; depth < 64; depth++) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}
// The folders saved workflows live in, highest precedence first. A core with its own folder (Qwen: .qwen/workflows, its
// descriptor's workflowFolders) puts it first, so both engines read and save the same scripts.
export const CLAUDE_WORKFLOW_FOLDER = ".claude/workflows";
export function workflowFolders(extra) {
  const own = (Array.isArray(extra) ? extra : []).filter((entry) => typeof entry === "string" && /^\.[\w.-]+\/workflows$/.test(entry));
  return [...new Set([...own, CLAUDE_WORKFLOW_FOLDER])];
}
const folderPath = (dir, folder) => path.join(dir, ...folder.split("/"));
/** The project workflow folders, nearest first: cwd upward, never the home folder itself, stopping at the git root. */
export function projectWorkflowDirs(cwd, home, folders = [CLAUDE_WORKFLOW_FOLDER]) {
  const out = [], root = gitRoot(cwd), stop = home ? path.resolve(home) : null;
  for (let dir = path.resolve(cwd), depth = 0; depth < 64; depth++) {
    if (stop && dir === stop) break;
    for (const folder of folders) out.push(folderPath(dir, folder));
    if (root && dir === root) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}
function readDir(dir, source, warnings) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!(entry.isFile() || entry.isSymbolicLink()) || !entry.name.endsWith(".js")) continue;
    const file = path.join(dir, entry.name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (!stat.isFile()) continue;
    if (stat.size > MAX_SCRIPT_BYTES) { warnings.push(`Workflow ${file} exceeds ${MAX_SCRIPT_BYTES} bytes — skipping`); continue; }
    let script;
    try { script = fs.readFileSync(file, "utf8"); } catch { continue; }
    let meta;
    try { meta = parseClaudeWorkflowScript(script, false).meta; }
    catch (error) { warnings.push(`Workflow ${file} has invalid meta: ${error?.message ?? error} — skipping`); continue; }
    found.push({ source, name: meta.name, description: meta.description, whenToUse: meta.whenToUse, phases: meta.phases, title: meta.title, script, filePath: file });
  }
  return found;
}
/** Every saved workflow for `cwd`, sorted by name, plus the skip warnings. */
export function savedWorkflows({ cwd, home, folders: extraFolders }) {
  const folders = workflowFolders(extraFolders);
  const warnings = [], merged = new Map();
  // Claude Code 2.1.280 (y/S): a higher-precedence copy replaces a same-named one only when its whole script parses;
  // a half-edited project copy never shadows a working user (or farther project) copy.
  const add = (entry) => {
    const earlier = merged.get(entry.name);
    if (earlier && parseWorkflowScript(entry.script).error) {
      warnings.push(`Workflow ${entry.filePath ?? entry.name} (${entry.source}) would override ${entry.name} but does not parse — keeping the ${earlier.source} copy`);
      return;
    }
    merged.set(entry.name, entry);
  };
  // Lowest precedence first: a later copy of the same name replaces an earlier one.
  for (const folder of home ? [...folders].reverse() : []) for (const entry of readDir(folderPath(home, folder), "user", warnings)) add(entry);
  const projects = projectWorkflowDirs(cwd, home, folders);
  for (let index = projects.length - 1; index >= 0; index--) for (const entry of readDir(projects[index], "project", warnings)) add(entry);
  return { workflows: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)), warnings };
}
// CLAUDE_WORKFLOW_NAME_ONLY (Claude Code 2.1.280): the registry holds only bundled workflows, so a project's or the
// user's own .claude/workflows scripts don't count as "named" (else any project could ship a script under a name),
// and nested workflow({scriptPath}) is refused. OpenClaude Desktop bundles no workflows.
export const NAME_ONLY_NONE = "OpenClaude Desktop bundles no named workflows, so no workflow can run in this session.";
export const NAME_ONLY_SCRIPT_PATH = "workflow({scriptPath}): this session restricts workflows to named bundled workflows (CLAUDE_WORKFLOW_NAME_ONLY is set) — nest with workflow('<name>') instead.";
export function findSavedWorkflow({ cwd, home, name, nameOnly = false, folders }) {
  if (nameOnly) return { error: `Workflow "${name}" not found. Available: (none). ${NAME_ONLY_NONE}` };
  const { workflows } = savedWorkflows({ cwd, home, folders });
  const match = workflows.find((entry) => entry.name === name);
  return match ? { workflow: match } : { error: `Workflow "${name}" not found. Available: ${workflows.map((entry) => entry.name).join(", ") || "(none)"}` };
}
/** Where /workflows › Save writes a run's script (Claude: user → ~/.claude/workflows, project → nearest existing folder, else git root, else cwd). */
export function saveWorkflowTarget({ scope, cwd, home, name, folders: extraFolders }) {
  const slug = workflowSlug(name), folders = workflowFolders(extraFolders);
  let dir;
  if (scope === "user") dir = folderPath(home, folders[0]);
  else {
    // The nearest folder level that has a workflows folder, in the core's own folder there (folders[0]), so the core's
    // own engine finds the script too; else the git root, else cwd.
    const levels = projectWorkflowDirs(cwd, home, [folders[0]]).map((candidate) => path.resolve(candidate, ...folders[0].split("/").map(() => "..")));
    const level = levels.find((base) => folders.some((folder) => fs.existsSync(folderPath(base, folder))));
    dir = folderPath(level ?? gitRoot(cwd) ?? cwd, folders[0]);
  }
  return { dir, file: path.join(dir, `${slug}.js`), slug };
}

// --- Tool result and notification (Claude mapToolResultToToolResultBlockParam, gdn/ki).
/**
 * The token target of a user's message: Claude Code's "+500k" / "+1.5m" directive (the last one wins), as a token
 * count, or null. A model-started workflow gets it as budget.total.
 */
export function turnTokenTarget(text) {
  if (typeof text !== "string" || !text) return null;
  let found = null;
  for (const match of text.matchAll(/(?:^|[\s(])\+(\d+(?:\.\d+)?)\s*([km])(?![a-z0-9])/gi)) found = match;
  if (!found) return null;
  const value = Math.round(Number(found[1]) * (found[2].toLowerCase() === "m" ? 1_000_000 : 1_000));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
export function workflowLaunchText({ taskId, summary, transcriptDir, scriptPath, runId }) {
  return `Workflow launched in background. Task ID: ${taskId}`
    + (summary ? `\nSummary: ${summary}` : "")
    + (transcriptDir ? `\nTranscript dir: ${transcriptDir}` : "")
    + (scriptPath ? `\nScript file: ${scriptPath}\n(Edit this file and re-invoke Workflow with {scriptPath: "${scriptPath}"} to iterate without resending the script.)` : "")
    + (runId && scriptPath ? `\nRun ID: ${runId}\nTo resume after editing the script: Workflow({scriptPath: "${scriptPath}", resumeFromRunId: "${runId}"}) — completed agents return cached results (cached results may themselves be empty — inspect journal.jsonl before assuming there is something to recover).` : "")
    + "\n\nYou will be notified when it completes. Use /workflows to watch live progress.";
}
const xml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Middle truncation (Claude sc): keeps the start and end of a long text. */
export function middleTruncate(text, max = 10000) {
  const value = String(text);
  if (value.length <= max + 1024) return value;
  const half = Math.floor(max / 2);
  return `${value.slice(0, half)}\n\n... [${value.length - max} characters truncated] ...\n\n${value.slice(value.length - (max - half))}`;
}
const EMPTY_RESULT = /^(\[\s*\]|\{\s*\}|\{\s*"[^"]+"\s*:\s*\[\s*\]\s*\})$/;
/**
 * The <task-notification> a finished run sends the model (Claude gdn). status: completed | failed | stopped
 * (Claude's "killed" reads "was stopped"). result: the script's value (JSON); outputFile: where the full result is.
 */
export function workflowTaskNotification({ taskId, toolUseId, outputFile, status, name, error, result, hasResult, failures = [], transcriptDir, scriptPath, runId, args, agents = [], agentCount, totalTokens = 0, toolUses = 0, durationMs = 0 }) {
  const label = middleTruncate(xml(name || "Dynamic workflow"));
  const summary = middleTruncate(status === "completed" ? `Dynamic workflow "${label}" completed`
    : status === "failed" ? `Dynamic workflow "${label}" failed: ${error ? middleTruncate(xml(error)) : "Unknown error"}`
      : `Dynamic workflow "${label}" was stopped`, 30000);
  const argsText = args !== undefined ? `, args: ${JSON.stringify(args)}` : "";
  let body = "";
  if (status !== "completed") {
    const lines = [];
    if (scriptPath && runId) lines.push(`To resume after editing the script, call: Workflow({scriptPath: '${scriptPath}', resumeFromRunId: '${runId}'${argsText}})`);
    // OpenClaude Desktop's run folder holds the journal (one {"type":"result",...} line per completed agent), not per-agent
    // transcripts as Claude's does.
    if (transcriptDir) lines.push(`Agent results: ${transcriptDir}/journal.jsonl (one {"type":"result",...} line per completed agent)`);
    if (lines.length) body += `\n<recovery>${xml(lines.join("\n"))}</recovery>`;
  }
  if (status === "completed" && hasResult !== false && result !== undefined) {
    const encoded = xml(JSON.stringify(result));
    body += encoded.length > 8000 ? `\n<result>${encoded.slice(0, 8000)}\n... (truncated ${encoded.length - 8000} chars, full result in ${outputFile})</result>` : `\n<result>${encoded}</result>`;
  }
  if (status === "completed" && transcriptDir) {
    const lines = [`Per-agent results: ${transcriptDir}/journal.jsonl — one {"type":"result",...} line per completed agent with its full return value.`,
      "If the result above is empty or unexpected, Read this file BEFORE diagnosing — do not assume agents returned non-empty results."];
    if (scriptPath && runId) lines.push(`To re-run with edited post-processing: Workflow({scriptPath: '${scriptPath}', resumeFromRunId: '${runId}'${argsText}}) — agents whose (prompt, opts) are unchanged replay from cache.`);
    body += `\n<diagnostics>${xml(lines.join("\n"))}</diagnostics>`;
  }
  if (failures.length) body += `\n<failures>${middleTruncate(xml(failures.join("\n")), 40000)}</failures>`;
  let done = 0, failed = 0, skipped = 0, empty = 0;
  for (const agent of agents) {
    if (agent.state === "done") { done++; if (agent.resultPreview === undefined || EMPTY_RESULT.test(agent.resultPreview)) empty++; }
    else if (agent.state === "skipped") skipped++;
    else if (agent.state === "error") failed++;
  }
  body += `\n<usage><agent_count>${agentCount ?? agents.length}</agent_count><agents_done>${done}</agents_done><agents_error>${failed}</agents_error><agents_skipped>${skipped}</agents_skipped><agents_empty_result>${empty}</agents_empty_result><subagent_tokens>${totalTokens}</subagent_tokens><tool_uses>${toolUses}</tool_uses><duration_ms>${durationMs}</duration_ms></usage>`;
  let head = "<task-notification>";
  for (const [tag, value] of [["task-id", taskId], ["tool-use-id", toolUseId], ["output-file", outputFile], ["status", status], ["summary", summary]]) if (value) head += `\n<${tag}>${value}</${tag}>`;
  return `${head}${body}\n</task-notification>`;
}
/**
 * A model-started run that ended because OpenClaude Desktop quit (or crashed) while it ran: Claude Code 2.1.280's
 * orphaned-workflow notification on resume (status stopped, "didn't finish before the previous session ended", the
 * resumeFromRunId recovery line), with this run's own scriptPath and args so the model can relaunch it as is.
 */
export function workflowOrphanNotification({ taskId, toolUseId, name, runId, scriptPath, args }) {
  const label = name ? ` "${middleTruncate(xml(name))}"` : "";
  const summary = `Background workflow${label}${runId ? ` (run ${xml(runId)})` : ""} didn't finish before the previous session ended`;
  const argsText = args !== undefined ? `, args: ${JSON.stringify(args)}` : "";
  const resume = runId && scriptPath ? ` To pick up where it left off, relaunch with Workflow({scriptPath: '${scriptPath}', resumeFromRunId: '${runId}'${argsText}}) — completed agent() calls return cached.`
    : runId ? " To pick up where it left off, relaunch with Workflow({scriptPath, resumeFromRunId}) using the run id from the summary — completed agent() calls return cached." : "";
  const note = `No completion record was found for it in the previous session. It was still running when the previous OpenClaude Desktop process exited.${resume}`;
  let head = "<task-notification>";
  for (const [tag, value] of [["task-id", taskId], ["tool-use-id", toolUseId], ["status", "stopped"], ["summary", summary]]) if (value) head += `\n<${tag}>${value}</${tag}>`;
  return `${head}\n<note>${xml(note)}</note>\n</task-notification>`;
}
/** The message the model receives: the system-notification preface and the notification, as one system reminder. */
export function notificationMessage(notification) {
  const safe = String(notification).replaceAll(/<\s*\/\s*system-reminder\s*>/gi, "&lt;/system-reminder&gt;");
  return `<system-reminder>\n${SYSTEM_NOTIFICATION}${safe}\n</system-reminder>`;
}
export { isWorkflowNotificationText } from "./prefs/workflow-keyword.mjs";
