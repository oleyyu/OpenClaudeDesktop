// The dual-track executor (docs/04 判定树): the AX rung first, then the reason policy decides.
//   ok          → done, path "ax"
//   retry       → back off (reason-policy RETRY) and run the AX rung again; still failing → refused
//   fallback    → raw input (the native rawClick / rawType … rung, M3). Without a raw rung: refused, never a blind click.
//                 Every policy hit is logged ([cu policy] …) so a later look can tell why an action did not stay on AX.
//                 The raw rung re-checks the event source, the session gates and point ownership natively; its own
//                 refusal comes back blocked with path "cgevent".
//   block       → refused with the reason; unknown reasons were already logged as needing a policy entry
// target "focused" with a click / drag / scroll must stay on AX (docs/04 §6): it never falls through.
const policy = require("./reason-policy.cjs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One line per policy fallback: the reason, what it fell to, and where. */
const policyHitMessage = (reason, context = {}) => `[cu policy] fallback reasonCode="${reason}" → cgevent${context.op ? ` op=${context.op}` : ""}${context.bundleId ? ` app=${context.bundleId}` : ""}${context.windowId !== undefined ? ` window=${context.windowId}` : ""}`;

/**
 * @param {{ax: () => Promise<object>, raw?: (axResult: object) => Promise<object>, focusedPointer?: boolean,
 *          log?: object, wait?: (ms: number) => Promise<void>, decide?: Function, context?: object}} rungs
 *          (decide: tests only; context {op, bundleId, windowId}: for the policy log line)
 * @returns {Promise<object>} the AX (or raw) result with `path` and, when refused, `blocked: true`
 */
async function execute({ ax, raw = null, focusedPointer = false, log = console, wait = sleep, decide = policy.decide, context = {} }) {
  let result, decision, attempt = 0;
  for (;;) {
    result = await ax();
    decision = decide(result, { log, op: context.op });
    if (decision.action !== "retry") break;
    // "退避 3 次": three waits, so one first try and three retries; still failing → refused.
    attempt += 1;
    if (attempt > decision.retry.attempts) break;
    await wait(decision.retry.delayMs);
  }
  if (decision.action === "done") return { ...result, path: "ax" };
  if (decision.action === "fallback" && !focusedPointer && typeof raw === "function") {
    log.info?.(policyHitMessage(decision.reason, context));
    return { ...(await deliver(() => raw(result), { wait })), axReason: decision.reason };
  }
  return { ...result, outcome: result?.outcome === "ineffective" ? "ineffective" : "unsupported", reasonCode: decision.reason,
    path: "unavailable", blocked: true, ...(decision.unclassified ? { unclassified: true } : {}) };
}

/** What deliver answers when it was stopped before an attempt: nothing of this attempt was sent. */
const STOPPED = Object.freeze({ outcome: "unsupported", reasonCode: "aborted", delivered: false });

/**
 * One raw-rung call (also app_key, which has no AX rung). Its native gate refusing for user input
 * (user_actively_typing) backs off like the AX rung (RETRY: 3 × 200 ms), every other refusal is final.
 * `stopped` (screen-wide input: the tool call aborted, or the session lost the display lock — the strip's Stop, the
 * user's Esc, the turn ending) is asked before every attempt: once it says so, nothing more goes to native and the
 * answer is aborted, so a Stop during the back-off is never followed by the retry's input.
 * @returns {Promise<object>} the native result with path "cgevent", and `blocked: true` unless it is ok
 */
async function deliver(raw, { wait = sleep, stopped = null } = {}) {
  let delivered, tries = 0;
  const halted = () => { try { return typeof stopped === "function" && stopped() === true; } catch { return true; } };
  for (;;) {
    if (halted()) {
      // A retry after a partial delivery never happens (below), so whatever came before was refused whole.
      delivered = { ...STOPPED, ...(tries > 0 && delivered && typeof delivered === "object" ? pickCounts(delivered) : {}) };
      break;
    }
    delivered = await raw();
    const backoff = Object.hasOwn(policy.RETRY, delivered?.reasonCode ?? "") ? policy.RETRY[delivered.reasonCode] : null;
    // Never replay a partly delivered gesture after a mid-drag gate fires.
    if (delivered?.outcome === "ok" || delivered?.delivered === true || !backoff || tries >= backoff.attempts) break;
    tries += 1;
    await wait(backoff.delayMs);
  }
  return { ...delivered, path: "cgevent", ...(delivered?.outcome === "ok" ? {} : { blocked: true }) };
}

/** The progress counts of a refused attempt (nothing was delivered by it), kept on the aborted answer. */
function pickCounts(result) {
  const out = {};
  for (const key of ["typed", "total", "pressed", "times"]) if (result[key] !== undefined) out[key] = result[key];
  return out;
}

module.exports = { execute, deliver, policyHitMessage };
