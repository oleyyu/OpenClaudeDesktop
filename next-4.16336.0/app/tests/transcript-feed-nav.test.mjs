import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import {
  FEED_INSTRUCTIONS, FEED_LABEL, STREAMING_LABEL, articleLabel, currentArticleIndex, feedArticles,
  feedKeyAction, isStreamingArticle, messageLabel, messageSummary, plainEscape, promptHeading, responseHeading,
} from "../src/transcript-feed-nav.mjs";

const user = (key, extra = {}) => ({ key, kind: "user", ...extra });
const row = (key, extra = {}) => ({ key, kind: "response", ...extra });
const boundary = { kind: "boundary" };
const key = (name, extra = {}) => ({ key: name, ...extra });

test("articles: each prompt, and only the first visible row of each answer (j9)", () => {
  const articles = feedArticles([
    user("u1"), row("thinking", { hidden: true }), row("cmd"), row("group:g"), row("a1"), boundary, // footer
    user("u2"), row("a2"), boundary, row("compaction"), user("u3"),
  ]);
  assert.deepEqual(articles.map((article) => [article.key, article.kind]), [
    ["u1", "user"], ["cmd", "response"], ["u2", "user"], ["a2", "response"], ["compaction", "response"], ["u3", "user"]]);
  assert.deepEqual(articles[1].rows, ["cmd", "group:g", "a1"], "the answer's rows, for its heading");
  assert.deepEqual(articles.map((article) => article.rowIndex), [0, 2, 6, 7, 9, 10]);
  // A row that opens another turn starts a new answer even without a boundary.
  assert.deepEqual(feedArticles([user("u"), row("a"), row("b", { turnStart: true }), row("c")]).map((article) => article.rows),
    [["u"], ["a"], ["b", "c"]]);
  assert.deepEqual(feedArticles([]), []);
  assert.deepEqual(feedArticles([row("x", { hidden: true }), boundary]), []);
});

test("current article: the remembered one while it exists, otherwise the last", () => {
  const articles = feedArticles([user("u1"), row("a1"), user("u2"), row("a2")]);
  assert.equal(currentArticleIndex(articles, null), 3);
  assert.equal(currentArticleIndex(articles, "u2"), 2);
  assert.equal(currentArticleIndex(articles, "gone"), 3);
  assert.equal(currentArticleIndex([], "u1"), -1);
});

test("arrow keys move between articles from inside one; Home/End jump; End on the last re-pins", () => {
  const base = { count: 4, current: 3, inArticle: true, focusInCurrent: true };
  assert.deepEqual(feedKeyAction(key("ArrowUp"), base), { type: "move", index: 2, last: false });
  assert.deepEqual(feedKeyAction(key("ArrowUp"), { ...base, current: 2 }), { type: "move", index: 1, last: false });
  assert.deepEqual(feedKeyAction(key("ArrowDown"), { ...base, current: 2 }), { type: "move", index: 3, last: true });
  assert.equal(feedKeyAction(key("ArrowDown"), base), null, "ArrowDown on the focused last keeps the default");
  assert.equal(feedKeyAction(key("ArrowUp"), { ...base, current: 0 }), null, "ArrowUp on the focused first keeps the default");
  assert.deepEqual(feedKeyAction(key("Home"), base), { type: "move", index: 0, last: false });
  assert.deepEqual(feedKeyAction(key("End"), { ...base, current: 1 }), { type: "move", index: 3, last: true });
  assert.deepEqual(feedKeyAction(key("End"), base), { type: "repin" });
  assert.deepEqual(feedKeyAction(key("Home", { ctrlKey: true }), base), { type: "move", index: 0, last: false });
  assert.deepEqual(feedKeyAction(key("End", { ctrlKey: true }), { ...base, current: 0 }), { type: "move", index: 3, last: true });
  // Focus elsewhere in the feed: the current article is focused first.
  assert.deepEqual(feedKeyAction(key("End"), { ...base, focusInCurrent: false }), { type: "move", index: 3, last: true });
  assert.deepEqual(feedKeyAction(key("Home"), { ...base, inArticle: false, focusInCurrent: false }), { type: "move", index: 0, last: false });
  assert.equal(feedKeyAction(key("ArrowUp"), { ...base, inArticle: false }), null, "arrows only from inside an article");
  assert.equal(feedKeyAction(key("ArrowUp"), { ...base, pointerFocus: true }), null, "a pointer-focused article keeps its arrows");
  // An unknown current (-1) counts from the last.
  assert.deepEqual(feedKeyAction(key("ArrowUp"), { ...base, current: -1, focusInCurrent: false }), { type: "move", index: 2, last: false });
});

test("keys that stay with their target: modifiers, editors, focusable scrollers, prevented events, an empty feed", () => {
  const base = { count: 4, current: 2, inArticle: true, focusInCurrent: true };
  for (const modifier of ["shiftKey", "altKey", "metaKey"])
    assert.equal(feedKeyAction(key("ArrowUp", { [modifier]: true }), base), null, modifier);
  assert.equal(feedKeyAction(key("ArrowUp", { ctrlKey: true }), base), null, "Ctrl only joins Home/End");
  assert.equal(feedKeyAction(key("Home"), { ...base, editable: true }), null);
  assert.equal(feedKeyAction(key("End"), { ...base, scroller: true }), null);
  assert.equal(feedKeyAction(key("ArrowDown", { defaultPrevented: true }), base), null);
  assert.equal(feedKeyAction(key("Home"), { ...base, count: 0, current: -1 }), null);
  assert.equal(feedKeyAction(key("PageDown"), base), null);
  assert.deepEqual(feedKeyAction(key("Escape"), base), { type: "escape" });
  assert.equal(feedKeyAction(key("Escape"), { ...base, inArticle: false }), null);
  assert.equal(plainEscape({ key: "Escape" }), true);
  for (const extra of [{ repeat: true }, { defaultPrevented: true }, { isComposing: true }, { keyCode: 229 }, { shiftKey: true }, { metaKey: true }])
    assert.equal(plainEscape({ key: "Escape", ...extra }), false, JSON.stringify(extra));
});

test("labels: 'Message N', the streaming tail, the feed name and instructions", () => {
  const articles = feedArticles([user("u1"), row("a1"), user("u2"), row("a2")]);
  assert.equal(messageLabel(3), "Message 3");
  assert.equal(isStreamingArticle(articles, 3, true), true);
  assert.equal(isStreamingArticle(articles, 3, false), false);
  assert.equal(isStreamingArticle(articles, 1, true), false, "only the live tail");
  assert.equal(isStreamingArticle(feedArticles([user("u1")]), 0, true), false, "a prompt is never the streaming answer");
  assert.equal(articleLabel({ position: 4, streaming: true }), STREAMING_LABEL);
  assert.equal(articleLabel({ position: 4 }), "Message 4");
  assert.equal(STREAMING_LABEL, "Currently streaming message");
  assert.equal(FEED_LABEL, "Chat messages");
  assert.equal(FEED_INSTRUCTIONS, "Use the up and down arrow keys to move between messages.");
});

test("summaries (af): first sentence of the first plain line, Markdown stripped, 160 units", () => {
  assert.equal(messageSummary("Fix the bug. Then test it."), "Fix the bug.");
  assert.equal(messageSummary("\n\n```ts\nconst x = 1;\n```\n\n## Done **now**\nmore"), "Done now");
  assert.equal(messageSummary("- `npm test` passes and [docs](https://x.test) update"), "npm test passes and docs update");
  assert.equal(messageSummary("Version 1.2 ships today"), "Version 1.2 ships today", "a period inside a word is not a sentence end");
  assert.equal(messageSummary("Line one\nLine two."), "Line one");
  const long = messageSummary("word ".repeat(80));
  assert.equal(long.length, 160);
  assert.ok(long.endsWith("…"));
  assert.equal(messageSummary(""), "");
  assert.equal(messageSummary(undefined), "");
});

test("sr-only headings: 'You said', and '<assistant> responded' except while streaming", () => {
  assert.equal(promptHeading("Please run the tests. Thanks"), "You said: Please run the tests.");
  assert.equal(promptHeading("   "), null);
  // W14-code r4 gen-final-4: the test-only ASSISTANT_NAME constant is deleted (E83: the name is the persona's).
  assert.equal(responseHeading("All tests pass. Details below."), "DeepSeek responded: All tests pass.");
  assert.equal(responseHeading("All tests pass.", { streaming: true }), null);
  assert.equal(responseHeading(`${"x".repeat(700)} tail.`).length, "DeepSeek responded: ".length + 160, "first 600 units, capped at 160");
  assert.equal(responseHeading(""), null);
});

test("wiring: the transcript is a feed (no role=log), main.jsx passes responding and routes Edit ▸ Find", () => {
  const transcript = readFileSync(new URL("../src/source-transcript.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(transcript, /role="log"|aria-label="Conversation"/);
  assert.match(transcript, /useTranscriptFeedNav\(/);
  assert.match(transcript, /\{\.\.\.feed\.feedProps\}/);
  assert.match(transcript, /\{feed\.instructions\}/);
  // R09: the find bar is app-level (sidebar-main.js:20491 ZB), not under the keyed transcript; the
  // transcript handle keeps openFind/stepFind, delegating to the lifted bar.
  assert.doesNotMatch(transcript, /<SourceFindBar|source-find-bar/);
  assert.match(transcript, /openFind: \(\) => findBarRef\?\.current\?\.open\(\), stepFind: \(forward\) => findBarRef\?\.current\?\.step\(forward\)/);
  const hook = readFileSync(new URL("../src/use-transcript-feed-nav.js", import.meta.url), "utf8");
  assert.match(hook, /role: "feed"/);
  assert.match(hook, /"aria-busy": !!responding/);
  assert.match(hook, /"data-find-omitted": ""/);
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /responding=\{running\}/);
  assert.match(main, /onFeedEscape=\{\(\) => textarea\.current\?\.focus\(\)\}/);
  // Split view: only the focused side's find bar takes Edit ▸ Find (source-split-view.jsx).
  assert.match(main, /e\.kind === "find-open" && splitActiveRef\.current( && !dispatchTerminalFind\(e\.kind\))?\) transcriptRef\.current\?\.openFind/);
  assert.match(main, /e\.kind === "find-step" && splitActiveRef\.current( && !dispatchTerminalFind\(e\.kind, ?e\.forward ?!== ?false\))?\) transcriptRef\.current\?\.stepFind\?\.\(e\.forward !== false\)/);
  const bar = main.indexOf("<SourceFindBar ref={findBarRef}"), keyed = main.indexOf('<SourceTranscript\n                  key={current ?? "draft"}');
  assert.ok(bar > 0 && keyed > bar, "SourceFindBar is mounted before (outside) the keyed SourceTranscript");
  assert.ok(main.slice(bar, keyed).includes("/>"), "the find bar element closes before the transcript opens");
  assert.equal(main.split("<SourceFindBar ").length, 2, "one find bar");
  // W14-code r4 ct-feed R4T-09: the Code feed list (c4a9ee384 ba, windowed) is told to hold every row before the find bar
  // reads the transcript's DOM (ba keeps them all mounted for a print the same way, `ji`). W14-code r5 R5T-REG-03: only
  // while the find bar is open; closed, the hold ends (releaseRows) and the list windows again (c96d752d0 Aat with c9).
  assert.match(main.slice(bar, keyed), /sessionKey=\{current \?\? "draft"\}\s+getScope=\{\(\) => \{ if \(findBarOpen\(\)\) transcriptRef\.current\?\.holdAllRows\?\.\(\); else transcriptRef\.current\?\.releaseRows\?\.\(\);[^}]*\*\/ return transcriptRef\.current\?\.getContent\?\.\(\); \}\}/);
  assert.match(main.slice(keyed, keyed + 200), /findBarRef=\{findBarRef\}/);
  assert.ok(main.indexOf("findBarRef = useRef(null)") > 0 && main.indexOf("findBarRef = useRef(null)") < bar, "declared before use");
  const findBar = readFileSync(new URL("../src/source-find-bar.jsx", import.meta.url), "utf8");
  assert.match(findBar, /if \(switched && latest\.current\.query\) \{ input\.current\.cancel\(\); runRef\.current\(latest\.current\.query, "new"\); \}/);
  assert.match(findBar, /\}, \[open, sessionKey\]\);/);
  assert.match(findBar, /useEffect\(\(\) => \(\) => \{ input\.current\?\.cancel\(\); paint\(\[\], -1\); \}, \[\]\);/);
  const session = readFileSync(new URL("../src/source-session.jsx", import.meta.url), "utf8");
  assert.match(session, /<h2 data-find-omitted="" className="sr-only select-none">\{heading\}<\/h2>/);
});

// Node-only SSR of the feed markup (scroll-messages-current.js:63957-63966, :61282) and the
// prompt heading inside the user message group (:39513-39521).
let server, SourceTranscript, SourceMessage;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, ".."), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  ({ SourceTranscript } = await server.ssrLoadModule("/src/source-transcript.jsx"));
  ({ SourceMessage } = await server.ssrLoadModule("/src/source-session.jsx"));
});
after(async () => { await server?.close(); });

test("SSR: role=feed 'Chat messages', aria-busy while responding, described by the sr-only instructions", () => {
  const render = (responding) => renderToStaticMarkup(React.createElement(SourceTranscript, { sessionKey: "code:s", responding },
    React.createElement("div", { className: "probe" })));
  const html = render(true);
  const feed = /<div class="transcript[^"]*"([^>]*)>/.exec(html)?.[1] ?? "";
  assert.match(feed, /role="feed"/);
  assert.match(feed, /aria-label="Chat messages"/);
  assert.match(feed, /aria-busy="true"/);
  assert.doesNotMatch(html, /role="log"|Conversation/);
  const describedBy = /aria-describedby="([^"]+)"/.exec(feed)?.[1];
  assert.ok(describedBy);
  assert.ok(html.includes(`<p id="${describedBy}" class="sr-only select-none" data-find-omitted="">${FEED_INSTRUCTIONS}</p>`), "the instructions open the feed");
  assert.match(render(false), /role="feed" aria-label="Chat messages" aria-busy="false"/);
  assert.doesNotMatch(html, /role="search"/, "the find bar renders only once opened");
});

test("SSR: the prompt's sr-only h2 opens the user message group, outside find", () => {
  const html = renderToStaticMarkup(React.createElement(SourceMessage, { sessionKey: "s", item: { id: "u1", type: "userMessage",
    content: [{ type: "text", text: "Run **all** the tests. Then report." }] } }));
  assert.match(html, /<div class="source-user-group" data-cds="UserMessageGroup"><h2 data-find-omitted="" class="sr-only select-none">You said: Run all the tests\.<\/h2>/);
  const empty = renderToStaticMarkup(React.createElement(SourceMessage, { sessionKey: "s", item: { id: "u2", type: "userMessage",
    content: [{ type: "image", url: "data:image/png;base64,AA==" }] } }));
  assert.doesNotMatch(empty, /<h2/);
});
