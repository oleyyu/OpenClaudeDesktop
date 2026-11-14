// Host services of the 4.16336.0 usage reset countdown (src/generated/usage-countdown-v4,
// scripts/extract-usage-countdown-v4.mjs). Staged graph: nothing imports it until the usage-countdown cutover.
// The one name here is the existing host adapter re-exported unchanged: the 3.6556.2 graph (src/generated/usage-countdown)
// already adapts the same official service (react-intl FormattedMessage over the local catalog), which 4.16336.0 keeps
// in vendor-intl under a new chunk name. Its semantics are documented at the original export
// (src/source-usage-countdown-adapters.jsx). The generator pins the 4.16336.0 declaration it replaces (features + raw
// declaration sha256) and records it in provenance.json `adapters`.
export { FormattedMessage } from "./source-usage-countdown-adapters.jsx";
