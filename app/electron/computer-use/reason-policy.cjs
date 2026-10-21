// AX_REASON_LADDER_POLICY (docs/04 §判定树 5): what an AX `unsupported` / `ineffective` result may lead to.
//
//   "fallback"  text and key actions may fall through to raw input (each entry names its ops)
//   "block"     known reason that must never fall through (falling through would hit the wrong thing)
//   "retry"     back off and retry (user_actively_typing: 3 times, 200 ms apart, then refuse)
//   anything not in the table → block, and log that the reason needs a policy entry (fail-closed)
//
// The fallback whitelist (decision 2026-10-19): a reason is opened only with the app, the scene and the trigger
// written beside it, and only after it has been seen working live. Each entry names the ops it is open for: the same
// reason from another action (a text reason on a click) blocks. M3 may open at most three — no_press_action,
// no_focused_text, text_not_writable. app_key (official §1.6.1) adds no_ax_key_action for op "key" only: the official
// app_key itself sends a key with no Accessibility equivalent as a keystroke. Every other reason — ax_error included (a hung app or an unstable AX bridge:
// raw events would land somewhere else) — stays blocked.
//
// Clicks (official 2.42304.0 click ladder, 2026-10-21): a row is selected through AXSelected and opened through AXOpen
// (AXLadder.selectOrOpen), so a Finder list row needs no raw rung and no_press_action is no longer produced. A drag
// whose readable state stays unchanged is drag_ineffective for every app: the official build names no system-app
// reason and has no Accessibility equivalent for a drag (system_app_ignores_posted_events is gone).
const FALLBACK = Object.freeze({
  no_focused_text: {
    ops: ["type"],
    app: "M3 text fixture (dev.openclaude.cu-text-fixture, tests/fixtures/cu-text-fixture): an NSTextView subclass that ignores AX value writes; any app with such a text control",
    scene: "app_type by element_index or coordinate at a text element (AXTextField / AXTextArea / AXComboBox / search field) of the target window that does NOT hold the keyboard focus, and whose value AX cannot write",
    trigger: "TextInput.axType: AXValue / AXSelectedText not settable, or the write is accepted but AXValue reads back unchanged (axWriteIgnored), while the element is not the app's focused element",
    falls_to: "rawType: AXFocused = true on that element (no click: raw mouse events are not delivered, see PLANNED_M3.no_press_action), focus confirmed, then Unicode key events ≤ 20 UTF-16 units, AXValue read back",
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
  no_ax_key_action: {
    ops: ["key"],
    app: "any app: the key has no Accessibility equivalent (tab, arrows, home / end, page keys, space, forward delete), or the element at the address offers none (no AXConfirm / AXCancel, not a text element, or a text that ignores the AX write)",
    scene: "app_key on a granted app's window in the background (official 2.42304.0 §1.6.1: \"otherwise the key goes as a keystroke to whatever has keyboard focus in that window\")",
    trigger: "KeyInput.axKey: the combo is not return / escape / backspace / cmd+a, or the climb (the hit and four parents) has no matching action, or an AXSelectedText write read back unchanged (axWriteIgnored, selection restored)",
    falls_to: "KeyInput.rawKey: one CGEventPostToPid keystroke from the background key set (key_not_mapped otherwise), refused when the app's focused window is another window (focus_in_sibling_window), for element_index (key_cannot_be_aimed) and for ⌘A while Select All is disabled in the background (menu_command_disabled); result unverified",
    live: "SEEN 2026-10-21 (macOS 27.2, tests/computer-use-key-live.test.mjs): TextEdit temp document in the background (Chrome in front) — right / left / shift+left / tab / forward_delete / cmd+left keystrokes moved the caret and changed AXValue as expected, front app and cursor unchanged; fixture `locked` view (ignores AX writes) — backspace AX write read back unchanged (axWriteIgnored) → keystroke, one character removed",
  },
});

// Planned, not open. no_press_action was opened and then closed again on live evidence (2026-10-19, macOS 27.2), and
// superseded on 2026-10-21 by the official AX row step: AXLadder no longer reports it.
const PLANNED_M3 = Object.freeze({
  no_press_action: {
    app: "Finder · list view rows (AXRow / AXCell)",
    scene: "app_click (left, count 1) on a listed AXRow / AXCell, owned by the target window, no sheet, enabled, with no AXPress on it or within four parents",
    trigger: "none since 2026-10-21: AXLadder.click selects the row (set AXSelected=true, read back) or opens it (AXOpen) as the official ladder does",
    falls_to: "rawClick: one left click via CGEventPostToPid at the same window-local point, natively re-gated and re-hit-tested, AXSelected read back",
    live: "CLOSED 2026-10-19. AX side confirmed (Finder Desktop list rows: AXCell / AXRow, no AXPress → no_press_action). Delivery fails: Finder, active with the window main, ignored every CGEventPostToPid mouse event — window fields 91/92 on and off, CGEventSetWindowLocation in both orientations, pid fields on and off, a preceding mouseMoved, an 80 ms press, a private-state source, SLEventPostToPid — AXSelected false → false each time; a guarded real HID click on the same row read back false → true. Keyboard events via CGEventPostToPid were accepted. SUPERSEDED 2026-10-21: the official 2.42304.0 ladder does not click a row at all — it writes AXSelected (AXOpen on a double click), which is what AXLadder does now.",
    why_ax_cannot: "superseded: the official build selects rows through AXSelected (computer_use.node \"set AXSelected=true\", \"(ascended)\", \"(row of the text)\")",
  },
});

// docs/04 / docs/05 reasons whose answer is "no" (降级也点不到 / 会点错).
const BLOCK = Object.freeze({
  window_off_space: "docs/04", app_hidden: "docs/04", window_minimized: "docs/04", secure_input_active: "docs/04",
  sheet_or_modal_on_target_window: "docs/04", sheet_dimmed_areas: "docs/04", anotherWindowIsOnTopAtThePressPoint: "docs/04",
  foreign_overlay_above_granted: "docs/04", listed_element_covered: "docs/04", key_not_mapped: "docs/04",
  ax_untrusted_cannot_verify: "docs/04", off_space_containment_unverifiable: "docs/04", foreign_pid: "docs/04",
  popup_menu: "official 2.42304.0: a pop-up / pull-down menu control would open its menu in the background (fronts the app or takes the keyboard)",
  context_menu_rclick_refused: "docs/05", screen_locked: "docs/05",
  would_front_during_secure_input: "docs/05", recent_hid_keydown_would_misdirect: "docs/05",
  ax_error: "M3 decision: a hung app or an unstable AX bridge — raw events would land somewhere else; never a fallback",
  // Local codes (not in the spec's tables), each a refusal by construction:
  canvas: "official 2.42304.0: no accessibility action at the point — nothing answers AXPress within four parents and nothing up to the window can be selected; retry with element_index or target",
  select_refused: "official 2.42304.0: AXSelected is not settable on the row (or the write errored)",
  no_range_for_position: "official 2.42304.0: the text cannot say which character is at the point (double / triple click)",
  caret_not_placed: "official 2.42304.0: the word / line selection was written but not read back",
  selection_not_confirmed: "local: set AXSelected=true was accepted but the row did not read back selected within 500 ms (ineffective)",
  listed_element_gone: "local: element_index names nothing in the last summary (window re-rendered)",
  no_focused_element: "local: target 'focused' but the app reports no focused element",
  no_target: "local: no coordinate, element_index or target",
  element_disabled: "local: the pressable element is disabled",
  no_menu_action: "local: right click — neither the element nor its two parents answer AXShowMenu; there is no other way to open its menu",
  menu_not_shown: "local: AXShowMenu was performed but no context menu appeared (ineffective)",
  // Raw-rung refusals (RawInput.swift / EventFactory.swift). Never AX results, but listed so a raw refusal that is
  // passed back through decide() reads as known, not unclassified.
  scgevent_unavailable: "local: no HID-state CGEventSource could be created; the whole raw path refuses",
  window_moved: "local: the window moved since the screenshot; the model's coordinate no longer means what it saw",
  raw_click_ineffective: "local: the raw click was delivered but the row's AXSelected did not change (the app did not accept it)",
  drag_ineffective: "local: a fully released drag left readable AX state unchanged",
  drag_timeout: "local: the 3000 ms drag deadline elapsed; a held button was released",
  drag_in_progress: "local: another native drag owns the held-button interval",
  // app_type / app_key (TextInput.swift). A text result that is not ok is final: the readback already says why.
  no_text_target: "local: no text element at the target or within four parents (non-text targets are refused)",
  text_unchanged: "local: the AX write left the value as it was",
  text_mismatch: "local: the value read back is neither the expected text nor a prefix of it",
  partial_delivery: "local: only deliveredPrefixChars UTF-16 units of the text arrived",
  target_exited: "local: the target app exited during delivery; deliveredPrefixChars is what was sent",
  focus_refused: "local: AXFocused = true did not move the focus to the element (no_focused_text fallback)",
  // app_key (official §1.6.1; KeyInput.swift, service.cjs appKey). Refusals before or instead of a keystroke.
  bad_args: "official error_kind: the combo is not exactly one key, or the target arguments are wrong",
  grant_flag_required: "official error_kind: a system combo without the systemKeyCombos grant flag",
  state_conflict: "official error_kind: the combo would touch the clipboard (use app_type); or a display-scope action while this session holds app locks (app_release first, official §1.4.3)",
  would_replace_content: "official: text is selected and this key would replace it",
  key_cannot_be_aimed: "official: AX could not do it and a keystroke cannot be aimed at an element_index",
  menu_command_disabled: "official: cmd+a while Select All is disabled in the background app (the app would ignore it)",
  focus_in_sibling_window: "official: the app's keyboard focus is in another of its windows; a keystroke would land there",
  // app_scroll (official §1.6.2; ScrollInput.swift, service.cjs appScroll). Accessibility only: there is no raw rung.
  horizontal_scroll: "official: app_scroll moves only the vertical scroll bar; a non-zero dx is refused (feature_unavailable)",
  scrollbar_unchanged: "local: the vertical scroll bar's AXValue read back unchanged — already at that end (atLimit) or the app ignored the write (ineffective)",
  // app_bring_to_current_space (official §1.6.3; WindowShow.swift, Spaces.swift, service.cjs appBringToCurrentSpace).
  // Not an AX rung (nothing falls through to raw input); listed so the codes read as known.
  window_not_in_app: "official error_kind app_not_granted: the window_id is not one of the app's windows (or is gone)",
  still_parked: "official: the minimized / hidden window did not come back within the expected time (state_conflict)",
  user_is_in_the_app: "official: the user is in another window of the app; showing this one would take the keyboard (nothing changed)",
  front_window_cannot_be_raised: "official: the user's front window could not be put back on top of the shown one (nothing changed)",
  unavailable: "official: bringing a minimized or hidden window back is not available (no Accessibility, no AX window; nothing changed)",
  owner_mismatch: "official error_kind app_not_granted: the window no longer belongs to the app",
  space_unclassifiable: "official error_kind state_conflict: the window's Space could not be determined",
  fullscreen_space: "official error_kind state_conflict: the user's current Space is a full-screen app's; nothing can be moved into it",
  op_unavailable: "official error_kind feature_unavailable: moving windows between Spaces is not available (SkyLight symbols missing, or WindowServer ignored the move — seen live on macOS 27.2 for another process's window)",
  window_changed: "official error_kind state_conflict: the window's owner changed between the dry run and the move",
  move_not_confirmed: "official error_kind state_conflict: the window did not read back on the current Space in time",
  // Full control / display-scope (official §1.4; full-control.cjs, service.cjs). Not AX rungs (display input never falls
  // through to anything else); listed so the codes read as known, not unclassified.
  takeover_required: "official takeover_unavailable: full-screen control is not approved for this session yet — call request_full_control first",
  takeover_declined: "official: the user kept the session in the background (full-screen control was not granted; separate from request_access)",
  cu_lock_held: "official state_conflict: another session holds the display lock (full-screen control) right now",
  unattributed_window: "official app_not_granted / unattributed_window: the app in front, or the window under the point (hit test U()), has no bundle id, so no grant can cover it",
  hit_test_self_intercept: "official hit_test_self_intercept: the hit test landed on this app's own window, so the target can't be verified",
  self_frontmost: "official state_conflict: this app's own window is in front; click the target app first",
  tier_insufficient: "official tier_refused: the app in front (or under the point) is granted at a tier that doesn't allow this display-scope action",
  delivery_focus_check_failed: "official delivery_focus_check_failed: another app came to the front during a screen-wide key / type, so the rest was not sent (keystrokes follow key focus)",
  // The clipboard (official §1.5; clipboard.cjs). clipboard_unavailable is a refusal; the paste reasons never reach the
  // agent as a refusal — type falls back to typing grapheme by grapheme (service.cjs pasteText, pasteFallback).
  clipboard_unavailable: "local feature_unavailable: no clipboard to read or write in this process (read_clipboard / write_clipboard)",
  clipboard_write_failed: "local: type's paste could not write the clipboard; nothing was pressed (falls back to typing)",
  clipboard_round_trip_failed: "official \"Clipboard write did not round-trip.\": the text read back differs; nothing was pressed (falls back to typing)",
    aborted: "official user interrupt: the call was cancelled (Esc, Stop) during a screen-wide hold / type / repeat / wait / batch; held keys and buttons were released",
});

const RETRY = Object.freeze({ user_actively_typing: { attempts: 3, delayMs: 200 } });

// Reasons the native side may report that the main process does not act on yet; they still block (they are listed so
// the warning below is only for reasons nobody has looked at).
const PENDING_RAW = Object.freeze({
  multi_click_needs_raw_input: "local: no longer reported — double / triple click are AX (AXSelectedTextRange, AXPress ×2, AXOpen) or canvas",
  ax_press_failed: "local: AXPress and AXConfirm (or AXOpen on a double-clicked row) returned an error (ineffective)",
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
