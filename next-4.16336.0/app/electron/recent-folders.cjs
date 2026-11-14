"use strict";
// Main-process half of the composer's Recent folders (2.31226.0 c749529a1-3d64pCyM.js _ / D over
// LocalSessions.getAll and LocalSessions.getDetectedProjects).
//
// - sessionFolders: what getAll carries per session for the Recent list: originCwd (the repository a worktree
//   session was cut from, else the session's own folder), folderExists and isScratchWorkspace. A worktree's origin
//   is the one prepare-worktree recorded (config.worktreeOrigins, copied to sessionMetadata.originCwd when a session
//   starts there); a worktree made before that was recorded is traced back to its repository (the default <repo>/.code/worktrees/<name> layout, else
//   `git rev-parse --git-common-dir`).
// - detectedProjects: index.chunk-BMnTSdxh.js (getDetectedProjects): VS Code / Cursor recently opened folders
//   (state.vscdb history.recentlyOpenedPathsList, at most 50), Zed workspaces (db.sqlite, at most 50) and the
//   project folders found one level under ~/code, ~/Projects, ~/src, … ; each with its last activity (.git/index
//   mtime, else the newest project-marker mtime). Results are cached for 30 minutes (A = 18e5) and refreshed in the
//   background while the cached list is served (F).
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const FS_TIMEOUT = 2000; // s
const DB_TIMEOUT = 5000; // c
const DB_ENTRY_LIMIT = 50; // l
const DB_MAX_BYTES = 52428800; // u
const MARKERS = [".git", "package.json", "Cargo.toml", "go.mod", "pyproject.toml", "setup.py", "Makefile", "CMakeLists.txt", "pom.xml", "build.gradle", ".project", "Gemfile", "mix.exs", "dune-project"]; // d
const SCAN_DIRS = ["code", "Code", "projects", "Projects", "src", "dev", "Developer", "repos", "Repos", "workspace", "Workspace", "github", "GitHub", "git", "source/repos"]; // f
const CACHE_MS = 18e5; // A

function withTimeout(work, ms = FS_TIMEOUT) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("fs timeout")), ms); });
  return Promise.race([work(), timeout]).finally(() => clearTimeout(timer));
}

// _ = new PQueue({concurrency: 50}) + y: each fs probe waits for one of 50 slots, and its timeout runs from its start.
const FS_CONCURRENCY = 50;
let fsActive = 0;
const fsWaiting = [];
function queued(work, ms = FS_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const start = () => {
      fsActive += 1;
      withTimeout(work, ms).then(resolve, reject).finally(() => { fsActive -= 1; fsWaiting.shift()?.(); });
    };
    if (fsActive < FS_CONCURRENCY) start(); else fsWaiting.push(start);
  });
}

/** x: an absolute local path's real path, else null. */
async function localPath(value) {
  if (typeof value !== "string" || !path.isAbsolute(value)) return null;
  try { return await queued(() => fsp.realpath(value)); } catch { return null; }
}

/** S: the real path of an existing directory, else null. */
async function directory(value) {
  const real = await localPath(value);
  if (!real) return null;
  try { return (await queued(() => fsp.lstat(real))).isDirectory() ? real : null; } catch { return null; }
}

/** C: .git/index mtime when .git is a directory, else the newest project marker's mtime (0: no signal). */
async function lastActivity(dir) {
  try {
    if ((await queued(() => fsp.lstat(path.join(dir, ".git")))).isDirectory())
      return (await queued(() => fsp.lstat(path.join(dir, ".git", "index")))).mtimeMs;
  } catch {}
  const times = await Promise.all(MARKERS.map(async (marker) => {
    try { return (await queued(() => fsp.lstat(path.join(dir, marker)))).mtimeMs; } catch { return 0; }
  }));
  return Math.max(0, ...times);
}

/** w: one editor entry as a detected project. */
async function project(value, source) {
  const dir = await directory(value);
  return dir ? { path: dir, name: path.basename(dir) || dir, source, lastActivity: await lastActivity(dir) } : null;
}

/** E: one query against a copy of an editor's SQLite state (the editor may hold the original open). */
async function readDatabase(file, query) {
  const real = await localPath(file);
  if (!real) return null;
  let stat;
  try { stat = await fsp.stat(real); } catch { return null; }
  if (!stat.isFile() || stat.size > DB_MAX_BYTES) return null;
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "claude-detected-projects-"));
  try {
    return await withTimeout(async () => {
      const copy = path.join(tmp, "state.db");
      await fsp.copyFile(real, copy);
      for (const suffix of ["-wal", "-shm"]) await fsp.copyFile(real + suffix, copy + suffix).catch(() => {});
      const { DatabaseSync } = require("node:sqlite");
      const db = new DatabaseSync(copy, { readOnly: true });
      try { return query(db); } finally { db.close(); }
    }, DB_TIMEOUT);
  } catch { return null; } finally {
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/** h + D: VS Code / Cursor history.recentlyOpenedPathsList folders. */
async function editorProjects(home, appName, dotDir, source) {
  const support = path.join(home, "Library", "Application Support");
  const candidates = [path.join(home, `${dotDir}-shared`, "sharedStorage", "state.vscdb"), path.join(support, appName, "User", "globalStorage", "state.vscdb")];
  let list;
  for (const file of candidates) {
    const row = await readDatabase(file, (db) => db.prepare("SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'").get());
    if (typeof row?.value === "string" && row.value.trim()) { list = row.value; break; }
  }
  if (list === undefined) return [];
  let entries = [];
  try { entries = (JSON.parse(list)?.entries ?? []).slice(0, DB_ENTRY_LIMIT); } catch { return []; }
  const folders = entries.flatMap((entry) => { try { return [fileURLToPath(entry.folderUri ?? "")]; } catch { return []; } });
  return (await Promise.all(folders.map((folder) => project(folder, source)))).filter(Boolean);
}

/** O: Zed's workspaces, newest first. */
async function zedProjects(home) {
  const rows = await readDatabase(path.join(home, "Library", "Application Support", "Zed", "db", "0-stable", "db.sqlite"),
    (db) => db.prepare(`SELECT paths FROM workspaces WHERE paths != '' ORDER BY timestamp DESC LIMIT ${DB_ENTRY_LIMIT}`).all()) ?? [];
  const folders = rows.flatMap((row) => typeof row.paths === "string" ? row.paths.split("\n").filter(Boolean) : []).slice(0, DB_ENTRY_LIMIT);
  return (await Promise.all(folders.map((folder) => project(folder, "zed")))).filter(Boolean);
}

/** k: project folders one level under the usual home code directories (no activity signal: not a project). */
async function scannedProjects(home) {
  const roots = await Promise.all(SCAN_DIRS.map(async (dir) => { const real = await directory(path.join(home, dir)); return real ? { dir, real } : null; }));
  const seen = new Set(), unique = [];
  for (const root of roots) if (root && !seen.has(root.real)) { seen.add(root.real); unique.push(root.real); }
  const found = await Promise.all(unique.map(async (root) => {
    let names;
    try { names = await queued(() => fsp.readdir(root)); } catch { return []; }
    const entries = await Promise.all(names.filter((name) => !name.startsWith(".")).map(async (name) => {
      const dir = await directory(path.join(root, name));
      if (!dir) return null;
      const activity = await lastActivity(dir);
      return activity === 0 ? null : { path: dir, name, source: "scan", lastActivity: activity };
    }));
    return entries.filter(Boolean);
  }));
  return found.flat();
}

/** I: newest first, one entry per path. */
function dedupeProjects(projects) {
  const seen = new Set(), list = [];
  for (const entry of [...projects].sort((a, b) => b.lastActivity - a.lastActivity)) if (!seen.has(entry.path)) { seen.add(entry.path); list.push(entry); }
  return list;
}

/** L: every source; a failing source is skipped. */
async function detectProjects(home = os.homedir()) {
  const sources = [editorProjects(home, "Code", ".vscode", "vscode"), editorProjects(home, "Cursor", ".cursor", "cursor"), zedProjects(home), scannedProjects(home)];
  const settled = await Promise.allSettled(sources);
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

function createDetectedProjects({ detect = detectProjects, now = () => Date.now() } = {}) {
  let cached = null, at = 0, pending = null;
  // P: the cached list while fresh, else one shared detection.
  const refresh = () => {
    if (cached !== null && now() - at <= CACHE_MS) return Promise.resolve(cached);
    if (pending) return pending;
    pending = detect().then((list) => { cached = dedupeProjects(list); at = now(); pending = null; return cached; },
      (error) => { pending = null; at = now(); throw error; });
    return pending;
  };
  // F: the first call waits; later calls get the cached list and refresh it in the background.
  return {
    get() { if (cached === null) return refresh(); refresh().catch(() => {}); return Promise.resolve(cached); },
    paths() { return new Set((cached || []).map((entry) => entry.path)); },
  };
}

/** A worktree made before its origin was recorded: <repo>/.code/worktrees/<name>, else git's common dir. */
async function inferWorktreeOrigin(dir, run) {
  const parent = path.dirname(dir);
  if (path.basename(parent) === "worktrees" && path.basename(path.dirname(parent)) === ".code") return path.dirname(path.dirname(parent));
  if (!run || !fs.existsSync(dir)) return null;
  try {
    const { stdout } = await run("git", ["-C", dir, "rev-parse", "--path-format=absolute", "--git-common-dir"], { timeout: FS_TIMEOUT });
    const common = String(stdout).trim();
    return path.basename(common) === ".git" ? path.dirname(common) : null;
  } catch { return null; }
}

/**
 * getAll's Recent fields for [{id, cwd}] → {[id]: {originCwd, folderExists, isScratchWorkspace}}.
 * A newly traced worktree origin is kept as the session's sessionMetadata.originCwd (the caller saves when `changed`).
 */
async function sessionFolders(sessions, { config, scratchRoot, run } = {}) {
  const result = {};
  let changed = false;
  const worktrees = new Set([...(config?.worktreeDirectories || []), ...Object.keys(config?.worktreeBases || {})].filter((dir) => typeof dir === "string").map((dir) => path.resolve(dir)));
  const origins = config?.worktreeOrigins && typeof config.worktreeOrigins === "object" ? config.worktreeOrigins : {};
  const exists = new Map();
  const folderExists = async (dir) => {
    if (!exists.has(dir)) exists.set(dir, fsp.stat(dir).then((stat) => stat.isDirectory(), () => false));
    return exists.get(dir);
  };
  const scratch = typeof scratchRoot === "string" && scratchRoot ? path.resolve(scratchRoot) + path.sep : null;
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const id = typeof session?.id === "string" ? session.id : null, cwd = typeof session?.cwd === "string" && path.isAbsolute(session.cwd) ? session.cwd : null;
    if (!id || !cwd) continue;
    let origin = config.sessionMetadata?.[id]?.originCwd;
    if (typeof origin !== "string" || !origin) origin = origins[cwd];
    if ((typeof origin !== "string" || !origin) && worktrees.has(path.resolve(cwd))) {
      origin = await inferWorktreeOrigin(cwd, run);
      if (origin && config.sessionMetadata && typeof config.sessionMetadata === "object") { config.sessionMetadata[id] = { ...config.sessionMetadata[id], originCwd: origin }; changed = true; }
    }
    const originCwd = typeof origin === "string" && origin ? origin : cwd;
    result[id] = { originCwd, folderExists: await folderExists(cwd), isScratchWorkspace: !!scratch && (originCwd + path.sep).startsWith(scratch) };
  }
  return { sessions: result, changed };
}

module.exports = { sessionFolders, createDetectedProjects, detectProjects, dedupeProjects, lastActivity, inferWorktreeOrigin, queued, CACHE_MS, FS_CONCURRENCY };
