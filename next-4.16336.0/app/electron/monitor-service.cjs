// Claude Code's Monitor for every core without its own (agent-tools/monitor.mjs): a shell command that runs in the
// background, outside the core, whose every stdout line is an event the model is told about — modeled on Claude Code
// 2.1.280 (uhn/d8n: lines batched for 200 ms, 500 characters a line and 3000 a batch, a rate limit that suppresses a
// flood and stops a monitor that keeps flooding for 30 s; c$e: "stream ended" / "script failed (exit N)"; ixn: the one
// notice at expiry). Events reach the session as Claude's <task-notification> once it is idle (deliver, main.cjs:
// workflow-tool-service.cjs notice). The Background tasks pane lists a session's monitors and stops one (list/stop).
//
// No sandbox: a monitor runs as the user (their login shell, PATH and credentials), so the tool asks first (the
// terminal-command card) unless the session runs in Bypass permissions.
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");

const LINE_MAX = 500;
const BATCH_MAX = 3000;
const BATCH_MS = 200;
const BUFFER_MAX = 1024 * 1024;
const TAIL_MAX = 64 * 1024;
// The rate limit: a burst of BUCKET events, then one every REFILL_MS; suppressed for FLOOD_MS on end → stopped.
const BUCKET = 10;
const REFILL_MS = 2000;
const FLOOD_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_TIMEOUT_MS = 3_600_000;
const CAP_TIMEOUT_MS = 1_800_000;
const MAX_PER_SESSION = 8;
const KEEP_FINISHED = 20;

const xml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Claude's ki(): the <task-notification> text (tags on their own lines, then the body). */
function taskNotification({ taskId, toolUseId, status, summary, body = "" }) {
  let head = "<task-notification>";
  for (const [tag, value] of [["task-id", taskId], ["tool-use-id", toolUseId], ["status", status], ["summary", summary]]) if (value) head += `\n<${tag}>${value}</${tag}>`;
  return `${head}${body}\n</task-notification>`;
}
/** zt(ms, {hideTrailingZeros}): "5m", "30m", "1h", "45s". */
function duration(ms) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60), rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60), mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}
/** The deadline a call asks for, as Claude caps it: default 5 minutes, at most 30 (an hour is accepted and capped). */
function monitorTimeout(value) {
  if (value === undefined || value === null) return DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(value) || value < 1000) throw new Error("timeout_ms must be a whole number of milliseconds, at least 1000.");
  if (value > MAX_TIMEOUT_MS) throw new Error(`timeout_ms must be ≤ ${MAX_TIMEOUT_MS}`);
  return Math.min(value, CAP_TIMEOUT_MS);
}

/** d8n: stdout as trimmed lines, batched; flush(final) also takes an unterminated last line. */
function lineBatcher(onBatch, { schedule = (fn) => { const timer = setTimeout(fn, BATCH_MS); return () => clearTimeout(timer); } } = {}) {
  let buffer = "", lines = [], cancel = null;
  const clip = (line) => (line.length > LINE_MAX ? `${line.slice(0, LINE_MAX)}...(truncated)` : line);
  function take(final) {
    if (cancel) { cancel(); cancel = null; }
    if (final && buffer.trim()) { lines.push(clip(buffer.trim())); buffer = ""; }
    if (!lines.length) return undefined;
    let text = lines.join("\n");
    if (text.length > BATCH_MAX) text = `${text.slice(0, BATCH_MAX)}\n...(truncated)`;
    lines = [];
    return text;
  }
  function flush(final = false) { const text = take(final); if (text !== undefined) onBatch(text); }
  function onData(chunk) {
    buffer += chunk;
    if (buffer.length > BUFFER_MAX) buffer = buffer.slice(-BUFFER_MAX);
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) lines.push(clip(line));
    }
    if (lines.length && !cancel) cancel = schedule(() => { cancel = null; flush(false); });
  }
  return { onData, flush, drain: () => take(true) };
}

/**
 * @param {object} o
 * @param {(threadId: string, notification: string) => (void|Promise<void>)} o.deliver  a <task-notification> for the session
 * @param {(event: object) => void} [o.emit]   {kind: "monitors", sessionId, monitors} as a session's list changes
 * @param {() => object} [o.env]               the environment commands run with (the app's, without core secrets)
 * @param {string} [o.shell]                   the login shell that runs them
 * @param {() => number} [o.now]
 */
function createMonitorService({ deliver, emit = () => {}, env = () => process.env, shell = process.env.SHELL || "/bin/zsh", now = Date.now, spawnProcess = spawn, schedule = undefined } = {}) {
  if (typeof deliver !== "function") throw new Error("deliver is required.");
  const monitors = new Map(); // id → record
  const view = (record) => ({ id: record.id, description: record.description, command: record.command, cwd: record.cwd, status: record.status, startedAt: record.startedAt,
    // OC "Stops in {duration}": when a running monitor's deadline ends it.
    ...(record.status === "running" && Number.isFinite(record.stopsAt) ? { stopsAt: record.stopsAt } : {}),
    ...(record.endedAt ? { durationMs: record.endedAt - record.startedAt } : {}), events: record.events, output: record.tail, ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}) });
  const sessionList = (sessionId) => [...monitors.values()].filter((record) => record.sessionId === sessionId);
  const changed = (sessionId) => { try { emit({ kind: "monitors", sessionId, monitors: list(sessionId) }); } catch { /* best effort */ } };
  const send = (record, notification) => { try { void Promise.resolve(deliver(record.sessionId, notification)).catch(() => {}); } catch { /* best effort */ } };
  const event = (record, text) => send(record, taskNotification({ taskId: record.id, summary: `Monitor event: "${xml(record.description)}"`, body: `\n<event>${xml(text)}</event>` }));

  // The last lines when the command ends count as an event unless the monitor is being rate-limited.
  const allowFinal = (record) => record.tokens > 0 || record.suppressed === 0;

  function prune(sessionId) {
    const finished = sessionList(sessionId).filter((record) => record.status !== "running");
    for (const record of finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED))) monitors.delete(record.id);
  }

  function start({ sessionId, cwd, command, description, timeoutMs, toolUseId } = {}) {
    if (typeof sessionId !== "string" || !sessionId) throw new Error("This tool works only in an OpenClaude Desktop session.");
    if (typeof cwd !== "string" || !path.isAbsolute(cwd)) throw new Error("This session has no working folder.");
    if (sessionList(sessionId).filter((record) => record.status === "running").length >= MAX_PER_SESSION)
      throw new Error(`This session already has ${MAX_PER_SESSION} monitors running. Stop one with MonitorStop first.`);
    const deadline = monitorTimeout(timeoutMs);
    const id = `m${crypto.randomBytes(4).toString("hex")}`;
    const record = { id, sessionId, cwd, command, description, toolUseId: typeof toolUseId === "string" ? toolUseId : undefined, status: "running", startedAt: now(), events: 0, tail: "",
      tokens: BUCKET, refilledAt: now(), suppressed: 0, floodSince: undefined, closed: false, stopCause: null, child: null, timer: null };
    const append = (chunk) => { record.tail = (record.tail + chunk).slice(-TAIL_MAX); };
    const allow = () => {
      const at = now();
      record.tokens = Math.min(BUCKET, record.tokens + Math.floor((at - record.refilledAt) / REFILL_MS));
      if (record.tokens < BUCKET) record.refilledAt += Math.floor((at - record.refilledAt) / REFILL_MS) * REFILL_MS; else record.refilledAt = at;
      if (record.tokens <= 0) { record.suppressed += 1; record.lastSuppressedAt = at; record.floodSince ??= at; return false; }
      record.tokens -= 1;
      if (record.suppressed > 0) {
        event(record, `[${record.suppressed} events suppressed — output rate too high. Consider using MonitorStop to restart this monitor with a more selective filter.]`);
        record.suppressed = 0;
        // A flood that only paused for a token keeps its start (Claude's uhn): it ends after quiet for 3 refills.
        if (record.lastSuppressedAt !== undefined && at - record.lastSuppressedAt > REFILL_MS * 3) record.floodSince = undefined;
      }
      record.events += 1;
      return true;
    };
    const batcher = lineBatcher((text) => {
      if (record.closed) return;
      if (allow()) { event(record, text); return; }
      if (record.floodSince !== undefined && now() - record.floodSince > FLOOD_MS) {
        const suppressed = record.suppressed;
        finish(record, "flood");
        event(record, `[Monitor stopped — too much output (${suppressed} events suppressed over ${Math.round((now() - record.floodSince) / 1000)}s). Restart with a more selective source.]`);
      }
    }, schedule ? { schedule } : {});
    record.stopsAt = record.startedAt + deadline;
    record.batcher = batcher;
    let child;
    try {
      child = spawnProcess(shell, ["-lc", command], { cwd, env: env(), stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    } catch (error) { throw new Error(`The monitor couldn’t start: ${error?.message || error}`); }
    record.child = child;
    child.stdout?.setEncoding?.("utf8");
    child.stderr?.setEncoding?.("utf8");
    child.stdout?.on("data", (chunk) => { append(chunk); batcher.onData(chunk); });
    child.stderr?.on("data", (chunk) => append(chunk));
    child.on("error", (error) => { append(`\n${error?.message || error}\n`); exited(record, null, null); });
    child.on("close", (code, signal) => exited(record, code, signal));
    record.timer = setTimeout(() => {
      if (record.status !== "running") return;
      const events = record.events;
      finish(record, "timeout");
      event(record, events === 0
        ? `[Monitor expired after ${duration(deadline)} with no events delivered. Re-arm it if you still need the watch — and widen the filter if silence was unexpected.]`
        : `[Monitor expired after ${duration(deadline)} with ${events} ${events === 1 ? "event" : "events"} delivered. Re-arm it if you still need the watch.]`);
    }, deadline);
    record.timer.unref?.();
    monitors.set(id, record);
    prune(sessionId);
    changed(sessionId);
    return { taskId: id, timeoutMs: deadline };
  }

  function kill(record) {
    const child = record.child;
    if (!child || child.exitCode !== null && child.exitCode !== undefined) return;
    try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGTERM"); else child.kill("SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch { /* gone */ } }
    const hard = setTimeout(() => { try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* gone */ } }, 3000);
    hard.unref?.();
  }
  /** Ends a running monitor for a cause (agent, user, timeout, flood, session, quit); its exit tells the model nothing more. */
  function finish(record, cause) {
    if (record.status !== "running") return false;
    // What the batcher still holds is delivered first, unless the monitor was flooding.
    if (cause !== "flood" && cause !== "quit") { const rest = record.batcher?.drain(); if (rest !== undefined && !record.closed) { record.events += 1; event(record, rest); } }
    record.closed = true;
    record.stopCause = cause;
    record.status = "stopped";
    record.endedAt = now();
    clearTimeout(record.timer);
    kill(record);
    changed(record.sessionId);
    return true;
  }
  function exited(record, code, signal) {
    if (record.status !== "running") { if (record.exitCode === undefined && Number.isInteger(code)) record.exitCode = code; return; }
    const rest = record.batcher?.drain();
    const delivered = rest !== undefined && !record.closed && allowFinal(record);
    record.closed = true;
    clearTimeout(record.timer);
    record.exitCode = Number.isInteger(code) ? code : undefined;
    record.endedAt = now();
    const failed = code !== 0;
    record.status = failed ? "failed" : "completed";
    const exit = code !== null && code !== undefined ? ` (exit ${code})` : signal ? ` (${signal})` : "";
    const summary = failed ? `Monitor "${xml(record.description)}" script failed${exit}` : record.events === 0 && !delivered ? `Monitor "${xml(record.description)}" ended without producing output${exit}` : `Monitor "${xml(record.description)}" stream ended`;
    if (delivered) record.events += 1;
    send(record, taskNotification({ taskId: record.id, toolUseId: record.toolUseId, status: failed ? "failed" : "completed", summary, body: delivered ? `\n<event>${xml(rest)}</event>` : "" }));
    changed(record.sessionId);
  }

  /** MonitorStop (the agent) or the Background tasks pane's Stop (the user): only the session's own monitors. */
  function stop(sessionId, id, { by = "agent" } = {}) {
    const record = monitors.get(id);
    if (!record || record.sessionId !== sessionId) throw new Error(`No monitor ${id} in this session.`);
    if (record.status !== "running") return { stopped: false, status: record.status };
    finish(record, by === "user" ? "user" : "agent");
    return { stopped: true, status: "stopped" };
  }
  function list(sessionId) { return sessionList(sessionId).map(view); }
  function stopSession(sessionId, cause = "session") { let count = 0; for (const record of sessionList(sessionId)) if (finish(record, cause)) count += 1; return count; }
  function dispose() { for (const record of monitors.values()) finish(record, "quit"); }
  return { start, stop, list, stopSession, dispose, get size() { return monitors.size; } };
}

module.exports = { createMonitorService, lineBatcher, monitorTimeout, taskNotification, monitorDuration: duration, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, CAP_TIMEOUT_MS, MAX_PER_SESSION };
