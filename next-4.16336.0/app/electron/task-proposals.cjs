// R4f-proposal WI-4 (analysis/code-ui-migrate-20261017/research/r4-proposal-group-card.md §3, §8): the main-process
// records behind the transcript's inline proposal group card (2.42304.0 c96d752d0 B$, presets-on branch, D10). It keeps
// no file of its own: both records live in config and go out through main.cjs save() and the "sidebar-state" emit.
//
// 1. "started": the session a card's Start / Start all opened gets the proposal lineage on its sessionMetadata, which
//    the card's KZ / c$e read back (`spawnedFrom?.sessionId===e && n.has(spawnedFrom.taskId)` → started, {count}
//    started, the BQ child row). Official F1e passes `spawnedFrom:{sessionId,taskId,title}` to LocalSessions.start
//    (c96d752d0 `x=v.id&&!_?{sessionId:l,taskId:v.id,title:v.title}:void 0`), and startSession, not being a
//    side-session start, clears every side-session flag (asar index.chunk-CFJssAFf.js `e.spawnedFrom&&!r?.
//    sideSessionAuthorized&&(e.spawnedFrom={...e.spawnedFrom,sideSession:!1,wakeParent:!1,sharedCheckout:!1,
//    sharedFolder:!1,handOff:!1,userFork:!1,btw:!1,name:void 0,deletedParent:void 0})`). So the record is that same
//    shape: never a /btw child (btw-sessions.cjs, nested-session-parent-tabs read only sideSession/btw lineage).
// 2. "outcome": the card's result store (c96d752d0 EQ.byParent[parent][taskId] via MQ, cleared by NQ). Official keeps
//    sent_here across reloads (kQ, "epitaxy-suggested-task-sent-here-v1"), a dismissal is persisted by the main queue
//    (popBackgroundTaskSuggestionById → resolvedBackgroundTaskSuggestions, at most 100 per session: B5tintml Ob), and
//    start_failed is only in the renderer's memory (EQ), so a reload offers the task again (notifySpawnedTaskUnstarted).
//    Here: dismissed / sent_here persist in config.taskProposals (at most 100 per parent, Ob's delete-then-set order);
//    start_failed stays in this process's memory (every window sees it; an app restart clears it). kept_here belongs to
//    start_session offers, which the host does not have (D29), so it is refused.
//
// Every change bumps sidebarRevision, saves, and emits {kind:"sidebar-state", state:{...sidebarSnapshot(),
// taskProposals}} (the call returns the same state), so the windows' applySidebarState takes the spawnedFrom write
// with the rest of sessionMetadata and the card reads taskProposals from it; "read" returns that state unchanged.
// A started, dismissed or sent-here task also leaves agent-tools/session.mjs's pending list (settleSuggestion), as
// official popBackgroundTaskSuggestionById takes it out of the queue spawn_task reports.
//
// Payloads (main.cjs case "task-proposals"):
//   {operation:"started", parentId, childId, taskId, title?}        childId = the session the proposal opened
//                                                                    (src/proposal-launch.mjs proposalStartedRequest; sessionId
//                                                                    is read as the same field when childId is absent)
//   {operation:"outcome", parentId, taskId | taskIds, outcome}       outcome: "dismissed" | "sent_here" | "start_failed" | null
//                                                                    (null clears it, NQ); keepExisting: true leaves keys that
//                                                                    already have an outcome or a started session (migration)
//   {operation:"read"}
"use strict";
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// asar index.chunk-B5tintml.js vb.
const TASK_ID = /^task_[0-9a-f]{8}$/;
const PERSISTED = new Set(["dismissed", "sent_here"]);
const IN_MEMORY = new Set(["start_failed"]);
// asar index.chunk-B5tintml.js Ob: `for(let e of r.keys()){if(r.size<=100)break;r.delete(e)}`.
const MAX_OUTCOMES_PER_PARENT = 100;
const MAX_TITLE = 200;
// The flags startSession clears on a lineage that is not a side-session start (CFJssAFf, above).
const NOT_A_SIDE_SESSION = Object.freeze({ sideSession: false, wakeParent: false, sharedCheckout: false, sharedFolder: false,
  handOff: false, userFork: false, btw: false });

const plain = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const validId = (id) => typeof id === "string" && id.length > 0 && id.length <= 512 && !/[\u0000-\u001f]/.test(id);
const knownSessions = (config) => new Set([...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])]);
// The task's title as LocalSessions keeps it (spawn_task: c.trim().slice(0,200)||void 0), on one line.
const proposalTitle = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) : "") || undefined;

/** A session's proposal lineage (not a side session's): {sessionId, taskId}, or null. */
function proposalLineage(meta) {
  const from = meta?.spawnedFrom;
  if (!plain(from) || from.sideSession === true || typeof from.sessionId !== "string" || typeof from.taskId !== "string" || !TASK_ID.test(from.taskId)) return null;
  return { sessionId: from.sessionId, taskId: from.taskId };
}

/** config.taskProposals as stored: parent → {taskId: "dismissed" | "sent_here"}; anything else is not read. */
function persistedOutcomes(config) {
  const stored = plain(config.taskProposals) ? config.taskProposals : {};
  const out = {};
  for (const [parentId, entries] of Object.entries(stored)) {
    if (!validId(parentId) || !plain(entries)) continue;
    const kept = Object.entries(entries).filter(([taskId, outcome]) => TASK_ID.test(taskId) && PERSISTED.has(outcome)).slice(-MAX_OUTCOMES_PER_PARENT);
    if (kept.length) out[parentId] = Object.fromEntries(kept);
  }
  return out;
}

/** What the card reads: parent → {taskId: outcome}, the persisted outcomes with this process's start_failed ones. */
function taskProposalsSnapshot(config, failed = new Map()) {
  const out = persistedOutcomes(config);
  for (const [parentId, entries] of failed) if (entries.size) out[parentId] = { ...out[parentId], ...Object.fromEntries(entries) };
  return out;
}

// Ob: the key moves to the end, then the oldest leave past the cap.
function setCapped(entries, taskId, outcome) {
  delete entries[taskId];
  entries[taskId] = outcome;
  for (const key of Object.keys(entries)) {
    if (Object.keys(entries).length <= MAX_OUTCOMES_PER_PARENT) break;
    delete entries[key];
  }
}

function recordStarted(config, p, isForeign) {
  const { parentId, taskId } = p;
  const childId = p.childId ?? p.sessionId;
  if (p.childId !== undefined && p.sessionId !== undefined && p.childId !== p.sessionId) throw new Error("Unknown session.");
  if (!validId(parentId) || !validId(childId) || parentId === childId) throw new Error("Unknown session.");
  if (typeof taskId !== "string" || !TASK_ID.test(taskId)) throw new Error("Unknown task.");
  // The opened session is a new, listed one; the card's own session may have been archived since.
  if (!knownSessions(config).has(parentId) || !(config.threadIds ?? []).includes(childId)) throw new Error("Unknown session.");
  const metadata = (config.sessionMetadata ??= {});
  for (const id of [parentId, childId]) if (isForeign(id) || (metadata[id]?.surface && metadata[id].surface !== "code")) throw new Error("Unknown session.");
  const current = metadata[childId]?.spawnedFrom;
  if (current !== undefined && current !== null) {
    const lineage = proposalLineage(metadata[childId]);
    // The same report again (a retried call) changes nothing; a session's lineage is never overwritten.
    if (lineage && lineage.sessionId === parentId && lineage.taskId === taskId) return false;
    throw new Error("The session already has a parent session.");
  }
  // One session per proposal (official: a task that is no longer pending can't be started again).
  for (const id of knownSessions(config)) {
    const lineage = id === childId ? null : proposalLineage(metadata[id]);
    if (lineage && lineage.sessionId === parentId && lineage.taskId === taskId) throw new Error(`Task ${taskId} was already started.`);
  }
  // Never a lineage loop: the opened session can't be one the card's session came from.
  for (let cursor = metadata[parentId]?.spawnedFrom?.sessionId, steps = 0; typeof cursor === "string" && steps < 64; cursor = metadata[cursor]?.spawnedFrom?.sessionId, steps++)
    if (cursor === childId) throw new Error("The session already has a parent session.");
  const title = proposalTitle(p.title);
  metadata[childId] = { ...metadata[childId], spawnedFrom: { sessionId: parentId, taskId, ...(title ? { title } : {}), ...NOT_A_SIDE_SESSION } };
  return true;
}

// Returns the [parentId, taskId] pairs the user acted on (they leave spawn_task's pending list).
function recordOutcome(config, failed, p) {
  const { parentId, outcome } = p;
  if (!validId(parentId) || !knownSessions(config).has(parentId)) throw new Error("Unknown session.");
  if (outcome !== null && !PERSISTED.has(outcome) && !IN_MEMORY.has(outcome)) throw new Error("Invalid task outcome.");
  const taskIds = p.taskIds === undefined ? [p.taskId] : p.taskIds;
  if (!Array.isArray(taskIds) || !taskIds.length || taskIds.length > MAX_OUTCOMES_PER_PARENT || taskIds.some((id) => typeof id !== "string" || !TASK_ID.test(id))) throw new Error("Unknown task.");
  // Outcomes of sessions no longer listed are dropped on the way (the store stays bounded by the session list).
  const known = knownSessions(config);
  const stored = persistedOutcomes(config);
  for (const id of Object.keys(stored)) if (!known.has(id)) delete stored[id];
  for (const id of [...failed.keys()]) if (!known.has(id)) failed.delete(id);
  const entries = stored[parentId] ?? {};
  const memory = failed.get(parentId) ?? new Map();
  const started = new Set();
  if (p.keepExisting === true) for (const id of known) {
    const lineage = proposalLineage(config.sessionMetadata?.[id]);
    if (lineage?.sessionId === parentId) started.add(lineage.taskId);
  }
  const settled = [];
  for (const taskId of [...new Set(taskIds)]) {
    if (p.keepExisting === true && (Object.hasOwn(entries, taskId) || memory.has(taskId) || started.has(taskId))) continue;
    // MQ / NQ: one outcome per task.
    delete entries[taskId];
    memory.delete(taskId);
    if (outcome === null) continue;
    if (IN_MEMORY.has(outcome)) { memory.delete(taskId); memory.set(taskId, outcome); while (memory.size > MAX_OUTCOMES_PER_PARENT) memory.delete(memory.keys().next().value); }
    else { setCapped(entries, taskId, outcome); settled.push([parentId, taskId]); }
  }
  if (Object.keys(entries).length) stored[parentId] = entries; else delete stored[parentId];
  if (memory.size) failed.set(parentId, memory); else failed.delete(parentId);
  config.taskProposals = stored;
  return settled;
}

// agent-tools/session.mjs is the module the agent tools host imports (same file URL, so the same pending lists).
async function settleAgentSuggestion(sessionId, taskId) {
  const session = await import(pathToFileURL(path.join(__dirname, "agent-tools", "session.mjs")).href);
  return typeof session.settleSuggestion === "function" ? session.settleSuggestion(sessionId, taskId) : false;
}

/**
 * @param {object} deps
 * @param {() => object} deps.getConfig          main.cjs config
 * @param {() => void} deps.save                 main.cjs save()
 * @param {(event: object) => void} deps.emit    main.cjs emit()
 * @param {() => object} deps.sidebarSnapshot    main.cjs sidebarSnapshot()
 * @param {(id: string) => boolean} [deps.isForeign]  a session another surface runs (Cowork)
 * @param {(sessionId: string, taskId: string) => unknown} [deps.settle]  spawn_task's pending list (tests stub it)
 */
function createTaskProposals({ getConfig, save, emit, sidebarSnapshot, isForeign = () => false, settle = settleAgentSuggestion } = {}) {
  const failed = new Map(); // parentId → Map taskId → "start_failed"
  const state = (config) => ({ ...sidebarSnapshot(), taskProposals: taskProposalsSnapshot(config, failed) });
  function commit(config) {
    config.sidebarRevision = (config.sidebarRevision || 0) + 1;
    save();
    const next = state(config);
    // Every window's card (and the other split side) follows the change.
    emit({ kind: "sidebar-state", state: next });
    return next;
  }
  async function settleAll(pairs) {
    for (const [sessionId, taskId] of pairs) { try { await settle(sessionId, taskId); } catch { /* the pending list is a courtesy to the agent */ } }
  }
  async function run(p = {}) {
    const config = getConfig();
    if (!config) throw new Error("Unknown session.");
    if (p?.operation === "read") return state(config);
    if (p?.operation === "started") {
      if (!recordStarted(config, p, (id) => !!isForeign(id))) return state(config);
      const next = commit(config);
      await settleAll([[p.parentId, p.taskId]]);
      return next;
    }
    if (p?.operation === "outcome") {
      const settled = recordOutcome(config, failed, p);
      const next = commit(config);
      await settleAll(settled);
      return next;
    }
    throw new Error("Unsupported task proposal operation.");
  }
  return { run, snapshot: () => taskProposalsSnapshot(getConfig() ?? {}, failed) };
}

// main.cjs: `case "task-proposals": return require("./task-proposals.cjs").run(p, {...})`; one store per process.
let shared = null;
function run(p, deps) {
  shared ??= createTaskProposals(deps);
  return shared.run(p);
}

module.exports = { createTaskProposals, run, proposalLineage, taskProposalsSnapshot, persistedOutcomes,
  TASK_ID, MAX_OUTCOMES_PER_PARENT, NOT_A_SIDE_SESSION };
