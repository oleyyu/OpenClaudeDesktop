// surfaces-prod-2 composer-env: the 4.16336.0 composer environment bar (scripts/extract-composer-env-v4.mjs). The generated
// output is byte-stable (--check), the pick roots are the reviewed official declarations, the linked code-composer-v4
// environment-bar module is not sliced again (D1), and the host consumers moved off the 3.6556.2 generated/code-start
// modules for the path label (shared-3 VM) and the stable environment order (start s3).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { extractComposerEnvV4, locateRoots, pickEnvironmentRow, ROOT_PINS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-composer-env-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFile(path.join(app, file), 'utf8');
const createHashOf = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('the generator --check: the written modules, manifest and provenance match a fresh slice', async () => {
  await extractComposerEnvV4({ check: true });
});

test('every pick root is the reviewed official declaration (pinned sha256)', async () => {
  const { found } = await locateRoots();
  assert.deepEqual(Object.keys(found).sort(), Object.keys(ROOT_PINS).sort());
  for (const [name, pin] of Object.entries(ROOT_PINS)) {
    assert.match(pin ?? '', /^[0-9a-f]{64}$/, `${name} is pinned`);
    assert.equal(found[name].pinned, true, `${name} pinned`);
    assert.equal(found[name].declarationSha256, pin, `${name} root`);
  }
});

test('the picks: Uye model trigger tail tones, Hye bar class, $3 place tooltip, Jge folder chip messages', async () => {
  const { data: row } = await pickEnvironmentRow();
  const { environmentRow } = await import('../src/generated/composer-env-v4/environment-row.mjs');
  assert.deepEqual(JSON.parse(JSON.stringify(environmentRow)), JSON.parse(JSON.stringify(row)));
  assert.equal(row.barMenu, 'bar');
  assert.equal(row.modelTrigger.testId, 'environment-row-model');
  assert.deepEqual(row.modelTrigger.tail.tone, { toggle: 'text-pro', overridden: 'text-accent', plain: 'text-muted-as-secondary' });
  assert.equal(row.modelTrigger.tail.baseClass, 'shrink-0 whitespace-pre');
  assert.deepEqual(row.modelTrigger.ariaLabel.message, { defaultMessage: 'Model: {value}', id: '/BH9qS3xcc' });
  assert.deepEqual(row.permissionTrigger, { testId: 'environment-row-permission', classArgs: 'inBar' });
  assert.deepEqual(row.placeChip.tooltip.content, { defaultMessage: 'Environment', id: 'K7kuIZkkhY' });
  assert.equal(row.placeChip.tooltip.hoverable, false);
  assert.deepEqual(row.placeChip.tooltip.collisionPadding, { top: 48, right: 8, bottom: 8, left: 8 });
  assert.deepEqual(row.folderChip.shownWhen, { activeStored: null, orActiveStoredTarget: { kind: 'cloud', repos: 0 } });
  assert.deepEqual(row.folderChip.messages.extraCount, { defaultMessage: '+{count}', id: 'bJpae0eVNj' });
});

test('the manifest: cds-core graph, code-composer-v4 linked (not re-sliced), Exe the only sliced root', async () => {
  const manifest = JSON.parse(await read('src/generated/composer-env-v4/manifest.json'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  // surfaces-prod-3 composer: the label context's owner (code-routines-v4 cd8a7d7c0, Jge rT / iT) is linked, not re-sliced.
  assert.deepEqual(manifest.linkedAreas, [{ area: 'code-composer-v4', modules: ['environment-bar.mjs'] }, { area: 'code-routines-v4', modules: ['cd8a7d7c0-DuH0T8rm.mjs'] }]);
  const provenance = JSON.parse(await read('src/generated/composer-env-v4/provenance.json'));
  const { moduleSha256, ...label } = provenance.labelContext ?? {};
  assert.deepEqual(label, { area: 'code-routines-v4', module: 'cd8a7d7c0-DuH0T8rm.mjs', home: 'y', noHome: 'p', chosenBy: 'localKind', jge: 'oe = u ? ae : iT' });
  assert.equal(moduleSha256, createHashOf(await fs.readFile(path.join(app, 'src/generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs'))));
  assert.deepEqual(manifest.modules.map((m) => m.target), ['model-effort.mjs']);
  assert.deepEqual(manifest.modules[0].bindings.map((b) => b.name), ['Exe']);
  const cdsCore = await fs.readFile(path.join(app, 'src/generated/cds-core/manifest.json'));
  assert.equal(createHash('sha256').update(cdsCore).digest('hex'), CDS_CORE_MANIFEST_SHA256, 'the cds-core manifest the generator was reviewed against');
  const effort = await read('src/generated/composer-env-v4/model-effort.mjs');
  assert.match(effort, /import \{ EnvironmentChipGroup as u8 \} from "\.\.\/code-composer-v4\/environment-bar\.mjs";/);
  assert.doesNotMatch(effort, /createContext/, 'no second s8');
});

test('host consumers: VM path label and s3 order come from 4.16336.0 slices, not 3.6556.2 generated/code-start', async () => {
  for (const file of ['src/source-composer-environment-bar.jsx', 'src/source-composer-folder-menu.jsx', 'src/source-environment-menu.jsx', 'src/source-composer-env-adapters.jsx']) {
    assert.doesNotMatch(await read(file), /generated\/code-start\//, file);
  }
  assert.match(await read('src/source-environment-menu.jsx'), /import \{ useStableEnvironmentOrder \} from '\.\/generated\/code-start-v4\/start\.mjs';/);
  assert.match(await read('src/source-composer-env-adapters.jsx'), /import \{ VM as officialPathLabel \} from '\.\/generated\/code-start-v4\/shared-3\.mjs';/);
  const main = await read('src/main.jsx');
  assert.doesNotMatch(main, /homeRelativePath/);
  // surfaces-prod-3 composer: the official label context is linked (cd8a7d7c0 y / p, owned by code-routines-v4; D1, one
  // instance), the host sets window.desktopHomePath in the preload, and no home store, context or prop is left in the host
  // (tests/composer-env-home-label.test.mjs renders it).
  const adapters = await read('src/source-composer-env-adapters.jsx');
  assert.match(adapters, /^import \{ p as officialNoHomeLabelContext, y as officialHomeLabelContext \} from '\.\/generated\/code-routines-v4\/cd8a7d7c0-DuH0T8rm\.mjs';$/m);
  assert.match(adapters, /^export const useHomeLabelContext = officialHomeLabelContext;$/m);
  assert.doesNotMatch(adapters, /useSyncExternalStore|createContext|^let /m, 'no module store');
  assert.doesNotMatch(adapters, /export function (setHostHomePath|useHomeLabelContext)\b|EnvironmentHostHome/);
  assert.doesNotMatch(main, /setHostHomePath|EnvironmentHostHome/);
  assert.match(main, /<SourceIncognitoShell /);
  assert.doesNotMatch(main, /onRemoveFolder=\{[^\n]*\} home=\{boot\?\.host\?\.home\}/);
  assert.match(main, /onRemoveFolder=\{[^\n]*\}\n\s+checkout=/);
});

test('folder chip: Jge folder slot is a hand-written host mapping, not driven by the shownWhen record', async () => {
  const bar = await read('src/source-composer-environment-bar.jsx');
  assert.doesNotMatch(bar, /shownWhen\.activeStored === null/, 'no always-true comparison with the generated literal');
  assert.match(bar, /const folderShown = !environmentName;/);
  assert.match(bar, /Host mapping, written by hand after the Jge folder slot/);
});
