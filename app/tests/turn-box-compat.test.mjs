// E34 (3.6556.2 migration): scripts/turn-box-compat.mjs gives the turn box's consumers (session-rail, session-rail-context)
// the manifest of their own release, and the exports by their original locals. Static: no generator, no Vite.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { turnBoxViewFor, turnBoxManifestFor, turnBoxExportsFor } from '../scripts/turn-box-compat.mjs';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/turn-box');
const exportedNames = (text) => {
  const out = new Map();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) { const [local, as] = part.split(/\s+as\s+/); out.set(local, [...(out.get(local) ?? []), as ?? local]); }
  return out;
};

test('turnBoxViewFor: the manifest itself, or the old error text (w8-turn-plan-renderer: no 2.42304.0 legacy view)', () => {
  const current = { referenceVersion: '3.6556.2', modules: [] };
  assert.equal(turnBoxViewFor(current, '3.6556.2'), current);
  assert.throws(() => turnBoxViewFor(current, '2.42304.0'), /turn-box is 3\.6556\.2, expected 2\.42304\.0/);
  // A stale legacy section is not read any more.
  assert.throws(() => turnBoxViewFor({ ...current, legacy: { '2.42304.0': { referenceVersion: '2.42304.0', modules: [] } } }, '2.42304.0'), /expected 2\.42304\.0/);
  assert.throws(() => turnBoxViewFor({ referenceVersion: '3.6556.2' }, 'toString'), /expected toString/);
});

test('turnBoxExportsFor: roots and shared originals on disk, keyed by the local; a dropped name is left out', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-box-compat-'));
  const out = path.join(root, 'src/generated/turn-box');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'owner-window.mjs'), 'function gf(){}\nfunction UH(){}\nexport { gf as ownerResizeObserver, UH };\n');
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ referenceVersion: '3.6556.2',
    modules: [{ target: 'owner-window.mjs', exports: { gf: 'ownerResizeObserver', pf: 'ownerWindowOrNull' }, sharedExports: ['UH', '_i'], legacyExports: { zU: 'UH' } }] }));
  const names = await turnBoxExportsFor('3.6556.2', 'owner-window.mjs', { root });
  assert.deepEqual([...names].sort(), [['UH', ['UH']], ['gf', ['ownerResizeObserver']]]);
  await assert.rejects(turnBoxExportsFor('3.6556.2', 'nope.mjs', { root }), /has no nope\.mjs/);
  await assert.rejects(turnBoxExportsFor('2.42304.0', 'owner-window.mjs', { root }), /expected 2\.42304\.0/);
});

test('real tree: the 3.6556.2 manifest itself, its exports as the consumers read them, and no frozen 2.42304.0 input', async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  assert.equal(fs.existsSync(path.join(app, 'scripts/turn-box-legacy-2.42304.0.json')), false, 'the frozen 2.42304.0 input is gone');
  assert.equal(fs.existsSync(path.join(app, 'scripts/turn-plan-legacy-2.42304.0.json')), false, 'the turn-plan freeze is gone too');
  assert.equal(raw.referenceVersion, '3.6556.2');
  {
    // w2-tr-turn-cont: the turn box is 3.6556.2 and has no consumer left on 2.42304.0, so it carries no legacy view; a
    // 3.6556.2 consumer reads the manifest itself and a 2.42304.0 one gets the old error text.
    assert.deepEqual(await turnBoxManifestFor('3.6556.2'), raw);
    assert.equal(raw.legacy, undefined);
    await assert.rejects(turnBoxManifestFor('2.42304.0'), /turn-box is 3\.6556\.2, expected 2\.42304\.0/);
    for (const m of raw.modules)
      assert.deepEqual([...await turnBoxExportsFor('3.6556.2', m.target)].sort(), [...exportedNames(fs.readFileSync(path.join(dir, m.target), 'utf8'))].filter(([local]) => Object.hasOwn(m.exports ?? {}, local) || (m.sharedExports ?? []).includes(local)).sort(), m.target);
  }
  // The names the other generated areas import from the turn box (derived from their import statements) stay exported.
  const imports = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.m?js$/.test(e.name)) imports.push([p, fs.readFileSync(p, 'utf8')]); } };
  walk(path.join(app, 'src/generated'));
  const importers = new Set();
  for (const [file, text] of imports) {
    if (file.startsWith(dir + path.sep)) continue;
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\.\/turn-box\/([^"]+)"/g)) {
      importers.add(path.relative(app, file));
      const onDisk = exportedNames(fs.readFileSync(path.join(dir, m[2]), 'utf8'));
      const names = new Set([...onDisk.values()].flat());
      for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) assert.ok(names.has(part.split(/\s+as\s+/)[0]), `${path.relative(app, file)}: ${part} from ${m[2]}`);
    }
  }
  // The importers, pinned so a new one is a conscious change. The earlier ones left as they moved to 3.6556.2:
  // session-rail-context (its Spinner import) and session-rail (W5 w5-session-rail-gen: stable-array's zU/ZU are now its
  // own 3.6556.2 shared-25 UH/DG/kG slice; turn-box, still 2.42304.0, holds the old copy in the other release).
  assert.deepEqual([...importers].sort(), []);
});
