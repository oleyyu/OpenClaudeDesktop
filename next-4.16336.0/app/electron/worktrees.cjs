// Worktree sessions' housekeeping (main.cjs prepare-worktree, archive / delete, Settings › Storage), after the official
// 2.2553.1 behaviour: a worktree inside the repository is excluded from the main checkout's status, a session's own
// worktree goes away when the session is archived or deleted (after confirming uncommitted changes), and Storage
// removes the worktrees no session uses any more.
const fs = require("node:fs");
const path = require("node:path");
const { t } = require("./i18n/index.mjs");

const GIT = (run, cwd, args, options = {}) => run("git", ["-C", cwd, ...args], { timeout: 20000, maxBuffer: 8 * 1024 * 1024, ...options });

/**
 * Keep a worktree folder inside the repository out of the main checkout's `git status`: its root goes into the
 * repository's own .git/info/exclude (never the tracked .gitignore). No-op when the folder is outside the repository.
 * @returns {Promise<string|null>} the pattern written (or already there), else null
 */
async function excludeWorktreeRoot(run, repoCwd, base) {
  let top, common;
  try {
    top = String((await GIT(run, repoCwd, ["rev-parse", "--show-toplevel"])).stdout).trim();
    common = String((await GIT(run, repoCwd, ["rev-parse", "--git-common-dir"])).stdout).trim();
  } catch { return null; }
  if (!top || !common) return null;
  const root = fs.realpathSync(top), folder = path.resolve(base);
  const relative = path.relative(root, folder);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const pattern = `/${relative.split(path.sep).join("/")}/`;
  const exclude = path.join(path.isAbsolute(common) ? common : path.join(repoCwd, common), "info", "exclude");
  let text = "";
  try { text = fs.readFileSync(exclude, "utf8"); } catch {}
  if (text.split(/\r?\n/).some((line) => line.trim() === pattern)) return pattern;
  fs.mkdirSync(path.dirname(exclude), { recursive: true });
  fs.appendFileSync(exclude, `${text && !text.endsWith("\n") ? "\n" : ""}# OpenClaude Desktop worktrees\n${pattern}\n`);
  return pattern;
}

// index.chunk-BSJ_SW2t probeUncommittedChanges / statusPorcelain (maxLines is = 1e4): the porcelain lines themselves,
// which the dirty-worktree confirm lists (shared-19 DK, first 10 and "… and {more} more").
const STATUS_FILE_LIMIT = 10000;

/** {exists, changes, files}: the uncommitted entries (untracked included) of a worktree folder, as a count and as
 * their `git status --porcelain` lines (at most 10,000); `unknown` when git could not read it. */
async function worktreeStatus(run, dir) {
  if (typeof dir !== "string" || !fs.existsSync(dir)) return { exists: false, changes: 0, files: [] };
  try {
    const output = String((await GIT(run, dir, ["status", "--porcelain=v1", "--untracked-files=all"])).stdout);
    const lines = output.split("\n").filter((line) => line.trim());
    return { exists: true, changes: lines.length, files: lines.slice(0, STATUS_FILE_LIMIT) };
  } catch { return { exists: true, changes: 0, files: [], unknown: true }; }
}

/**
 * Remove a worktree with git (its branch and commits stay), from the repository's main checkout, then prune. A folder
 * git no longer knows as a worktree is left alone (it may be the user's).
 * @returns {Promise<boolean>} whether the folder is gone
 */
async function removeWorktree(run, dir) {
  if (typeof dir !== "string" || !path.isAbsolute(dir)) return false;
  if (!fs.existsSync(dir)) return true;
  let main = null;
  try {
    const listing = String((await GIT(run, dir, ["worktree", "list", "--porcelain"])).stdout);
    main = /^worktree (.+)$/m.exec(listing)?.[1] ?? null;
  } catch { return false; }
  if (!main || path.resolve(main) === path.resolve(dir)) return false;
  try { await GIT(run, main, ["worktree", "remove", "--force", dir]); } catch { return false; }
  try { await GIT(run, main, ["worktree", "prune"]); } catch {}
  return !fs.existsSync(dir);
}

/** The worktree folders no session (open or archived) works in any more. */
function unusedWorktrees(config) {
  const used = new Set([...(config.threadIds || []), ...(config.archivedThreadIds || [])]
    .map((id) => config.threadMetadata?.[id]?.cwd).filter((cwd) => typeof cwd === "string").map((cwd) => path.resolve(cwd)));
  return (config.worktreeDirectories || []).filter((dir) => typeof dir === "string" && !used.has(path.resolve(dir)));
}

// R4g-small SM3 (research-ext/X5-lazy-worktree.md X5-E1, D38): the branch prepare-worktree created, kept like the
// original's LocalSession `branch` (asar 2.42304.0 index.chunk-CFJssAFf.js formatSessionForEvent `branch:e.branch`;
// the deleted-worktree fallback "Worktree at ${s} was deleted; falling back to origin repo" clears worktreePath,
// worktreeName and sourceBranch but keeps branch, so the rail's VE `recorded:O?.branch` still names it). The host keeps
// no LocalSession objects, so the record is config.worktreeBranches[<worktree folder>] = <branch>.
/** A branch name the record may keep (what `git worktree add -b` accepted: bounded, no control characters). */
function recordableBranch(branch) {
  return typeof branch === "string" && branch.length > 0 && branch.length <= 255 && !branch.startsWith("-") && !/[\u0000- \u007f~^:?*[\\]/.test(branch);
}
// R4i-small SM3: the original's branch lives on its LocalSession, so it goes when the session goes. The host keys
// the record by folder, so a record is kept only while its folder is still one of the app's worktrees
// (worktreeDirectories: prepared, its session maybe not started yet) or an open or archived session still names it as
// its cwd; anything else (its session was deleted after the folder was removed) is dropped. Run on every record and
// forget, so the map never outgrows the app's worktrees plus its sessions.
function pruneWorktreeBranches(config) {
  const map = config?.worktreeBranches;
  if (!map || typeof map !== "object") return;
  const kept = new Set([...(Array.isArray(config.worktreeDirectories) ? config.worktreeDirectories : []),
    ...[...(config.threadIds || []), ...(config.archivedThreadIds || [])].map((id) => config.threadMetadata?.[id]?.cwd)]
    .filter((dir) => typeof dir === "string" && dir).map((dir) => path.resolve(dir)));
  for (const key of Object.keys(map)) if (!kept.has(path.resolve(key))) delete map[key];
}
/** prepare-worktree: remember the new worktree's branch (the caller saves the config). */
function recordWorktreeBranch(config, dir, branch) {
  if (typeof dir !== "string" || !path.isAbsolute(dir) || !recordableBranch(branch)) return false;
  pruneWorktreeBranches(config);
  config.worktreeBranches = { ...(config.worktreeBranches && typeof config.worktreeBranches === "object" ? config.worktreeBranches : {}), [dir]: branch };
  return true;
}
/** The branch recorded for a worktree folder (folders compare resolved), else undefined. */
function recordedWorktreeBranch(config, dir) {
  const map = config?.worktreeBranches;
  if (!map || typeof map !== "object" || typeof dir !== "string") return undefined;
  const key = Object.hasOwn(map, dir) ? dir : Object.keys(map).find((entry) => path.resolve(entry) === path.resolve(dir));
  return key !== undefined && recordableBranch(map[key]) ? map[key] : undefined;
}

/** Drop a removed worktree from the app's lists. */
function forgetWorktree(config, dir) {
  config.worktreeDirectories = (config.worktreeDirectories || []).filter((entry) => path.resolve(entry) !== path.resolve(dir));
  if (config.worktreeBases && Object.hasOwn(config.worktreeBases, dir)) delete config.worktreeBases[dir];
  // Its sessions keep their own sessionMetadata.originCwd for the Recent folders list.
  if (config.worktreeOrigins && Object.hasOwn(config.worktreeOrigins, dir)) delete config.worktreeOrigins[dir];
  // X5-E1: the branch record outlives the folder while a session (open or archived) still names it as its cwd, as the
  // original's session keeps `branch` after its worktree was deleted; with no such session it goes too, and so does
  // any other record whose session has since been deleted (R4i-small SM3 pruneWorktreeBranches).
  pruneWorktreeBranches(config);
}

// B29 worktree start (asar index.chunk-BSJ_SW2t.js createWorktree: onInitStatus 'worktree_fetch' → refreshSourceRef,
// resolveWorktreeStartPoint, then 'worktree_add'). Before `git worktree add` the base branch is fetched from origin
// (+refs/heads/<branch>:refs/remotes/origin/<branch>, no FETCH_HEAD), at most once a minute per repository and branch;
// a failed or refused fetch continues from the refs on disk. The worktree then starts at origin's commit when the
// local branch is missing or behind it (a fast-forward), else at the local branch.
const SOURCE_REF_MAX_AGE_MS = 60000;
const lastSourceRefFetch = new Map();
/** Ja: a branch name the fetch refspec can carry safely. */
function fetchableBranch(branch) {
  return typeof branch === "string" && branch.length > 0 && branch.length <= 255 && !branch.startsWith("-") && !branch.startsWith("origin/")
    && !branch.startsWith("refs/") && /^[A-Za-z0-9._/-]+$/.test(branch) && !branch.includes("..") && !branch.endsWith(".lock") && !branch.endsWith("/");
}
async function revParse(run, cwd, ref) {
  try { return String((await GIT(run, cwd, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])).stdout).trim() || null; }
  catch { return null; }
}

// cov8-02 (asar 2.42304.0 index.chunk-BAdej_RQ.js Ta / Ea / Ca and the worktree class's readVettedTrackingRef,
// vetTrackingRef and probeSymbolicRef; the same code as 2.37337.1 index.chunk-DknswonR.js apart from minified names):
// a remote-tracking ref becomes a worktree's start point only once it is known to be a plain ref. git itself never
// makes refs/remotes/<remote>/<branch> symbolic, and a fetch writes through one, so a symbolic (or unconfirmable) ref
// is refused with instructions and no worktree is added (createWorktree → "tracking_ref_untrusted"). The kill switch
// qi() = !gb("3916121268") has no GrowthBook behind it here: the check is on, its default. Host differences: the copy
// names OpenClaude Desktop and is translated (t); "the log" is the main process's console.
/** Ta: why the start point was refused; `gitStartup` when git itself could not probe the ref. */
class WorktreeStartRefused extends Error {
  constructor(message, gitStartup) {
    super(message);
    this.name = "WorktreeStartRefused";
    this.code = "tracking_ref_untrusted";
    if (gitStartup) this.gitStartup = gitStartup;
  }
}
/** Ca: a ref name the delete command can quote as is. */
const quotableRef = (ref) => /^[A-Za-z0-9._/-]+$/.test(ref);
/** Ea: the refusal for a symbolic ref (`kind` "symbolic", HEAD or a branch) or one git could not confirm ("unconfirmed"). */
function trackingRefRefusal(ref, kind) {
  if (kind === "unconfirmed")
    return t("OpenClaude Desktop could not create a worktree: git could not read this repository's remote-tracking ref for the branch to confirm it is a plain ref (the OpenClaude Desktop log has git's own words). Check that ref under .git/refs/remotes, or delete it, then run \"git fetch\" in the repository and try again.");
  if (ref.endsWith("/HEAD"))
    return t("OpenClaude Desktop could not create a worktree: this repository's remote HEAD leads through a symbolic remote-tracking ref, which git itself never creates there, so the remote's default branch cannot be read from it. List the remote-tracking refs (git for-each-ref --format=\"%(refname) %(symref)\" refs/remotes), delete each branch entry that shows a second column (git symbolic-ref --delete <refname>), then run \"git fetch\" in the repository and try again.");
  return t("OpenClaude Desktop could not create a worktree: this repository's remote-tracking ref for the branch is a symbolic ref, which git itself never creates there, so the remote's copy of the branch cannot be read from it. Delete it ({command}), then run \"git fetch\" in the repository and try again.",
    { command: quotableRef(ref) ? `git symbolic-ref --delete ${ref}` : "git symbolic-ref --delete refs/remotes/<remote>/<branch>" });
}
/** execGit's result shape over the local runner: git ran (exitCode) or did not start at all (errorKind). */
async function gitResult(run, cwd, args) {
  try { return { success: true, output: String((await GIT(run, cwd, args)).stdout ?? "") }; }
  catch (error) {
    const exitCode = typeof error?.code === "number" ? error.code : undefined;
    return { success: false, output: String(error?.stdout ?? ""), error: String(error?.stderr || error?.message || ""), exitCode,
      ...(exitCode === undefined ? { errorKind: "failed", detail: error?.code ?? error?.signal ?? null } : {}) };
  }
}
/** probeSymbolicRef: `git symbolic-ref -q <ref>` says symbolic (exit 0), not (exit 1), or nothing certain. */
async function probeSymbolicRef(run, cwd, ref) {
  const probe = await gitResult(run, cwd, ["symbolic-ref", "-q", ref]);
  return { verdict: probe.success ? "symbolic" : probe.errorKind === undefined && probe.exitCode === 1 ? "not" : "unconfirmed", probe };
}
/** vetTrackingRef: {kind: commit (oid) | absent | symbolic | unconfirmed | git}. A symbolic refs/remotes/<r>/HEAD that
 * points at a branch of the same remote is followed once and that branch vetted instead. */
async function vetTrackingRef(run, cwd, ref, depth = 0) {
  const [{ verdict, probe }, listing] = await Promise.all([
    probeSymbolicRef(run, cwd, ref),
    gitResult(run, cwd, ["for-each-ref", "--format=%(refname)%00%(symref)%00%(objectname)", ref]),
  ]);
  const failed = (result) => ({ kind: "git", error: result.error ?? "", detail: result.detail, posture: result.errorKind === "posture" });
  const rows = listing.success ? listing.output.split("\n").map((line) => line.replace(/\r$/, "").split("\0")).filter((row) => row.length === 3) : [];
  const row = rows.find(([name]) => name === ref) ?? rows.find(([name]) => name.toLowerCase() === ref.toLowerCase());
  if (verdict === "symbolic") {
    const head = /^(refs\/remotes\/[^/]+\/)HEAD$/.exec(ref), target = (probe.output ?? "").trim();
    return head !== null && depth === 0 && target.startsWith(head[1]) && !target.endsWith("/HEAD")
      ? vetTrackingRef(run, cwd, target, 1) : { kind: "symbolic", ref };
  }
  if (probe.errorKind !== undefined) return failed(probe);
  if (!listing.success) return failed(listing);
  if (verdict === "unconfirmed") {
    const format = await gitResult(run, cwd, ["check-ref-format", ref]);
    if (!format.success && format.errorKind === undefined && row === undefined) return { kind: "absent" };
    console.warn(`[createWorktree] could not confirm that ${JSON.stringify(ref)} is a plain ref (git said ${JSON.stringify(probe.error ?? "")})`, { baseRepo: cwd });
    return { kind: "unconfirmed", ref };
  }
  if (row === undefined) return { kind: "absent" };
  const [, symref, oid] = row;
  if (symref !== "") return { kind: "symbolic", ref };
  if (!/^[0-9a-f]{40,64}$/.test(oid)) return { kind: "absent" };
  const commit = await gitResult(run, cwd, ["rev-parse", "--verify", "--quiet", `${oid}^{commit}`]);
  const resolved = (commit.success && commit.output.trim()) || undefined;
  return resolved === undefined ? { kind: "absent" } : { kind: "commit", oid: resolved };
}
/** readVettedTrackingRef: the ref's commit, null when it does not exist; throws WorktreeStartRefused otherwise. */
async function readVettedTrackingRef(run, cwd, ref) {
  const vetted = await vetTrackingRef(run, cwd, ref);
  switch (vetted.kind) {
    case "commit": return vetted.oid;
    case "absent": return null;
    case "git": throw new WorktreeStartRefused("git could not probe a tracking ref", { error: vetted.error, detail: vetted.detail, kind: vetted.posture ? "posture" : "failed" });
    default: throw new WorktreeStartRefused(trackingRefRefusal(vetted.ref, vetted.kind));
  }
}
/**
 * The start point for a new worktree off `branch`: {start, fetched, outcome}. onPhase('worktree_fetch') announces the
 * fetch. Never throws for a fetch problem; a git that cannot run at all surfaces in the later worktree add. Throws
 * WorktreeStartRefused (cov8-02) when origin's remote-tracking ref for the branch is symbolic or cannot be confirmed
 * to be a plain ref: the caller then adds no worktree.
 */
async function refreshedStartPoint(run, cwd, branch, { onPhase, now = Date.now } = {}) {
  if (!fetchableBranch(branch)) return { start: branch || "HEAD", outcome: "skipped_ref" };
  let hasOrigin = false;
  try { hasOrigin = !!String((await GIT(run, cwd, ["remote", "get-url", "origin"])).stdout).trim(); } catch { hasOrigin = false; }
  if (!hasOrigin) return { start: branch, outcome: "no_origin" };
  const key = `${path.resolve(cwd)}\0${branch}`;
  let outcome = "throttled";
  const last = lastSourceRefFetch.get(key);
  if (last === undefined || now() - last >= SOURCE_REF_MAX_AGE_MS) {
    onPhase?.("worktree_fetch");
    try {
      await GIT(run, cwd, ["fetch", "--no-write-fetch-head", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`],
        { timeout: 30000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
      lastSourceRefFetch.set(key, now());
      outcome = "fetched";
    } catch { outcome = "failed"; }
  }
  // resolveWorktreeStartPoint c → readVettedTrackingRef (cov8-02) instead of a plain rev-parse of the tracking ref.
  const [remote, local] = await Promise.all([readVettedTrackingRef(run, cwd, `refs/remotes/origin/${branch}`), revParse(run, cwd, `refs/heads/${branch}`)]);
  if (remote && (!local || local === remote)) return { start: remote, outcome, fastForward: false };
  if (remote && local) {
    try {
      await GIT(run, cwd, ["merge-base", "--is-ancestor", local, remote]);
      return { start: remote, outcome, fastForward: true };
    } catch { /* the local branch has commits origin lacks: keep it */ }
  }
  return { start: local ? branch : remote ?? branch, outcome, fastForward: false };
}

// B29 rY/nY (cc43287c9 :17250-17390, I.ExecBlocked / I.StartupFailed / missing): why git could not run.
// ENOENT is no git at all; macOS's /usr/bin/git stub without the Command Line Tools fails with xcrun's
// "invalid active developer path" / "no developer tools"; EACCES/EPERM is a blocked exec; anything else that kept git
// from starting (a broken config file) is a startup failure.
function gitUnavailable(error) {
  if (!error) return null;
  const text = `${error.stderr ?? ""}\n${error.message ?? ""}`;
  if (error.code === "ENOENT" || /xcrun: error: invalid active developer path|No developer tools were found|xcode-select: note: no developer tools/i.test(text))
    return { reason: "missing" };
  if (error.code === "EACCES" || error.code === "EPERM") return { reason: "exec_blocked" };
  if (/fatal: (?:bad config|unable to access '[^']*config)|error: could not lock config file|fatal: unknown error occurred while reading the configuration files/i.test(text))
    return { reason: "startup_failed", message: String(error.stderr || error.message || "").trim().split("\n").slice(0, 3).join("\n") };
  return null;
}

module.exports = { excludeWorktreeRoot, worktreeStatus, removeWorktree, unusedWorktrees, forgetWorktree, recordWorktreeBranch, recordedWorktreeBranch, pruneWorktreeBranches, refreshedStartPoint, fetchableBranch, gitUnavailable,
  readVettedTrackingRef, vetTrackingRef, trackingRefRefusal, WorktreeStartRefused,
  _resetSourceRefFetches: () => lastSourceRefFetch.clear() };
