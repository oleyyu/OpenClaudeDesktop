const fs = require('node:fs/promises');
const path = require('node:path');
const { constants } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { scopedPath } = require('./files.cjs');
const { pathInside, samePath, renameRetry } = require('./fs-paths.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Strictly inside (not the root itself); a root ending in a separator (D:\\) isn't doubled; Windows: case-insensitive.
const inside = (root, file) => !samePath(root, file) && pathInside(root, file);
const writes = new Map();

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
          return { hash: hash(await fs.readFile(target)), mode: stat.mode & 0o777 };
        } catch (error) { if (error.code === 'ENOENT') return { hash: null, mode: 0o644 }; throw error; }
      };
      const before = await current();
      if (before.denied) return { status: 'denied' };
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
      // Windows: replacing a file an indexer / antivirus / editor holds open fails for a moment (EPERM / EBUSY).
      await renameRetry(temp, target);
      return { status: 'saved', hash: hash(Buffer.from(text)), text };
    } catch { return { status: 'failed' }; }
    finally { if (temp) await fs.unlink(temp).catch(() => {}); }
  });
  writes.set(target, operation);
  try { return await operation; } finally { if (writes.get(target) === operation) writes.delete(target); }
}
module.exports = { readEditableFile, writeFile };
