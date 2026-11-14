import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { readMarkdownCodeBlock } from "../src/code-fence-model.mjs";
import { createClipboardFeedback } from "../src/clipboard-feedback.mjs";

function render(source, isStreaming = false) {
  const blocks = [];
  const html = renderToStaticMarkup(React.createElement(Markdown, { components: {
    pre: ({ node, children }) => {
      const value = readMarkdownCodeBlock(node, source, isStreaming);
      blocks.push(value);
      return value ? React.createElement("pre", null, React.createElement("code", null, value.text))
        : React.createElement("pre", null, children);
    },
  } }, source));
  return { blocks, html };
}

test("react-markdown v10 body excludes fence boundary newline, preserving intentional content whitespace", () => {
  assert.deepEqual(render("```js\nx\n```").blocks.map((block) => block.text), ["x"]);
  assert.equal(render("```\n\tx  \n\n```").blocks[0].text, "\tx  \n");
  assert.equal(render("```\nx\n\n\n```").blocks[0].text, "x\n\n");
  assert.equal(render("```js\nx  ").blocks[0].text, "x  ");
});

test("empty, unlabelled, indented and CRLF code retain the parser's logical content", () => {
  for (const source of ["```\n```", "```\n\n```", "~~~\n~~~"])
    assert.equal(render(source).blocks[0].text, "");
  assert.equal(render("    alpha\n    beta\n").blocks[0].text, "alpha\nbeta");
  assert.equal(render("```\r\nalpha\r\nbeta\r\n```").blocks[0].text, "alpha\r\nbeta");
  assert.equal(render("```\nx\n```").blocks[0].language, "text");
});

test("inline code remains inline; code bodies containing HTML are escaped text", () => {
  const source = '`inline`\n\n```html\n<script>alert("x")</script>\n<img src=x onerror=alert(1)>\n```';
  const result = render(source);
  assert.equal(result.blocks.length, 1);
  assert.match(result.html, /<p><code>inline<\/code><\/p>/);
  assert.doesNotMatch(result.html, /<script>|<img /);
  assert.match(result.html, /&lt;script&gt;/);
  assert.equal(result.blocks[0].text, '<script>alert("x")</script>\n<img src=x onerror=alert(1)>');
});

test("streaming opener is held until its language line settles", () => {
  assert.equal(render("```ja", true).blocks[0].languageSettled, false);
  assert.equal(render("```js\n", true).blocks[0].languageSettled, true);
  assert.equal(render("```js\nlet x =", true).blocks[0].isFrontier, true);
  assert.equal(render("```js", false).blocks[0].isFrontier, false);
});

test("certified closing fence settles while a tail indented or unclosed block remains frontier", () => {
  assert.equal(render("```js\nx\n```", true).blocks[0].isFrontier, false);
  assert.equal(render("~~~~\nx\n~~~~~\n", true).blocks[0].isFrontier, false);
  assert.equal(render("````\nx\n```", true).blocks[0].isFrontier, true);
  assert.equal(render("```\nx\n``` still code", true).blocks[0].isFrontier, true);
  assert.equal(render("    x\n", true).blocks[0].isFrontier, true);
  assert.equal(render("    x\n\nnext paragraph", true).blocks[0].isFrontier, false);
  assert.equal(render("```\nx", false).blocks[0].isFrontier, false);
});

test("nested trailing fences remain conservative; later blocks settle them without guessing prefixes", () => {
  const nested = render("> ```js\n> x\n> ```", true).blocks[0];
  assert.equal(nested.text, "x");
  assert.equal(nested.stateEvidence, "nested-tail-conservative");
  assert.equal(nested.isFrontier, true);
  assert.equal(render("> ```js\n> x\n> ```\n\nnext", true).blocks[0].isFrontier, false);
  assert.equal(render("- item\n\n  ```js\n  x\n  ```", true).blocks[0].text, "x");
});

test("unexpected HAST code markup safely falls back instead of copying a partial body", () => {
  assert.equal(readMarkdownCodeBlock({ type: "element", tagName: "pre", children: [
    { type: "element", tagName: "code", children: [{ type: "element", tagName: "span", children: [] }] },
  ] }), null);
  assert.equal(readMarkdownCodeBlock(null), null);
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function feedback(writeText) {
  const states = [], timers = new Map();
  let timerId = 0;
  const api = createClipboardFeedback({ writeText, onState: (state) => states.push(state),
    schedule: (run, delay) => { const id = ++timerId; timers.set(id, { run, delay }); return id; },
    cancel: (id) => timers.delete(id),
  });
  return { api, states, timers };
}

test("copy sends complete text and confirms only after a real write, resetting after 1200ms", async () => {
  const pending = deferred(), payloads = [];
  const f = feedback((text) => { payloads.push(text); return pending.promise; });
  f.api.setText("\tx  \n\n");
  const result = f.api.copy();
  assert.deepEqual(payloads, ["\tx  \n\n"]);
  assert.equal(f.states.at(-1), "pending");
  pending.resolve();
  assert.equal(await result, true);
  assert.equal(f.states.at(-1), "copied");
  assert.equal([...f.timers.values()][0].delay, 1200);
  [...f.timers.values()][0].run();
  assert.equal(f.states.at(-1), "idle");
  f.api.dispose();
});

test("clipboard rejection reports failure, never Copied, and permits successful retry", async () => {
  let fail = true;
  const f = feedback(async () => { if (fail) throw new Error("denied"); });
  f.api.setText("body");
  assert.equal(await f.api.copy(), false);
  assert.equal(f.states.at(-1), "error");
  assert.equal(f.states.includes("copied"), false);
  fail = false;
  assert.equal(await f.api.copy(), true);
  assert.equal(f.states.at(-1), "copied");
  f.api.dispose();
  assert.equal(f.timers.size, 0);
});

test("content replacement invalidates pending success and cleans existing feedback timers", async () => {
  const pending = deferred();
  const f = feedback(() => pending.promise);
  f.api.setText("old");
  const result = f.api.copy();
  f.api.setText("new");
  pending.resolve();
  assert.equal(await result, false);
  assert.equal(f.states.at(-1), "idle");
  assert.equal(f.timers.size, 0);
  await f.api.copy();
  assert.equal(f.timers.size, 1);
  f.api.setText("third");
  assert.equal(f.timers.size, 0);
  f.api.dispose();
});

test("out-of-order earlier promise cannot overwrite later Copy state", async () => {
  const first = deferred(), second = deferred();
  let request = 0;
  const f = feedback(() => ++request === 1 ? first.promise : second.promise);
  f.api.setText("body");
  const a = f.api.copy(), b = f.api.copy();
  second.resolve();
  await b;
  first.reject(new Error("stale failure"));
  await a;
  assert.equal(f.states.at(-1), "copied");
  assert.equal(f.timers.size, 1);
  f.api.dispose();
});

test("unmount invalidates pending clipboard feedback and no later timers are scheduled", async () => {
  const pending = deferred();
  const f = feedback(() => pending.promise);
  f.api.setText("body");
  const result = f.api.copy();
  f.api.dispose();
  const count = f.states.length;
  pending.resolve();
  await result;
  assert.equal(f.states.length, count);
  assert.equal(f.timers.size, 0);
  assert.equal(await f.api.copy(), false);
});
