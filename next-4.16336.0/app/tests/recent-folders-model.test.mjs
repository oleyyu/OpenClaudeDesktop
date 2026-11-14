import test from 'node:test';
import assert from 'node:assert/strict';
import { RECENT_FOLDER_LIMIT, RECENT_FOLDER_REFRESH_MS, folderBasename, folderPickerBrowsesDirectly, parentDirectory, recentFolderOrigin, recentFolderRows, recentFolders, withRecentFolderFields } from '../src/recent-folders-model.mjs';

// Fidelity F03 / B03: composer folder picker (cc43287c9-BMbiZYzF.js:21638-21850 lH, :21921-21928 dH; 2.31226.0
// cc43287c9-Bchz60VT NZ / FZ) over the recent list of c749529a1-3d64pCyM.js _ / D (origin folders, most recent first,
// dismissal filter, session-backed before detected projects, at most 8).
// A session as main.cjs 'recent-folder-sessions' annotates it: its own folder is its origin and exists.
const session = (cwd, updatedAt, createdAt = updatedAt) => ({ cwd, updatedAt, createdAt, originCwd: cwd, folderExists: true });

test('recents are the session folders by last activity (updatedAt, else createdAt), seconds or ms', () => {
  const list = recentFolders({ sessions: [
    session('/work/alpha', 100), session('/work/beta', 300), session('/work/alpha', 200), { cwd: '/work/gamma', createdAt: 250, originCwd: '/work/gamma' },
    { cwd: '', updatedAt: 999 }, { updatedAt: 999 }, { cwd: '/work/unannotated', updatedAt: 999 },
  ] });
  assert.deepEqual(list.map((entry) => entry.path), ['/work/beta', '/work/gamma', '/work/alpha']);
  // Codex seconds and ms timestamps compare on one scale.
  assert.deepEqual(recentFolders({ sessions: [session('/s', 1_700_000_000), session('/ms', 1_600_000_000_000)] }).map((entry) => entry.path), ['/s', '/ms']);
});

test('the chosen folder is prepended only when it is not already listed (dH)', () => {
  const sessions = [session('/work/alpha', 100), session('/work/beta', 300)];
  assert.deepEqual(recentFolders({ sessions, current: '/work/alpha' }).map((entry) => entry.path), ['/work/beta', '/work/alpha']);
  assert.deepEqual(recentFolders({ sessions, current: '/work/new' }).map((entry) => entry.path), ['/work/new', '/work/beta', '/work/alpha']);
  assert.deepEqual(recentFolders({ sessions: [], current: '/work/new' }), [{ path: '/work/new' }]);
});

test('a dismissed folder stays hidden until a session is created there after the dismissal (x)', () => {
  const sessions = [session('/work/alpha', 2_000_000, 1_000_000), session('/work/beta', 3_000_000, 1_000_000)];
  assert.deepEqual(recentFolders({ sessions, dismissedAt: { '/work/beta': 1_500_000_000 } }).map((entry) => entry.path), ['/work/alpha']);
  // updatedAt after the dismissal is not enough; createdAt must be later.
  assert.deepEqual(recentFolders({ sessions: [session('/work/beta', 4_000_000, 1_000_000)], dismissedAt: { '/work/beta': 2_000_000_000 } }), []);
  assert.deepEqual(recentFolders({ sessions: [session('/work/beta', 4_000_000, 3_000_000)], dismissedAt: { '/work/beta': 2_000_000_000 } }).map((entry) => entry.path), ['/work/beta']);
  // The current folder is still prepended even when dismissed (it is the chip's value).
  assert.deepEqual(recentFolders({ sessions, current: '/work/beta', dismissedAt: { '/work/beta': 1_500_000_000 } }).map((entry) => entry.path), ['/work/beta', '/work/alpha']);
});

test('at most 8 recents (_ = 8) before the current folder is prepended', () => {
  const sessions = Array.from({ length: 12 }, (_, index) => session(`/work/p${index}`, 100 + index));
  const list = recentFolders({ sessions });
  assert.equal(RECENT_FOLDER_LIMIT, 8);
  assert.equal(list.length, 8);
  assert.equal(list[0].path, '/work/p11');
  assert.equal(recentFolders({ sessions, current: '/elsewhere' }).length, 9);
});

test('rows: basename label, parent description only for colliding basenames, current checked and not dismissible', () => {
  const rows = recentFolderRows([{ path: '/a/app' }, { path: '/b/app' }, { path: '/c/site' }], '/b/app');
  assert.deepEqual(rows, [
    { path: '/a/app', label: 'app', description: '/a', checked: false, dismissible: true },
    { path: '/b/app', label: 'app', description: '/b', checked: true, dismissible: false },
    { path: '/c/site', label: 'site', description: undefined, checked: false, dismissible: true },
  ]);
  // DT: the parent is null at the root, so a root folder never gets a description.
  assert.equal(parentDirectory('/app'), null);
  assert.equal(parentDirectory('C:\\work\\app'), 'C:\\work');
  assert.equal(folderBasename('/work/app/'), 'app');
  assert.equal(recentFolderRows([{ path: '/app' }, { path: '/x/app' }])[0].description, undefined);
});

test('no folder and nothing recent once loaded: the chip browses directly (NZ O = !n && t.length === 0)', () => {
  assert.equal(folderPickerBrowsesDirectly(recentFolders({ sessions: [], current: '' })), true);
  assert.equal(folderPickerBrowsesDirectly(recentFolders({ sessions: [], current: '/work' })), false);
  assert.equal(folderPickerBrowsesDirectly(recentFolders({ sessions: [session('/work', 1)] })), false);
  // frecentsLoading: while the lists are still loading the chip opens the menu instead.
  assert.equal(folderPickerBrowsesDirectly([], { loading: true }), false);
  assert.equal(RECENT_FOLDER_REFRESH_MS, 30_000);
});

test('_: a session counts for its origin folder; scratch workspaces, unannotated and gone own folders drop out', () => {
  assert.equal(recentFolderOrigin({ cwd: '/repo/.code/worktrees/repo-a1', originCwd: '/repo', folderExists: true }), '/repo');
  // A worktree that is gone still counts for its repository (only cwd === originCwd checks folderExists).
  assert.equal(recentFolderOrigin({ cwd: '/repo/.code/worktrees/repo-a1', originCwd: '/repo', folderExists: false }), '/repo');
  assert.equal(recentFolderOrigin({ cwd: '/gone', originCwd: '/gone', folderExists: false }), null);
  assert.equal(recentFolderOrigin({ cwd: '/w', originCwd: '/w', isScratchWorkspace: true }), null);
  assert.equal(recentFolderOrigin({ cwd: '/w' }), null, 'no originCwd yet: not listed');
});

test('worktree sessions list their repository once, ranked by the newest activity there (H2)', () => {
  const sessions = withRecentFolderFields([
    { id: 'a', cwd: '/repo/.code/worktrees/repo-mabc12', updatedAt: 500, createdAt: 500 },
    { id: 'b', cwd: '/repo', updatedAt: 100, createdAt: 100 },
    { id: 'c', cwd: '/other', updatedAt: 300, createdAt: 300 },
    { id: 'd', cwd: '/deleted', updatedAt: 900, createdAt: 900 },
  ], {
    a: { originCwd: '/repo', folderExists: true, isScratchWorkspace: false },
    b: { originCwd: '/repo', folderExists: true, isScratchWorkspace: false },
    c: { originCwd: '/other', folderExists: true, isScratchWorkspace: false },
    d: { originCwd: '/deleted', folderExists: false, isScratchWorkspace: false },
  });
  assert.deepEqual(recentFolders({ sessions }).map((entry) => entry.path), ['/repo', '/other']);
  // Sessions without fields keep their own shape (no originCwd → not listed).
  assert.deepEqual(withRecentFolderFields([{ id: 'x', cwd: '/x' }], {}), [{ id: 'x', cwd: '/x' }]);
});

test('D: session-backed folders first, then detected projects by lastActivity; 8 in all; dismissals hide detected ones for good', () => {
  const sessions = [session('/work/old', 100)];
  const detectedProjects = [{ path: '/code/new', lastActivity: 9_000_000_000_000 }, { path: '/code/mid', lastActivity: 5_000_000_000_000 }, { path: '/work/old', lastActivity: 9_500_000_000_000 }];
  assert.deepEqual(recentFolders({ sessions, detectedProjects }).map((entry) => entry.path), ['/work/old', '/code/new', '/code/mid']);
  // A detected project's activity raises a session folder's recency (r.set(e.path, max)).
  const two = [session('/work/a', 200), session('/work/b', 100)];
  assert.deepEqual(recentFolders({ sessions: two, detectedProjects: [{ path: '/work/b', lastActivity: 9_000_000_000_000 }] }).map((entry) => entry.path), ['/work/b', '/work/a']);
  assert.deepEqual(recentFolders({ sessions, detectedProjects, dismissedAt: { '/code/new': 1 } }).map((entry) => entry.path), ['/work/old', '/code/mid']);
  const many = Array.from({ length: 10 }, (_, index) => ({ path: `/code/p${index}`, lastActivity: 1_000 + index }));
  const list = recentFolders({ sessions, detectedProjects: many });
  assert.equal(list.length, 8);
  assert.equal(list[0].path, '/work/old');
  assert.equal(list[1].path, '/code/p9');
});
