// w13-coworkfn-folders (research/w13-coworkfn.md §1.3 O-16~O-21/O-23, §3.2; cwf-18/19/20/21): which folders a Cowork
// session on the connected core may use, the trusted folders, and the folder grant that decides its sandbox's writable
// roots. Every folder reaches a session only through judgeFolder (the draft folders of a new session, "Add a folder to
// this session", and later request_cowork_directory in w13-coworkfn-tools); each turn re-checks the recorded ones
// lexically (sessionGrants), so a folder recorded before this policy existed never becomes a writable root.
//
// Official sources (3.6556.2 snapshot asar/.vite/build, raw chunks; nothing executed):
//   - index.chunk-h5ilKUwe.js pickAndValidateMountFolder (`J`/`Le`): the order of checks and their sentences — path
//     doesn't exist, network drive / UNC, not a directory, "Cannot mount Cowork's own session storage directory.",
//     "Cannot mount a folder that is, or is inside, Claude's own application data.", and `Directory "${r.display}" is, or
//     is inside, a protected host location (${a}) and cannot be mounted.`
//   - index.chunk-Dl8NPgw7.js canUseTool for request_cowork_directory: the same refusals said to the model
//     ("That directory is Cowork's internal session storage. …", "… Request a different folder instead.").
//   - index.chunk-jPKPzV-P.js deniedCoworkMountRoot (`$ni`): /System and /System/Volumes (`mri`/`gri`), /.vol … (`ZX`/
//     `hri`), and the home folder's protected subpaths (`vni` credential/persistence dirs incl. ~/.claude, `bni`, `Cni`).
//   - index.chunk-DNPOm2Zc.js `XK` (system locations), `ZK` (parents that are never one folder to hand over: only the
//     folder itself, its subfolders are fine) and `nq` (system folders under another volume's root), used by the
//     official folder classifier `yq`. Taking them here too makes the grant at least as strict as what the app offers.
//   - index.chunk-BtY4LlaK.js LocalAgentModeSessions: addFolderToSession (chat refusal, "Add a folder to this session" /
//     "Select a folder to give Claude access to"), browseAndAddTrustedFolder ("Add a trusted folder" / "Choose a folder
//     to trust", the "This folder can't be added" error box), removeTrustedFolder, isFolderTrusted,
//     setDraftSessionFolders, getDefaultWorkspaceFolders; index.chunk-DWMzDpbf.js trustedFolderConsentDialogCopy and
//     consentDialogButtons (`{ allow: "Trust folder", cancel: "Cancel" }`, the 3P copy: `t.Sq()` is the 3P deployment).
//
// Host differences (written down, not guessed): the network-drive / cloud-sync classification (`t.P1`) needs a volume
// probe this host doesn't have, so a path is local unless pathKind (injectable) says otherwise; Windows UNC prefixes are
// refused lexically. The official managed-config roots (`Rni`, Claude's own config and plugin folders) have no host
// counterpart here.
//
// Protected locations inside a connected folder (review fix, E60): a grant of the home folder or a disk is allowed, as
// in the official app, but its protected insides are carved out (index.chunk-jPKPzV-P.js cri: `carve: iri(forms, r)`, the
// $ni roots inside the grant; `lri` answers "carved", the file-tool guard says `fri`). The core's workspace-write
// sandbox can't exclude a subpath from a writable root, so sessionWritableFolders hands it the grant's subtrees that
// hold no protected location instead (carveGrant): a protected folder or file and the folders above it are never
// writable; everything else in the connected folder is. folderMountSatisfied never counts a carved path, and
// protectedSubpathRefusal is the `fri` sentence for the tool guard (w13-coworkfn-tools / approvals).
// getDefaultWorkspaceFolders answers the folders an administrator marked isDefaultSelected (`uGn`); this host has no
// such policy, so it answers [] like an unmanaged official install; the trusted and recently used folders are 'recent'.
import nodeFs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { randomUUID } from 'node:crypto';
import { coreCoworkMetadata, coworkFolders, coworkStoragePaths, coworkStorageRoots, coworkWritableRoots } from './core-cowork.mjs';

// index.chunk-DNPOm2Zc.js XK, word for word.
export const PROTECTED_HOST_ROOTS = Object.freeze(['/etc', '/private/etc', '/usr', '/bin', '/sbin', '/lib', '/lib64', '/boot', '/dev', '/proc', '/sys', '/run', '/var/run', '/private/var/run', '/var/backups', '/var/spool', '/var/mail', '/var/db', '/private/var/db', '/System', '/Library', '/Applications']);
// index.chunk-DNPOm2Zc.js ZK, word for word (two patterns: a per-user temporary root, a Windows drive's temp folder).
export const PROTECTED_PARENTS = Object.freeze(['/home', '/Users', '/root', '/var/root', '/private/var/root', '/Volumes', '/mnt', '/media', '/net', '/var', '/private/var', '/opt', '/var/log', '/private/var/log', '/var/lib', '/tmp', '/private/tmp', '/var/tmp', '/private/var/tmp', /^\/(?:private\/)?var\/folders\/[^/]+\/[^/]+\/[^/]+$/i, /^\/?[a-z]:\/te?mp$/i]);
// index.chunk-DNPOm2Zc.js nq, word for word: system folders that stay protected under another volume's root.
export const NO_GRANT_ROOTS = Object.freeze(['/etc', '/private/etc', '/usr', '/var/db', '/private/var/db', '/var/backups', '/var/spool', '/var/mail', '/System', '/Library']);
// index.chunk-jPKPzV-P.js hri / gri (darwin_system_ancestor).
export const DARWIN_SYSTEM_INTERNALS = Object.freeze(['/.vol', '/.file', '/.nofollow', '/.resolve']);
export const DARWIN_SYSTEM_ANCESTORS = Object.freeze(['/System/Volumes', '/System']);
// index.chunk-jPKPzV-P.js vni (credential_dir / persistence_dir / claude_config_dir) and bni, under the home folder.
export const HOME_PROTECTED_DIRS = Object.freeze(['.ssh', '.aws', '.gnupg', '.kube', '.docker', '.claude', '.config/gcloud', '.config/gh', 'Library/Keychains', 'Library/LaunchAgents', 'Library/LaunchDaemons', 'Library/Application Support', 'Library/Cookies', '.config/powershell']);
// Local counterpart of vni's claude_config_dir (~/.claude): the connected core's own config and credentials folder
// (Codex's ~/.codex: auth.json, config.toml). Not an official entry; this host's core keeps its secrets there.
export const HOME_CORE_DIRS = Object.freeze(['.codex']);
// index.chunk-jPKPzV-P.js Cni (home_file).
export const HOME_PROTECTED_FILES = Object.freeze(['.zshrc', '.zshenv', '.zprofile', '.zlogin', '.bashrc', '.bash_profile', '.bash_login', '.profile', '.netrc']);
// index.chunk-jPKPzV-P.js oxn: the data volume's firmlinked spelling of a path.
const DATA_VOLUME = '/system/volumes/data/';
// index.chunk-h5ilKUwe.js Pe: control and direction characters a folder path never carries.
const CONTROL = /[\x00-\x1f\x7f-\x9f\u061c\u200b\u200e\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;

// The sentences, as i18n keys ({path}/{root} stand for the official template's values).
export const MESSAGES = Object.freeze({
  // index.chunk-h5ilKUwe.js Ie / Le.
  missing: 'Path "{path}" doesn\'t exist or isn\'t accessible.',
  relative: 'Relative paths are not allowed. Use an absolute path.',
  networkDrive: 'Path "{path}" is on a network drive. Ask the user to add it via the folder picker.',
  unc: 'UNC paths are not allowed.',
  notDirectory: 'Path "{path}" is not a directory.',
  sessionStorage: "Cannot mount Cowork's own session storage directory.",
  userData: "Cannot mount a folder that is, or is inside, Claude's own application data.",
  protected: 'Directory "{path}" is, or is inside, a protected host location ({root}) and cannot be mounted.',
  // index.chunk-Dl8NPgw7.js canUseTool (request_cowork_directory, said to the model).
  sessionStorageTool: "That directory is Cowork's internal session storage. Tool-result files are already readable via the existing rules — read them directly. Other files there (transcripts, session state) are intentionally not accessible. Request a project folder on the user's machine instead.",
  protectedTool: 'Directory "{path}" is, or is inside, a protected host location ({root}) and cannot be mounted. Request a different folder instead.',
  // index.chunk-jPKPzV-P.js fri: a protected location inside a connected folder.
  protectedSubpath: '{path} is inside a protected location (system, credential or Claude-internal data) within a connected folder. It can\'t be listed, read or written from a Cowork session. Nothing else in the connected folder is affected.',
  // index.chunk-BtY4LlaK.js addFolderToSession.
  chatSession: "Folder access isn't available in chat sessions.",
  addTitle: 'Add a folder to this session',
  addMessage: 'Select a folder to give Claude access to',
  // index.chunk-BtY4LlaK.js browseAndAddTrustedFolder / rr / dr / Q.
  trustedTitle: 'Add a trusted folder',
  trustedMessage: 'Choose a folder to trust',
  cantAdd: "This folder can't be added",
  trustedProtected: "That folder is a protected location (or the path is invalid) and can't be a trusted folder.",
  pickRefused: 'It may be a protected location, a network location that can’t be used, outside the folders your administrator allows, or unavailable right now. Choose a different folder, or try again.',
  // index.chunk-DWMzDpbf.js trustedFolderConsentDialogCopy (3P) and consentDialogButtons.
  consentTitle: 'Trusted folder',
  consentMessage: 'Trust this folder on this device?',
  consentHome: 'This is your entire home folder.',
  consentContainsHome: 'This folder contains your entire home folder.',
  consentDisk: 'This is an entire disk.',
  consentScope: 'The Claude app on this device will no longer show its Allow prompt before Claude uses this folder or the folders inside it. This applies to all future sessions that use this device, including scheduled tasks that run while you’re away. Those sessions can read and modify files here. Claude may still ask in the chat before it adds the folder to a session. Files Claude uses leave your device and are processed on your organization’s infrastructure. You can remove the folder in Settings at any time.',
  trustFolder: 'Trust folder',
  cancel: 'Cancel',
  // index.chunk-DWMzDpbf.js routineConsentDialogCopy (r) and consentDialogButtons(!0) (Allow first, Cancel the default),
  // shown by BtY4LlaK grantRoutineFolders for the folders a scheduled task newly gets (w13-close-main-process, E63
  // coworkfn-schedtools-06). `n` is "this scheduled task" or `the scheduled task "${name}"`.
  routineTitle: 'Folder access for a scheduled task',
  routineThisTask: 'this scheduled task',
  routineNamedTask: 'the scheduled task "{name}"',
  routineOneFolder: 'Allow {task} to access this folder on every run?',
  routineFolders: 'Allow {task} to access these {count} folders on every run?',
  routineScope: "Every run of this task — including runs while you're away — will be able to read and modify files here, and run commands that access these folders, until you remove them from the task or delete it. Because the task runs in the cloud, files it uses leave your device and are processed on Anthropic's servers.",
  allow: 'Allow',
  // Local (main.cjs already says it for other Cowork requests).
  unknownSession: 'Unknown Cowork session.',
});

// index.chunk-jPKPzV-P.js zxt (g2): browseAndAddTrustedFolder's answers.
export const TRUST_STATUS = Object.freeze({ added: 'added', alreadyTrusted: 'already_trusted', cancelled: 'cancelled', rejected: 'rejected', unavailable: 'unavailable' });
export const TRUSTED_FOLDERS_FILE = 'cowork-trusted-folders.json';
// index.chunk-BtY4LlaK.js cr: the trusted list keeps its 300 newest folders.
export const TRUSTED_FOLDERS_LIMIT = 300;
// carveGrant: a grant whose protected insides would need more writable subtrees than this gives no writable root at
// all; a folder that holds a protected location deeper than CARVE_DEPTH levels below the grant is left out (fails closed).
export const CARVE_LIMIT = 512;
export const CARVE_DEPTH = 8;

const fill = (text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
const refusal = (kind, text, values) => ({ ok: false, kind, text, values, message: fill(text, values) });

const caseless = platform => platform === 'darwin' || platform === 'win32';
const trimSlash = dir => dir.length > 1 ? dir.replace(/\/+$/, '') : dir;

/** The path as the protected lists see it: absolute, normalized, without the data volume's firmlinked prefix. */
function listForm(dir) {
  const resolved = trimSlash(nodePath.posix.normalize(String(dir).replaceAll('\\', '/')));
  return resolved.toLowerCase().startsWith(DATA_VOLUME) ? resolved.slice(DATA_VOLUME.length - 1) : resolved;
}
const keyOf = (dir, platform) => caseless(platform) ? dir.toLowerCase() : dir;
const sameOrInside = (dir, root, platform) => {
  const a = keyOf(dir, platform), b = keyOf(trimSlash(root), platform);
  return a === b || a.startsWith(b === '/' ? '/' : `${b}/`);
};
const same = (dir, root, platform) => keyOf(dir, platform) === keyOf(trimSlash(root), platform);
// index.chunk-DNPOm2Zc.js tq / $K: another volume's root (/Volumes/<name>, /mnt/<name>, /media/<name>, /media/<user>/<name>).
function volumeOf(dir) {
  const parts = dir.split('/').filter(Boolean);
  const depth = /^volumes$/i.test(parts[0] ?? '') ? 2 : /^mnt$/i.test(parts[0] ?? '') ? 2 : /^media$/i.test(parts[0] ?? '') ? (parts.length > 3 ? 3 : 2) : 0;
  if (!depth || parts.length < depth) return null;
  return { base: `/${parts.slice(0, depth).join('/')}`, rest: `/${parts.slice(depth).join('/')}` };
}
const volumeRest = dir => { const volume = volumeOf(dir); return volume && volume.rest !== '/' ? volume : null; };
const VOLUME_CONTAINERS = Object.freeze(['/Volumes', '/mnt', '/media']);

/**
 * The protected location dir is, or is inside, or null. dir is absolute (canonical when it came through judgeFolder).
 * home: the user's home folder (both its spelling and its real path are checked by the caller passing each).
 */
export function protectedRoot(dir, { home = nodeOs.homedir(), platform = process.platform, parents = true } = {}) {
  if (typeof dir !== 'string' || !dir) return null;
  const form = listForm(dir);
  // deniedCoworkMountRoot ($ni): /System, /System/Volumes (the root it reports is gri's first form), then /.vol ….
  if (DARWIN_SYSTEM_ANCESTORS.some(root => same(form, root, 'darwin'))) return DARWIN_SYSTEM_ANCESTORS[0];
  const internal = DARWIN_SYSTEM_INTERNALS.find(root => sameOrInside(form, root, 'darwin'));
  if (internal) return internal;
  for (const homeDir of [...new Set([home].flat().filter(value => typeof value === 'string' && value))]) {
    const base = listForm(homeDir);
    const sub = [...HOME_PROTECTED_DIRS, ...HOME_CORE_DIRS].map(rel => `${base}/${rel}`).find(root => sameOrInside(form, root, platform));
    if (sub) return sub;
    const file = HOME_PROTECTED_FILES.map(rel => `${base}/${rel}`).find(root => same(form, root, platform));
    if (file) return file;
  }
  // XK: the folder or anything inside it; ZK: the folder itself only (parents false: what a grant's insides carve out,
  // the official $ni roots, has no ZK).
  const host = PROTECTED_HOST_ROOTS.find(root => sameOrInside(form, root, 'darwin'));
  if (host) return host;
  const parent = !parents ? null : PROTECTED_PARENTS.find(root => typeof root === 'string' ? same(form, root, 'darwin') : root.test(form));
  if (parent) return typeof parent === 'string' ? parent : form;
  // nq (anything inside) and ZK (the folder itself) under another volume's root.
  const volume = volumeRest(form);
  if (volume) {
    const nested = NO_GRANT_ROOTS.find(root => sameOrInside(volume.rest, root, 'darwin'))
      ?? (parents ? PROTECTED_PARENTS.find(root => typeof root === 'string' && same(volume.rest, root, 'darwin')) : undefined);
    if (nested) return `${volume.base}${nested}`;
  }
  return null;
}

const insideAny = (dir, roots, platform) => roots.filter(root => typeof root === 'string' && root).some(root => sameOrInside(listForm(dir), listForm(root), platform));

/**
 * What a folder grant check says about one path, without touching the disk: Cowork's session storage, the app's data,
 * a protected location. Returns a refusal or null. sessionStorageDirs: the session's own storage (if any).
 */
export function lexicalRefusal(dir, { userData, sessionStorageDirs = [], home = nodeOs.homedir(), platform = process.platform, mode = 'picker' } = {}) {
  const storage = [...sessionStorageDirs, ...(userData ? coworkStorageRoots(userData) : [])]; // w13-coworkui-settings: every root (a moved one too)
  if (insideAny(dir, storage, platform)) return refusal('session_storage', mode === 'tool' ? MESSAGES.sessionStorageTool : MESSAGES.sessionStorage);
  if (userData && insideAny(dir, [nodePath.resolve(userData)], platform)) return refusal('user_data', MESSAGES.userData);
  const root = protectedRoot(dir, { home, platform });
  if (root) return refusal('protected_path', mode === 'tool' ? MESSAGES.protectedTool : MESSAGES.protected, { path: dir, root });
  return null;
}

const isUnc = (dir, platform) => platform === 'win32' && /^[\\/]{2}/.test(dir);

/**
 * pickAndValidateMountFolder's checks for one folder (O-19/O-20/O-21). Returns { ok: true, canonical } or
 * { ok: false, kind, message, text, values } (text/values for i18n). vouched: the user chose the path in the folder
 * picker (the official allowPickerVouch), which skips the network-drive refusal. mode 'tool': the sentences said to
 * the model by canUseTool (request_cowork_directory).
 */
export async function judgeFolder(dir, { userData, sessionStorageDirs = [], home = nodeOs.homedir(), platform = process.platform, fs = nodeFs.promises,
  pathKind = null, vouched = false, mode = 'picker' } = {}) {
  if (typeof dir !== 'string' || !dir || CONTROL.test(dir)) return refusal('invalid', MESSAGES.missing, { path: String(dir ?? '') });
  if (isUnc(dir, platform)) return refusal('unc', MESSAGES.unc);
  const expanded = dir === '~' || dir.startsWith('~/') ? nodePath.join(home, dir.slice(1)) : dir;
  if (!nodePath.isAbsolute(expanded)) return refusal('invalid', MESSAGES.relative);
  const normal = nodePath.normalize(expanded);
  let canonical;
  try { canonical = await fs.realpath(normal); } catch { return refusal('missing', MESSAGES.missing, { path: normal }); }
  if (CONTROL.test(canonical)) return refusal('invalid', MESSAGES.missing, { path: normal });
  const kind = typeof pathKind === 'function' ? await pathKind(canonical) : 'local';
  if (!vouched && kind && kind !== 'local' && kind !== 'cloud-sync')
    return kind === 'network-drive' ? refusal('network_drive', MESSAGES.networkDrive, { path: normal }) : refusal('unc', MESSAGES.unc);
  const stat = await fs.stat(canonical).catch(() => null);
  if (!stat?.isDirectory()) return stat ? refusal('not_directory', MESSAGES.notDirectory, { path: normal }) : refusal('missing', MESSAGES.missing, { path: normal });
  let homes = [home];
  try { homes = [...new Set([home, await fs.realpath(home)])]; } catch {}
  let userDataReal = userData;
  if (userData) try { userDataReal = await fs.realpath(nodePath.resolve(userData)); } catch {}
  // Le's order: Cowork's session storage, then the app's data, then a protected location; each on both spellings.
  const spellings = [...new Set([normal, canonical])];
  const storage = [...sessionStorageDirs, ...(userData ? [...coworkStorageRoots(userData), ...coworkStorageRoots(userDataReal)] : [])];
  if (spellings.some(candidate => insideAny(candidate, storage, platform))) return refusal('session_storage', mode === 'tool' ? MESSAGES.sessionStorageTool : MESSAGES.sessionStorage);
  if (userData && spellings.some(candidate => insideAny(candidate, [nodePath.resolve(userData), userDataReal], platform))) return refusal('user_data', MESSAGES.userData);
  for (const candidate of spellings) {
    const root = protectedRoot(candidate, { home: homes, platform });
    if (root) return refusal('protected_path', mode === 'tool' ? MESSAGES.protectedTool : MESSAGES.protected, { path: normal, root });
  }
  return { ok: true, canonical };
}

/** index.chunk-BtY4LlaK.js pr: what the consent dialog says about a folder's reach ('disk' | 'home' | 'contains_home' | null). */
export function folderReach(dir, { home = nodeOs.homedir(), platform = process.platform } = {}) {
  const form = listForm(dir);
  if (nodePath.parse(form).root === form) return 'disk';
  const base = listForm(home);
  if (same(base, form, platform)) return 'home';
  return sameOrInside(base, form, platform) ? 'contains_home' : null;
}

// index.chunk-DWMzDpbf.js CONSENT_ALLOW_MIN_DWELL_MS: an Allow pressed sooner than this after the consent opened was not
// read, and counts as Cancel (the same 700 ms as plugin-options.cjs consentDialog's dwelled).
export const CONSENT_ALLOW_MIN_DWELL_MS = 700;

// BtY4LlaK grantRoutineFolders P(): the task name the consent names, without control, format and quote characters,
// trimmed, at most 80 characters (79 and "…").
const CONSENT_NAME_DROP = /[\p{Cc}\p{Cf}\u2028\u2029"\u02BA\u02DD\u02EE\u02F5\u02F6\u05F4\u201C\u201D\u201E\u201F\u2033\u2036\u275D\u275E\u2760\u2E42\u301D\u301E\u301F\u3003\uFF02\u{1F676}-\u{1F678}]/gu;
export function consentTaskName(name) {
  const clean = typeof name === 'string' ? name.replace(CONSENT_NAME_DROP, '').trim() : '';
  if (!clean) return undefined;
  return clean.length > 80 ? `${clean.slice(0, 79).replace(/[\uD800-\uDBFF]$/, '')}…` : clean;
}

/** The scheduled task's folder consent (showMessageBox options): the folders, then the scope; Allow first, Cancel the default. */
export function routineConsentDialog(name, folders, { t = (text, values) => fill(text, values) } = {}) {
  const shown = consentTaskName(name), list = Array.isArray(folders) ? folders : [];
  const task = shown === undefined ? t(MESSAGES.routineThisTask) : t(MESSAGES.routineNamedTask, { name: shown });
  const message = list.length === 1 ? t(MESSAGES.routineOneFolder, { task }) : t(MESSAGES.routineFolders, { task, count: list.length });
  return { type: 'question', buttons: [t(MESSAGES.allow), t(MESSAGES.cancel)], defaultId: 1, cancelId: 1, title: t(MESSAGES.routineTitle), message,
    detail: `${list.join('\n')}\n\n${t(MESSAGES.routineScope)}` };
}

/**
 * local-routines' confirmFolders for main.cjs: asks on the main window ({ name, folders }) → true only for an Allow that
 * was read (CONSENT_ALLOW_MIN_DWELL_MS). No usable window: Cancel (BtY4LlaK "no usable parent window … failing closed").
 */
export function createRoutineFolderConsent({ dialog, window = () => null, t, now = Date.now } = {}) {
  return async ({ name, folders } = {}) => {
    const owner = window?.();
    if (!dialog || !owner || owner.isDestroyed?.()) return false;
    const started = now();
    const answer = await dialog.showMessageBox(owner, routineConsentDialog(name, folders, { t }));
    return answer?.response === 0 && now() - started >= CONSENT_ALLOW_MIN_DWELL_MS;
  };
}

/** The trusted-folder consent dialog (showMessageBox options): Trust folder first, Cancel the default and the cancel. */
export function trustConsentDialog(dir, { home, platform, t = text => text } = {}) {
  const reach = folderReach(dir, { home, platform });
  const prefix = reach === 'home' ? MESSAGES.consentHome : reach === 'contains_home' ? MESSAGES.consentContainsHome : reach === 'disk' ? MESSAGES.consentDisk : null;
  const scope = [prefix && t(prefix), t(MESSAGES.consentScope)].filter(Boolean).join(' ');
  return { type: 'question', buttons: [t(MESSAGES.trustFolder), t(MESSAGES.cancel)], defaultId: 1, cancelId: 1, title: t(MESSAGES.consentTitle), message: t(MESSAGES.consentMessage), detail: `${dir}\n\n${scope}` };
}

/**
 * The trusted folders (O-16), kept in <userData>/cowork-trusted-folders.json ({ version: 1, folders }), 0600, written
 * to a temporary file and renamed; writes are serialized. A trusted folder covers the folders inside it.
 */
export function createTrustedFolders({ file, fs = nodeFs.promises, platform = process.platform, limit = TRUSTED_FOLDERS_LIMIT } = {}) {
  let chain = Promise.resolve();
  const exclusive = work => { const run = chain.then(work, work); chain = run.catch(() => {}); return run; };
  const clean = folders => [...new Set((Array.isArray(folders) ? folders : []).filter(dir => typeof dir === 'string' && dir && !CONTROL.test(dir) && nodePath.isAbsolute(dir)).map(dir => trimSlash(nodePath.normalize(dir))))];
  const read = async () => {
    try { const value = JSON.parse(await fs.readFile(file, 'utf8')); return clean(Array.isArray(value) ? value : value?.folders); }
    catch { return []; }
  };
  const write = async folders => {
    await fs.mkdir(nodePath.dirname(file), { recursive: true, mode: 0o700 });
    const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temp, `${JSON.stringify({ version: 1, folders }, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
      await fs.rename(temp, file);
    } catch (error) { await fs.rm(temp, { force: true }).catch(() => {}); throw error; }
    return folders;
  };
  const index = (folders, dir) => folders.findIndex(entry => same(listForm(entry), listForm(dir), platform));
  return {
    list: read,
    async has(dir) { return index(await read(), dir) !== -1; },
    async covers(dir) { return typeof dir === 'string' && insideAny(dir, await read(), platform); },
    add: dir => exclusive(async () => {
      const folders = await read();
      if (index(folders, dir) !== -1) return { status: TRUST_STATUS.alreadyTrusted, folders };
      return { status: TRUST_STATUS.added, folders: await write([...folders, ...clean([dir])].slice(-limit)) };
    }),
    remove: dir => exclusive(async () => {
      const folders = await read(), kept = folders.filter(entry => !same(listForm(entry), listForm(dir), platform));
      return kept.length === folders.length ? folders : write(kept);
    }),
  };
}

const optionsOf = (options = {}) => ({ userData: options.userData, home: options.home ?? nodeOs.homedir(), platform: options.platform ?? process.platform });

/** A Cowork session's granted folders (meta.cowork.folders), each re-checked lexically. */
export function sessionGrants(meta, options) {
  const opts = optionsOf(options);
  const cowork = coreCoworkMetadata(meta);
  if (!cowork) return [];
  const storage = opts.userData ? [coworkStoragePaths(opts.userData, cowork.storage).root] : [];
  return coworkFolders(cowork.folders).filter(dir => !lexicalRefusal(dir, { ...opts, sessionStorageDirs: storage }));
}

const spellingsOf = values => [...new Set([values].flat().filter(value => typeof value === 'string' && value).map(value => nodePath.resolve(value)))];

/**
 * The protected location a connected folder's insides never hand over that dir is, or is inside, or null: the official
 * carve (jPK cri/iri over the $ni roots): system locations, the home folder's credential/persistence folders and files,
 * system folders on another volume, and the app's own data (Cowork's session storage among it). Lexical; home and
 * userData may each be several spellings (the caller passes their real paths too).
 */
export function carvedRoot(dir, { home = nodeOs.homedir(), userData, platform = process.platform } = {}) {
  if (typeof dir !== 'string' || !dir) return null;
  const form = listForm(dir);
  const data = spellingsOf(userData).find(root => sameOrInside(form, listForm(root), platform));
  return data ?? protectedRoot(form, { home, platform, parents: false });
}

/** Whether a carved location lies strictly inside dir (lexically: one that doesn't exist yet counts, so it can't be made). */
function holdsCarve(dir, { home = nodeOs.homedir(), userData, platform = process.platform } = {}) {
  const form = listForm(dir);
  const below = root => { const value = listForm(root); return !same(value, form, platform) && sameOrInside(value, form, platform); };
  const homeRoots = spellingsOf(home).flatMap(base => [...HOME_PROTECTED_DIRS, ...HOME_CORE_DIRS, ...HOME_PROTECTED_FILES].map(rel => `${listForm(base)}/${rel}`));
  if ([...DARWIN_SYSTEM_INTERNALS, ...PROTECTED_HOST_ROOTS, ...homeRoots, ...spellingsOf(userData)].some(below)) return true;
  // nq under another volume's root: every folder above a volume container or a volume root holds some.
  if (VOLUME_CONTAINERS.some(container => sameOrInside(container, form, 'darwin'))) return true;
  const volume = volumeOf(form);
  return !!volume && NO_GRANT_ROOTS.some(root => !same(root, volume.rest, 'darwin') && sameOrInside(root, volume.rest, 'darwin'));
}

/** The real path of dir, or of its nearest existing ancestor with the rest appended. */
async function realForm(dir, fs) {
  const missing = [];
  for (let at = nodePath.resolve(dir); ; at = nodePath.dirname(at)) {
    try { return nodePath.join(await fs.realpath(at), ...missing.reverse()); }
    catch { if (nodePath.dirname(at) === at) return nodePath.resolve(dir); missing.push(nodePath.basename(at)); }
  }
}

/** The home folder and the app's data, each with its real path, for carvedRoot / carveGrant. */
async function carveContext(options = {}) {
  const fs = options.fs ?? nodeFs.promises, opts = optionsOf(options);
  const real = async value => { try { return [value, await fs.realpath(value)]; } catch { return [value]; } };
  // w13-coworkui-settings: a moved storage root (and the roots files were copied from) is carved like the app's data.
  return { fs, platform: opts.platform, home: spellingsOf(await real(opts.home)), userData: opts.userData ? spellingsOf([...await real(nodePath.resolve(opts.userData)), ...coworkStorageRoots(opts.userData)]) : [] };
}

/**
 * The writable folders one grant gives once its protected insides are carved out: the grant itself when it holds no
 * protected location; otherwise, walking down only through the folders that do, every subfolder that holds none. A
 * protected location, a symbolic link and a plain file directly in such a folder are left out, and so are the folders
 * above the protected locations themselves (and, past CARVE_DEPTH levels, the whole subtree). A grant that resolves
 * elsewhere is judged by its real path; a grant that is, or is inside, a protected location (or that needs more than
 * CARVE_LIMIT subtrees) gives none.
 */
export async function carveGrant(grant, options = {}) {
  const ctx = options.platform && Array.isArray(options.home) && Array.isArray(options.userData) && options.fs ? options : await carveContext(options);
  const { fs } = ctx, limit = options.limit ?? CARVE_LIMIT, depthLimit = options.depth ?? CARVE_DEPTH;
  let start;
  try { start = await fs.realpath(nodePath.resolve(grant)); } catch { return []; }
  if ([grant, start].some(dir => carvedRoot(dir, ctx) || protectedRoot(dir, { home: ctx.home, platform: ctx.platform }))) return [];
  const out = [];
  let overflow = false;
  const walk = async (dir, depth) => {
    if (overflow || carvedRoot(dir, ctx)) return;
    if (!holdsCarve(dir, ctx)) { if (out.push(dir) > limit) overflow = true; return; }
    if (depth >= depthLimit) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      if (entry.isDirectory() && !CONTROL.test(entry.name)) await walk(nodePath.join(dir, entry.name), depth + 1);
  };
  await walk(start, 0);
  return overflow ? [] : out;
}

/**
 * The folders a Cowork session's sandbox may write: each granted folder (sessionGrants) with its protected insides
 * carved out (carveGrant). Async: it reads the folders that hold a protected location. Recomputed every turn.
 */
export async function sessionWritableFolders(meta, options = {}) {
  const grants = sessionGrants(meta, options);
  if (!grants.length) return [];
  const ctx = await carveContext(options), folders = [];
  for (const grant of grants) folders.push(...await carveGrant(grant, { ...ctx, limit: options.limit, depth: options.depth }));
  return coworkFolders(folders);
}

/** Whether dir is one of the session's folders or inside one (the official isFolderMountSatisfied), never a carved path. */
export const folderMountSatisfied = (meta, dir, options) => typeof dir === 'string' && nodePath.isAbsolute(dir)
  && !carvedRoot(nodePath.normalize(dir), { ...optionsOf(options), userData: options?.userData ? [options.userData, ...coworkStorageRoots(options.userData)] : undefined })
  && insideAny(nodePath.normalize(dir), sessionGrants(meta, options), optionsOf(options).platform);

/**
 * The official `fri` refusal when dir (either spelling: as given, or its real path) is inside one of the session's
 * folders and inside a protected location there, else null. The session's own host-cwd and outputs are never carved.
 * For the file-tool guard (w13-coworkfn-tools / approvals) and add-to-session.
 */
export async function protectedSubpathRefusal(meta, dir, options = {}) {
  if (typeof dir !== 'string' || !nodePath.isAbsolute(dir)) return null;
  const grants = sessionGrants(meta, options);
  if (!grants.length) return null;
  const ctx = await carveContext(options), normal = nodePath.normalize(dir);
  const spellings = [...new Set([normal, await realForm(normal, ctx.fs)])];
  const cowork = coreCoworkMetadata(meta), own = cowork && options.userData ? coworkStoragePaths(options.userData, cowork.storage) : null;
  if (own && spellings.some(candidate => insideAny(candidate, [own.hostCwd, own.outputs], ctx.platform))) return null;
  if (!spellings.some(candidate => insideAny(candidate, grants, ctx.platform))) return null;
  return spellings.some(candidate => carvedRoot(candidate, ctx)) ? refusal('protected_subpath', MESSAGES.protectedSubpath, { path: normal }) : null;
}

/** The session metadata with dir added to its folders (dir already judged). */
export function addSessionFolder(meta, dir) {
  const cowork = coreCoworkMetadata(meta);
  if (!cowork) throw new Error(MESSAGES.unknownSession);
  return { ...meta, cowork: { ...cowork, folders: coworkFolders([...(cowork.folders ?? []), dir]) } };
}

/**
 * The sandbox's writable roots for a Cowork session on the connected core: host-cwd, outputs, and its granted folders
 * with their protected insides carved out (sessionWritableFolders).
 */
export async function writableRootsFor(meta, options = {}) {
  const opts = optionsOf(options), cowork = coreCoworkMetadata(meta);
  if (!cowork || !opts.userData) return [];
  return coworkWritableRoots({ storage: coworkStoragePaths(opts.userData, cowork.storage), folders: await sessionWritableFolders(meta, options) });
}

/**
 * The cowork-folders IPC (main.cjs) and the folders of a new Cowork session. One per userData (main asks for it with
 * the same options each time). dialog / window: Electron's dialog and the main window getter; t: i18n.t.
 */
export function createCoworkFolderService({ userData, dialog = null, window = () => null, t = (text, values) => fill(text, values), fs = nodeFs.promises,
  home = nodeOs.homedir(), platform = process.platform, pathKind = null, trusted = null, now = Date.now } = {}) {
  const store = trusted ?? createTrustedFolders({ file: nodePath.join(userData, TRUSTED_FOLDERS_FILE), fs, platform });
  const judgeOptions = { userData, home, platform, fs, pathKind };
  const say = refused => t(refused.text, refused.values);
  let drafts = [];
  const liveWindow = () => { const value = window?.(); return value && !value.isDestroyed?.() ? value : null; };
  const pick = async (title, message) => {
    const owner = liveWindow();
    const options = { title: t(title), message: t(message), properties: ['openDirectory', 'createDirectory'], defaultPath: home };
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);
    return result.canceled || !result.filePaths?.length ? null : result.filePaths[0];
  };
  const refuseBox = async detail => {
    const owner = liveWindow();
    if (owner) await dialog.showMessageBox(owner, { type: 'error', message: t(MESSAGES.cantAdd), detail: t(detail) });
  };
  const sessionOf = (config, threadId) => typeof threadId === 'string' && config?.threadIds?.includes(threadId) ? config.sessionMetadata?.[threadId] : undefined;

  async function trustedAdd(p = {}) {
    const owner = liveWindow();
    if (!owner) return { status: TRUST_STATUS.unavailable };
    const chosen = typeof p.path === 'string' && p.path ? p.path : await pick(MESSAGES.trustedTitle, MESSAGES.trustedMessage);
    if (!chosen) return { status: TRUST_STATUS.cancelled };
    const judged = await judgeFolder(chosen, { ...judgeOptions, vouched: chosen !== p.path });
    if (!judged.ok) { await refuseBox(judged.kind === 'protected_path' || judged.kind === 'session_storage' || judged.kind === 'user_data' ? MESSAGES.trustedProtected : MESSAGES.pickRefused); return { status: TRUST_STATUS.rejected, error: say(judged) }; }
    const folder = judged.canonical;
    if (await store.has(folder)) return { status: TRUST_STATUS.alreadyTrusted, folder, folders: await store.list() };
    // w13-close-main-process (closeout coworkfn-folders-01): Trust folder pressed before the dialog could be read is Cancel.
    const started = now();
    const answer = await dialog.showMessageBox(owner, trustConsentDialog(folder, { home, platform, t }));
    if (answer?.response !== 0 || now() - started < CONSENT_ALLOW_MIN_DWELL_MS) return { status: TRUST_STATUS.cancelled };
    const added = await store.add(folder);
    return { status: added.status, folder, folders: added.folders };
  }

  async function addToSession(p = {}, { config, save, approve } = {}) {
    const meta = sessionOf(config, p.threadId);
    if (meta?.surface === 'chat') return { ok: false, error: t(MESSAGES.chatSession) };
    const cowork = coreCoworkMetadata(meta);
    if (!cowork) throw new Error(t(MESSAGES.unknownSession));
    const given = typeof p.path === 'string' && p.path ? p.path : null;
    // A protected location inside one of the session's folders is never satisfied nor added (official fri).
    const carved = given ? await protectedSubpathRefusal(meta, given, judgeOptions) : null;
    if (carved) return { ok: false, error: say(carved) };
    if (given && folderMountSatisfied(meta, given, judgeOptions)) return { ok: true, folderPath: nodePath.normalize(given) };
    const chosen = given ?? await pick(MESSAGES.addTitle, MESSAGES.addMessage);
    if (!chosen) return { ok: false };
    const storage = coworkStoragePaths(userData, cowork.storage).root;
    const judged = await judgeFolder(chosen, { ...judgeOptions, sessionStorageDirs: [storage], vouched: !given });
    if (!judged.ok) return { ok: false, error: say(judged) };
    // The session may have changed while the picker was open: add to what it is now.
    const current = sessionOf(config, p.threadId);
    config.sessionMetadata[p.threadId] = addSessionFolder(current, judged.canonical);
    approve?.(judged.canonical);
    save?.();
    return { ok: true, folderPath: judged.canonical };
  }

  async function draftSet(p = {}) {
    const accepted = [], refused = [];
    for (const dir of Array.isArray(p.folders) ? p.folders : []) {
      const judged = await judgeFolder(dir, judgeOptions);
      if (judged.ok) accepted.push(judged.canonical); else refused.push({ path: String(dir), error: say(judged) });
    }
    drafts = coworkFolders(accepted);
    return { folders: drafts, refused };
  }

  async function recent(config) {
    const used = [];
    for (const id of config?.threadIds ?? []) used.push(...sessionGrants(config.sessionMetadata?.[id], judgeOptions));
    return { trusted: await store.list(), recent: coworkFolders(used).slice(0, 10) };
  }

  return {
    trusted: store,
    drafts: () => [...drafts],
    async run(p = {}, ctx = {}) {
      switch (p.op) {
        case 'trusted-list': return { folders: await store.list() };
        case 'trusted-add': return trustedAdd(p);
        case 'trusted-remove': {
          if (typeof p.path !== 'string' || !p.path) throw new Error(t('Choose a folder.'));
          return { folders: await store.remove(p.path) };
        }
        case 'is-trusted': return typeof p.path === 'string' && nodePath.isAbsolute(p.path) ? store.covers(nodePath.normalize(p.path)) : false;
        case 'add-to-session': return addToSession(p, ctx);
        case 'draft-set': return draftSet(p);
        case 'defaults': return [];
        case 'recent': return recent(ctx.config);
        default: throw new Error(t('Unknown folder request.'));
      }
    },
    /**
     * thread/start: takes codeDesktop.coworkFolders off the request (it never reaches a core) and, for a Cowork session,
     * answers its first folders: the ones the request names, else the drafts (used once), else the renderer's cwd.
     * A named or draft folder that is refused fails the start with the official sentence; a refused cwd is left out, and
     * so is a cwd that is the home folder, contains it or is a whole disk (the official app connects no folder the user
     * didn't choose; such a folder needs the picker, a draft or a named folder).
     */
    async takeStartFolders(params, { cowork = false } = {}) {
      let named;
      if (params?.codeDesktop && typeof params.codeDesktop === 'object' && Object.hasOwn(params.codeDesktop, 'coworkFolders')) {
        const { coworkFolders: taken, ...rest } = params.codeDesktop;
        named = Array.isArray(taken) ? taken : undefined;
        if (Object.keys(rest).length) params.codeDesktop = rest; else delete params.codeDesktop;
      }
      if (!cowork) return null;
      const chosen = named ?? (drafts.length ? drafts : null);
      if (chosen === drafts) drafts = [];
      const folders = [];
      const homes = chosen ? [] : (await carveContext(judgeOptions)).home;
      for (const dir of chosen ?? [params.cwd].filter(value => typeof value === 'string' && value)) {
        const judged = await judgeFolder(dir, judgeOptions);
        if (judged.ok) { if (chosen || !homes.some(base => folderReach(judged.canonical, { home: base, platform }))) folders.push(judged.canonical); }
        else if (chosen) throw new Error(say(judged));
      }
      return coworkFolders(folders);
    },
  };
}

const services = new Map();
/** main.cjs: the service for this userData (created on first use, with that call's options). */
export function coworkFolderService(options) {
  const key = nodePath.resolve(options.userData);
  if (!services.has(key)) services.set(key, createCoworkFolderService(options));
  return services.get(key);
}
