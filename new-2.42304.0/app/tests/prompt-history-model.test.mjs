import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_PROMPT_HISTORY, promptHistoryStep, promptHistoryStatus, humanPrompts, isEmptyComposerText } from "../src/prompt-history-model.mjs";

const PROMPTS = ["first prompt", "second prompt"];
// A tiny driver: keeps the model state and the editor text like SourceComposer does.
function driver({ prompts = PROMPTS, resetKey = "code:t1", text = "" } = {}) {
  let state = INITIAL_PROMPT_HISTORY;
  const d = {
    text, prompts, resetKey,
    press(key, extra = {}) {
      const arrow = key === "ArrowUp" || key === "ArrowDown";
      const step = promptHistoryStep(state, { resetKey: d.resetKey, key, text: d.text, prompts: d.prompts,
        atStart: arrow, atEnd: arrow, ...extra });
      state = step.state;
      if (step.action === "recall" || step.action === "restore") d.text = step.text;
      return step;
    },
    get state() { return state; },
  };
  return d;
}

test("ArrowUp enters only from an empty editor and recalls the newest prompt first", () => {
  const d = driver({ text: "wip" });
  assert.equal(d.press("ArrowUp").action, "none");
  assert.equal(d.text, "wip");
  d.text = "";
  const step = d.press("ArrowUp");
  assert.equal(step.action, "recall");
  assert.equal(step.text, "second prompt");
  assert.deepEqual(step.nav, { index: 2, total: 2, hasDraft: false });
  assert.equal(promptHistoryStatus(step.nav), "History 2/2");
  // Paragraph-only documents count as empty (tiptap isEmpty / Rj).
  assert.equal(isEmptyComposerText("\n\n"), true);
  assert.equal(isEmptyComposerText(" "), false);
});

test("ArrowUp walks to the oldest entry and then swallows the key there", () => {
  const d = driver();
  d.press("ArrowUp");
  const older = d.press("ArrowUp");
  assert.equal(older.action, "recall");
  assert.equal(older.text, "first prompt");
  assert.deepEqual(older.nav, { index: 1, total: 2, hasDraft: false });
  const clamp = d.press("ArrowUp");
  assert.equal(clamp.action, "swallow");
  assert.equal(clamp.text, undefined);
  assert.deepEqual(clamp.nav, { index: 1, total: 2, hasDraft: false });
  assert.equal(d.text, "first prompt");
});

test("ArrowDown moves newer and past the newest entry restores the stashed draft", () => {
  const d = driver({ text: "\n" });
  d.press("ArrowUp");
  d.press("ArrowUp");
  const newer = d.press("ArrowDown");
  assert.equal(newer.action, "recall");
  assert.equal(newer.text, "second prompt");
  const restore = d.press("ArrowDown");
  assert.equal(restore.action, "restore");
  assert.equal(restore.text, "\n");
  assert.equal(restore.nav, null);
  assert.equal(restore.state.index, null);
  // Not navigating any more: ArrowDown is not ours.
  assert.equal(d.press("ArrowDown").action, "none");
});

test("hasDraft is false for an empty draft and follows a non-empty stash", () => {
  const d = driver();
  assert.equal(d.press("ArrowUp").nav.hasDraft, false);
  assert.equal(d.press("ArrowUp").nav.hasDraft, false);
  // Vj only enters from an empty editor, so a non-empty stash only exists in a carried state.
  const carried = { ...INITIAL_PROMPT_HISTORY, resetKey: "k", length: 2, index: 1, draft: "draft", injected: "second prompt", nav: { index: 2, total: 2, hasDraft: true } };
  const step = promptHistoryStep(carried, { resetKey: "k", key: "ArrowUp", atStart: true, text: "second prompt", prompts: PROMPTS });
  assert.deepEqual(step.nav, { index: 1, total: 2, hasDraft: true });
  assert.equal(promptHistoryStatus(step.nav), "History 1/2 ↓ to restore your draft");
  const down = promptHistoryStep(step.state, { resetKey: "k", key: "ArrowDown", atEnd: true, text: "first prompt", prompts: PROMPTS });
  const back = promptHistoryStep(down.state, { resetKey: "k", key: "ArrowDown", atEnd: true, text: "second prompt", prompts: PROMPTS });
  assert.equal(back.action, "restore");
  assert.equal(back.text, "draft");
});

test("typing, Backspace, Delete and Enter exit navigation without consuming the key", () => {
  for (const key of ["x", "Backspace", "Delete", "Enter"]) {
    const d = driver();
    d.press("ArrowUp");
    const step = d.press(key);
    assert.equal(step.action, "exit", key);
    assert.equal(step.nav, null, key);
  }
  // Other keys and modified keys keep the strip.
  const d = driver();
  d.press("ArrowUp");
  for (const [key, extra] of [["ArrowLeft", {}], ["Tab", {}], ["a", { metaKey: true }], ["a", { ctrlKey: true }], ["a", { altKey: true }], ["a", { composing: true }]])
    assert.equal(d.press(key, extra).action, "none", `${key} ${JSON.stringify(extra)}`);
  assert.deepEqual(d.state.nav, { index: 2, total: 2, hasDraft: false });
  // Before any recall nothing exits.
  assert.equal(driver().press("x").action, "none");
});

test("modifiers, composition, a foreign target and a caret away from the edge are ignored", () => {
  for (const extra of [{ shiftKey: true }, { metaKey: true }, { ctrlKey: true }, { altKey: true }, { composing: true }, { inEditor: false }, { atStart: false }]) {
    const step = driver().press("ArrowUp", extra);
    assert.equal(step.action, "none", JSON.stringify(extra));
    assert.equal(step.nav, null);
  }
  const d = driver();
  d.press("ArrowUp");
  assert.equal(d.press("ArrowDown", { atEnd: false }).action, "none");
  assert.equal(driver({ prompts: [] }).press("ArrowUp").action, "none");
});

test("a resetKey change and a prompts length change reset navigation", () => {
  const d = driver();
  d.press("ArrowUp");
  d.press("ArrowUp");
  d.resetKey = "code:t2";
  d.text = "";
  const step = d.press("ArrowUp");
  assert.equal(step.state.resetKey, "code:t2");
  assert.deepEqual(step.nav, { index: 2, total: 2, hasDraft: false });
  assert.equal(step.text, "second prompt");
  // A newly sent prompt changes the length: navigation restarts from the newest entry.
  d.prompts = [...PROMPTS, "third prompt"];
  const grown = d.press("ArrowUp");
  // The editor still holds the recalled text, so after the reset the (non-empty) editor cannot enter.
  assert.equal(grown.action, "none");
  assert.equal(grown.nav, null);
  d.text = "";
  const fresh = d.press("ArrowUp");
  assert.equal(fresh.text, "third prompt");
  assert.deepEqual(fresh.nav, { index: 3, total: 3, hasDraft: false });
  // Only the key change itself (no arrow) clears the state for the next step.
  const cleared = promptHistoryStep(fresh.state, { resetKey: "code:t3", key: "x", text: "" });
  assert.equal(cleared.action, "none");
  assert.equal(cleared.state.index, null);
});

test("an edited recalled text resets navigation", () => {
  const d = driver();
  d.press("ArrowUp");
  assert.equal(d.press("x").action, "exit");
  d.text = "second promptx";
  const step = d.press("ArrowUp");
  assert.equal(step.action, "none");
  assert.equal(step.state.index, null);
  assert.equal(step.nav, null);
  // Undoing the edit before the next arrow keeps the index (Vj only compares with the injection).
  const e = driver();
  e.press("ArrowUp");
  e.press("x");
  const again = e.press("ArrowUp");
  assert.equal(again.action, "recall");
  assert.equal(again.text, "first prompt");
});

test("an undefined resetKey (the New draft) is inert", () => {
  const d = driver();
  d.resetKey = undefined;
  for (const key of ["ArrowUp", "ArrowDown", "x"]) {
    const step = d.press(key);
    assert.equal(step.action, "none");
    assert.equal(step.nav, null);
  }
  assert.equal(d.text, "");
});

test("humanPrompts keeps non-empty userMessage text oldest to newest", () => {
  const items = [
    { type: "userMessage", id: "u1", content: [{ type: "text", text: "one" }] },
    { type: "agentMessage", id: "a1", text: "reply" },
    { type: "userMessage", id: "u2", content: [{ type: "image", url: "x.png" }] },
    { type: "userMessage", id: "u3", content: [{ type: "text", text: "two" }, { type: "localImage", path: "/a.png" }, { type: "text", text: "lines" }] },
    { type: "userMessage", id: "u4", content: [{ type: "text", text: "" }] },
    { type: "commandExecution", id: "c1" },
  ];
  assert.deepEqual(humanPrompts(items), ["one", "two\nlines"]);
  assert.deepEqual(humanPrompts(undefined), []);
});

test("the screen-reader history status is in the UI language, like the visible header", async () => {
  const { setLocale } = await import("../electron/i18n/index.mjs");
  setLocale("zh-CN");
  try {
    assert.equal(promptHistoryStatus({ index: 1, total: 2, hasDraft: true }), "历史记录 1/2 ↓ 恢复草稿");
    assert.equal(promptHistoryStatus({ index: 2, total: 2, hasDraft: false }), "历史记录 2/2");
  } finally { setLocale("en-US"); }
});
