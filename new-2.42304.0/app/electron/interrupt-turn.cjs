// Stop must use the exact live connection shown by the renderer. In particular,
// never start a replacement client while waiting to dispatch an old click.
const { coreError } = require("./codex.cjs");
const { t } = require("./i18n/index.mjs");

function interruptTurn(owner, payload) {
  const { threadId, turnId, expected } = payload || {};
  if (typeof threadId !== "string" || !threadId || typeof turnId !== "string" || !turnId
    || typeof expected?.connectionId !== "string" || !expected.connectionId
    || !Number.isSafeInteger(expected.connectionEpoch) || expected.connectionEpoch <= 0)
    throw new Error(t("The task identity is unavailable. Reconnect before stopping."));
  const connection = owner?.connection;
  const snapshot = owner?.approvalSnapshot();
  if (!connection || connection.closed || snapshot?.closed
    || connection.approvalConnectionId !== expected.connectionId
    || connection.approvalConnectionEpoch !== expected.connectionEpoch
    || snapshot?.connectionId !== expected.connectionId
    || snapshot?.connectionEpoch !== expected.connectionEpoch)
    // Named after the core the client runs (codex.cjs clientCoreName), through the main-process t().
    throw coreError(owner, "The {core} connection changed. The stop request was not sent.");
  // CodexClient.request writes synchronously and binds its promise to this
  // connection. There is no await/client lookup between this check and send.
  // pauseGoal (the session's goal is active, renderer stop()): the goal is paused first, as Codex's TUI does on Esc
  // (chatwidget/interaction.rs pause_active_goal_for_interrupt); otherwise the core starts its next goal round after
  // the user's next message, or on its own when the thread resumes.
  if (payload.pauseGoal === true)
    Promise.resolve(owner.request("thread/goal/set", { threadId, status: "paused" }, 30000, connection)).catch(() => {});
  return owner.request("turn/interrupt", { threadId, turnId }, 120000, connection);
}

// ThreadStatus types (Codex ts/v2/ThreadStatus.ts) under which a thread has no turn running.
const NOT_RUNNING = new Set(["idle", "notLoaded", "systemError"]);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * After a Stop, the core's own turn/completed ends the turn the windows show running. A turn the core isn't running
 * (its turn/completed was dropped, or the window holds a stale turn from history) gets none: Codex answers that
 * interrupt without any event, and the session would read "working" for good, its Stop spinning. So once the stop
 * has settled, and the core has had a moment for its own events (`ended` says whether that turn's turn/completed came
 * since the Stop), the thread's status is read on the same connection; when the core runs no turn there, `report`
 * gets a turn/completed for exactly that turn, interrupted. A turn that started meanwhile is a newer one: the core
 * reports the thread active then, and a window keeps a newer running turn anyway (state.js turn/completed).
 * Resolves true when it reported.
 */
async function settleAfterStop(owner, payload, sent, { report, ended = () => false, delay = 1500, wait = pause } = {}) {
  const connection = owner?.connection;
  const { threadId, turnId } = payload || {};
  if (!connection || typeof threadId !== "string" || !threadId || typeof turnId !== "string" || !turnId || typeof report !== "function") return false;
  const current = () => owner.connection === connection && !connection.closed;
  try { await sent; } catch {}
  await wait(delay);
  if (!current() || ended()) return false;
  let result;
  try { result = await owner.request("thread/read", { threadId, includeTurns: false }, 10000, connection); }
  catch { return false; }
  if (!current() || ended() || !NOT_RUNNING.has(result?.thread?.status?.type)) return false;
  report({ method: "turn/completed", kind: "notification", settledAfterStop: true, params: { threadId,
    turn: { id: turnId, items: [], itemsView: "notLoaded", status: "interrupted", error: null, startedAt: null, completedAt: null, durationMs: null } } });
  return true;
}

module.exports = { interruptTurn, settleAfterStop };
