// Import GitHub issue (official 2.31226.0): the new-session draft's Add menu row (ca80fca8d zN :12540-12590) opens an
// issue picker for the folder's GitHub repository, and the picked issue goes with the first message (cc43287c9 gH
// :8600-8700, oH/dH :8480-8560). The desktop host reads issues through the user's own GitHub CLI (asar index.chunk
// GitHubPrManager listGhIssues / getGhIssue: `/search/issues?per_page=50&q=repo:<owner>/<name> is:issue is:open
// <query or involves:@me>` and `/repos/<owner>/<name>/issues/<n>`); here `gh api` makes the same two REST calls,
// read-only, with the login shell's PATH and token (the pull request lookup's env, main.cjs).
const { execFile } = require('node:child_process');

const TIMEOUT_MS = 15000;
const NAME = /^[A-Za-z0-9_.-]{1,100}$/; // Kg: an owner or repository name
const ISSUE_LIMIT = 50;

function runner(run) {
  return run || ((file, args, options) => new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) { error.stderr = stderr; reject(error); } else resolve({ stdout, stderr });
    });
  }));
}

/** The folder's GitHub repository from its identity (git-status.cjs repoIdentity), or null. */
function githubSlug(identity) {
  if (!identity?.owner || !identity?.name || !/^(?:www\.)?github\.com$/i.test(String(identity.host ?? ''))) return null;
  const owner = String(identity.owner), name = String(identity.name);
  return NAME.test(owner) && NAME.test(name) ? { owner, name, hostname: 'github.com' } : null;
}

const labelsOf = (labels) => (Array.isArray(labels) ? labels.map((label) => (typeof label === 'string' ? label : label?.name)).filter((name) => typeof name === 'string' && name) : []);

/** One /search/issues item as the picker's row (listGhIssues). */
function issueRow(item, slug) {
  const number = Number(item?.number);
  const url = typeof item?.html_url === 'string' && /^https:\/\//i.test(item.html_url) ? item.html_url : null;
  if (!Number.isInteger(number) || number <= 0 || !url || typeof item?.title !== 'string') return null;
  return { number, title: item.title, state: String(item.state ?? 'open').toLowerCase(), repo: `${slug.owner}/${slug.name}`, hostname: slug.hostname, url, labels: labelsOf(item.labels) };
}

/** /repos/…/issues/<n> as getGhIssue's record (body, author, authorAssociation). */
function issueDetail(data, repo) {
  const row = issueRow(data, { owner: repo.split('/')[0], name: repo.split('/')[1], hostname: 'github.com' });
  if (!row) return null;
  return { ...row, repo, body: typeof data.body === 'string' ? data.body : '', author: typeof data.user?.login === 'string' ? data.user.login : '',
    authorAssociation: typeof data.author_association === 'string' ? data.author_association : '' };
}

/** A failed gh call: 'missing' (no CLI), 'auth' (signed out) or 'error'. */
function failure(error) {
  if (error?.code === 'ENOENT') return 'missing';
  const text = String(error?.stderr || error?.message || '');
  if (error?.code === 4 || /gh auth login|not logged in|authentication required|HTTP 401|Bad credentials/i.test(text)) return 'auth';
  return 'error';
}

/**
 * @param {{run?: Function, env?: () => Promise<object>|object, identity: (cwd: string) => Promise<object|null>}} options
 */
function createGithubIssues({ run, env = () => process.env, identity }) {
  const exec = runner(run);
  async function gh(args, cwd) {
    const { stdout } = await exec('gh', args, {
      cwd, env: { ...(await env()), GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1', GH_PAGER: 'cat' },
      timeout: TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024, windowsHide: true, encoding: 'utf8',
    });
    return JSON.parse(stdout);
  }
  /**
   * {available, unavailableReason: 'no-github-remote' | 'no-auth' | null, repo}: gH v for a local folder — no GitHub
   * repository is 'no-github-remote', a GitHub CLI that is missing or signed out is 'no-auth'.
   */
  async function status(cwd) {
    const slug = githubSlug(await identity(cwd).catch(() => null));
    if (!slug) return { available: false, unavailableReason: 'no-github-remote', repo: null };
    try {
      await exec('gh', ['auth', 'status', '--hostname', slug.hostname], { cwd, env: { ...(await env()), GH_PROMPT_DISABLED: '1', NO_COLOR: '1' }, timeout: TIMEOUT_MS, windowsHide: true, encoding: 'utf8' });
      return { available: true, unavailableReason: null, repo: `${slug.owner}/${slug.name}` };
    } catch (error) {
      return { available: false, unavailableReason: 'no-auth', repo: `${slug.owner}/${slug.name}`, ...(failure(error) === 'error' ? { error: true } : {}) };
    }
  }
  /** listGhIssues: the repository's open issues matching the query (or involving the user), at most 50. */
  async function list(cwd, query = '') {
    const slug = githubSlug(await identity(cwd).catch(() => null));
    if (!slug) return { issues: [] };
    const text = String(query ?? '').replace(/\s+/g, ' ').trim().slice(0, 256) || 'involves:@me';
    const q = `repo:${slug.owner}/${slug.name} is:issue is:open ${text}`;
    try {
      const data = await gh(['api', '--method', 'GET', `/search/issues?per_page=${ISSUE_LIMIT}&q=${encodeURIComponent(q)}`], cwd);
      return { issues: (Array.isArray(data?.items) ? data.items : []).map((item) => issueRow(item, slug)).filter(Boolean) };
    } catch (error) {
      return { issues: [], error: failure(error) };
    }
  }
  /** getGhIssue: one issue of the folder's repository with its body, or null. */
  async function get(cwd, number) {
    const slug = githubSlug(await identity(cwd).catch(() => null));
    const n = Number(number);
    if (!slug || !Number.isInteger(n) || n <= 0) return null;
    try { return issueDetail(await gh(['api', '--method', 'GET', `/repos/${slug.owner}/${slug.name}/issues/${n}`], cwd), `${slug.owner}/${slug.name}`); }
    catch { return null; }
  }
  return { status, list, get };
}

module.exports = { createGithubIssues, githubSlug, issueRow, issueDetail, failure };
