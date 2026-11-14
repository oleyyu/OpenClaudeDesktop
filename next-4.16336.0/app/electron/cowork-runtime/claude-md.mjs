// w13-close-cowork-ui (E67): the folder instructions file of a Cowork session's folder — the desktop bridge's
// readLocalFile / writeLocalFile that 3.6556.2's Outputs section (c21f11e6d xT "Instructions · CLAUDE.md" row, shown
// with `enableAdditionalDirectoriesClaudeMd && _t?.writeLocalFile`) and its editor (kT → LS: `${folderPath}/CLAUDE.md`,
// PS `_t?.readLocalFile?.(e, encodeURIComponent(t))` → `i?.content ?? ""`, FS `await _t?.writeLocalFile?.(e,
// encodeURIComponent(t), n)` truthy on success) call. Local (E59), and only inside the session's own folders (E60):
//   - the file is a CLAUDE.md, by an absolute normal path;
//   - its folder is (inside) one the session may write: a connected-core Cowork session's granted folders with their
//     protected insides carved out (folder-policy.mjs sessionWritableFolders), or a Cowork VM session's folder; judged by
//     real path, and never a protected location (folder-policy.mjs carvedRoot);
//   - the file itself is opened without following a symbolic link and without waiting on a FIFO / device (O_NONBLOCK),
//     and is a plain file with a single link — a hard link to a file outside the folder is neither read nor written
//     through (E77, the E60 hardening) — or absent: read gives "".
import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { carvedRoot, sessionWritableFolders } from './folder-policy.mjs';

export const CLAUDE_MD = 'CLAUDE.md';
// A folder instructions file is a short document; anything larger is refused rather than loaded into the editor.
export const CLAUDE_MD_LIMIT = 1024 * 1024;
const MESSAGE = 'This file can’t be opened here.';

const refuse = () => { throw new Error(MESSAGE); };
const inside = (dir, root) => dir === root || dir.startsWith(root.endsWith(nodePath.sep) ? root : root + nodePath.sep);

/**
 * The checked CLAUDE.md path of a request, or a thrown refusal. meta: the session's sessionMetadata (connected core);
 * vmFolder: the Cowork VM session's folder, or null.
 */
export async function claudeMdTarget(filePath, { meta, vmFolder = null, userData, fs = nodeFs.promises } = {}) {
  if (typeof filePath !== 'string' || !nodePath.isAbsolute(filePath) || nodePath.normalize(filePath) !== filePath
    || nodePath.basename(filePath) !== CLAUDE_MD) refuse();
  let dir;
  try { dir = await fs.realpath(nodePath.dirname(filePath)); } catch { refuse(); }
  let roots = [];
  if (typeof vmFolder === 'string' && vmFolder) { try { roots = [await fs.realpath(vmFolder)]; } catch { roots = []; } }
  else roots = await sessionWritableFolders(meta, { userData, fs });
  if (!roots.some(root => inside(dir, root))) refuse();
  if (carvedRoot(dir, { userData })) refuse();
  return nodePath.join(dir, CLAUDE_MD);
}

const NOFOLLOW = nodeFs.constants.O_NOFOLLOW ?? 0;
// O_NONBLOCK: opening a FIFO in the folder returns at once (read) or fails with ENXIO (write, no reader) instead of
// holding a libuv thread until a peer shows up; on a plain file it changes nothing.
const NONBLOCK = nodeFs.constants.O_NONBLOCK ?? 0;
// A plain file of the folder's own: not a FIFO / device / folder, and not a second name of a file elsewhere (nlink 1).
const ownFile = stat => stat.isFile() && stat.nlink === 1;

/** readLocalFile: { content } ("" when the folder has no CLAUDE.md yet). */
export async function readClaudeMd(filePath, options = {}) {
  const fs = options.fs ?? nodeFs.promises, target = await claudeMdTarget(filePath, options);
  let handle;
  try { handle = await fs.open(target, nodeFs.constants.O_RDONLY | NOFOLLOW | NONBLOCK); }
  catch (error) { if (error?.code === 'ENOENT') return { content: '' }; refuse(); }
  try {
    const stat = await handle.stat();
    if (!ownFile(stat) || stat.size > CLAUDE_MD_LIMIT) refuse();
    return { content: await handle.readFile('utf8') };
  } finally { await handle.close(); }
}

/** writeLocalFile: true once the content is saved. */
export async function writeClaudeMd(filePath, content, options = {}) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > CLAUDE_MD_LIMIT) refuse();
  const fs = options.fs ?? nodeFs.promises, target = await claudeMdTarget(filePath, options);
  let handle;
  try { handle = await fs.open(target, nodeFs.constants.O_WRONLY | nodeFs.constants.O_CREAT | NOFOLLOW | NONBLOCK, 0o644); } catch { refuse(); }
  try {
    if (!ownFile(await handle.stat())) refuse();
    await handle.truncate(0);
    await handle.writeFile(content, 'utf8');
    return true;
  } finally { await handle.close(); }
}

/** main.cjs "cowork-claude-md": { threadId, path, content? } → { content } (read) or true (write, with content). */
export function coworkClaudeMd(p, { metadata = () => undefined, vmFolder = () => null, userData, fs } = {}) {
  const threadId = typeof p?.threadId === 'string' ? p.threadId : '';
  const meta = metadata(threadId), folder = vmFolder(threadId);
  if (!folder && meta?.surface !== 'cowork') refuse();
  const options = { meta, vmFolder: folder, userData, fs };
  return p.content === undefined ? readClaudeMd(p.path, options) : writeClaudeMd(p.path, p.content, options);
}
