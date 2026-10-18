// CDS Shortcut key parsing (2.2553.1 shared-frame-C_2npUJq.js:2111-2300), pure so
// node tests and menu-model.mjs can share it with source-shortcut.jsx.
// Parsing/labels follow fo/po/ho (:2206-2254) with the mac (ao/so) and non-mac
// (oo/co) glyph tables (:2137-2194) and spoken names mo (:2225-2244).
import { t } from "../electron/i18n/index.mjs";
export const MAC_USER_AGENT = /mac|iphone|ipad|ipod/i; // $a :2116
const MODIFIERS = ["cmd", "command", "meta", "ctrl", "control", "alt", "option", "shift"]; // no
const ORDER = ["ctrl", "control", "alt", "option", "shift", "cmd", "command", "meta"]; // io
const MAC_MODIFIER = { ctrl: "⌃", control: "⌃", alt: "⌥", option: "⌥", shift: "⇧", cmd: "⌘", command: "⌘", meta: "⌘" }; // ao
const OTHER_MODIFIER = { ctrl: "Ctrl", control: "Ctrl", alt: "Alt", option: "Alt", shift: "Shift", cmd: "Ctrl", command: "Ctrl", meta: "Ctrl" }; // oo
const COMMON_KEYS = { escape: "Esc", esc: "Esc", up: "↑", down: "↓", left: "←", right: "→",
  pageup: "Page Up", pagedown: "Page Down", home: "Home", end: "End", insert: "Insert", enter: "⏎", return: "⏎", plus: "+" };
const MAC_KEYS = { ...COMMON_KEYS, space: "␣", delete: "⌫", backspace: "⌫", tab: "⇥" }; // so
const OTHER_KEYS = { ...COMMON_KEYS, space: "Space", delete: "Backspace", backspace: "Backspace", tab: "Tab" }; // co
const SPOKEN = { cmd: "Command", command: "Command", meta: "Command", ctrl: "Control", control: "Control",
  alt: "Option", option: "Option", shift: "Shift", enter: "Enter", return: "Enter", space: "Space", tab: "Tab",
  delete: "Delete", backspace: "Delete", up: "Up", down: "Down", left: "Left", right: "Right" }; // mo
const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined); // lo
function keyLabel(key, mac) { // uo
  // A mouse gesture in a chord ("alt+click": the shortcuts dialog's ⌥-click row).
  if (key === "click") return t("Click");
  const label = own(mac ? MAC_KEYS : OTHER_KEYS, key);
  if (label !== undefined) return label;
  return /^f\d+$/.test(key) || key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
}
export function shortcutSequence(keys) { // fo: whitespace separates a "then" sequence
  const text = String(keys ?? "").trim().replace(/\s*\+\s*/g, "+");
  return text ? text.split(/\s+/) : [];
}
export function shortcutCaps(chord, mac) { // po + ho
  const parts = chord.toLowerCase().split("+").map(part => part.trim()).filter(Boolean);
  const modifiers = parts.filter(part => MODIFIERS.includes(part)), keys = parts.filter(part => !MODIFIERS.includes(part));
  const rank = key => ORDER.indexOf(!mac && ["cmd", "command", "meta"].includes(key) ? "ctrl" : key);
  modifiers.sort((a, b) => rank(a) - rank(b));
  const cap = (key, label) => {
    if (/^[A-Za-z0-9 ]+$/.test(label)) return { label };
    const spoken = own(SPOKEN, key);
    return spoken === undefined ? { label } : { label, spoken };
  };
  const table = mac ? MAC_MODIFIER : OTHER_MODIFIER;
  return [...modifiers.map(key => cap(key, table[key])), ...keys.map(key => cap(key, keyLabel(key, mac)))];
}
// go (:2255-2257): the visible labels of one chord.
export const shortcutLabels = (chord, mac) => (chord ? shortcutCaps(chord, mac).map(({ label }) => label) : []);
// c_ s_ (:8869-8872): a digit-only key spec is tabular.
export const isDigitShortcut = keys => /^\d+$/.test(String(keys ?? ""));
