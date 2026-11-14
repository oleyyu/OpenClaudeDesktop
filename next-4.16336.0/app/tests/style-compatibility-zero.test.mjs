// Style-compatibility contract on the 4.16336.0 design pin (design-production, styles-audit §6).
//
// History: w10-cleanup-final (E34 close-out) locked the layer at zero while the pin was 3.6556.2. Moving the pin to
// 4.16336.0 (design-production) leaves regions and host code that are still on 3.6556.2 naming utilities 4.16336.0 dropped,
// so the layer is non-zero again. That is an allowed transition state only under this contract:
//   - every retained rule is an original slice of a recorded baseline (version, snapshot file, offsets, sha256) and is
//     held by at least one reference from code that is NOT on 4.16336.0 — a generated region whose own manifest records
//     an earlier version, or host code — and every such owner is one of the documented legacy owners below (a new owner
//     fails here: migrate it to official 4.16336.0 classes instead of growing the layer);
//   - code on 4.16336.0 (cds-core, chat, ...) never holds a rule, cds-core is never even a hit, and no class it names is
//     missing from the 4.16336.0 sheets (targetVersionUnresolved is empty);
//   - the published manifest/CSS equal a dry run over today's sources, and the debt is listed per owner in legacyDebt.
// The count may only fall as owners migrate; the goal stays zero (styles-audit §6, §8).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
import {prepareStyleCompatibility} from '../scripts/prepare-style-compatibility.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const manifest = JSON.parse(read('public/style-compatibility.json'));
const css = read('public/assets/legacy-utilities.css');

// Documented legacy owners at the 4.16336.0 pin (design-production report.json legacyDebt.styleCompatibility). Only
// removals are expected from here on.
// Region owners (generated regions still on 3.6556.2) and host owners (host files naming a dropped utility) are listed
// apart: host code is not a legacy region, it is the host's own debt (design-production fix.json, review P2-3).
const LEGACY_REGION_OWNERS = [
  'generated:artifact-library', 'generated:chat-messages', 'generated:chat-side-chat', 'generated:code-composer',
  'generated:code-current', 'generated:code-editor', 'generated:code-routines', 'generated:code-transcript',
  'generated:cowork-approval', 'generated:cowork-progress', 'generated:cowork-settings', 'generated:pierre-changes',
  'generated:routines-shared', 'generated:session-rail', 'generated:session-rail-kit', 'generated:sidebar-sections',
  'generated:view-tabs',
];
const HOST_DEBT_OWNERS = [
  'host:src/source-background-tasks.jsx', 'host:src/source-chat-message-actions.jsx', 'host:src/source-diff.jsx',
  'host:src/source-incognito-shell.jsx', 'host:src/source-preview-pane.jsx', 'host:src/source-sidebar-drag.jsx',
  'host:src/source-task-backlog.jsx', 'host:src/source-tile-layout.css', 'host:src/source-tile-layout.jsx',
  'host:src/source-transcript.jsx',
];
const LEGACY_OWNERS = [...LEGACY_REGION_OWNERS, ...HOST_DEBT_OWNERS];
const MAX_RULES = 118;
// Rules no 3.6556.2 region holds — only host files name them. They may only fall, to zero, by rewriting the host call
// sites to official 4.16336.0 classes/tokens; they never leave by a region migration.
const MAX_HOST_ONLY_RULES = 9;

const regionVersion = area => {
  for (const record of ['manifest.json', 'provenance.json']) {
    const file = path.join(app, 'src/generated', area, record);
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const version = data && !Array.isArray(data) ? data.referenceVersion ?? data.version : null;
    if (version) return version;
  }
  return null;
};

test('the published manifest is on the 4.16336.0 pin with 3.6556.2 as the newest recorded baseline', () => {
  assert.equal(manifest.currentVersion, '4.16336.0');
  assert.deepEqual(manifest.baselines.map(b => b.version), ['3.6556.2', '2.42304.0', '2.37337.1']);
  assert.equal(manifest.baselines[0].source, 'snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c6a992d55-Che1orl5.css');
  for (const baseline of manifest.baselines)
    assert.equal(sha(fs.readFileSync(path.join(app, '../reference', baseline.source), 'utf8')), baseline.sha256, baseline.source);
  assert.equal(manifest.output, 'assets/legacy-utilities.css');
  assert.equal(manifest.outputSha256, sha(css));
  assert.deepEqual(manifest.scanner.warnings, []);
  assert.ok(manifest.rules.length <= MAX_RULES, `${manifest.rules.length} rules: the layer may only shrink`);
  assert.deepEqual(manifest.tokens, []);
});

test('every retained rule is an original baseline slice held by a documented owner that is not on 4.16336.0', () => {
  const baselines = new Map(manifest.baselines.map(b => [b.source, {version: b.version, text: fs.readFileSync(path.join(app, '../reference', b.source), 'utf8')}]));
  for (const rule of manifest.rules) {
    const baseline = baselines.get(rule.baseline);
    assert.ok(baseline, rule.baseline);
    assert.equal(rule.baselineVersion, baseline.version, `${rule.selector}: recorded source version`);
    const fragment = baseline.text.slice(rule.start, rule.end);
    assert.equal(sha(fragment), rule.sha256, rule.selector);
    assert.ok(css.includes(fragment), rule.selector);
    let legacyHits = 0;
    for (const ref of rule.references) for (const hit of ref.hits) {
      assert.ok(!hit.file.startsWith('src/generated/cds-core/'), `cds-core names ${ref.className}: it must come from the 4.16336.0 sheets`);
      const area = hit.file.match(/^src\/generated\/([^/]+)\//)?.[1];
      if (area) assert.equal(hit.sourceVersion, regionVersion(area), `${hit.file}: the recorded version is the region's own`);
      else assert.deepEqual([hit.generator, hit.sourceVersion], ['host', null], hit.file);
      if (hit.sourceVersion === '4.16336.0') continue;
      legacyHits += 1;
      const owner = area ? 'generated:' + area : 'host:' + hit.file;
      assert.ok(LEGACY_OWNERS.includes(owner), `${owner} is not a documented legacy owner (${ref.className})`);
    }
    assert.ok(legacyHits > 0, `${rule.selector} is held only by 4.16336.0 code`);
  }
});

test('legacyDebt lists the owners per region/host file with their real source versions; 4.16336.0 code resolves fully', () => {
  const owners = manifest.legacyDebt.owners;
  assert.equal(manifest.legacyDebt.rules, manifest.rules.length);
  assert.ok(owners.every(owner => LEGACY_OWNERS.includes(owner.owner)), owners.map(o => o.owner).join(', '));
  for (const owner of owners) {
    assert.ok(owner.classes.length > 0 && owner.rules > 0, owner.owner);
    assert.ok(!owner.sourceVersions.includes('4.16336.0'), owner.owner);
    if (owner.area) assert.deepEqual(owner.sourceVersions, [regionVersion(owner.area)], owner.owner);
    else assert.deepEqual(owner.sourceVersions, ['host'], owner.owner);
  }
  assert.deepEqual(manifest.targetVersionUnresolved, []);
});

test('legacy-utilities.css holds only the retained slices in the utilities (and theme) layers', () => {
  const ast = postcss.parse(css);
  assert.ok(ast.nodes.every(n => n.type === 'comment' || (n.type === 'atrule' && n.name === 'layer' && ['utilities', 'theme'].includes(n.params))));
  assert.doesNotMatch(css, /@layer theme/);
  assert.match(css, /unmigrated debt/);
});

test('a dry run over the current sources reproduces the published layer exactly', async () => {
  const fresh = await prepareStyleCompatibility({dryRun: true});
  assert.equal(fresh.outputSha256, manifest.outputSha256);
  assert.deepEqual(fresh.legacyDebt, manifest.legacyDebt);
  assert.deepEqual(fresh.targetVersionUnresolved, []);
});

test('the E34 frozen 2.42304.0 legacy inputs and generated legacy sections are gone', () => {
  assert.deepEqual(fs.readdirSync(path.join(app, 'scripts')).filter(name => /-legacy-2\.42304\.0\.json$/.test(name)), []);
  for (const dir of ['src/generated', 'electron/generated']) {
    const base = path.join(app, dir);
    for (const area of fs.readdirSync(base, {withFileTypes: true}).filter(entry => entry.isDirectory())) {
      const file = path.join(base, area.name, 'manifest.json');
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!data || Array.isArray(data)) continue;
      for (const key of ['legacy', 'legacyImporters']) {
        if (!(key in data)) continue;
        const value = data[key];
        assert.equal(Array.isArray(value) ? value.length : Object.keys(value ?? {}).length, 0, `${dir}/${area.name} ${key}`);
      }
    }
  }
});

test('host debt is counted apart from legacy regions: host-only rules may only fall and name only host owners', () => {
  const debt = manifest.legacyDebt;
  const legacyHits = rule => rule.references.flatMap(ref => ref.hits.filter(hit => hit.sourceVersion !== manifest.currentVersion));
  const hostOnly = manifest.rules.filter(rule => legacyHits(rule).every(hit => hit.sourceVersion === null));
  assert.equal(debt.hostDebt.rules, hostOnly.length);
  assert.equal(debt.regionRules + debt.hostDebt.rules, debt.rules);
  assert.ok(hostOnly.length <= MAX_HOST_ONLY_RULES, `${hostOnly.length} host-only rules: host debt may only shrink`);
  assert.deepEqual(debt.hostDebt.items.map(item => [item.selector, item.sha256]), hostOnly.map(rule => [rule.selector, rule.sha256]));
  for (const item of debt.hostDebt.items)
    for (const file of item.files) assert.ok(HOST_DEBT_OWNERS.includes('host:' + file), `${file} holds a host-only rule but is not a documented host owner`);
  assert.ok(debt.hostDebt.owners.every(owner => HOST_DEBT_OWNERS.includes(owner)), debt.hostDebt.owners.join(', '));
  for (const owner of debt.owners) {
    assert.equal(owner.kind, owner.area ? 'region' : 'host', owner.owner);
    assert.ok((owner.kind === 'region' ? LEGACY_REGION_OWNERS : HOST_DEBT_OWNERS).includes(owner.owner), owner.owner);
  }
});
