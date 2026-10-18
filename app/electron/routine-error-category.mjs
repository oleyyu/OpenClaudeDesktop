// R4g-routines RT2 (r4-code-routines.md §7 and §10 WI-2, hostGap 12): a routine launch failure in the main process →
// the official failure category, appended to the message as ` [ccdErrorCategory:<category>]` so the Code Routines page's
// Run now toast (2.42304.0 cbd6c85c8 Hc: shared-52 kx reads the tag, shared-14 Ft gives the cause title and retryHelps)
// can say why it failed. Only categories the host really determines are sent; anything else stays untagged and the
// page shows its generic "Couldn’t start “{name}”. Try again.".
//
// Official sources (2.42304.0):
//   - asar index.chunk-DBPLojse.js Je/Xe/Ze/Qe: strip the trailing tags, append ` [ccdErrorCategory:${category}]`,
//     redefine `message` (non-enumerable) and remember the error (WeakSet) so it is tagged once;
//     `We="[ccdErrorCategory:"`, `Ke=/^[a-z_]+$/`.
//   - asar index.chunk-DBPLojse.js F (the classifier) and index.chunk-BAdej_RQ.js createWorktree: which failure is
//     which category (git_not_found, git_startup_failed, worktree_branch_in_use, git_checkout_failed, disk_full,
//     "Claude Desktop could not create a worktree:" → unknown, i.e. no cause).
//   - ion-dist shared-52 xx `/\[ccdErrorCategory:([a-z_]+)\]$/` (the renderer's reader), shared-14 the category table.
//
// Host adaptations: the host's own worktree code (worktree-prepare.mjs, worktrees.cjs) and runner say the same things in
// their own words, so the classification reads the failure's stage, its error code and git's stderr instead of the
// official message prefixes. Categories withheld because they are not true here: auth_error / session_stale_relogin /
// subscription_past_due / untrusted_device (no account sign-in), timeout ("Claude Code stopped responding": the host's
// core is not the Claude Code CLI), trust_required (no workspace-trust dialog), and every remote / SSH / CLI-binary one.

import worktreesModule from './worktrees.cjs';

/** shared-52 xx: the tag the renderer reads, at the very end of the message. */
export const ERROR_CATEGORY_PATTERN = /\[ccdErrorCategory:([a-z_]+)\]$/;
const CATEGORY_TAG = '[ccdErrorCategory:';
const SSH_TAG = '[sshFailureReason:';
const TCC_TAG = '[tccFolderKind:';
const TAG_VALUE = /^[a-z_]+$/;
const TCC_VALUE = /^[A-Za-z]+$/;

/**
 * The categories this host sends, each with the shared-14 title the Run now toast shows (for reference and tests;
 * the renderer has its own copy) and retryHelps. Every one is a key of the shared-14 table.
 */
export const HOST_ROUTINE_ERROR_CATEGORIES = Object.freeze({
  cwd_not_found: { title: 'Folder not found', retryHelps: false },
  not_git_repo: { title: 'This folder isn’t a Git repository', retryHelps: false },
  git_not_found: { title: 'Git is required', retryHelps: true },
  git_startup_failed: { title: 'Git isn’t working', retryHelps: true },
  git_checkout_failed: { title: 'Couldn’t check out the branch', retryHelps: false },
  worktree_branch_in_use: { title: 'This session’s branch is checked out in another folder', retryHelps: true },
  git_isolation_failed: { title: 'Couldn’t set up Git for this session', retryHelps: true },
  disk_full: { title: 'Not enough disk space', retryHelps: true },
  filesystem_error: { title: 'Couldn’t read or write session files', retryHelps: true },
  network_error: { title: 'Connection lost', retryHelps: true },
  api_overloaded: { title: 'Service is busy', retryHelps: true },
  api_server_error: { title: 'Server error', retryHelps: true },
  // rate_limit's title is shared-3 sn.generic; Hc never offers "Try again" for it (retryHelps && !rate_limit).
  rate_limit: { title: 'Usage limit reached', retryHelps: true },
});

/** Official categories the host never sends (see the header). */
export const WITHHELD_ROUTINE_ERROR_CATEGORIES = Object.freeze([
  'auth_error', 'session_stale_relogin', 'subscription_past_due', 'untrusted_device', 'timeout', 'trust_required', 'unknown',
]);

export const isHostRoutineErrorCategory = (category) => typeof category === 'string' && Object.hasOwn(HOST_ROUTINE_ERROR_CATEGORIES, category);

/** DBPLojse Je: the message without its trailing [ccdErrorCategory:…] / [sshFailureReason:…] / [tccFolderKind:…] tags. */
export function stripErrorCategoryTags(message) {
  let text = String(message ?? '');
  for (;;) {
    const trimmed = text.trimEnd();
    if (!trimmed.endsWith(']')) return trimmed;
    const open = trimmed.lastIndexOf('[');
    if (open === -1) return trimmed;
    const tag = trimmed.startsWith(CATEGORY_TAG, open) ? CATEGORY_TAG : trimmed.startsWith(SSH_TAG, open) ? SSH_TAG
      : trimmed.startsWith(TCC_TAG, open) ? TCC_TAG : null;
    if (tag === null) return trimmed;
    const value = trimmed.slice(open + tag.length, -1);
    if (!(tag === TCC_TAG ? TCC_VALUE : TAG_VALUE).test(value)) return trimmed;
    text = trimmed.slice(0, open);
  }
}

/** The category a message (or error) already carries, else undefined. */
export function readErrorCategory(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return ERROR_CATEGORY_PATTERN.exec(message)?.[1];
}

const tagged = new WeakSet();
/**
 * DBPLojse Ze/Qe: append ` [ccdErrorCategory:<category>]` to the error's message (existing tags first stripped), once
 * per error. A category the host does not send leaves the error as it is. A non-Error becomes an Error.
 * @returns {Error}
 */
export function withErrorCategory(error, category) {
  const target = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
  if (!isHostRoutineErrorCategory(category) || tagged.has(target)) return target;
  Object.defineProperty(target, 'message', { value: `${stripErrorCategoryTags(target.message)} [ccdErrorCategory:${category}]`,
    writable: true, configurable: true, enumerable: false });
  tagged.add(target);
  return target;
}

const text = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));
/** Everything git (or the OS) said about a failure: its stderr, message and those of its cause. */
function failureText(error) {
  const cause = error?.cause;
  return [error?.stderr, error?.message, cause?.stderr, cause?.message].map(text).filter(Boolean).join('\n');
}
const codeOf = (error) => (typeof error?.code === 'string' ? error.code : typeof error?.cause?.code === 'string' ? error.cause.code : undefined);

const DISK_FULL_CODES = new Set(['ENOSPC', 'EDQUOT']);
const FILESYSTEM_CODES = new Set(['EACCES', 'EPERM', 'EROFS']);
const DISK_FULL_TEXT = /No space left on device|Disk quota exceeded/i;
const FILESYSTEM_TEXT = /Permission denied|Read-only file system|Operation not permitted/i;
// git's words when the branch to check out is held by another worktree (BAdej_RQ Ts reads the same two).
const BRANCH_IN_USE_TEXT = /is already checked out at|is already used by worktree at|already checked out at|already used by worktree/i;
// git's words when the start point cannot be checked out (BAdej_RQ Ts: invalid reference / did not match any).
const CHECKOUT_TEXT = /invalid reference|did not match any|not a valid object name|not a valid branch name|unknown revision/i;
const NOT_A_REPOSITORY_TEXT = /not a git repository/i;

/**
 * A failure of worktree-prepare.mjs (prepareWorktree / createWorktree) → category, or null when no official cause fits.
 * Reads the non-enumerable `worktreeStage`, the error code and git's stderr.
 *   - git missing (gitUnavailable "missing") → git_not_found; blocked or failing to start → git_startup_failed
 *     (official "Git is installed but isn't working" → git_startup_failed; exec_blocked has no category of its own).
 *   - cwd stage ENOENT / ENOTDIR → cwd_not_found.
 *   - "Invalid branch." → git_checkout_failed (official "Invalid branch name " → git_checkout_failed).
 *   - start point refused because the remote-tracking ref is symbolic or unconfirmed → null (official "Claude Desktop
 *     could not create a worktree:" → unknown); refused because git could not probe it → git_startup_failed
 *     (official refusedGitStartup).
 *   - worktree add: not a repository → not_git_repo; branch held elsewhere → worktree_branch_in_use; bad start point →
 *     git_checkout_failed; out of space → disk_full; permissions / read-only → filesystem_error; anything else →
 *     git_isolation_failed.
 *   - mkdir of the worktree folder: ENOSPC/EDQUOT → disk_full (official createWorktree mkdir), EACCES/EPERM/EROFS →
 *     filesystem_error.
 *   - "Choose a custom worktree directory first." and register (config save) failures → null.
 * @returns {string|null}
 */
export function classifyWorktreeError(error, { worktrees = worktreesModule } = {}) {
  if (!error) return null;
  const stage = error.worktreeStage;
  const code = codeOf(error);
  const said = failureText(error);
  if (stage === 'worktree_add' || stage === undefined) {
    // worktree-prepare.mjs worktreeGitFailure's own first lines (the error may have lost its cause on the way).
    if (/^Git is required to use a worktree\./.test(text(error.message))) return 'git_not_found';
    if (/^Your system blocked OpenClaude Desktop from running Git\./.test(text(error.message))
      || /^Git is installed but isn’t working\./.test(text(error.message))) return 'git_startup_failed';
  }
  if (stage === 'worktree_add') {
    const unavailable = worktrees.gitUnavailable(error.cause ?? error);
    if (unavailable) return unavailable.reason === 'missing' ? 'git_not_found' : 'git_startup_failed';
  }
  switch (stage) {
    case 'cwd':
      return code === 'ENOENT' || code === 'ENOTDIR' ? 'cwd_not_found' : null;
    case 'branch':
      return 'git_checkout_failed';
    case 'location':
    case 'register':
      return null;
    case 'mkdir':
      if (DISK_FULL_CODES.has(code)) return 'disk_full';
      return FILESYSTEM_CODES.has(code) ? 'filesystem_error' : null;
    case 'start_point':
      if (error.code === 'tracking_ref_untrusted') return error.gitStartup ? 'git_startup_failed' : null;
      return null;
    case 'worktree_add':
      if (NOT_A_REPOSITORY_TEXT.test(said)) return 'not_git_repo';
      if (BRANCH_IN_USE_TEXT.test(said)) return 'worktree_branch_in_use';
      if (CHECKOUT_TEXT.test(said)) return 'git_checkout_failed';
      if (DISK_FULL_CODES.has(code) || DISK_FULL_TEXT.test(said)) return 'disk_full';
      if (FILESYSTEM_CODES.has(code) || FILESYSTEM_TEXT.test(said)) return 'filesystem_error';
      return 'git_isolation_failed';
    default:
      return null;
  }
}

/**
 * The routine's folder could not be used before anything started (the runner's own existence check, or an fs call on
 * it): ENOENT / ENOTDIR → cwd_not_found; out of space → filesystem_error (disk_full's copy is about setting up a
 * worktree); EACCES / EPERM → null (the official cwd_inaccessible has no entry in the renderer's table).
 */
export function classifyFolderError(error) {
  const code = codeOf(error);
  if (code === 'ENOENT' || code === 'ENOTDIR') return 'cwd_not_found';
  if (DISK_FULL_CODES.has(code) || code === 'EROFS') return 'filesystem_error';
  return null;
}

/**
 * A core RPC failure ({message, code, data} from main.cjs's `__codeDesktopRpcError`, or a TurnError-shaped object):
 * classified with the host's own turn-error model (src/turn-error-model.mjs turnErrorCategory, passed in so this
 * main-process module does not import renderer code) when the failure carries a CodexErrorInfo. network → network_error,
 * overloaded → api_overloaded, server_error → api_server_error, rate_limit → rate_limit. Everything
 * else (a disconnected core, "Switch to … to run", an unavailable model, auth, invalid request) → null.
 */
export function classifyRpcError(rpcError, { turnErrorCategory } = {}) {
  if (!rpcError || typeof turnErrorCategory !== 'function') return null;
  const data = rpcError.data && typeof rpcError.data === 'object' ? rpcError.data : null;
  const turnError = rpcError.codexErrorInfo !== undefined ? rpcError
    : data?.codexErrorInfo !== undefined ? { message: rpcError.message, ...data }
    : data?.error && typeof data.error === 'object' && data.error.codexErrorInfo !== undefined ? data.error : null;
  if (!turnError) return null;
  switch (turnErrorCategory(turnError)) {
    case 'network': return 'network_error';
    case 'overloaded': return 'api_overloaded';
    case 'server_error': return 'api_server_error';
    // Codex's plan quota (usageLimitExceeded) only: request throttling (server_rate_limit) has no startup category
    // here, and "Usage limit reached" would misstate it.
    case 'rate_limit': return 'rate_limit';
    default: return null;
  }
}

/**
 * One entry point for the runner: `stage` says where the launch failed ("folder" | "worktree" | "rpc"); an error from
 * worktree-prepare.mjs is recognized by its worktreeStage without one. Returns the error, tagged when a host category
 * fits (the same object when it is an Error).
 * @param {unknown} error
 * @param {{stage?: 'folder'|'worktree'|'rpc', rpcError?: object, turnErrorCategory?: Function, worktrees?: object}} options
 */
export function tagRoutineLaunchError(error, { stage, rpcError, turnErrorCategory, worktrees } = {}) {
  if (readErrorCategory(error) !== undefined) return error instanceof Error ? error : new Error(String(error));
  const category = stage === 'rpc' ? classifyRpcError(rpcError ?? error, { turnErrorCategory })
    : stage === 'folder' ? classifyFolderError(error)
    : stage === 'worktree' || error?.worktreeStage !== undefined ? classifyWorktreeError(error, { worktrees })
    : null;
  return withErrorCategory(error, category);
}
