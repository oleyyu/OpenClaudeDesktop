import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createPullRequestLookup, parsePullRequest, classifyFailure, failureKind, checkCounts, ciStatus, PR_FIELDS } = require('../electron/git-pull-request.cjs');

// B08 D3: the local session's branch PR through `gh pr view <branch> --json …` (cd5a31703 Gde/afe ghLookup,
// c219730b0 an() 'missing'/'auth'); states follow shared-18 gT/_T, checks cc43287c9 oR/sR/cR.
const json = (extra = {}) => ({ number: 12, url: 'https://github.com/acme/widget/pull/12', state: 'OPEN', isDraft: false, title: 'Add widget',
  baseRefName: 'main', headRefName: 'feature/x', mergeable: 'MERGEABLE', reviewDecision: '', statusCheckRollup: [], ...extra });

test('parsePullRequest: gh state, draft, review decision and conflicts become the session PR state', () => {
  assert.deepEqual(parsePullRequest(json()), { number: 12, url: 'https://github.com/acme/widget/pull/12', state: 'open', title: 'Add widget',
    baseRefName: 'main', headRefName: 'feature/x', ci: undefined, checks: null });
  assert.equal(parsePullRequest(json({ isDraft: true })).state, 'draft');
  assert.equal(parsePullRequest(json({ state: 'MERGED' })).state, 'merged');
  assert.equal(parsePullRequest(json({ state: 'CLOSED', isDraft: true })).state, 'closed');
  assert.equal(parsePullRequest(json({ reviewDecision: 'CHANGES_REQUESTED', mergeable: 'CONFLICTING' })).state, 'changesRequested', '_T: changes requested first');
  assert.equal(parsePullRequest(json({ reviewDecision: 'APPROVED', mergeable: 'CONFLICTING' })).state, 'conflicting');
  assert.equal(parsePullRequest(json({ mergeStateStatus: 'DIRTY' })).state, 'conflicting', 'OF: DIRTY merge state is a conflict');
  assert.equal(parsePullRequest(json({ reviewDecision: 'APPROVED' })).state, 'approved');
  assert.equal(parsePullRequest(json({ url: 'javascript:alert(1)' })), null);
  assert.equal(parsePullRequest(json({ number: 0 })), null);
  assert.ok(PR_FIELDS.split(',').every((field) => field && !/\s/.test(field)));
});

test('checks: check runs and status contexts count as pass/fail/pending; the band CI glyph status', () => {
  const rollup = [
    { __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SKIPPED' },
    { __typename: 'CheckRun', status: 'IN_PROGRESS', conclusion: '' },
    { __typename: 'StatusContext', state: 'FAILURE' },
  ];
  assert.deepEqual(checkCounts(rollup), { passed: 2, failed: 1, pending: 1, skipped: 1, total: 4 });
  assert.equal(ciStatus(checkCounts(rollup)), 'failed');
  assert.equal(ciStatus(checkCounts(rollup.slice(0, 3))), 'pending');
  assert.equal(ciStatus(checkCounts(rollup.slice(0, 2))), 'passed');
  assert.equal(ciStatus(checkCounts([rollup[1]])), 'skipped');
  assert.equal(ciStatus(checkCounts([{ __typename: 'StatusContext', state: 'ERROR' }])), 'failed');
  assert.equal(ciStatus(checkCounts([{ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'TIMED_OUT' }])), 'failed');
  assert.equal(ciStatus(checkCounts([])), undefined);
  assert.equal(parsePullRequest(json({ statusCheckRollup: rollup })).ci, 'failed');
});

test('classifyFailure: missing CLI, signed out, no PR for the branch, other errors', () => {
  assert.deepEqual(classifyFailure(Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' })), { status: 'missing' });
  assert.deepEqual(classifyFailure({ code: 1 }, 'no pull requests found for branch "feature/x"'), { status: 'none' });
  assert.deepEqual(classifyFailure({ code: 4 }, 'To get started with GitHub CLI, please run:  gh auth login'), { status: 'auth', kind: 'auth' });
  assert.deepEqual(classifyFailure({ code: 1 }, 'HTTP 401: Bad credentials (https://api.github.com/graphql)'), { status: 'auth', kind: 'auth' });
  assert.deepEqual(classifyFailure({ code: 1 }, 'error connecting to api.github.com\ncheck your internet connection'), { status: 'error', kind: 'network', message: 'error connecting to api.github.com' });
  // B08 review: c5da7eb42 JE kinds feed the band's warning glyph (cd5a31703 sze).
  assert.equal(failureKind('API rate limit exceeded for user'), 'rateLimit');
  assert.equal(failureKind('Resource protected by organization SAML enforcement.'), 'sso');
  assert.equal(failureKind('dial tcp: lookup api.github.com: no such host'), 'network');
  assert.equal(failureKind('GraphQL: Could not resolve to a Repository'), 'notFound');
  assert.equal(failureKind('something odd'), 'unknown');
  assert.equal(classifyFailure({ code: 1 }, 'something odd').kind, 'unknown');
});

test('lookup: one read-only gh call per checkout+branch, cached for the TTL, fresh bypasses, concurrent callers share it', async () => {
  let clock = 1000, calls = [];
  const run = async (file, args, options) => {
    calls.push({ file, args, cwd: options.cwd, prompt: options.env.GH_PROMPT_DISABLED });
    if (args[2] === 'gone') { const error = Object.assign(new Error('exit 1'), { code: 1, stderr: 'no pull requests found for branch "gone"' }); throw error; }
    return { stdout: JSON.stringify(json()), stderr: '' };
  };
  const lookup = createPullRequestLookup({ run, env: () => ({ PATH: '/usr/bin' }), now: () => clock, ttl: 30000 });
  const [a, b] = await Promise.all([lookup.lookup('/work/repo', 'feature/x'), lookup.lookup('/work/repo', 'feature/x')]);
  assert.equal(calls.length, 1, 'concurrent lookups share one gh call');
  assert.deepEqual(calls[0], { file: 'gh', args: ['pr', 'view', 'feature/x', '--json', PR_FIELDS], cwd: '/work/repo', prompt: '1' });
  assert.equal(a, b);
  assert.equal(a.status, 'found'); assert.equal(a.pr.number, 12); assert.equal(a.branch, 'feature/x'); assert.equal(a.cwd, '/work/repo');
  clock += 10000; await lookup.lookup('/work/repo', 'feature/x'); assert.equal(calls.length, 1, 'cached within the TTL');
  await lookup.lookup('/work/repo', 'feature/x', { fresh: true }); assert.equal(calls.length, 2, 'fresh reads again (a turn ended)');
  clock += 31000; await lookup.lookup('/work/repo', 'feature/x'); assert.equal(calls.length, 3, 'expired');
  assert.equal((await lookup.lookup('/work/repo', 'gone')).status, 'none');
  assert.equal((await lookup.lookup('/work/repo', '--web')).status, 'none', 'an option-like branch never reaches gh');
  assert.equal((await lookup.lookup('relative/path', 'feature/x')).status, 'error');
  assert.equal(calls.length, 4);
  const missing = createPullRequestLookup({ run: async () => { throw Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' }); } });
  assert.equal((await missing.lookup('/work/repo', 'feature/x')).status, 'missing');
  const garbled = createPullRequestLookup({ run: async () => ({ stdout: 'not json' }) });
  assert.equal((await garbled.lookup('/work/repo', 'feature/x')).status, 'error');
});
