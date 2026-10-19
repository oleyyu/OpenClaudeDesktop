// The dual-track executor (docs/04 判定树): the AX rung first, then the reason policy decides.
//   ok          → done, path "ax"
//   retry       → back off (reason-policy RETRY) and run the AX rung again; still failing → refused
//   fallback    → raw input (dispatchRaw through the helper, M3). Without a raw rung: refused, never a blind click
//   block       → refused with the reason; unknown reasons were already logged as needing a policy entry
// target "focused" with a click / drag / scroll must stay on AX (docs/04 §6): it never falls through.
const policy = require("./reason-policy.cjs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {{ax: () => Promise<object>, raw?: (axResult: object) => Promise<object>, focusedPointer?: boolean,
 *          log?: object, wait?: (ms: number) => Promise<void>, decide?: Function}} rungs  (decide: tests only)
 * @returns {Promise<object>} the AX (or raw) result with `path` and, when refused, `blocked: true`
 */
async function execute({ ax, raw = null, focusedPointer = false, log = console, wait = sleep, decide = policy.decide }) {
  let result, decision, attempt = 0;
  for (;;) {
    result = await ax();
    decision = decide(result, { log });
    if (decision.action !== "retry") break;
    // "退避 3 次": three waits, so one first try and three retries; still failing → refused.
    attempt += 1;
    if (attempt > decision.retry.attempts) break;
    await wait(decision.retry.delayMs);
  }
  if (decision.action === "done") return { ...result, path: "ax" };
  if (decision.action === "fallback" && !focusedPointer && typeof raw === "function") {
    return { ...(await raw(result)), path: "cgevent", axReason: decision.reason };
  }
  return { ...result, outcome: result?.outcome === "ineffective" ? "ineffective" : "unsupported", reasonCode: decision.reason,
    path: "unavailable", blocked: true, ...(decision.unclassified ? { unclassified: true } : {}) };
}

module.exports = { execute };
