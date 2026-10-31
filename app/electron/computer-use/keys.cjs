// app_key combos, as the official 2.42304.0 build reads them (muI2IV6k nH / gn / Asr / ksr, docs/computer-use-official-spec-20261021.md §1.6.1):
//   parse      "Command+Shift+Down" → {mods: ["shift", "meta"], keys: ["down"]}: modifier aliases folded, modifiers
//              de-duplicated and ordered ctrl, alt, shift, meta; "esc" → "escape", "del" → "delete"
//   normalize  the same as one string with meta spelled cmd: "shift+cmd+down"
//   isSystem   macOS system combos (quit, force quit, app switch, Spotlight, Mission Control …), and any modified key
//              outside printable ASCII: they need the session's systemKeyCombos grant flag
//   clipboard  the flags a combo would touch (⌘V reads the clipboard, ⌘C / ⌘X write it): app_key refuses these
const MOD_ALIASES = {
  meta: "meta", super: "meta", command: "meta", cmd: "meta", windows: "meta", win: "meta",
  ctrl: "ctrl", control: "ctrl", lctrl: "ctrl", lcontrol: "ctrl", rctrl: "ctrl", rcontrol: "ctrl",
  shift: "shift", lshift: "shift", rshift: "shift", alt: "alt", option: "alt",
};
const KEY_ALIASES = { esc: "escape", del: "delete", " ": "space", "\t": "tab", "\x1b": "escape", "\x7f": "delete", "\r": "enter", "\b": "backspace" };
const MOD_ORDER = ["ctrl", "alt", "shift", "meta"];
const DARWIN_SYSTEM = new Set(["meta+q", "shift+meta+q", "alt+shift+meta+q", "alt+meta+escape", "meta+tab", "shift+meta+tab", "meta+space",
  "alt+meta+space", "ctrl+meta+q", "ctrl+f2", "ctrl+f3", "ctrl+f8", "ctrl+f1", "ctrl+f7", "ctrl+up", "ctrl+down", "alt+f11", "alt+f8"]);

const orderMods = (mods) => [...new Set(mods)].sort((a, b) => MOD_ORDER.indexOf(a) - MOD_ORDER.indexOf(b));

function parseCombo(combo) {
  const ordered = [];
  for (const piece of String(combo).toLowerCase().split("+")) {
    let name = piece.trim();
    if (name === "") { if (piece.length === 1) name = piece; else continue; }
    const mod = MOD_ALIASES[name];
    ordered.push(mod === undefined ? { name: KEY_ALIASES[name] ?? name, isMod: false } : { name: mod, isMod: true });
  }
  return { mods: orderMods(ordered.filter((e) => e.isMod).map((e) => e.name)), keys: ordered.filter((e) => !e.isMod).map((e) => e.name), ordered };
}

/** "Command+Shift+Down" → "shift+cmd+down". */
function normalizeCombo(combo) {
  const { mods, keys } = parseCombo(combo);
  return [...mods.map((m) => (m === "meta" ? "cmd" : m)), ...keys].join("+");
}

const outsidePrintable = (key) => !/^[\x21-\x7e]+$/.test(key);
/** Whether a combo is a macOS system combo (needs the systemKeyCombos flag). */
function isSystemCombo(combo, system = DARWIN_SYSTEM) {
  const { mods, keys, ordered } = parseCombo(combo);
  if (mods.length > 0 && keys.some(outsidePrintable)) return true;
  if (keys.length === 0) return system.has(mods.join("+"));
  const prefix = mods.length > 0 ? `${mods.join("+")}+` : "";
  if (keys.some((key) => system.has(prefix + key))) return true;
  const held = [];
  for (const entry of ordered) {
    if (entry.isMod) { held.push(entry.name); continue; }
    const now = orderMods(held);
    if (system.has((now.length ? `${now.join("+")}+` : "") + entry.name)) return true;
  }
  return false;
}

/** The clipboard flags a combo would touch: ⌘/⌃ V reads, ⌘/⌃ C and X write (plus the Windows-style Insert / Shift+Delete). */
function clipboardFlags(combo) {
  const { mods, keys } = parseCombo(combo);
  const command = mods.includes("meta") || mods.includes("ctrl"), shift = mods.includes("shift");
  const flags = new Set();
  for (const key of keys) {
    if (command && key === "v") flags.add("clipboardRead");
    if (command && (key === "c" || key === "x")) flags.add("clipboardWrite");
    if (key === "insert") { if (shift) flags.add("clipboardRead"); if (mods.includes("ctrl")) flags.add("clipboardWrite"); }
    if (key === "delete" && shift) flags.add("clipboardWrite");
  }
  return flags;
}

/** How many keys other than fn the combo presses (app_key takes exactly one). */
const mainKeyCount = (combo) => parseCombo(combo).keys.filter((key) => key !== "fn").length;

// The key names the screen-wide key / hold_key press (native DisplayKeys.swift GlobalKeys.keyCode, kept in step).
const DISPLAY_KEY_ALIASES = { minus: "-", equal: "=", equals: "=", comma: ",", period: ".", slash: "/", backslash: "\\", semicolon: ";",
  quote: "'", apostrophe: "'", grave: "`", backtick: "`", bracketleft: "[", leftbracket: "[", bracketright: "]", rightbracket: "]",
  forwarddelete: "forward_delete", help: "insert", arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right",
  pgup: "pageup", pgdn: "pagedown", spacebar: "space", arrow_up: "up", arrow_down: "down", arrow_left: "left", arrow_right: "right",
  page_up: "pageup", page_down: "pagedown" };
const DISPLAY_KEYS = new Set(["return", "enter", "tab", "space", "delete", "backspace", "escape", "forward_delete", "left", "right", "down",
  "up", "home", "end", "pageup", "pagedown", "insert", ..."abcdefghijklmnopqrstuvwxyz0123456789", "=", "-", "]", "[", "'", ";", "\\", ",", "/", ".", "`",
  ...Array.from({ length: 20 }, (_, i) => `f${i + 1}`), ...Array.from({ length: 10 }, (_, i) => `kp_${i}`),
  "kp_decimal", "kp_multiply", "kp_add", "kp_plus", "kp_clear", "kp_divide", "kp_enter", "kp_subtract", "kp_minus", "kp_equal", "kp_equals"]);
/**
 * A screen-wide key / hold_key chord ("cmd+shift+a", key syntax) → what native presses: {modifiers: ["shift", "cmd"],
 * keys: ["a"]} (fn counts as a modifier), and the names it can't press (unknown). Nothing to press → empty: true.
 */
function displayChord(text) {
  const { mods, keys } = parseCombo(text);
  const modifiers = mods.map((m) => (m === "meta" ? "cmd" : m));
  const main = [];
  for (const key of keys) { if (key === "fn") { if (!modifiers.includes("fn")) modifiers.push("fn"); } else main.push(DISPLAY_KEY_ALIASES[key] ?? key); }
  return { modifiers, keys: main, unknown: main.filter((key) => !DISPLAY_KEYS.has(key)), empty: !modifiers.length && !main.length };
}

// The shape a screen-wide key / hold_key chord may have (official wA()): at most 8 names in all, counting modifiers and
// repeats; one key besides the modifiers, except navigation keys under shift alone ("shift+down+down" extends a selection).
const MAX_CHORD_NAMES = 8;
const MULTI_KEY_NAVIGATION = new Set(["up", "down", "left", "right", "home", "end", "pageup", "pagedown", "page_up", "page_down"]);
/** Why a chord can't be pressed as one action (kind "key" or "hold_key"), or null when its shape is fine. */
function chordProblem(text, kind = "key") {
  const { mods, keys, ordered } = parseCombo(text);
  const perCall = kind === "hold_key" ? "Hold one key (with its modifiers) per call." : "Send one key (with its modifiers) per call.";
  if (ordered.length > MAX_CHORD_NAMES) {
    return `A chord can name at most ${MAX_CHORD_NAMES} keys (modifiers and repeated names count); "${text}" names ${ordered.length}. ${perCall}`;
  }
  const main = keys.filter((key) => key !== "fn");
  if (main.length <= 1) return null;
  if (mods.every((mod) => mod === "shift") && main.every((key) => MULTI_KEY_NAVIGATION.has(key))) return null;
  return kind === "hold_key"
    ? `"${text}" would hold more than one key besides the modifiers, which one call can't do. ${perCall}`
    : `"${text}" presses more than one key besides the modifiers in one action, which isn't allowed. ${perCall} Use repeat to press the same key several times, and type for text.`;
}

module.exports = { parseCombo, normalizeCombo, isSystemCombo, clipboardFlags, mainKeyCount, displayChord, chordProblem, DISPLAY_KEYS, DARWIN_SYSTEM };
