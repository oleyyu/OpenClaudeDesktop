// Sidebar-sections manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E34; same shape as
// scripts/view-tabs-compat.mjs and scripts/sidebar-resize-compat.mjs).
//
// src/generated/sidebar-sections (extract-sidebar-sections.mjs) and its consumer sidebar-reorder (`module.source`,
// `bindings`, the file's `export { <local> as <name> }`) are both 3.6556.2. The E34 frozen legacy['2.42304.0'] view is
// gone (w10-cleanup-sidebar-legacy):
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - anything else                                  -> an error naming both versions.
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function sidebarSectionsManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/sidebar-sections/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function sidebarSectionsViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`sidebar-sections is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function sidebarSectionsManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(sidebarSectionsManifestPath({ root }), 'utf8'));
  return sidebarSectionsViewFor(manifest, referenceVersion);
}

// The `referenceVersion` local that `target` exports as `name`, as the consumer's `exportedLocal(text, name)` reads
// it: the manifest's `exports` (original local -> name) gives the local, and
// the file on disk must still export `name`. Returns null when either is missing.
export async function sidebarSectionsExportedLocal(referenceVersion, target, name, { root = appRoot } = {}) {
  const view = await sidebarSectionsManifestFor(referenceVersion, { root });
  const module = view.modules.find(m => m.target === target);
  const local = Object.entries(module?.exports ?? {}).find(([, n]) => n === name)?.[0];
  if (!local) return null;
  const text = await fs.readFile(path.join(path.dirname(sidebarSectionsManifestPath({ root })), target), 'utf8');
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean))
      if (part.split(/\s+as\s+/).at(-1) === name) return local;
  return null;
}
