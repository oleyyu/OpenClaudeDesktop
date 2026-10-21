// savePanelProbe / save_panel_restricted (official 2.42304.0, save-panel.cjs): the ported policy (protected names,
// folders, a save sheet's target, typing into it), the protected index over a temporary home folder, the gates
// (keys, typing, a click / drag at a point, a held press, the app_* tools) with a fake native probe, the 750 ms settle
// and the folder-parents read before a save is confirmed, and the service / tool wiring. Nothing is posted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createSavePanelGuard, createProtectedIndex, policy } = require('../electron/computer-use/save-panel.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { decide } = require('../electron/computer-use/reason-policy.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');

/** A probe as the native module answers it: a plain window, unless overridden. */
const rawProbe = (over = {}) => ({ ownerPid: 42, hitIdentifier: null, hitTestFellBack: false, focusRole: 'AXTextArea', focusIdentifier: null,
  sheetIdentifiers: [], windowDocumentUrl: null, windowDocumentReadFailed: false, otherWindowDocumentUrls: [], otherWindowHasSaveSheet: false,
  saveNameValue: null, saveWhereDisplayName: null, saveShownFolderUrl: null, moveSheetIsUp: false, popoverFolderMenuIsOpen: false,
  popoverTextFieldValues: [], popoverPopUpValues: [], popoverTextFieldIsUnreadable: false, popoverHoldsTheFocus: false, ...over });
/** A save sheet with its name box focused. */
const saveSheet = (over = {}) => rawProbe({ sheetIdentifiers: ['save-panel'], focusRole: 'AXTextField', focusIdentifier: 'saveAsNameTextField',
  saveNameValue: 'notes.txt', saveWhereDisplayName: 'Documents', saveShownFolderUrl: 'file:///Users/me/Documents/', ...over });

const quietIndex = { isProtectedUrl: async (url) => /\/\.zshrc$|LaunchAgents/.test(url), relocatedTargets: async () => [], targetIsProtected: async () => false };
function guardWith({ probe = () => rawProbe(), parents = () => ({ names: ['Documents', 'me', 'Users', 'Macintosh HD'] }), clock = { t: 10_000 } } = {}) {
  const calls = [];
  const native = { async call(method, params) {
    calls.push([method, params]);
    if (method === 'savePanelProbe') { const p = probe(params); return { probe: p }; }
    if (method === 'saveSheetFolderAndParents') return { answer: parents(params) };
    throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
  } };
  const guard = createSavePanelGuard({ native, platform: 'darwin', now: () => clock.t, wait: async (ms) => { clock.t += ms; }, index: quietIndex, log: { warn() {}, debug() {} } });
  return { guard, calls, clock };
}

test('policy: protected names — hidden names, shell / git / ssh files, files that act when opened; ordinary names are fine', () => {
  for (const name of ['.zshrc', '.profile', '.hidden', 'authorized_keys', 'id_ed25519', 'gitdir', 'p10k-dump-x.zsh', 'evil.command', 'x.webloc', 'x.terminal.', '"​.bashrc"']) {
    assert.equal(policy.isProtectedName(name), true, name);
  }
  for (const name of ['notes.txt', 'Report.pdf', 'profile', 'bashrc.txt', 'config']) assert.equal(policy.isProtectedName(name), false, name);
});

test('policy: folders where nothing may be saved, folders that refuse some names, and ordinary folders', () => {
  assert.equal(policy.saveVerdict('LaunchAgents', 'a.plist'), 'folder');
  assert.equal(policy.saveVerdict('.ssh', 'notes.txt'), 'folder');
  assert.equal(policy.saveVerdict('.anything', 'x'), 'folder', 'a hidden folder');
  assert.equal(policy.saveVerdict('Preferences', 'com.x.plist'), 'name_in_folder');
  assert.equal(policy.saveVerdict('Preferences', 'notes.txt'), null);
  assert.equal(policy.saveVerdict('hooks', 'pre-commit'), 'name_in_folder');
  assert.equal(policy.saveVerdict('bin', 'activate'), 'name_in_folder');
  assert.equal(policy.saveVerdict('.git', 'config'), 'name_in_folder');
  assert.equal(policy.saveVerdict('Documents', 'notes.txt'), null);
  // A folder the home folder links to elsewhere (relocatedTargets): its real name refuses as the protected one.
  assert.equal(policy.saveVerdict('agents-elsewhere', 'x.plist', [{ folderName: 'agents-elsewhere', fileName: null, canonicalFolderName: 'launchagents' }]), 'folder');
  assert.equal(policy.saveVerdict('dots', 'zshrc', [{ folderName: 'dots', fileName: 'zshrc' }]), 'name_in_folder');
});

test('policy: confirming a save sheet — the name and the folder pop-up; the background reads the folder from the file list', () => {
  const p = { sheetIdentifiers: ['save-panel'], hitIdentifier: null, saveNameValue: 'notes.txt', saveWhereDisplayName: 'Documents', resolvedProtectedTargets: [] };
  assert.deepEqual(policy.confirmVerdict(p), { allowed: true });
  assert.equal(policy.confirmVerdict({ ...p, saveNameValue: '.zshrc' }).reason, 'confirm_name_protected');
  assert.equal(policy.confirmVerdict({ ...p, saveNameValue: 'a/b.txt' }).reason, 'confirm_name_protected');
  assert.equal(policy.confirmVerdict({ ...p, saveWhereDisplayName: 'LaunchAgents' }).reason, 'confirm_folder_protected');
  assert.equal(policy.confirmVerdict({ ...p, saveNameValue: null }).reason, 'confirm_target_unreadable');
  assert.equal(policy.confirmVerdict(p, 2).reason, 'confirm_multi_click');
  assert.deepEqual(policy.confirmVerdict({ ...p, hitIdentifier: 'saveAsNameTextField' }, 2), { allowed: true }, 'double-click in the name box selects text');
  // The folder pop-up's path: the shown folder must be the pop-up's, its parents are checked against the chains.
  assert.deepEqual(policy.pathVerdict(p, ['Documents', 'me', 'Users']), { allowed: true });
  assert.equal(policy.pathVerdict({ ...p, saveWhereDisplayName: 'Library' }, ['Documents', 'me']).reason, 'confirm_target_unreadable', 'the path read is not the pop-up\'s folder');
  assert.equal(policy.pathVerdict({ ...p, saveWhereDisplayName: 'Sub' }, ['Sub', '.config', 'me']).reason, 'confirm_folder_protected');
  assert.equal(policy.pathVerdict({ ...p, saveWhereDisplayName: 'Sub', saveNameValue: 'x.py' }, ['Sub', 'AutoLaunch', 'Scripts', 'iTerm2', 'Application Support', 'Library', 'me']).reason, 'confirm_folder_protected');
  // In the background (official Kor): the list's folder URL; none → confirm_folder_not_shown.
  assert.deepEqual(policy.listedFolderVerdict({ ...p, saveShownFolderUrl: 'file:///Users/me/Documents/', saveTargetPathIsProtected: false }), { allowed: true });
  assert.equal(policy.listedFolderVerdict({ ...p, saveShownFolderUrl: null }).reason, 'confirm_folder_not_shown');
  assert.equal(policy.listedFolderVerdict({ ...p, saveShownFolderUrl: 'file:///Users/me/.ssh/' }).reason, 'confirm_folder_protected');
  assert.equal(policy.listedFolderVerdict({ ...p, saveShownFolderUrl: 'file:///Users/me/Documents/', saveTargetPathIsProtected: true }).reason, 'confirm_folder_protected');
  assert.deepEqual(policy.folderNamesOf('file:///Users/me/My%20Docs/'), ['My Docs', 'me', 'Users']);
});

test('policy: typing into a save sheet — a plain name in the name box or the search field only', () => {
  const p = { sheetIdentifiers: ['save-panel'], focusIdentifier: 'saveAsNameTextField', saveWhereDisplayName: 'Documents', resolvedProtectedTargets: [] };
  assert.deepEqual(policy.typingVerdict(p, 'notes.txt'), { allowed: true });
  assert.equal(policy.typingVerdict(p, '~/x').reason, 'name_is_path');
  assert.equal(policy.typingVerdict(p, '.bash_profile').reason, 'name_protected');
  assert.deepEqual(policy.typingVerdict({ ...p, focusIdentifier: 'Search' }, '.bashrc'), { allowed: true });
  assert.equal(policy.typingVerdict({ ...p, focusIdentifier: null }, 'x').reason, 'not_a_typing_field');
  assert.equal(policy.typingVerdict({ ...p, sheetIdentifiers: ['save-panel', 'GoToWindow'], focusIdentifier: 'PathTextField' }, 'x').reason, 'goto_path_unverifiable');
});

test('protected index (official jNr / kNr) over a temporary home: shell files, launch agents, hidden entries, links to elsewhere', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-home-'));
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-else-'));
  try {
    fs.mkdirSync(path.join(home, 'Library', 'LaunchAgents'), { recursive: true });
    fs.mkdirSync(path.join(home, 'Documents'));
    fs.mkdirSync(path.join(home, '.dotfiles'));
    fs.writeFileSync(path.join(elsewhere, 'zshrc-real'), '');
    fs.symlinkSync(path.join(elsewhere, 'zshrc-real'), path.join(home, '.zshrc'));
    const index = createProtectedIndex({ home });
    const url = (...parts) => pathToFileURL(path.join(...parts)).href;
    assert.equal(await index.isProtectedUrl(url(home, '.zshrc')), true);
    assert.equal(await index.isProtectedUrl(url(elsewhere, 'zshrc-real')), true, 'the file .zshrc links to');
    assert.equal(await index.isProtectedUrl(url(home, 'Library', 'LaunchAgents', 'x.plist')), true);
    assert.equal(await index.isProtectedUrl(url(home, '.dotfiles', 'notes.txt')), true, 'under a hidden home entry');
    assert.equal(await index.isProtectedUrl(url(home, 'Documents', 'notes.txt')), false);
    assert.equal(await index.isProtectedUrl(url('/tmp', 'repo', '.git', 'hooks', 'pre-commit')), true, 'a path pattern');
    assert.equal(await index.isProtectedUrl('https://example.com/x'), false);
    const relocated = await index.relocatedTargets();
    assert.ok(relocated.some((t) => t.folderName === path.basename(fs.realpathSync(elsewhere)).toLowerCase() && t.fileName === 'zshrc-real'), JSON.stringify(relocated));
    assert.equal(await index.targetIsProtected(url(home, 'Library', 'LaunchAgents') + '/', 'x.plist'), true);
    assert.equal(await index.targetIsProtected(url(home, 'Documents') + '/', 'notes.txt'), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
});

test('keyboard gate: no save sheet → keys pass; a window editing a protected file refuses typing but not window shortcuts', async () => {
  const { guard } = guardWith();
  assert.equal(await guard.keyboard('keyboard', { chord: 'cmd+s' }), null);
  assert.equal(await guard.keyboard('keyboard', { typedText: 'hello' }), null);
  const doc = guardWith({ probe: () => rawProbe({ windowDocumentUrl: 'file:///Users/me/.zshrc' }) }).guard;
  const typed = await doc.keyboard('keyboard', { typedText: 'x' });
  assert.equal(typed.reasonCode, 'save_panel_restricted');
  assert.match(typed.message, /^Typing into this window is not allowed: it is editing a protected file/);
  assert.equal(await doc.keyboard('keyboard', { chord: 'cmd+w' }), null, 'closing it is allowed');
  assert.equal(await doc.keyboard('keyboard', { chord: 'down' }), null);
  assert.equal((await doc.keyboard('keyboard', { chord: 'cmd+v' })).reasonCode, 'save_panel_restricted');
  const unread = guardWith({ probe: () => rawProbe({ windowDocumentReadFailed: true }) }).guard;
  assert.match((await unread.keyboard('keyboard', { chord: 'a' })).message, /Could not verify which document this window is editing/);
});

test('keyboard gate in a save sheet: only single navigation keys, no control characters, a plain name; Return checks the target', async () => {
  const { guard, calls, clock } = guardWith({ probe: () => saveSheet() });
  const chord = await guard.keyboard('keyboard', { chord: 'cmd+shift+g' });
  assert.match(chord.message, /^Key "cmd\+shift\+g" is not one of the allowed navigation keys while a save sheet is open/);
  assert.match(chord.message, /Do not attempt to work around this restriction/);
  assert.equal(await guard.keyboard('keyboard', { chord: 'tab' }), null);
  assert.equal(await guard.keyboard('keyboard', { chord: 'shift+home' }), null);
  assert.match((await guard.keyboard('keyboard', { typedText: 'a\nb' })).message, /^Text may not contain tab, newline or other control characters/);
  assert.match((await guard.keyboard('keyboard', { typedText: '.zshrc' })).message, /^Typing this into the save sheet is not allowed: that file name is protected/);
  assert.match((await guard.keyboard('keyboard', { typedText: '../x' })).message, /may only hold a plain name/);
  assert.equal(await guard.keyboard('keyboard', { typedText: 'notes.txt' }), null);
  // Return: the target first, then (the save sheet on top) its folder's parents from the folder pop-up.
  assert.equal(await guard.keyboard('keyboard', { chord: 'return' }), null);
  assert.deepEqual(calls.filter(([m]) => m === 'saveSheetFolderAndParents').map(([, p]) => p), [{ pid: 42 }]);
  // Right after an input the sheet settles for 750 ms: the gate waits and checks again (not a refusal).
  guard.inputDone();
  const before = clock.t;
  assert.equal(await guard.keyboard('keyboard', { chord: 'return' }), null);
  assert.ok(clock.t - before >= 750, `waited ${clock.t - before} ms`);
});

test('keyboard gate: Return into a protected target is refused; parents under a protected chain too; an open menu lets Return pick', async () => {
  const name = guardWith({ probe: () => saveSheet({ saveNameValue: '.bashrc' }) }).guard;
  assert.match((await name.keyboard('keyboard', { chord: 'return' })).message, /^Saving here is not allowed: the target is a protected file name/);
  const folder = guardWith({ probe: () => saveSheet({ saveWhereDisplayName: 'LaunchAgents' }) }).guard;
  assert.match((await folder.keyboard('keyboard', { chord: 'enter' })).message, /^Saving here is not allowed: the target is a protected folder/);
  const parents = guardWith({ probe: () => saveSheet({ saveWhereDisplayName: 'conf.d', saveNameValue: 'notes.txt' }), parents: () => ({ names: ['conf.d', 'fish', '.config', 'me'] }) }).guard;
  assert.match((await parents.keyboard('keyboard', { chord: 'return' })).message, /protected folder/);
  const menu = guardWith({ probe: () => saveSheet(), parents: () => ({ menuWasOpen: true }) }).guard;
  assert.equal(await menu.keyboard('keyboard', { chord: 'return' }), null, 'a key picks in the open menu');
  const goTo = guardWith({ probe: () => saveSheet({ sheetIdentifiers: ['save-panel', 'GoToWindow'] }) }).guard;
  assert.match((await goTo.keyboard('keyboard', { chord: 'return' })).message, /^Return in the Go-to-Folder box is not allowed/);
});

test('pointer gate in a save sheet: Cancel always; left clicks only, single, and checked; no drags; Save checks the folder last', async () => {
  const at = (over) => guardWith({ probe: () => saveSheet(over) }).guard;
  const point = { bundleId: 'com.apple.TextEdit', point: { x: 10, y: 10 } };
  assert.equal((await at({ hitIdentifier: 'CancelButton', saveNameValue: '.zshrc' }).pointer({ ...point, kind: 'click', button: 'left', count: 1 })).refusal, null);
  assert.match((await at().pointer({ ...point, kind: 'click', button: 'right', count: 1 })).refusal.message, /^Only a left click, holding shift at most/);
  assert.match((await at().pointer({ ...point, kind: 'click', button: 'left', count: 2 })).refusal.message, /^A double- or triple-click is not allowed in a save sheet/);
  assert.match((await at().pointer({ ...point, kind: 'drag' })).refusal.message, /^A held press or drag is not allowed while a save sheet is open/);
  assert.match((await at({ saveNameValue: '.zshrc' }).pointer({ ...point, kind: 'click', button: 'left', count: 1 })).refusal.message, /^This click could confirm a save to a protected file name/);
  const { guard, calls } = guardWith({ probe: () => saveSheet({ hitIdentifier: 'OKButton' }) });
  const save = await guard.pointer({ ...point, kind: 'click', button: 'left', count: 1 });
  assert.equal(save.refusal, null);
  // The parents check runs once the hit test passed (official h() = Et()), through the gate's retry.
  const first = await save.confirm();
  assert.equal(first.retry?.parentFoldersOfPid, 42, 'first pass: read the parents, then retry');
  assert.equal(await guard.retrying(async () => { const hit = await guard.pointer({ ...point, kind: 'click', button: 'left', count: 1 }); return hit.refusal ?? hit.confirm(); }), null);
  assert.equal(calls.filter(([m]) => m === 'saveSheetFolderAndParents').length, 1);
  // A click in the name box doesn't confirm: no parents read.
  const nameBox = guardWith({ probe: () => saveSheet({ hitIdentifier: 'saveAsNameTextField' }) });
  assert.equal(await (await nameBox.guard.pointer({ ...point, kind: 'click', button: 'left', count: 1 })).confirm(), null);
  assert.equal(nameBox.calls.filter(([m]) => m === 'saveSheetFolderAndParents').length, 0);
});

test('Move To sheet, rename popover, held press, and a hit that fell back where a protected window may be hidden', async () => {
  const move = guardWith({ probe: () => rawProbe({ moveSheetIsUp: true, hitIdentifier: 'Something' }) }).guard;
  assert.match((await move.pointer({ point: { x: 1, y: 1 }, kind: 'click', button: 'left', count: 1 })).refusal.message, /^Moving a document with File > Move To/);
  const moveCancel = guardWith({ probe: () => rawProbe({ moveSheetIsUp: true, hitIdentifier: 'Cancel Button' }) }).guard;
  assert.equal((await moveCancel.pointer({ point: { x: 1, y: 1 }, kind: 'click', button: 'left', count: 1 })).refusal, null);
  const rename = guardWith({ probe: () => rawProbe({ popoverTextFieldValues: ['.zshrc'], popoverPopUpValues: ['Documents'], popoverHoldsTheFocus: true }) }).guard;
  assert.match((await rename.keyboard('keyboard', { chord: 'return' })).message, /^Giving the document this name from its title bar is not allowed/);
  assert.equal(await rename.keyboard('keyboard', { chord: 'escape' }), null, 'escape puts the old name back');
  const held = guardWith({ probe: () => saveSheet() }).guard;
  assert.match((await held.heldPress()).message, /^A held press is not allowed while a save sheet is open/);
  assert.equal(await guardWith().guard.heldPress(), null);
  const fell = createSavePanelGuard({ platform: 'darwin', index: { ...quietIndex, isProtectedUrl: async (u) => u.includes('.zshrc') }, log: { warn() {} },
    native: { call: async () => ({ probe: rawProbe({ hitTestFellBack: true, otherWindowDocumentUrls: ['file:///Users/me/.zshrc'] }) }) } });
  assert.match((await fell.pointer({ point: { x: 1, y: 1 }, kind: 'click', button: 'left', count: 1 })).refusal.message, /^Could not verify which window this click lands on/);
});

test('app_* gate (official Ut): the window aimed at; a key in a save sheet reads the folder from the file list; a menu checks the main window too', async () => {
  const listed = guardWith({ probe: () => saveSheet({ saveShownFolderUrl: null }) });
  const key = await listed.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', action: { kind: 'key', combo: 'return' } });
  assert.match(key.message, /^This could confirm a save, and the sheet as it stands does not tell which folder it would go to/);
  assert.deepEqual(listed.calls[0][1], { windowId: 7 });
  const ok = guardWith({ probe: () => saveSheet() });
  assert.equal(await ok.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', point: { x: 5, y: 6 }, action: { kind: 'click', button: 'left', count: 1 } }), null);
  assert.deepEqual(ok.calls[0][1], { windowId: 7, point: { x: 5, y: 6 } });
  assert.equal(ok.calls.filter(([m]) => m === 'saveSheetFolderAndParents').length, 0, 'the background never opens the folder pop-up');
  assert.equal(await ok.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', action: { kind: 'type', text: 'a.txt' } }), null);
  assert.match((await ok.guard.app({ windowId: 7, bundleId: 'x', action: { kind: 'type', text: '.zshrc' } })).message, /that file name is protected/);
  assert.equal(await ok.guard.app({ windowId: 7, bundleId: 'x', action: { kind: 'drag' } }) .then((r) => r.reasonCode), 'save_panel_restricted');
  // A menu command: the window, then (no document seen there) the app's main window, worded as such.
  let n = 0;
  const menu = guardWith({ probe: (p) => (n++ === 0 ? rawProbe() : saveSheet({ saveNameValue: '.zshrc' })) });
  const refused = await menu.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', action: { kind: 'menu', window: 'locked' } });
  assert.match(refused.message, /^A background menu command can act on the app's main window/);
  assert.deepEqual(menu.calls.map(([, p]) => p), [{ windowId: 7 }, { bundleId: 'com.apple.TextEdit', mainWindow: true }]);
  assert.equal(await ok.guard.app({ bundleId: 'x', action: { kind: 'key', combo: 'a' } }), null, 'no window: nothing to probe');
});

test('app_click on Save while the file list shows several folders (search results): the native probe gives no folder → confirm_folder_not_shown', async () => {
  // SavePanel.shownFolder(itemUrls:) returns nil for items under different parents; the sheet's pop-up still names a folder.
  const mixed = guardWith({ probe: () => saveSheet({ hitIdentifier: 'OKButton', focusIdentifier: 'NSSearchField', focusRole: 'AXTextField', saveWhereDisplayName: 'Documents', saveShownFolderUrl: null }) });
  const refused = await mixed.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', point: { x: 5, y: 6 }, action: { kind: 'click', button: 'left', count: 1 } });
  assert.equal(refused?.reasonCode, 'save_panel_restricted');
  assert.equal(refused.saveGuard, 'confirm_folder_not_shown');
  assert.match(refused.message, /^This click could confirm a save, and the sheet as it stands does not tell which folder it would go to/);
  assert.equal(mixed.calls.filter(([m]) => m === 'saveSheetFolderAndParents').length, 0);
  // A pop-up that itself names a protected folder is refused on that name first.
  const named = guardWith({ probe: () => saveSheet({ hitIdentifier: 'OKButton', saveWhereDisplayName: 'LaunchAgents', saveShownFolderUrl: null }) });
  assert.equal((await named.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', point: { x: 5, y: 6 }, action: { kind: 'click', button: 'left', count: 1 } })).saveGuard, 'confirm_folder_protected');
  // The same sheet with one folder in its list lets the click through.
  const single = guardWith({ probe: () => saveSheet({ hitIdentifier: 'OKButton' }) });
  assert.equal(await single.guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', point: { x: 5, y: 6 }, action: { kind: 'click', button: 'left', count: 1 } }), null);
});

test('off elsewhere and on a host without the probe; the reason is registered as a block', async () => {
  const native = { calls: 0, async call() { this.calls += 1; throw Object.assign(new Error('Unknown method savePanelProbe.'), { code: 'unknown_method' }); } };
  const guard = createSavePanelGuard({ native, platform: 'darwin', index: quietIndex });
  assert.equal(await guard.keyboard('keyboard', { chord: 'a' }), null);
  assert.equal(guard.available, false);
  assert.equal(await guard.keyboard('keyboard', { chord: 'a' }), null);
  assert.equal(native.calls, 1);
  assert.equal(createSavePanelGuard({ native, platform: 'win32', index: quietIndex }).available, false);
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'save_panel_restricted' }, { op: 'type' }), { action: 'block', reason: 'save_panel_restricted' });
});

test('a probe that fails (not missing) refuses the screen-wide gates (official St / Vt / kt: gt() throws), app_* judges nothing this call (official Ut: .catch(() => null)), the guard stays on', async () => {
  for (const failure of [() => Object.assign(new Error('probe broke'), { code: 'internal' }), () => new Error('no code'), () => new SyntaxError('Unexpected token')]) {
    let fail = true;
    const { guard } = guardWith({ probe: () => { if (fail) throw failure(); return rawProbe(); } });
    const refusals = [
      await guard.keyboard('keyboard', { typedText: 'x' }),
      await guard.keyboard('keyboard', { chord: 'return' }),
      (await guard.pointer({ bundleId: 'com.apple.TextEdit', point: { x: 1, y: 2 }, kind: 'click', button: 'left', count: 1 })).refusal,
      await guard.heldPress(),
    ];
    for (const r of refusals) {
      assert.deepEqual([r?.outcome, r?.reasonCode, r?.errorKind], ['unsupported', 'save_panel_restricted', 'save_panel_restricted'], failure().message);
      assert.equal(r.message, 'Could not verify which document this window is editing. Take a fresh screenshot and retry.');
    }
    assert.equal(guard.available, true, 'the guard stays on');
    assert.equal(await guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', point: { x: 5, y: 6 }, action: { kind: 'type', text: 'x' } }), null);
    assert.equal(await guard.app({ windowId: 7, bundleId: 'com.apple.TextEdit', point: { x: 5, y: 6 }, action: { kind: 'click', button: 'left', count: 1 } }), null);
    assert.equal(guard.available, true, 'still on after app_*');
    // Still on for the next call: a save sheet is judged again once the probe answers.
    fail = false;
    assert.equal((await guard.keyboard('keyboard', { typedText: '.zshrc' }))?.reasonCode, undefined, 'a plain window lets it through');
    assert.equal(guard.available, true);
  }
});

// ── The service and the tools ──
const TEXTEDIT = 'com.apple.TextEdit';
function serviceWith(probe) {
  const calls = [];
  const native = { calls, async call(method, params = {}) {
    calls.push([method, params]);
    switch (method) {
      case 'probe': return { screenLocked: false, secureInput: false, secondsSinceUserInput: 999 };
      case 'listDisplays': return { displays: [{ displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, pixelWidth: 2940, pixelHeight: 1912, isMain: true, name: 'Main' }] };
      case 'frontmostApp': return { pid: 42, bundleId: TEXTEDIT };
      case 'cursorPosition': return { x: 10, y: 10 };
      case 'pointOwner': return { owner: { windowId: 9, pid: 42, bundleId: TEXTEDIT, layer: 0, ownerName: 'TextEdit' } };
      case 'savePanelProbe': return { probe: probe() };
      case 'saveSheetFolderAndParents': return { answer: { names: ['Documents', 'me'] } };
      case 'prepareDisplay': return { hidden: [], activated: null };
      case 'hidKey': case 'hidType': case 'hidClick': case 'hidMove': case 'hidMouseDown': return { outcome: 'ok', delivered: true, typed: 1, total: 1 };
      case 'captureWindow': {
        const [width, height] = scaled(fit(1600, 1000), 1);
        return { dataUrl: 'data:image/jpeg;base64,QUJD', width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 9, bundleId: params.bundleId, bounds: { x: 0, y: 0, width: 800, height: 500 }, jpegQuality: 0.75, elements: [] };
      }
      case 'axType': case 'axClick': case 'axKey': return { outcome: 'ok' };
      default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
    }
  } };
  const fullControl = createFullControl();
  const service = createComputerUse({ native, axHelper: { call: async () => ({ outcome: 'ok' }) }, log: { log() {}, warn() {}, info() {} }, wait: async () => {}, fullControl });
  service.grantsFor('a').grant([{ bundleId: TEXTEDIT, displayName: 'TextEdit' }]);
  service.requestFullControl('a', { approved: true });
  return { service, native };
}

test('service: screen-wide type / key / click / held press refused in a save sheet before anything is posted', async () => {
  const { service, native } = serviceWith(() => saveSheet());
  const typed = await service.displayKeyboard('a', { kind: 'type', text: '.zshrc' });
  assert.deepEqual([typed.outcome, typed.reasonCode, typed.errorKind], ['unsupported', 'save_panel_restricted', 'save_panel_restricted']);
  assert.equal((await service.displayKeyboard('a', { kind: 'key', text: 'cmd+a' })).reasonCode, 'save_panel_restricted');
  assert.equal((await service.displayKeyboard('a', { kind: 'hold_key', text: 'cmd+s', duration: 1 })).reasonCode, 'save_panel_restricted');
  assert.equal((await service.displayPointer('a', { kind: 'right_click', coordinate: [20, 20] })).reasonCode, 'save_panel_restricted');
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_down' })).reasonCode, 'save_panel_restricted');
  assert.equal(native.calls.filter(([m]) => ['hidKey', 'hidType', 'hidClick', 'hidMouseDown', 'hidKeyHold'].includes(m)).length, 0);
  // Allowed: a plain name, then Return with the parents read.
  assert.equal((await service.displayKeyboard('a', { kind: 'type', text: 'notes.txt' })).outcome, 'ok');
  assert.equal((await service.displayKeyboard('a', { kind: 'key', text: 'return' })).outcome, 'ok');
  assert.equal(native.calls.filter(([m]) => m === 'saveSheetFolderAndParents').length, 1);
});

test('service: a repeated key that is not navigation is checked before every press (official gi())', async () => {
  let n = 0;
  const zshrc = pathToFileURL(path.join(os.homedir(), '.zshrc')).href;
  const { service, native } = serviceWith(() => (n++ < 1 ? rawProbe() : rawProbe({ windowDocumentUrl: zshrc })));
  const result = await service.displayKeyboard('a', { kind: 'key', text: 'x', repeat: 3 });
  assert.equal(result.reasonCode, 'save_panel_restricted');
  assert.equal(result.pressed, 1);
  assert.deepEqual(native.calls.filter(([m]) => m === 'hidKey').map(([, p]) => p.repeat), [1]);
  n = 0;
  const nav = serviceWith(() => rawProbe());
  assert.equal((await nav.service.displayKeyboard('a', { kind: 'key', text: 'down', repeat: 3 })).outcome, 'ok');
  assert.deepEqual(nav.native.calls.filter(([m]) => m === 'hidKey').map(([, p]) => p.repeat), [3], 'navigation repeats natively at once');
});

test('service: app_type / app_click on a window with a save sheet go through the official Ut gate', async () => {
  const { service, native } = serviceWith(() => saveSheet());
  await service.appScreenshot('a', { bundleId: TEXTEDIT });
  const typed = await service.appType('a', { bundleId: TEXTEDIT, text: '.zshrc' });
  assert.deepEqual([typed.reasonCode, typed.blocked, typed.windowId], ['save_panel_restricted', true, 9]);
  assert.equal(native.calls.filter(([m]) => m === 'axType').length, 0);
  const clicked = await service.appClick('a', { bundleId: TEXTEDIT, coordinate: [100, 100], count: 2 });
  assert.equal(clicked.reasonCode, 'save_panel_restricted');
  assert.equal((await service.appType('a', { bundleId: TEXTEDIT, text: 'notes.txt' })).outcome, 'ok');
  const probes = native.calls.filter(([m]) => m === 'savePanelProbe').map(([, p]) => p);
  assert.deepEqual(probes[1], { windowId: 9, point: { x: 50, y: 50 } }, 'the click point in global screen points');
});

test('service: a click holding modifiers in a save sheet is refused by the key check of the front gate (official St() in V()), before the hit test', async () => {
  const { service, native } = serviceWith(() => saveSheet({ hitIdentifier: 'OKButton' }));
  const shift = await service.displayPointer('a', { kind: 'left_click', coordinate: [20, 20], text: 'shift' });
  assert.match(shift.message ?? '', /^Key "shift" is not one of the allowed navigation keys while a save sheet is open/);
  assert.equal(native.calls.filter(([m]) => m === 'hidClick' || m === 'pointOwner').length, 0);
  // A plain click on Save: allowed after the folder's parents were read once.
  assert.equal((await service.displayPointer('a', { kind: 'left_click', coordinate: [20, 20] })).outcome, 'ok');
  assert.equal(native.calls.filter(([m]) => m === 'saveSheetFolderAndParents').length, 1);
});

test('service: a failing probe refuses screen-wide type / click before anything is posted; app_* goes on this call (official Ut); the guard stays on for both', async () => {
  let mode = 'throw-coded';
  const { service, native } = serviceWith(() => {
    if (mode === 'throw-coded') throw Object.assign(new Error('probe broke'), { code: 'internal' });
    if (mode === 'throw-plain') throw new Error('no code');
    return saveSheet();
  });
  // Screen-wide first (an app_screenshot takes the app lock, which then refuses the screen-wide tools on its own).
  for (const m of ['throw-coded', 'throw-plain']) {
    mode = m;
    assert.equal((await service.displayKeyboard('a', { kind: 'type', text: 'x' })).reasonCode, 'save_panel_restricted', m);
    assert.equal((await service.displayPointer('a', { kind: 'left_click', coordinate: [20, 20] })).reasonCode, 'save_panel_restricted', m);
  }
  mode = 'sheet';
  assert.equal((await service.displayKeyboard('a', { kind: 'type', text: '.zshrc' })).reasonCode, 'save_panel_restricted', 'the screen-wide guard is still on');
  await service.appScreenshot('a', { bundleId: TEXTEDIT });
  assert.equal(native.calls.filter(([m]) => ['hidKey', 'hidType', 'hidClick', 'hidMouseDown'].includes(m)).length, 0);
  for (const m of ['throw-coded', 'throw-plain']) {
    mode = m;
    assert.equal((await service.appType('a', { bundleId: TEXTEDIT, text: 'x' })).outcome, 'ok', m);
  }
  assert.equal(native.calls.filter(([m]) => m === 'axType').length, 2);
  // The next call still goes through the guard: a save sheet refuses .zshrc.
  mode = 'sheet';
  assert.equal((await service.appType('a', { bundleId: TEXTEDIT, text: '.zshrc' })).reasonCode, 'save_panel_restricted');
  assert.equal((await service.appClick('a', { bundleId: TEXTEDIT, coordinate: [100, 100], count: 2 })).reasonCode, 'save_panel_restricted');
  assert.equal(native.calls.filter(([m]) => m === 'hidType').length, 0);
  assert.equal(native.calls.filter(([m]) => m === 'axType').length, 2, 'nothing more typed');
});
