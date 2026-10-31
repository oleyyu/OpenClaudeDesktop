// Full control (the display-scope mode): request_full_control / release_full_control and the display lock
// (official 2.42304.0 §1.4, the lock manager pw in index.chunk-muI2IV6k.js). This build's lock manager, per session:
//
//   preferredMode   "background" (default) or "full_control" (Settings › Computer use). In background, Claude works in
//                   the apps you allow and asks before taking the whole screen; in full_control it takes the screen by
//                   default whenever it uses an app, without asking again (official chicagoPreferredMode).
//   takeoverApproved  a Set of session ids that approved full-screen control. It lasts until the session is forgotten
//                     (forgetSession), NOT until the turn ends — "approved once this session" (official approveTakeover
//                     / forgetSession). preferredMode "full_control" counts as approved without a card.
//   exclusiveHolder   the one session holding the display lock (the screen glow, the docked strip, the global Esc stop).
//                     Only one session at a time; another session's display-scope work is refused while it is held.
//
// How a turn takes over (official §1.4.2): request_full_control records the approval and returns; the lock itself is
// taken on the next display-scope action (acquireLock). A turn ending releases the lock (releaseTurn), but keeps the
// approval. release_full_control releases the lock AND revokes the approval, so the next display-scope action asks
// again. Esc (main.cjs, emergencyStop below) stops the lock holder's turn and every session holding app locks, then
// releases the locks (official GNr / qNr → onCuEmergencyStop); the approval stays, as a turn ending keeps it.
//
// The preferred mode is saved in preferences.json (config.computerUsePreferredMode); main.cjs calls restore() once the
// file has been read (app.whenReady), never at module load, when config is not read yet.
//
// Display-scope tools (2026-10-21): screenshot, zoom, cursor_position, mouse_move, the clicks, left_mouse_down / up,
// left_click_drag, scroll, type, key and hold_key are registered (agent-tools/computer-use.mjs). screenshot, scroll and
// type share their names with preview.mjs's on the one code_desktop server: a session with granted apps is listed this
// group's versions (main.cjs prefersSharedTool), and a call goes to the version its core was listed (agent-tools-host.cjs
// calledEntry). request_full_control only records the approval, as official Ln() does; the lock is taken by the next
// display-scope action (acquireDisplayLock), which is when the glow / strip / notification / Esc come up (§2.5.2).

const MODES = Object.freeze(["background", "full_control"]);
// The refusal while another session holds the display lock (official BEf0UhNC na), in our words.
const CU_LOCK_HELD_MESSAGE = "Another Claude session is using the computer right now. Wait for that session to finish, or find a way that doesn't need computer use.";

/**
 * @param {{onLockChange?: (holder: string | null) => void}} [options]
 *   onLockChange: the display lock's holder changed (null = released) — the glow, the docked strip, the notification.
 *   onApprovalChange: a session's approval (or the preferred mode) changed.
 */
function createFullControl({ onLockChange = () => {}, onApprovalChange = () => {} } = {}) {
  let preferredMode = "background";
  const approved = new Set();     // sessionId
  let exclusiveHolder = null;     // sessionId | null

  const notifyLock = () => { try { onLockChange(exclusiveHolder); } catch {} };
  const notifyApproval = (sessionId) => { try { onApprovalChange(sessionId); } catch {} };

  const api = {
    MODES,
    preferredMode: () => preferredMode,
    setPreferredMode(mode) {
      if (!MODES.includes(mode)) return false;
      const changed = preferredMode !== mode;
      preferredMode = mode;
      if (changed) notifyApproval(null);
      return true;
    },
    /** The saved preference (preferences.json) at startup: a valid mode is applied, anything else leaves background. */
    restore(saved) {
      if (MODES.includes(saved)) preferredMode = saved;
      return preferredMode;
    },
    /** Whether this session may act full-screen without a card now (approved earlier, or the preference is full_control). */
    isApproved: (sessionId) => approved.has(sessionId) || preferredMode === "full_control",
    /** Record the approval (official approveTakeover): lasts until forgetSession. */
    approve(sessionId) {
      if (typeof sessionId !== "string" || !sessionId || approved.has(sessionId)) return;
      approved.add(sessionId);
      notifyApproval(sessionId);
    },
    /** Drop the approval (release_full_control): the next full-screen action asks again. */
    revoke(sessionId) { if (approved.delete(sessionId)) notifyApproval(sessionId); },
    holder: () => exclusiveHolder,
    isHeldBy: (sessionId) => exclusiveHolder === sessionId,
    /**
     * Take the display lock for this session's full-screen work. Approval must already be recorded. Returns
     * "ok" (this session now holds it, or already did) or "cu_lock_held" (another session holds it).
     */
    acquireLock(sessionId) {
      if (!api.isApproved(sessionId)) return "not_approved";
      if (exclusiveHolder && exclusiveHolder !== sessionId) return "cu_lock_held";
      if (exclusiveHolder !== sessionId) { exclusiveHolder = sessionId; notifyLock(); }
      return "ok";
    },
    /** release_full_control / the user's Esc: drop this session's lock (and, when revokeApproval, its approval). */
    releaseLock(sessionId, { revokeApproval = false } = {}) {
      const held = exclusiveHolder === sessionId;
      if (held) { exclusiveHolder = null; notifyLock(); }
      if (revokeApproval && approved.delete(sessionId)) notifyApproval(sessionId);
      return held;
    },
    /** The turn ended (main.cjs): drop the lock, keep the approval (official finishTurnCleanup). */
    releaseTurn(sessionId) { return api.releaseLock(sessionId, { revokeApproval: false }); },
    /** Esc emergency stop: every holder loses the lock. Returns the sessions that held one. */
    releaseAll() {
      if (!exclusiveHolder) return [];
      const held = [exclusiveHolder];
      exclusiveHolder = null;
      notifyLock();
      return held;
    },
    /** The session is gone (forgetSession): lock and approval both go (official forgetSession). */
    forget(sessionId) {
      if (approved.delete(sessionId)) notifyApproval(sessionId);
      if (exclusiveHolder === sessionId) { exclusiveHolder = null; notifyLock(); }
    },
  };
  return api;
}

/**
 * The user's Esc emergency stop (official GNr → qNr): stop the display lock's holder first, then every session holding
 * app locks (each once), and release the display lock. stopSession(id) interrupts that session's turn and drops its
 * app locks (main.cjs: the same path as the strip's Stop). Returns the sessions stopped, holder first.
 * @param {{fullControl: ReturnType<typeof createFullControl>, appHolders?: () => string[], stopSession: (id: string) => void}} options
 */
function emergencyStop({ fullControl, appHolders = () => [], stopSession }) {
  const holder = fullControl.holder();
  const stopped = [];
  const stop = (id) => {
    if (typeof id !== "string" || !id || stopped.includes(id)) return;
    stopped.push(id);
    try { stopSession(id); } catch {}
  };
  stop(holder);
  let others = [];
  try { others = appHolders() ?? []; } catch {}
  for (const id of others) stop(id);
  fullControl.releaseAll();
  return stopped;
}

module.exports = { createFullControl, emergencyStop, MODES, CU_LOCK_HELD_MESSAGE };
