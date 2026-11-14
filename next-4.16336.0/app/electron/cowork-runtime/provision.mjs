import fs from 'node:fs/promises';
import { constants, createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { guestSessionName } from './session-paths.mjs';
import { inspectCoworkReference } from './reference.mjs';

const runFile = promisify(execFile);
async function verifySdkPayload(binary, payload) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(binary)) hash.update(chunk);
  if ((await fs.stat(binary)).size !== payload.size || hash.digest('hex') !== payload.sha256)
    throw new Error('Cowork SDK does not match its installed payload checksum.');
}

// Electron's libuv can return ENOSYS for FICLONE_FORCE even on APFS. Use
// macOS clonefile through cp in that case; never hard-link a writable VM image.
export async function cloneRootfs(source, destination, { copy = fs.copyFile, run = runFile, platform = process.platform } = {}) {
  try {
    await copy(source, destination, constants.COPYFILE_FICLONE_FORCE | constants.COPYFILE_EXCL);
  } catch (error) {
    if (platform !== 'darwin' || !['ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(error.code)) throw error;
    await run('/bin/cp', ['-c', '-n', source, destination]);
  }
  const [original, cloned] = await Promise.all([fs.stat(source), fs.lstat(destination)]);
  if (!cloned.isFile() || cloned.nlink !== 1 || cloned.size !== original.size ||
      (cloned.dev === original.dev && cloned.ino === original.ino)) {
    throw new Error('Cowork root image must be a complete, independent copy.');
  }
}

export async function findGuestSdk(root = process.env.OPENCLAUDE_COWORK_SDK_DIR || path.join(os.homedir(), 'Library/Application Support/Claude/claude-code-vm')) {
  const version = (await fs.readFile(path.join(root, '.sdk-version'), 'utf8')).trim();
  if (!/^(?:\d+\.\d+\.\d+(?:-[\w.-]+)?|local)$/.test(version)) throw new Error('Invalid Cowork SDK version marker.');
  const binary = await fs.realpath(path.join(root, version, 'claude'));
  const handle = await fs.open(binary, 'r');
  try {
    const header = Buffer.alloc(20); await handle.read(header, 0, 20, 0);
    if (!header.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70])) || header[4] !== 2 || header[5] !== 1 || header.readUInt16LE(18) !== 183)
      throw new Error('Cowork requires the Linux ARM64 SDK, not the host executable.');
  } finally { await handle.close(); }
  const directory = path.dirname(binary);
  const verified = (await fs.readFile(path.join(directory, '.verified'), 'utf8')).trim();
  const payload = JSON.parse(await fs.readFile(path.join(directory, '.payload'), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(verified) || !/^[a-f0-9]{64}$/.test(payload.sha256) || !Number.isSafeInteger(payload.size) || payload.size <= 0)
    throw new Error('Cowork SDK verification metadata is invalid.');
  await verifySdkPayload(binary, payload);
  return { version, binary, verified, payload };
}

// Provision only when the user starts a Cowork task. Never adopt Claude's
// sessiondata.img, EFI variables, credentials, SDK settings or session history.
export async function provisionCowork({ dataDir, referenceRoot, sdkRoot, inspect = inspectCoworkReference, copy = fs.copyFile } = {}) {
  const reference = await inspect({ root: referenceRoot });
  if (!reference.assetsAvailable) throw new Error(`Cowork runtime unavailable: ${reference.supported ? reference.missing.join(', ') : 'macOS Apple Silicon required'}.`);
  const sdk = await findGuestSdk(sdkRoot);
  const root = path.join(path.resolve(dataDir), 'cowork-runtime');
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  if ((await fs.realpath(root)) !== root) throw new Error('Cowork runtime directory must not be a symbolic link.');
  const bundle = path.join(root, 'claudevm.bundle'), marker = path.join(bundle, 'openclaude-owner.json');
  let owned;
  try { owned = JSON.parse(await fs.readFile(marker, 'utf8')); } catch {}
  if (owned) {
    if (owned.owner !== 'openclaude-cowork-v1' || owned.reference !== reference.root) throw new Error('Cowork VM bundle belongs to another runtime.');
    for (const name of ['vmlinuz', 'initrd-micro', 'rootfs.img']) {
      const file = path.join(bundle, name), stat = await fs.lstat(file);
      if (!stat.isFile() || stat.nlink !== 1) throw new Error(`Cowork bundle contains a linked or invalid ${name}.`);
    }
    for (const name of ['sessiondata.img', 'efivars.fd']) {
      const stat = await fs.lstat(path.join(bundle, name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
      if (stat && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Cowork state disk must be app-owned.');
    }
  } else {
    try { await fs.lstat(bundle); throw new Error('Cowork VM bundle exists without an ownership marker.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const staging = await fs.mkdtemp(path.join(root, '.bundle-'));
    try {
      for (const [key, name] of [['kernel', 'vmlinuz'], ['initrd', 'initrd-micro'], ['rootfs', 'rootfs.img']]) {
        if (key === 'rootfs') await cloneRootfs(reference.assets[key].realPath, path.join(staging, name), { copy });
        else await copy(reference.assets[key].realPath, path.join(staging, name), constants.COPYFILE_EXCL);
      }
      await fs.writeFile(path.join(staging, 'openclaude-owner.json'), JSON.stringify({ owner: 'openclaude-cowork-v1', reference: reference.root, id: randomUUID() }), { mode: 0o600 });
      await fs.rename(staging, bundle);
    } catch (error) { await fs.rm(staging, { recursive: true, force: true }); throw error; }
  }
  const sdkDir = path.join(root, 'sdk'), versionDir = path.join(sdkDir, sdk.version);
  await fs.mkdir(versionDir, { recursive: true, mode: 0o700 });
  if (await fs.realpath(versionDir) !== versionDir) throw new Error('Cowork SDK directory must be app-owned.');
  const binary = path.join(versionDir, 'claude');
  const existing = await fs.lstat(binary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (existing && (!existing.isFile() || existing.nlink !== 1)) throw new Error('Cowork SDK must not be linked.');
  if (!existing) {
    const temp = `${binary}.${randomUUID()}.tmp`;
    try { await copy(sdk.binary, temp, constants.COPYFILE_FICLONE); await fs.chmod(temp, 0o755); await fs.rename(temp, binary); }
    finally { await fs.rm(temp, { force: true }); }
  }
  await verifySdkPayload(binary, sdk.payload);
  // The guest installer requires the publisher's .verified marker and payload
  // metadata. Publish those only after validating our independent binary copy.
  for (const [name, content] of [['.payload', JSON.stringify(sdk.payload)], ['.verified', sdk.verified]]) {
    const target = path.join(versionDir, name);
    const stat = await fs.lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error; });
    if (stat && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Cowork SDK metadata must not be linked.');
    const temp = `${target}.${randomUUID()}.tmp`;
    try { await fs.writeFile(temp, content, {mode: 0o600, flag: 'wx'}); await fs.rename(temp, target); }
    finally { await fs.rm(temp, {force: true}); }
  }
  return { bundle, sdkVersion: sdk.version, sdkStorageSubpath: path.relative('/', sdkDir), referenceRoot: reference.root };
}

export async function guestWorkspace({ dataDir, sessionId, cwd, readOnly = false }) {
  const processName = guestSessionName(sessionId);
  const workspace = await fs.realpath(cwd);
  if (!(await fs.stat(workspace)).isDirectory()) throw new Error('Cowork workspace is not a folder.');
  const state = path.join(path.resolve(dataDir), 'cowork-runtime', 'sessions', sessionId, '.claude');
  await fs.mkdir(state, { recursive: true, mode: 0o700 });
  if (await fs.realpath(state) !== state) throw new Error('Cowork session state must be app-owned.');
  const base = `/sessions/${processName}/mnt`;
  return { processName, cwd: `${base}/work`, configDir: `${base}/.claude`,
    additionalMounts: { work: { path: path.relative('/', workspace), mode: readOnly ? 'ro' : 'rwd' }, '.claude': { path: path.relative('/', state), mode: 'rwd' } } };
}
