// Claude through OpenCode 2.x (its built-in claude-agent provider runs the user's own `claude`, Claude Code): what the app
// knows about that sign-in and when to ask for a new one.
//
//   entry      account/read's providers[] row for claude-agent (opencode-bridge v2/account.js claudeStateV2): needsAuth,
//              signInReason ('missing' | 'tooOld' | 'signedOut' | 'expired' | 'authFailed'), loginExpiresAt (when the
//              stored claude.ai sign-in ends, `claude auth status` 2.1.322+), email, plan
//   failure    a turn error the bridge marked codeDesktop.signInProvider 'claude-agent' (codexErrorInfo 'unauthorized'),
//              or, from an older bridge, Claude Code's own sign-in text on a claude-agent model
//
// The sign-in itself is the core's (account/login/start {codeDesktop: {provider: 'claude-agent'}}): `claude auth login`
// opens claude.ai in the browser and its page may end on a code to paste back. A terminal's `claude` may not be the one
// OpenCode runs (a wrapper with its own CLAUDE_CONFIG_DIR), so the app never sends the user to a terminal for this.
import { getLocale, t } from "../electron/i18n/index.mjs";

export const CLAUDE_PROVIDER = "claude-agent";
/** Claude Code warns this long before a stored claude.ai sign-in ends (its `claude -p` stderr notice). */
export const CLAUDE_EXPIRY_WARN_MS = 10 * 24 * 60 * 60 * 1000;
/** Within this long of the end, a Claude session gets the dialog once per app run. */
export const CLAUDE_EXPIRY_PROMPT_MS = 3 * 24 * 60 * 60 * 1000;
const REASONS = new Set(["missing", "tooOld", "signedOut", "expired", "authFailed"]);
const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);

/** Whether a model id is one of claude-agent's ('claude-agent/claude-haiku-5-5'). */
export const isClaudeAgentModel = (model) => typeof model === "string" && model.startsWith(`${CLAUDE_PROVIDER}/`);

/** The claude-agent row of an account/read snapshot (under the bridge flavor's key, e.g. `opencode`), or null. */
export function claudeAccountEntry(account) {
  if (!isRecord(account)) return null;
  for (const value of Object.values(account)) {
    if (!isRecord(value) || !Array.isArray(value.providers)) continue;
    const entry = value.providers.find((provider) => isRecord(provider) && provider.id === CLAUDE_PROVIDER);
    if (entry) return entry;
  }
  return null;
}

/** loginExpiresAt as epoch ms (an ISO string, or seconds / ms since the epoch), or null. */
export function loginExpiresAtMs(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * Why the claude-agent row needs a sign-in: {reason, message}, or null when it doesn't. A bridge without signInReason
 * (or one that couldn't tell) reads as signed out; an end date already past as expired.
 */
export function claudeSignInNeed(entry, now = Date.now()) {
  if (!isRecord(entry)) return null;
  const ends = loginExpiresAtMs(entry.loginExpiresAt);
  if (entry.needsAuth !== true) return ends !== null && ends <= now ? { reason: "expired", message: "" } : null;
  const reason = REASONS.has(entry.signInReason) ? entry.signInReason : ends !== null && ends <= now ? "expired" : "signedOut";
  return { reason, message: typeof entry.statusMessage === "string" ? entry.statusMessage : "" };
}

/** When the stored sign-in ends: {at, ended, soon (within the 10-day warning)}, or null when Claude Code didn't say. */
export function claudeExpiry(entry, now = Date.now()) {
  const at = loginExpiresAtMs(entry?.loginExpiresAt);
  if (at === null) return null;
  return { at, ended: at <= now, soon: at > now && at - now <= CLAUDE_EXPIRY_WARN_MS, left: Math.max(0, at - now) };
}

// Claude Code 2.1.322's sign-in failures (its result text, OpenCode's "Please run /login" → "Run `claude auth login` in
// a terminal" rewrite included). Not the temporary ones: another process refreshing the login, a network or gateway
// "Authentication error", a full disk.
const CLAUDE_SIGN_IN_TEXT = /this login reached its time limit|\blogin reached its time limit\b|\blogin expired\b|\boauth token (?:revoked|has expired)\b|\bnot logged in\b[^\n]*(?:\/login|claude auth login)|\binvalid api key\b[^\n]*(?:\/login|claude auth login)/i;
/** Whether a turn error's text is Claude Code asking for a new sign-in. */
export const isClaudeSignInText = (message) => typeof message === "string" && CLAUDE_SIGN_IN_TEXT.test(message);

/**
 * Whether a failed turn needs a new Claude sign-in: the bridge says so (codeDesktop.signInProvider), or an
 * auth-classified failure / Claude Code's sign-in text on a claude-agent model.
 */
export function isClaudeAuthFailure(error, { model = "" } = {}) {
  if (!isRecord(error)) return false;
  if (error.codeDesktop?.signInProvider === CLAUDE_PROVIDER) return true;
  if (!isClaudeAgentModel(model)) return false;
  return error.codexErrorInfo === "unauthorized" || isClaudeSignInText(error.message);
}

// In the app's language (a zh-CN window says 2026年11月26日), not the system's.
export const claudeDateText = (ms) => new Date(ms).toLocaleDateString(getLocale(), { month: "short", day: "numeric", year: "numeric" });
const dateText = claudeDateText;
const dateTimeText = (ms) => new Date(ms).toLocaleString(getLocale(), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The dialog's and Settings' sentence for a reason ('soon' for a sign-in about to end). */
export function claudeSignInText(reason, { expiresAt = null } = {}) {
  switch (reason) {
    case "expired": return expiresAt ? t("Your Claude Code sign-in ended on {date} and can’t be renewed. Sign in again to keep using Claude models.", { date: dateText(expiresAt) })
      : t("Your Claude Code sign-in reached its time limit and can’t be renewed. Sign in again to keep using Claude models.");
    case "authFailed": return t("Claude Code couldn’t authenticate with your Claude account. Sign in again to keep using Claude models.");
    case "missing": return t("Claude models run through Claude Code, which isn’t installed on this Mac. Install it, then sign in.");
    case "tooOld": return t("This Claude Code is too old for OpenCode. Run `claude update` in a terminal, then sign in.");
    case "soon": return expiresAt ? t("Your Claude Code sign-in ends {date}. Sign in again now so your chats aren’t interrupted.", { date: dateTimeText(expiresAt) })
      : t("Your Claude Code sign-in ends soon. Sign in again now so your chats aren’t interrupted.");
    default: return t("Claude Code is signed out. Sign in to use Claude models.");
  }
}

/**
 * What a session on this account should prompt now, or null: a claude-agent model, and its sign-in gone (need) or
 * ending within CLAUDE_EXPIRY_PROMPT_MS. {reason, expiresAt, email}.
 */
export function claudeSignInPrompt(account, { model = "", now = Date.now() } = {}) {
  if (!isClaudeAgentModel(model)) return null;
  const entry = claudeAccountEntry(account);
  if (!entry) return null;
  const expiry = claudeExpiry(entry, now);
  const need = claudeSignInNeed(entry, now);
  const email = typeof entry.email === "string" ? entry.email : "";
  // Not installed / too old: Settings › Account says how; a dialog with no sign-in to offer would only nag.
  if (need && (need.reason === "missing" || need.reason === "tooOld")) return null;
  // The end date only once passed (a 'signed out' with a stored end still ahead isn't about that date).
  if (need) return { reason: need.reason, expiresAt: expiry?.ended ? expiry.at : null, email };
  if (expiry && !expiry.ended && expiry.left <= CLAUDE_EXPIRY_PROMPT_MS) return { reason: "soon", expiresAt: expiry.at, email };
  return null;
}

/** A once-per-run key for a prompt (the same ended sign-in isn't asked about twice; a new end date is). */
export const claudePromptKey = (prompt) => prompt ? `${prompt.reason}:${prompt.expiresAt ?? ""}` : "";
