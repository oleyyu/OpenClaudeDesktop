import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import cron from './schedule-service.cjs';
import { APPROVAL_LIMIT, sameRule, storedRule } from './routine-approvals.mjs';
import { judgeFolder } from './cowork-runtime/folder-policy.mjs';

// w13-coworkfn-schedtools (cwf-28, O-32): a task the scheduled-tasks tools create is stored under the taskId the model
// names (3.6556.2 asar index.chunk-jPKPzV-P.js Hea / Uea: "Kebab-case identifier … Used as the directory name and storage
// key. Auto-sanitized as a safety net."). Tasks the pages create keep their random ids.
export function sanitizeTaskId(value) {
  if (typeof value !== 'string') throw new Error('Invalid task name: must contain at least one alphanumeric character');
  if (value.length > 500) throw new Error('Invalid task name: must be at most 500 characters');
  const id = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').replace(/^[-_]+|[-_]+$/g, '');
  if (!id || !/[a-z0-9]/.test(id)) throw new Error('Invalid task name: must contain at least one alphanumeric character');
  return id.slice(0, 120).replace(/[-_]+$/, '');
}
/** Official _6: a taskId shown as a name ("check-inbox" → "Check inbox"). */
export const taskIdName = id => String(id).replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

// w13-coworkfn-schedtools (cwf-29): a Cowork task's folder access (official LocalAgentModeSessions grantRoutineFolders /
// allowRoutineFolders / revokeRoutineFolderGrant / getRoutineFolderGrant, index.chunk-BtY4LlaK.js): the folders its runs
// may use besides its working folder. The official bounds (N: at most 16 folders, each at most 1024 characters); each
// folder passes folder-policy.mjs judgeFolder (protected locations, the app's own data and Cowork's storage refused).
export const FOLDER_GRANT_LIMIT = 16;
const FOLDER_PATH_LIMIT = 1024;
/** The folders a Cowork task's run session gets: its working folder (unless it is the task's scratch folder) and its grant. */
export function routineFolders(task, dataDir) {
  if (!task || task.kind === 'code') return [];
  const scratch = dataDir ? path.join(dataDir, 'scheduled-tasks') : null;
  const cwd = typeof task.cwd === 'string' && task.cwd && !(scratch && (task.cwd === scratch || task.cwd.startsWith(scratch + path.sep))) ? [task.cwd] : [];
  return [...new Set([...cwd, ...(Array.isArray(task.folders) ? task.folders : [])])];
}

// w13-close-cowork-ui (coworkui-scheduled-01, E59): a Cowork task's instructions folder, as the official scheduler keeps
// one per task (3.6556.2 asar index.chunk-jPKPzV-P.js Lea `join(userData, "scheduled-tasks")`, the task file
// `<base>/<taskId>/SKILL.md` written by Gea(taskId, Kea(description), prompt):
// `---\nname: ${e}\ndescription: ${t}\n${r?`model: ${r}\n`:""}---\n\n${n}`). The list and the detail page offer "Also
// delete the folder that holds this task’s instructions" for every local task (ccd3f68fe ho `J!==null&&du(J)`, ps
// canRemoveFiles); deleting with removeFiles takes the folder away like Ita: only a direct child of the base, named
// /^[a-z0-9_-]+$/, never through a symlink. A task saved without a working folder runs in this folder (its scratch).
export const TASK_FILE = 'SKILL.md';
export function taskFilesDir(dataDir, id) {
  if (typeof dataDir !== 'string' || !dataDir || typeof id !== 'string' || !/^[a-z0-9_-]+$/.test(id)) return null;
  return path.join(dataDir, 'scheduled-tasks', id);
}
const oneLine = value => String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim(); // Kea
/** The official task file text (Gea without a model, as createScheduledTask writes it). */
export const taskFileText = task => `---\nname: ${task.id}\ndescription: ${oneLine(task.description)}\n---\n\n${task.prompt}`;
async function writeTaskFile(dataDir, task) {
  const dir = taskFilesDir(dataDir, task.id);
  if (!dir) return false;
  try {
    await fs.mkdir(dir, { recursive: true });
    if ((await fs.lstat(dir)).isSymbolicLink()) return false;
    await fs.writeFile(path.join(dir, TASK_FILE), taskFileText(task), { mode: 0o600 });
    return true;
  } catch { return false; }
}
/** Ita: remove a task's instructions folder. True when it was removed. */
export async function removeTaskFiles(dataDir, id) {
  const dir = taskFilesDir(dataDir, id);
  if (!dir || path.dirname(dir) !== path.join(dataDir, 'scheduled-tasks')) return false;
  let stat;
  try { stat = await fs.lstat(dir); } catch { return false; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
  try { await fs.rm(dir, { recursive: true, force: true }); return true; } catch { return false; }
}

const running = run => ['starting', 'running'].includes(run.status);
const copy = value => structuredClone(value);
const text = (value, label, max) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Enter ${label} (1–${max} characters).`);
  return value.trim();
};
// Two stores in one config row set (official CCDScheduledTasks and CoworkScheduledTasks); rows saved
// before the Code page existed are Cowork rows.
const KINDS = ['code', 'cowork'];
const kindOf = task => task?.kind === 'code' ? 'code' : 'cowork';
// Official missed-run record (muI2IV6k uPt/cPt): {time:ISO string, reason?, detail?}. The renderer keeps
// recorded skips for 7 days (nra=6048e5); the host persists them, newest first, at most 50 per task.
const MISSED_LIMIT = 50, MISSED_WINDOW = 6048e5;
// git check-ref-format --branch, without spawning git: the scheduler validates before any worktree step.
export function validSourceBranch(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 255 && !name.startsWith('-') && name !== '@'
    && !/[\x00-\x20\x7f~^:?*[\\]/.test(name) && !name.includes('..') && !name.includes('@{') && !name.includes('//')
    && !name.startsWith('/') && !name.endsWith('/') && !name.endsWith('.')
    && name.split('/').every(part => !part.startsWith('.') && !part.endsWith('.lock'));
}

// R4i-routines RI1 (D45): the official local scheduler's dispatch jitter (2.42304.0 asar index.chunk-muI2IV6k.js
// getJitterSecondsForTask). Sy("3300773012","dispatchJitterMaxMinutes",10,…) returns its default without GrowthBook.
export const DISPATCH_JITTER_MAX_MINUTES = 10;
const MINUTE = 6e4;
// Official pra(): a timer that fires more than 5 minutes late is treated as a system wake.
const WAKE_LATENESS = 3e5;

/** Official ita(): the first 4 bytes of sha256(taskId), mod the limit in seconds. */
export function jitterHash(taskId, limit) {
  return limit <= 0 ? 0 : createHash('sha256').update(taskId).digest().readUInt32BE(0) % limit;
}

// The host's cron day rule (schedule-service.cjs nextFire): with both day fields restricted either may match.
function cronMatches(parsed, date) {
  if (!parsed.minute.has(date.getMinutes()) || !parsed.hour.has(date.getHours()) || !parsed.month.has(date.getMonth() + 1)) return false;
  const dom = parsed.dom.has(date.getDate()), dow = parsed.dow.has(date.getDay());
  return parsed.domAny && parsed.dowAny ? true : parsed.domAny ? dow : parsed.dowAny ? dom : dom || dow;
}
const minuteKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;

/**
 * Official Zea(): minutes between the cron's first two occurrences within the `window` minutes after `now`
 * (starting at the next whole minute); null when it fires less than twice in that window.
 */
export function cronIntervalMinutes(expression, { now = Date.now(), window = 60 } = {}) {
  const parsed = cron.parseCron(expression);
  if (!parsed) return null;
  const at = new Date(now);
  at.setUTCSeconds(0, 0); at.setTime(at.getTime() + MINUTE);
  let first = null, key = null;
  for (let step = 0; step < window; step++) {
    if (cronMatches(parsed, at)) {
      if (first === null) { first = new Date(at); key = minuteKey(at); }
      else if (minuteKey(at) !== key) return Math.round((at.getTime() - first.getTime()) / MINUTE);
    }
    at.setTime(at.getTime() + MINUTE);
  }
  return null;
}

/** Official getJitterSecondsForTask(): cron tasks only (fireAt tasks never jitter), capped below the cron's interval. */
export function jitterSecondsForTask(task, { now = Date.now(), maxMinutes = DISPATCH_JITTER_MAX_MINUTES } = {}) {
  if (!(maxMinutes > 0) || !task || task.disableJitter || !task.cron || typeof task.id !== 'string') return 0;
  const interval = cronIntervalMinutes(task.cron, { now });
  const limit = interval === null ? maxMinutes : Math.min(maxMinutes, interval - 1);
  return limit <= 0 ? 0 : jitterHash(task.id, limit * 60);
}

// Desktop routines are durable definitions, unlike the session-only CronCreate tool.
// Missed occurrences are skipped on restart and kept in missedRuns. A wake from sleep dispatches at most one
// occurrence per routine; a still-running routine skips that occurrence altogether.
// confirmFolders({ name, folders }) → Promise<boolean> (w13-close-main-process, E63 coworkfn-schedtools-06): the native
// consent a task's new folders need when the renderer grants them (main.cjs, folder-policy.mjs createRoutineFolderConsent);
// a model's create_scheduled_task already showed them on its card, and a run's "always" answered its own card.
export function createLocalRoutines({ getState, commit, launch, dataDir, approveFolder, confirmFolders = null,
  captureOptions, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, jitterMaxMinutes = DISPATCH_JITTER_MAX_MINUTES }) {
  let timer, disposed = false, started = false;
  // Official _pendingJitterTimeouts: an on-time cron occurrence waits its jitter here; the task keeps its stored
  // deadline (the occurrence) until the delayed dispatch, so a restart during the wait records it as missed.
  const jitters = new Map();
  const jitterOf = task => jitterSecondsForTask(task, { now: now(), maxMinutes: jitterMaxMinutes });
  // Official clearJitterTimeout (disable, schedule change, folder change, disableJitter change, delete, run start).
  const clearJitter = id => { const pending = jitters.get(id); if (!pending) return false; clearTimer(pending.timer); jitters.delete(id); return true; };
  // What the pages read: nextRunAt plus the same jitter (official _Ca), and jitterSeconds.
  const view = task => {
    const jitterSeconds = jitterOf(task);
    return { ...copy(task), jitterSeconds,
      ...(Number.isFinite(task.nextRunAt) && task.cron && jitterSeconds ? { nextRunAt: task.nextRunAt + jitterSeconds * 1000 } : {}) };
  };
  const rows = () => Array.isArray(getState()) ? getState() : [];
  const find = id => { const task = rows().find(task => task.id === id); if (!task) throw new Error('Scheduled task not found.'); return task; };
  const write = next => { commit(next); arm(); };
  const replace = (id, update) => write(rows().map(task => task.id === id ? update(task) : task));
  const following = (task, at) => task.cron ? cron.nextFire(cron.parseCron(task.cron), at) : null;
  // The latest occurrence in [from, to]; `from` is a stored deadline, so it is itself an occurrence.
  function latestDue(task, from, to) {
    const parsed = task.cron && cron.parseCron(task.cron);
    if (!parsed || !(to > from)) return from;
    let at = from;
    if (to - from > MISSED_WINDOW) { const start = cron.nextFire(parsed, to - MISSED_WINDOW - 1); if (start !== null && start <= to) at = start; }
    for (let step = 0; step < 20160; step++) { const next = cron.nextFire(parsed, at); if (next === null || next > to) break; at = next; }
    return at;
  }
  const missed = (task, time, reason, detail) => {
    const at = now(), entry = { time: new Date(time).toISOString(), ...(reason ? { reason } : {}), ...(detail ? { detail } : {}) };
    return [entry, ...(task.missedRuns ?? []).filter(run => run.time !== entry.time)]
      .filter(run => at - new Date(run.time).getTime() <= MISSED_WINDOW).slice(0, MISSED_LIMIT);
  };
  function arm() {
    clearTimer(timer);
    if (!started || disposed) return;
    const next = Math.min(...rows().filter(task => task.enabled && Number.isFinite(task.nextRunAt) && !jitters.has(task.id)).map(task => task.nextRunAt));
    if (!Number.isFinite(next)) return;
    timer = setTimer(() => { void tick(); }, Math.min(2 ** 31 - 1, Math.max(0, next - now())));
    timer?.unref?.();
  }
  function start() {
    if (started || disposed) return;
    started = true;
    const at = now();
    write(rows().map(task => {
      const runs = (task.runs ?? []).map(run => running(run) ? { ...run, status: 'interrupted', finishedAt: at, error: 'The app restarted before this run was confirmed complete.' } : run);
      let nextRunAt = task.enabled ? task.nextRunAt : null, enabled = task.enabled, missedRuns = task.missedRuns;
      if (enabled && (!Number.isFinite(nextRunAt) || nextRunAt <= at)) {
        // Skipped while the app was closed: no reason, as official occurrences that never dispatched.
        if (Number.isFinite(nextRunAt)) missedRuns = missed(task, latestDue(task, nextRunAt, at));
        nextRunAt = following(task, at);
        if (task.fireAt) enabled = false;
      }
      return { ...task, kind: kindOf(task), runs, enabled, nextRunAt, ...(missedRuns ? { missedRuns } : {}) };
    }));
  }
  async function tick() {
    if (disposed) return;
    const at = now(), due = [];
    for (const task of rows()) {
      if (!task.enabled || !Number.isFinite(task.nextRunAt) || task.nextRunAt > at || jitters.has(task.id)) continue;
      // Official p=i||s?0:jitter: an on-time occurrence (qea: the cron matches this minute) waits its jitter; a
      // late catch-up (wake from sleep) dispatches at once.
      const seconds = at - task.nextRunAt < MINUTE ? jitterOf(task) : 0;
      if (seconds > 0) delay(task, seconds); else due.push(task.id);
    }
    // reserve() commits the next deadline before any asynchronous launch work.
    await Promise.allSettled(due.map(id => run(id, 'scheduled')));
    arm();
  }
  function delay(task, seconds) {
    clearJitter(task.id);
    const id = task.id, occurrence = task.nextRunAt, plannedAt = now() + seconds * 1000;
    const pending = { occurrence, plannedAt, timer: null };
    pending.timer = setTimer(() => {
      if (jitters.get(id) !== pending) return;
      jitters.delete(id);
      if (disposed) return;
      const current = rows().find(value => value.id === id);
      // Dropped jitter fire: the task was deleted, disabled or rescheduled while it waited.
      if (!current || !current.enabled || current.nextRunAt !== occurrence) { arm(); return; }
      // Official drops a fire that comes more than 5 minutes late ("post-wake defer") and leaves the occurrence to
      // its wake catch-up; the host has no defer window, so the late fire is that catch-up: run() serves the latest
      // occurrence and records the earlier ones as missed.
      void run(id, 'scheduled').catch(() => null).finally(arm);
    }, seconds * 1000);
    pending.timer?.unref?.();
    jitters.set(id, pending);
  }
  async function run(id, trigger = 'manual') {
    if (disposed) throw new Error('The scheduler is shutting down.');
    const task = find(id), at = now();
    if (trigger === 'scheduled' && (!task.enabled || task.nextRunAt > at)) return null;
    const active = task.runs?.find(running);
    // The occurrence a scheduled run serves; a late timer (sleep) serves only the latest one.
    const due = trigger === 'scheduled' && Number.isFinite(task.nextRunAt) ? latestDue(task, task.nextRunAt, at) : null;
    if (active) {
      if (trigger === 'manual') throw new Error('This task is already running.');
      replace(id, value => ({ ...value, nextRunAt: following(value, at), enabled: value.fireAt ? false : value.enabled, skippedAt: at,
        missedRuns: missed(value, due ?? at, 'per_task_limit') }));
      return null;
    }
    // Official bookTaskRun / markManualStart: a starting run cancels the pending jitter fire; Run now during the
    // wait takes that occurrence (the deadline moves on).
    const tookPending = clearJitter(id) && trigger === 'manual';
    const slept = due !== null && due > task.nextRunAt ? latestDue(task, task.nextRunAt, due - 1) : null;
    const record = { id: randomUUID(), status: 'starting', trigger, startedAt: at };
    const snapshot = copy(task);
    replace(id, value => ({ ...value, lastRunAt: at,
      ...(trigger === 'scheduled' || tookPending ? { nextRunAt: following(value, at), enabled: value.fireAt ? false : value.enabled } : {}),
      ...(slept !== null ? { missedRuns: missed(value, slept) } : {}),
      runs: [record, ...(value.runs ?? [])].slice(0, 100) }));
    function update(patch) {
      if (!rows().some(task => task.id === id)) return;
      replace(id, task => ({ ...task, runs: task.runs.map(run => run.id === record.id && running(run) ? { ...run, ...patch } : run) }));
    }
    try {
      const assertActive = () => {
        if (disposed || !rows().find(task => task.id === id)?.runs.some(run => run.id === record.id && running(run)))
          throw new Error('Scheduled run was stopped before launch.');
      };
      const result = await launch(snapshot, {
        assertActive,
        // Register before turn/start: a quick completion may precede its RPC response.
        attach: threadId => {
          assertActive();
          record.threadId = threadId;
          update({ threadId, status: 'running' });
        },
      });
      if (result?.turnId) update({ turnId: result.turnId });
    } catch (error) {
      const message = error?.message || String(error);
      const current = rows().find(task => task.id === id)?.runs?.find(run => run.id === record.id);
      // A scheduled run that failed before its session existed has nothing in History: record the occurrence.
      if (trigger === 'scheduled' && current && running(current) && !current.threadId)
        replace(id, task => ({ ...task, missedRuns: missed(task, due ?? at, /\[ccdErrorCategory:cwd_not_found\]$/.test(message) ? 'folder_missing' : 'start_failed', message.slice(0, 2000)) }));
      update({ status: 'failed', finishedAt: now(), error: message });
      // Code Run now reports launch failures to the page (official Hc toast); Cowork keeps the run record only.
      if (trigger === 'manual' && kindOf(snapshot) === 'code') throw error instanceof Error ? error : new Error(message);
    }
    return copy(rows().find(task => task.id === id)?.runs.find(run => run.id === record.id) ?? record);
  }
  function observe(event) {
    if (event.kind === 'connection' && event.connected === false) {
      if (rows().some(task => task.runs?.some(running))) write(rows().map(task => ({ ...task,
        runs: task.runs.map(run => running(run) ? { ...run, status: 'interrupted', finishedAt: now(), error: 'The core disconnected before this run was confirmed complete.' } : run) })));
      return;
    }
    if (event.method !== 'turn/completed' || !event.params?.threadId) return;
    const { threadId, turn } = event.params;
    if (!rows().some(task => task.runs?.some(run => running(run) && run.threadId === threadId))) return;
    write(rows().map(task => ({ ...task, runs: task.runs.map(run => running(run) && run.threadId === threadId && (!run.turnId || run.turnId === turn?.id)
      ? { ...run, turnId: turn?.id ?? run.turnId, status: turn?.status === 'completed' ? 'completed' : turn?.status === 'interrupted' ? 'interrupted' : 'failed',
        finishedAt: now(), ...(turn?.error ? { error: turn.error.message ?? String(turn.error) } : {}) } : run) })));
  }
  async function request(p) {
    if (p.action === 'list') return list(p.kind).map(view);
    if (p.action === 'folders') return folderGrant(p.id);
    if (disposed) throw new Error('The scheduler is shutting down.');
    if (p.action === 'grant-folders') return grantFolders(p.id, p.folders, { addOnly: p.addOnly === true, confirm: confirmFolders });
    if (p.action === 'revoke-folder') return view(revokeFolder(p.id, p.folder));
    if (p.action === 'run') return run(p.id);
    if (p.action === 'delete') {
      const task = find(p.id); clearJitter(p.id); write(rows().filter(value => value.id !== p.id));
      // ccd3f68fe updateScheduledTaskStatus(id, "deleted", removeFiles): the instructions folder too, when asked (Cowork).
      if (p.removeFiles === true && kindOf(task) === 'cowork') return { deleted: true, filesRemoved: await removeTaskFiles(dataDir, task.id) };
      return { deleted: true };
    }
    if (p.action === 'remove-approval') return view(removeApproval(p));
    if (p.action === 'toggle') {
      const task = find(p.id);
      if (typeof p.enabled !== 'boolean') throw new Error('Choose whether the task is enabled.');
      if (p.enabled && task.fireAt && task.fireAt <= now()) throw new Error('Choose a future time before enabling this task.');
      if (!p.enabled) clearJitter(task.id);
      // Re-enabling an enabled task with a pending jitter fire keeps that occurrence.
      if (!(p.enabled && jitters.has(task.id)))
        replace(task.id, value => ({ ...value, enabled: p.enabled, nextRunAt: p.enabled ? (value.fireAt ?? following(value, now())) : null, updatedAt: now() }));
      return view(find(task.id));
    }
    if (!['create', 'update'].includes(p.action)) throw new Error('Unknown scheduled task operation.');
    const previous = p.action === 'update' ? find(p.id) : null;
    if (!previous && rows().length >= 100) throw new Error('You can save up to 100 scheduled tasks.');
    const name = text(p.name, 'a task name', 200), prompt = text(p.prompt, 'instructions', 32000);
    const description = p.description === undefined ? previous?.description ?? '' : p.description;
    if (typeof description !== 'string' || description.length > 2000) throw new Error('Description must be no longer than 2000 characters.');
    const expression = typeof p.cron === 'string' ? p.cron.trim() : '';
    if (expression && !cron.parseCron(expression)) throw new Error('Enter a valid five-field cron schedule (minute, hour, day, month, weekday).');
    const fireAt = p.fireAt == null || p.fireAt === '' ? null : Number(p.fireAt);
    if (expression && fireAt !== null) throw new Error('Choose one schedule.');
    const next = expression ? cron.nextFire(cron.parseCron(expression), now()) : fireAt;
    if (expression && next === null) throw new Error('The schedule has no occurrence in the next year.');
    if (fireAt !== null && (!Number.isFinite(fireAt) || (fireAt <= now() && (fireAt !== previous?.fireAt || (p.enabled ?? previous?.enabled) !== false)))) throw new Error('Choose a future time.');
    if (p.enabled !== undefined && typeof p.enabled !== 'boolean') throw new Error('Choose whether the task is enabled.');
    // disableJitter has no form field (official update keeps it when the page omits it); a stored value still applies.
    if (p.disableJitter !== undefined && typeof p.disableJitter !== 'boolean') throw new Error('Choose whether to disable the randomized delay.');
    const kind = previous ? kindOf(previous) : p.kind ?? 'cowork';
    if (!KINDS.includes(kind) || (p.kind !== undefined && p.kind !== kind)) throw new Error(previous ? 'A scheduled task can’t move between Code and Cowork.' : 'Unknown scheduled task kind.');
    // R4i-routines RI2: the task's kind picks the engine its options are captured on (a new Code task never binds to
    // the Cowork engine when CODE_DESKTOP_COWORK=1); a saved task keeps its own options.coreId.
    const options = p.execution === undefined && previous ? previous.options : await captureOptions(p.execution, previous?.options, kind);
    const useWorktree = p.useWorktree === undefined ? previous?.useWorktree === true : p.useWorktree;
    if (typeof useWorktree !== 'boolean') throw new Error('Choose whether to use a worktree.');
    if (useWorktree && kind !== 'code') throw new Error('Worktrees are only available for Code tasks.');
    const branch = p.sourceBranch === undefined ? previous?.sourceBranch : p.sourceBranch || undefined;
    if (useWorktree && branch !== undefined && !validSourceBranch(branch)) throw new Error('Enter a valid branch name.');
    // Official Code form (c0fd2fda3 tn) refuses to save without a folder; no scratch directory for Code.
    if (kind === 'code' && !p.folder && !previous?.cwd) throw new Error('Select a folder.');
    // w13-coworkfn-schedtools: a model-created task's taskId (sanitizeTaskId); an id already in use is refused.
    const id = previous?.id ?? (p.taskId === undefined ? randomUUID() : sanitizeTaskId(p.taskId));
    const taken = () => { if (!previous && rows().some(task => task.id === id)) throw new Error(`A scheduled task with ID "${id}" already exists.`); };
    taken();
    let cwd = previous?.cwd;
    if (p.folder) {
      if (typeof p.folder !== 'string' || !path.isAbsolute(p.folder)) throw new Error('Choose a directory.');
      cwd = p.folder === previous?.cwd ? previous.cwd : approveFolder(p.folder);
      if (!(await fs.stat(cwd)).isDirectory()) throw new Error('Choose a directory.');
    } else if (!cwd) { cwd = path.join(dataDir, 'scheduled-tasks', id); await fs.mkdir(cwd, { recursive: true }); }
    // Re-read after I/O: a concurrent run, pause or deletion must not be overwritten.
    const current = previous ? find(id) : null;
    if (!current && rows().length >= 100) throw new Error('You can save up to 100 scheduled tasks.');
    taken();
    const enabled = p.enabled ?? current?.enabled ?? true;
    // R4g-routines RT6: a task moved to another folder loses its Always allowed rules (official update: `r.moved&&(n.approvedPermissions=void 0)`).
    const { sourceBranch: _branch, ...kept } = current ?? {};
    if (current && current.cwd !== cwd) delete kept.approvedPermissions;
    // Official update clears the jitter fire when the cron, fireAt, folder or disableJitter changes or the task is
    // disabled; any other edit keeps the waiting occurrence. The folder counts only when it really moved (gLi returns
    // a place only when host or cwd differ), so the Code/Cowork forms resending the same folder keep the wait.
    const keepPending = current && jitters.has(id) && enabled && (current.cron ?? null) === (expression || null) && (current.fireAt ?? null) === fireAt
      && current.cwd === cwd && (p.disableJitter === undefined || p.disableJitter === !!current.disableJitter);
    if (current && !keepPending) clearJitter(id);
    const value = { ...kept, id, kind, name, prompt, description: description.trim(), cwd, cron: expression || null, fireAt, options,
      ...(kind === 'code' ? { useWorktree, ...(useWorktree && branch ? { sourceBranch: branch } : {}) } : {}),
      ...(p.disableJitter !== undefined ? { disableJitter: p.disableJitter } : {}),
      enabled, nextRunAt: keepPending ? current.nextRunAt : enabled ? next : null, createdAt: current?.createdAt ?? now(), updatedAt: now(), runs: current?.runs ?? [],
      missedRuns: current?.missedRuns ?? [] };
    write(current ? rows().map(task => task.id === id ? value : task) : [...rows(), value]);
    if (kind === 'cowork') await writeTaskFile(dataDir, value);
    return view(value);
  }
  // R4g-routines RT6 (WI-6): a Code task's Always allowed rules (routine-approvals.mjs). Only main adds one, after the user
  // answered a run's card "Allow for this session"; the page removes them (official removeApprovedPermission: no
  // ruleContent removes every rule of the tool, otherwise the rules with that official key).
  // w13-coworkfn-approvals: a Cowork task's run keeps them too (Dl8 persistAlwaysAllowDecision addApprovedPermissions).
  function rememberApproval(id, rule) {
    const task = rows().find(value => value.id === id), stored = storedRule(rule);
    if (!task || !stored) return false;
    const rules = Array.isArray(task.approvedPermissions) ? task.approvedPermissions : [];
    if (rules.some(value => sameRule(storedRule(value), stored)) || rules.length >= APPROVAL_LIMIT) return false;
    replace(id, value => ({ ...value, approvedPermissions: [...(Array.isArray(value.approvedPermissions) ? value.approvedPermissions : []), { ...stored, approvedAt: now() }] }));
    return true;
  }
  function removeApproval(p) {
    const task = find(p.id);
    if (typeof p.toolName !== 'string' || !p.toolName || (p.ruleContent !== undefined && p.ruleContent !== null && typeof p.ruleContent !== 'string'))
      throw new Error('Choose an approval to remove.');
    const rules = Array.isArray(task.approvedPermissions) ? task.approvedPermissions : [];
    const kept = rules.filter(rule => rule?.toolName !== p.toolName || (p.ruleContent != null && (rule.ruleContent ?? '') !== p.ruleContent));
    if (kept.length === rules.length) return copy(task);
    replace(task.id, value => {
      const { approvedPermissions: _rules, ...rest } = value;
      return kept.length ? { ...rest, approvedPermissions: kept } : rest;
    });
    return copy(find(task.id));
  }
  // w13-coworkfn-schedtools (cwf-29): the Cowork task's folder grant. grant replaces it (official grantRoutineFolders),
  // addOnly adds to it (allowRoutineFolders, O-38: a run's folder request answered "always"); a folder that fails
  // judgeFolder is left out and named in `rejected`. revoke with no folder clears the grant (revokeRoutineFolderGrant).
  // confirm: the consent for the folders the grant adds (BtY4LlaK grantRoutineFolders P(): only folders not granted yet
  // are asked about; declined, the additions are dropped and the removals still apply).
  async function grantFolders(id, folders, { addOnly = false, confirm = null } = {}) {
    const task = find(id);
    if (kindOf(task) !== 'cowork') throw new Error('Folder access is only for Cowork tasks.');
    if (!Array.isArray(folders) || folders.length > FOLDER_GRANT_LIMIT || folders.some(dir => typeof dir !== 'string' || !dir || dir.length > FOLDER_PATH_LIMIT))
      return { granted: [], rejected: [], consentUnavailable: true };
    const granted = [], rejected = [];
    for (const dir of folders) {
      const judged = await judgeFolder(dir, { userData: dataDir });
      if (judged.ok) { if (!granted.includes(judged.canonical)) granted.push(judged.canonical); }
      else rejected.push({ path: dir, message: judged.message });
    }
    // Re-read after I/O: the task may have been deleted meanwhile.
    const current = rows().find(value => value.id === id);
    if (!current) throw new Error('Scheduled task not found.');
    const before = Array.isArray(current.folders) ? current.folders : [];
    let next = [...new Set(addOnly ? [...before, ...granted] : granted)];
    if (next.length > FOLDER_GRANT_LIMIT) return { granted: [], rejected, consentUnavailable: true };
    const added = next.filter(dir => !before.includes(dir));
    if (added.length && typeof confirm === 'function') {
      let allowed = false;
      try { allowed = (await confirm({ name: current.name || taskIdName(current.id), folders: added })) === true; } catch { allowed = false; }
      if (!allowed) {
        next = next.filter(dir => before.includes(dir));
        if (!rows().some(value => value.id === id)) throw new Error('Scheduled task not found.');
        if (next.length !== before.length) replace(id, value => ({ ...value, folders: next, updatedAt: now() }));
        return { granted: granted.filter(dir => before.includes(dir)), rejected, declined: true };
      }
      if (!rows().some(value => value.id === id)) throw new Error('Scheduled task not found.');
    }
    replace(id, value => ({ ...value, folders: next, updatedAt: now() }));
    return { granted, rejected };
  }
  // w13-close-main-process (E63 coworkfn-engine-04): a Cowork task saved for the Cowork VM engine moves to the core Cowork
  // runs on now (routine-runner.mjs migrateTask): only its coreId, model and effort change.
  function migrateOptions(id, options) {
    const task = find(id);
    if (kindOf(task) !== 'cowork' || !options || typeof options.coreId !== 'string' || !options.coreId || typeof options.model !== 'string' || !options.model) return copy(task);
    replace(id, value => ({ ...value, options: { ...value.options, coreId: options.coreId, model: options.model,
      ...(Object.hasOwn(options, 'effort') ? { effort: options.effort ?? null } : {}) }, updatedAt: now() }));
    return copy(find(id));
  }
  function revokeFolder(id, folder) {
    const task = find(id);
    const before = Array.isArray(task.folders) ? task.folders : [];
    if (folder !== undefined && folder !== null && typeof folder !== 'string') throw new Error('Choose a folder to remove.');
    const next = folder == null ? [] : before.filter(dir => dir !== folder && dir !== path.resolve(folder));
    if (next.length !== before.length) replace(id, value => ({ ...value, folders: next, updatedAt: now() }));
    return find(id);
  }
  function folderGrant(id) {
    const task = find(id);
    return Array.isArray(task.folders) ? [...task.folders] : [];
  }
  /** The task whose run started this session (official scheduledTaskId of a run session), or null. */
  function taskOfSession(threadId) {
    if (typeof threadId !== 'string' || !threadId) return null;
    const task = rows().find(value => value.runs?.some(run => run.threadId === threadId));
    return task ? copy(task) : null;
  }
  function list(kind) {
    if (kind === undefined) return copy(rows());
    if (!KINDS.includes(kind)) throw new Error('Unknown scheduled task kind.');
    return copy(rows().filter(task => kindOf(task) === kind));
  }
  return { start, request, observe, tick, list, rememberApproval, grantFolders, revokeFolder, folderGrant, taskOfSession, migrateOptions,
    dispose() { disposed = true; clearTimer(timer); for (const id of [...jitters.keys()]) clearJitter(id); } };
}
