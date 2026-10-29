// The host's feed for the original 3.6556.2 loading line U6 (generated/working-line/working-line.mjs). The desktop feeds
// U6 from its session stores and the turn mark broker in c96d752d0 W6 (pinned in the working-line manifest); this host
// feeds it from the presentation of transcript-status-model.mjs and the turn's own clock, tokens and items. Pure: no
// React, no timers.
//
// What the props mean to U6 (official names):
//   isActuallyWorking   the turn is running and not stopping or waiting on the user (W6 `U`)
//   markHeld / quiet    a running tool row holds the turn's mark (W6 `d = ny()`, the broker's held flag): U6 leaves the
//                       mark to that row and, while it just works, goes quiet — invisible in the tail cell's
//                       `grid-area:1/1` under the outlet, so the handoff moves neither the mark nor the rows below
//   isStopping          a stop was asked while it ran (`w = t && C`) → "Stopping…"
//   waitingOnUser       running but waiting on an approval / question (W6 `K`) → the blocked "Needs your input" row
//   spawnLabel / spawnDetail / spawnAction   a named step instead of the stats (Home's worktree steps, B29)
//   apiRetry            {error, attempt, maxRetries, noResponse?} → "{short error} · Retrying ({attempt}/{maxRetries})";
//                       with noResponse {waitedMs, retryWaitMs} (the SDK's api_retry `no_response`, c06cf64bb CK)
//                       "No response from the API · Retrying (…)", or "· Trying once more, for up to {minutes} min" when
//                       maxRetries is 1 (c4a9ee384 ym / xm). apiRetrySshHost (W6: an SSH session's host) is never set:
//                       the host has no SSH sessions (D37).
//   toolLabel, toolLabelUnspoken, toolLabelSince, toolLabelEndedAt
//                       the running tool's words (W6: the mark broker's said words, wordsUnspoken, the said call's start
//                       `Jet` and callWordsEndedAt); U6 shows the label instead of the stats while it runs and keeps the
//                       clock hidden until `toolLabelEndedAt + 2000`. The words are said by the 3.6556.2 tool rows
//                       (cb6930dae ao). This host's tool rows are those 3.6556.2 rows too (src/generated/transcript-rows,
//                       under its TurnMarkBroker), but the host reads only whether a row holds the mark (morph.mjs
//                       useTurnMarkHeld), not the words said into the broker (W6 is pinned, not emitted), so the
//                       official default (undefined, no label) holds unless a caller passes them.
//   isCompacting        "Compacting session…"
//   elapsedSeconds      the turn's seconds; with sessionId and turnStartTime null the clock shows it from 2 s (Vet)
//   tokens              the turn's output tokens; shown with the clock when > 0 (x8 → b8 → y8 "1 token" / "{tokens} tokens")
//   thinking            {kind:"active", open} | {kind:"done", seconds} | null (ITe)
//   waiting             the h8 key (sending / model / tools / null) that names the wait for the spinner mode (JM)
import { liveTurnItems } from "./transcript-runtime-stats.mjs";

const count = value => Number.isSafeInteger(value) && value > 0;
const seconds = value => (Number.isFinite(value) && value >= 0 ? value : 0);

/** The h8 wait the turn is in: tools while a tool runs, null while the answer streams, otherwise the model. */
export function turnWaiting(turnId, items = [], phases = {}, activity = null) {
  if (activity?.kind === "tools") return "tools";
  const live = turnId ? liveTurnItems(turnId, items, phases) : [];
  return live.at(-1)?.type === "agentMessage" ? null : "model";
}

/** ITe's thinking shape over the host's Du state; `open` while the thought still streams (not in the minimum hold). */
export function workingLineThinking(thinking, streaming) {
  if (thinking?.kind === "active") return { kind: "active", open: !!streaming };
  if (thinking?.kind === "done") return { kind: "done", seconds: thinking.seconds };
  return null;
}

// Host retry → U6. With both counts, the official apiRetry branch: {error: the c4a9ee384 API error type, attempt,
// maxRetries}, which U6 reads as "{ym(error, "short")} · Retrying ({attempt}/{maxRetries})"; like the desktop it does not
// show the host's extra "next try" time, cause or remedy link. A Codex retry carries no counts (ErrorNotification has
// none), and U6 would print "Retrying (undefined/undefined)": that case takes U6's named-step slot with the host's own
// "{short error} · Retrying…" label (same clock, no tokens, as the retry branch). See the working-line report.
// c06cf64bb CK: `no_response` counts only with both durations positive and under 6 h (216e5 ms).
const retryWait = value => (typeof value === "number" && value > 0 && value < 216e5 ? value : undefined);
function noResponse(value) {
  const waitedMs = retryWait(value?.waitedMs), retryWaitMs = retryWait(value?.retryWaitMs);
  return waitedMs === undefined || retryWaitMs === undefined ? {} : { noResponse: { waitedMs, retryWaitMs } };
}
function retryProps(retry, retrying) {
  const attempt = retrying?.attempt, maxRetries = retrying?.maxRetries;
  if (count(attempt) && count(maxRetries)) return { apiRetry: { error: retrying.errorType ?? null, attempt, maxRetries, ...noResponse(retrying.noResponse) } };
  return { spawnLabel: `${retry.error} · ${retry.label}` };
}

/**
 * U6's props for a transcript-status presentation, or null when the presentation shows no row (home, loading, the
 * approval card replacing the row).
 */
export function workingLineProps(view, {
  retrying = null, elapsed = null, outputTokens = null, activity = null, thinking = null, waiting = null,
  runningTaskCount = 0, finishedTaskCount = 0, onToggleTasksPane = null, tasksPaneOpen = false, markHeld = false,
  toolLabel, toolLabelUnspoken, toolLabelSince, toolLabelEndedAt,
} = {}) {
  if (!view?.visible) return null;
  const line = runningProps(view, { retrying, elapsed, outputTokens, activity, thinking, waiting,
    runningTaskCount, finishedTaskCount, onToggleTasksPane, tasksPaneOpen });
  // c96d752d0 W6: `quiet: d && U && !z && !k && C !== "compacting" && D === null && a === void 0, markHeld: d`
  // (k, the drained queue, has no host state).
  const held = !!markHeld;
  return { ...line, ...toolLabelProps({ toolLabel, toolLabelUnspoken, toolLabelSince, toolLabelEndedAt }), markHeld: held,
    quiet: held && line.isActuallyWorking && !line.isStopping && !line.isDraining && !line.isCompacting && line.apiRetry === null && line.spawnLabel === undefined };
}

// W6's tool label fields: a string label, a boolean, and two epoch-ms times; anything else is the official undefined.
function toolLabelProps({ toolLabel, toolLabelUnspoken, toolLabelSince, toolLabelEndedAt }) {
  const time = value => (Number.isFinite(value) ? value : undefined);
  return {
    toolLabel: typeof toolLabel === "string" && toolLabel ? toolLabel : undefined,
    toolLabelUnspoken: toolLabelUnspoken === true ? true : undefined,
    toolLabelSince: time(toolLabelSince),
    toolLabelEndedAt: time(toolLabelEndedAt),
  };
}

function runningProps(view, { retrying, elapsed, outputTokens, activity, thinking, waiting,
  runningTaskCount, finishedTaskCount, onToggleTasksPane, tasksPaneOpen }) {
  const props = {
    quiet: false, markHeld: false, sessionId: null, turnStartTime: null, labelAnnouncedByHost: false, markStandalone: false,
    onThinkingStatusPainted: null, linkEnded: false, isDraining: false,
    isActuallyWorking: false, waitingOnUser: false, isStopping: false,
    apiRetry: null, thinking: null, waiting: null, elapsedSeconds: 0, tokens: 0,
    runningTaskCount, finishedTaskCount, onToggleTasksPane: typeof onToggleTasksPane === "function" ? onToggleTasksPane : null,
    tasksPaneOpen: !!tasksPaneOpen,
  };
  if (view.phase === "stopping") return { ...props, isStopping: true };
  if (view.phase === "approval") return { ...props, waitingOnUser: true };
  if (view.phase !== "running") return props;
  const running = { ...props, isActuallyWorking: true, elapsedSeconds: seconds(elapsed), tokens: count(outputTokens) ? outputTokens : 0 };
  if (view.kind === "sending") return { ...running, waiting: "sending" };
  if (view.kind === "spawn") return { ...running, spawnLabel: view.label };
  if (view.retry) return { ...running, ...retryProps(view.retry, retrying) };
  return { ...running, isCompacting: activity?.kind === "compacting", thinking, waiting };
}
