// User bug #3: turning Fast mode (or a speed) on or off in a session must not rewrite the default model for new
// sessions. The speed is still checked against the model the session runs (speedModel), which is never saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { settingsPatch } from '../electron/preferences.mjs';

const catalog = [
  { model: 'fixture', isDefault: true, serviceTiers: [] },
  { model: 'fixture-2', serviceTiers: [{ id: 'priority', name: 'Fast' }] },
];

test('a session speed change is checked against the session model and leaves the default model alone', () => {
  const prefs = { model: 'fixture', speed: 'standard', fastMode: false };
  const on = settingsPatch(prefs, { fastMode: true, speedModel: 'fixture-2' }, catalog);
  assert.deepEqual([on.model, on.speed, on.fastMode, 'speedModel' in on], ['fixture', 'fast', true, false]);
  const named = settingsPatch(prefs, { speed: 'fast', speedModel: 'fixture-2' }, catalog);
  assert.deepEqual([named.model, named.speed], ['fixture', 'fast']);
  assert.deepEqual(settingsPatch(on, { fastMode: false, speedModel: 'fixture-2' }, catalog), { model: 'fixture', speed: 'standard', fastMode: false });
  // Still refused for a session model without the tier, and a bad speedModel is rejected.
  assert.throws(() => settingsPatch(prefs, { fastMode: true, speedModel: 'fixture' }, catalog), /not available/);
  assert.throws(() => settingsPatch(prefs, { fastMode: true, speedModel: 7 }, catalog), /Invalid/);
});

test('the composer’s Fast mode and speed controls do not save the session model as a preference', () => {
  const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  for (const name of ['changeFastMode', 'changeSpeed']) {
    const body = source.slice(source.indexOf(`async function ${name}(`), source.indexOf('}', source.indexOf(`async function ${name}(`) + 200) + 1);
    const patches = [...body.matchAll(/updatePreferences\(\{([^}]*)\}\)/g)].map((m) => m[1]);
    assert.ok(patches.length > 0, `${name} saves a speed`);
    for (const patch of patches) assert.doesNotMatch(patch, /(^|[,{\s])model\s*[,:}]|(^|[,{\s])model\s*$/, `${name} must not send model: {${patch}}`);
  }
});
