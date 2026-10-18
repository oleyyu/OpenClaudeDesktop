"use strict";
// R4f-rail SR-5: main's `session-rail-meta`, the local session record the Code session's Session rail reads.
//
// 2.42304.0 source:
// - The rail host (ion-dist v1 cf74bc599-D9NZWRyl.js fO) reads the session's local record through `Oa` = shared-8 `Fd`
//   (local `zh`), a selector over the LocalSessions store that keeps exactly: cwd, originCwd, worktreePath,
//   startedWithWorktree, worktreeRemoved, lazyWorktreePath, isArchived, harnessCwd, branch, additionalDirectories,
//   isScratchWorkspace, remoteTarget, sshConfig. When the session meta query (`Td(e,rO)`) has nothing, fO builds the rO
//   fields from that record (`{...$d(O), additionalDirectories: O.additionalDirectories, hasDesktopWorktree:
//   !!O.worktreePath, …}`); `ZE` / `QE` read it for the lazy-worktree state and `VE` takes `O.branch` as the recorded
//   branch. The renderer half is src/session-rail-meta-model.mjs.
// - The record itself is main's LocalSessions formatSessionForEvent (asar index.chunk-CFJssAFf.js): `cwd:e.cwd,
//   originCwd:e.originCwd`, `startedWithWorktree: e.worktreePath!==void 0 || e.worktreeLazy!==void 0 || $C(e) || …`,
//   `worktreeRemoved: e.worktreePath===void 0 && e.cwd===e.originCwd && $C(e)` with `$C(e) = !e.worktreeLazy &&
//   !!e.branch && !!e.originCwd`, `lazyWorktreePath: pw(e)?.path`, `harnessCwd`, `branch` (the worktree's branch, kept
//   after the worktree is gone), `isArchived`, `additionalDirectories: QL(e)` (the session's addDirectories grants) and
//   `isScratchWorkspace: jD(e.originCwd) ? true : undefined`.
//
// Host sources (this app keeps no LocalSession objects; each field comes from main's own records):
// - cwd: config.threadMetadata[id].cwd (what the session was started or resumed in). A session without one may name a
//   cwd only when the Codex thread list reported it (observedThreadCwds), the rule of 'recent-folder-sessions' (B03).
// - The session works in an app worktree when its cwd is one prepare-worktree made (config.worktreeDirectories,
//   worktreeOrigins, worktreeBases) or the session recorded the repository it was cut from (sessionMetadata.originCwd,
//   copied from worktreeOrigins at thread/start; only worktree sessions have it).
// - originCwd: sessionMetadata.originCwd, else worktreeOrigins[cwd], else (an app worktree made before origins were
//   recorded) recent-folders.cjs inferWorktreeOrigin without saving it, else the session's own cwd.
// - worktreePath: the cwd while that worktree folder exists. startedWithWorktree: an app worktree session, its folder
//   there or not. worktreeRemoved: an app worktree session whose folder is gone.
//   Host difference: the original falls a session back to its origin repository when the worktree was deleted
//   (`e.cwd=e.originCwd`, "Worktree at … was deleted; falling back to origin repo …") and only then reports
//   worktreeRemoved; here nothing moves the session, so its recorded cwd stays the gone folder while worktreeRemoved is
//   true (the rail's $d then shows the origin repository, as the original does after its fallback).
// - branch: the live worktree's checked-out branch, read from its git admin files (`.git` → gitdir → HEAD) without
//   running git, else the branch prepare-worktree recorded (R4g-small SM3 / X5-E1: config.worktreeBranches, kept by
//   worktrees.forgetWorktree while a session still names the folder, dropped with that session by
//   worktrees.pruneWorktreeBranches, R4i-small SM3). The original records the branch it created and
//   keeps it after the worktree is gone (`branch:e.branch`, `$C(e)=!e.worktreeLazy&&!!e.branch&&!!e.originCwd`), so a
//   gone worktree shows its recorded branch here too. Host difference: a live worktree reports its checked-out branch
//   first (a `git switch` inside it shows); a worktree made before branches were recorded has none once it is gone.
// - isArchived: config.archivedThreadIds. additionalDirectories: sessionMetadata.additionalFolders (main 'folder'
//   with additional, the outside-root card's Add folder, /add-dir: this app's addDirectories grants).
// - isScratchWorkspace: the origin is under <userData>/workspaces, the scratch root 'recent-folder-sessions' uses.
// - lazyWorktreePath, harnessCwd, remoteTarget, sshConfig: never set. This app creates worktrees before the session
//   starts (no lazy provider, research r4-session-rail.md §7 / SR-9), its cores have no harness cwd apart from the
//   session's, and it has no SSH / WSL sessions (D31, env-ssh-remote).
const fsp = require("node:fs/promises");
const path = require("node:path");
const { inferWorktreeOrigin, queued } = require("./recent-folders.cjs");
const { recordedWorktreeBranch } = require("./worktrees.cjs");

/** shared-8 zh: the fields of a LocalSessions record the rail reads, in the original's order. */
const LOCAL_SESSION_RECORD_FIELDS = Object.freeze(["cwd", "originCwd", "worktreePath", "startedWithWorktree", "worktreeRemoved",
  "lazyWorktreePath", "isArchived", "harnessCwd", "branch", "additionalDirectories", "isScratchWorkspace", "remoteTarget", "sshConfig"]);

const MAX_SESSION_ID = 256;
const MAX_PATH = 4096;
const MAX_ADDITIONAL = 256;
const GIT_FILE_BYTES = 4096;

/** IPC input: a session id the renderer may ask about (a non-empty string without control characters). */
function validSessionId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_SESSION_ID && !/[\u0000-\u001f\u007f]/.test(value);
}

/** An absolute local path main may report (no NUL, bounded). */
function absolutePath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_PATH && !value.includes("\0") && path.isAbsolute(value) ? value : null;
}

const samePath = (a, b) => path.resolve(a) === path.resolve(b);
const listed = (list, dir) => Array.isArray(list) && list.some((entry) => typeof entry === "string" && samePath(entry, dir));
/** The value an object map keeps for this folder (its keys are the folders prepare-worktree made). */
function mapped(map, dir) {
  if (!map || typeof map !== "object") return undefined;
  if (Object.hasOwn(map, dir)) return map[dir];
  const key = Object.keys(map).find((entry) => samePath(entry, dir));
  return key === undefined ? undefined : map[key];
}

async function readHead(file) {
  const handle = await fsp.open(file, "r");
  try {
    const buffer = Buffer.alloc(GIT_FILE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, GIT_FILE_BYTES, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally { await handle.close(); }
}

/**
 * The branch a worktree has checked out, from its own git files: `<dir>/.git` is a file `gitdir: <admin dir>` for a
 * linked worktree (a directory for a main checkout) and `<admin dir>/HEAD` is `ref: refs/heads/<branch>`. undefined for
 * a detached HEAD or anything unreadable. Runs no git.
 */
async function worktreeHeadBranch(dir) {
  if (!absolutePath(dir)) return undefined;
  try {
    const dotGit = path.join(dir, ".git");
    const stat = await queued(() => fsp.lstat(dotGit));
    let admin;
    if (stat.isDirectory()) admin = dotGit;
    else if (stat.isFile()) {
      const pointer = /^gitdir:[ \t]*(.+?)[ \t]*$/m.exec(await queued(() => readHead(dotGit)));
      if (!pointer) return undefined;
      admin = path.resolve(dir, pointer[1]);
    } else return undefined;
    const head = /^ref:[ \t]*refs\/heads\/(.+?)[ \t]*$/m.exec(await queued(() => readHead(path.join(admin, "HEAD"))));
    const branch = head?.[1];
    return branch && branch.length <= 255 && !/[\u0000- \u007f~^:?*[\\]/.test(branch) ? branch : undefined;
  } catch { return undefined; }
}

async function folderExists(dir) {
  try { return (await queued(() => fsp.stat(dir))).isDirectory(); } catch { return false; }
}

/**
 * main.cjs `session-rail-meta` {sessionId, cwd?} → the session's local record (shared-8 zh shape; unset fields are
 * left out) or null for a session the app does not know or has no folder for. Throws on a malformed request.
 * @param {{config: object, observedCwds?: Set<string>, scratchRoot?: string, run?: Function}} host
 */
async function sessionRailRecord(request, { config, observedCwds = new Set(), scratchRoot, run } = {}) {
  if (!request || typeof request !== "object" || !validSessionId(request.sessionId)) throw new Error("Unknown session.");
  const id = request.sessionId;
  const open = Array.isArray(config?.threadIds) ? config.threadIds : [], archived = Array.isArray(config?.archivedThreadIds) ? config.archivedThreadIds : [];
  if (!open.includes(id) && !archived.includes(id)) return null;
  const requested = absolutePath(request.cwd);
  const cwd = absolutePath(config.threadMetadata?.[id]?.cwd) ?? (requested && observedCwds.has(requested) ? requested : null);
  if (!cwd) return null;
  const session = config.sessionMetadata?.[id] && typeof config.sessionMetadata[id] === "object" ? config.sessionMetadata[id] : {};
  const recordedOrigin = absolutePath(session.originCwd);
  const recordedBranch = recordedWorktreeBranch(config, cwd);
  const knownWorktree = listed(config.worktreeDirectories, cwd) || mapped(config.worktreeBases, cwd) !== undefined || recordedBranch !== undefined;
  let origin = recordedOrigin ?? absolutePath(mapped(config.worktreeOrigins, cwd));
  if (!origin && knownWorktree) origin = absolutePath(await inferWorktreeOrigin(cwd, run).catch(() => null));
  const appWorktree = knownWorktree || (origin !== null && !samePath(origin, cwd));
  const originCwd = origin ?? cwd;
  const exists = await folderExists(cwd);
  const worktreePath = appWorktree && exists ? cwd : undefined;
  const branch = worktreePath ? (await worktreeHeadBranch(worktreePath)) ?? recordedBranch : appWorktree ? recordedBranch : undefined;
  const additional = Array.isArray(session.additionalFolders)
    ? [...new Set(session.additionalFolders.map(absolutePath).filter(Boolean))].slice(0, MAX_ADDITIONAL) : [];
  const scratch = absolutePath(scratchRoot) ? path.resolve(scratchRoot) + path.sep : null;
  const record = {
    cwd,
    originCwd,
    worktreePath,
    startedWithWorktree: appWorktree,
    worktreeRemoved: appWorktree && !exists,
    isArchived: archived.includes(id),
    branch,
    additionalDirectories: additional.length ? additional : undefined,
    isScratchWorkspace: scratch && (path.resolve(originCwd) + path.sep).startsWith(scratch) ? true : undefined,
  };
  return Object.fromEntries(LOCAL_SESSION_RECORD_FIELDS.filter((key) => record[key] !== undefined).map((key) => [key, record[key]]));
}

module.exports = { sessionRailRecord, worktreeHeadBranch, validSessionId, LOCAL_SESSION_RECORD_FIELDS };
