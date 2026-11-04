const fs = require('node:fs/promises');
const path = require('node:path');
const { constants } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { scopedPath } = require('./files.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (root, file) => file !== root && file.startsWith(root + path.sep);
const writes = new Map();
// W14-code r4 r4pa-c08: 3.6556.2 asar index.chunk-DNPOm2Zc.js `HOOK_MANAGER_PACKAGE_JSON_KEYS=["lint-staged","husky",
// "commitlint","pre-commit","precommit","gitHooks","nano-staged"]` / parsePackageJsonObject / isHookManagerPackageJsonKeyChange:
// a save to package.json that changes any Git-hook tool key (compared as JSON, absent ≠ present) is refused with
// {status: Denied, deniedReason: "hook_manager_package_key"} before the baseline check; unparsable new text is not refused.
const HOOK_MANAGER_PACKAGE_JSON_KEYS = ['lint-staged', 'husky', 'commitlint', 'pre-commit', 'precommit', 'gitHooks', 'nano-staged'];
function parsePackageJsonObject(text) {
  if (text === undefined) return undefined;
  try {
    const value = JSON.parse(text.replace(/^\uFEFF/, ''));
    return typeof value === 'object' && value && !Array.isArray(value) ? value : undefined;
  } catch { return undefined; }
}
function isHookManagerPackageJsonKeyChange(previous, next) {
  const after = parsePackageJsonObject(next);
  if (!after) return false;
  const before = parsePackageJsonObject(previous) ?? {};
  return HOOK_MANAGER_PACKAGE_JSON_KEYS.some(key => (key in before ? JSON.stringify(before[key]) : undefined) !== (key in after ? JSON.stringify(after[key]) : undefined));
}

// The viewer's baseline is read as bytes, so replacement decoding can never
// silently make an invalid UTF-8 file writable. Writes compare the on-disk hash.
async function readEditableFile(root, relative) {
  try {
    const target = await scopedPath(root, relative);
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > 1024 * 1024) return null;
    const bytes = await fs.readFile(target);
    if (bytes.includes(0)) return null;
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    return { text, hash: hash(bytes) };
  } catch { return null; }
}
async function writeFile(root, relative, text, expectedHash) {
  if (typeof relative !== 'string' || typeof text !== 'string' || Buffer.byteLength(text) > 1024 * 1024 ||
      !(expectedHash === null || typeof expectedHash === 'string' && /^[a-f0-9]{64}$/.test(expectedHash))) return { status: 'denied' };
  let realRoot, target;
  try {
    realRoot = await fs.realpath(root);
    const requested = path.resolve(realRoot, relative);
    if (!inside(realRoot, requested)) return { status: 'denied' };
    try { target = await fs.realpath(requested); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Recreating a deleted file is permitted only in an existing in-root parent.
      // A dangling link is never replaced with a new regular file.
      if (await fs.lstat(requested).then(() => true, () => false)) return { status: 'denied' };
      target = path.join(await fs.realpath(path.dirname(requested)), path.basename(requested));
    }
    if (!inside(realRoot, target)) return { status: 'denied' };
  } catch { return { status: 'denied' }; }
  const prior = writes.get(target) ?? Promise.resolve();
  const operation = prior.catch(() => {}).then(async () => {
    let temp;
    try {
      const current = async () => {
        try {
          const stat = await fs.lstat(target);
          if (!stat.isFile() || stat.isSymbolicLink()) return { denied: true };
          const bytes = await fs.readFile(target);
          return { hash: hash(bytes), mode: stat.mode & 0o777, bytes };
        } catch (error) { if (error.code === 'ENOENT') return { hash: null, mode: 0o644 }; throw error; }
      };
      const before = await current();
      if (before.denied) return { status: 'denied' };
      if (path.basename(target).toLowerCase() === 'package.json' &&
          isHookManagerPackageJsonKeyChange(before.bytes === undefined ? undefined : before.bytes.toString('utf8'), text))
        return { status: 'denied', deniedReason: 'hook_manager_package_key' };
      if (before.hash !== expectedHash) return { status: 'conflict', currentHash: before.hash };
      if (before.hash !== null) await fs.access(target, constants.W_OK);
      temp = path.join(path.dirname(target), `.openclaude-${randomUUID()}.tmp`);
      await fs.writeFile(temp, text, { flag: 'wx', mode: before.mode });
      await fs.chmod(temp, before.mode);
      // Recheck after writing the temporary file, then atomically replace. A failed
      // write leaves the original intact; two application saves are serialized.
      if (await fs.realpath(path.dirname(target)) !== path.dirname(target)) return { status: 'denied' };
      const latest = await current();
      if (latest.denied) return { status: 'denied' };
      if (latest.hash !== expectedHash) return { status: 'conflict', currentHash: latest.hash };
      await fs.rename(temp, target);
      return { status: 'saved', hash: hash(Buffer.from(text)), text };
    } catch { return { status: 'failed' }; }
    finally { if (temp) await fs.unlink(temp).catch(() => {}); }
  });
  writes.set(target, operation);
  try { return await operation; } finally { if (writes.get(target) === operation) writes.delete(target); }
}
module.exports = { readEditableFile, writeFile, isHookManagerPackageJsonKeyChange, HOOK_MANAGER_PACKAGE_JSON_KEYS };
