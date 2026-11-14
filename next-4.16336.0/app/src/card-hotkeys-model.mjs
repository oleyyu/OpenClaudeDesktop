// Document-level hotkeys for a pending approval, plan or question card (2.2553.1 approval hotkey hook
// ccbc7e432 Xf / shared-7 aR, dR, pR, vR): while a card waits for an answer, Esc and ⌘⏎ reach it from
// outside the card too, so a user whose cursor stayed in the composer denies (or revises) with Esc
// instead of stopping the whole turn, and ⌘⏎ does what the card's keycap says. Inside the card its own
// onKeyDown keeps handling the keys; anything that owns keys itself (another editor, a dialog, a menu
// or listbox, an escape owner, a canvas) keeps them. The session's own composer counts as the card's
// only while it is empty and shows no popup (official isOwnComposer + hasComposerDraft/hasComposerPopup).
import { isComposingEvent } from "./composer-keys-model.mjs";

// shared-7 dR / pR / vR / bR: dialogs, escape owners, open menus and listboxes, canvas / application targets.
export const CARD_HOTKEY_OWNERS = '[role="dialog"], [role="alertdialog"], dialog[open], [data-escape-owner], [role="menu"], '
  + '[aria-haspopup="menu"][aria-expanded="true"], [role="listbox"], [role="option"], canvas, [role="application"]';
// shared-7 lR / sR: editables (a contenteditable or textbox only when it is not the session's composer).
export const CARD_HOTKEY_EDITORS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), '
  + '[role="textbox"], [role="combobox"], [role="searchbox"]';

// Current zS is a full child conversation. Document hotkeys belong to the
// pane with focus; an unfocused page continues to belong to the main session.
export function sameApprovalPane(a, b) {
  return (a?.closest?.('[data-side-session-pane]') ?? null) === (b?.closest?.('[data-side-session-pane]') ?? null);
}

/**
 * Where keyboard focus is, for a key that reached the document while a card is pending.
 * @param {Element | null | undefined} active - document.activeElement
 * @param {{card?: Element | null, composer?: Element | null, composerDraft?: boolean}} context
 * @returns {"card" | "composer" | "free" | null} "card": inside the card (its own onKeyDown answers);
 *   "composer": the session's empty composer with no popup; "free": nothing that owns keys is focused;
 *   null: something else owns the key (a composer with a draft or a popup, another editor, a dialog, a menu).
 */
export function cardHotkeyFocus(active, { card = null, composer = null, composerDraft = false } = {}) {
  const document = active?.ownerDocument;
  if (!active || !document || active === document.body || active === document.documentElement) return "free";
  if (card && (card === active || card.contains(active))) return "card";
  if (composer && (composer === active || composer.contains(active))) {
    const popup = composer.getAttribute?.("aria-expanded") === "true";
    const typed = composer.dataset?.empty === "false" || (typeof composer.value === "string" && composer.value.trim() !== "");
    return composerDraft || typed || popup ? null : "composer";
  }
  if (active.closest?.(CARD_HOTKEY_OWNERS) || active.closest?.(CARD_HOTKEY_EDITORS)) return null;
  return "free";
}

/**
 * The card key a document-level event names, or null.
 * @returns {"escape" | "submit" | "submit-shift" | null} Esc (deny / Revise…), ⌘⏎ (the primary action),
 *   ⇧⌘⏎ (the persistent allow, or the plan's Manual accept).
 */
export function cardHotkey(event, focus) {
  if (focus !== "composer" && focus !== "free") return null;
  if (!event || event.defaultPrevented || isComposingEvent(event) || event.altKey) return null;
  if (event.key === "Escape") return event.metaKey || event.ctrlKey || event.shiftKey ? null : "escape";
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) return event.shiftKey ? "submit-shift" : "submit";
  return null;
}

/** Of several pending cards, the first visible one in document order answers (one listener acts per key). */
export function firstCardRoot(candidates, visible = () => true) {
  for (const candidate of candidates ?? []) if (visible(candidate)) return candidate;
  return null;
}
