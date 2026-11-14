import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { THEME_DEFAULT, DEFAULT, normalize, validate, normalizeTheme, validateTheme, isDefaultTheme } from '../electron/prefs/theme.mjs';
import { settingsPatch } from '../electron/preferences.mjs';

const require = createRequire(import.meta.url);
const { createThemeFiles, themeFileName, THEME_FILE_LIMIT } = require('../electron/theme-files.cjs');

test('prefs/theme exports the shared validator contract', () => {
  assert.equal(DEFAULT, THEME_DEFAULT);
  assert.equal(normalize, normalizeTheme);
  assert.equal(validate, validateTheme);
  assert.ok(Object.isFrozen(THEME_DEFAULT));
  assert.deepEqual({ ...THEME_DEFAULT }, { preset: 'default', accent: '', uiFont: '', fontScale: 1, density: 'compact', radiusScale: 1 });
});

test('normalizeTheme is lenient: bad fields fall back, numbers clamp and snap', () => {
  assert.equal(normalizeTheme(undefined), THEME_DEFAULT);
  assert.equal(normalizeTheme([]), THEME_DEFAULT);
  assert.deepEqual({ ...normalizeTheme({ accent: '#4D6BFE', fontScale: 1.07, radiusScale: 9, density: 'roomy', uiFont: ' Inter ', preset: 'x'.repeat(41) }) },
    { preset: 'default', accent: '#4d6bfe', uiFont: 'Inter', fontScale: 1.05, density: 'compact', radiusScale: 2 });
  assert.equal(normalizeTheme({ accent: 'red' }).accent, '');
  assert.equal(normalizeTheme({ uiFont: 'a;b' }).uiFont, '');
  assert.equal(normalizeTheme({ fontScale: 0.1 }).fontScale, 0.85);
  assert.equal(normalizeTheme({ fontScale: NaN }).fontScale, 1);
  assert.equal(normalizeTheme({ radiusScale: 0.6 }).radiusScale, 0.5);
});

test('validateTheme is strict with user-facing messages; null resets', () => {
  assert.equal(validateTheme(null), null);
  assert.throws(() => validateTheme('dark'), /Invalid theme setting/);
  assert.throws(() => validateTheme({ accent: '#12345' }), /accent color like #4d6bfe/);
  assert.throws(() => validateTheme({ accent: 'blue' }), /accent color/);
  assert.throws(() => validateTheme({ uiFont: 'Inter}' }), /font family name/);
  assert.throws(() => validateTheme({ uiFont: 'x'.repeat(121) }), /font family name/);
  assert.throws(() => validateTheme({ uiFont: 'In\nter' }), /font family name/);
  assert.throws(() => validateTheme({ fontScale: 1.3 }), /Font size must be between 0.85 and 1.25/);
  assert.throws(() => validateTheme({ fontScale: '1' }), /Font size/);
  assert.throws(() => validateTheme({ radiusScale: -0.25 }), /Corner radius must be between 0 and 2/);
  assert.throws(() => validateTheme({ density: 'cozy' }), /density/);
  assert.throws(() => validateTheme({ preset: '' }), /preset/);
  assert.deepEqual({ ...validateTheme({ preset: 'grape', accent: '#7C3AED', fontScale: 1.1, radiusScale: 1.5, density: 'comfortable', uiFont: 'PingFang SC', extra: 1 }) },
    { preset: 'grape', accent: '#7c3aed', uiFont: 'PingFang SC', fontScale: 1.1, density: 'comfortable', radiusScale: 1.5 });
  assert.equal(validateTheme({ accent: '' }).accent, '');
});

test('isDefaultTheme ignores the informational preset', () => {
  assert.equal(isDefaultTheme(undefined), true);
  assert.equal(isDefaultTheme({ preset: 'custom' }), true);
  assert.equal(isDefaultTheme({ density: 'comfortable' }), false);
  assert.equal(isDefaultTheme({ accent: '#000000' }), false);
});

test('settingsPatch routes customTheme through the validator', () => {
  const saved = settingsPatch({ theme: 'dark' }, { customTheme: { accent: '#ABCDEF', radiusScale: 0 } });
  assert.equal(saved.theme, 'dark');
  assert.deepEqual({ ...saved.customTheme }, { ...THEME_DEFAULT, accent: '#abcdef', radiusScale: 0 });
  assert.equal('customTheme' in settingsPatch(saved, { customTheme: null }), false);
  assert.throws(() => settingsPatch({}, { customTheme: { fontScale: 4 } }), /Font size/);
  assert.equal(settingsPatch({ customTheme: saved.customTheme }, { theme: 'light' }).customTheme, saved.customTheme, 'other patches leave it alone');
});

function fakeDialog(answers) {
  const calls = [];
  const dialog = {
    showOpenDialog: async (...args) => { calls.push(['open', ...args]); return answers.open; },
    showSaveDialog: async (...args) => { calls.push(['save', ...args]); return answers.save; },
  };
  return { dialog, calls };
}

test('theme-files: export writes pretty JSON to the chosen path with a .code-desktop-theme.json default name', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'theme-files-'));
  try {
    const target = path.join(dir, 'out.json');
    const { dialog, calls } = fakeDialog({ save: { canceled: false, filePath: target } });
    const win = { isDestroyed: () => false };
    const files = createThemeFiles({ dialog, getWindow: () => win });
    const theme = { format: 'code-desktop-theme', version: 1, name: 'Grape', accent: '#7c3aed' };
    assert.deepEqual(await files.run({ op: 'export', theme, name: 'Grape' }), { path: target });
    assert.equal(calls[0][1], win, 'parented to the main window');
    assert.equal(calls[0][2].defaultPath, 'Grape.code-desktop-theme.json');
    assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), theme);
    await assert.rejects(files.run({ op: 'export', theme: { format: 'other' } }), /Invalid theme/);
    const canceled = createThemeFiles({ dialog: fakeDialog({ save: { canceled: true } }).dialog, getWindow: () => null });
    assert.equal(await canceled.run({ op: 'export', theme }), null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('theme-files: import reads ≤256 KB JSON objects; cancel is null; bad input is a user-facing error', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'theme-files-'));
  try {
    const good = path.join(dir, 'mine.code-desktop-theme.json'), bad = path.join(dir, 'bad.json'), big = path.join(dir, 'big.json'), list = path.join(dir, 'list.json');
    await fs.writeFile(good, '﻿' + JSON.stringify({ format: 'code-desktop-theme', version: 1, accent: '#d97757' }));
    await fs.writeFile(bad, '{nope');
    await fs.writeFile(big, JSON.stringify({ pad: 'x'.repeat(THEME_FILE_LIMIT) }));
    await fs.writeFile(list, '[1]');
    const open = file => createThemeFiles({ dialog: fakeDialog({ open: { canceled: false, filePaths: [file] } }).dialog, getWindow: () => undefined });
    assert.deepEqual(await open(good).run({ op: 'import' }), { theme: { format: 'code-desktop-theme', version: 1, accent: '#d97757' }, name: 'mine.code-desktop-theme.json' });
    await assert.rejects(open(bad).run({ op: 'import' }), /valid JSON/);
    await assert.rejects(open(big).run({ op: 'import' }), /too large/);
    await assert.rejects(open(list).run({ op: 'import' }), /theme file/);
    await assert.rejects(open(dir).run({ op: 'import' }), /Choose a theme file/);
    const canceled = createThemeFiles({ dialog: fakeDialog({ open: { canceled: true, filePaths: [] } }).dialog, getWindow: () => undefined });
    assert.equal(await canceled.run({ op: 'import' }), null);
    await assert.rejects(Promise.resolve().then(() => canceled.run({ op: 'delete' })), /Unsupported/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('themeFileName strips path and control characters', () => {
  assert.equal(themeFileName('../a/b:c*'), '..abc.code-desktop-theme.json');
  assert.equal(themeFileName(''), 'theme.code-desktop-theme.json');
  assert.equal(themeFileName('\u0000'), 'theme.code-desktop-theme.json');
});
