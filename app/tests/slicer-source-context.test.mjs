import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { runSlicer } from '../scripts/extract-working-line.mjs';
const sha = text => createHash('sha256').update(text).digest('hex');
const version = '4.16336.0', snapshot = 'snapshots/fixture-v4';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'slicer-source-context-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'official'), generatedRoot = path.join(directory, 'generated');
  await fs.mkdir(source);
  await fs.mkdir(path.join(generatedRoot, 'view-tabs'), { recursive: true });
  await fs.mkdir(path.join(generatedRoot, 'linked'), { recursive: true });
  const viewTabs = { referenceVersion: version, referenceSnapshot: snapshot,
    publicNames: { SharedValue: { file: 'shared.js', local: 'value' } }, modules: [] };
  const linkedCode = 'export const LinkedValue = 2;\n';
  const linked = { referenceVersion: version, referenceSnapshot: snapshot, modules: [{
    target: 'value.mjs', source: 'linked.js', sha256: sha(linkedCode), bindings: [{ name: 'value' }], exports: { value: 'LinkedValue' } }] };
  await fs.writeFile(path.join(generatedRoot, 'view-tabs/manifest.json'), JSON.stringify(viewTabs));
  await fs.writeFile(path.join(generatedRoot, 'linked/manifest.json'), JSON.stringify(linked));
  await fs.writeFile(path.join(generatedRoot, 'linked/value.mjs'), linkedCode);
  const vendorCode = 'const hook = 0; export {hook as x};';
  for (const [name, code] of Object.entries({
    'vendor.js': vendorCode, 'shared.js': 'const value = 3; export {value as d};',
    'linked.js': 'const value = 2; export {value as t};',
    'model.js': 'import{x as h}from"./vendor.js";import{t as l}from"./linked.js";import{d as v}from"./shared.js";function f(){return h(l+v)}export{f as t};',
  })) await fs.writeFile(path.join(source, name), code);
  const calls = [];
  const sourceContract = { referenceVersion: version, referenceSnapshot: snapshot,
    assertVendorAlias(code, alias, target) { assert.equal(code, vendorCode); assert.equal(alias, 'x'); assert.deepEqual(target, ['react', 'useState']); calls.push(alias); } };
  const cfg = { name: 'source context fixture', generator: 'fixture.mjs', output: path.join(generatedRoot, 'consumer'),
    adapterModule: '../../adapter.mjs', adapterFile: 'src/adapter.mjs', adapters: {}, source,
    referenceVersion: version, referenceSnapshot: snapshot, sourceContract, generatedRoot,
    vendor: { 'vendor.js': { x: ['react', 'useState'] } }, linkedAreas: ['linked'],
    modules: [{ source: 'model.js', target: 'model.mjs', exports: { f: 'Model' } }] };
  return { cfg, calls, directory, generatedRoot, viewTabs, linked };
}

test('new source contract and staged view-tabs/linked graph are used without changing output on --check', async t => {
  const { cfg, calls } = await fixture(t);
  const manifest = await runSlicer(cfg);
  assert.equal(manifest.referenceVersion, version);
  const code = await fs.readFile(path.join(cfg.output, 'model.mjs'), 'utf8');
  assert.match(code, /from "react"/);
  assert.match(code, /from "\.\.\/view-tabs\/shared.js"/);
  assert.match(code, /from "\.\.\/linked\/value.mjs"/);
  assert.deepEqual(calls, ['x']);
  await runSlicer(cfg, { check: true });
  assert.equal(await fs.readFile(path.join(cfg.output, 'model.mjs'), 'utf8'), code);
});

test('new versions cannot silently reuse the old release contract or another snapshot', async t => {
  const { cfg } = await fixture(t);
  await assert.rejects(runSlicer({ ...cfg, sourceContract: undefined }), /sourceContract is required/);
  await assert.rejects(runSlicer({ ...cfg, sourceContract: { ...cfg.sourceContract, referenceSnapshot: 'other' } }), /version\/snapshot does not match/);
  await assert.rejects(runSlicer({ ...cfg, generatedRoot: undefined }), /generatedRoot is required/);
});

test('staging keeps strict view-tabs and linked-module version checks', async t => {
  const { cfg, generatedRoot, viewTabs, linked } = await fixture(t);
  await fs.writeFile(path.join(generatedRoot, 'view-tabs/manifest.json'), JSON.stringify({ ...viewTabs, referenceVersion: '3.6556.2' }));
  await assert.rejects(runSlicer(cfg), /view-tabs is 3.6556.2, expected 4.16336.0/);
  await fs.writeFile(path.join(generatedRoot, 'view-tabs/manifest.json'), JSON.stringify(viewTabs));
  await fs.writeFile(path.join(generatedRoot, 'linked/manifest.json'), JSON.stringify({ ...linked, referenceVersion: '3.6556.2' }));
  await assert.rejects(runSlicer(cfg), /linked is 3.6556.2, expected 4.16336.0/);
});

test('linked output integrity is checked in the selected staging root', async t => {
  const { cfg, generatedRoot } = await fixture(t);
  await fs.appendFile(path.join(generatedRoot, 'linked/value.mjs'), '// changed\n');
  await assert.rejects(runSlicer(cfg), /differs from its manifest/);
});

test('new dependency graphs reject another snapshot of the same version', async t => {
  const { cfg, generatedRoot, viewTabs, linked } = await fixture(t);
  await fs.writeFile(path.join(generatedRoot, 'view-tabs/manifest.json'), JSON.stringify({ ...viewTabs, referenceSnapshot: 'another-snapshot' }));
  await assert.rejects(runSlicer(cfg), /view-tabs snapshot is another-snapshot/);
  await fs.writeFile(path.join(generatedRoot, 'view-tabs/manifest.json'), JSON.stringify(viewTabs));
  await fs.writeFile(path.join(generatedRoot, 'linked/manifest.json'), JSON.stringify({ ...linked, referenceSnapshot: 'another-snapshot' }));
  await assert.rejects(runSlicer(cfg), /linked module.*snapshot is another-snapshot/);
});

test('staged asset publication requires an explicit directory and preserves old output on refusal', async t => {
  const { cfg, directory } = await fixture(t);
  await fs.writeFile(path.join(cfg.source, 'asset.js'), 'const badge="/assets/v1/badge.png";export{badge};');
  const bytes = Buffer.from([137, 80, 78, 71]);
  await fs.writeFile(path.join(cfg.source, 'badge.png'), bytes);
  const assetCfg = { ...cfg, linkedAreas: [], vendor: {}, modules: [{ source: 'asset.js', target: 'asset.mjs', exports: { badge: 'BadgeUrl' } }] };
  await fs.mkdir(cfg.output);
  await fs.writeFile(path.join(cfg.output, 'keep.txt'), 'keep');
  await assert.rejects(runSlicer(assetCfg), /publicAssetsRoot is required/);
  assert.equal(await fs.readFile(path.join(cfg.output, 'keep.txt'), 'utf8'), 'keep');
  const publicAssetsRoot = path.join(directory, 'public-assets');
  await runSlicer({ ...assetCfg, publicAssetsRoot });
  assert.deepEqual(await fs.readFile(path.join(publicAssetsRoot, 'badge.png')), bytes);
  await runSlicer({ ...assetCfg, publicAssetsRoot }, { check: true });
});

// cfg.sharedGraph / cfg.publicNames / cfg.artifacts: a 4.16336.0 shared graph (cds-core) generated with no view-tabs
// graph at all, then read by a consumer area as its shared graph by manifest publicNames.
async function sharedGraphFixture(t) {
  const { cfg, generatedRoot } = await fixture(t);
  await fs.rm(path.join(generatedRoot, 'view-tabs'), { recursive: true });
  await fs.writeFile(path.join(cfg.source, 'shared.js'),
    'const value = 3; const store = new Map(); function get(){return store} export {value as d, get as g, store as s};');
  await fs.writeFile(path.join(cfg.source, 'consumer.js'),
    'import{d as v,g as gs,s as st}from"./shared.js";function f(){return v+gs().size+st.size}export{f as t};');
  const producer = { ...cfg, name: 'core fixture', generator: 'core.mjs', output: path.join(generatedRoot, 'core'), linkedAreas: [], vendor: {},
    sharedGraph: null, modules: [{ source: 'shared.js', target: 'shared.mjs', exports: { value: 'SharedValue', get: 'getStore' }, linkExports: ['store'] }],
    publicNames: { SharedValue: { file: 'shared.js', local: 'value' }, SharedStore: { file: 'shared.js', local: 'store' } } };
  const consumer = { ...cfg, name: 'consumer fixture', output: path.join(generatedRoot, 'consumer'), linkedAreas: [], vendor: {}, sharedGraph: 'core',
    modules: [{ source: 'consumer.js', target: 'consumer.mjs', exports: { f: 'Consumer' } }, { source: 'shared.js', target: 'shared-copy.mjs' }] };
  return { producer, consumer, generatedRoot };
}

test('a shared graph generates without any view-tabs graph and publishes publicNames with target and export name', async t => {
  const { producer } = await sharedGraphFixture(t);
  const manifest = await runSlicer(producer);
  assert.equal(manifest.sharedGraph, null);
  assert.deepEqual(manifest.publicNames, {
    SharedValue: { file: 'shared.js', local: 'value', target: 'shared.mjs', exportName: 'SharedValue' },
    SharedStore: { file: 'shared.js', local: 'store', target: 'shared.mjs', exportName: 'store' } });
  await runSlicer(producer, { check: true });
  await assert.rejects(runSlicer({ ...producer, publicNames: { Missing: { file: 'shared.js', local: 'nope' } } }), /publicName Missing: shared.js#nope is not an exported binding/);
});

test('a consumer imports a named shared graph by its publicNames and reslices held pure bindings only', async t => {
  const { producer, consumer } = await sharedGraphFixture(t);
  await runSlicer(producer);
  const manifest = await runSlicer(consumer);
  const code = await fs.readFile(path.join(consumer.output, 'consumer.mjs'), 'utf8');
  assert.match(code, /import \{ store as st, SharedValue as v \} from "\.\.\/core\/shared\.mjs";/);
  assert.match(code, /import \{ get as gs \} from "\.\/shared-copy\.mjs";/);
  const copy = manifest.modules.find(m => m.target === 'shared-copy.mjs');
  assert.deepEqual(copy.heldByViewTabs, ['get']);
  assert.deepEqual(copy.imports.map(i => [i.local, i.from, i.name, i.kind]), [['store', '../core/shared.mjs', 'store', 'shared-graph']]);
  assert.equal(manifest.sharedGraph, 'core');
  assert.equal(manifest.modules.find(m => m.target === 'consumer.mjs').imports.find(i => i.local === 'v').kind, 'shared-graph');
  await runSlicer(consumer, { check: true });
});

test('a named shared graph keeps module state single, and its version, snapshot, bytes and publicNames strict', async t => {
  const { producer, consumer, generatedRoot } = await sharedGraphFixture(t);
  await runSlicer({ ...producer, publicNames: { SharedValue: { file: 'shared.js', local: 'value' } } });
  await assert.rejects(runSlicer(consumer), /module state core holds without a semantic name \(add it to core publicNames, D46\)/);
  await runSlicer(producer);
  const file = path.join(generatedRoot, 'core/manifest.json'), core = JSON.parse(await fs.readFile(file, 'utf8'));
  await fs.writeFile(file, JSON.stringify({ ...core, referenceVersion: '3.6556.2' }));
  await assert.rejects(runSlicer(consumer), /core is 3.6556.2, expected 4.16336.0/);
  await fs.writeFile(file, JSON.stringify({ ...core, referenceSnapshot: 'another-snapshot' }));
  await assert.rejects(runSlicer(consumer), /core snapshot is another-snapshot/);
  await fs.writeFile(file, JSON.stringify({ ...core, publicNames: { ...core.publicNames, SharedValue: { ...core.publicNames.SharedValue, exportName: 'Other' } } }));
  await assert.rejects(runSlicer(consumer), /core publicName SharedValue \(shared.js#value\) is not exported by shared.mjs as Other/);
  // The shared module's recorded official source must be the chunk this consumer reads (fix.md, P2 sourceSha256).
  await fs.writeFile(file, JSON.stringify({ ...core, modules: core.modules.map(m => ({ ...m, sourceSha256: '0'.repeat(64) })) }));
  await assert.rejects(runSlicer(consumer), /core\/shared.mjs was sliced from shared.js 0{64}, which is not the source this area reads/);
  const { sourceSha256, ...withoutHash } = core.modules[0];
  await fs.writeFile(file, JSON.stringify({ ...core, modules: [withoutHash] }));
  await assert.rejects(runSlicer(consumer), /core\/shared.mjs was sliced from shared.js \(no sourceSha256\)/);
  await fs.writeFile(file, JSON.stringify(core));
  const sharedSource = path.join(consumer.source, 'shared.js'), sharedBytes = await fs.readFile(sharedSource);
  await fs.writeFile(sharedSource, Buffer.concat([sharedBytes, Buffer.from('\n')]));
  await assert.rejects(runSlicer(consumer), /core\/shared.mjs was sliced from shared.js [0-9a-f]{64}, which is not the source this area reads/);
  await fs.writeFile(sharedSource, sharedBytes);
  await runSlicer(consumer);
  await fs.appendFile(path.join(generatedRoot, 'core/shared.mjs'), '// changed\n');
  await assert.rejects(runSlicer(consumer), /core\/shared.mjs differs from its manifest/);
  await assert.rejects(runSlicer({ ...consumer, sharedGraph: '../core' }), /sharedGraph must be an area name/);
});

test('generator artifacts are written beside the manifest and compared by --check', async t => {
  const { producer } = await sharedGraphFixture(t);
  const artifacts = async manifest => ({ 'provenance.json': JSON.stringify({ modules: manifest.modules.length }) + '\n' });
  await runSlicer({ ...producer, artifacts });
  assert.equal(await fs.readFile(path.join(producer.output, 'provenance.json'), 'utf8'), '{"modules":1}\n');
  await runSlicer({ ...producer, artifacts }, { check: true });
  await assert.rejects(runSlicer(producer, { check: true }), /output set changed/);
  await fs.writeFile(path.join(producer.output, 'provenance.json'), '{}\n');
  await assert.rejects(runSlicer({ ...producer, artifacts }, { check: true }), /source mismatch: provenance.json/);
  await assert.rejects(runSlicer({ ...producer, artifacts: async () => ({ 'manifest.json': '' }) }), /collides with generated output/);
});
