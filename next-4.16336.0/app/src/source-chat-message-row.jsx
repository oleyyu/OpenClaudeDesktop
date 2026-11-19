// chat-conversation r1-01: the Chat transcript's reply row. cc1aae219 JY (classic layout) draws one assistant message
// and its toolbar in `_("div", { className: Ln, children: [Rn, zn, Bn, Hn, Fn, Un] })` with Ln = "group group/message-row"
// (Rn the assistant message, Bn the MessageActions). The official CSS reveals the toolbar from that row:
// `.cds-root .group\/message-row:hover [data-cds=MessageActions][data-reveal]` (and :focus-within).
// Locally one reply is the turn's run of response rows (thinking / search rows, artifact cards, the answer) and its
// toolbar sits in the last row's fragment, so the run is wrapped as one row; prompts stay outside (their own row).
// chat-conversation r3-03: the run is ONE assistant message (Rn = kw with one h3 and one jw holding every row, in item
// order); what the rows draw after themselves as the turn's reply chrome (row boundaries of kind "reply": toolbar,
// warning, task events, error) is portaled after the kw (ChatReplyAfterSlot), as JY's zn / Bn follow Rn.
import React, { useCallback, useMemo, useState } from "react";
import { ChatReplyAfterSlot, ChatReplyMessage, SourceChatAssistantMessage } from "./source-chat-assistant-message.jsx";
import "./source-chat-message-row.css";

export const CHAT_REPLY_ROW_CLASS = "group group/message-row";

/** The rows split into prompts / unturned rows (alone) and each turn's run of response rows (one group). */
export function chatReplyRuns(rows) {
  const runs = [];
  let run = null;
  rows.forEach((row, index) => {
    const turnId = row?.turnId ?? null;
    if (!turnId || row.type === "userMessage") { run = null; runs.push({ rows: [index], reply: false }); return; }
    if (run && run.turnId === turnId) { run.rows.push(index); return; }
    run = { turnId, rows: [index], reply: true };
    runs.push(run);
  });
  return runs;
}

/** JY's At source: the reply's text (its answers, in order). */
export function chatReplyText(rows) {
  return rows.filter((row) => row?.type === "agentMessage" || row?.type === "plan").map((row) => row.text ?? "").filter((text) => text.trim()).join("\n\n");
}

function ChatReplyRow({ rows, last, turnStart = false, children }) {
  const [slot, setSlot] = useState(null);
  const [streaming, setStreaming] = useState(() => new Set());
  const reportStreaming = useCallback((itemId, on) => setStreaming((current) => {
    if (current.has(itemId) === !!on) return current;
    const next = new Set(current);
    if (on) next.add(itemId); else next.delete(itemId);
    return next;
  }), []);
  const message = useMemo(() => ({ reportStreaming }), [reportStreaming]);
  const first = rows[0];
  const isStreaming = streaming.size > 0;
  return <div className={CHAT_REPLY_ROW_CLASS} data-chat-reply-row={last ? "last" : ""}>
    <ChatReplyMessage.Provider value={message}><ChatReplyAfterSlot.Provider value={slot}>
      <SourceChatAssistantMessage itemId={first.id} text={chatReplyText(rows)} isStreaming={isStreaming}
        turnStart={turnStart}>{children}</SourceChatAssistantMessage>
    </ChatReplyAfterSlot.Provider></ChatReplyMessage.Provider>
    <div ref={setSlot} className="contents" data-chat-reply-after="" />
  </div>;
}

/** rows.map(render), with each turn's response rows inside one `div.group.group/message-row` > one assistant message. */
export function chatMessageRows(rows, render) {
  const runs = chatReplyRuns(rows);
  const lastReply = runs.findLastIndex((run) => run.reply);
  return runs.map((run, at) => {
    const drawn = run.rows.map((index) => render(rows[index], index, rows));
    if (!run.reply) return drawn[0];
    const head = run.rows[0];
    return <ChatReplyRow key={`reply:${rows[head].id}`} rows={run.rows.map((index) => rows[index])} last={at === lastReply}
      turnStart={rows[head].turnId !== rows[head - 1]?.turnId}>{drawn}</ChatReplyRow>;
  });
}
