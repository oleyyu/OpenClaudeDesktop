// Codex's request_user_input (Claude's AskUserQuestion; codex.mjs nativeTools) answers "request_user_input is
// unavailable in Default mode" unless its default_mode_request_user_input flag is on (under development in 0.155.1,
// off by default). Every thread of a Codex that knows the flag gets it as a thread config override, so a question
// card can come in any mode, as in Claude Code, and OpenClaude Desktop never serves Codex a second question tool. The
// under-development warning Codex would print for it is suppressed only when no other unstable flag of the user's is
// on (their own warning stays). A flag the user turned on themselves, or a request that sets it, is left alone.
const FLAG = "default_mode_request_user_input";
const THREAD_METHODS = new Set(["thread/start", "thread/resume", "thread/fork"]);

/**
 * @param {string} method
 * @param {object} params             the request params (its config is replaced, not mutated)
 * @param {{native?: boolean, stages?: Map<string, {stage: string, enabled: boolean}>|null}} core
 *        native: the running core is a native Codex; stages: its experimentalFeature/list (name → stage, enabled)
 */
function defaultModeQuestions(method, params, { native = false, stages = null } = {}) {
  if (!params || typeof params !== "object" || !THREAD_METHODS.has(method) || !native || !(stages instanceof Map)) return params;
  const flag = stages.get(FLAG);
  if (!flag || flag.enabled) return params;
  const config = params.config && typeof params.config === "object" && !Array.isArray(params.config) ? params.config : {};
  if (Object.hasOwn(config, `features.${FLAG}`)) return params;
  const otherUnstable = [...stages].some(([name, value]) => name !== FLAG && value?.enabled === true && value.stage === "underDevelopment");
  const quiet = flag.stage === "underDevelopment" && !otherUnstable && !Object.hasOwn(config, "suppress_unstable_features_warning");
  params.config = { ...config, [`features.${FLAG}`]: true, ...(quiet ? { suppress_unstable_features_warning: true } : {}) };
  return params;
}

module.exports = { defaultModeQuestions, FLAG };
