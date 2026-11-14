import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { viewTabsManifestFor, viewTabsViewFor, viewTabsManifestPath } from '../scripts/view-tabs-compat.mjs';

// scripts/view-tabs-compat.mjs (3.6556.2 migration E1, plan §2.2): a consumer generator pinned to a release reads the
// view-tabs manifest of that release. w10-cleanup-viewtabs-legacy: view-tabs and every consumer are 3.6556.2, the
// frozen 2.42304.0 view is gone, and the helper is strict: the manifest's own release or the consumers' original
// error text. Only manifests are read; nothing is executed.
const app = path.resolve(import.meta.dirname, '..');
const viewTabsDir = path.join(app, 'src/generated/view-tabs');
// The pre-migration manifest the 2.42304.0 view was frozen from (its name is assembled so a repo-wide grep for the old
// helper finds nothing left behind).
const frozenPath = path.join(app, 'scripts', ['view-tabs', 'legacy-2.42304.0.json'].join('-'));

const oldManifest = {
  referenceVersion: '2.42304.0', referenceSnapshot: 'installed-2.42304.0-20261017',
  publicNames: { CdsButton: { file: 'shared-frame-BfjMqbuN.js', local: '$l', export: 'Zt' } }, pendingNames: {},
  modules: [{ source: 'shared-frame-BfjMqbuN.js', sourceSha256: 'a', sha256: 'b', bindings: ['$l'] }],
};
const newManifest = {
  referenceVersion: '3.6556.2', referenceSnapshot: 'snapshots/claude-3.6556.2-20261025-192807',
  publicNames: { CdsButton: { file: 'shared-frame-6jtSkIit.js', local: 'Kl', export: 'Pt' } }, pendingNames: {}, facade: 'index.js',
  modules: [{ source: 'shared-frame-6jtSkIit.js', sourceSha256: 'c', sha256: 'd', bindings: ['Kl'] }],
};
function rootWith(manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'view-tabs-compat-'));
  fs.mkdirSync(path.join(root, 'src/generated/view-tabs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/generated/view-tabs/manifest.json'), JSON.stringify(manifest));
  return root;
}

test('view-tabs on the consumer release returns the manifest itself', async t => {
  const before = rootWith(oldManifest), after = rootWith(newManifest);
  t.after(() => { for (const r of [before, after]) fs.rmSync(r, { recursive: true, force: true }); });
  assert.deepEqual(await viewTabsManifestFor('2.42304.0', { root: before }), oldManifest);
  assert.deepEqual(await viewTabsManifestFor('3.6556.2', { root: after }), newManifest);
  assert.equal(viewTabsViewFor(newManifest, '3.6556.2'), newManifest);
});

test('an older release is refused with the consumers\' original error text, even if a manifest still carries a legacy view', async t => {
  const root = rootWith(newManifest);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await assert.rejects(viewTabsManifestFor('2.42304.0', { root }), { message: 'view-tabs is 3.6556.2, expected 2.42304.0' });
  // A stale `legacy` section is never served: the helper has no legacy branch any more.
  const stale = { ...newManifest, legacy: { '2.42304.0': { ...oldManifest } } };
  assert.throws(() => viewTabsViewFor(stale, '2.42304.0'), { message: 'view-tabs is 3.6556.2, expected 2.42304.0' });
  assert.throws(() => viewTabsViewFor(newManifest, 'toString'), { message: 'view-tabs is 3.6556.2, expected toString' });
});

test('a consumer on the newer release than view-tabs keeps the original error text', async t => {
  const before = rootWith(oldManifest), after = rootWith(newManifest);
  t.after(() => { for (const r of [before, after]) fs.rmSync(r, { recursive: true, force: true }); });
  await assert.rejects(viewTabsManifestFor('3.6556.2', { root: before }), { message: 'view-tabs is 2.42304.0, expected 3.6556.2' });
  await assert.rejects(viewTabsManifestFor('2.37337.1', { root: after }), { message: 'view-tabs is 3.6556.2, expected 2.37337.1' });
  assert.equal(viewTabsManifestPath(), path.join(viewTabsDir, 'manifest.json'));
});

test('real tree: view-tabs is 3.6556.2 only; asking for 2.42304.0 throws and the frozen manifest is gone', async () => {
  const current = await viewTabsManifestFor('3.6556.2');
  assert.equal(current.referenceVersion, '3.6556.2');
  assert.equal(current.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(current.legacy, undefined);
  assert.deepEqual(current.pendingNames, {});
  await assert.rejects(viewTabsManifestFor('2.42304.0'), { message: 'view-tabs is 3.6556.2, expected 2.42304.0' });
  assert.equal(fs.existsSync(frozenPath), false, `${path.relative(app, frozenPath)} is deleted`);
  // The helper text itself carries no legacy branch.
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'scripts/view-tabs-compat.mjs'), 'utf8'), /manifest\.legacy|manifest\?\.legacy/);
});
