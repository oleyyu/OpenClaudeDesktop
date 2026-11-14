// Host services of the 4.16336.0 queued message bar (src/generated/queued-bar-v4, scripts/extract-queued-bar-v4.mjs).
// Staged graph: nothing imports it until the queued-bar cutover (the host keeps mounting src/generated/queued-bar).
// Every name here is an existing host adapter re-exported unchanged; the generator pins, for each, the 4.16336.0
// declaration it replaces (features + raw declaration sha256) and records the 3.6556.2 original it already stands for.
export { QueuedBarMessage, useQueuedEntryRemoving, useQueuedEntrySending, useQueuedEntrySendAccepted, useQueuedEntrySendLanded } from "./source-queued-bar-adapter.jsx";
export { SEEDED_SUMMON_PARSER_ENTRY } from "./source-code-transcript-adapters.jsx";
export { useIntl, useCurrentAccount } from "./source-routines-shared-adapters.jsx";
