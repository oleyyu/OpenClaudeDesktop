import { connectionInterrupted } from "./item-observation.mjs";
import { observeAgentEvent } from "./agent-model.mjs";
import { beginTurnStats, updateTurnUsage } from './transcript-runtime-stats.mjs';
import { emptyApprovalTransport, reduceApprovalTransport } from "./approval-state.js";
import { normalizeTurnError } from "./turn-error-model.mjs";
import { planMarkFromUpdate } from "./turn-box-plan-model.mjs";
export const emptyState = {
  ...emptyApprovalTransport,
  items: {},
  active: {},
  activeVersions: {},
  plans: {},
  // threadId -> the latest proposed plan document: the text of the newest
  // ThreadItem {type:'plan', text} (item/completed or history), shown by the
  // Plan pane (panes-tile-current.js kp/Dp). The DeepSeek bridge projects
  // exit_plan_mode as this item (codex-app-server projection.js).
  planDocs: {},
  diffs: {},
  approvals: [],
  usage: {},
  turnStats: {},
  // TurnErrors Codex reported without a turn identity; the transcript-tail card.
  errors: {},
  // threadId -> turnId -> TurnError {message, codexErrorInfo, additionalDetails}
  // from turn/completed status failed, error willRetry:false and history.
  // Kept per turn: a later turn/started never clears an earlier failure.
  turnErrors: {},
  // threadId -> {turnId, message, codexErrorInfo} while Codex retries
  // (ErrorNotification willRetry:true); local observation only.
  retrying: {},
  safetyBuffering: {},
  operations: {},
  background: {},backgroundReads: {},backgroundStarts: {},taskTurnFacts: {},
  // threadId -> turnId -> {startedAt, completedAt}: Codex Turn Unix seconds or
  // null (ts/v2/Turn.ts) from turn/started, turn/completed and history. Drives
  // the OY message-row timestamps; unlike taskTurnFacts it keeps every turn.
  turnTimes: {},
  // Local observations of item lifecycle; never serialized into Codex requests.
  itemPhases: {},
  // 0.155.1 connection-wide notices: deprecationNotice {summary, details} and
  // warning without a threadId (ServerNotification.ts:90).
  notices: [],
  // warning {threadId, message} scoped to one thread.
  warnings: {},
  // threadId -> [{kind, summary, details, values}]: other thread-scoped notices Codex sends (guardianWarning,
  // autoApprovalReview/strictReviewRequired, model/verification, model/rerouted, a denied network auto-review).
  threadNotices: {},
  // threadId -> {reviewId -> {targetItemId, status, riskLevel, rationale, action, startedAtMs, completedAtMs}}:
  // item/autoApprovalReview/started|completed (Codex 'Approve for me', approvalsReviewer auto_review).
  autoReviews: {},
  // threadId -> ThreadGoal {objective, status, tokenBudget, tokensUsed, timeUsedSeconds, …} (thread/goal/updated;
  // removed by thread/goal/cleared). Bridges may add codeDesktop {rounds, maxRounds}.
  goals: {},
  // threadId -> name from thread/name/updated (an agent-generated title); main.jsx applies it to the session row.
  threadNames: {},
  // threadId -> {runId -> HookRunSummary}: hook/started|completed.
  hookRuns: {},
  // thread/started {thread}: identity of every thread this connection was
  // attached to, including AgentControl-spawned sub-agents.
  threads: {},
  // childThreadId -> parentThreadId (Thread.parentThreadId).
  threadParents: {},
  // parentThreadId -> [childThreadId]; a sub-agent thread is never a session.
  childThreads: {},
  // thread/status/changed {threadId, status} (ThreadStatus).
  threadStatus: {},
  agentLifecycle: {},
};
// A repeated notice carries no new information and the official surface is a
// single non-modal line, so identical entries collapse; the cap only stops an
// unbounded server from growing the array without bound.
const NOTICE_LIMIT = 50;
function appendNotice(list, entry) {
  if ((list || []).some((item) => item.kind === entry.kind && item.summary === entry.summary && item.details === entry.details)) return list;
  return [...list, entry].slice(-NOTICE_LIMIT);
}
// Fixed English sources for notices Codex sends without text of its own; the notice banner translates them.
export const STRICT_REVIEW_REQUIRED = "This request needs additional safety checks before it can run.";
export const CYBER_VERIFICATION = "Some cybersecurity requests need trusted access verification. Responses to them may be limited.";
export const MODEL_REROUTED = "This turn used {to} instead of {from}.";
export const AUTO_REVIEW_DENIED = "Auto-review denied network access.";
export const AUTO_REVIEW_DENIED_HOST = "Auto-review denied network access to {host}.";
export const HOOK_BLOCKED = "A {event} hook blocked this action.";
export const HOOK_FAILED = "A {event} hook failed.";
// HookEventName (camelCase) as the hook configs spell it: preToolUse → PreToolUse.
const hookEventName = (name) => typeof name === "string" && name ? name[0].toUpperCase() + name.slice(1) : "hook";
function threadNotice(method, p) {
  if (method === "guardianWarning") return typeof p.message === "string" && p.message ? { kind: "guardian", summary: p.message, details: null } : null;
  if (method === "autoApprovalReview/strictReviewRequired") return { kind: "strictReview", summary: STRICT_REVIEW_REQUIRED, details: null };
  if (method === "model/verification") return Array.isArray(p.verifications) && p.verifications.includes("trustedAccessForCyber")
    ? { kind: "verification", summary: CYBER_VERIFICATION, details: null } : null;
  if (method === "model/rerouted") return typeof p.fromModel === "string" && typeof p.toModel === "string" && p.fromModel !== p.toModel
    ? { kind: "rerouted", summary: MODEL_REROUTED, details: `${p.fromModel}→${p.toModel}`, values: { from: p.fromModel, to: p.toModel } } : null;
  return null;
}
// Delta-only items can arrive before the resume response or item/started.
// Symbols stay local to reducer objects and are never sent to Codex or persisted.
const deltaOnlyFields = Symbol("deltaOnlyFields");
const streamFields = ["text", "aggregatedOutput", "reasoningText", "rawReasoningText"];
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
// The summaryIndex a streaming thought's reasoningText last reached. Codex sends
// item/reasoning/summaryPartAdded (AgentReasoningSectionBreak) between summary
// sections and tags each summaryTextDelta with its summaryIndex; a new section
// starts its own paragraph, as ReasoningItem.summary parts do once completed.
const summarySection = Symbol("summarySection");
const SUMMARY_BREAK = "\n\n";
function withSummarySection(item, index) {
  if (!Number.isInteger(index) || index <= (item[summarySection] ?? 0)) return item;
  const text = item.reasoningText || "";
  return { ...item, [summarySection]: index, ...(text.trim() && !text.endsWith(SUMMARY_BREAK) ? { reasoningText: text + SUMMARY_BREAK } : {}) };
}

function mergeLiveItem(snapshot, current, baseline) {
  const merged = { ...snapshot, ...current };
  for (const field of streamFields) {
    const live = current[field], saved = snapshot[field];
    if (typeof live !== "string" || typeof saved !== "string") continue;
    const previous = baseline?.[field];
    if (live === previous) {
      // Another field changed while this text still belongs to the baseline.
      merged[field] = saved;
    } else if (current[deltaOnlyFields]?.includes(field)) {
      // With no known base, never guess that an unrelated snapshot precedes the
      // fragment. Accept its complete text only when it already contains ours.
      merged[field] = saved.includes(live) ? saved : live;
    } else if (saved.startsWith(live)) {
      // The snapshot already includes these deltas, possibly with a newer tail.
      merged[field] = saved;
    } else {
      // Current extends an older snapshot, or order is unknown: preserve live.
      // Do not concatenate; that can duplicate deltas contained in the snapshot.
      merged[field] = live;
    }
  }
  return merged;
}

const turnSeconds = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
// One entry per turn; a missing field never erases a value already observed.
function recordTurnTimes(bucket, turns) {
  let next = bucket;
  for (const turn of turns) {
    if (!turn?.id) continue;
    const old = bucket?.[turn.id];
    const entry = { startedAt: turnSeconds(turn.startedAt) ?? old?.startedAt ?? null, completedAt: turnSeconds(turn.completedAt) ?? old?.completedAt ?? null };
    if (old && old.startedAt === entry.startedAt && old.completedAt === entry.completedAt) continue;
    if (next === bucket) next = { ...bucket };
    next[turn.id] = entry;
  }
  return next;
}
function withTurnTimes(state, id, turns) {
  const bucket = state.turnTimes?.[id], next = recordTurnTimes(bucket, turns);
  return next === bucket ? state : { ...state, turnTimes: { ...state.turnTimes, [id]: next } };
}

function hydrate(state, action) {
  state = startThread(state, {...action.thread, id:action.id});
  // Turn.startedAt/completedAt from thread/read, resume initialTurnsPage and
  // thread/turns/list; live entries for turns absent from this page are kept.
  state = withTurnTimes(state, action.id, action.thread.turns || []);
  const snapshot = (action.thread.turns || []).flatMap((turn) =>
    (turn.items || []).map((item) => ({ ...item, ...(item.type === "contextCompaction" ? {status:turn.status} : {}), turnId: turn.id })),
  );
  const snapshotActive = (action.thread.turns || []).find(
    (turn) => turn.status === "inProgress",
  )?.id || null;
  const hasBaseline = owns(action, "baselineItems");
  let items = snapshot;
  if (hasBaseline) {
    const baseline = new Map((action.baselineItems || []).map((item) => [item.id, item]));
    const current = new Map((state.items[action.id] || []).map((item) => [item.id, item]));
    const seen = new Set();
    items = snapshot.map((item) => {
      seen.add(item.id);
      const live = current.get(item.id);
      return live && live !== baseline.get(item.id)
        ? mergeLiveItem(item, live, baseline.get(item.id))
        : item;
    });
    // A stream can introduce items absent from the in-flight snapshot. Preserve
    // known history too: a partial snapshot cannot justify deleting local rows.
    for (const item of current.values()) if (!seen.has(item.id) && (!action.replaceHistory || !baseline.has(item.id) || item !== baseline.get(item.id))) items.push(item);
  }
  const activeChanged = owns(action, "baselineActiveVersion")
    ? (state.activeVersions?.[action.id] || 0) !== (action.baselineActiveVersion || 0)
    : owns(action, "baselineActive") && state.active[action.id] !== action.baselineActive;
  // Turn.status "failed" + Turn.error (ts/v2/Turn.ts) from thread/read,
  // thread/resume or thread/turns/list: the failure survives a relaunch.
  // Live entries for turns absent from this page are kept.
  const historyErrors = Object.fromEntries((action.thread.turns || [])
    // A completed turn keeps an error too: the bridge's output-limit stop (R08).
    .filter((turn) => turn?.id && (turn.status === "failed" || turn.status === "completed") && turn.error)
    .map((turn) => [turn.id, normalizeTurnError(turn.error)]));
  const turnErrors = Object.keys(historyErrors).length
    ? { ...state.turnErrors, [action.id]: { ...state.turnErrors?.[action.id], ...historyErrors } } : state.turnErrors;
  return {
    ...state,
    turnErrors,
    turnStats: activeChanged || !snapshotActive ? state.turnStats : { ...state.turnStats,
      [action.id]: beginTurnStats(state.turnStats?.[action.id], action.thread.turns.find(turn => turn.id === snapshotActive), false) },
    agentLifecycle: activeChanged || !(action.thread.turns || []).length ? state.agentLifecycle : observeAgentEvent(state.agentLifecycle, {
      method:snapshotActive ? "turn/started" : "turn/completed", params:{threadId:action.id,turn:snapshotActive ? action.thread.turns.find(turn=>turn.id===snapshotActive) : action.thread.turns.at(-1)}
    }, {}),
    items: { ...state.items, [action.id]: items },
    planDocs: withPlanDocument(state.planDocs, action.id, items.findLast((item) => item?.type === "plan" && typeof item.text === "string" && item.text)),
    active: { ...state.active, [action.id]: activeChanged ? state.active[action.id] : snapshotActive },
  };
}
// planDocs: a history replay or a completed plan item sets the thread's
// document; a history without one keeps the document already observed.
function withPlanDocument(planDocs = {}, id, item) {
  if (!item || planDocs[id] === item.text) return planDocs;
  return { ...planDocs, [id]: item.text };
}

function settleObservedItem(item, status) {
  const next = { ...item, status };
  delete next[connectionInterrupted];
  return next;
}

function nextActiveVersion(state, id) {
  return { ...state.activeVersions, [id]: (state.activeVersions?.[id] || 0) + 1 };
}

export function isItemStreaming(state, threadId, item) {
  if (!item || !["agentMessage", "reasoning", "plan", "contextCompaction"].includes(item.type)) return false;
  const active = state.active[threadId];
  if (["completed", "failed", "interrupted", "stopped", "cancelled", "canceled"].includes(item.status)) return false;
  const phase = state.itemPhases?.[threadId]?.[item.id];
  // A real delta may arrive before the initial thread/resume response. An
  // absent active entry is unknown, whereas an explicit null is known idle.
  if (!active) return !owns(state.active, threadId) && phase === "streaming";
  const review = state.operations?.[threadId];
  const activeReviewItem = review?.operation === "review" && ["starting", "running", "unknown"].includes(review.phase)
    && review.turnId === item.turnId;
  if (item.turnId !== active && !activeReviewItem) return false;
  if (phase) return phase === "streaming";
  if (["inProgress", "running"].includes(item.status)) return true;
  // A resumed active turn does not report agentMessage lifecycle status. Its
  // final item may still grow; earlier items have already yielded to successors.
  const items = state.items[threadId] || [];
  for (let index = items.length - 1; index >= 0; index--)
    if (items[index].turnId === active) return items[index].id === item.id;
  return false;
}

function observeItemPhase(state, threadId, itemId, phase) {
  return {
    ...state.itemPhases,
    [threadId]: { ...state.itemPhases?.[threadId], [itemId]: phase },
  };
}

// Updates the named item. Without a `create` an unknown item is left alone:
// no notification may invent a transcript row Codex has not reported.
function upsertItem(items, itemId, update, create) {
  if (!itemId) return items;
  const at = items.findIndex((item) => item.id === itemId);
  if (at < 0 && !create) return items;
  const next = items.slice();
  if (at < 0) next.push(create());
  else next[at] = update(next[at]);
  return next;
}

// thread/started {thread}. The stdio server attaches every initialized
// connection to each new thread, including AgentControl-spawned sub-agents
// (lib.rs:1252-1266 -> thread_processor.rs:3609-3640 try_attach_thread_listener),
// so a child thread's turn/* and item/* arrive here keyed by the CHILD id.
// The parent link is what lets those buckets belong to the parent session;
// the child is never a session of its own (official thread/list also omits
// sub-agent sources unless asked, filters.rs:121-150).
function startThread(state, thread) {
  if (!thread?.id) return state;
  const spawn = thread.source?.subAgent?.thread_spawn;
  const parent = thread.parentThreadId || spawn?.parent_thread_id || null;
  const record = {
    id: thread.id,
    parentThreadId: parent,
    source: thread.source ?? null,
    cwd: thread.cwd ?? null,
    agentNickname: thread.agentNickname ?? spawn?.agent_nickname ?? null,
    agentRole: thread.agentRole ?? spawn?.agent_role ?? null,
    model: thread.model ?? null,
    historyMode: thread.historyMode ?? null,
    canAcceptDirectInput: thread.canAcceptDirectInput ?? null,
    status: thread.status ?? null,
  };
  const next = { ...state, threads: { ...state.threads, [thread.id]: { ...state.threads[thread.id], ...record } } };
  if (thread.status) next.threadStatus = { ...state.threadStatus, [thread.id]: thread.status };
  if (!parent) return next;
  const siblings = state.childThreads[parent] || [];
  next.threadParents = { ...state.threadParents, [thread.id]: parent };
  next.childThreads = { ...state.childThreads, [parent]: siblings.includes(thread.id) ? siblings : [...siblings, thread.id] };
  return next;
}

// A Thread the app-server classifies as a sub-agent. Thread.parentThreadId is
// only set for AgentControl thread_spawn (ts/v2/Thread.ts), whereas the
// app-server's own sidebar classification keys on Thread.source
// (SessionSource = ... | {subAgent: SubAgentSource}, filters.rs:121-150):
// a "review" or "compact" sub-agent has source {subAgent:...} and
// parentThreadId null. work/protocol-0155-audit/probe.json threadListSub shows
// three such review threads on this machine, so a parentThreadId-only guard
// would let them become sidebar sessions.
export function isSubAgentThread(thread) {
  const source = thread?.source;
  if (source && typeof source === "object" && !Array.isArray(source) && owns(source, "subAgent")) return true;
  return typeof thread?.parentThreadId === "string" && !!thread.parentThreadId;
}

// The session that owns a bucket: a sub-agent can itself spawn sub-agents
// (SubAgentSource depth), so the parent chain is followed to its root.
export function ownerThreadId(state, threadId) {
  const seen = new Set();
  let id = threadId;
  while (id && state.threadParents?.[id] && !seen.has(id)) {
    seen.add(id);
    id = state.threadParents[id];
  }
  return id;
}

export function isChildThread(state, threadId) {
  return !!state.threadParents?.[threadId];
}

// Is a serverRequest waiting on this SESSION, including one raised by a
// sub-agent running for it? A sub-agent thread is never a sidebar row and
// never navigable, so its approval has to be attributed to the session that
// owns it or it can be neither answered nor flagged.
// A turn runs or an approval waits in any session. turn/completed leaves the
// thread's active entry as an explicit null (known idle, see isItemStreaming),
// so a finished turn's key alone never counts as running.
export function hasLiveWork(state) {
  return Object.values(state?.active || {}).some(Boolean) || (state?.approvals || []).length > 0;
}
export function hasPendingApproval(state, threadId) {
  if (!threadId) return false;
  return (state.approvals || []).some(
    (approval) => approval.params?.threadId && ownerThreadId(state, approval.params.threadId) === threadId,
  );
}

// Every descendant bucket of one session, nearest first.
export function childThreadIds(state, threadId) {
  const out = [], queue = [...(state.childThreads?.[threadId] || [])], seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    queue.push(...(state.childThreads?.[id] || []));
  }
  return out;
}

function retainCompletedItemPhases(phases = {}) {
  return Object.fromEntries(Object.entries(phases).map(([threadId, items]) => [
    threadId,
    Object.fromEntries(Object.entries(items).filter(([, phase]) => phase === "completed")),
  ]));
}

// How full a session's context is in a thread/tokenUsage report: the last request's total (context-usage-model reads the
// same field for the composer ring).
const contextTokens = (usage) => Number.isFinite(usage?.last?.totalTokens) ? usage.last.totalTokens : null;
// The usage a core re-sends right after compacting (Codex recompute_token_usage, compact.rs) is the context's new size:
// the latest compaction that knows its starting size and has none yet takes it, while it is still that compaction's turn.
function withCompactionAfter(items, p, active) {
  const after = contextTokens(p.tokenUsage);
  if (!(after >= 0)) return items;
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item?.type !== "contextCompaction") continue;
    if (!Number.isFinite(item.preTokens) || Number.isFinite(item.postTokens) || after >= item.preTokens) return items;
    const sameTurn = p.turnId ? p.turnId === item.turnId : !active || active === item.turnId;
    if (!sameTurn) return items;
    const next = items.slice();
    next[index] = { ...item, postTokens: after };
    return next;
  }
  return items;
}

export function reduce(state, action) {
  // expect: only that operation (an automatic dismissal must not clear a newer one that started meanwhile).
  if (action.type === "dismiss-operation") {
    if (action.expect !== undefined && state.operations?.[action.id] !== action.expect) return state;
    return { ...state, operations:{...state.operations, [action.id]:null} };
  }
  // A reloaded window's context usage from main (init threadUsage): only where nothing newer arrived meanwhile.
  if (action.type === "usage-restore") {
    const missing = Object.entries(action.usage || {}).filter(([id, usage]) => usage && typeof usage === "object" && !state.usage?.[id]);
    return missing.length ? { ...state, usage: { ...state.usage, ...Object.fromEntries(missing) } } : state;
  }
  // R4f-error fix: 2.42304.0 c06cf64bb clearError(id) (cc43287c9 n_: b_ calls it before lz, N_ before it announces) — the thread-wide
  // error and its errorKilledTurn, as the bucket's error; a turn's own TurnError (turnErrors) stays, as the original's
  // in-transcript error row does.
  if (action.type === "clear-error") {
    if (!state.errors?.[action.id] && !state.errorKilledTurn?.[action.id]) return state;
    return { ...state, errors: { ...state.errors, [action.id]: null }, errorKilledTurn: { ...state.errorKilledTurn, [action.id]: false } };
  }
  if(action.type==='backgroundReadStarted'){
    if(action.connectionId!==state.approvalConnectionId)return state;
    const processes=Object.fromEntries((state.items[action.id]||[]).filter(item=>item.type==='commandExecution'&&item.processId).map(item=>[item.id,item.processId]));
    return {...state,backgroundReads:{...state.backgroundReads,[action.id]:{requestId:action.requestId,connectionId:action.connectionId,processes}}};
  }
  if(action.type==='backgroundSnapshot'){
    if(action.connectionId!==state.approvalConnectionId)return state;
    const read=state.backgroundReads?.[action.id];
    if(action.requestId!==undefined&&(read?.requestId!==action.requestId||read.connectionId!==action.connectionId))return state;
    // Membership applies only to commands already observed when this request
    // began. A later item/started must not be negated by an older empty list.
    const coveredProcesses=action.requestId!==undefined?read.processes:Object.fromEntries((state.items[action.id]||[]).filter(item=>item.type==='commandExecution'&&item.processId).map(item=>[item.id,item.processId]));
    const backgroundReads={...state.backgroundReads};
    if(action.requestId!==undefined)delete backgroundReads[action.id];
    for(const thread of action.snapshot.children||[])state=startThread(state,thread);
    return {...state,backgroundReads,background:{...state.background,[action.id]:{connectionId:action.connectionId,coveredProcesses,terminals:action.snapshot.terminals,knownTerminals:{...(state.background?.[action.id]?.connectionId===action.connectionId?state.background[action.id].knownTerminals:{}),...Object.fromEntries((action.snapshot.terminals||[]).map(t=>[t.itemId,t]))},error:action.snapshot.errors?.join('\n')||null}}};
  }
  if (action.type === "hydrate") return hydrate(state, action);
  const e = action.event;
  if (!e) return state;
  if(['turn/started','turn/completed'].includes(e.method)&&e.params?.turn&&e.params.threadId){const turn=e.params.turn,id=e.params.threadId,old=state.taskTurnFacts?.[id];
    if(e.method==='turn/started'||!old||old.id===turn.id)state={...state,taskTurnFacts:{...state.taskTurnFacts,[id]:{id:turn.id,startedAt:turn.startedAt,completedAt:turn.completedAt,durationMs:turn.durationMs}}};
    state=withTurnTimes(state,id,[turn]);
  }
  const agentLifecycle = observeAgentEvent(state.agentLifecycle, e, state.active);
  if (agentLifecycle !== state.agentLifecycle) state = { ...state, agentLifecycle };
  if (e.kind === "session-operation") {
    if (e.connectionId !== state.approvalConnectionId || e.connectionEpoch !== state.approvalConnectionEpoch) return state;
    return {...state, operations:{...state.operations, [e.threadId]:e}};
  }
  const approvalUpdate = reduceApprovalTransport(state, e);
  if (approvalUpdate !== undefined) return approvalUpdate;
  // A new connection re-sends its notices (configWarning at initialize), so the old ones go with the old connection.
  if (e.kind === "connection" && !e.connected)
    return { ...state, notices: [], turnStats:{}, retrying:{}, backgroundStarts:{}, backgroundReads:{}, agentLifecycle: Object.fromEntries(Object.entries(state.agentLifecycle || {}).map(([id, entry]) => [id, {...entry, status:"unknown", completedObservedAt:null}])), active: {}, itemPhases: retainCompletedItemPhases(state.itemPhases), activeVersions: Object.fromEntries([...new Set([...Object.keys(state.active), ...Object.keys(state.items), ...Object.keys(state.activeVersions || {})])].map(id => [id, (state.activeVersions?.[id] || 0) + 1])), items: Object.fromEntries(Object.entries(state.items).map(([id, list]) => [id, list.map(item => ["inProgress", "running"].includes(item.status) ? { ...item, status: "interrupted", [connectionInterrupted]: true } : item)])) };
  const p = e.params || {},
    id = p.threadId;
  // deprecationNotice carries no threadId and thread/started only carries the
  // Thread, so both are reduced before the per-thread guard below.
  if (e.method === "deprecationNotice") {
    if (typeof p.summary !== "string" || !p.summary) return state;
    const notices = appendNotice(state.notices, { kind: "deprecation", summary: p.summary, details: p.details ?? null });
    return notices === state.notices ? state : { ...state, notices };
  }
  if (e.method === "warning") {
    if (typeof p.message !== "string" || !p.message) return state;
    if (!id) {
      const notices = appendNotice(state.notices, { kind: "warning", summary: p.message, details: null });
      return notices === state.notices ? state : { ...state, notices };
    }
    const existing = state.warnings[id] || [];
    if (existing.includes(p.message)) return state;
    return { ...state, warnings: { ...state.warnings, [id]: [...existing, p.message].slice(-NOTICE_LIMIT) } };
  }
  // ConfigWarningNotification {summary, details, path?, range?}: a config.toml, rules or project-trust problem
  // that made Codex ignore part of the user's configuration (no threadId).
  if (e.method === "configWarning") {
    if (typeof p.summary !== "string" || !p.summary) return state;
    const line = Number.isInteger(p.range?.start?.line) ? p.range.start.line + 1 : null;
    const notices = appendNotice(state.notices, { kind: "config", summary: p.summary, details: typeof p.details === "string" && p.details ? p.details : null,
      ...(typeof p.path === "string" && p.path ? { path: p.path } : {}), ...(line ? { line } : {}) });
    return notices === state.notices ? state : { ...state, notices };
  }
  if (e.method === "thread/started") return startThread(state, p.thread);
  if (!id) return state;
  // Codex's ModelSafetyBufferingUpdatedNotification {threadId, turnId, model, showBufferingUi, fasterModel}: a request
  // held for extra checks (tui chatwidget/safety_buffering.rs). Shown until the answer starts streaming or the turn ends.
  if (e.method === "model/safetyBuffering/updated") {
    const text = (value) => (typeof value === "string" && value ? value : null);
    const entry = p.showBufferingUi === true ? { turnId: text(p.turnId), model: text(p.model), fasterModel: text(p.fasterModel) } : null;
    return { ...state, safetyBuffering: { ...state.safetyBuffering, [id]: entry } };
  }
  if (state.safetyBuffering?.[id] && (e.method === "item/agentMessage/delta" || e.method === "turn/completed" || e.method === "turn/started"))
    state = { ...state, safetyBuffering: { ...state.safetyBuffering, [id]: null } };
  {
    const notice = threadNotice(e.method, p);
    if (notice) {
      const list = state.threadNotices?.[id] || [], next = appendNotice(list, notice);
      return next === list ? state : { ...state, threadNotices: { ...state.threadNotices, [id]: next } };
    }
  }
  if (e.method === "item/autoApprovalReview/started" || e.method === "item/autoApprovalReview/completed") {
    if (typeof p.reviewId !== "string" || !p.reviewId || !p.review) return state;
    const old = state.autoReviews?.[id]?.[p.reviewId];
    const review = { reviewId: p.reviewId, turnId: p.turnId ?? old?.turnId ?? null, targetItemId: typeof p.targetItemId === "string" ? p.targetItemId : old?.targetItemId ?? null,
      status: p.review.status || (e.method.endsWith("completed") ? "approved" : "inProgress"), riskLevel: p.review.riskLevel ?? null,
      rationale: typeof p.review.rationale === "string" ? p.review.rationale : null, action: p.action ?? old?.action ?? null,
      // Kept for 'Approve once' (thread/approveGuardianDeniedAction rebuilds Codex's GuardianAssessmentEvent from them).
      userAuthorization: p.review.userAuthorization ?? old?.userAuthorization ?? null, decisionSource: p.decisionSource ?? old?.decisionSource ?? null,
      startedAtMs: Number.isFinite(p.startedAtMs) ? p.startedAtMs : old?.startedAtMs ?? null, completedAtMs: Number.isFinite(p.completedAtMs) ? p.completedAtMs : null };
    let next = { ...state, autoReviews: { ...state.autoReviews, [id]: { ...state.autoReviews?.[id], [p.reviewId]: review } } };
    // A review with no target item (network access) has no row to annotate: a denial becomes a thread notice.
    if (!review.targetItemId && review.status === "denied") {
      const list = next.threadNotices?.[id] || [];
      const host = review.action?.type === "networkAccess" ? review.action.host || review.action.target || "" : "";
      next = { ...next, threadNotices: { ...next.threadNotices, [id]: appendNotice(list, host ? { kind: "autoReviewDenied", summary: AUTO_REVIEW_DENIED_HOST, details: review.rationale, values: { host }, reviewId: review.reviewId } : { kind: "autoReviewDenied", summary: AUTO_REVIEW_DENIED, details: review.rationale, reviewId: review.reviewId }) } };
    }
    return next;
  }
  if (e.method === "thread/goal/updated") {
    if (!p.goal || typeof p.goal.objective !== "string") return state;
    return { ...state, goals: { ...state.goals, [id]: { ...p.goal, threadId: id } } };
  }
  if (e.method === "thread/goal/cleared") {
    if (!state.goals?.[id]) return state;
    const goals = { ...state.goals }; delete goals[id];
    return { ...state, goals };
  }
  if (e.method === "thread/name/updated") {
    const name = typeof p.threadName === "string" ? p.threadName.trim() : "";
    if (!name || state.threadNames?.[id] === name) return state;
    return { ...state, threadNames: { ...state.threadNames, [id]: name } };
  }
  if (e.method === "hook/started" || e.method === "hook/completed") {
    const run = p.run;
    if (!run || typeof run.id !== "string") return state;
    let next = { ...state, hookRuns: { ...state.hookRuns, [id]: { ...state.hookRuns?.[id], [run.id]: { ...run, turnId: p.turnId ?? null } } } };
    // A hook that blocked or failed changed what the agent did: say so (its message, else its warnings and errors).
    if (e.method === "hook/completed" && ["blocked", "failed"].includes(run.status)) {
      const entries = (Array.isArray(run.entries) ? run.entries : []).filter((entry) => ["error", "warning", "stop", "feedback"].includes(entry?.kind) && typeof entry.text === "string" && entry.text.trim()).map((entry) => entry.text.trim());
      const details = [typeof run.statusMessage === "string" ? run.statusMessage.trim() : "", ...entries].filter(Boolean).join("\n") || null;
      const list = next.threadNotices?.[id] || [];
      next = { ...next, threadNotices: { ...next.threadNotices, [id]: appendNotice(list, { kind: run.status === "blocked" ? "hookBlocked" : "hookFailed",
        summary: run.status === "blocked" ? HOOK_BLOCKED : HOOK_FAILED, details, values: { event: hookEventName(run.eventName) } }) } };
    }
    return next;
  }
  const items = state.items[id] || [];
  // Codex retrying (ErrorNotification willRetry:true) ends as soon as the
  // stream shows progress again or the turn changes.
  if (state.retrying?.[id] && (e.method === "turn/started" || e.method === "turn/completed" || String(e.method).startsWith("item/")))
    state = { ...state, retrying: { ...state.retrying, [id]: null } };
  if (e.method === "thread/status/changed") {
    if (!p.status) return state;
    return { ...state, threadStatus: { ...state.threadStatus, [id]: p.status },
      threads: { ...state.threads, [id]: { ...state.threads[id], id, status: p.status } } };
  }
  // FileChangePatchUpdatedNotification {threadId, turnId, itemId, changes}:
  // the server replaces the whole change set, it is not a delta.
  //
  // Both this and the progress notification below UPDATE an item and never
  // create one. They can outrun item/started (the same race the delta branch
  // handles with deltaOnlyFields), and a synthesized row would carry no
  // lifecycle status, which source-session.jsx:100 outcome() reads as "done":
  // the transcript would show a settled "Edited / N files" step for a patch the
  // model is still revising, or a settled "Used Tool" step whose label is the
  // literal fallback string because a progress payload carries no server/tool.
  // Nothing is lost by waiting: item/started carries the authoritative
  // FileChangeItem (changes included), and progressMessage is state-only.
  if (e.method === "item/fileChange/patchUpdated") {
    if (!Array.isArray(p.changes) || !items.some((item) => item.id === p.itemId)) return state;
    return { ...state, items: { ...state.items, [id]: upsertItem(items, p.itemId,
      (item) => ({ ...item, changes: p.changes })) } };
  }
  // McpToolCallProgressNotification {threadId, turnId, itemId, message}: a
  // local observation of the running call, never serialized back to Codex.
  if (e.method === "item/mcpToolCall/progress") {
    if (typeof p.message !== "string" || !items.some((item) => item.id === p.itemId)) return state;
    return { ...state, items: { ...state.items, [id]: upsertItem(items, p.itemId,
      (item) => ({ ...item, progressMessage: p.message })) } };
  }
  if (e.method === "turn/started")
    return {
      ...state,
      turnStats: { ...state.turnStats, [id]: beginTurnStats(state.turnStats?.[id], p.turn) },
      active: { ...state.active, [id]: p.turn.id },
      activeVersions: nextActiveVersion(state, id),
      errors: { ...state.errors, [id]: null },
    };
  if (e.method === "turn/completed") {
    // Inline review has an observed nested active ID and an outer completion
    // ID (session-operations owns that association). Only that exact pair may
    // settle a different active ID; an unrelated old turn must still be ignored.
    const operation = state.operations?.[id];
    const associatedReview = operation?.operation === "review" && operation.turnId === p.turn.id && operation.activeTurnId === state.active[id];
    const newerTurn = state.active[id] && state.active[id] !== p.turn.id && !associatedReview;
    // A proposed plan cut off mid-stream (item/plan/delta with no item/completed)
    // is partial: it must not read as a finished plan ready to implement.
    const cutPlan = (item) => item.type === "plan" && item.status === undefined && (p.turn.status === "interrupted" || p.turn.error)
      && state.itemPhases?.[id]?.[item.id] === "streaming";
    return {
      ...state,
      items: { ...state.items, [id]: items.map(item =>
        (["inProgress", "running"].includes(item.status) || item[connectionInterrupted] || cutPlan(item)) && (!item.turnId || item.turnId === p.turn.id)
          ? settleObservedItem(item, p.turn.status === "interrupted" ? "interrupted" : p.turn.error ? "failed" : "completed")
          : item,
      ) },
      active: newerTurn ? state.active : { ...state.active, [id]: null },
      activeVersions: newerTurn ? state.activeVersions : nextActiveVersion(state, id),
      // A failed Turn keeps its TurnError on that turn (scroll-messages error
      // item); only an error without a turn identity stays thread-wide.
      turnErrors: p.turn.error && p.turn.id
        ? { ...state.turnErrors, [id]: { ...state.turnErrors?.[id], [p.turn.id]: normalizeTurnError(p.turn.error) } } : state.turnErrors,
      // When a live failure arrived (turnErrorAt), so a later sign-in can settle an auth card ('Signed in again').
      ...(p.turn.error && p.turn.id ? { turnErrorAt: { ...state.turnErrorAt, [id]: { ...state.turnErrorAt?.[id], [p.turn.id]: Date.now() } } } : {}),
      errors: newerTurn ? state.errors : { ...state.errors, [id]: p.turn.error && !p.turn.id ? normalizeTurnError(p.turn.error) : null },
      errorKilledTurn: newerTurn ? state.errorKilledTurn : { ...state.errorKilledTurn, [id]: !!(p.turn.error && !p.turn.id) }, // R4f-error E5: an id-less failed turn/completed ended a running turn (retry-turn-model)
    };
  }
  // ErrorNotification {error, willRetry, threadId, turnId}. willRetry:true is
  // classic Y5 apiRetry: the status row says "Retrying…", never an error card.
  // The DeepSeek bridge adds `retry {attempt, maxRetries}` ("Retrying (n/max)").
  if (e.method === "error") {
    if (p.willRetry === true) {
      const count = (value) => Number.isInteger(value) && value > 0 ? value : null;
      // A bridge's codeDesktop {nextAt (ms), action {title, message, label, link}}: OpenCode's retry, which can wait
      // hours for a usage limit, says when it tries again and what fixes it.
      const extra = p.codeDesktop && typeof p.codeDesktop === "object" ? p.codeDesktop : {};
      const action = extra.action && typeof extra.action === "object" ? extra.action : null;
      return { ...state, retrying: { ...state.retrying, [id]: { turnId: p.turnId || state.active[id] || null,
        message: p.error?.message || "", codexErrorInfo: p.error?.codexErrorInfo ?? null,
        attempt: count(p.retry?.attempt), maxRetries: count(p.retry?.maxRetries),
        nextAt: Number.isFinite(extra.nextAt) ? extra.nextAt : null,
        action: action ? { title: typeof action.title === "string" ? action.title : null, message: typeof action.message === "string" ? action.message : null,
          label: typeof action.label === "string" ? action.label : null, link: typeof action.link === "string" && /^https?:\/\//i.test(action.link) ? action.link : null } : null } } };
    }
    const error = normalizeTurnError(p.error || {});
    if (p.turnId) return { ...state, retrying: { ...state.retrying, [id]: null },
      turnErrorAt: { ...state.turnErrorAt, [id]: { ...state.turnErrorAt?.[id], [p.turnId]: Date.now() } },
      turnErrors: { ...state.turnErrors, [id]: { ...state.turnErrors?.[id], [p.turnId]: error } } };
    // A thread-wide failure keeps its TurnError shape for the transcript-tail card.
    return { ...state, retrying: { ...state.retrying, [id]: null }, errors: { ...state.errors, [id]: error },
      errorKilledTurn: { ...state.errorKilledTurn, [id]: !!state.active[id] || (!!state.errors?.[id] && state.errorKilledTurn?.[id] === true) } }; // R4f-error E5: c06cf64bb errorKilledTurn (pendingTurn!==null||errorKilledTurn)
  }
  if (e.method === "turn/plan/updated")
    return { ...state, plans: { ...state.plans, [id]: p.plan }, planMarks: { ...state.planMarks, [id]: planMarkFromUpdate(p.turnId, items) } }; // R4i-transcript TR1: the turn box plan mark (c1ebb1aa4 Rt places the plan write)
  if (e.method === "turn/diff/updated")
    return { ...state, diffs: { ...state.diffs, [id]: p.diff } };
  if (e.method === "thread/tokenUsage/updated") {
    const compacted = withCompactionAfter(items, p, state.active[id]);
    return { ...state, usage: { ...state.usage, [id]: p.tokenUsage },
      ...(compacted !== items ? { items: { ...state.items, [id]: compacted } } : {}),
      turnStats: { ...state.turnStats, [id]: updateTurnUsage(state.turnStats?.[id], p, state.active[id]) } };
  }
  if (e.method === "item/started" || e.method === "item/completed") {
    const found = items.findIndex((i) => i.id === p.item.id);
    const next = items.slice();
    // ItemStartedNotification.startedAtMs / ItemCompletedNotification.completedAtMs
    // are lifecycle timestamps on the NOTIFICATION, not on ThreadItem. The
    // running Run-a-command footer counts from startedAtMs (official KE reads
    // the tool call's startedAt, approval-current.js:2909-2914), so it is kept
    // as a local observation and never sent back to Codex.
    // A thought ends at its first completion: the DeepSeek bridge closes it at
    // the block end and completes it again when the whole step commits, which
    // must not stretch "Thought for Ns". A restart (item/started) reopens it.
    const thought = p.item.type === "reasoning";
    const lifecycle = e.method === "item/started"
      ? (Number.isFinite(p.startedAtMs) ? { startedAtMs: p.startedAtMs } : {})
      : (Number.isFinite(p.completedAtMs) && !(thought && Number.isFinite(items[found]?.completedAtMs)) ? { completedAtMs: p.completedAtMs } : {});
    const item = { ...p.item, ...lifecycle, ...(p.item.type === "contextCompaction" ? {status:e.method === "item/started" ? "inProgress" : "completed"} : {}), turnId: p.turnId || state.active[id] || items[found]?.turnId };
    // A compaction remembers how full the context was when it started (the session's last thread/tokenUsage), so its
    // marker can say what it saved once the core re-sends the usage (withCompactionAfter). A local observation only.
    if (p.item.type === "contextCompaction" && e.method === "item/started" && !Number.isFinite(items[found]?.preTokens)) {
      const before = contextTokens(state.usage[id]);
      if (before > 0) item.preTokens = before;
    }
    if (found < 0) next.push(item);
    else next[found] = { ...next[found], ...item };
    if (thought && e.method === "item/started") delete next[found < 0 ? next.length - 1 : found].completedAtMs;
    delete next[found < 0 ? next.length - 1 : found][connectionInterrupted];
    if (e.method === "item/completed") delete next[found < 0 ? next.length - 1 : found][deltaOnlyFields];
    let backgroundStarts=state.backgroundStarts;
    if(p.item.type==='commandExecution'){
      const starts={...state.backgroundStarts?.[id]};
      if(e.method==='item/started'&&p.item.processId)starts[p.item.id]={processId:p.item.processId,connectionId:state.approvalConnectionId};
      else delete starts[p.item.id];
      backgroundStarts={...state.backgroundStarts,[id]:starts};
    }
    return { ...state, items: { ...state.items, [id]: next },
      backgroundStarts,
      ...(e.method === "item/completed" && p.item.type === "plan" && typeof p.item.text === "string" && p.item.text
        ? { planDocs: withPlanDocument(state.planDocs, id, p.item) } : {}),
      itemPhases: observeItemPhase(state, id, p.item.id, e.method === "item/completed" ? "completed" : "streaming") };
  }
  if (e.method === "item/reasoning/summaryPartAdded") {
    const at = items.findIndex((i) => i.id === p.itemId);
    const sectioned = at < 0 ? null : withSummarySection(items[at], p.summaryIndex);
    if (!sectioned || sectioned === items[at]) return state;
    const next = items.slice();
    next[at] = sectioned;
    return { ...state, items: { ...state.items, [id]: next } };
  }
  // TerminalInteractionNotification {threadId, turnId, itemId, processId, stdin}: Codex typed into, or (empty stdin) waited
  // on, a running unified-exec process. Typed input joins the command item's terminalInputs ('Sent input' lines); a wait
  // marks the item so the status row reads 'Waiting for <command>' until something else happens (Codex tui
  // chatwidget/command_lifecycle.rs: 'Interacted with background terminal' / 'Waiting for background terminal').
  if (e.method === "item/commandExecution/terminalInteraction") {
    const at = items.findIndex((i) => i.id === p.itemId);
    if (at < 0 || typeof p.stdin !== "string") return state;
    const next = items.slice(), item = { ...items[at] };
    if (p.stdin) {
      item.terminalInputs = [...(Array.isArray(item.terminalInputs) ? item.terminalInputs : []), p.stdin].slice(-50);
      delete item.terminalWaitingAt;
    } else item.terminalWaitingAt = Date.now();
    next[at] = item;
    return { ...state, items: { ...state.items, [id]: next } };
  }
  // PlanDeltaNotification {threadId, turnId, itemId, delta} (EXPERIMENTAL): the
  // proposed plan streams into the plan item's text like an answer does (codex
  // TUI on_plan_delta). item/completed's PlanItem.text replaces it, since Codex
  // warns the deltas may not add up to the completed plan.
  const planDelta = e.method === "item/plan/delta";
  const field =
    e.method === "item/agentMessage/delta" || planDelta
      ? "text"
      : e.method === "item/commandExecution/outputDelta"
        ? "aggregatedOutput"
        : e.method === "item/reasoning/summaryTextDelta"
          ? "reasoningText"
          // Raw reasoning (ReasoningTextDeltaNotification): shown only while there is no summary (reasoningText()).
          : e.method === "item/reasoning/textDelta"
            ? "rawReasoningText"
            : null;
  if (field) {
    const next = items.slice();
    let at = next.findIndex((i) => i.id === p.itemId);
    if (at < 0) {
      at = next.length;
      next.push({
        id: p.itemId,
        [deltaOnlyFields]: [field],
        turnId: p.turnId || state.active[id],
        type:
          planDelta
            ? "plan"
            : field === "text"
            ? "agentMessage"
            : field === "reasoningText" || field === "rawReasoningText"
              ? "reasoning"
              : "commandExecution",
      });
    }
    if (field === "reasoningText") next[at] = withSummarySection(next[at], p.summaryIndex);
    next[at] = { ...next[at], [field]: (next[at][field] || "") + p.delta };
    // Output arrived: a wait on this process (terminalInteraction with empty stdin) is over.
    if (field === "aggregatedOutput" && next[at].terminalWaitingAt) delete next[at].terminalWaitingAt;
    return { ...state, items: { ...state.items, [id]: next },
      itemPhases: observeItemPhase(state, id, p.itemId, state.itemPhases?.[id]?.[p.itemId] === "completed" ? "completed" : "streaming") };
  }
  return state;
}
// The latest turn of a thread failed and nothing newer runs: the sidebar's
// "Needs input" bucket keeps its pre-0.2.94 meaning for failed turns.
export function latestTurnError(state, threadId) {
  const errors = state?.turnErrors?.[threadId];
  if (!errors || state.active?.[threadId]) return null;
  const items = state.items?.[threadId] || [];
  for (let index = items.length - 1; index >= 0; index--)
    if (items[index]?.turnId) return errors[items[index].turnId] || null;
  return null;
}
export function userText(item) {
  return (item.content || []).map((c) => c.text || c.path || "").join("\n");
}
