import { useLayoutEffect, useRef, useState } from "react";
import { createHighlightBinding } from "./highlight-binding.mjs";
import { getHighlightService } from "./highlight-browser.mjs";
import { useCodeThemes } from "./code-theme-store.mjs";

// Integration: const codeRef = useRef(null); const tokens = useSettledHighlight(
// {text, language, isFrontier, languageSettled, scopeKey}, codeRef);
// Render each token as a React text child in a span with tokenCSS(token), never
// as innerHTML. Keep SourceCodeBlock's clipboard controller and actions intact.
// held/isHeld: a retained stream result (see use-stream-highlight.mjs) keeps
// the settled worker idle for this fence; isHeld is read inside the effect so
// the decision made by the stream binding in the same commit is respected.
// The selected code theme pair is part of every request: changing it makes
// the previous tokens stale during render and re-requests under a new key.
export function useSettledHighlight({ text, language, isFrontier, languageSettled, scopeKey, held = false, isHeld, themes: explicitThemes }, codeRef, service) {
  const [current, setCurrent] = useState(null);
  const binding = useRef(null);
  const selectedThemes = useCodeThemes();
  const themes = explicitThemes ?? selectedThemes;
  useLayoutEffect(() => {
    const elementDocument = codeRef.current?.ownerDocument ?? document;
    const owner = createHighlightBinding({
      service: service ?? getHighlightService(),
      onResult: (input, result) => setCurrent({ input, result }),
      isSelectionActive: () => {
        const selection = elementDocument.getSelection();
        return Boolean(codeRef.current && selection && !selection.isCollapsed && selection.containsNode(codeRef.current, true));
      },
      subscribeSelection: (listener) => {
        elementDocument.addEventListener("selectionchange", listener);
        return () => elementDocument.removeEventListener("selectionchange", listener);
      },
    });
    binding.current = owner;
    return () => { binding.current = null; owner.dispose(); };
  }, [codeRef, service]);
  useLayoutEffect(() => {
    const suppressed = isFrontier || held || Boolean(isHeld?.());
    binding.current?.update({ text, language, isFrontier: suppressed, languageSettled, scopeKey, themes });
  }, [text, language, isFrontier, languageSettled, scopeKey, held, isHeld, codeRef, service, themes]);
  const old = current?.input;
  // Reject stale tokens during render, before the next layout effect can run.
  return old?.text === text && old?.language === language && !old?.isFrontier
    && old?.languageSettled === languageSettled && old?.scopeKey === scopeKey
    && old?.themes?.light === themes.light && old?.themes?.dark === themes.dark
    && !isFrontier && !held && languageSettled !== false ? current?.result?.tokens ?? null : null;
}
