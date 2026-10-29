import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSavedEnvironments, takeSavedEnvironment } from '../electron/saved-environments.mjs';
import React from 'react';
import { availableEnvironmentName, readEnvironmentRecord, folderCheckoutSettings, sameFolderSettings } from '../electron/generated/environment-presets.mjs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as Draft from '../src/generated/code-current/environment-dialog-draft.mjs';
import { environmentModifierKeys } from '../src/generated/code-current/environment-modifier-keys.mjs';
import { wslFolderPath } from '../src/generated/code-current/environment-wsl-folder.mjs';
import { environmentWorkspace, environmentGitInfo, environmentFolderRoot } from '../src/saved-environment-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

// W9 cc-rest-env-model (3.6556.2, E42): the ca690a791 draft / branch / target model is plain code (environment-dialog-draft,
// imported here directly); environment-dialog-model adds the compiled height hold Yt, which reaches view-tabs, so it loads
// through Vite.
const { environmentDraft, environmentDraftDirty, environmentTarget, environmentBranchOrder, environmentDefaultBranch, environmentBranchLabel,
  environmentNotRepositoryNote, folderCheckout, environmentDialogClass, pinnedPopupHeightProperty } = Draft;
const app = path.resolve(import.meta.dirname, '..');
let server, DialogModel, useCenteredEnvironmentHeight;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  DialogModel = await server.ssrLoadModule('/src/generated/code-current/environment-dialog-model.mjs');
  ({ useCenteredEnvironmentHeight } = DialogModel);
});
after(() => server?.close());

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
    useState(init) { const i = cursor++; return cells[i] ??= [typeof init === 'function' ? init() : init, () => {}]; },
    useRef(value) { const i = cursor++; return cells[i] ??= { current: value }; },
    useEffectEvent(fn) { const i = cursor++; const cell = cells[i] ??= { fn, call: (...a) => cell.fn(...a) }; cell.fn = fn; return cell.call; },
    useLayoutEffect(fn, deps) { const i = cursor++; const previous = cells[i]; if (!previous || !same(previous.deps, deps)) { cells[i] = { deps }; pending.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  let renders = 0;
  const render = next => {
    current = next ?? current; cursor = 0; renders += 1;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, saved = internals.H;
    internals.H = withMemoCache(dispatcher);
    try { useCenteredEnvironmentHeight(current); } finally { internals.H = saved; }
    for (const effect of pending.splice(0)) effect();
  };
  render();
  return { render, cache: () => cells[0]?.[0], renders: () => renders, unmount() { for (const cell of cells) cell?.cleanup?.(); } };
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
  const cache = hold.cache();
  assert.ok(Array.isArray(cache) && cache.length === 13, 'Yt opens with J9(13)');
  assert.equal(dialog.style.getPropertyValue('--pinned-popup-open-height'), '');
  const inside = key => ({ key, repeat: false, composedPath: () => [dialog.popup] });
  dialog.listeners.get('keydown')(inside('Shift'));
  assert.equal(dialog.style.getPropertyValue('--pinned-popup-open-height'), '', 'modifier keys are ignored');
  hold.render({ popup: dialog.popup, open: true, view: 'local variables' });
  assert.equal(hold.cache(), cache, 'the memo cache is the same array across renders');
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

// W9 cc-rest-env-model (3.6556.2, research/code-current-rest.md §3 P1, data/code-current-rest-map.json): ca690a791-C6pAwzdL
// en/nn/_n and the targets that moved chunks.
test('3.6556.2 en/nn: an opening variant record makes the draft dirty only when the record itself changed', () => {
  const target = { kind: 'local', cwd: '/work/app' };
  const plain = environmentDraft(target, ['local'], {}, 'Dev');
  assert.deepEqual([plain.variantRecord, plain.variantDirty, plain.variantLoad, plain.variantBeneath], [{}, false, 'pending', {}]);
  const record = { FOO: '1' };
  const opening = environmentDraft(target, ['local'], {}, 'Dev', undefined, record);
  assert.deepEqual(opening.variantRecord, record); assert.notEqual(opening.variantRecord, record, 'a copy of the record');
  assert.equal(opening.variantDirty, true);
  assert.equal(environmentDraftDirty(opening, { ...opening, variantRecord: { FOO: '1' } }), false, 'same record, compared by JSON');
  assert.equal(environmentDraftDirty(opening, { ...opening, variantRecord: { FOO: '2' } }), true);
  assert.equal(environmentDraftDirty(plain, { ...plain, variantDirty: true }), true, 'a newly dirtied record against a clean opening');
});

test('3.6556.2 _n: a WSL folder is the distro POSIX path (shared-20 QA), null outside the distro; the host never sets wslDistro', () => {
  const draft = environmentDraft({ kind: 'local', cwd: '/work/app' }, ['local'], {}, 'Dev');
  assert.deepEqual(environmentTarget(draft, false, false), { kind: 'local', cwd: '/work/app' });
  assert.deepEqual(environmentTarget({ ...draft, folder: '\\\\wsl.localhost\\Ubuntu\\home\\me', wslDistro: 'Ubuntu' }, false, false), { kind: 'local', cwd: '/home/me', wslDistro: 'Ubuntu' });
  assert.equal(environmentTarget({ ...draft, folder: '\\\\wsl$\\Debian\\srv', wslDistro: 'Ubuntu' }, false, false), null);
  assert.equal(environmentTarget({ ...draft, folder: null }, true, false).cwd, '', 'folderless local (gn)');
  assert.equal(wslFolderPath('/already/posix', 'Ubuntu'), '/already/posix');
  assert.equal(wslFolderPath('\\\\wsl.localhost\\ubuntu', 'Ubuntu'), '/');
});

test('3.6556.2 shared-1 tK: the modifier keys include Fn / NumLock / OS / ScrollLock', () => {
  assert.deepEqual([...environmentModifierKeys].sort(), ['Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'Meta', 'NumLock', 'OS', 'ScrollLock', 'Shift']);
});

test('generated: env-model targets read 3.6556.2; the dialog model re-exports the draft model plus Yt; E42 closure', async () => {
  const read = file => fs.readFile(path.join(app, file), 'utf8');
  const manifest = JSON.parse(await read('src/generated/code-current/manifest.json'));
  const entry = target => manifest.modules.find(m => m.target === target);
  for (const [target, file, bindings] of [
    ['../../../electron/generated/environment-basename.mjs', 'shared-52-uHFNjl7C.js', ['nk']],
    ['../../../electron/generated/environment-parent.mjs', 'shared-18-D3y8YMFN.js', ['lU']],
    ['environment-modifier-keys.mjs', 'shared-1-BJhqMmkf.js', ['tK']],
    ['environment-common-copy.mjs', 'shared-78-D5Fw2h0a.js', ['ZW', 'QW']],
    ['environment-wsl-unc.mjs', 'shared-78-D5Fw2h0a.js', ['AQ']],
    ['environment-wsl-folder.mjs', 'shared-20-mUr7IqZY.js', ['XA', 'QA']],
    ['environment-dialog-draft.mjs', 'ca690a791-C6pAwzdL.js', null],
    ['environment-dialog-model.mjs', 'ca690a791-C6pAwzdL.js', ['Yt', 'Kt', 'qt', 'Jt']],
    ['environment-picker-keys.mjs', 'shared-46-BIbZBGFq.js', ['Gx', 'qx', 'Jx', 'Yx', 'iS', 'VL', 'zL']],
    ['environment-machine-variables.mjs', 'c3f9f1667-DnyzRZCB.js', ['I', 'L', 'z', 'R', 'B', 'V']],
  ]) {
    const module = entry(target);
    assert.equal(module?.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(module.source), file, target);
    assert.ok(module.source.includes('snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/'), target);
    if (bindings) assert.deepEqual(module.bindings, bindings, target);
  }
  // presets / name-parts are 3.6556.2 too; session-rail / -kit / -changes import them from here (one copy, D1).
  for (const [target, file] of [['../../../electron/generated/environment-presets.mjs', 'cd0cf5b5e-BCzJmEwZ.js'], ['environment-name-parts.mjs', 'c96d752d0-CWv_7-n9.js']]) {
    assert.equal(entry(target)?.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(entry(target).source), file, target);
  }
  for (const [area, target, local, from] of [['session-rail-kit', 'branch-chip.mjs', 'pL', '../code-current/environment-name-parts.mjs'],
    ['session-rail-changes', 'pr-rows.mjs', 'pL', '../code-current/environment-name-parts.mjs'],
    ['session-rail', 'environment-target.mjs', 'm', '../../../electron/generated/environment-presets.mjs'],
    ['session-rail', 'environment-target.mjs', 'S', '../../../electron/generated/environment-presets.mjs']]) {
    const module = JSON.parse(await read(`src/generated/${area}/manifest.json`)).modules.find(m => m.target === target);
    assert.equal(module.imports.find(i => i.local === local)?.from, from, `${area}/${target} ${local}`);
  }
  const names = Object.keys(Draft).sort();
  assert.deepEqual(Object.keys(DialogModel).sort(), [...names, 'useCenteredEnvironmentHeight'].sort());
  assert.ok(!names.includes('environmentBodySpacing'), '3.6556.2 dropped the 2.42304.0 body spacing constant');
  // E42: the draft model's relative import closure stays out of view-tabs and host adapters.
  const seen = new Set();
  const walk = async file => {
    if (seen.has(file)) return; seen.add(file);
    for (const [, spec] of (await read(file)).matchAll(/from\s+["'](\.[^"']+)["']/g)) await walk(path.relative(app, path.resolve(app, path.dirname(file), spec)));
  };
  await walk('src/saved-environment-model.mjs');
  assert.ok(seen.has('src/generated/code-current/environment-dialog-draft.mjs'));
  assert.deepEqual([...seen].filter(file => /view-tabs|\.jsx$/.test(file)), []);
  const hold = await read('src/generated/code-current/environment-dialog-model.mjs');
  assert.match(hold, /import \{\s*reactMemoCache as J9,/);
  assert.match(hold, /import \{ ownerWindow as w \} from "\.\.\/view-tabs\/shared-25-DOWZRSlq\.js";/);
  assert.match(await read('src/generated/code-current/environment-machine-variables.mjs'), /\.then\(z\)\s*\.catch\(R\)/);
});

