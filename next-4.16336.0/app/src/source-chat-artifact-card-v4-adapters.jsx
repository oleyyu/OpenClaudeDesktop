// Host services of the 4.16336.0 Chat artifact card (src/generated/chat-artifact-card-v4,
// scripts/extract-chat-artifact-card-v4.mjs). Staged graph: nothing imports it until the chat-artifact-card cutover.
// Every name here is an existing host adapter re-exported unchanged; the generator pins, for each, the 4.16336.0
// declaration it replaces (features + raw declaration sha256) and records it in provenance.json `adapters`. The
// semantics are the ones documented at the original export (the same official binding moved to a new chunk/local).
export {
  chatArtifactsInputSchema, useChatTranscriptCapability, useChatArtifactDrawer, useChatArtifactRecord, useChatArtifactEntry,
  useChatArtifactDrawerSelected,
} from "./source-chat-artifact-card-adapters.jsx";
export { useIntl, FormattedMessage } from "./source-routines-shared-adapters.jsx";
export { setChatLocalValue } from "./source-chat-markdown-adapters.jsx";
export { reportRenderError } from "./source-r3b-transcript-adapters.jsx";
