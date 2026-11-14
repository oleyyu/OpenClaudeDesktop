import test from 'node:test';
import assert from 'node:assert/strict';
import { deviceDetail, deviceName, expiryMs, pairingTimeLeft, remoteEnabled, remoteStatusLabel } from '../src/remote-control-model.mjs';

test('Remote control status, pairing countdown and device rows', () => {
  assert.equal(remoteStatusLabel('connected'), 'On');
  assert.equal(remoteStatusLabel('errored'), 'Couldn’t connect');
  assert.equal(remoteStatusLabel('nope'), 'Off');
  assert.equal(remoteEnabled('disabled'), false);
  assert.equal(remoteEnabled('connecting'), true);
  assert.equal(expiryMs(1700000000), 1700000000000, 'seconds');
  assert.equal(expiryMs(1700000000000), 1700000000000, 'milliseconds');
  assert.equal(pairingTimeLeft(1000 + 125, 1000 * 1000), '2:05');
  assert.equal(pairingTimeLeft(999, 1000 * 1000), null, 'expired');
  assert.equal(deviceName({ displayName: ' Pat’s iPhone ' }), 'Pat’s iPhone');
  assert.equal(deviceName({ deviceModel: 'iPhone16,2' }), 'iPhone16,2');
  assert.equal(deviceName({}), 'Device');
  const now = 1700000000000;
  assert.equal(deviceDetail({ platform: 'iOS', osVersion: '19.1', appVersion: '1.2', lastSeenAt: (now - 5 * 60000) / 1000 }, 'en-US', now), 'iOS 19.1 · App 1.2 · Last seen 5 min ago');
  assert.equal(deviceDetail({ lastSeenAt: now }, 'en-US', now), 'Last seen just now');
});
