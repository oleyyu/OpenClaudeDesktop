import test from "node:test";
import assert from "node:assert/strict";
import {
  FIND_LABELS, FIND_INPUT_DEBOUNCE_MS, centerScrollOffset, collectFindText, createFindInput, findInputKey, findMatches,
  findResult, findShortcut, findStatusText, foldCase, keepActiveIndex, nextActiveIndex,
} from "../src/transcript-find-model.mjs";

// A minimal DOM: element/text nodes linked through firstChild/nextSibling.
function link(parent, children) {
  let previous = null;
  for (const child of children) {
    child.parentNode = parent;
    if (previous) previous.nextSibling = child; else parent.firstChild = child;
    previous = child;
  }
}
const text = (data) => ({ nodeType: 3, data, nextSibling: null, parentNode: null });
function h(tag, attrs = {}, ...children) {
  const nodes = children.flat().map((child) => (typeof child === "string" ? text(child) : child));
  const element = {
    nodeType: 1, tagName: tag.toUpperCase(), attrs, firstChild: null, nextSibling: null, parentNode: null,
    hasAttribute: (name) => Object.hasOwn(attrs, name),
    getAttribute: (name) => (Object.hasOwn(attrs, name) ? attrs[name] : null),
    classList: { contains: (name) => String(attrs.class ?? "").split(/\s+/).includes(name) },
  };
  link(element, nodes);
  return element;
}
const matchedText = (match) => {
  if (match.startNode === match.endNode) return match.startNode.data.slice(match.startOffset, match.endOffset);
  let out = match.startNode.data.slice(match.startOffset);
  // Adjacent text nodes under inline parents, as in the fixtures below.
  return out + match.endNode.data.slice(0, match.endOffset);
};

test("omitted, aria-hidden, sr-only and hidden subtrees are not searched; data-find-included re-enters", () => {
  const root = h("div", {},
    h("p", {}, "alpha one"),
    h("h2", { "data-find-omitted": "", class: "sr-only select-none" }, "You said: alpha"),
    h("span", { "aria-hidden": "true" }, "alpha glyph"),
    h("span", { class: "source-sr-only" }, "alpha spoken"),
    h("div", { hidden: "" }, "alpha collapsed"),
    h("div", { "data-gutter": "" }, "alpha 12"),
    h("div", { "data-find-omitted": "" }, "skip alpha", h("span", { "data-find-included": "" }, "alpha kept")),
    h("p", {}, "ALPHA two"),
  );
  const matches = findMatches(root, "alpha");
  assert.deepEqual(matches.map(matchedText), ["alpha", "alpha", "ALPHA"]);
  assert.deepEqual(matches.map((match) => match.startNode.data), ["alpha one", "alpha kept", "ALPHA two"]);
  const { text: collected } = collectFindText(root);
  assert.doesNotMatch(collected, /You said|glyph|spoken|collapsed|12|skip/);
  // An exclude set (shared-18 data-find-provider-scope) is skipped as well.
  assert.equal(findMatches(root, "alpha", { exclude: new Set([root.firstChild]) }).length, 2);
});

test("case-insensitive counts: inline runs join, blocks never do", () => {
  const root = h("div", {},
    h("p", {}, "Apple and ", h("strong", {}, "APPLE"), " pie"),
    h("p", {}, "pineapple"),
    h("p", {}, "ap", h("em", {}, "ple"), " split inline"),
    h("p", {}, "ap"), h("p", {}, "ple"),
  );
  const matches = findMatches(root, "apple");
  assert.equal(matches.length, 4);
  assert.deepEqual(matches.map(matchedText), ["Apple", "APPLE", "apple", "apple"]);
  const spanning = matches[3];
  assert.notEqual(spanning.startNode, spanning.endNode, "a match may span inline nodes");
  assert.equal(findMatches(root, "APPLE").length, 4);
  // Non-overlapping, in document order.
  assert.equal(findMatches(h("p", {}, "aaaa"), "aa").length, 2);
});

test("cov4-03: icon glyphs and avatars are skipped without a run break (2.42304.0 shared-15 Ca)", () => {
  // shared-15 Ca: `if(Ye(i)||i.matches(ha))return;` (Ye = [data-cds="Icon"]:not(svg), ha = [data-cds="Avatar"]) —
  // no s = true, so no NUL: the text on both sides of an icon stays one run.
  const glyph = String.fromCodePoint(0xe0a1);
  const icon = () => h("span", { "aria-hidden": "true", "data-cds": "Icon" }, glyph);
  const root = h("p", {}, "See ", h("a", {}, h("span", {}, h("span", {}, icon()), "acme/widgets#42")), " now.");
  assert.equal(collectFindText(root).text, "\0See acme/widgets#42 now.");
  assert.deepEqual(findMatches(root, glyph), []);
  const across = findMatches(root, "See acme");
  assert.equal(across.length, 1);
  assert.equal(across[0].startNode.data, "See ");
  assert.equal(across[0].endNode.data, "acme/widgets#42");
  assert.equal(across[0].endOffset, 4);
  // An avatar (with or without aria-hidden) is skipped the same way; its text is never searched.
  const avatar = h("p", {}, "by ", h("span", { "data-cds": "Avatar" }, "AB"), "Ada");
  assert.equal(collectFindText(avatar).text, "\0by Ada");
  assert.equal(findMatches(avatar, "by Ada").length, 1);
  assert.deepEqual(findMatches(avatar, "AB"), []);
  // An inline <svg data-cds="Icon"> is not matched by Ye (`:not(svg)`), so the F10 aria-hidden rule still breaks the run …
  const svg = h("p", {}, "left ", h("svg", { "aria-hidden": "true", "data-cds": "Icon" }, "x"), "right");
  assert.equal(collectFindText(svg).text, "\0left \0right");
  // … as does any other aria-hidden / sr-only / hidden / gutter / omitted subtree (local spec F10).
  for (const attrs of [{ "aria-hidden": "true" }, { class: "sr-only" }, { hidden: "" }, { "data-gutter": "" }, { "data-find-omitted": "" }]) {
    const broken = h("p", {}, "left ", h("span", attrs, "x"), "right");
    assert.equal(collectFindText(broken).text, "\0left \0right", JSON.stringify(attrs));
    assert.equal(findMatches(broken, "left right").length, 0);
  }
});

test("foldCase keeps every UTF-16 index in place (shared-18 q)", () => {
  for (const sample of ["İstanbul", "ΣΑΣ", "Ünïcödé", "emoji 😀 Text", "ﬀ ligature"]) {
    const folded = foldCase(sample);
    assert.equal(folded.length, sample.length, sample);
  }
  assert.equal(foldCase("HeLLo ΣΑΣ"), "hello σασ");
  const root = h("p", {}, "x İstanbul İSTANBUL");
  assert.equal(findMatches(root, "istanbul").length, 0, "İ folds to itself, not to i");
  assert.equal(findMatches(root, "stanbul").length, 2);
});

test("active index: new query starts at the first match, steps wrap both ways", () => {
  assert.equal(nextActiveIndex({ mode: "new", total: 3 }), 0);
  assert.equal(nextActiveIndex({ mode: "new", total: 0 }), -1);
  assert.equal(nextActiveIndex({ index: 0, total: 3 }), 1);
  assert.equal(nextActiveIndex({ index: 2, total: 3 }), 0, "forward wraps to the first");
  assert.equal(nextActiveIndex({ index: 0, total: 3, forward: false }), 2, "back wraps to the last");
  assert.equal(nextActiveIndex({ index: -1, total: 3 }), 0);
  assert.equal(nextActiveIndex({ index: -1, total: 3, forward: false }), 2);
  assert.equal(nextActiveIndex({ index: 7, total: 3 }), 0, "a stale index is clamped before stepping");
  assert.equal(nextActiveIndex({ index: 1, total: 0 }), -1);
  assert.equal(nextActiveIndex({ index: 5, total: 3, mode: "keep" }), 2);
  assert.equal(nextActiveIndex({ index: -1, total: 3, mode: "keep" }), 0);
  assert.equal(nextActiveIndex({ index: 1, total: 3, mode: "reset" }), -1);
});

test("content updates keep the active match on the same text (Po/No), else clamp", () => {
  const second = h("p", {}, "beta later");
  const root = h("div", {}, h("p", {}, "beta first"), second);
  const before = findMatches(root, "beta");
  assert.equal(before.length, 2);
  // A new row above both matches: the active match keeps its text node.
  const grown = h("div", {}, h("p", {}, "beta new"), h("p", {}, "beta first"), second);
  const after = findMatches(grown, "beta");
  assert.equal(keepActiveIndex(before[1], after, 1), 2);
  // The active text is gone: clamp the old index.
  assert.equal(keepActiveIndex(before[1], findMatches(h("p", {}, "beta only"), "beta"), 1), 0);
  assert.equal(keepActiveIndex(undefined, after, 5), 2);
});

test("status: empty query is 0/0 with no text, no match reads 0/0, matches read current/total", () => {
  assert.deepEqual(findMatches(h("p", {}, "anything"), ""), []);
  assert.deepEqual(findResult("", 2, 9), { activeIndex: 0, total: 0 });
  assert.equal(findStatusText("", findResult("", -1, 0)), "");
  assert.equal(findStatusText("zz", findResult("zz", -1, 0)), "0/0");
  assert.equal(findStatusText("ab", findResult("ab", 0, 3)), "1/3");
  assert.equal(findStatusText("ab", findResult("ab", 2, 3)), "3/3");
  assert.deepEqual(FIND_LABELS, { input: "Find", placeholder: "Find…", previous: "Go to previous match", next: "Go to next match", close: "Close find bar" });
});

test("IME guard: no search mid-composition, the committed text searches; Enter and buttons wait", () => {
  const timers = [], searches = [];
  const input = createFindInput({
    search: (value) => searches.push(value),
    schedule: (callback, delay) => { timers.push({ callback, delay, live: true }); return timers.length - 1; },
    cancel: (id) => { if (timers[id]) timers[id].live = false; },
  });
  const flush = () => { for (const timer of timers) if (timer.live) { timer.live = false; timer.callback(); } };
  input.input("he");
  input.input("hel");
  assert.equal(timers.filter((timer) => timer.live).length, 1, "typing debounces");
  assert.equal(timers.at(-1).delay, FIND_INPUT_DEBOUNCE_MS);
  flush();
  assert.deepEqual(searches, ["hel"]);
  input.compositionStart();
  assert.equal(input.composing, true);
  assert.equal(input.canStep(), false, "buttons are ignored mid-composition");
  input.input("helに");
  input.input("hel日");
  assert.equal(timers.filter((timer) => timer.live).length, 0, "no search while composing");
  input.compositionEnd("hel日本");
  assert.equal(input.canStep(), true);
  flush();
  assert.deepEqual(searches, ["hel", "hel日本"]);
  assert.equal(findInputKey({ key: "Enter", isComposing: true }), null);
  assert.equal(findInputKey({ key: "Enter", nativeEvent: { isComposing: true } }), null);
  assert.equal(findInputKey({ key: "Enter" }), "next");
  assert.equal(findInputKey({ key: "Enter", shiftKey: true }), "prev");
  assert.equal(findInputKey({ key: "a" }), null);
  assert.equal(findShortcut({ key: "Escape", isComposing: true }, { open: true }), null);
  assert.equal(findShortcut({ key: "g", metaKey: true, isComposing: true }, { open: true }), null);
});

test("window keys follow ZB: ⌘F opens, Escape closes, ⌘G / ⇧⌘G / F3 step while open", () => {
  assert.equal(findShortcut({ key: "f", metaKey: true }), "open");
  assert.equal(findShortcut({ key: "F", metaKey: true }, { open: true }), "open", "⌘F on an open bar re-selects");
  assert.equal(findShortcut({ key: "f", metaKey: true, defaultPrevented: true }), null, "a pane-owned find wins");
  assert.equal(findShortcut({ key: "f", metaKey: true, shiftKey: true }), null, "⇧⌘F is the Files pane");
  assert.equal(findShortcut({ key: "f", metaKey: true, altKey: true }), null);
  assert.equal(findShortcut({ key: "f", ctrlKey: true }), null, "Ctrl+F is not the mac chord");
  assert.equal(findShortcut({ key: "f", ctrlKey: true }, { mac: false }), "open");
  assert.equal(findShortcut({ key: "g", metaKey: true }), null, "⌘G does nothing while closed");
  assert.equal(findShortcut({ key: "g", metaKey: true }, { open: true }), "next");
  assert.equal(findShortcut({ key: "G", metaKey: true, shiftKey: true }, { open: true }), "prev");
  assert.equal(findShortcut({ key: "F3" }, { open: true }), "next");
  assert.equal(findShortcut({ key: "F3", shiftKey: true }, { open: true }), "prev");
  assert.equal(findShortcut({ key: "F3", metaKey: true }, { open: true }), null);
  assert.equal(findShortcut({ key: "g", metaKey: true, altKey: true }, { open: true }), null);
  assert.equal(findShortcut({ key: "Escape" }, { open: true }), "close");
  assert.equal(findShortcut({ key: "Escape" }), null);
  assert.equal(findShortcut({ key: "Escape", defaultPrevented: true }, { open: true }), null);
});

test("reveal offset (shared-18 Vo): none while visible, otherwise centre in the band", () => {
  const bounds = { top: 100, bottom: 500 };
  assert.equal(centerScrollOffset({ top: 200, bottom: 220, height: 20 }, bounds), null);
  assert.equal(centerScrollOffset({ top: 490, bottom: 510, height: 20 }, bounds), null, "partly visible");
  assert.equal(centerScrollOffset({ top: 900, bottom: 920, height: 20 }, bounds), 610);
  assert.equal(centerScrollOffset({ top: -300, bottom: -280, height: 20 }, bounds), -590);
  assert.equal(centerScrollOffset({ top: 450, bottom: 470, height: 20 }, bounds, 440), 190, "a band cut by the bottom limit");
});
