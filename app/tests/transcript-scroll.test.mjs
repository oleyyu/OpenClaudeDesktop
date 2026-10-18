import test from "node:test";
import assert from "node:assert/strict";
import {
  createTranscriptCache,
  identityMatches,
  isUpwardWheel,
  isUpNavigationKey,
  navigationDirection,
  isUserScrollMovement,
  transcriptKeyIntent,
  GLIDE_MS,
  glideDeadline,
  jumpBehavior,
  prefersReducedMotion,
} from "../src/use-transcript-scroll.js";

test("returning sessions keep reading snapshots, but stale visits cannot overwrite them", () => {
  const cache = createTranscriptCache();
  const first = cache.open("A");
  const reading = {
    following: false,
    anchor: { itemId: "row-12", offset: -8 },
  };
  assert.equal(cache.save("A", first.generation, reading), true);
  cache.open("B");
  const second = cache.open("A");
  assert.deepEqual(second.snapshot, reading);
  const newer = { following: false, anchor: { itemId: "row-18", offset: -3 } };
  assert.equal(cache.save("A", second.generation, newer), true);
  assert.equal(cache.save("A", first.generation, { following: true }), false);
  assert.deepEqual(cache.open("A").snapshot, newer);
});

test("cache keeps 50 recent sessions and revisiting refreshes recency", () => {
  const cache = createTranscriptCache();
  for (let n = 0; n < 50; n++) {
    const handle = cache.open(`session-${n}`);
    cache.save(`session-${n}`, handle.generation, { index: n });
  }
  cache.open("session-0");
  cache.open("session-50");
  assert.equal(cache.size, 50);
  assert.deepEqual(cache.open("session-0").snapshot, { index: 0 });
  assert.equal(cache.open("session-1").snapshot, undefined);
  assert.equal(cache.size, 50);
});

test("an evicted handle cannot resurrect a snapshot or evict a current session", () => {
  const cache = createTranscriptCache(2);
  const first = cache.open("A");
  cache.open("B");
  cache.open("C");
  assert.equal(cache.save("A", first.generation, { following: false }), false);
  assert.equal(cache.size, 2);
  assert.equal(cache.open("A").snapshot, undefined);
});

test("snap guards reject old A after A to B to A, even though the session ID matches", () => {
  const old = { sessionKey: "code:A", generation: 10 };
  const expected = {
    expectedSessionKey: old.sessionKey,
    expectedGeneration: old.generation,
  };
  assert.equal(identityMatches(old, expected), true);
  assert.equal(
    identityMatches({ sessionKey: "code:B", generation: 11 }, expected),
    false,
  );
  assert.equal(
    identityMatches({ sessionKey: "code:A", generation: 12 }, expected),
    false,
  );
});

test("horizontal code scrolling and pinch/zoom gestures do not release vertical following", () => {
  assert.equal(isUpwardWheel({ deltaY: -20, deltaX: 0, ctrlKey: false }), true);
  assert.equal(
    isUpwardWheel({ deltaY: -20, deltaX: 30, ctrlKey: false }),
    false,
  );
  assert.equal(isUpwardWheel({ deltaY: -20, deltaX: 0, ctrlKey: true }), false);
  assert.equal(isUpwardWheel({ deltaY: 20, deltaX: 0, ctrlKey: false }), false);
});

test("only backward navigation keys signal reading upward", () => {
  for (const key of ["ArrowUp", "PageUp", "Home"])
    assert.equal(isUpNavigationKey({ key }), true);
  assert.equal(isUpNavigationKey({ key: " ", shiftKey: true }), true);
  // c7f8992b4 C (the classifier) reads Shift+Tab as "up"; only its consumer stops releasing on it (TT-05 below).
  assert.equal(isUpNavigationKey({ key: "Tab", shiftKey: true }), true);
  for (const modifier of ["ctrlKey", "altKey", "metaKey"])
    assert.equal(isUpNavigationKey({ key: "Home", [modifier]: true }), false);
  for (const key of ["Enter", "ArrowDown", "End", "a", " "])
    assert.equal(isUpNavigationKey({ key }), false);
});

test("downward keys also carry user intent during simultaneous content resizing", () => {
  for (const key of ["ArrowDown", "PageDown", "End", " "])
    assert.equal(navigationDirection({ key }), "down");
  assert.equal(navigationDirection({ key: "Tab" }), "none");
  assert.equal(navigationDirection({ key: "End", metaKey: true }), "none");
});

test("Space activates historical rows before generic downward navigation, preserving editable/keep-pin exclusions", () => {
  const row = {
    inViewport: true,
    inItem: true,
    editable: false,
    keepsPin: false,
  };
  for (const key of [" ", "Enter"])
    assert.equal(transcriptKeyIntent({ key }, row), "release");
  assert.equal(
    transcriptKeyIntent({ key: " " }, { ...row, inItem: false }),
    "down",
  );
  assert.equal(
    transcriptKeyIntent({ key: " " }, { ...row, keepsPin: true }),
    "down",
  );
  assert.equal(
    transcriptKeyIntent({ key: "Enter" }, { ...row, keepsPin: true }),
    "none",
  );
  assert.equal(
    transcriptKeyIntent({ key: " " }, { ...row, editable: true }),
    "none",
  );
  assert.equal(
    transcriptKeyIntent({ key: "Enter" }, { ...row, inViewport: false }),
    "none",
  );
  // TT-05 (c7f8992b4 T: a classified "up" only records the intent): Shift+Tab, from anywhere, never releases at
  // keydown; it only marks the next upward scroll as the reader's. attachTabFocusRelease decides the release.
  assert.equal(
    transcriptKeyIntent(
      { key: "Tab", shiftKey: true },
      { editable: true, inViewport: false },
    ),
    "intent",
  );
  assert.equal(transcriptKeyIntent({ key: "Tab", shiftKey: true }, row), "intent");
  assert.equal(transcriptKeyIntent({ key: "Tab" }, row), "none");
  assert.equal(transcriptKeyIntent({ key: "Tab", shiftKey: true, metaKey: true }, row), "none");
  // The other up keys classify as "up"; since R3-topbar TT-05 that is the same intent-only handling (see below).
  assert.equal(transcriptKeyIntent({ key: "ArrowUp" }, { ...row, inItem: false }), "up");
});

test("TT-05: the transcript's keydown turns Shift+Tab and the up keys into a timed intent only, never release()", async () => {
  const fs = await import("node:fs");
  const source = fs.readFileSync(new URL("../src/use-transcript-scroll.js", import.meta.url), "utf8");
  const onKey = source.slice(source.indexOf("function onKey(event)"), source.indexOf("function onPointer(event)"));
  const branch = onKey.slice(onKey.indexOf('else if (intent === "up" || intent === "intent") {'), onKey.indexOf('} else if (intent === "down")'));
  assert.ok(branch.length > 0, "one branch handles up and intent");
  assert.match(branch, /upKeyAt = performance\.now\(\);/);
  assert.doesNotMatch(branch, /release\(\)/);
  assert.equal((onKey.match(/release\(\)/g) ?? []).length, 1, "only the row activation (Enter/Space) releases at keydown");
  assert.match(source, /import \{ keyScrollIntentMs \} from '\.\/generated\/code-current\/tab-focus-key-scroll\.mjs';/);
  assert.match(source, /explicitIntent: userScrollPending \|\| dragActive \|\| keyIntent \|\| upKeyIntent\(\),/);
  // The helper that decides the Tab release stays mounted on the viewport.
  assert.match(source, /attachTabFocusRelease\(viewport, \{ isPinned: \(\) => following, setPinned: value => \{ if \(!value\) release\(\); \} \}\)/);
});

test("during a layout change an upward movement is the user's only with a real intent", () => {
  // A transient shrink-and-regrow clamps scrollTop below a maximum that has
  // grown again (recorded: top 399 → 393 while the maximum went 399 → 460,
  // with no wheel, key or pointer input): following must stay pinned.
  const regrow = { delta: -6, top: 393, maximum: 460, layoutChanged: true, explicitIntent: false, programmatic: false };
  assert.equal(isUserScrollMovement(regrow), false);
  assert.equal(isUserScrollMovement({ ...regrow, delta: -120, top: 780, maximum: 1050 }), false);
  // A scrollbar drag (mousedown on the viewport: dragActive) or a wheel/key/touch still releases.
  assert.equal(
    isUserScrollMovement({
      delta: -120,
      top: 780,
      maximum: 1050,
      layoutChanged: true,
      explicitIntent: true,
      programmatic: false,
    }),
    true,
  );
  // Without a layout change any movement is the user's.
  assert.equal(isUserScrollMovement({ ...regrow, layoutChanged: false }), true);
  assert.equal(
    isUserScrollMovement({
      delta: 120,
      top: 700,
      maximum: 1050,
      layoutChanged: true,
      explicitIntent: false,
      programmatic: false,
    }),
    true,
  );
});

test("a reduced maximum clamp is preserved, while explicit drag and keyboard intent wins", () => {
  const clamp = {
    delta: -100,
    top: 800,
    maximum: 800,
    layoutChanged: true,
    explicitIntent: false,
    programmatic: false,
  };
  assert.equal(isUserScrollMovement(clamp), false);
  assert.equal(isUserScrollMovement({ ...clamp, explicitIntent: true }), true);
  assert.equal(isUserScrollMovement({ ...clamp, top: 650 }), false);
  assert.equal(isUserScrollMovement({ ...clamp, top: 650, explicitIntent: true }), true);
  assert.equal(
    isUserScrollMovement({ ...clamp, top: 650, explicitIntent: true, programmatic: true }),
    false,
  );
});

test("smooth-jump guard: glide scroll events never classify as user movement until a real intent arrives", () => {
  // scroll-follow-current.js:31 le = 1500 and :655-670: the chip's smooth
  // jump pins at once and guards its own scroll events for up to 1500ms.
  assert.equal(GLIDE_MS, 1500);
  assert.equal(glideDeadline(1000, 800), 2500);
  assert.equal(glideDeadline(1000, 2), 0, "already at the tail: no glide");
  const glide = { top: 400, maximum: 3000, layoutChanged: false, explicitIntent: false, programmatic: false, gliding: true };
  // Intermediate frames of the glide, including a content-growth clamp that
  // moves the viewport upward, keep following pinned.
  for (const delta of [180, 40, -60]) assert.equal(isUserScrollMovement({ ...glide, delta }), false, `delta ${delta}`);
  assert.equal(isUserScrollMovement({ ...glide, delta: -60, layoutChanged: true }), false);
  // A wheel, key or touch intent during the glide is the user's again.
  assert.equal(isUserScrollMovement({ ...glide, delta: -60, explicitIntent: true }), true);
  // Without a glide the same upward movement is user movement.
  assert.equal(isUserScrollMovement({ ...glide, delta: -60, gliding: false }), true);
});

test("the chip jumps smoothly unless reduced motion is requested; Send keeps the instant jump", () => {
  assert.equal(jumpBehavior("smooth", false), "smooth");
  assert.equal(jumpBehavior("smooth", true), "instant");
  assert.equal(jumpBehavior(undefined, false), "instant");
  assert.equal(jumpBehavior("instant", false), "instant");
  const view = (dataset, matches = false) => ({ document: { documentElement: { dataset } }, matchMedia: () => ({ matches }) });
  assert.equal(prefersReducedMotion(view({ reduceMotion: "true" })), true);
  assert.equal(prefersReducedMotion(view({ localMotion: "reduce" })), true);
  assert.equal(prefersReducedMotion(view({}, true)), true);
  assert.equal(prefersReducedMotion(view({})), false);
  assert.equal(prefersReducedMotion(null), false);
});
