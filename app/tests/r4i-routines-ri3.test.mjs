// R4i-routines RI3: cleanup and re-check after R4g-routines RTC.
// - Y3-W2 / Y3-W3: shared-100 no longer carries the Ml/Il secret: messages, and the cowork-scheduled lateStartNote
//   (c6a2ab736 nDcbd3DQ2C / mdtGtRCbfe; 3.6556.2 c6a2ab736-CY1u33iQ.js, the same ids and copy as 2.42304.0
//   c6a2ab736-BLMDKiod.js) renders through the host FormattedMessage adapter.
// - main.jsx section fallback no longer has a routines branch (both modes mount the source pages), and its zh-CN
//   entry plus the orphaned dictation copy in zh-CN/surfaces.mjs are gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = path => readFileSync(join(root, path), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

// w10-curchat-retire: the 2.31226.0 current-chat graph (and its shared-100) is gone; the 3.6556.2 folders that replaced
// it for the scheduled-task, home, progress, artifact and project surfaces carry no secret: messages either. (The bare
// "secret:" prefix is official code, not a message: cowork-scheduled shared-52 strips such keys with
// n.startsWith("secret:").)
test('RI3 Y3-W2: no secret: messages in the folders that replaced current-chat', () => {
  assert.equal(existsSync(join(root, 'src/generated/current-chat')), false);
  for (const dir of ['cowork-scheduled', 'routines-shared', 'cowork-home', 'cowork-progress', 'artifact-library', 'chat-projects']) {
    const files = readdirSync(join(root, `src/generated/${dir}`)).filter(file => /\.m?js$/.test(file));
    assert.ok(files.length > 0, dir);
    for (const file of files) assert.equal(read(`src/generated/${dir}/${file}`).match(/["'`]secret:[^"'`]/g)?.length ?? 0, 0, `${dir}/${file}`);
  }
});

test('RI3 Y3-W3: lateStartNote goes through the host FormattedMessage over the local catalog', async () => {
  // The cowork-scheduled module is looked up by its stable chunk prefix (the content hash changes per version).
  const manifest = JSON.parse(read('src/generated/cowork-scheduled/manifest.json'));
  const [lateModule] = manifest.modules.filter(entry => entry.source.startsWith('c6a2ab736-'));
  assert.ok(lateModule, 'c6a2ab736 in cowork-scheduled');
  assert.equal(lateModule.referenceVersion ?? manifest.referenceVersion, '3.6556.2');
  const late = read(`src/generated/cowork-scheduled/${lateModule.target}`);
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
