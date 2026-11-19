// chat-conversation r2-02: a Chat answer's message as cc1aae219 JY draws it on the classic branch (the host leaves
// cdsAssistantMessageRoot off, D29/D31):
//   _(kw, { "data-testid": "assistant-message", "data-is-streaming": Tn,
//           className: p("relative", !ie && !(ae && !i && !In) && "pb-[var(--msg-assistant-pb,0.75rem)]", q && "message-fade-up"),
//           children: [m("h3", { "data-find-omitted": "", className: "sr-only select-none", "aria-hidden": !At || void 0, children: At }),
//                      m(jw, { id: Sn, ref: Lt, stackBlocks: wn, children: m(MP.Provider, { value: sn, children: Qt }) }), Mn, Pn] })
// kw / jw are c7dd2633f N / P (generated/chat-messages-v4 AssistantMessageRoot / AssistantMessageText). At is
// "Claude responded: {summary}" (csr9dd5Yrj, the assistant's name here); ie (awaitingFirstBlock), ae (drawnAlone) and q
// (the fade-up entrance) are off for a local row; wn (stackBlocks, shared-38 io: the uniformBlockSpacing gate) is off.
// The row keeps the transcript's own hooks: data-transcript-item-id / data-turn-start (feed rows, find, scroll anchors)
// and the `source-message` marker the row spacing and feed walk read.
// chat-conversation r3-03: JY draws ONE kw per assistant message, and Qt is every content block of it in order (thinking
// and tool steps, artifact blocks, text). Locally one reply is the turn's run of response rows, so the reply row
// (source-chat-message-row.jsx) draws one kw around all of them; each answer row inside draws only its text
// (ChatReplyMessage: true), and the turn's toolbar / warning / task events / error (row boundaries of kind "reply")
// go after the kw, in the group row (ChatReplyAfterSlot), as JY's Bn / zn follow Rn.
import React, { createContext, useContext, useId } from 'react';
import { AssistantMessageRoot, AssistantMessageText } from './generated/chat-messages-v4/index.mjs';
import { responseHeading } from './transcript-feed-nav.mjs';

// r2-03: cc1aae219's sent-prompt row `sr = p("mb-1", or, "group group/message-row")`, or = "mt-[var(--msg-gap,1.5rem)]" (not stacked).
export const CHAT_USER_ROW_CLASS = 'mb-1 mt-[var(--msg-gap,1.5rem)] group group/message-row';
export const CHAT_ASSISTANT_MESSAGE_CLASS = 'relative pb-[var(--msg-assistant-pb,0.75rem)]';

/** r3-03: inside a reply's kw — { reportStreaming(itemId, streaming) } — or null outside one. */
export const ChatReplyMessage = createContext(null);
export const useChatReplyMessage = () => useContext(ChatReplyMessage);
/** r3-03: the reply row's node after its kw (a DOM element), null before it mounts; undefined outside a Chat reply row. */
export const ChatReplyAfterSlot = createContext(undefined);

export function SourceChatAssistantMessage({ itemId, text = '', isStreaming = false, turnStart = false, children, after = null }) {
  const id = useId();
  const heading = responseHeading(text, { streaming: isStreaming });
  return <AssistantMessageRoot data-testid="assistant-message" data-is-streaming={!!isStreaming}
    className={`${CHAT_ASSISTANT_MESSAGE_CLASS} source-message source-assistant-message`}
    data-transcript-item-id={itemId} data-turn-start={turnStart || undefined}>
    <h3 data-find-omitted="" className="sr-only select-none" aria-hidden={!heading || undefined}>{heading}</h3>
    <AssistantMessageText id={id} stackBlocks={false}>{children}</AssistantMessageText>
    {after}
  </AssistantMessageRoot>;
}
