import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSavedEnvironments, takeSavedEnvironment } from '../electron/saved-environments.mjs';
import React from 'react';
import { availableEnvironmentName, readEnvironmentRecord, folderCheckoutSettings, sameFolderSettings } from '../electron/generated/environment-presets.mjs';
import { environmentDraft, environmentDraftDirty, environmentTarget, environmentBranchOrder, environmentDefaultBranch, environmentBranchLabel,
  environmentNotRepositoryNote, folderCheckout, environmentDialogClass, pinnedPopupHeightProperty, useCenteredEnvironmentHeight } from '../src/generated/code-current/environment-dialog-model.mjs';
import { environmentModifierKeys } from '../src/generated/code-current/environment-modifier-keys.mjs';
import { environmentWorkspace, environmentGitInfo, environmentFolderRoot } from '../src/saved-environment-model.mjs';

async function fixture(context) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'saved-environments-'));
  context.after(() => fs.rm(dir, { recursive: true, force: true }));
  const folders = [path.join(dir, 'app'), path.join(dir, 'shared')];
  await Promise.all(folders.map(folder => fs.mkdir(folder)));
  const events = [], selections = [], approved = [];
  const file = path.join(dir, 'preferences', 'environments.json');
  const options = { file, emit: event => events.push(event), approveFolder: folder => { assert.ok(folders.includes(folder)); approved.push(folder); }, onSelectFolders: paths => selections.push(paths), now: () => 100 };
  const store = createSavedEnvironments(options);
  const value = { name: 'App dev', target: { kind: 'local', cwd: folders[0], additionalFolders: [folders[1]] }, settings: { branch: 'main', worktree: true } };
  return { store, value, options, file, folders, events, selections, approved };
}

test('saved places survive restart, preserve source v4 shape and keep session preferences out of the record', async context => {
  const f = await fixture(context);
  assert.deepEqual(await f.store.run(), { version: 4, revision: 0, selectionRevision: 0, environments: [], selectedId: null, starred: [] });
  const { environment: row } = await f.store.run({ op: 'save', value: { ...f.value, icon: 'Flask', settings: { ...f.value.settings, modelId: 'model', effort: 'high', permissionMode: 'bypassPermissions', fastMode: true } } });
  assert.deepEqual(row.settings, { worktree: true, branch: 'main' });
  assert.equal(row.icon, undefined); assert.equal(row.lastUsedAt, 0);
  assert.deepEqual(f.approved, f.folders);
  await f.store.run({ op: 'star', id: row.id });
  await f.store.run({ op: 'select', id: row.id });
  await f.store.run({ op: 'used', id: row.id });
  const restored = await createSavedEnvironments(f.options).run();
  assert.equal(restored.selectedId, row.id); assert.equal(restored.environments[0].lastUsedAt, 100);
  assert.deepEqual(restored.starred, [`preset:${row.id}`]); assert.deepEqual(f.selections, [f.folders]);
  assert.equal(restored.revision, 4); assert.equal(restored.selectionRevision, 3);
  assert.equal((await fs.stat(f.file)).mode & 0o777, 0o600);
  assert.deepEqual(await fs.readdir(path.dirname(f.file)), ['environments.json']);
  assert.equal(f.events.length, 4);
});

test('concurrent saves serialize name checks; failed requests do not poison subsequent operations', async context => {
  const { store, value } = await fixture(context);
  const results = await Promise.allSettled([store.run({ op: 'save', value }), store.run({ op: 'save', value: { ...value, name: ' APP DEV ' } })]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.match(results.find(row => row.status === 'rejected').reason.message, /Another environment/);
  const row = results[0].value.environment;
  const saved = await store.run({ op: 'save', id: row.id, value: { ...value, name: 'Renamed' } });
  assert.equal(saved.environment.createdAt, row.createdAt);
  assert.equal((await store.run()).environments.length, 1);
  await store.run({ op: 'delete', id: row.id });
  await assert.rejects(store.run({ op: 'save', id: row.id, value }), /no longer exists/);
  assert.equal((await store.run()).environments.length, 0);
});

test('missing directories fail selection without changing selection or invoking the launch callback', async context => {
  const { store, value, folders, selections } = await fixture(context);
  const { environment } = await store.run({ op: 'save', value });
  await fs.rmdir(folders[1]);
  await assert.rejects(store.run({ op: 'select', id: environment.id }), /no longer exists/);
  assert.equal((await store.run()).selectedId, null); assert.deepEqual(selections, []);
});

test('deleting a preset removes its favorite and selection while preserving other presets and local favorite', async context => {
  const { store, value } = await fixture(context);
  const one = (await store.run({ op: 'save', value })).environment;
  const two = (await store.run({ op: 'save', value: { ...value, name: 'Second' } })).environment;
  await store.run({ op: 'select', id: one.id });
  await store.run({ op: 'star', id: one.id }); await store.run({ op: 'star', id: 'local:this-computer' });
  const result = await store.run({ op: 'delete', id: one.id });
  assert.equal(result.selectedId, null); assert.deepEqual(result.environments.map(row => row.id), [two.id]);
  assert.deepEqual(result.starred, ['local:this-computer']);
  result.environments[0].name = 'external mutation';
  assert.equal((await store.run({ op: 'get', id: two.id })).name, 'Second');
});

test('malformed stars and duplicate records are ignored; unreadable storage is never overwritten', async context => {
  const { store, value, file, options } = await fixture(context);
  const { environment } = await store.run({ op: 'save', value });
  await fs.writeFile(file, JSON.stringify({ environments: [environment, environment, null], starred: [null, 9, {}, `preset:${environment.id}`, 'preset:missing', 'local:this-computer'], selectedId: 'missing' }));
  const loaded = await createSavedEnvironments(options).run();
  assert.equal(loaded.environments.length, 1); assert.equal(loaded.selectedId, null);
  assert.deepEqual(loaded.starred, [`preset:${environment.id}`, 'local:this-computer']);
  await fs.writeFile(file, '{broken');
  await assert.rejects(createSavedEnvironments(options).run({ op: 'save', value }), /Couldn’t load/);
  assert.equal(await fs.readFile(file, 'utf8'), '{broken');
});

test('unsupported targets and independent additional checkouts cannot be silently saved', async context => {
  const { store, value, folders } = await fixture(context);
  for (const target of [{ kind: 'local', cwd: 'relative' }, { kind: 'local', cwd: '' }, { kind: 'local', cwd: folders[0], variant: 'remote' }, { kind: 'ssh', sshConfigId: 'host', cwd: '/tmp' }])
    await assert.rejects(store.run({ op: 'save', value: { ...value, target } }), /Choose a local folder/);
  await assert.rejects(store.run({ op: 'save', value: { ...value, target: { ...value.target, folderSettings: { [folders[1]]: { worktree: true } } } } }), /Separate checkouts/);
});

test('official draft model identifies edits, excludes a removed folder’s settings and resolves unique names', () => {
  const target = { kind: 'local', cwd: '/work/app', additionalFolders: ['/work/shared'] };
  const opening = environmentDraft(target, ['local'], { branch: 'main', worktree: false }, 'Dev');
  assert.equal(environmentDraftDirty(opening, opening), false);
  for (const change of [{ name: 'Prod' }, { folder: '/work/next' }, { additionalFolders: [] }, { settings: { branch: 'main', worktree: true } }])
    assert.equal(environmentDraftDirty(opening, { ...opening, ...change }), true);
  const draft = { ...opening, folderSettings: { '/work/shared': { worktree: true, branch: 'dev' }, '/gone': { worktree: true } } };
  assert.deepEqual(environmentTarget(draft, false, false), { ...target, folderSettings: { '/work/shared': { worktree: true, branch: 'dev' } } });
  // 2.42304.0 cd0cf5b5e y: a branch without its worktree is not an additional folder's checkout.
  assert.deepEqual(environmentTarget({ ...opening, folderSettings: { '/work/shared': { branch: 'dev' } } }, false, false), target);
  assert.equal(availableEnvironmentName('app', target, ['APP']), 'app 2');
  assert.deepEqual(environmentBranchOrder(['z', 'master', 'main', 'a'], 'feature'), ['feature', 'main', 'master', 'a', 'z']);
  assert.equal(readEnvironmentRecord({ id: 'a', name: 'a', createdAt: 1, lastUsedAt: 0, target, settings: { permissionMode: 'bypassPermissions' } }).environment.settings?.permissionMode, undefined);
});

test('worktree default, current checkout, and explicit branch map to distinct launch decisions', () => {
  const repo = { isRepo: true, branch: 'feature', branches: ['feature', 'main'] };
  assert.equal(environmentWorkspace(repo, { settings: { worktree: true } }).branch, 'main');
  assert.equal(environmentWorkspace(repo, { settings: { worktree: false } }).branch, 'feature');
  assert.equal(environmentWorkspace(repo, {}).branch, 'feature');
  assert.deepEqual(environmentWorkspace(repo, { settings: { worktree: true, branch: 'release' } }), { ...repo, branch: 'release', checkedOut: 'feature' });
  assert.deepEqual(environmentWorkspace({ isRepo: false }, { settings: { worktree: true } }), { isRepo: false });
});

// R4e-envbranch home-15 (2.42304.0 cc43287c9 me → onSelectBranch → JZ G → Te): without a worktree a saved branch other
// than the checked-out one asks for the start-branch check (main.jsx selectBranch); with a worktree G records it as the
// worktree base unchecked. The marker is fresh per application and survives a spread (recordBranch), so it runs once.
test('home-15: a saved branch to switch to without a worktree asks for the start-branch check once per application', () => {
  const repo = { isRepo: true, branch: 'feature', branches: ['feature', 'main'] };
  const first = environmentWorkspace(repo, { settings: { worktree: false, branch: 'release' } });
  assert.deepEqual(first, { ...repo, branch: 'release', checkedOut: 'feature', startBranchCheck: { branch: 'release' } });
  assert.notEqual(environmentWorkspace(repo, { settings: { branch: 'release' } }).startBranchCheck, first.startBranchCheck, 'a new application, a new check');
  assert.equal({ ...first, branch: 'feature', checkedOut: 'feature' }.startBranchCheck, first.startBranchCheck, 'a recorded pick keeps the same marker');
  assert.equal('startBranchCheck' in environmentWorkspace(repo, { settings: { worktree: false, branch: 'feature' } }), false, 'already checked out');
  assert.equal('startBranchCheck' in environmentWorkspace(repo, { settings: { worktree: true, branch: 'release' } }), false, 'a worktree base is not checked');
  assert.equal('startBranchCheck' in environmentWorkspace(repo, { settings: { worktree: false } }), false, 'no saved branch');
  assert.equal('startBranchCheck' in environmentWorkspace({ isRepo: false }, { settings: { branch: 'release' } }), false, 'not a repository');
});

test('environment launch identity checks the real origin of a worktree and never leaks into the core protocol', async context => {
  const f = await fixture(context);
  const row = (await f.store.run({ op: 'save', value: f.value })).environment;
  const link = path.join(path.dirname(f.folders[0]), 'link'); await fs.symlink(f.folders[0], link);
  const args = { method: 'thread/start', surface: 'code', getEnvironment: id => f.store.run({ op: 'get', id }), worktreeOrigins: { '/prepared/worktree': link } };
  const params = { cwd: '/prepared/worktree', codeDesktop: { environmentId: row.id, tools: ['read'] } };
  assert.equal((await takeSavedEnvironment(params, args)).id, row.id);
  assert.deepEqual(params.codeDesktop, { tools: ['read'] });
  const direct = { cwd: link, codeDesktop: { environmentId: row.id } }; await takeSavedEnvironment(direct, args);
  assert.equal(direct.codeDesktop, undefined);
  await assert.rejects(takeSavedEnvironment({ cwd: f.folders[1], codeDesktop: { environmentId: row.id } }, args), /folder changed/);
  for (const change of [{ method: 'turn/start' }, { surface: 'chat' }])
    await assert.rejects(takeSavedEnvironment({ cwd: link, codeDesktop: { environmentId: row.id } }, { ...args, ...change }), /new Code session/);
});

// 2.42304.0 (R2-home home-env-03/04): the ca690a791 branch model that replaced lt/ut, and the cd0cf5b5e y change.
const intl = { formatMessage: message => message.defaultMessage };
test('ht: the repository default wins, a local folder falls back to main/master, other kinds have none', () => {
  assert.equal(environmentDefaultBranch({ defaultBranch: 'trunk' }, ['main', 'trunk'], 'local'), 'trunk');
  assert.equal(environmentDefaultBranch(null, ['feature', 'master', 'main'], 'local'), 'master', 'the first of main/master in list order');
  assert.equal(environmentDefaultBranch(undefined, ['feature'], 'local'), undefined);
  assert.equal(environmentDefaultBranch(null, ['main'], { kind: 'wsl', distro: 'Ubuntu' }), undefined);
});

test('gt: a worktree starts from the default branch, a checkout switches from the current one, else "Current branch"', () => {
  assert.deepEqual(environmentBranchLabel(intl, { worktree: true, defaultBranch: 'main', headBranch: 'feature' }), { pick: 'starts-worktree', none: { branch: 'main', mark: 'default' } });
  assert.deepEqual(environmentBranchLabel(intl, { worktree: false, defaultBranch: 'main', headBranch: 'feature' }), { pick: 'switches-folder', none: { branch: 'feature', mark: 'current' } });
  assert.deepEqual(environmentBranchLabel(intl, { worktree: true, headBranch: 'feature' }), { pick: 'starts-worktree', none: { branch: 'feature', mark: 'current' } });
  assert.deepEqual(environmentBranchLabel(intl, { worktree: false }), { pick: 'switches-folder', none: { label: 'Current branch' } });
  assert.equal(environmentNotRepositoryNote(intl), 'Not a Git repository');
});

test('vt: an additional folder in the primary repository shares its worktree choice (firstWorktree)', () => {
  const changes = [];
  const args = { folders: ['/r/app', '/r/app/lib', '/other'], roots: ['/r', '/r', null, undefined], settings: { '/other': { worktree: true } }, firstWorktree: true, onChange: (...a) => changes.push(a) };
  const lib = folderCheckout({ ...args, path: '/r/app/lib', index: 0 });
  assert.deepEqual({ inRepo: lib.inRepo, sharedWith: lib.sharedWith }, { inRepo: true, sharedWith: { name: 'app', worktree: true } });
  assert.equal(folderCheckout({ ...args, path: '/other', index: 1 }).inRepo, false);
  assert.equal(folderCheckout({ ...args, path: '/x', index: 2 }).inRepo, undefined);
  lib.onChange({ branch: 'dev' }); assert.deepEqual(changes, [['/r/app/lib', { branch: 'dev' }]]);
});

test('cd0cf5b5e y: an additional folder keeps a branch only with its worktree; sameFolderSettings compares both', () => {
  assert.deepEqual(folderCheckoutSettings(['/a', '/b', '/c'], { '/a': { worktree: true, branch: 'dev' }, '/b': { branch: 'dev' }, '/c': { worktree: false } }), { '/a': { worktree: true, branch: 'dev' } });
  assert.equal(folderCheckoutSettings(['/a'], { '/a': { branch: 'dev' } }), undefined);
  assert.equal(sameFolderSettings({ '/a': { worktree: true } }, { '/a': { worktree: true, branch: '' } }), true);
  assert.equal(sameFolderSettings({ '/a': { worktree: true } }, { '/a': { worktree: true, branch: 'dev' } }), false);
});

test('host git info: origin/HEAD names the default only when it is a local branch; the primary folder root is known or unknown', () => {
  assert.deepEqual(environmentGitInfo({ isRepo: true, branch: 'feature', branches: ['feature', 'trunk'], originHead: 'origin/trunk' }), { branch: 'feature', defaultBranch: 'trunk' });
  assert.deepEqual(environmentGitInfo({ isRepo: true, branch: 'feature', branches: ['feature'], originHead: 'origin/trunk' }), { branch: 'feature', defaultBranch: undefined });
  assert.equal(environmentGitInfo({ isRepo: false }), null);
  assert.equal(environmentWorkspace({ isRepo: true, branch: 'feature', branches: ['feature', 'trunk', 'main'], originHead: 'origin/trunk' }, { settings: { worktree: true } }).branch, 'trunk');
  assert.equal(environmentFolderRoot({ cwd: '/r', isRepo: true }, '/r'), '/r');
  assert.equal(environmentFolderRoot({ cwd: '/r', isRepo: false }, '/r'), null);
  assert.equal(environmentFolderRoot({ cwd: '/r', isRepo: false, gitUnavailable: 'missing' }, '/r'), undefined);
  assert.equal(environmentFolderRoot({ cwd: '/old', isRepo: false }, '/r'), undefined, 'a stale answer for another folder is unknown');
});

test('Qt: the dialog caps at the window and at the midpoint of the cap and the pinned open height', () => {
  assert.equal(pinnedPopupHeightProperty, '--pinned-popup-open-height');
  assert.match(environmentDialogClass, /^\[--environment-dialog-cap:calc\(100dvh_-_max\(2rem,2\*var\(--desktop-titlebar-inset,0px\)\)/);
  assert.ok(environmentDialogClass.includes(' max-h-[min(1056px,var(--environment-dialog-cap),calc((var(--environment-dialog-cap)_+_var(--pinned-popup-open-height,var(--environment-dialog-cap)))_/_2))]'));
  assert.doesNotMatch(environmentDialogClass, /max-h-\[min\(1056px,calc\(/, 'the 2.37337.1 class is gone');
  assert.ok(['Alt', 'Meta', 'Shift', 'AltGraph'].every(key => environmentModifierKeys.has(key)));
});

// Ot runs through a deterministic hook store (D21): layout effects run on flush, useEffectEvent reads the latest closure.
function heightHold(props) {
  const cells = []; let cursor = 0, current = props;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const pending = [];
  const dispatcher = {
    useRef(value) { const i = cursor++; return cells[i] ??= { current: value }; },
    useEffectEvent(fn) { const i = cursor++; const cell = cells[i] ??= { fn, call: (...a) => cell.fn(...a) }; cell.fn = fn; return cell.call; },
    useLayoutEffect(fn, deps) { const i = cursor++; const previous = cells[i]; if (!previous || !same(previous.deps, deps)) { cells[i] = { deps }; pending.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  const render = next => {
    current = next ?? current; cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, saved = internals.H;
    internals.H = dispatcher;
    try { useCenteredEnvironmentHeight(current); } finally { internals.H = saved; }
    for (const effect of pending.splice(0)) effect();
  };
  render();
  return { render, unmount() { for (const cell of cells) cell?.cleanup?.(); } };
}
function fakeDialog(height) {
  const listeners = new Map(), observers = [];
  const style = { top: '', height: '', marginTop: '', props: new Map(),
    setProperty(name, value) { if (name === 'margin-top') this.marginTop = value; else if (name === 'height') this.height = value; else this.props.set(name, value); },
    getPropertyValue(name) { return this.props.get(name) ?? ''; }, removeProperty(name) { if (name === 'height') this.height = ''; } };
  const documentElement = { style: { getPropertyValue: () => '0px' } };
  const doc = { documentElement, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
  const view = { innerWidth: 1200, innerHeight: 800, document: doc, addEventListener() {}, removeEventListener() {},
    ResizeObserver: class { constructor(fn) { observers.push(fn); } observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} } };
  doc.defaultView = view;
  const popup = { ownerDocument: doc, style, get offsetHeight() { return height; } };
  return { popup, style, listeners, resize(next) { height = next; observers.forEach(fn => fn()); } };
}
test('Ot: a view change or a press inside the dialog holds its height; a modifier-only key does not', () => {
  const dialog = fakeDialog(400);
  const hold = heightHold({ popup: dialog.popup, open: true, view: 'local main' });
  assert.equal(dialog.style.getPropertyValue('--pinned-popup-open-height'), '');
  const inside = key => ({ key, repeat: false, composedPath: () => [dialog.popup] });
  dialog.listeners.get('keydown')(inside('Shift'));
  assert.equal(dialog.style.getPropertyValue('--pinned-popup-open-height'), '', 'modifier keys are ignored');
  hold.render({ popup: dialog.popup, open: true, view: 'local variables' });
  assert.equal(dialog.style.getPropertyValue('--pinned-popup-open-height'), '400px');
  dialog.resize(480);
  assert.equal(dialog.style.marginTop, '40px', 'the held dialog grows downward: half the growth is pushed below');
  hold.unmount();
  assert.equal(dialog.style.height, '480px', 'closing freezes the last height for the exit transition');
  const fresh = fakeDialog(300), other = heightHold({ popup: fresh.popup, open: true, view: 'local main' });
  fresh.listeners.get('pointerdown')({ composedPath: () => [fresh.popup] });
  assert.equal(fresh.style.getPropertyValue('--pinned-popup-open-height'), '300px');
  other.unmount();
});
