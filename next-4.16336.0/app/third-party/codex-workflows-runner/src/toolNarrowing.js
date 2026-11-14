// Local (Code Desktop): agent() opts.disallowedTools and opts.bashCommandClamp, as Claude Code 2.1.280 defines them.
// Both are validated exactly as Claude validates them (a malformed value refuses the spawn rather than running it
// un-narrowed), normalized to a sorted, de-duplicated list (an empty list means "unset", as in Claude, so the resume
// identity matches), then mapped onto the tool controls the running core really has:
//   • every core honors thread/start `sandbox`: excluding a file-write tool (Write, Edit, MultiEdit, NotebookEdit) or
//     the shell (Bash, PowerShell, …) runs the agent read-only. The cores have one file-change tool and their reads
//     go through the shell, so a read-only, sandboxed shell is the closest equivalent of Claude's Read/Grep/Glob-only
//     pool, and nothing the agent runs can write or (on Codex) reach the network.
//   • native Codex also takes per-thread config overrides: WebSearch/WebFetch turn web search off, Agent/Task turn
//     sub-agents off, and mcp__… entries disable the matching MCP servers or tools of the effective config.
//   • a core that cannot remove a requested tool (the bridges have no per-tool switch), and any non-empty
//     bashCommandClamp (no core can limit its shell to listed commands over the app-server protocol), refuse the
//     spawn with an explanation instead of running the agent with more tools than the script allowed.

export class ToolNarrowingError extends Error {
  constructor(message) { super(message); this.name = "ToolNarrowingError"; }
}

const padded = (list) => list.some((entry) => typeof entry !== "string" || entry === "" || entry !== entry.trim());
const describe = (value) => Array.isArray(value) ? "an array with non-string, empty, or whitespace-padded entries" : typeof value;
const normalized = (list) => list.length === 0 ? undefined : [...new Set(list)].sort();

// Claude's permission-rule parse: "Tool(content)" -> {toolName, ruleContent}; a bare "Tool" has no content.
export function parseRule(rule) {
  const match = /^([^()]*)\(([\s\S]*)\)$/.exec(rule);
  return match ? { toolName: match[1], ruleContent: match[2] } : { toolName: rule, ruleContent: undefined };
}

/** Claude's checks and normalization. Returns {disallowedTools?, bashCommandClamp?}; throws ToolNarrowingError. */
export function normalizeToolOptions(opts = {}) {
  const out = {};
  const tools = opts.disallowedTools;
  if (tools !== undefined) {
    if (!Array.isArray(tools) || padded(tools)) throw new ToolNarrowingError(`agent() opts.disallowedTools must be an array of non-empty tool-name strings (e.g. ['Bash', 'Write']); got ${describe(tools)}. Refusing the spawn rather than running it un-narrowed.`);
    out.disallowedTools = normalized(tools);
  }
  const clamp = opts.bashCommandClamp;
  if (clamp !== undefined) {
    if (!Array.isArray(clamp) || padded(clamp)) throw new ToolNarrowingError(`agent() opts.bashCommandClamp must be an array of non-empty strings; got ${describe(clamp)}. Refusing the spawn rather than running it un-clamped.`);
    const entries = normalized(clamp);
    for (const entry of entries ?? []) {
      const { toolName, ruleContent } = parseRule(entry);
      if (toolName !== "Bash" || ruleContent === undefined || ruleContent === "" || ruleContent !== ruleContent.trim()) {
        throw new ToolNarrowingError(`agent() opts.bashCommandClamp entry '${entry}' must be a 'Bash(<command or prefix>)' permission rule (tool name case-sensitive, non-empty content with no leading/trailing whitespace inside the parens); it parses to tool '${toolName}'`
          + (ruleContent === undefined || ruleContent === "" ? " with no rule content" : ruleContent !== ruleContent.trim() ? " with whitespace-padded rule content" : "")
          + ". Refusing the spawn rather than running it with an inert clamp entry.");
      }
    }
    out.bashCommandClamp = entries;
  }
  return out;
}

/** opts with both options normalized (unset keys removed). Throws ToolNarrowingError on a malformed value. */
export function withNormalizedToolOptions(opts = {}) {
  if (opts.disallowedTools === undefined && opts.bashCommandClamp === undefined) return opts;
  const next = { ...opts, ...normalizeToolOptions(opts) };
  for (const key of ["disallowedTools", "bashCommandClamp"]) if (next[key] === undefined) delete next[key];
  return next;
}

/** An agentType's own disallowedTools merged with the call's (Claude: [...definition, ...opts]). */
export function mergeDisallowed(...lists) {
  const all = lists.flatMap((list) => Array.isArray(list) ? list : []);
  return all.length ? [...new Set(all)].sort() : undefined;
}

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell", "BashOutput", "KillShell", "Monitor"]);
const WEB_TOOLS = new Set(["WebSearch", "WebFetch"]);
const AGENT_TOOLS = new Set(["Agent", "Task"]);
const isMcp = (name) => name.startsWith("mcp__");

/** Which controls a tool list needs: {readOnly, web, agents, mcp:[…], other:[…]}. */
export function classifyTools(tools = []) {
  const plan = { readOnly: [], web: [], agents: [], mcp: [], other: [] };
  for (const name of tools) {
    if (WRITE_TOOLS.has(name) || SHELL_TOOLS.has(name)) plan.readOnly.push(name);
    else if (WEB_TOOLS.has(name)) plan.web.push(name);
    else if (AGENT_TOOLS.has(name)) plan.agents.push(name);
    else if (isMcp(name)) plan.mcp.push(name);
    else plan.other.push(name); // no separate tool on these cores (Read, Grep, TodoWrite, …) or unknown: as in Claude, a no-op
  }
  return plan;
}

// Native Codex builds its user agent from the client's originator (`<clientInfo.name>/<version> …`); Code Desktop's
// bridges (DeepSeek, OpenCode/MiMo, ZCode, the ACP agents) answer with their own `code-desktop-…-core/bridge` agent.
export function coreToolControls(client, clientOptions) {
  const userAgent = String(client?.serverInfo?.userAgent ?? "");
  const name = clientOptions?.clientInfo?.name ?? "codex-workflows";
  return userAgent.startsWith(`${name}/`) && !/^code-desktop-[\w.-]*-(core|bridge)\//.test(userAgent) ? "codex" : "sandbox";
}

const normalizeServer = (name) => String(name).replace(/[^a-zA-Z0-9_-]/g, "_");

// mcp__<server>, mcp__<server>__*, mcp__* (every server) and mcp__<server>__<tool>, against the effective config.
function mcpOverrides(entries, servers) {
  const config = {}, disabled = new Map();
  const names = Object.keys(servers ?? {});
  for (const entry of entries) {
    if (entry === "mcp__*" || entry === "mcp__") {
      for (const name of names) config[`mcp_servers.${name}.enabled`] = false;
      config["features.apps"] = false;
      continue;
    }
    const rest = entry.slice("mcp__".length);
    const server = names.filter((name) => rest === normalizeServer(name) || rest.startsWith(`${normalizeServer(name)}__`))
      .sort((a, b) => normalizeServer(b).length - normalizeServer(a).length)[0];
    if (server === undefined) continue; // no such server on this core: nothing to remove (Claude: a no-op)
    const tool = rest.slice(normalizeServer(server).length + 2);
    if (!tool || tool === "*") config[`mcp_servers.${server}.enabled`] = false;
    else {
      const list = disabled.get(server) ?? [...(Array.isArray(servers[server]?.disabled_tools) ? servers[server].disabled_tools : [])];
      if (!list.includes(tool)) list.push(tool);
      disabled.set(server, list);
    }
  }
  for (const [server, list] of disabled) if (config[`mcp_servers.${server}.enabled`] !== false) config[`mcp_servers.${server}.disabled_tools`] = list;
  return config;
}

/**
 * Applies opts.disallowedTools / opts.bashCommandClamp to thread/start params for the connected core. Returns the
 * (possibly new) params; throws ToolNarrowingError when the core cannot narrow as asked. `opts.toolControls`
 * ('codex' | 'sandbox') overrides the detection.
 */
// Local: Claude Code's workflow-subagent always drops Agent, SendUserMessage and Workflow, so a workflow agent never
// starts sub-agents of its own (outside the run's concurrency cap, agent count and budget) or asks the user anything
// (nobody can answer in the headless runner). On Codex that is its multi-agent tools and request_user_input.
export const CODEX_WORKFLOW_AGENT_CONFIG = Object.freeze({
  "features.multi_agent": false,
  "features.multi_agent_v2": false,
  "features.default_mode_request_user_input": false,
});

/**
 * Local: an agentType definition's `tools:` allowlist (Claude limits the agent's tool pool to it) as the exclusions
 * this core can enforce: no file-write and no shell tool in the list runs the agent read-only (every core); on native
 * Codex, web search is turned off when neither WebSearch nor WebFetch is listed, and MCP servers no `mcp__…` entry
 * names are disabled. Returns {exclude: [...], kept: [...]} (`kept`: what this core can't remove, for the log).
 */
export function allowlistExclusions(allowedTools, kind, switches = null) {
  const names = (Array.isArray(allowedTools) ? allowedTools : []).map((entry) => parseRule(String(entry)).toolName);
  if (!names.length || names.includes("*")) return { exclude: [], kept: [] };
  const exclude = [], kept = [];
  if (!names.some((name) => WRITE_TOOLS.has(name) || SHELL_TOOLS.has(name))) exclude.push("Bash", "Edit", "MultiEdit", "NotebookEdit", "Write");
  const web = names.some((name) => WEB_TOOLS.has(name)), mcp = names.filter(isMcp);
  if (kind === "codex") {
    if (!web) exclude.push("WebSearch");
    if (!mcp.length) exclude.push("mcp__*");
  } else {
    // Local: a bridge core with per-tool switches for its web tools (workflowToolSwitches) turns them off.
    const webSwitches = [...WEB_TOOLS].filter((name) => switches?.[name]?.length);
    if (!web && webSwitches.length) exclude.push(...webSwitches);
    else if (!web) kept.push("web search");
    if (!mcp.length) kept.push("MCP tools");
  }
  return { exclude, kept, mcp };
}

/**
 * Local: a bridge core's per-tool switches (initialize capabilities.workflowToolSwitches): Claude tool name → the core's
 * own tool ids that thread/start codeDesktop.tools.disabled turns off (MiniMax: WebFetch → web_fetch, Agent → task).
 */
export function coreToolSwitches(client) {
  const value = client?.serverInfo?.capabilities?.workflowToolSwitches;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  for (const [name, ids] of Object.entries(value)) {
    const list = Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id) : [];
    if (list.length) out[name] = list;
  }
  return Object.keys(out).length ? out : null;
}

export async function narrowThreadParams(client, threadParams, opts = {}) {
  const { disallowedTools: explicit, bashCommandClamp } = normalizeToolOptions(opts);
  const kind = opts.toolControls === "codex" || opts.toolControls === "sandbox" ? opts.toolControls : coreToolControls(client, opts.clientOptions);
  const switches = kind === "codex" ? null : coreToolSwitches(client);
  // Local: a bridge core that honours thread/start config mcp_servers.<name>.enabled / .disabled_tools as Codex does
  // (initialize capabilities.workflowMcpSwitches: OpenCode, MiMo) takes mcp__… exclusions the same way.
  const mcpSwitches = kind !== "codex" && client?.serverInfo?.capabilities?.workflowMcpSwitches === true;
  const allow = allowlistExclusions(opts.allowedTools, kind, switches);
  if (!explicit && !bashCommandClamp && !allow.exclude.length && !allow.mcp?.length) {
    if (allow.kept.length) (typeof opts.log === "function" ? opts.log : () => {})(`workflow agent [${opts.label ?? "agent"}]: its agent definition's tools (${opts.allowedTools.join(", ")}) leave ${allow.kept.join(" and ")} on — this agent core can't remove ${allow.kept.length > 1 ? "them" : "it"}`);
    return kind === "codex" ? { ...threadParams, config: { ...(threadParams?.config ?? {}), ...CODEX_WORKFLOW_AGENT_CONFIG } } : threadParams;
  }
  const disallowedTools = mergeDisallowed(explicit, allow.exclude);
  const log = typeof opts.log === "function" ? opts.log : () => {};
  const who = `workflow agent [${opts.label ?? "agent"}]`;
  if (bashCommandClamp) {
    throw new ToolNarrowingError(`agent() opts.bashCommandClamp (${bashCommandClamp.join(", ")}) can't be enforced on Code Desktop's workflow engine: the agent core can't limit its shell to listed commands, so the spawn is refused rather than run un-clamped. Remove the clamp, or pass disallowedTools: ['Bash'] to run the agent read-only.`);
  }
  const plan = classifyTools(disallowedTools ?? []);
  // Only the script's own exclusions can refuse the spawn: an allowlist's exclusions are limited to what the core can do.
  const unsupported = kind === "codex" ? [] : (({ web, agents, mcp }) => [...web, ...agents, ...mcp])(classifyTools(explicit ?? [])).filter((name) => !switches?.[name] && !(mcpSwitches && isMcp(name)));
  if (unsupported.length) {
    throw new ToolNarrowingError(`agent() opts.disallowedTools: this agent core can't remove ${unsupported.join(", ")} from its agents, so the spawn is refused rather than run un-narrowed. Drop ${unsupported.length > 1 ? "them" : "it"} from disallowedTools to run the agent anyway.`);
  }
  const next = kind === "codex" ? { ...threadParams, config: { ...(threadParams?.config ?? {}), ...CODEX_WORKFLOW_AGENT_CONFIG } } : { ...threadParams };
  const notes = [];
  if (plan.readOnly.length) {
    notes.push(`read-only (${plan.readOnly.join(", ")} excluded); compatibility: the core keeps its sandboxed shell for reads instead of removing Claude's individual tools`);
    next.sandbox = "read-only";
  }
  const config = {};
  if (plan.web.length) { config.web_search = "disabled"; notes.push(`web search off (${plan.web.join(", ")} excluded)`); }
  if (plan.agents.length) { config["features.multi_agent"] = false; config["features.multi_agent_v2"] = false; notes.push(`sub-agents off (${plan.agents.join(", ")} excluded)`); }
  // Local: on a bridge core with per-tool switches, the web and sub-agent tools go through codeDesktop.tools.disabled.
  const switched = switches ? [...new Set([...plan.web, ...plan.agents].flatMap((name) => switches[name] ?? []))] : [];
  if (switched.length) {
    const hint = next.codeDesktop && typeof next.codeDesktop === "object" ? next.codeDesktop : {};
    const tools = hint.tools && typeof hint.tools === "object" ? hint.tools : {};
    next.codeDesktop = { ...hint, tools: { ...tools, disabled: [...new Set([...(Array.isArray(tools.disabled) ? tools.disabled : []), ...switched])] } };
  }
  // Local: an allowlist naming some MCP tools keeps only the servers it names (native Codex).
  const allowMcp = (kind === "codex" || mcpSwitches) && allow.mcp?.length ? allow.mcp : null;
  if (plan.mcp.length || allowMcp) {
    let servers;
    const removing = [...plan.mcp, ...allowMcp ? ["MCP servers outside the agent definition's tools"] : []];
    try { servers = (await client.request("config/read", { cwd: next.cwd ?? null }))?.config?.mcp_servers ?? {}; }
    catch (error) { throw new ToolNarrowingError(`agent() opts.disallowedTools: couldn't read the core's MCP servers to remove ${removing.join(", ")} (${String(error?.message ?? error).slice(0, 160)}), so the spawn is refused rather than run un-narrowed.`); }
    const unlisted = allowMcp ? Object.keys(servers).filter((name) => !allowMcp.some((entry) => entry === "mcp__*" || entry === `mcp__${normalizeServer(name)}` || entry.startsWith(`mcp__${normalizeServer(name)}__`))).map((name) => `mcp__${normalizeServer(name)}`) : [];
    Object.assign(config, mcpOverrides([...plan.mcp, ...unlisted], servers));
    if (plan.mcp.length || unlisted.length) notes.push(`MCP narrowed (${[...plan.mcp, ...unlisted].join(", ")} excluded)`);
  }
  if (Object.keys(config).length) next.config = { ...(next.config ?? {}), ...config };
  if (plan.other.length) notes.push(`no separate tool to remove for ${plan.other.join(", ")}`);
  if (opts.allowedTools?.length && (allow.exclude.length || allow.mcp?.length)) notes.push(`limited to its agent definition's tools (${opts.allowedTools.join(", ")})`);
  if (allow.kept.length) notes.push(`${allow.kept.join(" and ")} left on (this agent core can't remove ${allow.kept.length > 1 ? "them" : "it"})`);
  if (notes.length) log(`${who}: ${notes.join("; ")}`);
  return next;
}
