// Questions Codex asks without stopping (request_user_input_async): they arrive on an agentMessage item with
// delivery 'async' and questions [{title, options?}] (app-server-protocol v2 item.rs AgentMessage,
// protocol items.rs AsyncUserInputQuestion). The Codex TUI keeps them in an answer editor above the composer
// (bottom_pane/async_questions) and sends an answer as an ordinary user message while the turn keeps running.

const MAX_OPTIONS = 32, MAX_OPTION_LENGTH = 512;

/** An item's asynchronous questions, bounded as the TUI bounds them (32 options of at most 512 characters), or []. */
export function asyncQuestionsOf(item) {
  if (item?.type !== 'agentMessage' || !Array.isArray(item.questions)) return [];
  return item.questions
    .filter((question) => question && typeof question.title === 'string' && question.title.trim())
    .map((question) => ({
      title: question.title.trim(),
      options: (Array.isArray(question.options) ? question.options : [])
        .slice(0, MAX_OPTIONS)
        .filter((option) => typeof option === 'string' && option.trim() && option.length <= MAX_OPTION_LENGTH),
    }));
}

/**
 * The agentMessage ids whose questions are settled by the transcript itself: a user message came after them (the
 * answer, or the user moved on), so a reopened session doesn't ask again.
 */
export function settledQuestionIds(items) {
  const settled = new Set();
  let laterUser = false;
  for (let index = (Array.isArray(items) ? items.length : 0) - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.type === 'userMessage') laterUser = true;
    else if (laterUser && item?.type === 'agentMessage' && Array.isArray(item.questions) && item.questions.length) settled.add(item.id);
  }
  return settled;
}

/**
 * The user message that answers them, in English for the model: one answer names its question; several are listed.
 * answers: one string per question ('' or missing for a question left unanswered). null when nothing was answered.
 */
export function asyncAnswerText(questions, answers) {
  const pairs = (questions ?? []).map((question, index) => [question.title, typeof answers?.[index] === 'string' ? answers[index].trim() : ''])
    .filter(([, answer]) => answer);
  if (!pairs.length) return null;
  if (pairs.length === 1) return `Answer to your question "${pairs[0][0]}":\n${pairs[0][1]}`;
  return `Answers to your questions:\n${pairs.map(([title, answer]) => `- "${title}": ${answer}`).join('\n')}`;
}
