// W7-D1 write-integrity rule (analysis/.../cds-wave7/survey/round3-decisions.json, d1/import-writes.mjs): no generated module
// may assign a binding it imports (ES import bindings are read-only; the wave-6 vendor-zod Me / k split threw "only a
// getter" at run time while --check and the duplicate-state gate were green). The scanner is exercised on fixture graphs
// in os.tmpdir(), then on the real cds-core / vendor-zod graphs (the regression the rule was added for).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const d1 = path.resolve(app, '../analysis/claude-4.16336.0-migrate-20261104/d1');
const { scanImportWrites } = await import(path.join(d1, 'import-writes.mjs'));

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'd1-import-writes-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const scan = (root, dir = 'g') => scanImportWrites([{ name: 'g', status: 'ok', dir }], root);

test('every write form on an imported binding is reported with its writer and source', () => {
  const root = fixture({
    'g/a.mjs': [
      'import { Me, k as kk, n, arr, o } from "./owner.mjs";',
      'function set(v) { Me = v; }',
      'var inc = () => { n++; };',
      'const fill = () => { [arr] = [[1]]; ({ o } = { o: 2 }); };',
      'function loop(xs) { for (kk of xs); }',
      'Me ??= 3;',
    ].join('\n'),
  });
  const hits = scan(root);
  const byWriter = Object.fromEntries(hits.map((h) => [h.writer, h]));
  assert.deepEqual(byWriter.set.imported, ['Me']);
  assert.deepEqual(byWriter.inc.imported, ['n']);
  assert.deepEqual(byWriter.fill.imported, ['arr', 'o']);
  assert.deepEqual(byWriter.loop.imported, ['k']);
  assert.ok(hits.some((h) => h.writer.startsWith('<top-level ExpressionStatement') && h.imported.includes('Me')));
  for (const h of hits) { assert.equal(h.graph, 'g'); assert.equal(h.module, 'a.mjs'); assert.equal(h.from, './owner.mjs'); }
  assert.equal(hits.length, 5);
});

test('local, shadowed and read-only uses are not writes; nested graphs are scanned as themselves', () => {
  const root = fixture({
    'g/b.mjs': [
      'import { Me, k } from "./owner.mjs";',
      'let own = 0; own = Me; own++;',
      'function shadow(Me) { Me = 1; let k = 2; k++; return Me + k; }',
      'for (const k of [1]) void k;',
      'export const read = () => Me.x = 1;', // a member write mutates the object, not the binding
    ].join('\n'),
    'g/nested/manifest.json': '{}',
    'g/nested/c.mjs': 'import { z } from "./x.mjs"; z = 1;',
  });
  assert.deepEqual(scan(root), []);
  const nested = scanImportWrites([{ name: 'n', status: 'ok', dir: 'g/nested' }], root);
  assert.equal(nested.length, 1);
  assert.deepEqual(nested[0].imported, ['z']);
});

test('graphs sharing a directory are scanned once; skipped graphs are not scanned', () => {
  const root = fixture({ 'g/a.mjs': 'import { x } from "./o.mjs"; x = 1;' });
  const hits = scanImportWrites([
    { name: 'g', status: 'ok', dir: 'g' }, { name: 'g@main', status: 'ok', dir: 'g' }, { name: 'h', status: 'skipped', dir: 'g' },
  ], root);
  assert.equal(hits.length, 1);
});

test('regression: no generated graph writes a vendor-zod binding it imports, and cds-core writes no import', () => {
  const gen = path.join(app, 'src/generated');
  const graphs = fs.readdirSync(gen).filter((d) => fs.existsSync(path.join(gen, d, 'manifest.json')))
    .map((d) => ({ name: d, status: 'ok', dir: path.join('src/generated', d) }));
  const hits = scanImportWrites(graphs, app);
  assert.deepEqual(hits.filter((h) => h.parseError), []);
  assert.deepEqual(hits.filter((h) => /vendor-zod/.test(h.from)), []);
  assert.deepEqual(hits.filter((h) => h.graph === 'cds-core'), []);
  // cds-core holds the whole vendor-zod state unit with its writer and the official __zod_globalConfig initialiser
  const core = JSON.parse(fs.readFileSync(path.join(gen, 'cds-core/manifest.json'), 'utf8'));
  const zod = core.modules.find((m) => /vendor-zod/.test(m.source));
  const names = new Set((zod.bindings ?? []).map((b) => (typeof b === 'string' ? b : b.name)));
  for (const n of ['Me', 'O', 'Ne', 'k', 'M', 'z']) assert.ok(names.has(n), `cds-core vendor-zod holds ${n}`);
  const text = fs.readFileSync(path.join(gen, 'cds-core', zod.target), 'utf8');
  assert.match(text, /\(([\w$]+) = globalThis\)\.__zod_globalConfig \?\? \(\1\.__zod_globalConfig = \{\}\);/);
  assert.match(text, /\(([\w$]+) = globalThis\)\.__zod_globalRegistry \?\? \(\1\.__zod_globalRegistry = [\w$]+\(\)\);/);
});
