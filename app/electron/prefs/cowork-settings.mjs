// w13-coworkui-settings (research/w13-coworkui.md §1.5, cwui-38..42): the local answers behind Settings › Cowork (the
// 3.6556.2 c71860c77 De page, generated into src/generated/cowork-settings). Pure: no node:* imports; the main process
// passes fs / path / dialog / shell in (createCoworkSettingsService), so tests run it on plain node.
//
// What each section reads and writes here:
//   Global instructions (ced6780ff Se)  config.customInstructions.global, the same text Settings › Instructions edits
//                                        (prefs/instructions.mjs); the official account profile field
//                                        cowork_global_instructions has no server here (E59).
//   Cowork files (cfea69990 P)           the folder the Cowork runtime keeps its session storage in
//                                        (cowork-runtime/core-cowork.mjs coworkStorageRoot: <userData>/cowork-sessions,
//                                        or the folder Change copied it to, kept in core-cowork.mjs's pointer file).
//   Trusted Cowork folders (cabd7b1c1)   the trusted-folder store of cowork-runtime/folder-policy.mjs ("cowork-folders"
//                                        trusted-list / trusted-add / trusted-remove); nothing is kept here.
//   Memory (c71860c77 ge)                config.coworkMemory, the official account setting enabled_cowork_memory
//                                        (`t?.settings.enabled_cowork_memory !== !1`: unset reads as on).

/** shared-25 cY: the most characters the official Global instructions editor takes (ced6780ff ge `e.length <= ne`). */
export const COWORK_GLOBAL_INSTRUCTIONS_MAX = 2621440;

/** cfea69990 j: the migrate error codes the official Cowork files row knows; anything else reads as "fallback". */
export const COWORK_FILES_ERRORS = Object.freeze(['sessions-running', 'target-invalid', 'target-unc', 'target-inside-current',
  'target-not-writable', 'copy-failed', 'state-write-failed', 'fallback']);

/** c71860c77 ge: `enabled_cowork_memory !== !1` — unset reads as on. */
export const coworkMemoryEnabled = config => config?.coworkMemory !== false;

/** Strict read of a memory patch (the official PATCH body { enabled_cowork_memory }). */
export function coworkMemoryPatch(value) {
  if (typeof value !== 'boolean') throw new Error('Invalid Cowork memory setting.');
  return { coworkMemory: value };
}

/** The Cowork files folder: the Cowork runtime's storage root (core-cowork.mjs COWORK_STORAGE_DIR under userData). */
export function coworkFilesRoot(userData, path) {
  if (typeof userData !== 'string' || !userData) return null;
  return path.join(path.resolve(userData), 'cowork-sessions');
}

/**
 * CoworkUserFiles.getInfo's answer (cfea69990 P reads currentRoot, managedRoot, homeRoot, isLegacyDocumentsRoot). The
 * folder is never under Documents here, so "Use recommended" (only for a legacy Documents root) never shows.
 * currentRoot: the root in use (core-cowork.mjs coworkStorageRoot, which follows a move); homeRoot: the default one.
 */
export function coworkFilesInfo({ userData, path, currentRoot = null }) {
  const homeRoot = coworkFilesRoot(userData, path);
  if (!homeRoot) return null;
  return { currentRoot: currentRoot ?? homeRoot, managedRoot: null, homeRoot, isLegacyDocumentsRoot: false };
}

/**
 * Why a target folder can't take the Cowork files (cfea69990 j codes), or null when the folder itself would do:
 * a network (UNC) path, a relative path, the current folder or a folder inside it.
 */
export function coworkFilesTargetError(target, { currentRoot, path, platform = 'darwin' }) {
  if (typeof target !== 'string' || !target || target.includes('\0')) return 'target-invalid';
  if (/^(?:\\\\|\/\/)[^\\/]/.test(target)) return 'target-unc';
  const absolute = platform === 'win32' ? /^[a-z]:[\\/]/i.test(target) : target.startsWith('/');
  if (!absolute) return 'target-invalid';
  if (currentRoot && coworkFilesContains(currentRoot, target, { path, platform })) return 'target-inside-current';
  return null;
}

// index.chunk-SJiH6Ee8.js o(e, n): e is n or inside it (case-folded where the file system folds case).
function coworkFilesContains(parent, child, { path, platform = 'darwin' }) {
  const fold = value => (platform === 'darwin' || platform === 'win32' ? value.toLowerCase() : value);
  const relative = path.relative(fold(path.resolve(parent)), fold(path.resolve(child)));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

// SJiH6Ee8 o1 (jPK cx): the real path, or the nearest existing ancestor's real path with the rest appended.
async function coworkFilesRealForm(target, { fs, path }) {
  const missing = [];
  for (let at = path.resolve(target); ; at = path.dirname(at)) {
    try { return path.join(await fs.realpath(at), ...missing.reverse()); }
    catch { if (path.dirname(at) === at) return path.resolve(target); missing.push(path.basename(at)); }
  }
}

/**
 * The official migrate target check (index.chunk-SJiH6Ee8.js s), in its order: an absolute, local path (UNC: target-unc);
 * its real form; not the app's data folder, inside it or above it (isCoworkUserDataPath refuseAncestors: target-invalid);
 * not the current root, inside it or above it (target-inside-current); not a protected location (deniedCoworkMountRoot:
 * target-invalid); not an agent configuration folder, inside it or above it unless the home folder itself is in one (rL:
 * target-invalid); then made (0700, recursive), or target-not-writable. Answers { ok: true, canonical, current } or
 * { ok: false, errorCode }.
 */
export async function coworkFilesTargetCheck(target, { currentRoot, userData, configDirs = [], home = null, denied = async () => false,
  fs, path, platform = 'darwin' }) {
  const lexical = coworkFilesTargetError(target, { currentRoot: null, path, platform });
  if (lexical) return { ok: false, errorCode: lexical };
  const real = value => coworkFilesRealForm(value, { fs, path });
  let canonical;
  try { canonical = await real(path.normalize(target)); } catch { return { ok: false, errorCode: 'target-invalid' }; }
  const unc = coworkFilesTargetError(canonical, { currentRoot: null, path, platform });
  if (unc) return { ok: false, errorCode: unc };
  const both = (a, b) => coworkFilesContains(a, b, { path, platform }) || coworkFilesContains(b, a, { path, platform });
  if (typeof userData === 'string' && userData) {
    const data = [...new Set([path.resolve(userData), await real(userData).catch(() => path.resolve(userData))])];
    if (data.some(dir => both(canonical, dir))) return { ok: false, errorCode: 'target-invalid' };
  }
  const current = currentRoot ? await fs.realpath(currentRoot).catch(() => currentRoot) : null;
  if (current && both(canonical, current)) return { ok: false, errorCode: 'target-inside-current' };
  if (await denied(canonical)) return { ok: false, errorCode: 'target-invalid' };
  if (home) {
    const homes = [...new Set([path.resolve(home), await fs.realpath(home).catch(() => path.resolve(home))])];
    for (const dir of configDirs.filter(value => typeof value === 'string' && value)) {
      const config = await fs.realpath(dir).catch(() => path.resolve(dir));
      if (!homes.some(base => coworkFilesContains(config, base, { path, platform })) && both(canonical, config)) return { ok: false, errorCode: 'target-invalid' };
    }
  }
  try { await fs.mkdir(canonical, { recursive: true, mode: 0o700 }); } catch { return { ok: false, errorCode: 'target-not-writable' }; }
  return { ok: true, canonical, current: current ?? currentRoot };
}

// SJiH6Ee8 migrate holds a lock (n.t() … finally o()): one move at a time, across service instances.
let migrating = Promise.resolve();

/**
 * The main-process side of Settings › Cowork (desktop:call "cowork-settings"). Ops:
 *   files-info     CoworkUserFiles.getInfo
 *   files-reveal   CoworkUserFiles.reveal: the root made if missing (aJ), then shown in its folder (showItemInFolder)
 *   files-pick     CoworkUserFiles.pickTarget: { path } or null
 *   files-migrate  CoworkUserFiles.migrate (index.chunk-SJiH6Ee8.js): no Cowork session running (sessions-running), the
 *                  target check, the files copied over (recursive, force; copy-failed; a missing source moves only the
 *                  pointer), the pointer written (retried once; state-write-failed), then a relaunch: { ok, newRoot }.
 *   memory         the Use memory in sessions switch: { enabled } -> config.coworkMemory
 * currentRoot / setRoot: core-cowork.mjs coworkStorageRoot / writeCoworkFilesPointer; denied: folder-policy.mjs's
 * protected locations; configDirs: the agents' configuration folders (the official rL, ~/.claude).
 */
export function createCoworkSettingsService({ userData, path, fs, dialog, shell, window = () => null, platform = 'darwin',
  runningCoworkSessions = () => 0, currentRoot = () => null, setRoot = null, relaunch = () => {}, denied, configDirs = [], home = null,
  defer = callback => setImmediate(callback), log = () => {} }) {
  const info = () => coworkFilesInfo({ userData, path, currentRoot: currentRoot() });
  async function migrate(target) {
    if (runningCoworkSessions() > 0) return { ok: false, errorCode: 'sessions-running' };
    const checked = await coworkFilesTargetCheck(target, { currentRoot: info()?.currentRoot, userData, configDirs, home, denied, fs, path, platform });
    if (!checked.ok) return { ok: false, errorCode: checked.errorCode };
    const { canonical, current } = checked;
    let absent = false;
    try { await fs.access(current); } catch (error) { absent = error?.code === 'ENOENT'; }
    if (absent) log(`[migrate] source ${current} absent; moving pointer only`);
    else {
      try { await fs.cp(current, canonical, { recursive: true, force: true }); }
      catch (error) { log(`[migrate] copy failed: ${String(error)}`); return { ok: false, errorCode: 'copy-failed' }; }
    }
    if (typeof setRoot !== 'function') return { ok: false, errorCode: 'state-write-failed' };
    try { await setRoot(canonical); }
    catch (error) {
      log(`[migrate] state write retry: ${String(error)}`);
      try { await setRoot(canonical); }
      catch (error) { log(`[migrate] state write: ${String(error)}`); return { ok: false, errorCode: 'state-write-failed' }; }
    }
    log(`[migrate] ${current} -> ${canonical}; relaunching`);
    defer(() => relaunch());
    return { ok: true, newRoot: canonical };
  }
  return {
    async run(p = {}, { config, save, emitConfig } = {}) {
      switch (p.op) {
        case 'files-info': return info();
        case 'files-reveal': {
          const root = info()?.currentRoot;
          if (!root) return false;
          await fs.mkdir(root, { recursive: true, mode: 0o700 }).catch(() => undefined);
          shell.showItemInFolder(path.join(root, '.'));
          return true;
        }
        case 'files-pick': {
          const owner = window();
          const options = { properties: ['openDirectory', 'createDirectory'] };
          const picked = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);
          return picked?.canceled || !picked?.filePaths?.[0] ? null : { path: picked.filePaths[0] };
        }
        case 'files-migrate': {
          const turn = migrating.then(() => migrate(p.path));
          migrating = turn.catch(() => undefined);
          return turn;
        }
        case 'memory': {
          Object.assign(config, coworkMemoryPatch(p.enabled));
          save?.();
          emitConfig?.();
          return { enabled: coworkMemoryEnabled(config) };
        }
        default: throw new Error('Unknown Cowork settings request.');
      }
    },
  };
}
