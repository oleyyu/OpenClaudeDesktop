// 'Sign in to Claude again' (claude-signin-model.mjs): when OpenCode's claude-agent (the user's own Claude Code) needs a
// new claude.ai sign-in, how a failed Claude turn is recognized, and the turn_error item's time for 'Signed in again'.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  CLAUDE_EXPIRY_PROMPT_MS, claudeAccountEntry, claudeDateText, claudeExpiry, claudePromptKey, claudeSignInNeed, claudeSignInPrompt,
  claudeSignInText, isClaudeAgentModel, isClaudeAuthFailure, isClaudeSignInText, loginExpiresAtMs,
} from "../src/claude-signin-model.mjs";
import { normalizeTurnError, turnErrorCategory } from "../src/turn-error-model.mjs";
import { codeTranscriptEntries } from "../src/code-transcript-entries.mjs";
import { getLocale, setLocale } from "../electron/i18n/index.mjs";

const NOW = Date.parse("2026-11-26T10:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const MODEL = "claude-agent/claude-haiku-5-5";
// Claude Code 2.1.322's text when a claude.ai sign-in hits its hard limit (the user's report).
const TIME_LIMIT = "Failed to authenticate: this login reached its time limit and cannot be renewed. Run `claude auth login` to sign in again, or use `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN for unattended jobs";
const account = (entry) => ({ account: null, requiresOpenaiAuth: false, opencode: { providers: [{ id: "openai", needsAuth: true }, { id: "claude-agent", ...entry }] } });
const locale = getLocale();
after(() => setLocale(locale));

test("claude-agent models and the account/read row", () => {
  assert.equal(isClaudeAgentModel(MODEL), true);
  assert.equal(isClaudeAgentModel("opencode/hy4-flash-free"), false);
  assert.equal(isClaudeAgentModel(null), false);
  assert.equal(claudeAccountEntry(account({ email: "a@b.c" }))?.email, "a@b.c");
  assert.equal(claudeAccountEntry({ opencode: { providers: [{ id: "openai" }] } }), null);
  assert.equal(claudeAccountEntry(null), null);
});

test("loginExpiresAt reads ISO strings, seconds and ms", () => {
  assert.equal(loginExpiresAtMs("2026-11-26T10:00:00.000Z"), NOW);
  assert.equal(loginExpiresAtMs(NOW / 1000), NOW);
  assert.equal(loginExpiresAtMs(NOW), NOW);
  for (const bad of [null, "", "soon", 0, -1, NaN]) assert.equal(loginExpiresAtMs(bad), null);
});

test("claudeSignInNeed: the bridge's reason, an end date already past, or nothing", () => {
  assert.deepEqual(claudeSignInNeed({ needsAuth: true, signInReason: "expired", statusMessage: "x" }, NOW), { reason: "expired", message: "x" });
  assert.equal(claudeSignInNeed({ needsAuth: true }, NOW).reason, "signedOut");
  assert.equal(claudeSignInNeed({ needsAuth: true, signInReason: "bogus", loginExpiresAt: NOW - 1 }, NOW).reason, "expired");
  // Signed in per Claude Code, but the stored end has passed: it can't be renewed, so it needs a new sign-in.
  assert.equal(claudeSignInNeed({ needsAuth: false, loginExpiresAt: NOW - 1 }, NOW).reason, "expired");
  assert.equal(claudeSignInNeed({ needsAuth: false, loginExpiresAt: NOW + DAY }, NOW), null);
  assert.equal(claudeSignInNeed(null, NOW), null);
});

test("claudeExpiry: ended / soon within Claude Code's 10-day warning", () => {
  assert.deepEqual(claudeExpiry({ loginExpiresAt: NOW + 2 * DAY }, NOW), { at: NOW + 2 * DAY, ended: false, soon: true, left: 2 * DAY });
  assert.equal(claudeExpiry({ loginExpiresAt: NOW + 20 * DAY }, NOW).soon, false);
  assert.equal(claudeExpiry({ loginExpiresAt: NOW - 1 }, NOW).ended, true);
  assert.equal(claudeExpiry({}, NOW), null);
});

test("Claude Code's sign-in texts are recognized; its temporary auth errors are not", () => {
  for (const text of [TIME_LIMIT, "Login expired · Run /login", "OAuth token revoked · Please run /login", "Not logged in · Please run /login",
    "Invalid API key · Run `claude auth login` in a terminal"]) assert.equal(isClaudeSignInText(text), true, text);
  for (const text of ["Could not refresh your login because another Claude Code process is refreshing it",
    "Authentication error · This may be a temporary network issue, please try again", "Invalid API key", "Not logged in", "", null])
    assert.equal(isClaudeSignInText(text), false, String(text));
});

test("isClaudeAuthFailure: the bridge's mark, or an auth failure on a Claude model", () => {
  assert.equal(isClaudeAuthFailure({ message: "x", codeDesktop: { signInProvider: "claude-agent" } }, { model: "opencode/x" }), true);
  assert.equal(isClaudeAuthFailure({ message: TIME_LIMIT }, { model: MODEL }), true);
  assert.equal(isClaudeAuthFailure({ message: "401", codexErrorInfo: "unauthorized" }, { model: MODEL }), true);
  // The same text on another provider's model is that provider's problem, not Claude's sign-in.
  assert.equal(isClaudeAuthFailure({ message: TIME_LIMIT }, { model: "deepseek/deepseek-chat" }), false);
  assert.equal(isClaudeAuthFailure({ message: "Rate limited", codexErrorInfo: "usageLimitExceeded" }, { model: MODEL }), false);
  assert.equal(isClaudeAuthFailure(null, { model: MODEL }), false);
});

test("claudeSignInPrompt: only for a Claude session; gone → its reason, ending within 3 days → soon", () => {
  const ended = account({ needsAuth: true, signInReason: "expired", email: "a@b.c", loginExpiresAt: NOW - DAY });
  assert.deepEqual(claudeSignInPrompt(ended, { model: MODEL, now: NOW }), { reason: "expired", expiresAt: NOW - DAY, email: "a@b.c" });
  assert.equal(claudeSignInPrompt(ended, { model: "opencode/hy4-flash-free", now: NOW }), null);
  // Signed out with a stored end still ahead: the end date says nothing about why, so it isn't shown.
  assert.equal(claudeSignInPrompt(account({ needsAuth: true, signInReason: "signedOut", loginExpiresAt: NOW + DAY }), { model: MODEL, now: NOW }).expiresAt, null);
  // Not installed / too old: nothing to sign in to, so no dialog (Settings › Account says how).
  assert.equal(claudeSignInPrompt(account({ needsAuth: true, signInReason: "missing" }), { model: MODEL, now: NOW }), null);
  assert.equal(claudeSignInPrompt(account({ needsAuth: true, signInReason: "tooOld" }), { model: MODEL, now: NOW }), null);
  const soon = claudeSignInPrompt(account({ needsAuth: false, loginExpiresAt: NOW + CLAUDE_EXPIRY_PROMPT_MS - 1 }), { model: MODEL, now: NOW });
  assert.equal(soon.reason, "soon");
  assert.equal(claudeSignInPrompt(account({ needsAuth: false, loginExpiresAt: NOW + CLAUDE_EXPIRY_PROMPT_MS + 1 }), { model: MODEL, now: NOW }), null);
  assert.equal(claudePromptKey(soon), `soon:${NOW + CLAUDE_EXPIRY_PROMPT_MS - 1}`);
  assert.equal(claudePromptKey(null), "");
});

test("claudeSignInText: every reason has its sentence, dates in the app's language", () => {
  setLocale("en-US");
  assert.match(claudeSignInText("expired", { expiresAt: NOW }), /ended on Nov 26, 2026 and can’t be renewed/);
  assert.match(claudeSignInText("expired"), /reached its time limit/);
  assert.match(claudeSignInText("authFailed"), /couldn’t authenticate/);
  assert.match(claudeSignInText("missing"), /isn’t installed/);
  assert.match(claudeSignInText("tooOld"), /claude update/);
  assert.match(claudeSignInText("soon", { expiresAt: NOW }), /^Your Claude Code sign-in ends Nov 26/);
  assert.match(claudeSignInText("signedOut"), /signed out/);
  setLocale("zh-CN");
  assert.equal(claudeDateText(NOW), "2026年11月26日");
  assert.match(claudeSignInText("expired", { expiresAt: NOW }), /2026年11月26日/);
  assert.doesNotMatch(claudeSignInText("authFailed"), /[A-Za-z]{4,} [a-z]{3,}/, "translated");
  setLocale("en-US");
});

test("a Claude Code sign-in failure is an auth failure (401), with the bridge's sign-in mark kept", () => {
  // From an older bridge that reported it as 'other' (provider.unknown): the text alone makes it auth.
  assert.equal(turnErrorCategory({ message: TIME_LIMIT, codexErrorInfo: "other" }), "auth");
  assert.equal(turnErrorCategory({ message: "Could not refresh your login because another Claude Code process is refreshing it", codexErrorInfo: "other" }), "unknown");
  const normalized = normalizeTurnError({ message: TIME_LIMIT, codexErrorInfo: "unauthorized", additionalDetails: "provider.unknown", codeDesktop: { signInProvider: "claude-agent" } });
  assert.equal(normalized.codeDesktop?.signInProvider, "claude-agent");
  assert.equal(normalizeTurnError({ message: "x", codeDesktop: { signInProvider: "../evil" } }).codeDesktop, undefined);
});

test("the turn_error item carries when it failed (c06cf64bb timestamp), for the card's 'Signed in again'", () => {
  const items = [{ id: "u1", turnId: "t1", type: "userMessage", content: [{ type: "text", text: "hi" }] }];
  const errorItem = (options) => codeTranscriptEntries(items, options).flatMap((entry) => entry.items || []).find((item) => item?.kind === "turn_error");
  const at = Date.parse("2026-11-26T10:05:00.000Z");
  assert.equal(errorItem({ turnErrors: { t1: { message: "API Error: 401", status: 401, at } } }).timestamp, "2026-11-26T10:05:00.000Z");
  assert.equal(errorItem({ turnErrors: { t1: { message: "x", status: 401 } }, turnTimes: { t1: { startedAt: at / 1000 - 5, completedAt: at / 1000 } } }).timestamp, "2026-11-26T10:05:00.000Z");
  assert.equal("timestamp" in errorItem({ turnErrors: { t1: { message: "x" } } }), false);
});
