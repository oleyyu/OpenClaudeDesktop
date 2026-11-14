import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Computer use M3 prerequisite: the native event-source probe (Sources/ComputerUseCore/EventFactory.swift). A failed
// CGEventSource(stateID: .hidSystemState) is a refusal with scgevent_unavailable, never a crash. Runs against the
// built module (npm run build:native); skipped when it has not been built.
const app = path.resolve(import.meta.dirname, '..');
const built = fs.existsSync(path.join(app, 'native/computer-use/build/computer_use.node'));
const probe = (env = {}) => JSON.parse(execFileSync(process.execPath, ['-e',
  'require("./electron/computer-use/native.cjs").createNative().call("probe").then((r) => process.stdout.write(JSON.stringify(r)))'],
{ cwd: app, env: { ...process.env, ...env }, encoding: 'utf8' }));

test('probe reports a usable HID event source', { skip: !built && 'native module not built (npm run build:native)' }, () => {
  const result = probe();
  assert.equal(result.eventSource, true);
  assert.equal('eventSourceError' in result, false);
});

test('a source that cannot be created is reported as scgevent_unavailable, and the process survives', { skip: !built && 'native module not built (npm run build:native)' }, () => {
  const result = probe({ CU_TEST_FAIL_EVENT_SOURCE: '1' });
  assert.equal(result.eventSource, false);
  assert.equal(result.eventSourceError, 'scgevent_unavailable');
  // The rest of the probe still answers.
  assert.equal(typeof result.secureInput, 'boolean');
  assert.equal(typeof result.screenLocked, 'boolean');
});
