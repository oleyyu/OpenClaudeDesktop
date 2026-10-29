// w13-chatui-thinking-search (research/w13-chatui.md chatui-C9/C10): the Chat conversation's thought and search labels from
// the host's transcript items, through the 3.6556.2 originals (src/generated/chat-thinking). Pure: plain node imports it
// (E42), the generated modules have no imports of their own.
//
//   thinking   c05b96c7f Gg over the official block shape { type: "thinking", thinking, start_timestamp, stop_timestamp }:
//              a reasoning item's item/started startedAtMs and item/completed completedAtMs (transcript-runtime-stats.mjs)
//              become the two ISO timestamps, so a finished thought reads "Thought for 12s" (Bs) and one without both
//              lifecycle times (a replayed turn, a thought still streaming) reads "Thought process".
//   search     shared-130 uq by the kind shared-130 rq gives a tool name: the core's webSearch item is the official
//              web_search ("Searched the web"), its openPage / findInPage action web_fetch ("Read a page"); a dynamic or MCP
//              tool keeps its own name (project_knowledge_search → "Searched project knowledge", conversation_search →
//              "Searched past chats").
import { t } from '../electron/i18n/index.mjs';
import { thinkingGroupLabel, thinkingBlockLabel } from './generated/chat-thinking/thinking-labels.mjs';
import { toolGroupLabel, TOOL_KINDS } from './generated/chat-thinking/tool-group-label.mjs';

/** The intl the originals take (`e.formatMessage(descriptor, values)`): the English defaultMessage through the host t(). */
export const chatIntl = Object.freeze({ formatMessage: (descriptor, values) => t(descriptor?.defaultMessage ?? '', values) });

const iso = ms => (Number.isFinite(ms) && ms >= 0 ? new Date(ms).toISOString() : undefined);

/** A host reasoning item as the official thinking block (c05b96c7f Vg / Wg / Gg read these fields). */
export function thinkingBlock(item, text = '') {
  return { type: 'thinking', thinking: text, start_timestamp: iso(item?.startedAtMs), stop_timestamp: iso(item?.completedAtMs) };
}

/** Gg: the label of a run of thoughts ("Thought for {seconds}s" … or "Thought process"). */
export function chatThinkingLabel(items, intl = chatIntl) {
  return thinkingGroupLabel(intl, (Array.isArray(items) ? items : [items]).map(item => thinkingBlock(item)));
}

/** Wg: one thought's own duration label, undefined without both lifecycle times. */
export function chatThinkingDuration(item, intl = chatIntl) {
  return thinkingBlockLabel(intl, thinkingBlock(item));
}

// The rq kinds a Chat search reads as (uq's search labels); other tools keep the Code rows.
export const CHAT_SEARCH_KINDS = Object.freeze(['web', 'web_fetch', 'project_knowledge', 'past_chats', 'drive_search']);

/** The rq kind of a search item, or null when the item is not one of CHAT_SEARCH_KINDS. */
export function chatSearchKind(item) {
  if (item?.type === 'webSearch') {
    const action = item.action?.type;
    return action === 'openPage' || action === 'findInPage' ? 'web_fetch' : 'web';
  }
  if (item?.type !== 'dynamicToolCall' && item?.type !== 'mcpToolCall') return null;
  const name = typeof item.tool === 'string' ? item.tool : '';
  const kind = Object.hasOwn(TOOL_KINDS, name) ? TOOL_KINDS[name] : null;
  return CHAT_SEARCH_KINDS.includes(kind) ? kind : null;
}

/** uq: "Searched the web", "Read a page" / "Read {count} pages", "Searched project knowledge", …; null when not a search. */
export function chatSearchLabel(items, intl = chatIntl) {
  const list = Array.isArray(items) ? items : [items];
  const kind = chatSearchKind(list[0]);
  if (!kind || list.some(item => chatSearchKind(item) !== kind)) return null;
  return toolGroupLabel(intl, kind, list.length) ?? null;
}

/**
 * w13-close-chat-messages (chatui-thinking-search-03): the host's tool group (file-tool-model groupFileTools folds
 * consecutive tool calls) whose members are all one Chat search kind is one run of that kind, as c05b96c7f B_ / R_ label
 * a run with shared-130 uq over its count ("Read 3 pages", "Searched the web"). Its members, else null.
 */
export function chatSearchRun(item) {
  if (item?.type !== 'fileToolGroup' || !Array.isArray(item.toolGroup) || !item.toolGroup.length) return null;
  const kind = chatSearchKind(item.toolGroup[0]);
  return kind && item.toolGroup.every((member) => chatSearchKind(member) === kind) ? item.toolGroup : null;
}

/** Rows a Chat conversation draws as the official timeline step instead of the Code row. */
export function chatThinkingRow(item) {
  return item?.type === 'reasoning' || chatSearchKind(item) !== null || chatSearchRun(item) !== null;
}

const RUNNING = new Set(['inProgress', 'running']);
/**
 * w13-close-chat-messages: a step runs only while its own block does (the official block's stop_timestamp / tool
 * status), not while the rest of the turn streams: a thought is done once item/completed stamped completedAtMs, a search
 * once its call left inProgress.
 */
export function chatRowState(item, isStreaming = false) {
  if (item?.type === 'reasoning') return isStreaming && !Number.isFinite(item.completedAtMs) ? 'busy' : 'done';
  const members = chatSearchRun(item) ?? [item];
  return members.some((member) => RUNNING.has(member?.status)) ? 'busy' : 'done';
}
