// Runtime gates outside grants (docs/02 §权限之外的三道运行时闸门), read from the native probe:
//   secure input (a password field anywhere)  → secure_input_active, every input action refused
//   screen locked                             → screen_locked, actions refused; screenshots still allowed
//   user actively typing                      → user_actively_typing (keyboard actions, M3): the executor retries
//                                               3 × 200 ms (reason-policy RETRY), then refuses
// The native side re-checks secure input and the lock before it acts, so a stale probe cannot let an action through.
const { allows } = require("./grants.cjs");

/** The reason an action must not run now, or null. `op` is a grants.cjs op ("see", "left_click", "type", …). */
function actionGate(probe, op) {
  if (op === "see") return null;
  if (!probe || typeof probe !== "object") return "ax_untrusted_cannot_verify";
  if (probe.screenLocked === true) return "screen_locked";
  if (probe.secureInput === true) return "secure_input_active";
  return null;
}

const TIER_HINTS = {
  read: "is granted at tier \"read\" (browsers): it is visible in screenshots, but clicks and typing are refused. Use the browser tools to interact with web pages.",
  click: "is granted at tier \"click\" (terminals and IDEs): left-click and scroll only; typing, keys, right-click, modifier-clicks and drag are refused.",
};
/** Throws when the app's tier does not allow the op. */
function checkTier(bundleId, tier, op) {
  if (allows(tier, op)) return;
  const error = new Error(`${bundleId} ${TIER_HINTS[tier] ?? `is granted at tier "${tier}", which does not allow ${op}.`}`);
  error.code = "tier_refused";
  error.tier = tier;
  throw error;
}

module.exports = { actionGate, checkTier };
