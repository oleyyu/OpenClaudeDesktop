// The Code transcript's rows in the turnStatusRows branch (GrowthBook __gb__2846116625; W14-code r4 gates-r4-11: not in the
// desktop's Uon, so not served — the Code session turns it on, cf74bc599 `Gn = eh() || Wn` → `s($m, {value: Gn})`). The rows
// are the 2.42304.0 originals (generated/transcript-rows, generated/working-line); this module only puts them where the
// host's transcript has the corresponding rows and feeds them the host's data (transcript-rows-model.mjs).
//
//   TranscriptRowsScope  the transcript root: c26fb8b6b Ye (TurnStatusRowsOverride) with cf74bc599's Gn (the outer value
//                        or `statusRows`, the Code session's rendererChrome), cb6930dae ho's scope — the live
//                        scope (so: sessionId, turnLive, liveRunningToolIds), the last tool's activity (io) and the mark
//                        broker La — plus the host scope the adapters read (turn start, awaiting).
//   TranscriptTail       f9's tail cell: the mark outlet (Ba, `empty:hidden`) and the working line in one grid cell.
//   StatusStep           a tool row: TurnStatus.Step (qP / $Ae / HZ), or, while it runs and holds the turn's mark, ZAe's
//                        busy TurnStatus.
//   (the tool rows and groups themselves are the originals: source-transcript-tool-rows.jsx)
import React, { useMemo, useState } from "react";
import { TurnStatusRowsOverride, useTurnStatusRows } from "./generated/working-line/turn-status-rows.mjs";
import { TurnStatus } from "./generated/working-line/turn-status.mjs";
import { TurnActivityContext } from "./generated/working-line/morph.mjs";
import { toolActivity } from "./generated/transcript-rows/tool-activity.mjs";
import { TranscriptLiveScopeContext, TurnMarkBroker, TurnMarkOutlet } from "./generated/transcript-rows/turn-mark.mjs";
import { RunningToolRow } from "./generated/transcript-rows/group-status.mjs";
import { TranscriptHostScope } from "./transcript-host-scope.mjs";
import { transcriptLiveScope, intersectLiveIds, stepState } from "./transcript-rows-model.mjs";

export { useTurnStatusRows };

export function TranscriptRowsScope({ sessionKey = null, turnId = null, items = null, itemPhases = null, responding = false, turnStats = null, awaiting = false,
  statusRows = true, children }) {
  // W14-code r4 gates-r4-11: cf74bc599 `Hn = (e) => Z === null && e.rendererChrome`, `Wn = Z === null ? Xr(r, Hn) : Ln`,
  // `Gn = eh() || Wn` (eh = c26fb8b6b Xe, useTurnStatusRows), `s($m, {value: Gn, children: Fc})` ($m = Ye): the Code
  // session's rows are TurnStatus rows; Chat / Cowork (no such provider) read the gate, which the desktop does not serve.
  const rowsOn = useTurnStatusRows() || statusRows === true;
  const scope = transcriptLiveScope({ sessionKey, turnId, items, itemPhases, responding, turnStats, awaiting });
  const current = [...scope.liveRunningToolIds].join("\n");
  // cb6930dae ho: `[w,T]=re(y,()=>b.endsInUnansweredUserRow?"":C);!b.endsInUnansweredUserRow&&w!==C&&T(C);
  // let E=…b.endsInUnansweredUserRow?lo(C,w):C` — the running ids last seen for the session (re: state keyed by the
  // session id) while the user row is answered; right after a user row (a steer, no reply yet) only the ids still
  // running among them stay live (lo, the intersection). 3.6556.2 cb6930dae-Dw_4c1QI.js Ho, the same:
  // `[O,k]=ut(x,D);!S.endsInUnansweredUserRow&&O!==E&&k(E);…S.endsInUnansweredUserRow?Lo(E,O):E` (ut: state keyed by x,
  // the session id; D = ends ? "" : E), then `liveRunningToolIds: zo(A)`.
  const [held, setHeld] = useState(() => ({ key: sessionKey, ids: scope.endsInUnansweredUserRow ? "" : current }));
  const heldIds = held.key === sessionKey ? held.ids : scope.endsInUnansweredUserRow ? "" : current;
  if (!scope.endsInUnansweredUserRow && (held.key !== sessionKey || held.ids !== current)) setHeld({ key: sessionKey, ids: current });
  const idsKey = scope.endsInUnansweredUserRow ? intersectLiveIds(current, heldIds) : current;
  // ho memoizes the live scope on its keys (sessionId, turnLive, the running ids): `liveRunningToolIds: fo(E)`.
  const live = useMemo(() => ({ sessionId: scope.sessionId, turnLive: scope.turnLive,
    liveRunningToolIds: new Set(idsKey === "" ? [] : idsKey.split("\n")), liveRunningShellCalls: undefined }),
  [scope.sessionId, scope.turnLive, idsKey]);
  const host = useMemo(() => ({ sessionId: scope.sessionId, turnStartedAt: scope.turnStartedAt, awaiting: scope.awaiting }),
    [scope.sessionId, scope.turnStartedAt, scope.awaiting]);
  // ho: `D = ne && Lt(ne.name, ne.input)`, the last tool's activity while the turn responds.
  const activity = scope.lastTool ? toolActivity(scope.lastTool.name, scope.lastTool.input) : undefined;
  return <TurnStatusRowsOverride value={rowsOn}>
    <TranscriptHostScope.Provider value={host}>
      <TranscriptLiveScopeContext.Provider value={live}>
        <TurnActivityContext.Provider value={activity}>
          <TurnMarkBroker>{children}</TurnMarkBroker>
        </TurnActivityContext.Provider>
      </TranscriptLiveScopeContext.Provider>
    </TranscriptHostScope.Provider>
  </TurnStatusRowsOverride>;
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
 * that takes the turn's mark when it holds the turn's tail). `rest` carries data attributes onto the step root; `media`
 * is the step's own media slot (data-cds-row-media, last in the row); `icon` goes before the verb once the step settles.
 */
export function StatusStep({ state = "done", label, icon, meta, metaTitle, trailing, media, actions, actionsLabel, open, onOpenChange, candidate, after, children, rest }) {
  const cds = stepState(state);
  // With content after the row (RN), or while ZAe may swap the step for its busy row, the row's attributes go on a
  // wrapper root, not on the step.
  const running = cds === "busy" && !!candidate;
  const stepRest = after == null && !running ? rest : undefined;
  // An icon before the verb (computer-use rows) once the step has settled: a running step keeps the step's own busy
  // label (its shimmer reads a string).
  const shown = icon && cds !== "busy" && cds !== "blocked" && cds !== "pending"
    ? <><span className="inline-flex shrink-0 items-center me-2 align-top h-[1lh]">{icon}</span>{label}</> : label;
  const step = <TurnStatus.Step {...stepRest} state={cds} label={shown} meta={meta || undefined} metaTitle={metaTitle || undefined}
    trailing={trailing} media={media} actions={actions} actionsLabel={actionsLabel} open={children == null ? undefined : open}
    onOpenChange={children == null ? undefined : onOpenChange}>{children ?? undefined}</TurnStatus.Step>;
  const row = running
    ? <RunningToolRow candidate={candidate} step={step} runningLabel={[label, meta].filter(Boolean).join(" ")} trailing={trailing}
        body={children ?? undefined} open={children == null ? undefined : open} onOpenChange={children == null ? undefined : onOpenChange} />
    : step;
  if (stepRest) return row;
  // RN: content of the row outside its collapsible body (hoisted output images) stays in the row's root.
  return <div {...rest} className={`flex w-full min-w-0 flex-col ${rest?.className ?? ""}`}>{row}{after}</div>;
}
