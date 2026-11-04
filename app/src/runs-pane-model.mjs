// W14-code cccc-20 (3.6556.2 cccc2cf0a oA, the Runs pane of a local session a scheduled task started; c73f45bc3 f_ the
// View menu's Runs row). Pure values for src/source-runs-pane.jsx and main.jsx.
//
// The original reads the CCD sessions store (shared-8 Df): `e.sessions.find((e) => e.sessionId === t)?.scheduledTaskId`
// names the task, `e.sessions.filter((e) => e.scheduledTaskId === o)` its runs, and the scheduled task list (shared-4 la
// `Hn(!0)`) the task itself. The host's store rows are code-routine-model.mjs codeRoutineSessions over the scheduler's
// tasks (runs[].threadId) and the sessions whose metadata names a task (main.cjs writes sessionMetadata.scheduledTaskId
// when the runner attaches). The official store keeps a session's scheduledTaskId after its task is deleted, so a
// session's own task id is also read from its metadata (or its session record), and that task's metadata sessions are
// still listed.
import { codeRoutineSessions, codeScheduledTask } from './code-routine-model.mjs';

// The session's scheduled task id: its metadata / session record, else the task whose runs name it; null for a session
// no scheduled task started (bA "Not a scheduled task run").
export function runsPaneTaskId(sessionId, { rows = [], sessions = [], metadata = {} } = {}) {
  if (!sessionId) return null;
  const own = metadata?.[sessionId]?.scheduledTaskId ?? (sessions ?? []).find((session) => session?.id === sessionId)?.scheduledTaskId;
  if (typeof own === 'string' && own) return own;
  const task = (rows ?? []).find((row) => (row?.runs ?? []).some((run) => run?.threadId === sessionId));
  return task?.id ?? null;
}

// c73f45bc3 f_ for a local session (`!!t.sessions.find((t) => t.sessionId === e.id)?.scheduledTaskId`): the View
// options menu lists Runs (`y_(k, { icon: Is.runs, label: "Runs", … })`, no `|| c.has("runs")`) only then.
export function sessionHasRuns(sessionId, { sessions = [], metadata = {} } = {}) {
  return runsPaneTaskId(sessionId, { sessions, metadata }) !== null;
}

// oA sA: newest first by lastActivityAt, else createdAt.
const newestFirst = (e, t) => (t.lastActivityAt ?? t.createdAt ?? 0) - (e.lastActivityAt ?? e.createdAt ?? 0);

// oA's values: `o` the task id, `l` the task (null while the list loads or when it is gone), `d` the sorted runs and
// their running / completed split (`n.isRunning ? e.push(n) : t.push(n)`). `rows` is the local-routines list (null
// while it loads).
export function runsPaneModel(sessionId, { rows = null, sessions = [], metadata = {}, state = {} } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const scheduledTaskId = runsPaneTaskId(sessionId, { rows: list, sessions, metadata });
  if (!scheduledTaskId) return { scheduledTaskId: null, task: null, runs: [], running: [], completed: [] };
  const row = list.find((task) => task?.id === scheduledTaskId) ?? null;
  const store = codeRoutineSessions(row ? list : [...list, { id: scheduledTaskId, runs: [] }], { sessions, metadata, state });
  const runs = store.filter((entry) => entry.scheduledTaskId === scheduledTaskId).sort(newestFirst);
  return {
    scheduledTaskId,
    task: row ? codeScheduledTask(row) : null,
    runs,
    running: runs.filter((entry) => entry.isRunning),
    completed: runs.filter((entry) => !entry.isRunning),
  };
}

// cA `m = t.isRunning ? "running" : t.error ? "failed" : "succeeded"`.
export const runStatus = (entry) => (entry?.isRunning ? 'running' : entry?.error ? 'failed' : 'succeeded');

// The desktop routes (shared-52 Ef `${au}/scheduled` and Tf `au`, au "/epitaxy" in the desktop shell): dA's Details
// link `${St()}/${encodeURIComponent(o)}` and cA's row `${jt()}/${encodeURIComponent(t.sessionId)}?pane=runs`.
export const runsTaskHref = (scheduledTaskId) => `/epitaxy/scheduled/${encodeURIComponent(scheduledTaskId)}`;
export const runsSessionHref = (sessionId) => `/epitaxy/${encodeURIComponent(sessionId)}?pane=runs`;
