// The pull request of a local session's branch, read through the user's own GitHub CLI.
//
// Official 2.31226.0: a local session's band looks its branch's PR up with the local `gh` (cd5a31703 Gde/afe, the
// ghLookup that c219730b0 an() maps to 'gh_unavailable' / 'gh_signed_out'), and the main process keeps the answer in
// its GitHubPrManager (asar index.chunk GraphQL `state isDraft isInMergeQueue reviewDecision mergeable … statusCheckRollup`).
// Locally one read-only `gh pr view <branch> --json …` per checkout+branch answers the same facts; it is cached and
// re-read at most every LOOKUP_TTL_MS (the band's status poll asks again; `fresh` forces a read).
const { execFile } = require('node:child_process');
const path = require('node:path');

const PR_FIELDS = 'number,url,state,isDraft,title,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,additions,deletions';
const LOOKUP_TTL_MS = 30000;
const LOOKUP_TIMEOUT_MS = 15000;
const CACHE_LIMIT = 200;

// cc43287c9 oR/sR/cR (:4210-4230): a check run's conclusion, or a status context's state, as pass/fail/pending.
const FAIL = new Set(['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE']);
const PASS = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED']);
function checkOutcome(entry) {
  if (entry?.__typename === 'StatusContext' || (entry && 'state' in entry && !('status' in entry))) {
    const state = String(entry.state ?? '').toUpperCase();
    return state === 'SUCCESS' ? 'pass' : state === 'FAILURE' || state === 'ERROR' ? 'fail' : 'pending';
  }
  if (String(entry?.status ?? '').toUpperCase() !== 'COMPLETED') return 'pending';
  const conclusion = String(entry?.conclusion ?? '').toUpperCase();
  return PASS.has(conclusion) ? 'pass' : FAIL.has(conclusion) ? 'fail' : 'pending';
}

/** cc43287c9 mR: {passed, failed, pending, skipped, total} of a statusCheckRollup, or null without checks. */
function checkCounts(rollup) {
  if (!Array.isArray(rollup) || rollup.length === 0) return null;
  const counts = { passed: 0, failed: 0, pending: 0, skipped: 0, total: rollup.length };
  for (const entry of rollup) {
    const outcome = checkOutcome(entry);
    if (outcome === 'pass') {
      counts.passed += 1;
      if (String(entry?.conclusion ?? '').toUpperCase() === 'SKIPPED') counts.skipped += 1;
    } else if (outcome === 'fail') counts.failed += 1;
    else counts.pending += 1;
  }
  return counts;
}

/** The band's CI glyph status (cd5a31703 MB/NB): failed > pending > all skipped > passed; undefined without checks. */
function ciStatus(counts) {
  if (!counts || counts.total === 0) return undefined;
  if (counts.failed > 0) return 'failed';
  if (counts.pending > 0) return 'pending';
  if (counts.skipped === counts.total) return 'skipped';
  return 'passed';
}

/** shared-18 gT/_T + shared-150 OF: gh's OPEN/CLOSED/MERGED with isDraft, review decision and conflicts as the
 * session PR state (open, draft, approved, changesRequested, conflicting, merged, closed). */
function prState(json) {
  const raw = String(json?.state ?? '').toUpperCase();
  if (raw === 'MERGED') return 'merged';
  if (raw === 'CLOSED') return 'closed';
  if (raw !== 'OPEN') return null;
  if (json.isDraft === true) return 'draft';
  const review = String(json.reviewDecision ?? '').toUpperCase();
  if (review === 'CHANGES_REQUESTED') return 'changesRequested';
  if (String(json.mergeable ?? '').toUpperCase() === 'CONFLICTING' || String(json.mergeStateStatus ?? '').toUpperCase() === 'DIRTY') return 'conflicting';
  if (review === 'APPROVED') return 'approved';
  return 'open';
}

/** gh's JSON for one PR as the renderer's record; null when it does not name a usable PR. */
function parsePullRequest(json) {
  const number = Number(json?.number);
  const url = typeof json?.url === 'string' && /^https:\/\//i.test(json.url) ? json.url : null;
  const state = prState(json);
  if (!Number.isInteger(number) || number <= 0 || !url || !state) return null;
  const checks = checkCounts(json.statusCheckRollup);
  return { number, url, state, title: typeof json.title === 'string' ? json.title : null,
    baseRefName: typeof json.baseRefName === 'string' ? json.baseRefName : null,
    headRefName: typeof json.headRefName === 'string' ? json.headRefName : null,
    ci: ciStatus(checks), checks,
    ...(Number.isInteger(json.additions) && json.additions >= 0 ? { additions: json.additions } : {}),
    ...(Number.isInteger(json.deletions) && json.deletions >= 0 ? { deletions: json.deletions } : {}) };
}

/** c5da7eb42 qE/JE (:11760-11780): a gh failure's kind for the band's status warning (cd5a31703 sze). */
function failureKind(text) {
  if (/rate limit/i.test(text)) return 'rateLimit';
  if (/SAML enforcement/i.test(text)) return 'sso';
  if (/HTTP 401\b|status 401\b|credentials|not authenticated|gh auth|token (?:has |is )?expired|authentication failed|requires authentication/i.test(text)) return 'auth';
  if (/no such host|dial tcp|connection refused|no route to host|i\/o timeout|TLS handshake|connecting to|timed out|network|offline|HTTP 5\d\d|bad gateway|service unavailable/i.test(text)) return 'network';
  if (/HTTP 404\b|status 404\b|^not found\b|could not resolve to/i.test(text)) return 'notFound';
  return 'unknown';
}

/** A failed `gh pr view` as the lookup verdict: missing CLI, signed out, no PR for the branch, or an error with its
 * JE kind (rateLimit / sso / auth / network / notFound / unknown). */
function classifyFailure(error, stderr = '') {
  if (error?.code === 'ENOENT') return { status: 'missing' };
  const text = String(stderr || error?.message || '');
  if (/no (?:pull requests|open pull requests) found/i.test(text)) return { status: 'none' };
  if (error?.code === 4 || /gh auth login|not logged in|authentication required|HTTP 401|Bad credentials/i.test(text)) return { status: 'auth', kind: 'auth' };
  return { status: 'error', kind: failureKind(text), message: text.trim().split('\n')[0].slice(0, 300) || 'GitHub CLI failed.' };
}

function validBranch(branch) {
  return typeof branch === 'string' && branch.length > 0 && branch.length <= 255 && !branch.startsWith('-') && !/[\s~^:?*[\\\0]/.test(branch);
}

/**
 * @param {{run?: Function, env?: () => Promise<object>|object, now?: () => number, ttl?: number}} options
 * run(file, args, opts) resolves {stdout, stderr} or rejects an execFile error with .stderr (tests inject it).
 */
function createPullRequestLookup({ run, env = () => process.env, now = () => Date.now(), ttl = LOOKUP_TTL_MS } = {}) {
  const exec = run || ((file, args, options) => new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) { error.stderr = stderr; reject(error); } else resolve({ stdout, stderr });
    });
  }));
  const cache = new Map();
  async function read(cwd, branch) {
    try {
      const { stdout } = await exec('gh', ['pr', 'view', branch, '--json', PR_FIELDS], {
        cwd, env: { ...(await env()), GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1', GH_PAGER: 'cat' },
        timeout: LOOKUP_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, windowsHide: true, encoding: 'utf8',
      });
      let json;
      try { json = JSON.parse(stdout); } catch { return { status: 'error', message: 'GitHub CLI returned malformed JSON.' }; }
      const pr = parsePullRequest(json);
      return pr ? { status: 'found', pr } : { status: 'none' };
    } catch (error) {
      if (error?.killed || error?.signal === 'SIGTERM') return { status: 'error', kind: 'network', message: 'GitHub CLI timed out.' };
      return classifyFailure(error, error?.stderr);
    }
  }
  /** {status: 'found'|'none'|'missing'|'auth'|'error', pr?, cwd, branch, checkedAt}; never throws. */
  function lookup(cwd, branch, { fresh = false } = {}) {
    if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return Promise.resolve({ status: 'error', message: 'A workspace directory is required.' });
    if (!validBranch(branch)) return Promise.resolve({ status: 'none', cwd, branch: branch ?? null, checkedAt: now() });
    const key = `${cwd}\u0000${branch}`;
    const hit = cache.get(key);
    if (hit && (hit.pending || (!fresh && now() - hit.at < ttl))) return hit.promise;
    const entry = { at: now(), pending: true };
    entry.promise = read(cwd, branch).then((result) => ({ ...result, cwd, branch, checkedAt: now() }))
      .finally(() => { entry.pending = false; entry.at = now(); });
    cache.delete(key);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, entry);
    return entry.promise;
  }
  return { lookup, clear: () => cache.clear() };
}

module.exports = { createPullRequestLookup, parsePullRequest, classifyFailure, failureKind, checkCounts, ciStatus, prState, PR_FIELDS, LOOKUP_TTL_MS };
