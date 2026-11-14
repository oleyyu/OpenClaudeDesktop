// Host services of the 4.16336.0 Cowork live sections (src/generated/cowork-live-v4, scripts/extract-cowork-live-v4.mjs).
// Staged graph: nothing imports it until the cowork-live cutover.
// Every name here is an existing host adapter re-exported unchanged; the generator pins, for each, the 4.16336.0
// declaration it replaces (features + raw declaration sha256) and records it in provenance.json `adapters`. The
// semantics are the ones documented at the original export (the same official binding moved to a new chunk/local).
export { useLivePreviewFps, useConnectedBrowsers, useSwitchBrowser, ComputerUseLivePreview } from "./source-cowork-live-adapters.jsx";
export { unavailableActivityDetail } from "./source-cowork-progress-v3-adapters.jsx";
export { useIntl, FormattedMessage, useCurrentAccount, useFeatureIsOn } from "./source-routines-shared-adapters.jsx";
export { loadPublicSuffixList } from "./source-code-transcript-adapters.jsx";
