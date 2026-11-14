import test from "node:test";
import assert from "node:assert/strict";
import {
  JUMP_DIGITS, JUMP_HINT_DELAY, collectJumpRows, createJumpHints, hintedRowKey, isCtrlShiftJumpChord, isJumpHintChord,
  isMetaJumpChord, isTypingTarget, jumpDigit, jumpHintMap, jumpKey, archiveChord, archiveBlockedByField, archiveNeighbour,
} from "../src/sidebar-jump-model.mjs";

// sidebar-groups.js:9110-9312 (GA, $A/ej, nj, ij, aj, oj/sj/cj, lj, uj, pj) and sidebar-main.js:14284-14310 bL.
const key = (fields) => ({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: false,
  key: "", code: "", preventDefault() { this.defaultPrevented = true; }, ...fields });
const row = (rowKey, visible = true) => ({ getAttribute: (name) => (name === "data-row-key" ? rowKey : null), offsetParent: visible ? {} : null });

test("modifier predicates: ⌘ alone (sj), Ctrl+Shift (oj), and cj with the meta hints switch", () => {
  assert.equal(isMetaJumpChord(key({ metaKey: true })), true);
  for (const extra of [{ ctrlKey: true }, { shiftKey: true }, { altKey: true }]) assert.equal(isMetaJumpChord(key({ metaKey: true, ...extra })), false);
  assert.equal(isMetaJumpChord(key({ ctrlKey: true }), { mac: false }), true, "Ctrl off macOS");
  assert.equal(isCtrlShiftJumpChord(key({ ctrlKey: true, shiftKey: true })), true);
  assert.equal(isCtrlShiftJumpChord(key({ ctrlKey: true, shiftKey: true, metaKey: true })), false);
  assert.equal(isCtrlShiftJumpChord(key({ ctrlKey: true })), false);
  assert.equal(isJumpHintChord(key({ metaKey: true })), true);
  assert.equal(isJumpHintChord(key({ metaKey: true }), { metaHints: false }), false);
  assert.equal(isJumpHintChord(key({ ctrlKey: true, shiftKey: true }), { metaHints: false }), true);
});

test("digit parsing from code or key (ij) and the ⌘+Digit1–9 digit (bL)", () => {
  assert.equal(jumpKey(key({ code: "Digit3", key: "#" })), "3", "the code wins over a shifted key");
  assert.equal(jumpKey(key({ code: "KeyA", key: "a" })), "a");
  assert.equal(jumpKey(key({ code: "KeyQ", key: "ä" })), "q", "non-latin layouts fall back to the code");
  assert.equal(jumpKey(key({ code: "", key: "z" })), "z");
  assert.equal(jumpKey(key({ code: "Enter", key: "Enter" })), null);
  assert.equal(jumpDigit(key({ code: "Digit1" })), "1");
  assert.equal(jumpDigit(key({ code: "Digit9" })), "9");
  assert.equal(jumpDigit(key({ code: "Digit0" })), null);
  assert.equal(jumpDigit(key({ code: "Numpad1", key: "1" })), null);
  assert.equal(JUMP_DIGITS, "123456789");
});

test("input guard (aj): INPUT, TEXTAREA and SELECT only", () => {
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) assert.equal(isTypingTarget({ tagName }), true);
  for (const tagName of ["BUTTON", "DIV"]) assert.equal(isTypingTarget({ tagName }), false);
  assert.equal(isTypingTarget(null), false);
});

test("hint rows ($A/ej): rendered rows only, one per row key, at most nine; nj maps them to 1–9", () => {
  const nodes = [row("a"), row("a"), row("hidden", false), ...Array.from({ length: 12 }, (_, index) => row("r" + index))];
  const rows = collectJumpRows(nodes);
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.map((node) => node.getAttribute("data-row-key")), ["a", "r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"]);
  const map = jumpHintMap(rows);
  assert.equal(map.a, "1"); assert.equal(map.r7, "9");
  assert.equal(hintedRowKey(map, "2"), "r0");
  assert.equal(jumpHintMap([]), null);
});

function harness({ blocked = false, typing = false, rows = ["a", "b", "c"] } = {}) {
  const timers = new Map();
  let nextId = 1;
  const log = [];
  const state = { blocked, typing, hints: null };
  const nodes = rows.map((rowKey) => row(rowKey));
  const hints = createJumpHints({
    rows: () => nodes,
    blocked: () => state.blocked,
    typing: () => state.typing,
    show: (map) => { state.hints = map; log.push(["show", Object.keys(map).length]); },
    hide: () => { state.hints = null; log.push(["hide"]); },
    open: (node) => log.push(["open", node.getAttribute("data-row-key")]),
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms }); return id; },
    clearTimer: (id) => timers.delete(id),
  });
  const flush = () => { for (const [id, { fn, ms }] of [...timers]) { assert.equal(ms, JUMP_HINT_DELAY); timers.delete(id); fn(); } };
  return { hints, state, log, timers, flush };
}

test("pj: holding ⌘ for 200ms shows the hints; release, a mouse move without ⌘, blur hide them", () => {
  const { hints, state, log, timers, flush } = harness();
  hints.keydown(key({ key: "Meta", metaKey: true }));
  assert.equal(timers.size, 1, "the 200ms timer is armed");
  assert.equal(state.hints, null);
  flush();
  assert.deepEqual(state.hints, { a: "1", b: "2", c: "3" });
  hints.pointer({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false });
  assert.notEqual(state.hints, null, "moving the mouse with ⌘ held keeps them");
  hints.pointer({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false });
  assert.equal(state.hints, null, "moving without the modifier hides them");
  hints.keydown(key({ key: "Meta", metaKey: true })); flush();
  hints.keyup(key({ key: "Meta", metaKey: false }));
  assert.equal(state.hints, null, "releasing ⌘ hides them");
  hints.keydown(key({ key: "Meta", metaKey: true })); flush();
  hints.reset();
  assert.equal(state.hints, null, "blur / visibilitychange");
  assert.ok(log.some(([kind]) => kind === "show"));
});

test("pj: Ctrl+Shift also shows the hints and Ctrl+Shift+digit opens the hinted row", () => {
  const { hints, state, log, flush } = harness();
  hints.keydown(key({ key: "Control", ctrlKey: true }));
  hints.keydown(key({ key: "Shift", ctrlKey: true, shiftKey: true }));
  flush();
  assert.deepEqual(state.hints, { a: "1", b: "2", c: "3" });
  const press = key({ key: "@", code: "Digit2", ctrlKey: true, shiftKey: true });
  hints.keydown(press);
  assert.equal(press.defaultPrevented, true);
  assert.deepEqual(log.at(-2), ["open", "b"]);
  assert.equal(state.hints, null, "the jump hides the hints");
  // Without shown hints the chord computes them first (nj) and still jumps.
  const direct = key({ key: "#", code: "Digit3", ctrlKey: true, shiftKey: true });
  hints.keydown(direct);
  assert.ok(log.some((entry) => entry[0] === "open" && entry[1] === "c"));
});

test("bL: ⌘+Digit opens the Nth visible row (or the hinted one); repeats, other modifiers and a blocked sidebar do nothing", () => {
  const { hints, state, log } = harness();
  const press = key({ key: "2", code: "Digit2", metaKey: true });
  hints.keydown(press);
  assert.equal(press.defaultPrevented, true);
  assert.deepEqual(log.at(-1), ["open", "b"]);
  const repeat = key({ key: "1", code: "Digit1", metaKey: true, repeat: true });
  hints.keydown(repeat);
  assert.equal(repeat.defaultPrevented, false);
  const shifted = key({ key: "!", code: "Digit1", metaKey: true, shiftKey: true });
  hints.keydown(shifted);
  assert.equal(shifted.defaultPrevented, false);
  const beyond = key({ key: "7", code: "Digit7", metaKey: true });
  hints.keydown(beyond);
  assert.equal(beyond.defaultPrevented, false, "no 7th row");
  state.blocked = true;
  const collapsed = key({ key: "1", code: "Digit1", metaKey: true });
  hints.keydown(collapsed);
  assert.equal(collapsed.defaultPrevented, false, "collapsed sidebar or an open menu/dialog");
  assert.equal(log.filter(([kind]) => kind === "open").length, 1);
});

test("no hints while focus is in a text field (aj), and a non-digit key with the chord hides them", () => {
  const typing = harness({ typing: true });
  typing.hints.keydown(key({ key: "Meta", metaKey: true }));
  assert.equal(typing.timers.size, 0, "the timer is not armed while typing");
  const { hints, state, flush } = harness();
  hints.keydown(key({ key: "Meta", metaKey: true })); flush();
  assert.notEqual(state.hints, null);
  hints.keydown(key({ key: "k", code: "KeyK", metaKey: true }));
  assert.equal(state.hints, null);
});

// ion-dist shared-19-CjdiaR4X.js rg/ag/ig/Zm.
test("archive chord ag: ⌘⇧⌫ only, never with Ctrl, ⌥ or a repeat", () => {
  const chord = (fields) => key({ key: "Backspace", code: "Backspace", metaKey: true, shiftKey: true, ...fields });
  assert.equal(archiveChord(chord()), true);
  assert.equal(archiveChord(chord({ ctrlKey: true })), false);
  assert.equal(archiveChord(chord({ altKey: true })), false);
  assert.equal(archiveChord(chord({ repeat: true })), false);
  assert.equal(archiveChord(chord({ shiftKey: false })), false);
  assert.equal(archiveChord(chord({ metaKey: false })), false);
  assert.equal(archiveChord(chord({ key: "Delete", code: "Delete" })), false);
  assert.equal(archiveChord(chord({ metaKey: false, ctrlKey: true }), { mac: false }), true, "Ctrl elsewhere");
  assert.equal(archiveChord(chord(), { mac: false }), false);
  assert.equal(archiveChord(null), false);
});

test("archive field guard ig: only a focused field with content blocks the chord", () => {
  assert.equal(archiveBlockedByField(null), false);
  assert.equal(archiveBlockedByField({ tagName: "BUTTON" }), false);
  assert.equal(archiveBlockedByField({ tagName: "INPUT", type: "search", value: "" }), false);
  assert.equal(archiveBlockedByField({ tagName: "INPUT", type: "search", value: "Parent" }), true);
  assert.equal(archiveBlockedByField({ tagName: "INPUT", type: "text", value: "x" }), true);
  assert.equal(archiveBlockedByField({ tagName: "INPUT", type: "checkbox", value: "on" }), false, "only ng's text-like types");
  assert.equal(archiveBlockedByField({ tagName: "TEXTAREA", value: "" }), false);
  assert.equal(archiveBlockedByField({ tagName: "TEXTAREA", value: "draft" }), true);
  assert.equal(archiveBlockedByField({ tagName: "DIV", isContentEditable: true, textContent: "  \n" }), false, "whitespace-only editor");
  assert.equal(archiveBlockedByField({ tagName: "DIV", isContentEditable: true, textContent: "draft" }), true);
});

test("archive neighbour Zm: the next row, else the previous one", () => {
  assert.equal(archiveNeighbour(["a", "b", "c"], "a"), "b");
  assert.equal(archiveNeighbour(["a", "b", "c"], "b"), "c");
  assert.equal(archiveNeighbour(["a", "b", "c"], "c"), "b");
  assert.equal(archiveNeighbour(["a"], "a"), null);
  assert.equal(archiveNeighbour(["a"], "z"), null);
});
