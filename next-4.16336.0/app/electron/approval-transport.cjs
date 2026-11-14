// Main-process approval ledger; bridge identities never enter Codex wire payloads.
const { randomUUID } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");

class ApprovalTransportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApprovalTransportError";
    this.code = code;
  }
}
const fail = (code, message) => { throw new ApprovalTransportError(code, message); };
const validId = (id) => typeof id === "string" || typeof id === "number" && Number.isFinite(id);
const sameIdentity = (a, b) => !!a && !!b &&
  typeof a.connectionId === "string" && typeof a.instanceId === "string" &&
  a.connectionId === b.connectionId && a.instanceId === b.instanceId;

// Copy that names the core (a server protocol violation) goes through the main-process t() with the running core's
// assistant name. codex.cjs is required lazily: it requires this module, so its exports exist only at call time.
// Without a coreName option (codex.cjs can pass () => clientCoreName(client)) the chosen core names it.
function coreFailure(ledger, code, source) {
  const { t } = require("./i18n/index.mjs");
  let core = null;
  try { core = typeof ledger.coreName === "function" ? ledger.coreName() : null; } catch {}
  if (typeof core !== "string" || !core) core = require("./codex.cjs").clientCoreName(null);
  fail(code, t(source, { core }));
}

class ApprovalLedger {
  constructor(emit, { coreName = null } = {}) {
    this.emit = emit;
    this.coreName = coreName;
    this.pending = new Map(); // Typed primitive wire IDs; 7 and '7' are distinct.
    this.history = new Map();
    this.connection = null;
    this.connectionId = null;
    this.connectionEpoch = 0;
    this.revision = 0;
  }

  publish(event) {
    // A renderer may have missed earlier events before subscribing. The latest
    // mutation carries a complete baseline, not merely an incremental revision.
    // Store only base events in pending; adding the snapshot only here prevents
    // a recursive event -> snapshot -> event graph.
    this.emit({ ...event, approvalSnapshot: this.snapshot() });
  }

  activate(connection) {
    if (!connection || !connection.approvalConnectionId)
      fail("invalid_connection", "The approval connection has no identity.");
    if (this.connection === connection) return;
    if (this.connection) this.invalidate(this.connection, "connection_replaced");
    this.connection = connection;
    this.connectionId = connection.approvalConnectionId;
    this.connectionEpoch = connection.approvalConnectionEpoch;
    this.pending.clear();
    this.history.clear();
    this.revision = 0;
    this.publish({ kind: "approval-connection", connectionId: this.connectionId, connectionEpoch: this.connectionEpoch, revision: 0 });
  }

  register(message, connection) {
    if (this.connection !== connection || connection.closed)
      fail("stale_request", "The approval connection changed.");
    if (!validId(message.id)) fail("invalid_request", "The approval ID is invalid.");
    const existing = this.pending.get(message.id);
    if (existing) {
      // thread/resume replays outstanding server requests, including on the
      // same connection. Keep the nonce, draft, revision and sending lock for
      // an identical request; it is not a new approval generation. Compare the
      // complete RPC payload (independent of object-key order), not just IDs.
      if (existing.request.method === message.method &&
          isDeepStrictEqual(existing.request.params, message.params)) return existing;
      coreFailure(this, "approval_protocol_conflict", "{core} reused an outstanding request ID. Reconnect to continue.");
    }
    const threadId = message.params?.threadId ?? null;
    let counts = this.history.get(message.id);
    if (!counts) { counts = new Map(); this.history.set(message.id, counts); }
    const previous = counts.get(threadId) || 0;
    counts.set(threadId, previous + 1);
    const identity = Object.freeze({ connectionId: this.connectionId, instanceId: randomUUID() });
    const event = {
      ...message,
      kind: "request",
      bridgeApproval: identity,
      approvalConnectionEpoch: this.connectionEpoch,
      approvalRevision: ++this.revision,
    };
    delete event.approvalSnapshot;
    const entry = {
      request: message, event, identity, connection, phase: "pending",
      // Raw resolved has no generation. Repeated same-thread wire IDs need an
      // upstream ordering guarantee before it is safe to identify a resolution.
      ambiguousResolution: previous > 0,
    };
    this.pending.set(message.id, entry);
    this.publish(event);
    return entry;
  }

  requirePending(id, expected) {
    if (!expected || typeof expected.connectionId !== "string" || typeof expected.instanceId !== "string")
      fail("identity_required", "The approval identity is required.");
    const entry = this.pending.get(id);
    if (!entry || this.connection !== entry.connection || entry.connection.closed ||
        !sameIdentity(entry.identity, expected))
      fail("stale_request", "This approval is no longer pending. Review the current request.");
    if (entry.phase !== "pending") fail("already_sending", "This approval response is already being sent.");
    return entry;
  }

  begin(entry) {
    this.requirePending(entry.request.id, entry.identity);
    entry.phase = "sending";
  }

  release(entry) {
    if (this.connection === entry.connection && !entry.connection.closed &&
        this.pending.get(entry.request.id) === entry) entry.phase = "pending";
  }

  // result: the answer, for a request of the app's own (entry.onSettle, CodexClient.localApproval), which no core
  // answers: every other way it ends (the turn, the connection, a cancel) settles it with null.
  resolve(entry, reason, result = null) {
    if (this.connection !== entry.connection || this.pending.get(entry.request.id) !== entry) return false;
    this.pending.delete(entry.request.id);
    entry.phase = "resolved";
    try { entry.onSettle?.(reason === "responded" ? result : null); } catch { /* the waiter is gone */ }
    this.publish({
      kind: "resolved", id: entry.request.id,
      bridgeApproval: entry.identity,
      approvalConnectionEpoch: this.connectionEpoch,
      approvalRevision: ++this.revision, reason,
    });
    return true;
  }

  resolveFromServer(params, connection) {
    if (this.connection !== connection || connection.closed) return false;
    const entry = this.pending.get(params?.requestId);
    if (!entry || entry.connection !== connection || entry.request.params?.threadId !== params?.threadId) return false;
    if (entry.ambiguousResolution)
      coreFailure(this, "approval_protocol_conflict", "{core} resolved a reused request ID without its generation. Reconnect to continue.");
    return this.resolve(entry, "server_resolved");
  }

  expireTurn(params, connection) {
    if (this.connection !== connection || connection.closed || !params?.turn?.id) return;
    for (const entry of [...this.pending.values()]) {
      // An app card for a sub-agent's or background agent's call (CodexClient.localApproval outlivesTurn) stays: that
      // work goes on after the turn, and the call's own signal closes the card.
      if (entry.outlivesTurn) continue;
      if (entry.request.params?.threadId === params.threadId &&
          entry.request.params?.turnId === params.turn.id) this.resolve(entry, "turn_completed");
    }
  }

  invalidate(connection, reason = "disconnected") {
    if (!connection || this.connection !== connection) return false;
    for (const entry of this.pending.values()) { try { entry.onSettle?.(null); } catch { /* the waiter is gone */ } }
    this.pending.clear();
    this.history.clear();
    this.connection = null;
    this.publish({ kind: "approval-invalidated", connectionId: this.connectionId, connectionEpoch: this.connectionEpoch, revision: ++this.revision, reason });
    return true;
  }

  snapshot() {
    return {
      connectionId: this.connectionId, revision: this.revision,
      connectionEpoch: this.connectionEpoch,
      closed: !this.connection || this.connection.closed,
      pending: [...this.pending.values()].map(entry => entry.event),
    };
  }
}

module.exports = { ApprovalLedger, ApprovalTransportError, sameIdentity };
