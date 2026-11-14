import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

export const defaultCoworkReference = () => process.env.OPENCLAUDE_COWORK_REF || path.join(os.homedir(), 'cowork-ref');
const files = {
  kernel: 'vm-bundle/vmlinuz',
  initrd: 'vm-bundle/initrd-micro',
  rootfs: 'vm-bundle/rootfs.img',
  guestShim: 'guest-claude',
  nativeEntry: 'claude-unpacked/node_modules/@ant/claude-swift/js/index.js',
  nativeImage: 'claude-unpacked/node_modules/@ant/claude-swift/build/Release/swift_addon.node',
};

// Read-only discovery. Do not require the addon, boot a VM, follow session-data
// into Claude's live instance, scan credentials, or read session logs here.
export async function inspectCoworkReference({ root = defaultCoworkReference(), platform = process.platform, arch = process.arch } = {}) {
  const base = path.resolve(root), assets = {}, missing = [];
  for (const [key, relative] of Object.entries(files)) {
    const file = path.join(base, relative);
    try {
      const realPath = await fs.realpath(file), stat = await fs.stat(realPath);
      if (!stat.isFile() || stat.size === 0) throw new Error('Not a nonempty regular file');
      assets[key] = { path: file, realPath, bytes: stat.size, linked: realPath !== file };
    } catch { missing.push(key); }
  }
  const supported = platform === 'darwin' && arch === 'arm64';
  return {
    root: base, supported, assets, missing, assetsAvailable: supported && missing.length === 0,
    // guest-claude is the Linux coworkd shim, not the model-running Claude SDK.
    // A complete runtime also needs SDK provisioning and an app-owned VM bundle.
    readyToRun: false,
    pending: ['on-demand-vm-provisioning', 'runtime-verification'],
  };
}

// Invoke lazily in the signed app's Electron main process, after provisioning. Importing
// this module or inspecting assets never loads native code.
export async function loadCoworkNative({ root = defaultCoworkReference() } = {}) {
  const reference = await inspectCoworkReference({ root });
  if (!reference.supported) throw new Error('The supplied Cowork runtime requires macOS on Apple Silicon.');
  if (reference.missing.length) throw new Error(`Cowork runtime files are missing: ${reference.missing.join(', ')}.`);
  const require = createRequire(import.meta.url);
  const addon = require(reference.assets.nativeEntry.realPath);
  const vm = addon.vm;
  for (const method of ['startVM', 'stopVM', 'isGuestConnected', 'setEventCallbacks', 'spawn', 'writeStdin', 'kill', 'installSdk']) {
    if (typeof vm?.[method] !== 'function') throw new Error(`Cowork native interface is missing ${method}.`);
  }
  return { vm, events: addon, reference };
}
