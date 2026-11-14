// Monitor: Claude Code's tool for watching a command in the background — every stdout line is an event the agent is
// told about as a <task-notification> (electron/monitor-service.cjs), so it can keep working instead of polling.
// MonitorStop ends one early (Claude Code stops monitors with TaskStop, which the cores' own task tools don't know).
// Qwen Code has its own monitor tool, so its descriptor lists Monitor in nativeTools and it never gets these.
//
// The command runs as the user, outside the core's sandbox, so the user approves it first in the session's approval
// card (the monitor kind; Bypass permissions runs it without asking, main.cjs agentToolAsk).
// ctx.monitors: { start({command, description, timeoutMs, toolUseId}) → {taskId, timeoutMs}, stop(id) → {stopped, status},
//                 list() → [{id, description, command, status, events, …}] }  (main.cjs, for the calling session)
export const group = "monitor";
export const native = "Monitor";

const DESCRIPTION = `Start a background monitor that streams events from a long-running script. Each stdout line is an event: you are told about it in a <task-notification> message and can keep working without polling or sleeping. Use it to watch something and react when it changes — a log file, a dev server's errors, a CI or deploy status, a file appearing.

The user approves the command first (unless the session runs in Bypass permissions). It runs in the user's login shell on their computer, outside the sandbox, in the session's working folder.

**Pick a command that ends on its own** for "tell me when X is ready": a poll loop that exits once the condition holds, e.g.
  until curl -sf localhost:3000/health >/dev/null; do sleep 1; done; echo ready
Unbounded commands (tail -f, while true) keep the monitor armed until its deadline even after the event fired.

**Script quality:**
- Every pipe stage must flush per line or matches sit in its buffer unseen: grep needs --line-buffered, awk needs fflush(). | head -N delivers nothing until N matches accumulate.
- In poll loops, handle transient failures (curl ... || true) so one failed request doesn't end the monitor. Poll remote APIs every 30 s or more, local checks every 0.5-1 s.
- Write a specific description — it appears in every notification ("errors in deploy.log", not "watching logs").
- Only stdout is the event stream; merge stderr with 2>&1 when its failures should reach your filter.

**Coverage — silence is not success.** When watching for an outcome, the filter must match every terminal state (succeeded|failed|cancelled|timeout, Traceback|Error|FAILED|Killed), not only the happy path.

**Output volume:** every stdout line is a message, so filter to the lines you'd act on. Lines within 200 ms are batched into one notification; a monitor that floods is rate-limited and then stopped.

Events arrive as a new message once your current turn has ended, never in the middle of it. Every monitor expires after timeout_ms (default 5 minutes, at most 30): it is stopped and you get one notice with the event count; re-arm it if you still need the watch. The command exiting ends the watch (its exit code is reported). Use MonitorStop to end it early.`;

export const tools = [
  {
    name: "Monitor",
    title: "Monitor",
    description: DESCRIPTION,
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command or script. Each stdout line is an event; exit ends the watch." },
        description: { type: "string", description: "Short human-readable description of what you are monitoring (shown in notifications)." },
        timeout_ms: { type: "integer", minimum: 1000, maximum: 3600000, description: "Stop the monitor after this deadline. Default 300000 ms. Deadlines above 1800000 ms are capped to 1800000 ms. You are notified at expiry and can re-arm." },
      },
      required: ["command", "description"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    handler: async (args = {}, ctx) => {
      const command = typeof args.command === "string" ? args.command.trim() : "";
      if (!command) throw new Error("command is required.");
      if (/[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/.test(command)) throw new Error("command contains control characters that would be hidden in the approval card.");
      const description = typeof args.description === "string" ? args.description.replace(/\s+/g, " ").trim().slice(0, 200) : "";
      if (!description) throw new Error("description is required.");
      if (!ctx?.monitors || typeof ctx.monitors.start !== "function") throw new Error("Monitors aren’t available in this session.");
      if (ctx.signal?.aborted) throw new Error("The turn was stopped. Nothing was run.");
      const answer = typeof ctx.requestApproval === "function"
        ? await ctx.requestApproval({ kind: "monitor", command, cwd: ctx.cwd ?? undefined, description })
        : false;
      if (ctx.signal?.aborted) throw new Error("The turn was stopped. Nothing was run.");
      if (!(answer === true || answer?.approved === true)) throw new Error("The user declined. The monitor wasn’t started.");
      const { taskId, timeoutMs } = ctx.monitors.start({ command, description, timeoutMs: args.timeout_ms, toolUseId: ctx.call?.callId ?? ctx.call?.itemId ?? undefined });
      const minutes = Math.round(timeoutMs / 60000);
      const expires = minutes >= 1 ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : `${Math.round(timeoutMs / 1000)} seconds`;
      return `Monitor started (task ${taskId}, expires in ${expires} unless the source ends first; you get one notice at expiry — re-arm if you still need the watch). You will be notified on each event once your current turn ends. Keep working — do not poll or sleep. Events may arrive while you are waiting for the user — an event is not their reply.`;
    },
  },
  {
    name: "MonitorStop",
    title: "Stop monitor",
    description: "Stop a background monitor you started with Monitor in this session, by its task ID. Nothing more is reported for it after it stops.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "The monitor's task ID (from Monitor's result or its notifications)." } },
      required: ["task_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const id = typeof args.task_id === "string" ? args.task_id.trim() : "";
      if (!id) throw new Error("task_id is required.");
      if (!ctx?.monitors || typeof ctx.monitors.stop !== "function") throw new Error("Monitors aren’t available in this session.");
      const result = ctx.monitors.stop(id);
      return result.stopped ? `Monitor ${id} stopped.` : `Monitor ${id} had already ${result.status === "failed" ? "failed" : result.status === "completed" ? "ended" : "stopped"}.`;
    },
  },
];
