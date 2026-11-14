import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEW_AS_TEXT_LABEL, fileTabReason, fileUnavailableCopy } from '../src/file-unavailable-model.mjs';

// W14-code r4 closeout R4DC-N7: the test-only FILE_UNAVAILABLE_REASONS export is gone; the reasons fileUnavailableCopy answers.
const FILE_UNAVAILABLE_REASONS = ["missing", "missing_outside", "missing_or_outside", "outside_root", "too_large", "unsupported", "load_failed", "read_error", "generic", "binary", "empty"];

// cd2efac6e-CAi4fxTN.js (prettier): To/Un :3602-3740, binary :4604-4612 + Xo :4874-4897, empty :4336-4346.
test('each reason has the exact source title and body', () => {
  const copy = Object.fromEntries(FILE_UNAVAILABLE_REASONS.map((reason) => [reason, fileUnavailableCopy(reason)]));
  assert.deepEqual([copy.missing.title, copy.missing.body], ['Couldn’t find this file', 'It may have been deleted or moved.']);
  assert.deepEqual([copy.outside_root.title, copy.outside_root.body], ['This file is outside the working directory', 'It can’t be opened here, but it may still exist on disk.']);
  assert.deepEqual([copy.too_large.title, copy.too_large.body], ['Preview isn’t available for this file', 'It’s too large to preview here.']);
  assert.deepEqual([copy.read_error.title, copy.read_error.body], ['Couldn’t read this file', 'It may be unreadable, or the session’s connection may have dropped.']);
  assert.deepEqual([copy.binary.title, copy.binary.body, copy.binary.action], ['This file looks like binary data and can’t be previewed as text', null, 'view-as-text']);
  assert.deepEqual([copy.empty.title, copy.empty.body, copy.empty.action], ['This file is empty', null, null]);
  assert.equal(VIEW_AS_TEXT_LABEL, 'View as text anyway');
});

test('error cards are alerts that append the path; binary and empty are plain titles', () => {
  for (const reason of ['missing', 'outside_root', 'too_large', 'read_error']) {
    assert.equal(fileUnavailableCopy(reason).role, 'alert', reason);
    assert.equal(fileUnavailableCopy(reason).showsPath, true, reason);
  }
  for (const reason of ['binary', 'empty']) {
    assert.equal(fileUnavailableCopy(reason).role, undefined, reason);
    assert.equal(fileUnavailableCopy(reason).showsPath, false, reason);
  }
  assert.deepEqual(fileUnavailableCopy('nonsense'), fileUnavailableCopy('generic'), 'cd2efac6e Hd falls back to generic');
});

test('a tab reads as its unavailable reason, empty for an empty body, null otherwise', () => {
  assert.equal(fileTabReason({ path: 'a', unavailable: 'missing' }), 'missing');
  assert.equal(fileTabReason({ path: 'a', unavailable: 'weird' }), 'generic');
  for (const reason of ['missing_outside', 'missing_or_outside', 'unsupported', 'load_failed']) assert.equal(fileTabReason({ path: 'a', unavailable: reason }), reason);
  assert.equal(fileTabReason({ path: 'a', text: '' }), 'empty');
  assert.equal(fileTabReason({ path: 'a', text: 'x' }), null);
  assert.equal(fileTabReason({ path: 'a' }), null, 'still loading');
  assert.equal(fileTabReason(null), null);
});

// B32 (2.31226.0 cd2efac6e readable :5114-5225, :5339-5650; shared-28 Ak).
import { FILE_CARD_LABELS, addFolderFailedMessage, canCreateFileNamed, createFileFailedMessage, fileCardPlan, offeredFolderLabel } from '../src/file-unavailable-model.mjs';

test('B32 labels and messages are the original strings', () => {
  assert.deepEqual({ ...FILE_CARD_LABELS }, { tryAgain: 'Try again', tryingAgain: 'Trying again…', createFile: 'Create file', creatingFile: 'Creating file…',
    addFolder: 'Add folder', addingFolder: 'Adding folder…', showInFinder: 'Show in Finder', revealFailed: 'Couldn’t show this file in its folder.' });
  assert.equal(createFileFailedMessage('a.md'), 'Couldn’t create a.md. You can select Create file again or ask Claude to create it.');
  assert.equal(addFolderFailedMessage('~/x'), 'Couldn’t add ~/x to this session.');
});

test('B32 missing card: Try again always, Create file when writable, nameable and creatable', () => {
  assert.deepEqual(['retry', 'create'].map((key) => fileCardPlan('missing', { path: 'a.md', writable: true, creatable: true })[key]), [true, true]);
  assert.equal(fileCardPlan('missing', { path: 'a.md', writable: false, creatable: true }).create, false, 'Fo: not writable');
  assert.equal(fileCardPlan('missing', { path: 'a.md', writable: true }).create, false, 'Qo unknown');
  assert.equal(fileCardPlan('missing', { path: 'a.zip', writable: true, creatable: true }).create, false, 'Gt: archive');
  const cant = fileCardPlan('missing', { path: 'a.md', writable: true, creatable: false, canAskClaude: true });
  assert.deepEqual([cant.create, cant.body, cant.showsPath], [false, 'It can’t be created from here. Ask Claude to create it.', true]);
  assert.equal(fileCardPlan('missing', { path: 'a.md', writable: true, creatable: false }).body, 'It may have been deleted or moved.', 'wp needs Ld');
  for (const reason of ['outside_root', 'too_large', 'read_error', 'binary']) assert.equal(fileCardPlan(reason).retry, false, reason);
});

test('B32 outside-root card: reveal, and the folder offer with its own title', () => {
  assert.equal(fileCardPlan('outside_root', { canReveal: true }).reveal, true);
  assert.equal(fileCardPlan('outside_root').reveal, false);
  assert.equal(fileCardPlan('too_large', { canReveal: true }).reveal, false);
  const binary = fileCardPlan('binary', { canReveal: true, canViewAsText: true });
  assert.deepEqual([binary.reveal, binary.viewAsText], [true, true]);
  const offer = fileCardPlan('outside_root', { folderOffer: '/Users/me/other', canReveal: true });
  assert.deepEqual([offer.title, offer.body, offer.showsPath, offer.offer, offer.role], ['This file is outside this session’s folders', null, false, '/Users/me/other', 'alert']);
  assert.equal(fileCardPlan('missing', { folderOffer: '/x' }).offer, null);
});

test('B32 helpers: nameable files and the "~" folder label', () => {
  for (const name of ['a.md', 'src/x.ts', 'Makefile', '.env']) assert.equal(canCreateFileNamed(name), true, name);
  for (const name of ['a.docx', 'b.PNG', 'c.mp4', 'd.so.1', 'dir/', '']) assert.equal(canCreateFileNamed(name), false, name);
  assert.equal(offeredFolderLabel('/Users/me/proj', '/Users/me'), '~/proj');
  assert.equal(offeredFolderLabel('/Users/me', '/Users/me'), '/Users/me', 'rp: "~" alone shows the full path');
  assert.equal(offeredFolderLabel('/opt/x', '/Users/me'), '/opt/x');
  assert.equal(offeredFolderLabel('/Users/meme/x', '/Users/me'), '/Users/meme/x');
});

// 3.6556.2 cd2efac6e Hd/Zd: the local reasons that W14 adds, verbatim; Try again on every missing reason (dy), the
// folder offer on the outside reasons (Hv), Create file only on plain missing (by).
test('W14 cd2efac6e Hd reasons: titles, bodies, retry and the folder offer', () => {
  const copy = (reason) => [fileUnavailableCopy(reason).title, fileUnavailableCopy(reason).body, fileUnavailableCopy(reason).role, fileUnavailableCopy(reason).showsPath];
  assert.deepEqual(copy('missing_outside'), ['This file is outside this session’s folders', 'It can’t be opened here, but it may still exist on disk.', 'alert', true]);
  assert.deepEqual(copy('missing_or_outside'), ['Couldn’t find this file', 'It may have been deleted, or it lives outside the working directory.', 'alert', true]);
  assert.deepEqual(copy('unsupported'), ['Preview isn’t available for this file', 'This file can’t be previewed here.', 'alert', true]);
  assert.deepEqual(copy('load_failed'), ['Couldn’t load this file', 'Something went wrong loading it. Try opening it again.', 'alert', true]);
  assert.deepEqual(copy('generic'), ['Couldn’t read this file', 'It may have been deleted or moved, or it lives outside the working directory.', 'alert', true]);
  for (const reason of ['missing_outside', 'missing_or_outside']) {
    const plan = fileCardPlan(reason, { path: 'a.md', writable: true, creatable: true, folderOffer: '/Users/me/other' });
    assert.deepEqual([plan.retry, plan.create, plan.offer], [true, false, '/Users/me/other'], reason);
  }
  for (const reason of ['unsupported', 'load_failed', 'generic']) assert.equal(fileCardPlan(reason, { folderOffer: '/x' }).offer, null, reason);
});
