// R4g-routines RT5 (tasks-code-routines WI-5, D32): the host side of the 2.42304.0 Code Routines page
// (src/generated/code-routines). Pure functions over the host scheduler (electron/local-routines.mjs, Code rows only:
// kind 'code') and the renderer's `call`; src/source-code-routines.jsx mounts them around the generated page.
//
//   codeScheduledTask(row)          a local-routines row as the official CCD task (muI2IV6k bv): displayName, cronExpression,
//                                   fireAt, ISO lastRunAt / nextRunAt, cwd, useWorktree / sourceBranch, permissionMode,
//                                   model, missedRuns, approvedPermissions (RT6: the task's Always allowed command rules,
//                                   electron/routine-approvals.mjs). No filePath / fileReadError (the prompt is inline;
//                                   hostGap 5), no place / waiting / jitter / peak-hours fields (no SSH places, no jitter;
//                                   hostGaps 4, 9).
//   codeScheduledTaskRequest(...)   the official create / update payload (c0fd2fda3 sn gt) as a local-routines request.
//   createCodeRoutinesBridge(...)   window["claude.web"].CCDScheduledTasks over local-routines (shared-0 Wx, shared-4 dh).
//   createCodeLocalSessions(...)    the LocalSessions / FileSystem methods the host has: start (Run now through the main
//                                   process runner), getLocalBranches, getDetectedProjects, browseFolder, isGitRepo.
//   codeRoutineSessions(...)        the CCD sessions store rows (shared-8 Q) the detail's History reads.
//   routineHrefTarget(href)         a routines link / router push as the page's selection.
import { sessionArchived, sessionName } from './sidebar-model.js';
import { sessionTimestampMs } from './home-model.mjs';
import { latestTurnError, ownerThreadId } from './state.js';

const has = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : undefined);
const running = (run) => run?.status === 'starting' || run?.status === 'running';

// Official permission mode names (default / acceptEdits / plan / auto / bypassPermissions) and the host's
// (ask / acceptEdits / plan / auto / bypass); hostGap 16.
const HOST_PERMISSION = Object.freeze({ default: 'ask', bypassPermissions: 'bypass' });
const OFFICIAL_PERMISSION = Object.freeze({ ask: 'default', bypass: 'bypassPermissions' });
export const toHostPermission = (mode) => HOST_PERMISSION[mode] ?? mode;
export const toOfficialPermission = (mode) => (mode ? OFFICIAL_PERMISSION[mode] ?? mode : undefined);

// muI2IV6k uPt: {time: string, reason?, detail?, host?}; local-routines persists exactly that shape.
const missedRun = (entry) => (typeof entry?.time === 'string' ? {
  time: entry.time,
  ...(typeof entry.reason === 'string' && { reason: entry.reason }),
  ...(typeof entry.detail === 'string' && { detail: entry.detail }),
} : null);

// R4g-routines RT6 (hostGap 7): the stored rules as the official list (muI2IV6k listedApprovedPermissions: {toolName,
// ruleContent?}), one per official key (`${toolName}\0${ruleContent??""}`, cfc18e0f4 Ve's chip key). The host keeps a
// rule per folder / escalation too; the page removes by the official key. No expiry (no approvalLifetimeDays).
function approvedPermissions(rules) {
  const seen = new Set(), listed = [];
  for (const rule of Array.isArray(rules) ? rules : []) {
    if (typeof rule?.toolName !== 'string' || !rule.toolName) continue;
    const ruleContent = typeof rule.ruleContent === 'string' ? rule.ruleContent : undefined;
    const key = `${rule.toolName}\0${ruleContent ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    listed.push({ toolName: rule.toolName, ...(ruleContent !== undefined && { ruleContent }) });
  }
  return listed;
}

export function codeScheduledTask(row) {
  const permissionMode = toOfficialPermission(row?.options?.permission);
  return {
    id: row.id,
    // rn(e) = displayName ?? DE(id); the host id is a UUID, so the host name is always the display name.
    displayName: row.name,
    description: row.description ?? '',
    prompt: row.prompt,
    enabled: row.enabled === true,
    ...(row.cron && { cronExpression: row.cron }),
    ...(Number.isFinite(row.fireAt) && { fireAt: row.fireAt }),
    createdAt: row.createdAt,
    ...(iso(row.lastRunAt) && { lastRunAt: iso(row.lastRunAt) }),
    ...(iso(row.nextRunAt) && { nextRunAt: iso(row.nextRunAt) }),
    ...(row.options?.model && { model: row.options.model }),
    cwd: row.cwd,
    useWorktree: row.useWorktree === true,
    ...(row.useWorktree === true && row.sourceBranch && { sourceBranch: row.sourceBranch }),
    ...(permissionMode && { permissionMode }),
    missedRuns: (Array.isArray(row.missedRuns) ? row.missedRuns : []).map(missedRun).filter(Boolean),
    approvedPermissions: approvedPermissions(row.approvedPermissions),
  };
}

// The local-routines request for an official create (`previous` undefined) or update payload. The form sends
// { name (slug), displayName, prompt, description, cronExpression, cwd, model, useWorktree, sourceBranch, permissionMode }
// on create and { scheduledTaskId, displayName?, prompt, description, cronExpression? / fireAt?, cwd, model, … } on
// update (c0fd2fda3 gt with Yt / Zt). permissionMode undefined is the picker's "Settings default": the host's current
// permission at save time (the scheduler stores a concrete mode; host difference). model "" / undefined is Default: the
// host's current model.
export function codeScheduledTaskRequest(data, previous, executionProfile = {}) {
  const name = (data.displayName ?? (previous ? previous.name : data.name) ?? '').trim();
  const cron = has(data, 'cronExpression') ? data.cronExpression || '' : previous?.cron ?? '';
  const fireAt = has(data, 'fireAt') ? data.fireAt ?? null : cron ? null : previous?.fireAt ?? null;
  const model = has(data, 'model') ? data.model || executionProfile.model : previous?.options?.model ?? executionProfile.model;
  const permission = has(data, 'permissionMode')
    ? (data.permissionMode ? toHostPermission(data.permissionMode) : executionProfile.permission)
    : previous?.options?.permission ?? executionProfile.permission;
  const folder = data.cwd ?? data.place?.cwd;
  return {
    action: previous ? 'update' : 'create',
    ...(previous ? { id: previous.id } : { kind: 'code' }),
    name,
    ...(has(data, 'description') && { description: data.description ?? '' }),
    prompt: data.prompt ?? previous?.prompt,
    ...(folder && { folder }),
    cron,
    fireAt,
    ...(has(data, 'useWorktree') && { useWorktree: data.useWorktree === true }),
    // useWorktree with no branch is the folder's current branch: '' clears a stored one (local-routines).
    ...(has(data, 'useWorktree') && { sourceBranch: data.useWorktree === true ? data.sourceBranch ?? '' : undefined }),
    execution: { model, permission },
  };
}

// A folder the form picked (Browse, or one of the recent / detected folders) becomes a known workspace root before
// the main process reads its branches or saves it (main.cjs 'folder' with additional + path: realpath, approve).
async function approvedFolder(call, folder) {
  if (typeof folder !== 'string' || !folder) return folder;
  const real = await call('folder', { additional: true, path: folder });
  return typeof real === 'string' && real ? real : folder;
}

// CCDScheduledTasks over local-routines (kind 'code'). `subscribe(handler)` is the renderer's desktop event stream;
// `executionProfile()` the host's current model / permission; `onRows(rows)` receives every list the page reads.
export function createCodeRoutinesBridge({ call, subscribe = () => () => {}, executionProfile = () => ({}), onRows = () => {} }) {
  let rows = [];
  const load = async () => {
    const list = await call('local-routines', { action: 'list', kind: 'code' });
    rows = Array.isArray(list) ? list : [];
    onRows(rows);
    return rows.map(codeScheduledTask);
  };
  const row = async (id) => rows.find((task) => task.id === id) ?? (await load(), rows.find((task) => task.id === id));
  return {
    getAllScheduledTasks: load,
    async createScheduledTask(data) {
      const request = codeScheduledTaskRequest({ ...data, cwd: await approvedFolder(call, data.cwd) }, undefined, executionProfile());
      return codeScheduledTask(await call('local-routines', request));
    },
    async updateScheduledTask(data) {
      const previous = await row(data.scheduledTaskId);
      if (!previous) throw new Error('Scheduled task not found.');
      const cwd = data.cwd && data.cwd !== previous.cwd ? await approvedFolder(call, data.cwd) : data.cwd;
      return codeScheduledTask(await call('local-routines', codeScheduledTaskRequest({ ...data, cwd }, previous, executionProfile())));
    },
    // 'deleted' removes the task (the host keeps the task's sessions; there are no task files, so removeFiles has
    // nothing to remove); 'enabled' / 'disabled' toggle it.
    async updateScheduledTaskStatus(id, status) {
      if (status === 'deleted') await call('local-routines', { action: 'delete', id });
      else if (status === 'enabled' || status === 'disabled') await call('local-routines', { action: 'toggle', id, enabled: status === 'enabled' });
      else return false;
      return true;
    },
    // R4g-routines RT6: the detail's Always allowed chip (official Jc I → removeApprovedPermission(id, toolName, ruleContent)).
    async removeApprovedPermission(id, toolName, ruleContent) {
      await call('local-routines', { action: 'remove-approval', id, toolName, ...(typeof ruleContent === 'string' && { ruleContent }) });
      return true;
    },
    // The scheduler's change event (main.cjs commit → { kind: 'local-routines' }) carries no task; the official list
    // (shared-4 zm) rereads on any event that is not scheduled_task_deleted.
    onOnScheduledTaskEvent(handler) {
      const unsubscribe = subscribe((event) => {
        if (event?.kind === 'local-routines') handler({ type: 'scheduled_task_updated' });
      });
      return typeof unsubscribe === 'function' ? unsubscribe : () => {};
    },
  };
}

// The LocalSessions / FileSystem methods this host has (hostGap 6: no dispatch handshake; the main process runner
// starts the session itself).
export function createCodeLocalSessions({ call }) {
  return {
    // Uc's startLocalSession: Run now is local-routines run, which prepares the folder / worktree and starts the Code
    // session in the main process (routine-runner.mjs). Its launch failures reject with the runner's message, whose
    // [ccdErrorCategory:<cat>] suffix Hc reads (cov11-01). The original's <scheduled-task> message, model, MCP servers
    // and permission options are the task's own here (the runner reads the stored row; hostGap 5).
    async start(options) {
      const id = options?.scheduledTaskId;
      if (!id) throw new Error('Scheduled task not found.');
      const run = await call('local-routines', { action: 'run', id });
      if (run?.status === 'failed') throw new Error(run.error || 'The scheduled task failed to start.');
      return run?.threadId ? { sessionId: run.threadId } : {};
    },
    async getLocalBranches(cwd) {
      const root = await approvedFolder(call, cwd);
      const list = await call('workspace-git-branches', { cwd: root });
      return Array.isArray(list) ? list.filter((name) => typeof name === 'string') : [];
    },
    async getDetectedProjects() {
      const list = await call('detected-projects');
      return Array.isArray(list) ? list : [];
    },
    async browseFolder() {
      const dir = await call('folder', { additional: true });
      return typeof dir === 'string' && dir ? dir : undefined;
    },
    async isGitRepo(cwd) {
      const info = await call('workspace-info', { cwd });
      return info?.isRepo === true;
    },
  };
}

// The CCD sessions store rows (shared-8 Q: { sessionId, scheduledTaskId, isRunning, isArchived, title, createdAt,
// lastActivityAt, error, pendingToolPermissions }) for the Code tasks: every run the scheduler recorded with a session
// (runs[].threadId), plus sessions whose metadata names a task (main.cjs writes sessionMetadata.scheduledTaskId when
// the runner attaches; runs keep the latest 100).
export function codeRoutineSessions(rows, { sessions = [], metadata = {}, state = {} } = {}) {
  const tasks = new Set((rows ?? []).map((task) => task.id));
  const byId = new Map((sessions ?? []).map((session) => [session.id, session]));
  const pending = new Map();
  for (const approval of state.approvals ?? []) {
    const id = ownerThreadId(state, approval.params?.threadId);
    if (!id) continue;
    if (!pending.has(id)) pending.set(id, []);
    pending.get(id).push(approval);
  }
  const out = new Map();
  const add = (sessionId, scheduledTaskId, run) => {
    if (out.has(sessionId)) return;
    const session = byId.get(sessionId);
    const isRunning = running(run) || !!state.active?.[sessionId] || session?.status?.type === 'active';
    const failed = run && (run.status === 'failed' || run.status === 'interrupted');
    const error = failed ? run.error || run.status : (latestTurnError(state, sessionId) ?? state.errors?.[sessionId]) || undefined;
    const createdAt = Number.isFinite(run?.startedAt) ? run.startedAt : session ? sessionTimestampMs(session) || undefined : undefined;
    const lastActivityAt = Number.isFinite(run?.finishedAt) ? run.finishedAt : session ? sessionTimestampMs(session) || createdAt : createdAt;
    out.set(sessionId, {
      sessionId, scheduledTaskId, isRunning, isArchived: !!session && sessionArchived(session),
      ...(session && { title: sessionName(session) }),
      ...(createdAt !== undefined && { createdAt }),
      ...(lastActivityAt !== undefined && { lastActivityAt }),
      ...(error && { error: typeof error === 'string' ? error : error.message ?? String(error) }),
      pendingToolPermissions: pending.get(sessionId) ?? [],
    });
  };
  for (const task of rows ?? []) for (const run of task.runs ?? []) if (run?.threadId) add(run.threadId, task.id, run);
  for (const [sessionId, meta] of Object.entries(metadata ?? {}))
    if (meta?.scheduledTaskId && tasks.has(meta.scheduledTaskId)) add(sessionId, meta.scheduledTaskId);
  return [...out.values()];
}

// The page's model list for the form (shared-1 FP: { id, name }) over the host's models.
export const codeRoutineModels = (models) => (Array.isArray(models) ? models : []).map((model) => ({
  id: model?.model ?? model?.id ?? String(model ?? ''),
  name: model?.displayName ?? model?.name ?? model?.model ?? model?.id ?? String(model ?? ''),
})).filter((model) => model.id);

// Routines links and router pushes: the Code routines base (shared-52 UP: /code/routines, or /epitaxy/scheduled in the
// desktop shell) and the scheduled-task base (Rc). `{ id }` selects a task ("new-local" is the local create page),
// `{ id: null }` the list; anything else (-1, foreign paths) is not a routines destination.
const ROUTINE_BASES = ['/code/routines', '/epitaxy/scheduled', '/scheduled-task'];
export function routineHrefTarget(href) {
  if (href === -1) return { id: null };
  if (typeof href !== 'string') return null;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, '');
  for (const base of ROUTINE_BASES) {
    if (path === base) return { id: null };
    if (path.startsWith(`${base}/`)) {
      const rest = path.slice(base.length + 1);
      if (!rest || rest.includes('/')) return null;
      try { return { id: decodeURIComponent(rest) }; } catch { return null; }
    }
  }
  return null;
}
