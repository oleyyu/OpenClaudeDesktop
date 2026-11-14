import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUCTIONS_DEFAULT, normalizeInstructions, validateInstructions, projectInstructionsFor, withProjectInstructions, instructionsProjectList, customSystemPrompt } from '../electron/prefs/instructions.mjs';
import { settingsPatch } from '../electron/preferences.mjs';

test('defaults are frozen and normalize fills every field', () => {
  assert.ok(Object.isFrozen(INSTRUCTIONS_DEFAULT));
  assert.deepEqual(normalizeInstructions(undefined), { enabled: true, global: '', projects: {} });
  assert.deepEqual(normalizeInstructions('junk'), { enabled: true, global: '', projects: {} });
  assert.deepEqual(normalizeInstructions({ enabled: false, global: 'a\r\nb' }), { enabled: false, global: 'a\nb', projects: {} });
});

test('normalize is lenient: caps text, drops bad paths and empty file-only entries', () => {
  const value = normalizeInstructions({ global: 'x'.repeat(20050), projects: {
    'relative/path': { text: 'no' },
    '/a/': { text: 'trailing', useFile: true },
    '/b': { text: '', useFile: true },
    '/c': { text: '', useFile: false },
    '/d': null,
  } });
  assert.equal(value.global.length, 20050, 'no length cap');
  assert.deepEqual(value.projects, { '/a': { text: 'trailing', useFile: true }, '/c': { text: '', useFile: false } });
});

test('validate is strict with user-facing messages; null resets', () => {
  assert.equal(validateInstructions(null), null);
  assert.throws(() => validateInstructions([]), /Invalid custom instructions/);
  assert.throws(() => validateInstructions({ enabled: 'yes' }), /Invalid custom instructions/);
  assert.equal(validateInstructions({ global: 'x'.repeat(200001) }).global.length, 200001, 'no length cap');
  assert.throws(() => validateInstructions({ global: 'a\0b' }), /Invalid global instructions/);
  assert.throws(() => validateInstructions({ projects: { 'rel': { text: 'x' } } }), /absolute folder path/);
  assert.throws(() => validateInstructions({ projects: { ['/' + 'x'.repeat(1024)]: { text: 'x' } } }), /absolute folder path/);
  assert.throws(() => validateInstructions({ projects: { '/a': { useFile: 1 } } }), /Invalid project instructions/);
  const many = Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`/p${i}`, { text: 'x' }]));
  assert.throws(() => validateInstructions({ projects: many }), /up to 64 projects/);
  assert.deepEqual(validateInstructions({ global: 'hi', projects: { '/a': { text: 't' } } }), { enabled: true, global: 'hi', projects: { '/a': { text: 't', useFile: true } } });
});

test('settingsPatch stores, replaces and resets customInstructions', () => {
  const saved = settingsPatch({ theme: 'dark' }, { customInstructions: { global: 'Be brief.' } });
  assert.deepEqual(saved.customInstructions, { enabled: true, global: 'Be brief.', projects: {} });
  assert.equal(saved.theme, 'dark');
  const reset = settingsPatch(saved, { customInstructions: null });
  assert.equal('customInstructions' in reset, false);
  assert.throws(() => settingsPatch(saved, { customInstructions: { global: 5 } }), /Invalid global instructions/);
});

test('project resolution: the longest key equal to cwd or a parent wins', () => {
  const prefs = normalizeInstructions({ projects: { '/w': { text: 'outer' }, '/w/app': { text: 'inner', useFile: false }, '/w/application': { text: 'other' } } });
  assert.deepEqual(projectInstructionsFor(prefs, '/w/app/src'), { root: '/w/app', text: 'inner', useFile: false });
  assert.deepEqual(projectInstructionsFor(prefs, '/w/app'), { root: '/w/app', text: 'inner', useFile: false });
  assert.equal(projectInstructionsFor(prefs, '/w/apple').root, '/w');
  assert.equal(projectInstructionsFor(prefs, '/elsewhere'), null);
  assert.equal(projectInstructionsFor(prefs, undefined), null);
});

test('withProjectInstructions replaces one entry and drops it when empty', () => {
  const base = normalizeInstructions({ global: 'g', projects: { '/a': { text: 'old' } } });
  assert.deepEqual(withProjectInstructions(base, '/a', { text: 'new', useFile: false }).projects, { '/a': { text: 'new', useFile: false } });
  assert.deepEqual(withProjectInstructions(base, '/a', { text: '', useFile: true }).projects, {});
  assert.deepEqual(withProjectInstructions(base, '/b', { text: 'b' }).projects, { '/a': { text: 'old', useFile: true }, '/b': { text: 'b', useFile: true } });
  assert.equal(withProjectInstructions(base, '/b', { text: 'b' }).global, 'g');
});

test('project list: cwd first, unique session folders, at most 20', () => {
  const meta = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`t${i}`, { cwd: `/p${i % 25}` }]));
  meta.bad = { cwd: 'relative' };
  const list = instructionsProjectList('/p3', meta);
  assert.equal(list[0], '/p3');
  assert.equal(list.length, 20);
  assert.equal(new Set(list).size, 20);
  assert.deepEqual(instructionsProjectList(undefined, null), []);
});

test('customSystemPrompt: the trimmed global text when on, else null (built-in prompt)', () => {
  assert.equal(customSystemPrompt({ global: "  You are Captain Whale. Always start replies with 'Arrr'.\n" }), "You are Captain Whale. Always start replies with 'Arrr'.");
  assert.equal(customSystemPrompt({ global: 'x'.repeat(250000) }).length, 250000, 'never capped');
  assert.equal(customSystemPrompt({ global: '   \n' }), null);
  assert.equal(customSystemPrompt({ enabled: false, global: 'G' }), null);
  assert.equal(customSystemPrompt(undefined), null);
  const saved = settingsPatch({}, { customInstructions: { global: 'Whole prompt {{model}} {{cwd}}' } });
  assert.equal(customSystemPrompt(saved.customInstructions), 'Whole prompt {{model}} {{cwd}}', 'references are stored as written');
});
