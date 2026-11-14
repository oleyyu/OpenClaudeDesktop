// Routines-shared manifest for a consumer generator pinned to `referenceVersion` (same shape as
// scripts/view-tabs-compat.mjs, scripts/turn-box-compat.mjs and scripts/sidebar-resize-compat.mjs).
//
// src/generated/routines-shared (extract-routines-shared.mjs) is read by code-routines (heldGraph: the bindings it
// holds, its host adapters and contexts), cowork-scheduled (routinesSharedGraph: the same plus each binding's sha256),
// cowork-home, cowork-progress, artifact-library, session-rail (loadAreas: every area's slices) and session-rail-context
// (importableAreas). All of them match the manifest's per-module `source` / `bindings` against their own release, so a
// version mismatch is refused here rather than skipped (a skipped graph would drop the second-copy guard):
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - otherwise                                      -> an error naming both versions.
// The E34 legacy view (manifest.legacy["2.42304.0"], scripts/routines-shared-legacy-2.42304.0.json) was removed in
// w10-cleanup-routines-legacy: every consumer is 3.6556.2.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function routinesSharedManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/routines-shared/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function routinesSharedViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`routines-shared is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function routinesSharedManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(routinesSharedManifestPath({ root }), 'utf8'));
  return routinesSharedViewFor(manifest, referenceVersion);
}

// W13 G11 (D1): a consumer that would slice a binding routines-shared already holds re-exports or imports that copy
// instead (code-current lazy-init / terminal-title-invisibles, r3b-tasks and r4e-plugin lazy-value, r4e-findings once,
// code-editor side-chat-secrets). Checks, against the official chunk in `ionSource`: the routines-shared module `target`
// was cut from `source` (its sha), its output still matches its manifest, it has no imports (plain node, E41/E42), and
// each name is exported there and hashed in the manifest as this very official declaration (the minified slice).
// Returns the specifier to import from inside src/generated/<graph>/.
export async function routinesSharedLink({ referenceVersion, ionSource, target, source, names }, { root = appRoot } = {}) {
  const manifest = await routinesSharedManifestFor(referenceVersion, { root });
  const module = manifest.modules.find(m => m.target === target);
  if (!module || module.source !== source) throw Error(`routines-shared ${target} is not the ${referenceVersion} cut of ${source}`);
  const official = await fs.readFile(path.join(ionSource, source), 'utf8');
  if (module.sourceSha256 !== sha(official)) throw Error(`routines-shared ${target} was cut from another ${source}; run its generator`);
  const text = await fs.readFile(path.join(root, 'src/generated/routines-shared', target), 'utf8');
  if (sha(text) !== module.sha256) throw Error(`routines-shared ${target} differs from its manifest; run its generator`);
  if (/^import\b/m.test(text) || (module.imports ?? []).length) throw Error(`routines-shared ${target} imports; linking it would break E42`);
  const exported = new Set([...text.matchAll(/^export \{([^}]*)\};/gm)].flatMap(m => m[1].split(',').map(s => s.trim()).filter(s => s && !/\sas\s/.test(s))));
  const body = parsers.babel.parse(official, {}).program.body;
  for (const name of names) {
    const nodes = body.flatMap(n => n.type === 'FunctionDeclaration' && n.id?.name === name ? [n] : (n.declarations ?? []).filter(d => d.id?.name === name));
    if (nodes.length !== 1) throw Error(`${source} has ${nodes.length} top-level ${name}`);
    const entry = module.bindings.find(b => b.name === name);
    if (!entry || entry.sha256 !== sha(official.slice(nodes[0].start, nodes[0].end))) throw Error(`routines-shared ${target} ${name} is not ${source} ${name}; run its generator`);
    if (!exported.has(name)) throw Error(`routines-shared ${target} does not export ${name}`);
  }
  return `../routines-shared/${target}`;
}
