import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectCoworkReference } from '../electron/cowork-runtime/reference.mjs';

test('reference discovery is metadata-only, follows rootfs links and never adopts session disks', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-reference-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const entries = ['vm-bundle/vmlinuz', 'vm-bundle/initrd-micro', 'root.img', 'guest-claude',
    'claude-unpacked/node_modules/@ant/claude-swift/js/index.js',
    'claude-unpacked/node_modules/@ant/claude-swift/build/Release/swift_addon.node'];
  for (const name of entries) {
    const file = path.join(root, name); await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, name.endsWith('index.js') ? 'throw Error("must not load native code during inspection");' : 'fixture');
  }
  await fs.symlink('../root.img', path.join(root, 'vm-bundle/rootfs.img'));
  await fs.symlink('/missing/private/session.img', path.join(root, 'vm-bundle/sessiondata.img'));
  const result = await inspectCoworkReference({ root, platform: 'darwin', arch: 'arm64' });
  assert.equal(result.assetsAvailable, true);
  assert.equal(result.assets.rootfs.linked, true);
  assert.equal(result.readyToRun, false);
  assert.equal(Object.hasOwn(result.assets, 'sessiondata'), false);
  assert.deepEqual(result.missing, []);
  await fs.unlink(path.join(root, 'root.img'));
  assert.deepEqual((await inspectCoworkReference({ root })).missing, ['rootfs']);
  assert.equal((await inspectCoworkReference({ root, platform: 'linux', arch: 'arm64' })).supported, false);
});
