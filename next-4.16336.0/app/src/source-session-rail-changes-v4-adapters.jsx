// Host services of the 4.16336.0 session rail Changes card (src/generated/session-rail-changes-v4,
// scripts/extract-session-rail-changes-v4.mjs). Staged graph: nothing imports it until the session-rail-changes cutover.
// Every name here is an existing host adapter re-exported unchanged; the generator pins, for each, the 4.16336.0
// declaration it replaces (features + raw declaration sha256) and records it in provenance.json `adapters`. The
// semantics are the ones documented at the original export (the same official binding moved to a new chunk/local).
export {
  useIntl, FormattedMessage, useErrors, prPanelPreloadHandle, usePrLinkInAppClick, usePrLinkPolicy, hasPrHoverCard, PrHoverCard, RailPrListItem,
} from "./source-session-rail-changes-adapters.jsx";
export { useAnalytics } from "./source-routines-shared-adapters.jsx";
