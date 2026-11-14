// Host adapters of the 3.6556.2 chat-knowledge graph (scripts/extract-chat-knowledge.mjs, w13-close-chat-projects-memory).
// Each export answers one original declaration the extractor names (its features pin the original); the manifest's
// `hostDifferences` repeats why. The memory is this machine's (electron/chat-memory.mjs: <userData>/memory, written by the
// connected core in a hidden thread), so the claude.ai memory endpoints, GrowthBook values and in-app routes have no data:
// the page that renders a sliced part provides ChatMemoryHostContext (Settings > Memory, the project page).
// No view-tabs facade import: the Chat Markdown (a chat-graph module, E41) is reached from here.
import React, { createContext, useContext } from 'react';
import { SourceChatMarkdown } from './source-chat-markdown.jsx';

// { available, query: { data: { memory, controls, updated_at } }, update({ controls, project_uuid }) → Promise, pending }
export const ChatMemoryHostContext = createContext(null);

// c274117ff _ (y in cffc9ea71 w): memory is available — this machine's memory is on and not paused.
export function useChatMemoryAvailable() {
  return useContext(ChatMemoryHostContext)?.available === true;
}

// shared-182 $k (h in cffc9ea71 w): the memory query ({ data: { memory, controls, updated_at } }) over the local store.
const noMemory = Object.freeze({ data: undefined, refetch: async () => {}, isFetching: false, errorUpdateCount: 0 });
export function useChatMemoryQuery() {
  return useContext(ChatMemoryHostContext)?.query ?? noMemory;
}

// shared-182 iA (p in cffc9ea71 w): { updateMemoryControls({ controls, project_uuid }), updateMemoryControlsIsPending }.
// The host saves the edits and regenerates the memory (chat-memory op "controls"); its failure line is the page's.
const noUpdate = Object.freeze({ updateMemoryControls() {}, updateMemoryControlsIsPending: false });
export function useUpdateChatMemoryControls() {
  const host = useContext(ChatMemoryHostContext);
  if (!host?.update) return noUpdate;
  return { updateMemoryControls: (value) => { void Promise.resolve(host.update(value)).catch(() => {}); }, updateMemoryControlsIsPending: host.pending === true };
}

// c89efce1a rc (the `_` cffc9ea71 T renders as `_({ text })`): the memory text, drawn by the host Chat Markdown.
export function ChatMemoryMarkdown({ text = '' }) {
  return <SourceChatMarkdown text={typeof text === 'string' ? text : ''} />;
}

// shared-52 hz (oi in shared-7 mD): a url's claude.ai in-app route. None here; a local knowledge tile has no url.
export function knowledgeTileAppRoute() {
  return null;
}

// ── cf2f34ee4 _r / Sr: the knowledge rail's "Add files" control over a local project ────────────────────────────────
// The project page's knowledge section (source-project-knowledge.jsx) provides { tokens, capacity, addText({ name, text }),
// uploadFiles(files) }: both resolve after main answered (local-projects knowledge-add-text / knowledge-add-content) and
// reject when nothing could be added.
export const ChatKnowledgeHostContext = createContext(null);

// shared-182 QW (Ge in _r): the "create project doc" mutation; "Add text content" saves { file_name, content }.
export function useCreateKnowledgeText() {
  const host = useContext(ChatKnowledgeHostContext);
  return { mutateAsync: async ({ file_name, content } = {}) => { if (!host?.addText) throw new Error('Project knowledge is unavailable.'); return host.addText({ name: file_name, text: content }); } };
}
// shared-182 yz (Ue in _r): the project record; a local project is private (never shared).
const privateProject = Object.freeze({ data: Object.freeze({ is_private: true }) });
export function useKnowledgeProject() {
  return privateProject;
}
// shared-156 tj (Me in _r): the GitHub source is not offered (no claude.ai GitHub integration).
export function useKnowledgeGithubAvailable() {
  return false;
}
// shared-156 XA (Le in _r): GitHub authentication through claude.ai; never reached (the row is hidden).
const noGithubAuth = Object.freeze({ checkIsGithubAuthenticated: async () => false, initGithubAuth() {} });
export function useKnowledgeGithubAuth() {
  return noGithubAuth;
}
// shared-156 wS (Fe in Sr): claude.ai's MCP servers; none (this machine's connectors run in the core).
const noServers = Object.freeze([]);
export function useKnowledgeMcpServers() {
  return noServers;
}
// shared-4 Nb (pe in _r): the knowledge's size in tokens.
export function useKnowledgeTokens() {
  return useContext(ChatKnowledgeHostContext)?.tokens ?? 0;
}
// shared-4 kb (me in _r): { maxKbTokens }.
export function useKnowledgeCapacity() {
  return { maxKbTokens: useContext(ChatKnowledgeHostContext)?.capacity ?? 200000 };
}
// shared-4 Qb (fe in _r): the upload of the files picked in _r's hidden input.
const noPending = () => () => {};
export function useKnowledgeFileUpload() {
  const host = useContext(ChatKnowledgeHostContext);
  return { handleProjectFileUpload: async (files) => { await host?.uploadFiles?.(files); }, trackPendingDoc: noPending, fileInputAccept: undefined,
    pendingAttachments: noServers, encodingModalAttachment: null, encodingModalId: null, setEncodingModalId() {}, onEncodingConfirm() {}, onEncodingClose() {}, removePendingAttachment() {} };
}
// shared-7 qk (et in _r): the lazy GitHub sync modal; never opened.
export function KnowledgeGithubSyncModal() {
  return null;
}
// cf2f34ee4 Er (in Sr): the MCP resource source rows; none here.
export function KnowledgeMcpSourceItems() {
  return null;
}

// ── c52b32660 ge: the capacity bar's search-mode services ─────────────────────────────────────────────────────────
// shared-4 Db (w): the knowledge search UI rollout (GrowthBook claude_ai_project_bananagrams), off without GrowthBook (E49).
export function useKnowledgeSearchRollout() {
  return false;
}
// shared-4 Yb (x): the search threshold (claude.ai project settings); none.
export function useKnowledgeSearchThreshold() {
  return undefined;
}
// shared-4 Ob (C): whether the project uses knowledge search; the rollout is off, so false (as Ob answers for `!t`).
export function useKnowledgeSearchActive() {
  return false;
}
