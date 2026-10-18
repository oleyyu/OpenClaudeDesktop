import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DIFF_SCOPE, UNCOMMITTED_DIFF_SCOPE, DIFF_SCOPE_COMMIT_LIMIT, branchSearchEmptyLabel, commitScopeLabel, compareAgainstBranches,
  diffScopeParam, diffScopeSections, diffScopeTrigger, filterSearchItems, resolveDiffScope, sameDiffScope,
  carriedOverDiff, commitScopeGone, commitsSearchEmptyLabel, commitsSubmenuHint, diffScopePick, uncommittedScopeAvailable,
} from '../src/diff-scope-model.mjs';

// 2.2553.1 readable/panes-tile-current.js:2842-3117 (Fm, Im, zm, Bm) and
// panes-diff-states-current.js:351 (an unset scope resolves to {kind:"branch"}).
const commit = (index) => ({ sha: index.toString(16).padStart(40, 'a'), shortSha: index.toString(16).padStart(7, 'a'), subject: `Commit ${index}` });
const shape = (sections) => sections.map((section) => [section.key, section.items.map((item) => item.label)]);

test('trigger: branch label "main → working tree", aria-label "Diff scope: …"; uncommitted and commit labels; null without a base', () => {
  const branch = diffScopeTrigger(DEFAULT_DIFF_SCOPE, { base: 'main' });
  assert.deepEqual(branch, { label: 'main → working tree', ariaLabel: 'Diff scope: main → working tree', branch: { base: 'main', head: 'working tree' } });
  assert.deepEqual(diffScopeTrigger(UNCOMMITTED_DIFF_SCOPE, { base: 'main' }), { label: 'Uncommitted changes', ariaLabel: 'Diff scope: Uncommitted changes', branch: null });
  const listed = commit(3);
  assert.equal(diffScopeTrigger({ kind: 'commit', sha: listed.sha }, { base: 'main', commits: [listed] }).label, `${listed.shortSha} Commit 3`);
  assert.equal(commitScopeLabel('0123456789abcdef', []), '0123456', 'Bm falls back to the 7-character sha');
  assert.equal(diffScopeTrigger(DEFAULT_DIFF_SCOPE, { base: null }), null);
});

test('resolve: unset → branch; unavailable uncommitted → branch; no base → uncommitted; params', () => {
  assert.deepEqual(resolveDiffScope(undefined, { base: 'main' }), DEFAULT_DIFF_SCOPE);
  assert.deepEqual(resolveDiffScope(UNCOMMITTED_DIFF_SCOPE, { base: 'main', uncommittedAvailable: false }), DEFAULT_DIFF_SCOPE);
  assert.deepEqual(resolveDiffScope(UNCOMMITTED_DIFF_SCOPE, { base: 'main' }), UNCOMMITTED_DIFF_SCOPE);
  assert.deepEqual(resolveDiffScope(DEFAULT_DIFF_SCOPE, { base: null }), UNCOMMITTED_DIFF_SCOPE, 'no resolvable base keeps the HEAD diff');
  assert.deepEqual(resolveDiffScope({ kind: 'commit', sha: '--bad' }, { base: 'main' }), DEFAULT_DIFF_SCOPE);
  const sha = 'abcdef1234567';
  assert.equal(diffScopeParam(resolveDiffScope({ kind: 'commit', sha }, { base: 'main' })), `commit:${sha}`);
  assert.equal(diffScopeParam(DEFAULT_DIFF_SCOPE), 'branch');
  assert.equal(diffScopeParam(UNCOMMITTED_DIFF_SCOPE), 'uncommitted');
  assert.equal(sameDiffScope({ kind: 'commit', sha }, { kind: 'commit', sha }), true);
  assert.equal(sameDiffScope({ kind: 'commit', sha }, { kind: 'commit', sha: 'abcdef1234568' }), false);
  assert.equal(sameDiffScope(DEFAULT_DIFF_SCOPE, UNCOMMITTED_DIFF_SCOPE), false);
});

test('sections: diff-scope (All changes vs main, Uncommitted changes), diff-base, diff-commits with 51 → 50 rows + "1 older commit not shown"', () => {
  const commits = Array.from({ length: 51 }, (_, index) => commit(index + 1));
  const sections = diffScopeSections({ scope: DEFAULT_DIFF_SCOPE, base: 'main', defaultBase: 'main', commits });
  assert.deepEqual(shape(sections), [['diff-scope', ['All changes', 'Uncommitted changes']], ['diff-base', ['Compare against']], ['diff-commits', ['Commits']]]);
  const [scope, base, list] = sections;
  assert.deepEqual(scope.items.map(({ value, hint, checked, checkedRole }) => ({ value, hint, checked, checkedRole })), [
    { value: 'branch', hint: 'vs main', checked: true, checkedRole: 'radio' },
    { value: 'uncommitted', hint: undefined, checked: false, checkedRole: 'radio' },
  ]);
  const compare = base.items[0];
  assert.equal(compare.hint, 'main'); assert.equal(compare.searchLabel, 'Search branches'); assert.equal(compare.searchEmptyLabel, 'Loading branches…');
  const rows = list.items[0].items;
  assert.equal(DIFF_SCOPE_COMMIT_LIMIT, 50);
  assert.equal(rows.length, 51);
  assert.deepEqual(rows.slice(0, 2).map(({ label, hint, checked, checkedRole }) => ({ label, hint, checked, checkedRole })), [
    { label: 'Commit 1', hint: commits[0].shortSha, checked: undefined, checkedRole: 'radio' },
    { label: 'Commit 2', hint: commits[1].shortSha, checked: undefined, checkedRole: 'radio' },
  ]);
  assert.deepEqual({ label: rows[50].label, disabled: rows[50].disabled }, { label: '1 older commit not shown', disabled: true });
  assert.equal(diffScopeSections({ base: 'main', commits: Array.from({ length: 53 }, (_, index) => commit(index + 1)) })[2].items[0].items.at(-1).label, '3 older commits not shown');
  // workspace-git-commits fetches 51 rows plus `total` (rev-list --count): zm's m.length − 50 over all 120 commits.
  const capped = diffScopeSections({ base: 'main', commits, commitTotal: 120 })[2].items[0].items;
  assert.equal(capped.length, 51); assert.deepEqual({ label: capped[50].label, disabled: capped[50].disabled }, { label: '70 older commits not shown', disabled: true });
  assert.equal(diffScopeSections({ base: 'main', commits: commits.slice(0, 50), commitTotal: 50 })[2].items[0].items.length, 50, 'exactly 50: no older row');
  assert.equal(diffScopeSections({ base: 'main', commits, commitTotal: 3 })[2].items[0].items.at(-1).label, '1 older commit not shown', 'a stale smaller total never hides listed rows');
  // A listed commit scope checks only its own row; no commits → no section; no uncommitted when unavailable.
  const picked = diffScopeSections({ scope: { kind: 'commit', sha: commits[1].sha }, base: 'main', commits: commits.slice(0, 3) });
  assert.deepEqual(picked[2].items[0].items.map((row) => row.checked), [false, true, false]);
  assert.equal(picked[0].items[0].checked, false);
  assert.deepEqual(shape(diffScopeSections({ base: 'main', uncommittedAvailable: false })), [['diff-scope', ['All changes']], ['diff-base', ['Compare against']]]);
  assert.equal(diffScopeSections({ base: 'main', commits: [{ ...commit(1), subject: '' }] })[2].items[0].items[0].label, '(no message)');
});

test('selection: scope rows, commit rows and Compare against route through the callbacks (Im onSelect rules)', () => {
  const calls = [];
  const options = { base: 'main', defaultBase: 'main', current: 'feature', commits: [commit(1)], branches: { list: ['zeta', 'main', 'alpha', 'feature'], loaded: true },
    onSelectScope: (scope) => calls.push(['scope', scope]), onSelectBase: (name) => calls.push(['base', name]), onBaseMenuOpen: () => calls.push(['open']) };
  const sections = diffScopeSections(options);
  sections[0].items[1].onSelect(); sections[0].items[0].onSelect();
  sections[2].items[0].items[0].onSelect();
  const compare = sections[1].items[0];
  compare.onOpenChange(true); compare.onOpenChange(false);
  // Fm: unique, without default and current, sorted, then the default first with a "default" hint.
  assert.deepEqual(compare.items.map((row) => [row.label, row.hint, row.checked]), [['main', 'default', true], ['alpha', undefined, false], ['zeta', undefined, false]]);
  compare.items[0].onSelect(); // the current, non-overridden base: nothing
  compare.items[1].onSelect();
  assert.deepEqual(calls, [['scope', UNCOMMITTED_DIFF_SCOPE], ['scope', DEFAULT_DIFF_SCOPE], ['scope', { kind: 'commit', sha: commit(1).sha }], ['open'],
    ['base', 'alpha'], ['scope', DEFAULT_DIFF_SCOPE]]);
  calls.length = 0;
  // An override: the picked base stays listed; picking the default clears it.
  const overridden = diffScopeSections({ ...options, base: 'topic', overridden: true, branches: { list: [], loaded: true } })[1].items[0];
  assert.deepEqual(overridden.items.map((row) => [row.label, row.checked]), [['main', false], ['topic', true]]);
  overridden.items[0].onSelect();
  assert.deepEqual(calls, [['base', null], ['scope', DEFAULT_DIFF_SCOPE]]);
});

test('Compare against helpers: Fm order, Im empty labels, H search filter', () => {
  assert.deepEqual(compareAgainstBranches(['b', 'a', 'b', 'main', 'cur'], 'main', 'cur'), ['main', 'a', 'b']);
  assert.deepEqual(compareAgainstBranches(['b', 'a'], undefined, undefined), ['a', 'b']);
  assert.equal(branchSearchEmptyLabel({ error: true }), 'Couldn’t load branches');
  assert.equal(branchSearchEmptyLabel({ loaded: true, count: 3 }), 'No branches match');
  assert.equal(branchSearchEmptyLabel({ loaded: false }), 'Loading branches…');
  assert.equal(branchSearchEmptyLabel({ loaded: true, count: 0 }), 'Loading branches…');
  assert.deepEqual(filterSearchItems([{ label: 'Main' }, { label: 'feature/x' }, { label: 'release' }], 'MA').map((row) => row.label), ['Main']);
  assert.equal(filterSearchItems([{ label: 'a' }], '').length, 1);
});

// B15: 2.31226.0 cccc2cf0a C_ (readable :3166-3230) Commits submenu row.
test('Commits submenu: count hint (or the picked shortSha), "Search commits", the newest-50 empty label; the older row never matches a query', () => {
  const commits = Array.from({ length: 51 }, (_, index) => commit(index + 1));
  const row = diffScopeSections({ base: 'main', commits, commitTotal: 1234 })[2].items[0];
  assert.equal(row.hint, '1,234');
  assert.equal(row.searchLabel, 'Search commits');
  assert.equal(row.searchEmptyLabel, 'No match in the newest 50 commits');
  const few = diffScopeSections({ base: 'main', commits: commits.slice(0, 3) })[2].items[0];
  assert.equal(few.hint, '3'); assert.equal(few.searchEmptyLabel, 'No commits match');
  const picked = diffScopeSections({ scope: { kind: 'commit', sha: commits[1].sha }, base: 'main', commits })[2].items[0];
  assert.equal(picked.hint, commits[1].shortSha);
  assert.equal(commitsSubmenuHint({ kind: 'commit', sha: 'abcdef0123456789' }, [], 4), 'abcdef0', 'an unlisted commit shows its 7-character sha');
  assert.equal(commitsSearchEmptyLabel(50), 'No commits match');
  // H: rows whose label is a FormattedMessage in the source ("{n} older commits not shown") are filtered out by any query.
  assert.deepEqual(filterSearchItems(row.items, 'older').map((item) => item.value), []);
  assert.deepEqual(filterSearchItems(row.items, 'commit 5').map((item) => item.label), ['Commit 5', 'Commit 50']);
  assert.equal(filterSearchItems(row.items, '').length, 51);
});

// B15: c44d00c7f Xc + cb61be3a2 Je Mt (carriedOver).
test('carriedOverDiff: a loaded comparison of another scope stays (carried over) when it has a patch; empty → loading', () => {
  const branch = { key: '["branch",null]', param: 'branch' };
  assert.deepEqual(carriedOverDiff('diff --git a b\n', branch, '["branch",null]'), { diff: 'diff --git a b\n', carriedOver: false, scope: undefined });
  assert.deepEqual(carriedOverDiff('diff --git a b\n', branch, '["uncommitted",null]'), { diff: 'diff --git a b\n', carriedOver: true, scope: 'branch' });
  const payload = { patch: 'diff --git a b\n', completeContext: true };
  assert.equal(carriedOverDiff(payload, branch, 'other').diff, payload);
  assert.deepEqual(carriedOverDiff('', branch, 'other'), { diff: null, carriedOver: false, scope: undefined });
  assert.deepEqual(carriedOverDiff({ patch: '  ' }, branch, 'other'), { diff: null, carriedOver: false, scope: undefined });
  assert.deepEqual(carriedOverDiff(null, branch, 'other'), { diff: null, carriedOver: false, scope: undefined });
  assert.equal(carriedOverDiff('x', null, 'other').carriedOver, false, 'an unkeyed value is the current one');
});

test('commitScopeGone (cccc2cf0a te): a picked sha missing from a complete list resets; truncated or failed lists keep it', () => {
  const list = [commit(1), commit(2)];
  const picked = { kind: 'commit', sha: commit(3).sha };
  assert.equal(commitScopeGone(picked, { list, total: 2 }), true);
  assert.equal(commitScopeGone({ kind: 'commit', sha: commit(2).sha }, { list, total: 2 }), false);
  assert.equal(commitScopeGone(picked, { list, total: 140 }), false, 'the sha may be past the fetched rows');
  assert.equal(commitScopeGone(picked, { list: [], total: 0, failed: true }), false);
  assert.equal(commitScopeGone(picked, { list: [], total: 0 }), true, 'no commits ahead any more');
  assert.equal(commitScopeGone(DEFAULT_DIFF_SCOPE, { list, total: 2 }), false);
});

// FT-08 (diffgit-15): 2.42304.0 cb61be3a2 Ze `He = V && Ve !== i.Clean`.
test('uncommittedScopeAvailable: a repository unless its working tree is known clean; the menu then drops the row', () => {
  assert.equal(uncommittedScopeAvailable({ isRepo: true, workingTreeDirty: true }), true);
  assert.equal(uncommittedScopeAvailable({ isRepo: true }), true, 'not read yet: still offered');
  assert.equal(uncommittedScopeAvailable({ isRepo: true, workingTreeDirty: false }), false);
  assert.equal(uncommittedScopeAvailable({ isRepo: false, workingTreeDirty: true }), false);
  assert.equal(uncommittedScopeAvailable(null), false);
  const clean = uncommittedScopeAvailable({ isRepo: true, workingTreeDirty: false });
  assert.deepEqual(shape(diffScopeSections({ base: 'main', uncommittedAvailable: clean }))[0], ['diff-scope', ['All changes']]);
  assert.deepEqual(resolveDiffScope(UNCOMMITTED_DIFF_SCOPE, { base: 'main', uncommittedAvailable: clean }), DEFAULT_DIFF_SCOPE, 'a remembered Uncommitted shows All changes');
});

// FT-08 (diffgit-02): cccc2cf0a mb S/C and Xb V decide what a pick sets and what c03935b01 Rn remembers.
test('diffScopePick: same pick no-op; scope rows remember a changed All changes / Uncommitted; commits and bases never', () => {
  const commitScope = { kind: 'commit', sha: commit(1).sha };
  const pick = (options) => diffScopePick({ picked: DEFAULT_DIFF_SCOPE, shown: DEFAULT_DIFF_SCOPE, uncommittedAvailable: true, ...options });
  assert.deepEqual(pick({ next: DEFAULT_DIFF_SCOPE, via: 'scope' }), { set: false, changed: false, remember: null });
  assert.deepEqual(pick({ next: UNCOMMITTED_DIFF_SCOPE, via: 'scope' }), { set: true, changed: true, remember: 'uncommitted' });
  assert.deepEqual(pick({ next: UNCOMMITTED_DIFF_SCOPE, via: 'scope', uncommittedAvailable: false }), { set: true, changed: true, remember: null });
  // The remembered Uncommitted while the tree is clean: All changes is shown, so picking it changes nothing on screen.
  assert.deepEqual(pick({ picked: UNCOMMITTED_DIFF_SCOPE, shown: DEFAULT_DIFF_SCOPE, next: DEFAULT_DIFF_SCOPE, via: 'scope' }), { set: true, changed: false, remember: null });
  assert.deepEqual(pick({ picked: UNCOMMITTED_DIFF_SCOPE, shown: UNCOMMITTED_DIFF_SCOPE, next: DEFAULT_DIFF_SCOPE, via: 'scope' }), { set: true, changed: true, remember: 'branch' });
  assert.equal(pick({ next: commitScope }).remember, null, 'a commit row');
  assert.equal(pick({ next: UNCOMMITTED_DIFF_SCOPE }).remember, null, 'Compare against / unnamed callers');
  // The Commits section remembers while its Uncommitted row is offered (B).
  assert.equal(pick({ picked: commitScope, shown: commitScope, next: DEFAULT_DIFF_SCOPE, via: 'commit_list', uncommittedOffered: true }).remember, 'branch');
  assert.equal(pick({ picked: commitScope, shown: commitScope, next: DEFAULT_DIFF_SCOPE, via: 'commit_list', uncommittedOffered: false }).remember, null);
  assert.equal(pick({ picked: commitScope, shown: commitScope, next: commitScope, via: 'commit_list', uncommittedOffered: true }).set, false);
  // diffScopeSections: only the scope rows name themselves (mb C); commits and bases are plain picks (mb S).
  const calls = [];
  const sections = diffScopeSections({ base: 'main', defaultBase: 'main', commits: [commit(1)], branches: { list: ['alpha'], loaded: true },
    onSelectScope: (scope, meta) => calls.push([scope.kind, meta?.via]) });
  sections[0].items[0].onSelect(); sections[0].items[1].onSelect(); sections[2].items[0].items[0].onSelect(); sections[1].items[0].items[1].onSelect();
  assert.deepEqual(calls, [['branch', 'scope'], ['uncommitted', 'scope'], ['commit', undefined], ['branch', undefined]]);
});
