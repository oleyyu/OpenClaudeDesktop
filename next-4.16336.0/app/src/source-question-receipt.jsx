import React, { useState } from "react";
import "./source-question-receipt.css";

// vZ question receipt (approval-current.js:35628-35651), what wue (:45232-45240) renders for an
// answered AskUserQuestion with inline approvals: "epitaxy-question-receipt epitaxy-card-outline flex
// w-full max-w-[480px] flex-col overflow-clip rounded-lg select-text", one "flex flex-col gap-0.5
// px-lg py-md" pair per question (question "text-body font-medium text-primary break-words", answer
// "text-body text-secondary [overflow-wrap:anywhere]"), each text on one line (_Z :35617-35627).
// The design-system rules at :16269 add margin-bottom chat-item-gap, a border-top between pairs and
// the .2s enter fade, which plays only when the question was answered live (pk), never under
// reduced motion.

// Questions seen pending in this renderer: their receipt is the live answer and fades in.
const pendingQuestions = new Set();
const questionKey = (sessionKey, itemId) => JSON.stringify([sessionKey ?? null, itemId]);
export function notePendingQuestion(sessionKey, itemId) {
  pendingQuestions.add(questionKey(sessionKey, itemId));
}
const oneLine = (text) => String(text ?? "").split("\n").map((line) => line.trim()).filter(Boolean).join(" ");

export function SourceQuestionReceipt({ item, pairs, sessionKey = null }) {
  // The first mount after the pending row consumes the mark (React keeps the first initializer
  // result), so a later remount (session switch, scroll virtualisation) does not fade again.
  const [enter] = useState(() => pendingQuestions.delete(questionKey(sessionKey, item.id)));
  return (
    <div className="source-message sqr" data-transcript-item-id={item.id} data-cds="QuestionReceipt" data-enter={enter || undefined}>
      {pairs.map((pair, index) => (
        <div className="sqr-pair" key={`${index}-${pair.question}`}>
          <div className="sqr-question">{oneLine(pair.question)}</div>
          <div className="sqr-answer">{oneLine(pair.answer)}</div>
        </div>
      ))}
    </div>
  );
}
