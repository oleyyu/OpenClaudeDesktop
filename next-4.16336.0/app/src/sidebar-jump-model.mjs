// ⌘1–9 session jump and the held-modifier number hints of the classic sidebar.
// Ported from sidebar-groups.js:9110-9302 (GA digits, $A/ej visible hint rows,
// nj hint map, ij digit parsing, aj input guard, oj Ctrl+Shift / sj ⌘
// predicates, cj, lj modifier keys, uj 200ms, pj key/mouse/visibility
// lifecycle) and sidebar-main.js:14284-14310 bL (⌘+Digit opens the Nth visible
// row, or the hinted row while hints are shown). Pure: the DOM, timers and
// state writes are injected, so the lifecycle is testable without a window.

export const JUMP_DIGITS = "123456789";
export const JUMP_HINT_DELAY = 200;
export const JUMP_HINT_LIMIT = 9;
export const JUMP_MODIFIER_KEYS = Object.freeze(new Set(["Shift", "Control", "Meta"]));

/** sj: the platform jump modifier alone (⌘ on macOS, Ctrl elsewhere). */
export function isMetaJumpChord(event, { mac = true } = {}) {
  const primary = mac ? event.metaKey : event.ctrlKey;
  const secondary = mac ? event.ctrlKey : event.metaKey;
  return !!primary && !secondary && !event.shiftKey && !event.altKey;
}

/** oj: Ctrl+Shift, without ⌘ or ⌥. */
export function isCtrlShiftJumpChord(event) {
  return !!event.ctrlKey && !!event.shiftKey && !event.metaKey && !event.altKey;
}

/** cj: a chord that keeps (or starts) the hints; ⌘ only when the meta hints are on. */
export function isJumpHintChord(event, { metaHints = true, mac = true } = {}) {
  return isCtrlShiftJumpChord(event) || (metaHints && isMetaJumpChord(event, { mac }));
}

/** ij: Digit codes give their digit; letters come from the key (layout-aware), else from the Key code. */
export function jumpKey(event) {
  const code = typeof event.code === "string" ? event.code : "";
  if (code.startsWith("Digit")) return code.slice(5);
  const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
  const letter = key.length === 1 && key >= "a" && key <= "z";
  if (code.startsWith("Key")) return letter ? key : code.slice(3).toLowerCase();
  return letter ? key : null;
}

/** bL: the 1-9 digit of a ⌘+Digit press (code only), else null. */
export function jumpDigit(event) {
  const code = typeof event.code === "string" ? event.code : "";
  if (!code.startsWith("Digit")) return null;
  const digit = code.slice(5);
  return digit >= "1" && digit <= "9" && digit.length === 1 ? digit : null;
}

/** aj: no hints while focus is in a text field or a select. */
export function isTypingTarget(element) {
  const tag = element?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** $A/ej: the first `limit` rendered [data-jump-hint-row] rows, one per data-row-key. */
export function collectJumpRows(nodes, limit = JUMP_HINT_LIMIT) {
  const seen = new Set(), rows = [];
  for (const node of nodes || []) {
    const key = node?.getAttribute?.("data-row-key");
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    if (node.offsetParent === null) continue;
    rows.push(node);
    if (rows.length >= limit) break;
  }
  return rows;
}

/** nj: {rowKey: digit} for the collected rows, or null when none. */
export function jumpHintMap(rows) {
  if (!rows?.length) return null;
  const map = {};
  rows.forEach((row, index) => { map[row.getAttribute("data-row-key")] = JUMP_DIGITS[index]; });
  return map;
}

/** The row key a digit points at in a hint map. */
export function hintedRowKey(map, digit) {
  if (!map) return null;
  return Object.keys(map).find((key) => map[key] === digit) ?? null;
}

/**
 * pj + bL over injected effects:
 * - rows(): the hint rows in order (collectJumpRows over the sidebar list)
 * - blocked(): the sidebar is collapsed or a menu/dialog is open (bL `!e || t || n?.isOpen`, pj `mo()`)
 * - typing(): focus is in a text field (aj)
 * - show(map) / hide(): write the hint map; open(row): scrollIntoView + click its main button
 * - setTimer(fn, ms) / clearTimer(id)
 */
export function createJumpHints({ rows, blocked = () => false, typing = () => false, show, hide, open,
  setTimer = setTimeout, clearTimer = clearTimeout, metaHints = true, mac = true } = {}) {
  let timer = null, shown = null, last = null;
  const chord = (event) => isJumpHintChord(event, { metaHints, mac });
  const cancel = () => { if (timer !== null) { clearTimer(timer); timer = null; } };
  const clear = () => { cancel(); if (shown !== null) { shown = null; hide(); } };
  const display = () => {
    const map = jumpHintMap(rows());
    if (!map) return null;
    shown = map;
    show(map);
    return map;
  };
  const arm = (event) => {
    last = event;
    if (shown !== null || timer !== null) return;
    timer = setTimer(() => {
      timer = null;
      if (typing() || blocked()) return;
      if (last && chord(last)) display();
    }, JUMP_HINT_DELAY);
  };
  const openRow = (row) => { if (row) open(row); return !!row; };
  return {
    get hints() { return shown; },
    get pending() { return timer !== null; },
    keydown(event) {
      // bL: ⌘+Digit1–9 (no other modifiers, not a repeat) opens the hinted row, else the Nth visible one.
      if (isMetaJumpChord(event, { mac }) && !event.defaultPrevented && !event.repeat && !blocked()) {
        const digit = jumpDigit(event);
        if (digit) {
          const list = rows();
          const key = hintedRowKey(shown, digit);
          const row = key !== null ? list.find((node) => node.getAttribute("data-row-key") === key) : list[Number(digit) - 1];
          if (row) { event.preventDefault(); open(row); }
          clear();
          return;
        }
      }
      // pj c.
      if (blocked()) { clear(); return; }
      if (!chord(event)) { clear(); return; }
      if (typing()) { cancel(); return; }
      if (!JUMP_MODIFIER_KEYS.has(event.key)) cancel();
      if (event.defaultPrevented || event.repeat) return;
      if (JUMP_MODIFIER_KEYS.has(event.key)) { arm(event); return; }
      const key = jumpKey(event);
      if (key === null) return;
      if (!JUMP_DIGITS.includes(key)) { clear(); return; }
      if (!isCtrlShiftJumpChord(event)) return;
      const map = shown ?? display();
      const target = hintedRowKey(map, key);
      if (target === null) { clear(); return; }
      event.preventDefault();
      openRow(rows().find((node) => node.getAttribute("data-row-key") === target));
      clear();
    },
    // pj l: releasing to a chord that still holds re-arms; anything else hides.
    keyup(event) {
      if (!chord(event)) { clear(); return; }
      arm(event);
    },
    // pj u: a mouse move, press or wheel without the chord hides pending or shown hints.
    pointer(event) {
      if (shown === null && timer === null) return;
      if (!chord(event)) clear();
    },
    // blur, visibilitychange, unmount.
    reset: clear,
  };
}

// ⌘⇧⌫ Archive session (ion-dist shared-19-CjdiaR4X.js rg/ag/ig). ag: Backspace with Shift and the
// platform modifier alone (⌘ on macOS, Ctrl elsewhere), never with ⌥. rg also drops repeats.
export function archiveChord(event, { mac = true } = {}) {
  if (!event || event.key !== "Backspace" || !event.shiftKey || event.altKey || event.repeat) return false;
  const primary = mac ? event.metaKey : event.ctrlKey;
  const secondary = mac ? event.ctrlKey : event.metaKey;
  return !!primary && !secondary;
}
// ig ng: the text-like input types whose value guards the chord.
export const ARCHIVE_FIELD_TYPES = Object.freeze(new Set(["text", "search", "url", "tel", "email", "password", "number"]));
/** ig: a focused field with content keeps the chord (⇧⌘⌫ deletes text there); an empty one does not. */
export function archiveBlockedByField(element) {
  if (!element || typeof element.tagName !== "string") return false;
  if (element.isContentEditable) return String(element.textContent ?? "").trim() !== "";
  const tag = element.tagName.toUpperCase();
  if (tag === "TEXTAREA") return String(element.value ?? "") !== "";
  if (tag === "INPUT") return ARCHIVE_FIELD_TYPES.has(String(element.type || "text").toLowerCase()) && String(element.value ?? "") !== "";
  return false;
}
/** Zm: the row after the archived one, else the one before it. */
export function archiveNeighbour(keys, key) {
  const at = (keys ?? []).indexOf(key);
  if (at === -1) return null;
  return keys[at + 1] ?? keys[at - 1] ?? null;
}
