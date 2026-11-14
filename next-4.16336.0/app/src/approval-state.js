// Local bridge approval identity and ordered pending snapshots.
// undefined means unrelated; returning the original state means safely ignored.
export const emptyApprovalTransport = {
  approvalConnectionId: null, approvalConnectionEpoch: 0,
  approvalRevision: -1, approvalClosed: true,
};
const identityKey = (identity) => identity && typeof identity.connectionId === "string" &&
  typeof identity.instanceId === "string" ? `${identity.connectionId}:${identity.instanceId}` : null;
const epochOf = (state) => state.approvalConnectionEpoch || 0;

function connection(state, id, epoch) {
  if (typeof id !== "string" || !Number.isSafeInteger(epoch) || epoch <= 0 || epoch < epochOf(state)) return null;
  if (epoch === epochOf(state)) return state.approvalConnectionId === id ? state : null;
  return {
    ...state, approvals: [], approvalConnectionId: id, approvalConnectionEpoch: epoch,
    approvalRevision: -1, approvalClosed: false,
  };
}

export function reduceApprovalTransport(state, event) {
  if (!event) return undefined;
  if (["approval-connection", "approval-invalidated", "request", "resolved"].includes(event.kind) && event.approvalSnapshot) {
    return reduceApprovalTransport(state, { ...event.approvalSnapshot, kind: "approval-snapshot" });
  }
  if (event.kind === "approval-connection" || event.kind === "approval-invalidated") {
    const next = connection(state, event.connectionId, event.connectionEpoch);
    if (!next || !Number.isSafeInteger(event.revision) || event.revision <= next.approvalRevision) return state;
    return { ...next, approvals: [], approvalRevision: event.revision, approvalClosed: event.kind === "approval-invalidated" };
  }
  if (event.kind === "approval-snapshot") {
    const next = connection(state, event.connectionId, event.connectionEpoch);
    if (!next || !Number.isSafeInteger(event.revision) || event.revision < next.approvalRevision ||
        next.approvalClosed && !event.closed) return state;
    const previous = new Map(next.approvals.map(request => [identityKey(request.bridgeApproval), request]));
    const requests = event.closed ? [] : (event.pending || []).filter(request =>
      identityKey(request.bridgeApproval) && request.bridgeApproval.connectionId === event.connectionId &&
      request.approvalConnectionEpoch === event.connectionEpoch && request.approvalRevision <= event.revision);
    return {
      ...next, approvalRevision: event.revision, approvalClosed: !!event.closed,
      approvals: requests.map(request => previous.get(identityKey(request.bridgeApproval)) || request),
    };
  }
  if (event.kind === "request" || event.kind === "resolved") {
    const key = identityKey(event.bridgeApproval);
    const next = key && connection(state, event.bridgeApproval.connectionId, event.approvalConnectionEpoch);
    if (!next || next.approvalClosed || !Number.isSafeInteger(event.approvalRevision) || event.approvalRevision <= next.approvalRevision) return state;
    const approvals = event.kind === "resolved"
      ? next.approvals.filter(request => identityKey(request.bridgeApproval) !== key)
      : [...next.approvals.filter(request => identityKey(request.bridgeApproval) !== key), event];
    return { ...next, approvalRevision: event.approvalRevision, approvals };
  }
  // A raw server notification cannot bypass the main-process normalization.
  if (event.method === "serverRequest/resolved") return state;
  return undefined;
}
