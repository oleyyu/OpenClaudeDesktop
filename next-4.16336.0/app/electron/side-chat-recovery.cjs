"use strict";
const { SideChatHistory, escapeSideHistory, escapeAssistantMentions } = require("./generated/side-chat-history.cjs");

// The renderer owns the visible transcript; only a replacement fork needs it.
// Original XU keeps 20 user messages / 80k total characters, with an 8k limit
// per entry and surrogate-safe truncation. It also prevents old assistant @
// text from becoming a new file mention and escapes the history closing tag.
function sideChatRecoveryQuestion(exchanges, question, { customPrompt = false } = {}) {
  const history = new SideChatHistory();
  for (const entry of Array.isArray(exchanges) ? exchanges : []) {
    if (typeof entry?.question !== "string" || typeof entry?.answer !== "string" || !entry.question.trim() || !entry.answer.trim()) continue;
    history.recordUser(entry.question);
    history.recordAssistant(entry.answer);
    history.endTurn();
  }
  if (!history.hasUserMessage()) return question;
  if (customPrompt) {
    // Keep the user's prompt as the only instructions: restore conversation
    // data without the original source's recovery directions.
    const transcript = history.entries.map(entry => `${entry.role === "user" ? "User" : "Assistant"}: ${escapeSideHistory(entry.role === "assistant" ? escapeAssistantMentions(entry.text) : entry.text)}`).join("\n\n");
    return `<side_chat_history>\n${transcript}\n</side_chat_history>\n\n${question}`;
  }
  history.recordUser(question);
  return history.buildReplayPrompt();
}

module.exports = { sideChatRecoveryQuestion };
