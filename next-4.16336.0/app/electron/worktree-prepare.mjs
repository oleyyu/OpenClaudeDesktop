// R4g-routines RT2 (r4-code-routines.md §10 WI-2, with research-ext/X5-lazy-worktree.md X5-L1): main.cjs's
// `case "prepare-worktree"` as a pure function whose dependencies are passed in (run, config, save, emit,
// approvedWorkspaceRoots, prefix), so the IPC case, the Code routine runner and a later lazy provider share one
// implementation. Behaviour is the IPC case's, step for step: the same git commands in the same order, the same
// messages, the same config writes and the same return value (the new worktree's folder).
//
// createWorktree is the creation half on its own (no registration in the app's lists), the X5-L1 shape
// createWorktree(run, {cwd, branch, location, onPhase}) that eager and lazy worktrees can both use; prepareWorktree
// adds the IPC case's checks before it and its bookkeeping after it.
//
// Every failure keeps its message (only the message crosses IPC) and gains a non-enumerable `worktreeStage`
// ("cwd" | "branch" | "location" | "mkdir" | "start_point" | "worktree_add" | "register"), and a git that cannot run
// keeps the original error as `cause`; routine-error-category.mjs reads both to pick the official failure category.
import nodeFs from 'node:fs';
import nodePath from 'node:path';
import worktreesModule from './worktrees.cjs';

/** Where in the preparation a failure happened (non-enumerable, so the error's shape is otherwise unchanged). */
function markStage(error, stage) {
  if (error && (typeof error === 'object' || typeof error === 'function') && Object.isExtensible(error) && !Object.hasOwn(error, 'worktreeStage'))
    Object.defineProperty(error, 'worktreeStage', { value: stage, writable: true, configurable: true, enumerable: false });
  return error;
}
const atStage = (stage, fn) => {
  try { return fn(); } catch (error) { throw markStage(error, stage); }
};
const atStageAsync = async (stage, fn) => {
  try { return await fn(); } catch (error) { throw markStage(error, stage); }
};

/**
 * rY/nY: a git that cannot run says so (the renderer's 'Install Git' / 'Git isn't working' dialog). Only the message
 * crosses IPC: its first line is the rY copy the renderer recognizes (git-dialog-model.mjs); a startup failure's git
 * output follows on the next lines. Any other git failure is returned as it is.
 */
export function worktreeGitFailure(error, worktrees = worktreesModule) {
  const unavailable = worktrees.gitUnavailable(error);
  if (!unavailable) return error;
  return new Error(unavailable.reason === 'missing' ? 'Git is required to use a worktree.' : unavailable.reason === 'exec_blocked'
    ? 'Your system blocked OpenClaude Desktop from running Git.' : `Git is installed but isn’t working.${unavailable.message ? `\n${unavailable.message}` : ''}`,
  { cause: error });
}

// R4i-routines RI2: 2.42304.0 asar index.chunk-BAdej_RQ.js createWorktree, when the worktree would start from the
// base checkout's HEAD: `rev-parse --verify --quiet HEAD^{commit}` fails → `for-each-ref --count=1` empty → "Skipping
// worktree creation - … has no commits yet; nothing to branch from" (null: the session starts in the folder itself);
// refs but no HEAD commit → refusedGitStartup "unbornHead" (git_startup_failed, ja's copy). A start point that does
// not resolve falls back to HEAD ("[createWorktree] start point … does not resolve …, falling back to HEAD").
export const UNBORN_HEAD_MESSAGE = 'Git is installed but isn’t working.\nThis folder’s current branch has no commit yet, so a session worktree cannot be created from it. Check out a branch that has commits, then try again.';
// A git that cannot run fails like worktree add would (worktreeGitFailure's copy, stage worktree_add).
const gitCannotRun = (error, worktrees) => worktrees.gitUnavailable(error) ? markStage(worktreeGitFailure(error, worktrees), 'worktree_add') : null;
async function commitResolves(run, cwd, ref, worktrees) {
  try { await run('git', ['-C', cwd, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return true; }
  catch (error) { const failure = gitCannotRun(error, worktrees); if (failure) throw failure; return false; }
}
// Only a for-each-ref that ran and printed nothing proves there are no commits; a failing one refuses (unbornHead).
async function repositoryHasRefs(run, cwd, worktrees) {
  try { return String((await run('git', ['-C', cwd, 'for-each-ref', '--count=1']))?.stdout ?? '').trim() !== ''; }
  catch (error) { const failure = gitCannotRun(error, worktrees); if (failure) throw failure; return true; }
}

/**
 * Add a git worktree for `cwd` (already a real path) on a new branch `<prefix><time>`, starting from `branch` (origin's
 * copy when the local branch is missing or behind it, B29 / cov8-02) or HEAD. Nothing is recorded in the app's lists.
 * @param {Function} run promisified execFile
 * @param {{cwd: string, branch?: string, prefix: string | (() => string), location?: string, directory?: string,
 *   onPhase?: (phase: string) => void, now?: () => number, worktrees?: object, fs?: object, path?: object}} options
 *   location/directory: config.worktreeLocation / config.worktreeDirectory ("custom" puts worktrees in directory,
 *   anything else in <cwd>/.code/worktrees).
 *   skipWithoutCommits (R4i-routines RI2, the Code routine runner): the official createWorktree's start checks — a
 *   repository with no commits and no refs resolves to null (no worktree, nothing created), one whose HEAD names no
 *   commit refuses (UNBORN_HEAD_MESSAGE), and a branch that does not resolve starts from HEAD.
 * @returns {Promise<{path: string, branch: string, base: string, start: string, cwd: string} | null>}
 */
export async function createWorktree(run, { cwd, branch, prefix, location, directory, onPhase, now = Date.now,
  worktrees = worktreesModule, fs = nodeFs, path = nodePath, skipWithoutCommits = false } = {}) {
  // Before anything is created (no worktree folder in a repository that cannot have one).
  let headResolves = true;
  if (skipWithoutCommits) {
    headResolves = await atStageAsync('start_point', () => commitResolves(run, cwd, 'HEAD', worktrees));
    if (!headResolves) {
      if (!(await atStageAsync('start_point', () => repositoryHasRefs(run, cwd, worktrees)))) return null;
      if (!branch) throw markStage(new Error(UNBORN_HEAD_MESSAGE), 'worktree_add');
    }
  }
  // Named after the running core ("deepseek/…", "kimi/…"), never a hard-coded agent the user doesn't use.
  const name = (typeof prefix === 'function' ? prefix() : prefix) + now().toString(36);
  const base = location === 'custom' ? directory : path.join(cwd, '.code', 'worktrees');
  if (!base) throw markStage(new Error('Choose a custom worktree directory first.'), 'location');
  const dest = path.join(base, path.basename(cwd) + '-' + now().toString(36));
  atStage('mkdir', () => fs.mkdirSync(path.dirname(dest), { recursive: true }));
  // B29 (asar createWorktree onInitStatus, cc43287c9 _3): each step ('Refreshing origin…', 'Adding worktree…'); the
  // base branch is fetched first and a behind local branch starts from origin.
  const phase = (step) => { onPhase?.(step); };
  const { start } = branch
    ? await atStageAsync('start_point', () => worktrees.refreshedStartPoint(run, cwd, branch, { onPhase: phase }))
    : { start: 'HEAD' };
  let from = start || branch || 'HEAD';
  if (skipWithoutCommits && from !== 'HEAD' && !(await atStageAsync('start_point', () => commitResolves(run, cwd, from, worktrees)))) {
    if (!headResolves) throw markStage(new Error(UNBORN_HEAD_MESSAGE), 'worktree_add');
    from = 'HEAD';
  }
  phase('worktree_add');
  try {
    await run('git', ['-C', cwd, 'worktree', 'add', '-b', name, dest, from]);
  } catch (error) { throw markStage(worktreeGitFailure(error, worktrees), 'worktree_add'); }
  return { path: dest, branch: name, base, start: from, cwd };
}

/**
 * main.cjs `case "prepare-worktree"`: `p` is the IPC payload {cwd, branch, token}; the dependencies are main's own.
 * @param {{cwd?: string, branch?: string, token?: string}} p
 * @param {{run: Function, config: object, save: () => void, emit?: (event: object) => void,
 *   approvedWorkspaceRoots: Set<string>, prefix: string | (() => string), now?: () => number, worktrees?: object,
 *   fs?: object, path?: object}} deps
 *   p.skipWithoutCommits (R4i-routines RI2, the Code routine runner only): createWorktree's official start checks; a
 *   repository with no commits yet resolves to null (nothing is created or recorded).
 * @returns {Promise<string | null>} the new worktree's folder
 */
export async function prepareWorktree(p = {}, { run, config, save, emit, approvedWorkspaceRoots, prefix, now = Date.now,
  worktrees = worktreesModule, fs = nodeFs, path = nodePath } = {}) {
  const cwd = atStage('cwd', () => fs.realpathSync(p.cwd || config.cwd));
  if (typeof p.branch !== 'string' || p.branch.startsWith('-'))
    throw markStage(new Error('Invalid branch.'), 'branch');
  // The window that asked shows each step (the renderer listens for its own token).
  const token = typeof p.token === 'string' && p.token.length <= 64 ? p.token : null;
  const onPhase = (name) => { if (token) emit?.({ kind: 'worktree-phase', token, phase: name }); };
  const created = await createWorktree(run, { cwd, branch: p.branch, prefix, location: config.worktreeLocation,
    directory: config.worktreeDirectory, onPhase, now, worktrees, fs, path, skipWithoutCommits: p.skipWithoutCommits === true });
  if (created === null) return null;
  const dest = created.path;
  approvedWorkspaceRoots.add(dest);
  // Inside the repository (the default .code/worktrees): kept out of the main checkout's status.
  await worktrees.excludeWorktreeRoot(run, cwd, created.base).catch(() => null);
  atStage('register', () => {
    config.worktreeDirectories = [...new Set([...(config.worktreeDirectories || []), dest])]; save();
    // Persist the real creation base so the session's comparison never silently falls back to the inferred default branch.
    // (A routine's branch that did not resolve started from HEAD: no recorded base, R4i-routines RI2.)
    if (p.branch && !(p.skipWithoutCommits === true && created.start === 'HEAD')) { config.worktreeBases[dest] = p.branch; save(); }
    // R4g-small SM3 (X5-E1): the new branch is recorded and outlives the folder (the rail's recorded branch).
    (worktrees.recordWorktreeBranch ?? worktreesModule.recordWorktreeBranch)(config, dest, created.branch);
    // c749529a1 _ (originCwd): the Recent folders list names the repository, never the worktree.
    config.worktreeOrigins = { ...(config.worktreeOrigins && typeof config.worktreeOrigins === 'object' ? config.worktreeOrigins : {}), [dest]: cwd }; save();
  });
  return dest;
}
