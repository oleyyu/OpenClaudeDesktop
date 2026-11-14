// Turn-box manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E34, the producer side of
// plan-review §A1; same shape as scripts/view-tabs-compat.mjs and scripts/sidebar-resize-compat.mjs).
//
// src/generated/turn-box (extract-turn-box.mjs) is read by session-rail (loadAreas: every area's slices, areaExport) and
// session-rail-context (importableAreas). Both match the manifest's per-module `source` / `bindings` against their own
// release, and look an export up by its original local. The turn box and both consumers are 3.6556.2 now and no
// generated area imports the turn box, so the 2.42304.0 legacy view (scripts/turn-box-legacy-2.42304.0.json) is gone
// (w8-turn-plan-renderer):
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - otherwise                                      -> an error naming both versions (the consumers' old text).
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function turnBoxManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/turn-box/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function turnBoxViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`turn-box is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function turnBoxManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(turnBoxManifestPath({ root }), 'utf8'));
  return turnBoxViewFor(manifest, referenceVersion);
}

// `target`'s exports as the consumers' `exportedNames(text)` reads them (original local -> [export names]): a module's
// roots (`exports`) and the originals other modules import under their own names (`sharedExports`). Only names the file
// on disk still exports are returned, so a consumer asking for a dropped one fails as before.
export async function turnBoxExportsFor(referenceVersion, target, { root = appRoot } = {}) {
  const view = await turnBoxManifestFor(referenceVersion, { root });
  const module = view.modules.find(m => m.target === target);
  if (!module) throw Error(`turn-box ${referenceVersion} has no ${target}`);
  const text = await fs.readFile(path.join(path.dirname(turnBoxManifestPath({ root })), target), 'utf8');
  const onDisk = new Set();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) onDisk.add(part.split(/\s+as\s+/).at(-1));
  const pairs = [...Object.entries(module.exports ?? {}), ...(module.sharedExports ?? []).map(local => [local, local])];
  const out = new Map();
  for (const [local, name] of pairs) if (onDisk.has(name) && !(out.get(local) ?? []).includes(name)) out.set(local, [...(out.get(local) ?? []), name]);
  return out;
}
