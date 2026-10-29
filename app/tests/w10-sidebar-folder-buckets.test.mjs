// w10-shell-sidebar-folder (notdone 86): the session list layout's Group by › Folder follows 3.6556.2 shared-22 OE's
// `r && !t` branch (F = bE) instead of the 2.42304.0 nT rules: rows without a repo go to the place bucket "This computer"
// (no Other), folder buckets sort by label and then lay over the stored order with shared-46 Xj / Yj, and no empty folder
// buckets are drawn. Source-only: the original chunk is read as text (never run), and the host's pure list model is called.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const now = Date.UTC(2026, 9, 27, 12);
const s = (id, cwd, ago = 0) => ({ id, cwd, name: id, updatedAt: now - ago, createdAt: now - ago });
const shape = (groups) => groups.map((g) => [g.key, g.label, g.sessions.map((x) => x.id).join('')]);

test('3.6556.2 original: the session list Folder grouping is F = bE, place buckets via YE, Xj / Yj over the stored order', async () => {
  const shared22 = await fs.readFile(path.join(reference, 'shared-22-Bwn3sJTG.js'), 'utf8');
  const shared46 = await fs.readFile(path.join(reference, 'shared-46-BIbZBGFq.js'), 'utf8');
  for (const [text, needle] of [
    // DE (the session list layout) renders OE with manualSectionsApart; OE's folder mode (r && !t) picks bE.
    [shared22, 'manualSectionsApart:!0'],
    // IE's cut in OE: every bucket without a saved environment (folder / place) cuts at 20, in both groupings.
    [shared22, 'truncateAt:r&&e.environment===void 0&&d!==void 0?20:d'],
    [shared22, 'if(r&&!t){P=bE;break bb0}'],
    [shared22, 'function bE(e){let t=dE(e);return t?{kind:"folder",folder:t}:{kind:"unsaved",unsaved:mE(e)}}'],
    [shared22, 'function dE(e){let t=Kr(e);if(t)return e.repoInfo?.owner?{projectKey:t}:{ran:fE(e),projectKey:t}}'],
    // Every row gets a group from F, so the Other (LE) / scratch buckets only fill without it.
    [shared22, 'm=F?.(u)??(i&&p===void 0?{kind:"unsaved",unsaved:mE(u)}:void 0)'],
    // JE: label sort (Mc = shared-18 dU), then the ran kind, then the key; no empty project buckets from fe.
    [shared22, 'return i.sort((e,t)=>Mc(e.label,t.label)||a(e)-a(t)||(e.key<t.key?-1:1))'],
    [shared22, 'F?[]:fe'],
    // ai = shared-46 Yj, li = Xj; then YE's place buckets ("This computer": XE → Pi = shared-46 zL).
    [shared22, 'ai(p,h,F?li(K,h):K)'],
    [shared22, 'Yt(y,YE(a,s,T))'],
    [shared22, 'function XE(e,t,n){return e.kind==="local"?Pi(n)'],
    [shared46, 'Yj as fr'], [shared46, 'Xj as hr'], [shared46, 'zL as w'],
    [shared46, 'function Yj(e,t,n){let r=[...e,...t];if(n.length===0)return r;'],
    [shared46, 'n=Kj(t)?-1/0:1/0;return[e,i.get(t)??n]'],
    [shared46, 'e.legacyOrderKey&&!n.has(t)&&n.has(e.legacyOrderKey)&&r.set(e.legacyOrderKey,'],
    [shared46, 'function VL(e){return e.formatMessage({defaultMessage:"This computer",id:"Red8UM0oCv"})}'],
  ]) assert.ok(text.includes(needle), needle);
  // The host model names the branch it follows.
  const model = await fs.readFile(path.join(app, 'src/sidebar-model.js'), 'utf8');
  assert.match(model, /if \(prefs\.groupBy === "environment" \|\| \(currentLayout && prefs\.groupBy === "project"\)\) \{/);
  assert.doesNotMatch(model, /orders folder buckets as 2\.42304\.0 shared-22 nT does/);
});

test('session list layout, Folder: repo buckets by label, non-repo rows in "This computer" last, no Other', async () => {
  const { buildSidebarGroups, OTHER_PROJECT_KEY } = await import('../src/sidebar-model.js');
  const sessions = [s('z', '/w/zeta', 1), s('a1', '/w/app', 2), s('a2', '/w/app-wt', 3), s('t', '/tmp/x', 4), s('n', '', 5), s('l', '/w/lib', 6),
    s('q1', '/q/work', 7), s('p1', '/p/work', 8)];
  const repoIdentities = { '/w/zeta': { isRepo: true, owner: 'o', name: 'zeta' }, '/w/app': { isRepo: true, owner: 'o', name: 'app' },
    '/w/app-wt': { isRepo: true, owner: 'o', name: 'app' }, '/tmp/x': { isRepo: false }, '/w/lib': { isRepo: true, owner: null, name: 'lib' },
    '/q/work': { isRepo: true, owner: null, name: 'work' }, '/p/work': { isRepo: true, owner: null, name: 'work' } };
  const groups = buildSidebarGroups({ sessions, preferences: { groupBy: 'project' }, repoIdentities, currentLayout: true, now });
  assert.deepEqual(shape(groups), [
    ['project:o/app', 'app', 'a1a2'],           // dE: an owned repo keys on owner/name, so its worktree joins it
    ['project:/w/lib', 'lib', 'l'],
    ['project:/p/work', 'work · /p', 'p1'],     // a shared name carries its disambiguation and sorts by it
    ['project:/q/work', 'work · /q', 'q1'],
    ['project:o/zeta', 'zeta', 'z'],
    ['project:kind::local', 'This computer', 'tn'], // bE → {unsaved: {kind: local}} (no repo, no cwd), YE after the folders
  ]);
  assert.ok(!groups.some((g) => g.key === `project:${OTHER_PROJECT_KEY}`), 'no Other bucket under F = bE');
  const place = groups.at(-1);
  assert.deepEqual([place.kind, place.projectKey, place.unsaved], ['project', OTHER_PROJECT_KEY, { kind: 'local' }]);
  assert.deepEqual([groups[0].kind, groups[0].projectKey, groups[0].cwd], ['project', 'o/app', '/w/app']);
  // Saved environments do not take part (t = groupByEnvironment is false): a row started in one stays in its folder.
  const env = [{ id: 'E1', name: 'App env', createdAt: 1, target: { kind: 'local', cwd: '/w/app' } }];
  assert.deepEqual(shape(buildSidebarGroups({ sessions, preferences: { groupBy: 'project' }, repoIdentities, currentLayout: true, now,
    savedEnvironments: env, metadata: { a1: { environmentId: 'E1' } } })), shape(groups));
  // Pinned rows stay in Pinned, ahead of the buckets.
  const pinned = buildSidebarGroups({ sessions, preferences: { groupBy: 'project' }, repoIdentities, currentLayout: true, now, metadata: { l: { pinned: true } } });
  assert.deepEqual(pinned.map((g) => g.key), ['pinned', 'project:o/app', 'project:/p/work', 'project:/q/work', 'project:o/zeta', 'project:kind::local']);
});

test('session list layout, Folder: Yj over the stored order (ranked first, the rest in label order), Xj, no empty folder buckets', async () => {
  const { buildSidebarGroups } = await import('../src/sidebar-model.js');
  const sessions = [s('b', '/w/beta', 0), s('a', '/w/alpha', 60), s('g', '/w/gamma', 120), s('d', '/w/delta', 30)];
  const labels = (projectOrder, extra = {}) => buildSidebarGroups({ sessions, preferences: { groupBy: 'project', sortBy: 'recency', ...extra },
    projectOrder, currentLayout: true, now }).map((g) => g.label);
  assert.deepEqual(labels([]), ['alpha', 'beta', 'delta', 'gamma'], 'JE: by label, whatever the sort');
  assert.deepEqual(labels([], { sortBy: 'created', ascending: true }), ['alpha', 'beta', 'delta', 'gamma']);
  assert.deepEqual(labels(['/w/missing']), ['alpha', 'beta', 'delta', 'gamma'], 'a stored key naming no bucket ranks nothing');
  // Yj: ranked buckets in the stored order, unranked (+Infinity) after them in the label order (not the latest activity).
  assert.deepEqual(labels(['/w/gamma', '/w/delta']), ['gamma', 'delta', 'alpha', 'beta']);
  // The custom groups' ccg:: keys in the same order name no folder bucket.
  assert.deepEqual(labels(['ccg::x', '/w/beta']), ['beta', 'alpha', 'delta', 'gamma']);
  // OE draws no empty folder buckets in this branch (`g = F ? [] : fe`), whatever Show empty groups says.
  const withEmpty = buildSidebarGroups({ sessions, preferences: { groupBy: 'project', showEmptyGroups: true }, knownFolders: ['/w/empty'],
    currentLayout: true, now });
  assert.ok(!withEmpty.some((g) => g.cwd === '/w/empty'));
  // The classic list keeps its own rules: Other last, unranked buckets by the latest row.
  const classic = buildSidebarGroups({ sessions: [...sessions, s('o', '', 10)], preferences: { groupBy: 'project' }, now });
  assert.deepEqual(classic.map((g) => g.label), ['beta', 'delta', 'alpha', 'gamma', 'Other']);
});

test('the sections layout\'s Sessions section grouped by Folder lays out the bE buckets', async () => {
  const Layout = await import('../src/sidebar-sections-layout.mjs');
  const Model = await import('../electron/generated/sidebar-sections-model.mjs');
  const sections = Model.setSectionView(Model.normalizeSections([]), 'sessions', { groupBy: 'folder' });
  assert.equal(Layout.sessionsGroupBy(sections), 'project');
  const sessions = [s('a', '/w/alpha', 1), s('o', '', 2), s('b', '/w/beta', 3)];
  const model = Layout.buildSidebarSections({ sections, sessions, preferences: {}, repoIdentities: {}, now });
  const buckets = model.layout.find((entry) => entry.kind === 'sessions').buckets;
  assert.deepEqual(buckets.map((b) => [b.key, b.label, b.heading, b.truncateAt]), [['project:/w/alpha', 'alpha', 'group', 20],
    ['project:/w/beta', 'beta', 'group', 20], ['project:kind::local', 'This computer', 'group', 20]]);
});
