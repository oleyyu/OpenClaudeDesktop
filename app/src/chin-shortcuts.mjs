// Composer chin chords. sidebar-rows.js:14191-14200 (= shared-21-D098Wd--.js aR rows): openModeMenu
// "cmd+shift+m" code KeyM (when isClaudeApp) and "cmd+alt+m" KeyM; openModelMenu "cmd+shift+i" KeyI;
// openEffortMenu "cmd+shift+e" KeyE; toggleFastMode "cmd+alt+f" KeyF. shared-21 uR (:14326-14346) matches
// e.code (dR) and sR (:14300-14309) requires the EXACT modifier set on mac (metaKey === cmd, ctrlKey === ctrl,
// shiftKey === shift, altKey === alt), so ⌘⇧⌥M or ⌃⌘⇧M match nothing. This build presents as the Claude app
// (isClaudeApp), so both Mode rows apply and mR("openModeMenu") (:14359-14362) — the first row's raw "cmd+shift+m" —
// is the tooltip's triggerKey (formatted ⇧⌘M, see MODE_MENU_KEYS).
// "cmd" is Meta on this macOS-only build (like pane-shortcuts.mjs); an IME composition never matches.
const CHORDS = Object.freeze([
  { code: "KeyM", shift: true, alt: false, command: "mode" },
  { code: "KeyM", shift: false, alt: true, command: "mode" },
  { code: "KeyI", shift: true, alt: false, command: "model" },
  { code: "KeyE", shift: true, alt: false, command: "effort" },
  { code: "KeyF", shift: false, alt: true, command: "fast" },
]);
// c360a9e1c-GPs-MV9u.js:4924-4945 Ud triggerKey = ve("openModeMenu") is the RAW key string "cmd+shift+m"; the
// tooltip hands it to Mu (shared-frame-C_2npUJq.js:4572-4580) → Qa variant "text" (:2046-2110), whose po
// (:2206-2219) sorts modifiers by io = [ctrl, control, alt, option, shift, cmd, command, meta] (:2136), so it reads
// ⇧⌘M on macOS, not ⌘⇧M. source-composer.jsx formats these keys with the shortcutCaps port of po/ho.
export const MODE_MENU_KEYS = "cmd+shift+m";
// openModelMenu's raw key (the environment bar's model trigger tooltip, x6 `Hr("openModelMenu", h)`).
export const MODEL_MENU_KEYS = "cmd+shift+i";
// Local menu kinds of the three chin menus (main.jsx setMenu kinds) ↔ c360a9e1c qd (:4626-4630) menus.
export const CHIN_MENU_KINDS = Object.freeze({ mode: "permission", model: "model", effort: "effort" });
export const chinKindOfMenu = (menuKind) => Object.keys(CHIN_MENU_KINDS).find((kind) => CHIN_MENU_KINDS[kind] === menuKind) ?? null;

export function chinShortcutCommand(event) {
  if (!event || !event.metaKey || event.ctrlKey || event.isComposing) return null;
  return CHORDS.find((chord) => chord.code === event.code && chord.shift === !!event.shiftKey && chord.alt === !!event.altKey)?.command ?? null;
}

// c360a9e1c Zd w (:4700-4718) requestOpen: effort with ≤1 effort option falls back to "model"; while any chin
// menu is open the chord closes it only when it names that same (resolved) menu, otherwise it is ignored; a
// disabled model picker ignores model/effort; with no items it is a no-op (onModelChordRedirect has no local
// counterpart). T (:4719-4760) never opens on a repeat (it is still preventDefault'ed by the caller).
// Returns { action: "open" | "close", kind: "mode" | "model" | "effort" } or null.
export function resolveChinRequest({ command, openKind = null, effortCount = 0, modelCount = 0, modeCount = 0, pickerDisabled = false, repeat = false } = {}) {
  if (repeat || !Object.hasOwn(CHIN_MENU_KINDS, command ?? "")) return null;
  const kind = command === "effort" && effortCount <= 1 ? "model" : command;
  if (openKind) return openKind === kind ? { action: "close", kind } : null;
  if (pickerDisabled && (command === "model" || command === "effort")) return null;
  const available = command === "mode" ? modeCount > 0 : (command === "effort" && effortCount > 1) || modelCount > 0;
  return available ? { action: "open", kind } : null;
}

// Zd T (:4728-4737): while the Mode menu is open a plain (no meta/ctrl/alt/shift) Digit key is claimed
// (preventDefault + stopPropagation) and Digit1-9 pick the Nth enabled quick-key item (Jd/Yd numbering);
// Digit0 is claimed but selects nothing. T has no repeat guard here, so a repeated digit selects too. Returns the digit 0-9, or null when the key is not a plain Digit.
export function modeMenuDigit(event) {
  if (!event || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.isComposing) return null;
  const match = /^Digit(\d)$/.exec(event.code ?? "");
  return match ? Number(match[1]) : null;
}
