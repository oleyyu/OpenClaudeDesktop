import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { historySearchStep, historySearchStatus, isHistorySearchKey } from "../src/prompt-history-model.mjs";
import { emojiToken, emojiMatches, emoticonReplacement, insertEmoji, emojiPopupGeometry, EMOJI, EMOJI_RESULT_LIMIT } from "../src/emoji-model.mjs";
import zh from "../electron/i18n/zh-CN/index.mjs";

// Composer parity with the 2.2553.1 CDS composer Em (c099c328d-CbkcmYSW.js): bash mode, Ctrl+R history search, the
// prompt-suggestion ghost and ':' emoji suggestions / emoticons.

test("Ctrl+R search: newest match first, cycles older with Ctrl+R/↑, reports no match, Esc restores the draft, Enter accepts", () => {
  const prompts = ["git status", "fix the tests", "run git log"];
  assert.equal(isHistorySearchKey({ key: "r", ctrlKey: true }), true);
  assert.equal(isHistorySearchKey({ key: "r", metaKey: true }), false);
  let step = historySearchStep(null, { key: "r", ctrlKey: true, inEditor: true, text: "draft", prompts });
  assert.equal(step.action, "start");
  let state = step.state;
  assert.deepEqual(state.prompts, ["run git log", "fix the tests", "git status"], "newest first");
  for (const key of "git") { step = historySearchStep(state, { key }); state = step.state; }
  assert.equal(step.text, "run git log");
  assert.equal(historySearchStatus(state), "Search history: git — match 1 of 3");
  step = historySearchStep(state, { key: "r", ctrlKey: true }); state = step.state;
  assert.equal(step.text, "git status");
  step = historySearchStep(state, { key: "z" }); state = step.state;
  assert.equal(state.failed, true);
  assert.match(historySearchStatus(state), / — no match$/);
  assert.deepEqual(historySearchStep(state, { key: "Escape" }), { state: null, action: "cancel", text: "draft", caret: "start" });
  assert.equal(historySearchStep(state, { key: "Enter" }).action, "accept");
  assert.equal(historySearchStatus(null), "");
});

test("emoji: ':' + 2 characters after whitespace opens up to 8 matches, name prefix before substring before keyword", () => {
  assert.deepEqual(emojiToken("hi :smi", 7), { start: 3, end: 7, query: "smi" });
  assert.equal(emojiToken(":s", 2), null, "Fd = 2 characters");
  assert.equal(emojiToken("12:30", 5), null, "the ':' needs whitespace (or the start) before it");
  assert.equal(emojiToken(":smile more", 4), null, "the caret must sit before whitespace (Pd)");
  assert.equal(emojiToken(":smi le", 4)?.query, "smi");
  const matches = emojiMatches("smile");
  assert.ok(matches[0].name.startsWith("smile") && matches.some((entry) => entry.name === "smile"));
  assert.ok(matches.length <= EMOJI_RESULT_LIMIT);
  assert.ok(emojiMatches("heart").every((entry, index, list) => index === 0 || !entry.name.startsWith("heart") || list[index - 1].name.startsWith("heart")));
  assert.ok(emojiMatches("lol").some((entry) => entry.name === "joy"), "keyword prefix");
  assert.deepEqual(insertEmoji("hi :smi", { start: 3, end: 7 }, "😄"), { text: "hi 😄", caret: 5 });
  assert.equal(new Set(EMOJI.map((entry) => entry.name)).size, EMOJI.length, "unique shortcodes");
});

test("emoticons turn into emoji as the space is typed (Od / Ad)", () => {
  assert.deepEqual(emoticonReplacement("nice :-p "), { start: 5, end: 9, text: "\u{1F61B} " });
  assert.equal(emoticonReplacement(";-p ").text, "\u{1F61C} ");
  assert.equal(emoticonReplacement("<3 ").text, "❤️ ");
  assert.equal(emoticonReplacement("a:) "), null, "needs whitespace or the start before it");
  assert.equal(emoticonReplacement(":-p"), null, "only once the space is typed");
});

test("emoji popup: 280px, 24px off the caret line, flips to the side with more room, 16px from the edges", () => {
  const below = emojiPopupGeometry({ caret: { left: 100, top: 100 }, viewport: { width: 1000, height: 800 } });
  assert.deepEqual(below, { left: 100, top: 124, maxHeight: 280, up: false });
  const above = emojiPopupGeometry({ caret: { left: 900, top: 700 }, viewport: { width: 1000, height: 800 } });
  assert.equal(above.up, true); assert.equal(above.top, 676); assert.equal(above.left, 1000 - 280 - 16);
});

let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, ".."), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  C = await server.ssrLoadModule("/src/source-composer.jsx");
});
after(() => server?.close());
const noop = () => {};
const render = (props) => renderToStaticMarkup(React.createElement(C.SourceComposer, {
  draft: "", setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: "ask", model: { model: "fixture", displayName: "Fixture" }, workdir: "/tmp/fixture", ...props }));

test("bash mode: purple ring flag, the 'bash' pro badge, 'Enter a shell command', the sr-only status; the '!' stays out of the editor", () => {
  const html = render({ shellMode: "core", draft: "!ls -la", historyResetKey: "code:t1" });
  // R3-composer step 3 (composer-shell): uM's root div carries data-bash-mode; the card takes tM 'inset-ring-1
  // inset-ring-pro' (cardClassName) and the view-tabs CdsBadge {pro, sm} sits in lc.Actions' trailing slot (pt).
  assert.match(html, /<div class="sc-composer epitaxy-prompt [^"]*" data-bash-mode="true"/);
  assert.match(html, /<div class="bg-surface-3 [^"]* inset-ring-1 inset-ring-pro [^"]*sc-card"/);
  assert.match(html, /<div data-cds="ChatComposerActions" class="contents">.*<span data-cds="Badge" data-size="sm" aria-hidden="true" title="Run as a shell command" class="[^"]*bg-tint-violet text-pro"><span class="pb-\[0\.05em\]">bash<\/span><\/span>/);
  // R4g-composer CP2 (X7-08): the editor is not empty ('ls -la'), so cm shows no placeholder span; the grow ghost stays.
  assert.doesNotMatch(html, /data-composer-placeholder=""/);
  assert.match(html, /data-composer-placeholder-ghost="Enter a shell command"/);
  assert.match(html, /role="status" data-bash-status="">Bash mode\. Press Escape to return to chat\.</);
  assert.doesNotMatch(html, /shell-mode-hint/);
  const chat = render({ shellMode: "core", draft: "" });
  assert.doesNotMatch(chat, /data-bash-mode|inset-ring-pro|data-cds="Badge"/);
  assert.match(chat, /data-bash-status="">Chat mode</);
  const none = render({ shellMode: null, draft: "!ls" });
  assert.doesNotMatch(none, /data-bash-mode|data-bash-status/, "a core without shell mode keeps '!' as text");
});

test("prompt suggestion: bare ghost overlay, the placeholder cleared, no '(Tab to use)'", () => {
  const html = render({ suggestion: "Run the tests" });
  // lc.Overlay (composer-shell): uM's ghost verbatim, `truncate text-muted-as-secondary`, alone in its overlay.
  assert.match(html, /<div data-cds="ChatComposerOverlay" class="absolute inset-0 overflow-hidden [^"]*pointer-events-none"><div aria-hidden="true" data-prompt-suggestion-ghost="true" class="truncate text-muted-as-secondary">Run the tests<\/div><\/div>/);
  assert.doesNotMatch(html, /data-composer-placeholder/, 'the placeholder is cleared (K ? ""): no span, no ghost');
  assert.doesNotMatch(html, /Tab to use/);
  assert.doesNotMatch(render({ suggestion: "Run the tests", draft: "x" }), /data-prompt-suggestion-ghost/);
});

test("every new composer string has a zh-CN entry", () => {
  for (const key of ["bash", "Run as a shell command", "Enter a shell command", "Bash mode. Press Escape to return to chat.", "Chat mode",
    "@-mentions can’t be used in a shell command. Remove the mention or send it as a message.", "Search history:", "Search history: {query}",
    " — match {index} of {total}", " — no match", "cycle", "cancel", "Emoji suggestions", "Click to preview", "Maximum of {max} images allowed."])
    assert.ok(typeof zh[key] === "string" && zh[key], key);
});
