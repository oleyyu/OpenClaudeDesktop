import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { cloneRootfs, provisionCowork, guestWorkspace, findGuestSdk } from '../electron/cowork-runtime/provision.mjs';
import { outputSnapshot, changedOutputs } from '../electron/cowork-runtime/deliverables.mjs';

async function fixture(t) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-provision-'));
  const root = await fs.realpath(temp); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dataDir = path.join(root, 'app'), sdkRoot = path.join(root, 'sdk');
  await fs.mkdir(path.join(sdkRoot, '2.1.293'), { recursive: true });
  await fs.writeFile(path.join(sdkRoot, '.sdk-version'), '2.1.293');
  const elf = Buffer.alloc(32); elf.set([127, 69, 76, 70, 2, 1]); elf.writeUInt16LE(183, 18);
  await fs.writeFile(path.join(sdkRoot, '2.1.293/claude'), elf);
  await fs.writeFile(path.join(sdkRoot, '2.1.293/.verified'), 'a'.repeat(64));
  await fs.writeFile(path.join(sdkRoot, '2.1.293/.payload'), JSON.stringify({size:elf.length,sha256:createHash('sha256').update(elf).digest('hex')}));
  const assets = {};
  for (const key of ['kernel', 'initrd', 'rootfs']) { const file = path.join(root, key); await fs.writeFile(file, key); assets[key] = { realPath: file }; }
  const calls = [];
  const options = { dataDir, sdkRoot, inspect: async () => ({ assetsAvailable: true, supported: true, root, assets }),
    copy: async (from, to, flags) => { calls.push({ from, to, flags }); await fs.copyFile(from, to); } };
  return { root, dataDir, sdkRoot, options, calls };
}

test('VM provisioning uses app-owned copies, never adopts a reference state disk, and is idempotent', async t => {
  const f = await fixture(t), first = await provisionCowork(f.options);
  assert.equal(first.sdkVersion, '2.1.293'); assert.equal(first.sdkStorageSubpath.startsWith('/'), false);
  assert.equal(f.calls.length, 4);
  assert.ok(f.calls.every(call => !call.from.includes('sessiondata')));
  assert.equal(await fs.readFile(path.join(f.dataDir,'cowork-runtime/sdk/2.1.293/.verified'),'utf8'),'a'.repeat(64));
  const second = await provisionCowork(f.options); assert.deepEqual(second, first); assert.equal(f.calls.length, 4);
  await fs.symlink(path.join(f.root, 'rootfs'), path.join(first.bundle, 'sessiondata.img'));
  await assert.rejects(provisionCowork(f.options), /state disk must be app-owned/);
});

test('SDK verification metadata cannot bless a modified binary or linked destination marker', async t => {
  const f = await fixture(t);
  await provisionCowork(f.options);
  const marker = path.join(f.dataDir,'cowork-runtime/sdk/2.1.293/.verified');
  await fs.rm(marker); await fs.symlink(path.join(f.sdkRoot,'2.1.293/.verified'),marker);
  await assert.rejects(provisionCowork(f.options),/metadata must not be linked/);
  await fs.appendFile(path.join(f.sdkRoot,'2.1.293/claude'),'modified');
  await assert.rejects(findGuestSdk(f.sdkRoot),/payload checksum/);
});

test('unknown bundles and non-Linux SDKs fail instead of overwriting/adopting them', async t => {
  const f = await fixture(t);
  const bundle = path.join(f.dataDir, 'cowork-runtime', 'claudevm.bundle'); await fs.mkdir(bundle, { recursive: true });
  await assert.rejects(provisionCowork(f.options), /ownership marker/);
  await fs.writeFile(path.join(f.sdkRoot, '2.1.293/claude'), 'not-an-elf');
  await assert.rejects(findGuestSdk(f.sdkRoot), /Linux ARM64/);
  assert.equal(f.calls.length, 0);
});

test('Electron ENOSYS falls back to native macOS cloning of an independent image', { skip: process.platform !== 'darwin' }, async t => {
  const f = await fixture(t);
  const copy = async (from, to, flags) => {
    if (flags & constants.COPYFILE_FICLONE_FORCE) throw Object.assign(new Error('clone unavailable in libuv'), { code: 'ENOSYS' });
    return fs.copyFile(from, to, flags);
  };
  const result = await provisionCowork({ ...f.options, copy });
  const image = path.join(result.bundle, 'rootfs.img');
  assert.equal(await fs.readFile(image, 'utf8'), 'rootfs');
  await fs.writeFile(image, 'changed');
  assert.equal(await fs.readFile(path.join(f.root, 'rootfs'), 'utf8'), 'rootfs');
  assert.equal((await fs.stat(image)).nlink, 1);
});

test('clone fallback never masks access/storage errors or accepts an incomplete image', async t => {
  const f = await fixture(t), source = path.join(f.root, 'rootfs'), target = path.join(f.root, 'copy');
  let nativeCalls = 0;
  for (const code of ['EACCES', 'ENOSPC', 'EEXIST']) {
    await assert.rejects(cloneRootfs(source, target, { platform: 'darwin',
      copy: async () => { throw Object.assign(new Error(code), { code }); },
      run: async () => { nativeCalls++; },
    }), { code });
  }
  assert.equal(nativeCalls, 0);
  await assert.rejects(cloneRootfs(source, target, { platform: 'darwin',
    copy: async () => { throw Object.assign(new Error('ENOSYS'), { code: 'ENOSYS' }); },
    run: async () => fs.writeFile(target, ''),
  }), /complete, independent copy/);
});

test('failed image provisioning removes staging and does not publish an ownership marker', async t => {
  const f = await fixture(t);
  await assert.rejects(provisionCowork({ ...f.options, copy: async (from, to, flags) => {
    if (flags & constants.COPYFILE_FICLONE_FORCE) throw Object.assign(new Error('full'), { code: 'ENOSPC' });
    return fs.copyFile(from, to, flags);
  } }), { code: 'ENOSPC' });
  assert.deepEqual(await fs.readdir(path.join(f.dataDir, 'cowork-runtime')), []);
});

test('guest mappings match source mount names, host-root relative paths and writable modes', async t => {
  const f = await fixture(t); const cwd = path.join(f.root, 'work'); await fs.mkdir(cwd);
  const mount = await guestWorkspace({ dataDir: f.dataDir, cwd, sessionId: 'cw-test' });
  assert.equal(mount.cwd, '/sessions/cw-test/mnt/work');
  assert.deepEqual(mount.additionalMounts.work, { path: path.relative('/', cwd), mode: 'rwd' });
  assert.equal((await guestWorkspace({ dataDir: f.dataDir, cwd, sessionId: 'cw-test', readOnly: true })).additionalMounts.work.mode, 'ro');
  await assert.rejects(guestWorkspace({ dataDir: f.dataDir, cwd, sessionId: '../escape' }), /Invalid/);
});

test('deliverables include actual changed output files and exclude unchanged files and symlinks', async t => {
  const f = await fixture(t), outputs = path.join(f.root, 'outputs'); await fs.mkdir(outputs);
  await fs.writeFile(path.join(outputs, 'old.md'), 'old');
  const baseline = outputSnapshot(f.root);
  await fs.writeFile(path.join(outputs, 'report.md'), 'new');
  await fs.symlink(path.join(f.root, 'rootfs'), path.join(outputs, 'outside'));
  assert.deepEqual(changedOutputs(f.root, baseline), [{ path: path.join(outputs, 'report.md'), title: 'report.md' }]);
});

test('real app UUIDs map to stable Linux accounts while preserving host session storage', async t => {
  const f = await fixture(t), cwd = path.join(f.root, 'work'); await fs.mkdir(cwd);
  const sessionId = 'cw-0c110b8d-163f-451c-9083-77f86ee2ce1f';
  const mount = await guestWorkspace({ dataDir: f.dataDir, cwd, sessionId });
  assert.match(mount.processName, /^[a-z_][a-z0-9_-]{0,31}$/);
  assert.equal(mount.cwd, `/sessions/${mount.processName}/mnt/work`);
  assert.equal(mount.configDir, `/sessions/${mount.processName}/mnt/.claude`);
  assert.equal(mount.additionalMounts['.claude'].path, path.relative('/', path.join(f.dataDir, 'cowork-runtime/sessions', sessionId, '.claude')));
  const resumed = await guestWorkspace({ dataDir: f.dataDir, cwd, sessionId });
  assert.deepEqual(resumed, mount);
  const other = await guestWorkspace({ dataDir: f.dataDir, cwd, sessionId: sessionId.replace(/f$/, 'e') });
  assert.notEqual(other.processName, mount.processName);
  assert.notEqual(other.configDir, mount.configDir);
});
