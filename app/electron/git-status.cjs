const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_OUTPUT = 16 * 1024 * 1024;
const MAX_FILES = 10000;
const TOTAL_TIMEOUT = 20000;
const COMMAND_TIMEOUT = 10000;
const DIFF_FLAGS = ['--no-ext-diff', '--no-textconv', '--no-color', '--no-relative', '--src-prefix=a/', '--dst-prefix=b/'];

function failure(message, code) {
  return Object.assign(new Error(message), { code });
}

function environment() {
  // Parent Git context must not redirect a workspace query to another index or
  // object database. No command below contacts a remote or updates the index.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_OPTIONAL_LOCKS: '0',
    GIT_NO_REPLACE_OBJECTS: '1', GIT_LITERAL_PATHSPECS: '1', LC_ALL: 'C' };
}

function context(cwd, trace, exec) {
  // log.showSignature=false (heavyWorkWorker git config `-c log.showSignature=false`): a repository-local
  // log.showSignature=true would otherwise make log/show run the gpg.program named by that repository.
  // exec: test seam only (fixture Git output, never a real process); main.cjs never passes it.
  return { cwd, deadline: Date.now() + TOTAL_TIMEOUT, output: 0, env: environment(), trace, exec: typeof exec === 'function' ? exec : null,
    config: ['-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=/dev/null', '-c', 'log.showSignature=false'] };
}

async function git(ctx, args, { allowed = [0], input, paths = false, bytes = false, maxBuffer = MAX_OUTPUT } = {}) {
  const remaining = ctx.deadline - Date.now();
  if (remaining <= 0) throw failure('Git workspace query timed out.', 'GIT_TIMEOUT');
  // Test observation only: every spawned argv and the environment keys it ran with.
  ctx.trace?.({ args: [...args], envKeys: Object.keys(ctx.env) });
  return new Promise((resolve, reject) => {
    const done = (error, stdout, stderr) => {
      ctx.output += stdout.length + stderr.length;
      if (ctx.output > MAX_OUTPUT * 2 || error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
        reject(failure('Git workspace output exceeds the supported limit.', 'GIT_OUTPUT_LIMIT')); return;
      }
      if (error?.killed || error?.signal === 'SIGTERM') {
        reject(failure('Git workspace query timed out.', 'GIT_TIMEOUT')); return;
      }
      if (error && !allowed.includes(error.code)) {
        reject(failure(`Git workspace query failed: ${stderr.toString('utf8').trim().slice(0, 500) || error.message}`, 'GIT_QUERY_FAILED')); return;
      }
      try {
        // A lossy filename could query the wrong file. Reject invalid UTF-8 in
        // path-bearing protocols; human-readable patches remain ordinary text.
        // bytes: the raw blob (B34 image viewer), never decoded.
        const output = bytes ? stdout : paths ? new TextDecoder('utf-8', { fatal: true }).decode(stdout) : stdout.toString('utf8');
        resolve({ output, code: error?.code || 0, stderr: stderr.toString('utf8') });
      } catch { reject(failure('Git returned a path that cannot be represented as UTF-8.', 'GIT_PATH_ENCODING')); }
    };
    // R4i-files FI2: a fixture runner answers the argv as execFile would (Buffers, an error with code / killed, or the
    // maxBuffer error once stdout passes maxBuffer), so the patch budget is tested without spawning Git.
    if (ctx.exec) {
      Promise.resolve().then(() => ctx.exec(args, { input, maxBuffer })).then((result) => {
        const stdout = Buffer.from(result?.stdout ?? ''), stderr = Buffer.from(result?.stderr ?? '');
        if (stdout.length > maxBuffer) { done(Object.assign(new Error('maxBuffer exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' }), stdout.subarray(0, maxBuffer), stderr); return; }
        done(result?.code ? Object.assign(new Error(`git exited with ${result.code}`), { code: result.code }) : null, stdout, stderr);
      }, (error) => done(error, Buffer.alloc(0), Buffer.alloc(0)));
      return;
    }
    const child = execFile('git', ['--no-pager', ...ctx.config, ...args], {
      cwd: ctx.cwd, env: ctx.env, encoding: 'buffer', windowsHide: true,
      timeout: Math.min(COMMAND_TIMEOUT, remaining), maxBuffer,
    }, done);
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}

function empty(cwd) {
  return { isRepo: false, cwd, repoName: null, branch: null, headSha: null, hasChanges: false, workingTreeDirty: false,
    added: 0, removed: 0, files: 0, binaryFiles: 0, untrackedCount: 0, diffBase: null, scopeBase: null, fileDetails: [], comparison: null };
}

async function repository(cwd, trace, exec) {
  if (typeof cwd !== 'string' || !cwd.trim()) throw new TypeError('A workspace directory is required.');
  const requested = path.resolve(cwd);
  let directory;
  try { directory = await fs.realpath(requested); if (!(await fs.stat(directory)).isDirectory()) return null; }
  catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; }
  const ctx = context(directory, trace, exec);
  const top = await git(ctx, ['rev-parse', '--show-toplevel'], { allowed: [0, 128], paths: true });
  if (top.code === 128) {
    if (/not a git repository|must be run in a work tree/.test(top.stderr)) return null;
    throw failure(`Cannot inspect workspace repository: ${top.stderr.trim().slice(0, 500)}`, 'GIT_QUERY_FAILED');
  }
  // Remove exactly the protocol's terminating newline, not valid path spaces.
  ctx.cwd = await fs.realpath(top.output.replace(/\n$/, ''));
  // Clean/process filters can otherwise run programs even with --no-ext-diff.
  // Disable configured filter commands before asking status/diff to read files.
  const filters = await git(ctx, ['config', '--null', '--name-only', '--get-regexp', '^filter\\..*\\.(clean|smudge|process|required)$'], { allowed: [0, 1], paths: true });
  for (const key of filters.output.split('\0').filter(Boolean)) {
    ctx.config.push('-c', `${key}=${key.endsWith('.required') ? 'false' : ''}`);
  }
  const head = await git(ctx, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], { allowed: [0, 1, 128] });
  if (head.code === 128) throw failure('Repository HEAD cannot be read.', 'GIT_QUERY_FAILED');
  ctx.head = head.code === 0 ? head.output.trim() : null;
  ctx.diffBase = ctx.head || (await git(ctx, ['hash-object', '-t', 'tree', '--stdin'], { input: '' })).output.trim();
  return ctx;
}

function parseStatus(output) {
  const parts = output.split('\0'), records = [];
  for (let at = 0; at < parts.length; at++) {
    const entry = parts[at];
    if (!entry) continue;
    if (entry.length < 4 || entry[2] !== ' ') throw failure('Malformed Git status response.', 'GIT_STATUS_PARSE');
    const indexStatus = entry[0], worktreeStatus = entry[1], pathname = entry.slice(3);
    const record = { path: pathname, indexStatus, worktreeStatus, untracked: entry.startsWith('??'), binary: false, added: 0, removed: 0 };
    if ('RC'.includes(indexStatus) || 'RC'.includes(worktreeStatus)) {
      const oldPath = parts[++at];
      if (!oldPath) throw failure('Incomplete Git rename response.', 'GIT_STATUS_PARSE');
      record.oldPath = oldPath;
    }
    records.push(record);
    if (records.length > MAX_FILES) throw failure('Workspace has too many changed files to inspect.', 'GIT_FILE_LIMIT');
  }
  return records;
}

function parseNumstat(output) {
  const parts = output.split('\0'), records = [];
  for (let at = 0; at < parts.length; at++) {
    if (!parts[at]) continue;
    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]*)$/.exec(parts[at]);
    if (!match) throw failure('Malformed Git numstat response.', 'GIT_NUMSTAT_PARSE');
    let pathname = match[3], oldPath;
    if (!pathname) { oldPath = parts[++at]; pathname = parts[++at]; }
    if (!pathname) throw failure('Incomplete Git numstat path.', 'GIT_NUMSTAT_PARSE');
    records.push({ path: pathname, ...(oldPath ? { oldPath } : {}),
      binary: match[1] === '-' || match[2] === '-', added: match[1] === '-' ? 0 : Number(match[1]), removed: match[2] === '-' ? 0 : Number(match[2]) });
  }
  return records;
}

async function safeFile(ctx, relative) {
  // Porcelain reports an untracked nested repository as a directory. Do not
  // recurse into it or silently treat its contents as this repository's files.
  if (relative.endsWith('/')) return false;
  if (!relative || path.isAbsolute(relative) || relative.includes('\0') || relative.split('/').some((part) => part === '..' || part === '')) {
    throw failure('Git returned a path outside the workspace.', 'GIT_UNSAFE_PATH');
  }
  const parts = relative.split('/');
  let current = ctx.cwd;
  for (let at = 0; at < parts.length; at++) {
    current = path.join(current, parts[at]);
    let stat;
    try { stat = await fs.lstat(current); }
    catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return false; throw error; }
    if (at < parts.length - 1) {
      if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
    } else {
      // --no-index treats a directory symlink differently from a file symlink.
      // Supply link text on stdin instead, so Git cannot recurse into a target.
      if (stat.isSymbolicLink()) return { kind: 'symlink', content: await fs.readlink(current, { encoding: 'buffer' }) };
      return stat.isFile() ? { kind: 'file' } : false;
    }
  }
  return false;
}

async function currentFiles(ctx, records) {
  const candidates = new Set(records.filter((record) => record.untracked).map((record) => record.path));
  if (!ctx.head) {
    const tracked = await git(ctx, ['ls-files', '--cached', '-z'], { paths: true });
    for (const pathname of tracked.output.split('\0').filter(Boolean)) candidates.add(pathname);
  }
  if (candidates.size > MAX_FILES) throw failure('Workspace has too many files to inspect.', 'GIT_FILE_LIMIT');
  const result = [];
  for (const pathname of candidates) {
    const file = await safeFile(ctx, pathname);
    if (file) result.push({ path: pathname, ...file });
  }
  return result;
}

function quotePath(value) {
  if (/^[!-~]+$/.test(value) && !/["\\]/.test(value)) return value;
  return '"' + [...Buffer.from(value)].map((byte) => {
    if (byte === 34 || byte === 92) return '\\' + String.fromCharCode(byte);
    if (byte < 32 || byte >= 127) return '\\' + byte.toString(8).padStart(3, '0');
    return String.fromCharCode(byte);
  }).join('') + '"';
}

async function additionDiff(ctx, file, numstat = false, maxBuffer = MAX_OUTPUT) {
  const symlink = file.kind === 'symlink';
  const response = await git(ctx, ['diff', '--no-index', ...DIFF_FLAGS, ...(numstat ? ['--numstat', '-z'] : []), '--', '/dev/null', symlink ? '-' : file.path],
    { allowed: [0, 1], paths: numstat, maxBuffer, ...(symlink ? { input: file.content } : {}) });
  if (!symlink || numstat) return response.output;
  // The hunk is produced by Git from the actual link bytes. Replace only the
  // stdin filename/mode metadata, preserving the payload and newline markers.
  return response.output.split('\n').map((line) => {
    if (line === 'diff --git a/- b/-') return `diff --git ${quotePath('a/' + file.path)} ${quotePath('b/' + file.path)}`;
    if (line === 'new file mode 100644') return 'new file mode 120000';
    if (line === '+++ b/-') return `+++ ${quotePath('b/' + file.path)}`;
    return line;
  }).join('\n');
}

// The status counts of new files (git diff --no-index --numstat /dev/null <file>) without one Git process per file: a
// checkout with thousands of untracked files (build output, a dirty workspace) otherwise runs out the query's 20 s budget
// and the app shows "Could not read repository changes". Git's rules: a NUL in the first 8000 bytes (or more than
// core.bigFileThreshold's default 512 MiB) is binary "-\t-", else the added count is the newline count plus one for an
// unterminated last line (an empty file is 0). The `diff` attribute still applies under --no-index, so one batched
// check-attr marks `-diff` (and `binary`) files binary; a file with a named diff driver is left to Git itself.
const FIRST_FEW_BYTES = 8000;
const BIG_FILE = 512 * 1024 * 1024;
function countLines(chunks) {
  let lines = 0, last = -1, seen = 0;
  for (const chunk of chunks) {
    if (seen < FIRST_FEW_BYTES && chunk.subarray(0, FIRST_FEW_BYTES - seen).includes(0)) return null;
    seen += chunk.length;
    for (let at = chunk.indexOf(10); at !== -1; at = chunk.indexOf(10, at + 1)) lines++;
    if (chunk.length) last = chunk[chunk.length - 1];
  }
  return last === -1 ? 0 : lines + (last === 10 ? 0 : 1);
}

async function fileChunks(ctx, relative) {
  const handle = await fs.open(path.join(ctx.cwd, relative), 'r');
  try {
    const { size } = await handle.stat();
    if (size > BIG_FILE) return null;
    const chunks = [];
    for (let position = 0; position < size;) {
      if (Date.now() > ctx.deadline) throw failure('Git workspace query timed out.', 'GIT_TIMEOUT');
      const buffer = Buffer.allocUnsafe(Math.min(1024 * 1024, size - position));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      chunks.push(buffer.subarray(0, bytesRead)); position += bytesRead;
    }
    return chunks;
  } finally { await handle.close(); }
}

async function diffAttributes(ctx, files) {
  if (!files.length) return new Map();
  const named = files.filter((file) => file.kind !== 'symlink');
  if (!named.length) return new Map();
  const response = await git(ctx, ['check-attr', '-z', '--stdin', 'diff'], { input: named.map((file) => file.path).join('\0') + '\0', paths: true });
  const parts = response.output.split('\0'), values = new Map();
  for (let at = 0; at + 2 < parts.length; at += 3) values.set(parts[at], parts[at + 2]);
  return values;
}

async function additionCounts(ctx, files) {
  const attributes = await diffAttributes(ctx, files);
  return mapLimited(files, async (file) => {
    // A symlink goes to Git as its link text on stdin ("-"), which no attribute names.
    const attribute = file.kind === 'symlink' ? 'unspecified' : attributes.get(file.path) ?? 'unspecified';
    if (attribute === 'unset') return [{ path: file.path, binary: true, added: 0, removed: 0 }];
    if (attribute !== 'unspecified' && attribute !== 'set') return parseNumstat(await additionDiff(ctx, file, true)).map((record) => ({ ...record, path: file.path, oldPath: undefined }));
    let chunks;
    try { chunks = file.kind === 'symlink' ? [file.content] : await fileChunks(ctx, file.path); }
    catch (error) { if (['ENOENT', 'ENOTDIR', 'ELOOP', 'EISDIR'].includes(error.code)) return []; throw error; }
    const added = chunks ? countLines(chunks) : null;
    return [{ path: file.path, binary: added === null, added: added ?? 0, removed: 0 }];
  });
}

async function mapLimited(items, callback) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (cursor < items.length) { const at = cursor++; results[at] = await callback(items[at]); }
  }));
  return results;
}

const OWN_WORKTREES = /^(?:.*\/)?\.code\/worktrees(?:\/|$)/;
async function snapshot(cwd, trace, exec) {
  const ctx = await repository(cwd, trace, exec);
  if (!ctx) return null;
  const response = await git(ctx, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none'], { paths: true });
  // OpenClaude Desktop's own worktrees inside the repository (.code/worktrees, main.cjs prepare-worktree) are never the main
  // checkout's changes, even where .git/info/exclude predates them (the official status excludes .claude likewise).
  // Filtered here: this query runs with GIT_LITERAL_PATHSPECS, so no exclude pathspec.
  return { ctx, records: parseStatus(response.output).filter((record) => !OWN_WORKTREES.test(record.path)) };
}

const REMOTE = 'refs/remotes/origin/';

async function refExists(ctx, ref) {
  return (await git(ctx, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { allowed: [0, 1] })).code === 0;
}

function validBranchName(name) {
  return typeof name === 'string' && name.length > 0 && name.length < 512 && !name.startsWith('-') && !/[\0\s~^:?*[\\]/.test(name);
}

/** Session base branch (ion-dist c0547825d session repos: `baseBranch =
 * git.defaultBranch ?? sourceBranch ?? branch`). defaultBranch is the main
 * process getGitInfo order (index.chunk-Mak6MV2t.js): `symbolic-ref --short
 * refs/remotes/origin/HEAD` without its origin/ prefix, else the first of
 * main/master with a refs/remotes/origin/<b>. sourceBranch is the branch a
 * worktree session was created from (preferredBase). Null when nothing resolves
 * (a detached HEAD without a remote or recorded base). */
async function defaultBase(ctx, branch, preferredBase) {
  const remoteHead = await git(ctx, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], { allowed: [0, 1, 128] });
  const named = remoteHead.code === 0 ? remoteHead.output.trim() : '';
  if (named.startsWith('origin/') && validBranchName(named.slice(7))) return { base: named.slice(7), baseSource: 'default' };
  for (const candidate of ['main', 'master']) {
    if (await refExists(ctx, REMOTE + candidate)) return { base: candidate, baseSource: 'default' };
  }
  if (validBranchName(preferredBase) && (await refExists(ctx, `refs/heads/${preferredBase}`) || await refExists(ctx, REMOTE + preferredBase))) {
    return { base: preferredBase, baseSource: 'session' };
  }
  if (branch) return { base: branch, baseSource: 'current' };
  return { base: null, baseSource: null };
}

/** heavyWorkWorker ua: the base ref is origin/<b>, then <b>, else HEAD (null here,
 * which leaves the plain HEAD diff). */
async function resolveBaseRef(ctx, base) {
  if (!validBranchName(base)) return null;
  if (await refExists(ctx, REMOTE + base)) return REMOTE + base;
  if (await refExists(ctx, `refs/heads/${base}`)) return `refs/heads/${base}`;
  return null;
}

/** heavyWorkWorker fa: `merge-base <ref> HEAD` (|| the ref itself) is the diff
 * base of the default "All changes" scope. An explicit valid base (the Changes
 * "Compare against" choice) replaces the inferred one; an unborn HEAD keeps the
 * empty tree and an unresolvable base keeps HEAD. */
async function scopeBase(ctx, branch, { preferredBase, base: explicit } = {}) {
  let chosen = null;
  if (validBranchName(explicit)) {
    const ref = await resolveBaseRef(ctx, explicit);
    if (ref) chosen = { base: explicit, baseSource: 'custom', baseRef: ref };
  }
  if (!chosen) {
    const inferred = await defaultBase(ctx, branch, preferredBase);
    chosen = { ...inferred, baseRef: inferred.base ? await resolveBaseRef(ctx, inferred.base) : null };
  }
  let mergeBase = null;
  if (ctx.head && chosen.baseRef) {
    const found = await git(ctx, ['merge-base', chosen.baseRef, 'HEAD'], { allowed: [0, 1] });
    mergeBase = found.code === 0 && found.output.trim() ? found.output.trim()
      : (await git(ctx, ['rev-parse', '--verify', '--quiet', `${chosen.baseRef}^{commit}`], { allowed: [0, 1] })).output.trim() || null;
  }
  return { ...chosen, mergeBase, diffBase: mergeBase || ctx.diffBase };
}

/** Local `rev-list --left-right --count <baseRef>...HEAD` against the same base
 * as the diff: behind is the left count, ahead the right. Never fetches; an
 * unborn HEAD is 0/0 and an unresolvable base leaves the counts null instead of
 * inventing a comparison. `same` marks a checkout of the base branch itself
 * (the counts still run, so unpushed work on main shows as ahead). */
async function comparison(ctx, branch, preferredBase, resolved) {
  const scope = resolved || await scopeBase(ctx, branch, { preferredBase });
  const { base, baseSource, baseRef, mergeBase } = scope;
  const result = { base, baseSource, baseRef, mergeBase, ahead: null, behind: null, same: !!branch && branch === base, unpushed: null };
  if (branch && await refExists(ctx, REMOTE + branch) && ctx.head) {
    const count = await git(ctx, ['rev-list', '--count', `${REMOTE}${branch}..HEAD`, '--']);
    result.unpushed = Number(count.output.trim());
  }
  if (!base) return result;
  if (!ctx.head) return { ...result, ahead: 0, behind: 0 };
  if (!baseRef) return result;
  const counts = await git(ctx, ['rev-list', '--left-right', '--count', `${baseRef}...HEAD`, '--']);
  const match = /^(\d+)\s+(\d+)\s*$/.exec(counts.output);
  if (!match) throw failure('Malformed Git rev-list response.', 'GIT_REVLIST_PARSE');
  return { ...result, behind: Number(match[1]), ahead: Number(match[2]) };
}

async function currentBranch(ctx) {
  const branch = await git(ctx, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowed: [0, 1] });
  return branch.code === 0 ? branch.output.trim() : null;
}

/** Base branch and ahead/behind for a workspace; null for a non-repository. */
async function workspaceGitComparison(cwd, { preferredBase, trace } = {}) {
  const ctx = await repository(cwd, trace);
  if (!ctx) return null;
  return comparison(ctx, await currentBranch(ctx), preferredBase);
}

/** Band diff stats (heavyWorkWorker ya/ha via getGitDiffStats(cwd, baseBranch)):
 * `diff --numstat -M <mergeBase>` (merge-base of the session base and HEAD,
 * worktree side) plus untracked files, so commits made on the branch keep their
 * +N −M. hasChanges = any file in that diff (Ii shows the row, tc); the Commit
 * gate is workingTreeDirty = any porcelain record (shared-16 wu
 * isWorkingTreeDirty). A repository without a remote compares against its own
 * branch, i.e. the HEAD diff. */
async function workspaceGitStatus(cwd, { preferredBase, trace } = {}) {
  const state = await snapshot(cwd, trace);
  if (!state) return empty(path.resolve(cwd));
  const { ctx, records } = state;
  const byPath = new Map(records.map((record) => [record.path, record]));
  const branch = await currentBranch(ctx);
  const scope = await scopeBase(ctx, branch, { preferredBase });
  const tracked = ctx.head ? parseNumstat((await git(ctx,
    ['diff', ...DIFF_FLAGS, '--find-renames', '--ignore-submodules=none', '--numstat', '-z', scope.diffBase, '--'], { paths: true })).output) : [];
  const additions = await additionCounts(ctx, await currentFiles(ctx, records));
  for (const record of [...tracked, ...additions.flat()]) {
    const current = byPath.get(record.path) || { path: record.path, indexStatus: ' ', worktreeStatus: 'M', untracked: false };
    byPath.set(record.path, { ...current, ...record, oldPath: record.oldPath || current.oldPath });
  }
  const files = [...byPath.values()];
  return { isRepo: true, cwd: ctx.cwd, repoName: path.basename(ctx.cwd),
    branch: branch || ctx.head?.slice(0, 7) || null, detached: !branch, headSha: ctx.head,
    hasChanges: files.length > 0, workingTreeDirty: records.length > 0, workingTreeFiles: records.length,
    added: files.reduce((sum, file) => sum + file.added, 0), removed: files.reduce((sum, file) => sum + file.removed, 0),
    files: files.length, binaryFiles: files.filter((file) => file.binary).length,
    untrackedCount: records.filter((record) => record.untracked).length, diffBase: scope.diffBase,
    baseKind: !ctx.head ? 'empty-tree' : scope.diffBase === ctx.head ? 'HEAD' : 'merge-base',
    // The base the Changes scope names ('main → working tree'); null leaves only the HEAD diff.
    scopeBase: scope.baseRef ? scope.base : null, fileDetails: files,
    comparison: await comparison(ctx, branch, preferredBase, scope) };
}

const COMMIT_SCOPE = /^commit:([0-9a-f]{7,64})$/i;

// R4i-files FI2 (diffgit-08-lazy): the patch budget of 2.42304.0 heavyWorkWorker (the same code is index.chunk-BAdej_RQ):
// `var bv=300,xv=1048576,Sv=5242880`. _y withholds every patch of a diff past 300 files (bv), past the caller's changed
// lines (c5da7eb42 asks inlinePatchesMaxChangedLines 2e4) or past the 1 MiB prefill (xv, untracked bodies first, the
// tracked patch gets the rest); vy answers {patches_withheld: !include}, and nothing when every patch was asked for.
// Fy reads one file's patch later under the 5 MiB cap (Sv).
const PATCH_BUDGET_FILES = 300;
const PATCH_PREFILL_BYTES = 1048576;
const FILE_PATCH_BYTES = 5242880;

/** CxZMGoHL patchInclusion: includePatches !== false → every patch (true); else a finite inlinePatchesMaxChangedLines
 * ≥ 0 → the budget {inlineMaxChangedLines}; else no patch at all (false). */
function patchInclusion(options) {
  if (options?.includePatches !== false) return true;
  const limit = options.inlinePatchesMaxChangedLines;
  return limit !== undefined && Number.isFinite(limit) && limit >= 0 ? { inlineMaxChangedLines: limit } : false;
}

/** _y on counts already read: tracked = the numstat records, untracked = the new files' addition counts (those not in
 * the numstat). The byte step (maxBytes = xv - untracked bytes) runs in budgetedDiff, where the bodies exist. */
function patchBudget(patches, tracked, untracked) {
  if (typeof patches === 'boolean') return { include: patches };
  if (tracked.length + untracked.length > PATCH_BUDGET_FILES) return { include: false };
  let lines = 0;
  for (const record of untracked) lines += record.added;
  for (const record of tracked) lines += record.added + record.removed;
  return { include: lines <= patches.inlineMaxChangedLines };
}

// `diff --raw -z`: ":<old mode> <new mode> <old sha> <new sha> <status>\0<path>\0[<new path>\0]" per file.
function parseRaw(output) {
  const parts = output.split('\0'), records = new Map();
  for (let at = 0; at < parts.length; at++) {
    const match = /^:(\d{6}) (\d{6}) \S+ \S+ ([A-Z])\d*$/.exec(parts[at]);
    if (!match) continue;
    const pair = match[3] === 'R' || match[3] === 'C';
    const first = parts[++at], second = pair ? parts[++at] : undefined;
    if (!first || (pair && !second)) throw failure('Incomplete Git raw diff path.', 'GIT_NUMSTAT_PARSE');
    records.set(second ?? first, { oldMode: match[1], newMode: match[2], status: match[3], ...(pair ? { oldPath: first } : {}) });
  }
  return records;
}

/** The comparison's files in the official file shape (index.chunk-muI2IV6k rkt; Wv statuses added / removed / renamed /
 * modified), tracked first, then the new files. */
function comparisonFiles(tracked, raw, untracked) {
  const files = tracked.map((record) => {
    const entry = raw.get(record.path);
    const status = entry?.status === 'A' ? 'added' : entry?.status === 'D' ? 'removed' : entry?.status === 'R' && record.oldPath ? 'renamed' : 'modified';
    return { filename: record.path, status, additions: record.added, deletions: record.removed, changes: record.added + record.removed,
      ...(status === 'renamed' ? { previous_filename: record.oldPath } : {}), mode: status === 'removed' ? entry?.oldMode : entry?.newMode,
      oldMode: entry?.oldMode, binary: record.binary === true };
  });
  for (const record of untracked) files.push({ filename: record.path, status: 'added', additions: record.added, deletions: 0, changes: record.added, mode: record.mode, binary: record.binary === true });
  return files;
}

/** A withheld file in the shown patch: its `diff --git` header (and new / deleted / rename lines) without hunks, as the
 * official header-only patch (ey), so the file list still names every file; its rows load with workspaceGitFilePatch.
 * R4i-files fix: the metadata Git itself would print stays in the block, so a withheld file reads as it does unwithheld:
 * a mode change (old / new mode from --raw, tracked files whose two modes differ) and a binary file's
 * "Binary files … differ" (numstat "-\t-"), which diff-model parses as binary rather than a header-only fallback. */
function headerOnlyPatch(file) {
  const before = file.previous_filename ?? file.filename;
  const lines = [`diff --git ${quotePath('a/' + before)} ${quotePath('b/' + file.filename)}`];
  const mode = /^\d{6}$/.test(file.mode ?? '') ? file.mode : '100644';
  if (file.status === 'added') lines.push(`new file mode ${mode}`);
  else if (file.status === 'removed') lines.push(`deleted file mode ${mode}`);
  else {
    const oldMode = /^\d{6}$/.test(file.oldMode ?? '') ? file.oldMode : undefined;
    if (oldMode && /^\d{6}$/.test(file.mode ?? '') && oldMode !== file.mode) lines.push(`old mode ${oldMode}`, `new mode ${file.mode}`);
    if (file.status === 'renamed') lines.push(`rename from ${quotePath(before)}`, `rename to ${quotePath(file.filename)}`);
  }
  if (file.binary === true) lines.push(`Binary files ${file.status === 'added' ? '/dev/null' : quotePath('a/' + before)} and ${file.status === 'removed' ? '/dev/null' : quotePath('b/' + file.filename)} differ`);
  return lines.join('\n') + '\n';
}
const publicFile = ({ mode, oldMode, binary, ...file }) => file;

/** gy + _y + vy for the working-tree scopes ('branch', 'uncommitted') under a budget. Withheld: every file as a
 * header-only block, completeContext false, patches_withheld true. Included: the patch exactly as the unbudgeted
 * query would return it (complete context when asked and within the existing limits), patches_withheld false. Either
 * way `files` carries every file's counts, which the header-only blocks do not. An output past a bound withholds
 * instead of failing the query (the 16 MiB GIT_OUTPUT_LIMIT of the unbudgeted query). */
async function budgetedDiff(ctx, records, { completeContext, scope, base, preferredBase, patches }) {
  const diffBase = scope === 'uncommitted' ? ctx.diffBase : (await scopeBase(ctx, await currentBranch(ctx), { preferredBase, base })).diffBase;
  const range = ['diff', ...DIFF_FLAGS, '--find-renames', '--ignore-submodules=none'];
  const tracked = ctx.head ? parseNumstat((await git(ctx, [...range, '--numstat', '-z', diffBase, '--'], { paths: true })).output) : [];
  const raw = ctx.head && tracked.length ? parseRaw((await git(ctx, [...range, '--raw', '-z', diffBase, '--'], { paths: true })).output) : new Map();
  const trackedPaths = new Set(tracked.map((record) => record.path));
  const untracked = (await currentFiles(ctx, records)).filter((file) => !trackedPaths.has(file.path));
  const kinds = new Map(untracked.map((file) => [file.path, file.kind === 'symlink' ? '120000' : '100644']));
  const counts = (await additionCounts(ctx, untracked)).flat().map((record) => ({ ...record, mode: kinds.get(record.path) }));
  const files = comparisonFiles(tracked, raw, counts);
  const listed = files.map(publicFile);
  const withheld = () => ({ patch: files.map(headerOnlyPatch).join(''), completeContext: false, patches_withheld: true, files: listed });
  if (!patchBudget(patches, tracked, counts).include) return withheld();
  const bounded = async (run) => {
    try { return await run(); } catch (error) { if (error.code === 'GIT_OUTPUT_LIMIT') return null; throw error; }
  };
  const additions = await bounded(() => mapLimited(untracked, (file) => additionDiff(ctx, file, false, PATCH_PREFILL_BYTES)));
  if (additions === null) return withheld();
  const used = additions.reduce((sum, text) => sum + Buffer.byteLength(text), 0);
  if (used > PATCH_PREFILL_BYTES) return withheld();
  let patch = '';
  if (tracked.length) {
    if (PATCH_PREFILL_BYTES - used <= 0) return withheld();
    const response = await bounded(() => git(ctx, [...range, diffBase, '--'], { maxBuffer: PATCH_PREFILL_BYTES - used }));
    if (response === null) return withheld();
    patch = response.output;
  }
  const inline = [patch, ...additions].join('');
  const result = (text, complete) => ({ patch: text, completeContext: complete, patches_withheld: false, files: listed });
  if (!completeContext) return result(inline, false);
  // Complete context (every unchanged line, for the expandable gaps) within the existing raw-patch limits, else the
  // inline patch that fitted the budget.
  const whole = tracked.length ? await bounded(() => git(ctx, [...range, '--unified=2147483647', diffBase, '--'])) : { output: '' };
  if (whole === null) return result(inline, false);
  const text = [whole.output, ...additions].join('');
  if (Buffer.byteLength(text) > MAX_OUTPUT || text.length > 4 * 1024 * 1024 || text.split('\n').length > 50000) return result(inline, false);
  return result(text, true);
}

/** Changes patch for one diff scope (panes-tile-current.js zm; heavyWorkWorker
 * ya/fa): 'branch' (default) = merge-base(base, HEAD) → worktree plus untracked
 * files, 'uncommitted' = HEAD → worktree plus untracked files, 'commit:<sha>' =
 * heavyWorkWorker ka: `<sha>^..<sha>` (the first-parent patch, so a merge commit
 * is not a combined diff), the empty tree for a root commit. `base` is an
 * explicit "Compare against" branch; an invalid one falls back to the inferred base. */
async function workspaceGitDiff(cwd, { completeContext = false, scope = 'branch', base, preferredBase, includePatches, inlinePatchesMaxChangedLines, exec } = {}) {
  const state = await snapshot(cwd, undefined, exec);
  if (!state) return completeContext ? { patch: '', completeContext: false } : '';
  const { ctx, records } = state;
  const options = { scope, base, preferredBase, exec };
  const commit = typeof scope === 'string' ? COMMIT_SCOPE.exec(scope)?.[1] : undefined;
  if (typeof scope === 'string' && scope.startsWith('commit:') && !commit) throw failure('Invalid commit scope.', 'GIT_SCOPE_INVALID');
  // R4i-files FI2: a caller that can load one file's patch later (fetchFilePatch) asks for the inline budget instead
  // of every patch; a commit's own patch is always whole (c5da7eb42 sends the budget only for the working-tree diff).
  const patches = patchInclusion({ includePatches, inlinePatchesMaxChangedLines });
  if (!commit && patches !== true) return budgetedDiff(ctx, records, { completeContext, scope, base, preferredBase, patches });
  let tracked;
  try {
    if (commit) {
      const known = await git(ctx, ['rev-parse', '--verify', '--quiet', `${commit}^{commit}`], { allowed: [0, 1] });
      if (known.code !== 0) throw failure('The selected commit is not in this repository.', 'GIT_SCOPE_INVALID');
      const sha = known.output.trim();
      const parent = await git(ctx, ['rev-parse', '--verify', '--quiet', `${sha}^`], { allowed: [0, 1] });
      const from = parent.code === 0 && parent.output.trim() ? parent.output.trim()
        : (await git(ctx, ['hash-object', '-t', 'tree', '--stdin'], { input: '' })).output.trim();
      tracked = (await git(ctx, ['diff', ...DIFF_FLAGS, '--find-renames', '--ignore-submodules=none',
        ...(completeContext ? ['--unified=2147483647'] : []), from, sha, '--'])).output;
    } else {
      const diffBase = scope === 'uncommitted' ? ctx.diffBase : (await scopeBase(ctx, await currentBranch(ctx), { preferredBase, base })).diffBase;
      // A single Git invocation supplies old and new lines against the pinned
      // commit. Never combine a historical patch with a later disk-file read.
      tracked = ctx.head ? (await git(ctx, ['diff', ...DIFF_FLAGS, '--find-renames', '--ignore-submodules=none',
        ...(completeContext ? ['--unified=2147483647'] : []), diffBase, '--'])).output : '';
    }
  } catch (error) {
    if (!completeContext || error.code !== 'GIT_OUTPUT_LIMIT') throw error;
    return { patch: await workspaceGitDiff(cwd, options), completeContext: false };
  }
  // A commit's own patch has no worktree side; the untracked additions belong to the worktree scopes.
  const additions = commit ? [] : await mapLimited(await currentFiles(ctx, records), (file) => additionDiff(ctx, file));
  const diff = [tracked, ...additions].join('');
  if (Buffer.byteLength(diff) > MAX_OUTPUT) {
    if (completeContext) return { patch: await workspaceGitDiff(cwd, options), completeContext: false };
    throw failure('Git workspace diff exceeds the supported limit.', 'GIT_OUTPUT_LIMIT');
  }
  if (!completeContext) return diff;
  // Match the renderer's existing raw-patch limits. A huge unchanged file must
  // not turn a small usable edit into a giant raw fallback in Changes.
  if (diff.length > 4 * 1024 * 1024 || diff.split('\n').length > 50000) {
    return { patch: await workspaceGitDiff(cwd, options), completeContext: false };
  }
  return { patch: diff, completeContext: true };
}

// R4i-files FI2 (diffgit-08-lazy): heavyWorkWorker Fy (getGitDiffFilePatch / gitDiffFilePatch): one withheld file's
// patch against the shown scope's base, read when its row is expanded. Lv rejects an absolute or ".." path (null);
// the patch is `diff … <base> -- [<previous path>] <path>` under the 5 MiB cap (over it: "", the row stays without
// hunks); output that names another file is ""; no output: a tracked file has no text change (""), an untracked one
// gets its addition patch; a failed read is null. A commit scope never withholds, so it has no per-file read here.
function unsafeRelativePath(value) {
  return typeof value !== 'string' || !value || value.includes('\0') || value.startsWith('/') || value.startsWith('\\')
    || /^[a-zA-Z]:/.test(value) || value.split(/[/\\]/).some((part) => part === '..');
}
async function workspaceGitFilePatch(cwd, { filePath, previousPath, scope = 'branch', base, preferredBase, exec } = {}) {
  const previous = previousPath === undefined || previousPath === null || previousPath === filePath ? undefined : previousPath;
  if (unsafeRelativePath(filePath) || (previous !== undefined && unsafeRelativePath(previous))) return null;
  if (scope !== 'branch' && scope !== 'uncommitted') return null;
  const ctx = await repository(cwd, undefined, exec);
  if (!ctx || OWN_WORKTREES.test(filePath)) return null;
  const limited = (error) => (error.code === 'GIT_OUTPUT_LIMIT' ? '' : null);
  if (ctx.head) {
    const diffBase = scope === 'uncommitted' ? ctx.diffBase : (await scopeBase(ctx, await currentBranch(ctx), { preferredBase, base })).diffBase;
    let output;
    try {
      output = (await git(ctx, ['diff', ...DIFF_FLAGS, '--find-renames', '--ignore-submodules=none', diffBase, '--', ...(previous ? [previous] : []), filePath],
        { maxBuffer: FILE_PATCH_BYTES })).output;
    } catch (error) { return limited(error); }
    if (output.includes('\ndiff --git ')) return '';
    if (output.trim()) return output;
    let listed;
    try { listed = await git(ctx, ['ls-files', '-z', '--', filePath], { paths: true }); } catch { return null; }
    if (listed.output) return '';
  }
  let file;
  try { file = await safeFile(ctx, filePath); } catch { return null; }
  if (!file) return null;
  try { return await additionDiff(ctx, { path: filePath, ...file }, false, FILE_PATCH_BYTES); } catch (error) { return limited(error); }
}

// B34 "View image" (heavyWorkWorker j_/M_/N_, k_ MIME map, A_ 10 MiB cap, Bg path guard): one side of a changed
// image as a data URL, or null (not an image, unsafe path, missing at that revision, over the cap, a symlink).
const IMAGE_TYPES = new Map([['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['gif', 'image/gif'],
  ['webp', 'image/webp'], ['bmp', 'image/bmp'], ['avif', 'image/avif']]);
const IMAGE_LIMIT = 10 * 1024 * 1024;
function unsafeImagePath(value) {
  return typeof value !== 'string' || !value || value.includes('\0') || value.startsWith('/') || value.startsWith('\\')
    || /^[a-zA-Z]:/.test(value) || value.split(/[/\\]/).some((part) => part === '..');
}
/** The revision a side of the shown diff reads, matching workspaceGitDiff: 'branch' compares the merge base (or an
 * explicit base) with the working tree, 'uncommitted' HEAD with the working tree, 'commit:<sha>' its first parent
 * with the commit. undefined = the working tree, null = no such side (a root commit's before, an unborn HEAD). */
async function imageRevision(ctx, side, { scope = 'branch', base, preferredBase } = {}) {
  const commit = typeof scope === 'string' ? COMMIT_SCOPE.exec(scope)?.[1] : undefined;
  if (typeof scope === 'string' && scope.startsWith('commit:') && !commit) throw failure('Invalid commit scope.', 'GIT_SCOPE_INVALID');
  if (commit) {
    const known = await git(ctx, ['rev-parse', '--verify', '--quiet', `${commit}^{commit}`], { allowed: [0, 1] });
    if (known.code !== 0) return null;
    const sha = known.output.trim();
    if (side === 'after') return sha;
    const parent = await git(ctx, ['rev-parse', '--verify', '--quiet', `${sha}^`], { allowed: [0, 1] });
    return parent.code === 0 && parent.output.trim() ? parent.output.trim() : null;
  }
  if (side === 'after') return undefined;
  if (!ctx.head) return null;
  return scope === 'uncommitted' ? ctx.head : (await scopeBase(ctx, await currentBranch(ctx), { preferredBase, base })).diffBase;
}
async function workspaceGitImage(cwd, { filePath, side, scope = 'branch', base, preferredBase } = {}) {
  if (side !== 'before' && side !== 'after') throw new TypeError('An image side is required.');
  const dot = typeof filePath === 'string' ? filePath.lastIndexOf('.') : -1;
  const type = dot < 0 ? undefined : IMAGE_TYPES.get(filePath.slice(dot + 1).toLowerCase());
  if (!type || unsafeImagePath(filePath)) return null;
  const ctx = await repository(cwd);
  if (!ctx) return null;
  const rev = await imageRevision(ctx, side, { scope, base, preferredBase });
  if (rev === null) return null;
  let data;
  if (rev === undefined) {
    // M_: the working-tree file under the repository root; never through a symlink.
    const file = await safeFile(ctx, filePath).catch(() => false);
    if (!file || file.kind !== 'file') return null;
    const absolute = path.join(ctx.cwd, filePath);
    if ((await fs.stat(absolute)).size > IMAGE_LIMIT) return null;
    data = await fs.readFile(absolute);
  } else {
    // N_: `show --no-textconv --no-ext-diff <rev>:<path> --`; a path missing at that revision is null.
    if (/^-/.test(rev)) return null;
    const shown = await git(ctx, ['show', '--no-textconv', '--no-ext-diff', `${rev}:${filePath}`, '--'], { allowed: [0, 128], bytes: true })
      .catch((error) => (error.code === 'GIT_OUTPUT_LIMIT' ? null : Promise.reject(error)));
    if (!shown || shown.code !== 0) return null;
    data = shown.output;
  }
  if (!data?.length || data.length > IMAGE_LIMIT) return null;
  return `data:${type};base64,${data.toString('base64')}`;
}

/** zm Commits submenu data: `log <baseRef>..HEAD`, newest first, at most `limit`
 * (51 = the 50 rows plus one to know that older ones exist), and `total` =
 * `rev-list --count <baseRef>..HEAD` (Oa lists them all; zm counts m.length − 50
 * older commits, so the hidden count stays real without fetching every row).
 * Empty without a resolvable base or with an unborn HEAD. */
async function workspaceGitCommits(cwd, { preferredBase, base, limit = 51, trace } = {}) {
  const ctx = await repository(cwd, trace);
  if (!ctx) return { base: null, commits: [], total: 0 };
  const scope = await scopeBase(ctx, await currentBranch(ctx), { preferredBase, base });
  if (!ctx.head || !scope.baseRef) return { base: scope.baseRef ? scope.base : null, commits: [], total: 0 };
  const count = Math.max(1, Math.min(Number.isSafeInteger(limit) ? limit : 51, 500));
  // heavyWorkWorker Oa: `log --no-show-signature` (the config above also pins log.showSignature=false).
  // B15: the Commits section row (c44d00c7f Wr) also shows the author and the committer date (Unix seconds, cb61be3a2 Be).
  const log = await git(ctx, ['log', '--no-show-signature', '-z', `--max-count=${count}`, '--format=%H%x1f%h%x1f%an%x1f%ct%x1f%s', `${scope.baseRef}..HEAD`, '--']);
  const counted = await git(ctx, ['rev-list', '--count', `${scope.baseRef}..HEAD`, '--']);
  const commits = log.output.split('\0').map((entry) => entry.replace(/^\n/, '')).filter(Boolean).map((entry) => {
    const [sha, shortSha, authorName = '', date = '', ...subject] = entry.split('\x1f');
    const seconds = Number(date);
    return { sha, shortSha, subject: subject.join('\x1f'), authorName, date: Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 0 };
  }).filter((commit) => /^[0-9a-f]{7,64}$/i.test(commit.sha || ''));
  const total = Number(counted.output.trim());
  return { base: scope.base, commits, total: Number.isSafeInteger(total) && total >= commits.length ? total : commits.length };
}

/** za getLocalBranches: the local branch names for "Compare against". */
async function workspaceGitBranches(cwd, { trace } = {}) {
  const ctx = await repository(cwd, trace);
  if (!ctx) return [];
  const listed = await git(ctx, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], { paths: true });
  return listed.output.split('\n').map((line) => line.trim()).filter(validBranchName);
}

module.exports = { workspaceGitStatus, workspaceGitDiff, workspaceGitComparison, workspaceGitCommits, workspaceGitBranches, workspaceGitImage, workspaceGitFilePatch };
// R4i-files FI2: the budget pieces, for the fixture tests.
module.exports.patchInclusion = patchInclusion;
module.exports.patchBudget = patchBudget;
module.exports.headerOnlyPatch = headerOnlyPatch;
module.exports.PATCH_BUDGET = { files: PATCH_BUDGET_FILES, prefillBytes: PATCH_PREFILL_BYTES, filePatchBytes: FILE_PATCH_BYTES };

// Fidelity F08: the sidebar's Folder grouping keys on repo identity (sidebar-session.js:20892-20903 IJ:
// owner/name when the origin names an owner, the cwd for a repo without one, else no project). Only
// read-only plumbing runs (rev-parse --show-toplevel, config --get remote.origin.url); each cwd resolves
// once per process and is cached, so the renderer can ask again without spawning git.
const repoIdentityCache = new Map();
const REPO_IDENTITY_CACHE_LIMIT = 500;

function remoteRepoName(value) {
  return value.replace(/[/\\]+$/, '').split(/[/\\]/).filter(Boolean).at(-1)?.replace(/\.git$/i, '') || null;
}

/** {host, owner, name} of an origin URL: scheme URLs, scp-like `user@host:owner/name.git`, or a local path
 * (no owner). Owner is every path segment before the name (GitLab subgroups keep their full path). */
function parseRemoteUrl(url) {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return null;
  let host = null, route;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    let parsed;
    try { parsed = new URL(value); } catch { return null; }
    if (parsed.protocol === 'file:') return { host: null, owner: null, name: remoteRepoName(decodeURIComponent(parsed.pathname)) };
    host = parsed.hostname || null;
    try { route = decodeURIComponent(parsed.pathname); } catch { route = parsed.pathname; }
  } else {
    const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(value);
    if (!scp) return { host: null, owner: null, name: remoteRepoName(value) };
    host = scp[1]; route = scp[2];
  }
  const parts = route.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  const name = parts.length ? parts.at(-1).replace(/\.git$/i, '') : '';
  if (!name) return null;
  return { host, owner: parts.length > 1 ? parts.slice(0, -1).join('/') : null, name };
}

function tildePath(value, home) {
  if (!home) return value;
  const root = home.replace(/[/\\]+$/, '');
  return value === root ? '~' : value.startsWith(root + path.sep) ? '~' + value.slice(root.length) : value;
}

async function resolveRepoIdentity(cwd, { home, trace } = {}) {
  const requested = path.resolve(cwd).replace(/[/\\]+$/, '') || '/';
  const parentDir = path.dirname(requested);
  const parent = tildePath(parentDir === requested ? requested : parentDir, home);
  const none = { isRepo: false, toplevel: null, owner: null, name: null, parent };
  let directory;
  try { directory = await fs.realpath(requested); if (!(await fs.stat(directory)).isDirectory()) return none; }
  catch { return none; }
  const ctx = context(directory, trace);
  try {
    const top = await git(ctx, ['rev-parse', '--show-toplevel'], { allowed: [0, 128], paths: true });
    if (top.code !== 0) return none;
    const toplevel = top.output.replace(/\n$/, '');
    const origin = await git(ctx, ['config', '--get', 'remote.origin.url'], { allowed: [0, 1] });
    const remote = origin.code === 0 ? parseRemoteUrl(origin.output) : null;
    // host: where the origin lives (github.com unlocks the band's pull request action).
    return { isRepo: true, toplevel, owner: remote?.owner || null, name: remote?.name || path.basename(toplevel), host: remote?.host || null, parent };
  } catch { return none; }
}

/** Cached repo identity of a workspace folder; never throws (an unreadable folder is not a repo). */
function repoIdentity(cwd, options = {}) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return Promise.resolve(null);
  const key = cwd.replace(/[/\\]+$/, '') || cwd;
  // fresh: read it again (the folder became a repository, or its origin changed).
  if (options.fresh) repoIdentityCache.delete(key);
  if (!repoIdentityCache.has(key)) {
    if (repoIdentityCache.size >= REPO_IDENTITY_CACHE_LIMIT) repoIdentityCache.delete(repoIdentityCache.keys().next().value);
    repoIdentityCache.set(key, resolveRepoIdentity(key, options));
  }
  return repoIdentityCache.get(key);
}

module.exports.repoIdentity = repoIdentity;
module.exports.parseRemoteUrl = parseRemoteUrl;
module.exports.clearRepoIdentityCache = () => repoIdentityCache.clear();
