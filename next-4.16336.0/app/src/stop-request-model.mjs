// A visual stopping state belongs to one actual interrupt request, connection,
// thread and turn. An RPC acknowledgement alone is not turn completion.
export function stopRequestMatches(request, live) {
  return !!request && live.connected === true
    && request.connectionId === live.connectionId
    && request.connectionEpoch === live.connectionEpoch
    && live.active?.[request.threadId] === request.turnId;
}

export function createStopRequestTracker(onChange = () => {}) {
  const pending = new Map();
  return {
    begin(identity) {
      if (!identity || typeof identity.threadId !== "string" || !identity.threadId
        || typeof identity.turnId !== "string" || !identity.turnId
        || typeof identity.connectionId !== "string" || !identity.connectionId
        || !Number.isSafeInteger(identity.connectionEpoch) || identity.connectionEpoch <= 0) return null;
      const prior = pending.get(identity.threadId);
      if (prior && prior.turnId === identity.turnId && prior.connectionId === identity.connectionId
        && prior.connectionEpoch === identity.connectionEpoch) return null;
      const request = Object.freeze({ ...identity });
      pending.set(identity.threadId, request); onChange(); return request;
    },
    has(threadId, live) { return stopRequestMatches(pending.get(threadId), live); },
    fail(request) {
      if (!request || pending.get(request.threadId) !== request) return false;
      pending.delete(request.threadId); onChange(); return true;
    },
    reconcile(live) {
      let changed = false;
      for (const [threadId, request] of pending) if (!stopRequestMatches(request, live)) {
        pending.delete(threadId); changed = true;
      }
      if (changed) onChange();
    },
  };
}
