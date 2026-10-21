// Which sessions are using the computer (docs/computer-use-glow-design-20261020.md §3, option B): the signal behind the
// docked strip (src/source-computer-use.jsx); the screen glow
// (glow.cjs) shows only while the display lock's holder is among them (main.cjs computerUseSyncGlow). The original follows its full control
// lock's holder; this app has no lock yet, so a session holds the computer from its first computer-use step of a turn
// until that turn completes (however it ends: done, failed or stopped), or until its app_release completes. One turn's
// steps never put the strip or the glow out between them. Asking for access (request_access) and releasing the apps
// (app_release) are not using the computer.
//
// A session id here is the thread that made the step (a sub-agent's own thread when a sub-agent does it).

/**
 * @param {{isComputerUse: (item: object) => boolean, isRelease?: (item: object) => boolean}} options
 *   isComputerUse: the shared recognizer (actions.mjs); isRelease: an app_release step, which hands the computer back.
 */
function createInUse({ isComputerUse, isRelease = () => false }) {
  // Step-driven (turn-scoped) sessions, and sessions holding the full-control display lock (full-control.cjs), which
  // persist across turn boundaries until the lock is released. The signal is their union.
  const stepUsing = new Set(), held = new Set(), listeners = new Set();
  const union = () => [...new Set([...stepUsing, ...held])];
  let last = [];
  const changed = () => {
    const sessions = union();
    if (sessions.length === last.length && sessions.every((id) => last.includes(id))) return;
    last = sessions;
    for (const listener of [...listeners]) { try { listener(sessions); } catch {} }
  };
  function observe(event) {
    if (!event || typeof event !== "object") return;
    if (event.kind === "connection" && !event.connected) {
      if (!stepUsing.size && !held.size) return;
      stepUsing.clear(); held.clear(); changed();
      return;
    }
    const p = event.params || {};
    if (typeof p.threadId !== "string" || !p.threadId) return;
    if (event.method === "turn/completed") { if (stepUsing.delete(p.threadId)) changed(); return; }
    if (event.method === "item/completed" && p.item && isRelease(p.item)) { if (stepUsing.delete(p.threadId)) changed(); return; }
    if ((event.method === "item/started" || event.method === "item/updated") && !stepUsing.has(p.threadId) && p.item && isComputerUse(p.item)) {
      stepUsing.add(p.threadId); changed();
    }
  }
  return {
    observe,
    /** The full-control lock holder changed (full-control.cjs onLockChange): hold the glow / strip until it releases. */
    setHolder(sessionId) {
      held.clear();
      if (typeof sessionId === "string" && sessionId) held.add(sessionId);
      changed();
    },
    /** The sessions using the computer now (steps or the display lock). */
    sessions: () => union(),
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

module.exports = { createInUse };
