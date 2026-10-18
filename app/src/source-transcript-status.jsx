import React, { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import { createFinishedTaskHold, transcriptStatusPresentation } from "./transcript-status-model.mjs";
import { SPARK_PATH } from "./source-spark.jsx";
import "./source-transcript-status.css";
import { createThinkingReader, elapsedTurnSeconds, subscribeThinkingClock, subscribeTurnClock, thinkingChangeAt, thinkingState, turnActivity } from './transcript-runtime-stats.mjs';
import { turnWaiting, workingLineProps, workingLineThinking } from "./working-line-model.mjs";
import { SourceWorkingLine } from "./source-working-line.jsx";
import { TranscriptTail } from "./source-transcript-rows.jsx";

// The static path now lives in source-spark.jsx; re-exported for existing imports.
export const TRANSCRIPT_SPARK_PATH = SPARK_PATH;

const noElapsedOnServer = () => null;
// Whe :58132-58145 over createFinishedTaskHold (the timer lives in the model); 2.42304.0 zet holds the same 1500 ms.
export function useFinishedTaskHold(running, owner = null) {
  const [, rerender] = useReducer(count => count + 1, 0);
  const [hold] = useState(() => createFinishedTaskHold(rerender));
  useEffect(() => { hold.update(running, owner); }, [hold, running, owner]);
  useEffect(() => () => hold.dispose(), [hold]);
  return hold.finished(running, owner);
}
// Du thinking state of the running turn: re-read on item changes and when its
// minimum-active or "Thought for Ns" hold runs out. The app never hydrates, so
// the server snapshot reads the clock too (SSR tests render the done state).
function useThinkingState(turnId, items, itemPhases, enabled) {
  const read = useMemo(() => createThinkingReader(enabled ? turnId : null, items || [], itemPhases || {}), [enabled, turnId, items, itemPhases]);
  const subscribe = useCallback(notify => subscribeThinkingClock(nowMs => enabled ? thinkingChangeAt(turnId, items || [], itemPhases || {}, nowMs) : null, notify),
    [enabled, turnId, items, itemPhases]);
  const snapshot = () => read(Date.now());
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
// The transcript's loading line. Since the turnStatusRows ruling it is the original 2.42304.0 w8 in its gate-on branch
// (source-working-line.jsx); this component takes the host's turn state and turns it into w8's props
// (working-line-model.mjs). The wrapper keeps the host's transcript placement (turn gap,
// the `.source-transcript-content` sibling rules) and the `.source-working` busy marker the UI harnesses wait on.
export function SourceTranscriptStatus({ textSize = "m", turnId, turnStats, items, itemPhases,
  runningTaskCount = 0, tasksPaneOpen = false, onToggleTasksPane = null, ...rest }) {
  // main.jsx still passes the classic row's onToggleThinking / thinkingShown / onOpenLink; the desktop's line has no
  // thinking toggle and no retry link, so they are not part of the presentation input.
  const { onToggleThinking: _toggle, thinkingShown: _shown, onOpenLink: _link, ...state } = rest;
  const view = transcriptStatusPresentation(state);
  const finishedTaskCount = useFinishedTaskHold(runningTaskCount, state.sessionKey ?? null);
  const owned = turnId && turnStats?.turnId === turnId ? turnStats : null;
  const startedAt = view.phase === 'running' ? owned?.startedAt ?? null : null;
  const subscribe = useCallback(notify => subscribeTurnClock(startedAt, notify), [startedAt]);
  const snapshot = useCallback(() => elapsedTurnSeconds(startedAt, Date.now()), [startedAt]);
  const elapsed = useSyncExternalStore(subscribe, snapshot, noElapsedOnServer);
  // apiRetry replaces the activity (and the token stat) until the turn resumes.
  const working = view.phase === 'running' && !view.retry;
  const thought = useThinkingState(turnId, items, itemPhases, working);
  const activity = working ? turnActivity(turnId, items, itemPhases, elapsed, thought) : null;
  // ITe: `open` while the thought streams; without a clock thinkingState reports only a streaming thought.
  const thinking = working ? workingLineThinking(thought, thinkingState(turnId, items || [], itemPhases || {}) !== null) : null;
  const waiting = working ? turnWaiting(turnId, items || [], itemPhases || {}, activity) : null;
  const line = workingLineProps(view, { retrying: state.retrying, elapsed, outputTokens: owned?.outputTokens, activity, thinking, waiting,
    runningTaskCount, finishedTaskCount, onToggleTasksPane, tasksPaneOpen });
  // Every invisible local presentation is a source state without a row (home, loading, hideLoader when the approval
  // card replaces the loader), so the tasks button never resurrects the row on its own.
  if (!line) return null;
  return (
    <div
      className={`source-transcript-status${view.busy ? " source-working" : ""}`}
      data-testid="code-transcript-status"
      data-transcript-status={view.phase}
      data-working-row={view.busy ? "" : undefined}
    >
      {/* f9's tail cell: the turn mark's outlet and the working line share one grid cell (source-transcript-rows.jsx). */}
      <TranscriptTail><SourceWorkingLine line={line} textSize={textSize} /></TranscriptTail>
    </div>
  );
}
