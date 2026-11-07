"use strict";
// Process helpers that differ on Windows, shared by every module that spawns or stops programs.
//
// killTree: macOS/Linux signal the process group (-pid) when the child was spawned detached, else the pid; Windows has
// neither groups nor signals (SIGTERM is TerminateProcess of that one process), so `taskkill /T /F` ends the whole tree
// (npm → node → vite, cmd → the program it ran), which nothing else would.
//
// windowsSpawn: what spawn() needs on Windows for a program named the way a Mac user names it. Node finds only
// .exe/.com on PATH by itself, and refuses .cmd/.bat without a shell (CVE-2024-27980, EINVAL), yet npm, npx, pnpm,
// yarn and every npm-installed CLI (codex, gemini, opencode…) are .cmd shims there. The name is resolved through
// PATH × PATHEXT; a .cmd/.bat runs under `cmd.exe /d /s /c` with every argument escaped for cmd (the cross-spawn
// rules, double-escaped for node_modules\.bin shims, which re-expand their arguments once more).
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

function killTree(pid, signal = "SIGTERM", { platform = process.platform, group = false, run = execFile } = {}) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (platform === "win32") {
    try { run("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true }, () => {}); return true; } catch { return false; }
  }
  try { process.kill(group ? -pid : pid, signal); return true; }
  catch { try { process.kill(pid, signal); return true; } catch { return false; } }
}

const pathKey = (env) => Object.keys(env || {}).find((key) => key.toUpperCase() === "PATH") || "PATH";

/** The file a Windows command name runs (an absolute or relative path, or a name looked up on PATH with PATHEXT); null if none. */
function resolveWindowsCommand(command, { env = process.env, cwd = process.cwd(), exists = (file) => { try { return fs.statSync(file).isFile(); } catch { return false; } } } = {}) {
  if (typeof command !== "string" || !command) return null;
  const exts = String(env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean).map((ext) => ext.toLowerCase());
  const withExt = (base) => (path.win32.extname(base) && exists(base) ? [base] : []).concat(exts.map((ext) => base + ext)).find(exists) || null;
  if (/[\\/]/.test(command) || path.win32.isAbsolute(command)) return withExt(path.win32.resolve(cwd, command));
  for (const dir of String(env[pathKey(env)] || "").split(";").filter(Boolean)) {
    const found = withExt(path.win32.join(dir.trim().replace(/^"|"$/g, ""), command));
    if (found) return found;
  }
  return null;
}

const META = /([()\][%!^"`<>&|;, *?])/g;
function escapeArgument(arg, doubleEscape) {
  let value = `${arg}`;
  value = value.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
  value = value.replace(/(?=(\\+?)?)\1$/, "$1$1");
  value = `"${value}"`.replace(META, "^$1");
  return doubleEscape ? value.replace(META, "^$1") : value;
}
const escapeCommand = (file) => file.replace(META, "^$1");

/**
 * spawn() arguments for `command args` on this host: unchanged off Windows; on Windows the resolved .exe, or
 * cmd.exe running the .cmd/.bat. Returns { command, args, options } (options gains windowsVerbatimArguments and
 * windowsHide for cmd.exe). A name that resolves to nothing is passed through, so spawn reports ENOENT as before.
 */
function windowsSpawn(command, args = [], options = {}, { platform = process.platform } = {}) {
  if (platform !== "win32") return { command, args, options };
  const env = options.env || process.env;
  const file = resolveWindowsCommand(command, { env, cwd: options.cwd || process.cwd() });
  if (!file) return { command, args, options: { windowsHide: true, ...options } };
  if (!/\.(cmd|bat)$/i.test(file)) return { command: file, args, options: { windowsHide: true, ...options } };
  const shim = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(file);
  const line = [escapeCommand(path.win32.normalize(file)), ...args.map((arg) => escapeArgument(arg, shim))].join(" ");
  return { command: env.ComSpec || env.COMSPEC || "cmd.exe", args: ["/d", "/s", "/c", `"${line}"`],
    options: { windowsHide: true, ...options, windowsVerbatimArguments: true } };
}

module.exports = { killTree, resolveWindowsCommand, windowsSpawn, escapeArgument };
