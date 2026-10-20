// AX_REASON_LADDER_POLICY (docs/04 §判定树 5): what an AX `unsupported` / `ineffective` result may lead to.
//
//   "fallback"  the action may fall through to raw input (dispatchRaw, CGEvent to the target pid)
//   "block"     known reason that must never fall through (falling through would hit the wrong thing)
//   "retry"     back off and retry (user_actively_typing: 3 times, 200 ms apart, then refuse)
//   anything not in the table → block, and log that the reason needs a policy entry (fail-closed)
//
// The fallback whitelist (decision 2026-10-19): a reason is opened only with the app, the scene and the trigger
// written beside it, and only after it has been seen working live. Each entry names the ops it is open for: the same
// reason from another action (a text reason on a click) blocks. M3 may open at most three — no_press_action,
// no_focused_text, text_not_writable. Every other reason — ax_error included (a hung app or an unstable AX bridge:
// raw events would land somewhere else) — stays blocked.
const FALLBACK = Object.freeze({
  no_focused_text: {
    ops: ["type"],
    app: "M3 text fixture (dev.openclaude.cu-text-fixture, tests/fixtures/cu-text-fixture): an NSTextView subclass that ignores AX value writes; any app with such a text control",
    scene: "app_type by element_index or coordinate at a text element (AXTextField / AXTextArea / AXComboBox / search field) of the target window that does NOT hold the keyboard focus, and whose value AX cannot write",
    trigger: "TextInput.axType: AXValue / AXSelectedText not settable, or the write is accepted but AXValue reads back unchanged (axWriteIgnored), while the element is not the app's focused element",
    falls_to: "rawType: AXFocused = true on that element (no click: raw mouse events are not delivered, see no_press_action), focus confirmed, then Unicode key events ≤ 20 UTF-16 units, AXValue read back",
    live: "SEEN 2026-10-19 (macOS 27.2): fixture `locked` view, unfocused — AX write ignored → no_focused_text → focused via AXFocused, 27 UTF-16 units (中文, ZWJ emoji, flag) typed, app dump byte-equal, verified",
  },
  text_not_writable: {
    ops: ["type"],
    app: "M3 text fixture (dev.openclaude.cu-text-fixture): the same NSTextView subclass; custom text views and web text fields that refuse AX value writes",
    scene: "app_type at a text element that holds the keyboard focus and whose value AX cannot write",
    trigger: "TextInput.axType: AXValue / AXSelectedText not settable, the write errors, or it is accepted but AXValue reads back unchanged (axWriteIgnored), while the element IS the app's focused element",
    falls_to: "rawType: replace selects all through AXSelectedTextRange (else ⌘A when the app is frontmost and Edit ▸ Select All is enabled, else selectAllKeystrokeNotSent and insert), Unicode key events ≤ 20 UTF-16 units, AXValue read back",
    live: "SEEN 2026-10-19 (macOS 27.2): fixture `locked` view, focused, mode replace — AX write ignored → text_not_writable → select-all by AX, typed, app dump byte-equal, verified",
  },
});

// Planned, not open. no_press_action was opened and then closed again on live evidence (2026-10-19, macOS 27.2).
const PLANNED_M3 = Object.freeze({
  no_press_action: {
    app: "Finder · list view rows (AXRow / AXCell)",
    scene: "app_click (left, count 1) on a listed AXRow / AXCell, owned by the target window, no sheet, enabled, with no AXPress on it or within four parents",
    trigger: "AXLadder.click: the climb finds no AXPress and the climb's start is an AXRow or AXCell (AXLadder.noPressFallbackRoles) — not an AXTextField: on a selected Finder row the name field would start a rename",
    falls_to: "rawClick: one left click via CGEventPostToPid at the same window-local point, natively re-gated and re-hit-tested, AXSelected read back",
    live: "CLOSED 2026-10-19. AX side confirmed (Finder Desktop list rows: AXCell / AXRow, no AXPress → no_press_action). Delivery fails: Finder, active with the window main, ignored every CGEventPostToPid mouse event — window fields 91/92 on and off, CGEventSetWindowLocation in both orientations, pid fields on and off, a preceding mouseMoved, an 80 ms press, a private-state source, SLEventPostToPid — AXSelected false → false each time; a guarded real HID click on the same row read back false → true. Keyboard events via CGEventPostToPid were accepted. The reference helper posts mouse events as authenticated event records (SLEventSetAuthenticationMessage + SLPostEventRecordTo, docs/05) — M4.",
    why_ax_cannot: "the element exposes no press-like action; selecting via AXSelected is not what a click does (it skips the app's click handling)",
  },
});

// docs/04 / docs/05 reasons whose answer is "no" (降级也点不到 / 会点错).
const BLOCK = Object.freeze({
  window_off_space: "docs/04", app_hidden: "docs/04", window_minimized: "docs/04", secure_input_active: "docs/04",
  sheet_or_modal_on_target_window: "docs/04", sheet_dimmed_areas: "docs/04", anotherWindowIsOnTopAtThePressPoint: "docs/04",
  foreign_overlay_above_granted: "docs/04", listed_element_covered: "docs/04", key_not_mapped: "docs/04",
  ax_untrusted_cannot_verify: "docs/04", off_space_containment_unverifiable: "docs/04", foreign_pid: "docs/04",
  popup_menu_click_refused: "docs/05", context_menu_rclick_refused: "docs/05", screen_locked: "docs/05",
  would_front_during_secure_input: "docs/05", recent_hid_keydown_would_misdirect: "docs/05",
  ax_error: "M3 decision: a hung app or an unstable AX bridge — raw events would land somewhere else; never a fallback",
  // Local codes (not in the spec's tables), each a refusal by construction:
  canvas: "live schema: unsupported(canvas) — no element answers AXPress within four parents; retry with element_index or target",
  listed_element_gone: "local: element_index names nothing in the last summary (window re-rendered)",
  no_focused_element: "local: target 'focused' but the app reports no focused element",
  no_target: "local: no coordinate, element_index or target",
  element_disabled: "local: the pressable element is disabled",
  // Raw-rung refusals (RawInput.swift / EventFactory.swift). Never AX results, but listed so a raw refusal that is
  // passed back through decide() reads as known, not unclassified.
  scgevent_unavailable: "local: no HID-state CGEventSource could be created; the whole raw path refuses",
  window_moved: "local: the window moved since the screenshot; the model's coordinate no longer means what it saw",
  raw_click_ineffective: "local: the raw click was delivered but the row's AXSelected did not change (the app did not accept it)",
  // app_type / app_key (TextInput.swift). A text result that is not ok is final: the readback already says why.
  no_text_target: "local: no text element at the target or within four parents (non-text targets are refused)",
  text_unchanged: "local: the AX write left the value as it was",
  text_mismatch: "local: the value read back is neither the expected text nor a prefix of it",
  partial_delivery: "local: only deliveredPrefixChars UTF-16 units of the text arrived",
  target_exited: "local: the target app exited during delivery; deliveredPrefixChars is what was sent",
  focus_refused: "local: AXFocused = true did not move the focus to the element (no_focused_text fallback)",
  system_key_combo_refused: "local: quit / app switch / lock combos are not part of M3",
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
 * What to do with one AX result of operation `op` ("type", "left_click", …).
 * @returns {{action: "done" | "fallback" | "block" | "retry", reason: string | null, unclassified?: true, retry?: object}}
 */
function decide(result, { log = console, op } = {}) {
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
  if (Object.hasOwn(FALLBACK, reason)) {
    if (FALLBACK[reason].ops.includes(op)) return { action: "fallback", reason };
    return { action: "block", reason, outOfScope: true };
  }
  if (Object.hasOwn(BLOCK, reason) || Object.hasOwn(PENDING_RAW, reason) || Object.hasOwn(PLANNED_M3, reason)) return { action: "block", reason };
  log.warn?.(unclassifiedMessage(reason));
  return { action: "block", reason, unclassified: true };
}

module.exports = { FALLBACK, PLANNED_M3, BLOCK, RETRY, PENDING_RAW, decide, unclassifiedMessage };
