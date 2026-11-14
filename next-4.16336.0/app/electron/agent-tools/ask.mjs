// AskUserQuestion: Claude Code's question tool, for a core whose agent has none of its own (Gemini under ACP excludes
// ask_user). The question shows as the session's own question card (source-question-card.jsx), the one a core's
// item/tool/requestUserInput gets: options, multi-select, "Other" free text, skip, and "sent a message instead".
// Every core that has its own question tool lists AskUserQuestion in its nativeTools capability, so it never gets this
// one (agent-tools-host.cjs isToolListed). Codex's request_user_input is turned on in Default mode instead (main.cjs).
//
// ctx.questions.ask(questions) → Promise<{answers: {[id]: {answers: string[]}}} | null | undefined>: the card's
// answer, null when it closed unanswered (the turn stopped), undefined when no card can be shown (main.cjs).
export const group = "ask";
export const native = "AskUserQuestion";

export const MAX_QUESTIONS = 4;
export const MAX_OPTIONS = 4;
export const MAX_HEADER = 12;
// The marker the card answers with when the user sends a message instead (src/approval-draft-model.mjs
// QUESTION_DISMISSED_ANSWER, Claude's lO).
export const DISMISSED = "[User did not answer this question — they sent a message instead. Treat that message as their response; do not re-ask.]";

const clean = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** The tool's questions as item/tool/requestUserInput questions (ids q1…), or throws what is wrong. */
export function requestQuestions(args = {}) {
  const list = Array.isArray(args.questions) ? args.questions : null;
  if (!list || !list.length) throw new Error("questions must list 1 to 4 questions.");
  if (list.length > MAX_QUESTIONS) throw new Error(`Ask at most ${MAX_QUESTIONS} questions at once.`);
  const seen = new Set();
  return list.map((entry, index) => {
    const question = clean(entry?.question, 1000);
    if (!question) throw new Error(`Question ${index + 1} has no text.`);
    if (seen.has(question)) throw new Error("Each question must be different.");
    seen.add(question);
    const options = Array.isArray(entry?.options) ? entry.options : [];
    if (options.length < 2 || options.length > MAX_OPTIONS) throw new Error(`Question ${index + 1} needs 2 to ${MAX_OPTIONS} options.`);
    const labels = new Set();
    const mapped = options.map((option, at) => {
      const label = clean(option?.label, 200);
      if (!label) throw new Error(`Option ${at + 1} of question ${index + 1} has no label.`);
      if (labels.has(label)) throw new Error(`Question ${index + 1} has two options labelled “${label}”.`);
      labels.add(label);
      const description = clean(option?.description, 500);
      return { label, description };
    });
    const header = clean(entry?.header, MAX_HEADER) || `Q${index + 1}`;
    return { id: `q${index + 1}`, header, question, isOther: true, isSecret: false, options: mapped, ...(entry?.multiSelect === true ? { multiSelect: true } : {}) };
  });
}

const quote = (value) => `"${String(value).replace(/"/g, "'")}"`;

/** What the model is told: Claude Code's sentence, each answered question as "question"="answer". */
export function answerText(questions, result) {
  const answers = result && typeof result === "object" && result.answers && typeof result.answers === "object" ? result.answers : {};
  const values = (question) => (Array.isArray(answers[question.id]?.answers) ? answers[question.id].answers.filter((value) => typeof value === "string" && value.trim()) : []);
  if (questions.length && questions.every((question) => { const got = values(question); return got.length === 1 && got[0] === DISMISSED; }))
    return "The user did not answer these questions — they sent a message instead. Treat that message as their response; do not re-ask.";
  const pairs = questions.map((question) => [question, values(question).filter((value) => value !== DISMISSED)]).filter(([, got]) => got.length);
  if (!pairs.length) return "The user skipped the questions without answering. Continue with your best judgement, or ask in plain text if you can’t.";
  const skipped = questions.length - pairs.length;
  return `User has answered your questions: ${pairs.map(([question, got]) => `${quote(question.question)}=${quote(got.join(", "))}`).join(", ")}.`
    + `${skipped ? ` ${skipped === 1 ? "One question was" : `${skipped} questions were`} skipped.` : ""} You can now continue with the user’s answers in mind.`;
}

const questionSchema = {
  type: "object",
  properties: {
    question: { type: "string", description: "The complete question to ask the user. Clear and specific, ending with a question mark." },
    header: { type: "string", description: `Very short label shown as a chip (max ${MAX_HEADER} characters), e.g. "Auth method", "Library".` },
    options: {
      type: "array", minItems: 2, maxItems: MAX_OPTIONS,
      description: "The available choices (2-4). Don't add an \"Other\" option: the user can always type their own answer.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "The choice as the user sees it: 1-5 words." },
          description: { type: "string", description: "What this option means or what happens if it is chosen." },
        },
        required: ["label", "description"],
        additionalProperties: false,
      },
    },
    multiSelect: { type: "boolean", description: "Let the user pick more than one option. Default false." },
  },
  required: ["question", "header", "options"],
  additionalProperties: false,
};

export const tools = [
  {
    name: "AskUserQuestion",
    title: "Ask the user",
    description: "Ask the user multiple-choice questions while you work, shown as a question card in the app, and wait for the answers. Use it to gather preferences or requirements, clarify an ambiguous instruction, or let the user decide between approaches. Each question has 2-4 options; the user can always type a different answer instead, skip a question, or send a message instead of answering. Put a recommended option first and add \"(Recommended)\" to its label. Don't use it to ask whether a plan is ready or to ask for permission to run something.",
    inputSchema: {
      type: "object",
      properties: { questions: { type: "array", minItems: 1, maxItems: MAX_QUESTIONS, description: "1-4 questions to ask.", items: questionSchema } },
      required: ["questions"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const questions = requestQuestions(args);
      if (!ctx?.questions || typeof ctx.questions.ask !== "function") throw new Error("Questions can’t be shown in this session.");
      if (ctx.signal?.aborted) throw new Error("The turn was stopped before the user answered.");
      const result = await ctx.questions.ask(questions);
      if (result === undefined) throw new Error("Questions can’t be shown right now. Ask in plain text instead.");
      if (ctx.signal?.aborted || result === null) throw new Error("The user dismissed the questions without answering.");
      return { content: [{ type: "text", text: answerText(questions, result) }] };
    },
  },
];
