import { t } from "../electron/i18n/index.mjs";
// Failed-turn presentation for Codex TurnError (work/codex-schema-0.155.1/ts/v2/
// TurnError.ts {message, codexErrorInfo, additionalDetails, misalignment};
// CodexErrorInfo.ts). A Codex TurnError is a failed model request: the desktop's API error item (c96d752d0 G2e → pK,
// classified by c70db48e3 Ve), not the result turn_error (K2e "Turn failed"). Copy is the 3.6556.2 category table
// c70db48e3-DVXxzomO.js Y (headline/markerLabel/hint/hintWithoutRetry/hintWithoutComposer/hintNoRewind/retryHelps)
// with its message tables c70db48e3 K/q, shared-14 He/st/ct/lt/H/B/V and shared-3 (usage limit); first ported from
// the 2.2553.1 table c1298b0ba Z (W14-code transcript-rest TM-11 / TS-1..TS-4).
// Pure: no clock, no request, no persistence.

// Source categories reachable from Codex (billing only from DeepSeek failure
// codes). Every mapping is a documented Codex adaptation: Codex reports a
// closed CodexErrorInfo enum, not the Anthropic API error codes/texts the
// source classifier (shared-9 NF) reads.
export const TURN_ERROR_CATEGORIES = Object.freeze([
  "rate_limit", "server_rate_limit", "overloaded", "server_error", "network",
  "auth", "context_length", "invalid_request", "billing", "output_token_limit", "misalignment", "safety_block", "session_budget",
  "permission", "request_too_large", "unknown",
]);

// DeepSeek Harness failure codes (LlmFailure.code) the bridge keeps in
// additionalDetails. CodexErrorInfo alone cannot tell an exhausted DeepSeek
// balance (usageLimitExceeded + QUOTA) from a Codex plan limit, nor a
// DeepSeek key from a ChatGPT sign-in.
const DEEPSEEK_BILLING_CODES = ["QUOTA", "ACCOUNT_QUOTA"];
// A bridge's own marker for an exhausted balance (opencode-bridge projection.js: a provider's HTTP 402, e.g. MiMo's
// 'Insufficient account balance'): billing, worded for the running core rather than DeepSeek.
export const BILLING_DETAILS = "BILLING";
const DEEPSEEK_AUTH_CODES = ["AUTH", "INVALID_CREDENTIAL", "MISSING_CREDENTIAL"];
// The key lives in Settings › Models (API connection); the card's 'Open settings' goes there (settingsPage).
export const DEEPSEEK_AUTH_HINT = t("Check your DeepSeek API key in Settings › Models.");
// Where a DeepSeek balance is topped up: the Platform's usage page (usage-cost-model DEEPSEEK_USAGE_URL).
export const DEEPSEEK_PLATFORM_URL = "https://platform.deepseek.com/usage";

const NETWORK_VARIANTS = ["httpConnectionFailed", "responseStreamConnectionFailed", "responseStreamDisconnected", "responseTooManyFailedAttempts"];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// CodexErrorInfo -> source category.
export function classifyTurnError(info) {
  if (typeof info === "string") switch (info) {
    // Codex plan quota: the source's usage-limit card is category rate_limit (shared-9 tF "You've reached your" ->
    // rate_limit, headline from aF/XP.generic).
    case "usageLimitExceeded": return "rate_limit";
    // Codex's own shared rollout token budget (protocol/src/error.rs SessionBudgetExceeded, set by the user's
    // [features.rollout_budget] limit_tokens): no plan window, so it never resets on a clock and retrying fails again.
    case "sessionBudgetExceeded": return "session_budget";
    // Codex's cybersecurity policy refusal (tui chatwidget/turn_runtime.rs on_cyber_policy_error): not retryable.
    case "cyberPolicy": return "safety_block";
    // Codex request throttling: the source maps the API error code rate_limit
    // to server_rate_limit (shared-9 bF), not to the usage-limit card.
    case "rateLimitExceeded": return "server_rate_limit";
    case "serverOverloaded": return "overloaded";          // bF overloaded
    case "internalServerError": return "server_error";     // bF server_error
    case "unauthorized": return "auth";                    // bF authentication_failed
    case "contextWindowExceeded": return "context_length";
    case "badRequest": return "invalid_request";           // bF invalid_request
    // Codex stopped the chat for a misalignment finding (tui chatwidget/misalignment_policy.rs): not retryable.
    case "misalignmentPolicyViolation": return "misalignment";
    // sandboxError / threadRollbackFailed / other: no source category states the same cause.
    default: return "unknown";
  }
  // Object variants carry {httpStatusCode}: a transport failure, unless the upstream answered with an HTTP error, which
  // classifies by its status as the desktop's (shared-3 k3 → D3: 429 server_rate_limit, 529 overloaded, 5xx
  // server_error, 401 auth, 402 billing, 403 permission, 413 request_too_large, other 4xx invalid_request).
  if (info && typeof info === "object" && NETWORK_VARIANTS.some((key) => own(info, key))) {
    const status = turnErrorStatus(info);
    return status !== undefined && status >= 400 ? statusCategory(status) : "network";
  }
  return "unknown";
}
// shared-3 D3: an API error's category by its HTTP status.
export function statusCategory(status) {
  return status === 429 ? "server_rate_limit" : status === 529 ? "overloaded" : status >= 500 ? "server_error"
    : status === 401 ? "auth" : status === 402 ? "billing" : status === 403 ? "permission" : status === 413 ? "request_too_large"
      : status >= 400 ? "invalid_request" : "unknown";
}

// shared-9 OF: rate_limit (and extra_usage_required) use the usage icon.
export function turnErrorIcon(category) {
  return category === "rate_limit" ? "usage" : "warning";
}
// shared-21 TE/EE (scroll-messages Ze/He, approval-shared Ce/be).
export const TURN_ERROR_ICONS = Object.freeze({
  warning: Object.freeze({ name: "Warning", tone: "danger" }),
  usage: Object.freeze({ name: "UsageGaugeHigh", tone: "danger" }),
});

// c70db48e3 Y. Hints are the no-rewind branch (hintNoRewind); Ve picks the rewind one when the session can rewind
// (presentTurnError canRewind: the core serves thread/revert). hintWithoutRetry / hintWithoutComposer: the hint while
// the card offers no Try again but the composer is there / when there is no composer either (c96d752d0 pK `nt`).
// Documented adaptations are marked inline.
const TABLE = Object.freeze({
  rate_limit: { headline: t("Usage limit reached"), // shared-9 Q.generic
    // $.generic: no reset time, TurnError carries no resetsAt.
    hint: t("You’ve reached your usage limit. Try again after your limit resets."), retryHelps: true },
  server_rate_limit: { headline: t("Server is temporarily limiting requests"), markerLabel: t("Server was temporarily limiting requests"),
    hint: t("Too many requests right now. Try again in a moment."),
    hintWithoutRetry: t("Too many requests right now. Wait a moment, then send a message to try again."),
    hintWithoutComposer: t("Too many requests right now. This usually clears in a moment."), retryHelps: true },
  // shared-14 st.overloaded / ct.overloaded / ct.overloadedWithoutRetry / lt.overloadedWithoutComposer.
  overloaded: { headline: t("Service is busy"), markerLabel: t("Service was busy"),
    hint: t("Try again in a moment, or switch to a different model."),
    hintWithoutRetry: t("You can send a message to try again in a moment, or switch to a different model."),
    hintWithoutComposer: t("This is usually temporary."), retryHelps: true },
  // shared-14 lt.serverError (the variant without the Anthropic status page, which says nothing about the core's backend).
  server_error: { headline: t("Server error"),
    hint: t("The server returned an error while handling this message. It’s usually temporary."), retryHelps: true },
  network: { headline: t("Connection problem"), hint: t("Check your internet connection, VPN, or proxy and try again."),
    hintWithoutRetry: t("Check your internet connection, VPN, or proxy, then send a message to try again."),
    hintWithoutComposer: t("Check your internet connection, VPN, or proxy."), retryHelps: true },
  auth: { headline: t("Authentication failed"), hint: t("Sign in again to continue."), retryHelps: false },
  // q.contextLengthNoRewind; with rewind, CONTEXT_LENGTH_REWIND_HINT (q.contextLength).
  context_length: { headline: t("Your context window is full"), markerLabel: t("Context window was full"),
    hint: t("This chat is too long to continue. Start a new chat."), retryHelps: false },
  invalid_request: { headline: t("Invalid request"), hint: t("The request couldn’t be completed."), retryHelps: false },
  // shared-14 H.hint (an HTTP 402 of another provider); a DeepSeek failure code names the provider (H.hintNamingProvider,
  // describeTurnError).
  billing: { headline: t("Billing issue"), hint: t("Add credits or update billing to continue."), retryHelps: false },
  // c70db48e3 q.outputTokenLimit "Ask Claude to continue, …": the assistant is named as the copy names it (E83: the
  // source string's "DeepSeek" is the running core's assistant, electron/i18n named()).
  output_token_limit: { headline: t("Response exceeded the output limit"),
    hint: t("Ask DeepSeek to continue, or break the task into smaller steps."), retryHelps: true },
  // shared-14 B.accessDenied / V.accessDenied (Y.permission; an HTTP 403).
  permission: { headline: t("Access denied"), hint: t("You don’t have access to this resource — check your permissions."), retryHelps: false },
  // shared-14 He.requestTooLarge, q.requestTooLarge / requestTooLargeNoRewind (an HTTP 413; Ve's ze: rewind helps).
  request_too_large: { headline: t("Request is too large"), hint: t("An attachment is too large. Start a new session to continue."),
    rewindHint: t("An attachment is too large. Rewind to remove it, then send your message again."), retryHelps: false },
  // Codex's precaution stop (tui chatwidget/misalignment_policy.rs MISALIGNMENT_POLICY_TITLE / _DESCRIPTION): only a
  // new chat, or an explicit acknowledgment of the findings when Codex offers one, continues.
  misalignment: { headline: t("Chat stopped as a precaution"), markerLabel: t("Chat stopped as a precaution"),
    hint: t("We couldn’t confirm the agent was acting safely and following your instructions. To continue working, start or resume another chat."), retryHelps: false },
  // Codex's safety refusal (tui history_cell/notices.rs new_cyber_policy_error_event / new_safety_access_block_event): the
  // body depends on the kind (describeTurnError); retrying sends the same request and is refused again.
  safety_block: { headline: t("This content can’t be shown"), hint: t("We take extra care with some cybersecurity requests."), retryHelps: false },
  // Codex's rollout token budget (features.rollout_budget in config.toml) ran out for this session.
  session_budget: { headline: t("Token budget used up"),
    hint: t("This session reached the token budget set in Codex’s config (features.rollout_budget). Start a new session or raise the budget."), retryHelps: false },
  unknown: { headline: t("An API error occurred"), hint: t("Try sending your message again."), retryHelps: true },
});

// Codex's 'Learn more' for every safety refusal and its two access programs (notices.rs).
export const SAFETY_LEARN_MORE_URL = "https://help.openai.com/en/articles/20001326";
export const DAYBREAK_URL = "https://openai.com/form/enterprise-trusted-access-for-cyber/";
export const TRUSTED_ACCESS_URL = "https://chatgpt.com/r/b749fb02595e04c3007a54375f3f4374";
// turn_runtime.rs is_safety_access_block_message: the bio-risk and legacy safety refusals Codex reports as plain text.
const SAFETY_BLOCK_PREFIXES = ["Invalid prompt: we've limited access to this content for safety reasons.", "This content was flagged for possible biological risk."];
function isSafetyBlockText(message) {
  return typeof message === "string" && SAFETY_BLOCK_PREFIXES.some((prefix) => message.startsWith(prefix));
}
// The bio/legacy refusal: the message text, or a JSON error body whose code is bio_policy (turn_runtime.rs).
export function isBioSafetyBlock(message) {
  if (isSafetyBlockText(message)) return true;
  if (typeof message !== "string" || !message.trim().startsWith("{")) return false;
  try {
    const body = JSON.parse(message);
    return body?.error?.code === "bio_policy" || isSafetyBlockText(body?.error?.message);
  } catch { return false; }
}
// daybreak.rs Notice::for_model: Astra models get the 'isn't available' copy.
const DAYBREAK_UNAVAILABLE_MODELS = ["gpt-6-astra", "gpt-6-astra-wm"];
const DAYBREAK_MODEL = "gpt-5.6-sol";

// c70db48e3 q.contextLength (j4gDC1/jbD): the hint when the card offers Compact session and Rewind.
export const CONTEXT_LENGTH_REWIND_HINT = t("This chat is too long to continue. Compact it to summarize earlier messages and keep going, rewind to an earlier point, or start a new chat.");

// shared-9 AF: an HTTP status named in the message text.
function textStatus(message) {
  const match = /(?:API error:?|HTTP(?:\/\d(?:\.\d)?)?|status(?:\s*code)?:?)\s*(4\d{2}|5\d{2})\b/i.exec(message || "");
  return match ? Number(match[1]) : undefined;
}
// CodexErrorInfo object variants forward the upstream status.
export function turnErrorStatus(info) {
  if (!info || typeof info !== "object") return undefined;
  for (const value of Object.values(info))
    if (value && Number.isInteger(value.httpStatusCode)) return value.httpStatusCode;
  return undefined;
}

// c1298 xe for one category: unknown retries only for no status / 429 / 5xx
// (shared-18 Br), otherwise its hint becomes X.invalidRequest.
export function presentTurnError(category, { message = "", canRewind = false } = {}) {
  const key = own(TABLE, category) ? category : "unknown";
  const row = TABLE[key];
  let { hint, retryHelps } = row;
  if (key === "context_length" && canRewind) hint = CONTEXT_LENGTH_REWIND_HINT;
  if (key === "request_too_large" && canRewind) hint = row.rewindHint;
  if (key === "unknown") {
    const status = textStatus(message);
    retryHelps = status === undefined || status === 429 || status >= 500;
    if (!retryHelps) hint = TABLE.invalid_request.hint;
  }
  // c1298 xe recovery flags: compactHelps for context_length, modelSwitchHelps
  // for overloaded (model_not_found / model_requires_strict_sandbox have no
  // Codex identity here).
  // rewindHelps: the context is full (or an attachment too large) and the session can go back to an earlier point
  // (c70db48e3 ze; c3e34355f on() 'Rewind').
  return Object.freeze({ category: key, headline: row.headline, markerLabel: row.markerLabel ?? row.headline, hint,
    ...(row.hintWithoutRetry ? { hintWithoutRetry: row.hintWithoutRetry } : {}),
    ...(row.hintWithoutComposer ? { hintWithoutComposer: row.hintWithoutComposer } : {}), retryHelps,
    compactHelps: key === "context_length", modelSwitchHelps: key === "overloaded", icon: turnErrorIcon(key),
    ...((key === "context_length" || key === "request_too_large") && canRewind ? { rewindHelps: true } : {}) });
}

/**
 * c96d752d0 pK `nt = we.retryHelps && h && !tt.retried ? we.hint : ((L ? we.hintWithoutRetry : we.hintWithoutComposer)
 * ?? we.hint)`: the card's hint for what it offers. retry: Try again is on the card (and not yet pressed); composer:
 * the session can take a message.
 */
export function turnErrorHint(view, { retry = false, composer = true } = {}) {
  if (!view) return "";
  if (view.retryHelps && retry) return view.hint;
  return (composer ? view.hintWithoutRetry : view.hintWithoutComposer) ?? view.hint;
}

/**
 * W14-code r4 复核 (turn-cards): the category fix an official error card offers beside its recovery, by surface.
 * - "turn": a failed turn's turn_error item (c96d752d0 K2e → U1 over vT): no category fix.
 * - "session": the session's error card, c3e34355f Hn (Cowork's tail error, c10f0af0c `m(cI, {errorMessage, errorCategory,
 *   …, onRetry, onDismiss, onAddConnection, …MC})`; the side pane's notice, cccc2cf0a `u(jy, {…, onAddConnection,
 *   onDismiss})`). Its `gr` picks one: billingHelps → "View billing" (bp6E29TomA, primary, no size), usageSettingsHelps →
 *   c74139e0c `l` "Open usage settings" (sLN5P3cZhl, primary, icon UsageGaugeMiddle), reauthHelps → "Sign in again"
 *   (scfgdMgq4h, primary). newSessionHelps needs `onNewSession` (canStartNewSession), which neither caller passes, and
 *   no host category is one of shared-14's newSessionHelps / helpLink rows (spawn_args_too_long, worktree_resume_refused,
 *   bridge_*, session_folder_in_remote_dir), so New session and the help link never draw here.
 * - "item": a session error item, c96d752d0 G2e → pK (c70db48e3 Ve): leadingActions `Ne` = $He reauth ("Sign in
 *   again"), trailingActions `Ke` = the billing CTA (`we.category === "billing"`) or Bhe "Open usage settings" (`Ve =
 *   we.usageSettingsHelps && !!h`, only beside a Try again).
 * The host's categories map onto those rows: auth (with the core's own sign-in) = auth_error's reauth, billing =
 * api_billing_error / pK's billing, rate_limit (a plan quota, so self-serve) = usageSettingsHelps.
 * has: which host destinations exist {signIn, billing, usage, retry}. Returns "signIn" | "billing" | "usageSettings" | null.
 */
export function officialErrorFix(view, surface = "turn", { signIn = false, billing = false, usage = false, retry = false } = {}) {
  if (!view || (surface !== "session" && surface !== "item")) return null;
  if (view.category === "auth" && view.signIn && signIn) return "signIn";
  if (view.category === "billing" && billing) return "billing";
  if (view.category === "rate_limit" && usage && (surface === "session" || retry)) return "usageSettings";
  return null;
}

// The category for a whole TurnError: a DeepSeek quota code is billing
// whatever CodexErrorInfo says; everything else classifies by CodexErrorInfo.
// The DeepSeek bridge marks a Harness 'max-tokens' turn end with
// additionalDetails MAX_TOKENS (projection.js turnError).
export const OUTPUT_LIMIT_DETAILS = "MAX_TOKENS";
export function turnErrorCategory(error) {
  if (error?.misalignment) return "misalignment";
  if (isBioSafetyBlock(error?.message)) return "safety_block";
  if (DEEPSEEK_BILLING_CODES.includes(error?.additionalDetails) || error?.additionalDetails === BILLING_DETAILS) return "billing";
  if (error?.additionalDetails === OUTPUT_LIMIT_DETAILS) return "output_token_limit";
  const category = classifyTurnError(error?.codexErrorInfo ?? null);
  // A signed-out core's request reaches the provider without credentials: Codex reports it as a stream failure (or
  // nothing) whose upstream status is 401 ("unexpected status 401 Unauthorized: Missing bearer or basic
  // authentication"). That is a sign-in problem, not a network one, so it gets the auth card and its Sign in.
  if ((category === "network" || category === "unknown") && (turnErrorStatus(error?.codexErrorInfo) === 401
    || textStatus(error?.message) === 401 || UNAUTHENTICATED.test(error?.message || "")))
    return "auth";
  return category;
}
const UNAUTHENTICATED = /\b401\b[^\n]*unauthorized|missing bearer|missing (?:api key|authentication)/i;

// options: canRewind (the core serves thread/revert), signIn (the core has its own sign-in to offer: an auth failure on a
// core other than DeepSeek's key gets 'Sign in' instead of a hint with nothing to click).
// model: the session's model, for Codex's Astra rule on the cybersecurity refusal.
export function describeTurnError(error, { canRewind = false, signIn = false, model = "" } = {}) {
  const view = presentTurnError(turnErrorCategory(error), { message: error?.message, canRewind });
  // A safety refusal: Codex's body and links (Learn more, plus the access program that applies). OpenClaude Desktop does not
  // read Codex's verified-access programs, so a model outside Daybreak gets the neutral 'Limited' notice.
  if (view.category === "safety_block") {
    if (isBioSafetyBlock(error?.message)) return Object.freeze({ ...view,
      hint: t("We take extra caution with requests involving biological research and applications that could pose safety risks. Eligible researchers can apply for Trusted Access."),
      links: Object.freeze([{ label: t("Trusted Access"), url: TRUSTED_ACCESS_URL }, { label: t("Learn more"), url: SAFETY_LEARN_MORE_URL }]) });
    if (DAYBREAK_UNAVAILABLE_MODELS.includes(model)) return Object.freeze({ ...view,
      hint: t("Daybreak isn’t available for Astra. Some cybersecurity requests may still be limited."),
      links: Object.freeze([{ label: t("Learn more"), url: SAFETY_LEARN_MORE_URL }]) });
    // Notice::for_model keeps the Apply notice only for the model Daybreak covers (gpt-5.6-sol); every other model gets
    // the neutral one.
    if (model === DAYBREAK_MODEL) return Object.freeze({ ...view,
      hint: t("We take extra care with some cybersecurity requests. If you’re doing authorized security work, apply for Daybreak to get broader access."),
      links: Object.freeze([{ label: t("Learn more"), url: SAFETY_LEARN_MORE_URL }, { label: t("Apply for Daybreak"), url: DAYBREAK_URL }]) });
    return Object.freeze({ ...view, links: Object.freeze([{ label: t("Learn more"), url: SAFETY_LEARN_MORE_URL }]) });
  }
  // The session's token budget lives in Codex's config.toml: 'Open config'.
  if (view.category === "session_budget") return Object.freeze({ ...view, editConfig: true });
  // Codex's reviewable precaution (MisalignmentErrorDetails with findings): 'Chat paused', 'Review findings', and
  // 'Acknowledge findings and continue' when Codex gave the message that continues (steer.message).
  if (view.category === "misalignment" && error?.misalignment?.detailedExplanation)
    return Object.freeze({ ...view, headline: t("Chat paused as a precaution"), markerLabel: t("Chat paused as a precaution"),
      hint: t("We couldn’t confirm the agent was interpreting your instructions correctly. Review what we detected before deciding to continue."),
      findings: error.misalignment.detailedExplanation, continueMessage: error.misalignment.steerMessage ?? null });
  // A DeepSeek key, not a ChatGPT sign-in: login is not offered on that core.
  if (view.category === "auth" && DEEPSEEK_AUTH_CODES.includes(error?.additionalDetails))
    return Object.freeze({ ...view, hint: DEEPSEEK_AUTH_HINT, settingsPage: "models" });
  if (view.category === "auth" && signIn) return Object.freeze({ ...view, signIn: true });
  // An empty DeepSeek balance: shared-14 H.hintNamingProvider names the provider, and the card links to the Platform,
  // where credits are added. Another core's balance (BILLING_DETAILS) keeps H.hint: the provider is the core's own.
  if (view.category === "billing" && DEEPSEEK_BILLING_CODES.includes(error?.additionalDetails))
    return Object.freeze({ ...view, hint: t("Add credits or update billing with {provider} to continue.", { provider: "DeepSeek" }), platformUrl: DEEPSEEK_PLATFORM_URL });
  return view;
}

// Rp/zp details body. The source joins sections with blank lines (c1298 se).
// Codex adaptation: every category keeps "View details" (source G/K would drop
// it for rate_limit/overloaded/server_error/auth/context_length) because
// Codex's message is the only carrier of specifics such as a reset time.
// output_token_limit follows the source verdict (c1298 G "drop"): its message is
// the headline and MAX_TOKENS is a bridge marker, so it has no details.
export function turnErrorDetails(error) {
  const category = turnErrorCategory(error);
  if (category === "output_token_limit") return "";
  // The findings have their own 'Review findings' view; the message is Codex's generic stop text.
  if (category === "misalignment") return "";
  return [error?.message, error?.additionalDetails]
    .filter((part) => typeof part === "string" && part.trim()).map((part) => part.trim()).join("\n\n");
}

// c4a9ee384 sn(error, intl, "short") for the apiRetry status row. The table is
// keyed by the API error type; Codex's closest identities are mapped here.
export function retryShortLabel(info) {
  if (info === "unauthorized") return t("Authentication failed");
  if (info === "rateLimitExceeded" || info === "usageLimitExceeded") return t("Rate limited");
  if (info === "serverOverloaded") return t("Model overloaded");
  return t("Request failed");
}

export function normalizeTurnError(error) {
  if (!error || typeof error !== "object") return null;
  const message = typeof error.message === "string" && error.message ? error.message : t("DeepSeek reported an error.");
  return {
    message,
    codexErrorInfo: error.codexErrorInfo ?? null,
    additionalDetails: typeof error.additionalDetails === "string" ? error.additionalDetails : null,
    ...misalignmentOf(error),
  };
}
// TurnError.misalignment (MisalignmentErrorDetails {errorType, detailedExplanation, steer: {message}}), bounded as
// Codex bounds memory-only findings (64 KiB); a steer is never truncated. Present only on a misalignment stop.
function misalignmentOf(error) {
  const details = error?.misalignment;
  const flagged = error?.codexErrorInfo === "misalignmentPolicyViolation";
  if ((!details || typeof details !== "object") && !flagged) return {};
  const explanation = typeof details?.detailedExplanation === "string" && details.detailedExplanation.trim() && details.detailedExplanation.length <= 64 * 1024
    ? details.detailedExplanation.trim() : null;
  const steer = typeof details?.steer?.message === "string" && details.steer.message.trim() ? details.steer.message : null;
  return { misalignment: { errorType: typeof details?.errorType === "string" ? details.errorType : null, detailedExplanation: explanation, steerMessage: explanation ? steer : null } };
}
/** The composer stays closed after a misalignment stop on the thread's latest turn (Codex disables its input until a
 * new chat or an acknowledged continuation): the stopped turn's id, or null. */
export function misalignmentStop(items, turnErrors, { activeTurnId = null } = {}) {
  if (!turnErrors || activeTurnId) return null;
  let latest = null;
  for (const item of items || []) if (item?.turnId) latest = item.turnId;
  return latest && turnErrors[latest]?.misalignment ? latest : null;
}

// scroll-messages-current.js:56485-56503: the newest error of the LAST entry
// renders the full card (ehe/YY), every other error the compact marker (JY).
// Here a turn is an entry: the card belongs to a failed turn only while it is
// the session's latest turn and nothing newer is running.
export function turnErrorPlacements(items, turnErrors, { activeTurnId = null } = {}) {
  const out = new Map();
  if (!turnErrors) return out;
  let latest = null;
  for (const item of items || []) if (item?.turnId) latest = item.turnId;
  if (activeTurnId) latest = activeTurnId;
  for (const turnId of new Set((items || []).map((item) => item?.turnId).filter(Boolean)))
    if (own(turnErrors, turnId) && turnErrors[turnId]) out.set(turnId, turnId === latest ? "card" : "marker");
  return out;
}

// Retry resends the failed turn's own user input through turn/start. Only a
// text-only userMessage can be replayed faithfully (image/localImage/skill/
// mention inputs may reference files that no longer exist), so anything else
// omits the action.
export function retryInput(items, turnId) {
  const user = (items || []).find((item) => item?.turnId === turnId && item.type === "userMessage");
  const content = Array.isArray(user?.content) ? user.content : [];
  if (!content.length || !content.every((part) => part?.type === "text" && typeof part.text === "string")) return null;
  if (!content.some((part) => part.text.trim())) return null;
  return content.map((part) => ({ type: "text", text: part.text, text_elements: Array.isArray(part.text_elements) ? part.text_elements : [] }));
}
