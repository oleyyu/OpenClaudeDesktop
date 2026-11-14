// B29 errored sessions on Home (cc43287c9 zR with shared-11 SM/Pk): a session whose last turn failed is "Needs input"
// until the user acknowledges it after the failure (ackedAt >= errorAt). The core reports failures as turn/completed
// with a turn.error, or as an `error` notification that will not be retried; a new turn clears the mark. main keeps
// errorAt in the session's sidebar metadata, so every window's Action Center sees it, also after a relaunch.

/** The metadata entry after `event`, or null when the event does not change it. */
function sessionErrorPatch(entry, event, now = Date.now()) {
  const method = event?.method;
  const params = event?.params || {};
  const previous = entry && typeof entry === "object" ? entry : {};
  if (method === "turn/started") {
    if (!Number.isFinite(previous.errorAt)) return null;
    const { errorAt, ...rest } = previous;
    return rest;
  }
  const failed = (method === "turn/completed" && !!params.turn?.error && params.turn?.status !== "interrupted")
    || (method === "error" && params.willRetry !== true && !!params.error);
  if (!failed) return null;
  return { ...previous, errorAt: now };
}

module.exports = { sessionErrorPatch };
