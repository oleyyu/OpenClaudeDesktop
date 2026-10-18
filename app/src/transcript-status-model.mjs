import { t, tn } from "../electron/i18n/index.mjs";
import { retryShortLabel } from "./turn-error-model.mjs";
// `kind` tells apart the running presentations that share a phase (working, sending, spawn, retry); the working line
// (working-line-model.mjs) maps each to its own input of the official w8.
const presentation = (phase, label = "", visible = true, retry = null, kind = phase) => Object.freeze({
  phase,
  kind,
  label,
  visible,
  busy: phase === "running" || phase === "stopping",
  announce: visible && label !== "",
  retry,
});
// Classic Y5 apiRetry (scroll-messages-current.js:58388/58545): the row reads
// "{short error} · Retrying ({attempt}/{maxRetries})" instead of the activity
// and token stats. Codex ErrorNotification carries no attempt counts, so the
// local label is "Retrying…"; the DeepSeek bridge adds `retry {attempt,
// maxRetries}` (maxRetries null for an unbounded policy).
export const RETRYING_LABEL = t("Retrying…");
const count = (value) => Number.isInteger(value) && value > 0;
export function retryingLabel(attempt, maxRetries) {
  return count(attempt) && count(maxRetries) ? t("Retrying ({attempt}/{maxRetries})", { attempt, maxRetries }) : RETRYING_LABEL;
}
// c4a9ee384 Lp's API error types (the working line's apiRetry label, zp(type, intl, "short")) for the Codex error
// identities retryShortLabel names; anything else is no type ("Request failed", zp's Rp).
export function apiErrorType(info) {
  if (info === "unauthorized") return "authentication_failed";
  if (info === "rateLimitExceeded" || info === "usageLimitExceeded") return "rate_limit";
  if (info === "serverOverloaded") return "overloaded";
  return null;
}
// state.retrying[thread] ({codexErrorInfo, attempt, maxRetries}) -> the
// `retrying` input of transcriptStatusPresentation.
export function retryingStatus(entry, { now = Date.now(), locale } = {}) {
  if (!entry) return null;
  // A long wait (a usage limit's retry-after) names the cause and the time of the next try; a short backoff doesn't.
  const later = Number.isFinite(entry.nextAt) && entry.nextAt - now > 60_000
    ? t("Next try at {time}", { time: new Date(entry.nextAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }) }) : null;
  const detail = entry.action?.title || entry.action?.message ? [entry.action.title, entry.action.message].filter(Boolean).join(" — ")
    : later && entry.message ? entry.message : null;
  return { error: retryShortLabel(entry.codexErrorInfo ?? null), errorType: apiErrorType(entry.codexErrorInfo ?? null), attempt: entry.attempt ?? null, maxRetries: entry.maxRetries ?? null,
    detail, later, link: typeof entry.action?.link === "string" && /^https?:\/\//i.test(entry.action.link) ? { url: entry.action.link, label: entry.action.label || t("Open") } : null };
}

const HOME = presentation("home", "", false);
// _3 (cc43287c9 :36403-36425): the spawn step labels (worktree_ff is declared but no step announces it).
const SPAWN_PHASE_LABELS = Object.freeze({
  plugins: "Setting up plugins…",
  worktree_hook: "Running your WorktreeCreate hook…",
  worktree_fetch: "Refreshing origin…",
  worktree_ff: "Fast-forwarding branch…",
  worktree_add: "Adding worktree…",
  worktree_checkout: "Checking out worktree files… (large repositories may take a while)",
  worktree: "Creating worktree…",
  worktree_deferred: "Starting session…",
});
/** Kv/_3: a spawn step's label; an unknown step reads 'Starting session…'. */
export function spawnPhaseLabel(phase) {
  return t(Object.hasOwn(SPAWN_PHASE_LABELS, phase) ? SPAWN_PHASE_LABELS[phase] : "Starting session…");
}
const LOADING = presentation("loading", "", false);
const IDLE = presentation("idle");
const RUNNING = presentation("running", t("Working…"), true, null, "working");
const STOPPING = presentation("stopping", t("Stopping…"));
// z5 (approval-current.js:58061-58093) 'Sending…': the message is on its way and the turn has not started yet.
const SENDING = presentation("running", t("Sending…"), true, null, "sending");
const APPROVAL = presentation("approval", t("Waiting for your approval"));
const APPROVAL_REPLACES_ROW = presentation("approval", "", false);

// No timers, inferred completion, request dispatch, or per-turn history. The
// owner passes the current thread's real state on every render. Error alerts
// remain with the owner: a recoverable error must not end a still-active turn.
export function transcriptStatusPresentation({
  sessionKey = null,
  ready = false,
  connected = false,
  running = false,
  stopping = false,
  waiting = false,
  approvalVisible = false,
  retrying = null,
  sending = false,
  spawnLabel = null,
} = {}) {
  // B29 (cc43287c9 dy → e5 spawnLabel): while a new session's worktree is prepared from Home, the row names the step.
  if (!sessionKey) return typeof spawnLabel === "string" && spawnLabel ? presentation("running", spawnLabel, true, null, "spawn") : HOME;
  if (!ready) return LOADING;
  // Suppress stale work/approval flags after a lost connection. The actual
  // connection/error UI remains visible elsewhere; the idle mark says nothing.
  if (!connected) return IDLE;
  // Current classic host: hideLoader = inlineApprovals && inlineCardLive.
  if (approvalVisible) return APPROVAL_REPLACES_ROW;
  if (waiting) return APPROVAL;
  if (!running) return sending ? SENDING : IDLE;
  if (stopping) return STOPPING;
  // `retrying`: the short error label, or {error, attempt, maxRetries}.
  const retry = typeof retrying === "string" ? { error: retrying } : retrying;
  if (typeof retry?.error === "string" && retry.error) {
    const label = retryingLabel(retry.attempt, retry.maxRetries);
    return presentation("running", [`${retry.error} · ${label}`, retry.later, retry.detail].filter(Boolean).join(" · "), true,
      Object.freeze({ error: retry.error, label, later: retry.later ?? null, detail: retry.detail ?? null, link: retry.link ?? null }), "retry");
  }
  return RUNNING;
}

export function transcriptSparkSize(textSize = "m") {
  if (textSize === "s") return 16;
  if (textSize === "l") return 20;
  return 18;
}

// Classic Y5 passes state "thinking" to the Spark while working or stopping;
// idle/approval rows keep the static mark (state undefined).
export function sparkState(view) {
  return view?.busy ? "thinking" : undefined;
}

// Classic Y5 running-tasks button (scroll-messages-current.js:58273-58327 K):
// '{count, plural, one {# running task} other {# running tasks}}' while any
// task runs, else the Whe-held finished count; null hides the button (P).
export function taskButtonLabel(running = 0, finished = 0) {
  if (running > 0) return tn(running, "{count} running task", "{count} running tasks");
  if (finished > 0) return tn(finished, "{count} task finished", "{count} tasks finished");
  return null;
}

// Whe :58132-58145 (Uhe = 1500): remember the last non-zero running count and
// report it as the finished count for 1500ms after running drops to 0. Kept as
// a timer-owning store so node:test fake timers can drive it; `owner` resets
// the hold when the row starts describing a different session (the source
// remounts its transcript per session).
export const FINISHED_TASK_HOLD_MS = 1500;
export function createFinishedTaskHold(onChange) {
  let held = 0, owner, timer = null;
  const cancel = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  return {
    update(running, nextOwner = owner) {
      if (nextOwner !== owner) { owner = nextOwner; cancel(); held = 0; }
      if (running > 0) { cancel(); held = running; return; }
      if (held === 0 || timer !== null) return;
      timer = setTimeout(() => { timer = null; held = 0; onChange?.(); }, FINISHED_TASK_HOLD_MS);
    },
    finished(running, currentOwner = owner) { return running > 0 || currentOwner !== owner ? 0 : held; },
    dispose: cancel,
  };
}
