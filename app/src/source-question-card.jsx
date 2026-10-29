// The AskUserQuestion / requestUserInput card in 3.6556.2's dt structure (c9ed5627b-BSPWYeYQ.js dt, exported `t`). The
// rows, the title row, the row pointer handlers and the document-level digit listener are the original bindings
// (src/generated/question-card, scripts/extract-question-card.mjs); the card drives them with the host's question
// runtime (approval-draft-model) in place of dt's question hook (c8cf7b513 Oe), whose state maps as:
//   currentQuestionIndex F = draft.page, selectedIndices I = the chosen rows (-1 Other), highlightedIndex L =
//   `highlight`, otherText R = the answer's customText, handleOptionClick B = applyQuestionKey pick, handleSubmit kt =
//   advance, handleSkip jt = skip, handleBack Mt = navigate(page - 1).
// The shell is dt's Ye (c2d1aeb56 q, `card` presentation) and Xe (c2d1aeb56 Y) with their 3.6556.2 class strings; the
// expanding bodies are c425fb3cf F's `epitaxy-expanding-body` divs; the buttons are view-tabs CdsButton, the primary
// dt's `je` (c30607cef i: CdsButton whose shortcut hides while the window is not attended, shared-10 Fx).
import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { CdsButton, CdsIcon, CdsTextArea, CdsShortcut, CdsCheckboxIndicator, cdsClassNames } from "./generated/view-tabs/index.js";
import { useApprovalDraft } from "./use-approval-draft.js";
import {
  dismissQuestionPayload,
  isQuestionAnswered,
  isQuestionInputSubmit,
  questionCardKeyDown,
  QUESTION_USER_DISMISSED_ANSWER,
} from "./approval-draft-model.mjs";
import { markCardPick } from "./generated/approval-landing/card-landing.mjs";
import {
  QuestionOptionRow,
  selectedRowClass,
  preventMouseDown,
  otherFieldArrowKeys,
  stopClickPropagation,
} from "./generated/question-card/option-row.mjs";
import { QuestionCardHeader, questionDisplayText } from "./generated/question-card/card-header.mjs";
import { questionRowMouseDown, questionEndsDragSelect } from "./generated/question-card/row-pointer.mjs";
import { questionDigitShortcuts } from "./generated/question-card/digit-shortcuts.mjs";
import { QuestionPrimaryButton } from "./generated/question-card/primary-button.mjs";
import { currentlyVisible } from "./source-approval-card.jsx";
import { useCardHotkeys } from "./use-card-hotkeys.js";
import { t } from "../electron/i18n/index.mjs";

// Host hooks: `source-message` keeps the transcript / dock adjacency spacing every card row has (source-session.css), and
// `source-question-card` names the card for the e2e scripts; neither carries a style of its own here.
// c2d1aeb56 V (the card shell) with w = "epitaxy-card-outline" (presentation "card", not host-framed) and dt's
// className "outline-none"; c16f2c953 o (variant "host") adds no class of its own.
const CARD_SHELL = "epitaxy-approval-card relative isolate flex flex-col rounded-card p-[12px] gap-[12px] max-h-[60vh] origin-top @container animate-code-approval-promote group-data-[skip-approval-enter]/approval-dock:animate-none motion-reduce:animate-none";
// c2d1aeb56 Y (the card body) over J's scroll clamp.
const CARD_BODY = "epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus epitaxy-approval-body flex min-h-0 flex-col gap-[12px] overflow-y-auto -mx-[12px] px-[12px] -mt-[4px] pt-[4px] -mb-[8px] pb-[8px] [&>*]:shrink-0";
// dt Z: the "n/m" pill (`style: { height: Me.leading.body.cssVar }`, c25d7186f leading.body = var(--cds-leading-body)).
const PROGRESS_PILL = "grid shrink-0 place-items-center rounded-full bg-warning px-sm text-caption tabular-nums text-warning";
// dt rr: the Other field's height cap (`calc(4lh + 2 * ${Me.pad.sm.cssVar})`).
const OTHER_FIELD_STYLE = { maxHeight: "calc(4lh + 2 * var(--cds-pad-sm))" };

// c425fb3cf F: mounted on first expansion, then kept and hidden while collapsed.
function ExpandingBody({ expanded, children }) {
  const [shown, setShown] = useState(expanded);
  if (expanded && !shown) setShown(true);
  if (!shown && !expanded) return null;
  return <div className={expanded ? "epitaxy-expanding-body flow-root" : "epitaxy-expanding-body"} hidden={!expanded}>{children}</div>;
}

export function SourceQuestionCard({
  runtime,
  request,
  getVisibleThreadId,
  respond,
  onResolved = () => {},
  onError = () => {},
  skipEnter = false,
  isActive = true,
  // dt T (isFocusedPane, default true): in a split window only the focused pane's card is active (`nn = w && T`) and
  // takes the digit keys ($t `!T`); the host passes its split side's focus (main.jsx splitActive).
  isFocusedPane = true,
  menuOpen = false,
}) {
  const { ticket, view } = useApprovalDraft(runtime, request);
  const root = useRef(null),
    restorePageFocus = useRef(null),
    listRef = useRef(null),
    bodyRef = useRef(null),
    otherField = useRef(null);
  const questionId = useId();
  const page = view?.draft.page;
  useLayoutEffect(() => {
    const wanted = restorePageFocus.current;
    restorePageFocus.current = null;
    if (
      wanted?.key === ticket?.key &&
      wanted?.generation === ticket?.generation &&
      wanted?.page === page
    )
      root.current?.focus({ preventScroll: true });
  }, [ticket, page]);
  // dt A (collapsed), H (focus the card after a page change), Yt / Xt (when the card last became active), un / dn
  // (the row press being watched and its mouseup listener).
  const [collapsed, setCollapsed] = useState(false);
  const focusOnPage = useRef(false), activeSince = useRef(-1 / 0), wasActive = useRef(isActive && isFocusedPane);
  const pressRef = useRef(null), pressAbort = useRef(null);
  const rowPointer = useRef(null);
  rowPointer.current ??= {
    onRowMouseDown: questionRowMouseDown({ un: pressRef, dn: pressAbort }),
    endsDragSelect: questionEndsDragSelect({ un: pressRef }),
  };
  useLayoutEffect(() => () => pressAbort.current?.abort(), []);
  // dt Zt: Yt is stamped when the card becomes active (w && T).
  useLayoutEffect(() => {
    const active = isActive && isFocusedPane;
    if (active && !wasActive.current) activeSince.current = Date.now();
    wasActive.current = active;
  }, [isActive, isFocusedPane]);
  // The question hook's highlightedIndex (c8cf7b513 m): the row the arrows and a multiSelect ↵ act on (-1 Other), kept per
  // ticket and page; null until a key or click sets it, then the choice's row stands in.
  const [highlight, setHighlight] = useState(null);
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  const hasComposerPopup = useRef(() => menuOpenRef.current).current;
  const pickRef = useRef(null);
  const pickDigit = useRef((index) => pickRef.current?.(index)).current;
  // yk/dt's ep({ active, allowOnce }) (ccbc7e432) is document-level: ⌘⏎ advances from the session's empty composer or an
  // unfocused page too (use-card-hotkeys).
  const advanceKey = useRef(null);
  useCardHotkeys(root, isActive && isFocusedPane && !menuOpen && !collapsed && view?.phase === "pending" && !view.busy, (key, event) => {
    if (key === "escape" || !isQuestionInputSubmit(event)) return;
    advanceKey.current?.(event);
  }, currentlyVisible);
  advanceKey.current = null;
  const question = view && ["pending", "invalid"].includes(view.phase) && !view.schemaError ? view.questions[page] : null;
  const optionCount = question?.options.length ?? 0;
  // dt $t / en: the document-level digit listener, on while the card is active and expanded (E = enableDigitShortcuts,
  // on for every local question: cc32965c2 passes `defaultToNo !== true`). z (showSubmitted) is the runtime's busy send.
  const digitsOn = !!question;
  useLayoutEffect(
    digitsOn
      ? questionDigitShortcuts({ w: isActive, T: isFocusedPane, z: !!view?.busy, U: false, A: collapsed, E: true, N: root,
          W: optionCount, xt: hasComposerPopup, Yt: activeSince, H: focusOnPage, B: pickDigit })
      : () => {},
    [digitsOn, isActive, isFocusedPane, view?.busy, collapsed, optionCount, pickDigit, hasComposerPopup],
  );
  if (!view || !["pending", "invalid"].includes(view.phase)) return null;
  const identity = {
    "data-approval-instance": ticket.bridgeApproval.instanceId,
    "data-approval-connection": ticket.bridgeApproval.connectionId,
    "data-approval-request-id": String(ticket.requestId),
    "data-approval-request-id-type": typeof ticket.requestId,
    "data-approval-presentation": "card",
    "data-skip-approval-enter": skipEnter ? "" : undefined,
  };
  if (view.schemaError || !question)
    return (
      <div
        ref={root}
        className={cdsClassNames("source-message source-question-card", CARD_SHELL, "epitaxy-card-outline", "outline-none")}
        role="group"
        aria-label={t("Question request")}
        {...identity}
        data-approval-invalid=""
      >
        <p className="text-body text-danger" role="alert">
          {view.schemaError || t("This request did not include any questions.")}
        </p>
      </div>
    );
  const answer = view.draft.answers[question.id];
  const last = page === view.questions.length - 1;
  const hasOptions = optionCount > 0;
  const multi = question.multiSelect === true;
  const custom = multi ? answer.otherSelected === true : ["other", "free"].includes(answer.choice?.kind);
  const optionSelected = (label) => multi
    ? (answer.selected ?? []).includes(label)
    : answer.choice?.kind === "option" && answer.choice.label === label;
  // The official card always draws Other; a local question draws it when it takes free text (isOther, or a free-form
  // question with no options).
  const drawsOther = !hasOptions || question.isOther === true;
  const chosenIndex = question.options.findIndex((option) => optionSelected(option.label));
  const unavailable = view.busy || !isActive;
  const keyedHighlight = highlight?.key === ticket.key && highlight.page === page ? highlight.index : null;
  const highlighted = keyedHighlight ?? (multi ? null : chosenIndex >= 0 ? chosenIndex : custom ? -1 : null);
  const markHighlight = (index) => setHighlight({ key: ticket.key, page, index });
  const hasAnswer = multi ? (answer.selected ?? []).length > 0 || answer.otherSelected === true : !!answer.choice;
  const focusOther = () => otherField.current?.focus();
  // c8cf7b513 q, as questionCardKey's intent: a digit picks (select / toggle), an arrow moves the highlight (and the
  // selection, single-select), ↵ advances; the Other row is -1, and selecting it focuses its field (q's effect
  // `b.has(-1) && M.current?.focus()`), an arrow onto a row focuses the card (`t !== -1 && j.current?.focus()`).
  const applyQuestionKey = (intent) => {
    if (intent.type === "advance") {
      if (runtime.canAdvance(ticket)) void advance();
      return;
    }
    const { index } = intent;
    if (index === -1 && !drawsOther) return;
    markHighlight(index);
    if (intent.type === "move" && multi) {
      if (index !== -1) root.current?.focus();
      return;
    }
    if (index === -1) {
      const wasOn = custom;
      runtime.selectOther(ticket, question.id, { toggle: multi });
      if (!multi || !wasOn) focusOther();
      return;
    }
    runtime.selectOption(ticket, question.id, question.options[index].label);
    if (intent.type === "move") root.current?.focus();
  };
  pickRef.current = unavailable || menuOpen ? null : (index) => applyQuestionKey({ type: "pick", index });
  const canAdvance = isActive && !menuOpen && runtime.canAdvance(ticket);
  const unanswered = view.questions.findIndex(
    (item, index) =>
      index !== page && !isQuestionAnswered(item, view.draft.answers[item.id]),
  );
  const navigate = (next) => {
    if (unavailable || menuOpen) return;
    const active = root.current?.ownerDocument.activeElement;
    if (root.current?.contains(active))
      restorePageFocus.current = {
        key: ticket.key,
        generation: ticket.generation,
        page: next,
      };
    if (!runtime.setPage(ticket, next)) restorePageFocus.current = null;
  };
  const settle = (result) => {
    if (result.status === "answered")
      onResolved({ request, ticket: result.ticket });
    else if (result.status === "error")
      onError({ request, ticket: result.ticket, message: result.message });
  };
  const advance = async () => {
    if (!isActive || menuOpen || !runtime.canAdvance(ticket)) return;
    if (!last) {
      navigate(page + 1);
      return;
    }
    settle(await runtime.submit(ticket, null, respond, { getVisibleThreadId }));
  };
  // dt zt (handleSkip jt) via runtime.skip; same guards as advance. The page change keeps navigate()'s focus restoration.
  const skip = async () => {
    if (unavailable || menuOpen) return;
    const next = last ? unanswered : page + 1;
    if (next >= 0 && root.current?.contains(root.current.ownerDocument.activeElement))
      restorePageFocus.current = {
        key: ticket.key,
        generation: ticket.generation,
        page: next,
      };
    const result = await runtime.skip(ticket, respond, { getVisibleThreadId });
    if (result.status !== "page") restorePageFocus.current = null;
    settle(result);
  };
  // dt Bt → V(le): every question answered with shared-5 VA "[User dismissed — do not proceed, wait for next
  // instruction]". A request whose questions cannot take free text (isOther:false, secret) has no dismiss answer.
  const dismissResponse = dismissQuestionPayload(request, QUESTION_USER_DISMISSED_ANSWER);
  const dismiss = async () => {
    if (unavailable || menuOpen || !dismissResponse) return;
    settle(await runtime.submit(ticket, "dismiss", respond, { getVisibleThreadId, response: dismissResponse }));
  };
  // dt Jt: collapsing moves focus held inside the list or the body to the card root.
  const toggleCollapsed = () => {
    const card = root.current, active = card?.ownerDocument.activeElement, inside = !!(card && active && card.contains(active));
    if (!collapsed) {
      if (inside) { card.focus({ preventScroll: true }); focusOnPage.current = true; }
    } else {
      if (inside && (active === bodyRef.current || active?.closest(".epitaxy-expanding-body"))) card.focus({ preventScroll: true });
      focusOnPage.current = false;
    }
    setCollapsed(!collapsed);
  };
  advanceKey.current = (event) => {
    if (!runtime.canAdvance(ticket)) return;
    event.preventDefault();
    event.stopPropagation();
    if (currentlyVisible(root.current)) void advance();
  };
  const showDigitHint = isActive && !menuOpen;
  const { onRowMouseDown, endsDragSelect } = rowPointer.current;
  const onOptionClick = (index) => {
    if (unavailable || menuOpen) return;
    markHighlight(index);
    runtime.selectOption(ticket, question.id, question.options[index].label);
  };
  // dt qn: the Other row's surface follows the option rows'.
  const otherRow = `flex flex-col gap-[12px] rounded-[5px] px-md py-md ${custom ? selectedRowClass : multi && highlighted === -1 ? "bg-alpha-2" : "bg-alpha-1 hover:bg-alpha-2"}`;
  const otherProps = {
    ref: otherField,
    value: answer.customText,
    disabled: unavailable,
    tabIndex: !hasOptions || custom ? 0 : -1,
    "aria-label": hasOptions ? t("Other option") : question.header || question.question,
    placeholder: hasOptions ? t("Type your own answer here") : t("Write your answer"),
    autoComplete: "off",
    spellCheck: !question.isSecret,
    onFocus: () => { if (!custom) runtime.selectOther(ticket, question.id, { toggle: false }); },
    onChange: (event) => runtime.writeCustom(ticket, question.id, event.target.value),
    onClick: stopClickPropagation,
    onKeyDown: (event) => {
      // dt vt: ↑/↓ stay in the field (the caret), not the card's highlight.
      otherFieldArrowKeys(event);
      if (event.key === "ArrowUp" || event.key === "ArrowDown") return;
      if (isActive && !menuOpen && isQuestionInputSubmit(event) && runtime.canAdvance(ticket)) {
        event.preventDefault();
        event.stopPropagation();
        void advance();
      }
    },
  };
  const otherField$ = question.isSecret
    // A secret local question (no official counterpart) keeps a masked single-line field.
    ? <input {...otherProps} type="password" className="w-full bg-transparent text-body text-primary outline-none" />
    : <CdsTextArea {...otherProps} rows={1} autosize style={OTHER_FIELD_STYLE} />;
  const title = questionDisplayText(question.question);
  return (
    <div
      ref={root}
      className={cdsClassNames("source-message source-question-card", CARD_SHELL, "epitaxy-card-outline", "outline-none")}
      role="group"
      tabIndex={0}
      aria-labelledby={questionId}
      aria-busy={view.busy || undefined}
      {...identity}
      data-approval-question-id={question.id}
      data-question-page={page}
      data-collapsed={collapsed || undefined}
      // dt gn: a click inside the card stays in it (_t); a keyboard click (detail 0) remembers the page for refocus.
      onClick={(event) => event.stopPropagation()}
      onFocus={() => { if (!collapsed) focusOnPage.current = true; }}
      onKeyDown={isActive && !collapsed ? (event) => {
        // dt yn registers ep({ active, allowOnce }), so ⌘⏎ advances from anywhere in the card (the Other field handles
        // and stops the event itself).
        if (isQuestionInputSubmit(event)) {
          if (!isActive || menuOpen || !runtime.canAdvance(ticket)) return;
          event.preventDefault();
          event.stopPropagation();
          void advance();
          return;
        }
        // dt yn: a digit 1..N+1 or an arrow first goes through rt (markCardPick), then the question hook's handleKeyDown.
        if (unavailable || menuOpen) return;
        const intent = questionCardKeyDown(event, {
          optionCount,
          hasOther: drawsOther,
          multiSelect: multi,
          highlighted,
          selected: hasAnswer,
          inOther: event.target === otherField.current,
        }, markCardPick, root.current);
        if (!intent) return;
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent?.stopImmediatePropagation?.();
        applyQuestionKey(intent);
      } : undefined}
    >
      <div ref={bodyRef} className={CARD_BODY}>
        <QuestionCardHeader
          titleNamesCard
          leading={view.questions.length > 1
            ? <span className={PROGRESS_PILL} style={{ height: "var(--cds-leading-body)" }}>{page + 1}/{view.questions.length}</span>
            : undefined}
          trailing={<span className="flex items-center gap-0.5">
            <CdsButton size="base" variant="ghost" iconOnly
              icon={<CdsIcon name="CaretRight" size="auto" rotate={collapsed ? 0 : 90}
                className="transition-transform duration-fast motion-reduce:transition-none" />}
              onMouseDown={preventMouseDown} aria-expanded={!collapsed} aria-label={t("View question options")} onClick={toggleCollapsed} />
            {dismissResponse && <CdsButton size="base" variant="ghost" iconOnly icon="X" onMouseDown={preventMouseDown}
              aria-label={t("Dismiss question")} disabled={unavailable || menuOpen} onClick={() => void dismiss()} />}
          </span>}
        >
          <span id={questionId} className="block select-text whitespace-pre-wrap [unicode-bidi:plaintext]">{title}</span>
        </QuestionCardHeader>
        <ExpandingBody expanded={!collapsed}>
          <div ref={listRef} className="flex flex-col gap-0.75">
            {question.options.map((option, index) => (
              <QuestionOptionRow
                key={`${index}-${option.label}`}
                option={option}
                index={index}
                isSelected={optionSelected(option.label)}
                isHighlighted={multi && highlighted === index}
                isMultiSelect={multi}
                showDigitHint={showDigitHint}
                onRowMouseDown={onRowMouseDown}
                endsDragSelect={endsDragSelect}
                onOptionClick={onOptionClick}
              />
            ))}
            {drawsOther && (
              <div className={otherRow}>
                {hasOptions && (
                  <button
                    type="button"
                    onMouseDown={onRowMouseDown}
                    aria-pressed={multi ? custom : undefined}
                    className="flex items-center gap-sm text-body text-primary text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"
                    onClick={(event) => {
                      if (endsDragSelect(event) || unavailable || menuOpen) return;
                      markHighlight(-1);
                      runtime.selectOther(ticket, question.id);
                      if (multi && custom) root.current?.focus();
                    }}
                  >
                    <span className="flex-1 select-text">{t("Other")}</span>
                    {multi
                      ? <span data-size="sm" className="flex shrink-0"><CdsCheckboxIndicator checked={custom} /></span>
                      : showDigitHint
                        ? <span className="pointer-events-none flex pointer-coarse:hidden"><CdsShortcut keys={String(optionCount + 1)} /></span>
                        : null}
                  </button>
                )}
                {otherField$}
              </div>
            )}
          </div>
        </ExpandingBody>
      </div>
      {view.error && (
        <p className="text-footnote text-danger" role="alert">
          {view.error}
        </p>
      )}
      <ExpandingBody expanded={!collapsed}>
        <div className="flex items-center justify-end gap-[8px]">
          {page > 0 && (
            <CdsButton variant="secondary" onMouseDown={preventMouseDown} onClick={() => navigate(page - 1)} className="me-auto"
              disabled={unavailable || menuOpen}>
              {t("Back")}
            </CdsButton>
          )}
          <CdsButton variant="secondary" onMouseDown={preventMouseDown} onClick={() => void skip()} disabled={unavailable || menuOpen}>
            {t("Skip")}
          </CdsButton>
          <QuestionPrimaryButton
            variant="primary"
            onMouseDown={preventMouseDown}
            busy={view.busy}
            disabled={!view.busy && !canAdvance}
            shortcut={isActive && !menuOpen ? "cmd+enter" : undefined}
            onClick={(event) => {
              if (unavailable || menuOpen) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              void advance();
            }}
          >
            {last ? t("Submit") : t("Next")}
          </QuestionPrimaryButton>
        </div>
      </ExpandingBody>
    </div>
  );
}

