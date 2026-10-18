// The host's feed for the original 2.42304.0 loading line w8 (generated/working-line/working-line.mjs). The desktop feeds
// w8 from its session stores in c96d752d0 T8 (pinned in the working-line manifest); this host feeds it from the
// presentation of transcript-status-model.mjs and the turn's own clock, tokens and items. Pure: no React, no timers.
//
// What the props mean to w8 (official names):
//   isActuallyWorking   the turn is running and not stopping or waiting on the user (T8 `k`)
//   isStopping          a stop was asked while it ran (`w = t && C`) → "Stopping…"
//   waitingOnUser       running but waiting on an approval / question (T8 `M`) → the blocked "Needs your input" row
//   spawnLabel / spawnDetail / spawnAction   a named step instead of the stats (Home's worktree steps, B29)
//   apiRetry            {error, attempt, maxRetries} → "{short error} · Retrying ({attempt}/{maxRetries})"
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

// Host retry → w8. With both counts, the official apiRetry branch: {error: the c4a9ee384 API error type, attempt,
// maxRetries}, which w8 reads as "{zp(error, "short")} · Retrying ({attempt}/{maxRetries})"; like the desktop it does not
// show the host's extra "next try" time, cause or remedy link. A Codex retry carries no counts (ErrorNotification has
// none), and w8 would print "Retrying (undefined/undefined)": that case takes w8's named-step slot with the host's own
// "{short error} · Retrying…" label (same clock, no tokens, as the retry branch). See the working-line report.
function retryProps(retry, retrying) {
  const attempt = retrying?.attempt, maxRetries = retrying?.maxRetries;
  if (count(attempt) && count(maxRetries)) return { apiRetry: { error: retrying.errorType ?? null, attempt, maxRetries } };
  return { spawnLabel: `${retry.error} · ${retry.label}` };
}

/**
 * w8's props for a transcript-status presentation, or null when the presentation shows no row (home, loading, the
 * approval card replacing the row).
 */
export function workingLineProps(view, {
  retrying = null, elapsed = null, outputTokens = null, activity = null, thinking = null, waiting = null,
  runningTaskCount = 0, finishedTaskCount = 0, onToggleTasksPane = null, tasksPaneOpen = false,
} = {}) {
  if (!view?.visible) return null;
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
