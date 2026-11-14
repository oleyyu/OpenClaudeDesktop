// Sidebar-reorder manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E34, the producer
// side of plan-review §A1; same shape as scripts/view-tabs-compat.mjs and scripts/sidebar-resize-compat.mjs).
//
// src/generated/sidebar-reorder (extract-sidebar-reorder.mjs) and its consumer session-rail (loadAreas, areaExports) are
// both 3.6556.2. The E34 frozen legacy['2.42304.0'] view is gone (w10-cleanup-sidebar-legacy):
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - anything else                                  -> an error naming both versions.
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function sidebarReorderManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/sidebar-reorder/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function sidebarReorderViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`sidebar-reorder is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function sidebarReorderManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(sidebarReorderManifestPath({ root }), 'utf8'));
  return sidebarReorderViewFor(manifest, referenceVersion);
}

// `target`'s exports as the consumers' `exportedNames(text)` reads them (original local -> [export names]), keyed by
// the manifest's locals: a slice's `exports` is local -> name, a byte copy's is the chunk's own
// export table (alias -> local). Every name must still be exported by the file on disk.
export async function sidebarReorderExportsFor(referenceVersion, target, { root = appRoot } = {}) {
  const view = await sidebarReorderManifestFor(referenceVersion, { root });
  const module = view.modules.find(m => m.target === target);
  if (!module) throw Error(`sidebar-reorder ${referenceVersion} has no ${target}`);
  const text = await fs.readFile(path.join(path.dirname(sidebarReorderManifestPath({ root })), target), 'utf8');
  const onDisk = new Set();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) onDisk.add(part.split(/\s+as\s+/).at(-1));
  const out = new Map();
  for (const [key, value] of Object.entries(module.exports ?? {})) {
    const [local, name] = module.kind === 'copy' ? [value, key] : [key, value];
    if (!onDisk.has(name)) throw Error(`sidebar-reorder/${target} no longer exports ${name} (${referenceVersion} ${local})`);
    out.set(local, [...(out.get(local) ?? []), name]);
  }
  return out;
}
