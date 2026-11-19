// chat-conversation r3-02: the end of a Chat conversation, as ca2ef848d ele draws it on a plain chat route (not a local
// session: le = false, so no working row, no status-line marks; turnStatusOwnsSpark is unlisted in host-growthbook, so
// _e = We = false and the footer spark shows):
//   f("div", { ref: a, "data-paints-nothing": ut, className: dt, children: [ft, yt, bt, xt] })     // ft / bt / xt: null here
//   yt = f("div", { ref: Xe, "data-testid": "chat-footer-row", className: gt, children: [_t, vt] })
//   gt = l(pt, "ms-[calc(var(--msg-text-inset,0.5rem)_-_0.25rem)] items-center transition-transform duration-300 ease-out", mt, ht)
//        pt "flex" (rt: Te is false off a local session), mt "mt-6" (et: no status row), ht "-translate-y-[1.625rem]" while
//        streaming (Ge = t && !q; q, lastReplyAtRest, is not passed by the Chat page)
//   _t = st("chat-footer-spark", Ye ? "idle" : ue, …) → Zce (generated ChatFooterSpark) with footerDots He = false
//        (Te false, ze false without _e), so it draws W$ in avatarState ue (shared-153 cW over lse's reading of the reply:
//        "thinking" before the reply has content, "shimmer" while a tool runs, "writing" while it streams, else "idle").
// The host's error card, retry status and reconnect line stay where the host draws them (main.jsx); vt (Dce / Vce) has
// nothing to show for a local chat.
import React from 'react';
import { ChatFooterSpark } from './generated/chat-messages-v4/index.mjs';

export const CHAT_FOOTER_ROW_CLASS = 'flex ms-[calc(var(--msg-text-inset,0.5rem)_-_0.25rem)] items-center transition-transform duration-300 ease-out mt-6';
const TOOL_ITEMS = new Set(['commandExecution', 'webSearch', 'mcpToolCall', 'dynamicToolCall', 'fileChange', 'collabAgentToolCall', 'imageGeneration']);

/** shared-153 cW over the running turn's rows: the spark's avatar state. */
export function chatFooterAvatarState({ working = false, turnId = null, items = null } = {}) {
  if (!working) return 'idle';
  const rows = (items || []).filter((row) => row?.turnId === turnId && row.type !== 'userMessage');
  if (rows.length === 0) return 'thinking';
  const last = rows.at(-1);
  if (TOOL_ITEMS.has(last.type) && last.status !== 'completed' && last.status !== 'failed') return 'shimmer';
  return 'writing';
}

export function SourceChatFooter({ avatarState = 'idle', isStreaming = false, status = null }) {
  return <div data-transcript-status={status ?? undefined}>
    <div data-testid="chat-footer-row" className={`${CHAT_FOOTER_ROW_CLASS}${isStreaming ? ' -translate-y-[1.625rem]' : ''}`}>
      <ChatFooterSpark testId="chat-footer-spark" hidden={false} collapsed={false} atWorkingRow={false} avatarState={avatarState}
        footerDots={false} isCompacting={false} isStreaming={!!isStreaming} />
    </div>
  </div>;
}
