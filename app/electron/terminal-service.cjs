// Built-in terminal pane: the main process owns every PTY (official Claude Desktop runs node-pty in its main process
// the same way). A terminal belongs to one owner, a session (or the New session page's folder), and starts the user's
// login shell in that owner's trusted folder (main.cjs resolves it; the renderer never names a directory). Terminals
// outlive session switches and window reloads, and end when their tab is closed, their session or folder is gone, or
// the app quits (main.cjs's shutdown stop calls dispose()).
//
// Backend: Microsoft's node-pty (N-API prebuild, ABI-stable across Node and Electron; packaged unpacked from the asar,
// see package.json). When it cannot load, /usr/bin/script gives the shell a pseudo-terminal over pipes: everything
// works except resizing, so such a terminal reports `limited` and the pane says so. Never throws at require time.
//
// IPC (install): the preload's desktop.terminal.call(op, params) → "terminal:call", fire-and-forget keystrokes →
// "terminal:write", and output/state events ← "terminal:event". Every call comes from a trusted window (main.cjs's
// sender check); a window may only address terminals of owners it listed, created or attached to.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process");
const model = require("./terminal-model.mjs");
const {prepareTerminalShell,cleanupTerminalShell}=require("./terminal-shell-integration.cjs");
const { proxyEnv, loginShellProxy } = require("./proxy-env.cjs");

const FLUSH_MS = 8;
const FLUSH_CHARS = 256 * 1024;
const BUSY_POLL_MS = 1000;
const SWEEP_MS = 15000;
const KILL_GRACE_MS = 1500;
const SHELL_PROXY_WAIT_MS = 400;
const READY_QUIET_MS = 250, READY_MAX_MS = 5000;
// R4e-terminal (terminal-17): shell mode runs one command at a time per session, after 2.42304.0's runCommand
// (asar index.chunk-D7Sj9EoB.js; token for token the same as 2.37337.1's). A run someone still waits on is refused
// (runCommandInFlight). A run left going after its wait gave up (the 30-minute deadline, or a window that went away) is
// cleared before the next one starts, as the official probe path clears a leftover foreground command: Ctrl-C, then
// SIGKILL, each followed by a poll every Rt=100 ms for up to Lt=1500 ms; still running, it is reset and the new command
// is refused with the advice to re-run it (desktop_ccd_bash_shell_reset). Here a run is its own tab, so "reset" closes
// that tab; a run tab the user has typed into is theirs and is left running.
const RUN_STALE_STEP_MS = 1500, RUN_STALE_POLL_MS = 100;
// A run's caller sends its "wait" right after the reply: until then (or this long), the run counts as waited on.
const RUN_CLAIM_MS = 5000;
const RUN_IN_FLIGHT = "A shell command is already running";
const RUN_STUCK = "The previous command could not be interrupted, so its terminal tab was closed. Re-run your command; if the previous one needs interactive input, run it in the terminal pane.";

/**
 * 2.42304.0 index.chunk-D7Sj9EoB.js Bt: parse `ps -o pgid= -o tpgid= -p <pid>` output into `{pgid, tpgid, busy}`.
 */
function parseForegroundProcessGroup(stdout) {
  const [pgid, tpgid] = String(stdout ?? "").trim().split(/\s+/).map(Number);
  return !(pgid > 0) || !(tpgid > 1) ? null : { pgid, tpgid, busy: pgid !== tpgid };
}

let ptyLoad = null;
/** node-pty, or { error } when the native module cannot load here. Loaded once, lazily. */
function loadNodePty() {
  if (!ptyLoad) {
    try { ptyLoad = { module: require("node-pty") }; }
    catch (error) { ptyLoad = { error: String(error?.message || error) }; }
  }
  return ptyLoad;
}

function isExecutableFile(file) {
  try { return fs.statSync(file).isFile() && (fs.accessSync(file, fs.constants.X_OK), true); } catch { return false; }
}
/** The user's login shell: an override (tests), $SHELL, the account's shell, else zsh/bash/sh. Always absolute. */
function resolveShell({ override = null, env = process.env } = {}) {
  let account = null;
  try { account = os.userInfo().shell; } catch {}
  for (const candidate of [override, env.SHELL, account, "/bin/zsh", "/bin/bash", "/bin/sh"])
    if (typeof candidate === "string" && path.isAbsolute(candidate) && !candidate.includes("\0") && isExecutableFile(candidate)) return candidate;
  return "/bin/sh";
}
/**
 * The terminal's environment: the app's own (a Finder launch's launchd environment) with the PATH additions and the
 * login shell's proxy variables the cores get (codex.cjs, proxy-env.cjs), Electron's and the app's internal variables
 * removed, and the terminal identification a TUI looks for. The shell then runs its own startup files on top.
 */
function terminalEnv(base = process.env, { shellProxy = {}, version = "", strip = [], appendPath = [] } = {}) {
  const env = {};
  // strip: the app's own secrets that sit in its environment for the cores (a saved API key, a relay's base URL, …);
  // a value the user exports in their shell's startup files still loads, since the shell runs those afterwards.
  const stripped = new Set(Array.isArray(strip) ? strip.filter((key) => typeof key === "string") : []);
  for (const [key, value] of Object.entries(base || {}))
    if (typeof value === "string" && !value.includes("\0") && !/^(?:ELECTRON_|CODE_DESKTOP_)/.test(key) && !stripped.has(key)) env[key] = value;
  const extra = [path.join(env.HOME || os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  const parts = (env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin").split(":").filter(Boolean);
  // appendPath: the app's own command shims (the agents it installed), after everything else on PATH.
  const tail = (Array.isArray(appendPath) ? appendPath : []).filter((entry) => typeof entry === "string" && path.isAbsolute(entry) && !entry.includes(":") && !parts.includes(entry));
  env.PATH = [...extra.filter((entry) => !parts.includes(entry)), ...parts, ...tail].join(":");
  Object.assign(env, proxyEnv(env, shellProxy));
  env.TERM = "xterm-256color";
  env.COLORTERM = "truecolor";
  env.TERM_PROGRAM = "CodeDesktop";
  if (version) env.TERM_PROGRAM_VERSION = String(version);
  if (!env.LANG && !env.LC_ALL && !env.LC_CTYPE) env.LANG = "en_US.UTF-8";
  delete env.TERM_SESSION_ID;
  return env;
}

/**
 * options:
 *   resolveOwner({ sessionId, homeWorkspace }) → absolute trusted folder (throws for an unknown session / folder)
 *   ownerAlive(owner, sessionId) → false once the session is gone (deleted); the folder itself is checked here
 *   shell: override path (tests / CODE_DESKTOP_TERMINAL_SHELL)    baseEnv: environment to start from (tests)
 *   stripEnv: () => variable names never handed to a shell (the app's saved keys exported for its cores)
 *   appendPath: () => folders added at the end of PATH (the app's shims for the agents it installed)
 *   shellProxy: () => Promise<proxy vars> | null (skip)            version: TERM_PROGRAM_VERSION
 *   loadPty: () => { module } | { error }                          forceScript: use the /usr/bin/script backend
 *   onChange(): a terminal started, exited, was closed or its busy state changed (quit guard, menus)
 */
function createTerminalService(options = {}) {
  const {
    resolveOwner = () => { throw new Error("Unknown session."); },
    ownerAlive = () => true,
    shellProxy = loginShellProxy,
    version = "",
    loadPty = loadNodePty,
    forceScript = false,
    processTable = null,
    killProcess = null,
    onChange = () => {},
  } = options;
  const records = new Map();
  const ownerSubscribers = new Map(); // owner → Set<webContents>
  const everyone = new Set(); // windows that talk to this service: state and agent-open notices
  let busyTimer = null, sweepTimer = null, disposed = false;

  const shellPath = () => resolveShell({ override: options.shell ?? null, env: options.baseEnv ?? process.env });
  const live = (contents) => contents && !(typeof contents.isDestroyed === "function" && contents.isDestroyed());
  function deliver(contents, payload) {
    try { if (live(contents)) contents.send("terminal:event", payload); } catch {}
  }
  function forget(contents) {
    everyone.delete(contents);
    for (const set of ownerSubscribers.values()) set.delete(contents);
    // A window that closed no longer shows its terminals: the others' sizes decide again.
    for (const record of records.values()) if (record.viewers?.delete(contents)) applyViewerSize(record);
  }
  function subscribe(contents, owner = null) {
    if (!contents) return;
    if (!everyone.has(contents)) {
      everyone.add(contents);
      try { contents.once?.("destroyed", () => forget(contents)); } catch {}
    }
    if (owner) {
      if (!ownerSubscribers.has(owner)) ownerSubscribers.set(owner, new Set());
      ownerSubscribers.get(owner).add(contents);
    }
  }
  const toOwner = (owner, payload) => { for (const contents of ownerSubscribers.get(owner) ?? []) deliver(contents, payload); };
  const toEveryone = (payload) => { for (const contents of everyone) deliver(contents, payload); };
  const changed = () => { try { onChange(); } catch {} };

  function info(record) {
    return {
      id: record.id, owner: record.owner, sessionId: record.sessionId, number: record.number, title: record.title,
      cwd: record.cwd, shell: record.shell ?? null, shellIntegration: record.shellIntegration?.kind ?? null, status: record.status, exitCode: record.exitCode, signal: record.signal, backend: record.backend,
      limited: record.backend === "script", busy: record.busy, openedBy: record.openedBy, userTyped: record.userTyped,
      generation: record.generation, createdAt: record.createdAt, error: record.error ?? null,
    };
  }
  const publish = (record) => { toEveryone({ kind: "state", info: info(record) }); changed(); };

  function output(record) {
    if (record.chunks.length > 1) record.chunks = [record.chunks.join("")];
    return record.chunks[0] ?? "";
  }
  function append(record, data) {
    if (!data) return;
    record.chunks.push(data);
    record.kept += data.length;
    record.total += data.length;
    record.lastOutputAt = Date.now();
    if (record.kept > model.OUTPUT_KEEP_CHARS * 1.5) {
      const text = model.trimOutput(output(record));
      record.chunks = [text];
      record.kept = text.length;
    }
    record.pending += data;
    if (record.pending.length >= FLUSH_CHARS) flush(record);
    else if (!record.flushTimer) record.flushTimer = setTimeout(() => flush(record), FLUSH_MS);
    for (const wake of [...record.waiters]) wake();
  }
  function flush(record) {
    clearTimeout(record.flushTimer);
    record.flushTimer = null;
    if (!record.pending) return;
    const data = record.pending;
    record.pending = "";
    toOwner(record.owner, { kind: "data", id: record.id, data, end: record.total });
  }

  function startProcess(record, size) {
    const shell = shellPath();
    record.shell = shell;
    let env = record.env;
    let args = typeof record.runCommand === "string" ? ["-lc", record.runCommand] : ["-l"];
    cleanupTerminalShell(record.shellIntegration);
    record.shellIntegration=null;
    try {
      const directory=typeof options.shellIntegrationDir==='function'?options.shellIntegrationDir():options.shellIntegrationDir;
      record.shellIntegration=prepareTerminalShell({shell,args,env,directory});
      if(record.shellIntegration){args=record.shellIntegration.args;env=record.shellIntegration.env;}
    } catch { /* Startup still works when the optional integration directory cannot be written. */ }
    let pty = forceScript ? { error: "forced" } : loadPty();
    const generation = record.generation;
    const exited = (exitCode, signal) => {
      if (record.generation !== generation || records.get(record.id) !== record) return;
      flush(record);
      cleanupTerminalShell(record.shellIntegration);
      record.proc = null;
      record.status = "exited";
      record.exitCode = Number.isInteger(exitCode) ? exitCode : null;
      record.signal = signal ? String(signal) : null;
      record.busy = false;
      publish(record);
    };
    let proc = null;
    if (pty.module) {
      // A shell-mode run ('!command' in the composer) is a login shell running just that command; a tab, an interactive one.

      try { proc = pty.module.spawn(shell, args, { name: "xterm-256color", cols: size.cols, rows: size.rows, cwd: record.cwd, env, encoding: "utf8" }); }
      catch (error) { pty = { error: String(error?.message || error) }; }
    }
    if (proc) {
      record.backend = "pty";
      record.error = null;
      record.proc = { pid: proc.pid, write: (data) => proc.write(data), resize: (c, r) => proc.resize(c, r),
        kill: (signal) => proc.kill(signal), foreground: () => proc.process };
      record.idleProgram = null;
      proc.onData((data) => {
        if (record.generation !== generation) return;
        if (record.idleProgram === null) { try { record.idleProgram = proc.process || ""; } catch { record.idleProgram = ""; } }
        append(record, data);
      });
      proc.onExit(({ exitCode, signal }) => exited(exitCode, signal));
      return;
    }
    // /usr/bin/script fallback: a pseudo-terminal of fixed size. script refuses a socket on stdin (Node's stdio pipes
    // are sockets; a FIFO fails the same way), so a cat in front feeds it through a real pipe. When script ends, the
    // wrapper reports its status on fd 3 and the whole process group (cat, the wrapper) is hung up. The shell path and
    // size travel as positional arguments, never as shell source, so nothing the user names can inject a command.
    record.backend = "script";
    record.error = pty.error === "forced" ? null : pty.error ?? null;
    // Arguments remain positional for both the source integration planner and command runs.
    const wrapper = `cat | { /usr/bin/script -q /dev/null /bin/sh -c 'stty rows "$1" cols "$2" 2>/dev/null; shift 2; exec "$0" "$@"' "$0" "$@" 3>&-; echo "$?" >&3; }`;
    const child = spawn("/bin/sh", ["-c", wrapper, shell, String(size.rows), String(size.cols), ...args], {
      cwd: record.cwd, env: { ...env, COLUMNS: String(size.cols), LINES: String(size.rows) }, stdio: ["pipe", "pipe", "pipe", "pipe"], detached: true,
    });
    const signalGroup = (signal) => { try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch {} } };
    record.proc = { pid: child.pid, group: true, write: (data) => { try { child.stdin.write(data); } catch {} }, resize: () => {},
      kill: signalGroup, foreground: null };
    let status = null;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data) => { if (record.generation === generation) append(record, data); });
    child.stderr.on("data", (data) => { if (record.generation === generation) append(record, data); });
    child.stdio[3]?.on("data", (data) => {
      const code = Number.parseInt(String(data).trim(), 10);
      status = Number.isInteger(code) ? code : null;
      // The shell is gone: let its last output arrive, then report and hang up cat and the wrapper.
      setTimeout(() => { exited(status, null); signalGroup("SIGHUP"); }, 30);
    });
    child.stdio[3]?.on("error", () => {});
    child.stdin.on("error", () => {});
    child.on("error", (error) => { append(record, `\r\n${error.message}\r\n`); exited(null, null); });
    child.on("exit", (code, signal) => exited(status ?? code, status === null ? signal : null));
  }
  function agentFolderProblem(record) {
    let real = null, root = null;
    try { real = fs.realpathSync(record.cwd); } catch { return "The folder no longer exists, so nothing was run."; }
    if (real !== record.cwd) return "The folder changed after it was approved (a link now points elsewhere), so nothing was run.";
    try { root = fs.realpathSync(resolveOwner({ sessionId: record.sessionId })); } catch { return "The session folder is not available, so nothing was run."; }
    if (real !== root && !real.startsWith(root + path.sep)) return "The folder is no longer inside the session’s folder, so nothing was run.";
    return null;
  }
  async function start(record, size) {
    let stat = null;
    try { stat = fs.statSync(record.cwd); } catch {}
    if (!stat?.isDirectory()) throw new Error("The session folder no longer exists.");
    let proxy = {};
    if (typeof shellProxy === "function") {
      // Cached after the first read (shared with the cores); never hold a new tab for long, the shell's own startup
      // files export the proxy anyway.
      proxy = await Promise.race([Promise.resolve().then(shellProxy).catch(() => ({})),
        new Promise((resolve) => setTimeout(() => resolve({}), SHELL_PROXY_WAIT_MS).unref?.())]) || {};
    }
    let strip = [];
    try { strip = typeof options.stripEnv === "function" ? options.stripEnv() || [] : []; } catch { strip = []; }
    let appendPath = [];
    try { appendPath = typeof options.appendPath === "function" ? options.appendPath() ?? [] : []; } catch { appendPath = []; }
    record.env = terminalEnv(options.baseEnv ?? process.env, { shellProxy: proxy, version, strip, appendPath });
    // A tab the agent opened starts in the real folder the user approved (agent-tools/terminal.mjs resolves it):
    // checked again right before the shell starts, so a link swapped in meanwhile can't move it outside the session.
    if (record.openedBy === "agent") { const problem = agentFolderProblem(record); if (problem) throw new Error(problem); }
    record.status = "running";
    record.exitCode = null;
    record.signal = null;
    record.busy = false;
    startProcess(record, size);
    ensureTimers();
  }
  function stop(record, signal = "SIGHUP") {
    const proc = record.proc;
    cleanupTerminalShell(record.shellIntegration);
    record.proc = null;
    if (!proc) return;
    try { proc.kill(signal); } catch {}
    const pid = proc.pid;
    if (Number.isInteger(pid) && processTable === null && typeof killProcess !== "function") {
      const target = proc.group ? -pid : pid;
      const timer = setTimeout(() => { try { process.kill(target, 0); process.kill(target, "SIGKILL"); } catch {} }, KILL_GRACE_MS);
      timer.unref?.();
    }
  }

  function ownerRecords(owner) {
    return [...records.values()].filter((record) => record.owner === owner).sort((a, b) => a.createdAt - b.createdAt || a.seq - b.seq);
  }
  let created = 0;
  async function create({ owner, sessionId = null, cwd, cols, rows, title = null, openedBy = "user", runCommand = null }) {
    if (disposed) throw new Error("The app is quitting.");
    const mine = ownerRecords(owner);
    if (mine.length >= model.MAX_TERMINALS_PER_OWNER) throw new Error("Too many terminals are open in this session.");
    let id;
    do id = `term-${crypto.randomBytes(9).toString("hex").slice(0, 12)}`; while (records.has(id));
    const record = {
      id, owner, sessionId, cwd, seq: ++created, number: model.nextNumber(mine.map((entry) => entry.number)), title: model.cleanTitle(title),
      status: "starting", exitCode: null, signal: null, backend: null, busy: null, openedBy: openedBy === "agent" ? "agent" : "user",
      userTyped: false, generation: 1, createdAt: Date.now(), chunks: [], kept: 0, total: 0, pending: "", flushTimer: null,
      waiters: new Set(), proc: null, size: model.clampSize(cols, rows), lastOutputAt: 0,
      ...(typeof runCommand === "string" ? { runCommand } : {}),
    };
    records.set(id, record);
    try { await start(record, record.size); }
    catch (error) { records.delete(id); throw error; }
    publish(record);
    return info(record);
  }
  function close(record, reason = "closed") {
    if (records.get(record.id) !== record) return false;
    flush(record);
    stop(record);
    records.delete(record.id);
    clearTimeout(record.flushTimer);
    for (const wake of [...record.waiters]) wake();
    toEveryone({ kind: "removed", id: record.id, owner: record.owner, reason });
    changed();
    return true;
  }
  async function restart(record) {
    stop(record);
    record.generation += 1;
    record.chunks = [];
    record.kept = 0;
    record.pending = "";
    record.userTyped = false;
    // A run tab the user restarted from its overlay runs its command again on the user's behalf: like one they typed
    // into, it is theirs now, so a later shell-mode run neither interrupts nor waits on it (userTyped stays false so the
    // pane's typed-exit auto-close does not apply to it).
    if (typeof record.runCommand === "string") record.userRestarted = true;
    record.error = null;
    await start(record, record.size);
    publish(record);
    return info(record);
  }
  function write(record, data, { source = "user" } = {}) {
    if (!record.proc || record.status !== "running") return false;
    if (source === "user" && !record.userTyped) { record.userTyped = true; publish(record); }
    record.proc.write(data);
    return true;
  }
  // One PTY, any number of viewers (a terminal shown in two windows): like tmux, it runs at the smallest viewer's size,
  // so no window's xterm is narrower than what the shell draws. Each viewer's last size is kept by its webContents; a
  // viewer that stops showing the terminal ("detach", or its window closing) no longer counts.
  function applyViewerSize(record) {
    const sizes = [...(record.viewers?.values() ?? [])];
    if (!sizes.length) return record.size;
    const size = model.clampSize(Math.min(...sizes.map((entry) => entry.cols)), Math.min(...sizes.map((entry) => entry.rows)));
    if (record.size?.cols === size.cols && record.size?.rows === size.rows) return size;
    record.size = size;
    if (record.proc && record.backend === "pty") { try { record.proc.resize(size.cols, size.rows); } catch {} }
    return size;
  }
  function resize(record, cols, rows, viewer = null) {
    const size = model.clampSize(cols, rows);
    if (!viewer) {
      record.size = size;
      if (record.proc && record.backend === "pty") { try { record.proc.resize(size.cols, size.rows); } catch {} }
      return size;
    }
    if (!record.viewers) record.viewers = new Map();
    record.viewers.set(viewer, size);
    return applyViewerSize(record);
  }
  function detach(record, viewer) {
    if (viewer && record.viewers?.delete(viewer)) applyViewerSize(record);
    return record.size;
  }

  // Busy: the PTY's foreground program is not the shell. node-pty reads it from the terminal (tcgetpgrp); the script
  // backend asks pgrep for the shell's children instead.
  // The shell's current folder (real path), or null: node-pty's process is the shell; the script backend's shell is
  // script's child (wrapper → … → script → the shell). macOS: lsof's cwd; Linux: /proc/<pid>/cwd.
  async function shellCwd(record) {
    if (!record.proc?.pid || record.status !== "running") return null;
    const run = (file, args) => new Promise((resolve) => execFile(file, args, { timeout: 1500, maxBuffer: 4 << 20 }, (error, stdout) => resolve(error ? "" : String(stdout))));
    let pid = String(record.proc.pid);
    if (record.backend === "script") {
      const children = new Map(), names = new Map();
      for (const line of (await run("/bin/ps", ["-A", "-o", "pid=,ppid=,comm="])).split("\n")) {
        const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
        if (!match) continue;
        names.set(match[1], match[3].trim());
        if (!children.has(match[2])) children.set(match[2], []);
        children.get(match[2]).push(match[1]);
      }
      const queue = [pid];
      let script = null;
      for (let depth = 0; queue.length && depth < 256 && !script; depth++) {
        const next = queue.shift();
        if (next !== pid && /(^|\/)script$/.test(names.get(next) ?? "")) script = next;
        else queue.push(...(children.get(next) ?? []));
      }
      const shell = script ? children.get(script)?.[0] : null;
      if (!shell) return null;
      pid = shell;
    }
    let dir = null;
    if (process.platform === "linux") { try { dir = await fs.promises.readlink(`/proc/${pid}/cwd`); } catch { dir = null; } }
    else dir = (await run("/usr/sbin/lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"])).split("\n").find((line) => line.startsWith("n"))?.slice(1) ?? null;
    if (!dir || !path.isAbsolute(dir)) return null;
    try { return await fs.promises.realpath(dir); } catch { return null; }
  }
  function foregroundBusy(record) {
    if (!record.proc || record.status !== "running") return false;
    if (record.proc.foreground) {
      try { return model.isBusyProcess(record.proc.foreground(), record.shell, record.idleProgram); } catch { return null; }
    }
    return record.busy;
  }
  // Script backend: wrapper → … → script → the shell (its own session on the pseudo-terminal) → commands.
  function scriptBusy(record) {
    return new Promise((resolve) => {
      execFile("/bin/ps", ["-A", "-o", "pid=,ppid=,comm="], { timeout: 1500, maxBuffer: 4 << 20 }, (error, stdout) => {
        if (error || !record.proc) { resolve(record.busy ?? null); return; }
        const children = new Map(), names = new Map();
        for (const line of String(stdout).split("\n")) {
          const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
          if (!match) continue;
          names.set(match[1], match[3].trim());
          if (!children.has(match[2])) children.set(match[2], []);
          children.get(match[2]).push(match[1]);
        }
        const queue = [String(record.proc.pid)];
        let script = null;
        for (let depth = 0; queue.length && depth < 64 && !script; depth++) {
          const pid = queue.shift();
          if (depth > 0 && /(^|\/)script$/.test(names.get(pid) ?? "")) script = pid;
          else queue.push(...(children.get(pid) ?? []));
        }
        const shell = script ? (children.get(script) ?? [])[0] : null;
        resolve(shell ? (children.get(shell) ?? []).length > 0 : false);
      });
    });
  }
  async function pollBusy() {
    for (const record of records.values()) {
      if (record.status !== "running") continue;
      const busy = record.backend === "script" ? await scriptBusy(record) : foregroundBusy(record);
      if (records.get(record.id) === record && busy !== record.busy && record.status === "running") { record.busy = busy; publish(record); }
    }
  }
  // A gone session closes its terminals. A gone folder doesn't: the tab stays with its scrollback and says so; an idle
  // shell ends, while a running command keeps running (deleting or renaming the folder doesn't stop it).
  const FOLDER_GONE = "The session folder no longer exists.";
  function sweep() {
    for (const record of [...records.values()]) {
      let owned = true;
      try { owned = ownerAlive(record.owner, record.sessionId) !== false; } catch { owned = false; }
      if (!owned) { close(record, "session-gone"); continue; }
      let folder = true;
      try { folder = fs.statSync(record.cwd).isDirectory(); } catch { folder = false; }
      if (folder) { if (record.error === FOLDER_GONE) { record.error = null; publish(record); } continue; }
      if (record.error !== FOLDER_GONE) { record.error = FOLDER_GONE; publish(record); }
      if (record.status === "running" && record.busy === false) stop(record);
    }
  }
  function ensureTimers() {
    if (disposed) return;
    if (!busyTimer) { busyTimer = setInterval(() => { void pollBusy(); }, BUSY_POLL_MS); busyTimer.unref?.(); }
    if (!sweepTimer) { sweepTimer = setInterval(sweep, SWEEP_MS); sweepTimer.unref?.(); }
  }

  function owned(owner, id) {
    if (!model.isTerminalId(id)) throw new Error("Unknown terminal.");
    const record = records.get(id);
    if (!record || record.owner !== owner) throw new Error("Unknown terminal.");
    return record;
  }
  /** Resolve the renderer's {sessionId, homeWorkspace} to the owner key and its trusted folder. */
  function ownerOf(params) {
    const sessionId = params?.sessionId ?? null;
    if (sessionId !== null && !model.isSessionId(sessionId)) throw new Error("Unknown session.");
    const homeWorkspace = sessionId === null && typeof params?.homeWorkspace === "string" ? params.homeWorkspace : undefined;
    const cwd = resolveOwner({ sessionId, homeWorkspace });
    if (typeof cwd !== "string" || !path.isAbsolute(cwd) || cwd.includes("\0")) throw new Error("The session working directory is not available yet.");
    return { owner: model.ownerKey(sessionId, cwd), sessionId, cwd };
  }

  // ---- Shell-mode runs (R4e-terminal, terminal-17; see RUN_STALE_STEP_MS) ----
  const runsStarting = new Set(); // owners whose "run" is clearing a leftover or starting its tab
  /** A run whose result is still waited on: a "wait" in progress, or a run just started whose "wait" is on its way. */
  function runInFlight(record) {
    if (typeof record.runCommand !== "string" || record.status === "exited") return false;
    return record.runWaits > 0 || (!record.runWaited && Date.now() - record.createdAt < RUN_CLAIM_MS);
  }
  /**
   * 2.42304.0 index.chunk-D7Sj9EoB.js probeForegroundProcessGroup: `ps -o pgid= -o tpgid= -p <pid>` via execFile
   * (no shell), or an injected `processTable` in tests.
   */
  async function probeForegroundProcessGroup(record) {
    const pid = record?.proc?.pid;
    if (record?.status !== "running" || records.get(record?.id) !== record || !Number.isInteger(pid) || pid <= 0) return null;
    if (processTable !== null && processTable !== undefined) {
      let raw = null;
      if (typeof processTable === "function") raw = await processTable(pid);
      else if (processTable instanceof Map) raw = processTable.get(pid) ?? processTable.get(String(pid)) ?? null;
      else if (Array.isArray(processTable)) raw = processTable.find((row) => Number(row?.pid) === pid) ?? null;
      else if (typeof processTable === "object") {
        raw = typeof processTable.probe === "function" ? await processTable.probe(pid) : processTable[pid] ?? null;
      }
      if (typeof raw === "string") return parseForegroundProcessGroup(raw);
      if (raw && typeof raw === "object") return parseForegroundProcessGroup(`${raw.pgid ?? pid} ${raw.tpgid}`);
      return null;
    }
    if (record.backend !== "pty") return null;
    return new Promise((resolve) => {
      execFile("/bin/ps", ["-o", "pgid=", "-o", "tpgid=", "-p", String(pid)], { timeout: 1500 }, (error, stdout) => {
        resolve(error ? null : parseForegroundProcessGroup(stdout));
      });
    });
  }
  function killProcessGroup(pgid, signal = "SIGKILL") {
    if (!Number.isInteger(pgid) || pgid <= 1) return false;
    if (typeof killProcess === "function") {
      killProcess(-pgid, signal);
      return true;
    }
    if (processTable !== null && processTable !== undefined) {
      if (Array.isArray(processTable.kills)) processTable.kills.push({ target: -pgid, pgid, signal });
      if (typeof processTable.kill === "function") {
        processTable.kill(-pgid, signal);
        return true;
      }
      if (processTable instanceof Map) {
        for (const [key, row] of [...processTable.entries()]) {
          if (!row || typeof row !== "object" || row.ignoreKill) continue;
          const rowPgid = Number(row.pgid ?? key);
          if (rowPgid === pgid) processTable.delete(key);
          else if (Number(row.tpgid) === pgid) row.tpgid = rowPgid;
        }
        return true;
      }
      if (Array.isArray(processTable)) {
        for (let index = processTable.length - 1; index >= 0; index -= 1) {
          const row = processTable[index];
          if (!row || typeof row !== "object" || row.ignoreKill) continue;
          const rowPgid = Number(row.pgid ?? row.pid);
          if (rowPgid === pgid) processTable.splice(index, 1);
          else if (Number(row.tpgid) === pgid) row.tpgid = rowPgid;
        }
        return true;
      }
      return true;
    }
    process.kill(-pgid, signal);
    return true;
  }
  /**
   * 2.42304.0 index.chunk-D7Sj9EoB.js runCommand: probe the shell's foreground process group (`ps -o pgid= -o tpgid= -p`),
   * send Ctrl-C and then `process.kill(-tpgid, "SIGKILL")` (falling back to the shell's process group `-pid` when `ps`
   * cannot find `tpgid`), polling every Rt=100 ms for up to Lt=1500 ms until the foreground group is no longer busy.
   */
  async function interruptRun(record) {
    const ended = () => record.status !== "running" || records.get(record.id) !== record;
    const isRunTab = typeof record.runCommand === "string";
    for (const step of ["\u0003", "SIGKILL"]) {
      if (ended()) return step === "SIGKILL" ? "sigint" : "idle";
      const probe = await probeForegroundProcessGroup(record);
      let stepProbe = Boolean(probe), stepBusy = Boolean(probe?.busy);
      // Official interactive -l bash PTYs sit idle at a prompt with pgid === tpgid (!probe.busy). Host run tabs
      // run a dedicated non-interactive -lc <command> shell (job control off by default, so pgid === tpgid while the
      // command runs) and are only done once the -lc shell itself exits (ended()).
      if (probe && !probe.busy && !isRunTab) return step === "SIGKILL" ? "sigint" : "idle";
      const shellPid = Number.isInteger(record.proc?.pid) && record.proc.pid > 1 ? record.proc.pid : null;
      const targetPgid = probe?.tpgid > 1 ? probe.tpgid : shellPid;
      let killedShell = !stepProbe || (processTable === null && targetPgid === shellPid);
      if (step === "SIGKILL") {
        if (targetPgid !== null) {
          try { killProcessGroup(targetPgid, "SIGKILL"); } catch {}
          if (killedShell) { try { record.proc?.kill("SIGKILL"); } catch {} }
        } else {
          try { record.proc?.kill("SIGKILL"); } catch {}
        }
      } else {
        write(record, step, { source: "agent" });
      }
      const deadline = Date.now() + RUN_STALE_STEP_MS;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, RUN_STALE_POLL_MS));
        if (ended()) return step === "SIGKILL" ? "sigkill" : "sigint";
        const next = await probeForegroundProcessGroup(record);
        if (next) stepProbe = true;
        if (next?.busy) stepBusy = true;
        const groupCleared = stepBusy ? !next?.busy : (stepProbe && next === null);
        if (groupCleared) {
          if (!ended() && step === "SIGKILL" && !killedShell) {
            killedShell = true;
            if (shellPid !== null && shellPid !== targetPgid) {
              try { killProcessGroup(shellPid, "SIGKILL"); } catch {}
            }
            try { record.proc?.kill("SIGKILL"); } catch {}
            await new Promise((resolve) => queueMicrotask(resolve));
          }
          if (ended() || !isRunTab) return step === "SIGKILL" ? "sigkill" : "sigint";
        }
      }
    }
    return "stuck";
  }
  /** Before a run: the owner's leftover runs are interrupted (true when one was); one that won't end is closed (throws). */
  async function clearLeftoverRuns(owner) {
    let interrupted = false;
    for (const record of ownerRecords(owner)) {
      if (typeof record.runCommand !== "string" || record.status !== "running" || runInFlight(record) || record.userTyped || record.userRestarted) continue;
      const outcome = await interruptRun(record);
      if (outcome === "stuck") { close(record); throw new Error(RUN_STUCK); }
      if (outcome === "sigint" || outcome === "sigkill") interrupted = true;
    }
    return interrupted;
  }

  /** Wait for the shell's startup files (first output, then a short quiet spell); throws when it never got there. */
  async function shellReady(record) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < READY_MAX_MS && record.status === "running") {
      if (record.total > 0 && Date.now() - record.lastOutputAt >= READY_QUIET_MS) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (record.status !== "running" || records.get(record.id) !== record) throw new Error("The terminal wasn’t ready, so the command wasn’t run");
  }

  /** One renderer request; `sender` is the trusted webContents. */
  async function call(op, params = {}, sender = null) {
    if (params === null || typeof params !== "object" || Array.isArray(params)) throw new Error("Invalid terminal request.");
    switch (op) {
      case "hello": subscribe(sender); return { backend: forceScript ? "script" : loadPty().module ? "pty" : "script" };
      case "list": {
        const { owner } = ownerOf(params);
        subscribe(sender, owner);
        return ownerRecords(owner).map(info);
      }
      case "create": {
        const { owner, sessionId, cwd } = ownerOf(params);
        // params.cwd: a folder inside the owner's (the Files tree's and the git band's "Open in terminal"); anything
        // else, or one that doesn't exist, is refused.
        let start = cwd;
        if (params.cwd !== undefined && params.cwd !== null) {
          if (typeof params.cwd !== "string" || !path.isAbsolute(params.cwd) || params.cwd.includes("\0")) throw new Error("That folder isn’t in this session’s folder.");
          let root, real;
          try { root = fs.realpathSync(cwd); real = fs.realpathSync(params.cwd); } catch { throw new Error("That folder isn’t in this session’s folder."); }
          if (real !== root && !real.startsWith(root + path.sep)) throw new Error("That folder isn’t in this session’s folder.");
          if (!fs.statSync(real).isDirectory()) throw new Error("That folder isn’t in this session’s folder.");
          start = real;
        }
        subscribe(sender, owner);
        return create({ owner, sessionId, cwd: start, cols: params.cols, rows: params.rows, title: params.title ?? null });
      }
      case "attach": {
        const { owner } = ownerOf(params);
        const record = owned(owner, params.id);
        subscribe(sender, owner);
        flush(record);
        // size: the PTY's, which the output was drawn at (the viewer replays at it, then fits its pane).
        return { info: info(record), output: output(record), end: record.total, size: record.size };
      }
      case "resize": {
        const { owner } = ownerOf(params);
        return resize(owned(owner, params.id), params.cols, params.rows, sender);
      }
      case "detach": {
        const { owner } = ownerOf(params);
        return detach(owned(owner, params.id), sender);
      }
      case "rename": {
        const { owner } = ownerOf(params);
        const record = owned(owner, params.id);
        record.title = model.cleanTitle(params.title);
        publish(record);
        return info(record);
      }
      case "restart": {
        const { owner } = ownerOf(params);
        return restart(owned(owner, params.id));
      }
      case "close": {
        const { owner } = ownerOf(params);
        return close(owned(owner, params.id));
      }
      case "run": {
        // Shell mode on a core without its own ('!command'): a tab running just that command in the session folder,
        // whose output "wait" hands back for the model.
        const { owner, sessionId, cwd } = ownerOf(params);
        const command = typeof params.command === "string" ? params.command.trim() : "";
        if (!command || command.length > 8000 || command.includes("\0")) throw new Error("Enter a shell command.");
        if (sessionId === null) throw new Error("Start a local session first to run shell commands.");
        // R4e-terminal (terminal-17): refused only while a run is still waited on; a leftover one is interrupted first.
        if (runsStarting.has(owner) || ownerRecords(owner).some(runInFlight)) throw new Error(RUN_IN_FLIGHT);
        runsStarting.add(owner);
        let opened, interruptedPrevious;
        try {
          interruptedPrevious = await clearLeftoverRuns(owner);
          subscribe(sender, owner);
          opened = await create({ owner, sessionId, cwd, cols: params.cols, rows: params.rows, title: command.split("\n")[0].slice(0, 40), runCommand: command });
        } finally { runsStarting.delete(owner); }
        // The official bash turn tells the model (interruptedPrevious); "wait" hands it back with the run's output.
        if (interruptedPrevious) { const record = records.get(opened.id); if (record) record.interruptedPrevious = true; opened = { ...opened, interruptedPrevious: true }; }
        // quiet: a code block's run whose output goes to the model (B20) doesn't open the pane (c03935b01 Vt).
        if (params.quiet !== true) toEveryone({ kind: "opened", id: opened.id, owner, sessionId, openedBy: "user" });
        return opened;
      }
      case "probe": {
        // A code block's Run (B20; c11959232 getBusyShellPtyKeys): which of the owner's interactive shells are live,
        // and which run a command (busy) or can't be told (unknown), read now rather than from the poll.
        const { owner } = ownerOf(params);
        subscribe(sender, owner);
        const live = [], busy = [], unknown = [];
        for (const record of ownerRecords(owner)) {
          if (record.status !== "running" || typeof record.runCommand === "string") continue;
          live.push(record.id);
          const state = record.backend === "script" ? await scriptBusy(record) : foregroundBusy(record);
          if (state === true) busy.push(record.id); else if (state !== false) unknown.push(record.id);
        }
        return { live, busy, unknown };
      }
      case "ready": {
        // A code block's Run (B20): the shell is ready for a command once its startup files are done; `at` is where its
        // output stood then, so what follows is the command's.
        const { owner } = ownerOf(params);
        const record = owned(owner, params.id);
        await shellReady(record);
        flush(record);
        return { at: record.total };
      }
      case "wait": {
        // A shell-mode run's end: its exit code and output (plain text, the last lines), or {running: true} at the deadline.
        const { owner } = ownerOf(params);
        const record = owned(owner, params.id);
        const deadline = Date.now() + Math.min(30 * 60 * 1000, Math.max(0, Number(params.timeoutMs) || 0));
        // R4e-terminal (terminal-17): the run counts as waited on until this returns (runInFlight); a window that went
        // away stops waiting, so its run can be cleared by the next one.
        record.runWaits = (record.runWaits ?? 0) + 1;
        record.runWaited = true;
        try {
          while (record.status === "running" && records.get(record.id) === record && Date.now() < deadline && (sender === null || live(sender))) {
            await new Promise((resolve) => { const timer = setTimeout(resolve, 1000); const wake = () => { clearTimeout(timer); record.waiters.delete(wake); resolve(); }; record.waiters.add(wake); });
          }
        } finally { record.runWaits -= 1; }
        flush(record);
        const text = model.lastLines(output(record), 400, record.size?.cols);
        return { running: record.status === "running", exitCode: record.exitCode, signal: record.signal, output: text.length > 20000 ? text.slice(-20000) : text, closed: records.get(record.id) !== record,
          ...(record.interruptedPrevious ? { interruptedPrevious: true } : {}) };
      }
      case "adopt": {
        // A session started from the New session page takes that page's terminals (same folder): they stay open, with
        // their running commands and scrollback, in the session the first prompt created.
        const target = ownerOf({ sessionId: params.sessionId });
        if (target.sessionId === null) throw new Error("Unknown session.");
        const from = ownerOf({ sessionId: null, homeWorkspace: params.homeWorkspace });
        const real = (dir) => { try { return fs.realpathSync(dir); } catch { return dir; } };
        if (real(from.cwd) !== real(target.cwd)) return [];
        const moving = ownerRecords(from.owner);
        const room = Math.max(0, model.MAX_TERMINALS_PER_OWNER - ownerRecords(target.owner).length);
        const moved = [];
        for (const record of moving.slice(0, room)) {
          toEveryone({ kind: "removed", id: record.id, owner: record.owner, reason: "moved" });
          record.owner = target.owner;
          record.sessionId = target.sessionId;
          moved.push(record);
        }
        subscribe(sender, target.owner);
        for (const record of moved) publish(record);
        return moved.map(info);
      }
      case "clear": {
        // ⌘K: what the terminal kept is dropped, not only the screen: a re-attaching view (a reload, another window)
        // and read_terminal start after it; the other views clear too. The shell's prompt redraw follows as output.
        const { owner } = ownerOf(params);
        const record = owned(owner, params.id);
        flush(record);
        record.chunks = [];
        record.kept = 0;
        toOwner(record.owner, { kind: "cleared", id: record.id, end: record.total });
        return { cleared: true, end: record.total };
      }
      case "input": {
        const { owner } = ownerOf(params);
        if (!model.isInput(params.data)) throw new Error("Invalid terminal input.");
        return write(owned(owner, params.id), params.data);
      }
      case "paths": {
        // Clickable file paths in output: which candidates are files inside the owner's folder (relative path, else
        // null). Nothing outside the folder is reported, even whether it exists.
        // params.id: the terminal the text is in, whose shell's current folder (after a `cd`) a relative path is
        // resolved from first, then the session folder.
        const { owner, cwd } = ownerOf(params);
        const list = Array.isArray(params.paths) ? params.paths.slice(0, 32) : [];
        let root;
        try { root = await fs.promises.realpath(cwd); } catch { return list.map(() => null); }
        const record = model.isTerminalId(params.id) ? records.get(params.id) : null;
        const shell = record && record.owner === owner ? await shellCwd(record) : null;
        const bases = [...new Set([shell, root].filter(Boolean))];
        return Promise.all(list.map(async (candidate) => {
          if (typeof candidate !== "string" || !candidate || candidate.length > 1024 || candidate.includes("\0")) return null;
          const expanded = candidate.startsWith("~/") ? path.join(os.homedir(), candidate.slice(2)) : candidate;
          for (const base of bases) {
            try {
              const real = await fs.promises.realpath(path.resolve(base, expanded));
              if (!real.startsWith(root + path.sep)) continue;
              if ((await fs.promises.stat(real)).isFile()) return path.relative(root, real);
            } catch { /* not there: the next folder */ }
            if (path.isAbsolute(expanded)) break;
          }
          return null;
        }));
      }
      default: throw new Error("Unknown terminal operation.");
    }
  }
  /** "terminal:write": keystrokes without a reply, only into a terminal of an owner this window subscribed to. */
  function input(sender, id, data) {
    if (!model.isTerminalId(id) || !model.isInput(data)) return false;
    const record = records.get(id);
    if (!record || !ownerSubscribers.get(record.owner)?.has(sender)) return false;
    return write(record, data);
  }

  function install(ipcMain, { trustedSender }) {
    if (typeof trustedSender !== "function") throw new TypeError("trustedSender is required");
    ipcMain.handle("terminal:call", (event, op, params) => {
      if (!trustedSender(event)) throw new Error("Untrusted renderer.");
      return call(op, params ?? {}, event.sender);
    });
    ipcMain.on("terminal:write", (event, id, data) => {
      if (trustedSender(event)) input(event.sender, id, data);
    });
  }

  // ---- Agent access (agent-tools/terminal.mjs), always scoped to one session's owner key. ----
  const agent = {
    list(owner) { return ownerRecords(owner).map((record) => ({ ...info(record), busy: foregroundBusy(record) })); },
    get(owner, id) { return info(owned(owner, id)); },
    async read(owner, id, { lines = model.READ_DEFAULT_LINES, waitMs = 0 } = {}) {
      const record = owned(owner, id);
      const wait = Math.min(model.READ_MAX_WAIT_MS, Math.max(0, Number(waitMs) || 0));
      if (wait > 0 && record.status === "running") {
        const start = record.total;
        await new Promise((resolve) => {
          const done = () => { clearTimeout(timer); record.waiters.delete(wake); resolve(); };
          const wake = () => { if (record.total !== start || records.get(id) !== record) done(); };
          const timer = setTimeout(done, wait);
          record.waiters.add(wake);
        });
      }
      return { info: { ...info(record), busy: foregroundBusy(record) }, text: model.lastLines(output(record), lines, record.size?.cols) };
    },
    /** Open a tab for the agent ({ sessionId, cwd } already approved: the real folder, inside the session's; start() checks it again). */
    async open({ owner, sessionId, cwd, title = null }) {
      const opened = await create({ owner, sessionId, cwd, title, openedBy: "agent" });
      toEveryone({ kind: "opened", id: opened.id, owner, sessionId, openedBy: "agent" });
      return opened;
    },
    /** Wait for the shell's startup files (first output, then a short quiet spell), then type `command` and Enter. */
    async type(owner, id, command) {
      const record = owned(owner, id);
      await shellReady(record);
      return write(record, `${command}\r`, { source: "agent" });
    },
    interrupt(owner, id) { return write(owned(owner, id), "\u0003", { source: "agent" }); },
    close(owner, id) { return close(owned(owner, id)); },
  };

  /** Terminals whose foreground program is not the shell (quit confirmation). */
  function runningCommands() {
    const busy = [];
    for (const record of records.values()) if (foregroundBusy(record) === true) busy.push({ id: record.id, owner: record.owner, number: record.number, title: record.title });
    return busy;
  }
  /** Close every terminal of an owner (a deleted session). */
  function closeOwner(owner, reason = "closed") {
    let count = 0;
    for (const record of ownerRecords(owner)) if (close(record, reason)) count += 1;
    return count;
  }
  /** App quit: hang up every shell; resolves once they exited or after `timeoutMs`. */
  function dispose({ timeoutMs = 800 } = {}) {
    disposed = true;
    clearInterval(busyTimer);
    clearInterval(sweepTimer);
    busyTimer = sweepTimer = null;
    const pids = [];
    for (const record of [...records.values()]) {
      if (record.proc?.pid) pids.push(record.proc.group ? -record.proc.pid : record.proc.pid);
      flush(record);
      stop(record);
      records.delete(record.id);
    }
    if (!pids.length) return Promise.resolve();
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const alive = pids.filter((pid) => { try { process.kill(pid, 0); return true; } catch { return false; } });
        if (!alive.length || Date.now() - startedAt >= timeoutMs) {
          for (const pid of alive) { try { process.kill(pid, "SIGKILL"); } catch {} }
          resolve();
        } else setTimeout(check, 25);
      };
      check();
    });
  }

  return { call, input, install, agent, ownerOf, runningCommands, closeOwner, dispose, sweep, pollBusy,
    get size() { return records.size; } };
}

module.exports = { createTerminalService, resolveShell, terminalEnv, loadNodePty, parseForegroundProcessGroup };
