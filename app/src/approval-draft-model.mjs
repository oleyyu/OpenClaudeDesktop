// Main-issued approval identity and memory-only pending drafts.
// Source and integration evidence: analysis/batch-20260920/approval-question-implementation.md.
import { t } from "../electron/i18n/index.mjs";
const QUESTION = "item/tool/requestUserInput";
const PERMISSION = "item/permissions/requestApproval";
const DECISION_METHODS = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
]);
// mcpServer/elicitation/request (approval-card-model.mjs ELICITATION): MCP tool approvals and
// server forms / links, answered as accept (optionally persisted for the session), decline or cancel.
const ELICITATION = "mcpServer/elicitation/request";
// enableSuggested: a Codex tool suggestion's 'Turn on' (main turns the app or plugin on, then accepts).
const ELICITATION_ACTIONS = new Set(["accept", "acceptForSession", "acceptAlways", "enableSuggested", "decline", "cancel"]);
const SUPPORTED = new Set([QUESTION, PERMISSION, ELICITATION, ...DECISION_METHODS]);
const freeze = Object.freeze;

export function approvalIdentity(request) {
  const threadId = request?.params?.threadId;
  const bridge = request?.bridgeApproval;
  if (
    !SUPPORTED.has(request?.method) ||
    typeof threadId !== "string" ||
    !threadId ||
    !["number", "string"].includes(typeof request.id) ||
    String(request.id) === "" ||
    (typeof request.id === "number" && !Number.isFinite(request.id)) ||
    typeof bridge?.connectionId !== "string" ||
    !bridge.connectionId ||
    typeof bridge?.instanceId !== "string" ||
    !bridge.instanceId
  )
    return null;
  return freeze({
    key: JSON.stringify([bridge.connectionId, bridge.instanceId]),
    bridgeApproval: freeze({
      connectionId: bridge.connectionId,
      instanceId: bridge.instanceId,
    }),
    threadId,
    method: request.method,
    requestId: request.id,
    turnId: request.params.turnId ?? null,
    itemId: request.params.itemId ?? null,
  });
}

function questionSchema(request) {
  // The bridge carries server data. Reject malformed content per request so a
  // single unusable question cannot abort the App's all-request reconciliation.
  // Errors are fixed local strings; never include server payloads or answers.
  const invalid = (schemaError) => ({ questions: freeze([]), schemaError });
  const supplied = request.params.questions;
  if (!Array.isArray(supplied))
    return invalid(t("This request must include a list of questions."));
  if (!supplied.length)
    return invalid(t("This request did not include any questions."));
  const ids = new Set();
  const questions = [];
  for (const question of supplied) {
    if (!question || typeof question !== "object" || Array.isArray(question))
      return invalid(t("This request contains an invalid question."));
    if (typeof question.id !== "string" || !question.id || ids.has(question.id))
      return invalid(t("Questions need distinct nonempty IDs."));
    ids.add(question.id);
    if (typeof question.question !== "string" || !question.question.trim())
      return invalid(t("Question text must be a nonempty string."));
    if (question.header !== undefined && typeof question.header !== "string")
      return invalid(t("Question headers must be text."));
    if (
      ["isOther", "isSecret", "multiSelect"].some(
        (field) =>
          question[field] !== undefined && typeof question[field] !== "boolean",
      )
    )
      return invalid(t("Question input settings must be boolean values."));
    const suppliedOptions = question.options ?? [];
    if (!Array.isArray(suppliedOptions))
      return invalid(t("Question options must be a list."));
    const options = [];
    for (const option of suppliedOptions) {
      if (!option || typeof option !== "object" || Array.isArray(option))
        return invalid(t("This request contains an invalid question option."));
      if (typeof option.label !== "string" || !option.label.trim())
        return invalid(t("Question option labels must be nonempty strings."));
      if (
        option.description !== undefined &&
        typeof option.description !== "string"
      )
        return invalid(t("Question option descriptions must be text."));
      options.push(
        freeze({
          label: option.label,
          description: option.description ?? "",
          // A core's option preview (ZCode / Claude AskUserQuestion: a mockup or code variant), shown as text.
          ...(typeof option.preview === "string" && option.preview.trim() ? { preview: option.preview.slice(0, 20000) } : {}),
        }),
      );
    }
    questions.push(
      freeze({
        id: question.id,
        question: question.question,
        header: question.header ?? "",
        isOther: question.isOther === true,
        isSecret: question.isSecret === true,
        // The bridge's multiSelect extension field (ask_user_question multi_select).
        multiSelect: question.multiSelect === true && options.length > 0,
        options: freeze(options),
      }),
    );
  }
  return { questions: freeze(questions), schemaError: "" };
}

// approval-current.js:7790-7800 _se/mk: each question starts at `{selected: multiSelect ||
// options.length===0 ? [] : [0], other:""}`. A single-select question with options
// preselects options[0]; a multiSelect one starts with nothing selected and keeps its
// toggled labels in `selected` plus `otherSelected` for Other (the source's index -1).
// Secret questions keep no preselection (local: they are free-text password
// controls). Free-form questions stay empty.
function initialAnswer(question) {
  if (question.multiSelect)
    return freeze({ choice: null, selected: freeze([]), otherSelected: false, customText: "" });
  return freeze({
    choice:
      question.options.length && !question.isSecret
        ? freeze({ kind: "option", label: question.options[0].label })
        : null,
    customText: "",
  });
}
function emptyDraft(questions) {
  return freeze({
    page: 0,
    answers: freeze(
      Object.fromEntries(
        questions.map((question) => [question.id, initialAnswer(question)]),
      ),
    ),
  });
}
// Source skip q (approval-current.js:7997-8008) stores `{selected:[], other:"", skipped:true}`.
const SKIPPED = freeze({ choice: null, customText: "", skipped: true });
// uk (approval-current.js:7764-7766): a page is answered once anything is selected or it
// was skipped. Other is the source's index -1, so selecting it answers the page even with
// an empty field (R sends ck 'Something else', :7695, :7911-7921). A free-form question
// (no options; local only) still needs text.
export const OTHER_FALLBACK_ANSWER = "Something else";
export function isQuestionAnswered(question, answer) {
  if (answer?.skipped === true) return true;
  if (question.multiSelect)
    return (answer?.selected ?? []).some((label) =>
      question.options.some((option) => option.label === label)) ||
      (answer?.otherSelected === true && question.isOther);
  if (answer?.choice?.kind === "option")
    return question.options.some(
      (option) => option.label === answer.choice.label,
    );
  if (answer?.choice?.kind === "other")
    return question.isOther && question.options.length > 0;
  if (answer?.choice?.kind === "free")
    return question.options.length === 0 && !!answer.customText.trim();
  return false;
}
const otherAnswer = (answer) => answer.customText?.trim() || OTHER_FALLBACK_ANSWER;
const isAnswered = isQuestionAnswered;
function answerPayload(questions, draft) {
  if (
    !questions.length ||
    !questions.every((question) =>
      isAnswered(question, draft.answers[question.id]),
    )
  )
    throw new Error(t("Answer every question before submitting."));
  // Skipped questions are OMITTED from `answers` — a deliberate local deviation. The source
  // submit R (approval-current.js:7903-7907: `if (s.selected.length===0) { (r||s.skipped) &&
  // i.push([o, Hi]); return; }`) DOES send a skipped question, with Hi = shared-11 Tr → sO
  // "[No preference]" (import :371; ion-dist/assets/v1/shared-11-CDihEvbJ.js). Here the key is
  // left out instead, which ToolRequestUserInputResponse allows (`answers: { [key in string]?:
  // ToolRequestUserInputAnswer }`, codex-schema-0.155.1 ts-experimental/v2): a missing key is
  // the protocol's "no answer", and electron/respond-approval.cjs keeps rejecting non-option
  // labels on option-only questions (no sentinel exemption). All skipped → `{answers:{}}`.
  return Object.fromEntries(
    questions
      .filter((question) => draft.answers[question.id].skipped !== true)
      .map((question) => {
        const answer = draft.answers[question.id];
        // A multiSelect answer is every selected label in index order (source R
        // :7911-7921 sorts the indices, so Other's -1 and its text come first). Other
        // sends `s.other.trim() || "Something else"`.
        if (question.multiSelect)
          return [
            question.id,
            {
              answers: [
                ...(answer.otherSelected && question.isOther ? [otherAnswer(answer)] : []),
                ...question.options
                  .filter((option) => (answer.selected ?? []).includes(option.label))
                  .map((option) => option.label),
              ],
            },
          ];
        return [
          question.id,
          {
            answers: [
              answer.choice.kind === "option"
                ? answer.choice.label
                : answer.choice.kind === "other"
                  ? otherAnswer(answer)
                  : answer.customText,
            ],
          },
        ];
      }),
  );
}
function responsePayload(entry, action, response) {
  const id = entry.ticket.requestId,
    method = entry.ticket.method,
    expected = entry.ticket.bridgeApproval;
  // An elicitation's form answers ride in `response.content` (memory-only card state);
  // electron/respond-approval.cjs validates them against the request's schema.
  if (method === ELICITATION) {
    if (!ELICITATION_ACTIONS.has(action))
      throw new Error(t("Unsupported approval decision."));
    const content = action === "accept" ? response?.content : undefined;
    return {
      id,
      expected,
      elicitation: {
        action: action === "acceptForSession" || action === "acceptAlways" || action === "enableSuggested" ? "accept" : action,
        ...(action === "acceptForSession" ? { persist: "session" } : action === "acceptAlways" ? { persist: "always" } : {}),
        ...(action === "enableSuggested" ? { enableSuggested: true } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    };
  }
  // Deny with what to do instead (a request offering codeDesktop.declineFeedback); respond-approval.cjs checks it.
  if (response !== undefined && DECISION_METHODS.has(method) && action === "decline" && typeof response?.feedback === "string")
    return { id, expected, decision: "decline", feedback: response.feedback };
  // A prepared question response (plan review card, dismiss-on-send) replaces the
  // draft's answers; electron/respond-approval.cjs validates it like any answer.
  if (response !== undefined) {
    if (method !== QUESTION || !response?.answers || typeof response.answers !== "object")
      throw new Error(t("Unsupported approval decision."));
    return {
      id,
      expected,
      answers: response.answers,
      ...(response.codeDesktop ? { codeDesktop: response.codeDesktop } : {}),
    };
  }
  if (method === QUESTION)
    return {
      id,
      expected,
      answers: answerPayload(entry.questions, entry.view.draft),
    };
  if (method === PERMISSION) {
    if (action !== "allow" && action !== "deny")
      throw new Error(t("Permissions allow or deny the current turn only."));
    return { id, expected, allow: action === "allow" };
  }
  // 'decision:<n>': one of the request's own availableDecisions (approval-card-model.mjs offeredDecisions), sent by
  // index so main answers with exactly that entry.
  const offered = /^decision:(\d{1,3})$/.exec(String(action));
  if (DECISION_METHODS.has(method) && offered) return { id, expected, decisionIndex: Number(offered[1]) };
  if (
    !DECISION_METHODS.has(method) ||
    !["accept", "decline", "cancel", "acceptForSession"].includes(action)
  )
    throw new Error(t("Unsupported approval decision."));
  return { id, expected, decision: action };
}

const signatureOf = (identity, questions, schemaError = "") =>
  JSON.stringify([
    identity.threadId,
    identity.method,
    typeof identity.requestId,
    identity.requestId,
    identity.turnId,
    identity.itemId,
    questions,
    schemaError,
  ]);
const matchesReply = (reply, expected) =>
  reply?.connectionId === expected.connectionId &&
  reply?.instanceId === expected.instanceId;

// One card at a time (cc43287c9 :31744 om → mc, :37426 pendingApproval; c57f8fcae je
// head request; queueDepth is not drawn in card placement): the oldest answerable
// request of the session shows, the rest wait. A request no card can answer
// (unsupported identity, malformed questions) is only an error notice: it stays
// visible and never holds the queue.
const answerable = (request) =>
  !!approvalIdentity(request) &&
  (request.method !== QUESTION || !questionSchema(request).schemaError);
export function visibleApprovals(requests) {
  let head = false;
  return (requests ?? []).filter((request) => {
    if (!answerable(request)) return true;
    if (head) return false;
    head = true;
    return true;
  });
}

// DeepSeek plan review: exit_plan_mode's question (harness questions.js PLAN_REVIEW,
// dsh-plan-mode APPROVE_LABEL / KEEP_PLANNING_LABEL), shown as Rse's plan card.
export const PLAN_REVIEW_QUESTION = "plan-review";
export const PLAN_APPROVE = "Approve";
export const PLAN_KEEP_PLANNING = "Keep planning";
// The modes an approved plan can continue in (Mk, approval-current.js:9443-9458). Bypass is a
// target only when the card offers it (the opt-in is on and the core allows it); main.cjs
// validates a Bypass answer before it reaches the core.
export const PLAN_TARGETS = freeze(["auto", "ask", "acceptEdits", "bypass"]);
export const isPlanReviewRequest = (request) =>
  request?.method === QUESTION &&
  Array.isArray(request.params?.questions) &&
  request.params.questions.some((question) => question?.id === PLAN_REVIEW_QUESTION);
/** Rse ee (approval-current.js:9520-9578): reject / revise send the plan back
 * (Fse trims the feedback), accept continues in Manual ('default' → ask), primary
 * in the trust-forward target. The target travels as the codeDesktop.afterPlan
 * extension, which the bridge prefers over its turn hint. */
export function planReviewResponse(action, { feedback = "", target = "auto" } = {}) {
  const answer = (answers) => ({ [PLAN_REVIEW_QUESTION]: { answers } });
  if (action === "reject" || action === "revise") {
    const text = action === "revise" && typeof feedback === "string" ? feedback.trim() : "";
    return { answers: answer(text ? [PLAN_KEEP_PLANNING, text] : [PLAN_KEEP_PLANNING]) };
  }
  if (action === "accept" || action === "primary")
    return {
      answers: answer([PLAN_APPROVE]),
      codeDesktop: { afterPlan: action === "accept" ? "ask" : PLAN_TARGETS.includes(target) ? target : "auto" },
    };
  throw new Error(t("Unsupported plan review decision."));
}

// lO (ion-dist/assets/v1/shared-11-CDihEvbJ.js), sent by yk re (approval-current.js
// :8048-8066) when the user sends a message while AskUserQuestion is pending (Dd,
// cc43287c9 :32430-32453).
export const QUESTION_DISMISSED_ANSWER =
  "[User did not answer this question — they sent a message instead. Treat that message as their response; do not re-ask.]";
/** Every question answered with the marker, or null when the request cannot take it:
 * the plan review (the source dismisses only AskUserQuestion), a question whose options
 * exclude free text (isOther:false, e.g. Codex), a secret field, or a malformed request. */
// shared-5 VA (exported xr, c9ed5627b `le`): what dt's Dismiss button (Bt → V(le)) answers every question with.
export const QUESTION_USER_DISMISSED_ANSWER = "[User dismissed \u2014 do not proceed, wait for next instruction]";
export function dismissQuestionPayload(request, marker = QUESTION_DISMISSED_ANSWER) {
  if (request?.method !== QUESTION || !request.params || isPlanReviewRequest(request)) return null;
  const { questions, schemaError } = questionSchema(request);
  if (schemaError || !questions.length) return null;
  if (questions.some((question) => question.isSecret || (question.options.length > 0 && !question.isOther)))
    return null;
  return {
    answers: Object.fromEntries(
      questions.map((question) => [question.id, { answers: [marker] }]),
    ),
  };
}

// This is intentionally local to the custom-answer input. It does not install
// the source's global focus/offscreen/400ms permission hotkey machinery.
export function isQuestionInputSubmit(event) {
  return (
    event?.key === "Enter" &&
    !!(event.metaKey || event.ctrlKey) &&
    !event.repeat &&
    !event.isComposing &&
    !event.nativeEvent?.isComposing &&
    event.keyCode !== 229 &&
    event.nativeEvent?.keyCode !== 229
  );
}

// AskUserQuestion card keys (L26 / HS-11 / E23), 3.6556.2: the card dt (c9ed5627b-BSPWYeYQ) gives its root
// `onKeyDown: yn`, which ends in `(e.key==="ArrowDown"||e.key==="ArrowUp"||/^[1-9]$/.test(e.key)&&Number(e.key)<=t+1)
// &&!rt(e.nativeEvent,E)||At(e)`: a digit 1..N+1 or an arrow first goes through rt (generated as markCardPick), and At
// is the question hook's handleKeyDown q (c8cf7b513-B-eZCy_c m). E is enableDigitShortcuts, `defaultToNo !== true` in
// cc32965c2, so on for every local question (no defaultToNo). Option N+1 is Other; the official card always draws it,
// the local card only when the question takes one (isOther, or a free-form question with no options), so `hasOther`
// stands for "the card draws Other".
const elementOfTarget = (node) => (node?.nodeType === 1 ? node : node?.parentElement ?? null);
export function isQuestionPickKey(event, optionCount, hasOther = true) {
  const key = event?.key;
  return key === "ArrowDown" || key === "ArrowUp" ||
    (/^[1-9]$/.test(key ?? "") && Number(key) <= optionCount + (hasOther ? 1 : 0));
}
// q's arrow step over the rows 0..n-1 and Other (-1): Down from none/Other is the first row, from the last row Other;
// Up from none is Other, from Other the last row, from the first row Other; no rows → Other. Without an Other row
// (local only) the step wraps between the first and last rows instead.
export function questionArrowIndex(key, highlighted, optionCount, hasOther = true) {
  const n = optionCount;
  if (!hasOther) {
    if (n === 0) return null;
    if (key === "ArrowDown") return highlighted === null || highlighted < 0 || highlighted >= n - 1 ? 0 : highlighted + 1;
    return highlighted === null || highlighted <= 0 ? n - 1 : highlighted - 1;
  }
  if (n === 0) return -1;
  if (key === "ArrowDown") return highlighted === null || highlighted === -1 ? 0 : highlighted === n - 1 ? -1 : highlighted + 1;
  return highlighted === null ? -1 : highlighted === -1 ? n - 1 : highlighted === 0 ? -1 : highlighted - 1;
}
/** q (handleKeyDown) as an intent: { type: "pick", index } (a digit, or ↵ on the highlighted multiSelect row: select
 * on a single-select question, toggle on a multiSelect one; index -1 is Other), { type: "move", index } (an arrow: the
 * highlight moves, a single-select question selects it too) or { type: "advance" } (↵ with an answer: Next / Submit);
 * null leaves the key alone. The caller prevents and stops every intent, as q does.
 * state: optionCount, hasOther, multiSelect, highlighted (row index, -1 Other, null none), selected (anything chosen:
 * q's `b.size > 0`), inOther (the key is in the Other field: q's `e.target === M.current`). */
export function questionCardKey(event, { optionCount, hasOther = true, multiSelect = false, highlighted = null,
  selected = false, inOther = false } = {}) {
  if (!event || elementOfTarget(event.target)?.matches?.("button, a")) return null;
  const n = optionCount, digit = parseInt(event.key, 10);
  if (!inOther && digit >= 1 && digit <= n) return { type: "pick", index: digit - 1 };
  if (!inOther && hasOther && digit === n + 1) return { type: "pick", index: -1 };
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const index = questionArrowIndex(event.key, highlighted, n, hasOther);
    return index === null ? null : { type: "move", index };
  }
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent?.isComposing || event.isComposing) return null;
  const chord = !!(event.metaKey || event.ctrlKey);
  if (multiSelect) {
    if (chord && selected) return { type: "advance" };
    return !inOther && !chord && highlighted !== null ? { type: "pick", index: highlighted } : null;
  }
  // A free-form question (no options, local only) keeps a plain ↵ in its answer field as a new line.
  if (inOther && n === 0 && !chord) return null;
  return selected ? { type: "advance" } : null;
}
/** shared-156 nq (rq's overlay test, exported as lr): what counts as a dialog the key came from. */
export const QUESTION_DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], [data-radix-dialog-content], dialog[open]';
/** yn, the card root's onKeyDown, before q: a key from inside a dialog that does not hold the card is not the card's
 * (shared-156 rq / lr: `e.closest(nq)` with nq = QUESTION_DIALOG_SELECTOR, `!(t && n.contains(t))`; its eq second
 * pass walks open shadow roots' active elements, which the host's light-DOM cards never have); a digit 1..N+1 or an arrow is first offered to markPick (rt, the landed-card
 * pick mark: false holds the key back); then q. The fullscreen-transition guard (shared-2 C7 / w7 and ve) has no host
 * counterpart (the host keeps no fullscreen state) and is left out. */
export function questionCardKeyDown(event, state, markPick, root = null) {
  const dialog = elementOfTarget(event?.target)?.closest?.(QUESTION_DIALOG_SELECTOR);
  if (dialog && !(root && dialog.contains(root))) return null;
  if (isQuestionPickKey(event, state.optionCount, state.hasOther ?? true) && !markPick(event.nativeEvent ?? event, true))
    return null;
  return questionCardKey(event, state);
}

/** Entries exist only while a request is pending; no disk/localStorage writes.
 * reconcile MUST receive all sessions' pending requests, not only the visible
 * session. Main-process bridge identity survives snapshot object cloning.
 */
export function createApprovalDraftRuntime() {
  const entries = new Map(),
    listeners = new Set();
  let generation = 0,
    revision = 0;
  const notify = () => {
    revision++;
    for (const listener of listeners) listener();
  };
  const current = (ticket) => {
    const entry = ticket && entries.get(ticket.key);
    return entry?.ticket === ticket ? entry : null;
  };
  const update = (entry, patch) => {
    entry.view = freeze({
      ...entry.view,
      ...patch,
      revision: entry.view.revision + 1,
    });
    notify();
  };
  const editable = (ticket) => {
    const entry = current(ticket);
    return entry && entry.view.phase === "pending" && !entry.view.busy
      ? entry
      : null;
  };
  const modifyAnswer = (ticket, questionId, change) => {
    const entry = editable(ticket);
    if (!entry) return false;
    const question = entry.questions.find(
      (question) => question.id === questionId,
    );
    if (!question) throw new Error("Unknown question ID.");
    // Choosing an option or typing clears skipped (source selection sets `skipped: !1`,
    // approval-current.js:7960-7961).
    const { skipped: _skipped, ...previous } = entry.view.draft.answers[questionId];
    const next = change(previous, question);
    update(entry, {
      error: "",
      draft: freeze({
        ...entry.view.draft,
        answers: freeze({
          ...entry.view.draft.answers,
          [questionId]: freeze(next),
        }),
      }),
    });
    return true;
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reconcile(requests) {
      const keep = new Set();
      let changed = false;
      for (const request of requests) {
        const identity = approvalIdentity(request);
        if (!identity) continue;
        keep.add(identity.key);
        const { questions, schemaError } =
          request.method === QUESTION
            ? questionSchema(request)
            : { questions: freeze([]), schemaError: "" };
        const signature = signatureOf(identity, questions, schemaError);
        const previous = entries.get(identity.key);
        if (previous?.signature === signature) continue;
        const ticket = freeze({ ...identity, generation: ++generation });
        entries.set(identity.key, {
          request,
          signature,
          questions,
          ticket,
          view: freeze({
            revision: 0,
            phase: schemaError ? "invalid" : "pending",
            schemaError,
            busy: false,
            busyAction: null,
            error: "",
            draft: emptyDraft(questions),
            questions,
          }),
        });
        changed = true;
      }
      for (const key of entries.keys())
        if (!keep.has(key)) {
          entries.delete(key);
          changed = true;
        }
      if (changed) notify();
    },
    ticketFor(request) {
      const identity = approvalIdentity(request),
        entry = identity && entries.get(identity.key);
      if (!entry) return null;
      const { questions, schemaError } =
        request.method === QUESTION
          ? questionSchema(request)
          : { questions: [], schemaError: "" };
      return entry.signature === signatureOf(identity, questions, schemaError)
        ? entry.ticket
        : null;
    },
    snapshot(ticket) {
      return current(ticket)?.view ?? null;
    },
    expire(ticket) {
      if (!current(ticket)) return false;
      entries.delete(ticket.key);
      notify();
      return true;
    },
    canSubmit(ticket) {
      const entry = editable(ticket);
      return (
        !!entry &&
        (entry.ticket.method !== QUESTION ||
          (entry.questions.length > 0 &&
            entry.questions.every((question) =>
              isAnswered(question, entry.view.draft.answers[question.id]),
            )))
      );
    },
    canAdvance(ticket) {
      const entry = editable(ticket);
      if (!entry || entry.ticket.method !== QUESTION) return false;
      const page = entry.view.draft.page;
      const question = entry.questions[page];
      return (
        !!question &&
        isAnswered(question, entry.view.draft.answers[question.id]) &&
        (page < entry.questions.length - 1 || this.canSubmit(ticket))
      );
    },
    // V (approval-current.js:7951-7962): a multiSelect click toggles the option, a
    // single-select click replaces the choice.
    selectOption(ticket, questionId, label) {
      return modifyAnswer(ticket, questionId, (previous, question) => {
        if (!question.options.some((option) => option.label === label))
          throw new Error("Unknown option label.");
        if (question.multiSelect) {
          const selected = previous.selected ?? [];
          return {
            ...previous,
            selected: freeze(selected.includes(label)
              ? selected.filter((value) => value !== label)
              : [...selected, label]),
          };
        }
        return { ...previous, choice: freeze({ kind: "option", label }) };
      });
    },
    // Other is V(-1): the mark toggles it on a multiSelect question; focusing or typing
    // in its field only turns it on (`ae || V(-1)`, :8195-8201), hence toggle:false.
    selectOther(ticket, questionId, { toggle = true } = {}) {
      return modifyAnswer(ticket, questionId, (previous, question) => {
        if (question.options.length && !question.isOther)
          throw new Error(t("This question does not allow a custom answer."));
        if (question.multiSelect)
          return { ...previous, otherSelected: toggle ? !previous.otherSelected : true };
        return {
          ...previous,
          choice: freeze({ kind: question.options.length ? "other" : "free" }),
        };
      });
    },
    writeCustom(ticket, questionId, text) {
      if (typeof text !== "string")
        throw new TypeError("An answer must be text.");
      return modifyAnswer(ticket, questionId, (previous, question) => {
        if (question.options.length && !question.isOther)
          throw new Error(t("This question does not allow a custom answer."));
        if (question.multiSelect)
          return { ...previous, otherSelected: true, customText: text };
        return {
          ...previous,
          choice: freeze({ kind: question.options.length ? "other" : "free" }),
          customText: text,
        };
      });
    },
    setPage(ticket, page) {
      const entry = editable(ticket);
      if (!entry) return false;
      if (!Number.isInteger(page) || page < 0 || page >= entry.questions.length)
        throw new RangeError("Unknown question page.");
      update(entry, { draft: freeze({ ...entry.view.draft, page }) });
      return true;
    },
    // Source Skip q (approval-current.js:7997-8008): mark the current page skipped; on the last
    // page submit when no page is unanswered (uk counts skipped) else go to the first unanswered
    // page; otherwise go to page+1. Same editable (pending, not busy, current ticket) guard as
    // setPage/submit; the card adds its isActive/menuOpen guard like advance.
    async skip(ticket, respond, options = {}) {
      const entry = editable(ticket);
      if (!entry || entry.ticket.method !== QUESTION) {
        const stale = current(ticket);
        return { status: stale?.view.phase === "pending" && stale.view.busy ? "busy" : "stale" };
      }
      const page = entry.view.draft.page,
        question = entry.questions[page];
      if (!question) return { status: "stale" };
      const answers = freeze({
        ...entry.view.draft.answers,
        [question.id]: SKIPPED,
      });
      if (page < entry.questions.length - 1) {
        update(entry, {
          error: "",
          draft: freeze({ ...entry.view.draft, answers, page: page + 1 }),
        });
        return { status: "page", page: page + 1 };
      }
      const unanswered = entry.questions.findIndex(
        (item) => !isAnswered(item, answers[item.id]),
      );
      // The submitting branch keeps submit()'s visible-session check before any change.
      if (
        unanswered === -1 &&
        options.getVisibleThreadId?.() !== ticket.threadId
      )
        return { status: "stale" };
      update(entry, {
        error: "",
        draft: freeze({
          ...entry.view.draft,
          answers,
          page: unanswered === -1 ? page : unanswered,
        }),
      });
      if (unanswered !== -1) return { status: "page", page: unanswered };
      return this.submit(ticket, null, respond, options);
    },
    // `response` ({answers, codeDesktop?}) sends a prepared question response instead of
    // the draft (planReviewResponse, dismissQuestionPayload) under the same guards.
    async submit(ticket, action, respond, { getVisibleThreadId, response } = {}) {
      const entry = current(ticket);
      if (
        !entry ||
        entry.view.phase !== "pending" ||
        getVisibleThreadId?.() !== ticket.threadId
      )
        return { status: "stale" };
      if (entry.view.busy) return { status: "busy" };
      const payload = responsePayload(entry, action, response);
      update(entry, { busy: true, busyAction: action, error: "" });
      // Subscribers can invalidate a ticket while reacting to the busy update.
      if (
        current(ticket) !== entry ||
        getVisibleThreadId?.() !== ticket.threadId
      ) {
        if (current(ticket) === entry)
          update(entry, { busy: false, busyAction: null });
        return { status: "stale" };
      }
      try {
        const result = await respond(payload, ticket);
        if (current(ticket) !== entry) return { status: "stale" };
        if (result?.ok === false) {
          const code = result.error?.code;
          if (["stale_request", "identity_required"].includes(code)) {
            update(entry, {
              phase: "expired",
              busy: false,
              busyAction: null,
              error: "",
              draft: emptyDraft(entry.questions),
            });
            return { status: "stale", ticket };
          }
          if (code === "already_sending") return { status: "busy", ticket };
          throw new Error(
            result.error?.message || t("Could not send the approval response."),
          );
        }
        if (
          result?.ok !== true ||
          !matchesReply(result.identity, ticket.bridgeApproval)
        )
          throw new Error(
            t("The approval transport returned an invalid request identity."),
          );
        // Keep a cleared tombstone until root removes the pending request.
        // Renders before the resolved event must not re-enable submission.
        update(entry, {
          phase: "answered",
          busy: false,
          busyAction: null,
          error: "",
          draft: emptyDraft(entry.questions),
        });
        return { status: "answered", ticket };
      } catch (error) {
        if (current(ticket) !== entry) return { status: "stale" };
        const message = error?.message || String(error);
        update(entry, { busy: false, busyAction: null, error: message });
        return { status: "error", message, ticket };
      }
    },
    dispose() {
      entries.clear();
      notify();
      listeners.clear();
    },
    get pendingCount() {
      return entries.size;
    },
    get revision() {
      return revision;
    },
  };
}
