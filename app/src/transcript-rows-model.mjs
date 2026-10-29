// The host's feed for the original 2.42304.0 transcript rows (generated/transcript-rows over generated/working-line's
// TurnStatus). The desktop derives these from its SDK message stream (cb6930dae ho, c96d752d0 v2e / e0, pinned in the
// transcript-rows manifest); this host derives them from its engine items. Pure: no React, no timers.
import { sdkToolOf } from "./transcript-sdk-tools.mjs";
import { liveTurnItems } from "./transcript-runtime-stats.mjs";
import { isHiddenTranscriptItem } from "./transcript-item-visibility.mjs";

const TOOL_TYPES = new Set(["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "collabAgentToolCall", "webSearch", "computerUse", "imageGeneration"]);
// The model's own output in a turn: a later one means the model sampled again, after every earlier call returned to it.
const MODEL_OUTPUT_TYPES = new Set(["reasoning", "agentMessage", "plan"]);

/**
 * The SDK tool an engine item stands for ({name, input}), as the desktop's rows read a tool: the mark's activity kind
 * (c77e464d3 X) and the running candidate. One mapping for every core: transcript-sdk-tools.mjs. null for an item that
 * is not a tool.
 */
export { sdkToolOf };

/**
 * cb6930dae ho's transcript live scope for the host: {sessionId, turnLive, liveRunningToolIds} (so), the running
 * turn's start in ms (the desktop's c06cf64bb Cy) and the last tool's activity input ({name, input}: `ne` while the
 * turn responds; its kind is computed by the original c77e464d3 X). `endsInUnansweredUserRow` is mo's flag: the caller
 * (TranscriptRowsScope, as ho) then keeps only the running ids it already held (lo).
 */
export function transcriptLiveScope({ sessionKey = null, turnId = null, items = [], itemPhases = {}, responding = false, turnStats = null, awaiting = false } = {}) {
  const list = items || [];
  const live = turnId && responding ? liveTurnItems(turnId, list, itemPhases || {}) : [];
  // cb6930dae mo (2.42304.0 cb6930dae-BD0W5ZM9.js; 3.6556.2 cb6930dae-Dw_4c1QI.js Vo):
  //   for(let i=e.length-1;i>=0;i--){…if(a.author!=="user"){r=!0;continue}if(!(a.synthetic===!0||…)){if(r){t=i;break}n=!0}}
  // the running tools are collected only from the last real user row that assistant output follows — not from the
  // whole turn. A Codex steer (or an async question's answer) is a userMessage under the same turn id: a command
  // still running before it is not live (its row stays busy in place, without the turn's mark). Every host
  // userMessage is a human row (prompt-history-model.mjs humanPrompts); every other item is assistant output.
  let start = 0, endsInUnansweredUserRow = false, answered = false;
  if (turnId && responding) for (let at = list.length - 1; at >= 0; at--) {
    const item = list[at];
    if (!item) continue;
    if (item.type !== "userMessage") { answered = true; continue; }
    if (answered) { start = at; break; }
    endsInUnansweredUserRow = true;
  }
  // mo: `for(let n=t;n<e.length;n++)…{if(t.kind==="thinking"){s=void 0,c=void 0;continue}if(t.kind==="tools")for(let e
  // of t.tools){if(s=e,e.status!=="running")continue;c=e,i.push(e.id)…}}` — over the window's items in order, a thinking
  // block forgets the tools before it; the last running tool wins over the last tool (`lastTool: n ? void 0 : c ?? s`),
  // so a thought after a tool leaves the mark its own (think) activity.
  //
  // `e.status!=="running"`: on the desktop a tool runs until its tool_result reaches the model. A shell the model moved
  // on from already has its result (run_in_background, or backgrounded while it ran): a completed tool call whose
  // process the task list follows (2.42304.0 c62da1b56, a local_bash task keyed by the result's backgroundTaskId:
  // `Ve(e,t){return R(e)?z(e.backgroundTaskId)!==void 0:…}`), so mo never counts it. A Codex unified-exec command
  // hands its session back the same way (exec_command / write_stdin return after yield_time_ms, the process still
  // running) but its item stays inProgress until the process exits; the host's Background tasks list follows it
  // (background-tasks-model.mjs: a commandExecution with a processId). The host's evidence that a running tool's
  // result reached the model is the model's own output after it in the turn — a thought, an answer or a plan (the
  // model samples again only once every call of its previous response has returned). Such a tool is not running
  // for mo: it is not live and does not win the last tool.
  const running = [];
  let last = null;
  if (turnId && responding) for (let at = start; at < list.length; at++) {
    const item = list[at];
    if (item?.turnId !== turnId) continue;
    if (MODEL_OUTPUT_TYPES.has(item.type)) running.length = 0;
    if (item.type === "reasoning") { last = null; continue; }
    if (!TOOL_TYPES.has(item.type)) continue;
    last = item;
    if (live.includes(item)) running.push(item);
  }
  const tool = endsInUnansweredUserRow ? null : running.at(-1) ?? last;
  const owned = turnStats && turnStats.turnId === turnId ? turnStats : null;
  return {
    sessionId: sessionKey,
    turnLive: !!responding,
    liveRunningToolIds: new Set(running.map(item => item.id)),
    endsInUnansweredUserRow,
    turnStartedAt: responding && Number.isFinite(owned?.startedAt) ? owned.startedAt * 1000 : null,
    awaiting: !!awaiting,
    lastTool: tool ? sdkToolOf(tool) : null,
  };
}

/**
 * cb6930dae lo: `if(e===""||t==="")return"";let n=new Set(t.split(`\n`));return e.split(`\n`).filter(e=>n.has(e)).join(`\n`)`
 * — the running ids (newline-joined, as mo's idsKey) that are also in the ids held for the session. ho reads it while
 * the transcript ends in an unanswered user row.
 */
export function intersectLiveIds(ids, held) {
  if (ids === "" || held === "") return "";
  const keep = new Set(held.split("\n"));
  return ids.split("\n").filter(id => keep.has(id)).join("\n");
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
