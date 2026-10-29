// w13-coworkui-runs: the data the 3.6556.2 Cowork activity panel's Runs (c21f11e6d Ew) and Upcoming (eT) sections read,
// built from local records (E59: no claude.ai account, no remote scheduled tasks). Pure (plain node imports it in tests);
// the generated sections read it through src/source-cowork-runs-adapters.jsx (CoworkRunsHost).
//
//   Runs      AT mounts Ew only when the session has a scheduledTaskId (`de&&p(Ew,{scheduledTaskId:de,…})`). Officially
//             that is the session's own scheduledTaskId; a local session started by the scheduler is the thread of one
//             of the task's runs (electron/local-routines.mjs run.threadId), so the task is found by that thread.
//             Ew lists Xi(task).sessions (newest first by createdAt, Dw) — here one row per run with a thread, shaped
//             like the official session rows (the same fields the Scheduled page's run list gives ccd3f68fe ps).
//   Upcoming  AT always mounts eT with `upcomingTriggers` (cb1e253a0 m_): the session's successful `send_later` tool
//             results ({ trigger_id, fire_at }) not removed since by `delete_trigger` / `fire_trigger`. eT keeps the
//             ones still in the future and renders null when none are left. The local runtimes have no send_later tool,
//             so the list is empty and the section does not render — not the task's next run (that is the Scheduled
//             page's "Next run", ccd3f68fe), which official eT never shows.

const RUNNING = new Set(['starting', 'running']);
const timeMs = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const ms = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
};
const iso = (value) => {
  const ms = timeMs(value);
  return ms === undefined ? undefined : new Date(ms).toISOString();
};

// The local task one of whose runs started this session (undefined for an ordinary session).
export function coworkScheduledTaskFor(tasks, sessionId) {
  if (!sessionId || !Array.isArray(tasks)) return undefined;
  return tasks.find((task) => (task?.runs ?? []).some((run) => run?.threadId === sessionId));
}

// shared-4 l_ reads `displayName` (sourceRoutine gives the task name).
export function coworkScheduledTaskSummary(task) {
  return { id: task.id, displayName: task.displayName ?? task.name };
}

// One official session row per run with a thread: { sessionId, createdAt, origin, isRunning, lastActivityAt,
// pendingToolPermissions, unread }. Ew reads pendingToolPermissions / isRunning / lastActivityAt for the unread dot
// (`!isRunning && pending === 0 && lastActivityAt !== void 0 && eK(row, readState)`), createdAt for the time, origin for
// the c1dd841c3 badge (" · Manual" for a run started by hand; none for a scheduled one). A run's live session row
// (cowork-home-model.mjs rows) supplies isRunning / lastActivityAt / pending permissions when it is listed.
export function coworkRunSessions(task, rows = []) {
  const live = new Map((rows ?? []).map((row) => [row.sessionId, row]));
  return (task?.runs ?? []).filter((run) => run?.threadId).map((run) => {
    const row = live.get(run.threadId);
    const running = RUNNING.has(run.status) || !!row?.isRunning;
    return {
      sessionId: run.threadId,
      createdAt: iso(run.startedAt),
      origin: run.trigger === 'scheduled' ? 'scheduled_trigger' : 'force_run_trigger',
      isRunning: running,
      lastActivityAt: row?.lastActivityAt ?? timeMs(run.finishedAt) ?? timeMs(run.startedAt),
      pendingToolPermissions: row?.pendingToolPermissions ?? [],
    };
  });
}

// The official read state ({ initializedAt, sessions }) for the run sessions: a session the host marks unread reads 0
// (shared-2 eK: explicitly unread), otherwise its last activity (read up to now) — cowork-home-model.mjs's rule.
export function coworkRunsReadState(sessions, metadata = {}) {
  const readState = { initializedAt: 0, sessions: {} };
  for (const session of sessions) readState.sessions[session.sessionId] = metadata?.[session.sessionId]?.unread ? 0 : session.lastActivityAt;
  return readState;
}

// cb1e253a0 m_ over local transcript items: a tool call named send_later (shared-78 um: the bare name, or
// `mcp__<server>__<name>` for one of the Claude Code Remote servers Gj) with a successful result whose text is JSON
// { trigger_id, fire_at }, minus later delete_trigger / fire_trigger calls for the same id; sorted by fireAt. The message is
// the call's input.message with the cc-memory tags removed (shared-2 Ud). Items are this host's turn items ({ type, server?,
// tool, arguments, result, status }; a qualified MCP name is rebuilt from server + tool).
const REMOTE_SERVERS = ['Claude Code Remote', 'claude-code-remote', 'Claude_Code_Remote', 'bf7c680d-5fdc-5ef4-b4a0-abadb619bf0a'];
const toolName = (item) => {
  const tool = typeof item.tool === 'string' ? item.tool : typeof item.name === 'string' ? item.name : '';
  const server = typeof item.server === 'string' && item.server ? item.server : '';
  return server ? `mcp__${server}__${tool}` : tool;
};
const toolIs = (name, bare) => name === bare || REMOTE_SERVERS.some((server) => name === `mcp__${server}__${bare}`);
const MEMORY_TAGS = /<cc-memory(?:\s+filenames="[^"<>]*")?\s*>|<\/cc-memory\s*>/g;
const memoryStripped = (text) => (typeof text !== 'string' || !text.includes('<') ? text : text.replace(MEMORY_TAGS, ''));
const toolText = (result) => {
  if (typeof result === 'string') return result;
  const content = Array.isArray(result?.content) ? result.content : Array.isArray(result) ? result : [];
  return content.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('') || undefined;
};
export function coworkUpcomingTriggers(items = []) {
  const triggers = new Map();
  for (const item of items ?? []) {
    if (item?.type !== 'mcpToolCall' && item?.type !== 'dynamicToolCall') continue;
    if (item.status !== 'completed' || item.error || item.result?.isError) continue;
    const input = item.arguments && typeof item.arguments === 'object' ? item.arguments : undefined;
    const name = toolName(item);
    if (toolIs(name, 'delete_trigger') || toolIs(name, 'fire_trigger')) {
      if (typeof input?.trigger_id === 'string') triggers.delete(input.trigger_id);
      continue;
    }
    if (!toolIs(name, 'send_later')) continue;
    let parsed;
    try { parsed = JSON.parse(toolText(item.result) ?? ''); } catch { continue; }
    if (!parsed || typeof parsed.trigger_id !== 'string' || typeof parsed.fire_at !== 'string') continue;
    const fireAt = new Date(parsed.fire_at);
    if (Number.isNaN(fireAt.getTime())) continue;
    triggers.set(parsed.trigger_id, { triggerId: parsed.trigger_id, fireAt, message: typeof input?.message === 'string' ? memoryStripped(input.message) : '', toolUseId: item.id });
  }
  return [...triggers.values()].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

// Everything the two sections need for one Cowork session: `scheduledTaskId` (AT's `de`, undefined for an ordinary
// session, so Runs is not mounted), the CoworkRunsHost value (scheduledTasks / sessions / readState) and `triggers`
// (AT's `upcomingTriggers`, eT's `triggers`).
export function coworkRunsData({ tasks, sessionId, rows = [], metadata = {}, items = [] } = {}) {
  const task = coworkScheduledTaskFor(tasks, sessionId);
  const sessions = task ? coworkRunSessions(task, rows) : [];
  return {
    scheduledTaskId: task?.id,
    host: {
      scheduledTasks: task ? [coworkScheduledTaskSummary(task)] : [],
      sessions,
      readState: coworkRunsReadState(sessions, metadata),
    },
    triggers: coworkUpcomingTriggers(items),
  };
}

// The two links the sections render (RouterLink → RoutinesSharedHost navigate): `${gl}/${id}` (gl "/cowork", a run) and
// `${Rl}/${encodeURIComponent(id)}` (Rl "/scheduled-task", the task chip).
export function coworkRunsRoute(href) {
  if (typeof href !== 'string') return undefined;
  if (href.startsWith('/cowork/')) return { kind: 'session', id: decodeURIComponent(href.slice('/cowork/'.length)) };
  if (href.startsWith('/scheduled-task/')) return { kind: 'scheduled-task', id: decodeURIComponent(href.slice('/scheduled-task/'.length)) };
  return undefined;
}
