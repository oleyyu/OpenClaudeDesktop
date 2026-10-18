// The host's feed for the original 2.42304.0 transcript rows (generated/transcript-rows over generated/working-line's
// TurnStatus). The desktop derives these from its SDK message stream (cb6930dae ho, c96d752d0 v2e / e0, pinned in the
// transcript-rows manifest); this host derives them from its engine items. Pure: no React, no timers.
import { sdkToolOf } from "./transcript-sdk-tools.mjs";
import { liveTurnItems } from "./transcript-runtime-stats.mjs";

const TOOL_TYPES = new Set(["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "collabAgentToolCall", "webSearch", "computerUse", "imageGeneration"]);

/**
 * The SDK tool an engine item stands for ({name, input}), as the desktop's rows read a tool: the mark's activity kind
 * (c77e464d3 X) and the running candidate. One mapping for every core: transcript-sdk-tools.mjs. null for an item that
 * is not a tool.
 */
export { sdkToolOf };

/**
 * cb6930dae ho's transcript live scope for the host: {sessionId, turnLive, liveRunningToolIds} (so), the running
 * turn's start in ms (the desktop's c06cf64bb Cy) and the last tool's activity input ({name, input}: `ne` while the
 * turn responds; its kind is computed by the original c77e464d3 X).
 */
export function transcriptLiveScope({ sessionKey = null, turnId = null, items = [], itemPhases = {}, responding = false, turnStats = null, awaiting = false } = {}) {
  const live = turnId && responding ? liveTurnItems(turnId, items || [], itemPhases || {}) : [];
  const running = live.filter(item => TOOL_TYPES.has(item.type));
  const turnTools = turnId && responding ? (items || []).filter(item => item?.turnId === turnId && TOOL_TYPES.has(item.type)) : [];
  const lastTool = turnTools.length ? sdkToolOf(turnTools.at(-1)) : null;
  const owned = turnStats && turnStats.turnId === turnId ? turnStats : null;
  return {
    sessionId: sessionKey,
    turnLive: !!responding,
    liveRunningToolIds: new Set(running.map(item => item.id)),
    turnStartedAt: responding && Number.isFinite(owned?.startedAt) ? owned.startedAt * 1000 : null,
    awaiting: !!awaiting,
    lastTool,
  };
}

/** XAe / ZAe's `candidate` for a running member (v2e `F`): the tool that would hold the turn's mark. */
export function runningCandidate(item, members = [item]) {
  const tool = sdkToolOf(item);
  if (!tool) return undefined;
  const running = member => member?.status === "inProgress" || member?.status === "running";
  return { key: item.id, name: tool.name, input: tool.input, wireRunning: running(item), toolIds: [item.id],
    runningIds: members.filter(running).map(member => member.id) };
}

// The host's row states → TurnStatus.Step states (c734f318c St: done / busy / blocked / failed / stopped / denied).
// "unknown" (a tool whose outcome the engine did not report) has no CDS state: the step is done and says so trailing.
export function stepState(state) {
  return ["busy", "blocked", "failed", "stopped", "denied"].includes(state) ? state : "done";
}
