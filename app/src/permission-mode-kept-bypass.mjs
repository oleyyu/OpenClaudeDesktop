// R4i-small SM2 (composer-05): the kept Bypass pick of 2.42304.0, host adapter.
//
// Official (ion-dist cef1e6037-8DivyY4m.js): `var q=Ee()(()=>({picks:{}})),$t="__gb__3409701119",en=12e4,tn=1e4`.
// When the Mode menu picks Bypass on a running local session whose CLI was not launched with
// --dangerously-skip-permissions, `_n(error, sessionId)` (error message match, `isRunning===!0`, not the nest variant
// `!f()`, kill switch `!s($t)`) lets c227f4d5e gn keep the pick (`mn`: {modeAtPick, turnEnded, sent, tell}) instead
// of failing: the Mode button shows Bypass (`J=…q??(vt?"bypassPermissions":void 0)??_t…`), the Bypass row reads
// `bypassKeptRow` "Turns on when Claude finishes working." (cc0051c10 RvbwIvF4xv) and an info toast reads
// `bypassKeptToast` (00YMYeBYsv). When the turn ends (`result` message, `yn` with turnEnded and not running) the store
// sends setPermissionMode again (`vn`, confirm timeout en=120 s, session read tn=10 s); a session whose mode moved away
// from modeAtPick, that was archived, stopped, paused or cleared drops the pick (`Y`).
//
// Host: no core throws that CLI error. What decides the timing is capabilities.livePermissions (main.jsx): the DeepSeek
// Harness, the ACP bridges (Kimi, Qwen, Gemini, MiniMax), ZCode, OpenCode and MiMo take a Mode change for the running
// thread at once (codeDesktop/thread/permissions → applyPermissions), so a Bypass pick there is simply on. Codex has no
// such request: a mode picked during a turn goes out with the next turn/start. Only there is the pick "kept": the
// selection itself is the remembered mode (permission-mode-resolution layers), nothing is re-sent, and the pick settles
// once the session's turn is over (its next turn/start carries Bypass) or its mode is no longer Bypass. The resend
// outcomes (unconfirmed, granted_late, resend_failed, claude_code_stopped, mid_turn) and bypassBusy never happen on the
// host and are not ported.

/** cef1e6037 `$t`: the GrowthBook kill switch. The host has no GrowthBook, so `s($t)` is false and the feature is on. */
export const KEPT_BYPASS_KILL_SWITCH = '__gb__3409701119';
/** cef1e6037 `en` / `tn`: the resend's confirm and session-read timeouts (official only: the host never resends). */
export const KEPT_BYPASS_CONFIRM_MS = 12e4, KEPT_BYPASS_SESSION_READ_MS = 1e4;
/** cc0051c10 w_.bypassKeptRow (RvbwIvF4xv) and w_.bypassKeptToast (00YMYeBYsv). */
export const BYPASS_KEPT_ROW = 'Turns on when Claude finishes working.';
export const BYPASS_KEPT_TOAST = 'Bypass permissions turns on when Claude finishes working.';

export function keptBypassEnabled(flags = {}) { return flags?.[KEPT_BYPASS_KILL_SWITCH] !== true; }

/**
 * The host counterpart of `_n`: a confirmed Bypass pick is kept (applies when the turn ends) only on an open session
 * whose turn is running, on a connected core without live permissions, while the kill switch is off.
 */
export function keepsBypassPick({ value, previous, sessionId, running, livePermissions, connected = true, flags } = {}) {
  return value === 'bypass' && previous !== 'bypass' && typeof sessionId === 'string' && sessionId !== ''
    && running === true && livePermissions !== true && connected === true && keptBypassEnabled(flags);
}

/** cef1e6037 `un`: keep the pick for one session ({modeAtPick}); the store's picks map stays immutable. */
export function keepBypassPick(picks, sessionId, modeAtPick) {
  return { ...picks, [sessionId]: { modeAtPick: modeAtPick ?? null } };
}
/** cef1e6037 `Y`: drop one session's pick (same object when there is none). */
export function dropBypassPick(picks, sessionId) {
  if (!picks || !Object.hasOwn(picks, sessionId)) return picks;
  const { [sessionId]: _dropped, ...rest } = picks;
  return rest;
}
/** cef1e6037 `gn`: whether this session has a kept pick. */
export function hasBypassPick(picks, sessionId) { return !!sessionId && !!picks && Object.hasOwn(picks, sessionId); }

/**
 * cef1e6037 `bn`/`yn`, host form: every kept pick whose session is no longer running (the next turn/start carries
 * Bypass), or whose mode is no longer Bypass (another pick, the opt-in turned off), settles. `modeFor(id)` is the
 * session's effective mode; `active` is the running-turn map (state.active).
 */
export function settleBypassPicks(picks, { active = {}, modeFor = () => 'bypass' } = {}) {
  let next = picks;
  for (const id of Object.keys(picks || {})) if (!active?.[id] || modeFor(id) !== 'bypass') next = dropBypassPick(next, id);
  return next;
}
