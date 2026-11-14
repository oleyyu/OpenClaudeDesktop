// R3b-preview: the host side of the 2.42304.0 dev-server port policy (generated/r3b-preview-ports.mjs, extracted from
// main index.chunk-muI2IV6k.js by scripts/extract-r3b-preview.mjs) and of the preview browser's user agent
// (generated/r3b-preview-user-agent.mjs). preview-service.cjs wires both in.
//
// What the original reads from its own app, and what stands in for it here:
// - a2.servers (the preview server registry, one per chat): the local servers, which are one per folder and shared by
//   every chat of that folder. A server's "session" is therefore its folder: another folder's server is "another chat's"
//   (preview_stop can't reach it), a server of the same folder is "this chat's".
// - zy (isRealpathWithin with the original's path-safety guards) and Y0 (its guarded read): realpath containment and a
//   plain read; J0 (the guard options) has nothing to carry.
// - xi() (@ant/claude-native listTcpListeners / getProcessLineage, Rust): `lsof` and `ps` on macOS / Linux
//   (hostProcessInfo), none on Windows. Where those can't answer, the original's own fallback applies (no native: the
//   identity check passes and occupants go unnamed).
// - $0 (GrowthBook 2711562102, default true) and mM (the in-app Browser preview, which the local preview is): true.
// - Pfi's GrowthBook 3868149774 (default false: Claude's own user agent everywhere): false.
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { execFile } from "node:child_process";
import { createPreviewPortPolicy } from "./generated/r3b-preview-ports.mjs";
import { isClaudeHost, previewRequestUserAgent, previewUserAgents } from "./generated/r3b-preview-user-agent.mjs";
import { insideFolder } from "./preview-launch.mjs";

export const AUTO_PORT_GATE_DEFAULT = true; // GrowthBook 2711562102 getFeatureValue(…, true)
export const CLAUDE_USER_AGENT_EVERYWHERE = false; // GrowthBook 3868149774 (hy, default false)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** zy: the real path of `file` when it is `root` or inside it once both are resolved, else false. */
export async function isRealpathWithin(file, root) {
  try {
    const real = await fsp.realpath(path.resolve(String(file)));
    const realRoot = await fsp.realpath(path.resolve(String(root)));
    return insideFolder(realRoot, real) ? real : false;
  } catch { return false; }
}
/** Y0: a file's text, or null. */
export async function readText(file) {
  try { return await fsp.readFile(file, "utf8"); } catch { return null; }
}

/** A launch.json configuration (preview-launch.mjs) as the original's resolved entry (no command: `undefined`). */
export function portEntry(config) {
  return {
    name: config.name, command: config.command ?? undefined, args: config.args ?? [], cwd: config.cwd, port: config.port, env: config.env,
    autoPort: config.autoPort, ...(config.url ? { url: config.url } : {}),
  };
}

// ------------------------------------------------------------------ xi(): listTcpListeners / getProcessLineage
function runText(file, args, { timeout = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout) => {
      // lsof exits 1 when nothing matches: that is an empty answer, not a failure.
      if (error && !(error.code === 1 && typeof stdout === "string")) reject(error);
      else resolve(String(stdout ?? ""));
    });
  });
}

/** `lsof -F pctn` output as the native listener rows {localPort, localAddr, pid, processName}. */
export function parseLsofListeners(text) {
  const rows = [];
  let pid = 0, processName = "", type = "";
  for (const line of String(text).split("\n")) {
    const field = line[0], value = line.slice(1);
    if (field === "p") { pid = Number(value) || 0; processName = ""; type = ""; }
    else if (field === "c") processName = value;
    else if (field === "f") type = "";
    else if (field === "t") type = value;
    else if (field === "n") {
      const at = value.lastIndexOf(":");
      const localPort = Number(value.slice(at + 1));
      if (at < 0 || !Number.isInteger(localPort) || localPort < 1 || localPort > 65535) continue;
      let localAddr = value.slice(0, at).replace(/^\[(.*)\]$/, "$1");
      if (localAddr === "*") localAddr = type === "IPv6" ? "::" : "0.0.0.0";
      rows.push({ localPort, localAddr, pid, processName });
    }
  }
  return rows;
}

/** `ps -A -o pid=,ppid=,pgid=` as the native lineage rows {pid, pgid, ancestors} for the asked pids. */
export function processLineage(text, pids) {
  const table = new Map();
  for (const line of String(text).split("\n")) {
    const [pid, ppid, pgid] = line.trim().split(/\s+/).map(Number);
    if (Number.isInteger(pid) && pid > 0) table.set(pid, { ppid: Number.isInteger(ppid) ? ppid : 0, pgid: Number.isInteger(pgid) ? pgid : null });
  }
  return pids.filter((pid) => table.has(pid)).map((pid) => {
    const ancestors = [], seen = new Set([pid]);
    for (let parent = table.get(pid).ppid; parent > 0 && !seen.has(parent) && ancestors.length < 512; parent = table.get(parent)?.ppid ?? 0) {
      ancestors.push(parent);
      seen.add(parent);
    }
    return { pid, pgid: table.get(pid).pgid, ancestors };
  });
}

/**
 * The native module's two process calls, answered by lsof / ps (null on Windows). A listener table read within the last
 * second is reused: one identity check reads it several times.
 */
export function hostProcessInfo({ platform = process.platform, run = runText, now = () => Date.now() } = {}) {
  if (platform === "win32") return null;
  const lsof = platform === "darwin" ? "/usr/sbin/lsof" : "lsof";
  const ps = platform === "darwin" ? "/bin/ps" : "ps";
  let cached = null;
  return {
    listTcpListeners() {
      if (cached && now() - cached.at < 1000) return cached.rows;
      const rows = run(lsof, ["-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pctn"]).then(parseLsofListeners);
      cached = { at: now(), rows };
      rows.catch(() => { if (cached?.rows === rows) cached = null; });
      return rows;
    },
    async getProcessLineage(pids) {
      return processLineage(await run(ps, ["-A", "-o", "pid=,ppid=,pgid="]), [...pids]);
    },
  };
}

/**
 * The original port policy over this app: `registry()` lists the local servers as the original's a2.servers rows
 * ({serverId, name, port, status, cwd, sessionId}); `processes` is hostProcessInfo() or a stand-in (null: none).
 */
export function createPreviewPortHost({ registry, logger = console, netApi = net, wait = sleep, processes = null, autoPortGate = () => AUTO_PORT_GATE_DEFAULT, browserPreview = () => true } = {}) {
  const log = (level) => (...args) => { try { (logger?.[level] ?? logger?.warn)?.call(logger, ...args); } catch { /* a logger that throws */ } };
  return createPreviewPortPolicy({
    n: path, p: fsp, g: netApi, N: { warn: log("warn"), info: log("info"), error: log("error"), debug() {} }, ih: (ms) => wait(ms),
    xi: () => processes ?? null, zy: isRealpathWithin, Y0: readText, J0: {}, a2: { get servers() { return registry(); } },
    mM: () => browserPreview() !== false, $0: async () => (await autoPortGate()) !== false,
  });
}

/**
 * Pfi's preview-partition user agent: the session default becomes the "sites" agent (standard browser tokens only),
 * and each request to a Claude host carries the "claudeHosts" one (the app's own, without Electron). Only a session
 * whose agent names Electron is changed, once. Returns the agents applied, or null.
 */
export function applyPreviewUserAgent(ses, { claudeEverywhere = () => CLAUDE_USER_AGENT_EVERYWHERE, logger = console } = {}) {
  const agent = ses?.getUserAgent?.();
  if (!agent?.includes(" Electron/")) return null;
  const agents = previewUserAgents(agent);
  ses.setUserAgent?.(claudeEverywhere() ? agents.claudeHosts : agents.sites);
  ses.webRequest?.onBeforeSendHeaders?.((details, callback) => {
    let result = {};
    try {
      const headers = details.requestHeaders;
      const key = Object.keys(headers).find((name) => name.toLowerCase() === "user-agent") ?? "User-Agent";
      let host = "";
      try { host = new URL(details.url).hostname; } catch { host = ""; }
      const next = previewRequestUserAgent(agents, headers[key], claudeEverywhere() || isClaudeHost(host));
      if (next !== undefined) result = { requestHeaders: { ...headers, [key]: next } };
    } catch (error) {
      logger?.warn?.("[Preview] Could not set User-Agent; request sent unchanged %o", { error: error instanceof Error ? error.message : typeof error });
    }
    callback(result);
  });
  return agents;
}
