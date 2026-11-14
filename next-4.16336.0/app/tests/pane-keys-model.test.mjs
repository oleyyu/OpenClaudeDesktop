import test from "node:test";
import assert from "node:assert/strict";
import {
  ARROW_SCROLL_STEP, composerPageKey, easeScrollStep, focusableScroller, inOtherScroller, keyScrollDelta,
  nextScrollTarget, openLayer, ownsKeys, paneKeyAction, paneKeyName, approvalDigit,
} from "../src/pane-keys-model.mjs";

const key = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, defaultPrevented: false, ...extra });

test("paneKeyName follows jZ: Ctrl+Home/End, macOS Option+arrows as Page keys, other chords dropped", () => {
  assert.equal(paneKeyName(key("ArrowDown"), { mac: true }), "ArrowDown");
  assert.equal(paneKeyName(key("a", { shiftKey: true }), { mac: true }), "a");
  assert.equal(paneKeyName(key("Home", { ctrlKey: true }), { mac: true }), "Home");
  assert.equal(paneKeyName(key("ArrowUp", { altKey: true }), { mac: true }), "PageUp");
  assert.equal(paneKeyName(key("ArrowDown", { altKey: true }), { mac: true }), "PageDown");
  assert.equal(paneKeyName(key("ArrowDown", { altKey: true }), { mac: false }), null);
  assert.equal(paneKeyName(key("x", { altKey: true }), { mac: true }), null);
  assert.equal(paneKeyName(key("k", { metaKey: true }), { mac: true }), null);
  assert.equal(paneKeyName(key("b", { ctrlKey: true }), { mac: true }), null);
});

test("keyScrollDelta: 48px arrows (F3) and 90% of the height above the scroll padding for Page keys", () => {
  assert.equal(keyScrollDelta("ArrowDown"), ARROW_SCROLL_STEP);
  assert.equal(keyScrollDelta("ArrowUp"), -48);
  assert.equal(keyScrollDelta("PageDown", { clientHeight: 600, scrollPaddingBottom: 100 }), 450);
  assert.equal(keyScrollDelta("PageUp", { clientHeight: 600 }), -540);
  assert.equal(keyScrollDelta("Home", { clientHeight: 600 }), 0);
});

test("nextScrollTarget accumulates held keys onto the pending target and clamps to the range", () => {
  assert.equal(nextScrollTarget({ scrollTop: 100, scrollHeight: 1000, clientHeight: 400, delta: 48 }), 148);
  assert.equal(nextScrollTarget({ pending: 148, scrollTop: 110, scrollHeight: 1000, clientHeight: 400, delta: 48 }), 196);
  assert.equal(nextScrollTarget({ scrollTop: 580, scrollHeight: 1000, clientHeight: 400, delta: 48 }), 600);
  assert.equal(nextScrollTarget({ scrollTop: 10, scrollHeight: 1000, clientHeight: 400, delta: -48 }), 0);
});

test("easeScrollStep closes a quarter of the distance per frame, at least a pixel, and lands under a pixel", () => {
  assert.deepEqual(easeScrollStep(0, 100), { top: 25, done: false });
  assert.deepEqual(easeScrollStep(100, 0), { top: 75, done: false });
  assert.deepEqual(easeScrollStep(0, 2), { top: 1, done: false });
  assert.deepEqual(easeScrollStep(99.5, 100), { top: 100, done: true });
  let top = 0, frames = 0;
  for (let done = false; !done; frames += 1) ({ top, done } = easeScrollStep(top, 540));
  assert.equal(top, 540);
  assert.ok(frames < 40, `eases in a bounded number of frames (${frames})`);
});

function element({ matches = [], closest = {}, tabIndex = -1, scrollHeight = 0, clientHeight = 0, parent = null, style = {}, contains = [] } = {}) {
  const node = {
    tabIndex, scrollHeight, clientHeight, parentElement: parent, style,
    matches: (selector) => matches.some((name) => selector.includes(name)),
    closest: (selector) => Object.entries(closest).find(([name]) => selector.includes(name))?.[1] ?? null,
    contains: (other) => other === node || contains.includes(other),
  };
  return node;
}

test("ownsKeys: editors, menus, options and an open approval card keep their keys; buttons and the body do not", () => {
  assert.equal(ownsKeys(element({ matches: ["textarea"] })), true);
  assert.equal(ownsKeys(element({ matches: ['[role="option"]'] })), true);
  assert.equal(ownsKeys(element({ closest: { ".epitaxy-approval-card": {} } })), true);
  assert.equal(ownsKeys(element()), false);
  assert.equal(ownsKeys(null), false);
});

test("composerPageKey: Page keys in a composer editor that does not scroll go to the transcript", () => {
  const flat = element({ scrollHeight: 40, clientHeight: 40 }), tall = element({ scrollHeight: 400, clientHeight: 200 });
  const inFlat = element({ closest: { ChatComposerEditor: flat } }), inTall = element({ closest: { ChatComposerEditor: tall } });
  assert.equal(composerPageKey(key("PageDown"), inFlat), true);
  assert.equal(composerPageKey(key("PageDown", { shiftKey: true }), inFlat), false);
  assert.equal(composerPageKey(key("ArrowDown"), inFlat), false);
  assert.equal(composerPageKey(key("PageUp"), inTall), false);
});

test("focusableScroller and inOtherScroller keep a focused or enclosing scroller's own arrows", () => {
  assert.equal(focusableScroller(element({ tabIndex: 0, scrollHeight: 500, clientHeight: 100 })), true);
  assert.equal(focusableScroller(element({ tabIndex: -1, scrollHeight: 500, clientHeight: 100 })), false);
  const body = {}, doc = { body, documentElement: {} };
  const transcript = element();
  const list = element({ style: { overflowY: "auto" } });
  list.ownerDocument = doc; list.parentElement = body;
  const row = element({ parent: list });
  row.ownerDocument = doc;
  const getStyle = (node) => node.style;
  assert.equal(inOtherScroller(row, transcript, getStyle), true);
  const inside = element({ parent: list });
  inside.ownerDocument = doc;
  const owning = element({ contains: [inside] });
  assert.equal(inOtherScroller(inside, owning, getStyle), false);
  const plain = element({ parent: body });
  plain.ownerDocument = doc;
  assert.equal(inOtherScroller(plain, transcript, getStyle), false);
});

test("openLayer: visible menus and dialogs count, idle toasts only for an approval digit, inert #root always", () => {
  const toastCard = { closest: (s) => (s.includes("Toast") ? {} : null), contains: () => false, checkVisibility: () => true };
  const hidden = { closest: () => null, contains: () => false, checkVisibility: () => false };
  const doc = (layers, { inert = false, digits = [] } = {}) => ({
    activeElement: null,
    getElementById: () => ({ inert }),
    querySelectorAll: (selector) => (selector.includes("digits") ? digits : layers),
  });
  assert.equal(openLayer(doc([])), false);
  assert.equal(openLayer(doc([], { inert: true })), true);
  assert.equal(openLayer(doc([hidden])), false);
  assert.equal(openLayer(doc([toastCard]), { skipIdleToasts: true }), false);
  assert.equal(openLayer(doc([toastCard]), { skipIdleToasts: false }), true);
  const card = { getAttribute: (name) => (name === "data-approval-card-digits" ? "3" : null) };
  assert.equal(approvalDigit("2", doc([], { digits: [card] })), true);
  assert.equal(approvalDigit("4", doc([], { digits: [card] })), false);
  assert.equal(approvalDigit("a", doc([], { digits: [card] })), false);
});

test("paneKeyAction: the cc43287c9 listener's branches", () => {
  const free = { name: "x" };
  assert.deepEqual(paneKeyAction(key("x", { defaultPrevented: true }), free), { type: "cancel" });
  assert.equal(paneKeyAction(key("Process", { isComposing: true }), { name: "Process" }), null);
  assert.deepEqual(paneKeyAction(key("x"), free), { type: "insert", char: "x" });
  assert.deepEqual(paneKeyAction(key("X", { shiftKey: true }), { name: "X" }), { type: "insert", char: "X" });
  assert.equal(paneKeyAction(key("x"), { ...free, keyOwner: true }), null);
  assert.equal(paneKeyAction(key("x"), { ...free, layer: true }), null);
  assert.equal(paneKeyAction(key("x"), { ...free, locked: true }), null);
  assert.equal(paneKeyAction(key("Enter"), { name: "Enter" }), null);
  assert.equal(paneKeyAction(key("Home"), { name: "Home" }), null);
  // Space presses a focused button; elsewhere it types.
  assert.equal(paneKeyAction(key(" "), { name: " ", buttonFocus: true }), null);
  assert.deepEqual(paneKeyAction(key(" "), { name: " " }), { type: "insert", char: " " });
  // Arrow and Page keys.
  assert.deepEqual(paneKeyAction(key("ArrowDown"), { name: "ArrowDown" }), { type: "scroll", key: "ArrowDown" });
  assert.deepEqual(paneKeyAction(key("ArrowDown", { altKey: true }), { name: "PageDown" }), { type: "scroll", key: "PageDown" });
  assert.equal(paneKeyAction(key("ArrowDown"), { name: "ArrowDown", scrollerFocus: true }), null);
  assert.equal(paneKeyAction(key("ArrowDown"), { name: "ArrowDown", otherScroller: true }), null);
  assert.equal(paneKeyAction(key("ArrowUp"), { name: "ArrowUp", keyOwner: true }), null);
  assert.deepEqual(paneKeyAction(key("PageDown"), { name: "PageDown", keyOwner: true, composerPage: true, otherScroller: true }), { type: "scroll", key: "PageDown" });
  // Tab from inside the transcript, not Shift+Tab, not on the landing page, not in an application.
  assert.deepEqual(paneKeyAction(key("Tab"), { name: "Tab", inTranscript: true }), { type: "tab" });
  assert.equal(paneKeyAction(key("Tab", { shiftKey: true }), { name: "Tab", inTranscript: true }), null);
  assert.equal(paneKeyAction(key("Tab"), { name: "Tab", inTranscript: false }), null);
  assert.equal(paneKeyAction(key("Tab"), { name: "Tab", inTranscript: true, landing: true }), null);
  assert.equal(paneKeyAction(key("Tab"), { name: "Tab", inTranscript: true, inApplication: true }), null);
  // Modifier chords never reach the pane (paneKeyName gives null).
  assert.equal(paneKeyAction(key("k", { metaKey: true }), { name: null }), null);
});

test("wiring: main.jsx listens on the document, the transcript eases key scrolls, the editor takes focusAndInsert", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const main = read("main.jsx"), scroll = read("use-transcript-scroll.js"), editor = read("source-composer-editor.jsx"), composer = read("source-composer.jsx");
  assert.match(main, /paneKeyAction\(event, paneKeyContext\(event, \{ doc: document, transcript: viewport/);
  assert.match(main, /document\.addEventListener\("keydown", paneKey\)/);
  assert.match(main, /composer\.focusAndInsert\(action\.char\)/);
  assert.match(main, /if \(!splitActiveRef\.current \|\| facts\.blocked\) return;/);
  assert.match(scroll, /keyScroll: \(name\) => controller\.current\?\.keyScroll\(name\) \?\? false/);
  assert.match(scroll, /const step = easeScrollStep\(top, keyTarget\)/);
  assert.match(scroll, /explicitIntent: userScrollPending \|\| dragActive \|\| keyIntent/);
  assert.match(editor, /input\.focusAndInsert=char=>/);
  assert.match(composer, /onFocusInsert=\{\(char\) =>/);
});
