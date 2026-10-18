// Session cycling (Go > Previous/Next Session, ⌘⇧[ / ⌘⇧], Ctrl+Tab / Ctrl+Shift+Tab, ⌥↑ / ⌥↓) over the 2.42304.0
// originals (R3-sidebar2, cov7-02). shared-16 qp (exported `G`) is a hook over the desktop's stores; its pieces are
// generated into generated/code-current/session-cycle-*.mjs and this module is the host form of the hook body:
//   - a(e, t, a) → step(): tm (the list) / the 50 ms repeat swallow (Wp) / qp's position `p` (sessionCycleStep: from the
//     last step's row by row key (Qp → Zp when its button left the DOM), else from the selected row, or 0 on a draft,
//     skipping the aria-current="page" row on a fresh step) / rm while the step lands in a folded group / the record
//     {mode, button, rowKey, pos, at} / home or open;
//   - s (keydown): Jp modifier keys reset the held sequence, am picks the chord (alt_arrow behind its gate), ze() and
//     Yp (the focus guard) end it, a consumed step preventDefaults (the caller does);
//   - c (keyup) / l (blur) end it; onCycleSession (the Go menu) is one fresh step.
// Host differences: there is one session list (mode is recorded but every mode reads it); position 0 opens Home (r[c]
// push) unless Home already shows a draft (`f`), there is no draft parked in a split pane (openDraftInPane) and no
// telemetry (ni); the alt_arrow chord's GrowthBook gate (shared-16 Up: __gb__1817753866) is a host constant (D41).
// R4i-sidebar SI1: a folded bucket's rows stay in bC's `hidden` container (source-sidebar-sections.jsx BucketRows), so
// tm lists them and a step can enter a folded group: rm unfolds a drawsOpenRows one, the sidebar's yS the others.
import { sessionCycleRepeatMs, isCycleModifierKey, cycleBlockedByFocus, sessionCycleChord } from './generated/code-current/session-cycle-chords.mjs';
import { cycleRowKey, expandCycleGroup, openCycleButton, rowAliasAttribute } from './generated/code-current/session-cycle-rows.mjs';
import { sessionCycleStep } from './generated/code-current/session-cycle-step.mjs';

export const CYCLE_REPEAT_MS = sessionCycleRepeatMs; // Wp
// shared-16 Up() = D("__gb__1817753866") (GrowthBook on). No GrowthBook here: ⌥↑ / ⌥↓ is on by host decision (R3).
export const SESSION_CYCLE_ALT_ARROW = true;

/**
 * am on macOS (xt() true) without the ⌥↑↓ chord: the delta of the chords the Keyboard shortcuts dialog lists
 * (Ctrl+Tab / Ctrl+Shift+Tab, ⌘⇧] / ⌘⇧[ by key code; Alt never). The cycler itself calls the original am.
 */
export function sessionCycleDelta(event) {
  if (!event || event.altKey) return 0;
  if (event.key === "Tab" && event.ctrlKey && !event.metaKey) return event.shiftKey ? -1 : 1;
  if (event.metaKey && event.shiftKey && !event.ctrlKey) {
    if (event.code === "BracketRight") return 1;
    if (event.code === "BracketLeft") return -1;
  }
  return 0;
}

/** The host list tm walks (`.dframe-recents-by-mode [data-kind="<mode>"]` officially). */
export const SIDEBAR_CYCLE_LIST = ".source-sidebar .df-session-list";

// A Code row's main button carries data-selected itself (generated sidebar-row-view KT, as officially); the Home rows'
// host JSX keeps it on the row, so the row is read when the button has none.
const selectedOf = (button) => button.getAttribute("data-selected") ?? button.closest?.("[data-row-key]")?.getAttribute("data-selected") ?? null;

/** tm (shared-16) over the host list: {buttons, selectedIdx}; alias rows left out, focused first, else open. */
export function sidebarCycleButtons(root = globalThis.document) {
  const list = root?.querySelector?.(SIDEBAR_CYCLE_LIST);
  const buttons = list ? Array.from(list.querySelectorAll(`[data-row-main-button]:not([${rowAliasAttribute}])`)) : [];
  let selectedIdx = buttons.findIndex((button) => selectedOf(button) === "focused");
  if (selectedIdx === -1) selectedIdx = buttons.findIndex((button) => selectedOf(button) === "open");
  return { buttons, selectedIdx };
}

/**
 * qp over injected host access. rows(mode) → {buttons, selectedIdx} (tm); open(button) opens a row (default im, which
 * expands its group first and clicks it); home() opens the new-session page; atHome() is qp's `f` (Home shows a
 * new-session draft); blocked() is ze() (a modal layer or menu is open). keydown(event) returns whether the step was
 * consumed (the caller then preventDefaults); step(delta) is the Go menu's onCycleSession.
 */
export function createSessionCycler({
  rows = () => sidebarCycleButtons(), open = openCycleButton, home = () => {}, atHome = () => false, mode = () => "code",
  blocked = () => false, altArrow = SESSION_CYCLE_ALT_ARROW, now = () => performance.now(),
} = {}) {
  let last = null;
  // a: one step in `dir`; `repeat` is the key's auto-repeat.
  function cycle({ dir }, repeat = false) {
    const c = mode();
    const listed = rows(c).buttons.length;
    if (listed === 0) return false;
    const at = now();
    const held = last?.mode === c ? last : null;
    if (repeat && held && at - held.at < sessionCycleRepeatMs) return true;
    const draft = atHome() === true;
    const position = sessionCycleStep(held, c, draft, dir, rows);
    let [pos, button] = position();
    // rm expands the folded group the step landed in (flushSync) and the step is taken again over the new list. Host
    // guard: a group that stays folded (a sidebar that did not unfold it) ends the loop instead of spinning.
    for (let guard = listed + 1; button && guard > 0 && expandCycleGroup(button); guard -= 1) [pos, button] = position();
    last = { mode: c, button, rowKey: cycleRowKey(button), pos, at };
    if (!button && draft) return true;
    if (!button) { home(); return true; }
    button.scrollIntoView?.({ block: "nearest" });
    open(button);
    return true;
  }
  // s: the window keydown.
  function keydown(event) {
    if (isCycleModifierKey(event)) { if (!event.repeat) last = null; return false; }
    const chord = sessionCycleChord(event, altArrow);
    if (chord === null || event.defaultPrevented) { if (event.key !== "Shift") last = null; return false; }
    if (blocked() || cycleBlockedByFocus(event.target, chord.chord)) { last = null; return false; }
    return cycle(chord, event.repeat === true);
  }
  // c: releasing the modifier (or every modifier) ends a held sequence.
  function keyup(event) { if (isCycleModifierKey(event) || (!event.ctrlKey && !event.metaKey && !event.altKey)) last = null; }
  // onCycleSession: one fresh step (none while a layer is open).
  function step(delta) {
    if (blocked()) return false;
    last = null;
    const consumed = cycle({ dir: delta, chord: "menu" }, false);
    last = null;
    return consumed;
  }
  return { cycle, keydown, keyup, step, reset: () => { last = null; }, get last() { return last; } };
}
