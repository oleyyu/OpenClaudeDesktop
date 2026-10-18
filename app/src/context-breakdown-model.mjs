// Host stand-in for Claude Code's `get_context_usage` control request (the report the 2.42304.0 session rail's Context
// card draws its /context breakdown from: c227f4d5e hZ `V = R.data, U = V?.usage`, then c2d611398 H). The host's cores do
// not answer that request, so this module builds a report of the same shape from what the host knows:
//
//   totalTokens / rawMaxTokens   the thread tokenUsage report (last.totalTokens over modelContextWindow), as before
//   autoCompactThreshold         context-usage-model autoCompactLimit (the core's reported limit, else Codex's 90% rule)
//   categories                   per-category counts a core's bridge reports (codeDesktop/contextUsage/read, measured on what it sends) or the
//                                host measured itself (estimates, `estimated: true`); a category nobody knows is left out
//
// The category list follows the builder of Claude Code 2.1.299 (the CLI 2.42304.0 ships under Application Support/Claude/
// claude-code, its get_context_usage analysis): the rows are pushed in the CLI's order with the CLI's names and colors, a
// row only when its count is above 0 —
//   System prompt (promptBorder), System tools (inactive), MCP tools (cyan_FOR_SUBAGENTS_ONLY), MCP server instructions
//   (green_FOR_SUBAGENTS_ONLY: the connected servers' initialize instructions, `## <server>\n<text>` blocks), MCP tools
//   (deferred) and System tools (deferred) (inactive, isDeferred), Custom agents (permission), Memory files (claude), Skills (warning),
//   Messages (purple_FOR_SUBAGENTS_ONLY), then the buffer (inactive) and Free space (promptBorder, always) —
// with the CLI's arithmetic: with the API's real input total `mn`, Messages = max(0, min(max(0, mn - known), window -
// known - buffer)) where `known` sums the non-deferred rows above; the buffer is `window - autoCompactThreshold` named
// "Autocompact buffer" while auto-compact is on and not engine-driven ("auto" source: no buffer row); Free space =
// max(0, window - (known + Messages) - buffer); totalTokens = known + max(0, mn - known) with a real total (2.1.299: the
// unclamped sum, so never below the known rows), else the rows' sum; percentage = round(total / window * 100);
// each category carries the CLI's `kind` (Fer: free / buffer / deferred / used). The CLI's "Compact buffer" (auto-compact
// off: a fixed 3000-token reserve) is not drawn: the host only knows a core's threshold, never that a core has auto-compact
// switched off, and an unknown threshold leaves the buffer row out (no invented reserve).
export const CONTEXT_CATEGORY = Object.freeze({
  systemPrompt: { name: "System prompt", color: "promptBorder" },
  systemTools: { name: "System tools", color: "inactive" },
  mcpTools: { name: "MCP tools", color: "cyan_FOR_SUBAGENTS_ONLY" },
  mcpServerInstructions: { name: "MCP server instructions", color: "green_FOR_SUBAGENTS_ONLY" },
  mcpToolsDeferred: { name: "MCP tools (deferred)", color: "inactive", isDeferred: true },
  systemToolsDeferred: { name: "System tools (deferred)", color: "inactive", isDeferred: true },
  customAgents: { name: "Custom agents", color: "permission" },
  memoryFiles: { name: "Memory files", color: "claude" },
  skills: { name: "Skills", color: "warning" },
});
// The CLI's push order (keys of CONTEXT_CATEGORY), then Messages, the buffer and Free space.
export const CONTEXT_CATEGORY_ORDER = Object.freeze(Object.keys(CONTEXT_CATEGORY));
export const MESSAGES_CATEGORY = Object.freeze({ name: "Messages", color: "purple_FOR_SUBAGENTS_ONLY" });
export const AUTOCOMPACT_BUFFER_CATEGORY = Object.freeze({ name: "Autocompact buffer", color: "inactive" });
export const FREE_SPACE_CATEGORY = Object.freeze({ name: "Free space", color: "promptBorder" });

// The token estimate the host uses where no core reports a real count: ceil(characters / 4) over the exact text (or the
// JSON of a tool schema) the model is sent. Simple and reproducible; reports mark such rows `estimated`.
export function estimateTokens(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}
export const estimateJsonTokens = (value) => (value === undefined ? 0 : estimateTokens(JSON.stringify(value)));

const count = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
// CLI Fer: the row's kind.
function categoryKind(category) {
  if (category.name === FREE_SPACE_CATEGORY.name) return "free";
  if (category.name === AUTOCOMPACT_BUFFER_CATEGORY.name || category.name === "Compact buffer") return "buffer";
  if (category.isDeferred) return "deferred";
  return "used";
}

// `facts`:
//   totalTokens            the real input total of the last request (thread tokenUsage last.totalTokens), or null
//   window                 the model context window (modelContextWindow); no report without one
//   autoCompactThreshold   the token count auto-compact fires at, or null when unknown
//   autocompactSource      "auto" when the engine compacts by itself without a fixed threshold (no buffer row)
//   model                  the model id
//   categories             { [CONTEXT_CATEGORY key]: { tokens, estimated? } } — absent / non-positive keys are left out
//   memoryFiles            [{ path, type, tokens }], mcpTools [{ name, serverName, tokens, isLoaded }], agents
//                          [{ agentType, source, tokens }] — the breakdown's sub-lists (H `de`), [] when unknown
//   sources                { [key]: "core" | "host" } — where each category's count comes from (kept on the report)
export function buildContextUsageReport(facts) {
  const window = facts?.window;
  if (!(Number.isFinite(window) && window > 0)) return null;
  const rawTotal = facts.totalTokens;
  const mn = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.round(rawTotal) : null;
  const known = facts.categories ?? {};
  const categories = [];
  for (const key of CONTEXT_CATEGORY_ORDER) {
    const tokens = count(known[key]?.tokens);
    if (tokens > 0) categories.push({ ...CONTEXT_CATEGORY[key], tokens, ...(known[key]?.estimated ? { estimated: true } : {}) });
  }
  const threshold = facts.autoCompactThreshold;
  const thresholdKnown = Number.isFinite(threshold) && threshold > 0 && threshold < window;
  const autoSource = facts.autocompactSource === "auto";
  const buffer = thresholdKnown && !autoSource ? Math.round(window - threshold) : 0;
  const knownSum = categories.reduce((sum, c) => sum + (c.isDeferred ? 0 : c.tokens), 0);
  // Without a real total the CLI counts the transcript itself; the host has no transcript count, so no Messages row.
  const messages = mn === null ? 0 : Math.max(0, Math.min(Math.max(0, mn - knownSum), window - knownSum - buffer));
  if (messages > 0) categories.push({ ...MESSAGES_CATEGORY, tokens: messages });
  const used = categories.reduce((sum, c) => sum + (c.isDeferred ? 0 : c.tokens), 0);
  if (buffer > 0) categories.push({ ...AUTOCOMPACT_BUFFER_CATEGORY, tokens: buffer });
  categories.push({ ...FREE_SPACE_CATEGORY, tokens: Math.max(0, window - used - buffer) });
  const totalTokens = mn === null ? used : knownSum + Math.max(0, mn - knownSum);
  return {
    categories: categories.map((c) => ({ ...c, isDeferred: c.isDeferred === true, kind: categoryKind(c) })),
    totalTokens,
    maxTokens: window,
    rawMaxTokens: window,
    ...(autoSource ? { autocompactSource: "auto" } : {}),
    percentage: Math.round((totalTokens / window) * 100),
    model: facts.model ?? "",
    memoryFiles: facts.memoryFiles ?? [],
    mcpTools: facts.mcpTools ?? [],
    agents: facts.agents ?? [],
    ...(thresholdKnown ? { autoCompactThreshold: Math.round(threshold), isAutoCompactEnabled: true } : {}),
    sources: facts.sources ?? {},
  };
}
