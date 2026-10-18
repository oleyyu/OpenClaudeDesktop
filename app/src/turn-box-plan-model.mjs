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

// Et (c1ebb1aa4): the tail of an empty transcript.
export const TURN_BOX_EMPTY_TAIL = Object.freeze({
  wrapUp: null, wrapUpCallId: null, wrapUpReceipt: null, plan: null, planBeforeWrapUp: null,
  planTouchedThisTurn: false, planTurnEnded: false, compactedSincePlan: false, turnSettled: false,
  agentsRunning: 0, workedWithoutWrapUp: false, proposedTaskIds: Object.freeze([]),
});

// Codex step statuses to the TodoWrite ones the todo list branches on; the
// same map as source-plan-checklist.jsx planStepStatus (kept here so this model
// loads without JSX).
const STATUS = { completed: "completed", inProgress: "in_progress", in_progress: "in_progress" };
export function turnBoxTodoStatus(status) {
  return STATUS[status] ?? "pending";
}

// turn/plan/updated plan -> the todos the turn box renders (`ut` shape without
// activeForm). Not an array, or empty: no todos.
export function turnBoxTodos(plan) {
  if (!Array.isArray(plan)) return [];
  return plan.map((step, index) => ({
    id: String(index),
    content: String(step?.step ?? ""),
    status: turnBoxTodoStatus(step?.status),
  }));
}

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

// O (Rt): agent calls since the latest prompt whose agent still runs. Host:
// spawnAgent collab calls and subAgentActivity items after the prompt, counted
// once per agent thread whose lifecycle (agent-model observeAgentEvent) is
// running.
export function runningAgentsSince(items = [], fromIndex = -1, agentLifecycle = {}) {
  const ids = new Set();
  for (let index = Math.max(0, fromIndex + 1); index < items.length; index++) {
    const item = items[index];
    if (item?.type === "collabAgentToolCall" && item.tool === "spawnAgent")
      for (const id of [...(item.receiverThreadIds || []), ...Object.keys(item.agentsStates || {})]) ids.add(id);
    if (item?.type === "subAgentActivity" && item.agentThreadId) ids.add(item.agentThreadId);
  }
  let count = 0;
  for (const id of ids) if (agentLifecycle?.[id]?.status === "running") count++;
  return count;
}

// Rt's taskTodos branch over the host's thread state.
//   plan            state.plans[threadId] (turn/plan/updated steps)
//   planMark        planMarkFromUpdate(...) recorded with that plan, or null
//   items           state.items[threadId]
//   activeTurnId    state.active[threadId]
//   agentLifecycle  state.agentLifecycle
//   latestPromptId  the prompt the caller treats as latest (defaults to the
//                   last userMessage item)
//   proposedTaskIds proposals made in this turn (L); none unless supplied
export function turnBoxPlanTail({ plan, planMark = null, items = [], activeTurnId = null, agentLifecycle = {}, latestPromptId, proposedTaskIds } = {}) {
  const list = Array.isArray(items) ? items : [];
  const todos = turnBoxTodos(plan);
  // Rt's caller (Ut) returns Et for an empty transcript.
  if (list.length === 0) return TURN_BOX_EMPTY_TAIL;
  const last = latestPromptOf(list);
  const promptIndex = latestPromptId === undefined ? last?.index ?? -1
    : list.findIndex((item) => item?.type === "userMessage" && item.id === latestPromptId);
  const prompt = promptIndex >= 0 ? { id: list[promptIndex].id ?? null, turnId: list[promptIndex].turnId ?? null } : null;
  const running = typeof activeTurnId === "string" && activeTurnId !== "" ? activeTurnId : null;
  const markTurn = typeof planMark?.turnId === "string" && planMark.turnId !== "" ? planMark.turnId : null;
  // c: a plan write after the latest prompt. The prompt it saw decides; a mark
  // without one falls back to "written in the latest prompt's turn".
  const touched = planMark != null && prompt !== null
    && (planMark.promptId != null && prompt.id != null ? planMark.promptId === prompt.id : markTurn !== null && markTurn === prompt.turnId);
  // m: a turn ended after the write, i.e. the plan's turn is no longer the
  // running one. No mark means no plan write found (Rt leaves m false).
  const ended = markTurn !== null && markTurn !== running;
  // A: the latest prompt's turn has ended and no turn runs after it.
  const settled = prompt !== null && running === null;
  const ids = Array.isArray(proposedTaskIds) && proposedTaskIds.length > 0 ? Object.freeze([...proposedTaskIds]) : TURN_BOX_EMPTY_TAIL.proposedTaskIds;
  return {
    wrapUp: null, wrapUpCallId: null, wrapUpReceipt: null,
    plan: todos.length > 0 ? todos : null,
    planBeforeWrapUp: null,
    planTouchedThisTurn: touched,
    planTurnEnded: ended,
    compactedSincePlan: false,
    turnSettled: settled,
    agentsRunning: runningAgentsSince(list, promptIndex, agentLifecycle),
    workedWithoutWrapUp: false,
    proposedTaskIds: ids,
  };
}

// zt (c1ebb1aa4): same todos by content, status and session.
export function sameTurnBoxTodos(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((todo, index) => todo.content === b[index].content && todo.status === b[index].status && todo.session === b[index].session);
}

// Bt (c1ebb1aa4): the tail equality the source's hook keeps identity with. The
// wrap-up fields are always null here, so they compare by identity.
export function sameTurnBoxTail(a, b) {
  return a.planTouchedThisTurn === b.planTouchedThisTurn && a.planTurnEnded === b.planTurnEnded
    && a.compactedSincePlan === b.compactedSincePlan && a.turnSettled === b.turnSettled
    && a.agentsRunning === b.agentsRunning && a.workedWithoutWrapUp === b.workedWithoutWrapUp
    && a.proposedTaskIds.length === b.proposedTaskIds.length && a.proposedTaskIds.every((id, index) => id === b.proposedTaskIds[index])
    && sameTurnBoxTodos(a.plan, b.plan) && sameTurnBoxTodos(a.planBeforeWrapUp, b.planBeforeWrapUp)
    && a.wrapUpCallId === b.wrapUpCallId && a.wrapUp === b.wrapUp && a.wrapUpReceipt === b.wrapUpReceipt;
}
