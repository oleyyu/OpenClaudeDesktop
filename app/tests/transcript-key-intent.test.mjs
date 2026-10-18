import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { useTranscriptScroll } from "../src/use-transcript-scroll.js";
import { keyScrollIntentMs } from "../src/generated/code-current/tab-focus-key-scroll.mjs";

// R3-topbar TT-05 (transcript-02): the main transcript's follow controller, driven through the real hook with
// controlled DOM, scroll and key events. 2.42304.0 c7f8992b4 T: a classified "up" key only records the intent
// (`n === "up" && (I.current = performance.now())`); the upward scroll within `re` = 1e3 ms is the reader's and lets go
// (`ae = u - I.current < re` → Y(!1)), even while the layout changes. Pinning again clears it (Y(!0) resets I).

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn, options) {
    const capture = typeof options === "boolean" ? options : !!options?.capture;
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), { fn, capture }]);
    options?.signal?.addEventListener?.("abort", () => this.removeEventListener(type, fn, options));
  }
  removeEventListener(type, fn, options) {
    const capture = typeof options === "boolean" ? options : !!options?.capture;
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => !(entry.fn === fn && entry.capture === capture)));
  }
  fire(type, event = {}) { for (const { fn } of [...(this.listeners.get(type) ?? [])]) fn(event); }
  count(type) { return (this.listeners.get(type) ?? []).length; }
}

let clock = 0, frames = [], resizeCallbacks = [], realNow, saved;
beforeEach(() => {
  clock = 100_000; frames = []; resizeCallbacks = [];
  realNow = performance.now;
  performance.now = () => clock;
  saved = { ResizeObserver: globalThis.ResizeObserver, IntersectionObserver: globalThis.IntersectionObserver,
    requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  globalThis.ResizeObserver = class { constructor(callback) { resizeCallbacks.push(callback); } observe() {} disconnect() {} };
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  globalThis.cancelAnimationFrame = (id) => { if (frames[id - 1]) frames[id - 1] = null; };
});
afterEach(() => {
  performance.now = realNow;
  for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; }
});

function element(editable = false) {
  return { nodeType: 1, closest: (selector) => (editable && /textarea/.test(selector) ? {} : null) };
}

function dom() {
  const view = new Target();
  Object.assign(view, { AbortController, setTimeout, clearTimeout, getComputedStyle: () => ({ scrollPaddingTop: "0px", overflowY: "visible" }) });
  const doc = new Target();
  Object.assign(doc, { defaultView: view, body: element(), activeElement: null });
  const inside = new Set();
  const viewport = new Target();
  let top = 0;
  Object.assign(viewport, { ownerDocument: doc, isConnected: true, clientWidth: 600, clientHeight: 500, scrollHeight: 2000,
    getBoundingClientRect: () => ({ top: 0, bottom: 500, left: 0, right: 600, width: 600, height: 500 }),
    contains: (node) => node === viewport || inside.has(node), closest: () => null,
    scrollTo({ top: next }) { this.scrollTop = next; } });
  Object.defineProperty(viewport, "scrollTop", { get: () => top,
    set: (value) => { top = Math.max(0, Math.min(value, viewport.scrollHeight - viewport.clientHeight)); } });
  const content = new Target();
  content.querySelectorAll = () => [];
  const row = element();
  inside.add(row);
  return { view, doc, viewport, content, end: {}, row };
}

// Hook dispatcher (as tests/sessions-page-current.test.mjs, D21): render, attach the refs, run the layout effects, and
// re-render while state changes, as React's commit loop would.
function mount(sessionKey) {
  const page = dom();
  let cursor = 0, dirty = false, out;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [cells[i].value, (value) => { const next = typeof value === "function" ? value(cells[i].value) : value; if (!Object.is(next, cells[i].value)) { cells[i].value = next; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useLayoutEffect(fn, deps) { const i = cursor++; if (!cells[i] || !deps || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  hooks.useEffect = hooks.useLayoutEffect;
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const render = () => { cursor = 0; const old = internal.H; internal.H = hooks; try { out = useTranscriptScroll({ sessionKey, ready: true }); } finally { internal.H = old; } };
  const settle = () => {
    for (let round = 0; round < 50; round++) {
      while (effects.length) effects.shift()();
      if (!dirty) return;
      dirty = false; render();
    }
    throw Error("did not settle");
  };
  render();
  out.viewportRef.current = page.viewport; out.contentRef.current = page.content; out.endRef.current = page.end;
  settle();
  const runFrames = () => { while (frames.some(Boolean)) { const queue = frames; frames = []; for (const callback of queue) callback?.(); } settle(); };
  return {
    ...page, settle, runFrames,
    get following() { return out.following; },
    key(key, options = {}) { page.doc.fire("keydown", { key, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, target: page.row, ...options }); settle(); },
    // The browser's scroll: a new scrollTop (and, for a layout change, a new scrollHeight), then the scroll event.
    scroll(top, { height } = {}) { if (height !== undefined) page.viewport.scrollHeight = height; page.viewport.scrollTop = top; page.viewport.fire("scroll"); settle(); },
    // Content grew without a scroll: the ResizeObserver schedules a flush for the next frame.
    grow(height) { page.viewport.scrollHeight = height; for (const callback of resizeCallbacks) callback([]); runFrames(); },
  };
}

test("an up key does not let go at keydown; the upward scroll inside the intent window does, even during a layout change", () => {
  const t = mount("code:tt05-a");
  assert.equal(t.following, true);
  assert.equal(t.viewport.scrollTop, 1500, "mounted at the tail");
  for (const key of ["ArrowUp", "PageUp", "Home"]) {
    t.key(key);
    assert.equal(t.following, true, `${key}: still following after the keydown`);
  }
  t.key(" ", { shiftKey: true });
  assert.equal(t.following, true, "Shift+Space: still following after the keydown");
  // Streaming output grew the transcript in the same frame as the reader's arrow scroll moved it up 100px.
  clock += 120;
  t.scroll(1400, { height: 2100 });
  assert.equal(t.following, false, "the reader's upward scroll inside re lets go");
  t.grow(2300);
  assert.equal(t.viewport.scrollTop, 1400, "released: new output no longer pulls the transcript down");
});

test("an up key that scrolls nothing keeps following, and an expired intent no longer outvotes a layout clamp", () => {
  const t = mount("code:tt05-b");
  t.key("ArrowUp");
  t.grow(2200);
  assert.equal(t.following, true);
  assert.equal(t.viewport.scrollTop, 1700, "new output still lands at the tail");
  // A transient shrink-and-regrow clamp (no wheel, key or pointer) one window after the key is not the reader's.
  t.key("ArrowUp");
  clock += keyScrollIntentMs;
  t.scroll(1694, { height: 2300 });
  assert.equal(t.following, true, "an intent older than re does not turn a clamp into the reader's scroll");
  t.runFrames();
  assert.equal(t.viewport.scrollTop, 1800, "the next frame returns to the tail");
});

test("Shift+Tab records the same timed intent from anywhere; pinning again at the tail clears it", () => {
  const t = mount("code:tt05-c");
  t.key("Tab", { shiftKey: true, target: element(true) });
  assert.equal(t.following, true, "Shift+Tab never lets go at keydown");
  // A frame passes before the browser's focus scroll arrives: the intent outlives it (re, not the next flush).
  t.grow(2000);
  clock += 300;
  t.scroll(1300, { height: 2050 });
  assert.equal(t.following, false, "the focus scroll upward inside re is the reader's");
  // Back to the tail by hand: following again, and the old intent is gone (Y(!0) resets I).
  t.scroll(1550);
  assert.equal(t.following, true);
  clock += 10;
  t.scroll(1544, { height: 2150 });
  assert.equal(t.following, true, "a clamp right after re-pinning is not read as the reader's");
});

test("editable targets and modified keys record no up intent; Enter on a row still releases at keydown", () => {
  const t = mount("code:tt05-d");
  t.key("ArrowUp", { target: t.row, metaKey: true });
  t.key("ArrowUp", { target: element(true) });
  clock += 50;
  t.scroll(1490, { height: 2010 });
  assert.equal(t.following, true, "no up intent: a layout-changing upward movement is a clamp");
  const row = { nodeType: 1, closest: (selector) => (/data-transcript-item-id/.test(selector) && !/keeps-pin/.test(selector) ? {} : null) };
  t.viewport.contains = ((contains) => (node) => node === row || contains(node))(t.viewport.contains);
  t.key("Enter", { target: row });
  assert.equal(t.following, false, "Tve row activation releases before its click expands content");
});
