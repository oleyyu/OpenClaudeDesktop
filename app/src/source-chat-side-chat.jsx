// w13-close-chat-sidechat (G9, E63 chatfn-branches-09): the 3.6556.2 Chat side chat, ca2ef848d T1 as generated in
// src/generated/chat-side-chat (scripts/extract-chat-side-chat.mjs). A Chat conversation page mounts it beside the
// transcript (`lc = f(T1, { organizationUuid: ac ?? null, conversationUuid: s, parentMessageUuid: fi,
// inheritedMessageCount: tc })`); ⌘; (btw_side_chat) toggles it. The Code side chat (source-side-chat.jsx, cccc2cf0a)
// stays the Code surface's panel.
//
// The host provides: whether the panel is offered (ChatSideChatHost.enabled), the core transport for the side question
// (codeDesktop/sideQuestion, see source-chat-side-chat-adapters.jsx), and RoutinesSharedHost's navigate for T1's router
// push: "Branch to new chat" pushes `/new?q=<prompt>`, which here opens a new chat with that prompt in its composer.
// Only main.jsx imports this module (not in the chat/composer/menu graph of E41).
import React, { useEffect, useMemo } from 'react';
import { ChatSideChat } from './generated/chat-side-chat/side-chat-panel.mjs';
import { ChatSideChatHost, setChatSideChatTransport } from './source-chat-side-chat-adapters.jsx';
import { RoutinesSharedHost } from './source-routines-shared-adapters.jsx';
import { CHAT_SIDE_CHAT_ORGANIZATION, chatSideChatBranchText } from './chat-side-chat-model.mjs';

const desktopEvents = (handler) => globalThis.desktop?.onEvent?.(handler);

export function SourceChatSideChat({ conversationId, enabled, inheritedMessageCount = 0, rpc, subscribe = desktopEvents, onBranch }) {
  useEffect(() => setChatSideChatTransport({ rpc, subscribe }, conversationId), [rpc, subscribe, conversationId]);
  const gate = useMemo(() => ({ enabled: !!enabled }), [enabled]);
  const router = useMemo(() => ({
    navigate(href) { const text = chatSideChatBranchText(href); if (text !== null) onBranch?.(text); },
    pathname: '', search: '', bridge: undefined, models: [],
  }), [onBranch]);
  if (!conversationId) return null;
  return <ChatSideChatHost.Provider value={gate}>
    <RoutinesSharedHost.Provider value={router}>
      <ChatSideChat organizationUuid={CHAT_SIDE_CHAT_ORGANIZATION} conversationUuid={conversationId} parentMessageUuid={null}
        inheritedMessageCount={inheritedMessageCount} />
    </RoutinesSharedHost.Provider>
  </ChatSideChatHost.Provider>;
}
