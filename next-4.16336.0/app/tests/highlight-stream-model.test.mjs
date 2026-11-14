import test from "node:test";
import assert from "node:assert/strict";
import {
  STREAM_LIMITS, coveredLength, createLimitTracker, createStreamPhase, flattenTokens, nextStreamPhase,
  prepareStreamHighlight, reduceBatch, splitChunk, validateStreamTokens,
} from "../src/highlight-stream-model.mjs";
import { hslHex, streamLightPalette, streamLightTheme, streamDarkTheme, darkPalette, streamRules } from "../src/highlight-themes.mjs";

const tok = (text, color = "#14181f") => ({ text, light: { color, fontStyle: 0 }, dark: { color: "#eaecf0", fontStyle: 0 } });
const nl = () => tok("\n");

test("official chunk limits: 16384 units, split after the last newline within the first 16384", () => {
  assert.equal(STREAM_LIMITS.chunkUnits, 16_384); assert.equal(STREAM_LIMITS.replyDeadlineMs, 4_000);
  const short = "a".repeat(100);
  assert.deepEqual(splitChunk(short), { chunk: short, rest: "" });
  const line = "x".repeat(9_999) + "\n";
  const big = line + line + line + line + "tail";
  const first = splitChunk(big);
  assert.equal(first.chunk, line); assert.equal(first.rest, line + line + line + "tail");
  assert.ok(first.chunk.length <= 16_384);
  const noNewline = "y".repeat(40_000);
  const cut = splitChunk(noNewline);
  assert.equal(cut.chunk.length, 16_384); assert.equal(cut.rest.length, 40_000 - 16_384);
  const exact = "z".repeat(16_383) + "\n" + "w";
  assert.equal(splitChunk(exact).chunk.length, 16_384);
  const late = "z".repeat(16_384) + "\n";
  assert.equal(splitChunk(late).chunk.length, 16_384, "a newline beyond the limit does not extend the chunk");
});

test("stream eligibility shares the settled language aliases", () => {
  assert.equal(prepareStreamHighlight({ text: "", language: "JS" }).language, "javascript");
  assert.equal(prepareStreamHighlight({ text: "", language: "notalang" }).reason, "unknown-language");
  // Every bundled grammar streams (c5a058668 table); text and ansi never open a stream (code-block-current.js:1566).
  for (const [label, id] of [["tsx", "tsx"], ["golang", "go"], ["yml", "yaml"], ["env", "dotenv"], ["diff", "diff"]])
    assert.equal(prepareStreamHighlight({ text: "", language: label }).language, id);
  for (const label of ["text", "txt", "", "ansi"]) assert.equal(prepareStreamHighlight({ text: "", language: label }).reason, "plain-language");
  assert.equal(prepareStreamHighlight({ text: "", language: "js", isFrontier: false }).reason, "not-frontier");
  assert.equal(prepareStreamHighlight({ text: "", language: "js", languageSettled: false }).reason, "unsettled-language");
});

test("limit tracker enforces line length, line count and code units across suffixes", () => {
  const tracker = createLimitTracker({ ...STREAM_LIMITS, maxLineUnits: 5, maxLines: 3, maxCodeUnits: 100 });
  assert.equal(tracker.accept("abc"), null);
  assert.equal(tracker.accept("de"), null);
  assert.equal(tracker.accept("f"), "line-length-limit");
  const lines = createLimitTracker({ ...STREAM_LIMITS, maxLineUnits: 5, maxLines: 3, maxCodeUnits: 100 });
  assert.equal(lines.accept("a\nb\nc"), null);
  assert.equal(lines.accept("\n"), "line-count-limit");
  const units = createLimitTracker({ ...STREAM_LIMITS, maxLineUnits: 1000, maxLines: 3000, maxCodeUnits: 10 });
  assert.equal(units.accept("12345"), null); assert.equal(units.accept("67890"), null); assert.equal(units.accept("1"), "code-limit");
});

test("reduceBatch recalls the open line, closes lines on separators and flattens to the fed text", () => {
  let lines = reduceBatch([], { recall: 0, tokens: [tok("const"), tok(" x = `a")] });
  assert.equal(lines.length, 1); assert.equal(lines[0].length, 2);
  // Next chunk closes the template literal: the worker retokenizes the whole line.
  lines = reduceBatch(lines, { recall: 2, tokens: [tok("const"), tok(" x = "), tok("`ab`", "#008000"), nl(), tok("let")] });
  assert.equal(lines.length, 2); assert.equal(lines[0].length, 4); assert.deepEqual(lines[1].map((t) => t.text), ["let"]);
  assert.equal(flattenTokens(lines).map((t) => t.text).join(""), "const x = `ab`\nlet");
  assert.equal(coveredLength(lines), "const x = `ab`\nlet".length);
  assert.ok(validateStreamTokens(lines, "const x = `ab`\nlet"));
  assert.equal(validateStreamTokens(lines, "const x = `ab`\nlex"), false);
  assert.equal(reduceBatch(lines, { recall: 5, tokens: [] }), null, "recall beyond the open line is a protocol error");
  assert.equal(reduceBatch(lines, { recall: 0, tokens: [tok("")] }), null, "empty tokens are rejected");
  const crlf = reduceBatch([], { recall: 0, tokens: [tok("a"), tok("\r\n"), tok("b")] });
  assert.equal(crlf.length, 2); assert.equal(flattenTokens(crlf).map((t) => t.text).join(""), "a\r\nb");
  const closedExactly = reduceBatch([], { recall: 0, tokens: [tok("a"), nl()] });
  assert.deepEqual(closedExactly.map((line) => line.length), [2, 0]);
  assert.equal(reduceBatch(closedExactly, { recall: 0, tokens: [tok("b")] }).length, 2);
});

test("stream phase: retained only after a first render before the frontier ends; ended otherwise", () => {
  let state = createStreamPhase();
  state = nextStreamPhase(state, "open"); assert.equal(state.phase, "streaming");
  assert.equal(nextStreamPhase(state, "frontier-ended").phase, "ended");
  state = nextStreamPhase(state, "first-render");
  const retained = nextStreamPhase(state, "frontier-ended");
  assert.equal(retained.phase, "retained");
  assert.equal(nextStreamPhase(retained, "frontier-ended").phase, "retained", "idempotent");
  assert.equal(nextStreamPhase(retained, "fail").phase, "ended");
  const restarted = nextStreamPhase(state, "restart");
  assert.equal(restarted.highlighted, false); assert.equal(restarted.firstRendered, true);
  assert.equal(nextStreamPhase(restarted, "frontier-ended").phase, "ended");
  assert.equal(nextStreamPhase(nextStreamPhase(restarted, "first-render"), "frontier-ended").phase, "retained");
});

test("stream palettes are the official worker HSL values as #rrggbb; nineteen rules in source order", () => {
  assert.deepEqual(streamLightPalette, { fg: "#14181f", comment: "#6e7687", punctuation: "#2b303b", keyword: "#8100c2", string: "#008000",
    regex: "#078307", number: "#008080", property: "#b80a18", attrName: "#bd0f1e", function: "#0051c2", variable: "#b34a00", parameter: "#b84f05" });
  assert.equal(hslHex(280, 100, 38), "#8100c2");
  assert.equal(streamLightTheme.name, "stream-claude-light"); assert.equal(streamDarkTheme.name, "stream-claude-dark");
  assert.equal(streamLightTheme.tokenColors.length, 19); assert.equal(streamDarkTheme.tokenColors.length, 19);
  assert.deepEqual(streamLightTheme.tokenColors[0], { settings: { foreground: "#14181f" } });
  assert.deepEqual(streamLightTheme.tokenColors[3].scope, ["keyword", "storage", "variable.language"]);
  assert.equal(streamLightTheme.tokenColors[4].settings.foreground, "#14181f", "keyword.operator uses the base foreground");
  assert.deepEqual(streamLightTheme.tokenColors[18], { scope: ["keyword.other.important"], settings: { foreground: "#b80a18", fontStyle: "bold" } });
  assert.deepEqual(streamRules(darkPalette)[3].settings.foreground, darkPalette.keyword);
  assert.equal(streamDarkTheme.tokenColors[3].settings.foreground, "#cc7bf4");
});
