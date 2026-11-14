// W14-code fr2-12: the main process's sleep interruption record (3.6556.2 asar index.chunk-DNPOm2Zc.js), kept pure so it
// is unit-testable (tests/sleep-interruption.test.mjs). Official, per session `e`:
//   powerMonitor "suspend": `for(let n of this.sessions.values())t.eT(n)||qr(n,e)` (e = Date.now(); eT: an SSH session)
//   qr(e,t): clear pendingSleepPromote / sleepRevalidateTimer; with a pendingCycle (a turn in flight) whose user message
//     is not already the suspended one, `e.suspendedMidTurn={suspendedAt:e.sleepInterruption?.suspendedAt??t,userMessageUuid:n}`
//   powerMonitor "resume": Yr(t, wakeAt, n, onShown, …) per session: without sleepInterruption, a grace timer Br=1e4 holds
//     `{suspendedAt, wakeAt}` in pendingSleepPromote; when it fires, `a` = the same cycle still pending and `c` = an error
//     at or after the wake (`e.errorAt>=t`); `a&&!c&&n()` keeps waiting (the turn is still alive), else the record is
//     dropped and `(a||c)&&(e.sleepInterruption={...s,shownAt:Date.now()},r(e,s,…))` — the band's source.
//   Xr(e,type,isError,now) on each SDK message: "result" with is_error promotes a pending record at once ("promoted"),
//     any other result clears (Zr, "cleared"); "assistant" / "stream_event" / "user" / "tool_progress" more than 2s
//     after the wake clear it too (the turn made progress since it woke up).
//   Zr: drop suspendedMidTurn, every timer and sleepInterruption. The session view carries
//     `sleepInterruption:{suspendedAt, wakeAt}` (cf74bc599 CO = gn("sleepInterruption")).
// Host mapping: a session is a thread; its pendingCycle is the running turn (turn/started … turn/completed), its user
// message uuid that turn's id; "result" is turn/completed (is_error: status "failed"); item notifications are the
// progress messages; n() is `stillRunning(threadId, turnId)`. The sleepAutoResumeOffer / revalidate timers (cloud and
// auto-resume offers) have no local counterpart. onChange(threadId, value|null) reports every change.
const GRACE_MS = 1e4; // Br
const PROGRESS_AFTER_WAKE_MS = 2e3;

function createSleepInterruptions({ now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, onChange = () => {}, stillRunning = () => false } = {}) {
  const sessions = new Map(); // threadId → { turnId, suspendedMidTurn, pendingSleepPromote, sleepInterruption, errorAt }
  const entry = (id) => { let value = sessions.get(id); if (!value) sessions.set(id, value = {}); return value; };
  const view = (value) => (value?.sleepInterruption ? { suspendedAt: value.sleepInterruption.suspendedAt, wakeAt: value.sleepInterruption.wakeAt } : null);
  const unref = (timer) => { timer?.unref?.(); return timer; };
  function clearPending(value) { if (value.pendingSleepPromote) { clearTimer(value.pendingSleepPromote.timer); value.pendingSleepPromote = undefined; } }
  // Zr
  function clear(id) {
    const value = sessions.get(id);
    if (!value) return false;
    value.suspendedMidTurn = undefined;
    clearPending(value);
    if (!value.sleepInterruption) return false;
    value.sleepInterruption = undefined;
    onChange(id, null);
    return true;
  }
  return {
    /** A turn started (the session's new pendingCycle); an earlier turn's error is no longer this cycle's. */
    turnStarted(id, turnId) { const value = entry(id); value.turnId = turnId ?? true; value.errorAt = undefined; },
    /** qr for every session with a turn in flight. */
    suspend(at = now()) {
      for (const value of sessions.values()) {
        clearPending(value);
        if (!value.turnId) continue;
        if (value.suspendedMidTurn?.turnId !== value.turnId) value.suspendedMidTurn = { suspendedAt: value.sleepInterruption?.suspendedAt ?? at, turnId: value.turnId };
      }
    },
    /** Yr for every session suspended mid-turn. */
    resume(wakeAt = now()) {
      for (const [id, value] of sessions) {
        const suspended = value.suspendedMidTurn;
        if (!suspended || value.sleepInterruption) continue;
        clearPending(value);
        const record = { suspendedAt: suspended.suspendedAt, wakeAt };
        const timer = unref(setTimer(() => {
          const same = value.turnId === suspended.turnId, errored = value.errorAt !== undefined && value.errorAt >= wakeAt;
          if (same && !errored && stillRunning(id, suspended.turnId)) { if (value.pendingSleepPromote) value.pendingSleepPromote.timer = undefined; return; }
          value.pendingSleepPromote = undefined; value.suspendedMidTurn = undefined;
          if (same || errored) { value.sleepInterruption = { ...record, shownAt: now() }; onChange(id, view(value)); }
        }, GRACE_MS));
        value.pendingSleepPromote = { ...record, turnId: suspended.turnId, timer };
      }
    },
    /** Xr: kind "result" (isError for a failed turn) or "progress"; returns "none" | "promoted" | "cleared". */
    message(id, kind, { isError = false, at = now() } = {}) {
      const value = sessions.get(id);
      if (kind === "result" && value) { if (isError) value.errorAt = at; value.turnId = undefined; }
      const pending = value?.pendingSleepPromote;
      if (!value || (!pending && !value.sleepInterruption)) return "none";
      if (kind === "result") {
        if (!isError) return clear(id) ? "cleared" : "none";
        if (!pending) return "none";
        clearTimer(pending.timer);
        value.pendingSleepPromote = undefined; value.suspendedMidTurn = undefined;
        value.sleepInterruption = { suspendedAt: pending.suspendedAt, wakeAt: pending.wakeAt, shownAt: at };
        onChange(id, view(value));
        return "promoted";
      }
      if (kind !== "progress") return "none";
      const wakeAt = pending?.wakeAt ?? value.sleepInterruption?.wakeAt;
      if (wakeAt === undefined || at - wakeAt <= PROGRESS_AFTER_WAKE_MS) return "none";
      if (pending) { clearPending(value); value.suspendedMidTurn = undefined; }
      return clear(id) ? "cleared" : "none";
    },
    clear,
    forget(id) { const value = sessions.get(id); if (value) clearPending(value); sessions.delete(id); },
    get: (id) => view(sessions.get(id)),
    dispose() { for (const value of sessions.values()) clearPending(value); sessions.clear(); },
  };
}

module.exports = { createSleepInterruptions, GRACE_MS, PROGRESS_AFTER_WAKE_MS };
