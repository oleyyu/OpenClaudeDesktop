// The Code transcript's rows in the turnStatusRows branch (GrowthBook __gb__2846116625, on: host-growthbook.mjs). The rows
// are the 2.42304.0 originals (generated/transcript-rows, generated/working-line); this module only puts them where the
// host's transcript has the corresponding rows and feeds them the host's data (transcript-rows-model.mjs).
//
//   TranscriptRowsScope  the transcript root: He (TurnStatusRowsProvider, the gate), cb6930dae ho's scope — the live
//                        scope (so: sessionId, turnLive, liveRunningToolIds), the last tool's activity (io) and the mark
//                        broker La — plus the host scope the adapters read (turn start, awaiting).
//   TranscriptTail       f9's tail cell: the mark outlet (Ba, `empty:hidden`) and the working line in one grid cell.
//   StatusStep           a tool row: TurnStatus.Step (qP / $Ae / HZ), or, while it runs and holds the turn's mark, ZAe's
//                        busy TurnStatus.
//   (the tool rows and groups themselves are the originals: source-transcript-tool-rows.jsx)
import React, { useMemo } from "react";
import { TurnStatusRowsProvider, useTurnStatusRows } from "./generated/working-line/turn-status-rows.mjs";
import { TurnStatus } from "./generated/working-line/turn-status.mjs";
import { TurnActivityContext } from "./generated/working-line/morph.mjs";
import { toolActivity } from "./generated/transcript-rows/tool-activity.mjs";
import { TranscriptLiveScopeContext, TurnMarkBroker, TurnMarkOutlet } from "./generated/transcript-rows/turn-mark.mjs";
import { RunningToolRow } from "./generated/transcript-rows/group-status.mjs";
import { TranscriptHostScope } from "./transcript-host-scope.mjs";
import { transcriptLiveScope, stepState } from "./transcript-rows-model.mjs";

export { useTurnStatusRows };

export function TranscriptRowsScope({ sessionKey = null, turnId = null, items = null, itemPhases = null, responding = false, turnStats = null, awaiting = false, children }) {
  const scope = transcriptLiveScope({ sessionKey, turnId, items, itemPhases, responding, turnStats, awaiting });
  const idsKey = [...scope.liveRunningToolIds].sort().join("\0");
  // ho memoizes the live scope on its keys (sessionId, turnLive, the running ids).
  const live = useMemo(() => ({ sessionId: scope.sessionId, turnLive: scope.turnLive, liveRunningToolIds: scope.liveRunningToolIds,
    liveRunningShellCalls: undefined }), [scope.sessionId, scope.turnLive, idsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const host = useMemo(() => ({ sessionId: scope.sessionId, turnStartedAt: scope.turnStartedAt, awaiting: scope.awaiting }),
    [scope.sessionId, scope.turnStartedAt, scope.awaiting]);
  // ho: `D = ne && Lt(ne.name, ne.input)`, the last tool's activity while the turn responds.
  const activity = scope.lastTool ? toolActivity(scope.lastTool.name, scope.lastTool.input) : undefined;
  return <TurnStatusRowsProvider>
    <TranscriptHostScope.Provider value={host}>
      <TranscriptLiveScopeContext.Provider value={live}>
        <TurnActivityContext.Provider value={activity}>
          <TurnMarkBroker>{children}</TurnMarkBroker>
        </TurnActivityContext.Provider>
      </TranscriptLiveScopeContext.Provider>
    </TranscriptHostScope.Provider>
  </TurnStatusRowsProvider>;
}

// f9 `iit`: the outlet's attributes (aria-hidden, the mark sits beside the working line, not in reading order).
const OUTLET_ATTRS = Object.freeze({ "aria-hidden": "true" });
const TAIL_GRID = "grid grid-cols-[minmax(0,1fr)] gap-y-[var(--chat-turn-gap,15px)] [&>*]:min-w-0 [&>:empty]:invisible [&>:empty]:[grid-area:1/1] [&>[data-quiet]]:[grid-area:1/1] [&>[data-turn-mark-outlet]]:[grid-area:1/1]";
export function TranscriptTail({ children }) {
  return <div className={TAIL_GRID}>
    <TurnMarkOutlet className="empty:hidden" attrs={OUTLET_ATTRS} />
    {children}
  </div>;
}

/**
 * A host tool row as the desktop's turnStatusRows row: a TurnStatus.Step, or while the tool runs ZAe (the busy row
 * that takes the turn's mark when it holds the turn's tail). `rest` carries data attributes onto the step root.
 */
export function StatusStep({ state = "done", label, meta, metaTitle, trailing, actions, actionsLabel, open, onOpenChange, candidate, after, children, rest }) {
  const cds = stepState(state);
  // With content after the row (RN), or while ZAe may swap the step for its busy row, the row's attributes go on a
  // wrapper root, not on the step.
  const running = cds === "busy" && !!candidate;
  const stepRest = after == null && !running ? rest : undefined;
  const step = <TurnStatus.Step {...stepRest} state={cds} label={label} meta={meta || undefined} metaTitle={metaTitle || undefined}
    trailing={trailing} actions={actions} actionsLabel={actionsLabel} open={children == null ? undefined : open}
    onOpenChange={children == null ? undefined : onOpenChange}>{children ?? undefined}</TurnStatus.Step>;
  const row = running
    ? <RunningToolRow candidate={candidate} step={step} runningLabel={[label, meta].filter(Boolean).join(" ")} trailing={trailing}
        body={children ?? undefined} open={children == null ? undefined : open} onOpenChange={children == null ? undefined : onOpenChange} />
    : step;
  if (stepRest) return row;
  // RN: content of the row outside its collapsible body (hoisted output images) stays in the row's root.
  return <div {...rest} className={`flex w-full min-w-0 flex-col ${rest?.className ?? ""}`}>{row}{after}</div>;
}
