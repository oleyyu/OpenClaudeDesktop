// A pending card's document-level Esc / ⌘⏎ (card-hotkeys-model.mjs; official approval hotkey hook Xf):
// a capture-phase keydown listener on the card's document while the card is answerable. Keys inside the
// card stay with its own onKeyDown; from the session's empty composer or an unfocused page the first
// visible card answers them. main.jsx provides the composer through CardComposerContext.
import { createContext, useContext, useEffect, useRef } from "react";
import { cardHotkey, cardHotkeyFocus, firstCardRoot, sameApprovalPane } from "./card-hotkeys-model.mjs";

/** { composerRef: a ref to the composer editor, draftRef: a ref whose current is true while it holds a draft } */
export const CardComposerContext = createContext(null);

const ROOT_ATTRIBUTE = "data-card-hotkeys";

/**
 * @param {{current: Element | null}} root - the card's root element
 * @param {boolean} enabled - the card is answerable now (active, not busy, no menu or dialog open)
 * @param {(key: "escape" | "submit" | "submit-shift", event: KeyboardEvent) => void} onKey - called for this
 *   card's keys; it prevents the event when it acts (or swallows it, e.g. before the hotkeys arm)
 * @param {(element: Element) => boolean} visible - source-approval-card currentlyVisible (passed in, so this
 *   module and the card modules do not import each other)
 */
export function useCardHotkeys(root, enabled, onKey, visible) {
  const composer = useContext(CardComposerContext);
  const latest = useRef({ onKey, composer, visible });
  latest.current = { onKey, composer, visible };
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return undefined;
    const document = element.ownerDocument;
    element.setAttribute(ROOT_ATTRIBUTE, "");
    const listener = (event) => {
      if (event.defaultPrevented) return;
      const card = root.current;
      // A card in the split side that is not focused (source-split-view.jsx) leaves the keys to the focused side.
      if (!card?.isConnected || card.closest("[inert], [data-split-inactive]")) return;
      if (!sameApprovalPane(document.activeElement, card)) return;
      const { onKey: handle, composer: context, visible: shown } = latest.current;
      const focus = cardHotkeyFocus(document.activeElement, { card, composer: context?.composerRef?.current ?? null,
        composerDraft: !!context?.draftRef?.current });
      const key = cardHotkey(event, focus);
      if (!key) return;
      // Several pending cards: only the first visible one answers (a hidden card never acts on a key).
      if (firstCardRoot([...document.querySelectorAll(`[${ROOT_ATTRIBUTE}]`)].filter((node) => !node.closest("[data-split-inactive]") && sameApprovalPane(node, card)), shown ?? (() => true)) !== card) return;
      handle?.(key, event);
    };
    document.addEventListener("keydown", listener, true);
    return () => {
      document.removeEventListener("keydown", listener, true);
      element.removeAttribute(ROOT_ATTRIBUTE);
    };
  }, [root, enabled]);
}
