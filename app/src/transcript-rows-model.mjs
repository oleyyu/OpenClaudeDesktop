// The host's feed for the original 2.42304.0 transcript rows (generated/transcript-rows over generated/working-line's
// TurnStatus). The desktop derives these from its SDK message stream (cb6930dae ho, c96d752d0 v2e / e0, pinned in the
// transcript-rows manifest); this host derives them from its engine items. Pure: no React, no timers.
import { sdkToolOf } from "./transcript-sdk-tools.mjs";
import { liveTurnItems } from "./transcript-runtime-stats.mjs";
import { isHiddenTranscriptItem } from "./transcript-item-visibility.mjs";

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
  // cb6930dae mo: over the turn's items in order, a thinking block forgets the tools before it; the last running tool
  // wins over the last tool (`lastTool: c ?? s`), so a thought after a tool leaves the mark its own (think) activity.
  let last = null, runningTool = null;
  if (turnId && responding) for (const item of items || []) {
    if (item?.turnId !== turnId) continue;
    if (item.type === "reasoning") { last = runningTool = null; continue; }
    if (!TOOL_TYPES.has(item.type)) continue;
    last = item;
    if (running.includes(item)) runningTool = item;
  }
  const lastTool = runningTool ?? last ? sdkToolOf(runningTool ?? last) : null;
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

/**
 * c96d752d0 M4e's `liveTail: q && g && a && e.id === i2(t.items, !1)` for a host transcript row: the turn is live (g),
 * the row is the turn's last visible row (a: the assistant rows the builder keeps, hidden thinking left out) and every
 * item after it is thinking (i2 skips trailing thinking, then answers the tools item's id). A tools row that is the live
 * tail keeps the turn's mark between its calls (v2e `tail`: ZM tailHeld, XAe busy with the last call's label) instead of
 * settling to "Ran N commands" while the model thinks. `rows`: the transcript's displayed rows; `view`: the transcript
 * view (whether thoughts are rows); `live`: the turn id that is running, or null. q (turnStatusRows) is the caller's.
 */
export function toolRunLiveTail(rows, index, live, view = "normal") {
  const row = rows?.[index];
  if (!live || !row || row.turnId !== live || !(row.type === "fileToolGroup" || TOOL_TYPES.has(row.type))) return false;
  for (let at = index + 1; at < rows.length; at++) {
    const next = rows[at];
    // The host's roll-up evidence is no row of the desktop's entry.
    if (next?.turnId !== live || next.type === "subAgentActivity") continue;
    if (next.type !== "reasoning" || !isHiddenTranscriptItem(next, view)) return false;
  }
  return true;
}
