"use strict";
// "Open in Terminal" (main.cjs externalOpeners.terminal): the system terminal at a folder.
//
// macOS: `open -a Terminal -- <cwd>`, as before.
// Windows: Windows Terminal (`wt.exe -d .`, an App Execution Alias in %LOCALAPPDATA%\Microsoft\WindowsApps) when it is
// installed, else a new cmd.exe console (`cmd.exe /d /c start "" cmd.exe /K`, `start` being what opens a console
// window for a GUI parent). The folder is the child's cwd in both, never part of a command line, so no path needs
// quoting for cmd or wt (wt would read a ";" in a path as its own command separator). Both are started detached from
// the app and not hidden: the window is the point.
const fs = require("node:fs");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");

/** The launches to try in order, as { file, args, options }. */
function terminalLaunches(cwd, { platform = process.platform, env = process.env, exists = (file) => { try { fs.lstatSync(file); return true; } catch { return false; } } } = {}) {
  if (platform !== "win32") return [{ file: "open", args: ["-a", "Terminal", "--", cwd], options: { timeout: 10000 } }];
  const out = [];
  const local = env.LOCALAPPDATA || (env.USERPROFILE ? path.win32.join(env.USERPROFILE, "AppData", "Local") : null);
  const alias = local ? path.win32.join(local, "Microsoft", "WindowsApps", "wt.exe") : null;
  // lstat: an App Execution Alias is a reparse point that stat() can't follow.
  if (alias && exists(alias)) out.push({ file: alias, args: ["-d", "."], options: { cwd, detached: true, stdio: "ignore" } });
  const comspec = env.ComSpec || env.COMSPEC || path.win32.join(env.SystemRoot || env.SYSTEMROOT || "C:\\Windows", "System32", "cmd.exe");
  // The outer cmd only runs `start` (detached, so it has no console of its own to show); start opens the new console
  // window, whose cmd /K stays at the prompt in cwd. Not windowsHide: its SW_HIDE must not reach that window.
  out.push({ file: comspec, args: ["/d", "/c", "start", '""', "cmd.exe", "/K"], options: { cwd, detached: true, stdio: "ignore", windowsVerbatimArguments: true } });
  return out;
}

/** Opens the terminal; resolves once one launch started, rejects with the last error when none could. */
function openTerminal(cwd, { platform = process.platform, env = process.env, run = execFile, start = spawn, exists } = {}) {
  const launches = terminalLaunches(cwd, { platform, env, ...(exists ? { exists } : {}) });
  if (platform !== "win32") {
    const [{ file, args, options }] = launches;
    return new Promise((resolve, reject) => run(file, args, options, (error, stdout, stderr) => (error ? reject(error) : resolve({ stdout, stderr }))));
  }
  return launches.reduce((previous, launch) => previous.catch(() => new Promise((resolve, reject) => {
    let child;
    try { child = start(launch.file, launch.args, launch.options); } catch (error) { reject(error); return; }
    child.once("error", reject);
    child.once("spawn", () => { child.unref?.(); resolve({ file: launch.file }); });
  })), Promise.reject(new Error("No terminal to open.")));
}

module.exports = { openTerminal, terminalLaunches };
