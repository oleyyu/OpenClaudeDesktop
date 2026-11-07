"use strict";
// The program that unpacks a downloaded or imported archive on this host, as { file, args }.
//
// macOS: tar.gz / tgz with the system tar, zip with ditto (as before). Windows 10 1803+ ships bsdtar as
// %SystemRoot%\System32\tar.exe, which reads zip as well as tar.gz; it is called by that absolute path so the GNU tar
// of Git for Windows (often first on PATH, and unable to read zip or "C:\…" archive names) is never the one run.
// `dest` must exist (tar -C does not create it; ditto does).
const path = require("node:path");

function windowsTar(env = process.env) {
  const root = env.SystemRoot || env.SYSTEMROOT || env.windir || env.WINDIR || "C:\\Windows";
  return path.win32.join(root, "System32", "tar.exe");
}

function extractCommand(type, archive, dest, { platform = process.platform, env = process.env } = {}) {
  if (platform === "win32") {
    if (type === "zip" || type === "tar.gz" || type === "tgz") return { file: windowsTar(env), args: ["-xf", archive, "-C", dest] };
    return null;
  }
  if (type === "tar.gz" || type === "tgz") return { file: "tar", args: ["-xzf", archive, "-C", dest] };
  if (type === "zip") return { file: "ditto", args: ["-x", "-k", archive, dest] };
  return null;
}

module.exports = { extractCommand, windowsTar };
