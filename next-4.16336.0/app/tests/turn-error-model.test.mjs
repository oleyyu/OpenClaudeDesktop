import test from "node:test";
import assert from "node:assert/strict";
import { classifyTurnError, describeTurnError, DEEPSEEK_AUTH_HINT, presentTurnError, TURN_ERROR_CATEGORIES, turnErrorCategory, retryInput, retryShortLabel, turnErrorDetails, turnErrorPlacements, turnErrorStatus, TURN_ERROR_ICONS } from "../src/turn-error-model.mjs";
import { emptyState, latestTurnError, reduce } from "../src/state.js";
import { transcriptStatusPresentation as status } from "../src/transcript-status-model.mjs";
import { sessionState } from "../src/sidebar-model.js";

test("every CodexErrorInfo variant maps to a source category (c1298b0ba Z)", () => {
  const expected = {
    usageLimitExceeded: "rate_limit", sessionBudgetExceeded: "session_budget", rateLimitExceeded: "server_rate_limit",
    serverOverloaded: "overloaded", internalServerError: "server_error", unauthorized: "auth",
    contextWindowExceeded: "context_length", badRequest: "invalid_request",
    cyberPolicy: "safety_block", misalignmentPolicyViolation: "misalignment", threadRollbackFailed: "unknown", sandboxError: "unknown", other: "unknown",
  };
  for (const [info, category] of Object.entries(expected)) assert.equal(classifyTurnError(info), category, info);
  for (const key of ["httpConnectionFailed", "responseStreamConnectionFailed", "responseStreamDisconnected", "responseTooManyFailedAttempts"])
  {
    // W14-code TM-11: a transport failure with an HTTP error status classifies by it (shared-3 k3 → D3).
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: null } }), "network", key);
    assert.equal(classifyTurnError({ [key]: {} }), "network", key);
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: 502 } }), "server_error", key);
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: 429 } }), "server_rate_limit", key);
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: 529 } }), "overloaded", key);
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: 403 } }), "permission", key);
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: 413 } }), "request_too_large", key);
    assert.equal(classifyTurnError({ [key]: { httpStatusCode: 404 } }), "invalid_request", key);
  }
  assert.equal(classifyTurnError({ activeTurnNotSteerable: { turnKind: "review" } }), "unknown");
  for (const value of [null, undefined, "", "__proto__", 42, {}, []]) assert.equal(classifyTurnError(value), "unknown");
});

test("presentation copies the source strings and retry/icon rules", () => {
  assert.deepEqual({ ...presentTurnError("rate_limit") }, { category: "rate_limit", headline: "Usage limit reached", markerLabel: "Usage limit reached",
    hint: "You’ve reached your usage limit. Try again after your limit resets.", retryHelps: true, compactHelps: false, modelSwitchHelps: false, icon: "usage" });
  assert.deepEqual({ ...presentTurnError("overloaded") }, { category: "overloaded", headline: "Service is busy", markerLabel: "Service was busy",
    hint: "Try again in a moment, or switch to a different model.", hintWithoutRetry: "You can send a message to try again in a moment, or switch to a different model.",
    hintWithoutComposer: "This is usually temporary.", retryHelps: true, compactHelps: false, modelSwitchHelps: true, icon: "warning" });
  assert.equal(presentTurnError("server_rate_limit").markerLabel, "Server was temporarily limiting requests");
  // c70db48e3 q.serverRateLimit (03EBy1LRit) and its WithoutRetry / WithoutComposer variants (TS-1, TS-3).
  assert.equal(presentTurnError("server_rate_limit").hint, "Too many requests right now. Try again in a moment.");
  assert.equal(presentTurnError("server_rate_limit").hintWithoutRetry, "Too many requests right now. Wait a moment, then send a message to try again.");
  assert.equal(presentTurnError("server_rate_limit").hintWithoutComposer, "Too many requests right now. This usually clears in a moment.");
  assert.equal(presentTurnError("network").hintWithoutRetry, "Check your internet connection, VPN, or proxy, then send a message to try again.");
  // TS-2: q.contextLength (j4gDC1/jbD) is the whole sentence.
  assert.equal(presentTurnError("context_length", { canRewind: true }).hint,
    "This chat is too long to continue. Compact it to summarize earlier messages and keep going, rewind to an earlier point, or start a new chat.");
  assert.deepEqual([presentTurnError("permission").headline, presentTurnError("permission").retryHelps], ["Access denied", false]);
  assert.equal(presentTurnError("request_too_large", { canRewind: true }).hint, "An attachment is too large. Rewind to remove it, then send your message again.");
  assert.equal(presentTurnError("context_length").hint, "This chat is too long to continue. Start a new chat.");
  assert.equal(presentTurnError("context_length").markerLabel, "Context window was full");
  assert.equal(presentTurnError("context_length").retryHelps, false);
  assert.equal(presentTurnError("auth").retryHelps, false);
  assert.equal(presentTurnError("invalid_request").retryHelps, false);
  assert.equal(presentTurnError("network").headline, "Connection problem");
  assert.doesNotMatch(presentTurnError("server_error").hint, /statusUrl|status\.|check \{/);
  assert.equal(presentTurnError("constructor").category, "unknown");
  const unknown = presentTurnError("unknown", { message: "boom" });
  assert.deepEqual([unknown.headline, unknown.hint, unknown.retryHelps], ["An API error occurred", "Try sending your message again.", true]);
  const client = presentTurnError("unknown", { message: "unexpected status 404 Not Found" });
  assert.deepEqual([client.hint, client.retryHelps], ["The request couldn’t be completed.", false]);
  assert.equal(presentTurnError("unknown", { message: "HTTP 503" }).retryHelps, true);
  assert.deepEqual(TURN_ERROR_ICONS.usage, { name: "UsageGaugeHigh", tone: "danger" });
  assert.deepEqual(TURN_ERROR_ICONS.warning, { name: "Warning", tone: "danger" });
});

test("details join message and additionalDetails; status comes only from the variant", () => {
  assert.equal(turnErrorDetails({ message: " A ", additionalDetails: "B\nC" }), "A\n\nB\nC");
  assert.equal(turnErrorDetails({ message: "A", additionalDetails: null }), "A");
  assert.equal(turnErrorDetails(null), "");
  assert.equal(turnErrorStatus({ responseStreamDisconnected: { httpStatusCode: 503 } }), 503);
  assert.equal(turnErrorStatus({ httpConnectionFailed: { httpStatusCode: null } }), undefined);
  assert.equal(turnErrorStatus("usageLimitExceeded"), undefined);
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: "usageLimitExceeded" }).icon, "usage");
});

test("DeepSeek failure codes: quota is the billing card, a key problem names the DeepSeek key", () => {
  const billing = describeTurnError({ message: "Insufficient Balance", codexErrorInfo: "usageLimitExceeded", additionalDetails: "QUOTA" });
  assert.deepEqual({ ...billing }, { category: "billing", headline: "Billing issue", markerLabel: "Billing issue",
    hint: "Add credits or update billing with DeepSeek to continue.", retryHelps: false, compactHelps: false, modelSwitchHelps: false, icon: "warning", platformUrl: "https://platform.deepseek.com/usage" });
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: "usageLimitExceeded", additionalDetails: "ACCOUNT_QUOTA" }).category, "billing");
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: null, additionalDetails: "QUOTA" }).category, "billing");
  // A Codex plan limit (no DeepSeek code) keeps the usage-limit card.
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: "usageLimitExceeded", additionalDetails: "resets at 5pm" }).category, "rate_limit");
  for (const code of ["AUTH", "INVALID_CREDENTIAL", "MISSING_CREDENTIAL"]) {
    const auth = describeTurnError({ message: "Authentication Fails", codexErrorInfo: "unauthorized", additionalDetails: code });
    assert.deepEqual([auth.category, auth.headline, auth.hint, auth.retryHelps], ["auth", "Authentication failed", DEEPSEEK_AUTH_HINT, false], code);
  }
  assert.equal(DEEPSEEK_AUTH_HINT, "Check your DeepSeek API key in Settings › Models.");
  // The card can open the page that holds the key, and an empty DeepSeek balance links to the Platform.
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: "unauthorized", additionalDetails: "AUTH" }).settingsPage, "models");
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: null, additionalDetails: "QUOTA" }).platformUrl, "https://platform.deepseek.com/usage");
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: null, additionalDetails: "BILLING" }).platformUrl, undefined);
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: "unauthorized", additionalDetails: null }).hint, "Sign in again to continue.");
  assert.equal(describeTurnError({ message: "x", codexErrorInfo: "rateLimitExceeded", additionalDetails: "RATE_LIMIT" }).category, "server_rate_limit");
});

test("R08 output limit: MAX_TOKENS is the source output_token_limit card with no details", () => {
  assert.ok(TURN_ERROR_CATEGORIES.includes("output_token_limit"));
  const error = { message: "Response exceeded the output limit", codexErrorInfo: null, additionalDetails: "MAX_TOKENS" };
  assert.equal(turnErrorCategory(error), "output_token_limit");
  assert.deepEqual({ ...describeTurnError(error) }, { category: "output_token_limit", headline: "Response exceeded the output limit",
    markerLabel: "Response exceeded the output limit", hint: "Ask DeepSeek to continue, or break the task into smaller steps.",
    retryHelps: true, compactHelps: false, modelSwitchHelps: false, icon: "warning" });
  // Source verdict G.output_token_limit "drop": no View details.
  assert.equal(turnErrorDetails(error), "");
  // Another code with the same message is not the output limit.
  assert.equal(turnErrorCategory({ ...error, additionalDetails: "OTHER" }), "unknown");
});

test("R08 recovery flags: compactHelps for context_length, modelSwitchHelps for overloaded (c1298b0ba xe)", () => {
  for (const category of TURN_ERROR_CATEGORIES) {
    const view = presentTurnError(category);
    assert.equal(view.compactHelps, category === "context_length", category);
    assert.equal(view.modelSwitchHelps, category === "overloaded", category);
  }
  const context = describeTurnError({ message: "full", codexErrorInfo: "contextWindowExceeded", additionalDetails: "CONTEXT_WINDOW_EXCEEDED" });
  assert.deepEqual([context.category, context.compactHelps, context.retryHelps, context.hint],
    ["context_length", true, false, "This chat is too long to continue. Start a new chat."]);
  assert.equal(describeTurnError({ message: "busy", codexErrorInfo: "serverOverloaded" }).modelSwitchHelps, true);
});

test("R08 reducer: a completed turn carrying an error keeps it live and from history", () => {
  const error = { message: "Response exceeded the output limit", codexErrorInfo: null, additionalDetails: "MAX_TOKENS", misalignment: null };
  let state = reduce(emptyState, started("t1"));
  state = reduce(state, { event: { method: "turn/completed", params: { threadId: "th", turn: { id: "t1", status: "completed", error } } } });
  assert.deepEqual(state.turnErrors.th.t1, { message: error.message, codexErrorInfo: null, additionalDetails: "MAX_TOKENS" });
  assert.equal(state.errors.th, null); assert.equal(state.active.th, null);
  const hydrated = reduce(emptyState, { type: "hydrate", id: "th", thread: { id: "th", turns: [
    { id: "cut", status: "completed", error, items: [{ id: "u", type: "userMessage", content: [] }] },
    { id: "stopped", status: "interrupted", error: { message: "stop" }, items: [] },
  ] } });
  assert.deepEqual(Object.keys(hydrated.turnErrors.th), ["cut"]);
  assert.equal(turnErrorCategory(hydrated.turnErrors.th.cut), "output_token_limit");
});

test("retry status short labels follow c4a9ee384 sn short table", () => {
  assert.equal(retryShortLabel("rateLimitExceeded"), "Rate limited");
  assert.equal(retryShortLabel("usageLimitExceeded"), "Rate limited");
  assert.equal(retryShortLabel("serverOverloaded"), "Model overloaded");
  assert.equal(retryShortLabel("unauthorized"), "Authentication failed");
  assert.equal(retryShortLabel({ responseStreamDisconnected: { httpStatusCode: null } }), "Request failed");
  assert.equal(retryShortLabel(null), "Request failed");
});

test("placement: the latest turn gets the card, older failures the marker", () => {
  const items = [
    { id: "u1", turnId: "t1", type: "userMessage" }, { id: "u2", turnId: "t2", type: "userMessage" }, { id: "a2", turnId: "t2", type: "agentMessage" },
  ];
  const errors = { t1: { message: "one" }, t2: { message: "two" } };
  assert.deepEqual([...turnErrorPlacements(items, errors)], [["t1", "marker"], ["t2", "card"]]);
  // A newer running turn (even before its items arrive) demotes the card.
  assert.deepEqual([...turnErrorPlacements(items, errors, { activeTurnId: "t3" })], [["t1", "marker"], ["t2", "marker"]]);
  // A later successful turn also demotes it (isLastEntry).
  assert.deepEqual([...turnErrorPlacements([...items, { id: "u3", turnId: "t3", type: "userMessage" }], errors)], [["t1", "marker"], ["t2", "marker"]]);
  // A failure whose turn is not in the loaded transcript is not invented.
  assert.deepEqual([...turnErrorPlacements(items, { t9: { message: "x" } })], []);
  assert.equal(turnErrorPlacements(items, undefined).size, 0);
});

test("retry input replays only a text-only user message", () => {
  const text = [{ type: "text", text: "hello", text_elements: [{ byteRange: { start: 0, end: 1 }, placeholder: null }] }, { type: "text", text: "more" }];
  assert.deepEqual(retryInput([{ id: "u", turnId: "t", type: "userMessage", content: text }], "t"),
    [{ type: "text", text: "hello", text_elements: text[0].text_elements }, { type: "text", text: "more", text_elements: [] }]);
  assert.equal(retryInput([{ id: "u", turnId: "t", type: "userMessage", content: [...text, { type: "localImage", path: "/tmp/a.png" }] }], "t"), null);
  assert.equal(retryInput([{ id: "u", turnId: "t", type: "userMessage", content: [{ type: "text", text: "  " }] }], "t"), null);
  assert.equal(retryInput([{ id: "u", turnId: "t", type: "userMessage", content: text }], "other"), null);
  assert.equal(retryInput([], "t"), null);
});

const started = (turn = "t1") => ({ event: { method: "turn/started", params: { threadId: "th", turn: { id: turn } } } });
const failure = { message: "You've hit your usage limit.", codexErrorInfo: "usageLimitExceeded", additionalDetails: "details", misalignment: null };

test("reducer: a failed turn keeps its TurnError across the next turn/started", () => {
  let state = reduce(emptyState, started("t1"));
  state = reduce(state, { event: { method: "turn/completed", params: { threadId: "th", turn: { id: "t1", status: "failed", error: failure } } } });
  assert.deepEqual(state.turnErrors.th.t1, { message: failure.message, codexErrorInfo: "usageLimitExceeded", additionalDetails: "details" });
  assert.equal(state.errors.th, null);
  state = reduce(state, started("t2"));
  assert.deepEqual(state.turnErrors.th.t1.message, failure.message);
  state = reduce(state, { event: { method: "turn/completed", params: { threadId: "th", turn: { id: "t2", status: "completed", error: null } } } });
  assert.deepEqual(Object.keys(state.turnErrors.th), ["t1"]);
});

test("reducer: willRetry true sets retrying only; progress and turn end clear it", () => {
  let state = reduce(emptyState, started("t1"));
  const retry = { event: { method: "error", params: { threadId: "th", turnId: "t1", willRetry: true, error: { message: "429; retrying", codexErrorInfo: "rateLimitExceeded" } } } };
  state = reduce(state, retry);
  assert.deepEqual(state.retrying.th, { turnId: "t1", message: "429; retrying", codexErrorInfo: "rateLimitExceeded", attempt: null, maxRetries: null, nextAt: null, action: null });
  assert.equal(state.turnErrors.th, undefined);
  assert.equal(state.errors.th, null);
  assert.equal(state.active.th, "t1");
  for (const event of [
    { method: "item/agentMessage/delta", params: { threadId: "th", turnId: "t1", itemId: "a", delta: "x" } },
    { method: "item/started", params: { threadId: "th", turnId: "t1", item: { id: "b", type: "reasoning" } } },
    { method: "item/reasoning/textDelta", params: { threadId: "th", turnId: "t1", itemId: "b", delta: "y" } },
    { method: "turn/completed", params: { threadId: "th", turn: { id: "t1", status: "completed" } } },
    { method: "turn/started", params: { threadId: "th", turn: { id: "t2" } } },
  ]) {
    const cleared = reduce(reduce(state, retry), { event });
    assert.equal(cleared.retrying.th, null, event.method);
  }
  // Another thread's progress does not clear this thread's retry.
  assert.ok(reduce(state, { event: { method: "item/agentMessage/delta", params: { threadId: "other", itemId: "a", delta: "x" } } }).retrying.th);
  assert.deepEqual(reduce(state, { event: { kind: "connection", connected: false } }).retrying, {});
});

test("reducer: willRetry false records the turn error; no turn id stays thread-wide", () => {
  let state = reduce(emptyState, started("t1"));
  state = reduce(state, { event: { method: "error", params: { threadId: "th", turnId: "t1", willRetry: false, error: failure } } });
  assert.equal(state.turnErrors.th.t1.codexErrorInfo, "usageLimitExceeded");
  assert.equal(state.errors.th, null);
  state = reduce(state, { event: { method: "error", params: { threadId: "th", turnId: "", willRetry: false, error: { message: "No turn", codexErrorInfo: "serverOverloaded" } } } });
  // R08: a thread-wide error keeps the TurnError shape for the transcript-tail card.
  assert.deepEqual(state.errors.th, { message: "No turn", codexErrorInfo: "serverOverloaded", additionalDetails: null });
  assert.equal(describeTurnError(state.errors.th).category, "overloaded");
  assert.equal(sessionState({ id: "th" }, state), "blocked");
  // A turn/completed error without a turn id is thread-wide too; turn/started clears it.
  const noId = reduce(emptyState, { event: { method: "turn/completed", params: { threadId: "th", turn: { status: "failed", error: { message: "Lost", additionalDetails: "X" } } } } });
  assert.deepEqual(noId.errors.th, { message: "Lost", codexErrorInfo: null, additionalDetails: "X" });
  assert.equal(reduce(noId, started("t2")).errors.th, null);
  const empty = reduce(emptyState, { event: { method: "error", params: { threadId: "th", turnId: "t1", willRetry: false } } });
  assert.equal(empty.turnErrors.th.t1.message, "DeepSeek reported an error.");
});

test("hydrate records failed history turns and keeps live ones", () => {
  let state = reduce(emptyState, { event: { method: "turn/completed", params: { threadId: "th", turn: { id: "live", status: "failed", error: { message: "live" } } } } });
  state = reduce(state, { type: "hydrate", id: "th", thread: { id: "th", turns: [
    { id: "old", status: "failed", error: failure, items: [{ id: "u-old", type: "userMessage", content: [] }] },
    { id: "ok", status: "completed", error: null, items: [{ id: "u-ok", type: "userMessage", content: [] }] },
    { id: "no-error", status: "failed", error: null, items: [] },
  ] } });
  assert.deepEqual(Object.keys(state.turnErrors.th).sort(), ["live", "old"]);
  assert.equal(state.turnErrors.th.old.additionalDetails, "details");
  // Latest loaded turn succeeded: the session is not flagged as blocked.
  assert.equal(latestTurnError(state, "th"), null);
  assert.equal(sessionState({ id: "th" }, state), "done");
  const failedLast = reduce(emptyState, { type: "hydrate", id: "th", thread: { id: "th", turns: [{ id: "old", status: "failed", error: failure, items: [{ id: "u", type: "userMessage", content: [] }] }] } });
  assert.equal(latestTurnError(failedLast, "th").message, failure.message);
  assert.equal(sessionState({ id: "th" }, failedLast), "blocked");
  assert.equal(latestTurnError(reduce(failedLast, started("new")), "th"), null);
});

test("status row: retrying replaces the working label; stop wins", () => {
  const ready = { sessionKey: "th", ready: true, connected: true, running: true };
  const retry = status({ ...ready, retrying: "Rate limited" });
  assert.equal(retry.phase, "running");
  assert.equal(retry.label, "Rate limited · Retrying…");
  assert.deepEqual(retry.retry, { error: "Rate limited", label: "Retrying…", later: null, detail: null, link: null });
  assert.equal(status({ ...ready, retrying: "Rate limited", stopping: true }).label, "Stopping…");
  assert.equal(status({ ...ready, running: false, retrying: "Rate limited" }).phase, "idle");
  assert.equal(status(ready).retry, null);
});

test("Codex misalignment stop: precaution copy, no retry, findings and the steer to continue; the composer stays closed", async () => {
  const { normalizeTurnError, describeTurnError, turnErrorDetails, misalignmentStop } = await import("../src/turn-error-model.mjs");
  const stopped = normalizeTurnError({ message: "stopped", codexErrorInfo: "misalignmentPolicyViolation", additionalDetails: null, misalignment: null });
  const plain = describeTurnError(stopped);
  assert.equal(plain.category, "misalignment");
  assert.equal(plain.headline, "Chat stopped as a precaution");
  assert.equal(plain.retryHelps, false);
  assert.equal(turnErrorDetails(stopped), "");
  const paused = describeTurnError(normalizeTurnError({ message: "stopped", codexErrorInfo: "misalignmentPolicyViolation",
    misalignment: { errorType: "x", detailedExplanation: "The agent edited files you didn't ask about.", steer: { message: "I acknowledge the findings; continue carefully." } } }));
  assert.equal(paused.headline, "Chat paused as a precaution");
  assert.equal(paused.findings, "The agent edited files you didn't ask about.");
  assert.equal(paused.continueMessage, "I acknowledge the findings; continue carefully.");
  const items = [{ turnId: "t1", type: "userMessage" }, { turnId: "t2", type: "userMessage" }];
  assert.equal(misalignmentStop(items, { t2: stopped }), "t2");
  assert.equal(misalignmentStop(items, { t1: stopped }), null, "a later turn reopens the chat");
  assert.equal(misalignmentStop(items, { t2: stopped }, { activeTurnId: "t3" }), null);
  // A provider 402 from a bridge is billing in the running core's words.
  const billing = describeTurnError(normalizeTurnError({ message: "Insufficient account balance", codexErrorInfo: "usageLimitExceeded", additionalDetails: "BILLING" }));
  assert.equal(billing.category, "billing");
  assert.equal(billing.retryHelps, false);
  assert.doesNotMatch(billing.hint, /DeepSeek/);
});

test("Codex safety refusals: cyberPolicy and the bio/legacy texts are a non-retryable card with Codex's links", () => {
  const cyber = describeTurnError({ message: "blocked", codexErrorInfo: "cyberPolicy" });
  assert.equal(cyber.category, "safety_block");
  assert.equal(cyber.headline, "This content can’t be shown");
  assert.equal(cyber.retryHelps, false);
  assert.deepEqual(cyber.links.map((link) => link.label), ["Learn more"]);
  const sol = describeTurnError({ message: "blocked", codexErrorInfo: "cyberPolicy" }, { model: "gpt-5.6-sol" });
  assert.deepEqual(sol.links.map((link) => link.label), ["Learn more", "Apply for Daybreak"]);
  assert.match(sol.hint, /apply for Daybreak/);
  assert.match(describeTurnError({ codexErrorInfo: "cyberPolicy" }, { model: "gpt-6-astra" }).hint, /isn’t available for Astra/);
  const bio = describeTurnError({ message: "This content was flagged for possible biological risk. More text", codexErrorInfo: null });
  assert.equal(bio.category, "safety_block");
  assert.deepEqual(bio.links.map((link) => link.label), ["Trusted Access", "Learn more"]);
  assert.equal(turnErrorCategory({ message: JSON.stringify({ error: { code: "bio_policy", message: "x" } }) }), "safety_block");
  assert.equal(turnErrorCategory({ message: "{not json" }), "unknown");
});

test("Codex session budget: its own card, no retry, Open config and no usage-limit wording", () => {
  const view = describeTurnError({ message: "shared rollout token budget exhausted", codexErrorInfo: "sessionBudgetExceeded" });
  assert.equal(view.category, "session_budget");
  assert.equal(view.retryHelps, false);
  assert.equal(view.editConfig, true);
  assert.doesNotMatch(view.hint, /resets/);
  assert.equal(retryShortLabel("sessionBudgetExceeded"), "Request failed");
});

test("a signed-out request's 401 is an auth failure with Sign in, not a network or generic API error", () => {
  const stream = { message: "unexpected status 401 Unauthorized: Missing bearer or basic authentication in header, url: wss://api.openai.com/v1/responses", codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 401 } } };
  assert.equal(turnErrorCategory(stream), "auth");
  assert.equal(turnErrorCategory({ message: stream.message, codexErrorInfo: null }), "auth");
  assert.equal(turnErrorCategory({ message: "x", codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 401 } } }), "auth");
  assert.equal(describeTurnError(stream, { signIn: true }).signIn, true);
  // Other transport failures keep their category.
  assert.equal(turnErrorCategory({ message: "stream closed", codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } } }), "network");
  assert.equal(turnErrorCategory({ message: "boom", codexErrorInfo: "other" }), "unknown");
});
