import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as official from '../scripts/official-4.16336.0.mjs';
const read = name => fs.readFileSync(path.join(official.ionSource, name), 'utf8');
const vendor = read(official.vendorFrame), frame = read(official.sharedFrame);

test('v0.3 target names the frozen 4.16336.0 release', () => {
  const snapshot = JSON.parse(fs.readFileSync(path.join(official.snapshotRoot, 'manifest.json'), 'utf8'));
  assert.equal(snapshot.version, official.referenceVersion);
  assert.equal(official.referenceVersion, '4.16336.0');
  assert.equal(official.previousVersion, '3.6556.2');
  for (const folder of [official.ionSource, official.asarSource, official.i18nSource, official.previousIonSource])
    assert.ok(fs.statSync(folder).isDirectory(), folder);
  official.assertPinnedSource(official.vendorFrame, vendor);
  official.assertPinnedSource(official.sharedFrame, frame);
  assert.throws(() => official.assertPinnedSource(official.vendorFrame, vendor + '\n'), /source changed/);
  assert.throws(() => official.assertPinnedSource('unknown.js', ''), /No pinned source/);
});

test('all 43 vendor exports resolve to the measured React namespaces and members', () => {
  assert.equal(Object.keys(official.reactAliases).length, 43);
  for (const [alias, target] of Object.entries(official.reactAliases)) {
    const actual = official.assertVendorAlias(vendor, alias);
    assert.deepEqual([actual.module, actual.member], target);
    assert.ok(Object.isFrozen(target));
  }
  // In 3.6556.2 co was React's default export; on this release it is memo.
  assert.deepEqual(official.reactAliases.co, ['react', 'memo']);
  assert.throws(() => official.assertVendorAlias(vendor, 'co', ['react', 'default']), /no longer resolves/);
  assert.throws(() => official.assertVendorAlias(vendor, 'Oo', ['react/compiler-runtime', 'c']), /compiler-runtime shape/);
  assert.throws(() => official.assertVendorAlias(vendor, 'missing'), /No React alias/);
  assert.equal(official.assertCompilerRuntime(vendor).alias, 'ko');
});

test('24 compiler helpers match full declarations and their runtime import', () => {
  const resolved = official.assertCompilerHelpers(frame);
  assert.equal(Object.keys(resolved).length, 24);
  assert.ok(resolved.reactMemoCache && resolved.memoSentinel && resolved.memoChanged5);
  const helper = Object.values(official.compilerHelpers).find(item => item.name === 'memoChanged1');
  assert.ok(Object.isFrozen(helper));
  const corrupt = frame.replace(helper.feature, helper.feature.replace('!==', '==='));
  assert.notEqual(corrupt, frame);
  assert.throws(() => official.assertCompilerHelpers(corrupt), /memoChanged1.*no longer matches/);
  assert.throws(() => official.assertCompilerHelpers(frame, { vendor: 'vendor-frame-CnSY1sxv.js' }), /not the.*ko import/);
});
