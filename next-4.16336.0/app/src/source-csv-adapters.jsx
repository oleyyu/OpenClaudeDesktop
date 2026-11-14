// Host services for the unmodified 3.6556.2 CSV component (cd5fd9055-BXQRn_nx b/he, 2.42304.0 D/se; cc-rest-csv). Its
// parsing, filtering, sorting, numeric classification, markup and classes are generated (csv-model.mjs, csv-view.mjs);
// its Button, Icon and TextInput (shared-frame Eu/od/vs) are the original CdsButton/CdsIcon/CdsTextInput, imported by
// view-tabs name in csv-view.mjs (D24). The host CsvTextInput (the chat generator's 2.2553.1 Bh) is gone (R3-files FT-18).
// This module supplies the copy (StartMessage / useStartIntl), the empty state, and the after-paint field landing
// (shared-156 aI, unpublished).
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
