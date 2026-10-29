import { t } from "../electron/i18n/index.mjs";
import { formatDuration } from "./command-row-model.mjs";

// Background task events in the transcript (2.2553.1 ion-dist c06cf64bb Vl/Hl parse <task-notification> into
// {kind:'task_event', taskId, taskType, status, summary, durationMs}; approval-current.js:44082-44440 M2/N2/P2/F2/aue/R2
// render them). A settled event is one plain line: 'Background {noun} {status}' · {description} · took {elapsed}. Pure.

/** M2 (:44082-44098): the event's noun kind for its Claude Code task type. */
export function taskEventNoun(taskType) {
  switch (taskType) {
    // Claude's taskType names, and the plain kinds a core's codeDesktop.kind may say.
    case "local_bash": case "bash": case "shell": return "shell";
    case "local_agent": case "remote_agent": case "in_process_teammate": case "agent": case "subagent": return "agent";
    case "local_workflow": case "workflow": return "workflow";
    case "monitor_mcp": case "monitor_ws": case "monitor": return "monitor";
    default: return "task";
  }
}
// '{count} background {noun} {status}' (hEJp1hFtWd) with N2/tue's nouns spelled into whole phrases, so a translation
// can inflect the noun; {status} is nue's word.
const HEAD_ONE = { shell: "{count} background command {status}", agent: "{count} background agent {status}", workflow: "{count} background workflow {status}",
  monitor: "{count} background monitor {status}", task: "{count} background task {status}" };
const HEAD_MANY = { shell: "{count} background commands {status}", agent: "{count} background agents {status}", workflow: "{count} background workflows {status}",
  monitor: "{count} background monitors {status}", task: "{count} background tasks {status}" };
const STATUS = { running: "started", completed: "completed", failed: "failed", stopped: "stopped" };
// The English copy is assembled from whole phrases (t() keys), so a translation can reorder every part.
const SINGLE = {
  shell: { running: "Background command started", completed: "Background command completed", failed: "Background command failed", stopped: "Background command stopped" },
  agent: { running: "Background agent started", completed: "Background agent completed", failed: "Background agent failed", stopped: "Background agent stopped" },
  workflow: { running: "Background workflow started", completed: "Background workflow completed", failed: "Background workflow failed", stopped: "Background workflow stopped" },
  monitor: { running: "Background monitor started", completed: "Background monitor completed", failed: "Background monitor failed", stopped: "Background monitor stopped" },
  task: { running: "Background task started", completed: "Background task completed", failed: "Background task failed", stopped: "Background task stopped" },
};
const normalStatus = (status) => status === "killed" ? "stopped" : STATUS[status] ? status : "completed";

/** An OpenClaude Desktop workflow notification (workflow-keyword.mjs workflowNotificationSummary) as a task event. */
export function workflowTaskEvent(notification) {
  if (!notification) return null;
  const summary = String(notification.summary ?? "");
  // A Monitor's events carry no status (Claude's Hl drops them: no transcript row); its end does ('Monitor "…" stream
  // ended' / 'script failed (exit N)', electron/monitor-service.cjs) and reads as 'Background monitor completed · …'.
  if (!notification.status) return null;
  const monitor = summary.match(/^Monitor "([\s\S]*?)" (?:stream ended|ended without producing output|script failed|stopped)/);
  if (monitor) return { taskId: notification.taskId ?? null, taskType: "monitor", status: normalStatus(notification.status), description: monitor[1] || null, durationMs: null };
  const status = normalStatus(notification.status);
  const name = summary.match(/^Dynamic workflow "([\s\S]*?)" (?:completed|failed|killed|was stopped)/)?.[1] ?? "";
  // A failed run with no name still says why ('failed: {error}'); a named one names the run, as Claude's description.
  const error = status === "failed" && !name ? summary.replace(/^Dynamic workflow[\s\S]*? failed:\s*/, "") : "";
  const durationMs = Number(notification.durationMs);
  return { taskId: notification.taskId ?? null, taskType: "local_workflow", status, description: name || error || null,
    durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null };
}

/** aue (:44297-44400): the settled single row's parts. */
export function taskEventRow(entry) {
  const status = normalStatus(entry?.status), noun = taskEventNoun(entry?.taskType);
  const running = status === "running";
  return {
    label: t(SINGLE[noun][status]),
    description: entry?.description || entry?.summary || null,
    elapsed: !running && Number.isFinite(entry?.durationMs) ? t("took {elapsed}", { elapsed: formatDuration(Math.round(entry.durationMs / 1000)) }) : null,
    danger: status === "failed",
    running,
  };
}

/** F2/iue (:44150-44260): several events as '{count} background {noun} {status}, {n} failed, …'. */
export function mergedTaskEvents(entries) {
  const list = (entries || []).filter(Boolean);
  if (!list.length) return null;
  const counts = { running: 0, completed: 0, failed: 0, stopped: 0 };
  for (const entry of list) counts[normalStatus(entry.status)]++;
  const nouns = new Set(list.map((entry) => taskEventNoun(entry.taskType)));
  const noun = nouns.size === 1 ? [...nouns][0] : "task";
  const order = ["completed", "failed", "stopped", "running"].filter((key) => counts[key] > 0);
  const [first, ...rest] = order;
  const status = first === "running" ? t("running") : t(STATUS[first]);
  const head = t(counts[first] === 1 ? HEAD_ONE[noun] : HEAD_MANY[noun], { count: counts[first], status });
  const text = { completed: "{count} completed", failed: "{count} failed", stopped: "{count} stopped", running: "{count} running" };
  return {
    parts: [{ key: first, text: head, danger: first === "failed" }, ...rest.map((key) => ({ key, text: t(text[key], { count: counts[key] }), danger: key === "failed" }))],
    anyRunning: counts.running > 0,
  };
}

/**
 * The Background tasks pane's finished commands and agents as transcript task events (Claude's <task-notification>
 * rows), grouped by the turn they land at the end of: the latest turn that had started when the task finished, else
 * the turn that started the task. A command counts only when the core reported it as a background terminal
 * (`backgroundItemIds`, thread background snapshots) or named its task kind; ordinary commands that merely had a
 * process id stay plain command rows. Events in one turn are consecutive, so they read as one merged line.
 * A task the transcript's own tool call started (the command row, the spawnAgent row) that completed adds no event:
 * c06cf64bb's task_started drops it (`n=v(e.tool_use_id)?"dropped":…;if(n==="dropped"){u.add(e.task_id);…}`, v = a
 * tool id the transcript has shown) and its completed task_notification is skipped (`let n=u.has(e.task_id);
 * if(n&&t==="completed")continue;`); the tool row itself carries the finish. Failed / stopped ones still read as an
 * event (`Oe(s,n?void 0:e.tool_use_id)`). Pure.
 * @returns {Map<string, Array<{taskKey, taskType, status, description, durationMs}>>}
 */
export function backgroundTaskEventsByTurn(tasks, { items = [], turnTimes = {}, backgroundItemIds = new Set(), activeTurnId = null } = {}) {
  const out = new Map();
  const turnIds = new Set(), itemTurn = new Map(), shown = new Set();
  for (const item of items || []) { if (item?.id) shown.add(item.id); if (item?.turnId) { turnIds.add(item.turnId); if (item.id) itemTurn.set(item.id, item.turnId); } }
  const starts = [...turnIds].map((id) => [id, Number(turnTimes?.[id]?.startedAt)]).filter(([, at]) => Number.isFinite(at) && at > 0)
    .map(([id, at]) => [id, at * 1e3]).sort((a, b) => a[1] - b[1]);
  const events = [];
  for (const task of tasks || []) {
    if (!["completed", "failed", "stopped"].includes(task?.status)) continue;
    if (task.kind === "bash" ? !(backgroundItemIds.has(task.itemId) || task.taskType) : task.kind !== "agent") continue;
    if (task.status === "completed" && shown.has(task.kind === "bash" ? task.itemId : task.sourceItem?.id)) continue;
    const completedAt = Number(task.completedAt);
    if (!Number.isFinite(completedAt)) continue;
    const source = task.kind === "bash" ? itemTurn.get(task.itemId) : task.sourceItem?.turnId ?? itemTurn.get(task.sourceItem?.id);
    const landed = starts.filter(([, at]) => at <= completedAt).at(-1)?.[0];
    const turnId = landed && (!source || starts.findIndex(([id]) => id === landed) >= starts.findIndex(([id]) => id === source)) ? landed : source;
    if (!turnId || turnId === activeTurnId && turnId === source) continue;
    const durationMs = Number.isFinite(task.durationMs) ? task.durationMs : Number.isFinite(task.startedAt) ? completedAt - task.startedAt : null;
    events.push({ turnId, completedAt, event: { taskKey: task.id, taskType: task.kind === "bash" ? task.taskType ?? "local_bash" : "local_agent",
      status: task.status, description: task.description || null, durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null } });
  }
  for (const { turnId, event } of events.sort((a, b) => a.completedAt - b.completedAt)) {
    if (!out.has(turnId)) out.set(turnId, []);
    out.get(turnId).push(event);
  }
  return out;
}
