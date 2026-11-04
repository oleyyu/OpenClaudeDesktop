// R4g-turnbox TB-2: the turn box's plan tail from the local Codex plan.
//
// 2.42304.0 source: c1ebb1aa4-c89yWBMH.js `Wt` (imported by cccc2cf0a as N_)
// returns the tail `Et` shape, computed by `Rt(messages, latestPromptId,
// taskTodos, runningAgents)`. `Wt` picks the branch with `D(e)` =
// c227f4d5e `Pq` (the per-session turnBox flag, GrowthBook 2371478310, off in
// the host): off means `taskTodos` is passed in (`_t(e)`), so `Rt` takes its
// `i=n!==void 0` branch. That branch returns
//   {wrapUp:null, wrapUpCallId:null, wrapUpReceipt:null, plan:n.length>0?n:null,
//    planBeforeWrapUp:null, planTouchedThisTurn:c, planTurnEnded:m,
//    compactedSincePlan:_ (=!i&&g, so always false), turnSettled:A,
//    agentsRunning:O, workedWithoutWrapUp:!1, proposedTaskIds:L}
// which is the shape here. The host plan is the engine's own list
// (turn/plan/updated {turnId, plan:[{step,status}]}), like the Task list the
// source passes in, so the same branch fits:
//   - plan: the steps as todos {id, content, status}; id is the position
//     (Codex steps carry no id), no `session` (no side sessions), no activeForm.
//   - planTouchedThisTurn (c): the plan was written after the latest prompt.
//   - planTurnEnded (m): a turn ended after the plan was written.
//   - turnSettled (A): the latest prompt's turn has ended and nothing runs.
//   - agentsRunning (O): agents spawned since the latest prompt still running
//     (source: tool_use ids in cea7057eb `ue()`, running local_agent /
//     remote_agent / local_workflow tasks).
// No wrap_up tool exists in the host (same GrowthBook), so wrapUp,
// wrapUpCallId, wrapUpReceipt and planBeforeWrapUp stay null.

// The latest prompt: the last userMessage item of the thread (the source's
// latestPromptId is the uuid of the last user prompt row).
export function latestPromptOf(items = []) {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item?.type === "userMessage") return { id: item.id ?? null, turnId: item.turnId ?? null, index };
  }
  return null;
}

// Where a turn/plan/updated landed: its turn and the latest prompt at that
// moment. state.js keeps only the steps (`plans[threadId]`), so the caller
// records this next to them when the notification arrives. A bridge that
// sends `turnId:''` gives no turn.
export function planMarkFromUpdate(turnId, items = []) {
  return { turnId: typeof turnId === "string" && turnId !== "" ? turnId : null, promptId: latestPromptOf(items)?.id ?? null };
}

