// Codex's asynchronous questions (request_user_input_async) under the message that asks them. The turn keeps
// running, so this card never blocks the composer: picking an option or typing an answer and pressing Send answers
// as an ordinary message (steered into the running turn, or as the next turn); Skip dismisses it. There is no official
// counterpart (Codex-only), so it wears the question card's 3.6556.2 dt structure (source-question-card.jsx): the
// c2d1aeb56 shell / body classes, shared-5 bL's title row with dt's n/m pill, c9ed5627b ut option rows, the Other row
// with CdsTextArea, and Back / Skip / primary CdsButtons. No digit shortcuts or approval plumbing.
import React, { createContext, useContext, useId, useRef, useState } from "react";
import { CdsButton, CdsTextArea, cdsClassNames } from "./generated/view-tabs/index.js";
import { asyncAnswerText, asyncQuestionsOf } from "./async-questions-model.mjs";
import { QuestionOptionRow, selectedRowClass, preventMouseDown, otherFieldArrowKeys, stopClickPropagation } from "./generated/question-card/option-row.mjs";
import { QuestionCardHeader, questionDisplayText } from "./generated/question-card/card-header.mjs";
import { questionRowMouseDown, questionEndsDragSelect } from "./generated/question-card/row-pointer.mjs";
import "./source-async-questions.css";
import { t } from "../electron/i18n/index.mjs";

// The same class strings as source-question-card.jsx (c2d1aeb56 V + epitaxy-card-outline, c2d1aeb56 Y over J).
const CARD_SHELL = "epitaxy-approval-card relative isolate flex flex-col rounded-card p-[12px] gap-[12px] max-h-[60vh] origin-top @container animate-code-approval-promote group-data-[skip-approval-enter]/approval-dock:animate-none motion-reduce:animate-none";
const CARD_BODY = "epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus epitaxy-approval-body flex min-h-0 flex-col gap-[12px] overflow-y-auto -mx-[12px] px-[12px] -mt-[4px] pt-[4px] -mb-[8px] pb-[8px] [&>*]:shrink-0";
const PROGRESS_PILL = "grid shrink-0 place-items-center rounded-full bg-warning px-sm text-caption tabular-nums text-warning";

/** { settled: Set<itemId>, answer(itemId, text) → Promise, skip(itemId), canAnswer: boolean } from the session view. */
export const AsyncQuestionsContext = createContext(null);

export function SourceAsyncQuestions({ item }) {
  const context = useContext(AsyncQuestionsContext);
  const questions = asyncQuestionsOf(item);
  const [page, setPage] = useState(0);
  const [choices, setChoices] = useState({}); // page → {kind: 'option', label} | {kind: 'other'}
  const [texts, setTexts] = useState({}); // page → typed answer
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const questionId = useId();
  const pressRef = useRef(null), pressAbort = useRef(null), pointer = useRef(null);
  pointer.current ??= { down: questionRowMouseDown({ un: pressRef, dn: pressAbort }), ends: questionEndsDragSelect({ un: pressRef }) };
  if (!context || !questions.length || context.settled?.has(item.id)) return null;
  const question = questions[Math.min(page, questions.length - 1)];
  const at = Math.min(page, questions.length - 1);
  const hasOptions = question.options.length > 0;
  const choice = choices[at];
  const custom = !hasOptions || choice?.kind === "other";
  const answerAt = (index) => {
    const picked = choices[index];
    if (questions[index].options.length && picked?.kind === "option") return picked.label;
    return texts[index] ?? "";
  };
  const answers = questions.map((_, index) => answerAt(index));
  const text = asyncAnswerText(questions, answers);
  const last = at === questions.length - 1;
  const unavailable = busy || !context.canAnswer;
  const submit = async () => {
    if (!last) { setPage(at + 1); return; }
    if (!text || unavailable) return;
    setBusy(true);
    setError("");
    try { await context.answer(item.id, text); }
    catch (e) { setError(e?.message || t("Your answer couldn’t be sent. Try again.")); }
    finally { setBusy(false); }
  };
  const pick = (index) => {
    if (unavailable) return;
    const option = question.options[index];
    const checked = choice?.kind === "option" && choice.label === option;
    setChoices((all) => ({ ...all, [at]: checked ? undefined : { kind: "option", label: option } }));
  };
  return (
    <div className={cdsClassNames("source-async-questions", CARD_SHELL, "epitaxy-card-outline", "outline-none")} role="group"
      aria-labelledby={questionId} data-async-questions={item.id}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.repeat) { event.preventDefault(); void submit(); }
      }}>
      <div className={CARD_BODY}>
        <QuestionCardHeader titleNamesCard
          leading={questions.length > 1
            ? <span className={PROGRESS_PILL} style={{ height: "var(--cds-leading-body)" }}>{at + 1}/{questions.length}</span>
            : undefined}>
          <span id={questionId} className="block select-text whitespace-pre-wrap [unicode-bidi:plaintext]">{questionDisplayText(question.title)}</span>
        </QuestionCardHeader>
        <div className="flex flex-col gap-0.75">
          {question.options.map((option, index) => (
            <QuestionOptionRow key={`${index}-${option}`} option={{ label: option }} index={index}
              isSelected={choice?.kind === "option" && choice.label === option} isHighlighted={false} isMultiSelect={false}
              showDigitHint={false} onRowMouseDown={pointer.current.down} endsDragSelect={pointer.current.ends} onOptionClick={pick} />
          ))}
          <div className={`flex flex-col gap-[12px] rounded-[5px] px-md py-md ${custom && hasOptions ? selectedRowClass : "bg-alpha-1 hover:bg-alpha-2"}`}>
            {hasOptions && (
              <button type="button" onMouseDown={pointer.current.down}
                className="flex items-center gap-sm text-body text-primary text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"
                onClick={(event) => { if (!pointer.current.ends(event) && !unavailable) setChoices((all) => ({ ...all, [at]: { kind: "other" } })); }}>
                <span className="flex-1 select-text">{t("Other")}</span>
              </button>
            )}
            <CdsTextArea rows={1} autosize style={{ maxHeight: "calc(4lh + 2 * var(--cds-pad-sm))" }} value={texts[at] ?? ""}
              disabled={unavailable} tabIndex={custom ? 0 : -1}
              aria-label={hasOptions ? t("Other option") : question.title} placeholder={hasOptions ? t("Type your own answer here") : t("Write your answer")}
              autoComplete="off" spellCheck onClick={stopClickPropagation} onKeyDown={otherFieldArrowKeys}
              onFocus={() => { if (hasOptions && !custom) setChoices((all) => ({ ...all, [at]: { kind: "other" } })); }}
              onChange={(event) => { const value = event.target.value; setTexts((all) => ({ ...all, [at]: value })); }} />
          </div>
        </div>
      </div>
      {error && <p className="text-footnote text-danger" role="alert">{error}</p>}
      <div className="flex items-center justify-end gap-[8px]">
        {at > 0 && <CdsButton variant="secondary" className="me-auto" onMouseDown={preventMouseDown} disabled={busy} onClick={() => setPage(at - 1)}>{t("Back")}</CdsButton>}
        <CdsButton variant="secondary" onMouseDown={preventMouseDown} disabled={busy} onClick={() => context.skip(item.id)}>{t("Skip")}</CdsButton>
        <CdsButton variant="primary" onMouseDown={preventMouseDown} busy={busy} disabled={!busy && (unavailable || (last && !text))}
          onClick={() => { if (!busy) void submit(); }}>
          {last ? t("Send answer") : t("Next")}
        </CdsButton>
      </div>
    </div>
  );
}
