import test from "node:test";
import assert from "node:assert/strict";
import { effectiveView, showsThinking, isTranscriptView, withSessionView, normalizeSessionViews, readSessionViews, writeSessionViews, transcriptViewMenu, SESSION_VIEW_LIMIT, nextTranscriptView } from "../src/transcript-view-model.mjs";

test("effective view follows the session, then the default, and Thinking falls back without reasoning", () => {
  assert.equal(effectiveView(undefined, "normal", { hasThinking: true }), "normal");
  assert.equal(effectiveView(undefined, "thinking", { hasThinking: true }), "thinking");
  assert.equal(effectiveView(undefined, "thinking", { hasThinking: false }), "normal");
  assert.equal(effectiveView("verbose", "normal", { hasThinking: false }), "verbose");
  assert.equal(effectiveView("thinking", "verbose", { hasThinking: false }), "normal");
  assert.equal(effectiveView("bogus", "bogus"), "normal");
  assert.equal(showsThinking("thinking"), true); assert.equal(showsThinking("verbose"), true); assert.equal(showsThinking("normal"), false);
  assert.equal(isTranscriptView("verbose"), true); assert.equal(isTranscriptView("all"), false);
});
test("per-session map is insertion ordered, drops the default, and caps at 100 dropping the oldest", () => {
  let map = {};
  map = withSessionView(map, "a", "verbose", "normal");
  map = withSessionView(map, "b", "thinking", "normal");
  assert.deepEqual(Object.keys(map), ["a", "b"]);
  map = withSessionView(map, "a", "thinking", "normal");
  assert.deepEqual(Object.keys(map), ["b", "a"], "re-set moves the session to newest");
  map = withSessionView(map, "b", "normal", "normal");
  assert.deepEqual(map, { a: "thinking" }, "choosing the current default removes the entry");
  map = withSessionView(map, "a", undefined, "normal");
  assert.deepEqual(map, {});
  for (let index = 0; index < SESSION_VIEW_LIMIT; index += 1) map = withSessionView(map, `s${index}`, "verbose", "normal");
  assert.equal(Object.keys(map).length, 100);
  map = withSessionView(map, "newest", "verbose", "normal");
  assert.equal(Object.keys(map).length, 100);
  assert.equal(map.s0, undefined, "the oldest entry is dropped"); assert.equal(map.s1, "verbose"); assert.equal(map.newest, "verbose");
  assert.deepEqual(Object.keys(map).at(-1), "newest");
  assert.deepEqual(normalizeSessionViews({ ok: "verbose", bad: "x", "": "verbose", n: 3 }), { ok: "verbose" });
  assert.deepEqual(normalizeSessionViews("nope"), {});
});
test("storage round trip tolerates corrupt data and removes the key when empty", () => {
  const store = new Map();
  const storage = { getItem: (key) => store.has(key) ? store.get(key) : null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
  assert.deepEqual(readSessionViews(storage), {});
  storage.setItem("code-desktop-transcript-view-by-session", "{not json");
  assert.deepEqual(readSessionViews(storage), {});
  assert.equal(writeSessionViews(storage, { a: "verbose" }), true);
  assert.deepEqual(readSessionViews(storage), { a: "verbose" });
  writeSessionViews(storage, {});
  assert.equal(store.has("code-desktop-transcript-view-by-session"), false);
  assert.equal(writeSessionViews({ setItem() { throw new Error("quota"); }, removeItem() {} }, { a: "verbose" }), false);
});
test("session menu rows: Thinking only with reasoning, make-default only when the view differs and did not fall back", () => {
  const none = transcriptViewMenu({ sessionView: undefined, defaultView: "normal", hasThinking: false });
  assert.deepEqual(none.items.map((row) => [row.label, row.checked]), [["Normal", true], ["Verbose", false]]);
  assert.equal(none.makeDefault, null);
  const withThinking = transcriptViewMenu({ sessionView: "verbose", defaultView: "normal", hasThinking: true });
  assert.deepEqual(withThinking.items.map((row) => row.label), ["Normal", "Thinking", "Verbose"]);
  assert.equal(withThinking.items[2].checked, true);
  assert.deepEqual(withThinking.makeDefault, { view: "verbose", label: "Make Verbose the default" });
  assert.equal(transcriptViewMenu({ sessionView: "verbose", defaultView: "verbose", hasThinking: false }).makeDefault, null);
  const fell = transcriptViewMenu({ sessionView: "thinking", defaultView: "verbose", hasThinking: false });
  assert.equal(fell.current, "normal"); assert.equal(fell.makeDefault, null, "a fallen-back view offers no make-default row");
  assert.equal(transcriptViewMenu({ sessionView: undefined, defaultView: "thinking", hasThinking: true }).items[1].checked, true);
});
test("Ctrl+O cycles qa (normal, thinking, verbose) filtered by availability, from the effective view", () => {
  assert.equal(nextTranscriptView("normal", { hasThinking: true }), "thinking");
  assert.equal(nextTranscriptView("thinking", { hasThinking: true }), "verbose");
  assert.equal(nextTranscriptView("verbose", { hasThinking: true }), "normal");
  assert.equal(nextTranscriptView("normal", { hasThinking: false }), "verbose", "Thinking is skipped without reasoning");
  assert.equal(nextTranscriptView("verbose", { hasThinking: false }), "normal");
  assert.equal(nextTranscriptView("thinking", { hasThinking: false }), "verbose", "a fallen-back Thinking reads as Normal (Xa)");
  assert.equal(nextTranscriptView(undefined, { hasThinking: true }), "thinking");
  assert.equal(nextTranscriptView("bogus"), "verbose");
});
