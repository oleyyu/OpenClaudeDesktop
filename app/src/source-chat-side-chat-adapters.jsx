// Local services for the 3.6556.2 Chat side chat scripts/extract-chat-side-chat.mjs emits (src/generated/chat-side-chat,
// ca2ef848d T1; w13-close-chat-sidechat, E63 chatfn-branches-09). Each export replaces one original declaration, which
// the extractor feature-checks. SourceChatSideChat (source-chat-side-chat.jsx) provides ChatSideChatHost and the
// transport around the generated panel.
//
// Host facts behind these answers: no claude.ai account or organization and no GrowthBook client (E59); the side
// question is asked of the conversation's own core through codeDesktop/sideQuestion, the read-only side question the
// Code side chat already uses (session-command-model.mjs sideQuestionsSupported says where a core serves it).
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { chatSideChatStore, useChatSideChatOpen } from './generated/chat-side-chat/side-chat-store.mjs';
import { SHORTCUT_DESCRIPTIONS, shortcutBindings, shortcutMatches, shortcutString } from './chat-side-chat-model.mjs';
import { isMacPlatform } from './pane-keys-model.mjs';
import { t } from '../electron/i18n/index.mjs';

// { enabled }: whether this Chat conversation offers the side chat (p1's `enabled`, see useChatSideChatToggle).
export const ChatSideChatHost = createContext({ enabled: false });

// shared-1 WV (useShortcut): `{ description, shortcutString, matchShortcut, bindings }` for a command of the shortcut
// table, filtered to this platform and the desktop app; a matching repeat is swallowed (`t.repeat ? (t.preventDefault(),
// null)`). The host table holds the one command the side chat asks for (chat-side-chat-model.mjs SHORTCUT_BINDINGS); WV's
// VV (the shortcut analytics) is not sent (D17).
export function useShortcut(commandId, options) {
  const override = options?.override;
  const mac = isMacPlatform();
  const bindings = useMemo(() => override ?? shortcutBindings(commandId, { mac }), [commandId, mac, override]);
  const matchShortcut = useCallback((event) => {
    for (const binding of bindings) if (shortcutMatches(event, binding)) return event.repeat ? (event.preventDefault(), null) : binding;
    return null;
  }, [bindings]);
  const description = SHORTCUT_DESCRIPTIONS[commandId] ? t(SHORTCUT_DESCRIPTIONS[commandId]) : undefined;
  return useMemo(() => ({ description, shortcutString: shortcutString(bindings[0]), matchShortcut, bindings }),
    [description, bindings, matchShortcut]);
}

// ca2ef848d p1: `{ enabled, isOpen, open, close, toggle }` over the side chat store, plus the document-level keydown
// listener (capture) that toggles on btw_side_chat while enabled. The original's enabled is GrowthBook
// claudified_btw_side_chat; it also stays off on the Code routes (/epitaxy, /code: Code has its own side chat) and in a
// Cowork local agent context. Here the host mounts the panel only for a Chat conversation and answers enabled itself
// (E63 G9: on wherever the core serves side questions). The listener lives on this window's document (the original's
// owner window of `te()`). Split view puts several Chat panes in that document; the host answers enabled only for the
// focused pane (main.jsx splitActive), so one ⌘; toggles one panel, the same pane View › Side Chat acts on.
export function useChatSideChatToggle(conversationUuid) {
  const { enabled } = useContext(ChatSideChatHost);
  const { matchShortcut } = useShortcut('btw_side_chat');
  const isOpen = useChatSideChatOpen(conversationUuid);
  const open = useCallback(() => { if (conversationUuid) chatSideChatStore.getState().open(conversationUuid); }, [conversationUuid]);
  const close = useCallback(() => { if (conversationUuid) chatSideChatStore.getState().close(conversationUuid); }, [conversationUuid]);
  const toggle = useCallback(() => { if (conversationUuid) chatSideChatStore.getState().toggle(conversationUuid); }, [conversationUuid]);
  useEffect(() => {
    if (!enabled || !conversationUuid) return;
    const doc = globalThis.document;
    if (!doc) return;
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (matchShortcut(event)) { event.preventDefault(); event.stopPropagation(); toggle(); }
    };
    doc.addEventListener('keydown', onKeyDown, true);
    return () => doc.removeEventListener('keydown', onKeyDown, true);
  }, [enabled, conversationUuid, matchShortcut, toggle]);
  return useMemo(() => ({ enabled, isOpen, open, close, toggle }), [enabled, isOpen, open, close, toggle]);
}

// The transport SourceChatSideChat registers: { rpc(method, params), subscribe(handler) → unsubscribe }. Split view
// mounts one SourceChatSideChat per Chat pane in one document, so each registers for its conversation; a question goes
// to its own conversation's registration (else the latest), and releasing one pane's leaves the others in place.
const transports = [];
export function setChatSideChatTransport(value, conversationUuid = null) {
  const entry = { value, conversationUuid };
  transports.push(entry);
  return () => { const at = transports.indexOf(entry); if (at >= 0) transports.splice(at, 1); };
}
function transportFor(conversationUuid) {
  for (let i = transports.length - 1; i >= 0; i -= 1) if (transports[i].conversationUuid === conversationUuid) return transports[i].value;
  return transports.at(-1)?.value ?? null;
}

// c9451a5b2 o: POST …/chat_conversations/{id}/side_question with { question, btw_history, parent_message_uuid } and
// text deltas to onDelta until the stream ends (onComplete). Here the conversation's own core answers it:
// codeDesktop/sideQuestion { threadId, question, history, requestId } streams codeDesktop/sideQuestion/delta for that
// request and resolves with the whole answer; btw_history's { question, response } pairs are the bridge's
// { question, answer }. Abort cancels the request (codeDesktop/sideQuestion/cancel). A failure rejects, as the
// original's does, and _1 shows "Something went wrong".
export async function streamChatSideQuestion({ conversationUuid, question, btwHistory = [], signal, onDelta, onComplete }) {
  const host = transportFor(conversationUuid);
  if (!host?.rpc) throw new Error('Side chat is unavailable.');
  if (signal?.aborted) return;
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const history = (Array.isArray(btwHistory) ? btwHistory : []).map((pair) => ({ question: pair.question, answer: pair.response }));
  let streamed = '';
  const unsubscribe = host.subscribe?.((event) => {
    const params = event?.params;
    if (event?.method !== 'codeDesktop/sideQuestion/delta' || params?.threadId !== conversationUuid || params.requestId !== requestId) return;
    if (typeof params.text !== 'string' || !params.text || signal?.aborted) return;
    streamed += params.text;
    onDelta(params.text);
  });
  const cancel = () => { void Promise.resolve(host.rpc('codeDesktop/sideQuestion/cancel', { requestId })).catch(() => {}); };
  signal?.addEventListener?.('abort', cancel, { once: true });
  try {
    const result = await host.rpc('codeDesktop/sideQuestion', { threadId: conversationUuid, question, history, requestId });
    if (signal?.aborted) return;
    // A core that answers without deltas (or ends with more than it streamed) gives the rest here.
    const text = typeof result?.text === 'string' ? result.text : '';
    if (text.length > streamed.length && text.startsWith(streamed)) onDelta(text.slice(streamed.length));
    onComplete?.();
  } finally {
    signal?.removeEventListener?.('abort', cancel);
    try { unsubscribe?.(); } catch {}
  }
}
