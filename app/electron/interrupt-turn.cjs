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
  // pauseGoal (the session's goal is active and the session is being archived / deleted, main.cjs stopForRemoval): the
  // goal is paused first, as Codex's TUI does on Esc (chatwidget/interaction.rs pause_active_goal_for_interrupt), so the
  // core doesn't start its next goal round on its own when the thread resumes. The renderer's Stop no longer sends it
  // (W14-code r4 shell review fix: 3.6556.2's Stop only interrupts the turn and its Goal card has no Resume).
  if (payload.pauseGoal === true)
    Promise.resolve(owner.request("thread/goal/set", { threadId, status: "paused" }, 30000, connection)).catch(() => {});
  return owner.request("turn/interrupt", { threadId, turnId }, 120000, connection);
}

module.exports = { interruptTurn };
