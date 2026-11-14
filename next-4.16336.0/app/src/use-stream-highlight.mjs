import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createStreamHighlightBinding, EMPTY_STREAM_VIEW } from "./highlight-stream-binding.mjs";
import { getStreamHighlightClient } from "./highlight-browser.mjs";
import { useCodeThemes } from "./code-theme-store.mjs";

// Integration: const stream = useStreamHighlight({text, language, isFrontier,
// languageSettled, scopeKey}); tokens cover stream.coveredText (a prefix of
// text); render the remaining suffix as plain text. Pass stream.retained and
// stream.isHeld to useSettledHighlight so the settled worker never runs for a
// fence whose stream tokens are retained. The selected code theme pair is part
// of every update: a pair that differs from the one the stream opened under
// releases a completed fence to the settled path (see the binding rules).
export function useStreamHighlight({ text, language, isFrontier, languageSettled, scopeKey }, client) {
  const [view, setView] = useState(EMPTY_STREAM_VIEW);
  const binding = useRef(null);
  const themes = useCodeThemes();
  useLayoutEffect(() => {
    const owner = createStreamHighlightBinding({ client: client ?? getStreamHighlightClient(), onChange: setView });
    binding.current = owner;
    return () => { binding.current = null; owner.dispose(); setView(EMPTY_STREAM_VIEW); };
  }, [client]);
  useLayoutEffect(() => {
    binding.current?.update({ text, language, isFrontier, languageSettled, scopeKey, themes });
  }, [text, language, isFrontier, languageSettled, scopeKey, client, themes]);
  const isHeld = useCallback(() => binding.current?.isHeld() ?? false, []);
  // Reject tokens that no longer prefix the rendered text (restart in flight).
  const valid = view.tokens && typeof text === "string" && text.startsWith(view.coveredText);
  return { tokens: valid ? view.tokens : null, coveredText: valid ? view.coveredText : "", retained: view.retained, streaming: view.streaming, phase: view.phase, isHeld };
}
