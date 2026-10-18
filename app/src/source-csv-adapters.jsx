// Host services for the unmodified 2.42304.0 CSV component (cd5fd9055 D/se). Its parsing,
// filtering, sorting, numeric classification, markup and classes are generated; its Button (shared-frame cl)
// and Icon (Hl) are the original CdsButton/CdsIcon, imported by view-tabs name in csv-view.mjs.
// R3-files FT-18: its TextInput (shared-frame ho, local tx) is the original too, view-tabs CdsTextInput (D24); the host
// CsvTextInput (the chat generator's 2.2553.1 Bh) is gone, its last other user (the sidebar sections dialog) having moved
// to CdsTextInput as well.
import { startTransition, useEffect, useState } from 'react';
export { StartMessage as CsvMessage, useStartIntl as useCsvIntl } from './source-code-start-adapters.jsx';
export { SourceEmptyState as CsvEmptyState } from './source-transcript-states.jsx';

// The original scheduler lands this field after paint in a transition. The
// host has no product telemetry scheduler; retain that observable ordering.
export function useCsvFieldLanding({ enabled }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => startTransition(() => setReady(true)));
    });
    return () => { cancelAnimationFrame(first); if (second !== undefined) cancelAnimationFrame(second); };
  }, [enabled]);
  return !enabled || ready;
}
