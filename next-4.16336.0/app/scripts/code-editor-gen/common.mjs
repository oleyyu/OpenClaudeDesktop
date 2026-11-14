// Shared helpers for extract-code-editor.mjs and its area modules (code-editor-gen/<area>.mjs).
// Each area module exports `emit(ctx)`; ctx carries the per-area adapter/copy recorders below.
// Source bases: 'legacy' = reference/current-2.31226.0/ion-dist/assets/v1 (names such as
// '../../../desktop/…' and '../../../../installed-2.42304.0-20261017/…' stay relative to it), 'ion' and 'asar' =
// the 3.6556.2 snapshot directories of official-3.6556.2.mjs. A source entry without `base` is legacy.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../../tools/node_modules/prettier/index.mjs';
import { ionSource, asarSource } from '../official-3.6556.2.mjs';

export { fs, path, parsers, format };
export const root = path.resolve(import.meta.dirname, '../..');
export const output = path.join(root, 'src/generated/code-editor');
export const source = path.resolve(root, '../reference/current-2.31226.0/ion-dist/assets/v1');
export const legacyVersion = '2.31226.0';
export const bases = Object.freeze({ legacy: source, ion: ionSource, asar: asarSource });
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function baseDir(base = 'legacy') {
  const dir = bases[base];
  if (!dir) throw Error(`Unknown code-editor source base ${base}`);
  return dir;
}
export function sourceRef(name, bytes, base = 'legacy') {
  return { name, sha256: sha(bytes), ...(base === 'legacy' ? {} : { base }) };
}
export async function readSource(name, { base = 'legacy' } = {}) {
  const bytes = await fs.readFile(path.join(baseDir(base), name));
  return { bytes, text: bytes.toString(), source: sourceRef(name, bytes, base) };
}
// Top-level declarations named in `wanted`, in source order. Declarators are re-emitted as `const` unless
// preserveKind keeps their original var/let/const.
export async function originalBindings(name, wanted, { preserveKind = false, base = 'legacy' } = {}) {
  const { bytes, text } = await readSource(name, { base }), ast = parsers.babel.parse(text, {});
  const parts = [];
  for (const node of ast.program.body) {
    if (wanted.includes(node.id?.name)) parts.push(text.slice(node.start, node.end));
    for (const d of node.declarations ?? []) if (wanted.includes(d.id.name)) parts.push((preserveKind ? node.kind : 'const') + ' ' + text.slice(d.start, d.end) + ';');
  }
  return { text: parts.join('\n'), source: sourceRef(name, bytes, base) };
}

// One area's recorder: adapter() formats and records an output, copy() mirrors an output into electron/generated.
// Bytes stay in memory (outputs) so --check never reads back what it has not written.
export function createAreaContext(area) {
  const adapters = [], copies = [], outputs = new Map(), copyOutputs = new Map();
  async function adapter(name, text, sources, referenceVersion, { styleCompatibility } = {}) {
    const formatted = await format(text, { parser: 'babel' });
    outputs.set(name, Buffer.from(formatted));
    adapters.push({ name, sha256: sha(formatted), sources, ...(styleCompatibility ? { styleCompatibility } : {}), ...(referenceVersion ? { referenceVersion } : {}) });
  }
  async function copy(name, target) {
    const bytes = outputs.get(name);
    if (!bytes) throw Error(`Copy of ${name} before it was generated in area ${area}`);
    copyOutputs.set(target, bytes);
    copies.push({ name, target, sha256: sha(bytes) });
  }
  return { area, adapters, copies, outputs, copyOutputs, adapter, copy, originalBindings, readSource };
}

// Area record written to src/generated/code-editor/areas/<area>.json.
export function areaRecord(ctx) {
  const versions = [...new Set(ctx.adapters.map(entry => entry.referenceVersion ?? legacyVersion))];
  const seen = new Set(), sources = [];
  for (const entry of ctx.adapters) for (const ref of entry.sources) {
    const key = `${ref.base ?? 'legacy'}:${ref.name}`;
    if (!seen.has(key)) { seen.add(key); sources.push(ref); }
  }
  return { area: ctx.area, referenceVersion: versions.length === 1 ? versions[0] : 'mixed', adapters: ctx.adapters, copies: ctx.copies, sources };
}
