import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { auditUiMigration } from '../scripts/audit-ui-migration.mjs';
import { uiMigrationTarget as target } from '../scripts/ui-migration-target.mjs';

async function fixture(t, manifests) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ui-migration-audit-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'src/generated'), { recursive: true });
  for (const [area, manifest] of Object.entries(manifests)) {
    const directory = path.join(root, 'src/generated', area);
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  }
  return auditUiMigration(root);
}
const current = { referenceVersion: target.version, referenceSnapshot: target.snapshot };

test('old, mixed and unversioned manifests prevent source migration completion', async t => {
  const report = await fixture(t, { old: { referenceVersion: target.previousVersion },
    mixed: { ...current, modules: [{ referenceVersion: target.previousVersion }] },
    unknown: {}, updated: current });
  assert.equal(report.totalAreas, 4);
  assert.equal(report.targetProvenanceAreas, 1);
  assert.equal(report.sourceMigrationComplete, false);
  assert.equal(report.visualParityVerified, false);
  assert.deepEqual(Object.fromEntries(report.areas.map(area => [area.area, area.state])),
    { mixed: 'mixed', old: 'pending', unknown: 'unversioned', updated: 'target-provenance' });
});

test('a version string with a different snapshot cannot satisfy the target', async t => {
  const report = await fixture(t, { renamed: { ...current, referenceSnapshot: target.previousSnapshot } });
  assert.equal(report.sourceMigrationComplete, false);
});

test('legacy facade metadata is excluded, active nested provenance is checked', async t => {
  const report = await fixture(t, { updated: { ...current,
    modules: [{ ...current }], legacy: { referenceVersion: target.previousVersion } } });
  assert.equal(report.sourceMigrationComplete, true);
  assert.equal(report.visualParityVerified, false);
});

test('empty inventory never reports completion', async t => {
  const report = await fixture(t, {});
  assert.equal(report.sourceMigrationComplete, false);
});

// cds-integrate/fix.md: source progress (provenance) and "wired" (reachable from index.html) are reported apart, and a
// shared graph (sharedGraph: null + publicNames, or view-tabs) is listed separately from screen regions.
test('shared graphs are counted apart from regions and reachability from index.html is reported per area', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ui-migration-audit-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = {
    'index.html': '<script type="module" src="/src/main.jsx"></script>',
    'src/main.jsx': 'import { A } from "./generated/region-a/a.mjs";\nexport default () => import("./lazy.mjs");',
    'src/lazy.mjs': 'export { R } from "./generated/region-lazy/r.mjs";',
    'src/core-facade.mjs': 'export { C } from "./generated/core/c.mjs";',
    'src/generated/region-a/a.mjs': 'export const A = 1;',
    'src/generated/region-a/manifest.json': JSON.stringify(current),
    'src/generated/region-lazy/r.mjs': 'export const R = 1;',
    'src/generated/region-lazy/manifest.json': JSON.stringify({ referenceVersion: target.previousVersion }),
    'src/generated/region-idle/i.mjs': 'export const I = 1;',
    'src/generated/region-idle/manifest.json': JSON.stringify(current),
    'src/generated/core/c.mjs': 'export const C = 1;',
    'src/generated/core/manifest.json': JSON.stringify({ ...current, sharedGraph: null, publicNames: { C: {} } }),
  };
  for (const [file, text] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), text);
  }
  let report = await auditUiMigration(root);
  const byArea = Object.fromEntries(report.areas.map(area => [area.area, [area.role, area.state, area.reachableFromEntry, area.importedBy]]));
  assert.deepEqual(byArea, {
    core: ['shared-graph', 'target-provenance', false, ['src/core-facade.mjs']],
    'region-a': ['region', 'target-provenance', true, ['src/main.jsx']],
    'region-idle': ['region', 'target-provenance', false, []],
    'region-lazy': ['region', 'pending', true, ['src/lazy.mjs']],
  });
  assert.equal(report.targetProvenanceAreas, 3);
  assert.equal(report.targetProvenanceWiredAreas, 1);
  assert.deepEqual(report.regions, { total: 3, targetProvenance: 2, targetProvenanceWired: 1 });
  assert.deepEqual(report.sharedGraphs, [{ area: 'core', state: 'target-provenance', reachableFromEntry: false, importedBy: ['src/core-facade.mjs'] }]);
  assert.deepEqual(report.entryGraph.entries, ['src/main.jsx']);
  assert.equal(report.entryGraph.complete, true);
  // Wiring the facade makes the shared graph reachable; a non-literal import() marks the graph incomplete.
  await fs.writeFile(path.join(root, 'src/main.jsx'), files['src/main.jsx'] + '\nimport "./core-facade.mjs";\nconst n = "x"; import(n);');
  report = await auditUiMigration(root);
  assert.equal(report.sharedGraphs[0].reachableFromEntry, true);
  assert.equal(report.targetProvenanceWiredAreas, 2);
  assert.deepEqual(report.entryGraph.nonLiteralImports, ['src/main.jsx']);
  assert.equal(report.entryGraph.complete, false);
});
