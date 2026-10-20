// Which sessions are using the computer (docs/computer-use-glow-design-20261020.md §3, option B): the signal behind the
// docked strip (src/source-computer-use.jsx) and the screen glow (glow.cjs). The original follows its full control
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
  const using = new Set(), listeners = new Set();
  const changed = () => {
    const sessions = [...using];
    for (const listener of [...listeners]) { try { listener(sessions); } catch {} }
  };
  function observe(event) {
    if (!event || typeof event !== "object") return;
    if (event.kind === "connection" && !event.connected) {
      if (!using.size) return;
      using.clear(); changed();
      return;
    }
    const p = event.params || {};
    if (typeof p.threadId !== "string" || !p.threadId) return;
    if (event.method === "turn/completed") { if (using.delete(p.threadId)) changed(); return; }
    if (event.method === "item/completed" && p.item && isRelease(p.item)) { if (using.delete(p.threadId)) changed(); return; }
    if ((event.method === "item/started" || event.method === "item/updated") && !using.has(p.threadId) && p.item && isComputerUse(p.item)) {
      using.add(p.threadId); changed();
    }
  }
  return {
    observe,
    /** The sessions using the computer now. */
    sessions: () => [...using],
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

module.exports = { createInUse };
