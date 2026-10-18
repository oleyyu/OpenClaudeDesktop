// Codex data adaptation for the current non-dock jM/EM approval-card branch.
// This model does not grant permissions, hold request identities or invoke IPC.
import { assistantName, escapeRegExp } from "./persona-store.mjs";
import { t, tn } from "../electron/i18n/index.mjs";
import { computerUseAction, computerUseLabel } from "./computer-use-model.mjs";
import { displayCommand } from "./shell-command-model.mjs";
import { devServerDescription } from "./generated/code-current/dev-server-description.mjs";
const COMMAND ="item/commandExecution/requestApproval";
const FILE = "item/fileChange/requestApproval";
const PERMISSIONS = "item/permissions/requestApproval";
// McpServerElicitationRequest (codex-schema-0.155.1): MCP tool-call approvals
// (_meta.codex_approval_kind "mcp_tool_call", empty schema) and an MCP server's own
// form / url elicitations. Any core speaking the app-server protocol may send it.
export const ELICITATION = "mcpServer/elicitation/request";

function nonempty(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function rawText(value) {
  if (value == null) return null;
  if (typeof value === "string") return nonempty(value);
  if (Array.isArray(value) && value.length === 0) return null;
  try { return JSON.stringify(value, null, 2) ?? null; }
  catch { return null; } // IPC data is JSON; do not synthesize truncated details.
}

// The command box shows what will run: the script without Codex's `<shell> -lc '…'`
// wrapper (tui approval_overlay.rs via strip_bash_lc_and_escape), so it names the same
// command as the 'Always allow “…”' button. `raw` keeps the agent's string for a tooltip.
// Any other argv stays JSON so its argument boundaries remain visible.
function commandDetail(value) {
  const { text: shown, raw } = displayCommand(value);
  if (raw && nonempty(shown)) return { kind: "command", text: shown, value, raw: typeof value === "string" ? value : rawText(value) };
  const text = rawText(value);
  return text === null ? null : { kind: "command", text, value };
}

// OpenClaude Desktop's own agent tools (run_in_terminal, a launch.json dev server, Monitor) type or spawn the agent's free
// text as it is: the box shows exactly that, never a `<shell> -c` unwrap, so a workspace program named sh/bash/zsh
// can't hide behind the script it is handed.
function exactCommandDetail(value) {
  const text = rawText(value);
  return text === null ? null : { kind: "command", text, value };
}

// approval-current.js:14521-14534 Write -> "write", Edit/MultiEdit -> "edit", each ...SM(file_path);
// :15201-15205 SM = {meta: Yn(path) basename, detail: full path, clampTitle: true}. Codex
// FileChangeRequestApprovalParams carries no paths, so only item.changes (FileUpdateChange
// {path, kind: PatchChangeKind}) can name the file, and only when it is exactly one change.
// Adaptation: PatchChangeKind "delete" has no source verb (no Delete tool) and stays "edit".
// Legacy string kinds ("update", fixture codex-server.cjs:712) are accepted beside {type}.
function fileHeading(changes) {
  if (!Array.isArray(changes) || changes.length !== 1) return null;
  const path = nonempty(changes[0]?.path);
  if (!path) return null;
  const meta = path.split(/[\\/]/).pop();
  if (!meta) return null;
  const type = typeof changes[0].kind === "string" ? changes[0].kind : changes[0].kind?.type;
  return { action: type === "add" ? t("write") : t("edit"), meta };
}

const singleLine = value => nonempty(value)?.replace(/\s+/g, " ").trim() ?? null;
// approval-current.js:14121-14133 Xj: a change over 200,000 characters gets no preview.
export const PREVIEW_LIMIT = 200000;
export const PREVIEW_TOO_LARGE = t("Preview unavailable \u2014 this change is too large to show here (over 200,000 characters). The full change appears in the conversation after it runs.");
export const previewTooLarge = change => typeof change?.diff === "string" && change.diff.length > PREVIEW_LIMIT;
// KS(path, {singleLine}) (ion-dist cba82325b d): control characters, newlines included,
// show as [U+XXXX] escapes so a path stays one visible line; spaces are kept as spelled.
const pathText = value => nonempty(value)?.replace(/[\u0000-\u001f\u007f-\u009f]/gu,
  char => `[U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}]`) ?? null;
const firstLine = value => singleLine(nonempty(value)?.trim().split("\n")[0]);
function argumentsDetail(value) {
  if (value == null || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)) return null;
  const text = rawText(value);
  return text === null ? null : { kind: "arguments", text, value };
}

// approval-current.js:14508-14595 per-tool copy, read from the transcript item the
// card belongs to (Codex command approvals carry only a command string). Bash -> "run"
// + description meta + command detail (clampTitle); Task/Agent -> "run an agent" +
// description and no detail (:14570-14579); Skill -> "run skill /name"; WebFetch ->
// "fetch url"; WebSearch -> "search the web" + query; anything else -> "use {label}" +
// pretty JSON detail. Adaptations: the DeepSeek core's subagent/subagent_fork tools and
// Codex spawnAgent are agents, whose prompt (first line) stands in for a missing
// description; MCP labels are "tool (server)".
function itemHeading(item, command) {
  // Computer use in any shape: "Allow … to control your computer: Click (512, 300)?" (computer-use-model.mjs).
  const computer = computerUseAction(item);
  if (computer) {
    const { label, meta } = computerUseLabel(computer, "busy");
    return { heading: { action: t("control your computer"), meta: [label, meta].filter(Boolean).join(" ") }, detail: null };
  }
  switch (item?.type) {
    case "commandExecution": {
      const meta = singleLine(item.description);
      if (!meta) return null;
      const detail = commandDetail(command);
      return { heading: { action: t("run"), meta }, detail, clampTitle: detail !== null };
    }
    case "dynamicToolCall": {
      const tool = nonempty(item.tool);
      if (!tool) return null;
      const args = item.arguments && typeof item.arguments === "object" && !Array.isArray(item.arguments) ? item.arguments : {};
      if (tool === "subagent" || tool === "subagent_fork") {
        const description = singleLine(args.description);
        return { heading: { action: t("run an agent"), meta: description ?? firstLine(args.prompt) }, detail: null, clampTitle: !description };
      }
      if (tool === "skill") {
        const name = singleLine(args.name);
        const { name: _name, ...rest } = args;
        return { heading: { action: t("run skill"), meta: name ? `/${name}` : null }, detail: argumentsDetail(rest) };
      }
      if (tool === "web_fetch") return { heading: { action: t("fetch"), meta: singleLine(args.url) }, detail: null };
      if (tool === "web_search") {
        const queries = Array.isArray(args.queries) ? args.queries.filter(query => typeof query === "string") : [];
        return { heading: { action: t("search the web"), meta: singleLine(queries.join(", ")) ?? singleLine(args.query) }, detail: null };
      }
      // A core's own dynamic workflow run (zcode-bridge askWorkflowRun; the DeepSeek core's askWorkflow): the bridge's
      // command is the script summary.
      if (["CreateWorkflow", "AmendWorkflow", "ResumeWorkflowRun", "Workflow", "RunWorkflow", "workflow"].includes(tool) && nonempty(command))
        return { heading: { action: t("run a dynamic workflow"), meta: null }, detail: commandDetail(command) };
      return { heading: { action: t("use {tool}", { tool }), meta: null }, detail: argumentsDetail(item.arguments) };
    }
    case "mcpToolCall": {
      const tool = nonempty(item.tool);
      if (!tool) return null;
      const server = nonempty(item.server);
      return { heading: { action: server ? t("use {tool} ({server})", { tool, server }) : t("use {tool}", { tool }), meta: null }, detail: argumentsDetail(item.arguments) };
    }
    case "webSearch":
      return item.action?.type === "openPage"
        ? { heading: { action: t("fetch"), meta: singleLine(item.action.url) }, detail: null }
        : { heading: { action: t("search the web"), meta: singleLine(item.action?.query) ?? singleLine(item.query) }, detail: null };
    case "collabAgentToolCall": {
      if (item.tool !== "spawnAgent") return null;
      // The DeepSeek core keeps the delegation's description on the item (Codex has none).
      const description = singleLine(item.description);
      return { heading: { action: t("run an agent"), meta: description ?? firstLine(item.prompt) }, detail: null, clampTitle: !description };
    }
    default:
      return null;
  }
}

// ---- mcpServer/elicitation/request ------------------------------------------------
// Mirrors the Codex TUI (tui/src/bottom_pane/mcp_server_elicitation.rs from_parts):
// a null or empty-object schema is a message-only request (Allow / Allow for this
// session when _meta.persist offers "session" / Deny); a form schema of primitive
// fields becomes a small form; url mode opens a link. Unknown shapes can still be
// declined, so the turn always continues.
const plainObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const finite = value => typeof value === "number" && Number.isFinite(value) ? value : null;
export function elicitationPersistModes(meta) {
  const persist = plainObject(meta)?.persist;
  return new Set(typeof persist === "string" ? [persist] : Array.isArray(persist) ? persist.filter(mode => typeof mode === "string") : []);
}
export function isMessageOnlySchema(schema) {
  if (schema == null) return true;
  const value = plainObject(schema), properties = plainObject(value?.properties);
  return value?.type === "object" && !!properties && Object.keys(properties).length === 0;
}
function enumOptions(schema) {
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const options = (schema.oneOf ?? schema.anyOf).map(option => plainObject(option) && typeof option.const === "string"
      ? { value: option.const, label: nonempty(option.title) ?? option.const } : null);
    return options.length && !options.includes(null) ? options : null;
  }
  if (Array.isArray(schema.enum)) {
    const names = Array.isArray(schema.enumNames) ? schema.enumNames : [];
    const options = schema.enum.map((value, index) => typeof value === "string" ? { value, label: nonempty(names[index]) ?? value } : null);
    return options.length && !options.includes(null) ? options : null;
  }
  return undefined;
}
/** One McpElicitationPrimitiveSchema property as a form field, or null when the
 * property is not one of the schema's primitive shapes. */
export function elicitationField(id, schema, required = false) {
  const value = plainObject(schema);
  if (!value) return null;
  const base = { id, label: nonempty(value.title) ?? id, description: nonempty(value.description), required: !!required };
  if (value.type === "string") {
    const options = enumOptions(value);
    if (options === null) return null;
    if (options) return { ...base, type: "select", options, default: options.some(option => option.value === value.default) ? value.default : null };
    return { ...base, type: "text", format: ["email", "uri", "date", "date-time"].includes(value.format) ? value.format : null,
      minLength: count(value.minLength), maxLength: count(value.maxLength), default: typeof value.default === "string" ? value.default : null };
  }
  if (value.type === "number" || value.type === "integer")
    return { ...base, type: value.type, minimum: finite(value.minimum), maximum: finite(value.maximum), default: finite(value.default) };
  if (value.type === "boolean") return { ...base, type: "boolean", default: typeof value.default === "boolean" ? value.default : null };
  if (value.type === "array") {
    const items = plainObject(value.items), options = items && enumOptions(items);
    if (!options || (items.type !== undefined && items.type !== "string" && !items.anyOf)) return null;
    const defaults = Array.isArray(value.default) ? value.default.filter(entry => options.some(option => option.value === entry)) : [];
    return { ...base, type: "multiselect", options, minItems: count(value.minItems), maxItems: count(value.maxItems), default: defaults };
  }
  return null;
}
/** The fields of a form-mode requestedSchema, or null when it cannot be shown. */
export function elicitationFields(schema) {
  const value = plainObject(schema), properties = plainObject(value?.properties);
  if (value?.type !== "object" || !properties) return null;
  const required = new Set(Array.isArray(value.required) ? value.required.filter(id => typeof id === "string") : []);
  const fields = Object.entries(properties).map(([id, property]) => elicitationField(id, property, required.has(id)));
  return fields.length && !fields.includes(null) ? fields : null;
}
/** The draft each field starts with (memory only, owned by the card). */
export function elicitationInitialValues(fields) {
  return Object.fromEntries((fields ?? []).map(field => [field.id,
    field.type === "boolean" ? field.default ?? false
      : field.type === "multiselect" ? [...field.default]
      : field.default == null ? "" : String(field.default)]));
}
const EMAIL = /^[^\s@]+@[^\s@]+$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
function fieldError(field, raw) {
  const name = field.label;
  if (field.type === "boolean") return typeof raw === "boolean" ? { value: raw } : { error: t("{field} is required.", { field: name }) };
  if (field.type === "multiselect") {
    const chosen = Array.isArray(raw) ? field.options.filter(option => raw.includes(option.value)).map(option => option.value) : [];
    if (!chosen.length && !field.required && field.minItems == null) return {};
    if (field.required && !chosen.length) return { error: t("{field} is required.", { field: name }) };
    if (field.minItems != null && chosen.length < field.minItems) return { error: tn(field.minItems, "Choose at least {count} option for {field}.", "Choose at least {count} options for {field}.", { field: name }) };
    if (field.maxItems != null && chosen.length > field.maxItems) return { error: tn(field.maxItems, "Choose at most {count} option for {field}.", "Choose at most {count} options for {field}.", { field: name }) };
    return { value: chosen };
  }
  const text = typeof raw === "string" ? raw : "";
  if (!text.trim()) return field.required ? { error: t("{field} is required.", { field: name }) } : {};
  if (field.type === "select")
    return field.options.some(option => option.value === text) ? { value: text } : { error: t("Choose an available option for {field}.", { field: name }) };
  if (field.type === "number" || field.type === "integer") {
    const number = Number(text.trim());
    if (!Number.isFinite(number)) return { error: t("{field} must be a number.", { field: name }) };
    if (field.type === "integer" && !Number.isInteger(number)) return { error: t("{field} must be a whole number.", { field: name }) };
    if (field.minimum != null && number < field.minimum) return { error: t("{field} must be at least {min}.", { field: name, min: field.minimum }) };
    if (field.maximum != null && number > field.maximum) return { error: t("{field} must be at most {max}.", { field: name, max: field.maximum }) };
    return { value: number };
  }
  const length = [...text].length;
  if (field.minLength != null && length < field.minLength) return { error: t("{field} must be at least {min} characters.", { field: name, min: field.minLength }) };
  if (field.maxLength != null && length > field.maxLength) return { error: t("{field} must be at most {max} characters.", { field: name, max: field.maxLength }) };
  if (field.format === "email" && !EMAIL.test(text.trim())) return { error: t("{field} must be an email address.", { field: name }) };
  if (field.format === "uri") { try { new URL(text.trim()); } catch { return { error: t("{field} must be a URL.", { field: name }) }; } }
  if (field.format === "date" && !DATE.test(text.trim())) return { error: t("{field} must be a date (YYYY-MM-DD).", { field: name }) };
  if (field.format === "date-time" && Number.isNaN(Date.parse(text.trim()))) return { error: t("{field} must be a date and time.", { field: name }) };
  return { value: text };
}
/** {content} ready for an accept response, or {error, fieldId} for the first invalid field.
 * Empty optional fields are left out, as the TUI's field_value does. */
export function elicitationFormContent(fields, values = {}) {
  const content = {};
  for (const field of fields ?? []) {
    const result = fieldError(field, values[field.id]);
    if (result.error) return { error: result.error, fieldId: field.id };
    if (result.value !== undefined) content[field.id] = result.value;
  }
  return { content };
}
// Codex's own wording when no template names the action (core mcp_tool_call.rs
// build_mcp_tool_approval_fallback_message): 'Allow <actor> to run tool "<tool>"?'.
const FALLBACK_TOOL = /^Allow .+ to run tool "(.+)"\?$/s;
const openableUrl = value => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
function toolParamsDetail(meta) {
  const display = Array.isArray(meta?.tool_params_display) ? meta.tool_params_display
    .map(param => plainObject(param) && nonempty(param.name) && "value" in param ? param : null).filter(Boolean) : [];
  if (display.length) {
    const text = display.map(param => `${nonempty(param.display_name) ?? param.name}: ${typeof param.value === "string" ? param.value : rawText(param.value) ?? ""}`).join("\n");
    return { kind: "arguments", text, value: display };
  }
  return argumentsDetail(plainObject(meta?.tool_params) ?? null);
}
// c96d752d0 Kk (2.42304.0) mcp__ branch: an MCP tool's "What Claude sent" rows carry a read gate,
// `rowsReadGate: {hint: e.formatMessage(gD.rowsHint), ...(SD(d)?.server === "terminal" ? {} : {loose: !0})}`
// ("5yDiNk/eg2"). Only a desktop connector's terminal server (mOe) is strict; OpenClaude has no desktop connectors, so
// the gate is always loose (approval-read-gate-model.mjs: held only when the rows can't show whole or aren't laid out).
// D23: the original wording keeps "Claude".
export const rowsReadGate = () => ({ hint: t("Scroll through what Claude sent to allow it."), loose: true });
/** The elicitation's presentation: mode, copy, fields and the actions it offers. */
export function elicitationModel(params, item) {
  const meta = plainObject(params?._meta) ?? {};
  const server = nonempty(params?.serverName) ?? t("An MCP server");
  const message = nonempty(params?.message);
  const persist = elicitationPersistModes(meta);
  const who = assistantName();
  const decline = label => ({ key: "decline", label, primary: false });
  if (params?.mode === "url") {
    const url = nonempty(params.url);
    return { mode: "url", server, message, url, openable: !!url && openableUrl(url),
      title: t("{server} wants you to open a link", { server }),
      deny: decline(t("Decline")), allows: url ? [{ key: "accept", label: t("Done"), primary: true }] : [] };
  }
  // A Codex tool suggestion (_meta.codex_approval_kind 'tool_suggestion', tui bottom_pane/mcp_server_elicitation.rs
  // parse_tool_suggestion_request): Codex suggests installing or turning on an app (connector) or plugin for this
  // request. As the TUI's AppLinkView: the reason and the tool, the install page to open, then 'I installed it'
  // (accept) or 'Not now'; for an installed one, 'Turn on' turns it on and accepts (respond-approval enableSuggested).
  if (params?.mode === "form" && isMessageOnlySchema(params.requestedSchema) && meta.codex_approval_kind === "tool_suggestion"
    && (meta.tool_type === "connector" || meta.tool_type === "plugin") && (meta.suggest_type === "install" || meta.suggest_type === "enable")) {
    const toolName = nonempty(meta.tool_name) ?? nonempty(meta.tool_id) ?? server;
    const url = nonempty(meta.install_url);
    const install = meta.suggest_type === "install";
    const plugin = meta.tool_type === "plugin";
    const canEnable = !install && !!nonempty(meta.tool_id);
    return { mode: "toolSuggestion", server, message: nonempty(meta.suggest_reason), url, openable: !!url && openableUrl(url),
      toolType: meta.tool_type, suggestType: meta.suggest_type, toolId: nonempty(meta.tool_id), toolName,
      title: install ? (plugin ? t("Install the {tool} plugin?", { tool: toolName }) : t("Install {tool}?", { tool: toolName }))
        : (plugin ? t("Turn on the {tool} plugin?", { tool: toolName }) : t("Turn on {tool}?", { tool: toolName })),
      note: install ? (url ? t("Install it in your browser, then come back and choose I installed it.") : t("Install it, then choose I installed it."))
        : t("{name} suggests turning it on for this request.", { name: who }),
      deny: decline(t("Not now")),
      allows: install ? [{ key: "accept", label: t("I installed it"), primary: true }]
        : canEnable ? [{ key: "enableSuggested", label: t("Turn on"), primary: true }] : [{ key: "accept", label: t("Continue"), primary: true }] };
  }
  if (params?.mode === "form" && isMessageOnlySchema(params.requestedSchema)) {
    const tool = meta.codex_approval_kind === "mcp_tool_call";
    // _meta.persist 'always' (Codex's MCP tool approval 'Always allow', tui mcp_server_elicitation.rs): Claude's
    // persistent 'Always allow' (⇧⌘↵, "Don’t ask again for this tool").
    const allows = [...(persist.has("always") ? [{ key: "acceptAlways", label: t("Always allow"), primary: false, persistent: true }] : []),
      ...(persist.has("session") ? [{ key: "acceptForSession", label: t("Allow for this session"), primary: false }] : []),
      { key: "accept", label: tool ? t("Allow once") : t("Allow"), primary: true }];
    if (!tool) return { mode: "confirm", server, message, title: t("{server} is asking for your approval", { server }), deny: decline(t("Deny")), allows };
    // The request describes the exact call it approves (Codex sends _meta.tool_title /
    // tool_params for it, mcp_tool_call.rs build_mcp_tool_approval_elicitation_meta), so
    // its own tool title (or the tool named by Codex's fallback wording) and arguments win.
    // The correlated transcript item (elicitationItem, unambiguous matches only) fills in
    // only what the request leaves out, e.g. a core that sends no _meta.
    const fromItem = item?.type === "mcpToolCall" ? itemHeading(item) : null;
    const fallback = message?.match(FALLBACK_TOOL)?.[1] ?? null;
    const toolName = nonempty(meta.tool_title) ?? fallback;
    const heading = toolName ? { action: t("use {tool} ({server})", { tool: toolName, server }), meta: null } : fromItem?.heading ?? null;
    const metaParams = "tool_params" in meta || Array.isArray(meta.tool_params_display);
    const detail = metaParams ? toolParamsDetail(meta) : fromItem?.detail ?? null;
    return { mode: "approval", server, message: fallback ? null : message, heading,
      title: heading ? t("Allow {name} to {action}?", { name: who, action: heading.action }) : t("Allow {name} to use a tool from {server}?", { name: who, server }),
      toolDescription: nonempty(meta.tool_description), detail, ...(detail && { rowsReadGate: rowsReadGate() }), deny: decline(t("Deny")), allows };
  }
  const fields = params?.mode === "form" ? elicitationFields(params.requestedSchema) : null;
  if (fields) return { mode: "form", server, message, fields, title: t("{server} is asking for information", { server }),
    deny: decline(t("Decline")), allows: [{ key: "accept", label: t("Submit"), primary: true }] };
  // openai/form, a schema with non-primitive fields, or an unknown mode: declinable only.
  return { mode: "unsupported", server, message, title: t("{server} sent a request that can’t be shown here", { server }),
    deny: decline(t("Decline")), allows: [] };
}

// CommandExecutionRequestApprovalParams.availableDecisions (Codex 0.155.1; the TUI builds its options from it,
// approval_overlay.rs): the plain decisions it accepts, and the persistent ones as Claude's 'Always allow' button —
// acceptWithExecpolicyAmendment (a prefix rule Codex saves to its execpolicy: "don't ask again for commands that start
// with …") and applyNetworkPolicyAmendment allow (a host rule). Each persistent button names the offer by its index
// (key 'decision:<n>'); main answers with that exact entry of the request (respond-approval.cjs). null when the core
// sends no list (the bridges): the fixed set stays.
const clipped = (value, max = 40) => { const chars = [...value]; return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : value; };
export function offeredDecisions(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const strings = new Set(list.filter(entry => typeof entry === "string"));
  const persistent = [];
  list.forEach((entry, index) => {
    const value = plainObject(entry);
    if (!value) return;
    // The prefix is worded as the command box shows it (approval_overlay.rs strip_bash_lc_and_escape): Codex's own
    // `<shell> -lc` wrapper is dropped, the raw argv stays in the tooltip, and a prefix that spans lines is never
    // offered as a permanent rule (the TUI hides it too).
    const argv = Array.isArray(value.acceptWithExecpolicyAmendment?.execpolicy_amendment)
      ? value.acceptWithExecpolicyAmendment.execpolicy_amendment.filter(part => typeof part === "string") : [];
    const rawPrefix = argv.join(" ").trim();
    const prefix = rawPrefix ? displayCommand(argv).text.trim() : "";
    // A bridge's project-scoped rule (ZCode 'Always allow in this project': codeDesktop.scope 'project') says so.
    if (prefix && !/[\r\n]/.test(prefix) && !persistent.some(action => action.rule === "prefix"))
      // Worded as Codex's TUI words it: the rule is a prefix, so longer commands that start with it run unasked too.
      persistent.push({ key: `decision:${index}`, rule: "prefix", primary: false, persistent: true,
        label: value.codeDesktop?.scope === "project" ? t("Always allow commands that start with “{prefix}” in this project", { prefix: clipped(prefix) }) : t("Always allow commands that start with “{prefix}”", { prefix: clipped(prefix) }),
        title: value.codeDesktop?.scope === "project" ? t("Saved for this project: commands that start with “{prefix}” will run without asking.", { prefix: rawPrefix }) : t("Saved for every session and project: commands that start with “{prefix}” will run without asking.", { prefix: rawPrefix }) });
    const network = plainObject(value.applyNetworkPolicyAmendment?.network_policy_amendment);
    if (network?.action === "allow" && nonempty(network.host) && !persistent.some(action => action.rule === "host"))
      persistent.push({ key: `decision:${index}`, rule: "host", label: t("Always allow {host}", { host: clipped(network.host) }), title: network.host, primary: false, persistent: true });
  });
  return { strings, persistent };
}
export function approvalCardModel(request, item) {
  const params = request?.params ?? {};
  const method = request?.method;
  if (method === ELICITATION) {
    const elicitation = elicitationModel(params, item);
    const context = [];
    if (elicitation.toolDescription) context.push({ key: "tool-description", text: elicitation.toolDescription });
    if (elicitation.note) context.push({ key: "tool-suggestion", text: elicitation.note });
    if ((elicitation.mode === "url" || elicitation.mode === "toolSuggestion") && elicitation.url && !elicitation.openable)
      context.push({ key: "url-unopenable", text: t("This link can’t be opened from here. Copy it into a browser if you trust it.") });
    const detail = (elicitation.mode === "url" || elicitation.mode === "toolSuggestion") && elicitation.url ? { kind: "url", text: elicitation.url, value: elicitation.url } : elicitation.detail ?? null;
    const { deny, allows, title, heading } = elicitation;
    return { kind: "elicitation", supported: true, title, ...(heading && { heading }), reason: null,
      message: elicitation.message ?? null, context, detail, ...(elicitation.rowsReadGate && detail && { rowsReadGate: elicitation.rowsReadGate }), deny, allows, elicitation };
  }
  const kind = method === COMMAND ? "command" : method === FILE ? "file"
    : method === PERMISSIONS ? "permissions" : "unsupported";
  // A connector's model request (the OpenCode bridge's codeDesktop.sampling: MiMo MCP sampling): who asks, the model that
  // will run, what it sends and short prompt previews, never a shell command box.
  if (kind === "command" && plainObject(params.codeDesktop?.sampling)) return samplingCard(params);
  // OpenClaude Desktop's own agent tools (main.cjs agentToolCard): a command typed into the terminal, an outside site or a
  // launch.json dev server in the preview, a dynamic workflow; the app answers it, not the core.
  if (kind === "command" && plainObject(params.codeDesktop?.agentTool)) return agentToolCard(params);
  const context = [];
  const add = (key, text) => { if (nonempty(text)) context.push({ key, text }); };
  // approval-current.js:15275-15284 decision reason: its own block, not context.
  // A bridge's fixed English reason ('Ask permissions mode is on.') reads in the UI language when the dictionary has it.
  const reason = nonempty(params.reason) ? t(nonempty(params.reason)) : null;
  // A terminal's stdin approval keeps its own copy; other command approvals name
  // the tool from the item. Its detail wins over params.command (for a non-bash
  // tool the DeepSeek core sends "<tool> <json>" there). The source card has no
  // working-directory row (approval-current.js:15561-15591 EM blocks; Bash copy
  // :14507-14515), so only the item-less fallback keeps that local line.
  const derived = kind === "command" && params.kind !== "writeStdin"
    ? itemHeading(item, params.command ?? item?.command) : null;
  const cwd = nonempty(params.cwd) ?? nonempty(item?.cwd);
  if (cwd && !derived) add("cwd", t("Working directory: {cwd}", { cwd }));
  if (kind === "command" && params.networkApprovalContext) {
    const { protocol, host } = params.networkApprovalContext;
    const target = [nonempty(protocol), nonempty(host)].filter(Boolean).join("://");
    if (target) add("network", t("Network access: {target}", { target }));
  }
  if (kind === "file" && nonempty(params.grantRoot))
    add("grant-root", t("Requested write root: {root}", { root: params.grantRoot }));
  if (kind === "permissions") add("scope", t("Applies to this turn only."));

  let detail = null;
  if (derived) detail = derived.detail;
  else if (kind === "command") {
    detail = commandDetail(params.command ?? item?.command);
    if (detail === null) add("missing-detail", t("Command details were not provided."));
  } else if (kind === "file") {
    // approval-current.js:15201-15205 SM: the detail is the full path (KS singleLine)
    // under the "{write|edit} {basename}" heading; several changes list every path.
    // value keeps the changes for the in-card preview (:15596-15607 yce).
    const value = params.changes ?? item?.changes;
    if (Array.isArray(value) && value.length) {
      detail = { kind: "path", text: value.map(change => pathText(change?.path)).filter(Boolean).join("\n"), value };
      // :15501-15506 V / :14792-14798 fM (Xj: any string over 200,000 characters).
      if (value.some(previewTooLarge))
        add("too-large", PREVIEW_TOO_LARGE);
    } else {
      const text = rawText(value);
      if (text !== null) detail = { kind: "changes", text, value };
      else add("missing-detail", t("File change details were not provided."));
    }
  } else if (kind === "permissions") {
    const value = params.permissions;
    const text = rawText(value);
    if (text !== null) detail = { kind: "permissions", text, value };
    else add("missing-detail", t("Permission details were not provided."));
  } else add("method", nonempty(method) ?? t("The request type was not provided."));

  const heading = kind === "file" ? fileHeading(detail?.value) : derived?.heading ?? null;
  // EM y (approval-current.js:15254): a detail equal to the meta (a bare file name) is no
  // detail at all, so the card has no path box, no preview (:15596-15607) and no toggle.
  if (detail?.kind === "path" && heading?.meta && detail.text === heading.meta) detail = null;
  const clampTitle = kind === "file" ? !!heading : !!derived?.clampTitle;
  const who = assistantName(); // C2 persona; "DeepSeek" by default
  const title = heading ? t("Allow {name} to {action}?", { name: who, action: `${heading.action}${heading.meta ? ` ${heading.meta}` : ""}` })
    : kind === "command"
      ? params.kind === "writeStdin" ? t("Allow {name} to send input to this terminal?", { name: who }) : t("Allow {name} to run this command?", { name: who })
      : kind === "file" ? t("Allow {name} to edit files?", { name: who })
      : kind === "permissions" ? t("Allow {name} to use these permissions?", { name: who }) : t("Unsupported approval request");
  const supported = kind !== "unsupported";
  const offered = kind === "command" || kind === "file" ? offeredDecisions(params.availableDecisions) : null;
  const deny = !supported ? null : kind === "permissions" ? { key: "deny", label: t("Deny"), primary: false }
    // Codex lists what it accepts: Deny is its 'decline' when offered, else 'cancel' (stop and wait for the user).
    : { key: offered && !offered.strings.has("decline") && offered.strings.has("cancel") ? "cancel" : "decline", label: t("Deny"), primary: false };
  // sessionGrantable (DeepSeek core): false when the core would not remember the
  // grant, e.g. a full-access file escalation (source disableAlwaysAllow).
  const allows = !supported ? [] : kind === "permissions"
    ? [{ key: "allow", label: t("Allow for this turn"), primary: true }]
    : offered ? [...offered.persistent,
        ...(offered.strings.has("acceptForSession") ? [{ key: "acceptForSession", label: t("Allow for this session"), primary: false }] : []),
        { key: "accept", label: t("Allow once"), primary: true }]
    : [...(params.sessionGrantable === false ? [] : [{ key: "acceptForSession", label: t("Allow for this session"), primary: false }]),
       { key: "accept", label: t("Allow once"), primary: true }];
  // codeDesktop.declineFeedback (the OpenCode bridge): Deny may carry what to do instead, which the core gets as the
  // rejection's message (OpenCode continues with it); without it Deny stops the agent as the core decides.
  const declineFeedback = supported && (kind === "command" || kind === "file") && deny?.key === "decline" && params.codeDesktop?.declineFeedback === true;
  // Kk mcp__ branch: a core's command approval for an MCP tool call (the item names it) gates its arguments as the
  // elicitation's tool card does.
  const mcpRows = !!derived && item?.type === "mcpToolCall" && detail?.kind === "arguments";
  return { kind, supported, title, ...(heading && { heading }), ...(clampTitle && { clampTitle }), reason, context, detail, ...(mcpRows && { rowsReadGate: rowsReadGate() }), deny, allows, ...(declineFeedback && { declineFeedback }) };
}

const byteSize = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : tn(bytes, "{count} byte", "{count} bytes");
function samplingCard(params) {
  const sampling = params.codeDesktop.sampling;
  const server = nonempty(sampling.server) ?? t("A connector");
  const context = [];
  const add = (key, text) => { if (nonempty(text)) context.push({ key, text }); };
  if (nonempty(sampling.model)) add("sampling-model", t("Model: {model}", { model: sampling.model }));
  const types = (Array.isArray(sampling.contentTypes) ? sampling.contentTypes : []).map(type => ({ text: t("text"), image: t("images"), audio: t("audio") })[type] ?? type);
  if (types.length) add("sampling-content", t("Sends: {types}", { types: types.join(", ") }));
  if (Number.isFinite(sampling.audioBytes) && sampling.audioBytes > 0) add("sampling-audio", tn(sampling.audioClips || 1, "Audio: {size} in {count} clip", "Audio: {size} in {count} clips", { size: byteSize(sampling.audioBytes) }));
  if (Number.isSafeInteger(sampling.maxTokens)) add("sampling-tokens", t("Up to {count} output tokens", { count: sampling.maxTokens.toLocaleString() }));
  const prompts = [nonempty(sampling.systemPrompt) && t("System prompt: {text}", { text: sampling.systemPrompt }), nonempty(sampling.textPrompt) && t("Prompt: {text}", { text: sampling.textPrompt })].filter(Boolean);
  const detail = prompts.length ? { kind: "arguments", text: prompts.join("\n\n"), value: prompts } : null;
  const allows = [...(params.sessionGrantable === false ? [] : [{ key: "acceptForSession", label: t("Allow for this session"), primary: false }]), { key: "accept", label: t("Allow once"), primary: true }];
  return { kind: "command", supported: true, title: t("Allow {server} to run a model request on your account?", { server }), heading: { action: t("run a model request for {server}", { server }), meta: nonempty(sampling.model) ?? null },
    reason: t("Model requests from a connector are billed like your own messages."), context, detail, deny: { key: "decline", label: t("Deny"), primary: false }, allows,
    ...(params.codeDesktop?.declineFeedback === true ? { declineFeedback: true } : {}), sampling: true };
}

// wA's intl (the generated helper calls e.formatMessage({defaultMessage, id}, values)): the local dictionary keys
// are the English source strings.
const DEV_SERVER_INTL = Object.freeze({ formatMessage: (message, values) => t(message.defaultMessage, values) });

// The official 2.2553.1 wording: 'run a command in your terminal' ('In {folder}, in a tab named {title}'), 'preview
// this page', 'run a dynamic workflow {name}' with the token warning and its Tasks pane pointer.
function agentToolCard(params) {
  const tool = params.codeDesktop.agentTool;
  const who = assistantName();
  const context = [];
  const add = (key, text) => { if (nonempty(text)) context.push({ key, text }); };
  const folder = nonempty(params.cwd);
  const deny = { key: "decline", label: t("Deny"), primary: false };
  const once = [{ key: "accept", label: t("Allow once"), primary: true }];
  const card = (heading, rest) => ({ kind: "command", supported: true, title: t("Allow {name} to {action}?", { name: who, action: `${heading.action}${heading.meta ? ` ${heading.meta}` : ""}` }),
    heading, reason: null, context, detail: null, deny, allows: once, agentTool: tool.kind, ...rest });
  if (tool.kind === "terminal-command") {
    const tab = nonempty(tool.tabTitle);
    add("cwd", folder && tab ? t("In {folder}, in a tab named {title}", { folder, title: tab }) : folder ? t("In {folder}", { folder }) : null);
    add("note", tool.detail);
    return card({ action: t("run a command in your terminal"), meta: null }, { detail: exactCommandDetail(params.command), reason: t("It runs in your own shell, outside the sandbox, and keeps running after this turn. You can watch it and stop it in the Terminal pane.") });
  }
  // An approved site or dev server stays approved for the rest of the session (preview-service.cjs approvedHosts /
  // approvedServers), so the one allow button says so.
  const forSession = [{ key: "accept", label: t("Allow for this session"), primary: true }];
  if (tool.kind === "preview-site") {
    const host = nonempty(tool.host) ?? nonempty(tool.url);
    return card({ action: t("use {host} in the preview", { host: host ?? "" }).trim(), meta: null }, { detail: nonempty(tool.url) ? { kind: "url", text: tool.url, value: tool.url } : null,
      reason: t("{assistant} will be able to read this site and click and type on it in this session. Only allow sites you trust.", { assistant: who }), allows: forSession });
  }
  if (tool.kind === "preview-server") {
    // c96d752d0 Kk (2.42304.0) preview_start branch: `overrideDescription: wA(e, p("cwd"), port, f.portMayReassign === !0)`
    // (generated devServerDescription; "Runs in {cwd} on port {port}" …). The launch.json port comes from
    // preview-service.cjs approveServer; portMayReassign stays false there until the port policy is the original's
    // next-free-port scan (preview-01), so the "(or the next free port)" suffix is never claimed.
    add("description", devServerDescription(DEV_SERVER_INTL, folder ?? undefined, typeof tool.port === "number" ? tool.port : undefined, tool.portMayReassign === true));
    // launch.json's env (main.cjs agentToolCard): every variable, and a warning for those that change what runs.
    const env = Array.isArray(tool.env) ? tool.env.filter((line) => typeof line === "string" && line) : [];
    if (env.length) add("env", [t("With these environment variables:"), ...env, ...(Number(tool.envMore) > 0 ? [t("and {count} more", { count: Number(tool.envMore) })] : [])].join("\n"));
    const risky = Array.isArray(tool.envRisky) ? tool.envRisky.filter((name) => typeof name === "string" && name) : [];
    if (risky.length) add("env-warning", t("Warning: {names} can make it run a different program or load other code than the command shows. Allow it only if you set these yourself.", { names: risky.join(", ") }));
    // Kk: `action: t ? "start" ("zTylMMruGq") : "start a dev server" ("/dKfET3Xgr"), meta: t, clampTitle: !0` — the
    // server's name is the title's meta ("Allow … to start web?").
    const name = nonempty(tool.name);
    return card({ action: name ? t("start") : t("start a dev server"), meta: name }, { detail: exactCommandDetail(params.command), clampTitle: true,
      reason: t("The command runs on your computer outside {assistant}’s sandbox, with your permissions and network access. Only allow commands you trust.", { assistant: who }), allows: forSession });
  }
  // Monitor (agent-tools/monitor.mjs): the command, its folder, and where it is stopped.
  if (tool.kind === "monitor") {
    add("cwd", folder ? t("In {folder}", { folder }) : null);
    return card({ action: t("watch a command in the background"), meta: nonempty(tool.description) }, { detail: exactCommandDetail(params.command),
      reason: t("It runs in your own shell, outside the sandbox, until it ends or its time runs out, and each line it prints is sent to {assistant}. You can stop it in the Background tasks pane.", { assistant: who }) });
  }
  // CronCreate (agent-tools/schedule.mjs): Claude's "Scheduling prompt" / "Starting loop", the cadence and the prompt.
  if (tool.kind === "schedule") {
    const once = tool.recurring === false;
    const prompt = nonempty(tool.prompt);
    return card({ action: once ? t("schedule a prompt") : t("start a loop"), meta: nonempty(tool.humanSchedule) ?? nonempty(tool.cron) }, {
      detail: prompt ? { kind: "arguments", text: prompt, value: prompt } : null,
      reason: once ? t("The prompt runs once in this session when it’s due and the session is idle, with the session’s current permissions. You can stop it in the Background tasks pane.")
        : t("The prompt runs in this session each time it’s due and the session is idle, with the session’s current permissions, for up to 7 days. You can stop it in the Background tasks pane.") });
  }
  // reveal_path / open_in_editor (agent-tools/host.mjs): the resolved path the card shows, as Claude's does.
  if (tool.kind === "open-path") {
    const file = nonempty(tool.path) ?? "";
    const name = file.split("/").pop() || file;
    const action = tool.action === "editor" ? t("open {file} in {editor}", { file: name, editor: nonempty(tool.editor) ?? t("your editor") }) : t("show {file} in Finder", { file: name });
    if (Number.isInteger(tool.line)) add("line", t("At line {line}", { line: tool.line }));
    return card({ action, meta: null }, { detail: file ? { kind: "arguments", text: file, value: file } : null });
  }
  // NotebookEdit (agent-tools/notebook.mjs): which notebook, which cell, and the new source.
  if (tool.kind === "notebook-edit") {
    const file = nonempty(tool.path);
    const name = file ? file.split("/").pop() : "";
    add("cwd", tool.cellId ? t("Cell {cell}", { cell: tool.cellId }) : null);
    const source = tool.mode === "delete" ? null : nonempty(tool.source);
    return card({ action: tool.mode === "delete" ? t("delete a cell in {file}", { file: name }) : tool.mode === "insert" ? t("add a cell to {file}", { file: name }) : t("edit {file}", { file: name }), meta: null },
      { detail: source ? { kind: "arguments", text: source, value: source } : null, reason: file && file !== name ? file : null });
  }
  // WebFetch (agent-tools/web.mjs): a site's page, once or for the rest of the session.
  if (tool.kind === "web-fetch") {
    const host = nonempty(tool.host) ?? nonempty(tool.url) ?? "";
    return card({ action: t("fetch {host}", { host }), meta: null }, { detail: nonempty(tool.url) ? { kind: "url", text: tool.url, value: tool.url } : null,
      reason: t("{assistant} will read this page’s content. Allow it for this session to let {assistant} read other pages from this site without asking.", { assistant: who }),
      allows: [{ key: "acceptForSession", label: t("Allow for this session"), primary: false }, { key: "accept", label: t("Allow once"), primary: true }] });
  }
  if (tool.kind === "workflow") {
    const phases = Array.isArray(tool.phases) ? tool.phases.filter(phase => nonempty(phase?.title)) : [];
    const lines = [nonempty(tool.description)];
    if (phases.length) lines.push("", t("This dynamic workflow will spin up multiple subagents across the following phases:"), ...phases.map((phase, index) => `${index + 1}. ${phase.title}${nonempty(phase.detail) ? ` — ${phase.detail}` : ""}`));
    if (nonempty(tool.args)) lines.push("", t("Arguments: {args}", { args: tool.args }));
    if (nonempty(tool.note)) lines.push("", tool.note);
    const text = lines.filter((line, index, all) => line !== null && (line || (index > 0 && all[index - 1]))).join("\n").trim();
    const name = nonempty(tool.name);
    // Claude's dialog: the raw script shown outright when meta has no phases (all there is to read about the run),
    // else behind "View raw script" (source-session.jsx WorkflowApprovalDetail).
    const script = nonempty(tool.script);
    const detail = script ? { kind: "workflow", text, value: text, script, scriptOpen: !phases.length, scriptTruncated: tool.scriptTruncated === true }
      : text ? { kind: "arguments", text, value: text } : null;
    return card({ action: t("run a dynamic workflow"), meta: name }, {
      detail,
      reason: t("Dynamic workflows can use a lot of tokens quickly by running many subagents in parallel — which counts against your usage limit. Stop a running workflow at any time in the Tasks pane, or turn off Dynamic workflows in Settings."),
      deny: { key: "decline", label: t("No"), primary: false },
      allows: [...(tool.always === true && name ? [{ key: "acceptForSession", label: t("Yes, and don’t ask again for {name}", { name }), primary: false }] : []), { key: "accept", label: t("Yes, run it"), primary: true }],
    });
  }
  add("note", tool.detail);
  return card({ action: nonempty(tool.title) ? tool.title.replace(/[?？]$/, "") : t("continue"), meta: null }, {});
}

// approval-current.js:14649-14658 iM: one whitespace-collapsed line, capped at 150
// code points with ", truncated".
function announceText(text) {
  const line = text.replace(/\s+/g, " ").trim(), chars = [...line];
  return chars.length <= 150 ? line : t("{text}, truncated", { text: chars.slice(0, 150).join("") });
}
/** pM (approval-current.js:14799-14905): the live-region text for a new request,
 * "Permission requested: {action}. {detail}, {meta}" from the card copy (oM action,
 * iM detail when it differs from the meta, sM meta), then each extra block as
 * "{announcement}. {extra}" — the decision reason capped, the too-large sentence
 * (dM) in full. A headingless local title announces its own phrase. */
export function approvalAnnouncement(model) {
  if (!model) return "";
  const heading = model.heading;
  const action = announceText(heading ? heading.action
    : model.title.replace(new RegExp(`^Allow ${escapeRegExp(assistantName())} to `), "").replace(/^Allow DeepSeek to /, "").replace(/[?？]$/, ""));
  const meta = heading?.meta ? announceText(heading.meta) : null;
  const detail = model.detail?.text && model.detail.text !== heading?.meta ? announceText(model.detail.text) : null;
  let text = detail && meta ? t("Permission requested: {action}. {detail}, {meta}", { action, detail, meta })
    : detail ? t("Permission requested: {action}. {detail}", { action, detail })
    : meta ? t("Permission requested: {action}, {meta}", { action, meta })
    : t("Permission requested: {action}", { action });
  const extras = [model.reason && announceText(model.reason), model.message && announceText(model.message),
    ...model.context.filter(part => part.key === "too-large").map(part => part.text)];
  for (const extra of extras) if (extra?.trim()) text = t("{text}. {extra}", { text, extra });
  return text;
}

export function approvalActionIndex(key, current, count) {
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1
    : key === "ArrowRight" || key === "ArrowDown" ? 1 : 0;
  if (!direction || count <= 0) return null;
  return current < 0 ? direction > 0 ? 0 : count - 1
    : (current + direction + count) % count;
}

/** A key bubbling within this card (target "card", "actions", "content" or "editor"), or one the card's
 * document-level hotkeys (use-card-hotkeys.js) took from the session's empty composer or an unfocused page,
 * which they pass as "content". Root remains responsible for current-pane/menu state. */
export function approvalKeyIntent(event, { target, model, busy = false,
  active = true, menuOpen = false, armed = true } = {}) {
  if (!model?.supported || busy || !active || menuOpen || event.defaultPrevented ||
      event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.nativeEvent?.keyCode === 229 ||
      target === "editor" || event.altKey) return null;
  if (event.repeat) return ["Enter", " ", "Escape"].includes(event.key) ? { type: "suppress" } : null;
  if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.shiftKey)
    return { type: "action", action: model.deny.key };
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    if (!armed) return { type: "suppress" };
    // The local permission adapter remains turn-only even for the shifted chord.
    // The shifted chord is the persistent allow (Claude's 'Always allow', ⇧⌘↵) where one is offered, else the session one.
    const action = model.kind === "permissions" ? "allow"
      : event.shiftKey ? model.allows.find(allow => allow.persistent)?.key ?? "acceptForSession" : "accept";
    // approval-hotkeys-current.js:100 allowPersistent?.(): no session grant, no action.
    if (!model.allows.some(allow => allow.key === action)) return { type: "suppress" };
    return { type: "action", action };
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey) return null;
  if (target === "card" && event.key === "Enter") return { type: "focus-primary" };
  if ((target === "card" || target === "actions") && event.key.startsWith("Arrow"))
    return approvalActionIndex(event.key, -1, 1) === null ? null : { type: "navigate", key: event.key };
  return null;
}

export function detailsOverflow(metrics) {
  return metrics.scrollHeight > metrics.clientHeight;
}

/** cf6ae6197 bv (approval-current.js Up): a clamped region takes keyboard focus,
 * role group and its label (e.g. "Reason") only while its content overflows. */
export function scrollRegionProps(label, overflow) {
  return overflow ? { tabIndex: 0, role: "group", "aria-label": label } : {};
}

/** approval-hotkeys ep C/S + shared-6 aR. Visibility is observational here;
 * eligibility still needs a fresh geometry check at the actual key event.
 * This clock is deliberately independent of the allow-click arming clock. */
export function createApprovalHotkeyArming({ now = Date.now, active = true } = {}) {
  let requestOrReentryAt = now(), activationAt = -Infinity;
  let wasActive = active, hiddenObserved = false;
  return {
    observeVisibility({ intersecting, visible }) {
      if (!intersecting || !visible) { hiddenObserved = true; return false; }
      if (!hiddenObserved) return false;
      hiddenObserved = false;
      requestOrReentryAt = now();
      return true;
    },
    setActive(value) {
      if (value && !wasActive) activationAt = now();
      wasActive = value;
    },
    isArmed() {
      const time = now();
      return time - requestOrReentryAt >= 400 && time - activationAt >= 400;
    },
  };
}

/** shared-6 Zt -> nR/rR: partial intersection is eligible; fully clipped or
 * offscreen cards yield. These are synchronous measurements, not IO state. */
export function approvalHasVisibleIntersection({ rect, viewport, clips = [], visible = true } = {}) {
  if (!visible || !rect || !viewport || viewport.width <= 0 || viewport.height <= 0 ||
      rect.right <= rect.left || rect.bottom <= rect.top) return false;
  let { top, bottom, left, right } = rect;
  const pixels = value => typeof value === "string" && value.endsWith("px") ? parseFloat(value) || 0 : 0;
  for (const clip of clips) {
    if (clip.overflowY !== "visible") {
      top = Math.max(top, clip.rect.top + pixels(clip.scrollPaddingTop));
      bottom = Math.min(bottom, clip.rect.bottom - pixels(clip.scrollPaddingBottom));
    }
    if (clip.overflowX !== "visible") {
      left = Math.max(left, clip.rect.left);
      right = Math.min(right, clip.rect.right);
    }
  }
  return bottom > Math.max(0, top) && top < viewport.height &&
    right > Math.max(0, left) && left < viewport.width;
}

// ---- the transcript item a request belongs to --------------------------------------
// Command, file and permission requests name their item (params.itemId). An MCP elicitation names none: it belongs
// to an in-progress mcpToolCall of the same server in the same turn (Codex starts the item, then asks;
// mcp_tool_call.rs handle_mcp_tool_call). A server that allows parallel calls can have several running at once, so
// the request is tied to an item only when that is unambiguous: the one candidate whose tool matches Codex's
// fallback wording and whose arguments deep-equal _meta.tool_params, or else the only candidate left. Anything
// else names no item, and the card shows the request's own _meta. A request with no turn matches only an item
// without one.
const jsonValue = value => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};
function sameJson(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => sameJson(value, b[index]));
  if (!plainObject(a) || !plainObject(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}
export function elicitationItem(request, items = []) {
  if (request?.method !== ELICITATION) return undefined;
  const params = request.params ?? {};
  const server = nonempty(params.serverName);
  if (!server || !Array.isArray(items)) return undefined;
  const turnId = params.turnId ?? null;
  const meta = plainObject(params._meta) ?? {};
  const fallback = nonempty(params.message)?.match(FALLBACK_TOOL)?.[1] ?? null;
  let candidates = items.filter(item => item?.type === "mcpToolCall" && item.status === "inProgress" && item.server === server
    && (item.turnId ?? null) === turnId);
  if (fallback) candidates = candidates.filter(item => typeof item.tool !== "string" || item.tool === fallback);
  if ("tool_params" in meta) {
    const matches = candidates.filter(item => sameJson(jsonValue(item.arguments) ?? null, meta.tool_params ?? null));
    if (matches.length) return matches.length === 1 ? matches[0] : undefined;
  }
  // No argument match (a core without _meta, or Codex params rewritten by an approval template): only a lone call.
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function approvalItem(request, items = []) {
  if (request?.method === ELICITATION) return elicitationItem(request, items);
  const itemId = request?.params?.itemId;
  return itemId && Array.isArray(items) ? items.find(item => item?.id === itemId) : undefined;
}
// Rows that read 'Needs approval' while an elicitation waits: the correlated mcpToolCall items (unambiguous only).
export function pendingElicitationItemIds(approvals = [], items = []) {
  const ids = new Set();
  for (const approval of approvals) {
    const item = elicitationItem(approval, items);
    if (item?.id) ids.add(item.id);
  }
  return ids;
}

// ---- Plan → implement handoff (cores without permission hints) ---------------------
// A core speaking the protocol natively ends a Plan turn with a plan item and waits: Codex's own client then asks
// "Implement this plan?" (codex-rs tui chatwidget/plan_implementation.rs). The handoff is offered for the session's
// newest turn when it holds a non-empty plan item, nothing runs or waits for an answer, the session is still in Plan
// (code mode) and the user has not answered it for that turn. A core with permission hints has its own plan review
// (the DeepSeek bridge's exit_plan_mode card), so it never gets one. Returns {turnId, planItemId} or null.
export { planHandoff } from '../electron/plan-handoff.mjs';
