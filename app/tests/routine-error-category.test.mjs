// R4g-routines RT2: electron/routine-error-category.mjs — routine launch failures → the official
// [ccdErrorCategory:<category>] tag (2.42304.0 asar index.chunk-DBPLojse.js Je/Ze, ion-dist shared-52 xx/kx, shared-14
// category table). Pure: no process, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ERROR_CATEGORY_PATTERN, HOST_ROUTINE_ERROR_CATEGORIES, WITHHELD_ROUTINE_ERROR_CATEGORIES, isHostRoutineErrorCategory,
  stripErrorCategoryTags, readErrorCategory, withErrorCategory, classifyFolderError, classifyRpcError, classifyWorktreeError,
  tagRoutineLaunchError,
} from '../electron/routine-error-category.mjs';
import { turnErrorCategory } from '../src/turn-error-model.mjs';

const REF = new URL('../../reference/installed-2.42304.0-20261017/', import.meta.url);
const read = (rel) => { try { return fs.readFileSync(new URL(rel, REF), 'utf8'); } catch { return null; } };
const count = (text, needle) => text.split(needle).length - 1;

test('the tag is appended at the very end, once, and the message stays non-enumerable', () => {
  const error = new Error('Folder not found: /x');
  assert.equal(withErrorCategory(error, 'cwd_not_found'), error);
  assert.equal(error.message, 'Folder not found: /x [ccdErrorCategory:cwd_not_found]');
  assert.equal(ERROR_CATEGORY_PATTERN.exec(error.message)[1], 'cwd_not_found');
  assert.equal(Object.keys(error).includes('message'), false);
  withErrorCategory(error, 'network_error');
  assert.equal(error.message, 'Folder not found: /x [ccdErrorCategory:cwd_not_found]', 'tagged once (DBPLojse Ue WeakSet)');
  const retag = new Error('git said no [ccdErrorCategory:old_one]  ');
  assert.equal(withErrorCategory(retag, 'git_isolation_failed').message, 'git said no [ccdErrorCategory:git_isolation_failed]', 'earlier tags are stripped first');
  assert.equal(withErrorCategory('plain text', 'disk_full').message, 'plain text [ccdErrorCategory:disk_full]', 'a non-Error becomes an Error');
});

test('withheld and unknown categories leave the error untouched', () => {
  for (const category of [...WITHHELD_ROUTINE_ERROR_CATEGORIES, 'remote_spawn_failed', 'not_a_category', undefined, null]) {
    const error = new Error('Something failed.');
    assert.equal(withErrorCategory(error, category).message, 'Something failed.', String(category));
    assert.equal(isHostRoutineErrorCategory(category), false);
  }
});

test('stripErrorCategoryTags follows Je: only well-formed trailing tags go', () => {
  assert.equal(stripErrorCategoryTags('a [sshFailureReason:network] [ccdErrorCategory:network_error]'), 'a');
  assert.equal(stripErrorCategoryTags('a [tccFolderKind:Desktop] [ccdErrorCategory:bun_cwd_eperm]'), 'a');
  assert.equal(stripErrorCategoryTags('a [ccdErrorCategory:Bad-Value]'), 'a [ccdErrorCategory:Bad-Value]');
  assert.equal(stripErrorCategoryTags('see [docs]'), 'see [docs]');
  assert.equal(readErrorCategory('x [ccdErrorCategory:not_git_repo]'), 'not_git_repo');
  assert.equal(readErrorCategory('x [ccdErrorCategory:not_git_repo] trailing'), undefined);
});

test('folder errors: missing → cwd_not_found; blocked → none', () => {
  assert.equal(classifyFolderError(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })), 'cwd_not_found');
  assert.equal(classifyFolderError(Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' })), 'cwd_not_found');
  assert.equal(classifyFolderError(Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' })), 'filesystem_error');
  assert.equal(classifyFolderError(Object.assign(new Error('EACCES'), { code: 'EACCES' })), null);
  const tagged = tagRoutineLaunchError(Object.assign(new Error('Folder not found: /gone'), { code: 'ENOENT' }), { stage: 'folder' });
  assert.equal(tagged.message, 'Folder not found: /gone [ccdErrorCategory:cwd_not_found]');
});

test('core RPC failures classify through the host turn-error model; others stay untagged', () => {
  const rpc = (codexErrorInfo) => ({ message: 'core said no', code: -32000, data: { codexErrorInfo } });
  assert.equal(classifyRpcError(rpc({ httpConnectionFailed: { httpStatusCode: null } }), { turnErrorCategory }), 'network_error');
  assert.equal(classifyRpcError(rpc('serverOverloaded'), { turnErrorCategory }), 'api_overloaded');
  assert.equal(classifyRpcError(rpc('internalServerError'), { turnErrorCategory }), 'api_server_error');
  assert.equal(classifyRpcError(rpc('usageLimitExceeded'), { turnErrorCategory }), 'rate_limit');
  assert.equal(classifyRpcError(rpc('rateLimitExceeded'), { turnErrorCategory }), null, 'request throttling is not "Usage limit reached"');
  assert.equal(classifyRpcError(rpc('unauthorized'), { turnErrorCategory }), null, 'no account sign-in on the host');
  assert.equal(classifyRpcError(rpc('badRequest'), { turnErrorCategory }), null);
  assert.equal(classifyRpcError({ message: 'Switch to kimi to run this scheduled task.' }, { turnErrorCategory }), null);
  assert.equal(classifyRpcError(rpc('serverOverloaded')), null, 'without the turn-error model nothing is guessed');
  assert.equal(classifyRpcError({ message: 'x', codexErrorInfo: 'serverOverloaded' }, { turnErrorCategory }), 'api_overloaded');
  const error = new Error('core said no');
  assert.equal(tagRoutineLaunchError(error, { stage: 'rpc', rpcError: rpc('serverOverloaded'), turnErrorCategory }).message,
    'core said no [ccdErrorCategory:api_overloaded]');
  const untagged = new Error('The core did not create a session.');
  assert.equal(tagRoutineLaunchError(untagged, { stage: 'rpc', turnErrorCategory }).message, 'The core did not create a session.');
});

test('an error that already has a category is passed on as it is', () => {
  const error = new Error('x [ccdErrorCategory:cwd_not_found]');
  error.worktreeStage = 'worktree_add';
  assert.equal(tagRoutineLaunchError(error).message, 'x [ccdErrorCategory:cwd_not_found]');
  assert.equal(classifyWorktreeError(null), null);
  assert.equal(tagRoutineLaunchError(new Error('plain')).message, 'plain', 'no stage, no worktree stage: no category');
});

test('every host category is in the 2.42304.0 renderer table with the same title and retryHelps', (t) => {
  const table = read('ion-dist/assets/v1/shared-14-u0TSV9dR.js');
  const reader = read('ion-dist/assets/v1/shared-52-DGviI8xb.js');
  const main = read('asar/.vite/build/index.chunk-DBPLojse.js');
  if (!table || !reader || !main) { t.skip('2.42304.0 reference not on disk'); return; }
  assert.equal(count(reader, 'xx=/\\[ccdErrorCategory:([a-z_]+)\\]$/'), 1);
  assert.equal(String(ERROR_CATEGORY_PATTERN), '/\\[ccdErrorCategory:([a-z_]+)\\]$/');
  assert.equal(count(main, 'We="[ccdErrorCategory:"'), 1);
  assert.equal(count(main, ' [ccdErrorCategory:${i}]`'), 1);
  // Message tables the titles come from (B/st/sn.generic): each defaultMessage appears in the chunk set.
  const shared3 = read('ion-dist/assets/v1/shared-3-DnHYUZdJ.js') ?? '';
  for (const [category, { title, retryHelps }] of Object.entries(HOST_ROUTINE_ERROR_CATEGORIES)) {
    const at = table.indexOf(`${category}:{title:`);
    assert.ok(at >= 0, `${category} is in the shared-14 table`);
    const entry = table.slice(at, table.indexOf('},', table.indexOf('retryHelps:', at)) + 1);
    assert.match(entry, new RegExp(`retryHelps:${retryHelps ? '!0' : '!1'}`), `${category} retryHelps`);
    const escaped = JSON.stringify(title).slice(1, -1).replace(/[’]/g, '\\u2019');
    assert.ok(table.includes(`defaultMessage:"${escaped}"`) || shared3.includes(`defaultMessage:"${escaped}"`), `${category} title "${title}"`);
  }
  // The withheld ones exist officially too (so leaving them out is a choice, not a typo).
  for (const category of WITHHELD_ROUTINE_ERROR_CATEGORIES.filter((c) => c !== 'unknown'))
    assert.ok(table.includes(`${category}:{title:`), category);
});
