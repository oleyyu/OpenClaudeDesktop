// CronCreate / CronList / CronDelete: Claude Code's session scheduler (electron/schedule-service.cjs) for a core
// without its own. Kimi, Qwen and MiMo schedule prompts themselves, so their descriptors list CronCreate in
// nativeTools and get none of these. (ZCode has Cron* tools too, but they need a host automation service OpenClaude Desktop
// doesn't run, so the zcode bridge withholds them and ZCode gets these.) A fired prompt reaches the session as a new turn once it is idle, with the
// session's own Mode, so it never runs with more access than the session has.
//
// Creating a job asks the user first (the session's approval card; Bypass permissions creates it without asking):
// a scheduled prompt starts turns on its own later.
// ctx.schedules: { create({cron, prompt, recurring}) → job, list() → [job], remove(id) → boolean }  (main.cjs)
export const group = "schedule";
export const native = "CronCreate";
export const EXPIRY_DAYS = 7;

const CREATE_DESCRIPTION = `Schedule a prompt to be enqueued at a future time in this session. Use for both recurring schedules and one-shot reminders.
Uses standard 5-field cron in the user's local timezone: minute hour day-of-month month day-of-week. "0 9 * * *" means 9am local — no timezone conversion needed.
## One-shot tasks (recurring: false)
For "remind me at X" or "at <time>, do Y" requests — fire once then auto-delete. Pin minute/hour/day-of-month/month to specific values:
  "remind me at 2:30pm today to check the deploy" → cron: "30 14 <today_dom> <today_month> *", recurring: false
## Recurring jobs (recurring: true, the default)
For "every N minutes" / "every hour" / "weekdays at 9am" requests: "*/5 * * * *" (every 5 min), "0 * * * *" (hourly), "0 9 * * 1-5" (weekdays at 9am local).
## Avoid the :00 and :30 minute marks when the task allows it
When the user's request is approximate, pick a minute that is not 0 or 30 ("every morning around 9" → "57 8 * * *"; "hourly" → "7 * * * *"). Only use minute 0 or 30 when the user names that exact time.
## Not for live watching
To watch a log file, process or command output and be told the moment something changes, use Monitor instead — cron re-runs a prompt at fixed wall-clock intervals.
## Runtime behavior
The user approves the schedule first. Jobs only fire while this session is idle (not mid-turn), and only while OpenClaude Desktop is running: they are session-only and gone when the app quits (durable has no effect). Recurring tasks auto-expire after ${EXPIRY_DAYS} days — they fire one final time, then are deleted. Tell the user about the ${EXPIRY_DAYS}-day limit when scheduling recurring jobs.
Returns a job ID you can pass to CronDelete.`;

const describeJob = (job) => `${job.id} — ${job.humanSchedule}${job.humanSchedule !== job.cron ? ` (${job.cron})` : ""} (${job.recurring ? "recurring" : "one-shot"}) [session-only]: ${job.prompt.length > 80 ? `${job.prompt.slice(0, 79)}…` : job.prompt}`;

function service(ctx) {
  if (!ctx?.schedules || typeof ctx.schedules.create !== "function") throw new Error("Scheduled prompts aren’t available in this session.");
  return ctx.schedules;
}

export const tools = [
  {
    name: "CronCreate",
    mainOnly: true, // a sub-agent's call is refused (agent-tools-host.cjs)
    title: "Schedule a prompt",
    description: CREATE_DESCRIPTION,
    inputSchema: {
      type: "object",
      properties: {
        cron: { type: "string", description: "Standard 5-field cron expression in local time: \"M H DoM Mon DoW\" (e.g. \"*/5 * * * *\" = every 5 minutes, \"30 14 28 2 *\" = Feb 28 at 2:30pm local once)." },
        prompt: { type: "string", description: "The prompt to enqueue at each fire time." },
        recurring: { type: "boolean", description: `true (default) = fire on every cron match until deleted or auto-expired after ${EXPIRY_DAYS} days. false = fire once at the next match, then auto-delete. Use false for "remind me at X" one-shot requests with pinned minute/hour/dom/month.` },
        durable: { type: "boolean", description: "Has no effect — durable persistence is not available. All jobs are session-only (in memory, gone when OpenClaude Desktop quits)." },
      },
      required: ["cron", "prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const schedules = service(ctx);
      const recurring = args.recurring !== false;
      // Validated before the card: an expression that can't fire never asks.
      const preview = typeof schedules.check === "function" ? schedules.check({ cron: args.cron, prompt: args.prompt }) : null;
      if (ctx.signal?.aborted) throw new Error("The turn was stopped. Nothing was scheduled.");
      const answer = typeof ctx.requestApproval === "function"
        ? await ctx.requestApproval({ kind: "schedule", cron: typeof args.cron === "string" ? args.cron.trim() : "", humanSchedule: preview?.humanSchedule, prompt: typeof args.prompt === "string" ? args.prompt.trim() : "", recurring })
        : false;
      if (ctx.signal?.aborted) throw new Error("The turn was stopped. Nothing was scheduled.");
      if (!(answer === true || answer?.approved === true)) throw new Error("The user declined. Nothing was scheduled.");
      const job = schedules.create({ cron: args.cron, prompt: args.prompt, recurring });
      const where = "Session-only (not written to disk, gone when OpenClaude Desktop quits)";
      return job.recurring
        ? `Scheduled recurring job ${job.id} (${job.humanSchedule}). ${where}. Auto-expires after ${EXPIRY_DAYS} days. Use CronDelete to cancel sooner.`
        : `Scheduled one-shot task ${job.id} (${job.humanSchedule}). ${where}. It will fire once then auto-delete.`;
    },
  },
  {
    name: "CronList",
    title: "List scheduled prompts",
    description: "List all cron jobs scheduled via CronCreate in this session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (_args, ctx) => {
      const jobs = service(ctx).list();
      return jobs.length ? jobs.map(describeJob).join("\n") : "No scheduled jobs.";
    },
  },
  {
    name: "CronDelete",
    title: "Cancel a scheduled prompt",
    description: "Cancel a cron job previously scheduled with CronCreate in this session. Removes it from the in-memory session store.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Job ID returned by CronCreate." } },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const id = typeof args.id === "string" ? args.id.trim() : "";
      if (!id) throw new Error("id is required.");
      if (!service(ctx).remove(id)) throw new Error(`No scheduled job with id '${id}'`);
      return `Cancelled job ${id}.`;
    },
  },
];
