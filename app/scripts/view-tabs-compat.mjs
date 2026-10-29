// View-tabs manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E1, plan §2.2).
//
// The shared CDS graph (src/generated/view-tabs, extract-view-tabs.mjs) is 3.6556.2, and so is every generator that
// reads it. A consumer asks for the release it slices:
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - anything else                                  -> the consumers' original error text.
// w10-cleanup-viewtabs-legacy: the frozen 2.42304.0 name view the manifest carried while turn-box, the turn-plan
// renderer and the E9 code-current pins still sliced 2.42304.0 is gone; an older release is refused, never served.
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function viewTabsManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/view-tabs/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function viewTabsViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`view-tabs is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function viewTabsManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(viewTabsManifestPath({ root }), 'utf8'));
  return viewTabsViewFor(manifest, referenceVersion);
}
