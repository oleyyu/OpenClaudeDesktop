// Composer keystroke classification (2.2553.1 c099c328d :7822-7832 hh key
// kinds, :7878 isSubmitKeystroke, :9345-9400 editor keydown, :8441 window
// Escape). Pure: takes a plain description of the event and the composer
// state, returns the action the editor should take.
export function isComposingEvent(event) {
  return !!(event?.isComposing || event?.nativeEvent?.isComposing || event?.key === "Process" || event?.keyCode === 229);
}

export function keyKind(event) {
  if (isComposingEvent(event)) return "ime";
  if (["Shift", "Control", "Alt", "Meta"].includes(event?.key)) return "modifier";
  if (event?.metaKey || (event?.ctrlKey && !event?.altKey)) return "shortcut";
  return "text";
}

// Escape inside the focused editor:
//  - "swallow": during IME composition, preventDefault+stopPropagation only.
//  - "stop": a busy, non-interrupting turn is stopped once unless claimed.
//  - "close": a local popup (mentions/commands) owns the key.
//  - "none": nothing to do (busy but already interrupting keeps the key).
export function escapeAction({ event, running = false, interrupting = false, escapeClaimed = false, popupOpen = false, stopLatched = false }) {
  if (event?.defaultPrevented) return "none";
  if (isComposingEvent(event)) return "swallow";
  if (popupOpen) return "close";
  if (running && !interrupting) {
    if (escapeClaimed) return "none";
    return stopLatched ? "none" : "stop";
  }
  return "none";
}

// Escape anywhere in the window while the composer's panel is active (c099c328d-CbkcmYSW.js:10129-10150):
// an event nobody claimed (not defaultPrevented, not composing — isComposing or keyCode 229 — not on
// a canvas / [role=application] target, shared-6 JL) stops a busy, non-interrupting turn once; the
// latch (Et) holds until the turn ends. A local menu, dialog or Settings that is open claims it.
//  - "stop": preventDefault, then onStop({trigger:'escape'}).
//  - "none": leave the event alone.
export function windowEscapeAction({ key = "Escape", defaultPrevented = false, isComposing = false, keyCode, running = false, interrupting = false,
  latched = false, overlayOpen = false, targetIsCanvas = false, panelActive = true } = {}) {
  if (key !== "Escape" || defaultPrevented || isComposing || keyCode === 229) return "none";
  if (!panelActive || overlayOpen || targetIsCanvas) return "none";
  if (!running || interrupting || latched) return "none";
  return "stop";
}

// Esc Esc opens Rewind (code-workspace.js:1919-1946 Gl, Wl = 500 ms): two plain Escapes nobody claimed, within the
// window, outside a canvas / [role=application] target; the host then opens the picker only for an empty, idle
// composer (cc43287c9 :32772 qf, Claude Code's Esc Esc). `press` takes the event's facts and returns true on the
// second press (and starts over); an Escape that stops a turn or is claimed by a menu or dialog resets the count.
export const DOUBLE_ESCAPE_MS = 500;
export function createDoubleEscape({ windowMs = DOUBLE_ESCAPE_MS, now = () => Date.now() } = {}) {
  let last = null;
  return {
    press({ key, defaultPrevented = false, isComposing = false, keyCode, repeat = false, metaKey = false, ctrlKey = false, altKey = false, shiftKey = false,
      targetIsCanvas = false, claimed = false } = {}) {
      const plain = key === "Escape" && !defaultPrevented && !isComposing && keyCode !== 229 && !repeat && !metaKey && !ctrlKey && !altKey && !shiftKey && !targetIsCanvas && !claimed;
      if (!plain) { last = null; return false; }
      const at = now();
      if (last !== null && at - last <= windowMs) { last = null; return true; }
      last = at;
      return false;
    },
    reset() { last = null; },
  };
}

// shared-6 JL: canvas and [role=application] targets keep Escape for themselves.
export const ESCAPE_EXEMPT_TARGETS = 'canvas, [role="application"]';
export function escapeExemptTarget(target) {
  return !!target?.closest?.(ESCAPE_EXEMPT_TARGETS);
}

// Plain ↑ in an empty editor first takes back the newest queued message (c099c328d :11162-11188 ya:
// no modifier, `$?.isEmpty`, no suggestion popup, not in bash mode / composing), before history.
export function emptyArrowUpDequeues({ event, empty = false, popupOpen = false }) {
  if (event?.key !== "ArrowUp" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  if (isComposingEvent(event)) return false;
  return empty && !popupOpen;
}

// 2.42304.0 c227f4d5e OP keydown (the editor's capture handler, ahead of popups and the composer's own keys):
// `if (!(e.shiftKey || e.altKey)) { if ((e.repeat || Date.now() < Xr.current) && (e.metaKey || e.ctrlKey || zs()))
// { e.preventDefault(); e.stopPropagation(); return; } }`. Xr is the ignoreStrayEnter() deadline (now + rP, 500ms;
// -Infinity until set); zs() is the Enter-sends preference, always on in the desktop app (shared-frame en: " Electron/").
// True: swallow this Enter (a key repeat, or one inside the window after focus was handed to the composer).
export function strayEnterSwallowed({ event, until = -Infinity, now = Date.now(), plainEnterSends = true } = {}) {
  if (event?.key !== "Enter" || event.shiftKey || event.altKey) return false;
  if (!(event.repeat || now < until)) return false;
  return !!(event.metaKey || event.ctrlKey || plainEnterSends);
}

// Enter inside the focused editor (Shift/Alt pass through as a newline).
//  - "newline": Shift+Enter / Alt+Enter.
//  - "ignore": key repeat, IME composition, Cmd+Enter while composing.
//  - "submit": plain Enter (priority "next" while running).
//  - "submit-later": Cmd/Ctrl+Enter (priority "later" while running).
//  - "popup": a suggestion popup owns Enter.
//  - "submit-fork": Cmd+Alt+Enter, 'Send in a forked session' (zR :15370-15382).
export function enterAction({ event, popupOwnsEnter = false }) {
  if (event?.key !== "Enter") return "none";
  const meta = !!(event.metaKey || event.ctrlKey);
  if (event.altKey && event.metaKey && !event.shiftKey && !event.ctrlKey && !event.repeat && !isComposingEvent(event) && !popupOwnsEnter) return "submit-fork";
  if (event.shiftKey || event.altKey) return "newline";
  if (event.repeat) return "ignore";
  if (isComposingEvent(event)) return "ignore";
  if (popupOwnsEnter) return "popup";
  return meta ? "submit-later" : "submit";
}

// While a turn runs Enter steers ("next") and Cmd/Ctrl+Enter queues ("later"). Idle, Cmd/Ctrl+Enter on the Home
// draft is "Send and stay here" (c099c328d :11081-11088 Bi: idle → {stayOnDraft: e && zi()}, :11270-11282 ⌘⏎ →
// Pi(Bi(true)); cc43287c9 :28620 stayOnDraftHint = cn === 'draft' && !Yn): "stay". Plain Enter stays undefined.
export function submitPriority(action, running, { stayOnDraft = false } = {}) {
  if (action === "submit-fork") return "fork";
  if (!running) return action === "submit-later" && stayOnDraft ? "stay" : undefined;
  return action === "submit-later" ? "later" : "next";
}
