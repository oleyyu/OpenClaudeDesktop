// Host services of the 4.16336.0 session rail Context section (src/generated/session-rail-context-v4,
// scripts/extract-session-rail-context-v4.mjs). Staged graph: nothing imports it until the session-rail-context cutover.
// Every name here is an existing host adapter re-exported unchanged (the semantics are the ones documented at the
// original export: the same official binding moved to a new 4.16336.0 chunk/local), plus the two stand-ins of
// src/source-session-rail-context-v4.jsx (c227f4d5e w3's inline branch and c91b6e9db N, the readout loader). The
// generator pins, for each, the 4.16336.0 declaration it replaces (features + raw declaration sha256) and records it in
// provenance.json `adapters`.
export {
  useRailContextBridge, useCompactSendState, useAutoCompactWindowConfig, useRunsOnThisComputer, AutoCompactWindowRow,
  useScopedPreference, usePreferencesSettled, useSessionTurnPending, logCompactClicked, useCustomizeNouns,
  useMcpServerRegistry, findMcpToolForLabel, remoteMcpServerLabel,
} from "./source-session-rail-context-adapters.jsx";
export { useIntl, FormattedMessage } from "./source-session-rail-kit-adapters.jsx";
export { useFeatureIsOn } from "./source-routines-shared-adapters.jsx";
export { RailContextUsage, loadStackedMeterReadout } from "./source-session-rail-context-v4.jsx";
