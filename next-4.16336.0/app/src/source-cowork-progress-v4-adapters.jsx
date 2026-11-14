// Host services of the 4.16336.0 Cowork progress panel (src/generated/cowork-progress-v4,
// scripts/extract-cowork-progress-v4.mjs). Staged graph: nothing imports it until the cowork-progress cutover.
// Every name here is an existing host adapter re-exported unchanged; the generator pins, for each, the 4.16336.0
// declaration it replaces (features + raw declaration sha256) and records it in provenance.json `adapters`. The
// semantics are the ones documented at the original export (the same official binding moved to a new chunk/local).
export {
  useDesktopFrame, FileSystem, CoworkWorkingDocuments, CoworkNonFileOutputRow, CoworkNonFileOutputsFrame,
  unavailableActivityDetail, useConnectedOfficeFiles, useDownloadOutput, useDownloadOutputs, useTodoCommentAttachment,
} from "./source-cowork-progress-v3-adapters.jsx";
export {
  useIntl, FormattedMessage, useErrors, useAnalytics, useCurrentAccount, useFeatureIsOn,
} from "./source-routines-shared-adapters.jsx";
export { trackEvent, useConnectorLookup, ConnectorServerIcon } from "./source-routine-cowork-adapters.jsx";
