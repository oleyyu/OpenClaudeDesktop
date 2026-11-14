// Host services of the 4.16336.0 Pierre Changes graph (src/generated/pierre-changes-v4, scripts/extract-pierre-changes-v4.mjs).
// Staged graph: nothing imports it until the pierre-changes cutover. Every name here is an existing host adapter
// re-exported unchanged; the generator pins, for each, the 4.16336.0 declaration it replaces (features + raw declaration
// sha256) and records it in provenance.json `adapters` (vendor-intl q useIntl / Gt FormattedMessage, the same originals
// the 3.6556.2 graph adapts: src/source-pierre-changes-adapters.jsx -> source-code-transcript-adapters.jsx -> this kit module).
export { useIntl, FormattedMessage } from "./source-session-rail-kit-adapters.jsx";
