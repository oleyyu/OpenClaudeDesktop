// Dynamic workflows configuration (Settings › Code › Dynamic workflows), modeled on Claude Code 2.1.280's
// settings and environment variables. Shared by the main process (require) and the renderer (import).
//
// Saved in the app's preferences (config):
//   dynamicWorkflows                 Claude enableWorkflows: unset reads as on.
//   workflowKeywordTrigger           Claude workflowKeywordTrigger: the "ultracode" keyword opts a turn in (unset: on).
//   workflowSizeGuideline            Claude workflowSizeGuideline: unrestricted | small | medium | large (unset: medium).
//   workflowMaxConcurrentAgents      agents running at once, 1–256 (unset: automatic, min(16, max(2, cores − 2))).
//   workflowStructuredOutputRetries  failed structured results an agent may retry (unset: 5).
//   workflowPrefixStaggerMs          sibling agents with the same prompt prefix wait this long for the first (unset: 5000).
//   workflowPromptProvenance         frame computed agent prompts as script output (unset: on).
//   workflowSizeWarningAgents        "Large workflow" above this many agents (unset: 25).
//   workflowSizeWarningTokens        … or this many tokens (unset: 1,500,000).
//   workflowSubagentModels           per core id: workflow agents' default model (unset: the session's model). A model
//                                    id belongs to one core's catalog, so each core keeps its own; the older single
//                                    workflowSubagentModel still applies to a core whose catalog lists it.
//   workflowEngines                  per core id: "codeDesktop" | "native" (unset: the core's own engine when it has one).
//   workflowRules                    {allow, ask, deny}: Claude's Workflow(<name>) permission rules.
// Environment (wins over Settings, as in Claude Code): CLAUDE_CODE_DISABLE_WORKFLOWS, CLAUDE_CODE_WORKFLOWS,
// CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS, MAX_STRUCTURED_OUTPUT_RETRIES, CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS,
// CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE, CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS / _TOKENS,
// CLAUDE_CODE_SUBAGENT_MODEL[_FORCE], CLAUDE_WORKFLOW_NAME_ONLY. Managed settings' disableWorkflows is a hard off.

export const SIZE_GUIDELINES = Object.freeze(["unrestricted", "small", "medium", "large"]);
// Claude: small < 5 agents, medium < 10, large < 50.
export const SIZE_LIMITS = Object.freeze({ small: 5, medium: 10, large: 50 });
export const WORKFLOW_ENGINES = Object.freeze(["codeDesktop", "native"]);
export const WORKFLOW_DEFAULTS = Object.freeze({
  keywordTrigger: true, sizeGuideline: "medium", structuredOutputRetries: 5, prefixStaggerMs: 5000, promptProvenance: true,
  sizeWarningAgents: 25, sizeWarningTokens: 1_500_000,
});
// [min, max] of each numeric setting (and of its environment variable).
export const WORKFLOW_RANGES = Object.freeze({
  workflowMaxConcurrentAgents: Object.freeze([1, 256]),
  workflowStructuredOutputRetries: Object.freeze([1, 50]),
  workflowPrefixStaggerMs: Object.freeze([0, 600_000]),
  workflowSizeWarningAgents: Object.freeze([1, 1000]),
  workflowSizeWarningTokens: Object.freeze([1000, 10_000_000_000]),
});
// The environment variables' bounds are Claude's (a minimum, and no maximum where Claude has none); an invalid value
// is ignored, and the runner gets the resolved value (workflowRunnerEnv), so Settings and the run always agree.
export const WORKFLOW_ENV_RANGES = Object.freeze({
  workflowMaxConcurrentAgents: WORKFLOW_RANGES.workflowMaxConcurrentAgents,
  workflowStructuredOutputRetries: Object.freeze([1, Number.MAX_SAFE_INTEGER]),
  workflowPrefixStaggerMs: Object.freeze([0, Number.MAX_SAFE_INTEGER]),
  workflowSizeWarningAgents: Object.freeze([1, Number.MAX_SAFE_INTEGER]),
  workflowSizeWarningTokens: Object.freeze([1, Number.MAX_SAFE_INTEGER]),
});
const ENV = Object.freeze({
  workflowMaxConcurrentAgents: "CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS",
  workflowStructuredOutputRetries: "MAX_STRUCTURED_OUTPUT_RETRIES",
  workflowPrefixStaggerMs: "CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS",
  workflowSizeWarningAgents: "CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS",
  workflowSizeWarningTokens: "CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS",
});
const MAX_RULES = 200;

/** Claude's default concurrency: min(16, max(2, availableParallelism − 2)). */
export const autoConcurrency = (parallelism) => Math.min(16, Math.max(2, (Number.isFinite(parallelism) ? Math.floor(parallelism) : 4) - 2));

/** Claude's triBool environment reading: true, false, or undefined when unset or unrecognized. */
export function envBool(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(text)) return true;
  if (["0", "false", "no", "off"].includes(text)) return false;
  return undefined;
}
/** An integer environment value inside [min, max], else undefined (an invalid value is ignored, as in Claude). */
export function envInt(value, [min, max]) {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const number = Number(String(value).trim());
  return Number.isInteger(number) && number >= min && number <= max ? number : undefined;
}
const savedInt = (value, [min, max]) => Number.isInteger(value) && value >= min && value <= max ? value : undefined;

/** Normalizes a rule list: names (or Claude's "Workflow(name)" / "Workflow" forms), deduplicated. */
export function ruleNames(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const text = entry.trim();
    const match = text.match(/^(?:Workflow|RunWorkflow)(?:\((.*)\))?$/);
    const name = match ? (match[1] === undefined ? "*" : match[1].trim()) : text;
    if (!name || name.length > 200 || /[\x00-\x1f]/.test(name)) continue;
    if (!out.includes(name)) out.push(name);
  }
  return out.slice(0, MAX_RULES);
}
/** Claude's Workflow(<name>) permission rules for one workflow: deny, then ask, then allow; null when no rule matches. */
export function workflowRuleDecision(rules, name) {
  const value = rules && typeof rules === "object" ? rules : {};
  const matches = (list) => ruleNames(list).some((entry) => entry === "*" || (typeof name === "string" && entry === name));
  if (matches(value.deny)) return "deny";
  if (matches(value.ask)) return "ask";
  if (matches(value.allow)) return "allow";
  return null;
}
/**
 * What Claude Code 2.1.280 decides for one Workflow call (its permission order): a tool-wide "Workflow" deny or a
 * Workflow(<name>) deny blocks; then a tool-wide or named ask asks, even in Bypass; then Bypass runs it; then a
 * tool-wide allow (which covers inline scripts and script files too) or a named allow runs it; anything else asks.
 * name: the saved workflow a name-only call runs, else null (an inline script or a scriptPath: tool-wide rules only).
 * → {behavior: "deny"|"ask"|"allow", toolWide: whether a bare "Workflow" rule decided}
 */
export function workflowPermission(rules, name = null, { bypass = false } = {}) {
  const value = rules && typeof rules === "object" ? rules : {};
  const named = typeof name === "string" && name ? name : null;
  const has = (list, entry) => ruleNames(list).includes(entry);
  for (const behavior of ["deny", "ask"]) {
    if (has(value[behavior], "*")) return { behavior, toolWide: true };
    if (named && has(value[behavior], named)) return { behavior, toolWide: false };
  }
  if (bypass) return { behavior: "allow", toolWide: false };
  if (has(value.allow, "*")) return { behavior: "allow", toolWide: true };
  if (named && has(value.allow, named)) return { behavior: "allow", toolWide: false };
  return { behavior: "ask", toolWide: false };
}
/** The rules with `name` always allowed (Claude's "Yes, and don't ask again for <name>"). */
export function allowWorkflowRule(rules, name) {
  const value = rules && typeof rules === "object" ? rules : {};
  return { allow: ruleNames([...(value.allow || []), name]), ask: ruleNames(value.ask), deny: ruleNames(value.deny) };
}

/** Validates the workflow keys of a Settings patch onto `next` (preferences.mjs settingsPatch). Throws on a bad value. */
export function applyWorkflowPatch(next, patch) {
  for (const key of ["dynamicWorkflows", "workflowKeywordTrigger", "workflowPromptProvenance"]) {
    if (!(key in patch)) continue;
    if (patch[key] !== null && typeof patch[key] !== "boolean") throw new Error(`Invalid ${key} setting.`);
    if (patch[key] === null) delete next[key]; else next[key] = patch[key];
  }
  if ("workflowSizeGuideline" in patch) {
    if (patch.workflowSizeGuideline !== null && !SIZE_GUIDELINES.includes(patch.workflowSizeGuideline)) throw new Error("Invalid workflowSizeGuideline setting.");
    if (patch.workflowSizeGuideline === null) delete next.workflowSizeGuideline; else next.workflowSizeGuideline = patch.workflowSizeGuideline;
  }
  for (const [key, range] of Object.entries(WORKFLOW_RANGES)) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === null || value === "") { delete next[key]; continue; }
    if (savedInt(value, range) === undefined) throw new Error(`Enter a whole number from ${range[0]} to ${range[1]}.`);
    next[key] = value;
  }
  const modelId = (value) => typeof value === "string" && value.length <= 200 && !/[\x00-\x1f]/.test(value);
  if ("workflowSubagentModel" in patch) {
    const value = patch.workflowSubagentModel;
    if (value === null || value === "") delete next.workflowSubagentModel;
    else if (!modelId(value)) throw new Error("Invalid workflowSubagentModel setting.");
    else next.workflowSubagentModel = value;
  }
  if ("workflowSubagentModels" in patch) {
    const value = patch.workflowSubagentModels;
    if (value !== null && (typeof value !== "object" || Array.isArray(value))) throw new Error("Invalid workflowSubagentModels setting.");
    const models = { ...(next.workflowSubagentModels && typeof next.workflowSubagentModels === "object" ? next.workflowSubagentModels : {}) };
    for (const [core, model] of Object.entries(value || {})) {
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(core)) throw new Error("Invalid workflowSubagentModels setting.");
      if (model === null || model === "") delete models[core];
      else if (!modelId(model)) throw new Error("Invalid workflowSubagentModels setting.");
      else models[core] = model;
    }
    if (value === null || !Object.keys(models).length) delete next.workflowSubagentModels; else next.workflowSubagentModels = models;
    // The older app-wide value is replaced by the per-core one as soon as one is saved.
    delete next.workflowSubagentModel;
  }
  if ("workflowEngines" in patch) {
    const value = patch.workflowEngines;
    if (value !== null && (typeof value !== "object" || Array.isArray(value))) throw new Error("Invalid workflowEngines setting.");
    const engines = { ...(next.workflowEngines && typeof next.workflowEngines === "object" ? next.workflowEngines : {}) };
    for (const [core, engine] of Object.entries(value || {})) {
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(core)) throw new Error("Invalid workflowEngines setting.");
      if (engine === null) delete engines[core];
      else if (!WORKFLOW_ENGINES.includes(engine)) throw new Error("Invalid workflowEngines setting.");
      else engines[core] = engine;
    }
    if (value === null || !Object.keys(engines).length) delete next.workflowEngines; else next.workflowEngines = engines;
  }
  if ("workflowRules" in patch) {
    const value = patch.workflowRules;
    if (value === null) delete next.workflowRules;
    else if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid workflowRules setting.");
    else next.workflowRules = { allow: ruleNames(value.allow), ask: ruleNames(value.ask), deny: ruleNames(value.deny) };
  }
  return next;
}

/**
 * The saved Workflow agents' model for one core: {value, saved, unavailable}. `models`: that core's catalog ids (null
 * when unknown). A saved id the catalog doesn't list is not used (agents run on the session's model) and is reported
 * as unavailable, so Settings can say so instead of showing a blank picker. The older app-wide value counts only for a
 * core whose catalog lists it.
 */
export function savedSubagentModel(config, coreId, models = null) {
  const c = config && typeof config === "object" ? config : {};
  const ids = Array.isArray(models) && models.length ? models.filter((id) => typeof id === "string") : null;
  const map = c.workflowSubagentModels && typeof c.workflowSubagentModels === "object" && !Array.isArray(c.workflowSubagentModels) ? c.workflowSubagentModels : {};
  const own = typeof coreId === "string" && typeof map[coreId] === "string" && map[coreId] ? map[coreId] : null;
  const legacy = typeof c.workflowSubagentModel === "string" && c.workflowSubagentModel ? c.workflowSubagentModel : null;
  if (own) return ids && !ids.includes(own) ? { value: null, saved: own, unavailable: true } : { value: own, saved: own, unavailable: false };
  // Without a core (older callers), the app-wide value as before; with one, only when its catalog lists it.
  if (legacy && (typeof coreId !== "string" || (ids && ids.includes(legacy)))) return { value: legacy, saved: legacy, unavailable: false };
  return { value: null, saved: null, unavailable: false };
}

/**
 * The effective workflow configuration: Settings, then the environment (which wins), then managed settings.
 * Each tunable is {value, source: "env" | "setting" | "default"} so Settings can say which one applies.
 * coreId / models: the running core and its catalog ids, for the per-core Workflow agents' model.
 * @param {{config?: object, env?: object, managed?: object, parallelism?: number, coreId?: string, models?: string[]}} input
 */
export function resolveWorkflowSettings({ config = {}, env = {}, managed = {}, parallelism = 4, coreId, models = null } = {}) {
  const c = config && typeof config === "object" ? config : {}, e = env && typeof env === "object" ? env : {};
  // Enablement (Claude 2.1.280): managed disableWorkflows and CLAUDE_CODE_DISABLE_WORKFLOWS are hard offs, and so is
  // CLAUDE_CODE_WORKFLOWS=false; CLAUDE_CODE_WORKFLOWS=true only makes them available and on by default, so the user's
  // own enableWorkflows=false still turns them off. Else enableWorkflows, on unless turned off.
  let enabled, disabledBy = null;
  const forced = envBool(e.CLAUDE_CODE_WORKFLOWS);
  const m = managed && typeof managed === "object" && !Array.isArray(managed) ? managed : {};
  // Managed settings (an administrator's) merge into the same keys as Claude Code's: enableWorkflows false is a hard
  // off, workflowSizeGuideline / workflowKeywordTriggerEnabled win over Settings (whose rows then lock), and their
  // permissions' Workflow(...) entries join the rules, marked managed so they can't be removed here.
  if (m.disableWorkflows === true || m.enableWorkflows === false) { enabled = false; disabledBy = "managed"; }
  else if (envBool(e.CLAUDE_CODE_DISABLE_WORKFLOWS) === true) { enabled = false; disabledBy = "env"; }
  else if (forced === false) { enabled = false; disabledBy = "env"; }
  else { enabled = c.dynamicWorkflows !== false; disabledBy = enabled ? null : "setting"; }
  const tunable = (key, fallback) => {
    const fromEnv = envInt(e[ENV[key]], WORKFLOW_ENV_RANGES[key]);
    if (fromEnv !== undefined) return { value: fromEnv, source: "env", variable: ENV[key] };
    const saved = savedInt(c[key], WORKFLOW_RANGES[key]);
    return saved !== undefined ? { value: saved, source: "setting", variable: ENV[key] } : { value: fallback, source: "default", variable: ENV[key] };
  };
  const auto = autoConcurrency(parallelism);
  const provenanceEnv = envBool(e.CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE);
  const subagentEnv = typeof e.CLAUDE_CODE_SUBAGENT_MODEL === "string" && e.CLAUDE_CODE_SUBAGENT_MODEL.trim() ? e.CLAUDE_CODE_SUBAGENT_MODEL.trim() : null;
  const subagent = savedSubagentModel(c, coreId, models), subagentSaved = subagent.value;
  const managedKeyword = typeof m.workflowKeywordTriggerEnabled === "boolean" ? m.workflowKeywordTriggerEnabled : undefined;
  const managedSize = SIZE_GUIDELINES.includes(m.workflowSizeGuideline) ? m.workflowSizeGuideline : undefined;
  const permissions = m.permissions && typeof m.permissions === "object" && !Array.isArray(m.permissions) ? m.permissions : {};
  const managedRules = { allow: ruleNames(workflowEntries(permissions.allow)), ask: ruleNames(workflowEntries(permissions.ask)), deny: ruleNames(workflowEntries(permissions.deny)) };
  const userRules = { allow: ruleNames(c.workflowRules?.allow), ask: ruleNames(c.workflowRules?.ask), deny: ruleNames(c.workflowRules?.deny) };
  return {
    enabled, disabledBy,
    keywordTrigger: managedKeyword ?? c.workflowKeywordTrigger !== false,
    sizeGuideline: managedSize ?? (SIZE_GUIDELINES.includes(c.workflowSizeGuideline) ? c.workflowSizeGuideline : WORKFLOW_DEFAULTS.sizeGuideline),
    // Where the size guideline comes from ("default": nothing chose it, so the tool's description says so).
    sizeSource: managedSize ? "managed" : SIZE_GUIDELINES.includes(c.workflowSizeGuideline) ? "setting" : "default",
    managed: { keywordTrigger: managedKeyword !== undefined, sizeGuideline: managedSize !== undefined, rules: managedRules },
    maxConcurrentAgents: { ...tunable("workflowMaxConcurrentAgents", auto), auto },
    structuredOutputRetries: tunable("workflowStructuredOutputRetries", WORKFLOW_DEFAULTS.structuredOutputRetries),
    prefixStaggerMs: tunable("workflowPrefixStaggerMs", WORKFLOW_DEFAULTS.prefixStaggerMs),
    promptProvenance: provenanceEnv !== undefined ? { value: provenanceEnv, source: "env", variable: "CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE" }
      : typeof c.workflowPromptProvenance === "boolean" ? { value: c.workflowPromptProvenance, source: "setting", variable: "CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE" }
        : { value: WORKFLOW_DEFAULTS.promptProvenance, source: "default", variable: "CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE" },
    sizeWarningAgents: tunable("workflowSizeWarningAgents", WORKFLOW_DEFAULTS.sizeWarningAgents),
    sizeWarningTokens: tunable("workflowSizeWarningTokens", WORKFLOW_DEFAULTS.sizeWarningTokens),
    // CLAUDE_CODE_SUBAGENT_MODEL_FORCE is its own switch (Claude: scripts' opts.model is ignored whenever it is set).
    subagentModel: subagentEnv ? { value: subagentEnv, force: envBool(e.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) === true, source: "env", variable: "CLAUDE_CODE_SUBAGENT_MODEL" }
      : { value: subagentSaved, force: envBool(e.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) === true, source: subagentSaved ? "setting" : "default", variable: "CLAUDE_CODE_SUBAGENT_MODEL",
        ...(subagent.unavailable ? { unavailable: subagent.saved } : {}) },
    nameOnly: envBool(e.CLAUDE_WORKFLOW_NAME_ONLY) === true,
    engines: c.workflowEngines && typeof c.workflowEngines === "object" && !Array.isArray(c.workflowEngines) ? { ...c.workflowEngines } : {},
    // In effect: the user's own (Settings, "don't ask again") and the managed ones; userRules: the user's alone.
    rules: { allow: ruleNames([...userRules.allow, ...managedRules.allow]), ask: ruleNames([...userRules.ask, ...managedRules.ask]), deny: ruleNames([...userRules.deny, ...managedRules.deny]) },
    userRules,
  };
}
/** A permissions list's Workflow / Workflow(<name>) entries (managed lists hold every tool's rules). */
function workflowEntries(list) {
  return Array.isArray(list) ? list.filter((entry) => typeof entry === "string" && /^(?:Workflow|RunWorkflow)(?:\(.*\))?$/.test(entry.trim())) : [];
}

/** The variables OpenClaude Desktop's runner child reads (the resolved values, so a Settings value reaches it like Claude's env). */
export function workflowRunnerEnv(resolved) {
  const out = {
    CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS: String(resolved.maxConcurrentAgents.value),
    MAX_STRUCTURED_OUTPUT_RETRIES: String(resolved.structuredOutputRetries.value),
    CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS: String(resolved.prefixStaggerMs.value),
    CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE: resolved.promptProvenance.value ? "1" : "0",
  };
  if (resolved.subagentModel.value) out.CLAUDE_CODE_SUBAGENT_MODEL = resolved.subagentModel.value;
  if (resolved.subagentModel.force) out.CLAUDE_CODE_SUBAGENT_MODEL_FORCE = "1";
  // Name-only (Claude: only bundled workflows run): the runner refuses workflow({scriptPath}) and saved-workflow names.
  if (resolved.nameOnly) out.CLAUDE_WORKFLOW_NAME_ONLY = "1";
  return out;
}

/**
 * Which engine runs a core's dynamic workflows: its own ("native", capabilities.modelWorkflows) or OpenClaude Desktop's.
 * A core with its own engine runs it unless Settings chose OpenClaude Desktop for that core; any other core runs OpenClaude Desktop's.
 */
export function workflowEngineFor(engines, coreId, hasNative) {
  if (!hasNative) return "codeDesktop";
  const chosen = engines && typeof engines === "object" ? engines[coreId] : undefined;
  return chosen === "codeDesktop" ? "codeDesktop" : "native";
}
