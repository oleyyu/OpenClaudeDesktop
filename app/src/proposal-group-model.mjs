// R4f-proposal P2 (tasks-proposal-group-card WI-2): the host data the 2.42304.0 inline proposal group card (c96d752d0
// R$ / z$ → B$) reads, projected from OpenClaude's own records. Pure functions, no React, no I/O.
//
// The official card reads four things (research/r4-proposal-group-card.md §3):
//   1. the transcript's proposing tool calls: `kind:"tools"` entries whose tools are {id, name, status, isError,
//      rejected, interrupted, input, output}; here a spawn_task call of OpenClaude's own agent tools
//      (electron/agent-tools/session.mjs, an mcpToolCall the core reports as "code_desktop" spawn_task) becomes that
//      record (proposalToolRecord), named mcp__ccd_session__spawn_task (c8479260c `r`);
//   2. the session store's queue `sessions[].backgroundTaskSuggestions` (main process enqueueBackgroundTaskSuggestion);
//      there is no such queue locally, so it is derived from the transcript through agent-tool-titles.mjs
//      suggestedTasks() (read only; dismiss_task withdraws one there) minus the card's results
//      (backgroundTaskSuggestions);
//   3. the children's `spawnedFrom {sessionId, taskId}` (KZ) and the parent's shape (a0e): proposalSessions maps the
//      local session list and config.sessionMetadata onto those records;
//   4. the renderer's result store (EQ.byParent[parent][taskId]): proposalOutcomes normalises the host's copy.
// Plus where the card goes (QL with turnSuggestions: after the turn's tail, PPe naming it) and which tool rows it takes
// over (_K with hostDrawsTurnSuggestions hides every gL call).
//
// The official predicates are re-stated here (pL / hL / gL / mL / PPe of c96d752d0, W of cb27dab29, C / S / h of
// c8479260c) because the generated proposal-group module does not exist yet; tests/proposal-group-model.test.mjs runs
// the original declarations sliced from the installed chunks side by side with these and asserts the same answers.
import { appToolCall, suggestedTasks } from './agent-tool-titles.mjs';

// c8479260c-DaoJ9_2S.js: e="ccd_session", t="spawn_task", r=`mcp__${e}__${t}`.
export const PROPOSAL_SERVER = 'ccd_session';
export const SPAWN_TASK_TOOL = `mcp__${PROPOSAL_SERVER}__spawn_task`;
// c8479260c S (read by C, imported into c96d752d0 as Nh: the first task_id in a spawn_task result) and h (khe).
const TASK_ID_IN_OUTPUT = /task_id: (task_[0-9a-f]{8})\b/;
export const TASK_ID_PATTERN = /^task_[0-9a-f]{8}$/;
// c96d752d0 MQ / N1e: what the result store records per task (kept_here only answers a start_session offer).
export const PROPOSAL_OUTCOMES = Object.freeze(['dismissed', 'kept_here', 'sent_here', 'start_failed']);
// The 2.2553.1-era floating card's per-viewer list (source-suggested-tasks.jsx readDismissed): dismissed or started ids.
export const LEGACY_DISMISSED_TASKS_PREFIX = 'code-desktop:dismissed-tasks:';

const str = (value) => (typeof value === 'string' ? value : '');
const plainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const idList = (value) => (value instanceof Set ? [...value] : Array.isArray(value) ? value : []).filter((id) => typeof id === 'string');
// The same text agent-tool-titles.mjs resultText reads (suggestedTasks parses the task_id out of it): the call result's
// text parts. A dynamicToolCall's contentItems are not read there either, so neither the queue nor the record sees one.
const resultText = (item) => (Array.isArray(item?.result?.content) ? item.result.content : [])
  .filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('\n');

const RUNNING = new Set(['inProgress', 'running', 'pending']);
const INTERRUPTED = new Set(['interrupted', 'stopped', 'cancelled', 'canceled']);
const records = new WeakMap();

/**
 * The official tool record of a transcript item when it is a spawn_task call of OpenClaude's agent tools, else null.
 * Status: a running call is "running"; a completed one "completed" (isError when its result says so); a failed one
 * "error"; a declined one "error" + rejected; an interrupted one "error" + isError + interrupted (as the official
 * transcript marks a cut-off call: c96d752d0 ZZ `{...e,status:"error",isError:!0,interrupted:!0,output:…}`). The input
 * is the call's own arguments ({title, tldr, prompt, cwd?}); the output its result text. Cached per item object, so an
 * unchanged item keeps its record across renders.
 */
export function proposalToolRecord(item) {
  if (!item || typeof item !== 'object') return null;
  if (records.has(item)) return records.get(item);
  const call = appToolCall(item);
  let record = null;
  if (call?.tool === 'spawn_task' && typeof item.id === 'string' && item.id) {
    const status = str(item.status);
    const errored = item.result?.isError === true || item.success === false || !!item.error;
    const text = resultText(item) || str(item.error?.message) || undefined;
    const base = { id: item.id, name: SPAWN_TASK_TOOL, input: { ...call.args }, output: text };
    if (status === 'completed') record = { ...base, status: 'completed', isError: errored };
    else if (status === 'declined') record = { ...base, status: 'error', isError: true, rejected: true };
    else if (INTERRUPTED.has(status)) record = { ...base, status: 'error', isError: true, interrupted: true };
    else if (status === 'failed') record = { ...base, status: 'error', isError: true };
    else record = { ...base, status: RUNNING.has(status) || !status ? 'running' : status, isError: false };
  }
  records.set(item, record);
  return record;
}

/** c96d752d0 pL for a spawn_task record: a completed, non-error call's task id (c8479260c C), else undefined. */
export function proposalTaskId(record) {
  if (!record || record.status !== 'completed' || record.isError) return undefined;
  return record.name === SPAWN_TASK_TOOL ? str(record.output).match(TASK_ID_IN_OUTPUT)?.[1] : undefined;
}
/** c96d752d0 hL: a call that proposes a task (every spawn_task; start_session own-initiative proposals are not local). */
export const isProposingTool = (record) => record?.name === SPAWN_TASK_TOOL;
/** c96d752d0 gL: a proposing call the card draws (it has its task id). */
export const isPlacedProposal = (record) => isProposingTool(record) && proposalTaskId(record) !== undefined;
/** c96d752d0 mL: the call failed, was rejected or was cut off. */
export const proposalToolFailed = (record) => record?.status === 'error' || record?.isError === true || record?.rejected === true || record?.interrupted === true;

/**
 * c96d752d0 PPe over one entry's tools: {tools, firstProposingCallId}: the first proposing call's id (even one still
 * running or failed) names the row; only placed calls are its tools.
 */
export function proposingTools(list) {
  let tools, first;
  for (const record of Array.isArray(list) ? list : [])
    if (isProposingTool(record)) { first ??= record.id; if (isPlacedProposal(record)) (tools ??= []).push(record); }
  return { tools: tools ?? [], firstProposingCallId: first };
}

/**
 * The turnSuggestions rows of a transcript (c96d752d0 QL with `turnSuggestions:!0`), by turnId: QL collects PPe over a
 * turn's assistant entries and pushes {kind:"turnSuggestions", id:`turnSuggestions:${first}`, tools} after the turn's
 * tail, unless the turn proposed exactly one task and it was sent to this session
 * (`ce.length!==1||t.sentHereSuggestionIds?.includes(pL(ce[0])??"")!==!0`). Here a turn is the items sharing a turnId
 * (the unit editsByTurn and the turn footers use); an item without one is never placed.
 */
export function turnProposals(items, { sentHereSuggestionIds = [] } = {}) {
  const sent = new Set(idList(sentHereSuggestionIds)), turns = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const record = proposalToolRecord(item), turnId = item?.turnId;
    if (!record || typeof turnId !== 'string' || !turnId) continue;
    if (!turns.has(turnId)) turns.set(turnId, []);
    turns.get(turnId).push(record);
  }
  const rows = new Map();
  for (const [turnId, list] of turns) {
    const { tools, firstProposingCallId } = proposingTools(list);
    if (firstProposingCallId === undefined || tools.length === 0) continue;
    if (tools.length === 1 && sent.has(proposalTaskId(tools[0]) ?? '')) continue;
    rows.set(turnId, { kind: 'turnSuggestions', id: `turnSuggestions:${firstProposingCallId}`, turnId, tools });
  }
  return rows;
}

/**
 * Where each turnSuggestions row mounts in the displayed rows: {index → row}, the index of the turn's last displayed
 * row (QL pushes the row right after the turn's tail entry; DE treats the latest entry as the tail while the turn
 * still runs). Rows are the transcript's display list (a tool group carries its first member's turnId).
 */
export function proposalAnchors(rows, proposals) {
  const anchors = new Map(), seen = new Set();
  if (!(proposals instanceof Map) || proposals.size === 0) return anchors;
  const list = Array.isArray(rows) ? rows : [];
  for (let index = list.length - 1; index >= 0; index--) {
    const turnId = list[index]?.turnId;
    if (typeof turnId !== 'string' || seen.has(turnId) || !proposals.has(turnId)) continue;
    seen.add(turnId);
    anchors.set(index, proposals.get(turnId));
  }
  return anchors;
}

/**
 * The tool rows the card takes over (c96d752d0 _K: `t.hostDrawsTurnSuggestions===!0&&gL(e)` hides the call, JGe adds
 * it to the hidden set before grouping): every placed spawn_task call with a turnId, the ones turnProposals places.
 * A call still running or failed stays a tool row. Only applies while the host draws the inline card.
 */
export function proposalCardToolIds(items) {
  const ids = new Set();
  for (const item of Array.isArray(items) ? items : [])
    if (typeof item?.turnId === 'string' && item.turnId && isPlacedProposal(proposalToolRecord(item))) ids.add(item.id);
  return ids;
}
export const isProposalCardTool = (item) => typeof item?.turnId === 'string' && !!item.turnId && isPlacedProposal(proposalToolRecord(item));

/** c96d752d0 bL / OPe: every task id the loaded transcript's tool calls carry (pL). */
export function transcriptTaskIds(items) {
  const ids = new Set();
  for (const item of Array.isArray(items) ? items : []) { const id = proposalTaskId(proposalToolRecord(item)); if (id) ids.add(id); }
  return ids;
}

/**
 * The result store's entries for one parent ({taskId → outcome}, EQ.byParent[parent]), from the host's copy: either
 * {taskId: outcome} or {taskId: {outcome, …}}. Unknown outcomes and malformed task ids are dropped.
 */
export function proposalOutcomes(raw) {
  const out = {};
  if (!plainObject(raw)) return out;
  for (const [taskId, value] of Object.entries(raw)) {
    const outcome = typeof value === 'string' ? value : plainObject(value) ? value.outcome : undefined;
    if (TASK_ID_PATTERN.test(taskId) && PROPOSAL_OUTCOMES.includes(outcome)) out[taskId] = outcome;
  }
  return out;
}
/** The feed's sentHereSuggestionIds: the tasks sent to this session (the sent_here results). */
export const sentHereTaskIds = (outcomes) => Object.entries(proposalOutcomes(outcomes)).flatMap(([id, outcome]) => (outcome === 'sent_here' ? [id] : []));

/**
 * The tasks a session's proposals started (KZ's `spawnedFrom?.sessionId===e&&n.has(t.spawnedFrom.taskId)`), from the
 * local session metadata (main writes spawnedFrom {sessionId, taskId, proposal} on the child). Read from metadata
 * rather than the listed sessions, so a started task never comes back as proposed while its child's row is not listed.
 */
export function startedTaskIds(metadata, parentId) {
  const ids = new Set();
  if (!plainObject(metadata) || typeof parentId !== 'string' || !parentId) return ids;
  for (const [childId, meta] of Object.entries(metadata)) {
    const from = meta?.spawnedFrom;
    if (childId !== parentId && from?.sessionId === parentId && typeof from.taskId === 'string' && TASK_ID_PATTERN.test(from.taskId)) ids.add(from.taskId);
  }
  return ids;
}

/**
 * The parent's `backgroundTaskSuggestions` queue, oldest first, at most 20 (main Db appends and evicts the oldest past
 * 20). Main's spawn_task enqueues {id, title, prompt, tldr, cwd} with createdAt (index.chunk-B5tintml.js
 * enqueueBackgroundTaskSuggestion; no toolUseId: that is a start_session offer's), and pops an entry when it is
 * dismissed, started or sent here. Here: the transcript's open suggestions (suggestedTasks, which dismiss_task already
 * withdraws), less every task with a result, every task a child session started and `withdrawn` (ids put away without a
 * result, e.g. the legacy card's list). createdAt is when the call finished (suggestedAt).
 */
export function backgroundTaskSuggestions(items, { outcomes = {}, startedTaskIds: started = [], withdrawn = [] } = {}) {
  const removed = new Set([...Object.keys(proposalOutcomes(outcomes)), ...idList(started), ...idList(withdrawn)]);
  return suggestedTasks(items, removed).reverse().map((task) => ({
    id: task.id, ...(task.title ? { title: task.title } : {}), prompt: task.prompt, ...(task.tldr ? { tldr: task.tldr } : {}),
    ...(task.cwd ? { cwd: task.cwd } : {}), ...(Number.isFinite(task.suggestedAt) ? { createdAt: task.suggestedAt } : {}),
  }));
}

/**
 * The unplacedSuggestions row (QL pushes it at the feed's end; cf74bc599 Hx lists it): queued tasks whose task id no
 * loaded tool call carries (bL), not sent here, as {id, title, createdAt}. Null when there are none — always the case
 * for a queue backgroundTaskSuggestions derived from the same items. Hx's time anchoring of such tasks (its `anchored`
 * timed rows) is not applied: the host feed has no timed rows.
 */
export function unplacedSuggestions(queue, items, { sentHereSuggestionIds = [] } = {}) {
  const placed = transcriptTaskIds(items), sent = new Set(idList(sentHereSuggestionIds));
  const tasks = (Array.isArray(queue) ? queue : []).filter((task) => typeof task?.id === 'string' && !placed.has(task.id) && !sent.has(task.id))
    .map(({ id, title, createdAt }) => ({ id, title: title === '' ? undefined : title, createdAt }));
  return tasks.length ? { kind: 'unplacedSuggestions', id: `unplacedSuggestions:${tasks[0].id}`, tasks } : null;
}

// Permission modes: the host's Codex wire values (source-permission-menu.jsx PERMISSION_OPTIONS: auto, ask, acceptEdits,
// plan, bypass) against the official enum (shared-8: default, acceptEdits, plan, auto, bypassPermissions, dontAsk). The
// host has no dontAsk. Same pairs as source-routine-form-adapters.jsx toFormPermission.
const TO_OFFICIAL = Object.freeze({ ask: 'default', acceptEdits: 'acceptEdits', plan: 'plan', auto: 'auto', bypass: 'bypassPermissions' });
const TO_HOST = Object.freeze({ default: 'ask', acceptEdits: 'acceptEdits', plan: 'plan', auto: 'auto', bypassPermissions: 'bypass' });
export const toOfficialPermissionMode = (value) => (Object.hasOwn(TO_OFFICIAL, value) ? TO_OFFICIAL[value] : undefined);
export const toHostPermissionMode = (value) => (Object.hasOwn(TO_HOST, value) ? TO_HOST[value] : undefined);

// The spawnedFrom a session record carries: the local one (btw children: {sessionId, sideSession, userFork, btw,
// sharedCheckout?}; proposal children: {sessionId, taskId, proposal}) with a malformed taskId dropped, so only a real
// proposal child can match KZ.
function officialSpawnedFrom(from) {
  if (!plainObject(from) || typeof from.sessionId !== 'string' || !from.sessionId) return undefined;
  const { taskId, ...rest } = from;
  return typeof taskId === 'string' && TASK_ID_PATTERN.test(taskId) ? { ...rest, taskId } : rest;
}

/**
 * The session store's `sessions[]` the card's hooks read, from the local session list and config.sessionMetadata:
 * sessionId, title, cwd, isArchived, model, effort, spawnedFrom (KZ), originCwd and worktreePath (a0e inWorktree /
 * ownWorktree: main records originCwd on a session it started in a prepared worktree), isScratchWorkspace (the Recent
 * fields), and on the parent its permissionMode and backgroundTaskSuggestions (undefined when empty, as the official
 * store sets it). `parent` is the open session's live composer state ({model, effort, permission, cwd}), which wins over
 * its metadata. The host keeps one permission preference, so other sessions have no permissionMode; branch,
 * sideSessionNeedsWorktree, folderWorktrees and cloudSpawnedTasks have no host source and stay unset. The parent is
 * added when the list does not have it yet.
 */
export function proposalSessions({ sessions = [], metadata = {}, parentId = null, parent = {}, queue = [], fields = null } = {}) {
  const meta = plainObject(metadata) ? metadata : {}, list = Array.isArray(sessions) ? sessions : [];
  const rows = list.filter((session) => typeof session?.id === 'string' && session.id);
  if (typeof parentId === 'string' && parentId && !rows.some((session) => session.id === parentId)) rows.push({ id: parentId });
  return rows.map((session) => {
    const own = session.id === parentId, data = plainObject(meta[session.id]) ? meta[session.id] : {};
    const live = own && plainObject(parent) ? parent : {};
    const cwd = str(live.cwd) || str(session.cwd) || undefined;
    const originCwd = str(data.originCwd) || undefined;
    const model = str(live.model) || str(data.model) || undefined, effort = str(live.effort) || str(data.effort) || undefined;
    const permissionMode = own ? toOfficialPermissionMode(live.permission) : undefined;
    const spawnedFrom = officialSpawnedFrom(data.spawnedFrom);
    const title = str(session.name) || undefined;
    const scratch = plainObject(fields) && fields[session.id]?.isScratchWorkspace === true;
    const tasks = own && Array.isArray(queue) && queue.length > 0 ? [...queue] : undefined;
    return {
      sessionId: session.id, ...(title ? { title } : {}), ...(cwd ? { cwd } : {}), isArchived: session.archived === true || session.isArchived === true,
      ...(model ? { model } : {}), ...(effort ? { effort } : {}), ...(permissionMode ? { permissionMode } : {}),
      ...(spawnedFrom ? { spawnedFrom } : {}), ...(originCwd ? { originCwd } : {}),
      ...(originCwd && cwd && originCwd !== cwd ? { worktreePath: cwd } : {}), ...(scratch ? { isScratchWorkspace: true } : {}),
      ...(tasks ? { backgroundTaskSuggestions: tasks } : {}),
    };
  });
}

/** The legacy floating card's stored list (localStorage LEGACY_DISMISSED_TASKS_PREFIX + sessionId): its task ids. */
export function legacyWithdrawnTaskIds(raw) {
  let list = raw;
  if (typeof raw === 'string') { try { list = JSON.parse(raw); } catch { return []; } }
  return Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === 'string' && TASK_ID_PATTERN.test(id)))].slice(-200) : [];
}
