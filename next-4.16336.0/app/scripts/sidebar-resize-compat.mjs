// Sidebar-resize manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E34, the
// producer side of plan-review §A1; same shape as scripts/view-tabs-compat.mjs).
//
// src/generated/sidebar-resize (extract-sidebar-resize.mjs) is 3.6556.2, and so is every generator that reads its
// manifest (sidebar-sections resolveExternal, session-rail / session-rail-sections loadAreas). The E34 frozen
// legacy['2.42304.0'] view is gone (w10-cleanup-sidebar-legacy):
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - anything else                                  -> an error naming both versions.
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function sidebarResizeManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/sidebar-resize/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function sidebarResizeViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`sidebar-resize is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function sidebarResizeManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(sidebarResizeManifestPath({ root }), 'utf8'));
  return sidebarResizeViewFor(manifest, referenceVersion);
}

// `target`'s exports as the consumers' `exportedNames(text)` reads them (original local -> [export names]), keyed by
// the manifest's locals (e.g. 3.6556.2 shared-28 `$h` -> physicalSide). Every name must still be exported by the file
// on disk.
export async function sidebarResizeExportsFor(referenceVersion, target, { root = appRoot } = {}) {
  const view = await sidebarResizeManifestFor(referenceVersion, { root });
  const module = view.modules.find(m => m.target === target);
  if (!module) throw Error(`sidebar-resize ${referenceVersion} has no ${target}`);
  const text = await fs.readFile(path.join(path.dirname(sidebarResizeManifestPath({ root })), target), 'utf8');
  const onDisk = new Set();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) onDisk.add(part.split(/\s+as\s+/).at(-1));
  const out = new Map();
  for (const [local, name] of Object.entries(module.exports ?? {})) {
    if (!onDisk.has(name)) throw Error(`sidebar-resize/${target} no longer exports ${name} (${referenceVersion} ${local})`);
    out.set(local, [...(out.get(local) ?? []), name]);
  }
  return out;
}
