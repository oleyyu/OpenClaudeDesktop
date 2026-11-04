import test from "node:test";
import assert from "node:assert/strict";
import { createTokenizer } from "../src/highlight-tokenizer.mjs";
import { HIGHLIGHT_LIMITS, normalizeLanguage, prepareHighlight, validateTokens, tokenCSS } from "../src/highlight-model.mjs";
import { createGrammarLoader } from "../src/highlight-engine.mjs";
// W14-code r4 closeout R4DC-N7: the test-only BUNDLED_LANGUAGE_IDS / SUPPORTED_GRAMMARS exports are gone; the tables they read.
import { BUNDLED_LANGUAGES } from "../src/highlight-languages.mjs";
import { grammarLoaders } from "../src/highlight-grammar-loaders.mjs";
const BUNDLED_LANGUAGE_IDS = BUNDLED_LANGUAGES.map(([id]) => id), SUPPORTED_GRAMMARS = Object.keys(grammarLoaders);
import { darkPalette } from "../src/highlight-themes.mjs";
import { highlightKey } from "../src/highlight-model.mjs";
import { normalizeColor } from "../src/highlight-tokenizer.mjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const tokenize = createTokenizer();
const sample = { text: "const x = 1;", language: "js" };
const color = (token, theme) => token[theme].color.toLowerCase();
const containing = (result, text) => {
  const token = result.tokens.find((item) => item.text.includes(text));
  assert.ok(token, `Missing token ${JSON.stringify(text)}`); return token;
};
test("every bundled grammar and alias is eligible; text/ansi are reserved plain; only unknown labels are null", () => {
  for (const [label, expected] of [[" JS ", "javascript"], ["cjs", "javascript"], ["ts", "typescript"], ["mts", "typescript"], ["json", "json"], ["py", "python"], ["zsh", "shellscript"],
    ["tsx", "tsx"], ["jsx", "jsx"], ["jsonc", "jsonc"], ["html", "html"], ["sql", "sql"], ["console", "shellsession"], ["go", "go"], ["golang", "go"], ["rust", "rust"], ["rs", "rust"],
    ["yaml", "yaml"], ["yml", "yaml"], ["diff", "diff"], ["dotenv", "dotenv"], ["env", "dotenv"], ["pwsh", "powershell"], ["svg", "xml"], ["vba", "vb"], ["vbnet", "vb"],
    ["fortran", "fortran-free-form"], ["systemverilog", "system-verilog"], ["Dockerfile", "docker"], ["MD", "markdown"]]) assert.equal(normalizeLanguage(label), expected, label);
  for (const [label, expected] of [["text", "text"], ["txt", "text"], ["", "text"], ["  ", "text"], [undefined, "text"], ["ansi", "ansi"]]) assert.equal(normalizeLanguage(label), expected, String(label));
  for (const label of ["notalang", "__proto__", "constructor", "hasOwnProperty", "js extra", 42, {}]) assert.equal(normalizeLanguage(label), null, String(label));
  assert.equal(BUNDLED_LANGUAGE_IDS.length, 235);
  assert.deepEqual([...SUPPORTED_GRAMMARS], [...BUNDLED_LANGUAGE_IDS], "the worker loader table is the bundled table");
  assert.equal(prepareHighlight({ text: "plain", language: "text" }).reason, "plain-language");
  assert.equal(prepareHighlight({ text: "\u001b[31mred", language: "ansi" }).reason, "plain-language");
  assert.equal(prepareHighlight({ text: "x", language: "notalang" }).reason, "unknown-language");
  assert.equal(prepareHighlight({ text: "fn main() {}", language: "rs" }).language, "rust");
});
test("frontier and opening-language flags dominate an otherwise eligible block", () => {
  assert.equal(prepareHighlight({ ...sample, isFrontier: true }).reason, "streaming");
  assert.equal(prepareHighlight({ ...sample, languageSettled: false }).reason, "unsettled-language");
  assert.equal(prepareHighlight(sample).status, "eligible");
});
test("input budgets preserve plain fallback including an entire long-line block", () => {
  assert.equal(prepareHighlight({ ...sample, text: "" }).reason, "empty");
  assert.equal(prepareHighlight({ ...sample, text: "x".repeat(100_001) }).reason, "code-limit");
  assert.equal(prepareHighlight({ ...sample, text: "\n".repeat(2000) }).reason, "line-count-limit");
  assert.equal(prepareHighlight({ ...sample, text: "/*\n" + "x".repeat(1001) + "\n*/\nconst x=1;" }).reason, "line-length-limit");
  assert.equal(prepareHighlight({ ...sample, text: "x".repeat(1000) }).status, "eligible");
});
for (const [language, text] of [
  ["js", '// 😀中文\nconst text = "<script>&";\n\n\tconsole.log(text);\n'],
  ["ts", "interface User { name: string }\r\nconst user: User = { name: 'Ada' };\r\n"],
  ["json", '{"enabled": true, "count": 42, "name": "x"}\n'],
  ["python", 'def greet(name):\n    # greeting\n    return f"Hello {name}"\n'],
  ["bash", '#!/bin/bash\nname="hello"\nprintf "%s\\n" "$name"\n'],
]) test(`real ${language} grammar preserves exact bytes and produces both palettes`, async () => {
  const result = await tokenize({ text, language });
  assert.equal(result.status, "highlighted");
  assert.equal(result.tokens.map((token) => token.text).join(""), text);
  assert.ok(new Set(result.tokens.map((token) => color(token, "light"))).size >= 3);
  assert.ok(new Set(result.tokens.map((token) => color(token, "dark"))).size >= 3);
  assert.equal(validateTokens(result.tokens, text), true);
});
for (const [language, text] of [
  ["tsx", "export const App = () => <div className=\"x\">{count}</div>;\n"],
  ["go", "package main\n\nfunc main() {\n\tfmt.Println(\"hi\", 42)\n}\n"],
  ["rust", "fn main() {\n    let x: u32 = 42; // note\n    println!(\"{}\", x);\n}\n"],
  ["yaml", "name: build\non: [push]\njobs:\n  test: { runs-on: ubuntu-latest } # c\n"],
  ["diff", "--- a/x.js\n+++ b/x.js\n@@ -1,2 +1,2 @@\n-const a = 1;\n+const a = 2;\n"],
  ["html", "<!doctype html>\n<p class=\"x\">Hi <b>there</b></p>\n<script>const a = 1;</script>\n"],
  ["env", "# comment\nAPI_URL=https://example.invalid\nDEBUG=true\n"],
  ["golang", "var answer = 42\n"],
]) test(`bundled ${language} grammar tokenizes to more than one color with exact bytes`, { timeout: 20_000 }, async () => {
  const result = await tokenize({ text, language });
  assert.equal(result.status, "highlighted", JSON.stringify(result));
  assert.equal(result.language, normalizeLanguage(language));
  assert.equal(result.tokens.map((token) => token.text).join(""), text);
  assert.ok(new Set(result.tokens.map((token) => color(token, "light"))).size > 1, `${language} light`);
  assert.ok(new Set(result.tokens.map((token) => color(token, "dark"))).size > 1, `${language} dark`);
  assert.equal(validateTokens(result.tokens, text), true);
});
test("an unknown label stays plain without loading any grammar", async () => {
  assert.deepEqual(await tokenize({ text: "fn main() {}", language: "notalang" }), { status: "plain", reason: "unknown-language" });
  assert.equal((await tokenize({ text: "\u001b[31mred\u001b[0m", language: "ansi" })).reason, "plain-language");
});
test("a failing grammar load is memoized per language and stays plain until reload (original u map)", async () => {
  const calls = [], warnings = [], loaded = [];
  const instance = { getLoadedLanguages: () => loaded, loadLanguage: async (grammar) => { loaded.push(grammar[0].name); } };
  const loader = createGrammarLoader({ getInstance: async () => instance, warn: (message) => warnings.push(message), loaders: {
    __proto__: null,
    broken: () => { calls.push("broken"); return Promise.reject(new Error("chunk failed")); },
    empty: () => { calls.push("empty"); return Promise.resolve({}); },
    good: () => { calls.push("good"); return Promise.resolve({ default: [{ name: "good" }] }); },
  } });
  assert.equal(await loader.load("broken"), null);
  assert.equal(await loader.load("broken"), null);
  assert.equal(await loader.load("empty"), null);
  assert.deepEqual(calls, ["broken", "empty"], "a failed grammar is never retried");
  assert.equal(loader.failed("broken"), true); assert.equal(loader.failed("good"), false);
  assert.equal(warnings.length, 2);
  const [first, second] = await Promise.all([loader.load("good"), loader.load("good")]);
  assert.equal(first, instance); assert.equal(second, instance);
  assert.deepEqual(calls, ["broken", "empty", "good"], "concurrent loads share one import");
  assert.equal(await loader.load("good"), instance);
  assert.equal(await loader.load("__proto__"), null); assert.equal(await loader.load("missing"), null);
});
test("comments, keyword, string, numeric and function styles match independent source values", async () => {
  const result = await tokenize({ text: '// note\nfunction greet(name) { return "hi" + 42; }', language: "js" });
  const comment = containing(result, "// note");
  assert.equal(color(comment, "light"), "#999999"); assert.equal(comment.light.fontStyle, 1);
  assert.equal(color(comment, "dark"), "#818898"); assert.equal(comment.dark.fontStyle, 0);
  assert.equal(color(containing(result, "function"), "light"), "#c5621b");
  assert.equal(color(containing(result, "function"), "dark"), "#cc7bf4");
  assert.equal(color(containing(result, "greet"), "light"), "#0073e6");
  assert.equal(color(containing(result, "greet"), "dark"), "#70b8ff");
  assert.equal(color(containing(result, "hi"), "light"), "#1e9e3c");
  assert.equal(color(containing(result, "42"), "light"), "#cd2054");
  assert.equal(color(containing(result, "42"), "dark"), "#5eeded");
});
test("multiline comment and template literal retain grammar state", async () => {
  const result = await tokenize({ text: '/* first\nsecond */\nconst a = `first\nsecond`;\n', language: "js" });
  const seconds = result.tokens.filter((token) => token.text.includes("second"));
  assert.equal(seconds.length, 2);
  assert.equal(color(seconds[0], "light"), "#999999");
  assert.equal(color(seconds[1], "light"), "#1e9e3c");
});
test("property and object literal distinctions preserve dark scope precedence", async () => {
  const result = await tokenize({ text: 'const obj = { count: 42 }; obj.count;', language: "js" });
  const counts = result.tokens.filter((token) => token.text.includes("count"));
  assert.equal(counts.length, 2);
  assert.equal(color(counts[1], "dark"), darkPalette.fg);
  assert.equal(color(counts[0], "light"), "#1a1a1a");
  // The object-literal key has a distinct scope, not matched by Code's appended
  // property override. Member access above does use the base foreground.
  assert.equal(color(counts[0], "dark"), "#f47b85");
});
test("CR, CRLF, blank lines, whitespace and maximum line retain canonical text", async () => {
  for (const text of ["a\rb", "\r\n\r\n", " \t\n\n", "// " + "x".repeat(997)]) {
    const result = await tokenize({ text, language: "js" });
    assert.equal(result.status, "highlighted", JSON.stringify(result));
    assert.equal(result.tokens.map((token) => token.text).join(""), text);
  }
});
test("HTML-like program text renders as React text, never elements or attributes", async () => {
  const text = 'const html = "<img src=x onerror=alert(1)> & <script>bad()</script>";';
  const result = await tokenize({ text, language: "js" });
  const html = renderToStaticMarkup(createElement("code", null, result.tokens.map((token, key) => createElement("span", { key, "data-code-token": "", style: tokenCSS(token) }, token.text))));
  assert.ok(html.includes("&lt;img")); assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<img")); assert.ok(!html.includes("<script"));
  assert.equal(result.tokens.map((token) => token.text).join(""), text);
});
test("untrusted/incorrect worker token payload is rejected before caching or rendering", async () => {
  const good = (await tokenize(sample)).tokens;
  const changed = structuredClone(good); changed[0].text = "injected";
  assert.equal(validateTokens(changed, sample.text), false);
  const css = structuredClone(good); css[0].light.color = "url(https://example.invalid)";
  assert.equal(validateTokens(css, sample.text), false);
  const style = structuredClone(good); style[0].light.fontStyle = 32;
  assert.equal(validateTokens(style, sample.text), false);
  const cyclic = structuredClone(good); cyclic[0].self = cyclic;
  assert.equal(validateTokens(cyclic, sample.text), false);
  assert.equal(validateTokens(Array(HIGHLIGHT_LIMITS.maxTokens + 1).fill(good[0]), sample.text), false);
});
test("dense real grammar output is bounded and falls back with a truthful limit reason", async () => {
  const result = await tokenize({ text: 'a+b+c+d+e+f+g+h+i+j;\n'.repeat(1900), language: "js" });
  assert.equal(result.status, "plain"); assert.equal(result.reason, "output-limit");
});
test("the selected theme pair changes token colors and the cache key; light stays when only dark changes", async () => {
  const text = "function greet(name) { return name; }";
  const claude = await tokenize({ text, language: "js" });
  const github = await tokenize({ text, language: "js", themes: { light: "claude-light", dark: "github-dark" } });
  assert.equal(github.status, "highlighted");
  // github-dark keyword foreground read from the theme data (official chunk cd14a9327 carries the same #f97583; there is no #ff7b72 in it).
  assert.equal(color(containing(claude, "function"), "dark"), "#cc7bf4");
  assert.equal(color(containing(github, "function"), "dark"), "#f97583");
  assert.equal(color(containing(github, "function"), "light"), color(containing(claude, "function"), "light"));
  assert.equal(github.tokens.map((token) => token.text).join(""), text);
  assert.equal(validateTokens(github.tokens, text), true);
  const base = prepareHighlight({ text, language: "js" }), themed = prepareHighlight({ text, language: "js", themes: { light: "claude-light", dark: "github-dark" } });
  assert.deepEqual(base.themes, { light: "claude-light", dark: "claude-dark" });
  assert.notEqual(highlightKey(base), highlightKey(themed));
  assert.equal(highlightKey(base), highlightKey(prepareHighlight({ text, language: "js", themes: { light: "nope", dark: "github-light" } })), "invalid ids normalize to the Claude pair");
});
test("third-party theme foreground fallback and short hex colors are normalized to six digits", async () => {
  const result = await tokenize({ text: "x = 1\n", language: "python", themes: { light: "min-light", dark: "min-dark" } });
  assert.equal(result.status, "highlighted");
  assert.equal(validateTokens(result.tokens, "x = 1\n"), true);
  assert.equal(normalizeColor("#abc", "#000000"), "#aabbcc"); assert.equal(normalizeColor("#ABCD", "#000000"), "#aabbccdd");
  assert.equal(normalizeColor("red", "#111111"), "#111111"); assert.equal(normalizeColor(undefined, "#222222"), "#222222");
});
