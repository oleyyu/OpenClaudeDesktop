import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { composerPlaceholder, composerFirstRun, SESSION_PLACEHOLDER, DRAFT_PLACEHOLDER, CHAT_PLACEHOLDER, FIRST_RUN_PLACEHOLDER,
  RUNNING_PLACEHOLDER, RUNNING_PLACEHOLDER_COMPACT, runningPlaceholder, runningPlaceholderShown } from "../src/composer-placeholder.mjs";
import { useOverflowing } from "../src/generated/code-composer/placeholder-fit.mjs";
import zhCN from "../electron/i18n/zh-CN/index.mjs";

const root = path.resolve(import.meta.dirname, "..");

// cc43287c9-BMbiZYzF.js:28686 placeholder Yn ? 'Type / for commands' : 'Describe a task or ask a question' (:27454 Yn = Pn?.id ?? null).
test("Code composer: session id → 'Type / for commands'; draft (null/empty) → draft copy", () => {
  assert.equal(SESSION_PLACEHOLDER, "Type / for commands");
  assert.equal(DRAFT_PLACEHOLDER, "Describe a task or ask a question");
  assert.equal(composerPlaceholder({ sessionId: "thread-1", mode: "code" }), "Type / for commands");
  assert.equal(composerPlaceholder({ sessionId: null, mode: "code" }), "Describe a task or ask a question");
  assert.equal(composerPlaceholder({ sessionId: "", mode: "code" }), "Describe a task or ask a question", "Yn ?? null: an empty id is not a session");
  assert.equal(composerPlaceholder({ mode: "code" }), DRAFT_PLACEHOLDER);
  assert.equal(composerPlaceholder(), DRAFT_PLACEHOLDER);
});

// cc43287c9-Bchz60VT :33797-33816 ho (scope store firstRun === true, set from Zq :15632-15660).
test("first run (no sessions, stats read with no sessions) → 'Describe something to build, change, or fix' on the draft only", () => {
  assert.equal(FIRST_RUN_PLACEHOLDER, "Describe something to build, change, or fix");
  assert.equal(composerPlaceholder({ sessionId: null, mode: "code", firstRun: true }), FIRST_RUN_PLACEHOLDER);
  assert.equal(composerPlaceholder({ sessionId: null, mode: "code", firstRun: null }), DRAFT_PLACEHOLDER, "pending: the usual copy");
  assert.equal(composerPlaceholder({ sessionId: null, mode: "code", firstRun: false }), DRAFT_PLACEHOLDER);
  assert.equal(composerPlaceholder({ sessionId: "thread-1", mode: "code", firstRun: true }), SESSION_PLACEHOLDER);
  assert.equal(composerPlaceholder({ sessionId: null, mode: "chat", firstRun: true }), CHAT_PLACEHOLDER);
});

test("Zq: null while the session list or stats are pending, false with any session or unreadable stats, else totalSessions === 0", () => {
  const empty = { dailyActivity: [], dailyModelTokens: [], modelUsage: {} };
  assert.equal(composerFirstRun({ sessionsLoaded: false, sessionCount: 0, stats: empty }), null);
  assert.equal(composerFirstRun({ sessionsLoaded: true, sessionCount: 2, stats: undefined }), false, "r > 0 wins before the stats");
  assert.equal(composerFirstRun({ sessionsLoaded: true, sessionCount: 0, stats: undefined }), null, "stats pending (eR null)");
  assert.equal(composerFirstRun({ sessionsLoaded: true, sessionCount: 0, stats: null }), false, "stats failed (eR undefined)");
  assert.equal(composerFirstRun({ sessionsLoaded: true, sessionCount: 0, stats: empty }), true);
  assert.equal(composerFirstRun({ sessionsLoaded: true, sessionCount: 0, stats: { ...empty, dailyActivity: [{ date: "2026-10-01", sessionCount: 3 }] } }), false, "sessions recorded on this Mac before");
  assert.equal(composerFirstRun({ sessionsLoaded: true, sessionCount: 0, stats: { totalSessions: 1 } }), false);
  assert.equal(composerFirstRun(), null);
});

test("Chat mode is not the cc43287c9 Code branch and keeps its own copy with or without a session", () => {
  assert.equal(CHAT_PLACEHOLDER, "How can I help you today?");
  assert.equal(composerPlaceholder({ sessionId: "thread-1", mode: "chat" }), CHAT_PLACEHOLDER);
  assert.equal(composerPlaceholder({ sessionId: null, mode: "chat" }), CHAT_PLACEHOLDER);
});

test("main.jsx feeds the current session id into the composer placeholder; SourceComposer's fallback is the draft copy", async () => {
  const main = await fs.readFile(path.join(root, "src/main.jsx"), "utf8");
  const composer = await fs.readFile(path.join(root, "src/source-composer.jsx"), "utf8");
  assert.match(main, /composerPlaceholder\(\{ sessionId: current, mode, firstRun: composerFirstRun\(\{ sessionsLoaded, sessionCount: sessions\.length \+ \(hiddenSessions\?\.otherEngine \|\| 0\) \+ \(hiddenSessions\?\.missing \|\| 0\), stats: statsSnapshot \}\) \}\)\}/);
  // A core's suggested next prompt (codeDesktop/promptSuggestion) clears the placeholder (c099c328d :8988) and is drawn
  // bare by the ghost overlay; bash mode reads 'Enter a shell command'.
  assert.match(composer, /placeholder=\{showSuggestion \? "" : fittedPlaceholder\}/);
  assert.match(composer, /const fullPlaceholder = runningHint \? runningPlaceholder\(\{ mac: macKeys \}\) : bashMode \? t\("Enter a shell command"\) : placeholder \?\? composerPlaceholder\(\{ mode \}\);/);
  assert.doesNotMatch(composer, /Tab to use/);
  const editor = await fs.readFile(path.join(root, "src/source-composer-editor.jsx"), "utf8");
  assert.match(editor, /data-placeholder=\{props\.placeholder\}/, "the ProseMirror editor exposes the copy through data-placeholder (::before content)");
});

// R2 composer-send-cell: 2.42304.0 c227f4d5e uM — while a turn runs (ze) the placeholder names both lanes, Be(spoken)
// "{sendKey} to send, {queueKey} to queue for later" (mZ6xnUz7iS), with He "{queueKey} to queue" (FIL0bW8Kgx) once the
// fit probe overflows; key labels are the original cM (generated composer-key-label.mjs).
const readable = path.resolve(root, "../analysis/code-ui-unpack-20261017/readable");
test("running placeholder: the full and compact copy with the original cM key labels (mac glyphs, spoken names)", async () => {
  assert.equal(RUNNING_PLACEHOLDER, "{sendKey} to send, {queueKey} to queue for later");
  assert.equal(RUNNING_PLACEHOLDER_COMPACT, "{queueKey} to queue");
  assert.equal(runningPlaceholder({ mac: true }), "⏎ to send, ⌘⏎ to queue for later");
  assert.equal(runningPlaceholder({ mac: true, compact: true }), "⌘⏎ to queue");
  assert.equal(runningPlaceholder({ mac: true, spoken: true }), "Enter to send, Command+Enter to queue for later", "We: the aria-description");
  assert.equal(runningPlaceholder({ mac: false }), "Enter to send, Ctrl+Enter to queue for later");
  assert.equal(runningPlaceholder({ mac: false, compact: true }), "Ctrl+Enter to queue");
  const chunk = await fs.readFile(path.join(readable, "c227f4d5e-Ba-r--Rl.js"), "utf8");
  for (const pin of ['defaultMessage: "{sendKey} to send, {queueKey} to queue for later",', 'id: "mZ6xnUz7iS",',
    '{ defaultMessage: "{queueKey} to queue", id: "FIL0bW8Kgx" },', '{ sendKey: cM("enter", Re, e), queueKey: cM("cmd+enter", Re, e) },',
    '{ queueKey: cM("cmd+enter", Re) },', 'ze = !!V && !ge && Le && !A && !I && re === null,'])
    assert.ok(chunk.includes(pin), pin);
  assert.equal(zhCN[RUNNING_PLACEHOLDER], "{sendKey} 发送，{queueKey} 加入队列稍后发送");
  assert.equal(zhCN[RUNNING_PLACEHOLDER_COMPACT], "{queueKey} 加入队列");
});
test("ze: only while Stop is offered, ⌘⏎ is free, Enter sends, the editor is enabled, sending is not blocked and no history search runs", () => {
  const on = { showStop: true, cmdEnterClaimed: false, plainEnterSends: true, disabled: false, submitBlocked: false, historySearch: null };
  assert.equal(runningPlaceholderShown(on), true);
  for (const [key, value] of [["showStop", false], ["cmdEnterClaimed", true], ["plainEnterSends", false], ["disabled", true], ["submitBlocked", true], ["historySearch", { query: "" }]])
    assert.equal(runningPlaceholderShown({ ...on, [key]: value }), false, key);
  assert.equal(runningPlaceholderShown(), false);
});

// The original Kf (c1c6ea9ac o) under a minimal hook dispatcher: overflow is scrollWidth over clientWidth, measured on
// mount, on the probe's ResizeObserver, on the text and once the owner document's fonts are ready.
function hookFixture(hook) {
  let cursor = 0, result;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  let render;
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: initial }; return [cells[i].value, (v) => { const next = typeof v === "function" ? v(cells[i].value) : v; if (!Object.is(next, cells[i].value)) { cells[i].value = next; render.dirty = true; } }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useCallback(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn, deps }; return cells[i].value; },
    useLayoutEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  render = (...args) => {
    for (let pass = 0; pass < 5; pass++) {
      render.dirty = false; cursor = 0;
      const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
      internal.H = hooks;
      try { result = hook(...args); } finally { internal.H = old; }
      while (effects.length) effects.shift()();
      if (!render.dirty) return result;
    }
    return result;
  };
  return { render, close: () => cells.forEach((cell) => cell?.cleanup?.()) };
}
test("useOverflowing (the original Kf) reports the probe's overflow and follows resizes and the font load", async () => {
  let fontsReady;
  const observers = [];
  class FakeResizeObserver { constructor(callback) { this.callback = callback; observers.push(this); } observe(node) { this.node = node; } disconnect() { this.disconnected = true; } }
  const doc = { nodeType: 9, fonts: { ready: new Promise((resolve) => { fontsReady = resolve; }) }, defaultView: { ResizeObserver: FakeResizeObserver } };
  const probe = { ownerDocument: doc, scrollWidth: 120, clientWidth: 200, nodeType: 1 };
  const f = hookFixture((node, text) => useOverflowing(node, text));
  assert.equal(f.render(null, "a"), false, "no probe: never overflowing");
  assert.equal(f.render(probe, "⏎ to send, ⌘⏎ to queue for later"), false, "fits");
  assert.equal(observers.length, 1, "observes the probe with its owner window's ResizeObserver");
  probe.clientWidth = 100;
  observers[0].callback(); // the probe shrank: the hook re-measures on the observer callback
  assert.equal(f.render(probe, "⏎ to send, ⌘⏎ to queue for later"), true, "overflows after the resize");
  probe.clientWidth = 300;
  fontsReady(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.render(probe, "⏎ to send, ⌘⏎ to queue for later!"), false, "a new text re-measures");
  f.close();
  assert.equal(observers[0].disconnected, true);
});
