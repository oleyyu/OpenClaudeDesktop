// AX_REASON_LADDER_POLICY (docs/04 §判定树 5): what an AX `unsupported` / `ineffective` result may lead to.
//
//   "fallback"  the action may fall through to raw input (dispatchRaw, CGEvent to the target pid)
//   "block"     known reason that must never fall through (falling through would hit the wrong thing)
//   "retry"     back off and retry (user_actively_typing: 3 times, 200 ms apart, then refuse)
//   anything not in the table → block, and log that the reason needs a policy entry (fail-closed)
//
// The fallback whitelist starts EMPTY (decision 2026-10-19): a reason is added only after it has been seen on a real
// app, with the app, the scene and the trigger written beside it. Until then every non-ok AX result blocks.
const FALLBACK = Object.freeze({
  // reason: "App · scene · trigger" — none yet.
});

// docs/04 / docs/05 reasons whose answer is "no" (降级也点不到 / 会点错).
const BLOCK = Object.freeze({
  window_off_space: "docs/04", app_hidden: "docs/04", window_minimized: "docs/04", secure_input_active: "docs/04",
  sheet_or_modal_on_target_window: "docs/04", sheet_dimmed_areas: "docs/04", anotherWindowIsOnTopAtThePressPoint: "docs/04",
  foreign_overlay_above_granted: "docs/04", listed_element_covered: "docs/04", key_not_mapped: "docs/04",
  ax_untrusted_cannot_verify: "docs/04", off_space_containment_unverifiable: "docs/04", foreign_pid: "docs/04",
  popup_menu_click_refused: "docs/05", context_menu_rclick_refused: "docs/05", screen_locked: "docs/05",
  would_front_during_secure_input: "docs/05", recent_hid_keydown_would_misdirect: "docs/05",
  // Local codes (not in the spec's tables), each a refusal by construction:
  canvas: "live schema: unsupported(canvas) — no element answers AXPress within four parents; retry with element_index or target",
  listed_element_gone: "local: element_index names nothing in the last summary (window re-rendered)",
  no_focused_element: "local: target 'focused' but the app reports no focused element",
  no_target: "local: no coordinate, element_index or target",
  element_disabled: "local: the pressable element is disabled",
});

const RETRY = Object.freeze({ user_actively_typing: { attempts: 3, delayMs: 200 } });

// Reasons the native side may report that the main process does not act on yet; they still block (they are listed so
// the warning below is only for reasons nobody has looked at).
const PENDING_RAW = Object.freeze({
  multi_click_needs_raw_input: "local: double/triple click is not a repeated AXPress; needs dispatchRaw (M3)",
  ax_press_failed: "local: AXPress and AXConfirm both returned an error (ineffective)",
});

const unclassifiedMessage = (reason) => `[cu ax] unclassified rung-1 reasonCode="${reason}" — no AX_REASON_LADDER_POLICY entry; blocking (fail-closed) rather than falling through to CGEvent. Add a policy entry for this reason.`;

/**
 * What to do with one AX result.
 * @returns {{action: "done" | "fallback" | "block" | "retry", reason: string | null, unclassified?: true, retry?: object}}
 */
function decide(result, { log = console } = {}) {
  const outcome = result?.outcome;
  if (outcome === "ok") return { action: "done", reason: null };
  const reason = typeof result?.reasonCode === "string" && result.reasonCode ? result.reasonCode : null;
  if (outcome !== "unsupported" && outcome !== "ineffective" && outcome !== "dryRun") {
    log.warn?.(`[cu ax] unknown outcome "${outcome}" — blocking (fail-closed).`);
    return { action: "block", reason: reason ?? "unknown_outcome", unclassified: true };
  }
  if (outcome === "dryRun") return { action: "block", reason: "dry_run" };
  if (reason === null) {
    log.warn?.("[cu ax] non-ok result without a reasonCode — blocking (fail-closed).");
    return { action: "block", reason: "unclassified", unclassified: true };
  }
  if (Object.hasOwn(RETRY, reason)) return { action: "retry", reason, retry: RETRY[reason] };
  if (Object.hasOwn(FALLBACK, reason)) return { action: "fallback", reason };
  if (Object.hasOwn(BLOCK, reason) || Object.hasOwn(PENDING_RAW, reason)) return { action: "block", reason };
  log.warn?.(unclassifiedMessage(reason));
  return { action: "block", reason, unclassified: true };
}

module.exports = { FALLBACK, BLOCK, RETRY, PENDING_RAW, decide, unclassifiedMessage };
