// The Preview start page's dev-server detection model (src/preview-detection-model.mjs, cf580efe9 gr / fr / dr / Xr).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADD_SERVER_ERRORS, CANDIDATE_PROBLEMS, FRAMEWORK_LABELS, addServerErrorText, candidateCommand, candidateRow, detectedCandidates,
  detectionActive, detectionKey, serverTriggerVisible, shouldHandOffFocus,
} from '../src/preview-detection-model.mjs';

const ok = { name: 'dev', runtimeExecutable: 'pnpm', runtimeArgs: ['run', 'dev'], port: 5173, framework: 'vite', validation: { status: 'ok' } };
const blocked = { name: 'start', runtimeExecutable: 'bun', runtimeArgs: ['run', 'start'], port: 3000, framework: 'unknown', validation: { status: 'blocked', reason: 'runner-not-allowed' } };

test('sr / ir / ar: the reference framework captions and messages', () => {
  assert.deepEqual(FRAMEWORK_LABELS, { next: 'Next.js', vite: 'Vite', nuxt: 'Nuxt', astro: 'Astro', svelte: 'SvelteKit', angular: 'Angular', remix: 'Remix', gatsby: 'Gatsby' });
  assert.deepEqual(Object.keys(CANDIDATE_PROBLEMS), ['shell-metachar', 'runner-not-allowed', 'port-out-of-range']);
  assert.deepEqual(Object.keys(ADD_SERVER_ERRORS), ['name-exists', 'write-failed']);
});

test('dr: a row shows framework · port, the command, and the reason only when blocked', () => {
  assert.equal(candidateCommand(ok), 'pnpm run dev');
  assert.deepEqual(candidateRow(ok), { blocked: false, framework: 'Vite', port: 5173, command: 'pnpm run dev', problem: null });
  assert.deepEqual(candidateRow(blocked), { blocked: true, framework: null, port: 3000, command: 'bun run start', problem: 'Runner isn’t a recognized package manager' });
  assert.equal(candidateRow({ ...blocked, validation: { status: 'blocked', reason: 'other' } }).problem, null, 'an unknown reason shows no text');
  assert.equal(candidateRow({ ...ok, validation: undefined }).blocked, true);
});

test('detectedCandidates keeps well-formed candidates only', () => {
  assert.deepEqual(detectedCandidates(null), []);
  assert.deepEqual(detectedCandidates({ candidates: [ok] }), [], 'the old {candidates} shape is not a list');
  assert.deepEqual(detectedCandidates([ok, null, { name: 'x' }, blocked]), [ok, blocked]);
});

test('ar: a save error reads its message, anything unknown reads write-failed', () => {
  assert.equal(addServerErrorText('name-exists'), 'A server with this name already exists in .claude/launch.json.');
  assert.equal(addServerErrorText('script-not-found'), 'Couldn’t save this configuration. Try again.');
  assert.equal(addServerErrorText(undefined), 'Couldn’t save this configuration. Try again.');
  assert.equal(addServerErrorText('toString'), 'Couldn’t save this configuration. Try again.');
});

test('fr N: detection replaces the prompt once it has candidates or a save error', () => {
  assert.equal(detectionActive({ candidates: null, addError: null }), false, 'still scanning');
  assert.equal(detectionActive({ candidates: [], addError: null }), false, 'nothing found, or Back to browsing');
  assert.equal(detectionActive({ candidates: [ok], addError: null }), true);
  assert.equal(detectionActive({ candidates: [], addError: 'write-failed' }), true);
  assert.notEqual(detectionKey('a', '/x'), detectionKey('b', '/x'));
  assert.notEqual(detectionKey('a', '/x'), detectionKey('a', '/y'));
});

test('Xr xt: the Dev servers trigger needs a row or Add server; focus hands off only when it vanishes from under focus', () => {
  assert.equal(serverTriggerVisible({ rows: [], canAddServer: false }), false);
  assert.equal(serverTriggerVisible({ rows: undefined, canAddServer: false }), false);
  assert.equal(serverTriggerVisible({ rows: [{ name: 'web' }], canAddServer: false }), true);
  assert.equal(serverTriggerVisible({ rows: [], canAddServer: true }), true);
  assert.equal(shouldHandOffFocus({ hadTrigger: true, hasTrigger: false, activeIsBody: true }), true);
  assert.equal(shouldHandOffFocus({ hadTrigger: true, hasTrigger: false, activeIsBody: false }), false, 'focus elsewhere stays');
  assert.equal(shouldHandOffFocus({ hadTrigger: false, hasTrigger: false, activeIsBody: true }), false);
  assert.equal(shouldHandOffFocus({ hadTrigger: true, hasTrigger: true, activeIsBody: true }), false);
});
