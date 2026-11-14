// w10-editor-split: extract-code-editor.mjs is a driver over six area modules (scripts/code-editor-gen/<area>.mjs).
// The 2.31226.0 CodeMirror copy and the file-*/terminal-* adapters it used to write are retired; the 42 live adapters
// are recorded per area (areas/<area>.json) and the aggregate manifest is recomputed from those files.
// Byte-for-byte regeneration is `node scripts/extract-code-editor.mjs --check` (verify-code-editor.mjs runs it).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/code-editor');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const AREAS = ['desktop', 'side-chat', 'preview-element', 'preview-shell-a', 'preview-shell-b', 'preview-sketch'];
const manifest = JSON.parse(read('src/generated/code-editor/manifest.json'));
const areas = Object.fromEntries(AREAS.map(area => [area, JSON.parse(read(`src/generated/code-editor/areas/${area}.json`))]));

const DEAD = [
  // 26 original 2.31226.0 CodeMirror modules (code-editor-current publishes the 3.6556.2 runtime).
  'c139416b4-DSag62DK.js', 'c148e7537-Ks6hIVju.js', 'c1fe2e782-w4PHC-yL.js', 'c2a6d07ee-BJ-FI6y2.js', 'c2a6d07ee-BVmagD4f.js',
  'c2a6d07ee-BmoyyzZR.js', 'c2a6d07ee-Bmtcsuxi.js', 'c2a6d07ee-Bv5mkIAc.js', 'c2a6d07ee-CJYrtwU8.js', 'c2a6d07ee-CT4tdqVj.js',
  'c2a6d07ee-CYaTwSDI.js', 'c2a6d07ee-CmWHraz7.js', 'c2a6d07ee-CoRn3nLd.js', 'c2a6d07ee-CxpQ8UFZ.js', 'c2a6d07ee-DfkTJPi3.js',
  'c2a6d07ee-DhZWoVCn.js', 'c2a6d07ee-DljrPHKc.js', 'c2a6d07ee-Do1nlDpI.js', 'c2a6d07ee-H9yR3Q38.js', 'c2a6d07ee-isRnJR6i.js',
  'c477e0dc6-2uiBUH57.js', 'cc1a994ce-BAS6XRsu.js', 'ceb04560f-froebiID.js', 'cf3d96880-Dp9-NkOo.js',
  'rolldown-runtime-C3OYiQ02.js', 'vendor-prosemirror-DGtrMU0c.js',
  // Wrappers over that copy.
  'languages.mjs', 'editing.mjs', 'selection.mjs', 'filename-language.mjs',
  // File adapters (generated/files-changes) and terminal adapters (generated/code-current) replaced them.
  'file-content-results.mjs', 'file-editor-path.mjs', 'file-selection.mjs', 'file-context-drag.mjs', 'file-tree-pointer.mjs',
  'terminal-selection.mjs', 'terminal-commands.mjs', 'terminal-output.mjs', 'terminal-mouse.mjs', 'terminal-colors.mjs', 'terminal-titles.mjs',
];

test('the 41 retired outputs are gone and nothing in the manifest names the 2.31226.0 runtime', () => {
  assert.equal(DEAD.length, 41);
  for (const name of DEAD) assert.equal(fs.existsSync(path.join(dir, name)), false, name);
  for (const entry of [...manifest.modules, ...manifest.adapters]) assert.doesNotMatch(entry.name, /^(c148e7537-|c2a6d07ee-)/, entry.name);
  const present = fs.readdirSync(dir).filter(name => name !== 'manifest.json' && name !== 'areas').sort();
  assert.deepEqual(present, manifest.adapters.map(entry => entry.name).sort(), 'only area-owned adapters remain');
});

test('six area files feed the aggregate manifest in a fixed order', () => {
  assert.deepEqual(manifest.areas, AREAS);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'areas')).sort(), AREAS.map(area => `${area}.json`).sort());
  assert.deepEqual(manifest.adapters, AREAS.flatMap(area => areas[area].adapters));
  assert.deepEqual(manifest.copies, AREAS.flatMap(area => areas[area].copies));
  assert.equal(manifest.adapters.length, 45); // 40 until w11-sweep-rest retired preview-sketch-icons.mjs; W12 sidechat-cont added side-chat-chrome/-attachments/-pane-events.mjs; w12b-terminal-preview-tabs added preview-tab-strip/-log-lines/-allowed-sites.mjs
  assert.equal(manifest.copies.length, 7);
  const names = manifest.adapters.map(entry => entry.name);
  assert.equal(new Set(names).size, names.length, 'no adapter is emitted by two areas');
  // modules[] is the per-adapter version list tests/i18n-coverage-v3.test.mjs reads (target + referenceVersion).
  assert.deepEqual(manifest.modules, manifest.adapters.map(entry => ({ name: entry.name, target: entry.name, referenceVersion: entry.referenceVersion ?? '2.31226.0' })));
  const versions = [...new Set(manifest.modules.map(entry => entry.referenceVersion))];
  assert.equal(manifest.referenceVersion, versions.length === 1 ? versions[0] : 'mixed');
  for (const area of AREAS) {
    assert.equal(areas[area].area, area);
    const areaVersions = [...new Set(areas[area].adapters.map(entry => entry.referenceVersion ?? '2.31226.0'))];
    assert.equal(areas[area].referenceVersion, areaVersions.length === 1 ? areaVersions[0] : 'mixed', area);
    const refs = areas[area].adapters.flatMap(entry => entry.sources);
    for (const ref of areas[area].sources) assert.ok(refs.some(other => other.name === ref.name && other.sha256 === ref.sha256), `${area} ${ref.name}`);
    for (const ref of refs) assert.ok(ref.base === undefined || ['ion', 'asar'].includes(ref.base), `${area} ${ref.name} base`);
  }
});

test('every adapter and electron copy matches the sha its area file records', () => {
  for (const area of AREAS) {
    for (const entry of areas[area].adapters)
      assert.equal(sha(fs.readFileSync(path.join(dir, entry.name))), entry.sha256, `${area}: ${entry.name}`);
    for (const copy of areas[area].copies) {
      assert.equal(sha(fs.readFileSync(path.join(app, copy.target))), copy.sha256, `${area}: ${copy.target}`);
      assert.equal(copy.sha256, areas[area].adapters.find(entry => entry.name === copy.name)?.sha256, `${area}: ${copy.name} copy is the adapter`);
    }
  }
  assert.deepEqual(areas.desktop.copies.map(copy => copy.target), [
    'electron/generated/file-search.mjs', 'electron/generated/editor-location.cjs', 'electron/generated/preview-element-inspector.mjs',
    'electron/generated/preview-address-parser.mjs', 'electron/generated/preview-tab-shortcuts.mjs', 'electron/generated/side-chat-history.cjs',
    'electron/generated/preview-link-origin.mjs',
  ]);
});

test('areas own disjoint adapter sets', () => {
  const owned = Object.fromEntries(AREAS.map(area => [area, areas[area].adapters.map(entry => entry.name)]));
  assert.deepEqual(owned.desktop, ['search.mjs', 'editor-location.cjs', 'side-chat-history.cjs', 'preview-element-inspector.mjs',
    'preview-address-parser.mjs', 'preview-tab-shortcuts.mjs', 'preview-link-decisions.mjs', 'preview-link-origin.mjs']);
  assert.deepEqual(owned['side-chat'], ['side-chat-geometry.mjs', 'side-chat-context.mjs', 'transcript-selection.mjs', 'side-chat-scroll.mjs',
    'side-chat-persistence.mjs', 'side-chat-status.mjs', 'side-chat-user-segments.mjs', 'side-chat-user-render.mjs', 'side-chat-secrets.mjs', 'side-chat-activity.mjs',
    'side-chat-chrome.mjs', 'side-chat-attachments.mjs', 'side-chat-pane-events.mjs']);
  assert.deepEqual(owned['preview-element'], ['preview-element-serialization.mjs', 'preview-element-view.mjs', 'preview-element-label.mjs',
    'preview-element-detail.mjs', 'preview-element-chip.mjs', 'preview-element-parser.mjs', 'preview-element-transcript.mjs']);
  assert.deepEqual(owned['preview-shell-a'], ['preview-address-field.mjs', 'preview-navigation.mjs', 'preview-menu-items.mjs', 'preview-server-menu.mjs', 'preview-copy-url.mjs',
    'preview-tab-strip.mjs', 'preview-log-lines.mjs']);
  assert.deepEqual(owned['preview-shell-b'], ['preview-settings-menu.mjs', 'preview-pane-menu.mjs', 'preview-link-chooser.mjs', 'preview-link-radio.mjs', 'preview-allowed-sites.mjs']);
  // w11-sweep-rest retired preview-sketch-icons.mjs (no importer).
  assert.deepEqual(owned['preview-sketch'], ['preview-sketch-toolbar.mjs', 'preview-sketch-canvas.mjs',
    'preview-sketch-keys.mjs', 'preview-sketch-state.mjs', 'preview-sketch-host.mjs']);
});

test('the driver no longer copies the CodeMirror runtime; verify-code-editor regenerates instead of comparing shas', () => {
  const driver = read('scripts/extract-code-editor.mjs');
  assert.doesNotMatch(driver, /cbd02b8f2-Bbrhywu4|c6bf19e8f-BmwVB0LV|allowed\.has|function between\(/);
  for (const area of AREAS) assert.ok(fs.existsSync(path.join(app, `scripts/code-editor-gen/${area}.mjs`)), area);
  const generators = AREAS.map(area => read(`scripts/code-editor-gen/${area}.mjs`)).join('\n');
  assert.doesNotMatch(generators, /adapter\('(languages|editing|selection|filename-language|file-[\w-]+|terminal-[\w-]+)\.mjs'/);
  assert.match(read('scripts/verify-code-editor.mjs'), /import \{ extractCodeEditor \} from '\.\/extract-code-editor\.mjs';\s*await extractCodeEditor\(\{ check: true \}\);/);
  // w11-sweep-rest: area files are read before any area emits; recorded electron copies are part of the stale check;
  // an --only write removes only the selected areas' own dropped outputs.
  assert.ok(driver.indexOf('previous.set(area,') < driver.indexOf('.emit(ctx)'), 'area files are read before emitting');
  assert.match(driver, /if \(staleCopies\.length\) problems\.push\(`stale copies:/);
  assert.match(driver, /const removable = full \? stale : stale\.filter\(name => dropped\.has\(name\)\);/);
  // prepare-ui runs each verifier in a child process (W11 gate, OOM fix): it lists the file instead of importing it.
  assert.match(read('scripts/prepare-ui.mjs'), /["']verify-code-editor\.mjs["']/);
});

test('no host or generated module imports a retired code-editor output', () => {
  const retired = /generated\/code-editor\/(languages|editing|selection|filename-language|file-[\w-]+|terminal-[\w-]+|c148e7537-|c2a6d07ee-)/;
  const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return /\.(m?js|cjs|jsx)$/.test(entry.name) ? [full] : [];
  });
  for (const file of [...walk(path.join(app, 'src')), ...walk(path.join(app, 'electron'))])
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), retired, path.relative(app, file));
});
