import test from 'node:test';
import assert from 'node:assert/strict';
import { behindIndicator, commitAction, COMMIT_TURN_TEXT, COMMIT_CLEAN_REASON, COMMIT_RESPONDING_REASON } from '../src/git-rail-model.mjs';

// W14-code r4 closeout R4DC-N7: the test-only buildGitRailModel / railReservation exports are gone (the git band is the
// generated c936fcd42 row); the commit action, behind indicator, base-branch and signal helpers stay.
// F12: the row follows hasChanges (merge-base stats), Commit follows workingTreeDirty (Qe isWorkingTreeDirty).
const dirty = { isRepo: true, cwd: '/tmp/repo', repoName: 'repo', branch: 'feature', hasChanges: true, workingTreeDirty: true, added: 2, removed: 1 };
const comparison = { base: 'main', baseSource: 'default', ahead: 2, behind: 1, same: false, mergeBase: 'abc' };

test('commit action follows cc(): disabled while responding with the official reason, disabled when clean, never busy', () => {
  assert.equal(COMMIT_RESPONDING_REASON, 'DeepSeek is working \u2014 wait for the turn to finish', 'the assistant-as-actor word, rewritten per core');
  assert.equal(COMMIT_CLEAN_REASON, 'No changes to commit');
  assert.equal(COMMIT_TURN_TEXT, 'Commit the working tree changes with a sensible message.');
  assert.deepEqual(commitAction(dirty, { responding: true }), { label: 'Commit changes', text: COMMIT_TURN_TEXT, disabled: true, disabledReason: COMMIT_RESPONDING_REASON });
  assert.deepEqual(commitAction({ ...dirty, workingTreeDirty: false }), { label: 'Commit changes', text: COMMIT_TURN_TEXT, disabled: true, disabledReason: COMMIT_CLEAN_REASON });
  assert.deepEqual(commitAction({ ...dirty, workingTreeDirty: false }, { responding: true }).disabledReason, COMMIT_CLEAN_REASON, 'clean tree wins over responding (Sn checked first)');
  assert.equal(commitAction({ ...dirty, workingTreeDirty: undefined }).disabled, true, 'only a reported dirty tree enables Commit');
  assert.deepEqual(commitAction(dirty), { label: 'Commit changes', text: COMMIT_TURN_TEXT, disabled: false, disabledReason: undefined });
  assert.ok(!('busy' in commitAction(dirty, { responding: true })), 'no busy state: pi holds only PR creation and Mi has no commit busy label');
});

test('behind data stays available to the model but needs branch !== base and a positive count', () => {
  assert.equal(behindIndicator({ ...comparison, behind: 0 }, 'feature'), null);
  assert.equal(behindIndicator({ ...comparison, base: 'feature', same: true, behind: 3 }, 'feature'), null);
  assert.equal(behindIndicator({ ...comparison, base: 'feature', behind: 3 }, 'feature'), null, 'branch === base');
  assert.equal(behindIndicator(comparison, null), null, 'detached HEAD has no branch');
  assert.equal(behindIndicator(null, 'feature'), null);
  assert.equal(behindIndicator({ ...comparison, behind: 2 }, 'feature').tooltip, '2 commits behind main');
});

// W14-code r4 gen-final-4: visibleBaseBranch / railSignal (test-only since closeout deleted buildGitRailModel) are deleted.

test('pull request action: a committed branch of a GitHub repo gets Create PR and the compare page', async () => {
  const { pullRequestAction } = await import('../src/git-rail-model.mjs');
  const github = { host: 'github.com', owner: 'acme', name: 'widget' };
  const status = { isRepo: true, branch: 'feature/x', workingTreeDirty: false, comparison: { base: 'main', same: false, ahead: 2, unpushed: 0 } };
  assert.deepEqual(pullRequestAction({ status, identity: github }), { mode: 'create', label: 'Create PR', busyLabel: 'Creating PR…',
    manualUrl: 'https://github.com/acme/widget/compare/main...feature%2Fx?expand=1', hint: null });
  assert.equal(pullRequestAction({ status: { ...status, workingTreeDirty: true }, identity: github }), null, 'Commit comes first');
  assert.equal(pullRequestAction({ status, identity: { ...github, host: 'gitlab.com' } }), null);
  assert.equal(pullRequestAction({ status, identity: { host: 'github.com', owner: null, name: 'w' } }), null);
  assert.match(pullRequestAction({ status: { ...status, branch: 'main', comparison: { base: 'main', same: true } }, identity: github }).disabledReason, /base branch/);
  assert.match(pullRequestAction({ status: { ...status, comparison: { ...status.comparison, ahead: 0 } }, identity: github }).disabledReason, /No changes/);
  assert.match(pullRequestAction({ status: { ...status, comparison: { ...status.comparison, unpushed: null } }, identity: github }).manualDisabledReason, /pushed/);
  assert.ok(pullRequestAction({ status, identity: github, responding: true }).disabledReason);
});

test('B08 D3: an existing PR drops Create PR; a pending lookup disables it; gh missing/signed out is the un hint', async () => {
  const { pullRequestAction, branchPullRequest, prStatusHint, prStatusHintText } = await import('../src/git-rail-model.mjs');
  const github = { host: 'github.com', owner: 'acme', name: 'widget' };
  const status = { isRepo: true, branch: 'feature/x', workingTreeDirty: false, comparison: { base: 'main', same: false, ahead: 2, unpushed: 0 } };
  const pr = { number: 7, url: 'https://github.com/acme/widget/pull/7', state: 'open', ci: 'passed' };
  assert.equal(pullRequestAction({ status, identity: github, pr }), null, 'cd5a31703 Te is null in view mode');
  // Sn order (cd5a31703 :37385-37430): base, nothing to PR, then the pending lookup, then responding.
  assert.equal(pullRequestAction({ status, identity: github, lookup: { status: 'pending' }, responding: true }).disabledReason, 'Checking for an existing pull request');
  assert.match(pullRequestAction({ status: { ...status, comparison: { ...status.comparison, ahead: 0 } }, identity: github, lookup: { status: 'pending' } }).disabledReason, /No changes/);
  assert.equal(pullRequestAction({ status, identity: github, lookup: { status: 'error' } }).disabledReason, undefined, 'no verdict: Create PR stays available');
  assert.equal(pullRequestAction({ status, identity: github, lookup: { status: 'missing' } }).hint, 'gh_unavailable');
  assert.equal(pullRequestAction({ status, identity: github, lookup: { status: 'auth' } }).hint, 'gh_signed_out');
  assert.equal(pullRequestAction({ status: { ...status, comparison: { ...status.comparison, ahead: 0 } }, identity: github, lookup: { status: 'missing' } }).hint, null, 'only while Create PR is on offer (an rr)');
  assert.equal(prStatusHint({ lookup: { status: 'none' }, createOffered: true }), null);
  assert.deepEqual(prStatusHintText('gh_signed_out'), { trigger: 'GitHub CLI signed out', body: 'Sign in to the GitHub CLI to see existing pull requests, CI status, and auto-fix for this branch.' });
  // The lookup's PR wins; 'none' means no PR even when the core once bound one; otherwise the session binding is the fallback.
  assert.equal(branchPullRequest({ lookup: { status: 'found', pr, branch: 'feature/x' }, branch: 'feature/x' }), pr);
  assert.equal(branchPullRequest({ lookup: { status: 'none', branch: 'feature/x' }, branch: 'feature/x', sessionPr: { url: pr.url } }), null);
  assert.deepEqual(branchPullRequest({ lookup: { status: 'pending' }, sessionPr: { url: 'https://github.com/acme/widget/pull/9' } }),
    { number: 9, url: 'https://github.com/acme/widget/pull/9', state: 'open', title: null, ci: undefined, checks: null, fromSession: true });
  assert.equal(branchPullRequest({ lookup: { status: 'found', pr, branch: 'other' }, branch: 'feature/x' }), null, 'another branch\'s answer is ignored');
  // bze: merged / queued / view; no PR keeps the create mode.
  // W14-code r7: the band's mode for a PR is the generated c96d752d0 hMe (pr-rows.mjs prBarMode); bandPrMode is gone.
});

test('B08 split button: remembered mode (epitaxy-pr-create-mode), labels, compose without a repo reads create', async () => {
  const { readPrCreateMode, writePrCreateMode, effectivePrCreateMode, prModeLabel, prBusyLabel, pullRequestAction, PR_CREATE_MODE_KEY } = await import('../src/git-rail-model.mjs');
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(PR_CREATE_MODE_KEY, 'epitaxy-pr-create-mode');
  assert.equal(readPrCreateMode(storage), 'create');
  writePrCreateMode(storage, 'draft'); assert.equal(readPrCreateMode(storage), 'draft');
  writePrCreateMode(storage, 'bogus'); assert.equal(readPrCreateMode(storage), 'draft', 'unknown modes are not stored');
  assert.equal(readPrCreateMode({ getItem: () => { throw new Error('blocked'); } }), 'create');
  assert.equal(effectivePrCreateMode('compose', false), 'create');
  assert.equal(effectivePrCreateMode('compose', true), 'compose');
  assert.deepEqual(['create', 'draft', 'compose', 'commit', 'view', 'merged', 'queued'].map(prModeLabel),
    ['Create PR', 'Create draft PR', 'Manually create PR', 'Commit changes', 'View PR', 'Merged', 'Queued']);
  assert.equal(prBusyLabel('draft'), 'Creating PR…'); assert.equal(prBusyLabel('view'), undefined);
  const github = { host: 'github.com', owner: 'acme', name: 'widget' };
  const unpushed = { isRepo: true, branch: 'feature/x', workingTreeDirty: false, comparison: { base: 'main', same: false, ahead: 2, unpushed: null } };
  const compose = pullRequestAction({ status: unpushed, identity: github, mode: 'compose' });
  assert.equal(compose.label, 'Manually create PR');
  assert.equal(compose.disabledReason, undefined, 'the split button stays usable; firing compose reports the unpushed branch');
  assert.equal(compose.manualDisabledReason, 'Branch hasn’t been pushed to GitHub');
});

test('B08 band glyphs, CI and chip URLs follow bLe / NB / c0a531389', async () => {
  // W14-code r7 css7-git-band-prbarrow: the band's glyphs, accents and CI labels are the generated EL's (kke / Ake / wL); the
  // host copies (PR_STATE_GLYPHS, PR_ROW_ACCENT, prStateLabel, ciStatusLabel) are gone with SourceGitStatus.
  const Model = await import('../src/git-rail-model.mjs');
  for (const name of ['PR_STATE_GLYPHS', 'PR_ROW_ACCENT', 'prStateLabel', 'ciStatusLabel', 'bandPrMode']) assert.equal(name in Model, false, name);
  const { githubBranchUrl, githubRepoUrl } = Model;
  const github = { host: 'github.com', owner: 'acme', name: 'widget' };
  assert.equal(githubRepoUrl(github), 'https://github.com/acme/widget');
  assert.equal(githubRepoUrl({ ...github, host: 'gitlab.com' }), null);
  assert.equal(githubBranchUrl(github, { branch: 'feature/a b', comparison: { unpushed: 0 } }), 'https://github.com/acme/widget/tree/feature/a%20b');
  assert.equal(githubBranchUrl(github, { branch: 'feature', comparison: { unpushed: null } }), null, 'a branch not on origin has no GitHub page');
  assert.equal(githubBranchUrl(github, { branch: 'feature', detached: true, comparison: { unpushed: 0 } }), null);
});

test('W14-code r8 R8DC-03: main.jsx takes the commit turn text and the commit disabled reasons from the model (one copy)', async () => {
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  // c219730b0 cc/lc: the band verb's disabled / reason come from commitAction; Chat's read-only reason is appended outside.
  assert.doesNotMatch(main, /const COMMIT_TURN_TEXT\s*=|const COMMIT_CLEAN_REASON\s*=|const commitDirty\s*=/);
  assert.match(main, /import \{[^}]*\bCOMMIT_TURN_TEXT, commitAction\b[^}]*\} from "\.\/git-rail-model\.mjs";/);
  assert.match(main, /const commit = commitAction\(gitStatus, \{ responding: running \}\);/);
  assert.match(main, /const commitDisabled = commit\.disabled \|\| mode === "chat";/);
  assert.match(main, /const commitDisabledReason = commit\.disabledReason \?\? \(mode === "chat" \? t\("Chat mode is read-only\. Switch to Code to commit\."\) : undefined\);/);
});
