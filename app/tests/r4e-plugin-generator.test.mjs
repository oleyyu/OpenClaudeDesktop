import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { extractR4ePlugin } from '../scripts/extract-r4e-plugin.mjs';
import * as official from '../scripts/official-4.16336.0.mjs';

// R4e-plugin generator (region batch 2a): the 4.16336.0 source contract, read-only (--check and --explore never write).
const app = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('r4e-plugin generator: --check reproduces the production folder byte for byte against the current cds-core', async () => {
  const manifest = await extractR4ePlugin({ check: true });
  assert.equal(manifest.referenceVersion, official.referenceVersion);
  const cdsBytes = await fs.readFile(path.join(app, 'src/generated/cds-core/manifest.json'));
  const cds = JSON.parse(cdsBytes);
  for (const [target, digest] of Object.entries(manifest.sharedGraphModules)) assert.equal(digest, cds.modules.find(m => m.target === target).sha256);
});

test('r4e-plugin generator: no module state cds-core holds is reached (D46) and every import resolves', async () => {
  const { stateConflicts, unresolved } = await extractR4ePlugin({ explore: true });
  assert.deepEqual(stateConflicts, []);
  assert.deepEqual(unresolved, []);
});

test('r4e-plugin generator: roots and call sites are the 4.16336.0 snapshot declarations', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(app, 'src/generated/r4e-plugin/manifest.json'), 'utf8'));
  const roots = Object.fromEntries(manifest.modules.flatMap(m => Object.entries(m.exports).map(([local, name]) => [name, `${m.source}#${local}`])));
  assert.equal(roots.PluginOverviewLayout, 'shared-19-UalAfDtn.js#iv');
  assert.equal(roots.OverviewRailCard, 'shared-19-UalAfDtn.js#av');
  assert.equal(roots.OverviewDescription, 'cae01a6fc-t1NhdR7u.js#W');
  assert.equal(roots.OverviewConnectorsAndTools, 'cae01a6fc-t1NhdR7u.js#ie');
  assert.equal(roots.OverviewRow, 'cae01a6fc-t1NhdR7u.js#X');
  assert.equal(roots.sanitizeText, 'shared-62-DoCqVpIq.js#sL');
  assert.equal(roots.sanitizeMultilineText, 'shared-62-DoCqVpIq.js#lL');
  assert.equal(roots.linkifyDescription, 'c79fa23ba-Cua_bx3X.js#h');
  assert.equal(roots.lazyValue, 'shared-0-CnnWnVrT.js#Tl', 'routines-shared Pa re-sliced from the 4.16336.0 shared-0');
  for (const entry of [...manifest.modules, ...manifest.callSites]) {
    const bytes = await fs.readFile(path.join(official.ionSource, entry.source));
    assert.equal(sha(bytes), entry.sourceSha256, entry.source);
  }
  assert.deepEqual(manifest.callSites.map(c => `${c.source}#${c.binding}`), [
    'c24c8737b-CApeZDrg.js#pu', 'c24c8737b-CApeZDrg.js#el', 'c24c8737b-CApeZDrg.js#Fl', 'c24c8737b-CApeZDrg.js#Yc', 'c24c8737b-CApeZDrg.js#Jc',
    'c24c8737b-CApeZDrg.js#mu', 'shared-123-1Hc1RTKl.js#h4', 'shared-18-Cfqwgjc5.js#$b', 'shared-18-Cfqwgjc5.js#ex', 'c76f00e40-CUxmQzhc.js#li',
    'c12456454-DBorkKpY.js#oo', 'c12456454-DBorkKpY.js#Er', 'c12456454-DBorkKpY.js#no', 'c12456454-DBorkKpY.js#ro', 'c12456454-DBorkKpY.js#io',
    'c12456454-DBorkKpY.js#ao', 'c12456454-DBorkKpY.js#lo', 'cae01a6fc-t1NhdR7u.js#re', 'cae01a6fc-t1NhdR7u.js#ne', 'cd14a8022-DP8PKode.js#a',
    'cd85e132d-RVI9Vb9v.js#d', 'c28f9f509-upcFCkwG.js#u', 'c28f9f509-upcFCkwG.js#h']);
  // The adapters stand for the declarations they replace, pinned by hash.
  const adapters = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via}=${i.name}`));
  assert.deepEqual([...new Set(adapters)].sort(), ['shared-33-DtdykY0y.js:ou=usePageLayout', 'shared-62-DoCqVpIq.js:Dl=useUnifiedPluginsUi',
    'vendor-intl-BJgYK7RA.js:l=FormattedMessage', 'vendor-intl-BJgYK7RA.js:p=useIntl']);
});

test('r4e-plugin generator: the 3.6556.2 contract is retired and nothing imports the removed modules', async () => {
  const generator = await fs.readFile(path.join(app, 'scripts/extract-r4e-plugin.mjs'), 'utf8');
  assert.doesNotMatch(generator, /official-3\.6556\.2|view-tabs-compat|routines-shared-compat/);
  const files = (await fs.readdir(path.join(app, 'src/generated/r4e-plugin'))).sort();
  assert.ok(!files.includes('clsx.mjs') && !files.includes('lazy-value.mjs'));
});
