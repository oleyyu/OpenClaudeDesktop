import test from "node:test";
import assert from "node:assert/strict";
import { isUserTextCollapsible, userSegmentsTextLength, userCollapseState, USER_COLLAPSE_LIMIT } from "../src/user-collapse-model.mjs";
import { parseOrdinaryUserSegments } from "../src/user-segments-model.mjs";

test("LQ boundary: 1200 drawn characters stay open, 1201 collapse", () => {
  assert.equal(USER_COLLAPSE_LIMIT, 1200);
  assert.equal(isUserTextCollapsible(parseOrdinaryUserSegments("x".repeat(1200)).segments), false);
  assert.equal(isUserTextCollapsible(parseOrdinaryUserSegments("x".repeat(1201)).segments), true);
  assert.equal(isUserTextCollapsible([]), false);
  assert.equal(isUserTextCollapsible(undefined), false);
});

test("length sums trimmed text runs and fence bodies only, matching the drawn segments", () => {
  const body = "y".repeat(600);
  const text = "  " + "x".repeat(600) + "\n```js\n" + body + "\n```\n  ";
  const segments = parseOrdinaryUserSegments(text).segments;
  assert.equal(userSegmentsTextLength(segments), 1200, "whitespace around runs and fence delimiters do not count");
  assert.equal(isUserTextCollapsible(segments), false);
  const longer = parseOrdinaryUserSegments(text.replace("y", "yy")).segments;
  assert.equal(isUserTextCollapsible(longer), true);
  assert.equal(userSegmentsTextLength([{ kind: "list", text: "z".repeat(5000) }]), 0, "unknown kinds are ignored");
});

test("presentation state: collapsed bodies are non-interactive until expanded, toggle text flips", () => {
  assert.deepEqual(userCollapseState({ collapsible: false, expanded: false }),
    { collapsible: false, collapsed: false, nonInteractive: false, showToggle: false, toggleLabel: null });
  assert.deepEqual(userCollapseState({ collapsible: true, expanded: false }),
    { collapsible: true, collapsed: true, nonInteractive: true, showToggle: true, toggleLabel: "Show more" });
  assert.deepEqual(userCollapseState({ collapsible: true, expanded: true }),
    { collapsible: true, collapsed: false, nonInteractive: false, showToggle: true, toggleLabel: "Show less" });
});
