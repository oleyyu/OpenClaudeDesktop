// Local services for the 4.16336.0 Chat side chat scripts/extract-chat-side-chat-v4.mjs emits (src/generated/chat-side-chat-v4,
// ca2ef848d b0 / h0 and the shared-2 h0 store; round 2 unit chat-side-chat). Each export answers one original
// declaration, which the extractor feature-checks and pins (HOST_ADAPTERS / ADAPTER_PINS). Staged only: the host still
// mounts the 3.6556.2 panel (src/source-chat-side-chat.jsx); see round2/chat-side-chat/patches/ for the switch.
//
// Re-exported unchanged from the host adapter that documents each (same semantics as for the 3.6556.2 graph):
//   shared-1 C6 useShortcut, c9451a5b2 o streamChatSideQuestion      -> source-chat-side-chat-adapters.jsx
//   shared-25 $u useRouter, vendor-intl q useIntl / Gt FormattedMessage -> source-routines-shared-adapters.jsx
//   shared-0 qB reportError                                           -> source-routine-cowork-adapters.jsx
//   c89efce1a Mu ChatMemoryMarkdown                                   -> source-chat-knowledge-adapters.jsx
// ChatSideChatHost (whether this Chat conversation offers the panel) and the transport registry stay the ones of
// source-chat-side-chat-adapters.jsx, so a host provides them once for either graph.
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { chatSideChatStore, useChatSideChatOpen } from './generated/chat-side-chat-v4/side-chat-store.mjs';
import { ChatSideChatHost, useShortcut } from './source-chat-side-chat-adapters.jsx';
import { useCdsOwnerWindow } from './cds-core.mjs';

export { useShortcut, streamChatSideQuestion } from "./source-chat-side-chat-adapters.jsx";
export { useRouter, useIntl, FormattedMessage } from "./source-routines-shared-adapters.jsx";
export { reportError } from "./source-routine-cowork-adapters.jsx";
export { ChatMemoryMarkdown } from "./source-chat-knowledge-adapters.jsx";

// ca2ef848d c0 (3.6556.2 p1): `{ enabled, isOpen, open, close, toggle }` over the side chat store (shared-2 h0, this
// graph's own copy: open / close / toggle are its actions, isOpen is shared-2 v0), plus the keydown listener (capture)
// on the owner window's document that toggles on btw_side_chat while enabled, skipping key repeats. The original's
// enabled is GrowthBook claudified_btw_side_chat (shared-25 ko); it stays off on the Code routes (/epitaxy, /code, via
// the router store shared-25 bu and shared-123 wS) and its listener ignores the key in a Cowork local agent context
// (shared-6 XD, shared-123 IV). None of these exist here: the host mounts the panel only for a Chat conversation and
// answers enabled through ChatSideChatHost (E63 G9: on wherever the core serves side questions; split view answers it
// only for the focused pane, so one ⌘; toggles one panel). The owner window is cds-core's useCdsOwnerWindow (shared-frame
// mo, the window of the CDS owner anchor), the window c0 reads through `ve(ne())`.
export function useChatSideChatToggle(conversationUuid) {
  const { enabled } = useContext(ChatSideChatHost);
  const { matchShortcut } = useShortcut('btw_side_chat');
  const ownerWindow = useCdsOwnerWindow();
  const isOpen = useChatSideChatOpen(conversationUuid);
  const open = useCallback(() => { if (conversationUuid) chatSideChatStore.getState().open(conversationUuid); }, [conversationUuid]);
  const close = useCallback(() => { if (conversationUuid) chatSideChatStore.getState().close(conversationUuid); }, [conversationUuid]);
  const toggle = useCallback(() => { if (conversationUuid) chatSideChatStore.getState().toggle(conversationUuid); }, [conversationUuid]);
  useEffect(() => {
    if (!enabled || !conversationUuid) return;
    const doc = ownerWindow?.document;
    if (!doc) return;
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (matchShortcut(event)) { event.preventDefault(); event.stopPropagation(); toggle(); }
    };
    doc.addEventListener('keydown', onKeyDown, true);
    return () => doc.removeEventListener('keydown', onKeyDown, true);
  }, [ownerWindow, enabled, conversationUuid, matchShortcut, toggle]);
  return useMemo(() => ({ enabled, isOpen, open, close, toggle }), [enabled, isOpen, open, close, toggle]);
}
