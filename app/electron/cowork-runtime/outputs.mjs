// w13-coworkfn-tools (research/w13-coworkfn.md O-28/O-42/O-43, cwf-25/26): a Cowork session's outputs on the connected core.
//
// Outputs folder (O-42, index.chunk-Dl8NPgw7.js sessionDirPaths `outputsDir: (0, W.join)(e, "outputs")`, getOutputsDir):
// every Cowork session on the connected core has <userData>/cowork-sessions/<storage>/outputs (core-cowork.mjs), never a
// folder of the user's; the uploads folder sits beside it (index.chunk-h5ilKUwe.js present_files `(0, l.join)(r, "uploads")`
// of getSessionStorageDir). A Cowork VM session (cw-…) keeps <its folder>/outputs (deliverables.mjs, the VM engine's).
//
// present_files (h5i `f = i(t.nZ, "Present files to the user …"`, host loop): a file can be presented only from the
// outputs folder, the uploads folder or a connected folder (folder-policy.mjs sessionGrants; a protected location inside
// a connected folder is not accessible, folder-policy protectedSubpathRefusal); a relative path resolves against the
// outputs folder. Its refusal lists every file it can't present ("Cannot present {n} file(s), so nothing was presented.").
//
// Delivered files (O-43, BtY4LlaK autoSaveDeliveredFiles; the cards "appear at the end of your reply"): the turn's
// presented files, then the outputs folder's new or changed files nobody presented (the same bounded scan as the VM
// engine's deliverables.mjs: depth 4, 500 entries, no links followed), go out as one `present` card item before the
// turn ends (createTurnDeliverables, fed main.cjs receive). artifact-index.mjs recordArtifactItem files them, as it
// files the VM engine's.
import nodeFs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { randomUUID } from 'node:crypto';
import { coreCoworkMetadata, coworkStoragePaths } from './core-cowork.mjs';
import { protectedSubpathRefusal, sessionGrants } from './folder-policy.mjs';

export const UPLOADS_DIR = 'uploads';
export const SCAN_DEPTH = 4;
export const SCAN_ENTRIES = 500;

/** The outputs folder of a Cowork session on the connected core (meta: its sessionMetadata), or null. */
export function outputsDir(meta, userData) {
  const cowork = coreCoworkMetadata(meta);
  if (!cowork || typeof userData !== 'string' || !userData) return null;
  return coworkStoragePaths(userData, cowork.storage).outputs;
}

/** The session's uploads folder (beside outputs in its storage), or null. */
export function uploadsDir(meta, userData) {
  const cowork = coreCoworkMetadata(meta);
  if (!cowork || typeof userData !== 'string' || !userData) return null;
  return nodePath.join(coworkStoragePaths(userData, cowork.storage).root, UPLOADS_DIR);
}

/** The files under dir (bounded, links not followed): path → size:mtime. */
export function snapshot(dir, { fs = nodeFs } = {}) {
  const files = new Map();
  if (typeof dir !== 'string' || !dir) return files;
  let visited = 0;
  const walk = (directory, depth) => {
    if (depth > SCAN_DEPTH || visited >= SCAN_ENTRIES) return;
    let entries;
    try { if (!fs.lstatSync(directory).isDirectory()) return; entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (++visited > SCAN_ENTRIES) break;
      const file = nodePath.join(directory, entry.name);
      if (entry.isDirectory()) walk(file, depth + 1);
      else if (entry.isFile()) {
        try { const stat = fs.lstatSync(file); if (stat.isFile()) files.set(file, `${stat.size}:${stat.mtimeMs}`); } catch { /* removed meanwhile */ }
      }
    }
  };
  walk(dir, 0);
  return files;
}

/** The files under dir that are new or changed since baseline, as deliverables ({ path, title }). */
export function changed(dir, baseline = new Map(), options) {
  return [...snapshot(dir, options)].filter(([file, fingerprint]) => baseline.get(file) !== fingerprint)
    .map(([file]) => ({ path: file, title: nodePath.basename(file) }));
}

const inside = (file, root) => file === root || file.startsWith(root.endsWith(nodePath.sep) ? root : root + nodePath.sep);

/** The folders a Cowork session presents from: outputs, uploads, and its connected folders (re-checked). */
export function presentRoots(meta, { userData, home = nodeOs.homedir(), platform = process.platform } = {}) {
  const outputs = outputsDir(meta, userData);
  if (!outputs) return [];
  return [...new Set([outputs, uploadsDir(meta, userData), ...sessionGrants(meta, { userData, home, platform })])];
}

/**
 * One path present_files was given: { ok: true, path } (its real path) or { ok: false, kind } where kind is 'missing'
 * (within the folders, but not there, or not one it may present: a protected location, a link out), 'not_file' (a
 * folder or special file) or 'outside' (not under the outputs folder, the uploads folder or a connected folder).
 */
export async function presentable(file, meta, { userData, home = nodeOs.homedir(), platform = process.platform, fs = nodeFs.promises } = {}) {
  const outputs = outputsDir(meta, userData);
  if (!outputs || typeof file !== 'string' || !file.trim() || file.includes('\0')) return { ok: false, kind: 'outside' };
  const raw = file.trim();
  const expanded = raw === '~' ? home : raw.startsWith('~/') ? nodePath.join(home, raw.slice(2)) : raw;
  const resolved = nodePath.resolve(outputs, expanded);
  const roots = presentRoots(meta, { userData, home, platform });
  const realRoots = [];
  for (const root of roots) { try { realRoots.push(await fs.realpath(root)); } catch { /* a folder that went away */ } }
  let real;
  try { real = await fs.realpath(resolved); }
  catch { return { ok: false, kind: [...roots, ...realRoots].some(root => inside(resolved, root)) ? 'missing' : 'outside' }; }
  // h5i (closeout coworkfn-tools-04): a file S() refuses is "Not found" when it lies within the folders (m(e,r), on the
  // path as given) and "Not accessible" otherwise; its reason line (_(e)) only names the Linux environment, which the
  // connected core doesn't have. So a protected location inside a connected folder, or a link out of one, is "Not found".
  const within = roots.some(root => resolved !== root && inside(resolved, root));
  if (!realRoots.some(root => inside(real, root))) return { ok: false, kind: within ? 'missing' : 'outside' };
  if (await protectedSubpathRefusal(meta, real, { userData, home, platform, fs })) return { ok: false, kind: within ? 'missing' : 'outside' };
  const stat = await fs.stat(real).catch(() => null);
  if (!stat) return { ok: false, kind: 'missing' };
  if (!stat.isFile()) return { ok: false, kind: 'not_file' };
  return { ok: true, path: real };
}

/**
 * h5i present_files' host-loop refusal, word for word but for the Linux-environment lines (the connected core has no
 * Linux environment of its own: no "/sessions/…" path exists, so those two lines never apply here).
 */
export function presentRefusal({ missing = [], notFile = [], outside = [], fine = [] }, outputs) {
  const count = missing.length + notFile.length + outside.length;
  const list = entries => entries.map(entry => `  - ${entry}`);
  const lines = [`Cannot present ${count} file(s), so nothing was presented.`];
  if (missing.length) lines.push("Not found on the user's computer:", ...list(missing));
  if (notFile.length) lines.push('Not a regular file (a directory or special file) — present individual files instead:', ...list(notFile));
  if (outside.length) lines.push("Not accessible on the user's computer:", ...list(outside), `Files must be under ${outputs}, the session uploads folder, or a connected folder.`);
  if (fine.length) lines.push('These were fine — include them again when you re-present:', ...list(fine));
  return lines.join('\n');
}

/** The `present` card item (the VM engine's shape, session-service.mjs finish) for deliverables. */
export function presentItem(deliverables, { id = randomUUID() } = {}) {
  return { id, type: 'dynamicToolCall', tool: 'present', namespace: null, arguments: {}, status: 'completed', success: true,
    contentItems: [], durationMs: null, codeDesktop: { deliverables } };
}

/**
 * The delivered files of each Cowork turn on the connected core. outputsOf(threadId): the session's outputs folder, or
 * null for any other session. observe(event) answers the events to deliver before it (the turn's `present` card item,
 * item/started then item/completed, ahead of its turn/completed); present(threadId, paths) notes what present_files
 * showed. A turn that didn't complete still shows what was presented; only a completed one adds the outputs it changed.
 */
export function createTurnDeliverables({ outputsOf, fs = nodeFs, newId = randomUUID } = {}) {
  const turns = new Map();
  const begin = (threadId, dir) => { const live = { dir, baseline: snapshot(dir, { fs }), presented: [] }; turns.set(threadId, live); return live; };
  return {
    observe(event) {
      const threadId = event?.params?.threadId;
      if (typeof threadId !== 'string' || !threadId) return [];
      if (event.method === 'turn/started') {
        const dir = outputsOf(threadId);
        if (dir) begin(threadId, dir); else turns.delete(threadId);
        return [];
      }
      if (event.method !== 'turn/completed') return [];
      const live = turns.get(threadId);
      turns.delete(threadId);
      const dir = outputsOf(threadId);
      if (!live || !dir) return [];
      // w13-close-main-process (closeout coworkfn-tools-02): what present_files showed has its own card, the call's item
      // (src/deliverable-records.mjs itemDeliverables), kept in the core's history; this card adds the turn's other new
      // outputs only, so a presented file never shows twice.
      const seen = new Set(live.presented), deliverables = [];
      const add = entry => { if (!seen.has(entry.path)) { seen.add(entry.path); deliverables.push(entry); } };
      if (event.params.turn?.status === 'completed') for (const entry of changed(dir, live.baseline, { fs })) add(entry);
      if (!deliverables.length) return [];
      const turnId = event.params.turn?.id ?? event.params.turnId ?? '';
      const item = presentItem(deliverables, { id: newId() });
      return [{ method: 'item/started', params: { threadId, turnId, item } }, { method: 'item/completed', params: { threadId, turnId, item } }];
    },
    present(threadId, files) {
      if (typeof threadId !== 'string' || !threadId) return;
      const dir = outputsOf(threadId);
      if (!dir) return;
      const live = turns.get(threadId) ?? begin(threadId, dir);
      for (const file of Array.isArray(files) ? files : []) if (typeof file === 'string' && nodePath.isAbsolute(file) && !live.presented.includes(file)) live.presented.push(file);
    },
    /** Test / diagnostics: the presented files of a thread's running turn. */
    presented: threadId => [...(turns.get(threadId)?.presented ?? [])],
  };
}
