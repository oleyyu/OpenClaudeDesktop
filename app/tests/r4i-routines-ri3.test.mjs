// R4i-routines RI3: cleanup and re-check after R4g-routines RTC.
// - Y3-W2 / Y3-W3: shared-100 no longer carries the Ml/Il secret: messages, and the cowork-scheduled lateStartNote
//   (2.42304.0 c6a2ab736-BLMDKiod.js nDcbd3DQ2C / mdtGtRCbfe) renders through the host FormattedMessage adapter.
// - main.jsx section fallback no longer has a routines branch (both modes mount the source pages), and its zh-CN
//   entry plus the orphaned dictation copy in zh-CN/surfaces.mjs are gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = path => readFileSync(join(root, path), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('RI3 Y3-W2: current-chat shared-100 has only Fb, no secret: messages anywhere in current-chat', () => {
  const shared = read('src/generated/current-chat/shared-100-Bs3K3KCN.js');
  assert.match(shared, /export \{ Fb \};/);
  assert.equal(count(shared, 'secret:'), 0);
  for (const file of readdirSync(join(root, 'src/generated/current-chat'))) {
    if (!file.endsWith('.js')) continue;
    assert.equal(count(read(`src/generated/current-chat/${file}`), 'secret:'), 0, file);
  }
});

test('RI3 Y3-W3: lateStartNote goes through the host FormattedMessage over the local catalog', async () => {
  const late = read('src/generated/cowork-scheduled/c6a2ab736-BLMDKiod.mjs');
  assert.equal(count(late, 'import { FormattedMessage as n } from "../../source-routines-shared-adapters.jsx";'), 1);
  assert.equal(count(late, 'nDcbd3DQ2C'), 1);
  assert.equal(count(late, 'mdtGtRCbfe'), 1);
  const adapters = read('src/source-routines-shared-adapters.jsx');
  assert.equal(count(adapters, 'export const FormattedMessage = StartMessage;'), 1);
  const { default: surfaces } = await import(join(root, 'electron/i18n/zh-CN/surfaces.mjs'));
  assert.ok(surfaces['Scheduled tasks set for {minute} can start several minutes late. Pick a time a few minutes earlier to start on time.']);
  assert.ok(surfaces['Routines set for {minute} can start several minutes late. Pick a time a few minutes earlier to start on time.']);
});

test('RI3: main.jsx section fallback has no routines copy; zh-CN entries removed or added', async () => {
  const main = read('src/main.jsx');
  assert.equal(count(main, 'Scheduled tasks aren’t available in OpenClaude Desktop yet.'), 0);
  assert.equal(count(main, "section === 'routines' && mode === 'code' ? <SourceCodeRoutines"), 1);
  assert.equal(count(main, "section === 'routines' && mode !== 'code' ? <SourceRoutines"), 1);
  const { default: app } = await import(join(root, 'electron/i18n/zh-CN/app.mjs'));
  const { default: surfaces } = await import(join(root, 'electron/i18n/zh-CN/surfaces.mjs'));
  assert.equal(app['Scheduled tasks aren’t available in OpenClaude Desktop yet.'], undefined);
  for (const key of ['Voice is not available with this provider', 'Dictate', 'Use voice mode']) assert.equal(surfaces[key], undefined, key);
  assert.equal(surfaces['Scheduled tasks aren’t available right now.'], '定时任务暂时不可用。');
  assert.equal(count(read('src/source-routine-cowork-adapters.jsx'), "t('Scheduled tasks aren’t available right now.')"), 1);
});
