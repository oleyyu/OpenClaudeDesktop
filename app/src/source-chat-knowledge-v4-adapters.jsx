// Host adapters of the 4.16336.0 chat-knowledge graph (scripts/extract-chat-knowledge-v4.mjs, account2 batch 6 region
// chat-knowledge). Each export answers one original declaration the extractor names (HOST_ADAPTERS: features and a raw
// declaration sha256 pin the original); the extractor checks this module exports exactly those names.
// Where the official contract is unchanged from 3.6556.2, the 3.6556.2 host adapter is re-exported (the page that renders
// a part still provides ChatMemoryHostContext / ChatKnowledgeHostContext from src/source-chat-knowledge-adapters.jsx).

// react-intl, errors and GrowthBook flags: the routines-shared host services (vendor-intl q / Gt, shared-62 rP,
// shared-25 ko; useFeatureIsOn answers off, so cf2f34ee4 di's nebula_drift_enabled MCP sources stay hidden).
export { useIntl, FormattedMessage, useErrors, useFeatureIsOn } from "./source-routines-shared-adapters.jsx";

// cffc9ea71 C's memory services (c274117ff _, shared-212 Oz / Rz, c89efce1a Mu) and cf2f34ee4 oi / di's local project
// services (shared-212 GQ / RW, shared-183 nN / ZM / rw, cf2f34ee4 hi, shared-36 Mb, shared-4 QI / JI / _L / KI / mL / qI)
// and shared-36 U_'s tile route (shared-62 KM): the 3.6556.2 contracts, unchanged in 4.16336.0.
export {
  useChatMemoryAvailable, useChatMemoryQuery, useUpdateChatMemoryControls, ChatMemoryMarkdown,
  useCreateKnowledgeText, useKnowledgeProject, useKnowledgeGithubAvailable, useKnowledgeGithubAuth, useKnowledgeMcpServers,
  KnowledgeMcpSourceItems, KnowledgeGithubSyncModal, useKnowledgeTokens, useKnowledgeCapacity, useKnowledgeFileUpload,
  useKnowledgeSearchRollout, useKnowledgeSearchThreshold, useKnowledgeSearchActive, knowledgeTileAppRoute,
} from "./source-chat-knowledge-adapters.jsx";

// cf2f34ee4 $r (3.6556.2 cf2f34ee4 ur): the starter-project tooltip; a local project is never the example project.
export { ExampleProjectTooltip } from "./source-project-v3-adapters.jsx";

// shared-212 cB / sB (4.16336.0 only, read by cffc9ea71 T, the memory edits view): GrowthBook dynamic config
// claudeai_saffron_frontend max_control_chars / max_num_controls. No GrowthBook here, so the read answers the official
// default the call passes (`Er("claudeai_saffron_frontend", "max_control_chars", 100, Qr)`, `…"max_num_controls", 10…`).
export function useMemoryMaxControlChars() {
  return 100;
}
export function useMemoryMaxControls() {
  return 10;
}
