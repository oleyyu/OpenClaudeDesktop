import test from "node:test";
import assert from "node:assert/strict";
import { isComposingEvent, keyKind, escapeAction, enterAction, submitPriority, windowEscapeAction, escapeExemptTarget, emptyArrowUpDequeues, createDoubleEscape, strayEnterSwallowed } from "../src/composer-keys-model.mjs";

const key = (overrides) => ({ key: "Enter", shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false, isComposing: false, keyCode: 13, ...overrides });

test("IME classification: isComposing, keyCode 229 and key 'Process'", () => {
  assert.equal(isComposingEvent(key({ isComposing: true })), true);
  assert.equal(isComposingEvent(key({ keyCode: 229 })), true);
  assert.equal(isComposingEvent(key({ key: "Process" })), true);
  assert.equal(isComposingEvent(key({ nativeEvent: { isComposing: true } })), true);
  assert.equal(keyKind(key({ key: "Process" })), "ime");
  assert.equal(keyKind(key({ key: "Meta", metaKey: true })), "modifier");
  assert.equal(keyKind(key({ metaKey: true })), "shortcut");
  assert.equal(keyKind(key()), "text");
});

test("Enter: newline on Shift/Alt, ignored on repeat/IME/Cmd while composing, submit lanes", () => {
  assert.equal(enterAction({ event: key({ shiftKey: true }) }), "newline");
  assert.equal(enterAction({ event: key({ altKey: true }) }), "newline");
  assert.equal(enterAction({ event: key({ repeat: true }) }), "ignore");
  assert.equal(enterAction({ event: key({ isComposing: true }) }), "ignore");
  assert.equal(enterAction({ event: key({ keyCode: 229 }) }), "ignore");
  assert.equal(enterAction({ event: key({ metaKey: true, isComposing: true }) }), "ignore");
  assert.equal(enterAction({ event: key({ metaKey: true }) }), "submit-later");
  assert.equal(enterAction({ event: key() }), "submit");
  assert.equal(enterAction({ event: key(), popupOwnsEnter: true }), "popup");
  assert.equal(enterAction({ event: key({ key: "a" }) }), "none");
  assert.equal(submitPriority("submit", true), "next");
  assert.equal(submitPriority("submit-later", true), "later");
  assert.equal(submitPriority("submit-later", false), undefined);
});

// R05: c099c328d :11081-11088 Bi (idle → {stayOnDraft: e && zi()}), cc43287c9 :28620 stayOnDraftHint (Home draft only).
test("Cmd+Enter on the idle Home draft is 'Send and stay here'; Enter and the running lanes are unchanged", () => {
  assert.equal(submitPriority("submit-later", false, { stayOnDraft: true }), "stay");
  assert.equal(submitPriority("submit", false, { stayOnDraft: true }), undefined, "plain Enter still sends and navigates");
  assert.equal(submitPriority("submit-later", false, { stayOnDraft: false }), undefined, "an open session has no stay lane");
  assert.equal(submitPriority("submit-later", true, { stayOnDraft: true }), "later", "while a turn runs ⌘⏎ queues");
  assert.equal(submitPriority("submit", true, { stayOnDraft: true }), "next");
});

test("Escape: swallowed during composition, stops a busy turn once, claimed or interrupting keeps the key", () => {
  const escape = (overrides) => key({ key: "Escape", keyCode: 27, ...overrides });
  assert.equal(escapeAction({ event: escape({ isComposing: true }), running: true }), "swallow");
  assert.equal(escapeAction({ event: escape(), running: true }), "stop");
  assert.equal(escapeAction({ event: escape(), running: true, stopLatched: true }), "none");
  assert.equal(escapeAction({ event: escape(), running: true, interrupting: true }), "none");
  assert.equal(escapeAction({ event: escape(), running: true, escapeClaimed: true }), "none");
  assert.equal(escapeAction({ event: escape(), running: true, popupOpen: true }), "close");
  assert.equal(escapeAction({ event: escape({ defaultPrevented: true }), running: true }), "none");
  assert.equal(escapeAction({ event: escape(), running: false }), "none");
});

// Fidelity F05: the window Escape listener (c099c328d-CbkcmYSW.js:10129-10150) stops a busy turn from any target
// once; claimed, composing, canvas/[role=application] and latched events are left alone.
test("window Escape: stop for a busy, unclaimed Escape; none for claimed, composing, canvas, idle or latched", () => {
  const busy = { key: "Escape", running: true };
  assert.equal(windowEscapeAction(busy), "stop");
  assert.equal(windowEscapeAction({ ...busy, defaultPrevented: true }), "none");
  assert.equal(windowEscapeAction({ ...busy, isComposing: true }), "none");
  assert.equal(windowEscapeAction({ ...busy, keyCode: 229 }), "none");
  assert.equal(windowEscapeAction({ ...busy, targetIsCanvas: true }), "none");
  assert.equal(windowEscapeAction({ ...busy, overlayOpen: true }), "none", "an open menu, dialog or Settings claims Escape");
  assert.equal(windowEscapeAction({ ...busy, latched: true }), "none", "the stop is sent once");
  assert.equal(windowEscapeAction({ ...busy, interrupting: true }), "none");
  assert.equal(windowEscapeAction({ ...busy, panelActive: false }), "none");
  assert.equal(windowEscapeAction({ key: "Escape", running: false }), "none");
  assert.equal(windowEscapeAction({ ...busy, key: "Enter" }), "none");
  const node = (match) => ({ closest: (selector) => (selector === 'canvas, [role="application"]' && match ? {} : null) });
  assert.equal(escapeExemptTarget(node(true)), true); assert.equal(escapeExemptTarget(node(false)), false); assert.equal(escapeExemptTarget(null), false);
});

// c099c328d :11162-11188 ya: plain ArrowUp in an empty editor without a popup tries the dequeue first.
test("empty ArrowUp dequeues only unmodified, not composing, empty and without a popup", () => {
  const up = key({ key: "ArrowUp", keyCode: 38 });
  assert.equal(emptyArrowUpDequeues({ event: up, empty: true }), true);
  assert.equal(emptyArrowUpDequeues({ event: up, empty: false }), false);
  assert.equal(emptyArrowUpDequeues({ event: up, empty: true, popupOpen: true }), false);
  for (const modifier of ["metaKey", "ctrlKey", "altKey", "shiftKey"]) assert.equal(emptyArrowUpDequeues({ event: { ...up, [modifier]: true }, empty: true }), false, modifier);
  assert.equal(emptyArrowUpDequeues({ event: { ...up, isComposing: true }, empty: true }), false);
  assert.equal(emptyArrowUpDequeues({ event: key({ key: "ArrowDown" }), empty: true }), false);
});

test("Esc Esc within 500 ms opens Rewind; anything else between, a claimed or modified Escape, or a slow second press does not", () => {
  let clock = 0;
  const tracker = createDoubleEscape({ now: () => clock });
  const esc = (extra = {}) => tracker.press({ key: "Escape", ...extra });
  assert.equal(esc(), false);
  clock = 400; assert.equal(esc(), true, "the second plain Escape inside the window");
  clock = 500; assert.equal(esc(), false, "the pair starts over after it fires");
  clock = 1100; assert.equal(esc(), false, "600 ms later is a new first press");
  clock = 1200; assert.equal(esc({ claimed: true }), false, "a menu, dialog or busy composer claims it and resets");
  clock = 1300; assert.equal(esc(), false);
  clock = 1350; assert.equal(esc({ shiftKey: true }), false);
  clock = 1400; assert.equal(esc(), false);
  clock = 1450; assert.equal(esc({ targetIsCanvas: true }), false, "canvas / [role=application] keep Escape");
  clock = 1500; esc(); clock = 1550; assert.equal(esc({ repeat: true }), false, "a held key is not a double press");
  clock = 2000; esc(); tracker.reset(); clock = 2100; assert.equal(esc(), false, "a stop resets the count");
  clock = 2200; assert.equal(esc(), true);
});

// R2 composer-focus-yield: 2.42304.0 c227f4d5e OP keydown — `(e.repeat || Date.now() < Xr.current) && (e.metaKey ||
// e.ctrlKey || zs())` swallows Enter (not Shift/Alt) for rP = 500ms after ignoreStrayEnter(); Xr starts at -Infinity.
test("strayEnterSwallowed: 0 and 499ms into the rP window swallow, 500ms passes; Shift/Alt pass; a repeat always swallows", () => {
  const set = 1_000, until = set + 500;
  assert.equal(strayEnterSwallowed({ event: key(), until, now: set }), true, "0ms");
  assert.equal(strayEnterSwallowed({ event: key(), until, now: set + 499 }), true, "499ms");
  assert.equal(strayEnterSwallowed({ event: key(), until, now: set + 500 }), false, "500ms");
  assert.equal(strayEnterSwallowed({ event: key({ metaKey: true }), until, now: set + 10 }), true, "Cmd+Enter in the window");
  assert.equal(strayEnterSwallowed({ event: key({ ctrlKey: true }), until, now: set + 10 }), true, "Ctrl+Enter in the window");
  assert.equal(strayEnterSwallowed({ event: key({ shiftKey: true }), until, now: set }), false, "Shift+Enter is a newline");
  assert.equal(strayEnterSwallowed({ event: key({ altKey: true }), until, now: set }), false, "Alt+Enter is a newline");
  assert.equal(strayEnterSwallowed({ event: key({ altKey: true, metaKey: true }), until, now: set }), false, "Cmd+Alt+Enter (fork) is never swallowed here");
  assert.equal(strayEnterSwallowed({ event: key({ repeat: true }), now: 5 }), true, "a key repeat with no window set");
  assert.equal(strayEnterSwallowed({ event: key({ repeat: true, shiftKey: true }), now: 5 }), false);
  assert.equal(strayEnterSwallowed({ event: key(), now: 5 }), false, "Xr = -Infinity: no window until ignoreStrayEnter()");
  assert.equal(strayEnterSwallowed({ event: key({ key: "a" }), until, now: set }), false);
  // zs() false (Cmd+Enter sends) would leave a plain Enter alone; the desktop app always has it on.
  assert.equal(strayEnterSwallowed({ event: key(), until, now: set, plainEnterSends: false }), false);
  assert.equal(strayEnterSwallowed({ event: key({ metaKey: true }), until, now: set, plainEnterSends: false }), true);
});
