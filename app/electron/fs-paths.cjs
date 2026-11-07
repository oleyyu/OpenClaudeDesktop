"use strict";
// File-system path helpers that differ on Windows, for the main-process file / git / preview / terminal modules.
//
// Windows paths are case-insensitive (C:\Repo and c:\repo are one folder), take "\" and "/" alike, may come back as
// 8.3 short names (C:\Users\RUNNER~1) or with git's forward slashes (C:/repo), and a root ends in a separator
// (C:\) where other folders don't. macOS keeps its exact-string behaviour here, as before.
//
// renameSync / rename: replacing an existing file on Windows fails with EPERM / EBUSY / EACCES for a moment while
// an antivirus scanner, the search indexer or an editor holds it open; a few short retries get past that.
const fs = require("node:fs");
const path = require("node:path");

const api = (platform) => (platform === "win32" ? path.win32 : path.posix);

/** The path in the form two paths are compared in: resolved, and on Windows lower-cased with "\" separators. */
function comparable(value, { platform = process.platform } = {}) {
  if (typeof value !== "string" || !value) return "";
  const resolved = api(platform).resolve(value);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

/** realpath (Windows: also expands 8.3 short names), else the path as given (a missing file). */
function realOr(value, { realpath = fs.realpathSync.native } = {}) {
  try { return realpath(value); } catch { return value; }
}

/** True when a and b name the same folder or file (Windows: case-insensitively, either separator). */
function samePath(a, b, { platform = process.platform } = {}) {
  const left = comparable(a, { platform });
  return !!left && left === comparable(b, { platform });
}

/** samePath after following links and short names on both sides (a missing path compares as written). */
function sameRealPath(a, b, { platform = process.platform, realpath = fs.realpathSync.native } = {}) {
  if (samePath(a, b, { platform })) return true;
  return samePath(realOr(a, { realpath }), realOr(b, { realpath }), { platform });
}

/** `folder` followed by one separator, without doubling the one a root (/, C:\) already ends with. */
function withTrailingSeparator(folder, { platform = process.platform } = {}) {
  const sep = api(platform).sep;
  if (typeof folder !== "string" || !folder) return sep;
  return /[\\/]$/.test(folder) && (platform === "win32" || folder.endsWith("/")) ? folder : folder + sep;
}

/** True when `file` is `root` or inside it (lexically; Windows: case-insensitive, either separator). */
function pathInside(root, file, { platform = process.platform } = {}) {
  const p = api(platform);
  if (typeof root !== "string" || typeof file !== "string" || !p.isAbsolute(root) || !p.isAbsolute(file)) return false;
  const base = comparable(root, { platform }), target = comparable(file, { platform });
  if (base === target) return true;
  return target.startsWith(withTrailingSeparator(base, { platform }));
}

/** pathInside after realpath of both sides (each as written when it doesn't exist). */
function pathInsideReal(root, file, { platform = process.platform, realpath = fs.realpathSync.native } = {}) {
  return pathInside(realOr(root, { realpath }), realOr(file, { realpath }), { platform });
}

/** An absolute path by this host's rules (Windows: C:\…, C:/…, \\server\share, \…; macOS: /…). */
function isAbsoluteHostPath(value, { platform = process.platform } = {}) {
  return typeof value === "string" && !!value && api(platform).isAbsolute(value);
}

/**
 * Windows: a UNC or device path — \\server\share, //server/share, \\?\…, \\?\UNC\…, \\.\… (either separator). Opening
 * one, even a realpath or stat, makes Windows contact that host (SMB, then WebDAV) and authenticate as the user, which
 * hands it the account's NTLM hash before any containment check can refuse the path. Never on other hosts: "//x" is
 * just "/x" there.
 */
function isUncPath(value, { platform = process.platform } = {}) {
  return platform === "win32" && typeof value === "string" && /^[\\/]{2}/.test(value);
}

/**
 * True when a path from the renderer, a page or the model must be refused before any fs call: on Windows, a UNC or
 * device path, as given or resolved against `base`, that isn't lexically inside a trusted root that is itself on a
 * share (`base` or one of `roots`: a workspace opened from \\server\share, or a mapped drive realpath'd to one). Other
 * hosts: always false.
 */
function remotePathRefused(value, { base, roots = [], platform = process.platform } = {}) {
  if (platform !== "win32" || typeof value !== "string") return false;
  const resolved = typeof base === "string" && base ? path.win32.resolve(base, value) : value;
  if (!isUncPath(value, { platform }) && !isUncPath(resolved, { platform })) return false;
  return ![base, ...roots].some((root) => isUncPath(root, { platform }) && pathInside(root, resolved, { platform }));
}

/** remotePathRefused as an Error to throw (`label` names the path in the message). */
function assertLocalPath(value, options = {}, label = value) {
  if (remotePathRefused(value, options)) throw new Error(`${label} is a network or device path (\\\\server\\share), which isn’t opened here.`);
  return value;
}

const RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);
const RETRY_DELAYS = [20, 50, 100, 200, 400];
const sleepSync = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* no wait */ } };

/** fs.renameSync, retried a few times (under a second in all) on Windows' transient sharing errors. */
function renameSyncRetry(from, to, { platform = process.platform, rename = fs.renameSync, wait = sleepSync, delays = RETRY_DELAYS } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try { return rename(from, to); }
    catch (error) {
      if (platform !== "win32" || !RETRY_CODES.has(error?.code) || attempt >= delays.length) throw error;
      wait(delays[attempt]);
    }
  }
}

/** fs.promises.rename, retried the same way. */
async function renameRetry(from, to, { platform = process.platform, rename = fs.promises.rename, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), delays = RETRY_DELAYS } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try { return await rename(from, to); }
    catch (error) {
      if (platform !== "win32" || !RETRY_CODES.has(error?.code) || attempt >= delays.length) throw error;
      await wait(delays[attempt]);
    }
  }
}

module.exports = { comparable, realOr, samePath, sameRealPath, withTrailingSeparator, pathInside, pathInsideReal, isAbsoluteHostPath, isUncPath, remotePathRefused, assertLocalPath, renameSyncRetry, renameRetry };
