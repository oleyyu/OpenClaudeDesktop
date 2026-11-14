// R4f-error E36 (transcript-09 WI-6, transcript-auto-resume-after-limit WI-7): what main.jsx's error card Try again and
// its 'Auto-continue when limits reset' timer do, as functions over injected host services (rpc, state and composer
// readers, focus, send), so tests drive them with controlled inputs instead of reading main.jsx's text. main.jsx only
// wires its closures into them.
//
// Error card Try again — 2.42304.0 cc43287c9 b_ (wrapped as x_, `handleErrorRetry` / `retryLastTurn`):
//   a = lz(n, {text: r.getText(), isEmpty: !r.hasDraft()});
//   resend           -> r.submit()                                   (true)
//   nudgeBesideDraft -> y_(G) (sendWithOutcome of the nudge, the composer untouched), r.scheduleFocus()   (true)
//   nudge            -> Ro(), Eo(formatMessage(xN.retryNudge)), r.submit({retryNudge: true})            (true)
//   repeatPrompt     -> with n.lastPrompt: Ro(), Eo(lastPrompt.text), r.submit()                       (true)
//   refillPrompt     -> with n.lastPrompt: Ro(), zo(lastPrompt.text); then, as every other result,
//   (anything else)  -> r.scheduleFocus()                                                               (false)
//   deliver          -> Fs()                                                                            (true)
// lz and its input are the generated original and retry-turn-model.mjs (E4 / E5). On this host only nudge,
// nudgeBesideDraft and focus are reachable (retry-turn-model header): a refused prompt stays in its 'Not delivered'
// bubble (no resend), there is no held input (no deliver) and no CLI conversation loss (no repeatPrompt / refillPrompt).
// Those four still get an explicit host action below rather than falling through silently.
//
// The nudge on this host is one turn/start of the localized retryNudge text, outside the composer: the original's
// `ct = be?.retryNudge === !0 && W.type === "local"` keeps a nudge out of lastSentText (`ct || fe(He, st)`), out of the
// draft stash and the rejected prompt on failure. The host has neither lastSentText nor a Stop refill, so the same
// promise is kept by never touching draft / attachments / mentions, never making a pendingSends bubble, and only showing
// the error when the request fails.
import { errorCardRetryDecision, lastRetryPrompt, retryCannedNudges, retryNudgeInput, retryNudgeText } from "./retry-turn-model.mjs";
import { retryNudgeMessages } from "./generated/retry-decision/retry-nudge-messages.mjs";
import { isEmptyComposerText } from "./prompt-history-model.mjs";
import { t } from "../electron/i18n/index.mjs";

const messageOf = (error) => (typeof error?.message === "string" && error.message ? error.message : String(error));

// c227f4d5e OP's scheduleFocus on the host composer (the SourceComposerEditor element main.jsx keeps in textarea.current
// carries it, composer-focus-api.mjs); focus() for an element without it.
export function scheduleComposerFocus(node) {
  if (typeof node?.scheduleFocus === "function") node.scheduleFocus();
  else node?.focus?.();
}

// The nudge as its own turn: the localized "Try again" (c73f45bc3 vh.retryNudge) under the session's turn options.
// turnRequested marks the turn as asked for, like the host's other fixed turns (Undo, Retry with model), and is
// released if the request fails; the failure is only the composer's error line.
export async function sendRetryNudge({ threadId, rpc, turnOptions, setTurnRequested, setError, translate = t }) {
  setTurnRequested?.(threadId);
  try {
    await rpc("turn/start", { threadId, input: retryNudgeInput(retryNudgeText(translate)), ...(turnOptions?.() ?? {}) });
    return true;
  } catch (error) {
    setTurnRequested?.((value) => (value === threadId ? null : value));
    setError?.(messageOf(error));
    return false;
  }
}

// b_'s dispatch on lz's result. Returns b_'s boolean (true once something was sent), except deliver: the host has no
// held input (heldInput is always []), so there is nothing to deliver and nothing happens.
export async function runErrorRetryOutcome(outcome, { items = [], sendNudge, focusComposer, submitComposer, sendPrompt, refillComposer, translate = t } = {}) {
  if (outcome === "resend") { await submitComposer?.(); return true; }
  if (outcome === "nudgeBesideDraft") {
    // y_ is not awaited before scheduleFocus: the draft keeps the focus while the nudge goes out.
    const sent = sendNudge();
    focusComposer?.();
    await sent;
    return true;
  }
  if (outcome === "nudge") { await sendNudge(); return true; }
  const lastPrompt = outcome === "repeatPrompt" || outcome === "refillPrompt" ? lastRetryPrompt(items, retryCannedNudges(translate)) : undefined;
  if (outcome === "repeatPrompt" && lastPrompt !== undefined) { await sendPrompt?.(lastPrompt.text); return true; }
  if (outcome === "refillPrompt" && lastPrompt !== undefined) refillComposer?.(lastPrompt.text);
  if (outcome === "deliver") return false;
  focusComposer?.();
  return false;
}

// main.jsx retryFailedTurn: the host guards (no session, loading, sending, running, a pending action, offline, archived),
// then the host core's own continue (capabilities.continueTurn: Qwen's codeDesktop/turn/continue picks the stopped turn
// up itself, so nothing is sent when it accepts — a host extension kept before the decision), then lz on the latest
// state and composer and b_'s dispatch. `thread`: the thread-wide card (state.errors[id]), whose errorKilledTurn is
// state.errorKilledTurn[id]; otherwise the turn card of turnId (turnErrors[turnId], a killed turn).
// clearThreadError is b_'s `K&&n_(K)` (c06cf64bb clearError: the bucket's error and errorKilledTurn; state.js
// "clear-error"): like the original it runs after the state the decision reads was taken and before lz, whatever lz
// then picks, so the thread-wide card leaves at once. A turn card (turnErrors) is the original's in-transcript error row,
// which clearError leaves alone; its own actions latch (SourceTurnError, latchOnAction).
// Returns {outcome, handled}: outcome is lz's result ("continued" when the core continued, null when nothing ran).
export async function retryFailedTurnFlow({ threadId, turnId = null, thread = false, blocked = false, ensureResumed, continueTurn = false, rpc,
  turnOptions, readState, readComposer, setError, clearThreadError, setTurnRequested, focusComposer, submitComposer, sendPrompt, refillComposer, translate = t, now } = {}) {
  if (!threadId || blocked) return { outcome: null, handled: false };
  setError?.("");
  try {
    await ensureResumed?.(threadId);
    if (continueTurn) {
      const resumed = await rpc("codeDesktop/turn/continue", { threadId }).catch(() => null);
      if (resumed?.accepted === true) { clearThreadError?.(threadId); return { outcome: "continued", handled: true }; }
    }
    const state = readState?.() ?? {};
    clearThreadError?.(threadId);
    const composer = readComposer?.() ?? {};
    const items = state.items?.[threadId] ?? [];
    const outcome = errorCardRetryDecision({
      items, turnErrors: state.turnErrors?.[threadId] ?? {},
      turnId: thread ? null : turnId,
      threadError: thread ? state.errors?.[threadId] ?? null : null,
      killedTurn: state.errorKilledTurn?.[threadId] === true,
      active: state.active?.[threadId] ?? null,
      draft: composer.text, attachments: composer.attachments, translate, now,
    });
    const sendNudge = () => sendRetryNudge({ threadId, rpc, turnOptions, setTurnRequested, setError, translate });
    const handled = await runErrorRetryOutcome(outcome, { items, sendNudge, focusComposer, submitComposer, sendPrompt, refillComposer, translate });
    return { outcome, handled };
  } catch (error) {
    setError?.(messageOf(error));
    return { outcome: null, handled: false };
  }
}

// ---------------------------------------------------------------- auto-resume after a usage limit (WI-7)
//
// 2.42304.0 cc43287c9 N_, the onFire of c227f4d5e oW (`Gv({sessionId: K, onFire: N_, transcriptReady: !Me})`):
//   i = n.error !== null && n.errorKilledTurn || _y(messages)        (the session's last turn failed)
//   a = Ty({restoredFromError: !1, isEmpty, isBashMode, hasDraft, hasComposerAttachments})
//   if (!composer || xA(K) || !i || !a) return !1                     (oW then disarms: 'skipped')
//   … K && n_(K) (clearError), M_({text: "Limits reset — resuming session", seq + 1}) (the sr-only status),
//   setTimeout(() => { composer.isEmpty() && ir() && (Ro(), Eo(formatMessage(xN.afterUsageLimit)), composer.submit());
//                      activeElement === body && ir() && composer.scheduleFocus() }, 0)
//   return {kind: "nudge"}
// The host keeps its own arming and clock (main.jsx autoResume: reset time + 5 s, once; another send, a session switch,
// a running turn or a reconnect drops it); only what fires changes: the official message instead of the failed turn's
// input sent again. Not on this host: the suspended / parked refusals (kp), the remote canAutoResume probe and the
// attempt / telemetry bookkeeping of oW.

// cc43287c9's inline "Limits reset — resuming session" (PZ1vuMcNj4).
export const LIMITS_RESET_MESSAGE = Object.freeze({ defaultMessage: "Limits reset — resuming session", id: "PZ1vuMcNj4" });

// c227f4d5e iW (exported Lr, `Ty` in cc43287c9), the original's expression: may the auto-resume use this composer?
export function autoResumeComposerAllows(e) {
  return !(e.hasComposerAttachments || e.isBashMode || e.hasDraft && e.isEmpty) && (e.restoredFromError || e.isEmpty);
}

// iW's input from the host composer: isEmpty is the editor's (tiptap isEmpty: only empty paragraphs, as
// isEmptyComposerText), hasDraft adds staged attachments (c227f4d5e hasDraft), bash mode is the composer's '!' shell mode.
export function autoResumeComposerState({ text, attachments } = {}, { bashMode = false } = {}) {
  const isEmpty = isEmptyComposerText(typeof text === "string" ? text : "");
  const hasComposerAttachments = Array.isArray(attachments) && attachments.length > 0;
  return { restoredFromError: false, isEmpty, isBashMode: bashMode === true, hasDraft: !isEmpty || hasComposerAttachments, hasComposerAttachments };
}

const latestTurnId = (items) => {
  for (let index = (items || []).length - 1; index >= 0; index--) if (items[index]?.turnId) return items[index].turnId;
  return null;
};

// N_'s refusals before it announces, on the host's state. `failed` is i: the armed card's turn still carries its
// TurnError and is the thread's latest turn (a turn card's error is a killed turn: n.error !== null && errorKilledTurn;
// a later turn would have cleared the bucket's error). busy is xA (c06cf64bb Vv: pendingTurn !== null || heldInput,
// here a running turn).
export function autoResumeAfterLimitCheck({ threadId, turnId, current, state, composer, bashMode = false } = {}) {
  if (!threadId || current !== threadId) return { fire: false, reason: "session" };
  if (state?.active?.[threadId]) return { fire: false, reason: "busy" };
  const turnErrors = state?.turnErrors?.[threadId] ?? {};
  const failed = !!turnId && !!turnErrors[turnId] && latestTurnId(state?.items?.[threadId]) === turnId;
  if (!failed) return { fire: false, reason: "not-failed" };
  if (!autoResumeComposerAllows(autoResumeComposerState(composer, { bashMode }))) return { fire: false, reason: "composer" };
  return { fire: true, reason: null };
}

// c73f45bc3 vh.afterUsageLimit, localized like the nudge (the model reads the user's language).
export function afterUsageLimitText(translate = t) {
  return translate(retryNudgeMessages.afterUsageLimit.defaultMessage);
}

// M_'s update: the next announcement of the per-session status ({text, seq}); seq makes a repeat announce again.
export function nextResumeAnnouncement(previous, text, threadId) {
  return { text, seq: (previous?.seq ?? 0) + 1, threadId };
}

// N_ on the host. readCurrent / readState / readComposer read the latest values when the timer fires (main.jsx refs);
// clearError(threadId) is N_'s `K&&n_(K)` (the composer's error line and state.js "clear-error");
// sendPrompt is the composer's ordinary send of a text (the original submits it from the composer, so unlike the nudge
// it is a normal user message); defer is N_'s setTimeout(…, 0).
export function runAutoResumeAfterLimit({ pending, readCurrent, readState, readComposer, bashMode, clearError, announce, sendPrompt, focusComposer,
  activeIsBody, defer = (callback) => setTimeout(callback, 0), translate = t } = {}) {
  const composer = readComposer?.() ?? {};
  const check = autoResumeAfterLimitCheck({ threadId: pending?.threadId, turnId: pending?.turnId, current: readCurrent?.(), state: readState?.(),
    composer, bashMode: bashMode?.(composer) === true });
  if (!check.fire) return check;
  clearError?.(pending.threadId);
  announce?.(translate(LIMITS_RESET_MESSAGE.defaultMessage));
  defer(() => {
    const here = readCurrent?.() === pending.threadId;
    const live = readComposer?.() ?? {};
    if (here && isEmptyComposerText(typeof live.text === "string" ? live.text : "")) void sendPrompt?.(afterUsageLimitText(translate));
    if (here && activeIsBody?.()) focusComposer?.();
  });
  return { fire: true, reason: null, kind: "nudge" };
}
