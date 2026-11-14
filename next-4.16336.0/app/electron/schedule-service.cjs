// Claude Code's session cron (CronCreate / CronList / CronDelete, agent-tools/schedule.mjs) for every core without
// its own scheduler, modeled on Claude Code 2.1.280: a standard 5-field cron in local time, recurring by default
// (fires on every match, then auto-expires after 7 days with one final fire) or one-shot (fires once, then deleted),
// at most 50 jobs, and a job fires only while its session is idle — never beside a running turn. A fired prompt goes
// to the session as a new turn with the session's last turn options (deliver, main.cjs: workflow-tool-service.cjs),
// so it never runs with wider access than the session itself. Session-only: jobs live in memory until OpenClaude Desktop
// quits. The Background tasks pane lists a session's jobs ("Loop" / "Once", Next {countdown}, Ends {days}d) and
// stops one (list/remove).

const crypto = require("node:crypto");

const MAX_JOBS = 50;
const EXPIRY_DAYS = 7;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const BUSY_RETRY_MS = 5000;
const MAX_TIMER_MS = 2 ** 31 - 1;

const FIELDS = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] },
  { name: "day of week", min: 0, max: 7, names: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] },
];

function fieldValues(text, field) {
  const values = new Set();
  const value = (raw) => {
    const lower = raw.toLowerCase();
    const named = field.names ? field.names.indexOf(lower) : -1;
    if (named >= 0) return named + (field.name === "month" ? 1 : 0);
    if (!/^\d+$/.test(raw)) return NaN;
    return Number(raw);
  };
  for (const part of text.split(",")) {
    const match = /^(\*|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)(?:\/(\d+))?$/.exec(part);
    if (!match) return null;
    const step = match[2] === undefined ? 1 : Number(match[2]);
    if (!Number.isInteger(step) || step < 1) return null;
    let low, high;
    if (match[1] === "*") { low = field.min; high = field.max; }
    else if (match[1].includes("-")) { const [a, b] = match[1].split("-"); low = value(a); high = value(b); }
    else { low = value(match[1]); high = match[2] === undefined ? low : field.max; }
    if (!Number.isInteger(low) || !Number.isInteger(high) || low < field.min || high > field.max || low > high) return null;
    for (let at = low; at <= high; at += step) values.add(field.name === "day of week" && at === 7 ? 0 : at);
  }
  return values;
}

/** A parsed cron ({minute, hour, dom, month, dow sets, domAny, dowAny}), or null when it isn't 5 valid fields. */
function parseCron(expression) {
  if (typeof expression !== "string") return null;
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const sets = parts.map((part, index) => fieldValues(part, FIELDS[index]));
  if (sets.some((set) => !set || !set.size)) return null;
  return { minute: sets[0], hour: sets[1], dom: sets[2], month: sets[3], dow: sets[4], domAny: parts[2] === "*", dowAny: parts[4] === "*" };
}

/** The first local time after `from` (ms) that matches, within a year; null when none (e.g. Feb 30). */
function nextFire(cron, from) {
  const parsed = typeof cron === "string" ? parseCron(cron) : cron;
  if (!parsed) return null;
  const date = new Date(from);
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  const limit = from + 366 * 24 * 60 * 60 * 1000;
  const dayMatches = (d) => {
    const dom = parsed.dom.has(d.getDate()), dow = parsed.dow.has(d.getDay());
    // Standard cron: with both restricted, either one matching is enough.
    return parsed.domAny && parsed.dowAny ? true : parsed.domAny ? dow : parsed.dowAny ? dom : dom || dow;
  };
  while (date.getTime() <= limit) {
    if (!parsed.month.has(date.getMonth() + 1)) { date.setMonth(date.getMonth() + 1, 1); date.setHours(0, 0, 0, 0); continue; }
    if (!dayMatches(date)) { date.setDate(date.getDate() + 1); date.setHours(0, 0, 0, 0); continue; }
    if (!parsed.hour.has(date.getHours())) { date.setHours(date.getHours() + 1, 0, 0, 0); continue; }
    if (!parsed.minute.has(date.getMinutes())) { date.setMinutes(date.getMinutes() + 1, 0, 0); continue; }
    return date.getTime();
  }
  return null;
}

const pad = (value) => String(value).padStart(2, "0");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Claude's aE(): a readable cadence for the common shapes, else the expression itself. */
function humanSchedule(expression) {
  const parts = String(expression).trim().split(/\s+/);
  if (parts.length !== 5) return String(expression);
  const [minute, hour, dom, month, dow] = parts;
  const every = /^\*\/(\d+)$/;
  const number = (value) => /^\d+$/.test(value);
  if (every.test(minute) && hour === "*" && dom === "*" && month === "*" && dow === "*") { const n = Number(every.exec(minute)[1]); return n === 1 ? "every minute" : `every ${n} minutes`; }
  if (minute === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "every minute";
  if (number(minute) && every.test(hour) && dom === "*" && month === "*" && dow === "*") { const n = Number(every.exec(hour)[1]); return `every ${n === 1 ? "hour" : `${n} hours`} at :${pad(minute)}`; }
  if (number(minute) && hour === "*" && dom === "*" && month === "*" && dow === "*") return `hourly at :${pad(minute)}`;
  if (number(minute) && number(hour)) {
    const time = `${pad(hour)}:${pad(minute)}`;
    if (dom === "*" && month === "*" && dow === "*") return `daily at ${time}`;
    if (dom === "*" && month === "*" && dow === "1-5") return `weekdays at ${time}`;
    if (dom === "*" && month === "*" && /^[0-7]$/.test(dow)) return `${DAYS[Number(dow) % 7]}s at ${time}`;
    if (number(dom) && number(month) && dow === "*" && Number(month) >= 1 && Number(month) <= 12) return `${MONTHS[Number(month) - 1]} ${Number(dom)} at ${time}`;
    if (number(dom) && month === "*" && dow === "*") return `monthly on day ${Number(dom)} at ${time}`;
  }
  return String(expression);
}

/**
 * @param {object} o
 * @param {(threadId: string, text: string, job: object) => (boolean|"gone"|Promise<boolean|"gone">)} o.deliver  the fired
 *        prompt as a new turn; false when it couldn't be sent (retried while the job is due), "gone" when the session
 *        no longer exists (its jobs are removed)
 * @param {(threadId: string) => boolean} o.isIdle   whether the session has no turn running (a job waits until it has)
 * @param {(event: object) => void} [o.emit]        {kind: "schedules", sessionId, jobs} as a session's jobs change
 */
function createScheduleService({ deliver, isIdle = () => true, emit = () => {}, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (typeof deliver !== "function") throw new Error("deliver is required.");
  const jobs = new Map(); // id → job
  const view = (job) => ({ id: job.id, cron: job.cron, humanSchedule: job.humanSchedule, prompt: job.prompt, recurring: job.recurring, createdAt: job.createdAt,
    expiresAt: job.recurring ? job.createdAt + EXPIRY_MS : null, nextFireAt: job.due ? now() : job.nextFireAt, fired: job.fired, ...(job.lastFiredAt ? { lastFiredAt: job.lastFiredAt } : {}) });
  const sessionJobs = (sessionId) => [...jobs.values()].filter((job) => job.sessionId === sessionId).sort((a, b) => a.createdAt - b.createdAt);
  const changed = (sessionId) => { try { emit({ kind: "schedules", sessionId, jobs: list(sessionId) }); } catch { /* best effort */ } };

  function arm(job, delay) {
    clearTimer(job.timer);
    const wait = Math.max(0, Math.min(MAX_TIMER_MS, delay));
    job.timer = setTimer(() => tick(job.id), wait);
    job.timer?.unref?.();
  }
  function schedule(job) {
    const at = now();
    if (job.recurring && at >= job.createdAt + EXPIRY_MS) { remove(job.sessionId, job.id); return; }
    const next = nextFire(job.parsed, Math.max(at, job.lastFiredAt ?? 0));
    if (next === null) { remove(job.sessionId, job.id); return; }
    job.nextFireAt = next;
    arm(job, next - at);
  }
  async function tick(id) {
    const job = jobs.get(id);
    if (!job) return;
    if (now() < job.nextFireAt && !job.due) { arm(job, job.nextFireAt - now()); return; }
    job.due = true;
    // Only while the session is idle: a due job waits for the running turn to end.
    let idle = false;
    try { idle = isIdle(job.sessionId) !== false; } catch { idle = false; }
    if (!idle) { arm(job, BUSY_RETRY_MS); return; }
    const firedAt = now();
    let sent = false;
    try {
      const result = await deliver(job.sessionId, firedText(job, firedAt), view(job));
      // The session is gone (deleted or archived): its jobs go with it.
      if (result === "gone") { remove(job.sessionId, id); return; }
      sent = result !== false;
    } catch { sent = false; }
    if (!jobs.has(id)) return;
    if (!sent) { arm(job, BUSY_RETRY_MS); return; }
    job.due = false;
    job.fired += 1;
    job.lastFiredAt = firedAt;
    // One-shot: fires once, then is deleted; recurring: until 7 days after it was created (the last fire included).
    if (!job.recurring || firedAt >= job.createdAt + EXPIRY_MS) { remove(job.sessionId, id); return; }
    schedule(job);
    changed(job.sessionId);
  }

  /** Claude's validateInput: {expression, parsed, prompt, humanSchedule}, or throws what is wrong. */
  function check({ cron, prompt } = {}) {
    const expression = typeof cron === "string" ? cron.trim() : "";
    const parsed = parseCron(expression);
    if (!parsed) throw new Error(`Invalid cron expression '${expression}'. Expected 5 fields: M H DoM Mon DoW.`);
    if (nextFire(parsed, now()) === null) throw new Error(`Cron expression '${expression}' does not match any calendar date in the next year.`);
    const text = typeof prompt === "string" ? prompt.trim() : "";
    if (!text) throw new Error("prompt is required.");
    if (text.length > 20000) throw new Error("The prompt is too long (20,000 characters at most).");
    if (jobs.size >= MAX_JOBS) throw new Error(`Too many scheduled jobs (max ${MAX_JOBS}). Cancel one first.`);
    return { expression, parsed, prompt: text, humanSchedule: humanSchedule(expression) };
  }
  function create(sessionId, { cron, prompt, recurring = true } = {}) {
    if (typeof sessionId !== "string" || !sessionId) throw new Error("This tool works only in an OpenClaude Desktop session.");
    const { expression, parsed, prompt: text } = check({ cron, prompt });
    const id = crypto.randomBytes(4).toString("hex");
    const job = { id, sessionId, cron: expression, parsed, humanSchedule: humanSchedule(expression), prompt: text, recurring: recurring !== false, createdAt: now(), fired: 0, due: false, timer: null, nextFireAt: null };
    jobs.set(id, job);
    schedule(job);
    changed(sessionId);
    return view(job);
  }
  function remove(sessionId, id) {
    const job = jobs.get(id);
    if (!job || job.sessionId !== sessionId) return false;
    clearTimer(job.timer);
    jobs.delete(id);
    changed(sessionId);
    return true;
  }
  function list(sessionId) { return sessionJobs(sessionId).map(view); }
  function removeSession(sessionId) { let count = 0; for (const job of sessionJobs(sessionId)) if (remove(sessionId, job.id)) count += 1; return count; }
  function dispose() { for (const job of jobs.values()) clearTimer(job.timer); jobs.clear(); }
  return { check, create, remove, list, removeSession, dispose, tick, get size() { return jobs.size; } };
}

/**
 * What the session receives when a job fires: the prompt, then a hidden note the transcript reads back as Claude's
 * "Scheduled prompt · {time}" row (src/composer-attachments-model.mjs scheduledOrigin) and the model reads as not
 * being a new message from the user.
 */
function firedText(job, firedAt) {
  return `${job.prompt}\n\n<system-reminder>\nThis prompt was scheduled with CronCreate (job ${job.id}, ${job.recurring ? `recurring: ${job.humanSchedule}` : "one-shot"}) and fired at ${new Date(firedAt).toISOString()}. It is not a new message from the user.\n</system-reminder>`;
}

module.exports = { createScheduleService, parseCron, nextFire, humanSchedule, firedText, MAX_JOBS, EXPIRY_DAYS, EXPIRY_MS };
