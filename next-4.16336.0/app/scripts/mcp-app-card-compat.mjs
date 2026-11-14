// MCP App card manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E34, the producer side
// of plan-review §A1; same shape as scripts/mcp-app-host-compat.mjs).
//
// src/generated/mcp-app-card (extract-mcp-app-card.mjs) and its consumer session-rail (loadAreas reads every area's
// manifest; areaExport looks an export up by its original local, e.g. save-environment.mjs imports shared-52 `Kg`) are
// both 3.6556.2 output. The 2.42304.0 view (legacy["2.42304.0"], per-module `legacyExports`, and the frozen manifest
// scripts/mcp-app-card-legacy-2.42304.0.json) was retired in wave 10 (w10-trans-mcp-v3-pins): no 2.42304.0 importer was
// left. A consumer reads the view of its own release through this helper:
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - anything else                                  -> an error naming both versions.
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function mcpAppCardManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/mcp-app-card/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function mcpAppCardViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`mcp-app-card is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function mcpAppCardManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(mcpAppCardManifestPath({ root }), 'utf8'));
  return mcpAppCardViewFor(manifest, referenceVersion);
}

// `target`'s exports as a consumer's `exportedNames(text)` reads them (original local -> [export names]) for the
// release the manifest is (`referenceVersion` must be it). Every name must be exported by the file on disk.
export async function mcpAppCardExportsFor(referenceVersion, target, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(mcpAppCardManifestPath({ root }), 'utf8'));
  const view = mcpAppCardViewFor(manifest, referenceVersion);
  const module = view.modules.find(m => m.target === target);
  if (!module) throw Error(`mcp-app-card ${referenceVersion} has no ${target}`);
  const text = await fs.readFile(path.join(path.dirname(mcpAppCardManifestPath({ root })), target), 'utf8');
  const onDisk = new Set();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) onDisk.add(part.split(/\s+as\s+/).at(-1));
  const out = new Map();
  for (const [name, local] of Object.entries(module.exports ?? {})) {
    if (!onDisk.has(name)) throw Error(`mcp-app-card/${target} no longer exports ${name} (${referenceVersion} ${local})`);
    out.set(local, [...(out.get(local) ?? []), name]);
  }
  return out;
}
