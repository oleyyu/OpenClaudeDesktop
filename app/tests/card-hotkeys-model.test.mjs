import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { cardHotkey, cardHotkeyFocus, firstCardRoot } from "../src/card-hotkeys-model.mjs";

const root = path.resolve(import.meta.dirname, "..");

// A minimal element: `matches` lists the selectors (by fragment) its closest() hits; children are contained.
function element(document, { owners = false, editor = false, attrs = {}, dataset = {}, children = [] } = {}) {
  const node = {
    ownerDocument: document, dataset, children,
    getAttribute: (name) => attrs[name] ?? null,
    contains: (other) => other === node || children.some((child) => child === other || child.contains?.(other)),
    closest: (selector) => (owners && selector.includes('[role="dialog"]')) || (editor && selector.includes("contenteditable")) ? node : null,
  };
  return node;
}
const doc = () => { const document = {}; document.body = { ownerDocument: document }; document.documentElement = { ownerDocument: document }; return document; };

test("card hotkey focus: inside the card, the empty composer, a free page, or someone else's key", () => {
  const document = doc();
  const button = element(document);
  const card = element(document, { children: [button] });
  const composer = element(document, { editor: true, dataset: { empty: "true" }, attrs: { "aria-expanded": "false" } });
  assert.equal(cardHotkeyFocus(document.body, { card, composer }), "free");
  assert.equal(cardHotkeyFocus(null, { card, composer }), "free");
  assert.equal(cardHotkeyFocus(button, { card, composer }), "card", "the card's own onKeyDown answers");
  assert.equal(cardHotkeyFocus(composer, { card, composer }), "composer");
  assert.equal(cardHotkeyFocus(composer, { card, composer, composerDraft: true }), null, "a draft keeps the composer's keys");
  const typed = element(document, { editor: true, dataset: { empty: "false" } });
  assert.equal(cardHotkeyFocus(typed, { card, composer: typed }), null);
  const popup = element(document, { editor: true, dataset: { empty: "true" }, attrs: { "aria-expanded": "true" } });
  assert.equal(cardHotkeyFocus(popup, { card, composer: popup }), null, "an open @ / slash popup owns Esc");
  assert.equal(cardHotkeyFocus(element(document, { editor: true }), { card, composer }), null, "another editor");
  assert.equal(cardHotkeyFocus(element(document, { owners: true }), { card, composer }), null, "a dialog or menu");
  assert.equal(cardHotkeyFocus(element(document), { card, composer }), "free", "a plain button outside the card");
});

test("card hotkey: Esc, ⌘⏎ and ⇧⌘⏎ from the composer or a free page; nothing inside the card or while composing", () => {
  const key = (init) => ({ key: "Escape", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init });
  assert.equal(cardHotkey(key({}), "composer"), "escape");
  assert.equal(cardHotkey(key({}), "free"), "escape");
  assert.equal(cardHotkey(key({ key: "Enter", metaKey: true }), "composer"), "submit");
  assert.equal(cardHotkey(key({ key: "Enter", ctrlKey: true }), "free"), "submit");
  assert.equal(cardHotkey(key({ key: "Enter", metaKey: true, shiftKey: true }), "composer"), "submit-shift");
  assert.equal(cardHotkey(key({ key: "Enter" }), "composer"), null, "plain Enter stays the composer's");
  assert.equal(cardHotkey(key({}), "card"), null);
  assert.equal(cardHotkey(key({}), null), null);
  assert.equal(cardHotkey(key({ isComposing: true }), "composer"), null);
  assert.equal(cardHotkey(key({ keyCode: 229 }), "composer"), null);
  assert.equal(cardHotkey(key({ defaultPrevented: true }), "composer"), null);
  assert.equal(cardHotkey(key({ altKey: true, key: "Enter", metaKey: true }), "composer"), null);
  assert.equal(cardHotkey(key({ shiftKey: true }), "composer"), null);
});

test("several cards: the first visible one answers", () => {
  const a = { id: "a" }, b = { id: "b" };
  assert.equal(firstCardRoot([a, b]), a);
  assert.equal(firstCardRoot([a, b], (card) => card === b), b);
  assert.equal(firstCardRoot([a, b], () => false), null);
});

test("approval, plan and question cards register the document hotkeys; a pending card claims the composer's Esc", async () => {
  const read = (file) => fs.readFile(path.join(root, "src", file), "utf8");
  const [approval, plan, question, main] = await Promise.all(["source-approval-card.jsx", "source-plan-card.jsx", "source-question-card.jsx", "main.jsx"].map(read));
  assert.match(approval, /useCardHotkeys\(root, shortcutEnabled,/);
  assert.match(approval, /approvalKeyIntent\(event, \{ target: "content"/);
  assert.match(plan, /useCardHotkeys\(root, shortcutEnabled && !revising,/);
  assert.match(plan, /if \(key === "escape"\) \{ setRevising\(true\); return; \}/);
  assert.match(question, /useCardHotkeys\(root, isActive && !menuOpen && view\?\.phase === "pending"/);
  // R4g-btw BT4 (X7-16): each card the shared approval slot renders keeps the composer context.
  assert.match(main, /<CardComposerContext\.Provider key=\{a\.bridgeApproval\.instanceId\} value=\{cardComposer\}>/);
  assert.match(main, /\|\| \(current && shownApprovals\.length > 0 && !!boot\?\.connected && !loading\)\)\}/);
});
