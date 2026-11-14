// Synchronous desktop:call response mapper with exact bridge identity checks.
const { ApprovalTransportError } = require("./approval-transport.cjs");
const invalid = (message) => { throw new ApprovalTransportError("invalid_response", message); };
const DECISIONS = new Set(["accept", "decline", "cancel", "acceptForSession"]);
// harness questions.js PLAN_REVIEW; permission-policy.mjs afterPlanPermission targets.
const PLAN_REVIEW = "plan-review", PLAN_KEEP_PLANNING = "Keep planning";
const PLAN_TARGETS = new Set(["auto", "ask", "acceptEdits", "bypass"]);

// mcpServer/elicitation/request → McpServerElicitationRequestResponse {action, content?, _meta?}
// (codex-schema-0.155.1). The renderer sends p.elicitation {action, persist?, content?}.
const ELICITATION = "mcpServer/elicitation/request";
const ELICITATION_ACTIONS = new Set(["accept", "decline", "cancel"]);
const plainObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const messageOnly = (schema) => schema == null || (plainObject(schema)?.type === "object" &&
  !!plainObject(schema.properties) && Object.keys(schema.properties).length === 0);
const persistModes = (meta) => {
  const persist = plainObject(meta)?.persist;
  return typeof persist === "string" ? [persist] : Array.isArray(persist) ? persist : [];
};
function enumValues(schema) {
  const titled = Array.isArray(schema.oneOf) ? schema.oneOf : Array.isArray(schema.anyOf) ? schema.anyOf : null;
  if (titled) return titled.map((option) => option?.const);
  return Array.isArray(schema.enum) ? schema.enum : null;
}
// One McpElicitationPrimitiveSchema value, as approval-card-model.mjs elicitationField
// reads it. Formats stay a renderer convenience; type, range and choice are enforced.
function validFieldValue(schema, value) {
  const field = plainObject(schema);
  if (!field) return false;
  if (field.type === "string") {
    if (typeof value !== "string") return false;
    const choices = enumValues(field);
    if (choices) return choices.includes(value);
    const length = [...value].length;
    return !(Number.isSafeInteger(field.minLength) && length < field.minLength) &&
      !(Number.isSafeInteger(field.maxLength) && length > field.maxLength);
  }
  if (field.type === "number" || field.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || (field.type === "integer" && !Number.isInteger(value))) return false;
    return !(typeof field.minimum === "number" && value < field.minimum) && !(typeof field.maximum === "number" && value > field.maximum);
  }
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "array") {
    const choices = plainObject(field.items) && enumValues(field.items);
    if (!choices || !Array.isArray(value) || new Set(value).size !== value.length || value.some((entry) => !choices.includes(entry))) return false;
    return !(Number.isSafeInteger(field.minItems) && value.length < field.minItems) &&
      !(Number.isSafeInteger(field.maxItems) && value.length > field.maxItems);
  }
  return false;
}
function elicitationResponse(params, answer) {
  const response = plainObject(answer);
  if (!response || !ELICITATION_ACTIONS.has(response.action) ||
      Object.keys(response).some((key) => !["action", "persist", "content"].includes(key)))
    invalid("Invalid response to this request.");
  if (response.action !== "accept") {
    if (response.persist !== undefined || response.content !== undefined) invalid("Invalid response to this request.");
    return { action: response.action };
  }
  if (params?.mode === "url") {
    if (response.persist !== undefined || response.content !== undefined || typeof params.url !== "string")
      invalid("Invalid response to this request.");
    return { action: "accept" };
  }
  if (params?.mode !== "form") invalid("This request can only be declined.");
  if (messageOnly(params.requestedSchema)) {
    // A message-only request (an MCP tool approval among them) carries no answers. A
    // remembered approval needs the persist mode the request offered (_meta.persist).
    if (response.content !== undefined && !(plainObject(response.content) && !Object.keys(response.content).length))
      invalid("Invalid response to this request.");
    if (response.persist !== undefined && (!["session", "always"].includes(response.persist) || !persistModes(params._meta).includes(response.persist)))
      invalid(response.persist === "always" ? "This request cannot be remembered." : "This request cannot be remembered for the session.");
    return { action: "accept", content: {}, ...(response.persist ? { _meta: { persist: response.persist } } : {}) };
  }
  const schema = plainObject(params.requestedSchema), properties = plainObject(schema?.properties);
  const content = plainObject(response.content);
  if (response.persist !== undefined || schema?.type !== "object" || !properties || !content)
    invalid("Fill in the form before submitting.");
  const required = Array.isArray(schema.required) ? schema.required : [];
  if (Object.keys(content).some((key) => !Object.hasOwn(properties, key)) ||
      required.some((key) => !Object.hasOwn(content, key)) ||
      Object.entries(content).some(([key, value]) => !validFieldValue(properties[key], value)))
    invalid("Fill in the form before submitting.");
  return { action: "accept", content: { ...content } };
}

function approvalResponse(request, p) {
  const method = request.method;
  if (method === ELICITATION) return elicitationResponse(request.params, p.elicitation);
  if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval") {
    // A persistent decision (acceptWithExecpolicyAmendment, applyNetworkPolicyAmendment) is answered with the
    // request's own entry, named by its index: the renderer never composes the rule.
    if (p.decisionIndex !== undefined) {
      const offered = request.params?.availableDecisions;
      const chosen = Number.isInteger(p.decisionIndex) && Array.isArray(offered) ? offered[p.decisionIndex] : undefined;
      if (!plainObject(chosen) || p.decision !== undefined) invalid("Invalid decision.");
      return { decision: JSON.parse(JSON.stringify(chosen)) };
    }
    if (!DECISIONS.has(p.decision)) invalid("Invalid decision.");
    // Deny with feedback: only where the request offers it (codeDesktop.declineFeedback), as plain text.
    if (p.feedback !== undefined) {
      if (p.decision !== "decline" || request.params?.codeDesktop?.declineFeedback !== true || typeof p.feedback !== "string" || p.feedback.length > 4000)
        invalid("Invalid decision.");
      const feedback = p.feedback.trim();
      return feedback ? { decision: "decline", codeDesktop: { feedback } } : { decision: "decline" };
    }
    return { decision: p.decision };
  }
  if (method === "item/permissions/requestApproval") {
    if (typeof p.allow !== "boolean") invalid("Choose allow or deny for this permission request.");
    return { permissions: p.allow ? request.params.permissions : {}, scope: "turn" };
  }
  if (method === "item/tool/requestUserInput") {
    const questions = request.params?.questions;
    if (!Array.isArray(questions) || !questions.length || !p.answers || typeof p.answers !== "object" || Array.isArray(p.answers))
      invalid("Answer each question before submitting.");
    const ids = new Set();
    for (const question of questions) {
      if (typeof question.id !== "string" || !question.id || ids.has(question.id)) invalid("The question IDs are invalid.");
      ids.add(question.id);
      // A skipped question (approval-current.js:7997-8008 q) is an absent key: the schema's
      // `answers: { [key in string]?: ToolRequestUserInputAnswer }` makes keys optional. A
      // present key keeps the full single-answer validation below.
      if (!Object.hasOwn(p.answers, question.id)) continue;
      const values = p.answers[question.id]?.answers;
      // The wire schema is an array. A single-choice/freeform question keeps the
      // one-answer local contract; a multiSelect question (the bridge's extension
      // field, approval-current.js:7911-7921) sends each chosen label once.
      const multi = question.multiSelect === true && question.options?.length > 0;
      // The DeepSeek plan review's Revise (approval-current.js Rse, R07) sends its
      // 'Keep planning' option followed by the feedback text.
      const revise = question.id === PLAN_REVIEW && question.isOther === true && values?.length === 2 && values[0] === PLAN_KEEP_PLANNING &&
        question.options?.some(option => option.label === values[0]) && !question.options.some(option => option.label === values[1]);
      if (!Array.isArray(values) || !values.length || (!multi && !revise && values.length !== 1) || new Set(values).size !== values.length ||
          values.some(value => typeof value !== "string" || !value.trim()))
        invalid("Answer each question before submitting.");
      if (question.options?.length && !question.isOther &&
          values.some(value => !question.options.some(option => option.label === value)))
        invalid("Choose an available answer.");
    }
    if (Object.keys(p.answers).some(id => !ids.has(id))) invalid("An answer belongs to an unknown question.");
    // codeDesktop.afterPlan (R07): the mode the plan card's accept continues in, only on
    // a plan review; the bridge prefers it over its turn hint. Bypass is validated by
    // main.cjs (validateBypassRequest) before this runs.
    let extension;
    if (p.codeDesktop !== undefined) {
      if (!questions.some(question => question.id === PLAN_REVIEW) || !p.codeDesktop || typeof p.codeDesktop !== "object" ||
          Array.isArray(p.codeDesktop) || Object.keys(p.codeDesktop).some(key => key !== "afterPlan") || !PLAN_TARGETS.has(p.codeDesktop.afterPlan))
        invalid("Invalid plan approval.");
      extension = { codeDesktop: { afterPlan: p.codeDesktop.afterPlan } };
    }
    return { answers: Object.fromEntries(questions.filter(question => Object.hasOwn(p.answers, question.id))
      .map(question => [question.id, { answers: [...p.answers[question.id].answers] }])), ...extension };
  }
  invalid(`Unsupported request: ${method}`);
}

function respondToApproval(owner, p) {
  try {
    const request = owner.getApproval(p.id, p.expected);
    const result = approvalResponse(request, p);
    const identity = owner.respond(p.id, result, p.expected);
    return { ok: true, identity };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error instanceof ApprovalTransportError ? error.code : "transport_error",
        // Do not include p, result, answers, JSON payloads, or connection objects.
        message: error instanceof ApprovalTransportError ? error.message : "Could not send the approval response.",
      },
    };
  }
}
module.exports = { approvalResponse, respondToApproval };
