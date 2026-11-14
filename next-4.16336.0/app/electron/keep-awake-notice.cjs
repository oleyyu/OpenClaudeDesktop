'use strict';
// R4i-small SM1 (cov0-05): "Claude kept your computer awake" — the stayed-awake notice of Claude Desktop 2.42304.0.
//
// Main process asar/.vite/build/index.chunk-muI2IV6k.js, the code-session keep-awake controller eyr():
//   Bvr=6e4 (sample interval), Vvr=6e5 (a turn held at least 10 minutes), Hvr=6e5 (the user away at least 10 minutes),
//   Uvr="1781903805" with GU(){return NU()&&gy(Uvr,!0)} (GrowthBook default on: the host has no GrowthBook, so on).
//   g(): while the hold is taken, read the system idle time (ad() = powerMonitor.getSystemIdleTime()*1e3) and raise each
//        counted session's maxAwayMs to min(idle, now - max(countingSince, holdTakenAt)).
//   ce(id,"completed"): n = round(now - max(countingSince, holdTakenAt)); n>=Vvr && maxAwayMs>=Hvr ⇒
//        d={sessionId,heldMs:n,awayMs:round(maxAwayMs)}; "gone" for the same session drops d.
//   ee(reason): release; (reason==="idle"||reason==="armed_grace") && !slept && !wvr() ⇒ log
//        "[keep-awake] stayed-awake notice requested (…)" and e.noteKeptAwake(d.sessionId, d.heldMs).
//   E(): taking the hold resets d and every counted session's maxAwayMs.
// The session side (index.chunk-CFJssAFf.js noteKeptAwake) lives in desktop-settings.cjs (noteKeptAwake there).
//
// Host differences: the system idle time comes from an injected reader (Electron powerMonitor.getSystemIdleTime in
// main.cjs; tests pass their own), without the official synthetic-input correction (tKe.noteRelease, computer use);
// the host releases its blocker as soon as nothing needs it (no 30 s armed_grace), so 'idle' stands for both; a
// suspend while the hold is taken counts as slept (official: the session's own slept mark).
const SAMPLE_INTERVAL_MS = 6e4; // Bvr
const KEPT_AWAKE_MIN_HELD_MS = 6e5; // Vvr
const KEPT_AWAKE_MIN_AWAY_MS = 6e5; // Hvr
const KEEP_AWAKE_NOTICE_GATE = '1781903805'; // Uvr, gy(Uvr,!0): default on.

function createKeepAwakeNotice({
  now = () => performance.now(),
  systemIdleMs = () => undefined,
  onNotice = () => {},
  log = () => {},
  setInterval: startInterval = globalThis.setInterval,
  clearInterval: stopInterval = globalThis.clearInterval,
} = {}) {
  const turns = new Map(); // sessionId → {countingSince, maxAwayMs}
  let holdTakenAt, maxIdle, candidate, slept = false, timer = null;
  // Gvr: a finite, non-negative idle time in milliseconds, else nothing.
  const idle = () => { try { const value = systemIdleMs(); return Number.isFinite(value) && value >= 0 ? value : undefined; } catch { return undefined; } };
  function sample() {
    if (holdTakenAt === undefined) return;
    const away = idle();
    if (away === undefined) return;
    const at = now();
    maxIdle = Math.max(maxIdle ?? 0, Math.min(away, at - holdTakenAt));
    for (const turn of turns.values()) turn.maxAwayMs = Math.max(turn.maxAwayMs, Math.min(away, at - Math.max(turn.countingSince, holdTakenAt)));
  }
  function held() {
    if (holdTakenAt !== undefined) return;
    holdTakenAt = now(); candidate = undefined; maxIdle = undefined;
    for (const turn of turns.values()) turn.maxAwayMs = 0;
    if (!timer && typeof startInterval === 'function') { timer = startInterval(sample, SAMPLE_INTERVAL_MS); timer?.unref?.(); }
  }
  // oe: a session starts counting; a new turn of the session that has a pending notice drops it.
  function turnStarted(sessionId) {
    if (typeof sessionId !== 'string' || turns.has(sessionId)) return;
    if (candidate?.sessionId === sessionId) candidate = undefined;
    turns.set(sessionId, { countingSince: now(), maxAwayMs: 0 });
  }
  // ce(id, reason): 'completed' may record the notice; 'gone' (the session went away) drops its pending one.
  function turnEnded(sessionId, reason = 'completed') {
    const turn = turns.get(sessionId);
    if (turn) { sample(); turns.delete(sessionId); }
    if (reason === 'completed' && turn && holdTakenAt !== undefined) {
      const heldMs = Math.round(now() - Math.max(turn.countingSince, holdTakenAt));
      if (heldMs >= KEPT_AWAKE_MIN_HELD_MS && turn.maxAwayMs >= KEPT_AWAKE_MIN_AWAY_MS) candidate = { sessionId, heldMs, awayMs: Math.round(turn.maxAwayMs) };
    } else if (reason === 'gone' && candidate?.sessionId === sessionId) candidate = undefined;
  }
  function suspended() { if (holdTakenAt !== undefined) slept = true; }
  // ee(reason): reason 'idle' (nothing needs the hold), 'battery', 'setting_off'; otherHold: another hold stays (wvr()).
  function released(reason = 'idle', { otherHold = false } = {}) {
    if (timer) { stopInterval?.(timer); timer = null; }
    if (holdTakenAt === undefined) { if (reason !== 'battery') slept = false; return undefined; }
    sample();
    const heldMs = Math.round(now() - holdTakenAt);
    holdTakenAt = undefined;
    log('[keep-awake] code session hold released (%s, held %dms, longest stretch without input %s)', reason, heldMs, maxIdle === undefined ? 'unknown' : `${Math.round(maxIdle)}ms`);
    const notice = reason === 'idle' && !slept && !otherHold ? candidate : undefined;
    candidate = undefined;
    if (notice) {
      log('[keep-awake] stayed-awake notice requested (turn held %dms, longest stretch with no keyboard or mouse input %dms)', notice.heldMs, notice.awayMs);
      onNotice(notice.sessionId, notice.heldMs);
    }
    if (reason !== 'battery') slept = false;
    return notice;
  }
  function dispose() { if (timer) { stopInterval?.(timer); timer = null; } turns.clear(); holdTakenAt = undefined; candidate = undefined; }
  return { held, released, turnStarted, turnEnded, suspended, sample, dispose, isHeld: () => holdTakenAt !== undefined, pending: () => candidate && { ...candidate } };
}

module.exports = { SAMPLE_INTERVAL_MS, KEPT_AWAKE_MIN_HELD_MS, KEPT_AWAKE_MIN_AWAY_MS, KEEP_AWAKE_NOTICE_GATE, createKeepAwakeNotice };
