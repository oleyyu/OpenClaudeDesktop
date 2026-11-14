import test from "node:test";
import assert from "node:assert/strict";
import {
  ANSI_BRIGHT,
  ANSI_NORMAL,
  ansi256,
  ansiStyle,
  hasAnsi,
  parseAnsi,
  stripAnsi,
} from "../src/ansi-model.mjs";

// Official ANSI module: analysis/batch2-audit-20260920/readable/c966e2bd9-DuJ2TLm_.js.

test("detects and removes escape sequences", () => {
  assert.equal(hasAnsi("\x1b[31mred\x1b[0m"), true);
  assert.equal(hasAnsi("plain"), false);
  assert.equal(stripAnsi("\x1b[31mred\x1b[0m"), "red");
  // OSC hyperlinks and DCS strings are consumed too.
  assert.equal(stripAnsi("\x1b]8;;https://xlink\x1b]8;;"), "link");
});

test("the shipped palette drives the 8 normal and 8 bright colours", () => {
  assert.equal(ANSI_NORMAL[1], "#c82829");
  assert.equal(ANSI_BRIGHT[1], "#f5871f");
  assert.deepEqual(parseAnsi("\x1b[31mred").at(-1).style, { fg: "#c82829" });
  assert.deepEqual(parseAnsi("\x1b[91mred").at(-1).style, { fg: "#f5871f" });
  assert.deepEqual(parseAnsi("\x1b[44mx").at(-1).style, { bg: "#4271ae" });
});

test("256-colour cube and grayscale ramp", () => {
  assert.equal(ansi256(1), "#c82829");
  assert.equal(ansi256(9), "#f5871f");
  assert.equal(ansi256(16), "#000000");
  assert.equal(ansi256(21), "#0000ff");
  assert.equal(ansi256(231), "#ffffff");
  assert.equal(ansi256(232), "#080808");
  assert.equal(ansi256(255), "#eeeeee");
  assert.equal(ansi256(256), undefined);
});

test("extended colour selectors", () => {
  assert.deepEqual(parseAnsi("\x1b[38;5;21mx").at(-1).style, { fg: "#0000ff" });
  assert.deepEqual(parseAnsi("\x1b[48;2;1;2;3mx").at(-1).style, { bg: "#010203" });
});

test("attribute set and reset codes", () => {
  const segments = parseAnsi("\x1b[1;4mbold\x1b[22mplain\x1b[0mreset");
  assert.deepEqual(segments.map((s) => s.text), ["bold", "plain", "reset"]);
  assert.deepEqual(segments[0].style, { bold: true, underline: true });
  assert.deepEqual(segments[1].style, { bold: false, dim: false, underline: true });
  assert.deepEqual(segments[2].style, {});
  // An empty CSI m body is a full reset.
  assert.deepEqual(parseAnsi("\x1b[31ma\x1b[mb").at(-1).style, {});
  assert.deepEqual(parseAnsi("\x1b[31;39ma").at(-1).style, {});
});

test("non-SGR sequences never change the style", () => {
  const segments = parseAnsi("\x1b[31ma\x1b[2Kb");
  assert.deepEqual(segments.map((s) => s.text), ["a", "b"]);
  assert.deepEqual(segments[1].style, { fg: "#c82829" });
});

test("the produced CSS matches the official mapping", () => {
  assert.equal(ansiStyle({}), undefined);
  assert.deepEqual(ansiStyle({ fg: "#c82829" }), { color: "#c82829" });
  assert.deepEqual(ansiStyle({ dim: true }), { opacity: 0.7 });
  assert.deepEqual(ansiStyle({ underline: true, strikethrough: true }), {
    textDecoration: "underline line-through",
  });
  assert.deepEqual(ansiStyle({ bold: true }), {
    fontWeight: "bold",
    fontVariationSettings: "normal",
  });
  // Inverse swaps the channels and falls back to the system canvas colours.
  assert.deepEqual(ansiStyle({ inverse: true, fg: "#111111" }), {
    color: "Canvas",
    backgroundColor: "#111111",
  });
});

test("plain text produces a single unstyled run", () => {
  assert.deepEqual(parseAnsi("hello"), [{ text: "hello", style: {} }]);
  assert.deepEqual(parseAnsi(""), []);
});
