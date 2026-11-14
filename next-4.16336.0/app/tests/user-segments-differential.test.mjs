// Small-input source-equivalence audit only. Never feed unbounded/adversarial
// inputs to this oracle; the renderer candidate uses the indexed scanner.
import test from "node:test";
import assert from "node:assert/strict";
import { parseOrdinaryUserSegments } from "../src/user-segments-model.mjs";

const MAX_ORACLE_INPUT = 384;
const SEED = 0x029c0de;
let seed = SEED;
const next = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed >>> 0;
};
const choose = values => values[next() % values.length];
const breaks = ["\n", "\r", "\r\n", "\u2028", "\u2029"];
const parts = ["x", "😀", "中文", "js", "python", " ", "\t", ...breaks,
  "`", "``", "```", "````", "`````", "```js", "```py ", "```\t"];

function compare(input, index) {
  assert.ok(input.length <= MAX_ORACLE_INPUT, "oracle budget");
  const text = input.trim();
  const base = input.length - input.trimStart().length;
  // shared-13 DM (export xi), copied as data oracle; no official module loads.
  const sourceDM = /^(`{3,})(\S*)\n([\s\S]*?)\n\1[ \t]*$/gm;
  const expected = [...text.matchAll(sourceDM)].map(match => ({
    start: base + match.index, end: base + match.index + match[0].length,
    language: match[2] || "text", text: match[3],
  }));
  const result = parseOrdinaryUserSegments(input);
  const actual = result.segments.filter(segment => segment.kind === "code")
    .map(({start,end,language,text}) => ({start,end,language,text}));
  assert.deepEqual(actual, expected, `seed=${SEED}; case=${index}; input=${JSON.stringify(input)}`);
  assert.equal(result.canonicalText, input);
  assert.equal(result.segments.map(segment => segment.raw).join(""), input);
}

test("bounded deterministic source DM equivalence covers 10,000 mixed-boundary inputs", () => {
  seed = SEED;
  for (let index = 0; index < 10_000; index++) {
    let input = Array.from({length: next() % 35}, () => choose(parts)).join("");
    if (index % 2 === 0) {
      const open = "`".repeat(3 + next() % 6), close = "`".repeat(3 + next() % 6);
      const block = open + choose(["", "js", "python", "`json", "js info"])
        + choose(breaks) + choose(["x", "", "x\r", "\n", "😀\n中文"])
        + "\n" + close + choose(["", " ", "\t", " trailing"]);
      input = choose(["", " \t", "before" + choose(breaks)]) + block
        + choose(["", "\n", "\r", "\u2028", "\u2029"]) + input + choose(["", " \n"]);
    }
    compare(input, index);
  }
});
