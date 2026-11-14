import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const built = fs.existsSync(path.join(root, 'native/computer-use/build/computer_use.node'));
const skip = process.platform !== 'darwin' || !built;

test('native drag state machine: actual routing fields, local points, path interpolation, mid-drag lock and deadline cleanup', { skip }, () => {
  // No input is posted and no real screen lock is triggered: the production sequencer uses a deterministic clock
  // and recording poster; EventFactory is separately checked with real CGEvents.
  const output = execFileSync('swift', ['test', '--package-path', path.join(root, 'native/computer-use')], {
    encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024,
  });
  assert.match(output, /Executed \d+ tests, with 0 failures/);
});

const raw = { bundleId: 'com.apple.TextEdit', windowId: 1, pixelScale: 2, grantedBundleIds: ['com.apple.TextEdit'],
  points: [{ winLocalPt: { x: 0, y: 1 }, screenPt: { x: 0, y: 1 } }, { winLocalPt: { x: 10, y: 1 }, screenPt: { x: 10, y: 1 } }] };
const call = (params) => JSON.parse(execFileSync(process.execPath, ['-e',
  `require('./electron/computer-use/native.cjs').createNative().call('drag', ${JSON.stringify(params)})
    .then(result => console.log(JSON.stringify({result})), error => console.log(JSON.stringify({error:error.code})))`],
{ cwd: root, encoding: 'utf8', env: { ...process.env, CU_TEST_FAIL_EVENT_SOURCE: '1' } }));

test('native bridge refuses malformed drag requests and unavailable source before any event', { skip }, () => {
  assert.equal(call(raw).result.reasonCode, 'scgevent_unavailable');
  for (const params of [
    { ...raw, grantedBundleIds: [] }, { ...raw, points: [] }, { ...raw, button: 'wheel' },
    { ...raw, pixelScale: 0 }, { ...raw, pixelScale: true }, { ...raw, windowId: true }, { ...raw, windowId: 0 },
    { ...raw, points: [raw.points[0], { ...raw.points[1], winLocalPt: { x: false, y: 1 } }] },
  ]) assert.equal(call(params).error, 'invalid_params');
});
