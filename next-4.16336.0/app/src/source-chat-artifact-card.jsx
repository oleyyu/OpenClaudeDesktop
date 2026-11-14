import React from 'react';
import { ChatArtifactToolBlock, artifactCellType } from './generated/chat-artifact-card/artifact-tool-block.mjs';
import { drawerTriggerStore } from './generated/chat-artifact-card/transcript-layout.mjs';
import { ChatArtifactCardContext } from './source-chat-artifact-card-adapters.jsx';
import { artifactToolCall } from './chat-artifact-model.mjs';

// w13-chatui-artifact-inline (research/w13-chatui.md chatui-C13): a Chat's `artifacts` tool call drawn as the 3.6556.2
// artifact block. cc1aae219's tool-use switch renders `case "artifacts": h(Y3, { input, conversationUuid, toolResult,
// isStreaming, onOpenArtifact, message, toolUseId, artifactCellType: PB(X, be, n), isFirstBlockOfMessage,
// isLastBlockOfMessage })` with X / be the message's content blocks two before / after (the tool uses around this one);
// Y3 draws shared-9 sO, the `artifact-block-cell` block whose open button opens the artifact beside the conversation.
// Here the blocks are the transcript rows (an `artifacts` call is its own row in a Chat, chat-artifact-model
// withArtifactChips), the artifact store is what this Chat's calls wrote, and the drawer is the Chat artifact panel.

const resultParts = (item) => (Array.isArray(item?.result?.content) ? item.result.content : Array.isArray(item?.contentItems) ? item.contentItems : []);
// The local tool's result names the version it wrote ("Created artifact: id (version 3, …)", chat-artifacts.mjs resultText).
export function artifactResultVersion(item) {
  for (const part of resultParts(item)) {
    const match = part?.type === 'text' && typeof part.text === 'string' ? /\(version (\d+)[,)]/.exec(part.text) : null;
    if (match) return Number(match[1]);
  }
  return undefined;
}

const parsedArguments = (item) => {
  let args = item?.arguments;
  if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = null; } }
  return args && typeof args === 'object' && !Array.isArray(args) ? args : null;
};

/**
 * A transcript row as cc1aae219 sees a content block: an `artifacts` call is `{type: "tool_use", name: "artifacts", id,
 * input}` (the input carries the version the call wrote as version_number); any other row is a block of its own type.
 */
export function artifactToolUse(item) {
  const call = artifactToolCall(item);
  if (!call) return item ? { type: item.type ?? 'text' } : undefined;
  const version = artifactResultVersion(item);
  return { type: 'tool_use', name: 'artifacts', id: item.id, input: { ...parsedArguments(item), ...(version ? { version_number: version } : {}) } };
}

// cc1aae219 Y3's toolResult: present once the call settled; `cancelled` when it was stopped, `is_error` when it failed.
export function artifactToolResult(item) {
  if (!item || item.status === 'inProgress' || item.status === 'running' || item.status === 'pending') return undefined;
  if (item.status === 'interrupted' || item.status === 'declined' || item.status === 'cancelled') return { cancelled: true };
  return { is_error: item.status === 'failed' || item.status === 'error' || item.result?.isError === true || !!item.error };
}

const sameMessage = (a, b) => !!a && !!b && a.type !== 'userMessage' && b.type !== 'userMessage' && (a.turnId ?? null) === (b.turnId ?? null);

/**
 * The conversation's artifact store as the rows show it (shared-130 AY / kY): id -> {id, title, type, language}, each
 * field the latest a call (not a failed one) set. Rows are the displayed transcript rows, tool groups included.
 */
const recordsCache = new WeakMap();
export function chatArtifactRecords(rows) {
  if (!Array.isArray(rows)) return {};
  if (recordsCache.has(rows)) return recordsCache.get(rows);
  const records = {};
  const visit = (item) => {
    const call = artifactToolCall(item);
    if (!call || call.failed) return;
    const args = parsedArguments(item) ?? {};
    const record = records[call.id] ?? { id: call.id };
    for (const key of ['title', 'type', 'language']) if (typeof args[key] === 'string' && args[key]) record[key] = args[key];
    const version = artifactResultVersion(item);
    if (version && !(record.latestVersion >= version)) record.latestVersion = version;
    records[call.id] = record;
  };
  for (const row of rows) for (const item of Array.isArray(row?.toolGroup) ? row.toolGroup : [row]) visit(item);
  recordsCache.set(rows, records);
  return records;
}

/** Y3's per-row inputs from the displayed rows: the cell type (PB over the neighbouring rows of the same message), first / last. */
export function artifactCellOf(rows, index) {
  const item = rows[index];
  const previous = sameMessage(rows[index - 1], item) ? rows[index - 1] : undefined;
  const next = sameMessage(rows[index + 1], item) ? rows[index + 1] : undefined;
  return { cellType: artifactCellType(artifactToolUse(previous), artifactToolUse(next), artifactToolUse(item)),
    first: !previous, last: !next };
}

/** Closing the panel hands the focus back to the block that opened it (shared-2 vT restoreFocusToTrigger). */
export function restoreChatArtifactTrigger() {
  drawerTriggerStore.getState().restoreFocusToTrigger();
}

/**
 * Y3's onOpenArtifact(id, messageUuid, versionUuid, {toolUseId}) as the panel opens it: {id, toolUseId, version}, the
 * version only for a block that wrote an older one (the latest block leaves the panel on the latest, so a later write
 * still shows up there).
 */
export function artifactOpenRequest(rows, index, id, toolUseId) {
  const version = artifactResultVersion(rows?.[index]);
  const latest = chatArtifactRecords(rows)[id]?.latestVersion;
  return { id, toolUseId, ...(version && latest && version < latest ? { version } : {}) };
}

/**
 * One `artifacts` call row of a Chat. `rows` / `index`: the displayed rows and this one's place; `selected`: the open
 * panel ({id, toolUseId?} or null); `onOpen({id, toolUseId, version?})` opens it, `onClose` closes it.
 */
export function SourceChatArtifactCard({ rows, index, threadId, isStreaming = false, selected = null, onOpen, onClose }) {
  const item = rows?.[index];
  const block = artifactToolUse(item);
  if (block?.type !== 'tool_use') return null;
  const { cellType, first, last } = artifactCellOf(rows, index);
  const host = { artifacts: chatArtifactRecords(rows), closeDrawer: () => onClose?.(),
    selected: selected?.id ? { type: 'artifact', id: selected.id, ...(selected.toolUseId ? { toolUseId: selected.toolUseId } : {}) } : null };
  return <ChatArtifactCardContext.Provider value={host}>
    <ChatArtifactToolBlock input={block.input} conversationUuid={threadId} toolResult={artifactToolResult(item)} isStreaming={isStreaming}
      onOpenArtifact={(id, messageUuid, versionUuid, { toolUseId } = {}) => onOpen?.(artifactOpenRequest(rows, index, id, toolUseId))} message={{ uuid: item.turnId ?? item.id }}
      toolUseId={item.id} artifactCellType={cellType} isFirstBlockOfMessage={first} isLastBlockOfMessage={last} />
  </ChatArtifactCardContext.Provider>;
}
