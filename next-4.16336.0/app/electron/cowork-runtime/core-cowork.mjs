// w13-coworkfn-engine (research/w13-coworkfn.md §3, cwf-04/05/06/08): a Cowork session on the connected core (the
// official 3P host loop, engine-policy.mjs LOCAL_CORE_ENGINE).
//
// Storage (O-6/O-7, index.chunk-Dl8NPgw7.js sessionDirPaths `outputsDir: (0, W.join)(e, "outputs")`, `hostProcessCwd`
// "host-cwd", ".claude"): every session gets <userData>/cowork-sessions/<storageId>/{outputs,host-cwd,.claude}, owned by
// the app (0700, no symbolic link anywhere on the way, checked with realpath like provision.mjs guestWorkspace). The
// core's thread runs in host-cwd; the folders the user connected are its other writable roots and are listed in the
// system prompt (surface-policy.mjs coworkInstructions).
//
// decorateCoworkStart / decorateCoworkTurn change the core request in main.cjs requestRpc (thread/start of a Cowork
// session, then each turn/start: the folders may grow between turns, w13-coworkfn-folders). A workspace-write sandbox
// gets exactly host-cwd, outputs and the connected folders; a Codex permission profile that replaced it gives way to
// that sandbox (Cowork's boundary is the folder grant, not the Code profile); read-only and Bypass stay as asked
// (approvals: w13-coworkfn-approvals). On a core with no command sandbox a Cowork session only asks
// (approval-policy.mjs clampCoworkRequest, main.cjs requestRpc); on a sandboxed core a Bypass request is still checked
// like any other (main.cjs validateBypassRequest).
//
// w13-close-main-process: keepCoworkPrompt puts the Cowork prompt back after the user's global instructions replaced
// the developer instructions (instructions-service.cjs, a custom system prompt is the whole prompt), as the official 3P
// session keeps its recorded system prompt (O-15); removeCoworkStorage drops a session's storage when its thread/start
// failed or the session was deleted (closeout coworkfn-engine-01/02).
//
// vmRequestRefusal: what a request for a Cowork VM session (cw-…) answers when the VM engine isn't the one in use. The
// session stays readable, renamable, archivable and deletable; continuing it is refused with the official O-5 sentence
// (Dl8 `throw Error("This session can't continue: …")`).
import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { randomUUID } from 'node:crypto';
import { coworkInstructions, surfaceInstructions } from '../surface-policy.mjs';
import { LOCAL_CORE_ENGINE, VM_ENGINE } from './engine-policy.mjs';

export const COWORK_STORAGE_DIR = 'cowork-sessions';
export const STORAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// index.chunk-Dl8NPgw7.js (O-5), word for word.
export const VM_SESSION_REFUSAL = "This session can't continue: it was created to run inside the VM sandbox, which this deployment no longer uses. Start a new session.";
export const HOST_SESSION_REFUSAL = 'This session was created before your organization required the VM sandbox. It cannot be resumed under the current policy. Start a new session.';
// Local: a new session asked for the VM engine where it isn't in use.
export const VM_UNAVAILABLE = "The Cowork VM runtime isn't available on this computer.";
export const STORAGE_NOT_OWNED = 'Cowork session storage must be app-owned.';

// w13-coworkui-settings (cwui-40): Settings › Cowork › Cowork files › Change moves the storage root. The official keeps the
// chosen folder in its app state (index.chunk-jPKPzV-P.js btn: `J_("coworkUserFilesPath",e)`, read back by ytn); here a
// pointer file in the app data folder (which no grant reaches: folder-policy.mjs user_data) holds { root, previous }:
// root is the canonical folder the files were copied to, previous the roots they were copied from, whose files stay
// ("Your existing files will remain in {previousLocation}") and stay protected like the current root.
export const COWORK_FILES_POINTER = 'cowork-files-root.json';
const usableRoot = value => typeof value === 'string' && value && !value.includes('\0') && nodePath.isAbsolute(value);
/** The pointer's { root, previous } (read synchronously, as each root lookup does), or null without a usable one. */
export function readCoworkFilesPointer(userData, { fs = nodeFs } = {}) {
  try {
    const value = JSON.parse(fs.readFileSync(nodePath.join(nodePath.resolve(userData), COWORK_FILES_POINTER), 'utf8'));
    if (!usableRoot(value?.root)) return null;
    return { root: nodePath.resolve(value.root), previous: (Array.isArray(value.previous) ? value.previous : []).filter(usableRoot).map(dir => nodePath.resolve(dir)) };
  } catch { return null; }
}
/** The default root, <userData>/cowork-sessions. */
export const defaultCoworkStorageRoot = userData => nodePath.join(nodePath.resolve(userData), COWORK_STORAGE_DIR);
export const coworkStorageRoot = userData => readCoworkFilesPointer(userData)?.root ?? defaultCoworkStorageRoot(userData);
/** Every root Cowork's storage has had: the current one, the default one and the ones files were copied from. */
export function coworkStorageRoots(userData) {
  const pointer = readCoworkFilesPointer(userData);
  return [...new Set([pointer?.root ?? defaultCoworkStorageRoot(userData), defaultCoworkStorageRoot(userData), ...(pointer?.previous ?? [])])];
}
/**
 * Points the storage at root (the official JJ = btn after the copy): written to a temporary file, then renamed over the
 * pointer, the old root joining previous. Throws when the write fails (the caller retries once, as migrate does).
 */
export async function writeCoworkFilesPointer(userData, root, { fs = nodeFs.promises } = {}) {
  if (!usableRoot(root)) throw new Error('Invalid Cowork files folder.');
  const base = nodePath.resolve(userData), file = nodePath.join(base, COWORK_FILES_POINTER), next = nodePath.resolve(root);
  const current = coworkStorageRoots(userData);
  const previous = current.filter(dir => dir !== next && dir !== defaultCoworkStorageRoot(userData));
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify({ root: next, previous }, null, 2)}\n`, { mode: 0o600 });
  try { await fs.rename(temporary, file); } catch (error) { await fs.rm(temporary, { force: true }).catch(() => {}); throw error; }
  return next;
}

/** The session's storage paths; storageId is the UUID createCoworkStorage made. */
export function coworkStoragePaths(userData, storageId) {
  if (typeof storageId !== 'string' || !STORAGE_ID.test(storageId)) throw new Error('Unknown Cowork session storage.');
  const root = nodePath.join(coworkStorageRoot(userData), storageId);
  return { id: storageId, root, outputs: nodePath.join(root, 'outputs'), hostCwd: nodePath.join(root, 'host-cwd'), claude: nodePath.join(root, '.claude') };
}

/** Whether dir is Cowork's own storage (or inside it): never a folder to grant (O-20, w13-coworkfn-folders). */
export function insideCoworkStorage(dir, userData) {
  const resolved = nodePath.resolve(String(dir));
  return coworkStorageRoots(userData).some(root => resolved === root || resolved.startsWith(root + nodePath.sep));
}

// One app-owned folder: created 0700 when missing, never a link, and its real path is its parent's real path + name.
// keepMode: a folder the user chose for the files (a moved root) keeps its own mode, as the official leaves a custom
// root's (index.chunk-jPKPzV-P.js Etn chmods only the home and fallback roots).
async function ownedDir(dir, parentReal, fs, { fresh = false, keepMode = false } = {}) {
  try { await fs.mkdir(dir, { mode: 0o700 }); }
  catch (error) { if (fresh || error?.code !== 'EEXIST') throw error; }
  const stat = await fs.lstat(dir);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(STORAGE_NOT_OWNED);
  const real = await fs.realpath(dir);
  if (real !== nodePath.join(parentReal, nodePath.basename(dir))) throw new Error(STORAGE_NOT_OWNED);
  if (!keepMode) await fs.chmod(dir, 0o700);
  return real;
}

/** Creates a new session's storage; returns coworkStoragePaths(userData, id). */
export async function createCoworkStorage(userData, { fs = nodeFs.promises, id = randomUUID() } = {}) {
  const paths = coworkStoragePaths(userData, id);
  // The default root sits in the app data folder; a moved root's parent is wherever the user put it.
  const base = coworkStorageRoot(userData), moved = base !== defaultCoworkStorageRoot(userData);
  const parentReal = await fs.realpath(moved ? nodePath.dirname(base) : nodePath.resolve(userData));
  const baseReal = await ownedDir(base, parentReal, fs, { keepMode: moved });
  const rootReal = await ownedDir(paths.root, baseReal, fs, { fresh: true });
  for (const dir of [paths.outputs, paths.hostCwd, paths.claude]) await ownedDir(dir, rootReal, fs, { fresh: true });
  return paths;
}

/**
 * Removes a session's storage (<root>/<storageId>): only a valid storage id, only a real folder directly under the
 * storage root (never a link), recursively. Missing is fine. Returns true when it removed something.
 */
export async function removeCoworkStorage(userData, storageId, { fs = nodeFs.promises } = {}) {
  if (typeof storageId !== 'string' || !STORAGE_ID.test(storageId)) return false;
  const { root } = coworkStoragePaths(userData, storageId);
  const stat = await fs.lstat(root).catch(() => null);
  if (!stat) return false;
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(STORAGE_NOT_OWNED);
  const parentReal = await fs.realpath(nodePath.dirname(root));
  if (await fs.realpath(root) !== nodePath.join(parentReal, storageId)) throw new Error(STORAGE_NOT_OWNED);
  await fs.rm(root, { recursive: true, force: true });
  return true;
}

/** Absolute, distinct folder paths (the folder grant itself is w13-coworkfn-folders' judgeFolder). */
export const coworkFolders = folders => [...new Set((Array.isArray(folders) ? folders : [])
  .filter(folder => typeof folder === 'string' && folder && !folder.includes('\0') && nodePath.isAbsolute(folder)).map(folder => nodePath.resolve(folder)))];

/** The session's writable roots: its host-cwd, its outputs folder and the connected folders. */
export const coworkWritableRoots = ({ storage, folders = [] }) => [...new Set([storage.hostCwd, storage.outputs, ...coworkFolders(folders)])];

function coworkPrompt(params, storage, folders) {
  const text = coworkInstructions({ outputsDir: storage.outputs, folders });
  const base = surfaceInstructions('cowork'), current = typeof params.developerInstructions === 'string' ? params.developerInstructions : '';
  // The renderer and routine-runner send the base Cowork line (and local-projects.mjs may have added project text).
  params.developerInstructions = current.includes(base) ? current.replace(base, () => text) : [text, current].filter(Boolean).join('\n\n');
}

/**
 * thread/start of a Cowork session on the connected core: cwd = host-cwd, the Cowork system prompt, a workspace-write
 * sandbox. folders: the session's first connected folders (the renderer's chosen folder). Returns { folders }.
 */
export function decorateCoworkStart(params, { storage, folders = [] }) {
  const connected = coworkFolders(folders);
  params.cwd = storage.hostCwd;
  coworkPrompt(params, storage, connected);
  if (params.permissions !== undefined && params.sandbox === undefined) { delete params.permissions; params.sandbox = 'workspace-write'; }
  return { folders: connected };
}

/**
 * After instructions-service decorated a Cowork thread/start: the Cowork prompt (coworkInstructions for this storage and
 * these folders) is in the developer instructions, after whatever the user's instructions put there. Returns params.
 */
export function keepCoworkPrompt(params, { storage, folders = [] }) {
  if (!params || typeof params !== 'object' || !storage?.outputs) return params;
  const text = coworkInstructions({ outputsDir: storage.outputs, folders: coworkFolders(folders) });
  const current = typeof params.developerInstructions === 'string' ? params.developerInstructions : '';
  if (!current.includes(text)) params.developerInstructions = [current, text].filter(Boolean).join('\n\n');
  return params;
}

/** turn/start of a Cowork session on the connected core: cwd = host-cwd and the writable roots recomputed. */
export function decorateCoworkTurn(params, { storage, folders = [], networkAccess = false }) {
  params.cwd = storage.hostCwd;
  const writableRoots = coworkWritableRoots({ storage, folders });
  if (params.permissions !== undefined && params.sandboxPolicy === undefined) {
    delete params.permissions;
    params.sandboxPolicy = { type: 'workspaceWrite', writableRoots, networkAccess: networkAccess === true, excludeTmpdirEnvVar: false, excludeSlashTmp: false };
  } else if (params.sandboxPolicy?.type === 'workspaceWrite') params.sandboxPolicy = { ...params.sandboxPolicy, writableRoots };
  return params;
}

/** The Cowork metadata of a session on the connected core, or null. */
export const coreCoworkMetadata = meta => meta?.surface === 'cowork' && meta.engine === LOCAL_CORE_ENGINE && meta.cowork && typeof meta.cowork === 'object'
  && STORAGE_ID.test(meta.cowork.storage ?? '') ? meta.cowork : null;

/**
 * O-5: whether a session can continue on the engine in use. A VM session off the VM engine gets the first official
 * sentence; a core session under a required VM sandbox (vmRequired, the official requireFullVmSandbox) the second.
 */
export function resumeRefusal(meta, engine, { vmRequired = false } = {}) {
  const sessionEngine = meta?.engine === VM_ENGINE ? VM_ENGINE : meta?.engine === LOCAL_CORE_ENGINE ? LOCAL_CORE_ENGINE : null;
  if (sessionEngine === VM_ENGINE && engine !== VM_ENGINE) return VM_SESSION_REFUSAL;
  if (sessionEngine === LOCAL_CORE_ENGINE && engine === VM_ENGINE && vmRequired) return HOST_SESSION_REFUSAL;
  return null;
}

const VM_CONTINUE = new Set(['thread/start', 'turn/start', 'cowork/rewind']);
/**
 * What a request to the Cowork VM sessions answers instead of running, as { text, values? } for i18n.t, or null.
 * cowork: engine-policy.mjs coworkAvailability's answer (with the engine in use).
 */
export function vmRequestRefusal(method, cowork) {
  if (!VM_CONTINUE.has(method)) return null;
  if (cowork?.status !== 'supported') return cowork?.reasonMessage ?? { text: cowork?.reason ?? VM_UNAVAILABLE };
  if (cowork.engine === VM_ENGINE) return null;
  return { text: method === 'thread/start' ? VM_UNAVAILABLE : resumeRefusal({ engine: VM_ENGINE }, cowork.engine) };
}
