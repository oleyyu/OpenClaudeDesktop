import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import cron from './schedule-service.cjs';
import { APPROVAL_LIMIT, sameRule, storedRule } from './routine-approvals.mjs';

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
export function createLocalRoutines({ getState, commit, launch, dataDir, approveFolder,
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
    if (disposed) throw new Error('The scheduler is shutting down.');
    if (p.action === 'run') return run(p.id);
    if (p.action === 'delete') { find(p.id); clearJitter(p.id); write(rows().filter(task => task.id !== p.id)); return { deleted: true }; }
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
    const id = previous?.id ?? randomUUID();
    let cwd = previous?.cwd;
    if (p.folder) {
      if (typeof p.folder !== 'string' || !path.isAbsolute(p.folder)) throw new Error('Choose a directory.');
      cwd = p.folder === previous?.cwd ? previous.cwd : approveFolder(p.folder);
      if (!(await fs.stat(cwd)).isDirectory()) throw new Error('Choose a directory.');
    } else if (!cwd) { cwd = path.join(dataDir, 'scheduled-tasks', id); await fs.mkdir(cwd, { recursive: true }); }
    // Re-read after I/O: a concurrent run, pause or deletion must not be overwritten.
    const current = previous ? find(id) : null;
    if (!current && rows().length >= 100) throw new Error('You can save up to 100 scheduled tasks.');
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
    return view(value);
  }
  // R4g-routines RT6 (WI-6): a Code task's Always allowed rules (routine-approvals.mjs). Only main adds one, after the user
  // answered a run's card "Allow for this session"; the page removes them (official removeApprovedPermission: no
  // ruleContent removes every rule of the tool, otherwise the rules with that official key).
  function rememberApproval(id, rule) {
    const task = rows().find(value => value.id === id), stored = storedRule(rule);
    if (!task || kindOf(task) !== 'code' || !stored) return false;
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
  function list(kind) {
    if (kind === undefined) return copy(rows());
    if (!KINDS.includes(kind)) throw new Error('Unknown scheduled task kind.');
    return copy(rows().filter(task => kindOf(task) === kind));
  }
  return { start, request, observe, tick, list, rememberApproval,
    dispose() { disposed = true; clearTimer(timer); for (const id of [...jitters.keys()]) clearJitter(id); } };
}
