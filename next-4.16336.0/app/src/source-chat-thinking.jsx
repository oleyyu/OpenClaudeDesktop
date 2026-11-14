// w13-chatui-thinking-search (research/w13-chatui.md chatui-C9/C10): a Chat conversation's thought and search rows as the
// 3.6556.2 Chat timeline draws them. The desktop Chat conversation (c21f11e6d CoworkSessionView) renders claude.ai's
// message timeline (cc1aae219), whose rows are `nS.Step` (nS = c734f318c TurnStatus, generated/working-line) with
//   label     the group label: c05b96c7f Gg for a run of thinking ("Thought for {seconds}s" …, else "Thought process"),
//             shared-130 uq for a run of one tool kind ("Searched the web", "Read a page", "Searched project knowledge");
//   state     running while the block streams, else done;
//   children  the thought itself (as c96d752d0 gX hands its text to the Step), only on a thinking row; the Step is not
//             controlled (no `open`), so a thought starts folded and opens on its toggle.
// Labels come from src/chat-thinking-model.mjs. Code keeps its own rows: the transcript marks a Chat conversation with
// ChatThinkingSurface (default false).
import React, { createContext, useContext } from "react";
import { TurnStatus } from "./generated/working-line/turn-status.mjs";
import { reasoningText } from "./transcript-item-visibility.mjs";
import { plainReasoningText } from "./reasoning-model.mjs";
import { chatRowState, chatSearchLabel, chatSearchRun, chatThinkingLabel, chatThinkingRow } from "./chat-thinking-model.mjs";

export { chatThinkingRow };

/** True inside a Chat conversation's transcript (the provider sits where the transcript knows its surface). */
export const ChatThinkingSurface = createContext(false);
export const useChatThinkingSurface = () => useContext(ChatThinkingSurface);

// w13-close-chat-messages: the step's state follows its own block (chatRowState), and a host tool group of one search
// kind is one step labelled over its count (chatSearchRun, B_ / R_ → uq).
export function SourceChatThinking({ item, isStreaming = false }) {
  const state = chatRowState(item, isStreaming);
  if (item?.type === "reasoning") {
    // The same plain text the Code thought shows and copies (no Markdown markers).
    const text = plainReasoningText(reasoningText(item));
    if (!text.trim()) return null;
    return <div className="source-message source-chat-thinking" data-transcript-item-id={item.id} data-chat-row="thinking">
      <TurnStatus.Step state={state} label={chatThinkingLabel([item])}>{text}</TurnStatus.Step>
    </div>;
  }
  const label = chatSearchLabel(chatSearchRun(item) ?? [item]);
  if (!label) return null;
  return <div className="source-message source-chat-thinking" data-transcript-item-id={item.id} data-chat-row="search">
    <TurnStatus.Step state={state} label={label} />
  </div>;
}
