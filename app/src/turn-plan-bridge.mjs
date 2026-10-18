// turn-plan: the one LocalSessions method the turn box's original next-actions row calls on the desktop bridge.
// cccc2cf0a rT / iT publish the app actions the row can offer (`ce?.setAvailableNextActions(sessionId, actions)`, ce =
// shared-0 Ix = globalThis["claude.web"]?.LocalSessions, read once when generated/turn-box/shared-0.mjs loads); the main
// process hands them to wrap_up (getAvailableNextActions: an action the row can't draw is refused, the official
// availability rule). Imported first by source-turn-box.jsx, before the generated modules load. Nothing else on the
// bridge is defined: every other `globalThis["claude.web"]?.…` read stays undefined, as before.
const web = (globalThis["claude.web"] ??= {});
const sessions = (web.LocalSessions ??= {});
if (typeof sessions.setAvailableNextActions !== "function") {
  sessions.setAvailableNextActions = (sessionId, actions) => {
    const call = globalThis.window?.desktop?.call;
    if (typeof call !== "function") return Promise.resolve(false);
    return Promise.resolve(call("turn-plan:available-next-actions", { sessionId, actions: actions === undefined ? null : actions }));
  };
}
export const localSessionsBridge = sessions;
